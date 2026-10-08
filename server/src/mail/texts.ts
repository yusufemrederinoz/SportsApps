import type { Mail } from './mailer';
import messages from './messages.json' with { type: 'json' };

type Language = keyof typeof messages;

const DEFAULT_LANGUAGE: Language = 'en';

function languageOf(value: string): Language {
  const language = value.toLowerCase().split('-')[0] ?? '';
  return language in messages ? (language as Language) : DEFAULT_LANGUAGE;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''));
}

export function passwordResetMail(to: string, language: string, code: string, minutes: number): Mail {
  const text = messages[languageOf(language)].passwordReset;
  return { to, subject: fill(text.subject, { code, minutes }), text: fill(text.text, { code, minutes }) };
}
