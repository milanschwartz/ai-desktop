import { randomBytes, createCipheriv, createDecipheriv, hkdfSync } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

// Password hashing with Argon2id
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}

// AES-256-GCM encryption for sensitive data
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Key should be 32 bytes (256 bits) base64 encoded
  const decoded = Buffer.from(key, 'base64');
  if (decoded.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded');
  }
  return decoded;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  const tag = cipher.getAuthTag();

  // Format: iv (12 bytes) + tag (16 bytes) + encrypted data
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, 'base64');

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final('utf8');
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

// Derive workspace encryption key from master key using HKDF (as documented in security model)
export function deriveWorkspaceKey(masterKey: Buffer, workspaceId: string): Buffer {
  return Buffer.from(hkdfSync('sha256', masterKey, '', `workspace:${workspaceId}`, 32));
}
