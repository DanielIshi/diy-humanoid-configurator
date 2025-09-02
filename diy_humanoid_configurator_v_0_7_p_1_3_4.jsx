import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * DIY Humanoid Configurator – v0.7
 *
 * What changed vs v0.6:
 * P1‑3  ✅ Per‑Teil‑Marge UI + Validierung, kalkuliert VK pro Teil & Gesamt.
 *        ✅ UI‑Feinschliff: weniger Abkürzungen prominent, Technik klein/Tooltip.
 *        ✅ Kostenpanel zeigt EK/VK je Position; CSV weiterhin verfügbar.
 *
 * P1‑4  ✅ Bezahlanbindung (Platzhalter): Stripe/PayPal/SEPA Auswahl,
 *        ✅ API‑Key/Model Felder (nur lokal, in localStorage),
 *        ✅ "Checkout" & "Webhook simulieren" (Zahlungseingang → Auto‑Flow).
 *
 * Extra  ✅ Guides‑Compiler: generiert Gesamt‑Anleitung (Text) aus gewählten Teilen,
 *        ✅ Button "Als Audio vorlesen" via Web Speech API (browser‑lokal).
 *        ✅ Produkt‑Berater Chat (LLM‑Stub mit optionaler API zu OpenAI/OpenRouter).
 *        ✅ Kleine Roadmap‑Sektion sichtbar in der App.
 *
 * Hinweise:
 * - Dies ist weiterhin eine reine Frontend‑Demo ohne echten Server.
 * - Externe API‑Aufrufe (LLM/Stripe/PayPal) sind optional & clientseitig; für Produktion bitte über Backend‑Proxy mit sicheren Secrets.
 */

/****************************  Datenbasis  ****************************/
const PARTS = {
  // Aktuatoren
  MG996R: {
    name: "Leichtes Metall‑Servo MG996R",
    unit: "Stk.",
    price: 6.2,
    link: "https://electropeak.com/mg996r-high-torque-digital-servo",
    tech: "MG996R (Metallgetriebe), ca. 9–11 kg·cm @ 6V"
  },
  DS3218: {
    name: "Starkes Servo DS3218 (20 kg)",
    unit: "Stk.",
    price: 12.9,
    link: "https://srituhobby.com/product/ds3218-20kg-metal-gear-servo-motor-waterproof-servo/",
    tech: "DS3218, wasserdicht, bis ~20 kg·cm"
  },

  // Steuerung
  ARD_MEGA: {
    name: "Arduino Mega 2560",
    unit: "Stk.",
    price: 38.0,
    link: "https://www.kubii.com/en/micro-controllers/2075-arduino-mega-2560-rev3-7630049200067.html",
    tech: "ATmega2560, 54 Digital‑I/O, 16 Analogeingänge"
  },
  PCA9685: {
    name: "16‑Kanal Servo‑Treiber (PCA9685)",
    unit: "Stk.",
    price: 13.2,
    link: "https://eu.robotshop.com/products/pca9685-16-channel-12-bit-pwm-servo-driver",
    tech: "PCA9685, 12‑Bit PWM, I²C"
  },
  RPI5: {
    name: "Raspberry Pi 5 (8 GB)",
    unit: "Stk.",
    price: 81.9,
    link: "https://www.welectron.com/Raspberry-Pi-5-8-GB-RAM_1",
    tech: "Broadcom SoC, 8 GB RAM"
  },

  // Sensorik
  MPU6050: {
    name: "IMU MPU‑6050 (Gyro+Accel)",
    unit: "Stk.",
    price: 14.2,
    link: "https://eu.robotshop.com/products/6-dof-gyro-accelerometer-imu-mpu6050",
    tech: "6 DOF, I²C"
  },
  BNO055: {
    name: "IMU BNO055 (9 DOF Fusion)",
    unit: "Stk.",
    price: 36.6,
    link: "https://eu.robotshop.com/products/bno055-9-dof-absolute-orientation-imu-fusion-breakout-board",
    tech: "Sensor‑Fusion, absolute Orientierung"
  },
  OAKDLITE: {
    name: "Luxonis OAK‑D Lite (DepthAI)",
    unit: "Stk.",
    price: 128.1,
    link: "https://eu.mouser.com/ProductDetail/Luxonis/OAK-D-Lite-FF",
    tech: "Stereo‑Depth + AI‑Beschleuniger"
  },

  // Strom / Leistung
  UBEC6A: {
    name: "Leichtgewichtiger Schaltregler (UBEC 5V/6A)",
    unit: "Stk.",
    price: 19.9,
    link: "https://mg-modellbau.de/Akkuweichen-usw/D-Power/D-Power-Antares-6A-UBEC-Regler.html",
    tech: "UBEC 5V/6A, Eingang 2–6S LiPo"
  },
  PSU12V10A: {
    name: "Netzteil 12 V / 10 A (Bench)",
    unit: "Stk.",
    price: 79.0,
    link: "https://www.optics-pro.com/power-supplies/pegasusastro-power-supply-12v-10a-europe-2-1mm/p,60252",
    tech: "~120 W, 2.1 mm Hohlstecker"
  },
  LIPO4S5000: {
    name: "LiPo‑Akku 4S 5000 mAh",
    unit: "Stk.",
    price: 70.0,
    link: "https://gensace.de/collections/4s-lipo-battery",
    tech: "14.8 V nominal, 5 Ah"
  },

  // Sonstiges
  FILAMENT: {
    name: "3D‑Druck‑Filament (1 kg Spule)",
    unit: "Spule",
    price: 20.0,
    link: "https://prusa3d.com/",
    tech: "PLA/PETG je nach Anwendung"
  },
  FASTENERS: {
    name: "Schrauben, Lager & Kleinteile (Set)",
    unit: "Set",
    price: 60.0,
    link: "#",
    tech: "M3/M4, Muttern, Lager, Kleinteile"
  }
};

