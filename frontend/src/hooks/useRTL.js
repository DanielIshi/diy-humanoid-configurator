import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// RTL languages configuration
const RTL_LANGUAGES = {
  'th': false, // Thai is actually LTR
  'ar': true,  // Arabic (if added later)
  'he': true,  // Hebrew (if added later)
  'fa': true   // Persian (if added later)
};

export function useRTL() {
  const { i18n } = useTranslation();
  
  const isRTL = RTL_LANGUAGES[i18n.language] || false;
  
  useEffect(() => {
    // Update document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    
    // Add RTL class to body for additional styling if needed
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [i18n.language, isRTL]);
  
  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'text-right' : 'text-left',
    floatStart: isRTL ? 'float-right' : 'float-left',
    floatEnd: isRTL ? 'float-left' : 'float-right',
    marginStart: isRTL ? 'mr' : 'ml',
    marginEnd: isRTL ? 'ml' : 'mr',
    paddingStart: isRTL ? 'pr' : 'pl',
    paddingEnd: isRTL ? 'pl' : 'pr',
    borderStart: isRTL ? 'border-r' : 'border-l',
    borderEnd: isRTL ? 'border-l' : 'border-r',
    roundedStart: isRTL ? 'rounded-r' : 'rounded-l',
    roundedEnd: isRTL ? 'rounded-l' : 'rounded-r'
  };
}