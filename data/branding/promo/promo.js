const SCENES = {
  hook: [0, 3],
  play: [3, 11.1],
  games: [11.1, 15.4],
  features: [15.4, 19.2],
  finale: [19.2, 9999],
};
const DURATION = 23.5;
const WON = 8.5;
const RESULT = 8.95;
const TYPED_HOLD = 0.25;
const SHIELD = 'M8 6 H92 V58 C92 86 72 100 50 108 C28 100 8 86 8 58 Z';
const CLUBS = [
  {
    code: 'GS',
    stroke: '#A90432',
    fields: '<rect width="100" height="112" fill="#FDB912"/><rect x="50" width="50" height="112" fill="#A90432"/>',
  },
  { code: 'RMA', stroke: '#FEBE10', fields: '<rect width="100" height="112" fill="#FFFFFF"/>' },
  { code: 'FCB', stroke: '#0066B2', fields: '<rect width="100" height="112" fill="#DC052D"/>' },
];
const MOVES = [
  { row: 0, column: 0, side: 'x', portrait: 487459, name: 'Arda Turan', position: 'FW', at: 4.5, typed: [3.95, 4.4] },
  { row: 0, column: 1, side: 'o', portrait: 295891, name: 'Cláudio Taffarel', position: 'GK', at: 5.15 },
  { row: 1, column: 1, side: 'x', portrait: 429039, name: 'Roberto Carlos', position: 'DF', at: 6.3, typed: [5.65, 6.2] },
  { row: 1, column: 2, side: 'o', portrait: 1835, name: 'Zinédine Zidane', position: 'MF', at: 6.95 },
  { row: 2, column: 2, side: 'x', portrait: 1918, name: 'Franck Ribéry', position: 'FW', at: 8.05, typed: [7.45, 7.95] },
];
const PERK_TONES = ['var(--gold)', 'var(--blue)', 'var(--volt)', 'var(--text)'];
const BEAMS = [
  { left: 160, period: 7, from: 12, to: 24 },
  { left: 720, period: 9, from: -24, to: -12 },
];
const MOTES = 30;

