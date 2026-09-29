// Overworld tilesets (M3 spec §5.1): 16 px tiles for every tile id in data/tiles.js, one atlas per
// biome, built with the Forge (lit, palette-quantised MAT ramps) and cached for the session.
// Browser-only: returns ImageData.
//
// tileAtlas(biome) -> atlas
//   biome   keep | wilds | town | grove | fen | tower | roots | den; the Sunscorch's ten (M4) and the
//           Ironspire's nine (M5): mountain | monastery | scree | dwarf-hall | forge | outpost | tundra |
//           frozen-lake | ice-cave (unknown biomes read as wilds)
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

import { Forge, compose, MAT, HV, hash, bayer, ramp } from './forge.js';
import { TILES, TILE_IDS, TILE_FRAMES, tileOf } from '../data/tiles.js';

export const TILE_PX = 16;
export const BIOMES = Object.freeze(['keep', 'wilds', 'town', 'grove', 'fen', 'tower', 'roots', 'den',
  'desert', 'desert-town', 'canyon', 'mine-camp', 'mine', 'crystal', 'dunes', 'oasis', 'ash', 'vault',
  'mountain', 'monastery', 'scree', 'dwarf-hall', 'forge', 'outpost', 'tundra', 'frozen-lake', 'ice-cave',
  'willow-village', 'channel', 'stilt-town', 'bog', 'drowned-grove', 'boardwalk', 'sunken-city', 'belfry', 'mudflat', 'causeway']);
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
const palOf = biome => Object.assign({}, BASE_PAL, SUN_PAL[biome] ? Object.assign({}, SUN_BASE, SUN_PAL[biome])
  : IRON_PAL[biome] ? Object.assign({}, SUN_BASE, IRON_BASE, IRON_PAL[biome])
    : GLOOM_PAL[biome] ? Object.assign({}, SUN_BASE, IRON_BASE, GLOOM_BASE, GLOOM_PAL[biome]) : PAL[biome] || PAL.wilds);

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
// the biome's '.' ground field and its per-pixel value, which road verges, cliff lips and corners copy
// (a palette's gLo/gHi/gDith and seed tune it; the M3 palettes set none, so theirs is unchanged)
const gField = Pl => field(SEEDS.grass + (Pl.seed || 0), Pl.gLo ?? -1.75, Pl.gHi ?? -.35, Pl.gDith ?? .42);
const gDD = (Pl, q) => groundDD(q.x, q.y, SEEDS.grass + (Pl.seed || 0), Pl.gLo, Pl.gHi, Pl.gDith);
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
    const bank = Pl.bank, top = Pl.grass, wa = Pl.bankK === 'stone' ? 0 : 1;
    const foam = on.map(s => band(s, t => 3.5 + wob(t, s.charCodeAt(0)) * wa + (f ? .4 : 0))), bk = on.map(s => band(s, t => 2.5 + wob(t, s.charCodeAt(0)) * wa));
    if (wa) for (const c of outerCorners(mask)) { foam.push(O(CORNER_AT[c], 6.4)); bk.push(O(CORNER_AT[c], 5.3)); }
    F.add({ mat: Pl.water, prof: 'flat', grp: 'foam', noShadow: true, noOutline: true, lo: 2, hi: 3, shapes: foam, tex: q => -1.2 - (flatV(Pl.water) - 3.92) + bayer(q.x, q.y) * .5 });
    F.add({ mat: bank, prof: 'flat', grp: 'bank', lo: 1, hi: 3, shapes: bk, tex: wa ? q => (mask & 1 && q.y < 1.5 ? { m: top, dd: -.6 } : q.d < 1 ? -1.3 : -.3) : q => (q.d < 1 ? -1.4 : (q.x + q.y) % 6 === 0 ? -1.2 : q.d > 1.9 ? .5 : -.2) });
    return;
  }
  if (fam === 'road') {
    const shapes = on.map(s => band(s, t => 1.4 + Math.max(0, wob(t, s.charCodeAt(0) * 3, 1.1)) + (Math.floor(t + s.length) % 5 === 2 ? 1.1 : 0)));
    for (const c of outerCorners(mask)) shapes.push(O(CORNER_AT[c], 5.2));
    F.add({ mat: Pl.grass, prof: 'flat', grp: 'verge', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes, tex: q => (Pl.iron ? groundAt(Pl, q.x, q.y) : gField(Pl)[(q.y & 15) * T + (q.x & 15)]) });
    F.add({ mat: Pl.soilDark, prof: 'flat', grp: 'rut', noOutline: true, noShadow: true, lo: 1, hi: 2, shapes: on.map(s => band(s, t => 2.3 + Math.max(0, wob(t, s.charCodeAt(0) * 3, 1.1)))).concat(outerCorners(mask).map(c => O(CORNER_AT[c], 6.2))), tex: q => -1.4 + bayer(q.x, q.y) * .6 });
    F.parts.push(F.parts.splice(F.parts.length - 2, 1)[0]); // the dark rut line goes under the verge
    return;
  }
  if (fam === 'cliff') {
    if (mask & 1) { F.add({ mat: Pl.grass, prof: 'flat', grp: 'lip', lo: 1, hi: 3, shapes: [band('n', t => 2.8 + wob(t, 5, .7))], tex: q => gDD(Pl, q) + (q.d < 1 ? -.8 : 0) }); }
    // a dune's slip face: a bright crest, then shaded sand falling away with streaks of sliding sand
    if (mask & 4 && Pl.cliffK === 'slip') F.add({ mat: Pl.cliff, prof: 'flat', grp: 'slip', noShadow: true, lo: 1, hi: 4, shapes: [band('s', t => 7.6 + wob(t, 6, .7))], tex: q => (q.d < 1 ? .9 : -1.5 - (q.y - 8) * .06) + ((q.x * 5 + (q.y >> 2) * 3) % 7 === 0 ? -.5 : 0) + bayer(q.x, q.y) * .3 });
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
    return;
  }
  // M5 (the Ironspire): a snowdrift, cooled slag or black ice meets other ground, which laps over its edge in a
  // wind-cut line; a drift shows a lit crest on its north and west and a shadow on its south and east
  if (fam === 'drift' || fam === 'patch') {
    const th = (s, t, k) => k + Math.max(0, wob(t, s.charCodeAt(0) * 5, 1.2)) + (Math.floor(t + s.length) % 5 === 1 ? .9 : 0);
    const verge = on.map(s => band(s, t => th(s, t, 1.5))), rim = on.map(s => band(s, t => th(s, t, 2.5)));
    for (const c of outerCorners(mask)) { verge.push(O(CORNER_AT[c], 5.4)); rim.push(O(CORNER_AT[c], 6.4)); }
    const V = vergeOf(Pl, fam);
    F.add({ mat: fam === 'drift' ? Pl.snow : Pl.patchMat, prof: 'flat', grp: 'rim', noOutline: true, noShadow: true, lo: 1, hi: 4, shapes: rim, tex: q => (fam === 'drift' && (q.y < 6 || q.x < 6) ? .8 : Pl.patchRim ?? -1.3) });
    F.add({ mat: V.m, prof: 'flat', grp: 'verge', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes: verge, tex: q => V.at(q.x, q.y) });
    return;
  }
  if (fam === 'scree') { // a scree slope thins out into the turf round it: the turf laps over its edge in a ragged line
    const verge = on.map(s => band(s, t => 1.3 + Math.max(0, wob(t, s.charCodeAt(0) * 7, 1.7)) + (Math.floor(t + s.length) % 4 === 1 ? .8 : 0)));
    for (const c of outerCorners(mask)) verge.push(O(CORNER_AT[c], 4.4));
    F.add({ mat: Pl.grass, prof: 'flat', grp: 'verge', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes: verge, tex: q => groundAt(Pl, q.x, q.y) });
    return;
  }
  if (fam === 'carpet') { // the runner's border: a gold stripe, a dark line, then the floor it lies on
    for (const [th, m, dd] of [[3.6, 'gold', -.8], [2.6, 'dark', -1], [1.6, Pl.paver, -1]]) F.add({ mat: m, prof: 'flat', grp: 'b' + th, noOutline: true, noShadow: true, lo: 1, hi: 3, shapes: on.map(s => band(s, () => th)), tex: q => dd + bayer(q.x, q.y) * .2 });
    return;
  }
  if (fam === 'drop') { // the far wall of a drop shows as a face going down into the dark; the near lip is the ground's edge
    const m = Pl.dropK === 'ice' ? Pl.glass : Pl.dropK === 'pit' ? Pl.wall : Pl.cliff;
    if (mask & 1) F.add({ mat: m, prof: 'flat', grp: 'face', noOutline: true, noShadow: true, lo: 1, hi: 4, shapes: [band('n', t => 5.6 + wob(t, 9, .8))], tex: q => (q.y < 1 ? 1 : .2 - q.y * .3) + pnoise(q.x / 2, q.y / 4, 8, 230, 4) * .7 + bayer(q.x, q.y) * .3 });
    if (mask & 8) F.add({ mat: m, prof: 'flat', grp: 'fw', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes: [band('w', t => 1.6 + wob(t, 4, .4))], tex: q => -1 - q.y * .04 });
    if (mask & 2) F.add({ mat: m, prof: 'flat', grp: 'fe', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes: [band('e', t => 1.8 + wob(t, 5, .4))], tex: q => .2 - q.y * .06 });
    if (mask & 4) F.add({ mat: Pl.grass, prof: 'flat', grp: 'lip', noOutline: true, noShadow: true, lo: 1, hi: 3, shapes: [band('s', t => 1.2 + wob(t, 6, .3))], tex: q => groundAt(Pl, q.x, q.y) - 1 });
  }
  if (fam === 'deck') { // M6: a plank way over the water (the stilts, the boardwalk): a dark joint where it stops, its side-beam to the south
    const S = [];
    if (mask & 1) S.push(RECT(-1, -1, 17, .95));
    if (mask & 8) S.push(RECT(-1, -1, .95, 17));
    if (mask & 2) S.push(RECT(15.05, -1, 17, 17));
    if (S.length) F.add({ mat: 'dark', prof: 'flat', grp: 'joint', noShadow: true, noOutline: true, lo: 1, hi: 1, shapes: S });
    if (mask & 4) F.add({ mat: Pl.lip, prof: 'flat', grp: 'beam', noShadow: true, noOutline: true, lo: 1, hi: 3, shapes: [RECT(-1, 12.9, 17, 17)], tex: q => (q.y === 13 ? -.3 : q.y === 14 ? -1.1 : -2) + ((q.x + 3) % 8 === 0 && q.y > 13 ? -1 : 0) });
  }
}
// the ground that laps over an Ironspire patch's edge: the '.' ground, or the soot floor round the forge's slag
const vergeOf = (Pl, fam) => {
  if (fam !== 'patch' || Pl.patchK !== 'slag') return { m: Pl.grass, at: (x, y) => groundAt(Pl, x, y) };
  const kf = field(SEEDS['dark-floor'] + (Pl.seed || 0), -1.55, -.65, .3);
  return { m: Pl.darkFloor, at: (x, y) => kf[(y & 15) * T + (x & 15)] };
};
// inner corners: the diagonal neighbour differs while both sides match; c = 0 NE, 1 SE, 2 SW, 3 NW
const CORNER_AT = [[16, 0], [16, 16], [0, 16], [0, 0]];
function paintCorner(F, fam, c, Pl) {
  const at = CORNER_AT[c];
  if (fam === 'water' || fam === 'ford') { F.add({ mat: Pl.water, prof: 'flat', grp: 'cf', noShadow: true, noOutline: true, lo: 2, hi: 3, shapes: [O(at, 4.2)], tex: () => -1.1 - (flatV(Pl.water) - 3.92) }); F.add({ mat: Pl.bank, prof: 'flat', grp: 'cb', lo: 1, hi: 3, shapes: [O(at, 3.2)], tex: q => (q.d < 1 ? -1.3 : -.3) }); }
  else if (fam === 'road') F.add({ mat: Pl.grass, prof: 'flat', grp: 'cv', noOutline: !!Pl.sun, lo: 1, hi: 3, shapes: [O(at, 2.6)], tex: q => gDD(Pl, q) }); // pale sand shows an outline
  else if (fam === 'cliff') { if (c === 0 || c === 3) F.add({ mat: Pl.grass, prof: 'flat', grp: 'cl', lo: 1, hi: 3, shapes: [O(at, 3)], tex: q => gDD(Pl, q) }); }
  else if (fam === 'wall') F.add({ mat: 'dark', prof: 'flat', grp: 'cr', noShadow: true, noOutline: true, lo: 1, hi: 1, shapes: [RECT(at[0] - 1.05, at[1] - 1.05, at[0] + 1.05, at[1] + 1.05)] });
  else if (fam === 'ichor') F.add({ mat: Pl.soilDark, prof: 'flat', grp: 'ci', lo: 1, hi: 3, shapes: [O(at, 2.4)], tex: () => -.6 });
  else if (fam === 'drift' || fam === 'patch') { const V = vergeOf(Pl, fam); F.add({ mat: V.m, prof: 'flat', grp: 'cv', noOutline: true, lo: 1, hi: 3, shapes: [O(at, 2.8)], tex: q => V.at(q.x, q.y) }); }
  else if (fam === 'scree') F.add({ mat: Pl.grass, prof: 'flat', grp: 'cs', noOutline: true, lo: 1, hi: 3, shapes: [O(at, 2.3)], tex: q => groundAt(Pl, q.x, q.y) });
}
const CORNER_FAMS = new Set(['water', 'ford', 'road', 'cliff', 'wall', 'ichor', 'drift', 'patch', 'scree']);

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
const variantsOf = s => (s ? s.n * (s.faces ? 2 : 1) * (s.shapes || 1) : 1);

/* =====================================================================
   The Sunscorch Wastes (M4 spec §6.1): ten more biomes on the same tile characters.
   - Their materials live in MAT under 'w.' names (worldMats(); map-sprites.js dresses its people in
     them too), so they never collide with another module's.
   - A Sunscorch palette sets `sun` and a style for each character whose look depends on the place
     (tree, bushK, rockK, wallK, roofK, ...). SUN_SPEC holds those painters; every other tile (roads,
     flagstones, water and fords, stairs, bridges, dark floors, ichor, void) is the M3 painter in the
     new palette.
   - '.' keeps the shared periodic ground field, so road verges and cliff lips (which copy it) meet it
     without a seam; gLo/gHi/gDith tune that field for a biome.
   - 'r' (roots in the Verdant) is a rail track here: straight or curved from its rail neighbours.
     'Y' is a rock mass or pillar, 'R' a cave or tunnel wall (a face where it opens to the south).
   ===================================================================== */
const WMAT = {
  sand: '#1f150c #6b4a26 #8c6634 #aa8244 #cfa864 #efd294',
  dune: '#221a10 #735a36 #967848 #b6985e #d8be84 #f4e2b0',
  dust: '#1e100a #62341e #86492a #a8653a #c98a58 #e8b684',
  grit: '#151210 #403631 #574b41 #6f6153 #8d7d6b #b0a08a',
  shaft: '#0e0b0a #28201b #3a2f28 #4e4136 #665647 #82705c',
  cave: '#0a0a14 #1c1c34 #282a48 #363a5e #4a5078 #6a7298',
  ash: '#141214 #363232 #4b4645 #625c59 #7d7671 #9e968e',
  char: '#0c0a0a #201b19 #2f2927 #423936 #594b45 #72625a',
  basalt: '#07080c #161a24 #212635 #2e3447 #3e465b #545e78',
  sandstone: ['#26140c #5e3420 #8a4e2e #b26c3e #d6925a #f0bc86', { ks: .2, shin: 6 }],
  redrock: ['#1e0c0a #4c2016 #74341f #9c4c2a #c06c3e #dc9260', { ks: .2, shin: 6 }],
  clay: '#1e140e #4c3525 #684b33 #856146 #a37e5a #c49e76',
  paver: '#2a1e14 #6e5238 #94704c #b48e64 #d2ae84 #eed2aa',
  track: '#241a10 #7a5c3a #9a7a52 #b8966a #d4b488 #eed8ae',
  ochre: '#22120a #7c4a2c #9c6440 #b88058 #d2a07a #ecc8a4',
  plaster: '#2a2218 #5e5040 #847258 #ab9674 #cfbc96 #ecdcbc',
  terra: ['#2a0e08 #5c2414 #86381e #ae5430 #d0784a #eca270', { ks: .3, shin: 8 }],
  saffron: '#2a1604 #6a3a08 #a25e10 #d08a1c #f0b43c #fcdc8a',
  indigo: '#0a0a1c #16163e #242462 #363a8a #5058b0 #7c86d0',
  canvas: '#262018 #544836 #7a6a50 #a08e6e #c4b490 #e4d8b8',
  palm: ['#0c1406 #1c3010 #2e4a16 #44681e #62882c #8aac44', { ks: .3, shin: 8 }],
  sage: '#121410 #2a2e20 #40462e #5a603e #787e52 #9aa06c',
  pitch: ['#060404 #120c0a #1c1410 #2a1e18 #3e2c22 #5a4030', { ks: 1.6, shin: 24 }],
  oasis: ['#04201e #0e5a56 #188a80 #2ab2a2 #74e0cc #d6fff4', { emit: 1, eBase: 2.6 }],
  cistern: ['#03161c #0a3c48 #125e6a #1e8490 #4cb2b4 #a6e6e0', { emit: 1, eBase: 2.6 }],
  glass: ['#1e1204 #4e3208 #8a5e12 #c89228 #f0c860 #fff4c8', { gem: 1 }],
  mirage: ['#10102a #262a5c #4452a0 #78a0dc #bce0f8 #f6fcff', { emit: 1, eBase: 3.1 }],
  skink: ['#1e0e06 #54280e #86441a #b0662a #d4904a #f0bc7c', { ks: .5, shin: 10 }],
  wyrm: ['#1a120a #4a3420 #6e5030 #927044 #b6925c #d8b884', { ks: .4, shin: 10 }],
  // M5: the Ironspire Peaks
  snow: '#1e2638 #66748e #a2b0c6 #bccadc #dfe8f3 #fbfdff',
  packed: '#1e1c1c #4e4a48 #75706a #9a948c #bcb6ac #dcd6cc',
  ice: '#0c1a2a #2a5272 #4a7ea2 #78aac8 #aad2e6 #e4f6fe',
  blackice: '#04080e #0a1622 #122436 #1c364e #2c4c68 #466888',
  glacier: ['#081828 #14365a #22609a #3c92cc #86c8ee #e6f8ff', { gem: 1 }],
  cavice: '#060e1a #142a44 #20426a #2e5a8a #4a7eac #82b0d2',
  alpine: '#0e140e #25301f #3a4a2c #52643a #6f7f4c #939f68',
  drygrass: '#1a150c #423824 #665634 #8a7646 #ae9860 #d0bc84',
  earth: '#171410 #3d372f #595146 #766d5f #978d7c #bdb4a2',
  gravel: '#1d1812 #4a4032 #6c5e4a #8e7e64 #b0a084 #d4c6a8',
  crag: ['#101218 #2a2e38 #444a56 #626a78 #8a92a0 #b8bec8', { ks: .2, shin: 6 }],
  scree: '#15161a #3a3c42 #56585e #74767b #95969a #bbbbbd',
  pine: ['#040c0b #0a1c18 #123026 #1b4636 #2a5e48 #467a5e', { ks: .3, shin: 8 }],
  slate: ['#0d0f15 #1e222c #313746 #48505f #646e7e #8a94a4', { ks: .5, shin: 12 }],
  limestone: '#2a2722 #5d584f #888276 #b0aa9c #d2cdbf #efebe0',
  whitewash: '#262830 #5c5f68 #8e919a #bcbfc6 #dfe1e5 #f7f8fa',
  hewn: ['#161110 #382c29 #564440 #755e57 #987d74 #bda298', { ks: .2, shin: 8 }],
  slag: ['#060505 #131110 #201c1a #2e2825 #403834 #574b45', { ks: .8, shin: 18 }],
  brick: ['#140a08 #321a14 #50291e #6e3a2a #8e4e38 #b0684c', { ks: .1, shin: 6 }],
  timber: '#15110e #30271f #4b3d30 #685642 #887259 #ab9476',
  frostwater: ['#030a14 #0a1e34 #133454 #1f5076 #3c7a9e #86b6cc', { emit: 1, eBase: 2.6 }],
  heather: '#140c14 #34203a #52325a #704878 #946496 #b888b4',
  rimebark: '#1c2028 #48505e #747e8e #a2acba #cdd4de #f0f4f8',
  habit: '#17171a #36363c #56565e #78787f #9c9ca2 #c4c4c8',
  army: '#0b0e14 #1a212c #2b3544 #3f4c60 #57677e #7a8aa2',
  hush: '#020308 #060a16 #0b1226 #111b36 #1a2848 #263a60',
  hushglow: ['#0a0a1e #1a1a44 #2c3474 #4a5ea8 #8aa4d8 #d8e6ff', { emit: 1, eBase: 2.2 }],
  rimeskin: '#1c2430 #4a5a6e #7890a8 #a4bccc #cadae4 #eef6fa',
  drowned: '#0a0e14 #18222e #26364a #36506a #4c6c88 #6e90aa',
  rimefur: ['#171a22 #3a404e #636a7a #9098a8 #c0c8d4 #edf1f7', { ks: .2, shin: 6 }],
  troll: ['#0d110e #1f2820 #344237 #4a5c4a #647862 #869a80', { ks: .3, shin: 8 }],
  stormfeather: ['#0c0e18 #1e2436 #343e58 #4e5c7c #7282a2 #a0b0c8', { ks: .3, shin: 8 }],
  hide: '#1a140e #3e3224 #5e4c36 #7e684c #a08a68 #c2ae8c',
  // M6: the Gloomfen Marsh
  sedge: '#0f110a #282c16 #404622 #5a602e #7a803e #a0a454',
  fenmoss: '#070d09 #10201a #1b3124 #284530 #3a5c3c #557a4e',
  sphagnum: '#140c0a #2e1a13 #47291b #623a23 #82502d #a66a3a',
  bogmoss: '#0c0e08 #1f2616 #303a1f #434f29 #5a6834 #788644',
  mudtrack: '#100e0b #2a251d #3f382c #564c3b #70634d #8e7f64',
  peat: '#050404 #0f0b09 #1b1510 #281f17 #382c21 #4c3c2c',
  loam: '#17120c #3b2f21 #584733 #745f45 #937b5b #b59c77',
  silt: '#131210 #35322a #524c3f #6e6753 #8e856b #b2a88a',
  reed: '#101208 #272d13 #3f4b1d #5a6b27 #798b34 #9cad48',
  cattail: '#120906 #2c160c #472412 #64341a #844a24 #a66632',
  willow: ['#08110a #142818 #213e22 #30562c #447238 #5e8e48', { ks: .2, shin: 6 }],
  thatch: '#16120c #352c1e #52452e #6e5e3e #8e7a52 #b09a6a',
  daub: '#18140f #3a3127 #574b3b #756650 #958468 #b8a684',
  boards: '#120f0c #2b241d #43392d #5d4f3e #7a6a54 #9c8a6e',
  tarred: '#050505 #0f0e0d #1a1817 #272422 #37332f #4b4640',
  tarboards: '#0a0908 #1b1814 #2b2620 #3d352c #52483b #6c604e',
  fenstone: ['#101210 #282c28 #40463e #5a6056 #7a7f72 #a0a494', { ks: .2, shin: 6 }],
  ruin: ['#141614 #30342f #4c524a #6c7266 #8e9486 #b6baa8', { ks: .2, shin: 6 }],
  causeway: ['#121418 #2c3036 #454b52 #60676e #818990 #a8b0b6', { ks: .2, shin: 6 }],
  wreck: '#0f0d0b #25211c #3b352d #544c40 #706656 #928672',
  blackwater: ['#040909 #0c1b19 #152b27 #203c36 #30544b #4c7468', { emit: 1, eBase: 2.6 }],
  openwater: ['#08141a #102830 #1c4048 #2e5c64 #4e8088 #86b0b4', { emit: 1, eBase: 2.6 }],
  canal: ['#050b0b #0e1d1d #182c2b #243d3b #365450 #54746e', { emit: 1, eBase: 2.6 }],
  seawater: ['#081418 #12282c #1e3e40 #30585a #4c7a78 #7ea8a2', { emit: 1, eBase: 2.6 }],
  greenwater: ['#020c0a #06201a #0c3a2c #16563e #2c7a58 #58a882', { emit: 1, eBase: 2.6 }],
  marshlight: ['#06161a #0e3a42 #1e6a72 #48a8aa #9edcd4 #eafff8', { emit: 1, eBase: 2.8 }],
  waterlight: ['#021410 #063a2c #0c6448 #1a9468 #52c89a #b4f4d4', { emit: 1, eBase: 2.4 }],
  // M6: the Gloomfen's people, foes and things (art/map-sprites.js)
  fenskin: ['#0c1412 #1c2c28 #324842 #4e665c #768e84 #a8bcb2', { ks: .25, shin: 8 }],
  hagskin: ['#141a10 #2a3420 #465436 #64744c #889868 #b0bc8c', { ks: .15, shin: 6 }],
  oldskin: ['#2c1410 #5a2a20 #8e4c3a #ba765a #d89c7e #f0c4a4', { ks: .15, shin: 6 }],
  weed: '#070c08 #122016 #1c3222 #28462e #3a5e3c #527a4c',
  sodden: '#0c0d0e #1c1f20 #2e3334 #43494a #5c6462 #7a8480',
  choir: '#171b1a #333c38 #505c56 #717e76 #97a49a #c0cabe',
  mourning: '#050506 #0e0e12 #19191f #25252d #34343e #4a4a56',
  lamplight: ['#1a0e02 #4a2a06 #8a560e #c88a1c #f2c050 #fff2c0', { emit: 1, eBase: 2.8 }],
  pearl: ['#1a1c22 #3c404a #666c78 #9aa0ac #cdd2da #f6f8fa', { ks: .6, shin: 14 }],
  leech: ['#060605 #14130f #24221a #363224 #4c4632 #686044', { ks: .5, shin: 12 }],
  gar: ['#0a0e0c #1a2420 #2c3c34 #40564a #5c7462 #82988a', { ks: .5, shin: 12 }],
  moth: '#1a1610 #3a3226 #5e5240 #867a60 #b0a484 #d8d0b0',
  levi: ['#040708 #0c1416 #162428 #22363a #344e50 #4e6c6c', { ks: .5, shin: 12 }],
};
// worldMats(): registers the 'w.' materials in MAT once (idempotent; tiles.js and map-sprites.js call it)
export function worldMats() {
  if (MAT['w.sand']) return;
  for (const [k, s] of Object.entries(WMAT)) { const [pal, o] = Array.isArray(s) ? s : [s, null]; MAT['w.' + k] = Object.assign({ pal: ramp(pal), ks: 0 }, o); }
}
worldMats();

const SUN_BASE = {
  sun: 1, grass: 'w.sand', gLo: -1.45, gHi: -.5, gDith: .34, blade: 'w.sage', clover: 'w.sage', soil: 'w.track', soilDark: 'w.clay', mud: 'w.track', puddle: 'w.oasis',
  stone: 'w.sandstone', wall: 'w.sandstone', cap: 'w.sandstone', cliff: 'w.sandstone', cliffDark: 'w.redrock', stair: 'w.sandstone', doorFrame: 'w.sandstone', door: 'wood',
  curtain: 'w.indigo', water: 'w.oasis', bank: 'w.sandstone', leaf: 'w.palm', leafDark: 'seaweed', trunk: 'thorn', bush: 'drake', cactus: 'drake', glass: 'w.glass', glow: 'amber',
  roof: 'w.canvas', roofEdge: 'wood', awning: ['w.saffron', 'clothWhite'], flowers: ['w.saffron', 'paintRed', 'clothWhite'], torch: 'amber', sconce: 'bronze',
  palisade: 'thorn', palisadeBand: 'leather', ichor: 'w.pitch', ichorGlow: 'ember', darkFloor: 'w.clay', floor: 'wood', bridge: 'wood', rail: 'bogwood', tile: 'w.plaster', ink: 'clothTeal', ballast: 'w.clay', ties: 'wood', paver: 'w.paver',
  tree: 'cactus', bushK: 'barrel', rockK: 'layer', wallK: 'ashlar', roofK: 'tent', mudK: 'crack', glowK: 'glint', ridgeK: 'ripple', caveK: 'rock', floorK: 'planks', lampK: 'lantern', doorK: 'arch', decK: 'sand',
};
const SUN_PAL = {
  desert: {},
  'desert-town': { bankK: 'stone', tree: 'palm', bushK: 'jars', roofK: 'tile', roof: 'w.terra', roofEdge: 'w.terra', awning: ['w.indigo', 'clothWhite'], water: 'w.cistern', puddle: 'w.cistern', floorK: 'tiles', ridgeK: 'bloom', blade: 'w.palm', bridge: 'w.sandstone', rail: 'w.sandstone' },
  canyon: { paver: null, grass: 'w.dust', seed: 3, soil: 'w.ochre', soilDark: 'w.dust', stone: 'w.redrock', wall: 'w.redrock', cap: 'w.redrock', cliff: 'w.redrock', cliffDark: 'leatherRed', stair: 'w.redrock', doorFrame: 'w.redrock', bank: 'w.sandstone', wallK: 'rough', water: 'w.cistern', puddle: 'w.cistern', decK: 'dust', darkFloor: 'w.shaft', roofK: 'tent', awning: ['w.canvas', 'w.clay'], doorK: 'adit', lampK: 'lamp' },
  'mine-camp': { paver: null, ballast: 'granite', grass: 'w.grit', seed: 5, gLo: -1.5, gHi: -.5, soil: 'w.clay', soilDark: 'w.shaft', stone: 'w.shaft', cliff: 'w.shaft', cliffDark: 'dark', stair: 'w.shaft', wall: 'wood', cap: 'bogwood', wallK: 'timber', doorFrame: 'bogwood', roofK: 'tent', awning: ['w.canvas', 'w.clay'], tree: 'dead', trunk: 'bone', bushK: 'crates', rockK: 'ore', glowK: 'vein', decK: 'grit', ridgeK: 'gravel', palisade: 'wood', water: 'w.cistern', mudK: 'wet', mud: 'w.shaft', puddle: 'w.cistern', doorK: 'adit', lampK: 'lamp', darkFloor: 'w.shaft', bank: 'bogwood' },
  mine: { paver: null, ballast: 'granite', grass: 'w.shaft', seed: 7, gLo: -1.5, gHi: -.8, gDith: .3, stone: 'w.grit', wall: 'w.shaft', cap: 'w.shaft', cliff: 'w.shaft', cliffDark: 'dark', stair: 'w.grit', doorFrame: 'bogwood', wallK: 'shaft', caveK: 'rock', tree: 'prop', bushK: 'cart', rockK: 'ore', glowK: 'vein', decK: 'shaft', ridgeK: 'gravel', mudK: 'slurry', mud: 'w.shaft', puddle: 'w.pitch', water: 'w.cistern', bank: 'w.shaft', lampK: 'lamp', doorK: 'adit', roofK: 'slab', roof: 'w.shaft', roofEdge: 'w.grit', darkFloor: 'w.grit', rockTop: 'w.shaft', soil: 'w.grit', soilDark: 'dark', palisade: 'wood' },
  crystal: { paver: null, ballast: 'w.cave', grass: 'w.cave', seed: 9, gLo: -1.5, gHi: -.8, gDith: .3, stone: 'w.cave', wall: 'w.cave', cap: 'w.cave', cliff: 'w.cave', cliffDark: 'dark', stair: 'w.cave', doorFrame: 'w.cave', wallK: 'crystal', caveK: 'glass', tree: 'spire', bushK: 'cluster', rockK: 'glass', glowK: 'crystal', glow: 'frost', decK: 'cave', ridgeK: 'grit', glass: 'seaglass', water: 'w.oasis', bank: 'w.cave', lampK: 'crystal', torch: 'frost', roofK: 'slab', roof: 'w.cave', roofEdge: 'w.cave', darkFloor: 'w.cave', rockTop: 'dark', soil: 'w.cave', soilDark: 'dark', mudK: 'slurry', mud: 'w.cave', puddle: 'w.oasis', doorK: 'adit' },
  dunes: { grass: 'w.dune', seed: 2, gLo: -1.35, gHi: -.45, cliff: 'w.dune', cliffDark: 'w.sand', cliffK: 'slip', tree: 'spire', bushK: 'shards', rockK: 'glass', awning: ['w.indigo', 'w.canvas'], decK: 'sand' },
  oasis: { grass: 'w.sand', seed: 4, blade: 'w.palm', clover: 'w.palm', tree: 'palm', bushK: 'shrub', bush: 'hoodGreen', ridgeK: 'bloom', roofK: 'thatch', roof: 'thorn', roofEdge: 'w.palm', glowK: 'wisp', mudK: 'wet', mud: 'bogwood', puddle: 'w.oasis', decK: 'oasis', floorK: 'tiles', bank: 'w.sandstone', curtain: 'clothTeal' },
  ash: { paver: null, ballast: 'w.ash', ties: 'w.char', grass: 'w.ash', seed: 6, stone: 'w.char', wall: 'w.char', cap: 'w.char', cliff: 'w.char', cliffDark: 'dark', stair: 'w.char', doorFrame: 'w.char', wallK: 'burnt', tree: 'charred', trunk: 'w.char', bushK: 'stump', rockK: 'rubble', roofK: 'burnt', roof: 'w.char', roofEdge: 'w.char', glowK: 'ember', ridgeK: 'cinder', decK: 'ash', mudK: 'ash', mud: 'w.ash', blade: 'w.char', water: 'w.cistern', bank: 'w.char', lampK: 'brazier', torch: 'ember', palisade: 'w.char', palisadeBand: 'blackiron', soil: 'w.char', soilDark: 'dark', darkFloor: 'w.char', floor: 'bogwood', bridge: 'w.char', rail: 'w.char', curtain: 'robeRed', door: 'w.char' },
  vault: { paver: null, ballast: 'w.basalt', ties: 'bogwood', grass: 'w.basalt', seed: 8, gLo: -1.4, gHi: -.9, gDith: .26, stone: 'w.basalt', wall: 'w.basalt', cap: 'w.basalt', cliff: 'w.basalt', cliffDark: 'dark', stair: 'w.basalt', doorFrame: 'w.basalt', wallK: 'vault', caveK: 'masonry', tree: 'column', bushK: 'urn', rockK: 'block', glowK: 'ember', ridgeK: 'ashy', decK: 'vault', mudK: 'ash', mud: 'w.ash', lampK: 'brazier', torch: 'ember', roofK: 'slab', roof: 'w.basalt', roofEdge: 'bronze', floor: 'w.basalt', darkFloor: 'w.basalt', rockTop: 'dark', doorK: 'vault', water: 'w.cistern', bank: 'w.basalt', soil: 'w.basalt', soilDark: 'dark', blade: 'w.ash', bridge: 'w.basalt', rail: 'bronze', palisade: 'blackiron', palisadeBand: 'bronze' },
};
const SUN_BIOMES = new Set(Object.keys(SUN_PAL));
const specOf = (biome, id) => (SUN_BIOMES.has(biome) && SUN_SPEC[id]) || (IRON_BIOMES.has(biome) && IRON_SPEC[id]) || (GLOOM_BIOMES.has(biome) && GLOOM_SPEC[id]) || SPEC[id];

