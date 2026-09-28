// The Heart Chamber (M3 spec §2.1, §2.3). The dark chamber at the root of the Eldest Tree, where the Rotwarden keeps it.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'heartroot-2', name: 'The Heart Chamber', region: 'verdant', biome: 'roots', music: 'dungeon',
  backdrop: 'heartroot', zone: null, level: 6, travel: false, dark: true,
  lore: [[192, 152, 9, 8]],
  w: 18, h: 16,
  rows: [
    'RRRRRRRRRRRRRRRRRR', // 0
    'RkkkkkkkkkkkkkkkkR', // 1
    'RkkkkkkkkkkkkkkkkR', // 2
    'RkkkkkkkkkkkkkkkkR', // 3
    'RkkkkkkkkkkkkkkkkR', // 4
    'RkkkkkkkkkkkkkkkkR', // 5
    'RkkkkkkkkkkkkkkkkR', // 6
    'RkkkkkkkkkkkkkkkkR', // 7
    'RkkkkkkkkkkkkkkkkR', // 8
    'RkkkkkkkkkkkkkkkkR', // 9
    'RkkkkkkkkkkkkkkkkR', // 10
    'RkkkkkkkkkkkkkkkkR', // 11
    'RkkkkkkkkkkkkkkkkR', // 12
    'RkkkkkkkkkkkkkkkkR', // 13
    'RkkkkkkkkkkkkkkkkR', // 14
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
