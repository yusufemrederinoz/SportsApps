import type { Side } from './types';

export const RARE_ROUNDS = 5;

export interface RareAnswer {
  footballerId: number | null;
  correct: boolean;
  fame: number | null;
}

export interface RareRound<Criteria> {
  criteria: Criteria;
  answers: Record<Side, RareAnswer>;
  winner: Side | null;
}

export interface RareState<Criteria> {
  phase: 'playing' | 'finished';
  criteria: readonly Criteria[];
  pending: Partial<Record<Side, RareAnswer>>;
  rounds: readonly RareRound<Criteria>[];
  scores: Record<Side, number>;
}

export type RareErrorCode = 'wrong-phase' | 'already-answered';

export class RareError extends Error {
  readonly code: RareErrorCode;

  constructor(code: RareErrorCode) {
    super(code);
    this.name = 'RareError';
    this.code = code;
  }
}

export const NO_ANSWER: RareAnswer = { footballerId: null, correct: false, fame: null };

export function createRare<Criteria>(criteria: readonly Criteria[]): RareState<Criteria> {
  return {
    phase: criteria.length > 0 ? 'playing' : 'finished',
    criteria: [...criteria],
    pending: {},
    rounds: [],
    scores: { x: 0, o: 0 },
  };
}

export function currentCriteria<Criteria>(state: RareState<Criteria>): Criteria | null {
  return state.phase === 'playing' ? (state.criteria[state.rounds.length] ?? null) : null;
}

export function submitRareAnswer<Criteria>(state: RareState<Criteria>, side: Side, answer: RareAnswer): RareState<Criteria> {
  if (state.phase !== 'playing') {
    throw new RareError('wrong-phase');
  }
  if (state.pending[side]) {
    throw new RareError('already-answered');
  }
  return { ...state, pending: { ...state.pending, [side]: answer } };
}

export function rareRoundReady(state: RareState<unknown>): boolean {
  return state.pending.x !== undefined && state.pending.o !== undefined;
}

export function rareRoundWinner(answers: Record<Side, RareAnswer>): Side | null {
  const { x, o } = answers;
  if (x.correct && o.correct) {
    const first = x.fame ?? 0;
    const second = o.fame ?? 0;
    if (first === second) {
      return null;
    }
    return first < second ? 'x' : 'o';
  }
  if (x.correct) {
    return 'x';
  }
  return o.correct ? 'o' : null;
}

export function resolveRareRound<Criteria>(state: RareState<Criteria>): RareState<Criteria> {
  const criteria = currentCriteria(state);
  if (criteria === null) {
    throw new RareError('wrong-phase');
  }
  const answers = { x: state.pending.x ?? NO_ANSWER, o: state.pending.o ?? NO_ANSWER };
  const winner = rareRoundWinner(answers);
  const rounds = [...state.rounds, { criteria, answers, winner }];
  return {
    ...state,
    phase: rounds.length >= state.criteria.length ? 'finished' : 'playing',
    pending: {},
    rounds,
    scores: winner ? { ...state.scores, [winner]: state.scores[winner] + 1 } : state.scores,
  };
}

export function rareWinner(state: RareState<unknown>): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
