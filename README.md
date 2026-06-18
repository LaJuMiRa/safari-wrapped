# safari-rapped — Browsing Wrapped

Eine **rein lokale** Safari-Extension, die deinen Browser-Verlauf trackt und dir
einen Spotify-Wrapped-artigen Rückblick (Tag/Woche/Monat/Jahr) gibt: meistbesuchte
Websites, Verweildauer und – ab Phase 2 – deine häufigsten Themen & Suchanfragen.

Alle Daten bleiben auf deinem Gerät (IndexedDB). Kein Server, kein Account, kein Sync.

> **Status: Phase 3.** Zusätzlich zum Tracking (Domains, Besuche, Verweildauer,
> Suchbegriffe) gibt es jetzt die **animierte Wrapped-Story**: ein Button im Popup
> öffnet eine Vollbild-Seite (neuer Tab) mit durchklickbaren Folien für
> Woche/Monat/Jahr — Gesamtzeit, Top-5, Lieblingsseite, Browsing-Typ, Themen,
> Trends ggü. der Vorperiode, Kategorien — plus „Als Bild speichern" (lokal
> erzeugtes PNG). Das vollständige Konzept steht in `Konzept_Browsing_Wrapped.md`.

---

## Projektstruktur

```
safari-rapped/
├── extension/              ← die ladefertige Web-Extension (Input für Xcode)
│   ├── manifest.json       ← MV3-Manifest
│   ├── background.js       ← Service Worker: Tracking-Logik
│   ├── tracker.js          ← Verweildauer-State-Machine
│   ├── db.js               ← IndexedDB-Layer (geteilt mit dem Popup)
│   ├── icons/              ← App-Icons (16/48/128)
│   └── popup/              ← vom Build erzeugt (NICHT von Hand bearbeiten)
├── src-popup/              ← React-Quellcode des Popups
│   ├── index.html
│   ├── main.jsx
│   ├── App.jsx
│   └── styles.css
├── package.json
├── vite.config.js
└── Konzept_Browsing_Wrapped.md
```

Die Trennung ist bewusst: `background.js`, `tracker.js`, `db.js` sind reines
Vanilla-JS (kein Build nötig). Nur das **Popup** wird mit React + Vite gebaut und
landet als statische Dateien in `extension/popup/`.

---

## 1. Popup bauen

Einmalig Abhängigkeiten installieren, dann bauen:

```bash
npm install
npm run build      # baut src-popup/ → extension/popup/
```

Beim Weiterentwickeln des Popups praktisch: `npm run dev` (Vite-Devserver im Browser,
ohne Extension-Kontext — gut fürs Layout, ohne echte Daten).

Nach jeder Popup-Änderung erneut `npm run build`, danach in Safari die Extension neu laden.

## 2. In eine Safari-App verpacken

Safari-Extensions brauchen einen nativen App-Container. Apple liefert ein
Konverter-Tool, das aus dem `extension/`-Ordner ein fertiges Xcode-Projekt macht:

```bash
xcrun safari-web-extension-converter ./extension \
  --app-name "Browsing Wrapped" \
  --bundle-identifier com.laurenz.browsingwrapped \
  --macos-only --no-open
```

Das erzeugt ein Xcode-Projekt (Ordner „Browsing Wrapped"). Öffne es in Xcode.

## 3. Bauen & lokal laden

1. In Xcode oben das App-Target wählen und auf **▶ Run** drücken. Die kleine
   Container-App startet — sie öffnet nur einen Hinweis „Aktiviere die Extension in Safari".
2. In Safari → **Einstellungen → Erweiterungen** → „Browsing Wrapped" aktivieren.
3. Falls die Extension nicht erscheint, zuerst **unsignierte Erweiterungen erlauben**:
   Safari → Menü **Entwickeln → „Unsignierte Erweiterungen zulassen"**
   (Das Entwickeln-Menü ggf. unter Einstellungen → Erweitert → „Funktionen für
   Webentwickler anzeigen" aktivieren.)
4. Beim ersten Klick aufs Toolbar-Icon fragt Safari nach Zugriff auf Websites —
   das ist nötig, damit Domains erfasst werden können. „Für alle Websites erlauben".

> Tipp: Nach Code-Änderungen an `extension/` reicht in Safari oft ein Neuladen der
> Extension. Bei Änderungen am Manifest oder neuen Dateien lieber in Xcode neu bauen.

---

## Was Phase 1 schon kann

- Zählt **Besuche pro Domain** (jede Top-Level-Navigation).
- Misst **echte Verweildauer** — die Uhr läuft nur, wenn der Tab aktiv, das Fenster
  im Vordergrund und du nicht idle bist (60 s Idle-Schwelle).
- Speichert alles **lokal** in IndexedDB, verdichtet zu Tages-Aggregaten,
  prunt rohe Ereignisse nach 90 Tagen.
- **Popup** zeigt die heutige Top-10 mit Zeit/Besuchen, Gesamt­statistik,
  Pause-Schalter und „Daten löschen".

## Datenschutz-Eckpfeiler

- Nur **Domains** werden gespeichert, keine vollständigen URLs.
- Private Fenster und Domains auf der Ausschlussliste werden ignoriert.
- Keine Netzwerk-Requests mit deinen Daten — auch das Popup rendert komplett offline
  (Domain-Kacheln werden lokal aus dem Namen erzeugt, keine Favicon-Abrufe).

## Datenmodell (IndexedDB, Version 2)

- `dailyStats` — Tages-Aggregate pro Domain (Besuche, Zeit), dauerhaft.
- `keywords` — Tages-Häufigkeiten einzelner Suchbegriffe, dauerhaft.
- `events` — rohe Einzel-Ereignisse, rollierend (Aufbewahrung einstellbar).

Suchbegriffe werden in Einzel-Keywords zerlegt, Stoppwörter entfernt; es wird
nie die ganze Suchanfrage gespeichert. Kategorien (`src-popup/categories.js`)
werden nur zur Anzeige aus der Domain abgeleitet.

## Nächste Schritte (laut Konzept)

- **Phase 3:** animierte Wrapped-Story für Woche/Monat/Jahr inkl. Trend-Vergleich
  (welche Themen neu dazukamen oder stark wuchsen) und Teilen-Bild.