// the biome's '.' ground: the same periodic field the road verges and cliff lips copy
function sunGround(F, Pl, D, fn) { ground(F, Pl.grass, SEEDS.grass + (Pl.seed || 0), D, { lo: Pl.gLo, hi: Pl.gHi, dith: Pl.gDith, fn }); }
// a soft contact shadow on the ground under a solid thing
function blot(D, Pl, cx, cy, rx, ry, dd = -2) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 < 1) D.set(x, y, Pl.grass, dd); }
const part = (F, mat, shapes, o = {}) => F.add(Object.assign({ mat, prof: 'round', bw: 1.4, lo: 1, hi: 4, shapes }, o));

/* ---- '.' sand (and each place's ground) ---- */
function sunSand(F, Pl, v) {
  const D = decals(), g = Pl.grass, k = Pl.decK;
  for (const [x, y] of spots(3, 5100 + v * 7)) D.set(x, y, g, -2);
  for (const [x, y] of spots(2 + (v & 1), 5150 + v * 11)) D.set(x, y, g, 0);
  if (v === 1) for (const [x, y] of spots(2, 5200)) pebble(D, x, y, Pl.stone);
  if (v === 2 && (k === 'sand' || k === 'dust' || k === 'oasis')) { const [x, y] = spots(1, 5250, 4)[0]; for (let i = -2; i <= 2; i++) { const o = Math.abs(i) === 2 ? 1 : 0; D.set(x + i, y + o, g, 0); D.set(x + i, y + o + 1, g, -2); } }
  if (v === 3) {
    const [x, y] = spots(1, 5300, 4)[0];
    if (k === 'oasis' || k === 'sand') { tuft(D, x - 1, y - 1, Pl.blade); if (k === 'oasis') tuft(D, x + 3, y + 2, Pl.blade); }
    else if (k === 'dust') { pebble(D, x, y, Pl.stone); pebble(D, x + 3, y + 3, Pl.stone); }
    else if (k === 'grit' || k === 'shaft') { pebble(D, x, y, 'dark'); D.set(x + 3, y + 2, 'amber', -1.6); }
    else if (k === 'cave') { D.set(x, y, 'seaglass', -.6); D.set(x + 1, y + 1, 'seaglass', -1.6); D.set(x + 4, y - 2, 'seaglass', -1); }
    else if (k === 'ash') { for (const [a, b] of [[0, 0], [1, 0], [2, 1], [4, 2]]) D.set(x + a, y + b, 'dark', -1); }
    else if (k === 'vault') { for (let i = 0; i < 6; i++) D.set(x + i - 2, y + (i >> 1), 'dark', -1.2); }
  }
  sunGround(F, Pl, D);
}
/* ---- ',' dune ridges, or the place's scatter (flowers, gravel, cinders, glass grit, ash) ---- */
function sunRidges(F, Pl, v) {
  const k = Pl.ridgeK, g = Pl.grass, D = decals();
  if (k === 'ripple') {
    // three short wind ripples per tile, staggered and kept inside the tile so a field of them never lines
    // up into planks: a lit crest over its lee in shadow
    const R = [[4.6, 3.6, 3.4], [11.2, 8.4, 3.8], [5.4, 12.8, 3.2]].map(([x, y, h], i) => { const w = h - (i === v % 3 ? .8 : 0); return [Math.min(15.4 - w, Math.max(.6 + w, x + (rnd(i, v, 54) - .5) * 3)), y + (rnd(i, v, 55) - .5) * 1.6, w]; });
    for (const [x, y] of spots(2, 5400 + v)) D.set(x, y, g, -2);
    sunGround(F, Pl, D, (x, y) => {
      for (const [cx, cy, w] of R) {
        const t = (x + .5 - cx) / w;
        if (t < -1 || t > 1) continue;
        const d = y + .5 - (cy + Math.sin(t * 2.6) * .9 + t * t * .8);
        if (d >= -.5 && d < .5) return 0;
        if (d >= .5 && d < 1.5) return -2;
      }
      return undefined;
    });
    return;
  }
  const S = spots(6, 5500 + v * 13, 2);
  if (k === 'bloom') {
    for (const [x, y] of spots(5, 5520 + v)) tuft(D, x - 1, y - 1, Pl.blade);
    S.slice(0, 4).forEach(([x, y], i) => { const m = Pl.flowers[(i + v) % Pl.flowers.length]; D.set(x, y, m, 0); D.set(x - 1, y, m, -1); D.set(x + 1, y, m, -1); D.set(x, y + 1, Pl.blade, -1.5); });
  } else if (k === 'gravel') { S.forEach(([x, y], i) => (i % 3 === 2 ? D.set(x, y, 'amber', -1.7) : pebble(D, x, y, Pl.stone))); }
  else if (k === 'grit') { S.forEach(([x, y], i) => { D.set(x, y, 'seaglass', i & 1 ? -.4 : -1.2); if (i & 1) D.set(x + 1, y + 1, 'dark', 0); }); }
  else if (k === 'cinder') { S.forEach(([x, y], i) => { D.set(x, y, i % 3 ? 'dark' : 'ember', i % 3 ? -1 : -1.4); if (!(i % 3)) D.set(x + 1, y, 'w.char', -1); }); }
  else if (k === 'ashy') { S.forEach(([x, y]) => { D.set(x, y, Pl.mud, -.8); D.set(x + 1, y, Pl.mud, -1.2); D.set(x, y + 1, Pl.mud, -1.6); }); }
  sunGround(F, Pl, D);
}
/* ---- '"' scrub: dry blades (reeds at the oasis, burnt stalks at Scorchgate), their tops drawn overhead ---- */
function sunScrub(F, Pl, v) {
  const D = decals();
  for (let k = 0; k < 14; k++) blade(D, Math.floor(rnd(k, 3, 60 + v) * 16), Math.floor(rnd(k, 4, 60 + v) * 14) + 1, Pl.blade);
  for (const [x, y] of spots(5, 5600 + v)) D.set(x, y, Pl.grass, -2);
  sunGround(F, Pl, D);
}
function sunScrubTops(F, Pl, v) {
  const sh = [];
  for (let k = 0; k < 8; k++) { const x = 1.5 + k * 1.9 + (rnd(k, v, 5) - .5), top = 7 + rnd(k, 1 + v, 5) * 4; sh.push(P([[x - .75, 16.5], [x + (k % 2 ? .9 : -.8), top], [x + .75, 16.5]])); }
  F.add({ mat: Pl.blade, prof: 'ridge', grp: 'tops', noOutline: true, lo: 1, hi: 3, shapes: sh, tex: q => (q.y < 10 ? .2 : q.y > 13 ? -1.3 : -.5) });
}

/* ---- 'T' palms, cacti, dead trees, glass spires, charred trees, columns, pit props ---- */
function sunTreeBase(F, Pl, v) {
  const t = Pl.tree, D = decals();
  blot(D, Pl, 8.6 + (v ? .6 : 0), 14.2, 6.6, 2.4);
  sunGround(F, Pl, D);
  const ring = q => (q.y % 3 === 0 ? -1 : 0);
  if (t === 'palm') part(F, Pl.trunk, [C([8, 15.4], [8.3, -2], 1.9, 1.6), E([8, 15.2], 2.7, 1.1)], { bw: 1.6, grp: 'trunk', tex: ring });
  else if (t === 'cactus') part(F, Pl.cactus, [C([8, 15.2], [8, -3], 2.6)], { bw: 2.4, grp: 'col', tex: q => (q.x % 2 === 0 ? -.7 : 0) });
  else if (t === 'dead' || t === 'charred') part(F, Pl.trunk, [C([8, 15], [8, -2], 1.8, 1.3), C([8, 14.6], [4.4, 15.8], 1, .5), C([8, 14.6], [11.8, 15.6], 1, .5)], { bw: 1.2, grp: 'trunk', tex: q => (q.x % 3 === 0 ? -1 : 0) });
  else if (t === 'spire') {
    part(F, Pl.glass, [P([[5, 15.6], [5.4, -2], [11, -2], [11.6, 15.6]])], { prof: 'bevel', bw: 1.6, grp: 'shard', hi: 5 });
    part(F, Pl.glass, [P([[11, 15.8], [14.6, 9.6], [12.6, 15.8]])], { prof: 'bevel', bw: .8, grp: 'chip', hi: 5 });
  } else if (t === 'column') {
    part(F, Pl.stone, [RECT(5, -2, 11, 12.8)], { bw: 2.2, grp: 'shaft', tex: q => (q.x === 7 ? -.8 : 0) });
    part(F, Pl.stone, [RECT(3.4, 12.2, 12.6, 15.8)], { prof: 'bevel', bw: 1, grp: 'plinth' });
  } else if (t === 'prop') part(F, 'wood', [RECT(6.6, -2, 9.4, 15.6)], { prof: 'bevel', bw: 1, grp: 'post', tex: q => (q.y % 5 === 0 ? -1 : 0) });
}
// the overhead part, 24 x 26 drawn at (-4, -16): the tree tile's column is x = 12 here, its top row y = 16
function sunTreeTop(F, Pl, v) {
  const t = Pl.tree;
  if (t === 'palm') {
    const cx = 12.4 + (v === 1 ? -1.4 : v === 2 ? 1.4 : 0), cy = 8.4;
    part(F, Pl.trunk, [C([12.3, 27.5], [cx, cy + 1.6], 1.6, 1.35)], { bw: 1.6, grp: 'trunk', tex: q => (q.y % 3 === 0 ? -1 : 0) });
    part(F, 'leatherRed', [O([cx - 1.5, cy + 2.4], .95), O([cx + 1.3, cy + 2.7], .95), O([cx, cy + 3.3], .85)], { bw: .6, grp: 'dates' });
    const frond = (a, L, dr, w) => { const f = [], b = []; for (let i = 0; i <= 6; i++) { const u = i / 6, x = cx + Math.cos(a) * L * u, y = cy + Math.sin(a) * L * u + dr * u * u, r = w * Math.sin(Math.PI * Math.min(1, .15 + u * .95)) + .3, nx = -Math.sin(a), ny = Math.cos(a); f.push([x + nx * r, y + ny * r]); b.unshift([x - nx * r, y - ny * r]); } return P(f.concat(b)); };
    const back = [[-2.75, 8.5, 2.2], [-.35, 9, 2.8], [2.35, 8, 3.4], [1.1, 7.5, 4]], front = [[-3.1, 9.6, 3], [-2.2, 8.2, .6], [-1.35, 6.4, -.6], [-.2, 8, 1.2], [.75, 9.6, 3.4], [1.75, 7.6, 4.4], [2.75, 9.4, 3.2]];
    part(F, Pl.leafDark, back.map(([a, L, dr]) => frond(a + v * .12, L, dr, 1.9)), { prof: 'ridge', grp: 'under', hi: 3 });
    part(F, Pl.leaf, front.map(([a, L, dr]) => frond(a - v * .1, L, dr, 1.75)), { prof: 'ridge', grp: 'fronds', tex: q => ((q.x * 2 + q.y) % 4 === 0 && q.d < 1.1 ? -1 : 0) + (q.d > 1.2 ? .4 : 0) });
    return;
  }
  if (t === 'cactus') {
    const rib = q => (q.x % 2 === 0 ? -.7 : 0), yL = 17.5 - v * 1.5, yR = 13 + v;
    part(F, Pl.cactus, [C([12, 28], [12, 5.5 + v], 2.6)], { bw: 2.4, grp: 'col', tex: rib });
    part(F, Pl.cactus, [C([10.2, yL], [6.6, yL], 1.55), C([6.6, yL + .3], [6.6, yL - 6], 1.6)], { bw: 1.6, grp: 'armL', tex: rib });
    if (v !== 1) part(F, Pl.cactus, [C([13.8, yR], [17.4, yR], 1.5), C([17.4, yR + .3], [17.4, yR - 5], 1.55)], { bw: 1.6, grp: 'armR', tex: rib });
    part(F, 'bone', [[12, 9], [11, 15], [13, 20], [6.6, yL - 3], [17.4, yR - 3], [11, 24]].map(([x, y]) => O([x + .5, y + .5], .5)), { prof: 'flat', grp: 'spines', noShadow: true, noOutline: true, hi: 4, tex: () => 1 });
    if (v === 2) part(F, 'paintRed', [O([12, 5.2 + v], 1.25)], { bw: .6, grp: 'flower', hi: 5 });
    return;
  }
  if (t === 'dead' || t === 'charred') {
    const br = [[[12, 28], [12, 12]], [[12, 17], [5, 9]], [[12, 15], [19, 6.5]], [[12, 12.5], [11, 3]], [[7.5, 11], [3, 12]], [[16.4, 9.6], [21, 11.6]], [[11.4, 6], [14, 2.6]]];
    br.forEach(([a, b], k) => part(F, Pl.trunk, [C(a, [b[0] + (v === 1 ? 1 : v === 2 ? -1 : 0) * (k ? 1 : 0), b[1]], k ? .85 : 1.7, k ? .45 : 1.3)], { bw: .8, grp: 'br' + k }));
    if (t === 'charred') part(F, 'ember', [[5, 9], [19, 6.5], [11, 3]].map(([x, y]) => O([x + .5, y + .5], .55)), { prof: 'flat', grp: 'embers', noShadow: true, hi: 5, tex: () => (v === 2 ? -.6 : .2) });
    return;
  }
  if (t === 'spire') {
    part(F, Pl.glass, [P([[9.4, 28], [9.6, 9], [11.8, 1.4 + v * 1.4], [14.6, 8], [14.6, 28]])], { prof: 'bevel', bw: 1.8, grp: 'shard', hi: 5, tex: q => (q.x === 12 ? .6 : 0) });
    part(F, Pl.glass, [P([[8.8, 28], [5.4, 15 + v], [9.6, 19.6]]), P([[15, 28], [19.2, 18 - v], [15.6, 21.4]])], { prof: 'bevel', bw: 1, grp: 'side', hi: 5 });
    if (Pl.glow === 'frost') part(F, 'frost', [C([12, 24], [12, 9 + v * 1.4], .5)], { prof: 'flat', grp: 'core', noShadow: true, noOutline: true, hi: 5, tex: () => -.6 });
    return;
  }
  if (t === 'column') {
    part(F, Pl.stone, [RECT(9, 5.8, 15, 28)], { bw: 2.2, grp: 'shaft', tex: q => (q.x === 11 ? -.8 : 0) + (v === 2 && q.y < 9 ? -1 : 0) });
    if (v !== 2) { part(F, Pl.stone, [RECT(7.2, 2.2, 16.8, 5.2)], { prof: 'bevel', bw: 1, grp: 'abacus' }); part(F, Pl.stone, [RECT(8.2, 4.8, 15.8, 7)], { prof: 'bevel', bw: .8, grp: 'echinus' }); }
    else part(F, Pl.stone, [P([[9, 6.4], [10.6, 4.2], [12.4, 5.8], [15, 4.6], [15, 6.4]])], { prof: 'bevel', bw: .8, grp: 'broken' });
    return;
  }
  if (t === 'prop') {
    part(F, 'wood', [RECT(10.6, 5, 13.4, 28)], { prof: 'bevel', bw: 1, grp: 'post', tex: q => (q.y % 5 === 0 ? -1 : 0) });
    part(F, 'wood', [C([12, 12.4], [7.6, 6.4], .8), C([12, 12.4], [16.4, 6.4], .8)], { bw: .8, grp: 'brace' });
    part(F, 'wood', [RECT(-1, 2.6, 25, 6.2)], { prof: 'bevel', bw: 1, grp: 'beam', tex: q => (q.x % 7 === 0 ? -.8 : 0) });
    part(F, 'iron', [O([4, 4.4], .55), O([20, 4.4], .55)], { prof: 'flat', grp: 'nails', noShadow: true });
  }
}

/* ---- 't' barrel cacti, clay jars, shrubs, crates, ore carts, crystal clusters, stumps, urns, glass shards ---- */
function sunBush(F, Pl, v) {
  const k = Pl.bushK, D = decals();
  blot(D, Pl, 8.5, 13.8, 6.4, 2.2);
  sunGround(F, Pl, D);
  const rib = q => (q.x % 2 === 0 ? -.7 : 0);
  if (k === 'barrel') {
    if (v) { part(F, Pl.cactus, [E([5.6, 10.4], 3.3, 3), E([11, 9.4], 3.1, 2.8), E([8.4, 5.6], 2.6, 2.4)], { bw: 1.6, grp: 'pads', tex: q => ((q.x + q.y) % 4 === 0 ? -.8 : 0) }); part(F, 'paintRed', [O([8.4, 3.2], .8), O([12.6, 7], .75)], { bw: .5, grp: 'fruit' }); }
    else { part(F, Pl.cactus, [E([8.5, 10], 5, 5.2)], { bw: 2.6, grp: 'barrel', tex: rib }); part(F, 'w.saffron', [O([8.5, 5], 1.3)], { bw: .6, grp: 'flower', hi: 5 }); }
    part(F, 'bone', (v ? [[4, 9], [12, 8], [8, 4]] : [[5, 8], [11, 9], [7, 12], [10, 13]]).map(([x, y]) => O([x + .5, y + .5], .45)), { prof: 'flat', grp: 'spines', noShadow: true, noOutline: true, tex: () => 1 });
  } else if (k === 'jars') {
    const J = v ? [[5, 10.6, 3.2, 3.8], [11.2, 11.4, 3, 3.3], [8.6, 7.4, 2.4, 2.8]] : [[5.4, 11, 3.4, 3.6], [11, 10.2, 3.2, 4.2]];
    J.forEach(([x, y, rx, ry], i) => { part(F, 'w.terra', [E([x, y], rx, ry), RECT(x - 1.2, y - ry - 1.4, x + 1.2, y - ry + .6)], { bw: 2, grp: 'jar' + i, tex: q => (Math.abs(q.y - y + 1) < .6 ? { m: 'w.saffron', dd: -1 } : 0) }); part(F, 'dark', [E([x, y - ry - 1.2], 1, .5)], { prof: 'flat', grp: 'mouth' + i, noShadow: true }); });
  } else if (k === 'shrub') {
    part(F, Pl.bush, [[[5.5, 9.5, 4.2], [10.5, 9, 4.4], [8, 5.6, 4.2]], [[5, 8.6, 4.1], [11, 9.8, 4], [8.4, 5.2, 4.1], [8, 11, 3.8]]][v].map(([x, y, r]) => O([x, y], r)), { bw: 3.4, grp: 'bush', tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? -1 : 0) + (rnd(q.x, q.y, 5 + v) < .1 ? 1 : 0) });
    part(F, Pl.flowers[1], [O([6.5, 7.5], .6), O([10.5, 10.5], .6), O([9.5, 5.5], .55)], { prof: 'flat', grp: 'bloom', noShadow: true });
  } else if (k === 'crates') {
    part(F, 'wood', [RECT(1.4, 6.4, 9.6, 14.8)], { prof: 'bevel', bw: 1, grp: 'crate', tex: q => (q.y === 10 || q.x === 5 ? -1 : 0) });
    part(F, 'wood', [RECT(9.4, v ? 3.4 : 7.2, 14.8, 15)], { bw: 2, grp: 'barrel', tex: q => (q.y % 4 === 0 ? { m: 'iron', dd: 0 } : q.x === 11 ? -.8 : 0) });
    if (v) part(F, 'wood', [RECT(3, 1.6, 8.6, 6.8)], { prof: 'bevel', bw: .8, grp: 'crate2', tex: q => (q.x === 5 ? -1 : 0) });
  } else if (k === 'cart') {
    part(F, 'iron', [O([4.4, 13.8], 1.8), O([11.6, 13.8], 1.8)], { bw: .8, grp: 'wheels' });
    part(F, 'iron', [P([[1.4, 7.4], [14.6, 7.4], [13.4, 13.2], [2.6, 13.2]])], { prof: 'bevel', bw: 1, grp: 'tub', tex: q => (q.x === 4 || q.x === 11 ? -1 : 0) });
    part(F, Pl.stone, [E([8, 7.2], 5.6, 2.6)], { bw: 1.6, grp: 'ore', clip: RECT(0, 0, 16, 8.2) });
    part(F, 'amber', [O([6, 6.4], .7), O([10.4, 6.8], .7)], { prof: 'flat', grp: 'sun', noShadow: true, hi: 5 });
  } else if (k === 'cluster' || k === 'shards') {
    const sh = [[[3.4, 14.4], [4.6, 5 + v], [7.4, 14.4]], [[6.2, 14.6], [8.6, 2.6], [11, 14.6]], [[9.6, 14.2], [13.2, 6.6 - v], [13.2, 14.2]]];
    part(F, Pl.glass, sh.map(p => P(p)), { prof: 'bevel', bw: 1.2, grp: 'shards', hi: 5 });
    if (k === 'cluster') part(F, Pl.glow, [C([8.6, 12.6], [8.6, 5.6], .45)], { prof: 'flat', grp: 'core', noShadow: true, noOutline: true, hi: 5, tex: () => -.4 });
  } else if (k === 'stump') {
    part(F, Pl.trunk || 'w.char', [P([[3.6, 14.6], [4.2, 6.6], [6, 4.8], [10.4, 5.2], [12, 7], [12.4, 14.6]]), C([4.4, 14], [1.6, 15.4], 1, .5), C([11.6, 14], [14.6, 15.2], 1, .5)], { bw: 2, grp: 'stump', tex: q => (q.x % 3 === 0 ? -1 : 0) });
    part(F, 'w.ash', [E([8, 5.6], 3.4, 1.2)], { prof: 'flat', grp: 'top', noShadow: true, hi: 3, tex: q => (Math.abs(q.x - 8) < 1.2 ? -1 : 0) });
    part(F, 'ember', [C([6.4, 8], [7.2, 11.6], .45), O([9.6, 9.6], .5)], { prof: 'flat', grp: 'glow', noShadow: true, noOutline: true, hi: 5, tex: () => (v ? -.8 : -.2) });
  } else if (k === 'urn') {
    part(F, 'bronze', [E([8, 10.2], 4.4, 4.2), RECT(6.2, 3.8, 9.8, 7.2), E([8, 3.8], 2.8, .9)], { bw: 2, grp: 'urn', tex: q => (Math.abs(q.y - 9) < .6 ? { m: 'verdigris', dd: 0 } : 0) });
    part(F, 'dark', [E([8, 3.7], 1.8, .5)], { prof: 'flat', grp: 'mouth', noShadow: true });
    if (v) part(F, 'w.ash', [E([8, 3.4], 1.6, .5)], { prof: 'flat', grp: 'ash', noShadow: true, hi: 3 });
  }
}
/* ---- 'o' layered boulders, ore rock, glass lumps, burnt rubble, fallen blocks ---- */
function sunRock(F, Pl, v) {
  const k = Pl.rockK, D = decals();
  blot(D, Pl, 8.6, 13.6, 6.6, 2.3);
  sunGround(F, Pl, D);
  if (k === 'glass') {
    part(F, Pl.glass, [P([[2.6, 14.2], [3.6, 8], [7, 3.4 + v], [11.6, 4.4], [14, 9], [13.6, 14.2], [8, 15.2]])], { prof: 'bevel', bw: 2.2, grp: 'lump', hi: 5 });
    part(F, Pl.glass, [P([[5.4, 11], [7.4, 6.6], [9.6, 10.6]])], { prof: 'ridge', grp: 'facet', hi: 5 });
    return;
  }
  if (k === 'rubble' || k === 'block') {
    const B = k === 'block' ? [[2.2, 5.4, 13.8, 14.8]] : [[1.6, 9, 8.4, 14.8], [7.6, 8.6, 14.6, 14.6], [4.6, 4.2, 11.4, 9.6]];
    B.forEach(([a, b, c, d], i) => part(F, Pl.stone, [RECT(a, b + (v && i === 2 ? .8 : 0), c, d)], { prof: 'bevel', bw: 1.2, grp: 'blk' + i, tex: q => (rnd(q.x >> 1, q.y >> 1, 20 + i) < .12 ? -1 : 0) }));
    if (k === 'block') part(F, 'dark', [C([6, 5.6], [8.4, 10], .45), C([8.4, 10], [7.6, 14.6], .45)], { prof: 'flat', grp: 'crack', noShadow: true, noOutline: true });
    else part(F, 'ember', [O([6.6, 10], .5)], { prof: 'flat', grp: 'coal', noShadow: true, hi: 5, tex: () => (v ? -.8 : 0) });
    return;
  }
  const pts = [[[2.4, 13.6], [3.2, 7], [6.6, 3.6], [11.4, 3.8], [14, 7.4], [14, 13.6], [8.4, 15]], [[2, 13.8], [2.6, 8.6], [5.4, 4.4], [10.6, 3.2], [13.8, 6], [14.6, 13.2], [9, 15]]][v % 2];
  part(F, Pl.stone, [P(pts)], { bw: 3.2, grp: 'rock', tex: q => (((q.y + (q.x >> 3) + v) % 3) === 0 ? -.9 : 0) + bayer(q.x, q.y) * .25 });
  if (k === 'ore') part(F, 'amber', [O([6.5, 8.5], .6), O([10.5, 10.5], .55), O([9, 6], .5)], { prof: 'flat', grp: 'ore', noShadow: true, hi: 5, tex: () => -.6 });
}

