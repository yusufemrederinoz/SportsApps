export const AD_REWARD_GOALS = 2;
export const DAILY_AD_LIMIT = 5;

export const POINT_PROTECTION_PREFIX = 'protect:';

export interface PointProtectionResponse {
  points: number;
}

export interface AdStatusResponse {
  goals: number;
  remaining: number;
  reward: number;
}
