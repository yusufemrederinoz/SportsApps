import type { PlayResult, PlaySide } from './play';

export const CAREER_TURN_SECONDS = 20;

export interface CareerClueView {
  clubId: number;
  firstYear: number;
  lastYear: number | null;
}

export interface CareerGuessView {
  side: PlaySide;
  footballerId: number | null;
  correct: boolean;
}

export type CareerViewPhase = 'playing' | 'reveal' | 'finished';

export interface CareerView {
  phase: CareerViewPhase;
  round: number;
  totalRounds: number;
  clues: CareerClueView[];
  totalClues: number;
  turn: PlaySide;
  attemptsLeft: number;
  points: number;
  lastGuess: CareerGuessView | null;
  answer: number | null;
  deadlineIn: number;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}
