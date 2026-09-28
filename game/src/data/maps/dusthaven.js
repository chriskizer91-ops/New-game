// Dusthaven (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'dusthaven', name: 'Dusthaven', region: 'sunscorch', biome: 'mine-camp', music: 'town',
  backdrop: 'dust-trail', zone: null, level: 11, travel: true, dark: false,
  lore: [[780, 560, 12, 11]],
  w: 24, h: 22,
  rows: [
    '########################', //  0
    '#......................#', //  1
    '#......................#', //  2
    '#......................#', //  3
    '#......................#', //  4
    '#......................#', //  5
    '#......................#', //  6
    '#......................#', //  7
    '#......................#', //  8
    '#......................#', //  9
    '#.......................', // 10
    '#.......................', // 11
    '#......................#', // 12
    '#......................#', // 13
    '#......................#', // 14
    '#......................#', // 15
    '#......................#', // 16
    '#......................#', // 17
    '#......................#', // 18
    '#......................#', // 19
    '#......................#', // 20
    '########################', // 21
  ],
  entities: [
    { id: 'pithead', kind: 'hearthfire', at: [12, 11], stand: [12, 12, 'n'] },
    { id: 'luma', kind: 'npc', npc: 'luma', at: [5, 6], face: 's' },
    { id: 'ode', kind: 'npc', npc: 'ode', at: [18, 6], face: 's' },
    { id: 'miner', kind: 'npc', npc: 'miner', at: [8, 16], face: 'e' },
  ],
  exits: [
    { id: 'dh-e', area: [23, 10, 23, 11], to: 'dust-trail', anchor: 'from-dusthaven' },
    { id: 'dh-shaft', area: [11, 1, 12, 1], to: 'deep-shaft-1', anchor: 'from-dusthaven' },
  ],
  anchors: { 'from-dust-trail': [22, 10, 'w'], 'from-deep-shaft': [11, 2, 's'] },
  roam: null,
});
