import { describe, expect, it } from 'vitest';

import {
  AUCTION_MAX_BID,
  AuctionError,
  auctionCriteria,
  auctionWinner,
  challenge,
  createAuction,
  failProof,
  nameAnswer,
  nextAuctionRound,
  placeBid,
  prover,
  type AuctionState,
} from '../src/auction';

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof AuctionError ? error.code : 'unexpected';
  }
}

describe('auction', () => {
  it('takes rising bids in turn and refuses low, high or early challenges', () => {
    let state: AuctionState<string> = createAuction(['a', 'b', 'c'], 'x');
    expect(auctionCriteria(state)).toBe('a');
    expect(errorOf(() => challenge(state, 'x'))).toBe('nothing-to-challenge');
    expect(errorOf(() => placeBid(state, 'o', 3))).toBe('not-your-turn');
    state = placeBid(state, 'x', 3);
    expect(errorOf(() => placeBid(state, 'o', 3))).toBe('too-low');
    expect(errorOf(() => placeBid(state, 'o', AUCTION_MAX_BID + 1))).toBe('too-high');
    state = placeBid(state, 'o', 5);
    expect(state).toMatchObject({ bid: 5, bidder: 'o', turn: 'x', phase: 'bidding' });
  });

  it('makes the last bidder prove the bid when challenged', () => {
    let state: AuctionState<string> = placeBid(createAuction(['a', 'b', 'c'], 'x'), 'x', 2);
    state = challenge(state, 'o');
    expect(state.phase).toBe('proving');
    expect(prover(state)).toBe('x');
    expect(errorOf(() => nameAnswer(state, 'o', 1, true))).toBe('not-your-turn');
    state = nameAnswer(state, 'x', 10, false);
    state = nameAnswer(state, 'x', 11, true);
    state = nameAnswer(state, 'x', 11, true);
    expect(state).toMatchObject({ named: [11], missed: [10], phase: 'proving' });
    state = nameAnswer(state, 'x', 12, true);
    expect(state).toMatchObject({ phase: 'between', scores: { x: 1, o: 0 } });
    expect(state.outcomes).toEqual([{ round: 1, prover: 'x', bid: 2, named: 2, winner: 'x' }]);
  });

  it('gives the round to the challenger when the proof runs out of time', () => {
    let state: AuctionState<string> = placeBid(createAuction(['a', 'b', 'c'], 'o'), 'o', 4);
    state = failProof(challenge(state, 'x'));
    expect(state.scores).toEqual({ x: 1, o: 0 });
    state = nextAuctionRound(state);
    expect(state).toMatchObject({ round: 2, starter: 'x', turn: 'x', bid: 0, bidder: null, named: [], phase: 'bidding' });
    expect(auctionCriteria(state)).toBe('b');
  });

  it('goes straight to the proof at the highest bid', () => {
    const state = placeBid(createAuction(['a'], 'x'), 'x', AUCTION_MAX_BID);
    expect(state.phase).toBe('proving');
    expect(prover(state)).toBe('x');
  });

  it('finishes when a player has won enough rounds or the criteria run out', () => {
    let state: AuctionState<string> = createAuction(['a', 'b', 'c'], 'x');
    for (let round = 0; round < 2; round += 1) {
      state = placeBid(state, state.turn, 1);
      state = challenge(state, state.turn);
      state = nameAnswer(state, state.bidder as 'x' | 'o', 100 + round, true);
      if (state.phase === 'between') {
        state = nextAuctionRound(state);
      }
    }
    expect(state.phase).toBe('bidding');
    expect(state.scores).toEqual({ x: 1, o: 1 });
    state = failProof(challenge(placeBid(state, 'x', 1), 'o'));
    expect(state.phase).toBe('finished');
    expect(auctionWinner(state)).toBe('o');
  });
});
