import { describe, expect, it } from 'vitest';

import {
  DRAFT_FORMATION,
  DraftError,
  createDraft,
  currentClub,
  draftWinner,
  draftedIds,
  nextRound,
  openPositions,
  passRound,
  pickFootballer,
  roundComplete,
  type DraftState,
} from '../src/draft';

const CLUBS = [10, 20, 30];

function errorOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof DraftError ? error.code : 'unexpected';
  }
}

describe('draft', () => {
  it('starts every lineup empty with the formation and the first club', () => {
    const state = createDraft(CLUBS);
    expect(state.phase).toBe('playing');
    expect(currentClub(state)).toBe(10);
    expect(state.lineups.x.map((slot) => slot.position)).toEqual(DRAFT_FORMATION);
    expect(openPositions(state.lineups.o)).toEqual(['GK', 'DF', 'MF', 'FW']);
    expect(createDraft([]).phase).toBe('finished');
  });

  it('places a pick in the first open slot of its position and adds its value', () => {
    let state = createDraft(CLUBS);
    state = pickFootballer(state, 'x', { footballerId: 7, position: 'DF', value: 12 });
    expect(state.lineups.x[1]).toEqual({ position: 'DF', footballerId: 7, value: 12, round: 0 });
    expect(state.scores).toEqual({ x: 12, o: 0 });
    expect(state.picked).toEqual({ x: true, o: false });
    expect(draftedIds(state)).toEqual([7]);
  });

  it('lets the first player to pick a footballer keep him', () => {
    const state = pickFootballer(createDraft(CLUBS), 'o', { footballerId: 7, position: 'FW', value: 3 });
    expect(errorOf(() => pickFootballer(state, 'x', { footballerId: 7, position: 'FW', value: 3 }))).toBe('taken');
  });

  it('allows one pick per round and only into an open slot', () => {
    let state: DraftState = pickFootballer(createDraft([1, 2, 3]), 'x', { footballerId: 1, position: 'GK', value: 0 });
    expect(errorOf(() => pickFootballer(state, 'x', { footballerId: 2, position: 'DF', value: 0 }))).toBe('already-picked');
    state = nextRound(passRound(state, 'o'));
    expect(errorOf(() => pickFootballer(state, 'x', { footballerId: 2, position: 'GK', value: 0 }))).toBe('no-slot');
    expect(openPositions(state.lineups.x)).toEqual(['DF', 'MF', 'FW']);
  });

  it('completes a round when both picked or passed and moves to the next club', () => {
    let state = createDraft(CLUBS);
    state = passRound(state, 'x');
    expect(roundComplete(state)).toBe(false);
    state = pickFootballer(state, 'o', { footballerId: 4, position: 'MF', value: 9 });
    expect(roundComplete(state)).toBe(true);
    state = nextRound(state);
    expect(currentClub(state)).toBe(20);
    expect(state.picked).toEqual({ x: false, o: false });
    expect(state.lineups.x.every((slot) => slot.footballerId === null)).toBe(true);
  });

  it('finishes after the last club and names the higher total', () => {
    let state = createDraft([5]);
    state = pickFootballer(state, 'x', { footballerId: 1, position: 'FW', value: 40 });
    state = pickFootballer(state, 'o', { footballerId: 2, position: 'FW', value: 41 });
    state = nextRound(state);
    expect(state.phase).toBe('finished');
    expect(currentClub(state)).toBeNull();
    expect(draftWinner(state)).toBe('o');
    expect(errorOf(() => passRound(state, 'x'))).toBe('wrong-phase');
    expect(draftWinner({ ...state, scores: { x: 3, o: 3 } })).toBeNull();
  });
});
