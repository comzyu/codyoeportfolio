/* Poto v2 — paper, ink and print textures, drawn at load. No image assets except the photo.
   Every surface comes back as three canvases: colour, roughness, height (-> normal map).

   Round 2 changes (Cody, 16 Nov): the card read as shiny plastic and the ink as printed-on.
   - Paper stock is now multi-scale: cloudy formation (seen in colour), tooth (seen in light), fibres and flecks.
   - Ink is composited with MULTIPLY so the paper shows through it, and ink coverage follows the tooth:
     a typebar hits the peaks and misses the valleys; pen ink runs into the valleys and skips the peaks. */
(function () {
  const P = (window.PotoPaper = {});
  const TW = 1024, TH = 1448;                       // A6 postcard, 105 x 148 mm
  P.size = { w: TW, h: TH };
  const rnd = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const S = 512;                                    // stock tile size (tileable)

  /* tileable value noise: sum of smoothly interpolated random lattices. Returns Float32 in roughly [-1, 1]. */
  function field(seed, octaves) {
    const r = rnd(seed), out = new Float32Array(S * S);
    for (const [cell, amp] of octaves) {
      const g = Math.max(1, Math.round(S / cell)), lat = new Float32Array(g * g); for (let i = 0; i < lat.length; i++) lat[i] = r() * 2 - 1;
      for (let y = 0; y < S; y++) {
        const fy = (y / S) * g, y0 = Math.floor(fy) % g, y1 = (y0 + 1) % g; let ty = fy - Math.floor(fy); ty = ty * ty * (3 - 2 * ty);
        for (let x = 0; x < S; x++) {
          const fx = (x / S) * g, x0 = Math.floor(fx) % g, x1 = (x0 + 1) % g; let tx = fx - Math.floor(fx); tx = tx * tx * (3 - 2 * tx);
          const a = lat[y0 * g + x0], b = lat[y0 * g + x1], c = lat[y1 * g + x0], d = lat[y1 * g + x1];
          out[y * S + x] += amp * ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty);
        }
      }
    }
    return out;
  }
  function toCanvas(f, mapFn) {
    const c = mk(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    for (let i = 0; i < f.length; i++) { const [v, a] = mapFn(f[i], i); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = a == null ? 255 : a; }
    x.putImageData(img, 0, 0); return c;
  }
  function fibres(c, count, seed, light, dark) {
    const x = c.getContext('2d'), r = rnd(seed); x.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const px = r() * S, py = r() * S, a = r() * Math.PI * 2, len = 6 + r() * 30, bend = (r() - 0.5) * 1.4, up = r() > 0.45;
      x.strokeStyle = up ? 'rgba(255,255,255,' + light + ')' : 'rgba(0,0,0,' + dark + ')'; x.lineWidth = 0.5 + r() * 0.9;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        x.beginPath(); x.moveTo(px + ox, py + oy);
        x.quadraticCurveTo(px + ox + Math.cos(a) * len * 0.5 - Math.sin(a) * bend * 6, py + oy + Math.sin(a) * len * 0.5 + Math.cos(a) * bend * 6, px + ox + Math.cos(a + bend) * len, py + oy + Math.sin(a + bend) * len); x.stroke();
      }
    }
  }

  /* A paper stock: tone (colour variation, mid-grey = none), height (128 = flat), and two ink masks derived from height. */
  P.stock = function (o) {
    const formation = field(o.seed, [[96, 0.55], [40, 0.3], [14, 0.15]]);          // cloudy, where the fibre mat is thicker/thinner
    const tooth = field(o.seed + 7, [[5, 0.35], [2.2, 0.4], [1, 0.25]]);           // the surface you feel
    const tone = toCanvas(formation, (v) => [128 + v * 128 * o.cloud]);
    const r = rnd(o.seed + 3), tx = tone.getContext('2d');
    for (let i = 0; i < o.flecks; i++) {                                             // recycled stock: the odd dark fleck and pale inclusion
      const dark = r() > 0.35; tx.fillStyle = dark ? 'rgba(60,50,40,' + (0.25 + r() * 0.45) + ')' : 'rgba(255,255,255,.6)';
      const x0 = r() * S, y0 = r() * S, w = 0.6 + r() * (dark ? 1.6 : 3), h = 0.5 + r() * 1.2, a = r() * Math.PI;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { tx.save(); tx.translate(x0 + ox, y0 + oy); tx.rotate(a); tx.fillRect(-w / 2, -h / 2, w, h); tx.restore(); }
    }
    fibres(tone, o.fibres, o.seed + 5, 0.16, 0.07);
    const hv = new Float32Array(S * S); for (let i = 0; i < hv.length; i++) hv[i] = tooth[i] * o.tooth + formation[i] * o.tooth * 0.35;
    const height = toCanvas(hv, (v) => [128 + v * 127]);
    fibres(height, o.fibres, o.seed + 5, 0.4, 0.25);
    // ink masks: alpha where ink does NOT land
    const valleys = toCanvas(hv, (v) => [0, Math.max(0, Math.min(255, (-v - 0.32) * 255 * o.inkBite))]);   // typebar misses valleys
    const peaks = toCanvas(hv, (v) => [0, Math.max(0, Math.min(255, (v - 0.36) * 255 * o.inkBite * 0.6))]); // pen skips peaks
    return { tone, height, valleys, peaks };
  };

  /* height canvas -> tangent-space normal map canvas */
  P.normalFromHeight = function (hc, strength) {
    const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, out = mk(w, h), o = out.getContext('2d'), img = o.createImageData(w, h), d = img.data;
    const H = (x, y) => src[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) / 255 * strength, dy = (H(x, y + 1) - H(x, y - 1)) / 255 * strength, l = Math.hypot(dx, dy, 1), k = (y * w + x) * 4;
      d[k] = (-dx / l * 0.5 + 0.5) * 255; d[k + 1] = (dy / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
    }
    o.putImageData(img, 0, 0); return out;
  };

  function sheet(color, stock, roughness, toneAlpha) {
    const col = mk(TW, TH), rough = mk(TW, TH), hgt = mk(TW, TH);
    const c = col.getContext('2d'), r = rough.getContext('2d'), h = hgt.getContext('2d');
    c.fillStyle = color; c.fillRect(0, 0, TW, TH);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = toneAlpha; c.fillStyle = c.createPattern(stock.tone, 'repeat'); c.fillRect(0, 0, TW, TH); c.restore();
    h.fillStyle = h.createPattern(stock.height, 'repeat'); h.fillRect(0, 0, TW, TH);
    r.fillStyle = 'rgb(' + roughness + ',' + roughness + ',' + roughness + ')'; r.fillRect(0, 0, TW, TH);
    return { col, rough, hgt, c, r, h, stock };
  }
  const font = (ctx, f) => { ctx.font = f; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; };

  /* FRONT: the photo printed onto the same card stock, satin finish. You can see the stock through the print. */
  P.front = function (photo, caption) {
    const stock = P.stock({ seed: 31, cloud: 0.05, tooth: 0.45, fibres: 30, flecks: 6, inkBite: 2 });
    const t = sheet('#FAF9F5', stock, 214, 0.55);
    const m = Math.round(TW * 0.042), pw = TW - m * 2, ph = Math.round(pw * 4 / 3), py = m;
    const s = Math.max(pw / photo.width, ph / photo.height), sw = pw / s, sh = ph / s;
    const pl = mk(TW, TH), p = pl.getContext('2d');
    p.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, m, py, pw, ph);
    // printed, not pasted: the stock's tone and tooth show through the ink a little
    p.save(); p.globalCompositeOperation = 'soft-light'; p.globalAlpha = 0.55; p.fillStyle = p.createPattern(stock.height, 'repeat'); p.fillRect(m, py, pw, ph); p.restore();
    p.save(); p.globalCompositeOperation = 'destination-out'; p.globalAlpha = 0.18; p.fillStyle = p.createPattern(stock.valleys, 'repeat'); p.fillRect(m, py, pw, ph); p.restore();
    t.c.save(); t.c.globalCompositeOperation = 'multiply'; t.c.drawImage(pl, 0, 0); t.c.restore();
    t.r.fillStyle = 'rgb(168,168,168)'; t.r.fillRect(m, py, pw, ph);                                   // satin over the image, still not glossy
    t.c.fillStyle = 'rgba(80,77,72,.62)'; font(t.c, '500 19px "IBM Plex Mono", ui-monospace, monospace'); t.c.textBaseline = 'middle';
    const cy = py + ph + (TH - py - ph) / 2;
    if (t.c.letterSpacing !== undefined) t.c.letterSpacing = '2.2px';
    t.c.globalCompositeOperation = 'multiply'; t.c.fillText(caption.toUpperCase(), m + 4, cy);
    t.c.textAlign = 'right'; t.c.fillStyle = 'rgba(80,77,72,.3)'; if (t.c.letterSpacing !== undefined) t.c.letterSpacing = '1px'; t.c.fillText('poto', TW - m - 4, cy);
    t.c.globalCompositeOperation = 'source-over';
    return t;
  };

  /* typewriter: each letter struck separately. The slug presses the paper (a dent you see in raking light),
     the ribbon lays ink on the peaks of the tooth, uneven pressure, a worn ribbon. */
  function typed(t, lines, x0, y0, size, lead, ink) {
    const r = rnd(41), layer = mk(TW, TH), L = layer.getContext('2d');
    font(L, size + 'px "Special Elite", "Courier New", monospace'); font(t.h, L.font);
    const adv = L.measureText('m').width;
    lines.forEach((line, li) => [...line].forEach((ch, i) => {
      if (ch === ' ') return;
      const x = x0 + i * adv + (r() - 0.5) * 1.6, y = y0 + li * lead + (r() - 0.5) * 2.4, press = 0.6 + r() * 0.4, rot = (r() - 0.5) * 0.035, half = r() < 0.08;
      L.save(); L.translate(x, y); L.rotate(rot); L.fillStyle = ink;
      const weak = half ? 0.5 : 1;                                                                                  // the odd letter struck lightly
      L.globalAlpha = press * 0.18; L.filter = 'blur(1.2px)'; L.fillText(ch, 0.6, 0.4);                          // ink squeezing out round the slug
      L.filter = 'none'; L.globalAlpha = press * weak; L.fillText(ch, 0, 0); L.restore();
      t.h.save(); t.h.translate(x, y); t.h.rotate(rot); t.h.globalAlpha = 0.5 * press; t.h.fillStyle = '#202020'; t.h.filter = 'blur(0.7px)'; t.h.fillText(ch, 0, 0); t.h.restore();
    }));
    L.save(); L.globalCompositeOperation = 'destination-out'; L.fillStyle = L.createPattern(t.stock.valleys, 'repeat'); L.fillRect(0, 0, TW, TH); L.restore();
    const rr = rnd(9); L.save(); L.globalCompositeOperation = 'destination-out';                                 // worn ribbon
    for (let i = 0; i < 3200; i++) { L.fillStyle = 'rgba(0,0,0,' + (0.2 + rr() * 0.5) + ')'; L.fillRect(x0 + rr() * adv * 30, y0 - size + rr() * lead * lines.length, 0.8 + rr() * 1.8, 0.8 + rr() * 1.4); }
    L.restore();
    t.c.save(); t.c.globalCompositeOperation = 'multiply'; t.c.drawImage(layer, 0, 0); t.c.restore();
  }

  /* pen ink: wets into the fibres (soft feathered edge), pools a little, runs into the valleys and skips the peaks.
     It dries with a faint sheen, so its roughness is lower than the paper's. */
  function penned(t, text, x, y, size, ink, angle) {
    const layer = mk(TW, TH), L = layer.getContext('2d'), f = size + 'px "La Belle Aurore", "Homemade Apple", cursive';
    const put = (ctx, style, blur, alpha, dx, dy) => { ctx.save(); ctx.translate(x + (dx || 0), y + (dy || 0)); ctx.rotate(angle || 0); font(ctx, f); ctx.filter = blur ? 'blur(' + blur + 'px)' : 'none'; ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fillText(text, 0, 0); ctx.restore(); };
    put(L, ink, 2.4, 0.22); put(L, ink, 0.55, 0.92); put(L, ink, 0, 0.35, 0.4, 0.5);
    L.save(); L.globalCompositeOperation = 'destination-out'; L.fillStyle = L.createPattern(t.stock.peaks, 'repeat'); L.fillRect(0, 0, TW, TH); L.restore();
    t.c.save(); t.c.globalCompositeOperation = 'multiply'; t.c.drawImage(layer, 0, 0); t.c.restore();
    put(t.r, 'rgb(150,150,150)', 0.6, 0.9);
  }

  /* BACK: uncoated card. Offset-printed rules, a stamp, a postmark struck over it, a typed message, a penned address. */
  P.back = function (photo, o) {
    const stock = P.stock({ seed: 11, cloud: 0.09, tooth: 0.75, fibres: 80, flecks: 22, inkBite: 2.2 });
    const t = sheet('#FAF7F0', stock, 246, 0.85);
    const c = t.c, r = rnd(5);
    typed(t, o.message, 86, 610, 37, 60, '#26231f');
    // printed furniture: offset ink, multiplied so the stock shows through
    c.save(); c.globalCompositeOperation = 'multiply';
    c.strokeStyle = 'rgba(90,84,76,.55)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(80, 1010); c.lineTo(TW - 80, 1010); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(250, 1122 + i * 84); c.lineTo(TW - 96, 1122 + i * 84); c.stroke(); }
    c.fillStyle = 'rgba(90,84,76,.75)'; font(c, '500 17px "IBM Plex Mono", ui-monospace, monospace'); if (c.letterSpacing !== undefined) c.letterSpacing = '7px';
    c.fillText('POST CARD', 86, 150); if (c.letterSpacing !== undefined) c.letterSpacing = '2px';
    c.font = '500 14px "IBM Plex Mono", ui-monospace, monospace'; c.fillText('TO', 96, 1120); c.fillText(o.caption.toUpperCase(), 86, TH - 78);
    c.restore();
    penned(t, o.to[0], 262, 1112, 58, '#1c2947', -0.012); penned(t, o.to[1], 262, 1196, 52, '#1c2947', -0.006); penned(t, o.to[2], 262, 1280, 52, '#1c2947', 0.004);
    // the stamp: a perforated piece of gummed paper with a small print of the photo
    const sw = 196, sh = 244, sx = TW - 86 - sw, sy = 84, hole = 7.2, nx = 12, ny = 15;
    const stamp = (ctx, fill) => { ctx.save(); ctx.translate(sx + sw / 2, sy + sh / 2); ctx.rotate(0.03); ctx.translate(-sw / 2, -sh / 2); ctx.fillStyle = fill; ctx.fillRect(0, 0, sw, sh); };
    const perf = (ctx) => { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; for (let i = 0; i <= nx; i++) for (const y of [0, sh]) { ctx.beginPath(); ctx.arc(i * sw / nx, y, hole, 0, 7); ctx.fill(); } for (let j = 1; j < ny; j++) for (const x of [0, sw]) { ctx.beginPath(); ctx.arc(x, j * sh / ny, hole, 0, 7); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; };
    const layer = mk(TW, TH), l = layer.getContext('2d');
    stamp(l, '#FCFBF7'); const s2 = Math.max((sw - 36) / photo.width, (sh - 74) / photo.height);
    l.drawImage(photo, (photo.width - (sw - 36) / s2) / 2, (photo.height - (sh - 74) / s2) / 2, (sw - 36) / s2, (sh - 74) / s2, 18, 18, sw - 36, sh - 74);
    l.fillStyle = '#2a2826'; l.font = '500 15px "IBM Plex Mono", ui-monospace, monospace'; if (l.letterSpacing !== undefined) l.letterSpacing = '3px'; l.textBaseline = 'alphabetic'; l.fillText('POTO', 18, sh - 26);
    l.textAlign = 'right'; l.font = '500 24px "IBM Plex Mono", ui-monospace, monospace'; if (l.letterSpacing !== undefined) l.letterSpacing = '0px'; l.fillText('27', sw - 18, sh - 22); perf(l); l.restore();
    c.save(); c.shadowColor = 'rgba(40,30,20,.28)'; c.shadowBlur = 4; c.shadowOffsetX = 1; c.shadowOffsetY = 2; c.drawImage(layer, 0, 0); c.restore();
    const lh = mk(TW, TH), l2 = lh.getContext('2d'); stamp(l2, 'rgb(172,172,172)'); perf(l2); l2.restore(); t.h.drawImage(lh, 0, 0);
    const lr = mk(TW, TH), l3 = lr.getContext('2d'); stamp(l3, 'rgb(200,200,200)'); perf(l3); l3.restore(); t.r.drawImage(lr, 0, 0);
    // the postmark: rubber stamp, patchy where the pad was dry, multiplied over card and stamp alike
    const pm = mk(TW, TH), p = pm.getContext('2d'), cx = sx - 46, cy = sy + 150; p.strokeStyle = p.fillStyle = '#2b2a2c'; p.lineWidth = 3.2;
    p.translate(cx, cy); p.rotate(-0.16);
    p.beginPath(); p.arc(0, 0, 104, 0, 7); p.stroke(); p.lineWidth = 2; p.beginPath(); p.arc(0, 0, 66, 0, 7); p.stroke();
    const arcText = (str, rad, start, dir) => { p.font = '500 19px "IBM Plex Mono", ui-monospace, monospace'; p.textAlign = 'center'; p.textBaseline = 'middle'; const step = 0.125 * dir; [...str].forEach((ch, i) => { const a = start + (i - (str.length - 1) / 2) * step; p.save(); p.rotate(a); p.translate(0, -rad * dir); if (dir < 0) p.rotate(Math.PI); p.fillText(ch, 0, 0); p.restore(); }); };
    arcText(o.city.toUpperCase(), 85, 0, 1); arcText(o.look.toUpperCase(), 85, Math.PI, -1);
    p.font = '500 20px "IBM Plex Mono", ui-monospace, monospace'; p.textAlign = 'center'; p.fillText(o.date[0], 0, -12); p.fillText(o.date[1], 0, 14);
    p.lineWidth = 3; for (let i = 0; i < 4; i++) { p.beginPath(); for (let k = 0; k <= 40; k++) { const x = 112 + k * 5.6, y = -48 + i * 32 + Math.sin(k * 0.55) * 6; k ? p.lineTo(x, y) : p.moveTo(x, y); } p.stroke(); }
    p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5200; i++) { p.fillStyle = 'rgba(0,0,0,' + (0.3 + r() * 0.6) + ')'; p.beginPath(); p.arc(cx - 130 + r() * 480, cy - 130 + r() * 260, 0.6 + r() * 2.6, 0, 7); p.fill(); }
    p.fillStyle = p.createPattern(stock.valleys, 'repeat'); p.fillRect(0, 0, TW, TH);
    c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.78; c.drawImage(pm, 0, 0); c.restore();
    return t;
  };

  /* STICKER art placeholder. Returns colour (alpha = die-cut shape), foil mask, and a height map for the cut edge.
     Cody's own artwork drops in here later: any image with transparency. */
  P.sticker = function (kind) {
    const Z = 512, col = mk(Z, Z), foil = mk(Z, Z), hgt = mk(Z, Z), c = col.getContext('2d'), f = foil.getContext('2d'), h = hgt.getContext('2d');
    const shape = (ctx, grow) => {
      ctx.beginPath();
      if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = (i % 2 ? 96 : 200) + grow; ctx[i ? 'lineTo' : 'moveTo'](Z / 2 + Math.cos(a) * rad, Z / 2 + 12 + Math.sin(a) * rad); } ctx.closePath(); }
      else if (kind === 'heart') { const k = 1 + grow / 190; ctx.translate(Z / 2, Z / 2 + 20); ctx.scale(k, k); ctx.moveTo(0, 150); ctx.bezierCurveTo(-240, -10, -150, -210, 0, -90); ctx.bezierCurveTo(150, -210, 240, -10, 0, 150); ctx.closePath(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      else ctx.arc(Z / 2, Z / 2, 176 + grow, 0, 7);
    };
    c.lineJoin = f.lineJoin = h.lineJoin = 'round';
    c.fillStyle = '#FDFDFB'; shape(c, 34); c.fill(); c.strokeStyle = '#FDFDFB'; c.lineWidth = 26; c.stroke();            // the white die-cut border
    c.fillStyle = '#16161a'; shape(c, 0); c.fill();                                                                     // printed area (foil shows through the dark ink)
    f.fillStyle = '#000'; f.fillRect(0, 0, Z, Z); f.fillStyle = '#fff'; shape(f, 0); f.fill();
    c.fillStyle = '#FDFDFB'; c.font = '700 120px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('27', Z / 2, Z / 2 + (kind === 'heart' ? -6 : 14));
    f.fillStyle = '#000'; f.font = c.font; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillText('27', Z / 2, Z / 2 + (kind === 'heart' ? -6 : 14));
    h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, Z, Z); h.filter = 'blur(5px)'; h.fillStyle = 'rgb(228,228,228)'; shape(h, 34); h.fill(); h.strokeStyle = 'rgb(228,228,228)'; h.lineWidth = 26; h.stroke(); h.filter = 'none';
    return { col, foil, hgt };
  };
})();
