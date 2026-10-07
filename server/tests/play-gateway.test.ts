import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DRAFT_FORMATION, DUEL_HAND_SIZE, emptyCells, headersAt, openPositions, type Grid } from '@sportapps/game-core';
import {
  PLAY_PROTOCOL_VERSION,
  type AuthResponse,
  type DraftView,
  type DuelView,
  type HigherView,
  type MatchHistoryResponse,
  type MatchSnapshot,
  type ServerMessage,
} from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';

import type { ServerConfig } from '../src/config';
import { openDatabase } from '../src/database';
import { openFootballLibrary, readDataVersion, type FootballLibrary } from '../src/football/library';
import { buildApp } from '../src/http/app';

const footballPath = fileURLToPath(new URL('../../app/assets/data/football.db', import.meta.url));
const available = existsSync(footballPath);
const WAIT_MILLISECONDS = 3000;
const config: ServerConfig = {
  host: '127.0.0.1',
  port: 0,
  databasePath: ':memory:',
  footballDatabasePath: footballPath,
  portraitsPath: '',
  sessionDays: 90,
  googleClientIds: [],
  appleClientIds: [],
};

interface Client {
  socket: WebSocket;
  auth: AuthResponse;
  received: ServerMessage[];
  next<T extends ServerMessage['type']>(type: T): Promise<Extract<ServerMessage, { type: T }>>;
  send(message: object): void;
  closed: Promise<void>;
}

let app: FastifyInstance;
let football: FootballLibrary;

async function guest(): Promise<AuthResponse> {
  const response = await app.inject({ method: 'POST', url: '/v1/auth/guest' });
  return response.json() as AuthResponse;
}

