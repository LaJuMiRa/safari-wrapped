# Browsing Wrapped — Konzept & Architektur

*Eine Safari-Extension, die deinen Browserverlauf trackt und dir wie „Spotify Wrapped" einen Rückblick über Tag, Woche, Monat und Jahr gibt.*

Stand: 11. Juni 2026 · Version 0.1 (Konzeptphase)

---

## 1. Vision in einem Satz

Eine **rein lokal** arbeitende Safari-Extension, die im Hintergrund mitschreibt, welche Websites du besuchst, wie lange du dort bleibst und wonach du suchst — und daraus animierte, teilbare Rückblicke erzeugt („Deine Woche", „Dein Jahr").

Leitprinzip: **Deine Daten verlassen niemals dein Gerät.** Kein Server, kein Account, kein Tracking durch Dritte. Das ist gleichzeitig das stärkste Verkaufsargument und die wichtigste technische Leitplanke.

---

## 2. Funktionsumfang

### 2.1 Was getrackt wird

| Datentyp | Beispiel | Quelle |
|---|---|---|
| Besuchte Domain | `github.com` | URL des aktiven Tabs |
| Vollständige URL (optional, gröber speicherbar) | `github.com/anthropics/...` | URL des aktiven Tabs |
| Verweildauer pro Domain | „42 Min. auf github.com" | aktive Tab-Zeit |
| Anzahl Besuche | „github.com: 87×" | Navigations-Ereignisse |
| Suchanfragen | „safari extension storage limit" | URL-Parameter der Suchmaschinen |
| Zeitstempel | Tag, Uhrzeit, Wochentag | Systemzeit beim Ereignis |

### 2.2 Metriken im Rückblick (deine Auswahl)

**Top-Websites** — Meistbesuchte Domains nach Anzahl und/oder Zeit, als Ranking mit „Du warst X-mal auf …".

**Verweildauer** — Gesamtzeit im Browser, aufgeschlüsselt nach Domain und Kategorie. Inkl. Superlative: „Deine längste Session", „Dein produktivster Tag".

**Themen & Trends** — Aus deinen Suchanfragen und besuchten Domains abgeleitete Themen. Welche Themen kamen neu dazu, welche verschwanden über den Zeitraum? (Details in Abschnitt 5.)

### 2.3 Zeiträume

Tag · Woche · Monat · Jahr. Jeder Zeitraum ist eine eigene „Wrapped"-Ansicht. Das Jahres-Wrapped ist das Flaggschiff (à la Spotify), die kürzeren Zeiträume eher ein Dashboard für zwischendurch.

---

## 3. Datenschutz-Architektur (das Fundament)

Weil alles lokal bleibt, gelten ein paar harte Regeln, die das gesamte Design prägen:

- **Speicherung ausschließlich auf dem Gerät** — `storage.local` bzw. IndexedDB innerhalb der Extension. Kein Netzwerk-Request verlässt jemals die Extension mit deinen Daten.
- **Kein Sync** (deine Entscheidung) — kein iCloud, kein Cross-Device. Vereinfacht das Design erheblich und ist datenschutzrechtlich sauber.
- **Volle Kontrolle** — Pause-Button (Tracking aussetzen), Ausschlussliste (Domains, die nie getrackt werden, z. B. Banking), „Alles löschen"-Knopf, Inkognito/Private-Windows werden grundsätzlich ignoriert.
- **Transparenz** — Die Extension zeigt jederzeit, was gespeichert ist, und erlaubt Export (JSON) und Import.
- **Datensparsamkeit** — Standardmäßig nur Domains + Suchbegriffe. Vollständige URLs sind eine bewusst aktivierbare Option.

