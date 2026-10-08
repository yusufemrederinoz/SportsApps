import { codeMailHtml } from './layout';
import type { Mail } from './mailer';
import messages from './messages.json' with { type: 'json' };

type Language = keyof typeof messages;

const DEFAULT_LANGUAGE: Language = 'en';
const SIGNATURE = 'ChallengeGoal';

function languageOf(value: string): Language {
  const language = value.toLowerCase().split('-')[0] ?? '';
  return language in messages ? (language as Language) : DEFAULT_LANGUAGE;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''));
}

export function passwordResetMail(to: string, language: string, code: string, minutes: number): Mail {
  const chosen = languageOf(language);
  const values = { code, minutes };
  const { subject, preview, title, greeting, intro, instructions, footnote } = messages[chosen].passwordReset;
  const filled = { intro: fill(intro, values), instructions: fill(instructions, values), footnote: fill(footnote, values) };
  return {
    to,
    subject: fill(subject, values),
    text: [greeting, `${filled.intro} ${code}`, filled.instructions, filled.footnote, SIGNATURE].join('\n\n'),
    html: codeMailHtml({ language: chosen, preview: fill(preview, values), title, code, ...filled }),
  };
}
