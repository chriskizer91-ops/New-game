// Overworld tilesets (M3 spec §5.1): 16 px tiles for every tile id in data/tiles.js, one atlas per
// biome, built with the Forge (lit, palette-quantised MAT ramps) and cached for the session.
// Browser-only: returns ImageData.
//
// tileAtlas(biome) -> atlas
//   biome   keep | wilds | town | grove | fen | tower | roots | den (unknown biomes read as wilds)
//   atlas.img                         ImageData holding every cell (turn it into a canvas once)
//   atlas.at(tileId, variant, frame)  -> [sx, sy] of a 16x16 base cell
//   atlas.variants(tileId)            -> hash variants of the base cell (2-4 for ground)
//   atlas.frames(tileId)              -> 2 for animated tiles (water, ford, torch-wall, fungus, ichor), else 1
//   atlas.cell(rows, x, y, frame)     -> { ground: [op...], over: [op...] } everything to draw for map cell
//                                       (x, y): the hash-picked base, the 4-bit edge overlay (water shores,
//                                       road verges, cliff lips, wall rims, bridge rails) and inner corners,
//                                       and the overhead parts (tree canopies, roofs, tall-grass tops).
//                                       op = [sx, sy, w, h, dx, dy]: blit atlas rect (sx, sy, w, h) to the
//                                       tile's top-left + (dx, dy). Ground ops stay inside the tile; over
//                                       ops reach at most 16 px up and 4 px sideways, so a chunk baker must
//                                       also visit the row below its bottom edge and one column each side.
//   atlas.edge(tileId, mask, frame)   -> [sx, sy] | null   mask bits N=1 E=2 S=4 W=8 (neighbour differs)
//   atlas.over(tileId, variant)       -> [sx, sy, w, h, dx, dy] | null   the overhead image out of context
//   atlas.pick(tileId, x, y)          -> the hash variant for a map position
//   atlas.ms                          build time in ms (for the perf gallery)
// Ground keeps to ramp steps 1-3 so sprites (full ramp, outlined) pop; scenery (walls, trees, rocks)
// goes to step 4; only light sources (flames, fungus, ichor glints) use the top of their ramps.
// Owner: WP5.

import { Forge, compose, MAT, HV, hash, bayer } from './forge.js';
import { TILES, TILE_IDS, TILE_FRAMES, tileOf } from '../data/tiles.js';

export const TILE_PX = 16;
export const BIOMES = Object.freeze(['keep', 'wilds', 'town', 'grove', 'fen', 'tower', 'roots', 'den']);
export const EDGE_BITS = Object.freeze({ n: 1, e: 2, s: 4, w: 8 });

const T = TILE_PX;
const P = pts => ({ k: 'p', pts });
const C = (a, b, ra, rb = ra) => ({ k: 'c', a, b, ra, rb });
const O = (c, r) => ({ k: 'o', c, r });
const E = (c, rx, ry) => ({ k: 'e', c, rx, ry });
const RECT = (x0, y0, x1, y1) => P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const FULL = RECT(-6, -6, 22, 22);

/* ---------- biome palettes: roles -> MAT ramp names ---------- */
const BASE_PAL = {
  grass: 'moss', grassDark: 'seaweed', clover: 'paintGreen', soil: 'gambeson', soilDark: 'rags', mud: 'bogwood',
  stone: 'granite', mortar: 'dark', wall: 'granite', cap: 'granite', roof: 'clothBlue', roofEdge: 'iron',
  wood: 'wood', woodDark: 'bogwood', floor: 'wood', rug: 'robeRed', water: 'water', puddle: 'water', foam: 'frost', bank: 'bogwood',
  leaf: 'moss', leafDark: 'seaweed', trunk: 'bark', flowers: ['clothWhite', 'gold', 'paintRed'], reed: 'bramble',
  fungus: 'water', fungusStem: 'bone', fungusGround: 'rags', ichor: 'sap', ichorGlow: 'blight', root: 'bark', rootDark: 'rotwood',
  darkFloor: 'clothGrey', void: 'dark', cliff: 'granite', cliffDark: 'bogwood', thorn: 'thorn', bush: 'moss',
  torch: 'ember', sconce: 'iron', door: 'wood', doorFrame: 'granite', stair: 'granite', bridge: 'wood', rail: 'bogwood',
  palisade: 'wood', palisadeBand: 'rags', canopy: 'oak', dither: 0,
};
const PAL = {
  keep: { stone: 'granite', wall: 'granite', roof: 'clothBlue', floor: 'wood', bridge: 'granite', rail: 'granite', flowers: ['clothWhite', 'gold', 'amethyst'], doorFrame: 'granite' },
  wilds: { grass: 'moss', soil: 'gambeson', bridge: 'wood', wall: 'granite', roof: 'leather', flowers: ['gold', 'clothWhite', 'paintRed'] },
  town: { grass: 'bramble', grassDark: 'moss', soil: 'leather', soilDark: 'rags', wall: 'robe', roof: 'gambeson', roofEdge: 'wood', floor: 'wood', doorFrame: 'wood', bush: 'bramble', flowers: ['gold', 'paintRed', 'clothWhite'], canopy: 'pine' },
  grove: { stoneMoss: 'moss', stoneDim: -.3, fungusGround: 'seaweed', grass: 'drake', grassDark: 'seaweed', clover: 'moss', soil: 'bogwood', soilDark: 'robeBark', stone: 'granite', wall: 'bark', cap: 'bark', roof: 'moss', roofEdge: 'bark', floor: 'wood', doorFrame: 'bark', leaf: 'drake', leafDark: 'seaweed', flowers: ['clothWhite', 'frost', 'amethyst'], fungus: 'water', canopy: 'elder', bush: 'drake' },
  fen: { water: 'clothTeal', puddle: 'clothTeal', grass: 'seaweed', grassDark: 'bramble', clover: 'bramble', soil: 'bogwood', soilDark: 'leatherDark', mud: 'bogwood', bank: 'leatherDark', wall: 'granite', roof: 'bogwood', bridge: 'bogwood', rail: 'bogwood', leaf: 'bramble', leafDark: 'seaweed', flowers: ['clothWhite', 'gold', 'clothWhite'], reed: 'bramble', canopy: 'willow', bush: 'bramble' },
  tower: { stoneDim: -.45, grass: 'bramble', soil: 'rags', stone: 'granite', wall: 'granite', floor: 'granite', darkFloor: 'clothGrey', roof: 'bogwood', doorFrame: 'granite', canopy: 'oak' },
  roots: { rootFloor: 'robeBark', puddle: 'sap', fungusGround: 'robeBark', grass: 'moss', soil: 'robeBark', soilDark: 'rotwood', stone: 'rotwood', wall: 'bark', cap: 'rotwood', floor: 'bark', darkFloor: 'rotwood', root: 'bark', rootDark: 'rotwood', fungus: 'water', water: 'water', bank: 'rotwood', leaf: 'moss', cliff: 'rotwood', cliffDark: 'rot', canopy: 'elder', bush: 'moss', doorFrame: 'bark' },
  den: { puddle: 'sap', fungusGround: 'rot', grass: 'rotwood', grassDark: 'rot', clover: 'bramble', soil: 'rotwood', soilDark: 'rot', mud: 'rot', stone: 'rotwood', wall: 'rotwood', cap: 'rot', floor: 'rotwood', darkFloor: 'rot', root: 'rotwood', rootDark: 'rot', leaf: 'bramble', leafDark: 'rot', bush: 'bramble', cliff: 'rotwood', cliffDark: 'rot', fungus: 'blight', canopy: 'dead', doorFrame: 'rotwood' },
};
const palOf = biome => Object.assign({}, BASE_PAL, PAL[biome] || PAL.wilds);

/* ---------- noise helpers (periodic over one tile so every variant tiles seamlessly) ---------- */
function pnoise(x, y, period, seed, periodY = period) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, m = v => ((v % period) + period) % period, n = v => ((v % periodY) + periodY) % periodY;
  const a = hash(m(xi), n(yi), seed), b = hash(m(xi + 1), n(yi), seed), c = hash(m(xi), n(yi + 1), seed), d = hash(m(xi + 1), n(yi + 1), seed);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// ground value in ramp steps below the flat base (3): n in 0..1 -> about -1.8 .. -.2, Bayer-dithered
