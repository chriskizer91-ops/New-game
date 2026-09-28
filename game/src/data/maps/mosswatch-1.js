// Mosswatch Tower (M3 spec §2.1, §2.3). The ground floor: Garret's kitchen, the stair up, and the locked ledger room in the north-east.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mosswatch-1', name: 'Mosswatch Tower', region: 'verdant', biome: 'tower', music: 'dungeon',
  backdrop: 'mosswatch', zone: null, level: 5, travel: false, dark: false,
  lore: [[140, 280, 7, 8]],
  w: 14, h: 16,
  rows: [
    '##############', // 0
    '#________#___#', // 1
    '#______s_#___#', // 2
    '#________#___#', // 3
    '#________#___#', // 4
    '#________#___#', // 5
    '#________#_###', // 6
    '#____________#', // 7
    '#____________#', // 8
    '#____________#', // 9
    '#____________#', // 10
    '#____________#', // 11
    '#____________#', // 12
    '#____________#', // 13
    '#____________#', // 14
    '######++######', // 15
  ],
  entities: [
    { id: 'garret', kind: 'npc', npc: 'garret', at: [4, 11], face: 'e' },
    { id: 'mw-stair', kind: 'encounter', enc: 'mw-stair', mode: 'block', at: [7, 4], face: 's' },
    { id: 'mw-ledger-door', kind: 'lock', lock: 'tally-seal', at: [10, 6] },
    { id: 'mw-ledger', kind: 'chest', at: [11, 3], loot: { gold: 100, items: [{ rarity: 'runed' }], story: 'read-ledger' } },
  ],
  exits: [
    { id: 'mw1-door', area: [6, 15, 7, 15], to: 'mossfall', anchor: 'from-tower' },
    { id: 'mw1-up', area: [7, 2, 7, 2], to: 'mosswatch-2', anchor: 'from-stair' },
  ],
  anchors: { 'from-mossfall': [6, 13, 'n'], 'from-lamp': [7, 3, 's'] },
  roam: null,
});
