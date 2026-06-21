# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.
Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
Versionierung nach [SemVer](https://semver.org/lang/de/).

## [1.0.0] – 2026-06-19

Erste öffentliche Version.

### Hinzugefügt
- Lokales Tracking von Domains, Besuchen und echter Verweildauer (IndexedDB).
- Erfassung von Suchanfragen als Einzel-Keywords (Stoppwörter entfernt) aus
  gängigen Suchmaschinen.
- Popup mit Zeitraum-Umschalter (Heute/Woche/Monat), Top-Websites,
  Kategorie-Verteilung und Statistik.
- Vollbild-**Wrapped-Story** (Woche/Monat/Jahr) mit hochzählenden Zahlen,
  Browsing-Typ, aktivstem Wochentag, gruppierten Themen, Trend-Vergleich,
  Konfetti und „Als Bild speichern" (lokales PNG).
- Detailseiten „Alle Websites" und „Suchbegriffe" als eigener Tab (scrollbar).
- Mehrsprachigkeit (Deutsch / Englisch), umschaltbar in den Einstellungen.
- Einstellungen: Pause, Ausschlussliste, Aufbewahrungsdauer, Daten löschen.
- Muted Design-System (Design-Tokens), Slate-Blau als Akzent, eigenes App-Icon.

### Datenschutz
- Keine vollständigen URLs, keine ganzen Suchanfragen, keine Netzwerk-Requests
  mit Nutzerdaten. Alles bleibt lokal.

[1.0.0]: https://github.com/<DEIN-GITHUB-USERNAME>/safari-rapped/releases/tag/v1.0.0
