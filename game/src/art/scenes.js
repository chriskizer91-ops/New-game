// Battle backdrops: painted pixel layers in the prototype's dithered, moody palette.
//
// backdropLayers(key, { w=160, h=96, margin=0 }) -> { layers: [{ id, img, parallax }], horizon, floor: [top, bottom] }
//   Layers are ImageData (w + 2*margin wide), back to front: sky, far, mid, ground. Everything but the sky
//   is transparent where empty, so the UI can scroll them at different speeds (parallax) for a pan.
// renderBackdrop(key, { w=160, h=96, t=0, reduced }) -> ImageData: all layers composited, plus the
//   animated bits for time t (flickering hearth/torch light, pulsing fungi, ambient particles).
// ambient(key, t, { w, h }) -> [{ x, y, c:[r,g,b], a }] particles only (for drawing over sprites).
// BACKDROPS[key] = { name, horizon, floor } (horizon/floor as fractions of h).
// Dark maps (M3): every function also takes { dark: true }, or a key ending in ':dark'. The scene falls to near
// black except around its remaining lights. 'mosswatch:dark' and 'heartroot:dark' are listed in BACKDROPS, so a
// battle ctx can carry them as its backdrop; darkBackdrop(key) gives the listed dark key for a base key.
// M4 adds the nine Sunscorch places; 'deep-shaft:dark' and 'scorchgate-vaults:dark' are their dark listings (the
// lamps and braziers go out; the sunstone veins and the embers in the vault floor stay lit).
import { hx, ramp, bayer, hash, vnoise, mix } from './forge.js';
import { lru } from './cache.js';

export const BACKDROPS = Object.freeze({
  'hearth-road': { name: 'The Hearth Road', horizon: .58, floor: [.66, 1], fx: 'ember' },
  'verdant-wood': { name: 'Eldergrove, under the canopy', horizon: .56, floor: [.64, 1], fx: 'spore' },
  thornhollow: { name: 'Thornhollow Outpost', horizon: .6, floor: [.68, 1], fx: 'leaf' },
  'briarmaw-den': { name: "Briarmaw's Den", horizon: .56, floor: [.64, 1], fx: 'blight' },
  // M3: the Verdant Wilds
  mossfall: { name: 'Mossfall', horizon: .56, floor: [.64, 1], fx: 'mire' },
  mosswatch: { name: 'Mosswatch Tower', horizon: .6, floor: [.68, 1], fx: 'dust' },
  fawnrest: { name: 'Fawnrest Shrine', horizon: .58, floor: [.66, 1], fx: 'petal' },
  eldergrove: { name: 'Eldergrove, at the Eldest Tree', horizon: .58, floor: [.66, 1], fx: 'firefly' },
  heartroot: { name: 'The Heartroot', horizon: .56, floor: [.64, 1], fx: 'blight' },
  'mosswatch:dark': { name: 'The Lamp Room', horizon: .6, floor: [.68, 1], fx: 'dust', dark: true },
  'heartroot:dark': { name: 'The Heart Chamber', horizon: .56, floor: [.64, 1], fx: 'blight', dark: true },
  // M4: the Sunscorch Wastes
  'sun-road': { name: 'The Sunward Road', horizon: .58, floor: [.66, 1], fx: 'sand' },
  sandspire: { name: 'Sandspire', horizon: .6, floor: [.68, 1], fx: 'ember' },
  'dust-trail': { name: 'The Dust Trail', horizon: .58, floor: [.66, 1], fx: 'sand' },
  'deep-shaft': { name: 'The Deep Shaft', horizon: .56, floor: [.64, 1], fx: 'grit' },
  'glass-heart': { name: 'The Glass Heart', horizon: .56, floor: [.64, 1], fx: 'glint' },
  'glass-flats': { name: 'The Glass Flats', horizon: .56, floor: [.64, 1], fx: 'glint' },
  miragewell: { name: 'Miragewell', horizon: .58, floor: [.66, 1], fx: 'mirage' },
  scorchgate: { name: 'Scorchgate Ruins', horizon: .58, floor: [.66, 1], fx: 'ash' },
  'scorchgate-vaults': { name: 'The Scorchgate Vaults', horizon: .56, floor: [.64, 1], fx: 'ash' },
  'deep-shaft:dark': { name: 'The Deep Shaft, below the lamp', horizon: .56, floor: [.64, 1], fx: 'grit', dark: true },
  'scorchgate-vaults:dark': { name: 'The Hall of the Watch', horizon: .56, floor: [.64, 1], fx: 'ash', dark: true },
});
export const BACKDROP_KEYS = Object.keys(BACKDROPS);
// the listed dark variant of a backdrop key ('mosswatch' -> 'mosswatch:dark'), or the key itself when none is listed
export const darkBackdrop = key => (BACKDROPS[key + ':dark'] ? key + ':dark' : key);
// resolve a key (and an optional dark flag) to the painter, the geometry and the listing
function spec(key, dark) {
  let id = String(key ?? ''), dk = !!dark;
  if (id.endsWith(':dark')) { id = id.slice(0, -5); dk = true; }
  const base = BACKDROPS[id] ? id : 'hearth-road', B = (dk && BACKDROPS[base + ':dark']) || BACKDROPS[base];
  return { base, dark: dk, B, geo: BACKDROPS[base] };
}

/* ---------- a tiny pixel painter ---------- */
function layer(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  const L = {
    w, h, d,
    set(x, y, c, a = 1) {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      const i = (y * w + x) * 4, ia = d[i + 3] / 255;
      if (a >= 1 || ia === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.max(d[i + 3], a * 255); if (ia === 0 && a < 1) d[i + 3] = a * 255; return; }
      d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a; d[i + 3] = Math.max(d[i + 3], a * 255);
    },
    rect(x, y, rw, rh, c, a = 1) { for (let yy = Math.round(y); yy < Math.round(y + rh); yy++) for (let xx = Math.round(x); xx < Math.round(x + rw); xx++) L.set(xx, yy, c, a); },
    line(x0, y0, x1, y1, c, a = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1; for (let i = 0; i <= n; i++) L.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c, a); },
    thick(x0, y0, x1, y1, r0, r1, c, a = 1) { // tapered stroke
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 | 0 || 1;
      for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, r = r0 + (r1 - r0) * u; L.disc(x, y, r, c, a); }
    },
    disc(cx, cy, r, c, a = 1) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) L.set(x, y, c, a); },
    poly(pts, c, a = 1) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + .5, py = y + .5; let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; }
        if (ins) L.set(x, y, c, typeof a === 'function' ? a(x, y) : a);
      }
    },
    // soft dithered glow
    glow(cx, cy, r, c, a) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dd = Math.hypot(x + .5 - cx, y + .5 - cy) / r; if (dd >= 1) continue; const v = a * (1 - dd) * (1 - dd); if (v + bayer(x, y) * .12 > .04) L.set(x, y, c, Math.min(1, v)); } },
    img() { return new ImageData(d, w, h); },
  };
  return L;
}
const skyFill = (L, cols, y0, y1, dither = .95) => { const c = cols.map(hx); for (let y = y0; y < y1; y++) for (let x = 0; x < L.w; x++) { const l = Math.round((y - y0) / Math.max(1, y1 - y0 - 1) * (c.length - 1) + bayer(x, y) * dither); L.set(x, y, c[Math.max(0, Math.min(c.length - 1, l))]); } };
// silhouette whose top is yTop(x), filled to yBase; the top pixel gets a rim tint
function ridge(L, yTop, yBase, col, rim, rimA = .6) { const c = hx(col), r = rim ? hx(rim) : null; for (let x = 0; x < L.w; x++) { const t = Math.round(yTop(x)); for (let y = t; y < yBase; y++) L.set(x, y, c); if (r) L.set(x, t, r, rimA); } }
// branching dead tree / thorn branch
function branch(L, x0, y0, ang, len, w, depth, col, seed, thorns) {
  const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
  L.thick(x0, y0, x1, y1, w, Math.max(.5, w * .6), col);
  if (thorns) for (let k = 1; k < 4; k++) { const u = k / 4, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, s = hash(k, depth, seed) < .5 ? -1 : 1, a = ang + s * 1.2; L.line(x, y, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, col); }
  if (depth <= 0) return;
  branch(L, x1, y1, ang - .45 - hash(depth, seed, 1) * .35, len * .68, w * .62, depth - 1, col, seed + 3, thorns);
  branch(L, x1, y1, ang + .4 + hash(depth, seed, 2) * .35, len * .6, w * .58, depth - 1, col, seed + 7, thorns);
}

// a tapered root along a polyline: bark striations, a lit upper edge, and an optional rim light on one side
// (rimSide +1 lights the right edge, -1 the left) in the colour of whatever glows beside it
function barkRoot(L, pts, r0, r1, c, lite, rim, rimSide, rimA = .55) {
  const n = pts.length - 1, rad = k => r0 + (r1 - r0) * k / n, dark = mix(c, [0, 0, 0], .5);
  for (let k = 0; k < n; k++) L.thick(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], rad(k), rad(k + 1), c);
  for (let k = 0; k < n; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, r = rad(k);
    for (const f of [-.35, .3]) L.line(ax + nx * r * f, ay + ny * r * f, bx + nx * r * f, by + ny * r * f, dark, .55);
    const up = ny < 0 ? 1 : -1; L.line(ax + nx * r * .75 * up, ay + ny * r * .75 * up, bx + nx * r * .75 * up, by + ny * r * .75 * up, lite, .75);
    if (rim) { const sd = Math.sign(nx) === rimSide ? 1 : -1; L.line(ax + nx * r * .85 * sd, ay + ny * r * .85 * sd, bx + nx * r * .85 * sd, by + ny * r * .85 * sd, rim, rimA); }
  }
}

/* ---------- M4: helpers for the Sunscorch ---------- */
const clampI = (l, n) => Math.max(0, Math.min(n, l));
// dunes, back to front: each [cx, top, wl, wr, sk] rises to a crest at (cx, top): a long windward slope on the left,
// rounded at the top and flaring into the ground, lit by the sun; a steep slip-face on the right in shadow; the brink
// between them curves down and to the right (sk). cols: [slip-face, its foot, lit slope, lit brink]; rim lights the
// sunlit skyline
function dunes(L, list, yBase, cols, rim) {
  const C = cols.map(hx), R = rim && hx(rim);
  for (const [cx, top, wl, wr, sk] of list) {
    const hd = yBase - top, brink = y => cx + (y - top) * sk * (1 + (y - top) / hd);
    for (let x = Math.floor(cx - wl); x <= cx + wr; x++) {
      const s = x < cx ? (cx - x) / wl : (x - cx) / wr, t = Math.ceil(top + hd * (x < cx ? s * s * (3 - 2 * s) : Math.min(1, s ** .85)));
      for (let y = t; y < yBase; y++) { const e = x + .5 - brink(y), d = (y - t) / hd + bayer(x, y) * .3; L.set(x, y, C[e < 0 ? (e > -1.5 - d * 6 ? 3 : 2) : d > .45 ? 1 : 0]); }
      if (R && x + .5 < brink(t)) L.set(x, t, R, .75);
    }
  }
}
// sand from gy down: lighter toward the viewer, drifted with noise, and wind ripples that crowd toward the horizon
function sandFloor(L, gy, cols, rip, seed) {
  const G = cols.map(hx), R = hx(rip), n = G.length - 1, H = L.h;
  for (let y = gy; y < H; y++) for (let x = 0; x < L.w; x++) L.set(x, y, G[clampI(Math.round((y - gy) / (H - gy) * n + bayer(x, y) * .9 - .45 + (vnoise(x * .05, y * .12, seed) - .5) * 1.2), n)]);
  for (let k = 0; k < 18; k++) { const u = (k + hash(k, 1, seed) * .6) / 18, y0 = gy + 1 + u * u * (H - gy), f = .3 - u * .18; for (let x = 0; x < L.w; x++) if (vnoise(x * .07, k * 3, seed + 1) > .4) L.set(x, y0 + Math.sin(x * f + k * 1.7) * (.5 + u * 1.5), R, .25 + u * .35); }
}
// a canyon wall or rock face on one side of edge(y) (side -1 fills to the left, +1 to the right), in strata that
// wander with noise; rim lights the edge
function rockWall(L, edge, side, y0, y1, cols, rim, seed) {
  const C = cols.map(hx), n = C.length - 1, R = rim && hx(rim);
  for (let y = y0; y < y1; y++) {
    const e = edge(y);
    for (let x = side < 0 ? 0 : Math.ceil(e); side < 0 ? x < e : x < L.w; x++) { const b = Math.sin((y + vnoise(x * .05, y * .02, seed) * 8) * .55) + vnoise(x * .2, y * .25, seed + 1) - .5; L.set(x, y, C[clampI(Math.round(n * .5 + b * n * .38 + bayer(x, y) * .6 - .3), n)]); }
    if (R) L.set(side < 0 ? e - 1 : Math.ceil(e), y, R, .7);
  }
}
// a glass shard rising from (x, y) to its tip, h tall, w half-wide at the root, leaning: a lit face, a shadowed
// face and a bright edge between them (cols: [shadow, lit])
function shard(L, x, y, h, w, lean, cols, edge) {
  const tx = x + lean * h, ty = y - h, mx = x + w * .2;
  L.poly([[x - w, y], [tx - .3, ty], [mx, y]], hx(cols[1])); L.poly([[mx, y], [tx + .3, ty], [x + w, y]], hx(cols[0])); L.line(mx, y - 1, tx, ty, hx(edge), .8);
}
// a standing glass column with a pointed top: a lit face, a shadowed face, its edges caught by the light
function prism(L, x, y, h, w, cols, edge) {
  const C = cols.map(hx), E = hx(edge), m = x - w * .15, sh = y - h + w * 1.3;
  L.poly([[x - w, y], [x - w, sh], [m, y - h], [m, y]], C[1]); L.poly([[m, y], [m, y - h], [x + w, sh], [x + w, y]], C[0]);
  L.line(m, y - 1, m, y - h, E, .75); L.line(x - w, sh, m, y - h, E, .55);
}
// a date palm: a curved, ringed trunk from (x, y), h tall, then fronds arching out from the crown and drooping
function palm(L, x, y, h, lean, trunk, frond, seed) {
  const T = hx(trunk), TD = mix(T, [0, 0, 0], .45), F = hx(frond); let px = x, py = y;
  for (let k = 1; k <= 12; k++) { const u = k / 12, qx = x + lean * h * u * u, qy = y - h * u, r = 1.6 - u * .7; L.thick(px, py, qx, qy, r, r, T); if (k % 2) L.line(qx - r, qy + .5, qx + r, qy - .5, TD); px = qx; py = qy; }
  for (let f = 0; f < 9; f++) {
    const a = -Math.PI / 2 + (f - 4) * .36 + (hash(f, seed, 1) - .5) * .2, len = h * (.36 + hash(f, seed, 2) * .14), sd = Math.cos(a) < 0 ? -1 : 1;
    let ax = px, ay = py;
    for (let j = 1; j <= 9; j++) { const v = j / 9, bx = px + Math.cos(a) * len * v * 1.2, by = py + Math.sin(a) * len * v + v * v * len * .8; L.line(ax, ay, bx, by, F); if (j > 1 && j < 9) L.line(bx, by, bx + sd * .6, by + 2.4 - v * 1.4, F, .8); ax = bx; ay = by; }
  }
}
// coursed blocks over a rect: shade(x, y) picks each block's step (with a per-block jitter; null leaves the pixel
// empty, for a broken top), mortar lines between
function masonry(L, x0, y0, x1, y1, cols, mortar, bw, bh, seed, shade) {
  const C = cols.map(hx), M = hx(mortar), n = C.length - 1;
  for (let y = Math.floor(y0); y < y1; y++) {
    const row = Math.floor((y - y0) / bh), yo = (y - Math.floor(y0)) % bh;
    for (let x = Math.floor(x0); x < x1; x++) { const s = shade(x, y); if (s === null) continue; const xs = x + row * (bw >> 1) + 64, bi = Math.floor(xs / bw), l = clampI(Math.round(s + (hash(row, bi, seed) - .5) * .9 + bayer(x, y) * .5 - .25), n); L.set(x, y, yo === bh - 1 || xs % bw === 0 ? M : C[yo === 0 ? Math.min(n, l + 1) : l]); }
  }
}
// a fire-bowl with its rim at (x, y), w half-wide. fire 'lit' throws a flame and a glow (out: the flame goes out in
// the dark); 'sand' is choked with drifted sand, anything else holds cold ash
function fireBowl(L, x, y, w, lights, fire, out) {
  L.poly([[x - w, y], [x + w, y], [x + w * .55, y + w * .7], [x - w * .55, y + w * .7]], hx('#2a1c16')); L.line(x - w, y, x + w, y, hx('#6e5444'));
  if (fire !== 'lit') { for (let k = 1 - w; k < w; k++) L.set(x + k, y - (Math.abs(k) < w - 1.5 ? 1 : 0), hx(fire === 'sand' ? '#b08858' : '#56504c')); return; }
  L.rect(x - w + 1, y - 1, 2 * w - 1, 1, hx('#ffb04a'));
  lights.push({ x: x + .2, y: y - 2, r: 8 + w * 2, c: '#ffb04a', a: .5, torch: 1, flick: 3 + x * .01, out }, { x: x - w * .5, y: y - 1.5, r: 2, c: '#ff9a3a', a: .08, torch: 1, flick: 2.1, out }, { x: x + w * .5, y: y - 1.5, r: 2, c: '#ff9a3a', a: .08, torch: 1, flick: 3.7, out });
}
// mine rails from the near edge (centre x0, half-gauge g0 at the bottom) toward their vanishing point (vx, vy), drawn
// from y1 down: sleepers crowding into the distance, then two rails with a lit top
function rails(L, x0, g0, vx, vy, y1, cols) {
  const [SL, RD, RL] = cols.map(hx), H = L.h, at = y => { const s = (y - vy) / (H - vy); return [vx + (x0 - vx) * s, g0 * s, s]; };
  for (let k = 0; k < 40; k++) { const s = 1 / (1 + k * .25), y = vy + (H + 1 - vy) * s; if (y < y1) break; const [cx, g] = at(y); L.rect(cx - g * 1.5, y - Math.max(1, 1.8 * s), g * 3, Math.max(1, 1.8 * s), SL); }
  for (const sd of [-1, 1]) for (let y = Math.ceil(y1); y < H; y++) { const [a, g, s] = at(y), [b, g2] = at(y + 1); L.line(a + sd * g, y, b + sd * g2, y + 1, RD); if (s > .35) L.line(a + sd * g - sd * .6, y, b + sd * g2 - sd * .6, y + 1, RL, .9); }
}
// paving running away to a vanishing point vy above the horizon: courses crowding toward it, staggered joints;
// shade(x, y) gives each stone's step before a per-stone jitter
function paving(L, gy, vy, cols, mortar, tw, rows, seed, shade) {
  const C = cols.map(hx), M = hx(mortar), n = C.length - 1, H = L.h, vx = L.w / 2;
  for (let y = gy; y < H; y++) {
    const z = (H - vy) / (y - vy), r = z * rows, row = Math.floor(r);
    for (let x = 0; x < L.w; x++) { const X = (x + .5 - vx) * z / tw + row * .5, col = Math.floor(X); L.set(x, y, r - row < .14 || X - col < .07 * z ? M : C[clampI(Math.round(shade(x, y) + (hash(col, row, seed) - .5) * .9 + bayer(x, y) * .6 - .3), n)]); }
  }
}
const stars = (L, n, y1, seed) => { const D = hx('#a8b4d8'), B = hx('#fff4dc'); for (let k = 0; k < n; k++) { const x = hash(k, 1, seed) * L.w, y = hash(k, 2, seed) * y1, b = hash(k, 3, seed); L.set(x, y, b > .8 ? B : D, .35 + b * .65); if (b > .94) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.set(x + dx, y + dy, D, .4); } };

