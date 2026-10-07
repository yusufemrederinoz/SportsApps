import type { Grid, Header } from '@sportapps/game-core';
import {
  PUZZLE_FINISH_GOALS,
  PUZZLE_PERFECT_GOALS,
  WELCOME_GOALS,
  puzzleCellPoints,
  puzzleNumber,
  type DailyPuzzleResponse,
  type LeaderboardResponse,
  type PuzzleGuessResponse,
} from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import type { FootballLibrary } from '../src/football/library';
import { buildApp } from '../src/http/app';
import { createLeaderboard } from '../src/progress/leaderboard';
import { localDay, nextWeekStart, startOfDay, weekStart } from '../src/progress/points';
import { PuzzleError, createPuzzles, dayFraction, type PuzzleLibrary } from '../src/progress/puzzle';
import { createProgress, type Progress } from '../src/progress/store';

const DAY = 24 * 60 * 60 * 1000;
const WEDNESDAY = Date.UTC(2026, 9, 7, 9);
const club = (referenceId: number): Header => ({ kind: 'club', referenceId });
const gridOf = (id: number): Grid => ({ id, rows: [club(1), club(2), club(3)], columns: [club(4), club(5), club(6)] });
const answer = (row: number, column: number, variant = 0) => variant * 100 + (row + 1) * 10 + column + 4;

const library: PuzzleLibrary = {
  pickGrid: (market, _, random = Math.random) => (market === 'tr' ? gridOf(1 + Math.floor((random() ?? 0) * 1000)) : null),
  isCorrect: (footballerId, row, column) => footballerId % 100 === row.referenceId * 10 + column.referenceId,
};

let database: Database;
let progress: Progress;

function player(): string {
  return createAccountService(database, { sessionDays: 90 }).createGuest().account.id;
}

function rankedMatch(id: string, game: string, x: string, o: string, xChange: number, oChange: number, finishedAt: number) {
  database
    .prepare(
      `INSERT INTO matches (id, kind, game, market, difficulty, grid_id, x_user_id, o_user_id, x_username, o_username,
         winner, reason, x_cells, o_cells, move_count, started_at, finished_at, x_points_change, o_points_change)
       VALUES (?, 'queue', ?, 'tr', 1, 0, ?, ?, 'x', 'o', 'x', 'score', 1, 0, 1, 0, ?, ?, ?)`,
    )
    .run(id, game, x, o, finishedAt, xChange, oChange);
}

function setPoints(userId: string, game: string, points: number) {
  database
    .prepare(
      `INSERT INTO ratings (user_id, game, points, best_points, matches, updated_at) VALUES (?, ?, ?, ?, 1, 0)
       ON CONFLICT (user_id, game) DO UPDATE SET points = excluded.points`,
    )
    .run(userId, game, points, points);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WEDNESDAY);
  database = openDatabase(':memory:');
  progress = createProgress(database, { now: () => Date.now() });
});

afterEach(() => {
  database.close();
  vi.useRealTimers();
});

describe('time boundaries', () => {
  it('starts weeks on Monday at local midnight', () => {
    expect(startOfDay('2026-10-05', 'Europe/Istanbul')).toBe(Date.UTC(2026, 9, 4, 21));
    expect(weekStart(WEDNESDAY, 'Europe/Istanbul')).toBe(Date.UTC(2026, 9, 4, 21));
    expect(nextWeekStart(WEDNESDAY, 'Europe/Istanbul')).toBe(Date.UTC(2026, 9, 11, 21));
    expect(weekStart(Date.UTC(2026, 9, 4, 21, 30), 'Europe/Istanbul')).toBe(Date.UTC(2026, 9, 4, 21));
    expect(weekStart(Date.UTC(2026, 9, 4, 20, 30), 'Europe/Istanbul')).toBe(Date.UTC(2026, 8, 27, 21));
  });
});

