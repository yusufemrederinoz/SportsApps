const CUTS = {
  short: [
    ['hook', 4.2],
    ['play', 8.1],
    ['games', 4.3],
    ['features', 3.8],
    ['finale', 5.1],
  ],
  long: [
    ['hook', 4.2],
    ['play', 8.1],
    ['duel', 12.7],
    ['auction', 11.9],
    ['chain', 10.6],
    ['games', 4.5],
    ['finale', 7],
  ],
};
const NEVER = 9999;
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
const FOOTBALLERS = {
  turan: { id: 487459, name: 'Arda Turan', short: 'Turan', position: 'FW' },
  taffarel: { id: 295891, name: 'Cláudio Taffarel', short: 'Taffarel', position: 'GK' },
  carlos: { id: 429039, name: 'Roberto Carlos', short: 'Carlos', position: 'DF' },
  zidane: { id: 1835, name: 'Zinédine Zidane', short: 'Zidane', position: 'MF' },
  ribery: { id: 1918, name: 'Franck Ribéry', short: 'Ribéry', position: 'FW' },
  etoo: { id: 1255625, name: 'Samuel Eto’o', short: 'Eto’o', position: 'FW' },
  drogba: { id: 48892, name: 'Didier Drogba', short: 'Drogba', position: 'FW' },
  icardi: { id: 136986, name: 'Mauro Icardi', short: 'Icardi', position: 'FW' },
  osimhen: { id: 25253293, name: 'Victor Osimhen', short: 'Osimhen', position: 'FW' },
  alex: { id: 507815, name: 'Alex', short: 'Alex', position: 'MF' },
  sneijder: { id: 124086, name: 'Wesley Sneijder', short: 'Sneijder', position: 'MF' },
  muslera: { id: 203749, name: 'Fernando Muslera', short: 'Muslera', position: 'GK' },
  gomez: { id: 45766, name: 'Mario Gómez', short: 'Gómez', position: 'FW' },
  dzeko: { id: 153786, name: 'Edin Džeko', short: 'Džeko', position: 'FW' },
  guler: { id: 108159340, name: 'Arda Güler', short: 'Güler', position: 'MF' },
  mbappe: { id: 21621995, name: 'Kylian Mbappé', short: 'Mbappé', position: 'FW' },
  messi: { id: 615, name: 'Lionel Messi', short: 'Messi', position: 'FW' },
};
const GRID = {
  moves: [
    { row: 0, column: 0, side: 'x', footballer: 'turan', at: 1.5, typed: [0.95, 1.4] },
    { row: 0, column: 1, side: 'o', footballer: 'taffarel', at: 2.15 },
    { row: 1, column: 1, side: 'x', footballer: 'carlos', at: 3.3, typed: [2.65, 3.2] },
    { row: 1, column: 2, side: 'o', footballer: 'zidane', at: 3.95 },
    { row: 2, column: 2, side: 'x', footballer: 'ribery', at: 5.05, typed: [4.45, 4.95] },
  ],
  won: 5.5,
  result: 5.95,
};
const DUEL = {
  hand: ['etoo', 'drogba', 'icardi', 'osimhen', 'alex', 'sneijder', 'muslera'],
  pick: [0.5, 3.9],
  rounds: [
    { mine: 'etoo', theirs: 'gomez', values: ['368', '333'], window: [3.9, 8.3] },
    { mine: 'osimhen', theirs: 'dzeko', values: ['1998', '1986'], window: [8.3, NEVER] },
  ],
};
const AUCTION = {
  club: 'REAL MADRID CF',
  bids: [
    { at: 2, amount: 3, side: 'you' },
    { at: 3.4, amount: 4, side: 'rival' },
    { at: 5, amount: 5, side: 'you' },
  ],
  challenged: 5.7,
  prove: 6.5,
  names: [
    { text: 'Ronaldo', typed: [6.75, 7.1], at: 7.2 },
    { text: 'Kaká', typed: [7.6, 7.9], at: 8 },
    { text: 'Marcelo', typed: [8.35, 8.7], at: 8.8 },
    { text: 'Casemiro', typed: [9.1, 9.5], at: 9.6 },
    { text: 'Rodrygo', typed: [9.95, 10.3], at: 10.4 },
  ],
  proved: 10.75,
};
const CHAIN = {
  links: [
    { footballer: 'guler', side: 'o', at: 0.7 },
    { footballer: 'mbappe', side: 'x', club: 'REAL MADRID CF', at: 2.9, typed: [1.6, 2.5] },
    { footballer: 'messi', side: 'o', club: 'PARIS SAINT-GERMAIN', at: 4.9 },
    { footballer: 'turan', side: 'x', club: 'FC BARCELONA', at: 7, typed: [5.7, 6.6] },
  ],
  closing: 8.6,
};
const PERK_TONES = ['var(--gold)', 'var(--blue)', 'var(--volt)', 'var(--text)'];
const BEAMS = [
  { left: 160, period: 7, from: 12, to: 24 },
  { left: 720, period: 9, from: -24, to: -12 },
];
const MOTES = 30;
const TURN_SECONDS = 20;

