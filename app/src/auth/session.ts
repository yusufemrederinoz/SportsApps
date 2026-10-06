import type { Account, AuthResponse } from '@sportapps/protocol';

import { errorCodeOf, type ApiClient } from '@/api/client';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'offline' }
  | { status: 'signed-in'; token: string; account: Account };

const MEMBER_TOKEN_KEY = 'member-token';
const GUEST_TOKEN_KEY = 'guest-token';
const ONBOARDING_KEY = 'onboarding-done';
const SET = '1';

function signedIn(response: AuthResponse): AuthState {
  return { status: 'signed-in', token: response.token, account: response.account };
}

async function resume(api: ApiClient, store: KeyValueStore, key: string): Promise<AuthState | null> {
  const token = await store.get(key);
  if (!token) {
    return null;
  }
  try {
    const { account } = await api.me(token);
    return signedIn({ token, account });
  } catch (error) {
    if (errorCodeOf(error) !== 'unauthorized') {
      return { status: 'offline' };
    }
    await store.remove(key);
    return null;
  }
}

export async function restoreSession(api: ApiClient, store: KeyValueStore): Promise<AuthState> {
  return (await resume(api, store, MEMBER_TOKEN_KEY)) ?? { status: 'signed-out' };
}

export async function enterAsGuest(api: ApiClient, store: KeyValueStore): Promise<AuthState> {
  const resumed = await resume(api, store, GUEST_TOKEN_KEY);
  if (resumed) {
    return resumed;
  }
  try {
    const response = await api.guest();
    await store.set(GUEST_TOKEN_KEY, response.token);
    return signedIn(response);
  } catch {
    return { status: 'offline' };
  }
}

export async function adoptMember(store: KeyValueStore, response: AuthResponse): Promise<AuthState> {
  await store.set(MEMBER_TOKEN_KEY, response.token);
  return signedIn(response);
}

export async function leaveSession(api: ApiClient, store: KeyValueStore): Promise<AuthState> {
  const token = await store.get(MEMBER_TOKEN_KEY);
  if (token) {
    await api.logout(token).catch(() => undefined);
    await store.remove(MEMBER_TOKEN_KEY);
  }
  return { status: 'signed-out' };
}

export async function hasCompletedOnboarding(store: KeyValueStore): Promise<boolean> {
  return (await store.get(ONBOARDING_KEY)) === SET;
}

export async function completeOnboarding(store: KeyValueStore): Promise<void> {
  await store.set(ONBOARDING_KEY, SET);
}
