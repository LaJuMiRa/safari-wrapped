# UI-Überarbeitung — Plan

*Browsing Wrapped · Safari-Extension*
Stand: 19. Juni 2026 · Version 0.1

Dieser Plan beschreibt, wie wir die bestehende Oberfläche (Popup + Wrapped-Story) von „funktioniert" zu „fühlt sich wie ein durchdachtes Produkt an" bringen. Er ist nach Aufwand gestaffelt, sodass wir Schritt für Schritt vorgehen können.

---

## 1. Ausgangslage (ehrliche Bestandsaufnahme)

Was schon gut ist: Das Popup ist aufgeräumt, dunkel und schnell; die Wrapped-Story hat seit der letzten Runde lebendige Animationen und einen klaren Spannungsbogen. Funktional ist alles da.

Wo es hakt:

- **Zwei verschiedene Designsprachen.** Das Popup ist dezent-dunkel und nüchtern, die Wrapped-Story ist bunt-verspielt. Es fehlt eine gemeinsame Markenidentität, die beide verbindet.
- **Keine echten Design-Tokens.** Farben, Abstände, Schriftgrößen und Radien sind direkt im CSS verstreut und teils per Augenmaß gesetzt. Änderungen sind dadurch fummelig und Inkonsistenzen schleichen sich ein.
- **Mischmasch bei Icons.** Aktuell Emojis und Sonderzeichen (`⚙`, `‹`, `❚❚`, `✕`, `✨`). Das wirkt uneinheitlich und je nach System unterschiedlich.
- **Schwache Zustände.** Lade-, Leer- und Fehlerzustände sind sehr schlicht („Lade…", „Keine Daten.").
- **Barrierefreiheit nicht systematisch.** Kontraste, Fokus-Ringe, Touch-/Klickflächen und „reduzierte Bewegung" sind bisher nicht durchgängig berücksichtigt.

---

## 2. Designziele & Prinzipien

1. **Eine Marke, zwei Auftritte.** Popup (Werkzeug, kompakt) und Wrapped (Erlebnis, großzügig) sollen erkennbar dieselbe App sein — gleiche Farbwelt, Typografie und Formensprache, nur unterschiedlich dosiert.
2. **Ruhig im Alltag, festlich im Rückblick.** Das Popup bleibt zurückhaltend und funktional; die Story darf feiern.
3. **Datenschutz sichtbar machen.** Das „100 % lokal"-Versprechen ist ein Markenzeichen — es darf gestalterisch ruhig präsenter sein (Badge, Mikrotext, Icon).
4. **Token-getrieben.** Jede Farbe, jeder Abstand kommt aus einer zentralen Variablenquelle. Kein Hardcoding mehr.
5. **Bewegung mit Bedeutung.** Animationen unterstützen Orientierung (woher kam ich, wohin gehe ich), statt nur zu schmücken.

---

## 3. Design-System aufbauen (Fundament)

Der wichtigste Schritt, weil alles andere darauf aufbaut. Eine zentrale `tokens.css` (bzw. `:root`-Variablen), die Popup und Wrapped gemeinsam nutzen:

- **Farben:** Basis-Palette (Hintergründe, Flächen, Text in 2–3 Abstufungen), eine definierte Markenfarbe + Verlauf (das vorhandene Grün→Violett), und der bestehende Kategorie-Farbsatz als benannte Tokens.
- **Typografie:** Eine klare Typo-Skala (z. B. 11/13/15/17/24/40/64 px) mit definierten Gewichten und Zeilenhöhen, statt überall eigener Werte.
- **Abstände:** 4-px-Raster (4/8/12/16/24/32) als Spacing-Tokens.
- **Radien & Schatten:** 2–3 Radius-Stufen, 1–2 Schattenstufen — einheitlich.
- **Motion:** Zentrale Dauer- und Easing-Tokens (z. B. `--ease-out`, `--dur-fast 0.2s`, `--dur 0.3s`), damit alle Übergänge denselben Rhythmus haben.

Ergebnis: ein konsistentes Look-and-Feel und viel schnellere spätere Anpassungen.

---

## 4. Popup im Detail

**Kopfzeile.** Marken-Punkt + Wortmarke beibehalten, aber Pause- und Einstellungs-Button als einheitliche Icon-Buttons mit gleichem Hit-Bereich (mind. 32×32) und sichtbarem Fokus-Ring.

**Zeitraum-Tabs.** Aktiver Tab klarer hervorheben (gefüllte Pille mit weichem Schatten), Übergang des „aktiv"-Indikators animieren, statt nur die Hintergrundfarbe zu wechseln.

**Statistik-Kacheln.** Aktuell drei nüchterne Kästen. Vorschlag: dezente Hierarchie — die Gesamtzeit als primäre Kennzahl etwas größer, Aufrufe/Domains sekundär. Optional kleine Icons je Kachel.

**Kategorie-Balken.** Schön, aber sehr klein. Idee: etwas höher, mit abgerundeten Segment-Enden, und eine Legende, die beim Überfahren das jeweilige Segment hervorhebt.

**Top-Websites.** Die Domain-Kacheln (farbiger Buchstabe) sind charmant und datenschutzfreundlich — beibehalten. Feinschliff: konsistente Zeilenhöhe, Balken mit Token-Farbverlauf, Zahlen rechtsbündig sauber ausgerichtet.

**Navigations-Buttons** („Alle Websites", „Suchbegriffe"): als klar erkennbare Listen-Zeilen mit Chevron rechts und Hover-Zustand.

