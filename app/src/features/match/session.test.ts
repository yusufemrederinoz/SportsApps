import type { Grid } from '@sportapps/game-core';
import { describe, expect, it } from 'vitest';

import { reduceSession, secondsLeft, startSession, type SessionAction } from './session';

const grid: Grid = {
  id: 1,
  rows: [
    { kind: 'club', referenceId: 10 },
    { kind: 'club', referenceId: 11 },
    { kind: 'club', referenceId: 12 },
  ],
  columns: [
    { kind: 'club', referenceId: 20 },
    { kind: 'club', referenceId: 21 },
    { kind: 'country', referenceId: 30 },
  ],
};

function answer(turnNumber: number, row: number, column: number, id: number, correct = true, now = 5_000): SessionAction {
  return {
    type: 'answer',
    turnNumber,
    position: { row, column },
    footballer: { id, name: `Footballer ${id}`, countryCode: 'TR', role: 'MF', hasPortrait: false },
    correct,
    now,
  };
}

describe('startSession', () => {
  it('starts the clock for the first turn', () => {
    const session = startSession(grid, 'o', 1_000);
    expect(session.match.turn).toBe('o');
    expect(session.turnEndsAt).toBe(21_000);
    expect(secondsLeft(session, 1_000)).toBe(20);
    expect(secondsLeft(session, 20_100)).toBe(1);
    expect(secondsLeft(session, 30_000)).toBe(0);
  });
});

describe('reduceSession', () => {
  it('records a correct answer, its name and restarts the clock', () => {
    const session = reduceSession(startSession(grid, 'x', 0), answer(1, 0, 0, 7));
    expect(session.match.cells[0]).toEqual({ side: 'x', footballerId: 7 });
    expect(session.footballers).toEqual({
      7: { id: 7, name: 'Footballer 7', countryCode: 'TR', role: 'MF', hasPortrait: false },
    });
    expect(session.feedback).toEqual({
      kind: 'correct',
      side: 'x',
      footballerName: 'Footballer 7',
      footballerCountryCode: 'TR',
    });
    expect(session.lastClaim).toEqual({ index: 0, side: 'x', turnNumber: 1 });
    expect(session.turnEndsAt).toBe(25_000);
    expect(session.match.turn).toBe('o');
  });

  it('reports a wrong answer without keeping the name', () => {
    const session = reduceSession(startSession(grid, 'x', 0), answer(1, 0, 0, 7, false));
    expect(session.match.cells[0]).toBeNull();
    expect(session.footballers).toEqual({});
    expect(session.lastClaim).toBeNull();
    expect(session.feedback?.kind).toBe('wrong');
    expect(session.match.turn).toBe('o');
  });

  it('reports a footballer that is already on the board', () => {
    const first = reduceSession(startSession(grid, 'x', 0), answer(1, 0, 0, 7));
    const second = reduceSession(first, answer(2, 0, 1, 7));
    expect(second.feedback?.kind).toBe('already-used');
    expect(second.match.cells[1]).toBeNull();
  });

  it('ignores actions from an earlier turn', () => {
    const first = reduceSession(startSession(grid, 'x', 0), answer(1, 0, 0, 7));
    expect(reduceSession(first, answer(1, 0, 1, 8))).toBe(first);
    expect(reduceSession(first, { type: 'skip', turnNumber: 1, reason: 'timeout', now: 9_000 })).toBe(first);
  });

  it('ignores an answer for a cell that is already taken', () => {
    const first = reduceSession(startSession(grid, 'x', 0), answer(1, 0, 0, 7));
    expect(reduceSession(first, answer(2, 0, 0, 8))).toBe(first);
  });

  it('passes the turn on a timeout', () => {
    const session = reduceSession(startSession(grid, 'x', 0), { type: 'skip', turnNumber: 1, reason: 'timeout', now: 20_000 });
    expect(session.feedback).toEqual({
      kind: 'timeout',
      side: 'x',
      footballerName: null,
      footballerCountryCode: null,
    });
    expect(session.match.turn).toBe('o');
    expect(session.turnEndsAt).toBe(40_000);
  });

  it('stops accepting actions once the match is over', () => {
    let session = startSession(grid, 'x', 0);
    const moves: [number, number][] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ];
    moves.forEach(([row, column], index) => {
      session = reduceSession(session, answer(index + 1, row, column, 100 + index));
    });
    expect(session.match.result).toEqual({ winner: 'x', reason: 'line' });
    expect(reduceSession(session, answer(session.match.turnNumber, 2, 2, 999))).toBe(session);
  });
});
