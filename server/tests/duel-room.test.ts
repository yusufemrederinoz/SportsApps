import { metricValue, type MetricRow } from '@sportapps/football-data';
import { DUEL_HAND_SIZE } from '@sportapps/game-core';
import type { DuelConcept, DuelMetric, DuelView, GameView, ServerMessage, SessionSnapshot } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import {
  DEFAULT_DUEL_TIMING,
  chooseQuestions,
  createDuelRoomFactory,
  pickConcept,
  type DuelLibrary,
  type DuelTiming,
} from '../src/play/duel-room';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import type { LiveRoom } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';
import { capturing, lastRoom } from './capture';

const CONCEPT: DuelConcept = { kind: 'club', clubId: 9 };
const POOL = Array.from({ length: 30 }, (_, index) => index + 1);
const MEMBER_LIMIT = 40;
const OUTSIDER = 77;
const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: DuelTiming = {
  ...DEFAULT_DUEL_TIMING,
  botPickMilliseconds: { minimum: 10000, maximum: 10000 },
  botFollowMilliseconds: { minimum: 2000, maximum: 2000 },
  botPlayMilliseconds: { minimum: 3000, maximum: 3000 },
};
const PICK_TIMEOUT = TIMING.pickMilliseconds + TURN_GRACE_MILLISECONDS;
const PLAY_TIMEOUT = TIMING.playMilliseconds + TURN_GRACE_MILLISECONDS;

const rowOf = (id: number): MetricRow => ({
  id,
  goals: id * 10,
  assists: id,
  appearances: 100 + id,
  yellowCards: id % 5,
  marketValue: id % 2 === 0 ? id * 1000 : null,
  caps: null,
  birthYear: 1980 + (id % 20),
});

const library: DuelLibrary = {
  duelConcepts: (market) => (market === 'tr' ? [CONCEPT] : []),
  conceptPlayers: () => POOL,
  conceptMembers: (_, __, footballerIds) => footballerIds.filter((id) => id <= MEMBER_LIMIT),
  metricRows: (footballerIds) => footballerIds.map(rowOf),
};

function duelOf(state: GameView): DuelView {
  if (state.game !== 'duel') {
    throw new Error('not a duel');
  }
  return state.view;
}

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): DuelView;
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

function attach(player: Player): Client {
  const client: Client = {
    player,
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
      return duelOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(player, client);
  return client;
}

function join(): Client {
  const { account } = createAccountService(database, { sessionDays: 90 }).createGuest();
  return attach({ id: account.id, username: account.username });
}

const queue = (client: Client) =>
  lobby.handle(client.player.id, { type: 'queue', market: 'tr', difficulty: 2, game: 'duel' });

const act = (client: Client, action: { kind: 'hand'; footballerIds: number[] } | { kind: 'play'; footballerId: number }) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action });

const lastError = (client: Client) => client.of('error').at(-1)?.code;

function pair(): { first: Client; second: Client } {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  return { first, second };
}

const FIRST_HAND = [1, 2, 3, 4, 5, 6, 7];
const SECOND_HAND = [11, 12, 13, 14, 15, 16, 17];

function dealt(): { first: Client; second: Client } {
  const players = pair();
  act(players.first, { kind: 'hand', footballerIds: FIRST_HAND });
  act(players.second, { kind: 'hand', footballerIds: SECOND_HAND });
  return players;
}

function playRound(first: Client, second: Client): void {
  act(first, { kind: 'play', footballerId: first.view().remaining[0] as number });
  act(second, { kind: 'play', footballerId: second.view().remaining[0] as number });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(2_000_000);
  seed = 11;
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { duel: capturing(createDuelRoomFactory(library, TIMING), rooms) },
    hasMarket: (market) => market === 'tr' || market === 'empty',
    history,
    random,
    now: () => Date.now(),
    botWaitMilliseconds: BOT_WAIT,
    disconnectGraceMilliseconds: 30000,
  });
});

afterEach(() => {
  lobby.shutdown();
  database.close();
  vi.useRealTimers();
});

