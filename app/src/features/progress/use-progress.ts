import type { DailyReward, PlayerProgress } from '@sportapps/protocol';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api';
import { useAuth } from '@/auth/auth-provider';

export function useProgress({ claimDaily = false }: { claimDaily?: boolean } = {}) {
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [reward, setReward] = useState<DailyReward | null>(null);

  const load = useCallback(() => {
    if (!token) {
      return undefined;
    }
    let cancelled = false;
    const request = claimDaily
      ? api.claimDaily(token).then((response) => {
          if (!cancelled && response.reward) {
            setReward(response.reward);
          }
          return response.progress;
        })
      : api.progress(token).then((response) => response.progress);
    request
      .then((current) => {
        if (!cancelled) {
          setProgress(current);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token, claimDaily]);

  useFocusEffect(load);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        load();
      }
    });
    return () => subscription.remove();
  }, [load]);

  return { token, progress, reward, dismissReward: () => setReward(null) };
}
