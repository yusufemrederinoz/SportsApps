import { goalPack, type PurchaseRequest, type PushPlatform } from '@sportapps/protocol';

export interface StorePurchase {
  id: string;
  productId: string;
  purchaseToken?: string | null;
}

export function purchaseRequest(purchase: StorePurchase, platform: PushPlatform): PurchaseRequest | null {
  const proof = platform === 'ios' ? purchase.id : purchase.purchaseToken;
  return proof && goalPack(purchase.productId) ? { platform, productId: purchase.productId, proof } : null;
}

export type ShopStatus = 'unavailable' | 'connecting' | 'loading' | 'empty' | 'ready';

export function shopStatus(shop: { failed: boolean; connected: boolean; loaded: boolean; products: number }): ShopStatus {
  if (shop.failed) {
    return 'unavailable';
  }
  if (!shop.connected) {
    return 'connecting';
  }
  if (!shop.loaded) {
    return 'loading';
  }
  return shop.products === 0 ? 'empty' : 'ready';
}
