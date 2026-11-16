/* Poto v2 — the postcard as a physical object (three.js r160).
   A card in a white room: paper grain, satin photo side, uncoated written side, soft wall shadow,
   and stickers (back only) that peel, lift and press back down.

   Round 2 changes (Cody, 16 Nov):
   - thinner card, rounded corners, a soft rolled edge instead of a knife edge
   - matte: no clearcoat, low reflections, light rakes across so the tooth shows
   - turning is locked to flipping: yaw left/right, a little tilt that springs back, never upside down
   - stickers only live on the back, sit flush, and their contact shadow follows the peel */
(function () {
  const T = THREE, V2 = T.Vector2, V3 = T.Vector3;
  const CW = 1.0, CH = 1.414, CT = 0.0065, CR = 0.022;     // width, height, thickness (~2x real so it still reads on a phone), corner radius
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const rubber = (x, lim) => lim * Math.tanh(x / lim);

  /* ---------- sticker shader pieces: a cylinder curl about a fold line + holographic foil ---------- */
  const PEEL_PARS = `
    uniform vec2 uFoldP; uniform vec2 uFoldD; uniform float uFoldR; uniform float uPeel;
    uniform mat3 uToCard; uniform mat3 uFromCard; uniform vec2 uHalf; uniform float uBend; uniform float uWrap;
    // a stuck sticker that hangs past the card's edge bends round the edge (radius = half the card's thickness) and lies on the other face
    vec3 wrapEdge(vec3 p, inout vec3 n) {
      if (uWrap < 0.5) return p;
      vec2 c = (uToCard * vec3(p.xy, 1.0)).xy; float z = p.z; float r = uBend, arc = 3.14159265 * r;
      for (int a = 0; a < 2; a++) {
        float h = a == 0 ? uHalf.x : uHalf.y, v = a == 0 ? c.x : c.y, o = abs(v) - h, sg = v < 0.0 ? -1.0 : 1.0;
        if (o > 0.0) {
          vec2 dirH = (uFromCard * vec3(a == 0 ? vec2(sg, 0.0) : vec2(0.0, sg), 0.0)).xy;
          if (o < arc) { float th = o / r; v = sg * (h + r * sin(th)); z -= r * (1.0 - cos(th)); n = normalize(vec3(dirH * sin(th), cos(th))); }
          else { v = sg * (h - (o - arc)); z -= 2.0 * r; n = vec3(0.0, 0.0, -1.0); }
          if (a == 0) c.x = v; else c.y = v;
        }
      }
      return vec3((uFromCard * vec3(c, 1.0)).xy, z);
    }
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
      .replace('void main() {', 'void main() {\n vec3 peelN; vec3 peelP = peelPos(position, peelN); peelP = wrapEdge(peelP, peelN);')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = peelN;')
      .replace('#include <begin_vertex>', 'vec3 transformed = peelP;');
  }
  const FOIL_FRAG = `
    {
      vec3 vdir = normalize(vViewPosition);
      float facing = clamp(dot(vdir, normal), 0.0, 1.0);
      float fm = texture2D(uFoilMap, vMapUv).r * uFoil * (gl_FrontFacing ? 1.0 : 0.0);
      float ph = (normal.x * 1.6 + normal.y * 1.2) + vdir.x * 1.5 + vdir.y * 1.1 + (vMapUv.x * 0.9 + vMapUv.y * 0.55) + sin(vMapUv.x * 46.0 + vMapUv.y * 31.0) * 0.03;
      vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (ph + vec3(0.0, 0.33, 0.67)));
      float sparkle = pow(fract(sin(dot(floor(vMapUv * 190.0), vec2(12.9898, 78.233))) * 43758.5453), 22.0) * smoothstep(0.2, 0.0, abs(fract(ph * 1.7) - 0.5) - 0.2);
      float band = smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(ph * 6.28318 * 1.3));
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.80, 0.82, 0.86), mix(vec3(0.86), rainbow, 0.7), 0.25 + 0.6 * band) * (0.6 + 0.4 * facing) + sparkle * 1.2, fm);
      metalnessFactor = mix(metalnessFactor, 0.5, fm); roughnessFactor = mix(roughnessFactor, 0.34, fm);
      if (!gl_FrontFacing) { diffuseColor.rgb = vec3(0.90, 0.895, 0.88); roughnessFactor = 0.85; metalnessFactor = 0.0; }
    }`;
  /* contact shadow under a stuck sticker. Hidden past the fold line, so when you peel, it goes with the lifted part. */
  const CONTACT_VS = `uniform vec3 uSh; varying vec2 vUv; varying vec2 vP; void main() { vUv = uv; vP = position.xy * uSh.z + uSh.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const CONTACT_FS = `uniform sampler2D uMap; uniform float uOp; uniform vec2 uFoldP; uniform vec2 uFoldD; uniform float uPeel; uniform mat3 uToCard; uniform vec2 uHalf; varying vec2 vUv; varying vec2 vP;
    void main() { vec2 cc = (uToCard * vec3(vP, 1.0)).xy; if (abs(cc.x) > uHalf.x || abs(cc.y) > uHalf.y) discard; float a = texture2D(uMap, vUv).a; float keep = uPeel > 0.5 ? 1.0 - smoothstep(-0.03, 0.004, dot(vP - uFoldP, uFoldD)) : 1.0; gl_FragColor = vec4(0.09, 0.08, 0.07, a * uOp * keep); }`;

  /* ---------- the card: a thin slab with rounded corners and a softly rolled edge ---------- */
  function axis(len, n, m) {
    const h = len / 2, v = []; for (let i = 0; i <= n; i++) v.push(-h + (len * i) / n);
    for (let k = 0; k <= m; k++) { const d = h - CR + CR * Math.tan((k / m) * Math.PI / 4); v.push(d, -d); }
    v.sort((a, b) => a - b); return v.filter((x, i) => i === 0 || x - v[i - 1] > 1e-5);
  }
  function mapPt(x, y) {                       // squash the grid's corner squares into quarter circles
    const cx = CW / 2 - CR, cy = CH / 2 - CR, ax = Math.abs(x), ay = Math.abs(y);
    if (ax > cx && ay > cy) { let dx = ax - cx, dy = ay - cy; const m = Math.max(dx, dy), l = Math.hypot(dx, dy); dx *= m / l; dy *= m / l; return [Math.sign(x) * (cx + dx), Math.sign(y) * (cy + dy)]; }
    return [x, y];
  }
  function edgeInfo(x, y) {                    // distance to the edge and the outward direction there
    const cx = CW / 2 - CR, cy = CH / 2 - CR, ax = Math.abs(x), ay = Math.abs(y);
    if (ax > cx && ay > cy) { const dx = ax - cx, dy = ay - cy, l = Math.hypot(dx, dy) || 1; return [CR - l, Math.sign(x) * dx / l, Math.sign(y) * dy / l]; }
    const ex = CW / 2 - ax, ey = CH / 2 - ay; return ex < ey ? [ex, Math.sign(x), 0] : [ey, 0, Math.sign(y)];
  }
  function cardGeometry() {
    const xs = axis(CW, 22, 5), ys = axis(CH, 30, 5), nx = xs.length, ny = ys.length;
    const pos = [], nor = [], uv = [], idx = [], g = new T.BufferGeometry();
    const BEVEL = 0.011;
    // sides first (group 0)
    const per = []; for (let i = 0; i < nx; i++) per.push([i, 0]); for (let j = 1; j < ny; j++) per.push([nx - 1, j]); for (let i = nx - 2; i >= 0; i--) per.push([i, ny - 1]); for (let j = ny - 2; j >= 1; j--) per.push([0, j]);
    const pts = per.map(([i, j]) => mapPt(xs[i], ys[j])), P = pts.length;
    pts.forEach((p, k) => {
      const a = pts[(k - 1 + P) % P], b = pts[(k + 1) % P]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      for (const z of [CT / 2, -CT / 2]) { pos.push(p[0], p[1], z); nor.push(ty, -tx, 0); uv.push(k / P, z > 0 ? 1 : 0); }
    });
    for (let k = 0; k < P; k++) { const a = k * 2, b = a + 1, c = ((k + 1) % P) * 2 + 1, d = ((k + 1) % P) * 2; idx.push(a, b, c, a, c, d); }
    g.addGroup(0, idx.length, 0);
    // front (1) and back (2)
    for (const [zs, grp] of [[1, 1], [-1, 2]]) {
      const base = pos.length / 3, start = idx.length;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const [x, y] = mapPt(xs[i], ys[j]), [e, ox, oy] = edgeInfo(x, y), b = Math.pow(1 - clamp(e / BEVEL, 0, 1), 2) * 1.6;   // the edge rolls away like real card
        const n = new V3(ox * b, oy * b, zs).normalize(); pos.push(x, y, zs * CT / 2); nor.push(n.x, n.y, n.z);
        uv.push(zs > 0 ? x / CW + 0.5 : 0.5 - x / CW, y / CH + 0.5);
      }
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = base + j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx;
        if (zs > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
      }
      g.addGroup(start, idx.length - start, grp);
    }
    g.setIndex(idx); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return g;
  }

  function Postcard(el, opts) {
    const self = this; opts = opts || {};
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(opts.lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));   // 1.75x is sharp on a phone and ~25% fewer pixels than 2x
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = false;   // no shadow-map pass (it drew the scene twice plus blur passes every frame): the card's shadow is a projected soft image below
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(); scene.background = new T.Color(opts.background || '#FAFAF8');
    const camera = new T.PerspectiveCamera(28, 1, 0.1, 30); camera.position.set(0, 0, 4.4);

    /* reflections: a dim, soft studio. Enough to give the satin photo a sheen at an angle, never a white flare. */
    (function env() {
      const s = new T.Scene(); s.add(new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x6f6f72, side: T.BackSide })));
      const panel = (w, h, x, y, z, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
      panel(5, 2.2, -2.5, 4.2, 2.5, 0xb8b8b8); panel(1.6, 3.2, -3.2, 1.2, 3.6, 0xf2efe8);   // a soft window: what a glossy print catches when you tilt it panel(1.4, 5, 4.6, 1, 2.5, 0xa9a59f); panel(6, 1, 0, -1.5, 4.8, 0x9ea4ad);
      const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(s, 0.06).texture; pm.dispose();
    })();
    scene.add(new T.HemisphereLight(0xffffff, 0xeeebe5, 1.3));
    // the key comes in low from the upper left, so the paper's tooth and the typewriter dents catch the light
    const key = new T.DirectionalLight(0xfffcf6, 1.75); key.position.set(-2.4, 2.1, 2.7);
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = opts.lite ? 8 : 12; key.shadow.blurSamples = opts.lite ? 6 : 10;   // the shadow is soft anyway: a smaller map and fewer blur taps look the same and cost far less per frame key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 2, bottom: -2, near: 0.5, far: 9 }); key.shadow.camera.updateProjectionMatrix(); scene.add(key);
    // the card's shadow on the wall: a pre-blurred rounded rectangle, projected along the light onto the wall each frame (classic planar shadow).
    // One textured quad instead of a shadow map: same soft look, a fraction of the cost.
    const WALLZ = -0.3, shc = document.createElement('canvas'); shc.width = 256; shc.height = 340; { const g = shc.getContext('2d'); g.filter = 'blur(13px)'; g.fillStyle = '#000'; g.beginPath(); g.roundRect(46, 46, 164, 248, 6); g.fill(); }
    const shTex = new T.CanvasTexture(shc), shadowQuad = new T.Mesh(new T.PlaneGeometry(CW * 256 / 164, CH * 340 / 248), new T.MeshBasicMaterial({ map: shTex, color: 0x20222a, transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide }));
    shadowQuad.matrixAutoUpdate = false; shadowQuad.visible = false;   // Cody, 16 Nov: no wall shadow at all (it read as a blob). Kept switched off in case it's wanted later.
    const Ld = new V3().copy(key.position).normalize().negate(), projM = new T.Matrix4();
    { const t = -1 / Ld.z; projM.set(1, 0, -Ld.x / Ld.z, Ld.x * WALLZ / Ld.z, 0, 1, -Ld.y / Ld.z, Ld.y * WALLZ / Ld.z, 0, 0, 0, WALLZ + 0.001, 0, 0, 0, 1); }   // P' = P - Ld * (P.z - WALLZ) / Ld.z scene.add(wall);

    /* ---------- the card ---------- */
    const card = new T.Group(); scene.add(card);
    const tex = (c, srgb) => { const t = new T.CanvasTexture(c); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb) t.colorSpace = T.SRGBColorSpace; return t; };
    const edge = new T.MeshStandardMaterial({ color: 0xe9e4d9, roughness: 1, envMapIntensity: 0.2, side: T.DoubleSide });
    const mats = { front: new T.MeshPhysicalMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0.3, clearcoat: 0, clearcoatRoughness: 0.07 }), back: new T.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0.25 }) };
    const body = new T.Mesh(cardGeometry(), [edge, mats.front, mats.back]); card.add(body);
    this.setFaces = function (front, back) {
      if (front) { const m = mats.front; m.emissive = new T.Color(0xffffff); m.emissiveMap = front.lit ? tex(front.lit, true) : null; m.emissiveIntensity = front.lit ? 0.3 : 0; m.clearcoat = front.gloss ? 1 : 0; m.clearcoatMap = front.gloss ? tex(front.gloss) : null; m.envMapIntensity = front.gloss ? 0.6 : 0.3; }
      for (const [m, t, k] of [[mats.front, front, 1.3], [mats.back, back, 1.9]]) { if (!t) continue; m.map = tex(t.col, true); m.roughnessMap = tex(t.rough); m.normalMap = tex(t.nrm || PotoPaper.normalFromHeight(t.hgt, k)); m.needsUpdate = true; }
    };
    // typing changes a small rectangle: send just that rectangle to the GPU instead of the whole 1024x1448 texture (twice) per key
    this.updateBackRegion = function (r) {
      const gl = renderer.getContext();
      for (const tx of [mats.back.map, mats.back.normalMap]) {
        const prop = renderer.properties.get(tx), c = tx.image;
        if (!prop.__webglTexture || !r) { tx.needsUpdate = true; continue; }
        const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y)), w = Math.min(c.width - x, Math.ceil(r.w)), h = Math.min(c.height - y, Math.ceil(r.h)); if (w <= 0 || h <= 0) continue;
        const data = new Uint8Array(c.getContext('2d').getImageData(x, y, w, h).data.buffer);
        renderer.state.bindTexture(gl.TEXTURE_2D, prop.__webglTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, tx.flipY); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, tx.flipY ? c.height - y - h : y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
        if (tx.generateMipmaps) gl.generateMipmap(gl.TEXTURE_2D);
      }
    };
    this.refreshBack = function () { mats.back.map.needsUpdate = true; mats.back.normalMap.needsUpdate = true;
    };

    /* ---------- stickers (back only) ---------- */
    const stickers = []; const SS = 0.34, BZ = -CT / 2;
    function addSticker(kind, finish, x, y, rot) {
      const art = PotoPaper.sticker(kind), u = { uToCard: { value: new T.Matrix3() }, uFromCard: { value: new T.Matrix3() }, uHalf: { value: new V2(CW / 2, CH / 2) }, uBend: { value: CT / 2 }, uWrap: { value: 1 }, uFoldP: { value: new V2(9, 9) }, uFoldD: { value: new V2(1, 0) }, uFoldR: { value: 0.035 }, uPeel: { value: 0 }, uFoilMap: { value: tex(art.foil) }, uFoil: { value: finish === 'holo' ? 1 : 0 } };
      const mat = new T.MeshPhysicalMaterial({ map: tex(art.col, true), alphaTest: 0.5, side: T.DoubleSide, roughness: finish === 'matte' ? 0.9 : 0.34, metalness: 0,
        clearcoat: finish === 'matte' ? 0 : finish === 'holo' ? 0.45 : 0.9, clearcoatRoughness: finish === 'holo' ? 0.25 : 0.12, normalMap: tex(PotoPaper.normalFromHeight(art.hgt, 5)), envMapIntensity: 0.95,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      mat.onBeforeCompile = (sh) => { patchPeel(sh, u);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uFoilMap; uniform float uFoil;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FOIL_FRAG); };
      const mesh = new T.Mesh(new T.PlaneGeometry(SS, SS, 44, 44), mat);
      const dd = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: mat.map, alphaTest: 0.5 }), dm = new T.MeshDistanceMaterial({ map: mat.map, alphaTest: 0.5 });
      dd.onBeforeCompile = dm.onBeforeCompile = (sh) => patchPeel(sh, u); mesh.customDepthMaterial = dd; mesh.customDistanceMaterial = dm;
      // contact shadow: the sticker's own silhouette, barely blurred, a hair down-right of it (light is upper-left)
      const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx = sc.getContext('2d'); sx.filter = 'blur(2.5px)'; sx.drawImage(art.col, 4, 5, 250, 250);
      const shadow = new T.Mesh(new T.PlaneGeometry(SS, SS), new T.ShaderMaterial({ vertexShader: CONTACT_VS, fragmentShader: CONTACT_FS, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, uniforms: { uMap: { value: tex(sc) }, uOp: { value: 0.32 }, uFoldP: u.uFoldP, uFoldD: u.uFoldD, uPeel: u.uPeel, uToCard: u.uToCard, uHalf: u.uHalf, uSh: { value: new V3(0, 0, 1) } } }));
      const holder = new T.Group(); holder.add(shadow); holder.add(mesh); shadow.position.z = 0.0003; mesh.position.z = 0.0006;
      const s = { holder, mesh, shadow, u, kind, finish, lift: 0, state: 'stuck', rot, x, y, tilt: new V2(), layer: ++layers };
      place(s, x, y, rot, 0); card.add(holder); stickers.push(s); return s;
    }
    // stacking: each sticker sits a hair above the ones put down before it, so the latest is always on top and nothing clips
    let layers = 0; const LAYER = 0.0007;
    function place(s, x, y, rot, lift) {
      // sticker-local -> card coordinates (the holder is turned to face out of the back), for the edge wrap
      const c = Math.cos(rot), sn = Math.sin(rot); s.u.uToCard.value.set(-c, sn, x, sn, c, y, 0, 0, 1); s.u.uFromCard.value.copy(s.u.uToCard.value).invert();
      s.u.uBend.value = (CT + (s.layer || 0) * LAYER + Math.max(0, lift)) / 2 + 0.0004; s.u.uWrap.value = s.state === 'stuck' || (s.state === 'placing' && lift < 0.004) ? 1 : 0;
      s.x = x; s.y = y; s.rot = rot; s.holder.position.set(x, y, BZ - lift - s.layer * LAYER); s.mesh.renderOrder = s.shadow.renderOrder = s.layer * 2 + (s.state === 'held' || s.state === 'placing' ? 1000 : 0); s.holder.rotation.set(s.tilt.x, Math.PI + s.tilt.y, 0); s.holder.rotateZ(rot); }
    this.addSticker = addSticker; this.stickers = stickers;
    // stickers as flat pieces on the back texture (for share images). The back's x is mirrored, so is the turn.
    this.stickersFlat = () => stickers.filter((s) => s.state === 'stuck').sort((a, b) => a.layer - b.layer).map((s) => ({ img: s.mesh.material.map.image, foil: s.u.uFoilMap.value.image, finish: s.finish,
      px: (0.5 - s.x / CW) * 1024, py: (0.5 - s.y / CH) * 1448, rot: s.rot, size: SS / CW * 1024 }));

    /* ---------- turning: yaw only (that's the flip), a little tilt that springs back, never upside down ---------- */
    const REST_YAW = 0.12, REST_PITCH = -0.06, ROLL = -0.012, MAX_PITCH = 0.3;
    // writing: the card turns to its back, lies square to you and comes closer, like pulling it into the typewriter
    let writing = false, wk = 0, camZ = 4.4;
    this.writing = (on) => { writing = on; if (on && sel) select(null); if (on && faceOf(yawT) !== 1) self.flip(1); };
    this.nudge = (kind) => { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; if (kind === 'key') pv -= 0.32; else if (kind === 'return') yv += 0.9; else if (kind === 'bell') pv += 0.18; };
    let yaw = 0, pitch = REST_PITCH, yawT = 0, yv = 0, pv = 0, dragging = false, flipping = false, lastFace = 0;
    const faceOf = (y) => (((Math.round(y / Math.PI) % 2) + 2) % 2);
    this.face = () => faceOf(yawT);
    function setTarget(t) { yawT = t; const f = faceOf(t); if (f !== lastFace) { lastFace = f; flipping = true; if (self.onFlip) self.onFlip(f); } }
    this.flip = function (to) { if (busySticker()) return; if (typeof select === 'function') select(null); const n = Math.round(yawT / Math.PI); if (to === undefined || faceOf(yawT) !== to) setTarget((n + 1) * Math.PI); };
    const busySticker = () => stickers.some((s) => s.state === 'held' || s.state === 'peeling' || s.state === 'placing');

    const ray = new T.Raycaster(), ndc = new V2();
    const toNdc = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
    // where the pointer meets a plane parallel to the card at local depth z
    function onCardPlane(e, z) { toNdc(e); card.updateMatrixWorld(); const n = new V3(0, 0, 1).transformDirection(card.matrixWorld), o = card.localToWorld(new V3(0, 0, z));
      const pt = ray.ray.intersectPlane(new T.Plane().setFromNormalAndCoplanarPoint(n, o), new V3()); return pt ? card.worldToLocal(pt) : null; }
    const backFacing = () => new V3(0, 0, -1).transformDirection(card.matrixWorld).z > 0.2;
    const alphaCache = new Map();
    function sampleAlpha(s, uv) { let d = alphaCache.get(s); if (!d) { const c = s.mesh.material.map.image; d = c.getContext('2d').getImageData(0, 0, c.width, c.height); alphaCache.set(s, d); }
      const x = Math.floor(uv.x * d.width), y = Math.floor((1 - uv.y) * d.height); return x >= 0 && y >= 0 && x < d.width && y < d.height && d.data[(y * d.width + x) * 4 + 3] > 100; }
    function hitSticker(e) {
      if (!backFacing() || flipping) return null; toNdc(e);
      // every sticker under the finger, top layer first; the first one whose painted area you're touching is the one that peels
      const hits = ray.intersectObjects(stickers.filter((s) => s.state === 'stuck').map((s) => s.mesh), false)
        .map((h) => ({ h, s: stickers.find((k) => k.mesh === h.object) })).sort((a, b) => b.s.layer - a.s.layer);
      for (const { h, s } of hits) if (h.uv && sampleAlpha(s, h.uv)) return { s, p: new V2((h.uv.x - 0.5) * SS, (h.uv.y - 0.5) * SS) };
      return null;
    }
    function stickerLocal(s, e) { const p = onCardPlane(e, BZ); if (!p) return null; const l = s.holder.worldToLocal(card.localToWorld(p.clone())); return new V2(l.x, l.y); }

    let ptr = null, sel = null;
    const dom = renderer.domElement; dom.style.touchAction = 'none';
    /* sticker mode (Cody, 16 Nov): tap a sticker to select it. While one is selected the card stops turning, so any drag on the
       card peels that sticker; nothing fights the flip. Tap empty card (or Done) to leave sticker mode. */
    function select(s) { if (sel === s) return; sel = s; if (self.onSelect) self.onSelect(s); }
    this.select = select; this.selected = () => sel;
    const heldLoose = () => stickers.find((s) => s.state === 'held');
    dom.addEventListener('pointerdown', (e) => {
      if (ptr) return; dom.setPointerCapture(e.pointerId);
      const base = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), lt: performance.now(), moved: false };
      if (writing) { ptr = Object.assign(base, { write: true }); dragging = false; if (self.onWritePointer) self.onWritePointer('down', e, false); return; }
      let hs = null; const held = heldLoose();
      if (held) hs = { s: held };                                                        // a sticker you lifted with "Peel off" goes where you touch next
      else {
        hs = hitSticker(e);
        if (!hs && sel && sel.state === 'stuck') { const c = stickerLocal(sel, e); if (c) { c.clampScalar(-SS * 0.3, SS * 0.3); hs = { s: sel, p: c, viaSel: true }; } }
      }
      ptr = Object.assign(base, { st: hs });
      if (hs && hs.s.state === 'held') dragSticker(hs, e);
      dragging = !hs && !busySticker() && !sel; if (dragging) yv = 0; if (hs && self.onGrab) self.onGrab();
    });
    dom.addEventListener('pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y, now = performance.now(), dt = Math.max(1, now - ptr.lt) / 1000; ptr.x = e.clientX; ptr.y = e.clientY; ptr.lt = now;
      if (Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 6) ptr.moved = true;
      if (ptr.write) { if (self.onWritePointer) self.onWritePointer('move', e, ptr.moved); return; }
      if (ptr.st) { if (!ptr.moved && ptr.st.s.state === 'stuck') return; return dragSticker(ptr.st, e); }
      if (!dragging) return;
      const k = 3.4 / Math.max(260, dom.clientWidth);                                  // a full-width drag turns it about 200 degrees
      yaw += dx * k; yv = lerp(yv, (dx * k) / dt, 0.5);
      pitch = REST_PITCH + rubber(pitch - REST_PITCH + dy * k * 0.55, MAX_PITCH);         // tilt resists more the further you go
    });
    const up = (e) => {
      if (!ptr || e.pointerId !== ptr.id) return; const p = ptr; ptr = null;
      if (p.write) { if (self.onWritePointer) self.onWritePointer('up', e, p.moved); return; }
      if (p.st) {
        if (!p.moved && p.st.s.state === 'stuck') { select(p.st.viaSel || p.st.s === sel ? null : p.st.s); return; }   // a tap selects (or lets go)
        return releaseSticker(p.st, e);
      }
      if (sel && !p.moved) { if (!busySticker()) select(null); return; }          // a tap on empty card lets go of the sticker (not while it's moving)
      if (!dragging) return; dragging = false;
      if (!p.moved && performance.now() - p.t < 350) return self.flip();
      const n = Math.round((yaw + clamp(yv, -14, 14) * 0.14) / Math.PI);                // a flick carries over to the other side; a slow drag settles back
      setTarget(n * Math.PI);
    };
    // "Peel off": the sticker peels itself up and waits in the air; tap where it should go. "Remove": it peels off and drops away.
    function autoPeel(then) {
      const s = sel; if (!s || s.state !== 'stuck') return;
      const D = new V2(0.92, 0.38).normalize(); s.state = 'peeling'; s.u.uPeel.value = 1; s.u.uFoldD.value.copy(D); s.u.uFoldR.value = 0.03; s.peeled = 0;
      if (self.onPeelStart) self.onPeelStart();
      anims.push({ s, k: 'autopeel', t: 0, d: 0.42, D, then });
    }
    this.peelSelected = () => autoPeel('hold');
    this.removeSelected = () => { const s = sel; if (s && s.state === 'held') { s.state = 'gone'; select(null); anims.push({ s, k: 'drop', t: 0, d: 0.22 }); if (self.onRemove) self.onRemove(s); } else autoPeel('remove'); };
    this.stickerScreen = (s) => { card.updateMatrixWorld(); const r = dom.getBoundingClientRect(), c = s.holder.localToWorld(new V3()).project(camera), e = s.holder.localToWorld(new V3(SS * 0.5, 0, 0)).project(camera);
      const px = (v) => ({ x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }), a = px(c), b = px(e); return { x: a.x, y: a.y, r: Math.hypot(b.x - a.x, b.y - a.y) }; };
    this.screenToBack = (e) => { toNdc(e); const h = ray.intersectObject(body, false)[0]; if (!h || !h.face || h.face.materialIndex !== 2 || !h.uv) return null; return { x: h.uv.x * 1024, y: (1 - h.uv.y) * 1448 }; };
    dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);

    /* ---------- peel / lift / place ---------- */
    const LIFT = 0.045;
    function dragSticker(h, e) {
      const s = h.s;
      if (s.state === 'held') { const p = onCardPlane(e, BZ - s.lift); if (p) { s.tx = p.x; s.ty = p.y; } return; }
      if (s.state !== 'stuck' && s.state !== 'peeling') return;
      const c = stickerLocal(s, e); if (!c) return;
      if (!h.g) {                                                // peeling starts from the edge you're pulling away from
        const d = c.clone().sub(h.p); if (d.length() < 0.012) return; d.normalize();
        let g = h.p.clone(); for (let i = 0; i < 60; i++) { const n = g.clone().addScaledVector(d, -0.008); if (Math.abs(n.x) > SS / 2 || Math.abs(n.y) > SS / 2 || !sampleAlpha(s, new V2(n.x / SS + 0.5, n.y / SS + 0.5))) break; g = n; }
        h.g = g.addScaledVector(d, -0.03); s.state = 'peeling'; s.u.uPeel.value = 1; if (self.onPeelStart) self.onPeelStart();
      }
      const D = h.g.clone().sub(c); const len = D.length(); if (len < 1e-4) return; D.divideScalar(len);
      const m = h.g.clone().add(c).multiplyScalar(0.5); s.u.uFoldP.value.copy(m); s.u.uFoldD.value.copy(D); s.u.uFoldR.value = clamp(0.018 + len * 0.09, 0.02, 0.05);
      let mx = -1e9, mn = 1e9; for (const cx of [-1, 1]) for (const cy of [-1, 1]) { const v = (cx * SS / 2 - m.x) * D.x + (cy * SS / 2 - m.y) * D.y; mx = Math.max(mx, v); mn = Math.min(mn, v); }
      s.peeled = clamp(mx / (mx - mn), 0, 1); if (self.onPeel) self.onPeel(s.peeled);
      if (s.peeled > 0.88) {                                       // it lets go of the card: now it's in your fingers, held just above the surface
        s.state = 'held'; s.layer = ++layers; const p = onCardPlane(e, BZ - LIFT); s.tx = p ? p.x : s.x; s.ty = p ? p.y : s.y;
        anims.push({ s, k: 'unfurl', t: 0, d: 0.22 }); if (self.onLift) self.onLift();
      }
    }
    function releaseSticker(h, e) {
      const s = h.s;
      if (s.state === 'peeling') { anims.push({ s, k: 'relay', t: 0, d: 0.2, p0: s.u.uFoldP.value.clone(), D: s.u.uFoldD.value.clone() }); s.state = 'placing'; if (self.onPress) self.onPress(0.5); }
      else if (s.state === 'held') {
        const inside = Math.abs(s.tx) < CW / 2 - 0.02 && Math.abs(s.ty) < CH / 2 - 0.02;              // centre on the card: whatever hangs over the edge wraps round it
        if (!inside) { s.state = 'gone'; anims.push({ s, k: 'drop', t: 0, d: 0.22 }); if (self.onRemove) self.onRemove(s); return; }
        s.state = 'placing'; s.rot += (Math.random() - 0.5) * 0.12;                // it never goes down perfectly straight
        anims.push({ s, k: 'place', t: 0, d: 0.2, l0: s.lift });
      }
    }
    const anims = [];
    function stepAnims(dt) {
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i], s = a.s; a.t += dt; const t = clamp(a.t / a.d, 0, 1), e = 1 - Math.pow(1 - t, 3);
        if (a.k === 'relay') { s.u.uFoldP.value.copy(a.p0).addScaledVector(a.D, e * SS * 1.1); if (t >= 1) { s.u.uPeel.value = 0; s.state = 'stuck'; } }
        else if (a.k === 'autopeel') {
          s.u.uFoldP.value.copy(a.D).multiplyScalar(lerp(SS * 0.62, -SS * 0.66, e)); s.peeled = e; if (self.onPeel) self.onPeel(e);
          if (t >= 1) { if (a.then === 'remove') { s.state = 'gone'; select(null); anims.push({ s, k: 'drop', t: 0, d: 0.22 }); if (self.onRemove) self.onRemove(s); }
            else { s.state = 'held'; s.layer = ++layers; s.tx = s.x; s.ty = s.y; anims.push({ s, k: 'unfurl', t: 0, d: 0.22 }); if (self.onLift) self.onLift(); } }
        }
        else if (a.k === 'unfurl') { s.u.uFoldR.value = lerp(0.05, 0.4, e); s.u.uFoldP.value.addScaledVector(s.u.uFoldD.value, dt * 2.2); s.lift = lerp(0.006, LIFT, e); if (t >= 1) s.u.uPeel.value = 0; }
        else if (a.k === 'place') {                               // comes straight down where it was hovering, then a little press
          s.lift = lerp(a.l0, 0, t * t); s.tilt.multiplyScalar(1 - t);
          if (t >= 1 && !a.patted) { a.patted = true; s.lift = 0; s.tilt.set(0, 0); s.state = 'stuck'; s.layer = ++layers; anims.push({ s, k: 'pat', t: 0, d: 0.16 }); if (self.onPress) self.onPress(1); }
        }
        else if (a.k === 'pat') { s.mesh.scale.setScalar(1 - 0.025 * Math.sin(t * Math.PI)); }
        else if (a.k === 'drop') { s.holder.scale.setScalar(1 - e); if (t >= 1) { card.remove(s.holder); stickers.splice(stickers.indexOf(s), 1); } }
        if (t >= 1) anims.splice(i, 1);
      }
      for (const s of stickers) {
        if (s.state === 'held') {                                 // follows your finger, leaning a little into the direction of travel
          const vx = s.tx - s.x, vy = s.ty - s.y, f = Math.min(1, dt * 18);
          s.x += vx * f; s.y += vy * f; s.tilt.set(clamp(-vy * 3, -0.35, 0.35), clamp(-vx * 3, -0.35, 0.35));
        }
        if (s.state === 'stuck') { const want = s === sel ? 0.007 : 0; s.lift += (want - s.lift) * Math.min(1, dt * 14); if (Math.abs(s.lift - want) < 1e-5) s.lift = want; }
        if (s.state !== 'gone') place(s, s.x, s.y, s.rot, s.lift);
        // the shadow stays on the card while the sticker lifts: it slides away from the light, grows and fades a little. One quad, no extra pass.
        const up = Math.max(0, s.lift); s.shadow.position.set(up * 0.55, -up * 0.75, -up + 0.0003); s.shadow.scale.setScalar(1 + up * 3.2); s.shadow.material.uniforms.uSh.value.set(up * 0.55, -up * 0.75, 1 + up * 3.2);
        const target = s.state === 'held' || s.state === 'placing' ? 0.32 * (1 - Math.min(0.55, up / LIFT * 0.55)) : 0.32;
        const sm = s.shadow.material.uniforms.uOp; sm.value = lerp(sm.value, clamp(target, 0, 0.32), Math.min(1, dt * 14));
      }
    }

    /* ---------- frame loop ---------- */
    let last = performance.now(), raf = 0, visible = true, slow = 0, shadowTick = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000), gap = now - last; last = now; if (!visible) return;
      if (!opts.lite && slow >= 0) { slow = gap > 45 ? slow + 1 : Math.max(0, slow - 1); if (slow > 40) { slow = -1; renderer.setPixelRatio(1); key.shadow.blurSamples = 8; key.shadow.radius = 10; resize(); } }
      if (!dragging) {                                            // a card with a little weight: one small overshoot, then still
        yv += (yawT - yaw) * 110 * dt; yv *= Math.exp(-15 * dt); yaw += yv * dt;
        pv += (REST_PITCH * (1 - wk) - pitch) * 140 * dt; pv *= Math.exp(-17 * dt); pitch += pv * dt;
        if (flipping && Math.abs(yaw - yawT) < 0.004 && Math.abs(yv) < 0.05) { flipping = false; if (self.onLand) self.onLand(); }
      }
      wk += ((writing ? 1 : 0) - wk) * Math.min(1, dt * 6);
      // (wall shadow switched off)
      card.rotation.set(pitch, yaw + REST_YAW * (1 - wk), ROLL * (1 - wk), 'YXZ');
      camera.position.set(-0.11 * wk, -0.06 * wk, camZ * (1 - 0.2 * wk));
      stepAnims(dt); renderer.render(scene, camera);
    }
    function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h;
      const tn = Math.tan((camera.fov * Math.PI) / 360); camZ = camera.position.z = Math.max((CH / 0.6) / (2 * tn), (CW / 0.76) / (2 * tn * camera.aspect)); camera.updateProjectionMatrix(); }
    new ResizeObserver(resize).observe(el); resize();
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); });
    raf = requestAnimationFrame(frame);
    // texture pixel on the back -> screen point (for the marker that follows your words)
    this.backToScreen = (px, py) => { const v = card.localToWorld(new V3((0.5 - px / 1024) * CW, (0.5 - py / 1448) * CH, -CT / 2)).project(camera), r = dom.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, scale: r.width / (CW * 1024) }; };
    this.renderer = renderer; this.card = card; this.scene = scene; this.key = key; this.cam = camera;
    this.pose = (y, p) => { yaw = yawT = y; pitch = p; yv = pv = 0; lastFace = faceOf(y); };      // for screenshots and tests
  }
  window.PotoPostcard = Postcard;
})();
