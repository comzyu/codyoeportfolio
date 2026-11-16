/* Poto v2 — share images: Instagram Story (9:16, 1080x1920) and Post (4:5, 1080x1350).
   Drawn flat in 2D from the same card textures, so they're pixel-sharp (no 3D blur).
   The card always sits inside the area Instagram leaves clear, and the description + watermark are always readable. */
(function () {
  const S = (window.PotoShare = {});
  const FORMATS = {
    story: { w: 1080, h: 1920, safeTop: 250, safeBottom: 340, side: 70 },   // Story UI covers ~250 px at the top (bar, name) and ~340 px at the bottom (reply box)
    post: { w: 1080, h: 1350, safeTop: 60, safeBottom: 34, side: 80 },      // 4:5 feed post: nothing overlaps, keep a calm margin
  };
  S.formats = FORMATS;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ASPECT = 1448 / 1024;

  // one card: its face (front or back texture), any stickers on it, a soft two-part shadow
  function card(ctx, face, stickers, cx, cy, w, rot) {
    const h = w * ASPECT, s = w / 1024;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.save(); ctx.shadowColor = 'rgba(25,22,18,.20)'; ctx.shadowBlur = w * 0.09; ctx.shadowOffsetY = w * 0.045; ctx.fillStyle = '#fff'; round(ctx, -w / 2, -h / 2, w, h, w * 0.012); ctx.fill(); ctx.restore();   // soft fall
    ctx.save(); ctx.shadowColor = 'rgba(25,22,18,.22)'; ctx.shadowBlur = w * 0.008; ctx.shadowOffsetY = w * 0.003; round(ctx, -w / 2, -h / 2, w, h, w * 0.012); ctx.fill(); ctx.restore();                         // contact
    ctx.save(); round(ctx, -w / 2, -h / 2, w, h, w * 0.012); ctx.clip(); ctx.drawImage(face, -w / 2, -h / 2, w, h);
    for (const st of stickers || []) {
      const sw = st.size * s; ctx.save(); ctx.translate(-w / 2 + st.px * s, -h / 2 + st.py * s); ctx.rotate(st.rot);
      ctx.save(); ctx.shadowColor = 'rgba(25,22,18,.32)'; ctx.shadowBlur = sw * 0.02; ctx.shadowOffsetX = sw * 0.01; ctx.shadowOffsetY = sw * 0.015; ctx.drawImage(st.img, -sw / 2, -sw / 2, sw, sw); ctx.restore();
      if (st.finish === 'holo' && st.foil) {                // a still of the foil: a soft rainbow sweep, only where the foil is
        const f = mk(st.img.width, st.img.height), fx = f.getContext('2d'), g = fx.createLinearGradient(0, 0, f.width, f.height);
        ['#b9e8ff', '#d9c2ff', '#ffc6dc', '#fff0b8', '#c4ffdf', '#b9e8ff'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
        fx.fillStyle = g; fx.fillRect(0, 0, f.width, f.height); fx.globalCompositeOperation = 'destination-in'; fx.drawImage(st.foil, 0, 0); fx.globalCompositeOperation = 'source-over';
        const m = mk(f.width, f.height).getContext('2d'); m.drawImage(st.foil, 0, 0); const id = m.getImageData(0, 0, f.width, f.height); for (let i = 0; i < id.data.length; i += 4) id.data[i + 3] = id.data[i]; m.putImageData(id, 0, 0);
        fx.globalCompositeOperation = 'destination-in'; fx.drawImage(m.canvas, 0, 0);
        ctx.globalAlpha = 0.85; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(f, -sw / 2, -sw / 2, sw, sw); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }
    ctx.restore(); ctx.restore();
    return h;
  }
  function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // the backdrop: the photo, cover-fit, but turned into something else so it doesn't read as a double (Cody, 16 Nov):
  // black and white, softly blurred, darker, with film grain and a vignette
  function backdrop(x, F, ph) {
    const cover = Math.max(F.w / ph.width, F.h / ph.height) * 1.15;
    x.save(); x.filter = 'grayscale(1) contrast(1.08) blur(' + Math.round(F.w * 0.03) + 'px)'; x.drawImage(ph, (F.w - ph.width * cover) / 2, (F.h - ph.height * cover) / 2, ph.width * cover, ph.height * cover); x.restore();
    x.fillStyle = 'rgba(12,12,12,.30)'; x.fillRect(0, 0, F.w, F.h);
    const g = mk(256, 256), gx = g.getContext('2d'), id = gx.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 140; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gx.putImageData(id, 0, 0);
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.32; x.fillStyle = x.createPattern(g, 'repeat'); x.fillRect(0, 0, F.w, F.h); x.restore();
    const vg = x.createRadialGradient(F.w / 2, F.h / 2, F.h * 0.25, F.w / 2, F.h / 2, F.h * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = vg; x.fillRect(0, 0, F.w, F.h);
  }
  function coverDraw(x, im, dx, dy, dw, dh) { const k = Math.max(dw / im.width, dh / im.height), sw = dw / k, sh = dh / k; x.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, dx, dy, dw, dh); }
  function details(x, F, o, ex, y1) {
    const y2 = y1 + (o.format === 'story' ? 36 : 30);
    x.save(); x.fillStyle = 'rgba(255,255,255,.92)'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 6;
    const big = (o.format === 'story' ? 25 : 22) + 'px', small = (o.format === 'story' ? 21 : 18) + 'px';
    x.font = '500 ' + big + ' "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.textAlign = 'left'; x.fillText(o.left.toUpperCase(), ex, y1); x.textAlign = 'right'; x.fillText(o.right.toUpperCase(), F.w - ex, y1);
    x.fillStyle = 'rgba(255,255,255,.66)'; x.font = '500 ' + small + ' "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '2px';
    x.textAlign = 'left'; x.fillText(o.handle, ex, y2); x.textAlign = 'right'; x.fillText(o.mark, F.w - ex, y2);
    if (x.letterSpacing !== undefined) x.letterSpacing = '0px'; x.restore();
  }

  /* the monthly recap (board #4 "july recap", #15): the month as a photo calendar, hero photo on top, ring binding, every day with a print
     shown edge to edge. The month name is cut out letter by letter from different papers and stuck on (board #2).
     o: { format, photo (hero), month, year, lead (blank cells before the 1st), days, cells: {day: image}, today, left, right, handle, mark } */
  S.month = function (o) {
    const F = FORMATS[o.format], c = mk(F.w, F.h), x = c.getContext('2d');
    backdrop(x, F, o.photo);
    const foot = o.format === 'story' ? 96 : 76, top = F.safeTop, bottom = F.h - F.safeBottom - foot, areaH = bottom - top;
    const rows = Math.ceil((o.lead + o.days) / 7), K = 0.72 + 0.115 + rows / 7 * 0.92 + 0.045;   // card height / width
    const w = Math.min(F.w - F.side * 2 - 40, (areaH - 70) / K), h = w * K, cx = F.w / 2, x0 = cx - w / 2, y0 = top + (areaH - h) / 2 + 34;
    const r = w * 0.04, heroH = w * 0.72, pad = w * 0.04;
    // the card, with a soft fall and a contact shadow
    x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = w * 0.08; x.shadowOffsetY = w * 0.04; x.fillStyle = '#fff'; round(x, x0, y0, w, h, r); x.fill(); x.restore();
    x.save(); round(x, x0, y0, w, h, r); x.clip(); x.fillStyle = '#fff'; x.fillRect(x0, y0, w, h);
    coverDraw(x, o.photo, x0, y0, w, heroH);
    // days
    const gx = x0 + pad, gw = w - pad * 2, cell = gw / 7, dowY = y0 + heroH + w * 0.075, gy = dowY + w * 0.04;
    x.fillStyle = '#A9A9AE'; x.font = '500 ' + Math.round(w * 0.022) + 'px "IBM Plex Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    'MTWTFSS'.split('').forEach((d, i) => x.fillText(d, gx + cell * (i + 0.5), dowY));
    for (let d = 1; d <= o.days; d++) {
      const k = o.lead + d - 1, cxp = gx + (k % 7) * cell, cyp = gy + Math.floor(k / 7) * cell, im = o.cells[d];
      if (im) coverDraw(x, im, cxp + 1, cyp + 1, cell - 2, cell - 2);
      x.fillStyle = im ? '#fff' : '#A9A9AE'; x.font = '500 ' + Math.round(w * 0.022) + 'px Inter, system-ui, sans-serif'; x.textAlign = 'right'; x.textBaseline = 'top';
      if (im) { x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 4; x.fillText(d, cxp + cell - w * 0.008, cyp + w * 0.006); x.restore(); } else x.fillText(d, cxp + cell - w * 0.008, cyp + w * 0.006);
      if (d === o.today) { x.strokeStyle = '#141416'; x.lineWidth = 3; x.strokeRect(cxp + 2.5, cyp + 2.5, cell - 5, cell - 5); }
    }
    x.strokeStyle = 'rgba(20,20,22,.08)'; x.lineWidth = 1;
    for (let i = 0; i <= 7; i++) { x.beginPath(); x.moveTo(gx + i * cell, gy); x.lineTo(gx + i * cell, gy + rows * cell); x.stroke(); }
    for (let j = 0; j <= rows; j++) { x.beginPath(); x.moveTo(gx, gy + j * cell); x.lineTo(gx + gw, gy + j * cell); x.stroke(); }
    x.restore();
    // ring binding across the hero's lower edge
    const ry = y0 + heroH, rw = w * 0.022, rh = w * 0.06;
    for (let i = 0; i < 8; i++) { if (i === 3 || i === 4) continue; const rx = x0 + w * 0.09 + i * (w * 0.82 / 7);
      x.save(); x.lineWidth = rw * 0.4; const g = x.createLinearGradient(rx - rw, 0, rx + rw, 0); g.addColorStop(0, '#e9e9ee'); g.addColorStop(0.5, '#b9b9bf'); g.addColorStop(1, '#7f7f86'); x.strokeStyle = g;
      x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 3; x.shadowOffsetY = 1; round(x, rx - rw / 2, ry - rh / 2, rw, rh, rw / 2); x.stroke(); x.restore(); }
    // year, small, top right of the hero
    x.save(); x.fillStyle = 'rgba(255,255,255,.9)'; x.font = '500 ' + Math.round(w * 0.026) + 'px "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.textAlign = 'right'; x.textBaseline = 'bottom'; x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 6; x.fillText(String(o.year), x0 + w - pad, y0 + heroH - pad * 1.6); if (x.letterSpacing !== undefined) x.letterSpacing = '0px'; x.restore();
    // the month name, cut out: every letter its own scrap of paper, its own type, a little crooked, stuck over the card's top edge
    cutout(x, o.month, x0 - w * 0.02, y0 - w * 0.07, w * 0.86, w * 0.15, o.seed || 7);
    details(x, F, o, x0, y0 + h + foot * 0.55);
    return c;
  };
  function cutout(x, word, lx, ty, maxW, size, seed) {
    let sd = seed; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const PAPERS = [['#FDFCFA', '#141416'], ['#141416', '#FDFCFA'], ['#F2E6C9', '#141416'], ['#FDFCFA', '#C8553A'], ['#E8B44C', '#141416'], ['#EDEDEF', '#2e56a0']];
    const FONTS = ['700 {s}px Georgia, "Times New Roman", serif', '600 {s}px Inter, system-ui, sans-serif', 'italic 400 {s}px Georgia, serif', '500 {s}px "IBM Plex Mono", monospace', '800 {s}px "Arial Black", Inter, sans-serif'];
    const L = word.split('').map((ch, i) => { const s = size * (0.78 + rnd() * 0.32), f = FONTS[Math.floor(rnd() * FONTS.length)].replace('{s}', Math.round(s)), p = PAPERS[(i === 0 ? 1 : Math.floor(rnd() * PAPERS.length))];
      x.font = f; const tw = x.measureText(ch).width; return { ch, s, f, p, w: tw + s * 0.26, h: s * 1.12, rot: (rnd() - 0.5) * 0.22, dy: (rnd() - 0.5) * size * 0.16 }; });
    let total = L.reduce((a, l) => a + l.w, 0) - (L.length - 1) * size * 0.04; const k = Math.min(1, maxW / total);
    let px = lx;
    for (const l of L) {
      const w = l.w * k, h = l.h * k, cxp = px + w / 2, cyp = ty + size * k * 0.6 + l.dy * k;
      x.save(); x.translate(cxp, cyp); x.rotate(l.rot);
      x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8 * k; x.shadowOffsetY = 3 * k; x.fillStyle = l.p[0];
      x.beginPath(); const j = () => (rnd() - 0.5) * w * 0.06;   // torn, uneven scissor edges
      x.moveTo(-w / 2 + j(), -h / 2 + j()); x.lineTo(w / 2 + j(), -h / 2 + j()); x.lineTo(w / 2 + j(), h / 2 + j()); x.lineTo(-w / 2 + j(), h / 2 + j()); x.closePath(); x.fill();
      x.shadowColor = 'transparent'; x.fillStyle = l.p[1]; x.font = l.f.replace(/\d+px/, Math.round(l.s * k) + 'px'); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(l.ch, 0, h * 0.04);
      x.restore(); px += w - size * 0.04 * k;
    }
  }

  /* o: { format: 'story'|'post', side: 'front'|'back'|'both', photo, front, back (canvases), stickers, left, right, mark }
     Layout after Retro's shares (Cody, 16 Nov: "too much empty space"): the photo itself, enlarged and blurred, fills the frame;
     the card sits big in the middle; one quiet line of details under it. */
  S.render = function (o) {
    const F = FORMATS[o.format], c = mk(F.w, F.h), x = c.getContext('2d');
    backdrop(x, F, o.photo);
    // 2. the card(s), as big as the clear area allows
    const foot = o.format === 'story' ? 96 : 76, top = F.safeTop, bottom = F.h - F.safeBottom - foot, areaH = bottom - top, midY = top + areaH / 2;
    let w;
    if (o.side !== 'both') {
      w = Math.min(F.w - F.side * 2, (areaH - 24) / ASPECT);
      card(x, o.side === 'back' ? o.back : o.front, o.side === 'back' ? o.stickers : [], F.w / 2, midY, w, -0.01);
    } else {                                            // the back tucked behind, the front laid over it
      w = Math.min(F.w * 0.74, (areaH - 30) / ASPECT / 1.1);
      card(x, o.back, o.stickers, F.w / 2 - w * 0.13, midY - w * 0.06, w, -0.06);
      card(x, o.front, [], F.w / 2 + w * 0.1, midY + w * 0.05, w, 0.035);
    }
    // 3. the details: under the card, left and right aligned to its edges, white on the backdrop
    details(x, F, o, Math.max(F.side, F.w / 2 - (o.side === 'both' ? w * 0.62 : w / 2)), bottom + foot * 0.45);
    return c;
  };
})();
