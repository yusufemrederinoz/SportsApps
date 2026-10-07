import type { AuctionAction, AuctionView } from './auction';
import type { ChainAction, ChainView } from './chain';
import type { DraftAction, DraftView } from './draft';
import type { DuelAction, DuelView } from './duel';
import type { HigherAction, HigherView } from './higher';
import type { RareAction, RareView } from './rare';
import type { TopTenView } from './top-ten';

export const PLAY_PATH = '/play';
export const PLAY_PROTOCOL_VERSION = 1;
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type PlaySide = 'x' | 'o';
export type PlayDifficulty = 1 | 2 | 3;
export type PlayFinishReason = 'line' | 'cells' | 'forfeit' | 'score';
export const GAME_IDS = ['grid', 'duel', 'draft', 'higher', 'chain', 'rare', 'auction', 'top-ten'] as const;
export type GameId = (typeof GAME_IDS)[number];
export type PlayAnswerOutcome = 'claimed' | 'wrong' | 'already-used';

export interface PlayCell {
  row: number;
  column: number;
}

export interface PlayResult {
  winner: PlaySide | null;
  reason: PlayFinishReason;
}

export type PlayMove =
  | {
      kind: 'answer';
      turnNumber: number;
      side: PlaySide;
      cell: PlayCell;
      footballerId: number;
      outcome: PlayAnswerOutcome;
    }
  | { kind: 'timeout'; turnNumber: number; side: PlaySide };

export interface MatchSnapshot {
  matchId: string;
  gridId: number;
  market: string;
  difficulty: PlayDifficulty;
  side: PlaySide;
  usernames: Record<PlaySide, string>;
  startingSide: PlaySide;
  turnSeconds: number;
  maxConsecutiveMisses: number;
  moves: PlayMove[];
  turnEndsIn: number;
  result: PlayResult | null;
  opponentConnected: boolean;
}

export type GameView =
  | { game: 'duel'; view: DuelView }
  | { game: 'draft'; view: DraftView }
  | { game: 'higher'; view: HigherView }
  | { game: 'chain'; view: ChainView }
  | { game: 'rare'; view: RareView }
  | { game: 'auction'; view: AuctionView }
  | { game: 'top-ten'; view: TopTenView };

export type GameAction = DuelAction | DraftAction | HigherAction | ChainAction | RareAction | AuctionAction;

export type SessionSnapshot = GameView & {
  matchId: string;
  market: string;
  difficulty: PlayDifficulty;
  side: PlaySide;
  usernames: Record<PlaySide, string>;
  opponentConnected: boolean;
};

export type PlayErrorCode =
  | 'unauthorized'
  | 'outdated-client'
  | 'invalid-message'
  | 'not-ready'
  | 'busy'
  | 'no-grid'
  | 'not-in-match'
  | 'not-your-turn'
  | 'stale-turn'
  | 'cell-taken'
  | 'room-not-found'
  | 'invalid-action'
  | 'replaced';

export type ClientMessage =
  | { type: 'hello'; token: string; protocol: number; dataVersion: string }
  | { type: 'queue'; market: string; difficulty: PlayDifficulty; game?: GameId }
  | { type: 'create-room'; market: string; difficulty: PlayDifficulty; game?: GameId }
  | { type: 'join-room'; code: string }
  | { type: 'cancel' }
  | { type: 'answer'; matchId: string; turnNumber: number; cell: PlayCell; footballerId: number }
  | { type: 'act'; matchId: string; action: GameAction }
  | { type: 'leave'; matchId: string }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'ready' }
  | { type: 'queued' }
  | { type: 'room'; code: string }
  | { type: 'idle' }
  | { type: 'match'; match: MatchSnapshot }
  | { type: 'session'; session: SessionSnapshot }
  | ({ type: 'view'; matchId: string } & GameView)
  | { type: 'move'; matchId: string; move: PlayMove; turnEndsIn: number }
  | { type: 'finished'; matchId: string; result: PlayResult }
  | { type: 'opponent'; matchId: string; connected: boolean }
  | { type: 'error'; code: PlayErrorCode }
  | { type: 'pong' };

export function normalizeRoomCode(value: string): string {
  return Array.from(value.toUpperCase())
    .filter((character) => ROOM_CODE_ALPHABET.includes(character))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
}

export function isRoomCode(value: string): boolean {
  return value.length === ROOM_CODE_LENGTH && normalizeRoomCode(value) === value;
}

export type MatchOutcome = 'win' | 'loss' | 'draw';

export interface MatchSummary {
  id: string;
  game: GameId;
  finishedAt: number;
  difficulty: PlayDifficulty;
  opponent: string;
  outcome: MatchOutcome;
  reason: PlayFinishReason;
  ownCells: number;
  opponentCells: number;
}

export interface MatchHistoryResponse {
  matches: MatchSummary[];
}