/* ---- '#' walls: sandstone ashlar, rough stone, timber, shored rock, crystal rock, burnt ashlar, vault blocks ---- */
function sunWall(F, Pl, v, face) {
  const k = Pl.wallK, w = Pl.wall, cap = Pl.cap;
  if (k === 'timber') {
    if (face) F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y;
      if (y < 3) return { m: cap, dd: y === 0 ? .6 : y === 2 ? -1.4 : 0 };
      if (x < 2) return { m: cap, dd: x === 0 ? .4 : -.6 };                 // a post at every tile's west edge
      if (y === 9 || y === 10) return { m: cap, dd: y === 9 ? .2 : -1 };    // the rail
      const lx = (x - 2) % 3;
      return (lx === 2 ? -1.6 : lx === 0 ? .4 : -.3) + (rnd(x, y >> 2, 3 + v) < .08 ? -.8 : 0) + (y === 15 ? -.8 : 0);
    } });
    else F.add({ mat: cap, prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => ((q.y & 3) === 0 ? { m: 'dark', dd: -1.4 } : (q.y & 3) === 1 ? .3 : -.6) + bayer(q.x, q.y) * .3 });
    return;
  }
  if (k === 'shaft' || k === 'crystal') {
    F.add({ mat: w, prof: 'flat', grp: 'rock', noShadow: true, lo: 1, hi: face ? 4 : 3, shapes: [FULL], tex: q => { const n = pnoise(q.x / 4, q.y / 4, 4, 70 + v), m = pnoise(q.x / 2, q.y / 2, 8, 72); return -1.6 + n * 1.3 + (m > .7 ? -.8 : 0) + (face && q.y >= 14 ? -.8 : 0) + bayer(q.x, q.y) * .3; } });
    if (!face) return;
    if (k === 'crystal') {
      part(F, 'seaglass', [P([[2, 12], [3.4, 4 + v], [5.6, 11.4]]), P([[9.4, 14], [11.6, 6], [13.8, 13.6]]), P([[6.4, 6.6], [7.6, 2.4], [8.8, 6.4]])], { prof: 'bevel', bw: 1, grp: 'xtal', hi: 5 });
      part(F, 'frost', [O([11.6, 10.6], .5), O([3.6, 8.6], .45)], { prof: 'flat', grp: 'glint', noShadow: true, noOutline: true, hi: 5, tex: () => -.5 });
    } else {
      part(F, 'wood', [RECT(1, 3, 3.4, 16.6), RECT(12.6, 3, 15, 16.6)], { prof: 'bevel', bw: .8, grp: 'posts', tex: q => (q.y % 6 === 0 ? -1 : 0) });
      part(F, 'wood', [RECT(-1, .4, 17, 3.4)], { prof: 'bevel', bw: 1, grp: 'lintel', tex: q => (q.x % 5 === 0 ? -.8 : 0) });
    }
    return;
  }
  const burnt = k === 'burnt', vault = k === 'vault', rough = k === 'rough';
  // joints of each course: every tile has one at x = 0, so tiles join; rough stone varies its blocks
  const J = rough ? [[0, 6 + v, 11], [0, 4, 9 + v]] : v ? [[0, 8], [4, 12]] : [[4, 12], [0, 8]];
  const blockAt = (x, r) => { const j = J[r]; let prev = j[j.length - 1] - 16, b = j.length - 1; for (let i = 0; i < j.length; i++) if (j[i] <= x) { prev = j[i]; b = i; } return [b, x - prev]; };
  if (face) {
    F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y;
      if (y < 3) return { m: cap, dd: y === 0 ? .7 : y === 2 ? -1.6 : -.1 };
      const r = y < 9 ? 0 : 1, ly = y - (r ? 9 : 3), [b, lx] = blockAt(x, r), end = J[r].includes((x + 1) & 15);
      if (ly === 0 || lx === 0) return { m: 'dark', dd: -1.7 };
      let dd = -.45 + (ly === 1 ? .6 : 0) + (lx === 1 ? .35 : 0) + (end ? -.7 : 0) + (y === 15 ? -.7 : 0) + (hash(b, r, 31 + v) - .5) * .9;
      if (rough) dd += ((x * 3 + y * 5) % 11 === 0 ? -.9 : 0) + (pnoise(x / 4, y / 4, 4, 88) - .5) * .8;
      if (burnt) dd += (y < 9 ? -1.1 : -.5) + (pnoise(x / 4, y / 2, 4, 90 + v, 8) > .62 ? -1 : 0);
      return dd + (rnd(x, y, 40 + r) < .06 ? -.9 : 0);
    } });
    if (vault) {
      part(F, 'bronze', [RECT(-2, 3.2, 18, 5)], { prof: 'bevel', bw: .6, grp: 'band', noShadow: true });
      part(F, 'gold', [O([4.5, 4.1], .55), O([12.5, 4.1], .55)], { prof: 'flat', grp: 'rivets', noShadow: true });
    }
    if (burnt && v) part(F, 'dark', [C([10.4, 3], [9, 8.4], .5), C([9, 8.4], [11, 13.4], .45)], { prof: 'flat', grp: 'crack', noShadow: true, noOutline: true });
    return;
  }
  F.add({ mat: cap, prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y, r = y >> 3, lx = ((x + ((r + v) & 1 ? 4 : 0)) % 8 + 8) % 8, ly = y & 7;
    if (lx === 0 || ly === 0) return { m: 'dark', dd: -1.8 };
    return -1 + (lx === 1 || ly === 1 ? .6 : 0) + (lx === 7 || ly === 7 ? -.8 : 0) + (rnd(x, y, 22) < .1 ? -1 : 0) + (burnt ? -.8 : 0) + bayer(x, y) * .3;
  } });
  if (vault && v) part(F, 'bronze', [O([4, 4], .9)], { prof: 'flat', grp: 'stud', noShadow: true, noOutline: true, hi: 3, tex: () => -1 });
}
/* ---- 'H' roofs: terracotta with an awning valance, striped tents, palm thatch, burnt beams, stone slabs ---- */
function sunRoof(F, Pl, v, mask) {
  const k = Pl.roofK, e = Pl.roofEdge, aw = Pl.awning;
  F.add({ mat: Pl.roof, prof: 'flat', grp: 'roof', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y;
    if (mask & 4 && y >= 12 && (k === 'tile' || k === 'tent')) { // eave: a striped valance with a scalloped hem
      const s = Math.floor(x / 3) & 1;
      if (y === 15) return x % 3 === 1 ? { m: aw[s], dd: -1.2 } : { m: 'dark', dd: -2 };
      return { m: aw[s], dd: y === 12 ? .5 : y === 14 ? -.8 : 0 };
    }
    if (mask & 4 && y >= 13) return k === 'thatch' ? ((x * 5 + y) % 3 === 0 ? { m: 'dark', dd: -2 } : -1.2) : { m: e, dd: y === 13 ? .3 : y === 15 ? -1.6 : -.5 };
    if (mask & 1 && y <= 2) return { m: e, dd: y === 0 ? .6 : y === 2 ? -1.3 : 0 };
    if (mask & 8 && x <= 1) return { m: e, dd: x === 0 ? .3 : -.7 };
    if (mask & 2 && x >= 14) return { m: e, dd: x === 15 ? -1.5 : -.7 };
    if (k === 'tile') { const lx = x & 3, ly = y & 3; return (lx === 0 ? -1.7 : lx === 1 ? .7 : lx === 2 ? .1 : -.7) + (ly === 3 ? -1 : ly === 0 ? .3 : 0) + (rnd(x >> 2, y >> 2, 9 + v) < .1 ? -.6 : 0); }
    if (k === 'tent') { const s = Math.floor(x / 4) & 1; return { m: aw[s], dd: .3 - y * .06 + (x % 4 === 0 ? -.6 : 0) + (y % 8 === 7 ? -.6 : 0) }; }
    if (k === 'thatch') return .1 + ((x * 2 + y * 3 + (y >> 2) * 5) % 7 < 2 ? -1 : 0) + ((y & 3) === 3 ? -.8 : 0) + ((x + (y >> 2)) % 5 === 0 ? .5 : 0);
    if (k === 'burnt') { if (x % 5 === 4) return { m: 'dark', dd: -2 }; if (rnd(x, y, 13 + v) < .025) return { m: 'ember', dd: -1.2 }; return -.9 + ((x % 5) === 0 ? .5 : 0) + (pnoise(x / 4, y / 4, 4, 17 + v) > .6 ? -.8 : 0); }
    const lx = (x + ((y >> 3) & 1 ? 4 : 0)) & 7, ly = y & 7; // slab
    return lx === 0 || ly === 0 ? { m: 'dark', dd: -1.8 } : -.6 + (lx === 1 || ly === 1 ? .5 : 0) + bayer(x, y) * .25;
  } });
}
/* ---- '|' stakes; '*' a lantern, lamp, brazier or glowing crystal on the wall; '+' an arch, adit or vault door ---- */
function sunPalisade(F, Pl, v, top) {
  sunGround(F, Pl, null);
  for (let k = 0; k < 4; k++) {
    const x = k * 4 + 2, tipY = top ? 1 + ((k + v) % 2) * 1.3 : -3;
    F.add({ mat: Pl.palisade, prof: 'round', bw: 1.6, grp: 'log' + k, lo: 1, hi: 4, shapes: [P([[x - 1.95, 16.5], [x - 1.95, tipY + 2.4], [x, tipY], [x + 1.95, tipY + 2.4], [x + 1.95, 16.5]])], tex: q => (q.y % 4 === k % 4 ? -1 : 0) });
  }
  F.add({ mat: Pl.palisadeBand, prof: 'round', bw: .6, grp: 'band', lo: 1, hi: 3, shapes: [C([-2, 9.5], [18, 9.5], .8)] });
}
function sunTorch(F, Pl, v, f) {
  sunWall(F, Pl, 0, true);
  lampOn(F, Pl, f);
}
// the light on a '*' wall face (its warm pool, then the lamp): shared with the Ironspire walls
function lampOn(F, Pl, f) {
  const k = Pl.lampK;
  F.add({ mat: Pl.torch, prof: 'flat', grp: 'warm', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [E([8, 7], 5.6, 5.2)], tex: q => (bayer(q.x, q.y) + (Math.hypot(q.x - 7.5, q.y - 7) / 5.6) * .9 > .55 ? -9 : -2.4 + (f ? .3 : 0)) });
  if (k === 'crystal') {
    part(F, 'seaglass', [P([[5.6, 12], [6.6, 4.6], [8.4, 2.6], [10.4, 4.6], [10.6, 12]])], { prof: 'bevel', bw: 1.4, grp: 'xtal', hi: 5 });
    part(F, Pl.torch, [C([8.2, 10.6], [8.2, 5.2], f ? .8 : .6)], { prof: 'flat', grp: 'core', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? .6 : 0) });
    return;
  }
  if (k === 'brazier') {
    part(F, 'blackiron', [P([[4, 8.6], [12, 8.6], [10.6, 11.8], [5.4, 11.8]]), C([8, 11.6], [8, 14.4], .7)], { prof: 'bevel', bw: .8, grp: 'bowl' });
    part(F, Pl.torch, [P(f ? [[8.4, 1.6], [10.8, 5], [10.4, 8.6], [5.6, 8.6], [5.4, 5.4]] : [[7.4, 1.4], [10.4, 5.4], [10.4, 8.6], [5.6, 8.6], [5.8, 4.4]])], { bw: 1.6, grp: 'flame', noShadow: true, hi: 5, tex: q => (q.y > 5 ? .9 : .1) + (f ? .3 : 0) });
    return;
  }
  part(F, 'iron', [C([8, 2.6], [8, 4.8], .5), C([5.2, 3], [10.8, 3], .45)], { bw: .6, grp: 'bracket' });
  if (k === 'lamp') {
    part(F, 'bronze', [E([8, 9.6], 2.6, 1.4), C([8, 5], [8, 8.6], .35)], { bw: .8, grp: 'lamp' });
    part(F, Pl.torch, [P(f ? [[8.4, 4.4], [9.6, 7], [8, 8.6], [6.6, 7.2]] : [[7.6, 4.2], [9.4, 7.2], [8, 8.6], [6.6, 7]])], { bw: 1, grp: 'flame', noShadow: true, hi: 5, tex: () => (f ? .8 : .4) });
    return;
  }
  part(F, Pl.sconce, [RECT(5.8, 4.6, 10.2, 11.4), P([[5.2, 5], [8, 3.4], [10.8, 5]]), RECT(6.6, 11.2, 9.4, 12.4)], { prof: 'bevel', bw: .8, grp: 'lantern' });
  part(F, Pl.torch, [RECT(6.8, 6, 9.2, 10.4)], { prof: 'flat', grp: 'glass', noShadow: true, hi: 5, tex: q => (q.y > 8 ? .8 : .2) + (f ? .3 : -.1) });
  part(F, Pl.sconce, [C([8, 5.8], [8, 10.6], .4)], { prof: 'flat', grp: 'mullion', noShadow: true, hi: 3, tex: () => -1 });
}
function sunDoor(F, Pl, v) {
  sunWall(F, Pl, v, true);
  doorOn(F, Pl);
}
// the doorway on a '+' wall face: shared with the Ironspire walls
function doorOn(F, Pl) {
  const k = Pl.doorK;
  if (k === 'adit') {
    part(F, 'dark', [RECT(3.6, 4, 12.4, 17)], { prof: 'flat', grp: 'opening', lo: 0, hi: 1, tex: q => (q.y > 12 ? -1 : 0) });
    part(F, 'wood', [RECT(2, 4, 4.4, 16.6), RECT(11.6, 4, 14, 16.6)], { prof: 'bevel', bw: .8, grp: 'posts', tex: q => (q.y % 5 === 0 ? -1 : 0) });
    part(F, 'wood', [RECT(1, 1.8, 15, 4.6)], { prof: 'bevel', bw: 1, grp: 'lintel' });
    return;
  }
  const arch = [[2.5, 16.5], [2.5, 7], [3.2, 4.4], [5.2, 2.4], [8, 1.6], [10.8, 2.4], [12.8, 4.4], [13.5, 7], [13.5, 16.5]];
  const hole = [[4.4, 16.5], [4.2, 7.2], [5, 5], [6.4, 3.9], [8, 3.5], [9.6, 3.9], [11, 5], [11.8, 7.2], [11.6, 16.5]];
  part(F, k === 'vault' ? 'bronze' : Pl.doorFrame, [P(arch)], { prof: 'bevel', bw: 1, grp: 'arch' });
  part(F, 'dark', [P(hole)], { prof: 'flat', grp: 'opening', lo: 0, hi: 1, tex: q => (q.y > 12 ? -1 : 0) });
  if (k === 'vault') part(F, 'blackiron', [P([[4.6, 16.4], [4.6, 7.4], [8, 3.9], [11.4, 7.4], [11.4, 16.4]])], { prof: 'bevel', bw: .8, grp: 'leaf', tex: q => (q.x === 8 ? -1.2 : q.y % 4 === 0 ? { m: 'bronze', dd: -.6 } : 0) });
  else part(F, Pl.curtain, [P([[4.4, 13.6], [4.4, 7.2], [6.4, 4.2], [9.6, 4.2], [11.6, 7.2], [11.6, 13.6], [9.2, 10.6], [8, 12.8], [6.8, 10.6]])], { prof: 'round', bw: .8, grp: 'curtain', tex: q => (q.x % 2 === 0 ? -.8 : 0) });
  part(F, Pl.stone, [RECT(3, 14.6, 13, 16.6)], { prof: 'bevel', bw: .6, grp: 'sill', hi: 3 });
}
/* ---- '^' layered cliffs and 'v' ledges ---- */
const SLIP_RIPPLES = [[2, 1.2, 0, .5, 1.3], [7.4, .9, 5, .4, 3.1], [12.7, 1.3, 10, .3, 4.7]]; // [y, amplitude, phase, 2nd amplitude, 2nd phase]
function sunCliff(F, Pl, v) {
  if (Pl.cliffK === 'slip') { // a dune's sunlit back, paler than the flats: its slip face is the south edge (paintEdge)
    F.add({ mat: Pl.cliff, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      for (const [c, a, p, b, s] of SLIP_RIPPLES) { // three wind ripples, each its own wave (period 16 both ways, so tiles join)
        const d = (((q.y + .5 - c - a * Math.sin(((q.x + .5 + p) / 16) * Math.PI * 2) - b * Math.sin(((q.x + .5) / 8) * Math.PI * 2 + s)) % 16) + 16) % 16;
        if (d < 1) return pnoise(q.x / 4, q.y / 4, 4, 160 + c, 4) > .3 ? .9 : .2;
        if (d < 2) return pnoise(q.x / 4, q.y / 4, 4, 170 + c, 4) > .22 ? -.9 : -.3;
      }
      return -.05 + pnoise(q.x / 8, q.y / 8, 2, 161 + v) * .3 + bayer(q.x, q.y) * .3;
    } });
    return;
  }
  // a rock wall of angular chunks (each lit on its top-left, a dark crack between them) over soft strata
  const S = facetSeeds(6, v, 95);
  F.add({ mat: Pl.cliff, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const f = facet(q.x, q.y, S);
    if (f.d2 - f.d1 < .85) return { m: Pl.cliffDark, dd: -1.3 };
    return -.9 - (f.dx + f.dy) * .17 + [.2, -.35, .15, -.5][((q.y + 1) >> 2) & 3] + (hash(f.i, v, 96) - .5) * .5 + bayer(q.x, q.y) * .2;
  } });
}
// periodic Voronoi facets (every seed wrapped at 16 px, so tiles join): nearest and second-nearest distance,
// the nearest seed's index and the offset from it
function facet(x, y, S) {
  let d1 = 99, d2 = 99, i1 = 0, dx = 0, dy = 0;
  for (let i = 0; i < S.length; i++) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
    const ex = x + .5 - S[i][0] - ox, ey = y + .5 - S[i][1] - oy, d = Math.hypot(ex, ey);
    if (d < d1) { d2 = d1; d1 = d; i1 = i; dx = ex; dy = ey; } else if (d < d2) d2 = d;
  }
  return { d1, d2, i: i1, dx, dy };
}
const facetSeeds = (n, v, s) => Array.from({ length: n }, (_, i) => [rnd(i, v, s) * 16, rnd(i, v, s + 1) * 16]);
function sunLedge(F, Pl, v) {
  const D = decals(); for (const [x, y] of spots(2, 5700 + v)) D.set(x, y, Pl.grass, -2);
  sunGround(F, Pl, D);
  F.add({ mat: Pl.cliff, prof: 'flat', grp: 'lipface', noShadow: true, noOutline: true, lo: 1, hi: 3, shapes: [RECT(-2, 11.5, 18, 15.5)], tex: q => (q.y <= 12 ? -.3 : q.y >= 15 ? -2.2 : -1.2) + ((q.x + v * 2) % 5 === 0 ? -.8 : 0) + bayer(q.x, q.y) * .3 });
  F.add({ mat: Pl.grass, prof: 'flat', grp: 'lip', noShadow: true, noOutline: true, lo: 1, hi: 3, shapes: [P([[-2, 10], [18, 10], [18, 11.6], [14, 12.4], [10, 11.7], [6, 12.5], [2, 11.8], [-2, 12.4]])], tex: q => (q.y <= 10 ? .2 : -.6) });
}
/* ---- 'k' cave floors (one seamless field, so a whole cave floor never shows the grid): packed grit with
   ore dust in the mine, glass grit in the crystal cave, cracked basalt in the vaults ---- */
function sunDarkFloor(F, Pl, v) {
  const D = decals(), k = Pl.decK, [x, y] = spots(1, 3150 + v, 4)[0];
  for (const [px, py] of spots(2, 3100 + v * 5)) pebble(D, px, py, Pl.stone);
  if (k === 'shaft') { if (v) D.set(x, y, 'amber', -1.4); if (v === 2) { D.set(x + 3, y + 1, 'amber', -1.8); for (let i = -2; i <= 2; i++) D.set(x + i, y + 4, 'dark', -1); } }
  else if (k === 'cave') { D.set(x, y, 'seaglass', -.6); D.set(x + 1, y + 1, 'seaglass', -1.6); if (v) D.set(x + 4, y - 2, 'seaglass', -1); }
  else if (v) for (let i = 0; i < 6; i++) D.set(x + i - 2, y + (i >> 1), 'dark', -1.2);
  ground(F, Pl.darkFloor, SEEDS['dark-floor'] + (Pl.seed || 0), D, { lo: -1.55, hi: -.65, dith: .3 });
}
/* ---- 'm' cracked clay, wet mud, ash drifts, mine slurry ---- */
function sunMud(F, Pl, v) {
  const k = Pl.mudK;
  if (k === 'wet' || k === 'slurry') return paintMud(F, Pl, v);
  if (k === 'ash') {
    sunGround(F, Pl, null);
    const heaps = v ? [[5, 7, 4.4, 3.2], [11.4, 11, 3.8, 2.8]] : [[8, 9, 5.6, 3.8], [3.4, 4, 2.4, 1.6]];
    heaps.forEach(([x, y, rx, ry], i) => part(F, Pl.mud, [E([x, y], rx, ry)], { prof: 'flat', grp: 'heap' + i, noShadow: true, noOutline: true, hi: 3, tex: q => { const d = Math.hypot((q.x + .5 - x) / rx, (q.y + .5 - y) / ry); return d > .8 && bayer(q.x, q.y) > .1 ? { m: Pl.grass, dd: gField(Pl)[(q.y & 15) * T + (q.x & 15)] } : -1.3 + (q.y + .5 < y - ry * .3 ? .6 : 0) - d * .4 + (rnd(q.x, q.y, 79 + i) < .06 ? { m: 'dark', dd: -1 } : 0); } }));
    return;
  }
  // cracked clay: periodic cells (every seed has its 8 wrapped copies), a dark crack where two cells meet
  const S = [[3, 4], [11, 3], [7, 10], [14, 12], [2, 13]].map(([x, y], i) => [x + (rnd(i, v, 71) - .5) * 3, y + (rnd(i, v, 72) - .5) * 3]);
  F.add({ mat: Pl.mud, prof: 'flat', grp: 'clay', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const { d1, d2, i: n1, dx, dy } = facet(q.x, q.y, S);
    if (d2 - d1 < .9) return { m: Pl.soilDark, dd: -1.9 };
    return -.9 - (dx + dy) * .09 + (hash(n1, v, 73) - .5) * .6 + bayer(q.x, q.y) * .25;
  } });
}
/* ---- 'f' glinting glass, sunstone veins, crystal glow, embers, wisp motes (2 frames) ---- */
function sunGlow(F, Pl, v, f) {
  const k = Pl.glowK, D = decals();
  if (k === 'wisp') for (const [x, y] of spots(4, 5900 + v)) tuft(D, x - 1, y - 1, Pl.blade);
  if (k === 'ember') for (const [x, y] of spots(5, 5920 + v)) D.set(x, y, 'dark', -1);
  sunGround(F, Pl, D);
  if (k === 'glint') {
    const sh = [[4, 5], [11, 8], [6, 12]].slice(0, 2 + v);
    part(F, Pl.glass, sh.map(([x, y], i) => P([[x - 1.1, y + 1], [x + (i & 1 ? .8 : -.4), y - 1.4], [x + 1.2, y + .9]])), { prof: 'bevel', bw: .8, grp: 'shards', hi: 4 });
    const [gx, gy] = sh[f % sh.length];
    part(F, 'radiant', [RECT(gx - .2, gy - 1.6, gx + .8, gy - .6)], { prof: 'flat', grp: 'spark', noShadow: true, noOutline: true, hi: 5, tex: () => 1 });
    return;
  }
  if (k === 'vein' || k === 'crystal') {
    const m = k === 'vein' ? 'amber' : Pl.glow;
    if (k === 'vein') part(F, 'dark', [C([1, 12], [8, 9], .7), C([8, 9], [15, 11], .6)], { prof: 'flat', grp: 'seam', noShadow: true, noOutline: true, hi: 1 });
    const X = [[4.6, 11.6, 2.8], [8.6, 9.4, 4], [12, 11.2, 2.6]].slice(0, 2 + v);
    part(F, k === 'vein' ? 'topaz' : Pl.glass, X.map(([x, y, h]) => P([[x - 1.3, y + 1.2], [x - .9, y - h + 1], [x, y - h], [x + .9, y - h + 1], [x + 1.3, y + 1.2]])), { prof: 'bevel', bw: .8, grp: 'xtals', hi: 5 });
    part(F, m, X.map(([x, y, h]) => C([x, y], [x, y - h + 1.4], .42)), { prof: 'flat', grp: 'glow', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? .7 : -.2) });
    return;
  }
  if (k === 'ember') {
    const coals = [[5, 10, 2.2], [10.6, 7.4, 2], [9.4, 12.4, 1.6]].slice(0, 2 + v);
    part(F, 'w.char', coals.map(([x, y, r]) => E([x, y], r, r * .75)), { bw: 1.2, grp: 'coals', hi: 3 });
    part(F, 'ember', coals.map(([x, y, r], i) => C([x - r * .5, y + (i & 1 ? -.2 : .2)], [x + r * .4, y - .2], .42)), { prof: 'flat', grp: 'glow', noShadow: true, noOutline: true, hi: 5, tex: q => (f ? ((q.x + q.y) % 3 ? .6 : -.4) : ((q.x + q.y) % 3 ? -.3 : .5)) });
    return;
  }
  const M = f ? [[4.4, 5.6], [11.4, 9.4], [7.4, 12.6]] : [[5.6, 4.4], [10.4, 10.6], [6.4, 11.4]]; // wisp motes drift
  part(F, 'w.mirage', M.slice(0, 2 + v).map(([x, y]) => O([x, y], .7)), { prof: 'flat', grp: 'motes', noShadow: true, noOutline: true, hi: 5, tex: () => .4 });
}
/* ---- 'r' rail track: 0 north-south, 1 east-west, curves 2 N-E, 3 E-S, 4 S-W, 5 W-N ---- */
const railLink = n => n === 'roots' || n === 'bridge' || n === 'stair';
function railPick(v, nb) {
  const [n, e, s, w] = nb.map(railLink), ns = n || s, ew = e || w;
  if (ns && !ew) return 0;
  if (ew && !ns) return 1;
  if (n && e && !s && !w) return 2;
  if (e && s && !n && !w) return 3;
  if (s && w && !n && !e) return 4;
  if (w && n && !s && !e) return 5;
  return ns ? 0 : 1;
}
function sunRails(F, Pl, shape) {
  sunGround(F, Pl, null);
  const bed = { prof: 'flat', grp: 'bed', noShadow: true, noOutline: true, hi: 3, tex: q => (rnd(q.x, q.y, 55) < .3 ? -1.4 : (q.x + q.y * 3) % 5 === 0 ? .2 : -.6) };
  if (shape < 2) {
    const tr = shape === 0 ? (a, b) => [a, b] : (a, b) => [b, a]; // tr(across, along)
    part(F, Pl.ballast, [P([tr(2.6, -2), tr(13.4, -2), tr(13.4, 18), tr(2.6, 18)])], bed);
    part(F, Pl.ties, [0, 1, 2, 3].map(i => { const c = i * 4 + 2; return P([tr(1.6, c - 1.05), tr(14.4, c - 1.05), tr(14.4, c + 1.05), tr(1.6, c + 1.05)]); }), { prof: 'bevel', bw: .6, grp: 'ties', hi: 3 });
    part(F, 'iron', [5, 11].map(a => P([tr(a - .55, -2), tr(a + .55, -2), tr(a + .55, 18), tr(a - .55, 18)])), { prof: 'bevel', bw: .5, grp: 'rails' });
    return;
  }
  const c = [[16, 0], [16, 16], [0, 16], [0, 0]][shape - 2], arc = (r, n = 8) => { const out = []; const a0 = Math.atan2(8 - c[1], 8 - c[0]); for (let i = 0; i <= n; i++) { const a = a0 - Math.PI / 4 + (Math.PI / 2) * i / n; out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return out; };
  const ring = (r0, r1) => { const A = arc(r1, 10), B = arc(r0, 10).reverse(); return P(A.concat(B)); };
  part(F, Pl.ballast, [ring(2.6, 13.4)], bed);
  const a0 = Math.atan2(8 - c[1], 8 - c[0]);
  part(F, Pl.ties, [-.62, -.2, .2, .62].map(t => { const a = a0 + t * 1.18, u = [Math.cos(a), Math.sin(a)], p = [-u[1], u[0]], m = (r, s) => [c[0] + u[0] * r + p[0] * s, c[1] + u[1] * r + p[1] * s]; return P([m(1.6, -1), m(14.4, -1.2), m(14.4, 1.2), m(1.6, 1)]); }), { prof: 'bevel', bw: .6, grp: 'ties', hi: 3 });
  part(F, 'iron', [ring(4.45, 5.55), ring(10.45, 11.55)], { prof: 'bevel', bw: .5, grp: 'rails' });
}
/* ---- 'Y' a rock mass (glass in the Glass Heart, masonry in the vaults); 'R' a tunnel or cave wall ---- */
function sunPillar(F, Pl, v) {
  const k = Pl.caveK;
  sunGround(F, Pl, null);
  if (k === 'glass') { part(F, Pl.glass, [P([[-1, 16.5], [-1, 6], [3, 1], [8, -1], [13.4, 1.6], [17, 6.4], [17, 16.5]])], { prof: 'bevel', bw: 2.6, grp: 'mass', hi: 5, tex: q => ((q.x + q.y + v) % 6 === 0 ? -.8 : 0) }); part(F, Pl.glow, [C([4, 12], [8, 4], .45)], { prof: 'flat', grp: 'vein', noShadow: true, noOutline: true, hi: 5, tex: () => -.6 }); return; }
  if (k === 'masonry') { part(F, Pl.wall, [RECT(-1, -1, 17, 17)], { prof: 'bevel', bw: 1.6, grp: 'block', tex: q => ((q.y & 7) === 0 || ((q.x + ((q.y >> 3) & 1 ? 4 : 0)) & 7) === 0 ? { m: 'dark', dd: -1.6 } : bayer(q.x, q.y) * .3 - .3) }); return; }
  const S = facetSeeds(5, v, 97);
  part(F, Pl.cliff, [E([8, 8.6], 8.6, 8.4), C([2, 14], [-2, 16.5], 3), C([14, 3], [18, 1], 3)], { bw: 3.4, grp: 'mass', tex: q => { const f = facet(q.x, q.y, S); return f.d2 - f.d1 < .8 ? -1.4 : -(f.dx + f.dy) * .12 + (hash(f.i, v, 98) - .5) * .5; } });
}
function sunCave(F, Pl, v, face) {
  const k = Pl.caveK, m = k === 'masonry' ? Pl.wall : Pl.cliff;
  if (!face) {
    F.add({ mat: Pl.rockTop || m, prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 2, shapes: [FULL], tex: q => -1.7 + pnoise(q.x / 8, q.y / 8, 2, 100 + v) * .9 + (rnd(q.x, q.y, 101 + v) < .05 ? -1 : 0) + bayer(q.x, q.y) * .35 });
    return;
  }
  if (k === 'masonry') return sunWall(F, Object.assign({}, Pl, { wallK: 'vault' }), v, true);
  F.add({ mat: m, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    if (q.y >= 14) return q.y === 14 ? .3 : -1.8;                                             // a lit lip, then the foot
    return -1.4 + pnoise(q.x / 2, q.y / 8, 8, 104 + v, 2) * 1.6 - (q.y < 3 ? .6 : 0) + bayer(q.x, q.y) * .3;
  } });
  if (k === 'glass') part(F, 'seaglass', [P([[2.4, 14], [4, 5 + v], [6.4, 13.6]]), P([[9, 14], [11.4, 3.6], [13.6, 14]])], { prof: 'bevel', bw: 1, grp: 'xtal', hi: 5 });
  else if (v === 1) { part(F, 'wood', [RECT(1.4, 0, 3.8, 14.4), RECT(12.2, 0, 14.6, 14.4)], { prof: 'bevel', bw: .8, grp: 'posts' }); part(F, 'wood', [RECT(-1, 1, 17, 3.6)], { prof: 'bevel', bw: 1, grp: 'cap' }); }
}
/* ---- '_' glazed tiles (planks and flagstones as in M3) ---- */
function sunFloor(F, Pl, v) {
  if (Pl.floorK !== 'tiles') return SPEC.floor.paint(F, Pl, v);
  F.add({ mat: Pl.tile, prof: 'flat', grp: 'tiles', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y, lx = x & 7, ly = y & 7, alt = ((x >> 3) + (y >> 3) + v) & 1, d = Math.abs(lx - 4) + Math.abs(ly - 4);
    if (lx === 0 || ly === 0) return { m: 'dark', dd: -1.2 };
    if (alt && d <= 2) return { m: Pl.ink, dd: d === 0 ? .2 : -.5 };
    if (!alt && (lx === ly || lx === 8 - ly)) return { m: 'w.terra', dd: -.7 };
    return -.5 + (lx === 1 || ly === 1 ? .5 : 0) + bayer(x, y) * .2;
  } });
}

const SUN_SPEC = {
  grass: { n: 4, paint: sunSand },
  flowers: { n: 3, paint: sunRidges },
  'tall-grass': { n: 2, paint: sunScrub, over: { n: 2, w: 16, h: 16, dx: 0, dy: 0, paint: sunScrubTops } },
  tree: { n: 2, paint: sunTreeBase, over: { n: 3, w: 24, h: 26, dx: -4, dy: -16, paint: sunTreeTop } },
  bush: { n: 2, paint: sunBush },
  rock: { n: 2, paint: sunRock },
  wall: { n: 2, faces: true, paint: (F, Pl, v) => sunWall(F, Pl, v >> 1, !(v & 1)) },
  roof: { n: 1, paint: paintRoofBase, roof: true, roofPaint: sunRoof },
  palisade: { n: 2, faces: true, paint: (F, Pl, v) => sunPalisade(F, Pl, v >> 1, !(v & 1)) },
  'torch-wall': { n: 1, anim: true, paint: sunTorch },
  cliff: { n: 2, paint: sunCliff },
  ledge: { n: 2, paint: sunLedge },
  door: { n: 1, paint: sunDoor },
  mud: { n: 2, paint: sunMud },
  fungus: { n: 2, anim: true, paint: sunGlow },
  roots: { n: 1, shapes: 6, pickV: railPick, paint: sunRails },
  'first-root': { n: 2, paint: sunPillar },
  'root-wall': { n: 2, faces: true, paint: (F, Pl, v) => sunCave(F, Pl, v >> 1, !(v & 1)) },
  floor: { n: 3, paint: sunFloor },
  'dark-floor': { n: 3, paint: sunDarkFloor },
  flagstone: { n: 3, paint: (F, Pl, v) => paintFlagstone(F, Object.assign({}, Pl, { stone: Pl.paver || Pl.stone }), v) },
};

/* =====================================================================
   The Ironspire Peaks (M5 spec §6.1): nine more biomes on the same tile characters, drawn to the map
   package's table (notes/M5-P2-maps.md; each map's header comment says the same).
   - An IRON_PAL row sits over IRON_BASE, and SUN_BASE under that, so a reused Sunscorch painter always finds
     its style keys. The materials are more 'w.' names in WMAT.
   - IRON_SPEC is SUN_SPEC with the Ironspire painters over it. A style key per character picks the look:
     groundK, scatK, tallK, patchK, roadK, flagK, tree, bushK, massK, rockK, wallK, roofK, fenceK, lampK, fordK,
     doorK, glowK, floorK, caveK, darkK, dropK.
   - Snow is bright with blue shadows, and walkable ground still keeps to steps 1-3 of its ramp.
   - 'm' is a snowdrift (the drift lock sits on these; 'i' draws one too) or cooled slag in the forge, and ':'
     is clear black ice on Frostmere. They meet the ground round them softly (edge families 'drift' and
     'patch'). The Thane's runner ('_' in the dwarf hall) has a straight gold border ('carpet'), and 'x' is a
     drop whose far wall shows as a rock or ice face ('drop').
   - '=' knows its way (pickV): wheel ruts or a trodden line run along it, so it reads as the road on turf,
     scree, snow and ice alike.
   ===================================================================== */
const IRON_BASE = {
  iron: 1, grass: 'w.snow', seed: 10, gLo: -.6, gHi: -.1, gDith: .18, blade: 'w.drygrass', clover: 'w.sage', snow: 'w.snow', bed: 'robeBark',
  soil: 'w.gravel', soilDark: 'w.earth', mud: 'w.snow', puddle: 'w.frostwater', stone: 'w.crag', wall: 'w.crag', cap: 'w.crag', cliff: 'w.crag', cliffDark: 'dark',
  stair: 'w.crag', doorFrame: 'w.crag', door: 'wood', water: 'w.frostwater', bank: 'w.crag', leaf: 'w.pine', leafDark: 'dark', trunk: 'bark', bush: 'w.pine',
  glass: 'w.glacier', glow: 'frost', roof: 'w.slate', roofEdge: 'w.slate', flowers: ['clothWhite', 'clothBlue', 'w.heather'], torch: 'ember', sconce: 'iron',
  palisade: 'w.timber', palisadeBand: 'iron', ichor: 'w.snow', ichorGlow: 'frost', darkFloor: 'w.crag', floor: 'wood', bridge: 'wood', rail: 'bogwood',
  ballast: 'w.crag', ties: 'wood', paver: 'w.scree', stoneDim: .35, rockTop: 'dark', curtain: 'w.army', stoneMoss: 'w.snow', patchMat: 'w.snow',
  groundK: 'snow', scatK: 'ripple', ridgeK: 'ripple', tallK: 'tussock', patchK: 'drift', roadK: 'ruts', flagK: 'flags', tree: 'pine', treeSnow: 1, bushK: 'juniper',
  massK: 'rock', rockK: 'snowcap', wallK: 'drystone', wallSnow: 1, roofK: 'slate', roofSnow: 1, fenceK: 'logs', lampK: 'lantern', fordK: null, cliffK: 'crag',
  cliffSnow: 1, doorK: 'wood', glowK: 'frost', floorK: 'planks', caveK: 'rock', darkK: 'rock', dropK: 'rock',
};
const IRON_PAL = {
  mountain: { grass: 'w.alpine', gLo: -1.5, gHi: -.55, gDith: .34, groundK: 'turf', scatK: 'scree', fenceK: 'chain', rail: 'string' },
  monastery: { seed: 12, blade: 'w.sage', scatK: 'beds', tallK: 'herb', bushK: 'herb', stone: 'w.limestone', wall: 'w.whitewash', cap: 'w.slate', stair: 'w.limestone',
    doorFrame: 'w.limestone', paver: 'w.limestone', stoneDim: 0, stoneMoss: null, bridge: 'w.limestone', rail: 'w.limestone', bank: 'w.limestone', bankK: 'stone', wallK: 'whitewash',
    roofSnow: 0, massK: 'pillar', glowK: 'candle', fenceK: 'wattle', palisade: 'wood' },
  scree: { grass: 'w.scree', seed: 14, gLo: -1.3, gHi: -.55, groundK: 'scree', scatK: 'stones', roadK: 'path', soil: 'w.earth', soilDark: 'w.scree', rockK: 'scree', wallSnow: 0 },
  'dwarf-hall': { grass: 'w.hewn', seed: 16, gLo: -1.5, gHi: -.85, gDith: .26, groundK: 'hewn', stone: 'w.hewn', wall: 'w.hewn', cap: 'w.hewn', stair: 'w.hewn',
    doorFrame: 'w.hewn', paver: 'w.hewn', stoneDim: 0, stoneMoss: null, floor: 'robeRed', darkFloor: 'w.hewn', bridge: 'w.hewn', rail: 'iron', bank: 'w.hewn', bankK: 'stone',
    scatK: 'chips', tree: 'column', bushK: 'barrels', massK: 'carved', rockK: 'rubble', wallK: 'dwarf', wallSnow: 0, roofK: 'slab', roof: 'w.hewn', roofEdge: 'iron',
    roofSnow: 0, fenceK: 'rail', palisade: 'iron', lampK: 'torch', doorK: 'dwarf', glowK: 'runestone', floorK: 'runner', cliffSnow: 0, treeSnow: 0, darkK: 'hewn' },
  forge: { grass: 'w.slag', seed: 18, gLo: -1.4, gHi: -.75, gDith: .3, groundK: 'slag', stone: 'w.slag', wall: 'w.brick', cap: 'w.brick', doorFrame: 'w.brick',
    paver: 'w.hewn', stoneDim: -.45, stoneMoss: null, floor: 'blackiron', darkFloor: 'w.slag', bridge: 'blackiron', rail: 'iron', bankK: 'stone', soil: 'w.char',
    soilDark: 'dark', ballast: 'w.slag', scatK: 'cinder', patchK: 'slag', patchMat: 'w.slag', tree: 'column', bushK: 'barrels', massK: 'anvil', rockK: 'slag',
    wallK: 'brick', wallSnow: 0, roofK: 'hood', roof: 'blackiron', roofEdge: 'iron', roofSnow: 0, fenceK: 'rail', palisade: 'iron', lampK: 'brazier', doorK: 'iron',
    glowK: 'coals', cliffSnow: 0, treeSnow: 0, darkK: 'soot', dropK: 'pit' },
  outpost: { seed: 20, groundK: 'trodden', scatK: 'gravel', wall: 'w.crag', cap: 'w.crag', wallK: 'ashlar', floor: 'w.timber', roofK: 'planks', roof: 'w.timber',
    roofEdge: 'bogwood', lampK: 'torch', doorK: 'plank', doorFrame: 'w.timber', bushK: 'crates', glowK: 'coals' },
  tundra: { seed: 22, tallK: 'reed', soil: 'w.packed', roadK: 'ruts', tree: 'bent', bushK: 'frozen', cliffIce: 1, wallK: 'cairn', bank: 'w.ice' },
  'frozen-lake': { seed: 24, scatK: 'cracks', tallK: 'reed', soil: 'w.grit', roadK: 'path', flagK: 'blackice', patchMat: 'w.blackice', bushK: 'frozen', rockK: 'iceblock',
    stone: 'granite', wall: 'granite', cap: 'granite', stair: 'granite', doorFrame: 'granite', wallK: 'ashlar', bank: 'w.snow', floes: 1, fordK: 'thin' },
  'ice-cave': { grass: 'w.cavice', seed: 26, gLo: -1.3, gHi: -.6, gDith: .28, groundK: 'cavice', blade: 'w.glacier', stone: 'granite', paver: 'w.crag', stoneDim: -.5, stoneMoss: 'w.ice',
    wall: 'granite', cap: 'granite', wallK: 'frozen', wallSnow: 0, cliff: 'w.glacier', stair: 'w.glacier', doorFrame: 'granite', darkFloor: 'w.cavice', floor: 'w.cavice',
    bridge: 'w.glacier', rail: 'w.glacier', bank: 'w.cavice', torch: 'frost', rockTop: 'w.cavice', scatK: 'frost', tallK: 'fern', tree: 'column', bushK: 'monk',
    massK: 'icepillar', rockK: 'ice', roofK: 'slab', roof: 'w.glacier', roofEdge: 'w.cavice', roofSnow: 0, fenceK: 'rail', palisade: 'w.glacier', lampK: 'crystal',
    fordK: 'thin', cliffSnow: 0, doorK: 'icearch', glowK: 'pocket', caveK: 'ice', darkK: 'ice', treeSnow: 0, dropK: 'ice' },
};
const IRON_BIOMES = new Set(Object.keys(IRON_PAL));

