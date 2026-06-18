// data.js — baut alle Kennzahlen für die Wrapped-Story eines Zeitraums.
// Liest lokal aus IndexedDB; vergleicht mit der Vorperiode für Trends.

import {
  getRange, getKeywordsRange, getEventsBetween, todayStr,
} from '../extension/db.js';
import { CATEGORIES, categoryFor } from '../src-popup/categories.js';

export const PERIODS = {
  week: { label: 'Woche', days: 7 },
  month: { label: 'Monat', days: 30 },
  year: { label: 'Jahr', days: 365 },
};

function shiftDate(base, deltaDays) {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function aggregateDomains(rows) {
  const byDomain = new Map();
  for (const r of rows) {
    const cur = byDomain.get(r.domain) || { domain: r.domain, timeMs: 0, visits: 0 };
    cur.timeMs += r.timeMs;
    cur.visits += r.visits;
    byDomain.set(r.domain, cur);
  }
  return [...byDomain.values()].sort((a, b) => b.timeMs - a.timeMs || b.visits - a.visits);
}

function aggregateKeywords(rows) {
  const m = new Map();
  for (const k of rows) m.set(k.term, (m.get(k.term) || 0) + k.count);
  return m;
}

function classifyPersonality(hist) {
  const total = hist.reduce((s, n) => s + n, 0);
  if (!total) return null;
  let peak = 0;
  for (let h = 1; h < 24; h++) if (hist[h] > hist[peak]) peak = h;
  const nightShare = (hist.slice(22).reduce((s, n) => s + n, 0) + hist.slice(0, 5).reduce((s, n) => s + n, 0)) / total;
  let label, emoji;
  if (peak >= 5 && peak < 9) { label = 'Frühaufsteher'; emoji = '🌅'; }
  else if (peak >= 9 && peak < 17) { label = 'Tagmensch'; emoji = '☀️'; }
  else if (peak >= 17 && peak < 22) { label = 'Feierabend-Surfer'; emoji = '🌆'; }
  else { label = 'Nachteule'; emoji = '🦉'; }
  return { label, emoji, peakHour: peak, nightShare };
}

export async function buildWrapped(periodKey) {
  const period = PERIODS[periodKey] || PERIODS.week;
  const end = todayStr();
  const start = todayStr(shiftDate(new Date(), -(period.days - 1)));
  const prevEnd = todayStr(shiftDate(new Date(), -period.days));
  const prevStart = todayStr(shiftDate(new Date(), -(period.days * 2 - 1)));

  const [rows, kRows, prevK] = await Promise.all([
    getRange(start, end),
    getKeywordsRange(start, end),
    getKeywordsRange(prevStart, prevEnd),
  ]);

  const domains = aggregateDomains(rows);
  const totalMs = domains.reduce((s, d) => s + d.timeMs, 0);
  const totalVisits = domains.reduce((s, d) => s + d.visits, 0);

  // Kategorien nach Zeit
  const byCat = new Map();
  for (const d of domains) {
    const c = categoryFor(d.domain);
    byCat.set(c, (byCat.get(c) || 0) + d.timeMs);
  }
  const categories = [...byCat.entries()]
    .map(([key, ms]) => ({ key, timeMs: ms, ...CATEGORIES[key] }))
    .filter((c) => c.timeMs > 0)
    .sort((a, b) => b.timeMs - a.timeMs);

  // Keywords + Trend (Anstieg ggü. Vorperiode)
  const curK = aggregateKeywords(kRows);
  const keywords = [...curK.entries()].map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
  const prevMap = aggregateKeywords(prevK);
  const trends = [...curK.entries()]
    .map(([term, count]) => ({ term, count, prev: prevMap.get(term) || 0, delta: count - (prevMap.get(term) || 0) }))
    .filter((t) => t.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  // Stundenverteilung aus rohen Ereignissen
  const startTs = new Date(`${start}T00:00:00`).getTime();
  const events = await getEventsBetween(startTs, Date.now());
  const hist = new Array(24).fill(0);
  for (const e of events) {
    const h = new Date(e.ts).getHours();
    if (h >= 0 && h < 24) hist[h] += 1;
  }
  const personality = classifyPersonality(hist);

  // Aktivster Tag
  const byDay = new Map();
  for (const r of rows) byDay.set(r.date, (byDay.get(r.date) || 0) + r.timeMs);
  let busiestDay = null;
  for (const [date, ms] of byDay.entries()) {
    if (!busiestDay || ms > busiestDay.timeMs) busiestDay = { date, timeMs: ms };
  }

  return {
    periodKey, periodLabel: period.label, start, end,
    domains, totalMs, totalVisits,
    categories, keywords, trends,
    hist, personality, busiestDay,
    topDomain: domains[0] || null,
    domainCount: domains.length,
  };
}
