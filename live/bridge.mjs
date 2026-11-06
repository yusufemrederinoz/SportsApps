import { readFile, stat } from 'node:fs/promises';
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
const LISTED_GIFTS = 80;
const FILES = {
  '/': join(HERE, 'tribune.html'),
  '/texts.json': join(HERE, 'texts.json'),
  '/gifts.json': join(HERE, 'gifts.json'),
  '/questions.json': join(HERE, 'questions.json'),
  '/blocked.json': join(HERE, 'blocked.json'),
  '/ball.png': join(ROOT, 'data', 'branding', 'artwork', 'ball.png'),
};
const FONTS = join(ROOT, 'deploy', 'site', 'fonts');
const THREE = join(HERE, 'node_modules', 'three', 'build');
const AUDIO = join(HERE, 'audio');
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
};

const username = process.argv[2];

const safe = (name) => name.replace(/[^\w.-]/g, '');

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function fileFor(path) {
  if (FILES[path]) return FILES[path];
  if (path.startsWith('/fonts/')) return join(FONTS, safe(path.slice('/fonts/'.length)));
  if (path.startsWith('/three/')) return join(THREE, safe(path.slice('/three/'.length)));
  if (path.startsWith('/audio/')) {
    const key = safe(path.slice('/audio/'.length));
    for (const extension of AUDIO_EXTENSIONS) {
      const file = join(AUDIO, `${key}${extension}`);
      if (await exists(file)) return file;
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const file = await fileFor(new URL(request.url, `http://${HOST}`).pathname);
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

async function listGifts(connection) {
  try {
    const info = await connection.fetchAvailableGifts();
    const gifts = info?.gifts ?? info?.data?.gifts ?? [];
    const rows = gifts.slice(0, LISTED_GIFTS).map((gift) => `${gift.name} (${gift.diamond_count ?? gift.diamondCount ?? '?'})`);
    console.log(`gifts in this room (${gifts.length}): ${rows.join(', ')}`);
  } catch (error) {
    console.log(`could not list gifts: ${error.message}`);
  }
}

function connect() {
  const connection = new TikTokLiveConnection(username, {});
  connection.on(WebcastEvent.CHAT, (data) => broadcast({ kind: 'chat', ...person(data.user), text: data.content ?? '' }));
  connection.on(WebcastEvent.LIKE, (data) => broadcast({ kind: 'like', ...person(data.user), count: data.count || 1 }));
  connection.on(WebcastEvent.GIFT, (data) => {
    if (data.gift?.type === 1 && !data.repeatEnd) return;
    const count = data.repeatCount || 1;
    const gift = data.gift?.name ?? '';
    console.log(`gift: ${gift} (id ${data.giftId}) x${count}`);
    broadcast({
      kind: 'gift',
      ...person(data.user),
      gift,
      giftId: String(data.giftId ?? ''),
      count,
      diamonds: (data.gift?.diamondCount || 1) * count,
    });
  });
  connection.on(WebcastEvent.STREAM_END, () => console.log('stream ended'));
  connection.on(ControlEvent.DISCONNECTED, () => scheduleRetry('disconnected'));
  connection
    .connect()
    .then((state) => {
      console.log(`connected to @${username}, room ${state.roomId}`);
      return listGifts(connection);
    })
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
