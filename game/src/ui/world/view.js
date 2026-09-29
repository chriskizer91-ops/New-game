// The world renderer (M3 spec §5.3): baked ground chunks, y-sorted sprites, overhead chunks, the
// darkness layer and emotes, within 40 drawImage calls per frame.
// Exports: createView(canvas, { reduced }) -> {
//   resize(cssW, cssH, dpr, coarse, zoom, basis) -> { s, w, h, cssW, cssH }   integer art-px scale (§5.2)
//   setMap(game, mapId)       bake (or reuse) the map: 256 px ground chunks, 2 frames where animated,
//                             static objects baked in, overhead chunks (canopies, roofs, grass tops)
//   refresh(game)             re-bake only the chunks whose objects changed state
//   setDark(on, leaderX, leaderY, radius, lights)   the darkness canvas, redrawn only when this changes
//   draw(list, n, emotes, ne, now) -> drawImage count     one frame (allocates nothing)
//   setPlates([{ key, name, sub, title, x, y }])    DOM nameplates over the canvas (art px anchors)
//   tileAt(clientX, clientY) -> [tx, ty] | null
//   camera, fade (0..1), map (the baked map), destroy()
// }
// Painted maps (M5 spec A10): a map listed in ui/assets/paint/ draws its painting as its ground (the
// objects on top as usual) and its overhead layer takes the painting's pixels wherever the tiles' own
// overhead layer would draw (a map traced from its painting, `overTiles: false`, has none) and over the
// map's `overhang` rects (tiles a painted canopy or eave hangs over),
// so the party passes behind the same canopies and roofs. A painted map draws at PAINT_DENSITY canvas px
// per art px, so the painting keeps its detail while every sprite stays whole art px. Every other map,
// and a painted one until its image has decoded, draws its tiles.
// Sprite records (filled by ui/world/actors.js): { img, sx, sy, sw, sh, dx, dy, ys, alpha, fx, fxA, fxB, fxC, col, show }
//   fx: 0 none, 1 relic glint (fxA, fxB = offset, fxC = phase ms), 3 count pips (fxA = n), 4 chest twinkle.
//   `show` false skips the record.
// Owner: WP7.

import { tileAtlas, objectSprite, emote as emoteArt, OBJECT_KINDS } from '../../art/index.js';
import { lockStatus } from '../../rules/world.js';
import { tileOf } from '../../data/tiles.js';
import { LOCKS } from '../../data/locks.js';
import { present, mapOf } from '../../rules/world.js';
import { storyOf } from '../../rules/cond.js';
import { el } from '../lib/dom.js';
import { PAINTINGS } from '../assets/paint/index.js';
import { TILE, CHUNK, ANIM_FLIP_MS, GLINT_MS } from './constants.js';
import { createCamera, backingSize, scaleFor } from './camera.js';

// ---- caches that outlive a mount ------------------------------------------------------------------

