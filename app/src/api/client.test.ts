import { describe, expect, it } from 'vitest';

import { createApiClient } from '@/api/client';

function recording() {
  const calls: { url: string; method: string; authorization: string | undefined }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ url, method: init.method ?? 'GET', authorization: headers.Authorization });
    return new Response(JSON.stringify({ matches: [], more: false }), { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, client: createApiClient('http://api.test', fetcher) };
}

describe('progress requests', () => {
  it('sends history filters only when they are set', async () => {
    const { calls, client } = recording();
    await client.matches('token');
    await client.matches('token', { game: 'top-ten', before: 1700, limit: 20 });
    expect(calls.map((call) => call.url)).toEqual([
      'http://api.test/v1/matches',
      'http://api.test/v1/matches?game=top-ten&before=1700&limit=20',
    ]);
  });

  it('claims the daily reward with a signed post and reads progress and goals', async () => {
    const { calls, client } = recording();
    await client.claimDaily('token');
    await client.progress('token');
    await client.wallet('token');
    expect(calls).toEqual([
      { url: 'http://api.test/v1/daily', method: 'POST', authorization: 'Bearer token' },
      { url: 'http://api.test/v1/progress', method: 'GET', authorization: 'Bearer token' },
      { url: 'http://api.test/v1/wallet', method: 'GET', authorization: 'Bearer token' },
    ]);
  });
});
