import { describe, expect, it } from 'vitest';

import { decideUpdate } from './requirement';
import { openStore, storeLinks } from './store-link';

const INSTALLED = {
  protocol: 1,
  schemaVersion: 1,
  bundledDataVersion: '20261009123459',
  activeDataVersion: '20261009123459',
};
const NEWER = '20261101000000';
const nothingDownloaded = () => false;

describe('decideUpdate', () => {
  it('keeps going when the app matches the server or the server has no data', () => {
    const same = { protocol: 1, dataVersion: INSTALLED.activeDataVersion, schemaVersion: 1 };
    expect(decideUpdate(INSTALLED, same, nothingDownloaded)).toEqual({ action: 'keep' });
    expect(decideUpdate(INSTALLED, { protocol: 1, dataVersion: null, schemaVersion: null }, nothingDownloaded)).toEqual({
      action: 'keep',
    });
  });

  it('downloads data the app does not have yet, newer or older', () => {
    const newer = { protocol: 1, dataVersion: NEWER, schemaVersion: 1 };
    const older = { protocol: 1, dataVersion: '20260901000000', schemaVersion: 1 };
    expect(decideUpdate(INSTALLED, newer, nothingDownloaded)).toEqual({ action: 'download', dataVersion: NEWER });
    expect(decideUpdate(INSTALLED, older, nothingDownloaded)).toEqual({ action: 'download', dataVersion: '20260901000000' });
  });

  it('switches without a download when the data is already on the phone', () => {
    const newer = { protocol: 1, dataVersion: NEWER, schemaVersion: 1 };
    expect(decideUpdate(INSTALLED, newer, (version) => version === NEWER)).toEqual({ action: 'switch', dataVersion: NEWER });

    const downloaded = { ...INSTALLED, activeDataVersion: NEWER };
    const bundled = { protocol: 1, dataVersion: INSTALLED.bundledDataVersion, schemaVersion: 1 };
    expect(decideUpdate(downloaded, bundled, nothingDownloaded)).toEqual({
      action: 'switch',
      dataVersion: INSTALLED.bundledDataVersion,
    });
  });

  it('asks for a new app when the protocol or the shape of the data moved on', () => {
    const protocol = { protocol: 2, dataVersion: INSTALLED.activeDataVersion, schemaVersion: 1 };
    const schema = { protocol: 1, dataVersion: NEWER, schemaVersion: 2 };
    expect(decideUpdate(INSTALLED, protocol, nothingDownloaded)).toEqual({ action: 'update-app' });
    expect(decideUpdate(INSTALLED, schema, nothingDownloaded)).toEqual({ action: 'update-app' });
  });

  it('falls back to asking for a new app when the server cannot hand out data', () => {
    expect(decideUpdate(INSTALLED, { protocol: 1, dataVersion: NEWER }, nothingDownloaded)).toEqual({ action: 'update-app' });
    expect(decideUpdate(INSTALLED, { protocol: 1, dataVersion: '20260901000000' }, nothingDownloaded)).toEqual({
      action: 'keep',
    });
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
