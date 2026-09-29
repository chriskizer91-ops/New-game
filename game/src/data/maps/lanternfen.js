// The Lanternfen (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'lanternfen', name: 'The Lanternfen', region: 'gloomfen', biome: 'bog', music: 'wilds',
  backdrop: 'mossfall', zone: 'lanternfen', level: 16, travel: false, dark: false, fog: true,
  lore: [[290, 520, 6, 30], [350, 560, 32, 1]],
  w: 40, h: 32,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..TTTTTT', //  0
    'T......................................T', //  1
    'T......................................T', //  2
    'T......................................T', //  3
    'T......................................T', //  4
    'T......................................T', //  5
    'T......................................T', //  6
    'T......................................T', //  7
    'T......................................T', //  8
    'T......................................T', //  9
    'T......................................T', // 10
    'T......................................T', // 11
    'T......................................T', // 12
    'T......................................T', // 13
    'T......................................T', // 14
    'T......................................T', // 15
    'T......................................T', // 16
    'T......................................T', // 17
    'T......................................T', // 18
    'T......................................T', // 19
    'T......................................T', // 20
    'T......................................T', // 21
    'T......................................T', // 22
    'T......................................T', // 23
    'T......................................T', // 24
    'T......................................T', // 25
    'T......................................T', // 26
    'T......................................T', // 27
    'T......................................T', // 28
    'T......................................T', // 29
    'T......................................T', // 30
    'TTTTTT..TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 31
  ],
  entities: [
    { id: 'lf-moths', kind: 'encounter', enc: 'lf-moths', mode: 'block', at: [10, 22], face: 's' },
    { id: 'fen-cairn', kind: 'hearthfire', at: [18, 16], stand: [18, 17, 'n'], cold: true },
    { id: 'lf-hags', kind: 'encounter', enc: 'lf-hags', mode: 'block', at: [26, 10], face: 's' },
    { id: 'lf-lights', kind: 'encounter', enc: 'lf-lights', mode: 'pack', at: [30, 24], face: 'w' },
    { id: 'grue-hollow', kind: 'encounter', enc: 'grue-hollow', mode: 'lair', at: [6, 6], area: [5, 5, 7, 6], face: 's' },
    { id: 'lf-boots', kind: 'sign', at: [14, 26], text: 'Small bootprints, all going one way.' },
  ],
  exits: [
    { id: 'lf-s', area: [6, 31, 7, 31], to: 'bogmire', anchor: 'from-lanternfen' },
    { id: 'lf-n', area: [32, 0, 33, 0], to: 'mothers-hollow', anchor: 'from-lanternfen' },
  ],
  anchors: { 'from-bogmire': [6, 30, 'n'], 'from-hollow': [32, 1, 's'] },
  roam: { max: 3, rects: [[20, 20, 36, 29], [12, 3, 24, 10]] },
});
