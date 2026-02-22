import { FastifyRequest } from 'fastify';
import { jwtVerify, SignJWT } from 'jose';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import {
  ACCESS_TOKEN_EXPIRY_MS,
  REFRESH_TOKEN_EXPIRY_MS,
  ERROR_CODES,
  HTTP_STATUS,
} from '@ai-desktop/shared';

// JWT secret - in production, this should be loaded from environment
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

// Token payloads
export interface AccessTokenPayload {
  sub: string; // user ID
  username: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat: number;
  exp: number;
}

// Generate tokens
export async function generateAccessToken(user: { id: string; username: string }): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({ sub: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + ACCESS_TOKEN_EXPIRY_MS)
    .sign(secret);
}

export async function generateRefreshToken(
  userId: string
): Promise<{ token: string; tokenId: string }> {
  const secret = getJwtSecret();
  const tokenId = crypto.randomUUID();

  const token = await new SignJWT({ sub: userId, tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
    .sign(secret);

  return { token, tokenId };
}

// Verify access token
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// Hash refresh token for storage (synchronous using node:crypto)
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Auth middleware - extracts user from access token
export async function authenticate(
  request: FastifyRequest
): Promise<{ id: string; username: string }> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.TOKEN_INVALID,
      message: 'Missing or invalid authorization header',
    };
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    throw {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.TOKEN_EXPIRED,
      message: 'Token expired or invalid',
    };
  }

  // Verify user still exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });

  if (!user) {
    throw {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.TOKEN_INVALID,
      message: 'User not found',
    };
  }

  return { id: user.id, username: user.username };
}

// Optional auth - returns user if token present, null otherwise
export async function optionalAuth(
  request: FastifyRequest
): Promise<{ id: string; username: string } | null> {
  try {
    return await authenticate(request);
  } catch {
    return null;
  }
}
