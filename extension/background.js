// background.js — Service Worker (eigenständig, KEINE Imports).
//
// Safari lädt Module-Service-Worker (type: "module" + import) nicht zuverlässig,
// deshalb ist hier alles in einer Datei gebündelt: IndexedDB-Layer,
// Verweildauer-Uhr und Event-Verdrahtung.
//
// Verantwortlich für:
//  - Erkennen, welche Domain im aktiven Tab des fokussierten Fensters liegt
//  - Zählen von Besuchen (pro Top-Level-Navigation)
//  - Steuern der Verweildauer-Uhr anhand von Tab/Fokus/Idle/Pause/Ausschluss
//  - Periodische Checkpoints und Pruning alter Roh-Ereignisse
//
// Datenschutz: nur Domains (keine vollständigen URLs); private Fenster und
// ausgeschlossene Domains werden ignoriert.

'use strict';

/* =========================================================================
 *  IndexedDB-Layer  (identische Logik wie db.js, hier inline)
 * ========================================================================= */
const DB_NAME = 'browsing-wrapped';
const DB_VERSION = 2;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('dailyStats')) {
        const s = db.createObjectStore('dailyStats', { keyPath: ['date', 'domain'] });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        s.createIndex('ts', 'ts', { unique: false });
      }
      if (!db.objectStoreNames.contains('keywords')) {
        const s = db.createObjectStore('keywords', { keyPath: ['date', 'term'] });
        s.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function txDone(tx) {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

async function bumpDaily(date, domain, delta) {
  const { visits = 0, ms = 0 } = delta || {};
  const db = await openDB();
  const tx = db.transaction('dailyStats', 'readwrite');
  const store = tx.objectStore('dailyStats');
  const getReq = store.get([date, domain]);
  getReq.onsuccess = () => {
    const cur = getReq.result || { date, domain, visits: 0, timeMs: 0 };
    cur.visits += visits;
    cur.timeMs += ms;
    cur.updatedAt = Date.now();
    store.put(cur);
  };
  return txDone(tx);
}

async function addEvent(ev) {
  const db = await openDB();
  const tx = db.transaction('events', 'readwrite');
  tx.objectStore('events').add(Object.assign({}, ev));
  return txDone(tx);
}

async function bumpKeyword(date, term, by) {
  by = by || 1;
  const db = await openDB();
  const tx = db.transaction('keywords', 'readwrite');
  const store = tx.objectStore('keywords');
  const getReq = store.get([date, term]);
  getReq.onsuccess = () => {
    const cur = getReq.result || { date, term, count: 0 };
    cur.count += by;
    store.put(cur);
  };
  return txDone(tx);
}

async function pruneEvents(cutoffTs) {
  const db = await openDB();
  const tx = db.transaction('events', 'readwrite');
  const idx = tx.objectStore('events').index('ts');
  idx.openCursor(IDBKeyRange.upperBound(cutoffTs)).onsuccess = (e) => {
    const cur = e.target.result;
    if (cur) { cur.delete(); cur.continue(); }
  };
  return txDone(tx);
}

function todayStr(d) {
  d = d || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* =========================================================================
 *  Verweildauer-Uhr
 * ========================================================================= */
let timing = null; // { domain, since } oder null

// Das laufende Segment in storage.local sichern, damit es das Entladen der
// (nicht-persistenten) Hintergrundseite übersteht.
async function persistSeg() {
  try {
    if (timing) await chrome.storage.local.set({ activeSeg: timing });
    else await chrome.storage.local.remove('activeSeg');
  } catch { /* noop */ }
}

async function accrue() {
  if (!timing) return;
  const now = Date.now();
  const ms = now - timing.since;
  const domain = timing.domain;
  timing.since = now;
  if (ms > 0 && ms < 12 * 60 * 60 * 1000) { // Sanity-Cap: nie > 12h pro Gutschrift
    await bumpDaily(todayStr(), domain, { ms });
  }
  await persistSeg();
}

async function setActiveDomain(domain) {
  await accrue();
  timing = domain ? { domain, since: Date.now() } : null;
  await persistSeg();
}

/* =========================================================================
 *  Zustand & Helfer
 * ========================================================================= */
const NONE = chrome.windows.WINDOW_ID_NONE;

const state = {
  paused: false,
  idle: false,
  focused: true,
  activeTabId: null,
  exclude: [],
  retentionDays: 90, // 0 = unbegrenzt (rohe Ereignisse nie löschen)
};

const tabDomains = new Map(); // tabId -> domain

function domainFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isExcluded(domain) {
  if (!domain) return true;
  return state.exclude.some((x) => domain === x || domain.endsWith('.' + x));
}

/* ---- Suchanfragen → Keywords ------------------------------------------- */

// Liefert den Query-Parameter-Namen, wenn die Domain eine Suchmaschine ist.
function searchParamFor(domain) {
  if (!domain) return null;
  if (/(^|\.)google\./.test(domain)) return 'q';
  if (domain === 'bing.com' || domain.endsWith('.bing.com')) return 'q';
  if (domain.endsWith('duckduckgo.com')) return 'q';
  if (domain.endsWith('ecosia.org')) return 'q';
  if (domain.endsWith('brave.com')) return 'q';
  if (domain.endsWith('qwant.com')) return 'q';
  if (domain.endsWith('startpage.com')) return 'query';
  if (/(^|\.)yahoo\./.test(domain)) return 'p';
  if (/(^|\.)yandex\./.test(domain)) return 'text';
  if (domain.endsWith('baidu.com')) return 'wd';
  return null;
}

// Häufige Füllwörter (DE + EN), die als Thema nichts aussagen.
const STOPWORDS = new Set([
  // Deutsch
  'der', 'die', 'das', 'und', 'oder', 'aber', 'wie', 'was', 'wer', 'wo', 'wann',
  'warum', 'wieso', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'ist',
  'sind', 'war', 'waren', 'sein', 'hat', 'haben', 'wird', 'werden', 'kann',
  'mit', 'ohne', 'für', 'von', 'vom', 'zum', 'zur', 'auf', 'aus', 'bei', 'nach',
  'über', 'unter', 'vor', 'nicht', 'kein', 'keine', 'auch', 'noch', 'nur',
  'sehr', 'mehr', 'man', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'im',
  'in', 'an', 'am', 'als', 'so', 'zu', 'den', 'dem', 'des', 'doch', 'mal',
  // Englisch
  'the', 'a', 'an', 'and', 'or', 'but', 'how', 'what', 'who', 'where', 'when',
  'why', 'is', 'are', 'was', 'were', 'be', 'has', 'have', 'will', 'can', 'with',
  'without', 'for', 'from', 'to', 'of', 'on', 'in', 'at', 'by', 'not', 'no',
  'also', 'only', 'more', 'my', 'you', 'he', 'she', 'it', 'we', 'they', 'as',
  'do', 'does', 'this', 'that', 'best', 'vs',
]);

// Zerlegt eine Such-URL in saubere Einzel-Keywords (dedupliziert pro Anfrage).
function extractKeywords(url, param) {
  let q = '';
  try {
    q = new URL(url).searchParams.get(param) || '';
  } catch {
    return [];
  }
  if (!q) return [];
  const seen = new Set();
  for (const raw of q.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    const w = raw.trim();
    if (w.length < 2) continue;
    if (STOPWORDS.has(w)) continue;
    if (/^\d{1,3}$/.test(w)) continue; // sehr kurze reine Zahlen weglassen
    seen.add(w);
  }
  return [...seen];
}

function activeDomainOrNull() {
  if (state.paused || state.idle || !state.focused) return null;
  const d = tabDomains.get(state.activeTabId);
  if (isExcluded(d)) return null;
  return d || null;
}

function sync() {
  return setActiveDomain(activeDomainOrNull());
}

/* =========================================================================
 *  Einstellungen (klein -> storage.local, mit onChanged)
 * ========================================================================= */
async function loadSettings() {
  const s = await chrome.storage.local.get(['paused', 'exclude', 'retentionDays']);
  state.paused = !!s.paused;
  state.exclude = Array.isArray(s.exclude) ? s.exclude : [];
  state.retentionDays = typeof s.retentionDays === 'number' ? s.retentionDays : 90;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.paused) state.paused = !!changes.paused.newValue;
  if (changes.exclude) state.exclude = changes.exclude.newValue || [];
  if (changes.retentionDays) {
    state.retentionDays = typeof changes.retentionDays.newValue === 'number'
      ? changes.retentionDays.newValue : 90;
  }
  sync();
});

/* =========================================================================
 *  Startup
 * ========================================================================= */
async function initActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab) {
      state.activeTabId = tab.id;
      const d = domainFromUrl(tab.url || '');
      if (d) tabDomains.set(tab.id, d);
    }
  } catch { /* beim ersten Start evtl. noch keine Rechte */ }
}

