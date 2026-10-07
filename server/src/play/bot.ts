import {
  BOT_PROFILES,
  chooseBotMove,
  emptyCells,
  headersAt,
  usedFootballerIds,
  type BotLevel,
  type Side,
} from '@sportapps/game-core';
import {
  USERNAME_MAX_LENGTH,
  isValidUsername,
  type MatchOutcome,
  type PlayDifficulty,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import names from './bot-names.json' with { type: 'json' };
import type { MatchRoom } from './room';

const SECOND = 1000;
const GUEST_STYLE_CHANCE = 0.35;
const GUEST_PREFIX = 'guest';
const GUEST_DIGITS = 6;
const NAME_ATTEMPTS = 20;
const NEAR_MISS_CHANCE = 0.7;
const NEAR_MISS_POOL = 12;
const ADAPTATION_SAMPLE = 3;
const STRONG_RECORD = 0.7;
const WEAK_RECORD = 0.3;
const LEVELS: readonly BotLevel[] = [1, 2, 3];

export interface BotTiming {
  minimumThinkMilliseconds: number;
  maximumThinkMilliseconds: number;
}

export const DEFAULT_BOT_TIMING: BotTiming = {
  minimumThinkMilliseconds: 2500,
  maximumThinkMilliseconds: 9000,
};

interface NameParts {
  stems: string[];
  suffixes: string[];
  tags: string[];
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function digits(count: number, random: () => number): string {
  return Array.from({ length: count }, () => Math.floor(random() * 10)).join('');
}

function composeName(parts: NameParts, random: () => number): string {
  if (random() < GUEST_STYLE_CHANCE) {
    return GUEST_PREFIX + digits(GUEST_DIGITS, random);
  }
  const stem = pick(parts.stems, random);
  const suffix = pick(parts.suffixes, random);
  const tag = pick(parts.tags, random);
  const patterns = [
    stem + suffix,
    stem + '_' + suffix,
    capitalize(stem) + suffix,
    stem + tag,
    stem + '_' + tag,
    capitalize(stem) + capitalize(tag) + suffix,
  ];
  return pick(patterns, random);
}

export function createBotName(
  market: string,
  isTaken: (username: string) => boolean,
  random: () => number = Math.random,
): string {
  const catalog = names as Record<string, NameParts>;
  const parts = catalog[market] ?? (catalog.default as NameParts);
  for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt += 1) {
    const candidate = composeName(parts, random);
    if (candidate.length <= USERNAME_MAX_LENGTH && isValidUsername(candidate) && !isTaken(candidate)) {
      return candidate;
    }
  }
  return GUEST_PREFIX + digits(GUEST_DIGITS, random);
}

export function botLevelFor(difficulty: PlayDifficulty, recent: readonly MatchOutcome[]): BotLevel {
  if (recent.length < ADAPTATION_SAMPLE) {
    return difficulty;
  }
  const winRate = recent.filter((outcome) => outcome === 'win').length / recent.length;
  const shift = winRate >= STRONG_RECORD ? 1 : winRate <= WEAK_RECORD ? -1 : 0;
  const index = Math.max(0, Math.min(LEVELS.length - 1, difficulty - 1 + shift));
  return LEVELS[index] as BotLevel;
}

export interface BotPlayerOptions {
  room: MatchRoom;
  side: Side;
  level: BotLevel;
  library: Pick<FootballLibrary, 'knownAnswers' | 'nearMisses' | 'minimumFame'>;
  random?: () => number;
  timing?: BotTiming;
}

export interface BotPlayer {
  takeTurn(): void;
  stop(): void;
}

export function createBotPlayer(options: BotPlayerOptions): BotPlayer {
  const { room, side, level, library } = options;
  const random = options.random ?? Math.random;
  const timing = options.timing ?? DEFAULT_BOT_TIMING;
  const minimumFame = library.minimumFame(room.difficulty);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const nearMiss = (): { position: { row: number; column: number }; footballerId: number } | null => {
    const state = room.state();
    const open = emptyCells(state);
    if (open.length === 0) {
      return null;
    }
    const position = pick(open, random);
    const { row, column } = headersAt(room.grid, position);
    const [matching, missing] = random() < 0.5 ? [row, column] : [column, row];
    const used = new Set(usedFootballerIds(state));
    const candidates = library
      .nearMisses(room.market, matching, missing, minimumFame, NEAR_MISS_POOL)
      .filter((footballerId) => !used.has(footballerId));
    return candidates.length > 0 ? { position, footballerId: pick(candidates, random) } : null;
  };

  const play = (turnNumber: number) => {
    timer = null;
    const state = room.state();
    if (state.result || state.turn !== side || state.turnNumber !== turnNumber) {
      return;
    }
    const known = library.knownAnswers(room.market, room.grid, emptyCells(state), minimumFame);
    const move = chooseBotMove(state, side, known, BOT_PROFILES[level], random);
    if (move.kind === 'answer') {
      room.answer(side, turnNumber, move.position, move.footballerId);
      return;
    }
    const miss = random() < NEAR_MISS_CHANCE ? nearMiss() : null;
    if (miss) {
      room.answer(side, turnNumber, miss.position, miss.footballerId);
    }
  };

  return {
    takeTurn() {
      stop();
      const state = room.state();
      if (state.result || state.turn !== side) {
        return;
      }
      const ceiling = Math.max(SECOND, state.rules.turnSeconds * SECOND - 2 * SECOND);
      const spread = Math.max(0, timing.maximumThinkMilliseconds - timing.minimumThinkMilliseconds);
      const delay = Math.min(ceiling, timing.minimumThinkMilliseconds + random() * spread);
      const turnNumber = state.turnNumber;
      timer = setTimeout(() => play(turnNumber), delay);
    },
    stop,
  };
}