async function open(auth: AuthResponse, hello: object | null = {}): Promise<Client> {
  const socket = await app.injectWS('/v1/play');
  const received: ServerMessage[] = [];
  const waiting: { type: string; resolve: (message: ServerMessage) => void }[] = [];
  let cursor = 0;

  socket.on('message', (data) => {
    received.push(JSON.parse(data.toString()) as ServerMessage);
    for (let index = waiting.length - 1; index >= 0; index -= 1) {
      const waiter = waiting[index];
      const found = waiter ? received.slice(cursor).findIndex((message) => message.type === waiter.type) : -1;
      if (waiter && found >= 0) {
        const message = received[cursor + found] as ServerMessage;
        cursor += found + 1;
        waiting.splice(index, 1);
        waiter.resolve(message);
      }
    }
  });

  const client: Client = {
    socket,
    auth,
    received,
    next(type) {
      const found = received.slice(cursor).findIndex((message) => message.type === type);
      if (found >= 0) {
        const message = received[cursor + found] as Extract<ServerMessage, { type: typeof type }>;
        cursor += found + 1;
        return Promise.resolve(message);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no ${type} message within ${WAIT_MILLISECONDS} ms`)), WAIT_MILLISECONDS);
        waiting.push({
          type,
          resolve: (message) => {
            clearTimeout(timer);
            resolve(message as Extract<ServerMessage, { type: typeof type }>);
          },
        });
      });
    },
    send(message) {
      socket.send(JSON.stringify(message));
    },
    closed: new Promise((resolve) => socket.on('close', () => resolve())),
  };

  if (hello) {
    client.send({
      type: 'hello',
      token: auth.token,
      protocol: PLAY_PROTOCOL_VERSION,
      dataVersion: football.dataVersion,
      ...hello,
    });
  }
  return client;
}

async function ready(): Promise<Client> {
  const client = await open(await guest());
  await client.next('ready');
  return client;
}

async function viewWhere(client: Client, accept: (view: DuelView) => boolean): Promise<DuelView> {
  for (;;) {
    const message = await client.next('view');
    if (message.game === 'duel' && accept(message.view)) {
      return message.view;
    }
  }
}

async function draftWhere(client: Client, accept: (view: DraftView) => boolean): Promise<DraftView> {
  for (;;) {
    const message = await client.next('view');
    if (message.game === 'draft' && accept(message.view)) {
      return message.view;
    }
  }
}

function gridOf(snapshot: MatchSnapshot): Grid {
  const picked = football.pickGrid(snapshot.market, snapshot.difficulty, () => 0);
  if (!picked) {
    throw new Error('no grid');
  }
  return picked;
}

beforeEach(async () => {
  football = openFootballLibrary(footballPath, readDataVersion(footballPath));
  app = buildApp({
    database: openDatabase(':memory:'),
    config,
    football,
    play: {
      random: () => 0,
      botWaitMilliseconds: { minimum: 40, maximum: 40 },
      botTiming: { minimumThinkMilliseconds: 10, maximumThinkMilliseconds: 10 },
      duelTiming: {
        revealMilliseconds: 10,
        botPickMilliseconds: { minimum: 10, maximum: 10 },
        botFollowMilliseconds: { minimum: 10, maximum: 10 },
        botPlayMilliseconds: { minimum: 10, maximum: 10 },
      },
      draftTiming: {
        pauseMilliseconds: 10,
        botPickMilliseconds: { minimum: 10, maximum: 10 },
      },
      higherTiming: {
        revealMilliseconds: 10,
        botAnswerMilliseconds: { minimum: 10, maximum: 10 },
      },
    },
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  football.close();
});

describe.skipIf(!available)('play gateway', () => {
  it('refuses a connection with a bad token or outdated data', async () => {
    const auth = await guest();
    const stranger = await open(auth, { token: 'not-a-token' });
    expect((await stranger.next('error')).code).toBe('unauthorized');
    await stranger.closed;

    const outdated = await open(auth, { dataVersion: 'older' });
    expect((await outdated.next('error')).code).toBe('outdated-client');
    await outdated.closed;
  });

  it('answers garbage with an error and ignores game messages before the greeting', async () => {
    const client = await open(await guest(), null);
    client.socket.send('garbage');
    expect((await client.next('error')).code).toBe('invalid-message');
    client.send({ type: 'queue', market: 'tr', difficulty: 1 });
    expect((await client.next('error')).code).toBe('not-ready');
    client.socket.close();
  });

  it('plays a full match between two players with answers checked on the server', async () => {
    const first = await ready();
    const second = await ready();
    first.send({ type: 'queue', market: 'tr', difficulty: 1 });
    await first.next('queued');
    second.send({ type: 'queue', market: 'tr', difficulty: 1 });

    const mine = (await first.next('match')).match;
    const theirs = (await second.next('match')).match;
    expect(mine.matchId).toBe(theirs.matchId);

    const grid = gridOf(mine);
    expect(grid.id).toBe(mine.gridId);
    const bySide = { [mine.side]: first, [theirs.side]: second } as Record<'x' | 'o', Client>;
    const starter = bySide[mine.startingSide];
    const other = bySide[mine.startingSide === 'x' ? 'o' : 'x'];
    const used = new Set<number>();
    const minimumFame = football.minimumFame(mine.difficulty);
    const answerFor = (row: number, column: number): number => {
      const [option] = football.knownAnswers(mine.market, grid, [{ row, column }], minimumFame);
      const footballerId = option?.footballerIds.find((id) => !used.has(id));
      if (!footballerId) {
        throw new Error('no known answer');
      }
      used.add(footballerId);
      return footballerId;
    };

    const plan: [Client, number, number][] = [
      [starter, 0, 0],
      [other, 1, 0],
      [starter, 0, 1],
      [other, 1, 1],
      [starter, 0, 2],
    ];
    for (const [index, [client, row, column]] of plan.entries()) {
      client.send({
        type: 'answer',
        matchId: mine.matchId,
        turnNumber: index + 1,
        cell: { row, column },
        footballerId: answerFor(row, column),
      });
      const move = (await first.next('move')).move;
      await second.next('move');
      expect(move).toMatchObject({ kind: 'answer', outcome: 'claimed', cell: { row, column } });
    }

    const finished = await other.next('finished');
    expect(finished.result).toEqual({ winner: mine.startingSide, reason: 'line' });

    const historyOf = async (client: Client) =>
      (
        await app.inject({
          method: 'GET',
          url: '/v1/matches',
          headers: { authorization: `Bearer ${client.auth.token}` },
        })
      ).json() as MatchHistoryResponse;
    expect((await historyOf(starter)).matches).toMatchObject([
      { outcome: 'win', opponent: other.auth.account.username, ownCells: 3, opponentCells: 2 },
    ]);
    expect((await historyOf(other)).matches).toMatchObject([{ outcome: 'loss' }]);
    first.socket.close();
    second.socket.close();
  });

  it('judges a wrong footballer as wrong even when the client claims the cell', async () => {
    const first = await ready();
    const second = await ready();
    first.send({ type: 'queue', market: 'tr', difficulty: 1 });
    second.send({ type: 'queue', market: 'tr', difficulty: 1 });
    const mine = (await first.next('match')).match;
    await second.next('match');
    const grid = gridOf(mine);
    const starter = mine.side === mine.startingSide ? first : second;
    const [cell] = emptyCells({ grid, rules: { turnSeconds: 20, maxConsecutiveMisses: 4 }, cells: Array(9).fill(null), turn: 'x', turnNumber: 1, consecutiveMisses: 0, result: null });
    if (!cell) {
      throw new Error('no cell');
    }
    const { row, column } = headersAt(grid, cell);
    const [wrong] = football.nearMisses(mine.market, row, column, 0, 1);
    starter.send({ type: 'answer', matchId: mine.matchId, turnNumber: 1, cell, footballerId: wrong });
    expect((await first.next('move')).move).toMatchObject({ kind: 'answer', outcome: 'wrong' });
    first.socket.close();
    second.socket.close();
  });

  it('gives a lone player a bot opponent that plays without being marked as one', async () => {
    const human = await ready();
    human.send({ type: 'queue', market: 'tr', difficulty: 3 });
    const { match } = await human.next('match');
    const rival = match.usernames[match.side === 'x' ? 'o' : 'x'];
    expect(rival).not.toBe(human.auth.account.username);
    expect(JSON.stringify(match)).not.toContain('bot');

    human.send({ type: 'leave', matchId: match.matchId });
    const finished = await human.next('finished');
    expect(finished.result.reason).toBe('forfeit');
    const history = (
      await app.inject({ method: 'GET', url: '/v1/matches', headers: { authorization: `Bearer ${human.auth.token}` } })
    ).json() as MatchHistoryResponse;
    expect(history.matches).toMatchObject([{ opponent: rival, outcome: 'loss' }]);
    expect(JSON.stringify(history)).not.toContain('bot');
    human.socket.close();
  });

  it('plays a card duel from real data against the bot', async () => {
    const human = await ready();
    human.send({ type: 'queue', market: 'tr', difficulty: 2, game: 'duel' });
    const { session } = await human.next('session');
    if (session.game !== 'duel') {
      throw new Error('not a duel');
    }
    expect(session.view.phase).toBe('picking');
    expect(football.duelConcepts('tr')).toContainEqual(session.view.concept);

    const [known] = football.conceptPlayers(session.view.concept, 'tr', 0, 1);
    human.send({ type: 'act', matchId: session.matchId, action: { kind: 'hand', footballerIds: [known] } });
    let view = await viewWhere(human, (current) => current.phase === 'playing');
    expect(view.hand).toHaveLength(DUEL_HAND_SIZE);
    expect(view.hand?.[0]).toBe(known);
    expect(football.conceptMembers(session.view.concept, 'tr', view.hand ?? [])).toHaveLength(DUEL_HAND_SIZE);

    for (let round = 1; round <= DUEL_HAND_SIZE; round += 1) {
      human.send({ type: 'act', matchId: session.matchId, action: { kind: 'play', footballerId: view.remaining[0] } });
      const revealed = await viewWhere(human, (current) => current.rounds.length === round);
      const played = revealed.rounds[round - 1];
      expect(played?.values.x).not.toBeNull();
      expect(played?.values.o).not.toBeNull();
      if (round < DUEL_HAND_SIZE) {
        view = await viewWhere(human, (current) => current.phase === 'playing' && current.rounds.length === round);
      }
    }

    const finished = await human.next('finished');
    expect(finished.result.reason).toBe('score');
    const history = (
      await app.inject({ method: 'GET', url: '/v1/matches', headers: { authorization: `Bearer ${human.auth.token}` } })
    ).json() as MatchHistoryResponse;
    expect(history.matches).toMatchObject([{ game: 'duel', reason: 'score' }]);
    human.socket.close();
  });

  it('drafts a lineup from real data against the bot', async () => {
    expect(football.draftClubs('tr').length).toBeGreaterThanOrEqual(DRAFT_FORMATION.length);
    const human = await ready();
    human.send({ type: 'queue', market: 'tr', difficulty: 1, game: 'draft' });
    const { session } = await human.next('session');
    if (session.game !== 'draft') {
      throw new Error('not a draft');
    }
    const { side } = session;
    let view: DraftView = session.view;

    for (let round = 1; round <= DRAFT_FORMATION.length; round += 1) {
      if (view.round !== round || view.phase !== 'playing') {
        view = await draftWhere(human, (current) => current.phase === 'playing' && current.round === round);
      }
      const club = view.clubs.at(-1) as number;
      const taken = [...view.lineups.x, ...view.lineups.o].flatMap((slot) => (slot.footballerId ? [slot.footballerId] : []));
      const [candidate] = football.draftCandidates('tr', club, openPositions(view.lineups[side]), taken, 1);
      expect(candidate).toBeDefined();
      expect(football.draftEntry(candidate?.id ?? 0, club)).toMatchObject({ id: candidate?.id });
      human.send({ type: 'act', matchId: session.matchId, action: { kind: 'pick', footballerId: candidate?.id } });
      view = await draftWhere(human, (current) => current.round === round && current.picked[side]);
    }

    const finished = await human.next('finished');
    expect(finished.result.reason).toBe('score');
    const history = (
      await app.inject({ method: 'GET', url: '/v1/matches', headers: { authorization: `Bearer ${human.auth.token}` } })
    ).json() as MatchHistoryResponse;
    expect(history.matches).toMatchObject([{ game: 'draft', reason: 'score' }]);
    human.socket.close();
  });

  it('plays higher or lower from real data against the bot', async () => {
    const human = await ready();
    human.send({ type: 'queue', market: 'tr', difficulty: 1, game: 'higher' });
    const { session } = await human.next('session');
    if (session.game !== 'higher') {
      throw new Error('not higher or lower');
    }
    const { side } = session;
    const rows = new Map(football.metricRows(football.comparablePlayers('tr', 0, 5000)).map((row) => [row.id, row]));
    let view: HigherView = session.view;
    let answered = 0;
    for (;;) {
      if (view.phase === 'finished') {
        break;
      }
      if (view.phase === 'answering' && view.turn === side && view.question) {
        const [first, second] = view.question.cards;
        expect(rows.has(first) && rows.has(second)).toBe(true);
        human.send({ type: 'act', matchId: session.matchId, action: { kind: 'choose', footballerId: first } });
        answered += 1;
      }
      const message = await human.next('view');
      if (message.game !== 'higher') {
        throw new Error('not higher or lower');
      }
      view = message.view;
      if (view.phase === 'reveal') {
        expect(view.last?.values.every((value) => typeof value === 'number')).toBe(true);
      }
    }
    expect(answered).toBeGreaterThanOrEqual(3);
    expect(view.result?.reason).toBe('score');
    expect(view.scores.x + view.scores.o).toBeGreaterThanOrEqual(0);
    human.socket.close();
  });

  it('requires a session to read the match history', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/matches' });
    expect(response.statusCode).toBe(401);
  });
});