const groundDD = (x, y, seed, lo = -1.75, hi = -.35, dith = .42) => lo + (hi - lo) * (pnoise(x / 4, y / 4, 4, seed) * .75 + pnoise(x / 2, y / 2, 8, seed + 7) * .25) + bayer(x, y) * dith;
const rnd = (a, b, s) => hash(a, b, s);
// memoised ground fields: the same periodic noise backs every grass-based cell, in every biome
const FIELDS = new Map();
function field(seed, lo, hi, dith) {
  const key = seed + '|' + lo + '|' + hi + '|' + dith;
  let f = FIELDS.get(key);
  if (!f) { f = new Float32Array(T * T); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) f[y * T + x] = groundDD(x, y, seed, lo, hi, dith); FIELDS.set(key, f); }
  return f;
}
// a bevelled block drawn by texture: lit top/left pixel rows, shaded bottom/right, flat inside
const bevelDD = (x, y, x0, y0, x1, y1) => (y === y0 || x === x0 ? .7 : 0) + (y === y1 - 1 || x === x1 - 1 ? -1.1 : 0);
// which cell of a running-bond grid (w x h blocks, odd rows offset by `off`) a pixel falls in
function bond(x, y, w, h, off, oy = 0) { const r = Math.floor((y - oy) / h), sx = x + ((r & 1) ? off : 0), c = Math.floor(sx / w); return { r, c, x0: c * w - ((r & 1) ? off : 0), y0: r * h + oy, lx: ((sx % w) + w) % w, ly: (((y - oy) % h) + h) % h }; }

/* ---------- decals: per-pixel material and step overrides on a tile ---------- */
function decals() {
  const m = new Array(T * T).fill(null);
  return {
    set(x, y, mat, dd = 0) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < T && y < T) m[y * T + x] = { m: mat, dd }; },
    get: (x, y) => (x >= 0 && y >= 0 && x < T && y < T ? m[y * T + x] : null),
  };
}
// a tile-wide flat ground part: noise from `seed`, decals on top, optional per-pixel override fn
function ground(F, mat, seed, D, o = {}) {
  const { lo = -1.75, hi = -.35, dith = .42, fn } = o, fld = field(seed, lo, hi, dith);
  F.add({ mat, prof: 'flat', grp: 'base', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const x = q.x, y = q.y; const d = D && D.get(x, y); if (d) return d; if (fn) { const r = fn(x, y); if (r !== undefined) return r; } return x >= 0 && y >= 0 && x < T && y < T ? fld[y * T + x] : groundDD(x, y, seed, lo, hi, dith); } });
}
// deterministic spots inside the tile (kept away from the borders)
function spots(n, seed, pad = 2) { const out = []; for (let k = 0; k < n; k++) out.push([pad + Math.floor(rnd(k, 1, seed) * (T - 2 * pad)), pad + Math.floor(rnd(k, 2, seed) * (T - 2 * pad))]); return out; }
const tuft = (D, x, y, mat) => { D.set(x, y, mat, 0); D.set(x + 2, y, mat, 0); D.set(x + 1, y + 1, mat, -.2); D.set(x + 1, y + 2, mat, -1.6); };
const blade = (D, x, y, mat) => { D.set(x, y, mat, 0); D.set(x, y + 1, mat, -.6); };
const pebble = (D, x, y, mat) => { D.set(x, y, mat, 0); D.set(x + 1, y, mat, -.8); D.set(x, y + 1, mat, -1.2); D.set(x + 1, y + 1, mat, -2); };

/* ---------- ground tiles ---------- */
const SEEDS = { grass: 11, flowers: 11, 'tall-grass': 11, road: 23, mud: 31, roots: 41, 'dark-floor': 47, fungus: 53, ichor: 59, water: 61, ford: 67, void: 71 };
function paintGrass(F, Pl, v, extra = null) {
  const D = decals(), g = Pl.grass;
  for (const [x, y] of spots(5 + (v & 1) * 2, 100 + v * 17)) tuft(D, x - 1, y - 1, g);
  for (const [x, y] of spots(6, 300 + v * 13)) blade(D, x, y, g);
  if (v === 2) for (const [x, y] of spots(3, 700)) pebble(D, x, y, Pl.stone);
  if (v === 3) for (const [x, y] of spots(4, 900)) { D.set(x, y, Pl.clover, -.4); D.set(x + 1, y, Pl.clover, -1); D.set(x, y + 1, Pl.clover, -1); }
  if (extra) extra(D);
  ground(F, g, SEEDS.grass + (Pl.seed || 0), D, { fn: v === 1 ? (x, y) => { const d = Math.hypot(x - 8, y - 8); return d < 5.5 ? groundDD(x, y, 12, -2, -.9) : undefined; } : null });
}
function paintFlowers(F, Pl, v) {
  paintGrass(F, Pl, v & 1, D => {
    const fl = Pl.flowers;
    spots(5, 1300 + v * 29, 2).forEach(([x, y], k) => {
      const m = fl[(k + v) % fl.length];
      D.set(x, y, m, 0); D.set(x - 1, y, m, -1); D.set(x + 1, y, m, -1); D.set(x, y - 1, m, -1); D.set(x, y + 1, Pl.grass, -2);
    });
  });
}
function paintTallGrass(F, Pl, v) {
  const D = decals(), g = Pl.grass;
  for (let k = 0; k < 18; k++) { const x = Math.floor(rnd(k, 3, 40 + v) * 16), y = Math.floor(rnd(k, 4, 40 + v) * 14) + 1; blade(D, x, y, g); }
  ground(F, Pl.grassDark, SEEDS['tall-grass'], D, { lo: -1.9, hi: -.7 });
}
function paintRoad(F, Pl, v) {
  const D = decals();
  for (const [x, y] of spots(3 + v, 2000 + v * 7)) pebble(D, x, y, Pl.stone);
  for (const [x, y] of spots(5, 2100 + v * 5)) D.set(x, y, Pl.soilDark, -1.2);
  ground(F, Pl.soil, SEEDS.road, D, { lo: -1.25, hi: -.55, dith: .22 });
}
function paintMud(F, Pl, v) {
  const D = decals();
  const pv = flatV(Pl.puddle) - 3.92;
  for (const [x, y] of spots(3, 2500 + v * 11)) { D.set(x, y, Pl.puddle, -2.3 - pv); D.set(x + 1, y, Pl.puddle, -2.6 - pv); D.set(x - 1, y, Pl.mud, -.5); }
  ground(F, Pl.mud, SEEDS.mud, D, { lo: -1.6, hi: -.3 });
}
function paintFlagstone(F, Pl, v) {
  // slabs with a 1-px joint on their top and left sides only, so tiles join with even joints
  const layouts = [
    [[1, 1, 9, 16], [10, 1, 16, 9], [10, 10, 16, 16]],
    [[1, 1, 16, 7], [1, 8, 7, 16], [8, 8, 16, 16]],
    [[1, 1, 6, 10], [7, 1, 16, 16], [1, 11, 6, 16]],
  ];
  const L = layouts[v % layouts.length], moss = Pl.stoneMoss, dim = Pl.stoneDim || 0;
  F.add({ mat: Pl.stone, prof: 'flat', grp: 'slabs', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y, k = L.findIndex(([x0, y0, x1, y1]) => x >= x0 && y >= y0 && x < x1 && y < y1);
    if (k < 0) return -2.3;
    const [x0, y0, x1, y1] = L[k];
    if (moss && pnoise(x / 4, y / 4, 4, 61 + v) > .64) return { m: moss, dd: -1.2 };
    return -1 + dim + bevelDD(x, y, x0, y0, x1 === 16 ? 99 : x1, y1 === 16 ? 99 : y1) + (rnd(x, y, 80 + k + v) < .07 ? -.9 : 0) + bayer(x, y) * .25;
  } });
}
function paintPlanks(F, Pl, v, mat = Pl.floor, vertical = false) {
  // four boards per tile, a seam above each; some boards end mid-tile (never at a tile border)
  F.add({ mat, prof: 'flat', grp: 'planks', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const a = vertical ? q.x : q.y, b = vertical ? q.y : q.x, r = a >> 2, la = a & 3;
    if (la === 0) return { m: Pl.woodDark, dd: -1.4 };
    const cut = 3 + Math.floor(rnd(r, v, 91) * 10), ends = (r + v) % 3 === 0;
    if (ends && b === cut) return { m: Pl.woodDark, dd: -1.4 };
    const lb = ends && b > cut ? b - cut - 1 : b;
    return -.6 + (la === 1 ? .6 : la === 3 ? -.8 : 0) + (lb === 0 && ends && b > cut ? .5 : 0) + ((b + r * 3) % 5 === (v % 5) && rnd(b, r, 3) < .5 ? -.9 : 0) + bayer(q.x, q.y) * .3;
  } });
}
function paintDarkFloor(F, Pl, v) {
  const D = decals();
  for (const [x, y] of spots(2, 3100 + v)) pebble(D, x, y, Pl.stone);
  ground(F, Pl.darkFloor, SEEDS['dark-floor'] + v, D, { lo: -1.9, hi: -1, dith: .4 });
}
function paintRootFloor(F, Pl, v) {
  ground(F, Pl.rootFloor || Pl.soil, SEEDS.roots, null, { lo: -1.5, hi: -.6 });
  const lines = [[[-2, 4 + v], [18, 7 + v]], [[-2, 12 - v], [9, 10], [18, 13]], [[5 + v * 2, -2], [7, 8], [3 + v, 18]]];
  lines.forEach((pts, k) => { const sh = []; for (let i = 0; i < pts.length - 1; i++) sh.push(C(pts[i], pts[i + 1], .9 + (k === 0 ? .3 : 0))); F.add({ mat: Pl.root, prof: 'round', bw: 1, grp: 'r' + k, lo: 1, hi: 3, shapes: sh }); });
}
function paintFungus(F, Pl, v, f) {
  const D = decals();
  ground(F, Pl.fungusGround, SEEDS.fungus, D, { lo: -2, hi: -1.1 });
  const caps = [[4, 9, 2.1], [10, 5, 1.6], [11, 12, 1.9]].slice(0, 2 + (v & 1));
  caps.forEach(([x, y, r], k) => {
    F.add({ mat: Pl.fungusStem, prof: 'round', bw: .6, grp: 'st' + k, lo: 1, hi: 3, shapes: [C([x, y + .6], [x, y + r + 1.4], .6)] });
    F.add({ mat: Pl.fungus, prof: 'round', bw: 1, grp: 'cap' + k, lo: 2, hi: 5, glow: true, noShadow: true, shapes: [E([x, y], r, r * .72)], tex: () => (f ? .6 : -.4) });
  });
}
// the step a flat, fully-inside pixel of `mat` lands on before dd (emissive ramps sit higher)
const flatV = mat => (MAT[mat] && MAT[mat].emit ? (MAT[mat].eBase ?? 3) + 1.32 : (MAT[mat] && MAT[mat].base) ?? 3);
function paintWater(F, Pl, v, f, shallow = false) {
  const D = decals(), w = Pl.water, off = flatV(w) - 3.92;
  const rip = spots(shallow ? 3 : 2, 4000 + v * 31, 3);
  for (const [x, y] of rip) { const L = 3 + (x & 1), dx = f ? 1 : 0; for (let i = 0; i < L; i++) D.set(x + i + dx, y, w, (i === 1 ? -.9 : -1.7) - off + (shallow ? .6 : 0)); }
  if (shallow) { // a sandy bed shows through the shallows
    F.add({ mat: Pl.soil, prof: 'flat', grp: 'bed', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const d = D.get(q.x, q.y); if (d) return d; const n = pnoise(q.x / 4 + f * .5, q.y / 4, 4, SEEDS.ford); return n > .52 ? { m: w, dd: -2 - off + n * .6 + bayer(q.x, q.y) * .3 } : -1.2 + bayer(q.x, q.y) * .4; } });
    const stones = v ? [[4.2, 4.2], [11.4, 11]] : [[4.4, 11.2], [11.2, 4.6]];
    stones.forEach(([x, y], k) => F.add({ mat: Pl.stone, prof: 'round', bw: 1.6, grp: 'stone' + k, lo: 1, hi: 4, shapes: [E([x, y], 2.9, 2.2)], tex: q => (q.y > y + 1 ? { m: w, dd: -1.6 - off } : 0) }));
    return;
  }
  F.add({ mat: w, prof: 'flat', grp: 'water', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const d = D.get(q.x, q.y); if (d) return d; return -2.62 - off + (rnd(q.x, q.y, 61 + v * 3 + f) < .06 ? .8 : 0) + bayer(q.x, q.y) * .12; } });
}
function paintIchor(F, Pl, v, f) {
  const D = decals();
  for (const [x, y] of spots(3, 5100 + v * 3 + f * 17, 2)) { D.set(x, y, Pl.ichorGlow, -1); if (f) D.set(x + 1, y, Pl.ichorGlow, -2.2); }
  F.add({ mat: Pl.ichor, prof: 'flat', grp: 'ichor', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => { const d = D.get(q.x, q.y); if (d) return { m: d.m, dd: d.dd, e: 1 }; return -1.2 + pnoise(q.x / 4, q.y / 4 + f * .5, 4, SEEDS.ichor) * 1.4 + bayer(q.x, q.y) * .4; } });
  // bubbles
  if (f) { const [x, y] = spots(1, 5200 + v, 4)[0]; F.add({ mat: Pl.ichor, prof: 'round', bw: .8, grp: 'bub', lo: 2, hi: 4, shapes: [O([x + .5, y + .5], 1.1)] }); }
}
function paintVoid(F, Pl) { F.add({ mat: 'dark', prof: 'flat', grp: 'v', noShadow: true, lo: 0, hi: 1, shapes: [FULL], tex: q => (rnd(q.x, q.y, 71) < .04 ? -2 : -3) }); }

