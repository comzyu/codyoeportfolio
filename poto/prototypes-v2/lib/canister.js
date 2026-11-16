/* Poto v2 — the film looks and the canister drawing, shared by Rolls and the profile desk. */
window.LOOKS = [
  { id: 'Sunday', bg: '#E8B44C', ink: '#2a1a08', band: '#C8553A', iso: 200, filt: 'sepia(.22) saturate(1.18) contrast(1.02) brightness(1.03)', desc: 'Warm, soft grain, skin looks like late afternoon.', sample: 4 },
  { id: 'Harbour', bg: '#3E7C80', ink: '#EAF2F1', band: '#C9CED1', iso: 400, filt: 'saturate(.82) hue-rotate(-8deg) contrast(1.06) brightness(1.02)', desc: 'Cool and clean. Blues hold, whites stay white.', sample: 7 },
  { id: 'Flashbulb', bg: '#EDEDEF', ink: '#141416', band: '#D8553F', iso: 800, filt: 'contrast(1.28) saturate(1.1) brightness(1.06)', desc: 'Punchy, made for nights and the flash.', sample: 11 },
  { id: 'Silver', bg: '#1b1b1c', ink: '#EDEDEF', band: '#9a9aa0', iso: 400, filt: 'grayscale(1) contrast(1.15)', desc: 'Black and white. Deep blacks, a bit of grit.', sample: 9 },
  { id: 'Lido', bg: '#7FB7D9', ink: '#0f2433', band: '#F2E6C9', iso: 100, filt: 'saturate(1.25) contrast(.96) brightness(1.06)', desc: 'Bright and saturated, for sun and water.', sample: 1 },
];
window.byLook = (id) => LOOKS.find((l) => l.id === id) || LOOKS[0];

// ---- a canister, drawn into a canvas once per look (label paper, print, brushed caps, the curve's shading). Turning it = redrawing the label offset.
const CW = 58, CH = 98, RES = 3;                                  // css size incl. spool end; drawn at 3x so the front one stays sharp when it grows
const sprites = {};
function sprite(L) {
  if (sprites[L.id]) return sprites[L.id];
  const W = CW * RES, H = (CH - 6 - 18) * RES, lab = document.createElement('canvas'); lab.width = W * 3; lab.height = H; const x = lab.getContext('2d');
  // the label: three faces round the can (stripe, name, stripe), printed on paper
  x.fillStyle = L.bg; x.fillRect(0, 0, W * 3, H);
  for (const f of [0, 2]) { x.fillStyle = L.band; x.fillRect(W * f, H * 0.3, W, H * 0.16); x.fillStyle = L.ink; x.globalAlpha = 0.8; x.font = '500 ' + 6.5 * RES + 'px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillText('27 EXP · ' + L.iso, W * f + W / 2, H - 7 * RES); x.globalAlpha = 1; }
  x.save(); x.translate(W * 1.5, H / 2); x.rotate(-Math.PI / 2); x.fillStyle = L.ink; x.font = '600 ' + 10 * RES + 'px Inter, system-ui, sans-serif'; if (x.letterSpacing !== undefined) x.letterSpacing = 1.2 * RES + 'px';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(L.id.toUpperCase(), 0, 0); x.restore();
  const tile = PotoTex.paper(41, [255, 255, 255], { cloud: 0.06, light: 0.4 }); x.globalCompositeOperation = 'multiply'; x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, W * 3, H); x.globalCompositeOperation = 'source-over';
  x.drawImage(PotoTex.grain(0.06, L.iso), 0, 0, W * 3, H);
  // over the label: the curve, the caps, the light trap
  const ov = document.createElement('canvas'); ov.width = W; ov.height = CH * RES; const o = ov.getContext('2d'), top = 6 * RES, cap = 11 * RES, y0 = top + cap - 2 * RES;
  const sh = o.createLinearGradient(0, 0, W, 0); [[0, 'rgba(0,0,0,.45)'], [0.16, 'rgba(0,0,0,.08)'], [0.3, 'rgba(255,255,255,.32)'], [0.46, 'rgba(255,255,255,0)'], [0.62, 'rgba(0,0,0,0)'], [0.84, 'rgba(0,0,0,.22)'], [1, 'rgba(0,0,0,.52)']].forEach(([p, c]) => sh.addColorStop(p, c));
  o.fillStyle = sh; o.fillRect(0, y0, W, H);
  const metal = o.createLinearGradient(0, 0, W, 0); [[0, '#4b4b50'], [0.12, '#9c9ca2'], [0.3, '#eeeef0'], [0.36, '#ffffff'], [0.52, '#c4c4c9'], [0.78, '#8a8a90'], [1, '#46464b']].forEach(([p, c]) => metal.addColorStop(p, c));
  const brush = PotoTex.brushed(W, cap, L.iso);
  for (const cy of [top, CH * RES - cap]) { o.fillStyle = metal; o.beginPath(); o.roundRect(0, cy, W, cap, 3 * RES); o.fill(); o.drawImage(brush, 0, cy); o.fillStyle = 'rgba(255,255,255,.45)'; o.fillRect(2 * RES, cy + 0.6 * RES, W - 4 * RES, 0.8 * RES); o.fillStyle = 'rgba(0,0,0,.25)'; o.fillRect(2 * RES, cy + cap - 1.2 * RES, W - 4 * RES, 1 * RES); }
  const sp = o.createLinearGradient(W * 0.34, 0, W * 0.66, 0); sp.addColorStop(0, '#2a2a2c'); sp.addColorStop(0.4, '#6a6a70'); sp.addColorStop(1, '#2a2a2c'); o.fillStyle = sp; o.beginPath(); o.roundRect(W * 0.34, 0, W * 0.32, top + 1 * RES, [2 * RES, 2 * RES, 0, 0]); o.fill();
  o.fillStyle = '#121213'; o.fillRect(W - 3 * RES, y0 + H * 0.2, 4 * RES, H * 0.6);
  return (sprites[L.id] = { lab, ov, W, H, y0 });
}
function makeCan(L) {
  const el = document.createElement('div'); el.className = 'can'; const cv = document.createElement('canvas'); cv.width = CW * RES; cv.height = CH * RES; el.appendChild(cv);
  const sp = sprite(L), x = cv.getContext('2d'); let last = null;
  el.draw = (off) => { off = Math.round(off * 200) / 200; if (off === last) return; last = off;                  // off: 0 = name facing you, ±1 = turned a face away
    x.clearRect(0, 0, cv.width, cv.height); const sx = ((1 + off) * sp.W % (sp.W * 3) + sp.W * 3) % (sp.W * 3);
    x.save(); x.beginPath(); x.rect(0, sp.y0, sp.W, sp.H); x.clip(); x.drawImage(sp.lab, sx, 0, sp.W, sp.H, 0, sp.y0, sp.W, sp.H); if (sx + sp.W > sp.W * 3) x.drawImage(sp.lab, 0, 0, sp.W, sp.H, sp.W * 3 - sx, sp.y0, sp.W, sp.H); x.restore();
    x.drawImage(sp.ov, 0, 0); };
  el.draw(0); return el;
}

window.makeCan = makeCan;
