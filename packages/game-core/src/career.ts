import { opponentOf } from './match';
import type { Side } from './types';

export interface CareerMystery {
  footballerId: number;
  clues: number;
}

export interface CareerGuess {
  round: number;
  side: Side;
  footballerId: number | null;
  correct: boolean;
  revealed: number;
}

export interface CareerState {
  phase: 'playing' | 'between' | 'finished';
  mysteries: readonly CareerMystery[];
  round: number;
  starter: Side;
  turn: Side;
  revealed: number;
  attempts: number;
  scores: Record<Side, number>;
  winners: readonly (Side | null)[];
  guesses: readonly CareerGuess[];
}

export type CareerErrorCode = 'wrong-phase' | 'not-your-turn';

export class CareerError extends Error {
  readonly code: CareerErrorCode;

  constructor(code: CareerErrorCode) {
    super(code);
    this.name = 'CareerError';
    this.code = code;
  }
}

export function createCareer(mysteries: readonly CareerMystery[], starter: Side): CareerState {
  return {
    phase: mysteries.length > 0 ? 'playing' : 'finished',
    mysteries: [...mysteries],
    round: 0,
    starter,
    turn: starter,
    revealed: 1,
    attempts: 0,
    scores: { x: 0, o: 0 },
    winners: [],
    guesses: [],
  };
}

export function currentMystery(state: CareerState): CareerMystery | null {
  return state.mysteries[state.round] ?? null;
}

export function careerPoints(state: CareerState): number {
  const mystery = currentMystery(state);
  return mystery ? Math.max(1, mystery.clues - state.revealed + 1) : 0;
}

export function attemptsLeft(state: CareerState): number {
  const mystery = currentMystery(state);
  return mystery ? mystery.clues + 1 - state.attempts : 0;
}

function closeRound(state: CareerState, winner: Side | null, scores: Record<Side, number>): CareerState {
  return {
    ...state,
    phase: state.round + 1 >= state.mysteries.length ? 'finished' : 'between',
    scores,
    winners: [...state.winners, winner],
  };
}

export function guessCareer(state: CareerState, side: Side, footballerId: number | null): CareerState {
  const mystery = currentMystery(state);
  if (state.phase !== 'playing' || !mystery) {
    throw new CareerError('wrong-phase');
  }
  if (state.turn !== side) {
    throw new CareerError('not-your-turn');
  }
  const correct = footballerId !== null && footballerId === mystery.footballerId;
  const guesses = [...state.guesses, { round: state.round, side, footballerId, correct, revealed: state.revealed }];
  if (correct) {
    const scores = { ...state.scores, [side]: state.scores[side] + careerPoints(state) };
    return closeRound({ ...state, guesses }, side, scores);
  }
  const attempts = state.attempts + 1;
  const next = { ...state, guesses, attempts, turn: opponentOf(side), revealed: Math.min(mystery.clues, state.revealed + 1) };
  return attempts >= mystery.clues + 1 ? closeRound(next, null, state.scores) : next;
}

export function nextCareerRound(state: CareerState): CareerState {
  if (state.phase !== 'between') {
    throw new CareerError('wrong-phase');
  }
  const starter = opponentOf(state.starter);
  return { ...state, phase: 'playing', round: state.round + 1, starter, turn: starter, revealed: 1, attempts: 0 };
}

export function careerWinner(state: CareerState): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
