import type { DailyReward, PlayerProgress } from '@sportapps/protocol';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from '@/api';
import { useAuth } from '@/auth/auth-provider';

let checkedDay: string | null = null;

function today(): string {
  return new Date().toDateString();
}

export function useProgress({ claimDaily = false }: { claimDaily?: boolean } = {}) {
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [reward, setReward] = useState<DailyReward | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      let cancelled = false;
      const claim = claimDaily && checkedDay !== today();
      const load = claim
        ? api.claimDaily(token).then((response) => {
            checkedDay = today();
            if (!cancelled && response.reward) {
              setReward(response.reward);
            }
            return response.progress;
          })
        : api.progress(token).then((response) => response.progress);
      load
        .then((current) => {
          if (!cancelled) {
            setProgress(current);
          }
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [token, claimDaily]),
  );

  return { token, progress, reward, dismissReward: () => setReward(null) };
}
