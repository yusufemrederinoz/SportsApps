import { createVerify } from 'node:crypto';

const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const KEYS_LIFETIME = 24 * 60 * 60 * 1000;
const SIGNATURE_MARK = '&signature=';
const KEY_MARK = '&key_id=';

export type AdSignatureVerifier = (query: string) => Promise<boolean>;

export class AdKeysUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdKeysUnavailableError';
  }
}

export function isSigned(query: string): boolean {
  return `&${query}`.includes(SIGNATURE_MARK);
}

export function createAdSignatureVerifier(fetcher: typeof fetch = fetch, now: () => number = Date.now): AdSignatureVerifier {
  let cache: { keys: Map<string, string>; loadedAt: number } | null = null;

  const load = async (): Promise<Map<string, string>> => {
    let response: Response;
    try {
      response = await fetcher(KEYS_URL);
    } catch {
      throw new AdKeysUnavailableError('no answer from the key server');
    }
    if (!response.ok) {
      throw new AdKeysUnavailableError(`key server answered ${response.status}`);
    }
    const { keys } = (await response.json()) as { keys: { keyId: number; pem: string }[] };
    cache = { keys: new Map(keys.map((key) => [String(key.keyId), key.pem])), loadedAt: now() };
    return cache.keys;
  };

  const keyFor = async (keyId: string): Promise<string | undefined> => {
    const known = cache && now() - cache.loadedAt < KEYS_LIFETIME ? cache.keys.get(keyId) : undefined;
    return known ?? (await load()).get(keyId);
  };

  return async (query) => {
    const signatureAt = query.indexOf(SIGNATURE_MARK);
    const keyAt = query.indexOf(KEY_MARK, signatureAt);
    if (signatureAt < 0 || keyAt < 0) {
      return false;
    }
    const content = query.slice(0, signatureAt);
    const signature = Buffer.from(query.slice(signatureAt + SIGNATURE_MARK.length, keyAt), 'base64url');
    const key = await keyFor(query.slice(keyAt + KEY_MARK.length));
    return key !== undefined && createVerify('SHA256').update(content).verify(key, signature);
  };
}
