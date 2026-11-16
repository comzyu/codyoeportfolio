/* Poto v2 — stamps cut from your own photos (Cody's board #9: a stamp with a perforated edge, cut out of a photo).
   PotoStamp.render(image, crop, opts) draws one stamp into a transparent canvas:
   gummed white paper, the picture inset with a hairline, perforated edges punched right through, and (optionally) small printed type. */
(function () {
  const S = (window.PotoStamp = {});
  // the shapes on offer (Cody to choose): picture aspect width / height
  S.SHAPES = { portrait: 4 / 5, square: 1, landscape: 5 / 4 };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  /* image: HTMLImageElement or canvas. crop: {x, y, w, h} in image pixels (aspect should match the shape).
     opts: { shape, printed (bool), value ('27'), label ('POTO'), date ('15 NOV 26'), width (px, default 480) } */
  S.render = function (image, crop, o) {
    o = Object.assign({ shape: 'portrait', printed: true, value: '27', label: 'POTO', date: '', width: 480 }, o || {});
    const a = S.SHAPES[o.shape] || 0.8, W = o.width, pad = Math.round(W * 0.075), pw = W - pad * 2, ph = Math.round(pw / a);
    const foot = o.printed ? Math.round(W * 0.1) : 0, H = ph + pad * 2 + foot;
    const c = mk(W, H), x = c.getContext('2d');
    // paper: warm white with a faint tooth
    x.fillStyle = '#FBFAF6'; x.fillRect(0, 0, W, H);
    if (window.PotoTex) { x.save(); x.globalAlpha = 0.5; x.globalCompositeOperation = 'multiply'; x.fillStyle = x.createPattern(PotoTex.paper(57, [255, 255, 255], { cloud: 0.05, light: 0.35 }), 'repeat'); x.fillRect(0, 0, W, H); x.restore(); }
    // the picture, true colour, with a hairline frame like a printed stamp
    x.imageSmoothingQuality = 'high';
    x.drawImage(image, crop.x, crop.y, crop.w, crop.h, pad, pad, pw, ph);
    x.strokeStyle = 'rgba(30,28,24,.28)'; x.lineWidth = Math.max(1, W / 400); x.strokeRect(pad - 0.5, pad - 0.5, pw + 1, ph + 1);
    if (o.printed) {
      const fy = pad + ph + foot * 0.62; x.fillStyle = '#2a2826'; x.textBaseline = 'alphabetic';
      x.font = '500 ' + Math.round(W * 0.034) + 'px "IBM Plex Mono", ui-monospace, monospace'; if (x.letterSpacing !== undefined) x.letterSpacing = Math.round(W * 0.008) + 'px';
      x.textAlign = 'left'; x.fillText(o.label, pad, fy);
      if (o.date) { x.fillStyle = 'rgba(42,40,38,.55)'; x.textAlign = 'center'; x.fillText(o.date, W / 2, fy); }
      if (x.letterSpacing !== undefined) x.letterSpacing = '0px'; x.fillStyle = '#2a2826'; x.textAlign = 'right'; x.font = '600 ' + Math.round(W * 0.06) + 'px "IBM Plex Mono", ui-monospace, monospace'; x.fillText(o.value, W - pad, fy + W * 0.008);
    }
    // perforations: round holes punched through the paper edge, evenly spaced, a whole number per side, corners clean
    const r = W * 0.024, step = r * 2.55;
    x.save(); x.globalCompositeOperation = 'destination-out';
    const row = (len, place) => { const n = Math.max(2, Math.round(len / step)), s = len / n; for (let i = 0; i <= n; i++) place(i * s); };
    row(W, (t) => { x.beginPath(); x.arc(t, 0, r, 0, 7); x.fill(); x.beginPath(); x.arc(t, H, r, 0, 7); x.fill(); });
    row(H, (t) => { x.beginPath(); x.arc(0, t, r, 0, 7); x.fill(); x.beginPath(); x.arc(W, t, r, 0, 7); x.fill(); });
    x.restore();
    c.holes = { r, step, W, H };
    return c;
  };
  /* the perforation positions as fractions of the stamp's size: used to animate the punch, hole by hole, along the cut line */
  S.holes = function (W, H) {
    const r = W * 0.024, step = r * 2.55, out = [];
    const row = (len) => { const n = Math.max(2, Math.round(len / step)), s = len / n, a = []; for (let i = 0; i <= n; i++) a.push(i * s); return a; };
    const xs = row(W), ys = row(H);
    xs.forEach((t) => out.push([t / W, 0])); ys.forEach((t) => out.push([1, t / H])); xs.slice().reverse().forEach((t) => out.push([t / W, 1])); ys.slice().reverse().forEach((t) => out.push([0, t / H]));
    return { r: r / W, pts: out };
  };
})();
