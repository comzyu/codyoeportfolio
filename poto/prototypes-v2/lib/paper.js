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
  // CPU-side canvas: anything that gets drawn into the height map (or read back) must live here, or each draw forces a slow GPU readback
  const mkR = (w, h) => { const c = mk(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };
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
    const c = mkR(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
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
    const w = hc.width, h = hc.height, out = mk(w, h);
    P.normalInto(hc.getContext('2d').getImageData(0, 0, w, h).data, w, h, out.getContext('2d'), 0, 0, w, h, 0, 0, strength);
    return out;
  };
  /* tight loop (no closures, no Math.hypot): src is RGBA height data of size sw x sh; writes the normals for the w x h box at (x, y) in that data
     into ctx at (dx, dy). Edges clamp. ~10x faster than the first version: this was most of the postcard's load time. */
  P.normalInto = function (src, sw, sh, ctx, x, y, w, h, dx, dy, strength) {
    const img = ctx.createImageData(w, h), d = img.data, k = strength / 255;
    for (let j = 0; j < h; j++) {
      const yy = y + j, up = (yy > 0 ? yy - 1 : 0) * sw, dn = (yy < sh - 1 ? yy + 1 : sh - 1) * sw, row = yy * sw;
      for (let i = 0; i < w; i++) {
        const xx = x + i, l = xx > 0 ? xx - 1 : 0, r = xx < sw - 1 ? xx + 1 : sw - 1;
        const gx = (src[(row + r) << 2] - src[(row + l) << 2]) * k, gy = (src[(dn + xx) << 2] - src[(up + xx) << 2]) * k;
        const inv = 127.5 / Math.sqrt(gx * gx + gy * gy + 1), o = (j * w + i) << 2;
        d[o] = 127.5 - gx * inv; d[o + 1] = 127.5 + gy * inv; d[o + 2] = 127.5 + inv; d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, dx, dy);
  };

  function sheet(color, stock, roughness, toneAlpha) {
    const col = mk(TW, TH), rough = mk(TW, TH), hgt = mkR(TW, TH);
    const c = col.getContext('2d'), r = rough.getContext('2d'), h = hgt.getContext('2d', { willReadFrequently: true });   // the height map is read back a lot: keep it on the CPU
    c.fillStyle = color; c.fillRect(0, 0, TW, TH);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = toneAlpha; c.fillStyle = c.createPattern(stock.tone, 'repeat'); c.fillRect(0, 0, TW, TH); c.restore();
    h.fillStyle = h.createPattern(stock.height, 'repeat'); h.fillRect(0, 0, TW, TH);
    r.fillStyle = 'rgb(' + roughness + ',' + roughness + ',' + roughness + ')'; r.fillRect(0, 0, TW, TH);
    return { col, rough, hgt, c, r, h, stock };
  }
  const font = (ctx, f) => { ctx.font = f; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; };

  /* FRONT: the photo printed onto the same card stock, satin finish. You can see the stock through the print. */
  P.front = function (photo, caption, finish) {          // finish: 'matte' (printed on the card stock) or 'gloss' (instant-film style: smooth, glossy picture, matte border)
    const stock = P.stock({ seed: 31, cloud: 0.05, tooth: 0.45, fibres: 30, flecks: 6, inkBite: 2 });
    const t = sheet('#FAF9F5', stock, 214, 0.55);
    const m = Math.round(TW * 0.042), pw = TW - m * 2, ph = Math.round(pw * 4 / 3), py = m;
    const s = Math.max(pw / photo.width, ph / photo.height), sw = pw / s, sh = ph / s;
    const pl = mk(TW, TH), p = pl.getContext('2d');
    p.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, m, py, pw, ph);
    // printed, not pasted: the stock's tone and tooth show through the ink a little
    if (finish === 'gloss') {
      // instant-film style: the picture sits under a smooth glossy layer, so no paper texture shows through it and it catches reflections
      t.c.drawImage(pl, 0, 0);
      t.c.save(); t.c.strokeStyle = 'rgba(0,0,0,.18)'; t.c.lineWidth = 1.5; t.c.strokeRect(m - 0.5, py - 0.5, pw + 1, ph + 1); t.c.restore();     // the edge of the emulsion window
      t.r.fillStyle = 'rgb(46,46,46)'; t.r.fillRect(m, py, pw, ph);
      t.h.fillStyle = 'rgb(120,120,120)'; t.h.fillRect(m, py, pw, ph);                                  // dead flat, a hair below the border
      const g = mk(TW, TH), gc = g.getContext('2d'); gc.fillStyle = '#000'; gc.fillRect(0, 0, TW, TH); gc.fillStyle = '#fff'; gc.fillRect(m, py, pw, ph); t.gloss = g;
    } else {
      // Cody, 16 Nov: the photo must stay clean. It's a photo app; texture or greying on the picture defeats the point.
      // So the picture is printed flat and true: no paper tooth, no dents, no sheen. The paper texture lives in the white border only.
      t.c.drawImage(pl, 0, 0);
      t.r.fillStyle = 'rgb(248,248,248)'; t.r.fillRect(m, py, pw, ph);                                 // fully matte: no reflections on the picture
      t.h.fillStyle = 'rgb(128,128,128)'; t.h.fillRect(m, py, pw, ph);                                 // dead flat: no paper bumps through the picture
      const lit = mk(TW, TH), lc = lit.getContext('2d'); lc.fillStyle = '#000'; lc.fillRect(0, 0, TW, TH); lc.drawImage(pl, 0, 0); t.lit = lit;   // the picture glows a touch so light never greys it
    }
    // Cody, 17 Nov: true colour, like Dazz and Retro. In 3D the picture must not be lit by the scene (lights shift and grey its colours),
    // so the 3D colour map has the picture area black and the picture comes in through the emissive map at full strength:
    // what you see is exactly the photo's pixels. The flat colour canvas (t.col, used for shares) keeps the picture as is.
    const lit2 = mk(TW, TH), l2 = lit2.getContext('2d'); l2.fillStyle = '#000'; l2.fillRect(0, 0, TW, TH); l2.drawImage(pl, 0, 0); t.lit = lit2; t.litFull = true;
    t.photoRect = { x: m / TW, y: py / TH, w: pw / TW, h: ph / TH };
    t.c.fillStyle = 'rgba(80,77,72,.62)'; font(t.c, '500 19px "IBM Plex Mono", ui-monospace, monospace'); t.c.textBaseline = 'middle';
    const cy = py + ph + (TH - py - ph) / 2;
    if (t.c.letterSpacing !== undefined) t.c.letterSpacing = '2.2px';
    t.c.globalCompositeOperation = 'multiply'; t.c.fillText(caption.toUpperCase(), m + 4, cy);
    t.c.textAlign = 'right'; t.c.fillStyle = 'rgba(80,77,72,.3)'; if (t.c.letterSpacing !== undefined) t.c.letterSpacing = '1px'; t.c.fillText('poto', TW - m - 4, cy);
    t.c.globalCompositeOperation = 'source-over';
    const m3 = mk(TW, TH), c3 = m3.getContext('2d'); c3.drawImage(t.col, 0, 0); c3.fillStyle = '#000'; c3.fillRect(m, py, pw, ph); t.map3d = m3;
    return t;
  };

  /* typewriter: each letter struck separately. The slug presses the paper (a dent you see in raking light),
     the ribbon lays ink on the peaks of the tooth, uneven pressure, a worn ribbon. */
  function typed(t, lines, x0, y0, size, lead, ink) {
    if (!lines.length) return;
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
    // drawn in a small box around the words, not a full-card canvas: canvas blur filters cost by area, and 12 full-size blurs were seconds of load time
    const f = size + 'px "La Belle Aurore", "Homemade Apple", cursive', m0 = mk(8, 8).getContext('2d'); font(m0, f);
    const bw = Math.ceil(m0.measureText(text).width + size * 1.4), bh = Math.ceil(size * 2.2), bx = Math.floor(x - size * 0.5), by = Math.floor(y - size * 1.4);
    const L = mk(bw, bh).getContext('2d');
    const put = (ctx, ox, oy, style, blur, alpha, dx, dy) => { ctx.save(); ctx.translate(x - ox + (dx || 0), y - oy + (dy || 0)); ctx.rotate(angle || 0); font(ctx, f); ctx.filter = blur ? 'blur(' + blur + 'px)' : 'none'; ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fillText(text, 0, 0); ctx.restore(); };
    put(L, bx, by, ink, 2.4, 0.22); put(L, bx, by, ink, 0.55, 0.92); put(L, bx, by, ink, 0, 0.35, 0.4, 0.5);
    L.save(); L.globalCompositeOperation = 'destination-out'; L.translate(-bx, -by); L.fillStyle = L.createPattern(t.stock.peaks, 'repeat'); L.fillRect(bx, by, bw, bh); L.restore();
    t.c.save(); t.c.globalCompositeOperation = 'multiply'; t.c.drawImage(L.canvas, bx, by); t.c.restore();
    const Rr = mk(bw, bh).getContext('2d'); put(Rr, bx, by, 'rgb(150,150,150)', 0.6, 0.9); t.r.drawImage(Rr.canvas, bx, by);
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
    // stamp + postmark are OFF by default (Cody, 16 Nov: keep the back minimal; decoration is up to the sender).
    // Kept here as an option: the plan is a postmark only when a card is actually mailed, and stamps as stickers/drops.
    if (!o.stamp) return t;
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

/* ---------- live typewriter on the back (build 1) ----------
   The back is drawn once without a message. Each new letter is struck onto the live canvases on its own
   (ink layer, dent in the height map, normals rebuilt for that letter's rectangle only), so typing stays fast.
   Deleting or re-wrapping restores the message area from a clean copy and re-strikes everything. */
(function () {
  const P = window.PotoPaper, TW = 1024, TH = 1448;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // CPU-side canvas: anything that gets drawn into the height map (or read back) must live here, or each draw forces a slow GPU readback
  const mkR = (w, h) => { const c = mk(w, h); c.getContext('2d', { willReadFrequently: true }); return c; };
  const hash = (i) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16; return (x >>> 0) / 4294967296; };

  P.normalRegion = function (hc, nc, x, y, w, h, strength) {
    x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y)); w = Math.min(TW - x, Math.ceil(w)); h = Math.min(TH - y, Math.ceil(h)); if (w <= 0 || h <= 0) return;
    const sx = Math.max(0, x - 1), sy = Math.max(0, y - 1), sw = Math.min(TW, x + w + 1) - sx, sh = Math.min(TH, y + h + 1) - sy;
    P.normalInto(hc.getContext('2d').getImageData(sx, sy, sw, sh).data, sw, sh, nc.getContext('2d'), x - sx, y - sy, w, h, x, y, strength);
  };;

  P.backWriter = function (photo, o) {
    const t = P.back(photo, Object.assign({}, o, { message: [] })), NS = 1.9;
    t.nrm = P.normalFromHeight(t.hgt, NS);
    const R = { x: 56, y: 540, w: 930, h: 440 }, clean = {};
    for (const k of ['col', 'hgt']) { const c = k === 'hgt' ? mkR(R.w, R.h) : mk(R.w, R.h); c.getContext('2d').drawImage(t[k], R.x, R.y, R.w, R.h, 0, 0, R.w, R.h); clean[k] = c; }
    const size = 37, lead = 60, x0 = 86, y0 = 610, ink = '#26231f';
    // Special Elite only covers Latin. Every other script falls back to a good system face for that script.
    const FONT = size + 'px "Special Elite", "Courier New", "PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", "Apple SD Gothic Neo", "Noto Sans KR", "Geeza Pro", "Noto Naskh Arabic", "Kohinoor Devanagari", "Noto Sans Devanagari", "Tamil Sangam MN", "Noto Sans Tamil", serif';
    const m = mk(8, 8).getContext('2d'); m.font = FONT; const adv = m.measureText('m').width, wcache = new Map();
    const width = (s) => { let w = wcache.get(s); if (w == null) { w = m.measureText(s).width; wcache.set(s, w); } return w; };
    const W = { cols: 26, lines: 6, adv, lead, x0, y0, size, tex: t, laid: [] }, LW = W.cols * adv;
    W.lineWidth = LW;

    /* Every script gets proper spacing (Cody, 16 Nov):
       - each unit is measured in the font it will actually be drawn in, so wide characters (Chinese, Japanese, Korean) never overlap
       - scripts whose letters join or stack (Arabic, Hebrew, Devanagari, Tamil and the other Indic scripts, Thai, Khmer, Myanmar)
         are drawn a whole word at a time, so they're shaped correctly; the rest are drawn one character (grapheme) at a time
       - Chinese, Japanese and Thai have no spaces, so a line may break between any two characters; everything else breaks at spaces
       - a paragraph that starts in Arabic or Hebrew runs right to left */
    const SHAPED = /[֐-ࣿऀ-෿฀-๿က-႟ក-៿יִ-﷿ﹰ-﻿]/;
    const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/, STRONG = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-ࣿऀ-෿฀-๿぀-ヿ㐀-鿿가-힯יִ-﷿ﹰ-﻿]/;
    const ANYBREAK = /[฀-๿⺀-⿿　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/;
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const graphemes = (str) => seg ? [...seg.segment(str)].map((x) => x.segment) : Array.from(str);

    W.layout = function (text) {
      const out = []; let line = 0, caretX = 0, caretRtl = false, i = 0;
      const paras = text.split('\n');
      paras.forEach((para, pi) => {
        const strong = para.match(STRONG), rtl = !!(strong && RTL.test(strong[0]));
        // 1. units: spaces, whole words for shaped scripts, single graphemes otherwise
        const units = []; let k = i;
        for (const gch of graphemes(para)) {
          const sp = /^\s+$/.test(gch), shaped = !sp && SHAPED.test(gch), last = units[units.length - 1];
          if (shaped && last && last.shaped && !last.space) { last.txt += gch; last.len += gch.length; }
          else units.push({ txt: gch, i: k, len: gch.length, space: sp, shaped, anyBreak: ANYBREAK.test(gch) });
          k += gch.length;
        }
        // spaces: the typewriter's wide space for Latin text, a natural one for other scripts
        const letters = para.replace(/\s/g, ''), latin = (para.match(/[A-Za-z\u00C0-\u024F]/g) || []).length > letters.length * 0.5;
        units.forEach((u) => (u.w = u.space ? (latin ? adv : adv * 0.45) : width(u.txt)));
        // 2. greedy lines, breaking at the last space (or anywhere in Chinese/Japanese/Thai)
        let row = [], x = 0;
        const flush = () => { if (rtl) for (const u of row) u.x = LW - u.x - u.w; row.forEach((u) => { u.line = line; u.rtl = rtl; out.push(u); }); row = []; };
        for (const u of units) {
          if (u.space && x + u.w > LW) { flush(); line++; x = 0; continue; }          // a space at the end of a full line just becomes the line break
          const hang = /^[，。、．！？：；）」』】〕〉》,.!?:;)\]}…ー・]$/.test(u.txt);           // closing punctuation never starts a line: it hangs in the margin
          if (!u.space && x + u.w > LW && row.length && !hang) {
            let b = -1; for (let q = row.length - 1; q >= 0; q--) { if (row[q].space) { b = q; break; } if (row[q].anyBreak || u.anyBreak) { b = q; break; } }
            let carry = [];
            if (b >= 0 && b < row.length - 1) { carry = row.splice(b + 1); if (row[b].space) row.splice(b, 1); }
            else if (b >= 0 && row[b].space) row.splice(b, 1);
            flush(); line++; x = 0; for (const c of carry) { c.x = x; x += c.w; row.push(c); }
          }
          u.x = x; x += u.w; row.push(u);
        }
        caretX = rtl ? LW - x : x; caretRtl = rtl; flush();
        i += para.length + 1; if (pi < paras.length - 1) { line++; caretX = 0; caretRtl = false; }
      });
      return { glyphs: out.filter((u) => !u.space), caret: { line, x: caretX, rtl: caretRtl } };
    };
    const at = (g) => ({ x: x0 + g.x + (hash(g.i * 3 + 1) - 0.5) * 1.6, y: y0 + g.line * lead + (hash(g.i * 3 + 2) - 0.5) * 2.4 });
    W.font = FONT;

    // every keystroke: wipe the message area back to clean paper and strike the whole message again, in one ink layer,
    // with the same recipe as the approved static card (the paper's valleys knocked out of the ink, worn ribbon, dents)
    function redraw(glyphs) {                                   // wipe the message area to clean paper and strike every letter again
      t.c.drawImage(clean.col, R.x, R.y); t.h.drawImage(clean.hgt, R.x, R.y);
      for (const g of glyphs) strike(g, true);
      P.normalRegion(t.hgt, t.nrm, R.x, R.y, R.w, R.h, NS);
    }

    // typing forward: strike only the new letter, same recipe, inside its own small rectangle (fast on a phone)
    function strike(g, batch) {
      if (g.space) return;
      const p = at(g), press = 0.6 + hash(g.i * 5 + 7) * 0.4, rot = (hash(g.i * 5 + 9) - 0.5) * (g.w > adv * 2 ? 0.012 : 0.035), weak = hash(g.i * 5 + 11) < 0.08 ? 0.5 : 1;
      const bx = Math.floor(p.x - 10), by = Math.floor(p.y - size - 16), bw = Math.ceil(g.w + 24), bh = Math.ceil(size + 40);
      const L = mk(bw, bh).getContext('2d'); L.font = FONT; L.textBaseline = 'alphabetic'; L.direction = g.rtl ? 'rtl' : 'ltr'; L.textAlign = 'left';
      L.save(); L.translate(p.x - bx, p.y - by); L.rotate(rot); L.fillStyle = ink;
      L.globalAlpha = press * 0.18; L.filter = 'blur(1.2px)'; L.fillText(g.txt, 0.6, 0.4); L.filter = 'none'; L.globalAlpha = press * weak; L.fillText(g.txt, 0, 0); L.restore();
      L.save(); L.globalCompositeOperation = 'destination-out'; L.translate(-bx, -by); L.fillStyle = L.createPattern(t.stock.valleys, 'repeat'); L.fillRect(bx, by, bw, bh);
      for (let k = 0; k < 22; k++) { L.fillStyle = 'rgba(0,0,0,' + (0.2 + hash(g.i * 97 + k * 7) * 0.5) + ')'; L.fillRect(bx + hash(g.i * 89 + k * 13) * bw, by + hash(g.i * 83 + k * 17) * bh, 0.8 + hash(g.i * 79 + k) * 1.8, 0.8 + hash(g.i * 73 + k) * 1.4); }
      L.restore();
      t.c.save(); t.c.globalCompositeOperation = 'multiply'; t.c.drawImage(L.canvas, bx, by); t.c.restore();
      const D = mkR(bw, bh).getContext('2d'); D.font = FONT; D.textBaseline = 'alphabetic'; D.direction = L.direction; D.textAlign = 'left'; D.translate(p.x - bx, p.y - by); D.rotate(rot); D.fillStyle = '#202020'; D.filter = 'blur(0.7px)'; D.fillText(g.txt, 0, 0);
      t.h.save(); t.h.globalAlpha = 0.5 * press; t.h.drawImage(D.canvas, bx, by); t.h.restore();                // the dent, blurred on a small canvas (blurring the big one is slow)
      if (!batch) P.normalRegion(t.hgt, t.nrm, bx, by, bw, bh, NS);
      return { x: bx, y: by, w: bw, h: bh };
    }

    /* set the whole message; returns { ok, newline, caret:{x,y,col,line} } */
    W.set = function (text) {
      const lay = W.layout(text); if (lay.caret.line >= W.lines || lay.glyphs.some((g) => g.line >= W.lines)) return { ok: false };
      const nl = W.caret ? lay.caret.line > W.caret.line : false, prev = W.laid;
      const forward = prev.length <= lay.glyphs.length && prev.every((g, k) => { const n = lay.glyphs[k]; return n.i === g.i && n.txt === g.txt && n.line === g.line && Math.abs(n.x - g.x) < 0.01; });
      let dirty = null; const grow = (r) => { if (!r) return; if (!dirty) { dirty = Object.assign({}, r); return; } const x1 = Math.max(dirty.x + dirty.w, r.x + r.w), y1 = Math.max(dirty.y + dirty.h, r.y + r.h); dirty.x = Math.min(dirty.x, r.x); dirty.y = Math.min(dirty.y, r.y); dirty.w = x1 - dirty.x; dirty.h = y1 - dirty.y; };
      if (forward && prev.length) for (const g of lay.glyphs.slice(prev.length)) grow(strike(g));
      else { redraw(lay.glyphs); dirty = Object.assign({}, R); }                                    // deleted, re-wrapped or first draw: start from clean paper
      W.laid = lay.glyphs; W.caret = { line: lay.caret.line, rtl: lay.caret.rtl, x: x0 + lay.caret.x - (lay.caret.rtl ? adv : 0), y: y0 + lay.caret.line * lead };
      const used = lay.caret.rtl ? LW - lay.caret.x : lay.caret.x;
      return { ok: true, dirty, newline: nl, caret: W.caret, nearEnd: used > LW - 5 * adv };
    };
    /* which part of the text is at a point on the card: { i: index into the text, on: true if right on a letter } */
    W.indexAt = function (px, py) {
      if (!W.laid.length) return { i: 0, on: false };
      const maxLine = W.laid[W.laid.length - 1].line, line = Math.max(0, Math.min(maxLine, Math.floor((py - (y0 - size - 10)) / lead))), row = W.laid.filter((g) => g.line === line);
      if (!row.length) { const after = W.laid.find((g) => g.line > line); return { i: after ? after.i : W.laid[W.laid.length - 1].i + W.laid[W.laid.length - 1].len, on: false }; }
      const x = px - x0;
      for (const g of row) if (x >= g.x - 2 && x <= g.x + g.w + 2) return { i: g.i, on: true, rtl: g.rtl };
      const first = row.reduce((a, b) => (a.x < b.x ? a : b)), last = row.reduce((a, b) => (a.x > b.x ? a : b)), rtl = row[0].rtl;
      const beforeStart = rtl ? x > last.x + last.w : x < first.x;
      const startG = row[0], endG = row[row.length - 1];
      return { i: beforeStart ? startG.i : endG.i + endG.len, on: false };
    };
    /* where the cursor sits for a given index (start of the letter at that index, or the end of the text) */
    W.caretAt = function (index) {
      const g = W.laid.find((q) => q.i >= index);
      if (!g) return W.caret;
      return { x: x0 + g.x + (g.rtl ? g.w - adv : 0), y: y0 + g.line * lead, line: g.line };
    };
    /* screen-space boxes for a selected range of the text (for the highlight): one box per line, in card pixels */
    W.boxes = function (s0, s1) {
      const byLine = new Map();
      for (const g of W.laid) if (g.i < s1 && g.i + g.len > s0) { const b = byLine.get(g.line) || { line: g.line, x0: 1e9, x1: -1e9 }; b.x0 = Math.min(b.x0, g.x); b.x1 = Math.max(b.x1, g.x + g.w); byLine.set(g.line, b); }
      return [...byLine.values()].map((b) => ({ x: x0 + b.x0 - 3, y: y0 + b.line * lead - size - 2, w: b.x1 - b.x0 + 6, h: size + 14 }));
    };
    W.set(o.message.join('\n'));
    return W;
  };
})();
