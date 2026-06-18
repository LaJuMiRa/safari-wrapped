// tracker.js — Verweildauer-State-Machine.
// Hält nur fest, WIE LANGE die gerade aktive Domain im Vordergrund ist.
// Die Entscheidung, WELCHE Domain aktiv ist (oder ob gerade gar keine,
// z.B. weil pausiert/idle/Fenster im Hintergrund), trifft background.js.

import { bumpDaily, todayStr } from './db.js';

// current = { domain, since } oder null
let current = null;

// Schreibt die seit dem letzten Checkpoint angelaufene Zeit gut und
// setzt die Uhr zurück (current läuft danach weiter).
async function accrue() {
  if (!current) return;
  const now = Date.now();
  const ms = now - current.since;
  const domain = current.domain;
  current.since = now;
  // Plausibilitätsgrenze: einzelne Gutschriften nie > 12h (z.B. nach SW-Schlaf).
  if (ms > 0 && ms < 12 * 60 * 60 * 1000) {
    await bumpDaily(todayStr(), domain, { ms });
  }
}

// Periodischer Checkpoint (per Alarm): Zeit sichern, ohne current zu beenden.
export async function checkpoint() {
  await accrue();
}

// Aktive Domain setzen (oder null = niemand zählt).
// Bucht zuerst die bisher gelaufene Zeit, startet dann ggf. neu.
export async function setActive(domain) {
  await accrue();
  current = domain ? { domain, since: Date.now() } : null;
}

export function activeDomain() {
  return current ? current.domain : null;
}