describe('duel setup', () => {
  it('opens a picking phase for both players with the same concept', () => {
    const { first, second } = pair();
    const mine = first.session();
    const theirs = second.session();
    expect(mine.matchId).toBe(theirs.matchId);
    expect(mine.game).toBe('duel');
    expect(new Set([mine.side, theirs.side])).toEqual(new Set(['x', 'o']));
    expect(mine.view).toMatchObject({
      phase: 'picking',
      concept: CONCEPT,
      handSize: DUEL_HAND_SIZE,
      totalRounds: DUEL_HAND_SIZE,
      deadlineIn: TIMING.pickMilliseconds,
      hand: null,
      opponentReady: false,
      question: null,
    });
  });

  it('keeps the two games in separate queues', () => {
    const first = join();
    const second = join();
    queue(first);
    lobby.handle(second.player.id, { type: 'queue', market: 'tr', difficulty: 2 });
    expect(first.of('session')).toHaveLength(0);
    expect(second.of('error').at(-1)?.code).toBe('invalid-message');
    expect(lobby.counts()).toMatchObject({ queued: 1, matches: 0 });
  });

  it('reports that no match can be made when the market has no concepts', () => {
    const first = join();
    const second = join();
    [first, second].forEach((client) =>
      lobby.handle(client.player.id, { type: 'queue', market: 'empty', difficulty: 2, game: 'duel' }),
    );
    expect(lastError(first)).toBe('no-grid');
    expect(first.of('idle')).toHaveLength(1);
    expect(lobby.counts().matches).toBe(0);
  });

  it('picks among the kinds of concept evenly rather than by how many there are', () => {
    const concepts: DuelConcept[] = [
      { kind: 'home-league-foreigners' },
      ...Array.from({ length: 30 }, (_, clubId): DuelConcept => ({ kind: 'club', clubId })),
    ];
    expect(pickConcept(concepts, () => 0)).toEqual({ kind: 'home-league-foreigners' });
    expect(pickConcept(concepts, () => 0.99).kind).toBe('club');
  });
});

describe('picking a hand', () => {
  it('refuses cards outside the concept, repeated cards and oversized hands', () => {
    const { first } = pair();
    act(first, { kind: 'hand', footballerIds: [1, 2, 3, 4, 5, 6, OUTSIDER] });
    expect(lastError(first)).toBe('invalid-action');
    act(first, { kind: 'hand', footballerIds: [1, 1, 2, 3, 4, 5, 6] });
    expect(lastError(first)).toBe('invalid-action');
    act(first, { kind: 'hand', footballerIds: [1, 2, 3, 4, 5, 6, 7, 8] });
    expect(lastError(first)).toBe('invalid-action');
    expect(first.view().hand).toBeNull();
  });

  it('locks a hand once and tells the opponent without showing the cards', () => {
    const { first, second } = pair();
    act(first, { kind: 'hand', footballerIds: FIRST_HAND });
    expect(first.view().hand).toEqual(FIRST_HAND);
    expect(second.view()).toMatchObject({ phase: 'picking', opponentReady: true, hand: null });
    expect(JSON.stringify(second.view())).not.toContain(JSON.stringify(FIRST_HAND));

    act(first, { kind: 'hand', footballerIds: SECOND_HAND });
    expect(lastError(first)).toBe('invalid-action');
    expect(first.view().hand).toEqual(FIRST_HAND);
  });

  it('accepts concept members beyond the suggested pool and completes a short hand', () => {
    const { first } = pair();
    act(first, { kind: 'hand', footballerIds: [35, 36] });
    const hand = first.view().hand ?? [];
    expect(hand).toHaveLength(DUEL_HAND_SIZE);
    expect(hand.slice(0, 2)).toEqual([35, 36]);
    expect(new Set(hand).size).toBe(DUEL_HAND_SIZE);
    expect(hand.slice(2).every((id) => POOL.includes(id))).toBe(true);
  });

  it('deals hands to players who run out of time and starts the first round', () => {
    const { first, second } = pair();
    act(first, { kind: 'hand', footballerIds: FIRST_HAND });
    vi.advanceTimersByTime(PICK_TIMEOUT);
    expect(second.view().hand).toHaveLength(DUEL_HAND_SIZE);
    expect(first.view()).toMatchObject({ phase: 'playing', deadlineIn: TIMING.playMilliseconds });
    expect(first.view().question).not.toBeNull();
  });
});

