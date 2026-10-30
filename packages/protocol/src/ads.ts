export const AD_REWARD_GOALS = 3;
export const DAILY_AD_LIMIT = 5;

export const POINT_PROTECTION_PREFIX = 'protect:';
export const POINT_PROTECTION_PRICE = 5;

export interface PointProtectionResponse {
  points: number;
}

export interface PointProtectionPurchase {
  points: number;
  goals: number;
}

export interface AdStatusResponse {
  goals: number;
  remaining: number;
  reward: number;
}
