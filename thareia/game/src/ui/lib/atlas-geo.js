// Atlas geometry (M3 spec §5.6; M4 spec §5.4), pure and DOM-free so node can test it
// (test/shell.test.mjs). Coordinates are the illustrated map's viewBox (1200x800, the same 3:2 aspect
// as the image).
//
//   VIEWS                      { wilds, sunscorch, ironspire, gloomfen, below, realm }: the crop each Atlas view shows, { x, y, w, h }
//                              (every view is 3:2, like the frame). M6: the Gloomfen's is framed from its data
//                              (framed(region): every one of its maps' lore and its Hearthfires, with a margin), so
//                              it holds the four places and the long way down from Mossfall's fen stair to the Flats
//   REGION_VIEW                { [regionId]: viewId } the view that frames each open region
//   regionOpen(game, id)       -> boolean   a region is open on the Atlas when REGIONS says so and one of
//                              its entry exits can be walked (the Keep's south-east gate after Act I)
//   placeOf(mapId)             -> string    the illustrated map's place a map belongs to (Sandspire,
//                              Mosswatch Tower...), the nearest place for a dungeon under one, or the
//                              map's own name (routes)
//   loreAt(mapId, x, y)        -> [lx, ly] | null   a tile position on the illustrated map: a map's
//                              `lore` is one pair (a point) or a line of pairs [loreX, loreY, tileX,
//                              tileY] (a route; a branching route goes out and back through its
//                              junction); (x, y) is projected onto the nearest segment in tile space, so
//                              "you are here" slides along a route as you walk it
//   entityLore(mapId, entity)  -> [lx, ly] | null   the centre of an entity's `at` or `area`
//   toFrame(view, [lx, ly], W, H) -> [px, py]       viewBox -> frame pixels for a view
//   relax(nodes, { W, H, r = 22, iterations = 90 }) -> nodes   pushes markers apart until their
//                              r-radius hit circles stop overlapping (as far as the frame allows),
//                              keeps each near its true spot, and clamps it inside the frame.
//                              node: { x0, y0, weight? } in, { x, y } out. Deterministic.
//   RELIC_SITE                 { [relicId]: encounterId } where each relic is held or worn (data only;
//                              '$rival' and gifts are left out)
//   belowMaps(game)            -> [{ id, name, state: 'here' | 'walked' | 'unwalked' }]   M7: the Hearth Below's maps,
//                              in the order the road goes down, for the "Below the Keep" marker (they have no place of
//                              their own on the painting: every one lies under the Keep)
// Owner: WP8; M4 P7b (the Sunscorch view, regionOpen, placeOf); M6 P7 (the Gloomfen view).
import { MAPS, MAP_IDS } from '../../data/maps/index.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { FOES } from '../../data/foes.js';
import { REGIONS, LORE, HEARTHS } from '../../data/world.js';
import { check } from '../../rules/cond.js';

export const VIEWBOX = Object.freeze({ w: 1200, h: 800 });
// A region's view from its data: the bounds of its maps' lore and its Hearthfires' points, `pad` wider all round,
// widened (or heightened) to 3:2 about their middle, and kept on the painting.
export function framed(region, pad = 12) {
  const pts = [];
  for (const m of Object.values(MAPS)) if (m.region === region) for (const l of m.lore || []) pts.push([l[0], l[1]]);
  for (const h of Object.values(HEARTHS)) if (MAPS[h.map]?.region === region) pts.push(h.lore);
  if (!pts.length) return null;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const w = Math.min(VIEWBOX.w, Math.max(x1 - x0, (y1 - y0) * 1.5)), h = w / 1.5;
  const x = Math.max(0, Math.min(VIEWBOX.w - w, (x0 + x1 - w) / 2)), y = Math.max(0, Math.min(VIEWBOX.h - h, (y0 + y1 - h) / 2));
  return Object.freeze({ x, y, w, h });
}
export const VIEWS = Object.freeze({
  wilds: Object.freeze({ x: 105, y: 100, w: 516, h: 344 }), // the Verdant quarter, and the Keep's island
  // the Sunscorch: from the Keep's south-east shore to Miragewell, and down to the Scorchgate Vaults
  sunscorch: Object.freeze({ x: 540, y: 350, w: 600, h: 400 }),
  // M5: the Ironspire, from the Highfold and the Keep's east shore up to Frostmere (a first framing from the
  // M5 scaffold; P7 may reframe it)
  ironspire: Object.freeze({ x: 520, y: 60, w: 600, h: 400 }),
  // M6: the Gloomfen, from Mossfall's fen stair down to the Tidal Flats, framed from its data
  gloomfen: framed('gloomfen') || Object.freeze({ x: 0, y: 280, w: 726, h: 484 }),
  // M7: the Hearth Below lies under the Keep, so its view is the Keep's island; the Wilds and Realm views mark it with
  // "Below the Keep" (ui/screens/atlas.js), which opens this view
  below: Object.freeze({ x: 390, y: 290, w: 300, h: 200 }),
  realm: Object.freeze({ x: 0, y: 0, w: 1200, h: 800 }),
});
export const REGION_VIEW = Object.freeze({ verdant: 'wilds', sunscorch: 'sunscorch', ironspire: 'ironspire', gloomfen: 'gloomfen', below: 'below' });