describe('leaderboards', () => {
  it('ranks all-time totals and single games with the player found even outside the top', () => {
    const [first, second, third] = [player(), player(), player()];
    setPoints(first, 'grid', 300);
    setPoints(first, 'duel', 50);
    setPoints(second, 'duel', 400);
    setPoints(third, 'grid', 350);
    const board = createLeaderboard(database, { now: () => Date.now() });

    const total = board.board(first, 'all', null);
    expect(total.entries.map((entry) => entry.points)).toEqual([400, 350, 350]);
    expect(total.entries.map((entry) => entry.rank)).toEqual([1, 2, 2]);
    expect(total.you).toMatchObject({ rank: 2, points: 350, level: 3, you: true });
    expect(total.resetsAt).toBeNull();

    const duel = board.board(third, 'all', 'duel');
    expect(duel.entries.map((entry) => entry.points)).toEqual([400, 50]);
    expect(duel.you).toBeNull();
  });

  it('sums only this week of ranked matches for the weekly board', () => {
    const [first, second] = [player(), player()];
    rankedMatch('old', 'grid', first, second, 90, -40, WEDNESDAY - 5 * DAY);
    rankedMatch('new', 'grid', first, second, 25, -20, WEDNESDAY - DAY);
    rankedMatch('duel', 'duel', second, first, 30, -15, WEDNESDAY - DAY);
    const board = createLeaderboard(database, { now: () => Date.now() });

    const week = board.board(first, 'week', null);
    expect(week.entries.map((entry) => entry.points)).toEqual([10, 10]);
    expect(week.resetsAt).toBe(Date.UTC(2026, 9, 11, 21));
    expect(board.board(first, 'week', 'grid').entries).toMatchObject([{ points: 25, you: true }, { points: -20 }]);
  });
});

describe('daily puzzle', () => {
  const puzzles = () => createPuzzles(database, library, progress, { now: () => Date.now() });

  it('gives everyone the same grid for the day and a new one the next day', () => {
    const service = puzzles();
    const first = service.puzzle(player(), 'tr');
    const second = service.puzzle(player(), 'tr');
    expect(first).toMatchObject({ day: '2026-10-07', number: 7, guessesLeft: 9, finished: false, score: 0, players: 1 });
    expect(second.players).toBe(2);
    expect(second.gridId).toBe(first.gridId);
    vi.setSystemTime(WEDNESDAY + DAY);
    expect(service.puzzle(player(), 'tr').gridId).toBe(1 + Math.floor(dayFraction('tr', '2026-10-08') * 1000));
    expect(puzzleNumber(localDay(WEDNESDAY + DAY, 'Europe/Istanbul'))).toBe(8);
  });

  it('spends a guess on every answer and refuses a filled cell without spending one', () => {
    const service = puzzles();
    const userId = player();
    const first = service.guess(userId, 'tr', { row: 0, column: 0 }, answer(0, 0));
    expect(first).toMatchObject({ outcome: 'correct', goals: null, puzzle: { guessesLeft: 8, score: 100 } });
    expect(first.puzzle.cells[0]).toEqual({ footballerId: answer(0, 0), share: 100, points: 100 });
    expect(service.guess(userId, 'tr', { row: 0, column: 1 }, 999).outcome).toBe('wrong');
    expect(service.guess(userId, 'tr', { row: 1, column: 1 }, answer(0, 0)).outcome).toBe('already-used');
    expect(() => service.guess(userId, 'tr', { row: 0, column: 0 }, answer(0, 0, 1))).toThrow(PuzzleError);
    expect(() => service.guess(userId, 'tr', { row: 3, column: 0 }, 1)).toThrow(PuzzleError);
    expect(service.puzzle(userId, 'tr').guessesLeft).toBe(6);
  });

  it('scores rarer answers higher and ranks the day', () => {
    const service = puzzles();
    const [first, second, third] = [player(), player(), player()];
    service.guess(first, 'tr', { row: 0, column: 0 }, answer(0, 0));
    service.guess(second, 'tr', { row: 0, column: 0 }, answer(0, 0));
    service.guess(third, 'tr', { row: 0, column: 0 }, answer(0, 0, 1));
    expect(service.puzzle(third, 'tr').cells[0]).toEqual({ footballerId: answer(0, 0, 1), share: 33, points: 100 });
    expect(service.puzzle(first, 'tr').cells[0]).toEqual({ footballerId: answer(0, 0), share: 67, points: 67 });
    const ranking = service.ranking(first, 'tr');
    expect(ranking.entries.map((entry) => entry.score)).toEqual([100, 67, 67]);
    expect(ranking.you).toMatchObject({ rank: 2, score: 67, filled: 1, you: true });
    expect(puzzleCellPoints(1, 1)).toBe(100);
    expect(puzzleCellPoints(10, 10)).toBe(10);
  });

  it('pays goals once when the guesses run out and more for a full grid', () => {
    const service = puzzles();
    const perfect = player();
    let last: ReturnType<ReturnType<typeof puzzles>['guess']> | null = null;
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        last = service.guess(perfect, 'tr', { row, column }, answer(row, column));
      }
    }
    expect(last?.puzzle).toMatchObject({ finished: true, guessesLeft: 0, score: 900, rewardGoals: 5 });
    expect(last?.goals).toBe(WELCOME_GOALS + PUZZLE_FINISH_GOALS + PUZZLE_PERFECT_GOALS);
    expect(() => service.guess(perfect, 'tr', { row: 0, column: 0 }, 1)).toThrow(PuzzleError);

    const partial = player();
    for (let guess = 0; guess < 9; guess += 1) {
      last = service.guess(partial, 'tr', { row: 1, column: 1 }, guess === 0 ? 999 : 998 - guess);
    }
    expect(last?.puzzle).toMatchObject({ finished: true, rewardGoals: PUZZLE_FINISH_GOALS, score: 0 });
    expect(progress.goalsOf(partial)).toBe(WELCOME_GOALS + PUZZLE_FINISH_GOALS);
  });
});

