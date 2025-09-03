# Entwicklungs- und Projektplan -- DIY Humanoid Configurator

## Vision & Zielsetzung

Ein interaktiver DIY-Humanoid-Konfigurator, der es ermöglicht: -
Komponenten (Servos, Steuerungen, Sensoren, Stromversorgung)
auszuwählen. - Kosten (EK/VK, Marge) automatisch zu kalkulieren. -
Bestellungen und Zahlungen zu simulieren und später real umzusetzen. -
Automatisch Anleitungen (Text + Audio) zu generieren. - Einen
KI-Produktberater (LLM) einzubinden. - Langfristig: Live-Preis-Scraper,
Lieferantenintegration, rechtssicheren Betrieb, Community/Marktplatz.

------------------------------------------------------------------------

## Phasenplan

### Phase 0 (abgeschlossen -- v0.3)

-   Globale Marge, CSV-Export Verkaufspreise ✅
-   Admin/Ops-Simulation inkl. Auto-Flow + Sound ✅
-   Roadmap-Panel ✅

### Phase 1 (Frontend-Features -- v0.7)

-   **P1-3**: Per-Teil-Marge UI + Validierung ✅
-   **P1-4**: Payment-Platzhalter (Stripe/PayPal/SEPA),
    Webhook-Simulation ✅
-   **Guides-Compiler**: generiert Gesamtanleitung, Vorlesen via Web
    Speech API ✅
-   **LLM-Advisor (Stub)**: Berater-Chat, API-Key optional, lokale
    Heuristik ✅
-   **UX-Feinschliff**: weniger Abkürzungen, technische Details als
    Tooltip ✅

### Phase 2 (Backend-Anbindung)

-   Payment-Integration mit echtem Backend (Stripe, PayPal, SEPA).
-   Sichere Webhooks → triggern Auto-Flow.
-   LLM-Advisor über Backend-Proxy (API-Keys sicher).
-   Preis-Scraper: Live-Preise von Händlern (Fallbacks bei
    Out-of-Stock).
-   Lieferanten-APIs (Reichelt, Conrad, Welectron, Robotshop EU).
-   Drop-Shipping: Versand direkt an Endkunde.

### Phase 3 (Recht & Skalierung)

-   Steuer-Handling (MwSt., Nettopreise, Bruttoanzeige).
-   Rechtliches: Widerruf, AGB, Gewährleistung, DSGVO, Impressum.
-   User-Accounts: Login, gespeicherte Konfigurationen.
-   Order-Management-UI: Bestellstatus, Rechnungen, Export PDF/CSV.

### Phase 4 (Langfristige Ideen)

-   **Community/Marktplatz**: User können Konfigurationen
    teilen/verkaufen.
-   **AI-Coach**: Berater erstellt automatisch sinnvolle
    Konfigurationen.
-   **3D-Visualisierung**: Virtuelle Baugruppen-Ansicht.
-   **Roboter-Simulation**: Animation der gewählten DOFs im Browser.
-   **Tesla-Chat-Ideen**: Darstellung der Technik weniger kryptisch,
    verständlich für Laien; AI generiert verständliche Bauanleitungen
    (nicht nur Specs).

------------------------------------------------------------------------

## Technologie-Stack

-   **Frontend**: React (Vite, Tailwind, shadcn/ui).
-   **Backend (Phase 2+)**: Node.js (Express) oder Python (FastAPI).
-   **DB**: PostgreSQL (z. B. Supabase) für Orders, Users, Logs.
-   **Auth**: Supabase Auth oder NextAuth (JWT-basiert).
-   **Payment**: Stripe, PayPal SDKs.
-   **LLM**: OpenAI oder OpenRouter (Proxy im Backend).
-   **Scraper**: Puppeteer oder API-Fetch, ggf. über Worker-Queue.
-   **Deployment**: Vercel/Netlify (Frontend), Fly.io/Render/Railway
    (Backend).

------------------------------------------------------------------------

## Entwicklungs-Features im Detail

### Benutzeroberfläche

-   Konfigurator mit Presets (Starter, Walker, InMoov).
-   Tooltip-Details statt technischer Überladung.
-   Roadmap-Kasten sichtbar in-App.
-   CSV-Export (inkl. EK/VK).
-   Guides-Compiler (Text + Audio).

### Backend (ab Phase 2)

-   Bestellungen als Objekte in DB.
-   Payment-Flows mit Webhooks → Statusupdate Orders.
-   LLM-Proxy → zentrale API → schützt Keys, Logging, Ratelimit.
-   Scraper für Händlerpreise → Auswahl günstigster Anbieter.

### Recht/Steuern

-   Steuerlogik (DE/EU) → MwSt. 19 %.
-   Impressum/AGB Generator.
-   DSGVO-Konformität (kein direkter API-Key-Input auf Client).

### Erweiterungen

-   Community-Funktionen (teilen, klonen, bewerten).
-   Roboter-Visualisierung in 3D.
-   AI-Coach → „Erstelle günstigen Greifroboter für Kinder".

------------------------------------------------------------------------

## Nächste konkrete Schritte (lokal)

1.  Frontend (React) läuft bereits -- weiter in Vite-Dev-Umgebung.\
2.  Für Backend: Entwicklungsumgebung aufsetzen (Node.js/Express oder
    Python/FastAPI).
    -   Stripe-Testintegration mit Webhooks.\
    -   API-Proxy für OpenAI/OpenRouter Keys.\
3.  Datenbank anbinden (Supabase/Postgres).\
4.  Schrittweise Migration Admin/Ops von Simulation → echter Orderflow.\
5.  Später: Scraper-Worker (Puppeteer).

------------------------------------------------------------------------

## Status-Update

-   **Aktuell umgesetzt:** v0.7 (Per-Teil-Marge, Payment-Platzhalter,
    Guides, Audio, Advisor).\
-   **Nächste Phase:** Backend-Integration für echte Zahlungen & LLM.\
-   **Langfristig:** Recht, Community, Marktplatz, Simulation.

------------------------------------------------------------------------
