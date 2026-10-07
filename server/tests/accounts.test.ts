import type { Account, ApiErrorResponse, AuthResponse } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createIdentityVerifier } from '../src/accounts/identity';
import { hashPassword, verifyPassword } from '../src/accounts/passwords';
import { usernameKey } from '../src/accounts/service';
import type { ServerConfig } from '../src/config';
import { openDatabase } from '../src/database';
import { buildApp } from '../src/http/app';

const DAY = 24 * 60 * 60 * 1000;
const GOOGLE_CLIENT_ID = 'test-google-client';
const GOOGLE_ISSUER = 'https://accounts.google.com';
const config: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  databasePath: ':memory:',
  footballDatabasePath: '',
  portraitsPath: '',
  sessionDays: 90,
  googleClientIds: [GOOGLE_CLIENT_ID],
  appleClientIds: [],
  timeZone: 'Europe/Istanbul',
};
const credentials = { email: 'Arda@Example.com', password: 'Correct-horse-9', username: 'Arda_10' };

let app: FastifyInstance;
let clock: number;
let signGoogleToken: (claims: Record<string, unknown>, audience?: string) => Promise<string>;
let googleKeys: ReturnType<typeof createLocalJWKSet>;

interface Reply<T> {
  status: number;
  body: T;
}

async function call<T>(method: 'GET' | 'POST' | 'PATCH', path: string, payload?: object, token?: string): Promise<Reply<T>> {
  const response = await app.inject({
    method,
    url: `/v1${path}`,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: response.statusCode, body: response.body ? (response.json() as T) : (undefined as T) };
}

const errorCode = (reply: Reply<unknown>) => (reply.body as ApiErrorResponse).error.code;

async function guest(): Promise<AuthResponse> {
  return (await call<AuthResponse>('POST', '/auth/guest')).body;
}

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  googleKeys = createLocalJWKSet({ keys: [jwk] });
  signGoogleToken = (claims, audience = GOOGLE_CLIENT_ID) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(GOOGLE_ISSUER)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
});

beforeEach(() => {
  clock = Date.UTC(2026, 9, 7);
  app = buildApp({
    database: openDatabase(':memory:'),
    config,
    now: () => clock,
    verifiers: { google: createIdentityVerifier('google', config.googleClientIds, googleKeys) },
  });
});

afterEach(async () => {
  await app.close();
});

describe('passwords', () => {
  it('verifies only the original password', async () => {
    const hash = await hashPassword('Correct-horse-9');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('Correct-horse-9', hash)).toBe(true);
    expect(await verifyPassword('Correct-horse-8', hash)).toBe(false);
    expect(await verifyPassword('Correct-horse-9', 'not-a-hash')).toBe(false);
  });
});

describe('usernameKey', () => {
  it('treats look-alike usernames as the same', () => {
    expect(usernameKey('Çağrı_10')).toBe(usernameKey('cagri10'));
  });
});

describe('guest accounts', () => {
  it('creates a guest with a working session', async () => {
    const created = await guest();
    expect(created.account.isGuest).toBe(true);
    expect(created.account.username).toMatch(/^guest\d{6}$/);
    expect(created.account.email).toBeNull();

    const me = await call<{ account: Account }>('GET', '/me', undefined, created.token);
    expect(me.status).toBe(200);
    expect(me.body.account).toEqual(created.account);
  });

  it('rejects missing, unknown and expired sessions', async () => {
    expect(errorCode(await call('GET', '/me'))).toBe('unauthorized');
    expect(errorCode(await call('GET', '/me', undefined, 'unknown-token'))).toBe('unauthorized');
    const { token } = await guest();
    clock += 91 * DAY;
    expect(errorCode(await call('GET', '/me', undefined, token))).toBe('unauthorized');
  });

  it('keeps an active session alive past its original expiry', async () => {
    const { token } = await guest();
    clock += 60 * DAY;
    expect((await call('GET', '/me', undefined, token)).status).toBe(200);
    clock += 60 * DAY;
    expect((await call('GET', '/me', undefined, token)).status).toBe(200);
  });
});

