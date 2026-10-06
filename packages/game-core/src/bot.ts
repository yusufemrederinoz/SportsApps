import { BOARD_SIZE, cellIndex, completesLine, opponentOf, usedFootballerIds } from './match';
import type { CellPosition, MatchState, Side } from './types';

export interface BotOption {
  position: CellPosition;
  footballerIds: readonly number[];
}

export interface BotProfile {
  accuracy: number;
  answerPool: number;
}

export type BotMove = { kind: 'answer'; position: CellPosition; footballerId: number } | { kind: 'skip' };

export type BotLevel = 1 | 2 | 3;

export const BOT_PROFILES: Readonly<Record<BotLevel, BotProfile>> = {
  1: { accuracy: 0.55, answerPool: 3 },
  2: { accuracy: 0.75, answerPool: 5 },
  3: { accuracy: 0.92, answerPool: 8 },
};

const CENTER = Math.floor(BOARD_SIZE / 2);

function cellPriority(state: MatchState, position: CellPosition, side: Side): number {
  if (completesLine(state, position, side)) {
    return 3;
  }
  if (completesLine(state, position, opponentOf(side))) {
    return 2;
  }
  return position.row === CENTER && position.column === CENTER ? 1 : 0;
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;
}

export function chooseBotMove(
  state: MatchState,
  side: Side,
  options: readonly BotOption[],
  profile: BotProfile,
  random: () => number = Math.random,
): BotMove {
  if (random() >= profile.accuracy) {
    return { kind: 'skip' };
  }
  const used = new Set(usedFootballerIds(state));
  const playable = options
    .filter((option) => state.cells[cellIndex(option.position)] === null)
    .map((option) => ({
      position: option.position,
      footballerIds: option.footballerIds.filter((id) => !used.has(id)).slice(0, profile.answerPool),
      priority: cellPriority(state, option.position, side),
    }))
    .filter((option) => option.footballerIds.length > 0);
  if (playable.length === 0) {
    return { kind: 'skip' };
  }
  const best = Math.max(...playable.map((option) => option.priority));
  const choice = pickRandom(
    playable.filter((option) => option.priority === best),
    random,
  );
  return { kind: 'answer', position: choice.position, footballerId: pickRandom(choice.footballerIds, random) };
}