/* ---------- the four places ---------- */
const PAINT = {
  'hearth-road'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const S = ramp('#140c12 #2a1418 #4e2020 #86381e #c8662a #e89a48');
    skyFill(sky, ['#140c12', '#2a1418', '#4e2020', '#86381e', '#c8662a', '#e89a48'], 0, gy + 2);
    sky.glow(W * .3, gy - 2, 34, hx('#ffcf7a'), .35);
    for (let k = 0; k < 4; k++) { const cy = 8 + k * 7 + hash(k, 1, 3) * 4, cx = hash(k, 2, 3) * W, len = 30 + hash(k, 3, 3) * 40; for (let x = cx - len / 2; x < cx + len / 2; x++) { const th = 1 + Math.round(Math.sin((x - cx + len / 2) / len * Math.PI) * 2); for (let y = 0; y < th; y++) sky.set(x, cy + y, S[1], .55 + ((x + y) & 1) * .2); sky.set(x, cy + th, S[3], .35); } }
    // far hills and the Keep
    ridge(far, x => gy - 7 - vnoise(x * .045, 0, 7) * 11 - vnoise(x * .16, 1, 3) * 3, gy + 2, '#2c1616', '#a8502a', .55);
    const kx = Math.round(W * .74), base = gy - 12, K = hx('#1a0c0e'), win = hx('#ffb04a');
    far.poly([[kx - 26, gy], [kx - 10, base + 2], [kx + 14, base], [kx + 30, gy]], K);
    far.rect(kx - 12, base - 18, 26, 18, K); far.rect(kx - 16, base - 27, 7, 27, K); far.rect(kx + 11, base - 24, 6, 24, K); far.rect(kx - 3, base - 34, 8, 34, K);
    for (let k = 0; k < 4; k++) { far.set(kx - 16 + k * 2, base - 28, K); far.set(kx + 11 + k * 2 - 1, base - 25, K); far.set(kx - 12 + k * 3, base - 19, K); }
    for (let k = 0; k < 5; k++) far.line(kx - 3 + k, base - 34, kx + 1, base - 41, K);
    for (const [x, y, a] of [[kx - 13, base - 20, .8], [kx + 13, base - 16, .8], [kx + 4, base - 10, .7], [kx - 6, base - 8, .6]]) far.set(x, y, win, a);
    lights.push({ x: kx + .5, y: base - 30, r: 9, c: '#ffb04a', a: .5, core: [[kx, base - 30], [kx + 1, base - 30], [kx, base - 29], [kx + 1, base - 29]], flick: 1.6 });
    // mid: dead tree, signpost, fence
    const M = hx('#120809');
    branch(mid, W * .08, gy + 6, -Math.PI / 2 - .12, 17, 2.2, 3, M, 5);
    mid.thick(W * .08, gy + 7, W * .08 - 3, gy + 10, 2.2, 1.2, M);
    const sx = W * .24; mid.rect(sx, gy - 10, 1.5, 18, M); mid.poly([[sx - 7, gy - 9], [sx + 1, gy - 10], [sx + 1, gy - 6.5], [sx - 7, gy - 5.5], [sx - 9, gy - 7.2]], M); mid.poly([[sx + 1, gy - 4.5], [sx + 8, gy - 5], [sx + 10, gy - 3.4], [sx + 8, gy - 1.8], [sx + 1, gy - 1.4]], M);
    for (let k = 0; k < 7; k++) { const x = W * .52 + k * 9 + hash(k, 1, 9) * 3, y = gy + 3 + k * .5; mid.rect(x, y - 6, 1.5, 7, M); if (k < 6) mid.line(x + 1, y - 4, x + 9, y - 3.6, M); }
    for (let x = 0; x < W; x++) if (hash(x, 4, 4) < .35) { const hgt = 2 + hash(x, 5, 4) * 4; mid.line(x, gy + 3, x + (hash(x, 6, 4) < .3 ? 1 : 0), gy + 3 - hgt, M); }
    // ground and the road
    const G = ['#1e130e', '#2a1a12', '#362216'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    const road = y => { const u = (y - gy) / (H - gy); return [W * (.66 - .24 * u * u) - (3 + u * W * .3), W * (.66 - .24 * u * u) + (3 + u * W * .3)]; };
    const R = ['#3a2618', '#4a3020', '#5a3c26'].map(hx);
    for (let y = gy; y < H; y++) { const [a, b] = road(y); for (let x = Math.floor(a); x <= b; x++) { const u = (x - a) / (b - a), rut = Math.abs(u - .3) < .04 || Math.abs(u - .7) < .04; const l = rut ? 0 : Math.round(1 + (y - gy) / (H - gy) + bayer(x, y) * .8 - (u < .08 || u > .92 ? 1 : 0)); gnd.set(x, y, R[Math.max(0, Math.min(2, l))]); } }
    for (let k = 0; k < 40; k++) { const x = hash(k, 1, 12) * W, y = gy + 2 + hash(k, 2, 12) * (H - gy - 2); const [a, b] = road(y); if (x > a - 1 && x < b + 1) continue; gnd.line(x, y, x + (hash(k, 3, 12) < .5 ? -1 : 1), y - 2 - hash(k, 4, 12) * 2, hx('#4a3418'), .8); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'ember' };
  },
  'verdant-wood'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#030806', '#06100b', '#0a1812', '#0f2219', '#152c20'], 0, gy + 2);
    for (let k = 0; k < 3; k++) { const x0 = W * (.25 + k * .27), wd = 6 + k * 2; for (let y = 0; y < gy; y++) for (let x = 0; x < wd; x++) { const X = x0 + x + y * .35; if (((X + y) & 1) && hash(X | 0, y, 5) < .5) sky.set(X, y, hx('#4a7a52'), .12 * (1 - y / gy)); } }
    // giant trunks with a home carved into one: bark ridges, a lit left edge, root flares
    const T1 = '#10201a', rim = hx('#2e4a34');
    const trunk = (L, x, w, col, rimc, seed) => {
      const c = hx(col), dk = mix(c, [0, 0, 0], .45), lt = mix(c, [120, 160, 110], .12);
      for (let y = 0; y < gy + 5; y++) {
        const flare = y > gy - 14 ? ((y - gy + 14) / 14) ** 2 * w * .7 : 0, wob = Math.sin(y * .11 + seed) * 1.4, x0 = x - w / 2 - flare + wob, x1 = x + w / 2 + flare + wob;
        const fade = Math.min(1, y / 16);
        for (let xx = Math.floor(x0); xx < x1; xx++) { const u = (xx - x0) / (x1 - x0), ridge = Math.abs(Math.sin((xx - wob) * .9 + vnoise(xx * .2, y * .08, seed) * 3)) < .25; L.set(xx, y, ridge ? dk : u < .22 ? lt : c, fade); }
        if (rimc) L.set(x0, y, rimc, .8 * fade);
      }
    };
    trunk(far, W * .2, 16, T1, rim, 1); trunk(far, W * .5, 22, T1, rim, 2); trunk(far, W * .82, 18, T1, rim, 3);
    // a fringe of leaves under the canopy
    for (let x = 0; x < W; x++) { const d = 2 + vnoise(x * .15, 0, 9) * 6; for (let y = 0; y < d; y++) far.set(x, y, hx('#081410')); if (hash(x, 1, 9) < .25) far.set(x, d, hx('#1a3a22'), .8); }
    const dx = W * .5, dy = gy - 3; far.poly([[dx - 4.5, dy], [dx - 4.5, dy - 7], [dx - 2.5, dy - 10], [dx + 2.5, dy - 10], [dx + 4.5, dy - 7], [dx + 4.5, dy]], hx('#1c1208'));
    far.rect(dx - 3.5, dy - 8, 7, 8, hx('#3a2412')); far.set(dx + 2, dy - 4, hx('#ffb04a'));
    far.rect(dx + 7, dy - 14, 3, 3, hx('#ffb04a'), .9); lights.push({ x: dx + 8.5, y: dy - 12.5, r: 6, c: '#ffb04a', a: .35, flick: 2.3 });
    for (let k = 0; k < 9; k++) { const x = hash(k, 1, 21) * W, len = 8 + hash(k, 2, 21) * 18; far.line(x, 0, x + Math.sin(k) * 2, len, hx('#12281a')); far.set(x + Math.sin(k) * 2, len + 1, hx('#2a5a2e')); }
    // near trunks framing the scene, with torches
    trunk(mid, -2, 18, '#060d09', hx('#1a2e20'), 4); trunk(mid, W + 3, 20, '#060d09', null, 5);
    for (const [x, y] of [[W * .06 + 6, gy - 16], [W * .94 - 7, gy - 18]]) {
      mid.rect(x - .5, y, 1.5, 6, hx('#2a1a10')); mid.set(x - 1, y - 1, hx('#3a2412')); mid.set(x + 1, y - 1, hx('#3a2412'));
      lights.push({ x: x + .2, y: y - 3, r: 13, c: '#ff9a3a', a: .45, torch: 1, flick: 3.1 + x * .01 });
    }
    // floor, winding path, fungi
    const G = ['#07120c', '#0b1a12', '#102419'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); if (vnoise(x * .2, y * .5, 4) > .74 && ((x + y) & 1)) gnd.set(x, y, hx('#16301a'), .7); }
    for (let k = 0; k < 4; k++) { const y0 = gy + 3 + k * 7, x0 = hash(k, 1, 33) * W; for (let x = 0; x < 26; x++) gnd.set(x0 + x, y0 + Math.sin(x * .3 + k) * 1.2, hx('#1c140c'), .9); }
    const pathX = y => { const u = (y - gy) / (H - gy); return W * .5 + Math.sin(u * 3.2 + .6) * W * .16 * (1 - u * .3); }, pathW = y => 2 + (y - gy) / (H - gy) * W * .16;
    const P = ['#1a2216', '#222c1c', '#2c3622'].map(hx);
    for (let y = gy; y < H; y++) { const c = pathX(y), hw = pathW(y); for (let x = Math.floor(c - hw); x <= c + hw; x++) { const e = Math.abs(x - c) / hw; gnd.set(x, y, P[Math.max(0, Math.min(2, Math.round(2 - e * 2 + bayer(x, y) * .8)))]); } }
    const fungi = [];
    for (let k = 0; k < 16; k++) { const y = gy + 3 + hash(k, 1, 31) * (H - gy - 6), side = k & 1 ? 1 : -1, x = pathX(y) + side * (pathW(y) + 2 + hash(k, 2, 31) * 4); fungi.push([x, y, 1 + (hash(k, 3, 31) < .4 ? 1 : 0)]); }
    for (const [x, y, s] of fungi) { gnd.set(x, y + 1, hx('#1c3a34')); gnd.rect(x - s, y - s, s * 2 + 1, s, hx('#5ae8d0')); gnd.set(x - s, y - s, hx('#c8fff4')); lights.push({ x: x + .5, y: y - s * .5, r: 4 + s * 2, c: '#5ae8d0', a: .28, pulse: 1, flick: .8 + (x % 3) * .3 }); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'spore' };
  },
  thornhollow(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0c1216', '#141e24', '#1e2c30', '#2e3e3c', '#465448', '#626a52'], 0, gy);
    sky.glow(W * .62, gy - 18, 30, hx('#a8b078'), .18);
    // conifer treeline
    const FC = hx('#101a16'), FR = hx('#2e443a');
    for (let x = 0; x < W; x += 1) { const tree = hash(Math.floor(x / 7), 1, 41), cx = Math.floor(x / 7) * 7 + 3.5, hgt = 14 + tree * 12, top = gy - 22 - hgt * .5; const slope = Math.abs(x - cx) * 1.9; const t = Math.round(top + slope); for (let y = t; y < gy; y++) far.set(x, y, FC); far.set(x, t, FR, .6); }
    // the woven thorn wall
    const wallTop = x => gy - 22 - Math.sin(x * .09) * 1.5 - hash(Math.floor(x / 5), 2, 7) * 3;
    const WB = hx('#1a130d'), WS = hx('#342618'), WR = hx('#4e3a24'), TH = hx('#7a6242');
    for (let x = 0; x < W; x++) { const t = Math.round(wallTop(x)); for (let y = t; y < gy + 2; y++) mid.set(x, y, WB); }
    for (let k = 0; k < W / 5 + 2; k++) { const x = k * 5 + hash(k, 3, 7) * 2 - 2, t = wallTop(x) - 3 - hash(k, 4, 7) * 4; mid.thick(x, gy + 2, x + (hash(k, 5, 7) - .5) * 3, t, 1.6, 1, WS); mid.set(x - 1, t + 2, WR); mid.line(x + .5, t, x + .5, t - 2, TH); }
    for (let r = 0; r < 3; r++) { const yb = gy - 6 - r * 6; for (let x = 0; x < W; x++) { const y = yb + Math.sin(x * .32 + r * 1.7) * 1.6; mid.set(x, y, WR); mid.set(x, y + 1, WS); if (hash(x, r, 9) < .08) { const s = hash(x, r, 10) < .5 ? -1 : 1; mid.line(x, y, x + s * 2, y - 2, TH); } } }
    // gate with lantern, watch platform, bounty board
    const gx = Math.round(W * .66);
    mid.rect(gx - 9, gy - 30, 3, 32, hx('#241a12')); mid.rect(gx + 7, gy - 30, 3, 32, hx('#241a12')); mid.rect(gx - 10, gy - 31, 21, 2.5, hx('#2e2216'));
    mid.rect(gx - 6, gy - 20, 13, 22, hx('#0a0806'));
    mid.line(gx + 1, gy - 28.5, gx + 1, gy - 25, hx('#3a3a3a')); mid.rect(gx, gy - 25, 3, 3, hx('#2a2018')); mid.set(gx + 1, gy - 24, hx('#ffd27a'));
    lights.push({ x: gx + 1.5, y: gy - 23.5, r: 12, c: '#ffb04a', a: .45, flick: 2.7 });
    const bx = gx + 16; mid.rect(bx, gy - 13, 1.5, 15, hx('#241a12')); mid.rect(bx - 5, gy - 16, 12, 8, hx('#3a2a18')); for (const [x, y] of [[bx - 4, gy - 15], [bx + 1, gy - 14], [bx - 2, gy - 12]]) mid.rect(x, y, 3, 3, hx('#b8a47a'));
    const tx = Math.round(W * .16); mid.rect(tx - 7, gy - 38, 2, 40, hx('#241a12')); mid.rect(tx + 6, gy - 38, 2, 40, hx('#241a12')); mid.rect(tx - 9, gy - 39, 19, 3, hx('#2e2216')); mid.line(tx - 7, gy - 30, tx + 7, gy - 22, hx('#241a12')); mid.line(tx + 7, gy - 30, tx - 7, gy - 22, hx('#241a12'));
    mid.line(tx + 8, gy - 39, tx + 8, gy - 47, hx('#241a12')); mid.poly([[tx + 8.5, gy - 47], [tx + 15, gy - 45.5], [tx + 8.5, gy - 43.5]], hx('#2e6a34'));
    // packed earth, straw, crates
    const G = ['#17120d', '#201811', '#2a2017'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    for (let k = 0; k < 50; k++) { const x = hash(k, 1, 52) * W, y = gy + 2 + hash(k, 2, 52) * (H - gy - 2); gnd.line(x, y, x + 2, y + (hash(k, 3, 52) < .5 ? -1 : 0), hx('#4a3e26'), .7); }
    const cx0 = W * .86; gnd.rect(cx0, gy - 4, 9, 7, hx('#3a2616')); gnd.rect(cx0, gy - 4, 9, 1, hx('#5a3c22')); gnd.line(cx0, gy - 4, cx0 + 8, gy + 2, hx('#24160c')); gnd.rect(cx0 + 10, gy - 6, 6, 9, hx('#2e1e12')); gnd.rect(cx0 + 10, gy - 3, 6, 1, hx('#4a4a4a'));
    return { layers: [sky, far, mid, gnd], lights, fx: 'leaf' };
  },
  'briarmaw-den'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#040306', '#07050b', '#0c0812', '#140c1c', '#1e122a'], 0, gy + 2);
    sky.glow(W * .5, gy - 4, 46, hx('#5a3470'), .42); sky.glow(W * .5, gy - 1, 22, hx('#7aa048'), .22);
    // the far heart of the hollow: a knot of thorns silhouetted against the glow
    for (let k = 0; k < 14; k++) { const a = -Math.PI * (.1 + .8 * hash(k, 1, 51)), l = 8 + hash(k, 2, 51) * 12; sky.thick(W * .5, gy + 2, W * .5 + Math.cos(a) * l * 1.4, gy + 2 + Math.sin(a) * l, 1.4, .3, hx('#1a1024')); }
    // overhead thorn canopy, rim-lit from below
    const C = hx('#150d1d'), CR = hx('#3a2650');
    for (let k = 0; k < 7; k++) { const x0 = (k + .5) / 7 * W + (hash(k, 1, 61) - .5) * 12; branch(sky, x0, -2, Math.PI / 2 + (hash(k, 2, 61) - .5) * 1.2, 9 + hash(k, 3, 61) * 9, 2.6, 3, C, 60 + k, true); }
    for (let y = 1; y < gy; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = ((y + 1) * W + x) * 4; if (sky.d[i] === C[0] && sky.d[i + 1] === C[1] && !(sky.d[j] === C[0] && sky.d[j + 1] === C[1])) sky.set(x, y, CR, .8); }
    for (let k = 0; k < 10; k++) { const x = hash(k, 5, 62) * W, len = 6 + hash(k, 6, 62) * 16; for (let y = 0; y < len; y++) sky.set(x + Math.sin(y * .4 + k) * .8, y, hx('#120a18')); sky.set(x, len, hx('#4a2e5a')); }
    // tangled thorn masses on the horizon
    ridge(far, x => gy - 6 - vnoise(x * .08, 0, 17) * 12, gy + 2, '#100a16', '#5a3a70', .75);
    for (let k = 0; k < 34; k++) { const x = hash(k, 1, 71) * W, y = gy - 6 - vnoise(x * .08, 0, 17) * 12, a = -Math.PI / 2 + (hash(k, 2, 71) - .5) * 1.6; far.thick(x, y + 1, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 1, .3, hx('#100a16')); far.set(x + Math.cos(a) * 5, y + Math.sin(a) * 5, hx('#5a3a70'), .6); }
    // great thorn arches framing the hollow, dripping sap
    const A = hx('#0c0712'), AR = hx('#4a3060');
    const arch = (x0, dir) => { const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([x0 + dir * (Math.sin(u * 2.2) * W * .22), gy + 6 - Math.sin(u * Math.PI * .9) * (gy - 2)]); } for (let k = 0; k < pts.length - 1; k++) { const r = 5 - k * .24; mid.thick(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], r, r - .2, A); if (k % 2 === 0) { const a = -Math.PI / 2 - dir * .9 + (hash(k, 3, 81) - .5) * .6; mid.thick(pts[k][0], pts[k][1], pts[k][0] + Math.cos(a) * 8, pts[k][1] + Math.sin(a) * 8, 1.3, .3, A); } } for (let k = 0; k < pts.length - 1; k++) { const r = 5 - k * .24; mid.line(pts[k][0] + dir * r * .75, pts[k][1] + r * .2, pts[k + 1][0] + dir * (r - .2) * .75, pts[k + 1][1] + r * .2, AR, .7); } return pts; };
    const la = arch(-2, 1), ra = arch(W + 2, -1);
    const drips = [];
    for (const [pts, k0] of [[la, 3], [la, 7], [ra, 5], [ra, 9]]) { const [x, y] = pts[k0], len = 5 + (k0 % 3) * 3; mid.line(x, y + 3, x, y + 3 + len, hx('#1a0e22')); mid.set(x, y + 4 + len, hx('#5a3a6e')); drips.push([x, y + 4 + len]); }
    // bones among the roots
    const B = hx('#8a8070'), BD = hx('#4a4438');
    const skull = (x, y) => { mid.rect(x, y, 4, 3, B); mid.set(x + 1, y + 1, BD); mid.set(x + 3, y + 1, BD); mid.rect(x + 1, y + 3, 2, 1, BD); };
    skull(W * .22, gy + 1); skull(W * .7, gy + 3);
    for (let k = 0; k < 4; k++) mid.line(W * .74 + k * 2, gy + 2, W * .74 + k * 2 + 1, gy - 2, B);
    mid.line(W * .3, gy + 3, W * .3 + 6, gy + 2, B);
    // black sap ground with glossy pools and blight cracks
    const G = ['#0c0810', '#130d19', '#1b1222'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    const pools = [[W * .3, gy + 16, 18, 4], [W * .72, gy + 26, 22, 5], [W * .52, gy + 36, 16, 3.4]];
    for (const [px, py, rx, ry] of pools) { for (let y = Math.floor(py - ry); y <= py + ry; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) { const e = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (e < 1) gnd.set(x, y, hx('#040208')); if (e < 1 && e > .7 && y < py) gnd.set(x, y, hx('#2a1a34'), .8); } gnd.rect(px - rx * .4, py - ry * .4, 3, 1, hx('#5a3e66')); gnd.set(px + rx * .3, py, hx('#4a3456')); }
    const cracks = [];
    for (let k = 0; k < 6; k++) { let x = hash(k, 1, 91) * W, y = gy + 4 + hash(k, 2, 91) * (H - gy - 8); const pts = [[x, y]]; for (let s = 0; s < 6; s++) { x += 1.5 + hash(k, s, 92) * 3; y += (hash(k, s, 93) - .5) * 5; pts.push([x, y]); } cracks.push(pts); for (let s = 0; s < pts.length - 1; s++) gnd.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#2e3a18')); }
    lights.push({ cracks, c: '#b4d65a' });
    lights.push({ drips, c: '#3a2448' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'blight' };
  },

  /* ---------- M3: the Verdant Wilds ---------- */
  // a fen at moonrise: fog over black water that holds the moon, drowned trees, reed beds and cattails, a
  // sunken shrine-stone, a rotten boardwalk, and Mosswatch's one lit window on the horizon
  mossfall(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#05090b', '#091113', '#0e1a1a', '#152420', '#1f3228', '#2e4330', '#46583a'], 0, gy + 2);
    const mx = Math.round(W * .68), my = Math.round(gy - H * .26);
    sky.glow(mx, my, 34, hx('#9ab08a'), .22); sky.disc(mx, my, 5, hx('#c4d0ac')); sky.disc(mx - 1.2, my - 1.1, 3.6, hx('#e2e8cc'), .85);
    for (let k = 0; k < 7; k++) {
      const y0 = Math.round(gy - H * .38 + k * H * .06 + hash(k, 1, 13) * 3), x0 = hash(k, 2, 13) * W * 1.2 - W * .2, len = W * (.28 + hash(k, 3, 13) * .4);
      for (let x = Math.floor(x0); x < x0 + len; x++) { const u = (x - x0) / len, th = Math.max(1, Math.round(Math.sin(u * Math.PI) * 2.4)); for (let y = 0; y < th; y++) if (((x + y) & 1) === 0 || y === th - 1) sky.set(x, y0 + y, hx('#6a806a'), .12 + .1 * Math.sin(u * Math.PI)); }
    }
    // far: the drowned treeline, and Mosswatch tower with a lit window
    ridge(far, x => gy - 2 - vnoise(x * .07, 0, 23) * 4 - (hash(Math.floor(x / 3), 4, 23) < .25 ? 2 : 0), gy + 2, '#0d1714', '#3a5242', .5);
    const tx = Math.round(W * .17), tb = gy - 1, T = hx('#0a110f'), TR = hx('#30443a');
    far.poly([[tx - 5.5, tb], [tx - 4.3, tb - 25], [tx - 5.4, tb - 26.5], [tx + 5.4, tb - 26.5], [tx + 4.3, tb - 25], [tx + 5.5, tb]], T);
    far.poly([[tx - 6.6, tb - 26], [tx, tb - 35], [tx + 6.6, tb - 26]], T); far.line(tx, tb - 35, tx, tb - 38, T); far.line(tx - 6, tb - 26.5, tx - .4, tb - 34.4, TR, .6);
    for (let y = tb - 24; y < tb; y++) far.set(tx - 4.3 + (y - tb + 24) * -.05, y, TR, .35);
    far.rect(tx - 1, tb - 20, 2, 3, hx('#ffb04a')); far.set(tx + 2, tb - 11, hx('#ffb04a'), .55);
    lights.push({ x: tx, y: tb - 18.5, r: 6, c: '#ffb04a', a: .3, flick: 1.9 });
    const drown = (x, sd, h) => {
      branch(far, x, gy + 1, -Math.PI / 2 + (hash(sd, 1, 3) - .5) * .3, h, 1.9, 2, hx('#0b1311'), sd);
      for (let k = 0; k < 8; k++) { const x0 = x + (hash(k, sd, 4) - .5) * h * 1.3, y0 = gy - h * (.5 + hash(k, sd, 5) * .55), len = 3 + hash(k, sd, 6) * 7; for (let y = 0; y < len; y++) far.set(x0 + Math.sin(y * .7 + k) * .6, y0 + y, hx('#2c402a'), .85 - y / len * .5); }
    };
    drown(W * .44, 9, 13); drown(W * .9, 23, 17);
    // mid: mist on the water, the half-sunk shrine stone, reed beds and tall cattails framing the view
    const sx = Math.round(W * .58), sy = gy + 2, ST = hx('#20291f');
    mid.poly([[sx - 5, sy], [sx - 4.6, sy - 10], [sx - 2, sy - 13], [sx + 2, sy - 13], [sx + 4.6, sy - 10], [sx + 5.2, sy]], ST);
    mid.disc(sx, sy - 7.5, 2.3, hx('#050807')); mid.line(sx - 4.6, sy - 10, sx - 2, sy - 13, hx('#4e604e'), .7);
    for (let x = sx - 4; x < sx + 4; x++) if (hash(x, 3, 19) < .6) mid.set(x, sy - 12.6 + hash(x, 4, 19) * 2, hx('#3c5a2e'));
    // ground: black water holding the moon, then a muddy bank with tufts, puddles and a rotten boardwalk
    const G = ['#0b100b', '#111812', '#182117'].map(hx), WA = ['#071216', '#0b1c20', '#11272a'].map(hx);
    const shore = x => gy + (H - gy) * .36 + Math.sin(x * .09) * 2 + vnoise(x * .12, 0, 5) * 3;
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) {
      const sh = shore(x);
      if (y < sh) { const l = Math.round((y - gy) / Math.max(1, sh - gy) * 2 + bayer(x, y) * .8); gnd.set(x, y, WA[Math.max(0, Math.min(2, l))]); }
      else { const l = Math.round((y - sh) / (H - sh) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    }
    for (let y = gy + 1; y < shore(mx) - 1; y += 2) { const d = (y - gy) / (H - gy), len = 2 + hash(y, 1, 35) * 4 * (1 - d), x0 = mx - y * .02 + (hash(y, 2, 35) - .5) * (4 + d * 10) - len / 2; gnd.line(x0, y, x0 + len, y, hx('#a8c0a0'), .55 - d * .5); }
    for (const [px, py, rx] of [[W * .52, (H + gy) * .5 + 8, 9], [W * .86, H - 6, 12], [W * .66, H - 13, 6]]) { for (let y = Math.floor(py - 2); y <= py + 2; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) { const e = ((x - px) / rx) ** 2 + ((y - py) / 2.2) ** 2; if (e < 1) gnd.set(x, y, e > .6 && y <= py ? hx('#2e4a44') : WA[1]); } }
    for (let k = 0; k < 40; k++) { const x = hash(k, 1, 37) * W, y = shore(x) + 2 + hash(k, 2, 37) * (H - shore(x) - 2); gnd.line(x, y, x + (hash(k, 3, 37) < .5 ? -1 : 1), y - 2 - hash(k, 4, 37) * 2, hx('#3a4a24'), .8); }
    const PL = [hx('#1e140c'), hx('#3a2818'), hx('#56402a')], sh0 = shore(W * .36);
    for (let i = 0; i <= 8; i++) {
      const v = i / 8, y = H - 2 - v * (H - 3 - sh0), c = W * (.2 + v * .16), half = 8 - v * 4.4, th = 1.4 - v * .5;
      if (hash(i, 5, 31) < .18) continue;
      gnd.thick(c - half, y, c + half, y + (hash(i, 6, 31) - .5), th, th, PL[1]); gnd.line(c - half, y - th + .5, c + half, y - th + .5, PL[2], .8); gnd.line(c - half, y + th, c + half, y + th, PL[0], .8);
      if (i % 3 === 0) { gnd.line(c - half - .5, y, c - half - .5, y + 3 - v * 2, PL[0]); gnd.line(c + half + .5, y, c + half + .5, y + 3 - v * 2, PL[0]); }
    }
    for (let k = 0; k < 7; k++) { const x = hash(k, 1, 29) * W, y = gy + 2 + hash(k, 2, 29) * ((H - gy) * .28); if (y > shore(x) - 1) continue; gnd.rect(x - 1.5, y, 3, 1, hx('#24462a')); gnd.set(x - 2, y, hx('#1a3420')); if (k % 3 === 0) gnd.set(x, y - 1, hx('#d8c8e8')); }
    // on the ground layer (the front one): mist over the water, the reed beds, cattails framing the view
    for (let k = 0; k < 6; k++) { const y0 = gy + 1 + k * 1.5, x0 = hash(k, 1, 33) * W - W * .3, len = W * (.4 + hash(k, 2, 33) * .5); for (let x = Math.floor(x0); x < x0 + len; x++) if (((x + k) & 1) === 0) gnd.set(x, y0, hx('#8aa294'), .08 + .08 * Math.sin((x - x0) / len * Math.PI)); }
    const R = hx('#101a0c'), RT = hx('#4a5a2c'), CT = hx('#3e2612'), CTL = hx('#6a4424');
    const reeds = (x0, x1, base, hmin, hmax, seed, skip) => { for (let x = Math.floor(x0); x < x1; x++) { if (hash(x, 7, seed) < skip) continue; const h = hmin + hash(x, 8, seed) * (hmax - hmin), lean = (hash(x, 9, seed) - .5) * 4; gnd.line(x, base, x + lean, base - h, R); gnd.set(x + lean + (lean > 0 ? 1 : 0), base - h * .9, RT, .6); if (hash(x, 10, seed) < .18) { gnd.rect(x + lean * .85 - .5, base - h + 1, 2, 5, CT); gnd.set(x + lean * .85 - .5, base - h + 1, CTL); } } };
    reeds(W * .34, W * .45, gy + 3, 4, 9, 17, .4); reeds(W * .76, W * .84, gy + 5, 4, 10, 19, .4);
    reeds(0, W * .13, H, H * .3, H * .56, 21, .35); reeds(W * .9, W, H, H * .26, H * .5, 23, .35);
    for (const [x, y, sd] of [[W * .3, gy + 5, 1.2], [W * .5, gy + 3, 2.1], [W * .82, gy + 7, .9]]) lights.push({ x, y, r: 6, c: '#9ef0c8', a: .32, pulse: 1, flick: .7 + sd * .3, core: [[Math.round(x), Math.round(y)]] });
    return { layers: [sky, far, mid, gnd], lights, fx: 'mire' };
  },
  // inside Mosswatch: a round stone wall with arched slits letting in the moon, a stair climbing to the lamp
  // room, the Tallymen's crates and ledger desk, tallies scratched in the stone, and the cold signal-brazier
  mosswatch(W, H, gy, dark) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const S = ['#0f1416', '#161d1f', '#1e2729', '#263133', '#303c3c'].map(hx), MO = hx('#0b0f10'), MS = hx('#2c4626');
    for (let y = 0; y < gy + 3; y++) {
      const row = Math.floor(y / 5), yo = y % 5;
      for (let x = 0; x < W; x++) {
        const bw = 10 + (hash(row, Math.floor((x + row * 7) / 11), 3) * 4 | 0), xo = (x + row * 7) % bw, curve = Math.abs(x - W / 2) / (W / 2);
        let l = Math.round(3.3 - curve * 2.6 + bayer(x, y) * .8 - (y / gy) * .6 + (hash(row, Math.floor((x + row * 7) / bw), 5) - .5) * .9); l = Math.max(0, Math.min(4, l));
        let c = S[l]; if (yo === 4 || xo === 0) c = MO; else if (yo === 0 && xo > 1) c = S[Math.min(4, l + 1)];
        sky.set(x, y, c);
        if ((yo === 4 || xo === 0) && y > gy - 16 && vnoise(x * .2, y * .2, 9) > .5) sky.set(x, y, MS, .9);
      }
    }
    const beams = [], slits = [Math.round(W * .3), Math.round(W * .7)], sTop = Math.round(gy - H * .46), sBot = Math.round(gy - H * .2), fy = Math.round(gy + (H - gy) * .55);
    for (const x of slits) {
      sky.rect(x - 4, sTop - 2, 8, sBot - sTop + 3, hx('#34403e')); sky.rect(x - 4, sBot, 8, 2, hx('#56625e'));
      sky.poly([[x - 2.5, sBot], [x - 2.5, sTop + 2], [x - 1, sTop], [x + 1, sTop], [x + 2.5, sTop + 2], [x + 2.5, sBot]], hx('#0c1830'));
      for (let y = sTop; y < sBot; y++) if (y < sTop + (sBot - sTop) * .4) sky.line(x - 2, y, x + 2, y, hx('#1a2c58'), .5);
      sky.set(x - 1, sTop + 4, hx('#e8eeff')); sky.set(x + 1, sTop + 9, hx('#9aaad8'), .7);
      const d = (fy - sBot) * .5, beam = [[x - 2.5, sBot - 1], [x + 2.5, sBot - 1], [x + d + 8, fy], [x + d - 8, fy]];
      const beamA = (px, py) => (((px + py) & 1) ? .12 : .2) * (1 - (py - sBot) / (fy - sBot) * .45);
      far.poly(beam, hx('#a8c0f0'), (px, py) => (py < gy ? beamA(px, py) : 0)); beams.push([beam, beamA]);
      for (let yy = fy - 4; yy <= fy + 4; yy++) for (let xx = Math.floor(x + d - 11); xx <= x + d + 11; xx++) { const e = ((xx - x - d) / 11) ** 2 + ((yy - fy) / 3.8) ** 2; if (e < 1) gnd.set(xx, yy, hx('#8a96b0'), (((xx + yy) & 1) ? .3 : .18) * (1 - e * e)); }
      lights.push({ beam, a: .5 }, { x: x + d, y: fy, r: 7, c: '#8aa4d8', a: .07, flick: .2 });
    }
    // tallies scratched into the wall: somebody counting days, or debts
    const tyl = Math.round(gy - H * .15), txl = Math.round(W * .43);
    for (let g = 0; g < 3; g++) { const x0 = txl + g * 7; for (let k = 0; k < 4; k++) sky.line(x0 + k * 1.2, tyl, x0 + k * 1.2, tyl + 4, hx('#7a8a86'), .9); sky.line(x0 - 1, tyl + 3.5, x0 + 4.6, tyl + .4, hx('#7a8a86'), .9); }
    // the ceiling beam, and the signal-brazier hanging from it on chains
    const by = Math.round(H * .1), BM = hx('#241810'), BL = hx('#3e2a1a');
    far.rect(0, by, W, 4, BM); far.rect(0, by, W, 1, BL); for (let x = 3; x < W; x += 9) far.set(x, by + 2, hx('#140c08'));
    const bx = Math.round(W * .52), cy1 = Math.round(gy - H * .24), CH = hx('#3a3e46'), BR = hx('#262a32'), BRL = hx('#5a606c');
    for (const dx of [-6, 6]) { const x0 = bx + dx * .3, x1 = bx + dx; for (let y = by + 4; y < cy1; y++) { const u = (y - by - 4) / (cy1 - by - 4); far.set(x0 + (x1 - x0) * u + (((y >> 1) & 1) ? .5 : 0), y, CH); } }
    far.poly([[bx - 8, cy1], [bx + 8, cy1], [bx + 5, cy1 + 6], [bx - 5, cy1 + 6]], BR); far.line(bx - 8, cy1, bx + 8, cy1, BRL);
    for (let x = bx - 6; x <= bx + 6; x += 3) far.line(x, cy1 + 1, x + (x < bx ? 1 : -1), cy1 + 5, hx('#14161c'));
    for (let x = bx - 6; x <= bx + 6; x++) if (hash(x, 1, 41) < .7) far.set(x, cy1 - 1, hx(hash(x, 2, 41) < .3 ? '#4a4448' : '#2a2428'));
    // the stair climbing the right wall
    const STR = hx('#20160e'), STL = hx('#4a321e'), sx0 = Math.round(W * .8);
    for (let k = 0; k < 9; k++) { const x = sx0 + k * 2.6, y = gy + 2 - k * (H * .052); far.rect(x, y, W - x + 2, 2.4, STR); far.line(x, y, W, y, STL); }
    far.line(sx0 - 1, gy - 1, W - 1, gy - H * .47, hx('#3a2616')); far.line(sx0 - 1, gy - 4, W - 1, gy - H * .5, hx('#3a2616'));
    // ground: floorboards running away from us, worn in the middle, darker under the walls
    const P = ['#1a120c', '#241810', '#2e2016', '#3a2a1c'].map(hx), vx = W * .5, vy = gy - (H - gy) * 1.4;
    for (let y = gy; y < H; y++) {
      const z = (H - vy) / (y - vy), u = (y - gy) / (H - gy);
      for (let x = 0; x < W; x++) {
        const X = (x + .5 - vx) * z / 7.5, fr = X - Math.floor(X), pl = Math.floor(X), joint = (z * 2.2 + hash(pl, 1, 47) * 3) % 3;
        const wear = 1 - Math.min(1, Math.abs(x - W * .5) / (W * .55)), l = Math.round(.6 + u * 1.5 + wear * .8 + bayer(x, y) * .7 - .3);
        let c = P[Math.max(0, Math.min(3, l))]; if (fr < .07 * z || joint < .05 * z) c = P[0]; else if (fr < .16 * z) c = P[Math.max(0, Math.min(3, l + 1))];
        gnd.set(x, y, c); if (hash(x, y, 43) < .012) gnd.set(x, y, P[3]);
      }
    }
    for (let k = 0; k < 16; k++) { const x = hash(k, 1, 45) < .5 ? hash(k, 2, 45) * W * .16 : W - hash(k, 3, 45) * W * .14, y = gy + hash(k, 4, 45) * (H - gy) * .7; gnd.set(x, y, MS); gnd.set(x + 1, y, MS, .6); }
    for (const [beam, beamA] of beams) gnd.poly(beam, hx('#a8c0f0'), (px, py) => (py >= gy ? beamA(px, py) : 0));
    // on the floor (front layer): crates, a barrel and sacks; the ledger desk with its candle
    const CR = hx('#3a2616'), CRL = hx('#5e4024'), CRD = hx('#1c120a');
    const crate = (x, y, sz) => { gnd.rect(x, y - sz, sz, sz, CR); gnd.rect(x, y - sz, sz, 1, CRL); gnd.rect(x, y - sz, 1, sz, CRL); gnd.line(x + 1, y - sz + 1, x + sz - 2, y - 2, CRD); gnd.line(x + sz - 2, y - sz + 1, x + 1, y - 2, CRD, .6); gnd.rect(x, y - 1, sz, 1, CRD); gnd.rect(x + sz - 1, y - sz, 1, sz, CRD); };
    const c0 = Math.round(W * .02); crate(c0, gy + 8, 13); crate(c0 + 12, gy + 8, 10); crate(c0 + 4, gy - 5, 9);
    const kx = Math.round(W * .2), ky = gy + 7; gnd.rect(kx, ky - 13, 9, 13, hx('#34220f')); gnd.rect(kx + 1, ky - 13, 2, 13, hx('#4e3218')); for (const yy of [ky - 11, ky - 3]) gnd.rect(kx, yy, 9, 1, hx('#5a5e66')); gnd.rect(kx, ky - 13, 9, 1, hx('#1c120a'));
    gnd.poly([[kx + 10, ky], [kx + 11, ky - 6], [kx + 14, ky - 7], [kx + 17, ky - 5], [kx + 17.5, ky]], hx('#5a4a32')); gnd.line(kx + 11, ky - 6, kx + 14, ky - 7, hx('#7a6a4a'));
    const dx = Math.round(W * .37), dy = gy + 5;
    gnd.rect(dx, dy - 6, 20, 2, hx('#46301a')); gnd.rect(dx, dy - 6, 20, 1, hx('#5e4226')); gnd.rect(dx + 1, dy - 4, 2, 8, hx('#2a1c10')); gnd.rect(dx + 17, dy - 4, 2, 8, hx('#2a1c10'));
    gnd.rect(dx + 4, dy - 8, 9, 2, hx('#c8b488')); gnd.line(dx + 8.5, dy - 8, dx + 8.5, dy - 6, hx('#5a4a30')); for (let k = 0; k < 3; k++) gnd.line(dx + 5, dy - 7.5 + k * .6, dx + 7.5, dy - 7.5 + k * .6, hx('#6a5a3c'), .6);
    gnd.rect(dx + 15, dy - 10, 1.5, 4, hx('#e8dcc0'));
    if (!dark) { gnd.set(dx + 15, dy - 11, hx('#ffd27a')); gnd.set(dx + 15, dy - 12, hx('#ff9a3a'), .7); }
    lights.push({ x: dx + 15.5, y: dy - 11.5, r: 12, c: '#ffb04a', a: .44, flick: 2.9, out: true });
    lights.push({ x: bx, y: cy1 + 2, r: 7, c: '#ff8a3a', a: .14, flick: 1.3, out: true });
    return { layers: [sky, far, mid, gnd], lights, fx: 'dust', darkAmb: .24 };
  },
  // the Dreaming Stone at dawn: birches, a carved spiral catching the first light, pilgrim candles, and the
  // empty bell-frame with its rope hanging loose
  fawnrest(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#181224', '#2a1e34', '#4a2e42', '#7a4a54', '#b0705e', '#dc9c70', '#f0c490'], 0, gy + 2);
    const sunx = Math.round(W * .6), ox = Math.round(W * .36), oy = gy + 4;
    sky.glow(sunx, gy, 44, hx('#ffe2a8'), .5); sky.disc(sunx, gy + 2, 8, hx('#fff0c8'), .9);
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .34, len = H * .7; sky.poly([[sunx, gy], [sunx + Math.cos(a - .045) * len, gy + Math.sin(a - .045) * len], [sunx + Math.cos(a + .045) * len, gy + Math.sin(a + .045) * len]], hx('#ffe8b8'), (px, py) => (((px + py) & 1) ? .05 : .09)); }
    for (let k = 0; k < 3; k++) { const cy = 6 + k * 8 + hash(k, 1, 51) * 4, cx = hash(k, 2, 51) * W, len = 26 + hash(k, 3, 51) * 34; for (let x = cx - len / 2; x < cx + len / 2; x++) { const th = 1 + Math.round(Math.sin((x - cx + len / 2) / len * Math.PI) * 1.6); for (let y = 0; y < th; y++) sky.set(x, cy + y, hx('#6a3e52'), .5); sky.set(x, cy + th, hx('#f0b088'), .35); } }
    ridge(far, x => gy - 4 - vnoise(x * .03, 0, 51) * 8, gy + 2, '#3e2c44', '#d8a08a', .5);
    ridge(far, x => gy - 1 - vnoise(x * .06, 1, 52) * 4, gy + 2, '#2e2436', '#9a7478', .4);
    // birches
    const birch = (x, top, w) => { for (let y = Math.round(top); y < gy + 3; y++) for (let xx = 0; xx < w; xx++) { const mark = hash(Math.round(x) + xx, y >> 1, 53) < .14; far.set(x + xx, y, mark ? hx('#3a3238') : xx === 0 ? hx('#e8e0d8') : hx(xx === w - 1 ? '#8a8088' : '#c8c0b8')); } for (let k = 0; k < 14; k++) { const fx = x + (hash(k, Math.round(x), 54) - .5) * 14, fy = top + hash(k, Math.round(x), 55) * 14; far.disc(fx, fy, 1.6 + hash(k, 3, 56), hx(k % 3 ? '#7a8a4a' : '#a8b060'), .9); } };
    birch(W * .08, gy - H * .5, 3); birch(W * .18, gy - H * .38, 2); birch(W * .86, gy - H * .52, 3); birch(W * .95, gy - H * .34, 2);
    // ground: meadow grass with wildflowers and a flagstone path to the stone
    const G = ['#1e2a1c', '#283620', '#324428'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); if (vnoise(x * .15, y * .4, 58) > .72 && ((x + y) & 1)) gnd.set(x, y, hx('#3c5230'), .8); }
    for (let k = 0; k < 11; k++) { const u = k / 10, x = ox + (W * .5 - ox) * u * 1.3 + Math.sin(k) * 3, y = oy + 1 + u * (H - oy - 3); const s = 2 + u * 3.2; gnd.poly([[x - s * 1.2, y], [x + s * 1.1, y - .5], [x + s * 1.3, y + s * .5], [x - s, y + s * .6]], hx(k & 1 ? '#6a6272' : '#5a5464')); }
    for (let k = 0; k < 42; k++) { const x = hash(k, 1, 59) * W, y = gy + 2 + hash(k, 2, 59) * (H - gy - 3), c = ['#f4f0e8', '#f0b0c8', '#f8e088', '#c8b0f0'][k % 4]; gnd.set(x, y, hx(c)); if (hash(k, 3, 59) < .4) gnd.set(x, y + 1, hx('#3a5a2a')); }
    // the Dreaming Stone with its spiral
    const SG = hx('#4a4458'), SL = hx('#7a7088'), SD = hx('#2a2634');
    gnd.poly([[ox - 7, oy], [ox - 6.5, oy - 18], [ox - 4.5, oy - 26], [ox - 1, oy - 29], [ox + 3, oy - 28], [ox + 6, oy - 22], [ox + 7.5, oy - 10], [ox + 7, oy]], SG);
    gnd.line(ox - 6.5, oy - 18, ox - 4.5, oy - 26, SL); gnd.line(ox - 4.5, oy - 26, ox - 1, oy - 29, SL); for (let y = oy - 17; y < oy; y++) gnd.set(ox + 6.8, y, SD);
    const sp = []; for (let k = 0; k < 40; k++) { const a = k * .38, r = .5 + k * .12; sp.push([ox + Math.cos(a) * r, oy - 15 + Math.sin(a) * r * 1.1]); }
    for (let k = 0; k < sp.length - 1; k++) gnd.line(sp[k][0], sp[k][1], sp[k + 1][0], sp[k + 1][1], hx('#f8e6a8'), .75);
    lights.push({ x: ox, y: oy - 15, r: 9, c: '#ffe9a0', a: .3, pulse: 1, flick: .6 });
    for (let x = ox - 7; x < ox + 7; x++) if (hash(x, 2, 57) < .7) gnd.set(x, oy - 1 - hash(x, 3, 57) * 2, hx('#4a6a3a'));
    for (const [cx, h] of [[ox - 9, 3], [ox - 5, 2], [ox + 9, 3], [ox + 12, 2]]) { gnd.rect(cx, oy - h + 2, 1, h, hx('#f0e6d0')); gnd.set(cx, oy - h + 1, hx('#ffd27a')); lights.push({ x: cx + .5, y: oy - h + 1, r: 5, c: '#ffc060', a: .3, flick: 2.3 + cx * .01 }); }
    // the empty bell-frame
    const fx = Math.round(W * .75), fy = gy + 5, FW = hx('#2e1e14'), FL = hx('#5a3e26');
    gnd.rect(fx - 9, fy - 24, 2, 24, FW); gnd.rect(fx + 8, fy - 24, 2, 24, FW); gnd.rect(fx - 11, fy - 26, 23, 2.5, FW); gnd.line(fx - 11, fy - 26, fx + 11, fy - 26, FL);
    gnd.line(fx - 9, fy - 17, fx - 5, fy - 23.5, FW); gnd.line(fx + 9, fy - 17, fx + 5, fy - 23.5, FW);
    for (let y = fy - 23; y < fy - 13; y++) gnd.set(fx + 1 + Math.sin(y * .5) * .6, y, hx('#b8a068'));
    gnd.set(fx + 1, fy - 12, hx('#b8a068')); gnd.set(fx + 2, fy - 12.4, hx('#b8a068'));
    for (const [rx, c] of [[fx - 6, '#e8e0f0'], [fx - 2, '#e0a0b8'], [fx + 4, '#a8c8e8'], [fx + 7, '#f0d890']]) for (let y = 0; y < 5; y++) gnd.set(rx + (y > 2 ? 1 : 0), fy - 23 + y, hx(c), .9);
    return { layers: [sky, far, mid, gnd], lights, fx: 'petal' };
  },
  // Eldergrove: the Eldest Tree fills the grove, its round door lit by lanterns and one great root bleeding
  // black; rope walks with lanterns overhead, the grove circle's runes, torches that burn at midday, fungi, ferns
  eldergrove(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#030705', '#060d09', '#09140e', '#0d1c13', '#122419', '#172c1e'], 0, gy + 2);
    for (let k = 0; k < 4; k++) { const x0 = W * (.12 + k * .24) + hash(k, 1, 61) * 8, wd = 5 + k % 2 * 3; for (let y = 0; y < gy; y++) for (let x = 0; x < wd; x++) { const X = x0 + x + y * .3; if (((X + y) & 1) && hash(X | 0, y, 62) < .5) sky.set(X, y, hx('#5a8a5a'), .13 * (1 - y / gy)); } }
    const sideTrunk = (x, w, c) => { for (let y = 0; y < gy + 4; y++) { const wob = Math.sin(y * .1 + x) * 1.2, x0 = x - w / 2 + wob; for (let xx = Math.floor(x0); xx < x0 + w; xx++) far.set(xx, y, (xx - x0) / w < .2 ? mix(hx(c), [120, 160, 110], .1) : hx(c)); } };
    sideTrunk(W * .06, 12, '#0b1510'); sideTrunk(W * .95, 14, '#0b1510');
    // rope walk and lanterns in the canopy
    const ry = Math.round(gy - H * .42);
    for (let x = 0; x < W; x++) { const sag = Math.sin(x / W * Math.PI) * 3; far.set(x, ry + sag, hx('#3a2a18')); far.set(x, ry + sag + 2, hx('#2a1e12'), .8); if (x % 4 === 0) far.line(x, ry + sag, x, ry + sag + 2, hx('#2a1e12')); }
    for (const lx of [W * .18, W * .34, W * .66, W * .82]) { const sag = Math.sin(lx / W * Math.PI) * 3; far.line(lx, ry + sag + 2, lx, ry + sag + 5, hx('#2a1e12')); far.rect(lx - 1, ry + sag + 5, 3, 3, hx('#ffb04a')); lights.push({ x: lx + .5, y: ry + sag + 6.5, r: 7, c: '#ffb04a', a: .35, flick: 2 + lx * .01 }); }
    // the Eldest Tree: grooved bark plates, lit on the left, moss only near the roots
    const cx = W * .5, tw = W * .34, T = [hx('#0c0806'), hx('#150e0a'), hx('#1f150e'), hx('#2e2014'), hx('#43301c')], TM = hx('#20401f');
    for (let y = 0; y < gy + 6; y++) {
      const flare = y > gy - 16 ? ((y - gy + 16) / 16) ** 2 * tw * .45 : 0, x0 = cx - tw / 2 - flare + Math.sin(y * .07) * 1.5, x1 = cx + tw / 2 + flare + Math.sin(y * .07 + 1) * 1.5;
      for (let x = Math.floor(x0); x < x1; x++) {
        const u = (x - x0) / (x1 - x0), g = Math.sin((x - cx) * .5 + vnoise(x * .12, y * .045, 63) * 5), cyl = 1.6 - Math.abs(u - .38) * 2.6;
        let l = Math.round(cyl + bayer(x, y) * .7 + (g > .55 ? 1 : 0)); l = Math.max(1, Math.min(4, l)); if (Math.abs(g) < .2) l = 0;
        let c = T[l]; if (l > 0 && y > gy - 22 && vnoise(x * .25, y * .25, 64) > .66 + (gy - y) * .006) c = TM;
        far.set(x, y, c);
      }
    }
    const dh = Math.round(H * .2), dw = Math.round(tw * .32), top = gy + 3 - dh;
    far.poly(Array.from({ length: 14 }, (_, k) => { const a = Math.PI + k / 13 * Math.PI; return [cx + Math.cos(a) * (dw / 2 + 1.5), top + dw / 2 + Math.sin(a) * (dw / 2 + 1.5)]; }).concat([[cx + dw / 2 + 1.5, gy + 3], [cx - dw / 2 - 1.5, gy + 3]]), hx('#2a1c10'));
    far.poly(Array.from({ length: 14 }, (_, k) => { const a = Math.PI + k / 13 * Math.PI; return [cx + Math.cos(a) * dw / 2, top + dw / 2 + Math.sin(a) * dw / 2]; }).concat([[cx + dw / 2, gy + 3], [cx - dw / 2, gy + 3]]), hx('#4a3018'));
    for (let x = cx - dw / 2 + 2; x < cx + dw / 2 - 1; x += 3) far.line(x, top + 2, x, gy + 2, hx('#2e1c0e'));
    far.line(cx - dw / 2 + 1, top + dw * .7, cx + dw / 2 - 1, top + dw * .7, hx('#5a5e66')); far.line(cx - dw / 2 + 1, gy - 1, cx + dw / 2 - 1, gy - 1, hx('#5a5e66')); far.disc(cx + dw * .28, top + dw * .9, 1, hx('#c89a2e'));
    for (const sd of [-1, 1]) { const lx = cx + sd * (dw / 2 + 4), ly = top + 4; far.line(lx, ly - 4, lx, ly, hx('#2a1e12')); far.rect(lx - 1, ly, 3, 4, hx('#ffc060')); lights.push({ x: lx + .5, y: ly + 2, r: 10, c: '#ffb04a', a: .45, flick: 2.6 + sd * .4, core: [[Math.round(lx), Math.round(ly + 1)]] }); }
    // ground: moss and leaf litter, a flagstone path to the door
    const G = ['#08120c', '#0d1a11', '#132317'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); if (vnoise(x * .2, y * .5, 65) > .72 && ((x + y) & 1)) gnd.set(x, y, hx('#1a3420'), .7); if (hash(x, y, 66) < .02) gnd.set(x, y, hx('#5a3e1c')); }
    for (let y = gy + 1; y < gy + (H - gy) * .5; y++) for (let x = Math.floor(cx - W * .2); x < cx + W * .2; x++) { const e = ((x - cx) / (W * .2)) ** 2 + ((y - gy - 1) / ((H - gy) * .5)) ** 2; if (e < 1 && ((x + y) & 1)) gnd.set(x, y, hx('#ffb04a'), .1 * (1 - e)); }
    for (let k = 0; k < 10; k++) { const u = k / 9, y = gy + 3 + u * (H - gy - 5), x = cx + Math.sin(u * 3) * 5 * u, s2 = 2 + u * 3.6; gnd.poly([[x - s2 * 1.3, y], [x + s2 * 1.1, y - .6], [x + s2 * 1.4, y + s2 * .45], [x - s2, y + s2 * .55]], hx(k & 1 ? '#3a4236' : '#2e362c')); gnd.line(x - s2 * 1.3, y, x + s2 * 1.1, y - .6, hx('#4a5446'), .8); }
    // the grove circle's stones, their runes awake
    for (const [sx, h, k] of [[W * .1, 16, 1], [W * .2, 12, 2], [W * .28, 9, 3]]) {
      const b = gy + 5 - k; gnd.poly([[sx - 3.5, b], [sx - 3, b - h], [sx - 1, b - h - 2], [sx + 2, b - h - 1], [sx + 3.5, b - h + 3], [sx + 3.6, b]], hx('#2a2e2c')); gnd.line(sx - 3, b - h, sx - 1, b - h - 2, hx('#5a605a'));
      for (let r = 0; r < 3; r++) { const yy = b - h + 4 + r * 4; gnd.line(sx - 1, yy, sx + 1, yy + 1, hx('#8aff6a'), .9); }
      lights.push({ x: sx, y: b - h / 2, r: 6, c: '#6aff5a', a: .22, pulse: 1, flick: .5 + k * .2 });
    }
    // great roots spreading from the trunk across the floor; the right one bleeds black
    const R = hx('#20150d'), RL = hx('#5e4228'), drips = [];
    const rootL = [], rootR = [];
    for (let k = 0; k <= 10; k++) { const u = k / 10; rootL.push([cx - tw * .42 - u * W * .36, gy + 3 + Math.pow(u, 1.4) * (H - gy) * .82 - Math.sin(u * Math.PI) * 3]); rootR.push([cx + tw * .4 + u * W * .32, gy + 4 + Math.pow(u, 1.5) * (H - gy) * .58 - Math.sin(u * Math.PI) * 4]); }
    barkRoot(gnd, rootL, 5.4, 2, R, RL, hx('#ffb04a'), 1, .42); barkRoot(gnd, rootR, 5.8, 2.2, R, RL, hx('#ffb04a'), -1, .42);
    for (let k = 2; k < 8; k++) { const [x, y] = rootR[k]; gnd.line(x - .5, y - 3.5, rootR[k + 1][0] - .5, rootR[k + 1][1] - 3.5, hx('#050208'), .95); }
    const [bxr, byr] = rootR[5]; gnd.set(bxr, byr - 2.6, hx('#6a2682')); gnd.line(bxr + 1, byr - 1, bxr + 1, byr + 3, hx('#050208')); drips.push([Math.round(bxr + 1), Math.round(byr + 4)]);
    for (const [pts, k0] of [[rootL, 3], [rootL, 7], [rootR, 3], [rootR, 8]]) { const [fx0, fy0] = pts[k0]; gnd.rect(fx0 - 1, fy0 - 6, 3, 2, hx('#5ae8d0')); gnd.set(fx0 - 1, fy0 - 6, hx('#c8fff4')); gnd.set(fx0, fy0 - 4, hx('#1c3a34')); lights.push({ x: fx0 + .5, y: fy0 - 5.5, r: 5, c: '#5ae8d0', a: .28, pulse: 1, flick: .8 + k0 * .1 }); }
    const tx = Math.round(W * .88); gnd.rect(tx, gy - 18, 1.5, 22, hx('#2a1a10')); gnd.set(tx - 1, gy - 19, hx('#3a2412')); gnd.set(tx + 1, gy - 19, hx('#3a2412'));
    lights.push({ x: tx + .3, y: gy - 22, r: 13, c: '#ff9a3a', a: .45, torch: 1, flick: 3.3 });
    // ferns in the near corners
    const fern = (x0, y0, dir, len, seed) => { const F0 = hx('#1f4a22'), F1 = hx('#3a7430'); for (let f = 0; f < 4; f++) { const a = -Math.PI / 2 + dir * (.35 + f * .32) + (hash(f, seed, 1) - .5) * .2, L0 = len * (1 - f * .12); let px0 = x0, py0 = y0; for (let k = 1; k <= 10; k++) { const u = k / 10, bend = a + dir * u * .7, qx = x0 + Math.cos(bend) * L0 * u, qy = y0 + Math.sin(bend) * L0 * u; gnd.line(px0, py0, qx, qy, F0); if (k > 1 && k < 10) { const lf = 3 * (1 - u * .6); gnd.line(qx, qy, qx + Math.cos(bend - 1.3) * lf, qy + Math.sin(bend - 1.3) * lf, F1, .9); gnd.line(qx, qy, qx + Math.cos(bend + 1.3) * lf, qy + Math.sin(bend + 1.3) * lf, F1, .9); } px0 = qx; py0 = qy; } } };
    fern(W * .02, H + 1, 1, H * .4, 1); fern(W * .98, H + 1, -1, H * .36, 2); fern(W * .12, H + 2, 1, H * .24, 3);
    lights.push({ drips, c: '#1a0e20' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'firefly' };
  },
  // under the Eldest Tree: a vault of roots around the sick green heart-knot, sap-taps and their buckets, black
  // ichor dripping into glossy pools, and blight veins in a floor of woven roots
  heartroot(W, H, gy, dark) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#040206', '#070409', '#0a060c', '#0f0911', '#150c15'], 0, gy + 2);
    const cx = W * .5, cy = Math.round(gy - H * .2);
    sky.glow(cx, cy, 58, hx('#46245a'), .55); sky.glow(cx, cy + 4, 32, hx('#62822e'), .38);
    const R = hx('#160e0b'), RL = hx('#3c2a1c'), RG = hx('#6e9432'), veins = [], drips = [];
    // the vault: roots curving down from the ceiling, rim-lit green on the side that faces the heart
    for (let k = 0; k < 8; k++) {
      const side = k % 2 ? 1 : -1, x0 = cx + side * W * (.1 + (k >> 1) * .12), pts = [];
      for (let j = 0; j <= 12; j++) { const u = j / 12; pts.push([x0 + side * Math.sin(u * 1.7) * W * .07 + Math.sin(u * 5 + k) * 1.3, -3 + u * (gy + 8)]); }
      barkRoot(far, pts, 1.8 + (k >> 1) * .5, 2.8 + (k >> 1) * .7, R, RL, RG, -side, .42 - (k >> 1) * .09);
      if (k < 2) veins.push(pts.slice(3, 9).map(([x, y]) => [x - side * .6, y]));
    }
    // the heart-knot: roots wound into a ball round a glowing core
    far.disc(cx, cy, 9.5, hx('#0c0808')); far.disc(cx, cy, 6.4, hx('#3a5a18')); far.disc(cx - .8, cy - .8, 4.2, hx('#9ac040')); far.disc(cx - 1.4, cy - 1.6, 2, hx('#e8ff9a'));
    for (let k = 0; k < 5; k++) {
      const th = k / 5 * Math.PI + .3, pts = [];
      for (let j = 0; j <= 16; j++) { const a = j / 16 * Math.PI * 2, ex = Math.cos(a) * 10.5, ey = Math.sin(a) * 4.2; pts.push([cx + ex * Math.cos(th) - ey * Math.sin(th), cy + ex * Math.sin(th) + ey * Math.cos(th)]); }
      for (let j = 0; j < 16; j++) if ((j + k) % 4 !== 0) far.thick(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], 1.3, 1.3, j < 8 ? R : hx('#221510'));
      for (let j = 0; j < 7; j++) far.set(pts[j][0], pts[j][1] - 1.2, RG, .5);
    }
    lights.push({ x: cx - 1, y: cy - 1, r: 17, c: '#a8d048', a: .45, pulse: 1, flick: .45, core: [[Math.round(cx - 2), Math.round(cy - 2)]] });
    // roots hanging from the vault, dripping ichor
    for (const [xf, len, w, seed] of [[.2, .5, 2.4, 1], [.34, .34, 1.8, 2], [.64, .4, 2, 3], [.8, .56, 2.6, 4]]) {
      const x0 = W * xf, pts = []; for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([x0 + Math.sin(u * 3 + seed) * 2.4, -2 + u * gy * len]); }
      barkRoot(mid, pts, w, .6, R, RL, null, 0);
      const e = pts[8]; mid.line(e[0], e[1] + 1, e[0], e[1] + 3, hx('#060308')); drips.push([Math.round(e[0]), Math.round(e[1] + 4)]);
    }
    // ground: soil between roots that weave across the floor, glossy ichor pools, blight veins
    const G = ['#0b0708', '#110b0c', '#170f10'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    for (let k = 0; k < 5; k++) {
      const y0 = gy + (H - gy) * (.1 + k * .21), x0 = (hash(k, 1, 77) - .6) * W * .4, x1 = W * (.7 + hash(k, 2, 77) * .5), pts = [];
      for (let j = 0; j <= 12; j++) { const u = j / 12; pts.push([x0 + u * (x1 - x0), y0 + Math.sin(u * (3 + k) + k * 1.9) * (2 + k * .9) + (hash(k, 3, 77) - .5) * u * 8]); }
      barkRoot(gnd, pts, 1.2 + k * .55, .8 + k * .4, R, RL, null, 0);
    }
    const pools = [[W * .3, gy + (H - gy) * .46, W * .1, 3.2], [W * .68, gy + (H - gy) * .72, W * .13, 4.2], [W * .52, gy + (H - gy) * .26, W * .07, 2.2]];
    for (const [px, py, rx, ry] of pools) {
      for (let y = Math.floor(py - ry); y <= py + ry; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) { const e = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (e < 1) gnd.set(x, y, hx('#030204')); if (e < 1 && e > .7 && y < py) gnd.set(x, y, hx('#2c1838'), .85); }
      gnd.rect(px - rx * .45, py - ry * .35, 3, 1, hx('#7a9a3a')); gnd.set(px + rx * .25, py - ry * .1, hx('#5a3a6e'));
      lights.push({ x: px - rx * .35, y: py - ry * .3, r: 5, c: '#8aba3a', a: .16, pulse: 1, flick: .4 });
    }
    const cracks = veins;
    for (let k = 0; k < 5; k++) { let x = hash(k, 1, 73) * W, y = gy + 5 + hash(k, 2, 73) * (H - gy - 9); const pts = [[x, y]]; for (let s2 = 0; s2 < 5; s2++) { x += 1.5 + hash(k, s2, 74) * 3; y += (hash(k, s2, 75) - .5) * 4; pts.push([x, y]); } cracks.push(pts); for (let s2 = 0; s2 < pts.length - 1; s2++) gnd.line(pts[s2][0], pts[s2][1], pts[s2 + 1][0], pts[s2 + 1][1], hx('#2a3818')); }
    // great roots framing the chamber
    for (const [x0, dir] of [[-4, 1], [W + 4, -1]]) {
      const pts = []; for (let j = 0; j <= 14; j++) { const u = j / 14; pts.push([x0 + dir * Math.sin(u * 2.1) * W * .2, gy + 10 - Math.sin(u * Math.PI * .92) * (gy + 2)]); }
      barkRoot(gnd, pts, 5.8, 2.2, R, RL, RG, dir, .3);
      for (const k0 of [5, 9]) { const [x, y] = pts[k0]; gnd.line(x, y + 3, x, y + 6 + (k0 % 3) * 2, hx('#060308')); drips.push([Math.round(x), Math.round(y + 7 + (k0 % 3) * 2)]); }
    }
    // a Tallyman's sap-tap hammered into the left root, and the bucket catching the ichor
    const tpx = Math.round(W * .13), tpy = Math.round(gy - H * .06);
    gnd.rect(tpx, tpy, 6, 2, hx('#6a4a26')); gnd.rect(tpx, tpy, 6, 1, hx('#8a6a3a')); gnd.rect(tpx + 5, tpy + 2, 1, 3, hx('#060308'));
    gnd.poly([[tpx + 2, tpy + 6], [tpx + 9.5, tpy + 6], [tpx + 8.8, tpy + 13], [tpx + 2.7, tpy + 13]], hx('#3a2616')); gnd.rect(tpx + 2, tpy + 6, 7.5, 1, hx('#7a7e88')); gnd.rect(tpx + 2.4, tpy + 10, 6.8, 1, hx('#5a5e68')); gnd.rect(tpx + 3, tpy + 7, 5.6, 1, hx('#0a060c'));
    lights.push({ cracks, c: '#b4d65a' });
    lights.push({ drips, c: '#1a0e20' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'blight', darkAmb: dark ? .16 : .2 };
  },

  /* ---------- M4: the Sunscorch Wastes ---------- */
  // the Sunward Road in the afternoon: the last green scrub and cacti give out to dunes, the Waystone's fire-bowl
  // burns where the old paving leaves the green, and Sandspire's mesa and Spire stand far off in the haze
  'sun-road'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#1c2a52', '#26406e', '#3a5a88', '#627a98', '#9a9098', '#cca88a', '#e8c088'], 0, gy + 2);
    const sx = Math.round(W * .22), sy = Math.round(gy - H * .36);
    sky.glow(sx, sy, 46, hx('#ffe6b0'), .45); sky.glow(sx, sy, 13, hx('#fff4d8'), .6); sky.disc(sx, sy, 4.5, hx('#fffae8'));
    for (let k = 0; k < 4; k++) { const cy = 6 + k * 7 + hash(k, 1, 83) * 3, cx = hash(k, 2, 83) * W, len = 26 + hash(k, 3, 83) * 40; for (let x = Math.floor(cx - len / 2); x < cx + len / 2; x++) { const u = (x - cx + len / 2) / len; if ((x + k) & 1) sky.set(x, cy + Math.sin(u * 3 + k) * .8, hx('#e0d0c4'), .22 * Math.sin(u * Math.PI)); } }
    // far: hazy dunes, and Sandspire on its mesa: the red Spire and the city's towers
    ridge(far, x => gy - 2 - vnoise(x * .04, 0, 81) * 4, gy + 2, '#a47e78', '#e8c49a', .45);
    const mx = Math.round(W * .6), MS = hx('#8e6670'), ML = hx('#d8a88c');
    far.poly([[mx - 21, gy + 1], [mx - 16, gy - 8], [mx + 13, gy - 9], [mx + 19, gy + 1]], MS); far.line(mx - 16, gy - 8, mx - 21, gy + 1, ML, .6); far.line(mx - 16, gy - 8, mx + 13, gy - 9, ML, .35);
    far.poly([[mx - 3.5, gy - 8], [mx - 2, gy - 22], [mx - .5, gy - 26], [mx + 1.5, gy - 21], [mx + 3, gy - 8]], hx('#8a5a5e')); far.line(mx - 3.5, gy - 8, mx - 2, gy - 22, ML, .55); far.line(mx - 2, gy - 22, mx - .5, gy - 26, ML, .8);
    for (const [x, w, h] of [[mx - 13, 4, 3], [mx - 8, 3, 6], [mx + 5, 4, 4], [mx + 10, 2, 7]]) { far.rect(x, gy - 8 - h, w, h, MS); far.line(x, gy - 8 - h, x, gy - 9, ML, .5); }
    far.disc(mx - 6.5, gy - 14, 1.8, MS); far.set(mx - 7.5, gy - 15, ML, .6);
    // mid: the first dunes on the right, where the sand begins; the last of the green on the left
    dunes(far, [[W * .8, gy - 4, 26, 10, .5], [W * 1.02, gy - 5, 24, 10, .5]], gy + 2, ['#8a5e5a', '#9a6c62', '#c89a82', '#e0b896'], '#f8dcb8');
    dunes(mid, [[W * .7, gy - 6, 22, 10, .45], [W * .88, gy - 12, 34, 13, .4], [W * 1.04, gy - 8, 22, 10, .45], [W * .96, gy - 1, 20, 9, .5]], gy + 3, ['#7a4632', '#94583a', '#cc905a', '#eab478'], '#fff0c8');
    const SC = ['#2e3a1c', '#4a5628', '#6e7434'].map(hx);
    for (let k = 0; k < 16; k++) { const x = hash(k, 1, 85) * W * .5, y = gy + 1 + hash(k, 2, 85) * 4, r = 1.5 + hash(k, 3, 85) * 2.5; mid.disc(x, y - r * .5, r, SC[0]); mid.disc(x - r * .3, y - r * .8, r * .7, SC[1]); mid.set(x - r * .5, y - r * 1.2, SC[2]); }
    const cactus = (x, y, h, arms) => {
      const C = hx('#3a5230'), CL = hx('#6a8a48'), CD = hx('#243620');
      mid.thick(x, y, x, y - h, 1.7, 1.5, C); mid.line(x - 1, y - 1, x - 1, y - h + 1, CL); mid.line(x + 1, y - 1, x + 1, y - h + 1, CD, .7);
      for (const [sd, at, len] of arms) { const ay = y - h * at, ex = x + sd * 3.5; mid.thick(x, ay, ex, ay, 1, 1, C); mid.thick(ex, ay, ex, ay - len, 1.1, 1, C); mid.line(ex - 1, ay - 1, ex - 1, ay - len + 1, CL, .8); }
    };
    cactus(W * .07, gy + 2, 17, [[1, .45, 5], [-1, .6, 4]]); cactus(W * .34, gy + 1, 9, [[1, .5, 3]]);
    // the Waystone: a standing stone with its fire-bowl, where the road leaves the green
    const wx = Math.round(W * .47), wy = gy + 4, WS = hx('#5a4a44'), WL = hx('#a08a70'), WD = hx('#3a2e2c');
    mid.poly([[wx - 3.5, wy], [wx - 3, wy - 13], [wx - 1.5, wy - 16], [wx + 1.5, wy - 16], [wx + 3, wy - 13], [wx + 3.6, wy]], WS);
    mid.line(wx - 3, wy - 13, wx - 3.5, wy - 1, WL, .8); mid.line(wx - 3, wy - 13, wx - 1.5, wy - 16, WL, .8); for (let y = wy - 12; y < wy; y++) mid.set(wx + 3, y, WD);
    mid.line(wx - 1, wy - 11, wx + 1, wy - 9, WD, .8); mid.line(wx - 1, wy - 6, wx + 1, wy - 7, WD, .8);
    fireBowl(mid, wx, wy - 17, 3, lights, 'lit');
    // ground: sand, and the caravan road with its old paving half buried, running off toward Sandspire
    sandFloor(gnd, gy, ['#6a4830', '#7e5836', '#94683e', '#a87848'], '#c4945a', 86);
    const road = y => { const u = (y - gy) / (H - gy); return [W * (.6 - .14 * u), 1.5 + u * W * .2]; }, RC = ['#8a6848', '#a07c56', '#b48e62'].map(hx);
    for (let y = gy + 1; y < H; y++) { const [c, hw] = road(y); for (let x = Math.floor(c - hw); x <= c + hw; x++) { const e = Math.abs(x - c) / hw; if (e > .8 && bayer(x, y) < (e - .8) * 5) continue; gnd.set(x, y, RC[clampI(Math.round(1 + (y - gy) / (H - gy) - e * .8 + bayer(x, y) * .7), 2)]); } }
    for (let k = 0; k < 26; k++) { const v = hash(k, 1, 87), y = gy + 2 + v * v * (H - gy - 3), [c, hw] = road(y), x = c + (hash(k, 2, 87) - .5) * hw * 1.6, s = .8 + v * 3.2; if (hash(k, 3, 87) < .3) continue; gnd.poly([[x - s * 1.2, y], [x + s, y - .4], [x + s * 1.1, y + s * .5], [x - s, y + s * .55]], hx(k & 1 ? '#7a6452' : '#6e5a4a')); gnd.line(x - s * 1.2, y, x + s, y - .4, hx('#b8a080'), .7); }
    for (let k = 0; k < 30; k++) { const x = hash(k, 1, 88) * W * .55, y = gy + 2 + hash(k, 2, 88) * (H - gy - 3), [c, hw] = road(y); if (Math.abs(x - c) < hw) continue; for (let b = -1; b <= 1; b++) gnd.line(x + b, y, x + b * 2, y - 2 - hash(k, b + 2, 88) * 2.5, hx(b ? '#8a8440' : '#a8a050'), .85); }
    const kx = Math.round(W * .38), ky = H - 7, BN = hx('#e8dcc4'), BD = hx('#3a2e24');
    gnd.rect(kx, ky, 5, 3, BN); gnd.set(kx + 1, ky + 1, BD); gnd.set(kx + 3, ky + 1, BD); gnd.rect(kx + 1, ky + 3, 3, 1, hx('#c8bca4')); gnd.line(kx - 3, ky - 2, kx, ky, BN); gnd.line(kx + 5, ky, kx + 8, ky - 2, BN);
    return { layers: [sky, far, mid, gnd], lights, fx: 'sand' };
  },
  // Sandspire at sundown: the red rock of the Spire above the city's domes and towers, lamps in the windows, the
  // market under striped awnings and lantern strings, palms, and the Spire Hearth burning in the square
  sandspire(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#221a3a', '#3a2246', '#5e2e4a', '#904048', '#c05c48', '#de8650', '#f0ac66'], 0, gy + 2);
    sky.glow(W * .78, gy - 2, 54, hx('#ffc070'), .42); sky.disc(W * .78, gy + 1, 7, hx('#ffd890'), .9);
    for (let k = 0; k < 3; k++) { const cy = 7 + k * 8 + hash(k, 1, 91) * 3, cx = hash(k, 2, 91) * W, len = 30 + hash(k, 3, 91) * 36; for (let x = Math.floor(cx - len / 2); x < cx + len / 2; x++) { const th = 1 + Math.round(Math.sin((x - cx + len / 2) / len * Math.PI) * 1.5); for (let y = 0; y < th; y++) sky.set(x, cy + y, hx('#5a2c48'), .5); sky.set(x, cy + th, hx('#f0a070'), .4); } }
    // the Spire: a pillar of red rock the city grew round, lit on its sunset face, windows cut into it
    const sx = W * .42, R = ['#3a1820', '#58262a', '#7a3830', '#a8563a', '#d07848'].map(hx);
    for (let y = 1; y < gy; y++) { const u = y / gy, hw = 4 + u * u * 12 + vnoise(y * .2, 0, 92) * 2.5, c = sx + Math.sin(u * 3.4) * 2.5; for (let x = Math.floor(c - hw); x < c + hw; x++) { const e = (x - c + hw) / (2 * hw), band = Math.sin(y * .8 + vnoise(x * .15, y * .1, 93) * 3) > .75 ? 1 : 0; far.set(x, y, R[clampI(Math.round(.3 + e * 3.4 + bayer(x, y) * .7 - band), 4)]); } }
    for (const [dx, y] of [[-1, 8], [2, 15], [-3, 23], [3, 29]]) { far.rect(sx + dx, y, 1, 2, hx('#ffb04a')); lights.push({ x: sx + dx + .5, y: y + 1, r: 4, c: '#ffb04a', a: .25, flick: 1.5 + y * .05 }); }
    // the city: flat roofs, domes and towers against the sunset, windows lit
    const CS = hx('#2e1a26'), CR = hx('#d87a4a'), WN = hx('#ffb04a');
    for (let k = 0, x = -3; x < W + 3; k++) {
      const w = 7 + hash(k, 1, 94) * 10, h = 8 + hash(k, 2, 94) * 10 + (k % 4 === 1 ? 8 : 0), top = gy + 2 - h, kind = hash(k, 3, 94);
      far.rect(x, top, w, h + 1, CS); far.line(x + w - 1, top, x + w - 1, gy + 1, CR, .7); far.line(x, top, x + w - 1, top, CR, .35);
      if (kind < .35) { far.disc(x + w / 2, top, w * .36, CS); far.set(x + w / 2 + w * .2, top - w * .25, CR, .7); far.line(x + w / 2, top - w * .36 - 2, x + w / 2, top - w * .36, CS); } else if (kind < .6) for (let m = 0; m < w - 1; m += 2) far.set(x + m, top - 1, CS);
      for (let j = 0; j < 3; j++) if (hash(k, j, 95) < .45) far.rect(x + 2 + hash(k, j, 96) * (w - 4), top + 3 + hash(k, j, 97) * (h - 6), 1, 2, WN, .9);
      x += w - 1;
    }
    // the market: stalls under awnings striped saffron, bone and indigo, goods on their counters; palms; a lantern
    // string between the stalls
    const stall = (x0, x1, y0, cols, seed) => {
      const C = cols.map(hx), P = hx('#2a1a10'), x0i = Math.floor(x0);
      mid.rect(x0 + 1, y0 + 6, x1 - x0 - 2, gy + 3 - y0 - 6, hx('#1a1016')); mid.rect(x0 + 1, gy - 3, x1 - x0 - 2, 3, hx('#4a3020')); mid.rect(x0 + 1, gy - 3, x1 - x0 - 2, 1, hx('#8a6040'));
      for (let k = 0; k < (x1 - x0 - 4) / 3.5; k++) { const h = 1 + Math.round(hash(k, 3, seed) * 2.4); mid.rect(x0 + 2.5 + k * 3.5, gy - 3 - h, 2, h, hx(['#c8783a', '#e8c070', '#9a5a9a', '#5a9aaa', '#e0d8c0'][Math.floor(hash(k, 2, seed) * 5)])); }
      for (let x = x0i; x < x1; x++) { const i = x - x0i, st = C[Math.floor(i / 3) % C.length]; for (let y = 0; y < 6; y++) mid.set(x, y0 + y, y === 0 ? mix(st, [255, 230, 190], .35) : y > 3 ? mix(st, [0, 0, 0], .2) : st); if (i % 3 !== 2) mid.set(x, y0 + 6, mix(st, [0, 0, 0], .3)); }
      mid.rect(x0, y0 + 1, 1, gy + 3 - y0, P); mid.rect(x1 - 1, y0 + 1, 1, gy + 3 - y0, P);
    };
    palm(mid, W * .2, gy + 3, H * .38, -.2, '#3a2418', '#2e4a2a', 1); palm(mid, W * .88, gy + 3, H * .42, .15, '#3a2418', '#2e4a2a', 2);
    stall(W * .02, W * .27, gy - 16, ['#d89a3a', '#e8dcc0', '#3a4a8a'], 1); stall(W * .7, W * .98, gy - 15, ['#b8402e', '#e8dcc0', '#d89a3a'], 2);
    for (let k = 0; k <= 40; k++) { const u = k / 40, x = W * (.27 + .43 * u), y = gy - 18 + u + Math.sin(u * Math.PI) * 6; mid.set(x, y, hx('#2a1a14')); if (k % 8 === 4) { mid.rect(x - .5, y + 1, 2, 2, hx(k % 16 === 4 ? '#ffc060' : '#ff8a4a')); lights.push({ x: x + .5, y: y + 2, r: 5, c: '#ffb04a', a: .3, flick: 2 + k * .1 }); } }
    // the Spire Hearth on its plinth in the square
    const fx0 = Math.round(W * .52), fy = gy + 3; mid.rect(fx0 - 5, fy - 3, 10, 4, hx('#6a4a3a')); mid.rect(fx0 - 5, fy - 3, 10, 1, hx('#b08a64')); mid.rect(fx0 + 3, fy - 2, 2, 3, hx('#4a3226'));
    fireBowl(mid, fx0, fy - 4, 4, lights, 'lit');
    // the square: worn paving in the last of the sun, warm round the fire; jars and a crate by the right-hand stall
    paving(gnd, gy, gy - (H - gy) * 1.2, ['#4a3028', '#5e3e30', '#74503a', '#8a6446', '#a07650'], '#34221c', 9, 16, 98, (x, y) => (y - gy) / (H - gy) * 1.2 + .7 + x / W * .8 + Math.max(0, 1 - Math.hypot(x - fx0, (y - fy) * 2.5) / 30) * 1.6);
    for (const [x, h, c] of [[W * .8, 6, '#a0603a'], [W * .84, 5, '#8a4e30'], [W * .9, 7, '#b87a4a']]) { gnd.disc(x, gy + 5 - h * .5, h * .45, hx(c)); gnd.rect(x - 1, gy + 4 - h, 2, 1.5, hx(c)); gnd.set(x - h * .25, gy + 4 - h * .6, hx('#e8b080'), .8); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'ember' };
  },
  // the Dust Trail: a red canyon under a strip of white-hot sky, Sandspire's aqueduct striding across it on arches
  // (broken where the scorpions choked it), Dusthaven's headframe far down the canyon, the sand-choked Dust Cairn,
  // and the mine-cart rails running out of the dust
  'dust-trail'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#4e6a8e', '#7288a2', '#9ea4ac', '#c8b49c', '#e4c492'], 0, gy + 2);
    sky.glow(W * .6, gy - 12, 40, hx('#fff0c8'), .35);
    // far: the canyon narrowing to the west, its walls hazed with distance
    const vx = W * .62, FW = ['#6e3e3e', '#84504a', '#9a6256', '#b27662', '#c88c70'];
    rockWall(far, y => vx - 7 - (gy + 2 - y) * 1.5 - vnoise(y * .15, 0, 102) * 5, -1, 0, gy + 2, FW, '#f0c090', 103);
    rockWall(far, y => vx + 7 + (gy + 2 - y) * 1.2 + vnoise(y * .15, 1, 102) * 5, 1, 0, gy + 2, FW, null, 104);
    // Dusthaven's headframe, far down the canyon
    const hf = hx('#3a2418'); far.line(vx - 3, gy + 1, vx, gy - 8, hf); far.line(vx + 3, gy + 1, vx, gy - 8, hf); far.line(vx - 2, gy - 3, vx + 2, gy - 3, hf); far.disc(vx, gy - 8, 1.6, hf); far.set(vx, gy - 8, hx('#9a7a5a'));
    // the aqueduct across the canyon on its arches, broken in the middle; a trickle of sand where it fell
    const ay = Math.round(gy - H * .3), AQ = hx('#a87a58'), AL = hx('#e0b488'), AD = hx('#6a4234'), span = 18, pw = 5, r = (span - pw) / 2;
    for (let x = 0; x < W; x++) {
      if (x > W * .5 && x < W * .57) continue;
      const brk = x > W * .46 && x <= W * .5 ? (x - W * .46) * 1.2 : x >= W * .57 && x < W * .61 ? (W * .61 - x) * 1.2 : 0, px = (x + 7) % span;
      for (let y = ay + Math.round(brk * hash(x, 1, 105)); y < ay + 5; y++) far.set(x, y, y === ay ? AL : y === ay + 1 || y === ay + 4 ? AD : AQ);
      if (brk) continue;
      if (px < pw) for (let y = ay + 5; y < gy + 2; y++) far.set(x, y, px === 0 ? AL : px === pw - 1 ? AD : AQ);
      else { const d = (px - pw + .5 - r) / r, f = ay + 6 + Math.round(r * (1 - Math.sqrt(Math.max(0, 1 - d * d)))); for (let y = ay + 5; y < f; y++) far.set(x, y, AQ); far.set(x, f, AD); }
    }
    for (let y = ay + 5; y < gy + 1; y++) if (hash(y, 2, 106) < .6) far.set(W * .5 + hash(y, 3, 106) * 2, y, hx('#e8c89a'), .6);
    // mid: the near canyon walls in red strata, and the Dust Cairn on its rise, its fire-bowl choked with sand
    const NW = ['#3e1e18', '#5a2a20', '#76382a', '#924a34', '#b0603e'];
    rockWall(mid, y => W * .1 + (gy + 4 - y) * .12 + vnoise(y * .12, 2, 107) * 6, -1, 0, gy + 5, NW, '#f0a060', 108);
    rockWall(mid, y => W * .9 - (gy + 4 - y) * .1 - vnoise(y * .12, 3, 107) * 6, 1, 0, gy + 5, NW, null, 109);
    const cx0 = Math.round(W * .45), cy0 = gy + 3;
    for (const [dx, dy, r] of [[-4, 0, 2.6], [0, 0, 3], [4, 0, 2.4], [-2, -3.5, 2.4], [2, -3.5, 2.5], [0, -6.5, 2.2]]) { mid.disc(cx0 + dx, cy0 + dy - r * .6, r, hx('#6a4a3e')); mid.set(cx0 + dx - r * .5, cy0 + dy - r * 1.2, hx('#a8826a')); }
    fireBowl(mid, cx0, cy0 - 10, 3, lights, 'sand');
    // ground: red dust, the rails, scorpion shells glinting, boulders
    sandFloor(gnd, gy, ['#4a2a20', '#5a3424', '#6c3e2a', '#7e4a30'], '#9a6040', 110);
    rails(gnd, W * .66, 10, vx, gy - 8, gy, ['#2e1c14', '#3a3a40', '#9a9aa4']);
    for (let k = 0; k < 14; k++) { const x = hash(k, 1, 111) * W, y = gy + 3 + hash(k, 2, 111) * (H - gy - 5); gnd.line(x, y, x + 2, y - 1, hx('#d8c8a0'), .8); gnd.set(x + 1, y, hx('#f8f0d8')); }
    for (const [x, y, r] of [[W * .02, H - 6, 9], [W * .97, gy + 12, 6], [W * .3, gy + 4, 3]]) { gnd.disc(x, y, r, hx('#5a2e22')); gnd.disc(x - r * .25, y - r * .3, r * .7, hx('#7a4230')); gnd.set(x - r * .5, y - r * .7, hx('#b06a44')); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'sand' };
  },
  // the Deep Shaft: a timbered gallery in rock shot through with sunstone that glows by itself; the rails run on down
  // the shaft into the dark, past a cart, the miners' lamps and the great Shaft Lamp. In the dark the lamps are out
  // and only the sunstone glows
  'deep-shaft'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    // hewn rock, pick-marked, lighter where the lamps reach it
    const RK = ['#110b09', '#19120e', '#221913', '#2d2219', '#3a2d20', '#4a3a26'].map(hx);
    for (let y = 0; y < gy + 3; y++) for (let x = 0; x < W; x++) {
      const n = vnoise(x * .08, y * .1, 121) * .65 + vnoise(x * .25, y * .3, 126) * .35, lamp = Math.max(0, 1 - Math.min(Math.hypot(x - W * .3, y - 16), Math.hypot(x - W * .72, y - 14), Math.hypot(x - W * .84, y - gy + H * .26)) / 40);
      sky.set(x, y, RK[clampI(Math.round(n * 4 - .9 + lamp * 2.8 + bayer(x, y) * .7 - .35 - (hash(Math.floor(x / 3), Math.floor(y / 2), 127) < .06 ? 1 : 0)), 5)]);
    }
    // sunstone veins: jagged seams of gold in the rock that keep glowing when the lamps go out
    for (let k = 0; k < 5; k++) {
      let x = W * [.12, .3, .7, .86, .5][k], y = H * [.3, .08, .16, .38, .02][k]; const pts = [[x, y]];
      for (let s = 0; s < 7; s++) { x += (hash(k, s, 122) - .3) * 5; y += 1.5 + hash(k, s, 123) * 2.5; pts.push([x, y]); }
      for (let s = 0; s < pts.length - 1; s++) { sky.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#a8641c')); sky.line(pts[s][0] - 1, pts[s][1], pts[s + 1][0] - 1, pts[s + 1][1], hx('#6a3a14'), .6); }
      for (const s of [2, 5]) { sky.set(pts[s][0], pts[s][1], hx('#ffe08a')); lights.push({ x: pts[s][0] + .5, y: pts[s][1] + .5, r: 5, c: '#ffb040', a: .3, pulse: 1, flick: .6 + k * .1 }); }
    }
    // the shaft running on: a black mouth, timber frames receding into it
    const vx = W * .55, vy = gy - 10, mouth = d => [vx - 17 / d, vy + (gy + 2 - vy) / d, vy + (gy - 25 - vy) / d, vx + 17 / d];
    const [ml, mf, mt, mr] = mouth(1); far.poly([[ml, mf], [ml, mt], [mr, mt], [mr, mf]], hx('#060404'));
    for (const d of [5, 3.2, 2.1, 1.4]) { const [l, f, t, r] = mouth(d), c = hx(['#140e0a', '#1e150e', '#2a1c12', '#3a2616'][[5, 3.2, 2.1, 1.4].indexOf(d)]), w = 2.8 / d; far.rect(l, t, w, f - t, c); far.rect(r - w, t, w, f - t, c); far.rect(l, t, r - l, w, c); }
    rails(far, vx - 1, 11 * .7, vx, vy, vy + 3, ['#1a120c', '#2a2a2e', '#5a5a60']);
    // timber props framing the gallery; lamps hang from the cap beam and the Shaft Lamp is bolted to the right-hand post
    const T = hx('#3a2616'), TL = hx('#5e4226'), TD = hx('#1c120a');
    for (const x of [W * .06, W * .9]) { mid.rect(x, 0, 5, gy + 8, T); mid.rect(x, 0, 1, gy + 8, TL); mid.rect(x + 4, 0, 1, gy + 8, TD); for (let y = 10; y < gy; y += 13) mid.set(x + 2, y, hx('#7a7a80')); }
    mid.rect(0, 3, W, 5, T); mid.rect(0, 3, W, 1, TL); mid.rect(0, 7, W, 1, TD); for (let x = 5; x < W; x += 12) mid.set(x, 5, hx('#7a7a80'));
    for (const [x0, sd] of [[W * .06 + 5, 1], [W * .9, -1]]) mid.thick(x0, 20, x0 + sd * 12, 8, 1.4, 1.4, T);
    for (const [x, len] of [[W * .3, 6], [W * .72, 4]]) { mid.line(x, 8, x, 8 + len, hx('#4a4a50')); mid.rect(x - 1, 9 + len, 3, 4, hx('#4a3a2a')); mid.rect(x - .5, 10 + len, 2, 2, hx('#ffd27a')); lights.push({ x: x + .5, y: 11 + len, r: 12, c: '#ffb04a', a: .42, flick: 2.2 + x * .01, out: true }); }
    const lx = Math.round(W * .9) - 6, ly = Math.round(gy - H * .3), BR = hx('#9a7440'), BRD = hx('#5a4024');
    mid.rect(lx - 1, ly - 5, 8, 1.5, hx('#2e2e34')); mid.line(lx + 1.5, ly - 4, lx + 1.5, ly - 2, hx('#5a5a62')); mid.poly([[lx - 2, ly + .5], [lx + 5, ly + .5], [lx + 3.5, ly - 2], [lx - .5, ly - 2]], BR);
    mid.rect(lx - 1.5, ly + .5, 6, 8, hx('#ffe6a0')); mid.rect(lx, ly + 2, 3, 5, hx('#fffbe8')); for (const d of [-1.5, 1.5, 3.5]) mid.rect(lx + d, ly + .5, 1, 8, d === 1.5 ? BRD : BR); mid.rect(lx - 2, ly + 8.5, 7, 1.5, BR); mid.rect(lx - 1, ly + 10, 5, 1, BRD);
    lights.push({ x: lx + 1.5, y: ly + 4.5, r: 16, c: '#ffc060', a: .5, flick: 1.8, out: true, core: [[lx + 1, ly + 3], [lx + 2, ly + 5]] });
    // floor: rubble and gravel, the rails, an ore cart on them, a heap of sunstone ore by a pick
    const GF = ['#150f0d', '#1c1511', '#241a15', '#2e2219', '#3a2c1f'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const pool = Math.max(0, 1 - Math.hypot((x - W * .3) / 1.6, y - gy - 4) / 24, 1 - Math.hypot((x - W * .74) / 1.6, y - gy - 3) / 22); gnd.set(x, y, GF[clampI(Math.round((y - gy) / (H - gy) * 2 + pool * 2.2 + bayer(x, y) * .8 - .4 + (vnoise(x * .12, y * .25, 124) - .5)), 4)]); if (hash(x, y, 128) < .05) gnd.set(x, y, hx(hash(x, y, 129) < .5 ? '#3e3226' : '#0a0706')); }
    rails(gnd, W * .5, 11, vx, vy, gy, ['#2a1c12', '#3a3a40', '#8a8a94']);
    const cx = W * .545, cy = gy + 7; gnd.poly([[cx - 7, cy - 6], [cx + 7, cy - 6], [cx + 5.5, cy], [cx - 5.5, cy]], hx('#4a4448')); gnd.line(cx - 7, cy - 6, cx + 7, cy - 6, hx('#8a8490')); gnd.rect(cx - 5, cy - 4, 10, 1, hx('#2e2a2e'));
    for (const d of [-4, 3]) { gnd.disc(cx + d, cy + .5, 1.3, hx('#1a1616')); gnd.set(cx + d, cy + .5, hx('#6a6468')); }
    for (const [dx, c] of [[-4, '#8a6a3a'], [-1, '#e8a040'], [2, '#6a5a4a'], [4, '#c88a3a']]) gnd.disc(cx + dx, cy - 6.5, 1.4, hx(c));
    const ox = W * .3, oy = H - 10;
    for (let k = 0; k < 16; k++) { const a = hash(k, 1, 125) * Math.PI, r = hash(k, 2, 125) * 8, x = ox + Math.cos(a) * r * 1.6, y = oy - Math.sin(a) * r * .8, gold = k % 4 === 0; gnd.disc(x, y, 1.6, hx(gold ? '#e89a30' : k & 1 ? '#3a2c22' : '#4a3a2c')); if (gold) { gnd.set(x - .5, y - .5, hx('#ffe08a')); lights.push({ x: x + .5, y, r: 4, c: '#ffb040', a: .25, pulse: 1, flick: .7 + k * .05 }); } }
    gnd.line(ox + 9, oy + 1, ox + 15, oy - 12, hx('#5a3e24')); gnd.poly([[ox + 11, oy - 12], [ox + 18, oy - 13], [ox + 20, oy - 11], [ox + 15, oy - 11]], hx('#7a7a84')); gnd.line(ox + 11, oy - 12, ox + 18, oy - 13, hx('#b8b8c4'));
    return { layers: [sky, far, mid, gnd], lights, fx: 'grit', darkAmb: .15 };
  },
  // the Glass Heart: a cavern of living glass round a knot of crystal that burns like a forge inside; glass columns
  // round the rim catch its light, shards glow in the fused floor, cracks run hot, and a bright pool lies still
  'glass-heart'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const cx = W * .54, cy = gy - H * .22, cell = 12, pt = (i, j) => [(i + .15 + hash(i, j, 131) * .7) * cell, (j + .15 + hash(i, j, 132) * .7) * cell];
    // the cavern wall: facets of smoky glass turned a little toward the heart or away from it, their edges lit
    const F = ['#0a080c', '#100c12', '#181018', '#22141c', '#301a1e', '#46221c'].map(hx), E = hx('#d8783a'), EC = hx('#5a8088');
    for (let y = 0; y < gy + 3; y++) for (let x = 0; x < W; x++) {
      const i0 = Math.floor(x / cell), j0 = Math.floor(y / cell); let d1 = 1e9, d2 = 1e9, id = 0;
      for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) { const [px, py] = pt(i, j), d = (px - x - .5) ** 2 + (py - y - .5) ** 2; if (d < d1) { d2 = d1; d1 = d; id = i * 131 + j; } else if (d < d2) d2 = d; }
      const near = 1 - Math.min(1, Math.hypot(x - cx, (y - cy) * 1.3) / (W * .55));
      const f = hash(id, 1, 133), sheen = f > .86 ? 1.6 : 0, lit = near * 4 + (f - .5) * 2.4 + sheen + ((x - y * .6 + id) % 7 === 0 && f > .6 ? 1 : 0);
      sky.set(x, y, F[clampI(Math.round(lit + bayer(x, y) * .6 - .3), 5)]);
      if (Math.sqrt(d2) - Math.sqrt(d1) < 1 && hash(id, 2, 133) < .7) sky.set(x, y, near > .35 ? E : EC, .15 + near * .45);
    }
    sky.glow(cx, cy, 60, hx('#a8401a'), .4); sky.glow(cx, cy, 28, hx('#ffb050'), .35);
    // the heart: a spray of crystal round a white-hot core
    far.disc(cx, cy + 9, 9, hx('#2a1210')); far.disc(cx, cy + 8, 6, hx('#6a2a14'));
    for (const [dx, h, w, ln] of [[-9, 11, 2.6, -.4], [9, 12, 2.6, .38], [-5, 18, 3.2, -.18], [5, 16, 3, .2], [0, 24, 3.8, .02], [-2, 8, 2.2, -.05], [3, 7, 2, .1]]) shard(far, cx + dx, cy + 9, h, w, ln, ['#a8481e', '#ffb45a'], '#fff4d0');
    far.disc(cx, cy + 5, 2.6, hx('#ffe8b0')); far.disc(cx - .5, cy + 4.5, 1.2, hx('#ffffff'));
    lights.push({ x: cx, y: cy + 3, r: 22, c: '#ffb050', a: .5, pulse: 1, flick: .5, core: [[Math.round(cx), Math.round(cy + 4)]] });
    // glass columns round the rim, cool glass rim-lit warm on the side that faces the heart
    for (const [x, h, w] of [[W * .05, H * .66, 6], [W * .17, H * .5, 4], [W * .84, H * .56, 5], [W * .96, H * .7, 6.5]]) {
      prism(far, x, gy + 3, h, w, ['#16242a', '#2e4850'], '#9ad0d0'); const sd = x < cx ? 1 : -1;
      for (let y = Math.round(gy + 3 - h + w * 1.3); y < gy + 3; y++) far.set(x + sd * (w - .5), y, hx('#f0a050'), .55 + .3 * Math.sin(y * .4));
    }
    // mid: shards standing in the floor, glowing at the root
    for (const [x, h, w, ln] of [[W * .28, 9, 2.2, .3], [W * .36, 5, 1.6, -.2], [W * .68, 11, 2.6, -.25], [W * .76, 6, 1.8, .15], [W * .6, 4, 1.4, .1]]) {
      shard(mid, x, gy + 3, h, w, ln, ['#1e3036', '#4a7078'], '#c8f0f0'); mid.set(x, gy + 2, hx('#ff9a48')); lights.push({ x: x + .5, y: gy + 2, r: 4, c: '#ff9a48', a: .28, pulse: 1, flick: .8 + x * .01 });
    }
    // floor: fused glass, dark and glossy, holding the heart's light; hot cracks; the pool, bright and still
    const G = ['#140e10', '#1e1416', '#2a1a1a', '#3a221c', '#4e2c1e'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (y - gy) / (H - gy), refl = Math.max(0, 1 - Math.abs(x - cx) / (8 + u * 26)) * (1 - u * .6), warm = Math.max(0, 1 - Math.hypot(x - cx, (y - gy) * 2.2) / (W * .5));
      gnd.set(x, y, G[clampI(Math.round(u * 1.2 + warm * 2.6 + bayer(x, y) * .8 - .4 + (vnoise(x * .08, y * .3, 135) - .5)), 4)]);
      if (refl > 0 && ((x + y) & 1)) gnd.set(x, y, hx('#ffa050'), refl * .45);
    }
    const px0 = W * .44, py0 = gy + 8;
    for (let y = Math.floor(py0 - 4); y <= py0 + 4; y++) for (let x = Math.floor(px0 - 15); x <= px0 + 15; x++) { const e = ((x - px0) / 15) ** 2 + ((y - py0) / 3.6) ** 2; if (e < 1) gnd.set(x, y, hx(e > .75 ? (y < py0 ? '#6a8a88' : '#2a3a3c') : e > .3 ? '#4a8a8a' : '#78c0bc')); }
    gnd.line(px0 - 8, py0 - 1, px0 - 2, py0 - 1, hx('#d8fff8'), .8); gnd.line(px0 + 3, py0 + 1, px0 + 6, py0 + 1, hx('#d8fff8'), .6);
    lights.push({ x: px0, y: py0, r: 12, c: '#8ae0d8', a: .22, pulse: 1, flick: .4 });
    const cracks = [];
    for (let k = 0; k < 6; k++) { let x = hash(k, 1, 136) * W, y = gy + 4 + hash(k, 2, 136) * (H - gy - 8); const pts = [[x, y]]; for (let s = 0; s < 5; s++) { x += 2 + hash(k, s, 137) * 3; y += (hash(k, s, 138) - .5) * 4; pts.push([x, y]); } cracks.push(pts); for (let s = 0; s < 5; s++) gnd.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#4a1a0e')); }
    lights.push({ cracks, c: '#ff8a3a' });
    for (let k = 0; k < 10; k++) { const x = hash(k, 1, 139) * W, y = gy + 3 + hash(k, 2, 139) * (H - gy - 5); shard(gnd, x, y, 2 + hash(k, 3, 139) * 3, 1, (hash(k, 4, 139) - .5), ['#2a3a40', '#6a9098'], '#e0ffff'); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'glint' };
  },
  // the Glass Flats at noon: a white sky over the dune sea, the Glass Mesa on the horizon floating on its mirage,
  // and in front a floor of glassed sand, dark and glossy, holding the sky in its cracks; a raider's banner
  'glass-flats'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#2a5890', '#4270a6', '#6a90b6', '#9cb2c4', '#c8ccc6', '#e8e0c8', '#faf2dc'], 0, gy + 2);
    const sx = Math.round(W * .3), sy = Math.round(H * .12);
    sky.glow(sx, sy, 50, hx('#ffffff'), .42); sky.glow(sx, sy, 14, hx('#ffffff'), .7); sky.disc(sx, sy, 5, hx('#ffffff'));
    // far: the Glass Mesa, a ridge of fused dune glinting black and white
    const mt = x => { const u = Math.abs(x - W * .62) / (W * .34); return u > 1 ? null : gy - 1 - Math.min(1, (1 - u) * 4) * 8 - vnoise(x * .15, 0, 141) * 2; };
    for (let x = 0; x < W; x++) { const t = mt(x); if (t === null) continue; for (let y = Math.round(t); y < gy + 1; y++) far.set(x, y, hx((x * 3 + y * 5) % 13 < 2 ? '#6a7a88' : y - t < 2 ? '#4a5260' : '#343844')); far.set(x, Math.round(t), hx('#e8f4ff'), .8); }
    // mid: dunes, bright in the noon sun
    dunes(mid, [[W * .24, gy - 6, 30, 12, .45], [W * .1, gy - 11, 28, 13, .4], [W * .86, gy - 12, 36, 13, .4], [W * 1.02, gy - 7, 22, 10, .45], [W * .02, gy - 3, 16, 9, .5]], gy + 3, ['#9a6440', '#b27a4c', '#e2b074', '#f8d49a'], '#fff8e0');
    // Gnash's banner: indigo rags on a spear
    const bx = Math.round(W * .82), by = gy - 17; mid.line(bx, by, bx, gy + 4, hx('#3a2616')); mid.poly([[bx, by - 2], [bx + 1, by - 3], [bx + 2, by - 1]], hx('#c8c8d0'));
    for (let y = 0; y < 8; y++) { const len = 6 - y * .4 + Math.sin(y * 1.3) * 1.2; mid.line(bx + 1, by + 1 + y, bx + 1 + len, by + 1 + y + Math.sin(y) * .5, hx(y % 3 === 2 ? '#2a2a5a' : '#3a3a7a')); }
    // ground: the mirage lying on the sand at the horizon (the sky, and the mesa upside down in it), then the flats: sand
    // giving way to glassed sand, dark and glossy, cracked into plates, holding the sky
    const G = ['#20242e', '#2a303e', '#384258', '#526078', '#7a8aa4', '#a8b8cc'].map(hx), S = ['#b07e4e', '#c8965e', '#dcae74', '#ecc88e'].map(hx), CK = hx('#e8f4ff'), vx = W * .5;
    for (let y = gy; y < H; y++) {
      const u = (y - gy) / (H - gy), z = 1 / (u + .06);
      for (let x = 0; x < W; x++) {
        const X = (x - vx) / W * z * 2.4, Z = z * 1.3, sand = vnoise(X * .7, Z * .5, 142) + (z - 3) * .06;
        if (sand > .56) { gnd.set(x, y, S[clampI(Math.round(u * 3.2 + bayer(x, y) * .8 - .4 + (sand > .62 ? 0 : -1)), 3)]); continue; }
        const i0 = Math.floor(X), j0 = Math.floor(Z); let d1 = 9, d2 = 9, id = 0;
        for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) { const d = (i + hash(i, j, 143) - X) ** 2 + (j + hash(i, j, 144) - Z) ** 2; if (d < d1) { d2 = d1; d1 = d; id = i * 97 + j; } else if (d < d2) d2 = d; }
        const glare = Math.max(0, 1 - Math.abs(x - sx) / (3 + u * 12)) * (1 - u * .5);
        gnd.set(x, y, G[clampI(Math.round(5.2 - u * 5 + (hash(id, 1, 146) - .5) * 1.8 + glare * 1.6 + bayer(x, y) * .9 - .45), 5)]);
        if (glare > .6 && hash(x, y, 148) < .12) gnd.set(x, y, CK, .8);
        if (Math.sqrt(d2) - Math.sqrt(d1) < z * 2.4 / W * .9) gnd.set(x, y, CK, .3 + u * .4);
      }
    }
    for (let y = gy; y < gy + 5; y++) for (let x = 0; x < W; x++) {
      if (hash(x >> 2, y, 147) < .25) continue;
      const t = mt(x), inv = t !== null && y - gy < (gy - t) * .5;
      gnd.set(x, y, hx(inv ? ((x + y) & 1 ? '#56606e' : '#6a7684') : y - gy < 2 ? '#e4e8e4' : '#c4d2de'), inv ? .8 : .7 - (y - gy) * .1);
    }
    for (const [x, y, h, w, ln] of [[W * .06, H - 4, 12, 2.6, .25], [W * .95, H - 8, 9, 2.2, -.3], [W * .44, gy + 9, 5, 1.4, .2]]) shard(gnd, x, y, h, w, ln, ['#262c38', '#6a7a90'], '#f0f8ff');
    return { layers: [sky, far, mid, gnd], lights, fx: 'glint' };
  },
  // Miragewell by night: palms against the stars and the moon, the well-court's mud-brick wall with torches on its
  // corners, the Well of Mirages breathing a pale shimmer, the oasis pool holding the moon, and the Well Fire
  miragewell(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#05081a', '#080e24', '#0d1630', '#141e3c', '#1c2848', '#263254'], 0, gy + 2);
    stars(sky, 60, gy - 6, 151);
    const mx = Math.round(W * .2), my = Math.round(H * .16);
    sky.glow(mx, my, 30, hx('#8aa0c8'), .25); sky.disc(mx, my, 5, hx('#dce4f0')); sky.disc(mx + 1.5, my - 1, 4.2, hx('#1a2444'), .9);
    // far: dunes under the moon, and palms of the far grove
    ridge(far, x => gy - 3 - vnoise(x * .05, 0, 152) * 6, gy + 2, '#101830', '#4a5a88', .6);
    for (const [x, h, ln] of [[W * .6, 24, .15], [W * .68, 19, -.1], [W * .74, 22, .2], [W * .06, 21, -.15]]) palm(far, x, gy, h, ln, '#0a0e20', '#0a1224', x | 0);
    // the well-court: a mud-brick wall with a gateway, torches on its corners, a flat-roofed house with a lit door
    const WB = hx('#2a2230'), WL = hx('#4a3e50'), wy = gy - 9;
    for (let x = 0; x < W; x++) { if (x > W * .56 && x < W * .64) continue; const top = wy + (Math.floor(x / 5) % 2 ? 0 : -1.5); for (let y = Math.round(top); y < gy + 2; y++) mid.set(x, y, WB); mid.set(x, Math.round(top), WL); if (hash(x, 1, 153) < .08) mid.set(x, wy + 4 + hash(x, 2, 153) * 5, hx('#1c1622')); }
    for (const x of [W * .56, W * .64]) { mid.rect(x - 2, wy - 5, 4, gy + 2 - wy + 5, WB); mid.rect(x - 2, wy - 5, 4, 1, WL); }
    for (const x of [W * .25, W * .78]) { mid.rect(x - .5, wy - 5, 1.5, 5, hx('#3a2616')); lights.push({ x: x + .2, y: wy - 7, r: 12, c: '#ff9a3a', a: .45, torch: 1, flick: 3 + x * .01 }); }
    const hx0 = W * .82; mid.rect(hx0, wy - 8, 22, gy + 2 - wy + 8, hx('#34283a')); mid.rect(hx0, wy - 8, 22, 1, hx('#54465a')); mid.rect(hx0 + 5, gy - 7, 4, 7, hx('#ffb060')); lights.push({ x: hx0 + 7, y: gy - 3, r: 9, c: '#ffb060', a: .3, flick: 1.7 });
    // the Well of Mirages: a stone well-head under its windlass, breathing a pale shimmer
    const wx = W * .47, wyy = gy + 5;
    for (let y = wyy - 8; y <= wyy; y++) for (let x = Math.floor(wx - 10); x <= wx + 10; x++) { const u = (x - wx) / 10; if (Math.abs(u) <= 1) mid.set(x, y, hx((y - wyy) % 3 === 0 ? '#2a2438' : Math.abs(u) > .8 ? '#3a3448' : u < -.3 ? '#6a6080' : '#524a66')); }
    for (let x = Math.floor(wx - 10); x <= wx + 10; x++) { mid.set(x, wyy - 9, hx('#b0a8c4')); mid.set(x, wyy - 8, hx(Math.abs(x - wx) < 8 ? '#0a1a2a' : '#8a8098')); }
    for (const d of [-8, 8]) mid.rect(wx + d - .5, wyy - 22, 1.5, 13, hx('#3a2616')); mid.rect(wx - 9, wyy - 22, 19, 1.5, hx('#5a3e24')); mid.line(wx, wyy - 20.5, wx, wyy - 14, hx('#8a7a5a')); mid.rect(wx - 1.5, wyy - 14, 4, 3, hx('#5a4028')); mid.rect(wx - 1.5, wyy - 14, 4, 1, hx('#7a5a38'));
    for (let y = wyy - 30; y < wyy - 8; y++) for (let x = Math.floor(wx - 7); x <= wx + 7; x++) { const v = (wyy - 8 - y) / 22, sh = Math.sin(y * 1.3 + x * .4) + Math.sin(y * .5 - x); if (((x + y) & 1) && sh > 1.2 - v && Math.abs(x - wx - Math.sin(y * .3) * 2) < 7 * (1 - v * .5)) mid.set(x, y, hx(sh > 1.6 ? '#e0fffa' : '#8ae8e0'), .5 * (1 - v)); }
    lights.push({ x: wx, y: wyy - 10, r: 16, c: '#8ae8e0', a: .34, pulse: 1, flick: .35 });
    // ground: sand and the court's paving; the pool holding the moon; reeds; the Well Fire; palms framing the view
    paving(gnd, gy, gy - (H - gy) * 1.2, ['#16162a', '#1e1e34', '#262640', '#2e2e4a', '#3a3858'], '#0c0c1a', 10, 15, 154, (x, y) => (y - gy) / (H - gy) * 1.6 + .6 + Math.max(0, 1 - Math.hypot(x - W * .66, (y - gy - 10) * 2) / 26) * 1.6);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.abs(x - W * .5) / (W * .5) - .62 + (vnoise(x * .1, y * .2, 156) - .5) * .3; if (e > 0 && (e > .08 || (x + y) & 1)) gnd.set(x, y, hx(e > .2 ? '#2e2c46' : '#26243c')); }
    const pc = W * .2, py = gy + 9;
    for (let y = Math.floor(py - 4); y <= py + 4; y++) for (let x = Math.floor(pc - 24); x <= pc + 24; x++) { const e = ((x - pc) / 24) ** 2 + ((y - py) / 4.2) ** 2; if (e < 1) gnd.set(x, y, hx(e > .7 && y < py ? '#3a4a70' : '#0c1428')); }
    for (let y = gy + 6; y < py + 4; y += 1.5) { const len = 1 + hash(y | 0, 1, 155) * 4, x0 = mx + (hash(y | 0, 2, 155) - .5) * 5 - len / 2; if (((x0 - pc) / 24) ** 2 + ((y - py) / 4.2) ** 2 < .9) gnd.line(x0, y, x0 + len, y, hx('#c8d4ec'), .7); }
    for (let x = Math.floor(pc - 26); x < pc - 12; x++) if (hash(x, 3, 155) < .5) gnd.line(x, py + 1, x + (hash(x, 4, 155) - .5) * 2, py - 5 - hash(x, 5, 155) * 5, hx('#1a2a22'));
    fireBowl(gnd, Math.round(W * .66), gy + 10, 3, lights, 'lit');
    palm(gnd, W * .03, H + 2, H * .6, .25, '#2a2232', '#1a3228', 3); palm(gnd, W * 1.0, H + 2, H * .55, -.3, '#2a2232', '#1a3228', 4);
    return { layers: [sky, far, mid, gnd], lights, fx: 'mirage' };
  },
  // Scorchgate Ruins: a smoke-red sky over the burned fortress city, broken towers and the keep, the Last Watchfire
  // cold on its wall, charred trees, and ash over everything, with embers still alive in the cracks
  scorchgate(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#120a0c', '#1e0e0e', '#321410', '#4e1c12', '#6e2a14', '#8a3a18', '#a04e22'], 0, gy + 2);
    sky.glow(W * .64, gy - 4, 40, hx('#e0602a'), .35); sky.disc(W * .64, gy - 12, 6, hx('#e8703a'), .55);
    for (let k = 0; k < 3; k++) { const x0 = W * (.2 + k * .3) + hash(k, 1, 161) * 10; for (let y = 0; y < gy - 8; y++) { const u = y / (gy - 8), wd = 3 + (1 - u) * 12, x = x0 + Math.sin(y * .12 + k) * 4 + (1 - u) * 10; for (let d = -wd; d < wd; d++) if (((x + d + y) & 1) && hash((x + d) | 0, y, 162) < .8) sky.set(x + d, y, hx('#1a0c0c'), .25 * (1 - Math.abs(d) / wd)); } }
    // far: the curtain wall and its broken towers, the keep's stump in the middle
    const K = hx('#160c0c'), KR = hx('#b0502a');
    ridge(far, x => gy - 6 - (Math.floor(x / 4) % 2 ? 1 : 0) - (hash(Math.floor(x / 9), 1, 163) < .3 ? -3 : 0), gy + 2, '#1e1010', '#8a3a1e', .5);
    for (const [x, w, h, br] of [[W * .08, 8, 20, 4], [W * .34, 7, 15, 6], [W * .86, 9, 22, 3]]) { const t = gy - h; far.rect(x - w / 2, t, w, h + 2, K); for (let k = 0; k < w; k++) far.set(x - w / 2 + k, t - (k % 3 === 0 ? 0 : 1) - hash(k, x | 0, 164) * br, K); far.line(x + w / 2 - 1, t, x + w / 2 - 1, gy, KR, .45); far.rect(x - 1, t + 5, 2, 3, hx('#060404')); }
    const kx = W * .55; far.poly([[kx - 12, gy + 2], [kx - 11, gy - 28], [kx - 6, gy - 31], [kx - 2, gy - 26], [kx + 3, gy - 33], [kx + 11, gy - 27], [kx + 12, gy + 2]], K);
    far.line(kx + 11, gy - 27, kx + 12, gy, KR, .5); far.line(kx + 3, gy - 33, kx + 11, gy - 27, KR, .6); for (const [x, y] of [[kx - 5, gy - 20], [kx + 4, gy - 22], [kx - 1, gy - 12]]) far.rect(x, y, 2, 3, hx('#050303'));
    // mid: the last wall, its gate fallen in the gap; the Last Watchfire cold on its stand; charred trees
    const LW = ['#241816', '#2e201c', '#3a2a24', '#4a3630'], top = x => Math.round(x < W * .5 ? gy - 14 + Math.max(0, x - W * .28) * 1.4 : gy - 12 + Math.max(0, W * .72 - x) * 1.6) + (hash(Math.floor(x / 3), 1, 166) < .25 ? 2 : 0);
    const soot = (x, y) => (vnoise(x * .12, y * .08, 169) > .62 ? 1.3 : 0);
    masonry(mid, 0, gy - 14, W * .36, gy + 4, LW, '#140c0c', 9, 5, 165, (x, y) => (y < top(x) ? null : 1.6 - soot(x, y)));
    masonry(mid, W * .64, gy - 12, W, gy + 4, LW, '#140c0c', 9, 5, 167, (x, y) => (y < top(x) ? null : 1.8 - soot(x, y) - (x > W * .9 ? .6 : 0)));
    for (let x = 0; x < W; x++) if (x < W * .36 || x >= W * .64) mid.set(x, top(x), KR, .45);
    const wfx = Math.round(W * .2), wfy = gy - 25, IR = hx('#2a2422'), IL = hx('#5a4c46');
    for (const d of [-3, 0, 3]) mid.line(wfx + d * .4, wfy + 5, wfx + d, top(wfx + d), IR);
    mid.poly([[wfx - 5, wfy], [wfx + 5, wfy], [wfx + 3, wfy + 5], [wfx - 3, wfy + 5]], IR); for (let d = -4; d <= 4; d += 2) mid.line(wfx + d, wfy + 1, wfx + d * .65, wfy + 4.5, IL, .8);
    mid.line(wfx - 5, wfy, wfx + 5, wfy, hx('#7a6a60')); mid.set(wfx + 5, wfy, KR); mid.poly([[wfx - 4, wfy], [wfx - 2, wfy - 2], [wfx + 1, wfy - 2.5], [wfx + 4, wfy]], hx('#5a5250')); mid.line(wfx - 2, wfy - 2, wfx + 1, wfy - 2.5, hx('#8a8280'));
    const CT = hx('#0e0808');
    branch(mid, W * .42, gy + 4, -Math.PI / 2 + .15, 14, 1.8, 3, CT, 17); branch(mid, W * .74, gy + 5, -Math.PI / 2 - .2, 12, 1.6, 3, CT, 23);
    // ground: ash and cinders, rubble, a charred beam, the fallen gate leaf, embers alive in the cracks
    sandFloor(gnd, gy, ['#262222', '#2e2828', '#383030', '#423838'], '#4a4240', 168);
    const gx = W * .5, gyy = gy + 8; gnd.poly([[gx - 13, gyy], [gx + 10, gyy - 2.5], [gx + 14, gyy + 5], [gx - 10, gyy + 7]], hx('#3a2418'));
    for (let k = 1; k < 5; k++) gnd.line(gx - 13 + k * 5, gyy - k * .5, gx - 10 + k * 5.4, gyy + 7 - k * .5, hx('#24160e'));
    for (const v of [.25, .75]) gnd.line(gx - 13 + 3 * v, gyy + 7 * v, gx + 10 + 4 * v, gyy - 2.5 + 7.5 * v, hx('#5a5a60')); for (let k = 0; k < 6; k++) gnd.set(gx - 10 + k * 4.2, gyy + 1.2 - k * .4, hx('#8a8a90'));
    gnd.line(gx - 13, gyy, gx + 10, gyy - 2.5, hx('#5a3a26'), .8);
    gnd.thick(W * .06, H - 6, W * .3, H - 12, 1.8, 1.4, hx('#140c0a')); gnd.line(W * .06, H - 8, W * .3, H - 13.5, hx('#5a3a2a'), .7);
    for (let k = 0; k < 12; k++) { const x = hash(k, 1, 169) * W, y = gy + 2 + hash(k, 2, 169) * (H - gy - 4), s = 1.2 + hash(k, 3, 169) * 2.4; gnd.rect(x, y - s, s * 1.6, s, hx('#3e3230')); gnd.rect(x, y - s, s * 1.6, 1, hx('#6a5a54')); }
    const cracks = [];
    for (let k = 0; k < 6; k++) { let x = hash(k, 1, 170) * W, y = gy + 4 + hash(k, 2, 170) * (H - gy - 8); const pts = [[x, y]]; for (let s = 0; s < 5; s++) { x += 1.5 + hash(k, s, 171) * 3; y += (hash(k, s, 172) - .5) * 4; pts.push([x, y]); } cracks.push(pts); for (let s = 0; s < 5; s++) gnd.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#1a0a06')); }
    lights.push({ cracks, c: '#ff7a2a' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'ash' };
  },
  // the Scorchgate Vaults: a pillared hall of dark stone drifted with ash, braziers on their stands, old shields on
  // the walls, the ash-black seal on the far door, grey light falling down the stair, and embers alive in the floor
  // where the fire stopped. In the dark the braziers are out
  'scorchgate-vaults'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    masonry(sky, 0, 0, W, gy + 3, ['#0e0c10', '#141116', '#1a161c', '#221c22', '#2a2228'], '#08070a', 12, 6, 181, (x, y) => 2.6 - Math.abs(x - W / 2) / (W / 2) * 1.6 - (y < 12 ? 1 : 0));
    // the far door under its arch, and the seal: an ash-black disc with a sigil, its rim smouldering
    const dx = W * .52, dt = gy - 30, DB = hx('#0a0808');
    sky.poly(Array.from({ length: 13 }, (_, k) => { const a = Math.PI + k / 12 * Math.PI; return [dx + Math.cos(a) * 13, dt + 12 + Math.sin(a) * 12]; }).concat([[dx + 13, gy + 3], [dx - 13, gy + 3]]), hx('#3a3036'));
    sky.poly(Array.from({ length: 13 }, (_, k) => { const a = Math.PI + k / 12 * Math.PI; return [dx + Math.cos(a) * 11, dt + 12 + Math.sin(a) * 10.5]; }).concat([[dx + 11, gy + 3], [dx - 11, gy + 3]]), hx('#1e1614'));
    for (let x = dx - 10; x < dx + 10; x += 4) sky.line(x, dt + 3, x, gy + 2, DB);
    sky.disc(dx, dt + 16, 6.5, hx('#050404')); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; sky.set(dx + Math.cos(a) * 6.2, dt + 16 + Math.sin(a) * 6.2, hx('#c8501e'), .5 + .4 * hash(k, 1, 182)); }
    sky.line(dx, dt + 12, dx, dt + 20, hx('#5a2a18')); sky.line(dx - 3, dt + 14, dx + 3, dt + 18, hx('#5a2a18')); sky.line(dx + 3, dt + 14, dx - 3, dt + 18, hx('#5a2a18'));
    lights.push({ x: dx, y: dt + 16, r: 9, c: '#ff6a2a', a: .22, pulse: 1, flick: .4 });
    // shields hung between the arches
    for (const x of [W * .2, W * .8]) { const y = gy - 26; sky.disc(x, y, 4, hx('#3a3a40')); sky.disc(x, y, 3, hx('#4a3a2e')); sky.line(x - 3, y, x + 3, y, hx('#6a6a70')); sky.line(x, y - 3, x, y + 3, hx('#6a6a70')); sky.set(x - 1.5, y - 2, hx('#8a8a94')); }
    // pillars: a far pair either side of the door, and great near pillars framing the hall
    const pillar = (L, x, w, y0, y1, c) => { const C = c.map(hx); for (let y = y0; y < y1; y++) for (let xx = Math.floor(x - w / 2); xx < x + w / 2; xx++) { const u = (xx - x + w / 2) / w; L.set(xx, y, C[clampI(Math.round(u < .25 ? 3 : u > .8 ? 0 : 2 - u + bayer(xx, y) * .6), 3)]); } L.rect(x - w / 2 - 1, y0, w + 2, 2, C[3]); L.rect(x - w / 2 - 1, y1 - 2, w + 2, 2, C[1]); };
    for (const x of [W * .34, W * .7]) pillar(far, x, 6, 0, gy + 3, ['#141016', '#1e181e', '#2a2228', '#3a3036']);
    for (const x of [W * .04, W * .96]) pillar(mid, x, 12, 0, gy + 8, ['#0c0a0e', '#16121a', '#221c24', '#322a32']);
    // braziers on their stands, lit (they go out in the dark)
    for (const x of [Math.round(W * .24), Math.round(W * .8)]) { mid.rect(x - .5, gy - 8, 1.5, 11, hx('#2a2226')); mid.line(x - 3, gy + 3, x, gy, hx('#2a2226')); mid.line(x + 3, gy + 3, x, gy, hx('#2a2226')); fireBowl(mid, x, gy - 9, 3, lights, 'lit', true); }
    // grey light falling down the stair from the upper left
    const beam = [[W * .1, 0], [W * .24, 0], [W * .46, H], [W * .2, H]], beamA = (px, py) => (((px + py) & 1) ? .06 : .1) * (1 - py / H * .5);
    far.poly(beam, hx('#b8b0b8'), (px, py) => (py < gy ? beamA(px, py) : 0)); lights.push({ beam, a: .35 });
    // floor: flagstones running away to the door, drifted with ash, embers alive in the cracks
    paving(gnd, gy, gy - (H - gy) * 1.4, ['#161218', '#1e181e', '#262026', '#2e272c'], '#0a080a', 11, 14, 183, (x, y) => (y - gy) / (H - gy) * 1.3 + .6);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const v = vnoise(x * .05, y * .3, 184) + Math.max(0, 1 - Math.min(x, W - x) / (W * .2)) * .35; if (v > .62 && ((x + y) & 1 || v > .72)) gnd.set(x, y, hx(v > .76 ? '#3e383a' : '#2e2a2c'), Math.min(1, (v - .6) * 4)); }
    gnd.poly(beam, hx('#b8b0b8'), (px, py) => (py >= gy ? beamA(px, py) : 0));
    const cracks = [];
    for (let k = 0; k < 5; k++) { let x = W * (.3 + hash(k, 1, 185) * .4), y = gy + 3 + hash(k, 2, 185) * (H - gy - 6); const pts = [[x, y]]; for (let s = 0; s < 5; s++) { x += (hash(k, s, 186) - .5) * 6; y += 1 + hash(k, s, 187) * 2; pts.push([x, y]); } cracks.push(pts); for (let s = 0; s < 5; s++) gnd.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#1a0806')); }
    lights.push({ cracks, c: '#ff6a2a' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'ash', darkAmb: .14 };
  },
};

