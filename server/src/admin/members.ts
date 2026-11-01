import { levelFor } from '@sportapps/protocol';

import type { Database } from '../database';
import { DEFAULT_TIME_ZONE, localDay, previousDay } from '../progress/points';
import { LIST_PRICES } from './stats';

export type SignInMethod = 'email' | 'google' | 'apple';
export type OpponentType = 'person' | 'bot' | 'hidden-bot';

export interface MemberSummary {
  id: string;
  username: string;
  guest: boolean;
  test: boolean;
  methods: SignInMethod[];
  email: string | null;
  createdAt: number;
  lastSeenAt: number | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  quits: number;
  matchesWeek: number;
  playedDays: number;
  favoriteGame: string | null;
  lastMatchAt: number | null;
  points: number;
  level: number;
  goals: number;
  purchases: number;
  listValue: number;
  ads: number;
  streak: number;
  platform: string | null;
  language: string | null;
}

export interface MemberGame {
  game: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  quits: number;
  againstPeople: number;
  againstBots: number;
  points: number;
  bestPoints: number;
  rating: number | null;
  lastPlayedAt: number;
}

export interface MemberMatch {
  id: string;
  game: string;
  kind: string;
  difficulty: number;
  opponent: string;
  opponentType: OpponentType;
  outcome: 'win' | 'loss' | 'draw';
  reason: string;
  seconds: number;
  pointsChange: number | null;
  finishedAt: number;
}

export interface MemberDetail {
  summary: MemberSummary;
  usernamePending: boolean;
  signIns: { method: SignInMethod; email: string | null; createdAt: number }[];
  sessions: { active: number; firstAt: number | null; lastAt: number | null };
  devices: { platform: string; language: string; updatedAt: number }[];
  firstMatchAt: number | null;
  daily: { streak: number; bestStreak: number; lastDay: string } | null;
  games: MemberGame[];
  recent: MemberMatch[];
  puzzles: { day: string; market: string; guessesLeft: number; finished: boolean; rewardGoals: number | null }[];
  movements: { amount: number; balance: number; reason: string; createdAt: number }[];
  movementTotals: { reason: string; amount: number; count: number }[];
  purchases: { platform: string; productId: string; goals: number; createdAt: number }[];
  adRewards: { kind: string; count: number; lastAt: number }[];
}

export interface MembersOptions {
  now?: () => number;
  timeZone?: string;
}

interface SummaryRow {
  id: string;
  username: string;
  is_guest: number;
  created_at: number;
  test: number;
  credential_email: string | null;
  providers: string | null;
  identity_email: string | null;
  last_seen_at: number | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  quits: number;
  matches_week: number;
  last_match_at: number | null;
  favorite_game: string | null;
  points: number;
  goals: number;
  ads: number;
  streak: number;
  last_day: string | null;
  platform: string | null;
  language: string | null;
}

interface MatchRow {
  id: string;
  kind: string;
  game: string;
  difficulty: number;
  x_user_id: string | null;
  o_user_id: string | null;
  x_username: string;
  o_username: string;
  winner: string | null;
  reason: string;
  started_at: number;
  finished_at: number;
  x_points_change: number | null;
  o_points_change: number | null;
}

const DAY = 24 * 60 * 60 * 1000;
const RECENT_MATCHES = 20;
const RECENT_MOVEMENTS = 20;
const RECENT_PUZZLES = 14;
const METHOD_ORDER: readonly SignInMethod[] = ['email', 'google', 'apple'];
const PLAYED = `
  played AS (
    SELECT x_user_id AS user_id, game, reason, finished_at,
           CASE WHEN winner IS NULL THEN 'draw' WHEN winner = 'x' THEN 'win' ELSE 'loss' END AS outcome
    FROM matches WHERE x_user_id IS NOT NULL
    UNION ALL
    SELECT o_user_id AS user_id, game, reason, finished_at,
           CASE WHEN winner IS NULL THEN 'draw' WHEN winner = 'o' THEN 'win' ELSE 'loss' END AS outcome
    FROM matches WHERE o_user_id IS NOT NULL
  )`;
