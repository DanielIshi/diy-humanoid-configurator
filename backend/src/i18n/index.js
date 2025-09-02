import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_LANGUAGES = ['de', 'en', 'nl', 'th'];
const DEFAULT_LANGUAGE = 'de';

// Initialize i18next for backend
i18next
  .use(Backend)
  .init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    
    backend: {
      loadPath: path.join(__dirname, 'locales', '{{lng}}', '{{ns}}.json'),
    },
    
    ns: ['common', 'errors', 'emails', 'products'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // Not needed for server-side usage
    },
    
    debug: process.env.NODE_ENV === 'development',
  });

// Helper function to get language from Accept-Language header
export function getLanguageFromHeader(acceptLanguageHeader) {
  if (!acceptLanguageHeader) {
    return DEFAULT_LANGUAGE;
  }
  
  const languages = acceptLanguageHeader
    .split(',')
    .map(lang => {
      const [code, quality = '1'] = lang.trim().split(';q=');
      return { code: code.split('-')[0].toLowerCase(), quality: parseFloat(quality) };
    })
    .sort((a, b) => b.quality - a.quality);
  
  for (const lang of languages) {
    if (SUPPORTED_LANGUAGES.includes(lang.code)) {
      return lang.code;
    }
  }
  
  return DEFAULT_LANGUAGE;
}

// Middleware to set language from request
export function languageMiddleware(req, res, next) {
  const lang = getLanguageFromHeader(req.headers['accept-language']);
  req.language = lang;
  
  // Set i18next language for this request
  const i18n = i18next.cloneInstance();
  i18n.changeLanguage(lang);
  req.i18n = i18n;
  req.t = i18n.t.bind(i18n);
  
  next();
}

// Helper function to translate responses
export function translateResponse(key, options = {}, language = DEFAULT_LANGUAGE) {
  const i18n = i18next.cloneInstance();
  i18n.changeLanguage(language);
  return i18n.t(key, options);
}

export default i18next;