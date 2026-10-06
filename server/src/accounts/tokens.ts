import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(): { token: string; hash: string } {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, hash: hashToken(token) };
}
