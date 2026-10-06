import type { LoginRequest, RegisterRequest } from '@sportapps/protocol';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { api } from '@/api';

import {
  adoptMember,
  completeOnboarding,
  enterAsGuest,
  hasCompletedOnboarding,
  leaveSession,
  restoreSession,
  type AuthState,
} from './session';
import { secureStore } from './storage';

interface AuthContextValue {
  state: AuthState;
  onboarded: boolean | null;
  finishOnboarding: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  login: (input: LoginRequest) => Promise<void>;
  leave: () => Promise<void>;
  retry: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([restoreSession(api, secureStore), hasCompletedOnboarding(secureStore)]).then(([restored, completed]) => {
      if (!cancelled) {
        setState(restored);
        setOnboarded(completed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    state,
    onboarded,
    finishOnboarding: async () => {
      await completeOnboarding(secureStore);
      setOnboarded(true);
    },
    continueAsGuest: async () => setState(await enterAsGuest(api, secureStore)),
    register: async (input) => setState(await adoptMember(secureStore, await api.register(input))),
    login: async (input) => setState(await adoptMember(secureStore, await api.login(input))),
    leave: async () => setState(await leaveSession(api, secureStore)),
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