**Unterseiten** (Alle Websites / Suchbegriffe): feste Kopfzeile ist gesetzt; ergänzen um eine kleine Ergebnis-Zahl und — bei Suchbegriffen — optional eine Sortier-/Filterleiste (A–Z vs. Häufigkeit).

**Footer.** „Daten löschen" und „100 % lokal" beibehalten; das Lokal-Versprechen als kleines Schild/Badge mit Schloss-Icon aufwerten.

**Einstellungen.** Sprachschalter, Ausschlussliste und Aufbewahrung sind da. Feinschliff: einheitliche Sektions-Abstände, der Sprachschalter als segmentierte Auswahl, klarere Beschreibungstexte.

---

## 5. Wrapped-Story

Die Story ist visuell am weitesten. Nächste Schritte:

- **Konsistente Folien-Komposition.** Einheitliches vertikales Raster (Kicker → Hauptaussage → Detail), damit Folien trotz unterschiedlicher Inhalte „derselben Familie" angehören.
- **Typo-Hierarchie schärfen.** Die großen Zahlen dürfen noch mutiger sein; Unterzeilen ruhiger.
- **Fortschritts-Indikator** wie bei Stories: Der aktive Balken könnte sich beim Verweilen langsam füllen (optionaler Auto-Advance nach X Sekunden).
- **Teilen-Bild** an das finale Design angleichen (gleiche Typo/Farben wie die Story).
- **Abschlussfolie** mit klarer Handlungsaufforderung (Bild speichern / schließen / Zeitraum wechseln).

---

## 6. Iconografie

Emojis und Sonderzeichen durch einen **einheitlichen Inline-SVG-Icon-Satz** ersetzen (Pause, Play, Zahnrad, Pfeil/Chevron, Schließen, Teilen, Schloss). Inline-SVG, weil die Extension-Sicherheitsregeln (CSP) keine externen Icon-Schriften erlauben. Vorteile: gestochen scharf, einfärbbar über `currentColor`, plattformunabhängig konsistent. Die thematischen Emojis in der Story (🦉, 🌅 …) können als bewusster Stilbruch bleiben.

---

## 7. Zustände (oft unterschätzt)

- **Ladezustand:** Skelett-Platzhalter statt „Lade…" — vermittelt Tempo.
- **Leerzustand:** freundliche Illustration/Icon + ein Satz, der erklärt, was als Nächstes passiert (teils vorhanden, vereinheitlichen).
- **Pausiert:** der Banner ist da; zusätzlich könnte das Toolbar-Icon den Pausenzustand spiegeln.
- **Fehler:** ein schlichter, ruhiger Fallback, falls die lokale Datenbank mal nicht lädt.

---

## 8. Barrierefreiheit

- **Kontrast:** alle Text-/Hintergrund-Kombinationen gegen WCAG AA prüfen (insb. die `--muted`-Töne).
- **Fokus:** sichtbare Fokus-Ringe für Tastaturnavigation in Popup und Story.
- **Touch/Klick:** Mindestgröße 32–44 px für alle Buttons.
- **Reduzierte Bewegung:** `@media (prefers-reduced-motion: reduce)` respektieren — Konfetti, wandernder Hintergrund und Count-up dann abschalten/abschwächen.
- **Sprachattribut:** `lang` im HTML passend zur gewählten Sprache setzen (für Screenreader).

---

## 9. Umsetzungsansatz

1. **Tokens zuerst.** `tokens.css` einführen, bestehende Werte schrittweise darauf umstellen — ohne sichtbare Änderung, rein strukturell. Danach sind alle weiteren Schritte schneller.
2. **Icon-Komponente.** Eine kleine `Icon`-Komponente (Inline-SVG, Größe + `currentColor`), die nach und nach die Emojis ersetzt.
3. **Komponente für Komponente.** Popup-Bausteine einzeln überarbeiten (Header → Tabs → Kacheln → Listen → Footer → Einstellungen), jeweils sofort testbar.
4. **Story-Feinschliff** als eigener Block.
5. **Barrierefreiheits-Durchgang** zum Schluss als Qualitätssicherung.

Risiko gering: Alle Änderungen sind rein im Frontend (`src-popup` / `src-wrapped`), keine Daten- oder Tracking-Logik betroffen. Jede Etappe ist einzeln baubar und testbar.

---

## 10. Vorgeschlagene Reihenfolge (gestaffelt)

| Etappe | Inhalt | Aufwand | Sichtbarer Effekt |
|---|---|---|---|
| A | Design-Tokens einführen & CSS umstellen | mittel | gering (Fundament) |
| B | Icon-Satz (Inline-SVG) statt Emojis | klein | mittel |
| C | Popup-Komponenten überarbeiten | mittel | hoch |
| D | Zustände (Laden/Leer/Fehler) | klein | mittel |
| E | Wrapped-Story-Feinschliff | mittel | hoch |
| F | Barrierefreiheit + reduzierte Bewegung | klein | mittel |

Empfehlung: mit **A** und **B** starten — sie kosten wenig und machen alles Folgende schneller und konsistenter.

---

## 11. Offene Entscheidungen für dich

1. **Designrichtung:** Soll das Popup farbiger/näher an die Story rücken, oder bewusst dezent-dunkel bleiben (mein Vorschlag: dezent bleiben, nur Markenakzent stärker)?
2. **Auto-Advance in der Story:** Folien automatisch weiterschalten (wie Instagram-Stories) oder nur per Tipp?
3. **Helles Design:** Brauchst du auch einen Light-Mode (an Safari/System gekoppelt), oder reicht Dark?
4. **Umfang jetzt:** Nur Fundament (A+B) zum Start, oder gleich bis einschließlich Popup-Überarbeitung (A–C)?