describe('questions', () => {
  const valueOf = (footballerId: number, metric: DuelMetric) =>
    metric === 'caps' || (metric === 'marketValue' && footballerId === 3) ? null : footballerId;

  it('asks only what is known for every card in both hands', () => {
    const questions = chooseQuestions([1, 2, 3, 4], valueOf, random);
    expect(questions).toHaveLength(DUEL_HAND_SIZE);
    expect(questions.map((question) => question.metric)).not.toContain('caps');
    expect(questions.map((question) => question.metric)).not.toContain('marketValue');
    expect(new Set(questions.map((question) => question.metric)).size).toBe(DUEL_HAND_SIZE);
    expect(questions.find((question) => question.metric === 'older')?.prefer).toBe('low');
  });

  it('asks one age question when enough statistics are known', () => {
    const metrics = chooseQuestions([1, 2, 3], (footballerId) => footballerId, random).map((question) => question.metric);
    expect(new Set(metrics).size).toBe(DUEL_HAND_SIZE);
    expect(metrics.filter((metric) => metric === 'older' || metric === 'younger')).toHaveLength(1);
  });

  it('never repeats a question and falls back to the best-known ones', () => {
    const valueOf = (footballerId: number, metric: DuelMetric) =>
      metric === 'goals' || metric === 'older' || (metric === 'assists' && footballerId === 1) ? 5 : null;
    for (let match = 0; match < 20; match += 1) {
      const metrics = chooseQuestions([1, 2], valueOf, random).map((question) => question.metric);
      expect(new Set(metrics).size).toBe(DUEL_HAND_SIZE);
      expect(metrics).toEqual(expect.arrayContaining(['goals', 'older', 'assists']));
    }
  });
});

