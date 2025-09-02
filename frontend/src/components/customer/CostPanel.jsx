import { useContext } from 'react';
import { ConfiguratorContext } from '../../contexts/ConfiguratorContext';
import { PARTS } from '../../utils/data.js';
import { currency, exportCSV, clamp } from '../../utils/helpers.js';

function CostPanel() {
  const {
    items,
    ekTotal,
    retailTotal,
    retailForPart,
    createOrderFromCurrent,
    marginPct,
    setMarginPct,
    settings,
    setSettings
  } = useContext(ConfiguratorContext);

  const handleExportCSV = () => {
    exportCSV(items, retailTotal, ekTotal, retailForPart);
  };

  return (
    <aside className="space-y-4">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60 shadow-lg">
        <h2 className="text-xl font-semibold">Kostenübersicht</h2>
        <div className="mt-3 divide-y divide-slate-700/60">
          {Object.entries(items).map(([k, qty]) => {
            const p = PARTS[k];
            if (!qty) return null;
            return (
              <div key={k} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {qty} × EK {currency(p.price)} • 
                    <a 
                      href={p.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-300 hover:underline ml-1"
                    >
                      Link
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currency(p.price * qty)}</div>
                  <div className="text-xs text-emerald-300">VK {currency(retailForPart(k) * qty)}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-[#0b1328] border border-slate-700/60">
            <div className="text-slate-300">GESAMT EK</div>
            <div className="text-xl font-bold">{currency(ekTotal)}</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1328] border border-slate-700/60">
            <div className="text-slate-300">GESAMT VK</div>
            <div className="text-xl font-bold text-emerald-400">{currency(retailTotal)}</div>
          </div>
        </div>
        
        <div className="mt-3 flex gap-2">
          <button 
            onClick={handleExportCSV} 
            className="rounded-xl px-3 py-2 text-sm border border-emerald-500/60 hover:bg-emerald-600/10"
          >
            BOM als CSV
          </button>
          <button 
            onClick={createOrderFromCurrent} 
            className="rounded-xl px-3 py-2 text-sm border border-sky-500/60 hover:bg-sky-600/10"
          >
            Als Bestellung anlegen
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Exkl. Versand/Tools. Für "Walker‑Light" ggf. Ladegerät & zweite LiPo sinnvoll.
        </p>
      </div>

      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h3 className="font-semibold">Einstellungen</h3>
        <div className="mt-2 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span>Globale Marge</span>
            <input 
              type="number" 
              value={marginPct} 
              onChange={(e) => setMarginPct(clamp(Number(e.target.value)||0, 0, 95))} 
              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
            <span>%</span>
          </div>
          
          <div className="border-t border-slate-700/60 pt-2">
            <div className="text-xs text-slate-400 mb-1">LLM‑Provider (optional)</div>
            <div className="flex gap-2 mb-1">
              <select 
                value={settings.provider} 
                onChange={(e) => setSettings({...settings, provider: e.target.value})} 
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
              >
                <option value="">– kein –</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <input 
                placeholder="API‑Key" 
                value={settings.apiKey} 
                onChange={(e) => setSettings({...settings, apiKey: e.target.value})} 
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
              />
            </div>
            <input 
              placeholder="Model (z. B. gpt-4o-mini oder openai/gpt-4o-mini)" 
              value={settings.model} 
              onChange={(e) => setSettings({...settings, model: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h3 className="font-semibold">Roadmap (kurz)</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>✅ P0: Marge & Ops‑Simulation</li>
          <li>✅ P1‑3: Per‑Teil‑Marge & Validierung</li>
          <li>✅ P1‑4: Payment‑Platzhalter & Webhook‑Simulation</li>
          <li>⬜ P2‑7: LLM‑Advisor an echte API (Server‑Proxy, Ratelimits)</li>
          <li>⬜ P2‑8: Live‑Preis‑Scraper (Händler‑Fallbacks)</li>
          <li>⬜ P2‑6: Recht/Steuern (MwSt., DSGVO, AGB)</li>
        </ul>
      </div>
    </aside>
  );
}

export default CostPanel;