// the dark treatment: everything falls toward a violet-black, except around the lights that stay lit
// (a light with out: true goes out in the dark) and inside beams of moonlight
function inPoly(px, py, pts) { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
function darkPass(P, W, H) {
  const keep = P.lights.filter(g => !g.out), holes = keep.filter(g => g.x !== undefined && g.r && g.a > 0), beams = keep.filter(g => g.beam);
  const amb = P.darkAmb ?? .2, f = new Float32Array(W * H), tint = hx('#0a0814');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = amb;
    for (const g of holes) { const d = Math.hypot(x + .5 - g.x, y + .5 - g.y) / (g.r * 2.6); if (d < 1) v += (1 - d) * (1 - d) * Math.min(1.2, g.a * 2.4); }
    for (const b of beams) if (inPoly(x + .5, y + .5, b.beam)) v += b.a * (1 - Math.min(1, (y - b.beam[0][1]) / (H * 1.2)));
    f[y * W + x] = Math.min(1, v + bayer(x, y) * .05);
  }
  for (const L of P.layers) {
    const d = L.d;
    for (let i = 0; i < W * H; i++) { const j = i * 4; if (!d[j + 3]) continue; const k = f[i]; d[j] = tint[0] + (d[j] - tint[0]) * k; d[j + 1] = tint[1] + (d[j + 1] - tint[1]) * k; d[j + 2] = tint[2] + (d[j + 2] - tint[2]) * Math.min(1, k * 1.15); }
  }
  return Object.assign({}, P, { lights: keep });
}

