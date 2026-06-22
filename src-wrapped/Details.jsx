// Details.jsx — full-screen page (new tab) for "All sites" / "Search terms".
// Works around the height limit of the Safari popover: here a fixed header +
// scrolling body works just fine.

import { useEffect, useState } from 'react';
import { getRange, getKeywordsRange, todayStr } from '../extension/db.js';
import { makeT, getLang } from '../src-popup/i18n.js';

const DAYS = { today: 0, week: 6, month: 29 };

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayStr(d);
}

function fmtTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return '<1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function colorFor(domain) {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 55%)`;
}

export default function Details() {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') === 'keywords' ? 'keywords' : 'allsites';
  const period = ['today', 'week', 'month'].includes(params.get('period')) ? params.get('period') : 'today';

  const [lang, setLang] = useState('de');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const t = makeT(lang);

  useEffect(() => { getLang().then(setLang); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const start = dateNDaysAgo(DAYS[period]);
      const end = todayStr();
      let result = [];
      if (mode === 'allsites') {
        const rows = await getRange(start, end);
        const m = new Map();
        for (const r of rows) {
          const c = m.get(r.domain) || { domain: r.domain, timeMs: 0, visits: 0 };
          c.timeMs += r.timeMs; c.visits += r.visits; m.set(r.domain, c);
        }
        result = [...m.values()].sort((a, b) => b.timeMs - a.timeMs || b.visits - a.visits);
      } else {
        const rows = await getKeywordsRange(start, end);
        const m = new Map();
        for (const k of rows) m.set(k.term, (m.get(k.term) || 0) + k.count);
        result = [...m.entries()].map(([term, count]) => ({ term, count }))
          .sort((a, b) => a.term.localeCompare(b.term, lang));
      }
      if (alive) { setItems(result); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [mode, period, lang]);

  const title = mode === 'allsites' ? t('page.allsites') : t('page.keywords');
  const maxMs = mode === 'allsites' && items.length ? items[0].timeMs : 0;

  return (
    <div className="dpage">
      <header className="dhead">
        <div className="dhead-inner">
          <div className="dtitle">{title}</div>
          <div className="dmeta">{t(`per.${period}`)} · {items.length}</div>
          <button className="dclose" onClick={() => window.close()} aria-label={t('w.close')}>✕</button>
        </div>
      </header>

      <main className="dbody">
        {loading ? (
          <div className="dempty">…</div>
        ) : items.length === 0 ? (
          <div className="dempty">{mode === 'keywords' ? t('keywords.empty') : t('common.nodata')}</div>
        ) : mode === 'allsites' ? (
          <ol className="dlist">
            {items.map((r, i) => (
              <li key={r.domain} className="drow">
                <span className="drank">{i + 1}</span>
                <span className="dfav" style={{ background: colorFor(r.domain) }}>{r.domain.charAt(0).toUpperCase()}</span>
                <span className="dname">{r.domain}</span>
                <span className="dbar"><span style={{ width: maxMs ? `${Math.max(4, (r.timeMs / maxMs) * 100)}%` : '4%' }} /></span>
                <span className="dvals"><b>{fmtTime(r.timeMs)}</b><span>{r.visits}×</span></span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="dkw">
            {items.map((k) => (
              <span key={k.term} className="dchip">{k.term}<b>{k.count}</b></span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
