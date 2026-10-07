import { opponentOf, type Side } from '@sportapps/game-core';
import {
  WELCOME_GOALS,
  dailyGoals,
  levelFor,
  type DailyRewardResponse,
  type MatchHistoryResponse,
  type ProgressResponse,
  type ServerMessage,
  type WalletResponse,
} from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import type { ServerConfig } from '../src/config';
import { openDatabase, type Database } from '../src/database';
import { buildApp } from '../src/http/app';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import { seatSide, type LiveRoom, type RoomContext, type RoomFactory } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { expectedScore, localDay, pointsChange, previousDay } from '../src/progress/points';
import { createProgress, type Progress } from '../src/progress/store';
import { createWallet } from '../src/progress/wallet';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 7, 9);
const BOT_WAIT = { minimum: 4000, maximum: 4000 };

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
}

let database: Database;
let history: MatchHistory;
let progress: Progress;
let lobby: Lobby;
let rooms: RoomContext[];
let seed: number;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

const scoreRoom: RoomFactory = (context) => {
  rooms.push(context);
  let finishedAt: number | null = null;
  const finish = (winner: Side | null, reason: 'score' | 'forfeit') => {
    finishedAt = context.now();
    context.onFinished(live, { winner, reason });
  };
  const live: LiveRoom = {
    id: context.id,
    kind: context.kind,
    game: 'grid',
    seats: context.seats,
    sideOf: (userId) => seatSide(context.seats, userId),
    start: () => undefined,
    greeting: () => ({ type: 'opponent', matchId: context.id, connected: true }),
    handle(side) {
      finish(side, 'score');
      return null;
    },
    forfeit: (side) => finish(opponentOf(side), 'forfeit'),
    finishedAt: () => finishedAt,
    record: () => ({
      game: 'grid',
      market: context.market,
      difficulty: context.difficulty,
      gridId: 0,
      scores: { x: 0, o: 0 },
      moveCount: 0,
      startedAt: 0,
    }),
    dispose: () => undefined,
  };
  return live;
};

