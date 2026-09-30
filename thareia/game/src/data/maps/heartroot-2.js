// The Heart Chamber (M3 spec §2.1, §2.3), the dark heartwood at the root of the Eldest Tree. Its
// floor is the Eldest Rings: two bands of root round the Rotwarden (9,5; footprint x7-11, y3-7).
// First-Age roots come down through the walls, the ring-face (3,2) is the sign, and a tangle in the
// north-east hides the chest (15,2). Every entity sits at its spec coordinates.
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'heartroot-2', name: 'The Heart Chamber', region: 'verdant', biome: 'roots', music: 'dungeon',
  backdrop: 'heartroot', zone: null, level: 6, travel: false, dark: true,
  lore: [[192, 152, 9, 8]],
  w: 18, h: 16,
  rows: [
    'RRRRRRRRRRRRRRRRRR', // 0
    'RRRkrkfkkkkkkYYRRR', // 1
    'RRkrkkkrrrrrkkkrRR', // 2
    'RkfrkkrkkkkkrkkrYR', // 3
    'RkrkkrkkkkkkkrkkrR', // 4
    'RYrkkrkkkkkkkrkkrR', // 5
    'RkrkkrkkkkkkkrkfrR', // 6
    'RkkrkkrkkkkkrkkrkR', // 7
    'RkkrkkkrrrrrkkkrkR', // 8
    'RkYkrkkkkkkkkkrkYR', // 9
    'RYkkkrrkkkkkrrkYkR', // 10
    'RkkkkkkkrrrkfkkkkR', // 11
    'RRkYkfkkkkkkkkYkRR', // 12
    'RRRkkkkYkkkYkkkRRR', // 13
    'RRRRRRRRkkkRRRRRRR', // 14
    'RRRRRRRRRkRRRRRRRR', // 15
  ],
  entities: [
    { id: 'rotwarden-heart', kind: 'encounter', enc: 'rotwarden-heart', mode: 'lair', at: [9, 5], face: 's', area: [7, 3, 11, 7] },
    { id: 'h2-rings', kind: 'sign', at: [3, 2], text: 'The Eldest Rings: nine hundred of them, counted in the wood. The last one is black.' },
    { id: 'h2-roots', kind: 'chest', at: [15, 2], loot: { gold: 150, bag: { 'ember-salts': 1 } }, hidden: true },
  ],
  exits: [
    { id: 'h2-s', area: [9, 15, 9, 15], to: 'heartroot-1', anchor: 'from-chamber' },
  ],
  anchors: { 'from-roots': [9, 13, 'n'] },
  roam: null,
});
