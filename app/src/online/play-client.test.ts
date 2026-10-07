import type { ServerMessage } from '@sportapps/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlayClient, playUrl, type ConnectionStatus, type SocketLike } from './play-client';

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: unknown[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }

  receive(message: ServerMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

function setup() {
  const sockets: FakeSocket[] = [];
  const messages: ServerMessage[] = [];
  const statuses: ConnectionStatus[] = [];
  const client = createPlayClient({
    url: 'ws://host/v1/play',
    token: 'token-1',
    dataVersion: 'v1',
    onMessage: (message) => messages.push(message),
    onStatus: (status) => statuses.push(status),
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
  });
  return { client, sockets, messages, statuses };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('playUrl', () => {
  it('turns the API address into the websocket address', () => {
    expect(playUrl('http://192.168.1.5:4000')).toBe('ws://192.168.1.5:4000/v1/play');
    expect(playUrl('https://api.example.com')).toBe('wss://api.example.com/v1/play');
  });
});

describe('createPlayClient', () => {
  it('greets the server with the session token and holds messages until it is ready', () => {
    const { client, sockets, statuses } = setup();
    const [socket] = sockets;
    expect(client.send({ type: 'cancel' })).toBe(false);

    socket?.onopen?.();
    expect(socket?.sent).toEqual([{ type: 'hello', token: 'token-1', protocol: 1, dataVersion: 'v1' }]);

    socket?.receive({ type: 'ready' });
    expect(statuses).toEqual(['ready']);
    expect(client.send({ type: 'queue', market: 'tr', difficulty: 2 })).toBe(true);
    expect(socket?.sent.at(-1)).toEqual({ type: 'queue', market: 'tr', difficulty: 2 });
  });

  it('passes server messages on and keeps the connection alive with pings', () => {
    const { sockets, messages } = setup();
    const [socket] = sockets;
    socket?.onopen?.();
    socket?.receive({ type: 'ready' });
    socket?.receive({ type: 'queued' });
    vi.advanceTimersByTime(20000);
    socket?.receive({ type: 'pong' });
    expect(messages).toEqual([{ type: 'ready' }, { type: 'queued' }]);
    expect(socket?.sent.at(-1)).toEqual({ type: 'ping' });
  });

  it('reconnects with a growing delay and greets again', () => {
    const { sockets, statuses } = setup();
    sockets[0]?.onopen?.();
    sockets[0]?.receive({ type: 'ready' });
    sockets[0]?.onclose?.();
    expect(statuses).toEqual(['ready', 'reconnecting']);

    vi.advanceTimersByTime(399);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    sockets[1]?.onclose?.();
    vi.advanceTimersByTime(800);
    expect(sockets).toHaveLength(3);
    sockets[2]?.onopen?.();
    sockets[2]?.receive({ type: 'ready' });
    expect(statuses.at(-1)).toBe('ready');
    expect(sockets[2]?.sent[0]).toMatchObject({ type: 'hello' });
  });

  it('gives up after repeated failures', () => {
    const { sockets, statuses } = setup();
    for (let attempt = 0; attempt < 12 && statuses.at(-1) !== 'closed'; attempt += 1) {
      sockets.at(-1)?.onclose?.();
      vi.advanceTimersByTime(5000);
    }
    expect(statuses.at(-1)).toBe('closed');
    const opened = sockets.length;
    vi.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(opened);
  });

  it('does not reconnect after the server turned the player away', () => {
    const { sockets, statuses, messages } = setup();
    sockets[0]?.onopen?.();
    sockets[0]?.receive({ type: 'error', code: 'replaced' });
    sockets[0]?.onclose?.();
    vi.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
    expect(statuses).toEqual(['closed']);
    expect(messages).toEqual([{ type: 'error', code: 'replaced' }]);
  });

  it('stays closed once the screen closes it', () => {
    const { client, sockets, statuses } = setup();
    sockets[0]?.onopen?.();
    sockets[0]?.receive({ type: 'ready' });
    client.close();
    vi.advanceTimersByTime(60000);
    expect(sockets[0]?.closed).toBe(true);
    expect(sockets).toHaveLength(1);
    expect(statuses).toEqual(['ready']);
    expect(client.send({ type: 'cancel' })).toBe(false);
  });
});
