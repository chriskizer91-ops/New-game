// Miragewell (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'miragewell', name: 'Miragewell', region: 'sunscorch', biome: 'oasis', music: 'town',
  backdrop: 'miragewell', zone: null, level: 12, travel: true, dark: false,
  lore: [[1010, 540, 11, 9]],
  w: 22, h: 20,
  rows: [
    '######################', //  0
    '#....................#', //  1
    '#....................#', //  2
    '#....................#', //  3
    '#....................#', //  4
    '#....................#', //  5
    '#....................#', //  6
    '#....................#', //  7
    '#....................#', //  8
    '.....................#', //  9
    '.....................#', // 10
    '#....................#', // 11
    '#....................#', // 12
    '#....................#', // 13
    '#....................#', // 14
    '#....................#', // 15
    '#....................#', // 16
    '#....................#', // 17
    '#....................#', // 18
    '######################', // 19
  ],
  entities: [
    { id: 'well-fire', kind: 'hearthfire', at: [11, 9], stand: [11, 10, 'n'] },
    { id: 'sabah', kind: 'npc', npc: 'sabah', at: [6, 5], face: 's' },
    { id: 'pilgrim-mw', kind: 'npc', npc: 'pilgrim-mw', at: [16, 14], face: 'w' },
    { id: 'wisp-queen', kind: 'encounter', enc: 'wisp-queen', mode: 'lair', at: [11, 4], face: 's' },
  ],
  exits: [
    { id: 'mw-w', area: [0, 9, 0, 10], to: 'glass-flats', anchor: 'from-miragewell' },
  ],
  anchors: { 'from-glass-flats': [1, 9, 'e'] },
  roam: null,
});
