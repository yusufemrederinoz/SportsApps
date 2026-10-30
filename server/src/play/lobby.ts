import { randomUUID } from 'node:crypto';

import { opponentOf, type BotLevel, type Side } from '@sportapps/game-core';
import {
  GAME_JOKERS,
  JOKERS_PER_MATCH,
  JOKER_PRICE,
  REACTIONS_PER_MATCH,
  REACTION_COOLDOWN_MILLISECONDS,
  REMATCH_WINDOW_MILLISECONDS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  isRoomCode,
  normalizeRoomCode,
  type ClientMessage,
  type GameId,
  type JokerUse,
  type MatchOutcome,
  type PlayDifficulty,
  type PlayErrorCode,
  type PlayFeature,
  type PlayResult,
  type PointsChange,
  type ReactionId,
  type RematchState,
  type ServerMessage,
} from '@sportapps/protocol';

import type { LiveSnapshot } from '../admin/stats';
import { START_RATING } from '../progress/points';
import type { Progress } from '../progress/store';
import { BOT_TARGET_WIN_RATES, RANKED_TARGET_WIN_RATE, botLevelFor, createBotName } from './bot';
import type { MatchHistory } from './history';
import {
  SIDES,
  seatSide,
  type LiveRoom,
  type MatchKind,
  type RoomFactory,
  type Seat,
  type WaitRange,
} from './live-room';
import type { BotRoster } from './roster';

const ADAPTATION_MATCHES = 5;
const DIFFICULTIES: readonly number[] = [1, 2, 3];
const DEFAULT_GAME: GameId = 'grid';
const CHOSEN_BOT_NAME = 'Bot';
const BOT_RATING_SPREAD = 60;
const MATCH_WINDOW_BASE = 150;
const MATCH_WINDOW_PER_SECOND = 75;
const NEIGHBOR_WAIT_MILLISECONDS = 3000;
const SECOND = 1000;
const REACTION_COOLDOWN_SLACK = 500;
const BOT_REMATCH_ACCEPT = 0.7;
const BOT_REMATCH_OFFER = 0.5;
const BOT_REACTION_REPLY = 0.35;
const BOT_REACTION_AFTER_JOKER = 0.25;
const BOT_REACTION_AT_END = 0.5;
const BOT_REACTIONS_PER_MATCH = 5;
const BOT_JOKER_REACTIONS: readonly ReactionId[] = ['sweat', 'shock', 'var'];
const BOT_ENDINGS: Readonly<Record<MatchOutcome, readonly ReactionId[]>> = {
  win: ['cool', 'tease', 'laugh'],
  loss: ['cry', 'clap', 'angry', 'sweat'],
  draw: ['shock', 'clap'],
};
const BOT_REPLIES: Readonly<Record<ReactionId, readonly ReactionId[]>> = {
  laugh: ['cool', 'tease', 'laugh'],
  tease: ['angry', 'laugh', 'tease'],
  cool: ['laugh', 'tease', 'shock'],
  shock: ['laugh', 'cool'],
  sweat: ['laugh', 'tease', 'cool'],
  cry: ['laugh', 'clap', 'tease'],
  angry: ['laugh', 'cool', 'tease'],
  clap: ['clap', 'cool'],
  'red-card': ['shock', 'var', 'angry'],
  var: ['offside', 'red-card', 'shock'],
  offside: ['var', 'angry', 'shock'],
  save: ['shock', 'clap', 'sweat'],
};

export interface Connection {
  send(message: ServerMessage): void;
  close(): void;
}

export interface Player {
  id: string;
  username: string;
  features?: readonly PlayFeature[];
}

export interface LobbyOptions {
  games: Partial<Record<GameId, RoomFactory>>;
  hasMarket: (market: string) => boolean;
  history: MatchHistory;
  progress?: Progress;
  now?: () => number;
  random?: () => number;
  isUsernameTaken?: (username: string) => boolean;
  roster?: BotRoster;
  botWaitMilliseconds?: WaitRange;
  neighborWaitMilliseconds?: number;
  disconnectGraceMilliseconds?: number;
  roomLifetimeMilliseconds?: number;
  rematchWindowMilliseconds?: number;
  botThinkMilliseconds?: WaitRange;
  rankedRooms?: boolean;
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
  reactions: { matchId: string; count: number; lastAt: number } | null;
  botReactions: { matchId: string; count: number } | null;
}

