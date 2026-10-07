import type { RareView } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { finishGameView, gameCardIds } from '@/features/games';

import { finishRareView, rareCardIds } from './online';

const club = (referenceId: number) => ({ kind: 'club' as const, referenceId });

const view: RareView = {
  phase: 'answering',
  round: 2,
  totalRounds: 5,
  criteria: { row: club(1), column: club(2) },
  answered: { x: true, o: false },
  own: 7,
  rounds: [
    {
      criteria: { row: club(3), column: club(4) },
      answers: { x: { footballerId: 5, correct: true, fame: 30 }, o: { footballerId: null, correct: false, fame: null } },
      winner: 'x',
    },
  ],
  deadlineIn: 20000,
  scores: { x: 1, o: 0 },
  result: null,
};

describe('least known views', () => {
  it('collects the own answer and every revealed answer once', () => {
    expect(rareCardIds(view)).toEqual([7, 5]);
    expect(gameCardIds({ game: 'rare', view: { ...view, own: null } })).toEqual([5]);
  });

  it('closes a view with the result once', () => {
    const finished = finishRareView(view, { winner: 'x', reason: 'score' });
    expect(finished).toMatchObject({ phase: 'finished', criteria: null });
    expect(finishRareView(finished, { winner: 'o', reason: 'forfeit' })).toBe(finished);
    expect(finishGameView({ game: 'rare', view }, { winner: null, reason: 'score' }).game).toBe('rare');
  });
});
