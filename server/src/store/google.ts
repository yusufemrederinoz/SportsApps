import { SignJWT, importPKCS8 } from 'jose';

import { reach, type PurchaseVerifier } from './verifiers';

export interface GoogleStoreSettings {
  clientEmail: string;
  privateKey: string;
  packageName: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const TOKEN_LIFETIME = '10m';
const EARLY_REFRESH = 60 * 1000;
const PURCHASED = 0;

export function createGoogleVerifier(
  settings: GoogleStoreSettings,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): PurchaseVerifier {
  const key = importPKCS8(settings.privateKey, 'RS256');
  let access: { token: string; expiresAt: number } | null = null;

  const accessToken = async (): Promise<string> => {
    if (access && access.expiresAt - EARLY_REFRESH > now()) {
      return access.token;
    }
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(settings.clientEmail)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime(TOKEN_LIFETIME)
      .sign(await key);
    const response = await reach(fetcher, TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: GRANT, assertion }).toString(),
    });
    if (!response.ok) {
      throw new Error(`token request answered ${response.status}`);
    }
    const granted = (await response.json()) as { access_token: string; expires_in: number };
    access = { token: granted.access_token, expiresAt: now() + granted.expires_in * 1000 };
    return access.token;
  };

  return async (productId, proof) => {
    const product = encodeURIComponent(productId);
    const url = `${API}/${settings.packageName}/purchases/products/${product}/tokens/${encodeURIComponent(proof)}`;
    const response = await reach(fetcher, url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (!response.ok) {
      throw new Error(`purchase lookup answered ${response.status}`);
    }
    const purchase = (await response.json()) as { purchaseState?: number; orderId?: string };
    if (purchase.purchaseState !== PURCHASED) {
      throw new Error('purchase is not completed');
    }
    return { transactionId: purchase.orderId ?? proof, productId };
  };
}
