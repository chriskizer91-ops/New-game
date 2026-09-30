// Thareia (T2): The Lamp Room, Chapter 1's copy of the old game's mosswatch-2.js (design/09-t2-spec.md section 2.7): the
// old rows and painting (`paint`), dark. A signalman at the Lantern, his back to you; once he is beaten the Lantern's
// light goes out, the tower fire can be lit, and Garret comes up. The lookout shows the fjord coast.
// Rows and tiles as mosswatch-2.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-mosswatch-2', name: 'The Lamp Room', region: 'verdant', biome: 'tower', music: 'dungeon', paint: 'mosswatch-2',
  backdrop: 'mosswatch', zone: null, level: 7, travel: false, dark: true,
  lore: [[140, 280, 6, 6]],
  w: 12, h: 12,
  rows: [
    'xxx######xxx', //  0
    'xx#::::::##x', //  1
    'x##::::::#:#', //  2
    '#_#::::::#_#', //  3
    '#.####:###_#', //  4
    '#_______o_.#', //  5
    '#_.____"___#', //  6
    '#o_______oo#', //  7
    '#_________o#', //  8
    'x#._______#x', //  9
    'xx#..____#xx', // 10
    'xxx###s##xxx', // 11
  ],
  entities: [
    { id: 'c1-mw2-arrive', kind: 'trigger', area: [5, 8, 7, 8], on: 'step', once: true, dialogue: 'c1-mw2-arrive' },
    { id: 'c1-mw-lantern', kind: 'encounter', enc: 'c1-mw-lantern', mode: 'lair', at: [6, 5], area: [6, 4, 6, 5], face: 's', talk: 'c1-mw-lantern-before' },
    { id: 'th-mw-signal-light', kind: 'light', at: [6, 5], radius: 3, if: { not: { beaten: 'c1-mw-lantern' } } },
    { id: 'th-mw-fire', kind: 'hearthfire', at: [6, 2], stand: [6, 3, 'n'], cold: true, coldUntil: { beaten: 'c1-mw-lantern' } },
    { id: 'th-garret-up', kind: 'npc', npc: 'th-garret', at: [4, 3], face: 'e', if: { beaten: 'c1-mw-lantern' } },
    { id: 'th-mw-lookout', kind: 'lookout', at: [10, 2] },
    { id: 'th-mw-cache', kind: 'chest', at: [1, 3], loot: { gold: 40, bag: { 'ember-salts': 1 } }, note: 'A signal code, pencilled on a card: two long, one short.' },
    { id: 'th-mw-oil', kind: 'chest', at: [3, 10], loot: { bag: { 'hearth-tonic': 1 } } },
  ],
  exits: [
    { id: 'mw2-down', area: [6, 11, 6, 11], to: 'th-mosswatch-1', anchor: 'from-lamp' },
  ],
  anchors: { 'from-stair': [6, 9, 'n'] },
  roam: null,
});
