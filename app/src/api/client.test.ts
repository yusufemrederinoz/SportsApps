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

  it('asks for leaderboards and the daily puzzle', async () => {
    const { calls, client } = recording();
    await client.leaderboard('token', 'week', null);
    await client.leaderboard('token', 'all', 'top-ten');
    await client.puzzle('token', 'tr');
    await client.puzzleGuess('token', { market: 'tr', cell: { row: 1, column: 2 }, footballerId: 7 });
    await client.puzzleRanking('token', 'tr');
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET http://api.test/v1/leaderboard?period=week',
      'GET http://api.test/v1/leaderboard?period=all&game=top-ten',
      'GET http://api.test/v1/puzzle?market=tr',
      'POST http://api.test/v1/puzzle/guess',
      'GET http://api.test/v1/puzzle/ranking?market=tr',
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
