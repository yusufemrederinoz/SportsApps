import { randomUUID } from 'node:crypto';

import { opponentOf, type BotLevel, type Side } from '@sportapps/game-core';
import {
  GAME_JOKERS,
  JOKERS_PER_MATCH,
  JOKER_PRICE,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isRoomCode,
  normalizeRoomCode,
  type ClientMessage,
  type GameId,
  type JokerUse,
  type PlayDifficulty,
  type PlayErrorCode,
  type PlayResult,
  type PointsChange,
  type ServerMessage,
} from '@sportapps/protocol';

import { START_RATING } from '../progress/points';
import type { Progress } from '../progress/store';
import { BOT_TARGET_WIN_RATES, RANKED_TARGET_WIN_RATE, botLevelFor, createBotName } from './bot';
import type { MatchHistory } from './history';
import { SIDES, type LiveRoom, type MatchKind, type RoomFactory, type Seat, type WaitRange } from './live-room';

const ADAPTATION_MATCHES = 5;
const DIFFICULTIES: readonly number[] = [1, 2, 3];
const DEFAULT_GAME: GameId = 'grid';
const CHOSEN_BOT_NAME = 'Bot';
const BOT_RATING_SPREAD = 60;
const MATCH_WINDOW_BASE = 150;
const MATCH_WINDOW_PER_SECOND = 75;
const SECOND = 1000;

export interface Connection {
  send(message: ServerMessage): void;
  close(): void;
}

export interface Player {
  id: string;
  username: string;
}

export interface LobbyOptions {
  games: Partial<Record<GameId, RoomFactory>>;
  hasMarket: (market: string) => boolean;
  history: MatchHistory;
  progress?: Progress;
  now?: () => number;
  random?: () => number;
  isUsernameTaken?: (username: string) => boolean;
  botWaitMilliseconds?: WaitRange;
  disconnectGraceMilliseconds?: number;
  roomLifetimeMilliseconds?: number;
  onError?: (error: unknown) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'queued'; key: string }
  | { kind: 'hosting'; code: string }
  | { kind: 'playing'; matchId: string };

interface Member {
  player: Player;
  connection: Connection | null;
  status: Status;
}

interface QueueEntry {
  userId: string;
  rating: number;
  since: number;
  botTimer: ReturnType<typeof setTimeout>;
}

interface HostedRoom {
  code: string;
  hostId: string;
  game: GameId;
  market: string;
  difficulty: PlayDifficulty;
  expiry: ReturnType<typeof setTimeout>;
}

interface ActiveMatch {
  room: LiveRoom;
  botLevel: BotLevel | null;
  forfeits: Map<string, ReturnType<typeof setTimeout>>;
  jokers: JokerUse[];
}

const IDLE: Status = { kind: 'idle' };

