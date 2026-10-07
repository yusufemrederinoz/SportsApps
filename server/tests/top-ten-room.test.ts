import type { GameView, ServerMessage, SessionSnapshot, TopTenListView, TopTenView } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import type { LiveRoom } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';
import {
  DEFAULT_TOP_TEN_TIMING,
  createTopTenRoomFactory,
  prepareLists,
  type TopTenLibrary,
  type TopTenTiming,
} from '../src/play/top-ten-room';
import { capturing, lastRoom } from './capture';

const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: TopTenTiming = { ...DEFAULT_TOP_TEN_TIMING, botThinkMilliseconds: { minimum: 2000, maximum: 2000 } };
const TURN_TIMEOUT = TIMING.turnMilliseconds + TURN_GRACE_MILLISECONDS;
const LISTS: TopTenListView[] = [
  { kind: 'value', countryId: 1 },
  { kind: 'goals', countryId: 2 },
  { kind: 'clubGoals', clubId: 3 },
  { kind: 'clubGoals', clubId: 4 },
];
const keyOf = (list: TopTenListView) => (list.kind === 'clubGoals' ? list.clubId : list.countryId);

const library: TopTenLibrary = {
  topTenLists: (market) => (market === 'tr' ? LISTS : []),
  ranking: (list, limit) =>
    keyOf(list) === 4
      ? []
      : Array.from({ length: Math.min(limit, 15) }, (_, index) => ({ id: keyOf(list) * 100 + index + 1, value: 500 - index })),
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): TopTenView;
}

let database: Database;
let history: MatchHistory;
let lobby: Lobby;
let seed: number;
let rooms: LiveRoom[];

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function topTenOf(state: GameView): TopTenView {
  if (state.game !== 'top-ten') {
    throw new Error('not a top ten');
  }
  return state.view;
}

function join(): Client {
  const { account } = createAccountService(database, { sessionDays: 90 }).createGuest();
  const client: Client = {
    player: { id: account.id, username: account.username },
    received: [],
    send(message) {
      client.received.push(message);
    },
    close: () => undefined,
    of(type) {
      return client.received.filter(
        (message): message is Extract<ServerMessage, { type: typeof type }> => message.type === type,
      );
    },
    session() {
      const last = client.of('session').at(-1);
      if (!last) {
        throw new Error('no session received');
      }
      return last.session;
    },
    view() {
      return topTenOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'top-ten' });

const name = (client: Client, footballerId: number) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action: { kind: 'name', footballerId } });

const entryId = (client: Client, rank: number) => keyOf(client.view().list) * 100 + rank;

function pair() {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  const active = () => (first.view().turn === first.session().side ? first : second);
  return { first, second, active };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(8_000_000);
  seed = 23;
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { 'top-ten': capturing(createTopTenRoomFactory(library, TIMING), rooms) },
    hasMarket: (market) => market === 'tr' || market === 'empty',
    history,
    random,
    now: () => Date.now(),
    botWaitMilliseconds: BOT_WAIT,
  });
});

afterEach(() => {
  lobby.shutdown();
  database.close();
  vi.useRealTimers();
});

describe('top ten setup', () => {
  it('prepares two lists of ten with near misses and skips short lists', () => {
    const prepared = prepareLists(library, 'tr', () => 0.99);
    expect(prepared).toHaveLength(2);
    prepared.forEach((list) => {
      expect(list.round.entries).toHaveLength(10);
      expect(list.nearMisses).toHaveLength(5);
      expect(keyOf(list.round.list)).not.toBe(4);
    });
  });
});

describe('top ten matches', () => {
  it('hides the list until names are found and scores a found name by its rank', () => {
    const { first, active } = pair();
    const view = first.view();
    expect(view).toMatchObject({ phase: 'playing', round: 1, totalRounds: 2, lives: { x: 3, o: 3 }, maxLives: 3 });
    expect(view.entries.every((entry) => entry.footballerId === null && entry.value === null)).toBe(true);
    const player = active();
    name(player, entryId(player, 7));
    const after = first.view();
    expect(after.entries[6]).toMatchObject({ rank: 7, footballerId: entryId(player, 7), foundBy: player.session().side });
    expect(after.scores[player.session().side]).toBe(7);
    expect(after.lastGuess).toMatchObject({ rank: 7 });
    expect(after.turn).not.toBe(player.session().side);
  });

  it('takes a life for a wrong name or a turn that runs out', () => {
    const { first, active } = pair();
    const player = active();
    const side = player.session().side;
    name(player, 99999);
    expect(first.view().lives[side]).toBe(2);
    vi.advanceTimersByTime(TURN_TIMEOUT);
    const other = side === 'x' ? 'o' : 'x';
    expect(first.view().lives[other]).toBe(2);
    expect(first.view().lastGuess).toMatchObject({ side: other, footballerId: null, rank: null });
  });

  it('gives an extra life and the initials of a name still hidden', () => {
    const { first } = pair();
    const side = first.session().side;
    const room = lastRoom(rooms);
    expect(room.useJoker(side, 'extra-life', {})).toEqual({ reveal: { kind: 'life', lives: 4 } });
    expect(first.view().lives[side]).toBe(4);
    const hint = room.useJoker(side, 'first-letter', {});
    expect(hint).toMatchObject({ reveal: { kind: 'initials', birthYear: false } });
    const hinted = 'reveal' in hint && hint.reveal.kind === 'initials' ? hint.reveal.footballerId : 0;
    expect(Math.floor(hinted / 100)).toBe(keyOf(first.view().list));
    expect(room.useJoker(side, 'nationality', {})).toEqual({ error: 'joker-unavailable' });
  });

  it('reveals the whole list at the end of a round and moves to the next list', () => {
    const { first, active } = pair();
    for (let rank = 1; rank <= 10; rank += 1) {
      name(active(), entryId(first, rank));
    }
    const view = first.view();
    expect(view.phase).toBe('reveal');
    expect(view.entries.every((entry) => entry.footballerId !== null)).toBe(true);
    const listBefore = view.list;
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ phase: 'playing', round: 2 });
    expect(first.view().list).not.toEqual(listBefore);
  });

  it('finishes after two lists and records the match', () => {
    const { first, second, active } = pair();
    for (let round = 0; round < 2; round += 1) {
      for (let step = 0; step < 30 && first.view().phase === 'playing'; step += 1) {
        const player = active();
        const open = first.view().entries.filter((entry) => entry.foundBy === null).at(-1);
        name(player, player === first && open ? entryId(first, open.rank) : 99999);
      }
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const side = first.session().side;
    expect(first.of('finished')[0]?.result).toEqual({ winner: side, reason: 'score' });
    expect(history.list(second.player.id)[0]).toMatchObject({ game: 'top-ten', outcome: 'loss' });
  });

  it('lets the bot name what it knows and miss when it runs out', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = client.session().side;
    for (let step = 0; step < 80 && client.view().phase !== 'finished'; step += 1) {
      const view = client.view();
      if (view.phase === 'playing' && view.turn === side) {
        name(client, 99999);
      } else {
        vi.advanceTimersByTime(1000);
      }
    }
    expect(client.view().phase).toBe('finished');
    const rival = side === 'x' ? 'o' : 'x';
    expect(client.view().scores[rival]).toBeGreaterThan(0);
  });

  it('reports that no match can be made without lists', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});
