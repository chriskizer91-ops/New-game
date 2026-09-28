// Sandspire (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'sandspire', name: 'Sandspire', region: 'sunscorch', biome: 'desert-town', music: 'town',
  backdrop: 'sandspire', zone: null, level: 10, travel: true, dark: false,
  lore: [[870, 470, 15, 12]],
  w: 30, h: 26,
  rows: [
    '##############..##############', //  0
    '#............................#', //  1
    '#............................#', //  2
    '#............................#', //  3
    '#............................#', //  4
    '#............................#', //  5
    '#............................#', //  6
    '#............................#', //  7
    '#............................#', //  8
    '#............................#', //  9
    '#............................#', // 10
    '#............................#', // 11
    '..............................', // 12
    '..............................', // 13
    '#............................#', // 14
    '#............................#', // 15
    '#............................#', // 16
    '#............................#', // 17
    '#............................#', // 18
    '#............................#', // 19
    '#............................#', // 20
    '#............................#', // 21
    '#............................#', // 22
    '#............................#', // 23
    '#............................#', // 24
    '##############################', // 25
  ],
  entities: [
    { id: 'spire-hearth', kind: 'hearthfire', at: [15, 12], stand: [15, 13, 'n'] },
    { id: 'zara', kind: 'npc', npc: 'zara', at: [6, 5], face: 's' },
    { id: 'qasim', kind: 'npc', npc: 'qasim', at: [22, 5], face: 's' },
    { id: 'idris', kind: 'npc', npc: 'idris', at: [8, 20], face: 'n' },
    { id: 'spire-guard', kind: 'npc', npc: 'spire-guard', at: [17, 3], face: 's' },
    { id: 'water-seller', kind: 'npc', npc: 'water-seller', at: [21, 20], face: 'n' },
    { id: 'ss-board', kind: 'board', at: [11, 8], opens: 'bounties' },
  ],
  exits: [
    { id: 'ss-n', area: [14, 0, 15, 0], to: 'sun-road', anchor: 'from-sandspire' },
    { id: 'ss-w', area: [0, 12, 0, 13], to: 'dust-trail', anchor: 'from-sandspire' },
    { id: 'ss-e', area: [29, 12, 29, 13], to: 'glass-flats', anchor: 'from-sandspire' },
  ],
  anchors: { 'from-sun-road': [14, 1, 's'], 'from-dust-trail': [1, 12, 'e'], 'from-glass-flats': [28, 12, 'w'] },
  roam: null,
});
