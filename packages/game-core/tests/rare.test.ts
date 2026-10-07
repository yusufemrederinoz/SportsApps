import { describe, expect, it } from 'vitest';

import {
  NO_ANSWER,
  RareError,
  createRare,
  currentCriteria,
  rareRoundReady,
  rareRoundWinner,
  rareWinner,
  resolveRareRound,
  submitRareAnswer,
  type RareState,
} from '../src/rare';

const right = (footballerId: number, fame: number) => ({ footballerId, correct: true, fame });
const wrong = (footballerId: number) => ({ footballerId, correct: false, fame: 40 });

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof RareError ? error.code : 'unexpected';
  }
}

describe('least known', () => {
  it('gives the round to the less known right answer, or to the only right answer', () => {
    expect(rareRoundWinner({ x: right(1, 30), o: right(2, 70) })).toBe('x');
    expect(rareRoundWinner({ x: right(1, 30), o: right(2, 30) })).toBeNull();
    expect(rareRoundWinner({ x: wrong(1), o: right(2, 90) })).toBe('o');
    expect(rareRoundWinner({ x: right(1, 0), o: NO_ANSWER })).toBe('x');
    expect(rareRoundWinner({ x: wrong(1), o: NO_ANSWER })).toBeNull();
  });

  it('collects one hidden answer per player and resolves the round', () => {
    let state: RareState<string> = createRare(['a', 'b']);
    expect(currentCriteria(state)).toBe('a');
    state = submitRareAnswer(state, 'x', right(5, 20));
    expect(rareRoundReady(state)).toBe(false);
    expect(errorOf(() => submitRareAnswer(state, 'x', right(6, 10)))).toBe('already-answered');
    state = submitRareAnswer(state, 'o', right(7, 60));
    expect(rareRoundReady(state)).toBe(true);
    state = resolveRareRound(state);
    expect(state.rounds[0]).toMatchObject({ criteria: 'a', winner: 'x' });
    expect(state.scores).toEqual({ x: 1, o: 0 });
    expect(currentCriteria(state)).toBe('b');
    expect(state.pending).toEqual({});
  });

  it('counts a missing answer as no answer and finishes after the last criteria', () => {
    let state: RareState<string> = createRare(['a']);
    state = submitRareAnswer(state, 'o', wrong(3));
    state = resolveRareRound(state);
    expect(state.rounds[0]?.answers.x).toEqual(NO_ANSWER);
    expect(state.phase).toBe('finished');
    expect(rareWinner(state)).toBeNull();
    expect(errorOf(() => submitRareAnswer(state, 'x', right(1, 1)))).toBe('wrong-phase');
    expect(errorOf(() => resolveRareRound(state))).toBe('wrong-phase');
  });
});
