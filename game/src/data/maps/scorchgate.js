// Scorchgate Ruins (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'scorchgate', name: 'Scorchgate Ruins', region: 'sunscorch', biome: 'ash', music: 'wilds',
  backdrop: 'scorchgate', zone: 'scorchgate', level: 12, travel: true, dark: false,
  lore: [[930, 660, 16, 16]],
  w: 32, h: 32,
  rows: [
    '###############..###############', //  0
    '#..............................#', //  1
    '#..............................#', //  2
    '#..............................#', //  3
    '#..............................#', //  4
    '#..............................#', //  5
    '#..............................#', //  6
    '#..............................#', //  7
    '#..............................#', //  8
    '#..............................#', //  9
    '#..............................#', // 10
    '#..............................#', // 11
    '#..............................#', // 12
    '#..............................#', // 13
    '#..............................#', // 14
    '#..............................#', // 15
    '#..............................#', // 16
    '#..............................#', // 17
    '#..............................#', // 18
    '#..............................#', // 19
    '#..............................#', // 20
    '#..............................#', // 21
    '#..............................#', // 22
    '#..............................#', // 23
    '#..............................#', // 24
    '#..............................#', // 25
    '#..............................#', // 26
    '#..............................#', // 27
    '#..............................#', // 28
    '#..............................#', // 29
    '#..............................#', // 30
    '###############..###############', // 31
  ],
  entities: [
    { id: 'last-watchfire', kind: 'hearthfire', at: [16, 25], stand: [16, 26, 'n'], cold: true },
    { id: 'cinder', kind: 'npc', npc: 'cinder', at: [5, 10], face: 'e' },
    { id: 'sg-wights', kind: 'encounter', enc: 'sg-wights', mode: 'pack', at: [24, 12] },
    { id: 'sg-captain', kind: 'encounter', enc: 'sg-captain', mode: 'block', at: [9, 28], face: 'e' },
    { id: 'tamsin-scorchgate', kind: 'encounter', enc: 'tamsin-scorchgate', mode: 'block', at: [22, 20], face: 'w' },
    { id: 'sg-vault-door', kind: 'lock', lock: 'vault-seal', area: [15, 30, 16, 30] },
  ],
  exits: [
    { id: 'sg-n', area: [15, 0, 16, 0], to: 'glass-flats', anchor: 'from-scorchgate' },
    { id: 'sg-vault', area: [15, 31, 16, 31], to: 'scorchgate-vaults', anchor: 'from-scorchgate' },
  ],
  anchors: { 'from-glass-flats': [15, 1, 's'], 'from-vaults': [15, 29, 'n'] },
  roam: { max: 3, rects: [[2, 2, 29, 22]] },
});
