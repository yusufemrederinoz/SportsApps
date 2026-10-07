import type { PointsChange } from '@sportapps/protocol';
import { createContext } from 'react';

export type MatchReward = PointsChange | 'unranked' | null;

export const MatchRewardContext = createContext<MatchReward>(null);

export function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
