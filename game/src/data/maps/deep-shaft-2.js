// The Glass Heart (M4 spec §2.1, §2.3), the cavern of glass at the bottom of the Deep Shaft. The stair
// from the far chamber (8-9,0) opens onto an oval cavern: columns of glass stand round its rim, shards
// glow in the floor, a bright pool lies in the west and a glassy bank in the east. Four glass
// formations stand like pedestals round the floor (props). At the far end, on a paved dais, Kharzul the
// Glass Scorpion (8,13; footprint x7-9, y12-13) faces the stair, Cinderfang in its tail; the Brand scene
// plays here. Behind the dais, in the nook at the cavern's end, a cache lies hidden in the shards.
// Tiles (crystal): 'R' the glass-veined cavern wall, 'k' floor, 'Y' glass columns, 'f' glowing shards,
// '~' the pool, 'o' glass boulders, ':' the dais, 's' the stair.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'deep-shaft-2', name: 'The Glass Heart', region: 'sunscorch', biome: 'crystal', music: 'dungeon',
  backdrop: 'glass-heart', zone: null, level: 12, travel: false, dark: false,
  lore: [[760, 596, 8, 9]],
  w: 18, h: 18,
  rows: [
    'RRRRRRRRssRRRRRRRR', //  0
    'RRRRRRRkkkkRRRRRRR', //  1
    'RRRRRkkkkkkkkRRRRR', //  2
    'RRRkkkfkkkkfkkkRRR', //  3
    'RRkYkkkkkkkkkkYkRR', //  4
    'RRkkkkkkkkkkkkkkRR', //  5
    'RkfkkkkkkkkkkkkfkR', //  6
    'RkkkkkkkkkkkkkkkkR', //  7
    'RYkkkkkkkkkkkkkkYR', //  8
    'RR~~~kkkkkkkkkooRR', //  9
    'RR~~kfkkkkkkfkkoRR', // 10
    'RRkkkk::::::kkkkRR', // 11
    'RRYkkk:kkk:kkkkYRR', // 12
    'RRkkkk:kkk:kkkkkRR', // 13
    'RRRfkk:::::kkkfRRR', // 14
    'RRRRYkkkkkkkkYRRRR', // 15
    'RRRRRRkkffkkRRRRRR', // 16
    'RRRRRRRRRRRRRRRRRR', // 17
  ],
  entities: [
    { id: 'gh-glass-1', kind: 'prop', prop: 'pedestal', at: [5, 6], solid: true },
    { id: 'gh-glass-2', kind: 'prop', prop: 'pedestal', at: [12, 6], solid: true },
    { id: 'gh-glass-3', kind: 'prop', prop: 'pedestal', at: [4, 12], solid: true },
    { id: 'gh-glass-4', kind: 'prop', prop: 'pedestal', at: [13, 12], solid: true },
    { id: 'kharzul-heart', kind: 'encounter', enc: 'kharzul-heart', mode: 'lair', at: [8, 13], area: [7, 12, 9, 13], face: 'n' },
    { id: 'gh-shard-cache', kind: 'chest', at: [7, 16], hidden: true, loot: { gold: 150, materials: { embers: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'gh-up', area: [8, 0, 9, 0], to: 'deep-shaft-1', anchor: 'from-deep-shaft-2' },
  ],
  anchors: { 'from-deep-shaft-1': [8, 2, 's'] },
  roam: null,
});
