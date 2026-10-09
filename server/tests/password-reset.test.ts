import type { ApiErrorResponse, AuthResponse } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import { buildApp } from '../src/http/app';
import { codeMailHtml } from '../src/mail/layout';
import { createResendMailer, type Mail } from '../src/mail/mailer';

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

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const member = { username: 'Forgetful', email: 'Forgetful@Example.com', password: 'Abcdefg1' };
const NEW_PASSWORD = 'Zyxwvut9';

let database: Database;
let app: FastifyInstance;
let time: number;
let outbox: Mail[];

async function call<T>(method: 'GET' | 'POST', path: string, payload?: object, token?: string) {
  const response = await app.inject({
    method,
    url: `/v1${path}`,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: response.statusCode, body: response.body ? (response.json() as T) : (undefined as T) };
}

const errorOf = (reply: { body: unknown }) => (reply.body as ApiErrorResponse).error.code;
const forgot = (email: string, language = 'tr') => call('POST', '/auth/password/forgot', { email, language });
const reset = (code: string, password = NEW_PASSWORD, email = member.email) =>
  call<AuthResponse>('POST', '/auth/password/reset', { email, code, password });
const lastCode = () => /\b(\d{6})\b/.exec(outbox.at(-1)?.text ?? '')?.[1] ?? '';

beforeEach(async () => {
  time = Date.UTC(2026, 9, 8, 9);
  outbox = [];
  database = openDatabase(':memory:');
  app = buildApp({
    database,
    config,
    now: () => time,
    mailer: async (mail) => {
      outbox.push(mail);
    },
  });
  await call('POST', '/auth/register', member);
});

afterEach(async () => {
  await app.close();
  database.close();
});

describe('password reset', () => {
  it('mails a code and signs the player in with the new password', async () => {
    const old = (await call<AuthResponse>('POST', '/auth/login', { email: member.email, password: member.password })).body.token;

    expect((await forgot('forgetful@example.com')).status).toBe(204);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ to: member.email });
    expect(outbox[0]?.subject).toContain(lastCode());

    const done = await reset(lastCode());
    expect(done.status).toBe(200);
    expect(done.body.account.username).toBe(member.username);
    expect((await call('GET', '/me', undefined, done.body.token)).status).toBe(200);
    expect((await call('GET', '/me', undefined, old)).status).toBe(401);
    expect((await call('POST', '/auth/login', { email: member.email, password: NEW_PASSWORD })).status).toBe(200);
    expect(errorOf(await call('POST', '/auth/login', { email: member.email, password: member.password }))).toBe('invalid-credentials');
    expect(errorOf(await reset(lastCode()))).toBe('invalid-reset-code');
  });

  it('answers the same way for an unknown address and mails nothing', async () => {
    expect((await forgot('nobody@example.com')).status).toBe(204);
    expect(outbox).toHaveLength(0);
    expect(errorOf(await reset('123456', NEW_PASSWORD, 'nobody@example.com'))).toBe('invalid-reset-code');
  });

  it('writes the mail in the language of the device', async () => {
    await forgot(member.email, 'en-US');
    expect(outbox[0]?.subject).toContain('password reset code');
    time += 2 * MINUTE;
    await forgot(member.email, 'pt');
    expect(outbox[1]?.subject).toContain('password reset code');
    time += 2 * MINUTE;
    await forgot(member.email, 'tr');
    expect(outbox[2]?.subject).toContain('şifre sıfırlama');
    time += 2 * MINUTE;
    await forgot(member.email, 'de-DE');
    expect(outbox[3]?.subject).toContain('Zurücksetzen des Passworts');
    expect(outbox[0]?.html).toContain('<html lang="en">');
    expect(outbox[2]?.html).toContain('<html lang="tr">');
    expect(outbox[2]?.html).toContain('ŞİFRE SIFIRLAMA');
    expect(outbox[3]?.html).toContain('<html lang="de">');
  });

  it('carries the code in both the plain and the designed body', async () => {
    await forgot(member.email);
    const code = lastCode();
    expect(outbox[0]?.text).toContain(`kodun: ${code}`);
    expect(outbox[0]?.html).toContain(`>${code}</td>`);
    expect(outbox[0]?.html).toContain('15 dakika');
    expect(outbox[0]?.html).toContain('&quot;Şifremi unuttum&quot;');
    expect(outbox[0]?.html).not.toContain('{{');
  });

  it('refuses a wrong, expired or overused code and a weak password', async () => {
    await forgot(member.email);
    const code = lastCode();
    const wrong = code === '000000' ? '000001' : '000000';

    expect(errorOf(await reset(code, 'weak'))).toBe('invalid-password');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(errorOf(await reset(wrong))).toBe('invalid-reset-code');
    }
    expect(errorOf(await reset(code))).toBe('invalid-reset-code');

    time += 2 * MINUTE;
    await forgot(member.email);
    time += 16 * MINUTE;
    expect(errorOf(await reset(lastCode()))).toBe('invalid-reset-code');
  });

  it('limits how often a code is mailed', async () => {
    await forgot(member.email);
    await forgot(member.email);
    expect(outbox).toHaveLength(1);

    for (let request = 0; request < 6; request += 1) {
      time += 2 * MINUTE;
      await forgot(member.email);
    }
    expect(outbox).toHaveLength(5);

    time += DAY;
    await forgot(member.email);
    expect(outbox).toHaveLength(6);
    expect((await reset(lastCode())).status).toBe(200);
  });

  it('says so when no mail service is set up', async () => {
    await app.close();
    app = buildApp({ database, config });
    expect(errorOf(await forgot(member.email))).toBe('mail-unavailable');
  });
});

describe('mail service', () => {
  it('sends the message with the key and reports a refusal', async () => {
    const requests: { url: string; authorization: string; body: Record<string, unknown> }[] = [];
    const accepting = (async (url: string, init: RequestInit) => {
      requests.push({
        url,
        authorization: (init.headers as Record<string, string>).Authorization ?? '',
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      });
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const refusing = (async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    const settings = { apiKey: 'key-1', from: 'ChallengeGoal <support@example.com>' };
    const mail = { to: 'player@example.com', subject: 'Code', text: 'Your code', html: '<p>Your code</p>' };

    await createResendMailer(settings, accepting)(mail);
    expect(requests[0]).toEqual({
      url: 'https://api.resend.com/emails',
      authorization: 'Bearer key-1',
      body: { from: settings.from, to: ['player@example.com'], subject: 'Code', text: 'Your code', html: '<p>Your code</p>' },
    });
    await expect(createResendMailer(settings, refusing)(mail)).rejects.toThrow('403');
  });

  it('escapes everything it places in the designed body', () => {
    const html = codeMailHtml({
      language: 'en',
      preview: 'a < b',
      title: '<script>',
      intro: 'Tom & "Jerry"',
      code: '123456',
      instructions: "it's",
      footnote: 'x > y',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Tom &amp; &quot;Jerry&quot;');
    expect(html).toContain('it&#39;s');
  });
});
