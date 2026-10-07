import { opponentOf } from './match';
import type { Side } from './types';

export const AUCTION_ROUNDS_TO_WIN = 2;
export const AUCTION_MAX_BID = 12;

export interface AuctionOutcome {
  round: number;
  prover: Side;
  bid: number;
  named: number;
  winner: Side;
}

export interface AuctionState<Criteria> {
  phase: 'bidding' | 'proving' | 'between' | 'finished';
  criteria: readonly Criteria[];
  round: number;
  roundsToWin: number;
  starter: Side;
  turn: Side;
  bid: number;
  bidder: Side | null;
  named: readonly number[];
  missed: readonly number[];
  scores: Record<Side, number>;
  outcomes: readonly AuctionOutcome[];
}

export type AuctionErrorCode = 'wrong-phase' | 'not-your-turn' | 'too-low' | 'too-high' | 'nothing-to-challenge';

export class AuctionError extends Error {
  readonly code: AuctionErrorCode;

  constructor(code: AuctionErrorCode) {
    super(code);
    this.name = 'AuctionError';
    this.code = code;
  }
}

export function createAuction<Criteria>(
  criteria: readonly Criteria[],
  starter: Side,
  roundsToWin: number = AUCTION_ROUNDS_TO_WIN,
): AuctionState<Criteria> {
  return {
    phase: 'bidding',
    criteria: [...criteria],
    round: 1,
    roundsToWin,
    starter,
    turn: starter,
    bid: 0,
    bidder: null,
    named: [],
    missed: [],
    scores: { x: 0, o: 0 },
    outcomes: [],
  };
}

export function auctionCriteria<Criteria>(state: AuctionState<Criteria>): Criteria | null {
  return state.criteria[state.round - 1] ?? null;
}

export function prover(state: AuctionState<unknown>): Side | null {
  return state.phase === 'proving' || state.phase === 'between' || state.phase === 'finished' ? state.bidder : null;
}

function checkBidding(state: AuctionState<unknown>, side: Side): void {
  if (state.phase !== 'bidding') {
    throw new AuctionError('wrong-phase');
  }
  if (state.turn !== side) {
    throw new AuctionError('not-your-turn');
  }
}

export function placeBid<Criteria>(state: AuctionState<Criteria>, side: Side, amount: number): AuctionState<Criteria> {
  checkBidding(state, side);
  if (!Number.isInteger(amount) || amount <= state.bid) {
    throw new AuctionError('too-low');
  }
  if (amount > AUCTION_MAX_BID) {
    throw new AuctionError('too-high');
  }
  const next = { ...state, bid: amount, bidder: side, turn: opponentOf(side) };
  return amount === AUCTION_MAX_BID ? { ...next, phase: 'proving' } : next;
}

export function challenge<Criteria>(state: AuctionState<Criteria>, side: Side): AuctionState<Criteria> {
  checkBidding(state, side);
  if (state.bidder === null) {
    throw new AuctionError('nothing-to-challenge');
  }
  return { ...state, phase: 'proving' };
}

function settle<Criteria>(state: AuctionState<Criteria>, winner: Side): AuctionState<Criteria> {
  const scores = { ...state.scores, [winner]: state.scores[winner] + 1 };
  const outcome: AuctionOutcome = {
    round: state.round,
    prover: state.bidder as Side,
    bid: state.bid,
    named: state.named.length,
    winner,
  };
  return {
    ...state,
    phase: scores[winner] >= state.roundsToWin || state.round >= state.criteria.length ? 'finished' : 'between',
    scores,
    outcomes: [...state.outcomes, outcome],
  };
}

export function nameAnswer<Criteria>(
  state: AuctionState<Criteria>,
  side: Side,
  footballerId: number,
  correct: boolean,
): AuctionState<Criteria> {
  if (state.phase !== 'proving') {
    throw new AuctionError('wrong-phase');
  }
  if (state.bidder !== side) {
    throw new AuctionError('not-your-turn');
  }
  if (state.named.includes(footballerId) || state.missed.includes(footballerId)) {
    return state;
  }
  if (!correct) {
    return { ...state, missed: [...state.missed, footballerId] };
  }
  const named = [...state.named, footballerId];
  const next = { ...state, named };
  return named.length >= state.bid ? settle(next, side) : next;
}

export function failProof<Criteria>(state: AuctionState<Criteria>): AuctionState<Criteria> {
  if (state.phase !== 'proving' || state.bidder === null) {
    throw new AuctionError('wrong-phase');
  }
  return settle(state, opponentOf(state.bidder));
}

export function nextAuctionRound<Criteria>(state: AuctionState<Criteria>): AuctionState<Criteria> {
  if (state.phase !== 'between') {
    throw new AuctionError('wrong-phase');
  }
  const starter = opponentOf(state.starter);
  return {
    ...state,
    phase: 'bidding',
    round: state.round + 1,
    starter,
    turn: starter,
    bid: 0,
    bidder: null,
    named: [],
    missed: [],
  };
}

export function auctionWinner(state: AuctionState<unknown>): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
