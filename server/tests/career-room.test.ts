import type { CareerView, GameView, ServerMessage, SessionSnapshot } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import {
  DEFAULT_CAREER_TIMING,
  botKnows,
  chooseMysteries,
  createCareerRoomFactory,
  type CareerLibrary,
  type CareerTiming,
} from '../src/play/career-room';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';

const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: CareerTiming = { ...DEFAULT_CAREER_TIMING, botThinkMilliseconds: { minimum: 2000, maximum: 2000 } };
const TURN_TIMEOUT = TIMING.turnMilliseconds + TURN_GRACE_MILLISECONDS;
const CANDIDATES = [11, 12, 13, 14, 15, 16];
const clubsOf = (id: number) => (id === 16 ? 2 : id === 15 ? 9 : 4);

const library: CareerLibrary = {
  careerCandidates: (market) => (market === 'tr' ? CANDIDATES : []),
  careerPath: (id) =>
    Array.from({ length: clubsOf(id) }, (_, index) => ({ clubId: id * 10 + index, firstYear: 2000 + index * 3, lastYear: 2002 + index * 3 })),
  chainCandidates: (_, id) => [id + 100, id + 200],
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): CareerView;
}

let database: Database;
let history: MatchHistory;
let lobby: Lobby;
let seed: number;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function careerOf(state: GameView): CareerView {
  if (state.game !== 'career') {
    throw new Error('not a career path');
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
      return careerOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'career' });

const name = (client: Client, footballerId: number) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action: { kind: 'name', footballerId } });

const mysteryOf = (view: CareerView) => Math.floor((view.clues[0]?.clubId ?? 0) / 10);

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
  vi.setSystemTime(9_000_000);
  seed = 29;
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { career: createCareerRoomFactory(library, TIMING) },
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

describe('career path setup', () => {
  it('only picks footballers with three to eight clubs', () => {
    const mysteries = chooseMysteries(library, 'tr', 2, () => 0);
    expect(mysteries).toHaveLength(4);
    expect(mysteries.every((mystery) => mystery.path.length >= 3 && mystery.path.length <= 8)).toBe(true);
  });

  it('makes the bot surer as clues open and on harder levels', () => {
    expect(botKnows(3, 1)).toBeGreaterThan(botKnows(1, 1));
    expect(botKnows(2, 4)).toBeGreaterThan(botKnows(2, 1));
    expect(botKnows(3, 20)).toBe(0.95);
  });
});

describe('career path matches', () => {
  it('opens one club and hides the answer', () => {
    const { first } = pair();
    const view = first.view();
    expect(view).toMatchObject({ phase: 'playing', round: 1, totalRounds: 4, totalClues: 4, attemptsLeft: 5, points: 4, answer: null });
    expect(view.clues).toHaveLength(1);
    expect(view.clues[0]).toMatchObject({ firstYear: 2000, lastYear: 2002 });
  });

  it('opens the next club after a wrong guess and passes the turn', () => {
    const { first, active } = pair();
    const player = active();
    name(player, 9999);
    const view = first.view();
    expect(view.clues).toHaveLength(2);
    expect(view).toMatchObject({ points: 3, lastGuess: { side: player.session().side, footballerId: 9999, correct: false } });
    expect(view.turn).not.toBe(player.session().side);
    vi.advanceTimersByTime(TURN_TIMEOUT);
    expect(first.view().clues).toHaveLength(3);
  });

  it('scores a right guess, reveals the whole career and moves on', () => {
    const { first, active } = pair();
    name(active(), 9999);
    const player = active();
    const mystery = mysteryOf(first.view());
    name(player, mystery);
    const view = first.view();
    expect(view).toMatchObject({ phase: 'reveal', answer: mystery, lastGuess: { correct: true } });
    expect(view.clues).toHaveLength(4);
    expect(view.scores[player.session().side]).toBe(3);
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ phase: 'playing', round: 2, answer: null });
    expect(first.view().clues).toHaveLength(1);
  });

  it('finishes after four footballers and records the match', () => {
    const { first, second, active } = pair();
    for (let round = 0; round < 4; round += 1) {
      if (active() === second) {
        name(second, 9999);
      }
      name(first, mysteryOf(first.view()));
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const side = first.session().side;
    expect(first.of('finished')[0]?.result).toEqual({ winner: side, reason: 'score' });
    expect(history.list(second.player.id)[0]).toMatchObject({ game: 'career', outcome: 'loss', ownCells: 0 });
  });

  it('lets the bot guess on its turns', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = client.session().side;
    for (let step = 0; step < 80 && client.view().phase !== 'finished'; step += 1) {
      const view = client.view();
      if (view.phase === 'playing' && view.turn === side) {
        name(client, 9999);
      } else {
        vi.advanceTimersByTime(1000);
      }
    }
    expect(client.view().phase).toBe('finished');
    const rival = side === 'x' ? 'o' : 'x';
    expect(client.view().scores[rival]).toBeGreaterThan(0);
  });

  it('reports that no match can be made without careers', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});
