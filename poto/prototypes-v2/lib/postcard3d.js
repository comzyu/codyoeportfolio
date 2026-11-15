/* Poto v2 — the postcard as a physical object (three.js r160).
   A card with real thickness in a white room: paper grain, coated photo side, uncoated written side,
   soft wall shadow, and stickers that peel, lift and press back down. */
(function () {
  const T = THREE, V2 = T.Vector2, V3 = T.Vector3, Q = T.Quaternion;
  const CW = 1.0, CH = 1.414, CT = 0.016;                    // card: width, height, thickness (exaggerated ~3x so it reads on a phone)
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- sticker shader pieces: a cylinder curl about a fold line + holographic foil ---------- */
  const PEEL_PARS = `
    uniform vec2 uFoldP; uniform vec2 uFoldD; uniform float uFoldR; uniform float uPeel;
    vec3 peelPos(vec3 p, out vec3 n) {
      n = vec3(0.0, 0.0, 1.0);
      float d = dot(p.xy - uFoldP, uFoldD);
      if (uPeel < 0.5 || d <= 0.0) return p;
      float th = d / uFoldR; vec2 base = p.xy - uFoldD * d;
      if (th < 3.14159265) { n = vec3(-uFoldD * sin(th), cos(th)); return vec3(base + uFoldD * (uFoldR * sin(th)), p.z + uFoldR * (1.0 - cos(th))); }
      n = vec3(0.0, 0.0, -1.0); return vec3(base - uFoldD * (d - 3.14159265 * uFoldR), p.z + 2.0 * uFoldR);
    }`;
  function patchPeel(shader, u) {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + PEEL_PARS)
      .replace('void main() {', 'void main() {\n vec3 peelN; vec3 peelP = peelPos(position, peelN);')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = peelN;')
      .replace('#include <begin_vertex>', 'vec3 transformed = peelP;');
  }
  const FOIL_FRAG = `
    {
      vec3 vdir = normalize(vViewPosition);
      float facing = clamp(dot(vdir, normal), 0.0, 1.0);
      float fm = texture2D(uFoilMap, vMapUv).r * uFoil * (gl_FrontFacing ? 1.0 : 0.0);
      // diffraction: hue runs with view angle and with a fine diagonal grating across the sticker
      float ph = (normal.x * 1.6 + normal.y * 1.2) + vdir.x * 1.5 + vdir.y * 1.1 + (vMapUv.x * 0.9 + vMapUv.y * 0.55) + sin(vMapUv.x * 46.0 + vMapUv.y * 31.0) * 0.03;
      vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (ph + vec3(0.0, 0.33, 0.67)));
      float sparkle = pow(fract(sin(dot(floor(vMapUv * 190.0), vec2(12.9898, 78.233))) * 43758.5453), 22.0) * smoothstep(0.2, 0.0, abs(fract(ph * 1.7) - 0.5) - 0.2);
      float band = smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(ph * 6.28318 * 1.3));          // the colour comes and goes in bands as it turns, the rest stays silver
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.80, 0.82, 0.86), mix(vec3(0.86), rainbow, 0.7), 0.25 + 0.6 * band) * (0.6 + 0.4 * facing) + sparkle * 1.2, fm);
      metalnessFactor = mix(metalnessFactor, 0.5, fm); roughnessFactor = mix(roughnessFactor, 0.34, fm);
      if (!gl_FrontFacing) { diffuseColor.rgb = vec3(0.90, 0.895, 0.88); roughnessFactor = 0.85; metalnessFactor = 0.0; }   // the underside: plain backing with a satin of adhesive
    }`;

  function Postcard(el, opts) {
    const self = this; opts = opts || {};
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(opts.lite ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.VSMShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.background = new T.Color(opts.background || '#FAFAF8');
    const camera = new T.PerspectiveCamera(28, 1, 0.1, 30); camera.position.set(0, 0, 4.4);

    /* reflections: a small procedural studio, baked once. Two soft boxes and a window strip give the gloss something to catch. */
    (function env() {
      const s = new T.Scene(), box = new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x8e8e90, side: T.BackSide })); s.add(box);
      const panel = (w, h, x, y, z, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
      panel(5, 2.2, -2.5, 4.2, 2.5, 0xffffff); panel(1.4, 5, 4.6, 1, 2.5, 0xfff6ea); panel(6, 1, 0, -1.5, 4.8, 0xdfe6f0); panel(3, 3, -4.6, -1, -1, 0xbfc4cc);
      const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(s, 0.035).texture; pm.dispose();
    })();
    scene.add(new T.HemisphereLight(0xffffff, 0xf0eee9, 1.25));
    const key = new T.DirectionalLight(0xfffdf8, 2.1); key.position.set(-1.1, 1.7, 4.2); key.castShadow = true;
    key.shadow.mapSize.set(opts.lite ? 1024 : 2048, opts.lite ? 1024 : 2048); key.shadow.radius = opts.lite ? 10 : 22; key.shadow.blurSamples = opts.lite ? 8 : 25; key.shadow.bias = -0.0006;
    Object.assign(key.shadow.camera, { left: -1.7, right: 1.7, top: 1.9, bottom: -1.9, near: 0.5, far: 9 }); key.shadow.camera.updateProjectionMatrix(); scene.add(key);
    const wall = new T.Mesh(new T.PlaneGeometry(14, 14), new T.ShadowMaterial({ opacity: 0.13, color: 0x20222a })); wall.position.z = -0.24; wall.receiveShadow = true; scene.add(wall);

    /* ---------- the card ---------- */
    const card = new T.Group(); scene.add(card);
    const geo = new T.BoxGeometry(CW, CH, CT, 36, 48, 1), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {                       // no real card is dead flat: a slight bow, so highlights travel across it
      const x = pos.getX(i) / (CW / 2), y = pos.getY(i) / (CH / 2); pos.setZ(i, pos.getZ(i) + 0.012 * (1 - x * x) * 0.6 - 0.006 * y * y + 0.004 * x * y);
    }
    geo.computeVertexNormals();
    const tex = (c, srgb) => { const t = new T.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (srgb) t.colorSpace = T.SRGBColorSpace; return t; };
    const edge = new T.MeshStandardMaterial({ color: 0xf1ede4, roughness: 1 });
    const mats = { front: new T.MeshPhysicalMaterial({ roughness: 1, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.28, normalScale: new V2(0.35, 0.35), envMapIntensity: 0.9 }),
                   back: new T.MeshPhysicalMaterial({ roughness: 1, metalness: 0, normalScale: new V2(0.7, 0.7), envMapIntensity: 0.5 }) };
    const body = new T.Mesh(geo, [edge, edge, edge, edge, mats.front, mats.back]); body.castShadow = true; body.receiveShadow = true; card.add(body);
    this.setFaces = function (front, back) {
      for (const [m, t] of [[mats.front, front], [mats.back, back]]) {
        m.map = tex(t.col, true); m.roughnessMap = tex(t.rough); m.normalMap = tex(PotoPaper.normalFromHeight(t.hgt, m === mats.back ? 3.2 : 1.6)); m.needsUpdate = true;
      }
    };

    /* ---------- stickers ---------- */
    const stickers = []; const SS = 0.34;
    function addSticker(kind, finish, x, y, rot, side) {
      const art = PotoPaper.sticker(kind), u = { uFoldP: { value: new V2(9, 9) }, uFoldD: { value: new V2(1, 0) }, uFoldR: { value: 0.035 }, uPeel: { value: 0 }, uFoilMap: { value: tex(art.foil) }, uFoil: { value: finish === 'holo' ? 1 : 0 } };
      const mat = new T.MeshPhysicalMaterial({ map: tex(art.col, true), alphaTest: 0.5, side: T.DoubleSide, roughness: finish === 'matte' ? 0.9 : 0.34, metalness: 0,
        clearcoat: finish === 'matte' ? 0 : finish === 'holo' ? 0.45 : 0.9, clearcoatRoughness: finish === 'holo' ? 0.25 : 0.12, normalMap: tex(PotoPaper.normalFromHeight(art.hgt, 5)), normalScale: new V2(1, 1), envMapIntensity: 0.95 });
      mat.onBeforeCompile = (sh) => { patchPeel(sh, u);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uFoilMap; uniform float uFoil;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FOIL_FRAG); };
      const g = new T.PlaneGeometry(SS, SS, 44, 44), mesh = new T.Mesh(g, mat);
      const dm = new T.MeshDistanceMaterial({ map: mat.map, alphaTest: 0.5 }), dd = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: mat.map, alphaTest: 0.5 });
      dm.onBeforeCompile = dd.onBeforeCompile = (sh) => patchPeel(sh, u); mesh.customDepthMaterial = dd; mesh.customDistanceMaterial = dm; mesh.castShadow = true;
      // contact shadow: a soft dark copy just under the sticker. It's what makes it read as a second layer of material.
      const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx = sc.getContext('2d'); sx.filter = 'blur(7px)'; sx.drawImage(art.col, 14, 18, 228, 228); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, 256, 256);
      const shadow = new T.Mesh(new T.PlaneGeometry(SS * 1.12, SS * 1.12), new T.MeshBasicMaterial({ map: tex(sc), transparent: true, opacity: 0.3, depthWrite: false }));
      const holder = new T.Group(); holder.add(shadow); holder.add(mesh); shadow.position.z = 0.0006; mesh.position.z = 0.0016;
      const s = { holder, mesh, shadow, u, side, kind, finish, lift: 0, state: 'stuck', rot };
      place(s, x, y, rot, side); card.add(holder); stickers.push(s); return s;
    }
    function place(s, x, y, rot, side) {
      const sgn = side === 'front' ? 1 : -1; s.side = side; s.x = x; s.y = y; s.rot = rot;
      s.holder.position.set(x, y, sgn * (CT / 2 + 0.008 * (1 - (x / (CW / 2)) ** 2) * 0.6)); s.holder.rotation.set(0, side === 'front' ? 0 : Math.PI, 0); s.holder.rotateZ(rot);
    }
    this.addSticker = addSticker; this.stickers = stickers;

    /* ---------- motion: drag to turn (with momentum), tap to flip, rests facing you ---------- */
    const q = new Q(), vel = new V3(), restTilt = new Q().setFromEuler(new T.Euler(-0.06, 0.16, -0.012));
    let face = 0, idle = 0, flip = null, dragging = false, settle = true;
    const faceQ = (f) => new Q().setFromAxisAngle(new V3(0, 1, 0), f * Math.PI).multiply(restTilt);
    q.copy(faceQ(0));
    this.flip = function () { face = 1 - face; const from = q.clone(), to = faceQ(face); flip = { from, to, t: 0 }; vel.set(0, 0, 0); if (self.onFlip) self.onFlip(face); };
    this.setSettle = (v) => { settle = v; };
    this.face = () => face;

    const ray = new T.Raycaster(), ndc = new V2(), tmp = new V3();
    const toNdc = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
    function hitSticker(e) { toNdc(e); const hits = ray.intersectObjects(stickers.filter((s) => s.state !== 'held').map((s) => s.mesh), false); if (!hits.length) return null;
      const s = stickers.find((k) => k.mesh === hits[0].object);
      // only a sticker on the side facing you can be touched (never through the card)
      if (new V3(0, 0, 1).applyQuaternion(s.holder.getWorldQuaternion(new Q())).z < 0.15) return null; const uv = hits[0].uv; return uv && sampleAlpha(s, uv) ? { s, p: new V2((uv.x - 0.5) * SS, (uv.y - 0.5) * SS) } : null; }
    const alphaCache = new Map();
    function sampleAlpha(s, uv) { let d = alphaCache.get(s); if (!d) { const c = s.mesh.material.map.image; d = c.getContext('2d').getImageData(0, 0, c.width, c.height); alphaCache.set(s, d); }
      return d.data[((Math.floor((1 - uv.y) * d.height) * d.width) + Math.floor(uv.x * d.width)) * 4 + 3] > 100; }
    // pointer -> point in the sticker's own flat plane
    function stickerLocal(s, e) { toNdc(e); const n = new V3(0, 0, 1).applyQuaternion(s.holder.getWorldQuaternion(new Q())), o = s.holder.getWorldPosition(new V3());
      const pl = new T.Plane().setFromNormalAndCoplanarPoint(n, o), pt = ray.ray.intersectPlane(pl, tmp); if (!pt) return null; const l = s.holder.worldToLocal(pt.clone()); return new V2(l.x, l.y); }
    function cardLocal(e) { toNdc(e); const hit = ray.intersectObject(body, false)[0]; if (!hit) return null; const l = card.worldToLocal(hit.point.clone()); return { x: l.x, y: l.y, side: l.z > 0 ? 'front' : 'back' }; }

    let ptr = null;
    const dom = renderer.domElement; dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId); const hs = flip ? null : hitSticker(e);
      ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false, st: hs };
      dragging = !hs; idle = 0; if (hs && self.onGrab) self.onGrab();
    });
    dom.addEventListener('pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
      if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 5) ptr.moved = true;
      if (ptr.st) return dragSticker(ptr.st, e);
      const k = 0.0075; vel.set(dy * k, dx * k, 0); flip = null;
      q.premultiply(new Q().setFromEuler(new T.Euler(dy * k, dx * k, 0)));
    });
    const up = (e) => {
      if (!ptr || e.pointerId !== ptr.id) return; const p = ptr; ptr = null; dragging = false; idle = 0;
      if (p.st) return releaseSticker(p.st, e);
      if (!p.moved && performance.now() - p.t < 350) self.flip();
    };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);

    /* ---------- peel / lift / press ---------- */
    function dragSticker(h, e) {
      const s = h.s;
      if (s.state === 'held') { const c = cardLocal(e); if (c) { s.hover = c; } s.px = e.clientX; s.py = e.clientY; return; }
      const c = stickerLocal(s, e); if (!c) return;
      if (!h.g) {                                                // peeling always starts from the edge you're pulling away from
        const d = c.clone().sub(h.p); if (d.length() < 0.012) return; d.normalize();
        let g = h.p.clone(); for (let i = 0; i < 60; i++) { const n = g.clone().addScaledVector(d, -0.008); if (Math.abs(n.x) > SS / 2 || Math.abs(n.y) > SS / 2 || !sampleAlpha(s, new V2(n.x / SS + 0.5, n.y / SS + 0.5))) break; g = n; }
        h.g = g.addScaledVector(d, -0.03); s.state = 'peeling'; s.u.uPeel.value = 1; if (self.onPeelStart) self.onPeelStart();
      }
      const D = h.g.clone().sub(c); const len = D.length(); if (len < 1e-4) return; D.divideScalar(len);
      const m = h.g.clone().add(c).multiplyScalar(0.5); s.u.uFoldP.value.copy(m); s.u.uFoldD.value.copy(D); s.u.uFoldR.value = clamp(0.018 + len * 0.09, 0.02, 0.05);
      // how much of the sticker is past the fold line
      let mx = -1e9, mn = 1e9; for (const cx of [-1, 1]) for (const cy of [-1, 1]) { const v = (cx * SS / 2 - m.x) * D.x + (cy * SS / 2 - m.y) * D.y; mx = Math.max(mx, v); mn = Math.min(mn, v); }
      s.peeled = clamp(mx / (mx - mn), 0, 1); if (self.onPeel) self.onPeel(s.peeled);
      if (s.peeled > 0.9) { s.state = 'held'; s.lift = 0.02; s.hover = cardLocal(e) || { x: s.x, y: s.y, side: s.side }; anims.push({ s, k: 'unfurl', t: 0, d: 0.22 }); if (self.onLift) self.onLift(); }
    }
    function releaseSticker(h, e) {
      const s = h.s;
      if (s.state === 'peeling') { anims.push({ s, k: 'relay', t: 0, d: 0.2, p0: s.u.uFoldP.value.clone(), D: s.u.uFoldD.value.clone() }); s.state = 'stuck'; if (self.onPress) self.onPress(0.5); }
      else if (s.state === 'held') {
        const c = cardLocal(e);
        if (!c || Math.abs(c.x) > CW / 2 - 0.06 || Math.abs(c.y) > CH / 2 - 0.06) { s.state = 'gone'; anims.push({ s, k: 'drop', t: 0, d: 0.25 }); if (self.onRemove) self.onRemove(s); return; }
        place(s, c.x * (c.side === 'front' ? 1 : -1), c.y, (Math.random() - 0.5) * 0.3, c.side); s.state = 'stuck';
        // pressed on from one edge: the fold line sweeps across and the sticker lies down behind it
        const a = Math.random() * Math.PI * 2, D = new V2(Math.cos(a), Math.sin(a)); s.u.uPeel.value = 1; s.u.uFoldD.value.copy(D); s.u.uFoldR.value = 0.03;
        anims.push({ s, k: 'press', t: 0, d: 0.28, D }); if (self.onPress) self.onPress(1);
      }
    }
    const anims = [];
    function stepAnims(dt) {
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i], s = a.s; a.t += dt; const t = clamp(a.t / a.d, 0, 1), e = 1 - Math.pow(1 - t, 3);
        if (a.k === 'relay') { s.u.uFoldP.value.copy(a.p0).addScaledVector(a.D, e * SS * 1.1); if (t >= 1) s.u.uPeel.value = 0; }
        else if (a.k === 'unfurl') { s.u.uFoldR.value = lerp(0.05, 0.4, e); s.u.uFoldP.value.addScaledVector(s.u.uFoldD.value, dt * 2.2); s.lift = lerp(0.02, 0.11, e); if (t >= 1) s.u.uPeel.value = 0; }
        else if (a.k === 'press') { s.u.uFoldP.value.copy(a.D).multiplyScalar(lerp(-SS * 0.75, SS * 0.8, e)); s.lift = lerp(0.05, 0, Math.min(1, e * 1.6)); if (t >= 1) { s.u.uPeel.value = 0; s.lift = 0; } }
        else if (a.k === 'drop') { s.holder.scale.setScalar(1 - e); if (t >= 1) { card.remove(s.holder); stickers.splice(stickers.indexOf(s), 1); } }
        if (t >= 1) anims.splice(i, 1);
      }
      for (const s of stickers) {
        if (s.state === 'held' && s.hover) {                     // carried just above the card, leaning into the direction of travel
          const sgn = s.hover.side === 'front' ? 1 : -1, tx = s.hover.x, ty = s.hover.y; const p = s.holder.position;
          const vx = tx - p.x, vy = ty - p.y; p.x += vx * Math.min(1, dt * 16); p.y += vy * Math.min(1, dt * 16); p.z = sgn * (CT / 2 + s.lift);
          s.holder.rotation.set(clamp(-vy * 2.5, -0.5, 0.5) * sgn, (s.hover.side === 'front' ? 0 : Math.PI) + clamp(vx * 2.5, -0.5, 0.5), 0); s.holder.rotateZ(s.rot * (s.hover.side === 'front' ? 1 : -1) * (s.side === s.hover.side ? 1 : -1));
        }
        const up = s.state === 'held' ? 1 : s.state === 'peeling' ? (s.peeled || 0) : 0;
        s.shadow.material.opacity = lerp(s.shadow.material.opacity, 0.3 * (1 - up), Math.min(1, dt * 12));
        s.mesh.position.z = 0.0016;
      }
    }

    /* ---------- frame loop ---------- */
    let last = performance.now(), raf = 0, visible = true, slow = 0, lastT = performance.now();
    function frame(now) {
      raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!visible) return;
      // a slow phone gets a lighter render rather than a stuttering one
      if (!opts.lite && slow >= 0) { slow = now - lastT > 45 ? slow + 1 : Math.max(0, slow - 1); if (slow > 40) { slow = -1; renderer.setPixelRatio(1); key.shadow.blurSamples = 8; key.shadow.radius = 10; resize(); } } lastT = now;
      if (flip) {                                              // the flip: one firm turn that overshoots a touch and settles, like a card with weight
        flip.t += dt / (opts.flipSeconds || 0.62); const t = clamp(flip.t, 0, 1), e = 1 - Math.pow(2, -9 * t) * Math.cos(t * 7.2) * (1 - t * 0.2);
        q.slerpQuaternions(flip.from, flip.to, clamp(e, 0, 1.06)); if (t >= 1) { q.copy(flip.to); flip = null; if (self.onLand) self.onLand(); }
      } else if (!dragging) {
        if (vel.lengthSq() > 1e-7) { q.premultiply(new Q().setFromEuler(new T.Euler(vel.x, vel.y, 0))); vel.multiplyScalar(Math.pow(0.04, dt)); idle = 0; }
        else { idle += dt; if (settle && idle > 0.9) { const f = new V3(0, 0, 1).applyQuaternion(q).z >= 0 ? 0 : 1; if (f !== face) { face = f; if (self.onFlip) self.onFlip(face, true); } q.slerp(faceQ(face), 1 - Math.pow(0.012, dt)); } }
      }
      card.quaternion.copy(q); stepAnims(dt);
      renderer.render(scene, camera);
    }
    function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h;
      const tn = Math.tan((camera.fov * Math.PI) / 360); camera.position.z = Math.max((CH / 0.6) / (2 * tn), (CW / 0.76) / (2 * tn * camera.aspect)); camera.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(el); resize();
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); });
    raf = requestAnimationFrame(frame);
    this.renderer = renderer; this.card = card; this.scene = scene; this.key = key; this.q = q; this.freeze = (v) => { settle = !v; };
  }
  window.PotoPostcard = Postcard;
})();