export function canvasOf(img, w, h) {
  const c = document.createElement('canvas');
  c.width = w || img?.width || 1; c.height = h || img?.height || 1;
  if (img) c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

const ATLAS = new Map();
function atlasFor(biome) {
  let a = ATLAS.get(biome);
  if (!a) {
    const atlas = tileAtlas(biome);
    a = { atlas, canvas: canvasOf(atlas.img), cell: typeof atlas.cell === 'function', edge: typeof atlas.edge === 'function' };
    ATLAS.set(biome, a);
  }
  return a;
}

const KNOWN = new Set(OBJECT_KINDS || []);
const FALLBACK_KIND = { 'tally-seal': 'sign', 'rot-knot': 'bramble', door: 'gate', table: 'board', 'barred-gate': 'gate', stream: 'ford-ice' };
const OBJ = new Map();
// An object sprite as canvases, one per animation frame, with its foot anchor (art/map-sprites.js
// objectSprite: the foot goes on the bottom-centre of the entity's tile; tall objects rise upward).
export function objSprite(kind, state, opts = {}) {
  const k = `${kind}|${state || ''}|${opts.id || ''}|${opts.look || ''}|${opts.relic ? opts.relic.uid + ':' + (opts.relic.temper || 0) : ''}`;
  let o = OBJ.get(k);
  if (!o) {
    const use = KNOWN.has(kind) ? kind : (FALLBACK_KIND[kind] || 'sign');
    const frames = [];
    let foot = null;
    for (let f = 0; f < 2; f++) {
      let img = null;
      try { img = objectSprite(use, state || null, { frame: f, relic: opts.relic || null, id: opts.id || null, look: opts.look || null }); } catch { img = null; }
      if (!img) break;
      frames.push(canvasOf(img));
      foot = img.anchors?.foot || [img.width >> 1, img.height - 1];
      if (!(img.frames > 1)) break;
    }
    if (!frames.length) { frames.push(canvasOf(null, 16, 16)); foot = [8, 15]; }
    o = { frames, foot, w: frames[0].width, h: frames[0].height };
    OBJ.set(k, o);
  }
  return o;
}
export const objCanvas = (kind, state, opts) => objSprite(kind, state, opts).frames[0];
const EMO = new Map();
// An emote's frames and foot anchor (the foot goes on the sprite's head anchor).
export function emoteSprite(kind) {
  let o = EMO.get(kind);
  if (!o) {
    const frames = [];
    let foot = null;
    for (let f = 0; f < 2; f++) {
      let img = null;
      try { img = emoteArt(kind, { frame: f }); } catch { img = null; }
      if (!img) break;
      frames.push(canvasOf(img));
      foot = img.anchors?.foot || [img.width >> 1, img.height - 1];
      if (!(img.frames > 1)) break;
    }
    if (!frames.length) { frames.push(canvasOf(null, 8, 8)); foot = [4, 7]; }
    o = { frames, foot };
    EMO.set(kind, o);
  }
  return o;
}
export const emoteCanvas = kind => emoteSprite(kind).frames[0];

// A painting decodes when its map is first baked (the map's fade-in covers the wait; until it is ready the
// map draws its tiles). The last PAINT_KEEP maps' paintings stay decoded: more than the two baked maps
// BAKED keeps, so a baked map's painting is never let go.
const PAINT = new Map(); // mapId -> { img, ready }, the most recently used last
const PAINT_KEEP = 4;
function paintOf(id) {
  if (!Object.prototype.hasOwnProperty.call(PAINTINGS, id) || typeof Image === 'undefined') return null;
  let p = PAINT.get(id);
  if (p) { PAINT.delete(id); PAINT.set(id, p); return p; }
  p = { img: new Image(), ready: false };
  p.img.onload = () => { p.ready = p.img.naturalWidth > 0; };
  p.img.src = PAINTINGS[id].src;
  PAINT.set(id, p);
  while (PAINT.size > PAINT_KEEP) {
    const [k, old] = PAINT.entries().next().value;
    PAINT.delete(k);
    old.ready = false;
    old.img.onload = null;
    old.img.removeAttribute('src');
  }
  return p;
}
const paintImg = B => (B.paint && B.paint.ready ? B.paint.img : null);
// canvas px per art px on a painted map (the paintings are stored at this many px per art px: 32 per tile)
export const PAINT_DENSITY = 2;

const BAKED = new Map(); // mapId -> baked map; the current and the previous map stay (§5.3)
function remember(id, B) {
  BAKED.delete(id); BAKED.set(id, B);
  while (BAKED.size > 2) BAKED.delete(BAKED.keys().next().value);
}

// ---- what a map entity looks like on the ground ---------------------------------------------------

// What a lock looks like (art/map-sprites.js OBJECT_KINDS and OBJECT_STATES): shut, then open.
const LOCK_KIND = {
  thornwall: 'thornwall', bramble: 'bramble', boulder: 'boulder', 'barred-gate': 'barred-gate',
  'rope-ledge': 'rope', 'tally-seal': 'tally-seal', 'rot-knot': 'rot-knot',
  // M4: the Sunscorch locks (art/map-sprites.js draws them under the same names)
  'dune-glass': 'dune-glass', mirage: 'mirage', quicksand: 'quicksand', 'vault-seal': 'vault-seal',
  // M5: the Ironspire's hard locks (the snowdrift is soft: its `m` tiles carry the look)
  chasm: 'chasm', ice: 'ice', 'rune-seal': 'rune-seal',
};
// M4.5: road gates also look like the obstacle their guard keeps (docs/M45-SPEC.md §3)
const GATE_KIND = { gate: 'gate', chain: 'chain', crownwall: 'crownwall', door: 'door', 'vault-door': 'vault-door',
  bramble: 'bramble', 'rot-knot': 'rot-knot', thornwall: 'thornwall', boulder: 'boulder', 'barred-gate': 'barred-gate', 'dune-glass': 'dune-glass',
  'ice-blocks': 'ice-blocks', 'frozen-door': 'frozen-door' }; // M5: the Frost Road's sledge barricade, the drowned chapel's door
const FORD_BY = { 'stillwater-lance': 'ice', rootsong: 'roots' };
const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];

