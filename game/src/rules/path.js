// Grid path-finding for the overworld (M3 spec §4.5 findPath, §5.4 tap-to-walk). Pure, 4-way A*.
// Imports nothing. rules/world.js wraps it with the map's walkability as findPath(game, walk, ...).
//
// aStar({ from: [x, y], to: [x, y], passable(x, y, dir) -> boolean, max = 48, adjacent = false,
//         w = Infinity, h = Infinity }) -> [[x, y], ...] (the steps after `from`, ending at the goal) | null
//   passable  may the walker step onto (x, y) moving in `dir` ('n'|'e'|'s'|'w')? The goal tile is
//             always tested too, unless `adjacent` is set: then the path ends on any tile next to `to`
//             (for walking up to a person or a chest and facing it).
//   max       give up past this many steps.
// Owner: WP1.

export const DIRS = Object.freeze({ n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] });
export const DIR_KEYS = Object.freeze(['n', 'e', 's', 'w']);

// The direction from a to b for neighbouring tiles ('n'|'e'|'s'|'w'), or null.
export function dirTo([ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  return dx === 1 ? 'e' : dx === -1 ? 'w' : dy === 1 ? 's' : 'n';
}

export function aStar({ from, to, passable, max = 48, adjacent = false, w = Infinity, h = Infinity }) {
  const [tx, ty] = to;
  const dist = (x, y) => Math.abs(x - tx) + Math.abs(y - ty);
  const isGoal = (x, y) => (adjacent ? dist(x, y) === 1 : x === tx && y === ty);
  if (isGoal(from[0], from[1])) return [];
  const key = (x, y) => `${x},${y}`;
  const open = [{ x: from[0], y: from[1], g: 0, f: dist(from[0], from[1]) }];
  const came = new Map([[key(from[0], from[1]), null]]);
  const cost = new Map([[key(from[0], from[1]), 0]]);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f || (open[i].f === open[bi].f && open[i].g > open[bi].g)) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (isGoal(cur.x, cur.y)) {
      const out = [];
      for (let k = key(cur.x, cur.y); came.get(k); k = came.get(k)) out.unshift(k.split(',').map(Number));
      return out;
    }
    if (cur.g >= max) continue;
    for (const d of DIR_KEYS) {
      const nx = cur.x + DIRS[d][0], ny = cur.y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!passable(nx, ny, d)) continue;
      const k = key(nx, ny), g = cur.g + 1;
      if (cost.has(k) && cost.get(k) <= g) continue;
      cost.set(k, g); came.set(k, key(cur.x, cur.y));
      open.push({ x: nx, y: ny, g, f: g + dist(nx, ny) });
    }
  }
  return null;
}
