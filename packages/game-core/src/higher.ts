import { compareValues, type DuelPreference } from './duel';
import { opponentOf } from './match';
import type { Side } from './types';

export const HIGHER_INNINGS_PER_PLAYER = 3;
export const HIGHER_STREAK_LIMIT = 5;

export interface HigherQuestion<Metric extends string = string> {
  metric: Metric;
  prefer: DuelPreference;
  cards: readonly [number, number];
  values: readonly [number, number];
}

export interface HigherAnswer<Metric extends string = string> {
  side: Side;
  inning: number;
  question: HigherQuestion<Metric>;
  choice: number | null;
  correct: boolean;
}

export interface HigherState<Metric extends string = string> {
  phase: 'playing' | 'finished';
  turn: Side;
  inning: number;
  innings: number;
  streak: number;
  streakLimit: number;
  scores: Record<Side, number>;
  answers: readonly HigherAnswer<Metric>[];
}

export type HigherErrorCode = 'wrong-phase' | 'not-your-turn' | 'not-a-choice';

export class HigherError extends Error {
  readonly code: HigherErrorCode;

  constructor(code: HigherErrorCode) {
    super(code);
    this.name = 'HigherError';
    this.code = code;
  }
}

export function createHigher<Metric extends string = string>(
  first: Side,
  inningsPerPlayer: number = HIGHER_INNINGS_PER_PLAYER,
  streakLimit: number = HIGHER_STREAK_LIMIT,
): HigherState<Metric> {
  return {
    phase: 'playing',
    turn: first,
    inning: 0,
    innings: inningsPerPlayer * 2,
    streak: 0,
    streakLimit,
    scores: { x: 0, o: 0 },
    answers: [],
  };
}

export function betterCard(question: HigherQuestion): number | null {
  const order = compareValues(question.values[0], question.values[1], question.prefer);
  if (order === 0) {
    return null;
  }
  return order < 0 ? question.cards[0] : question.cards[1];
}

export function answerQuestion<Metric extends string>(
  state: HigherState<Metric>,
  side: Side,
  question: HigherQuestion<Metric>,
  choice: number | null,
): HigherState<Metric> {
  if (state.phase !== 'playing') {
    throw new HigherError('wrong-phase');
  }
  if (state.turn !== side) {
    throw new HigherError('not-your-turn');
  }
  if (choice !== null && !question.cards.includes(choice)) {
    throw new HigherError('not-a-choice');
  }
  const correct = choice !== null && choice === betterCard(question);
  const answers = [...state.answers, { side, inning: state.inning, question, choice, correct }];
  const scores = correct ? { ...state.scores, [side]: state.scores[side] + 1 } : state.scores;
  const streak = correct ? state.streak + 1 : state.streak;
  if (correct && streak < state.streakLimit) {
    return { ...state, answers, scores, streak };
  }
  const inning = state.inning + 1;
  return {
    ...state,
    phase: inning >= state.innings ? 'finished' : 'playing',
    turn: opponentOf(side),
    inning,
    streak: 0,
    scores,
    answers,
  };
}

export function higherWinner(state: HigherState): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