function objectFor(game, e, map = null) {
  switch (e.kind) {
    case 'chest': {
      if (e.hidden) return null;
      if (e.state === 'opened') return { kind: 'chest', state: 'open' };
      return { kind: 'chest', state: e.lock ? (e.lock === 'tally-seal' ? 'sealed' : 'locked') : 'closed' };
    }
    case 'sign': return e.look === 'painted' ? null : { kind: 'sign', state: e.look || null }; // M5: a painted map's own stone or pool
    case 'board': return { kind: 'board', state: e.opens === 'ladder' ? 'ladder' : 'bounties' };
    case 'table': case 'lookout': return { kind: e.kind, state: null };
    case 'bellframe':
      // M5: Peak's Veil's bell rope is a bell-frame with its own look (a sign look in art/map-sprites.js)
      if (e.look === 'bell-rope') return { kind: 'sign', state: 'bell-rope' };
      return { kind: 'bellframe', state: storyOf(game)[e.flag || 'bell-rung'] ? 'rung' : 'empty' };
    case 'pedestal': {
      const claimed = !!game.codex?.[e.relic]?.claimed;
      const item = claimed ? (game.inventory || []).find(i => i.base === e.relic && !i.shattered) : null;
      return { kind: 'pedestal', state: claimed ? 'lit' : 'unlit', relic: item || null };
    }
    case 'hearthfire': return { kind: 'hearth', state: e.state === 'cold' ? 'cold' : 'lit', id: e.id };
    case 'gate': return { kind: GATE_KIND[e.look] || 'gate', state: e.state === 'open' ? 'open' : 'closed' };
    case 'lock': {
      const L = LOCKS[e.lock];
      if (!L || L.soft) return null;
      const open = e.state === 'open';
      if (e.lock === 'stream') {
        if (!open) return { kind: 'stream', state: null };
        let by = null;
        try { by = lockStatus(game, 'stream').by; } catch { by = null; }
        return { kind: 'ford-ice', state: FORD_BY[by] || 'stream' };
      }
      // a chasm on the frozen lake is broken floes over black water (M5)
      const look = e.look || (e.lock === 'chasm' && map?.biome === 'frozen-lake' ? 'floes' : null);
      return { kind: LOCK_KIND[e.lock] || 'sign', state: open ? 'open' : 'closed', look };
    }
    case 'prop': return e.prop && e.prop !== 'deer' ? { kind: e.prop, state: null } : null;
    default: return null;
  }
}

function bakedEntities(game, map) {
  const out = [];
  for (const e of present(game, map.id)) {
    const o = objectFor(game, e, map);
    if (!o) continue;
    out.push({ id: e.id, kind: o.kind, state: o.state, opts: { relic: o.relic || null, id: o.id || null, look: o.look || null }, area: areaOf(e),
      sig: `${o.kind}:${o.state || ''}:${o.id || ''}:${o.look || ''}:${o.relic ? o.relic.uid + (o.relic.temper || 0) : ''}` });
  }
  return out;
}

const vhash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const EDGE_TILES = new Set(['water', 'road', 'cliff']);

function makeBaked(map, { painted = true } = {}) {
  const A = atlasFor(map.biome);
  const w = map.w, h = map.h, ids = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ids[y * w + x] = tileOf(map.rows[y]?.[x]).id;
  const cols = Math.max(1, Math.ceil((w * TILE) / CHUNK)), rows = Math.max(1, Math.ceil((h * TILE) / CHUNK));
  const paint = painted ? paintOf(map.id) : null;
  return { id: map.id, map, A, w, h, ids, cols, rows, pw: w * TILE, ph: h * TILE, ground: new Array(cols * rows), over: new Array(cols * rows), ents: [], sigs: new Map(), dark: null, darkKey: '',
    paint, painted: false, k: paint ? PAINT_DENSITY : 1 };
}

// Whether an entity's sprite reaches into the tile rect [tx0, tx1) x [ty0, ty1): its foot sits on each covered
// tile's bottom-centre, and a big sprite (M5's Hush, 112 px wide) reaches several tiles past its own.
function entReaches(o, tx0, ty0, tx1, ty1) {
  const S = objSprite(o.kind, o.state, o.opts), c = S.frames[0];
  const [x0, y0, x1, y1] = o.area;
  const left = x0 * TILE + TILE / 2 - S.foot[0], top = y0 * TILE + TILE - 1 - S.foot[1];
  const right = x1 * TILE + TILE / 2 - S.foot[0] + c.width, bottom = y1 * TILE + TILE - 1 - S.foot[1] + c.height;
  return right > tx0 * TILE && left < tx1 * TILE && bottom > ty0 * TILE && top < ty1 * TILE;
}

