import type { PushPlatform } from './accounts';

export interface GoalPack {
  productId: string;
  goals: number;
}

export const GOAL_PACKS: readonly GoalPack[] = [
  { productId: 'goals_cg_30', goals: 30 },
  { productId: 'goals_cg_100', goals: 100 },
  { productId: 'goals_cg_250', goals: 250 },
  { productId: 'goals_cg_600', goals: 600 },
];

export function goalPack(productId: string): GoalPack | null {
  return GOAL_PACKS.find((pack) => pack.productId === productId) ?? null;
}

export interface PurchaseRequest {
  platform: PushPlatform;
  productId: string;
  proof: string;
}

export interface PurchaseResponse {
  granted: number;
  goals: number;
}
