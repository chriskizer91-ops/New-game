// Bogmire (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'bogmire', name: 'Bogmire', region: 'gloomfen', biome: 'stilt-town', music: 'town',
  backdrop: 'thornhollow', zone: null, level: 16, travel: true, dark: false,
  lore: [[280, 530, 17, 14]],
  w: 34, h: 28,
  rows: [
    '##########::##############::######', //  0
    '#::::::::::::::::::::::::::::::::#', //  1
    '#::::::::::::::::::::::::::::::::#', //  2
    '#::::::::::::::::::::::::::::::::#', //  3
    '#::::::::::::::::::::::::::::::::#', //  4
    '#::::::::::::::::::::::::::::::::#', //  5
    '#::::::::::::::::::::::::::::::::#', //  6
    '#::::::::::::::::::::::::::::::::#', //  7
    '#:::::::::::::::::::::::::::::::::', //  8
    '#:::::::::::::::::::::::::::::::::', //  9
    '#::::::::::::::::::::::::::::::::#', // 10
    '#::::::::::::::::::::::::::::::::#', // 11
    '#::::::::::::::::::::::::::::::::#', // 12
    '#::::::::::::::::::::::::::::::::#', // 13
    '#::::::::::::::::::::::::::::::::#', // 14
    '#::::::::::::::::::::::::::::::::#', // 15
    '#::::::::::::::::::::::::::::::::#', // 16
    '#::::::::::::::::::::::::::::::::#', // 17
    '#::::::::::::::::::::::::::::::::#', // 18
    '#::::::::::::::::::::::::::::::::#', // 19
    '#::::::::::::::::::::::::::::::::#', // 20
    '#::::::::::::::::::::::::::::::::#', // 21
    '#::::::::::::::::::::::::::::::::#', // 22
    '#::::::::::::::::::::::::::::::::#', // 23
    '#::::::::::::::::::::::::::::::::#', // 24
    '#::::::::::::::::::::::::::::::::#', // 25
    '#::::::::::::::::::::::::::::::::#', // 26
    '################::################', // 27
  ],
  entities: [
    { id: 'stilt-hearth', kind: 'hearthfire', at: [17, 13], stand: [17, 14, 'n'] },
    { id: 'gretch', kind: 'npc', npc: 'gretch', at: [8, 6], face: 's' },
    { id: 'nettie', kind: 'npc', npc: 'nettie', at: [24, 18], face: 'w' },
    { id: 'pell', kind: 'npc', npc: 'pell', at: [12, 20], face: 'n' },
    { id: 'bm-watch', kind: 'npc', npc: 'bm-watch', at: [28, 12], face: 'w' },
    { id: 'bm-board', kind: 'board', at: [20, 6], opens: 'bounties' },
  ],
  exits: [
    { id: 'bm-rotbridge', area: [33, 8, 33, 9], to: 'rotbridge', anchor: 'from-bogmire' },
    { id: 'bm-causeway', area: [10, 0, 11, 0], to: 'causeway', anchor: 'from-bogmire', gate: { brand: 'brand-of-the-deep' }, sealed: { region: 'gloomfen', text: 'The causeway is under the Blackwater, and the Blackwater is moving.', hint: 'The causeway clears once the Blackwater falls.' } },
    { id: 'bm-lanternfen', area: [26, 0, 27, 0], to: 'lanternfen', anchor: 'from-bogmire' },
    { id: 'bm-boardwalk', area: [16, 27, 17, 27], to: 'long-boardwalk', anchor: 'from-bogmire' },
  ],
  anchors: { 'from-rotbridge': [32, 8, 'w'], 'from-causeway': [10, 1, 's'], 'from-lanternfen': [26, 1, 's'], 'from-boardwalk': [16, 26, 'n'] },
  roam: null,
});
