import type { AuthResponse, LoginRequest, RegisterRequest } from '@sportapps/protocol';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { api } from '@/api';

import { adoptSession, endSession, restoreSession, type AuthState } from './session';
import { secureTokenStorage } from './storage';

interface AuthContextValue {
  state: AuthState;
  retry: () => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  login: (input: LoginRequest) => Promise<void>;
  rename: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const token = state.status === 'signed-in' ? state.token : null;

  useEffect(() => {
    let cancelled = false;
    void restoreSession(api, secureTokenStorage).then((restored) => {
      if (!cancelled) {
        setState(restored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const adopt = async (response: AuthResponse) => setState(await adoptSession(secureTokenStorage, response));

  const value: AuthContextValue = {
    state,
    retry: async () => {
      setState({ status: 'loading' });
      setState(await restoreSession(api, secureTokenStorage));
    },
    register: async (input) => adopt(await api.register(input, token)),
    login: async (input) => adopt(await api.login(input, token)),
    rename: async (username) => {
      if (state.status === 'signed-in') {
        const { account } = await api.updateAccount(username, state.token);
        setState({ ...state, account });
      }
    },
    logout: async () => {
      if (token) {
        setState({ status: 'loading' });
        setState(await endSession(api, secureTokenStorage, token));
      }
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
