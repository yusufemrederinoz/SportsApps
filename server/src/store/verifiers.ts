import type { PushPlatform } from '@sportapps/protocol';

export interface VerifiedPurchase {
  transactionId: string;
  productId: string;
}

export type PurchaseVerifier = (productId: string, proof: string) => Promise<VerifiedPurchase>;

export type PurchaseVerifiers = Partial<Record<PushPlatform, PurchaseVerifier>>;

export class StoreUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreUnreachableError';
  }
}

export async function reach(fetcher: typeof fetch, url: string, init?: RequestInit): Promise<Response> {
  const host = new URL(url).host;
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch {
    throw new StoreUnreachableError(`no answer from ${host}`);
  }
  if (response.status >= 500 || response.status === 429) {
    throw new StoreUnreachableError(`${host} answered ${response.status}`);
  }
  return response;
}
