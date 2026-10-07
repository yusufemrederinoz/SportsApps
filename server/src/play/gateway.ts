import websocket from '@fastify/websocket';
import { API_PREFIX, PLAY_PATH, PLAY_PROTOCOL_VERSION, type PlayErrorCode, type ServerMessage } from '@sportapps/protocol';
import type { FastifyInstance } from 'fastify';
import type { RawData, WebSocket } from 'ws';

import type { AccountService } from '../accounts/service';
import type { Connection, Lobby, Player } from './lobby';
import { parseClientMessage } from './messages';

const MAX_PAYLOAD_BYTES = 4096;
const HELLO_TIMEOUT_MILLISECONDS = 10000;
const MESSAGE_WINDOW_MILLISECONDS = 10000;
const MESSAGES_PER_WINDOW = 80;
const CLOSE_NORMAL = 1000;
const CLOSE_POLICY = 1008;

export interface GatewayOptions {
  accounts: AccountService;
  lobby: Lobby;
  dataVersion: string;
  now?: () => number;
}

function attach(socket: WebSocket, options: GatewayOptions): void {
  const { accounts, lobby, dataVersion } = options;
  const now = options.now ?? Date.now;
  let player: Player | null = null;
  let windowStartedAt = now();
  let messagesInWindow = 0;

  const connection: Connection = {
    send(message: ServerMessage) {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    close() {
      socket.close(CLOSE_NORMAL);
    },
  };

  const reject = (code: PlayErrorCode) => {
    connection.send({ type: 'error', code });
    socket.close(CLOSE_POLICY);
  };

  const helloTimer = setTimeout(() => {
    if (!player) {
      socket.close(CLOSE_POLICY);
    }
  }, HELLO_TIMEOUT_MILLISECONDS);

  const withinBudget = (): boolean => {
    const time = now();
    if (time - windowStartedAt >= MESSAGE_WINDOW_MILLISECONDS) {
      windowStartedAt = time;
      messagesInWindow = 0;
    }
    messagesInWindow += 1;
    return messagesInWindow <= MESSAGES_PER_WINDOW;
  };

  socket.on('message', (data: RawData, isBinary: boolean) => {
    if (!withinBudget()) {
      socket.close(CLOSE_POLICY);
      return;
    }
    const message = isBinary ? null : parseClientMessage(data.toString());
    if (!message) {
      connection.send({ type: 'error', code: 'invalid-message' });
      return;
    }
    if (player) {
      lobby.handle(player.id, message);
      return;
    }
    if (message.type !== 'hello') {
      connection.send({ type: 'error', code: 'not-ready' });
      return;
    }
    if (message.protocol !== PLAY_PROTOCOL_VERSION || message.dataVersion !== dataVersion) {
      reject('outdated-client');
      return;
    }
    const session = accounts.authenticate(message.token);
    if (!session) {
      reject('unauthorized');
      return;
    }
    clearTimeout(helloTimer);
    player = { id: session.user.id, username: session.user.username };
    lobby.connect(player, connection);
  });

  socket.on('close', () => {
    clearTimeout(helloTimer);
    if (player) {
      lobby.disconnect(player.id, connection);
    }
  });

  socket.on('error', () => {
    socket.terminate();
  });
}

export function registerPlayGateway(app: FastifyInstance, options: GatewayOptions): void {
  void app.register(websocket, { options: { maxPayload: MAX_PAYLOAD_BYTES } });
  void app.register(async (instance) => {
    instance.get(`${API_PREFIX}${PLAY_PATH}`, { websocket: true }, (socket) => attach(socket, options));
  });
}
