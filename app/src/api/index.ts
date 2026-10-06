import Constants from 'expo-constants';

import { createApiClient } from './client';
import { resolveApiUrl } from './url';

export const api = createApiClient(
  resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, Constants.expoConfig?.hostUri, __DEV__),
);
