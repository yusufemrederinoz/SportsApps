import { readFileSync } from 'node:fs';

import { createAppleVerifier } from './apple';
import { createGoogleVerifier } from './google';
import type { PurchaseVerifiers } from './verifiers';

export function loadPurchaseVerifiers(environment: NodeJS.ProcessEnv = process.env): PurchaseVerifiers {
  const verifiers: PurchaseVerifiers = {};
  const { APPLE_IAP_KEY_PATH, APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_BUNDLE_ID } = environment;
  if (APPLE_IAP_KEY_PATH && APPLE_IAP_KEY_ID && APPLE_IAP_ISSUER_ID && APPLE_BUNDLE_ID) {
    verifiers.ios = createAppleVerifier({
      privateKey: readFileSync(APPLE_IAP_KEY_PATH, 'utf8'),
      keyId: APPLE_IAP_KEY_ID,
      issuerId: APPLE_IAP_ISSUER_ID,
      bundleId: APPLE_BUNDLE_ID,
    });
  }
  const { GOOGLE_PLAY_KEY_PATH, ANDROID_PACKAGE } = environment;
  if (GOOGLE_PLAY_KEY_PATH && ANDROID_PACKAGE) {
    const account = JSON.parse(readFileSync(GOOGLE_PLAY_KEY_PATH, 'utf8')) as { client_email: string; private_key: string };
    verifiers.android = createGoogleVerifier({
      clientEmail: account.client_email,
      privateKey: account.private_key,
      packageName: ANDROID_PACKAGE,
    });
  }
  return verifiers;
}
