// Camera and integer scaling (M3 spec §5.2, D7).
// Exports:
//   scaleFor({ cssW, dpr = 1, coarse = false, zoom = 1 }) -> s    clamp(round(cssW*dpr / (target*zoom)), 2, 8)
//   backingSize({ cssW, cssH, dpr, s }) -> { w, h, cssW, cssH }    canvas backing (art px) and its CSS size
//   createCamera() -> { x, y, snap(px, py, viewW, viewH, mapW, mapH), follow(px, py, dt, viewW, viewH, mapW, mapH, reduced), moving }
// The camera works in art px: (x, y) is the top-left of the view, always whole pixels. It eases
// towards its target with a 16x12 px dead zone (1 - e^(-12 dt)), clamps to the map, and centres
// maps smaller than the view (black around them). Entering a map snaps (a cut, never a pan).
// follow() allocates nothing.
// Owner: WP7.

import { SCALE_MIN, SCALE_MAX, TARGET_PX, DEAD_ZONE } from './constants.js';

// Near zoom (0.83) shrinks the target, so the pixels get bigger; Far (1.17) shows more map.
export function scaleFor({ cssW, dpr = 1, coarse = false, zoom = 1 }) {
  const target = (coarse ? TARGET_PX.coarse : TARGET_PX.fine) * (zoom || 1);
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round((cssW * dpr) / target)));
}

export function backingSize({ cssW, cssH, dpr = 1, s }) {
  const w = Math.max(1, Math.floor((cssW * dpr) / s)), h = Math.max(1, Math.floor((cssH * dpr) / s));
  return { w, h, cssW: (w * s) / dpr, cssH: (h * s) / dpr };
}

const clampCam = (v, view, map) => (map <= view ? Math.round((map - view) / 2) : Math.max(0, Math.min(map - view, v)));

export function createCamera() {
  const cam = {
    x: 0, y: 0, fx: 0, fy: 0, moving: false,
    // centre on (px, py) at once
    snap(px, py, viewW, viewH, mapW, mapH) {
      cam.fx = clampCam(px - viewW / 2, viewW, mapW);
      cam.fy = clampCam(py - viewH / 2, viewH, mapH);
      cam.x = Math.round(cam.fx); cam.y = Math.round(cam.fy);
      cam.moving = false;
      return cam;
    },
    // ease so (px, py) stays inside the dead zone around the centre of the view
    follow(px, py, dt, viewW, viewH, mapW, mapH, reduced = false) {
      if (reduced) return cam.snap(px, py, viewW, viewH, mapW, mapH);
      const k = 1 - Math.exp(-12 * dt);
      const dx = px - (cam.fx + viewW / 2), dy = py - (cam.fy + viewH / 2);
      const hw = DEAD_ZONE.w / 2, hh = DEAD_ZONE.h / 2;
      const wx = dx > hw ? dx - hw : dx < -hw ? dx + hw : 0;
      const wy = dy > hh ? dy - hh : dy < -hh ? dy + hh : 0;
      const nx = clampCam(cam.fx + wx * k, viewW, mapW), ny = clampCam(cam.fy + wy * k, viewH, mapH);
      cam.moving = Math.abs(nx - cam.fx) > 0.05 || Math.abs(ny - cam.fy) > 0.05;
      cam.fx = nx; cam.fy = ny;
      cam.x = Math.round(nx); cam.y = Math.round(ny);
      return cam;
    },
  };
  return cam;
}
