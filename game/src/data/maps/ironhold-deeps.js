// The Ironhold Deeps (M5 spec §2). STUB from the M5 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'ironhold-deeps', name: 'The Ironhold Deeps', region: 'ironspire', biome: 'forge', music: 'dungeon',
  backdrop: 'deep-shaft', zone: 'deeps', level: 15, travel: false, dark: true,
  lore: [[875, 175, 14, 14]],
  w: 28, h: 28,
  rows: [
    '#############__#############', //  0
    '#__________________________#', //  1
    '#__________________________#', //  2
    '#__________________________#', //  3
    '#__________________________#', //  4
    '#__________________________#', //  5
    '#__________________________#', //  6
    '#__________________________#', //  7
    '#__________________________#', //  8
    '#__________________________#', //  9
    '#__________________________#', // 10
    '#__________________________#', // 11
    '#__________________________#', // 12
    '#__________________________#', // 13
    '#__________________________#', // 14
    '#__________________________#', // 15
    '#__________________________#', // 16
    '#__________________________#', // 17
    '#__________________________#', // 18
    '#__________________________#', // 19
    '#__________________________#', // 20
    '#__________________________#', // 21
    '#__________________________#', // 22
    '#__________________________#', // 23
    '#__________________________#', // 24
    '#__________________________#', // 25
    '#__________________________#', // 26
    '#############__#############', // 27
  ],
  entities: [
    { id: 'deeps-forge', kind: 'hearthfire', at: [14, 17], stand: [14, 18, 'n'], cold: true },
    { id: 'id-forgeborn', kind: 'encounter', enc: 'id-forgeborn', mode: 'block', at: [13, 22], face: 's' },
    { id: 'id-bellows', kind: 'encounter', enc: 'id-bellows', mode: 'block', at: [13, 8], face: 's' },
    { id: 'id-smith', kind: 'encounter', enc: 'id-smith', mode: 'block', at: [22, 12], face: 'w' },
  ],
  exits: [
    { id: 'id-up', area: [13, 27, 14, 27], to: 'ironhold', anchor: 'from-deeps' },
    { id: 'id-down', area: [13, 0, 14, 0], to: 'harrows-forge', anchor: 'from-deeps' },
  ],
  anchors: { 'from-hold': [13, 26, 'n'], 'from-forge': [13, 1, 's'] },
  roam: { max: 2, rects: [[2, 14, 10, 24]] },
});