const parameters = new URLSearchParams(location.search);
const language = parameters.get('lang') ?? 'tr';
const mode = parameters.get('mode') ?? 'video';
const cut = CUTS[parameters.get('cut') ?? 'short'];
const stores = parameters.get('stores') ?? 'both';
const stage = document.querySelector('.stage');
const loaded = new Map();
const scripts = [];
const cues = [];

const at = (start, offset) => Number((start + offset).toFixed(2));
const fill = (template, values) => template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? ''));

function cue(time, sound, gain = 1, rate = 1) {
  cues.push({ time: Number(time.toFixed(3)), sound, gain, rate });
}

function scripted(kind, payload) {
  scripts.push({ kind, payload });
  return `data-script="${scripts.length - 1}"`;
}

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

function card(texts, key, side, classes = '', time = null) {
  const footballer = FOOTBALLERS[key];
  const style = time === null ? '' : ` style="--t: ${time}"`;
  return `<div class="card ${side} ${classes}"${style}><b>${texts.grid.positions[footballer.position]}</b><img src="/portraits/${footballer.id}.webp" alt="" /><span>${footballer.name}</span></div>`;
}

function scoreboard(texts, start, turns, scores) {
  const plate = (side, label) => {
    const steps = turns.map(([time, active]) => [time, null, active === side ? 'active' : 'idle']);
    const score = `<strong ${scripted('steps', scores[side])}>0</strong>`;
    const name = `<span>${label}</span>`;
    return `<div class="plate ${side}" ${scripted('steps', steps)}>${side === 'you' ? name + score : score + name}</div>`;
  };
  return `<div class="scoreboard in rise" style="--t: ${start}">${plate('you', texts.sides.you)}<div class="display clock" ${scripted('clock', turns)}>${TURN_SECONDS}</div>${plate('rival', texts.sides.rival)}</div>`;
}

function typing(entries, placeholder, classes, time) {
  entries.forEach(({ text, from, until }) => {
    for (let index = 0; index < text.length; index += 1) {
      cue(from + ((until - from) * index) / text.length, 'tick', 0.22, 1.25);
    }
  });
  return `<div class="search empty ${classes}" style="--t: ${time}" ${scripted('typing', { entries, placeholder })}>${placeholder}</div>`;
}

function gameHeader(texts, start, classes = '') {
  cue(at(start, 0.1), 'impact', 0.5);
  return `<div class="display game-title in slam ${classes}" style="--t: ${at(start, 0.1)}" data-fit>${texts.title}</div>
    <p class="game-rule in rise" style="--t: ${at(start, 0.25)}">${texts.rule}</p>`;
}

function cell(texts, start, row, column) {
  const move = GRID.moves.find((candidate) => candidate.row === row && candidate.column === column);
  if (!move) return '<div class="cell"></div>';
  const from = at(start, move.typed ? move.typed[0] - 0.05 : move.at - 0.25);
  cue(at(start, move.at), move.side === 'x' ? 'correct' : 'impact', move.side === 'x' ? 0.7 : 0.35);
  return `<div class="cell ${move.side} ${row === column ? 'win' : 'rest'}" style="--t: ${at(start, move.at)}">
    <i class="target" style="--from: ${from}"></i><i class="ring"></i>
    ${card(texts, move.footballer, move.side, 'flip shiny')}
  </div>`;
}