/* ---- '.' alpine turf with snow patches, snow, trodden snow, grey scree, hewn granite, slag, cave ice ---- */
// scree: one field of loose stones (the same in every variant, so the tiles meet stone to stone), each stone its own value
const SCREE = facetSeeds(9, 0, 120);
let SCREE_DD = null; // the field is fixed, so it is worked out once (256 values) and looked up after
const screeDD = (x, y) => {
  if (!SCREE_DD) {
    SCREE_DD = new Float64Array(T * T);
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) { const f = facet(i, j, SCREE); SCREE_DD[j * T + i] = f.d2 - f.d1 < .85 ? -1.95 : -.75 - (f.dx + f.dy) * .09 + (hash(f.i, 0, 121) - .5) * .8 + bayer(i, j) * .2; }
  }
  return SCREE_DD[(y & 15) * T + (x & 15)];
};
// the '.' value at a pixel (what edges copy so they meet the ground without a seam)
const groundAt = (Pl, x, y) => (Pl.groundK === 'scree' ? screeDD(x & 15, y & 15) : gField(Pl)[(y & 15) * T + (x & 15)]);
function ironGround(F, Pl, v, extra) {
  const D = decals(), g = Pl.grass, k = Pl.groundK, [x, y] = spots(1, 6300 + v, 4)[0];
  if (k === 'turf') {
    for (const [a, b] of spots(4 + (v & 1), 6100 + v * 7)) tuft(D, a - 1, b - 1, g);
    for (const [a, b] of spots(3, 6150 + v * 11)) D.set(a, b, g, -2);
    if (v === 1) for (const [a, b] of spots(2, 6250)) pebble(D, a, b, Pl.stone);
    if (v === 4) for (let b = -3; b <= 3; b++) for (let a = -5; a <= 5; a++) { // a patch of old snow lying in the grass
      const d = Math.min(Math.hypot(a / 3.4, b / 2.2), Math.hypot((a - 2.6) / 2.4, (b - 1) / 1.8), Math.hypot((a + 2.4) / 2, (b - .8) / 1.6));
      if (d < 1 && (d < .8 || (a + b) & 1)) D.set(x + a, y + b, Pl.snow, d > .8 ? -1.2 : b > .8 ? -.8 : -.3);
    }
    if (v === 3) for (const [a, b, d] of [[0, 0, -.4], [1, 0, -.6], [0, 1, -1.2], [1, 1, -1], [2, 1, -1.4]]) D.set(x + a, y + b, Pl.snow, d);
  } else if (k === 'snow' || k === 'trodden') {
    // wind-cut snow: short lit crests with a shadow under each; trodden snow has boot prints and grey trampled patches
    if (v === 1 || v === 3) { const [a, b] = spots(1, 6400 + v * 5, 3)[0]; for (let i = 0; i < 4; i++) D.set(a + i, b, g, i === 3 ? -.4 : 0); for (let i = 1; i < 5; i++) D.set(a + i, b + 1, g, -1.3); }
    if (v === 2) D.set(x, y, g, -1.6);
    if (k === 'trodden' && v & 1) for (let i = 0; i < 2; i++) { const px = x - 2 + i * 3, py = y - 1 + i * 3; D.set(px, py, g, -1.5); D.set(px, py + 1, g, -1.2); }
    if (v === 3) pebble(D, x, y, Pl.stone);
  } else if (k === 'cavice') {
    for (const [a, b] of spots(3, 6400 + v * 5, 3)) { D.set(a, b, Pl.snow, -.6); D.set(a + 1, b + 1, Pl.snow, -1.4); }
    for (const [a, b] of spots(2, 6450 + v)) D.set(a, b, g, -2);
  } else if (k === 'hewn') {
    for (const [a, b] of spots(4, 6600 + v * 3, 2)) { D.set(a, b, g, -1.8); D.set(a + 1, b + 1, g, -1.8); D.set(a + 1, b, g, -.1); }
    if (v === 2) for (let i = 0; i < 5; i++) D.set(x - 2 + i, y + (i >> 1), 'dark', -1);
  } else if (k === 'slag') {
    for (const [a, b] of spots(4, 6700 + v)) D.set(a, b, g, 0);
    for (const [a, b] of spots(3, 6750 + v)) D.set(a, b, 'dark', -1);
  } else if (k === 'scree' && v >= 2) tuft(D, x - 1, y - 1, Pl.blade);
  if (extra) extra(D);
  sunGround(F, Pl, D, Pl.groundK === 'scree' ? screeDD : null);
}
/* ---- ',' gravel and alpine flowers, herb-garden beds, loose stones, chips, cinders, gravel through snow, snow ripples, cracks in the snow, frost ---- */
function ironScatter(F, Pl, v) {
  const k = Pl.scatK, g = Pl.grass, S = spots(6, 6800 + v * 13, 2);
  if (k === 'ripple') return sunRidges(F, Pl, v);
  if (k === 'beds') return ironBed(F, Pl, v);
  ironGround(F, Pl, v & 1 ? 1 : 0, D => {
    if (k === 'heather') S.forEach(([x, y], i) => { if (i % 3 === 2) { pebble(D, x, y, Pl.stone); return; } const m = i % 3 ? 'w.heather' : 'clothWhite'; D.set(x, y, m, 0); D.set(x + 1, y, m, -.8); D.set(x, y + 1, g, -1.4); if (i === 1) { D.set(x + 3, y + 1, 'clothBlue', 0); D.set(x + 3, y + 2, g, -1.4); } });
    else if (k === 'scree') { // a carpet of grey gravel over the turf, the turf showing through (the same speckle along the tile's
      // edges in every variant, so a scree slope joins up), a clump of turf in each variant's middle, a few stones, and an
      // alpine flower in one variant
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const mid = Math.min(x, y, 15 - x, 15 - y) > 2, sd = mid ? 6874 + v * 3 : 6874;
        if (hash(x, y, sd) > .76 || (mid && pnoise(x / 4, y / 4, 4, 6873 + v * 5) > .64)) continue;
        const h = hash(x, y, sd + 1); D.set(x, y, 'w.scree', h < .22 ? .1 : h < .6 ? -.6 : -1.3);
      }
      S.slice(0, 3).forEach(([x, y]) => pebble(D, x, y, Pl.stone));
      if (v === 0) { const [x, y] = S[4]; D.set(x, y, 'w.heather', 0); D.set(x + 1, y, 'w.heather', -.8); D.set(x, y + 1, g, -1.4); }
    }
    else if (k === 'stones') S.slice(0, 4).forEach(([x, y], i) => { for (const [a, b, d] of [[0, 0, .1], [1, 0, -.2], [2, 0, -.5], [0, 1, -.4], [1, 1, -.7], [2, 1, -1.1], [3, 1, -1.9], [1, 2, -1.9], [2, 2, -1.9]]) D.set(x + a + (i & 1), y + b, Pl.stone, d); });
    else if (k === 'chips') S.forEach(([x, y], i) => (i & 1 ? pebble(D, x, y, Pl.stone) : D.set(x, y, g, .2)));
    else if (k === 'cinder') S.forEach(([x, y], i) => { D.set(x, y, i % 3 ? 'dark' : 'ember', i % 3 ? -1 : -1.5); if (!(i % 3)) D.set(x + 1, y, 'w.char', -1); });
    else if (k === 'gravel') { for (let b = -3; b <= 3; b++) for (let a = -4; a <= 4; a++) if (Math.hypot(a / 4.2, b / 2.6) < 1 && hash(a, b, 6850 + v) < .8) D.set(8 + a, 8 + b, Pl.soil, -.5 - hash(a, b, 6860) * 1.2); S.slice(0, 3).forEach(([x, y]) => pebble(D, x, y, Pl.stone)); }
    else if (k === 'cracks') { const pts = [[1, 3 + v], [6, 6], [9, 5 + (v & 1)], [14, 9]]; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; for (let t = 0; t <= 8; t++) { const px = a + (c - a) * t / 8, py = b + (d - b) * t / 8; D.set(px, py, 'w.ice', -1.6); D.set(px, py + 1, g, -.1); } } }
    else if (k === 'frost') S.slice(0, 4).forEach(([x, y], i) => { const m = Pl.snow; D.set(x, y, m, i & 1 ? -.3 : 0); D.set(x - 1, y, m, -1.2); D.set(x + 1, y, m, -1.2); D.set(x, y - 1, m, -1.2); D.set(x, y + 1, m, -1.2); });
  });
}
// ',' in the monastery garden: a tilled bed in rows, herb seedlings along the ridges (square-edged, as beds are)
function ironBed(F, Pl, v) {
  F.add({ mat: Pl.bed, prof: 'flat', grp: 'bed', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const r = (q.y + 1) & 3; if (r === 0 && (q.x + (q.y >> 2) * 3 + v) % 3 !== 0) return { m: Pl.blade, dd: (q.x & 1) ? -.2 : -1 }; return (r === 0 ? -.3 : r === 3 ? -2 : -1.1) + bayer(q.x, q.y) * .3; } });
}
/* ---- '"' tussock grass, herbs (on bed soil), frozen reeds, ice ferns: their tops drawn overhead ---- */
function ironTall(F, Pl, v) {
  if (Pl.tallK === 'herb') return ironBed(F, Pl, v + 1);
  ironGround(F, Pl, 0, D => {
    for (let k = 0; k < 14; k++) blade(D, Math.floor(rnd(k, 3, 70 + v) * 16), Math.floor(rnd(k, 4, 70 + v) * 14) + 1, Pl.blade);
    for (const [x, y] of spots(5, 6900 + v)) D.set(x, y, Pl.grass, -2);
  });
}
function ironTallTops(F, Pl, v) {
  const k = Pl.tallK, n = k === 'reed' ? 6 : 8, sh = [];
  for (let j = 0; j < n; j++) { const x = 1.5 + j * (15 / n) + (rnd(j, v, 5) - .5), top = (k === 'reed' ? 5 : 7) + rnd(j, 1 + v, 5) * 4, lean = k === 'tussock' ? (j % 2 ? 1.4 : -1.4) : 0; sh.push(P([[x - .75, 16.5], [x + lean + (j % 2 ? .9 : -.8), top], [x + .75, 16.5]])); }
  if (k === 'fern') { part(F, Pl.blade, sh, { prof: 'ridge', grp: 'tops', noOutline: true, hi: 5, tex: q => (q.y < 10 ? .4 : -.4) }); return; }
  F.add({ mat: k === 'herb' ? 'w.sage' : Pl.blade, prof: 'ridge', grp: 'tops', noOutline: true, lo: 1, hi: k === 'tussock' ? 4 : 3, shapes: sh, tex: q => (q.y < 10 ? (k === 'tussock' ? .7 : .2) : q.y > 13 ? -1.3 : -.5) });
  const tips = sh.map(s => s.pts[1]);
  if (k === 'herb') part(F, 'w.heather', tips.map(([x, y], i) => E([x, y + 1.4], .8, i % 3 ? 1.6 : 1)), { prof: 'flat', grp: 'bloom', noShadow: true, noOutline: true, hi: 4, tex: q => (q.y % 2 ? -.4 : .3) });
  else if (k === 'reed') { part(F, 'leather', tips.map(([x, y]) => E([x, y + 1.4], .8, 1.6)), { prof: 'round', bw: .6, grp: 'heads', noOutline: true }); part(F, Pl.snow, tips.map(([x, y]) => O([x, y + .2], .6)), { prof: 'flat', grp: 'caps', noShadow: true, noOutline: true, hi: 5, tex: () => 1 }); }
  else if (k === 'tussock') part(F, Pl.snow, [E([4, 16.4], 3, 1.2), E([12.4, 16.2], 2.6, 1)], { prof: 'flat', grp: 'snowfoot', noShadow: true, noOutline: true, hi: 3, tex: () => -.2 });
}
/* ---- 'm' a snowdrift (the drift lock's ground) or, in the forge, cooled slag; 'i' a drift too, spindrift blowing (2 frames) ---- */
const DRIFT_RIDGES = [[3.4, 1.6, 2, .6, 1.1], [9.2, 1.2, 7, .5, 2.9], [14.1, 1.4, 11, .4, 4.4]];
function ironDrift(F, Pl, v, f = -1) {
  if (Pl.patchK === 'slag' && f < 0) { // a black, glassy crust of slag run out and cooled, cracked across
    const S = facetSeeds(5, v, 130);
    F.add({ mat: Pl.patchMat, prof: 'flat', grp: 'slag', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const c = facet(q.x, q.y, S); if (c.d2 - c.d1 < .8) return { m: 'dark', dd: -1.2 }; return -.9 - (c.dx + c.dy) * .08 + (c.d1 < 1.6 ? .5 : 0) + bayer(q.x, q.y) * .2; } });
    return;
  }
  const m = Pl.snow;
  F.add({ mat: m, prof: 'flat', grp: 'drift', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    for (const [c, a, p, b, s] of DRIFT_RIDGES) {
      const d = (((q.y + .5 - c - a * Math.sin(((q.x + .5 + p) / 16) * Math.PI * 2) - b * Math.sin(((q.x + .5) / 8) * Math.PI * 2 + s)) % 16) + 16) % 16;
      if (d < 1) return 1.05;
      if (d < 2.4) return -1.5 + (d - 1) * .35;
    }
    return .05 + pnoise(q.x / 8, q.y / 8, 2, 140 + v) * .35 + bayer(q.x, q.y) * .25;
  } });
  if (f < 0) return;
  const sp = f ? [[2, 4], [9, 10], [12, 2]] : [[5, 6], [12, 12], [1, 13]];
  part(F, m, sp.map(([x, y]) => C([x + .5, y + .5], [x + 2.5 + v % 2, y + .5], .45)), { prof: 'flat', grp: 'spindrift', noShadow: true, noOutline: true, hi: 5, tex: () => 1.6 });
}
/* ---- '=' the road: wheel ruts (or a trodden line on a path) along its way: 0 north-south, 1 east-west, 2-5 the bends
   north-east, east-south, south-west, west-north (the ruts curve round them), 6 a junction ---- */