// The painting's own pixels for an art-px rect of the map (a painting may be stored at any density).
function paintRect(B, P, x, y, w, h) {
  const pk = P.naturalWidth / B.pw;
  return [x * pk, y * pk, w * pk, h * pk];
}

// Draw one entity object onto a chunk: its foot on each covered tile's bottom-centre.
function drawEnt(g, o, tx0, ty0, frame) {
  const S = objSprite(o.kind, o.state, o.opts);
  const c = S.frames[Math.min(frame, S.frames.length - 1)];
  const [x0, y0, x1, y1] = o.area;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) g.drawImage(c, (x - tx0) * TILE + TILE / 2 - S.foot[0], (y - ty0) * TILE + TILE - 1 - S.foot[1]);
  }
}

function bakeChunk(B, ci) {
  const { A, w, h, ids } = B, cx = ci % B.cols, cy = (ci / B.cols) | 0;
  const tx0 = cx * (CHUNK / TILE), ty0 = cy * (CHUNK / TILE);
  const tx1 = Math.min(w, tx0 + CHUNK / TILE), ty1 = Math.min(h, ty0 + CHUNK / TILE);
  const pw = (tx1 - tx0) * TILE, ph = (ty1 - ty0) * TILE;
  const ents = B.ents.filter(o => entReaches(o, tx0, ty0, tx1, ty1));
  const P = paintImg(B);
  let anim = ents.some(o => objSprite(o.kind, o.state, o.opts).frames.length > 1);
  if (!P) for (let y = ty0; y < ty1 && !anim; y++) for (let x = tx0; x < tx1; x++) if (A.atlas.frames(ids[y * w + x]) > 1) { anim = true; break; }
  const old = B.ground[ci] || [], k = B.k;
  const out = [];
  for (let f = 0; f < (anim ? 2 : 1); f++) {
    const c = old[f] && old[f].width === pw * k && old[f].height === ph * k ? old[f] : canvasOf(null, pw * k, ph * k);
    const g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, pw, ph);
    if (P) g.drawImage(P, ...paintRect(B, P, tx0 * TILE, ty0 * TILE, pw, ph), 0, 0, pw, ph);
    for (let y = ty0; y < ty1 && !P; y++) {
      for (let x = tx0; x < tx1; x++) {
        const dx0 = (x - tx0) * TILE, dy0 = (y - ty0) * TILE;
        if (A.cell) {
          // the atlas knows the whole cell: base variant, edge overlay, inner corners (art/tiles.js cell())
          const ops = A.atlas.cell(B.map.rows, x, y, f).ground;
          for (const o of ops) g.drawImage(A.canvas, o[0], o[1], o[2], o[3], dx0 + o[4], dy0 + o[5], o[2], o[3]);
          continue;
        }
        const id = ids[y * w + x];
        const nv = Math.max(1, A.atlas.variants(id) | 0), v = vhash(x, y) % nv;
        const fr = Math.min(f, Math.max(1, A.atlas.frames(id)) - 1);
        const at = A.atlas.at(id, v, fr);
        const dx = dx0, dy = dy0;
        g.drawImage(A.canvas, at[0], at[1], TILE, TILE, dx, dy, TILE, TILE);
        if (A.edge && EDGE_TILES.has(id)) {
          const m = (y > 0 && ids[(y - 1) * w + x] !== id ? 1 : 0) | (x < w - 1 && ids[y * w + x + 1] !== id ? 2 : 0)
            | (y < h - 1 && ids[(y + 1) * w + x] !== id ? 4 : 0) | (x > 0 && ids[y * w + x - 1] !== id ? 8 : 0);
          const e = m ? A.atlas.edge(id, m, fr) : null;
          if (e) g.drawImage(A.canvas, e[0], e[1], TILE, TILE, dx, dy, TILE, TILE);
        }
      }
    }
    for (const o of ents) drawEnt(g, o, tx0, ty0, f);
    out.push(c);
  }
  B.ground[ci] = out;
}

