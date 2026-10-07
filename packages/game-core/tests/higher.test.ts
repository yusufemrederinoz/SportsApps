import { describe, expect, it } from 'vitest';

import {
  HigherError,
  answerQuestion,
  betterCard,
  createHigher,
  higherWinner,
  type HigherQuestion,
  type HigherState,
} from '../src/higher';

const question = (values: [number, number], prefer: 'high' | 'low' = 'high'): HigherQuestion => ({
  metric: 'goals',
  prefer,
  cards: [10, 20],
  values,
});

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof HigherError ? error.code : 'unexpected';
  }
}

describe('higher or lower', () => {
  it('knows the better card for both directions and ties', () => {
    expect(betterCard(question([5, 9]))).toBe(20);
    expect(betterCard(question([1980, 1975], 'low'))).toBe(20);
    expect(betterCard(question([4, 4]))).toBeNull();
  });

  it('keeps the turn while the player is right and scores each right answer', () => {
    let state: HigherState = createHigher('x');
    state = answerQuestion(state, 'x', question([5, 9]), 20);
    state = answerQuestion(state, 'x', question([9, 5]), 10);
    expect(state).toMatchObject({ turn: 'x', streak: 2, inning: 0, scores: { x: 2, o: 0 } });
    expect(state.answers.map((answer) => answer.correct)).toEqual([true, true]);
  });

  it('passes the turn on a wrong answer, a missed answer or a full streak', () => {
    let state: HigherState = createHigher('x', 3, 2);
    state = answerQuestion(state, 'x', question([5, 9]), 10);
    expect(state).toMatchObject({ turn: 'o', inning: 1, streak: 0, scores: { x: 0, o: 0 } });
    state = answerQuestion(state, 'o', question([5, 9]), null);
    expect(state).toMatchObject({ turn: 'x', inning: 2 });
    state = answerQuestion(state, 'x', question([5, 9]), 20);
    state = answerQuestion(state, 'x', question([5, 9]), 20);
    expect(state).toMatchObject({ turn: 'o', inning: 3, streak: 0, scores: { x: 2, o: 0 } });
  });

  it('refuses answers out of turn, cards that were not shown and answers after the end', () => {
    const state = createHigher('o', 1);
    expect(errorOf(() => answerQuestion(state, 'x', question([1, 2]), 20))).toBe('not-your-turn');
    expect(errorOf(() => answerQuestion(state, 'o', question([1, 2]), 99))).toBe('not-a-choice');
    const missed = answerQuestion(state, 'o', question([1, 2]), 10);
    const done = answerQuestion(answerQuestion(missed, 'x', question([1, 2]), 20), 'x', question([1, 2]), 10);
    expect(done.phase).toBe('finished');
    expect(higherWinner(done)).toBe('x');
    expect(errorOf(() => answerQuestion(done, 'o', question([1, 2]), 20))).toBe('wrong-phase');
  });

  it('gives every player the same number of innings', () => {
    let state: HigherState = createHigher('x', 2);
    const sides: string[] = [];
    while (state.phase === 'playing') {
      sides.push(state.turn);
      state = answerQuestion(state, state.turn, question([1, 2]), null);
    }
    expect(sides).toEqual(['x', 'o', 'x', 'o']);
    expect(higherWinner(state)).toBeNull();
  });
});
