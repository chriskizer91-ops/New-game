// The Drowned Belfry (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'drowned-belfry', name: 'The Drowned Belfry', region: 'gloomfen', biome: 'belfry', music: 'dungeon',
  backdrop: 'frostmere-below', zone: null, level: 18, travel: false, dark: true,
  lore: [[330, 690, 10, 10]],
  w: 22, h: 24,
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
    '#____________________#', // 21
    '#____________________#', // 22
    '##########__##########', // 23
  ],
  entities: [
    { id: 'db-choir', kind: 'encounter', enc: 'db-choir', mode: 'block', at: [10, 14], face: 's' },
    { id: 'cantor', kind: 'encounter', enc: 'cantor', mode: 'lair', at: [10, 5], area: [9, 4, 11, 5], face: 's' },
    { id: 'db-sleeper', kind: 'sign', at: [4, 8], text: 'Under the floor, a shape, and a slow light that comes and goes.' },
  ],
  exits: [
    { id: 'db-up', area: [10, 23, 11, 23], to: 'misthollow', anchor: 'from-belfry' },
  ],
  anchors: { 'from-misthollow': [10, 22, 'n'] },
  roam: null,
});