function board(texts, start) {
  const columns = texts.grid.columns.map(
    (name, index) => `<div class="header in pop" style="--t: ${at(start, 0.3 + index * 0.08)}">${name}</div>`,
  );
  const rows = texts.grid.rows.map((name, row) => {
    const header = `<div class="header club in pop" style="--t: ${at(start, 0.5 + row * 0.08)}">${crest(CLUBS[row])}<span>${name}</span></div>`;
    return header + [0, 1, 2].map((column) => cell(texts, start, row, column)).join('');
  });
  return `<div class="board"><div class="grid" style="--won: ${at(start, GRID.won)}"><div></div>${columns.join('')}${rows.join('')}<div class="line"><i></i></div></div></div>`;
}

function hook(texts, start) {
  const [first, second, third] = texts.hook;
  cue(at(start, 0.05), 'whoosh', 0.8);
  cue(at(start, 0.2), 'whistle', 0.45);
  cue(at(start, 0.55), 'impact', 0.5);
  cue(at(start, 0.85), 'impact', 0.5);
  cue(at(start, 1.2), 'impact', 0.7);
  cue(at(start, 1.8), 'impact', 1);
  return `<canvas class="ball" width="1400" height="1400" data-job="alev-large" data-count="79" data-at="0" data-rate="30" data-loop="1"></canvas>
    <div class="copy">
      <p class="eyebrow in rise" style="--t: ${at(start, 0.4)}">${texts.eyebrow}</p>
      <h1 class="display" data-fit><span class="in slam" style="--t: ${at(start, 0.55)}">${first}</span><span class="in slam" style="--t: ${at(start, 0.85)}">${second}</span><em class="in slam" style="--t: ${at(start, 1.2)}">${third}</em></h1>
    </div>
    <div class="promise in slam" style="--t: ${at(start, 1.8)}"><span class="display no-ads">${texts.noAds.title}</span><p class="in rise" style="--t: ${at(start, 2.2)}">${texts.noAds.line}</p></div>`;
}

function play(texts, start) {
  const entries = GRID.moves
    .filter((move) => move.typed)
    .map((move) => ({
      text: FOOTBALLERS[move.footballer].name,
      from: at(start, move.typed[0]),
      until: at(start, move.typed[1]),
      release: at(start, move.at + TYPED_HOLD),
    }));
  const result = at(start, GRID.result);
  cue(at(start, 0.1), 'impact', 0.5);
  cue(at(start, GRID.won), 'whoosh', 0.7);
  cue(at(result, 0.12), 'win', 1);
  return `<div class="display title in slam" style="--t: ${at(start, 0.1)}">${texts.grid.title}</div>
    <p class="rule-text in rise" style="--t: ${at(start, 0.25)}">${texts.grid.rule}</p>
    ${board(texts, start)}
    ${typing(entries, texts.grid.search, 'in rise', at(start, 0.6))}
    <div class="result" style="--t: ${result}">
      <h2 class="display in slam" data-fit>${texts.grid.win}</h2>
      <canvas width="1350" height="900" data-job="gol" data-count="72" data-at="${at(result, 0.05)}" data-rate="37.5"></canvas>
      <p class="in rise">${texts.grid.line}</p>
    </div>`;
}

function duelRound(texts, start, round, index) {
  const [from, until] = round.window;
  const open = at(start, from);
  const [mine, theirs] = round.values;
  cue(open, 'whoosh', 0.45);
  cue(at(open, 0.6), 'tick', 0.7);
  cue(at(open, 0.9), 'tick', 0.5, 0.8);
  cue(at(open, 1.7), 'whoosh', 0.5);
  cue(at(open, 2.25), 'impact', 0.5);
  cue(at(open, 2.75), 'correct', 1);
  return `<div class="layer state" style="--start: ${open}; --end: ${until === NEVER ? NEVER : at(start, until)}">
    <div class="panel question"><strong data-fit>${texts.duel.questions[index]}</strong></div>
    <div class="versus">
      <div class="mine">${card(texts, round.mine, 'x', 'flip shiny', at(open, 0.6))}</div>
      <div class="display vs">VS</div>
      <div class="theirs">
        <div class="display back" style="--t: ${at(open, 0.9)}; --turned: ${at(open, 1.7)}">?</div>
        <div class="lost" style="--t: ${at(open, 2.5)}">${card(texts, round.theirs, 'o', 'flip shiny', at(open, 1.85))}</div>
      </div>
    </div>
    <div class="display value mine in pop" style="--t: ${at(open, 2.25)}">${mine}<em>+1</em><small>${texts.duel.metrics[index]}</small></div>
    <div class="display value theirs in pop" style="--t: ${at(open, 2.25)}">${theirs}<small>${texts.duel.metrics[index]}</small></div>
    <div class="display centered verdict in slam" style="--t: ${at(open, 2.75)}">${texts.duel.roundWon}</div>
  </div>`;
}

