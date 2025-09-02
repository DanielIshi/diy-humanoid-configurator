import { useRef, useState } from 'react';
import { PARTS, GUIDES } from '../../utils/data.js';

function GuidesCompiler({ items }) {
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
      u.lang = "de-DE"; 
      u.rate = 1.02; 
      u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const stop = () => { 
    try { 
      window.speechSynthesis.cancel(); 
    } catch {} 
  };

  return (
    <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
      <h2 className="text-lg font-semibold">Anleitungen zusammenstellen</h2>
      <p className="text-sm text-slate-300 mt-1">
        Erzeugt eine verständliche, kompakte Anleitung aus allen gewählten Komponenten. Optional als Audio.
      </p>
      <div className="mt-3 flex gap-2">
        <button 
          onClick={compile} 
          className="px-3 py-2 text-sm rounded border border-emerald-500/60 hover:bg-emerald-600/10"
        >
          Kompilieren
        </button>
        <button 
          onClick={speak} 
          className="px-3 py-2 text-sm rounded border border-sky-500/60 hover:bg-sky-600/10"
        >
          Als Audio vorlesen
        </button>
        <button 
          onClick={stop} 
          className="px-3 py-2 text-sm rounded border border-slate-500/60 hover:bg-slate-600/10"
        >
          Stopp
        </button>
      </div>
      <textarea 
        className="mt-3 w-full h-40 bg-slate-900 border border-slate-600 rounded p-2 text-sm" 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="Hier erscheint deine kompilierte Anleitung…"
      />
    </div>
  );
}

export default GuidesCompiler;