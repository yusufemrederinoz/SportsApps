import type { GameId } from '@sportapps/protocol';

import type { Database } from '../database';
import { DEFAULT_TIME_ZONE, localDay, shiftDay, startOfDay } from '../progress/points';

export interface LiveSnapshot {
  connected: number;
  queued: number;
  waitingRooms: number;
  matches: number;
  matchesByGame: Partial<Record<GameId, number>>;
}

export const NO_LIVE_PLAY: LiveSnapshot = { connected: 0, queued: 0, waitingRooms: 0, matches: 0, matchesByGame: {} };

export interface AdminStatsOptions {
  now?: () => number;
  timeZone?: string;
  live: () => LiveSnapshot;
  online: () => number;
  startedAt: number;
}

interface Breakdown {
  name: string;
  today: number;
  total: number;
}

export interface AdminStats {
  generatedAt: number;
  timeZone: string;
  live: LiveSnapshot & { online: number };
  users: {
    total: number;
    members: number;
    guests: number;
    email: number;
    google: number;
    apple: number;
    newToday: number;
    newWeek: number;
  };
  active: { today: number; week: number; month: number };
  matches: { total: number; today: number; week: number; hiddenBotToday: number; games: Breakdown[]; kinds: Breakdown[] };
  goals: { inWallets: number; movements: { reason: string; amount: number; count: number }[] };
  purchases: {
    total: number;
    today: number;
    goals: number;
    listValue: number;
    products: { productId: string; platform: string; count: number; goals: number }[];
  };
  ads: { total: number; today: number };
  puzzle: { startedToday: number; finishedToday: number };
  devices: { tokens: number; users: number };
  days: { day: string; newUsers: number; dailyRewards: number; matches: number; purchases: number; ads: number }[];
  server: { startedAt: number; memoryMegabytes: number };
}

const DAY = 24 * 60 * 60 * 1000;
const SERIES_DAYS = 14;
const CACHE_LIFETIME = 3000;
const MEGABYTE = 1024 * 1024;
const LIST_PRICES: Readonly<Record<string, number>> = {
  goals_cg_30: 39.99,
  goals_cg_100: 99.99,
  goals_cg_250: 199.99,
  goals_cg_600: 399.99,
};

