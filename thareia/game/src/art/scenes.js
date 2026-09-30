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
// M5 adds the eleven Ironspire places; 'ironhold-deeps:dark' and 'frostmere-below:dark' are their dark listings (the
// lamps and the ice's own light go out; the slag, the embers and Hush's light under the ice stay lit).
// M6 adds the twelve Gloomfen places; 'mothers-hollow:dark' and 'drowned-belfry:dark' are their dark listings (the
// moon and the water-light go out; the Mother's lamps and the Sleeper's light stay lit). A listing with mist: true
// (the Lanternfen, the Misthollow Ruins: the foggy maps) draws banks of mist drifting across it in renderBackdrop.
// M7 adds the Hearth Below's four places (the Hollow Hall, the Ash Stair, the Chained Deep, the Worldforge; the Ash
// Stair is its zone's backdrop too). None is dark; each has an ambient of its own (cold ash and the gift's violet; ash
// coming down and embers going up; the Sleeper's slow red motes; the forge's sparks and heat).
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
  // M5: the Ironspire Peaks
  'rockslide-pass': { name: 'The Rockslide Pass', horizon: .58, floor: [.66, 1], fx: 'snow' },
  'peaks-veil': { name: "Peak's Veil", horizon: .6, floor: [.68, 1], fx: 'snow' },
  highfold: { name: 'The Highfold', horizon: .56, floor: [.64, 1], fx: 'snow' },
  'iron-stair': { name: 'The Iron Stair', horizon: .6, floor: [.68, 1], fx: 'snow' },
  ironhold: { name: 'Ironhold', horizon: .58, floor: [.66, 1], fx: 'sparks' },
  'ironhold-deeps': { name: 'The Ironhold Deeps', horizon: .56, floor: [.64, 1], fx: 'sparks' },
  'harrows-forge': { name: "Harrow's Forge", horizon: .56, floor: [.64, 1], fx: 'sparks' },
  stormwatch: { name: 'Stormwatch', horizon: .6, floor: [.68, 1], fx: 'snow' },
  'frost-road': { name: 'The Frost Road', horizon: .6, floor: [.68, 1], fx: 'snow' },
  frostmere: { name: 'Frostmere', horizon: .58, floor: [.66, 1], fx: 'snow' },
  'frostmere-below': { name: 'Beneath Frostmere', horizon: .56, floor: [.64, 1], fx: 'rime' },
  'ironhold-deeps:dark': { name: 'The Deeps, the lamps out', horizon: .56, floor: [.64, 1], fx: 'sparks', dark: true },
  'frostmere-below:dark': { name: 'Beneath Frostmere, where Hush sleeps', horizon: .56, floor: [.64, 1], fx: 'rime', dark: true },
  // M6: the Gloomfen Marsh
  murkway: { name: 'The Murkway', horizon: .58, floor: [.66, 1], fx: 'midge' },
  willowmurk: { name: 'Willowmurk', horizon: .58, floor: [.66, 1], fx: 'leaf' },
  rotbridge: { name: 'Rotbridge', horizon: .56, floor: [.64, 1], fx: 'mire' },
  bogmire: { name: 'Bogmire', horizon: .58, floor: [.66, 1], fx: 'firefly' },
  lanternfen: { name: 'The Lanternfen', horizon: .56, floor: [.64, 1], fx: 'wisp', mist: true },
  'mothers-hollow': { name: "The Mother's Hollow", horizon: .56, floor: [.64, 1], fx: 'moth' },
  'long-boardwalk': { name: 'The Long Boardwalk', horizon: .58, floor: [.66, 1], fx: 'wisp' },
  misthollow: { name: 'The Misthollow Ruins', horizon: .56, floor: [.64, 1], fx: 'bubble', mist: true },
  'drowned-belfry': { name: 'The Drowned Belfry', horizon: .56, floor: [.64, 1], fx: 'bubble' },
  'blackwater-reach': { name: 'The Blackwater Reach', horizon: .58, floor: [.66, 1], fx: 'midge' },
  'tidal-flats': { name: 'The Tidal Flats', horizon: .6, floor: [.68, 1], fx: 'spray' },
  causeway: { name: 'The Blackwater Causeway', horizon: .6, floor: [.68, 1], fx: 'wisp' },
  'mothers-hollow:dark': { name: "The Mother's Hollow, by lamplight", horizon: .56, floor: [.64, 1], fx: 'moth', dark: true },
  'drowned-belfry:dark': { name: 'The Drowned Belfry, where the Sleeper lies', horizon: .56, floor: [.64, 1], fx: 'bubble', dark: true },
  // M7: the Hearth Below
  'hollow-hall': { name: 'The Hollow Hall', horizon: .56, floor: [.64, 1], fx: 'hollow' },
  'ash-stair': { name: 'The Ash Stair', horizon: .6, floor: [.68, 1], fx: 'ashfall' },
  'chained-deep': { name: 'The Chained Deep', horizon: .56, floor: [.64, 1], fx: 'deep' },
  worldforge: { name: 'The Worldforge', horizon: .56, floor: [.64, 1], fx: 'forge' },
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

