import { opponentOf } from './match';
import type { Side } from './types';

export const CHAIN_ROUNDS_TO_WIN = 3;
export const CHAIN_LONGEST_TURN_SECONDS = 20;
export const CHAIN_SHORTEST_TURN_SECONDS = 8;

export type ChainMissReason = 'wrong' | 'used' | 'timeout';

export interface ChainLink {
  footballerId: number;
  clubId: number | null;
  side: Side | null;
}

export interface ChainMiss {
  round: number;
  side: Side;
  footballerId: number | null;
  reason: ChainMissReason;
}

export interface ChainState {
  phase: 'playing' | 'between' | 'finished';
  round: number;
  roundsToWin: number;
  starter: Side;
  turn: Side;
  chain: readonly ChainLink[];
  scores: Record<Side, number>;
  misses: readonly ChainMiss[];
}

export type ChainErrorCode = 'wrong-phase' | 'not-your-turn';

export class ChainError extends Error {
  readonly code: ChainErrorCode;

  constructor(code: ChainErrorCode) {
    super(code);
    this.name = 'ChainError';
    this.code = code;
  }
}

export function createChain(seed: number, starter: Side, roundsToWin: number = CHAIN_ROUNDS_TO_WIN): ChainState {
  return {
    phase: 'playing',
    round: 1,
    roundsToWin,
    starter,
    turn: starter,
    chain: [{ footballerId: seed, clubId: null, side: null }],
    scores: { x: 0, o: 0 },
    misses: [],
  };
}

export function chainTurnSeconds(state: ChainState): number {
  const answered = state.chain.length - 1;
  return Math.max(CHAIN_SHORTEST_TURN_SECONDS, CHAIN_LONGEST_TURN_SECONDS - 2 * Math.floor(answered / 2));
}

export function lastLink(state: ChainState): ChainLink {
  return state.chain[state.chain.length - 1] as ChainLink;
}

export function isUsed(state: ChainState, footballerId: number): boolean {
  return state.chain.some((link) => link.footballerId === footballerId);
}

function checkTurn(state: ChainState, side: Side): void {
  if (state.phase !== 'playing') {
    throw new ChainError('wrong-phase');
  }
  if (state.turn !== side) {
    throw new ChainError('not-your-turn');
  }
}

export function addLink(state: ChainState, side: Side, footballerId: number, clubId: number): ChainState {
  checkTurn(state, side);
  return {
    ...state,
    turn: opponentOf(side),
    chain: [...state.chain, { footballerId, clubId, side }],
  };
}

export function missTurn(
  state: ChainState,
  side: Side,
  footballerId: number | null,
  reason: ChainMissReason,
): ChainState {
  checkTurn(state, side);
  const winner = opponentOf(side);
  const scores = { ...state.scores, [winner]: state.scores[winner] + 1 };
  return {
    ...state,
    phase: scores[winner] >= state.roundsToWin ? 'finished' : 'between',
    scores,
    misses: [...state.misses, { round: state.round, side, footballerId, reason }],
  };
}

export function nextChainRound(state: ChainState, seed: number): ChainState {
  if (state.phase !== 'between') {
    throw new ChainError('wrong-phase');
  }
  const starter = opponentOf(state.starter);
  return {
    ...state,
    phase: 'playing',
    round: state.round + 1,
    starter,
    turn: starter,
    chain: [{ footballerId: seed, clubId: null, side: null }],
  };
}

export function chainWinner(state: ChainState): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
