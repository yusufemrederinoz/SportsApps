export interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  data: Record<string, string>;
}

export type PushSender = (messages: readonly PushMessage[]) => Promise<string[]>;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const UNREGISTERED = 'DeviceNotRegistered';

interface PushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export function createExpoSender(fetcher: typeof fetch = fetch): PushSender {
  return async (messages) => {
    const rejected: string[] = [];
    for (let start = 0; start < messages.length; start += BATCH_SIZE) {
      const batch = messages.slice(start, start + BATCH_SIZE);
      const response = await fetcher(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        throw new Error(`push service answered ${response.status}`);
      }
      const { data } = (await response.json()) as { data: PushTicket[] };
      data.forEach((ticket, index) => {
        const message = batch[index];
        if (message && ticket.status === 'error' && ticket.details?.error === UNREGISTERED) {
          rejected.push(message.to);
        }
      });
    }
    return rejected;
  };
}
