import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import { useAuth } from '@/auth/auth-provider';

import { notificationsMuted } from './preference';
import { registerForPush, watchNotificationTaps } from './push';

export function usePush(ready: boolean) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { state } = useAuth();
  const sessionToken = state.status === 'signed-in' ? state.token : null;
  const language = i18n.language;

  useEffect(() => {
    if (!ready || !sessionToken) {
      return undefined;
    }
    let cancelled = false;
    void notificationsMuted()
      .then((muted) => (muted || cancelled ? null : registerForPush(api, sessionToken, language)))
      .catch((error: unknown) => {
        console.warn('Could not register for notifications', error);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, sessionToken, language]);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    void watchNotificationTaps((route) => router.push(route)).then((remove) => {
      if (cancelled) {
        remove();
      } else {
        stop = remove;
      }
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [router]);
}
