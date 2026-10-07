import { API_PREFIX } from '@sportapps/protocol';
import Constants from 'expo-constants';

import version from '@/assets/data/version.json';

import { createApiClient } from './client';
import { resolveApiUrl } from './url';

export const apiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, Constants.expoConfig?.hostUri, __DEV__);

export const api = createApiClient(apiUrl);

export function portraitUrl(footballerId: number): string | null {
  return apiUrl ? `${apiUrl}${API_PREFIX}/portraits/${footballerId}.webp?v=${version.dataVersion}` : null;
}
