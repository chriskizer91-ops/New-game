// Overworld walkers (M3 spec §5.1, D6): a dedicated 16x24 rig, fed by gearLooks(heroGear(game, id)).
// Browser-only: returns ImageData. art/heroes.js and art/hero-looks.js stay frozen.
//
// walkerSheet(heroId, gear, { custom } = {}) -> { img, w: 16, h: 24, foot: [8, 23] }
//   img     3 frames (stand, stepA, stepB) across x 4 rows (s, n, e, w; w pre-mirrored) = 48 x 96
//   gear    gearLooks() output (weapon, offhand, head, body, hands, feet, amulet looks)
// Cached in its own lru(96), keyed by hero, gear signature and look.
// SCAFFOLD: box figures in the hero's colour. WP5 builds the real rig.
// Owner: WP5.

import { lru } from './cache.js';

export const WALKER_W = 16, WALKER_H = 24, WALKER_FRAMES = 3;
export const WALKER_ROWS = Object.freeze(['s', 'n', 'e', 'w']);

const HERO_COLOR = { warden: [176, 60, 48], pip: [72, 128, 64], bryn: [96, 88, 160], alondra: [220, 212, 196] };
const cache = lru(96);

// Paint a box figure: w x h per frame; `body` rgb; legs alternate with the frame.
export function boxSheet(key, body, { w = WALKER_W, h = WALKER_H, frames = WALKER_FRAMES, rows = 4, head = [232, 196, 160] } = {}) {
  return cache.get(key, () => {
    const img = new ImageData(w * frames, h * rows), d = img.data;
    const put = (x, y, c) => { const k = (y * img.width + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; };
    for (let r = 0; r < rows; r++) {
      for (let f = 0; f < frames; f++) {
        const ox = f * w, oy = r * h, cx = Math.floor(w / 2);
        const headR = Math.max(2, Math.floor(w / 5)), top = Math.max(1, h - Math.round(h * 0.95));
        for (let y = top; y < top + headR * 2; y++) for (let x = cx - headR; x < cx + headR; x++) put(ox + x, oy + y, r === 1 ? body : head);
        const bodyTop = top + headR * 2, bodyBot = Math.round(h * 0.78);
        for (let y = bodyTop; y < bodyBot; y++) for (let x = cx - headR - 1; x < cx + headR + 1; x++) put(ox + x, oy + y, body);
        const step = f === 1 ? -1 : f === 2 ? 1 : 0;
        for (let y = bodyBot; y < h; y++) {
          put(ox + cx - 2 + (y > bodyBot + 1 ? step : 0), oy + y, [40, 32, 28]);
          put(ox + cx + 1 - (y > bodyBot + 1 ? step : 0), oy + y, [40, 32, 28]);
        }
      }
    }
    return img;
  });
}

export function walkerSheet(heroId, gear = {}, { custom } = {}) {
  const sig = Object.entries(gear || {}).map(([s, l]) => `${s}:${l?.id || l?.look || ''}`).join('|');
  const img = boxSheet(`walker|${heroId}|${sig}|${custom ? JSON.stringify(custom) : ''}`, HERO_COLOR[heroId] || [150, 150, 150]);
  return { img, w: WALKER_W, h: WALKER_H, foot: [8, 23] };
}
