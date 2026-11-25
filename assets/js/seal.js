// Hero: the horse seal drawn as particles. They fly in and assemble on load,
// breathe gently, push away from the cursor, and scatter as you scroll past.
(() => {
  const canvas = document.getElementById('seal');
  const hero = document.getElementById('hero');
  if (!canvas || !hero || !window.THREE) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: false, powerPreference: 'low-power'}); }
  catch (e) { return; } // no WebGL: the page works without it

  // Seeded random so the cloud looks the same on every visit
  let seed = 65;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const img = new Image();
  img.src = 'assets/img/seal.webp';
  img.onload = build;

  function build(){
    // Sample the dark pixels of the seal
    const W = 260, ratio = img.height / img.width, H = Math.round(W * ratio);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', {willReadFrequently: true});
    g.drawImage(img, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    let pts = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (px[i + 3] > 140 && (px[i] + px[i + 1] + px[i + 2]) / 3 < 150) pts.push([x, y]);
    }
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const small = innerWidth < 1024;
    pts = pts.slice(0, small ? 5000 : 9000);

    const n = pts.length;
    const target = new Float32Array(n * 3), rand = new Float32Array(n * 3), pos = new Float32Array(n * 3);
    pts.forEach(([x, y], k) => {
      target[k * 3] = (x + rnd() - .5) / W - .5;
      target[k * 3 + 1] = -((y + rnd() - .5) / H - .5) * ratio;
      rand[k * 3] = rnd() * 2 - 1; rand[k * 3 + 1] = rnd() * 2 - 1; rand[k * 3 + 2] = rnd() * 2 - 1;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));

    const u = {
      uTime: {value: 0}, uAssemble: {value: 0}, uScatter: {value: 0},
      uScale: {value: 400}, uCenter: {value: new THREE.Vector2()}, uView: {value: new THREE.Vector2()},
      uMouse: {value: new THREE.Vector2(1e5, 1e5)}, uPR: {value: 1}, uSize: {value: 2.2},
      uInk: {value: new THREE.Color(0x161514)}, uSeal: {value: new THREE.Color(0xd2281e)}
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false,
      vertexShader: `
        uniform float uTime, uAssemble, uScatter, uScale, uPR, uSize;
        uniform vec2 uCenter, uView, uMouse;
        attribute vec3 aTarget, aRand;
        varying float vA; varying float vRed;
        void main(){
          vec2 tgt = uCenter + aTarget.xy * uScale;
          vec2 start = aRand.xy * uView * .65;
          float delay = (aRand.z * .5 + .5) * .45;
          float t = clamp((uAssemble - delay) / .55, 0., 1.);
          t = 1. - pow(1. - t, 3.);
          vec2 p = mix(start, tgt, t);
          float ph = aRand.x * 6.2831;
          p.x += sin(uTime * .7 + ph + aTarget.y * 6.) * 1.4;
          p.y += cos(uTime * .6 + ph * 1.3 + aTarget.x * 5.) * 1.4;
          vec2 d = p - uMouse; float dist = length(d);
          float f = 1. - smoothstep(0., uScale * .3, dist);
          p += normalize(d + 1e-4) * f * f * uScale * .14;
          float s = uScatter * uScatter;
          p += vec2(aRand.x * .9, aRand.y * .5 + .9) * uView * .55 * s;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0., 1.);
          gl_PointSize = uSize * uPR * (.7 + .6 * (aRand.z * .5 + .5));
          vRed = step(.93, aRand.y * .5 + .5);
          vA = (1. - uScatter) * mix(.18, .55 + .35 * (aRand.x * .5 + .5), t);
        }`,
      fragmentShader: `
        uniform vec3 uInk, uSeal;
        varying float vA; varying float vRed;
        void main(){
          vec2 c = gl_PointCoord - .5;
          if (dot(c, c) > .25) discard;
          gl_FragColor = vec4(mix(uInk, uSeal, vRed), vA);
        }`
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Points(geo, mat));
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

    let w = 0, h = 0;
    function size(){
      w = hero.clientWidth; h = hero.clientHeight;
      const pr = Math.min(devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.updateProjectionMatrix();
      u.uPR.value = pr; u.uView.value.set(w, h);
      if (w < 1024) { u.uScale.value = Math.min(w * .5, h * .2); u.uCenter.value.set(w * .18, -h * .37); }
      else { u.uScale.value = Math.min(w * .34, h * .66); u.uCenter.value.set(w * .24, -h * .02); }
    }
    size();
    addEventListener('resize', size);

    // Cursor, smoothed so the particles move with weight
    const mouse = new THREE.Vector2(1e5, 1e5), smooth = new THREE.Vector2(1e5, 1e5);
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      mouse.set(e.clientX - r.left - w / 2, h / 2 - (e.clientY - r.top));
      if (smooth.x > 1e4) smooth.copy(mouse);
    });
    hero.addEventListener('pointerleave', () => mouse.set(1e5, 1e5));

    // Only draw while the hero is on screen and the tab is visible
    let visible = true, last = performance.now(), born = last;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, {threshold: 0}).observe(hero);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

    let raf = 0;
    function loop(){
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
    function frame(now){
      if (!visible || document.hidden) return;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      u.uTime.value += dt;
      u.uAssemble.value = Math.min((now - born) / 2600, 1);
      u.uScatter.value = Math.min(Math.max(scrollY / (h * .85), 0), 1);
      const k = 1 - Math.exp(-8 * dt);
      if (mouse.x > 1e4) smooth.set(1e5, 1e5); else smooth.lerp(mouse, k);
      u.uMouse.value.copy(smooth);
      renderer.render(scene, cam);
      raf = requestAnimationFrame(frame);
    }
    loop();
  }
})();