function duel(texts, start) {
  const [pickFrom, pickUntil] = DUEL.pick;
  const picked = DUEL.hand.map((_, index) => at(start, pickFrom + 0.5 + index * 0.28));
  const slots = DUEL.hand.map(
    (key, index) => `<div class="slot">+${card(texts, key, 'x', 'in pop', picked[index])}</div>`,
  );
  const counts = [[at(start, pickFrom), fill(texts.duel.count, { picked: 0 })]].concat(
    picked.map((time, index) => [time, fill(texts.duel.count, { picked: index + 1 })]),
  );
  const table = at(start, pickUntil);
  picked.forEach((time, index) => cue(time, 'tick', 0.6, 0.9 + index * 0.05));
  cue(at(table, -0.5), 'impact', 0.4);
  const rounds = DUEL.rounds.map((round) => at(start, round.window[0]));
  const spent = (key) => {
    const index = DUEL.rounds.findIndex((round) => round.mine === key);
    return index < 0 ? card(texts, key, 'x') : card(texts, key, 'x', 'spent', at(rounds[index], 0.6));
  };
  return `${gameHeader(texts.duel, start, 'short')}
    <div class="layer state" style="--start: ${at(start, pickFrom)}; --end: ${table}">
      <div class="panel concept"><small>${texts.duel.conceptLabel}</small><strong data-fit>${texts.duel.concept}</strong></div>
      <p class="hint">${texts.duel.pickHint}</p>
      <div class="slots">${slots.join('')}</div>
      <p class="centered count" ${scripted('steps', counts)}>${counts[0][1]}</p>
      <div class="button primary ready press" style="--t: ${at(table, -0.5)}">${texts.duel.ready}</div>
    </div>
    <div class="layer state" style="--start: ${table}; --end: ${NEVER}">
      <div class="chip" ${scripted('steps', rounds.map((time, index) => [time, fill(texts.duel.round, { round: index + 1 })]))}>${fill(texts.duel.round, { round: 1 })}</div>
      ${scoreboard(texts, table, rounds.map((time) => [time, 'you']), {
        you: rounds.map((time, index) => [at(time, 2.85), String(index + 1)]),
        rival: [],
      })}
      <div class="hand">${DUEL.hand.map(spent).join('')}</div>
    </div>
    ${DUEL.rounds.map((round, index) => duelRound(texts, start, round, index)).join('')}`;
}

