import { describe, expect, it, vi } from 'vitest';

import { routeOf } from './push';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-constants', () => ({ default: {}, ExecutionEnvironment: { StoreClient: 'storeClient' } }));

describe('routeOf', () => {
  it('opens the screen a notification is about', () => {
    expect(routeOf({ kind: 'puzzle' })).toBe('/puzzle');
    expect(routeOf({ kind: 'weekly' })).toBe('/leaderboard');
  });

  it('opens nothing special for other notifications', () => {
    expect(routeOf({ kind: 'streak' })).toBeNull();
    expect(routeOf({})).toBeNull();
    expect(routeOf(null)).toBeNull();
  });
});
