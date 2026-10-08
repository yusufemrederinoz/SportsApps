import type { IdentityProvider, LoginRequest, RegisterRequest } from '@sportapps/protocol';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { api } from '@/api';

import {
  adoptMember,
  chooseUsername,
  completeOnboarding,
  deleteAccount,
  enterAsGuest,
  entryOf,
  hasCompletedOnboarding,
  leaveSession,
  restoreSession,
  type AuthState,
  type Entry,
} from './session';
import { secureStore } from './storage';

interface AuthContextValue {
  state: AuthState;
  entry: Entry;
  finishOnboarding: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  login: (input: LoginRequest) => Promise<void>;
  signInWith: (provider: IdentityProvider, identityToken: string) => Promise<void>;
  chooseUsername: (username: string) => Promise<void>;
  leave: () => Promise<void>;
  remove: () => Promise<void>;
  retry: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apply = (restored: AuthState, completed: boolean) => {
      if (!cancelled) {
        setState(restored);
        setOnboarded(completed);
      }
    };
    Promise.all([restoreSession(api, secureStore), hasCompletedOnboarding(secureStore)]).then(
      ([restored, completed]) => apply(restored, completed),
      (error: unknown) => {
        console.warn('Could not restore the saved session', error);
        apply({ status: 'signed-out' }, false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    state,
    entry: entryOf(state, onboarded),
    finishOnboarding: async () => {
      setOnboarded(true);
      await completeOnboarding(secureStore).catch((error: unknown) => {
        console.warn('Could not remember the finished onboarding', error);
      });
    },
    continueAsGuest: async () => setState(await enterAsGuest(api, secureStore)),
    register: async (input) => setState(await adoptMember(secureStore, await api.register(input))),
    login: async (input) => setState(await adoptMember(secureStore, await api.login(input))),
    signInWith: async (provider, identityToken) =>
      setState(await adoptMember(secureStore, await api.signInWithIdentity(provider, identityToken))),
    chooseUsername: async (username) => setState(await chooseUsername(api, state, username)),
    leave: async () => setState(await leaveSession(api, secureStore)),
    remove: async () => setState(await deleteAccount(api, secureStore, state)),
    retry: async () => {
      const restored = await restoreSession(api, secureStore);
      setState(restored.status === 'signed-out' ? await enterAsGuest(api, secureStore) : restored);
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
