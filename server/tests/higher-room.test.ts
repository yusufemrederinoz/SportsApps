import { metricValue, type MetricRow } from '@sportapps/football-data';
import {
  HIGHER_METRICS,
  type GameView,
  type HigherMetric,
  type HigherView,
  type ServerMessage,
  type SessionSnapshot,
} from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import {
  DEFAULT_HIGHER_TIMING,
  createHigherRoomFactory,
  createQuestion,
  metricOrder,
  separated,
  type HigherLibrary,
  type HigherTiming,
} from '../src/play/higher-room';
import type { LiveRoom } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';
import { capturing, lastRoom } from './capture';

const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: HigherTiming = { ...DEFAULT_HIGHER_TIMING, botAnswerMilliseconds: { minimum: 3000, maximum: 3000 } };
const ANSWER_TIMEOUT = TIMING.answerMilliseconds + TURN_GRACE_MILLISECONDS;

const rowOf = (id: number): MetricRow => ({
  id,
  goals: id * 20,
  assists: id * 7,
  appearances: id * 50,
  yellowCards: id,
  marketValue: id * 1_000_000,
  caps: id * 3,
  birthYear: 1950 + id * 2,
});

const ROWS = Array.from({ length: 40 }, (_, index) => rowOf(index + 1));

const library: HigherLibrary = {
  comparablePlayers: (market) => (market === 'tr' ? ROWS.map((row) => row.id) : []),
  metricRows: (ids) => ROWS.filter((row) => ids.includes(row.id)),
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): HigherView;
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

function higherOf(state: GameView): HigherView {
  if (state.game !== 'higher') {
    throw new Error('not higher or lower');
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
      return higherOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'higher' });

const choose = (client: Client, footballerId: number) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action: { kind: 'choose', footballerId } });

function better(view: HigherView): number {
  const question = view.question;
  if (!question) {
    throw new Error('no question');
  }
  const [first, second] = question.cards;
  const value = (id: number) => metricValue(rowOf(id), question.metric) as number;
  const higherFirst = value(first) > value(second);
  return higherFirst === (question.prefer === 'high') ? first : second;
}

function worse(view: HigherView): number {
  const right = better(view);
  return view.question?.cards.find((card) => card !== right) as number;
}