const parameters = new URLSearchParams(location.search);
const language = parameters.get('lang') ?? 'tr';
const mode = parameters.get('mode') ?? 'video';
const stage = document.querySelector('.stage');
const loaded = new Map();

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function crest({ code, stroke, fields }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112"><defs><clipPath id="shield-${code}"><path d="${SHIELD}"/></clipPath></defs><g clip-path="url(#shield-${code})">${fields}</g><path d="${SHIELD}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/><rect x="2" y="38" width="96" height="24" rx="5" fill="#FFFFFF" stroke="#05070A" stroke-opacity="0.35" stroke-width="1.5"/><text x="50" y="55.76" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-size="18" font-weight="700" fill="#05070A">${code}</text></svg>`;
}

function backdrop() {
  const random = seeded(11);
  const beams = BEAMS.map(
    (beam) => `<i class="beam" style="left: ${beam.left}px; --period: ${beam.period}s; --from: ${beam.from}deg; --to: ${beam.to}deg"></i>`,
  );
  const motes = Array.from({ length: MOTES }, () => {
    const period = 7 + random() * 9;
    return `<i class="mote" style="left: ${Math.round(random() * 1080)}px; --size: ${(3 + random() * 6).toFixed(1)}px; --period: ${period.toFixed(2)}s; --offset: -${(random() * period).toFixed(2)}s; --alpha: ${(0.25 + random() * 0.5).toFixed(2)}"></i>`;
  });
  return beams.concat(motes).join('');
}

function cell(texts, row, column) {
  const move = MOVES.find((candidate) => candidate.row === row && candidate.column === column);
  if (!move) return '<div class="cell"></div>';
  const from = move.typed ? move.typed[0] - 0.05 : move.at - 0.25;
  return `<div class="cell ${move.side} ${row === column ? 'win' : 'rest'}" style="--t: ${move.at}">
    <i class="target" style="--from: ${from}"></i><i class="ring"></i>
    <div class="card"><b>${texts.grid.positions[move.position]}</b><img src="/portraits/${move.portrait}.webp" alt="" /><span>${move.name}</span></div>
  </div>`;
}

function board(texts, start) {
  const columns = texts.grid.columns.map(
    (name, index) => `<div class="header in pop" style="--t: ${(start + 0.3 + index * 0.08).toFixed(2)}">${name}</div>`,
  );
  const rows = texts.grid.rows.map((name, row) => {
    const header = `<div class="header club in pop" style="--t: ${(start + 0.5 + row * 0.08).toFixed(2)}">${crest(CLUBS[row])}<span>${name}</span></div>`;
    return header + [0, 1, 2].map((column) => cell(texts, row, column)).join('');
  });
  return `<div class="board"><div class="grid" style="--won: ${WON}"><div></div>${columns.join('')}${rows.join('')}<div class="line"><i></i></div></div></div>`;
}

function scene(name, content) {
  const [start, end] = SCENES[name];
  return `<section class="scene ${name}" style="--start: ${start}; --end: ${end}">${content}</section>`;
}

function hook(texts) {
  const [first, second, third] = texts.hook;
  return scene(
    'hook',
    `<canvas class="ball" width="1400" height="1400" data-job="alev-large" data-count="79" data-at="0" data-rate="30" data-loop="1"></canvas>
    <div class="copy">
      <p class="eyebrow in rise" style="--t: 0.4">${texts.eyebrow}</p>
      <h1 class="display" data-fit><span class="in slam" style="--t: 0.55">${first}</span><span class="in slam" style="--t: 0.85">${second}</span><em class="in slam" style="--t: 1.2">${third}</em></h1>
    </div>`,
  );
}

function play(texts) {
  const [start] = SCENES.play;
  return scene(
    'play',
    `<div class="display title in slam" style="--t: ${start + 0.1}">${texts.grid.title}</div>
    <p class="rule-text in rise" style="--t: ${start + 0.25}">${texts.grid.rule}</p>
    ${board(texts, start)}
    <div class="search empty in rise" style="--t: ${start + 0.6}" data-placeholder="${texts.grid.search}">${texts.grid.search}</div>
    <div class="result" style="--t: ${RESULT}">
      <h2 class="display in slam" data-fit>${texts.grid.win}</h2>
      <canvas width="1350" height="900" data-job="gol" data-count="72" data-at="${RESULT + 0.05}" data-rate="37.5"></canvas>
      <p class="in rise">${texts.grid.line}</p>
    </div>`,
  );
}

function games(texts) {
  const [start] = SCENES.games;
  const tiles = texts.games.items.map(
    ([name, line], index) =>
      `<div class="tile in pop" style="--t: ${(start + 0.65 + index * 0.14).toFixed(2)}"><small>${String(index + 1).padStart(2, '0')}</small><strong data-fit>${name}</strong><p>${line}</p></div>`,
  );
  return scene(
    'games',
    `<div class="heading"><div class="display big in slam" style="--t: ${start + 0.2}">${texts.games.count}</div><div class="display small in rise" style="--t: ${start + 0.4}" data-fit>${texts.games.title}</div></div>
    <div class="tiles">${tiles.join('')}</div>`,
  );
}

function features(texts) {
  const [start] = SCENES.features;
  const perks = texts.features.items.map(
    ([name, line], index) =>
      `<div class="perk in ${index % 2 ? 'from-right' : 'from-left'}" style="--t: ${(start + 0.45 + index * 0.3).toFixed(2)}; --tone: ${PERK_TONES[index]}"><strong data-fit>${name}</strong><p>${line}</p></div>`,
  );
  return scene(
    'features',
    `<div class="heading"><div class="display wide in slam" style="--t: ${start + 0.15}" data-fit>${texts.features.title}</div></div>
    <div class="perks">${perks.join('')}</div>
    <div class="numbers"><div class="display figure in slam" style="--t: ${start + 1.9}">${texts.features.number} <small>${texts.features.numberLabel}</small></div><p class="in rise" style="--t: ${start + 2.15}" data-fit>${texts.features.leagues}</p></div>`,
  );
}

function finale(texts) {
  const [start] = SCENES.finale;
  const [first, second] = texts.end.stores;
  return scene(
    'finale',
    `<canvas class="ball in pop" style="--t: ${start + 0.1}" width="1400" height="1400" data-job="alev-large" data-count="79" data-at="0" data-rate="30" data-loop="1"></canvas>
    <div class="display wordmark in slam" style="--t: ${start + 0.5}">CHALLENGE<span>GOAL</span></div>
    <i class="underline" style="--t: ${start + 0.8}"></i>
    <p class="eyebrow soon in rise" style="--t: ${start + 1.1}">${texts.end.soon}</p>
    <div class="stores"><div class="in from-left" style="--t: ${start + 1.25}">${first}</div><div class="in from-right" style="--t: ${start + 1.35}">${second}</div></div>
    <p class="site in rise" style="--t: ${start + 1.65}">${texts.end.site}</p>
    <p class="notice in rise" style="--t: ${start + 1.9}">${texts.end.notice}</p>`,
  );
}

function video(texts) {
  const wipes = Object.values(SCENES)
    .slice(1)
    .map(([start]) => `<i class="wipe" style="--t: ${start}"></i>`);
  return backdrop() + hook(texts) + play(texts) + games(texts) + features(texts) + finale(texts) + wipes.join('');
}

function poster(texts) {
  const [first, second, third] = texts.hook;
  return `${backdrop()}
    <div class="brand display"><img src="/artwork/ball.png" alt="" />CHALLENGE<span>GOAL</span></div>
    <h1 class="display" data-fit><span>${first}</span><span>${second}</span><em>${third}</em></h1>
    <div class="pitch">${texts.grid.rule}<strong>${texts.games.count}</strong><small>${texts.games.title}</small><strong>${texts.features.number}</strong><small>${texts.features.numberLabel}</small></div>
    ${board(texts, 0)}
    <p class="eyebrow soon">${texts.poster.soon}</p>
    <p class="site">${texts.end.site}</p>
    <p class="notice">${texts.end.notice}</p>`;
}

function fit(element) {
  const lines = element.children.length ? [...element.children] : [element];
  let size = parseFloat(getComputedStyle(element).fontSize);
  while (size > 20 && lines.some((line) => line.scrollWidth > line.clientWidth)) {
    size -= 2;
    element.style.fontSize = `${size}px`;
  }
}

function frame(job, index) {
  const url = `/frames/${job}/${String(index).padStart(4, '0')}.png`;
  if (!loaded.has(url)) {
    const image = new Image();
    image.src = url;
    loaded.set(
      url,
      image.decode().then(() => image),
    );
  }
  return loaded.get(url);
}

async function draw(canvas, seconds) {
  const { job, count, at, rate, loop } = canvas.dataset;
  const step = Math.floor(Math.max(0, seconds - Number(at)) * Number(rate) + 1e-6);
  const index = loop ? step % Number(count) : Math.min(Number(count) - 1, step);
  if (canvas.shown === index) return;
  const image = await frame(job, index);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvas.shown = index;
}

function typedName(seconds) {
  for (const move of MOVES) {
    if (!move.typed) continue;
    const [from, until] = move.typed;
    if (seconds >= from && seconds < move.at + TYPED_HOLD) {
      const share = Math.min(1, (seconds - from) / (until - from));
      return move.name.slice(0, Math.ceil(share * move.name.length));
    }
  }
  return null;
}

function type(search, seconds) {
  const name = typedName(seconds);
  search.textContent = name ?? search.dataset.placeholder;
  search.classList.toggle('empty', name === null);
  search.classList.toggle('live', name !== null);
}

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const texts = (await (await fetch('/promo/texts.json')).json())[language];
document.documentElement.lang = language;
document.body.classList.toggle('poster', mode === 'poster');
stage.innerHTML = mode === 'poster' ? poster(texts) : video(texts);

await document.fonts.ready;
await Promise.all([...document.images].map((image) => image.decode()));
document.querySelectorAll('[data-fit]').forEach(fit);

const animations = document.getAnimations();
animations.forEach((animation) => animation.pause());
const sequences = [...document.querySelectorAll('canvas[data-job]')];
const search = document.querySelector('.search');

window.seek = async (seconds) => {
  animations.forEach((animation) => {
    animation.currentTime = seconds * 1000;
  });
  await Promise.all(sequences.map((canvas) => draw(canvas, seconds)));
  if (search) type(search, seconds);
  await nextPaint();
};

await window.seek(0);
window.duration = mode === 'poster' ? 0 : DURATION;