/* ---------- M5: helpers for the Ironspire ---------- */
// a range of peaks, back to front: each [cx, top, wl, wr] a crag with a jagged skyline; rock in strata, a lit
// left face and a shadowed right; snow above a ragged snowline (lower on the shadow side), streaking down gullies.
// cols: [shadow, rock, lit]; snow: [shadow, lit]
function peaks(L, list, yBase, cols, snow, seed) {
  const C = cols.map(hx), S = snow.map(hx);
  list.forEach(([cx, top, wl, wr], k) => {
    const hd = yBase - top, line = top + hd * (.34 + hash(k, 1, seed) * .16);
    for (let x = Math.floor(cx - wl); x <= cx + wr; x++) {
      const s = x < cx ? (cx - x) / wl : (x - cx) / wr, j = (vnoise(x * .3, k, seed) - .5) * 3 + (vnoise(x * .9, k + 5, seed) - .5) * 1.4;
      const t = Math.round(top + hd * Math.pow(s, .9) + j * s);
      for (let y = Math.max(0, t); y < yBase; y++) {
        const lit = x < cx - (y - top) * .12, g = vnoise(x * .22 + y * .12, y * .12, seed + 3) > .6, sl = line + (x > cx ? 3 : 0) + (vnoise(x * .2, 0, seed + k) - .5) * 6 + (g ? 4 : 0);
        if (y < sl) L.set(x, y, S[lit ? 1 : 0]);
        else { const st = Math.sin((y + (x - cx) * (x < cx ? -.6 : .6)) * .5 + vnoise(x * .1, y * .05, seed) * 5) > .75 ? -1 : 0; L.set(x, y, C[clampI((lit ? 2 : 1) + st - (bayer(x, y) > .8 ? 1 : 0), 2)]); }
      }
      if (t >= 0) L.set(x, t, S[1], .8);
    }
  });
}
// snow from gy down: blue shadow toward the horizon, lighter toward the viewer, drifts in wind-carved lines and the
// odd glitter. cols run dark to light
function snowFloor(L, gy, cols, seed, drift = '#f4f8ff') {
  const G = cols.map(hx), n = G.length - 1, D = hx(drift), H = L.h;
  for (let y = gy; y < H; y++) for (let x = 0; x < L.w; x++) { const v = (y - gy) / (H - gy) * n * .8 + (vnoise(x * .04, y * .1, seed) - .5) * 1.8 + bayer(x, y) * .8 - .4 + 1; L.set(x, y, G[clampI(Math.round(v), n)]); if (hash(x, y, seed + 1) < .006) L.set(x, y, D); }
  for (let k = 0; k < 12; k++) { const u = (k + hash(k, 1, seed) * .5) / 12, y0 = gy + 2 + u * u * (H - gy - 2); for (let x = 0; x < L.w; x++) if (vnoise(x * .06, k * 2, seed + 2) > .5) L.set(x, y0 + Math.sin(x * (.12 - u * .06) + k) * (1 + u * 2), D, .3 + u * .3); }
}
// a boulder at (x, y) (its foot), r across: a lit crown, a shadowed flank, snow on top when `snow`
function boulder(L, x, y, r, cols, snow) {
  const [D, M, Lt] = cols.map(hx);
  L.disc(x, y - r * .7, r, D); L.disc(x - r * .22, y - r * .9, r * .78, M); L.disc(x - r * .42, y - r * 1.12, r * .4, Lt);
  L.rect(x - r, y - r * .25, r * 2, r * .25 + .5, D);
  if (snow) { const S = hx(snow); for (let k = -r * .8; k <= r * .5; k++) L.set(x + k, y - r * 1.6 + Math.abs(k + r * .15) * .5, S); }
}
// a snowy pine: tiers of boughs narrowing to the tip, snow along each tier's top
function pine(L, x, y, h, cols, snow) {
  const [D, M] = cols.map(hx), S = hx(snow);
  L.rect(x - .5, y - h * .2, 1.5, h * .2, hx('#2a1e18'));
  for (let k = 0; k < 4; k++) { const t0 = y - h * (.15 + k * .2), hw = h * (.32 - k * .065), top = t0 - h * .28; L.poly([[x - hw, t0], [x + .5, top], [x + hw + 1, t0]], D); L.poly([[x - hw * .7, t0 - .5], [x + .5, top + 1], [x + .5, t0 - .5]], M); for (let d = -hw * .6; d < hw * .3; d++) L.set(x + d, t0 - 1 - (hw - Math.abs(d)) * .25, S, .85); }
}
// a cairn of stacked stones, rimed on top
function cairn(L, x, y, h, cols, snow) {
  const C = cols.map(hx), S = hx(snow); let yy = y, w = h * .42;
  for (let k = 0; yy > y - h; k++) { const sh = 2 + hash(k, 1, 211) * 2, ww = w * (1 - k * .14); L.disc(x + (hash(k, 2, 211) - .5) * 2, yy - sh * .5, Math.max(1, ww * .5), C[k % C.length]); L.set(x - ww * .3, yy - sh * .8, C[2 % C.length]); yy -= sh; }
  L.disc(x, yy, Math.max(1, w * .28), S);
}
// prayer flags on a line sagging from (x0, y0) to (x1, y1): little squares in the five colours, faded by the weather
function flags(L, x0, y0, x1, y1, sag, seed, alpha = 1) {
  const cols = ['#c8423a', '#e8c050', '#4a8a5a', '#3a62a8', '#e8e4d8'].map(hx), n = Math.max(2, Math.round(Math.abs(x1 - x0) / 3.2));
  for (let k = 0; k <= n * 3; k++) { const u = k / (n * 3); L.set(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag, hx('#3a2e28'), alpha); }
  for (let k = 1; k < n; k++) { const u = k / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag, c = cols[(k + seed) % 5], fl = hash(k, seed, 212) < .5 ? 1 : 0; L.rect(x - .5, y + 1, 2, 2 + fl, mix(c, [120, 120, 130], .25), alpha); }
}
// rough stone in rough courses for hewn halls (shade(x, y) picks the step)
function hewn(L, x0, y0, x1, y1, cols, seed, shade) {
  const C = cols.map(hx), n = C.length - 1;
  for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) { const s = shade(x, y); if (s === null) continue; const n1 = vnoise(x * .09, y * .12, seed) * .7 + vnoise(x * .3, y * .35, seed + 1) * .3; L.set(x, y, C[clampI(Math.round(s + (n1 - .5) * 2.2 + bayer(x, y) * .6 - .3 - (hash(x >> 2, y >> 1, seed + 2) < .05 ? 1 : 0)), n)]); }
}
// a dwarf pillar: a square shaft with a lit left face, knotwork bands and a stepped capital and base
function dwarfPillar(L, x, w, y0, y1, cols, band) {
  const C = cols.map(hx), B = hx(band);
  for (let y = y0; y < y1; y++) for (let xx = Math.floor(x - w / 2); xx < x + w / 2; xx++) { const u = (xx - x + w / 2) / w; L.set(xx, y, C[clampI(Math.round(u < .22 ? 3 : u > .82 ? 0 : 2 - u * .8 + bayer(xx, y) * .5), 3)]); }
  for (const yb of [y0 + 3, y0 + (y1 - y0) * .45, y1 - 6]) { L.rect(x - w / 2, yb, w, 2, B); for (let xx = Math.floor(x - w / 2) + 1; xx < x + w / 2 - 1; xx += 2) L.set(xx, yb + ((xx >> 1) & 1), C[0]); }
  L.rect(x - w / 2 - 1.5, y0, w + 3, 2, C[3]); L.rect(x - w / 2 - 1, y0 + 2, w + 2, 1, C[1]);
  L.rect(x - w / 2 - 1.5, y1 - 2, w + 3, 2, C[1]); L.rect(x - w / 2 - 1.5, y1 - 2, w + 3, 1, C[3]);
}
// a forge furnace: a brick dome with an arched mouth; fire 'lit' glows (out: goes out in the dark), 'embers' keeps a
// low red glow, anything else is cold
function furnace(L, x, y, w, h, fire, lights, out) {
  const B = ['#1a1214', '#2a1c1a', '#3a2620', '#4a3226'].map(hx);
  for (let yy = Math.floor(y - h); yy < y; yy++) { const u = (y - yy) / h, hw = w * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, u - .35) / .65, 2))); for (let xx = Math.floor(x - hw); xx < x + hw; xx++) { const row = Math.floor(yy / 2), bk = (xx + (row & 1) * 2) % 4 === 0 || yy % 2 === 0; L.set(xx, yy, bk ? B[0] : B[clampI(Math.round(1 + (x - xx) / hw * .8 + bayer(xx, yy) * .5), 3)]); } }
  const mw = w * .45, mh = h * .45;
  L.poly(Array.from({ length: 11 }, (_, k) => { const a = Math.PI + k / 10 * Math.PI; return [x + Math.cos(a) * mw, y - mh + mw + Math.sin(a) * mw]; }).concat([[x + mw, y], [x - mw, y]]), hx(fire === 'lit' ? '#ffb04a' : fire === 'embers' ? '#3a0e08' : '#070506'));
  if (fire === 'lit') { L.rect(x - mw + 1, y - 2, mw * 2 - 2, 2, hx('#fff0b0')); lights.push({ x, y: y - mh * .5, r: w * 1.8, c: '#ff9a3a', a: .5, flick: 2.3 + x * .01, out }); }
  if (fire === 'embers') { for (let k = 0; k < mw * 1.6; k++) L.set(x - mw + 1 + hash(k, 1, 213) * (mw * 2 - 2), y - 1 - hash(k, 2, 213) * 2, hx(k % 3 ? '#c8401a' : '#ff8a3a')); lights.push({ x, y: y - 2, r: w * .9, c: '#ff5a1a', a: .3, pulse: 1, flick: .5 }); }
  L.rect(x - w * .7, y - h - 5, w * 1.4, 2, B[1]); L.rect(x - w * .3, y - h - 20, w * .6, 16, B[1]); L.rect(x - w * .3, y - h - 20, 1, 16, B[3]);
}
// a hanging chain from (x, y) down len, links alternating
function chainDown(L, x, y, len, c) { const C = hx(c), D = mix(C, [0, 0, 0], .5); for (let k = 0; k < len; k++) L.set(x + ((k >> 1) & 1 ? .5 : 0), y + k, k % 2 ? D : C); }
// clear ice from gy down: dark water blue under a glassy skin, cracks, pale scratches and bright reflections
function iceFloor(L, gy, cols, seed, crackCol) {
  const G = cols.map(hx), n = G.length - 1, K = hx(crackCol), H = L.h;
  for (let y = gy; y < H; y++) for (let x = 0; x < L.w; x++) { const v = (y - gy) / (H - gy) * n * .7 + vnoise(x * .05, y * .15, seed) * 1.6 - .3 + bayer(x, y) * .6 - .3; L.set(x, y, G[clampI(Math.round(v), n)]); }
  for (let k = 0; k < 7; k++) { let x = hash(k, 1, seed) * L.w, y = gy + 2 + hash(k, 2, seed) * (H - gy - 4); for (let s = 0; s < 6; s++) { const nx = x + (hash(k, s, seed + 1) - .5) * 14, ny = y + (hash(k, s, seed + 2) - .3) * 5; L.line(x, y, nx, ny, K, .75); x = nx; y = Math.min(H - 1, ny); } }
}

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

  /* ---------- M5: the Ironspire Peaks ---------- */
  // the Rockslide Pass on a cold morning: the road climbs east past the great slide the monks dug out, boulders heaped
  // both sides; a way-shrine with its coal alight; the peaks ahead, snow in every hollow
  'rockslide-pass'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#18203a', '#223050', '#30466a', '#486484', '#6e88a0', '#9cb0c0', '#c8d2d4'], 0, gy + 2);
    sky.glow(W * .8, gy - 30, 38, hx('#fff0d4'), .32); sky.disc(W * .8, gy - 30, 3.5, hx('#fffaf0'), .9);
    for (let k = 0; k < 4; k++) { const cy = 5 + k * 6 + hash(k, 1, 220) * 3, cx = hash(k, 2, 220) * W, len = 24 + hash(k, 3, 220) * 36; for (let x = Math.floor(cx - len / 2); x < cx + len / 2; x++) if ((x + k) & 1) sky.set(x, cy + Math.sin((x - cx) * .1 + k) * .8, hx('#dfe6ee'), .22 * Math.sin((x - cx + len / 2) / len * Math.PI)); }
    // far: the peaks, and a nearer dark shoulder of the mountain
    peaks(far, [[W * .1, gy - 26, 30, 24], [W * .34, gy - 38, 30, 28], [W * .6, gy - 30, 26, 30], [W * .86, gy - 42, 30, 30]], gy + 2, ['#1e2a3c', '#2e3e54', '#4a5e76'], ['#8a9cb4', '#e6eef6'], 221);
    ridge(far, x => gy - 5 - vnoise(x * .05, 0, 222) * 7, gy + 2, '#1c2432', '#6a7a90', .5);
    // mid: the slide coming down from the upper left, its boulders heaped along the road; more boulders to the right
    const SC = ['#26282e', '#34363c', '#44464c', '#56585e'].map(hx);
    for (let x = 0; x < W * .46; x++) { const top = gy - 30 + x / (W * .46) * 32 + (vnoise(x * .2, 0, 223) - .5) * 3; for (let y = Math.floor(top); y < gy + 4; y++) mid.set(x, y, SC[clampI(Math.round(1.6 + (vnoise(x * .3, y * .3, 224) - .5) * 3 - (y - top) * .02 + bayer(x, y) * .6), 3)]); mid.set(x, top, hx('#c8d0dc'), .6); }
    for (let k = 0; k < 26; k++) { const u = hash(k, 1, 225), x = u * W * .5, top = gy - 30 + u * 32, y = top + 3 + hash(k, 2, 225) * (gy + 4 - top - 2), r = 1.6 + hash(k, 3, 225) * 3.2; boulder(mid, x, y, r, ['#24262c', '#3e4148', '#6a6e78'], hash(k, 4, 225) < .5 ? '#e4ecf4' : null); }
    for (const [x, y, r] of [[W * .9, gy + 4, 7], [W * .98, gy + 2, 5], [W * .8, gy + 3, 3.4], [W * .56, gy + 3, 2.6]]) boulder(mid, x, y, r, ['#22242a', '#3a3d44', '#646872'], '#e8eef6');
    for (const [x, h] of [[W * .74, 12], [W * .86, 17], [W * .52, 9]]) pine(mid, x, gy + 3, h, ['#16241e', '#2a4234'], '#e6eef6');
    // the way-shrine: a stone hut under a snowy roof, the coal alight in its niche
    const sx = Math.round(W * .66), sy = gy + 2, ST = hx('#4a4a52'), SL = hx('#7a7c86'), SD = hx('#2a2a30');
    mid.rect(sx - 4, sy - 8, 8, 8, ST); mid.line(sx - 4, sy - 8, sx - 4, sy - 1, SL); mid.line(sx + 3, sy - 8, sx + 3, sy - 1, SD);
    mid.poly([[sx - 6, sy - 8], [sx, sy - 13], [sx + 6, sy - 8]], hx('#34302e')); mid.line(sx - 6, sy - 8, sx, sy - 13, hx('#eef2f8')); mid.line(sx, sy - 13, sx + 6, sy - 8, hx('#c8d0dc'));
    mid.rect(sx - 1.5, sy - 6, 3, 3, hx('#140c0a')); mid.rect(sx - 1, sy - 4, 2, 1, hx('#ff9a3a')); mid.set(sx, sy - 5, hx('#ffd27a'));
    lights.push({ x: sx + .5, y: sy - 4.5, r: 6, c: '#ff9a3a', a: .35, flick: 1.7, pulse: 1 });
    // ground: snow, the gravel road climbing away to the right, ruts and stones
    snowFloor(gnd, gy, ['#56657c', '#6e7e96', '#8a9ab0', '#a6b4c8', '#c0ccdc'], 226, '#e6eef8');
    const road = y => { const u = (y - gy) / (H - gy); return [W * (.7 - .22 * u), 2 + u * W * .22]; }, RC = ['#3a3634', '#4a4542', '#5c5650', '#6e6760'].map(hx);
    for (let y = gy + 1; y < H; y++) { const [c, hw] = road(y); for (let x = Math.floor(c - hw); x <= c + hw; x++) { const e = Math.abs(x - c) / hw; if (e > .8 && bayer(x, y) < (e - .8) * 5) continue; gnd.set(x, y, RC[clampI(Math.round(1 + (y - gy) / (H - gy) * 1.4 - e * .8 + (vnoise(x * .3, y * .3, 227) - .5) * 1.2 + bayer(x, y) * .6), 3)]); } for (const f of [-.45, .45]) gnd.set(c + f * hw, y, hx('#2a2624'), .7); }
    for (let k = 0; k < 18; k++) { const v = hash(k, 1, 228), y = gy + 2 + v * v * (H - gy - 3), [c, hw] = road(y), x = c + (hash(k, 2, 228) - .5) * hw * 2.6, s = .8 + v * 2.4; gnd.disc(x, y, s, hx('#3a3c42')); gnd.set(x - s * .4, y - s * .5, hx('#8a8e98')); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // Peak's Veil at dusk: the walled monastery on its shelf of rock, the bell tower with the great bronze bell in its
  // belfry, the cloister roofs white with snow and windows warm, prayer flags strung from the tower, the cloister fire
  // in the yard, and the peaks behind going pink
  'peaks-veil'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#121830', '#1c2644', '#2a3860', '#44527a', '#6e7294', '#a48c9c', '#d0a49a'], 0, gy + 2);
    stars(sky, 22, gy * .45, 230);
    peaks(far, [[W * .08, gy - 30, 26, 28], [W * .3, gy - 40, 30, 30], [W * .58, gy - 34, 28, 30], [W * .84, gy - 44, 30, 34]], gy + 2, ['#1e2036', '#2c2e4a', '#4a4a6a'], ['#7c7c9e', '#f0d4cc'], 231);
    // the monastery wall along its shelf, buildings behind it
    const WS = ['#2a2a36', '#383846', '#4a4a58', '#5e5e6c', '#72727e'], RF = hx('#e8eef6'), RFD = hx('#a8b4c8');
    masonry(mid, 0, gy - 6, W, gy + 4, WS, '#1a1a22', 7, 3, 232, (x, y) => 2 - (y - gy + 6) * .08 + (x < W * .5 ? .3 : 0));
    for (let x = 0; x < W; x++) { mid.set(x, gy - 7, RF); if ((x >> 2) & 1) mid.set(x, gy - 8, RF, .8); }
    const house = (x0, x1, top, roofH) => {
      far.rect(x0, top, x1 - x0, gy - 6 - top, hx('#34343e')); far.line(x0, top, x0, gy - 6, hx('#56566a'));
      far.poly([[x0 - 2, top], [(x0 + x1) / 2, top - roofH], [x1 + 2, top]], RFD); far.poly([[x0 - 2, top], [(x0 + x1) / 2, top - roofH], [(x0 + x1) / 2, top]], RF);
      for (let x = x0 + 3; x < x1 - 3; x += 6) { far.rect(x, top + 3, 2, 3, hx('#ffc070')); lights.push({ x: x + 1, y: top + 4.5, r: 4, c: '#ffb04a', a: .22, flick: 1.3 + x * .03 }); }
    };
    house(W * .04, W * .3, gy - 20, 7); house(W * .34, W * .58, gy - 17, 6);
    // the bell tower: a square tower, the belfry open on the bell, a pointed roof deep in snow
    const tx = Math.round(W * .74), tw = 14, tt = gy - 50, TS = ['#2e2e3a', '#3c3c4a', '#50505e', '#64646e'].map(hx);
    for (let y = tt; y < gy + 4; y++) for (let x = tx - tw / 2; x < tx + tw / 2; x++) { const u = (x - tx + tw / 2) / tw; far.set(x, y, TS[clampI(Math.round(u < .2 ? 3 : u > .8 ? 0 : 2 - u + bayer(x, y) * .5 - ((y - tt) % 5 === 0 ? 1 : 0)), 3)]); }
    far.poly([[tx - tw / 2 - 2, tt], [tx, tt - 12], [tx + tw / 2 + 2, tt]], RFD); far.poly([[tx - tw / 2 - 2, tt], [tx, tt - 12], [tx, tt]], RF); far.line(tx, tt - 12, tx, tt - 15, hx('#8a7a5a'));
    const by = tt + 5; far.poly(Array.from({ length: 9 }, (_, k) => { const a = Math.PI + k / 8 * Math.PI; return [tx + Math.cos(a) * 4.4, by + 2 + Math.sin(a) * 3]; }).concat([[tx + 4.4, by + 11], [tx - 4.4, by + 11]]), hx('#0c0c14'));
    far.poly([[tx - 1.4, by + 1.6], [tx + 1.4, by + 1.6], [tx + 3, by + 8], [tx - 3, by + 8]], hx('#9a6a2a')); far.line(tx - 1.2, by + 2, tx - 2.6, by + 8, hx('#e8b85a')); far.rect(tx - 3.4, by + 8, 7, 1, hx('#6a4a1e')); far.set(tx, by + 9, hx('#6a4a1e'));
    for (let y = tt + 18; y < gy - 8; y += 9) { far.rect(tx - 1, y, 2, 3, hx('#ffc070')); lights.push({ x: tx, y: y + 1.5, r: 4, c: '#ffb04a', a: .2, flick: 1.1 + y * .02 }); }
    // prayer flags from the belfry down to the cloister roof and along the wall
    flags(mid, tx - 7, tt + 2, W * .3, gy - 20, 5, 1); flags(mid, tx + 7, tt + 4, W + 2, gy - 14, 4, 3);
    // the yard: paving with snow drifted at its edges, the cloister fire in its bowl
    paving(gnd, gy, gy - (H - gy) * 1.3, ['#3a3844', '#4a4854', '#5a5864', '#6c6a74'], '#26242e', 10, 12, 233, (x, y) => (y - gy) / (H - gy) * 1.2 + .8 + Math.max(0, 1 - Math.hypot(x - W * .45, (y - gy - 8) * 2) / 30) * 1.2);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, W - x) / W, v = vnoise(x * .06, y * .2, 234) + (e < .12 ? (.12 - e) * 6 : 0) - (y - gy) / (H - gy) * .2; if (v > .72 && (v > .78 || (x + y) & 1)) gnd.set(x, y, hx(v > .86 ? '#c8d4e2' : '#9ca8ba')); }
    const fx0 = Math.round(W * .45), fy = gy + 9; gnd.rect(fx0 - 4, fy - 2, 8, 3, hx('#4a4450')); gnd.rect(fx0 - 4, fy - 2, 8, 1, hx('#7a7484'));
    fireBowl(gnd, fx0, fy - 3, 3.4, lights, 'lit');
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // the Highfold under a storm: a scree slope running down toward Fawnrest, and the Thunder-Roc's eyrie on a crag of
  // its own, the great nest on top with bones in the sticks; cloud rolling over the peaks, lightning inside it
  highfold(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0e1020', '#171a2e', '#212640', '#2e3552', '#404a66', '#58647c'], 0, gy + 2);
    const CL = ['#1a1c2a', '#262a3c', '#34394e'].map(hx);
    for (let k = 0; k < 9; k++) { const cx = hash(k, 1, 240) * W * 1.2 - W * .1, cy = 6 + hash(k, 2, 240) * gy * .5, r = 10 + hash(k, 3, 240) * 14; for (let y = Math.floor(cy - r * .6); y < cy + r * .5; y++) for (let x = Math.floor(cx - r * 1.6); x < cx + r * 1.6; x++) { const d = Math.hypot((x - cx) / 1.6, (y - cy) * 1.4) / r + (vnoise(x * .15, y * .2, 241 + k) - .5) * .4; if (d < 1) sky.set(x, y, CL[clampI(Math.round((1 - d) * 2 + (cy - y) / r - .3 + bayer(x, y) * .6), 2)]); } }
    const bx0 = W * .28; let px = bx0, py = 8; for (let s = 0; s < 6; s++) { const nx = px + (hash(s, 1, 242) - .5) * 8, ny = py + 4 + hash(s, 2, 242) * 3; sky.line(px, py, nx, ny, hx('#e8f0ff')); sky.line(px + 1, py, nx + 1, ny, hx('#8aa8ff'), .5); px = nx; py = ny; }
    lights.push({ x: bx0, y: 14, r: 16, c: '#a8c0ff', a: .28, pulse: 1, flick: 4.2 });
    peaks(far, [[W * .16, gy - 30, 28, 26], [W * .46, gy - 36, 30, 26], [W * .7, gy - 26, 22, 26]], gy + 2, ['#181c2a', '#242a3a', '#384254'], ['#5a6478', '#c6d0de'], 243);
    for (let y = gy - 14; y < gy + 2; y++) for (let x = 0; x < W; x++) if (vnoise(x * .05, y * .2, 244) > .45 && ((x + y) & 1)) far.set(x, y, hx('#5a6478'), .35);
    // the eyrie: a crag standing alone on the right, the nest of torn branches on its top, bones white in it
    const ex = W * .8, ET = gy - 42, EC = ['#1c1e26', '#2a2e38', '#3a404c', '#525a68'];
    const CR = EC.map(hx);
    for (let y = ET; y < gy + 4; y++) { const dy = y - ET, l = ex - 7 - dy * .22 - vnoise(y * .2, 0, 245) * 3, r = ex + 8 + dy * .18 + vnoise(y * .2, 1, 245) * 3; for (let x = Math.floor(l); x < r; x++) { const u = (x - l) / (r - l), b = Math.sin((y + vnoise(x * .1, y * .05, 246) * 6) * .6) > .7 ? -1 : 0; mid.set(x, y, CR[clampI(Math.round(u < .2 ? 3 : 2.4 - u * 2 + b + bayer(x, y) * .6), 3)]); } mid.set(l, y, hx('#b8c8e8'), .8); mid.set(l + 1, y, hx('#8a96aa'), .5); }
    const NS = ['#2a2018', '#3a2c1e', '#5a4428', '#7a5e38'].map(hx);
    mid.poly([[ex - 14, ET + 1], [ex - 11, ET - 4], [ex + 12, ET - 5], [ex + 15, ET + 1], [ex + 8, ET + 3], [ex - 8, ET + 3]], NS[0]);
    for (let k = 0; k < 60; k++) { const a = (hash(k, 1, 247) - .5) * .9 + (k & 1 ? Math.PI : 0), l = 6 + hash(k, 2, 247) * 9, x = ex - 13 + hash(k, 3, 247) * 26, y = ET - 5 + hash(k, 4, 247) * 7; mid.line(x, y, x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .25, NS[1 + k % 3]); }
    for (const [dx, dy] of [[-7, -3], [2, -4], [9, -2]]) { mid.disc(ex + dx, ET + dy, 1.2, hx('#e8e0cc')); mid.set(ex + dx + 1.4, ET + dy + .6, hx('#e8e0cc')); mid.set(ex + dx - .4, ET + dy - .2, hx('#3a2c1e')); }
    mid.line(ex - 12, ET - 1, ex - 16, ET + 1, hx('#e8e0cc')); mid.line(ex + 11, ET - 3, ex + 15, ET - 6, hx('#e8e0cc'));
    // scree slopes and the path
    const SS = ['#2a2c34', '#383a44', '#4a4c56', '#5e606a'].map(hx);
    for (let x = 0; x < W; x++) { const top = gy - 6 + Math.sin(x * .04) * 3 + (x > W * .6 ? (x - W * .6) * -.05 : 0); for (let y = Math.floor(top); y < gy + 4; y++) mid.set(x, y, SS[clampI(Math.round(1.4 + (vnoise(x * .35, y * .35, 248) - .5) * 3 + bayer(x, y) * .6), 3)]); mid.set(x, top, hx('#b6c0d0'), .5); }
    const GS = ['#22242c', '#30323c', '#40424c', '#52545e', '#666872'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const v = (y - gy) / (H - gy) * 2.4 + (vnoise(x * .25, y * .3, 249) - .5) * 2.6 + bayer(x, y) * .7; gnd.set(x, y, GS[clampI(Math.round(v), 4)]); }
    for (let k = 0; k < 30; k++) { const v = hash(k, 1, 250), x = hash(k, 2, 250) * W, y = gy + 1 + v * (H - gy - 2); boulder(gnd, x, y, .8 + v * 2.2, ['#1c1e24', '#40424c', '#7a7e88'], null); }
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const v = vnoise(x * .05, y * .12, 251) - (y - gy) / (H - gy) * .15; if (v > .66 && (v > .7 || (x + y) & 1)) gnd.set(x, y, hx(v > .76 ? '#c8d4e4' : '#9aa8bc')); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // the Iron Stair: switchbacks cut into a cliff face by the dwarves, iron chains strung along them for rails, the
  // stair-head gate at the top with its runes alight; on the left the valley falls away into haze
  'iron-stair'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#162644', '#203a62', '#305482', '#4e74a0', '#8aa8c4', '#c2d2de'], 0, gy + 2);
    peaks(far, [[W * .06, gy - 18, 22, 20], [W * .24, gy - 12, 18, 20]], gy + 2, ['#3a4a64', '#4e6080', '#6a7c98'], ['#9aaec6', '#e6eef6'], 260);
    for (let y = gy - 10; y < gy + 2; y++) for (let x = 0; x < W * .45; x++) if ((x + y) & 1) far.set(x, y, hx('#a8bccc'), .3 + (y - gy + 10) * .03);
    // the cliff: strata in cold grey, the stair cut into it in zigzags, chains along the outer edge
    const CE = y => W * .36 + (gy + 4 - y) * .06 + vnoise(y * .1, 0, 261) * 6;
    rockWall(mid, CE, 1, 0, gy + 4, ['#1c2028', '#262b35', '#323844', '#40475a', '#525a6e'], '#9aa6ba', 262);
    const legs = [[gy + 2, W * .42, W * .96], [gy - 13, W * .95, W * .5], [gy - 28, W * .52, W * .92], [gy - 43, W * .9, W * .62]];
    const SL = hx('#6e7688'), SD = hx('#1a1e26'), CH = hx('#3a3a42'), CHL = hx('#8a8a96');
    const SLL = hx('#aab4c4'), SM = hx('#4a5162');
    legs.forEach(([y0, xa, xb]) => {
      const n = Math.ceil(Math.abs(xb - xa)), posts = [];
      for (let i = 0; i <= n; i++) { const u = i / n, x = xa + (xb - xa) * u, y = y0 - 13 * u; if (y < 3) break; mid.set(x, y - 1, SLL); mid.set(x, y, i % 3 === 0 ? SD : SL); mid.set(x, y + 1, SM); mid.set(x, y + 2, SD); if (i % 9 === 0) posts.push([x, y - 1]); }
      for (const [x, y] of posts) mid.line(x, y - 4, x, y - 1, CH);
      for (let k = 0; k < posts.length - 1; k++) { const [x0, y0p] = posts[k], [x1, y1p] = posts[k + 1]; for (let j = 0; j <= 12; j++) { const u = j / 12; mid.set(x0 + (x1 - x0) * u, y0p - 3.4 + (y1p - y0p) * u + Math.sin(u * Math.PI) * 1.4, j & 1 ? CH : CHL); } }
    });
    // the stair-head gate: a stone arch in the rock, iron doors, two runes alight
    const gx = Math.round(W * .74), gt = 3, GS = hx('#3a3e4a'), GL = hx('#7a8294');
    mid.rect(gx - 9, gt, 18, 13, GS); mid.line(gx - 9, gt, gx + 8, gt, GL); mid.rect(gx - 6, gt + 3, 12, 10, hx('#1c1e24'));
    for (const d of [-3, 3]) { mid.rect(gx + d - 2.4, gt + 4, 5, 9, hx('#2a2c34')); mid.line(gx + d - 2.4, gt + 7, gx + d + 2, gt + 7, hx('#4a4c56')); mid.line(gx + d - 2.4, gt + 11, gx + d + 2, gt + 11, hx('#4a4c56')); }
    for (const d of [-7.5, 7.5]) { mid.rect(gx + d, gt + 5, 1, 3, hx('#ffb04a')); lights.push({ x: gx + d + .5, y: gt + 6.5, r: 5, c: '#ffa040', a: .3, pulse: 1, flick: .8 }); }
    // ground: the stair's foot, cut steps across the ledge, a chain post at the drop, snow in the angles
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const yo = (y - gy) % 5, e = x < W * .18 ? (W * .18 - x) / (W * .18) : 0; gnd.set(x, y, hx(yo === 0 ? '#8a92a2' : yo === 4 ? '#262a32' : ['#4a505e', '#555b6a', '#606676'][clampI(Math.round(1 + (vnoise(x * .2, y * .3, 263) - .5) * 1.6 + bayer(x, y) * .5 - e * 2), 2)])); }
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const v = vnoise(x * .08, y * .3, 264) + (x > W * .85 ? .2 : 0); if (v > .72 && (v > .78 || (x + y) & 1)) gnd.set(x, y, hx(v > .84 ? '#c6d2e2' : '#98a6ba')); }
    for (const px of [W * .1, W * .26]) { gnd.rect(px - 1, gy - 6, 3, 14, hx('#2e3038')); gnd.set(px - 1, gy - 6, hx('#8a8c98')); }
    for (let s = 0; s <= 24; s++) { const u = s / 24, x = W * .1 + W * .16 * u, y = gy - 3 + Math.sin(u * Math.PI) * 4; gnd.set(x, y, s & 1 ? CH : CHL); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // Ironhold: the Thane's hall carved out of the mountain: square pillars banded in knotwork, red banners with the
  // hold's gold rune, the great hearth roaring in the far wall with the throne on its dais beside it, a rune-line of
  // gold inlaid in the floor running to the fire
  ironhold(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const hxX = W * .5, hxY = gy - 4;
    hewn(sky, 0, 0, W, gy + 3, ['#0e0c10', '#16131a', '#1e1a22', '#28222a', '#342c32', '#443a3e'], 270, (x, y) => 1.6 + Math.max(0, 1 - Math.hypot(x - hxX, (y - hxY) * 1.4) / 60) * 3 - (y < 10 ? .8 : 0));
    // the vault: ribs of stone arching over
    for (const x0 of [W * .18, W * .82]) for (let k = 0; k <= 30; k++) { const u = k / 30, x = x0 + (W * .5 - x0) * u, y = 18 - Math.sin(u * Math.PI / 2) * 14; sky.rect(x - 1, y, 2, 2, hx('#3a3238')); sky.set(x, y, hx('#5a4e52')); }
    // the great hearth: a stone surround, a mantel with the rune, the fire
    const HS = ['#2a2226', '#3a3034', '#4e4246', '#665a5a'];
    masonry(far, hxX - 18, hxY - 20, hxX + 18, gy + 3, HS, '#140f12', 6, 3, 271, (x, y) => 2 + Math.max(0, 1 - Math.hypot(x - hxX, y - hxY) / 22) * 1.4);
    far.rect(hxX - 21, hxY - 22, 42, 3, hx('#665a5a')); far.rect(hxX - 21, hxY - 22, 42, 1, hx('#9a8a84'));
    far.poly([[hxX - 11, gy + 3], [hxX - 11, hxY - 8], [hxX - 8, hxY - 12], [hxX + 8, hxY - 12], [hxX + 11, hxY - 8], [hxX + 11, gy + 3]], hx('#0a0606'));
    for (let k = 0; k < 7; k++) { const x = hxX - 8 + k * 2.6, h = 5 + hash(k, 1, 272) * 6; far.poly([[x - 1.6, gy + 2], [x + .4, gy + 2 - h], [x + 2, gy + 2]], hx(k % 2 ? '#ff8a2a' : '#ffb04a')); far.line(x + .3, gy + 1, x + .4, gy + 3 - h * .6, hx('#fff0b0')); }
    far.rect(hxX - 9, gy + 1, 18, 2, hx('#2a1a14'));
    const RN = hx('#e8b04a'); far.line(hxX - 3, hxY - 21, hxX - 3, hxY - 20, RN); far.line(hxX - 4, hxY - 21, hxX + 4, hxY - 21, RN); far.line(hxX + 3, hxY - 21, hxX + 3, hxY - 20, RN);
    lights.push({ x: hxX, y: gy - 3, r: 24, c: '#ff9a3a', a: .55, flick: 2.4, core: [[hxX - 2, gy], [hxX + 2, gy - 1]] }, { x: hxX - 6, y: gy - 1, r: 4, c: '#ffd070', a: .2, torch: 1, flick: 3.1 });
    // the throne on its dais, left of the hearth; banners either side
    const tx = hxX - 32; far.rect(tx - 9, gy - 1, 18, 4, hx('#3a3034')); far.rect(tx - 9, gy - 1, 18, 1, hx('#7a6a66')); far.rect(tx - 6, gy - 4, 12, 3, hx('#4a3e40'));
    far.rect(tx - 4, gy - 20, 8, 17, hx('#2e2628')); far.rect(tx - 5, gy - 22, 10, 3, hx('#4e4246')); far.rect(tx - 3, gy - 17, 6, 11, hx('#6a1e1a')); far.line(tx - 4, gy - 20, tx - 4, gy - 4, hx('#8a7a70')); far.set(tx, gy - 21, hx('#e8b04a'));
    const banner = (x, top, len) => { const R = hx('#8a2a22'), RD = hx('#5a1a16'), G = hx('#e0a840'); far.rect(x - 4.5, top - 1, 9, 1, hx('#3a2e24')); for (let y = top; y < top + len; y++) for (let xx = x - 3.5; xx < x + 3.5; xx++) far.set(xx, y, xx > x + 1.5 ? RD : R); far.poly([[x - 3.5, top + len], [x, top + len + 3], [x + 3.5, top + len]], R); far.line(x - 1.5, top + 4, x + 1.5, top + 4, G); far.line(x, top + 4, x, top + 9, G); far.line(x - 1.5, top + 7, x + 1.5, top + 9, G); far.rect(x - 3.5, top + len - 1, 7, 1, G); };
    banner(W * .2, 12, 22); banner(W * .8, 12, 22); banner(hxX + 30, 16, 18);
    // near pillars framing the hall, with braziers
    for (const x of [W * .06, W * .94]) dwarfPillar(mid, x, 12, 0, gy + 8, ['#0e0c10', '#18141a', '#241e24', '#342c32'], '#5a4a3a');
    for (const x of [Math.round(W * .2), Math.round(W * .8)]) { mid.rect(x - .5, gy - 6, 1.5, 11, hx('#2a2226')); mid.line(x - 3, gy + 5, x, gy + 2, hx('#2a2226')); mid.line(x + 3, gy + 5, x, gy + 2, hx('#2a2226')); fireBowl(mid, x, gy - 7, 3, lights, 'lit'); }
    // the floor: polished flags, warm toward the hearth, the rune-line of gold running to the fire
    paving(gnd, gy, gy - (H - gy) * 1.4, ['#1a1618', '#241e20', '#2e2628', '#3a3032', '#4a3e3c'], '#0c0a0c', 11, 14, 273, (x, y) => (y - gy) / (H - gy) * 1.1 + .6 + Math.max(0, 1 - Math.hypot(x - hxX, (y - gy) * 2.2) / 40) * 1.8);
    for (let y = gy + 1; y < H; y++) { const u = (y - gy) / (H - gy); gnd.set(hxX, y, hx('#c8903a'), .9); if (y % 4 === 0) { gnd.set(hxX - 1 - u * 2, y, hx('#c8903a'), .8); gnd.set(hxX + 1 + u * 2, y, hx('#c8903a'), .8); } }
    return { layers: [sky, far, mid, gnd], lights, fx: 'sparks' };
  },
  // the Ironhold Deeps: Harrow's abandoned works: a hewn hall under iron beams, cold furnaces in a row (one with embers
  // still in it), chains hanging, the ore rails running off into the dark, slag heaps with the heat still in their
  // cracks. The lamps on the beams go out in the dark; the slag and the embers keep glowing
  'ironhold-deeps'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    hewn(sky, 0, 0, W, gy + 3, ['#0a0808', '#110d0c', '#181311', '#201915', '#2a2119', '#34291e'], 280, (x, y) => 1.4 + Math.max(0, 1 - Math.min(Math.hypot(x - W * .3, y - 20), Math.hypot(x - W * .7, y - 18)) / 38) * 1.8);
    // iron beams across the roof, chains hanging from them
    const IB = hx('#1e1c20'), IBL = hx('#4a464e'), IBD = hx('#0c0a0c');
    for (const y of [4, 13]) { sky.rect(0, y, W, 4, IB); sky.rect(0, y, W, 1, IBL); sky.rect(0, y + 3, W, 1, IBD); for (let x = 3; x < W; x += 9) sky.set(x, y + 2, hx('#6a666e')); }
    for (const [x, len] of [[W * .12, 18], [W * .45, 10], [W * .58, 24], [W * .9, 14]]) chainDown(far, x, 17, len, '#4a464e');
    // cold furnaces in a row; the middle one still holds embers
    furnace(far, W * .22, gy + 2, 11, 20, 'cold', lights); furnace(far, W * .5, gy + 1, 12, 22, 'embers', lights); furnace(far, W * .78, gy + 2, 11, 19, 'cold', lights);
    // iron props and the lamps hung from them (out in the dark)
    for (const x of [W * .06, W * .94]) { mid.rect(x - 2, 0, 5, gy + 8, hx('#1a181c')); mid.rect(x - 2, 0, 1, gy + 8, hx('#3e3a42')); for (let y = 8; y < gy; y += 10) mid.set(x, y, hx('#6a666e')); }
    for (const [x, len] of [[W * .34, 8], [W * .66, 6]]) { mid.line(x, 17, x, 17 + len, hx('#3a383e')); mid.rect(x - 1, 18 + len, 3, 4, hx('#3a2e24')); mid.rect(x - .5, 19 + len, 2, 2, hx('#ffd27a')); lights.push({ x: x + .5, y: 20 + len, r: 12, c: '#ffb04a', a: .4, flick: 2 + x * .01, out: true }); }
    // floor: slag and grit, the rails, slag heaps with live cracks
    const GF = ['#0e0a0a', '#151010', '#1c1614', '#241c18', '#2e241e'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { gnd.set(x, y, GF[clampI(Math.round((y - gy) / (H - gy) * 2 + (vnoise(x * .12, y * .25, 281) - .5) * 1.6 + bayer(x, y) * .7 - .2), 4)]); if (hash(x, y, 282) < .04) gnd.set(x, y, hx('#3a2e26')); }
    rails(gnd, W * .42, 12, W * .5, gy - 10, gy, ['#1e1612', '#2e2c30', '#6a6870']);
    const cracks = [];
    for (const [hx0, hy, hr] of [[W * .1, H - 8, 11], [W * .86, H - 5, 13], [W * .72, gy + 7, 6]]) {
      for (let y = Math.floor(hy - hr * .7); y < hy + 2; y++) for (let x = Math.floor(hx0 - hr * 1.3); x < hx0 + hr * 1.3; x++) { const d = Math.hypot((x - hx0) / 1.3, (y - hy) * 1.3) / hr; if (d < 1) gnd.set(x, y, hx(['#1a1212', '#241816', '#30201a'][clampI(Math.round((1 - d) * 2 + bayer(x, y) * .6 - .3), 2)])); }
      for (let k = 0; k < 2; k++) { let x = hx0 - hr * .6 + hash(k, 1, hx0 | 0) * hr * .5, y = hy - hr * .4 + k * 2; const pts = [[x, y]]; for (let s = 0; s < 4; s++) { x += 1.5 + hash(k, s, 283) * 3; y += (hash(k, s, 284) - .5) * 2.5; pts.push([x, y]); } cracks.push(pts); }
      lights.push({ x: hx0, y: hy - hr * .3, r: hr * .8, c: '#ff5a1a', a: .22, pulse: 1, flick: .6 + hx0 * .01 });
    }
    lights.push({ cracks, c: '#ff6a2a' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'sparks', darkAmb: .12 };
  },
  // Harrow's Forge: a round hall under a great chimney hood, the ring of anvils round a pit of cold fire (one place in
  // the ring is empty), tongs and hammers racked on the walls, Harrow's broken-ring mark cut above the hood
  'harrows-forge'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    masonry(sky, 0, 0, W, gy + 3, ['#0e0b0c', '#151012', '#1c1617', '#241c1c', '#2e2422'], '#070506', 9, 4, 290, (x, y) => 2.2 - Math.abs(x - W / 2) / (W / 2) * 1.4 - (y < 8 ? .8 : 0) + Math.max(0, 1 - Math.hypot(x - W / 2, y - gy) / 40) * .8);
    // the hood: iron plates narrowing up into the chimney, rivets, a glow still in its throat
    const HD = ['#1a1618', '#262022', '#342c2c', '#4a3e3a'].map(hx);
    for (let y = 2; y < gy - 18; y++) { const u = (y - 2) / (gy - 20), hw = 6 + u * u * 26; for (let x = Math.floor(W / 2 - hw); x < W / 2 + hw; x++) { const e = (x - W / 2 + hw) / (2 * hw); far.set(x, y, HD[clampI(Math.round(e < .15 ? 3 : e > .85 ? 0 : 2 - e + bayer(x, y) * .5 - ((y % 8) === 0 ? 1 : 0)), 3)]); } }
    for (let y = 10; y < gy - 18; y += 8) { const u = (y - 2) / (gy - 20), hw = 6 + u * u * 26; for (const s of [-1, 1]) far.set(W / 2 + s * (hw - 2), y + 1, hx('#8a7a6e')); }
    far.rect(W / 2 - 33, gy - 19, 66, 3, hx('#4a3e3a')); far.rect(W / 2 - 33, gy - 19, 66, 1, hx('#8a7a6e'));
    // Harrow's mark: the broken ring, cut into the hood and gilded
    const my = gy - 30;
    for (let k = 0; k < 24; k++) { const a = .5 + k / 24 * Math.PI * 1.7; far.set(W / 2 + Math.cos(a) * 5.4, my + Math.sin(a) * 5.4, hx('#e0a848')); far.set(W / 2 + Math.cos(a) * 4.4, my + Math.sin(a) * 4.4, hx('#6a4a1e'), .7); }
    far.line(W / 2 + 5.8, my + 1.4, W / 2 + 3.6, my + 3.6, hx('#e0a848'));
    lights.push({ x: W / 2, y: my, r: 7, c: '#e8a040', a: .16, pulse: 1, flick: .3 });
    // racks of tongs and hammers on the walls, chains
    const TL = hx('#2e2a2c'), TLL = hx('#6a646a');
    for (const x0 of [W * .14, W * .86]) { far.rect(x0 - 10, gy - 30, 20, 2, hx('#3a2a1e')); for (let k = 0; k < 5; k++) { const x = x0 - 8 + k * 4; if (k % 2) { far.line(x, gy - 28, x, gy - 14, TL); far.rect(x - 1.5, gy - 16, 4, 3, TL); far.set(x - 1, gy - 16, TLL); } else { far.line(x - .6, gy - 28, x - 1.4, gy - 15, TL); far.line(x + .6, gy - 28, x + 1.4, gy - 15, TL); far.set(x, gy - 27, TLL); } } }
    for (const [x, len] of [[W * .3, 20], [W * .7, 16]]) chainDown(far, x, 0, len, '#3e3a3e');
    // the ring of anvils: the far ones small and dark, the near ones either side; the gap where Mother Anvil stood
    const anvil = (L, x, y, s, cols) => { const [D, M, Lt] = cols.map(hx); L.poly([[x - 7 * s, y - 8 * s], [x + 5 * s, y - 8 * s], [x + 11 * s, y - 7.2 * s], [x + 5 * s, y - 5.6 * s], [x + 2.4 * s, y - 5.2 * s], [x + 2 * s, y - 2.4 * s], [x + 5 * s, y], [x - 5 * s, y], [x - 2 * s, y - 2.4 * s], [x - 2.4 * s, y - 5.2 * s], [x - 7 * s, y - 6 * s]], M); L.line(x - 7 * s, y - 8 * s, x + 5 * s, y - 8 * s, Lt); L.line(x + 5 * s, y - 8 * s, x + 11 * s, y - 7.2 * s, Lt); L.line(x - 7 * s, y - 8 * s, x - 7 * s, y - 6 * s, Lt); L.line(x + 2.4 * s, y - 5.2 * s, x + 2 * s, y - 2.4 * s, D); L.line(x + 5 * s, y - 5.6 * s, x + 11 * s, y - 7.2 * s, D); L.rect(x - 5 * s, y - 1, 10 * s, 1, D); };
    for (const [x, s] of [[W * .26, 1.2], [W * .4, 1], [W * .74, 1.2]]) anvil(far, x, gy + 1, s, ['#1a1414', '#4a3e3c', '#9a8a7e']);
    // the floor: flags round the pit; the pit of cold fire, a few embers still alive in it
    paving(gnd, gy, gy - (H - gy) * 1.2, ['#141011', '#1c1617', '#241d1c', '#2e2522'], '#080606', 10, 12, 291, (x, y) => (y - gy) / (H - gy) * 1.2 + .6);
    const px = W / 2, py = gy + 14, prx = 30, pry = 8;
    for (let y = Math.floor(py - pry - 2); y < py + pry + 2; y++) for (let x = Math.floor(px - prx - 3); x < px + prx + 3; x++) { const d = Math.hypot((x - px) / (prx + 2.5), (y - py) / (pry + 2)); if (d < 1) gnd.set(x, y, hx(d > .86 ? (y < py ? '#5a4a44' : '#3a2e2a') : '#0a0707')); }
    const cracks = [];
    for (let k = 0; k < 16; k++) { const a = hash(k, 1, 292) * Math.PI * 2, r = Math.sqrt(hash(k, 2, 292)) * .8, x = px + Math.cos(a) * prx * r, y = py + Math.sin(a) * pry * r; gnd.disc(x, y, 1.4, hx(k % 3 ? '#1e1614' : '#2a1a14')); if (k % 5 === 0) cracks.push([[x - 1, y], [x + 1, y - .5]]); }
    lights.push({ cracks, c: '#ff5a1a' }, { x: px, y: py, r: 12, c: '#ff5a1a', a: .12, pulse: 1, flick: .4 });
    for (const [x, sc] of [[W * .08, 2], [W * .92, 2]]) anvil(gnd, x, gy + 22, sc, ['#141011', '#3e3434', '#b0a092']);
    return { layers: [sky, far, mid, gnd], lights, fx: 'sparks', darkAmb: .14 };
  },
  // Stormwatch on its ridge at dusk, a storm coming over: the palisade on its stone footing, the watch tower with its
  // beacon burning and the storm banner snapping, barracks roofs deep in snow, the great north gate, the watch fire
  stormwatch(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#10121e', '#181c2c', '#22283c', '#30384e', '#464e64', '#6a6e80', '#94907e'], 0, gy + 2);
    const CL = ['#141624', '#1e2232', '#2a3042'].map(hx);
    for (let k = 0; k < 7; k++) { const cx = hash(k, 1, 300) * W, cy = 4 + hash(k, 2, 300) * gy * .45, r = 12 + hash(k, 3, 300) * 12; for (let y = Math.floor(cy - r * .5); y < cy + r * .45; y++) for (let x = Math.floor(cx - r * 1.8); x < cx + r * 1.8; x++) { const d = Math.hypot((x - cx) / 1.8, (y - cy) * 1.6) / r + (vnoise(x * .12, y * .2, 301 + k) - .5) * .4; if (d < 1) sky.set(x, y, CL[clampI(Math.round((1 - d) * 2 - (y - cy) / r + bayer(x, y) * .6 - .3), 2)]); } }
    ridge(far, x => gy - 8 - vnoise(x * .04, 0, 302) * 10 - Math.max(0, 30 - Math.abs(x - W * .15)) * .3, gy + 2, '#141824', '#6a7488', .45);
    for (const [x, h] of [[W * .92, 18], [W * .98, 14], [W * .4, 12]]) pine(far, x, gy - 6, h, ['#141e1c', '#243630'], '#dde6f0');
    // barracks behind the wall: long roofs under snow
    for (const [x0, x1, top] of [[W * .36, W * .62, gy - 27], [W * .66, W * .9, gy - 24]]) { far.rect(x0, top + 4, x1 - x0, gy - top, hx('#2a2420')); far.poly([[x0 - 2, top + 4], [x0 + 3, top], [x1 - 3, top], [x1 + 2, top + 4]], hx('#dde6f0')); far.line(x0 - 2, top + 4, x1 + 2, top + 4, hx('#8a96aa')); for (let x = x0 + 4; x < x1 - 3; x += 7) { far.rect(x, top + 7, 2, 2, hx('#ffb860')); lights.push({ x: x + 1, y: top + 8, r: 3.5, c: '#ffb04a', a: .2, flick: 1.4 + x * .02 }); } }
    // the palisade: sharpened logs on a stone footing, snow on the points; the north gate in it
    const LG = ['#1e1612', '#2c2018', '#3c2c20', '#4e3a28'].map(hx), gx0 = W * .52, gx1 = W * .66;
    for (let x = 0; x < W; x++) {
      const log = Math.floor(x / 3), xo = x % 3, top = gy - 14 - (hash(log, 1, 303) * 2 | 0) + (xo === 1 ? -2 : xo === 0 ? -1 : 0), gate = x >= gx0 && x < gx1;
      for (let y = top; y < gy - 1; y++) mid.set(x, y, gate ? hx('#241a14') : LG[clampI(Math.round(2 - (xo === 2 ? 1.4 : xo === 0 ? -.4 : 0) + bayer(x, y) * .5 - .3), 3)]);
      if (!gate && xo === 1) mid.set(x, top, hx('#e8eef6'));
      if (!gate) mid.set(x, gy - 10, hx('#14100c'), .8);
    }
    for (let y = gy - 14; y < gy - 1; y += 4) mid.line(gx0, y, gx1 - 1, y, hx('#4a4a52'));
    mid.line((gx0 + gx1) / 2, gy - 14, (gx0 + gx1) / 2, gy - 2, hx('#0e0a08')); mid.rect(gx0 - 1, gy - 16, gx1 - gx0 + 2, 2, hx('#3a2e24'));
    masonry(mid, 0, gy - 2, W, gy + 3, ['#2a2a30', '#36363e', '#44444c'], '#18181e', 6, 2, 304, () => 1.4);
    // the watch tower on the left: a timber frame, the platform, the beacon burning on it; the banner on its pole
    const tx = W * .16, T = hx('#3a2a1e'), TL = hx('#6a5038');
    for (const d of [-6, 6]) mid.thick(tx + d, gy + 1, tx + d * .7, gy - 36, 1.2, 1, T);
    for (let y = gy - 32; y < gy; y += 9) { mid.line(tx - 6, y + 9, tx + 5, y, T); mid.line(tx + 6, y + 9, tx - 5, y, T); }
    mid.rect(tx - 8, gy - 38, 16, 3, T); mid.rect(tx - 8, gy - 38, 16, 1, TL); mid.poly([[tx - 9, gy - 44], [tx, gy - 50], [tx + 9, gy - 44]], hx('#2a2018')); mid.line(tx - 9, gy - 44, tx, gy - 50, hx('#dde6f0')); mid.line(tx, gy - 50, tx + 9, gy - 44, hx('#b0bccc'));
    for (const d of [-7, 7]) mid.line(tx + d, gy - 44, tx + d, gy - 38, T);
    fireBowl(mid, tx, gy - 39, 3.4, lights, 'lit');
    const bpx = W * .3; mid.line(bpx, gy - 14, bpx, gy - 40, hx('#2a2420'));
    for (let y = 0; y < 9; y++) for (let x = 0; x < 13; x++) { if (x > 10 && y > 2 && y < 6) continue; mid.set(bpx + 1 + x, gy - 40 + y + Math.sin(x * .6 + y * .2) * 1.2, hx(y === 0 || y === 8 ? '#2a3a54' : '#3a5078')); }
    for (const [x, y] of [[5, 2], [6, 3], [5, 4], [6, 5], [7, 6]]) mid.set(bpx + 1 + x, gy - 40 + y + Math.sin(x * .6 + y * .2) * 1.2, hx('#e8eef6'));
    // ground: trodden snow and mud to the gate, the watch fire
    snowFloor(gnd, gy, ['#4a5264', '#626c80', '#7e8a9e', '#9eaabc', '#bcc6d4'], 305);
    for (let y = gy + 1; y < H; y++) { const u = (y - gy) / (H - gy), c = W * (.59 - u * .08), hw = 4 + u * 26; for (let x = Math.floor(c - hw); x < c + hw; x++) { const e = Math.abs(x - c) / hw; if (e > .75 && bayer(x, y) < (e - .75) * 4) continue; gnd.set(x, y, hx(['#3a3230', '#4a3e38', '#5a4c44'][clampI(Math.round(1 + (vnoise(x * .2, y * .3, 306) - .5) * 2 + bayer(x, y) * .5 - e), 2)])); } }
    const fx0 = Math.round(W * .84), fy = gy + 10; gnd.rect(fx0 - 5, fy - 2, 10, 3, hx('#3a3438')); fireBowl(gnd, fx0, fy - 3, 3.6, lights, 'lit');
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // the Frost Road: a windswept road across the tundra, cairns marking it over the snow, a leaning marker pole with a
  // rag on it, the sun a pale disc in the blown haze, low mountains at the edge of the world
  'frost-road'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#2e3a50', '#3e4c64', '#52627a', '#6a7a92', '#8494aa', '#9eacbe', '#b4c0cc'], 0, gy + 2);
    sky.glow(W * .28, gy - 20, 30, hx('#f0e8d8'), .3); sky.disc(W * .28, gy - 20, 5, hx('#e8e4dc'), .7);
    for (let k = 0; k < 6; k++) { const y0 = 8 + k * 6 + hash(k, 1, 310) * 4; for (let x = 0; x < W; x++) if (vnoise(x * .03, k * 3, 311) > .5 && ((x + k) & 1)) sky.set(x, y0 + Math.sin(x * .05 + k) * 2, hx('#c8d2dc'), .2); }
    peaks(far, [[W * .12, gy - 12, 26, 30], [W * .5, gy - 16, 34, 34], [W * .86, gy - 11, 26, 30]], gy + 2, ['#3e4a60', '#4e5c74', '#62708a'], ['#8290a6', '#c8d2de'], 312);
    for (let y = gy - 8; y < gy + 2; y++) for (let x = 0; x < W; x++) if ((x + y) & 1) far.set(x, y, hx('#aab6c6'), .2 + (y - gy + 8) * .03);
    // the road runs off to the vanishing point; cairns along it, getting smaller
    const vx = W * .56, road = y => { const u = (y - gy) / (H - gy); return [vx + (W * .42 - vx) * u, 1 + u * W * .2]; };
    for (const [u, sd] of [[.08, -1], [.16, 1], [.3, -1], [.5, 1], [.8, -1]]) { const y = gy + 1 + u * (H - gy - 4), [c, hw] = road(y), h = 3 + u * 16; cairn(u < .4 ? mid : gnd, c + sd * (hw + 4 + u * 10), y, h, ['#3a3e48', '#4e525c', '#6a6e78'], '#eef4fa'); }
    const px = W * .16, py = gy + 12; gnd.thick(px, py, px + 4, py - 24, 1, .8, hx('#3a2e24')); for (let k = 0; k < 6; k++) gnd.line(px + 4, py - 23 + k, px + 9 + k * .6, py - 22 + k * 1.4, hx(k % 2 ? '#8a3a2e' : '#a84a3a'), .9);
    for (let k = 0; k < 20; k++) { const x = hash(k, 1, 313) * W, y = gy + 2 + hash(k, 2, 313) * 8; for (let b = -1; b <= 1; b++) mid.line(x + b, y, x + b * 1.6, y - 1.6 - hash(k, b + 2, 313) * 2, hx(b ? '#6e6a52' : '#8a8466'), .8); }
    // ground: snow in drifts, the road a trodden track with ruts
    snowFloor(gnd, gy, ['#56627a', '#6a778e', '#8290a6', '#9aa8bc', '#b2bece'], 314, '#dfe8f2');
    for (let y = gy + 1; y < H; y++) { const [c, hw] = road(y); for (let x = Math.floor(c - hw); x <= c + hw; x++) { const e = Math.abs(x - c) / hw; if (e > .7 && bayer(x, y) < (e - .7) * 3.3) continue; gnd.set(x, y, hx(['#646e84', '#76819a', '#8894aa'][clampI(Math.round(1 + (vnoise(x * .2, y * .4, 315) - .5) * 1.6 + bayer(x, y) * .5 - .2), 2)])); } for (const f of [-.4, .4]) gnd.set(c + f * hw, y, hx('#4a5468'), .8); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // Frostmere: the great lake frozen from shore to shore under a clear cold sky, the ring of peaks round it, the
  // drowned shrine leaning on its island, prayer flags on poles in the wind, and the black hole the Tallymen cut in
  // the ice, frost smoking off the water in it
  frostmere(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#182848', '#223a60', '#34547c', '#52769a', '#86a4bc', '#bccfdc', '#dce6ec'], 0, gy + 2);
    peaks(far, [[W * .04, gy - 22, 24, 26], [W * .26, gy - 30, 28, 26], [W * .52, gy - 20, 24, 26], [W * .74, gy - 34, 28, 30], [W * .98, gy - 24, 24, 24]], gy + 2, ['#24324a', '#34465e', '#50627c'], ['#8ea2bc', '#eef4fa'], 320);
    ridge(far, x => gy - 2 - vnoise(x * .06, 0, 321) * 3, gy + 2, '#2a3850', '#9aaec4', .4);
    // the drowned shrine on its island: a small chapel leaning into the ice, its bell-cote empty
    const ix = W * .3, iy = gy + 3; mid.poly([[ix - 16, iy + 1], [ix - 10, iy - 3], [ix + 10, iy - 3], [ix + 17, iy + 1]], hx('#3a4250')); mid.line(ix - 10, iy - 3, ix + 10, iy - 3, hx('#e8eef6'));
    const lean = .14, sp = (x, y) => [ix + (x - ix) + (iy - y) * lean, y];
    mid.poly([sp(ix - 7, iy - 3), sp(ix - 7, iy - 14), sp(ix + 6, iy - 14), sp(ix + 6, iy - 3)], hx('#4a4a56'));
    mid.poly([sp(ix - 9, iy - 14), sp(ix - .5, iy - 21), sp(ix + 8, iy - 14)], hx('#2e2a30')); mid.line(...sp(ix - 9, iy - 14), ...sp(ix - .5, iy - 21), hx('#eef4fa'));
    mid.poly([sp(ix - 2.5, iy - 21), sp(ix - 2.5, iy - 27), sp(ix + 1.5, iy - 27), sp(ix + 1.5, iy - 21)], hx('#4a4a56')); mid.poly([sp(ix - 1.5, iy - 22), sp(ix - 1.5, iy - 25), sp(ix + .5, iy - 25), sp(ix + .5, iy - 22)], hx('#0e1018'));
    mid.poly([sp(ix - 2, iy - 4), sp(ix - 2, iy - 9), sp(ix + 1, iy - 9), sp(ix + 1, iy - 4)], hx('#0e1018'));
    for (const [x, y] of [[ix - 5, iy - 11], [ix + 3, iy - 11]]) mid.rect(...sp(x, y), 1, 2, hx('#0e1018'));
    // prayer flags on their poles, strung across to the island
    for (const [x, h] of [[W * .5, 22], [W * .62, 16], [W * .08, 18]]) mid.line(x, gy + 4, x, gy + 4 - h, hx('#2a2420'));
    flags(mid, W * .5, gy - 17, W * .62, gy - 11, 3, 2); flags(mid, W * .08, gy - 13, ix - 5, gy - 8, 3, 4);
    // ground: the lake: ice blue under a skin of snow, cracks, and the hole cut in it, black water and frost smoke
    iceFloor(gnd, gy, ['#26405a', '#34566e', '#467088', '#6a90a8', '#98b6c8', '#c6d8e2'], 322, '#e8f2f8');
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const v = vnoise(x * .04, y * .14, 323); if (v > .6 && (v > .66 || (x + y) & 1)) gnd.set(x, y, hx(v > .74 ? '#b8cad8' : '#94acc0')); }
    const hx0 = W * .66, hy0 = gy + 18, hr = 16;
    for (let y = Math.floor(hy0 - hr * .4); y < hy0 + hr * .4; y++) for (let x = Math.floor(hx0 - hr - 2); x < hx0 + hr + 2; x++) { const d = Math.hypot((x - hx0) / hr, (y - hy0) / (hr * .32)) + (vnoise(x * .4, y * .4, 324) - .5) * .18; if (d < 1) gnd.set(x, y, hx(d > .88 ? '#e8f2f8' : d > .8 ? '#6a8aa4' : ['#04080e', '#081018', '#0c1822'][clampI(Math.round((1 - d) * 3 + bayer(x, y) * .5 - .5), 2)])); }
    for (let k = 0; k < 5; k++) { const x = hx0 - 9 + k * 4.4, y = hy0 - 2; gnd.line(x, y, x + Math.sin(k) * 2, y - 5 - k % 2 * 2, hx('#c8d8e6'), .35); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'snow' };
  },
  // Beneath Frostmere: a cave of blue ice under the lake, icicles hanging from its roof, the drowned monks frozen into
  // its walls with the bubbles of their last breath, and under the clear floor Hush asleep: a shape too big to see
  // the whole of, lit violet from within. In the dark only Hush's light is left
  'frostmere-below'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const IC = ['#060c16', '#0a1422', '#102036', '#18304c', '#244664', '#34607e', '#4a7c98'].map(hx), n = IC.length - 1;
    for (let y = 0; y < gy + 3; y++) for (let x = 0; x < W; x++) { const st = Math.sin(x * .35 + vnoise(x * .05, y * .04, 330) * 8) * .5 + vnoise(x * .1, y * .06, 331) - .5, glow = Math.max(0, 1 - Math.hypot(x - W * .5, (y - gy) * 1.3) / 70); sky.set(x, y, IC[clampI(Math.round(2 + st * 1.6 + glow * 2.4 - (y < 8 ? 1 : 0) + bayer(x, y) * .7 - .35), n)]); }
    // the drowned, frozen into the walls: hooded shapes deep in the ice, their breath caught in bubbles above them
    const monk = (x, y, s) => { const M = hx('#07101c'), ML = hx('#16283c'); far.poly([[x - 4 * s, y], [x - 3 * s, y - 9 * s], [x - 2 * s, y - 13 * s], [x, y - 15 * s], [x + 2 * s, y - 13 * s], [x + 3 * s, y - 9 * s], [x + 4 * s, y]], M); far.disc(x + .6 * s, y - 12.4 * s, 1.4 * s, ML); for (let k = 0; k < 4; k++) far.disc(x + (hash(k, x | 0, 332) - .5) * 4, y - 17 * s - k * 3.2, .5 + hash(k, 2, 332) * .9, hx('#8ab8d8'), .7); };
    monk(W * .14, gy - 6, 1); monk(W * .3, gy - 12, .7); monk(W * .74, gy - 10, .8); monk(W * .88, gy - 4, 1.05);
    // icicles hanging from the roof, and ice columns framing the cave
    for (let k = 0; k < 30; k++) { const x = hash(k, 1, 333) * W, l = 4 + hash(k, 2, 333) * 12, w = .8 + hash(k, 3, 333) * 1.4; mid.poly([[x - w, 0], [x + w, 0], [x, l]], hx(k % 3 ? '#5a8aa8' : '#8ab8d4')); mid.line(x - w * .4, 0, x, l - 1, hx('#cfe6f4'), .7); }
    for (const [x, w] of [[W * .04, 9], [W * .96, 10]]) for (let y = 0; y < gy + 6; y++) for (let xx = Math.floor(x - w / 2); xx < x + w / 2; xx++) { const u = (xx - x + w / 2) / w; mid.set(xx, y, hx(['#0e1c2e', '#1c3450', '#2e5272', '#5a88a8'][clampI(Math.round(u < .25 ? 3 : u > .75 ? 0 : 2 - u + bayer(xx, y) * .6), 3)])); }
    // the floor: clear ice over the deep, and Hush under it: a vast curled shape, veins of violet light in it, one eye
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const v = (y - gy) / (H - gy); gnd.set(x, y, IC[clampI(Math.round(1 + (vnoise(x * .06, y * .2, 334) - .5) * 1.4 + v + bayer(x, y) * .6 - .3), 3)]); }
    const cx = W * .52, cy = H + 6, HR = 58;
    for (let y = gy + 2; y < H; y++) for (let x = 0; x < W; x++) { const a = Math.atan2(y - cy, x - cx), d = Math.hypot((x - cx) / 1.7, y - cy), band = Math.abs(d - HR * .62 - Math.sin(a * 3) * 4) < 7 + Math.sin(a * 5) * 2; if (band && d < HR) gnd.set(x, y, hx(['#0e0826', '#1a1040', '#261858'][clampI(Math.round((1 - Math.abs(d - HR * .62) / 9) * 2 + bayer(x, y) * .5 - .3), 2)]), .9); }
    const veins = [];
    for (let k = 0; k < 6; k++) { let a = -2.7 + k * .5, d = HR * .62; const pts = []; for (let s = 0; s < 6; s++) { const x = cx + Math.cos(a) * d * 1.7, y = cy + Math.sin(a) * d; if (y > gy + 1) pts.push([x, y]); a += .07 + hash(k, s, 335) * .05; d += (hash(k, s, 336) - .5) * 5; } if (pts.length > 1) veins.push(pts); }
    lights.push({ cracks: veins, c: '#a4acff' });
    const ex = cx + 22, ey = gy + 16;
    gnd.poly([[ex - 7, ey], [ex - 2, ey - 2.4], [ex + 5, ey - 1.4], [ex + 8, ey + .6], [ex + 2, ey + 2.2], [ex - 4, ey + 1.8]], hx('#6660d4')); gnd.poly([[ex - 1, ey - 1.6], [ex + 1.4, ey - 1.6], [ex + 1, ey + 1.4], [ex - .6, ey + 1.4]], hx('#eceeff'));
    lights.push({ x: ex, y: ey, r: 16, c: '#8a80ff', a: .45, pulse: 1, flick: .35 }, { x: cx - 30, y: gy + 20, r: 18, c: '#6660d4', a: .3, pulse: 1, flick: .25 }, { x: cx + 40, y: H - 4, r: 14, c: '#6660d4', a: .28, pulse: 1, flick: .3 });
    // the cave's own cold light off the ice (it goes in the dark)
    lights.push({ x: W * .5, y: gy - 20, r: 30, c: '#6ab0e0', a: .22, out: true, flick: .2 });
    return { layers: [sky, far, mid, gnd], lights, fx: 'rime', darkAmb: .1 };
  },
};

