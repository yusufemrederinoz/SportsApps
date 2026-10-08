import { describe, expect, it } from 'vitest';

import {
  ChainError,
  addLink,
  chainTurnSeconds,
  chainWinner,
  createChain,
  isUsed,
  lastLink,
  missTurn,
  nextChainRound,
  type ChainState,
} from '../src/chain';

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof ChainError ? error.code : 'unexpected';
  }
}

describe('chain', () => {
  it('starts a round from the seed with the starter to play', () => {
    const state = createChain(7, 'o');
    expect(state).toMatchObject({ phase: 'playing', round: 1, turn: 'o', scores: { x: 0, o: 0 } });
    expect(lastLink(state)).toEqual({ footballerId: 7, clubId: null, side: null });
    expect(isUsed(state, 7)).toBe(true);
  });

  it('adds links in turn and remembers the club that connects them', () => {
    let state: ChainState = createChain(7, 'x');
    state = addLink(state, 'x', 8, 100);
    state = addLink(state, 'o', 9, 200);
    expect(state.turn).toBe('x');
    expect(state.chain.map((link) => link.footballerId)).toEqual([7, 8, 9]);
    expect(lastLink(state)).toEqual({ footballerId: 9, clubId: 200, side: 'o' });
    expect(errorOf(() => addLink(state, 'o', 10, 1))).toBe('not-your-turn');
  });

  it('gives the round to the opponent of the player who misses', () => {
    let state = missTurn(createChain(7, 'x'), 'x', 99, 'wrong');
    expect(state).toMatchObject({ phase: 'between', scores: { x: 0, o: 1 } });
    expect(state.misses).toEqual([{ round: 1, side: 'x', footballerId: 99, reason: 'wrong' }]);
    expect(errorOf(() => addLink(state, 'o', 5, 1))).toBe('wrong-phase');
    state = nextChainRound(state, 11);
    expect(state).toMatchObject({ phase: 'playing', round: 2, starter: 'o', turn: 'o' });
    expect(state.chain).toEqual([{ footballerId: 11, clubId: null, side: null }]);
  });

  it('shortens the turn as the chain grows', () => {
    let state: ChainState = createChain(1, 'x');
    expect(chainTurnSeconds(state)).toBe(20);
    for (let id = 2; id < 30; id += 1) {
      state = addLink(state, state.turn, id, 1);
    }
    expect(chainTurnSeconds(state)).toBe(12);
  });

  it('finishes when a player has won enough rounds', () => {
    let state: ChainState = createChain(1, 'x', 2);
    state = missTurn(state, 'x', null, 'timeout');
    state = nextChainRound(state, 2);
    state = missTurn(state, 'o', 3, 'used');
    state = nextChainRound(state, 4);
    state = missTurn(state, 'x', null, 'timeout');
    expect(state.phase).toBe('finished');
    expect(chainWinner(state)).toBe('o');
    expect(errorOf(() => nextChainRound(state, 5))).toBe('wrong-phase');
  });
});
