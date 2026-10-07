import type { ChainView, GameView, ServerMessage, SessionSnapshot } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import {
  DEFAULT_CHAIN_TIMING,
  botFailureChance,
  createChainRoomFactory,
  type ChainLibrary,
  type ChainTiming,
} from '../src/play/chain-room';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';

const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: ChainTiming = { ...DEFAULT_CHAIN_TIMING, botThinkMilliseconds: { minimum: 3000, maximum: 3000 } };
const FIRST_TURN = 20000 + TURN_GRACE_MILLISECONDS;
const SEEDS = [1000, 2000, 3000, 4000, 5000, 6000];
const clubOf = (id: number) => Math.floor(id / 1000);

const library: ChainLibrary = {
  chainSeeds: (market) => (market === 'tr' ? SEEDS : []),
  sharedClub: (_, first, second) => (clubOf(first) === clubOf(second) ? clubOf(first) * 10 : null),
  chainCandidates: (_, footballerId, excluded) =>
    Array.from({ length: 20 }, (__, index) => clubOf(footballerId) * 1000 + index + 1).filter((id) => !excluded.includes(id)),
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): ChainView;
}

let database: Database;
let history: MatchHistory;
let lobby: Lobby;
let seed: number;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function chainOf(state: GameView): ChainView {
  if (state.game !== 'chain') {
    throw new Error('not a chain');
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
      return chainOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'chain' });

const say = (client: Client, footballerId: number) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action: { kind: 'link', footballerId } });

const lastId = (view: ChainView) => view.chain.at(-1)?.footballerId as number;

function pair() {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  const active = () => (first.view().turn === first.session().side ? first : second);
  const waiting = () => (active() === first ? second : first);
  return { first, second, active, waiting };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(5_000_000);
  seed = 21;
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { chain: createChainRoomFactory(library, TIMING) },
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

describe('chain matches', () => {
  it('opens with a seed footballer and the full turn time', () => {
    const { first, second } = pair();
    const view = first.view();
    expect(view).toMatchObject({ phase: 'playing', round: 1, roundsToWin: 3, turnSeconds: 20, deadlineIn: 20000, miss: null });
    expect(view.chain).toHaveLength(1);
    expect(SEEDS).toContain(lastId(view));
    expect(second.view()).toEqual(view);
  });

  it('adds a footballer who shares a club and passes the turn', () => {
    const { first, active, waiting } = pair();
    const player = active();
    const other = waiting();
    say(other, lastId(first.view()) + 1);
    expect(other.of('error').at(-1)?.code).toBe('not-your-turn');
    say(player, lastId(first.view()) + 1);
    const view = first.view();
    expect(view.chain.at(-1)).toMatchObject({ side: player.session().side, clubId: clubOf(lastId(view)) * 10 });
    expect(view.turn).toBe(other.session().side);
  });

  it('gives the round to the opponent after a wrong, repeated or missing answer', () => {
    const { first, active } = pair();
    const starter = active();
    const side = starter.session().side;
    say(starter, lastId(first.view()) + 1000);
    expect(first.view()).toMatchObject({ phase: 'reveal', miss: { side, reason: 'wrong' } });
    expect(first.view().scores[side]).toBe(0);
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    const second = first.view();
    expect(second).toMatchObject({ phase: 'playing', round: 2, miss: null });
    expect(second.turn).not.toBe(side);

    const next = active();
    say(next, lastId(first.view()));
    expect(first.view().miss).toMatchObject({ reason: 'used' });
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    vi.advanceTimersByTime(FIRST_TURN);
    expect(first.view().miss).toMatchObject({ reason: 'timeout', footballerId: null });
  });

  it('shortens the turn as the chain grows', () => {
    const { first, active } = pair();
    for (let index = 1; index <= 4; index += 1) {
      say(active(), lastId(first.view()) + index);
    }
    expect(first.view()).toMatchObject({ turnSeconds: 16, deadlineIn: 16000 });
  });

  it('finishes when a player wins three rounds and records the match', () => {
    const { first, second, active } = pair();
    while (first.view().phase !== 'finished') {
      const player = active();
      if (player === second) {
        say(second, 999999);
      } else {
        say(first, lastId(first.view()) + 1);
        say(second, 999999);
      }
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const side = first.session().side;
    expect(first.view().scores[side]).toBe(3);
    expect(first.of('finished')[0]?.result).toEqual({ winner: side, reason: 'score' });
    expect(history.list(first.player.id)[0]).toMatchObject({ game: 'chain', ownCells: 3, outcome: 'win' });
  });

  it('lets the bot answer from footballers it knows', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = client.session().side;
    for (let step = 0; step < 6; step += 1) {
      const view = client.view();
      if (view.phase !== 'playing') {
        vi.advanceTimersByTime(TIMING.revealMilliseconds);
      } else if (view.turn === side) {
        say(client, lastId(view) + 100 + step);
      } else {
        vi.advanceTimersByTime(TIMING.botThinkMilliseconds.maximum);
      }
    }
    const links = client.view().chain.filter((link) => link.side !== null && link.side !== side);
    expect(links.length + client.view().scores[side]).toBeGreaterThan(0);
  });

  it('makes the bot less reliable on long chains and on easy levels', () => {
    expect(botFailureChance(1, 0)).toBeGreaterThan(botFailureChance(3, 0));
    expect(botFailureChance(2, 10)).toBeGreaterThan(botFailureChance(2, 0));
    expect(botFailureChance(1, 100)).toBe(0.9);
  });

  it('reports that no match can be made without seed footballers', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});
