// The Long Boardwalk (M6 spec §2.1, §2.3; painted from the player's three pictures art-in/batch-3/map-long-boardwalk-a.png,
// -b.png and -c.png, joined west to east). One long walkway of weathered planks on stilts runs east over open black
// water from Bogmire (W), rope rails along both sides and lamp-posts on the north rail; reed islets stand out in the
// water, some with a twisted tree. In the west third a side jetty runs south to the fishers' platform on stilts and
// their shelter, an open shed under a thatched roof with a boat moored beside it; the marsh-lights gather on the
// platform now the fishers have gone (17,13), and their chalked message is at the shelter's corner (23,14). Half-way,
// a short jetty runs north to a landing where a skiff is moored (its chest aboard, 40,3; the dock at its stern, 40,4,
// off the jetty's side). Where that jetty meets the boardwalk the planks are patched with mismatched barge-planks:
// that is the broken middle (39,7-8), and the drowned stand on the jetty's foot beside it (38,6). At the east end the
// boardwalk runs on into the mist toward the drowned city, and the lights hang over the planks and let no one by
// (`lb-e`, sealed until the Brand of Lanterns, spec A4).
// Layout notes: the broken middle is the only way east, so the drowned's gate holds the road; they stand on the
// jetty's foot, off the road, when a Brand re-arms them, and the jetty (with the skiff beyond its dock) is theirs
// until they are beaten. The boardwalk is two tiles wide all along (rows 6-7 in the west third, where the painting's
// planks run higher, 7-8 after it), so the patrols roam it; the side jetty is one plank-walk wide.
// Traced from the painting (one tile is 51.2 of its px; `overTiles: false`). Tiles (boardwalk): 'b' the
// boardwalk, '_' barge-planks (the patch, the side jetty and the fishers' platform, the north jetty and its landing,
// the skiff's deck), 'w' the dock's water, '~' open water and the reeds out in it, 'o' stilts, piles, the bollard the
// skiff is tied to, the islets' stones and mud and the moored boat, 'T' dead trees, '*' lamp-posts, 't' barrels and a
// crate, '#' the shelter's back wall hung with nets, 'H' its roof.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3 (traced from the painting).
import { deepFreeze } from '../../core/freeze.js';

// the lights at the east end, until the Lantern Mother rests
const lights = (id, at) => ({ id, kind: 'prop', prop: 'marsh-lights', at, if: { not: { brand: 'brand-of-lanterns' } } });