describe('playing rounds', () => {
  it('shows the values of the hand for the question and swaps a card for a spare one', () => {
    const { first } = dealt();
    const side = first.session().side;
    const room = lastRoom(rooms);
    const metric = first.view().question?.metric as DuelMetric;
    const shown = room.useJoker(side, 'see-values', {});
    expect(shown).toMatchObject({ reveal: { kind: 'values' } });
    if ('reveal' in shown && shown.reveal.kind === 'values') {
      expect(Object.keys(shown.reveal.values).map(Number).sort((a, b) => a - b)).toEqual(FIRST_HAND);
      expect(shown.reveal.values[3]).toBe(metricValue(rowOf(3), metric));
    }
    expect(room.useJoker(side, 'swap-card', { footballerId: 11 })).toEqual({ error: 'invalid-action' });
    const swapped = room.useJoker(side, 'swap-card', { footballerId: 4 });
    expect(swapped).toMatchObject({ reveal: { kind: 'swap', from: 4 } });
    const to = 'reveal' in swapped && swapped.reveal.kind === 'swap' ? swapped.reveal.to : 0;
    expect([...FIRST_HAND, ...SECOND_HAND]).not.toContain(to);
    expect(first.view().remaining).toContain(to);
    expect(first.view().remaining).not.toContain(4);
    act(first, { kind: 'play', footballerId: to });
    expect(first.view().played).toBe(to);
    expect(room.useJoker(side, 'see-values', {})).toEqual({ error: 'invalid-action' });
  });

  it('hides a played card until both players have played, then reveals the round', () => {
    const { first, second } = dealt();
    const question = first.view().question;
    expect(question).toEqual(second.view().question);

    act(first, { kind: 'play', footballerId: 7 });
    expect(first.view()).toMatchObject({ phase: 'playing', played: 7, opponentPlayed: false });
    expect(second.view()).toMatchObject({ phase: 'playing', played: null, opponentPlayed: true, rounds: [] });

    act(second, { kind: 'play', footballerId: 11 });
    const side = first.session().side;
    const other = second.session().side;
    const view = first.view();
    expect(view.phase).toBe('reveal');
    expect(view.deadlineIn).toBe(TIMING.revealMilliseconds);
    expect(view.question).toBeNull();
    expect(view.rounds).toHaveLength(1);
    expect(view.rounds[0]).toMatchObject({ metric: question?.metric, cards: { [side]: 7, [other]: 11 } });
    expect(view.rounds[0]?.values[side]).not.toBeNull();
    expect(view.remaining).not.toContain(7);
    expect(second.view().opponentRemaining).toBe(DUEL_HAND_SIZE - 1);
    expect(view.scores.x + view.scores.o).toBe(view.rounds[0]?.winner ? 1 : 0);
  });

  it('refuses a card that is not in the hand, a second card and a card during the reveal', () => {
    const { first, second } = dealt();
    act(first, { kind: 'play', footballerId: 11 });
    expect(lastError(first)).toBe('invalid-action');
    act(first, { kind: 'play', footballerId: 1 });
    act(first, { kind: 'play', footballerId: 2 });
    expect(lastError(first)).toBe('invalid-action');
    act(second, { kind: 'play', footballerId: 11 });
    const errors = second.of('error').length;
    act(second, { kind: 'play', footballerId: 12 });
    expect(second.of('error')).toHaveLength(errors + 1);
    expect(second.view().remaining).toContain(12);
  });

  it('plays a card for whoever lets the round run out', () => {
    const { first, second } = dealt();
    act(first, { kind: 'play', footballerId: 1 });
    vi.advanceTimersByTime(PLAY_TIMEOUT);
    expect(first.view().phase).toBe('reveal');
    expect(second.view().remaining).toHaveLength(DUEL_HAND_SIZE - 1);
    vi.advanceTimersByTime(TIMING.revealMilliseconds);
    expect(first.view()).toMatchObject({ phase: 'playing', played: null, opponentPlayed: false });
    expect(first.view().rounds).toHaveLength(1);
  });

  it('finishes after seven rounds on score and records the match', () => {
    const { first, second } = dealt();
    for (let round = 0; round < DUEL_HAND_SIZE; round += 1) {
      playRound(first, second);
      expect(first.of('finished')).toHaveLength(0);
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    const view = first.view();
    const result = first.of('finished')[0]?.result;
    expect(view.phase).toBe('finished');
    expect(view.rounds).toHaveLength(DUEL_HAND_SIZE);
    expect(view.remaining).toEqual([]);
    expect(result?.reason).toBe('score');
    expect(view.result).toEqual(result);
    expect(second.of('finished')[0]?.result).toEqual(result);

    const side = first.session().side;
    const other = second.session().side;
    const expected = view.scores[side] === view.scores[other] ? null : view.scores[side] > view.scores[other] ? side : other;
    expect(result?.winner).toBe(expected);
    expect(history.list(first.player.id)[0]).toMatchObject({
      game: 'duel',
      reason: 'score',
      ownCells: view.scores[side],
      opponentCells: view.scores[other],
      opponent: second.player.username,
    });
    expect(lobby.counts().matches).toBe(0);

    const waits = first.of('queued').length;
    queue(first);
    expect(first.of('queued')).toHaveLength(waits + 1);
  });

  it('gives the match to the opponent when a player leaves', () => {
    const { first, second } = dealt();
    lobby.handle(first.player.id, { type: 'leave', matchId: first.session().matchId });
    const result = second.of('finished')[0]?.result;
    expect(result).toEqual({ winner: second.session().side, reason: 'forfeit' });
    expect(second.view()).toMatchObject({ phase: 'finished', result });
    expect(history.list(second.player.id)[0]).toMatchObject({ game: 'duel', outcome: 'win', reason: 'forfeit' });
  });

  it('gives a returning player the current state of the duel', () => {
    const { first, second } = dealt();
    playRound(first, second);
    vi.advanceTimersByTime(TIMING.revealMilliseconds + 5000);
    lobby.disconnect(first.player.id, first);
    expect(second.of('opponent').at(-1)?.connected).toBe(false);

    const back = attach(first.player);
    const session = back.session();
    expect(session.opponentConnected).toBe(true);
    expect(session.view).toMatchObject({ phase: 'playing', deadlineIn: TIMING.playMilliseconds - 5000 });
    expect(duelOf(session).rounds).toHaveLength(1);
    expect(duelOf(session).hand).toEqual(FIRST_HAND);
    expect(second.of('opponent').at(-1)?.connected).toBe(true);
  });
});

describe('duel against the bot', () => {
  function againstBot(): Client {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    return client;
  }

  it('lets the bot pick a hand in its own time', () => {
    const client = againstBot();
    expect(client.session().view.phase).toBe('picking');
    vi.advanceTimersByTime(TIMING.botPickMilliseconds.maximum - 1);
    expect(client.view().opponentReady).toBe(false);
    vi.advanceTimersByTime(1);
    expect(client.view().opponentReady).toBe(true);
  });

  it('has the bot follow soon after the player is ready and play every round', () => {
    const client = againstBot();
    act(client, { kind: 'hand', footballerIds: FIRST_HAND });
    expect(client.view().phase).toBe('picking');
    vi.advanceTimersByTime(TIMING.botFollowMilliseconds.maximum);
    expect(client.view().phase).toBe('playing');

    for (let round = 0; round < DUEL_HAND_SIZE; round += 1) {
      vi.advanceTimersByTime(TIMING.botPlayMilliseconds.maximum);
      expect(client.view().opponentPlayed).toBe(true);
      act(client, { kind: 'play', footballerId: client.view().remaining[0] as number });
      expect(client.view().rounds).toHaveLength(round + 1);
      vi.advanceTimersByTime(TIMING.revealMilliseconds);
    }
    expect(client.of('finished')[0]?.result.reason).toBe('score');
    expect(history.list(client.player.id)).toHaveLength(1);
  });

  it('finishes on its own when the player never acts', () => {
    const client = againstBot();
    vi.advanceTimersByTime(PICK_TIMEOUT + DUEL_HAND_SIZE * (PLAY_TIMEOUT + TIMING.revealMilliseconds));
    expect(client.of('finished')).toHaveLength(1);
    expect(client.view().rounds).toHaveLength(DUEL_HAND_SIZE);
  });
});
