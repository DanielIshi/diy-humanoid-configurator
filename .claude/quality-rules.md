# Qualitätssicherungsregeln für DIY Humanoid Configurator

## WICHTIGE REGEL: Playwright Testing vor Fertigmeldung

**VERPFLICHTEND**: Bevor eine Implementierung als "fertig" vorgeschlagen wird, MUSS die gesamte App mit Playwright getestet werden.

### Warum diese Regel wichtig ist:
- Syntax-Fehler in JSX-Dateien können die komplette App zum Absturz bringen
- Unicode-Escape-Sequenzen (wie \") verursachen Babel-Compilation-Fehler
- Frontend-Builds können scheitern ohne dass es sofort sichtbar ist
- Benutzer können die App nicht verwenden wenn kritische Fehler vorliegen

### Verpflichtender Test-Workflow:
1. **Vor Fertigmeldung**: Immer `npx playwright test` ausführen
2. **Mindestens testen**: Startseite, Hauptfunktionalität, Navigation
3. **Build-Test**: `npm run build` muss erfolgreich sein
4. **Dokumentation**: Test-Ergebnisse protokollieren

### Häufige Probleme die zu prüfen sind:
- JavaScript/JSX Syntax-Fehler
- Fehlende Dependencies
- Broken Links/Routes
- API-Endpunkt-Verfügbarkeit
- CSS/Styling-Probleme
- Responsive Design auf verschiedenen Bildschirmgrößen

### Test-Kommandos:
```bash
cd frontend
npm run build  # Build-Test
npx playwright test  # E2E Tests
npx playwright test --ui  # Mit Browser-UI
```

**NIEMALS eine Implementation als fertig melden ohne vorherige Playwright-Tests!**

---
Datum: 2025-09-03
Status: VERPFLICHTENDE REGEL