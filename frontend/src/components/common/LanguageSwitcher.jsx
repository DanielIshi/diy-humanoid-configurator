import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, LanguagesIcon } from 'lucide-react';

const languages = [
  {
    code: 'de',
    name: 'Deutsch',
    flag: '🇩🇪',
    isRTL: false
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
    isRTL: false
  },
  {
    code: 'nl',
    name: 'Nederlands',
    flag: '🇳🇱',
    isRTL: false
  },
  {
    code: 'th',
    name: 'ไทย',
    flag: '🇹🇭',
    isRTL: true // Thai is written left to right, but we'll add RTL support for completeness
  }
];

export function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      
      // Update document direction for RTL languages
      const selectedLanguage = languages.find(lang => lang.code === languageCode);
      if (selectedLanguage) {
        document.documentElement.dir = selectedLanguage.isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = languageCode;
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors duration-200"
        aria-label={t('language.selectLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg" role="img" aria-label={currentLanguage.name}>
          {currentLanguage.flag}
        </span>
        <span className="text-sm text-slate-300 hidden sm:inline">
          {currentLanguage.name}
        </span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown menu */}
          <div
            className="absolute right-0 top-full mt-2 py-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20"
            role="listbox"
            aria-label={t('language.selectLanguage')}
          >
            <div className="px-3 py-2 border-b border-slate-600">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <LanguagesIcon className="w-4 h-4" />
                <span>{t('language.selectLanguage')}</span>
              </div>
            </div>
            
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-700 transition-colors duration-200
                  ${language.code === i18n.language 
                    ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400' 
                    : 'text-slate-300'
                  }
                `}
                role="option"
                aria-selected={language.code === i18n.language}
              >
                <span className="text-lg" role="img" aria-label={language.name}>
                  {language.flag}
                </span>
                <span className="text-sm">
                  {language.name}
                </span>
                {language.code === i18n.language && (
                  <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full" />
                )}
              </button>
            ))}
            
            <div className="px-3 py-2 border-t border-slate-600 mt-2">
              <p className="text-xs text-slate-500">
                {t('language.selectLanguage')}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSwitcher;