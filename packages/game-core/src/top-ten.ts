import { opponentOf } from './match';
import type { Side } from './types';

export const TOP_TEN_LIVES = 3;

export interface TopTenEntry {
  footballerId: number;
  value: number;
}

export interface TopTenRound<List> {
  list: List;
  entries: readonly TopTenEntry[];
}

export interface TopTenGuess {
  round: number;
  side: Side;
  footballerId: number | null;
  rank: number | null;
}

export interface TopTenState<List> {
  phase: 'playing' | 'between' | 'finished';
  rounds: readonly TopTenRound<List>[];
  round: number;
  maxLives: number;
  starter: Side;
  turn: Side;
  lives: Record<Side, number>;
  found: readonly (Side | null)[];
  scores: Record<Side, number>;
  guesses: readonly TopTenGuess[];
}

export type TopTenErrorCode = 'wrong-phase' | 'not-your-turn';

export class TopTenError extends Error {
  readonly code: TopTenErrorCode;

  constructor(code: TopTenErrorCode) {
    super(code);
    this.name = 'TopTenError';
    this.code = code;
  }
}

function freshRound<List>(state: TopTenState<List>, round: number, starter: Side): TopTenState<List> {
  return {
    ...state,
    phase: 'playing',
    round,
    starter,
    turn: starter,
    lives: { x: state.maxLives, o: state.maxLives },
    found: (state.rounds[round]?.entries ?? []).map(() => null),
  };
}

export function createTopTen<List>(
  rounds: readonly TopTenRound<List>[],
  starter: Side,
  maxLives: number = TOP_TEN_LIVES,
): TopTenState<List> {
  const base: TopTenState<List> = {
    phase: 'playing',
    rounds: [...rounds],
    round: 0,
    maxLives,
    starter,
    turn: starter,
    lives: { x: maxLives, o: maxLives },
    found: [],
    scores: { x: 0, o: 0 },
    guesses: [],
  };
  return freshRound(base, 0, starter);
}

export function currentList<List>(state: TopTenState<List>): TopTenRound<List> | null {
  return state.rounds[state.round] ?? null;
}

export function rankOf(state: TopTenState<unknown>, footballerId: number): number | null {
  const index = currentList(state)?.entries.findIndex((entry) => entry.footballerId === footballerId) ?? -1;
  return index < 0 ? null : index + 1;
}

export function guessTopTen<List>(state: TopTenState<List>, side: Side, footballerId: number | null): TopTenState<List> {
  if (state.phase !== 'playing') {
    throw new TopTenError('wrong-phase');
  }
  if (state.turn !== side) {
    throw new TopTenError('not-your-turn');
  }
  const rank = footballerId === null ? null : rankOf(state, footballerId);
  const fresh = rank !== null && state.found[rank - 1] === null;
  const found = fresh ? state.found.map((owner, index) => (index === rank - 1 ? side : owner)) : state.found;
  const scores = fresh ? { ...state.scores, [side]: state.scores[side] + (rank as number) } : state.scores;
  const lives = fresh ? state.lives : { ...state.lives, [side]: Math.max(0, state.lives[side] - 1) };
  const guesses = [...state.guesses, { round: state.round, side, footballerId, rank: fresh ? rank : null }];
  const other = opponentOf(side);
  const complete = found.every((owner) => owner !== null);
  const exhausted = lives.x === 0 && lives.o === 0;
  if (complete || exhausted) {
    return {
      ...state,
      phase: state.round + 1 >= state.rounds.length ? 'finished' : 'between',
      found,
      scores,
      lives,
      guesses,
    };
  }
  return { ...state, turn: lives[other] > 0 ? other : side, found, scores, lives, guesses };
}

export function nextTopTenRound<List>(state: TopTenState<List>): TopTenState<List> {
  if (state.phase !== 'between') {
    throw new TopTenError('wrong-phase');
  }
  return freshRound(state, state.round + 1, opponentOf(state.starter));
}

export function topTenWinner(state: TopTenState<unknown>): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
