import type { PointsChange } from '@sportapps/protocol';
import { createContext } from 'react';

export const MatchRewardContext = createContext<PointsChange | null>(null);

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
