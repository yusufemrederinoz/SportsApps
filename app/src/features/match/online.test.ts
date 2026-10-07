import type { Grid } from '@sportapps/game-core';
import type { MatchSnapshot, PlayMove } from '@sportapps/protocol';
import { describe, expect, it } from 'vitest';

import { applyMove, finishSession, footballerIdsOf, sessionFromSnapshot, unknownFootballer } from './online';
import { startSession, type PlayedFootballer } from './session';

const grid: Grid = {
  id: 9,
  rows: [
    { kind: 'club', referenceId: 1 },
    { kind: 'club', referenceId: 2 },
    { kind: 'club', referenceId: 3 },
  ],
  columns: [
    { kind: 'club', referenceId: 4 },
    { kind: 'club', referenceId: 5 },
    { kind: 'country', referenceId: 6 },
  ],
};

const lookup = (id: number): PlayedFootballer => ({
  id,
  name: `Footballer ${id}`,
  countryCode: 'TR',
  role: 'FW',
  hasPortrait: id % 2 === 1,
});

const claimed = (turnNumber: number, side: 'x' | 'o', row: number, column: number, footballerId: number): PlayMove => ({
  kind: 'answer',
  turnNumber,
  side,
  cell: { row, column },
  footballerId,
  outcome: 'claimed',
});

function snapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return {
    matchId: 'match-1',
    gridId: 9,
    market: 'tr',
    difficulty: 1,
    side: 'o',
    usernames: { x: 'Xavi', o: 'Ozil' },
    startingSide: 'x',
    turnSeconds: 20,
    maxConsecutiveMisses: 4,
    moves: [],
    turnEndsIn: 20000,
    result: null,
    opponentConnected: true,
    ...overrides,
  };
}

describe('applyMove', () => {
  it('claims the cell the server confirmed and uses the server clock for the next turn', () => {
    const session = applyMove(startSession(grid, 'x', 0), claimed(1, 'x', 0, 0, 7), lookup, 90_000);
    expect(session.match.cells[0]).toEqual({ side: 'x', footballerId: 7 });
    expect(session.footballers[7]?.name).toBe('Footballer 7');
    expect(session.feedback).toEqual({ kind: 'correct', side: 'x', footballerName: 'Footballer 7' });
    expect(session.match.turn).toBe('o');
    expect(session.turnEndsAt).toBe(90_000);
  });

  it('shows a rejected answer as wrong without claiming anything', () => {
    const wrong: PlayMove = { ...claimed(1, 'x', 0, 0, 7), outcome: 'wrong' } as PlayMove;
    const session = applyMove(startSession(grid, 'x', 0), wrong, lookup, 5_000);
    expect(session.match.cells.every((cell) => cell === null)).toBe(true);
    expect(session.feedback?.kind).toBe('wrong');
    expect(session.match.turn).toBe('o');
  });

  it('passes the turn on a timeout', () => {
    const session = applyMove(startSession(grid, 'x', 0), { kind: 'timeout', turnNumber: 1, side: 'x' }, lookup, 5_000);
    expect(session.feedback).toEqual({ kind: 'timeout', side: 'x', footballerName: null });
    expect(session.match.turn).toBe('o');
    expect(session.match.consecutiveMisses).toBe(1);
  });

  it('ignores a move that was already applied', () => {
    const first = applyMove(startSession(grid, 'x', 0), claimed(1, 'x', 0, 0, 7), lookup, 5_000);
    expect(applyMove(first, claimed(1, 'x', 0, 0, 7), lookup, 9_000)).toBe(first);
  });
});

describe('sessionFromSnapshot', () => {
  it('starts a fresh match with the time the server has left for the turn', () => {
    const session = sessionFromSnapshot(snapshot({ turnEndsIn: 18_500 }), grid, lookup, 1_000);
    expect(session.match.turn).toBe('x');
    expect(session.match.turnNumber).toBe(1);
    expect(session.turnEndsAt).toBe(19_500);
    expect(session.feedback).toBeNull();
  });

  it('rebuilds the board from the move list after a reconnect without replaying effects', () => {
    const moves: PlayMove[] = [
      claimed(1, 'x', 0, 0, 7),
      { kind: 'timeout', turnNumber: 2, side: 'o' },
      claimed(3, 'x', 1, 1, 8),
    ];
    const session = sessionFromSnapshot(snapshot({ moves, turnEndsIn: 4_000 }), grid, lookup, 50_000);
    expect(session.match.cells[0]).toEqual({ side: 'x', footballerId: 7 });
    expect(session.match.cells[4]).toEqual({ side: 'x', footballerId: 8 });
    expect(session.match.turn).toBe('o');
    expect(session.match.turnNumber).toBe(4);
    expect(Object.keys(session.footballers)).toEqual(['7', '8']);
    expect(session.feedback).toBeNull();
    expect(session.lastClaim).toBeNull();
    expect(session.turnEndsAt).toBe(54_000);
  });

  it('keeps a forfeit result that the moves alone cannot explain', () => {
    const session = sessionFromSnapshot(snapshot({ result: { winner: 'o', reason: 'forfeit' } }), grid, lookup, 0);
    expect(session.match.result).toEqual({ winner: 'o', reason: 'forfeit' });
  });
});

describe('helpers', () => {
  it('ends a running session once and leaves a decided one alone', () => {
    const running = startSession(grid, 'x', 0);
    const ended = finishSession(running, { winner: 'x', reason: 'forfeit' });
    expect(ended.match.result).toEqual({ winner: 'x', reason: 'forfeit' });
    expect(finishSession(ended, { winner: 'o', reason: 'line' })).toBe(ended);
    expect(finishSession(running, null)).toBe(running);
  });

  it('lists each answered footballer once', () => {
    const moves: PlayMove[] = [claimed(1, 'x', 0, 0, 7), { kind: 'timeout', turnNumber: 2, side: 'o' }, claimed(3, 'x', 0, 1, 7)];
    expect(footballerIdsOf(moves)).toEqual([7]);
    expect(unknownFootballer(3)).toEqual({ id: 3, name: '?', countryCode: null, role: null, hasPortrait: false });
  });
});