describe('registration', () => {
  it('creates an account with the chosen username', async () => {
    const registered = await call<AuthResponse>('POST', '/auth/register', credentials);
    expect(registered.status).toBe(200);
    expect(registered.body.account).toMatchObject({
      username: 'Arda_10',
      isGuest: false,
      email: 'Arda@Example.com',
      hasPassword: true,
    });
  });

  it('refuses to create or enter an account while a session is active', async () => {
    const current = await guest();
    const attempts = [
      await call('POST', '/auth/register', credentials, current.token),
      await call('POST', '/auth/login', credentials, current.token),
      await call('POST', '/auth/guest', undefined, current.token),
      await call('POST', '/auth/google', { token: 'anything' }, current.token),
    ];
    for (const attempt of attempts) {
      expect([attempt.status, errorCode(attempt)]).toEqual([409, 'already-signed-in']);
    }
    await call('POST', '/auth/logout', undefined, current.token);
    const registered = await call<AuthResponse>('POST', '/auth/register', credentials, current.token);
    expect(registered.status).toBe(200);
    expect(registered.body.account.id).not.toBe(current.account.id);
  });

  it('rejects taken emails and usernames regardless of case or accents', async () => {
    await call('POST', '/auth/register', credentials);
    const sameEmail = await call('POST', '/auth/register', { ...credentials, email: 'ARDA@example.com', username: 'Other' });
    const sameName = await call('POST', '/auth/register', { ...credentials, email: 'other@example.com', username: 'arda10' });
    expect([sameEmail.status, errorCode(sameEmail)]).toEqual([409, 'email-taken']);
    expect([sameName.status, errorCode(sameName)]).toEqual([409, 'username-taken']);
  });

  it('validates the email, password and username', async () => {
    const invalid = async (change: object) => errorCode(await call('POST', '/auth/register', { ...credentials, ...change }));
    expect(await invalid({ email: 'not-an-email' })).toBe('invalid-email');
    for (const password of ['Short1a', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere']) {
      expect(await invalid({ password })).toBe('invalid-password');
    }
    expect(await invalid({ username: 'ab' })).toBe('invalid-username');
    expect(await invalid({ username: 'has space' })).toBe('invalid-username');
    expect(errorCode(await call('POST', '/auth/register', { email: credentials.email }))).toBe('validation');
  });
});

describe('login and logout', () => {
  beforeEach(async () => {
    await call('POST', '/auth/register', credentials);
  });

  it('signs in with the right password, ignoring email case', async () => {
    const login = await call<AuthResponse>('POST', '/auth/login', { email: 'arda@example.com', password: credentials.password });
    expect(login.status).toBe(200);
    expect(login.body.account.username).toBe('Arda_10');
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await call('POST', '/auth/login', { email: credentials.email, password: 'wrong-password' });
    const unknownEmail = await call('POST', '/auth/login', { email: 'nobody@example.com', password: credentials.password });
    expect([wrongPassword.status, errorCode(wrongPassword)]).toEqual([401, 'invalid-credentials']);
    expect([unknownEmail.status, errorCode(unknownEmail)]).toEqual([401, 'invalid-credentials']);
  });

  it('ends the session on logout', async () => {
    const { body } = await call<AuthResponse>('POST', '/auth/login', credentials);
    expect((await call('POST', '/auth/logout', undefined, body.token)).status).toBe(204);
    expect(errorCode(await call('GET', '/me', undefined, body.token))).toBe('unauthorized');
  });

  it('limits repeated attempts from one address', async () => {
    const attempts = [];
    for (let attempt = 0; attempt < 31; attempt += 1) {
      attempts.push(await call('POST', '/auth/login', { email: credentials.email, password: 'wrong-password' }));
    }
    expect(errorCode(attempts.at(-1) as Reply<unknown>)).toBe('rate-limited');
    clock += 61 * 1000;
    expect((await call('POST', '/auth/login', credentials)).status).toBe(200);
  });
});

describe('profile', () => {
  it('offers no way to change a username', async () => {
    const { token } = await guest();
    const reply = await call('PATCH', '/me', { username: 'Kaptan' }, token);
    expect([reply.status, errorCode(reply)]).toEqual([404, 'not-found']);
  });
});

describe('identity sign-in', () => {
  it('creates an account from a verified Google token and reuses it afterwards', async () => {
    const token = await signGoogleToken({ sub: 'google-1', email: 'kerem@example.com', email_verified: true });
    const first = await call<AuthResponse>('POST', '/auth/google', { token });
    expect(first.status).toBe(200);
    expect(first.body.account).toMatchObject({
      username: 'kerem',
      isGuest: false,
      email: 'kerem@example.com',
      hasPassword: false,
      providers: ['google'],
    });
    const second = await call<AuthResponse>('POST', '/auth/google', { token });
    expect(second.body.account.id).toBe(first.body.account.id);
  });

  it('picks a free username when the preferred one is taken', async () => {
    await call('POST', '/auth/register', { ...credentials, username: 'kerem' });
    const token = await signGoogleToken({ sub: 'google-3', email: 'kerem@other.com', email_verified: true });
    const created = await call<AuthResponse>('POST', '/auth/google', { token });
    expect(created.body.account.username).toMatch(/^kerem\d{6}$/);
  });

  it('rejects tokens for another audience and malformed tokens', async () => {
    const foreign = await signGoogleToken({ sub: 'google-4' }, 'someone-else');
    expect(errorCode(await call('POST', '/auth/google', { token: foreign }))).toBe('invalid-identity-token');
    expect(errorCode(await call('POST', '/auth/google', { token: 'garbage' }))).toBe('invalid-identity-token');
  });

  it('reports a provider that is not configured', async () => {
    const reply = await call('POST', '/auth/apple', { token: 'anything' });
    expect([reply.status, errorCode(reply)]).toEqual([503, 'provider-unavailable']);
  });
});

describe('unknown routes', () => {
  it('answers with a not-found error body', async () => {
    const reply = await call('GET', '/nothing-here');
    expect([reply.status, errorCode(reply)]).toEqual([404, 'not-found']);
  });
});
