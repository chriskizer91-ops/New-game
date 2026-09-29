// The Long Boardwalk (M6 spec §2.1, §2.3), the boardwalk from the player's painting: planks on stilts over open water,
// lamp-posts along the rails, from Bogmire (W) to the Misthollow Ruins (E), jogging as the old stilts allowed. A side
// jetty runs south to the fishers' platform and their shelter, where the marsh-lights gather now the fishers have
// gone. Half-way, the boardwalk is broken: a length of planks has gone into the water (27,8-9), and the drowned stand
// on the pier beside the gap (26,7); once they are beaten, barge-planks patch it. Past it a jetty runs north to a dock
// (39,3), and a skiff moored beyond it with a chest aboard. At the east end the lights hang over the planks and let
// no one by (`lb-e`, sealed until the Brand of Lanterns, spec A4).
// Layout notes: the gap is the only way east, so the drowned's gate holds the road; the pier keeps them beside it, off
// the road, when a Brand re-arms them. The reed islets out in the water are out of reach. The dock is the only way to
// the skiff.
// Tiles (boardwalk): 'b' the boardwalk, '_' barge-planks (the patch, the pier, the platform, the skiff's deck),
// '~' open water, 'w' the dock's water, '"' reeds, '.' reed islets, 'T' dead trees, '*' lamp-posts, 'o' stilts and
// piles, 't' nets and crates, '#' the shelter's walls, 'H' its roof, '+' its door.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

// the lights at the east end, until the Lantern Mother rests
const lights = (id, at) => ({ id, kind: 'prop', prop: 'marsh-lights', at, if: { not: { brand: 'brand-of-lanterns' } } });

export default deepFreeze({
  id: 'long-boardwalk', name: 'The Long Boardwalk', region: 'gloomfen', biome: 'boardwalk', music: 'fen',
  backdrop: 'long-boardwalk', zone: 'boardwalk', level: 17, travel: true, dark: false,
  lore: [[292, 540, 1, 8], [332, 668, 54, 8]],
  w: 56, h: 18,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  0
    '~~~~~~~~~~~~~~~~~~~"""""~~~~~~~~~~~~~~___~~~~~~~~~~~~~~~', //  1
    '~~"""""~~~~~~~~~~~~"".T.""~~~~~~~~~~~~___~~~~~""""""~~~~', //  2
    '~"".T.""~~~~~~~~~~~~~""""~~~~~~~~~~~~~~w~~~~~~".T.""~~~~', //  3
    '~~~"""~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~b~~~~~~""""~~~~~~', //  4
    '~~~~~~~~~~~~~~~~~~~~~~~~~o~~~~~~~~~~~~~b~~~~~~~~~~~~~~~~', //  5
    '~~~~~~~~~~~~~~~~~~~~~~~~~__~~~~~~~~~o~~b~~o~~~~~~~~~~~~~', //  6
    '~~~*~~o~~*~~~~~~~~~~o*~~___o~o~~~*~bbbbbbbbb~*~o~~~*~o~~', //  7
    'bbbbbbbbbbb~o~~*~~bbbbbbbbb_bbbbbbbbbbbbbbbbbbbbbbbbbbbb', //  8
    'bbbbbbbbbbbbbbbbbbbbbbbbbbb_bbbbbbbb~o~*~~obbbbbbbbbbbbb', //  9
    '~~~*~~o~~*bbbbbbbbb~o*~o~~~o~~o~~*~~~~~~~~~~~*~o~~~*~o~~', // 10
    '~~~~~~~~~~~~o~bb~o~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 11
    '~~~~~~~~~~~~~~bb~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 12
    '~~~~~"""~~_HHH____t_~~~~~~~~~~"""""~~~~~~~~~~~"""~~~~~~~', // 13
    '~~~~~"..."_#+#______~~~~~~~""".T.""~~~~~~~~"".T."~~~~""~', // 14
    '~~~~~~"""~__________~~~~~~~~~"""""~~~~~~~~~~"""""~~~~..~', // 15
    '~~~~~~~~~~t________t~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~""~', // 16
    '~~~~~~~~~~~~~o~~o~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 17
  ],
  entities: [
    { id: 'lb-shelter-chalk', kind: 'sign', at: [14, 13], look: 'plaque', text: 'Chalked on the shelter door: GONE TO BOGMIRE. DON\'T FOLLOW THE LIGHTS.' },
    { id: 'lb-lights', kind: 'encounter', enc: 'lb-lights', mode: 'pack', at: [16, 15], face: 'n' },
    // M4.5 road gate (spec A3, §2.2): the gap at the broken middle, the drowned on the pier beside it
    { id: 'lb-broken-middle', kind: 'gate', area: [27, 8, 27, 9], look: 'barge-planks', open: { beaten: 'lb-drowned' }, guard: 'lb-drowned', text: 'The boardwalk is broken: a length of planks has gone into the water. The drowned stand on the pier beside the gap, dripping, and do not seem to want you across.' },
    { id: 'lb-drowned', kind: 'encounter', enc: 'lb-drowned', mode: 'block', at: [26, 7], face: 's' },
    { id: 'lb-skiff-dock', kind: 'lock', lock: 'blackwater', at: [39, 3] },
    { id: 'lb-skiff', kind: 'chest', at: [39, 1], loot: { gold: 120, gems: { 'glass-pearl': 1 }, materials: { silver: 1 } } },
    lights('lb-lights-1', [50, 8]), lights('lb-lights-2', [52, 9]), lights('lb-lights-3', [54, 8]),
  ],
  exits: [
    { id: 'lb-w', area: [0, 8, 0, 9], to: 'bogmire', anchor: 'from-boardwalk' },
    { id: 'lb-e', area: [55, 8, 55, 9], to: 'misthollow', anchor: 'from-boardwalk', gate: { brand: 'brand-of-lanterns' }, sealed: { region: 'gloomfen', text: 'The lights on the boardwalk won\'t let anyone past.', hint: 'The lights will go out when the Lantern Mother rests.' } },
  ],
  anchors: { 'from-bogmire': [1, 8, 'e'], 'from-misthollow': [54, 9, 'w'] },
  roads: [{ from: 'from-bogmire', to: 'lb-e', gates: ['lb-broken-middle'] }],
  roam: { max: 3, rects: [[1, 8, 18, 10], [10, 13, 19, 16], [28, 7, 54, 9]] },
});