function auction(texts, start) {
  const open = at(start, 0.5);
  const bids = AUCTION.bids.map((bid) => ({ ...bid, at: at(start, bid.at) }));
  const challenged = at(start, AUCTION.challenged);
  const prove = at(start, AUCTION.prove);
  const names = AUCTION.names.map((name) => ({
    text: name.text,
    from: at(start, name.typed[0]),
    until: at(start, name.typed[1]),
    release: at(start, name.at + 0.1),
    at: at(start, name.at),
  }));
  const last = bids[bids.length - 1].amount;
  bids.forEach((bid) => cue(bid.at, bid.side === 'you' ? 'tick' : 'impact', bid.side === 'you' ? 0.8 : 0.5));
  cue(challenged, 'impact', 1);
  names.forEach((name, index) => cue(name.at, 'correct', 0.6, 1 + index * 0.06));
  cue(at(start, AUCTION.proved), 'win', 1);
  const turns = [[open, 'you']].concat(
    bids.map((bid) => [bid.at, bid.side === 'you' ? 'rival' : 'you']),
    [[prove, 'you']],
  );
  const labels = [[open, texts.auction.noBid]].concat(
    bids.map((bid) => [bid.at, bid.side === 'you' ? texts.auction.yourBid : texts.auction.theirBid]),
  );
  const amounts = [[open, '0', 'none']].concat(bids.map((bid) => [bid.at, String(bid.amount), bid.side]));
  const notes = [[open, texts.auction.openBid, 'prompt']].concat(
    bids.map((bid) =>
      bid.side === 'you' ? [bid.at, texts.auction.thinking, 'wait'] : [bid.at, texts.auction.raiseOrChallenge, 'prompt'],
    ),
    [[prove, fill(texts.auction.prove, { bid: last }), 'prompt']],
    names.map((name, index) => [name.at, fill(texts.auction.progress, { named: index + 1, bid: last }), 'progress']),
  );
  const mine = bids.filter((bid) => bid.side === 'you');
  const offers = mine.map((bid, index) => [index === 0 ? open : bids[bids.indexOf(bid) - 1].at, bid.amount]);
  return `${gameHeader(texts.auction, start)}
    ${scoreboard(texts, open, turns, { you: [[at(start, AUCTION.proved + 0.1), '1']], rival: [] })}
    <div class="panel criteria in rise" style="--t: ${at(open, 0.1)}"><small>${texts.auction.criteriaLabel}</small><strong data-fit>${AUCTION.club} × ${texts.auction.country}</strong></div>
    <div class="layer in rise" style="--t: ${at(open, 0.2)}">
      <p class="centered bid-label" ${scripted('steps', labels)}>${texts.auction.noBid}</p>
      <div class="display centered bid" ${scripted('steps', amounts)}>0</div>
      <p class="centered bid-note" ${scripted('steps', notes)}>${texts.auction.openBid}</p>
    </div>
    <div class="layer state" style="--start: ${at(open, 0.2)}; --end: ${at(challenged, -0.1)}">
      <div class="display stepper"><i>−</i><span ${scripted('steps', offers.map(([time, amount]) => [time, String(amount)]))}>${offers[0][1]}</span><i>+</i></div>
      <div class="button primary raise press-twice" style="--t: ${at(mine[0].at, -0.25)}; --again: ${at(mine[1].at, -0.25)}" ${scripted('steps', offers.map(([time, amount]) => [time, fill(texts.auction.raise, { amount })]))}>${fill(texts.auction.raise, { amount: offers[0][1] })}</div>
      <div class="button secondary challenge">${texts.auction.challenge}</div>
    </div>
    <div class="centered shout state" style="--start: ${challenged}; --end: ${at(prove, -0.05)}"><small>${texts.sides.rival}</small><strong class="display in slam" style="--t: ${challenged}">${texts.auction.challenged}</strong></div>
    <div class="layer state" style="--start: ${prove}; --end: ${NEVER}">
      <div class="names">${names.map((name) => `<span class="in pop" style="--t: ${name.at}">${name.text}</span>`).join('')}</div>
      ${typing(names, texts.auction.search, '', prove)}
      <div class="display centered verdict in slam" style="--t: ${at(start, AUCTION.proved)}">${texts.auction.proved}</div>
    </div>`;
}

function chain(texts, start) {
  const open = at(start, 0.5);
  const links = CHAIN.links.map((link) => ({ ...link, at: at(start, link.at) }));
  const closing = at(start, CHAIN.closing);
  const said = links.slice(1);
  links.forEach((link) => {
    cue(link.at, 'whoosh', 0.5);
    cue(at(link.at, 0.25), link.side === 'x' ? 'correct' : 'tick', 0.6);
  });
  cue(closing, 'impact', 0.7);
  const turns = [[open, 'you']].concat(said.map((link) => [link.at, link.side === 'x' ? 'rival' : 'you']));
  const turnTexts = turns
    .map(([time, side]) => [time, side === 'you' ? texts.chain.yourTurn : texts.chain.theirTurn, side])
    .concat([[closing, texts.chain.closing, 'closing']]);
  const vias = [[open, '']].concat(said.map((link) => [link.at, fill(texts.chain.via, { club: link.club })]));
  const cards = links.map((link, index) => {
    const until = index + 1 < links.length ? links[index + 1].at : NEVER;
    return `<div class="layer state" style="--start: ${link.at}; --end: ${until}">${card(texts, link.footballer, link.side, 'flip shiny', link.at)}</div>`;
  });
  const trail = said.map((link, index) => {
    const previous = FOOTBALLERS[links[index].footballer];
    return `<div class="node in pop" style="--t: ${link.at}"><i><img src="/portraits/${previous.id}.webp" alt="" /></i>${previous.short}</div><div class="link in pop" style="--t: ${at(link.at, 0.1)}">${link.club}</div>`;
  });
  const entries = said
    .filter((link) => link.typed)
    .map((link) => ({
      text: FOOTBALLERS[link.footballer].name,
      from: at(start, link.typed[0]),
      until: at(start, link.typed[1]),
      release: at(link.at, 0.1),
    }));
  return `${gameHeader(texts.chain, start)}
    ${scoreboard(texts, open, turns, { you: [], rival: [] })}
    <div class="trail">${trail.join('')}</div>
    <p class="centered last-label in rise" style="--t: ${open}">${texts.chain.last}</p>
    <div class="last">${cards.join('')}</div>
    <p class="centered via" ${scripted('steps', vias)}></p>
    <div class="display centered turn in rise" style="--t: ${at(open, 0.2)}" ${scripted('steps', turnTexts)}>${texts.chain.yourTurn}</div>
    ${typing(entries, texts.chain.search, 'in rise', at(open, 0.2))}`;
}