const roadLink = n => n === 'road' || n === 'bridge' || n === 'stair' || n === 'door' || n === 'flagstone';
function ironRoadPick(v, nb) {
  const [n, e, s, w] = nb.map(roadLink);
  const k = (n || s) && !e && !w ? 0 : (e || w) && !n && !s ? 1 : n + e + s + w !== 2 ? 6 : n && e ? 2 : e && s ? 3 : s && w ? 4 : 5;
  return k * 3 + v;
}
const BEND_AT = [[16, 0], [16, 16], [0, 16], [0, 0]];
function ironRoad(F, Pl, v) {
  const dir = Math.floor(v / 3), w = v % 3, path = Pl.roadK === 'path', D = decals();
  for (const [x, y] of spots(2 + w, 2000 + w * 7)) pebble(D, x, y, Pl.stone);
  for (const [x, y] of spots(4, 2100 + w * 5)) D.set(x, y, Pl.soilDark, -1.2);
  const rut = dir === 6 ? null : (x, y) => {
    if (dir > 1) { // a bend: the ruts (or the trodden line) are arcs round the inside corner
      const [cx, cy] = BEND_AT[dir - 2], d = Math.hypot(x + .5 - cx, y + .5 - cy);
      if (path) return Math.abs(d - 8) < 2 ? -1.3 + (Math.abs(d - 8) < 1 ? -.35 : 0) + bayer(x, y) * .2 : undefined;
      if (Math.abs(d - 4.5) < .62 || Math.abs(d - 11.5) < .62) return (Pl.rutDD ?? -1.95) + bayer(x, y) * .2;
      return Math.abs(d - 5.6) < .5 || Math.abs(d - 10.4) < .5 ? -.25 : undefined;
    }
    const a = dir === 0 ? x : y, b = dir === 0 ? y : x, j = hash(b >> 2, a > 7 ? 1 : 0, 150 + w) < .2 ? 1 : 0;
    if (path) return a >= 6 && a <= 9 ? -1.3 + (a === 7 || a === 8 ? -.35 : 0) + ((b + a) % 3 === 0 ? -.3 : 0) + bayer(x, y) * .2 : undefined;
    if (a === 4 + j || a === 11 - j) return (Pl.rutDD ?? -1.95) + bayer(x, y) * .2;
    return a === 5 + j || a === 10 - j ? -.25 : undefined;
  };
  ground(F, Pl.soil, SEEDS.road, D, { lo: -1.25, hi: -.55, dith: .22, fn: rut });
}
/* ---- ':' flagstones (snow in the joints outdoors); on Frostmere, clear black ice with white cracks and trapped bubbles ---- */
function ironFlags(F, Pl, v) {
  if (Pl.flagK !== 'blackice') return paintFlagstone(F, Object.assign({}, Pl, { stone: Pl.paver }), v);
  const D = decals();
  if (v === 1) for (const [[a, b], [c, d]] of [[[2, 5], [7, 7]], [[7, 7], [10, 12]], [[7, 7], [13, 4]]]) for (let t = 0; t <= 10; t++) D.set(a + (c - a) * t / 10, b + (d - b) * t / 10, 'w.ice', t % 5 ? -2.2 : -1.4);
  if (v === 2) for (const [x, y] of spots(3, 7700, 4)) { D.set(x, y, 'w.ice', -1.2); D.set(x + 1, y + 1, 'w.ice', -2.4); }
  ground(F, Pl.patchMat, 7710, D, { lo: -1.25, hi: -.6, dith: .12, fn: (x, y) => -1.05 + pnoise(x / 8, y / 8, 2, 7720 + (v & 1)) * .6 + bayer(x, y) * .12 });
}
/* ---- 'w' thin ice / broken floes over black water: a white crack web, the sheen shifting (2 frames) ---- */
function ironThin(F, Pl, v, f) {
  F.add({ mat: 'w.ice', prof: 'flat', grp: 'thin', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const s = ((q.x + q.y + (f ? 5 : 0) + 32) % 16); return -2.1 + (s < 3 ? .5 : 0) + pnoise(q.x / 4, q.y / 4, 4, 170 + v) * .6 + bayer(q.x, q.y) * .3; } });
  const web = v ? [[[2, 3], [7, 7]], [[7, 7], [13, 5]], [[7, 7], [8, 13]], [[8, 13], [3, 14]]] : [[[3, 12], [8, 8]], [[8, 8], [14, 11]], [[8, 8], [6, 2]], [[6, 2], [12, 3]]];
  part(F, Pl.snow, web.map(([a, b]) => C(a, b, .42)), { prof: 'flat', grp: 'web', noShadow: true, noOutline: true, hi: 3, tex: () => -.2 });
}
/* ---- 'T' snowy pines, frost-dead trees (a stone column where no tree grows) ---- */
const snowOn = (F, Pl, shapes, grp = 'snow') => part(F, Pl.snow, shapes, { prof: 'round', bw: .9, grp, hi: 5, tex: q => (q.y % 3 === 0 ? -.3 : .3) });
const shade = (Pl, x, y, rx, ry) => D => blot(D, Pl, x, y, rx, ry);
function ironTreeBase(F, Pl, v) {
  const t = Pl.tree;
  if (t === 'column') return sunTreeBase(F, Pl, v);
  ironGround(F, Pl, 0, shade(Pl, 8.6 + (v ? .6 : 0), 14.2, 6.6, 2.4));
  if (t === 'pine') part(F, Pl.trunk, [C([8, 15.4], [8, -2], 1.6, 1.1)], { bw: 1.2, grp: 'trunk', tex: q => (q.y % 3 === 0 ? -1 : 0) });
  else part(F, 'bogwood', [C([8, 15], [9.4, -2], 1.8, 1.2), C([8, 14.6], [4.4, 15.8], 1, .5), C([8, 14.6], [11.8, 15.6], 1, .5)], { bw: 1.2, grp: 'trunk', tex: q => (q.x % 3 === 0 ? -1 : 0) });
}
// the overhead part, 24 x 26 drawn at (-4, -16): the tree tile's column is x = 12 here, its top row y = 16
function ironTreeTop(F, Pl, v) {
  const t = Pl.tree;
  if (t === 'column') return sunTreeTop(F, Pl, v);
  if (t === 'pine') { // four tiers of boughs, snow along the top of each
    const cx = 12 + (v === 1 ? -.6 : v === 2 ? .6 : 0), base = 26.5, H = 24.5 + (v === 2 ? .8 : 0), sh = [];
    part(F, Pl.trunk, [C([12, 28], [cx, base - 4], 1.4, 1.1)], { bw: 1, grp: 'trunk' });
    for (let i = 0; i < 4; i++) { const u = i / 4, y0 = base - u * H * .82, w = 9.6 - u * 6.4, top = y0 - H * .42; sh.push(P([[cx - w, y0], [cx - w * .5, y0 - 1.6], [cx + (i % 2 ? .4 : -.4), top], [cx + w * .5, y0 - 1.4], [cx + w, y0], [cx + w * .3, y0 + 1.2], [cx - w * .3, y0 + 1.1]])); }
    part(F, Pl.leaf, sh.slice().reverse(), { prof: 'round', bw: 2.2, grp: 'boughs', tex: q => (((q.x * 3 + q.y * 5) % 7) === 0 ? -1 : 0) + (q.y % 5 === 0 ? -.4 : 0) });
    if (Pl.treeSnow) snowOn(F, Pl, sh.map((p, i) => { const [[x0, y0], , [xt, yt], , [x1]] = p.pts; return P([[x0 + 1.4, y0 - .6], [xt, yt + .4], [x1 - 1.4, y0 - .6], [xt + 1, yt + 3.4 + i * .3], [xt - 1.2, yt + 3.2]]); }));
    return;
  }
  // frost-dead: bare, bent east by the wind, rime and snow along every branch
  const br = [[[12, 28], [13.4, 12]], [[13, 18], [20, 12]], [[13.2, 15], [21, 9.4]], [[13.4, 12], [19.4, 4.6]], [[12.6, 20], [7.4, 16]], [[16, 13.6], [22.4, 14.4]]];
  br.forEach(([a, b], k) => part(F, 'bogwood', [C(a, [b[0] + (v === 1 ? -1 : 0) * (k ? 1 : 0), b[1] + (v === 2 ? 1 : 0)], k ? .85 : 1.7, k ? .45 : 1.3)], { bw: .8, grp: 'br' + k }));
  snowOn(F, Pl, br.slice(1).map(([a, b]) => C([a[0], a[1] - 1], [b[0], b[1] - 1], .5)), 'snowline');
}
/* ---- 't' junipers, herb bushes, barrels, crates, frozen shrubs, a monk frozen in the ice ---- */
function ironBush(F, Pl, v) {
  const k = Pl.bushK;
  ironGround(F, Pl, 0, shade(Pl, 8.5, 13.8, 6.4, 2.2));
  if (k === 'juniper' || k === 'herb') {
    const m = k === 'herb' ? 'w.sage' : Pl.bush;
    part(F, m, [[[5, 10.6, 4], [11, 10.4, 4.2], [8, 7.4, 4]], [[4.6, 11, 3.8], [11.4, 11, 3.6], [8.2, 7.8, 4.2]]][v].map(([x, y, r]) => O([x, y], r)), { bw: 3, grp: 'bush', tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? -1 : 0) + (k === 'herb' && (q.x * 5 + q.y * 3) % 11 === 0 ? { m: 'w.heather', dd: .2 } : 0) });
    if (k === 'juniper' && Pl.treeSnow) snowOn(F, Pl, [E([7.6, 4.8], 3, 1.2), E([12.4, 7.6], 2, .9)]);
  } else if (k === 'barrels' || k === 'crates') { // iron-bound barrels and a crate (snow on them outdoors)
    part(F, 'wood', [RECT(1.4, 6.4, 9.6, 14.8)], { prof: 'bevel', bw: 1, grp: 'crate', tex: q => (q.y === 10 || q.x === 5 ? -1 : 0) });
    part(F, 'wood', [RECT(9.4, v ? 3.4 : 7.2, 14.8, 15)], { bw: 2, grp: 'barrel', tex: q => (q.y % 4 === 0 ? { m: 'iron', dd: 0 } : q.x === 11 ? -.8 : 0) });
    if (v) part(F, 'wood', [RECT(3, 1.6, 8.6, 6.8)], { prof: 'bevel', bw: .8, grp: 'crate2', tex: q => (q.x === 5 ? -1 : 0) });
    if (k === 'crates') snowOn(F, Pl, [RECT(1.6, v ? 1.2 : 5.6, 9.4, v ? 2.6 : 7), E([12.1, v ? 3.4 : 7.2], 2.6, .9)]);
  } else if (k === 'frozen') { // a bare shrub under rime
    part(F, 'bogwood', [[8, 14, 3, 4], [8, 14, 7, 5.6], [8, 14, 12.4, 5], [8, 14, 13.6, 9.6], [8, 14, 2.4, 9], [6, 9, 4.4, 6.4], [10.4, 8.6, 11, 6]].map(([a, b, c, d]) => C([a, b], [c, d], .7, .4)), { bw: .6, grp: 'twigs' });
    snowOn(F, Pl, [E([8, 13.4], 5.4, 1.6), O([7, 5.6], .9), O([12.4, 5.2], .8), O([3, 9], .8)]);
  } else if (k === 'monk') { // a monk frozen upright in a block of ice
    part(F, 'w.habit', [P([[5.4, 14.6], [6, 7], [8, 4.6], [10, 7], [10.6, 14.6]]), O([8, 4.8], 1.9)], { bw: 1.2, grp: 'monk', tex: q => (q.y > 12 ? -.6 : 0) });
    part(F, Pl.glass, [P([[2.6, 15], [3, 3.4], [6.4, .8], [11.6, 1.4], [13.4, 4.4], [13.4, 15]])], { prof: 'flat', grp: 'block', noShadow: true, hi: 5, tex: q => ((q.x + q.y) % 5 === 0 ? .3 : q.x > 5 && q.x < 11 && q.y > 2 ? { m: 'w.habit', dd: -.8 } : -.6) });
  }
}
/* ---- 'Y' rock masses, cloister columns, carved dwarf columns, anvils on iron plinths, ice columns ---- */
function ironMass(F, Pl, v) {
  const k = Pl.massK;
  ironGround(F, Pl, 0, null);
  if (k === 'rock') {
    const S = facetSeeds(5, v, 97);
    part(F, Pl.cliff, [E([8, 8.6], 8.6, 8.4), C([2, 14], [-2, 16.5], 3), C([14, 3], [18, 1], 3)], { bw: 3.4, grp: 'mass', tex: q => { const f = facet(q.x, q.y, S); return f.d2 - f.d1 < .8 ? -1.4 : -(f.dx + f.dy) * .12 + (hash(f.i, v, 98) - .5) * .5; } });
    if (Pl.cliffSnow) snowOn(F, Pl, [E([6.6, 2.6], 4.6, 1.6), E([12, 4.2], 2.4, 1)]);
    return;
  }
  if (k === 'pillar' || k === 'carved') { // a round column on a square base; its upper shaft and capital are the overhead part
    part(F, Pl.stone, [RECT(3.2, 12.4, 12.8, 15.8)], { prof: 'bevel', bw: .9, grp: 'base' });
    part(F, Pl.stone, [RECT(4.8, -6, 11.2, 13)], { bw: 2.4, grp: 'shaft', tex: colTex });
    if (k === 'carved') part(F, 'iron', [RECT(4.6, 10.4, 11.4, 11.6)], { prof: 'bevel', bw: .5, grp: 'bands', noShadow: true });
    return;
  }
  if (k === 'icepillar') { part(F, Pl.glass, [P([[4, 15.6], [5.2, 10], [5.4, -6], [10.6, -6], [10.8, 10], [12, 15.6]])], { prof: 'bevel', bw: 2, grp: 'col', hi: 5, tex: q => (q.x === 7 ? .5 : q.x === 10 ? -.6 : 0) }); return; }
  if (k === 'anvil') { // an anvil on a squat iron plinth (reads as an iron pillar from above)
    part(F, 'blackiron', [RECT(4.2, 8.6, 11.8, 15.6)], { prof: 'bevel', bw: 1, grp: 'plinth', tex: q => (q.y % 3 === 0 ? -.6 : 0) });
    part(F, 'iron', [P([[.8, 3.4], [12, 3.4], [15, 4.4], [12.4, 6.2], [10.2, 6.4], [10.6, 9], [5.4, 9], [5.8, 6.4], [3, 5.8]])], { prof: 'bevel', bw: 1, grp: 'anvil' });
  }
}
// a column's flutes: the same in its base tile and its overhead part, so the two meet without a seam
const colTex = q => (q.x === 7 ? .4 : q.x === 10 ? -.6 : 0);
// the overhead part of a column, 16 x 26 drawn at (0, -16): its capital a tile up, the shaft down into its own tile
function ironMassTop(F, Pl, v) {
  const k = Pl.massK;
  if (k === 'pillar' || k === 'carved') {
    part(F, Pl.stone, [RECT(4.8, 5, 11.2, 30)], { bw: 2.4, grp: 'shaft', tex: colTex });
    part(F, Pl.stone, [RECT(3.4, 2.6, 12.6, 5.8)], { prof: 'bevel', bw: 1, grp: 'capital' });
    part(F, Pl.stone, [RECT(2.4, .6, 13.6, 3)], { prof: 'bevel', bw: .8, grp: 'abacus' });
    if (k === 'carved') { part(F, 'iron', [RECT(4.6, 7.4, 11.4, 8.6), RECT(4.6, 19.4, 11.4, 20.6)], { prof: 'bevel', bw: .5, grp: 'bands', noShadow: true }); part(F, 'amber', runeShapes(8, 14, v, .42), { prof: 'flat', grp: 'rune', noShadow: true, noOutline: true, hi: 4, tex: () => -1.1 }); }
  } else if (k === 'icepillar') { // the ice column widens into the cave roof
    part(F, Pl.glass, [P([[5.2, 30], [5.4, 12], [3.6, 5], [2, 0], [14, 0], [12.4, 5], [10.6, 12], [10.8, 30]])], { prof: 'bevel', bw: 2, grp: 'col', hi: 5, tex: q => (q.x === 7 ? .5 : q.x === 10 ? -.6 : 0) + (q.y < 5 ? -.4 : 0) });
    part(F, 'frost', [C([8, 24], [7.6, 9 + v], .45)], { prof: 'flat', grp: 'core', noShadow: true, noOutline: true, hi: 5, tex: () => -.8 });
  }
}
// a dwarf rune: a stave with two or three strokes off it (iron-filled grooves, or glowing)
function runeShapes(cx, cy, v, s = 1) {
  const r = (a, b) => C([cx + a[0] * s, cy + a[1] * s], [cx + b[0] * s, cy + b[1] * s], Math.max(.42, .55 * s));
  return [[r([0, -4.5], [0, 4.5]), r([0, -1.5], [3, -4]), r([0, 1], [-3, 3.4])], [r([-1.5, -4.5], [-1.5, 4.5]), r([-1.5, -2], [2.5, 0]), r([2.5, 0], [-1.5, 2.5])], [r([0, -4.5], [0, 4.5]), r([-3, -3], [3, 3]), r([3, -3], [-3, 3])]][v % 3];
}
/* ---- 'o' snow-capped boulders, scree boulders, rubble, slag heaps with ore, heaved ice blocks, ice boulders ---- */
function ironRock(F, Pl, v) {
  const k = Pl.rockK;
  ironGround(F, Pl, 0, shade(Pl, 8.6, 13.6, 6.6, 2.3));
  if (k === 'rubble') {
    [[1.6, 9, 8.4, 14.8], [7.6, 8.6, 14.6, 14.6], [4.6, 4.2, 11.4, 9.6]].forEach(([a, b, c, d], i) => part(F, Pl.stone, [RECT(a, b + (v && i === 2 ? .8 : 0), c, d)], { prof: 'bevel', bw: 1.2, grp: 'blk' + i, tex: q => (rnd(q.x >> 1, q.y >> 1, 20 + i) < .12 ? -1 : 0) }));
    return;
  }
  if (k === 'slag') { // glassy lumps of slag, a vein of ore in one
    part(F, Pl.stone, (v ? [[5.4, 10.6, 4.2, 3.6], [11, 11.4, 3.6, 3], [8.6, 6.6, 3.2, 2.8]] : [[7.6, 9.6, 5.6, 4.6], [12.4, 12.4, 2.4, 2]]).map(([x, y, rx, ry]) => E([x, y], rx, ry)), { bw: 2.6, grp: 'slag', tex: q => ((q.x * 5 + q.y * 3) % 11 === 0 ? { m: 'w.char', dd: 0 } : 0) });
    part(F, 'amber', (v ? [[4.4, 10], [9, 6.2]] : [[6, 9], [8.4, 11]]).map(([x, y]) => O([x, y], .55)), { prof: 'flat', grp: 'ore', noShadow: true, hi: 4, tex: () => -1 });
    return;
  }
  if (k === 'iceblock') { // slabs of lake ice heaved up, snow in their lee
    part(F, Pl.glass, [P([[1, 15], [2.4, 6], [7.4, 2.4 + v], [9, 15]]), P([[7.6, 15.4], [9.6, 4.6], [14.6, 7.4 - v], [15.2, 15.4]])], { prof: 'bevel', bw: 1.8, grp: 'slabs', hi: 5, tex: q => ((q.x - q.y + 16) % 7 === 0 ? .6 : 0) });
    snowOn(F, Pl, [E([4.4, 14.2], 3.6, 1.2), E([12, 14.6], 3, 1)]);
    return;
  }
  if (k === 'ice') { part(F, Pl.glass, [P([[2.6, 14.2], [3.6, 8], [7, 3.4 + v], [11.6, 4.4], [14, 9], [13.6, 14.2], [8, 15.2]])], { prof: 'bevel', bw: 2.2, grp: 'lump', hi: 5 }); part(F, 'frost', [C([6, 11], [8, 6.6], .4)], { prof: 'flat', grp: 'core', noShadow: true, noOutline: true, hi: 5, tex: () => -1 }); return; }
  const pts = k === 'scree' ? [[[2.4, 14], [3, 8.4], [6.6, 4.4], [12.4, 5.6], [14.2, 10], [12.4, 14.6]], [[1.8, 13.4], [4.4, 6.4], [9, 3.6], [13.4, 6.8], [14.2, 13.6], [8, 15]]][v % 2]
    : [[[2.4, 13.6], [3.2, 7], [6.6, 3.6], [11.4, 3.8], [14, 7.4], [14, 13.6], [8.4, 15]], [[2, 13.8], [2.6, 8.6], [5.4, 4.4], [10.6, 3.2], [13.8, 6], [14.6, 13.2], [9, 15]]][v % 2];
  const S = facetSeeds(4, v, 124);
  part(F, Pl.stone, [P(pts)], { bw: 3.2, grp: 'rock', tex: k === 'scree' ? q => { const f = facet(q.x, q.y, S); return f.d2 - f.d1 < .7 ? -1.2 : -(f.dx + f.dy) * .1; } : q => (((q.y + (q.x >> 3) + v) % 3) === 0 ? -.9 : 0) + bayer(q.x, q.y) * .25 });
  if (k === 'snowcap') snowOn(F, Pl, [P(v ? [[3.4, 7.6], [5.6, 4.4], [10.6, 3.4], [13.6, 6.2], [11, 7.2], [7.4, 6.6], [5, 8.4]] : [[3.6, 6.8], [6.6, 3.6], [11.4, 3.8], [13.6, 6.8], [10.6, 6.2], [7, 7.4]])]);
}
/* ---- '#' drystone, whitewash under slate, dwarf blocks with an iron band, furnace brick, coursed stone, cairn stones, frozen masonry ---- */
function ironWall(F, Pl, v, face) {
  const k = Pl.wallK, w = Pl.wall, cap = Pl.cap;
  if (k === 'ashlar' || k === 'frozen' || k === 'dwarf' && !face) sunWall(F, Pl, v, face);
  else if (k === 'drystone' || k === 'cairn') { // unshaped stones fitted dry (rounder in a cairn wall), dark gaps between
    const S = facetSeeds(k === 'cairn' ? 5 : 6, v, 126 + (face ? 0 : 3));
    F.add({ mat: w, prof: 'flat', grp: face ? 'face' : 'top', noShadow: true, lo: 1, hi: face ? 4 : 3, shapes: [FULL], tex: q => {
      if (face && q.y < 3) return { m: cap, dd: q.y === 0 ? .6 : q.y === 2 ? -1.6 : 0 };
      const f = facet(q.x, q.y, S), gap = k === 'cairn' ? 1.4 : .9;
      return f.d2 - f.d1 < gap ? { m: 'dark', dd: -1.6 } : -.5 - (f.dx + f.dy) * (k === 'cairn' ? .16 : .1) + (hash(f.i, v, 127) - .5) * .7 + (face && q.y === 15 ? -.8 : 0) - (face ? 0 : .5);
    } });
  } else if (k === 'whitewash') { // lime-washed stone, a stone plinth at the foot, flaking in places; slate coping
    F.add({ mat: w, prof: 'flat', grp: face ? 'face' : 'top', noShadow: true, lo: 1, hi: face ? 4 : 3, shapes: [FULL], tex: q => {
      if (!face) return { m: cap, dd: -.6 + ((q.y & 3) === 0 ? -.9 : 0) + bayer(q.x, q.y) * .2 };
      if (q.y < 3) return { m: cap, dd: q.y === 0 ? .5 : q.y === 2 ? -1.6 : -.2 };
      if (q.y >= 13) return { m: Pl.stone, dd: q.y === 13 ? -1.4 : q.y === 15 ? -1 : -.4 + ((q.x + v * 3) % 6 === 0 ? -1 : 0) };
      return -.55 + (q.y === 3 ? -.8 : q.y === 8 && (q.x + v * 5) % 16 < 9 ? -.35 : 0) + pnoise(q.x / 2, q.y / 8, 8, 211, 2) * .35 + bayer(q.x, q.y) * .15;
    } });
  } else if (k === 'dwarf') { // dressed granite: an iron band with rivets under the coping, two courses of big blocks, a rune cut in some
    F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y;
      if (y < 3) return { m: cap, dd: y === 0 ? .7 : y === 2 ? -1.6 : -.1 };
      if (y < 5) return { m: 'iron', dd: y === 3 ? .1 : -1.1 };
      const r = y < 10 ? 0 : 1, ly = y - (r ? 10 : 5), lx = (x + ((r + v) & 1 ? 8 : 0)) & 15;
      if (ly === 0 || lx === 0) return { m: 'dark', dd: -1.7 };
      return -.4 + (ly === 1 ? .5 : 0) + (lx === 1 ? .3 : 0) + (lx === 15 ? -.7 : 0) + (y === 15 ? -.7 : 0) + (rnd(x, y, 41) < .06 ? -.8 : 0);
    } });
    part(F, 'steel', [O([3.5, 3.8], .6), O([11.5, 3.8], .6)], { prof: 'round', bw: .5, grp: 'rivets', noShadow: true });
    if (v) part(F, 'iron', runeShapes(8, 10.5, v + 1, .7), { prof: 'round', bw: .4, grp: 'rune', noShadow: true });
  } else if (k === 'brick') { // furnace brick, soot-black toward the top
    F.add({ mat: w, prof: 'flat', grp: face ? 'face' : 'top', noShadow: true, lo: 1, hi: face ? 4 : 3, shapes: [FULL], tex: q => {
      if (face && q.y < 3) return { m: 'w.char', dd: q.y === 0 ? .4 : q.y === 2 ? -1.4 : -.3 };
      const d = brickTex(q);
      return typeof d === 'object' ? d : d - (face ? (q.y < 7 ? .6 : 0) : .6) + (face && q.y === 15 ? -.6 : 0);
    } });
  }
  if (k === 'frozen') { // glazed with ice, icicles hanging from the coping
    if (face) { part(F, 'w.ice', [C([3, 4], [2.6, 12], .8), C([10, 3.6], [10.6, 9], .7)], { prof: 'flat', grp: 'glaze', noShadow: true, noOutline: true, hi: 4, tex: () => -.6 }); part(F, 'w.glacier', [[2.6, 6 + v], [7, 4.6], [12.4, 5.4 - v]].map(([x, b]) => P([[x - 1, 2.6], [x + 1, 2.6], [x, b]])), { prof: 'bevel', bw: .5, grp: 'icicles', hi: 5 }); }
    else part(F, Pl.snow, [E([5, 6], 3, 1.6), E([11, 11], 2.6, 1.4)], { prof: 'flat', grp: 'frost', noShadow: true, noOutline: true, hi: 3, tex: () => -.8 });
    return;
  }
  if (!Pl.wallSnow) return;
  if (face) part(F, Pl.snow, [P([[-1, -1], [17, -1], [17, 2.2], [13, 2.8 + (v & 1) * .6], [9.4, 2.2], [5.6, 3], [2, 2.4], [-1, 2.8]])], { prof: 'flat', grp: 'snowcap', noShadow: true, hi: 5, tex: q => (q.y === 0 ? .9 : q.y >= 2 ? -.6 : .4) });
  else part(F, Pl.snow, [E([4 + v * 2, 5], 4.4, 2.8), E([11.4, 10.6 - v], 4.2, 2.6), E([3, 13.4], 2.4, 1.6)], { prof: 'round', bw: 1, grp: 'snowtop', hi: 5, tex: q => (q.y % 4 === 0 ? -.3 : .2) });
}
const brickTex = q => ((q.y & 1) === 0 || ((q.x + ((q.y >> 1) & 1) * 2) & 3) === 0 ? { m: 'dark', dd: -1.4 } : (q.y < 6 ? -.8 : 0) + (rnd(q.x >> 2, q.y >> 1, 190) < .15 ? -.6 : 0));
/* ---- 'H' slate (snow along its courses in the peaks), snowed plank roofs with icicles, riveted furnace hoods, stone slabs ---- */
function ironRoof(F, Pl, v, mask) {
  const k = Pl.roofK, e = Pl.roofEdge;
  if (k === 'slab') return sunRoof(F, Pl, v, mask);
  const S = Pl.roofSnow;
  F.add({ mat: Pl.roof, prof: 'flat', grp: 'roof', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y;
    if (k === 'planks') { // snow heaped on the boards; the plank ends show at the eave, icicles under it
      if (mask & 4 && y >= 12) { if (y === 15) return x % 3 === 1 ? { m: 'w.ice', dd: .2 } : { m: 'dark', dd: -2 }; return (x % 4 === 0 ? -1.6 : y === 12 ? .2 : -.5) + bayer(x, y) * .2; }
      if (mask & 8 && x <= 1 || mask & 2 && x >= 14) return { m: e, dd: x === 0 || x === 15 ? -.3 : -1 };
      return { m: Pl.snow, dd: (mask & 1 && y <= 1 ? .5 : 0) - .15 + pnoise(x / 4, y / 4, 4, 180 + v) * .5 + (y === 11 && mask & 4 ? -1.2 : 0) + bayer(x, y) * .25 };
    }
    if (mask & 4 && y >= 13) return { m: e, dd: y === 13 ? .3 : y === 15 ? -1.6 : -.5 };
    if (mask & 1 && y <= 2) return S ? { m: Pl.snow, dd: y === 2 ? -.8 : .5 } : { m: e, dd: y === 0 ? .6 : y === 2 ? -1.3 : 0 };
    if (mask & 8 && x <= 1) return { m: e, dd: x === 0 ? .3 : -.7 };
    if (mask & 2 && x >= 14) return { m: e, dd: x === 15 ? -1.5 : -.7 };
    if (k === 'hood') return ((x & 7) === 0 ? -1.4 : (x & 7) === 1 ? .5 : -.3) + ((y & 7) === 3 && (x & 3) === 2 ? { m: 'steel', dd: 0 } : 0) + (y < 5 ? -.7 : 0) + (rnd(x >> 1, y >> 1, 220 + v) < .1 ? -.6 : 0);
    // slate: small staggered slates, snow lying along each course
    const r = Math.floor(y / 3), ly = y % 3, lx = (x + (r & 1) * 2) & 3;
    if (S && ly === 0 && (x + r) % 5 !== 0) return { m: Pl.snow, dd: -.2 };
    if (lx === 0) return -1.8;
    return (ly === 0 ? .6 : ly === 1 ? -.1 : -.9) + (rnd(x >> 2, r, 7 + v) < .12 ? -.5 : 0);
  } });
}
/* ---- '|' chain rails (the Iron Stair), a snowy timber stockade, iron railings, wattle ---- */
// 0 an east-west run (or a lone post), 1 inside a north-south run, 2 the north end of one
function fencePick(v, nb) { const f = n => n === 'palisade', ns = f(nb[0]) || f(nb[2]); return (ns && !(f(nb[1]) || f(nb[3])) ? (f(nb[0]) ? 1 : 2) : 0) * 2 + v; }
function ironFence(F, Pl, v) {
  const k = Pl.fenceK, dir = v >> 1, w = v & 1, ns = dir > 0;
  if (k === 'logs') { sunPalisade(F, Pl, w, dir !== 1); if (dir !== 1) snowOn(F, Pl, [0, 1, 2, 3].map(j => { const x = j * 4 + 2, t = 1 + ((j + w) % 2) * 1.3; return P([[x - 1.7, t + 2.6], [x, t - .2], [x + 1.7, t + 2.6], [x, t + 3.4]]); })); return; }
  ironGround(F, Pl, 0, null);
  if (k === 'chain') { // iron posts, the chain swagged between them
    part(F, 'blackiron', [RECT(6.6, 4.4, 9.4, 15.4), E([8, 4.4], 1.8, 1.1)], { prof: 'bevel', bw: .8, grp: 'post' });
    const links = [];
    if (ns) for (let j = 0; j < 7; j++) { const y = j * 2.4 - 1; links.push(j % 2 ? E([8, y], .7, 1.2) : E([8, y], 1.1, .7)); }
    else for (let j = 0; j < 7; j++) { const x = j * 2.6 - .4, y = 5.2 + (1 - Math.cos(((x - 8) / 8) * Math.PI)) * 1.6; links.push(j % 2 ? E([x, y], 1.3, .7) : E([x, y], .8, 1.1)); }
    part(F, 'iron', links, { prof: 'round', bw: .5, grp: 'links', cuts: links.map(l => E(l.c, l.rx * .45, l.ry * .45)) });
    return;
  }
  if (k === 'rail') { // posts and two bars
    if (ns) { part(F, Pl.palisade, [C([8, -1], [8, 17], .6)], { bw: .5, grp: 'bar' }); part(F, Pl.palisade, [RECT(6.6, 5, 9.4, 14.6)], { prof: 'bevel', bw: .7, grp: 'post' }); return; }
    part(F, Pl.palisade, [RECT(2.2, 5, 4.2, 15), RECT(10.2, 5, 12.2, 15)], { prof: 'bevel', bw: .6, grp: 'posts' });
    part(F, Pl.palisade, [C([-1, 6.4], [17, 6.4], .55), C([-1, 11], [17, 11], .55)], { bw: .5, grp: 'bars' });
    return;
  }
  // wattle: stakes with withies woven between
  part(F, Pl.palisade, [2, 8, 14].map(x => RECT(x - .8, 3.6, x + .8, 15.4)), { prof: 'round', bw: .6, grp: 'stakes' });
  part(F, 'thorn', [6, 8.4, 10.8, 13.2].map(y => C([-1, y], [17, y + (w ? .3 : -.3)], 1.1)), { prof: 'round', bw: .8, grp: 'weave', tex: q => (((q.x >> 1) + Math.floor(q.y / 2.4)) & 1 ? -.9 : 0) });
}
/* ---- '*' wall lamps, wall torches, braziers, glowing crystals ---- */
function ironTorch(F, Pl, v, f) {
  ironWall(F, Pl, 0, true);
  if (Pl.lampK === 'lantern') {
    part(F, 'iron', [C([8, 2.6], [8, 4.8], .5), C([5.2, 3], [10.8, 3], .45)], { bw: .6, grp: 'bracket' });
    part(F, Pl.sconce, [RECT(5.8, 4.6, 10.2, 11.4), P([[5.2, 5], [8, 3.4], [10.8, 5]]), RECT(6.6, 11.2, 9.4, 12.4)], { prof: 'bevel', bw: .8, grp: 'lantern' });
    part(F, Pl.torch, [RECT(6.8, 6, 9.2, 10.4)], { prof: 'flat', grp: 'glass', noShadow: true, hi: 5, tex: q => (q.y > 8 ? .8 : .2) + (f ? .3 : -.1) });
    part(F, Pl.sconce, [C([8, 5.8], [8, 10.6], .4)], { prof: 'flat', grp: 'mullion', noShadow: true, hi: 3, tex: () => -1 });
    return;
  }
  if (Pl.lampK !== 'torch') return lampOn(F, Pl, f);
  F.add({ mat: Pl.torch, prof: 'flat', grp: 'warm', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [E([8, 6], 5.4, 5)], tex: q => (bayer(q.x, q.y) + (Math.hypot(q.x - 7.5, q.y - 6) / 5.4) * .9 > .55 ? -9 : -2.4 + (f ? .3 : 0)) });
  part(F, Pl.sconce, [RECT(6, 9.5, 10, 11.4), C([8, 11.4], [8, 13.6], .8)], { bw: .8, grp: 'sconce' });
  part(F, 'wood', [C([8, 6.5], [8, 9.8], .9)], { bw: .6, grp: 'brand' });
  part(F, Pl.torch, [P(f ? [[8.3, .6], [10.2, 3.6], [10, 6.4], [8, 7.4], [6, 6.4], [6.2, 4]] : [[7.4, .4], [9.8, 3.4], [10, 6.4], [8, 7.4], [6, 6.2], [6, 3.2]])], { bw: 1.6, grp: 'flame', noShadow: true, glow: true, hi: 5, tex: q => (q.y > 4 ? .9 : .1) + (f ? .3 : 0) });
}
/* ---- '+' planked doors (round-headed in stone, square in timber), dwarf portals, iron doors, ice arches ---- */
function ironDoor(F, Pl, v) {
  const k = Pl.doorK;
  ironWall(F, Pl, v, true);
  if (k === 'dwarf') { // a square portal under a rune lintel, two iron-bound leaves
    part(F, Pl.doorFrame, [RECT(1.2, 2.4, 14.8, 17)], { prof: 'bevel', bw: 1.2, grp: 'portal' });
    part(F, 'blackiron', [RECT(3.2, 5.6, 7.9, 16.6), RECT(8.1, 5.6, 12.8, 16.6)], { prof: 'bevel', bw: .7, grp: 'leaves', tex: q => (q.y % 4 === 1 ? { m: 'iron', dd: .2 } : 0) });
    part(F, 'iron', [RECT(2.6, 3, 13.4, 5.4)], { prof: 'bevel', bw: .6, grp: 'lintel' });
    part(F, 'amber', [C([6, 4.2], [10, 4.2], .35), C([8, 3.4], [8, 5], .35)], { prof: 'flat', grp: 'runes', noShadow: true, noOutline: true, hi: 4, tex: () => -1 });
    part(F, 'steel', [O([7, 11], .55), O([9, 11], .55)], { prof: 'round', bw: .4, grp: 'rings', noShadow: true });
    return;
  }
  if (k === 'icearch') {
    part(F, Pl.glass, [P([[1.4, 16.6], [1.6, 6], [4, 2.4], [8, 1.2], [12, 2.4], [14.4, 6], [14.6, 16.6]])], { prof: 'bevel', bw: 1.6, grp: 'arch', hi: 5 });
    part(F, 'dark', [P([[4.2, 16.6], [4.2, 8], [6, 5.4], [8, 4.8], [10, 5.4], [11.8, 8], [11.8, 16.6]])], { prof: 'flat', grp: 'opening', lo: 0, hi: 1, tex: q => (q.y > 12 ? -1 : 0) });
    return;
  }
  const round = k === 'wood', frame = round ? [[2.5, 16.6], [2.5, 7], [4.2, 3.6], [8, 2.2], [11.8, 3.6], [13.5, 7], [13.5, 16.6]] : [[2.2, 16.6], [2.2, 3.2], [13.8, 3.2], [13.8, 16.6]];
  const leaf = round ? [[4.4, 16.6], [4.4, 7.4], [5.6, 5.2], [8, 4.4], [10.4, 5.2], [11.6, 7.4], [11.6, 16.6]] : [[4, 16.6], [4, 5], [12, 5], [12, 16.6]];
  part(F, k === 'iron' ? 'w.char' : Pl.doorFrame, [P(frame)], { prof: 'bevel', bw: 1, grp: 'frame' });
  part(F, k === 'iron' ? 'blackiron' : Pl.door, [P(leaf)], { prof: 'bevel', bw: .8, grp: 'leaf', tex: k === 'iron' ? q => (q.y % 5 === 0 ? { m: 'iron', dd: 0 } : 0) : q => ((q.x - 4) % 3 === 0 ? -1.1 : 0) });
  part(F, 'iron', k === 'iron' ? [O([10.4, 11], .8)] : [C([4.4, 8], [9, 8], .45), C([4.4, 13.6], [9, 13.6], .45), O([10.4, 11.4], .7)], { prof: 'round', bw: .4, grp: 'fittings', noShadow: true });
}
/* ---- '^' granite crags, snow on their ledges; ice-crusted on the Frost Road ---- */
function ironCliff(F, Pl, v) {
  sunCliff(F, Pl, v);
  if (Pl.cliffIce) part(F, 'w.ice', [C([3 + v, 1.6], [2, 9], .9), C([11, 6], [12.4, 13.4], .8)], { prof: 'flat', grp: 'glaze', noShadow: true, noOutline: true, hi: 4, tex: q => (q.x % 2 ? -.2 : -.8) });
  if (Pl.cliffSnow) snowOn(F, Pl, [C([2.6 + v, 4.4], [7.4 + v, 4], .75), C([9, 10.6 - v], [13.4, 10.2 - v], .7)], 'ledges');
}
/* ---- 'R' raw rock, and walls of blue ice: striated, icicles hanging from the top ---- */
function ironCave(F, Pl, v, face) {
  if (Pl.caveK !== 'ice' && !face) return sunCave(F, Pl, v, face);
  if (Pl.caveK !== 'ice') { // raw rock: angular faces lit from the top-left, a lit lip at the foot
    const S = facetSeeds(6, v, 240);
    F.add({ mat: Pl.cliff, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => { if (q.y >= 14) return q.y === 14 ? .3 : -1.8; const c = facet(q.x, q.y, S); return c.d2 - c.d1 < .85 ? { m: 'dark', dd: -1.4 } : -.8 - (c.dx + c.dy) * .15 + (hash(c.i, v, 241) - .5) * .5 - (q.y < 3 ? .6 : 0) + bayer(q.x, q.y) * .2; } });
    return;
  }
  if (!face) { F.add({ mat: Pl.rockTop, prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 2, shapes: [FULL], tex: q => -1.6 + pnoise(q.x / 8, q.y / 8, 2, 190 + v) * .9 + (rnd(q.x, q.y, 191 + v) < .05 ? .8 : 0) + bayer(q.x, q.y) * .35 }); return; }
  F.add({ mat: Pl.cliff, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => (q.y >= 14 ? (q.y === 14 ? .6 : -1.6) : -1.4 + pnoise(q.x / 2, q.y / 8, 8, 192 + v, 2) * 1.6 - (q.y < 3 ? .8 : 0) + bayer(q.x, q.y) * .3) });
  part(F, 'w.ice', [[2.4, 5 + v], [6.2, 3.4], [9.6, 6 - v], [13.2, 4.2]].map(([x, b]) => P([[x - 1, -1], [x + 1, -1], [x, b]])), { prof: 'bevel', bw: .6, grp: 'icicles', hi: 5 });
}
/* ---- '_' planks; the Thane's runner (its gold border is the 'carpet' edge) ---- */
function ironFloor(F, Pl, v) {
  if (Pl.floorK !== 'runner') return SPEC.floor.paint(F, Pl, v);
  F.add({ mat: Pl.floor, prof: 'flat', grp: 'runner', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const d = Math.abs(((q.x + 16) % 8) - 3.5) + Math.abs(((q.y + 16) % 8) - 3.5); return d < 1.2 ? { m: 'gold', dd: -1.5 } : d > 5.6 ? -1.6 : -.7 + (q.y & 1 ? -.2 : 0) + bayer(q.x, q.y) * .2; } });
}
/* ---- 'k' soot-black floor, the ice floor under Frostmere, rock and hewn stone ---- */
function ironDarkFloor(F, Pl, v) {
  const D = decals(), k = Pl.darkK, [x, y] = spots(1, 3150 + v, 4)[0];
  if (k !== 'ice') for (const [px, py] of spots(2, 3100 + v * 5)) pebble(D, px, py, Pl.stone);
  if (k === 'ice') { // dark blue ice: a few frost specks, a pale hairline crack
    for (const [a, b] of spots(2, 3160 + v)) { D.set(a, b, Pl.snow, -1); D.set(a + 1, b + 1, Pl.snow, -1.8); }
    if (v === 1) for (let i = 0; i < 6; i++) D.set(x - 3 + i, y + Math.round(Math.sin(i + v) * 1.1), 'w.ice', -.9);
  } else if (k === 'soot') { for (const [a, b] of spots(4, 3170 + v)) D.set(a, b, 'dark', -1); if (v === 2) { D.set(x, y, 'ember', -1.8); D.set(x + 1, y, 'w.char', -.8); } }
  else if (v) for (let i = 0; i < 6; i++) D.set(x + i - 2, y + (i >> 1), 'dark', -1.2);
  ground(F, Pl.darkFloor, SEEDS['dark-floor'] + (Pl.seed || 0), D, { lo: -1.55, hi: -.65, dith: .3 });
}
/* ---- 'f' (2 frames) glitter on snow, votive candles, glowing rune-stones, warm coals, air pockets under the ice ---- */
function ironGlow(F, Pl, v, f) {
  const k = Pl.glowK;
  if (k === 'coals') return sunGlow(F, Object.assign({}, Pl, { glowK: 'ember' }), v, f);
  ironGround(F, Pl, v & 1, null);
  if (k === 'frost') { // points of light that trade places
    const S = spots(4, 7600 + v, 3);
    part(F, Pl.snow, S.map(([x, y], i) => ((i + f) % 2 ? C([x - 1, y + .5], [x + 2, y + .5], .45) : O([x + .5, y + .5], .5))).concat(S.filter((s, i) => (i + f) % 2).map(([x, y]) => C([x + .5, y - 1], [x + .5, y + 2], .45))), { prof: 'flat', grp: 'glitter', noShadow: true, noOutline: true, hi: 5, tex: () => 2 });
  } else if (k === 'candle') { // votive candles set on the ground
    const C3 = [[4, 11], [9, 9], [12, 12]].slice(0, 2 + (v & 1));
    part(F, 'clothWhite', C3.map(([x, y]) => RECT(x - .8, y - 2.6, x + .8, y + .4)), { prof: 'round', bw: .6, grp: 'wax' });
    part(F, 'ember', C3.map(([x, y], i) => P((i + f) % 2 ? [[x, y - 5.4], [x + .9, y - 3.2], [x, y - 2.6], [x - .9, y - 3.2]] : [[x + .4, y - 5], [x + 1, y - 3.2], [x, y - 2.6], [x - .8, y - 3.4]])), { prof: 'round', bw: .6, grp: 'flames', noShadow: true, hi: 5, tex: q => (q.y % 2 ? .6 : 0) });
  } else if (k === 'runestone') { // a flat stone set in the floor, its rune filled with light that breathes
    part(F, Pl.stone, [P([[2.4, 12.6], [2, 4.4], [5, 2], [11.4, 2.2], [14, 5], [13.6, 12.4], [10, 14.2], [5.6, 14]])], { prof: 'bevel', bw: 1, grp: 'slab', hi: 3 });
    part(F, 'amber', runeShapes(8, 8, v, .95), { prof: 'flat', grp: 'rune', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? .2 : -.6) });
  } else if (k === 'pocket') { // air caught under the ice, lit from within
    const B = [[5, 6, 2.2], [10.6, 10.4, 1.6], [4.4, 12, 1.1]].slice(0, 2 + (v & 1));
    part(F, 'w.ice', B.map(([x, y, r]) => O([x, y], r + .9)), { prof: 'flat', grp: 'rim', noShadow: true, noOutline: true, hi: 3, tex: () => -.8 });
    part(F, 'frost', B.map(([x, y, r], i) => O([x, y], r * ((i + f) % 2 ? 1 : .8))), { prof: 'flat', grp: 'light', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? 0 : -.5) });
  }
}
/* ---- '~' tarns, the font, quench channels, open water with floes drifting on the lake; 'w' fords, thin ice ---- */
function ironWater(F, Pl, v, f) {
  paintWater(F, Pl, v, f, false);
  if (Pl.floes && v < 2) { const [x, y] = spots(1, 7400 + v, 4)[0], fx = Math.min(x, 9) + (f ? .6 : 0); part(F, Pl.snow, [E([fx, y], 2.2, 1.2), O([fx + 3.4, y + 2.6], .9)], { prof: 'round', bw: .8, grp: 'floe', hi: 4 }); }
}
function ironFord(F, Pl, v, f) { if (Pl.fordK === 'thin') return ironThin(F, Pl, v, f); paintWater(F, Pl, v, f, true); }

const IRON_SPEC = Object.assign({}, SUN_SPEC, {
  grass: { n: 5, paint: ironGround },
  flowers: { n: 3, paint: ironScatter },
  'tall-grass': { n: 2, paint: ironTall, over: { n: 2, w: 16, h: 16, dx: 0, dy: 0, paint: ironTallTops } },
  road: { n: 3, shapes: 7, pickV: ironRoadPick, paint: ironRoad },
  flagstone: { n: 3, paint: ironFlags },
  mud: { n: 2, paint: (F, Pl, v) => ironDrift(F, Pl, v) },
  ichor: { n: 2, anim: true, paint: (F, Pl, v, f) => ironDrift(F, Object.assign({}, Pl, { patchK: 'drift' }), v, f) },
  tree: { n: 2, paint: ironTreeBase, over: { n: 3, w: 24, h: 26, dx: -4, dy: -16, paint: ironTreeTop } },
  bush: { n: 2, paint: ironBush },
  rock: { n: 2, paint: ironRock },
  'first-root': { n: 2, paint: ironMass, over: { n: 1, w: 16, h: 26, dx: 0, dy: -16, paint: ironMassTop } },
  wall: { n: 2, faces: true, paint: (F, Pl, v) => ironWall(F, Pl, v >> 1, !(v & 1)) },
  roof: { n: 1, paint: paintRoofBase, roof: true, roofPaint: ironRoof },
  palisade: { n: 2, shapes: 3, pickV: fencePick, paint: ironFence },
  'torch-wall': { n: 1, anim: true, paint: ironTorch },
  water: { n: 4, anim: true, paint: ironWater },
  ford: { n: 2, anim: true, paint: ironFord },
  cliff: { n: 2, paint: ironCliff },
  door: { n: 1, paint: ironDoor },
  fungus: { n: 2, anim: true, paint: ironGlow },
  'root-wall': { n: 2, faces: true, paint: (F, Pl, v) => ironCave(F, Pl, v >> 1, !(v & 1)) },
  floor: { n: 3, paint: ironFloor },
  'dark-floor': { n: 3, paint: ironDarkFloor },
  void: { n: 1, paint: paintVoid },
});
// which tiles meet which softly in an Ironspire place (cell() reads these instead of EDGED there)
const IRON_COVER = id => famOf(id) === 'wall' || famOf(id) === 'water' || id === 'cliff';
const IRON_EDGED = Object.assign({}, EDGED, {
  mud: { same: id => id === 'mud' || IRON_COVER(id) },
  ichor: { same: id => id === 'ichor' || IRON_COVER(id) },
  flagstone: { same: id => id === 'flagstone' || IRON_COVER(id) },
  floor: { same: id => id === 'floor' || famOf(id) === 'wall' },
  void: { same: id => IRON_COVER(id) },
  // the mountain's scree (',') thins into turf, not into a road, a drift or the dark, which draw their own edges
  flowers: { same: id => id === 'flowers' || id === 'road' || id === 'bridge' || id === 'mud' || id === 'ichor' || id === 'void' || IRON_COVER(id) },
});
// the edge families an Ironspire palette bakes, over the usual ones
const ironEdgeFams = Pl => Object.assign({ ichor: 'drift', void: 'drop' }, Pl.patchK === 'drift' ? { mud: 'drift' } : { mud: 'patch' },
  Pl.flagK === 'blackice' ? { flagstone: 'patch' } : {}, Pl.floorK === 'runner' ? { floor: 'carpet' } : {}, Pl.scatK === 'scree' ? { flowers: 'scree' } : {});

/* =====================================================================
   The Gloomfen Marsh (M6 spec §6.1): ten more biomes on the same tile characters, drawn to the map package's
   table (notes/M6-P2-maps.md; each map's header comment says the same). The Murkway keeps M3's `fen`.
   - A GLOOM_PAL row sits over GLOOM_BASE, with IRON_BASE and SUN_BASE under that, so a reused Ironspire or
     Sunscorch painter always finds its style keys. The materials are more 'w.' names in WMAT.
   - GLOOM_SPEC is IRON_SPEC with the Gloomfen painters over it. A style key per character picks the look:
     groundK, scatK, tallK, patchK, roadK, flagK, floorK, waterK, fordK, tree, bushK, rockK, wallK, roofK, fenceK,
     lampK, doorK, massK, glowK, cliffK, darkK, voidK, rootK, bridgeK.
   - Black water, reeds, willows, lanterns, rot and fog, and still the road reads as road: '=' knows its way
     (pickV, as in M5): a trodden line or ruts in the earth, a worn line along the causeway's crown.
   - The things that stand on something ('t', 'o', '*' as a lantern post or a brazier, '|', 'T', 'Y') pick what they
     stand on from their open neighbours (standOn): the ground, planks, the water (a ring where it laps them), stone
     or the road. So a crate on a plank street stands on planks, a snag in the channel stands in the water, and a
     stump on the bank on the bank.
   - Plank ways over the water (each palette's `decks`, and the duckboards) stop at the water with a dark joint and,
     to the south, their side-beam ('deck' edges); the water draws no bank toward them, nor toward anything solid
     standing in it or at its edge (a pile, a snag, a wall, a tree). The bog ('m') is lapped by the ground round it
     ('patch'); in the bog it is black peat with tussocks, elsewhere wet mud, silt or soft grey mud.
   ===================================================================== */
