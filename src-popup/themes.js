// themes.js — gruppiert einzelne Suchbegriffe lokal zu Themen.
// Leichter, konservativer DE/EN-Stemmer: fasst Flexionsformen zusammen
// (kamera/kameras, rezept/rezepte/rezepten, python/pythons …), ohne Cloud.

// Längste Endungen zuerst, damit z. B. "ungen" vor "en" greift.
const SUFFIXES = [
  'ungen', 'lichen', 'ische', 'ischen', 'keiten', 'heiten',
  'ung', 'keit', 'heit', 'lich', 'isch', 'bar',
  'ern', 'est', 'end', 'ten', 'sten',
  'ies', 'ing', 'ed',
  'en', 'er', 'es', 'em', 'el', 'ly',
  'n', 'e', 's',
];

// Stamm bilden: nur kürzen, wenn genug Restlänge bleibt (>= 4 Zeichen),
// damit kurze Wörter unangetastet bleiben und kaum Fehlgruppierungen entstehen.
export function stem(word) {
  const w = word.toLowerCase();
  for (const suf of SUFFIXES) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      return w.slice(0, -suf.length);
    }
  }
  return w;
}

// items: [{ term, count }] -> [{ key, label, count, terms[] }] (nach count sortiert)
export function groupTerms(items) {
  const groups = new Map();
  for (const { term, count } of items) {
    const key = stem(term);
    let g = groups.get(key);
    if (!g) { g = { key, label: term, count: 0, best: 0, terms: [] }; groups.set(key, g); }
    g.count += count;
    g.terms.push(term);
    if (count > g.best) { g.best = count; g.label = term; } // häufigste Form als Anzeigename
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

// Stamm -> Summe (für Trend-Vergleich zwischen Zeiträumen)
export function stemCountMap(items) {
  const m = new Map();
  for (const { term, count } of items) {
    const k = stem(term);
    m.set(k, (m.get(k) || 0) + count);
  }
  return m;
}
