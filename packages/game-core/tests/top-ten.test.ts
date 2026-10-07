import { describe, expect, it } from 'vitest';

import {
  TopTenError,
  createTopTen,
  currentList,
  guessTopTen,
  nextTopTenRound,
  rankOf,
  topTenWinner,
  type TopTenRound,
  type TopTenState,
} from '../src/top-ten';

const list = (name: string, size = 10): TopTenRound<string> => ({
  list: name,
  entries: Array.from({ length: size }, (_, index) => ({ footballerId: 100 + index, value: 1000 - index })),
});

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof TopTenError ? error.code : 'unexpected';
  }
}

describe('top ten', () => {
  it('scores a new name by its rank and passes the turn', () => {
    let state: TopTenState<string> = createTopTen([list('a')], 'x');
    expect(currentList(state)?.list).toBe('a');
    expect(rankOf(state, 109)).toBe(10);
    state = guessTopTen(state, 'x', 109);
    expect(state).toMatchObject({ turn: 'o', scores: { x: 10, o: 0 }, lives: { x: 3, o: 3 } });
    expect(state.found[9]).toBe('x');
    expect(errorOf(() => guessTopTen(state, 'x', 100))).toBe('not-your-turn');
  });

  it('takes a life for a wrong, repeated or missing name', () => {
    let state: TopTenState<string> = createTopTen([list('a')], 'x');
    state = guessTopTen(state, 'x', 100);
    state = guessTopTen(state, 'o', 100);
    state = guessTopTen(state, 'x', 999);
    state = guessTopTen(state, 'o', null);
    expect(state.lives).toEqual({ x: 2, o: 1 });
    expect(state.scores).toEqual({ x: 1, o: 0 });
    expect(state.guesses.map((guess) => guess.rank)).toEqual([1, null, null, null]);
  });

  it('lets the player with lives left keep playing and ends the round when nobody has lives', () => {
    let state: TopTenState<string> = createTopTen([list('a'), list('b')], 'x', 1);
    state = guessTopTen(state, 'x', null);
    expect(state.turn).toBe('o');
    state = guessTopTen(state, 'o', 105);
    expect(state.turn).toBe('o');
    state = guessTopTen(state, 'o', null);
    expect(state.phase).toBe('between');
    state = nextTopTenRound(state);
    expect(state).toMatchObject({ round: 1, turn: 'o', starter: 'o', lives: { x: 1, o: 1 }, scores: { x: 0, o: 6 } });
    expect(state.found.every((owner) => owner === null)).toBe(true);
  });

  it('ends the round when the list is complete and the match after the last list', () => {
    let state: TopTenState<string> = createTopTen([list('a', 2)], 'o');
    state = guessTopTen(state, 'o', 100);
    state = guessTopTen(state, 'x', 101);
    expect(state.phase).toBe('finished');
    expect(topTenWinner(state)).toBe('x');
    expect(errorOf(() => guessTopTen(state, 'o', 100))).toBe('wrong-phase');
    expect(errorOf(() => nextTopTenRound(state))).toBe('wrong-phase');
  });
});
