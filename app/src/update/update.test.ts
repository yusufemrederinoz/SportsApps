import { describe, expect, it } from 'vitest';

import { needsUpdate } from './requirement';
import { openStore, storeLinks } from './store-link';

const INSTALLED = { protocol: 1, dataVersion: '20261009123459' };

describe('needsUpdate', () => {
  it('asks for an update when the server has newer data or a newer protocol', () => {
    expect(needsUpdate(INSTALLED, { protocol: 1, dataVersion: '20261101000000' })).toBe(true);
    expect(needsUpdate(INSTALLED, { protocol: 2, dataVersion: INSTALLED.dataVersion })).toBe(true);
  });

  it('stays quiet when the app matches the server or is ahead of it', () => {
    expect(needsUpdate(INSTALLED, { protocol: 1, dataVersion: INSTALLED.dataVersion })).toBe(false);
    expect(needsUpdate(INSTALLED, { protocol: 1, dataVersion: '20261009103506' })).toBe(false);
    expect(needsUpdate(INSTALLED, { protocol: 1, dataVersion: null })).toBe(false);
  });
});

describe('store links', () => {
  it('opens the store app first and keeps the web page as a fallback', () => {
    expect(storeLinks('android')).toEqual([
      'market://details?id=com.challengegoal.app',
      'https://play.google.com/store/apps/details?id=com.challengegoal.app',
    ]);
    expect(storeLinks('ios')[0]).toMatch(/^itms-apps:\/\/apps\.apple\.com\/app\/id\d+$/);
    expect(storeLinks('ios')[1]).toMatch(/^https:\/\/apps\.apple\.com\/app\/id\d+$/);
  });

  it('falls back to the web page when the store app cannot be opened', async () => {
    const opened: string[] = [];
    const result = await openStore('android', (url) => {
      opened.push(url);
      return url.startsWith('market:') ? Promise.reject(new Error('no store')) : Promise.resolve();
    });
    expect(result).toBe(true);
    expect(opened).toHaveLength(2);
  });

  it('reports failure when nothing can be opened', async () => {
    expect(await openStore('ios', () => Promise.reject(new Error('blocked')))).toBe(false);
  });
});
