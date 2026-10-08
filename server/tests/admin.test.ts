import type { ApiErrorResponse, AuthResponse } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPresence, isAdminKey } from '../src/admin/access';
import type { AdminStats } from '../src/admin/stats';
import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import { buildApp } from '../src/http/app';

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

const KEY = 'admin-key-for-tests';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

let database: Database;
let app: FastifyInstance;
let time: number;

async function call<T>(method: 'GET' | 'POST', url: string, token?: string, payload?: object) {
  const response = await app.inject({ method, url, payload, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const json = response.headers['content-type']?.toString().includes('json');
  return { status: response.statusCode, headers: response.headers, text: response.body, body: (json ? response.json() : undefined) as T };
}

const stats = async () => (await call<AdminStats>('GET', '/v1/admin/stats', KEY)).body;
const errorOf = (reply: { body: unknown }) => (reply.body as ApiErrorResponse).error.code;

function start(adminKey?: string) {
  app = buildApp({
    database,
    config,
    now: () => time,
    adminKey,
    purchaseVerifiers: { android: async (productId, proof) => ({ transactionId: `order-${proof}`, productId }) },
  });
}

beforeEach(() => {
  time = Date.UTC(2026, 9, 8, 9);
  database = openDatabase(':memory:');
  start(KEY);
});

afterEach(async () => {
  await app.close();
  database.close();
});

describe('admin panel', () => {
  it('opens only with the key', async () => {
    expect((await call('GET', '/v1/admin/stats')).status).toBe(401);
    expect(errorOf(await call('GET', '/v1/admin/stats', 'wrong-key'))).toBe('unauthorized');
    expect((await call('GET', '/v1/admin/stats', KEY)).status).toBe(200);
  });

  it('slows down guessing without locking out the right key', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await call('GET', '/v1/admin/stats', `guess-${attempt}`);
    }
    expect(errorOf(await call('GET', '/v1/admin/stats', 'another-guess'))).toBe('rate-limited');
    expect((await call('GET', '/v1/admin/stats', KEY)).status).toBe(200);
  });

  it('does not exist when no key is set', async () => {
    await app.close();
    start();
    expect((await call('GET', '/v1/admin/stats', KEY)).status).toBe(404);
    expect((await call('GET', '/admin')).status).toBe(404);
  });

  it('serves the page without letting it be stored or indexed', async () => {
    const page = await call('GET', '/admin');
    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.headers['cache-control']).toBe('no-store');
    expect(page.headers['x-robots-tag']).toContain('noindex');
    expect(page.text).toContain('/v1/admin/stats');
  });

  it('counts accounts, activity, purchases and goals', async () => {
    const guest = (await call<AuthResponse>('POST', '/v1/auth/guest')).body.token;
    const member = (
      await call<AuthResponse>('POST', '/v1/auth/register', undefined, {
        username: 'Counted',
        email: 'counted@example.com',
        password: 'Abcdefg1',
      })
    ).body.token;
    await call('POST', '/v1/daily', guest);
    await call('POST', '/v1/daily', member);
    await call('POST', '/v1/purchases', member, { platform: 'android', productId: 'goals_cg_100', proof: 'abc' });

    time += 4000;
    const current = await stats();
    expect(current.users).toMatchObject({ total: 2, members: 1, guests: 1, email: 1, google: 0, newToday: 2, newWeek: 2 });
    expect(current.active).toEqual({ today: 2, week: 2, month: 2 });
    expect(current.live).toMatchObject({ online: 2, matches: 0, queued: 0 });
    expect(current.purchases).toMatchObject({ total: 1, today: 1, goals: 100, listValue: 99.99 });
    expect(current.purchases.products).toEqual([{ productId: 'goals_cg_100', platform: 'android', count: 1, goals: 100 }]);
    expect(current.goals.movements.find((movement) => movement.reason === 'purchase')).toMatchObject({ amount: 100, count: 1 });
    expect(current.days).toHaveLength(14);
    expect(current.days.at(-1)).toMatchObject({ day: '2026-10-08', newUsers: 2, dailyRewards: 2, purchases: 1 });
    expect(current.days.at(-2)).toMatchObject({ day: '2026-10-07', newUsers: 0, dailyRewards: 0 });
  });

  it('moves yesterday into the past and forgets players who went quiet', async () => {
    const guest = (await call<AuthResponse>('POST', '/v1/auth/guest')).body.token;
    await call('POST', '/v1/daily', guest);

    time += DAY;
    const next = await stats();
    expect(next.users).toMatchObject({ total: 1, newToday: 0, newWeek: 1 });
    expect(next.live.online).toBe(0);
    expect(next.days.at(-1)).toMatchObject({ day: '2026-10-09', newUsers: 0, dailyRewards: 0 });
    expect(next.days.at(-2)).toMatchObject({ day: '2026-10-08', newUsers: 1, dailyRewards: 1 });
  });
});

describe('admin access helpers', () => {
  it('compares keys of any length', () => {
    expect(isAdminKey('secret', 'secret')).toBe(true);
    expect(isAdminKey('secre', 'secret')).toBe(false);
    expect(isAdminKey('', 'secret')).toBe(false);
  });

  it('counts players seen inside the window', () => {
    let clock = 0;
    const presence = createPresence(() => clock, 5 * MINUTE);
    presence.touch('a');
    clock += 4 * MINUTE;
    presence.touch('b');
    expect(presence.count()).toBe(2);
    clock += 2 * MINUTE;
    expect(presence.count()).toBe(1);
    presence.touch('a');
    expect(presence.count()).toBe(2);
  });
});
