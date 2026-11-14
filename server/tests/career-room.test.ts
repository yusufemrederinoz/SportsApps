import type { CareerView, GameView, PlayFeature, ServerMessage, SessionSnapshot } from '@sportapps/protocol';
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
import type { LiveRoom } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';
import { capturing, lastRoom } from './capture';

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
  footballerFacts: (id) => ({ countryId: id * 2, position: 'FW', birthYear: 1990 + id }),
  careerClubStats: (id) =>
    Array.from({ length: clubsOf(id) - 1 }, (_, index) => ({ clubId: id * 10 + index, appearances: 30 + index, goals: index })),
  careerDecoys: (_, __, filter, excludedIds) =>
    [500, 501, 502, 503, 504, 505]
      .map((id) => id + (filter.clubId != null ? 0 : filter.position != null ? 10 : filter.countryId != null ? 20 : 30))
      .filter((id) => !excludedIds.includes(id))
      .slice(0, filter.clubId != null ? 1 : 6),
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
let rooms: LiveRoom[];
const lobbyRoom = () => lastRoom(rooms);

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

function join(features?: PlayFeature[]): Client {
  const { account } = createAccountService(database, { sessionDays: 90 }).createGuest();
  const client: Client = {
    player: { id: account.id, username: account.username, ...(features ? { features } : {}) },
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
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { career: capturing(createCareerRoomFactory(library, TIMING), rooms) },
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
    expect(mysteries).toHaveLength(3);
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
    expect(view).toMatchObject({ phase: 'playing', round: 1, totalRounds: 3, totalClues: 4, attemptsLeft: 5, points: 4, answer: null });
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

  it('finishes after three footballers and records the match', () => {
    const { first, second, active } = pair();
    for (let round = 0; round < 3; round += 1) {
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

  it('reveals the first letter and birth year, and still the nationality and position for older apps', () => {
    const { first } = pair();
    const side = first.session().side;
    const room = (joker: 'first-letter' | 'birth-year' | 'nationality' | 'position' | 'pass') =>
      lobbyRoom().useJoker(side, joker, {});
    const mystery = mysteryOf(first.view());
    expect(room('first-letter')).toEqual({ reveal: { kind: 'initials', footballerId: mystery, birthYear: false } });
    expect(room('birth-year')).toEqual({ reveal: { kind: 'birth-year', birthYear: 1990 + mystery } });
    expect(room('nationality')).toEqual({ reveal: { kind: 'country', countryId: mystery * 2 } });
    expect(room('position')).toEqual({ reveal: { kind: 'position', position: 'FW', birthYear: 1990 + mystery } });
    expect(room('pass')).toEqual({ error: 'joker-unavailable' });
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

  it('keeps the new help away from apps that do not support it', () => {
    const { first } = pair();
    const view = first.view();
    expect(view.facts).toBeUndefined();
    expect(view.choices).toBeUndefined();
    expect(view.clues[0]).toEqual({ clubId: view.clues[0]?.clubId, firstYear: 2000, lastYear: 2002 });
  });

  it('reports that no match can be made without careers', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});

describe('career path help on easier levels', () => {
  const HELP: PlayFeature[] = ['career-help', 'career-choices'];

  function helpedPair(difficulty: 1 | 2 | 3, features: PlayFeature[] = HELP) {
    const first = join(features);
    const second = join(features);
    [first, second].forEach((client) =>
      lobby.handle(client.player.id, { type: 'queue', market: 'tr', difficulty, game: 'career' }),
    );
    const active = () => (first.view().turn === first.session().side ? first : second);
    return { first, second, active };
  }

  it('shows appearances and goals beside each club that has them', () => {
    const { first, active } = helpedPair(3);
    expect(first.view().clues[0]).toMatchObject({ appearances: 30, goals: 0 });
    name(active(), 9999);
    name(active(), 9998);
    name(active(), 9997);
    const clues = first.view().clues;
    expect(clues[1]).toMatchObject({ appearances: 31, goals: 1 });
    expect(clues[3]?.appearances).toBeUndefined();
  });

  it('opens nationality and position from the start on easy and medium but not on hard', () => {
    const mystery = (difficulty: 1 | 2 | 3) => {
      lobby.shutdown();
      lobby = createLobby({
        games: { career: capturing(createCareerRoomFactory(library, TIMING), rooms) },
        hasMarket: (market) => market === 'tr',
        history,
        random,
        now: () => Date.now(),
        botWaitMilliseconds: BOT_WAIT,
      });
      const view = helpedPair(difficulty).first.view();
      return { facts: view.facts, id: mysteryOf(view) };
    };
    const easy = mystery(1);
    expect(easy.facts).toEqual({ countryId: easy.id * 2, position: 'FW' });
    const medium = mystery(2);
    expect(medium.facts).toEqual({ countryId: medium.id * 2, position: 'FW' });
    expect(mystery(3).facts).toBeUndefined();
  });

  it('offers four names on easy, led by players who match the open facts and club', () => {
    const { first } = helpedPair(1);
    const view = first.view();
    const choices = view.choices ?? [];
    expect(choices).toHaveLength(4);
    expect(choices).toContain(mysteryOf(view));
    expect(choices).toContain(500);
    expect(choices.filter((id) => id >= 510 && id < 520)).toHaveLength(2);
    expect(helpedPair(2).first.view().choices).toBeUndefined();
  });

  it('drops a wrong pick, opens the next club and passes the turn', () => {
    const { first, active } = helpedPair(1);
    const player = active();
    const before = first.view();
    const wrong = (before.choices ?? []).find((id) => id !== mysteryOf(before)) as number;
    name(player, wrong);
    const after = first.view();
    expect(after.choices).toHaveLength(3);
    expect(after.choices).not.toContain(wrong);
    expect(after.clues).toHaveLength(2);
    expect(active()).not.toBe(player);
  });
});