interface QueueEntry {
  userId: string;
  rating: number;
  difficulty: PlayDifficulty;
  since: number;
  timers: ReturnType<typeof setTimeout>[];
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
  ranked: boolean;
  botLevel: BotLevel | null;
  forfeits: Map<string, ReturnType<typeof setTimeout>>;
  jokers: JokerUse[];
}

interface Rematch {
  matchId: string;
  kind: MatchKind;
  game: GameId;
  market: string;
  difficulty: PlayDifficulty;
  seats: Record<Side, Seat>;
  wants: Set<Side>;
  botAnswered: boolean;
  endsAt: number;
  timers: ReturnType<typeof setTimeout>[];
}

const IDLE: Status = { kind: 'idle' };

export function createLobby(options: LobbyOptions) {
  const { games, history, progress } = options;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const isUsernameTaken = options.isUsernameTaken ?? (() => false);
  const { roster } = options;
  const busyBots = new Set<string>();
  const botWait = options.botWaitMilliseconds ?? { minimum: 6000, maximum: 11000 };
  const neighborWait = options.neighborWaitMilliseconds ?? NEIGHBOR_WAIT_MILLISECONDS;
  const disconnectGrace = options.disconnectGraceMilliseconds ?? 30000;
  const roomLifetime = options.roomLifetimeMilliseconds ?? 10 * 60 * 1000;
  const rematchWindow = options.rematchWindowMilliseconds ?? REMATCH_WINDOW_MILLISECONDS;
  const botThink = options.botThinkMilliseconds ?? { minimum: 1200, maximum: 3500 };
  const rankedRooms = options.rankedRooms ?? true;
  const reportError = options.onError ?? (() => undefined);

  const members = new Map<string, Member>();
  const queues = new Map<string, QueueEntry[]>();
  const hosted = new Map<string, HostedRoom>();
  const matches = new Map<string, ActiveMatch>();
  const rematches = new Map<string, Rematch>();
  const pending = new Set<ReturnType<typeof setTimeout>>();

  const send = (userId: string | null, message: ServerMessage) => {
    if (userId) {
      members.get(userId)?.connection?.send(message);
    }
  };

  const fail = (userId: string, code: PlayErrorCode) => send(userId, { type: 'error', code });

  const isConnected = (userId: string | null) => userId === null || Boolean(members.get(userId)?.connection);

  const supports = (userId: string | null, feature: PlayFeature) =>
    userId !== null && (members.get(userId)?.player.features?.includes(feature) ?? false);

  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] ?? (items[0] as T);

  const between = (range: WaitRange) => range.minimum + random() * Math.max(0, range.maximum - range.minimum);

  const later = (task: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pending.delete(timer);
      task();
    }, delay);
    pending.add(timer);
  };

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
        entry.timers.forEach((timer) => clearTimeout(timer));
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

  const settlePoints = (room: LiveRoom, ranked: boolean, result: PlayResult): Record<Side, PointsChange | null> => {
    if (!ranked || !progress) {
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
    const changes = settlePoints(room, active?.ranked ?? false, result);
    const rematch = openRematch(room, result);
    SIDES.forEach((side) => {
      const points = changes[side];
      send(room.seats[side].userId, {
        type: 'finished',
        matchId: room.id,
        result,
        ...(points ? { points } : {}),
        ...(rematch ? { rematch: true } : {}),
      });
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
      const { userId, botId } = room.seats[side];
      if (userId) {
        settle(userId);
      }
      if (botId) {
        busyBots.delete(botId);
      }
    });
    SIDES.forEach((side) => {
      const rival = room.seats[opponentOf(side)].userId;
      if (room.seats[side].userId === null && rival) {
        botReact(room.id, side, rival, BOT_ENDINGS[outcomeOf(side, result)], BOT_REACTION_AT_END);
      }
    });
  };

  const outcomeOf = (side: Side, result: PlayResult): MatchOutcome =>
    result.winner === null ? 'draw' : result.winner === side ? 'win' : 'loss';

  const reactionTarget = (member: Member, matchId: string): { seats: Record<Side, Seat>; side: Side } | null => {
    const found = activeFor(member, matchId);
    if (found) {
      return { seats: found.active.room.seats, side: found.side };
    }
    const rematch = rematches.get(matchId);
    const side = rematch ? seatSide(rematch.seats, member.player.id) : null;
    return rematch && side ? { seats: rematch.seats, side } : null;
  };

  const botReact = (matchId: string, botSide: Side, userId: string, choices: readonly ReactionId[], chance: number) => {
    const member = members.get(userId);
    if (!member || !supports(userId, 'reactions') || random() >= chance) {
      return;
    }
    const used = member.botReactions?.matchId === matchId ? member.botReactions.count : 0;
    if (used >= BOT_REACTIONS_PER_MATCH) {
      return;
    }
    member.botReactions = { matchId, count: used + 1 };
    later(() => {
      const target = reactionTarget(member, matchId);
      if (target && target.seats[botSide].userId === null) {
        send(userId, { type: 'reaction', matchId, side: botSide, reaction: pick(choices) });
      }
    }, between(botThink));
  };

  const react = (member: Member, message: Extract<ClientMessage, { type: 'react' }>) => {
    const target = reactionTarget(member, message.matchId);
    if (!target) {
      return;
    }
    const time = now();
    const log = member.reactions?.matchId === message.matchId ? member.reactions : null;
    const count = log?.count ?? 0;
    const cooling = log !== null && time - log.lastAt < REACTION_COOLDOWN_MILLISECONDS - REACTION_COOLDOWN_SLACK;
    if (count >= REACTIONS_PER_MATCH || cooling) {
      return;
    }
    member.reactions = { matchId: message.matchId, count: count + 1, lastAt: time };
    const rivalSide = opponentOf(target.side);
    const rival = target.seats[rivalSide].userId;
    if (rival === null) {
      botReact(message.matchId, rivalSide, member.player.id, BOT_REPLIES[message.reaction], BOT_REACTION_REPLY);
    } else if (supports(rival, 'reactions')) {
      send(rival, { type: 'reaction', matchId: message.matchId, side: target.side, reaction: message.reaction });
    }
  };

  const closeRematch = (rematch: Rematch, state: RematchState | null, skip: string | null = null) => {
    if (rematches.get(rematch.matchId) !== rematch) {
      return;
    }
    rematch.timers.forEach((timer) => clearTimeout(timer));
    rematches.delete(rematch.matchId);
    if (state) {
      SIDES.forEach((side) => {
        const userId = rematch.seats[side].userId;
        if (userId !== skip) {
          send(userId, { type: 'rematch', matchId: rematch.matchId, state, endsIn: 0 });
        }
      });
    }
  };

  const withdrawRematch = (userId: string) => {
    const rematch = [...rematches.values()].find((entry) => seatSide(entry.seats, userId) !== null);
    if (rematch) {
      closeRematch(rematch, 'declined', userId);
    }
  };

  const beginRematch = (rematch: Rematch) => {
    closeRematch(rematch, null);
    const humans = SIDES.flatMap((side) => {
      const userId = rematch.seats[side].userId;
      return userId ? [members.get(userId)] : [];
    });
    const bot = SIDES.map((side) => rematch.seats[side]).find((seat) => seat.userId === null) ?? null;
    const ready = humans.every((member) => member?.connection && member.status.kind === 'idle');
    const [first, second] = humans;
    if (!ready || !first || (bot?.botId && busyBots.has(bot.botId))) {
      humans.forEach((member) => {
        if (member) {
          send(member.player.id, { type: 'rematch', matchId: rematch.matchId, state: 'declined', endsIn: 0 });
        }
      });
      return;
    }
    const { kind, game, market, difficulty } = rematch;
    startMatch(kind, game, market, difficulty, first.player, second?.player ?? null, bot);
  };

  const wantRematch = (rematch: Rematch, side: Side) => {
    if (rematches.get(rematch.matchId) !== rematch) {
      return;
    }
    rematch.wants.add(side);
    const rivalSide = opponentOf(side);
    if (rematch.wants.has(rivalSide)) {
      beginRematch(rematch);
      return;
    }
    const endsIn = Math.max(0, rematch.endsAt - now());
    send(rematch.seats[side].userId, { type: 'rematch', matchId: rematch.matchId, state: 'waiting', endsIn });
    send(rematch.seats[rivalSide].userId, { type: 'rematch', matchId: rematch.matchId, state: 'offered', endsIn });
    if (rematch.seats[rivalSide].userId === null && !rematch.botAnswered) {
      rematch.botAnswered = true;
      const accept = random() < BOT_REMATCH_ACCEPT;
      const answer = () => (accept ? wantRematch(rematch, rivalSide) : closeRematch(rematch, 'declined'));
      rematch.timers.push(setTimeout(answer, between(botThink)));
    }
  };

  const openRematch = (room: LiveRoom, result: PlayResult): boolean => {
    const humans = SIDES.flatMap((side) => (room.seats[side].userId ? [room.seats[side].userId] : []));
    if (room.kind === 'bot' || !humans.every((userId) => supports(userId, 'rematch') && isConnected(userId))) {
      return false;
    }
    const { market, difficulty } = room.record();
    const rematch: Rematch = {
      matchId: room.id,
      kind: room.kind,
      game: room.game,
      market,
      difficulty,
      seats: room.seats,
      wants: new Set(),
      botAnswered: false,
      endsAt: now() + rematchWindow,
      timers: [],
    };
    rematch.timers.push(setTimeout(() => closeRematch(rematch, 'expired'), rematchWindow));
    rematches.set(room.id, rematch);
    const bot = SIDES.find((side) => room.seats[side].userId === null);
    if (bot && result.winner !== null && result.winner !== bot && random() < BOT_REMATCH_OFFER) {
      rematch.botAnswered = true;
      rematch.timers.push(setTimeout(() => wantRematch(rematch, bot), between(botThink)));
    }
    return true;
  };

  const startMatch = (
    kind: MatchKind,
    game: GameId,
    market: string,
    difficulty: PlayDifficulty,
    first: Player,
    second: Player | null,
    previousBot: Seat | null = null,
  ) => {
    const humans = second ? [first, second] : [first];
    const firstSide: Side = random() < 0.5 ? 'x' : 'o';
    const taken = (username: string) =>
      username.toLowerCase() === first.username.toLowerCase() || isUsernameTaken(username);
    const scoredRoom = kind === 'room' && rankedRooms && humans.every((player) => player.features?.includes('ranked-rooms'));
    const ranked = progress !== undefined && (kind === 'queue' || scoredRoom);
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
    const listed =
      !second && !previousBot && kind === 'queue' ? (roster?.pick(market, first.id, busyBots) ?? null) : null;
    const rival: Seat = second
      ? { userId: second.id, username: second.username, rating: ratingOf(second) }
      : previousBot
        ? { ...previousBot, rating: botRating() }
        : {
          userId: null,
          ...(listed ? { botId: listed.id } : {}),
          username: kind === 'bot' ? CHOSEN_BOT_NAME : (listed?.username ?? createBotName(market, taken, random)),
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
    matches.set(room.id, { room, ranked, botLevel, forfeits: new Map(), jokers: [] });
    if (rival.botId) {
      busyBots.add(rival.botId);
    }
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

  const isNeighbor = (first: PlayDifficulty, second: PlayDifficulty) => Math.abs(first - second) === 1;
  const lowerOf = (first: PlayDifficulty, second: PlayDifficulty): PlayDifficulty => (first < second ? first : second);

  const enqueue = (member: Member, game: GameId, market: string, difficulty: PlayDifficulty) => {
    const key = `${game}:${market}`;
    const entries = queues.get(key) ?? [];
    const userId = member.player.id;
    const rating = progress?.ratingOf(userId, game) ?? START_RATING;
    const distance = (entry: QueueEntry) => Math.abs(entry.rating - rating);
    const pairable = (entry: QueueEntry) =>
      entry.difficulty === difficulty || (isNeighbor(entry.difficulty, difficulty) && now() - entry.since >= neighborWait);
    const waiting = entries
      .filter(
        (entry) =>
          entry.userId !== userId && isConnected(entry.userId) && distance(entry) <= matchWindow(entry) && pairable(entry),
      )
      .sort(
        (first, second) =>
          Number(first.difficulty !== difficulty) - Number(second.difficulty !== difficulty) ||
          distance(first) - distance(second),
      )[0];
    const rival = waiting ? members.get(waiting.userId) : undefined;
    if (waiting && rival) {
      leaveQueue(waiting.userId, key);
      startMatch('queue', game, market, lowerOf(waiting.difficulty, difficulty), rival.player, member.player);
      return;
    }
    const stillQueued = () => {
      const current = members.get(userId);
      return current?.status.kind === 'queued' && current.status.key === key ? current : null;
    };
    const wait = botWait.minimum + random() * Math.max(0, botWait.maximum - botWait.minimum);
    const botTimer = setTimeout(() => {
      const current = stillQueued();
      if (current) {
        leaveQueue(userId, key);
        startMatch('queue', game, market, difficulty, current.player, null);
      }
    }, wait);
    const neighborTimer = setTimeout(() => {
      const current = stillQueued();
      const own = queues.get(key)?.find((entry) => entry.userId === userId);
      if (!current || !own) {
        return;
      }
      const neighbor = (queues.get(key) ?? [])
        .filter(
          (entry) =>
            entry.userId !== userId &&
            isConnected(entry.userId) &&
            isNeighbor(entry.difficulty, difficulty) &&
            distance(entry) <= Math.max(matchWindow(entry), matchWindow(own)),
        )
        .sort((first, second) => distance(first) - distance(second))[0];
      const rival = neighbor ? members.get(neighbor.userId) : undefined;
      if (neighbor && rival) {
        leaveQueue(neighbor.userId, key);
        leaveQueue(userId, key);
        startMatch('queue', game, market, lowerOf(neighbor.difficulty, difficulty), rival.player, current.player);
      }
    }, neighborWait);
    queues.set(key, [...entries, { userId, rating, difficulty, since: now(), timers: [botTimer, neighborTimer] }]);
    member.status = { kind: 'queued', key };
    send(userId, { type: 'queued' });
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
    if (active.room.seats[rival].userId === null) {
      botReact(active.room.id, rival, userId, BOT_JOKER_REACTIONS, BOT_REACTION_AFTER_JOKER);
    }
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
      const member: Member = existing ?? { player, connection, status: IDLE, reactions: null, botReactions: null };
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
        withdrawRematch(userId);
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

    evict(userId: string): void {
      const member = members.get(userId);
      if (!member) {
        return;
      }
      if (member.status.kind === 'playing') {
        const active = matches.get(member.status.matchId);
        const side = active?.room.sideOf(userId);
        if (active && side) {
          clearForfeit(active, userId);
          active.room.forfeit(side);
        }
      } else {
        release(member);
        withdrawRematch(userId);
      }
      member.connection?.close();
      members.delete(userId);
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
          withdrawRematch(userId);
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
          withdrawRematch(userId);
          join(member, message.code);
          return;
        case 'cancel':
          if (member.status.kind === 'playing') {
            fail(userId, 'busy');
            return;
          }
          release(member);
          withdrawRematch(userId);
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
        case 'react':
          react(member, message);
          return;
        case 'rematch': {
          const rematch = rematches.get(message.matchId);
          const side = rematch ? seatSide(rematch.seats, userId) : null;
          if (!rematch || !side || member.status.kind !== 'idle') {
            send(userId, { type: 'rematch', matchId: message.matchId, state: 'declined', endsIn: 0 });
            return;
          }
          wantRematch(rematch, side);
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

    snapshot(): LiveSnapshot {
      const running = [...matches.values()].filter((active) => active.room.finishedAt() === null);
      const matchesByGame: LiveSnapshot['matchesByGame'] = {};
      running.forEach(({ room }) => {
        matchesByGame[room.game] = (matchesByGame[room.game] ?? 0) + 1;
      });
      return {
        connected: [...members.values()].filter((member) => member.connection !== null).length,
        queued: [...queues.values()].reduce((total, entries) => total + entries.length, 0),
        waitingRooms: hosted.size,
        matches: running.length,
        matchesByGame,
      };
    },

    shutdown(): void {
      queues.forEach((entries) => entries.forEach((entry) => entry.timers.forEach((timer) => clearTimeout(timer))));
      queues.clear();
      hosted.forEach((room) => clearTimeout(room.expiry));
      hosted.clear();
      rematches.forEach((rematch) => rematch.timers.forEach((timer) => clearTimeout(timer)));
      rematches.clear();
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
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
