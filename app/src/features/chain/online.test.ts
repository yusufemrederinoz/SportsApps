import type { ChainView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds } from '@/features/games';

import { chainCardIds, chainClubIds, finishChainView } from './online';

const view: ChainView = {
  phase: 'reveal',
  round: 2,
  roundsToWin: 3,
  turn: 'o',
  turnSeconds: 18,
  chain: [
    { footballerId: 1, clubId: null, side: null },
    { footballerId: 2, clubId: 50, side: 'x' },
    { footballerId: 3, clubId: 50, side: 'o' },
  ],
  miss: { side: 'x', footballerId: 9, reason: 'wrong' },
  deadlineIn: 2000,
  scores: { x: 0, o: 1 },
  result: null,
};

describe('chain views', () => {
  it('collects the chain, the missed footballer and the linking clubs once', () => {
    expect(chainCardIds(view)).toEqual([1, 2, 3, 9]);
    expect(gameCardIds({ game: 'chain', view: { ...view, miss: null } })).toEqual([1, 2, 3]);
    expect(chainClubIds(view)).toEqual([50]);
  });

  it('closes a view with the result once', () => {
    const finished = finishChainView(view, { winner: 'o', reason: 'forfeit' });
    expect(finished).toMatchObject({ phase: 'finished', deadlineIn: 0 });
    expect(finishChainView(finished, { winner: 'x', reason: 'score' })).toBe(finished);
    expect(finishGameView({ game: 'chain', view }, { winner: 'o', reason: 'score' }).game).toBe('chain');
  });
});
