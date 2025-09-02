import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfiguratorContext } from '../../contexts/ConfiguratorContext';
import { 
  PARTS, 
  PRESETS, 
  getLocalizedProductName,
  getLocalizedProductDescription,
  getLocalizedPresetLabel,
  getLocalizedUnit,
  getProductsByCategory,
  getLocalizedCategoryName
} from '../../utils/data.js';
import { clamp, currency } from '../../utils/helpers.js';
import Tooltip from '../shared/Tooltip';

function Configurator() {
  const { t } = useTranslation('products');
  const {
    presetKey, setPresetKey,
    items, setItems,
    perMargin, setPerMargin,
    showPerMargin, setShowPerMargin,
    marginPct,
    retailForPart
  } = useContext(ConfiguratorContext);

  const setQty = (key, qty) => setItems(prev => ({...prev, [key]: Math.max(0, Math.round(qty||0))}));
  
  const loadPreset = (key) => { 
    setPresetKey(key); 
    setItems({...PRESETS[key].items}); 
  };

  return (
    <section className="md:col-span-2 space-y-4">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-3">Komponenten & Mengen</h2>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input 
                type="checkbox" 
                checked={showPerMargin} 
                onChange={(e) => setShowPerMargin(e.target.checked)}
              />
              Per‑Teil‑Marge
            </label>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 text-xs mb-3">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button 
              key={k} 
              onClick={() => loadPreset(k)} 
              className={`px-2 py-1 rounded border ${
                presetKey === k 
                  ? 'border-emerald-500/70 bg-emerald-600/10'
                  : 'border-slate-600 hover:bg-slate-700/30'
              }`}
            >
              {getLocalizedPresetLabel(k, t)}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(PARTS).map(([k, p]) => {
            const q = items[k] || 0;
            return (
              <div key={k} className="flex items-start justify-between gap-3 border border-slate-700/60 rounded-xl p-3 bg-[#0b1328]">
                <div className="min-w-0">
                  <div className="font-medium flex items-center flex-wrap gap-x-1">
                    {getLocalizedProductName(k, t)}
                    {p.tech && <Tooltip label={p.tech}/>}
                  </div>
                  {getLocalizedProductDescription(k, t) && (
                    <div className="text-xs text-slate-400 mt-1">
                      {getLocalizedProductDescription(k, t)}
                    </div>
                  )}
                  <a 
                    href={p.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-300 hover:underline"
                  >
                    Produkt/Quelle
                  </a>
                  {showPerMargin && (
                    <div className="mt-2 text-xs text-slate-300 flex items-center gap-1">
                      <span>Per‑Teil‑Marge</span>
                      <input 
                        type="number" 
                        value={Number.isFinite(perMargin[k]) ? perMargin[k] : ""} 
                        onChange={(e) => {
                          const v = e.target.value === '' ? '' : clamp(Number(e.target.value)||0, 0, 95);
                          setPerMargin((pm) => ({...pm, [k]: v === '' ? undefined : v}));
                        }} 
                        className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5"
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1" 
                      value={q} 
                      onChange={(e) => setQty(k, Number(e.target.value))} 
                    />
                    <span className="text-xs text-slate-400">{getLocalizedUnit(p.unit, t)}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    EK {currency(p.price)} → VK {currency(retailForPart(k))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bild-/Info-Kacheln */}
      <div className="grid md:grid-cols-2 gap-4">
        <article className="bg-[#0e1630] rounded-2xl p-0 border border-slate-700/60 overflow-hidden">
          <img 
            src="https://inmoov.fr/wp-content/uploads/2015/06/IMG_5291_slider-scaled.jpg" 
            alt="InMoov – 3D‑gedruckte Hand (CC BY‑NC)" 
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="font-semibold">InMoov (Open Source, 3D‑gedruckt)</h3>
            <p className="text-sm text-slate-300 mt-1">
              Lebensgroßer, 3D‑gedruckter Humanoid – Referenzdesign für Oberkörper & Hände. Lizenz: CC BY‑NC.
            </p>
            <div className="mt-2 flex gap-3 text-sm">
              <a href="https://inmoov.fr/" target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">Website</a>
              <a href="https://inmoov.fr/project/" target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">Projekt & STL</a>
            </div>
          </div>
        </article>

        <article className="bg-[#0e1630] rounded-2xl p-0 border border-slate-700/60 overflow-hidden">
          <div className="h-48 w-full flex items-center justify-center bg-[#0b1328]">
            <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-500">
              <path d="M9 18v-6a2 2 0 0 1 2-2h2M9 14h4a2 2 0 0 0 2-2V6" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="p-4">
            <h3 className="font-semibold">igus® Humanoid Open Platform</h3>
            <p className="text-sm text-slate-300 mt-1">
              92 cm, voll 3D‑gedruckte Struktur, ROS‑Stack. Paper & Specs verlinkt.
            </p>
            <div className="mt-2 flex gap-3 text-sm">
              <a href="https://www.nimbro.net/OP/" target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">Projektseite</a>
              <a href="https://www.ais.uni-bonn.de/papers/KI_2016_Allgeuer.pdf" target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">Paper (PDF)</a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default Configurator;