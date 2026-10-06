import type { Difficulty } from '@/data/types';

export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];

export const DIFFICULTY_LABELS = {
  1: 'difficulty.easy',
  2: 'difficulty.medium',
  3: 'difficulty.hard',
} as const satisfies Record<Difficulty, string>;

export function parseDifficulty(value: string | undefined): Difficulty {
  return DIFFICULTIES.find((difficulty) => String(difficulty) === value) ?? 1;
}