const GLOOM_BASE = {
  gloom: 1, iron: 0, treeSnow: 0, wallSnow: 0, roofSnow: 0, cliffSnow: 0, cliffIce: 0, floes: 0, snow: 'clothWhite',
  grass: 'w.sedge', seed: 30, gLo: -1.6, gHi: -.45, gDith: .34, blade: 'w.reed', clover: 'w.fenmoss', moss: 'w.fenmoss',
  soil: 'w.loam', soilDark: 'w.mudtrack', mud: 'w.peat', bed: 'w.loam', puddle: 'w.blackwater', water: 'w.blackwater', bank: 'w.peat', bankK: null,
  stone: 'w.fenstone', wall: 'w.daub', cap: 'w.daub', cliff: 'w.peat', cliffDark: 'dark', stair: 'w.fenstone', doorFrame: 'bogwood', door: 'bogwood',
  leaf: 'w.willow', leafDark: 'seaweed', trunk: 'bark', bush: 'w.fenmoss', flowers: ['gold', 'clothWhite', 'w.cattail'],
  torch: 'amber', sconce: 'iron', palisade: 'bogwood', palisadeBand: 'string', floor: 'w.boards', flagMat: 'w.tarboards', bridge: 'bogwood',
  rail: 'bogwood', darkFloor: 'w.peat', glass: 'w.openwater', glow: 'w.marshlight', roof: 'w.thatch', roofEdge: 'w.thatch', curtain: 'leather',
  paver: 'w.fenstone', stoneMoss: 'w.fenmoss', stoneDim: 0, ichor: 'w.peat', ichorGlow: 'w.marshlight', patchMat: 'w.mudtrack',
  ballast: 'w.peat', ties: 'bogwood', rockTop: 'dark', lip: 'bogwood', decks: ['floor'], stilts: 0, roadPaved: 0, // stilts: Bogmire's and the boardwalk's
  groundK: 'fen', scatK: 'sedge', tallK: 'reed', patchK: 'mud', roadK: 'path', flagK: 'flags', floorK: 'planks', waterK: 'black',
  fordK: 'shallows', tree: 'willow', bushK: 'scrub', rockK: 'mossy', wallK: 'daub', roofK: 'thatch', fenceK: 'wattle',
  lampK: 'post', doorK: 'plank', massK: 'column', glowK: 'fireflies', cliffK: 'bank', darkK: 'earth', voidK: 'deep', rootK: 'roots', bridgeK: 'rails',
};
const GLOOM_PAL = {
  // Willowmurk: moss and clover under the great willows, trodden paths, wattle-and-daub huts under reed thatch, plank walks
  'willow-village': { grass: 'w.fenmoss', seed: 32, gLo: -1.45, gHi: -.35, groundK: 'turf', clover: 'w.willow', scatK: 'marigold', bushK: 'racks', doorK: 'wicker',
    rootK: 'willow', lilies: 1 },
  // Rotbridge and the Blackwater Reach: sedge banks, bank gravel, the black channel, a rutted road, the old bridge's stone and timber
  channel: { seed: 34, scatK: 'shingle', roadK: 'ruts', flagK: 'quay', tree: 'alder', bushK: 'scrubnets', rockK: 'snag', wallK: 'rough', wall: 'w.fenstone',
    cap: 'w.fenstone', roofK: 'slate', roof: 'w.slate', roofEdge: 'w.slate', fenceK: 'parapet', glowK: 'marshlight' },
  // Bogmire: plank streets on piles over black water, tarred decks, board huts under patched roofs, lanterns on poles, rope bridges
  'stilt-town': { seed: 36, decks: ['floor', 'flagstone'], stilts: 1, groundK: 'trodden', scatK: 'pots', roadK: 'ruts', flagK: 'tar', tree: 'dead',
    bushK: 'crates', rockK: 'pile', wallK: 'boards', wall: 'w.boards', cap: 'w.tarred', roofK: 'patched', roof: 'bogwood', roofEdge: 'w.tarred',
    fenceK: 'rail', voidK: 'gap', gapMat: 'w.boards', rail: 'leather' },
  // the Lanternfen: sphagnum and bog cotton, black pools with lights over them, dead trees, gorse, a path of trodden peat
  bog: { grass: 'w.bogmoss', seed: 38, gLo: -1.6, gHi: -.45, groundK: 'bog', scatK: 'cotton', tallK: 'rush', patchK: 'bog', patchMat: 'w.peat', tree: 'dead', bushK: 'gorse',
    rockK: 'stump', wallK: 'boards', wall: 'w.boards', cap: 'w.tarred', rootK: 'bogoak', bridgeK: 'duck', bridge: 'w.wreck', lilies: 1, waterLights: 1, decks: [] },
  // the Mother's Hollow: leaf-litter under black willows weeping into black water, a sunken stone house with every lamp lit
  'drowned-grove': { grass: 'w.peat', seed: 40, gLo: -1.25, gHi: -.2, groundK: 'litter', scatK: 'leaves', tallK: 'rush', tree: 'blackwillow', bushK: 'brush',
    rockK: 'stump', wallK: 'ruin', wall: 'w.ruin', cap: 'w.ruin', roofK: 'broken', roof: 'w.slate', roofEdge: 'w.slate', lampK: 'window', fordK: 'dark',
    bridgeK: 'duck', bridge: 'bogwood', rootK: 'willow', patchMat: 'w.peat', lilies: 1 },
  // the Long Boardwalk: the boardwalk on its stilts with rails over open water, reed islets, piles, barge-planks, the stone quay
  boardwalk: { seed: 42, stilts: 1, water: 'w.openwater', puddle: 'w.openwater', waterK: 'open', tree: 'dead', bushK: 'netscrates', rockK: 'pile',
    wallK: 'boards', wall: 'w.boards', cap: 'w.tarred', roofK: 'shingle', roof: 'bogwood', roofEdge: 'bogwood', flagK: 'quay', floorK: 'barge', voidK: 'gap', gapMat: 'bogwood' },
  // the Misthollow Ruins: old paving, flooded streets, canals, pale ruined masonry and columns, the salvage camp's decks and scaffolding
  'sunken-city': { grass: 'w.silt', seed: 44, gLo: -1.5, gHi: -.5, groundK: 'city', scatK: 'rubble', patchK: 'silt', patchMat: 'w.silt', patchRim: -.6, flagK: 'cobbles', paver: 'w.ruin',
    stone: 'w.ruin', wall: 'w.ruin', cap: 'w.ruin', wallK: 'ruin', roofK: 'broken', roof: 'w.slate', roofEdge: 'w.slate', doorK: 'arch', doorFrame: 'w.ruin',
    stair: 'w.ruin', fordK: 'flooded', water: 'w.canal', puddle: 'w.canal', waterK: 'open', bankK: 'stone', bank: 'w.ruin', tree: 'drowned', bushK: 'crates',
    rockK: 'rubble', fenceK: 'scaffold', lampK: 'brazier', roadPaved: 1 },
  // the Drowned Belfry: dark flagstones, green water, pillars, the choir-stalls, green lamps, the dark under the floor
  belfry: { grass: 'w.ruin', seed: 46, gLo: -1.9, gHi: -1.05, gDith: .3, groundK: 'wet', darkK: 'wetstone', darkFloor: 'w.ruin', paver: 'w.ruin', stone: 'w.ruin',
    wall: 'w.ruin', cap: 'w.ruin', wallK: 'belfry', water: 'w.greenwater', puddle: 'w.greenwater', waterK: 'green', fordK: 'flooded', bank: 'w.ruin', bankK: 'stone',
    glowK: 'waterlight', glow: 'w.waterlight', lampK: 'green', torch: 'w.waterlight', bushK: 'stalls', rockK: 'rubble', massK: 'pillar', floor: 'bogwood',
    stair: 'w.ruin', doorK: 'arch', doorFrame: 'w.ruin', voidK: 'dark', decks: [], roadPaved: 1 },
  // the Tidal Flats: wet silt, shells and wrack, tide-pools, the grey sea, soft mud, wreck timbers, the great chain, the barge-camp
  mudflat: { grass: 'w.silt', seed: 48, gLo: -1.5, gHi: -.4, groundK: 'silt', scatK: 'shells', tallK: 'saltgrass', blade: 'w.sedge', roadK: 'ruts', rutDD: -1.5, soil: 'w.mudtrack',
    water: 'w.seawater', puddle: 'w.seawater', waterK: 'sea', bank: 'w.silt', patchK: 'softmud', patchMat: 'w.silt', patchRim: -1.6, soilDark: 'w.silt', fordK: 'pools', bushK: 'cratechain',
    rockK: 'wreck', wall: 'w.tarred', cap: 'w.tarred', wallK: 'hull', roofK: 'canvas', roof: 'w.canvas', roofEdge: 'w.tarred', fenceK: 'stockade',
    rootK: 'chain', bridge: 'w.wreck', floor: 'w.wreck' },
  // the Blackwater Causeway: its stone crown and edge stones, wrack the flood left on them, reedy banks, Mirrordeep's water
  causeway: { seed: 50, scatK: 'wrack', roadK: 'slabs', flagK: 'slabs', paver: 'w.causeway', stone: 'w.causeway', water: 'w.openwater', puddle: 'w.openwater',
    waterK: 'mirror', cliffK: 'masonry', cliff: 'w.causeway', rockK: 'block', decks: [], roadPaved: 1 },
};
const GLOOM_BIOMES = new Set(Object.keys(GLOOM_PAL));
const wetOff = mat => flatV(mat) - 3.92; // a decal of an emissive water lands on the same steps as M3's water
// still water's own value (before wetOff): the darkest step but for a sparkle here and there
const waterAt = (x, y, v, f) => -2.62 + (hash(x, y, 8795 + v * 3 + f) < .035 ? .85 : 0) + bayer(x, y) * .1;

/* ---- what a thing stands on, from its four neighbours: 0 the ground, 1 planks, 2 the water, 3 stone, 4 the road (the
   class most of its open neighbours are; ties go planks, stone, road, ground, water; among solid things, the ground) ---- */
const ON_CLASS = { grass: 0, flowers: 0, 'tall-grass': 0, mud: 0, roots: 0, fungus: 0, ichor: 0, ledge: 0, floor: 1, bridge: 1, water: 2, ford: 2, void: 2,
  flagstone: 3, 'dark-floor': 3, stair: 3, door: 3, road: 4 };
function standOn(nb) {
  const c = [0, 0, 0, 0, 0];
  for (const n of nb) if (ON_CLASS[n] !== undefined) c[ON_CLASS[n]]++;
  let b = -1;
  for (const k of [1, 3, 4, 0, 2]) if (c[k] && (b < 0 || c[k] > c[b])) b = k;
  return b < 0 ? 0 : b;
}
const onPick = n => (v, nb) => standOn(nb) * n + v;
const ON_SHAPES = 5;
// the ground (or planks, stone, the road) under a thing, with its contact shadow sh = [x, y, rx, ry]; in the water, the ring
// where the water laps it (rings: [[x, y, rx, ry]...])
function gloomOn(F, Pl, cls, v, sh, rings) {
  if (cls === 2) return waterUnder(F, Pl, rings || (sh ? [sh] : []), v);
  const tar = cls === 3 && Pl.decks.includes('flagstone'), plank = cls === 1 || tar, stone = !plank && (cls === 3 || (cls === 4 && Pl.roadPaved));
  const mat = tar ? Pl.flagMat : plank ? Pl.floor : Pl.grass, D = decals();
  if (sh) for (let y = Math.floor(sh[1] - sh[3]); y <= sh[1] + sh[3]; y++) for (let x = Math.floor(sh[0] - sh[2]); x <= sh[0] + sh[2]; x++) if (((x + .5 - sh[0]) / sh[2]) ** 2 + ((y + .5 - sh[1]) / sh[3]) ** 2 < 1) D.set(x, y, stone ? Pl.paver : mat, stone ? -1.9 : -2);
  if (plank) return gloomPlanks(F, Pl, v, mat, false, D);
  if (stone) return gloomFlags(F, Pl, v, D);
  if (cls === 4) return ironRoad(F, Pl, 3 * 6 + (v % 3)); // a junction of the road: no ruts running off under the thing
  gloomGround(F, Pl, 0, E2 => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = D.get(x, y); if (d) E2.set(x, y, d.m, d.dd); } });
}
// the water under a thing standing in it (still: the tile does not animate), a paler ring where it laps each footing
function waterUnder(F, Pl, rings, v) {
  const w = Pl.water, off = wetOff(w);
  F.add({ mat: w, prof: 'flat', grp: 'water', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    let lap = false;
    for (const [x, y, rx, ry] of rings) { const r = Math.hypot((q.x + .5 - x) / (rx + 1.5), (q.y + .5 - y) / (ry + 1.1)); if (r > .76 && r < 1.1) lap = true; }
    return waterAt(q.x, q.y, v, 0) - off + (lap ? .85 : 0);
  } });
}

/* ---- '.' moss and clover (Willowmurk), sedge on the banks, trodden grass and mud (Bogmire's islet), sphagnum (the bog-top),
   leaf-litter, wet silt with ripple marks (the flats), moss over Misthollow's raised ground, wet stone ---- */
function gloomGround(F, Pl, v, extra) {
  const D = decals(), g = Pl.grass, k = Pl.groundK, [x, y] = spots(1, 8300 + v, 4)[0];
  let fn = null;
  if (k === 'fen' || k === 'turf' || k === 'bog' || k === 'trodden') {
    const other = k === 'bog' ? 'w.sphagnum' : k === 'turf' ? 'clover' : Pl.moss;
    for (const [a, b] of spots(3 + (v & 1), 8100 + v * 7)) tuft(D, a - 1, b - 1, k === 'turf' ? g : Pl.blade);
    for (const [a, b] of spots(3, 8150 + v * 11)) D.set(a, b, g, -2);
    if (k === 'trodden' && v !== 1) { // bare mud where the feet go
      const [cx, cy] = spots(1, 8170 + v, 5)[0];
      for (let b = -2; b <= 2; b++) for (let a = -4; a <= 4; a++) { const d = Math.hypot(a / 4.2, b / 2.4) + hash(a, b, 8180 + v) * .3; if (d < 1) D.set(cx + a, cy + b, Pl.soil, -1.1 - d * .5); }
      if (v & 1) for (let i = 0; i < 2; i++) { D.set(cx - 2 + i * 3, cy - 1 + i * 2, 'w.peat', -.5); D.set(cx - 2 + i * 3, cy + i * 2, 'w.peat', -.8); }
    } else if (k !== 'trodden' && (v === 1 || v === 3)) { // a soft-edged patch of the other moss (clover in Willowmurk)
      const [cx, cy] = spots(1, 8200 + v, 5)[0];
      for (let b = -3; b <= 3; b++) for (let a = -4; a <= 4; a++) {
        const d = Math.hypot(a / 4, b / 2.8) + hash(a, b, 8210 + v) * .35;
        if (d >= 1) continue;
        if (other === 'clover') { if ((a * 3 + b * 5 + 64) % 4 === 0) { D.set(cx + a, cy + b, Pl.clover, -.2); D.set(cx + a + 1, cy + b, Pl.clover, -.9); } }
        else D.set(cx + a, cy + b, other, -.8 - d * .7 + ((a + b) & 1 ? 0 : -.3));
      }
    }
    if (v === 2) { // a hoof-print of black water
      for (const [a, b, d] of [[0, 0, -2], [1, 0, -2.3], [2, 0, -2.1], [0, 1, -2.3], [1, 1, -1.5], [2, 1, -2.3]]) D.set(x + a, y + b, Pl.puddle, d - wetOff(Pl.puddle));
      D.set(x + 1, y - 1, g, -2);
    }
    if (k === 'bog' && v === 0) for (const [a, b] of spots(2, 8220)) { D.set(a, b, 'w.sphagnum', -.4); D.set(a + 1, b, 'w.sphagnum', -1); D.set(a, b + 1, 'w.sphagnum', -1.4); }
    if (k === 'turf' && v === 4) spots(4, 8230, 2).forEach(([a, b], i) => { const m = i & 1 ? 'w.reed' : 'w.sedge'; D.set(a, b, m, -.2); D.set(a + 1, b + (i & 1), m, -.9); }); // fallen willow leaves
  } else if (k === 'silt') { // wet silt: ripple marks, a shell, worm casts, the sky caught in the wet
    if (v === 1 || v === 3) fn = siltRipples(v);
    if (v === 2) for (const [a, b] of spots(2, 8240, 3)) { D.set(a, b, 'bone', -.4); D.set(a + 1, b, 'bone', -1.1); D.set(a, b + 1, g, -2); }
    if (v === 4) for (const [a, b] of spots(2, 8250, 3)) for (const [c, d, e] of [[0, 0, -.2], [1, 0, -1], [1, 1, -.6], [0, 1, -1.6]]) D.set(a + c, b + d, g, e);
    if (v === 0 || v === 3) { const [a, b] = spots(1, 8260 + v, 4)[0]; for (let i = -2; i <= 2; i++) D.set(a + i, b, Pl.puddle, (Math.abs(i) === 2 ? -2.3 : -1.8) - wetOff(Pl.puddle)); }
    for (const [a, b] of spots(3, 8270 + v)) D.set(a, b, g, -2);
  } else if (k === 'litter') { // black leaf-litter: fallen leaves, a twig
    spots(4 + (v & 1), 8280 + v * 3, 1).forEach(([a, b], i) => { const m = ['w.cattail', 'w.reed', 'w.willow', 'w.cattail'][i & 3]; D.set(a, b, m, -.3); D.set(a + 1, b, m, -1); if (i & 1) D.set(a, b + 1, m, -1.3); });
    if (v === 2) for (let i = 0; i < 5; i++) D.set(x - 2 + i, y + (i >> 1), 'bogwood', i === 2 ? -.2 : -.8);
    for (const [a, b] of spots(3, 8290 + v)) D.set(a, b, g, -2);
  } else if (k === 'city') { // moss and grass on the raised ground, the edge of a buried slab
    for (const [a, b] of spots(4, 8310 + v * 5)) tuft(D, a - 1, b - 1, (a + b) & 1 ? 'w.fenmoss' : 'w.sedge');
    if (v >= 3) { const b = 3 + ((v * 5) % 9); for (let a = 0; a < 16; a++) if (hash(a, b, 8320) < .8) { D.set(a, b, 'dark', -1.2); D.set(a, b + 1, Pl.paver, -.4); } }
    for (const [a, b] of spots(3, 8330 + v)) D.set(a, b, g, -2);
  } else if (k === 'wet') { // wet stone: puddles with the green light in them
    for (const [a, b] of spots(2, 8340 + v, 3)) { D.set(a, b, Pl.puddle, -1.6 - wetOff(Pl.puddle)); D.set(a + 1, b, Pl.puddle, -2.2 - wetOff(Pl.puddle)); }
    if (v === 1) for (let i = 0; i < 6; i++) D.set(x - 2 + i, y + (i >> 1), 'dark', -1.1);
  }
  if (extra) extra(D);
  sunGround(F, Pl, D, fn);
}
// ripple marks on wet silt: two short crests, each a lit line over its shadow, kept inside the tile
const siltRipples = v => (x, y) => {
  for (const [cx, cy, w] of [[5 + v, 5, 3.6], [10 - v * .5, 11, 3.2]]) {
    const t = (x + .5 - cx) / w; if (t < -1 || t > 1) continue;
    const d = y + .5 - (cy + Math.sin(t * 2.4) * .9);
    if (d >= -.5 && d < .5) return -.2;
    if (d >= .5 && d < 1.5) return -1.9;
  }
  return undefined;
};
// planks laid east-west (or north-south), long boards with a grain line, a joint between each; decals D over them
function gloomPlanks(F, Pl, v, mat, vertical, D) {
  F.add({ mat, prof: 'flat', grp: 'planks', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const d = D && D.get(q.x, q.y); if (d) return d;
    const a = vertical ? q.x : q.y, b = vertical ? q.y : q.x, r = a >> 2, la = a & 3;
    if (la === 0) return { m: 'dark', dd: -1.2 };
    const cut = 3 + Math.floor(rnd(r, v, 191) * 10), ends = (r + v) % 4 === 0;
    if (ends && b === cut) return { m: 'dark', dd: -1.2 };
    return -.55 + (la === 1 ? .5 : la === 3 ? -.75 : 0) + (la === 2 && (b + r * 5) % 7 < 3 ? -.45 : 0) + (hash(b >> 3, r, 192 + v) - .5) * .4 + bayer(q.x, q.y) * .2;
  } });
}
/* ---- ',' marsh marigolds and herb beds, bank gravel and shingle, herb pots and moss on Bogmire's planks, bog cotton, fallen
   willow leaves, rubble and weeds, shells and wrack, wrack the flood left on the causeway's stones ---- */
function gloomScatter(F, Pl, v) {
  const k = Pl.scatK, g = Pl.grass, S = spots(6, 8400 + v * 13, 2);
  if (k === 'pots') { // on the planks: pots of herbs in a row, moss in the joints
    const D = decals();
    for (let x = 0; x < 16; x++) if (hash(x, v, 8410) < .5) D.set(x, 4 + (v & 1) * 8, 'w.fenmoss', -.8);
    gloomPlanks(F, Pl, v, Pl.floor, false, D);
    const P3 = [[4, 9.4], [10.4, 7.6], [7.6, 13]].slice(0, 2 + (v & 1));
    part(F, 'w.terra', P3.map(([x, y]) => P([[x - 2, y - 1], [x + 2, y - 1], [x + 1.4, y + 2], [x - 1.4, y + 2]])), { prof: 'bevel', bw: .7, grp: 'pots', hi: 4 });
    part(F, 'w.willow', P3.map(([x, y], i) => (i & 1 ? E([x, y - 2], 2, 1.6) : P([[x - 1.8, y - 1], [x - .6, y - 4.4], [x, y - 1.6], [x + .8, y - 4.8], [x + 1.8, y - 1]]))), { prof: 'round', bw: .8, grp: 'herbs', hi: 4 });
    return;
  }
  if (k === 'wrack') { // on the causeway's stones: dark wrack in strands, a shell
    const D = decals();
    S.slice(0, 3).forEach(([x, y], i) => { for (let j = 0; j < 5; j++) D.set(x - 2 + j, y + ((j + i) % 3 === 0 ? 1 : 0), 'seaweed', j & 1 ? -.5 : -1.1); });
    const [a, b] = S[4]; D.set(a, b, 'bone', -.3); D.set(a + 1, b, 'bone', -1);
    return gloomFlags(F, Pl, v, D);
  }
  gloomGround(F, Pl, v & 1 ? 1 : 0, D => {
    if (k === 'cotton') S.slice(0, 3 + (v & 1)).forEach(([x, y]) => { // bog cotton: a white tuft nodding on a dark stalk
      D.set(x, y + 1, Pl.blade, -.8); D.set(x, y + 2, Pl.blade, -1.3); D.set(x - 1, y + 3, Pl.blade, -1.7);
      D.set(x, y, 'clothWhite', 0); D.set(x + 1, y, 'clothWhite', -.6); D.set(x, y - 1, 'clothWhite', -.2); D.set(x - 1, y, 'clothWhite', -1.1);
    });
    else if (k === 'shingle') S.forEach(([x, y], i) => { pebble(D, x, y, i % 3 ? Pl.stone : 'w.loam'); if (i & 1) D.set(x + 2, y + 1, Pl.stone, -.6); });
    else if (k === 'marigold') S.forEach(([x, y], i) => { // marsh marigolds among round leaves; one tile in three a herb bed's rows
      if (v === 2) { for (let a = -3; a <= 3; a++) D.set(x + a, y, (a + i) & 1 ? 'w.sedge' : 'w.willow', (a + i) & 1 ? -.4 : -.1); return; }
      if (i % 3 === 2) { D.set(x, y, 'w.sedge', -.4); D.set(x + 1, y, 'w.sedge', -1); D.set(x, y + 1, 'w.sedge', -1.4); return; }
      D.set(x, y, 'gold', 0); D.set(x - 1, y, 'gold', -1); D.set(x + 1, y, 'gold', -1); D.set(x, y - 1, 'gold', -.8); D.set(x, y + 1, g, -2);
    });
    else if (k === 'shells') S.forEach(([x, y], i) => { // cockle shells and wrack
      if (i & 1) { D.set(x, y, 'bone', -.2); D.set(x + 1, y, 'bone', -.8); D.set(x, y + 1, 'bone', -1.2); return; }
      for (let j = 0; j < 4; j++) D.set(x - 1 + j, y + ((j + i) & 1), 'seaweed', j & 1 ? -.6 : -1.2);
    });
    else if (k === 'rubble') S.forEach(([x, y], i) => (i % 3 === 2 ? tuft(D, x - 1, y - 1, 'w.fenmoss') : pebble(D, x, y, Pl.stone)));
    else if (k === 'leaves') S.forEach(([x, y], i) => { const m = i % 3 === 2 ? 'w.willow' : i & 1 ? 'w.reed' : 'w.sedge'; D.set(x, y, m, -.2); D.set(x + 1, y + (i & 1), m, -.8); D.set(x - 1, y + 1, m, -1.3); });
    else S.forEach(([x, y], i) => { // sedge tussocks, a white bog-bean flower
      if (i === 4) { D.set(x, y, 'clothWhite', -.3); D.set(x + 1, y, 'clothWhite', -1); D.set(x, y + 1, Pl.moss, -1); return; }
      tuft(D, x - 1, y - 1, Pl.blade); D.set(x, y - 2, Pl.blade, -.2); D.set(x, y + 2, g, -2.2);
    });
  });
}
/* ---- '"' reeds with cattails, dark rushes, low salt-marsh grass: their stems drawn overhead ---- */
function gloomTall(F, Pl, v) {
  gloomGround(F, Pl, 0, D => {
    for (let k = 0; k < 14; k++) blade(D, Math.floor(rnd(k, 3, 8520 + v) * 16), Math.floor(rnd(k, 4, 8520 + v) * 14) + 1, Pl.blade);
    for (const [x, y] of spots(5, 8530 + v)) D.set(x, y, Pl.grass, -2.2);
  });
}
function gloomTallTops(F, Pl, v) {
  const k = Pl.tallK, salt = k === 'saltgrass', n = salt ? 9 : 7, sh = [], heads = [];
  for (let j = 0; j < n; j++) {
    const x = 1.2 + j * (13.6 / (n - 1)) + (rnd(j, v, 8540) - .5) * 1.2, top = (salt ? 9.4 : k === 'rush' ? 4.8 : 5.4) + rnd(j, 1 + v, 8541) * (salt ? 2.6 : 3.6), lean = (j % 3 - 1) * (salt ? 1 : .7);
    sh.push(P([[x - (k === 'rush' ? .55 : .7), 16.5], [x + lean, top], [x + (k === 'rush' ? .55 : .7), 16.5]]));
    if (k === 'reed' && (j + v) % 3 === 0) heads.push(E([x + lean * .8, top + 2.2], .85, 1.8));
    if (k !== 'reed' && (j + v) % 4 === 1) heads.push(O([x + lean, top + .6], .6));
  }
  F.add({ mat: Pl.blade, prof: 'ridge', grp: 'stems', noOutline: true, lo: 1, hi: 3, shapes: sh, tex: q => (q.y < (salt ? 12 : 9) ? .2 : q.y > 13 ? -1.3 : -.5) });
  if (heads.length) F.add({ mat: k === 'reed' ? 'w.cattail' : salt ? 'bone' : 'w.loam', prof: 'round', bw: .6, grp: 'heads', noOutline: true, lo: 1, hi: k === 'reed' ? 4 : 3, shapes: heads });
  if (v && k === 'reed') F.add({ mat: Pl.blade, prof: 'ridge', grp: 'leaf', noOutline: true, lo: 1, hi: 3, shapes: [P([[6, 16.5], [3.4, 9], [.4, 7.4], [4.2, 10.2], [7.2, 16.5]])], tex: () => -.2 });
}
/* ---- 'm' wet mud at the water's edge; black bog mud with sedge tussocks standing out of it (the bog lock lies on these);
   Misthollow's grey silt; soft grey mud on the flats, worm casts in it ---- */
function gloomBog(F, Pl, v) {
  const k = Pl.patchK, off = wetOff(Pl.puddle);
  if (k === 'softmud') { // the flats' soft mud: smooth, wet and darker than the sand, the sky lying on it in long streaks, worm casts
    F.add({ mat: Pl.patchMat, prof: 'flat', grp: 'bog', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => -1.8 + (pnoise(q.x / 4, q.y / 4, 4, 8600 + v) - .5) * .4 + bayer(q.x, q.y) * .1 });
    const S = [[1 + v * 4, 3 + v, 6], [7 - v * 3, 9 + v * 2, 5], [11 - v * 8, 13 - v * 7, 3]];
    part(F, Pl.puddle, S.map(([x, y, l]) => RECT(x, y, x + l, y + 1)), { prof: 'flat', grp: 'sheen', noShadow: true, noOutline: true, hi: 3, tex: q => -.8 - off + ((q.x + q.y) % 4 === 0 ? -.6 : 0) });
    part(F, Pl.patchMat, spots(3, 8620 + v, 3).map(([x, y]) => O([x + .5, y + .5], .75)), { prof: 'round', bw: .5, grp: 'casts', noOutline: true, hi: 3, tex: () => .2 });
    return;
  }
  const m = k === 'bog' || k === 'mud' ? Pl.patchMat : Pl.grass, base = k === 'bog' ? -1.1 : k === 'mud' ? -1.25 : -1.45;
  F.add({ mat: m, prof: 'flat', grp: 'bog', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const n = pnoise(q.x / 4, q.y / 4, 4, 8600 + v), s = pnoise(q.x / 2, q.y / 4, 8, 8610 + v, 4);
    if (s > .72 && n > .45) return { m: Pl.puddle, dd: -1.9 - off + (s > .82 ? .4 : 0) }; // standing water catching the light
    return base + n * .7 + bayer(q.x, q.y) * .16;
  } });
  if (k === 'mud') { part(F, Pl.patchMat, [[4, 5], [9, 11]].map(([x, y]) => E([x + v, y], 1, 1.4)), { prof: 'flat', grp: 'prints', noShadow: true, noOutline: true, hi: 3, tex: () => -1.9 }); return; }
  if (k !== 'bog') return;
  const T = [[[4.4, 5], [11.6, 10.6], [3.2, 12.6]], [[5, 11], [11, 4.4], [12.6, 12.6]]][v % 2];
  T.forEach(([x, y], i) => {
    const s2 = i === 2 ? .7 : 1;
    part(F, 'w.sedge', [E([x, y + .8], 2.4 * s2, 1.3 * s2)], { prof: 'round', bw: 1, grp: 'mound' + i, hi: 3 });
    part(F, Pl.blade, [0, 1, 2, 3, 4].map(j => { const a = -Math.PI / 2 + (j - 2) * .42 + (i - 1) * .12; return P([[x - .6 + j * .3, y + .8], [x + Math.cos(a) * 3.2 * s2, y + Math.sin(a) * 3.4 * s2], [x + .6 + j * .3, y + .8]]); }), { prof: 'ridge', grp: 'blades' + i, noOutline: true, hi: 3, tex: q => (q.y < y - 1 ? .2 : -.6) });
  });
}
/* ---- 'i' the bog breathing: bubbles swell and burst in the black mud (2 frames) ---- */
function gloomBubbles(F, Pl, v, f) {
  gloomBog(F, Object.assign({}, Pl, { patchK: 'bog' }), v);
  const B = f ? [[5, 6, 1.4], [11, 11, .9]] : [[5, 6, .8], [10.4, 11.4, 1.3]];
  part(F, Pl.patchMat, B.map(([x, y, r]) => O([x, y], r)), { prof: 'round', bw: .8, grp: 'bubbles', hi: 3, tex: () => .4 });
  part(F, Pl.puddle, B.map(([x, y, r]) => O([x - r * .35, y - r * .35], .5)), { prof: 'flat', grp: 'shine', noShadow: true, noOutline: true, hi: 3, tex: () => -1.2 });
}
/* ---- '=' the road: a trodden line or ruts in the earth (the Ironspire's painter in the place's soil); on the causeway, its crown
   of slabs with a paler line worn along the way (an arc round a bend, none at a junction) ---- */
function gloomRoad(F, Pl, v, D) {
  if (Pl.roadK !== 'slabs') return ironRoad(F, Pl, v);
  const dir = Math.floor(v / 3), w = v % 3;
  const worn = (x, y) => {
    if (dir === 6) return 0;
    if (dir > 1) { const [cx, cy] = BEND_AT[dir - 2], d = Math.abs(Math.hypot(x + .5 - cx, y + .5 - cy) - 8); return d < 2.6 ? 1 - d / 2.6 : 0; }
    const d = Math.abs((dir === 0 ? x : y) + .5 - 8); return d < 2.6 ? 1 - d / 2.6 : 0;
  };
  const kerb = v >= 21; // the edge stones (flagstone): long blocks laid along, no worn line
  F.add({ mat: Pl.paver, prof: 'flat', grp: 'slabs', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
    const d = D && D.get(q.x, q.y); if (d) return d;
    const b = kerb ? bond(q.x, q.y, 16, 8, 8) : bond(q.x, q.y, 5, 4, 2, 0), ww = kerb ? 0 : worn(q.x, q.y);
    if (b.lx === 0 || b.ly === 0) return rnd(q.x, q.y, 8700 + w) < (kerb ? .5 : .25) ? { m: 'w.fenmoss', dd: -.6 } : { m: 'dark', dd: ww > .5 ? -.9 : -1.3 };
    return (kerb ? -1.25 : -.95) + (b.ly === 1 ? .4 : 0) + (b.lx === 1 && !kerb ? .25 : 0) + (hash(b.c, b.r, 8710 + w) - .5) * .5 + ww * .8 + (hash(q.x, q.y, 8720) < .06 ? -.7 : 0) + bayer(q.x, q.y) * .2;
  } });
}
/* ---- ':' flat old stones with moss, the old bridge's paving (big blocks), Bogmire's tarred decks, cobbled streets, the
   causeway's slabs; decals D over them ---- */
function gloomFlags(F, Pl, v, D) {
  const k = Pl.flagK;
  if (k === 'slabs') return gloomRoad(F, Pl, 21 + v % 3, D); // (past the road's 21 shapes: the edge stones)
  if (k === 'tar') return gloomPlanks(F, Pl, v, Pl.flagMat, true, D);
  if (k === 'cobbles') {
    F.add({ mat: Pl.paver, prof: 'flat', grp: 'cobbles', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
      const d = D && D.get(q.x, q.y); if (d) return d;
      const b = bond(q.x, q.y, 4, 4, 2), c = hash(b.c, b.r, 8730 + v);
      if (b.lx === 0 || b.ly === 0) return c < .3 ? { m: 'w.fenmoss', dd: -.9 } : { m: 'dark', dd: -1.2 };
      return -1.05 + (b.ly === 1 && b.lx < 3 ? .6 : 0) + (b.lx === 3 || b.ly === 3 ? -.4 : 0) + (c - .5) * .6;
    } });
    return;
  }
  if (k === 'quay') {
    F.add({ mat: Pl.paver, prof: 'flat', grp: 'quay', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
      const d = D && D.get(q.x, q.y); if (d) return d;
      const b = bond(q.x, q.y, 16, 8, 8);
      if (b.lx === 0 || b.ly === 0) return { m: 'dark', dd: -1.4 };
      return -1 + (b.ly === 1 ? .25 : 0) + (hash(b.c, b.r, 8771 + v) - .5) * .4 + (pnoise(q.x / 4, q.y / 4, 4, 8770 + v) > .66 ? { m: Pl.moss, dd: -1.1 } : 0) + bayer(q.x, q.y) * .25;
    } });
    return;
  }
  paintFlagstone(F, Object.assign({}, Pl, { stone: Pl.paver }), v);
  if (D) { const p = F.parts[F.parts.length - 1], t = p.tex; p.tex = q => D.get(q.x, q.y) || t(q); } // a thing's shadow over them
}
/* ---- '_' planks: platforms, porches, floors, Bogmire's plank streets; on the boardwalk, dark barge-planks patched with pale ---- */
function gloomFloor(F, Pl, v) {
  if (Pl.floorK !== 'barge') return gloomPlanks(F, Pl, v, Pl.floor, false, null);
  const D = decals(), [x, y] = spots(1, 8760 + v, 4)[0];
  for (let b = -2; b <= 2; b++) for (let a = -3; a <= 3; a++) D.set(x + a, y + b, 'w.wreck', b === -2 ? -.3 : a === 3 ? -1.2 : -.7);
  D.set(x - 2, y - 1, 'iron', -1); D.set(x + 2, y + 1, 'iron', -1);
  gloomPlanks(F, Pl, v, 'w.tarboards', false, D);
}
/* ---- '~' black water (lily-pads; in the bog a light hanging over it), open water, the canals, the grey sea with foam, Mirrordeep's
   sky, green-lit water ---- */
