import { isValidUsername } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { createAdminStats } from '../src/admin/stats';
import { openDatabase, type Database } from '../src/database';
import { PLAYERS_PER_BOT, ROSTER_MINIMUM, ROSTER_SIZE, createBotRoster, type BotRoster } from '../src/play/roster';
import { createLeaderboard } from '../src/progress/leaderboard';
import { createProgress } from '../src/progress/store';

const NOW = Date.UTC(2026, 9, 7, 9);

let database: Database;
let roster: BotRoster;
let seed: number;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function human(): string {
  return createAccountService(database, { sessionDays: 90 }).createGuest().account.id;
}

function setPoints(userId: string, points: number, game = 'grid') {
  database
    .prepare('INSERT INTO ratings (user_id, game, points, best_points, matches, updated_at) VALUES (?, ?, ?, ?, 1, 0)')
    .run(userId, game, points, points);
}

function played(id: string, x: string, o: string) {
  database
    .prepare(
      `INSERT INTO matches (id, kind, game, market, difficulty, grid_id, x_user_id, o_user_id, x_username, o_username,
         winner, reason, x_cells, o_cells, move_count, started_at, finished_at)
       VALUES (?, 'queue', 'grid', 'tr', 1, 0, ?, ?, 'x', 'o', 'x', 'line', 3, 0, 3, 0, ?)`,
    )
    .run(id, x, o, NOW);
}

const botRows = (market: string) =>
  database
    .prepare('SELECT b.user_id AS id, u.username AS username FROM bots b JOIN users u ON u.id = b.user_id WHERE b.market = ?')
    .all(market) as unknown as { id: string; username: string }[];

beforeEach(() => {
  seed = 5;
  database = openDatabase(':memory:');
  roster = createBotRoster(database, { now: () => NOW, random });
});

afterEach(() => {
  database.close();
});

describe('bot roster', () => {
  it('fills a market once with bots that carry valid, distinct usernames', () => {
    const player = human();
    const first = roster.pick('tr', player, new Set());
    const names = botRows('tr').map((row) => row.username);

    expect(first).not.toBeNull();
    expect(names).toHaveLength(ROSTER_SIZE);
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(ROSTER_SIZE);
    expect(names.every((name) => isValidUsername(name))).toBe(true);

    roster.pick('tr', player, new Set());
    expect(botRows('tr')).toHaveLength(ROSTER_SIZE);
    expect(botRows('de')).toHaveLength(0);
    roster.pick('de', player, new Set());
    expect(botRows('de')).toHaveLength(ROSTER_SIZE);
  });

  it('keeps bot usernames out of reach for new accounts', () => {
    roster.pick('tr', human(), new Set());
    const [bot] = botRows('tr');
    const accounts = createAccountService(database, { sessionDays: 90 });
    expect(accounts.isUsernameTaken(bot?.username ?? '')).toBe(true);
  });

  it('never hands out a bot that is in a match, and avoids the ones the player just met', () => {
    const player = human();
    roster.pick('tr', player, new Set());
    const all = botRows('tr').map((row) => row.id);
    const busy = new Set(all.slice(1));
    expect(roster.pick('tr', player, busy)?.id).toBe(all[0]);
    expect(roster.pick('tr', player, new Set(all))).toBeNull();

    const met = all.slice(0, 8);
    met.forEach((botId, index) => played(`match-${index}`, player, botId));
    for (let attempt = 0; attempt < 40; attempt += 1) {
      expect(met).not.toContain(roster.pick('tr', player, new Set())?.id);
    }
    const onlyMet = new Set(all.filter((botId) => !met.includes(botId)));
    expect(met).toContain(roster.pick('tr', player, onlyMet)?.id);
  });

  it('shrinks as real players collect points and never drops below the minimum', () => {
    expect(roster.activeSize()).toBe(ROSTER_SIZE);
    for (let index = 0; index < PLAYERS_PER_BOT * 3; index += 1) {
      setPoints(human(), 10);
    }
    expect(roster.activeSize()).toBe(ROSTER_SIZE - 3);

    const player = human();
    roster.pick('tr', player, new Set());
    const retired = new Set(botRows('tr').map((row) => row.id).slice(ROSTER_SIZE - 3));
    for (let attempt = 0; attempt < 60; attempt += 1) {
      expect(retired.has(roster.pick('tr', player, new Set())?.id ?? '')).toBe(false);
    }

    botRows('tr').forEach((row) => setPoints(row.id, 50));
    expect(roster.activeSize()).toBe(ROSTER_SIZE - 3);
    for (let index = 0; index < PLAYERS_PER_BOT * ROSTER_SIZE; index += 1) {
      setPoints(human(), 10);
    }
    expect(roster.activeSize()).toBe(ROSTER_MINIMUM);
  });
});

