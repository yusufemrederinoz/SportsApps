import type { Grid, Header } from '@sportapps/game-core';
import type { MatchSnapshot, ServerMessage } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import type { FootballLibrary } from '../src/football/library';
import { createGridRoomFactory } from '../src/play/grid-room';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';

const club = (referenceId: number): Header => ({ kind: 'club', referenceId });
const GRID: Grid = { id: 77, rows: [club(1), club(2), club(3)], columns: [club(4), club(5), club(6)] };
const TURN = 20000 + TURN_GRACE_MILLISECONDS;
const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const GRACE = 30000;

const answerFor = (row: number, column: number) => (row + 1) * 10 + column + 4;

const library: FootballLibrary = {
  dataVersion: 'test',
  hasMarket: (market) => market === 'tr' || market === 'empty',
  pickGrid: (market) => (market === 'tr' ? GRID : null),
  isCorrect: (footballerId, row, column) => footballerId % 100 === row.referenceId * 10 + column.referenceId,
  minimumFame: () => 0,
  knownAnswers: (_, grid, positions) =>
    positions.map((position) => {
      const base = (grid.rows[position.row] as Header).referenceId * 10 + (grid.columns[position.column] as Header).referenceId;
      return { position, footballerIds: [base, base + 100] };
    }),
  nearMisses: () => [999],
  duelConcepts: () => [],
  conceptPlayers: () => [],
  conceptMembers: () => [],
  metricRows: () => [],
  comparablePlayers: () => [],
  chainSeeds: () => [],
  sharedClub: () => null,
  chainCandidates: () => [],
  draftClubs: () => [],
  draftEntry: () => null,
  draftCandidates: () => [],
  close: () => undefined,
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  closed: boolean;
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  match(): MatchSnapshot;
}

let database: Database;
let history: MatchHistory;
let lobby: Lobby;
let seed: number;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function join(username?: string): Client {
  const accounts = createAccountService(database, { sessionDays: 90 });
  const { account } = accounts.createGuest();
  const client: Client = {
    player: { id: account.id, username: username ?? account.username },
    received: [],
    closed: false,
    send(message) {
      client.received.push(message);
    },
    close() {
      client.closed = true;
    },
    of(type) {
      return client.received.filter(
        (message): message is Extract<ServerMessage, { type: typeof type }> => message.type === type,
      );
    },
    match() {
      const last = client.of('match').at(-1);
      if (!last) {
        throw new Error('no match received');
      }
      return last.match;
    },
  };
  lobby.connect(client.player, client);
  return client;
}

function reconnect(client: Client): Client {
  const next: Client = { ...client, received: [], closed: false };
  next.send = (message) => {
    next.received.push(message);
  };
  next.close = () => {
    next.closed = true;
  };
  next.of = (type) =>
    next.received.filter((message): message is Extract<ServerMessage, { type: typeof type }> => message.type === type);
  next.match = () => {
    const last = next.of('match').at(-1);
    if (!last) {
      throw new Error('no match received');
    }
    return last.match;
  };
  lobby.connect(next.player, next);
  return next;
}

const queue = (client: Client) => lobby.handle(client.player.id, { type: 'queue', market: 'tr', difficulty: 1 });

function pair(): { x: Client; o: Client; matchId: string; starter: Client; other: Client } {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  const x = first.match().side === 'x' ? first : second;
  const o = x === first ? second : first;
  const starter = first.match().startingSide === 'x' ? x : o;
  return { x, o, matchId: first.match().matchId, starter, other: starter === x ? o : x };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(2_000_000);
  seed = 11;
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { grid: createGridRoomFactory(library) },
    hasMarket: library.hasMarket,
    history,
    random,
    now: () => Date.now(),
    botWaitMilliseconds: BOT_WAIT,
    disconnectGraceMilliseconds: GRACE,
    roomLifetimeMilliseconds: 60000,
  });
});

afterEach(() => {
  lobby.shutdown();
  database.close();
  vi.useRealTimers();
});

