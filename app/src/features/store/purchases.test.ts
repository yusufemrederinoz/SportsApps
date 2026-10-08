import { describe, expect, it } from 'vitest';

import { purchaseRequest, shopStatus } from './purchases';

describe('purchaseRequest', () => {
  it('proves an App Store purchase with its transaction id', () => {
    expect(purchaseRequest({ id: '2000000123', productId: 'goals_cg_30', purchaseToken: 'jws' }, 'ios')).toEqual({
      platform: 'ios',
      productId: 'goals_cg_30',
      proof: '2000000123',
    });
  });

  it('proves a Google Play purchase with its purchase token', () => {
    expect(purchaseRequest({ id: 'GPA.1', productId: 'goals_cg_100', purchaseToken: 'token-1' }, 'android')).toEqual({
      platform: 'android',
      productId: 'goals_cg_100',
      proof: 'token-1',
    });
    expect(purchaseRequest({ id: 'GPA.1', productId: 'goals_cg_100', purchaseToken: null }, 'android')).toBeNull();
  });

  it('ignores products that are not goal packs', () => {
    expect(purchaseRequest({ id: '1', productId: 'remove_ads', purchaseToken: 'token-1' }, 'android')).toBeNull();
  });
});

describe('shopStatus', () => {
  const ready = { failed: false, connected: true, loaded: true, products: 4 };

  it('follows the store from connecting to ready', () => {
    expect(shopStatus({ ...ready, connected: false, loaded: false, products: 0 })).toBe('connecting');
    expect(shopStatus({ ...ready, loaded: false, products: 0 })).toBe('loading');
    expect(shopStatus(ready)).toBe('ready');
  });

  it('tells a store without packs from a store that failed', () => {
    expect(shopStatus({ ...ready, products: 0 })).toBe('empty');
    expect(shopStatus({ ...ready, failed: true })).toBe('unavailable');
  });
});
