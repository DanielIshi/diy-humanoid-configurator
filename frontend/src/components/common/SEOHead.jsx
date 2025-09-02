import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const SUPPORTED_LANGUAGES = ['de', 'en', 'nl', 'th'];
const DEFAULT_LANGUAGE = 'de';

const SEO_TRANSLATIONS = {
  de: {
    title: 'DIY Humanoid Konfigurator - Bauen Sie Ihren eigenen Roboter',
    description: 'Konfigurieren und bestellen Sie Ihren maßgeschneiderten humanoiden Roboter. Wählen Sie aus verschiedenen Komponenten und erstellen Sie Ihren perfekten DIY-Roboter.',
    keywords: 'DIY Roboter, Humanoid, Konfigurator, Roboter bauen, Arduino, Raspberry Pi, Servo Motoren'
  },
  en: {
    title: 'DIY Humanoid Configurator - Build Your Own Robot',
    description: 'Configure and order your custom humanoid robot. Choose from various components and create your perfect DIY robot.',
    keywords: 'DIY Robot, Humanoid, Configurator, Build Robot, Arduino, Raspberry Pi, Servo Motors'
  },
  nl: {
    title: 'DIY Humanoid Configurator - Bouw Je Eigen Robot',
    description: 'Configureer en bestel je aangepaste humanoïde robot. Kies uit verschillende componenten en creëer je perfecte DIY-robot.',
    keywords: 'DIY Robot, Humanoïde, Configurator, Robot Bouwen, Arduino, Raspberry Pi, Servo Motoren'
  },
  th: {
    title: 'เครื่องมือปรับแต่งหุ่นยนต์คล้ายมนุษย์ DIY - สร้างหุ่นยนต์ของคุณเอง',
    description: 'ปรับแต่งและสั่งซื้อหุ่นยนต์คล้ายมนุษย์ตามที่คุณต้องการ เลือกจากส่วนประกอบต่างๆ และสร้างหุ่นยนต์ DIY ที่สมบูรณ์แบบของคุณ',
    keywords: 'หุ่นยนต์ DIY, หุ่นยนต์คล้ายมนุษย์, เครื่องมือปรับแต่ง, สร้างหุ่นยนต์, Arduino, Raspberry Pi, มอเตอร์เซอร์โว'
  }
};

export function SEOHead({ 
  title = null, 
  description = null, 
  keywords = null,
  ogImage = null,
  noIndex = false 
}) {
  const { i18n } = useTranslation();
  const location = useLocation();
  
  const currentLanguage = i18n.language || DEFAULT_LANGUAGE;
  const seoData = SEO_TRANSLATIONS[currentLanguage] || SEO_TRANSLATIONS[DEFAULT_LANGUAGE];
  
  const pageTitle = title || seoData.title;
  const pageDescription = description || seoData.description;
  const pageKeywords = keywords || seoData.keywords;
  const currentUrl = window.location.origin + location.pathname;
  
  useEffect(() => {
    // Update document title
    document.title = pageTitle;
    
    // Update or create meta tags
    const updateMetaTag = (property, content, attributeName = 'name') => {
      let meta = document.querySelector(`meta[${attributeName}="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attributeName, property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    // Basic meta tags
    updateMetaTag('description', pageDescription);
    updateMetaTag('keywords', pageKeywords);
    updateMetaTag('language', currentLanguage);
    updateMetaTag('author', 'DIY Humanoid Configurator');
    
    // Robots meta tag
    if (noIndex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }
    
    // Open Graph meta tags
    updateMetaTag('og:title', pageTitle, 'property');
    updateMetaTag('og:description', pageDescription, 'property');
    updateMetaTag('og:url', currentUrl, 'property');
    updateMetaTag('og:type', 'website', 'property');
    updateMetaTag('og:locale', getOGLocale(currentLanguage), 'property');
    updateMetaTag('og:site_name', 'DIY Humanoid Configurator', 'property');
    
    if (ogImage) {
      updateMetaTag('og:image', ogImage, 'property');
    }
    
    // Twitter Card meta tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', pageTitle, 'name');
    updateMetaTag('twitter:description', pageDescription, 'name');
    
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage, 'name');
    }
    
    // Create or update hreflang links
    updateHreflangLinks(location.pathname);
    
    // Update canonical link
    updateCanonicalLink(currentUrl);
    
  }, [pageTitle, pageDescription, pageKeywords, currentLanguage, location.pathname, ogImage, noIndex]);
  
  return null; // This component doesn't render anything
}

function getOGLocale(language) {
  const localeMap = {
    'de': 'de_DE',
    'en': 'en_US',
    'nl': 'nl_NL',
    'th': 'th_TH'
  };
  return localeMap[language] || localeMap[DEFAULT_LANGUAGE];
}

function updateHreflangLinks(pathname) {
  // Remove existing hreflang links
  document.querySelectorAll('link[rel="alternate"]').forEach(link => {
    if (link.getAttribute('hreflang')) {
      link.remove();
    }
  });
  
  // Add hreflang links for each supported language
  SUPPORTED_LANGUAGES.forEach(lang => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = lang;
    link.href = `${window.location.origin}${pathname}?lang=${lang}`;
    document.head.appendChild(link);
  });
  
  // Add x-default hreflang
  const defaultLink = document.createElement('link');
  defaultLink.rel = 'alternate';
  defaultLink.hreflang = 'x-default';
  defaultLink.href = `${window.location.origin}${pathname}`;
  document.head.appendChild(defaultLink);
}

function updateCanonicalLink(url) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

export default SEOHead;