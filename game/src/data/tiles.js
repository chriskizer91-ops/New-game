// Overworld tiles (M3 spec §4.1). One character per 16 px tile in a map's `rows`.
//
// LEGEND[char] = { id, name, solid, over?, anim?, oneWay?, noRoam? }
//   solid   blocks walking (players and roamers)
//   over    drawn in the overhead pass (canopy, roof, tall-grass tops) above the sprites
//   anim    animated: exactly 2 frames (TILE_FRAMES)
//   oneWay  'ledge': walkable only when moving south, or in the direction of an exit on it
//   noRoam  walkable for the player, never entered by roaming packs (doors, stairs)
// Locks, gates, crownwalls, darkness and ichor are map entities, never tiles.
// Owner: WP1.

import { deepFreeze } from '../core/freeze.js';

export const TILE_FRAMES = 2;

const T = (id, name, o = {}) => ({ id, name, solid: false, ...o });

export const LEGEND = deepFreeze({
  '.': T('grass', 'grass'),
  ',': T('flowers', 'flowers'),
  '"': T('tall-grass', 'tall grass', { over: true }),
  '=': T('road', 'road'),
  ':': T('flagstone', 'flagstone'),
  '_': T('floor', 'floor'),
  m: T('mud', 'mud'),
  f: T('fungus', 'glow fungus', { anim: true }),
  r: T('roots', 'roots'),
  k: T('dark-floor', 'dark floor'),
  T: T('tree', 'tree', { solid: true }),                 // its canopy is drawn over the row above
  t: T('bush', 'bush', { solid: true }),
  Y: T('first-root', 'First-Age root', { solid: true }),
  R: T('root-wall', 'root wall', { solid: true }),
  o: T('rock', 'rock', { solid: true }),
  '#': T('wall', 'wall', { solid: true }),
  H: T('roof', 'roof', { solid: true, over: true }),
  '|': T('palisade', 'palisade', { solid: true }),
  '*': T('torch-wall', 'torch wall', { solid: true, anim: true }),
  '~': T('water', 'water', { solid: true, anim: true }),
  w: T('ford', 'ford', { anim: true }),
  b: T('bridge', 'bridge'),
  '^': T('cliff', 'cliff', { solid: true }),
  v: T('ledge', 'ledge', { oneWay: 'ledge' }),
  '+': T('door', 'door', { noRoam: true }),
  s: T('stair', 'stair', { noRoam: true }),
  i: T('ichor', 'ichor', { anim: true }),
  x: T('void', 'void', { solid: true }),
});

export const TILE_CHARS = Object.freeze(Object.keys(LEGEND));

// The same tiles keyed by id (what art/tiles.js paints): TILES[id] = { char, ...LEGEND[char] }.
export const TILES = deepFreeze(Object.fromEntries(Object.entries(LEGEND).map(([char, t]) => [t.id, { char, ...t }])));
export const TILE_IDS = Object.freeze(Object.keys(TILES));

// A missing or unknown character reads as void (solid), so bad rows never open a hole.
export const tileOf = ch => LEGEND[ch] || LEGEND.x;
