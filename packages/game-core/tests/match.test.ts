import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RULES,
  MatchError,
  countCells,
  createMatch,
  emptyCells,
  forfeit,
  headersAt,
  skipTurn,
  submitAnswer,
  usedFootballerIds,
} from '../src';
import type { AnswerChecker, CellPosition, Grid, MatchState, Side } from '../src';

const grid: Grid = {
  id: 1,
  rows: [
    { kind: 'club', referenceId: 10 },
    { kind: 'club', referenceId: 11 },
    { kind: 'club', referenceId: 12 },
  ],
  columns: [
    { kind: 'club', referenceId: 20 },
    { kind: 'country', referenceId: 30 },
    { kind: 'club', referenceId: 21 },
  ],
};

const always: AnswerChecker = () => true;
const never: AnswerChecker = () => false;

function at(row: number, column: number): CellPosition {
  return { row, column };
}

function play(state: MatchState, moves: [Side, number, number][]): MatchState {
  return moves.reduce(
    (current, [side, row, column], index) => submitAnswer(current, side, at(row, column), 100 + index, always).state,
    state,
  );
}

function expectError(action: () => unknown, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(MatchError);
    expect((error as MatchError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe('createMatch', () => {
  it('starts with an empty board and the default rules', () => {
    const state = createMatch(grid, 'x');
    expect(state.cells).toHaveLength(9);
    expect(emptyCells(state)).toHaveLength(9);
    expect(state.turn).toBe('x');
    expect(state.rules).toEqual(DEFAULT_RULES);
    expect(state.rules.turnSeconds).toBe(20);
    expect(state.result).toBeNull();
  });
});

describe('submitAnswer', () => {
  it('claims the cell and passes the turn on a correct answer', () => {
    const { state, outcome } = submitAnswer(createMatch(grid, 'x'), 'x', at(1, 1), 7, always);
    expect(outcome).toBe('claimed');
    expect(state.cells[4]).toEqual({ side: 'x', footballerId: 7 });
    expect(state.turn).toBe('o');
    expect(state.turnNumber).toBe(2);
  });

  it('asks the checker about the headers of the chosen cell', () => {
    const seen: unknown[] = [];
    const checker: AnswerChecker = (footballerId, row, column) => {
      seen.push([footballerId, row, column]);
      return true;
    };
    submitAnswer(createMatch(grid, 'x'), 'x', at(2, 1), 7, checker);
    expect(seen).toEqual([[7, grid.rows[2], grid.columns[1]]]);
    expect(headersAt(grid, at(2, 1))).toEqual({ row: grid.rows[2], column: grid.columns[1] });
  });

  it('passes the turn without claiming on a wrong answer', () => {
    const { state, outcome } = submitAnswer(createMatch(grid, 'x'), 'x', at(0, 0), 7, never);
    expect(outcome).toBe('wrong');
    expect(state.cells[0]).toBeNull();
    expect(state.turn).toBe('o');
    expect(state.consecutiveMisses).toBe(1);
  });

  it('treats a footballer already on the board as a miss', () => {
    const first = submitAnswer(createMatch(grid, 'x'), 'x', at(0, 0), 7, always).state;
    const { state, outcome } = submitAnswer(first, 'o', at(0, 1), 7, always);
    expect(outcome).toBe('already-used');
    expect(state.cells[1]).toBeNull();
    expect(state.turn).toBe('x');
    expect(usedFootballerIds(state)).toEqual([7]);
  });

  it('rejects moves out of turn, on taken cells and outside the board', () => {
    const state = createMatch(grid, 'x');
    expectError(() => submitAnswer(state, 'o', at(0, 0), 7, always), 'not-your-turn');
    expectError(() => submitAnswer(state, 'x', at(3, 0), 7, always), 'cell-out-of-range');
    const next = submitAnswer(state, 'x', at(0, 0), 7, always).state;
    expectError(() => submitAnswer(next, 'o', at(0, 0), 8, always), 'cell-taken');
  });

  it('ends the match when a side completes a line', () => {
    const state = play(createMatch(grid, 'x'), [
      ['x', 0, 0],
      ['o', 1, 0],
      ['x', 0, 1],
      ['o', 1, 1],
      ['x', 0, 2],
    ]);
    expect(state.result).toEqual({ winner: 'x', reason: 'line' });
    expectError(() => submitAnswer(state, 'o', at(2, 2), 999, always), 'match-finished');
  });

  it('gives a full board without a line to the side with more cells', () => {
    const state = play(createMatch(grid, 'x'), [
      ['x', 0, 0],
      ['o', 0, 1],
      ['x', 0, 2],
      ['o', 1, 1],
      ['x', 1, 0],
      ['o', 1, 2],
      ['x', 2, 1],
      ['o', 2, 0],
      ['x', 2, 2],
    ]);
    expect(countCells(state, 'x')).toBe(5);
    expect(countCells(state, 'o')).toBe(4);
    expect(state.result).toEqual({ winner: 'x', reason: 'cells' });
  });
});

describe('skipTurn', () => {
  it('passes the turn and counts as a miss', () => {
    const state = skipTurn(createMatch(grid, 'x'), 'x');
    expect(state.turn).toBe('o');
    expect(state.consecutiveMisses).toBe(1);
    expectError(() => skipTurn(state, 'x'), 'not-your-turn');
  });

  it('resets the miss counter when a cell is claimed', () => {
    const missed = skipTurn(createMatch(grid, 'x'), 'x');
    const claimed = submitAnswer(missed, 'o', at(0, 0), 7, always).state;
    expect(claimed.consecutiveMisses).toBe(0);
  });

  it('ends a stalled match as a draw when both sides hold the same number of cells', () => {
    let state = createMatch(grid, 'x');
    for (const side of ['x', 'o', 'x', 'o'] as const) {
      state = skipTurn(state, side);
    }
    expect(state.result).toEqual({ winner: null, reason: 'cells' });
  });

  it('ends a stalled match in favour of the side with more cells', () => {
    let state = submitAnswer(createMatch(grid, 'x'), 'x', at(0, 0), 7, always).state;
    for (const side of ['o', 'x', 'o', 'x'] as const) {
      state = skipTurn(state, side);
    }
    expect(state.result).toEqual({ winner: 'x', reason: 'cells' });
  });
});

describe('forfeit', () => {
  it('awards the match to the opponent regardless of whose turn it is', () => {
    const state = forfeit(createMatch(grid, 'x'), 'o');
    expect(state.result).toEqual({ winner: 'x', reason: 'forfeit' });
    expectError(() => forfeit(state, 'x'), 'match-finished');
  });
});
