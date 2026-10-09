import type { Database } from '../database';
import type { PushMessage, PushSender } from './sender';
import { NOTIFICATION_CHANNEL, NOTIFICATION_LANGUAGES, languageOf, type NotificationLanguage } from './service';

export const BROADCAST_TITLE_MAX_LENGTH = 80;
export const BROADCAST_BODY_MAX_LENGTH = 240;
export const BROADCAST_INTERVAL = 60 * 1000;

const KIND = 'announcement';
const RECENT_LIMIT = 10;
const COLUMNS = `SELECT id, created_at AS createdAt, status, devices, skipped, rejected, messages, fallback FROM broadcasts`;

export interface BroadcastText {
  title: string;
  body: string;
}

export type BroadcastTexts = Partial<Record<NotificationLanguage, BroadcastText>>;

export interface BroadcastRequest {
  messages: BroadcastTexts;
  fallback?: NotificationLanguage;
}

export type BroadcastStatus = 'sending' | 'sent' | 'failed';

export interface BroadcastRecord {
  id: number;
  createdAt: number;
  status: BroadcastStatus;
  devices: number;
  skipped: number;
  rejected: number;
  messages: BroadcastTexts;
  fallback: NotificationLanguage | null;
}

export interface AudienceEntry {
  language: NotificationLanguage;
  devices: number;
}

export interface BroadcastOptions {
  now?: () => number;
  send: PushSender;
  onError?: (error: unknown) => void;
}

export type BroadcastRefusal = 'no-audience' | 'too-soon';

export class BroadcastError extends Error {
  readonly code: BroadcastRefusal;

  constructor(code: BroadcastRefusal) {
    super(code);
    this.name = 'BroadcastError';
    this.code = code;
  }
}

interface StoredBroadcast extends Omit<BroadcastRecord, 'messages'> {
  messages: string;
}

export function cleanBroadcast(request: BroadcastRequest): BroadcastRequest | null {
  const messages: BroadcastTexts = {};
  for (const language of NOTIFICATION_LANGUAGES) {
    const text = request.messages[language];
    if (!text) {
      continue;
    }
    const title = text.title.trim();
    const body = text.body.trim();
    if (!title || !body) {
      return null;
    }
    messages[language] = { title, body };
  }
  if (Object.keys(messages).length === 0 || (request.fallback && !messages[request.fallback])) {
    return null;
  }
  return request.fallback ? { messages, fallback: request.fallback } : { messages };
}

export function createBroadcasts(database: Database, options: BroadcastOptions) {
  const now = options.now ?? Date.now;
  database.exec("UPDATE broadcasts SET status = 'failed' WHERE status = 'sending'");
  const tokens = database.prepare('SELECT token, language FROM push_tokens');
  const languages = database.prepare('SELECT language, COUNT(*) AS devices FROM push_tokens GROUP BY language');
  const deleteToken = database.prepare('DELETE FROM push_tokens WHERE token = ?');
  const lastStarted = database.prepare('SELECT MAX(created_at) AS value FROM broadcasts');
  const insert = database.prepare(
    "INSERT INTO broadcasts (messages, fallback, devices, skipped, status, created_at) VALUES (?, ?, ?, ?, 'sending', ?)",
  );
  const finish = database.prepare('UPDATE broadcasts SET status = ?, rejected = ? WHERE id = ?');
  const one = database.prepare(`${COLUMNS} WHERE id = ?`);
  const latest = database.prepare(`${COLUMNS} ORDER BY id DESC LIMIT ?`);

  const record = (stored: StoredBroadcast): BroadcastRecord => ({
    ...stored,
    messages: JSON.parse(stored.messages) as BroadcastTexts,
  });

  return {
    audience(): AudienceEntry[] {
      const counts = new Map<NotificationLanguage, number>();
      for (const row of languages.all() as unknown as { language: string; devices: number }[]) {
        const language = languageOf(row.language);
        counts.set(language, (counts.get(language) ?? 0) + row.devices);
      }
      return NOTIFICATION_LANGUAGES.map((language) => ({ language, devices: counts.get(language) ?? 0 }));
    },

    recent(): BroadcastRecord[] {
      return (latest.all(RECENT_LIMIT) as unknown as StoredBroadcast[]).map(record);
    },

    async send(request: BroadcastRequest): Promise<BroadcastRecord> {
      const outgoing: PushMessage[] = [];
      let skipped = 0;
      for (const row of tokens.all() as unknown as { token: string; language: string }[]) {
        const text = request.messages[languageOf(row.language)] ?? (request.fallback && request.messages[request.fallback]);
        if (!text) {
          skipped += 1;
          continue;
        }
        outgoing.push({
          to: row.token,
          title: text.title,
          body: text.body,
          sound: 'default',
          channelId: NOTIFICATION_CHANNEL,
          data: { kind: KIND },
        });
      }
      if (outgoing.length === 0) {
        throw new BroadcastError('no-audience');
      }
      const time = now();
      const previous = (lastStarted.get() as { value: number | null }).value;
      if (previous !== null && time - previous < BROADCAST_INTERVAL) {
        throw new BroadcastError('too-soon');
      }
      const id = Number(
        insert.run(JSON.stringify(request.messages), request.fallback ?? null, outgoing.length, skipped, time).lastInsertRowid,
      );
      try {
        const rejected = await options.send(outgoing);
        rejected.forEach((token) => deleteToken.run(token));
        finish.run('sent', rejected.length, id);
      } catch (error) {
        finish.run('failed', 0, id);
        options.onError?.(error);
      }
      return record(one.get(id) as unknown as StoredBroadcast);
    },
  };
}

export type Broadcasts = ReturnType<typeof createBroadcasts>;
