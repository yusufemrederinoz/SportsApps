import { AD_REWARD_GOALS, DAILY_AD_LIMIT, POINT_PROTECTION_PREFIX, type AdStatusResponse } from '@sportapps/protocol';

import { transaction, type Database } from '../database';
import { DEFAULT_TIME_ZONE, localDay } from '../progress/points';
import type { Progress } from '../progress/store';
import { isSigned, type AdSignatureVerifier } from './signature';

export interface AdSettings {
  units: readonly string[];
  verify: AdSignatureVerifier;
}

export interface AdOptions {
  now?: () => number;
  timeZone?: string;
}

export type AdRewardOutcome = 'unsigned' | 'forged' | 'ignored' | 'capped' | 'repeated' | 'granted' | 'protected';

export function createAds(database: Database, progress: Progress, settings: AdSettings, options: AdOptions = {}) {
  const now = options.now ?? Date.now;
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const selectUser = database.prepare('SELECT 1 FROM users WHERE id = ?');
  const selectReward = database.prepare('SELECT 1 FROM ad_rewards WHERE transaction_id = ?');
  const countRewards = database.prepare(
    "SELECT COUNT(*) AS count FROM ad_rewards WHERE user_id = ? AND day = ? AND kind = 'goals'",
  );
  const insertReward = database.prepare(
    'INSERT INTO ad_rewards (transaction_id, user_id, day, created_at, kind) VALUES (?, ?, ?, ?, ?)',
  );

  const watched = (userId: string, day: string): number => (countRewards.get(userId, day) as { count: number }).count;

  return {
    status(userId: string): AdStatusResponse {
      const remaining = settings.units.length === 0 ? 0 : Math.max(0, DAILY_AD_LIMIT - watched(userId, localDay(now(), timeZone)));
      return { goals: progress.goalsOf(userId), remaining, reward: AD_REWARD_GOALS };
    },

    async reward(query: string): Promise<AdRewardOutcome> {
      if (!isSigned(query)) {
        return 'unsigned';
      }
      if (!(await settings.verify(query))) {
        return 'forged';
      }
      const callback = new URLSearchParams(query);
      const userId = callback.get('user_id');
      const transactionId = callback.get('transaction_id');
      if (!userId || !transactionId || !settings.units.includes(callback.get('ad_unit') ?? '') || !selectUser.get(userId)) {
        return 'ignored';
      }
      const purpose = callback.get('custom_data') ?? '';
      return transaction(database, (): AdRewardOutcome => {
        if (selectReward.get(transactionId)) {
          return 'repeated';
        }
        const day = localDay(now(), timeZone);
        if (purpose.startsWith(POINT_PROTECTION_PREFIX)) {
          if (progress.protectPoints(userId, purpose.slice(POINT_PROTECTION_PREFIX.length)) === 0) {
            return 'ignored';
          }
          insertReward.run(transactionId, userId, day, now(), 'protect');
          return 'protected';
        }
        if (watched(userId, day) >= DAILY_AD_LIMIT) {
          return 'capped';
        }
        insertReward.run(transactionId, userId, day, now(), 'goals');
        progress.creditGoals(userId, AD_REWARD_GOALS, 'ad', transactionId);
        return 'granted';
      });
    },
  };
}

export type Ads = ReturnType<typeof createAds>;
