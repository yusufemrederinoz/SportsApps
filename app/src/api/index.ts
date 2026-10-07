import Constants from 'expo-constants';

import { createApiClient } from './client';
import { resolveApiUrl } from './url';

export const apiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, Constants.expoConfig?.hostUri, __DEV__);

export const api = createApiClient(apiUrl);
