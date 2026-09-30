// Thareia (T2): Mosswatch Tower, Chapter 1's copy of the old game's mosswatch-1.js (design/09-t2-spec.md section 2.6):
// the old rows and painting (`paint`). Old Garret in his kitchen (gone up to the Lamp Room once the signalman is beaten),
// crates on the stair (the only way up), the ledger room behind Garret's door, and Wenna by the east wall for S1 (the
// party comes back from the cove to `from-cove`).
// Rows and tiles as mosswatch-1.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-mosswatch-1', name: 'Mosswatch Tower', region: 'verdant', biome: 'tower', music: 'dungeon', paint: 'mosswatch-1',
  backdrop: 'mosswatch', zone: null, level: 6, travel: false, dark: false,
  lore: [[140, 280, 7, 8]],
  w: 14, h: 16,
  rows: [
    'xxx########xxx', //  0
    'xx#.._####_#xx', //  1
    'x#."._#s##__#x', //  2
    '#_.___#_##,__#', //  3
    '#t___o___#_,_#', //  4
    '#_.___oo_#,__#', //  5
    '*_______.#_###', //  6
    '#.__________"#', //  7
    '#"._______T."*', //  8
    '#t.__"_______#', //  9
    '*::_..__ww___#', // 10
    '*::_.___ww_.t#', // 11
    '#o:__________#', // 12
    'x#t..______.#x', // 13
    'xx#___..___#xx', // 14
    'xxx#*#++#*#xxx', // 15
  ],
  entities: [
    { id: 'c1-mw-arrive', kind: 'trigger', area: [5, 13, 8, 14], on: 'step', once: true, dialogue: 'c1-mw-arrive' },
    { id: 'th-garret', kind: 'npc', npc: 'th-garret', at: [4, 11], face: 'e', if: { not: { beaten: 'c1-mw-lantern' } } },
    // crates on Garret's stair: the only way up (a runner speaks first: c1-mw-stair-before, spec 3.2)
    { id: 'c1-mw-stair', kind: 'encounter', enc: 'c1-mw-stair', mode: 'block', at: [7, 4], face: 's', talk: 'c1-mw-stair-before' },
    { id: 'th-mw-ledger-door', kind: 'gate', area: [10, 6, 10, 6], look: 'door', open: { flag: 'c1-mosswatch' }, text: 'A stout door, locked. Garret keeps the key.' },
    { id: 'th-mw-manifest', kind: 'chest', at: [11, 3], loot: { gold: 80, items: [{ rarity: 'runed' }] }, note: 'Fernshaw crates, packed per the map. Fjord run.' },
    { id: 'th-mw-hearth', kind: 'hearthfire', at: [1, 11], stand: [2, 11, 'w'] },
    { id: 'th-mw-alcove', kind: 'chest', at: [1, 3], loot: { gold: 30, bag: { 'hearth-tonic': 1 } } },
    { id: 'th-mw-crate', kind: 'chest', at: [12, 12], loot: { gold: 5 }, note: 'An empty crate. It still hums, faintly.' },
    { id: 'th-wenna', kind: 'npc', npc: 'th-wenna', at: [11, 9], face: 'w', if: { flag: 's1-open' } },
  ],
  exits: [
    { id: 'mw1-door', area: [6, 15, 7, 15], to: 'th-mossfall', anchor: 'from-tower' },
    { id: 'mw1-up', area: [7, 2, 7, 2], to: 'th-mosswatch-2', anchor: 'from-stair' },
  ],
  anchors: { 'from-mossfall': [6, 13, 'n'], 'from-lamp': [7, 3, 's'], 'from-cove': [6, 13, 'n'] },
  roam: null,
});