function bakeOver(B, ci) {
  const { A, w, h, ids } = B, cx = ci % B.cols, cy = (ci / B.cols) | 0;
  const tx0 = cx * (CHUNK / TILE), ty0 = cy * (CHUNK / TILE);
  const tx1 = Math.min(w, tx0 + CHUNK / TILE), ty1 = Math.min(h, ty0 + CHUNK / TILE);
  let c = null, g = null;
  const k = B.k;
  const pen = () => {
    if (!c) { c = canvasOf(null, (tx1 - tx0) * TILE * k, (ty1 - ty0) * TILE * k); g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = false; }
    return g;
  };
  // a painted map's overhang: walkable tiles under a painted canopy or eave, drawn over the party
  if (B.paint) {
    for (const [x0, y0, x1, y1] of B.map.overhang || []) {
      const a = Math.max(x0, tx0), b = Math.max(y0, ty0), a1 = Math.min(x1 + 1, tx1), b1 = Math.min(y1 + 1, ty1);
      if (a < a1 && b < b1) { pen().fillStyle = '#000'; pen().fillRect((a - tx0) * TILE, (b - ty0) * TILE, (a1 - a) * TILE, (b1 - b) * TILE); }
    }
  }
  // a map traced from its painting (`overTiles: false`) has no tile canopies: only its overhang draws over
  if (B.paint && B.map.overTiles === false) { B.over[ci] = paintOver(B, c, tx0, ty0); return; }
  if (A.cell) {
    // overhead ops reach up to 16 px up and 4 px sideways: visit the row below and a column each side
    for (let y = ty0; y <= Math.min(h - 1, ty1); y++) {
      for (let x = Math.max(0, tx0 - 1); x <= Math.min(w - 1, tx1); x++) {
        const ops = A.atlas.cell(B.map.rows, x, y, 0).over;
        if (!ops.length) continue;
        const dx0 = (x - tx0) * TILE, dy0 = (y - ty0) * TILE;
        for (const o of ops) pen().drawImage(A.canvas, o[0], o[1], o[2], o[3], dx0 + o[4], dy0 + o[5], o[2], o[3]);
      }
    }
    B.over[ci] = paintOver(B, c, tx0, ty0);
    return;
  }
  // an atlas without cell(): the tree cell again over the row above, roofs, and the bottom of tall grass
  for (let y = ty0; y < ty1; y++) {
    for (let x = tx0; x < tx1; x++) {
      const id = ids[y * w + x], below = y + 1 < h ? ids[(y + 1) * w + x] : null;
      const dx = (x - tx0) * TILE, dy = (y - ty0) * TILE;
      if (below === 'tree') {
        const at = A.atlas.at('tree', vhash(x, y + 1) % Math.max(1, A.atlas.variants('tree') | 0), 0);
        pen().drawImage(A.canvas, at[0], at[1], TILE, TILE, dx, dy, TILE, TILE);
      }
      if (id === 'roof' || id === 'tall-grass') {
        const at = A.atlas.at(id, vhash(x, y) % Math.max(1, A.atlas.variants(id) | 0), 0);
        if (id === 'roof') pen().drawImage(A.canvas, at[0], at[1], TILE, TILE, dx, dy, TILE, TILE);
        else pen().drawImage(A.canvas, at[0], at[1] + 9, TILE, 7, dx, dy + 9, TILE, 7); // grass over the feet
      }
    }
  }
  B.over[ci] = paintOver(B, c, tx0, ty0);
}

