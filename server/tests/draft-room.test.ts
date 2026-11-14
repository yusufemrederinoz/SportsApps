import type { DraftCandidateRow } from '@sportapps/football-data';
import { DRAFT_FORMATION } from '@sportapps/game-core';
import {
  DRAFT_METRICS,
  type DraftMetric,
  type DraftView,
  type GameView,
  type PlayFeature,
  type ServerMessage,
  type SessionSnapshot,
} from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAccountService } from '../src/accounts/service';
import { openDatabase, type Database } from '../src/database';
import {
  DEFAULT_DRAFT_TIMING,
  chooseBotPick,
  chooseDraftMetrics,
  createDraftRoomFactory,
  type DraftLibrary,
  type DraftTiming,
} from '../src/play/draft-room';
import { createMatchHistory, type MatchHistory } from '../src/play/history';
import type { LiveRoom } from '../src/play/live-room';
import { createLobby, type Connection, type Lobby, type Player } from '../src/play/lobby';
import { TURN_GRACE_MILLISECONDS } from '../src/play/room';
import { capturing, lastRoom } from './capture';

const CLUBS = Array.from({ length: 10 }, (_, index) => 101 + index);
const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;
const PER_CLUB = 20;
const BOT_WAIT = { minimum: 4000, maximum: 4000 };
const TIMING: DraftTiming = { ...DEFAULT_DRAFT_TIMING, botPickMilliseconds: { minimum: 5000, maximum: 5000 } };
const PICK_TIMEOUT = TIMING.pickMilliseconds + TURN_GRACE_MILLISECONDS;

const footballer = (club: number, number: number) => club * 100 + number;
const positionOf = (id: number) => POSITIONS[(id % 100) % 4] as string;
const valueOf = (id: number) => id % 100;
const clubOf = (id: number) => Math.floor(id / 100);

const METRIC_FACTOR: Record<DraftMetric, number> = { goals: 1, assists: 1, appearances: 10, marketValue: 1_000_000 };
const metricValueOf = (id: number, metric: DraftMetric = 'assists') => valueOf(id) * METRIC_FACTOR[metric];

const library: DraftLibrary = {
  draftClubs: (market) => (market === 'tr' ? CLUBS : []),
  draftEntry: (id, club, metric) =>
    clubOf(id) === club && id % 100 > 0 && id % 100 <= PER_CLUB
      ? { id, position: positionOf(id), value: metricValueOf(id, metric) }
      : null,
  draftCandidates: (_, club, positions, excluded, limit, metric) =>
    Array.from({ length: PER_CLUB }, (__, index) => footballer(club, index + 1))
      .filter((id) => positions.includes(positionOf(id)) && !excluded.includes(id))
      .slice(0, limit)
      .map((id) => ({ id, position: positionOf(id), value: metricValueOf(id, metric), fame: 50 })),
  draftMetricCount: () => PER_CLUB,
};

interface Client extends Connection {
  player: Player;
  received: ServerMessage[];
  of<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[];
  session(): SessionSnapshot;
  view(): DraftView;
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

function draftOf(state: GameView): DraftView {
  if (state.game !== 'draft') {
    throw new Error('not a draft');
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
      return draftOf(client.of('view').at(-1) ?? client.session());
    },
  };
  lobby.connect(client.player, client);
  return client;
}

const queue = (client: Client, market = 'tr') =>
  lobby.handle(client.player.id, { type: 'queue', market, difficulty: 2, game: 'draft' });

const choose = (client: Client, footballerId: number) =>
  lobby.handle(client.player.id, { type: 'act', matchId: client.session().matchId, action: { kind: 'pick', footballerId } });

const lastError = (client: Client) => client.of('error').at(-1)?.code;

const club = (client: Client) => client.view().clubs.at(-1) as number;

function pair(): { first: Client; second: Client } {
  const first = join();
  const second = join();
  queue(first);
  queue(second);
  return { first, second };
}

