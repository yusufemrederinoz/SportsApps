import type { PushPlatform } from '@sportapps/protocol';

import { transaction, type Database } from '../database';
import messages from './messages.json' with { type: 'json' };
import { createPlanner, type NotificationKind, type PlannedNotification } from './planner';
import type { PushMessage, PushSender } from './sender';

export interface NotificationOptions {
  now?: () => number;
  timeZone: string;
  send: PushSender;
  onError?: (error: unknown) => void;
}

export type NotificationLanguage = keyof typeof messages;

export const NOTIFICATION_LANGUAGES = Object.keys(messages) as NotificationLanguage[];
export const NOTIFICATION_CHANNEL = 'default';

const DEFAULT_LANGUAGE: NotificationLanguage = 'en';
const CHECK_INTERVAL = 10 * 60 * 1000;

export function languageOf(value: string): NotificationLanguage {
  return value in messages ? (value as NotificationLanguage) : DEFAULT_LANGUAGE;
}

function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''));
}

export function notificationText(kind: NotificationKind, language: string, values: Record<string, number>) {
  const text = messages[languageOf(language)][kind];
  return { title: fill(text.title, values), body: fill(text.body, values) };
}

export function createNotifications(database: Database, options: NotificationOptions) {
  const now = options.now ?? Date.now;
  const plan = createPlanner(database, options.timeZone);
  const upsertToken = database.prepare(
    `INSERT INTO push_tokens (token, user_id, platform, language, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (token) DO UPDATE SET
       user_id = excluded.user_id,
       platform = excluded.platform,
       language = excluded.language,
       updated_at = excluded.updated_at`,
  );
  const deleteToken = database.prepare('DELETE FROM push_tokens WHERE token = ?');
  const deleteOwnToken = database.prepare('DELETE FROM push_tokens WHERE token = ? AND user_id = ?');
  const tokensOf = database.prepare('SELECT token, language FROM push_tokens WHERE user_id = ?');
  const logSent = database.prepare(
    'INSERT OR IGNORE INTO notification_log (user_id, kind, day, sent_at) VALUES (?, ?, ?, ?)',
  );

  const messagesFor = (planned: PlannedNotification): PushMessage[] =>
    (tokensOf.all(planned.userId) as { token: string; language: string }[]).map((row) => ({
      to: row.token,
      ...notificationText(planned.kind, row.language, planned.values),
      sound: 'default',
      channelId: NOTIFICATION_CHANNEL,
      data: { kind: planned.kind },
    }));

  const run = async (): Promise<number> => {
    const planned = plan(now());
    if (planned.length === 0) {
      return 0;
    }
    transaction(database, () => planned.forEach((entry) => logSent.run(entry.userId, entry.kind, entry.day, now())));
    const rejected = await options.send(planned.flatMap(messagesFor));
    rejected.forEach((token) => deleteToken.run(token));
    return planned.length;
  };

  return {
    register(userId: string, token: string, platform: PushPlatform, language: string): void {
      upsertToken.run(token, userId, platform, language, now());
    },

    unregister(userId: string, token: string): void {
      deleteOwnToken.run(token, userId);
    },

    run,

    start(): () => void {
      const timer = setInterval(() => void run().catch((error: unknown) => options.onError?.(error)), CHECK_INTERVAL);
      return () => clearInterval(timer);
    },
  };
}

export type Notifications = ReturnType<typeof createNotifications>;
