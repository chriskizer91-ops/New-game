// The Scorchgate Vaults (M4 spec §2). STUB from the M4 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. WP-maps (P2) replaces the tiles and lays everything out.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'scorchgate-vaults', name: 'The Scorchgate Vaults', region: 'sunscorch', biome: 'vault', music: 'dungeon',
  backdrop: 'scorchgate-vaults', zone: null, level: 13, travel: false, dark: true,
  lore: [[935, 675, 11, 12]],
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
    '########################', // 23
  ],
  entities: [
    { id: 'vault-guard', kind: 'encounter', enc: 'vault-guard', mode: 'block', at: [5, 8], face: 'e' },
    { id: 'ashen-warden', kind: 'encounter', enc: 'ashen-warden', mode: 'lair', at: [11, 19], area: [10, 18, 12, 19], face: 'n' },
  ],
  exits: [
    { id: 'sv-up', area: [11, 0, 12, 0], to: 'scorchgate', anchor: 'from-vaults' },
  ],
  anchors: { 'from-scorchgate': [11, 1, 's'] },
  roam: null,
});