function gloomWater(F, Pl, v, f) {
  const k = Pl.waterK, w = Pl.water, off = wetOff(w), D = decals();
  // long slow sheen lines, drifting a pixel east on the second frame, a brighter pixel in each; a sparkle now and then
  for (const [x, y] of spots(k === 'sea' ? 3 : 2, 8780 + v * 31, 2)) { const L = 5 + (x % 4); for (let i = 0; i < L; i++) D.set(x + i + (f ? 1 : 0) - 2, y, w, (i === 2 ? -1 : -1.7) - off); }
  if (k === 'mirror' && v < 3) { const y = 3 + v * 4; for (let x = 1 + v; x < 13 + v; x++) D.set(x, y, w, ((x + f) & 1 ? -.9 : -1.4) - off); } // the sky lying on Mirrordeep
  F.add({ mat: w, prof: 'flat', grp: 'water', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const d = D.get(q.x, q.y); if (d) return d; return waterAt(q.x, q.y, v, f) - off; } });
  if (Pl.lilies && v === 3) { // lily-pads, one in flower
    const L = [[5.4, 5.6, 3.6], [11.4, 11, 2.8]];
    part(F, 'w.willow', L.map(([x, y, r]) => E([x, y], r, r * .7)), { prof: 'flat', grp: 'pads', noShadow: true, hi: 4, cuts: L.map(([x, y, r]) => P([[x + .4, y], [x + r * 1.2, y - .8], [x + r * 1.2, y + .9]])), tex: q => (q.d < .45 ? -.3 : (q.x * 2 + q.y) % 5 === 0 ? .2 : .8) });
    part(F, 'clothWhite', [E([4.4, 5], 1.4, 1)], { prof: 'flat', grp: 'bloom', noShadow: true, hi: 4, tex: q => (q.y > 5 ? { m: 'skinPale', dd: .3 } : .6) });
  }
  if (Pl.waterLights && v === 2) { // a small light hanging over the black water, bobbing, a dim ring of its light round it and its reflection under it
    const x = 9, y = 5 - f * .8;
    part(F, Pl.glow, [C([x - 1.6, 12.6], [x + 1.6, 12.6], .5)], { prof: 'flat', grp: 'shine', noShadow: true, noOutline: true, hi: 3, tex: q => ((q.x + f) & 1 ? -1 : -1.6) });
    part(F, Pl.glow, [O([x, y], 3)], { prof: 'flat', grp: 'halo', noShadow: true, noOutline: true, hi: 3, cuts: [O([x, y], 1.6)], tex: q => ((q.x + q.y + f) & 1 ? -1.9 : -9) });
    part(F, Pl.glow, [O([x, y], 1.4 + f * .3)], { prof: 'round', bw: 1, grp: 'light', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? .7 : .3) });
  }
  if (k === 'sea' && v < 2) { const [x, y] = spots(1, 8800 + v, 3)[0]; part(F, 'clothWhite', [C([x - 2 + f, y], [x + 2 + f, y + .4], .45)], { prof: 'flat', grp: 'foam', noShadow: true, noOutline: true, hi: 3, tex: () => -1.4 }); }
  if (k === 'green') part(F, Pl.glow, [0, 1, 2].map(i => C([1 + i * 5 + f, 3 + i * 4], [4 + i * 5 + f, 4.4 + i * 4], .42)), { prof: 'flat', grp: 'caustic', noShadow: true, noOutline: true, hi: 3, tex: () => -1.4 });
}
/* ---- 'w' shallows over a mud bed (stones in them), black flooded ground, paving under a film of water (Misthollow's streets, the
   belfry's floor), tide-pools and runnels ---- */
function gloomFord(F, Pl, v, f) {
  const k = Pl.fordK, w = Pl.water, off = wetOff(w);
  if (k === 'flooded') { // the slabs show through the water, a glint sliding over them (2 frames)
    const L = [[[1, 1, 9, 16], [10, 1, 16, 9], [10, 10, 16, 16]], [[1, 1, 16, 7], [1, 8, 7, 16], [8, 8, 16, 16]]][v % 2];
    F.add({ mat: w, prof: 'flat', grp: 'flooded', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
      const s = L.findIndex(([x0, y0, x1, y1]) => q.x >= x0 && q.y >= y0 && q.x < x1 && q.y < y1);
      if (s < 0) return -2.9 - off;
      const gl = ((q.x - q.y + (f ? 6 : 0) + 32) % 16) < 2;
      return (gl ? -1 : -1.9) - off + (q.x === L[s][0] || q.y === L[s][1] ? .35 : 0) + bayer(q.x, q.y) * .2;
    } });
    return;
  }
  if (k === 'pools') { // a tide-pool in the silt, weed and a pebble on its bed; in the other variant a runnel draining across
    gloomGround(F, Pl, 0, null);
    const pool = v ? P([[-1, 6], [5, 5.4], [11, 7], [17, 6.4], [17, 10], [11, 10.6], [5, 9.2], [-1, 10.2]]) : E([8, 8], 6.4, 4.8);
    F.add({ mat: w, prof: 'flat', grp: 'pool', noShadow: true, lo: 1, hi: 3, shapes: [pool], tex: q => (q.d < 1 ? -2 : -2.5) - off + (((q.x + q.y + (f ? 3 : 0)) % 7) === 0 ? .6 : 0) });
    if (!v) part(F, 'seaweed', [C([5, 9], [7, 10.4], .5), C([10, 6.4], [11.6, 7.6], .45)], { prof: 'flat', grp: 'weed', noShadow: true, noOutline: true, hi: 2 });
    return;
  }
  paintWater(F, Object.assign({}, Pl, k === 'dark' ? { soil: 'w.peat', stone: 'bogwood' } : { soil: Pl.bed }), v, f, true);
}
/* ---- 'T' great weeping willows, alders and willows on the banks, black willows weeping into the water, dead trees black and
   bare, drowned trees growing out of the ruins; each stands on what is round it (standOn) ---- */
function gloomTreeBase(F, Pl, v) {
  const t = Pl.tree, cls = Math.floor(v / 2), w = v & 1, water = cls === 2;
  gloomOn(F, Pl, cls === 1 ? 0 : cls, w, water ? null : [8.6 + (w ? .6 : 0), 14.2, 6.6, 2.4], [[8.4, 14.4, 2.4, 1]]);
  const lean = t === 'alder' ? 1.4 : 0, m = t === 'dead' || t === 'drowned' ? 'w.wreck' : t === 'blackwillow' ? 'rotwood' : Pl.trunk;
  part(F, m, [C([8, 15.2], [8.6 + lean, -2], 2, 1.4)].concat(water ? [] : [C([7.6, 14.6], [3.8, 15.8], 1.1, .5), C([8.6, 14.6], [12.6, 15.6], 1.1, .5)]), { bw: 1.4, grp: 'trunk',
    tex: q => (q.x % 3 === 0 ? -1 : 0) + ((q.x * 2 + q.y) % 9 === 0 ? { m: 'w.fenmoss', dd: -.4 } : 0) + (water && q.y > 13 ? -.8 : 0) });
}
// the overhead part, 24 x 26 drawn at (-4, -16): the tree tile's column is x = 12 here, its top row y = 16
function gloomTreeTop(F, Pl, v) {
  const t = Pl.tree === 'alder' && v === 2 ? 'willow' : Pl.tree; // on the banks the alders stand among willows
  if (t === 'dead' || t === 'drowned') { // bare and grey, moss hanging in rags from the branches (the drowned trees darker, weed-hung)
    const br = [[[12, 28], [12.4, 12]], [[12.2, 18], [4.6, 10.4]], [[12.2, 15], [20, 7.6]], [[12.4, 12.4], [10.6, 3]], [[7, 12.6], [3, 14.4]], [[17, 10.4], [21.4, 12.6]]];
    br.forEach(([a, b], k) => part(F, t === 'drowned' ? 'rotwood' : 'w.wreck', [C(a, [b[0] + (v === 1 ? 1 : v === 2 ? -1 : 0) * (k ? 1 : 0), b[1]], k ? .85 : 1.7, k ? .45 : 1.3)], { bw: .8, grp: 'br' + k }));
    part(F, t === 'drowned' ? 'seaweed' : 'w.fenmoss', [[5.6, 10.8, 5], [9.6, 14, 4], [18, 9, 5.6], [11, 5, 3.4], [15.6, 12, 3]].map(([x, y, l]) => C([x, y], [x + .4, y + l], .6, .35)), { prof: 'round', bw: .5, grp: 'moss', tex: q => (q.y % 2 ? -.6 : 0) });
    return;
  }
  // willows: a crown of lumps, and long drapes hanging from it down over the trunk (black willows darker, trailing lower)
  const black = t === 'blackwillow', alder = t === 'alder', leaf = black ? 'w.fenmoss' : Pl.leaf, dark = black ? 'dark' : Pl.leafDark;
  const lumps = (alder ? [[13.4, 8.4, 7], [7.6, 12.6, 5.2], [18, 12.4, 5]] : [[12, 7.4, 6.8], [6.4, 11.4, 5], [17.6, 11.2, 5]]).map(([x, y, r], k) => [x + (v === 1 && k ? (k % 2 ? -.8 : .8) : 0), y + (v === 2 ? .8 : 0), r]);
  part(F, dark, lumps.map(([x, y, r]) => O([x + .8, y + 1.4], r)), { bw: 3, grp: 'under', hi: 3 });
  lumps.forEach(([x, y, r], k) => part(F, leaf, [O([x, y], r)], { bw: 4, grp: 'l' + k, tex: q => (((q.x * 5 + q.y * 3 + k) % 7) === 0 ? -1 : 0) + (rnd(q.x >> 1, q.y >> 1, 8900 + v) < .12 ? .6 : 0) }));
  const drapes = alder ? [4, 9, 16, 20] : [2.6, 5.4, 8.2, 11, 14, 16.8, 19.6, 22];
  part(F, leaf, drapes.map((x, k) => C([x, 10 + (k % 3)], [x + (k % 2 ? .5 : -.5), (alder ? 19 : black ? 25.4 : 24) - (k % 3) * 1.6 - (v === k % 3 ? 1.4 : 0)], .75, .5)), { bw: .7, grp: 'drapes', hi: 3, tex: q => (q.y % 3 === 0 ? -.8 : 0) });
}
/* ---- 't' drying racks, eel-traps and woodpiles; scrub and nets on poles; crates, barrels and bottle racks; gorse and dead brush;
   the choir-stalls; crates, barrels and coils of chain on the flats ---- */
function gloomBush(F, Pl, v) {
  const k = Pl.bushK, cls = Math.floor(v / 2), w = v & 1;
  gloomOn(F, Pl, cls, w, [8.5, 13.8, 6.4, 2.2], [[8, 13, 5.6, 1.6]]);
  const kind = k === 'racks' ? (w ? 'traps' : 'rack') : k === 'scrubnets' ? (w ? 'nets' : 'scrub') : k === 'crates' ? (w && Pl.stilts ? 'bottles' : 'crates')
    : k === 'gorse' ? (w ? 'brush' : 'gorse') : k === 'netscrates' ? (w ? 'crates' : 'nets') : k === 'cratechain' ? (w ? 'chain' : 'crates') : k;
  if (kind === 'scrub' || kind === 'gorse') { // a low dark bush (gorse spiny, with yellow flowers)
    const B = [[[5.5, 10, 4.2], [10.6, 9.6, 4.4], [8, 6.4, 4.2]], [[5, 9.4, 4], [11, 10.2, 4], [8.4, 6, 4]]][w];
    part(F, kind === 'gorse' ? 'seaweed' : 'w.fenmoss', B.map(([x, y, r]) => O([x, y], r)), { bw: 3.2, grp: 'bush', tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? -1 : 0) + (rnd(q.x, q.y, 8950 + w) < .12 ? .8 : 0) });
    if (kind === 'gorse') { part(F, 'seaweed', [[3, 7, -2.4], [8, 2.6, -1.6], [13, 7, -.6], [2, 12, 2.8], [14, 12, .2]].map(([x, y, a]) => P([[x - .5, y + .4], [x + Math.cos(a) * 2, y + Math.sin(a) * 2], [x + .5, y - .4]])), { prof: 'ridge', grp: 'spines' }); part(F, 'gold', [[6, 6], [10, 8], [7.4, 10.4], [11.6, 5]].map(([x, y]) => O([x + .5, y + .5], .55)), { prof: 'flat', grp: 'bloom', noShadow: true, hi: 4, tex: () => -.2 }); }
    return;
  }
  if (kind === 'brush') { // dead brush: grey twigs in a tangle
    part(F, 'w.wreck', [[8, 14, 3, 4], [8, 14, 7, 3.4], [8, 14, 12.4, 5], [8, 14, 14, 9.6], [8, 14, 2, 9], [5.6, 8.6, 3.6, 5.6], [10.4, 8, 11.4, 4.6], [9, 11, 6, 6.4]].map(([a, b, c, d]) => C([a, b], [c + w * .6, d], .7, .4)), { bw: .6, grp: 'twigs' });
    return;
  }
  if (kind === 'crates') {
    part(F, 'wood', [RECT(1.4, 6.4, 9.6, 14.8)], { prof: 'bevel', bw: 1, grp: 'crate', tex: q => (q.y === 10 || q.x === 5 ? -1 : 0) });
    part(F, 'bogwood', [RECT(9.4, w ? 3.4 : 7.2, 14.8, 15)], { bw: 2, grp: 'barrel', tex: q => (q.y % 4 === 0 ? { m: 'iron', dd: 0 } : q.x === 11 ? -.8 : 0) });
    if (w) part(F, 'wood', [RECT(3, 1.6, 8.6, 6.8)], { prof: 'bevel', bw: .8, grp: 'crate2', tex: q => (q.x === 5 ? -1 : 0) });
    return;
  }
  if (kind === 'bottles') { // Nettie's bottle rack: two shelves of bottles, each its own colour, one glinting
    part(F, 'bogwood', [RECT(1, 2, 2.6, 15.4), RECT(13.4, 2, 15, 15.4), RECT(1, 7.4, 15, 8.6), RECT(1, 13, 15, 14.2)], { prof: 'bevel', bw: .5, grp: 'rack' });
    [[3.6, 7.4, 'seaglass'], [6.2, 7.4, 'ruby'], [8.8, 7.4, 'emerald'], [11.4, 7.4, 'amethyst'], [4.4, 13, 'topaz'], [7.4, 13, 'seaglass'], [10.6, 13, 'ruby']].forEach(([x, y, m], i) => part(F, m, [RECT(x - .9, y - 3.4, x + .9, y), RECT(x - .4, y - 4.6, x + .4, y - 3.2)], { prof: 'flat', grp: 'b' + i, hi: 4, tex: q => (q.x === Math.floor(x - .9) ? .4 : -.3) }));
    return;
  }
  if (kind === 'nets') { // two poles, a net hung between them, cork floats
    part(F, 'w.wreck', [RECT(1.4, 2, 3, 15.4), RECT(13, 2, 14.6, 15.4)], { prof: 'bevel', bw: .6, grp: 'poles' });
    part(F, 'string', [C([2.2, 3.4], [13.8, 3.8], .4)], { bw: .4, grp: 'line' });
    F.add({ mat: 'seaweed', prof: 'flat', grp: 'net', noShadow: true, lo: 1, hi: 3, shapes: [P([[3, 3.8], [13, 4.2], [12.2, 13 - w], [8, 14.4], [3.8, 12.6]])], tex: q => ((q.x + q.y) % 3 === 0 || (q.x - q.y + 30) % 3 === 0 ? -.2 : -9) });
    part(F, 'cloakRed', [[4.6, 4.4], [8, 4.6], [11.4, 4.8]].map(([x, y]) => O([x, y], .8)), { bw: .5, grp: 'floats' });
    return;
  }
  if (kind === 'rack') { // a drying rack: two posts and a pole, eels and bunches of herbs hung from it
    part(F, 'bogwood', [RECT(1.6, 3, 3.2, 15.4), RECT(12.8, 3, 14.4, 15.4)], { prof: 'bevel', bw: .6, grp: 'posts' });
    part(F, 'bogwood', [C([1, 3.8], [15, 3.8], .7)], { bw: .6, grp: 'pole' });
    part(F, 'w.peat', [5, 8.6].map(x => C([x, 4.4], [x + .3, 11.4], .8, .5)), { bw: .6, grp: 'eels', tex: q => (q.y % 3 === 0 ? .6 : 0) });
    part(F, 'w.reed', [E([11.4, 7], 1.6, 2.6)], { bw: 1, grp: 'herbs', tex: q => (q.x % 2 ? -.5 : 0) });
    return;
  }
  if (kind === 'traps') { // eel-traps of woven willow, and a woodpile, the log ends toward you
    part(F, 'w.thatch', [P([[1, 9], [7, 7.4], [7.4, 12.4], [1, 11.6]]), P([[2, 14.6], [8.6, 12.6], [8.8, 15.4], [2.4, 15.8]])], { prof: 'round', bw: 1, grp: 'traps', tex: q => ((q.x + q.y) % 2 ? -.8 : 0) });
    part(F, 'bark', [[10.4, 12.6], [13.4, 12.6], [11.9, 10.2], [10.4, 7.8], [13.4, 7.8]].map(([x, y]) => O([x, y], 1.5)), { bw: .8, grp: 'logs', tex: q => ((q.x + q.y) % 3 === 0 ? { m: 'wood', dd: .2 } : 0) });
    return;
  }
  if (kind === 'chain') { // a coil of heavy chain
    const L = []; for (let i = 0; i < 16; i++) { const a = i * .8, r = 6.2 - i * .25; L.push(i % 2 ? E([8 + Math.cos(a) * r, 9.6 + Math.sin(a) * r * .62], 1.8, 1.1) : E([8 + Math.cos(a) * r, 9.6 + Math.sin(a) * r * .62], 1.1, 1.5)); }
    part(F, 'iron', L, { prof: 'round', bw: .6, grp: 'links', cuts: L.map(l => E(l.c, l.rx * .42, l.ry * .42)), tex: q => (hash(q.x, q.y, 9470) < .25 ? { m: 'rust', dd: -.8 } : 0) });
    return;
  }
  if (kind === 'stalls') { // a choir-stall: carved bench ends, the seat, the book-rest
    part(F, 'bogwood', [RECT(1, 5, 15, 13.6)], { prof: 'bevel', bw: 1, grp: 'seat', tex: q => (q.y === 9 ? -1 : q.x % 4 === 0 ? -.6 : 0) });
    part(F, 'bogwood', [RECT(1, 2.4, 3.4, 15), RECT(12.6, 2.4, 15, 15), O([2.2, 2.4], 1.4), O([13.8, 2.4], 1.4)], { prof: 'bevel', bw: .8, grp: 'ends' });
    part(F, Pl.puddle, [C([4, 7], [11, 7], .4)], { prof: 'flat', grp: 'wet', noShadow: true, noOutline: true, hi: 3, tex: () => -1.6 - wetOff(Pl.puddle) });
  }
}
/* ---- 'o' mossy boulders, snags and stumps and sunk boats' timbers, piles, stones and stumps, fallen masonry, wreck timbers and rocks,
   fallen blocks and marker stones ---- */
function gloomRock(F, Pl, v) {
  const k = Pl.rockK, cls = Math.floor(v / 2), w = v & 1, water = k === 'pile' || cls === 2;
  if (k === 'pile') { // piles standing out of the water: a sawn top, the wet side down to the water (two lashed together)
    const P2 = w ? [[5.2, 3.4, 2.4], [11, 2.2, 2.4]] : [[8, 2.4, 3.2]];
    waterUnder(F, Pl, P2.map(([x, , r]) => [x, 12.6, r, .9]), w);
    P2.forEach(([x, y, r], i) => {
      part(F, 'bogwood', [RECT(x - r, y, x + r, 12.6), E([x, 12.6], r, .9)], { bw: r * .8, grp: 'side' + i, tex: q => (q.y > 10.6 ? { m: 'w.fenmoss', dd: -.4 } : (q.y + i * 2) % 5 === 0 ? -.7 : 0) });
      part(F, 'w.wreck', [E([x, y], r, r * .55)], { prof: 'flat', grp: 'top' + i, hi: 4, tex: q => (Math.abs(Math.hypot((q.x + .5 - x) / r, (q.y + .5 - y) / (r * .55)) - .5) < .2 ? -.9 : -.2) });
    });
    if (w) part(F, 'leather', [C([5.2, 6.4], [11, 5.6], .55), C([5.2, 7.6], [11, 6.8], .55)], { bw: .4, grp: 'rope' });
    return;
  }
  const kind = k === 'snag' ? (water ? (w ? 'ribs' : 'snag') : (w ? 'ribs' : 'stump')) : k === 'stump' ? (w ? 'stump' : 'mossy') : k === 'wreck' ? (w ? 'barnacle' : 'ribs') : k === 'block' ? (w ? 'marker' : 'block') : k;
  gloomOn(F, Pl, cls, w, water ? null : [8.6, 13.6, 6.6, 2.3], [[8, 13, 5.4, 1.6]]);
  if (kind === 'snag') { part(F, 'w.wreck', [C([6.4, 13.6], [9.4, 3], 1.4, .6), C([8.2, 8], [12.4, 5], .6, .35), C([7.4, 10.6], [3.6, 7.4], .55, .3)], { bw: .8, grp: 'snag', tex: q => (q.y > 12 ? { m: 'w.fenmoss', dd: -.6 } : q.x % 3 === 0 ? -.8 : 0) }); return; }
  if (kind === 'ribs') { // a sunk boat's ribs and keel standing out of the water (or lying in the mud)
    part(F, 'w.wreck', [C([2, 14.6], [3.4, 5], .9, .6), C([6, 14.8], [6.6, 3.4], .9, .6), C([10, 14.8], [9.4, 3.6], .9, .6), C([14, 14.6], [12.6, 5.4], .9, .6)], { bw: .8, grp: 'ribs', tex: q => (q.y > 12 ? { m: water ? 'w.fenmoss' : 'w.peat', dd: -.5 } : q.y % 3 === 0 ? -.8 : 0) });
    part(F, 'w.wreck', [C([1, 14], [15, 14.4], .9)], { bw: .7, grp: 'keel', tex: () => -.6 });
    return;
  }
  if (kind === 'stump') { part(F, 'w.wreck', [P([[3.6, 14.6], [4.2, 6.6], [6, 4.8], [10.4, 5.2], [12, 7], [12.4, 14.6]]), C([4.4, 14], [1.4, 15.4], 1, .5), C([11.6, 14], [14.8, 15.2], 1, .5)], { bw: 2, grp: 'stump', tex: q => (q.x % 3 === 0 ? -1 : 0) }); part(F, 'w.fenmoss', [E([8, 5.6], 3.4, 1.2)], { prof: 'flat', grp: 'top', noShadow: true, hi: 3, tex: q => (Math.abs(q.x - 8) < 1.2 ? -1 : -.4) }); return; }
  if (kind === 'rubble') {
    [[1.6, 9, 8.4, 14.8], [7.6, 8.6, 14.6, 14.6], [4.6, 4.2, 11.4, 9.6]].forEach(([a, b, c, d], i) => part(F, Pl.stone, [RECT(a, b + (w && i === 2 ? .8 : 0), c, d)], { prof: 'bevel', bw: 1.2, grp: 'blk' + i, tex: q => (rnd(q.x >> 1, q.y >> 1, 20 + i) < .12 ? -1 : q.y <= b + 1 && hash(q.x, i, 9000) < .5 ? { m: 'w.fenmoss', dd: -.2 } : 0) }));
    return;
  }
  if (kind === 'block') { part(F, Pl.stone, [P([[1.6, 13.4], [2.8, 5.6], [12.6, 4], [14.4, 11.6], [11, 14.6], [3, 14.8]])], { prof: 'bevel', bw: 1.4, grp: 'block', tex: q => ((q.x + q.y) % 11 === 0 ? -.8 : 0) + (q.y > 11 ? { m: 'w.fenmoss', dd: -.6 } : 0) }); return; }
  if (kind === 'marker') { // a marker stone, the water-mark still on it
    part(F, Pl.stone, [P([[4.6, 15], [5, 3.6], [7.4, 1.4], [9.8, 2.4], [11.4, 5], [11.6, 15]])], { prof: 'round', bw: 2, grp: 'stone', tex: q => (q.y === 9 ? { m: 'w.fenmoss', dd: -.3 } : q.y > 9 ? -.7 : 0) });
    part(F, 'dark', [C([8, 4.4], [8, 7], .45), C([6.8, 5.4], [9.2, 5.4], .4)], { prof: 'flat', grp: 'mark', noShadow: true, noOutline: true });
    return;
  }
  const pts = [[[2.4, 13.6], [3.2, 7], [6.6, 3.6], [11.4, 3.8], [14, 7.4], [14, 13.6], [8.4, 15]], [[2, 13.8], [2.6, 8.6], [5.4, 4.4], [10.6, 3.2], [13.8, 6], [14.6, 13.2], [9, 15]]][w];
  part(F, Pl.stone, [P(pts)], { bw: 3.2, grp: 'rock', tex: q => (((q.y + (q.x >> 3) + w) % 3) === 0 ? -.9 : 0) + bayer(q.x, q.y) * .25 + (kind === 'barnacle' && hash(q.x, q.y, 9010) < .14 ? { m: 'bone', dd: -.3 } : 0) });
  if (kind === 'barnacle') part(F, 'seaweed', [C([3, 13.4], [7, 14.6], .8), C([9, 14.6], [13.6, 13.2], .7)], { prof: 'round', bw: .5, grp: 'wrack' });
  else part(F, 'w.fenmoss', [P(w ? [[3.4, 7.6], [5.6, 4.4], [10.6, 3.4], [13.6, 6.2], [11, 7.2], [7.4, 6.6], [5, 8.4]] : [[3.6, 6.8], [6.6, 3.6], [11.4, 3.8], [13.6, 6.8], [10.6, 6.2], [7, 7.4]])], { prof: 'round', bw: .9, grp: 'moss', tex: q => (q.y % 3 === 0 ? -.3 : .2) });
}
/* ---- '#' wattle and daub on bog-oak, fieldstone, weathered boards, pale ruined ashlar with the water's line on it, the belfry's dark
   stone in green light, tarred hull planks ---- */
function gloomWall(F, Pl, v, face) {
  const k = Pl.wallK, w = Pl.wall, cap = Pl.cap;
  if (k === 'rough') return sunWall(F, Object.assign({}, Pl, { wallK: 'rough' }), v, face);
  if (!face && k === 'belfry') { F.add({ mat: 'dark', prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => (((q.y + ((q.x >> 3) & 1) * 3) % 6 === 0 || (q.x & 7) === 0) ? -1.4 : -.9 + pnoise(q.x / 8, q.y / 8, 2, 9105 + v) * .6) }); return; }
  if (!face) { // the top of a wall seen from above
    F.add({ mat: cap, prof: 'flat', grp: 'top', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => {
      if (k === 'boards' || k === 'hull') return ((q.y & 3) === 0 ? { m: 'dark', dd: -1.4 } : (q.y & 3) === 1 ? .2 : -.6) + bayer(q.x, q.y) * .3;
      const r = q.y >> 3, lx = ((q.x + ((r + v) & 1 ? 4 : 0)) % 8 + 8) % 8, ly = q.y & 7;
      if (k !== 'daub' && (lx === 0 || ly === 0)) return { m: 'dark', dd: -1.6 };
      return -1 + (lx === 1 || ly === 1 ? .5 : 0) + (pnoise(q.x / 4, q.y / 4, 4, 9100 + v) > .64 ? { m: 'w.fenmoss', dd: -1 } : 0) + bayer(q.x, q.y) * .3;
    } });
    return;
  }
  if (k === 'daub') { // clay daub over wattle (the weave showing where it has cracked), a bog-oak post at the west edge, a sill beam
    F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y;
      if (y < 2) return { m: 'w.thatch', dd: y === 0 ? .4 : -1.4 };                  // the thatch's shadow under the eave
      if (x < 2) return { m: 'rotwood', dd: x === 0 ? .3 : -.7 };                   // a bog-oak post
      if (y >= 13) return { m: 'rotwood', dd: y === 13 ? .2 : y === 15 ? -1.4 : -.6 }; // the sill beam
      if (pnoise(x / 4, y / 4, 4, 9110 + v) > .66) return { m: 'w.thatch', dd: ((x + (y >> 1)) & 1) ? -1.4 : -.4 }; // the wattle through the daub
      return -.3 + (y === 2 ? -.9 : 0) + pnoise(x / 2, y / 2, 8, 9120 + v) * .5 - (y > 10 ? .4 : 0) + bayer(x, y) * .2;
    } });
    return;
  }
  if (k === 'boards' || k === 'hull') { // vertical boards (a hull's tarred planks run across, lapped), a batten, a patch nailed over a rotten one
    const hull = k === 'hull';
    F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
      const x = q.x, y = q.y, a = hull ? y : x, la = hull ? (a - 1) & 3 : a & 3;
      if (y < 2) return { m: cap, dd: y === 0 ? .4 : -1.2 };
      if (!hull && (y === 8 || y === 9)) return { m: 'bogwood', dd: y === 8 ? .2 : -1 };
      if (la === 0) return { m: 'dark', dd: -1.5 };
      if (!hull && v && x >= 9 && x <= 14 && y >= 10 && y <= 14) return { m: 'w.wreck', dd: y === 10 ? .2 : x === 14 ? -1 : -.3 };
      return -.35 + (la === 1 ? .4 : la === 3 ? -.6 : 0) + (hash(hull ? y >> 2 : x >> 2, v, 9130) - .5) * .7 + (y >= 14 ? -.8 : 0) + (hull && (x + y * 3) % 17 === 0 ? .8 : 0) + bayer(x, y) * .2;
    } });
    return;
  }
  // ruin (and belfry): pale dressed stone in two courses, dark with wet below the water's old line, moss along the joints; the
  // belfry's stone is darker, the green light running down it
  const belfry = k === 'belfry';
  F.add({ mat: w, prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y;
    if (y < 3) return { m: cap, dd: y === 0 ? .6 : y === 2 ? -1.5 : -.1 };
    const r = y < 9 ? 0 : 1, ly = y - (r ? 9 : 3), lx = ((x + ((r + v) & 1 ? 5 : 0)) % 10 + 10) % 10;
    if (ly === 0 || lx === 0) return (belfry ? hash(x, y, 9140) < .3 : hash(x, y, 9141) < .4) ? { m: belfry ? 'w.waterlight' : 'w.fenmoss', dd: belfry ? -1.6 : -.8 } : { m: 'dark', dd: -1.6 };
    const tide = y > 9 + Math.sin((x + v * 5) * .7) * .8;
    return -.4 + (ly === 1 ? .5 : 0) + (lx === 1 ? .3 : 0) + (tide ? -.9 : 0) + (belfry ? -.7 : 0) + (hash(Math.floor((x + ((r + v) & 1 ? 5 : 0)) / 10), r, 9150 + v) - .5) * .6 + (y === 15 ? -.6 : 0) + bayer(x, y) * .2;
  } });
  if (belfry && v) part(F, 'w.waterlight', [C([5.5, 3], [5.5, 12], .45), C([11.5, 5], [11.5, 9], .4)], { prof: 'flat', grp: 'drip', noShadow: true, noOutline: true, hi: 4, tex: q => -1.6 + (q.y % 4 === 0 ? .8 : 0) });
}
/* ---- 'H' reed thatch (sagging in the bog), slate with moss on it, tarred shingles patched, broken slate (towers, the drowned house),
   a shelter's shingles, tents and barge-cabin canvas ---- */