function join(): Client {
  const { account } = createAccountService(database, { sessionDays: 90 }).createGuest();
  const client: Client = {
    player: { id: account.id, username: account.username },
    received: [],
    send(message) {
      client.received.push(message);
    },
    close: () => undefined,
    of(type) {
      return client.received.filter(
        (message): message is Extract<ServerMessage, { type: typeof type }> => message.type === type,
      );
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const matchIdOf = (client: Client) => client.of('opponent').at(-1)?.matchId ?? '';
const queue = (client: Client, difficulty: 1 | 2 | 3 = 1) =>
  lobby.handle(client.player.id, { type: 'queue', market: 'tr', difficulty });
const win = (client: Client) =>
  lobby.handle(client.player.id, { type: 'act', matchId: matchIdOf(client), action: { kind: 'name', footballerId: 1 } });
const givePoints = (client: Client, points: number) =>
  database
    .prepare('INSERT INTO ratings (user_id, game, points, best_points, matches, updated_at) VALUES (?, ?, ?, ?, 0, 0)')
    .run(client.player.id, 'grid', points, points);

function createTestLobby(botWait = BOT_WAIT) {
  return createLobby({
    games: { grid: scoreRoom },
    hasMarket: (market) => market === 'tr',
    history,
    progress,
    random,
    now: () => Date.now(),
    botWaitMilliseconds: botWait,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  seed = 5;
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  progress = createProgress(database, { now: () => Date.now() });
  lobby = createTestLobby();
});

afterEach(() => {
  lobby.shutdown();
  database.close();
  vi.useRealTimers();
});

describe('points', () => {
  it('gives more for beating a stronger rival and on harder levels', () => {
    expect(expectedScore(500, 500)).toBe(0.5);
    expect(pointsChange(500, 500, 'win', 1)).toBe(25);
    expect(pointsChange(500, 500, 'loss', 1)).toBe(-20);
    expect(pointsChange(500, 500, 'draw', 1)).toBe(0);
    expect(pointsChange(500, 500, 'win', 2)).toBe(30);
    expect(pointsChange(500, 500, 'win', 3)).toBe(35);
    expect(pointsChange(300, 700, 'win', 1)).toBeGreaterThan(pointsChange(700, 300, 'win', 1));
    expect(pointsChange(2000, 0, 'win', 1)).toBe(10);
  });

  it('never takes a player below zero', () => {
    expect(pointsChange(0, 0, 'loss', 1)).toBe(0);
    expect(pointsChange(8, 0, 'loss', 1)).toBe(-8);
    expect(pointsChange(5, 900, 'draw', 1)).toBeGreaterThan(0);
    expect(pointsChange(3, 0, 'draw', 1)).toBeGreaterThanOrEqual(-3);
  });

  it('turns totals into levels', () => {
    expect(levelFor(0)).toEqual({ level: 1, floor: 0, next: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toEqual({ level: 2, floor: 100, next: 300 });
    expect(levelFor(1000)).toEqual({ level: 5, floor: 1000, next: 1500 });
  });

  it('counts days in the market time zone', () => {
    expect(localDay(Date.UTC(2026, 9, 6, 21, 30), 'Europe/Istanbul')).toBe('2026-10-07');
    expect(localDay(Date.UTC(2026, 9, 6, 20, 30), 'Europe/Istanbul')).toBe('2026-10-06');
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(dailyGoals(1)).toBe(1);
    expect(dailyGoals(3)).toBe(2);
    expect(dailyGoals(7)).toBe(5);
    expect(dailyGoals(30)).toBe(5);
  });
});

describe('goals', () => {
  it('opens every wallet with the welcome gift and never pays the same reference twice', () => {
    const { player } = join();
    const wallet = createWallet(database, () => Date.now());
    expect(wallet.balance(player.id)).toBe(WELCOME_GOALS);
    expect(wallet.credit(player.id, 1, 'win', 'match-1')).toBe(WELCOME_GOALS + 1);
    expect(wallet.credit(player.id, 1, 'win', 'match-1')).toBe(WELCOME_GOALS + 1);
    expect(() => wallet.credit(player.id, -100, 'purchase', null)).toThrow();
    expect(wallet.statement(player.id)).toMatchObject({
      goals: WELCOME_GOALS + 1,
      entries: [
        { amount: 1, balance: WELCOME_GOALS + 1, reason: 'win' },
        { amount: WELCOME_GOALS, balance: WELCOME_GOALS, reason: 'welcome' },
      ],
    });
  });
});

describe('daily rewards', () => {
  it('pays goals once a day and more as the streak grows', () => {
    const { player } = join();
    expect(progress.claimDaily(player.id).reward).toEqual({ goals: 1, streak: 1 });
    expect(progress.claimDaily(player.id).reward).toBeNull();
    vi.setSystemTime(START + DAY);
    expect(progress.claimDaily(player.id).reward).toEqual({ goals: 2, streak: 2 });
    const { progress: current } = progress.claimDaily(player.id);
    expect(current).toMatchObject({ total: 0, goals: WELCOME_GOALS + 3 });
    expect(current.daily).toEqual({ streak: 2, bestStreak: 2, claimedToday: true, nextReward: 2 });
  });

  it('starts the streak again after a missed day', () => {
    const { player } = join();
    progress.claimDaily(player.id);
    vi.setSystemTime(START + DAY);
    progress.claimDaily(player.id);
    vi.setSystemTime(START + 3 * DAY);
    expect(progress.progress(player.id).daily).toMatchObject({ streak: 0, claimedToday: false, nextReward: 1 });
    expect(progress.claimDaily(player.id).reward).toEqual({ goals: 1, streak: 1 });
    expect(progress.progress(player.id).daily.bestStreak).toBe(2);
  });
});

describe('ranked matches', () => {
  it('moves points after a public match and stores the change', () => {
    const first = join();
    const second = join();
    givePoints(second, 100);
    queue(first, 2);
    queue(second, 2);
    win(first);

    const gain = first.of('finished')[0]?.points;
    expect(gain).toMatchObject({ game: 'grid', points: gain?.change, total: gain?.change, previousLevel: 1 });
    expect(gain).toMatchObject({ goalsEarned: 1, goals: WELCOME_GOALS + 1 });
    expect(gain?.change).toBeGreaterThan(30);
    expect(second.of('finished')[0]?.points).toMatchObject({ goalsEarned: 0, goals: WELCOME_GOALS });
    expect(second.of('finished')[0]?.points?.change).toBeLessThan(-20);
    expect(history.list(first.player.id)[0]).toMatchObject({
      kind: 'queue',
      outcome: 'win',
      pointsChange: gain?.change,
      goalsEarned: 1,
    });
    expect(progress.pointsOf(second.player.id, 'grid')).toBe(100 + (second.of('finished')[0]?.points?.change ?? 0));
  });

  it('reports a level up', () => {
    const first = join();
    const second = join();
    givePoints(first, 90);
    givePoints(second, 90);
    queue(first);
    queue(second);
    win(first);
    expect(first.of('finished')[0]?.points).toMatchObject({ points: 115, total: 115, level: 2, previousLevel: 1 });
  });

  it('counts a forfeit as a loss', () => {
    const first = join();
    const second = join();
    givePoints(first, 100);
    queue(first);
    queue(second);
    lobby.handle(first.player.id, { type: 'leave', matchId: matchIdOf(first) });
    expect(first.of('finished')[0]?.points?.change).toBeLessThan(0);
    expect(history.list(first.player.id)[0]).toMatchObject({ outcome: 'loss', reason: 'forfeit' });
  });

  it('ranks the hidden bot match and gives the bot points near the player', () => {
    const client = join();
    givePoints(client, 500);
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const seats = rooms[0]?.seats;
    const botSide = seats?.x.userId === null ? 'x' : 'o';
    expect(Math.abs((seats?.[botSide].points ?? 0) - 500)).toBeLessThanOrEqual(60);
    win(client);
    expect(client.of('finished')[0]?.points?.change).toBeGreaterThan(0);
  });

  it('leaves chosen bot matches and friend rooms unranked', () => {
    const client = join();
    lobby.handle(client.player.id, { type: 'play-bot', market: 'tr', difficulty: 1 });
    win(client);
    expect(client.of('finished')[0]?.points).toBeUndefined();
    expect(history.list(client.player.id)[0]).toMatchObject({ kind: 'bot', pointsChange: null, goalsEarned: 0 });

    const host = join();
    const guest = join();
    lobby.handle(host.player.id, { type: 'create-room', market: 'tr', difficulty: 1 });
    lobby.handle(guest.player.id, { type: 'join-room', code: host.of('room')[0]?.code ?? '' });
    win(host);
    expect(host.of('finished')[0]?.points).toBeUndefined();
    expect(progress.progress(host.player.id)).toMatchObject({ total: 0, goals: WELCOME_GOALS });
  });
});

describe('matchmaking by points', () => {
  it('pairs the closest player within reach', () => {
    const low = join();
    const high = join();
    const near = join();
    givePoints(high, 1000);
    givePoints(near, 80);
    queue(low);
    queue(high);
    expect(lobby.counts()).toMatchObject({ queued: 2, matches: 0 });
    queue(near);
    expect(lobby.counts()).toMatchObject({ queued: 1, matches: 1 });
    expect(matchIdOf(near)).toBe(matchIdOf(low));
    expect(high.of('opponent')).toHaveLength(0);
  });

  it('reaches further the longer a player waits', () => {
    lobby.shutdown();
    lobby = createTestLobby({ minimum: 60000, maximum: 60000 });
    const low = join();
    const high = join();
    givePoints(high, 1000);
    queue(low);
    vi.advanceTimersByTime(12000);
    queue(high);
    expect(lobby.counts()).toMatchObject({ queued: 0, matches: 1 });
  });
});

describe('progress', () => {
  it('sums every game, keeps goals apart and keeps a win record', () => {
    const first = join();
    const second = join();
    progress.claimDaily(first.player.id);
    for (let match = 0; match < 3; match += 1) {
      queue(first);
      queue(second);
      win(match === 1 ? second : first);
    }
    const current = progress.progress(first.player.id);
    const grid = current.games.find((standing) => standing.game === 'grid');
    expect(current.games).toHaveLength(9);
    expect(grid).toMatchObject({ played: 3, wins: 2, losses: 1, draws: 0 });
    expect(current.total).toBe(grid?.points);
    expect(current.goals).toBe(WELCOME_GOALS + 1 + 2);
    expect(current.record).toEqual({ played: 3, wins: 2, losses: 1, draws: 0, currentStreak: 1, bestStreak: 1 });
  });
});

describe('progress routes', () => {
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

  it('claims the daily reward, reports progress and pages through history', async () => {
    const app = buildApp({ database, config, now: () => Date.now() });
    const call = async <T>(method: 'GET' | 'POST', url: string, token?: string) => {
      const response = await app.inject({ method, url: `/v1${url}`, headers: token ? { authorization: `Bearer ${token}` } : {} });
      return { status: response.statusCode, body: response.json() as T };
    };
    const { token, account } = (await call<{ token: string; account: { id: string } }>('POST', '/auth/guest')).body;
    const insert = database.prepare(
      `INSERT INTO matches (id, kind, game, market, difficulty, grid_id, x_user_id, o_user_id, x_username, o_username,
         winner, reason, x_cells, o_cells, move_count, started_at, finished_at, x_points_change, o_points_change)
       VALUES (?, 'queue', ?, 'tr', 1, 0, ?, NULL, 'me', 'rival', 'x', 'score', 1, 0, 1, 0, ?, 25, NULL)`,
    );
    for (let index = 0; index < 5; index += 1) {
      insert.run(`match-${index}`, index % 2 === 0 ? 'duel' : 'grid', account.id, 1000 + index);
    }

    expect((await call('GET', '/progress')).status).toBe(401);
    const daily = await call<DailyRewardResponse>('POST', '/daily', token);
    expect(daily.body.reward).toEqual({ goals: 1, streak: 1 });
    const again = await call<DailyRewardResponse>('POST', '/daily', token);
    expect(again.body.reward).toBeNull();
    const current = await call<ProgressResponse>('GET', '/progress', token);
    expect(current.body.progress).toMatchObject({
      total: 0,
      goals: WELCOME_GOALS + 1,
      level: { level: 1 },
      record: { played: 5, wins: 5 },
    });
    const wallet = await call<WalletResponse>('GET', '/wallet', token);
    expect(wallet.body.entries.map((entry) => entry.reason)).toEqual(['daily', 'welcome']);

    const page = await call<MatchHistoryResponse>('GET', '/matches?game=duel&limit=2', token);
    expect(page.body.matches.map((match) => match.id)).toEqual(['match-4', 'match-2']);
    expect(page.body.more).toBe(true);
    expect(page.body.matches[0]).toMatchObject({ kind: 'queue', pointsChange: 25, goalsEarned: 0, outcome: 'win' });
    const next = await call<MatchHistoryResponse>('GET', '/matches?game=duel&limit=2&before=1002', token);
    expect(next.body).toEqual({ matches: [expect.objectContaining({ id: 'match-0' })], more: false });
    expect((await call('GET', '/matches?game=chess', token)).status).toBe(400);
    await app.close();
  });
});
