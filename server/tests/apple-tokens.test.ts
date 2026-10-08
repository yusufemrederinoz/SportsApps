import type { AuthResponse } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import {
  SignJWT,
  createLocalJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  exportJWK,
  exportPKCS8,
  generateKeyPair,
} from 'jose';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createAppleTokens, loadAppleTokens, type AppleTokens } from '../src/accounts/apple-tokens';
import { createIdentityVerifier } from '../src/accounts/identity';
import type { ServerConfig } from '../src/config';
import { openDatabase } from '../src/database';
import { buildApp } from '../src/http/app';

const CLIENT_ID = 'com.example.game';
const TEAM_ID = 'TEAM123456';
const KEY_ID = 'KEY1234567';
const APPLE = 'https://appleid.apple.com';
const config: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  databasePath: ':memory:',
  footballDatabasePath: '',
  portraitsPath: '',
  sessionDays: 90,
  googleClientIds: [],
  appleClientIds: [CLIENT_ID],
  timeZone: 'Europe/Istanbul',
  trustProxy: false,
  notifications: false,
};

interface Sent {
  url: string;
  fields: Record<string, string>;
}

let signInKey: string;
let identityKeys: ReturnType<typeof createLocalJWKSet>;
let signIdentityToken: (subject: string) => Promise<string>;
let app: FastifyInstance | undefined;

function recordingFetcher(answer: () => Response) {
  const sent: Sent[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), fields: Object.fromEntries(new URLSearchParams(String(init?.body))) });
    return answer();
  }) as typeof fetch;
  return { sent, fetcher };
}

function recordingTokens(failing: Partial<Record<keyof AppleTokens, boolean>> = {}) {
  const exchanged: string[] = [];
  const revoked: string[] = [];
  const tokens: AppleTokens = {
    exchange: async (code) => {
      exchanged.push(code);
      if (failing.exchange) {
        throw new Error('Apple is unreachable');
      }
      return `refresh-${code}`;
    },
    revoke: async (refreshToken) => {
      revoked.push(refreshToken);
      if (failing.revoke) {
        throw new Error('Apple is unreachable');
      }
    },
  };
  return { exchanged, revoked, tokens };
}

function start(appleTokens?: AppleTokens) {
  app = buildApp({
    database: openDatabase(':memory:'),
    config,
    verifiers: { apple: createIdentityVerifier('apple', config.appleClientIds, identityKeys) },
    appleTokens,
  });
  return app;
}

async function signIn(server: FastifyInstance, subject: string, authorizationCode?: string): Promise<AuthResponse> {
  const response = await server.inject({
    method: 'POST',
    url: '/v1/auth/apple',
    payload: { token: await signIdentityToken(subject), ...(authorizationCode ? { authorizationCode } : {}) },
  });
  expect(response.statusCode).toBe(200);
  return response.json();
}

async function deleteAccount(server: FastifyInstance, token: string): Promise<number> {
  const response = await server.inject({ method: 'DELETE', url: '/v1/account', headers: { authorization: `Bearer ${token}` } });
  return response.statusCode;
}

