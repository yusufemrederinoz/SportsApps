import { BOARD_SIZE, CELL_COUNT, type Grid, type Header } from '@sportapps/game-core';
import {
  PUZZLE_CELL_POINTS,
  PUZZLE_FINISH_GOALS,
  PUZZLE_GUESSES,
  PUZZLE_PERFECT_GOALS,
  LEADERBOARD_SIZE,
  puzzleCellPoints,
  puzzleNumber,
  type DailyPuzzleView,
  type PlayCell,
  type PuzzleGuessOutcome,
  type PuzzleRankingEntry,
  type PuzzleRankingResponse,
} from '@sportapps/protocol';

import { transaction, type Database } from '../database';
import type { FootballLibrary } from '../football/library';
import { DEFAULT_TIME_ZONE, localDay } from './points';
import type { Progress } from './store';

export const PUZZLE_DIFFICULTY = 2;

export type PuzzleLibrary = Pick<FootballLibrary, 'pickGrid' | 'isCorrect'>;

export interface PuzzleOptions {
  now?: () => number;
  timeZone?: string;
}

export class PuzzleError extends Error {
  readonly code: 'no-puzzle' | 'finished' | 'cell-taken' | 'invalid-cell';

  constructor(code: PuzzleError['code']) {
    super(code);
    this.name = 'PuzzleError';
    this.code = code;
  }
}

interface PlayRow {
  grid_id: number;
  guesses_left: number;
  finished_at: number | null;
  reward_goals: number | null;
}

interface AnswerRow {
  cell: number;
  footballer_id: number;
  same: number;
  total: number;
}

interface ScoreRow {
  userId: string;
  username: string;
  score: number;
  filled: number;
  rank: number;
}

export function dayFraction(market: string, day: string): number {
  let hash = 2166136261;
  for (const character of `${market}:${day}`) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash / 4294967296;
}

