import type { Grid, Header } from '@sportapps/game-core';
import type { AuctionView, GameView, ServerMessage, SessionSnapshot } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import {
  DEFAULT_AUCTION_TIMING,
  botTarget,
  createAuctionRoomFactory,
  richCells,
  type AuctionLibrary,
  type AuctionTiming,
} from '../src/play/auction-room';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';

const club = (referenceId: number): Header => ({ kind: 'club', referenceId });
const GRID: Grid = { id: 3, rows: [club(1), club(2), club(3)], columns: [club(4), club(5), club(6)] };
const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: AuctionTiming = {
  ...DEFAULT_AUCTION_TIMING,
  botBidMilliseconds: { minimum: 2000, maximum: 2000 },
  botNameMilliseconds: { minimum: 1000, maximum: 1000 },
};
const BID_TIMEOUT = TIMING.bidMilliseconds + TURN_GRACE_MILLISECONDS;

const cellOf = (row: Header, column: Header) => row.referenceId * 10 + column.referenceId;
const answer = (row: Header, column: Header, index: number) => cellOf(row, column) * 100 + index;

const library: AuctionLibrary = {
  pickGrid: (market) => (market === 'tr' ? GRID : null),
  isCorrect: (id, row, column) => Math.floor(id / 100) === cellOf(row, column),
  answerCount: (_, row) => (row.referenceId === 3 ? 2 : 10),
  answersFor: (_, row, column) => Array.from({ length: 10 }, (__, index) => answer(row, column, index + 1)),
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): AuctionView;
}

let database: Database;
let history: MatchHistory;
let lobby: Lobby;
let seed: number;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function auctionOf(state: GameView): AuctionView {
  if (state.game !== 'auction') {
    throw new Error('not an auction');
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
      return auctionOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'auction' });

const act = (client: Client, action: { kind: 'bid'; amount: number } | { kind: 'challenge' } | { kind: 'name'; footballerId: number }) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action });

function rightName(client: Client, index: number): number {
  const criteria = client.view().criteria;
  if (!criteria) {
    throw new Error('no criteria');
  }
  return answer(criteria.row as Header, criteria.column as Header, index);
}

function pair() {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  const active = () => (first.view().turn === first.session().side ? first : second);
  const other = () => (active() === first ? second : first);
  return { first, second, active, other };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(7_000_000);
  seed = 17;
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { auction: createAuctionRoomFactory(library, TIMING) },
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

describe('auction setup', () => {
  it('only uses cells with enough known answers', () => {
    const cells = richCells(library, 'tr', GRID);
    expect(cells).toHaveLength(6);
    expect(cells.every((cell) => cell.row.referenceId !== 3)).toBe(true);
  });

  it('lets stronger bots bid closer to what they know', () => {
    expect(botTarget(10, 3, () => 0.9)).toBe(7);
    expect(botTarget(10, 1, () => 0.9)).toBe(3);
    expect(botTarget(10, 1, () => 0)).toBe(4);
    expect(botTarget(0, 2, () => 0.9)).toBe(1);
  });
});

describe('auction matches', () => {
  it('takes rising bids in turn', () => {
    const { first, active, other } = pair();
    expect(first.view()).toMatchObject({ phase: 'bidding', round: 1, bid: 0, bidder: null, phaseSeconds: 15 });
    const opener = active();
    act(other(), { kind: 'bid', amount: 2 });
    expect(other().of('error').at(-1)?.code).toBe('not-your-turn');
    act(opener, { kind: 'challenge' });
    expect(opener.of('error').at(-1)?.code).toBe('invalid-action');
    act(opener, { kind: 'bid', amount: 3 });
    expect(first.view()).toMatchObject({ bid: 3, bidder: opener.session().side });
    const responder = active();
    act(responder, { kind: 'bid', amount: 3 });
    expect(responder.of('error').at(-1)?.code).toBe('invalid-action');
  });

  it('makes the challenged bidder name answers and gives the round when the bid is reached', () => {
    const { first, active } = pair();
    const bidder = active();
    act(bidder, { kind: 'bid', amount: 2 });
    act(active(), { kind: 'challenge' });
    expect(first.view()).toMatchObject({ phase: 'proving', bidder: bidder.session().side, phaseSeconds: 18 });
    act(bidder, { kind: 'name', footballerId: 99999 });
    act(bidder, { kind: 'name', footballerId: rightName(bidder, 1) });
    expect(first.view()).toMatchObject({ named: [rightName(bidder, 1)], missed: [99999] });
    act(bidder, { kind: 'name', footballerId: rightName(bidder, 2) });
    expect(first.view()).toMatchObject({
      phase: 'reveal',
      outcome: { prover: bidder.session().side, bid: 2, named: 2, winner: bidder.session().side },
    });
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ phase: 'bidding', round: 2, bid: 0, named: [] });
  });

  it('gives the round to the challenger when the proof times out and treats a silent bidder as a challenge', () => {
    const { first, active } = pair();
    const bidder = active();
    act(bidder, { kind: 'bid', amount: 4 });
    vi.advanceTimersByTime(BID_TIMEOUT);
    expect(first.view().phase).toBe('proving');
    vi.advanceTimersByTime(TIMING.proofBaseMilliseconds + 4 * TIMING.proofPerAnswerMilliseconds + TURN_GRACE_MILLISECONDS);
    const view = first.view();
    expect(view.phase).toBe('reveal');
    expect(view.outcome?.winner).not.toBe(bidder.session().side);
  });

  it('opens with the lowest bid when the first bidder stays silent', () => {
    const { first } = pair();
    vi.advanceTimersByTime(BID_TIMEOUT);
    expect(first.view()).toMatchObject({ phase: 'bidding', bid: 1 });
  });

  it('finishes when a player wins two rounds and records the match', () => {
    const { first, second, active } = pair();
    for (let round = 0; round < 2; round += 1) {
      if (active() === first) {
        act(first, { kind: 'bid', amount: 1 });
        act(second, { kind: 'challenge' });
      } else {
        act(second, { kind: 'bid', amount: 1 });
        act(first, { kind: 'bid', amount: 2 });
        act(second, { kind: 'challenge' });
      }
      act(first, { kind: 'name', footballerId: rightName(first, 1) });
      act(first, { kind: 'name', footballerId: rightName(first, 2) });
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const side = first.session().side;
    expect(first.of('finished')[0]?.result).toEqual({ winner: side, reason: 'score' });
    expect(history.list(second.player.id)[0]).toMatchObject({ game: 'auction', outcome: 'loss', ownCells: 0 });
  });

  it('lets the bot bid, challenge and prove', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = client.session().side;
    for (let step = 0; step < 60 && client.view().phase !== 'finished'; step += 1) {
      const view = client.view();
      if (view.phase === 'bidding' && view.turn === side) {
        if (view.bid >= 3) {
          act(client, { kind: 'challenge' });
        } else {
          act(client, { kind: 'bid', amount: view.bid + 1 });
        }
      } else if (view.phase === 'proving' && view.bidder === side) {
        act(client, { kind: 'name', footballerId: rightName(client, view.named.length + 1) });
      } else {
        vi.advanceTimersByTime(1000);
      }
    }
    expect(client.view().phase).toBe('finished');
  });

  it('reports that no match can be made without rich cells', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});
