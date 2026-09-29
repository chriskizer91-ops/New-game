// The Blackwater Causeway (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'causeway', name: 'The Blackwater Causeway', region: 'gloomfen', biome: 'causeway', music: 'road',
  backdrop: 'hearth-road', zone: 'causeway', level: 16, travel: false, dark: false,
  lore: [[300, 520, 1, 7], [520, 410, 46, 7]],
  w: 48, h: 16,
  rows: [
    '################################################', //  0
    '#..............................................#', //  1
    '#..............................................#', //  2
    '#..............................................#', //  3
    '#..............................................#', //  4
    '#..............................................#', //  5
    '#..............................................#', //  6
    '................................................', //  7
    '................................................', //  8
    '#..............................................#', //  9
    '#..............................................#', // 10
    '#..............................................#', // 11
    '#..............................................#', // 12
    '#..............................................#', // 13
    '#..............................................#', // 14
    '################################################', // 15
  ],
  entities: [
    { id: 'cw-lights', kind: 'encounter', enc: 'cw-lights', mode: 'pack', at: [24, 3], face: 's' },
    { id: 'cw-mark', kind: 'sign', at: [30, 12], text: 'A water-mark on the causeway stones, higher than your head.' },
  ],
  exits: [
    { id: 'cw-w', area: [0, 7, 0, 8], to: 'bogmire', anchor: 'from-causeway' },
    { id: 'cw-e', area: [47, 7, 47, 8], to: 'keep', anchor: 'from-causeway' },
  ],
  anchors: { 'from-bogmire': [1, 7, 'e'], 'from-keep': [46, 7, 'w'] },
  roam: { max: 2, rects: [[16, 1, 32, 5]] },
});
