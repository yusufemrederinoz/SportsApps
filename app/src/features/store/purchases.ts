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

export interface StoreOffer {
  displayPrice: string;
  offerTokenAndroid?: string | null;
  purchaseOptionIdAndroid?: string | null;
}

export interface StoreProduct {
  displayPrice: string;
  discountOffers?: readonly StoreOffer[] | null;
  productStatusAndroid?: string | null;
}

export interface Listing {
  price: string;
  offerToken: string | null;
}

export const PURCHASE_OPTION = 'buy';

export function listingOf(product: StoreProduct): Listing {
  const offers = product.discountOffers ?? [];
  const offer = offers.find((entry) => entry.purchaseOptionIdAndroid === PURCHASE_OPTION) ?? offers[0];
  return { price: product.displayPrice || offer?.displayPrice || '', offerToken: offer?.offerTokenAndroid ?? null };
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
