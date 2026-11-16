/* Poto v2 — share images: Instagram Story (9:16, 1080x1920) and Post (4:5, 1080x1350).
   Drawn flat in 2D from the same card textures, so they're pixel-sharp (no 3D blur).
   The card always sits inside the area Instagram leaves clear, and the description + watermark are always readable. */
(function () {
  const S = (window.PotoShare = {});
  const FORMATS = {
    story: { w: 1080, h: 1920, safeTop: 250, safeBottom: 340, side: 64 },   // Story UI covers ~250 px at the top (bar, name) and ~340 px at the bottom (reply box)
    post: { w: 1080, h: 1350, safeTop: 70, safeBottom: 70, side: 70 },      // 4:5 feed post: nothing overlaps, keep a calm margin
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

  /* o: { format: 'story'|'post', side: 'front'|'back'|'both', front, back (canvases), stickers, caption, place, mark } */
  S.render = function (o) {
    const F = FORMATS[o.format], c = mk(F.w, F.h), x = c.getContext('2d');
    // the room: gallery white, lit softly from the top left
    x.fillStyle = '#F6F5F1'; x.fillRect(0, 0, F.w, F.h);
    const lg = x.createRadialGradient(F.w * 0.2, F.h * 0.05, 0, F.w * 0.2, F.h * 0.05, F.h * 1.1); lg.addColorStop(0, 'rgba(255,255,255,.9)'); lg.addColorStop(1, 'rgba(232,229,222,.0)');
    x.fillStyle = lg; x.fillRect(0, 0, F.w, F.h);
    const top = F.safeTop, bottom = F.h - F.safeBottom, textH = o.format === 'story' ? 120 : 92, areaH = bottom - top - textH, midY = top + areaH / 2;
    const both = o.side === 'both';
    if (!both) {
      const w = Math.min(F.w - F.side * 2, (areaH - 40) / ASPECT);
      card(x, o.side === 'back' ? o.back : o.front, o.side === 'back' ? o.stickers : [], F.w / 2, midY, w, -0.012);
    } else if (o.format === 'story') {                  // story: the back tucked behind and to the left, the front laid over it
      const w = Math.min(F.w * 0.66, (areaH - 60) / ASPECT / 1.12);
      card(x, o.back, o.stickers, F.w / 2 - w * 0.2, midY - w * 0.17, w, -0.075);
      card(x, o.front, [], F.w / 2 + w * 0.17, midY + w * 0.17, w, 0.04);
    } else {                                            // post: side by side, a little loose
      const w = Math.min((F.w - F.side * 2 - 36) / 2, (areaH - 50) / ASPECT);
      card(x, o.front, [], F.w / 2 - w / 2 - 18, midY - 6, w, -0.022);
      card(x, o.back, o.stickers, F.w / 2 + w / 2 + 18, midY + 8, w, 0.018);
    }
    // the description and the watermark: always inside the clear area, always big enough to read in the app
    const ty = bottom - textH + (o.format === 'story' ? 44 : 34);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#3b3a37';
    x.font = '500 ' + (o.format === 'story' ? 30 : 26) + 'px "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '5px';
    x.fillText(o.caption.toUpperCase(), F.w / 2, ty);
    x.fillStyle = '#8e8c86'; x.font = '500 ' + (o.format === 'story' ? 26 : 22) + 'px "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.fillText(o.mark, F.w / 2, ty + (o.format === 'story' ? 50 : 42));
    if (x.letterSpacing !== undefined) x.letterSpacing = '0px';
    return c;
  };
})();
