import { WELCOME_GOALS, type ApiErrorResponse, type AuthResponse, type PurchaseResponse } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { decodeJwt, decodeProtectedHeader, exportPKCS8, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import { buildApp } from '../src/http/app';
import { createAppleVerifier } from '../src/store/apple';
import { createGoogleVerifier } from '../src/store/google';
import { StoreUnreachableError, type PurchaseVerifiers } from '../src/store/verifiers';

const config: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  databasePath: ':memory:',
  footballDatabasePath: '',
  portraitsPath: '',
  sessionDays: 90,
  googleClientIds: [],
  appleClientIds: [],
  timeZone: 'Europe/Istanbul',
  trustProxy: false,
  notifications: false,
};

const member = { username: 'Buyer', email: 'buyer@example.com', password: 'Abcdefg1' };

let database: Database;
let app: FastifyInstance;
let applePrivateKey: string;
let googlePrivateKey: string;

async function call<T>(method: 'GET' | 'POST', path: string, payload?: object, token?: string) {
  const response = await app.inject({
    method,
    url: `/v1${path}`,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: response.statusCode, body: response.json() as T };
}

const errorOf = (reply: { body: unknown }) => (reply.body as ApiErrorResponse).error.code;

function start(verifiers: PurchaseVerifiers) {
  app = buildApp({ database, config, purchaseVerifiers: verifiers });
}

async function register(input = member): Promise<string> {
  return (await call<AuthResponse>('POST', '/auth/register', input)).body.token;
}

function unsigned(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(payload)}.`;
}

beforeAll(async () => {
  applePrivateKey = await exportPKCS8((await generateKeyPair('ES256', { extractable: true })).privateKey);
  googlePrivateKey = await exportPKCS8((await generateKeyPair('RS256', { extractable: true })).privateKey);
});

beforeEach(() => {
  database = openDatabase(':memory:');
});

afterEach(async () => {
  await app?.close();
  database.close();
});

describe('purchases', () => {
  const accepting: PurchaseVerifiers = {
    android: async (productId, proof) => ({ transactionId: `order-${proof}`, productId }),
  };

  it('adds the goals of a verified pack once', async () => {
    start(accepting);
    const token = await register();
    const purchase = { platform: 'android', productId: 'goals_cg_100', proof: 'abc' };

    const first = await call<PurchaseResponse>('POST', '/purchases', purchase, token);
    expect(first.body).toEqual({ granted: 100, goals: WELCOME_GOALS + 100 });
    const again = await call<PurchaseResponse>('POST', '/purchases', purchase, token);
    expect(again.body).toEqual({ granted: 0, goals: WELCOME_GOALS + 100 });
    const wallet = await call<{ entries: { reason: string; amount: number }[] }>('GET', '/wallet', undefined, token);
    expect(wallet.body.entries[0]).toMatchObject({ reason: 'purchase', amount: 100 });
  });

  it('refuses a purchase that already paid another player', async () => {
    start(accepting);
    const first = await register();
    const second = await register({ username: 'Other', email: 'other@example.com', password: 'Abcdefg1' });
    const purchase = { platform: 'android', productId: 'goals_cg_30', proof: 'shared' };

    expect((await call('POST', '/purchases', purchase, first)).status).toBe(200);
    expect(errorOf(await call('POST', '/purchases', purchase, second))).toBe('purchase-used');
  });

  it('sells nothing to guests, for unknown products or on a platform without a store', async () => {
    start(accepting);
    const guest = (await call<AuthResponse>('POST', '/auth/guest')).body.token;
    const token = await register();
    const purchase = { platform: 'android', productId: 'goals_cg_30', proof: 'abc' };

    expect(errorOf(await call('POST', '/purchases', purchase, guest))).toBe('guest-purchase');
    expect(errorOf(await call('POST', '/purchases', { ...purchase, productId: 'goals_cg_9999' }, token))).toBe('purchase-invalid');
    expect(errorOf(await call('POST', '/purchases', { ...purchase, platform: 'ios' }, token))).toBe('store-unavailable');
    expect((await call('POST', '/purchases', purchase)).status).toBe(401);
  });

  it('tells a rejected purchase from a store that cannot be reached', async () => {
    start({
      android: async () => {
        throw new Error('not purchased');
      },
      ios: async () => {
        throw new StoreUnreachableError('down');
      },
    });
    const token = await register();

    expect(errorOf(await call('POST', '/purchases', { platform: 'android', productId: 'goals_cg_30', proof: 'x' }, token))).toBe(
      'purchase-invalid',
    );
    expect(errorOf(await call('POST', '/purchases', { platform: 'ios', productId: 'goals_cg_30', proof: '1' }, token))).toBe(
      'store-unavailable',
    );
  });
});

describe('App Store verification', () => {
  const settings = () => ({ privateKey: applePrivateKey, keyId: 'KEY123', issuerId: 'issuer-1', bundleId: 'com.challengegoal.app' });

  it('looks the transaction up with a signed request and falls back to the sandbox', async () => {
    const calls: { url: string; authorization: string }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, authorization: (init.headers as Record<string, string>).Authorization ?? '' });
      if (!url.includes('sandbox')) {
        return new Response('{}', { status: 404 });
      }
      const transaction = { bundleId: 'com.challengegoal.app', productId: 'goals_cg_30', transactionId: '2000000123' };
      return new Response(JSON.stringify({ signedTransactionInfo: unsigned(transaction) }), { status: 200 });
    }) as unknown as typeof fetch;

    const verified = await createAppleVerifier(settings(), fetcher)('goals_cg_30', '2000000123');
    expect(verified).toEqual({ transactionId: '2000000123', productId: 'goals_cg_30' });
    expect(calls.map((entry) => new URL(entry.url).host)).toEqual([
      'api.storekit.itunes.apple.com',
      'api.storekit-sandbox.itunes.apple.com',
    ]);
    const token = calls[0]?.authorization.replace('Bearer ', '') ?? '';
    expect(decodeProtectedHeader(token)).toMatchObject({ alg: 'ES256', kid: 'KEY123' });
    expect(decodeJwt(token)).toMatchObject({ iss: 'issuer-1', aud: 'appstoreconnect-v1', bid: 'com.challengegoal.app' });
  });

  it('rejects another app, another product, a refund and a malformed id', async () => {
    const answer = (transaction: object) =>
      (async () => new Response(JSON.stringify({ signedTransactionInfo: unsigned(transaction) }), { status: 200 })) as unknown as typeof fetch;
    const base = { bundleId: 'com.challengegoal.app', productId: 'goals_cg_30', transactionId: '1' };

    await expect(createAppleVerifier(settings(), answer({ ...base, bundleId: 'com.other.app' }))('goals_cg_30', '1')).rejects.toThrow();
    await expect(createAppleVerifier(settings(), answer({ ...base, productId: 'goals_cg_600' }))('goals_cg_30', '1')).rejects.toThrow();
    await expect(createAppleVerifier(settings(), answer({ ...base, revocationDate: 1 }))('goals_cg_30', '1')).rejects.toThrow();
    await expect(createAppleVerifier(settings(), answer(base))('goals_cg_30', '../users')).rejects.toThrow();
  });

  it('reports the store as unreachable when it does not answer', async () => {
    const failing = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    await expect(createAppleVerifier(settings(), failing)('goals_cg_30', '1')).rejects.toBeInstanceOf(StoreUnreachableError);
  });
});

describe('Google Play verification', () => {
  const settings = () => ({ clientEmail: 'server@example.iam.gserviceaccount.com', privateKey: googlePrivateKey, packageName: 'com.challengegoal.app' });

  it('accepts a completed purchase and reuses the access token', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      if (url.includes('oauth2')) {
        return new Response(JSON.stringify({ access_token: 'access-1', expires_in: 3600 }), { status: 200 });
      }
      return new Response(JSON.stringify({ purchaseState: 0, orderId: 'GPA.1234' }), { status: 200 });
    }) as unknown as typeof fetch;
    const verify = createGoogleVerifier(settings(), fetcher);

    expect(await verify('goals_cg_250', 'token-1')).toEqual({ transactionId: 'GPA.1234', productId: 'goals_cg_250' });
    await verify('goals_cg_250', 'token-2');
    expect(calls.filter((url) => url.includes('oauth2'))).toHaveLength(1);
    expect(calls[1]).toBe(
      'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.challengegoal.app/purchases/products/goals_cg_250/tokens/token-1',
    );
  });

  it('rejects a pending or unknown purchase', async () => {
    const answer = (status: number, body: object) =>
      (async (url: string) =>
        url.includes('oauth2')
          ? new Response(JSON.stringify({ access_token: 'access-1', expires_in: 3600 }), { status: 200 })
          : new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

    await expect(createGoogleVerifier(settings(), answer(200, { purchaseState: 2 }))('goals_cg_30', 'token')).rejects.toThrow();
    await expect(createGoogleVerifier(settings(), answer(404, {}))('goals_cg_30', 'token')).rejects.toThrow();
  });
});