const layerCache = lru(24), baseCache = lru(24);
function painted(key, w, h, dark) {
  const S = spec(key, dark);
  return layerCache.get(`${S.base}|${w}|${h}|${S.dark ? 1 : 0}`, () => {
    const gy = Math.round(h * S.geo.horizon), P = { ...PAINT[S.base](w, h, gy, S.dark), gy, B: S.B };
    return S.dark ? darkPass(P, w, h) : P;
  });
}
export function backdropLayers(key, o = {}) {
  const w = o.w || 160, h = o.h || 96, m = o.margin || 0, P = painted(key, w + 2 * m, h, o.dark);
  const ids = ['sky', 'far', 'mid', 'ground'], par = [0, .2, .5, 1];
  return { layers: P.layers.map((L, i) => ({ id: ids[i], img: L.img(), parallax: par[i] })), horizon: P.gy, floor: [Math.round(h * P.B.floor[0]), h] };
}
function composite(key, w, h, dark) {
  const S = spec(key, dark);
  return baseCache.get(`${S.base}|${w}|${h}|${S.dark ? 1 : 0}`, () => {
    const P = painted(key, w, h, dark), out = new Uint8ClampedArray(w * h * 4);
    for (const L of P.layers) { const d = L.d; for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (!a) continue; out[i] = out[i] * (1 - a) + d[i] * a; out[i + 1] = out[i + 1] * (1 - a) + d[i + 1] * a; out[i + 2] = out[i + 2] * (1 - a) + d[i + 2] * a; out[i + 3] = 255; } }
    return out;
  });
}
// deterministic ambient particles for time t
export function ambient(key, t, o = {}) {
  const S = spec(key, o.dark), w = o.w || 160, h = o.h || 96, B = S.B, gy = Math.round(h * S.geo.horizon), out = [];
  const n = o.count || 18;
  for (let k = 0; k < n; k++) {
    const r1 = hash(k, 1, 7), r2 = hash(k, 2, 7), r3 = hash(k, 3, 7), sp = .5 + r2;
    switch (B.fx) {
      case 'ember': { const ph = (t * .06 * sp + r3) % 1; out.push({ x: (r1 * w + Math.sin(t * 1.3 + k) * 4 + t * 3) % w, y: h - ph * h * 1.1, c: r2 > .5 ? [255, 176, 74] : [224, 98, 42], a: Math.min(1, (1 - ph) * 2) * .85 }); break; }
      case 'spore': { const ph = (t * .025 * sp + r3) % 1; const fire = k % 4 === 0; out.push(fire ? { x: r1 * w + Math.sin(t * .7 + k) * 6, y: gy - 10 + r3 * (h - gy) + Math.cos(t * .9 + k) * 4, c: [216, 240, 122], a: Math.sin(t * 3 + k * 2.1) > .2 ? .9 : 0 } : { x: r1 * w + Math.sin(t * .6 + k * 1.7) * 5, y: h - ph * h, c: [184, 240, 160], a: .55 * Math.min(1, (1 - ph) * 3) }); break; }
      case 'leaf': { const ph = (t * .05 * sp + r3) % 1; out.push({ x: (r1 * w + ph * 40 + Math.sin(t * 2 + k) * 3) % w, y: ph * h, c: r2 > .6 ? [168, 110, 52] : [106, 122, 64], a: .8 }); break; }
      case 'blight': { const ph = (t * .03 * sp + r3) % 1; out.push({ x: r1 * w + Math.sin(t * .8 + k * 1.3) * 3, y: h - ph * (h - 10), c: k % 3 ? [164, 92, 240] : [180, 214, 90], a: Math.min(1, (1 - ph) * 2, ph * 4) * .8 }); break; }
      // M3: wisps and bog bubbles, dust in moonbeams, drifting petals, fireflies
      case 'mire': { const ph = (t * .05 * sp + r3) % 1; out.push(k % 3 === 0 ? { x: r1 * w + Math.sin(t * .7 + k * 1.3) * 6, y: gy - 8 + r3 * (h - gy) * .8 + Math.cos(t * .9 + k) * 3, c: [168, 240, 190], a: Math.max(0, Math.sin(t * 2.2 + k * 2.1)) * .9 } : { x: r1 * w + Math.sin(t + k) * .6, y: gy + 2 + r3 * (h - gy) * .34 - ph * 5, c: [130, 180, 160], a: ph < .8 ? .45 : 0 }); break; }
      case 'dust': out.push({ x: (r1 * w + t * 1.6 * sp) % w, y: r3 * h * .92 + Math.sin(t * .5 + k * 1.7) * 3, c: [196, 206, 220], a: .22 + .2 * Math.sin(t * .8 + k) }); break;
      case 'petal': { const ph = (t * .045 * sp + r3) % 1; out.push({ x: (r1 * w + ph * 34 + Math.sin(t * 1.4 + k) * 4) % w, y: ph * h, c: k % 4 === 0 ? [255, 244, 214] : k % 2 ? [240, 190, 206] : [248, 222, 232], a: .85 }); break; }
      case 'firefly': out.push({ x: r1 * w + Math.sin(t * .5 + k * 1.3) * 7, y: gy - 22 + r3 * (h - gy + 18) + Math.cos(t * .6 + k) * 4, c: k % 3 ? [220, 250, 120] : [255, 214, 120], a: Math.max(0, Math.sin(t * 1.9 + k * 2.3)) * .95 }); break;
      // M4: blown sand, dust in lamplight, glints on glass, mirage motes, falling ash with the odd live ember
      case 'sand': { const ph = (t * .12 * sp + r1) % 1; out.push({ x: ph * (w + 24) - 12, y: gy - 4 + r3 * (h - gy + 4) + Math.sin(t * 2.3 + k) * 1.5, c: r2 > .5 ? [240, 212, 160] : [210, 168, 112], a: .6 * Math.sin(ph * Math.PI) }); break; }
      case 'grit': out.push({ x: (r1 * w + t * 1.1 * sp) % w, y: r3 * h * .92 + Math.sin(t * .45 + k * 1.7) * 3, c: [236, 196, 132], a: .2 + .16 * Math.sin(t * .8 + k) }); break;
      case 'glint': { const s = Math.sin(t * 1.9 * sp + k * 2.7); out.push({ x: r1 * w, y: k % 2 ? gy + r3 * (h - gy) : r3 * h, c: k % 3 ? [255, 250, 232] : [255, 196, 120], a: s > .8 ? (s - .8) * 5 : 0 }); break; }
      case 'mirage': { const ph = (t * .03 * sp + r3) % 1; out.push({ x: r1 * w + Math.sin(t * .6 + k * 1.3) * 5, y: h - ph * (h - 6), c: k % 3 ? [150, 236, 226] : [224, 250, 255], a: Math.min(1, (1 - ph) * 2, ph * 5) * (.35 + .5 * Math.max(0, Math.sin(t * 2.1 + k * 2.3))) }); break; }
      case 'ash': { const ph = (t * .035 * sp + r3) % 1; out.push(k % 6 === 0 ? { x: r1 * w + Math.sin(t * .9 + k) * 4, y: h - ph * h, c: [255, 150, 70], a: Math.min(1, (1 - ph) * 2) * .8 } : { x: (r1 * w + Math.sin(t * .7 + k * 1.3) * 6 + t * 2.5) % w, y: ph * h, c: r2 > .5 ? [150, 144, 140] : [96, 90, 90], a: .75 }); break; }
    }
  }
  if (S.dark) for (const p of out) p.a *= .55;
  return out;
}
// renderBackdrop(key, { w, h, t, reduced, dark }) -> ImageData
export function renderBackdrop(key, o = {}) {
  const w = o.w || 160, h = o.h || 96, t = o.reduced ? 0 : (o.t || 0), P = painted(key, w, h, o.dark);
  const L = layer(w, h); L.d.set(composite(key, w, h, o.dark));
  for (const g of P.lights) {
    if (g.beam) continue;
    if (g.cracks) { const pulse = .35 + .25 * Math.sin(t * 1.7); for (const pts of g.cracks) for (let s = 0; s < pts.length - 1; s++) L.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx(g.c), pulse); continue; }
    if (g.drips) { for (const [x, y] of g.drips) { const ph = ((t * .45 + x * .07) % 1); if (ph < .6) L.set(x, y + ph * 18, hx(g.c), .9); } continue; }
    const fl = o.reduced ? 1 : .8 + .2 * Math.sin(t * g.flick * 3.1) * Math.sin(t * g.flick * 1.7 + 1) + (hash(Math.floor(t * 10), g.x | 0, 3) - .5) * .12;
    L.glow(g.x, g.y, g.r * (g.pulse ? .9 + .1 * Math.sin(t * 2 + g.x) : 1), hx(g.c), g.a * fl);
    if (g.core) for (const [x, y] of g.core) L.set(x, y, hx('#fff0c0'), .7 + .3 * fl);
    if (g.torch) { const fx = Math.round(g.x), fy = Math.round(g.y), f2 = Math.floor(t * 9) % 3; L.set(fx, fy + 1, hx('#ff8a2a')); L.set(fx, fy, hx('#ffd27a')); L.set(fx + (f2 === 1 ? 1 : f2 === 2 ? -1 : 0), fy - 1, hx('#ffb04a')); if (f2 !== 2) L.set(fx, fy - 2, hx('#ff8a2a'), .7); }
  }
  if (!o.reduced) for (const p of ambient(key, t, { w, h, dark: o.dark })) if (p.a > .05) L.set(p.x, p.y, p.c, p.a);
  return L.img();
}
