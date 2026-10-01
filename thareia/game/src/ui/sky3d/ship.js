// Thareia (T2): the player's 3D airship (design/09-t2-spec.md 6.7), a readable port of the ship builder in the player's
// page art-in/airship/the-magpie-3d.html (three.js r186): the hull lofted from the side and top outlines of the skiff
// turnaround sheet, a deck, brass rails, the sunstone furnace with its crystals, two wing sails, fins, a rudder and a
// pennant. Toon shading with a stepped gradient, ink outlines by an inverted hull (a back-face copy pushed out along
// its normals, one flat ink colour), and the crystals glow: an emissive amber pulsing over about 2 s plus additive
// glow sprites. No people on deck (the page's crew is left out).
//
// buildShip({ livery }) -> { root, parts: { hull, sails, crystals, rudder, pennant }, length, update(dt, o), dispose() }
//   livery: 'first' (Yara's skiff, the Prologue's first flight) or 'rented' (Dustwind Skiff Hire: a blue-and-white hull
//   band, a striped pennant, patched sails; painting 16's colours).
//   The model is in the page's units (the hull runs from z -2.4 at the stern to z 2.7 at the bow; y up; the right side
//   is -x). root holds `tilt` (bank and pitch) holding the model; the caller places, scales and turns root.
//   update(dt, { bank, pitch, turn, speed, glow }) leans the ship (radians; bank > 0 is the right side down), turns the
//   rudder into the turn, fills the sails with speed, and pulses the crystals (glow 1 normal, more on take-off).
import {
  Group, Mesh, BufferGeometry, Float32BufferAttribute, MeshToonMaterial, ShaderMaterial, SpriteMaterial,
  Sprite, DataTexture, CanvasTexture, NearestFilter, RGBAFormat, BackSide, DoubleSide, AdditiveBlending, Color, Vector3,
  Vector2, Shape, ShapeGeometry, LatheGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, TubeGeometry,
  CatmullRomCurve3, PlaneGeometry, SRGBColorSpace, RepeatWrapping,
} from 'three';

// ---- the skiff's outlines, measured on the turnaround sheet (the page's data) ----
const SIDE = {
  sternX: 840, bowX: 1485, midRim: 346,
  rim: [[840, 318], [900, 327], [950, 336], [1000, 342], [1050, 345], [1100, 346], [1150, 346], [1200, 344], [1250, 340],
    [1300, 334], [1350, 325], [1400, 312], [1440, 302], [1485, 296]],
  keel: [[840, 405], [860, 410], [900, 421], [960, 435], [1000, 440], [1050, 445], [1100, 448], [1160, 450], [1220, 450],
    [1280, 446], [1320, 438], [1360, 419], [1380, 403], [1400, 386], [1420, 366], [1440, 340], [1460, 319], [1485, 298]],
};
const TOP = {
  bow: 15, stern: 428,
  half: [[15, 0], [25, 7], [40, 14], [55, 22], [70, 33], [85, 42], [100, 55], [115, 66], [150, 76], [200, 81], [260, 82],
    [330, 80], [385, 64], [400, 56], [415, 46], [428, 36]],
};
export const STERN = -2.4, BOW = 2.7, LENGTH = BOW - STERN;
const SIDE_PX = (SIDE.bowX - SIDE.sternX) / LENGTH;   // side-view px per model unit
const TOP_PX = (TOP.stern - TOP.bow) / LENGTH;        // top-view px per model unit
const DECK_Y = -0.06;

