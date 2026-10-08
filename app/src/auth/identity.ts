import type { IdentitySignInRequest } from '@sportapps/protocol';
import * as AppleAuthentication from 'expo-apple-authentication';

import { GoogleClients } from '@/constants/identity';

const APPLE_CANCELLED = 'ERR_REQUEST_CANCELED';

export async function requestGoogleIdentity(): Promise<IdentitySignInRequest | null> {
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: GoogleClients.web, iosClientId: GoogleClients.ios });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return null;
  }
  if (!response.data.idToken) {
    throw new Error('Google returned no identity token');
  }
  return { token: response.data.idToken };
}

export async function requestAppleIdentity(): Promise<IdentitySignInRequest | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) {
      throw new Error('Apple returned no identity token');
    }
    return credential.authorizationCode
      ? { token: credential.identityToken, authorizationCode: credential.authorizationCode }
      : { token: credential.identityToken };
  } catch (error) {
    if ((error as { code?: string }).code === APPLE_CANCELLED) {
      return null;
    }
    throw error;
  }
}
