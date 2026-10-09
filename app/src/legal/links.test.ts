import { describe, expect, it } from 'vitest';

import { createApiClient } from '@/api/client';

import { legalUrl, reportUrl } from './links';

describe('legal links', () => {
  it('opens the page in the language of the app', () => {
    expect(legalUrl('privacy', 'tr')).toBe('https://challengegoal.app/gizlilik');
    expect(legalUrl('terms', 'tr')).toBe('https://challengegoal.app/kosullar');
    expect(legalUrl('privacy', 'de')).toBe('https://challengegoal.app/de/privacy');
    expect(legalUrl('terms', 'it')).toBe('https://challengegoal.app/it/terms');
  });

  it('falls back to English for other languages', () => {
    expect(legalUrl('privacy', 'pt')).toBe('https://challengegoal.app/en/privacy');
  });

  it('prepares a report mail that names the sender', () => {
    const url = reportUrl('Report a problem or a player', 'Kaptan10');
    expect(url.startsWith('mailto:destek@challengegoal.app?subject=Report%20a%20problem')).toBe(true);
    expect(decodeURIComponent(url)).toContain('Kaptan10');
  });
});

describe('notification opt-out', () => {
  it('removes the device token with a signed request', async () => {
    const calls: { url: string; method: string; body: unknown; authorization: string | undefined }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      calls.push({ url, method: init.method ?? 'GET', body: JSON.parse(String(init.body)), authorization: headers.Authorization });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    await createApiClient('http://api.test', fetcher).removePushToken('session', 'device-token');
    expect(calls).toEqual([
      { url: 'http://api.test/v1/push-token', method: 'DELETE', body: { token: 'device-token' }, authorization: 'Bearer session' },
    ]);
  });
});
