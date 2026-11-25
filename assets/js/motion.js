// Scroll motion: word reveals, staggered rails, count-ups, text fill, parallax drift.
// Everything starts visible in the HTML; GSAP only animates from hidden, so no JS means no blank page.
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reading progress line under the header
  gsap.to('.progress', {scaleX: 1, ease: 'none', scrollTrigger: {start: 0, end: 'max', scrub: .3}});
  if (RM) return;

  const EASE = 'expo.out';
  const esc = t => t.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // Wrap each word in a mask so it can rise into view
  const split = el => {
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w" aria-hidden="true"><span class="wi">${esc(w)}</span></span>`).join(' ');
    return el.querySelectorAll('.wi');
  };
  // Enter plays, leaving reverses (both directions), so scrolling always moves something
  const st = (trigger, extra = {}) => ({trigger, start: 'top 72%', end: 'bottom 28%', toggleActions: 'play reverse play reverse', ...extra});

  // Hero intro
  const heroWords = split(document.querySelector('#hero .statement'));
  gsap.timeline({defaults: {ease: EASE}, onComplete: heroOut})
    .from('.top > *', {y: -24, opacity: 0, duration: 1, stagger: .08})
    .from(heroWords, {yPercent: 115, rotate: 4, duration: 1.4, stagger: .08}, .1)
    .from('#hero .lead', {y: 40, opacity: 0, duration: 1.2}, .45)
    .from('#hero .intro', {y: 30, opacity: 0, duration: 1.2}, .6);

  // Hero drifts up and fades as you leave it (set up after the intro so the two never fight)
  function heroOut(){
  gsap.to('#hero .statement', {yPercent: -40, opacity: 0, ease: 'none', scrollTrigger: {trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true}});
  gsap.to('#hero .lead, #hero .intro', {y: -80, opacity: 0, ease: 'none', scrollTrigger: {trigger: '#hero', start: '20% top', end: '90% top', scrub: true}});
  }

  // Rail items slide in from the right, their pictures settle from a slight zoom
  const railIn = (items, trigger) => {
    items = [...items];
    const inner = items.map(i => i.querySelector('img, video, .ig-frame')).filter(Boolean);
    const opts = trigger ? {scrollTrigger: st(trigger)} : {};
    gsap.from(items, {x: 140, opacity: 0, duration: 1.3, stagger: .09, ease: EASE, ...opts});
    if (inner.length) gsap.from(inner, {scale: 1.18, duration: 1.6, stagger: .09, ease: EASE, ...(trigger ? {scrollTrigger: st(trigger)} : {})});
  };
  window.railIn = items => railIn(items);

  // Numbers count up from zero
  const countUp = el => {
    const m = el.textContent.match(/^([\d.]+)(.*)$/);
    if (!m) return;
    const end = parseFloat(m[1]), suffix = m[2], o = {v: 0};
    gsap.to(o, {v: end, duration: 1.6, ease: 'power3.out', scrollTrigger: st(el, {start: 'top 85%'}),
      onUpdate: () => { el.textContent = Math.round(o.v) + suffix; }});
  };

  document.querySelectorAll('.project').forEach(sec => {
    const h = sec.querySelector('.meta h2, .list h2');
    if (h) gsap.from(split(h), {yPercent: 115, duration: 1.1, stagger: .06, ease: EASE, scrollTrigger: st(sec)});
    const bits = sec.querySelectorAll('.meta > p, .meta .stat li, .facts > div, .list .item');
    gsap.from(bits, {y: 28, opacity: 0, duration: 1, stagger: .06, ease: EASE, delay: .15, scrollTrigger: st(sec)});
    sec.querySelectorAll('.stat b').forEach(countUp);
    const rail = sec.querySelector('.rail');
    if (rail) railIn(rail.children, sec);
    gsap.from(sec.querySelector('.rail-nav'), {opacity: 0, y: 16, duration: .8, delay: .5, ease: EASE, scrollTrigger: st(sec)});
    // The work drifts sideways as the page scrolls past it
    const media = sec.querySelector('.media');
    if (media) gsap.fromTo(media, {x: 60}, {x: -40, ease: 'none', scrollTrigger: {trigger: sec, start: 'top bottom', end: 'bottom top', scrub: .6}});
  });

  // About: the bio fills in word by word as you read down
  const about = document.getElementById('about');
  const bioWords = [...about.querySelectorAll('.bio p')].flatMap(p => [...split(p)]);
  gsap.fromTo(bioWords, {opacity: .12}, {opacity: 1, ease: 'none', stagger: .04,
    scrollTrigger: {trigger: '.bio', start: 'top 82%', end: 'bottom 48%', scrub: .5}});
  gsap.from('.portrait img', {scale: .6, rotate: -12, opacity: 0, duration: 1.4, ease: EASE, scrollTrigger: st('.portrait', {start: 'top 85%'})});
  about.querySelectorAll('.lists').forEach(l => {
    gsap.from(l.querySelector('h3'), {y: 20, opacity: 0, duration: .9, ease: EASE, scrollTrigger: st(l, {start: 'top 85%', end: 'bottom 10%'})});
    gsap.from(l.querySelectorAll('li'), {y: 28, opacity: 0, duration: 1, stagger: .06, ease: EASE, scrollTrigger: st(l, {start: 'top 85%', end: 'bottom 10%'})});
    l.querySelectorAll('.big').forEach(countUp);
  });

  // Viewer content rises in
  window.viewerIn = el => gsap.from(el.firstElementChild, {y: 30, scale: .96, opacity: 0, duration: .7, ease: EASE});

  // Layout settles once fonts and images are in
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