const SUMMARY_SQL = `
  WITH ${PLAYED},
  tally AS (
    SELECT user_id, COUNT(*) AS matches, SUM(outcome = 'win') AS wins, SUM(outcome = 'loss') AS losses,
           SUM(outcome = 'draw') AS draws, SUM(outcome = 'loss' AND reason = 'forfeit') AS quits,
           SUM(finished_at >= ?) AS matches_week, MAX(finished_at) AS last_match_at
    FROM played GROUP BY user_id
  ),
  favorite AS (
    SELECT user_id, game FROM (
      SELECT user_id, game,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC, MAX(finished_at) DESC) AS place
      FROM played GROUP BY user_id, game
    ) WHERE place = 1
  )
  SELECT u.id, u.username, u.is_guest, u.created_at,
         EXISTS (SELECT 1 FROM test_accounts ta WHERE ta.user_id = u.id) AS test,
         (SELECT c.email FROM credentials c WHERE c.user_id = u.id) AS credential_email,
         (SELECT group_concat(i.provider) FROM identities i WHERE i.user_id = u.id) AS providers,
         (SELECT i.email FROM identities i WHERE i.user_id = u.id AND i.email IS NOT NULL ORDER BY i.created_at LIMIT 1) AS identity_email,
         (SELECT MAX(s.last_used_at) FROM sessions s WHERE s.user_id = u.id) AS last_seen_at,
         COALESCE(t.matches, 0) AS matches, COALESCE(t.wins, 0) AS wins, COALESCE(t.losses, 0) AS losses,
         COALESCE(t.draws, 0) AS draws, COALESCE(t.quits, 0) AS quits, COALESCE(t.matches_week, 0) AS matches_week,
         t.last_match_at, f.game AS favorite_game,
         COALESCE((SELECT SUM(r.points) FROM ratings r WHERE r.user_id = u.id), 0) AS points,
         COALESCE((SELECT w.goals FROM wallets w WHERE w.user_id = u.id), 0) AS goals,
         (SELECT COUNT(*) FROM ad_rewards a WHERE a.user_id = u.id) AS ads,
         COALESCE(d.streak, 0) AS streak, d.last_day,
         (SELECT p.platform FROM push_tokens p WHERE p.user_id = u.id ORDER BY p.updated_at DESC LIMIT 1) AS platform,
         (SELECT p.language FROM push_tokens p WHERE p.user_id = u.id ORDER BY p.updated_at DESC LIMIT 1) AS language
  FROM users u
  LEFT JOIN tally t ON t.user_id = u.id
  LEFT JOIN favorite f ON f.user_id = u.id
  LEFT JOIN daily_rewards d ON d.user_id = u.id
  WHERE u.id NOT IN (SELECT user_id FROM bots) AND (? IS NULL OR u.id = ?)
  ORDER BY COALESCE(last_seen_at, u.created_at) DESC`;

export class MemberNotFoundError extends Error {}

