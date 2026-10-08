import type { Database } from '../database';
import { localDay, shiftDay, weekStart } from '../progress/points';

export const NOTIFICATION_KINDS = ['puzzle', 'weekly', 'streak', 'comeback'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface PlannedNotification {
  userId: string;
  kind: NotificationKind;
  day: string;
  values: Record<string, number>;
}

const DAY = 24 * 60 * 60 * 1000;
const MORNING_HOURS = { from: 10, until: 12 };
const EVENING_HOURS = { from: 19, until: 21 };
const ACTIVE_DAYS = 3;
const MINIMUM_STREAK = 2;
const COMEBACK_DAYS = [3, 7];
const MONDAY = 1;

export function localHour(time: number, timeZone: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(time));
}

function within(hour: number, window: { from: number; until: number }): boolean {
  return hour >= window.from && hour < window.until;
}

export function createPlanner(database: Database, timeZone: string) {
  const reachable = database.prepare('SELECT DISTINCT user_id AS userId FROM push_tokens');
  const lastSeen = database.prepare('SELECT user_id AS userId, MAX(last_used_at) AS seen FROM sessions GROUP BY user_id');
  const sentToday = database.prepare('SELECT user_id AS userId, kind FROM notification_log WHERE day = ?');
  const playedPuzzle = database.prepare('SELECT DISTINCT user_id AS userId FROM puzzle_plays WHERE day = ?');
  const openStreaks = database.prepare(
    'SELECT user_id AS userId, streak FROM daily_rewards WHERE last_day = ? AND streak >= ?',
  );
  const lastWeekRanks = database.prepare(
    `SELECT userId, RANK() OVER (ORDER BY SUM(change) DESC) AS rank FROM (
       SELECT x_user_id AS userId, x_points_change AS change FROM matches
       WHERE finished_at >= :since AND finished_at < :until AND x_user_id IS NOT NULL AND x_points_change IS NOT NULL
       UNION ALL
       SELECT o_user_id AS userId, o_points_change AS change FROM matches
       WHERE finished_at >= :since AND finished_at < :until AND o_user_id IS NOT NULL AND o_points_change IS NOT NULL
     ) GROUP BY userId`,
  );

  return function plan(now: number): PlannedNotification[] {
    const hour = localHour(now, timeZone);
    const today = localDay(now, timeZone);
    const morning = within(hour, MORNING_HOURS);
    const evening = within(hour, EVENING_HOURS);
    if (!morning && !evening) {
      return [];
    }
    const users = new Set((reachable.all() as { userId: string }[]).map((row) => row.userId));
    const sent = new Set((sentToday.all(today) as { userId: string; kind: string }[]).map((row) => `${row.userId}:${row.kind}`));
    const seen = new Map((lastSeen.all() as { userId: string; seen: number }[]).map((row) => [row.userId, row.seen]));
    const planned: PlannedNotification[] = [];
    const add = (userId: string, kind: NotificationKind, values: Record<string, number> = {}) => {
      if (users.has(userId) && !sent.has(`${userId}:${kind}`)) {
        planned.push({ userId, kind, day: today, values });
      }
    };

    if (morning) {
      const ranked = new Set<string>();
      if (new Date(`${today}T00:00:00Z`).getUTCDay() === MONDAY) {
        const until = weekStart(now, timeZone);
        const rows = lastWeekRanks.all({ since: weekStart(until - DAY, timeZone), until }) as { userId: string; rank: number }[];
        rows.forEach((row) => {
          ranked.add(row.userId);
          add(row.userId, 'weekly', { rank: row.rank });
        });
      }
      const played = new Set((playedPuzzle.all(today) as { userId: string }[]).map((row) => row.userId));
      users.forEach((userId) => {
        const active = (seen.get(userId) ?? 0) >= now - ACTIVE_DAYS * DAY;
        if (active && !played.has(userId) && !ranked.has(userId)) {
          add(userId, 'puzzle');
        }
      });
    }

    if (evening) {
      const streaks = openStreaks.all(shiftDay(today, -1), MINIMUM_STREAK) as { userId: string; streak: number }[];
      streaks.forEach((row) => add(row.userId, 'streak', { streak: row.streak }));
      const comebackDays = new Set(COMEBACK_DAYS.map((days) => shiftDay(today, -days)));
      users.forEach((userId) => {
        const last = seen.get(userId);
        if (last !== undefined && comebackDays.has(localDay(last, timeZone))) {
          add(userId, 'comeback');
        }
      });
    }
    return planned;
  };
}
