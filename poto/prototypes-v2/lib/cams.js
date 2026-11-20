/* Poto cameras (Cody, 20 Nov): the cameras you own, how you've made them yours, and how to draw one.
   Used by the desk (a camera you decorated can sit on it). The Cameras tab (rolls.html) draws the same way. */
(function () {
  const CAMS = [
    { id: 'Sunday', kind: 'compact', body: '#E8B44C', lenses: ['35mm', '28mm'], frame: 'Date stamp' },
    { id: 'Harbour', kind: 'range', body: '#3E7C80', lenses: ['50mm', '35mm'], frame: 'White border' },
    { id: 'Flashbulb', kind: 'instant', body: '#EDEDEF', lenses: ['Instant'], frame: 'Instant' },
    { id: 'Silver', kind: 'slr', body: '#232325', lenses: ['50mm', '85mm', 'Fisheye'], frame: 'Film edge' },
    { id: 'Lido', kind: 'toy', body: '#7FB7D9', lenses: ['28mm', 'Fisheye'], frame: 'White border' },
  ];
  const LEATHER = { Smooth: 'none', Grain: 'radial-gradient(rgba(0,0,0,.35) 0.6px, transparent 0.8px) 0 0 / 3px 3px', Woven: 'repeating-linear-gradient(45deg, rgba(0,0,0,.25) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,.25) 0 1px, transparent 1px 4px)', Ribbed: 'repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px)' };
  const STRAP = { None: '', Black: '#1b1b1c', Tan: '#B07A4A', Red: '#B8442F' };
  const STICK = { None: '', Star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#FFD84D" stroke="#fff" stroke-width="1.6"/></svg>', Heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z" fill="#FF6B8B" stroke="#fff" stroke-width="1.6"/></svg>', Dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#5B8CFF" stroke="#fff" stroke-width="1.6"/></svg>' };
  const css = `.pcam { position: relative; width: 100%; aspect-ratio: 1.55; --body: #E8B44C; --plate: #D9D9DE; }
  .pcam i { position: absolute; display: block; }
  .pcam .bd { left: 0; right: 0; bottom: 0; top: 18%; border-radius: 10px; background: var(--body); box-shadow: inset 0 1px 0 rgba(255,255,255,.35), inset 0 -3px 6px rgba(0,0,0,.18), 0 10px 14px -8px rgba(0,0,0,.35); overflow: hidden; }
  .pcam .bd::before { content: ""; position: absolute; left: 0; right: 0; top: 22%; bottom: 14%; background: var(--leather, none); opacity: .55; }
  .pcam .tp { left: 6%; right: 6%; top: 8%; height: 18%; border-radius: 5px 5px 0 0; background: linear-gradient(180deg, #F4F4F6, var(--plate) 60%, #B8B8BE); box-shadow: inset 0 1px 0 #fff; }
  .pcam .sh { right: 14%; top: 0; width: 12%; height: 12%; border-radius: 3px 3px 0 0; background: linear-gradient(#cfcfd4, #9c9ca3); }
  .pcam .ln { left: 50%; top: 56%; width: 46%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle at 38% 34%, #6f7c94 0 6%, #1d2230 18%, #0b0d12 46%, #2a2d34 47%, #15171c 60%, #4a4d55 61%, #222429 72%, #9c9ea6 73%, #3a3c42 80%); box-shadow: 0 2px 4px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.15); }
  .pcam .vw { left: 10%; top: 26%; width: 16%; height: 12%; border-radius: 3px; background: linear-gradient(135deg, #8fa0b8, #222833 60%); box-shadow: inset 0 0 0 1.5px #c9c9cf; }
  .pcam .fl { right: 9%; top: 26%; width: 20%; height: 13%; border-radius: 3px; background: repeating-linear-gradient(90deg, #f6f6f6 0 2px, #dcdce0 2px 4px); box-shadow: inset 0 0 0 1.5px #c9c9cf; }
  .pcam.slr .pr { left: 34%; right: 34%; top: -6%; height: 26%; clip-path: polygon(18% 0, 82% 0, 100% 100%, 0 100%); background: linear-gradient(180deg, #ededf0, var(--plate)); }
  .pcam.instant { aspect-ratio: 1.15; } .pcam.instant .ln { width: 52%; top: 52%; } .pcam.instant .tp { display: none; } .pcam.instant .bd { top: 6%; border-radius: 14px; }
  .pcam.toy .bd { border-radius: 16px; } .pcam.toy .tp { left: 18%; right: 18%; border-radius: 8px 8px 0 0; }
  .pcam .strap { top: 24%; width: 5%; height: 34%; background: var(--strap); border-radius: 2px; } .pcam .strap.l { left: -3%; } .pcam .strap.r { right: -3%; }
  .pcam .stk { z-index: 2; right: 10%; bottom: 12%; width: 16%; aspect-ratio: 1; } .pcam .stk svg { width: 100%; height: 100%; display: block; }`;
  const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  const owned = () => { try { return JSON.parse(localStorage.getItem('poto.cams') || 'null') || { Sunday: {}, Harbour: {} }; } catch (e) { return { Sunday: {}, Harbour: {} }; } };
  const cfg = (C) => Object.assign({ body: C.body, leather: 'Smooth', strap: 'None', sticker: 'None' }, owned()[C.id] || {});
  function draw(id) {
    const C = CAMS.find((c) => c.id === id) || CAMS[0], o = cfg(C), el = document.createElement('div');
    el.className = 'pcam ' + C.kind; el.style.setProperty('--body', o.body); el.style.setProperty('--leather', LEATHER[o.leather] || 'none');
    el.innerHTML = (STRAP[o.strap] ? '<i class="strap l" style="--strap:' + STRAP[o.strap] + '"></i><i class="strap r" style="--strap:' + STRAP[o.strap] + '"></i>' : '') + '<i class="tp"></i><i class="sh"></i>' + (C.kind === 'slr' ? '<i class="pr"></i>' : '') + '<i class="bd"></i><i class="vw"></i>' + (C.kind !== 'slr' ? '<i class="fl"></i>' : '') + '<i class="ln"></i>' + (STICK[o.sticker] ? '<i class="stk">' + STICK[o.sticker] + '</i>' : '');
    return el;
  }
  window.PotoCams = { CAMS, owned, draw };
})();
