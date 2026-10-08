import { opponentOf, type Side } from '@sportapps/game-core';
import {
  ACTIVE_GAME_IDS,
  WELCOME_GOALS,
  WIN_GOALS,
  dailyGoals,
  levelFor,
  type DailyRewardResponse,
  type DailyStatus,
  type GameId,
  type GameStanding,
  type GoalReason,
  type MatchOutcome,
  type PlayDifficulty,
  type PlayerProgress,
  type PlayRecord,
  type PlayResult,
  type PointsChange,
  type WalletResponse,
} from '@sportapps/protocol';

import { transaction, type Database } from '../database';
import { DEFAULT_TIME_ZONE, START_RATING, keepLevel, localDay, pointsChange, previousDay, ratingChange } from './points';
import { createWallet } from './wallet';

export interface RankedSeat {
  userId: string | null;
  rating: number;
}

export interface RankedMatch {
  id: string;
  game: GameId;
  difficulty: PlayDifficulty;
  seats: Record<Side, RankedSeat>;
}

export interface ProgressOptions {
  now?: () => number;
  timeZone?: string;
}

interface DailyRow {
  streak: number;
  best_streak: number;
  last_day: string;
}

interface RatingRow {
  game: string;
  points: number;
  best_points: number;
}

interface TotalsRow {
  game: string;
  played: number;
  wins: number;
  draws: number;
}

interface ResultRow {
  winner: string | null;
  x_user_id: string | null;
}

const POINT_PROTECTION_WINDOW = 15 * 60 * 1000;

interface MatchSidesRow {
  game: GameId;
  x_user_id: string | null;
  o_user_id: string | null;
  x_points_change: number | null;
  o_points_change: number | null;
  finished_at: number;
}

export function outcomeFor(side: Side, winner: string | null): MatchOutcome {
  if (winner === null) {
    return 'draw';
  }
  return winner === side ? 'win' : 'loss';
}

