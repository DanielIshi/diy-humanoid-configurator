import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * DSGVO-konformer Cookie-Consent Banner
 * Verwaltet Einwilligungen für verschiedene Cookie-Kategorien
 */
function PrivacyBanner() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,    // Immer aktiv, nicht deaktivierbar
    functional: false,  // Benutzerfreundlichkeit
    analytics: false,   // Analytics/Tracking
    marketing: false    // Marketing/Werbung
  });

  // Cookie-Namen für die Speicherung
  const CONSENT_COOKIE = 'diy_consent_preferences';
  const CONSENT_VERSION = '1.0';
  const CONSENT_EXPIRES_DAYS = 365;

  useEffect(() => {
    checkExistingConsent();
  }, []);

  /**
   * Prüft ob bereits eine Einwilligung existiert
   */
  const checkExistingConsent = () => {
    try {
      const saved = localStorage.getItem(CONSENT_COOKIE);
      if (saved) {
        const consent = JSON.parse(saved);
        
        // Prüfe Version und Ablaufdatum
        if (consent.version === CONSENT_VERSION && 
            new Date(consent.expires) > new Date()) {
          setPreferences(consent.preferences);
          setIsVisible(false);
          applyConsentSettings(consent.preferences);
          return;
        }
      }
    } catch (error) {
      console.warn('Fehler beim Laden der Cookie-Einstellungen:', error);
    }
    
    // Zeige Banner wenn keine gültige Einwilligung existiert
    setIsVisible(true);
  };

  /**
   * Speichert die Cookie-Einstellungen
   */
  const saveConsent = (prefs = preferences) => {
    const consent = {
      preferences: prefs,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      expires: new Date(Date.now() + CONSENT_EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      localStorage.setItem(CONSENT_COOKIE, JSON.stringify(consent));
      applyConsentSettings(prefs);
      setIsVisible(false);
      
      // Optional: Analytics Event senden (nur wenn Analytics erlaubt)
      if (prefs.analytics && window.gtag) {
        window.gtag('event', 'consent_update', {
          functional: prefs.functional,
          analytics: prefs.analytics,
          marketing: prefs.marketing
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Cookie-Einstellungen:', error);
    }
  };

  /**
   * Wendet die Einwilligung auf externe Services an
   */
  const applyConsentSettings = (prefs) => {
    // Google Analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        functionality_storage: prefs.functional ? 'granted' : 'denied',
        security_storage: 'granted', // Immer erlaubt
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        ad_user_data: prefs.marketing ? 'granted' : 'denied',
        ad_personalization: prefs.marketing ? 'granted' : 'denied'
      });
    }

    // Weitere Analytics-Services können hier hinzugefügt werden
    // z.B. Matomo, Hotjar, etc.
  };

  /**
   * Akzeptiert alle Cookies
   */
  const acceptAll = () => {
    const newPrefs = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    setPreferences(newPrefs);
    saveConsent(newPrefs);
  };

  /**
   * Akzeptiert nur notwendige Cookies
   */
  const acceptNecessaryOnly = () => {
    const newPrefs = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    setPreferences(newPrefs);
    saveConsent(newPrefs);
  };

  /**
   * Speichert individuelle Auswahl
   */
  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  /**
   * Ändert eine spezifische Einstellung
   */
  const togglePreference = (key) => {
    if (key === 'necessary') return; // Notwendige Cookies können nicht deaktiviert werden
    
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  /**
   * Öffnet die Datenschutzerklärung
   */
  const openPrivacyPolicy = () => {
    window.open('/privacy-policy', '_blank');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop für Modal-Effekt */}
      {showDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Haupt-Banner */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        showDetails ? 'transform translate-y-0' : ''
      }`}>
        <div className="bg-[#0e1630] border-t border-slate-700 shadow-xl">
          <div className="max-w-7xl mx-auto p-4 md:p-6">
            
            {!showDetails ? (
              // Kompakte Banner-Ansicht
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {t('legal.cookieConsent.title', 'Cookie-Einstellungen')}
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {t('legal.cookieConsent.description', 
                          'Wir verwenden Cookies, um Ihnen die beste Erfahrung auf unserer Website zu bieten. Einige sind notwendig, andere helfen uns, die Website zu verbessern.')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setShowDetails(true)}
                    className="px-4 py-2 text-sm border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {t('legal.cookieConsent.customize', 'Anpassen')}
                  </button>
                  <button
                    onClick={acceptNecessaryOnly}
                    className="px-4 py-2 text-sm border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {t('legal.cookieConsent.necessary', 'Nur Notwendige')}
                  </button>
                  <button
                    onClick={acceptAll}
                    className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {t('legal.cookieConsent.acceptAll', 'Alle akzeptieren')}
                  </button>
                </div>
              </div>
            ) : (
              // Detaillierte Einstellungen
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {t('legal.cookieConsent.detailsTitle', 'Cookie-Einstellungen verwalten')}
                  </h2>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Notwendige Cookies */}
                  <div className="border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">
                        {t('legal.cookieConsent.necessary', 'Notwendige Cookies')}
                      </h3>
                      <div className="flex items-center">
                        <span className="text-sm text-slate-400 mr-2">{t('common.alwaysActive', 'Immer aktiv')}</span>
                        <div className="w-10 h-6 bg-green-500 rounded-full">
                          <div className="w-4 h-4 bg-white rounded-full mt-1 ml-5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">
                      {t('legal.cookieConsent.necessaryDesc', 
                        'Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.')}
                    </p>
                  </div>

                  {/* Funktionale Cookies */}
                  <div className="border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">
                        {t('legal.cookieConsent.functional', 'Funktionale Cookies')}
                      </h3>
                      <button
                        onClick={() => togglePreference('functional')}
                        className="relative"
                      >
                        <div className={`w-10 h-6 rounded-full transition-colors ${
                          preferences.functional ? 'bg-blue-500' : 'bg-slate-600'
                        }`}>
                          <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                            preferences.functional ? 'ml-5' : 'ml-1'
                          }`} />
                        </div>
                      </button>
                    </div>
                    <p className="text-sm text-slate-300">
                      {t('legal.cookieConsent.functionalDesc',
                        'Verbessern die Benutzerfreundlichkeit und ermöglichen personalisierte Inhalte.')}
                    </p>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">
                        {t('legal.cookieConsent.analytics', 'Analytics Cookies')}
                      </h3>
                      <button
                        onClick={() => togglePreference('analytics')}
                        className="relative"
                      >
                        <div className={`w-10 h-6 rounded-full transition-colors ${
                          preferences.analytics ? 'bg-blue-500' : 'bg-slate-600'
                        }`}>
                          <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                            preferences.analytics ? 'ml-5' : 'ml-1'
                          }`} />
                        </div>
                      </button>
                    </div>
                    <p className="text-sm text-slate-300">
                      {t('legal.cookieConsent.analyticsDesc',
                        'Helfen uns zu verstehen, wie Besucher mit der Website interagieren (anonymisiert).')}
                    </p>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">
                        {t('legal.cookieConsent.marketing', 'Marketing Cookies')}
                      </h3>
                      <button
                        onClick={() => togglePreference('marketing')}
                        className="relative"
                      >
                        <div className={`w-10 h-6 rounded-full transition-colors ${
                          preferences.marketing ? 'bg-blue-500' : 'bg-slate-600'
                        }`}>
                          <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                            preferences.marketing ? 'ml-5' : 'ml-1'
                          }`} />
                        </div>
                      </button>
                    </div>
                    <p className="text-sm text-slate-300">
                      {t('legal.cookieConsent.marketingDesc',
                        'Ermöglichen personalisierte Werbung und Tracking über mehrere Websites.')}
                    </p>
                  </div>
                </div>

                {/* Aktion-Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-700">
                  <button
                    onClick={openPrivacyPolicy}
                    className="px-4 py-2 text-sm text-blue-400 hover:underline"
                  >
                    {t('legal.privacyPolicy', 'Datenschutzerklärung')}
                  </button>
                  <div className="flex gap-3 sm:ml-auto">
                    <button
                      onClick={acceptNecessaryOnly}
                      className="px-4 py-2 text-sm border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {t('legal.cookieConsent.necessary', 'Nur Notwendige')}
                    </button>
                    <button
                      onClick={saveCustomPreferences}
                      className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      {t('legal.cookieConsent.savePreferences', 'Einstellungen speichern')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default PrivacyBanner;