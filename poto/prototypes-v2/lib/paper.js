/* Poto v2 — paper, ink and print textures, drawn at load. No image assets except the photo.
   Everything a surface needs comes back as three canvases: colour, roughness, height (-> normal map).
   Height is what makes ink look pressed in and stamps look stuck on when light rakes across. */
(function () {
  const P = (window.PotoPaper = {});
  const TW = 1024, TH = 1448;                       // A6 postcard, 105 x 148 mm
  P.size = { w: TW, h: TH };
  const rnd = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* a tileable grain tile: fine tooth + a few fibres. Grey 128 = flat. */
  P.grainTile = function (size, strength, fibres, seed) {
    const c = mk(size, size), x = c.getContext('2d'), r = rnd(seed || 7), img = x.createImageData(size, size), d = img.data;
    const n = new Float32Array(size * size); for (let i = 0; i < n.length; i++) n[i] = r() - 0.5;
    for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {          // 3x3 box blur, wrapping, so the tile repeats cleanly
      let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += n[((y + j + size) % size) * size + ((xx + i + size) % size)];
      const v = 128 + (s / 9) * 255 * strength * 2.2 + n[y * size + xx] * 255 * strength * 0.5, k = (y * size + xx) * 4;
      d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.lineCap = 'round';
    for (let i = 0; i < fibres; i++) {
      const px = r() * size, py = r() * size, a = r() * Math.PI, len = 8 + r() * 26, bend = (r() - 0.5) * 1.2;
      x.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.18)'; x.lineWidth = 0.6 + r() * 0.8;
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        x.beginPath(); x.moveTo(px + ox, py + oy);
        x.quadraticCurveTo(px + ox + Math.cos(a) * len * 0.5 + bend * 6, py + oy + Math.sin(a) * len * 0.5 - bend * 6, px + ox + Math.cos(a + bend) * len, py + oy + Math.sin(a + bend) * len); x.stroke();
      }
    }
    return c;
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

  function base(color, grain) {
    const col = mk(TW, TH), rough = mk(TW, TH), hgt = mk(TW, TH);
    const c = col.getContext('2d'), r = rough.getContext('2d'), h = hgt.getContext('2d');
    c.fillStyle = color; c.fillRect(0, 0, TW, TH);
    h.fillStyle = h.createPattern(grain, 'repeat'); h.fillRect(0, 0, TW, TH);
    // the tiniest tonal mottle so the sheet isn't a flat fill
    c.globalAlpha = 0.05; c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, TW, TH); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    return { col, rough, hgt, c, r, h };
  }

  /* FRONT: coated photo paper. Photo inside a white border, one quiet caption line. */
  P.front = function (photo, caption) {
    const t = base('#FDFCFA', P.grainTile(256, 0.03, 0, 3));
    const m = Math.round(TW * 0.042), pw = TW - m * 2, ph = Math.round(pw * 4 / 3), py = m;
    t.r.fillStyle = 'rgb(150,150,150)'; t.r.fillRect(0, 0, TW, TH);                          // border: satin
    const s = Math.max(pw / photo.width, ph / photo.height), sw = pw / s, sh = ph / s;
    t.c.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, m, py, pw, ph);
    t.r.fillStyle = 'rgb(70,70,70)'; t.r.fillRect(m, py, pw, ph);                             // photo: glossier
    t.h.fillStyle = 'rgba(100,100,100,.5)'; t.h.fillRect(m, py, pw, ph);                      // emulsion sits a hair lower than the border
    t.c.fillStyle = '#8b8882'; t.c.font = '500 19px "IBM Plex Mono", ui-monospace, monospace'; t.c.textBaseline = 'middle';
    const cy = py + ph + (TH - py - ph) / 2;
    if (t.c.letterSpacing !== undefined) t.c.letterSpacing = '2.2px';
    t.c.fillText(caption.toUpperCase(), m + 4, cy);
    t.c.textAlign = 'right'; t.c.fillStyle = '#b5b2ab'; if (t.c.letterSpacing !== undefined) t.c.letterSpacing = '1px'; t.c.fillText('poto', TW - m - 4, cy);
    return t;
  };

  /* typewriter text: each letter struck separately. Uneven pressure, a worn ribbon, and a dent in the paper. */
  function typed(t, lines, x0, y0, size, lead, ink) {
    const r = rnd(41), c = t.c;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
    c.font = size + 'px "Special Elite", "Courier New", monospace'; t.h.font = c.font; t.r.font = c.font;
    const adv = c.measureText('m').width;
    lines.forEach((line, li) => [...line].forEach((ch, i) => {
      if (ch === ' ') return;
      const x = x0 + i * adv + (r() - 0.5) * 1.6, y = y0 + li * lead + (r() - 0.5) * 2.4, press = 0.62 + r() * 0.38, rot = (r() - 0.5) * 0.035;
      for (const [ctx, style] of [[c, ink], [t.h, 'rgb(46,46,46)'], [t.r, 'rgb(236,236,236)']]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        if (ctx === c) { ctx.globalAlpha = press * 0.2; ctx.fillStyle = style; ctx.fillText(ch, 0.9, 0.5); ctx.globalAlpha = press * 0.3; ctx.strokeStyle = style; ctx.lineWidth = 1.6; ctx.strokeText(ch, 0, 0); ctx.globalAlpha = press; }   // squeeze-out halo, then the strike
        else ctx.globalAlpha = ctx === t.h ? 0.55 * press : 0.5;
        ctx.fillStyle = style; ctx.fillText(ch, 0, 0); ctx.restore();
      }
    }));
    // worn ribbon: knock tiny specks out of the ink
    c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 1;
    const rr = rnd(9); for (let i = 0; i < 2600; i++) { const x = x0 + rr() * adv * 30, y = y0 - size + rr() * lead * lines.length; c.fillStyle = 'rgba(0,0,0,' + (0.25 + rr() * 0.5) + ')'; c.fillRect(x, y, 1 + rr() * 1.6, 1 + rr() * 1.2); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'destination-over'; c.fillStyle = t.paper; c.fillRect(0, 0, TW, TH); c.restore();      // put the paper back under the knocked-out specks
  }

  /* pen ink: sits on top, slightly glossy, pools a little, soaks a hair into the fibres */
  function penned(t, text, x, y, size, ink, angle) {
    for (const [ctx, style, blur, alpha] of [[t.c, ink, 2.2, 0.28], [t.c, ink, 0, 0.9], [t.r, 'rgb(96,96,96)', 0, 1], [t.h, 'rgb(104,104,104)', 0.6, 0.5]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0); ctx.font = size + 'px "La Belle Aurore", "Homemade Apple", cursive'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
      ctx.filter = blur ? 'blur(' + blur + 'px)' : 'none'; ctx.globalAlpha = alpha; ctx.fillStyle = style; ctx.fillText(text, 0, 0); ctx.restore();
    }
  }

  /* BACK: uncoated card. Printed rules, a stamp, a postmark struck over it, a typed message, a penned address. */
  P.back = function (photo, o) {
    const t = base('#FBFAF5', P.grainTile(256, 0.05, 46, 11)); t.paper = '#FBFAF5';
    const c = t.c, r = rnd(5);
    t.r.fillStyle = 'rgb(242,242,242)'; t.r.fillRect(0, 0, TW, TH);                           // uncoated: fully matte
    typed(t, o.message, 86, 610, 37, 60, '#22201d');
    // printed furniture (offset-printed, so flat and faint)
    c.strokeStyle = 'rgba(60,56,50,.5)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(80, 1010); c.lineTo(TW - 80, 1010); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(250, 1122 + i * 84); c.lineTo(TW - 96, 1122 + i * 84); c.stroke(); }
    c.fillStyle = 'rgba(60,56,50,.62)'; c.font = '500 17px "IBM Plex Mono", ui-monospace, monospace'; if (c.letterSpacing !== undefined) c.letterSpacing = '7px';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('POST CARD', 86, 150); if (c.letterSpacing !== undefined) c.letterSpacing = '2px';
    c.font = '500 14px "IBM Plex Mono", ui-monospace, monospace'; c.fillText('TO', 96, 1120); c.fillText(o.caption.toUpperCase(), 86, TH - 78);
    penned(t, o.to[0], 262, 1112, 58, '#1c2947', -0.012); penned(t, o.to[1], 262, 1196, 52, '#1c2947', -0.006); penned(t, o.to[2], 262, 1280, 52, '#1c2947', 0.004);
    // the stamp: a perforated piece of gummed paper with a small print of the photo
    const sw = 196, sh = 244, sx = TW - 86 - sw, sy = 84, hole = 7.2, nx = 12, ny = 15;
    const stamp = (ctx, fill) => { ctx.save(); ctx.translate(sx + sw / 2, sy + sh / 2); ctx.rotate(0.03); ctx.translate(-sw / 2, -sh / 2); ctx.fillStyle = fill; ctx.fillRect(0, 0, sw, sh); };
    const perf = (ctx) => { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; for (let i = 0; i <= nx; i++) for (const y of [0, sh]) { ctx.beginPath(); ctx.arc(i * sw / nx, y, hole, 0, 7); ctx.fill(); } for (let j = 1; j < ny; j++) for (const x of [0, sw]) { ctx.beginPath(); ctx.arc(x, j * sh / ny, hole, 0, 7); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; };
    const layer = mk(TW, TH), l = layer.getContext('2d');
    stamp(l, '#FCFBF8'); const s2 = Math.max((sw - 36) / photo.width, (sh - 74) / photo.height);
    l.drawImage(photo, (photo.width - (sw - 36) / s2) / 2, (photo.height - (sh - 74) / s2) / 2, (sw - 36) / s2, (sh - 74) / s2, 18, 18, sw - 36, sh - 74);
    l.fillStyle = '#2a2826'; l.font = '500 15px "IBM Plex Mono", ui-monospace, monospace'; if (l.letterSpacing !== undefined) l.letterSpacing = '3px'; l.textBaseline = 'alphabetic'; l.fillText('POTO', 18, sh - 26);
    l.textAlign = 'right'; l.font = '500 24px "IBM Plex Mono", ui-monospace, monospace'; if (l.letterSpacing !== undefined) l.letterSpacing = '0px'; l.fillText('27', sw - 18, sh - 22); perf(l); l.restore();
    c.save(); c.shadowColor = 'rgba(40,30,20,.34)'; c.shadowBlur = 5; c.shadowOffsetX = 1.5; c.shadowOffsetY = 2.5; c.drawImage(layer, 0, 0); c.restore();   // it is a second sheet, so it throws a hairline shadow
    const lh = mk(TW, TH), l2 = lh.getContext('2d'); stamp(l2, 'rgb(190,190,190)'); perf(l2); l2.restore(); t.h.drawImage(lh, 0, 0);                              // and stands proud of the card
    const lr = mk(TW, TH), l3 = lr.getContext('2d'); stamp(l3, 'rgb(150,150,150)'); perf(l3); l3.restore(); t.r.drawImage(lr, 0, 0);
    // the postmark: rubber stamp, so it's patchy where the pad was dry
    const pm = mk(TW, TH), p = pm.getContext('2d'), cx = sx - 46, cy = sy + 150; p.strokeStyle = p.fillStyle = '#2b2a2c'; p.lineWidth = 3.2;
    p.translate(cx, cy); p.rotate(-0.16);
    p.beginPath(); p.arc(0, 0, 104, 0, 7); p.stroke(); p.lineWidth = 2; p.beginPath(); p.arc(0, 0, 66, 0, 7); p.stroke();
    const arcText = (str, rad, start, dir) => { p.font = '500 19px "IBM Plex Mono", ui-monospace, monospace'; p.textAlign = 'center'; p.textBaseline = 'middle'; const step = 0.125 * dir; [...str].forEach((ch, i) => { const a = start + (i - (str.length - 1) / 2) * step; p.save(); p.rotate(a); p.translate(0, -rad * dir); if (dir < 0) p.rotate(Math.PI); p.fillText(ch, 0, 0); p.restore(); }); };
    arcText(o.city.toUpperCase(), 85, 0, 1); arcText(o.look.toUpperCase(), 85, Math.PI, -1);
    p.font = '500 20px "IBM Plex Mono", ui-monospace, monospace'; p.textAlign = 'center'; p.fillText(o.date[0], 0, -12); p.fillText(o.date[1], 0, 14);
    p.lineWidth = 3; for (let i = 0; i < 4; i++) { p.beginPath(); for (let k = 0; k <= 40; k++) { const x = 112 + k * 5.6, y = -48 + i * 32 + Math.sin(k * 0.55) * 6; k ? p.lineTo(x, y) : p.moveTo(x, y); } p.stroke(); }
    p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5200; i++) { p.fillStyle = 'rgba(0,0,0,' + (0.3 + r() * 0.6) + ')'; p.beginPath(); p.arc(cx - 130 + r() * 480, cy - 130 + r() * 260, 0.6 + r() * 2.6, 0, 7); p.fill(); }
    c.globalAlpha = 0.74; c.drawImage(pm, 0, 0); c.globalAlpha = 1;
    return t;
  };

  /* STICKER art placeholder. Returns colour (with alpha = die-cut shape), foil mask, and a height map for the cut edge.
     Cody's own artwork drops in here later: any image with transparency. */
  P.sticker = function (kind) {
    const S = 512, col = mk(S, S), foil = mk(S, S), hgt = mk(S, S), c = col.getContext('2d'), f = foil.getContext('2d'), h = hgt.getContext('2d');
    const shape = (ctx, grow) => {
      ctx.beginPath();
      if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = (i % 2 ? 96 : 200) + grow; ctx[i ? 'lineTo' : 'moveTo'](S / 2 + Math.cos(a) * rad, S / 2 + 12 + Math.sin(a) * rad); } ctx.closePath(); }
      else if (kind === 'heart') { const k = 1 + grow / 190; ctx.translate(S / 2, S / 2 + 20); ctx.scale(k, k); ctx.moveTo(0, 150); ctx.bezierCurveTo(-240, -10, -150, -210, 0, -90); ctx.bezierCurveTo(150, -210, 240, -10, 0, 150); ctx.closePath(); ctx.setTransform(1, 0, 0, 1, 0, 0); }
      else ctx.arc(S / 2, S / 2, 176 + grow, 0, 7);
    };
    c.lineJoin = f.lineJoin = h.lineJoin = 'round';
    c.fillStyle = '#FDFDFB'; shape(c, 34); c.fill(); c.strokeStyle = '#FDFDFB'; c.lineWidth = 26; c.stroke();            // the white die-cut border
    c.fillStyle = '#16161a'; shape(c, 0); c.fill();                                                                     // printed area (foil shows through the dark ink)
    f.fillStyle = '#000'; f.fillRect(0, 0, S, S); f.fillStyle = '#fff'; shape(f, 0); f.fill();
    c.fillStyle = '#FDFDFB'; c.font = '700 120px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('27', S / 2, S / 2 + (kind === 'heart' ? -6 : 14));
    f.fillStyle = '#000'; f.font = c.font; f.textAlign = 'center'; f.textBaseline = 'middle'; f.fillText('27', S / 2, S / 2 + (kind === 'heart' ? -6 : 14));
    h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, S, S); h.filter = 'blur(5px)'; h.fillStyle = 'rgb(228,228,228)'; shape(h, 34); h.fill(); h.strokeStyle = 'rgb(228,228,228)'; h.lineWidth = 26; h.stroke(); h.filter = 'none';
    return { col, foil, hgt };
  };
})();
