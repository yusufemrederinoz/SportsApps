import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ServerConfig } from '../src/config';
import { openDatabase } from '../src/database';
import { buildApp } from '../src/http/app';

const IMAGE = Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'latin1');

let directory: string;
let app: FastifyInstance;

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'portraits-'));
  writeFileSync(join(directory, '42.webp'), IMAGE);
  writeFileSync(join(directory, 'notes.txt'), 'private');
  const config: ServerConfig = {
    host: '127.0.0.1',
    port: 0,
    databasePath: ':memory:',
    footballDatabasePath: '',
    portraitsPath: directory,
    sessionDays: 90,
    googleClientIds: [],
    appleClientIds: [],
    timeZone: 'Europe/Istanbul',
    trustProxy: false,
  };
  app = buildApp({ database: openDatabase(':memory:'), config });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('portrait files', () => {
  it('serves a portrait with a long cache lifetime', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/portraits/42.webp?v=1' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/webp');
    expect(response.headers['cache-control']).toContain('max-age=604800');
    expect(response.rawPayload.equals(IMAGE)).toBe(true);
  });

  it('answers 404 for a footballer without a portrait', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/portraits/7.webp' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: { code: 'not-found' } });
  });

  it('never serves anything but numbered portrait files', async () => {
    for (const name of ['notes.txt', '..%2F42.webp', '42.webp%2F..%2Fnotes.txt', 'abc.webp', '42.png']) {
      const response = await app.inject({ method: 'GET', url: `/v1/portraits/${name}` });
      expect(response.statusCode, name).toBe(404);
    }
  });
});