export function createLobby(options: LobbyOptions) {
  const { games, history, progress } = options;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const isUsernameTaken = options.isUsernameTaken ?? (() => false);
  const botWait = options.botWaitMilliseconds ?? { minimum: 6000, maximum: 11000 };
  const disconnectGrace = options.disconnectGraceMilliseconds ?? 30000;
  const roomLifetime = options.roomLifetimeMilliseconds ?? 10 * 60 * 1000;
  const reportError = options.onError ?? (() => undefined);

  const members = new Map<string, Member>();
  const queues = new Map<string, QueueEntry[]>();
  const hosted = new Map<string, HostedRoom>();
  const matches = new Map<string, ActiveMatch>();

  const send = (userId: string | null, message: ServerMessage) => {
    if (userId) {
      members.get(userId)?.connection?.send(message);
    }
  };

  const fail = (userId: string, code: PlayErrorCode) => send(userId, { type: 'error', code });

  const isConnected = (userId: string | null) => userId === null || Boolean(members.get(userId)?.connection);

  const settle = (userId: string) => {
    const member = members.get(userId);
    if (!member) {
      return;
    }
    member.status = IDLE;
    if (!member.connection) {
      members.delete(userId);
    }
  };

  const leaveQueue = (userId: string, key: string) => {
    const entries = queues.get(key) ?? [];
    const remaining = entries.filter((entry) => {
      if (entry.userId === userId) {
        clearTimeout(entry.botTimer);
        return false;
      }
      return true;
    });
    if (remaining.length > 0) {
      queues.set(key, remaining);
    } else {
      queues.delete(key);
    }
  };

  const closeHosted = (code: string) => {
    const room = hosted.get(code);
    if (room) {
      clearTimeout(room.expiry);
      hosted.delete(code);
    }
  };

  const release = (member: Member) => {
    if (member.status.kind === 'queued') {
      leaveQueue(member.player.id, member.status.key);
    } else if (member.status.kind === 'hosting') {
      closeHosted(member.status.code);
    }
  };

  const clearForfeit = (active: ActiveMatch, userId: string) => {
    const timer = active.forfeits.get(userId);
    if (timer) {
      clearTimeout(timer);
      active.forfeits.delete(userId);
    }
  };

  const settlePoints = (room: LiveRoom, result: PlayResult): Record<Side, PointsChange | null> => {
    if (room.kind !== 'queue' || !progress) {
      return { x: null, o: null };
    }
    try {
      const { game, difficulty } = room.record();
      return progress.settle({ id: room.id, game, difficulty, seats: room.seats }, result);
    } catch (error) {
      reportError(error);
      return { x: null, o: null };
    }
  };

  const onFinished = (room: LiveRoom, result: PlayResult) => {
    const active = matches.get(room.id);
    const changes = settlePoints(room, result);
    SIDES.forEach((side) => {
      const points = changes[side];
      send(room.seats[side].userId, { type: 'finished', matchId: room.id, result, ...(points ? { points } : {}) });
    });
    try {
      history.record(
        room,
        result,
        room.finishedAt() ?? now(),
        { x: changes.x?.change ?? null, o: changes.o?.change ?? null },
        active?.botLevel ?? null,
      );
    } catch (error) {
      reportError(error);
    }
    active?.forfeits.forEach((timer) => clearTimeout(timer));
    matches.delete(room.id);
    room.dispose();
    SIDES.forEach((side) => {
      const userId = room.seats[side].userId;
      if (userId) {
        settle(userId);
      }
    });
  };

  const startMatch = (
    kind: MatchKind,
    game: GameId,
    market: string,
    difficulty: PlayDifficulty,
    first: Player,
    second: Player | null,
  ) => {
    const humans = second ? [first, second] : [first];
    const firstSide: Side = random() < 0.5 ? 'x' : 'o';
    const taken = (username: string) =>
      username.toLowerCase() === first.username.toLowerCase() || isUsernameTaken(username);
    const ranked = kind === 'queue' && progress !== undefined;
    const ratingOf = (player: Player) => (ranked ? progress.ratingOf(player.id, game) : START_RATING);
    const firstRating = ratingOf(first);
    const botLevel = second
      ? null
      : botLevelFor(
          difficulty,
          history.recentBotOutcomes(first.id, game, ADAPTATION_MATCHES),
          kind === 'queue' ? RANKED_TARGET_WIN_RATE : BOT_TARGET_WIN_RATES[difficulty],
        );
    const botRating = () =>
      ranked ? Math.max(0, Math.round(firstRating + (random() * 2 - 1) * BOT_RATING_SPREAD)) : START_RATING;
    const rival: Seat = second
      ? { userId: second.id, username: second.username, rating: ratingOf(second) }
      : {
          userId: null,
          username: kind === 'bot' ? CHOSEN_BOT_NAME : createBotName(market, taken, random),
          rating: botRating(),
        };
    const seats = {
      [firstSide]: { userId: first.id, username: first.username, rating: firstRating },
      [opponentOf(firstSide)]: rival,
    } as Record<Side, Seat>;
    const room =
      games[game]?.({
        id: randomUUID(),
        kind,
        market,
        difficulty,
        seats,
        botLevel: botLevel ?? difficulty,
        now,
        random,
        send: (side, message) => send(seats[side].userId, message),
        onFinished,
      }) ?? null;
    if (!room) {
      humans.forEach((player) => {
        settle(player.id);
        fail(player.id, 'no-grid');
        send(player.id, { type: 'idle' });
      });
      return;
    }
    matches.set(room.id, { room, botLevel, forfeits: new Map(), jokers: [] });
    humans.forEach((player) => {
      const member = members.get(player.id);
      if (member) {
        member.status = { kind: 'playing', matchId: room.id };
      }
      const side = room.sideOf(player.id);
      if (side) {
        send(player.id, room.greeting(side, true));
      }
    });
    room.start();
  };

  const roomCode = (): string => {
    for (;;) {
      const code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)] ?? ROOM_CODE_ALPHABET[0],
      ).join('');
      if (!hosted.has(code)) {
        return code;
      }
    }
  };

  const isSetup = (game: GameId, market: string, difficulty: number): difficulty is PlayDifficulty =>
    games[game] !== undefined && options.hasMarket(market) && DIFFICULTIES.includes(difficulty);

  const matchWindow = (entry: QueueEntry) =>
    MATCH_WINDOW_BASE + (MATCH_WINDOW_PER_SECOND * Math.max(0, now() - entry.since)) / SECOND;

  const enqueue = (member: Member, game: GameId, market: string, difficulty: PlayDifficulty) => {
    const key = `${game}:${market}:${difficulty}`;
    const entries = queues.get(key) ?? [];
    const rating = progress?.ratingOf(member.player.id, game) ?? START_RATING;
    const distance = (entry: QueueEntry) => Math.abs(entry.rating - rating);
    const waiting = entries
      .filter(
        (entry) =>
          entry.userId !== member.player.id && isConnected(entry.userId) && distance(entry) <= matchWindow(entry),
      )
      .sort((first, second) => distance(first) - distance(second))[0];
    const rival = waiting ? members.get(waiting.userId) : undefined;
    if (waiting && rival) {
      leaveQueue(waiting.userId, key);
      startMatch('queue', game, market, difficulty, rival.player, member.player);
      return;
    }
    const wait = botWait.minimum + random() * Math.max(0, botWait.maximum - botWait.minimum);
    const botTimer = setTimeout(() => {
      const current = members.get(member.player.id);
      if (current?.status.kind === 'queued' && current.status.key === key) {
        leaveQueue(current.player.id, key);
        startMatch('queue', game, market, difficulty, current.player, null);
      }
    }, wait);
    queues.set(key, [...entries, { userId: member.player.id, rating, since: now(), botTimer }]);
    member.status = { kind: 'queued', key };
    send(member.player.id, { type: 'queued' });
  };

  const host = (member: Member, game: GameId, market: string, difficulty: PlayDifficulty) => {
    const code = roomCode();
    const userId = member.player.id;
    const expiry = setTimeout(() => {
      const current = members.get(userId);
      if (current?.status.kind === 'hosting' && current.status.code === code) {
        closeHosted(code);
        current.status = IDLE;
        send(userId, { type: 'idle' });
      }
    }, roomLifetime);
    hosted.set(code, { code, hostId: userId, game, market, difficulty, expiry });
    member.status = { kind: 'hosting', code };
    send(userId, { type: 'room', code });
  };

  const join = (member: Member, rawCode: string) => {
    const code = normalizeRoomCode(rawCode);
    const room = isRoomCode(code) ? hosted.get(code) : undefined;
    const hostMember = room ? members.get(room.hostId) : undefined;
    if (!room || !hostMember?.connection || room.hostId === member.player.id) {
      fail(member.player.id, 'room-not-found');
      return;
    }
    closeHosted(code);
    startMatch('room', room.game, room.market, room.difficulty, hostMember.player, member.player);
  };

  const jokerMessage = (active: ActiveMatch, use: JokerUse, viewer: Side): Extract<ServerMessage, { type: 'joker' }> => ({
    type: 'joker',
    matchId: active.room.id,
    side: use.side,
    joker: use.joker,
    reveal: use.side === viewer ? use.reveal : null,
    used: active.jokers.filter((entry) => entry.side === use.side).indexOf(use) + 1,
  });

  const useJoker = (member: Member, message: Extract<ClientMessage, { type: 'joker' }>) => {
    const userId = member.player.id;
    const found = activeFor(member, message.matchId);
    if (!found) {
      fail(userId, 'not-in-match');
      return;
    }
    const { active, side } = found;
    if (!GAME_JOKERS[active.room.game].includes(message.joker)) {
      fail(userId, 'joker-unavailable');
      return;
    }
    const used = active.jokers.filter((entry) => entry.side === side).length;
    if (used >= JOKERS_PER_MATCH) {
      fail(userId, 'joker-limit');
      return;
    }
    if (!progress || progress.goalsOf(userId) < JOKER_PRICE) {
      fail(userId, 'not-enough-goals');
      return;
    }
    const outcome = active.room.useJoker(side, message.joker, message.target ?? {});
    if ('error' in outcome) {
      fail(userId, outcome.error);
      return;
    }
    const goals = progress.spendGoals(userId, JOKER_PRICE, 'joker', `${active.room.id}:${side}:${used}`);
    const use: JokerUse = { side, joker: message.joker, reveal: outcome.reveal };
    active.jokers.push(use);
    send(userId, { ...jokerMessage(active, use, side), goals });
    const rival = opponentOf(side);
    send(active.room.seats[rival].userId, jokerMessage(active, use, rival));
  };

  const activeFor = (member: Member, matchId: string): { active: ActiveMatch; side: Side } | null => {
    if (member.status.kind !== 'playing' || member.status.matchId !== matchId) {
      return null;
    }
    const active = matches.get(matchId);
    const side = active?.room.sideOf(member.player.id);
    return active && side ? { active, side } : null;
  };

  return {
    connect(player: Player, connection: Connection): void {
      const existing = members.get(player.id);
      if (existing?.connection && existing.connection !== connection) {
        existing.connection.send({ type: 'error', code: 'replaced' });
        existing.connection.close();
      }
      const member: Member = existing ?? { player, connection, status: IDLE };
      member.player = player;
      member.connection = connection;
      members.set(player.id, member);
      connection.send({ type: 'ready' });

      if (member.status.kind === 'queued') {
        connection.send({ type: 'queued' });
      } else if (member.status.kind === 'hosting') {
        connection.send({ type: 'room', code: member.status.code });
      } else if (member.status.kind === 'playing') {
        const active = matches.get(member.status.matchId);
        const side = active?.room.sideOf(player.id);
        if (active && side) {
          clearForfeit(active, player.id);
          const rivalId = active.room.seats[opponentOf(side)].userId;
          connection.send(active.room.greeting(side, isConnected(rivalId)));
          active.jokers.forEach((use) => connection.send({ ...jokerMessage(active, use, side), replay: true }));
          send(rivalId, { type: 'opponent', matchId: active.room.id, connected: true });
        }
      }
    },

    disconnect(userId: string, connection: Connection): void {
      const member = members.get(userId);
      if (!member || member.connection !== connection) {
        return;
      }
      member.connection = null;
      if (member.status.kind !== 'playing') {
        release(member);
        members.delete(userId);
        return;
      }
      const active = matches.get(member.status.matchId);
      const side = active?.room.sideOf(userId);
      if (!active || !side) {
        members.delete(userId);
        return;
      }
      send(active.room.seats[opponentOf(side)].userId, {
        type: 'opponent',
        matchId: active.room.id,
        connected: false,
      });
      clearForfeit(active, userId);
      active.forfeits.set(
        userId,
        setTimeout(() => active.room.forfeit(side), disconnectGrace),
      );
    },

    handle(userId: string, message: ClientMessage): void {
      const member = members.get(userId);
      if (!member?.connection) {
        return;
      }
      switch (message.type) {
        case 'hello':
          return;
        case 'ping':
          send(userId, { type: 'pong' });
          return;
        case 'queue':
        case 'play-bot':
        case 'create-room': {
          const game = message.game ?? DEFAULT_GAME;
          if (member.status.kind !== 'idle') {
            fail(userId, 'busy');
            return;
          }
          if (!isSetup(game, message.market, message.difficulty)) {
            fail(userId, 'invalid-message');
            return;
          }
          if (message.type === 'queue') {
            enqueue(member, game, message.market, message.difficulty);
          } else if (message.type === 'play-bot') {
            startMatch('bot', game, message.market, message.difficulty, member.player, null);
          } else {
            host(member, game, message.market, message.difficulty);
          }
          return;
        }
        case 'join-room':
          if (member.status.kind !== 'idle') {
            fail(userId, 'busy');
            return;
          }
          join(member, message.code);
          return;
        case 'cancel':
          if (member.status.kind === 'playing') {
            fail(userId, 'busy');
            return;
          }
          release(member);
          member.status = IDLE;
          send(userId, { type: 'idle' });
          return;
        case 'answer':
        case 'act': {
          const found = activeFor(member, message.matchId);
          if (!found) {
            fail(userId, 'not-in-match');
            return;
          }
          const error = found.active.room.handle(found.side, message);
          if (error) {
            fail(userId, error);
          }
          return;
        }
        case 'joker':
          useJoker(member, message);
          return;
        case 'leave': {
          const found = activeFor(member, message.matchId);
          if (!found) {
            fail(userId, 'not-in-match');
            return;
          }
          found.active.room.forfeit(found.side);
          return;
        }
      }
    },

    counts() {
      return {
        connected: Array.from(members.values()).filter((member) => member.connection).length,
        queued: Array.from(queues.values()).reduce((total, entries) => total + entries.length, 0),
        hosted: hosted.size,
        matches: matches.size,
      };
    },

    shutdown(): void {
      queues.forEach((entries) => entries.forEach((entry) => clearTimeout(entry.botTimer)));
      queues.clear();
      hosted.forEach((room) => clearTimeout(room.expiry));
      hosted.clear();
      matches.forEach((active) => {
        active.forfeits.forEach((timer) => clearTimeout(timer));
        active.room.dispose();
      });
      matches.clear();
      members.clear();
    },
  };
}

export type Lobby = ReturnType<typeof createLobby>;
