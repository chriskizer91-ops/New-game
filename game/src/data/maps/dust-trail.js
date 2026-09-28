// The Dust Trail (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'dust-trail', name: 'The Dust Trail', region: 'sunscorch', biome: 'canyon', music: 'desert',
  backdrop: 'dust-trail', zone: 'dust-trail', level: 10, travel: true, dark: false,
  lore: [[860, 480, 44, 11], [790, 555, 1, 11]],
  w: 46, h: 24,
  rows: [
    '##############################################', //  0
    '#............................................#', //  1
    '#............................................#', //  2
    '#............................................#', //  3
    '#............................................#', //  4
    '#............................................#', //  5
    '#............................................#', //  6
    '#............................................#', //  7
    '#............................................#', //  8
    '#............................................#', //  9
    '#............................................#', // 10
    '..............................................', // 11
    '..............................................', // 12
    '#............................................#', // 13
    '#............................................#', // 14
    '#............................................#', // 15
    '#............................................#', // 16
    '#............................................#', // 17
    '#............................................#', // 18
    '#............................................#', // 19
    '#............................................#', // 20
    '#............................................#', // 21
    '#............................................#', // 22
    '##############################################', // 23
  ],
  entities: [
    { id: 'dust-cairn', kind: 'hearthfire', at: [22, 11], stand: [22, 12, 'n'], cold: true },
    { id: 'dt-scorpions', kind: 'encounter', enc: 'dt-scorpions', mode: 'pack', at: [30, 6] },
    { id: 'dt-skinks', kind: 'encounter', enc: 'dt-skinks', mode: 'pack', at: [12, 18] },
    { id: 'dt-aqueduct', kind: 'encounter', enc: 'dt-aqueduct', mode: 'block', at: [38, 20], face: 'n' },
    { id: 'wyrm-lair', kind: 'encounter', enc: 'wyrm-lair', mode: 'lair', at: [6, 4], face: 's' },
  ],
  exits: [
    { id: 'dt-e', area: [45, 11, 45, 12], to: 'sandspire', anchor: 'from-dust-trail' },
    { id: 'dt-w', area: [0, 11, 0, 12], to: 'dusthaven', anchor: 'from-dust-trail' },
  ],
  anchors: { 'from-sandspire': [44, 11, 'w'], 'from-dusthaven': [1, 11, 'e'] },
  roam: { max: 3, rects: [[2, 2, 43, 21]] },
});
