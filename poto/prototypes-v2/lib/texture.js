/* Poto v2 — 2D textures for the DOM pages (diary, rolls), from the same paper maker as the postcard.
   Everything is baked once into a small tile and used as a plain background image: no blend modes, no live filters,
   so scrolling and spinning stay on the compositor. */
(function () {
  const T = (window.PotoTex = {});
  const S = 512, mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const cache = {};

  /* lit paper: the stock's cloudy formation as tone, its tooth lit from the top left. color [r,g,b] */
  T.paper = function (seed, color, o) {
    o = Object.assign({ cloud: 0.05, light: 0.9, flecks: 50, fibres: 420, tooth: 1 }, o || {});
    const key = 'p' + seed + color.join() + JSON.stringify(o); if (cache[key]) return cache[key];
    const st = window.PotoPaper.stock({ seed, cloud: 0.5, flecks: o.flecks, fibres: o.fibres, tooth: o.tooth, inkBite: 1 });
    const tone = st.tone.getContext('2d').getImageData(0, 0, S, S).data, h = st.height.getContext('2d').getImageData(0, 0, S, S).data;
    const c = mk(S, S), x = c.getContext('2d'), out = x.createImageData(S, S), d = out.data;
    for (let y = 0; y < S; y++) for (let k = 0; k < S; k++) {
      const i = y * S + k, a = ((y + S - 1) % S) * S + (k + S - 1) % S, b = ((y + 1) % S) * S + (k + 1) % S;
      const t = (tone[i * 4] - 128) / 128 * o.cloud, l = (h[a * 4] - h[b * 4]) / 255 * o.light * 0.5, m = 1 + t + l;
      d[i * 4] = color[0] * m; d[i * 4 + 1] = color[1] * m; d[i * 4 + 2] = color[2] * m; d[i * 4 + 3] = 255;
    }
    x.putImageData(out, 0, 0); return (cache[key] = c);
  };

  /* fine grain: transparent tile with dark and light specks. Used over film, metal, glass. */
  T.grain = function (amount, seed) {
    const key = 'g' + amount + '_' + seed; if (cache[key]) return cache[key];
    const c = mk(256, 256), x = c.getContext('2d'), id = x.createImageData(256, 256), d = id.data; let s = seed || 9;
    for (let i = 0; i < d.length; i += 4) { s = (s * 1664525 + 1013904223) >>> 0; const v = s / 4294967296 - 0.5, on = v > 0; d[i] = d[i + 1] = d[i + 2] = on ? 255 : 0; d[i + 3] = Math.abs(v) * 2 * 255 * amount; }
    x.putImageData(id, 0, 0); return (cache[key] = c);
  };

  /* brushed metal strip (for canister caps): horizontal streaks */
  T.brushed = function (w, h, seed) {
    const c = mk(w, h), x = c.getContext('2d'); let s = seed || 3; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < h * 6; i++) { x.fillStyle = r() > 0.5 ? 'rgba(255,255,255,' + r() * 0.18 + ')' : 'rgba(0,0,0,' + r() * 0.14 + ')'; x.fillRect(r() * w - w * 0.3, r() * h, w * (0.2 + r() * 0.8), 0.6); }
    return c;
  };

  /* a tile as a CSS url (blob, so it isn't a huge data URI) */
  T.url = (c) => new Promise((res) => c.toBlob((b) => res(URL.createObjectURL(b)), 'image/png'));

  /* frosted folder pockets without a live backdrop blur: bake what's behind (the prints) blurred into the pocket once */
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  T.frostFolder = async function (folder) {
    const pocket = folder.querySelector('.pocket'); if (!pocket || pocket.dataset.baked) return; pocket.dataset.baked = 1;
    const ims = await Promise.all([...folder.querySelectorAll('.p img')].map((i) => load(i.currentSrc || i.src)));
    const W = 240, H = 140, c = mk(W, H), x = c.getContext('2d');
    x.fillStyle = '#EFEEEA'; x.fillRect(0, 0, W, H);
    const pos = [[0.06, -7], [0.28, 2], [0.5, 8]];
    ims.forEach((im, k) => { if (!im) return; const [l, rot] = pos[k] || pos[0], w = W * 0.46, h = w * 1.45; x.save(); x.translate(W * l + w / 2, -H * 0.55 + h / 2); x.rotate(rot * Math.PI / 180);
      x.fillStyle = '#FDFCFA'; x.fillRect(-w / 2, -h / 2, w, h); const k2 = Math.max((w * 0.92) / im.width, (w * 0.92 * 4 / 3) / im.height); x.drawImage(im, -w * 0.46, -h / 2 + w * 0.04, im.width * k2, im.height * k2); x.restore(); });
    const b = mk(W, H), bx = b.getContext('2d'); bx.filter = 'blur(9px) saturate(1.4)'; bx.drawImage(c, 0, 0); bx.filter = 'none';
    bx.fillStyle = 'rgba(255,255,255,.5)'; bx.fillRect(0, 0, W, H);
    bx.drawImage(T.grain(0.05, 4), 0, 0);
    pocket.style.backgroundImage = 'url(' + b.toDataURL('image/jpeg', 0.85) + ')'; pocket.style.backgroundSize = '100% 100%';
  };

  /* the shared page textures, set as CSS variables once per page */
  T.install = async function () {
    const r = document.documentElement.style;
    const [white, cream, film] = await Promise.all([T.url(T.paper(21, [252, 251, 248], { light: 0.3, cloud: 0.04 })), T.url(T.paper(33, [246, 241, 230], { cloud: 0.06, light: 0.22 })), T.url(T.grain(0.12, 7))]);
    r.setProperty('--paper-white', 'url(' + white + ')'); r.setProperty('--paper-cream', 'url(' + cream + ')'); r.setProperty('--grain', 'url(' + film + ')');
  };
})();