/* ---------- scenery tiles (solid) ---------- */
function paintRock(F, Pl, v) {
  paintGrass(F, Pl, 0, D => { for (let y = 12; y < 16; y++) for (let x = 3; x < 15; x++) if (Math.hypot((x - 9) / 6, (y - 13) / 2.4) < 1) D.set(x, y, Pl.grassDark, -2); });
  const pts = [[[2.5, 12.5], [3.5, 5], [7, 2.5], [11.5, 3.2], [14, 7], [13.8, 13], [8.5, 14.6]], [[2, 13], [2.8, 6.5], [6, 3], [10.2, 2.4], [13.6, 5.2], [14.4, 12.6], [9, 14.8]]][v % 2];
  F.add({ mat: Pl.stone, prof: 'round', bw: 3.2, grp: 'rock', lo: 1, hi: 4, shapes: [P(pts)], tex: q => (rnd(q.x >> 1, q.y >> 1, 9 + v) < .12 ? -1 : 0) + bayer(q.x, q.y) * .25 });
  F.add({ mat: Pl.stone, prof: 'round', bw: 1.4, grp: 'rock2', lo: 1, hi: 4, shapes: [E([6 + v, 5.5], 2.4, 1.6)] });
}
function paintBush(F, Pl, v, thorny = false) {
  paintGrass(F, Pl, 0, D => { for (let y = 12; y < 16; y++) for (let x = 2; x < 15; x++) if (Math.hypot((x - 8.5) / 6.5, (y - 13.5) / 2.4) < 1) D.set(x, y, Pl.grassDark, -2); });
  const m = Pl.bush, blobs = [[[5.5, 9.5, 4.3], [10.5, 9, 4.6], [8, 5.5, 4.4]], [[5, 8.5, 4.2], [11, 9.8, 4.1], [8.4, 5.2, 4.2], [8, 11, 4]]][v % 2];
  F.add({ mat: m, prof: 'round', bw: 3.5, grp: 'bush', lo: 1, hi: 4, shapes: blobs.map(([x, y, r]) => O([x, y], r)), tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? -1 : 0) + (rnd(q.x, q.y, 5 + v) < .1 ? 1 : 0) });
  if (thorny) F.add({ mat: Pl.thorn, prof: 'ridge', grp: 'thorns', lo: 1, hi: 4, shapes: [[3, 6, -1, -1], [13, 7, 1, -1], [8, 2, 0, -1], [2.5, 11, -1, .3], [14, 11.5, 1, .2]].map(([x, y, dx, dy]) => P([[x - .6 * dy - .5, y + .6 * dx], [x + dx * 2.2, y + dy * 2.2], [x + .6 * dy + .5, y - .6 * dx]])) });
  else if (v % 2 && Pl.flowers) for (const [x, y] of [[6, 7], [10, 10]]) F.add({ mat: Pl.flowers[2 % Pl.flowers.length], prof: 'flat', grp: 'berry' + x, noShadow: true, lo: 2, hi: 3, shapes: [O([x + .5, y + .5], .55)] });
}
function paintTrunk(F, Pl, v) {
  paintGrass(F, Pl, 0, D => { for (let y = 8; y < 16; y++) for (let x = 1; x < 16; x++) if (Math.hypot((x - 8.5) / 7, (y - 13) / 3.2) < 1) D.set(x, y, Pl.grassDark, -2.2); });
  const t = Pl.trunk;
  F.add({ mat: t, prof: 'round', bw: 2.4, grp: 'trunk', lo: 1, hi: 4, shapes: [P([[5.2, 16.5], [6.4, 13.5], [6.6, 4], [10.4, 4], [10.6, 13.5], [12, 16.5]]), C([6.4, 13.8], [3.6, 15.6], 1), C([10.6, 13.8], [13.4, 15.4], 1)], tex: q => (q.x % 3 === 0 ? -1 : 0) });
}
function paintFirstRoot(F, Pl, v, shape) {
  // shape: 0 knot / bend, 1 root running east-west, 2 trunk grain running north-south
  ground(F, Pl.rootDark, 43, null, { lo: -2, hi: -1.2 });
  const moss = q => (Pl.leaf && rnd(q.x >> 1, q.y >> 1, 5 + v) < .1 ? { m: Pl.leaf, dd: -.6 } : 0);
  if (shape === 2) {
    F.add({ mat: Pl.root, prof: 'flat', grp: 'trunk', lo: 1, hi: 3, shapes: [FULL], tex: q => { const m = moss(q); if (m) return m; const g = (q.x + Math.round(Math.sin((q.y + v * 5) / 3) * 1.2)) % 4; return (g === 0 ? -1.4 : g === 1 ? .2 : -.5) + bayer(q.x, q.y) * .3; } });
    if (v) F.add({ mat: Pl.root, prof: 'round', bw: 2, grp: 'burl', lo: 1, hi: 4, shapes: [E([8, 9], 3.2, 2.6)], cuts: [E([8, 9], 1, .8)] });
    return;
  }
  if (shape === 1) {
    const bands = [[[-3, 5], [8, 3.5 + v], [19, 6]], [[-3, 12], [9, 13.5 - v], [19, 11.5]]];
    bands.forEach((pts, k) => F.add({ mat: Pl.root, prof: 'round', bw: 3, grp: 'fr' + k, lo: 1, hi: 4, shapes: [C(pts[0], pts[1], 4.2 - k * .6), C(pts[1], pts[2], 4.2 - k * .6)], tex: q => moss(q) || ((q.y + (q.x >> 2)) % 3 === 0 ? -1 : 0) }));
    return;
  }
  F.add({ mat: Pl.root, prof: 'round', bw: 3.4, grp: 'knot', lo: 1, hi: 4, shapes: [E([8, 8.6], 6.8, 6), C([2, 13], [-3, 16], 2.4, 1.6), C([13, 3.6], [18, 1], 2.2, 1.4)], tex: q => moss(q) || (((q.x + q.y * 2) >> 1) % 4 === 0 ? -1 : 0) });
}
function paintRootWall(F, Pl, v, face) {
  ground(F, 'dark', 44, null, { lo: -2.6, hi: -2.1 });
  if (face) { // the tunnel wall seen from the floor: roots hang down to a lit lip
    const strands = [[1.5, 0], [4.5, 1], [7.5, 0], [10.5, 1], [13.5, 0]];
    strands.forEach(([x, k], i) => F.add({ mat: i % 2 ? Pl.rootDark : Pl.root, prof: 'round', bw: 1, grp: 'hang' + i, lo: 1, hi: 3, shapes: [C([x + ((i + v) % 2 ? .6 : -.6), -2], [x, 13.4 - k * 1.6], 1.35, 1)], tex: q => (q.y % 4 === i % 4 ? -1 : 0) }));
    F.add({ mat: Pl.root, prof: 'round', bw: .8, grp: 'lip', lo: 1, hi: 4, shapes: [C([-2, 13.6], [18, 13.2], 1.3)], tex: () => .4 });
    return;
  }
  const cords = [[[-3, 2], [19, 7]], [[-3, 9], [19, 4]], [[-3, 14], [19, 11]], [[2 + v, -3], [5, 19]], [[12 - v, -3], [10, 19]]];
  cords.forEach(([a, b], k) => F.add({ mat: k % 2 ? Pl.rootDark : Pl.root, prof: 'round', bw: 1.6, grp: 'rw' + k, lo: 1, hi: 2, shapes: [C(a, b, 2 - (k % 3) * .3)], tex: q => (((q.x + q.y) >> 1) % 3 === 0 ? -1 : 0) }));
  if (v === 1) F.add({ mat: Pl.root, prof: 'round', bw: 2, grp: 'knot', lo: 1, hi: 3, shapes: [O([8, 8], 2.8)] });
}
function paintWall(F, Pl, v, face) {
  const w = Pl.wall, cap = Pl.cap;
  if (face) {
    // a cap course (rows 0-2), then four brick courses in running bond
    F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y;
      if (y < 3) return y === 2 ? { m: cap, dd: -1.6 } : { m: cap, dd: y === 0 ? .6 : -.1 };
      const b = bond(x, y, 8, 3.25 | 0 || 3, 4, 3), r = Math.floor((y - 3) / 3.25);
      const ly = (y - 3) - Math.round(r * 3.25), lx = ((x + (((r + v) & 1) ? 4 : 0)) % 8 + 8) % 8;
      if (ly === 0 && r > 0 || lx === 0) return { m: 'dark', dd: -1.8 };
      void b;
      return -.4 + (ly === 1 || lx === 1 ? .6 : 0) + (ly >= 2 && y % 13 === 0 ? -1 : 0) + (lx === 7 ? -.9 : 0) + (rnd(x, y, 12 + r) < .08 ? -1 : 0) + (r === 3 ? -.4 : 0);
    } });
  } else {
    F.add({ mat: cap, prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y, r = y >> 3, lx = ((x + (((r + v) & 1) ? 4 : 0)) % 8 + 8) % 8, ly = y & 7;
      if (lx === 0 || ly === 0) return { m: 'dark', dd: -1.8 };
      return -1 + (lx === 1 || ly === 1 ? .6 : 0) + (lx === 7 || ly === 7 ? -.8 : 0) + (rnd(x, y, 22) < .1 ? -1 : 0) + bayer(x, y) * .3;
    } });
  }
}
function paintTorch(F, Pl, v, f) {
  paintWall(F, Pl, v, true);
  F.add({ mat: Pl.torch, prof: 'flat', grp: 'warm', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [E([8, 6], 5.4, 5)], tex: q => (bayer(q.x, q.y) + (Math.hypot(q.x - 7.5, q.y - 6) / 5.4) * .9 > .55 ? -9 : -2.4 + (f ? .3 : 0)) });
  F.add({ mat: Pl.sconce, prof: 'round', bw: .8, grp: 'sconce', lo: 1, hi: 4, shapes: [RECT(6, 9.5, 10, 11.4), C([8, 11.4], [8, 13.6], .8)] });
  F.add({ mat: 'wood', prof: 'round', bw: .6, grp: 'brand', lo: 1, hi: 4, shapes: [C([8, 6.5], [8, 9.8], .9)] });
  const fl = f ? [[8.3, .6], [10.2, 3.6], [10, 6.4], [8, 7.4], [6, 6.4], [6.2, 4]] : [[7.4, .4], [9.8, 3.4], [10, 6.4], [8, 7.4], [6, 6.2], [6, 3.2]];
  F.add({ mat: Pl.torch, prof: 'round', bw: 1.6, grp: 'flame', noShadow: true, glow: true, lo: 2, hi: 5, shapes: [P(fl)], tex: q => (q.y > 4 ? .9 : .1) + (f ? .3 : 0) });
}
function paintDoor(F, Pl, v) {
  const frame = Pl.doorFrame, wood = Pl.door;
  if (frame === Pl.wall || frame === 'granite') paintWall(F, Pl, v, true);
  else { ground(F, Pl.woodDark, 9, null, { lo: -1.4, hi: -1 }); for (let k = 0; k < 4; k++) F.add({ mat: frame, prof: 'round', bw: 1, grp: 'lg' + k, noShadow: true, lo: 1, hi: 4, shapes: [RECT(k * 4 + .05, -2, k * 4 + 3.95, 18)] }); }
  F.add({ mat: frame, prof: 'bevel', bw: 1, grp: 'arch', lo: 1, hi: 4, shapes: [P([[2.5, 16.5], [2.5, 6], [4, 3], [8, 1.6], [12, 3], [13.5, 6], [13.5, 16.5]])] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'opening', lo: 0, hi: 1, shapes: [P([[4.5, 16.5], [4.5, 6.4], [5.6, 4.6], [8, 3.8], [10.4, 4.6], [11.5, 6.4], [11.5, 16.5]])], tex: q => (q.y > 12 ? -1 : 0) });
  F.add({ mat: wood, prof: 'bevel', bw: .7, grp: 'leaf', lo: 1, hi: 3, shapes: [P([[4.6, 16.4], [4.6, 6.5], [6.2, 5.6], [6.2, 16.4]])], tex: q => (q.y % 3 === 0 ? -1 : 0) });
  F.add({ mat: Pl.stone, prof: 'bevel', bw: .6, grp: 'sill', lo: 1, hi: 3, shapes: [RECT(3, 14.5, 13, 16.5)] });
}
function paintStair(F, Pl, v) {
  ground(F, 'dark', 12, null, { lo: -1.6, hi: -1.2 });
  for (let k = 0; k < 4; k++) F.add({ mat: Pl.stair, prof: 'bevel', bw: .9, grp: 'st' + k, noShadow: true, lo: 1, hi: 4, shapes: [RECT(1, k * 4 + .6, 15, k * 4 + 3.8)], tex: () => -1.4 + k * .45 });
  F.add({ mat: Pl.wall, prof: 'round', bw: .8, grp: 'side', lo: 1, hi: 3, shapes: [RECT(-2, -2, 1, 18), RECT(15, -2, 18, 18)] });
}
function paintBridge(F, Pl, v, ew) {
  const m = Pl.bridge;
  if (m === 'granite' || m === Pl.stone) { paintFlagstone(F, Object.assign({}, Pl, { stone: m }), v); return; }
  paintPlanks(F, Object.assign({}, Pl, { woodDark: 'dark' }), v, m, ew);
}
function paintCliff(F, Pl, v) {
  // a rock face: vertical strata from periodic noise, a few bulging boulders lit from the top-left
  F.add({ mat: Pl.cliff, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const n = pnoise(q.x / 4, q.y / 8, 4, 46 + v, 2), m = pnoise(q.x / 2, q.y / 4, 8, 47, 4); return -1.9 + n * 1.1 + (m > .72 ? -.8 : 0) + bayer(q.x, q.y) * .3; } });
  const bulges = [[[4, 5, 3.4, 4.2]], [[11.5, 4, 3.2, 3.6]], [[7.5, 12, 3.8, 3.4]]].map(b => b[0]);
  bulges.forEach(([x, y, rx, ry], k) => F.add({ mat: Pl.cliff, prof: 'round', bw: 2.4, grp: 'bulge' + k, lo: 1, hi: 4, shapes: [E([x + (v && k === 1 ? -1 : 0), y + (v && k === 2 ? 1 : 0)], rx, ry)], tex: q => (rnd(q.x, q.y, 5 + k) < .1 ? -1 : 0) - .3 }));
  F.add({ mat: Pl.cliffDark, prof: 'flat', grp: 'crack', noShadow: true, noOutline: true, lo: 1, hi: 1, shapes: [C([8.2 + v, -2], [7.4, 6.6], .45), C([7.4, 6.6], [9.4, 10], .42)] });
}
function paintLedge(F, Pl, v) {
  paintGrass(F, Pl, v % 2);
  F.add({ mat: Pl.soil, prof: 'flat', grp: 'lipface', noShadow: true, noOutline: true, lo: 1, hi: 3, shapes: [RECT(-2, 11.5, 18, 15.5)], tex: q => (q.y <= 12 ? -.4 : q.y >= 15 ? -2.2 : -1.3) + ((q.x + v * 2) % 5 === 0 ? -.8 : 0) + bayer(q.x, q.y) * .3 });
  F.add({ mat: Pl.grass, prof: 'flat', grp: 'lipgrass', noShadow: true, noOutline: true, lo: 1, hi: 3, shapes: [P([[-2, 10], [18, 10], [18, 11.6], [14, 12.4], [10, 11.7], [6, 12.5], [2, 11.8], [-2, 12.4]])], tex: q => (q.y <= 10 ? 0 : -.6) });
}
function paintPalisade(F, Pl, v, top) {
  paintGrass(F, Pl, 0);
  for (let k = 0; k < 4; k++) {
    const x = k * 4 + 2, tipY = top ? 1 + ((k + v) % 2) * 1.3 : -3;
    F.add({ mat: Pl.palisade, prof: 'round', bw: 1.6, grp: 'log' + k, lo: 1, hi: 4, shapes: [P([[x - 1.95, 16.5], [x - 1.95, tipY + 2.4], [x, tipY], [x + 1.95, tipY + 2.4], [x + 1.95, 16.5]])], tex: q => (q.y % 4 === k % 4 ? -1 : 0) });
  }
  F.add({ mat: Pl.palisadeBand, prof: 'round', bw: .6, grp: 'band', lo: 1, hi: 3, shapes: [C([-2, 9.5], [18, 9.5], .8)] });
}
function paintRoofBase(F, Pl) { ground(F, 'dark', 3, null, { lo: -2.4, hi: -2 }); }
// roof shingles (overhead layer): courses offset every other row; edges come from the mask
function paintRoof(F, Pl, v, mask) {
  const m = Pl.roof, e = Pl.roofEdge;
  F.add({ mat: m, prof: 'flat', grp: 'shingles', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y;
    if (mask & 4 && y >= 13) return { m: e, dd: y >= 15 ? -1.6 : y === 13 ? .4 : -.4 };           // eave
    if (mask & 1 && y <= 2) return { m: e, dd: y === 0 ? .5 : y === 2 ? -1.2 : 0 };              // ridge
    if (mask & 8 && x <= 1) return { m: e, dd: x === 0 ? .4 : -.6 };                            // gables
    if (mask & 2 && x >= 14) return { m: e, dd: x === 15 ? -1.4 : -.6 };
    const r = y >> 2, ly = y & 3, lx = ((x + (((r + v) & 1) ? 2 : 0)) % 5 + 5) % 5;
    if (ly === 3 && (lx === 0 || lx === 4)) return -2.2;
    return (ly === 0 ? .9 : ly === 1 ? .1 : ly === 2 ? -.6 : -2) + (lx === 0 ? -1 : 0) + (rnd(x, y, 7) < .06 ? -.8 : 0);
  } });
}
/* ---------- overhead parts ---------- */
const CANOPY = {
  oak: { leaf: 'moss', dark: 'seaweed', lumps: [[12, 10, 8.4], [7, 14, 6], [17, 14, 6], [12, 17, 6.6]] },
  pine: { leaf: 'drake', dark: 'seaweed', lumps: [[12, 7, 4.6], [12, 12, 6.4], [12, 18, 8]] },
  elder: { leaf: 'drake', dark: 'seaweed', lumps: [[12, 9, 9], [5.5, 14, 6], [18.5, 14, 6], [12, 17.5, 7.5]] },
  willow: { leaf: 'bramble', dark: 'seaweed', lumps: [[12, 9, 7.6], [6, 15, 5.2], [18, 15, 5.2]], drape: true },
  dead: { leaf: 'rotwood', dark: 'rot', lumps: [], dead: true },
};
// canopy image 24 x 26, drawn at (-4, -16): covers the tile above and the top 10 px of the tree tile
function paintCanopy(F, Pl, v, biome) {
  const c = CANOPY[Pl.canopy] || CANOPY.oak, leaf = biome === 'grove' || biome === 'roots' ? Pl.leaf : c.leaf;
  if (c.dead) {
    const br = [[[12, 26], [12, 12]], [[12, 16], [5, 8]], [[12, 14], [19, 6]], [[12, 12], [11, 3]], [[7, 10], [3, 11]], [[16, 9], [21, 11]]];
    br.forEach(([a, b], k) => F.add({ mat: Pl.trunk === 'bark' ? 'rotwood' : Pl.trunk, prof: 'round', bw: .8, grp: 'br' + k, lo: 1, hi: 4, shapes: [C(a, [b[0] + (v ? 1 : 0), b[1]], k ? .8 : 1.6, k ? .45 : 1.2)] }));
    F.add({ mat: Pl.thorn, prof: 'ridge', grp: 'th', lo: 1, hi: 4, shapes: [[6, 7], [18, 5], [10, 4]].map(([x, y]) => P([[x - .6, y + .6], [x - 1.8, y - 1.6], [x + .6, y - .2]])) });
    return;
  }
  const lumps = c.lumps.map(([x, y, r], k) => [x + (v === 1 && k ? (k % 2 ? -.8 : .8) : 0), y + (v === 2 ? .8 : 0), r]);
  F.add({ mat: c.dark, prof: 'round', bw: 3, grp: 'under', lo: 1, hi: 3, shapes: lumps.map(([x, y, r]) => O([x + .8, y + 1.4], r)) });
  lumps.forEach(([x, y, r], k) => F.add({ mat: leaf, prof: 'round', bw: 4, grp: 'l' + k, lo: 1, hi: 4, shapes: [O([x, y], r)], tex: q => (((q.x * 5 + q.y * 3 + k) % 7) === 0 ? -1 : 0) + (rnd(q.x >> 1, q.y >> 1, 30 + v) < .12 ? .6 : 0) }));
  if (c.drape) F.add({ mat: leaf, prof: 'round', bw: .8, grp: 'drape', lo: 1, hi: 3, shapes: [4, 8, 16, 20].map((x, k) => C([x, 14], [x + (k % 2 ? .6 : -.6), 23], .7)) });
  if (biome === 'grove' && v === 1) F.add({ mat: 'verdant', prof: 'flat', grp: 'glow', noShadow: true, glow: true, lo: 2, hi: 4, shapes: [O([8, 12], .6), O([15, 9], .6)] });
}
// tall-grass tops (overhead), 16 x 16 at (0, 0): blades over the lower half of anyone standing in it
function paintTallTops(F, Pl, v) {
  const m = Pl.grass, sh = [];
  for (let k = 0; k < 9; k++) { const x = 1 + k * 1.75 + (rnd(k, v, 3) - .5), top = 6 + rnd(k, 1 + v, 3) * 4; sh.push(P([[x - .7, 16.5], [x + (k % 2 ? .6 : -.6), top], [x + .7, 16.5]])); }
  F.add({ mat: m, prof: 'ridge', grp: 'tops', noOutline: true, lo: 1, hi: 3, shapes: sh, tex: q => (q.y < 9 ? 0 : q.y > 13 ? -1.4 : -.6) });
  F.add({ mat: Pl.grassDark, prof: 'flat', grp: 'tipsdark', noOutline: true, noShadow: true, lo: 1, hi: 2, shapes: sh.map(t => P(t.pts.map(([x, y]) => [x + .9, y + 1.2]))), tex: () => -2 });
  F.parts.push(F.parts.splice(F.parts.length - 2, 1)[0]); // the dark back-blades sit behind the lit ones
}

