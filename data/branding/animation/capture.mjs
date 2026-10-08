import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HANDOFF = join(HERE, 'handoff');
const BUILD = join(HERE, '..', '..', 'build', 'animation');
const OUT = join(BUILD, 'frames');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8791;
const SPIN_PERIOD = (2 * Math.PI) / 0.0012;

const JOBS = {
  gol: { concept: 'Gol', layout: 'Sadece top', frames: 78, step: 2600 / 78, size: 900, aspect: 1.5 },
  kupa: { concept: 'Kupa', layout: 'Sadece top', frames: 96, step: 3200 / 96, size: 1400, aspect: 1.2 },
  alev: { concept: 'Alev', layout: 'Yatay', frames: 79, step: SPIN_PERIOD / 79, size: 640, ground: 0 },
  ball: { concept: 'Alev', layout: 'Sadece top', size: 2800, ground: 0, still: 'named' },
  'ball-plain': { concept: 'Alev', layout: 'Sadece top', size: 2800, ground: 0, still: 'plain' },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(JOBS);
const finished = new Map();

const body = (request) =>
  new Promise((resolve) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
  });

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);
  const path = decodeURIComponent(url.pathname);
  if (request.method === 'POST') {
    const data = await body(request);
    const [, kind, job, index] = path.split('/');
    if (kind === 'log') console.log(data.toString());
    if (kind === 'frame') writeFileSync(join(OUT, job, `${String(index).padStart(4, '0')}.png`), data);
    if (kind === 'done') finished.get(job)?.();
    response.writeHead(204).end();
    return;
  }
  if (path === '/__driver.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(readFileSync(join(HERE, 'driver.js')));
    return;
  }
  if (path === '/Futbol Topu.html') {
    const page = readFileSync(join(HANDOFF, 'Futbol Topu.html'), 'utf8').replace('<head>', '<head><script src="/__driver.js"></script>');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(page);
    return;
  }
  if (path === '/three-d-stage.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }).end(readFileSync(join(HANDOFF, 'three-d-stage.js')));
    return;
  }
  response.writeHead(404).end();
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

for (const name of names) {
  const job = JOBS[name];
  rmSync(join(OUT, name), { recursive: true, force: true });
  mkdirSync(join(OUT, name), { recursive: true });
  const query = new URLSearchParams({ concept: job.concept, color: 'Klasik', layout: job.layout, name: '1', embed: '', job: name });
  for (const key of ['frames', 'step', 'size', 'ground', 'still', 'aspect']) {
    if (job[key] !== undefined) query.set(key, String(job[key]));
  }
  const done = new Promise((resolve) => finished.set(name, resolve));
  const started = Date.now();
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--no-first-run',
      '--hide-scrollbars',
      '--window-size=1500,1700',
      `--user-data-dir=${join(BUILD, 'browser')}`,
      `http://127.0.0.1:${PORT}/Futbol%20Topu.html?${query}`,
    ],
    { stdio: 'ignore' },
  );
  const timeout = setTimeout(() => {
    console.log(`${name}: timed out`);
    finished.get(name)();
  }, 15 * 60 * 1000);
  await done;
  clearTimeout(timeout);
  chrome.kill();
  console.log(`${name}: finished in ${Math.round((Date.now() - started) / 1000)} s`);
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
server.close();
