import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildWrapped, PERIODS } from './data.js';
import { makeShareImage } from './share.js';

/* ---------- Helfer ---------- */

function fmtTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return '<1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function bigTime(ms) {
  const h = ms / 3600000;
  if (h >= 1) {
    const num = (h < 10 ? h.toFixed(1) : String(Math.round(h))).replace('.', ',');
    return { num, unit: 'Stunden aktiv' };
  }
  return { num: String(Math.max(1, Math.round(ms / 60000))), unit: 'Minuten aktiv' };
}

function colorFor(domain) {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = (h * 31 + domain.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 55%)`;
}

const BG = [
  'linear-gradient(160deg,#7b5cff,#1db954)',
  'linear-gradient(160deg,#ff6b6b,#7b5cff)',
  'linear-gradient(160deg,#0ea5e9,#7b5cff)',
  'linear-gradient(160deg,#f59e0b,#ef4444)',
  'linear-gradient(160deg,#1db954,#0ea5e9)',
  'linear-gradient(160deg,#a855f7,#ec4899)',
  'linear-gradient(160deg,#14b8a6,#7b5cff)',
  'linear-gradient(160deg,#ef4444,#f59e0b)',
  'linear-gradient(160deg,#7b5cff,#0ea5e9)',
  'linear-gradient(160deg,#1db954,#7b5cff)',
];

/* ---------- Folien-Bausteine ---------- */

function Slide({ children }) {
  return <div className="slide-inner">{children}</div>;
}

function buildSlides(d) {
  const slides = [];

  slides.push(() => (
    <Slide>
      <div className="kicker">Browsing Wrapped</div>
      <h1 className="title">Dein {d.periodLabel}<br />im Web</h1>
      <div className="sub">{d.start} – {d.end}</div>
      <div className="tap-hint">Tippe dich durch ✨</div>
    </Slide>
  ));

  const bt = bigTime(d.totalMs);
  slides.push(() => (
    <Slide>
      <div className="kicker">Insgesamt</div>
      <div className="huge">{bt.num}</div>
      <div className="huge-unit">{bt.unit}</div>
      <div className="sub">{d.totalVisits} Seitenaufrufe in diesem Zeitraum</div>
    </Slide>
  ));

  slides.push(() => (
    <Slide>
      <div className="kicker">Unterwegs auf</div>
      <div className="huge">{d.domainCount}</div>
      <div className="huge-unit">Websites</div>
      {d.busiestDay && (
        <div className="sub">Aktivster Tag: {d.busiestDay.date} · {fmtTime(d.busiestDay.timeMs)}</div>
      )}
    </Slide>
  ));

  if (d.topDomain) {
    slides.push(() => (
      <Slide>
        <div className="kicker">Dein Lieblingsort im Netz</div>
        <div className="hero-tile" style={{ background: colorFor(d.topDomain.domain) }}>
          {d.topDomain.domain.charAt(0).toUpperCase()}
        </div>
        <h2 className="title2">{d.topDomain.domain}</h2>
        <div className="sub">{fmtTime(d.topDomain.timeMs)} · {d.topDomain.visits} Aufrufe</div>
      </Slide>
    ));
  }

  if (d.domains.length > 1) {
    const max = d.domains[0].timeMs || 1;
    slides.push(() => (
      <Slide>
        <div className="kicker">Deine Top 5</div>
        <ol className="toplist">
          {d.domains.slice(0, 5).map((r, i) => (
            <li key={r.domain}>
              <span className="ti">{i + 1}</span>
              <span className="td">{r.domain}</span>
              <span className="tb"><span style={{ width: `${Math.max(6, (r.timeMs / max) * 100)}%` }} /></span>
              <span className="tt">{fmtTime(r.timeMs)}</span>
            </li>
          ))}
        </ol>
      </Slide>
    ));
  }

  if (d.personality) {
    const p = d.personality;
    slides.push(() => (
      <Slide>
        <div className="kicker">Dein Browsing-Typ</div>
        <div className="emoji">{p.emoji}</div>
        <h2 className="title2">{p.label}</h2>
        <div className="sub">
          Spitzenzeit gegen {p.peakHour} Uhr · {Math.round(p.nightShare * 100)} % deiner Aufrufe nachts
        </div>
      </Slide>
    ));
  }

  if (d.keywords.length) {
    const maxK = d.keywords[0].count || 1;
    slides.push(() => (
      <Slide>
        <div className="kicker">Deine Themen</div>
        <div className="wcloud">
          {d.keywords.slice(0, 24).map((k) => (
            <span key={k.term} style={{ fontSize: `${18 + (k.count / maxK) * 30}px`, opacity: 0.6 + (k.count / maxK) * 0.4 }}>
              {k.term}
            </span>
          ))}
        </div>
      </Slide>
    ));
  }

  if (d.trends.length) {
    slides.push(() => (
      <Slide>
        <div className="kicker">Im Aufwind</div>
        <h2 className="title2">Das beschäftigt dich gerade</h2>
        <div className="trendlist">
          {d.trends.map((t) => (
            <span key={t.term} className="trendchip">
              {t.term} <b>+{t.delta}</b>
            </span>
          ))}
        </div>
        <div className="sub">stärker als im {d.periodLabel} davor</div>
      </Slide>
    ));
  }

  if (d.categories.length) {
    const top = d.categories[0];
    slides.push(() => (
      <Slide>
        <div className="kicker">Deine Kategorien</div>
        <div className="catbar-big">
          {d.categories.map((c) => (
            <span key={c.key} style={{ width: `${(c.timeMs / d.totalMs) * 100}%`, background: c.color }} title={c.label} />
          ))}
        </div>
        <div className="catleg-big">
          {d.categories.slice(0, 6).map((c) => (
            <span key={c.key}><i style={{ background: c.color }} />{c.label} · {fmtTime(c.timeMs)}</span>
          ))}
        </div>
        <div className="sub">Größte Kategorie: <b>{top.label}</b></div>
      </Slide>
    ));
  }

  slides.push(() => (
    <Slide>
      <div className="kicker">Das war dein {d.periodLabel}</div>
      <div className="recap">
        <div><b>{bigTime(d.totalMs).num}</b><span>{bigTime(d.totalMs).unit}</span></div>
        <div><b>{d.domainCount}</b><span>Websites</span></div>
        <div><b>{d.keywords.length}</b><span>Suchbegriffe</span></div>
      </div>
      <div className="outro-actions">
        <button className="share-btn" onClick={(e) => { e.stopPropagation(); makeShareImage(d); }}>
          📷 Als Bild speichern
        </button>
        <button className="close-btn" onClick={(e) => { e.stopPropagation(); window.close(); }}>
          Schließen
        </button>
      </div>
      <div className="sub">100 % lokal erstellt · nichts verlässt dein Gerät</div>
    </Slide>
  ));

  return slides;
}

/* ---------- Hauptkomponente ---------- */

export default function Wrapped() {
  const initialPeriod = useMemo(() => {
    try {
      const p = new URLSearchParams(location.search).get('period');
      return PERIODS[p] ? p : 'week';
    } catch { return 'week'; }
  }, []);

  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const slidesRef = useRef([]);

  const reload = useCallback(async (p) => {
    setLoading(true);
    const d = await buildWrapped(p);
    slidesRef.current = buildSlides(d);
    setData(d);
    setIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => { reload(period); }, [period, reload]);

  const count = slidesRef.current.length;
  const next = useCallback(() => setIdx((i) => Math.min(i + 1, count - 1)), [count]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { next(); }
      else if (e.key === 'ArrowLeft') { prev(); }
      else if (e.key === 'Escape') { window.close(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  if (loading || !data) {
    return <div className="stage center"><div className="loader">Dein Wrapped wird erstellt…</div></div>;
  }

  const empty = data.domainCount === 0;
  if (empty) {
    return (
      <div className="stage center" style={{ background: BG[0] }}>
        <div className="slide-inner">
          <h1 className="title">Noch zu wenig Daten</h1>
          <div className="sub">Für ein {data.periodLabel}-Wrapped fehlt noch Verlauf.<br />Surf ein paar Tage — dann wird's bunt.</div>
          <div className="periodswitch" onClick={(e) => e.stopPropagation()}>
            {Object.entries(PERIODS).map(([k, v]) => (
              <button key={k} className={k === period ? 'on' : ''} onClick={() => setPeriod(k)}>{v.label}</button>
            ))}
          </div>
          <button className="close-btn" onClick={() => window.close()}>Schließen</button>
        </div>
      </div>
    );
  }

  const Cur = slidesRef.current[idx];

  return (
    <div className="stage" style={{ background: BG[idx % BG.length] }} onClick={next}>
      <div className="progress" onClick={(e) => e.stopPropagation()}>
        {slidesRef.current.map((_, i) => (
          <span key={i} className="pseg"><i style={{ width: i <= idx ? '100%' : '0%' }} /></span>
        ))}
      </div>

      <div className="topbar" onClick={(e) => e.stopPropagation()}>
        <div className="periodswitch small">
          {Object.entries(PERIODS).map(([k, v]) => (
            <button key={k} className={k === period ? 'on' : ''} onClick={() => setPeriod(k)}>{v.label}</button>
          ))}
        </div>
        <button className="x" onClick={() => window.close()}>✕</button>
      </div>

      {idx > 0 && (
        <button className="navarrow left" onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
      )}

      <div className="slide" key={idx}>
        <Cur />
      </div>
    </div>
  );
}
