// Overworld tilesets (M3 spec §5.1). Browser-only: returns ImageData.
//
// tileAtlas(biome) -> { img: ImageData, at(tileId, variant, frame) -> [sx, sy], variants(tileId), frames(tileId) }
//   biome    keep | wilds | town | grove | fen | tower | roots | den
//   tileId   data/tiles.js ids (grass, road, water, ...); 16x16 cells; animated tiles have 2 frames
// Cached per biome for the session.
// SCAFFOLD: flat colours, 1 variant per tile. WP5 replaces it with Forge-built tiles (2-4 hash
// variants, 4-bit edge overlays for water/road/cliff, <= 150 ms per biome, baked by a generator).
// Owner: WP5.

import { TILES, TILE_IDS, TILE_FRAMES } from '../data/tiles.js';

export const TILE_PX = 16;
export const BIOMES = Object.freeze(['keep', 'wilds', 'town', 'grove', 'fen', 'tower', 'roots', 'den']);

const COLOR = {
  grass: '#4a7a3a', flowers: '#5a8a40', 'tall-grass': '#3e6e30', road: '#a08a60', flagstone: '#8a8680', floor: '#7a6048',
  mud: '#5a4630', fungus: '#2e4a3a', roots: '#4a3a28', 'dark-floor': '#2a2622', tree: '#1e4a22', bush: '#2e5e2a',
  'first-root': '#3a2a1a', 'root-wall': '#2a1e14', rock: '#6a6a70', wall: '#4a4a52', roof: '#7a3a2a', palisade: '#6a4a2a',
  'torch-wall': '#4a4a52', water: '#2a5a8a', ford: '#4a7aa0', bridge: '#8a6a40', cliff: '#5a5048', ledge: '#7a6a50',
  door: '#5a3a1a', stair: '#6a6a6a', ichor: '#1a1a14', void: '#000000',
};
const BIOME_TINT = { keep: 0, wilds: 0, town: 6, grove: 10, fen: -8, tower: -4, roots: -14, den: -10 };
const COLS = 8;

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cellOf = (tileId, frame) => Math.max(0, TILE_IDS.indexOf(tileId)) * TILE_FRAMES + frame;

const cache = new Map();
export function tileAtlas(biome = 'wilds') {
  if (cache.has(biome)) return cache.get(biome);
  const cells = TILE_IDS.length * TILE_FRAMES, W = COLS * TILE_PX, H = Math.ceil(cells / COLS) * TILE_PX;
  const img = new ImageData(W, H), d = img.data, tint = BIOME_TINT[biome] || 0;
  TILE_IDS.forEach((id, i) => {
    const base = hex(COLOR[id] || '#ff00ff');
    for (let f = 0; f < TILE_FRAMES; f++) {
      const cell = i * TILE_FRAMES + f, ox = (cell % COLS) * TILE_PX, oy = Math.floor(cell / COLS) * TILE_PX;
      const lift = tint + (f && TILES[id].anim ? 14 : 0);
      for (let y = 0; y < TILE_PX; y++) {
        for (let x = 0; x < TILE_PX; x++) {
          const edge = x === TILE_PX - 1 || y === TILE_PX - 1 ? -18 : 0;
          const k = ((oy + y) * W + ox + x) * 4;
          for (let c = 0; c < 3; c++) d[k + c] = Math.max(0, Math.min(255, base[c] + lift + edge));
          d[k + 3] = 255;
        }
      }
    }
  });
  const atlas = {
    img,
    at(tileId, variant = 0, frame = 0) {
      const cell = cellOf(tileId, Math.min(frame, atlas.frames(tileId) - 1));
      return [(cell % COLS) * TILE_PX, Math.floor(cell / COLS) * TILE_PX];
    },
    variants: () => 1,
    frames: tileId => (TILES[tileId]?.anim ? TILE_FRAMES : 1),
  };
  cache.set(biome, atlas);
  return atlas;
}