export default deepFreeze({
  id: 'long-boardwalk', name: 'The Long Boardwalk', region: 'gloomfen', biome: 'boardwalk', music: 'fen',
  backdrop: 'long-boardwalk', zone: 'boardwalk', level: 17, travel: true, dark: false, overTiles: false,
  lore: [[292, 540, 1, 9], [332, 668, 71, 9]],
  w: 74, h: 20,
  rows: [
    '~~~~~~~~~~~TTT~~~~~~~~~~~~~~~~~ooo~~~~~~~~~~~oTTTToo~~~~~~~~~~ooooooo~~~~~', //  0
    '~~~oo~~~~~oTTT~~~~~~~~~~~~~~~~~ooo~~~~~~~~~~~oTTTToo~~ooo~~~~~ooooooo~~~~~', //  1
    '~~~oo~~~~~oTTT~~~~~~~~~~~~~ooo~~~~~~~*__~~~~~oTTTToo~~ooo~~~~~ooooooo~~~~~', //  2
    '~~~~~~~~~~oTTT~~~~~~~~~~~~~ooo~~~~~~~t_o_~~~~ooooooo~~ooo~~~~~ooooooo~~~~~', //  3
    '~~~~~~~~~~oooo~~~~~~~~~~~~~ooo~~~~~~~o__w~~~~ooooooo~~~~~~~~~~~~~~~~~~~~~~', //  4
    '~*~~~~~~~*~~~~~*~~~~~*~~~*~~~~~~~~~~~~__~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  5
    'bbbbbbbbbbbbbbbbbbbbbbbbbbb~~~~~~~*~~~__~*~~~~~~~~~~~*~~~~~*~~~~~~*~~~~~*~', //  6
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb____bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', //  7
    'oo~oo~o~o~oo~o~~o~_o~o~oo~~bbbbbbbbbb____bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', //  8
    '~~~~~~~~~~~~~~~~~~_~~~~~~~o~o~o~o~o~o~o~o~o~o~o~oo~o~o~o~o~o~o~o~o~o~~o~o~', //  9
    '~~~~~~~~~~~~~~~~~~_~HHHHH~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~TTT~~~~', // 10
    '~~~~~~~~~~~~~~~~~~_~HHHHH~ooo~~TT~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~TTT~~~~', // 11
    '~~~~~~~~oo~~~~~~~~_~HHHHH~oooooTToo~~~~~~~~~~~~~~~~~~~~~~~~~~~oooooTTToo~~', // 12
    '~~TT~~~~oo~~~~~o____#####~oooooTToo~~~~~~~~ooooo~~~~~~oooo~~~~oooooTTToo~~', // 13
    '~oTToo~~~~~~~~~ot_______~~ooooooooo~~~~~~~~ooooo~~~~~~oooo~~~~oooooooooo~~', // 14
    '~ooooo~~~~~~~~~~~~~~~~~~~~ooooooooo~~~~~~~~ooooo~ooo~~oooo~~~~oooooooooo~~', // 15
    '~ooooo~~~~~~~~~~~~~~~~~~~~~~~oooooo~~~~~~~~ooooo~ooo~~~~~~~~~~oooooooooo~~', // 16
    '~ooooo~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ooo~~~~~~~~~~~~~~~~~~~~~~', // 17
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 18
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 19
  ],
  entities: [
    { id: 'lb-shelter-chalk', kind: 'sign', at: [23, 14], look: 'plaque', text: 'Chalked on the shelter door: GONE TO BOGMIRE. DON\'T FOLLOW THE LIGHTS.' },
    { id: 'lb-lights', kind: 'encounter', enc: 'lb-lights', mode: 'pack', at: [17, 13], face: 'n' },
    // M4.5 road gate (spec A3, §2.2): the broken middle, the drowned on the jetty's foot beside it
    { id: 'lb-broken-middle', kind: 'gate', area: [39, 7, 39, 8], look: 'barge-planks', open: { beaten: 'lb-drowned' }, guard: 'lb-drowned', text: 'The boardwalk is broken: a length of planks has gone into the water. The drowned stand on the pier beside the gap, dripping, and do not seem to want you across.' },
    { id: 'lb-drowned', kind: 'encounter', enc: 'lb-drowned', mode: 'block', at: [38, 6], face: 's' },
    { id: 'lb-skiff-dock', kind: 'lock', lock: 'blackwater', at: [40, 4] },
    { id: 'lb-skiff', kind: 'chest', at: [40, 3], loot: { gold: 120, gems: { 'glass-pearl': 1 }, materials: { silver: 1 } } },
    lights('lb-lights-1', [67, 7]), lights('lb-lights-2', [69, 8]), lights('lb-lights-3', [71, 7]),
  ],
  exits: [
    { id: 'lb-w', area: [0, 6, 0, 7], to: 'bogmire', anchor: 'from-boardwalk' },
    { id: 'lb-e', area: [73, 7, 73, 8], to: 'misthollow', anchor: 'from-boardwalk', gate: { brand: 'brand-of-lanterns' }, sealed: { region: 'gloomfen', text: 'The lights on the boardwalk won\'t let anyone past.', hint: 'The lights will go out when the Lantern Mother rests.' } },
  ],
  anchors: { 'from-bogmire': [1, 7, 'e'], 'from-misthollow': [72, 8, 'w'] },
  roads: [{ from: 'from-bogmire', to: 'lb-e', gates: ['lb-broken-middle'] }],
  roam: { max: 3, rects: [[2, 6, 25, 14], [27, 7, 38, 8], [40, 7, 72, 8]] },
});
