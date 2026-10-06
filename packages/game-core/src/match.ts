import type {
  AnswerChecker,
  AnswerResult,
  CellPosition,
  Grid,
  Header,
  Mark,
  MatchErrorCode,
  MatchResult,
  MatchRules,
  MatchState,
  Side,
} from './types';

export const BOARD_SIZE = 3;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export const DEFAULT_RULES: MatchRules = {
  turnSeconds: 20,
  maxConsecutiveMisses: 4,
};

const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export class MatchError extends Error {
  readonly code: MatchErrorCode;

  constructor(code: MatchErrorCode) {
    super(code);
    this.name = 'MatchError';
    this.code = code;
  }
}

export function createMatch(grid: Grid, startingSide: Side, rules: MatchRules = DEFAULT_RULES): MatchState {
  return {
    grid,
    rules,
    cells: Array.from({ length: CELL_COUNT }, () => null),
    turn: startingSide,
    turnNumber: 1,
    consecutiveMisses: 0,
    result: null,
  };
}

export function opponentOf(side: Side): Side {
  return side === 'x' ? 'o' : 'x';
}

export function cellIndex(position: CellPosition): number {
  const inRange = (value: number) => Number.isInteger(value) && value >= 0 && value < BOARD_SIZE;
  if (!inRange(position.row) || !inRange(position.column)) {
    throw new MatchError('cell-out-of-range');
  }
  return position.row * BOARD_SIZE + position.column;
}

export function headersAt(grid: Grid, position: CellPosition): { row: Header; column: Header } {
  cellIndex(position);
  return { row: grid.rows[position.row] as Header, column: grid.columns[position.column] as Header };
}

export function countCells(state: MatchState, side: Side): number {
  return state.cells.filter((mark) => mark?.side === side).length;
}

export function usedFootballerIds(state: MatchState): number[] {
  return state.cells.flatMap((mark) => (mark ? [mark.footballerId] : []));
}

export function emptyCells(state: MatchState): CellPosition[] {
  return state.cells.flatMap((mark, index) =>
    mark ? [] : [{ row: Math.floor(index / BOARD_SIZE), column: index % BOARD_SIZE }],
  );
}

function hasLine(cells: readonly (Mark | null)[], side: Side): boolean {
  return LINES.some((line) => line.every((index) => cells[index]?.side === side));
}

function settleByCells(state: MatchState): MatchResult {
  const x = countCells(state, 'x');
  const o = countCells(state, 'o');
  return { winner: x === o ? null : x > o ? 'x' : 'o', reason: 'cells' };
}

function assertTurn(state: MatchState, side: Side): void {
  if (state.result) {
    throw new MatchError('match-finished');
  }
  if (state.turn !== side) {
    throw new MatchError('not-your-turn');
  }
}

function passTurn(state: MatchState): MatchState {
  return { ...state, turn: opponentOf(state.turn), turnNumber: state.turnNumber + 1 };
}

function recordMiss(state: MatchState): MatchState {
  const missed = { ...state, consecutiveMisses: state.consecutiveMisses + 1 };
  if (missed.consecutiveMisses >= missed.rules.maxConsecutiveMisses) {
    return { ...missed, result: settleByCells(missed) };
  }
  return passTurn(missed);
}

export function submitAnswer(
  state: MatchState,
  side: Side,
  position: CellPosition,
  footballerId: number,
  isCorrect: AnswerChecker,
): AnswerResult {
  assertTurn(state, side);
  const index = cellIndex(position);
  if (state.cells[index]) {
    throw new MatchError('cell-taken');
  }
  if (usedFootballerIds(state).includes(footballerId)) {
    return { state: recordMiss(state), outcome: 'already-used' };
  }
  const { row, column } = headersAt(state.grid, position);
  if (!isCorrect(footballerId, row, column)) {
    return { state: recordMiss(state), outcome: 'wrong' };
  }

  const cells = state.cells.map((mark, cell) => (cell === index ? { side, footballerId } : mark));
  const claimed: MatchState = { ...state, cells, consecutiveMisses: 0 };
  if (hasLine(cells, side)) {
    return { state: { ...claimed, result: { winner: side, reason: 'line' } }, outcome: 'claimed' };
  }
  if (cells.every((mark) => mark !== null)) {
    return { state: { ...claimed, result: settleByCells(claimed) }, outcome: 'claimed' };
  }
  return { state: passTurn(claimed), outcome: 'claimed' };
}

export function skipTurn(state: MatchState, side: Side): MatchState {
  assertTurn(state, side);
  return recordMiss(state);
}

export function forfeit(state: MatchState, side: Side): MatchState {
  if (state.result) {
    throw new MatchError('match-finished');
  }
  return { ...state, result: { winner: opponentOf(side), reason: 'forfeit' } };
}