function gloomRoof(F, Pl, v, mask) {
  const k = Pl.roofK, e = Pl.roofEdge;
  F.add({ mat: Pl.roof, prof: 'flat', grp: 'roof', noShadow: true, lo: 1, hi: 4, shapes: [FULL], tex: q => {
    const x = q.x, y = q.y;
    if (k === 'thatch') { // thick reed thatch: a bound ridge, shaggy ends hanging at the eaves
      if (mask & 4 && y >= 12) { const hang = 13 + ((x * 7 + v) % 3); return y > hang ? { m: 'dark', dd: -2 } : y === hang ? -1.4 : -.6 + ((x & 1) ? -.3 : 0); }
      if (mask & 1 && y <= 2) return { m: 'bogwood', dd: y === 1 ? .2 : -.8 };
      if (mask & 8 && x <= 1 || mask & 2 && x >= 14) return x === 0 || x === 15 ? -1.5 : -.8;
      return .1 + ((x * 2 + y * 3 + (y >> 2) * 5) % 7 < 2 ? -1 : 0) + ((y & 3) === 3 ? -.7 : 0) + ((x + (y >> 2)) % 5 === 0 ? .4 : 0) + (pnoise(x / 4, y / 4, 4, 9200 + v) > .7 ? { m: 'w.fenmoss', dd: -.6 } : 0);
    }
    if (mask & 4 && y >= 13) return { m: e, dd: y === 13 ? .3 : y === 15 ? -1.6 : -.5 };
    if (mask & 1 && y <= 2) return { m: e, dd: y === 0 ? .5 : y === 2 ? -1.3 : 0 };
    if (mask & 8 && x <= 1) return { m: e, dd: x === 0 ? .3 : -.7 };
    if (mask & 2 && x >= 14) return { m: e, dd: x === 15 ? -1.5 : -.7 };
    if (k === 'canvas') return ((x & 7) === 0 ? -1.4 : 0) + (y % 5 === 0 && (x & 7) === 4 ? { m: 'string', dd: -.6 } : 0) - y * .04 + bayer(x, y) * .2;
    const r = Math.floor(y / 3), ly = y % 3, lx = (x + (r & 1) * 2) & 3;
    if (k === 'broken' && hash(x >> 2, r, 9210 + v) < .14) return { m: 'dark', dd: -2 };  // slates gone: the dark under the roof
    if (k === 'patched' && hash(x >> 3, y >> 3, 9220 + v) < .34) return hash(x >> 3, y >> 3, 9221 + v) < .5 ? { m: 'w.thatch', dd: ((x * 2 + y * 3) % 7 < 2 ? -1 : 0) + (y & 1 ? -.4 : .1) } : { m: 'w.wreck', dd: ((x & 3) === 0 ? -1.2 : -.3) };
    if (lx === 0) return -1.8;
    return (ly === 0 ? .6 : ly === 1 ? -.1 : -.9) + (rnd(x >> 2, r, 9230 + v) < .12 ? -.5 : 0) + (pnoise(x / 4, y / 4, 4, 9240 + v) > (k === 'slate' ? .6 : .7) ? { m: 'w.fenmoss', dd: -.4 } : 0);
  } });
}
/* ---- '|' woven wattle, the old bridge's carved stone parapet, rails on the platforms, the salvage camp's timber scaffolding, the
   barge-camp's stockade of stakes: 0 an east-west run (or a lone post), 1 inside a north-south run, 2 its north end ---- */
function gloomFence(F, Pl, v) {
  const k = Pl.fenceK, cls = Math.floor(v / 6), fv = v % 6, dir = fv >> 1, w = fv & 1, ns = dir > 0;
  if (k === 'wattle' && cls === 0) return ironFence(F, Object.assign({}, Pl, { fenceK: 'wattle' }), fv);
  gloomOn(F, Pl, cls, w, null, ns ? [[8, 14, 2, 1]] : [[8, 13, 7, 1.2]]);
  if (k === 'wattle') { // on planks or in the water: stakes, withies woven between
    part(F, Pl.palisade, [2, 8, 14].map(x => RECT(x - .8, 3.6, x + .8, 15.4)), { prof: 'round', bw: .6, grp: 'stakes' });
    part(F, 'thorn', [6, 8.4, 10.8, 13.2].map(y => C([-1, y], [17, y + (w ? .3 : -.3)], 1.1)), { prof: 'round', bw: .8, grp: 'weave', tex: q => (((q.x >> 1) + Math.floor(q.y / 2.4)) & 1 ? -.9 : 0) });
    return;
  }
  if (k === 'parapet') { // low stone, capped, a carving on each block that is not quite the same as you look at it
    const S = ns ? [RECT(2.6, dir === 2 ? 3 : -1, 13.4, 17)] : [RECT(-1, 5.4, 17, 14.6)];
    part(F, Pl.stone, S, { prof: 'bevel', bw: 1, grp: 'wall', tex: q => ((ns ? q.y : q.x) % 8 === 0 ? { m: 'dark', dd: -1.2 } : q.y < 7 && !ns ? .3 : 0) + (hash(q.x >> 1, q.y >> 1, 9250) < .1 ? { m: 'w.fenmoss', dd: -.4 } : 0) });
    const c = ns ? [8, 8] : [8 + (w ? -2 : 2), 10.4];
    part(F, 'dark', ns ? [C([c[0] - 1.4, c[1] - 1.6], [c[0] + 1.4, c[1] + 1.6], .4), O(c, 1.4)] : [O(c, 1.6), C([c[0] - 2.6, c[1]], [c[0] - 1, c[1]], .4)], { prof: 'flat', grp: 'carving', noShadow: true, noOutline: true, cuts: [O(c, .7)], tex: () => -1.2 });
    return;
  }
  if (k === 'rail') { // posts and a hand-rail
    if (ns) { part(F, Pl.palisade, [RECT(7.2, -1, 8.8, 17)], { prof: 'bevel', bw: .5, grp: 'bar' }); part(F, Pl.palisade, [RECT(6.4, 5, 9.6, 14.6)], { prof: 'bevel', bw: .7, grp: 'post' }); return; }
    part(F, Pl.palisade, [RECT(2.2, 5, 4.4, 15), RECT(10.2, 5, 12.4, 15)], { prof: 'bevel', bw: .6, grp: 'posts' });
    part(F, Pl.palisade, [RECT(-1, 5.4, 17, 7.2)], { prof: 'bevel', bw: .5, grp: 'bar' });
    return;
  }
  if (k === 'scaffold') { // poles lashed together, a cross-brace, a plank on top
    part(F, 'w.wreck', ns ? [RECT(6.8, -1, 9.2, 17)] : [RECT(1.2, 1, 3.2, 15.6), RECT(12.8, 1, 14.8, 15.6)], { prof: 'bevel', bw: .6, grp: 'poles' });
    part(F, 'w.wreck', ns ? [C([4, 3], [12, 13], .6), C([12, 3], [4, 13], .6)] : [C([2, 3], [14, 14], .6), C([14, 3], [2, 14], .6)], { bw: .5, grp: 'brace' });
    if (!ns) part(F, 'bogwood', [RECT(-1, 2, 17, 4.4)], { prof: 'bevel', bw: .6, grp: 'plank' });
    part(F, 'string', ns ? [C([6.4, 7.6], [9.6, 8.4], .5)] : [C([1, 3.4], [3.4, 4.4], .5), C([12.6, 3.4], [15, 4.4], .5)], { bw: .4, grp: 'lashing' });
    return;
  }
  // stockade: stakes set close, sharpened, a rope binding them
  const S = ns ? [[8, dir === 2 ? 3 : -3]] : [2, 6, 10, 14].map((x, i) => [x, 1.4 + ((i + w) % 2) * 1.2]);
  part(F, 'w.wreck', S.map(([x, y]) => P([[x - 1.9, 15.6], [x - 1.9, y + 2.2], [x, y], [x + 1.9, y + 2.2], [x + 1.9, 15.6]])), { prof: 'round', bw: 1.4, grp: 'stakes', tex: q => (q.y > 13 ? { m: 'w.peat', dd: -.4 } : q.y % 4 === 0 ? -.8 : 0) });
  part(F, 'leather', ns ? [C([8.4, -1], [8.4, 17], .4)] : [C([-1, 9], [17, 9.4], .5)], { prof: 'round', bw: .4, grp: 'rope' });
}
/* ---- '*' a lantern on a post (or a pole), a brazier standing on the paving, the drowned house's lit windows, the belfry's green
   lamps on the wall (2 frames) ---- */
function gloomTorch(F, Pl, v, f) {
  const k = Pl.lampK, cls = v;
  if (k === 'window' || k === 'green') {
    gloomWall(F, Pl, 0, true);
    F.add({ mat: Pl.torch, prof: 'flat', grp: 'warm', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [E([8, 8], 5.6, 5.2)], tex: q => (bayer(q.x, q.y) + (Math.hypot(q.x - 7.5, q.y - 8) / 5.6) * .9 > .55 ? -9 : -2.4 + (f ? .3 : 0)) });
    if (k === 'window') { // a small window, every pane lit
      part(F, 'w.ruin', [RECT(4, 4, 12, 13)], { prof: 'bevel', bw: .8, grp: 'frame' });
      part(F, Pl.torch, [RECT(5.2, 5.2, 10.8, 11.8)], { prof: 'flat', grp: 'glass', noShadow: true, hi: 5, tex: q => (q.y > 8 ? .6 : .1) + (f ? .3 : 0) });
      part(F, 'bogwood', [C([8, 5.2], [8, 11.8], .45), C([5.2, 8.4], [10.8, 8.4], .45)], { prof: 'flat', grp: 'mullion', noShadow: true, hi: 3, tex: () => -1 });
      return;
    }
    part(F, 'iron', [C([8, 2.6], [8, 4.8], .5), C([5.2, 3], [10.8, 3], .45)], { bw: .6, grp: 'bracket' });
    part(F, 'verdigris', [RECT(5.8, 4.6, 10.2, 11.4), P([[5.2, 5], [8, 3.4], [10.8, 5]]), RECT(6.6, 11.2, 9.4, 12.4)], { prof: 'bevel', bw: .8, grp: 'lantern' });
    part(F, Pl.torch, [RECT(6.8, 6, 9.2, 10.4)], { prof: 'flat', grp: 'glass', noShadow: true, hi: 5, tex: q => (q.y > 8 ? .8 : .2) + (f ? .3 : -.1) });
    return;
  }
  if (k === 'brazier') { // an iron fire-basket on three legs, standing on the paving
    gloomOn(F, Pl, cls, 0, [8, 14.6, 4, 1.2], [[8, 14.6, 4, 1]]);
    part(F, 'blackiron', [C([5, 8], [3.6, 15.4], .7), C([11, 8], [12.4, 15.4], .7), C([8, 8.6], [8, 15.4], .7)], { bw: .6, grp: 'legs' });
    part(F, 'blackiron', [P([[2.4, 4.6], [13.6, 4.6], [11.6, 8.8], [4.4, 8.8]])], { prof: 'bevel', bw: .8, grp: 'bowl' });
    part(F, Pl.torch, [P(f ? [[8.4, -1], [11.4, 2.6], [10.8, 5.4], [5.2, 5.4], [5, 2.4]] : [[7.4, -1.2], [10.8, 2.8], [10.8, 5.4], [5.2, 5.4], [5.6, 2]])], { bw: 1.6, grp: 'flame', noShadow: true, hi: 5, tex: q => (q.y > 2.6 ? .9 : .1) + (f ? .3 : 0) });
    return;
  }
  // a post (standing on the ground, the planks or in the water), an arm, a lantern hanging from it
  gloomOn(F, Pl, cls, 0, [9.4, 14.8, 3, 1.1], [[8, 14.6, 2, .9]]);
  part(F, 'bogwood', [RECT(6.9, 1.4, 9.1, 15.4)].concat(cls === 2 ? [] : [RECT(5.8, 14, 10.2, 15.8)]), { prof: 'bevel', bw: .7, grp: 'post', tex: q => (q.y % 5 === 0 ? -.8 : cls === 2 && q.y > 13 ? { m: 'w.fenmoss', dd: -.4 } : 0) });
  part(F, 'bogwood', [C([8, 2.4], [12.4, 2.4], .7)], { bw: .6, grp: 'arm' });
  part(F, Pl.torch, [E([12.4, 7], 3.6, 3.4)], { prof: 'flat', grp: 'warm', noShadow: true, noOutline: true, lo: 1, hi: 2, tex: q => (bayer(q.x, q.y) + Math.hypot(q.x - 12, q.y - 7) / 3.6 * .9 > .6 ? -9 : -2.2 + (f ? .3 : 0)) });
  part(F, 'iron', [C([12.4, 2.8], [12.4, 4], .35), RECT(10.6, 4.2, 14.2, 9.4), P([[10, 4.6], [12.4, 3], [14.8, 4.6]]), RECT(11.4, 9.2, 13.4, 10.4)], { prof: 'bevel', bw: .6, grp: 'lantern' });
  part(F, Pl.torch, [RECT(11.4, 5.2, 13.4, 8.8)], { prof: 'flat', grp: 'flame', noShadow: true, hi: 5, tex: q => (q.y > 6.8 ? .8 : .3) + (f ? .3 : -.1) });
}
/* ---- '+' a woven wicker door (Willowmurk), a plank door, a stone arch standing open ---- */
function gloomDoor(F, Pl, v) {
  const k = Pl.doorK;
  gloomWall(F, Pl, v, true);
  if (k === 'arch') {
    part(F, Pl.doorFrame, [P([[2.5, 16.6], [2.5, 7], [4.2, 3.6], [8, 2.2], [11.8, 3.6], [13.5, 7], [13.5, 16.6]])], { prof: 'bevel', bw: 1, grp: 'arch' });
    part(F, 'dark', [P([[4.4, 16.6], [4.4, 7.4], [5.6, 5.2], [8, 4.4], [10.4, 5.2], [11.6, 7.4], [11.6, 16.6]])], { prof: 'flat', grp: 'opening', lo: 0, hi: 1, tex: q => (q.y > 12 ? -1 : 0) });
    return;
  }
  part(F, k === 'wicker' ? 'rotwood' : 'bogwood', [RECT(3, 2.6, 13, 16.6)], { prof: 'bevel', bw: .8, grp: 'frame' });
  if (k === 'wicker') { part(F, 'w.thatch', [RECT(4.4, 4, 11.6, 16.6)], { prof: 'round', bw: .8, grp: 'leaf', tex: q => ((((q.x >> 1) + (q.y >> 1)) & 1) ? -.9 : .1) }); part(F, 'leather', [C([10.2, 9], [10.2, 11.4], .5)], { bw: .4, grp: 'thong' }); return; }
  part(F, Pl.door, [RECT(4.4, 4, 11.6, 16.6)], { prof: 'bevel', bw: .7, grp: 'leaf', tex: q => ((q.x - 4) % 3 === 0 ? -1.1 : 0) });
  part(F, 'iron', [C([4.4, 7], [10, 7], .45), C([4.4, 13.4], [10, 13.4], .45), O([10.2, 10.4], .7)], { bw: .4, grp: 'fittings', noShadow: true });
}
/* ---- 'Y' Misthollow's columns (pale, the water's line on them) and the belfry's pillars (dark): a round shaft on a square base, the
   upper shaft and capital drawn overhead; each stands on what is round it ---- */
const ruinCol = q => (q.x === 7 ? .4 : q.x === 10 ? -.6 : 0) + ((q.x * 3 + q.y * 5) % 13 === 0 ? { m: 'w.fenmoss', dd: -.5 } : 0);
function gloomMass(F, Pl, v) {
  const cls = Math.floor(v / 2), w = v & 1, dark = Pl.massK === 'pillar', m = Pl.stone;
  gloomOn(F, Pl, cls, w, [8.6, 14.4, 5.6, 1.6], [[8, 14.2, 5, 1.2]]);
  if (cls !== 2) part(F, m, [RECT(3.2, 12.4, 12.8, 15.8)], { prof: 'bevel', bw: .9, grp: 'base', tex: () => (dark ? -.7 : 0) });
  part(F, m, [RECT(4.8, -6, 11.2, cls === 2 ? 14.6 : 13)], { bw: 2.4, grp: 'shaft', tex: q => (typeof ruinCol(q) === 'object' ? ruinCol(q) : ruinCol(q) + (dark ? -.7 : 0) + (q.y > 10 ? -.6 : 0)) });
  if (dark && w) part(F, 'w.waterlight', [C([6, -2], [6, 11], .4)], { prof: 'flat', grp: 'light', noShadow: true, noOutline: true, hi: 4, tex: () => -1.6 });
}
// the overhead part of a column, 16 x 26 drawn at (0, -16): its capital a tile up, the shaft down into its own tile
function gloomMassTop(F, Pl, v) {
  const dark = Pl.massK === 'pillar', m = Pl.stone, broken = !dark && (v & 1);
  part(F, m, [RECT(4.8, broken ? 8 : 5, 11.2, 30)], { bw: 2.4, grp: 'shaft', tex: q => (typeof ruinCol(q) === 'object' ? ruinCol(q) : ruinCol(q) + (dark ? -.7 : 0)) });
  if (broken) { part(F, m, [P([[4.8, 8.4], [6.4, 5.6], [8.2, 7.4], [10, 5], [11.2, 8.4]])], { prof: 'bevel', bw: .8, grp: 'broken' }); return; }
  part(F, m, [RECT(3.4, 2.6, 12.6, 5.8)], { prof: 'bevel', bw: 1, grp: 'capital', tex: () => (dark ? -.6 : 0) });
  part(F, m, [RECT(2.4, .6, 13.6, 3)], { prof: 'bevel', bw: .8, grp: 'abacus', tex: () => (dark ? -.6 : 0) });
}
/* ---- 'f' (2 frames) fireflies over the grass, marsh-lights over a black puddle, candles, the belfry's glowing air pockets ---- */
function gloomGlow(F, Pl, v, f) {
  const k = Pl.glowK;
  if (k === 'candles') return ironGlow(F, Object.assign({}, Pl, { glowK: 'candle' }), v, f);
  gloomGround(F, Pl, v & 1, null);
  if (k === 'waterlight') { // air caught under the water, the green light in it breathing
    const B = [[5, 6, 2.2], [10.6, 10.4, 1.6], [4.4, 12, 1.1]].slice(0, 2 + (v & 1));
    part(F, Pl.water, B.map(([x, y, r]) => O([x, y], r + .9)), { prof: 'flat', grp: 'rim', noShadow: true, noOutline: true, hi: 3, tex: () => -.9 - wetOff(Pl.water) });
    part(F, Pl.glow, B.map(([x, y, r], i) => O([x, y], r * ((i + f) % 2 ? 1 : .8))), { prof: 'flat', grp: 'light', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? 0 : -.5) });
    return;
  }
  if (k === 'marshlight') { // a pale light hanging low over a black puddle, its reflection in it
    const x = 7 + v * 2, y = 5.4 + (f ? -.8 : 0), off = wetOff(Pl.puddle);
    F.add({ mat: Pl.puddle, prof: 'flat', grp: 'pool', noShadow: true, lo: 1, hi: 3, shapes: [E([x, 12.4], 4.4, 2.2)], tex: q => (q.d < .8 ? -2.4 : -2) - off });
    part(F, Pl.glow, [C([x - 1, 12.4], [x + 1, 12.4], .45)], { prof: 'flat', grp: 'shine', noShadow: true, noOutline: true, hi: 3, tex: () => (f ? -.6 : -1.1) });
    part(F, Pl.glow, [O([x, y], f ? 1.5 : 1.2)], { prof: 'round', bw: 1, grp: 'light', noShadow: true, noOutline: true, hi: 5, tex: () => (f ? .6 : .1) });
    return;
  }
  const L = (f ? [[4, 5], [11, 9], [7, 12.6]] : [[5, 3.6], [10, 10.6], [6, 11.4]]).slice(0, 2 + (v & 1));
  part(F, 'verdant', L.map(([x, y]) => O([x + .5, y + .5], .55)), { prof: 'flat', grp: 'flies', noShadow: true, noOutline: true, hi: 5, tex: () => 1 });
}
/* ---- 'k' dark earth; the belfry's dark flagstones, wet ---- */
function gloomDarkFloor(F, Pl, v) {
  const D = decals();
  for (const [x, y] of spots(2, 9400 + v * 5)) pebble(D, x, y, Pl.stone);
  if (Pl.darkK === 'wetstone') for (const [x, y] of spots(2, 9410 + v, 3)) { D.set(x, y, Pl.puddle, -2 - wetOff(Pl.puddle)); D.set(x + 1, y, Pl.puddle, -2.4 - wetOff(Pl.puddle)); }
  const wet = Pl.darkK === 'wetstone';
  ground(F, Pl.darkFloor, SEEDS['dark-floor'] + (Pl.seed || 0), D, { lo: wet ? -2 : -1.6, hi: wet ? -1.2 : -.8, dith: .3, fn: wet ? (x, y) => ((x & 7) === 0 || ((y + ((x >> 3) & 1) * 4) & 7) === 0 ? -2.4 : undefined) : null });
}
/* ---- 'r' roots over the ground (willow, the banks' trees, black bog-oak); on the flats, the great chain lying across the mud:
   0 north-south, 1 east-west, 2-5 the bends (N-E, E-S, S-W, W-N) ---- */
function gloomRoots(F, Pl, v) {
  if (Pl.rootK === 'chain') return gloomChain(F, Pl, v);
  gloomGround(F, Pl, 0, null);
  const m = Pl.rootK === 'bogoak' ? 'rotwood' : Pl.trunk, s = v & 1 ? -1 : 1, o = v % 3; // roots coming in from the north-west (or north-east), tapering, forking
  const R = [[[8 - s * 10, -2], [8 - s * 2, 5 + o], [8 + s * 5, 9], [8 + s * 10, 11 + o]], [[8 - s * 10, 4], [8 - s * 3, 10], [8 + s * 1, 17]], [[8 - s * 2, 5 + o], [8 + s * 1, 1], [8 + s * 4, -2]]];
  R.forEach((pts, k) => part(F, m, pts.slice(0, -1).map((a, i) => C(a, pts[i + 1], (k === 2 ? .8 : 1.5) - i * .35, (k === 2 ? .45 : 1.15) - i * .35)), { bw: 1, grp: 'r' + k, hi: 3, tex: q => ((q.x + q.y) % 3 === 0 ? -.8 : 0) }));
}
const chainLink = n => n === 'roots' || n === 'bridge' || n === 'stair' || n === 'water' || n === 'ford';
function chainPick(v, nb) {
  const [n, e, s, w] = nb.map(chainLink), ns = n || s, ew = e || w;
  if (ns && !ew) return 0;
  if (ew && !ns) return 1;
  if (n && e) return 2;
  if (e && s) return 3;
  if (s && w) return 4;
  if (w && n) return 5;
  return ns ? 0 : 1;
}
function gloomChain(F, Pl, shape) {
  const at = t => { // a point along the chain, t 0..1 across the tile (round a bend, an arc about the inside corner)
    if (shape < 2) return shape === 0 ? [8, -1 + t * 18] : [-1 + t * 18, 8];
    const c = BEND_AT[shape - 2], a = Math.atan2(8 - c[1], 8 - c[0]) - Math.PI / 4 + t * Math.PI / 2;
    return [c[0] + Math.cos(a) * 8, c[1] + Math.sin(a) * 8];
  };
  gloomGround(F, Pl, 0, D => { for (let i = 0; i <= 32; i++) { const [x, y] = at(i / 32); D.set(x + .6, y + 1.4, 'w.mudtrack', -1.7); } }); // the trough it has pressed in the mud
  const flat = [], edge = [];
  for (let i = 0; i < 6; i++) { // the links alternate: one lying flat (a ring), the next on its edge (a bar)
    const t = (i + .5) / 6, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + .04)), a = Math.atan2(y2 - y, x2 - x), u = [Math.cos(a), Math.sin(a)];
    if (i % 2) edge.push(C([x - u[0] * 2, y - u[1] * 2], [x + u[0] * 2, y + u[1] * 2], .85));
    else flat.push(P([0, 1, 2, 3, 4, 5, 6, 7].map(j => { const b = j * Math.PI / 4, px = Math.cos(b) * 2.7, py = Math.sin(b) * 1.9; return [x + u[0] * px - u[1] * py, y + u[1] * px + u[0] * py]; })));
  }
  const rust = q => (hash(q.x, q.y, 9460) < .25 ? { m: 'rust', dd: -.8 } : 0);
  part(F, 'iron', flat, { prof: 'round', bw: .8, grp: 'flat', hi: 3, cuts: flat.map(p => { const cx = p.pts.reduce((s2, q) => s2 + q[0], 0) / 8, cy = p.pts.reduce((s2, q) => s2 + q[1], 0) / 8; return E([cx, cy], 1.1, .8); }), tex: rust });
  part(F, 'iron', edge, { prof: 'round', bw: .7, grp: 'edge', hi: 3, tex: rust });
}
/* ---- 'x' deep black water; a hole through the rotten planks (Bogmire) or the boardwalk's broken gap, the black water under it; the
   dark under the belfry's floor ---- */
function gloomVoid(F, Pl, v) {
  const k = Pl.voidK;
  if (k === 'dark') return paintVoid(F, Pl);
  const w = Pl.water, off = wetOff(w);
  F.add({ mat: w, prof: 'flat', grp: 'deep', noShadow: true, lo: 1, hi: 2, shapes: [FULL], tex: q => -3 - off + (hash(q.x, q.y, 9600 + v) < .03 ? .8 : 0) });
  if (k === 'gap') part(F, Pl.gapMat || Pl.floor, [P([[-1, -1], [5, -1], [3.4, 2.6], [1.4, 1.2], [-1, 3]]), P([[11, 17], [17, 17], [17, 13], [14.4, 14.6], [12.6, 13.4]])], { prof: 'flat', grp: 'ends', hi: 3, tex: q => (q.y < 8 ? -.4 : -1.2) });
}
/* ---- '^' a cut earth bank or a peat bank, roots in it; the causeway's retaining wall ---- */
function gloomCliff(F, Pl, v) {
  if (Pl.cliffK === 'masonry') return sunWall(F, Object.assign({}, Pl, { wallK: 'ashlar', wall: Pl.cliff, cap: Pl.cliff }), v, true);
  F.add({ mat: 'w.loam', prof: 'flat', grp: 'face', noShadow: true, lo: 1, hi: 3, shapes: [FULL], tex: q => { const n = pnoise(q.x / 4, q.y / 8, 4, 9700 + v, 2), band = ((q.y + Math.round(Math.sin((q.x + v * 5) / 3))) >> 2) & 1; return band ? { m: Pl.cliff, dd: -.6 + n * .8 } : -1.2 + n * 1 + bayer(q.x, q.y) * .3; } });
  part(F, 'bark', [[3, -1, 2.4, 9], [9, -1, 10, 6], [13, -1, 13.6, 11]].map(([a, b, c, d]) => C([a, b], [c, d], .6, .35)), { bw: .5, grp: 'roots', hi: 3 });
  part(F, Pl.stone, [E([6 + v * 3, 11], 1.8, 1.3)], { bw: 1, grp: 'stone', hi: 3 });
}

const GLOOM_SPEC = Object.assign({}, IRON_SPEC, {
  grass: { n: 5, paint: gloomGround },
  flowers: { n: 3, paint: gloomScatter },
  'tall-grass': { n: 2, paint: gloomTall, over: { n: 2, w: 16, h: 16, dx: 0, dy: 0, paint: gloomTallTops } },
  road: { n: 3, shapes: 7, pickV: ironRoadPick, paint: (F, Pl, v) => gloomRoad(F, Pl, v, null) },
  flagstone: { n: 3, paint: (F, Pl, v) => gloomFlags(F, Pl, v, null) },
  floor: { n: 3, paint: gloomFloor },
  mud: { n: 2, paint: gloomBog },
  ichor: { n: 2, anim: true, paint: gloomBubbles },
  water: { n: 4, anim: true, paint: gloomWater },
  ford: { n: 2, anim: true, paint: gloomFord },
  tree: { n: 2, shapes: ON_SHAPES, pickV: onPick(2), paint: gloomTreeBase, over: { n: 3, w: 24, h: 26, dx: -4, dy: -16, paint: gloomTreeTop } },
  bush: { n: 2, shapes: ON_SHAPES, pickV: onPick(2), paint: gloomBush },
  rock: { n: 2, shapes: ON_SHAPES, pickV: onPick(2), paint: gloomRock },
  wall: { n: 2, faces: true, paint: (F, Pl, v) => gloomWall(F, Pl, v >> 1, !(v & 1)) },
  roof: { n: 1, paint: paintRoofBase, roof: true, roofPaint: gloomRoof },
  palisade: { n: 2, shapes: 3 * ON_SHAPES, pickV: (v, nb) => standOn(nb) * 6 + fencePick(v, nb), paint: gloomFence },
  'torch-wall': { n: 1, anim: true, shapes: ON_SHAPES, pickV: onPick(1), paint: gloomTorch },
  door: { n: 1, paint: gloomDoor },
  'first-root': { n: 2, shapes: ON_SHAPES, pickV: onPick(2), paint: gloomMass, over: { n: 2, w: 16, h: 26, dx: 0, dy: -16, paint: gloomMassTop } },
  fungus: { n: 2, anim: true, paint: gloomGlow },
  'dark-floor': { n: 3, paint: gloomDarkFloor },
  roots: { n: 2, shapes: 3, pickV: chainPick, paint: gloomRoots },
  void: { n: 1, paint: gloomVoid },
  cliff: { n: 2, paint: gloomCliff },
  ledge: { n: 2, paint: sunLedge },
  bridge: SPEC.bridge,
  stair: SPEC.stair,
});
// which tiles meet which in a Gloomfen place (cell() reads these instead of EDGED there): the water draws no bank toward a
// plank way (a palette's `decks`, bridges, doors and stairs) or anything solid (a pile, a snag, a wall rising out of it, a
// tree at its edge); the plank ways and duckboards draw their own edge ('deck') toward the water and the open ground
function gloomEdged(Pl) {
  const wet = id => famOf(id) === 'water' || (Pl.rockK === 'pile' && id === 'rock');
  const deck = id => Pl.decks.includes(id) || id === 'bridge' || id === 'door' || id === 'stair' || (id === 'flowers' && Pl.scatK === 'pots');
  const thing = id => !!(TILES[id] && TILES[id].solid) && !wet(id);
  const onDeck = id => deck(id) || thing(id);
  return Object.assign({}, IRON_EDGED, {
    water: { same: id => wet(id) || deck(id) || thing(id) },
    ford: { same: id => wet(id) || deck(id) || thing(id) },
    mud: { same: id => id === 'mud' || id === 'ichor' || wet(id) || onDeck(id) },
    ichor: { same: id => id === 'mud' || id === 'ichor' || wet(id) || onDeck(id) },
    bridge: Pl.bridgeK === 'duck' ? { same: onDeck } : { same: id => id === 'bridge' || !(wet(id) || id === 'cliff') },
    road: Pl.decks.includes('road') ? { same: onDeck } : EDGED.road,
    floor: { same: onDeck },
    flagstone: Pl.decks.includes('flagstone') ? { same: onDeck } : IRON_EDGED.flagstone,
  });
}
// the edge families a Gloomfen palette bakes, over the usual ones (a lantern post or a brazier is not a wall: no rim)
const gloomEdgeFams = Pl => Object.assign({ mud: 'patch', ichor: 'patch' }, Object.fromEntries(Pl.decks.map(id => [id, 'deck'])),
  Pl.bridgeK === 'duck' ? { bridge: 'deck' } : {}, Pl.lampK === 'post' || Pl.lampK === 'brazier' ? { 'torch-wall': null } : {});

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
    const s0 = specOf(biome, id), s = s0 || SPEC.void, frames = s.anim ? TILE_FRAMES : 1, nv = variantsOf(s0);
    base[id] = [];
    for (let v = 0; v < nv; v++) { base[id][v] = []; for (let f = 0; f < frames; f++) base[id][v][f] = add(`b|${id}|${v}|${f}`, T, T, F => (s.paint || paintVoid)(F, Pl, v, f, biome)); }
    if (s.over) { overs[id] = []; for (let v = 0; v < s.over.n; v++) overs[id][v] = add(`o|${id}|${v}`, s.over.w, s.over.h, F => s.over.paint(F, Pl, v, biome)); }
    if (s.roof) { roofs[id] = []; for (let m = 0; m < 16; m++) roofs[id][m] = add(`r|${id}|${m}`, T, T, F => (s.roofPaint || paintRoof)(F, Pl, m & 1 ? 1 : 0, m)); }
  }
  const EDGE_FAMS = { water: 'water', ford: 'water', road: 'road', cliff: 'cliff', wall: 'wall', 'torch-wall': 'wall', 'root-wall': 'wall', bridge: 'bridge', ichor: 'ichor' };
  if (Pl.iron) Object.assign(EDGE_FAMS, ironEdgeFams(Pl));
  if (Pl.gloom) Object.assign(EDGE_FAMS, gloomEdgeFams(Pl));
  for (const id in EDGE_FAMS) if (!EDGE_FAMS[id]) delete EDGE_FAMS[id];
  const famFrames = { water: 1, road: 1, cliff: 1, wall: 1, bridge: 1, ichor: 1, drift: 1, patch: 1, carpet: 1, drop: 1, scree: 1, deck: 1 };
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
  const idOfCh = ch => tileOf(ch).id, edged = GLOOM_BIOMES.has(key) ? gloomEdged(palOf(key)) : IRON_BIOMES.has(key) ? IRON_EDGED : EDGED;
  const pick = (id, x, y) => { const s = specOf(key, id); const n = s ? s.n : 1; return Math.floor(hash(x, y, 97 + TILE_IDS.indexOf(id)) * n) % n; };
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
      const s = specOf(key, tileId);
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
      const id = idAt(x, y) || 'void', s = specOf(key, id) || SPEC.void;
      const nb = [idAt(x, y - 1), idAt(x + 1, y), idAt(x, y + 1), idAt(x - 1, y)].map(n => n || id);
      const out = { ground: [], over: [] };
      let v = pick(id, x, y);
      if (s.pickV) v = s.pickV(v, nb);
      else if (s.faces) {
        if (id === 'wall') v = v * 2 + (famOf(nb[2]) === 'wall' ? 1 : 0);                               // top when a wall is below
        else if (id === 'palisade') v = v * 2 + (nb[0] === 'palisade' ? 1 : 0);                         // no tips under another log
        else if (id === 'root-wall') v = v * 2 + (nb[2] === 'root-wall' || nb[2] === 'first-root' ? 1 : 0); // a lit face where a tunnel opens below
        else if (id === 'bridge') { // planks lie across the way: an east-west crossing gets vertical planks
          const walk = n => n === 'bridge' || EDGED.road.same(n) || (famOf(n) !== 'water' && n !== 'cliff' && !(TILES[n] && TILES[n].solid));
          v = v * 2 + ((walk(nb[1]) || walk(nb[3])) && !(walk(nb[0]) || walk(nb[2])) ? 1 : 0);
        }
      }
      if (id === 'first-root' && s.shapes && !s.pickV) { // grain follows the mass: a trunk runs north-south, a root east-west, a knot where it turns
        const Y = n => n === 'first-root', c = nb.filter(Y).length, ns = Y(nb[0]) || Y(nb[2]), ew = Y(nb[1]) || Y(nb[3]);
        v = v + 2 * (c >= 3 ? 2 : ns && !ew ? 2 : ew && !ns ? 1 : c === 2 ? 2 : 0);
      }
      const f = TILES[id] && TILES[id].anim ? frame & 1 : 0;
      const bk = B.base[id][Math.min(B.base[id].length - 1, v)][f];
      const br = rect(bk); out.ground.push([br[0], br[1], T, T, 0, 0]);
      const fam = B.EDGE_FAMS[id];
      if (fam && edged[id === 'torch-wall' ? 'wall' : id]) {
        const same = edged[id === 'torch-wall' ? 'wall' : id].same;
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