/* ---------- M6: helpers for the Gloomfen ---------- */
// black water from y0 to y1: darker toward the horizon, slow ripple lines, the odd glint (cols run dark to light)
function fenWater(L, y0, y1, cols, seed, rip = '#35524e', x0 = 0, x1 = L.w) {
  const C = cols.map(hx), n = C.length - 1, R = hx(rip);
  for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) { const v = (y - y0) / Math.max(1, y1 - y0) * n * .8 + (vnoise(x * .05, y * .2, seed) - .5) * 1.2 + bayer(x, y) * .7 - .35; L.set(x, y, C[clampI(Math.round(v), n)]); }
  for (let k = 0; k < 14; k++) { const u = (k + hash(k, 1, seed) * .6) / 14, y = y0 + 1 + u * u * (y1 - y0 - 2); for (let x = Math.floor(x0); x < x1; x++) if (vnoise(x * .08, k * 3, seed + 1) > .55) L.set(x, y + Math.sin(x * (.2 - u * .1) + k) * .6, R, .16 + u * .22); }
}
// a light's reflection on the water below it, broken into dashes that spread toward the viewer
function reflect(L, x, y0, y1, c, a = .6) { const C = hx(c); for (let y = Math.floor(y0); y < y1; y += 2) { const d = (y - y0) / Math.max(1, y1 - y0), len = 1 + hash(y, x | 0, 41) * 3 * (1 - d * .5), xc = x + (hash(y, 2, 41) - .5) * (2 + d * 5); L.line(xc - len / 2, y, xc + len / 2, y, C, a * (1 - d * .7)); } }
// a weeping willow: a leaning trunk, a heavy crown, and strands hanging from it (to `to`, or most of the way down);
// cols: [trunk, leaf dark, leaf lit]
function willow(L, x, y, h, lean, cols, seed, to) {
  const [T, D, Lt] = cols.map(hx), cx = x + lean * h * .3, top = y - h, R = h * .36;
  L.thick(x, y, cx, top + h * .42, h * .07, h * .045, T); L.thick(x - h * .06, y, x - h * .12, y + 1, h * .03, h * .02, T); L.thick(x + h * .05, y, x + h * .13, y + 1, h * .03, h * .02, T);
  for (const [dx, dy] of [[-.3, .16], [.28, .12], [0, .06]]) L.thick(cx, top + h * .42, cx + dx * h, top + dy * h, h * .03, h * .012, T);
  for (let k = 0; k < 11; k++) { const a = Math.PI * (1 + k / 10), px = cx + Math.cos(a) * R * .9, py = top + h * .24 + Math.sin(a) * R * .5; L.disc(px, py, R * (.3 + hash(k, 1, seed) * .12), D); }
  const n = Math.round(h * 1.4);
  for (let s = 0; s < n; s++) { const u = hash(s, 2, seed), sx = cx - R * 1.15 + u * R * 2.3, sy = top + h * .2 + (1 - Math.sin(u * Math.PI)) * h * .18 + hash(s, 3, seed) * 3, len = (to ? to - sy : h * (.45 + hash(s, 4, seed) * .35)) * (.75 + hash(s, 5, seed) * .25); for (let j = 0; j < len; j++) L.set(sx + Math.sin(j * .25 + s) * .5, sy + j, (j + s * 3) % 7 ? D : Lt, 1 - j / len * .4); }
  for (let k = 0; k < h * .5; k++) L.set(cx + (hash(k, 6, seed) - .5) * R * 1.8, top + h * .08 + hash(k, 7, seed) * h * .26, Lt, .7);
}
// a post on stilts, cols [dark, lit]: a pile driven into the water from y (its foot) up h
const pile = (L, x, y, h, cols, w = 1) => { const [D, Lt] = cols.map(hx); L.rect(x - w / 2, y - h, w + .5, h, D); L.line(x - w / 2, y - h, x - w / 2, y - 1, Lt, .5); };
// a hut: walls of planks under a steep thatched roof, raised on stilts over the water (lift); a lit window when lit
function hut(L, x, y, w, h, lift, cols, lit, lights, out) {
  const [PD, P, RF, RL] = cols.map(hx), fy = y - lift;
  for (const dx of [-w * .4, 0, w * .4]) pile(L, x + dx, y, lift + 1, [cols[0], cols[1]]);
  if (lift > 0) L.rect(x - w / 2 - 1, fy - 1, w + 2, 1.5, PD);
  for (let yy = Math.floor(fy - h); yy < fy - 1; yy++) for (let xx = Math.floor(x - w / 2); xx < x + w / 2; xx++) L.set(xx, yy, (xx - Math.floor(x - w / 2)) % 3 === 0 ? PD : P);
  L.poly([[x - w / 2 - 2.4, fy - h + .5], [x + .4, fy - h - w * .62], [x + w / 2 + 2.4, fy - h + .5]], RF); L.line(x - w / 2 - 2.4, fy - h + .5, x + .4, fy - h - w * .62, RL, .7);
  for (let k = 0; k < w; k += 2) L.line(x - w / 2 + k, fy - h + .5, x + .4 + (k - w / 2) * .25, fy - h - w * .45, PD, .35);
  if (lit) { const wx = x - w * .15, wy = fy - h * .55; L.rect(wx - 1, wy - 1, 2.5, 2.5, hx(lit)); lights.push({ x: wx + .2, y: wy, r: 5 + w * .2, c: lit, a: .32, flick: 1.3 + x * .01, out }); }
}
// a lamp-post: a pole with an arm and a lantern hanging from it, lit (it goes out in the dark when `out`)
function lampPost(L, x, y, h, lights, o = {}) {
  const P = hx(o.pole || '#1a140e'), c = o.c || '#ffc46a', ax = x + (o.arm ?? 3);
  L.rect(x - .5, y - h, 1.5, h, P); L.line(x, y - h, ax, y - h, P); L.line(ax, y - h, ax, y - h + 1.5, P);
  L.rect(ax - 1, y - h + 1.5, 2.5, 3, hx('#2a2018')); if (o.lit !== false) { L.rect(ax - .4, y - h + 2.2, 1.2, 1.6, hx(c)); lights.push({ x: ax + .2, y: y - h + 3, r: o.r || 7, c, a: o.a || .4, flick: 1.7 + x * .013, out: o.out }); }
}
// reeds and cattails from base (a front bed when base is the bottom edge): cols [stem, tip, cattail, cattail lit]
function reedBed(L, x0, x1, base, hmin, hmax, seed, skip = .35, cols = ['#101a0c', '#4a5a2c', '#3e2612', '#6a4424']) {
  const [R, RT, CT, CTL] = cols.map(hx);
  for (let x = Math.floor(x0); x < x1; x++) { if (hash(x, 7, seed) < skip) continue; const h = hmin + hash(x, 8, seed) * (hmax - hmin), lean = (hash(x, 9, seed) - .5) * 4; L.line(x, base, x + lean, base - h, R); L.set(x + lean + (lean > 0 ? 1 : 0), base - h * .9, RT, .6); if (hash(x, 10, seed) < .16) { L.rect(x + lean * .85 - .5, base - h + 1, 2, 5, CT); L.set(x + lean * .85 - .5, base - h + 1, CTL); } }
}
// a thin band of mist lying over y, x0..x1, dithered (alpha a)
function mistBand(L, x0, x1, y, th, c, a) { const C = hx(c); for (let x = Math.floor(x0); x < x1; x++) { const u = (x - x0) / (x1 - x0), t = Math.max(1, Math.round(Math.sin(u * Math.PI) * th)); for (let k = 0; k < t; k++) if (((x + k + y) & 1) === 0 || k === t - 1) L.set(x, y + k, C, a * Math.sin(u * Math.PI)); } }
// planks laid across the view from gy down (a boardwalk or a bridge deck), crowding toward the horizon, with gaps
// and nail-heads; cols run dark to light, gap is the colour between boards
function planks(L, y0, y1, cols, gap, seed, x0 = 0, x1 = L.w) {
  const C = cols.map(hx), G = hx(gap), n = C.length - 1;
  let y = y0, k = 0;
  while (y < y1) { const d = (y - y0) / Math.max(1, y1 - y0), th = Math.max(1, Math.round(1 + d * 4.4)); for (let yy = y; yy < Math.min(y1, y + th); yy++) for (let x = Math.floor(x0); x < x1; x++) { const seam = (x + k * 17 + Math.floor(hash(k, 1, seed) * 30)) % Math.round(22 + d * 30) === 0; const l = clampI(Math.round(1 + d * 1.4 + (vnoise(x * .1, k, seed) - .5) * 1.4 + (yy === y ? .6 : 0) + bayer(x, yy) * .5 - .25 - (hash(k, x >> 4, seed + 1) < .08 ? 1.5 : 0)), n); L.set(x, yy, seam ? G : C[l]); } L.rect(x0, y + th, x1 - x0, d > .3 ? 1 : .6, G); y += th + (d > .3 ? 1 : 1); k++; }
}

