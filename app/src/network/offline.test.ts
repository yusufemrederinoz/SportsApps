import { describe, expect, it } from 'vitest';

import { isOffline } from './offline';

describe('isOffline', () => {
  it('stays quiet until the device knows its connection', () => {
    expect(isOffline({})).toBe(false);
    expect(isOffline({ isConnected: true })).toBe(false);
    expect(isOffline({ isConnected: true, isInternetReachable: true })).toBe(false);
  });

  it('warns without a network and on a network without internet', () => {
    expect(isOffline({ isConnected: false })).toBe(true);
    expect(isOffline({ isConnected: true, isInternetReachable: false })).toBe(true);
  });
});
