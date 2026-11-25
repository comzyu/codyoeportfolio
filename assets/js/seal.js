// Hero seal: ink particles gather from a loose cloud into the horse seal, then the
// crisp logo fades in over them and the canvas stops. Hover tilts it; click replays.
// Runs about 2 seconds, then costs nothing.
(() => {
  const box = document.querySelector('.seal');
  if (!box) return;
  const img = box.querySelector('img'), cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { box.classList.add('done'); return; }

  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let parts = [], W, H, pad, dpr, raf = 0, dot = 2;

  function sample(){
    const r = box.getBoundingClientRect();
    W = r.width; H = r.height; pad = Math.round(Math.max(W, H) * (W < 80 ? 1.6 : .9)); dpr = Math.min(devicePixelRatio || 1, 2);
    Object.assign(cv.style, {left: -pad + 'px', top: -pad + 'px', width: W + pad * 2 + 'px', height: H + pad * 2 + 'px'});
    cv.width = (W + pad * 2) * dpr; cv.height = (H + pad * 2) * dpr;
    const o = document.createElement('canvas'), sw = Math.round(W), sh = Math.round(H);
    o.width = sw; o.height = sh;
    const g = o.getContext('2d', {willReadFrequently: true});
    g.drawImage(img, 0, 0, sw, sh);
    const d = g.getImageData(0, 0, sw, sh).data;
    parts = []; seed = 7;
    dot = W < 80 ? 1 : 2; // finer grain when the seal is small
    const cx = pad + W / 2, cy = pad + H / 2;
    for (let y = 0; y < sh; y += dot) for (let x = 0; x < sw; x += dot) {
      if (d[(y * sw + x) * 4 + 3] < 128) continue;
      const a = rnd() * Math.PI * 2, rad = pad * (.45 + rnd() * .5);
      parts.push({tx: pad + x, ty: pad + y, sx: cx + Math.cos(a) * rad, sy: cy + Math.sin(a) * rad * .8, delay: rnd() * .45});
    }
  }

  function play(){
    cancelAnimationFrame(raf);
    box.classList.remove('done');
    if (!parts.length) sample();
    const t0 = performance.now();
    let shown = false;
    const frame = now => {
      const el = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W + pad * 2, H + pad * 2);
      ctx.fillStyle = '#161514';
      for (const p of parts) {
        const t = Math.min(Math.max((el - p.delay) / 1.1, 0), 1);
        const e = 1 - Math.pow(2, -10 * t); // expo out: fast travel, soft landing
        ctx.globalAlpha = .15 + .85 * e;
        ctx.fillRect(p.sx + (p.tx - p.sx) * e, p.sy + (p.ty - p.sy) * e, dot, dot);
      }
      if (!shown && el > 1.35) { shown = true; box.classList.add('done'); }
      if (el < 2.3) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W + pad * 2, H + pad * 2);
    };
    raf = requestAnimationFrame(frame);
  }

  const start = () => setTimeout(play, 450);
  img.complete ? start() : img.addEventListener('load', start, {once: true});
  box.addEventListener('click', play);
  addEventListener('resize', () => { parts = []; });

  // Gentle 3D tilt toward the cursor; the loop sleeps once it settles
  const hero = document.getElementById('hero');
  let tx = 0, ty = 0, x = 0, y = 0, tilting = false;
  const tilt = () => {
    x += (tx - x) * .12; y += (ty - y) * .12;
    box.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > .02) requestAnimationFrame(tilt); else tilting = false;
  };
  const kick = () => { if (!tilting) { tilting = true; requestAnimationFrame(tilt); } };
  if (matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = box.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 500)) * 14;
      ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 500)) * -14;
      kick();
    });
    hero.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
  }
})();
