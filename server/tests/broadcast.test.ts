import type { ApiErrorResponse, AuthResponse } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AdminStats } from '../src/admin/stats';
import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import { buildApp } from '../src/http/app';
import { cleanBroadcast, type BroadcastRecord } from '../src/notifications/broadcast';
import type { PushMessage } from '../src/notifications/sender';

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
const TURKISH = { title: 'Yeni oyun geldi', body: 'Kariyer Yolu şimdi oynanabilir.' };
const ENGLISH = { title: 'A new game is here', body: 'Career Path is ready to play.' };

let database: Database;
let app: FastifyInstance;
let time: number;
let sent: PushMessage[];
let rejected: string[];
let failing: boolean;

async function call<T>(method: 'GET' | 'POST', url: string, token?: string, payload?: object) {
  const response = await app.inject({ method, url, payload, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const json = response.headers['content-type']?.toString().includes('json');
  return { status: response.statusCode, body: (json ? response.json() : undefined) as T };
}

const broadcast = (payload: object, key = KEY) => call<BroadcastRecord>('POST', '/v1/admin/notifications', key, payload);
const errorOf = (reply: { body: unknown }) => (reply.body as ApiErrorResponse).error.code;
const deliveries = () => sent.map((message) => `${message.to}:${message.title}`);

async function device(language: string, token: string) {
  const guest = (await call<AuthResponse>('POST', '/v1/auth/guest')).body.token;
  await call('POST', '/v1/push-token', guest, { token, platform: 'android', language });
}

beforeEach(() => {
  time = Date.UTC(2026, 9, 10, 9);
  sent = [];
  rejected = [];
  failing = false;
  database = openDatabase(':memory:');
  app = buildApp({
    database,
    config,
    now: () => time,
    adminKey: KEY,
    sendPush: async (messages) => {
      if (failing) {
        throw new Error('push service answered 500');
      }
      sent.push(...messages);
      return rejected;
    },
  });
});

afterEach(async () => {
  await app.close();
  database.close();
});

describe('admin broadcast', () => {
  it('sends each device the text of its language and skips the rest', async () => {
    await device('tr', 'token-tr');
    await device('en', 'token-en');
    await device('de', 'token-de');

    const reply = await broadcast({ messages: { tr: TURKISH } });

    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ status: 'sent', devices: 1, skipped: 2, rejected: 0, fallback: null });
    expect(deliveries()).toEqual(['token-tr:Yeni oyun geldi']);
    expect(sent[0]).toMatchObject({ body: TURKISH.body, channelId: 'default', data: { kind: 'announcement' } });
  });

  it('gives the fallback text to languages without their own', async () => {
    await device('tr', 'token-tr');
    await device('de', 'token-de');
    await device('pt', 'token-pt');

    const reply = await broadcast({ messages: { tr: TURKISH, en: ENGLISH }, fallback: 'en' });

    expect(reply.body).toMatchObject({ status: 'sent', devices: 3, skipped: 0, fallback: 'en' });
    expect(deliveries().sort()).toEqual([
      'token-de:A new game is here',
      'token-pt:A new game is here',
      'token-tr:Yeni oyun geldi',
    ]);
  });

  it('needs the admin key and usable texts', async () => {
    await device('tr', 'token-tr');

    expect((await call('POST', '/v1/admin/notifications', undefined, { messages: { tr: TURKISH } })).status).toBe(401);
    expect(errorOf(await broadcast({ messages: { tr: TURKISH } }, 'wrong-key'))).toBe('unauthorized');
    expect(errorOf(await broadcast({ messages: {} }))).toBe('validation');
    expect(errorOf(await broadcast({ messages: { tr: { title: '   ', body: 'Text' } } }))).toBe('validation');
    expect(errorOf(await broadcast({ messages: { pt: TURKISH } }))).toBe('validation');
    expect(errorOf(await broadcast({ messages: { tr: TURKISH }, fallback: 'en' }))).toBe('validation');
    expect(errorOf(await broadcast({ messages: { en: ENGLISH } }))).toBe('validation');
    expect(sent).toEqual([]);
  });

  it('refuses a second broadcast within a minute', async () => {
    await device('tr', 'token-tr');

    expect((await broadcast({ messages: { tr: TURKISH } })).status).toBe(200);
    expect(errorOf(await broadcast({ messages: { tr: TURKISH } }))).toBe('rate-limited');
    time += MINUTE;
    expect((await broadcast({ messages: { tr: TURKISH } })).status).toBe(200);
    expect(sent).toHaveLength(2);
  });

  it('forgets devices the push service no longer knows', async () => {
    await device('tr', 'token-tr');
    await device('tr', 'token-gone');
    rejected = ['token-gone'];

    expect((await broadcast({ messages: { tr: TURKISH } })).body).toMatchObject({ devices: 2, rejected: 1 });

    time += MINUTE;
    sent = [];
    rejected = [];
    await broadcast({ messages: { tr: TURKISH } });
    expect(deliveries()).toEqual(['token-tr:Yeni oyun geldi']);
  });

  it('records a failed attempt when the push service fails', async () => {
    await device('tr', 'token-tr');
    failing = true;

    const reply = await broadcast({ messages: { tr: TURKISH } });

    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ status: 'failed', devices: 1 });
  });

  it('shows the audience and the recent broadcasts on the panel', async () => {
    await device('tr', 'token-tr');
    await device('tr', 'token-tr-2');
    await device('pt', 'token-pt');
    await broadcast({ messages: { tr: TURKISH } });

    time += 4000;
    const stats = (await call<AdminStats>('GET', '/v1/admin/stats', KEY)).body;

    expect(stats.devices.languages).toEqual([
      { language: 'tr', devices: 2 },
      { language: 'en', devices: 1 },
      { language: 'de', devices: 0 },
      { language: 'es', devices: 0 },
      { language: 'fr', devices: 0 },
      { language: 'it', devices: 0 },
    ]);
    expect(stats.broadcasts).toHaveLength(1);
    expect(stats.broadcasts[0]).toMatchObject({ status: 'sent', devices: 2, skipped: 1, messages: { tr: TURKISH } });
  });
});

describe('cleanBroadcast', () => {
  it('trims the texts', () => {
    expect(cleanBroadcast({ messages: { tr: { title: '  Title ', body: ' Body  ' } } })).toEqual({
      messages: { tr: { title: 'Title', body: 'Body' } },
    });
  });

  it('refuses a fallback that has no text', () => {
    expect(cleanBroadcast({ messages: { tr: TURKISH }, fallback: 'en' })).toBeNull();
  });
});
