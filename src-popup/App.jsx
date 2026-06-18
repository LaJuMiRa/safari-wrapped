import { useCallback, useEffect, useState } from 'react';
import {
  getRange, getKeywordsRange, clearAll, todayStr,
} from '../extension/db.js';
import { CATEGORIES, categoryFor } from './categories.js';
import { makeT, getLang, LANGS } from './i18n.js';

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
  { key: 'today', days: 0 },
  { key: 'week', days: 6 },
  { key: 'month', days: 29 },
];

async function flushBackground() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'flush' });
    }
  } catch { /* Hintergrund evtl. nicht erreichbar */ }
}

const hasChrome = typeof chrome !== 'undefined' && chrome.storage;

async function getSettings() {
  if (!hasChrome) return { paused: false, exclude: [], retentionDays: 90, lang: 'de' };
  const s = await chrome.storage.local.get(['paused', 'exclude', 'retentionDays', 'lang']);
  return {
    paused: !!s.paused,
    exclude: Array.isArray(s.exclude) ? s.exclude : [],
    retentionDays: typeof s.retentionDays === 'number' ? s.retentionDays : 90,
    lang: s.lang === 'en' ? 'en' : 'de',
  };
}

async function setSetting(patch) {
  if (hasChrome) await chrome.storage.local.set(patch);
}

