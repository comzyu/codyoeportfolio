/* Poto prototypes — shared helpers: top bar, sound, haptic indicator, tweak panel, easing.
   No build step, no dependencies. Sounds come from sounds.js (generated). */
(function () {
  const P = (window.Poto = {});
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---- reduce motion ---- */
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  P.reduced = () => mq.matches || P._forceReduced === true;

  /* ---- easing: named curves are the same numbers motion-spec.md gives to Reanimated ---- */
  P.curves = {
    linear: [0, 0, 1, 1],
    standard: [0.2, 0, 0, 1],        // quick start, long soft landing: most UI moves
    inOut: [0.45, 0, 0.55, 1],       // symmetric: the flip
    paper: [0.3, 0.7, 0.2, 1],       // light thing settling onto a table
    mechanical: [0.5, 0, 0.3, 1],    // gears: firm start, firm stop
    chemical: [0.35, 0, 0.25, 1],    // the develop curve: slow to wake, never rushes
    out: [0, 0, 0.2, 1],
    in: [0.6, 0, 1, 1],
  };
  P.bezier = function (x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
    const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
    const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const s = slope(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (calc(t, x1, x2) - x) / s; }
      return calc(Math.min(1, Math.max(0, t)), y1, y2);
    };
  };
  P.ease = (name) => P.bezier.apply(null, P.curves[name] || P.curves.standard);
  P.css = (name) => 'cubic-bezier(' + (P.curves[name] || P.curves.standard).join(',') + ')';
  P.clamp = (v, a, b) => Math.min(b == null ? 1 : b, Math.max(a == null ? 0 : a, v));
  P.lerp = (a, b, t) => a + (b - a) * t;
  P.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---- sound (Web Audio, started by the first tap) ---- */
  let ctx = null, master = null; const buffers = {}; const live = [];
  P.muted = store.get('poto.muted', false);
  function ensureAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = P.muted ? 0 : 1; master.connect(ctx.destination);
    Object.keys(window.POTO_SOUNDS || {}).forEach((name) => {
      const b64 = window.POTO_SOUNDS[name].split(',')[1]; const bin = atob(b64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      ctx.decodeAudioData(bytes.buffer, (buf) => { buffers[name] = buf; }, () => {});
    });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, ensureAudio, { passive: true }));
  /* play(name, { volume, rate, detune (cents, random +/-), loop, maxVoices }) -> stop() */
  P.play = function (name, o) {
    o = o || {}; ensureAudio();
    if (!ctx || !buffers[name]) return () => {};
    const max = o.maxVoices || 8;
    while (live.length >= max) { const old = live.shift(); try { old.stop(); } catch (e) {} }
    const src = ctx.createBufferSource(); src.buffer = buffers[name]; src.loop = !!o.loop;
    src.playbackRate.value = (o.rate || 1) * Math.pow(2, ((o.detune || 0) * (Math.random() * 2 - 1)) / 1200);
    const g = ctx.createGain(); g.gain.value = o.volume == null ? 1 : o.volume;
    src.connect(g); g.connect(master); src.start();
    live.push(src); src.onended = () => { const i = live.indexOf(src); if (i >= 0) live.splice(i, 1); };
    return function stop(fadeMs) {
      try { g.gain.setTargetAtTime(0, ctx.currentTime, (fadeMs || 80) / 3000); src.stop(ctx.currentTime + (fadeMs || 80) / 1000 + 0.05); } catch (e) {}
    };
  };
  P.setMuted = function (m) { P.muted = m; store.set('poto.muted', m); if (master) master.gain.value = m ? 0 : 1; };

  /* ---- haptic indicator ---- */
  let hEl = null, hTimer = 0;
  const VIB = { Light: 8, Medium: 16, Heavy: 28, Soft: 10, Rigid: 12, Selection: 4, Success: [10, 60, 18] };
  P.haptic = function (type) {
    if (!hEl) { hEl = document.createElement('div'); hEl.className = 'haptic'; hEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(hEl); }
    hEl.textContent = 'haptic · ' + type; hEl.classList.add('on');
    clearTimeout(hTimer); hTimer = setTimeout(() => hEl.classList.remove('on'), 60);
    try { if (navigator.vibrate) navigator.vibrate(VIB[type] || 10); } catch (e) {}
  };

  /* ---- top bar ---- */
  P.bar = function (title, tag) {
    const bar = document.createElement('header'); bar.className = 'bar';
    const preview = /preview/i.test(tag || '');
    bar.innerHTML = '<a href="index.html" aria-label="All prototypes">‹</a><h1></h1><span class="mono tag' + (preview ? ' preview' : '') + '"></span>' +
      '<button id="poto-mute" type="button"></button><button id="poto-tweak" type="button" aria-pressed="false">Tweak</button>';
    bar.querySelector('h1').textContent = title; bar.querySelector('.tag').textContent = tag || '';
    document.body.prepend(bar);
    const mute = bar.querySelector('#poto-mute');
    const paint = () => { mute.textContent = P.muted ? 'Sound off' : 'Sound on'; mute.setAttribute('aria-pressed', String(!P.muted)); };
    mute.onclick = () => { P.setMuted(!P.muted); paint(); }; paint();
    return bar;
  };

  /* ---- tweak panel ----
     P.panel('id', [{ key, label, min, max, step, value, unit } | { key, label, options: [..], value }], onChange) -> live values object */
  P.panel = function (id, specs, onChange) {
    const saved = store.get('poto.tweak.' + id, {}); const values = {};
    specs.forEach((s) => { values[s.key] = saved[s.key] != null ? saved[s.key] : s.value; });
    const el = document.createElement('section'); el.className = 'tweak'; el.setAttribute('aria-label', 'Tweak panel');
    const fmt = (s, v) => (s.options ? v : (+v).toFixed(s.step && s.step < 1 ? (String(s.step).split('.')[1] || '').length : 0) + (s.unit || ''));
    specs.forEach((s) => {
      const row = document.createElement('div'); row.className = 'row'; const cid = 'tw-' + id + '-' + s.key;
      if (s.options) {
        row.innerHTML = '<label for="' + cid + '">' + s.label + '</label><select id="' + cid + '">' + s.options.map((o) => '<option>' + o + '</option>').join('') + '</select>';
      } else {
        row.innerHTML = '<label for="' + cid + '">' + s.label + '</label><input id="' + cid + '" type="range" min="' + s.min + '" max="' + s.max + '" step="' + (s.step || 1) + '"><output></output>';
      }
      const input = row.querySelector('input,select'); input.value = values[s.key];
      const out = row.querySelector('output'); if (out) out.textContent = fmt(s, values[s.key]);
      input.addEventListener('input', () => {
        values[s.key] = s.options ? input.value : +input.value; if (out) out.textContent = fmt(s, values[s.key]);
        store.set('poto.tweak.' + id, values); if (onChange) onChange(values, s.key);
      });
      s._input = input; s._out = out; el.appendChild(row);
    });
    const acts = document.createElement('div'); acts.className = 'acts';
    acts.innerHTML = '<button type="button" data-a="reset">Reset</button><button type="button" class="primary" data-a="copy">Copy values</button>';
    el.appendChild(acts); document.body.appendChild(el);
    acts.querySelector('[data-a=reset]').onclick = () => {
      specs.forEach((s) => { values[s.key] = s.value; s._input.value = s.value; if (s._out) s._out.textContent = fmt(s, s.value); });
      store.set('poto.tweak.' + id, values); if (onChange) onChange(values, null);
    };
    const copyBtn = acts.querySelector('[data-a=copy]');
    copyBtn.onclick = () => {
      const text = 'poto/' + id + ' ' + JSON.stringify(values);
      const done = () => { copyBtn.textContent = 'Copied'; setTimeout(() => (copyBtn.textContent = 'Copy values'), 1400); };
      const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:16px;right:16px;bottom:120px;height:90px;z-index:99;font:12px monospace'; document.body.appendChild(ta); ta.select(); copyBtn.textContent = 'Select + copy'; setTimeout(() => { ta.remove(); copyBtn.textContent = 'Copy values'; }, 6000); };
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    };
    const tb = document.getElementById('poto-tweak');
    if (tb) tb.onclick = () => { const open = el.classList.toggle('open'); tb.setAttribute('aria-pressed', String(open)); document.body.classList.toggle('tweaking', open); };
    return values;
  };

  /* ---- tiny animation driver: P.run(ms, (t01, elapsedMs) => {}, easeName) -> { cancel, done } ---- */
  P.run = function (ms, frame, easeName) {
    const e = easeName ? P.ease(easeName) : (x) => x; let raf = 0, stopped = false, res; const t0 = performance.now();
    const done = new Promise((r) => (res = r));
    (function tick(now) {
      if (stopped) return; const t = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
      frame(e(t), now - t0); if (t < 1) raf = requestAnimationFrame(tick); else res(true);
    })(performance.now());
    return { cancel() { stopped = true; cancelAnimationFrame(raf); res(false); }, done };
  };
})();
