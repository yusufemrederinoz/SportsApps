import type { DraftView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds, parseGame } from '@/features/games';

import { draftCardIds, finishDraftView } from './online';

const slot = (position: 'GK' | 'DF' | 'MF' | 'FW', footballerId: number | null) => ({
  position,
  footballerId,
  value: footballerId === null ? null : 3,
  round: footballerId === null ? null : 0,
});

const view: DraftView = {
  phase: 'playing',
  metric: 'assists',
  totalRounds: 7,
  round: 2,
  clubs: [1, 2],
  deadlineIn: 20000,
  lineups: { x: [slot('GK', 5), slot('DF', null)], o: [slot('GK', null), slot('DF', 8)] },
  picked: { x: false, o: true },
  scores: { x: 3, o: 3 },
  result: null,
};

describe('draft views', () => {
  it('collects the drafted footballers of both lineups', () => {
    expect(draftCardIds(view)).toEqual([5, 8]);
    expect(gameCardIds({ game: 'draft', view })).toEqual([5, 8]);
  });

  it('closes a view with the result once', () => {
    const finished = finishDraftView(view, { winner: null, reason: 'score' });
    expect(finished).toMatchObject({ phase: 'finished', deadlineIn: 0, result: { winner: null, reason: 'score' } });
    expect(finishDraftView(finished, { winner: 'x', reason: 'forfeit' })).toBe(finished);
    expect(finishGameView({ game: 'draft', view }, { winner: 'o', reason: 'forfeit' })).toMatchObject({
      game: 'draft',
      view: { phase: 'finished' },
    });
  });

  it('reads the game from a route parameter', () => {
    expect(parseGame('draft')).toBe('draft');
    expect(parseGame('chess')).toBe('grid');
    expect(parseGame(undefined)).toBe('grid');
  });
});
