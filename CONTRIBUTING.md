# Mitmachen

Danke für dein Interesse! Beiträge sind willkommen — egal ob Bugfix, neue
Kategorie/Suchmaschine, Übersetzung oder Feature. (Sprache hier bewusst Deutsch;
der restliche Projekt-Content ist auf Englisch.)

## Setup

```bash
npm install
npm run build
```

- **Popup-Quellcode:** `src-popup/` (React + Vite, Build → `extension/popup/`)
- **Wrapped-Story & Detailseiten:** `src-wrapped/` (Build → `extension/wrapped/`)
- **Tracking-Kern:** `extension/background.js` + `extension/db.js` (Vanilla-JS, kein Build)

Zum Testen die Extension wie in der [README](README.md) beschrieben in eine
Safari-App verpacken und laden.

## Leitlinien

- **Datenschutz zuerst:** Kein Feature darf Daten das Gerät verlassen lassen.
  Keine externen Requests mit Nutzerdaten, keine Telemetrie.
- Bestehenden Code-Stil beibehalten; UI-Werte über die Design-Tokens
  (`src-popup/tokens.css`) statt hartkodierter Farben/Abstände.
- Neue UI-Texte immer in **beiden** Sprachen ergänzen (`src-popup/i18n.js`).
- Vor dem PR `npm run build` laufen lassen und kurz in Safari prüfen.

## Pull Requests

1. Fork & Branch (`feature/...` oder `fix/...`).
2. Änderung + kurze Beschreibung im PR (Screenshots bei UI-Änderungen helfen).
3. Bei nennenswerten Änderungen einen Eintrag in `CHANGELOG.md` ergänzen.