export function createAdminStats(database: Database, options: AdminStatsOptions) {
  const now = options.now ?? Date.now;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  let cached: { at: number; stats: AdminStats } | null = null;

  const count = (sql: string, ...parameters: (string | number)[]): number =>
    (database.prepare(sql).get(...parameters) as { value: number | null } | undefined)?.value ?? 0;
  const rows = <T>(sql: string, ...parameters: (string | number)[]): T[] =>
    database.prepare(sql).all(...parameters) as unknown as T[];
  const breakdown = (column: 'game' | 'kind', since: number): Breakdown[] =>
    rows<Breakdown>(
      `SELECT ${column} AS name, COUNT(*) AS total, COALESCE(SUM(finished_at >= ?), 0) AS today
       FROM matches GROUP BY ${column} ORDER BY total DESC`,
      since,
    );

  const collect = (): AdminStats => {
    const time = now();
    const today = localDay(time, timeZone);
    const todayStart = startOfDay(today, timeZone);
    const total = count('SELECT COUNT(*) AS value FROM users');
    const guests = count('SELECT COUNT(*) AS value FROM users WHERE is_guest = 1');
    const identities = (provider: string) =>
      count('SELECT COUNT(DISTINCT user_id) AS value FROM identities WHERE provider = ?', provider);
    const activeSince = (since: number) =>
      count('SELECT COUNT(DISTINCT user_id) AS value FROM sessions WHERE last_used_at >= ?', since);
    const products = rows<{ productId: string; platform: string; count: number; goals: number }>(
      `SELECT product_id AS productId, platform, COUNT(*) AS count, SUM(goals) AS goals
       FROM purchases GROUP BY product_id, platform ORDER BY count DESC`,
    );

    const days = Array.from({ length: SERIES_DAYS }, (_, index) => {
      const day = shiftDay(today, index - SERIES_DAYS + 1);
      const start = startOfDay(day, timeZone);
      const end = startOfDay(shiftDay(day, 1), timeZone);
      return {
        day,
        newUsers: count('SELECT COUNT(*) AS value FROM users WHERE created_at >= ? AND created_at < ?', start, end),
        dailyRewards: count("SELECT COUNT(*) AS value FROM goal_ledger WHERE reason = 'daily' AND reference = ?", day),
        matches: count('SELECT COUNT(*) AS value FROM matches WHERE finished_at >= ? AND finished_at < ?', start, end),
        purchases: count('SELECT COUNT(*) AS value FROM purchases WHERE created_at >= ? AND created_at < ?', start, end),
        ads: count('SELECT COUNT(*) AS value FROM ad_rewards WHERE day = ?', day),
      };
    });

    return {
      generatedAt: time,
      timeZone,
      live: { ...options.live(), online: options.online() },
      users: {
        total,
        members: total - guests,
        guests,
        email: count('SELECT COUNT(*) AS value FROM credentials'),
        google: identities('google'),
        apple: identities('apple'),
        newToday: count('SELECT COUNT(*) AS value FROM users WHERE created_at >= ?', todayStart),
        newWeek: count('SELECT COUNT(*) AS value FROM users WHERE created_at >= ?', time - 7 * DAY),
      },
      active: { today: activeSince(todayStart), week: activeSince(time - 7 * DAY), month: activeSince(time - 30 * DAY) },
      matches: {
        total: count('SELECT COUNT(*) AS value FROM matches'),
        today: count('SELECT COUNT(*) AS value FROM matches WHERE finished_at >= ?', todayStart),
        week: count('SELECT COUNT(*) AS value FROM matches WHERE finished_at >= ?', time - 7 * DAY),
        hiddenBotToday: count(
          "SELECT COUNT(*) AS value FROM matches WHERE kind = 'queue' AND bot_level IS NOT NULL AND finished_at >= ?",
          todayStart,
        ),
        games: breakdown('game', todayStart),
        kinds: breakdown('kind', todayStart),
      },
      goals: {
        inWallets: count('SELECT COALESCE(SUM(goals), 0) AS value FROM wallets'),
        movements: rows<{ reason: string; amount: number; count: number }>(
          'SELECT reason, SUM(amount) AS amount, COUNT(*) AS count FROM goal_ledger GROUP BY reason ORDER BY reason',
        ),
      },
      purchases: {
        total: products.reduce((sum, product) => sum + product.count, 0),
        today: count('SELECT COUNT(*) AS value FROM purchases WHERE created_at >= ?', todayStart),
        goals: products.reduce((sum, product) => sum + product.goals, 0),
        listValue: products.reduce((sum, product) => sum + product.count * (LIST_PRICES[product.productId] ?? 0), 0),
        products,
      },
      ads: {
        total: count('SELECT COUNT(*) AS value FROM ad_rewards'),
        today: count('SELECT COUNT(*) AS value FROM ad_rewards WHERE day = ?', today),
      },
      puzzle: {
        startedToday: count('SELECT COUNT(*) AS value FROM puzzle_plays WHERE day = ?', today),
        finishedToday: count('SELECT COUNT(*) AS value FROM puzzle_plays WHERE day = ? AND finished_at IS NOT NULL', today),
      },
      devices: {
        tokens: count('SELECT COUNT(*) AS value FROM push_tokens'),
        users: count('SELECT COUNT(DISTINCT user_id) AS value FROM push_tokens'),
      },
      days,
      server: { startedAt: options.startedAt, memoryMegabytes: Math.round(process.memoryUsage().rss / MEGABYTE) },
    };
  };

  return {
    read(): AdminStats {
      const time = now();
      if (!cached || time - cached.at >= CACHE_LIFETIME) {
        cached = { at: time, stats: collect() };
      }
      return cached.stats;
    },
  };
}
