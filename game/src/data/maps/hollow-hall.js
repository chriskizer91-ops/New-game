// The Hollow Hall (M7 spec §2.1, §2.3), the Council's First-Age chamber beneath the Keep's vault, as batch 4 describes
// it (art-requests/batch-4/places.md). The stair from the vault comes down at the south-west (2-4,18-23): `hh-up` is
// the whole flight, and `from-vault` is its foot (3,17). From there the nave (rows 10-14, five wide) runs east the
// hall's whole length between two rows of pillars (rows 9 and 15). Behind the pillars four bays hold the great chairs
// on their daises, alternating sides and each carved with its region's mark: the tree (8,4, north), the sun (13,20,
// south), the anvil under a mountain (18,4, north) and the lantern among reeds (23,20, south). A bay opens onto the
// nave only through the gap between two pillars in front of its chair.
// The Hollow Council holds the nave back to back (spec A11): a line of soot crosses it before each chair (hh-gate-1 to
// hh-gate-4, look `hollow-gate`), and the chair's owner stands at the soot line's end on the chair's side, facing the
// stair: Miravel (8,10), Qasim (13,14), Brundar (18,10), Gretch (23,14). Each gate and its keeper close the nave
// together, and the one gap into each bay is the keeper's own tile, so the bays are no way round. The stair back up is
// shut from Miravel's fall until Gretch's (spec §2.2).
// At the east end the nave opens into a round apse (x 26-34, rows 7-17) and passes round the First-Age council table
// (28-30,11-13); beyond it, by the east wall, the stair goes down into a red glow (`hh-down`, 32-34,11-13), with
// `from-ash` at its head (31,12). The alms chest waits in a small alcove in the north wall past the fourth chair (28,5).
// Not painted yet: batch 4 will paint it, and the map is then traced from its painting (spec A10); the ids and roles stay.
// Tiles (council): ':' the nave's big old flagstones, ',' cold ash and dust on them, '_' the daises and the floor at the
// foot of the stair, 'k' the bays in the pillars' shadow, 'Y' the pillars, '#' the carved granite walls, '*' braziers
// burning low, 'R' the round council table, 's' the stairs.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

// a line of soot across the nave that the gift's light will not let you cross, held by the Council member beside it
const GATE = (id, area, guard, text) => ({ id, kind: 'gate', area, look: 'hollow-gate', open: { beaten: guard }, guard, text });
const KEEPER = (id, at) => ({ id, kind: 'encounter', enc: id, mode: 'block', at, face: 'w' });
// the chairs are signs with the look `throne` until batch 4's painting lands, and then `painted` (spec §2.3)
const CHAIR = (id, at, text) => ({ id, kind: 'sign', at, look: 'throne', text });

