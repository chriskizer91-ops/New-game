// Camera and integer scaling (M3 spec §5.2, D7).
// Exports:
//   scaleFor({ cssW, dpr = 1, coarse = false, zoom = 1 }) -> s    clamp(round(cssW*dpr/target*zoom), 2, 8)
//   backingSize({ cssW, cssH, dpr, s }) -> { w, h, cssW, cssH }    canvas backing (art px) and its CSS size
//   createCamera() -> { x, y, snap(px, py, viewW, viewH, mapW, mapH), follow(px, py, dt, viewW, viewH, mapW, mapH, reduced) }
// SCAFFOLD: the formulas are real; WP7 owns tuning and the dead zone.
// Owner: WP7.

import { SCALE_MIN, SCALE_MAX, TARGET_PX, DEAD_ZONE } from './constants.js';

export function scaleFor({ cssW, dpr = 1, coarse = false, zoom = 1 }) {
  const target = coarse ? TARGET_PX.coarse : TARGET_PX.fine;
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round((cssW * dpr) / target * zoom)));
}

export function backingSize({ cssW, cssH, dpr = 1, s }) {
  const w = Math.floor((cssW * dpr) / s), h = Math.floor((cssH * dpr) / s);
  return { w, h, cssW: (w * s) / dpr, cssH: (h * s) / dpr };
}

const clampCam = (v, view, map) => (map <= view ? Math.round((map - view) / 2) : Math.max(0, Math.min(map - view, v)));

export function createCamera() {
  const cam = {
    x: 0, y: 0,
    snap(px, py, viewW, viewH, mapW, mapH) {
      cam.x = clampCam(Math.round(px - viewW / 2), viewW, mapW);
      cam.y = clampCam(Math.round(py - viewH / 2), viewH, mapH);
      return cam;
    },
    follow(px, py, dt, viewW, viewH, mapW, mapH, reduced = false) {
      if (reduced) return cam.snap(px, py, viewW, viewH, mapW, mapH);
      const k = 1 - Math.exp(-12 * dt);
      const cx = cam.x + viewW / 2, cy = cam.y + viewH / 2;
      const dx = Math.abs(px - cx) > DEAD_ZONE.w / 2 ? px - cx : 0, dy = Math.abs(py - cy) > DEAD_ZONE.h / 2 ? py - cy : 0;
      cam.x = clampCam(Math.round(cam.x + dx * k), viewW, mapW);
      cam.y = clampCam(Math.round(cam.y + dy * k), viewH, mapH);
      return cam;
    },
  };
  return cam;
}
