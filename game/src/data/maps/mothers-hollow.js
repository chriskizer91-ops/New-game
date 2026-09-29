// The Mother's Hollow (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mothers-hollow', name: 'The Mother\'s Hollow', region: 'gloomfen', biome: 'drowned-grove', music: 'dungeon',
  backdrop: 'heartroot', zone: null, level: 17, travel: false, dark: true,
  lore: [[360, 540, 10, 10]],
  w: 22, h: 20,
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
    '##########__##########', // 19
  ],
  entities: [
    { id: 'lantern-mother', kind: 'encounter', enc: 'lantern-mother', mode: 'lair', at: [10, 6], area: [9, 5, 11, 6], face: 's' },
    { id: 'hollow-house', kind: 'sign', at: [4, 3], text: 'A sunken house with every lamp in it lit.' },
  ],
  exits: [
    { id: 'hollow-s', area: [10, 19, 11, 19], to: 'lanternfen', anchor: 'from-hollow' },
  ],
  anchors: { 'from-lanternfen': [10, 18, 'n'] },
  roam: null,
});
