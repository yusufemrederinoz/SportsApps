import { askClaude, parseJson } from './claude.mjs';

const WRITE_SYSTEM = new URL('./prompts/reply.md', import.meta.url);
const HUMANIZE_SYSTEM = new URL('./prompts/humanize.md', import.meta.url);
const MAX_LENGTH = 240;

const clean = (drafts) => (drafts ?? []).map((draft) => String(draft).trim()).filter((draft) => draft.length > 0 && draft.length <= MAX_LENGTH);

async function humanize(drafts, workDir) {
  const reply = await askClaude({
    systemFile: HUMANIZE_SYSTEM,
    prompt: `Drafts to edit:\n${JSON.stringify({ drafts }, null, 2)}`,
    cwd: workDir,
  });
  const edited = clean(parseJson(reply).drafts);
  return edited.length === drafts.length ? edited : drafts;
}

export async function writeDrafts(football, { text, author, imageFile, note, workDir }) {
  const facts = football.facts([text, note].filter(Boolean).join(' '));
  const parts = [`Post by: ${author ?? 'unknown account'}`, `Post text: ${text || '(no text)'}`];
  if (imageFile) parts.push(`The post's image is saved as ${imageFile}. Read it before writing.`);
  if (note) parts.push(`Note from the account owner: ${note}`);
  parts.push(facts.length > 0 ? `Facts from our football database:\n${facts.join('\n')}` : 'No facts from our database matched this post.');
  const reply = await askClaude({
    systemFile: WRITE_SYSTEM,
    prompt: parts.join('\n\n'),
    cwd: workDir,
    tools: imageFile ? ['Read'] : [],
  });
  const payload = parseJson(reply);
  const drafts = clean(payload.drafts);
  if (drafts.length === 0) return { drafts, skip: payload.skip ?? null, facts };
  try {
    return { drafts: await humanize(drafts, workDir), skip: null, facts, original: drafts };
  } catch {
    return { drafts, skip: null, facts, original: drafts };
  }
}
