import type { Account } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { ApiRequestError, createApiClient, errorCodeOf } from '@/api/client';
import { resolveApiUrl } from '@/api/url';

import {
  adoptMember,
  completeOnboarding,
  deleteAccount,
  enterAsGuest,
  entryOf,
  hasCompletedOnboarding,
  leaveSession,
  restoreSession,
  type KeyValueStore,
} from './session';

const guest: Account = {
  id: 'guest-1',
  username: 'guest123456',
  isGuest: true,
  email: null,
  hasPassword: false,
  providers: [],
  createdAt: 1,
};
const member: Account = { ...guest, id: 'member-1', username: 'Arda_10', isGuest: false, email: 'arda@example.com', hasPassword: true };

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { values: Record<string, string> } {
  const values = { ...initial };
  return {
    values,
    async get(key) {
      return values[key] ?? null;
    },
    async set(key, value) {
      values[key] = value;
    },
    async remove(key) {
      delete values[key];
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

const accountsByToken: Record<string, Account> = { 'guest-token': guest, 'member-token': member };
const server: Record<string, Route> = {
  'POST /v1/auth/guest': () => ({ status: 200, body: { token: 'new-guest-token', account: { ...guest, id: 'guest-2' } } }),
  'POST /v1/auth/logout': () => ({ status: 204 }),
  'DELETE /v1/account': () => ({ status: 204 }),
  'GET /v1/me': ({ headers }) => {
    const account = accountsByToken[(headers.Authorization ?? '').replace('Bearer ', '')];
    return account ? { status: 200, body: { account } } : { status: 401, body: { error: { code: 'unauthorized' } } };
  },
};
const reachable = (calls: string[] = []) => createApiClient('http://server', fakeFetch(server, calls));
const unreachable = createApiClient('http://server', fakeFetch({}));

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
  it('sends the session token only where a session is required', async () => {
    const api = createApiClient(
      'http://server',
      fakeFetch({
        ...server,
        'POST /v1/auth/login': ({ headers, body }) => {
          expect(headers.Authorization).toBeUndefined();
          expect(body).toEqual({ email: 'a@b.co', password: 'Password-1' });
          return { status: 200, body: { token: 'member-token', account: member } };
        },
      }),
    );
    expect((await api.me('member-token')).account).toEqual(member);
    expect((await api.login({ email: 'a@b.co', password: 'Password-1' })).token).toBe('member-token');
  });

  it('turns error replies, network failures and a missing address into coded errors', async () => {
    await expect(reachable().me('unknown')).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(unreachable.guest()).rejects.toMatchObject({ code: 'network' });
    await expect(createApiClient(null).guest()).rejects.toMatchObject({ code: 'unconfigured' });
    expect(errorCodeOf(new ApiRequestError('email-taken'))).toBe('email-taken');
    expect(errorCodeOf(new Error('other'))).toBe('internal');
  });
});

describe('restoreSession', () => {
  it('shows the entry choice on first launch', async () => {
    const calls: string[] = [];
    expect(await restoreSession(reachable(calls), memoryStore())).toEqual({ status: 'signed-out' });
    expect(calls).toEqual([]);
  });

  it('shows the entry choice again to a player who only has a guest account', async () => {
    const store = memoryStore({ 'guest-token': 'guest-token' });
    expect(await restoreSession(reachable(), store)).toEqual({ status: 'signed-out' });
    expect(store.values).toEqual({ 'guest-token': 'guest-token' });
  });

  it('lets a signed-in member straight back in', async () => {
    const store = memoryStore({ 'member-token': 'member-token', 'guest-token': 'guest-token' });
    expect(await restoreSession(reachable(), store)).toEqual({ status: 'signed-in', token: 'member-token', account: member });
  });

  it('asks a member to sign in again when the server rejects the stored token', async () => {
    const store = memoryStore({ 'member-token': 'expired' });
    expect(await restoreSession(reachable(), store)).toEqual({ status: 'signed-out' });
    expect(store.values).toEqual({});
  });

  it('keeps a member in the app offline when the server is unreachable', async () => {
    const store = memoryStore({ 'member-token': 'member-token' });
    expect(await restoreSession(unreachable, store)).toEqual({ status: 'offline' });
    expect(store.values).toEqual({ 'member-token': 'member-token' });
  });
});

describe('enterAsGuest', () => {
  it('creates a guest account the first time', async () => {
    const store = memoryStore();
    expect(await enterAsGuest(reachable(), store)).toMatchObject({ status: 'signed-in', token: 'new-guest-token' });
    expect(store.values).toEqual({ 'guest-token': 'new-guest-token' });
  });

  it('opens the same guest account on every later entry', async () => {
    const calls: string[] = [];
    const store = memoryStore({ 'guest-token': 'guest-token' });
    expect(await enterAsGuest(reachable(calls), store)).toEqual({ status: 'signed-in', token: 'guest-token', account: guest });
    expect(await enterAsGuest(reachable(calls), store)).toEqual({ status: 'signed-in', token: 'guest-token', account: guest });
    expect(calls).toEqual(['GET /v1/me', 'GET /v1/me']);
  });

  it('creates a new guest only when the old one is no longer accepted', async () => {
    const store = memoryStore({ 'guest-token': 'expired' });
    expect(await enterAsGuest(reachable(), store)).toMatchObject({ status: 'signed-in', token: 'new-guest-token' });
    expect(store.values).toEqual({ 'guest-token': 'new-guest-token' });
  });

  it('lets the player in offline without losing the stored guest', async () => {
    const store = memoryStore({ 'guest-token': 'guest-token' });
    expect(await enterAsGuest(unreachable, store)).toEqual({ status: 'offline' });
    expect(await enterAsGuest(unreachable, memoryStore())).toEqual({ status: 'offline' });
    expect(store.values).toEqual({ 'guest-token': 'guest-token' });
  });
});

describe('adoptMember and leaveSession', () => {
  it('remembers a member so the entry choice is skipped next time', async () => {
    const store = memoryStore({ 'guest-token': 'guest-token' });
    expect(await adoptMember(store, { token: 'member-token', account: member })).toMatchObject({ status: 'signed-in' });
    expect(await restoreSession(reachable(), store)).toMatchObject({ status: 'signed-in', account: member });
  });

  it('signs a member out on the server and keeps the device guest for later', async () => {
    const calls: string[] = [];
    const store = memoryStore({ 'member-token': 'member-token', 'guest-token': 'guest-token', 'onboarding-done': '1' });
    expect(await leaveSession(reachable(calls), store)).toEqual({ status: 'signed-out' });
    expect(calls).toEqual(['POST /v1/auth/logout']);
    expect(store.values).toEqual({ 'guest-token': 'guest-token', 'onboarding-done': '1' });
  });

  it('returns a guest to the entry choice without ending the guest account', async () => {
    const calls: string[] = [];
    const store = memoryStore({ 'guest-token': 'guest-token' });
    expect(await leaveSession(reachable(calls), store)).toEqual({ status: 'signed-out' });
    expect(calls).toEqual([]);
    expect(await enterAsGuest(reachable(), store)).toMatchObject({ account: guest });
  });

  it('still signs a member out when the server is unreachable', async () => {
    const store = memoryStore({ 'member-token': 'member-token' });
    expect(await leaveSession(unreachable, store)).toEqual({ status: 'signed-out' });
    expect(store.values).toEqual({});
  });
});

describe('deleteAccount', () => {
  it('deletes a member on the server and forgets only the member token', async () => {
    const calls: string[] = [];
    const store = memoryStore({ 'member-token': 'member-token', 'guest-token': 'guest-token' });
    const state = { status: 'signed-in', token: 'member-token', account: member } as const;
    expect(await deleteAccount(reachable(calls), store, state)).toEqual({ status: 'signed-out' });
    expect(calls).toEqual(['DELETE /v1/account']);
    expect(store.values).toEqual({ 'guest-token': 'guest-token' });
  });

  it('forgets the device guest so the next guest entry starts a new account', async () => {
    const store = memoryStore({ 'guest-token': 'guest-token' });
    const state = { status: 'signed-in', token: 'guest-token', account: guest } as const;
    expect(await deleteAccount(reachable(), store, state)).toEqual({ status: 'signed-out' });
    expect(await enterAsGuest(reachable(), store)).toMatchObject({ token: 'new-guest-token' });
  });

  it('keeps the account when the server cannot be reached', async () => {
    const store = memoryStore({ 'member-token': 'member-token' });
    const state = { status: 'signed-in', token: 'member-token', account: member } as const;
    await expect(deleteAccount(unreachable, store, state)).rejects.toThrow();
    expect(store.values).toEqual({ 'member-token': 'member-token' });
  });
});

describe('onboarding', () => {
  it('is shown until it has been completed once', async () => {
    const store = memoryStore();
    expect(await hasCompletedOnboarding(store)).toBe(false);
    await completeOnboarding(store);
    expect(await hasCompletedOnboarding(store)).toBe(true);
  });
});

describe('entryOf', () => {
  const signedIn = { status: 'signed-in', token: 'token', account: member } as const;

  it('waits until both the session and the onboarding flag are known', () => {
    expect(entryOf({ status: 'loading' }, true)).toBe('loading');
    expect(entryOf({ status: 'signed-out' }, null)).toBe('loading');
  });

  it('starts a new player on the onboarding', () => {
    expect(entryOf({ status: 'signed-out' }, false)).toBe('onboarding');
  });

  it('offers the entry choice once the onboarding is done', () => {
    expect(entryOf({ status: 'signed-out' }, true)).toBe('welcome');
  });

  it('opens the game for a signed-in or offline player', () => {
    expect(entryOf(signedIn, true)).toBe('app');
    expect(entryOf(signedIn, false)).toBe('app');
    expect(entryOf({ status: 'offline' }, true)).toBe('app');
  });
});
