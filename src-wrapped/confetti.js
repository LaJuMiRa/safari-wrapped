// confetti.js — kleines, eigenständiges Konfetti (kein externes Paket).
// Zeichnet fallende Schnipsel auf ein temporäres Canvas und räumt selbst auf.

export function launchConfetti(durationMs = 2600) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#7b5cff', '#1db954', '#ff6b6b', '#0ea5e9', '#f59e0b', '#ec4899', '#ffffff'];
  const N = Math.min(180, Math.round(window.innerWidth / 8));
  const parts = [];
  for (let i = 0; i < N; i++) {
    parts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[(Math.random() * colors.length) | 0],
      vy: 2 + Math.random() * 4,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
    });
  }

  const start = performance.now();
  let raf = 0;
  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const fade = elapsed > durationMs - 700 ? Math.max(0, (durationMs - elapsed) / 700) : 1;
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < durationMs) {
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
    }
  }
  raf = requestAnimationFrame(frame);
}
