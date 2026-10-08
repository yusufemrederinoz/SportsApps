import type { BotLevel, Side } from '@sportapps/game-core';
import type {
  ClientMessage,
  GameId,
  JokerId,
  JokerReveal,
  JokerTarget,
  MatchKind,
  PlayDifficulty,
  PlayErrorCode,
  PlayResult,
  ServerMessage,
} from '@sportapps/protocol';

export type { MatchKind };

export interface WaitRange {
  minimum: number;
  maximum: number;
}

export interface Seat {
  userId: string | null;
  username: string;
  rating: number;
}

export interface MatchRecord {
  game: GameId;
  market: string;
  difficulty: PlayDifficulty;
  gridId: number;
  scores: Record<Side, number>;
  moveCount: number;
  startedAt: number;
}

export type JokerResult = { error: PlayErrorCode } | { reveal: JokerReveal };

export const NO_JOKER = (): JokerResult => ({ error: 'joker-unavailable' });

export interface LiveRoom {
  readonly id: string;
  readonly kind: MatchKind;
  readonly game: GameId;
  readonly seats: Record<Side, Seat>;
  sideOf(userId: string): Side | null;
  start(): void;
  greeting(side: Side, opponentConnected: boolean): ServerMessage;
  handle(side: Side, message: ClientMessage): PlayErrorCode | null;
  forfeit(side: Side): void;
  useJoker(side: Side, joker: JokerId, target: JokerTarget): JokerResult;
  finishedAt(): number | null;
  record(): MatchRecord;
  dispose(): void;
}

export interface RoomContext {
  id: string;
  kind: MatchKind;
  market: string;
  difficulty: PlayDifficulty;
  seats: Record<Side, Seat>;
  botLevel: BotLevel;
  now: () => number;
  random: () => number;
  send: (side: Side, message: ServerMessage) => void;
  onFinished: (room: LiveRoom, result: PlayResult) => void;
}

export type RoomFactory = (context: RoomContext) => LiveRoom | null;

export const SIDES: readonly Side[] = ['x', 'o'];

export function seatSide(seats: Record<Side, Seat>, userId: string): Side | null {
  if (seats.x.userId === userId) {
    return 'x';
  }
  return seats.o.userId === userId ? 'o' : null;
}
