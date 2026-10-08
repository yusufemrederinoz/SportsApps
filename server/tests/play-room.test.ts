import type { Grid, Header } from '@sportapps/game-core';
import type { PlayMove, PlayResult } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { botLevelFor, createBotName } from '../src/play/bot';
import { parseClientMessage } from '../src/play/messages';
import { TURN_GRACE_MILLISECONDS, createMatchRoom, type MatchRoom } from '../src/play/room';

const club = (referenceId: number): Header => ({ kind: 'club', referenceId });
const GRID: Grid = { id: 77, rows: [club(1), club(2), club(3)], columns: [club(4), club(5), club(6)] };
const TURN = 20000;

const answerFor = (row: number, column: number) => (row + 1) * 10 + column + 4;
const isCorrect = (footballerId: number, row: Header, column: Header) =>
  footballerId === row.referenceId * 10 + column.referenceId;

interface Recorded {
  moves: PlayMove[];
  results: PlayResult[];
}

function startRoom(startingSide: 'x' | 'o' = 'x'): { room: MatchRoom; recorded: Recorded } {
  const recorded: Recorded = { moves: [], results: [] };
  const room = createMatchRoom({
    id: 'match-1',
    kind: 'queue',
    market: 'tr',
    difficulty: 1,
    grid: GRID,
    seats: { x: { userId: 'user-x', username: 'Xavi', rating: 1000 }, o: { userId: 'user-o', username: 'Ozil', rating: 1000 } },
    startingSide,
    library: { isCorrect },
    now: () => Date.now(),
    onMove: (_, move) => recorded.moves.push(move),
    onFinished: (_, result) => recorded.results.push(result),
  });
  room.start();
  return { room, recorded };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('match room', () => {
  it('accepts a correct answer, claims the cell and passes the turn', () => {
    const { room, recorded } = startRoom();
    expect(room.answer('x', 1, { row: 0, column: 0 }, answerFor(0, 0))).toBeNull();
    expect(recorded.moves).toEqual([
      { kind: 'answer', turnNumber: 1, side: 'x', cell: { row: 0, column: 0 }, footballerId: 14, outcome: 'claimed' },
    ]);
    expect(room.state().turn).toBe('o');
    expect(room.state().turnNumber).toBe(2);
    expect(room.turnEndsIn()).toBe(TURN);
  });

  it('judges answers itself, so a wrong footballer never claims a cell', () => {
    const { room, recorded } = startRoom();
    expect(room.answer('x', 1, { row: 0, column: 0 }, 999)).toBeNull();
    expect(recorded.moves[0]).toMatchObject({ outcome: 'wrong' });
    expect(room.state().cells.every((cell) => cell === null)).toBe(true);
    expect(room.state().turn).toBe('o');
  });

  it('rejects a move out of turn, for an old turn or on a taken cell', () => {
    const { room } = startRoom();
    expect(room.answer('o', 1, { row: 0, column: 0 }, 14)).toBe('not-your-turn');
    expect(room.answer('x', 5, { row: 0, column: 0 }, 14)).toBe('stale-turn');
    expect(room.answer('x', 1, { row: 3, column: 0 }, 14)).toBe('invalid-message');
    expect(room.answer('x', 1, { row: 0, column: 0 }, 1.5)).toBe('invalid-message');
    room.answer('x', 1, { row: 0, column: 0 }, 14);
    expect(room.answer('o', 2, { row: 0, column: 0 }, 14)).toBe('cell-taken');
  });

  it('counts a footballer who was already played as a miss', () => {
    const { room, recorded } = startRoom();
    room.answer('x', 1, { row: 0, column: 0 }, 14);
    room.answer('o', 2, { row: 1, column: 0 }, 14);
    expect(recorded.moves[1]).toMatchObject({ outcome: 'already-used', side: 'o' });
  });

  it('skips the turn when the time and the grace period run out', () => {
    const { room, recorded } = startRoom();
    vi.advanceTimersByTime(TURN + TURN_GRACE_MILLISECONDS - 1);
    expect(recorded.moves).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(recorded.moves).toEqual([{ kind: 'timeout', turnNumber: 1, side: 'x' }]);
    expect(room.state().turn).toBe('o');
  });

  it('ends in a draw by cells after four misses in a row', () => {
    const { room, recorded } = startRoom();
    vi.advanceTimersByTime((TURN + TURN_GRACE_MILLISECONDS) * 4);
    expect(recorded.moves).toHaveLength(4);
    expect(recorded.results).toEqual([{ winner: null, reason: 'cells' }]);
    expect(room.finishedAt()).not.toBeNull();
    vi.advanceTimersByTime(TURN * 3);
    expect(recorded.moves).toHaveLength(4);
  });

  it('finishes with a line win and ignores later moves', () => {
    const { room, recorded } = startRoom();
    room.answer('x', 1, { row: 0, column: 0 }, answerFor(0, 0));
    room.answer('o', 2, { row: 1, column: 0 }, answerFor(1, 0));
    room.answer('x', 3, { row: 0, column: 1 }, answerFor(0, 1));
    room.answer('o', 4, { row: 1, column: 1 }, answerFor(1, 1));
    room.answer('x', 5, { row: 0, column: 2 }, answerFor(0, 2));
    expect(recorded.results).toEqual([{ winner: 'x', reason: 'line' }]);
    expect(room.answer('o', 6, { row: 2, column: 2 }, answerFor(2, 2))).toBe('not-in-match');
    expect(room.turnEndsIn()).toBe(0);
  });

  it('gives the win to the other side on a forfeit', () => {
    const { room, recorded } = startRoom();
    room.forfeit('x');
    room.forfeit('o');
    expect(recorded.results).toEqual([{ winner: 'o', reason: 'forfeit' }]);
  });

  it('describes the whole match in a snapshot for a player who reconnects', () => {
    const { room } = startRoom('o');
    room.answer('o', 1, { row: 2, column: 2 }, answerFor(2, 2));
    vi.advanceTimersByTime(5000);
    const snapshot = room.snapshot('x', false);
    expect(snapshot).toMatchObject({
      matchId: 'match-1',
      gridId: 77,
      side: 'x',
      usernames: { x: 'Xavi', o: 'Ozil' },
      startingSide: 'o',
      turnSeconds: 20,
      turnEndsIn: TURN - 5000,
      result: null,
      opponentConnected: false,
    });
    expect(snapshot.moves).toHaveLength(1);
  });
});

describe('bot disguise and level', () => {
  it('builds valid usernames that are not taken', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const taken = new Set<string>();
    for (let index = 0; index < 200; index += 1) {
      const name = createBotName(index % 2 === 0 ? 'tr' : 'de', (candidate) => taken.has(candidate), random);
      expect(name).toMatch(/^[\p{L}\p{N}_]{3,16}$/u);
      expect(taken.has(name)).toBe(false);
      taken.add(name);
    }
  });

  it('follows the chosen difficulty until there is a record to adapt to', () => {
    expect(botLevelFor(2, [])).toBe(2);
    expect(botLevelFor(2, ['win', 'win'])).toBe(2);
  });

  it('plays stronger against a winning player and weaker against a losing one', () => {
    expect(botLevelFor(2, ['win', 'win', 'win', 'loss'])).toBe(3);
    expect(botLevelFor(2, ['loss', 'loss', 'draw', 'loss'])).toBe(1);
    expect(botLevelFor(2, ['win', 'loss', 'win', 'loss'])).toBe(2);
    expect(botLevelFor(3, ['win', 'win', 'win'])).toBe(3);
    expect(botLevelFor(1, ['loss', 'loss', 'loss'])).toBe(1);
  });
});