// A painted map's overhead layer: the painting, cut to the shape the tiles' overhead layer has.
function paintOver(B, c, tx0, ty0) {
  const P = paintImg(B);
  if (!P || !c) return c;
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.drawImage(P, ...paintRect(B, P, tx0 * TILE, ty0 * TILE, c.width / B.k, c.height / B.k), 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  return c;
}

// The ground chunks an object's sprite reaches (the ones bakeChunk draws it on).
function chunksOf(B, o) {
  const out = new Set(), C = CHUNK / TILE;
  for (let cy = 0; cy < B.rows; cy++) {
    for (let cx = 0; cx < B.cols; cx++) {
      if (entReaches(o, cx * C, cy * C, Math.min(B.w, cx * C + C), Math.min(B.h, cy * C + C))) out.add(cy * B.cols + cx);
    }
  }
  return out;
}

// Tools only (tools/map-shots.mjs, the painters' layout references): the whole map as one canvas at
// 1 art px per px, without actors. keep(object) picks the baked objects to draw; over: the overhead
// layer on top; pad [top, right, bottom, left] tiles carries the edge's ground, water and roads
// outward and fills the rest with `fill` (then no objects).
const PAD_CARRY = new Set(['=', 'b', '~', 'w', '.', ',', '"', 'm', ':']);
export function mapImage(game, mapId, { keep = () => true, over = true, pad = null, fill = '.' } = {}) {
  let map = mapOf(mapId);
  if (!map) return null;
  if (pad) {
    const [t, r, b, l] = pad;
    const out = ch => (PAD_CARRY.has(ch) ? ch : fill);
    const row = s => out(s[0]).repeat(l) + s + out(s[s.length - 1]).repeat(r);
    const rows = map.rows.map(row), edge = s => [...s].map(out).join('');
    map = { ...map, id: `${map.id}#pad`, w: map.w + l + r, h: map.h + t + b, entities: [],
      rows: [...Array(t).fill(edge(rows[0])), ...rows, ...Array(b).fill(edge(rows[rows.length - 1]))] };
    keep = () => false;
  }
  const B = makeBaked(map, { painted: false }); // a layout reference is drawn from the tiles, never from a painting
  B.ents = bakedEntities(game, map).filter(o => keep(o));
  const c = canvasOf(null, B.pw, B.ph), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const at = i => [(i % B.cols) * CHUNK, ((i / B.cols) | 0) * CHUNK];
  for (let i = 0; i < B.ground.length; i++) { bakeChunk(B, i); bakeOver(B, i); g.drawImage(B.ground[i][0], ...at(i)); }
  if (over) for (let i = 0; i < B.over.length; i++) if (B.over[i]) g.drawImage(B.over[i], ...at(i));
  return c;
}

// A pixel-stepped light hole of radius r (art px): solid inside, then two dithered rings.
const HOLES = new Map();
function holeCanvas(r) {
  let c = HOLES.get(r);
  if (c) return c;
  const n = r * 2 + 1, img = new ImageData(n, n), d = img.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dist = Math.hypot(x - r, y - r), k = (y * n + x) * 4;
    let a = 0;
    if (dist <= r - 7) a = 255;
    else if (dist <= r - 3) a = (x + y) & 1 ? 255 : 170;
    else if (dist <= r) a = (x + y) & 1 ? 120 : 0;
    d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = a;
  }
  c = canvasOf(img);
  HOLES.set(r, c);
  return c;
}

// ---- the view ------------------------------------------------------------------------------------------