/* ---------- M6: the Gloomfen's twelve places ---------- */
Object.assign(PAINT, {
  // the Murkway: the safe paths through the bog, at the foot of Mossfall's fen stair; marker poles with rags, tussocks
  // and black pools, dead trees, a low moon in the haze
  murkway(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#060908', '#0a100d', '#0f1812', '#162218', '#1f2d1e', '#2c3a26', '#3e4a30'], 0, gy + 2);
    const mx = Math.round(W * .74), my = Math.round(gy - H * .3);
    sky.glow(mx, my, 30, hx('#a8b890'), .2); sky.disc(mx, my, 4.4, hx('#c8d2b0')); sky.disc(mx - 1, my - 1, 3.2, hx('#e4e8cc'), .8);
    for (let k = 0; k < 5; k++) mistBand(sky, hash(k, 1, 601) * W - 30, hash(k, 1, 601) * W + 50 + hash(k, 2, 601) * 40, gy - 20 + k * 4, 2, '#7a8a70', .14);
    // far: Mossfall's cliff at the left with the fen stair zigzagging down its face; the bog's far treeline
    const cliff = y => 6 + (gy - y) * .18 + vnoise(0, y * .1, 603) * 5;
    for (let y = Math.round(gy - H * .42); y < gy + 2; y++) for (let x = 0; x < cliff(y) + 16; x++) far.set(x, y, hx(vnoise(x * .2, y * .1, 604) > .6 ? '#141c14' : '#0d130e'));
    const st = hx('#3a4632'); for (let k = 0; k < 6; k++) { const y0 = gy - H * .38 + k * 6, xa = 4 + (k % 2) * 10, xb = 14 - (k % 2) * 10; far.line(xa, y0, xb, y0 + 6, st, .8); for (let s = 0; s < 4; s++) far.set(xa + (xb - xa) * s / 4, y0 + s * 1.5 - 1, hx('#56624a'), .7); }
    ridge(far, x => gy - 3 - vnoise(x * .06, 0, 605) * 5 - (hash(Math.floor(x / 4), 1, 605) < .2 ? 2 : 0), gy + 2, '#0c140e', '#34462e', .5);
    for (const [x, h, sd] of [[W * .36, 16, 1], [W * .6, 12, 2], [W * .88, 19, 3]]) branch(far, x, gy + 1, -Math.PI / 2 + (hash(sd, 1, 606) - .5) * .3, h * .45, 1.6, 3, hx('#0c130d'), 606 + sd);
    // mid: tussock islands and the marker poles of the safe path, rags tied on them
    for (const [x, y, r] of [[W * .2, gy + 4, 8], [W * .5, gy + 3, 6], [W * .78, gy + 5, 9]]) { mid.poly([[x - r, y + 1], [x - r * .6, y - 2.4], [x, y - 3.4], [x + r * .6, y - 2.2], [x + r, y + 1]], hx('#1a2616')); reedBed(mid, x - r * .7, x + r * .7, y - 1, 2, 6, 607 + (x | 0), .5); }
    for (const [x, y, h] of [[W * .3, gy + 6, 10], [W * .47, gy + 4, 7], [W * .64, gy + 5, 8]]) { mid.rect(x, y - h, 1, h, hx('#241a12')); mid.poly([[x + 1, y - h + 1], [x + 4, y - h + 2], [x + 3, y - h + 3.4], [x + 1, y - h + 3]], hx('#b8ae92')); }
    // ground: black pools and bog between tussocks, the safe path of stepping stones and a sunk plank or two winding up
    // from the viewer; reeds framing the view; marsh-lights over the pools
    const G = ['#0a0f0a', '#101810', '#182216', '#22301c'].map(hx), WA = ['#050a0b', '#08110f', '#0c1818'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) {
      const wet = vnoise(x * .045, y * .11, 608) + (y - gy) / (H - gy) * .1 > .56;
      if (wet) gnd.set(x, y, WA[clampI(Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .8 - .4), 2)]);
      else gnd.set(x, y, G[clampI(Math.round(1 + (y - gy) / (H - gy) * 2 + (vnoise(x * .2, y * .3, 609) - .5) * 1.6 + bayer(x, y) * .6 - .3), 3)]);
    }
    const path = y => W * .5 + Math.sin((y - gy) * .16) * W * .12 * (1 - (y - gy) / (H - gy) * .4);
    for (let y = gy + 2; y < H + 4; y += 3 + (y - gy) * .08) { const d = (y - gy) / (H - gy), r = 1.4 + d * 4.4, x = path(y) + (hash(y | 0, 1, 610) - .5) * 4; gnd.disc(x, y, r, hx('#3a4230')); gnd.disc(x - r * .25, y - r * .3, r * .7, hx('#566046')); gnd.line(x - r * .6, y - r * .8, x + r * .2, y - r * .9, hx('#7a8462'), .6); }
    for (let k = 0; k < 50; k++) { const x = hash(k, 1, 611) * W, y = gy + 3 + hash(k, 2, 611) * (H - gy - 3); gnd.line(x, y, x + (hash(k, 3, 611) < .5 ? -1 : 1), y - 1.6 - hash(k, 4, 611) * 2.4, hx('#34442a'), .8); }
    reedBed(gnd, 0, W * .14, H, H * .26, H * .5, 612); reedBed(gnd, W * .88, W, H, H * .22, H * .46, 613);
    for (const [x, y, sd] of [[W * .24, gy + 8, 1], [W * .7, gy + 10, 2], [W * .9, gy + 4, 3]]) lights.push({ x, y, r: 6, c: '#c8f070', a: .3, pulse: 1, flick: .6 + sd * .3, core: [[Math.round(x), Math.round(y)]] });
    return { layers: [sky, far, mid, gnd], lights, fx: 'midge' };
  },
  // Willowmurk: the hidden village under the great willows: huts on low stilts, lit windows, the ward-stones hung
  // from the boughs (some of them dark now: the wards are failing), a plank path, willow strands framing the view
  willowmurk(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#070a06', '#0c1109', '#12190d', '#1a2412', '#243018', '#303c1e', '#404a26'], 0, gy + 2);
    sky.glow(W * .5, gy - H * .2, 44, hx('#c8c070'), .12);
    const WC = ['#0e120a', '#16200e', '#2c3c1a'];
    willow(far, W * .12, gy + 1, H * .56, .1, WC, 621, gy + 2); willow(far, W * .5, gy + 1, H * .62, -.05, WC, 622, gy + 2); willow(far, W * .88, gy + 1, H * .58, -.1, WC, 623, gy + 2);
    // mid: the huts under the willows, lanterns, the ward-stones on their cords
    const HC = ['#140e0a', '#2a1e14', '#1c1c10', '#3e3c22'];
    hut(mid, W * .25, gy + 3, 12, 8, 3, HC, '#ffb858', lights); hut(mid, W * .64, gy + 2, 10, 7, 3, HC, '#ffc870', lights); hut(mid, W * .82, gy + 4, 13, 9, 3, HC, null, lights);
    for (const [x, y, h] of [[W * .42, gy + 6, 12], [W * .74, gy + 6, 11]]) lampPost(mid, x, y, h, lights, { c: '#ffc46a', r: 7 });
    for (const [x, len, on] of [[W * .08, 14, 1], [W * .18, 20, 0], [W * .37, 12, 1], [W * .56, 18, 0], [W * .7, 13, 1], [W * .94, 17, 0]]) { const y = gy - H * .44 + len; mid.line(x, gy - H * .44, x, y, hx('#3a3424'), .8); mid.disc(x, y + 1.6, 1.8, hx('#5a5e52')); mid.set(x - .6, y + 1, hx('#8a8e80')); if (on) { mid.set(x, y + 1.6, hx('#a8f07a')); lights.push({ x, y: y + 1.6, r: 5, c: '#8ae06a', a: .3, pulse: 1, flick: .4 + x * .01 }); } }
    // ground: moss and mud, puddles, a plank path through the village, willow strands hanging in front
    const G = ['#0c120a', '#141c0e', '#1c2812', '#283618'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) gnd.set(x, y, G[clampI(Math.round(1 + (y - gy) / (H - gy) * 2 + (vnoise(x * .15, y * .25, 624) - .5) * 1.6 + bayer(x, y) * .6 - .3), 3)]);
    for (const [px, py, rx] of [[W * .2, H - 12, 10], [W * .8, gy + 12, 8], [W * .6, H - 5, 12]]) for (let y = Math.floor(py - 2); y <= py + 2; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) { const e = ((x - px) / rx) ** 2 + ((y - py) / 2.4) ** 2; if (e < 1) gnd.set(x, y, hx(e > .6 && y <= py ? '#2a3e2e' : '#0a1612')); }
    const PL = ['#1e140c', '#3a2818', '#56402a'].map(hx);
    for (let i = 0; i <= 9; i++) { const v = i / 9, y = H - 2 - v * (H - gy - 5), c = W * (.46 + Math.sin(v * 3) * .05), half = 9 - v * 5.4, th = 1.4 - v * .5; if (hash(i, 5, 625) < .12) continue; gnd.thick(c - half, y, c + half, y, th, th, PL[1]); gnd.line(c - half, y - th + .5, c + half, y - th + .5, PL[2], .8); }
    for (let s = 0; s < 44; s++) { const sd = s < 22 ? 0 : 1, x = sd ? W - 1 - hash(s, 1, 626) * W * .14 : hash(s, 1, 626) * W * .14, len = H * (.2 + hash(s, 2, 626) * .3); for (let j = 0; j < len; j++) gnd.set(x + Math.sin(j * .2 + s) * .6, j, hx((j + s * 3) % 6 ? '#16200e' : '#3a5020'), 1 - j / len * .3); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'leaf' };
  },
  // Rotbridge: on the old bridge over the Blackwater Channel: the deck of timbers and stones, the far parapet with its
  // carved posts, Hodge's toll-house and toll-lamp at the east end, the channel wide and black, fog coming up it
  rotbridge(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#080a0a', '#0d1110', '#121816', '#18201c', '#202a24', '#2a342c', '#38402f'], 0, gy + 2);
    for (let k = 0; k < 6; k++) mistBand(sky, W * .45 + hash(k, 1, 631) * W * .3, W * 1.1, gy - 16 + k * 3, 3, '#8a9480', .16);
    // far: the channel's far bank low and dark, dead trees, fog lying on the water downstream (right)
    ridge(far, x => gy - 4 - vnoise(x * .05, 0, 632) * 4, gy - 1, '#0a0f0c', '#2e3a2c', .5);
    for (const [x, h, sd] of [[W * .08, 18, 1], [W * .3, 13, 2], [W * .56, 16, 3]]) branch(far, x, gy - 3, -Math.PI / 2 + (hash(sd, 1, 633) - .5) * .4, h * .42, 1.4, 3, hx('#0b100d'), 633 + sd);
    fenWater(far, gy - 1, gy + 5, ['#050909', '#08100f', '#0c1616'], 634);
    for (let k = 0; k < 4; k++) mistBand(far, W * .5 + k * 8, W + 20, gy - 3 + k * 1.6, 2, '#9aa494', .2);
    // mid: the far parapet: a timber rail on squat stone posts, faces carved in the posts (they seem to shift)
    const PY = gy + 4, ST = ['#1a1a18', '#2c2a24', '#46423a'].map(hx);
    for (let x = 0; x < W; x++) { mid.set(x, PY - 6, ST[1]); mid.set(x, PY - 5, hash(x, 1, 635) < .3 ? ST[0] : ST[1]); mid.set(x, PY - 7, ST[2], .5); }
    for (let k = 0; k < 7; k++) { const x = 8 + k * (W - 16) / 6, hh = 10; mid.rect(x - 2.5, PY - hh, 5, hh, ST[1]); mid.rect(x - 2.5, PY - hh, 1, hh, ST[2]); mid.rect(x - 3, PY - hh - 1.5, 6, 1.5, ST[2]); mid.set(x - 1, PY - hh + 3, ST[0]); mid.set(x + 1, PY - hh + 3, ST[0]); mid.line(x - 1, PY - hh + 6, x + 1, PY - hh + 6 + (k % 2), ST[0]); }
    // the toll-house at the east end (right), its lamp lit, and the toll-bar
    const tx = W * .86, ty = PY;
    mid.rect(tx - 8, ty - 19, 16, 13, hx('#221a12')); mid.poly([[tx - 10, ty - 19], [tx, ty - 27], [tx + 10, ty - 19]], hx('#2e2418')); mid.line(tx - 10, ty - 19, tx, ty - 27, hx('#54442c'), .7);
    mid.rect(tx - 5, ty - 15, 3, 3, hx('#ffb858')); lights.push({ x: tx - 3.5, y: ty - 13.5, r: 6, c: '#ffb858', a: .3, flick: 1.3 });
    lampPost(mid, tx - 13, ty + 1, 18, lights, { c: '#ffc46a', r: 9, a: .45, arm: -3 });
    for (let x = tx - 30; x < tx - 14; x++) mid.set(x, ty - 8 + (x - tx + 30) * .35, hx(((x | 0) >> 1) & 1 ? '#c8c0a8' : '#8a2a1e'));
    // ground: the deck: timbers across, stone slabs at the ends, the near edge worn; a rope coil, a lantern's pool of light
    planks(gnd, gy + 5, H, ['#140e0a', '#22170f', '#322216', '#44301e', '#5a4028'], '#070504', 636);
    for (let k = 0; k < 16; k++) { const x = hash(k, 1, 637) * W, y = gy + 8 + hash(k, 2, 637) * (H - gy - 10); gnd.set(x, y, hx('#6a6258'), .8); }
    for (let x = 0; x < W; x++) for (let y = gy + 5; y < gy + 7; y++) gnd.set(x, y, hx('#0a0806'), .7);
    return { layers: [sky, far, mid, gnd], lights, fx: 'mire' };
  },
  // Bogmire: the stilt town's market square: plank streets on piles over black water, houses crowding on stilts with
  // lit windows, rope bridges between them, lanterns on poles, the moot-hall's roof
  bogmire(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#06080b', '#0a0e12', '#0f1418', '#151c1e', '#1d2624', '#28302a', '#343a2e'], 0, gy + 2);
    stars(sky, 40, gy - 20, 641);
    // far: the far houses on their stilts, lit windows, a rope bridge sagging between two of them
    const HF = ['#0a0c0c', '#121414', '#101210', '#1c1e18'];
    for (const [x, w, h, lit] of [[W * .06, 10, 7, '#ffb050'], [W * .2, 12, 9, null], [W * .34, 9, 6, '#ffc060'], [W * .58, 11, 8, '#ffb050'], [W * .72, 14, 10, null], [W * .9, 10, 7, '#ffc870']]) hut(far, x, gy + 1, w, h, 5, HF, lit, lights);
    for (const [x0, x1, y] of [[W * .2 + 6, W * .34 - 4, gy - 16], [W * .72 + 7, W * .9 - 5, gy - 14]]) for (let x = x0; x < x1; x++) { const u = (x - x0) / (x1 - x0), yy = y + Math.sin(u * Math.PI) * 3; far.set(x, yy, hx('#2a2418')); if ((x | 0) % 3 === 0) far.line(x, yy, x, yy - 2.5, hx('#2a2418'), .6); }
    fenWater(far, gy - 3, gy + 2, ['#04070a', '#070c0e', '#0a1212'], 642);
    // mid: the moot-hall (a long roof on stilts), nearer houses, lanterns on poles, washing on a line
    const HM = ['#140e0a', '#2a1e14', '#221a10', '#4a3a22'];
    mid.rect(W * .42, gy - 14, 26, 12, hx('#241a12')); mid.poly([[W * .42 - 3, gy - 14], [W * .42 + 13, gy - 24], [W * .42 + 29, gy - 14]], hx('#2e2214')); mid.line(W * .42 - 3, gy - 14, W * .42 + 13, gy - 24, hx('#5a4428'), .7);
    for (const dx of [2, 8, 14, 20]) { mid.rect(W * .42 + dx, gy - 10, 2.5, 4, hx(dx % 12 === 2 ? '#ffc060' : '#1a120c')); if (dx % 12 === 2) lights.push({ x: W * .42 + dx + 1, y: gy - 8, r: 5, c: '#ffc060', a: .28, flick: 1.1 + dx * .1 }); }
    for (const dx of [1, 7, 13, 19, 25]) pile(mid, W * .42 + dx, gy + 3, 5, ['#140e0a', '#2a1e14']);
    hut(mid, W * .14, gy + 5, 14, 10, 4, HM, '#ffb050', lights); hut(mid, W * .84, gy + 6, 15, 11, 4, HM, '#ffc870', lights);
    for (const [x, y, h] of [[W * .3, gy + 7, 15], [W * .66, gy + 8, 16]]) lampPost(mid, x, y, h, lights, { r: 8 });
    for (let x = W * .56; x < W * .74; x++) { const u = (x - W * .56) / (W * .18), y = gy - 6 + Math.sin(u * Math.PI) * 2.4; mid.set(x, y, hx('#3a3024')); if (Math.floor(x) % 5 === 0) mid.rect(x, y + 1, 2.5, 3, hx(['#8a8466', '#6a3a2a', '#5a6a7a'][Math.floor(x) % 3])); }
    // ground: the plank square, black water showing between the boards at the edges, barrels and crates
    planks(gnd, gy + 6, H, ['#120c08', '#1e150e', '#2c2014', '#3c2c1a', '#503a22'], '#040505', 643);
    fenWater(gnd, gy + 2, gy + 6, ['#04070a', '#070c0e', '#0a1212'], 644);
    for (const [x, y, r] of [[W * .08, H - 10, 5], [W * .14, H - 6, 4.4], [W * .93, H - 14, 4.6]]) { gnd.rect(x - r, y - r * 1.8, r * 2, r * 1.8, hx('#2e1e12')); gnd.line(x - r, y - r * 1.4, x + r, y - r * 1.4, hx('#14100c')); gnd.line(x - r, y - r * .5, x + r, y - r * .5, hx('#14100c')); gnd.line(x - r, y - r * 1.8, x - r, y, hx('#4a3420'), .6); }
    gnd.rect(W * .86, H - 12, 10, 8, hx('#3a2a18')); gnd.line(W * .86, H - 12, W * .86 + 10, H - 4, hx('#22180e')); gnd.line(W * .86 + 10, H - 12, W * .86, H - 4, hx('#22180e'));
    return { layers: [sky, far, mid, gnd], lights, fx: 'firefly' };
  },
});

