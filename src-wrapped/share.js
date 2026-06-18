// share.js — erzeugt lokal (Canvas) eine teilbare PNG-Zusammenfassung.
// Kein Upload, kein Netzwerk: das Bild wird nur als Datei heruntergeladen.

function fmtTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function makeShareImage(d) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Hintergrund-Verlauf
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
  ctx.fillText(`Dein ${d.periodLabel}`, pad, 270);

  // Gesamtzeit
  const hours = d.totalMs / 3600000;
  const big = hours >= 1 ? `${(hours < 10 ? hours.toFixed(1) : Math.round(hours)).toString().replace('.', ',')} h` : `${Math.max(1, Math.round(d.totalMs / 60000))} min`;
  ctx.font = '800 150px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText(big, pad, 460);
  ctx.font = '500 38px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`aktiv · ${d.totalVisits} Aufrufe · ${d.domainCount} Websites`, pad, 510);

  let y = 640;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = '700 44px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('Top-Websites', pad, y);
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

  if (d.keywords && d.keywords.length) {
    y += 40;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '700 44px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText('Themen', pad, y);
    y += 64;
    ctx.font = '500 40px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const terms = d.keywords.slice(0, 5).map((k) => k.term).join(' · ');
    wrapText(ctx, terms, pad, y, W - pad * 2, 56);
  }

  if (d.categories && d.categories.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 36px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText(`Größte Kategorie: ${d.categories[0].label}`, pad, H - 120);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '500 30px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('100 % lokal erstellt', pad, H - 60);

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
