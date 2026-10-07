import { describe, expect, it } from 'vitest';

import {
  CareerError,
  attemptsLeft,
  careerPoints,
  careerWinner,
  createCareer,
  currentMystery,
  guessCareer,
  nextCareerRound,
  type CareerState,
} from '../src/career';

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof CareerError ? error.code : 'unexpected';
  }
}

describe('career path', () => {
  it('opens with one clue and is worth more the fewer clues are open', () => {
    const state = createCareer([{ footballerId: 7, clues: 4 }], 'x');
    expect(currentMystery(state)).toEqual({ footballerId: 7, clues: 4 });
    expect(state).toMatchObject({ revealed: 1, turn: 'x' });
    expect(careerPoints(state)).toBe(4);
    expect(attemptsLeft(state)).toBe(5);
  });

  it('opens the next clue and passes the turn on a wrong or missing guess', () => {
    let state: CareerState = createCareer([{ footballerId: 7, clues: 4 }], 'x');
    state = guessCareer(state, 'x', 99);
    expect(state).toMatchObject({ revealed: 2, turn: 'o', attempts: 1 });
    expect(careerPoints(state)).toBe(3);
    state = guessCareer(state, 'o', null);
    expect(state).toMatchObject({ revealed: 3, turn: 'x' });
    expect(errorOf(() => guessCareer(state, 'o', 7))).toBe('not-your-turn');
  });

  it('scores the right guess with the points of the open clues', () => {
    let state: CareerState = createCareer([{ footballerId: 7, clues: 4 }, { footballerId: 8, clues: 3 }], 'x');
    state = guessCareer(state, 'x', 99);
    state = guessCareer(state, 'o', 7);
    expect(state).toMatchObject({ phase: 'between', scores: { x: 0, o: 3 }, winners: ['o'] });
    state = nextCareerRound(state);
    expect(state).toMatchObject({ round: 1, starter: 'o', turn: 'o', revealed: 1, attempts: 0 });
    expect(currentMystery(state)?.footballerId).toBe(8);
  });

  it('gives one last guess after every clue is open and ends the round without a winner', () => {
    let state: CareerState = createCareer([{ footballerId: 7, clues: 2 }], 'x');
    state = guessCareer(state, 'x', 1);
    expect(state.revealed).toBe(2);
    state = guessCareer(state, 'o', 2);
    expect(state).toMatchObject({ phase: 'playing', revealed: 2, turn: 'x' });
    expect(careerPoints(state)).toBe(1);
    state = guessCareer(state, 'x', 3);
    expect(state).toMatchObject({ phase: 'finished', winners: [null] });
    expect(careerWinner(state)).toBeNull();
    expect(errorOf(() => guessCareer(state, 'o', 7))).toBe('wrong-phase');
  });
});