async function boot() {
  await loadSettings();

  // Gesichertes Segment vom letzten Lauf verrechnen, falls die Hintergrundseite
  // zwischendurch entladen wurde. Die Gutschrift wird auf 5 min gedeckelt –
  // war der Nutzer länger weg, hätte Idle das Segment ohnehin beendet.
  try {
    const saved = await chrome.storage.local.get('activeSeg');
    const seg = saved.activeSeg;
    if (seg && seg.domain && !isExcluded(seg.domain)) {
      const gap = Date.now() - seg.since;
      const credit = Math.min(Math.max(gap, 0), 5 * 60 * 1000);
      if (credit > 0) await bumpDaily(todayStr(new Date(seg.since)), seg.domain, { ms: credit });
    }
  } catch { /* noop */ }
  timing = null;
  try { await chrome.storage.local.remove('activeSeg'); } catch { /* noop */ }

  await initActiveTab();
  chrome.alarms.create('checkpoint', { periodInMinutes: 1 });
  chrome.alarms.create('prune', { periodInMinutes: 360 });
  // 5 min Idle-Schwelle: kurze Lesepausen ohne Mausbewegung stoppen die Uhr nicht.
  try { chrome.idle.setDetectionInterval(300); } catch { /* noop */ }
  sync();
}

// Vor dem Entladen der Hintergrundseite die laufende Zeit sichern.
// (onSuspend gibt es nicht überall – defensiv prüfen, sonst bricht der Worker.)
if (chrome.runtime.onSuspend && chrome.runtime.onSuspend.addListener) {
  chrome.runtime.onSuspend.addListener(() => { accrue(); });
}

