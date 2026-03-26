import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Use require for JSON imports to avoid TypeScript module resolution issues
const en = require('./locales/en.json');
const am = require('./locales/am.json');

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      am
    },
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
