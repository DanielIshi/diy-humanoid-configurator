import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminContext } from '../../contexts/AdminContext';

function PaymentSettings() {
  const { t } = useTranslation();
  const { settings, setSettings } = useContext(AdminContext);

  return (
    <section className="space-y-4 lg:col-span-1">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h2 className="text-xl font-semibold">{t('admin.paymentSettings', 'Zahlung & Provider (Demo)')}</h2>
        <div className="mt-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span>{t('admin.provider', 'Provider')}</span>
            <select 
              value={settings.paymentProvider} 
              onChange={(e) => setSettings({...settings, paymentProvider: e.target.value})} 
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1"
            >
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="sepa">SEPA</option>
            </select>
          </div>
          
          {settings.paymentProvider === 'stripe' && (
            <input 
              placeholder={t('admin.stripeKeyPlaceholder', 'Stripe Publishable Key (Demo)')} 
              value={settings.stripePublicKey} 
              onChange={(e) => setSettings({...settings, stripePublicKey: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
          )}
          
          {settings.paymentProvider === 'paypal' && (
            <input 
              placeholder={t('admin.paypalIdPlaceholder', 'PayPal Client ID (Demo)')} 
              value={settings.paypalClientId} 
              onChange={(e) => setSettings({...settings, paypalClientId: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
          )}
          
          {settings.paymentProvider === 'sepa' && (
            <input 
              placeholder={t('admin.sepaIbanPlaceholder', 'SEPA IBAN (Demo)')} 
              value={settings.sepaIban} 
              onChange={(e) => setSettings({...settings, sepaIban: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
          )}
          
          <p className="text-xs text-slate-400">
            {t('admin.paymentNote', 'Hinweis: Echte Zahlungen erfordern ein Backend & sichere Webhooks. Hier nur Simulation.')}
          </p>
        </div>
      </div>

      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h2 className="text-xl font-semibold">{t('admin.noticeDemo', 'Hinweis (Demo)')}</h2>
        <p className="text-sm text-slate-300">
          {t('admin.demoNotice', 'Statuswechsel können simuliert werden (Auto‑Modus oder manuell). Für echte Webhooks bitte Server‑Endpunkte anbinden.')}
        </p>
      </div>
    </section>
  );
}

export default PaymentSettings;