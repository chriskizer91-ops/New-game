// One shared animation clock for pixel canvases (portraits, hero sprites, backdrops).
// animate(node, draw, fps) calls draw(t) at ~fps while the node is in the document, and stops
// by itself once the node is removed. With reduced motion it draws a single still frame.

let reducedFn = () => false;
export const setReducedGetter = fn => { reducedFn = fn; };
export const isReduced = () => reducedFn();

const live = new Set();
let raf = 0;
const now = () => performance.now() / 1000;

function loop() {
  raf = 0;
  const t = now();
  for (const e of live) {
    if (e.node.isConnected) e.seen = true;
    else if (e.seen || t - e.t0 > 3) { live.delete(e); continue; }
    else continue;
    if (t - e.last < 1 / e.fps) continue;
    e.last = t;
    try { if (e.draw(t) === false) live.delete(e); } catch (err) { live.delete(e); console.error(err); }
  }
  if (live.size) raf = requestAnimationFrame(loop);
}

export function animate(node, draw, fps = 12) {
  draw(reducedFn() ? 0 : now());
  if (reducedFn()) return () => {};
  const e = { node, draw, fps, last: now(), t0: now(), seen: node.isConnected };
  live.add(e);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => live.delete(e);
}

export { now as clock };
