import { useCallback, useEffect, useState } from 'react';
import {
  getRange, getKeywordsRange, clearAll, todayStr,
} from '../extension/db.js';
import { CATEGORIES, categoryFor } from './categories.js';

/* ---------- Helfer ------------------------------------------------------- */

function fmtTime(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return '<1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function colorFor(domain) {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) % 360;
  return `hsl(${h} 65% 45%)`;
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayStr(d);
}

const PERIODS = [
  { key: 'today', label: 'Heute', days: 0 },
  { key: 'week', label: 'Woche', days: 6 },
  { key: 'month', label: 'Monat', days: 29 },
];

function periodLabel(key) {
  return (PERIODS.find((p) => p.key === key) || PERIODS[0]).label;
}

async function flushBackground() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'flush' });
    }
  } catch { /* Hintergrund evtl. nicht erreichbar */ }
}

const hasChrome = typeof chrome !== 'undefined' && chrome.storage;

async function getSettings() {
  if (!hasChrome) return { paused: false, exclude: [], retentionDays: 90 };
  const s = await chrome.storage.local.get(['paused', 'exclude', 'retentionDays']);
  return {
    paused: !!s.paused,
    exclude: Array.isArray(s.exclude) ? s.exclude : [],
    retentionDays: typeof s.retentionDays === 'number' ? s.retentionDays : 90,
  };
}

async function setSetting(patch) {
  if (hasChrome) await chrome.storage.local.set(patch);
}

/* ---------- Wiederverwendbare Zeile ------------------------------------- */

function DomainRow({ r, i, maxMs }) {
  return (
    <li className="row">
      <span className="rank">{i + 1}</span>
      <span className="favwrap">
        <span className="fav" style={{ background: colorFor(r.domain) }}>
          {r.domain.charAt(0).toUpperCase()}
        </span>
      </span>
      <span className="meta">
        <span className="domain">{r.domain}</span>
        <span className="bar">
          <span className="fill" style={{ width: maxMs ? `${Math.max(4, (r.timeMs / maxMs) * 100)}%` : '4%' }} />
        </span>
      </span>
      <span className="vals">
        <span className="time">{fmtTime(r.timeMs)}</span>
        <span className="visits">{r.visits}×</span>
      </span>
    </li>
  );
}

/* ---------- Hauptkomponente --------------------------------------------- */

