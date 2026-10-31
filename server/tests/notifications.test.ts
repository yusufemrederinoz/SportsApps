import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import { buildApp } from '../src/http/app';
import type { PushMessage } from '../src/notifications/sender';
import { createNotifications, notificationText, type Notifications } from '../src/notifications/service';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WEDNESDAY_MORNING = Date.UTC(2026, 9, 7, 7, 30);
const WEDNESDAY_AFTERNOON = Date.UTC(2026, 9, 7, 12, 0);
const WEDNESDAY_EVENING = Date.UTC(2026, 9, 7, 16, 30);
const MONDAY_MORNING = Date.UTC(2026, 9, 12, 7, 30);
const WEDNESDAY_NOON = Date.UTC(2026, 9, 7, 9, 40);
const WEDNESDAY_AFTER_WORK = Date.UTC(2026, 9, 7, 15, 10);
const WEDNESDAY_NIGHT = Date.UTC(2026, 9, 7, 18, 5);
const INVITE_TIMES = [WEDNESDAY_NOON, WEDNESDAY_AFTER_WORK, WEDNESDAY_NIGHT];

let database: Database;
let notifications: Notifications;
let clock: number;
let sent: PushMessage[];
let rejected: string[];

function player(language = 'tr', token: string | null = null): string {
  const { account } = createAccountService(database, { sessionDays: 90, now: () => clock }).createGuest();
  if (token !== null) {
    notifications.register(account.id, token, 'android', language);
  }
  return account.id;
}

const kinds = () => sent.map((message) => `${message.to}:${message.data.kind}`);

beforeEach(() => {
  database = openDatabase(':memory:');
  clock = WEDNESDAY_MORNING;
  sent = [];
  rejected = [];
  notifications = createNotifications(database, {
    now: () => clock,
    timeZone: 'Europe/Istanbul',
    send: async (messages) => {
      sent.push(...messages);
      return rejected;
    },
  });
});

afterEach(() => {
  database.close();
});

