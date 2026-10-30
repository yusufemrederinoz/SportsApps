import { askClaude, parseJson } from './claude.mjs';

const SYSTEM = new URL('./prompts/reply.md', import.meta.url);
const MAX_LENGTH = 240;

export async function writeDrafts(football, { text, author, imageFile, note, workDir }) {
  const facts = football.facts([text, note].filter(Boolean).join(' '));
  const parts = [`Post by: ${author ?? 'unknown account'}`, `Post text: ${text || '(no text)'}`];
  if (imageFile) parts.push(`The post's image is saved as ${imageFile}. Read it before writing.`);
  if (note) parts.push(`Note from the account owner: ${note}`);
  parts.push(facts.length > 0 ? `Facts from our football database:\n${facts.join('\n')}` : 'No facts from our database matched this post.');
  const reply = await askClaude({
    systemFile: SYSTEM,
    prompt: parts.join('\n\n'),
    cwd: workDir,
    tools: imageFile ? ['Read'] : [],
  });
  const payload = parseJson(reply);
  const drafts = (payload.drafts ?? []).map((draft) => String(draft).trim()).filter((draft) => draft.length > 0 && draft.length <= MAX_LENGTH);
  return { drafts, skip: payload.skip ?? null, facts };
}
