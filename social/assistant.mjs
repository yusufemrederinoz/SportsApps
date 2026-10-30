import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeDrafts } from './drafts.mjs';
import { fold, openFootball } from './football.mjs';
import { createQuizzes, dailySet } from './quiz.mjs';
import { createTelegram } from './telegram.mjs';

const SECRETS = join(homedir(), '.challengegoal');
const WORK = join(SECRETS, 'assistant');
const IMAGES = join(WORK, 'images');
const STATE_FILE = join(WORK, 'state.json');
const LOG_FILE = join(WORK, 'assistant.log');
const LOCK_FILE = join(WORK, 'assistant.pid');
const MORNING_HOUR = 10;
const EVENING_HOUR = 20;
const MIN_ANSWER_DELAY = 4 * 60 * 60 * 1000;
const COPY_LIMIT = 256;
const MAX_SOURCES = 50;
const MAX_USED = 3000;
const TWEET_URL = /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status(?:es)?\/(\d+)\S*/i;

mkdirSync(IMAGES, { recursive: true });

function log(message) {
  appendFileSync(LOG_FILE, `${new Date().toISOString()} ${message}\n`);
}

function alreadyRunning() {
  if (!existsSync(LOCK_FILE)) return false;
  const pid = Number(readFileSync(LOCK_FILE, 'utf8'));
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

if (alreadyRunning()) {
  process.exit(0);
}
writeFileSync(LOCK_FILE, String(process.pid));

const texts = JSON.parse(readFileSync(new URL('./texts.tr.json', import.meta.url), 'utf8'));
const telegram = createTelegram(readFileSync(join(SECRETS, 'telegram-bot-token.txt'), 'utf8').trim());
const football = openFootball();
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : { offset: 0, ownerChatId: null, used: [], days: {}, sources: {} };
const used = new Set(state.used);
const makers = createQuizzes(football, texts, used);

const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
const today = () => new Date().toLocaleDateString('sv-SE');
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function save() {
  state.used = [...used].slice(-MAX_USED);
  const keys = Object.keys(state.sources);
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_SOURCES))) delete state.sources[key];
  const days = Object.keys(state.days).sort();
  for (const day of days.slice(0, Math.max(0, days.length - 14))) delete state.days[day];
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function intent(text, replyTo) {
  const reply = replyTo ? `in_reply_to=${replyTo}&` : '';
  return `https://twitter.com/intent/tweet?${reply}text=${encodeURIComponent(text)}`;
}

function copyButton(label, text) {
  return text.length <= COPY_LIMIT ? [{ text: label, copy_text: { text } }] : [];
}

function send(text, keyboard) {
  return telegram.call('sendMessage', {
    chat_id: state.ownerChatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard.filter((row) => row.length > 0) } } : {}),
  });
}

async function whileTyping(work) {
  const typing = () => telegram.call('sendChatAction', { chat_id: state.ownerChatId, action: 'typing' }).catch(() => {});
  typing();
  const timer = setInterval(typing, 4500);
  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
}

function decode(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/https?:\/\/t\.co\/\S+|pic\.twitter\.com\/\S+/g, '')
    .trim();
}

