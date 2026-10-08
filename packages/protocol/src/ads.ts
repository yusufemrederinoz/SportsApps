export const AD_REWARD_GOALS = 2;
export const DAILY_AD_LIMIT = 5;

export interface AdStatusResponse {
  goals: number;
  remaining: number;
  reward: number;
}