function games(texts, start) {
  cue(at(start, 0.2), 'impact', 0.6);
  texts.games.items.forEach((_, index) => cue(at(start, 0.65 + index * 0.14), 'tick', 0.5, 0.9 + index * 0.05));
  const tiles = texts.games.items.map(
    ([name, line], index) =>
      `<div class="tile in pop" style="--t: ${at(start, 0.65 + index * 0.14)}"><small>${String(index + 1).padStart(2, '0')}</small><strong data-fit>${name}</strong><p>${line}</p></div>`,
  );
  return `<div class="heading"><div class="display big in slam" style="--t: ${at(start, 0.2)}">${texts.games.count}</div><div class="display small in rise" style="--t: ${at(start, 0.4)}" data-fit>${texts.games.title}</div></div>
    <div class="tiles">${tiles.join('')}</div>`;
}

function features(texts, start) {
  cue(at(start, 0.15), 'impact', 0.6);
  texts.features.items.forEach((_, index) => cue(at(start, 0.45 + index * 0.3), 'whoosh', 0.35));
  cue(at(start, 1.9), 'impact', 0.6);
  const perks = texts.features.items.map(
    ([name, line], index) =>
      `<div class="perk in ${index % 2 ? 'from-right' : 'from-left'}" style="--t: ${at(start, 0.45 + index * 0.3)}; --tone: ${PERK_TONES[index]}"><strong data-fit>${name}</strong><p>${line}</p></div>`,
  );
  return `<div class="heading"><div class="display wide in slam" style="--t: ${at(start, 0.15)}" data-fit>${texts.features.title}</div></div>
    <div class="perks">${perks.join('')}</div>
    <div class="numbers"><div class="display figure in slam" style="--t: ${at(start, 1.9)}">${texts.features.number} <small>${texts.features.numberLabel}</small></div><p class="in rise" style="--t: ${at(start, 2.15)}" data-fit>${texts.features.leagues}</p></div>`;
}

function storeNames(texts) {
  return stores === 'both' ? Object.values(texts.end.stores) : [texts.end.stores[stores]];
}

function finale(texts, start) {
  cue(at(start, 0.1), 'whoosh', 0.7);
  cue(at(start, 0.5), 'impact', 0.9);
  cue(at(start, 1.15), 'impact', 0.8);
  cue(at(start, 1.85), 'tick', 0.5);
  cue(at(start, 1.95), 'tick', 0.5, 1.1);
  cue(at(start, 2.2), 'win', 0.8);
  const pills = storeNames(texts).map(
    (name, index) => `<div class="in ${index % 2 ? 'from-right' : 'from-left'}" style="--t: ${at(start, 1.85 + index * 0.1)}">${name}</div>`,
  );
  return `<canvas class="ball in pop" style="--t: ${at(start, 0.1)}" width="1400" height="1400" data-job="alev-large" data-count="79" data-at="0" data-rate="30" data-loop="1"></canvas>
    <div class="display centered wordmark in slam" style="--t: ${at(start, 0.5)}">CHALLENGE<span>GOAL</span></div>
    <i class="underline" style="--t: ${at(start, 0.8)}"></i>
    <div class="centered promise in slam" style="--t: ${at(start, 1.15)}"><span class="display no-ads">${texts.noAds.title}</span></div>
    <p class="eyebrow centered call in rise" style="--t: ${at(start, 1.65)}">${texts.end.call}</p>
    <div class="stores">${pills.join('')}</div>
    <p class="centered site in rise" style="--t: ${at(start, 2.2)}">${texts.end.site}</p>
    <p class="notice in rise" style="--t: ${at(start, 2.45)}">${texts.end.notice}</p>`;
}

