// The Long Boardwalk (M6 spec §2). STUB from the M6 scaffold: plain ground inside walls, with the spec's exits,
// anchors and entity ids in rough places. P2 (maps) replaces the tiles, lays everything out and adds
// the roads, locks, chests and signs. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'long-boardwalk', name: 'The Long Boardwalk', region: 'gloomfen', biome: 'boardwalk', music: 'wilds',
  backdrop: 'hearth-road', zone: 'boardwalk', level: 17, travel: false, dark: false,
  lore: [[285, 545, 1, 8], [330, 675, 54, 8]],
  w: 56, h: 18,
  rows: [
    '########################################################', //  0
    '#......................................................#', //  1
    '#......................................................#', //  2
    '#......................................................#', //  3
    '#......................................................#', //  4
    '#......................................................#', //  5
    '#......................................................#', //  6
    '#......................................................#', //  7
    '........................................................', //  8
    '........................................................', //  9
    '#......................................................#', // 10
    '#......................................................#', // 11
    '#......................................................#', // 12
    '#......................................................#', // 13
    '#......................................................#', // 14
    '#......................................................#', // 15
    '#......................................................#', // 16
    '########################################################', // 17
  ],
  entities: [
    { id: 'lb-drowned', kind: 'encounter', enc: 'lb-drowned', mode: 'block', at: [28, 8], face: 'w' },
    { id: 'lb-lights', kind: 'encounter', enc: 'lb-lights', mode: 'pack', at: [40, 3], face: 's' },
  ],
  exits: [
    { id: 'lb-w', area: [0, 8, 0, 9], to: 'bogmire', anchor: 'from-boardwalk' },
    { id: 'lb-e', area: [55, 8, 55, 9], to: 'misthollow', anchor: 'from-boardwalk', gate: { brand: 'brand-of-lanterns' }, sealed: { region: 'gloomfen', text: 'The lights on the boardwalk won\'t let anyone past.', hint: 'The lights will go out when the Lantern Mother rests.' } },
  ],
  anchors: { 'from-bogmire': [1, 8, 'e'], 'from-misthollow': [54, 8, 'w'] },
  roam: { max: 3, rects: [[34, 1, 50, 6]] },
});
