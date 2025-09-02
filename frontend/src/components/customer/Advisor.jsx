import { useState } from 'react';
import { useLocalStorage } from '../../utils/helpers.js';

function Advisor({ items, settings }) {
  const [messages, setMessages] = useLocalStorage("advisor_msgs", [
    {role: "system", content: "Du bist ein hilfreicher Produkt‑Berater für DIY‑Humanoiden. Erkläre verständlich und priorisiere Nutzen."},
    {role: "assistant", content: "Hi! Beschreibe kurz, wofür der Roboter gedacht ist (Greifen? Gehen? Vision?), dann empfehle ich passende Komponenten und Trade‑offs."}
  ]);
  const [input, setInput] = useState("");

  const add = (m) => setMessages((xs) => [...xs, m]);

  const send = async () => {
    const userMsg = {role: "user", content: input.trim() || "Gib mir eine schnelle Bewertung meiner aktuellen Konfiguration."};
    add(userMsg); 
    setInput("");

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
            ...messages.filter((m,i) => i>0),
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
        {messages.filter((_,i) => i>0).map((m,i) => (
          <div key={i} className={m.role==="user"?"text-slate-100":"text-emerald-200"}>
            <span className="opacity-70 mr-2">{m.role==="user"?"Du":"Berater"}:</span>
            {m.content}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Frage oder Ziel hier eingeben…" 
          className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm"
          onKeyPress={(e) => e.key === 'Enter' && send()}
        />
        <button 
          onClick={send} 
          className="px-3 py-2 text-sm rounded border border-indigo-500/60 hover:bg-indigo-600/10"
        >
          Senden
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Ohne API‑Key nutze ich lokale Heuristiken. Für ausführliche Antworten trage einen Key in den Einstellungen ein.
      </p>
    </div>
  );
}

export default Advisor;