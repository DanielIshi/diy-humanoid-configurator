import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import deTranslations from '../locales/de/translation.json';
import enTranslations from '../locales/en/translation.json';
import nlTranslations from '../locales/nl/translation.json';
import thTranslations from '../locales/th/translation.json';

// Import product translations
import deProducts from '../locales/de/products.json';
import enProducts from '../locales/en/products.json';
import nlProducts from '../locales/nl/products.json';
import thProducts from '../locales/th/products.json';

const resources = {
  de: {
    translation: deTranslations,
    products: deProducts
  },
  en: {
    translation: enTranslations,
    products: enProducts
  },
  nl: {
    translation: nlTranslations,
    products: nlProducts
  },
  th: {
    translation: thTranslations,
    products: thProducts
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'preferred-language',
      caches: ['localStorage'],
    },

    // Fallback language
    fallbackLng: 'de',
    
    // Supported languages
    supportedLngs: ['de', 'en', 'nl', 'th'],
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false // React already does escaping
    },

    // React specific options
    react: {
      useSuspense: false // Disable suspense for now to avoid loading issues
    }
  });

export default i18n;