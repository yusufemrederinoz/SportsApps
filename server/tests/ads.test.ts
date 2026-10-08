import { createSign, generateKeyPairSync } from 'node:crypto';

import {
  AD_REWARD_GOALS,
  DAILY_AD_LIMIT,
  WELCOME_GOALS,
  type AccountResponse,
  type AdStatusResponse,
  type AuthResponse,
} from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdSignatureVerifier } from '../src/ads/signature';
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

const AD_UNIT = '1234567890';
const KEY_ID = '3335741209';
const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 8, 9);

const google = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const stranger = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const publicKey = google.publicKey.export({ type: 'spki', format: 'pem' }).toString();

let database: Database;
let app: FastifyInstance;
let time: number;
let keyRequests: number;

const keyServer = (async () => {
  keyRequests += 1;
  return new Response(JSON.stringify({ keys: [{ keyId: Number(KEY_ID), pem: publicKey }] }), { status: 200 });
}) as unknown as typeof fetch;

function callback(fields: Record<string, string>, key = google.privateKey): string {
  const content = new URLSearchParams({ ad_network: '5450213213286189855', reward_amount: '2', reward_item: 'goal', ...fields }).toString();
  const signature = createSign('SHA256').update(content).sign(key).toString('base64url');
  return `${content}&signature=${signature}&key_id=${KEY_ID}`;
}

async function call<T>(method: 'GET' | 'POST', path: string, token?: string) {
  const response = await app.inject({ method, url: `/v1${path}`, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: response.statusCode, body: response.body ? (response.json() as T) : (undefined as T) };
}

async function guest(): Promise<{ token: string; id: string }> {
  const { token } = (await call<AuthResponse>('POST', '/auth/guest')).body;
  return { token, id: (await call<AccountResponse>('GET', '/me', token)).body.account.id };
}

const watch = (userId: string, transaction: string, unit = AD_UNIT) =>
  call('GET', `/ads/reward?${callback({ ad_unit: unit, user_id: userId, transaction_id: transaction })}`);

const status = async (token: string) => (await call<AdStatusResponse>('GET', '/ads', token)).body;

beforeEach(() => {
  time = START;
  keyRequests = 0;
  database = openDatabase(':memory:');
  app = buildApp({
    database,
    config,
    now: () => time,
    ads: { units: [AD_UNIT], verify: createAdSignatureVerifier(keyServer, () => time) },
  });
});

afterEach(async () => {
  await app.close();
  database.close();
});

describe('rewarded ads', () => {
  it('adds the reward once for each watched ad', async () => {
    const player = await guest();
    expect(await status(player.token)).toEqual({ goals: WELCOME_GOALS, remaining: DAILY_AD_LIMIT, reward: AD_REWARD_GOALS });

    expect((await watch(player.id, 'ad-1')).status).toBe(200);
    expect((await watch(player.id, 'ad-1')).status).toBe(200);

    expect(await status(player.token)).toEqual({
      goals: WELCOME_GOALS + AD_REWARD_GOALS,
      remaining: DAILY_AD_LIMIT - 1,
      reward: AD_REWARD_GOALS,
    });
  });

  it('stops at the daily limit and starts again the next day', async () => {
    const player = await guest();
    for (let index = 0; index <= DAILY_AD_LIMIT; index += 1) {
      await watch(player.id, `ad-${index}`);
    }
    expect(await status(player.token)).toMatchObject({ goals: WELCOME_GOALS + DAILY_AD_LIMIT * AD_REWARD_GOALS, remaining: 0 });

    time += DAY;
    await watch(player.id, 'ad-tomorrow');
    expect(await status(player.token)).toMatchObject({
      goals: WELCOME_GOALS + (DAILY_AD_LIMIT + 1) * AD_REWARD_GOALS,
      remaining: DAILY_AD_LIMIT - 1,
    });
  });

  it('gives nothing for another ad unit, an unknown player or a forged signature', async () => {
    const player = await guest();

    expect((await watch(player.id, 'ad-1', '999')).status).toBe(200);
    expect((await watch('nobody', 'ad-2')).status).toBe(200);
    const forged = callback({ ad_unit: AD_UNIT, user_id: player.id, transaction_id: 'ad-3' }, stranger.privateKey);
    expect((await call('GET', `/ads/reward?${forged}`)).status).toBe(400);
    const altered = callback({ ad_unit: AD_UNIT, user_id: 'someone-else', transaction_id: 'ad-4' }).replace('someone-else', player.id);
    expect((await call('GET', `/ads/reward?${altered}`)).status).toBe(400);

    expect(await status(player.token)).toMatchObject({ goals: WELCOME_GOALS, remaining: DAILY_AD_LIMIT });
  });

  it('answers the address check that carries no signature', async () => {
    expect((await call('GET', '/ads/reward')).status).toBe(200);
    expect(keyRequests).toBe(0);
  });

  it('keeps the keys for a day and asks again for an unknown key', async () => {
    const player = await guest();
    await watch(player.id, 'ad-1');
    await watch(player.id, 'ad-2');
    expect(keyRequests).toBe(1);

    const unknownKey = callback({ ad_unit: AD_UNIT, user_id: player.id, transaction_id: 'ad-3' }).replace(KEY_ID, '1');
    expect((await call('GET', `/ads/reward?${unknownKey}`)).status).toBe(400);
    expect(keyRequests).toBe(2);

    time += DAY + 1;
    await watch(player.id, 'ad-4');
    expect(keyRequests).toBe(3);
  });

  it('offers no ads when no ad unit is configured', async () => {
    await app.close();
    app = buildApp({ database, config });
    const player = await guest();
    expect(await status(player.token)).toMatchObject({ remaining: 0 });
    expect((await call('GET', '/ads')).status).toBe(401);
  });
});
