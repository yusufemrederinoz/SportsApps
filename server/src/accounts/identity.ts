import type { IdentityProvider } from '@sportapps/protocol';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface VerifiedIdentity {
  subject: string;
  email: string | null;
}

export type IdentityVerifier = (token: string) => Promise<VerifiedIdentity>;

export type IdentityVerifiers = Partial<Record<IdentityProvider, IdentityVerifier>>;

interface ProviderSettings {
  issuers: string[];
  keysUrl: string;
}

const PROVIDERS: Record<IdentityProvider, ProviderSettings> = {
  google: {
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    keysUrl: 'https://www.googleapis.com/oauth2/v3/certs',
  },
  apple: {
    issuers: ['https://appleid.apple.com'],
    keysUrl: 'https://appleid.apple.com/auth/keys',
  },
};

export function createIdentityVerifier(
  provider: IdentityProvider,
  audiences: string[],
  keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(PROVIDERS[provider].keysUrl)),
): IdentityVerifier | undefined {
  if (audiences.length === 0) {
    return undefined;
  }
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, { issuer: PROVIDERS[provider].issuers, audience: audiences });
    if (!payload.sub) {
      throw new Error('identity token has no subject');
    }
    const verified = payload.email_verified === true || payload.email_verified === 'true';
    return { subject: payload.sub, email: typeof payload.email === 'string' && verified ? payload.email : null };
  };
}