export default function App() {
  const [period, setPeriod] = useState('today');
  const [view, setView] = useState('main'); // 'main' | 'settings' | 'allsites' | 'keywords'
  const [domains, setDomains] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [cats, setCats] = useState([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      await flushBackground();
      const days = PERIODS.find((x) => x.key === p).days;
      const start = dateNDaysAgo(days);
      const end = todayStr();

      const rows = await getRange(start, end);
      const byDomain = new Map();
      for (const r of rows) {
        const cur = byDomain.get(r.domain) || { domain: r.domain, timeMs: 0, visits: 0 };
        cur.timeMs += r.timeMs;
        cur.visits += r.visits;
        byDomain.set(r.domain, cur);
      }
      const domainList = [...byDomain.values()].sort((a, b) => b.timeMs - a.timeMs || b.visits - a.visits);
      setDomains(domainList);

      const byCat = new Map();
      for (const d of domainList) {
        const c = categoryFor(d.domain);
        byCat.set(c, (byCat.get(c) || 0) + d.timeMs);
      }
      const catList = [...byCat.entries()]
        .map(([key, timeMs]) => ({ key, timeMs, ...CATEGORIES[key] }))
        .filter((c) => c.timeMs > 0)
        .sort((a, b) => b.timeMs - a.timeMs);
      setCats(catList);

      const kRows = await getKeywordsRange(start, end);
      const byTerm = new Map();
      for (const k of kRows) byTerm.set(k.term, (byTerm.get(k.term) || 0) + k.count);
      const kwList = [...byTerm.entries()].map(([term, count]) => ({ term, count }));
      setKeywords(kwList);

      setPaused((await getSettings()).paused);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const totalMs = domains.reduce((s, r) => s + r.timeMs, 0);
  const totalVisits = domains.reduce((s, r) => s + r.visits, 0);
  const maxMs = domains.length ? domains[0].timeMs : 0;

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    await setSetting({ paused: next });
  }

  async function doClear() {
    await clearAll();
    setConfirmClear(false);
    load(period);
  }

  if (view === 'settings') {
    return <Settings onBack={() => { setView('main'); load(period); }} />;
  }
  if (view === 'allsites') {
    return <AllSites domains={domains} maxMs={maxMs} label={periodLabel(period)} onBack={() => setView('main')} />;
  }
  if (view === 'keywords') {
    return <Keywords keywords={keywords} label={periodLabel(period)} onBack={() => setView('main')} />;
  }

  return (
    <div className="wrap">
      <header className="head">
        <div className="brand">
          <span className="dot" />
          Browsing&nbsp;Wrapped
        </div>
        <div className="head-actions">
          <button className={`pause ${paused ? 'on' : ''}`} onClick={togglePause}>
            {paused ? '▶' : '❚❚'}
          </button>
          <button className="gear" title="Einstellungen" onClick={() => setView('settings')}>⚙</button>
        </div>
      </header>

      <div className="tabs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`tab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="summary">
        <div className="stat">
          <div className="num">{fmtTime(totalMs)}</div>
          <div className="lbl">aktiv</div>
        </div>
        <div className="stat">
          <div className="num">{totalVisits}</div>
          <div className="lbl">Aufrufe</div>
        </div>
        <div className="stat">
          <div className="num">{domains.length}</div>
          <div className="lbl">Domains</div>
        </div>
      </div>

      {paused && <div className="banner">Tracking pausiert</div>}

      {loading ? (
        <div className="empty">Lade…</div>
      ) : domains.length === 0 ? (
        <div className="empty">
          Noch keine Daten in diesem Zeitraum.<br />
          Surf ein bisschen — die Liste füllt sich automatisch.
        </div>
      ) : (
        <>
          {cats.length > 0 && (
            <section>
              <div className="section-title">Kategorien</div>
              <div className="catbar">
                {cats.map((c) => (
                  <span
                    key={c.key}
                    className="catseg"
                    style={{ width: `${(c.timeMs / totalMs) * 100}%`, background: c.color }}
                    title={`${c.label} · ${fmtTime(c.timeMs)}`}
                  />
                ))}
              </div>
              <div className="catlegend">
                {cats.slice(0, 5).map((c) => (
                  <span key={c.key} className="catlegitem">
                    <span className="catdot" style={{ background: c.color }} />
                    {c.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-title">Top-Websites</div>
            <ol className="list">
              {domains.slice(0, 5).map((r, i) => (
                <DomainRow key={r.domain} r={r} i={i} maxMs={maxMs} />
              ))}
            </ol>
          </section>

          <div className="navbtns">
            <button className="navbtn" onClick={() => setView('allsites')}>
              Alle Websites ({domains.length}) →
            </button>
            <button className="navbtn" onClick={() => setView('keywords')}>
              Suchbegriffe ({keywords.length}) →
            </button>
          </div>
        </>
      )}

      <footer className="foot">
        {confirmClear ? (
          <span className="confirm">
            Wirklich löschen?
            <button className="confirm-yes" onClick={doClear}>Ja</button>
            <button className="confirm-no" onClick={() => setConfirmClear(false)}>Nein</button>
          </span>
        ) : (
          <button className="clear" onClick={() => setConfirmClear(true)}>Daten löschen</button>
        )}
        <span className="hint">100 % lokal</span>
      </footer>
    </div>
  );
}

/* ---------- Unterseite: Alle Websites ----------------------------------- */

function AllSites({ domains, maxMs, label, onBack }) {
  return (
    <div className="wrap">
      <header className="head">
        <button className="gear" onClick={onBack} title="Zurück">←</button>
        <div className="brand" style={{ flex: 1, justifyContent: 'center' }}>Alle Websites</div>
        <span style={{ width: 28 }} />
      </header>
      <div className="hintline" style={{ textAlign: 'center' }}>{label} · {domains.length} Domains</div>
      {domains.length === 0 ? (
        <div className="empty">Keine Daten.</div>
      ) : (
        <ol className="list scrolllist">
          {domains.map((r, i) => (
            <DomainRow key={r.domain} r={r} i={i} maxMs={maxMs} />
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------- Unterseite: Suchbegriffe (alphabetisch) --------------------- */

function Keywords({ keywords, label, onBack }) {
  const sorted = [...keywords].sort((a, b) => a.term.localeCompare(b.term, 'de'));
  return (
    <div className="wrap">
      <header className="head">
        <button className="gear" onClick={onBack} title="Zurück">←</button>
        <div className="brand" style={{ flex: 1, justifyContent: 'center' }}>Suchbegriffe</div>
        <span style={{ width: 28 }} />
      </header>
      <div className="hintline" style={{ textAlign: 'center' }}>{label} · {sorted.length} Begriffe</div>
      {sorted.length === 0 ? (
        <div className="empty">
          Noch keine Suchbegriffe erfasst.<br />
          Such mal über Google &amp; Co. — sie erscheinen hier.
        </div>
      ) : (
        <div className="kwlist scrolllist">
          {sorted.map((k) => (
            <span key={k.term} className="kwitem">
              <span className="kwterm">{k.term}</span>
              <span className="kwcount">{k.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Einstellungen ------------------------------------------------ */

function Settings({ onBack }) {
  const [exclude, setExclude] = useState([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [input, setInput] = useState('');

  useEffect(() => {
    getSettings().then((s) => { setExclude(s.exclude); setRetentionDays(s.retentionDays); });
  }, []);

  async function addExclude() {
    const d = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!d || exclude.includes(d)) { setInput(''); return; }
    const next = [...exclude, d];
    setExclude(next);
    setInput('');
    await setSetting({ exclude: next });
  }

  async function removeExclude(d) {
    const next = exclude.filter((x) => x !== d);
    setExclude(next);
    await setSetting({ exclude: next });
  }

  async function changeRetention(e) {
    const v = Number(e.target.value);
    setRetentionDays(v);
    await setSetting({ retentionDays: v });
  }

  return (
    <div className="wrap">
      <header className="head">
        <button className="gear" onClick={onBack} title="Zurück">←</button>
        <div className="brand" style={{ flex: 1, justifyContent: 'center' }}>Einstellungen</div>
        <span style={{ width: 28 }} />
      </header>

      <section>
        <div className="section-title">Ausschlussliste</div>
        <div className="hintline">Diese Domains werden nie getrackt (z. B. Banking).</div>
        <div className="addrow">
          <input
            className="textin"
            placeholder="z. B. meinebank.de"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addExclude(); }}
          />
          <button className="addbtn" onClick={addExclude}>+</button>
        </div>
        {exclude.length === 0 ? (
          <div className="hintline">Noch keine Domains ausgeschlossen.</div>
        ) : (
          <ul className="taglist">
            {exclude.map((d) => (
              <li key={d} className="tag">
                {d}
                <button className="tagx" onClick={() => removeExclude(d)}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="section-title">Aufbewahrung roher Ereignisse</div>
        <div className="hintline">Tages-Statistiken bleiben immer erhalten; das betrifft nur die minutengenaue Historie.</div>
        <select className="select" value={retentionDays} onChange={changeRetention}>
          <option value={30}>30 Tage</option>
          <option value={90}>90 Tage</option>
          <option value={0}>Unbegrenzt</option>
        </select>
      </section>

      <footer className="foot">
        <span className="hint">Alle Daten bleiben auf deinem Gerät.</span>
      </footer>
    </div>
  );
}
