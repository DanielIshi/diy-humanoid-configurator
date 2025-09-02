import { useContext, useState } from 'react';
import { AdminContext } from '../../contexts/AdminContext';
import { PARTS } from '../../utils/data.js';
import { currency } from '../../utils/helpers.js';

function OrderManagement() {
  const {
    orders,
    setOrder,
    addLog,
    checkout,
    simulateWebhookPaid,
    retailForPart
  } = useContext(AdminContext);

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  return (
    <section className="lg:col-span-2 space-y-4">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h2 className="text-xl font-semibold mb-2">Bestellungen</h2>
        {orders.length === 0 ? (
          <p className="text-slate-400 text-sm">
            Noch keine Bestellungen. Lege eine über den Konfigurator an.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map(o => (
              <div key={o.id} className="p-4 rounded-xl border border-slate-700/60 bg-[#0b1328]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{o.id}</div>
                    <div className="text-xs text-slate-400">{o.label}</div>
                  </div>
                  <div className="text-sm">
                    <div>Einkauf: <span className="text-slate-200">{currency(o.baseTotal)}</span></div>
                    <div>Verkauf: <span className="text-emerald-300">{currency(o.retailTotal)}</span></div>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400">Status:</span> 
                    <span className="font-medium ml-1">{o.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs flex items-center gap-1">
                      <input 
                        type="checkbox" 
                        checked={o.auto} 
                        onChange={(e) => setOrder(o.id, {auto: e.target.checked})} 
                      />
                      Auto‑Modus
                    </label>
                    {o.status === 'CART' && (
                      <button 
                        onClick={() => checkout(o.id)} 
                        className="px-3 py-1.5 text-xs rounded border border-emerald-500/70 hover:bg-emerald-600/10"
                      >
                        Checkout
                      </button>
                    )}
                    {o.status === 'AWAITING_PAYMENT' && (
                      <button 
                        onClick={() => simulateWebhookPaid(o.id)} 
                        className="px-3 py-1.5 text-xs rounded border border-sky-500/70 hover:bg-sky-600/10"
                      >
                        Webhook: paid
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedOrderId(o.id)} 
                      className="px-3 py-1.5 text-xs rounded border border-indigo-500/70 hover:bg-indigo-600/10"
                    >
                      Log
                    </button>
                  </div>
                </div>
                
                {/* Mini-Items & Retail je Teil */}
                <details className="mt-3">
                  <summary className="text-sm cursor-pointer text-slate-300">
                    Artikel (Snapshot, EK/VK)
                  </summary>
                  <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(o.snapshot).map(([k, qty]) => (
                      <div key={k} className="flex items-center justify-between border border-slate-700/60 rounded-lg px-2 py-1">
                        <span>{PARTS[k].name} × {qty}</span>
                        <span className="text-right text-slate-300">
                          EK {currency(PARTS[k].price * qty)} · 
                          VK {currency(retailForPart(k) * qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Modal (inline) */}
      {selectedOrderId && (
        <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Ereignis‑Log – {selectedOrderId}</h3>
            <button 
              onClick={() => setSelectedOrderId(null)} 
              className="px-3 py-1.5 text-xs rounded border border-slate-600 hover:bg-slate-700/40"
            >
              Schließen
            </button>
          </div>
          <div className="mt-2 h-48 overflow-y-auto bg-[#0b1328] border border-slate-700/60 rounded-lg p-2 text-xs">
            {(orders.find(o => o.id === selectedOrderId)?.log || []).map((l, i) => 
              <div key={i} className="text-slate-300">{l}</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default OrderManagement;