import { describe, it, expect, vi } from 'vitest';

// Mock the schema module first (before any imports that use it)
vi.mock('../db/schema/index.js', () => ({
  users: {},
  refreshTokens: {},
}));

// Mock the database module
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      refreshTokens: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock environment variable
vi.stubEnv('JWT_SECRET', 'test-secret-key-for-testing-purposes-only');

// Import after mocks are set up
const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } =
  await import('../middleware/auth');

describe('Auth Middleware', () => {
  const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
  };

  describe('JWT Token Generation', () => {
    it('should generate an access token', async () => {
      const token = await generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate a refresh token', async () => {
      const { token, tokenId } = await generateRefreshToken(testUser.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(tokenId).toBeDefined();
      expect(typeof tokenId).toBe('string');
    });

    it('should generate different tokens for access and refresh', async () => {
      const accessToken = await generateAccessToken(testUser);
      const { token: refreshToken } = await generateRefreshToken(testUser.id);

      expect(accessToken).not.toBe(refreshToken);
    });

    it('should generate unique token IDs for refresh tokens', async () => {
      const { tokenId: id1 } = await generateRefreshToken(testUser.id);
      const { tokenId: id2 } = await generateRefreshToken(testUser.id);

      expect(id1).not.toBe(id2);
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid access token', async () => {
      const token = await generateAccessToken(testUser);
      const payload = await verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(testUser.id);
      expect(payload?.username).toBe(testUser.username);
    });

    it('should verify a valid refresh token', async () => {
      const { token, tokenId } = await generateRefreshToken(testUser.id);
      const payload = await verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(testUser.id);
      expect(payload?.tokenId).toBe(tokenId);
    });

    it('should reject an invalid token', async () => {
      const payload = await verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should reject a malformed token', async () => {
      const payload = await verifyAccessToken('not.a.valid.jwt');
      expect(payload).toBeNull();
    });

    it('should reject empty token', async () => {
      const payload = await verifyAccessToken('');
      expect(payload).toBeNull();
    });
  });
});