Object.assign(PAINT, {
  // the Lanternfen: open bog and dead trees in fog; small lights hanging over the water that the children follow
  lanternfen(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0c100e', '#111713', '#161e18', '#1c251d', '#232c23', '#2b3429', '#343d30'], 0, gy + 2, .7);
    // far: dead trees going grey into the fog, three depths
    for (const [x, h, sd, c, a] of [[W * .1, 20, 1, '#243024', .55], [W * .42, 16, 2, '#243024', .5], [W * .7, 22, 3, '#243024', .55], [W * .26, 26, 4, '#1a241a', .8], [W * .86, 24, 5, '#1a241a', .8]]) { const T = layer(W, H); branch(T, x, gy + 1, -Math.PI / 2 + (hash(sd, 1, 651) - .5) * .35, h * .4, 1.8, 3, hx(c), 651 + sd); for (let i = 0; i < T.d.length; i += 4) if (T.d[i + 3]) far.set((i / 4) % W, Math.floor(i / 4 / W), [T.d[i], T.d[i + 1], T.d[i + 2]], a); }
    ridge(far, x => gy - 1 - vnoise(x * .08, 0, 652) * 2, gy + 2, '#141a14', '#2e382c', .4);
    for (let k = 0; k < 8; k++) mistBand(far, hash(k, 1, 653) * W - 40, hash(k, 1, 653) * W + 30 + hash(k, 2, 653) * 60, gy - 22 + k * 3.4, 3, '#9aa896', .18);
    // mid: nearer dead trees, a cairn, the lights hanging over the pools
    branch(mid, W * .16, gy + 8, -Math.PI / 2 - .12, 13, 2.4, 3, hx('#0e140e'), 654); branch(mid, W * .78, gy + 7, -Math.PI / 2 + .15, 11, 2.2, 3, hx('#0e140e'), 655);
    for (const [x, y, sd] of [[W * .32, gy - 4, 1], [W * .48, gy - 9, 2], [W * .6, gy - 2, 3], [W * .9, gy - 6, 4], [W * .06, gy - 3, 5]]) { mid.disc(x, y, 1, hx('#e8f4a0')); lights.push({ x, y, r: 7, c: '#d8f080', a: .38, pulse: 1, flick: .5 + sd * .23, core: [[Math.round(x), Math.round(y)]] }); }
    // ground: bog and black pools, tussocks, small bootprints all going one way, reeds framing, a fog bank on the water
    const G = ['#0c110c', '#131a12', '#1a2418', '#232e1e'].map(hx), WA = ['#070b0b', '#0a1111', '#0e1716'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) {
      if (vnoise(x * .05, y * .12, 656) + (y - gy) / (H - gy) * .08 > .54) gnd.set(x, y, WA[clampI(Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .8 - .4), 2)]);
      else gnd.set(x, y, G[clampI(Math.round(1 + (y - gy) / (H - gy) * 2 + (vnoise(x * .2, y * .3, 657) - .5) * 1.6 + bayer(x, y) * .6 - .3), 3)]);
    }
    for (const [x, y] of [[W * .5, gy + 6], [W * .3, gy + 3], [W * .9, gy + 6]]) reflect(gnd, x, y, y + 10, '#d8f080', .4);
    for (let k = 0; k < 9; k++) { const u = k / 8, x = W * (.44 + u * .08) + (k & 1 ? 2 : -2), y = H - 4 - u * (H - gy - 8); gnd.disc(x, y, 1 - u * .5 + .4, hx('#060806')); }
    reedBed(gnd, 0, W * .12, H, H * .24, H * .46, 658); reedBed(gnd, W * .9, W, H, H * .2, H * .42, 659);
    for (let k = 0; k < 5; k++) mistBand(gnd, hash(k, 1, 660) * W - 50, hash(k, 1, 660) * W + 40 + hash(k, 2, 660) * 50, gy + 2 + k * 3, 3, '#a8b4a2', .14);
    return { layers: [sky, far, mid, gnd], lights, fx: 'wisp' };
  },
  // the Mother's Hollow: a drowned grove of black willows round a sunken house whose lamps are all lit; lamp-posts
  // standing in the water; the lamps' light on the black water (in the dark, only the lamps are left)
  'mothers-hollow'(W, H, gy, dark) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#040506', '#06080a', '#090c0e', '#0c1012', '#101614', '#141a16'], 0, gy + 2);
    lights.push({ x: W * .5, y: gy - H * .3, r: 40, c: '#40584a', a: .16, out: true, flick: .2 });
    const WC = ['#07090a', '#0a0e0c', '#1a241c'];
    willow(far, W * .08, gy + 2, H * .6, .1, WC, 661, gy + 1); willow(far, W * .3, gy + 1, H * .5, 0, WC, 662, gy); willow(far, W * .74, gy + 1, H * .52, -.05, WC, 663, gy); willow(far, W * .95, gy + 2, H * .62, -.12, WC, 664, gy + 1);
    // mid: the sunken house, down at one corner in the water, every window lit; lamp-posts in the water round it
    const hx0 = W * .5, hy0 = gy + 2, HW = 28;
    mid.poly([[hx0 - HW / 2, hy0], [hx0 - HW / 2 + 1, hy0 - 15], [hx0 + HW / 2 + 1, hy0 - 12], [hx0 + HW / 2, hy0]], hx('#16110c'));
    mid.poly([[hx0 - HW / 2 - 3, hy0 - 14.4], [hx0 - 1, hy0 - 27], [hx0 + HW / 2 + 4, hy0 - 11.4]], hx('#1c150e')); mid.line(hx0 - HW / 2 - 3, hy0 - 14.4, hx0 - 1, hy0 - 27, hx('#3a2c1c'), .8);
    mid.rect(hx0 + 4, hy0 - 32, 3, 7, hx('#16110c'));
    for (const [dx, dy] of [[-10, -9], [-3, -8.6], [5, -8], [11, -7.4], [-5, -18]]) { mid.rect(hx0 + dx, hy0 + dy, 3, 3, hx('#ffc060')); mid.set(hx0 + dx + 1, hy0 + dy + 1, hx('#fff0c0')); lights.push({ x: hx0 + dx + 1.5, y: hy0 + dy + 1.5, r: 7, c: '#ffb450', a: .36, flick: 1.1 + dx * .07 }); }
    for (const [x, y, h] of [[W * .18, gy + 8, 16], [W * .36, gy + 5, 12], [W * .66, gy + 6, 13], [W * .84, gy + 9, 17]]) lampPost(mid, x, y, h, lights, { c: '#ffc46a', r: 8, a: .42, arm: x < W / 2 ? 3 : -3 });
    // ground: black water holding every lamp, the roots of the willows, lily pads, the children's lanterns set down
    fenWater(gnd, gy, H, ['#030506', '#05090a', '#080e0e', '#0b1413'], 665, '#1e3430');
    for (const [x, y] of [[W * .5 - 8, gy + 3], [W * .5 + 7, gy + 3], [W * .18 + 3, gy + 9], [W * .36 + 3, gy + 6], [W * .66 - 3, gy + 7], [W * .84 - 3, gy + 10]]) reflect(gnd, x, y, Math.min(H, y + 22), '#ffb450', .55);
    for (const [pts, r] of [[[[0, H - 20], [14, H - 14], [26, H - 12], [34, H - 4]], 2.4], [[[W, H - 24], [W - 16, H - 16], [W - 22, H - 6]], 2.2], [[[W * .3, gy + 12], [W * .24, gy + 18], [W * .2, gy + 26]], 1.4]]) barkRoot(gnd, pts, r, r * .4, hx('#0e0c0a'), hx('#2a2218'));
    for (let k = 0; k < 10; k++) { const x = hash(k, 1, 666) * W, y = gy + 6 + hash(k, 2, 666) * (H - gy - 8); gnd.poly([[x - 2.4, y], [x, y - 1.2], [x + 2.6, y], [x, y + 1.2]], hx('#16261a')); gnd.set(x, y, hx('#060a08')); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'moth', darkAmb: .08 };
  },
  // the Long Boardwalk: planks on stilts over open water to the horizon, lamp-posts marching away along it, the
  // broken middle patched with barge-planks, Misthollow's towers far off in the mist
  'long-boardwalk'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#06080d', '#0a0e14', '#0f151b', '#151d21', '#1d2727', '#28322e', '#384034'], 0, gy + 2);
    stars(sky, 50, gy - 18, 671);
    const mx = Math.round(W * .22), my = Math.round(gy - H * .34); sky.glow(mx, my, 26, hx('#a8b8b0'), .2); sky.disc(mx, my, 3.8, hx('#d8e2d4'));
    // far: open water to a low horizon, Misthollow's towers far off (right) in the mist, the boardwalk's far lamps
    fenWater(far, gy - 2, gy + 3, ['#060a0c', '#091012', '#0d1716'], 672);
    for (const [x, w, h, lean] of [[W * .78, 4, 14, .08], [W * .84, 5, 20, -.05], [W * .9, 3.4, 11, .12]]) { far.poly([[x - w / 2, gy - 1], [x - w / 2 + lean * h, gy - 1 - h], [x + w / 2 + lean * h, gy - 1 - h], [x + w / 2, gy - 1]], hx('#1a2224'), .7); far.poly([[x - w / 2 - 1 + lean * h, gy - 1 - h], [x + lean * h, gy - 5 - h], [x + w / 2 + 1 + lean * h, gy - 1 - h]], hx('#1a2224'), .7); }
    for (let k = 0; k < 5; k++) mistBand(far, W * .55, W + 10, gy - 12 + k * 2.4, 2, '#9aa6a0', .2);
    // mid: another stretch of the boardwalk far off across the water, its lamps small
    for (let x = 0; x < W * .6; x++) { const y = gy - 3 + x * .012; mid.set(x, y, hx('#1a140e'), .8); if (Math.floor(x) % 9 === 0) mid.line(x, y, x, y + 3, hx('#140e0a'), .7); }
    for (let k = 0; k < 4; k++) { const x = 8 + k * 24, y = gy - 3 + x * .012; mid.set(x + 1, y - 4, hx('#ffc46a')); mid.line(x, y - 4, x, y, hx('#1a140e')); lights.push({ x: x + 1, y: y - 4, r: 3, c: '#ffc46a', a: .3, flick: 1.2 + k * .3 }); }
    // ground: the boardwalk: planks across, stilts and open water under its near edge, the broken middle patched
    fenWater(gnd, gy, gy + 7, ['#05090b', '#081012', '#0c1616'], 673);
    for (let x = 4; x < W; x += 12) pile(gnd, x, gy + 7, 5, ['#140e0a', '#2a1e14'], 1.4);
    planks(gnd, gy + 7, H, ['#130d08', '#20160e', '#2e2014', '#3e2c1a', '#523a22'], '#050405', 674);
    const px0 = W * .42, px1 = W * .62;
    for (let y = gy + 16; y < H; y++) for (let x = px0 + (y - gy) * .1; x < px1 + (y - gy) * .1; x++) if ((y + (x >> 3)) % 5) gnd.set(x, y, hx(((x >> 3) & 1) ? '#3a3a30' : '#2c2c24'), .9);
    gnd.line(px0 + 1.6, gy + 16, px0 + 1.6 + (H - gy) * .1, H, hx('#0a0806')); gnd.line(px1 + 1.6, gy + 16, px1 + 1.6 + (H - gy) * .1, H, hx('#0a0806'));
    for (let k = 0; k < 10; k++) gnd.set(px0 + 3 + hash(k, 1, 675) * (px1 - px0 - 6), gy + 18 + hash(k, 2, 675) * (H - gy - 20), hx('#8a8474'));
    // the far rail along the boardwalk's edge, and its lamp-posts
    for (let x = 0; x < W; x++) { gnd.set(x, gy + 3, hx('#2a1e14')); gnd.set(x, gy + 4, hx('#1a120c'), .8); }
    for (let x = 6; x < W; x += 14) gnd.rect(x, gy + 3, 1, 5, hx('#1a120c'));
    for (let k = 0; k < 4; k++) { const x = W * (.08 + k * .28); lampPost(gnd, x, gy + 8, 22, lights, { c: '#ffc46a', r: 9, a: .42, arm: 3 }); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'wisp' };
  },
  // the Misthollow Ruins: the sunken city in the fog: towers leaning out of the water, a belltower, arches of a
  // half-drowned street; the street's old cobbles under a hand's depth of black water
  misthollow(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0b0f10', '#101517', '#151b1d', '#1b2223', '#212928', '#28302d', '#303832'], 0, gy + 2, .7);
    // far: towers leaning out of the water, grey in the fog (three depths)
    const tower = (L, x, w, h, lean, c, a, bell) => {
      const C = hx(c), top = gy - h, sx = lean * h;
      L.poly([[x - w / 2, gy + 1], [x - w / 2 + sx, top], [x + w / 2 + sx, top], [x + w / 2, gy + 1]], C, a);
      L.poly([[x - w / 2 - 1 + sx, top], [x + sx, top - w * .9], [x + w / 2 + 1 + sx, top]], C, a);
      for (let k = 0; k < 3; k++) { const u = .25 + k * .22, wx = x + sx * (1 - u) - .6, wy = gy - h * (1 - u); L.rect(wx, wy, 1.4, 2.4, hx('#070a0b'), a); }
      if (bell) { L.rect(x + sx - w * .3, top + 1.4, w * .6, 4, hx('#070a0b'), a); L.disc(x + sx, top + 3, 1.2, hx('#6a5a2a'), a); }
    };
    tower(far, W * .12, 6, 22, .06, '#222a2a', .45); tower(far, W * .56, 5, 18, -.1, '#222a2a', .45); tower(far, W * .9, 7, 26, .04, '#222a2a', .45, true);
    tower(far, W * .32, 8, 30, -.08, '#161c1d', .75, true); tower(far, W * .74, 7, 24, .12, '#161c1d', .75);
    for (let k = 0; k < 8; k++) mistBand(far, hash(k, 1, 681) * W - 40, hash(k, 1, 681) * W + 40 + hash(k, 2, 681) * 50, gy - 24 + k * 3.6, 3, '#9aa6a4', .2);
    // mid: the arches of the drowned street, a broken wall, a lamp left burning in a high window
    const A = hx('#12181a'), AL = hx('#2a3434');
    for (const [x0, n] of [[W * .02, 2], [W * .64, 3]]) for (let k = 0; k < n; k++) { const x = x0 + k * 14; mid.rect(x, gy - 16, 3, 20, A); mid.rect(x + 11, gy - 16, 3, 20, A); for (let a = 0; a <= 12; a++) { const t = Math.PI * a / 12, ax = x + 7 + Math.cos(t) * 5.5, ay = gy - 16 - Math.sin(t) * 4; mid.disc(ax, ay, 1.6, A); } mid.rect(x, gy - 21, 14, 2, A); mid.line(x, gy - 21, x + 14, gy - 21, AL, .6); }
    mid.rect(W * .44, gy - 12, 12, 16, A); mid.poly([[W * .44, gy - 12], [W * .44 + 3, gy - 16], [W * .44 + 7, gy - 13], [W * .44 + 12, gy - 17], [W * .44 + 12, gy - 12]], A);
    mid.rect(W * .44 + 4, gy - 9, 2, 3, hx('#ffc060')); lights.push({ x: W * .44 + 5, y: gy - 7.5, r: 6, c: '#ffb450', a: .3, flick: 1.4 });
    // ground: the half-drowned street: old cobbles under shallow black water, stones breaking the surface
    paving(gnd, gy, gy - 20, ['#141a1a', '#1c2424', '#262e2c', '#303836'], '#0a0e0e', 18, 5, 682, (x, y) => 1 + (y - gy) / (H - gy) * 1.4);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const deep = vnoise(x * .04, y * .1, 683) > .45; gnd.set(x, y, hx(deep ? '#060b0c' : '#0a1212'), deep ? .78 : .45); }
    for (let k = 0; k < 14; k++) { const u = k / 13, y = gy + 2 + u * u * (H - gy - 3); for (let x = 0; x < W; x++) if (vnoise(x * .08, k * 3, 684) > .6) gnd.set(x, y, hx('#3a5654'), .12 + u * .2); }
    for (const [x, y, r] of [[W * .2, H - 8, 5], [W * .8, H - 12, 6], [W * .56, gy + 12, 3]]) { gnd.disc(x, y, r, hx('#2a3230')); gnd.disc(x - r * .3, y - r * .3, r * .6, hx('#3c4644')); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'bubble' };
  },
});

