// db.js — lokale Datenhaltung über IndexedDB.
// Wird sowohl vom Background-Service-Worker als auch vom Popup genutzt
// (beide teilen sich dieselbe Datenbank, da gleiche Extension-Origin).
//
// Zwei Stores:
//   dailyStats  — Tages-Aggregate pro Domain (dauerhaft, sehr klein)
//                 keyPath [date, domain] -> { date, domain, visits, timeMs, updatedAt }
//   events      — rohe Einzel-Ereignisse (rollierend ~90 Tage, danach geprunt)
//                 keyPath id (auto) -> { id, ts, domain, type, durationMs }

const DB_NAME = 'browsing-wrapped';
const DB_VERSION = 2;

let dbPromise = null;

export function openDB() {
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

function reqProm(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function txDone(tx) {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

// Erhöht (oder legt an) ein Tages-Aggregat. delta = { visits?, ms? }
export async function bumpDaily(date, domain, delta = {}) {
  const { visits = 0, ms = 0 } = delta;
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

export async function addEvent(ev) {
  const db = await openDB();
  const tx = db.transaction('events', 'readwrite');
  tx.objectStore('events').add({ ...ev });
  return txDone(tx);
}

// Alle Tages-Aggregate eines Tages.
export async function getDaily(date) {
  const db = await openDB();
  const idx = db.transaction('dailyStats', 'readonly').objectStore('dailyStats').index('date');
  return reqProm(idx.getAll(IDBKeyRange.only(date)));
}

// Alle Tages-Aggregate in [start, end] (inkl., Format YYYY-MM-DD).
export async function getRange(start, end) {
  const db = await openDB();
  const idx = db.transaction('dailyStats', 'readonly').objectStore('dailyStats').index('date');
  return reqProm(idx.getAll(IDBKeyRange.bound(start, end)));
}

// Keyword-Häufigkeiten eines Tages bzw. eines Zeitraums (Format YYYY-MM-DD).
export async function getKeywords(date) {
  const db = await openDB();
  const idx = db.transaction('keywords', 'readonly').objectStore('keywords').index('date');
  return reqProm(idx.getAll(IDBKeyRange.only(date)));
}

export async function getKeywordsRange(start, end) {
  const db = await openDB();
  const idx = db.transaction('keywords', 'readonly').objectStore('keywords').index('date');
  return reqProm(idx.getAll(IDBKeyRange.bound(start, end)));
}

// Rohe Ereignisse im Zeitfenster [startTs, endTs] (ms-Epoch) – für die
// Stundenverteilung in der Wrapped-Story.
export async function getEventsBetween(startTs, endTs) {
  const db = await openDB();
  const idx = db.transaction('events', 'readonly').objectStore('events').index('ts');
  return reqProm(idx.getAll(IDBKeyRange.bound(startTs, endTs)));
}

// Löscht rohe Ereignisse älter als cutoffTs (ms-Epoch).
export async function pruneEvents(cutoffTs) {
  const db = await openDB();
  const tx = db.transaction('events', 'readwrite');
  const idx = tx.objectStore('events').index('ts');
  idx.openCursor(IDBKeyRange.upperBound(cutoffTs)).onsuccess = (e) => {
    const cur = e.target.result;
    if (cur) { cur.delete(); cur.continue(); }
  };
  return txDone(tx);
}

export async function clearAll() {
  const db = await openDB();
  const tx = db.transaction(['dailyStats', 'events', 'keywords'], 'readwrite');
  tx.objectStore('dailyStats').clear();
  tx.objectStore('events').clear();
  tx.objectStore('keywords').clear();
  return txDone(tx);
}

// Lokales Datum als YYYY-MM-DD (nicht UTC — Wrapped soll deinen Tagen folgen).
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
