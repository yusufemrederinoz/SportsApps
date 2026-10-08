import { SignJWT, decodeJwt, importPKCS8 } from 'jose';

import { reach, type PurchaseVerifier } from './verifiers';

export interface AppleStoreSettings {
  privateKey: string;
  keyId: string;
  issuerId: string;
  bundleId: string;
}

const HOSTS = ['https://api.storekit.itunes.apple.com', 'https://api.storekit-sandbox.itunes.apple.com'];
const AUDIENCE = 'appstoreconnect-v1';
const TOKEN_LIFETIME = '5m';
const TRANSACTION_ID = /^\d{1,32}$/;

export function createAppleVerifier(settings: AppleStoreSettings, fetcher: typeof fetch = fetch): PurchaseVerifier {
  const key = importPKCS8(settings.privateKey, 'ES256');

  const authorization = async () =>
    new SignJWT({ bid: settings.bundleId })
      .setProtectedHeader({ alg: 'ES256', kid: settings.keyId, typ: 'JWT' })
      .setIssuer(settings.issuerId)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(TOKEN_LIFETIME)
      .sign(await key);

  return async (productId, proof) => {
    if (!TRANSACTION_ID.test(proof)) {
      throw new Error('malformed transaction id');
    }
    const token = await authorization();
    for (const host of HOSTS) {
      const response = await reach(fetcher, `${host}/inApps/v1/transactions/${proof}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) {
        continue;
      }
      if (!response.ok) {
        throw new Error(`transaction lookup answered ${response.status}`);
      }
      const { signedTransactionInfo } = (await response.json()) as { signedTransactionInfo: string };
      const transaction = decodeJwt(signedTransactionInfo);
      if (transaction.bundleId !== settings.bundleId || transaction.productId !== productId || transaction.revocationDate) {
        throw new Error('transaction does not match the purchase');
      }
      return { transactionId: String(transaction.transactionId), productId };
    }
    throw new Error('transaction not found');
  };
}