/* ---------- edge overlays (4-bit masks) and inner corners ---------- */
// family of each tile for edge purposes; a tile draws an edge toward a neighbour of another family
const FAMILY = { water: 'water', ford: 'water', bridge: 'water', void: 'water', road: 'road', door: 'road', stair: 'road', flagstone: 'road', cliff: 'cliff', ledge: 'cliff', wall: 'wall', 'torch-wall': 'wall', roof: 'wall', 'root-wall': 'wall', 'first-root': 'wall', ichor: 'ichor' };
const famOf = id => FAMILY[id] || id;
// which tiles get which overlay, and what counts as "the same" neighbour
const EDGED = {
  water: { same: id => famOf(id) === 'water' },
  ford: { same: id => famOf(id) === 'water' },
  road: { same: id => famOf(id) === 'road' || id === 'bridge' },
  cliff: { same: id => id === 'cliff' },
  wall: { same: id => famOf(id) === 'wall' || id === 'door' },
  'root-wall': { same: id => famOf(id) === 'wall' || id === 'door' || id === 'stair' },
  bridge: { same: id => id === 'bridge' || (famOf(id) !== 'water' && id !== 'cliff') },
  ichor: { same: id => id === 'ichor' },
};
const wob = (t, seed, amp = .8) => amp * (Math.sin((t / 16) * Math.PI * 2 * 2 + seed) * .6 + Math.sin((t / 16) * Math.PI * 2 * 3 + seed * 2.1) * .4);
// band along a side, thickness th(t) with t along the edge; side n/e/s/w
function band(side, th) {
  const pts = [];
  const N = 17, step = 2;
  if (side === 'n') { for (let i = 0; i < N; i += step) pts.push([i, th(i)]); pts.push([16, -3], [0, -3]); }
  if (side === 's') { for (let i = 0; i < N; i += step) pts.push([i, 16 - th(i)]); pts.push([16, 19], [0, 19]); }
  if (side === 'w') { for (let i = 0; i < N; i += step) pts.push([th(i), i]); pts.push([-3, 16], [-3, 0]); }
  if (side === 'e') { for (let i = 0; i < N; i += step) pts.push([16 - th(i), i]); pts.push([19, 16], [19, 0]); }
  pts.forEach(p => { p[0] = p[0] === 0 ? -3 : p[0] === 16 ? 19 : p[0]; p[1] = p[1] === 0 ? -3 : p[1] === 16 ? 19 : p[1]; });
  return P(pts);
}
const SIDES = [['n', 1], ['e', 2], ['s', 4], ['w', 8]];
// corners (0 NE, 1 SE, 2 SW, 3 NW) where both adjacent sides are edges: rounded off
const outerCorners = mask => [[1, 2], [4, 2], [4, 8], [1, 8]].map(([a, b], c) => (mask & a && mask & b ? c : -1)).filter(c => c >= 0);
function paintEdge(F, fam, mask, Pl, f) {
  const on = SIDES.filter(([, b]) => mask & b).map(([s]) => s);
  if (fam === 'water' || fam === 'ford') {
    const bank = Pl.bank, top = Pl.grass;
    const foam = on.map(s => band(s, t => 3.5 + wob(t, s.charCodeAt(0)) + (f ? .4 : 0))), bk = on.map(s => band(s, t => 2.5 + wob(t, s.charCodeAt(0))));
    for (const c of outerCorners(mask)) { foam.push(O(CORNER_AT[c], 6.4)); bk.push(O(CORNER_AT[c], 5.3)); }
    F.add({ mat: Pl.water, prof: 'flat', grp: 'foam', noShadow: true, noOutline: true, lo: 2, hi: 3, shapes: foam, tex: q => -1.2 - (flatV(Pl.water) - 3.92) + bayer(q.x, q.y) * .5 });
    F.add({ mat: bank, prof: 'flat', grp: 'bank', lo: 1, hi: 3, shapes: bk, tex: q => (mask & 1 && q.y < 1.5 ? { m: top, dd: -.6 } : q.d < 1 ? -1.3 : -.3) });
    return;
  }
  if (fam === 'road') {
    const shapes = on.map(s => band(s, t => 1.4 + Math.max(0, wob(t, s.charCodeAt(0) * 3, 1.1)) + (Math.floor(t + s.length) % 5 === 2 ? 1.1 : 0)));
    for (const c of outerCorners(mask)) shapes.push(O(CORNER_AT[c], 5.2));
    F.add({ mat: Pl.grass, prof: 'flat', grp: 'verge', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes, tex: q => field(SEEDS.grass + (Pl.seed || 0), -1.75, -.35, .42)[(q.y & 15) * T + (q.x & 15)] });
    F.add({ mat: Pl.soilDark, prof: 'flat', grp: 'rut', noOutline: true, noShadow: true, lo: 1, hi: 2, shapes: on.map(s => band(s, t => 2.3 + Math.max(0, wob(t, s.charCodeAt(0) * 3, 1.1)))).concat(outerCorners(mask).map(c => O(CORNER_AT[c], 6.2))), tex: q => -1.4 + bayer(q.x, q.y) * .6 });
    F.parts.push(F.parts.splice(F.parts.length - 2, 1)[0]); // the dark rut line goes under the verge
    return;
  }
  if (fam === 'cliff') {
    if (mask & 1) { F.add({ mat: Pl.grass, prof: 'flat', grp: 'lip', lo: 1, hi: 3, shapes: [band('n', t => 2.8 + wob(t, 5, .7))], tex: q => groundDD(q.x, q.y, 11) + (q.d < 1 ? -.8 : 0) }); }
    if (mask & 4) F.add({ mat: 'dark', prof: 'flat', grp: 'foot', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [band('s', t => 2.2 + wob(t, 8, .6))], tex: q => (q.y > 14 ? -2 : -1) + bayer(q.x, q.y) * .5 });
    if (mask & 8) F.add({ mat: Pl.cliff, prof: 'flat', grp: 'cw', lo: 1, hi: 4, shapes: [band('w', t => 1.4 + wob(t, 3, .4))], tex: () => .5 });
    if (mask & 2) F.add({ mat: Pl.cliffDark, prof: 'flat', grp: 'ce', noShadow: true, lo: 1, hi: 2, shapes: [band('e', t => 1.3 + wob(t, 4, .4))], tex: () => -1.5 });
    return;
  }
  if (fam === 'wall') {
    for (const s of on) F.add({ mat: 'dark', prof: 'flat', grp: 'rim' + s, noShadow: true, noOutline: true, lo: 1, hi: 1, shapes: [band(s, () => 1.05)] });
    return;
  }
  if (fam === 'bridge') {
    for (const s of on) F.add({ mat: Pl.rail, prof: 'flat', grp: 'rail' + s, lo: 1, hi: 4, shapes: [band(s, () => 2.2)], tex: q => ((s === 'n' || s === 's' ? q.x : q.y) % 4 === 0 ? -1.2 : 0) + (q.d < .8 ? -1 : q.d > 1.6 ? .5 : 0) });
    return;
  }
  if (fam === 'ichor') {
    for (const s of on) F.add({ mat: Pl.soilDark, prof: 'flat', grp: 'rim' + s, lo: 1, hi: 3, shapes: [band(s, t => 2 + wob(t, s.charCodeAt(0), .9))], tex: q => (q.d < 1 ? -1.2 : -.4) });
  }
}
// inner corners: the diagonal neighbour differs while both sides match; c = 0 NE, 1 SE, 2 SW, 3 NW
const CORNER_AT = [[16, 0], [16, 16], [0, 16], [0, 0]];
function paintCorner(F, fam, c, Pl) {
  const at = CORNER_AT[c];
  if (fam === 'water' || fam === 'ford') { F.add({ mat: Pl.water, prof: 'flat', grp: 'cf', noShadow: true, noOutline: true, lo: 2, hi: 3, shapes: [O(at, 4.2)], tex: () => -1.1 - (flatV(Pl.water) - 3.92) }); F.add({ mat: Pl.bank, prof: 'flat', grp: 'cb', lo: 1, hi: 3, shapes: [O(at, 3.2)], tex: q => (q.d < 1 ? -1.3 : -.3) }); }
  else if (fam === 'road') F.add({ mat: Pl.grass, prof: 'flat', grp: 'cv', lo: 1, hi: 3, shapes: [O(at, 2.6)], tex: q => groundDD(q.x, q.y, SEEDS.grass) });
  else if (fam === 'cliff') { if (c === 0 || c === 3) F.add({ mat: Pl.grass, prof: 'flat', grp: 'cl', lo: 1, hi: 3, shapes: [O(at, 3)], tex: q => groundDD(q.x, q.y, 11) }); }
  else if (fam === 'wall') F.add({ mat: 'dark', prof: 'flat', grp: 'cr', noShadow: true, noOutline: true, lo: 1, hi: 1, shapes: [RECT(at[0] - 1.05, at[1] - 1.05, at[0] + 1.05, at[1] + 1.05)] });
  else if (fam === 'ichor') F.add({ mat: Pl.soilDark, prof: 'flat', grp: 'ci', lo: 1, hi: 3, shapes: [O(at, 2.4)], tex: () => -.6 });
}
const CORNER_FAMS = new Set(['water', 'ford', 'road', 'cliff', 'wall', 'ichor']);