Object.assign(PAINT, {
  // the Drowned Belfry: a bell-hall under the city: bells hanging from their beams in green water-light, air pockets,
  // the choir-stalls, flagstones with the water standing on them; under the floor, the Sleeper's slow light (in the
  // dark only the Sleeper and the bells' faint glow are left)
  'drowned-belfry'(W, H, gy, dark) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    // the back wall: green-black coursed stone, water-light moving over it from above
    masonry(sky, 0, 0, W, gy + 2, ['#060c0a', '#0a1410', '#0e1c16', '#14261c'], '#030605', 9, 5, 691, (x, y) => 1 + Math.sin(x * .08 + vnoise(x * .05, y * .05, 692) * 4) * .8 - y / gy * .6);
    for (let k = 0; k < 7; k++) { const x0 = hash(k, 1, 693) * W; for (let y = 0; y < gy; y++) sky.set(x0 + Math.sin(y * .15 + k) * 3, y, hx('#3a8a6a'), .1 + .08 * Math.sin(y * .2 + k)); }
    lights.push({ x: W * .5, y: 4, r: 40, c: '#3aa080', a: .22, out: true, flick: .25 }, { beam: [[W * .36, 0], [W * .5, 0], [W * .62, H], [W * .3, H]], a: .08, out: true });
    // far: the columns and pointed arches of the hall, going back into the dark
    const CO = ['#0c1612', '#14221a', '#1e3024'].map(hx);
    for (const x of [W * .1, W * .34, W * .66, W * .9]) { for (let y = 8; y < gy + 2; y++) for (let xx = Math.floor(x - 3); xx < x + 3; xx++) far.set(xx, y, CO[xx - x < -1.5 ? 2 : xx - x > 1.5 ? 0 : 1]); far.rect(x - 4, gy - 1, 8, 3, CO[0]); far.rect(x - 4, 8, 8, 2, CO[2]); }
    for (const [x0, x1] of [[W * .1, W * .34], [W * .34, W * .66], [W * .66, W * .9]]) for (let a = 0; a <= 20; a++) { const t = a / 20, x = x0 + (x1 - x0) * t, y = 9 - Math.sin(t * Math.PI) * 8 * (t < .5 ? 1 : 1); far.disc(x, y, 1.6, CO[1]); }
    // the bells on their beam, ropes hanging down into the dark; an air pocket's silver skin against the roof
    for (let x = 0; x < W; x++) { far.set(x, 18, hx('#1a140e')); far.set(x, 19, hx('#2c2016')); }
    for (const [x, r, rope] of [[W * .22, 5, 20], [W * .5, 7, 16], [W * .78, 5.4, 22]]) {
      const B = ['#2a2210', '#4a3c1c', '#6e5a2c', '#3a6a58'].map(hx), top = 20;
      far.rect(x - .5, top, 1, 2, B[0]);
      for (let y = 0; y < r * 1.6; y++) { const w = r * (.45 + .55 * Math.pow(y / (r * 1.6), .7)); for (let xx = Math.floor(x - w); xx < x + w; xx++) far.set(xx, top + 2 + y, (xx < x - w * .4 ? B[2] : xx > x + w * .5 ? B[0] : B[1])); }
      for (let xx = Math.floor(x - r); xx < x + r; xx++) if (hash(xx, 3, 694) < .5) far.set(xx, top + 2 + r * 1.6 - 1, B[3]);
      far.line(x, top + 2 + r * 1.6, x, top + 2 + r * 1.6 + rope, hx('#4a4030'), .7);
      lights.push({ x, y: top + 2 + r, r: r * 1.6, c: '#8ac8a0', a: .12, pulse: 1, flick: .3 });
    }
    for (let x = W * .56; x < W * .96; x++) far.set(x, 3 + Math.sin(x * .3) * .6, hx('#a8d8c8'), .5);
    // mid: the choir-stalls down both sides, a lectern, candles gone out on the stall ends
    const PW = ['#120c08', '#1e150e', '#2e2014'].map(hx);
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const x = sd < 0 ? 2 + k * 14 : W - 16 - k * 14, y = gy + 2 + k; mid.rect(x, y - 8, 14, 8, PW[1]); mid.rect(x, y - 9, 14, 1.4, PW[2]); mid.rect(x, y - 14, 1.4, 6, PW[1]); mid.rect(x + 12.6, y - 14, 1.4, 6, PW[1]); for (let xx = x + 2; xx < x + 13; xx += 3) mid.line(xx, y - 7, xx, y - 1, PW[0]); mid.rect(x + 6, y - 11, 1, 2, hx('#c8c0a0')); }
    mid.poly([[W * .5 - 3, gy + 3], [W * .5 - 1, gy - 8], [W * .5 + 1, gy - 8], [W * .5 + 3, gy + 3]], PW[1]); mid.poly([[W * .5 - 5, gy - 8], [W * .5 + 5, gy - 10], [W * .5 + 5, gy - 8.6], [W * .5 - 5, gy - 6.6]], PW[2]);
    // ground: flagstones with the water standing on them; a crack in the floor with the Sleeper's light under it
    paving(gnd, gy, gy - 26, ['#0c1410', '#121c16', '#18241c', '#1e2c22'], '#040806', 16, 5, 695, (x, y) => 1 + (y - gy) / (H - gy) * 1.2);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) if (vnoise(x * .05, y * .14, 696) > .52) gnd.set(x, y, hx('#081612'), .6);
    const cx = W * .5, cy = gy + (H - gy) * .55, crack = [[cx - 26, cy + 2], [cx - 14, cy - 1], [cx - 4, cy + 2], [cx + 6, cy - 1], [cx + 18, cy + 1], [cx + 30, cy - 2]];
    for (let s = 0; s < crack.length - 1; s++) gnd.thick(crack[s][0], crack[s][1], crack[s + 1][0], crack[s + 1][1], 1.2, 1, hx('#020403'));
    lights.push({ cracks: [crack], c: '#9a8cff' }, { x: cx, y: cy, r: 14, c: '#7a70e8', a: .3, pulse: 1, flick: .15 });
    lights.push({ drips: [[W * .12, 24], [W * .4, 20], [W * .62, 26], [W * .86, 22]], c: '#6ac0a8' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'bubble', darkAmb: .1 };
  },
  // the Blackwater Reach: the lower channel between reed-banks, the sunk boats (the Leviathan's work) showing their
  // ribs, a drowned mill on the far bank; the fight is on the muddy towpath
  'blackwater-reach'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#07080b', '#0c0f12', '#111618', '#171d1e', '#1f2624', '#292f2a', '#383c30'], 0, gy + 2);
    for (let k = 0; k < 4; k++) mistBand(sky, hash(k, 1, 701) * W - 30, hash(k, 1, 701) * W + 60, gy - 18 + k * 4, 2, '#7a8478', .12);
    // far: the reed-banks closing in toward the horizon, the channel between, the drowned mill and its wheel
    ridge(far, x => gy - 3 - vnoise(x * .06, 0, 702) * 4, gy + 1, '#0c120c', '#2e3a28', .45);
    const mx = W * .72, my = gy - 1;
    far.rect(mx - 8, my - 14, 14, 13, hx('#141414')); far.poly([[mx - 10, my - 14], [mx - 2, my - 21], [mx + 7, my - 14]], hx('#1a1814')); far.poly([[mx + 1, my - 20], [mx + 3, my - 18], [mx + 1, my - 15]], hx('#070707'));
    for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; far.line(mx - 11, my - 6, mx - 11 + Math.cos(t) * 6, my - 6 + Math.sin(t) * 6, hx('#1e1812')); } far.disc(mx - 11, my - 6, 1.4, hx('#2a2018'));
    fenWater(far, gy - 1, gy + 4, ['#050809', '#080d0e', '#0b1313'], 703);
    // mid: sunk boats: a hull's ribs, a mast leaning out of the water, a keel
    const HB = ['#140e0a', '#2a1e14', '#3e2c1c'].map(hx);
    for (let k = 0; k < 6; k++) { const x = W * .22 + k * 3; mid.thick(x, gy + 3, x - 1 + k * .4, gy - 4 - Math.sin(k / 5 * Math.PI) * 3, .8, .6, HB[1]); }
    mid.line(W * .22 - 1, gy + 2, W * .22 + 16, gy + 2, HB[2]);
    mid.thick(W * .52, gy + 4, W * .56, gy - 18, 1, .6, HB[1]); mid.line(W * .56, gy - 18, W * .62, gy - 12, HB[0]); mid.line(W * .53, gy - 10, W * .47, gy - 6, HB[0], .8);
    mid.poly([[W * .86, gy + 4], [W * .92, gy - 3], [W * .97, gy + 4]], HB[1]);
    // ground: the channel in front of the towpath, then the towpath: mud, ruts, puddles, a mooring post and its rope
    fenWater(gnd, gy, gy + (H - gy) * .3 + 1, ['#050809', '#080d0e', '#0b1313', '#0f1817'], 704);
    const M = ['#120e0a', '#1a140e', '#241c12', '#302418', '#3c2e1e'].map(hx);
    for (let y = Math.ceil(gy + (H - gy) * .3); y < H; y++) for (let x = 0; x < W; x++) gnd.set(x, y, M[clampI(Math.round(1.4 + (y - gy) / (H - gy) * 2 + (vnoise(x * .1, y * .3, 705) - .5) * 1.8 + bayer(x, y) * .6 - .3), 4)]);
    for (const off of [-.18, .12]) for (let x = 0; x < W; x++) { const y = gy + (H - gy) * (.62 + off) + Math.sin(x * .05) * 1.5; gnd.set(x, y, hx('#0c0906')); gnd.set(x, y - 1, hx('#4a3a26'), .5); }
    for (const [px, py, rx] of [[W * .3, H - 10, 8], [W * .74, gy + (H - gy) * .5, 6]]) for (let y = Math.floor(py - 1.6); y <= py + 1.6; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) if (((x - px) / rx) ** 2 + ((y - py) / 1.8) ** 2 < 1) gnd.set(x, y, hx('#0e1616'));
    gnd.rect(W * .9, gy + (H - gy) * .3 - 6, 3, 12, hx('#1e150e')); gnd.rect(W * .9, gy + (H - gy) * .3 - 6, 1, 12, hx('#3e2c1c')); gnd.line(W * .9, gy + (H - gy) * .3 - 3, W * .7, gy + (H - gy) * .3 + 1, hx('#6a5a40'), .8);
    reedBed(gnd, 0, W * .1, H, H * .22, H * .44, 706); reedBed(gnd, W * .94, W, H, H * .2, H * .4, 707);
    return { layers: [sky, far, mid, gnd], lights, fx: 'midge' };
  },
  // the Tidal Flats: mudflats and tide-pools where the channel meets the sea, a wreck on the horizon, the Tallymen's
  // barge-camp and its crane, and the great chain running from its post across the mud and out into the deep
  'tidal-flats'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0a0c10', '#0f1319', '#151b21', '#1c2428', '#252e2e', '#303a34', '#46483a'], 0, gy + 2);
    sky.glow(W * .3, gy - 2, 50, hx('#a09a7a'), .16);
    for (let k = 0; k < 5; k++) mistBand(sky, hash(k, 1, 711) * W - 40, hash(k, 1, 711) * W + 70, 10 + k * 7, 3, '#5a6268', .16);
    // far: the sea's line, a wreck, the deep off to the right where the water goes black
    fenWater(far, gy - 2, gy + 2, ['#0a1014', '#0e161a', '#141e20'], 712, '#5a6a68');
    for (let y = gy - 2; y < gy + 2; y++) for (let x = Math.floor(W * .7); x < W; x++) far.set(x, y, hx('#040708'), .6);
    far.poly([[W * .12, gy - 1], [W * .16, gy - 5], [W * .26, gy - 4], [W * .28, gy - 1]], hx('#0e0c0a')); far.line(W * .2, gy - 5, W * .21, gy - 17, hx('#0e0c0a')); far.line(W * .2, gy - 13, W * .25, gy - 9, hx('#0e0c0a'), .8);
    // mid: the barge-camp: a barge hull with tents on it, the crane's arm, the beacon lit; the chain-post
    const bx = W * .56, by = gy + 3;
    mid.poly([[bx - 18, by - 5], [bx + 18, by - 5], [bx + 15, by], [bx - 15, by]], hx('#1a120c')); mid.line(bx - 18, by - 5, bx + 18, by - 5, hx('#3a2a1a'));
    mid.poly([[bx - 14, by - 5], [bx - 9, by - 12], [bx - 4, by - 5]], hx('#4a4438')); mid.poly([[bx - 2, by - 5], [bx + 3, by - 11], [bx + 8, by - 5]], hx('#3e3a30'));
    mid.line(bx + 12, by - 5, bx + 12, by - 22, hx('#1e150e')); mid.line(bx + 12, by - 22, bx - 2, by - 26, hx('#1e150e')); mid.line(bx - 2, by - 26, bx - 2, by - 18, hx('#4a4030'), .8); mid.rect(bx - 3, by - 18, 2, 2, hx('#2a2a2a'));
    mid.rect(bx + 16, by - 16, 1.5, 11, hx('#1e150e')); mid.rect(bx + 15, by - 18, 3.5, 2.4, hx('#ffb450')); lights.push({ x: bx + 16.8, y: by - 17, r: 10, c: '#ffb450', a: .45, flick: 2.1 });
    const cp = [W * .2, gy + 16];
    // ground: the flats: wet mud in sheens, tide-pools holding the sky, ripples of sand, shells; the great chain
    const M = ['#100e0c', '#18140f', '#221c14', '#2c2419', '#382e20'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) gnd.set(x, y, M[clampI(Math.round(1 + (y - gy) / (H - gy) * 2.4 + (vnoise(x * .06, y * .2, 713) - .5) * 2 + bayer(x, y) * .6 - .3), 4)]);
    for (let k = 0; k < 16; k++) { const u = (k + .5) / 16, y0 = gy + 2 + u * u * (H - gy - 2); for (let x = 0; x < W; x++) if (vnoise(x * .07, k * 2, 714) > .5) gnd.set(x, y0 + Math.sin(x * (.16 - u * .08) + k) * (.5 + u), hx('#4a3e2c'), .35); }
    for (const [px, py, rx] of [[W * .36, gy + 10, 12], [W * .82, gy + 16, 14], [W * .14, H - 12, 10], [W * .6, H - 8, 16]]) for (let y = Math.floor(py - 3); y <= py + 3; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) { const e = ((x - px) / rx) ** 2 + ((y - py) / 3) ** 2; if (e < 1) gnd.set(x, y, hx(e > .7 && y <= py ? '#5a6468' : y < py ? '#2e383c' : '#1e2628')); }
    for (let k = 0; k < 24; k++) { const x = hash(k, 1, 715) * W, y = gy + 4 + hash(k, 2, 715) * (H - gy - 4); gnd.set(x, y, hx(k % 3 ? '#b8ae98' : '#e0d8c4'), .8); }
    // the chain-post, and the great chain from it across the mud and out into the deep
    gnd.rect(cp[0] - 2.4, cp[1] - 18, 5, 19, hx('#241a12')); gnd.rect(cp[0] - 2.4, cp[1] - 18, 1.4, 19, hx('#4a3622')); gnd.rect(cp[0] - 3.4, cp[1] - 19.4, 7, 2, hx('#2e2014')); gnd.line(cp[0] - 2.4, cp[1] + 1, cp[0] + 2.6, cp[1] + 1, hx('#0a0806'));
    const ch = []; for (let i = 0; i <= 30; i++) { const u = i / 30, x = cp[0] + 1 + (W + 6 - cp[0]) * u, y = cp[1] - 13 + u * 18 + Math.sin(u * Math.PI) * 7; ch.push([x, y]); }
    ch.forEach(([x, y], i) => { const s = .8 + i / 30 * .9; if (i & 1) { gnd.rect(x - .6 * s, y - 1.3 * s, 1.3 * s, 2.6 * s, hx('#101012')); gnd.set(x - .6 * s, y - 1.3 * s, hx('#6a6a70')); } else { gnd.rect(x - 1.5 * s, y - .7 * s, 3 * s, 1.5 * s, hx('#3a3a40')); gnd.line(x - 1.5 * s, y - .7 * s, x + 1.4 * s, y - .7 * s, hx('#8a8a90'), .8); gnd.set(x, y + .4, hx('#6a4a2a'), .7); } });
    return { layers: [sky, far, mid, gnd], lights, fx: 'spray' };
  },
  // the Blackwater Causeway: a raised stone causeway across Mirrordeep's shallows, out of the water now: wet flags
  // with weed on them, the water-mark on a marker stone, reeds, the Keep far off at the end of it
  causeway(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0b1016', '#11171e', '#172026', '#1e2a2c', '#27342f', '#334034', '#4a4e3a'], 0, gy + 2);
    sky.glow(W * .7, gy - 6, 40, hx('#c8b888'), .14);
    // far: Mirrordeep's shallows to the far shore, the Keep's towers far off where the causeway ends
    fenWater(far, gy - 3, gy + 3, ['#10181e', '#141e24', '#1a2628'], 721, '#6a7a78');
    ridge(far, x => gy - 4 - vnoise(x * .05, 0, 722) * 3, gy - 2, '#141c1a', '#3a463c', .4);
    const kx = W * .5; far.rect(kx - 6, gy - 14, 12, 11, hx('#141a1c')); far.rect(kx - 9, gy - 18, 4, 15, hx('#141a1c')); far.rect(kx + 5, gy - 17, 4, 14, hx('#141a1c')); far.poly([[kx - 10, gy - 18], [kx - 7, gy - 22], [kx - 4, gy - 18]], hx('#141a1c')); far.set(kx - 1, gy - 9, hx('#ffc060')); lights.push({ x: kx - 1, y: gy - 9, r: 4, c: '#ffc060', a: .3, flick: 1.1 });
    // mid: reeds along both sides of the causeway, a marker stone with the water-mark on it
    reedBed(mid, W * .02, W * .3, gy + 5, 3, 8, 723, .45); reedBed(mid, W * .7, W * .98, gy + 5, 3, 8, 724, .45);
    const ms = W * .8; mid.rect(ms, gy - 8, 5, 12, hx('#2a2e2a')); mid.rect(ms, gy - 8, 1.4, 12, hx('#4a524a')); mid.line(ms - .5, gy - 3, ms + 5.5, gy - 3, hx('#6a8a6a')); mid.line(ms - .5, gy - 2, ms + 5.5, gy - 2, hx('#1e2a1e'));
    // ground: water on either side, the causeway's paving narrowing toward the Keep, weed drying on its stones
    fenWater(gnd, gy, H, ['#0c1418', '#10191d', '#152022', '#1a2728'], 725, '#5a6c6a');
    for (let y = gy; y < H; y++) { const d = (y - gy) / (H - gy), hw = 6 + d * W * .42, cx = W * .5; for (let x = Math.floor(cx - hw); x < cx + hw; x++) { const X = (x - cx) / (hw / 6), row = Math.floor(Math.pow(d, .7) * 14), col = Math.floor(X + (row & 1) * .5), edge = Math.abs(x - cx) > hw - 1.5; gnd.set(x, y, hx(edge ? '#141a18' : Math.abs(X - col - .5) > .45 || (Math.pow(d, .7) * 14) % 1 < .08 ? '#1c201c' : ['#3a3e36', '#44483e', '#4e5246'][clampI(Math.round(1 + (hash(col, row, 726) - .5) * 1.4), 2)])); } }
    for (let k = 0; k < 20; k++) { const d = hash(k, 1, 727), y = gy + d * (H - gy), hw = 6 + d * W * .42, x = W * .5 + (hash(k, 2, 727) - .5) * 2 * hw * .9; gnd.line(x - 1.5, y, x + 1.5, y + .5, hx('#2e4a2a'), .8); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'wisp' };
  },
});