describe('matchmaking', () => {
  it('pairs two waiting players into one match on opposite sides', () => {
    const first = join();
    const second = join();
    queue(first);
    expect(first.of('queued')).toHaveLength(1);
    queue(second);

    const mine = first.match();
    const theirs = second.match();
    expect(mine.matchId).toBe(theirs.matchId);
    expect(new Set([mine.side, theirs.side])).toEqual(new Set(['x', 'o']));
    expect(mine.usernames[theirs.side]).toBe(second.player.username);
    expect(mine.gridId).toBe(77);
    expect(mine.turnEndsIn).toBe(20000);
    expect(second.of('queued')).toHaveLength(0);
    expect(lobby.counts()).toMatchObject({ queued: 0, matches: 1 });
  });

  it('never puts a third player into a running match and makes exactly one pairing', () => {
    const clients = [join(), join(), join()];
    clients.forEach(queue);
    expect(clients.filter((client) => client.of('match').length === 1)).toHaveLength(2);
    expect(lobby.counts()).toMatchObject({ queued: 1, matches: 1 });
  });

  it('refuses a second queue entry or match for a player who is already busy', () => {
    const { x } = pair();
    queue(x);
    expect(x.of('error').at(-1)?.code).toBe('busy');

    const waiting = join();
    queue(waiting);
    queue(waiting);
    expect(waiting.of('error').at(-1)?.code).toBe('busy');
    expect(lobby.counts().queued).toBe(1);
  });

  it('takes a player out of the queue on cancel or disconnect', () => {
    const first = join();
    queue(first);
    lobby.handle(first.player.id, { type: 'cancel' });
    expect(first.of('idle')).toHaveLength(1);

    const second = join();
    queue(second);
    lobby.disconnect(second.player.id, second);

    const third = join();
    queue(third);
    expect(third.of('match')).toHaveLength(0);
    expect(lobby.counts()).toMatchObject({ queued: 1, matches: 0 });
  });

  it('rejects unknown markets and reports a market without grids', () => {
    const client = join();
    lobby.handle(client.player.id, { type: 'queue', market: 'zz', difficulty: 1 });
    expect(client.of('error').at(-1)?.code).toBe('invalid-message');

    const first = join();
    const second = join();
    lobby.handle(first.player.id, { type: 'queue', market: 'empty', difficulty: 1 });
    lobby.handle(second.player.id, { type: 'queue', market: 'empty', difficulty: 1 });
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
    expect(second.of('idle')).toHaveLength(1);
    expect(lobby.counts().matches).toBe(0);
  });

  it('replaces an older connection of the same player', () => {
    const first = join();
    queue(first);
    const second = reconnect(first);
    expect(first.closed).toBe(true);
    expect(first.of('error').at(-1)?.code).toBe('replaced');
    expect(second.of('queued')).toHaveLength(1);
    expect(lobby.counts()).toMatchObject({ connected: 1, queued: 1 });
  });
});

describe('playing', () => {
  it('relays every move to both players with the time left for the next turn', () => {
    const { starter, other, matchId } = pair();
    lobby.handle(starter.player.id, {
      type: 'answer',
      matchId,
      turnNumber: 1,
      cell: { row: 0, column: 0 },
      footballerId: answerFor(0, 0),
    });
    for (const client of [starter, other]) {
      expect(client.of('move')).toEqual([
        {
          type: 'move',
          matchId,
          turnEndsIn: 20000,
          move: {
            kind: 'answer',
            turnNumber: 1,
            side: starter.match().side,
            cell: { row: 0, column: 0 },
            footballerId: 14,
            outcome: 'claimed',
          },
        },
      ]);
    }
  });

  it('tells only the sender when a move is not allowed', () => {
    const { starter, other, matchId } = pair();
    lobby.handle(other.player.id, {
      type: 'answer',
      matchId,
      turnNumber: 1,
      cell: { row: 0, column: 0 },
      footballerId: 14,
    });
    expect(other.of('error').at(-1)?.code).toBe('not-your-turn');
    expect(starter.of('error')).toHaveLength(0);
    lobby.handle(other.player.id, { type: 'answer', matchId: 'other', turnNumber: 1, cell: { row: 0, column: 0 }, footballerId: 14 });
    expect(other.of('error').at(-1)?.code).toBe('not-in-match');
  });

  it('finishes the match, stores it for both players and frees them for a new one', () => {
    const { starter, other, matchId } = pair();
    const play = (client: Client, turnNumber: number, row: number, column: number) =>
      lobby.handle(client.player.id, {
        type: 'answer',
        matchId,
        turnNumber,
        cell: { row, column },
        footballerId: answerFor(row, column),
      });
    play(starter, 1, 0, 0);
    play(other, 2, 1, 0);
    play(starter, 3, 0, 1);
    play(other, 4, 1, 1);
    play(starter, 5, 0, 2);

    const result = { winner: starter.match().side, reason: 'line' };
    expect(starter.of('finished')).toEqual([{ type: 'finished', matchId, result }]);
    expect(other.of('finished')).toEqual([{ type: 'finished', matchId, result }]);
    expect(history.list(starter.player.id)).toMatchObject([
      { id: matchId, outcome: 'win', opponent: other.player.username, ownCells: 3, opponentCells: 2, reason: 'line' },
    ]);
    expect(history.list(other.player.id)).toMatchObject([
      { outcome: 'loss', opponent: starter.player.username, ownCells: 2, opponentCells: 3 },
    ]);
    expect(lobby.counts().matches).toBe(0);

    queue(starter);
    expect(starter.of('queued')).toHaveLength(1);
  });

  it('lets a player give up, which hands the win to the opponent', () => {
    const { x, o, matchId } = pair();
    lobby.handle(x.player.id, { type: 'leave', matchId });
    expect(o.of('finished')[0]?.result).toEqual({ winner: 'o', reason: 'forfeit' });
    expect(history.list(x.player.id)[0]).toMatchObject({ outcome: 'loss', reason: 'forfeit' });
  });
});

