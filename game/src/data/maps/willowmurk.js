// Willowmurk (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'willowmurk', name: 'Willowmurk', region: 'gloomfen', biome: 'willow-village', music: 'town',
  backdrop: 'eldergrove', zone: null, level: 15, travel: true, dark: false,
  lore: [[410, 620, 15, 12]],
  w: 30, h: 26,
  rows: [
    '##############################', //  0
    '#::::::::::::::::::::::::::::#', //  1
    '#::::::::::::::::::::::::::::#', //  2
    '#::::::::::::::::::::::::::::#', //  3
    '#::::::::::::::::::::::::::::#', //  4
    '#::::::::::::::::::::::::::::#', //  5
    '#::::::::::::::::::::::::::::#', //  6
    '#::::::::::::::::::::::::::::#', //  7
    '#::::::::::::::::::::::::::::#', //  8
    '#::::::::::::::::::::::::::::#', //  9
    '#::::::::::::::::::::::::::::#', // 10
    '#::::::::::::::::::::::::::::#', // 11
    '::::::::::::::::::::::::::::::', // 12
    '::::::::::::::::::::::::::::::', // 13
    '#::::::::::::::::::::::::::::#', // 14
    '#::::::::::::::::::::::::::::#', // 15
    '#::::::::::::::::::::::::::::#', // 16
    '#::::::::::::::::::::::::::::#', // 17
    '#::::::::::::::::::::::::::::#', // 18
    '#::::::::::::::::::::::::::::#', // 19
    '#::::::::::::::::::::::::::::#', // 20
    '#::::::::::::::::::::::::::::#', // 21
    '#::::::::::::::::::::::::::::#', // 22
    '#::::::::::::::::::::::::::::#', // 23
    '#::::::::::::::::::::::::::::#', // 24
    '##############################', // 25
  ],
  entities: [
    { id: 'willow-hearth', kind: 'hearthfire', at: [15, 11], stand: [15, 12, 'n'] },
    { id: 'moss', kind: 'npc', npc: 'moss', at: [10, 6], face: 's' },
    { id: 'sedge', kind: 'npc', npc: 'sedge', at: [20, 6], face: 's' },
    { id: 'wm-villager', kind: 'npc', npc: 'wm-villager', at: [20, 18], face: 'w' },
    { id: 'wm-wights', kind: 'encounter', enc: 'wm-wights', mode: 'block', at: [5, 12], face: 'e' },
    { id: 'wm-willow', kind: 'encounter', enc: 'wm-willow', mode: 'lair', at: [4, 21], area: [3, 20, 5, 21], face: 'e' },
  ],
  exits: [
    { id: 'wm-e', area: [29, 12, 29, 13], to: 'murkway', anchor: 'from-willowmurk' },
    { id: 'wm-w', area: [0, 12, 0, 13], to: 'rotbridge', anchor: 'from-willowmurk' },
  ],
  anchors: { 'from-murkway': [28, 12, 'w'], 'from-rotbridge': [1, 13, 'e'] },
  roam: null,
});