const PRESETS = {
  starter: {
    label: "Starter – Oberkörper (ca. 12 DOF)",
    items: { MG996R: 12, ARD_MEGA: 1, PCA9685: 1, RPI5: 1, MPU6050: 1, UBEC6A: 1, PSU12V10A: 1, FILAMENT: 3, FASTENERS: 1 },
    notes: "Arme/Hand/Kopf (kein Gehen). Optional: OAK‑D Lite für Vision."
  },
  walker: {
    label: "Walker‑Light – kleiner Biped (ca. 18 DOF)",
    items: { DS3218: 18, ARD_MEGA: 1, PCA9685: 2, RPI5: 1, BNO055: 1, OAKDLITE: 1, UBEC6A: 1, LIPO4S5000: 1, FILAMENT: 5, FASTENERS: 1 },
    notes: "Einfaches Gehen möglich, langsame Gaits; Standzeit & Drehmoment begrenzt."
  },
  inmoov: {
    label: "InMoov‑Scale – großer Oberkörper (30+ DOF)",
    items: { MG996R: 30, DS3218: 2, ARD_MEGA: 1, PCA9685: 2, RPI5: 1, MPU6050: 1, OAKDLITE: 1, UBEC6A: 1, PSU12V10A: 1, FILAMENT: 12, FASTENERS: 1 },
    notes: "Lebensgroßer Oberkörper; Beine sind gesondertes (schwieriges) Projekt."
  }
};

