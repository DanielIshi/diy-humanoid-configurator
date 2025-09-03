import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AGB-Modal mit Versionsverwaltung und mehrsprachiger Unterstützung
 * DSGVO-konform mit expliziter Zustimmung
 */
function TermsModal({ isOpen, onClose, onAccept, requireAcceptance = false }) {
  const { t, i18n } = useTranslation();
  const [hasAccepted, setHasAccepted] = useState(!requireAcceptance);
  const [currentVersion, setCurrentVersion] = useState('1.2');
  const [lastAcceptedVersion, setLastAcceptedVersion] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // AGB-Versionen mit Änderungsprotokoll
  const termsVersions = {
    '1.2': {
      date: '2024-01-15',
      changes: ['Anpassung DSGVO-Bestimmungen', 'Erweiterte Widerrufsbelehrung', 'Neue Lieferbedingungen'],
      current: true
    },
    '1.1': {
      date: '2023-09-20',
      changes: ['Überarbeitung Zahlungsbedingungen', 'Aktualisierung Kontaktdaten'],
      current: false
    },
    '1.0': {
      date: '2023-05-01',
      changes: ['Erstveröffentlichung'],
      current: false
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAcceptanceStatus();
    }
  }, [isOpen]);

  /**
   * Prüft den aktuellen Zustimmungsstatus
   */
  const checkAcceptanceStatus = () => {
    try {
      const acceptance = localStorage.getItem('diy_terms_acceptance');
      if (acceptance) {
        const data = JSON.parse(acceptance);
        setLastAcceptedVersion(data.version);
        
        // Prüfe ob neue Version verfügbar ist
        if (data.version !== currentVersion && requireAcceptance) {
          setHasAccepted(false);
        }
      }
    } catch (error) {
      console.warn('Fehler beim Laden der AGB-Zustimmung:', error);
    }
  };

  /**
   * Speichert die Zustimmung zu den AGB
   */
  const saveAcceptance = () => {
    const acceptance = {
      version: currentVersion,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: i18n.language
    };

    try {
      localStorage.setItem('diy_terms_acceptance', JSON.stringify(acceptance));
      setLastAcceptedVersion(currentVersion);
      setHasAccepted(true);
      
      if (onAccept) {
        onAccept(acceptance);
      }
    } catch (error) {
      console.error('Fehler beim Speichern der AGB-Zustimmung:', error);
    }
  };

  /**
   * Behandelt die Zustimmung zu den AGB
   */
  const handleAccept = () => {
    if (requireAcceptance && !hasAccepted) {
      saveAcceptance();
    }
    onClose();
  };

  /**
   * Formatiert das Datum für die Anzeige
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0e1630] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {t('legal.terms.title', 'Allgemeine Geschäftsbedingungen')}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {t('legal.terms.version', 'Version')} {currentVersion} • {formatDate(termsVersions[currentVersion]?.date)}
                {lastAcceptedVersion && lastAcceptedVersion !== currentVersion && (
                  <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">
                    {t('legal.terms.newVersion', 'Neue Version verfügbar')}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="px-3 py-2 text-sm border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {t('legal.terms.versionHistory', 'Versionshistorie')}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Inhalt */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            
            {showVersionHistory ? (
              // Versionshistorie
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {t('legal.terms.versionHistory', 'Versionshistorie')}
                </h3>
                
                {Object.entries(termsVersions).map(([version, info]) => (
                  <div 
                    key={version}
                    className={`border rounded-lg p-4 ${
                      info.current 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">
                        Version {version}
                        {info.current && (
                          <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                            {t('legal.terms.current', 'Aktuell')}
                          </span>
                        )}
                      </h4>
                      <span className="text-sm text-slate-400">
                        {formatDate(info.date)}
                      </span>
                    </div>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {info.changes.map((change, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              // AGB-Inhalt
              <div className="p-6 prose prose-invert max-w-none">
                <div className="text-slate-300 space-y-6">
                  
                  {/* § 1 Geltungsbereich */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 1 {t('legal.terms.scope.title', 'Geltungsbereich')}
                    </h3>
                    <p className="mb-3">
                      {t('legal.terms.scope.content', 
                        'Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge über die Lieferung von Waren, die ein Verbraucher oder Unternehmer mit uns als Verkäufer abschließt.')}
                    </p>
                    <p>
                      {t('legal.terms.scope.variations',
                        'Abweichende Bedingungen des Kunden erkennen wir nur an, wenn wir dem ausdrücklich schriftlich zugestimmt haben.')}
                    </p>
                  </section>

                  {/* § 2 Vertragsschluss */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 2 {t('legal.terms.contract.title', 'Vertragsschluss')}
                    </h3>
                    <p className="mb-3">
                      {t('legal.terms.contract.offer',
                        'Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Vertragsangebot unsererseits dar.')}
                    </p>
                    <p className="mb-3">
                      {t('legal.terms.contract.order',
                        'Durch das Absenden einer Bestellung geben Sie ein verbindliches Angebot zum Erwerb der im Warenkorb enthaltenen Waren ab.')}
                    </p>
                    <p>
                      {t('legal.terms.contract.acceptance',
                        'Der Kaufvertrag kommt zustande, wenn wir Ihre Bestellung durch eine Auftragsbestätigungsmail annehmen oder die Waren versenden.')}
                    </p>
                  </section>

                  {/* § 3 Preise und Zahlung */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 3 {t('legal.terms.payment.title', 'Preise und Zahlung')}
                    </h3>
                    <p className="mb-3">
                      {t('legal.terms.payment.prices',
                        'Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer und sonstiger Preisbestandteile.')}
                    </p>
                    <p className="mb-3">
                      {t('legal.terms.payment.methods',
                        'Die Bezahlung erfolgt wahlweise per Vorkasse, Kreditkarte oder PayPal.')}
                    </p>
                    <p>
                      {t('legal.terms.payment.due',
                        'Bei Vorkasse ist der Kaufpreis sofort nach Vertragsschluss fällig.')}
                    </p>
                  </section>

                  {/* § 4 Lieferung */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 4 {t('legal.terms.delivery.title', 'Lieferung')}
                    </h3>
                    <p className="mb-3">
                      {t('legal.terms.delivery.time',
                        'Die Lieferung erfolgt innerhalb von 7-14 Werktagen nach Zahlungseingang.')}
                    </p>
                    <p className="mb-3">
                      {t('legal.terms.delivery.area',
                        'Wir liefern ausschließlich innerhalb der Europäischen Union.')}
                    </p>
                    <p>
                      {t('legal.terms.delivery.costs',
                        'Die Versandkosten werden im Bestellvorgang angezeigt und sind vom Kunden zu tragen.')}
                    </p>
                  </section>

                  {/* § 5 Widerrufsrecht */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 5 {t('legal.terms.withdrawal.title', 'Widerrufsrecht')}
                    </h3>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-300 mb-2">
                        {t('legal.terms.withdrawal.instructionTitle', 'Widerrufsbelehrung')}
                      </h4>
                      <p className="text-sm mb-3">
                        {t('legal.terms.withdrawal.right',
                          'Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.')}
                      </p>
                      <p className="text-sm mb-3">
                        {t('legal.terms.withdrawal.period',
                          'Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter die Waren in Besitz genommen haben.')}
                      </p>
                      <p className="text-sm">
                        {t('legal.terms.withdrawal.contact',
                          'Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung über Ihren Entschluss informieren.')}
                      </p>
                    </div>
                  </section>

                  {/* § 6 Gewährleistung */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 6 {t('legal.terms.warranty.title', 'Gewährleistung')}
                    </h3>
                    <p className="mb-3">
                      {t('legal.terms.warranty.legal',
                        'Es gelten die gesetzlichen Gewährleistungsbestimmungen.')}
                    </p>
                    <p>
                      {t('legal.terms.warranty.defects',
                        'Mängel sind uns unverzüglich schriftlich anzuzeigen.')}
                    </p>
                  </section>

                  {/* § 7 Datenschutz */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 7 {t('legal.terms.privacy.title', 'Datenschutz')}
                    </h3>
                    <p className="mb-3">
                      {t('legal.terms.privacy.processing',
                        'Ihre personenbezogenen Daten werden gemäß unserer Datenschutzerklärung verarbeitet.')}
                    </p>
                    <p>
                      {t('legal.terms.privacy.consent',
                        'Mit der Bestellung stimmen Sie der Datenverarbeitung zu den genannten Zwecken zu.')}
                    </p>
                  </section>

                  {/* § 8 Anwendbares Recht */}
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-3">
                      § 8 {t('legal.terms.law.title', 'Anwendbares Recht')}
                    </h3>
                    <p>
                      {t('legal.terms.law.content',
                        'Auf sämtliche Rechtsbeziehungen zwischen uns und dem Kunden findet das Recht der Bundesrepublik Deutschland Anwendung.')}
                    </p>
                  </section>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-6">
            {requireAcceptance && (
              <div className="mb-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={hasAccepted}
                    onChange={(e) => setHasAccepted(e.target.checked)}
                    className="mt-1 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">
                    {t('legal.terms.acceptanceText',
                      'Ich habe die Allgemeinen Geschäftsbedingungen gelesen und stimme diesen zu.')}
                    <span className="text-red-400 ml-1">*</span>
                  </span>
                </label>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-slate-400">
                {t('legal.terms.lastUpdated', 'Zuletzt aktualisiert')}: {formatDate(termsVersions[currentVersion]?.date)}
                {lastAcceptedVersion && (
                  <span className="ml-2">
                    • {t('legal.terms.acceptedVersion', 'Akzeptierte Version')}: {lastAcceptedVersion}
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {requireAcceptance ? t('actions.cancel', 'Abbrechen') : t('actions.close', 'Schließen')}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={requireAcceptance && !hasAccepted}
                  className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {requireAcceptance && !hasAccepted 
                    ? t('legal.terms.acceptAndContinue', 'Zustimmen und fortfahren')
                    : t('actions.close', 'Schließen')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TermsModal;