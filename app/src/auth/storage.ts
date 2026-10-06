import * as SecureStore from 'expo-secure-store';

import type { TokenStorage } from './session';

const TOKEN_KEY = 'session-token';

export const secureTokenStorage: TokenStorage = {
  read: () => SecureStore.getItemAsync(TOKEN_KEY),
  write: (token) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
