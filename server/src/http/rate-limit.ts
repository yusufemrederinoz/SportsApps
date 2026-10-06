export interface RateLimiter {
  allow(key: string): boolean;
}

interface Window {
  startedAt: number;
  count: number;
}

export function createRateLimiter(limit: number, windowMilliseconds: number, now: () => number = Date.now): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    allow(key) {
      const time = now();
      const current = windows.get(key);
      if (!current || time - current.startedAt >= windowMilliseconds) {
        if (windows.size > 10_000) {
          for (const [storedKey, stored] of windows) {
            if (time - stored.startedAt >= windowMilliseconds) {
              windows.delete(storedKey);
            }
          }
        }
        windows.set(key, { startedAt: time, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= limit;
    },
  };
}
