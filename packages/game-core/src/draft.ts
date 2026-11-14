import type { Side } from './types';

export type DraftPosition = 'GK' | 'DF' | 'MF' | 'FW';

export const DRAFT_POSITIONS: readonly DraftPosition[] = ['GK', 'DF', 'MF', 'FW'];
export const DRAFT_FORMATION: readonly DraftPosition[] = ['GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW'];

export interface DraftSlot {
  position: DraftPosition;
  footballerId: number | null;
  value: number | null;
  round: number | null;
}

export interface DraftPick {
  footballerId: number;
  position: DraftPosition;
  value: number;
}

export type DraftScoring = 'total' | 'rounds';

export interface DraftState {
  phase: 'playing' | 'finished';
  scoring: DraftScoring;
  clubs: readonly number[];
  round: number;
  lineups: Record<Side, readonly DraftSlot[]>;
  picked: Record<Side, boolean>;
  scores: Record<Side, number>;
  winners: readonly (Side | null)[];
}

type RoundSlot = Pick<DraftSlot, 'footballerId' | 'value' | 'round'>;

export type DraftErrorCode = 'wrong-phase' | 'already-picked' | 'taken' | 'no-slot';

export class DraftError extends Error {
  readonly code: DraftErrorCode;

  constructor(code: DraftErrorCode) {
    super(code);
    this.name = 'DraftError';
    this.code = code;
  }
}

const SIDES: readonly Side[] = ['x', 'o'];

function emptyLineup(formation: readonly DraftPosition[]): DraftSlot[] {
  return formation.map((position) => ({ position, footballerId: null, value: null, round: null }));
}

export function createDraft(
  clubs: readonly number[],
  formation: readonly DraftPosition[] = DRAFT_FORMATION,
  scoring: DraftScoring = 'total',
): DraftState {
  return {
    phase: clubs.length > 0 ? 'playing' : 'finished',
    scoring,
    clubs: [...clubs],
    round: 0,
    lineups: { x: emptyLineup(formation), o: emptyLineup(formation) },
    picked: { x: false, o: false },
    scores: { x: 0, o: 0 },
    winners: [],
  };
}

export function currentClub(state: DraftState): number | null {
  return state.phase === 'playing' ? (state.clubs[state.round] ?? null) : null;
}

export function openPositions(lineup: readonly DraftSlot[]): DraftPosition[] {
  return DRAFT_POSITIONS.filter((position) =>
    lineup.some((slot) => slot.position === position && slot.footballerId === null),
  );
}

export function draftedIds(state: DraftState): number[] {
  return SIDES.flatMap((side) =>
    state.lineups[side].flatMap((slot) => (slot.footballerId === null ? [] : [slot.footballerId])),
  );
}

export function takenIds(state: DraftState): number[] {
  if (state.scoring === 'total') {
    return draftedIds(state);
  }
  return SIDES.flatMap((side) =>
    state.lineups[side].flatMap((slot) =>
      slot.footballerId === null || slot.round === state.round ? [] : [slot.footballerId],
    ),
  );
}

export function roundWinner(lineups: Record<Side, readonly RoundSlot[]>, round: number): Side | null {
  const valueOf = (side: Side) =>
    lineups[side].find((slot) => slot.round === round && slot.footballerId !== null)?.value ?? null;
  const x = valueOf('x');
  const o = valueOf('o');
  if (x === o) {
    return null;
  }
  if (o === null) {
    return 'x';
  }
  if (x === null) {
    return 'o';
  }
  return x > o ? 'x' : 'o';
}

export function settleRound(state: DraftState): DraftState {
  if (state.phase !== 'playing' || state.scoring !== 'rounds' || state.winners.length > state.round) {
    return state;
  }
  const winner = roundWinner(state.lineups, state.round);
  return {
    ...state,
    winners: [...state.winners, winner],
    scores: winner ? { ...state.scores, [winner]: state.scores[winner] + 1 } : state.scores,
  };
}

export function pickFootballer(state: DraftState, side: Side, pick: DraftPick): DraftState {
  if (state.phase !== 'playing') {
    throw new DraftError('wrong-phase');
  }
  if (state.picked[side]) {
    throw new DraftError('already-picked');
  }
  if (takenIds(state).includes(pick.footballerId)) {
    throw new DraftError('taken');
  }
  const lineup = state.lineups[side];
  const index = lineup.findIndex((slot) => slot.position === pick.position && slot.footballerId === null);
  if (index < 0) {
    throw new DraftError('no-slot');
  }
  const filled = lineup.map((slot, slotIndex) =>
    slotIndex === index ? { ...slot, footballerId: pick.footballerId, value: pick.value, round: state.round } : slot,
  );
  return {
    ...state,
    lineups: { ...state.lineups, [side]: filled },
    picked: { ...state.picked, [side]: true },
    scores: state.scoring === 'total' ? { ...state.scores, [side]: state.scores[side] + pick.value } : state.scores,
  };
}

export function passRound(state: DraftState, side: Side): DraftState {
  if (state.phase !== 'playing') {
    throw new DraftError('wrong-phase');
  }
  return state.picked[side] ? state : { ...state, picked: { ...state.picked, [side]: true } };
}

export function roundComplete(state: DraftState): boolean {
  return state.phase === 'playing' && state.picked.x && state.picked.o;
}

export function nextRound(state: DraftState): DraftState {
  if (state.phase !== 'playing') {
    throw new DraftError('wrong-phase');
  }
  const settled = settleRound(state);
  const round = settled.round + 1;
  return {
    ...settled,
    phase: round >= settled.clubs.length ? 'finished' : 'playing',
    round: Math.min(round, settled.clubs.length),
    picked: { x: false, o: false },
  };
}

export function draftWinner(state: DraftState): Side | null {
  if (state.scores.x === state.scores.o) {
    return null;
  }
  return state.scores.x > state.scores.o ? 'x' : 'o';
}
