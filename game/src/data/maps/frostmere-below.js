// Beneath Frostmere (M5 spec §2). STUB from the M5 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'frostmere-below', name: 'Beneath Frostmere', region: 'ironspire', biome: 'ice-cave', music: 'dungeon',
  backdrop: 'scorchgate-vaults', zone: null, level: 17, travel: false, dark: true,
  lore: [[980, 115, 10, 10]],
  w: 22, h: 22,
  rows: [
    '######################', //  0
    '#____________________#', //  1
    '#____________________#', //  2
    '#____________________#', //  3
    '#____________________#', //  4
    '#____________________#', //  5
    '#____________________#', //  6
    '#____________________#', //  7
    '#____________________#', //  8
    '#____________________#', //  9
    '#____________________#', // 10
    '#____________________#', // 11
    '#____________________#', // 12
    '#____________________#', // 13
    '#____________________#', // 14
    '#____________________#', // 15
    '#____________________#', // 16
    '#____________________#', // 17
    '#____________________#', // 18
    '#____________________#', // 19
    '#____________________#', // 20
    '##########__##########', // 21
  ],
  entities: [
    { id: 'fb-choir', kind: 'encounter', enc: 'fb-choir', mode: 'block', at: [10, 14], face: 's' },
    { id: 'rime-abbot', kind: 'encounter', enc: 'rime-abbot', mode: 'lair', at: [10, 5], area: [9, 4, 11, 5], face: 's' },
  ],
  exits: [
    { id: 'fb-up', area: [10, 21, 11, 21], to: 'frostmere', anchor: 'from-below' },
  ],
  anchors: { 'from-frostmere': [10, 20, 'n'] },
  roam: null,
});