export function createProgress(database: Database, options: ProgressOptions = {}) {
  const now = options.now ?? Date.now;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const wallet = createWallet(database, now);

  const selectStanding = database.prepare('SELECT points, rating FROM ratings WHERE user_id = ? AND game = ?');
  const selectRatings = database.prepare('SELECT game, points, best_points FROM ratings WHERE user_id = ?');
  const upsertStanding = database.prepare(
    `INSERT INTO ratings (user_id, game, points, best_points, rating, matches, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT (user_id, game) DO UPDATE SET
       points = excluded.points,
       best_points = MAX(best_points, excluded.points),
       rating = excluded.rating,
       matches = matches + 1,
       updated_at = excluded.updated_at`,
  );
  const selectDaily = database.prepare('SELECT streak, best_streak, last_day FROM daily_rewards WHERE user_id = ?');
  const upsertDaily = database.prepare(
    `INSERT INTO daily_rewards (user_id, streak, best_streak, last_day, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       streak = excluded.streak,
       best_streak = excluded.best_streak,
       last_day = excluded.last_day,
       updated_at = excluded.updated_at`,
  );
  const selectTotals = database.prepare(
    `SELECT game, COUNT(*) AS played,
       SUM(CASE WHEN winner IS NULL THEN 1 ELSE 0 END) AS draws,
       SUM(CASE WHEN (winner = 'x' AND x_user_id = ?) OR (winner = 'o' AND o_user_id = ?) THEN 1 ELSE 0 END) AS wins
     FROM matches WHERE x_user_id = ? OR o_user_id = ? GROUP BY game`,
  );
  const selectResults = database.prepare(
    'SELECT winner, x_user_id FROM matches WHERE x_user_id = ? OR o_user_id = ? ORDER BY finished_at, rowid',
  );

  const selectMatchSides = database.prepare(
    'SELECT game, x_user_id, o_user_id, x_points_change, o_points_change, finished_at FROM matches WHERE id = ?',
  );
  const clearPointsChange = {
    x: database.prepare('UPDATE matches SET x_points_change = 0 WHERE id = ?'),
    o: database.prepare('UPDATE matches SET o_points_change = 0 WHERE id = ?'),
  };
  const restorePoints = database.prepare(
    `UPDATE ratings SET points = points + ?, best_points = MAX(best_points, points + ?), updated_at = ?
     WHERE user_id = ? AND game = ?`,
  );
  const insertProtection = database.prepare(
    'INSERT INTO point_protections (match_id, user_id, game, points, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const selectProtection = database.prepare('SELECT points FROM point_protections WHERE match_id = ? AND user_id = ?');

  const standingOf = (userId: string, game: GameId) =>
    selectStanding.get(userId, game) as { points: number; rating: number } | undefined;
  const pointsOf = (userId: string, game: GameId): number => standingOf(userId, game)?.points ?? 0;
  const ratingOf = (userId: string, game: GameId): number => standingOf(userId, game)?.rating ?? START_RATING;

  const ratingsOf = (userId: string) => selectRatings.all(userId) as unknown as RatingRow[];
  const dailyOf = (userId: string) => selectDaily.get(userId) as DailyRow | undefined;
  const totalOf = (userId: string): number => ratingsOf(userId).reduce((sum, row) => sum + row.points, 0);

  const dailyStatus = (userId: string): DailyStatus => {
    const today = localDay(now(), timeZone);
    const row = dailyOf(userId);
    const alive = row !== undefined && (row.last_day === today || row.last_day === previousDay(today));
    const streak = alive ? row.streak : 0;
    return {
      streak,
      bestStreak: row?.best_streak ?? 0,
      claimedToday: row?.last_day === today,
      nextReward: dailyGoals(streak + 1),
    };
  };

  const recordOf = (userId: string): PlayRecord => {
    const rows = selectResults.all(userId, userId) as unknown as ResultRow[];
    const record: PlayRecord = { played: 0, wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
    rows.forEach((row) => {
      const outcome = outcomeFor(row.x_user_id === userId ? 'x' : 'o', row.winner);
      record.played += 1;
      if (outcome === 'win') {
        record.wins += 1;
        record.currentStreak += 1;
        record.bestStreak = Math.max(record.bestStreak, record.currentStreak);
      } else {
        record[outcome === 'loss' ? 'losses' : 'draws'] += 1;
        record.currentStreak = 0;
      }
    });
    return record;
  };

  const progress = (userId: string): PlayerProgress => {
    const ratings = new Map(ratingsOf(userId).map((row) => [row.game, row]));
    const totals = new Map(
      (selectTotals.all(userId, userId, userId, userId) as unknown as TotalsRow[]).map((row) => [row.game, row]),
    );
    const games: GameStanding[] = ACTIVE_GAME_IDS.map((game) => {
      const rating = ratings.get(game);
      const counts = totals.get(game);
      const played = counts?.played ?? 0;
      const wins = counts?.wins ?? 0;
      const draws = counts?.draws ?? 0;
      return {
        game,
        points: rating?.points ?? 0,
        bestPoints: rating?.best_points ?? 0,
        played,
        wins,
        losses: played - wins - draws,
        draws,
      };
    });
    const total = games.reduce((sum, standing) => sum + standing.points, 0);
    return {
      total,
      level: levelFor(total),
      goals: wallet.balance(userId),
      daily: dailyStatus(userId),
      record: recordOf(userId),
      games,
    };
  };

  return {
    pointsOf,

    ratingOf,

    progress,

    wallet: (userId: string): WalletResponse => wallet.statement(userId),

    goalsOf: (userId: string): number => wallet.balance(userId),

    spendGoals: (userId: string, amount: number, reason: GoalReason, reference: string): number =>
      wallet.credit(userId, -amount, reason, reference),

    creditGoals: (userId: string, amount: number, reason: GoalReason, reference: string): number =>
      wallet.credit(userId, amount, reason, reference),

    protectionOf: (userId: string, matchId: string): number =>
      (selectProtection.get(matchId, userId) as { points: number } | undefined)?.points ?? 0,

    protectPoints(userId: string, matchId: string): number {
      return transaction(database, () => {
        const match = selectMatchSides.get(matchId) as MatchSidesRow | undefined;
        const side = match?.x_user_id === userId ? 'x' : match?.o_user_id === userId ? 'o' : null;
        if (!match || !side || now() - match.finished_at > POINT_PROTECTION_WINDOW) {
          return 0;
        }
        const lost = -((side === 'x' ? match.x_points_change : match.o_points_change) ?? 0);
        if (lost <= 0) {
          return 0;
        }
        const time = now();
        insertProtection.run(matchId, userId, match.game, lost, time);
        restorePoints.run(lost, lost, time, userId, match.game);
        clearPointsChange[side].run(matchId);
        return lost;
      });
    },

    settle(match: RankedMatch, result: PlayResult): Record<Side, PointsChange | null> {
      return transaction(database, () => {
        const settleSide = (side: Side): PointsChange | null => {
          const { userId } = match.seats[side];
          if (userId === null) {
            return null;
          }
          const before = totalOf(userId);
          const current = pointsOf(userId, match.game);
          const outcome = outcomeFor(side, result.winner);
          const own = match.seats[side].rating;
          const rival = match.seats[opponentOf(side)].rating;
          const change = pointsChange(own, rival, outcome, match.difficulty);
          const points = keepLevel(current, change, before, levelFor(before).floor);
          const rating = Math.max(0, own + ratingChange(own, rival, outcome));
          upsertStanding.run(userId, match.game, points, points, rating, now());
          const goalsEarned = outcome === 'win' ? WIN_GOALS : 0;
          const goals =
            goalsEarned > 0 ? wallet.credit(userId, goalsEarned, 'win', match.id) : wallet.balance(userId);
          const total = before - current + points;
          return {
            game: match.game,
            change: points - current,
            points,
            total,
            level: levelFor(total).level,
            previousLevel: levelFor(before).level,
            goalsEarned,
            goals,
          };
        };
        return { x: settleSide('x'), o: settleSide('o') };
      });
    },

    claimDaily(userId: string): DailyRewardResponse {
      const reward = transaction(database, () => {
        const today = localDay(now(), timeZone);
        const row = dailyOf(userId);
        if (row?.last_day === today) {
          return null;
        }
        const streak = row?.last_day === previousDay(today) ? row.streak + 1 : 1;
        const goals = dailyGoals(streak);
        upsertDaily.run(userId, streak, Math.max(streak, row?.best_streak ?? 0), today, now());
        wallet.credit(userId, goals, 'daily', today);
        return row ? { goals, streak } : { goals, streak, welcomeGoals: WELCOME_GOALS };
      });
      return { reward, progress: progress(userId) };
    },
  };
}

export type Progress = ReturnType<typeof createProgress>;
