import type { PushPlatform } from '@sportapps/protocol';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { ApiClient } from '@/api/client';
import { Brand } from '@/constants/brand';

const CHANNEL = 'default';

export const NOTIFICATION_ROUTES = {
  puzzle: '/puzzle',
  weekly: '/leaderboard',
} as const;

export type NotificationRoute = (typeof NOTIFICATION_ROUTES)[keyof typeof NOTIFICATION_ROUTES];

export function routeOf(data: unknown): NotificationRoute | null {
  const kind = (data as { kind?: unknown } | null)?.kind;
  return typeof kind === 'string' && kind in NOTIFICATION_ROUTES
    ? NOTIFICATION_ROUTES[kind as keyof typeof NOTIFICATION_ROUTES]
    : null;
}

function supported(): boolean {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

async function deviceToken(ask: boolean): Promise<string | null> {
  if (!supported()) {
    return null;
  }
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: Brand.name,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted || !current.canAskAgain || !ask ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

export async function registerForPush(api: ApiClient, sessionToken: string, language: string): Promise<string | null> {
  const token = await deviceToken(true);
  if (token) {
    await api.registerPushToken(sessionToken, { token, platform: Platform.OS as PushPlatform, language });
  }
  return token;
}

export async function unregisterFromPush(api: ApiClient, sessionToken: string): Promise<void> {
  const token = await deviceToken(false);
  if (token) {
    await api.removePushToken(sessionToken, token);
  }
}

export async function watchNotificationTaps(open: (route: NotificationRoute) => void): Promise<() => void> {
  if (!supported()) {
    return () => undefined;
  }
  const Notifications = await import('expo-notifications');
  const handle = (response: { notification: { request: { content: { data?: unknown } } } } | null) => {
    const route = response ? routeOf(response.notification.request.content.data) : null;
    if (route) {
      open(route);
    }
  };
  handle(await Notifications.getLastNotificationResponseAsync());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
