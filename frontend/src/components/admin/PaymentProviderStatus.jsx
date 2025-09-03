import { useEffect, useState } from 'react';
import { paymentAPI } from '../../utils/api';

function StatusPill({ ok, label }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${ok ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
      <span className={`w-2 h-2 mr-1 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
      {label}
    </span>
  );
}

export default function PaymentProviderStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [methods, setMethods] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [statusRes, methodsRes] = await Promise.all([
          paymentAPI.getProviderStatus(),
          paymentAPI.getPaymentMethods(),
        ]);
        setStatus(statusRes.data || statusRes);
        setMethods(methodsRes.data?.methods || methodsRes.methods || []);
      } catch (e) {
        setError(e.message || 'Failed to load payment status');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <section className="space-y-4 lg:col-span-1">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h2 className="text-xl font-semibold">Payment Provider Status</h2>
        {loading ? (
          <p className="text-sm text-slate-400 mt-2">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-300 mt-2">{error}</p>
        ) : (
          <div className="mt-3 text-sm space-y-3">
            <div>
              <h3 className="font-medium mb-1">Stripe</h3>
              <div className="flex gap-2 flex-wrap">
                <StatusPill ok={!!status?.stripe?.enabled} label={`Enabled: ${!!status?.stripe?.enabled}`}/>
                <StatusPill ok={!!status?.stripe?.configured} label={`Configured: ${!!status?.stripe?.configured}`}/>
                <StatusPill ok={!!status?.stripe?.webhookConfigured} label={`Webhook: ${!!status?.stripe?.webhookConfigured}`}/>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-1">PayPal</h3>
              <div className="flex gap-2 flex-wrap">
                <StatusPill ok={!!status?.paypal?.enabled} label={`Enabled: ${!!status?.paypal?.enabled}`}/>
                <StatusPill ok={!!status?.paypal?.configured} label={`Configured: ${!!status?.paypal?.configured}`}/>
                <StatusPill ok={!!status?.paypal?.webhookConfigured} label={`Webhook: ${!!status?.paypal?.webhookConfigured}`}/>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-1">Available Methods</h3>
              {methods.length === 0 ? (
                <p className="text-slate-400">No methods enabled</p>
              ) : (
                <ul className="list-disc list-inside text-slate-300">
                  {methods.map((m) => (
                    <li key={m.id}>{m.name} — {m.enabled ? 'enabled' : 'disabled'}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

