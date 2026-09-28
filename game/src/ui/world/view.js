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
};
const GATE_KIND = { gate: 'gate', chain: 'chain', crownwall: 'crownwall', door: 'door', 'vault-door': 'vault-door' };
const FORD_BY = { 'stillwater-lance': 'ice', rootsong: 'roots' };
const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];

function objectFor(game, e) {
  switch (e.kind) {
    case 'chest': {
      if (e.hidden) return null;
      if (e.state === 'opened') return { kind: 'chest', state: 'open' };
      return { kind: 'chest', state: e.lock ? (e.lock === 'tally-seal' ? 'sealed' : 'locked') : 'closed' };
    }
    case 'sign': return { kind: 'sign', state: e.look || null };
    case 'board': return { kind: 'board', state: e.opens === 'ladder' ? 'ladder' : 'bounties' };
    case 'table': case 'lookout': return { kind: e.kind, state: null };
    case 'bellframe': return { kind: 'bellframe', state: storyOf(game)['bell-rung'] ? 'rung' : 'empty' };
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
      return { kind: LOCK_KIND[e.lock] || 'sign', state: open ? 'open' : 'closed' };
    }
    case 'prop': return e.prop && e.prop !== 'deer' ? { kind: e.prop, state: null } : null;
    default: return null;
  }
}

function bakedEntities(game, map) {
  const out = [];
  for (const e of present(game, map.id)) {
    const o = objectFor(game, e);
    if (!o) continue;
    out.push({ id: e.id, kind: o.kind, state: o.state, opts: { relic: o.relic || null, id: o.id || null }, area: areaOf(e),
      sig: `${o.kind}:${o.state || ''}:${o.id || ''}:${o.relic ? o.relic.uid + (o.relic.temper || 0) : ''}` });
  }
  return out;
}

const vhash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const EDGE_TILES = new Set(['water', 'road', 'cliff']);

function makeBaked(map) {
  const A = atlasFor(map.biome);
  const w = map.w, h = map.h, ids = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ids[y * w + x] = tileOf(map.rows[y]?.[x]).id;
  const cols = Math.max(1, Math.ceil((w * TILE) / CHUNK)), rows = Math.max(1, Math.ceil((h * TILE) / CHUNK));
  return { id: map.id, map, A, w, h, ids, cols, rows, pw: w * TILE, ph: h * TILE, ground: new Array(cols * rows), over: new Array(cols * rows), ents: [], sigs: new Map(), dark: null, darkKey: '' };
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
  const ents = B.ents.filter(o => o.area[2] >= tx0 - 1 && o.area[0] <= tx1 && o.area[3] >= ty0 && o.area[1] <= ty1 + 1);
  let anim = ents.some(o => objSprite(o.kind, o.state, o.opts).frames.length > 1);
  for (let y = ty0; y < ty1 && !anim; y++) for (let x = tx0; x < tx1; x++) if (A.atlas.frames(ids[y * w + x]) > 1) { anim = true; break; }
  const old = B.ground[ci] || [];
  const out = [];
  for (let f = 0; f < (anim ? 2 : 1); f++) {
    const c = old[f] && old[f].width === pw && old[f].height === ph ? old[f] : canvasOf(null, pw, ph);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, pw, ph);
    for (let y = ty0; y < ty1; y++) {
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
  const pen = () => { if (!c) { c = canvasOf(null, (tx1 - tx0) * TILE, (ty1 - ty0) * TILE); g = c.getContext('2d'); g.imageSmoothingEnabled = false; } return g; };
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
    B.over[ci] = c;
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
  B.over[ci] = c;
}

function chunksOf(B, area) {
  const out = new Set(), C = CHUNK / TILE;
  const [x0, y0, x1, y1] = area;
  for (let y = y0 - 1; y <= y1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (x < 0 || y < 0 || x >= B.w || y >= B.h) continue;
    out.add(((y / C) | 0) * B.cols + ((x / C) | 0));
  }
  return out;
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
  const size = { s: 3, w: 1, h: 1, cssW: 1, cssH: 1, dpr: 1 };
  let B = null;
  const plates = [];
  let plateX = NaN, plateY = NaN, plateK = NaN;

  // basis: the CSS width the scale rule reads (touch screens pass their shorter side, so a phone
  // turned sideways keeps the portrait pixel size instead of zooming in)
  function resize(cssW, cssH, dpr = 1, coarse = false, zoom = 1, basis = cssW) {
    const s = scaleFor({ cssW: basis, dpr, coarse, zoom });
    const b = backingSize({ cssW, cssH, dpr, s });
    if (canvas.width !== b.w) canvas.width = b.w;
    if (canvas.height !== b.h) canvas.height = b.h;
    canvas.style.width = b.cssW + 'px';
    canvas.style.height = b.cssH + 'px';
    if (g) g.imageSmoothingEnabled = false;
    Object.assign(size, { s, w: b.w, h: b.h, cssW: b.cssW, cssH: b.cssH, dpr });
    plateK = NaN;
    return size;
  }

  function setMap(game, mapId) {
    const map = mapOf(mapId);
    if (!map) { B = null; return null; }
    const cached = BAKED.get(mapId);
    if (cached && cached.map === map) { B = cached; remember(mapId, B); refresh(game); return B; }
    B = makeBaked(map);
    B.ents = bakedEntities(game, map);
    for (const o of B.ents) B.sigs.set(o.id, o.sig);
    for (let i = 0; i < B.ground.length; i++) { bakeChunk(B, i); bakeOver(B, i); }
    remember(mapId, B);
    return B;
  }

  // Re-bake the chunks under objects whose state changed (a chest opened, a lock cut, a gate open).
  function refresh(game) {
    if (!B) return;
    const ents = bakedEntities(game, B.map);
    const dirty = new Set();
    const seen = new Set();
    for (const o of ents) {
      seen.add(o.id);
      if (B.sigs.get(o.id) !== o.sig) for (const c of chunksOf(B, o.area)) dirty.add(c);
    }
    for (const o of B.ents) if (!seen.has(o.id)) for (const c of chunksOf(B, o.area)) dirty.add(c);
    B.ents = ents;
    B.sigs = new Map(ents.map(o => [o.id, o.sig]));
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
    const f = reduced ? 0 : ((now / ANIM_FLIP_MS) | 0) & 1;
    const c0 = Math.max(0, Math.floor(cx / CHUNK)), c1 = Math.min(B.cols - 1, Math.floor((cx + W - 1) / CHUNK));
    const r0 = Math.max(0, Math.floor(cy / CHUNK)), r1 = Math.min(B.rows - 1, Math.floor((cy + H - 1) / CHUNK));
    // 1. ground chunks (the current anim frame)
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const fr = B.ground[r * B.cols + c];
        if (!fr) continue;
        g.drawImage(f && fr.length > 1 ? fr[1] : fr[0], c * CHUNK - cx, r * CHUNK - cy); draws++;
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
        if (o) { g.drawImage(o, c * CHUNK - cx, r * CHUNK - cy); draws++; }
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
