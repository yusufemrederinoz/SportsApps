import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ControlEvent, TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { WebSocketServer } from 'ws';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HOST = '127.0.0.1';
const PORT = 8765;
const RETRY_SECONDS = 15;
const FILES = {
  '/': join(HERE, 'tribune.html'),
  '/texts.json': join(HERE, 'texts.json'),
  '/questions.json': join(HERE, 'questions.json'),
  '/blocked.json': join(HERE, 'blocked.json'),
  '/ball.png': join(ROOT, 'data', 'branding', 'artwork', 'ball.png'),
};
const FONTS = join(ROOT, 'deploy', 'site', 'fonts');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

const username = process.argv[2];

function fileFor(path) {
  if (FILES[path]) return FILES[path];
  if (path.startsWith('/fonts/')) return join(FONTS, path.slice('/fonts/'.length).replace(/[^\w.-]/g, ''));
  return null;
}

const server = createServer(async (request, response) => {
  const file = fileFor(new URL(request.url, `http://${HOST}`).pathname);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});

const sockets = new WebSocketServer({ server, path: '/events' });

function broadcast(event) {
  const text = JSON.stringify(event);
  for (const client of sockets.clients) {
    if (client.readyState === client.OPEN) client.send(text);
  }
}

function person(user) {
  return { id: user?.displayId || user?.id || '', name: user?.nickname || user?.displayId || '' };
}

let retry = null;

function scheduleRetry(reason) {
  if (retry) return;
  console.log(`${reason}; retrying in ${RETRY_SECONDS} s`);
  retry = setTimeout(() => {
    retry = null;
    connect();
  }, RETRY_SECONDS * 1000);
}

function connect() {
  const connection = new TikTokLiveConnection(username, {});
  connection.on(WebcastEvent.CHAT, (data) => broadcast({ kind: 'chat', ...person(data.user), text: data.content ?? '' }));
  connection.on(WebcastEvent.LIKE, (data) => broadcast({ kind: 'like', ...person(data.user), count: data.count || 1 }));
  connection.on(WebcastEvent.GIFT, (data) => {
    if (data.gift?.type === 1 && !data.repeatEnd) return;
    const count = data.repeatCount || 1;
    broadcast({ kind: 'gift', ...person(data.user), gift: data.gift?.name ?? '', count, diamonds: (data.gift?.diamondCount || 1) * count });
  });
  connection.on(WebcastEvent.STREAM_END, () => console.log('stream ended'));
  connection.on(ControlEvent.DISCONNECTED, () => scheduleRetry('disconnected'));
  connection
    .connect()
    .then((state) => console.log(`connected to @${username}, room ${state.roomId}`))
    .catch((error) => scheduleRetry(`could not connect: ${error.message}`));
}

server.listen(PORT, HOST, () => {
  console.log(`scene: http://${HOST}:${PORT}/`);
  console.log(`demo:  http://${HOST}:${PORT}/?demo=1`);
  if (username) {
    connect();
  } else {
    console.log('no TikTok username given; only the scene is served (node bridge.mjs <username>)');
  }
});
