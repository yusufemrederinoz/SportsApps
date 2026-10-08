export type Side = 'x' | 'o';

export type HeaderKind = 'club' | 'country';

export interface Header {
  kind: HeaderKind;
  referenceId: number;
}

export type HeaderTriple = readonly [Header, Header, Header];

export interface Grid {
  id: number;
  rows: HeaderTriple;
  columns: HeaderTriple;
}

export interface CellPosition {
  row: number;
  column: number;
}

export interface Mark {
  side: Side;
  footballerId: number;
}

export interface MatchRules {
  turnSeconds: number;
  maxConsecutiveMisses: number;
}

export type FinishReason = 'line' | 'cells' | 'misses' | 'second' | 'forfeit';

export interface MatchResult {
  winner: Side | null;
  reason: FinishReason;
}

export interface MatchState {
  grid: Grid;
  rules: MatchRules;
  cells: readonly (Mark | null)[];
  starter: Side;
  turn: Side;
  turnNumber: number;
  consecutiveMisses: number;
  misses: Record<Side, number>;
  result: MatchResult | null;
}

export type AnswerOutcome = 'claimed' | 'wrong' | 'already-used';

export type AnswerChecker = (footballerId: number, row: Header, column: Header) => boolean;

export interface AnswerResult {
  state: MatchState;
  outcome: AnswerOutcome;
}

export type MatchErrorCode = 'match-finished' | 'not-your-turn' | 'cell-out-of-range' | 'cell-taken';
