import { countCells, opponentOf, type Side } from '@sportapps/game-core';
import type { MatchOutcome, MatchSummary, PlayDifficulty, PlayFinishReason, PlayResult } from '@sportapps/protocol';

import type { Database } from '../database';
import type { MatchRoom } from './room';

const HISTORY_LIMIT = 50;

interface MatchRow {
  id: string;
  difficulty: number;
  x_user_id: string | null;
  x_username: string;
  o_username: string;
  winner: string | null;
  reason: string;
  x_cells: number;
  o_cells: number;
  finished_at: number;
}

function outcomeFor(side: Side, winner: string | null): MatchOutcome {
  if (winner === null) {
    return 'draw';
  }
  return winner === side ? 'win' : 'loss';
}

export function createMatchHistory(database: Database) {
  const insert = database.prepare(
    `INSERT INTO matches (
       id, kind, market, difficulty, grid_id, x_user_id, o_user_id, x_username, o_username,
       winner, reason, x_cells, o_cells, move_count, started_at, finished_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const selectForUser = database.prepare(
    `SELECT id, difficulty, x_user_id, x_username, o_username, winner, reason, x_cells, o_cells, finished_at
     FROM matches WHERE x_user_id = ? OR o_user_id = ?
     ORDER BY finished_at DESC, id LIMIT ?`,
  );

  const listRows = (userId: string, limit: number) =>
    selectForUser.all(userId, userId, Math.max(1, Math.min(HISTORY_LIMIT, limit))) as unknown as MatchRow[];

  return {
    record(room: MatchRoom, result: PlayResult, finishedAt: number): void {
      const state = room.state();
      insert.run(
        room.id,
        room.kind,
        room.market,
        room.difficulty,
        room.grid.id,
        room.seats.x.userId,
        room.seats.o.userId,
        room.seats.x.username,
        room.seats.o.username,
        result.winner,
        result.reason,
        countCells(state, 'x'),
        countCells(state, 'o'),
        room.moves().length,
        room.startedAt,
        finishedAt,
      );
    },

    list(userId: string, limit: number = HISTORY_LIMIT): MatchSummary[] {
      return listRows(userId, limit).map((row) => {
        const side: Side = row.x_user_id === userId ? 'x' : 'o';
        const other = opponentOf(side);
        const cells = { x: row.x_cells, o: row.o_cells };
        const usernames = { x: row.x_username, o: row.o_username };
        return {
          id: row.id,
          finishedAt: row.finished_at,
          difficulty: row.difficulty as PlayDifficulty,
          opponent: usernames[other],
          outcome: outcomeFor(side, row.winner),
          reason: row.reason as PlayFinishReason,
          ownCells: cells[side],
          opponentCells: cells[other],
        };
      });
    },

    recentOutcomes(userId: string, limit: number): MatchOutcome[] {
      return listRows(userId, limit).map((row) => outcomeFor(row.x_user_id === userId ? 'x' : 'o', row.winner));
    },
  };
}

export type MatchHistory = ReturnType<typeof createMatchHistory>;
