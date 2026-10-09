import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import tr from './locales/tr.json';

export const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
} as const;

export type Language = keyof typeof resources;

export const FALLBACK_LANGUAGE: Language = 'en';

export function isLanguage(code: string): code is Language {
  return Object.hasOwn(resources, code);
}

export function resolveLanguage(preferredCodes: readonly (string | null)[]): Language {
  for (const code of preferredCodes) {
    if (code && isLanguage(code)) {
      return code;
    }
  }
  return FALLBACK_LANGUAGE;
}
