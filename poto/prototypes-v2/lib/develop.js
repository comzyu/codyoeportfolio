/* Poto v2 — every photo develops in instead of popping in.
   While an image loads it shows as blank emulsion (a soft shimmer, like paper waiting in the tray). When it arrives it develops:
   it starts pale and colourless and comes up to full colour over ~1.4 s. Works for any <img> on the page, including ones added
   later or whose src changes. Images that are already cached show at once, with no animation (nothing to wait for). */
(function () {
  const mark = (img) => {
    if (img.dataset.dev === img.currentSrc + img.src) return; img.dataset.dev = img.currentSrc + img.src;
    if (img.complete && img.naturalWidth) return;
    img.classList.remove('developed'); img.classList.add('waiting');
    const done = () => { img.classList.remove('waiting'); if (!img.naturalWidth) return; img.classList.add('developed'); setTimeout(() => img.classList.remove('developed'), 1700); };
    img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true });
  };
  const scan = (n) => { if (n.tagName === 'IMG') mark(n); else if (n.querySelectorAll) n.querySelectorAll('img').forEach(mark); };
  new MutationObserver((ms) => ms.forEach((m) => { if (m.type === 'attributes') mark(m.target); else m.addedNodes.forEach(scan); }))
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  scan(document);
})();