const SCENES = { hook, play, duel, auction, chain, games, features, finale };

function video(texts) {
  let start = 0;
  const parts = [backdrop()];
  cut.forEach(([name, length], index) => {
    const end = index + 1 < cut.length ? at(start, length) : NEVER;
    parts.push(`<section class="scene ${name}" style="--start: ${start}; --end: ${end}">${SCENES[name](texts, start)}</section>`);
    if (index > 0) {
      parts.push(`<i class="wipe" style="--t: ${start}"></i>`);
      cue(at(start, -0.1), 'whoosh', 0.6);
    }
    start = at(start, length);
  });
  return { markup: parts.join(''), duration: start };
}

function poster(texts) {
  const [first, second, third] = texts.hook;
  const markup = `${backdrop()}
    <div class="brand display"><img src="/artwork/ball.png" alt="" />CHALLENGE<span>GOAL</span></div>
    <h1 class="display" data-fit><span>${first}</span><span>${second}</span><em>${third}</em></h1>
    <div class="pitch"><span class="display no-ads">${texts.poster.noAds.join('<br />')}</span><strong>${texts.games.count}</strong><small>${texts.games.title}</small><strong>${texts.features.number}</strong><small>${texts.features.numberLabel}</small></div>
    ${board(texts, 0)}
    <p class="eyebrow call">${texts.poster.call[stores]}</p>
    <p class="site">${texts.end.site}</p>
    <p class="notice">${texts.end.notice}</p>`;
  return { markup, duration: 0 };
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
  const { job, count, at: startsAt, rate, loop } = canvas.dataset;
  const step = Math.floor(Math.max(0, seconds - Number(startsAt)) * Number(rate) + 1e-6);
  const index = loop ? step % Number(count) : Math.min(Number(count) - 1, step);
  if (canvas.shown === index) return;
  const image = await frame(job, index);
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvas.shown = index;
}

const APPLY = {
  steps(element, steps, seconds) {
    const current = steps.findLast(([time]) => seconds >= time);
    if (!current) return;
    const [, text, state] = current;
    if (text !== null && text !== undefined && element.textContent !== text) element.textContent = text;
    if (state) element.dataset.state = state;
  },
  clock(element, turns, seconds) {
    const current = turns.findLast(([time]) => seconds >= time);
    const elapsed = current ? Math.floor(seconds - current[0] + 1e-6) : 0;
    const text = String(Math.max(0, TURN_SECONDS - elapsed));
    if (element.textContent !== text) element.textContent = text;
    if (current) element.dataset.state = current[1];
  },
  typing(element, { entries, placeholder }, seconds) {
    const entry = entries.find((candidate) => seconds >= candidate.from && seconds < candidate.release);
    const share = entry ? Math.min(1, (seconds - entry.from) / (entry.until - entry.from)) : 0;
    const text = entry ? entry.text.slice(0, Math.ceil(share * entry.text.length)) : placeholder;
    if (element.textContent !== text) element.textContent = text;
    element.classList.toggle('empty', !entry);
    element.classList.toggle('live', Boolean(entry));
  },
};

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const texts = (await (await fetch('/promo/texts.json')).json())[language];
const { markup, duration } = mode === 'poster' ? poster(texts) : video(texts);
document.documentElement.lang = language;
document.body.classList.toggle('poster', mode === 'poster');
stage.innerHTML = markup;

await document.fonts.ready;
await Promise.all([...document.images].map((image) => image.decode()));
document.querySelectorAll('[data-fit]').forEach(fit);

const animations = document.getAnimations();
animations.forEach((animation) => animation.pause());
const sequences = [...document.querySelectorAll('canvas[data-job]')];
const driven = [...document.querySelectorAll('[data-script]')].map((element) => ({ element, ...scripts[Number(element.dataset.script)] }));

window.seek = async (seconds) => {
  animations.forEach((animation) => {
    animation.currentTime = seconds * 1000;
  });
  await Promise.all(sequences.map((canvas) => draw(canvas, seconds)));
  driven.forEach(({ element, kind, payload }) => APPLY[kind](element, payload, seconds));
  await nextPaint();
};

await window.seek(0);
window.cues = cues.sort((first, second) => first.time - second.time);
window.duration = duration;
