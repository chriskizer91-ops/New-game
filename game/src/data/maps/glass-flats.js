// The Glass Flats (M4 spec §2.1, §2.3), the dune sea east of Sandspire. The caravan track runs in from
// Sandspire's east gate (W), past fused flats of glassed sand, to a junction (25,15): east it goes on to
// Miragewell, south it bends round the Glass Mesa, a ridge of fused dune, and comes back under it to the
// Scorchgate road. Straight through the mesa runs a mirage (25-26,17-24): the road bends away from it,
// but it is the short way south, and a cache waits in a niche off it (22,20). North of the track the
// Tallyman caravan has circled its wagons in a hollow (25,5), Zara's humming crate among them; Gnash the
// Raider-King holds court on a throne of glassed sand in a ring of crests to the north-east (42,4). Two
// hollows are sealed by dune-glass: one in the north-west (5,8), one by the Miragewell road (45,11).
// In the south-east the sand of a hollow breathes: quicksand (38-40,20-24) between the dunes and a cache.
// The raiders roam the dunes south-west of the junction, the wisps the flats north of the east road.
// No Hearthfire: the Spire Hearth and the Well Fire are either side.
// Tiles (dunes): '.' sand, 'm' dune ripples, '^' dune crests and fused ridges, '=' the caravan track,
// ':' glassed flats, 'o' rock, ',' pebbles, 'H' wagon canopies and tents.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'glass-flats', name: 'The Glass Flats', region: 'sunscorch', biome: 'dunes', music: 'desert',
  backdrop: 'glass-flats', zone: 'glass-flats', level: 11, travel: true, dark: false,
  lore: [[885, 478, 0, 14], [940, 505, 25, 15], [928, 640, 25, 29], [940, 505, 25, 15], [995, 535, 51, 14]],
  w: 52, h: 30,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^....^....^^........^....^^^^^^^^^^^^^^^^^^^', //  1
    '^^^^^^^^^...o.........................^^^^^^^^^^^^^^', //  2
    '^^^^...^^................HH..........^...::::...^^^^', //  3
    '^^.,.....^...mm......HH......HH......^...::::...^^^^', //  4
    '^^......,^.....mm......o....o.....o..^HH......HH^^^^', //  5
    '^^......o^.............mmmmmm...^^^..^HH......HH^^^^', //  6
    '^.^.....^..^^^......HH.mmmmmm.HHmmm^^^..........^^^^', //  7
    '^..^^.^^...mom^^^.......o..o..........^^^^....^^^^^^', //  8
    '^..................mm.........................^^^^^^', //  9
    '^....................mo......................^...^^^', // 10
    '^.....mm.........o.....::::..o...mm..............^^^', // 11
    '^...o...m..............:::::.......m....o....^^^^^^^', // 12
    '^.........============.............................^', // 13
    '================================...........=========', // 14
    '===========..........===============================', // 15
    '^................:::.....===================.......^', // 16
    '^..o...............^^^^^^..^^=====.............mm..^', // 17
    '^.........o....mm.^^^^^^^..^^^^^==::...............^', // 18
    '^..mm.......m....^^^^^^^^..^^^^^==.::.^^^^^^^......^', // 19
    '^..^^^^..........^^^^^.....^^^^^==.o.^.......^...o.^', // 20
    '^...mmm^^^....o..^^^^^.....^^^^^==...........^.....^', // 21
    '^.......mm^^......^^^^^^^..^^^^^==...........^.....^', // 22
    '^............m.....^^^^^^..^^^^.==...^.......^.....^', // 23
    '^....o..............^^^^^..^^^..==...^.......^.o...^', // 24
    '^........................=========....^.....^^^^^..^', // 25
    '^^........mm....o.o......=========.....^^^^^.^.mm.^^', // 26
    '^^..........m............==.^^...o..mm......mm....^^', // 27
    '^^...^^......^......^....==..^^.....^.....^^.....^^^', // 28
    '^^^^^^^^^^^^^^^^^^^^^^^^^==^^^^^^^^^^^^^^^^^^^^^^^^^', // 29
  ],
  entities: [
    { id: 'gf-glass-wall-nw', kind: 'lock', lock: 'dune-glass', at: [5, 8] },
    { id: 'gf-glass-cache-nw', kind: 'chest', at: [5, 4], loot: { items: [{ rarity: 'runed', slot: 'weapon' }], materials: { silver: 1 } } },
    { id: 'gf-caravan', kind: 'encounter', enc: 'gf-caravan', mode: 'block', at: [25, 5], face: 's' },
    { id: 'gnash-camp', kind: 'encounter', enc: 'gnash-camp', mode: 'lair', at: [42, 4], area: [42, 3, 43, 4], face: 's' },
    { id: 'gf-wisps', kind: 'encounter', enc: 'gf-wisps', mode: 'pack', at: [39, 11], face: 's' },
    { id: 'gf-glass-wall-e', kind: 'lock', lock: 'dune-glass', at: [45, 11] },
    { id: 'gf-glass-cache-e', kind: 'chest', at: [47, 10], loot: { gold: 90, bag: { 'hearth-tonic': 2 }, materials: { silver: 2 } } },
    { id: 'gf-raiders', kind: 'encounter', enc: 'gf-raiders', mode: 'pack', at: [14, 18], face: 'e' },
    { id: 'gf-mirage', kind: 'lock', lock: 'mirage', area: [25, 17, 26, 24] },
    { id: 'gf-mirage-cache', kind: 'chest', at: [22, 20], loot: { items: [{ rarity: 'runed', slot: 'amulet' }], materials: { silver: 1 } } },
    { id: 'gf-quicksand', kind: 'lock', lock: 'quicksand', area: [38, 20, 40, 24] },
    { id: 'gf-quicksand-cache', kind: 'chest', at: [43, 22], loot: { gold: 150, items: [{ rarity: 'tempered', slot: 'feet' }], materials: { silver: 2 } } },
  ],
  exits: [
    { id: 'gf-w', area: [0, 14, 0, 15], to: 'sandspire', anchor: 'from-glass-flats' },
    { id: 'gf-e', area: [51, 14, 51, 15], to: 'miragewell', anchor: 'from-glass-flats' },
    { id: 'gf-s', area: [25, 29, 26, 29], to: 'scorchgate', anchor: 'from-glass-flats' },
  ],
  anchors: { 'from-sandspire': [1, 14, 'e'], 'from-miragewell': [50, 14, 'w'], 'from-scorchgate': [25, 28, 'n'] },
  roam: { max: 4, rects: [[10, 3, 36, 12], [2, 16, 16, 27], [34, 9, 44, 18], [27, 25, 37, 28]] },
});
