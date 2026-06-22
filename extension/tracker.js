// tracker.js — dwell-time state machine.
// Only tracks HOW LONG the currently active domain is in the foreground.
// The decision of WHICH domain is active (or whether none is, e.g. because
// tracking is paused / idle / the window is in the background) is made by
// background.js.

import { bumpDaily, todayStr } from './db.js';

// current = { domain, since } or null
let current = null;

// Credits the time accrued since the last checkpoint and resets the clock
// (current keeps running afterwards).
async function accrue() {
  if (!current) return;
  const now = Date.now();
  const ms = now - current.since;
  const domain = current.domain;
  current.since = now;
  // Sanity cap: a single credit is never > 12h (e.g. after the SW slept).
  if (ms > 0 && ms < 12 * 60 * 60 * 1000) {
    await bumpDaily(todayStr(), domain, { ms });
  }
}

// Periodic checkpoint (via alarm): persist time without ending the segment.
export async function checkpoint() {
  await accrue();
}

// Set the active domain (or null = nobody is counted).
// Credits the time accrued so far first, then starts a new segment if needed.
export async function setActive(domain) {
  await accrue();
  current = domain ? { domain, since: Date.now() } : null;
}

export function activeDomain() {
  return current ? current.domain : null;
}