beforeAll(async () => {
  signInKey = await exportPKCS8((await generateKeyPair('ES256', { extractable: true })).privateKey);
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  identityKeys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'apple-key', alg: 'RS256', use: 'sig' }] });
  signIdentityToken = (subject) =>
    new SignJWT({ sub: subject })
      .setProtectedHeader({ alg: 'RS256', kid: 'apple-key' })
      .setIssuer(APPLE)
      .setAudience(CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
});

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('Apple token requests', () => {
  const settings = () => ({ privateKey: signInKey, keyId: KEY_ID, teamId: TEAM_ID, clientId: CLIENT_ID });

  it('exchanges an authorization code with a client secret signed for the team', async () => {
    const { sent, fetcher } = recordingFetcher(() => Response.json({ refresh_token: 'refresh-1' }));
    expect(await createAppleTokens(settings(), fetcher).exchange('code-1')).toBe('refresh-1');

    const [request] = sent;
    expect(request?.url).toBe(`${APPLE}/auth/token`);
    expect(request?.fields).toMatchObject({ client_id: CLIENT_ID, grant_type: 'authorization_code', code: 'code-1' });
    const secret = request?.fields.client_secret ?? '';
    expect(decodeProtectedHeader(secret)).toMatchObject({ alg: 'ES256', kid: KEY_ID });
    expect(decodeJwt(secret)).toMatchObject({ iss: TEAM_ID, sub: CLIENT_ID, aud: APPLE });
  });

  it('revokes a refresh token', async () => {
    const { sent, fetcher } = recordingFetcher(() => new Response(null, { status: 200 }));
    await createAppleTokens(settings(), fetcher).revoke('refresh-1');
    expect(sent[0]?.url).toBe(`${APPLE}/auth/revoke`);
    expect(sent[0]?.fields).toMatchObject({ client_id: CLIENT_ID, token: 'refresh-1', token_type_hint: 'refresh_token' });
  });

  it('fails when Apple refuses the request or sends no refresh token', async () => {
    const refused = recordingFetcher(() => new Response('{"error":"invalid_grant"}', { status: 400 }));
    await expect(createAppleTokens(settings(), refused.fetcher).exchange('used-code')).rejects.toThrow('400');
    await expect(createAppleTokens(settings(), refused.fetcher).revoke('refresh-1')).rejects.toThrow('400');
    const empty = recordingFetcher(() => Response.json({ access_token: 'only-this' }));
    await expect(createAppleTokens(settings(), empty.fetcher).exchange('code-1')).rejects.toThrow('refresh token');
  });

  it('stays off until the key, the team and the bundle are all configured', () => {
    expect(loadAppleTokens({})).toBeUndefined();
    expect(loadAppleTokens({ APPLE_SIGN_IN_KEY_ID: KEY_ID, APPLE_TEAM_ID: TEAM_ID, APPLE_BUNDLE_ID: CLIENT_ID })).toBeUndefined();
  });
});

describe('Apple accounts', () => {
  it('revokes the stored token when the account is deleted', async () => {
    const { exchanged, revoked, tokens } = recordingTokens();
    const server = start(tokens);
    const first = await signIn(server, 'apple-1', 'code-1');
    expect(exchanged).toEqual(['code-1']);

    expect(await deleteAccount(server, first.token)).toBe(204);
    expect(revoked).toEqual(['refresh-code-1']);
    const again = await signIn(server, 'apple-1');
    expect(again.account.id).not.toBe(first.account.id);
  });

  it('keeps the token of the latest sign-in', async () => {
    const { revoked, tokens } = recordingTokens();
    const server = start(tokens);
    await signIn(server, 'apple-2', 'code-1');
    await signIn(server, 'apple-2');
    const latest = await signIn(server, 'apple-2', 'code-2');

    expect(await deleteAccount(server, latest.token)).toBe(204);
    expect(revoked).toEqual(['refresh-code-2']);
  });

  it('signs in and deletes the account even when Apple cannot be reached', async () => {
    const unreachable = recordingTokens({ exchange: true });
    const server = start(unreachable.tokens);
    const session = await signIn(server, 'apple-3', 'code-1');
    expect(await deleteAccount(server, session.token)).toBe(204);
    expect(unreachable.revoked).toEqual([]);
    await app?.close();

    const failing = recordingTokens({ revoke: true });
    const second = start(failing.tokens);
    const other = await signIn(second, 'apple-4', 'code-2');
    expect(await deleteAccount(second, other.token)).toBe(204);
    expect(failing.revoked).toEqual(['refresh-code-2']);
    expect((await signIn(second, 'apple-4')).account.id).not.toBe(other.account.id);
  });

  it('works without the sign-in key and without an authorization code', async () => {
    const server = start();
    const session = await signIn(server, 'apple-5', 'code-1');
    expect(await deleteAccount(server, session.token)).toBe(204);
    await app?.close();

    const { exchanged, revoked, tokens } = recordingTokens();
    const second = start(tokens);
    const plain = await signIn(second, 'apple-6');
    expect(await deleteAccount(second, plain.token)).toBe(204);
    expect([exchanged, revoked]).toEqual([[], []]);
  });
});
