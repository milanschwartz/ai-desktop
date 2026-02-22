import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { db } from '../db/index.js';
import { users, passkeyCredentials, refreshTokens } from '../db/schema/index.js';
import {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../middleware/auth.js';
import {
  RegisterSchema,
  LoginSchema,
  RATE_LIMITS,
  HTTP_STATUS,
  ERROR_CODES,
} from '@ai-desktop/shared';
import { auditLog } from '../services/audit.js';
import { hashPassword, verifyPassword } from '../services/crypto.js';

// WebAuthn configuration
const rpName = 'AI Desktop';
const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:5173';

// In-memory challenge store (use Redis in production for multi-instance deployments)
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function storeChallenge(key: string, challenge: string): void {
  challengeStore.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
}

function consumeChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  challengeStore.delete(key);
  if (!entry || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.challenge;
}

export default async function authRoutes(fastify: FastifyInstance) {
  // Register with username/password
  fastify.post(
    '/register',
    {
      config: { rateLimit: RATE_LIMITS.REGISTER },
      schema: {
        tags: ['auth'],
        body: RegisterSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              user: z.object({
                id: z.string(),
                username: z.string(),
                displayName: z.string(),
              }),
              accessToken: z.string(),
              expiresIn: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { username, displayName, password } = request.body;

      // Check if username exists
      const existing = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existing) {
        return reply.status(HTTP_STATUS.CONFLICT).send({
          success: false,
          error: {
            code: ERROR_CODES.ALREADY_EXISTS,
            message: 'Username already taken',
          },
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          username,
          displayName,
          passwordHash,
        })
        .returning();

      // Generate tokens
      const accessToken = await generateAccessToken(user);
      const { token: refreshToken } = await generateRefreshToken(user.id);
      const refreshTokenHash = hashToken(refreshToken);

      // Store refresh token
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo: request.headers['user-agent'] ?? 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Audit log
      await auditLog({
        action: 'user_registered',
        userId: user.id,
        ipAddress: request.ip,
        metadata: { method: 'password' },
      });

      // Set refresh token cookie
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.status(HTTP_STATUS.CREATED).send({
        success: true,
        data: {
          user: { id: user.id, username: user.username, displayName: user.displayName },
          accessToken,
          expiresIn: 15 * 60,
        },
      });
    }
  );

  // Login with username/password
  fastify.post(
    '/login',
    {
      config: { rateLimit: RATE_LIMITS.LOGIN },
      schema: {
        tags: ['auth'],
        body: LoginSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              user: z.object({
                id: z.string(),
                username: z.string(),
                displayName: z.string(),
              }),
              accessToken: z.string(),
              expiresIn: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { username, password } = request.body;

      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user?.passwordHash) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid username or password',
          },
        });
      }

      // Verify password
      const valid = await verifyPassword(password, user.passwordHash);

      if (!valid) {
        await auditLog({
          action: 'login_failed',
          metadata: { username, method: 'password' },
          ipAddress: request.ip,
        });

        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid username or password',
          },
        });
      }

      // Generate tokens
      const accessToken = await generateAccessToken(user);
      const { token: refreshToken } = await generateRefreshToken(user.id);
      const refreshTokenHash = hashToken(refreshToken);

      // Store refresh token
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo: request.headers['user-agent'] ?? 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Audit log
      await auditLog({
        action: 'login_success',
        userId: user.id,
        ipAddress: request.ip,
        metadata: { method: 'password' },
      });

      // Set refresh token cookie (HttpOnly — never exposed in response body)
      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return {
        success: true,
        data: {
          user: { id: user.id, username: user.username, displayName: user.displayName },
          accessToken,
          expiresIn: 15 * 60,
        },
      };
    }
  );

  // Refresh token
  // Refresh token — reads from HttpOnly cookie, not request body
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              accessToken: z.string(),
              expiresIn: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'No refresh token provided',
          },
        });
      }

      // Verify refresh token
      const payload = await verifyRefreshToken(refreshToken);

      if (!payload) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'Invalid refresh token',
          },
        });
      }

      // Check if token is revoked
      const tokenHash = hashToken(refreshToken);
      const storedToken = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.tokenHash, tokenHash),
      });

      if (!storedToken || storedToken.revokedAt) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.REFRESH_TOKEN_REVOKED,
            message: 'Refresh token has been revoked',
          },
        });
      }

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });

      if (!user) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.TOKEN_INVALID,
            message: 'User not found',
          },
        });
      }

      // Revoke old refresh token (rotation)
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.id, storedToken.id));

      // Generate new tokens
      const accessToken = await generateAccessToken(user);
      const { token: newRefreshToken } = await generateRefreshToken(user.id);
      const newTokenHash = hashToken(newRefreshToken);

      // Store new refresh token
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: newTokenHash,
        deviceInfo: request.headers['user-agent'] ?? 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Set new refresh token cookie (HttpOnly — never exposed in response body)
      reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return {
        success: true,
        data: {
          accessToken,
          expiresIn: 15 * 60,
        },
      };
    }
  );

  // Logout
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
      },
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.tokenHash, tokenHash));
      }

      reply.clearCookie('refreshToken', { path: '/' });

      return { success: true };
    }
  );

  // Issue a one-time WebSocket ticket (30-second TTL, single use)
  fastify.post(
    '/ws-ticket',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({ ticket: z.string() }),
          }),
        },
      },
    },
    async (request) => {
      const user = await authenticate(request);
      const { issueWsTicket } = await import('../ws/index.js');
      const ticket = issueWsTicket(user.id);
      return { success: true, data: { ticket } };
    }
  );

  // Get current user
  fastify.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              username: z.string(),
              displayName: z.string(),
              avatarUrl: z.string().nullable(),
              settings: z.object({
                defaultViewMode: z.enum(['structured', 'creative']),
                theme: z.enum(['light', 'dark', 'system']),
                claimHighlightStyle: z.enum(['subtle', 'prominent', 'off']),
              }),
            }),
          }),
        },
      },
    },
    async (request) => {
      const user = await authenticate(request);

      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!dbUser) {
        throw {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: ERROR_CODES.NOT_FOUND,
          message: 'User not found',
        };
      }

      return {
        success: true,
        data: {
          id: dbUser.id,
          username: dbUser.username,
          displayName: dbUser.displayName,
          avatarUrl: dbUser.avatarUrl,
          settings: dbUser.settings,
        },
      };
    }
  );

  // Passkey registration options
  fastify.get(
    '/passkey/register-options',
    {
      schema: { tags: ['auth'] },
    },
    async (request) => {
      const user = await authenticate(request);

      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        with: { passkeyCredentials: true },
      });

      if (!dbUser) {
        throw { statusCode: 404, message: 'User not found' };
      }

      const options = await generateRegistrationOptions({
        rpName,
        rpID: rpId,
        userID: dbUser.id,
        userName: dbUser.username,
        userDisplayName: dbUser.displayName,
        attestationType: 'none',
        excludeCredentials: dbUser.passkeyCredentials.map((cred) => ({
          id: cred.id,
          type: 'public-key',
        })),
      });

      // Store challenge for verification
      storeChallenge(`reg:${user.id}`, options.challenge);

      return { success: true, data: options };
    }
  );

  // Verify passkey registration
  fastify.post(
    '/passkey/verify-registration',
    {
      schema: { tags: ['auth'] },
    },
    async (request) => {
      const user = await authenticate(request);

      // Retrieve and consume the stored challenge
      const expectedChallenge = consumeChallenge(`reg:${user.id}`);
      if (!expectedChallenge) {
        throw {
          statusCode: 400,
          message: 'Challenge expired or not found. Request new registration options.',
        };
      }

      const verification = await verifyRegistrationResponse({
        response: request.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw { statusCode: 400, message: 'Passkey registration failed' };
      }

      const { registrationInfo } = verification;

      await db.insert(passkeyCredentials).values({
        id: registrationInfo.credentialID,
        userId: user.id,
        publicKey: registrationInfo.credentialPublicKey,
        counter: registrationInfo.counter,
        deviceType: registrationInfo.credentialDeviceType,
        backedUp: registrationInfo.credentialBackedUp,
        transports: registrationInfo.transports ?? [],
      });

      await auditLog({
        action: 'passkey_registered',
        userId: user.id,
        ipAddress: request.ip,
      });

      return { success: true };
    }
  );

  // Passkey authentication options
  fastify.get(
    '/passkey/auth-options',
    {
      schema: { tags: ['auth'] },
    },
    async (_request) => {
      const options = await generateAuthenticationOptions({
        rpID: rpId,
        userVerification: 'preferred',
      });

      // Store challenge keyed by the challenge itself (no user context yet at login)
      storeChallenge(`auth:${options.challenge}`, options.challenge);

      return { success: true, data: options };
    }
  );

  // Verify passkey authentication
  fastify.post(
    '/passkey/verify-auth',
    {
      schema: {
        tags: ['auth'],
        body: z.object({
          id: z.string(),
          rawId: z.string(),
          response: z.object({
            authenticatorData: z.string(),
            clientDataJSON: z.string(),
            signature: z.string(),
            userHandle: z.string().optional(),
          }),
          type: z.literal('public-key'),
          clientExtensionResults: z.record(z.unknown()).optional(),
          authenticatorAttachment: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Look up credential from DB by credential ID
      const credential = await db.query.passkeyCredentials.findFirst({
        where: eq(passkeyCredentials.id, body.id),
      });

      if (!credential) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: { code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Passkey not recognized' },
        });
      }

      // Extract challenge from clientDataJSON to look up stored challenge
      const clientData = JSON.parse(
        Buffer.from(body.response.clientDataJSON, 'base64url').toString('utf8')
      );
      const expectedChallenge = consumeChallenge(`auth:${clientData.challenge}`);
      if (!expectedChallenge) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: { code: ERROR_CODES.TOKEN_INVALID, message: 'Challenge expired or not found' },
        });
      }

      const verification = await verifyAuthenticationResponse({
        response: body as never,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: credential.id,
          publicKey: credential.publicKey,
          counter: credential.counter,
          transports: (credential.transports as string[]) ?? [],
        },
      });

      if (!verification.verified) {
        await auditLog({
          action: 'login_failed',
          metadata: { method: 'passkey', credentialId: body.id },
          ipAddress: request.ip,
        });
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Passkey authentication failed',
          },
        });
      }

      // Update credential counter for replay protection
      await db
        .update(passkeyCredentials)
        .set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        })
        .where(eq(passkeyCredentials.id, credential.id));

      // Get user from credential
      const user = await db.query.users.findFirst({
        where: eq(users.id, credential.userId),
      });

      if (!user) {
        return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
          success: false,
          error: { code: ERROR_CODES.TOKEN_INVALID, message: 'User not found' },
        });
      }

      // Generate tokens
      const accessToken = await generateAccessToken(user);
      const { token: refreshToken } = await generateRefreshToken(user.id);
      const refreshTokenHash = hashToken(refreshToken);

      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo: request.headers['user-agent'] ?? 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await auditLog({
        action: 'login_success',
        userId: user.id,
        ipAddress: request.ip,
        metadata: { method: 'passkey' },
      });

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return {
        success: true,
        data: {
          user: { id: user.id, username: user.username, displayName: user.displayName },
          accessToken,
          expiresIn: 15 * 60,
        },
      };
    }
  );
}

// Helper to verify refresh token (imported from auth middleware)
import { verifyRefreshToken } from '../middleware/auth.js';
