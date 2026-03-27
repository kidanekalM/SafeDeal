import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import am from './locales/am.json';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/aa4edf5c-6321-4b39-ba94-76f38cd1122e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix-keys',hypothesisId:'H1',location:'src/i18n.ts:11',message:'locale files loaded',data:{enTop:Object.keys(en||{}),amTop:Object.keys(am||{}),enHasTranslation:!!en?.translation,amHasTranslation:!!am?.translation},timestamp:Date.now()})}).catch(()=>{});
// #endregion

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en?.translation ?? en },
      am: { translation: am?.translation ?? am }
    },
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false,
    },
  });

// #region agent log
i18n.on('initialized', (opts) => {
  fetch('http://127.0.0.1:7242/ingest/aa4edf5c-6321-4b39-ba94-76f38cd1122e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix-keys',hypothesisId:'H2',location:'src/i18n.ts:30',message:'i18n initialized',data:{language:i18n.language,defaultNS:(opts as any)?.defaultNS,ns:(opts as any)?.ns,hasEnTranslation:i18n.hasResourceBundle('en','translation'),hasAmTranslation:i18n.hasResourceBundle('am','translation')},timestamp:Date.now()})}).catch(()=>{});
  fetch('http://127.0.0.1:7242/ingest/aa4edf5c-6321-4b39-ba94-76f38cd1122e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix-keys',hypothesisId:'H3',location:'src/i18n.ts:31',message:'sample key resolution',data:{whySafedeal:i18n.t('pages.why_safedeal'),signIn:i18n.t('components.sign_in')},timestamp:Date.now()})}).catch(()=>{});
});
// #endregion

// #region agent log
i18n.on('failedLoading', (lng, ns, msg) => {
  fetch('http://127.0.0.1:7242/ingest/aa4edf5c-6321-4b39-ba94-76f38cd1122e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix-keys',hypothesisId:'H4',location:'src/i18n.ts:37',message:'i18n failedLoading',data:{lng,ns,msg},timestamp:Date.now()})}).catch(()=>{});
});
// #endregion

export default i18n;