// Flush-Anfrage vom Popup: laufendes Segment sofort wegschreiben, damit die
// Anzeige die aktuelle Zeit enthält.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'flush') {
    accrue().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true; // async response
  }
  return false;
});

chrome.runtime.onStartup.addListener(boot);
chrome.runtime.onInstalled.addListener(boot);
// Auch beim normalen Aufwachen des Workers initialisieren:
boot();

/* =========================================================================
 *  Tab-Wechsel
 * ========================================================================= */
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  state.activeTabId = tabId;
  if (!tabDomains.has(tabId)) {
    try {
      const t = await chrome.tabs.get(tabId);
      const d = domainFromUrl(t.url || '');
      if (d) tabDomains.set(tabId, d);
    } catch { /* noop */ }
  }
  sync();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabDomains.delete(tabId);
  if (tabId === state.activeTabId) {
    state.activeTabId = null;
    sync();
  }
});

/* =========================================================================
 *  Navigation: Besuche zählen + Domain des Tabs aktualisieren
 * ========================================================================= */
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // nur Haupt-Frame
  const domain = domainFromUrl(details.url);
  if (domain) tabDomains.set(details.tabId, domain);
  else tabDomains.delete(details.tabId);

  if (domain && !isExcluded(domain) && !state.paused) {
    await bumpDaily(todayStr(), domain, { visits: 1 });
    await addEvent({ ts: Date.now(), domain, type: 'visit', durationMs: 0 });

    // Suchanfrage? Dann Keywords mitzählen.
    const param = searchParamFor(domain);
    if (param) {
      const words = extractKeywords(details.url, param);
      for (const w of words) await bumpKeyword(todayStr(), w);
    }
  }
  if (details.tabId === state.activeTabId) sync();
});

/* =========================================================================
 *  Fenster-Fokus
 * ========================================================================= */
chrome.windows.onFocusChanged.addListener(async (winId) => {
  state.focused = winId !== NONE;
  if (state.focused) {
    try {
      const [t] = await chrome.tabs.query({ active: true, windowId: winId });
      if (t) {
        state.activeTabId = t.id;
        const d = domainFromUrl(t.url || '');
        if (d) tabDomains.set(t.id, d);
      }
    } catch { /* noop */ }
  }
  sync();
});

/* =========================================================================
 *  Idle
 * ========================================================================= */
chrome.idle.onStateChanged.addListener((st) => {
  state.idle = st !== 'active'; // 'idle' | 'locked' -> pausieren
  sync();
});

/* =========================================================================
 *  Alarme
 * ========================================================================= */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkpoint') {
    await accrue();
  } else if (alarm.name === 'prune') {
    const days = state.retentionDays;
    if (days && days > 0) {
      await pruneEvents(Date.now() - days * 24 * 60 * 60 * 1000);
    }
  }
});
