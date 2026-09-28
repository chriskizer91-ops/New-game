// Atlas geometry (M3 spec §5.6), pure and DOM-free so node can test it (test/atlas-geo.test.mjs).
// Coordinates are the illustrated map's viewBox (1200x800, the same 3:2 aspect as the image).
//
//   VIEWS                      { wilds, realm }: the crop each Atlas view shows, { x, y, w, h }
//   loreAt(mapId, x, y)        -> [lx, ly] | null   a tile position on the illustrated map: a map's
//                              `lore` is one pair (a point) or a line of pairs [loreX, loreY, tileX,
//                              tileY]; (x, y) is projected onto the nearest segment in tile space, so
//                              "you are here" slides along a route as you walk it
//   entityLore(mapId, entity)  -> [lx, ly] | null   the centre of an entity's `at` or `area`
//   toFrame(view, [lx, ly], W, H) -> [px, py]       viewBox -> frame pixels for a view
//   relax(nodes, { W, H, r = 22, iterations = 90 }) -> nodes   pushes markers apart until their
//                              r-radius hit circles stop overlapping (as far as the frame allows),
//                              keeps each near its true spot, and clamps it inside the frame.
//                              node: { x0, y0, weight? } in, { x, y } out. Deterministic.
//   RELIC_SITE                 { [relicId]: encounterId } where each relic is held or worn (data only;
//                              '$rival' and gifts are left out)
// Owner: WP8.
import { MAPS } from '../../data/maps/index.js';
import { ENCOUNTERS } from '../../data/encounters.js';
import { FOES } from '../../data/foes.js';

export const VIEWBOX = Object.freeze({ w: 1200, h: 800 });
export const VIEWS = Object.freeze({
  wilds: Object.freeze({ x: 105, y: 100, w: 516, h: 344 }), // the Verdant quarter, and the Keep's island
  realm: Object.freeze({ x: 0, y: 0, w: 1200, h: 800 }),
});

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