describe('notification schedule', () => {
  it('announces the puzzle once in the morning to reachable players who have not played it', async () => {
    player('tr', 'token-a');
    player('tr');
    const solver = player('tr', 'token-c');
    database
      .prepare(
        "INSERT INTO puzzle_plays (user_id, day, market, grid_id, guesses_left, created_at, updated_at) VALUES (?, '2026-10-07', 'tr', 1, 8, 0, 0)",
      )
      .run(solver);

    expect(await notifications.run()).toBe(1);
    expect(kinds()).toEqual(['token-a:puzzle']);
    expect(sent[0]).toMatchObject({ title: notificationText('puzzle', 'tr', {}).title, sound: 'default' });
    expect(await notifications.run()).toBe(0);
  });

  it('stays quiet outside the morning and evening hours', async () => {
    player('tr', 'token-a');
    clock = WEDNESDAY_AFTERNOON;
    expect(await notifications.run()).toBe(0);
  });

  it('warns in the evening that a streak ends today', async () => {
    const keeper = player('tr', 'token-a');
    const beginner = player('tr', 'token-b');
    const insert = database.prepare(
      "INSERT INTO daily_rewards (user_id, streak, best_streak, last_day, updated_at) VALUES (?, ?, ?, '2026-10-06', 0)",
    );
    insert.run(keeper, 4, 4);
    insert.run(beginner, 1, 1);
    clock = WEDNESDAY_EVENING;

    await notifications.run();
    expect(kinds()).toEqual(['token-a:streak']);
    expect(sent[0]?.body).toContain('4');
  });

  it('invites a player back after three quiet days and leaves them alone otherwise', async () => {
    const quiet = player('tr', 'token-a');
    database.prepare('UPDATE sessions SET last_used_at = ? WHERE user_id = ?').run(WEDNESDAY_MORNING - 3 * DAY - HOUR, quiet);

    expect(await notifications.run()).toBe(0);
    clock = WEDNESDAY_EVENING;
    await notifications.run();
    expect(kinds()).toEqual(['token-a:comeback']);
    clock = WEDNESDAY_EVENING + DAY;
    expect(await notifications.run()).toBe(0);
  });

  it('tells last week rank on Monday instead of the puzzle', async () => {
    clock = MONDAY_MORNING;
    const winner = player('tr', 'token-a');
    const runnerUp = player('tr', 'token-b');
    player('tr', 'token-c');
    const insert = database.prepare(
      `INSERT INTO matches (id, kind, game, market, difficulty, grid_id, x_user_id, o_user_id, x_username, o_username,
         winner, reason, x_cells, o_cells, move_count, started_at, finished_at, x_points_change, o_points_change)
       VALUES (?, 'queue', 'grid', 'tr', 1, 0, ?, NULL, 'a', 'b', 'x', 'score', 1, 0, 1, 0, ?, ?, NULL)`,
    );
    insert.run('last-week-1', winner, MONDAY_MORNING - 3 * DAY, 25);
    insert.run('last-week-2', runnerUp, MONDAY_MORNING - 2 * DAY, 10);
    insert.run('this-week', runnerUp, MONDAY_MORNING - HOUR, 90);

    await notifications.run();
    expect(kinds().sort()).toEqual(['token-a:weekly', 'token-b:weekly', 'token-c:puzzle']);
    expect(sent.find((message) => message.to === 'token-a')?.body).toContain('1');
    expect(sent.find((message) => message.to === 'token-b')?.body).toContain('2');
  });

  it('invites every reachable player at 12.30, 18.00 and 21.00, once per slot, even right after a game', async () => {
    const fan = player('tr', 'token-a');
    player('tr');
    database
      .prepare(
        "INSERT INTO puzzle_plays (user_id, day, market, grid_id, guesses_left, created_at, updated_at) VALUES (?, '2026-10-07', 'tr', 1, 8, 0, 0)",
      )
      .run(fan);

    for (const time of INVITE_TIMES) {
      clock = time;
      expect(await notifications.run()).toBe(1);
      clock = time + 10 * 60 * 1000;
      expect(await notifications.run()).toBe(0);
    }
    expect(kinds()).toEqual(['token-a:invite', 'token-a:invite', 'token-a:invite']);
  });

  it('changes the invite text between slots and from one day to the next', async () => {
    player('tr', 'token-a');
    for (const time of INVITE_TIMES) {
      clock = time;
      await notifications.run();
    }
    clock = WEDNESDAY_NOON + DAY;
    await notifications.run();

    const titles = sent.map((message) => message.title);
    expect(new Set(titles.slice(0, 3)).size).toBe(3);
    expect(titles[3]).not.toBe(titles[0]);
  });

  it('writes invites in the language of the device', async () => {
    player('de', 'token-de');
    clock = WEDNESDAY_NOON;
    await notifications.run();
    const german = Array.from({ length: 12 }, (_, variant) => notificationText('invite', 'de', { variant }).title);
    expect(german).toContain(sent[0]?.title);
  });

  it('has the same number of invite texts in every language', () => {
    const counts = ['tr', 'en', 'de', 'es', 'fr', 'it'].map(
      (language) => new Set(Array.from({ length: 24 }, (_, variant) => notificationText('invite', language, { variant }).title)).size,
    );
    expect(counts).toEqual([12, 12, 12, 12, 12, 12]);
  });

  it('writes in the language of the device and forgets tokens the push service rejects', async () => {
    const owner = player('en', 'token-en');
    rejected = ['token-en'];
    await notifications.run();
    expect(sent[0]?.title).toBe(notificationText('puzzle', 'en', {}).title);
    expect(database.prepare('SELECT COUNT(*) AS total FROM push_tokens WHERE user_id = ?').get(owner)).toMatchObject({ total: 0 });
  });
});

describe('push token routes', () => {
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

  it('stores a device token for the signed-in player and removes it again', async () => {
    const app = buildApp({ database, config, sendPush: async () => [] });
    const call = (method: 'POST' | 'DELETE', payload: object, token?: string) =>
      app.inject({ method, url: '/v1/push-token', payload, headers: token ? { authorization: `Bearer ${token}` } : {} });
    const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/guest' })).json() as { token: string };
    const device = { token: 'ExponentPushToken[abc]', platform: 'android', language: 'tr' };
    const count = () => (database.prepare('SELECT COUNT(*) AS total FROM push_tokens').get() as { total: number }).total;

    expect((await call('POST', device)).statusCode).toBe(401);
    expect((await call('POST', { ...device, platform: 'windows' }, token)).statusCode).toBe(400);
    expect((await call('POST', device, token)).statusCode).toBe(204);
    expect((await call('POST', device, token)).statusCode).toBe(204);
    expect(count()).toBe(1);
    expect((await call('DELETE', { token: device.token }, token)).statusCode).toBe(204);
    expect(count()).toBe(0);
    await app.close();
  });
});