/* ---------- per tile: how many variants, and how to paint one ---------- */
// kind 'ground' clamps to ramp steps 1-3 (part lo/hi decide); returns the painter for (tileId)
const SPEC = {
  grass: { n: 4, paint: paintGrass },
  flowers: { n: 3, paint: paintFlowers },
  'tall-grass': { n: 2, paint: paintTallGrass, over: { n: 2, w: 16, h: 16, dx: 0, dy: 0, paint: paintTallTops } },
  road: { n: 3, paint: paintRoad },
  flagstone: { n: 3, paint: paintFlagstone },
  floor: { n: 3, paint: (F, Pl, v) => (Pl.floor === 'granite' || Pl.floor === Pl.stone ? paintFlagstone(F, Object.assign({}, Pl, { stone: Pl.floor }), v) : paintPlanks(F, Pl, v)) },
  mud: { n: 2, paint: paintMud },
  fungus: { n: 2, anim: true, paint: paintFungus },
  roots: { n: 2, paint: paintRootFloor },
  'dark-floor': { n: 2, paint: paintDarkFloor },
  tree: { n: 2, paint: paintTrunk, over: { n: 3, w: 24, h: 26, dx: -4, dy: -16, paint: paintCanopy } },
  bush: { n: 2, paint: (F, Pl, v, f, biome) => paintBush(F, Pl, v, biome === 'den') },
  'first-root': { n: 2, shapes: 3, paint: (F, Pl, v) => paintFirstRoot(F, Pl, v % 2, Math.floor(v / 2)) },
  'root-wall': { n: 2, faces: true, paint: (F, Pl, v) => paintRootWall(F, Pl, v >> 1, !(v & 1)) },
  rock: { n: 2, paint: paintRock },
  wall: { n: 2, faces: true, paint: (F, Pl, v) => paintWall(F, Pl, v >> 1, !(v & 1)) },
  roof: { n: 1, paint: paintRoofBase, roof: true },
  palisade: { n: 2, faces: true, paint: (F, Pl, v) => paintPalisade(F, Pl, v >> 1, !(v & 1)) },
  'torch-wall': { n: 1, anim: true, paint: paintTorch },
  water: { n: 4, anim: true, paint: (F, Pl, v, f) => paintWater(F, Pl, v, f, false) },
  ford: { n: 2, anim: true, paint: (F, Pl, v, f) => paintWater(F, Pl, v, f, true) },
  bridge: { n: 2, faces: true, paint: (F, Pl, v) => paintBridge(F, Pl, v >> 1, !!(v & 1)) },
  cliff: { n: 2, paint: paintCliff },
  ledge: { n: 2, paint: paintLedge },
  door: { n: 1, paint: paintDoor },
  stair: { n: 1, paint: paintStair },
  ichor: { n: 2, anim: true, paint: paintIchor },
  void: { n: 1, paint: paintVoid },
};
// "faces" tiles store 2 looks per variant: even = face/top/ns, odd = the other
const variantsOf = id => { const s = SPEC[id]; return s ? s.n * (s.faces ? 2 : 1) * (s.shapes || 1) : 1; };

