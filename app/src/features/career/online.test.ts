import type { CareerView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds } from '@/features/games';

import { careerCardIds, finishCareerView } from './online';

const view: CareerView = {
  phase: 'reveal',
  round: 1,
  totalRounds: 4,
  clues: [{ clubId: 1, firstYear: 2010, lastYear: 2012 }],
  totalClues: 3,
  turn: 'x',
  attemptsLeft: 0,
  points: 0,
  lastGuess: { side: 'o', footballerId: 5, correct: false },
  answer: 9,
  deadlineIn: 3000,
  scores: { x: 0, o: 0 },
  result: null,
};

describe('career path views', () => {
  it('collects the last guess and the answer once', () => {
    expect(careerCardIds(view)).toEqual([5, 9]);
    expect(gameCardIds({ game: 'career', view: { ...view, lastGuess: null, answer: null } })).toEqual([]);
  });

  it('closes a view with the result once', () => {
    const finished = finishCareerView(view, { winner: 'o', reason: 'score' });
    expect(finished).toMatchObject({ phase: 'finished', deadlineIn: 0 });
    expect(finishCareerView(finished, { winner: 'x', reason: 'forfeit' })).toBe(finished);
    expect(finishGameView({ game: 'career', view }, { winner: null, reason: 'score' }).game).toBe('career');
  });
});