function openWrapped(period) {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL(`wrapped/index.html?period=${period}`) });
    }
  } catch { /* noop */ }
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
  const [lang, setLang] = useState('de');
  const [period, setPeriod] = useState('today');
  const [view, setView] = useState('main'); // 'main' | 'settings' | 'allsites' | 'keywords'
  const [domains, setDomains] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [cats, setCats] = useState([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dir, setDir] = useState('fwd'); // Richtung des letzten Ansichtswechsels

  const goTo = (v) => { setDir('fwd'); setView(v); };
  const goBack = () => { setDir('back'); setView('main'); };

  const t = makeT(lang);
  const pLabel = (key) => t(`per.${key}`);

  useEffect(() => { getLang().then(setLang); }, []);

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
        .map(([key, timeMs]) => ({ key, timeMs, color: CATEGORIES[key].color }))
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

  async function changeLang(next) {
    setLang(next);
    await setSetting({ lang: next });
  }

  async function doClear() {
    await clearAll();
    setConfirmClear(false);
    load(period);
  }

  if (view === 'settings') {
    return <Settings t={t} lang={lang} dir={dir} onLang={changeLang} onBack={() => { setDir('back'); setView('main'); load(period); }} />;
  }
  if (view === 'allsites') {
    return <AllSites t={t} lang={lang} dir={dir} domains={domains} maxMs={maxMs} label={pLabel(period)} onBack={goBack} />;
  }
  if (view === 'keywords') {
    return <Keywords t={t} lang={lang} dir={dir} keywords={keywords} label={pLabel(period)} onBack={goBack} />;
  }

  return (
    <div className={`wrap view-${dir}`}>
      <header className="head">
        <div className="brand">
          <span className="dot" />
          Browsing&nbsp;Wrapped
        </div>
        <div className="head-actions">
          <button className={`pause ${paused ? 'on' : ''}`} onClick={togglePause}>
            {paused ? '▶' : '❚❚'}
          </button>
          <button className="gear" title={t('settings.title')} onClick={() => goTo('settings')}>⚙</button>
        </div>
      </header>

      <div className="tabs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={`tab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {pLabel(p.key)}
          </button>
        ))}
      </div>

      <div className="summary">
        <div className="stat">
          <div className="num">{fmtTime(totalMs)}</div>
          <div className="lbl">{t('sum.active')}</div>
        </div>
        <div className="stat">
          <div className="num">{totalVisits}</div>
          <div className="lbl">{t('sum.visits')}</div>
        </div>
        <div className="stat">
          <div className="num">{domains.length}</div>
          <div className="lbl">{t('sum.domains')}</div>
        </div>
      </div>

      {paused && <div className="banner">{t('banner.paused')}</div>}

      <button className="wrapped-cta" onClick={() => openWrapped(period)}>
        {t('cta.wrapped', { period: pLabel(period) })}
      </button>

      {loading ? (
        <div className="empty">{t('common.loading')}</div>
      ) : domains.length === 0 ? (
        <div className="empty">{t('empty.main')}</div>
      ) : (
        <>
          {cats.length > 0 && (
            <section>
              <div className="section-title">{t('sec.categories')}</div>
              <div className="catbar">
                {cats.map((c) => (
                  <span
                    key={c.key}
                    className="catseg"
                    style={{ width: `${(c.timeMs / totalMs) * 100}%`, background: c.color }}
                    title={`${t(`cat.${c.key}`)} · ${fmtTime(c.timeMs)}`}
                  />
                ))}
              </div>
              <div className="catlegend">
                {cats.slice(0, 5).map((c) => (
                  <span key={c.key} className="catlegitem">
                    <span className="catdot" style={{ background: c.color }} />
                    {t(`cat.${c.key}`)}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-title">{t('sec.topsites')}</div>
            <ol className="list">
              {domains.slice(0, 5).map((r, i) => (
                <DomainRow key={r.domain} r={r} i={i} maxMs={maxMs} />
              ))}
            </ol>
          </section>

          <div className="navbtns">
            <button className="navbtn" onClick={() => goTo('allsites')}>
              {t('nav.allsites', { n: domains.length })}
            </button>
            <button className="navbtn" onClick={() => goTo('keywords')}>
              {t('nav.keywords', { n: keywords.length })}
            </button>
          </div>
        </>
      )}

      <footer className="foot">
        {confirmClear ? (
          <span className="confirm">
            {t('clear.confirm')}
            <button className="confirm-yes" onClick={doClear}>{t('common.yes')}</button>
            <button className="confirm-no" onClick={() => setConfirmClear(false)}>{t('common.no')}</button>
          </span>
        ) : (
          <button className="clear" onClick={() => setConfirmClear(true)}>{t('clear.btn')}</button>
        )}
        <span className="hint">{t('hint.local')}</span>
      </footer>
    </div>
  );
}

/* ---------- Unterseite: Alle Websites ----------------------------------- */

function AllSites({ t, dir, domains, maxMs, label, onBack }) {
  return (
    <div className={`wrap view-${dir}`}>
      <header className="subhead">
        <button className="backbtn" onClick={onBack} title="Zurück" aria-label="Zurück">‹</button>
        <span className="subtitle">{t('page.allsites')}</span>
      </header>
      <div className="hintline" style={{ textAlign: 'center' }}>{t('allsites.count', { label, n: domains.length })}</div>
      {domains.length === 0 ? (
        <div className="empty">{t('common.nodata')}</div>
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

function Keywords({ t, lang, dir, keywords, label, onBack }) {
  const sorted = [...keywords].sort((a, b) => a.term.localeCompare(b.term, lang));
  return (
    <div className={`wrap view-${dir}`}>
      <header className="subhead">
        <button className="backbtn" onClick={onBack} title="Zurück" aria-label="Zurück">‹</button>
        <span className="subtitle">{t('page.keywords')}</span>
      </header>
      <div className="hintline" style={{ textAlign: 'center' }}>{t('keywords.count', { label, n: sorted.length })}</div>
      {sorted.length === 0 ? (
        <div className="empty">{t('keywords.empty')}</div>
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

function Settings({ t, lang, dir, onLang, onBack }) {
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
    <div className={`wrap view-${dir}`}>
      <header className="subhead">
        <button className="backbtn" onClick={onBack} title="Zurück" aria-label="Zurück">‹</button>
        <span className="subtitle">{t('page.settings')}</span>
      </header>

      <section>
        <div className="section-title">{t('set.lang.title')}</div>
        <div className="langswitch">
          {LANGS.map((l) => (
            <button
              key={l.key}
              className={`langbtn ${lang === l.key ? 'on' : ''}`}
              onClick={() => onLang(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-title">{t('set.exclude.title')}</div>
        <div className="hintline">{t('set.exclude.hint')}</div>
        <div className="addrow">
          <input
            className="textin"
            placeholder={t('set.exclude.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addExclude(); }}
          />
          <button className="addbtn" onClick={addExclude}>+</button>
        </div>
        {exclude.length === 0 ? (
          <div className="hintline">{t('set.exclude.empty')}</div>
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
        <div className="section-title">{t('set.retention.title')}</div>
        <div className="hintline">{t('set.retention.hint')}</div>
        <select className="select" value={retentionDays} onChange={changeRetention}>
          <option value={30}>{t('set.retention.30')}</option>
          <option value={90}>{t('set.retention.90')}</option>
          <option value={0}>{t('set.retention.0')}</option>
        </select>
      </section>

      <footer className="foot">
        <span className="hint">{t('set.footer')}</span>
      </footer>
    </div>
  );
}