async function readPost(url) {
  const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1&dnt=true`);
  if (!response.ok) throw new Error(`oembed ${response.status}`);
  const payload = await response.json();
  const paragraph = payload.html.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
  const handle = payload.author_url?.split('/').pop();
  return { text: decode(paragraph), author: `${payload.author_name} (@${handle})` };
}

function dayRecord(day = today()) {
  state.days[day] ??= { quizzes: [], morningAt: null, eveningAt: null };
  return state.days[day];
}

function quizKeyboard(quiz) {
  return [[{ text: texts.share, url: intent(quiz.text) }], [...copyButton(texts.copyOne, quiz.text), { text: texts.swap, callback_data: `swap:${quiz.key}` }]];
}

async function sendQuizzes(set) {
  const record = dayRecord();
  for (const quiz of set) {
    used.add(quiz.key);
    const message = await send(quiz.text, quizKeyboard(quiz));
    record.quizzes.push({ ...quiz, messageId: message.message_id, tweetId: null });
  }
  save();
}

async function sendMorning() {
  const record = dayRecord();
  const set = dailySet(makers, Math.floor(Date.now() / 86_400_000));
  record.morningAt = Date.now();
  save();
  if (set.length === 0) {
    await send(texts.noQuiz);
    return;
  }
  await send(texts.morning);
  await sendQuizzes(set);
  log(`morning quizzes sent: ${set.map((quiz) => quiz.key).join(', ')}`);
}

async function sendEvening() {
  const record = dayRecord();
  record.eveningAt = Date.now();
  save();
  if (record.quizzes.length === 0) return;
  await send(texts.evening);
  for (const quiz of record.quizzes) {
    const share = quiz.tweetId ? { text: texts.shareReply, url: intent(quiz.answer, quiz.tweetId) } : { text: texts.share, url: intent(quiz.answer) };
    await send(quiz.answer, [[share], copyButton(texts.copyOne, quiz.answer)]);
  }
  log('evening answers sent');
}

async function tick() {
  if (!state.ownerChatId) return;
  const record = dayRecord();
  const hour = new Date().getHours();
  if (!record.morningAt && hour >= MORNING_HOUR) {
    await sendMorning();
  } else if (record.morningAt && !record.eveningAt && hour >= EVENING_HOUR && Date.now() - record.morningAt >= MIN_ANSWER_DELAY) {
    await sendEvening();
  }
}

function matchQuiz(text) {
  const folded = fold(text);
  for (const day of [today(), new Date(Date.now() - 86_400_000).toLocaleDateString('sv-SE')]) {
    const record = state.days[day];
    if (!record || record.eveningAt) continue;
    const quiz = record.quizzes.find((item) => folded.startsWith(fold(item.text).slice(0, 40)));
    if (quiz) return quiz;
  }
  return null;
}

async function draft(key) {
  const source = state.sources[key];
  const result = await whileTyping(() => writeDrafts(football, { ...source, workDir: WORK }));
  log(`drafts for ${source.author ?? 'text'}: ${result.drafts.length}${result.skip ? ` skip (${result.skip})` : ''}`);
  if (result.skip) {
    await send(fill(texts.skipped, { reason: result.skip }));
    return;
  }
  const redo = [{ text: texts.redo, callback_data: `redo:${key}` }];
  if (result.drafts.length === 0) {
    await send(texts.noDrafts, [redo]);
    return;
  }
  const excerpt = source.text.length > 140 ? `${source.text.slice(0, 140)}…` : source.text;
  const header = source.author ? `${fill(texts.draftsHeader, { author: source.author, excerpt })}\n\n` : '';
  const body = result.drafts.map((text, index) => `${index + 1}. ${text}`).join('\n\n');
  const replies = source.tweetId ? result.drafts.map((text, index) => ({ text: fill(texts.reply, { index: index + 1 }), url: intent(text, source.tweetId) })) : [];
  const copies = result.drafts.flatMap((text, index) => copyButton(fill(texts.copy, { index: index + 1 }), text));
  await send(header + body, [replies, copies, redo]);
}

async function handleMessage(message) {
  if (message.chat.type !== 'private') return;
  if (!state.ownerChatId) {
    state.ownerChatId = message.chat.id;
    save();
    log(`owner set: ${message.from?.first_name ?? ''} @${message.from?.username ?? '-'}`);
    await send(texts.welcome);
    return;
  }
  if (message.chat.id !== state.ownerChatId) {
    await telegram.call('sendMessage', { chat_id: message.chat.id, text: texts.notOwner }).catch(() => {});
    return;
  }
  const content = (message.text ?? message.caption ?? '').trim();
  if (/^\/(start|yardim|help)\b/i.test(content)) {
    await send(texts.welcome);
    return;
  }
  if (/^\/soru\b/i.test(content)) {
    const record = dayRecord();
    if (!record.morningAt) await sendMorning();
    else await sendQuizzes(dailySet(makers, Math.floor(Math.random() * 1000)));
    return;
  }
  const key = `${message.chat.id}-${message.message_id}`;
  let imageFile = null;
  if (message.photo?.length) {
    const photo = message.photo.at(-1);
    imageFile = join(IMAGES, `${photo.file_unique_id}.jpg`);
    await telegram.download(photo.file_id, imageFile);
  }
  const link = content.match(TWEET_URL);
  if (link) {
    const note = content.replace(link[0], '').trim();
    let post;
    try {
      post = await readPost(`https://x.com/${link[1]}/status/${link[2]}`);
    } catch (error) {
      log(`read failed for ${link[2]}: ${error.message}`);
      await send(texts.readFailed);
      return;
    }
    const quiz = matchQuiz(post.text);
    if (quiz) {
      quiz.tweetId = link[2];
      save();
      await send(texts.quizLinked);
      return;
    }
    state.sources[key] = { text: post.text, author: post.author, tweetId: link[2], imageFile, note: note || null };
  } else if (content || imageFile) {
    state.sources[key] = { text: imageFile ? '' : content, author: null, tweetId: null, imageFile, note: imageFile ? content || null : null };
  } else {
    return;
  }
  save();
  await draft(key);
}

async function handleCallback(query) {
  await telegram.call('answerCallbackQuery', { callback_query_id: query.id }).catch(() => {});
  if (query.message?.chat.id !== state.ownerChatId) return;
  const [action, ...rest] = query.data.split(':');
  const key = rest.join(':');
  if (action === 'redo' && state.sources[key]) {
    await draft(key);
    return;
  }
  if (action === 'swap') {
    const record = Object.values(state.days).find((day) => day.quizzes.some((quiz) => quiz.key === key));
    const index = record?.quizzes.findIndex((quiz) => quiz.key === key) ?? -1;
    if (index === -1) return;
    const old = record.quizzes[index];
    const replacement = makers[old.kind]();
    if (!replacement) return;
    used.add(replacement.key);
    record.quizzes[index] = { ...replacement, messageId: old.messageId, tweetId: null };
    save();
    await telegram.call('editMessageText', {
      chat_id: state.ownerChatId,
      message_id: old.messageId,
      text: replacement.text,
      reply_markup: { inline_keyboard: quizKeyboard(replacement).filter((row) => row.length > 0) },
    });
  }
}

async function handle(update) {
  if (update.message) await handleMessage(update.message);
  else if (update.callback_query) await handleCallback(update.callback_query);
}

log(`started pid ${process.pid}`);
for (;;) {
  try {
    await tick();
  } catch (error) {
    log(`tick failed: ${error.message}`);
  }
  let updates = [];
  try {
    updates = await telegram.call('getUpdates', { offset: state.offset, timeout: 50, allowed_updates: ['message', 'callback_query'] });
  } catch (error) {
    log(`getUpdates failed: ${error.message}`);
    await sleep(5000);
  }
  for (const update of updates) {
    state.offset = update.update_id + 1;
    save();
    try {
      await handle(update);
    } catch (error) {
      log(`update ${update.update_id} failed: ${error.message}`);
      await send(texts.draftsFailed).catch(() => {});
    }
  }
}
