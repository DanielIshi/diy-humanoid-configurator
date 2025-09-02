import { useContext } from 'react';
import { ConfiguratorContext } from '../../contexts/ConfiguratorContext';
import { PRESETS } from '../../utils/data.js';
import Advisor from '../../components/customer/Advisor';
import GuidesCompiler from '../../components/customer/GuidesCompiler';

function AdvisorPage() {
  const { items, settings, presetKey } = useContext(ConfiguratorContext);

  return (
    <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
      <section className="md:col-span-2 space-y-4">
        <Advisor items={items} settings={settings} />
        <GuidesCompiler items={items} />
      </section>
      
      <aside className="space-y-4">
        <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
          <h3 className="font-semibold">Preset‑Notizen</h3>
          <p className="text-sm text-slate-300 mt-2">{PRESETS[presetKey].notes}</p>
          <div className="mt-3 text-xs text-slate-400 leading-relaxed">
            <p>⚠️ Günstige Servos begrenzen Gangdynamik & Lebensdauer. Für robustes Gehen sind leichte Strukturen, Cycloid‑Getriebe oder BLDC‑Aktuatoren vorzuziehen.</p>
            <p className="mt-2">💡 Tipp: Starte mit Oberkörper‑Funktionen (Greifen, Vision, Sprache) und iteriere zu Hüfte/Beinen.</p>
          </div>
        </div>
        
        <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
          <h3 className="font-semibold">Roadmap</h3>
          <div className="mt-2 text-sm text-slate-300 space-y-1">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>v0.7 Frontend: Per‑Teil‑Marge, Payment‑Platzhalter, Guides, Advisor</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>CSV‑Export, EK/VK je Position, UX‑Tooltips</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-300">•</span>
              <span>Backend‑Integration: echte Payments + Webhooks</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-300">•</span>
              <span>LLM‑Proxy (API‑Keys sicher), Preis‑Scraper</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-slate-400">·</span>
              <span>Recht & Skalierung (MwSt., AGB, DSGVO)</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default AdvisorPage;