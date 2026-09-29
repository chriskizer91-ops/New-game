// Stormwatch (M5 spec §2). STUB from the M5 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'stormwatch', name: 'Stormwatch', region: 'ironspire', biome: 'outpost', music: 'town',
  backdrop: 'scorchgate', zone: null, level: 15, travel: true, dark: false,
  lore: [[1020, 240, 13, 12]],
  w: 26, h: 24,
  rows: [
    '############..############', //  0
    '#........................#', //  1
    '#........................#', //  2
    '#........................#', //  3
    '#........................#', //  4
    '#........................#', //  5
    '#........................#', //  6
    '#........................#', //  7
    '#........................#', //  8
    '#........................#', //  9
    '#........................#', // 10
    '.........................#', // 11
    '.........................#', // 12
    '#........................#', // 13
    '#........................#', // 14
    '#........................#', // 15
    '#........................#', // 16
    '#........................#', // 17
    '#........................#', // 18
    '#........................#', // 19
    '#........................#', // 20
    '#........................#', // 21
    '#........................#', // 22
    '##########################', // 23
  ],
  entities: [
    { id: 'stormwatch-fire', kind: 'hearthfire', at: [13, 11], stand: [13, 12, 'n'] },
    { id: 'quill', kind: 'npc', npc: 'quill', at: [6, 6], face: 's' },
    { id: 'rook', kind: 'npc', npc: 'rook', at: [20, 16], face: 'w' },
    { id: 'ysolde', kind: 'npc', npc: 'ysolde', at: [18, 5], face: 's' },
    { id: 'sw-board', kind: 'board', at: [8, 16], opens: 'bounties' },
  ],
  exits: [
    { id: 'sw-w', area: [0, 11, 0, 12], to: 'ironhold', anchor: 'from-stormwatch' },
    { id: 'sw-n', area: [12, 0, 13, 0], to: 'frost-road', anchor: 'from-stormwatch', gate: { brand: 'brand-of-iron' }, sealed: { region: 'ironspire', text: 'Captain Ysolde\'s orders: the north gate stays shut while the Tallymen hold the ice road.', hint: 'The gate opens once the Brand of Iron is yours.' } },
  ],
  anchors: { 'from-hold': [1, 11, 'e'], 'from-frost-road': [12, 1, 's'] },
  roam: null,
});
