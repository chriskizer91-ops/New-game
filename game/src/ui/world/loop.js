// The world render loop (M3 spec §5.3): a dirty-flag rAF loop that idles at 10-15 fps.
// Exports: createLoop(frame, { idleFps = 12 } = {}) -> { start(), stop(), dirty(), running, stats }
//   frame(now, dt) -> boolean   return true while something is animating (keeps the full rate)
//   stats  { work: Float32Array, n }  the last frames' JS time in ms (a ring), for the perf gate
// Nothing is allocated per frame: the rAF callback is one stable function.
// Owner: WP7.

const RING = 2048;

export function createLoop(frame, { idleFps = 12 } = {}) {
  let raf = 0, last = 0, busy = true, stopped = true;
  const idleMs = 1000 / idleFps;
  const stats = { work: new Float32Array(RING), n: 0 };
  const step = now => {
    if (stopped) return;
    raf = requestAnimationFrame(step);
    // idle: the first animation frame after ~1/idleFps (half a 60 Hz frame of slack, so 12 fps lands on 12)
    if (!busy && now - last < idleMs - 8) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    const t0 = performance.now();
    busy = !!frame(now, dt);
    stats.work[stats.n % RING] = performance.now() - t0;
    stats.n++;
  };
  return {
    start() { if (!stopped) return; stopped = false; last = 0; busy = true; raf = requestAnimationFrame(step); },
    stop() { stopped = true; cancelAnimationFrame(raf); },
    dirty() { busy = true; },
    get running() { return !stopped; },
    stats,
    RING,
  };
}