describe('dropped connections', () => {
  it('keeps the match alive and sends the full state when the player returns in time', () => {
    const { starter, other, matchId } = pair();
    lobby.handle(starter.player.id, {
      type: 'answer',
      matchId,
      turnNumber: 1,
      cell: { row: 0, column: 0 },
      footballerId: answerFor(0, 0),
    });
    lobby.disconnect(other.player.id, other);
    expect(starter.of('opponent').at(-1)).toEqual({ type: 'opponent', matchId, connected: false });

    vi.advanceTimersByTime(GRACE - 1000);
    const back = reconnect(other);
    expect(back.match()).toMatchObject({ matchId, opponentConnected: true });
    expect(back.match().moves).toHaveLength(2);
    expect(starter.of('opponent').at(-1)).toEqual({ type: 'opponent', matchId, connected: true });

    vi.advanceTimersByTime(GRACE);
    expect(starter.of('finished')).toHaveLength(0);
  });

  it('forfeits a player who stays away longer than the grace period', () => {
    const { x, o } = pair();
    lobby.disconnect(o.player.id, o);
    vi.advanceTimersByTime(GRACE);
    expect(x.of('finished')[0]?.result).toEqual({ winner: 'x', reason: 'forfeit' });
    expect(lobby.counts()).toMatchObject({ matches: 0, connected: 1 });
  });
});

describe('bot opponent', () => {
  it('fills an empty queue with a bot that looks like any other player', () => {
    const human = join();
    queue(human);
    vi.advanceTimersByTime(BOT_WAIT.maximum - 1);
    expect(human.of('match')).toHaveLength(0);
    vi.advanceTimersByTime(1);

    const match = human.match();
    const rival = match.usernames[match.side === 'x' ? 'o' : 'x'];
    expect(rival).toMatch(/^[\p{L}\p{N}_]{3,16}$/u);
    expect(rival).not.toBe(human.player.username);
    expect(Object.keys(match)).not.toContain('bot');
    expect(match.opponentConnected).toBe(true);
  });

  it('plays its own turns until the match ends and the result is stored', () => {
    const human = join();
    queue(human);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = human.match().side;

    for (let step = 0; step < 40 && human.of('finished').length === 0; step += 1) {
      vi.advanceTimersByTime(TURN);
    }

    const finished = human.of('finished');
    expect(finished).toHaveLength(1);
    const botMoves = human.of('move').filter((message) => message.move.side !== side);
    expect(botMoves.length).toBeGreaterThan(0);
    expect(botMoves.some((message) => message.move.kind === 'answer')).toBe(true);
    const [stored] = history.list(human.player.id);
    expect(stored).toMatchObject({ opponent: human.match().usernames[side === 'x' ? 'o' : 'x'] });
    expect(lobby.counts().matches).toBe(0);
  });
});

describe('friend rooms', () => {
  it('starts a private match when a friend enters the room code', () => {
    const host = join();
    const friend = join();
    lobby.handle(host.player.id, { type: 'create-room', market: 'tr', difficulty: 2 });
    const code = host.of('room')[0]?.code ?? '';
    expect(code).toMatch(/^[A-Z2-9]{5}$/);

    lobby.handle(friend.player.id, { type: 'join-room', code: code.toLowerCase() });
    expect(host.match().matchId).toBe(friend.match().matchId);
    expect(host.match().difficulty).toBe(2);
    expect(lobby.counts()).toMatchObject({ hosted: 0, matches: 1 });
  });

  it('never pairs a room host with the public queue', () => {
    const host = join();
    const stranger = join();
    lobby.handle(host.player.id, { type: 'create-room', market: 'tr', difficulty: 1 });
    queue(stranger);
    expect(stranger.of('match')).toHaveLength(0);
    expect(host.of('match')).toHaveLength(0);
  });

  it('rejects wrong codes, own codes and codes of hosts who left', () => {
    const host = join();
    const friend = join();
    lobby.handle(host.player.id, { type: 'create-room', market: 'tr', difficulty: 1 });
    const code = host.of('room')[0]?.code ?? '';

    lobby.handle(friend.player.id, { type: 'join-room', code: 'ZZZZZ' });
    expect(friend.of('error').at(-1)?.code).toBe('room-not-found');
    lobby.handle(host.player.id, { type: 'join-room', code });
    expect(host.of('error').at(-1)?.code).toBe('busy');

    lobby.disconnect(host.player.id, host);
    lobby.handle(friend.player.id, { type: 'join-room', code });
    expect(friend.of('error')).toHaveLength(2);
    expect(lobby.counts().matches).toBe(0);
  });

  it('closes a room that nobody joined', () => {
    const host = join();
    lobby.handle(host.player.id, { type: 'create-room', market: 'tr', difficulty: 1 });
    vi.advanceTimersByTime(60000);
    expect(host.of('idle')).toHaveLength(1);
    expect(lobby.counts().hosted).toBe(0);
    queue(host);
    expect(host.of('queued')).toHaveLength(1);
  });
});
