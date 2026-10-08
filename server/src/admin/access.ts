import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ONLINE_WINDOW = 5 * 60 * 1000;

export function loadAdminKey(environment: NodeJS.ProcessEnv = process.env): string | undefined {
  const { ADMIN_KEY_PATH } = environment;
  return ADMIN_KEY_PATH ? readFileSync(ADMIN_KEY_PATH, 'utf8').trim() : undefined;
}

export function isAdminKey(candidate: string, key: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(candidate), digest(key));
}

export function createPresence(now: () => number = Date.now, window: number = ONLINE_WINDOW) {
  const seen = new Map<string, number>();

  return {
    touch(userId: string): void {
      seen.set(userId, now());
    },

    count(): number {
      const oldest = now() - window;
      for (const [userId, time] of seen) {
        if (time < oldest) {
          seen.delete(userId);
        }
      }
      return seen.size;
    },
  };
}