/* ---------- M7: the Hearth Below's four places (they are what batch 4 asks the player to paint) ---------- */
// a round stone pillar from y0 to y1, w wide: a lit left flank, a shadowed right, a plinth and a capital
function stonePillar(L, x, w, y0, y1, cols) {
  const C = cols.map(hx), n = C.length - 1;
  for (let y = Math.floor(y0); y < y1; y++) for (let xx = Math.floor(x - w / 2); xx < x + w / 2; xx++) { const u = (xx + .5 - (x - w / 2)) / w; L.set(xx, y, C[clampI(Math.round((u < .3 ? n : u > .78 ? 0 : n - 1 - (u - .3) * 2) + bayer(xx, y) * .5 - .25 - (hash(xx >> 1, y >> 2, 811) < .06 ? 1 : 0)), n)]); }
  L.rect(x - w / 2 - w * .18, y0, w * 1.36, Math.max(1, w * .22), C[n]); L.rect(x - w / 2 - w * .12, y0 + Math.max(1, w * .22), w * 1.24, Math.max(1, w * .12), C[1]);
  L.rect(x - w / 2 - w * .2, y1 - Math.max(1, w * .3), w * 1.4, Math.max(1, w * .3), C[1]); L.rect(x - w / 2 - w * .2, y1 - Math.max(1, w * .3), w * 1.4, 1, C[n]);
}
// a smooth, round-shaded tube through control points (Catmull-Rom), r0 to r1 thick, banded every `band` px: the hearth's
// iron roots. cols run dark to light; the lit flank is the left
function tube(L, pts, r0, r1, cols, band = 9, seed = 0) {
  const C = cols.map(hx), n = C.length - 1, P = [pts[0], ...pts, pts[pts.length - 1]], S = [];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 12; k++) { const t = k / 12, [a, b, c, d] = [P[i - 1], P[i], P[i + 1], P[i + 2]], f = (q0, q1, q2, q3) => .5 * (2 * q1 + (q2 - q0) * t + (2 * q0 - 5 * q1 + 4 * q2 - q3) * t * t + (3 * q1 - q0 - 3 * q2 + q3) * t * t * t); S.push([f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])]); }
  S.push(pts[pts.length - 1]);
  let run = 0;
  for (let i = 0; i < S.length - 1; i++) {
    const [ax, ay] = S[i], [bx, by] = S[i + 1], len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len, steps = Math.ceil(len * 2);
    for (let j = 0; j < steps; j++) {
      const u = (i + j / steps) / (S.length - 1), r = r0 + (r1 - r0) * u, x = ax + (bx - ax) * j / steps, y = ay + (by - ay) * j / steps; run += len / steps;
      const bandHere = (run % band) < 1.1;
      for (let o = -Math.ceil(r); o <= Math.ceil(r); o++) { const e = o / r; if (Math.abs(e) > 1) continue; const lit = -e * Math.sign(nx || 1); L.set(x + nx * o, y + ny * o, C[clampI(Math.round(n * .5 + lit * n * .45 - (bandHere ? 1 : 0) + bayer(Math.round(x + nx * o), Math.round(y + ny * o)) * .5 - .25 - (hash(Math.round(x + nx * o) >> 1, Math.round(y + ny * o) >> 1, seed) < .05 ? 1 : 0)), n)]); }
    }
  }
  return S;
}
// the outline of a hearth-flame (for carving): a tall flame with two tongues, centred on x, standing on y, h tall
const flamePts = (x, y, h) => [[x, y], [x - h * .34, y - h * .16], [x - h * .4, y - h * .42], [x - h * .22, y - h * .62], [x - h * .14, y - h * .5], [x - h * .08, y - h * .78], [x, y - h], [x + h * .1, y - h * .7], [x + h * .2, y - h * .8], [x + h * .36, y - h * .5], [x + h * .38, y - h * .22]];
// a heart shape (the Worldforge's furnace), centred on x, its top lobes at y, w half-wide, h tall
const heartPts = (x, y, w, h) => { const P = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * (.85 + k / 12 * 1.15); P.push([x - w * .5 + Math.cos(a) * w * .5, y + w * .5 + Math.sin(a) * w * .5]); } for (let k = 0; k <= 12; k++) { const a = Math.PI * (1 + k / 12 * 1.15); P.push([x + w * .5 + Math.cos(a) * w * .5, y + w * .5 + Math.sin(a) * w * .5]); } P.push([x, y + h]); return P; };
// a great chain link, as big as a cart, seen side-on (ring: a thick ellipse) or edge-on (a bar)
function bigLink(L, x, y, rx, ry, cols, edge) {
  const [D, M, Lt] = cols.map(hx);
  if (edge) { L.thick(x - rx, y, x + rx, y, ry * .45, ry * .45, D); L.line(x - rx, y - ry * .3, x + rx, y - ry * .3, M); return; }
  for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2, px = x + Math.cos(t) * rx, py = y + Math.sin(t) * ry; L.disc(px, py, Math.max(1, ry * .32), Math.sin(t) < -.3 ? Lt : Math.cos(t) < 0 ? M : D); }
}
Object.assign(PAINT, {
  // the Hollow Hall: the Council's First-Age chamber under the Keep: old granite with a violet cast, a worn hearth-flame
  // carved on the far wall, the pillars going back down the nave, the marks of the four regions cut in them, and at the
  // end of the nave a great stone chair on its dais glowing violet-black, as if something dark sat in it a moment ago;
  // braziers burning low; dust and cold ash over everything. Ancient, solemn and wrong
  'hollow-hall'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    masonry(sky, 0, 0, W, gy + 3, ['#08070b', '#0d0b11', '#131018', '#19151f', '#211b28'], '#050407', 12, 6, 801, (x, y) => .8 + y / gy * 1.6 - Math.abs(x + .5 - W / 2) / W * 1.2);
    // the carved hearth-flame on the far wall, worn smooth, a little light still caught in its grooves
    const fx0 = W / 2, fy0 = gy - 36, fh = Math.min(17, gy * .32), F = flamePts(fx0, fy0, fh);
    for (let k = 0; k < F.length; k++) { const a = F[k], b = F[(k + 1) % F.length]; sky.line(a[0], a[1], b[0], b[1], hx('#3a2f44'), .9); sky.line(a[0] + 1, a[1] + 1, b[0] + 1, b[1] + 1, hx('#050407'), .8); }
    lights.push({ x: fx0, y: fy0 - fh * .5, r: fh * .7, c: '#6a4a8a', a: .12, pulse: 1, flick: .2 });
    // the vault: ribs springing from the pillars, meeting over the nave
    const VR = hx('#15111b'), VL = hx('#2a2334');
    for (const s of [-1, 1]) for (const [x0, top] of [[W / 2 + s * 24, 2], [W / 2 + s * 44, -4], [W / 2 + s * 78, -12]]) for (let k = 0; k <= 24; k++) { const u = k / 24, x = x0 + (W / 2 - x0) * u, y = top + 10 - Math.sin(u * Math.PI / 2) * 10; far.disc(x, y, 1.4, VR); far.set(x, y - 1, VL, .7); }
    // the great chair at the end of the nave, on its dais: a high stone back, arms, the violet-black on it
    const cx = W / 2, cb = gy + 1, CS = ['#0c0a10', '#17131d', '#241e2c', '#352c40'].map(hx);
    far.rect(cx - 14, cb - 3, 28, 3, CS[1]); far.rect(cx - 14, cb - 3, 28, 1, CS[3]); far.rect(cx - 11, cb - 6, 22, 3, CS[2]); far.rect(cx - 11, cb - 6, 22, 1, CS[3]);
    far.poly([[cx - 7, cb - 6], [cx - 7, cb - 27], [cx - 5, cb - 31], [cx, cb - 33], [cx + 5, cb - 31], [cx + 7, cb - 27], [cx + 7, cb - 6]], CS[2]);
    far.line(cx - 7, cb - 27, cx - 7, cb - 7, CS[3]); far.line(cx - 5, cb - 31, cx, cb - 33, CS[3]);
    far.rect(cx - 10, cb - 13, 3, 7, CS[1]); far.rect(cx + 7, cb - 13, 3, 7, CS[0]); far.rect(cx - 10, cb - 14, 20, 2, CS[2]);
    for (const [a, b] of [[[cx - 8, cb - 7], [cx - 8, cb - 28]], [[cx - 8, cb - 28], [cx, cb - 34.4]], [[cx, cb - 34.4], [cx + 8, cb - 28]], [[cx + 8, cb - 28], [cx + 8, cb - 7]]]) far.line(a[0], a[1], b[0], b[1], hx('#a060f0'), .85);
    far.poly([[cx - 4, cb - 14], [cx + 4, cb - 14], [cx + 3, cb - 26], [cx, cb - 29], [cx - 3, cb - 26]], hx('#0a0610'));
    for (let y = cb - 26; y < cb - 14; y += 2) far.set(cx + (y % 4 ? -1 : 1), y, hx('#7a3ac8'), .8);
    lights.push({ x: cx, y: cb - 20, r: 18, c: '#9a52e8', a: .34, pulse: 1, flick: .35 }, { x: cx, y: cb - 22, r: 5, c: '#c89af8', a: .2, pulse: 1, flick: .6 });
    // the pillars down both sides of the nave, the nearest the biggest, the four marks cut in the near ones
    const PC = ['#0b0a0f', '#131018', '#1c1823', '#28222f', '#352d3e'];
    for (const [d, w, y0] of [[22, 5, gy - 30], [36, 8, gy - 38], [58, 12, gy - 52], [84, 18, -4]]) for (const s of [-1, 1]) stonePillar(mid, W / 2 + s * d, w, y0, gy + (d > 40 ? (d - 30) * .3 : 1), PC);
    const MK = hx('#4a3e58');
    const mark = (x, y, kind) => {
      if (kind === 'tree') { mid.line(x, y + 3, x, y - 1, MK); mid.disc(x, y - 3, 2.2, MK); }
      else if (kind === 'sun') { mid.disc(x, y, 1.6, MK); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; mid.set(x + Math.cos(a) * 3, y + Math.sin(a) * 3, MK); } }
      else if (kind === 'anvil') { mid.poly([[x - 3, y - 1], [x + 3, y - 1], [x + 1, y + 1], [x + 1, y + 3], [x - 1, y + 3], [x - 1, y + 1]], MK); mid.poly([[x - 3, y - 2], [x, y - 5], [x + 3, y - 2]], MK, .6); }
      else { mid.rect(x - 1, y - 2, 3, 4, MK); mid.set(x, y - 3, MK); for (const dx of [-3, 3]) mid.line(x + dx, y + 3, x + dx * .6, y - 1, MK, .7); }
    };
    mark(W / 2 - 58, gy - 26, 'tree'); mark(W / 2 + 58, gy - 26, 'sun'); mark(W / 2 - 36, gy - 18, 'anvil'); mark(W / 2 + 36, gy - 18, 'lantern');
    // braziers burning low between the pillars
    for (const s of [-1, 1]) {
      const bx = W / 2 + s * 64, by = gy + 12;
      for (const dx of [-5, 0, 5]) mid.line(bx + dx * .5, by, bx + dx, by + 12, hx('#241c1a'));
      mid.poly([[bx - 7, by - 2], [bx + 7, by - 2], [bx + 4.4, by + 2.4], [bx - 4.4, by + 2.4]], hx('#2e2420')); mid.line(bx - 7, by - 2, bx + 7, by - 2, hx('#5a4a40'));
      for (let k = -5; k <= 5; k++) mid.set(bx + k, by - 3 + (hash(k, s, 802) < .4 ? -1 : 0), hx(k % 2 ? '#8a2a10' : '#d85a1a'));
      lights.push({ x: bx, y: by - 4, r: 14, c: '#ff7a2a', a: .32, flick: 1.1 + s * .3, torch: 1 });
    }
    // the floor: great old flagstones down the nave, dust and cold ash drifted against everything
    paving(gnd, gy, gy - 30, ['#0c0a0f', '#131018', '#1a1620', '#221d29'], '#060508', 18, 6, 803, (x, y) => 1 + (y - gy) / (H - gy) * 1.4 - Math.abs(x - W / 2) / W * .6);
    const ASH = hx('#6c6670'), ASHD = hx('#403c46');
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const n = vnoise(x * .16, y * .36, 804); if (n > .72) gnd.set(x, y, n > .8 ? ASH : ASHD, .3 + (y - gy) / (H - gy) * .15); }
    for (const s of [-1, 1]) for (let y = gy; y < H; y++) { const x0 = W / 2 + s * (20 + (y - gy) * 2.4); for (let k = 0; k < 6; k++) gnd.set(x0 + s * k, y, ASHD, .5 - k * .07); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'hollow', darkAmb: .12 };
  },
  // the Ash Stair: the hearth's roots going down through the world: a shaft of grey rock wrapped in roots of black iron
  // as thick as towers, ember running through the rock like veins, grey ash drifted on every step like snow; the stair
  // cut into the wall going down, and beside it the open drop, red from far below. Hot, hushed, going down
  'ash-stair'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    hewn(sky, 0, 0, W, gy + 3, ['#0c0b0c', '#141213', '#1c1a1a', '#262322', '#322e2c', '#3e3936'], 821, (x, y) => 1 + y / gy * 1.6 + Math.max(0, 1 - Math.hypot(x - W * .8, y - gy) / 46) * 1.8);
    // ember seams winding through the rock like veins, pulsing
    const veins = [];
    for (let k = 0; k < 5; k++) { let x = hash(k, 1, 822) * W * .8, y = 6 + hash(k, 2, 822) * (gy - 16), a = hash(k, 3, 822) * 2 - 1; const pts = [[x, y]]; for (let s2 = 0; s2 < 7; s2++) { a += (hash(k, s2, 823) - .5) * 1.2; x += Math.cos(a) * 4; y += Math.sin(a) * 3; pts.push([x, y]); } veins.push(pts); for (const [px, py] of pts) sky.set(px, py, hx('#3a1a0e')); }
    lights.push({ cracks: veins, c: '#ff6a24' });
    // the stair: rough-cut steps going down the far wall from the upper left, grey ash drifted on every tread
    const ST = ['#141211', '#221f1d', '#302c29', '#403b37'].map(hx), AS = ['#5e5a55', '#7e7872', '#a09a92'].map(hx);
    for (let k = 0; k < 11; k++) { const x0 = -4 + k * 8.6, y0 = gy - 30 + k * 2.6; mid.poly([[x0, y0], [x0 + 9.4, y0], [x0 + 9.4, y0 + 5], [x0, y0 + 5]], ST[1]); mid.line(x0, y0 + 4.6, x0 + 9.4, y0 + 4.6, ST[0]); mid.line(x0, y0, x0, y0 + 5, ST[2]); for (let x = x0; x < x0 + 9.4; x++) { mid.set(x, y0, AS[hash(x | 0, k, 826) < .3 ? 2 : 1]); if (hash(x | 0, k, 825) < .5) mid.set(x, y0 - 1, AS[0]); } }
    for (let x = -4; x < 92; x++) { const y = gy - 25 + (x + 4) * .3; for (let d = 0; d < 9; d++) if (!mid.d[(Math.round(y + d) * W + x) * 4 + 3]) mid.set(x, y + d, ST[0], .8); }
    // the drop beside it, red from far below, and its lip
    // (one dithered ramp from the dark above the lip, where its heat thins out unevenly, down to the red far below)
    const DR = ['#1a0604', '#2e0a06', '#4a1208', '#6a1c0a'].map(hx);
    for (let y = gy - 36; y < H; y++) for (let x = Math.max(0, Math.floor(W * .66 + (y - gy) * .45)); x < W; x++) {
      const top = gy - 20 - vnoise(x * .07, 0, 833) * 14, v = (y - top) / (H - top) * 4 - .7 + (x - W * .66) / W, l = Math.round(v + bayer(x, y) * .9 - .45);
      if (l >= 0) mid.set(x, y, DR[Math.min(3, l)]);
    }
    for (let y = gy - 8; y < H; y++) { const x = W * .66 + (y - gy) * .45; mid.set(x, y, hx('#8a8078')); mid.set(x - 1, y, hx('#4a4440')); }
    lights.push({ x: W * .88, y: H - 6, r: 34, c: '#ff4a14', a: .45, pulse: 1, flick: .45 }, { x: W * .84, y: gy - 6, r: 26, c: '#ff6a2a', a: .24, pulse: 1, flick: .8 });
    // the hearth's roots: black iron as thick as towers, twisting down the shaft
    const RT = ['#050405', '#0c0a0d', '#161319', '#231f28', '#35303c', '#4c4656'];
    tube(far, [[W * .02, -10], [W * .1, gy * .25], [W * .06, gy * .55], [W * .14, gy * .85], [W * .08, gy + 8]], 12, 8, RT, 8, 827);
    tube(far, [[W * .5, -12], [W * .46, gy * .3], [W * .56, gy * .62], [W * .52, gy - 2]], 7, 5, RT, 7, 828);
    tube(far, [[W * 1.02, -6], [W * .92, gy * .3], [W * .97, gy * .66], [W * .9, gy + 4]], 10, 7, RT, 8, 829);
    // the landing: rough stone, grey ash drifted on it like snow, a seam of ember through it
    const GF = ['#161413', '#211e1c', '#2c2826', '#3a3531'].map(hx), AD = ['#48443f', '#5c5752', '#736d67', '#8c867e'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W * .66 + (y - gy) * .45 - 1; x++) {
      const drift = vnoise(x * .05, y * .14, 830) + (y - gy) / (H - gy) * .1, n = vnoise(x * .2, y * .3, 831);
      if (drift > .62) gnd.set(x, y, AD[clampI(Math.round((drift - .62) * 9 + n * .8 + bayer(x, y) * .6 - .3), 3)]);
      else gnd.set(x, y, GF[clampI(Math.round(1 + (y - gy) / (H - gy) * 1.4 + (n - .5) * 1.4 + bayer(x, y) * .6 - .3), 3)]);
    }
    const seam = []; let sx = 6, sy = gy + 14; for (let s2 = 0; s2 < 9; s2++) { seam.push([sx, sy]); sx += 6 + hash(s2, 1, 832) * 5; sy += (hash(s2, 2, 832) - .45) * 4; }
    for (let s2 = 0; s2 < seam.length - 1; s2++) gnd.thick(seam[s2][0], seam[s2][1], seam[s2 + 1][0], seam[s2 + 1][1], .8, .6, hx('#2a0c06'));
    lights.push({ cracks: [seam], c: '#ff5a1a' }, { x: seam[4][0], y: seam[4][1], r: 9, c: '#ff5a1a', a: .16, pulse: 1, flick: .5 });
    return { layers: [sky, far, mid, gnd], lights, fx: 'ashfall', darkAmb: .14 };
  },
  // the Chained Deep: the cavern at the roots of the world. The First Sleeper lies curled in its hollow like a low hill of
  // dark stone and old ember, one enormous eye shut, its heart glowing slow and red through its hide; a web of chains
  // with links the size of carts pins it down, staked into the rock; the Eternal Hearth's black iron roots come down
  // out of the dark and sink into its back. The fight is on the iron walkway above the hollow, by its chain rail
  'chained-deep'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#030204', '#060407', '#0a0709', '#0f0b0c', '#150f0f'], 0, gy + 3);
    hewn(sky, 0, 0, W, 12, ['#060506', '#0d0b0c', '#151213'], 841, (x, y) => (y > 6 + vnoise(x * .1, 0, 842) * 6 ? null : 1.4 - y / 12));
    // the First Sleeper: a vast curled hump of dark stone plates, old ember in the seams between them; its heart's red
    // coming through the plates in the middle
    const top = gy - 34, sc = W * .56, SL = ['#07050a', '#0e0a0e', '#161013', '#1f1718', '#2a1f1e', '#3e2e29'].map(hx);
    const hump = x => { const u = (x - W * .2) / (W * .78); if (u < 0 || u > 1) return null; return top + Math.pow(1 - Math.sin(u * Math.PI), 1.4) * 30 + (vnoise(x * .05, 0, 843) - .5) * 3; };
    const cell = (x, y) => { const cx = Math.floor(x / 9), cy = Math.floor(y / 6); let best = 1e9, second = 1e9, id = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const px = (cx + i + hash(cx + i, cy + j, 844)) * 9, py = (cy + j + hash(cx + i, cy + j, 845)) * 6, d = Math.hypot((x - px) / 1.2, y - py); if (d < best) { second = best; best = d; id = (cx + i) * 131 + cy + j; } else if (d < second) second = d; } return [second - best, id]; };
    const seams = [];
    for (let x = 0; x < W; x++) { const t = hump(x); if (t === null) continue; for (let y = Math.floor(t); y < gy + 2; y++) { const [edge, id] = cell(x, y), heat = Math.max(0, 1 - Math.hypot(x - sc, (y - gy + 12) * 1.6) / 34); if (edge < .9) { far.set(x, y, heat > .3 && hash(id, 1, 846) < .7 ? hx('#5a1a0c') : SL[0]); if (heat > .45 && hash(x, y, 847) < .35) seams.push([x, y]); } else far.set(x, y, SL[clampI(Math.round(1.6 + (y - t) / 16 * 1.4 - (x - sc) / W * 1.2 + (hash(id, 2, 848) - .5) * 1.2 + heat * 1.6 + bayer(x, y) * .5 - .25), 5)]); } far.set(x, Math.floor(t), SL[5], .7); }
    lights.push({ x: sc, y: gy - 12, r: 26, c: '#e83a1a', a: .32, pulse: 1, flick: .14 }, { x: sc, y: gy - 12, r: 8, c: '#ff8a4a', a: .2, pulse: 1, flick: .14 });
    // its head at the left, laid on the floor of its hollow, the one enormous eye shut, a line of red under the lid
    const HX = W * .15, HY = gy - 11;
    far.poly([[HX - 25, HY + 12], [HX - 21, HY - 4], [HX - 7, HY - 12], [HX + 10, HY - 13], [HX + 24, HY - 6], [HX + 26, HY + 12]], SL[3]);
    far.poly([[HX - 21, HY - 4], [HX - 7, HY - 12], [HX + 10, HY - 13], [HX + 8, HY - 9], [HX - 6, HY - 8], [HX - 18, HY - 1]], SL[4]);
    far.line(HX - 21, HY - 4, HX - 7, HY - 12, SL[5]); far.line(HX - 7, HY - 12, HX + 10, HY - 13, SL[5]);
    for (let k = 0; k <= 16; k++) { const u = k / 16, x = HX - 13 + u * 20, y = HY - 3 + Math.sin(u * Math.PI) * 3; far.set(x, y, SL[0]); far.set(x, y + 1, hx('#7a2410')); }
    for (let k = 0; k <= 16; k += 2) { const u = k / 16; far.set(HX - 13 + u * 20, HY - 5 + Math.sin(u * Math.PI) * 1.2, SL[5]); }
    lights.push({ x: HX - 3, y: HY - 1, r: 7, c: '#ff3a1a', a: .18, pulse: 1, flick: .11 });
    // the roots out of the dark roof, bent down into its back
    const RT = ['#040304', '#0a090b', '#141216', '#211e25', '#302b36'];
    tube(far, [[W * .36, -8], [W * .42, 10], [W * .46, top + 3]], 5, 4, RT, 7, 849);
    tube(far, [[W * .6, -8], [W * .56, 12], [W * .6, top - 1]], 7, 5, RT, 7, 850);
    tube(far, [[W * .86, -8], [W * .8, 14], [W * .76, top + 6]], 4, 3.4, RT, 6, 851);
    // the chains: great links, each the size of a cart, over its back and down to their stakes
    const CH = ['#0c0b0d', '#24222a', '#44404c'];
    const swag = (x0, y0, x1, y1, n, sag) => { for (let k = 0; k < n; k++) { const u = (k + .5) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag; bigLink(far, x, y, 4.4, 3, CH, k % 2 === 1); } far.rect(x1 - 2, y1, 4, 5, hx('#2a262e')); far.rect(x1 - 3, y1 - 1, 6, 1.6, hx('#4a4450')); };
    swag(W * .44, top + 2, W * .34, gy + 1, 5, 2); swag(W * .66, top + 1, W * .82, gy + 1, 5, 2); swag(W * .56, top - 1, W * .98, gy - 6, 6, 5);
    // the walkway's chain rail in the near dark
    for (const x of [W * .12, W * .5, W * .88]) { mid.rect(x - 1, gy + 1, 2, 9, hx('#1c1a1e')); mid.rect(x - 1, gy + 1, 1, 9, hx('#3e3a42')); }
    for (let x = 0; x < W; x++) { const u = ((x - W * .12) % (W * .38) + W * .38) % (W * .38) / (W * .38), y = gy + 3 + Math.sin(u * Math.PI) * 3; mid.set(x, y, hx(x % 3 === 0 ? '#4a4652' : '#26242a')); }
    // the floor: iron plates riveted into black slag, the slag cracked with faint red at the edges
    const PL = ['#0e0d10', '#151418', '#1d1b21', '#26242b'].map(hx), SG = ['#070506', '#0c0808', '#120c0b'].map(hx);
    for (let y = gy; y < H; y++) { const hw = W * .3 + (y - gy) * 1.6; for (let x = 0; x < W; x++) { if (Math.abs(x + .5 - W / 2) > hw) { gnd.set(x, y, SG[clampI(Math.round((y - gy) / (H - gy) * 2 + (vnoise(x * .15, y * .3, 852) - .5) * 1.4), 2)]); continue; } const z = (H - (gy - 20)) / (y - (gy - 20)), row = Math.floor(z * 5), col = Math.floor((x - W / 2) * z / 22 + row * .5); gnd.set(x, y, (z * 5) % 1 < .12 * z || ((x - W / 2) * z / 22 + row * .5) % 1 < .05 * z ? PL[0] : PL[clampI(Math.round(1.6 + (hash(col, row, 853) - .5) * .9 + bayer(x, y) * .6 - .3), 3)]); } }
    const slagCracks = []; for (let k = 0; k < 6; k++) { const sd = k & 1 ? 1 : -1; let x = W / 2 + sd * (W * .34 + hash(k, 1, 854) * 30), y = gy + 6 + hash(k, 2, 854) * (H - gy - 10); const pts = [[x, y]]; for (let j = 0; j < 4; j++) { x += sd * (2 + hash(k, j, 855) * 4); y += (hash(k, j, 856) - .5) * 4; pts.push([x, y]); } slagCracks.push(pts); }
    lights.push({ cracks: slagCracks, c: '#8a2210' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'deep', darkAmb: .1 };
  },
  // the Worldforge: the Unsmith's forge at the bottom of the world, a colossal hall hewn into the rock and plated with
  // black iron; the Worldforge itself against the far wall, a furnace as big as a house shaped like a great heart of
  // black iron and firebrick, its mouth blazing white-gold; molten metal running from it across the floor; chains and
  // hooks hung with broken relics waiting for the fire; racks of giant tongs and hammers; a great anvil; slag; sparks,
  // and the air shaking with the heat. Terrible and magnificent
  worldforge(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const fx0 = W / 2, glowAt = (x, y) => Math.max(0, 1 - Math.hypot(x - fx0, (y - gy) * 1.3) / (W * .55));
    masonry(sky, 0, 0, W, gy + 3, ['#08070a', '#0e0c0f', '#151215', '#1d1818', '#2a1e1a', '#3a2418'], '#040304', 14, 8, 861, (x, y) => .8 + glowAt(x, y) * 3.6 + y / gy * .6);
    for (let y = 7; y < gy; y += 8) for (let x = 3; x < W; x += 7) sky.set(x + ((y >> 3) & 1) * 3, y, hx('#4a3a32'), .8);
    // the Worldforge: a heart of black iron bands and firebrick, its mouth an arch blazing white-gold
    const top = 4, hw = 30, hh = gy - top + 2, HP = heartPts(fx0, top, hw, hh);
    const FB = ['#1a0c0a', '#2e1410', '#4a1e14', '#6a2c1a'].map(hx), IB = hx('#141116'), IBL = hx('#3a3238');
    for (let y = 0; y < gy + 3; y++) for (let x = Math.floor(fx0 - hw * 1.3); x < fx0 + hw * 1.3; x++) { if (!inPoly(x + .5, y + .5, HP)) continue; const row = Math.floor(y / 3), brick = y % 3 === 0 || (x + (row & 1) * 3) % 6 === 0; far.set(x, y, brick ? FB[0] : FB[clampI(Math.round(1 + glowAt(x, y) * 1.4 + bayer(x, y) * .5 - .25), 3)]); }
    for (const a of [.28, .55, .8]) { const y = top + hh * a; for (let x = Math.floor(fx0 - hw * 1.2); x < fx0 + hw * 1.2; x++) if (inPoly(x + .5, y + .5, HP)) { far.set(x, y, IB); far.set(x, y + 1, IB); far.set(x, y - 1, IBL, .6); } }
    for (let k = 0; k < HP.length - 1; k++) far.line(HP[k][0], HP[k][1], HP[k + 1][0], HP[k + 1][1], IB);
    const mw = 10, my = gy - 1, mt = gy - 20;
    far.poly([[fx0 - mw, my], [fx0 - mw, mt + mw], [fx0 - mw * .7, mt + 3], [fx0, mt], [fx0 + mw * .7, mt + 3], [fx0 + mw, mt + mw], [fx0 + mw, my]], hx('#ffb040'));
    far.poly([[fx0 - mw + 3, my], [fx0 - mw + 3, mt + mw + 2], [fx0, mt + 5], [fx0 + mw - 3, mt + mw + 2], [fx0 + mw - 3, my]], hx('#fff0c0'));
    lights.push({ x: fx0, y: my - 8, r: 34, c: '#ffae3a', a: .55, flick: 1.3, core: [[fx0 - 1, my - 6], [fx0 + 1, my - 9], [fx0, my - 12]] }, { x: fx0, y: my - 6, r: 12, c: '#fff4d0', a: .35, flick: 2.1 });
    // chains from the dark roof, hooks hung with broken relics waiting for the fire
    const RL = ['#b89a60', '#8a8e9a', '#c8a040', '#7a6aa0'].map(hx);
    for (const [x, len, kind] of [[W * .14, 26, 0], [W * .24, 18, 1], [W * .76, 22, 2], [W * .88, 30, 3]]) {
      chainDown(far, x, 0, len, '#3a3438'); far.line(x, len, x + 2, len + 2, hx('#4a4448')); far.line(x + 2, len + 2, x + 1, len + 4, hx('#4a4448'));
      const c = RL[kind], y = len + 5;
      if (kind === 0) { far.line(x - 1, y - 2, x + 5, y + 6, c); far.line(x - 2, y, x + 1, y - 3, c); }
      else if (kind === 1) { far.disc(x + 1, y + 1, 2.4, c); far.disc(x + 1, y + 1, 1.2, hx('#0c0a0c')); }
      else if (kind === 2) { far.rect(x - 2, y, 7, 2, c); for (const dx of [-2, 0.5, 3]) far.line(x + dx, y, x + dx, y - 2, c); }
      else { far.line(x, y - 2, x, y + 8, c); far.line(x - 2, y + 1, x + 2, y + 1, c); }
      lights.push({ x: x + 1, y, r: 4, c: '#ffae3a', a: .1, flick: .5 + x * .01 });
    }
    // the racks of giant tongs and hammers on the walls; slag heaps; the great anvil to one side
    for (const x0 of [W * .04, W * .9]) { mid.rect(x0, gy - 30, 12, 2, hx('#2a1e18')); for (let k = 0; k < 3; k++) { const x = x0 + 2 + k * 4; if (k % 2) { mid.line(x, gy - 28, x, gy - 10, hx('#2a262a')); mid.rect(x - 1.5, gy - 12, 4, 4, hx('#2a262a')); mid.set(x - 1, gy - 12, hx('#6a5a50')); } else { mid.line(x - .6, gy - 28, x - 1.8, gy - 10, hx('#2a262a')); mid.line(x + .6, gy - 28, x + 1.8, gy - 10, hx('#2a262a')); } } }
    const AN = ['#0e0c0e', '#2a2426', '#6a5a52'].map(hx), ax = W * .2, ay = gy + 8;
    mid.poly([[ax - 12, ay - 10], [ax + 8, ay - 10], [ax + 18, ay - 8.6], [ax + 8, ay - 6.4], [ax + 4, ay - 6], [ax + 3, ay - 3], [ax + 7, ay], [ax - 8, ay], [ax - 4, ay - 3], [ax - 5, ay - 6], [ax - 12, ay - 7.6]], AN[1]);
    mid.line(ax - 12, ay - 10, ax + 8, ay - 10, AN[2]); mid.line(ax + 8, ay - 10, ax + 18, ay - 8.6, AN[2]); mid.rect(ax - 8, ay - 1, 15, 1, AN[0]);
    for (const [x, r] of [[W * .9, 7], [W * .78, 5]]) for (let y = Math.floor(gy + 6 - r); y < gy + 7; y++) for (let xx = Math.floor(x - r * 1.4); xx < x + r * 1.4; xx++) { const d = Math.hypot((xx - x) / 1.4, y - (gy + 6)) / r; if (d < 1) mid.set(xx, y, hx(['#0c0808', '#1a1210', '#2a1c16'][clampI(Math.round((1 - d) * 2 + bayer(xx, y) * .6 - .3), 2)])); }
    // the floor: iron plates and hammered stone, and the molten channels running across it from the forge
    paving(gnd, gy, gy - 24, ['#0c0a0b', '#141011', '#1c1616', '#261c1a'], '#050304', 14, 6, 862, (x, y) => 1 + glowAt(x, y) * 2.2 + (y - gy) / (H - gy) * .6);
    const chan = (pts, w) => { for (let s = 0; s < pts.length - 1; s++) { gnd.thick(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], w + 1.2, w + 1.2, hx('#1a0e0a')); gnd.thick(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], w, w, hx('#ff8a24')); gnd.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#fff0b0'), .8); } return pts; };
    const c1 = chan([[fx0 - 4, gy + 1], [fx0 - 14, gy + 8], [fx0 - 34, gy + 14], [fx0 - 70, gy + 24], [fx0 - 96, gy + 30]], 1.1);
    const c2 = chan([[fx0 + 4, gy + 1], [fx0 + 16, gy + 10], [fx0 + 40, gy + 22], [fx0 + 84, gy + 44]], 1.3);
    lights.push({ cracks: [c1, c2], c: '#ffd070' });
    for (const p of [c1[2], c2[2], c2[3]]) lights.push({ x: p[0], y: p[1], r: 10, c: '#ff8a24', a: .22, pulse: 1, flick: .7 + p[0] * .01 });
    return { layers: [sky, far, mid, gnd], lights, fx: 'forge', darkAmb: .16 };
  },
});

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
      // M5: snow on the wind, sparks off the forges and the hearth, glitter in the ice caves (and violet motes up from Hush)
      case 'snow': { const ph = (t * .05 * sp + r3) % 1; out.push({ x: (r1 * w + ph * 30 + Math.sin(t * 1.1 + k) * 3) % w, y: ph * h, c: k % 4 === 0 ? [255, 255, 255] : [214, 228, 244], a: k % 4 === 0 ? .95 : .7 }); break; }
      case 'sparks': { const ph = (t * .1 * sp + r3) % 1; out.push({ x: r1 * w + Math.sin(t * 2.2 + k * 1.3) * 3 + ph * 6, y: h - ph * h * .9, c: r2 > .6 ? [255, 236, 170] : [255, 150, 60], a: Math.min(1, (1 - ph) * 2.5) * (ph < .7 ? .95 : .5) }); break; }
      case 'rime': { const s = Math.sin(t * 1.3 * sp + k * 2.3), ph = (t * .02 * sp + r3) % 1; out.push(k % 3 === 0 ? { x: r1 * w + Math.sin(t * .4 + k) * 4, y: gy + r2 * (h - gy) - ph * 12, c: [180, 170, 255], a: Math.min(1, (1 - ph) * 3) * .7 } : { x: r1 * w + Math.sin(t * .4 + k) * 4, y: ph * h, c: [200, 232, 255], a: s > .5 ? (s - .5) * 1.6 : .15 }); break; }
      // M6: midges dancing over the fen, wisps drifting low over the water, moths round the lamps, bubbles coming up
      // through the water, spray off the sea
      case 'midge': { const cx = (hash(k % 3, 4, 7) * .8 + .1) * w, cy = gy - 8 + hash(k % 3, 5, 7) * (h - gy) * .5; out.push({ x: cx + Math.sin(t * 3.1 * sp + k * 1.7) * 5 + Math.sin(t * 7.3 + k) * 1.2, y: cy + Math.cos(t * 2.6 * sp + k * 2.3) * 3.4, c: [176, 186, 150], a: .5 }); break; }
      case 'wisp': out.push({ x: r1 * w + Math.sin(t * .35 * sp + k) * 9, y: gy - 6 + r3 * (h - gy) * .7 + Math.cos(t * .5 + k * 1.3) * 3, c: k % 3 ? [206, 240, 128] : [255, 240, 176], a: Math.max(0, Math.sin(t * 1.3 * sp + k * 2.1)) * .85 }); break;
      case 'moth': { const cx = (hash(k % 4, 4, 8) * .7 + .15) * w, cy = gy - 14 + hash(k % 4, 5, 8) * 16; out.push({ x: cx + Math.cos(t * 2.2 * sp + k * 1.9) * 7 + Math.sin(t * 9 + k) * 1, y: cy + Math.sin(t * 1.7 * sp + k * 2.7) * 5, c: k % 2 ? [236, 226, 196] : [255, 236, 170], a: .75 }); break; }
      case 'bubble': { const ph = (t * .07 * sp + r3) % 1; out.push({ x: r1 * w + Math.sin(t * 2 + k) * 1.2, y: h - ph * (h - gy * .4), c: k % 3 ? [150, 214, 196] : [214, 250, 236], a: Math.min(1, ph * 6) * (1 - ph) * .75 }); break; }
      case 'spray': { const ph = (t * .28 * sp + r3) % 1; out.push({ x: (r1 * w + ph * 18) % w, y: gy + r2 * (h - gy) * .3 - Math.sin(ph * Math.PI) * 9, c: [206, 222, 226], a: Math.sin(ph * Math.PI) * .6 }); break; }
      // M7: cold ash hanging in the Hollow Hall with the gift's violet in it; ash coming down the Ash Stair and embers
      // going up it; the Sleeper's slow red motes in the Chained Deep; the Worldforge's sparks and the shimmer of its heat
      case 'hollow': { const ph = (t * .02 * sp + r3) % 1; out.push(k % 4 === 0 ? { x: r1 * w + Math.sin(t * .6 + k) * 5, y: gy - 6 - ph * gy * .7, c: [176, 118, 240], a: Math.sin(ph * Math.PI) * .7 } : { x: (r1 * w + Math.sin(t * .4 + k * 1.3) * 4) % w, y: r3 * h * .95 + Math.sin(t * .3 + k) * 2, c: r2 > .5 ? [128, 122, 132] : [92, 88, 98], a: .35 + .2 * Math.sin(t * .7 + k) }); break; }
      case 'ashfall': { const ph = (t * .04 * sp + r3) % 1; out.push(k % 5 === 0 ? { x: r1 * w + Math.sin(t * 1.2 + k) * 3, y: h - ph * h, c: [255, 140, 60], a: Math.min(1, (1 - ph) * 2) * .8 } : { x: (r1 * w + Math.sin(t * .8 + k * 1.3) * 6) % w, y: ph * h, c: r2 > .5 ? [178, 172, 164] : [130, 124, 118], a: .7 }); break; }
      case 'deep': { const ph = (t * .018 * sp + r3) % 1; out.push({ x: r1 * w + Math.sin(t * .4 + k * 1.7) * 6, y: gy + 8 - ph * (gy + 4), c: k % 3 ? [200, 70, 40] : [255, 130, 80], a: Math.sin(ph * Math.PI) * (.5 + .3 * Math.sin(t * .8 + k)) }); break; }
      case 'forge': { const ph = (t * .12 * sp + r3) % 1; out.push(k % 3 === 0 ? { x: w * .5 + (r1 - .5) * w * .5 + Math.sin(t * 2 + k) * 2, y: gy - ph * gy * .9, c: [255, 236, 170], a: (1 - ph) * .9 } : { x: r1 * w + Math.sin(t * 1.6 + k) * 3 + ph * 5, y: h - ph * h, c: r2 > .5 ? [255, 160, 60] : [255, 110, 40], a: Math.min(1, (1 - ph) * 2.2) * .85 }); break; }
    }
  }
  if (S.dark) for (const p of out) p.a *= .55;
  return out;
}
// Thareia: over a painted backdrop the stage draws only the key's ambient drift, on a clear canvas
function paintedDrift(key, o) {
  const w = o.w || 160, h = o.h || 96, img = new ImageData(w, h), d = img.data;
  if (o.reduced) return img;
  for (const p of ambient(key, o.t || 0, { w, h, dark: o.dark })) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.a <= .05 || x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4; d[i] = p.c[0]; d[i + 1] = p.c[1]; d[i + 2] = p.c[2]; d[i + 3] = Math.round(Math.min(1, p.a) * 255);
  }
  return img;
}
// renderBackdrop(key, { w, h, t, reduced, dark, painted }) -> ImageData (painted: the drift only, for a painted backdrop)
export function renderBackdrop(key, o = {}) {
  if (o.painted) return paintedDrift(key, o);
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
  if (P.B.mist) drawMist(L, t, P.gy, w, h, P.B.dark);
  if (!o.reduced) for (const p of ambient(key, t, { w, h, dark: o.dark })) if (p.a > .05) L.set(p.x, p.y, p.c, p.a);
  return L.img();
}
// M6: the fog on a foggy map (a listing with mist: true): banks of it drifting slowly across, at t (still when reduced)
function drawMist(L, t, gy, W, H, dark) {
  const C = hx(dark ? '#4a5048' : '#b4c0b0'), top = gy - H * .22;
  for (let b = 0; b < 4; b++) {
    const yc = top + b * (H - top) / 3.4, th = 4 + b * 2.2, off = t * (1.6 + b * .7) * (b & 1 ? -1 : 1), col = new Float32Array(W);
    for (let x = 0; x < W; x++) col[x] = vnoise((x + off) * .03, b * 7.3, 731);
    for (let y = Math.floor(yc - th); y < yc + th; y++) { const f = 1 - Math.abs(y + .5 - yc) / th; for (let x = 0; x < W; x++) { const a = (col[x] * f - .22) * .55; if (a > 0 && a + bayer(x, y) * .1 > .07) L.set(x, y, C, Math.min(.3, a)); } }
  }
}
