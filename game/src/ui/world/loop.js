// The world render loop (M3 spec §5.3): dirty-flag rAF loop that idles at 10-15 fps.
// Exports: createLoop(frame, { idleFps = 12 } = {}) -> { start(), stop(), dirty(), running }
//   frame(now, dt) -> boolean   return true while something is animating (keeps full rate)
// SCAFFOLD: WP7 owns it (no allocations in the steady-state loop).
// Owner: WP7.

export function createLoop(frame, { idleFps = 12 } = {}) {
  let raf = 0, last = 0, busy = true, stopped = true;
  const idleMs = 1000 / idleFps;
  const step = now => {
    if (stopped) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    if (busy || now - last >= idleMs) { busy = !!frame(now, dt); last = now; }
    raf = requestAnimationFrame(step);
  };
  const loop = {
    start() { if (!stopped) return; stopped = false; last = 0; raf = requestAnimationFrame(step); },
    stop() { stopped = true; cancelAnimationFrame(raf); },
    dirty() { busy = true; },
    get running() { return !stopped; },
  };
  return loop;
}
