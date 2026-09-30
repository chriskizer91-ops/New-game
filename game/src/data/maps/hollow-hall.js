// The Hollow Hall (M7 spec §2.1, §2.3): the Council's First-Age chamber beneath the vault. STUB from the M7 scaffold:
// laid out roughly as §2.3 says from existing tiles, with the spec's exits, anchors, gates and entity ids. P2 (maps)
// draws the `council` biome's tiles and lays it out (then traces it from its batch-4 painting); the biome and
// backdrop are stand-ins until P5 and P6 draw the Hall's own.
//   the way in: the stair up to the vault at the south edge's west end (hh-up; from-vault at its foot)
//   the nave: 5 tiles wide (rows 10-14), the hall's whole length, between two rows of pillars (rows 9 and 15)
//   the four chairs, in bays behind the pillars, alternating sides: the tree (north), the sun (south), the anvil
//   under a mountain (north), the lantern among reeds (south)
//   the gates: across the nave before each chair, each held by its Council member, who stands at the gate's end
//   facing the stair: Miravel, then Qasim, Brundar and Gretch (back to back, spec A11)
//   the far end: the round council table ('o'), the nave passing round it, and the stair down by the east wall
//   (hh-down; from-ash at its head); the alms chest in an alcove in the north wall past the fourth chair
// Tiles (stand-ins): '#' walls, '*' torches, '_' the nave, ':' the bays, 'o' the table, 's' the stairs.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

const GATE = (id, area, guard, text) => ({ id, kind: 'gate', area, look: 'hollow-gate', open: { beaten: guard }, guard, text });

export default deepFreeze({
  id: 'hollow-hall', name: 'The Hollow Hall', region: 'below', biome: 'vault', music: 'dungeon',
  backdrop: 'scorchgate-vaults', zone: null, level: 22, travel: false, dark: false,
  lore: [[540, 390, 18, 12]],
  w: 36, h: 24,
  rows: [
    '####################################', //  0
    '####################################', //  1
    '####################################', //  2
    '####################################', //  3
    '####################################', //  4
    '########::::##########::::##########', //  5
    '########::::##########::::##########', //  6
    '########::::##########::::#######:##', //  7
    '########::::##########::::#######:##', //  8
    '####*####::#*#####*####::#*######:##', //  9
    '#__________________________________#', // 10
    '#____________________________ooo___s', // 11
    '#____________________________ooo___s', // 12
    '#____________________________ooo___s', // 13
    '#__________________________________#', // 14
    '##__#*#######*##::#*#######*##::####', // 15
    '##__###########::::##########::::###', // 16
    '##__###########::::##########::::###', // 17
    '##__###########::::##########::::###', // 18
    '##__###########::::##########::::###', // 19
    '##__################################', // 20
    '##__################################', // 21
    '##__################################', // 22
    '##ss################################', // 23
  ],
  entities: [
    // the Hollow Council, back to back: each gate and its keeper hold the nave together (spec A3, §2.3)
    GATE('hh-gate-1', [6, 11, 6, 14], 'hollow-miravel', 'A line of soot across the nave. Elder Miravel stands at its end in the Hollow Wreath, and its light will not let you cross.'),
    { id: 'hollow-miravel', kind: 'encounter', enc: 'hollow-miravel', mode: 'block', at: [6, 10], face: 'w' },
    GATE('hh-gate-2', [13, 10, 13, 13], 'hollow-qasim', 'A line of soot across the nave. Cistern Lord Qasim stands at its end with the Hollow Chalice, and its light will not let you cross.'),
    { id: 'hollow-qasim', kind: 'encounter', enc: 'hollow-qasim', mode: 'block', at: [13, 14], face: 'w' },
    GATE('hh-gate-3', [20, 11, 20, 14], 'hollow-brundar', 'A line of soot across the nave. Thane Brundar stands at its end in the Hollow Gauntlet, and its light will not let you cross.'),
    { id: 'hollow-brundar', kind: 'encounter', enc: 'hollow-brundar', mode: 'block', at: [20, 10], face: 'w' },
    GATE('hh-gate-4', [27, 10, 27, 13], 'hollow-gretch', 'A line of soot across the nave. Mayor Gretch stands at its end in the Hollow Chain, and its light will not let you cross.'),
    { id: 'hollow-gretch', kind: 'encounter', enc: 'hollow-gretch', mode: 'block', at: [27, 14], face: 'w' },
    // the four great chairs, each carved with its region's mark (STUB from the M7 scaffold: the look `throne` stands in
    // until the painting's own, `painted`)
    { id: 'hh-chair-verdant', kind: 'sign', at: [9, 5], look: 'throne', text: 'A great stone chair on a dais, carved with a tree. Its roots go down into the floor.' },
    { id: 'hh-chair-sunscorch', kind: 'sign', at: [17, 19], look: 'throne', text: 'A great stone chair on a dais, carved with a sun. The stone is warm.' },
    { id: 'hh-chair-ironspire', kind: 'sign', at: [24, 5], look: 'throne', text: 'A great stone chair on a dais, carved with an anvil under a mountain.' },
    { id: 'hh-chair-gloomfen', kind: 'sign', at: [31, 19], look: 'throne', text: 'A great stone chair on a dais, carved with a lantern among reeds.' },
    { id: 'hh-alms', kind: 'chest', at: [33, 7], loot: { gold: 200, items: [{ rarity: 'storied', slot: 'amulet' }], materials: { silver: 2 } } },
  ],
  exits: [
    // back up to the vault: sealed once the first of the Council is beaten, until the fourth falls (spec A11, §2.2)
    { id: 'hh-up', area: [2, 23, 3, 23], to: 'keep-hall', anchor: 'from-below', gate: { any: [{ not: { beaten: 'hollow-miravel' } }, { beaten: 'hollow-gretch' }] },
      sealed: { region: 'below', text: 'The stair behind you has filled with ash.', hint: 'The Hollow Council sits until the last chair is empty.' } },
    { id: 'hh-down', area: [35, 11, 35, 13], to: 'ash-stair', anchor: 'from-hall' },
  ],
  anchors: { 'from-vault': [2, 22, 'n'], 'from-ash': [34, 12, 'w'] },
  roads: [{ from: 'from-vault', to: 'hh-down', gates: ['hh-gate-1', 'hh-gate-2', 'hh-gate-3', 'hh-gate-4'] }],
  roam: null,
});
