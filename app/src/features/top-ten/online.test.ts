import type { TopTenView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds } from '@/features/games';

import { finishTopTenView, topTenCardIds } from './online';

const view: TopTenView = {
  phase: 'playing',
  round: 1,
  totalRounds: 2,
  list: { kind: 'value', countryId: 43 },
  entries: [
    { rank: 1, footballerId: 7, value: 90, foundBy: 'x' },
    { rank: 2, footballerId: null, value: null, foundBy: null },
  ],
  turn: 'o',
  lives: { x: 3, o: 2 },
  maxLives: 3,
  lastGuess: { side: 'o', footballerId: 12, rank: null },
  deadlineIn: 20000,
  scores: { x: 1, o: 0 },
  result: null,
};

describe('top ten views', () => {
  it('collects the found names and the last guess once', () => {
    expect(topTenCardIds(view)).toEqual([7, 12]);
    expect(gameCardIds({ game: 'top-ten', view: { ...view, lastGuess: null } })).toEqual([7]);
  });

  it('closes a view with the result once', () => {
    const finished = finishTopTenView(view, { winner: 'x', reason: 'score' });
    expect(finished).toMatchObject({ phase: 'finished', deadlineIn: 0 });
    expect(finishTopTenView(finished, { winner: 'o', reason: 'forfeit' })).toBe(finished);
    expect(finishGameView({ game: 'top-ten', view }, { winner: null, reason: 'score' }).game).toBe('top-ten');
  });
});
