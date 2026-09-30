// Mosswatch Tower, the ground floor (M3 spec §2.1, §2.3). A round watchtower gone green: moss and
// ferns over the flags, a sapling through the floor, rain puddles, torches in the wall, and Garret's
// kitchen hearth in the west wall. The stair up (7,2) is walled in, so the smugglers' block at its
// mouth (7,4) is the only way to it. The ledger room (x10-12, y1-5) opens only through its
// tally-seal door (10,6). Every entity sits at its spec coordinates.
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mosswatch-1', name: 'Mosswatch Tower', region: 'verdant', biome: 'tower', music: 'dungeon',
  backdrop: 'mosswatch', zone: null, level: 5, travel: false, dark: false,
  lore: [[140, 280, 7, 8]],
  w: 14, h: 16,
  rows: [
    'xxx########xxx', // 0
    'xx#.._####_#xx', // 1
    'x#."._#s##__#x', // 2
    '#_.___#_##,__#', // 3
    '#t___o___#_,_#', // 4
    '#_.___oo_#,__#', // 5
    '*_______.#_###', // 6
    '#.__________"#', // 7
    '#"._______T."*', // 8
    '#t.__"_______#', // 9
    '*::_..__ww___#', // 10
    '*::_.___ww_.t#', // 11
    '#o:__________#', // 12
    'x#t..______.#x', // 13
    'xx#___..___#xx', // 14
    'xxx#*#++#*#xxx', // 15
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
