// The Deep Shaft (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'deep-shaft-1', name: 'The Deep Shaft', region: 'sunscorch', biome: 'mine', music: 'dungeon',
  backdrop: 'deep-shaft', zone: 'deep-shaft', level: 11, travel: false, dark: true,
  lore: [[775, 570, 12, 12]],
  w: 24, h: 24,
  rows: [
    '###########..###########', //  0
    '#......................#', //  1
    '#......................#', //  2
    '#......................#', //  3
    '#......................#', //  4
    '#......................#', //  5
    '#......................#', //  6
    '#......................#', //  7
    '#......................#', //  8
    '#......................#', //  9
    '#......................#', // 10
    '#......................#', // 11
    '#......................#', // 12
    '#......................#', // 13
    '#......................#', // 14
    '#......................#', // 15
    '#......................#', // 16
    '#......................#', // 17
    '#......................#', // 18
    '#......................#', // 19
    '#......................#', // 20
    '#......................#', // 21
    '#......................#', // 22
    '###########..###########', // 23
  ],
  entities: [
    { id: 'shaft-lamp', kind: 'hearthfire', at: [12, 5], stand: [12, 6, 'n'], cold: true },
    { id: 'ds-crew', kind: 'encounter', enc: 'ds-crew', mode: 'block', at: [4, 12], face: 'e' },
    { id: 'ds-scorpions', kind: 'encounter', enc: 'ds-scorpions', mode: 'pack', at: [18, 16] },
  ],
  exits: [
    { id: 'ds-up', area: [11, 0, 12, 0], to: 'dusthaven', anchor: 'from-deep-shaft' },
    { id: 'ds-down', area: [11, 23, 12, 23], to: 'deep-shaft-2', anchor: 'from-deep-shaft-1' },
  ],
  anchors: { 'from-dusthaven': [11, 1, 's'], 'from-deep-shaft-2': [11, 22, 'n'] },
  roam: { max: 2, rects: [[2, 8, 21, 21]] },
});
