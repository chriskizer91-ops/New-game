// Peak's Veil (M5 spec §2). STUB from the M5 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'peaks-veil', name: 'Peak\'s Veil', region: 'ironspire', biome: 'monastery', music: 'town',
  backdrop: 'mosswatch', zone: null, level: 13, travel: true, dark: false,
  lore: [[750, 240, 14, 12]],
  w: 28, h: 24,
  rows: [
    '#############::#############', //  0
    '#::::::::::::::::::::::::::#', //  1
    '#::::::::::::::::::::::::::#', //  2
    '#::::::::::::::::::::::::::#', //  3
    '#::::::::::::::::::::::::::#', //  4
    '#::::::::::::::::::::::::::#', //  5
    '#::::::::::::::::::::::::::#', //  6
    '#::::::::::::::::::::::::::#', //  7
    '#::::::::::::::::::::::::::#', //  8
    '#::::::::::::::::::::::::::#', //  9
    '#::::::::::::::::::::::::::#', // 10
    ':::::::::::::::::::::::::::#', // 11
    ':::::::::::::::::::::::::::#', // 12
    '#::::::::::::::::::::::::::#', // 13
    '#::::::::::::::::::::::::::#', // 14
    '#::::::::::::::::::::::::::#', // 15
    '#::::::::::::::::::::::::::#', // 16
    '#::::::::::::::::::::::::::#', // 17
    '#::::::::::::::::::::::::::#', // 18
    '#::::::::::::::::::::::::::#', // 19
    '#::::::::::::::::::::::::::#', // 20
    '#::::::::::::::::::::::::::#', // 21
    '#::::::::::::::::::::::::::#', // 22
    '#############::#############', // 23
  ],
  entities: [
    { id: 'veil-hearth', kind: 'hearthfire', at: [14, 11], stand: [14, 12, 'n'] },
    { id: 'wynn', kind: 'npc', npc: 'wynn', at: [8, 6], face: 's' },
    { id: 'kesh', kind: 'npc', npc: 'kesh', at: [20, 6], face: 's' },
    { id: 'novice', kind: 'npc', npc: 'novice', at: [18, 16], face: 'w' },
  ],
  exits: [
    { id: 'pv-s', area: [13, 23, 14, 23], to: 'rockslide-pass', anchor: 'from-veil' },
    { id: 'pv-n', area: [13, 0, 14, 0], to: 'iron-stair', anchor: 'from-veil' },
    { id: 'pv-w', area: [0, 11, 0, 12], to: 'highfold', anchor: 'from-veil', gate: { flag: 'highfold-open' }, sealed: { region: 'ironspire', text: 'The west gate is barred from the inside. Past it, the Highfold path goes down to Fawnrest.', hint: 'Mother Wynn keeps the key.' } },
  ],
  anchors: { 'from-pass': [13, 22, 'n'], 'from-stair': [13, 1, 's'], 'from-highfold': [1, 11, 'e'] },
  roam: null,
});
