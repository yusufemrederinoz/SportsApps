import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const BUILD = join(ROOT, 'data', 'build', 'promo');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';
const PORT = 8793;
const DEBUG_PORT = 9337;
const FPS = 30;
const ENCODER_THREADS = 2;
const SIZES = { video: [1080, 1920], poster: [1080, 1350] };
const MOUNTS = {
  '/promo/': HERE,
  '/fonts/': join(ROOT, 'deploy', 'site', 'fonts'),
  '/artwork/': join(ROOT, 'data', 'branding', 'artwork'),
  '/portraits/': join(ROOT, 'data', 'build', 'portraits'),
  '/frames/': join(ROOT, 'data', 'build', 'animation', 'frames'),
};
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
};

const [mode = 'video', language = 'tr', only] = process.argv.slice(2);
const [width, height] = SIZES[mode];
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);

function fileFor(path) {
  for (const [prefix, directory] of Object.entries(MOUNTS)) {
    if (!path.startsWith(prefix)) continue;
    const file = resolve(directory, path.slice(prefix.length));
    return file.startsWith(directory + sep) && existsSync(file) && statSync(file).isFile() ? file : null;
  }
  return null;
}

const server = createServer((request, response) => {
  const file = fileFor(decodeURIComponent(new URL(request.url, `http://127.0.0.1:${PORT}`).pathname));
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let sent = 0;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolveCall, reject) => {
      sent += 1;
      pending.set(sent, { resolve: resolveCall, reject });
      socket.send(JSON.stringify({ id: sent, method, params }));
    });
  return new Promise((ready, reject) => {
    socket.addEventListener('open', () => ready(send));
    socket.addEventListener('error', () => reject(new Error('browser connection failed')));
  });
}

async function pageSocket() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      await sleep(200);
    }
  }
  throw new Error('browser did not start');
}

async function evaluate(send, expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function screenshot(send, file) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
}

function run(command, parameters) {
  return new Promise((done, reject) => {
    const child = spawn(command, parameters, { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? done() : reject(new Error(`${command} exited with ${code}`))));
  });
}

function encode(frames, output) {
  return run(FFMPEG, [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(FPS),
    '-i',
    join(frames, '%04d.png'),
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest',
    '-vf',
    'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '14',
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    '-threads',
    String(ENCODER_THREADS),
    output,
  ]);
}

mkdirSync(BUILD, { recursive: true });
await new Promise((listening) => server.listen(PORT, '127.0.0.1', listening));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${join(BUILD, 'browser')}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  const send = await connect(await pageSocket());
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/promo/promo.html?lang=${language}&mode=${mode}` });
  let duration;
  for (let attempt = 0; attempt < 300 && duration === undefined; attempt += 1) {
    await sleep(200);
    duration = await evaluate(send, 'window.duration');
  }
  if (duration === undefined) throw new Error('page never became ready');

  if (mode === 'poster') {
    const output = join(BUILD, `challengegoal-${language}-post.png`);
    await screenshot(send, output);
    console.log(output);
  } else if (only !== undefined) {
    const output = join(BUILD, `preview-${language}-${only}.png`);
    await evaluate(send, `window.seek(${Number(only)})`);
    await screenshot(send, output);
    console.log(output);
  } else {
    const frames = join(BUILD, `frames-${language}`);
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    const total = Math.round(duration * FPS);
    const started = Date.now();
    for (let index = 0; index < total; index += 1) {
      await evaluate(send, `window.seek(${index / FPS})`);
      await screenshot(send, join(frames, `${String(index).padStart(4, '0')}.png`));
      if (index % 60 === 59) console.log(`${index + 1}/${total} frames, ${Math.round((Date.now() - started) / 1000)} s`);
    }
    const output = join(BUILD, `challengegoal-${language}.mp4`);
    await encode(frames, output);
    console.log(output);
  }
} finally {
  chrome.kill();
  server.close();
}
