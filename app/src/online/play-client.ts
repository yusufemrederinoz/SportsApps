import {
  API_PREFIX,
  PLAY_PATH,
  PLAY_PROTOCOL_VERSION,
  type ClientMessage,
  type PlayErrorCode,
  type ServerMessage,
} from '@sportapps/protocol';

export type ConnectionStatus = 'ready' | 'reconnecting' | 'closed';

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export interface PlayClientOptions {
  url: string;
  token: string;
  dataVersion: string;
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  createSocket?: (url: string) => SocketLike;
}

const FATAL_ERRORS: readonly PlayErrorCode[] = ['unauthorized', 'outdated-client', 'replaced'];
const RETRY_DELAYS = [400, 800, 1600, 3200, 5000, 5000, 5000];
const FIRST_CONNECTION_RETRY_DELAYS = [400, 1200];
const CONNECT_TIMEOUT = 8000;
const PING_INTERVAL = 20000;

export function playUrl(apiUrl: string): string {
  return `${apiUrl.replace(/^http/, 'ws')}${API_PREFIX}${PLAY_PATH}`;
}

function parse(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    return JSON.parse(data) as ServerMessage;
  } catch {
    return null;
  }
}

export function createPlayClient(options: PlayClientOptions) {
  const createSocket = options.createSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
  let socket: SocketLike | null = null;
  let ready = false;
  let connected = false;
  let stopped = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let connecting: ReturnType<typeof setTimeout> | null = null;

  const stopConnecting = () => {
    if (connecting) {
      clearTimeout(connecting);
      connecting = null;
    }
  };

  const stopPing = () => {
    if (ping) {
      clearInterval(ping);
      ping = null;
    }
  };

  const transmit = (message: ClientMessage) => {
    socket?.send(JSON.stringify(message));
  };

  const handleClose = (current: SocketLike) => {
    if (socket !== current) {
      return;
    }
    socket = null;
    ready = false;
    stopPing();
    stopConnecting();
    const delay = (connected ? RETRY_DELAYS : FIRST_CONNECTION_RETRY_DELAYS)[attempt];
    if (stopped || delay === undefined) {
      stopped = true;
      options.onStatus('closed');
      return;
    }
    attempt += 1;
    options.onStatus('reconnecting');
    retry = setTimeout(open, delay);
  };

  const open = () => {
    const current = createSocket(options.url);
    socket = current;
    stopConnecting();
    connecting = setTimeout(() => {
      handleClose(current);
      current.close();
    }, CONNECT_TIMEOUT);

    current.onopen = () => {
      current.send(
        JSON.stringify({
          type: 'hello',
          token: options.token,
          protocol: PLAY_PROTOCOL_VERSION,
          dataVersion: options.dataVersion,
        } satisfies ClientMessage),
      );
    };

    current.onmessage = (event) => {
      const message = parse(event.data);
      if (!message || socket !== current) {
        return;
      }
      if (message.type === 'ready') {
        ready = true;
        connected = true;
        attempt = 0;
        stopConnecting();
        stopPing();
        ping = setInterval(() => transmit({ type: 'ping' }), PING_INTERVAL);
        options.onStatus('ready');
      }
      if (message.type === 'error' && FATAL_ERRORS.includes(message.code)) {
        stopped = true;
      }
      if (message.type !== 'pong') {
        options.onMessage(message);
      }
    };

    current.onerror = () => undefined;

    current.onclose = () => handleClose(current);
  };

  open();

  return {
    send(message: ClientMessage): boolean {
      if (!ready || !socket) {
        return false;
      }
      transmit(message);
      return true;
    },

    close(): void {
      stopped = true;
      stopPing();
      stopConnecting();
      if (retry) {
        clearTimeout(retry);
        retry = null;
      }
      const current = socket;
      socket = null;
      ready = false;
      current?.close();
    },
  };
}

export type PlayClient = ReturnType<typeof createPlayClient>;