export default deepFreeze({
  // STUB (M7 P2): the biome is `dwarf-hall` (Ironhold's tiles: its pillars read as pillars) until art/tiles.js draws
  // `council` (P5);
  // test/world-art.test.mjs wants every map's biome drawn. The lead switches it when P5's tiles land.
  id: 'hollow-hall', name: 'The Hollow Hall', region: 'below', biome: 'dwarf-hall', music: 'dungeon',
  backdrop: 'hollow-hall', zone: null, level: 22, travel: false, dark: false,
  lore: [[540, 390, 18, 12]],
  w: 36, h: 24,
  rows: [
    '####################################', //  0
    '####################################', //  1
    '####################################', //  2
    '####################################', //  3
    '######k___k#####k___k###############', //  4
    '######k___k#####k___k#######k#######', //  5
    '#####*kkkkk*###*kkkkk*######k#*#####', //  6
    '######kkkkk#####kkkkk#######:::::###', //  7
    '######kkkkk#####kkkkk######:::::,:##', //  8
    '#####Y#YkY#Y*Y#Y#YkY#Y*Y#Y:::::,:::*', //  9
    '#:::::::::::::,:::::::::::::::::,::#', // 10
    '#:::::::::::::::::::::,:::::RRR:sss#', // 11
    '#::::::::::::::::::,::::::::RRR:sss#', // 12
    '#,::::::,:::::::,:::::,::,:,RRR:sss#', // 13
    '#::::::,:::::::::::::::::,:::::::::#', // 14
    '#____#Y*Y#Y#YkY#Y*Y#Y#YkY#:::::::,:*', // 15
    '#____######kkkkk#####kkkkk#:::::::##', // 16
    '#____######kkkkk#####kkkkk##:::::###', // 17
    '##sss#####*kkkkk*###*kkkkk*###*#####', // 18
    '##sss######k___k#####k___k##########', // 19
    '##sss######k___k#####k___k##########', // 20
    '##sss###############################', // 21
    '##sss###############################', // 22
    '##sss###############################', // 23
  ],
  entities: [
    // the Hollow Council, back to back: each soot line and its keeper hold the nave together (spec A3, A11, §2.3)
    GATE('hh-gate-1', [8, 11, 8, 14], 'hollow-miravel', 'A line of soot across the nave. Miravel stands at its end in the Hollow Wreath, and its light will not let you cross.'),
    KEEPER('hollow-miravel', [8, 10]),
    GATE('hh-gate-2', [13, 10, 13, 13], 'hollow-qasim', 'A line of soot across the nave. Cistern Lord Qasim stands at its end with the Hollow Chalice, and its light will not let you cross.'),
    KEEPER('hollow-qasim', [13, 14]),
    GATE('hh-gate-3', [18, 11, 18, 14], 'hollow-brundar', 'A line of soot across the nave. Thane Brundar stands at its end in the Hollow Gauntlet, and its light will not let you cross.'),
    KEEPER('hollow-brundar', [18, 10]),
    GATE('hh-gate-4', [23, 10, 23, 13], 'hollow-gretch', 'A line of soot across the nave. Mayor Gretch stands at its end in the Hollow Chain, and its light will not let you cross.'),
    KEEPER('hollow-gretch', [23, 14]),
    // the four great chairs, each carved with its region's mark
    CHAIR('hh-chair-verdant', [8, 4], 'A great stone chair on a low dais, carved with a tree. A faint violet-black light clings to the seat, as if someone rose from it a moment ago.'),
    CHAIR('hh-chair-sunscorch', [13, 20], 'A great stone chair on a low dais, carved with a sun. The stone is warm, and a violet-black light clings to the seat.'),
    CHAIR('hh-chair-ironspire', [18, 4], 'A great stone chair on a low dais, carved with an anvil under a mountain. The arms are worn smooth, and a violet-black light clings to the seat.'),
    CHAIR('hh-chair-gloomfen', [23, 20], 'A great stone chair on a low dais, carved with a lantern among reeds. The stone is damp, and a violet-black light clings to the seat.'),
    { id: 'hh-alms', kind: 'chest', at: [28, 5], loot: { gold: 200, items: [{ rarity: 'storied', slot: 'amulet' }], materials: { silver: 2 } } },
  ],
  exits: [
    // back up to the vault: shut once the first of the Council is beaten, until the fourth falls (spec A11, §2.2)
    { id: 'hh-up', area: [2, 18, 4, 23], to: 'keep-hall', anchor: 'from-below', gate: { any: [{ not: { beaten: 'hollow-miravel' } }, { beaten: 'hollow-gretch' }] },
      sealed: { region: 'below', text: 'The stair behind you has filled with ash.', hint: 'The Hollow Council sits until the last chair is empty.' } },
    { id: 'hh-down', area: [32, 11, 34, 13], to: 'ash-stair', anchor: 'from-hall' },
  ],
  anchors: { 'from-vault': [3, 17, 'n'], 'from-ash': [31, 12, 'w'] },
  roads: [{ from: 'from-vault', to: 'hh-down', gates: ['hh-gate-1', 'hh-gate-2', 'hh-gate-3', 'hh-gate-4'] }],
  roam: null,
});