> Hinweis zur App-Store-Tauglichkeit: Selbst für eine reine Privat-Nutzung verlangt Safari, dass die Extension in eine native App verpackt ist. Falls du sie je veröffentlichen willst, fordert Apple eine Datenschutzerklärung — die ist hier trivial („wir sammeln nichts, alles bleibt lokal"), aber sie muss existieren.

---

## 4. Technische Architektur

### 4.1 Plattform-Realität von Safari (wichtig zu verstehen)

Safari nutzt seit 2020 das **Web-Extension-Modell** (dieselbe API-Familie wie Chrome/Firefox: `browser.tabs`, `browser.storage`, `browser.webNavigation` usw.). Aber mit Safari-Besonderheiten:

1. **Native Hülle nötig.** Eine Safari Web Extension lebt immer in einem macOS-(oder iOS-)App-Container, der per **Xcode** gebaut wird. Es gibt kein „lade einfach einen Ordner als Extension". Du brauchst also Xcode und einen Apple-Developer-Account (der kostenlose reicht für lokale Nutzung).
2. **Lokales Testen** geht über Safari → Menü „Entwickeln" → „Unsignierte Erweiterungen zulassen". Damit kannst du die Extension ohne App Store dauerhaft selbst nutzen.
3. **API-Grenzen.** Content-Scripts dürfen nicht direkt auf `browser.tabs` zugreifen — sie kommunizieren per Message-Passing mit dem Hintergrund-Script. Das prägt die Aufteilung unten.

### 4.2 Komponenten

```
┌─────────────────────────────────────────────────────────┐
│                   Native App-Container (Xcode)            │
│  - dünne SwiftUI-Hülle, hostet die Web-Extension          │
│  - liefert das Onboarding / die Berechtigungsabfrage      │
└─────────────────────────────────────────────────────────┘
        │ enthält
        ▼
┌─────────────────────────────────────────────────────────┐
│                    Web Extension                          │
│                                                           │
│  ┌───────────────┐   Messages   ┌─────────────────────┐  │
│  │ Content-Script │ ───────────▶ │  Background-Script   │  │
│  │ (pro Tab)      │              │  (Service Worker)    │  │
│  │ - liest Titel, │              │  - Event-Sammler     │  │
│  │   Suchbegriffe │              │  - Verweildauer-Uhr  │  │
│  └───────────────┘              │  - schreibt in DB    │  │
│                                  └─────────┬───────────┘  │
│                                            ▼              │
│                                  ┌─────────────────────┐  │
│                                  │  Lokale Datenbank    │  │
│                                  │  (IndexedDB)         │  │
│                                  └─────────┬───────────┘  │
│                                            ▼              │
│        ┌──────────────┐         ┌─────────────────────┐  │
│        │ Popup (Klick │ ◀────── │  Aggregations-Logik  │  │
│        │ auf Icon)    │         │  + Wrapped-Renderer   │  │
│        └──────────────┘         └─────────────────────┘  │
│        ┌──────────────────────────────────────────────┐  │
│        │ Wrapped-Seite (Vollbild-Tab, animiert)        │  │
│        └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Background-Script** ist das Herz: Es lauscht auf Navigations- und Tab-Wechsel-Ereignisse, führt die „Verweildauer-Uhr" und schreibt rohe Ereignisse in die lokale DB.

**Content-Script** läuft in jeder Seite und liest, was das Background-Script nicht sieht: den Seitentitel und — bei Suchergebnisseiten — den Suchbegriff. Schickt das per Message an den Hintergrund.

**Popup** (Klick aufs Toolbar-Icon): schneller Tages-/Wochenüberblick + Einstellungen.

**Wrapped-Seite**: eine eigene Vollbild-HTML-Seite mit den animierten, durchklickbaren „Stories" — das eigentliche Erlebnis.

### 4.3 Benötigte Berechtigungen

- `tabs` und `webNavigation` — um URL-Wechsel und aktive Tabs zu erkennen.
- `storage` — lokale Speicherung.
- `idle` — erkennen, wann du inaktiv bist (sonst zählt die Uhr weiter, während du Kaffee holst).
- Host-Permission für die Suchmaschinen-Domains (Google, Bing, DuckDuckGo …) — um Suchbegriffe aus den Ergebnis-URLs zu lesen.

Bewusst **nicht** die `history`-Permission: Wir bauen unseren eigenen Verlauf live mit, statt Safaris History auszulesen — das ist sauberer und gibt uns die Zeitmessung, die die History-API gar nicht liefert.

---

## 5. Die zwei kniffligen Mechaniken im Detail

### 5.1 Verweildauer korrekt messen

Naiv „Tab geöffnet bis Tab geschlossen" zu messen ist falsch — Tabs liegen oft stundenlang ungenutzt im Hintergrund. Saubere Messung braucht mehrere Signale:

Die Uhr für eine Domain läuft **nur**, wenn (a) der Tab der aktive Tab ist, **und** (b) das Safari-Fenster im Vordergrund ist, **und** (c) du nicht idle bist. Gesteuert über die Ereignisse `tabs.onActivated`, `windows.onFocusChanged` und die `idle`-API. Bei jedem Wechsel wird die bis dahin gelaufene Zeit der vorherigen Domain gutgeschrieben. So entsteht echte „Aufmerksamkeitszeit" statt „Tab-offen-Zeit".

### 5.2 Themen aus Suchanfragen & Domains ableiten

Du willst Themen sehen, ohne dass die Extension Seiteninhalte ausliest — das ist datenschutzfreundlich und genau richtig. Die Themen entstehen aus zwei Quellen:

**Suchbegriffe** stecken bereits in der URL der Ergebnisseite, z. B. `google.com/search?q=safari+extension+storage`. Das Content-Script parst den `q`-Parameter (analog `bing.com/search?q=`, `duckduckgo.com/?q=` usw.). Daraus haben wir die rohen Suchwörter — ein extrem aussagekräftiges Signal für Themen, weil du in eigenen Worten formulierst, was dich beschäftigt.

**Domains** liefern grobe Kategorien über eine mitgelieferte Zuordnungstabelle (`github.com` → Entwicklung, `nytimes.com` → News, `amazon.de` → Shopping …). Diese Tabelle wird lokal mitgeliefert, kein Online-Lookup.

Aus beidem wird ein **Themen-Profil pro Zeitraum**: Keyword-Häufigkeiten (mit Stoppwort-Filter und einfacher Wortstamm-Bildung) plus Kategorie-Verteilung. Für „Trends" vergleichen wir zwei Zeiträume: Welche Keywords/Kategorien sind neu, welche stark gestiegen oder gefallen? Das ergibt Aussagen wie „Neu in deinem Monat: Thema *Segeln*" oder „*Steuererklärung* ist im April explodiert".

> Optionaler Ausbau später: ein kleines, **lokal** laufendes Sprachmodell (z. B. via Apple-on-device-ML), das Suchbegriffe zu sauberen Themen clustert. Bewusst Phase 3 — nicht nötig für eine erste tolle Version, und es muss strikt offline bleiben, um dein Datenschutz-Versprechen zu halten.

---

## 6. Datenmodell (lokal, IndexedDB)

Grob drei Ebenen, von roh zu aggregiert:

**`events`** (Rohdaten, rollierend ~90 Tage): `{ timestamp, domain, url?, type: 'visit'|'search', durationMs, searchTerms? }`. Wird laufend zu Tages-Buckets verdichtet, damit die DB nicht unbegrenzt wächst.

**`dailyStats`** (Tages-Aggregat, dauerhaft): pro Tag und Domain die Summen — Besuche, Zeit, Kategorie, gesammelte Suchbegriffe. Das ist die Basis für alle Wrapped-Ansichten und bleibt klein genug, um Jahre aufzuheben.

**`settings`**: Pausenstatus, Ausschlussliste, Detailgrad (Domain vs. volle URL), Suchmaschinen-Liste, Kategorie-Overrides.

Vorteil dieser Verdichtung: Selbst nach Jahren bleibt die Datenmenge im einstelligen MB-Bereich, und die Wrapped-Ansicht rechnet in Millisekunden.

---

## 7. Das „Wrapped"-Erlebnis (UI)

Angelehnt an Spotify Wrapped: eine Folge von **vollflächigen, animierten „Stories"**, die man per Klick/Wischen durchblättert. Vorschlag für die Story-Reihenfolge eines Jahres-Wrapped:

1. *Intro* — „Dein Jahr im Web, 2026."
2. *Gesamtzeit* — „Du hast 412 Stunden im Browser verbracht. Das sind 17 Tage."
3. *Top-5-Websites* — animiertes Ranking, das hochzählt.
4. *Deine Nr. 1* — Hero-Moment für die meistbesuchte Seite.
5. *Zeit-Persönlichkeit* — „Du bist eine Nachteule: 23 % deiner Zeit nach 22 Uhr."
6. *Themen-Reise* — die Top-Themen des Jahres, evtl. als Wortwolke oder Zeitstrahl.
7. *Trend des Jahres* — das Thema, das am stärksten gewachsen ist.
8. *Superlative* — längste Session, aktivster Tag, kuriosester Fund.
9. *Outro* — Teilen-Button (rendert eine Bild-Zusammenfassung — lokal generiert, ohne Upload).

Gestalterisch: kräftige Farbverläufe, große Typografie, sanfte Übergänge — bewusst „feierlich". Die kürzeren Zeiträume (Tag/Woche) bekommen eine ruhigere Dashboard-Variante im Popup statt der Story-Show.

---

## 8. Technische Grenzen & Risiken (ehrlich)

| Thema | Realität | Umgang |
|---|---|---|
| Xcode-Pflicht | Safari-Extensions brauchen einen nativen App-Wrapper und Xcode zum Bauen. | Einmaliges Setup; ich liefere eine Schritt-für-Schritt-Anleitung. |
| App-Store nur optional | Für Eigennutzung reicht „Unsignierte Erweiterungen zulassen". | Veröffentlichung später separat planen. |
| Private-Mode | Dort liefert Safari bewusst weniger Infos. | Wir tracken privates Surfen gar nicht — passt zum Datenschutz-Versprechen. |
| Suchbegriffe nur von bekannten Suchmaschinen | Wir parsen nur Domains, die wir kennen. | Mitgelieferte, erweiterbare Suchmaschinen-Liste. |
| Verweildauer ist Heuristik | „Aufmerksamkeit" ist nie 100 % exakt messbar. | Mehrere Signale kombinieren (Abschnitt 5.1); gut genug für Wrapped. |
| Service-Worker-Lebensdauer | Hintergrund-Scripts können von Safari beendet werden. | Zustand sofort in DB schreiben, nicht im Speicher halten. |

---

## 9. Entwicklungs-Roadmap

**Phase 0 — Setup (½ Tag).** Xcode-Projekt mit Web-Extension-Template, „Hello World"-Extension läuft in Safari, unsigniertes Laden aktiviert.

**Phase 1 — Tracking-Kern (MVP).** Background-Script erfasst Besuche + Verweildauer, schreibt in IndexedDB. Popup zeigt rohe Tages-Top-Liste. Ziel: „Es zählt korrekt mit."

**Phase 2 — Suchbegriffe & Kategorien.** Content-Script parst Suchanfragen, Domain→Kategorie-Tabelle, Themen-Profil pro Zeitraum. Einstellungen (Pause, Ausschlussliste, Löschen).

**Phase 3 — Wrapped-Erlebnis.** Die animierte Story-Ansicht für Woche/Monat/Jahr, Trend-Vergleich, Teilen-Bild.

**Phase 4 — Feinschliff (optional).** Lokales Themen-Clustering per On-Device-ML, Export/Import, schönere Visualisierungen, ggf. App-Store-Veröffentlichung.

Empfehlung: Phase 1 ist der ehrliche Test, ob die Idee trägt. Wenn die Verweildauer-Messung sauber läuft, ist der Rest „nur noch" Fleißarbeit und Gestaltung.

---

## 10. Offene Entscheidungen für dich

Bevor wir in die Umsetzung gehen, sind das die Punkte, bei denen deine Präferenz das Design beeinflusst:

1. **Detailgrad der URLs** — nur Domains (`github.com`) oder auch Pfade (`github.com/anthropics/...`)? Pfade geben reichere Themen, kosten aber mehr Speicher und sind sensibler.
2. **Tech-Stack der UI** — schlankes Vanilla-JS/HTML oder ein Framework (React/Svelte) für die Wrapped-Animationen? Für reine Eigennutzung tendiere ich zu schlank.
3. **Aufbewahrungsdauer der Rohdaten** — 30, 90 Tage oder unbegrenzt? (Aggregate bleiben ohnehin dauerhaft.)
4. **Erste Suchmaschinen** — reicht Google + Bing + DuckDuckGo für den Start, oder brauchst du weitere?
5. **Dein Setup** — Hast du Xcode installiert und einen (auch kostenlosen) Apple-Developer-Account? Das bestimmt, wie schnell Phase 0 geht.

---

*Nächster Schritt nach deiner Freigabe: Phase 0 + 1 als lauffähiges Skelett aufsetzen, damit du das Mittracken real auf deinem Rechner sehen kannst.*
