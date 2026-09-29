// The Misthollow Ruins (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'misthollow', name: 'The Misthollow Ruins', region: 'gloomfen', biome: 'sunken-city', music: 'wilds',
  backdrop: 'frostmere', zone: 'misthollow', level: 17, travel: true, dark: false, fog: true,
  lore: [[330, 680, 17, 15]],
  w: 36, h: 32,
  rows: [
    '#################..#################', //  0
    '#..................................#', //  1
    '#..................................#', //  2
    '#..................................#', //  3
    '#..................................#', //  4
    '#..................................#', //  5
    '#..................................#', //  6
    '#..................................#', //  7
    '#..................................#', //  8
    '#..................................#', //  9
    '#..................................#', // 10
    '#..................................#', // 11
    '#..................................#', // 12
    '#..................................#', // 13
    '#..................................#', // 14
    '...................................#', // 15
    '...................................#', // 16
    '#..................................#', // 17
    '#..................................#', // 18
    '#..................................#', // 19
    '#..................................#', // 20
    '#..................................#', // 21
    '#..................................#', // 22
    '#..................................#', // 23
    '#..................................#', // 24
    '#..................................#', // 25
    '#..................................#', // 26
    '#..................................#', // 27
    '#..................................#', // 28
    '#..................................#', // 29
    '#..................................#', // 30
    '#################..#################', // 31
  ],
  entities: [
    { id: 'bell-hearth', kind: 'hearthfire', at: [8, 6], stand: [8, 7, 'n'], cold: true },
    { id: 'mh-salvage', kind: 'encounter', enc: 'mh-salvage', mode: 'block', at: [10, 15], face: 'w' },
    { id: 'corvus', kind: 'npc', npc: 'corvus', at: [26, 8], face: 's' },
    { id: 'mh-ringers', kind: 'encounter', enc: 'mh-ringers', mode: 'block', at: [17, 24], face: 'n' },
  ],
  exits: [
    { id: 'mh-w', area: [0, 15, 0, 16], to: 'long-boardwalk', anchor: 'from-misthollow' },
    { id: 'mh-belfry', area: [17, 0, 18, 0], to: 'drowned-belfry', anchor: 'from-misthollow' },
    { id: 'mh-s', area: [17, 31, 18, 31], to: 'blackwater-reach', anchor: 'from-misthollow' },
  ],
  anchors: { 'from-boardwalk': [1, 15, 'e'], 'from-belfry': [17, 1, 's'], 'from-reach': [17, 30, 'n'] },
  roam: { max: 3, rects: [[22, 16, 32, 26]] },
});