describe('bots in the books', () => {
  it('moves points for a listed bot like for a player but pays it no goals', () => {
    const player = human();
    const bot = roster.pick('tr', player, new Set());
    const progress = createProgress(database, { now: () => NOW });
    const seats = { x: { userId: player, rating: 1000 }, o: { userId: null, botId: bot?.id, rating: 1000 } };

    const changes = progress.settle({ id: 'match-1', game: 'grid', difficulty: 1, seats }, { winner: 'o', reason: 'line' });

    expect(changes.x).toMatchObject({ change: 0, goalsEarned: 0 });
    expect(changes.o?.change).toBeGreaterThan(0);
    expect(changes.o).toMatchObject({ goalsEarned: 0, goals: 0 });
    expect(progress.pointsOf(bot?.id ?? '', 'grid')).toBe(changes.o?.points);
    expect(database.prepare('SELECT COUNT(*) AS value FROM goal_ledger WHERE user_id = ?').get(bot?.id ?? '')).toEqual({ value: 0 });
  });

  it('leaves bots out of the user counts on the admin panel', () => {
    const player = human();
    roster.pick('tr', player, new Set());
    const stats = createAdminStats(database, {
      now: () => NOW,
      live: () => ({ connected: 0, queued: 0, waitingRooms: 0, matches: 0, matchesByGame: {} }),
      online: () => 0,
      broadcasts: { audience: () => [], recent: () => [] },
      startedAt: NOW,
    });
    expect(stats.read().users).toMatchObject({ total: 1, guests: 1, newToday: 1 });
  });
});

describe('bots on the leaderboard', () => {
  const board = () => createLeaderboard(database, { now: () => NOW });
  const listedBots = (count: number) => {
    roster.pick('tr', human(), new Set());
    return botRows('tr').slice(0, count);
  };

  it('keeps the first three places for players and ranks bots below them', () => {
    const players = [human(), human(), human(), human()];
    [100, 80, 60, 10].forEach((points, index) => setPoints(players[index] as string, points));
    const [strong, middle, weak] = listedBots(3);
    setPoints(strong?.id ?? '', 500);
    setPoints(middle?.id ?? '', 70);
    setPoints(weak?.id ?? '', 5);

    const { entries, you } = board().board(players[3] as string, 'all', null);

    expect(entries.map((entry) => [entry.rank, entry.points])).toEqual([
      [1, 100],
      [2, 80],
      [3, 60],
      [4, 59],
      [4, 59],
      [6, 10],
      [7, 5],
    ]);
    expect(entries.slice(3, 5).map((entry) => entry.username).sort()).toEqual([strong?.username, middle?.username].sort());
    expect(you).toMatchObject({ rank: 6, points: 10 });
  });

  it('puts every bot below the players while fewer than three have points', () => {
    const player = human();
    setPoints(player, 10);
    const [bot] = listedBots(1);
    setPoints(bot?.id ?? '', 500);
    expect(board().board(player, 'all', null).entries.map((entry) => entry.points)).toEqual([10, 9]);
  });

  it('shows a bot with its own points when no player has any yet', () => {
    const player = human();
    setPoints(player, 0);
    const [bot] = listedBots(1);
    setPoints(bot?.id ?? '', 18);
    const { entries } = board().board(player, 'all', null);
    expect(entries.map((entry) => [entry.username, entry.points])).toEqual([
      [bot?.username, 18],
      [expect.any(String), 0],
    ]);
  });
});
