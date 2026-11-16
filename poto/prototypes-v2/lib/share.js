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

  /* o: { format: 'story'|'post', side: 'front'|'back'|'both', photo, front, back (canvases), stickers, left, right, mark }
     Layout after Retro's shares (Cody, 16 Nov: "too much empty space"): the photo itself, enlarged and blurred, fills the frame;
     the card sits big in the middle; one quiet line of details under it. */
  S.render = function (o) {
    const F = FORMATS[o.format], c = mk(F.w, F.h), x = c.getContext('2d');
    // 1. the backdrop: the same photo, cover-fit, heavily blurred, a little darker so the card lifts off it
    const ph = o.photo, cover = Math.max(F.w / ph.width, F.h / ph.height) * 1.15;
    // Cody, 16 Nov: the same photo twice read as a double. So the backdrop is turned into something else: black and white, softly blurred, with film grain.
    x.save(); x.filter = 'grayscale(1) contrast(1.08) blur(' + Math.round(F.w * 0.03) + 'px)'; x.drawImage(ph, (F.w - ph.width * cover) / 2, (F.h - ph.height * cover) / 2, ph.width * cover, ph.height * cover); x.restore();
    x.fillStyle = 'rgba(12,12,12,.30)'; x.fillRect(0, 0, F.w, F.h);
    { const g = mk(256, 256), gx = g.getContext('2d'), id = gx.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 140; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } gx.putImageData(id, 0, 0);
      x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.32; x.fillStyle = x.createPattern(g, 'repeat'); x.fillRect(0, 0, F.w, F.h); x.restore(); }
    const vg = x.createRadialGradient(F.w / 2, F.h / 2, F.h * 0.25, F.w / 2, F.h / 2, F.h * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = vg; x.fillRect(0, 0, F.w, F.h);
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
    // 3. the details: under the card, left and right aligned to its edges, white on the blurred photo
    const ex = Math.max(F.side, F.w / 2 - (o.side === 'both' ? w * 0.62 : w / 2)), y1 = bottom + foot * 0.45, y2 = y1 + (o.format === 'story' ? 36 : 30);
    x.fillStyle = 'rgba(255,255,255,.92)'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 6;
    const big = (o.format === 'story' ? 25 : 22) + 'px', small = (o.format === 'story' ? 21 : 18) + 'px';
    x.font = '500 ' + big + ' "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.textAlign = 'left'; x.fillText(o.left.toUpperCase(), ex, y1); x.textAlign = 'right'; x.fillText(o.right.toUpperCase(), F.w - ex, y1);
    x.fillStyle = 'rgba(255,255,255,.66)'; x.font = '500 ' + small + ' "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '2px';
    x.textAlign = 'left'; x.fillText(o.handle, ex, y2); x.textAlign = 'right'; x.fillText(o.mark, F.w - ex, y2);
    if (x.letterSpacing !== undefined) x.letterSpacing = '0px';
    return c;
  };
})();
