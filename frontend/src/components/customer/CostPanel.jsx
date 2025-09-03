import { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfiguratorContext } from '../../contexts/ConfiguratorContext';
import { PARTS, getLocalizedProductName } from '../../utils/data.js';
import { exportCSV, clamp } from '../../utils/helpers.js';
import useCurrency from '../../hooks/useCurrency.js';
import useLivePrices from '../../hooks/useLivePrices.js';
import { calculateVAT, detectCountryByIP, getVATRateDisplay } from '../../utils/tax.js';

function CostPanel() {
  const { t } = useTranslation();
  const { formatCurrencySync, isLoading: currencyLoading } = useCurrency();
  const [showVATBreakdown, setShowVATBreakdown] = useState(false);
  const [customerCountry, setCustomerCountry] = useState('DE');
  const [showNetPrices, setShowNetPrices] = useState(false);
  const {
    items,
    retailTotal,
    retailForPart,
    createOrderFromCurrent,
    marginPct,
    setMarginPct,
    settings,
    setSettings
  } = useContext(ConfiguratorContext);
  
  const { 
    getLivePrice, 
    loading: livePriceLoading, 
    error: livePriceError,
    refresh: refreshLivePrices,
    getTimeSinceUpdate,
    isOnline,
    hasLivePrices 
  } = useLivePrices();

  // Lade Länderinformation beim Component-Mount
  useEffect(() => {
    detectCountryByIP().then(country => {
      setCustomerCountry(country);
    });
  }, []);

  const handleExportCSV = () => {
    exportCSV(items, retailTotal, retailForPart);
  };
  
  // Berechne Retail-Preis mit Live-Preisen (analog zu retailForPart)
  const calculateRetailPrice = (productKey, customPrice = null) => {
    const basePrice = customPrice !== null ? customPrice : PARTS[productKey]?.price || 0;
    // Verwende dieselbe Marge-Logik wie in ConfiguratorContext
    return basePrice * (1 + marginPct / 100);
  };
  
  // Berechne Live-Preise für Gesamtsumme mit MwSt.
  const calculateLiveTotal = () => {
    let liveTotal = 0;
    let hasAnyLivePrices = false;
    
    Object.entries(items).forEach(([productKey, qty]) => {
      if (!qty) return;
      
      const livePrice = getLivePrice(productKey);
      const staticPrice = PARTS[productKey]?.price || 0;
      const price = livePrice !== null ? livePrice : staticPrice;
      
      if (livePrice !== null) {
        hasAnyLivePrices = true;
      }
      
      // Berechne mit Marge
      const retailPrice = calculateRetailPrice(productKey, price);
      liveTotal += retailPrice * qty;
    });
    
    return { total: liveTotal, hasLivePrices: hasAnyLivePrices };
  };

  // Berechne MwSt.-Details für Gesamtsumme
  const calculateTaxDetails = (netTotal) => {
    return calculateVAT(netTotal, customerCountry);
  };
  
  const { total: liveTotal, hasLivePrices: hasAnyItemLivePrices } = calculateLiveTotal();
  const displayTotal = hasAnyItemLivePrices ? liveTotal : retailTotal;
  const totalDifference = hasAnyItemLivePrices ? liveTotal - retailTotal : 0;
  
  // MwSt.-Berechnung für Anzeige
  const taxDetails = calculateTaxDetails(displayTotal);
  const displayPrice = showNetPrices ? taxDetails.net : taxDetails.gross;

  return (
    <aside className="space-y-4">
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60 shadow-lg">
        <h2 className="text-xl font-semibold">{t('sidebar.costOverview')}</h2>
        <div className="mt-3 divide-y divide-slate-700/60">
          {Object.entries(items).map(([k, qty]) => {
            const p = PARTS[k];
            if (!qty) return null;
            
            const livePrice = getLivePrice(k);
            const staticPrice = p.price;
            const displayPrice = livePrice !== null ? livePrice : staticPrice;
            const hasLivePrice = livePrice !== null && isOnline;
            const priceChange = hasLivePrice ? ((livePrice - staticPrice) / staticPrice * 100) : null;
            const timeSinceUpdate = getTimeSinceUpdate(k);
            
            return (
              <div key={k} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm flex items-center gap-2">
                    {getLocalizedProductName(k, t)}
                    {hasLivePrice && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    {qty} × {formatCurrencySync(displayPrice)}
                    {hasLivePrice && priceChange !== null && Math.abs(priceChange) > 0.01 && (
                      <span className={`font-medium ${
                        priceChange > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        ({priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%)
                      </span>
                    )}
                    {timeSinceUpdate && (
                      <span className="text-slate-500">• {timeSinceUpdate}</span>
                    )}
                    • 
                    <a 
                      href={p.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-300 hover:underline"
                    >
                      {t('common.productLink')}
                    </a>
                  </div>
                  {hasLivePrice && Math.abs(livePrice - staticPrice) > 0.01 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {t('sidebar.staticPrice', 'Basis')}: {qty} × {formatCurrencySync(staticPrice)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatCurrencySync(calculateRetailPrice(k, displayPrice) * qty)}
                  </div>
                  {hasLivePrice && Math.abs(livePrice - staticPrice) > 0.01 && (
                    <div className="text-xs text-slate-500">
                      {t('sidebar.staticTotal', 'Basis')}: {formatCurrencySync(retailForPart(k) * qty)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4">
          <div className="p-3 rounded-xl bg-[#0b1328] border border-slate-700/60">
            {/* Live-Preis Header mit Refresh-Button */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-300 text-center flex-1">
                {t('sidebar.totalPrice')}
                {hasAnyItemLivePrices && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-2">
                    LIVE
                  </span>
                )}
              </div>
              <button 
                onClick={refreshLivePrices}
                disabled={livePriceLoading}
                className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                title={t('sidebar.refreshPrices', 'Preise aktualisieren')}
              >
                <svg 
                  className={`w-4 h-4 text-slate-400 ${livePriceLoading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                hasAnyItemLivePrices ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {currencyLoading || livePriceLoading ? '...' : formatCurrencySync(displayPrice)}
              </div>
              
              {/* MwSt.-Info unter Hauptpreis */}
              <div className="text-xs text-slate-400 mt-1">
                {showNetPrices ? (
                  <span>
                    {t('sidebar.netPrice', 'Nettopreis')} • 
                    <span className="text-slate-500">
                      {t('sidebar.plusVAT', 'zzgl.')} {getVATRateDisplay(customerCountry)} MwSt.
                    </span>
                    <br />
                    <span className="text-slate-500">
                      {t('sidebar.grossPrice', 'Brutto')}: {formatCurrencySync(taxDetails.gross)}
                    </span>
                  </span>
                ) : (
                  <span>
                    {t('sidebar.grossPrice', 'Bruttopreis inkl.')} {getVATRateDisplay(customerCountry)} MwSt.
                    <br />
                    <span className="text-slate-500">
                      {t('sidebar.netPrice', 'Netto')}: {formatCurrencySync(taxDetails.net)} • MwSt: {formatCurrencySync(taxDetails.vat)}
                    </span>
                  </span>
                )}
              </div>
              
              {/* Differenz anzeigen */}
              {hasAnyItemLivePrices && Math.abs(totalDifference) > 0.01 && (
                <div className={`text-sm font-medium mt-1 ${
                  totalDifference > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {totalDifference > 0 ? '+' : ''}{formatCurrencySync(totalDifference)}
                  <span className="text-xs text-slate-400 ml-1">
                    ({((totalDifference / retailTotal) * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
              
              {/* Basis-Preis bei Live-Preisen */}
              {hasAnyItemLivePrices && (
                <div className="text-xs text-slate-500 mt-1">
                  {t('sidebar.staticTotal', 'Basis')}: {formatCurrencySync(retailTotal)}
                </div>
              )}
              
              <div className="text-xs text-slate-400 mt-2">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <button
                    onClick={() => setShowNetPrices(!showNetPrices)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {showNetPrices ? t('sidebar.showGross', 'Brutto anzeigen') : t('sidebar.showNet', 'Netto anzeigen')}
                  </button>
                  
                  <button
                    onClick={() => setShowVATBreakdown(!showVATBreakdown)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-600 hover:bg-slate-700 transition-colors"
                  >
                    {showVATBreakdown ? t('sidebar.hideVATDetails', 'MwSt. ausblenden') : t('sidebar.showVATDetails', 'MwSt. Details')}
                  </button>
                </div>
                
                {/* MwSt.-Aufschlüsselung */}
                {showVATBreakdown && (
                  <div className="bg-slate-800/50 rounded-lg p-3 text-left space-y-1 mb-2">
                    <div className="flex justify-between text-xs">
                      <span>{t('sidebar.country', 'Land')}:</span>
                      <select 
                        value={customerCountry} 
                        onChange={(e) => setCustomerCountry(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-1 text-xs"
                      >
                        <option value="DE">Deutschland</option>
                        <option value="AT">Österreich</option>
                        <option value="NL">Niederlande</option>
                        <option value="FR">Frankreich</option>
                        <option value="GB">Großbritannien</option>
                      </select>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>{t('sidebar.netAmount', 'Nettobetrag')}:</span>
                      <span>{formatCurrencySync(taxDetails.net)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>MwSt. ({getVATRateDisplay(customerCountry)}):</span>
                      <span>{formatCurrencySync(taxDetails.vat)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold border-t border-slate-600 pt-1">
                      <span>{t('sidebar.totalGross', 'Gesamtbetrag')}:</span>
                      <span>{formatCurrencySync(taxDetails.gross)}</span>
                    </div>
                  </div>
                )}
                
                {t('sidebar.currencyNote')}
                {!isOnline && (
                  <span className="block text-orange-400 mt-1">
                    {t('sidebar.offlineMode', 'Offline - verwende gespeicherte Preise')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-3 flex gap-2">
          <button 
            onClick={handleExportCSV} 
            className="rounded-xl px-3 py-2 text-sm border border-emerald-500/60 hover:bg-emerald-600/10"
          >
            {t('sidebar.exportBOM')}
          </button>
          <button 
            onClick={createOrderFromCurrent} 
            className="rounded-xl px-3 py-2 text-sm border border-sky-500/60 hover:bg-sky-600/10"
          >
            {t('sidebar.createOrder')}
          </button>
        </div>
        <div className="text-xs text-slate-400 mt-2 space-y-1">
          <p>{t('sidebar.excludesShipping')}</p>
          <p className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {t('sidebar.taxNote', 'Preise gelten für')} {customerCountry}
          </p>
        </div>
      </div>

      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h3 className="font-semibold">{t('sidebar.settings')}</h3>
        <div className="mt-2 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span>{t('sidebar.globalMargin')}</span>
            <input 
              type="number" 
              value={marginPct} 
              onChange={(e) => setMarginPct(clamp(Number(e.target.value)||0, 0, 95))} 
              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1"
            />
            <span>%</span>
          </div>
          
          <div className="border-t border-slate-700/60 pt-2">
            <div className="text-xs text-slate-400 mb-1">{t('sidebar.llmProvider')}</div>
            <div className="flex gap-2 mb-1">
              <select 
                value={settings.provider} 
                onChange={(e) => setSettings({...settings, provider: e.target.value})} 
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
              >
                <option value="">{t('sidebar.noProvider')}</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <input 
                placeholder={t('sidebar.apiKey')} 
                value={settings.apiKey} 
                onChange={(e) => setSettings({...settings, apiKey: e.target.value})} 
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
              />
            </div>
            <input 
              placeholder={t('sidebar.modelPlaceholder')} 
              value={settings.model} 
              onChange={(e) => setSettings({...settings, model: e.target.value})} 
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <h3 className="font-semibold">{t('sidebar.roadmapShort')}</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li>✅ P0: Marge & Ops‑Simulation</li>
          <li>✅ P1‑3: Per‑Teil‑Marge & Validierung</li>
          <li>✅ P1‑4: Payment‑Platzhalter & Webhook‑Simulation</li>
          <li>✅ P1‑5: Multi‑Currency & i18n (EK/VK Entfernung)</li>
          <li>✅ P1‑6: Währungsumrechnung & Exchange‑Rate‑API</li>
          <li>✅ P2‑7: LLM‑Advisor an echte API (Server‑Proxy, Ratelimits)</li>
          <li>✅ P2‑8: Live‑Preis‑Scraper (Händler‑Fallbacks)</li>
          <li>✅ P2‑6: Recht/Steuern (MwSt., DSGVO, AGB)</li>
        </ul>
      </div>
    </aside>
  );
}

export default CostPanel;