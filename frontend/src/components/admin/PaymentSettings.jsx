import { useContext } from 'react';
import { AdminContext } from '../../contexts/AdminContext';

function PaymentSettings() {
  const { settings, setSettings } = useContext(AdminContext);

  return (
    <section className="space-y-4 lg:col-span-1">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h2 className="text-xl font-semibold">Zahlung & Provider (Demo)</h2>
        <div className="mt-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span>Provider</span>
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
              placeholder="Stripe Publishable Key (Demo)" 
              value={settings.stripePublicKey} 
              onChange={(e) => setSettings({...settings, stripePublicKey: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
          )}
          
          {settings.paymentProvider === 'paypal' && (
            <input 
              placeholder="PayPal Client ID (Demo)" 
              value={settings.paypalClientId} 
              onChange={(e) => setSettings({...settings, paypalClientId: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
          )}
          
          {settings.paymentProvider === 'sepa' && (
            <input 
              placeholder="SEPA IBAN (Demo)" 
              value={settings.sepaIban} 
              onChange={(e) => setSettings({...settings, sepaIban: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
          )}
          
          <p className="text-xs text-slate-400">
            Hinweis: Echte Zahlungen erfordern ein Backend & sichere Webhooks. Hier nur Simulation.
          </p>
        </div>
      </div>

      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h2 className="text-xl font-semibold">Hinweis (Demo)</h2>
        <p className="text-sm text-slate-300">
          Statuswechsel können simuliert werden (Auto‑Modus oder manuell). 
          Für echte Webhooks bitte Server‑Endpunkte anbinden.
        </p>
      </div>
    </section>
  );
}

export default PaymentSettings;