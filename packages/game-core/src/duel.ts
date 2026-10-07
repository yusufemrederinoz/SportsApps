import { opponentOf } from './match';
import type { Side } from './types';

export const DUEL_HAND_SIZE = 7;

export type DuelPhase = 'picking' | 'playing' | 'finished';

export type DuelPreference = 'high' | 'low';

export interface DuelQuestion<Metric extends string = string> {
  metric: Metric;
  prefer: DuelPreference;
}

export interface DuelRound<Metric extends string = string> {
  question: DuelQuestion<Metric>;
  cards: Record<Side, number>;
  values: Record<Side, number | null>;
  winner: Side | null;
}

export interface DuelState<Metric extends string = string> {
  phase: DuelPhase;
  hands: Record<Side, readonly number[] | null>;
  remaining: Record<Side, readonly number[]>;
  questions: readonly DuelQuestion<Metric>[];
  plays: Partial<Record<Side, number>>;
  rounds: readonly DuelRound<Metric>[];
  scores: Record<Side, number>;
}

export type DuelErrorCode = 'wrong-phase' | 'invalid-hand' | 'hand-locked' | 'card-not-in-hand' | 'already-played';

export class DuelError extends Error {
  readonly code: DuelErrorCode;

  constructor(code: DuelErrorCode) {
    super(code);
    this.name = 'DuelError';
    this.code = code;
  }
}

export type DuelValueLookup<Metric extends string> = (footballerId: number, metric: Metric) => number | null;

const SIDES: readonly Side[] = ['x', 'o'];

export function createDuel<Metric extends string = string>(): DuelState<Metric> {
  return {
    phase: 'picking',
    hands: { x: null, o: null },
    remaining: { x: [], o: [] },
    questions: [],
    plays: {},
    rounds: [],
    scores: { x: 0, o: 0 },
  };
}

export function isValidHand(footballerIds: readonly number[]): boolean {
  return (
    footballerIds.length === DUEL_HAND_SIZE &&
    new Set(footballerIds).size === DUEL_HAND_SIZE &&
    footballerIds.every((id) => Number.isSafeInteger(id) && id > 0)
  );
}

export function submitHand<Metric extends string>(
  state: DuelState<Metric>,
  side: Side,
  footballerIds: readonly number[],
): DuelState<Metric> {
  if (state.phase !== 'picking') {
    throw new DuelError('wrong-phase');
  }
  if (state.hands[side]) {
    throw new DuelError('hand-locked');
  }
  if (!isValidHand(footballerIds)) {
    throw new DuelError('invalid-hand');
  }
  const hand = [...footballerIds];
  return {
    ...state,
    hands: { ...state.hands, [side]: hand },
    remaining: { ...state.remaining, [side]: hand },
  };
}

export function handsReady(state: DuelState): boolean {
  return state.hands.x !== null && state.hands.o !== null;
}

export function startPlay<Metric extends string>(
  state: DuelState<Metric>,
  questions: readonly DuelQuestion<Metric>[],
): DuelState<Metric> {
  if (state.phase !== 'picking' || !handsReady(state)) {
    throw new DuelError('wrong-phase');
  }
  if (questions.length !== DUEL_HAND_SIZE) {
    throw new DuelError('invalid-hand');
  }
  return { ...state, phase: 'playing', questions: [...questions] };
}

export function currentQuestion<Metric extends string>(state: DuelState<Metric>): DuelQuestion<Metric> | null {
  return state.phase === 'playing' ? (state.questions[state.rounds.length] ?? null) : null;
}

export function compareValues(first: number | null, second: number | null, prefer: DuelPreference): -1 | 0 | 1 {
  if (first === null && second === null) {
    return 0;
  }
  if (first === null) {
    return 1;
  }
  if (second === null || first === second) {
    return second === null ? -1 : 0;
  }
  return (prefer === 'high' ? first > second : first < second) ? -1 : 1;
}

function resolveRound<Metric extends string>(
  state: DuelState<Metric>,
  cards: Record<Side, number>,
  valueOf: DuelValueLookup<Metric>,
): DuelState<Metric> {
  const question = state.questions[state.rounds.length] as DuelQuestion<Metric>;
  const values = { x: valueOf(cards.x, question.metric), o: valueOf(cards.o, question.metric) };
  const order = compareValues(values.x, values.o, question.prefer);
  const winner: Side | null = order === 0 ? null : order < 0 ? 'x' : 'o';
  const rounds = [...state.rounds, { question, cards, values, winner }];
  const scores = winner ? { ...state.scores, [winner]: state.scores[winner] + 1 } : state.scores;
  const remaining = {
    x: state.remaining.x.filter((id) => id !== cards.x),
    o: state.remaining.o.filter((id) => id !== cards.o),
  };
  return {
    ...state,
    phase: rounds.length === state.questions.length ? 'finished' : 'playing',
    plays: {},
    rounds,
    scores,
    remaining,
  };
}

export function playCard<Metric extends string>(
  state: DuelState<Metric>,
  side: Side,
  footballerId: number,
  valueOf: DuelValueLookup<Metric>,
): DuelState<Metric> {
  if (state.phase !== 'playing') {
    throw new DuelError('wrong-phase');
  }
  if (state.plays[side] !== undefined) {
    throw new DuelError('already-played');
  }
  if (!state.remaining[side].includes(footballerId)) {
    throw new DuelError('card-not-in-hand');
  }
  const plays = { ...state.plays, [side]: footballerId };
  const other = plays[opponentOf(side)];
  if (other === undefined) {
    return { ...state, plays };
  }
  return resolveRound(state, { [side]: footballerId, [opponentOf(side)]: other } as Record<Side, number>, valueOf);
}

export function duelWinner(state: DuelState): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}

export function pendingSides(state: DuelState): Side[] {
  if (state.phase === 'picking') {
    return SIDES.filter((side) => state.hands[side] === null);
  }
  return state.phase === 'playing' ? SIDES.filter((side) => state.plays[side] === undefined) : [];
}
