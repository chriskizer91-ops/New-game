// World screen constants (M3 spec §5.2-5.5). Numbers the world UI modules share.
// Exports: TILE, STEP_MS, RUN_MS, IDLE_TICK_MS, HOLD_MS, ANIM_FLIP_MS, FADE_MS, CHUNK, MAX_PATH,
//   SAVE_EVERY_STEPS, NEAR_TILES, SCALE_MIN, SCALE_MAX, TARGET_PX, MAP_ZOOM, HUD_H, BUST_H, DECK_H,
//   DPAD_PX, DPAD_DEAD, TYPE_CPS, DEAD_ZONE, DRAW_BUDGET
// Owner: WP7.

export const TILE = 16;                     // art px per tile
export const STEP_MS = 160;                 // walking, per step
export const RUN_MS = 110;                  // running (hold B, X or Shift)
export const IDLE_TICK_MS = 400;            // world.tick() while standing still
export const HOLD_MS = 450;                 // hold-to-inspect on a lair or block
export const ANIM_FLIP_MS = 300;            // animated tiles flip frames
export const FADE_MS = 200;                 // map entry: 200 out + 200 in
export const CHUNK = 256;                   // baked ground chunk, art px
export const MAX_PATH = 48;                 // tap-to-walk path length
export const SAVE_EVERY_STEPS = 20;
export const NEAR_TILES = 5;                // nameplates and the Nearby list
export const SCALE_MIN = 2, SCALE_MAX = 8;
export const TARGET_PX = Object.freeze({ coarse: 192, fine: 288 }); // art px across the screen
export const MAP_ZOOM = Object.freeze({ near: 0.83, normal: 1, far: 1.17 });
export const HUD_H = 44, BUST_H = 26, DECK_H = 168;
export const DPAD_PX = 144, DPAD_DEAD = 14; // d-pad size and dead zone (CSS px), 20% hysteresis
export const TYPE_CPS = 45;                 // dialogue typewriter, chars per second
export const DEAD_ZONE = Object.freeze({ w: 16, h: 12 }); // camera dead zone, art px
export const DRAW_BUDGET = 40;              // drawImage calls per frame