describe('client message parsing', () => {
  it('accepts well-formed messages', () => {
    expect(parseClientMessage('{"type":"queue","market":"tr","difficulty":2}')).toEqual({
      type: 'queue',
      market: 'tr',
      difficulty: 2,
      game: 'grid',
    });
    expect(parseClientMessage('{"type":"play-bot","market":"tr","difficulty":3,"game":"rare"}')).toEqual({
      type: 'play-bot',
      market: 'tr',
      difficulty: 3,
      game: 'rare',
    });
    expect(parseClientMessage('{"type":"joker","matchId":"m","joker":"hint","target":{"cell":{"row":1,"column":2}}}')).toEqual({
      type: 'joker',
      matchId: 'm',
      joker: 'hint',
      target: { cell: { row: 1, column: 2 } },
    });
    expect(parseClientMessage('{"type":"joker","matchId":"m","joker":"pass"}')).toEqual({
      type: 'joker',
      matchId: 'm',
      joker: 'pass',
      target: {},
    });
    expect(parseClientMessage('{"type":"joker","matchId":"m","joker":"steal"}')).toBeNull();
    expect(parseClientMessage('{"type":"create-room","market":"tr","difficulty":1,"game":"duel"}')).toEqual({
      type: 'create-room',
      market: 'tr',
      difficulty: 1,
      game: 'duel',
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"hand","footballerIds":[4,5]}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'hand', footballerIds: [4, 5] },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"play","footballerId":4}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'play', footballerId: 4 },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"pick","footballerId":4}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'pick', footballerId: 4 },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"choose","footballerId":4}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'choose', footballerId: 4 },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"link","footballerId":4}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'link', footballerId: 4 },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"name","footballerId":4}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'name', footballerId: 4 },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"bid","amount":3}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'bid', amount: 3 },
    });
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"challenge"}}')).toEqual({
      type: 'act',
      matchId: 'm',
      action: { kind: 'challenge' },
    });
    expect(
      parseClientMessage('{"type":"answer","matchId":"m","turnNumber":3,"cell":{"row":1,"column":2},"footballerId":9}'),
    ).toEqual({ type: 'answer', matchId: 'm', turnNumber: 3, cell: { row: 1, column: 2 }, footballerId: 9 });
  });

  it('rejects malformed, unknown or oversized fields', () => {
    expect(parseClientMessage('not json')).toBeNull();
    expect(parseClientMessage('[]')).toBeNull();
    expect(parseClientMessage('{"type":"queue","market":"tr","difficulty":4}')).toBeNull();
    expect(parseClientMessage('{"type":"answer","matchId":"m","turnNumber":"3","cell":{},"footballerId":9}')).toBeNull();
    expect(parseClientMessage(`{"type":"hello","token":"${'a'.repeat(600)}","protocol":1,"dataVersion":"1"}`)).toBeNull();
    expect(parseClientMessage('{"type":"shutdown"}')).toBeNull();
    expect(parseClientMessage('{"type":"queue","market":"tr","difficulty":1,"game":"chess"}')).toBeNull();
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"hand","footballerIds":["4"]}}')).toBeNull();
    expect(parseClientMessage('{"type":"act","matchId":"m","action":{"kind":"fold"}}')).toBeNull();
    expect(
      parseClientMessage(
        JSON.stringify({ type: 'act', matchId: 'm', action: { kind: 'hand', footballerIds: Array.from({ length: 40 }, (_, id) => id) } }),
      ),
    ).toBeNull();
  });
});
