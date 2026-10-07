import type { AuctionView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds } from '@/features/games';

import { auctionCardIds, finishAuctionView } from './online';

const view: AuctionView = {
  phase: 'proving',
  round: 1,
  roundsToWin: 2,
  maxBid: 12,
  criteria: { row: { kind: 'club', referenceId: 1 }, column: { kind: 'country', referenceId: 2 } },
  turn: 'x',
  bid: 3,
  bidder: 'o',
  named: [4, 5],
  missed: [9],
  outcome: null,
  phaseSeconds: 23,
  deadlineIn: 20000,
  scores: { x: 0, o: 0 },
  result: null,
};

describe('auction views', () => {
  it('collects every named footballer once', () => {
    expect(auctionCardIds(view)).toEqual([4, 5, 9]);
    expect(gameCardIds({ game: 'auction', view: { ...view, missed: [4] } })).toEqual([4, 5]);
  });

  it('closes a view with the result once', () => {
    const finished = finishAuctionView(view, { winner: 'o', reason: 'score' });
    expect(finished).toMatchObject({ phase: 'finished', deadlineIn: 0 });
    expect(finishAuctionView(finished, { winner: 'x', reason: 'forfeit' })).toBe(finished);
    expect(finishGameView({ game: 'auction', view }, { winner: null, reason: 'score' }).game).toBe('auction');
  });
});