export function createMembers(database: Database, options: MembersOptions = {}) {
  const now = options.now ?? Date.now;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;

  const rows = <T>(sql: string, ...parameters: (string | number | null)[]): T[] =>
    database.prepare(sql).all(...parameters) as unknown as T[];

  const fallbackPlatforms = (userId: string | null) =>
    new Map(
      rows<{ user_id: string; platform: string }>(
        `SELECT user_id, platform, MAX(created_at) AS latest FROM purchases
         WHERE user_id IS NOT NULL AND (? IS NULL OR user_id = ?) GROUP BY user_id`,
        userId,
        userId,
      ).map((row) => [row.user_id, row.platform]),
    );

  const summaries = (userId: string | null = null): MemberSummary[] => {
    const time = now();
    const today = localDay(time, timeZone);
    const yesterday = previousDay(today);
    const days = new Map<string, Set<string>>();
    for (const row of rows<{ user_id: string; finished_at: number }>(
      `WITH ${PLAYED} SELECT user_id, finished_at FROM played WHERE ? IS NULL OR user_id = ?`,
      userId,
      userId,
    )) {
      const seen = days.get(row.user_id) ?? new Set<string>();
      seen.add(localDay(row.finished_at, timeZone));
      days.set(row.user_id, seen);
    }
    const spending = new Map<string, { count: number; value: number }>();
    for (const row of rows<{ user_id: string; product_id: string; count: number }>(
      `SELECT user_id, product_id, COUNT(*) AS count FROM purchases
       WHERE user_id IS NOT NULL AND (? IS NULL OR user_id = ?) GROUP BY user_id, product_id`,
      userId,
      userId,
    )) {
      const current = spending.get(row.user_id) ?? { count: 0, value: 0 };
      current.count += row.count;
      current.value += (LIST_PRICES[row.product_id] ?? 0) * row.count;
      spending.set(row.user_id, current);
    }
    const purchasePlatforms = fallbackPlatforms(userId);

    return rows<SummaryRow>(SUMMARY_SQL, time - 7 * DAY, userId, userId).map((row) => {
      const providers = new Set((row.providers ?? '').split(',').filter(Boolean));
      const methods = METHOD_ORDER.filter((method) => (method === 'email' ? row.credential_email !== null : providers.has(method)));
      const spent = spending.get(row.id);
      return {
        id: row.id,
        username: row.username,
        guest: row.is_guest === 1,
        test: row.test === 1,
        methods,
        email: row.credential_email ?? row.identity_email,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        matches: row.matches,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        quits: row.quits,
        matchesWeek: row.matches_week,
        playedDays: days.get(row.id)?.size ?? 0,
        favoriteGame: row.favorite_game,
        lastMatchAt: row.last_match_at,
        points: row.points,
        level: levelFor(row.points).level,
        goals: row.goals,
        purchases: spent?.count ?? 0,
        listValue: Math.round((spent?.value ?? 0) * 100) / 100,
        ads: row.ads,
        streak: row.last_day === today || row.last_day === yesterday ? row.streak : 0,
        platform: row.platform ?? purchasePlatforms.get(row.id) ?? null,
        language: row.language,
      };
    });
  };

  const opponentType = (row: MatchRow, opponentId: string | null, bots: Set<string>): OpponentType => {
    if (opponentId === null || !bots.has(opponentId)) {
      return 'person';
    }
    return row.kind === 'bot' ? 'bot' : 'hidden-bot';
  };

  const detail = (userId: string): MemberDetail => {
    const [summary] = summaries(userId);
    if (!summary) {
      throw new MemberNotFoundError(userId);
    }
    const time = now();
    const bots = new Set(rows<{ user_id: string }>('SELECT user_id FROM bots').map((row) => row.user_id));
    const matches = rows<MatchRow>(
      `SELECT id, kind, game, difficulty, x_user_id, o_user_id, x_username, o_username, winner, reason,
              started_at, finished_at, x_points_change, o_points_change
       FROM matches WHERE x_user_id = ? OR o_user_id = ? ORDER BY finished_at DESC, rowid DESC`,
      userId,
      userId,
    );
    const ratings = new Map(
      rows<{ game: string; points: number; best_points: number; rating: number }>(
        'SELECT game, points, best_points, rating FROM ratings WHERE user_id = ?',
        userId,
      ).map((row) => [row.game, row]),
    );

    const games = new Map<string, MemberGame>();
    const recent: MemberMatch[] = [];
    for (const row of matches) {
      const own = row.x_user_id === userId ? 'x' : 'o';
      const opponentId = own === 'x' ? row.o_user_id : row.x_user_id;
      const outcome = row.winner === null ? 'draw' : row.winner === own ? 'win' : 'loss';
      const type = opponentType(row, opponentId, bots);
      const rating = ratings.get(row.game);
      const game = games.get(row.game) ?? {
        game: row.game,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        quits: 0,
        againstPeople: 0,
        againstBots: 0,
        points: rating?.points ?? 0,
        bestPoints: rating?.best_points ?? 0,
        rating: rating?.rating ?? null,
        lastPlayedAt: row.finished_at,
      };
      game.matches += 1;
      game[outcome === 'win' ? 'wins' : outcome === 'loss' ? 'losses' : 'draws'] += 1;
      game.quits += outcome === 'loss' && row.reason === 'forfeit' ? 1 : 0;
      game[type === 'person' ? 'againstPeople' : 'againstBots'] += 1;
      games.set(row.game, game);
      if (recent.length < RECENT_MATCHES) {
        recent.push({
          id: row.id,
          game: row.game,
          kind: row.kind,
          difficulty: row.difficulty,
          opponent: own === 'x' ? row.o_username : row.x_username,
          opponentType: type,
          outcome,
          reason: row.reason,
          seconds: Math.max(0, Math.round((row.finished_at - row.started_at) / 1000)),
          pointsChange: own === 'x' ? row.x_points_change : row.o_points_change,
          finishedAt: row.finished_at,
        });
      }
    }

    const user = database.prepare('SELECT username_pending FROM users WHERE id = ?').get(userId) as { username_pending: number };
    const credential = database.prepare('SELECT email, created_at FROM credentials WHERE user_id = ?').get(userId) as
      | { email: string; created_at: number }
      | undefined;
    const identities = rows<{ provider: SignInMethod; email: string | null; created_at: number }>(
      'SELECT provider, email, created_at FROM identities WHERE user_id = ? ORDER BY created_at',
      userId,
    );
    const sessions = database
      .prepare(
        `SELECT COUNT(*) AS active, MIN(created_at) AS first_at, MAX(last_used_at) AS last_at
         FROM sessions WHERE user_id = ? AND expires_at > ?`,
      )
      .get(userId, time) as { active: number; first_at: number | null; last_at: number | null };
    const daily = database.prepare('SELECT streak, best_streak, last_day FROM daily_rewards WHERE user_id = ?').get(userId) as
      | { streak: number; best_streak: number; last_day: string }
      | undefined;

    return {
      summary,
      usernamePending: user.username_pending === 1,
      signIns: [
        ...(credential ? [{ method: 'email' as const, email: credential.email, createdAt: credential.created_at }] : []),
        ...identities.map((identity) => ({ method: identity.provider, email: identity.email, createdAt: identity.created_at })),
      ],
      sessions: { active: sessions.active, firstAt: sessions.first_at, lastAt: sessions.last_at },
      devices: rows<{ platform: string; language: string; updatedAt: number }>(
        'SELECT platform, language, updated_at AS updatedAt FROM push_tokens WHERE user_id = ? ORDER BY updated_at DESC',
        userId,
      ),
      firstMatchAt: matches.at(-1)?.finished_at ?? null,
      daily: daily ? { streak: daily.streak, bestStreak: daily.best_streak, lastDay: daily.last_day } : null,
      games: [...games.values()].sort((first, second) => second.matches - first.matches),
      recent,
      puzzles: rows<{ day: string; market: string; guesses_left: number; finished_at: number | null; reward_goals: number | null }>(
        `SELECT day, market, guesses_left, finished_at, reward_goals FROM puzzle_plays
         WHERE user_id = ? ORDER BY day DESC LIMIT ?`,
        userId,
        RECENT_PUZZLES,
      ).map((row) => ({
        day: row.day,
        market: row.market,
        guessesLeft: row.guesses_left,
        finished: row.finished_at !== null,
        rewardGoals: row.reward_goals,
      })),
      movements: rows<{ amount: number; balance: number; reason: string; createdAt: number }>(
        `SELECT amount, balance, reason, created_at AS createdAt FROM goal_ledger
         WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
        userId,
        RECENT_MOVEMENTS,
      ),
      movementTotals: rows<{ reason: string; amount: number; count: number }>(
        `SELECT reason, SUM(amount) AS amount, COUNT(*) AS count FROM goal_ledger
         WHERE user_id = ? GROUP BY reason ORDER BY count DESC`,
        userId,
      ),
      purchases: rows<{ platform: string; productId: string; goals: number; createdAt: number }>(
        `SELECT platform, product_id AS productId, goals, created_at AS createdAt FROM purchases
         WHERE user_id = ? ORDER BY created_at DESC`,
        userId,
      ),
      adRewards: rows<{ kind: string; count: number; lastAt: number }>(
        `SELECT kind, COUNT(*) AS count, MAX(created_at) AS lastAt FROM ad_rewards
         WHERE user_id = ? GROUP BY kind ORDER BY count DESC`,
        userId,
      ),
    };
  };

  const markTest = (userId: string, test: boolean): boolean => {
    const exists = database.prepare('SELECT 1 AS found FROM users WHERE id = ? AND id NOT IN (SELECT user_id FROM bots)').get(userId);
    if (!exists) {
      throw new MemberNotFoundError(userId);
    }
    if (test) {
      database.prepare('INSERT OR IGNORE INTO test_accounts (user_id, created_at) VALUES (?, ?)').run(userId, now());
    } else {
      database.prepare('DELETE FROM test_accounts WHERE user_id = ?').run(userId);
    }
    return test;
  };

  return { list: () => summaries(), detail, markTest };
}