/* ---------- rendering a cell ---------- */
// Most tile parts are flat: their normal is straight up, so the Forge's per-pixel gradient (four extra
// height samples) always comes out zero. rasterFlat() computes the same lit value for a flat normal
// (forge.js raster(), diff = FLATD) and applies the same 1-px occlusion rule, several times faster.
const SPEC_UP = {};
const specUp = m => SPEC_UP[m] ?? (SPEC_UP[m] = Math.pow(Math.max(0, HV[2]), MAT[m].shin || 10));
function rasterFlat(F) {
  const { w, h, parts } = F, N = w * h;
  parts.forEach((p, i) => { p.i = i; });
  const own = new Int16Array(N).fill(-1), idx = new Int8Array(N), mat = new Array(N), emi = new Uint8Array(N), dist = new Float32Array(N), val = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = x + .5, cy = y + .5; let o = -1, d = 0;
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k], b = p.bb; if (cx < b[0] - .5 || cy < b[1] - .5 || cx > b[2] + .5 || cy > b[3] + .5) continue;
      const v = F.D(p, cx, cy); if (v > 0) { o = k; d = v; break; }
    }
    if (o < 0) continue;
    const p = parts[o], i = y * w + x; own[i] = o; dist[i] = d;
    let mname = p.mat, dd = 0, em = MAT[p.mat].emit;
    if (p.tex) {
      const r = p.tex({ x, y, cx, cy, u: cx, v: cy, d, nx: 0, ny: 0, nz: 1, k: 1 });
      if (typeof r === 'number') dd = r; else if (r) { if (r.m) { mname = r.m; em = MAT[r.m].emit; } dd = r.dd || 0; if (r.e !== undefined) em = r.e; }
    }
    const m = MAT[mname]; let v;
    if (em) v = (m.eBase ?? 3) + Math.min(d, 2.4) * .55 + dd;
    else if (m.gem) v = 2.2 + specUp(mname) * 3.2 + .7 - (d < 1.1 ? .9 : 0) + dd;
    else if (m.flat !== undefined) v = m.flat + dd;
    else v = (m.base ?? 3) + specUp(mname) * (m.ks ?? 0) + dd;
    if (m.dither) v += bayer(x, y) * m.dither;
    val[i] = v; mat[i] = mname; emi[i] = em ? 1 : 0;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = own[i]; if (o < 0) continue;
    let v = Math.round(val[i]); v = v < 1 ? 1 : v > 5 ? 5 : v;
    if (!emi[i]) {
      const A = parts[o]; let occ = 0;
      const front = (dx, dy) => { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) return false; const j = own[Y * w + X]; return j > o && parts[j].grp !== A.grp && !parts[j].noShadow; };
      if (front(-1, -1) || front(-1, 0) || front(0, -1)) occ++;
      if (front(1, 0) || front(0, 1) || front(-1, 0) || front(0, -1)) occ++;
      v -= occ; if (v < 0) v = 0;
    }
    idx[i] = v;
  }
  return { w, h, own, idx, mat, emi, dist, parts, mirror: false };
}
function renderCell(w, h, paint) {
  const F = new Forge(w, h);
  paint(F);
  const R = F.parts.every(p => p.prof === 'flat') ? rasterFlat(F) : F.raster(), parts = R.parts;
  for (let i = 0; i < R.idx.length; i++) {
    const o = R.own[i]; if (o < 0) continue;
    const p = parts[o], lo = p.lo ?? 1, hi = p.hi ?? 3, v = R.idx[i];
    R.idx[i] = v < lo ? lo : v > hi ? hi : v;
  }
  return compose(R, { glow: false });
}

