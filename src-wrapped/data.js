// data.js — builds all the metrics for the Wrapped story of a period.
// Reads locally from IndexedDB; compares with the previous period for trends.

import {
  getRange, getKeywordsRange, getEventsBetween, todayStr,
} from '../extension/db.js';
import { CATEGORIES, categoryFor } from '../src-popup/categories.js';
import { groupTerms, stemCountMap } from '../src-popup/themes.js';

export const PERIODS = {
  week: { days: 7 },
  month: { days: 30 },
  year: { days: 365 },
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
  let key, emoji;
  if (peak >= 5 && peak < 9) { key = 'frueh'; emoji = '🌅'; }
  else if (peak >= 9 && peak < 17) { key = 'tag'; emoji = '☀️'; }
  else if (peak >= 17 && peak < 22) { key = 'feierabend'; emoji = '🌆'; }
  else { key = 'nacht'; emoji = '🦉'; }
  return { key, emoji, peakHour: peak, nightShare };
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

  // Categories by time
  const byCat = new Map();
  for (const d of domains) {
    const c = categoryFor(d.domain);
    byCat.set(c, (byCat.get(c) || 0) + d.timeMs);
  }
  const categories = [...byCat.entries()]
    .map(([key, ms]) => ({ key, timeMs: ms, color: CATEGORIES[key].color }))
    .filter((c) => c.timeMs > 0)
    .sort((a, b) => b.timeMs - a.timeMs);

  // Keywords + trend (increase vs. the previous period)
  const curK = aggregateKeywords(kRows);
  const keywords = [...curK.entries()].map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);

  // Themes = locally grouped search terms (word stems merged).
  const themes = groupTerms(keywords);

  // Trends: stem-based comparison with the previous period.
  const prevItems = [...aggregateKeywords(prevK).entries()].map(([term, count]) => ({ term, count }));
  const prevStem = stemCountMap(prevItems);
  const trends = themes
    .map((g) => ({ label: g.label, count: g.count, prev: prevStem.get(g.key) || 0, delta: g.count - (prevStem.get(g.key) || 0) }))
    .filter((t) => t.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  // Hourly distribution from raw events
  const startTs = new Date(`${start}T00:00:00`).getTime();
  const events = await getEventsBetween(startTs, Date.now());
  const hist = new Array(24).fill(0);
  const wd = new Array(7).fill(0);
  for (const e of events) {
    const dt = new Date(e.ts);
    const h = dt.getHours();
    if (h >= 0 && h < 24) hist[h] += 1;
    wd[dt.getDay()] += 1;
  }
  const personality = classifyPersonality(hist);

  // Busiest weekday
  let busiestWeekday = null;
  const wdTotal = wd.reduce((s, n) => s + n, 0);
  if (wdTotal) {
    let bw = 0;
    for (let i = 1; i < 7; i++) if (wd[i] > wd[bw]) bw = i;
    busiestWeekday = { index: bw, count: wd[bw], share: wd[bw] / wdTotal };
  }

  // Casual time comparisons (for a fun slide)
  const funFacts = {
    episodes: Math.round(totalMs / (45 * 60000)),
    movies: +(totalMs / (2 * 3600000)).toFixed(1),
  };

  // Busiest day
  const byDay = new Map();
  for (const r of rows) byDay.set(r.date, (byDay.get(r.date) || 0) + r.timeMs);
  let busiestDay = null;
  for (const [date, ms] of byDay.entries()) {
    if (!busiestDay || ms > busiestDay.timeMs) busiestDay = { date, timeMs: ms };
  }

  return {
    periodKey, start, end,
    domains, totalMs, totalVisits,
    categories, keywords, themes, trends,
    hist, personality, busiestDay, busiestWeekday, funFacts,
    topDomain: domains[0] || null,
    domainCount: domains.length,
  };
}
