import type { Account, AuthResponse } from '@sportapps/protocol';

import { errorCodeOf, type ApiClient } from '@/api/client';

export interface TokenStorage {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'signed-in'; token: string; account: Account };

export async function adoptSession(storage: TokenStorage, response: AuthResponse): Promise<AuthState> {
  await storage.write(response.token);
  return { status: 'signed-in', token: response.token, account: response.account };
}

export async function restoreSession(api: ApiClient, storage: TokenStorage): Promise<AuthState> {
  try {
    const stored = await storage.read();
    if (stored) {
      try {
        const { account } = await api.me(stored);
        return { status: 'signed-in', token: stored, account };
      } catch (error) {
        if (errorCodeOf(error) !== 'unauthorized') {
          throw error;
        }
        await storage.clear();
      }
    }
    return await adoptSession(storage, await api.guest());
  } catch {
    return { status: 'offline' };
  }
}

export async function endSession(api: ApiClient, storage: TokenStorage, token: string): Promise<AuthState> {
  await api.logout(token).catch(() => undefined);
  await storage.clear();
  return restoreSession(api, storage);
}
