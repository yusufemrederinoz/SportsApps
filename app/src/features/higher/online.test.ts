import type { HigherView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds } from '@/features/games';

import { finishHigherView, higherCardIds } from './online';

const view: HigherView = {
  phase: 'answering',
  turn: 'x',
  inning: 2,
  totalInnings: 6,
  streak: 1,
  streakLimit: 5,
  question: { metric: 'goals', prefer: 'high', cards: [1, 2] },
  last: {
    side: 'x',
    question: { metric: 'older', prefer: 'low', cards: [2, 3] },
    values: [1980, 1990],
    choice: 2,
    correct: true,
  },
  deadlineIn: 9000,
  scores: { x: 1, o: 0 },
  result: null,
};

describe('higher or lower views', () => {
  it('collects the footballers of the open and the last question once', () => {
    expect(higherCardIds(view)).toEqual([1, 2, 3]);
    expect(gameCardIds({ game: 'higher', view: { ...view, last: null } })).toEqual([1, 2]);
  });

  it('closes a view with the result once', () => {
    const finished = finishHigherView(view, { winner: 'x', reason: 'forfeit' });
    expect(finished).toMatchObject({ phase: 'finished', question: null, result: { winner: 'x' } });
    expect(finishHigherView(finished, { winner: 'o', reason: 'score' })).toBe(finished);
    expect(finishGameView({ game: 'higher', view }, { winner: null, reason: 'score' }).view.result).toEqual({
      winner: null,
      reason: 'score',
    });
  });
});