/* ---------- the atlas ---------- */
const COLS = 16;
// the atlas is baked by a generator: one yield per cell, so a caller can spread it across frames
function* buildSteps(biome) {
  let spent = 0, t0 = performance.now();
  const Pl = palOf(biome);
  const jobs = []; // { w, h, paint, key }
  const base = {}, edges = {}, corners = {}, overs = {}, roofs = {};
  const add = (key, w, h, paint) => { jobs.push({ key, w, h, paint }); return key; };
  for (const id of TILE_IDS) {
    const s = SPEC[id] || SPEC.void, frames = s.anim ? TILE_FRAMES : 1, nv = variantsOf(id);
    base[id] = [];
    for (let v = 0; v < nv; v++) { base[id][v] = []; for (let f = 0; f < frames; f++) base[id][v][f] = add(`b|${id}|${v}|${f}`, T, T, F => (s.paint || paintVoid)(F, Pl, v, f, biome)); }
    if (s.over) { overs[id] = []; for (let v = 0; v < s.over.n; v++) overs[id][v] = add(`o|${id}|${v}`, s.over.w, s.over.h, F => s.over.paint(F, Pl, v, biome)); }
    if (s.roof) { roofs[id] = []; for (let m = 0; m < 16; m++) roofs[id][m] = add(`r|${id}|${m}`, T, T, F => paintRoof(F, Pl, m & 1 ? 1 : 0, m)); }
  }
  const EDGE_FAMS = { water: 'water', ford: 'water', road: 'road', cliff: 'cliff', wall: 'wall', 'torch-wall': 'wall', 'root-wall': 'wall', bridge: 'bridge', ichor: 'ichor' };
  const famFrames = { water: 1, road: 1, cliff: 1, wall: 1, bridge: 1, ichor: 1 };
  for (const fam of new Set(Object.values(EDGE_FAMS))) {
    edges[fam] = []; corners[fam] = [];
    for (let m = 1; m < 16; m++) { edges[fam][m] = []; for (let f = 0; f < famFrames[fam]; f++) edges[fam][m][f] = add(`e|${fam}|${m}|${f}`, T, T, F => paintEdge(F, fam, m, Pl, f)); }
    if (CORNER_FAMS.has(fam)) for (let c = 0; c < 4; c++) corners[fam][c] = add(`c|${fam}|${c}`, T, T, F => paintCorner(F, fam, c, Pl));
  }
  // pack: 16x16 cells first, then the larger overhead images on their own rows
  const small = jobs.filter(j => j.w === T && j.h === T), large = jobs.filter(j => !(j.w === T && j.h === T));
  const at = {};
  small.forEach((j, i) => { at[j.key] = [(i % COLS) * T, Math.floor(i / COLS) * T, T, T]; });
  let y = Math.ceil(small.length / COLS) * T, x = 0, rowH = 0;
  for (const j of large) { if (x + j.w > COLS * T) { x = 0; y += rowH; rowH = 0; } at[j.key] = [x, y, j.w, j.h]; x += j.w; rowH = Math.max(rowH, j.h); }
  const W = COLS * T, H = y + rowH;
  const img = new ImageData(W, H), d = img.data;
  for (let n = 0; n < jobs.length; n++) {
    const j = jobs[n], cellImg = renderCell(j.w, j.h, j.paint), s = cellImg.data, [ox, oy] = at[j.key];
    for (let yy = 0; yy < j.h; yy++) for (let xx = 0; xx < j.w; xx++) {
      const i = (yy * j.w + xx) * 4, k = ((oy + yy) * W + ox + xx) * 4;
      d[k] = s[i]; d[k + 1] = s[i + 1]; d[k + 2] = s[i + 2]; d[k + 3] = s[i + 3];
    }
    if (n % 4 === 3) { spent += performance.now() - t0; yield (n + 1) / jobs.length; t0 = performance.now(); }
  }
  const ms = spent + performance.now() - t0;
  return { img, at, base, edges, corners, overs, roofs, EDGE_FAMS, ms, cells: jobs.length };
}

