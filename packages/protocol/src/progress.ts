import type { GameId } from './play';

export const LEVEL_STEP = 50;
export const WELCOME_GOALS = 15;
export const WIN_GOALS = 1;
export const DAILY_GOALS: readonly number[] = [1, 2, 2, 3, 3, 4, 5];

export type GoalReason = 'welcome' | 'daily' | 'win' | 'joker' | 'puzzle' | 'purchase' | 'ad';

export interface LevelInfo {
  level: number;
  floor: number;
  next: number;
}

export function dailyGoals(streak: number): number {
  const day = Math.min(DAILY_GOALS.length, Math.max(1, Math.floor(streak)));
  return DAILY_GOALS[day - 1] as number;
}

export function levelFloor(level: number): number {
  return LEVEL_STEP * level * (level - 1);
}

export function levelFor(total: number): LevelInfo {
  let level = 1;
  while (levelFloor(level + 1) <= total) {
    level += 1;
  }
  return { level, floor: levelFloor(level), next: levelFloor(level + 1) };
}

export interface GameStanding {
  game: GameId;
  points: number;
  bestPoints: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface PlayRecord {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
}

export interface DailyStatus {
  streak: number;
  bestStreak: number;
  claimedToday: boolean;
  nextReward: number;
}

export interface PlayerProgress {
  total: number;
  level: LevelInfo;
  goals: number;
  daily: DailyStatus;
  record: PlayRecord;
  games: GameStanding[];
}

export interface ProgressResponse {
  progress: PlayerProgress;
}

export interface DailyReward {
  goals: number;
  streak: number;
  welcomeGoals?: number;
}

export interface DailyRewardResponse {
  reward: DailyReward | null;
  progress: PlayerProgress;
}

export interface GoalEntry {
  amount: number;
  balance: number;
  reason: GoalReason;
  createdAt: number;
}

export interface WalletResponse {
  goals: number;
  entries: GoalEntry[];
}

export interface PointsChange {
  game: GameId;
  change: number;
  points: number;
  total: number;
  level: number;
  previousLevel: number;
  goalsEarned: number;
  goals: number;
}
