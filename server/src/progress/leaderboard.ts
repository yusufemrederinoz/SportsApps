import {
  LEADERBOARD_SIZE,
  levelFor,
  type GameId,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '@sportapps/protocol';

import type { Database } from '../database';
import { DEFAULT_TIME_ZONE, nextWeekStart, weekStart } from './points';

export interface LeaderboardOptions {
  now?: () => number;
  timeZone?: string;
}

interface RankedRow {
  userId: string;
  username: string;
  points: number;
  total: number;
  rank: number;
}

const ALL_TIME_TOTAL = 'SELECT user_id AS userId, SUM(points) AS points FROM ratings GROUP BY user_id';
const ALL_TIME_GAME = 'SELECT user_id AS userId, points FROM ratings WHERE game = :game';

function weekly(byGame: boolean): string {
  const game = byGame ? ' AND game = :game' : '';
  return `SELECT userId, SUM(change) AS points FROM (
            SELECT x_user_id AS userId, x_points_change AS change FROM matches
            WHERE finished_at >= :since AND x_user_id IS NOT NULL AND x_points_change IS NOT NULL${game}
            UNION ALL
            SELECT o_user_id AS userId, o_points_change AS change FROM matches
            WHERE finished_at >= :since AND o_user_id IS NOT NULL AND o_points_change IS NOT NULL${game}
          ) GROUP BY userId`;
}

function ranked(scores: string): string {
  return `WITH scores AS (${scores}),
               totals AS (SELECT user_id, SUM(points) AS total FROM ratings GROUP BY user_id)
          SELECT s.userId AS userId, u.username AS username, s.points AS points, COALESCE(t.total, 0) AS total,
                 RANK() OVER (ORDER BY s.points DESC) AS rank
          FROM scores s
          JOIN users u ON u.id = s.userId
          LEFT JOIN totals t ON t.user_id = s.userId
          ORDER BY rank, u.username_key`;
}

export function createLeaderboard(database: Database, options: LeaderboardOptions = {}) {
  const now = options.now ?? Date.now;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const statements = {
    all: database.prepare(ranked(ALL_TIME_TOTAL)),
    allGame: database.prepare(ranked(ALL_TIME_GAME)),
    week: database.prepare(ranked(weekly(false))),
    weekGame: database.prepare(ranked(weekly(true))),
  };

  const rows = (period: LeaderboardPeriod, game: GameId | null): RankedRow[] => {
    const since = weekStart(now(), timeZone);
    if (period === 'all') {
      return (game ? statements.allGame.all({ game }) : statements.all.all()) as unknown as RankedRow[];
    }
    return (game ? statements.weekGame.all({ since, game }) : statements.week.all({ since })) as unknown as RankedRow[];
  };

  return {
    board(userId: string, period: LeaderboardPeriod, game: GameId | null): LeaderboardResponse {
      const toEntry = (row: RankedRow): LeaderboardEntry => ({
        rank: row.rank,
        username: row.username,
        points: row.points,
        level: levelFor(row.total).level,
        you: row.userId === userId,
      });
      const all = rows(period, game);
      const own = all.find((row) => row.userId === userId);
      return {
        period,
        game,
        entries: all.slice(0, LEADERBOARD_SIZE).map(toEntry),
        you: own ? toEntry(own) : null,
        resetsAt: period === 'week' ? nextWeekStart(now(), timeZone) : null,
      };
    },
  };
}

export type Leaderboard = ReturnType<typeof createLeaderboard>;
