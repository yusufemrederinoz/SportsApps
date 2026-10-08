import { readFileSync } from 'node:fs';

import { SignJWT, importPKCS8 } from 'jose';

export interface AppleSignInSettings {
  privateKey: string;
  keyId: string;
  teamId: string;
  clientId: string;
}

export interface AppleTokens {
  exchange: (authorizationCode: string) => Promise<string>;
  revoke: (refreshToken: string) => Promise<void>;
}

const HOST = 'https://appleid.apple.com';
const SECRET_LIFETIME = '5m';

export function createAppleTokens(settings: AppleSignInSettings, fetcher: typeof fetch = fetch): AppleTokens {
  const key = importPKCS8(settings.privateKey, 'ES256');

  const clientSecret = async () =>
    new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: settings.keyId })
      .setIssuer(settings.teamId)
      .setSubject(settings.clientId)
      .setAudience(HOST)
      .setIssuedAt()
      .setExpirationTime(SECRET_LIFETIME)
      .sign(await key);

  const post = async (path: string, fields: Record<string, string>) => {
    const response = await fetcher(`${HOST}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: settings.clientId, client_secret: await clientSecret(), ...fields }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Apple answered ${response.status} on ${path}`);
    }
    return response;
  };

  return {
    async exchange(authorizationCode) {
      const response = await post('/auth/token', { grant_type: 'authorization_code', code: authorizationCode });
      const { refresh_token: refreshToken } = (await response.json()) as { refresh_token?: string };
      if (!refreshToken) {
        throw new Error('Apple returned no refresh token');
      }
      return refreshToken;
    },

    async revoke(refreshToken) {
      await post('/auth/revoke', { token: refreshToken, token_type_hint: 'refresh_token' });
    },
  };
}

export function loadAppleTokens(environment: NodeJS.ProcessEnv = process.env): AppleTokens | undefined {
  const { APPLE_SIGN_IN_KEY_PATH, APPLE_SIGN_IN_KEY_ID, APPLE_TEAM_ID, APPLE_BUNDLE_ID } = environment;
  if (!APPLE_SIGN_IN_KEY_PATH || !APPLE_SIGN_IN_KEY_ID || !APPLE_TEAM_ID || !APPLE_BUNDLE_ID) {
    return undefined;
  }
  return createAppleTokens({
    privateKey: readFileSync(APPLE_SIGN_IN_KEY_PATH, 'utf8'),
    keyId: APPLE_SIGN_IN_KEY_ID,
    teamId: APPLE_TEAM_ID,
    clientId: APPLE_BUNDLE_ID,
  });
}