describe('ranking routes', () => {
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
  };

  it('serves the leaderboard, reports puzzles as unavailable without football data and checks guesses', async () => {
    vi.useRealTimers();
    const app = buildApp({ database, config, now: () => Date.now() });
    const call = async <T>(method: 'GET' | 'POST', url: string, token?: string, payload?: object) => {
      const response = await app.inject({
        method,
        url: `/v1${url}`,
        payload,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      return { status: response.statusCode, body: response.json() as T };
    };
    const { token } = (await call<{ token: string }>('POST', '/auth/guest')).body;
    expect((await call('GET', '/leaderboard')).status).toBe(401);
    const week = await call<LeaderboardResponse>('GET', '/leaderboard', token);
    expect(week.body).toMatchObject({ period: 'week', game: null, entries: [], you: null });
    expect((await call('GET', '/leaderboard?period=month', token)).status).toBe(400);
    expect((await call<DailyPuzzleResponse>('GET', '/puzzle?market=tr', token)).status).toBe(503);
    expect((await call('GET', '/puzzle', token)).status).toBe(400);
    expect((await call<PuzzleGuessResponse>('POST', '/puzzle/guess', token, { market: 'tr', cell: { row: 0 } })).status).toBe(400);
    await app.close();
  });

  it('plays the puzzle through the routes when football data is there', async () => {
    vi.useRealTimers();
    const football = { ...library, dataVersion: 'test', hasMarket: (market: string) => market === 'tr' } as unknown as FootballLibrary;
    const app = buildApp({ database, config, football, now: () => Date.now(), play: { botWaitMilliseconds: { minimum: 60000, maximum: 60000 } } });
    const call = async <T>(method: 'GET' | 'POST', url: string, token: string, payload?: object) => {
      const response = await app.inject({ method, url: `/v1${url}`, payload, headers: { authorization: `Bearer ${token}` } });
      return { status: response.statusCode, body: response.json() as T };
    };
    const guest = await app.inject({ method: 'POST', url: '/v1/auth/guest' });
    const { token } = guest.json() as { token: string };
    expect((await call<DailyPuzzleResponse>('GET', '/puzzle?market=tr', token)).body.puzzle.guessesLeft).toBe(9);
    const guess = await call<PuzzleGuessResponse>('POST', '/puzzle/guess', token, {
      market: 'tr',
      cell: { row: 2, column: 2 },
      footballerId: answer(2, 2),
    });
    expect(guess.body).toMatchObject({ outcome: 'correct', goals: null, puzzle: { guessesLeft: 8 } });
    const taken = await call('POST', '/puzzle/guess', token, { market: 'tr', cell: { row: 2, column: 2 }, footballerId: 5 });
    expect(taken.status).toBe(409);
    expect((await call('GET', '/puzzle?market=de', token)).status).toBe(503);
    await app.close();
  });
});
