import {
  DEFAULT_RULES,
  MatchError,
  createMatch,
  forfeit,
  skipTurn,
  submitAnswer,
  type CellPosition,
  type Grid,
  type MatchRules,
  type MatchState,
  type Side,
} from '@sportapps/game-core';
import type {
  MatchSnapshot,
  PlayDifficulty,
  PlayErrorCode,
  PlayMove,
  PlayResult,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import type { MatchKind, Seat } from './live-room';

export const TURN_GRACE_MILLISECONDS = 1500;
const SECOND = 1000;

export interface RoomOptions {
  id: string;
  kind: MatchKind;
  market: string;
  difficulty: PlayDifficulty;
  grid: Grid;
  seats: Record<Side, Seat>;
  startingSide: Side;
  rules?: MatchRules;
  library: Pick<FootballLibrary, 'isCorrect'>;
  now: () => number;
  onMove: (room: MatchRoom, move: PlayMove) => void;
  onFinished: (room: MatchRoom, result: PlayResult) => void;
}

export interface MatchRoom {
  readonly id: string;
  readonly kind: MatchKind;
  readonly market: string;
  readonly difficulty: PlayDifficulty;
  readonly grid: Grid;
  readonly seats: Record<Side, Seat>;
  readonly startedAt: number;
  state(): MatchState;
  moves(): readonly PlayMove[];
  finishedAt(): number | null;
  turnEndsIn(): number;
  sideOf(userId: string): Side | null;
  start(): void;
  answer(side: Side, turnNumber: number, cell: CellPosition, footballerId: number): PlayErrorCode | null;
  forfeit(side: Side): void;
  snapshot(side: Side, opponentConnected: boolean): MatchSnapshot;
  dispose(): void;
}

const MATCH_ERRORS: Record<MatchError['code'], PlayErrorCode> = {
  'match-finished': 'not-in-match',
  'not-your-turn': 'not-your-turn',
  'cell-out-of-range': 'invalid-message',
  'cell-taken': 'cell-taken',
};

export function createMatchRoom(options: RoomOptions): MatchRoom {
  const { id, kind, market, difficulty, grid, seats, startingSide, library, now } = options;
  const rules = options.rules ?? DEFAULT_RULES;
  const turnMilliseconds = rules.turnSeconds * SECOND;
  const startedAt = now();
  const moves: PlayMove[] = [];
  let state = createMatch(grid, startingSide, rules);
  let turnDeadline = startedAt + turnMilliseconds;
  let finishedAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stopTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const finish = (result: PlayResult) => {
    stopTimer();
    finishedAt = now();
    options.onFinished(room, result);
  };

  const startTurn = () => {
    stopTimer();
    turnDeadline = now() + turnMilliseconds;
    timer = setTimeout(expireTurn, turnMilliseconds + TURN_GRACE_MILLISECONDS);
  };

  const record = (move: PlayMove) => {
    moves.push(move);
    if (state.result) {
      stopTimer();
    } else {
      startTurn();
    }
    options.onMove(room, move);
    if (state.result) {
      finish(state.result);
    }
  };

  function expireTurn(): void {
    if (state.result) {
      return;
    }
    const side = state.turn;
    const turnNumber = state.turnNumber;
    state = skipTurn(state, side);
    record({ kind: 'timeout', turnNumber, side });
  }

  const room: MatchRoom = {
    id,
    kind,
    market,
    difficulty,
    grid,
    seats,
    startedAt,

    state: () => state,
    moves: () => moves,
    finishedAt: () => finishedAt,
    turnEndsIn: () => (state.result ? 0 : Math.max(0, turnDeadline - now())),

    sideOf(userId) {
      if (seats.x.userId === userId) {
        return 'x';
      }
      return seats.o.userId === userId ? 'o' : null;
    },

    start() {
      startTurn();
    },

    answer(side, turnNumber, cell, footballerId) {
      if (state.result) {
        return 'not-in-match';
      }
      if (turnNumber !== state.turnNumber) {
        return 'stale-turn';
      }
      if (!Number.isSafeInteger(footballerId) || footballerId <= 0) {
        return 'invalid-message';
      }
      try {
        const answered = submitAnswer(state, side, cell, footballerId, library.isCorrect);
        state = answered.state;
        record({
          kind: 'answer',
          turnNumber,
          side,
          cell: { row: cell.row, column: cell.column },
          footballerId,
          outcome: answered.outcome,
        });
        return null;
      } catch (error) {
        if (error instanceof MatchError) {
          return MATCH_ERRORS[error.code];
        }
        throw error;
      }
    },

    forfeit(side) {
      if (state.result) {
        return;
      }
      state = forfeit(state, side);
      if (state.result) {
        finish(state.result);
      }
    },

    snapshot(side, opponentConnected) {
      return {
        matchId: id,
        gridId: grid.id,
        market,
        difficulty,
        side,
        usernames: { x: seats.x.username, o: seats.o.username },
        startingSide,
        turnSeconds: rules.turnSeconds,
        maxConsecutiveMisses: rules.maxConsecutiveMisses,
        moves: [...moves],
        turnEndsIn: room.turnEndsIn(),
        result: state.result,
        opponentConnected,
      };
    },

    dispose() {
      stopTimer();
    },
  };

  return room;
}