function playRound(first: Client, second: Client, round: number): void {
  const current = club(first);
  const order = ['GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW'];
  const wanted = order[round] as string;
  const options = Array.from({ length: PER_CLUB }, (_, index) => footballer(current, index + 1)).filter(
    (id) => positionOf(id) === wanted,
  );
  choose(first, options[0] as number);
  choose(second, options[1] as number);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(3_000_000);
  seed = 5;
  rooms = [];
  database = openDatabase(':memory:');
  history = createMatchHistory(database);
  lobby = createLobby({
    games: { draft: capturing(createDraftRoomFactory(library, TIMING), rooms) },
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

describe('draft setup', () => {
  it('opens the first round with one club and empty lineups for both players', () => {
    const { first, second } = pair();
    const session = first.session();
    expect(session.game).toBe('draft');
    expect(session.view).toEqual(second.session().view);
    const view = first.view();
    expect(view).toMatchObject({
      phase: 'playing',
      metric: 'assists',
      totalRounds: DRAFT_FORMATION.length,
      round: 1,
      deadlineIn: TIMING.pickMilliseconds,
      picked: { x: false, o: false },
      scores: { x: 0, o: 0 },
      result: null,
    });
    expect(view.clubs).toHaveLength(1);
    expect(CLUBS).toContain(view.clubs[0]);
    expect(view.lineups.x.map((slot) => slot.position)).toEqual(DRAFT_FORMATION);
  });

  it('reports that no match can be made when the market has no clubs', () => {
    const first = join();
    const second = join();
    queue(first, 'empty');
    queue(second, 'empty');
    expect(lastError(first)).toBe('no-grid');
    expect(lobby.counts().matches).toBe(0);
  });
});

describe('picking footballers', () => {
  it('fills the slot of the position and shows the pick and its value to both players', () => {
    const { first, second } = pair();
    const side = first.session().side;
    const pickId = footballer(club(first), 5);
    choose(first, pickId);
    const view = second.view();
    expect(view.lineups[side][1]).toEqual({ position: 'DF', footballerId: pickId, value: 5, round: 0 });
    expect(view.scores[side]).toBe(5);
    expect(view.picked[side]).toBe(true);
    expect(view.phase).toBe('playing');
  });

  it('refuses footballers of another club, a taken footballer, a second pick and a full position', () => {
    const { first, second } = pair();
    const current = club(first);
    const other = CLUBS.find((id) => id !== current) as number;
    choose(first, footballer(other, 5));
    expect(lastError(first)).toBe('invalid-action');
    choose(first, 999);
    expect(lastError(first)).toBe('invalid-action');

    choose(first, footballer(current, 4));
    choose(second, footballer(current, 4));
    expect(lastError(second)).toBe('invalid-action');
    choose(first, footballer(current, 8));
    expect(lastError(first)).toBe('invalid-action');
    expect(first.view().picked[first.session().side]).toBe(true);
  });

  it('keeps a position closed once its slots are full', () => {
    const { first, second } = pair();
    choose(first, footballer(club(first), 4));
    choose(second, footballer(club(second), 8));
    vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    choose(first, footballer(club(first), 12));
    expect(lastError(first)).toBe('invalid-action');
  });

  it('pauses after both picks and then moves to a new club', () => {
    const { first, second } = pair();
    const opening = club(first);
    choose(first, footballer(opening, 1));
    choose(second, footballer(opening, 2));
    expect(first.view()).toMatchObject({ phase: 'pause', deadlineIn: TIMING.pauseMilliseconds, round: 1 });
    vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    const view = first.view();
    expect(view).toMatchObject({ phase: 'playing', round: 2, picked: { x: false, o: false } });
    expect(view.clubs).toHaveLength(2);
    expect(view.clubs[1]).not.toBe(opening);
  });

  it('adds fifteen seconds to the round and shows assists until the player has picked', () => {
    const { first } = pair();
    const side = first.session().side;
    const room = lastRoom(rooms);
    expect(room.useJoker(side, 'show-assists', {})).toEqual({ reveal: { kind: 'assists', round: 1 } });
    expect(room.useJoker(side, 'extra-time', {})).toEqual({ reveal: { kind: 'time', seconds: 15 } });
    expect(first.view().deadlineIn).toBe(TIMING.pickMilliseconds + 15000);
    vi.advanceTimersByTime(PICK_TIMEOUT);
    expect(first.view().phase).toBe('playing');
    choose(first, footballer(club(first), 3));
    expect(room.useJoker(side, 'extra-time', {})).toEqual({ error: 'invalid-action' });
    vi.advanceTimersByTime(15000);
    expect(first.view().phase).toBe('pause');
  });

  it('passes the round for a player who runs out of time and leaves the slot empty', () => {
    const { first, second } = pair();
    choose(first, footballer(club(first), 3));
    vi.advanceTimersByTime(PICK_TIMEOUT);
    const side = second.session().side;
    expect(first.view().phase).toBe('pause');
    expect(first.view().lineups[side].every((slot) => slot.footballerId === null)).toBe(true);
    vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    expect(first.view().round).toBe(2);
  });

  it('finishes after the last club on the higher total and records the match', () => {
    const { first, second } = pair();
    for (let round = 0; round < DRAFT_FORMATION.length; round += 1) {
      playRound(first, second, round);
      vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    }
    const view = first.view();
    const result = first.of('finished')[0]?.result;
    const side = first.session().side;
    const other = second.session().side;
    expect(view.phase).toBe('finished');
    expect(new Set(view.clubs).size).toBe(DRAFT_FORMATION.length);
    expect(view.lineups[side].every((slot) => slot.footballerId !== null)).toBe(true);
    expect(result).toEqual({ winner: view.scores[side] > view.scores[other] ? side : other, reason: 'score' });
    expect(history.list(first.player.id)[0]).toMatchObject({
      game: 'draft',
      ownCells: view.scores[side],
      opponentCells: view.scores[other],
    });
  });

  it('still names a winner when nobody picks at all', () => {
    const { first } = pair();
    for (let round = 0; round < DRAFT_FORMATION.length; round += 1) {
      vi.advanceTimersByTime(PICK_TIMEOUT);
      vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    }
    expect(first.view().scores).toEqual({ x: 0, o: 0 });
    expect(first.of('finished')[0]?.result).toEqual({ winner: 'o', reason: 'speed' });
  });

  it('gives the match to the opponent when a player leaves', () => {
    const { first, second } = pair();
    lobby.handle(first.player.id, { type: 'leave', matchId: first.session().matchId });
    expect(second.of('finished')[0]?.result).toEqual({ winner: second.session().side, reason: 'forfeit' });
  });
});

describe('a different stat in every round', () => {
  const METRICS: PlayFeature[] = ['draft-metrics'];

  function metricPair(firstFeatures: PlayFeature[] = METRICS, secondFeatures: PlayFeature[] = METRICS) {
    const first = join(firstFeatures);
    const second = join(secondFeatures);
    queue(first);
    queue(second);
    return { first, second, side: first.session().side, other: second.session().side };
  }

  it('spreads the four stats over the rounds without repeating one back to back', () => {
    const clubs = [1, 2, 3, 4, 5, 6, 7];
    for (let run = 0; run < 20; run += 1) {
      const metrics = chooseDraftMetrics(clubs, random, () => true);
      expect(metrics).toHaveLength(clubs.length);
      expect(new Set(metrics)).toEqual(new Set(DRAFT_METRICS));
      metrics.slice(1).forEach((metric, index) => expect(metric).not.toBe(metrics[index]));
    }
  });

  it('skips a stat the club has too little data for', () => {
    const metrics = chooseDraftMetrics([1, 2, 3, 4], random, (_, metric) => metric !== 'marketValue');
    expect(metrics).not.toContain('marketValue');
    expect(chooseDraftMetrics([1], random, () => false)).toEqual(['goals']);
  });

  it('shows the stat of the round and keeps the old assists match for older apps', () => {
    const { first } = metricPair();
    const view = first.view();
    expect(view.metrics).toEqual([view.metric]);
    expect(DRAFT_METRICS).toContain(view.metric);

    const mixed = metricPair(METRICS, []);
    expect(mixed.first.view().metric).toBe('assists');
    expect(mixed.first.view().metrics).toBeUndefined();
  });

  it('hides the rival pick until the round closes, then gives the round to the higher value', () => {
    const { first, second, side, other } = metricPair();
    const current = club(first);
    const metric = first.view().metric;
    choose(first, footballer(current, 10));
    expect(first.view().lineups[side][3]).toMatchObject({ footballerId: footballer(current, 10) });
    expect(second.view().lineups[side].every((slot) => slot.footballerId === null)).toBe(true);
    expect(second.view().picked[side]).toBe(true);
    expect(second.view().scores).toEqual({ x: 0, o: 0 });

    choose(second, footballer(current, 5));
    const paused = second.view();
    expect(paused.phase).toBe('pause');
    expect(paused.lineups[side][3]).toMatchObject({ footballerId: footballer(current, 10), value: metricValueOf(10, metric) });
    expect(paused.scores[side]).toBe(1);
    expect(paused.scores[other]).toBe(0);
  });

  it('lets both players take the same footballer in a round and calls that round even', () => {
    const { first, second } = metricPair();
    const pickId = footballer(club(first), 6);
    choose(first, pickId);
    choose(second, pickId);
    expect(lastError(second)).toBeUndefined();
    expect(second.view()).toMatchObject({ phase: 'pause', scores: { x: 0, o: 0 } });
    vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    choose(first, pickId);
    expect(lastError(first)).toBe('invalid-action');
  });

  it('gives the round to a pick over a missed turn and the match to the side with more rounds', () => {
    const { first, second, side, other } = metricPair();
    choose(first, footballer(club(first), 4));
    vi.advanceTimersByTime(PICK_TIMEOUT);
    expect(first.view().scores).toMatchObject({ [side]: 1, [other]: 0 });
    vi.advanceTimersByTime(TIMING.pauseMilliseconds);

    for (let round = 1; round < DRAFT_FORMATION.length; round += 1) {
      playRound(first, second, round);
      vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    }
    const view = first.view();
    expect(view.phase).toBe('finished');
    expect(view.metrics).toHaveLength(DRAFT_FORMATION.length);
    expect(view.scores[side] + view.scores[other]).toBeLessThanOrEqual(DRAFT_FORMATION.length);
    const winner = view.scores[side] === view.scores[other] ? null : view.scores[side] > view.scores[other] ? side : other;
    if (winner) {
      expect(first.of('finished')[0]?.result).toEqual({ winner, reason: 'score' });
    }
    expect(history.list(first.player.id)[0]).toMatchObject({ ownCells: view.scores[side], opponentCells: view.scores[other] });
  });
});

describe('draft against the bot', () => {
  it('lets the bot pick in every round until both lineups are complete', () => {
    const client = join();
    queue(client);
    vi.advanceTimersByTime(BOT_WAIT.maximum);
    const side = client.session().side;
    const rival = side === 'x' ? 'o' : 'x';
    for (let round = 0; round < DRAFT_FORMATION.length; round += 1) {
      vi.advanceTimersByTime(TIMING.botPickMilliseconds.maximum);
      expect(client.view().picked[rival]).toBe(true);
      const current = club(client);
      const open = client.view().lineups[side].filter((slot) => slot.footballerId === null).map((slot) => slot.position);
      const taken = client.view().lineups[rival].map((slot) => slot.footballerId);
      const choice = Array.from({ length: PER_CLUB }, (_, index) => footballer(current, index + 1)).find(
        (id) => open.includes(positionOf(id) as 'GK') && !taken.includes(id),
      );
      choose(client, choice as number);
      vi.advanceTimersByTime(TIMING.pauseMilliseconds);
    }
    expect(client.of('finished')).toHaveLength(1);
    expect(client.view().lineups[rival].every((slot) => slot.footballerId !== null)).toBe(true);
  });

  it('chooses by level: the best value, one of the best, or a well-known footballer', () => {
    const candidates: DraftCandidateRow[] = [
      { id: 1, position: 'FW', value: 10, fame: 30 },
      { id: 2, position: 'FW', value: 90, fame: 20 },
      { id: 3, position: 'MF', value: 50, fame: 70 },
      { id: 4, position: 'DF', value: 40, fame: 10 },
      { id: 5, position: 'DF', value: 5, fame: 10 },
    ];
    expect(chooseBotPick(candidates, 3, () => 0.9)?.id).toBe(2);
    expect([2, 3, 4, 1]).toContain(chooseBotPick(candidates, 2, () => 0.99)?.id);
    expect(chooseBotPick(candidates, 2, () => 0.99)?.id).not.toBe(5);
    expect(chooseBotPick(candidates, 1, () => 0.5)?.id).toBe(3);
    expect(chooseBotPick([], 3, () => 0)).toBeNull();
  });
});
