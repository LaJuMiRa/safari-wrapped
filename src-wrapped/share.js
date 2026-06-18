// share.js — erzeugt lokal (Canvas) eine teilbare PNG-Zusammenfassung.
// Kein Upload, kein Netzwerk: das Bild wird nur als Datei heruntergeladen.

function fmtTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function makeShareImage(d, t) {
  const period = t(`per.${d.periodKey}`);
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#7b5cff');
  g.addColorStop(1, '#1db954');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const pad = 90;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.textBaseline = 'alphabetic';

  ctx.font = '700 34px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('BROWSING WRAPPED', pad, 150);

  ctx.font = '800 96px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText(t('share.title', { period }), pad, 270);

  const hours = d.totalMs / 3600000;
  const big = hours >= 1
    ? `${(hours < 10 ? hours.toFixed(1) : Math.round(hours)).toString().replace('.', ',')} h`
    : `${Math.max(1, Math.round(d.totalMs / 60000))} min`;
  ctx.font = '800 150px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText(big, pad, 460);
  ctx.font = '500 38px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(t('share.subtitle', { visits: d.totalVisits, domains: d.domainCount }), pad, 510);

  let y = 640;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = '700 44px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText(t('share.topsites'), pad, y);
  y += 70;
  ctx.font = '500 40px -apple-system, Helvetica, Arial, sans-serif';
  d.domains.slice(0, 3).forEach((r, i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(`${i + 1}. ${r.domain}`, pad, y);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(fmtTime(r.timeMs), W - pad, y);
    ctx.textAlign = 'left';
    y += 64;
  });

  const themeSrc = (d.themes && d.themes.length) ? d.themes : (d.keywords || []);
  if (themeSrc.length) {
    y += 40;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '700 44px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText(t('share.themes'), pad, y);
    y += 64;
    ctx.font = '500 40px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const terms = themeSrc.slice(0, 5).map((x) => x.label || x.term).join(' · ');
    wrapText(ctx, terms, pad, y, W - pad * 2, 56);
  }

  if (d.categories && d.categories.length) {
    const barY = H - 215, barH = 26, barW = W - pad * 2;
    const total = d.categories.reduce((s, cat) => s + cat.timeMs, 0) || 1;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 34px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText(t('share.topcat', { label: t(`cat.${d.categories[0].key}`) }), pad, barY - 22);
    let cx = pad;
    for (const cat of d.categories) {
      const w = (cat.timeMs / total) * barW;
      ctx.fillStyle = cat.color;
      ctx.fillRect(cx, barY, w, barH);
      cx += w;
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '500 30px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText(t('share.footer'), pad, H - 60);

  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browsing-wrapped-${d.periodKey}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}
