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
  // Cody, 16 Nov: "fill up the entire screen". The picture now runs almost edge to edge; only the very top (progress bar, name)
  // and the reply box are kept clear, not the full Story safe zone.
  const FILL = { story: { top: 176, bottom: 214, side: 40 }, post: { top: 40, bottom: 26, side: 44 } };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ASPECT = 1448 / 1024;

  // one card: its face (front or back texture), any stickers on it, a soft two-part shadow
  function card(ctx, face, stickers, cx, cy, w, rot, photo, pr) {
    const h = w * ASPECT, s = w / 1024;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.save(); ctx.shadowColor = 'rgba(25,22,18,.20)'; ctx.shadowBlur = w * 0.09; ctx.shadowOffsetY = w * 0.045; ctx.fillStyle = '#fff'; round(ctx, -w / 2, -h / 2, w, h, w * 0.012); ctx.fill(); ctx.restore();   // soft fall
    ctx.save(); ctx.shadowColor = 'rgba(25,22,18,.22)'; ctx.shadowBlur = w * 0.008; ctx.shadowOffsetY = w * 0.003; round(ctx, -w / 2, -h / 2, w, h, w * 0.012); ctx.fill(); ctx.restore();                         // contact
    ctx.save(); round(ctx, -w / 2, -h / 2, w, h, w * 0.012); ctx.clip(); ctx.drawImage(face, -w / 2, -h / 2, w, h);
    if (photo && pr) { ctx.imageSmoothingQuality = 'high'; coverDraw(ctx, photo, -w / 2 + pr.x * w, -h / 2 + pr.y * h, pr.w * w, pr.h * h); }   // true colour, full resolution: the original photo, not the texture copy
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
    // Cody, 17 Nov: frosted GLASS, not paper. Glass diffuses light smoothly: the photo melts into soft, even shapes (big blur, no blotches),
    // a cool milky veil sits over it, light catches a broad diagonal sheen, and there's only a whisper of very fine grain up close.
    const cover = Math.max(F.w / ph.width, F.h / ph.height) * 1.25;
    x.fillStyle = '#E6E7E8'; x.fillRect(0, 0, F.w, F.h);
    x.save(); x.filter = 'grayscale(1) contrast(.85) blur(' + Math.round(F.w * 0.075) + 'px)'; x.globalAlpha = 0.9; x.drawImage(ph, (F.w - ph.width * cover) / 2, (F.h - ph.height * cover) / 2, ph.width * cover, ph.height * cover); x.restore();
    x.fillStyle = 'rgba(236,238,240,.58)'; x.fillRect(0, 0, F.w, F.h);                                   // the milky body of the glass, a touch cool
    const sh = x.createLinearGradient(0, 0, F.w, F.h);                                                   // light across the pane
    sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(0.38, 'rgba(255,255,255,.04)'); sh.addColorStop(0.62, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.14)');
    x.fillStyle = sh; x.fillRect(0, 0, F.w, F.h);
    let sd = 11; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
    const g = mk(256, 256), gx = g.getContext('2d'), id = gx.createImageData(256, 256);                // fine, even, low: etched glass, not paper
    for (let i = 0; i < id.data.length; i += 4) { const v = r(); id.data[i] = id.data[i + 1] = id.data[i + 2] = v > 0.5 ? 255 : 90; id.data[i + 3] = Math.abs(v - 0.5) * 2 * 22; }
    gx.putImageData(id, 0, 0); x.save(); x.fillStyle = x.createPattern(g, 'repeat'); x.fillRect(0, 0, F.w, F.h); x.restore();
  }
  function coverDraw(x, im, dx, dy, dw, dh) { x.imageSmoothingQuality = 'high'; const k = Math.max(dw / im.width, dh / im.height), sw = dw / k, sh = dh / k; x.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, dx, dy, dw, dh); }
  function details(x, F, o, ex, y1) {
    const y2 = y1 + (o.format === 'story' ? 36 : 30);
    x.save(); x.fillStyle = '#141416'; x.textBaseline = 'middle';
    const big = (o.format === 'story' ? 25 : 22) + 'px', small = (o.format === 'story' ? 21 : 18) + 'px';
    x.font = '500 ' + big + ' "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.textAlign = 'left'; x.fillText(o.left.toUpperCase(), ex, y1); x.textAlign = 'right'; x.fillText(o.right.toUpperCase(), F.w - ex, y1);
    x.fillStyle = 'rgba(20,20,22,.55)'; x.font = '500 ' + small + ' "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '2px';
    x.textAlign = 'left'; x.fillText(o.handle, ex, y2); x.textAlign = 'right'; x.fillText(o.mark, F.w - ex, y2);
    if (x.letterSpacing !== undefined) x.letterSpacing = '0px'; x.restore();
  }

  /* the monthly recap (board #4, #15): the calendar as in the app, filling the frame. Hero photo on top with a small "nov.",
     ring binding, then the days on plain white. The backdrop is another photo from the month, black and white behind frosted glass.
     o: { format, photo (hero), backdrop, month, year, lead, days, cells: {day: image}, today, left, right, handle, mark } */
  S.month = function (o) {
    const F = FORMATS[o.format], c = mk(F.w, F.h), x = c.getContext('2d'), M = FILL[o.format];
    backdrop(x, F, o.backdrop || o.photo);
    const foot = o.format === 'story' ? 92 : 72, avail = F.h - M.top - M.bottom - foot, rows = 6;
    let w = F.w - M.side * 2, pad = w * 0.035, cell = (w - pad * 2) / 7, dowH = w * 0.06, gridH = pad * 0.8 + dowH + rows * cell + pad;
    let heroH = avail - gridH;
    if (heroH < w * 0.5) { w = avail / (0.5 + (0.035 * 1.8 + 0.06) + rows / 7 * (1 - 0.07)); pad = w * 0.035; cell = (w - pad * 2) / 7; dowH = w * 0.06; gridH = pad * 0.8 + dowH + rows * cell + pad; heroH = w * 0.5; }
    const h = heroH + gridH, x0 = (F.w - w) / 2, y0 = M.top + (avail - h) / 2, r = w * 0.035, seam = y0 + heroH;
    // one soft shadow under the whole calendar
    x.save(); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = w * 0.06; x.shadowOffsetY = w * 0.03; x.fillStyle = '#fff'; round(x, x0, y0, w, h, r); x.fill(); x.restore();
    x.save(); round(x, x0, y0, w, h, r); x.clip();
    coverDraw(x, o.photo, x0, y0, w, heroH);
    x.fillStyle = '#FFFFFF'; x.fillRect(x0, seam, w, gridH);                       // Cody: the page is plain white, so only the photos speak
    const gx = x0 + pad, gy = seam + pad * 0.8 + dowH;
    x.fillStyle = 'rgba(20,20,22,.45)'; x.font = '500 ' + Math.round(w * 0.022) + 'px "IBM Plex Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    'MTWTFSS'.split('').forEach((d, i) => x.fillText(d, gx + cell * (i + 0.5), seam + pad * 0.8 + dowH * 0.55));
    for (let d = 1; d <= o.days; d++) {
      const k = o.lead + d - 1, cx = gx + (k % 7) * cell, cy = gy + Math.floor(k / 7) * cell, im = o.cells[d];
      if (im) coverDraw(x, im, cx + 1, cy + 1, cell - 2, cell - 2);
      x.textAlign = 'right'; x.textBaseline = 'top'; x.font = '500 ' + Math.round(w * 0.021) + 'px Inter, system-ui, sans-serif';
      if (im) { x.save(); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 4; x.fillText(d, cx + cell - w * 0.008, cy + w * 0.006); x.restore(); }
      else { x.fillStyle = 'rgba(20,20,22,.4)'; x.fillText(d, cx + cell - w * 0.008, cy + w * 0.006); }
      if (d === o.today) { x.strokeStyle = '#141416'; x.lineWidth = 3; x.strokeRect(cx + 2.5, cy + 2.5, cell - 5, cell - 5); }
    }
    x.strokeStyle = 'rgba(20,20,22,.09)'; x.lineWidth = 1;
    for (let i = 0; i <= 7; i++) { x.beginPath(); x.moveTo(gx + i * cell, gy); x.lineTo(gx + i * cell, gy + rows * cell); x.stroke(); }
    for (let j = 0; j <= rows; j++) { x.beginPath(); x.moveTo(gx, gy + j * cell); x.lineTo(gx + w - pad * 2, gy + j * cell); x.stroke(); }
    x.restore();
        // ring binding on the seam
    const rw = w * 0.02, rh = w * 0.055;
    for (let i = 0; i < 8; i++) { if (i === 3 || i === 4) continue; const rx = x0 + w * 0.09 + i * (w * 0.82 / 7);
      x.save(); x.lineWidth = rw * 0.4; const g = x.createLinearGradient(rx - rw, 0, rx + rw, 0); g.addColorStop(0, '#e9e9ee'); g.addColorStop(0.5, '#b9b9bf'); g.addColorStop(1, '#7f7f86'); x.strokeStyle = g;
      x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 3; x.shadowOffsetY = 1; round(x, rx - rw / 2, seam - rh / 2, rw, rh, rw / 2); x.stroke(); x.restore(); }
    // the month, small and quiet, like the app: "nov." top left, the year top right
    x.save(); round(x, x0, y0, w, h, r); x.clip(); const sc = x.createLinearGradient(0, y0, 0, y0 + heroH * 0.32); sc.addColorStop(0, 'rgba(0,0,0,.42)'); sc.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sc; x.fillRect(x0, y0, w, heroH * 0.32); x.restore();
    x.save(); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 14; x.shadowOffsetY = 2; x.textBaseline = 'top';
    x.font = '400 ' + Math.round(w * 0.075) + 'px Inter, system-ui, sans-serif'; x.textAlign = 'left'; x.fillText(o.month, x0 + w * 0.05, y0 + w * 0.04);
    x.fillStyle = 'rgba(255,255,255,.88)'; x.font = '500 ' + Math.round(w * 0.03) + 'px "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.textAlign = 'right'; x.fillText(String(o.year), x0 + w * 0.95, y0 + w * 0.055); if (x.letterSpacing !== undefined) x.letterSpacing = '0px'; x.restore();
    details(x, F, o, x0, y0 + h + foot * 0.42);
    return c;
  };

  /* o: { format: 'story'|'post', side: 'front'|'back'|'both', photo, front, back (canvases), stickers, left, right, mark }
     Layout after Retro's shares (Cody, 16 Nov: "too much empty space"): the photo itself, enlarged and blurred, fills the frame;
     the card sits big in the middle; one quiet line of details under it. */
  S.render = function (o) {
    const F = FORMATS[o.format], c = mk(F.w, F.h), x = c.getContext('2d');
    backdrop(x, F, o.photo);
    // 2. the card(s), as big as the frame allows: card + one details line, centred in the space between the top bar and the reply box
    const M = FILL[o.format], foot = o.format === 'story' ? 92 : 72, avail = F.h - M.top - M.bottom - foot;
    let w, h, ex;
    if (o.side !== 'both') {
      w = Math.min(F.w - M.side * 2, avail / ASPECT); h = w * ASPECT;
      const y0 = M.top + (avail - h) / 2; card(x, o.side === 'back' ? o.back : o.front, o.side === 'back' ? o.stickers : [], F.w / 2, y0 + h / 2, w, -0.008, o.side === 'back' ? null : o.photo, o.photoRect);
      ex = F.w / 2 - w / 2; details(x, F, o, ex, y0 + h + foot * 0.42);
    } else {                                            // the back tucked behind, the front laid over it
      w = Math.min(F.w * 0.8, avail / ASPECT / 1.14); h = w * ASPECT; const midY = M.top + avail / 2;
      card(x, o.back, o.stickers, F.w / 2 - w * 0.1, midY - w * 0.04, w, -0.05);
      card(x, o.front, [], F.w / 2 + w * 0.08, midY + w * 0.04, w, 0.03, o.photo, o.photoRect);
      ex = M.side; details(x, F, o, ex, midY + h * 0.54 + w * 0.04 + foot * 0.42);
    }
    return c;
  };
})();