export function createView(canvas, { reduced = false, plateHost = null } = {}) {
  const g = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
  const camera = createCamera();
  const size = { s: 3, w: 1, h: 1, cssW: 1, cssH: 1, dpr: 1, d: 1 };
  let sized = null; // the last resize() arguments, to size again when the density changes
  let B = null;
  const plates = [];
  let plateX = NaN, plateY = NaN, plateK = NaN;

  // basis: the CSS width the scale rule reads (touch screens pass their shorter side, so a phone
  // turned sideways keeps the portrait pixel size instead of zooming in)
  // size.w, size.h: the view in art px; the canvas holds size.d canvas px per art px (PAINT_DENSITY on a
  // painted map, else 1), drawn in art px through the context's transform
  function resize(cssW, cssH, dpr = 1, coarse = false, zoom = 1, basis = cssW) {
    sized = [cssW, cssH, dpr, coarse, zoom, basis];
    const s = scaleFor({ cssW: basis, dpr, coarse, zoom });
    const b = backingSize({ cssW, cssH, dpr, s });
    const d = B ? B.k : size.d;
    if (canvas.width !== b.w * d) canvas.width = b.w * d;
    if (canvas.height !== b.h * d) canvas.height = b.h * d;
    canvas.style.width = b.cssW + 'px';
    canvas.style.height = b.cssH + 'px';
    if (g) { g.setTransform(d, 0, 0, d, 0, 0); g.imageSmoothingEnabled = false; }
    Object.assign(size, { s, w: b.w, h: b.h, cssW: b.cssW, cssH: b.cssH, dpr, d });
    plateK = NaN;
    return size;
  }
  // a painted map and a tiled one hold different densities: size the canvas again when it changes
  const fitDensity = () => { if (B && B.k !== size.d && sized) resize(...sized); };

  function setMap(game, mapId) {
    const map = mapOf(mapId);
    if (!map) { B = null; return null; }
    const cached = BAKED.get(mapId);
    if (cached && cached.map === map) { B = cached; if (B.paint) B.paint = paintOf(mapId); remember(mapId, B); refresh(game); repaint(); fitDensity(); return B; }
    B = makeBaked(map);
    B.ents = bakedEntities(game, map);
    for (const o of B.ents) B.sigs.set(o.id, o.sig);
    bakeAll(B);
    remember(mapId, B);
    fitDensity();
    return B;
  }
  function bakeAll(b) {
    for (let i = 0; i < b.ground.length; i++) { bakeChunk(b, i); bakeOver(b, i); }
    b.painted = !!paintImg(b);
  }
  // a painting that finished decoding after its map was baked from tiles: bake it again, painted
  function repaint() { if (B && B.paint && B.paint.ready && !B.painted) bakeAll(B); }

  // Re-bake the chunks under objects whose state changed (a chest opened, a lock cut, a gate open).
  function refresh(game) {
    if (!B) return;
    const ents = bakedEntities(game, B.map);
    const dirty = new Set();
    const seen = new Set();
    const was = new Map(B.ents.map(o => [o.id, o]));
    for (const o of ents) {
      seen.add(o.id);
      if (B.sigs.get(o.id) === o.sig) continue;
      // the chunks the new look reaches, and the ones the old look did
      for (const c of chunksOf(B, o)) dirty.add(c);
      if (was.has(o.id)) for (const c of chunksOf(B, was.get(o.id))) dirty.add(c);
    }
    for (const o of B.ents) if (!seen.has(o.id)) for (const c of chunksOf(B, o)) dirty.add(c);
    B.ents = ents;
    B.sigs = new Map(ents.map(o => [o.id, o.sig]));
    // a painting let go and decoding again: these chunks bake from tiles, and every chunk again once it is back
    if (B.paint && B.painted && !B.paint.ready) B.painted = false;
    for (const c of dirty) bakeChunk(B, c);
  }

  function setDark(on, lx, ly, radius, lights = []) {
    if (!B) return;
    if (!on) { B.darkKey = ''; return; }
    const key = `${lx},${ly},${radius}|${lights.map(l => l.x + ',' + l.y + ',' + l.r).join(';')}`;
    if (key === B.darkKey && B.dark) return;
    B.darkKey = key;
    if (!B.dark) B.dark = canvasOf(null, B.pw, B.ph);
    const d = B.dark.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, B.pw, B.ph);
    d.fillStyle = 'rgba(4, 3, 10, 0.93)';
    d.fillRect(0, 0, B.pw, B.ph);
    d.globalCompositeOperation = 'destination-out';
    const stamp = (tx, ty, r) => { const c = holeCanvas(r); d.drawImage(c, tx * TILE + TILE / 2 - r, ty * TILE + TILE / 2 - r); };
    stamp(lx, ly, Math.round(radius * TILE + TILE / 2));
    for (const l of lights) stamp(l.x, l.y, Math.round(l.r * TILE + TILE / 2));
    d.globalCompositeOperation = 'source-over';
  }

  // Tiny pixel effects drawn with fillRect (never drawImage): glints, pips, twinkles.
  function drawFx(s, sx, sy, now) {
    const f = s.fx;
    if (f === 1) {
      const p = (now + s.fxC) % GLINT_MS;
      if (!reduced && p > 320) return;
      const k = reduced ? 1 : p < 80 || p > 240 ? 1 : 2;
      const x = sx + s.fxA, y = sy + s.fxB;
      g.fillStyle = s.col || '#fff4c0';
      g.fillRect(x - k, y, k * 2 + 1, 1); g.fillRect(x, y - k, 1, k * 2 + 1);
      g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1);
    } else if (f === 3) {
      const n = Math.min(5, s.fxA);
      const x0 = sx + ((s.sw - (n * 3 - 1)) >> 1), y = sy + s.sh + 1;
      g.fillStyle = '#0b0910'; g.fillRect(x0 - 1, y - 1, n * 3 + 1, 4);
      g.fillStyle = s.col || '#ee6c54';
      for (let i = 0; i < n; i++) g.fillRect(x0 + i * 3, y, 2, 2);
    } else if (f === 4) {
      const p = (now + s.fxC) % 3200;
      if (reduced || p > 260) return;
      const x = sx + s.fxA, y = sy + s.fxB;
      g.fillStyle = '#fff6d0'; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
    }
  }

  let draws = 0;
  const dimg = (img, sx, sy, sw, sh, dx, dy) => { g.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh); draws++; };

  function draw(list, n, emotes, ne, now) {
    draws = 0;
    if (!g) return 0;
    const W = size.w, H = size.h, cx = camera.x, cy = camera.y;
    g.globalAlpha = 1;
    g.fillStyle = '#07060a';
    g.fillRect(0, 0, W, H);
    if (!B) return 0;
    repaint();
    const f = reduced ? 0 : ((now / ANIM_FLIP_MS) | 0) & 1;
    const c0 = Math.max(0, Math.floor(cx / CHUNK)), c1 = Math.min(B.cols - 1, Math.floor((cx + W - 1) / CHUNK));
    const r0 = Math.max(0, Math.floor(cy / CHUNK)), r1 = Math.min(B.rows - 1, Math.floor((cy + H - 1) / CHUNK));
    // 1. ground chunks (the current anim frame)
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const fr = B.ground[r * B.cols + c];
        if (!fr) continue;
        const im = f && fr.length > 1 ? fr[1] : fr[0];
        g.drawImage(im, c * CHUNK - cx, r * CHUNK - cy, im.width / B.k, im.height / B.k); draws++;
      }
    }
    // 2. y-sorted sprites (insertion sort in place: no allocation)
    for (let i = 1; i < n; i++) {
      const s = list[i];
      let j = i - 1;
      while (j >= 0 && list[j].ys > s.ys) { list[j + 1] = list[j]; j--; }
      list[j + 1] = s;
    }
    for (let i = 0; i < n; i++) {
      const s = list[i];
      if (!s.show) continue;
      const sx = s.dx - cx, sy = s.dy - cy;
      if (sx > W || sy > H || sx + s.sw < 0 || sy + s.sh < 0) continue;
      if (s.img) {
        g.globalAlpha = s.alpha;
        dimg(s.img, s.sx, s.sy, s.sw, s.sh, sx, sy);
        g.globalAlpha = 1;
      }
      if (s.fx) drawFx(s, sx, sy, now);
    }
    // 3. overhead chunks
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const o = B.over[r * B.cols + c];
        if (o) { g.drawImage(o, c * CHUNK - cx, r * CHUNK - cy, o.width / B.k, o.height / B.k); draws++; }
      }
    }
    // 4. darkness
    if (B.darkKey && B.dark) { g.drawImage(B.dark, -cx, -cy); draws++; }
    // 5. emotes
    for (let i = 0; i < ne; i++) {
      const e = emotes[i];
      if (!e.show || !e.img) continue;
      dimg(e.img, 0, 0, e.img.width, e.img.height, e.dx - cx, e.dy - cy);
    }
    // the map-entry fade
    if (view.fade > 0) { g.globalAlpha = Math.min(1, view.fade); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    placePlates();
    return draws;
  }

  // ---- nameplates (DOM, so they stay crisp and readable) ----
  function setPlates(list) {
    if (!plateHost) return;
    const want = new Map(list.map(p => [p.key, p]));
    for (let i = plates.length - 1; i >= 0; i--) {
      const p = plates[i];
      if (!want.has(p.key)) { p.el.remove(); plates.splice(i, 1); }
    }
    for (const q of list) {
      let p = plates.find(x => x.key === q.key);
      if (!p) {
        const node = el('div', { class: 'w-plate', 'aria-hidden': 'true' });
        const title = el('span', 'w-plate-title'), name = el('span', 'w-plate-name');
        node.append(title, name);
        plateHost.append(node);
        p = { key: q.key, el: node, title, name, x: 0, y: 0 };
        plates.push(p);
      }
      p.x = q.x; p.y = q.y;
      p.name.textContent = q.sub ? `${q.name} · ${q.sub}` : q.name;
      p.title.textContent = q.title || '';
      p.title.hidden = !q.title;
      p.el.dataset.rating = q.rating || '';
    }
    plateK = NaN;
  }
  function placePlates() {
    if (!plates.length) return;
    const cx = camera.x, cy = camera.y, k = size.s / size.dpr;
    if (cx === plateX && cy === plateY && k === plateK) return;
    plateX = cx; plateY = cy; plateK = k;
    for (const p of plates) p.el.style.transform = `translate(${Math.round((p.x - cx) * k)}px, ${Math.round((p.y - cy) * k)}px) translate(-50%, -100%)`;
  }

  function tileAt(clientX, clientY) {
    if (!B) return null;
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const ax = ((clientX - r.left) / r.width) * size.w + camera.x, ay = ((clientY - r.top) / r.height) * size.h + camera.y;
    const tx = Math.floor(ax / TILE), ty = Math.floor(ay / TILE);
    return tx >= 0 && ty >= 0 && tx < B.w && ty < B.h ? [tx, ty] : null;
  }

  const view = {
    resize, setMap, refresh, setDark, draw, setPlates, tileAt, camera, size, fade: 0,
    get map() { return B; },
    get draws() { return draws; },
    destroy() { for (const p of plates) p.el.remove(); plates.length = 0; B = null; },
  };
  return view;
}
