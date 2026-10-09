import { secureStore } from '@/auth/storage';

const KEY = 'notifications-muted';
const MUTED = '1';

export async function notificationsMuted(): Promise<boolean> {
  return (await secureStore.get(KEY).catch(() => null)) === MUTED;
}

export async function setNotificationsMuted(muted: boolean): Promise<void> {
  await (muted ? secureStore.set(KEY, MUTED) : secureStore.remove(KEY));
}
