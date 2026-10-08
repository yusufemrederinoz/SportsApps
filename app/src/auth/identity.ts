import * as AppleAuthentication from 'expo-apple-authentication';

import { GoogleClients } from '@/constants/identity';

const APPLE_CANCELLED = 'ERR_REQUEST_CANCELED';

export async function requestGoogleToken(): Promise<string | null> {
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
  return response.data.idToken;
}

export async function requestAppleToken(): Promise<string | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) {
      throw new Error('Apple returned no identity token');
    }
    return credential.identityToken;
  } catch (error) {
    if ((error as { code?: string }).code === APPLE_CANCELLED) {
      return null;
    }
    throw error;
  }
}
