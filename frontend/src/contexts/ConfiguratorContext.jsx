import { createContext, useMemo, useState, useEffect } from 'react';
import { PRESETS, PARTS } from '../utils/data.js';
import { useLocalStorage, sumEK, clamp } from '../utils/helpers.js';

export const ConfiguratorContext = createContext();

export function ConfiguratorProvider({ children }) {
  // Konfigurator State
  const [presetKey, setPresetKey] = useState('starter');
  const [items, setItems] = useState({ ...PRESETS.starter.items });
  const [perMargin, setPerMargin] = useLocalStorage('per_margin', {}); // {PART_KEY: pct}
  const [showPerMargin, setShowPerMargin] = useState(false);

  // Admin / Orders
  const [marginPct, setMarginPct] = useLocalStorage('global_margin', 12);
  const [orders, setOrders] = useLocalStorage('orders', []); // {id,label,snapshot,baseTotal,retailTotal,status,auto,log:[], provider}

  // LLM-Settings
  const [settings, setSettings] = useLocalStorage('app_settings', {
    paymentProvider: 'stripe',
    stripePublicKey: '',
    paypalClientId: '',
    sepaIban: '',
    provider: '',
    apiKey: '',
    model: ''
  });

  const ekTotal = useMemo(() => sumEK(items), [items]);

  const retailForPart = (k) => {
    const base = PARTS[k].price;
    const pct = Number.isFinite(perMargin[k]) ? clamp(perMargin[k], 0, 95) : clamp(marginPct, 0, 95);
    return base * (1 + pct/100);
  };

  const retailTotal = useMemo(() => 
    Object.entries(items).reduce((s,[k,q]) => s + retailForPart(k)*q, 0), 
    [items, perMargin, marginPct]
  );

  const createOrderFromCurrent = () => {
    const id = `ORD-${Date.now()}`;
    const snapshot = JSON.parse(JSON.stringify(items));
    const baseTotal = sumEK(snapshot);
    const retailTotalNow = Object.entries(snapshot).reduce((s,[k,q]) => s + retailForPart(k)*q, 0);
    const order = { 
      id, 
      label: PRESETS[presetKey].label, 
      snapshot, 
      baseTotal, 
      retailTotal: retailTotalNow, 
      status: 'CART', 
      auto: false, 
      log: [], 
      provider: settings.paymentProvider 
    };
    setOrders(o => [order, ...o]);
    addLog(id, 'Bestellung angelegt. Klicke "Checkout" um zu bezahlen (Demo).');
  };

  const addLog = (id, msg) => setOrders(list => 
    list.map(o => o.id === id ? {...o, log: [`${new Date().toLocaleTimeString()} – ${msg}`, ...o.log]} : o)
  );

  const setOrder = (id, patch) => setOrders(list => 
    list.map(o => o.id === id ? {...o, ...patch} : o)
  );

  // Simulierter Auto‑Flow nach Zahlung
  useEffect(() => {
    const timers = [];
    orders.forEach(o => {
      if(!o.auto) return;
      if(o.status === 'PAID'){
        timers.push(setTimeout(() => { 
          setOrder(o.id, {status: 'PO_CREATED'}); 
          addLog(o.id, 'Einkaufsbestellungen (PO) erstellt'); 
        }, 1500));
      }
      if(o.status === 'PO_CREATED'){
        timers.push(setTimeout(() => { 
          setOrder(o.id, {status: 'ORDERED'}); 
          addLog(o.id, 'Teile bei Lieferanten bestellt (Drop‑Ship an Kundenadresse)'); 
        }, 2200));
      }
      if(o.status === 'ORDERED'){
        timers.push(setTimeout(() => { 
          setOrder(o.id, {status: 'DONE'}); 
          addLog(o.id, 'Versandbestätigungen verarbeitet – abgeschlossen'); 
        }, 2600));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [orders]);

  const checkout = (id) => {
    const o = orders.find(x => x.id === id); 
    if(!o) return;
    setOrder(id, {status: 'AWAITING_PAYMENT'}); 
    addLog(id, `Checkout gestartet (${settings.paymentProvider.toUpperCase()}) – warte auf Webhook…`);
  };

  const simulateWebhookPaid = (id) => { 
    setOrder(id, {status: 'PAID'}); 
    addLog(id, 'Webhook: Zahlungseingang erkannt'); 
  };

  const value = {
    // Configurator
    presetKey, setPresetKey,
    items, setItems,
    perMargin, setPerMargin,
    showPerMargin, setShowPerMargin,
    ekTotal,
    retailTotal,
    retailForPart,
    
    // Admin
    marginPct, setMarginPct,
    orders, setOrders,
    createOrderFromCurrent,
    addLog,
    setOrder,
    checkout,
    simulateWebhookPaid,
    
    // Settings
    settings, setSettings
  };

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

