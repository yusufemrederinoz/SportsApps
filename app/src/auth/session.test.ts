import type { Account } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { ApiRequestError, createApiClient, errorCodeOf } from '@/api/client';
import { resolveApiUrl } from '@/api/url';

import { endSession, restoreSession, type TokenStorage } from './session';

const account: Account = {
  id: 'user-1',
  username: 'guest123456',
  isGuest: true,
  email: null,
  hasPassword: false,
  providers: [],
  createdAt: 1,
};

function memoryStorage(initial: string | null = null): TokenStorage & { value: string | null } {
  return {
    value: initial,
    async read() {
      return this.value;
    },
    async write(token) {
      this.value = token;
    },
    async clear() {
      this.value = null;
    },
  };
}

type Route = (request: { headers: Record<string, string>; body: unknown }) => { status: number; body?: unknown };

function fakeFetch(routes: Record<string, Route>, calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input).replace('http://server', '')}`;
    calls.push(key);
    const route = routes[key];
    if (!route) {
      throw new Error('offline');
    }
    const result = route({
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(result.body === undefined ? null : JSON.stringify(result.body), { status: result.status });
  }) as typeof fetch;
}

describe('resolveApiUrl', () => {
  it('prefers the configured address and trims trailing slashes', () => {
    expect(resolveApiUrl('https://api.example.com/', '192.168.1.5:8081', true)).toBe('https://api.example.com');
  });

  it('falls back to the development machine while developing', () => {
    expect(resolveApiUrl(undefined, '192.168.1.5:8081', true)).toBe('http://192.168.1.5:4000');
    expect(resolveApiUrl(undefined, '192.168.1.5:8081', false)).toBeNull();
    expect(resolveApiUrl(undefined, null, true)).toBeNull();
  });
});

describe('api client', () => {
  it('sends the session token and the JSON body', async () => {
    const api = createApiClient(
      'http://server',
      fakeFetch({
        'PATCH /v1/me': ({ headers, body }) => {
          expect(headers.Authorization).toBe('Bearer token-1');
          expect(body).toEqual({ username: 'Kaptan' });
          return { status: 200, body: { account: { ...account, username: 'Kaptan' } } };
        },
      }),
    );
    expect((await api.updateAccount('Kaptan', 'token-1')).account.username).toBe('Kaptan');
  });

  it('turns error replies, network failures and a missing address into coded errors', async () => {
    const api = createApiClient(
      'http://server',
      fakeFetch({ 'POST /v1/auth/login': () => ({ status: 401, body: { error: { code: 'invalid-credentials' } } }) }),
    );
    await expect(api.login({ email: 'a@b.co', password: 'password-1' }, null)).rejects.toMatchObject({ code: 'invalid-credentials' });
    await expect(api.guest()).rejects.toMatchObject({ code: 'network' });
    await expect(createApiClient(null).guest()).rejects.toMatchObject({ code: 'unconfigured' });
    expect(errorCodeOf(new ApiRequestError('email-taken'))).toBe('email-taken');
    expect(errorCodeOf(new Error('other'))).toBe('internal');
  });
});

describe('restoreSession', () => {
  it('creates a guest on first launch and stores the token', async () => {
    const storage = memoryStorage();
    const api = createApiClient('http://server', fakeFetch({ 'POST /v1/auth/guest': () => ({ status: 200, body: { token: 'new', account } }) }));
    expect(await restoreSession(api, storage)).toEqual({ status: 'signed-in', token: 'new', account });
    expect(storage.value).toBe('new');
  });

  it('reuses a stored token that is still valid', async () => {
    const calls: string[] = [];
    const api = createApiClient('http://server', fakeFetch({ 'GET /v1/me': () => ({ status: 200, body: { account } }) }, calls));
    expect(await restoreSession(api, memoryStorage('stored'))).toEqual({ status: 'signed-in', token: 'stored', account });
    expect(calls).toEqual(['GET /v1/me']);
  });

  it('replaces a rejected token with a fresh guest', async () => {
    const storage = memoryStorage('expired');
    const api = createApiClient(
      'http://server',
      fakeFetch({
        'GET /v1/me': () => ({ status: 401, body: { error: { code: 'unauthorized' } } }),
        'POST /v1/auth/guest': () => ({ status: 200, body: { token: 'fresh', account } }),
      }),
    );
    expect(await restoreSession(api, storage)).toMatchObject({ status: 'signed-in', token: 'fresh' });
    expect(storage.value).toBe('fresh');
  });

  it('stays offline and keeps the stored token when the server is unreachable', async () => {
    const storage = memoryStorage('stored');
    expect(await restoreSession(createApiClient('http://server', fakeFetch({})), storage)).toEqual({ status: 'offline' });
    expect(storage.value).toBe('stored');
  });
});

describe('endSession', () => {
  it('signs out and continues as a new guest', async () => {
    const storage = memoryStorage('old');
    const calls: string[] = [];
    const api = createApiClient(
      'http://server',
      fakeFetch(
        {
          'POST /v1/auth/logout': () => ({ status: 204 }),
          'POST /v1/auth/guest': () => ({ status: 200, body: { token: 'guest-2', account } }),
        },
        calls,
      ),
    );
    expect(await endSession(api, storage, 'old')).toMatchObject({ status: 'signed-in', token: 'guest-2' });
    expect(calls).toEqual(['POST /v1/auth/logout', 'POST /v1/auth/guest']);
  });
});
