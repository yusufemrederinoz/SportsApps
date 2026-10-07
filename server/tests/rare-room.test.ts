import type { Grid, Header } from '@sportapps/game-core';
import type { GameView, RareView, ServerMessage, SessionSnapshot } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import type { LiveRoom } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import {
  DEFAULT_RARE_TIMING,
  botRareAnswer,
  createRareRoomFactory,
  criteriaFrom,
  type RareLibrary,
  type RareTiming,
} from '../src/play/rare-room';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';
import { capturing, lastRoom } from './capture';

const club = (referenceId: number): Header => ({ kind: 'club', referenceId });
const GRID: Grid = { id: 9, rows: [club(1), club(2), club(3)], columns: [club(4), club(5), club(6)] };
const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: RareTiming = { ...DEFAULT_RARE_TIMING, botAnswerMilliseconds: { minimum: 5000, maximum: 5000 } };
const ANSWER_TIMEOUT = TIMING.answerMilliseconds + TURN_GRACE_MILLISECONDS;

const answerFor = (row: Header, column: Header, fame: number) => row.referenceId * 1000 + column.referenceId * 100 + fame;

const library: RareLibrary = {
  pickGrid: (market) => (market === 'tr' ? GRID : null),
  isCorrect: (id, row, column) => Math.floor(id / 100) === row.referenceId * 10 + column.referenceId,
  fameOf: (_, id) => id % 100,
  rareAnswers: (_, row, column) => [20, 35, 50, 80].map((fame) => ({ id: answerFor(row, column, fame), fame })),
  nearMisses: () => [77777],
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): RareView;
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

function rareOf(state: GameView): RareView {
  if (state.game !== 'rare') {
    throw new Error('not least known');
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
      return rareOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'rare' });

const name = (client: Client, footballerId: number) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action: { kind: 'name', footballerId } });

function rightAnswer(client: Client, fame: number): number {
  const criteria = client.view().criteria;
  if (!criteria) {
    throw new Error('no criteria');
  }
  return answerFor(criteria.row as Header, criteria.column as Header, fame);
}

function pair() {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  return { first, second };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(6_000_000);
  seed = 13;
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { rare: capturing(createRareRoomFactory(library, TIMING), rooms) },
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

describe('least known setup', () => {
  it('draws different cells of one grid for the rounds', () => {
    const criteria = criteriaFrom(GRID, 5, random);
    expect(criteria).toHaveLength(5);
    expect(new Set(criteria.map((entry) => `${entry.row.referenceId}-${entry.column.referenceId}`)).size).toBe(5);
  });

  it('lets the bot go deeper into the less known answers on hard levels', () => {
    const answers = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((fame) => ({ id: fame, fame }));
    expect(botRareAnswer(answers, 3, () => 0.5)).toBeLessThan(botRareAnswer(answers, 1, () => 0.5) as number);
    expect(botRareAnswer(answers, 1, () => 0)).toBeNull();
    expect(botRareAnswer([], 3, () => 0.9)).toBeNull();
  });
});

describe('least known matches', () => {
  it('keeps answers hidden until both players have answered', () => {
    const { first, second } = pair();
    expect(first.view()).toMatchObject({ phase: 'answering', round: 1, totalRounds: 5, deadlineIn: TIMING.answerMilliseconds });
    const own = rightAnswer(first, 30);
    name(first, own);
    expect(first.view()).toMatchObject({ own, answered: { [first.session().side]: true } });
    expect(second.view().own).toBeNull();
    expect(JSON.stringify(second.view())).not.toContain(String(own));
    name(first, rightAnswer(first, 10));
    expect(first.of('error').at(-1)?.code).toBe('invalid-action');
  });

  it('gives the round to the less known right answer and shows both answers', () => {
    const { first, second } = pair();
    name(first, rightAnswer(first, 25));
    name(second, rightAnswer(second, 60));
    const view = first.view();
    const side = first.session().side;
    expect(view.phase).toBe('reveal');
    expect(view.rounds[0]).toMatchObject({ winner: side });
    expect(view.rounds[0]?.answers[side]).toMatchObject({ correct: true, fame: 25 });
    expect(view.scores[side]).toBe(1);
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ phase: 'answering', round: 2, own: null, answered: { x: false, o: false } });
  });

  it('hints at the least known answer and adds fifteen seconds before the player answers', () => {
    const { first, second } = pair();
    const side = first.session().side;
    const room = lastRoom(rooms);
    expect(room.useJoker(side, 'hint', {})).toEqual({
      reveal: { kind: 'initials', footballerId: rightAnswer(first, 20), birthYear: false },
    });
    expect(room.useJoker(side, 'extra-time', {})).toEqual({ reveal: { kind: 'time', seconds: 15 } });
    name(second, rightAnswer(second, 50));
    vi.advanceTimersByTime(TIMING.answerMilliseconds + TURN_GRACE_MILLISECONDS);
    expect(first.view().phase).toBe('answering');
    vi.advanceTimersByTime(15000);
    expect(first.view().phase).toBe('reveal');
    expect(room.useJoker(side, 'hint', {})).toEqual({ error: 'invalid-action' });
  });

  it('counts a wrong answer and a missing answer as no answer', () => {
    const { first, second } = pair();
    name(first, 99999);
    vi.advanceTimersByTime(ANSWER_TIMEOUT);
    const view = second.view();
    expect(view.rounds[0]?.answers[first.session().side]).toMatchObject({ correct: false });
    expect(view.rounds[0]?.answers[second.session().side]).toEqual({ footballerId: null, correct: false, fame: null });
    expect(view.rounds[0]?.winner).toBeNull();
  });

  it('finishes after five rounds and records the match', () => {
    const { first, second } = pair();
    for (let round = 0; round < 5; round += 1) {
      name(first, rightAnswer(first, 10));
      name(second, rightAnswer(second, 90));
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const side = first.session().side;
    expect(first.view().scores[side]).toBe(5);
    expect(first.of('finished')[0]?.result).toEqual({ winner: side, reason: 'score' });
    expect(history.list(second.player.id)[0]).toMatchObject({ game: 'rare', outcome: 'loss' });
  });

  it('lets the bot answer every round', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    for (let round = 0; round < 5; round += 1) {
      vi.advanceTimersByTime(TIMING.botAnswerMilliseconds.maximum);
      name(client, 99999);
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    expect(client.of('finished')).toHaveLength(1);
    const rival = client.session().side === 'x' ? 'o' : 'x';
    expect(client.view().rounds.every((round) => round.answers[rival].footballerId !== null)).toBe(true);
  });

  it('reports that no match can be made without a grid', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(first.of('error').at(-1)?.code).toBe('no-grid');
  });
});
