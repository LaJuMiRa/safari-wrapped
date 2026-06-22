// themes.js — groups individual search terms into themes, locally.
// Lightweight, conservative DE/EN stemmer: merges inflected forms
// (kamera/kameras, rezept/rezepte/rezepten, python/pythons …), no cloud.

// Longest suffixes first, so e.g. "ungen" is matched before "en".
const SUFFIXES = [
  'ungen', 'lichen', 'ische', 'ischen', 'keiten', 'heiten',
  'ung', 'keit', 'heit', 'lich', 'isch', 'bar',
  'ern', 'est', 'end', 'ten', 'sten',
  'ies', 'ing', 'ed',
  'en', 'er', 'es', 'em', 'el', 'ly',
  'n', 'e', 's',
];

// Build a stem: only trim when enough length remains (>= 4 chars), so short
// words stay untouched and mis-groupings are rare.
export function stem(word) {
  const w = word.toLowerCase();
  for (const suf of SUFFIXES) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) {
      return w.slice(0, -suf.length);
    }
  }
  return w;
}

// items: [{ term, count }] -> [{ key, label, count, terms[] }] (sorted by count)
export function groupTerms(items) {
  const groups = new Map();
  for (const { term, count } of items) {
    const key = stem(term);
    let g = groups.get(key);
    if (!g) { g = { key, label: term, count: 0, best: 0, terms: [] }; groups.set(key, g); }
    g.count += count;
    g.terms.push(term);
    if (count > g.best) { g.best = count; g.label = term; } // most frequent form as display name
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

// stem -> sum (for trend comparison between periods)
export function stemCountMap(items) {
  const m = new Map();
  for (const { term, count } of items) {
    const k = stem(term);
    m.set(k, (m.get(k) || 0) + count);
  }
  return m;
}