const lerpTable = (t, x) => {
  if (x <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [x1, y1] = t[i];
    if (x <= x1) { const [x0, y0] = t[i - 1]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return t[t.length - 1][1];
};
const sideX = z => SIDE.sternX + (z - STERN) * SIDE_PX;
const rimY = z => (SIDE.midRim - lerpTable(SIDE.rim, sideX(z))) / SIDE_PX;       // the gunwale's height at z
const keelY = z => (SIDE.midRim - lerpTable(SIDE.keel, sideX(z))) / SIDE_PX;     // the keel's height at z
const halfW = z => lerpTable(TOP.half, TOP.stern - (z - STERN) * TOP_PX) / TOP_PX; // the half-beam at z
// a point on the hull's cross-section at z: a = 0 at the gunwale, PI/2 at the keel
const section = (z, a) => { const r = rimY(z), d = r - keelY(z); return [halfW(z) * Math.cos(a), r - d * Math.pow(Math.sin(a), 0.75)]; };

// ---- liveries ----
export const LIVERIES = Object.freeze({
  first: Object.freeze({
    planks: ['#7a4a2b', '#6c4025'], band: null, keel: '#4e2d19', deck: '#9a6a40', rail: '#c9a24d', wood: '#4e2d19',
    brass: '#c9a24d', sail: '#efe3c6', patch: '#d8c39a', pennant: ['#a8245f', '#e2bd67'], fin: '#6c4025',
  }),
  rented: Object.freeze({
    planks: ['#7a5234', '#6e492d'], band: ['#3f6ea8', '#ebe6d8'], keel: '#4e2d19', deck: '#a07248', rail: '#c9a24d', wood: '#4e2d19',
    brass: '#c9a24d', sail: '#f0e6cf', patch: '#6f95c0', pennant: ['#3f6ea8', '#f2efe6'], fin: '#3f6ea8',
  }),
});

// ---- materials ----
function makeKit() {
  const owned = { geos: new Set(), mats: new Set(), texs: new Set() };
  const tex = t => { owned.texs.add(t); return t; };
  const mat = m => { owned.mats.add(m); return m; };
  const geo = g => { owned.geos.add(g); return g; };
  // three light steps (the page's gradient map)
  const steps = tex(new DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1, RGBAFormat));
  steps.minFilter = steps.magFilter = NearestFilter; steps.needsUpdate = true;
  const toonCache = new Map();
  const toon = (color, o = {}) => {
    const key = color + JSON.stringify(o);
    if (!toonCache.has(key)) toonCache.set(key, mat(new MeshToonMaterial({ color, gradientMap: steps, ...o })));
    return toonCache.get(key);
  };
  // the ink: a back-face copy pushed out along its normals, in view space (thickness in scene units)
  const ink = mat(new ShaderMaterial({
    uniforms: { color: { value: new Color('#12091a') }, thickness: { value: 0.016 } },
    vertexShader: `
      uniform float thickness;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.xyz += normalize(normalMatrix * normal) * thickness;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
    side: BackSide,
  }));
  // a soft round glow for the additive sprites
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return tex(t);
  })();
  const glow = (color, size, opacity) => {
    const s = new Sprite(mat(new SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending })));
    s.scale.set(size, size, 1);
    return s;
  };
  // add a mesh (with its ink copy unless ink: false)
  const part = (parent, geometry, material, o = {}) => {
    const m = new Mesh(geo(geometry), material);
    if (o.pos) m.position.set(...o.pos);
    if (o.rot) m.rotation.set(...o.rot);
    if (o.scale) m.scale.set(...(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]));
    if (o.name) m.name = o.name;
    if (o.ink !== false) { const k = new Mesh(m.geometry, ink); k.name = 'ink'; m.add(k); }
    parent.add(m);
    return m;
  };
  const tube = (pts, r0, r1, seg = 12, radial = 6) => {
    const curve = new CatmullRomCurve3(pts.map(p => new Vector3(...p)));
    const g = new TubeGeometry(curve, seg, 1, radial, false);
    // taper from r0 to r1 along the tube
    const pos = g.attributes.position, nrm = g.attributes.normal, c = new Vector3(), n = new Vector3(), p = new Vector3();
    for (let i = 0; i <= seg; i++) {
      const t = i / seg; curve.getPointAt(t, c);
      const r = r0 + (r1 - r0) * t;
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        n.fromBufferAttribute(nrm, k); p.copy(c).addScaledVector(n, r); pos.setXYZ(k, p.x, p.y, p.z);
      }
    }
    pos.needsUpdate = true;
    return g;
  };
  const dispose = () => {
    for (const g of owned.geos) g.dispose();
    for (const m of owned.mats) m.dispose();
    for (const t of owned.texs) t.dispose();
  };
  return { toon, ink, glow, part, tube, geo, mat, tex, dispose };
}

// ---- the hull, one side at a time, with a painted band by vertex colour ----
function hullSide(sign, L) {
  const ROWS = 44, COLS = 12, pos = [], col = [], idx = [];
  const zOf = r => STERN + LENGTH * (1 - Math.pow(1 - r / ROWS, 1.25));
  const c = new Color();
  for (let r = 0; r <= ROWS; r++) {
    for (let k = 0; k <= COLS; k++) {
      const z = zOf(r), a = k / COLS * Math.PI / 2, [x, y] = section(z, a);
      pos.push(sign * x, y, z);
      // the gunwale in brass, then the planks (or the hire band's stripes), the keel dark
      let hex;
      if (k === 0) hex = L.rail;
      else if (k >= COLS - 2) hex = L.keel;
      else if (L.band && k >= 2 && k <= 7) hex = L.band[k % 2];
      else hex = L.planks[k % 2];
      c.set(hex); col.push(c.r, c.g, c.b);
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let k = 0; k < COLS; k++) {
      const a = r * (COLS + 1) + k, b = a + 1, d = a + COLS + 1, e = d + 1;
      if (sign < 0) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// the deck: the hull's inside width at the deck's height, bow to stern
function deckGeometry() {
  const inner = z => {
    const r = rimY(z), d = r - keelY(z);
    if (r <= DECK_Y) return halfW(z);
    const q = Math.min(1, Math.pow((r - DECK_Y) / d, 1 / 0.75));
    return halfW(z) * Math.cos(Math.asin(q)) * 0.99;
  };
  const N = 40, zs = Array.from({ length: N + 1 }, (_, k) => STERN + 0.01 + (LENGTH - 0.25) * (k / N));
  const s = new Shape();
  zs.forEach((z, k) => (k ? s.lineTo(-inner(z), z) : s.moveTo(-inner(z), z)));
  for (const z of [...zs].reverse()) s.lineTo(inner(z), z);
  const g = new ShapeGeometry(s, 1);
  // the shape is drawn in (x, z); lay it flat at the deck's height
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, DECK_Y); p.setZ(i, y); }
  g.computeVertexNormals();
  return g;
}

// deck planks: one plank a texture width, a seam across it; repeated over the deck (its UVs are model units)
function planks(K, hex) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = hex; g.fillRect(0, 0, 16, 64);
  g.fillStyle = 'rgba(255,240,210,0.12)'; g.fillRect(2, 0, 6, 64);
  g.fillStyle = 'rgba(40,20,10,0.55)'; g.fillRect(0, 0, 1.5, 64); g.fillRect(0, 40, 16, 1.5);
  const t = K.tex(new CanvasTexture(c));
  t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(1 / 0.2, 1 / 1.3);
  return t;
}

// the stern's flat transom
function transomGeometry() {
  const s = new Shape(), N = 12;
  for (let i = 0; i <= N * 2; i++) {
    const a = i / (N * 2) * Math.PI, [x, y] = section(STERN, a < Math.PI / 2 ? a : Math.PI - a), sx = a < Math.PI / 2 ? -x : x;
    if (i) s.lineTo(sx, y); else s.moveTo(sx, y);
  }
  return new ShapeGeometry(s);
}

// a triangular wing sail with a patch, bellied by barycentric weight; returns its geometry and rest shape
function sailGeometry(a, b, c, L) {
  const K = 10, pos = [], col = [], idx = [], bary = [];
  const sail = new Color(L.sail), patch = new Color(L.patch), tmp = new Color();
  for (let i = 0; i <= K; i++) {
    for (let j = 0; j <= K - i; j++) {
      const u = i / K, v = j / K, w = 1 - u - v;
      pos.push(a.x * w + b.x * u + c.x * v, a.y * w + b.y * u + c.y * v, a.z * w + b.z * u + c.z * v);
      bary.push(w * u * v * 27);
      // two square patches, as on the paintings
      const inPatch = (u > 0.18 && u < 0.34 && v > 0.22 && v < 0.38) || (u > 0.46 && u < 0.6 && v > 0.08 && v < 0.2);
      tmp.copy(inPatch ? patch : sail); col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  const at = (i, j) => { let n = 0; for (let s = 0; s < i; s++) n += K - s + 1; return n + j; };
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K - i; j++) {
      idx.push(at(i, j), at(i + 1, j), at(i, j + 1));
      if (j < K - i - 1) idx.push(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const belly = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
  if (belly.y > 0) belly.negate();
  g.userData = { rest: Float32Array.from(pos), bary, belly };
  return g;
}

export function buildShip({ livery = 'first' } = {}) {
  const L = LIVERIES[livery] || LIVERIES.first;
  const K = makeKit();
  const root = new Group(); root.name = livery === 'rented' ? 'the rented skiff' : 'the skiff';
  const tilt = new Group(); tilt.name = 'tilt'; root.add(tilt);
  const model = new Group(); model.name = 'ship'; tilt.add(model);

  // hull
  const hull = new Group(); hull.name = 'hull'; model.add(hull);
  const hullMat = K.toon('#ffffff', { vertexColors: true, side: DoubleSide });
  for (const sign of [-1, 1]) K.part(hull, hullSide(sign, L), hullMat);
  K.part(hull, transomGeometry(), K.toon(L.wood, { side: DoubleSide }), { pos: [0, 0, STERN + 0.004], ink: false });
  K.part(hull, deckGeometry(), K.toon('#ffffff', { map: planks(K, L.deck), side: DoubleSide }), { ink: false });
  // rails and their posts along each gunwale
  for (const sign of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 16; k++) { const z = STERN + 0.1 + (LENGTH - 0.75) * (k / 16); pts.push([sign * halfW(z) * 0.96, rimY(z) + 0.17, z]); }
    K.part(hull, K.tube(pts, 0.026, 0.02, 32, 6), K.toon(L.rail));
    for (let k = 0; k <= 10; k++) {
      const z = STERN + 0.12 + (LENGTH - 0.8) * (k / 10);
      K.part(hull, new CylinderGeometry(0.016, 0.018, 0.18, 5), K.toon(L.rail), { pos: [sign * halfW(z) * 0.96, rimY(z) + 0.08, z], ink: false });
    }
  }
  // a brass bowsprit tip
  K.part(hull, new CylinderGeometry(0.0, 0.07, 0.5, 6), K.toon(L.brass), { pos: [0, rimY(BOW) + 0.02, BOW + 0.12], rot: [Math.PI / 2, 0, 0] });

  // the sunstone furnace and its four crystals
  const crystals = new Group(); crystals.name = 'crystals'; crystals.position.set(0, 0, 0.05); model.add(crystals);
  const furnace = [[0.001, DECK_Y], [0.3, DECK_Y], [0.33, 0], [0.33, 0.33], [0.31, 0.42], [0.26, 0.55], [0.17, 0.66], [0.12, 0.73], [0.11, 0.76], [0.11, 1.08], [0.001, 1.08]];
  K.part(crystals, new LatheGeometry(furnace.map(([x, y]) => new Vector2(x, y)), 14), K.toon(L.brass));
  K.part(crystals, new SphereGeometry(0.2, 10, 8), K.toon('#ff9a3a', { emissive: new Color('#ff7a1a'), emissiveIntensity: 0.8 }), { pos: [0, 0.3, 0.22], ink: false });
  const gemShape = [[0.001, -0.05], [0.6, 0], [0.8, 0.06], [0.96, 0.2], [1, 0.42], [1, 0.57], [0.72, 0.71], [0.36, 0.86], [0.001, 1]];
  const gemGeo = K.geo(new LatheGeometry(gemShape.map(([x, y]) => new Vector2(x, y)), 6).toNonIndexed());
  gemGeo.computeVertexNormals();
  const gemMat = K.toon('#ffb23a', { emissive: new Color('#ff8a1a'), emissiveIntensity: 0.75 });
  const cupShape = [[0.05, -0.1], [0.12, -0.04], [0.2, 0.02], [0.26, 0.1], [0.28, 0.16]];
  const cupGeo = new LatheGeometry(cupShape.map(([x, y]) => new Vector2(x, y)), 12);
  // [x, z, height, size]: four across the beam, the middle two larger (painting 16's top view)
  const GEMS = [[-1.05, -0.05, 1.12, 0.62], [-0.38, 0.05, 1.38, 0.95], [0.38, 0.05, 1.38, 0.95], [1.05, -0.05, 1.12, 0.62]];
  const gems = [];
  GEMS.forEach(([x, z, h, s], i) => {
    const w = 0.36 * s;
    K.part(crystals, K.tube([[0, 1.02, 0], [x * 0.35, 1 + (h - 1) * 0.2, z * 0.35], [x * 0.85, h - 0.35 * s, z * 0.85], [x, h - 0.18 * s, z]], 0.035, 0.028, 14, 6), K.toon(L.brass), { ink: false });
    K.part(crystals, cupGeo, K.toon(L.brass, { side: DoubleSide }), { pos: [x, h - 0.12 * s, z], scale: [w * 3.2, s, w * 3.2], ink: false });
    const gem = new Mesh(gemGeo, gemMat); gem.name = 'crystal-' + (i + 1);
    gem.position.set(x, h, z); gem.scale.set(w, s, w); gem.rotation.y = Math.PI / 6;
    const inkCopy = new Mesh(gemGeo, K.ink); inkCopy.name = 'ink'; gem.add(inkCopy);
    crystals.add(gem);
    const halo = K.glow('#ffc45a', 1.3 * s, 0.5); halo.position.set(x, h + 0.45 * s, z); crystals.add(halo);
    const heart = K.glow('#ffe39a', 0.5 * s, 0.9); heart.position.set(x, h + 0.4 * s, z); crystals.add(heart);
    gems.push({ gem, halo, heart, s, phase: i * 1.7 });
  });

  // two wing sails
  const sails = new Group(); sails.name = 'sails'; model.add(sails);
  const sailMat = K.toon('#ffffff', { vertexColors: true, side: DoubleSide });
  const sailGeos = [-1, 1].map(sign => {
    const a = new Vector3(sign * 1.3, 1.05, 1.05), b = new Vector3(sign * 1.3, 0.45, -0.85), c = new Vector3(sign * 2.6, 1.2, -0.3);
    const g = sailGeometry(a, b, c, L);
    K.part(sails, g, sailMat, { ink: false });
    // the mast, the boom and their knobs
    const lo = b.clone().add(new Vector3(0, -0.04, -0.2)), hi = a.clone().add(new Vector3(0, 0.05, 0.2));
    K.part(sails, K.tube([lo.toArray(), hi.toArray()], 0.045, 0.035, 4, 6), K.toon(L.wood));
    for (const p of [lo, hi]) K.part(sails, new SphereGeometry(0.06, 8, 6), K.toon(L.brass), { pos: p.toArray(), ink: false });
    K.part(sails, K.tube([b.toArray(), c.toArray()], 0.03, 0.022, 4, 5), K.toon(L.wood), { ink: false });
    K.part(sails, new SphereGeometry(0.045, 6, 5), K.toon(L.brass), { pos: c.toArray(), ink: false });
    // the sail's free edge, a dark rope from the mast head to the boom's end
    K.part(sails, K.tube([a.toArray(), c.toArray()], 0.018, 0.018, 4, 4), K.toon(L.wood), { ink: false });
    // struts from the gunwale out to the mast
    for (const z of [-0.6, 0.1, 0.8]) {
      const t = (z - b.z) / (a.z - b.z), y = b.y + (a.y - b.y) * t;
      K.part(sails, K.tube([[sign * halfW(z) * 0.95, rimY(z) + 0.05, z], [sign * 1.3, y, z]], 0.028, 0.028, 4, 5), K.toon(L.brass), { ink: false });
    }
    return g;
  });

  // fins at the stern quarters
  const finShape = new Shape(); finShape.moveTo(0, -0.35); finShape.lineTo(0.9, -0.2); finShape.lineTo(1.05, 0.15); finShape.lineTo(0, 0.35); finShape.lineTo(0, -0.35);
  for (const sign of [-1, 1]) {
    const pivot = new Group(); pivot.position.set(sign * (halfW(-1.5) - 0.08), -0.32, -1.5); pivot.rotation.z = -sign * 0.3; model.add(pivot);
    const fin = K.part(pivot, new ShapeGeometry(finShape), K.toon(L.fin, { side: DoubleSide }));
    fin.rotation.set(Math.PI / 2, 0, 0); fin.scale.x = sign;
  }

  // the rudder: a fish tail at the stern post
  const rudder = new Group(); rudder.name = 'rudder'; rudder.position.set(0, 0, STERN - 0.02); model.add(rudder);
  const tail = new Shape(); tail.moveTo(0, 0.25); tail.lineTo(-0.55, 0.3); tail.lineTo(-0.85, 0.05); tail.lineTo(-0.7, -0.3); tail.lineTo(-0.9, -0.62); tail.lineTo(-0.2, -0.45); tail.lineTo(0, -0.2); tail.lineTo(0, 0.25);
  const tailMesh = K.part(rudder, new ShapeGeometry(tail), K.toon(L.band ? L.band[0] : L.fin, { side: DoubleSide }));
  tailMesh.rotation.y = -Math.PI / 2; tailMesh.position.y = -0.1;

  // lanterns at the bow, the stern and the sail tips
  const lanterns = [];
  const lampAt = [[0, keelY(2.2) + 0.12, 2.2], [0, rimY(STERN) + 0.55, STERN - 0.12], [-1.3, 0.78, 1.2], [1.3, 0.78, 1.2]];
  for (const p of lampAt) {
    K.part(model, new CylinderGeometry(0.07, 0.06, 0.16, 6), K.toon('#ffcf7a', { emissive: new Color('#ffb45e'), emissiveIntensity: 0.6 }), { pos: p, ink: false });
    const g = K.glow('#ffb45e', 0.8, 0.55); g.position.set(...p); model.add(g); lanterns.push(g);
  }
  K.part(model, new CylinderGeometry(0.025, 0.03, 0.55, 5), K.toon(L.rail), { pos: [0, rimY(STERN) + 0.2, STERN - 0.12], ink: false });
  // the wheel on the stern deck
  const wheel = new Group(); wheel.name = 'wheel'; wheel.position.set(0, 0.95, -1.62); model.add(wheel);
  K.part(model, new CylinderGeometry(0.04, 0.06, 1, 6), K.toon(L.wood), { pos: [0, 0.45, -1.68], ink: false });
  K.part(wheel, new TorusGeometry(0.22, 0.024, 6, 18), K.toon(L.wood), { ink: false });
  for (let k = 0; k < 8; k++) K.part(wheel, new CylinderGeometry(0.011, 0.011, 0.56, 4), K.toon(L.rail), { rot: [0, 0, k / 8 * Math.PI * 2], ink: false });

  // the pennant: a striped streamer on a staff above the stern
  const pennant = new Group(); pennant.name = 'pennant'; pennant.position.set(0, rimY(STERN) + 0.45, STERN + 0.05); model.add(pennant);
  K.part(pennant, new CylinderGeometry(0.02, 0.025, 1.1, 5), K.toon(L.wood), { pos: [0, 0.55, 0], ink: false });
  const flagGeo = K.geo(new PlaneGeometry(0.9, 0.22, 9, 1));
  flagGeo.translate(0.45, 0, 0);
  {
    const p = flagGeo.attributes.position, col = [], a = new Color(L.pennant[0]), b = new Color(L.pennant[1]);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i); p.setY(i, p.getY(i) * (1 - x / 1.0));  // taper to a point
      const c = Math.floor(x / 0.18) % 2 ? b : a; col.push(c.r, c.g, c.b);
    }
    flagGeo.setAttribute('color', new Float32BufferAttribute(col, 3));
    flagGeo.userData.rest = Float32Array.from(p.array);
  }
  const flag = new Mesh(flagGeo, K.toon('#ffffff', { vertexColors: true, side: DoubleSide }));
  flag.position.set(0, 1.0, 0); flag.rotation.y = Math.PI / 2; pennant.add(flag);

  let t = 0;
  const update = (dt, { bank = 0, pitch = 0, turn = 0, speed = 0, glow = 1 } = {}) => {
    t += dt;
    tilt.rotation.set(-pitch, 0, bank);
    rudder.rotation.y = Math.max(-0.5, Math.min(0.5, -turn * 0.35));
    wheel.rotation.z = turn * 0.8;
    const fill = 0.1 + Math.min(1, speed / 150) * 0.22;
    for (const [i, g] of sailGeos.entries()) {
      const { rest, bary, belly } = g.userData, p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const d = bary[k] * (fill + Math.sin(t * 3 + k * 0.3 + i) * 0.015);
        p.setXYZ(k, rest[k * 3] + belly.x * d, rest[k * 3 + 1] + belly.y * d, rest[k * 3 + 2] + belly.z * d);
      }
      p.needsUpdate = true; g.computeVertexNormals();
    }
    {
      const p = flagGeo.attributes.position, rest = flagGeo.userData.rest;
      for (let k = 0; k < p.count; k++) {
        const x = rest[k * 3];
        p.setZ(k, rest[k * 3 + 2] + Math.sin(t * 6 - x * 7) * 0.08 * x);
      }
      p.needsUpdate = true;
    }
    // the crystals: a slow amber pulse (about 2 s), brighter while `glow` is up (take-off)
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI);
    gemMat.emissiveIntensity = (0.6 + 0.35 * pulse) * glow;
    for (const g of gems) {
      const f = 0.85 + Math.sin(t * 2.4 + g.phase) * 0.15;
      g.gem.rotation.y += dt * 0.3;
      g.halo.material.opacity = Math.min(1, 0.42 * f * glow);
      g.halo.scale.setScalar(1.3 * g.s * f * (0.8 + 0.2 * glow));
      g.heart.material.opacity = Math.min(1, (0.75 + Math.sin(t * 3.1 + g.phase) * 0.2) * Math.min(1.2, glow));
    }
    for (const [i, l] of lanterns.entries()) l.material.opacity = 0.55 + Math.sin(t * 7 + i * 2) * 0.06;
  };

  return {
    root, tilt, model, length: LENGTH, ink: K.ink,
    parts: { hull, sails, crystals, rudder, pennant },
    crystalCount: gems.length,
    update,
    dispose() { root.removeFromParent(); K.dispose(); },
  };
}
