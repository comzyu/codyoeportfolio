/* Poto typewriter illustration — original, minimal, front view. Pure function: returns an SVG string.
   Used by prototypes/08-typewriter.html and by assets-src/typewriter/export.js (-> assets/typewriter/typewriter.svg).
   Animatable layers (group ids): paper, carriage, typebars, keys, bell.  Not modelled on any real machine or brand. */
(function (root) {
  const INK = '#1B1B1B', ACCENT = '#C2412D', PAPER = '#FFFDF8', SHELL = '#EFE9DD', DARK = '#2A2522';
  const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const PRINT = { x: 180, y: 84 };                                   // where every typebar lands
  function build() {
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 250" role="img" aria-label="A typewriter">';
    // carriage: everything that slides sideways as you type (paper rides on it)
    s += '<g id="carriage">';
    s += '<g id="paper"><rect x="112" y="-40" width="136" height="118" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      [8, 20, 32].map((y, i) => '<line x1="124" y1="' + y + '" x2="' + (i === 2 ? 190 : 236) + '" y2="' + y + '" stroke="' + INK + '" stroke-width="1.2" stroke-dasharray="1 3.2" opacity=".45"/>').join('') + '</g>';
    s += '<rect x="44" y="56" width="272" height="20" rx="10" fill="' + DARK + '"/>';                                            // platen
    s += '<circle cx="36" cy="66" r="11" fill="' + SHELL + '" stroke="' + INK + '" stroke-width="2.5"/><circle cx="324" cy="66" r="11" fill="' + SHELL + '" stroke="' + INK + '" stroke-width="2.5"/>';
    s += '<path d="M52 56 L30 30" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" fill="none"/><circle cx="28" cy="28" r="5" fill="' + ACCENT + '"/>'; // return lever
    s += '<path d="M70 82 H290" stroke="' + INK + '" stroke-width="1.5"/>' + Array.from({ length: 23 }, (_, i) => '<line x1="' + (70 + i * 10) + '" y1="82" x2="' + (70 + i * 10) + '" y2="' + (i % 5 === 0 ? 88 : 85) + '" stroke="' + INK + '" stroke-width="1"/>').join('');
    s += '</g>';
    // body
    s += '<path d="M40 100 Q40 92 48 92 H312 Q320 92 320 100 L346 226 Q348 240 334 240 H26 Q12 240 14 226 Z" fill="' + SHELL + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
    s += '<path d="M104 136 A76 34 0 0 1 256 136 Z" fill="' + DARK + '" opacity=".12"/><path d="M104 136 A76 34 0 0 1 256 136" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    s += '<path d="M176 92 L180 86 L184 92" fill="none" stroke="' + ACCENT + '" stroke-width="2" stroke-linejoin="round"/>';       // print-point guide
    // typebars: a fan resting in the basket; each swings to the print point
    s += '<g id="typebars" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round">';
    const N = 26;
    for (let i = 0; i < N; i++) {
      const a = Math.PI + (i + 0.5) * (Math.PI / N), bx = 180 + Math.cos(a) * 70, by = 136 + Math.sin(a) * 30;
      const tx = 180 + Math.cos(a) * 44, ty = 136 + Math.sin(a) * 12;
      s += '<line id="bar-' + i + '" x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y2="' + ty.toFixed(1) + '" data-rx="' + tx.toFixed(1) + '" data-ry="' + ty.toFixed(1) + '"/>';
    }
    s += '</g>';
    // bell
    s += '<g id="bell"><path d="M52 122 A12 12 0 0 1 76 122 Z" fill="' + SHELL + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/><circle cx="64" cy="124" r="2.2" fill="' + INK + '"/></g>';
    // keys
    s += '<g id="keys" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="8" text-anchor="middle">';
    ROWS.forEach((row, r) => {
      const y = 160 + r * 23, x0 = 180 - ((row.length - 1) * 25) / 2 + (r === 1 ? 4 : r === 2 ? -6 : 0);
      row.split('').forEach((ch, i) => {
        const x = x0 + i * 25;
        s += '<g id="key-' + ch + '" class="key"><circle cx="' + x + '" cy="' + y + '" r="9.5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/><text x="' + x + '" y="' + (y + 3) + '" fill="' + INK + '">' + ch + '</text></g>';
      });
    });
    s += '<g id="key-return" class="key"><circle cx="302" cy="206" r="9.5" fill="' + ACCENT + '" stroke="' + INK + '" stroke-width="2"/><path d="M306 202 v5 h-8 m3 -3 l-3 3 l3 3" fill="none" stroke="' + PAPER + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>';
    s += '<g id="key-back" class="key"><circle cx="58" cy="206" r="9.5" fill="' + SHELL + '" stroke="' + INK + '" stroke-width="2"/><path d="M62 206 h-8 m3 -3 l-3 3 l3 3" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>';
    s += '<g id="key-space" class="key"><rect x="110" y="221" width="140" height="11" rx="5.5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="2"/></g>';
    s += '</g></svg>';
    return s;
  }
  const api = { build: build, PRINT: PRINT, ROWS: ROWS, BARS: 26 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PotoTypewriter = api;
})(typeof window !== 'undefined' ? window : globalThis);