const cache = new Map(), pending = new Map();
const biomeKey = biome => (BIOMES.includes(biome) ? biome : 'wilds');
// tileAtlasSteps(biome): generator yielding progress 0..1 (about every 4 cells); returns the atlas.
// Drive it across frames (a few ms per frame) during the map-entry fade; shares tileAtlas's cache.
export function* tileAtlasSteps(biome = 'wilds') {
  const key = biomeKey(biome);
  if (cache.has(key)) return cache.get(key);
  if (!pending.has(key)) pending.set(key, buildSteps(key));
  const gen = pending.get(key);
  for (;;) {
    const r = gen.next();
    if (r.done) { pending.delete(key); const A = makeAtlas(key, r.value); cache.set(key, A); return A; }
    if (cache.has(key)) return cache.get(key); // finished elsewhere meanwhile
    yield r.value;
  }
}
// tileAtlasAsync(biome, { sliceMs }) -> Promise<atlas>: bakes in slices of about sliceMs per frame
export function tileAtlasAsync(biome = 'wilds', { sliceMs = 6 } = {}) {
  const key = biomeKey(biome);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  const gen = tileAtlasSteps(key);
  const tick = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : f => setTimeout(f, 16);
  return new Promise(resolve => {
    const step = () => {
      const t0 = performance.now();
      for (;;) { const r = gen.next(); if (r.done) { resolve(r.value); return; } if (performance.now() - t0 > sliceMs) break; }
      tick(step);
    };
    step();
  });
}
// buildTileAtlas(biome): a fresh, uncached build (for the perf gallery and tools; the game uses tileAtlas)
export function buildTileAtlas(biome = 'wilds') {
  const key = biomeKey(biome), gen = buildSteps(key);
  for (;;) { const r = gen.next(); if (r.done) return makeAtlas(key, r.value); }
}
export function tileAtlas(biome = 'wilds') {
  const key = biomeKey(biome);
  if (cache.has(key)) return cache.get(key);
  const gen = tileAtlasSteps(key);
  for (;;) { const r = gen.next(); if (r.done) return r.value; }
}
function makeAtlas(key, B) {
  const idOfCh = ch => tileOf(ch).id;
  const pick = (id, x, y) => { const s = SPEC[id]; const n = s ? s.n : 1; return Math.floor(hash(x, y, 97 + TILE_IDS.indexOf(id)) * n) % n; };
  const rect = key => B.at[key];
  const atlas = {
    biome: key,
    img: B.img,
    ms: B.ms,
    cells: B.cells,
    at(tileId, variant = 0, frame = 0) {
      const b = B.base[tileId] || B.base.void, v = b[Math.max(0, Math.min(b.length - 1, variant | 0))], k = v[Math.min(v.length - 1, frame | 0)];
      const r = rect(k); return [r[0], r[1]];
    },
    variants: tileId => (B.base[tileId] ? B.base[tileId].length : 1),
    frames: tileId => (TILES[tileId] && TILES[tileId].anim ? TILE_FRAMES : 1),
    pick,
    // the overhead image of a tile out of context: [sx, sy, w, h, dx, dy] (a tree's canopy is 24x26 at (-4, -16));
    // prefer cell(), which also picks the roof edges from the neighbours
    over(tileId, variant = 0) {
      const s = SPEC[tileId];
      if (s && s.over) { const o = B.overs[tileId], r = rect(o[Math.abs(variant | 0) % o.length]); return [r[0], r[1], r[2], r[3], s.over.dx, s.over.dy]; }
      if (s && s.roof) { const r = rect(B.roofs[tileId][0]); return [r[0], r[1], T, T, 0, 0]; }
      return null;
    },
    edge(tileId, mask, frame = 0) {
      const fam = B.EDGE_FAMS[tileId]; if (!fam || !mask) return null;
      const e = B.edges[fam][mask & 15]; if (!e) return null;
      const r = rect(e[Math.min(e.length - 1, frame | 0)]); return [r[0], r[1]];
    },
    cell(rows, x, y, frame = 0) {
      const h = rows.length, w = rows[0] ? rows[0].length : 0;
      const idAt = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? null : idOfCh(rows[yy][xx]));
      const id = idAt(x, y) || 'void', s = SPEC[id] || SPEC.void;
      const nb = [idAt(x, y - 1), idAt(x + 1, y), idAt(x, y + 1), idAt(x - 1, y)].map(n => n || id);
      const out = { ground: [], over: [] };
      let v = pick(id, x, y);
      if (s.faces) {
        if (id === 'wall') v = v * 2 + (famOf(nb[2]) === 'wall' ? 1 : 0);                               // top when a wall is below
        else if (id === 'palisade') v = v * 2 + (nb[0] === 'palisade' ? 1 : 0);                         // no tips under another log
        else if (id === 'root-wall') v = v * 2 + (nb[2] === 'root-wall' || nb[2] === 'first-root' ? 1 : 0); // a lit face where a tunnel opens below
        else if (id === 'bridge') { // planks lie across the way: an east-west crossing gets vertical planks
          const walk = n => n === 'bridge' || EDGED.road.same(n) || (famOf(n) !== 'water' && n !== 'cliff' && !(TILES[n] && TILES[n].solid));
          v = v * 2 + ((walk(nb[1]) || walk(nb[3])) && !(walk(nb[0]) || walk(nb[2])) ? 1 : 0);
        }
      }
      if (id === 'first-root') { // grain follows the mass: a trunk runs north-south, a root east-west, a knot where it turns
        const Y = n => n === 'first-root', c = nb.filter(Y).length, ns = Y(nb[0]) || Y(nb[2]), ew = Y(nb[1]) || Y(nb[3]);
        v = v + 2 * (c >= 3 ? 2 : ns && !ew ? 2 : ew && !ns ? 1 : c === 2 ? 2 : 0);
      }
      const f = TILES[id] && TILES[id].anim ? frame & 1 : 0;
      const bk = B.base[id][Math.min(B.base[id].length - 1, v)][f];
      const br = rect(bk); out.ground.push([br[0], br[1], T, T, 0, 0]);
      const fam = B.EDGE_FAMS[id];
      if (fam && EDGED[id === 'torch-wall' ? 'wall' : id]) {
        const same = EDGED[id === 'torch-wall' ? 'wall' : id].same;
        let mask = 0; nb.forEach((n, i) => { if (!same(n)) mask |= 1 << i; });
        const raw = mask;
        if (fam === 'wall' && (id === 'torch-wall' || !(v & 1))) mask &= ~4; // a face shows its own foot
        if (mask) { const e = B.edges[fam][mask][0], er = rect(e); out.ground.push([er[0], er[1], T, T, 0, 0]); }
        if (B.corners[fam] && B.corners[fam].length) {
          const diag = [idAt(x + 1, y - 1), idAt(x + 1, y + 1), idAt(x - 1, y + 1), idAt(x - 1, y - 1)].map(n => n || id);
          const sides = [[0, 1], [2, 1], [2, 3], [0, 3]];
          diag.forEach((dn, c) => { const [a, b] = sides[c]; if (!(raw & (1 << a)) && !(raw & (1 << b)) && !same(dn)) { const cr = rect(B.corners[fam][c]); out.ground.push([cr[0], cr[1], T, T, 0, 0]); } });
        }
      }
      if (s.over) { const ov = B.overs[id][pick(id, x + 7, y + 3) % B.overs[id].length], r = rect(ov); out.over.push([r[0], r[1], r[2], r[3], s.over.dx, s.over.dy]); }
      if (s.roof) { let m = 0; nb.forEach((n, i) => { if (n !== 'roof') m |= 1 << i; }); const r = rect(B.roofs[id][m]); out.over.push([r[0], r[1], T, T, 0, 0]); }
      return out;
    },
  };
  return atlas;
}
