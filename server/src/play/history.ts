import { opponentOf, type Side } from '@sportapps/game-core';
import type {
  GameId,
  MatchKind,
  MatchOutcome,
  MatchSummary,
  PlayDifficulty,
  PlayFinishReason,
  PlayResult,
} from '@sportapps/protocol';

import type { Database } from '../database';
import { outcomeFor } from '../progress/store';
import type { LiveRoom } from './live-room';

const HISTORY_LIMIT = 50;

export interface HistoryQuery {
  game?: GameId;
  before?: number;
  limit?: number;
}

interface MatchRow {
  id: string;
  kind: string;
  game: string;
  difficulty: number;
  x_user_id: string | null;
  x_username: string;
  o_username: string;
  winner: string | null;
  reason: string;
  x_cells: number;
  o_cells: number;
  x_points_change: number | null;
  o_points_change: number | null;
  goals_earned: number;
  finished_at: number;
}

export function createMatchHistory(database: Database) {
  const insert = database.prepare(
    `INSERT INTO matches (
       id, kind, game, market, difficulty, grid_id, x_user_id, o_user_id, x_username, o_username,
       winner, reason, x_cells, o_cells, move_count, started_at, finished_at, x_points_change, o_points_change,
       bot_level
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const selectBotResults = database.prepare(
    `SELECT winner, x_user_id FROM matches
     WHERE (x_user_id = ? OR o_user_id = ?) AND game = ? AND bot_level IS NOT NULL
     ORDER BY finished_at DESC, rowid DESC LIMIT ?`,
  );
  const selectForUser = database.prepare(
    `SELECT id, kind, game, difficulty, x_user_id, x_username, o_username, winner, reason, x_cells, o_cells,
       x_points_change, o_points_change, finished_at,
       (SELECT COALESCE(SUM(amount), 0) FROM goal_ledger
        WHERE goal_ledger.user_id = ? AND reason = 'win' AND reference = matches.id) AS goals_earned
     FROM matches
     WHERE (x_user_id = ? OR o_user_id = ?) AND (? IS NULL OR game = ?) AND (? IS NULL OR finished_at < ?)
     ORDER BY finished_at DESC, rowid DESC LIMIT ?`,
  );

  const listRows = (userId: string, query: HistoryQuery) => {
    const game = query.game ?? null;
    const before = query.before ?? null;
    const limit = Math.max(1, Math.min(HISTORY_LIMIT, query.limit ?? HISTORY_LIMIT));
    return selectForUser.all(userId, userId, userId, game, game, before, before, limit) as unknown as MatchRow[];
  };

  return {
    record(
      room: LiveRoom,
      result: PlayResult,
      finishedAt: number,
      pointsChanges: Record<Side, number | null> = { x: null, o: null },
      botLevel: number | null = null,
    ): void {
      const details = room.record();
      insert.run(
        room.id,
        room.kind,
        details.game,
        details.market,
        details.difficulty,
        details.gridId,
        room.seats.x.userId ?? room.seats.x.botId ?? null,
        room.seats.o.userId ?? room.seats.o.botId ?? null,
        room.seats.x.username,
        room.seats.o.username,
        result.winner,
        result.reason,
        details.scores.x,
        details.scores.o,
        details.moveCount,
        details.startedAt,
        finishedAt,
        pointsChanges.x,
        pointsChanges.o,
        botLevel,
      );
    },

    list(userId: string, query: HistoryQuery = {}): MatchSummary[] {
      return listRows(userId, query).map((row) => {
        const side: Side = row.x_user_id === userId ? 'x' : 'o';
        const other = opponentOf(side);
        const cells = { x: row.x_cells, o: row.o_cells };
        const usernames = { x: row.x_username, o: row.o_username };
        const changes = { x: row.x_points_change, o: row.o_points_change };
        return {
          id: row.id,
          game: row.game as GameId,
          kind: row.kind as MatchKind,
          finishedAt: row.finished_at,
          difficulty: row.difficulty as PlayDifficulty,
          opponent: usernames[other],
          outcome: outcomeFor(side, row.winner),
          reason: row.reason as PlayFinishReason,
          ownCells: cells[side],
          opponentCells: cells[other],
          pointsChange: changes[side],
          goalsEarned: row.goals_earned,
        };
      });
    },

    recentBotOutcomes(userId: string, game: GameId, limit: number): MatchOutcome[] {
      const rows = selectBotResults.all(userId, userId, game, limit) as unknown as { winner: string | null; x_user_id: string | null }[];
      return rows.map((row) => outcomeFor(row.x_user_id === userId ? 'x' : 'o', row.winner));
    },
  };
}

export type MatchHistory = ReturnType<typeof createMatchHistory>;