function pair(): { first: Client; second: Client; active: () => Client } {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  const active = () => (first.view().turn === first.session().side ? first : second);
  return { first, second, active };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(4_000_000);
  seed = 9;
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { higher: capturing(createHigherRoomFactory(library, TIMING), rooms) },
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

describe('questions', () => {
  it('keeps the two values far enough apart for the difficulty', () => {
    expect(separated('goals', 100, 140, 1)).toBe(false);
    expect(separated('goals', 100, 160, 1)).toBe(true);
    expect(separated('goals', 100, 112, 3)).toBe(true);
    expect(separated('goals', 0, 5, 3)).toBe(true);
    expect(separated('goals', 0, 0, 3)).toBe(false);
    expect(separated('older', 1980, 1983, 1)).toBe(false);
    expect(separated('younger', 1980, 1981, 3)).toBe(true);
  });

  it('never reuses a footballer within a match', () => {
    const used = new Set<number>();
    for (let index = 0; index < 15; index += 1) {
      const question = createQuestion(ROWS, used, [], 3, random);
      expect(question).not.toBeNull();
      question?.cards.forEach((card) => {
        expect(used.has(card)).toBe(false);
        used.add(card);
      });
    }
    expect(createQuestion([rowOf(1)], new Set(), [], 3, random)).toBeNull();
  });

  it('runs through every question before one comes back and never asks one twice in a row', () => {
    const used = new Set<number>();
    const asked: HigherMetric[] = [];
    for (let index = 0; index < HIGHER_METRICS.length * 2; index += 1) {
      const question = createQuestion(ROWS, used, asked, 3, random);
      expect(question).not.toBeNull();
      question?.cards.forEach((card) => used.add(card));
      asked.push(question?.metric as HigherMetric);
    }
    expect(new Set(asked.slice(0, HIGHER_METRICS.length)).size).toBe(HIGHER_METRICS.length);
    expect(asked.every((metric, index) => index === 0 || metric !== asked[index - 1])).toBe(true);
  });

  it('puts the least asked questions first', () => {
    const order = metricOrder(['goals', 'assists', 'goals'], random);
    expect(order.at(-1)).toBe('goals');
    expect(order.slice(0, HIGHER_METRICS.length - 2)).not.toContain('assists');
  });
});

describe('higher or lower matches', () => {
  it('asks the player whose turn it is and shows the same question to both', () => {
    const { first, second, active } = pair();
    const view = first.view();
    expect(view).toMatchObject({
      phase: 'answering',
      inning: 1,
      totalInnings: 6,
      streak: 0,
      deadlineIn: TIMING.answerMilliseconds,
      last: null,
    });
    expect(second.view().question).toEqual(view.question);
    const waiting = active() === first ? second : first;
    choose(waiting, view.question?.cards[0] as number);
    expect(waiting.of('error').at(-1)?.code).toBe('not-your-turn');
  });

  it('keeps the turn after a right answer and reveals the values', () => {
    const { first, active } = pair();
    const player = active();
    const side = player.session().side;
    choose(player, better(player.view()));
    const view = first.view();
    expect(view).toMatchObject({ phase: 'reveal', turn: side, streak: 1, deadlineIn: TIMING.revealMilliseconds });
    expect(view.last).toMatchObject({ side, correct: true });
    expect(view.scores[side]).toBe(1);
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ phase: 'answering', turn: side });
  });

  it('skips a question without breaking the streak and reveals one value', () => {
    const { first, active } = pair();
    const player = active();
    const side = player.session().side;
    const room = lastRoom(rooms);
    choose(player, better(player.view()));
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    const before = first.view().question;
    expect(room.useJoker(side === 'x' ? 'o' : 'x', 'pass', {})).toEqual({ error: 'invalid-action' });
    expect(room.useJoker(side, 'pass', {})).toEqual({ reveal: { kind: 'pass' } });
    const after = first.view();
    expect(after).toMatchObject({ phase: 'answering', turn: side, streak: 1 });
    expect(after.question?.cards).not.toEqual(before?.cards);
    const shown = room.useJoker(side, 'reveal-value', {});
    expect(shown).toMatchObject({ reveal: { kind: 'value' } });
    if ('reveal' in shown && shown.reveal.kind === 'value') {
      expect(after.question?.cards).toContain(shown.reveal.footballerId);
      expect(shown.reveal.value).toBe(metricValue(rowOf(shown.reveal.footballerId), after.question?.metric ?? 'goals'));
    }
  });

  it('passes the turn after a wrong answer or when time runs out', () => {
    const { first, active } = pair();
    const starter = active();
    const side = starter.session().side;
    choose(starter, worse(starter.view()));
    expect(first.view().last?.correct).toBe(false);
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view().turn).not.toBe(side);
    vi.advanceTimersByTime(ANSWER_TIMEOUT);
    expect(first.view()).toMatchObject({ phase: 'reveal', inning: 2, last: { choice: null, correct: false } });
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ turn: side, inning: 3 });
  });

  it('finishes after every player had the same number of innings and records the match', () => {
    const { first, second, active } = pair();
    while (first.view().phase !== 'finished') {
      const player = active();
      const view = player.view();
      choose(player, player === first ? better(view) : worse(view));
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const side = first.session().side;
    const view = first.view();
    expect(view.scores[side]).toBe(15);
    expect(first.of('finished')[0]?.result).toEqual({ winner: side, reason: 'score' });
    expect(history.list(second.player.id)[0]).toMatchObject({ game: 'higher', outcome: 'loss' });
  });

  it('lets the bot answer on its turns', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = client.session().side;
    for (let step = 0; step < 40 && client.view().phase !== 'finished'; step += 1) {
      const view = client.view();
      if (view.phase === 'answering' && view.turn === side) {
        choose(client, worse(view));
      } else if (view.phase === 'answering') {
        vi.advanceTimersByTime(TIMING.botAnswerMilliseconds.maximum);
      } else {
        vi.advanceTimersByTime(TIMING.revealMilliseconds);
      }
    }
    expect(client.view().phase).toBe('finished');
    expect(client.view().scores[side]).toBe(0);
  });

  it('reports that no match can be made without footballers', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});