export function createPuzzles(database: Database, library: PuzzleLibrary, progress: Progress, options: PuzzleOptions = {}) {
  const now = options.now ?? Date.now;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const grids = new Map<string, Grid | null>();

  const selectPlay = database.prepare(
    'SELECT grid_id, guesses_left, finished_at, reward_goals FROM puzzle_plays WHERE user_id = ? AND day = ? AND market = ?',
  );
  const insertPlay = database.prepare(
    `INSERT INTO puzzle_plays (user_id, day, market, grid_id, guesses_left, finished_at, reward_goals, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
  );
  const updatePlay = database.prepare(
    `UPDATE puzzle_plays SET guesses_left = ?, finished_at = ?, reward_goals = ?, updated_at = ?
     WHERE user_id = ? AND day = ? AND market = ?`,
  );
  const insertAnswer = database.prepare(
    'INSERT INTO puzzle_answers (user_id, day, market, cell, footballer_id, answered_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const selectAnswers = database.prepare(
    `SELECT a.cell, a.footballer_id,
       (SELECT COUNT(*) FROM puzzle_answers s
        WHERE s.day = a.day AND s.market = a.market AND s.cell = a.cell AND s.footballer_id = a.footballer_id) AS same,
       (SELECT COUNT(*) FROM puzzle_answers t WHERE t.day = a.day AND t.market = a.market AND t.cell = a.cell) AS total
     FROM puzzle_answers a WHERE a.user_id = ? AND a.day = ? AND a.market = ?`,
  );
  const countPlayers = database.prepare('SELECT COUNT(*) AS players FROM puzzle_plays WHERE day = ? AND market = ?');
  const selectScores = database.prepare(
    `WITH counts AS (
       SELECT cell, footballer_id, COUNT(*) AS same FROM puzzle_answers WHERE day = :day AND market = :market
       GROUP BY cell, footballer_id
     ),
     totals AS (
       SELECT cell, COUNT(*) AS total FROM puzzle_answers WHERE day = :day AND market = :market GROUP BY cell
     ),
     scores AS (
       SELECT p.user_id AS userId,
              COALESCE(SUM(${PUZZLE_CELL_POINTS} - CAST(ROUND(100.0 * (c.same - 1) / t.total) AS INTEGER)), 0) AS score,
              COUNT(a.cell) AS filled
       FROM puzzle_plays p
       LEFT JOIN puzzle_answers a ON a.user_id = p.user_id AND a.day = p.day AND a.market = p.market
       LEFT JOIN counts c ON c.cell = a.cell AND c.footballer_id = a.footballer_id
       LEFT JOIN totals t ON t.cell = a.cell
       WHERE p.day = :day AND p.market = :market
       GROUP BY p.user_id
     )
     SELECT s.userId AS userId, u.username AS username, s.score AS score, s.filled AS filled,
            RANK() OVER (ORDER BY s.score DESC, s.filled DESC) AS rank
     FROM scores s JOIN users u ON u.id = s.userId
     ORDER BY rank, u.username_key`,
  );

  const today = () => localDay(now(), timeZone);

  const gridFor = (market: string, day: string): Grid => {
    const key = `${market}:${day}`;
    if (!grids.has(key)) {
      grids.set(key, library.pickGrid(market, PUZZLE_DIFFICULTY, () => dayFraction(market, day)));
    }
    const grid = grids.get(key);
    if (!grid) {
      throw new PuzzleError('no-puzzle');
    }
    return grid;
  };

  const playOf = (userId: string, market: string, day: string): PlayRow => {
    const existing = selectPlay.get(userId, day, market) as PlayRow | undefined;
    if (existing) {
      return existing;
    }
    const grid = gridFor(market, day);
    insertPlay.run(userId, day, market, grid.id, PUZZLE_GUESSES, now(), now());
    return { grid_id: grid.id, guesses_left: PUZZLE_GUESSES, finished_at: null, reward_goals: null };
  };

  const view = (userId: string, market: string, day: string): DailyPuzzleView => {
    const play = playOf(userId, market, day);
    const answers = selectAnswers.all(userId, day, market) as unknown as AnswerRow[];
    const cells = Array.from({ length: CELL_COUNT }, (_, index) => {
      const answer = answers.find((entry) => entry.cell === index);
      return answer
        ? {
            footballerId: answer.footballer_id,
            share: Math.round((100 * answer.same) / answer.total),
            points: puzzleCellPoints(answer.same, answer.total),
          }
        : { footballerId: null, share: null, points: 0 };
    });
    return {
      day,
      number: puzzleNumber(day),
      market,
      gridId: play.grid_id,
      guessesLeft: play.guesses_left,
      cells,
      finished: play.finished_at !== null,
      score: cells.reduce((sum, cell) => sum + cell.points, 0),
      rewardGoals: play.reward_goals,
      players: (countPlayers.get(day, market) as { players: number }).players,
    };
  };

  const header = (headers: readonly Header[], index: number) => headers[index] as Header;

  return {
    today,

    puzzle(userId: string, market: string): DailyPuzzleView {
      return transaction(database, () => view(userId, market, today()));
    },

    guess(
      userId: string,
      market: string,
      cell: PlayCell,
      footballerId: number,
    ): { puzzle: DailyPuzzleView; outcome: PuzzleGuessOutcome; goals: number | null } {
      return transaction(database, () => {
        const day = today();
        const play = playOf(userId, market, day);
        if (play.finished_at !== null || play.guesses_left <= 0) {
          throw new PuzzleError('finished');
        }
        if (
          !Number.isInteger(cell.row) ||
          !Number.isInteger(cell.column) ||
          cell.row < 0 ||
          cell.column < 0 ||
          cell.row >= BOARD_SIZE ||
          cell.column >= BOARD_SIZE
        ) {
          throw new PuzzleError('invalid-cell');
        }
        const index = cell.row * BOARD_SIZE + cell.column;
        const answers = selectAnswers.all(userId, day, market) as unknown as AnswerRow[];
        if (answers.some((answer) => answer.cell === index)) {
          throw new PuzzleError('cell-taken');
        }
        const grid = gridFor(market, day);
        const used = answers.some((answer) => answer.footballer_id === footballerId);
        const correct = !used && library.isCorrect(footballerId, header(grid.rows, cell.row), header(grid.columns, cell.column));
        if (correct) {
          insertAnswer.run(userId, day, market, index, footballerId, now());
        }
        const filled = answers.length + (correct ? 1 : 0);
        const guessesLeft = play.guesses_left - 1;
        const finished = guessesLeft <= 0 || filled >= CELL_COUNT;
        let goals: number | null = null;
        let reward: number | null = null;
        if (finished) {
          reward = PUZZLE_FINISH_GOALS + (filled >= CELL_COUNT ? PUZZLE_PERFECT_GOALS : 0);
          goals = progress.creditGoals(userId, reward, 'puzzle', `${market}:${day}`);
        }
        updatePlay.run(guessesLeft, finished ? now() : null, reward, now(), userId, day, market);
        return {
          puzzle: view(userId, market, day),
          outcome: used ? 'already-used' : correct ? 'correct' : 'wrong',
          goals,
        };
      });
    },

    ranking(userId: string, market: string): PuzzleRankingResponse {
      const day = today();
      const rows = selectScores.all({ day, market }) as unknown as ScoreRow[];
      const toEntry = (row: ScoreRow): PuzzleRankingEntry => ({
        rank: row.rank,
        username: row.username,
        score: row.score,
        filled: row.filled,
        you: row.userId === userId,
      });
      const own = rows.find((row) => row.userId === userId);
      return { day, entries: rows.slice(0, LEADERBOARD_SIZE).map(toEntry), you: own ? toEntry(own) : null };
    },
  };
}

export type Puzzles = ReturnType<typeof createPuzzles>;
