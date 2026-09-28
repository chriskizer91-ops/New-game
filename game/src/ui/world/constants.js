// World screen constants (M3 spec §5.2-5.5). Numbers the world UI modules share.
// Exports: TILE, STEP_MS, RUN_MS, IDLE_TICK_MS, HOLD_MS, ANIM_FLIP_MS, FADE_MS, CHUNK, MAX_PATH,
//   SAVE_EVERY_STEPS, NEAR_TILES, SCALE_MIN, SCALE_MAX, TARGET_PX, MAP_ZOOM, HUD_H, BUST_H, DECK_H,
//   DPAD_PX, DPAD_DEAD, DPAD_HYST, TAP_TURN_MS, TYPE_CPS, DEAD_ZONE, DRAW_BUDGET, IDLE_FPS, GLINT_MS,
//   SHOWOFF_MS, EMOTE_MS, HIDDEN_TILES, SIDE_MIN_W, MAX_SPRITES
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
export const MAP_ZOOM = Object.freeze({ near: 0.83, normal: 1, far: 1.17 }); // multiplies TARGET_PX
export const HUD_H = 44, BUST_H = 26, DECK_H = 168;
export const DPAD_PX = 144, DPAD_DEAD = 14; // d-pad size and dead zone (CSS px)
export const DPAD_HYST = 0.2;               // the other axis must win by 20% to take over
export const TAP_TURN_MS = 90;              // a press shorter than this turns in place
export const TYPE_CPS = 45;                 // dialogue typewriter, chars per second
export const DEAD_ZONE = Object.freeze({ w: 16, h: 12 }); // camera dead zone, art px
export const DRAW_BUDGET = 40;              // drawImage calls per frame
export const IDLE_FPS = 12;                 // the loop's rate while nothing moves
export const GLINT_MS = 2000;               // a held relic glints this often
export const SHOWOFF_MS = 1200;             // a hero shows off new gear
export const EMOTE_MS = 900;                // "!" and friends
export const HIDDEN_TILES = 3;              // hidden caches show this close (with the right key)
export const SIDE_MIN_W = 1000;             // the laptop side panel appears at this width
export const MAX_SPRITES = 48;              // the y-sorted sprite list (preallocated)