/****************************  Utils  ****************************/
const currency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const sumEK = (items) => Object.entries(items).reduce((s, [k, q]) => s + (PARTS[k].price * q), 0);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const useLocalStorage = (key, initial) => {
  const [v, setV] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

function Tooltip({label}){
  return (
    <span className="inline-flex items-center align-middle ml-1 cursor-help" title={label}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="opacity-60"><circle cx="12" cy="12" r="10" strokeWidth="1.5"/><path d="M12 8v1m0 3v4" strokeWidth="1.5"/></svg>
    </span>
  );
}

/****************************  Roadmap  ****************************/
function RoadmapCard(){
  return (
    <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
      <h3 className="font-semibold">Roadmap</h3>
      <div className="mt-2 text-sm text-slate-300 space-y-1">
        <div className="flex items-start gap-2"><span className="text-emerald-400">✓</span><span>v0.7 Frontend: Per‑Teil‑Marge, Payment‑Platzhalter, Guides, Advisor</span></div>
        <div className="flex items-start gap-2"><span className="text-emerald-400">✓</span><span>CSV‑Export, EK/VK je Position, UX‑Tooltips</span></div>
        <div className="flex items-start gap-2"><span className="text-yellow-300">•</span><span>Backend‑Integration: echte Payments + Webhooks</span></div>
        <div className="flex items-start gap-2"><span className="text-yellow-300">•</span><span>LLM‑Proxy (API‑Keys sicher), Preis‑Scraper</span></div>
        <div className="flex items-start gap-2"><span className="text-slate-400">·</span><span>Recht & Skalierung (MwSt., AGB, DSGVO)</span></div>
      </div>
    </div>
  );
}

/****************************  Guides  ****************************/
const GUIDES = {
  MG996R: "Montage mit M3‑Schrauben; nicht überlasten; ideal für Finger/Handgelenk.",
  DS3218: "Geeignet für Hüft/Schulter leichter Builds; stabile 6 V Versorgung.",
  ARD_MEGA: "Nutze getrennte 5 V Versorgung für Servos; GND verbinden.",
  PCA9685: "I²C‑Adresse prüfen; externe 5–6 V Servostromversorgung anschließen.",
  RPI5: "System kühlen; nutze 64‑Bit OS; I²C aktivieren.",
  MPU6050: "Montage vibrationsarm; Kalibrierung im Code durchführen.",
  BNO055: "Fusion‑Modus wählen; absolute Orientierung möglich.",
  OAKDLITE: "USB3 an RPi5; DepthAI‑Beispiele testen (Objekt/Hand‑Tracking).",
  UBEC6A: "Achtung Polarität; Ausgang 5 V stabil auf Servoschiene einspeisen.",
  PSU12V10A: "Ausreichende Leistung für Bench‑Tests; Überspannung vermeiden.",
  LIPO4S5000: "Nur mit geeigneter Sicherung; Balancer‑Laden; Brandschutz beachten.",
  FILAMENT: "PLA für Prototypen, PETG/ABS für belastete Teile.",
  FASTENERS: "Sortierte Kisten; Loctite bei vibrierenden Baugruppen."
};

function GuidesCompiler({items}){
  const [text, setText] = useState("");
  const synthRef = useRef(null);
  const compile = () => {
    const lines = ["Gesamt‑Anleitung für deine aktuelle Konfiguration:", ""]; 
    Object.entries(items).forEach(([k, q]) => {
      if(!q) return;
      const p = PARTS[k];
      const g = GUIDES[k] || "Siehe Hersteller‑Doku.";
      lines.push(`• ${p.name} (×${q}): ${g}`);
    });
    lines.push("", "Sicherheit: Halte dich an Datenblätter, sichere Stromversorgung und vorsichtigen Erstbetrieb.");
    setText(lines.join("\n"));
  };
  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(text || "Die Anleitung ist leer. Klicke zuerst auf Kompilieren.");
      u.lang = "de-DE"; u.rate = 1.02; u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };
  const stop = () => { try { window.speechSynthesis.cancel(); } catch {} };
  return (
    <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
      <h2 className="text-lg font-semibold">Anleitungen zusammenstellen</h2>
      <p className="text-sm text-slate-300 mt-1">Erzeugt eine verständliche, kompakte Anleitung aus allen gewählten Komponenten. Optional als Audio.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={compile} className="px-3 py-2 text-sm rounded border border-emerald-500/60 hover:bg-emerald-600/10">Kompilieren</button>
        <button onClick={speak} className="px-3 py-2 text-sm rounded border border-sky-500/60 hover:bg-sky-600/10">Als Audio vorlesen</button>
        <button onClick={stop} className="px-3 py-2 text-sm rounded border border-slate-500/60 hover:bg-slate-600/10">Stopp</button>
      </div>
      <textarea className="mt-3 w-full h-40 bg-slate-900 border border-slate-600 rounded p-2 text-sm" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Hier erscheint deine kompilierte Anleitung…"/>
    </div>
  );
}

