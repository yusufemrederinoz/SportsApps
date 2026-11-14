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
  roundWinner,
  settleRound,
  takenIds,
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

describe('draft scored by rounds', () => {
  const start = () => createDraft(CLUBS, DRAFT_FORMATION, 'rounds');

  it('keeps picks out of the score until the round is settled, then gives the higher value one point', () => {
    let state = start();
    state = pickFootballer(state, 'x', { footballerId: 1, position: 'FW', value: 40 });
    state = pickFootballer(state, 'o', { footballerId: 2, position: 'FW', value: 12 });
    expect(state.scores).toEqual({ x: 0, o: 0 });
    state = settleRound(state);
    expect(state.scores).toEqual({ x: 1, o: 0 });
    expect(state.winners).toEqual(['x']);
    expect(settleRound(state)).toBe(state);
    state = nextRound(state);
    expect(state.scores).toEqual({ x: 1, o: 0 });
    expect(state.winners).toEqual(['x']);
  });

  it('settles a round that was not settled before moving on', () => {
    let state = start();
    state = pickFootballer(state, 'o', { footballerId: 2, position: 'GK', value: 0 });
    state = nextRound(passRound(state, 'x'));
    expect(state.scores).toEqual({ x: 0, o: 1 });
    expect(state.round).toBe(1);
  });

  it('calls equal values and two missed turns even', () => {
    const lineups = start().lineups;
    expect(roundWinner(lineups, 0)).toBeNull();
    let state = start();
    state = pickFootballer(state, 'x', { footballerId: 1, position: 'MF', value: 7 });
    state = pickFootballer(state, 'o', { footballerId: 1, position: 'MF', value: 7 });
    expect(settleRound(state).scores).toEqual({ x: 0, o: 0 });
    expect(settleRound(state).winners).toEqual([null]);
  });

  it('lets both sides take the same footballer only within one round', () => {
    let state = start();
    state = pickFootballer(state, 'x', { footballerId: 5, position: 'MF', value: 7 });
    expect(takenIds(state)).toEqual([]);
    state = pickFootballer(state, 'o', { footballerId: 5, position: 'MF', value: 7 });
    state = nextRound(state);
    expect(takenIds(state)).toEqual([5, 5]);
    expect(errorOf(() => pickFootballer(state, 'x', { footballerId: 5, position: 'MF', value: 7 }))).toBe('taken');
  });
});
