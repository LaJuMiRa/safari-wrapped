import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildWrapped, PERIODS } from './data.js';
import { makeShareImage } from './share.js';
import { launchConfetti } from './confetti.js';
import { makeT, getLang } from '../src-popup/i18n.js';

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
    return { num, unitKey: 'w.total.hours' };
  }
  return { num: String(Math.max(1, Math.round(ms / 60000))), unitKey: 'w.total.minutes' };
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

function Slide({ children }) {
  return <div className="slide-inner">{children}</div>;
}

/* ---------- Folien ---------- */

function buildSlides(d, t) {
  const slides = [];
  const period = t(`per.${d.periodKey}`);

  slides.push(() => (
    <Slide>
      <div className="kicker">Browsing Wrapped</div>
      <h1 className="title">{t('w.intro.title', { period })}</h1>
      <div className="sub">{d.start} – {d.end}</div>
      <div className="tap-hint">{t('w.intro.hint')}</div>
    </Slide>
  ));

  const bt = bigTime(d.totalMs);
  slides.push(() => (
    <Slide>
      <div className="kicker">{t('w.total.kicker')}</div>
      <div className="huge">{bt.num}</div>
      <div className="huge-unit">{t(bt.unitKey)}</div>
      <div className="sub">{t('w.total.sub', { visits: d.totalVisits })}</div>
    </Slide>
  ));

  if (d.funFacts.episodes >= 1) {
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.fun.kicker')}</div>
        <h2 className="title2">{t('w.fun.title', { n: d.funFacts.episodes })}</h2>
        <div className="sub">{t('w.fun.sub', { movies: String(d.funFacts.movies), period })}</div>
      </Slide>
    ));
  }

  slides.push(() => (
    <Slide>
      <div className="kicker">{t('w.count.kicker')}</div>
      <div className="huge">{d.domainCount}</div>
      <div className="huge-unit">{t('w.count.unit')}</div>
      {d.busiestDay && (
        <div className="sub">{t('w.count.sub', { date: d.busiestDay.date, time: fmtTime(d.busiestDay.timeMs) })}</div>
      )}
    </Slide>
  ));

  if (d.topDomain) {
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.top1.kicker')}</div>
        <div className="hero-tile" style={{ background: colorFor(d.topDomain.domain) }}>
          {d.topDomain.domain.charAt(0).toUpperCase()}
        </div>
        <h2 className="title2">{d.topDomain.domain}</h2>
        <div className="sub">{t('w.top1.sub', { time: fmtTime(d.topDomain.timeMs), visits: d.topDomain.visits })}</div>
      </Slide>
    ));
  }

  if (d.domains.length > 1) {
    const max = d.domains[0].timeMs || 1;
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.top5.kicker')}</div>
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
        <div className="kicker">{t('w.pers.kicker')}</div>
        <div className="emoji">{p.emoji}</div>
        <h2 className="title2">{t(`pers.${p.key}`)}</h2>
        <div className="sub">{t('w.pers.sub', { hour: p.peakHour, pct: Math.round(p.nightShare * 100) })}</div>
      </Slide>
    ));
  }

  if (d.busiestWeekday) {
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.wd.kicker')}</div>
        <h2 className="title2">{t(`wd.${d.busiestWeekday.index}`)}</h2>
        <div className="sub">{t('w.wd.sub', { pct: Math.round(d.busiestWeekday.share * 100) })}</div>
      </Slide>
    ));
  }

  if (d.themes.length) {
    const maxK = d.themes[0].count || 1;
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.themes.kicker')}</div>
        <div className="wcloud">
          {d.themes.slice(0, 22).map((th) => (
            <span key={th.key} style={{ fontSize: `${18 + (th.count / maxK) * 30}px`, opacity: 0.6 + (th.count / maxK) * 0.4 }}>
              {th.label}
            </span>
          ))}
        </div>
      </Slide>
    ));
  }

  if (d.trends.length) {
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.trend.kicker')}</div>
        <h2 className="title2">{t('w.trend.title')}</h2>
        <div className="trendlist">
          {d.trends.map((tr) => (
            <span key={tr.label} className="trendchip">{tr.label} <b>+{tr.delta}</b></span>
          ))}
        </div>
        <div className="sub">{t('w.trend.sub', { period })}</div>
      </Slide>
    ));
  }

  if (d.categories.length) {
    const top = d.categories[0];
    slides.push(() => (
      <Slide>
        <div className="kicker">{t('w.cats.kicker')}</div>
        <div className="catbar-big">
          {d.categories.map((c) => (
            <span key={c.key} style={{ width: `${(c.timeMs / d.totalMs) * 100}%`, background: c.color }} />
          ))}
        </div>
        <div className="catleg-big">
          {d.categories.slice(0, 6).map((c) => (
            <span key={c.key}><i style={{ background: c.color }} />{t(`cat.${c.key}`)} · {fmtTime(c.timeMs)}</span>
          ))}
        </div>
        <div className="sub">{t('w.cats.sub', { label: t(`cat.${top.key}`) })}</div>
      </Slide>
    ));
  }

  slides.push(() => (
    <Slide>
      <div className="kicker">{t('w.outro.kicker', { period })}</div>
      <div className="recap">
        <div><b>{bt.num}</b><span>{t(bt.unitKey)}</span></div>
        <div><b>{d.domainCount}</b><span>{t('w.count.unit')}</span></div>
        <div><b>{d.keywords.length}</b><span>{t('w.outro.searches')}</span></div>
      </div>
      <div className="outro-actions">
        <button className="share-btn" onClick={(e) => { e.stopPropagation(); makeShareImage(d, t); }}>
          {t('w.outro.share')}
        </button>
        <button className="close-btn" onClick={(e) => { e.stopPropagation(); window.close(); }}>
          {t('w.close')}
        </button>
      </div>
      <div className="sub">{t('w.outro.sub')}</div>
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

  const [lang, setLang] = useState('de');
  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const t = makeT(lang);

  useEffect(() => { getLang().then(setLang); }, []);

  const reload = useCallback(async (p) => {
    setLoading(true);
    const d = await buildWrapped(p);
    setData(d);
    setIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => { reload(period); }, [period, reload]);

  // Folien aus Daten + Sprache ableiten (neu bei Sprachwechsel).
  const slides = useMemo(() => (data ? buildSlides(data, t) : []), [data, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = slides.length;

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, count - 1)), [count]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') window.close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  useEffect(() => {
    if (!loading && data && count > 0 && idx === count - 1) launchConfetti();
  }, [idx, count, loading, data]);

  if (loading || !data) {
    return <div className="stage center"><div className="loader">{t('w.loading')}</div></div>;
  }

  if (data.domainCount === 0) {
    return (
      <div className="stage center" style={{ background: BG[0] }}>
        <div className="slide-inner">
          <h1 className="title">{t('w.empty.title')}</h1>
          <div className="sub">{t('w.empty.sub', { period: t(`per.${period}`) })}</div>
          <div className="periodswitch" onClick={(e) => e.stopPropagation()}>
            {Object.keys(PERIODS).map((k) => (
              <button key={k} className={k === period ? 'on' : ''} onClick={() => setPeriod(k)}>{t(`per.${k}`)}</button>
            ))}
          </div>
          <button className="close-btn" onClick={() => window.close()}>{t('w.close')}</button>
        </div>
      </div>
    );
  }

  const Cur = slides[Math.min(idx, count - 1)];

  return (
    <div className="stage" style={{ background: BG[idx % BG.length] }} onClick={next}>
      <div className="progress" onClick={(e) => e.stopPropagation()}>
        {slides.map((_, i) => (
          <span key={i} className="pseg"><i style={{ width: i <= idx ? '100%' : '0%' }} /></span>
        ))}
      </div>

      <div className="topbar" onClick={(e) => e.stopPropagation()}>
        <div className="periodswitch small">
          {Object.keys(PERIODS).map((k) => (
            <button key={k} className={k === period ? 'on' : ''} onClick={() => setPeriod(k)}>{t(`per.${k}`)}</button>
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
