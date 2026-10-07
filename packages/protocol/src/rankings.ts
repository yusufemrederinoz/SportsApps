import type { GameId, PlayCell } from './play';

export const LEADERBOARD_SIZE = 50;
export const PUZZLE_GUESSES = 9;
export const PUZZLE_CELL_POINTS = 100;
export const PUZZLE_FINISH_GOALS = 2;
export const PUZZLE_PERFECT_GOALS = 3;
export const PUZZLE_FIRST_DAY = '2026-10-01';

export type LeaderboardPeriod = 'week' | 'all';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  level: number;
  you: boolean;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  game: GameId | null;
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
  resetsAt: number | null;
}

export interface PuzzleCellView {
  footballerId: number | null;
  share: number | null;
  points: number;
}

export interface DailyPuzzleView {
  day: string;
  number: number;
  market: string;
  gridId: number;
  guessesLeft: number;
  cells: PuzzleCellView[];
  finished: boolean;
  score: number;
  rewardGoals: number | null;
  players: number;
}

export interface DailyPuzzleResponse {
  puzzle: DailyPuzzleView;
}

export interface PuzzleGuessRequest {
  market: string;
  cell: PlayCell;
  footballerId: number;
}

export type PuzzleGuessOutcome = 'correct' | 'wrong' | 'already-used';

export interface PuzzleGuessResponse {
  puzzle: DailyPuzzleView;
  outcome: PuzzleGuessOutcome;
  goals: number | null;
}

export interface PuzzleRankingEntry {
  rank: number;
  username: string;
  score: number;
  filled: number;
  you: boolean;
}

export interface PuzzleRankingResponse {
  day: string;
  entries: PuzzleRankingEntry[];
  you: PuzzleRankingEntry | null;
}

export function puzzleCellPoints(sameAnswers: number, cellAnswers: number): number {
  if (cellAnswers <= 0 || sameAnswers <= 0) {
    return 0;
  }
  return PUZZLE_CELL_POINTS - Math.round((PUZZLE_CELL_POINTS * (sameAnswers - 1)) / cellAnswers);
}

export function puzzleNumber(day: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${PUZZLE_FIRST_DAY}T00:00:00Z`)) / 86_400_000) + 1;
}
