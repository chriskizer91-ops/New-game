// The Glass Heart (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'deep-shaft-2', name: 'The Glass Heart', region: 'sunscorch', biome: 'crystal', music: 'dungeon',
  backdrop: 'glass-heart', zone: null, level: 12, travel: false, dark: false,
  lore: [[770, 580, 8, 9]],
  w: 18, h: 18,
  rows: [
    '########..########', //  0
    '#................#', //  1
    '#................#', //  2
    '#................#', //  3
    '#................#', //  4
    '#................#', //  5
    '#................#', //  6
    '#................#', //  7
    '#................#', //  8
    '#................#', //  9
    '#................#', // 10
    '#................#', // 11
    '#................#', // 12
    '#................#', // 13
    '#................#', // 14
    '#................#', // 15
    '#................#', // 16
    '##################', // 17
  ],
  entities: [
    { id: 'kharzul-heart', kind: 'encounter', enc: 'kharzul-heart', mode: 'lair', at: [8, 13], area: [7, 12, 9, 13], face: 'n' },
  ],
  exits: [
    { id: 'gh-up', area: [8, 0, 9, 0], to: 'deep-shaft-1', anchor: 'from-deep-shaft-2' },
  ],
  anchors: { 'from-deep-shaft-1': [8, 1, 's'] },
  roam: null,
});