// exit id -> exit, over every map (a region's `entries` name exits)
const EXIT = {};
for (const m of Object.values(MAPS)) for (const x of m.exits || []) if (!EXIT[x.id]) EXIT[x.id] = x;

export function regionOpen(game, id) {
  const r = REGIONS[id];
  if (!r?.open) return false;
  if (!r.entries?.length) return true; // the Wilds: where the game starts
  return r.entries.some(exitId => {
    const x = EXIT[exitId];
    if (!x?.to) return false;
    if (!x.gate) return true;
    try { return !!check(game, x.gate); } catch { return false; }
  });
}

// A place's map, or (for a one-point map under or beside a place: a dungeon, the Lamp Room, the Great
// Hall) the nearest place within 25 viewBox units; a route keeps its own name.
export function placeOf(mapId) {
  const direct = Object.values(LORE).find(p => p.map === mapId);
  if (direct) return direct.name;
  const M = MAPS[mapId];
  if (!M) return mapId || '';
  const L = M.lore || [];
  if (L.length === 1) {
    let best = null;
    for (const p of Object.values(LORE)) {
      const d = Math.hypot(p.at[0] - L[0][0], p.at[1] - L[0][1]);
      if (d <= 25 && (!best || d < best.d)) best = { d, name: p.name };
    }
    if (best) return best.name;
  }
  return M.name;
}

export function loreAt(mapId, x, y) {
  const L = MAPS[mapId]?.lore;
  if (!L || !L.length) return null;
  if (L.length === 1 || x == null || y == null) return [L[0][0], L[0][1]];
  let best = null;
  for (let i = 0; i + 1 < L.length; i++) {
    const a = L[i], b = L[i + 1];
    const dx = b[2] - a[2], dy = b[3] - a[3], len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - a[2]) * dx + (y - a[3]) * dy) / len2)) : 0;
    const d = (a[2] + t * dx - x) ** 2 + (a[3] + t * dy - y) ** 2;
    if (!best || d < best.d) best = { d, p: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] };
  }
  return best.p;
}

export function entityLore(mapId, e) {
  if (!e) return null;
  const [x0, y0, x1, y1] = e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
  return loreAt(mapId, (x0 + x1) / 2, (y0 + y1) / 2);
}

export function toFrame(view, [lx, ly], W, H) {
  return [(lx - view.x) / view.w * W, (ly - view.y) / view.h * H];
}

export function relax(nodes, { W, H, r = 22, iterations = 90 } = {}) {
  const min = 2 * r;
  const clampX = v => Math.max(r, Math.min(W - r, v)), clampY = v => Math.max(r, Math.min(H - r, v));
  const push = () => {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= min - 0.5) continue;
        if (d < 0.01) { const ang = (i * 7 + j * 13) % 360 * Math.PI / 180; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
        const p = (min - d) / 2 + 0.25, ux = dx / d, uy = dy / d;
        const wa = a.weight ?? 1, wb = b.weight ?? 1, sum = wa + wb || 1;
        a.x -= ux * p * 2 * wa / sum; a.y -= uy * p * 2 * wa / sum;
        b.x += ux * p * 2 * wb / sum; b.y += uy * p * 2 * wb / sum;
        moved = true;
      }
    }
    for (const n of nodes) { n.x = clampX(n.x); n.y = clampY(n.y); }
    return moved;
  };
  for (const n of nodes) { n.x = clampX(n.x0); n.y = clampY(n.y0); }
  for (let it = 0; it < iterations; it++) {
    // a gentle pull home first, so the pushes have the last word
    for (const n of nodes) {
      n.x += (n.x0 - n.x) * 0.02 * (n.weight ?? 1);
      n.y += (n.y0 - n.y) * 0.02 * (n.weight ?? 1);
    }
    if (!push() && it > 0) break;
  }
  // then pushes alone until nothing overlaps (as far as the frame allows)
  for (let it = 0; it < 40 && push(); it++);
  return nodes;
}

function relicSites() {
  const out = {};
  for (const [id, e] of Object.entries(ENCOUNTERS)) {
    for (const s of e.spawns || []) {
      const fam = FOES[s.family];
      const ids = [
        typeof s.relic === 'string' && !s.relic.startsWith('$') ? s.relic : null,
        ...(s.relic ? [] : fam?.relics || []),
        typeof s.wears === 'string' ? s.wears : null,
      ].filter(Boolean);
      for (const r of ids) if (!out[r]) out[r] = id;
    }
  }
  return Object.freeze(out);
}
export const RELIC_SITE = relicSites();

// M7: the Hearth Below's maps, in the order the road goes down (MAP_IDS), each where the party stands, walked, or not yet
export function belowMaps(game) {
  const pos = game?.progress?.pos?.map, visits = game?.progress?.flags?.visits || {};
  return MAP_IDS.filter(id => MAPS[id].region === 'below')
    .map(id => ({ id, name: MAPS[id].name, state: id === pos ? 'here' : visits[id] ? 'walked' : 'unwalked' }));
}
