const SITE = 'https://challengegoal.app';
const SUPPORT_ADDRESS = 'destek@challengegoal.app';
const HOME_LANGUAGE = 'tr';
const HOME_PATHS = { privacy: '/gizlilik', terms: '/kosullar' } as const;
const TRANSLATED = ['en', 'de', 'es', 'fr', 'it'];
const FALLBACK = 'en';

export type LegalPage = keyof typeof HOME_PATHS;

export function legalUrl(page: LegalPage, language: string): string {
  if (language === HOME_LANGUAGE) {
    return `${SITE}${HOME_PATHS[page]}`;
  }
  return `${SITE}/${TRANSLATED.includes(language) ? language : FALLBACK}/${page}`;
}

export function reportUrl(subject: string, username: string | null): string {
  const body = username ? `\n\n${username}` : '';
  return `mailto:${SUPPORT_ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
