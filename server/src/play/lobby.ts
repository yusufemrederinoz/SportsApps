import { randomUUID } from 'node:crypto';

import { opponentOf, type Side } from '@sportapps/game-core';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isRoomCode,
  normalizeRoomCode,
  type ClientMessage,
  type PlayDifficulty,
  type PlayErrorCode,
  type PlayMove,
  type PlayResult,
  type ServerMessage,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { DEFAULT_BOT_TIMING, botLevelFor, createBotName, createBotPlayer, type BotPlayer, type BotTiming } from './bot';
import type { MatchHistory } from './history';
import { createMatchRoom, type MatchKind, type MatchRoom, type Seat } from './room';

const SIDES: readonly Side[] = ['x', 'o'];
const ADAPTATION_MATCHES = 5;
const DIFFICULTIES: readonly number[] = [1, 2, 3];

export interface Connection {
  send(message: ServerMessage): void;
  close(): void;
}

export interface Player {
  id: string;
  username: string;
}

export interface WaitRange {
  minimum: number;
  maximum: number;
}

export interface LobbyOptions {
  library: FootballLibrary;
  history: MatchHistory;
  now?: () => number;
  random?: () => number;
  isUsernameTaken?: (username: string) => boolean;
  botWaitMilliseconds?: WaitRange;
  botTiming?: BotTiming;
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
  market: string;
  difficulty: PlayDifficulty;
  botTimer: ReturnType<typeof setTimeout>;
}

interface HostedRoom {
  code: string;
  hostId: string;
  market: string;
  difficulty: PlayDifficulty;
  expiry: ReturnType<typeof setTimeout>;
}

interface ActiveMatch {
  room: MatchRoom;
  bots: BotPlayer[];
  forfeits: Map<string, ReturnType<typeof setTimeout>>;
}

const IDLE: Status = { kind: 'idle' };

export function createLobby(options: LobbyOptions) {
  const { library, history } = options;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const isUsernameTaken = options.isUsernameTaken ?? (() => false);
  const botWait = options.botWaitMilliseconds ?? { minimum: 6000, maximum: 11000 };
  const botTiming = options.botTiming ?? DEFAULT_BOT_TIMING;
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

  const onMove = (room: MatchRoom, move: PlayMove) => {
    const message: ServerMessage = { type: 'move', matchId: room.id, move, turnEndsIn: room.turnEndsIn() };
    SIDES.forEach((side) => send(room.seats[side].userId, message));
    matches.get(room.id)?.bots.forEach((bot) => bot.takeTurn());
  };

  const onFinished = (room: MatchRoom, result: PlayResult) => {
    const active = matches.get(room.id);
    SIDES.forEach((side) => send(room.seats[side].userId, { type: 'finished', matchId: room.id, result }));
    try {
      history.record(room, result, room.finishedAt() ?? now());
    } catch (error) {
      reportError(error);
    }
    active?.bots.forEach((bot) => bot.stop());
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
    market: string,
    difficulty: PlayDifficulty,
    first: Player,
    second: Player | null,
  ) => {
    const humans = second ? [first, second] : [first];
    const grid = library.pickGrid(market, difficulty, random);
    if (!grid) {
      humans.forEach((player) => {
        settle(player.id);
        fail(player.id, 'no-grid');
        send(player.id, { type: 'idle' });
      });
      return;
    }
    const firstSide: Side = random() < 0.5 ? 'x' : 'o';
    const taken = (username: string) =>
      username.toLowerCase() === first.username.toLowerCase() || isUsernameTaken(username);
    const rival: Seat = second
      ? { userId: second.id, username: second.username }
      : { userId: null, username: createBotName(market, taken, random) };
    const seats = {
      [firstSide]: { userId: first.id, username: first.username },
      [opponentOf(firstSide)]: rival,
    } as Record<Side, Seat>;
    const room = createMatchRoom({
      id: randomUUID(),
      kind,
      market,
      difficulty,
      grid,
      seats,
      startingSide: random() < 0.5 ? 'x' : 'o',
      library,
      now,
      onMove,
      onFinished,
    });
    const bots = second
      ? []
      : [
          createBotPlayer({
            room,
            side: opponentOf(firstSide),
            level: botLevelFor(difficulty, history.recentOutcomes(first.id, ADAPTATION_MATCHES)),
            library,
            random,
            timing: botTiming,
          }),
        ];
    matches.set(room.id, { room, bots, forfeits: new Map() });
    humans.forEach((player) => {
      const member = members.get(player.id);
      if (member) {
        member.status = { kind: 'playing', matchId: room.id };
      }
      const side = room.sideOf(player.id);
      if (side) {
        send(player.id, { type: 'match', match: room.snapshot(side, true) });
      }
    });
    room.start();
    bots.forEach((bot) => bot.takeTurn());
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

  const isSetup = (market: string, difficulty: number): difficulty is PlayDifficulty =>
    library.hasMarket(market) && DIFFICULTIES.includes(difficulty);

  const enqueue = (member: Member, market: string, difficulty: PlayDifficulty) => {
    const key = `${market}:${difficulty}`;
    const entries = queues.get(key) ?? [];
    const waiting = entries.find((entry) => entry.userId !== member.player.id && isConnected(entry.userId));
    const rival = waiting ? members.get(waiting.userId) : undefined;
    if (waiting && rival) {
      leaveQueue(waiting.userId, key);
      startMatch('queue', market, difficulty, rival.player, member.player);
      return;
    }
    const wait = botWait.minimum + random() * Math.max(0, botWait.maximum - botWait.minimum);
    const botTimer = setTimeout(() => {
      const current = members.get(member.player.id);
      if (current?.status.kind === 'queued' && current.status.key === key) {
        leaveQueue(current.player.id, key);
        startMatch('queue', market, difficulty, current.player, null);
      }
    }, wait);
    queues.set(key, [...entries, { userId: member.player.id, market, difficulty, botTimer }]);
    member.status = { kind: 'queued', key };
    send(member.player.id, { type: 'queued' });
  };

  const host = (member: Member, market: string, difficulty: PlayDifficulty) => {
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
    hosted.set(code, { code, hostId: userId, market, difficulty, expiry });
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
    startMatch('room', room.market, room.difficulty, hostMember.player, member.player);
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
          connection.send({ type: 'match', match: active.room.snapshot(side, isConnected(rivalId)) });
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
        case 'create-room': {
          if (member.status.kind !== 'idle') {
            fail(userId, 'busy');
            return;
          }
          if (!isSetup(message.market, message.difficulty)) {
            fail(userId, 'invalid-message');
            return;
          }
          if (message.type === 'queue') {
            enqueue(member, message.market, message.difficulty);
          } else {
            host(member, message.market, message.difficulty);
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
        case 'answer': {
          const found = activeFor(member, message.matchId);
          if (!found) {
            fail(userId, 'not-in-match');
            return;
          }
          const error = found.active.room.answer(found.side, message.turnNumber, message.cell, message.footballerId);
          if (error) {
            fail(userId, error);
          }
          return;
        }
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
        active.bots.forEach((bot) => bot.stop());
        active.forfeits.forEach((timer) => clearTimeout(timer));
        active.room.dispose();
      });
      matches.clear();
      members.clear();
    },
  };
}

export type Lobby = ReturnType<typeof createLobby>;