/****************************  LLM‑Berater  ****************************/
function Advisor({items, settings}){
  const [messages, setMessages] = useLocalStorage("advisor_msgs", [
    {role: "system", content: "Du bist ein hilfreicher Produkt‑Berater für DIY‑Humanoiden. Erkläre verständlich und priorisiere Nutzen."},
    {role: "assistant", content: "Hi! Beschreibe kurz, wofür der Roboter gedacht ist (Greifen? Gehen? Vision?), dann empfehle ich passende Komponenten und Trade‑offs."}
  ]);
  const [input, setInput] = useState("");
  const add = (m) => setMessages((xs)=> [...xs, m]);

  const send = async () => {
    const userMsg = {role: "user", content: input.trim() || "Gib mir eine schnelle Bewertung meiner aktuellen Konfiguration."};
    add(userMsg); setInput("");

    // Fallback: einfache Heuristik lokal, wenn kein API‑Key gesetzt ist
    const noApi = !settings?.provider || !settings?.apiKey;
    if (noApi) {
      const servoCount = (items.MG996R||0) + (items.DS3218||0);
      const heavy = servoCount >= 18;
      const tips = [
        heavy ? "Für Gehversuche achte auf Gewicht: dünnwandig drucken, starke Servos für Hüfte/Knöchel priorisieren." : "Für Oberkörper‑Funktionen reicht die aktuelle Servo‑Wahl meist aus.",
        (items.OAKDLITE?"Vision ist geplant – beachte genügend Rechenleistung (RPi5 ok) und 5V‑Strombudget.":"Ohne Vision kannst du später leicht OAK‑D Lite ergänzen."),
        (items.UBEC6A?"UBEC 5V/6A: plane Stromspitzen ein; ggf. zweite UBEC für Servosplit.":"Füge einen stabilen UBEC 5–6A für Servos hinzu."),
      ];
      add({role:"assistant", content: `Kurze Einschätzung ohne Online‑LLM (kein API‑Key gesetzt):\n- Servos gesamt: ${servoCount}. ${tips[0]}\n- ${tips[1]}\n- ${tips[2]}\nWenn du willst, trage unter Einstellungen deinen Provider & API‑Key ein (OpenAI/OpenRouter), dann antworte ich ausführlicher.`});
      return;
    }

    try {
      const endpoint = settings.provider === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const model = settings.model || (settings.provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey}`,
          ...(settings.provider === "openrouter" ? { "HTTP-Referer": window.location.origin, "X-Title": "DIY Configurator" } : {})
        },
        body: JSON.stringify({
          model,
          messages: [
            {role:"system", content: messages[0]?.content || "Du bist ein hilfreicher Berater."},
            ...messages.filter((m,i)=> i>0),
            {role:"user", content: `${userMsg.content}\n\nBOM: ${JSON.stringify(items)}`}
          ],
          temperature: 0.3
        })
      });
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content || "(Keine Antwort vom LLM erhalten)";
      add({role:"assistant", content});
    } catch (e) {
      add({role:"assistant", content: "Fehler beim LLM‑Aufruf. Prüfe Provider/Key/Netzwerk."});
    }
  };

  return (
    <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
      <h2 className="text-lg font-semibold">Produkt‑Berater (Chat)</h2>
      <div className="mt-3 h-48 overflow-y-auto bg-[#0b1328] border border-slate-700/60 rounded p-2 text-sm space-y-2">
        {messages.filter((_,i)=>i>0).map((m,i)=> (
          <div key={i} className={m.role==="user"?"text-slate-100":"text-emerald-200"}>
            <span className="opacity-70 mr-2">{m.role==="user"?"Du":"Berater"}:</span>{m.content}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Frage oder Ziel hier eingeben…" className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm"/>
        <button onClick={send} className="px-3 py-2 text-sm rounded border border-indigo-500/60 hover:bg-indigo-600/10">Senden</button>
      </div>
      <p className="text-xs text-slate-400 mt-2">Ohne API‑Key nutze ich lokale Heuristiken. Für ausführliche Antworten trage einen Key in den Einstellungen ein.</p>
    </div>
  );
}

/****************************  App  ****************************/
export default function App(){
  const [tab, setTab] = useState('config'); // 'config' | 'admin' | 'advisor'

  // Konfigurator
  const [presetKey, setPresetKey] = useState('starter');
  const [items, setItems] = useState({ ...PRESETS.starter.items });
  const [perMargin, setPerMargin] = useLocalStorage('per_margin', {}); // {PART_KEY: pct}
  const [showPerMargin, setShowPerMargin] = useState(false);

  const setQty = (key, qty)=> setItems(prev=> ({...prev, [key]: Math.max(0, Math.round(qty||0))}));
  const loadPreset = (key)=> { setPresetKey(key); setItems({...PRESETS[key].items}); };

  const ekTotal = useMemo(()=> sumEK(items), [items]);

  // Admin / Orders
  const [marginPct, setMarginPct] = useLocalStorage('global_margin', 12);
  const [orders, setOrders] = useLocalStorage('orders', []); // {id,label,snapshot,baseTotal,retailTotal,status,auto,log:[], provider}
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Zahlungs‑Einstellungen & LLM‑Settings
  const [settings, setSettings] = useLocalStorage('app_settings', {
    paymentProvider: 'stripe',
    stripePublicKey: '', // Demo‑Eingabe
    paypalClientId: '',  // Demo‑Eingabe
    sepaIban: '',
    provider: '',        // 'openai' | 'openrouter'
    apiKey: '',
    model: ''
  });

  const retailForPart = (k) => {
    const base = PARTS[k].price;
    const pct = Number.isFinite(perMargin[k]) ? clamp(perMargin[k], 0, 95) : clamp(marginPct, 0, 95);
    return base * (1 + pct/100);
  };
  const retailTotal = useMemo(()=> Object.entries(items).reduce((s,[k,q])=> s + retailForPart(k)*q, 0), [items, perMargin, marginPct]);

  const createOrderFromCurrent = ()=>{
    const id = `ORD-${Date.now()}`;
    const snapshot = JSON.parse(JSON.stringify(items));
    const baseTotal = sumEK(snapshot);
    const retailTotalNow = Object.entries(snapshot).reduce((s,[k,q])=> s + retailForPart(k)*q, 0);
    const order = { id, label: PRESETS[presetKey].label, snapshot, baseTotal, retailTotal: retailTotalNow, status:'CART', auto:false, log:[], provider: settings.paymentProvider };
    setOrders(o=> [order, ...o]); setSelectedOrderId(id);
    addLog(id, 'Bestellung angelegt. Klicke "Checkout" um zu bezahlen (Demo).');
  };

  const addLog = (id, msg)=> setOrders(list=> list.map(o=> o.id===id? {...o, log:[`${new Date().toLocaleTimeString()} – ${msg}`, ...o.log]}: o));
  const setOrder = (id, patch)=> setOrders(list=> list.map(o=> o.id===id? {...o, ...patch}: o));

  // Simulierter Auto‑Flow nach Zahlung
  useEffect(()=>{
    const timers = [];
    orders.forEach(o=>{
      if(!o.auto) return;
      if(o.status==='PAID'){
        timers.push(setTimeout(()=>{ setOrder(o.id,{status:'PO_CREATED'}); addLog(o.id,'Einkaufsbestellungen (PO) erstellt'); }, 1500));
      }
      if(o.status==='PO_CREATED'){
        timers.push(setTimeout(()=>{ setOrder(o.id,{status:'ORDERED'}); addLog(o.id,'Teile bei Lieferanten bestellt (Drop‑Ship an Kundenadresse)'); }, 2200));
      }
      if(o.status==='ORDERED'){
        timers.push(setTimeout(()=>{ setOrder(o.id,{status:'DONE'}); addLog(o.id,'Versandbestätigungen verarbeitet – abgeschlossen'); }, 2600));
      }
    });
    return ()=> timers.forEach(clearTimeout);
  }, [orders]);

  const checkout = (id)=>{
    const o = orders.find(x=>x.id===id); if(!o) return;
    setOrder(id,{status:'AWAITING_PAYMENT'}); addLog(id, `Checkout gestartet (${settings.paymentProvider.toUpperCase()}) – warte auf Webhook…`);
  };
  const simulateWebhookPaid = (id)=>{ setOrder(id,{status:'PAID'}); addLog(id,'Webhook: Zahlungseingang erkannt'); };

  // CSV Export (unverändert)
  const exportCSV = ()=>{
    const rows = [["Komponente","Menge","Einheit","Einzelpreis EUR","Zwischensumme EUR","VK/Einheit EUR","Link"]];
    Object.entries(items).forEach(([k,qty])=>{ const p=PARTS[k]; rows.push([p.name, String(qty), p.unit, p.price.toFixed(2), (p.price*qty).toFixed(2), retailForPart(k).toFixed(2), p.link]); });
    rows.push(["GESAMT","","","", ekTotal.toFixed(2), retailTotal.toFixed(2),""]);
    const csv = rows.map(r=> r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='humanoid_bom.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1224] to-[#080a16] text-slate-100">
      <header className="max-w-6xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">DIY Humanoid Configurator</h1>
        <p className="text-slate-300 mt-2">Konfigurieren, kalkulieren & verwalten. (v0.7)</p>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm">
          <button onClick={()=>setTab('config')} className={tab==='config'? 'text-emerald-400':'text-slate-300 hover:text-white'}>Konfigurator</button>
          <button onClick={()=>setTab('admin')} className={tab==='admin'? 'text-emerald-400':'text-slate-300 hover:text-white'}>Admin / Bestellungen</button>
          <button onClick={()=>setTab('advisor')} className={tab==='advisor'? 'text-emerald-400':'text-slate-300 hover:text-white'}>Berater & Guides</button>
        </nav>
      </header>

      {tab==='config' && (
        <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Konfigurator */}
          <section className="md:col-span-2 space-y-4">
            <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold mb-3">Komponenten & Mengen</h2>
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={showPerMargin} onChange={(e)=>setShowPerMargin(e.target.checked)}/> Per‑Teil‑Marge</label>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                {Object.entries(PRESETS).map(([k,p])=> (
                  <button key={k} onClick={()=>loadPreset(k)} className={`px-2 py-1 rounded border ${presetKey===k? 'border-emerald-500/70 bg-emerald-600/10':'border-slate-600 hover:bg-slate-700/30'}`}>{p.label}</button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(PARTS).map(([k,p])=> {
                  const q = items[k]||0;
                  return (
                    <div key={k} className="flex items-start justify-between gap-3 border border-slate-700/60 rounded-xl p-3 bg-[#0b1328]">
                      <div className="min-w-0">
                        <div className="font-medium flex items-center flex-wrap gap-x-1">{p.name}{p.tech && <Tooltip label={p.tech}/>}</div>
                        <a href={p.link} target="_blank" className="text-xs text-indigo-300 hover:underline">Produkt/Quelle</a>
                        {showPerMargin && (
                          <div className="mt-2 text-xs text-slate-300 flex items-center gap-1">
                            <span>Per‑Teil‑Marge</span>
                            <input type="number" value={Number.isFinite(perMargin[k])?perMargin[k]:""} onChange={(e)=>{
                              const v = e.target.value === '' ? '' : clamp(Number(e.target.value)||0, 0, 95);
                              setPerMargin((pm)=> ({...pm, [k]: v===''? undefined : v}));
                            }} className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5"/>
                            <span>%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <input type="number" className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1" value={q} onChange={(e)=>setQty(k, Number(e.target.value))} />
                          <span className="text-xs text-slate-400">{p.unit}</span>
                        </div>
                        <div className="text-xs text-slate-400">EK {currency(p.price)} → VK {currency(retailForPart(k))}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bild-/Info-Kacheln */}
            <div className="grid md:grid-cols-2 gap-4">
              <article className="bg-[#0e1630] rounded-2xl p-0 border border-slate-700/60 overflow-hidden">
                <img src="https://inmoov.fr/wp-content/uploads/2015/06/IMG_5291_slider-scaled.jpg" alt="InMoov – 3D‑gedruckte Hand (CC BY‑NC)" className="w-full h-48 object-cover"/>
                <div className="p-4">
                  <h3 className="font-semibold">InMoov (Open Source, 3D‑gedruckt)</h3>
                  <p className="text-sm text-slate-300 mt-1">Lebensgroßer, 3D‑gedruckter Humanoid – Referenzdesign für Oberkörper & Hände. Lizenz: CC BY‑NC.</p>
                  <div className="mt-2 flex gap-3 text-sm">
                    <a href="https://inmoov.fr/" target="_blank" className="text-indigo-300 hover:underline">Website</a>
                    <a href="https://inmoov.fr/project/" target="_blank" className="text-indigo-300 hover:underline">Projekt & STL</a>
                  </div>
                </div>
              </article>

              <article className="bg-[#0e1630] rounded-2xl p-0 border border-slate-700/60 overflow-hidden">
                <div className="h-48 w-full flex items-center justify-center bg-[#0b1328]">
                  <svg width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-500"><path d="M9 18v-6a2 2 0 0 1 2-2h2M9 14h4a2 2 0 0 0 2-2V6" strokeWidth="1.5"/><circle cx="12" cy="12" r="10" strokeWidth="1.5"/></svg>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">igus® Humanoid Open Platform</h3>
                  <p className="text-sm text-slate-300 mt-1">92 cm, voll 3D‑gedruckte Struktur, ROS‑Stack. Paper & Specs verlinkt.</p>
                  <div className="mt-2 flex gap-3 text-sm">
                    <a href="https://www.nimbro.net/OP/" target="_blank" className="text-indigo-300 hover:underline">Projektseite</a>
                    <a href="https://www.ais.uni-bonn.de/papers/KI_2016_Allgeuer.pdf" target="_blank" className="text-indigo-300 hover:underline">Paper (PDF)</a>
                  </div>
                </div>
              </article>
            </div>

            {/* Guides Compiler */}
            <GuidesCompiler items={items} />
          </section>

          {/* Kosten- & Aktionen-Panel */}
          <aside className="space-y-4">
            <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60 shadow-lg">
              <h2 className="text-xl font-semibold">Kostenübersicht</h2>
              <div className="mt-3 divide-y divide-slate-700/60">
                {Object.entries(items).map(([k,qty])=>{
                  const p = PARTS[k];
                  if(!qty) return null;
                  return (
                    <div key={k} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400">{qty} × EK {currency(p.price)} • <a href={p.link} target="_blank" className="text-indigo-300 hover:underline">Link</a></div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{currency(p.price*qty)}</div>
                        <div className="text-xs text-emerald-300">VK {currency(retailForPart(k)*qty)}</div>
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
                <button onClick={exportCSV} className="rounded-xl px-3 py-2 text-sm border border-emerald-500/60 hover:bg-emerald-600/10">BOM als CSV</button>
                <button onClick={createOrderFromCurrent} className="rounded-xl px-3 py-2 text-sm border border-sky-500/60 hover:bg-sky-600/10">Als Bestellung anlegen</button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Exkl. Versand/Tools. Für "Walker‑Light" ggf. Ladegerät & zweite LiPo sinnvoll.</p>
            </div>

            <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
              <h3 className="font-semibold">Einstellungen</h3>
              <div className="mt-2 text-sm space-y-2">
                <div className="flex items-center gap-2"><span>Globale Marge</span>
                  <input type="number" value={marginPct} onChange={(e)=> setMarginPct(clamp(Number(e.target.value)||0, 0, 95))} className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1"/>
                  <span>%</span>
                </div>
                <div className="border-t border-slate-700/60 pt-2">
                  <div className="text-xs text-slate-400 mb-1">LLM‑Provider (optional)</div>
                  <div className="flex gap-2 mb-1">
                    <select value={settings.provider} onChange={(e)=> setSettings({...settings, provider: e.target.value})} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm">
                      <option value="">– kein –</option>
                      <option value="openai">OpenAI</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                    <input placeholder="API‑Key" value={settings.apiKey} onChange={(e)=> setSettings({...settings, apiKey: e.target.value})} className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"/>
                  </div>
                  <input placeholder="Model (z. B. gpt-4o-mini oder openai/gpt-4o-mini)" value={settings.model} onChange={(e)=> setSettings({...settings, model: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm"/>
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
        </main>
      )}

      {tab==='admin' && (
        <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Links: Zahlung/Provider */}
          <section className="space-y-4 lg:col-span-1">
            <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
              <h2 className="text-xl font-semibold">Zahlung & Provider (Demo)</h2>
              <div className="mt-3 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span>Provider</span>
                  <select value={settings.paymentProvider} onChange={(e)=> setSettings({...settings, paymentProvider: e.target.value})} className="bg-slate-900 border border-slate-600 rounded px-2 py-1">
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="sepa">SEPA</option>
                  </select>
                </div>
                {settings.paymentProvider==='stripe' && (
                  <input placeholder="Stripe Publishable Key (Demo)" value={settings.stripePublicKey} onChange={(e)=> setSettings({...settings, stripePublicKey: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"/>
                )}
                {settings.paymentProvider==='paypal' && (
                  <input placeholder="PayPal Client ID (Demo)" value={settings.paypalClientId} onChange={(e)=> setSettings({...settings, paypalClientId: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"/>
                )}
                {settings.paymentProvider==='sepa' && (
                  <input placeholder="SEPA IBAN (Demo)" value={settings.sepaIban} onChange={(e)=> setSettings({...settings, sepaIban: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1"/>
                )}
                <p className="text-xs text-slate-400">Hinweis: Echte Zahlungen erfordern ein Backend & sichere Webhooks. Hier nur Simulation.</p>
              </div>
            </div>

            <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
              <h2 className="text-xl font-semibold">Hinweis (Demo)</h2>
              <p className="text-sm text-slate-300">Statuswechsel können simuliert werden (Auto‑Modus oder manuell). Für echte Webhooks bitte Server‑Endpunkte anbinden.</p>
            </div>
          </section>

          {/* Bestellungen */}
          <section className="lg:col-span-2 space-y-4">
            <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
              <h2 className="text-xl font-semibold mb-2">Bestellungen</h2>
              {orders.length===0 ? (
                <p className="text-slate-400 text-sm">Noch keine Bestellungen. Lege eine über den Konfigurator an.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map(o=> (
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
                          <span className="text-slate-400">Status:</span> <span className="font-medium">{o.status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs flex items-center gap-1">
                            <input type="checkbox" checked={o.auto} onChange={(e)=> setOrder(o.id,{auto:e.target.checked}) }/>
                            Auto‑Modus
                          </label>
                          {o.status==='CART' && <button onClick={()=>checkout(o.id)} className="px-3 py-1.5 text-xs rounded border border-emerald-500/70 hover:bg-emerald-600/10">Checkout</button>}
                          {o.status==='AWAITING_PAYMENT' && <button onClick={()=>simulateWebhookPaid(o.id)} className="px-3 py-1.5 text-xs rounded border border-sky-500/70 hover:bg-sky-600/10">Webhook: paid</button>}
                          <button onClick={()=> setSelectedOrderId(o.id)} className="px-3 py-1.5 text-xs rounded border border-indigo-500/70 hover:bg-indigo-600/10">Log</button>
                        </div>
                      </div>
                      {/* Mini-Items & Retail je Teil */}
                      <details className="mt-3">
                        <summary className="text-sm cursor-pointer text-slate-300">Artikel (Snapshot, EK/VK)</summary>
                        <div className="mt-2 grid md:grid-cols-2 gap-2 text-sm">
                          {Object.entries(o.snapshot).map(([k,qty])=> (
                            <div key={k} className="flex items-center justify-between border border-slate-700/60 rounded-lg px-2 py-1">
                              <span>{PARTS[k].name} × {qty}</span>
                              <span className="text-right text-slate-300">EK {currency(PARTS[k].price*qty)} · VK {currency(retailForPart(k)*qty)}</span>
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
                  <button onClick={()=> setSelectedOrderId(null)} className="px-3 py-1.5 text-xs rounded border border-slate-600 hover:bg-slate-700/40">Schließen</button>
                </div>
                <div className="mt-2 h-48 overflow-y-auto bg-[#0b1328] border border-slate-700/60 rounded-lg p-2 text-xs">
                  {(orders.find(o=>o.id===selectedOrderId)?.log||[]).map((l,i)=> <div key={i} className="text-slate-300">{l}</div>)}
                </div>
              </div>
            )}
          </section>
        </main>
      )}

      {tab==='advisor' && (
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
            <RoadmapCard />
          </aside>
        </main>
      )}

      <footer className="max-w-6xl mx-auto px-6 pb-12 text-xs text-slate-500">
        <p>Bildnachweise: InMoov Hand © Gaël Langevin (CC BY‑NC). Verlinkte Marken/Projekte liegen bei ihren Eigentümern.</p>
      </footer>
    </div>
  );
}
