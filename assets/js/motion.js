// Lightweight scroll motion: CSS transitions, triggered once by IntersectionObserver.
// Content fades up the first time it enters view and then stays put. No scroll-linked work.
(() => {
  window.__motion = 1;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tag what should reveal. --i staggers siblings (capped so late items don't wait).
  const groups = [
    '.meta > *', '.list > *', '.rail-nav', '.bio > p', '.portrait',
    '.lists h3', '.lists li'
  ];
  groups.forEach(sel => {
    const byParent = new Map();
    document.querySelectorAll(sel).forEach(el => {
      const k = el.parentElement, n = byParent.get(k) || 0;
      byParent.set(k, n + 1);
      el.classList.add('rv');
      el.style.setProperty('--i', Math.min(n, 5));
    });
  });
  // Rail items: stagger the first few; items further along the row just appear
  document.querySelectorAll('.rail').forEach(r => [...r.children].forEach((el, n) => {
    el.classList.add('rv');
    el.style.setProperty('--i', n < 4 ? n + 1 : 0);
  }));

  // Count numbers up once, the first time they are seen
  const countUp = el => {
    const m = el.textContent.match(/^([\d.]+)(.*)$/);
    if (!m || RM) return;
    const end = parseFloat(m[1]), suffix = m[2], t0 = performance.now(), dur = 1400;
    const tick = now => {
      const t = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(end * e) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.matches('.stat b, .big')) countUp(e.target);
    io.unobserve(e.target);
  }), {rootMargin: '0px 0px -8% 0px', threshold: .08});
  document.querySelectorAll('.rv, .stat b, .big, .foot').forEach(el => io.observe(el));

  // New design sets ease in when the list switches them
  window.railIn = items => [...items].forEach((el, n) => {
    el.classList.add('fresh');
    el.style.animationDelay = `${Math.min(n, 4) * 60}ms`;
  });

  // Reading progress line: one transform per frame at most
  const bar = document.querySelector('.progress');
  let queued = false;
  const paint = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, {passive: true});
  paint();
})();
