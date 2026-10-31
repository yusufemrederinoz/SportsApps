const root = document.documentElement;
const data = JSON.parse(document.getElementById('scene-data').textContent);
const phone = document.querySelector('.phone');
const fallback = phone.querySelector('.fallback');
const note = document.querySelector('.screen-note');
const screenList = document.querySelector('.screens');
const buttons = [...screenList.querySelectorAll('button')];
const motionButton = document.querySelector('.motion');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ROTATION_INTERVAL = 4500;
const MOTION_KEY = 'challengegoal-motion';
const SOURCE_PATTERN = /^[a-z0-9-]{1,32}$/;

const screenListeners = new Set();
const motionListeners = new Set();
let currentScreen = 'home';
let chosenByVisitor = false;
let phoneInView = false;
let paused = reducedMotion.matches || storedMotion() === 'paused';

function storedMotion() {
  try {
    return window.localStorage.getItem(MOTION_KEY);
  } catch {
    return null;
  }
}

function rememberMotion(value) {
  try {
    window.localStorage.setItem(MOTION_KEY, value);
  } catch {
    return;
  }
}

function showScreen(name, byVisitor) {
  chosenByVisitor = chosenByVisitor || byVisitor;
  if (name === currentScreen) {
    return;
  }
  currentScreen = name;
  for (const button of buttons) {
    const active = button.dataset.screen === name;
    button.setAttribute('aria-pressed', String(active));
    if (active) {
      phone.setAttribute('aria-label', `${phone.dataset.label}: ${button.querySelector('strong').textContent}`);
      note.textContent = button.querySelector('span').textContent;
    }
  }
  fallback.src = `/img/screens/${data.screens}/${name}.webp`;
  screenListeners.forEach((listener) => listener(name));
}

function showMotionState() {
  const label = paused ? motionButton.dataset.play : motionButton.dataset.pause;
  motionButton.dataset.state = paused ? 'paused' : 'playing';
  motionButton.setAttribute('aria-label', label);
  motionButton.title = label;
}

for (const button of buttons) {
  button.addEventListener('click', () => showScreen(button.dataset.screen, true));
}

motionButton.addEventListener('click', () => {
  paused = !paused;
  rememberMotion(paused ? 'paused' : 'playing');
  showMotionState();
  motionListeners.forEach((listener) => listener(paused));
});
showMotionState();
motionButton.hidden = false;

new IntersectionObserver(([entry]) => {
  phoneInView = entry.isIntersecting;
}).observe(phone);

window.setInterval(() => {
  if (paused || chosenByVisitor || !phoneInView || document.hidden || screenList.matches(':hover, :focus-within')) {
    return;
  }
  const index = buttons.findIndex((button) => button.dataset.screen === currentScreen);
  showScreen(buttons[(index + 1) % buttons.length].dataset.screen, false);
}, ROTATION_INTERVAL);

function tagStoreLinks() {
  const source = new URLSearchParams(window.location.search).get('k');
  if (!source || !SOURCE_PATTERN.test(source)) {
    return;
  }
  for (const link of document.querySelectorAll('.stores a')) {
    const url = new URL(link.href);
    if (url.hostname === 'play.google.com') {
      url.searchParams.set('referrer', `utm_source=${source}&utm_medium=social`);
      link.href = url.toString();
    }
  }
}

tagStoreLinks();

function supportsScene() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2')) && !navigator.connection?.saveData;
  } catch {
    return false;
  }
}

if (supportsScene()) {
  import(data.scene)
    .then((scene) =>
      scene.start({
        data,
        screen: () => currentScreen,
        onScreen: (listener) => screenListeners.add(listener),
        paused: () => paused,
        onMotion: (listener) => motionListeners.add(listener),
      }),
    )
    .then(() => root.classList.add('has-scene'))
    .catch(() => root.classList.add('no-scene'));
} else {
  root.classList.add('no-scene');
}
