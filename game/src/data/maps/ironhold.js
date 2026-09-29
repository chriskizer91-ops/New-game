// Ironhold (M5 spec §2). STUB from the M5 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'ironhold', name: 'Ironhold', region: 'ironspire', biome: 'dwarf-hall', music: 'town',
  backdrop: 'scorchgate', zone: null, level: 14, travel: true, dark: false,
  lore: [[870, 160, 16, 12]],
  w: 32, h: 28,
  rows: [
    '###############::###############', //  0
    '#::::::::::::::::::::::::::::::#', //  1
    '#::::::::::::::::::::::::::::::#', //  2
    '#::::::::::::::::::::::::::::::#', //  3
    '#::::::::::::::::::::::::::::::#', //  4
    '#::::::::::::::::::::::::::::::#', //  5
    '#::::::::::::::::::::::::::::::#', //  6
    '#::::::::::::::::::::::::::::::#', //  7
    '#::::::::::::::::::::::::::::::#', //  8
    '#::::::::::::::::::::::::::::::#', //  9
    '#::::::::::::::::::::::::::::::#', // 10
    '#::::::::::::::::::::::::::::::#', // 11
    '#::::::::::::::::::::::::::::::#', // 12
    '#:::::::::::::::::::::::::::::::', // 13
    '#:::::::::::::::::::::::::::::::', // 14
    '#::::::::::::::::::::::::::::::#', // 15
    '#::::::::::::::::::::::::::::::#', // 16
    '#::::::::::::::::::::::::::::::#', // 17
    '#::::::::::::::::::::::::::::::#', // 18
    '#::::::::::::::::::::::::::::::#', // 19
    '#::::::::::::::::::::::::::::::#', // 20
    '#::::::::::::::::::::::::::::::#', // 21
    '#::::::::::::::::::::::::::::::#', // 22
    '#::::::::::::::::::::::::::::::#', // 23
    '#::::::::::::::::::::::::::::::#', // 24
    '#::::::::::::::::::::::::::::::#', // 25
    '#::::::::::::::::::::::::::::::#', // 26
    '###############::###############', // 27
  ],
  entities: [
    { id: 'thanes-hearth', kind: 'hearthfire', at: [16, 11], stand: [16, 12, 'n'] },
    { id: 'brundar', kind: 'npc', npc: 'brundar', at: [22, 6], face: 's' },
    { id: 'durra', kind: 'npc', npc: 'durra', at: [6, 8], face: 's' },
    { id: 'ih-guard', kind: 'npc', npc: 'ih-guard', at: [24, 20], face: 'w' },
    { id: 'ih-board', kind: 'board', at: [10, 20], opens: 'bounties' },
    { id: 'tamsin-ironhold', kind: 'encounter', enc: 'tamsin-ironhold', mode: 'block', at: [15, 4], face: 's' },
  ],
  exits: [
    { id: 'ih-s', area: [15, 27, 16, 27], to: 'iron-stair', anchor: 'from-hold' },
    { id: 'ih-deeps', area: [15, 0, 16, 0], to: 'ironhold-deeps', anchor: 'from-hold' },
    { id: 'ih-e', area: [31, 13, 31, 14], to: 'stormwatch', anchor: 'from-hold' },
  ],
  anchors: { 'from-stair': [15, 26, 'n'], 'from-deeps': [15, 1, 's'], 'from-stormwatch': [30, 13, 'w'] },
  roam: null,
});
