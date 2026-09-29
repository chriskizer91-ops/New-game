// Harrow's Forge (M5 spec §2). STUB from the M5 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'harrows-forge', name: 'Harrow\'s Forge', region: 'ironspire', biome: 'forge', music: 'dungeon',
  backdrop: 'glass-heart', zone: null, level: 16, travel: false, dark: false,
  lore: [[880, 180, 9, 9]],
  w: 20, h: 18,
  rows: [
    '####################', //  0
    '#__________________#', //  1
    '#__________________#', //  2
    '#__________________#', //  3
    '#__________________#', //  4
    '#__________________#', //  5
    '#__________________#', //  6
    '#__________________#', //  7
    '#__________________#', //  8
    '#__________________#', //  9
    '#__________________#', // 10
    '#__________________#', // 11
    '#__________________#', // 12
    '#__________________#', // 13
    '#__________________#', // 14
    '#__________________#', // 15
    '#__________________#', // 16
    '#########__#########', // 17
  ],
  entities: [
    { id: 'mother-anvil', kind: 'encounter', enc: 'mother-anvil', mode: 'lair', at: [9, 6], area: [8, 5, 10, 6], face: 's' },
    { id: 'fg-mark', kind: 'sign', at: [3, 3], look: 'plaque', text: 'A broken ring, cut deep into the anvil-stone: Harrow Ironvein\'s mark.' },
  ],
  exits: [
    { id: 'fg-up', area: [9, 17, 10, 17], to: 'ironhold-deeps', anchor: 'from-forge' },
  ],
  anchors: { 'from-deeps': [9, 16, 'n'] },
  roam: null,
});
