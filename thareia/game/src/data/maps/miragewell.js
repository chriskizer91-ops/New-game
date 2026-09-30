// Miragewell (M4 spec §2.1, §2.3), the palm oasis east of the Glass Flats. The track from the flats
// comes in at the west gate of the well-court, a paved courtyard in mud-brick walls with torches on its
// corners. The Well of Mirages stands in the middle (8-9,9-10); the Wisp-Queen hangs over its north rim
// (8-9,8) and drinks it dry each night. The Well Fire burns in the court's south half (10,12), Sabah the
// Well-Keeper keeps watch beside the well (6,11). Outside: flat-roofed houses, the oasis pool in the
// north-east with reeds and palms and a pilgrim on its shore, and in the south-east a grove whose palms
// ring a clearing: the only gap into it shimmers (17,17), and the grove's cache lies behind the mirage.
// Tiles (oasis): 'T' palms, '~' the pool and the well, '"' reeds, ':' the court's paving, '#' mud-brick,
// '*' torches, 'H' flat roofs, '+' a door (decoration), '=' the track, '^' dunes, '.' sand.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'miragewell', name: 'Miragewell', region: 'sunscorch', biome: 'oasis', music: 'town',
  backdrop: 'miragewell', zone: null, level: 12, travel: true, dark: false,
  lore: [[1010, 540, 10, 13]],
  w: 22, h: 20,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^T.....o..T.TTTTT^^^', //  1
    '^THH..,....T."~~~~~T^^', //  2
    '^T##.....,..""~~~~~~T^', //  3
    '^...........""~~~~~.T^', //  4
    '^...*###*###*.~~~~~".^', //  5
    '^...#:::::::#."~~~".T^', //  6
    '^..,#:t:::t:#T.....T.^', //  7
    '^...#:::::::#........^', //  8
    '====::::~~:::.HHH,..T^', //  9
    '====::::~~:::.#+#...T^', // 10
    '^...#:::::::#..,....T^', // 11
    '^.HH#:::::::#.TTTTTTT^', // 12
    '^.###:::::::#T.....TT^', // 13
    '^...*#######*T.,....T^', // 14
    '^T......,....T....,.T^', // 15
    '^T........,..T......T^', // 16
    '^^...,.o......TTT.TTT^', // 17
    '^^^T.......TT.......^^', // 18
    '^^^^^^^^^^^^^^^^^^^^^^', // 19
  ],
  entities: [
    { id: 'wisp-queen', kind: 'encounter', enc: 'wisp-queen', mode: 'lair', at: [9, 8], area: [8, 8, 9, 8], face: 's' },
    { id: 'well-fire', kind: 'hearthfire', at: [10, 12], stand: [10, 13, 'n'] },
    { id: 'sabah', kind: 'npc', npc: 'sabah', at: [6, 11], face: 'e' },
    { id: 'pilgrim-mw', kind: 'npc', npc: 'pilgrim-mw', at: [15, 7], face: 'n' },
    { id: 'mw-mirage', kind: 'lock', lock: 'mirage', at: [17, 17] },
    { id: 'mw-grove-cache', kind: 'chest', at: [17, 14], loot: { gems: { 'glass-pearl': 1 }, bag: { 'frost-draught': 2 }, materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'mw-w', area: [0, 9, 0, 10], to: 'glass-flats', anchor: 'from-miragewell' },
  ],
  anchors: { 'from-glass-flats': [1, 9, 'e'] },
  roam: null,
});
