import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, resolveLanguage, resources } from './languages';

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(getLocales().map((locale) => locale.languageCode)),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
});

export default i18n;
