// Ironhold (M5 spec §2.1, §2.3), Thane Brundar's hall, carved out of the mountain. The dwarf road from
// the Iron Stair comes in through the great door (S) into the hall: two rows of carved columns, the
// Thane's runner up the middle to the dais, where the great hearth burns in the north wall (15,5) and
// the Thane's chair stands beside it (19,5), Brundar before it. In the north-west corner an arch opens
// on the Deeps stair: Tamsin has dropped its gate (8-10,4) and sits in the arch beside it (11,4); below
// the stair, the door the Thane sealed with dwarf runes (9-10,2), and the stair on down to the Deeps.
// Durra Ironhand keeps her armoury and forge in the west wing; the Ironhold board hangs by the great
// door; the east passage leads out to Stormwatch past the Hold Guard's alcove and the old guardroom,
// barred these many years.
// Layout notes: Tamsin's gate opens once her duel is won or yielded (A2); she carries no `if`, so she
// always stands beside it, and after a yield she stays there beside the open gate. The rune-seal is the
// only hard lock on IRON_PATH: the Thane's Rune-Key opens it (Brundar gives it at `rune-given`, once
// Tamsin's duel is done or yielded), as do the Runestaff and Knowledge 7.
// Tiles (dwarf-hall): 'R' the mountain's rock, '#' carved granite walls, ':' flagstones, '_' the Thane's
// runner, 'Y' carved columns, 'f' rune-stones glowing in the dais, '*' torches and braziers (the forge in
// the armoury), 's' the Deeps stair, 't' barrels, 'o' ore heaps, ',' grit.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'ironhold', name: 'Ironhold', region: 'ironspire', biome: 'dwarf-hall', music: 'town',
  backdrop: 'ironhold', zone: null, level: 14, travel: true, dark: false,
  lore: [[870, 160, 15, 5]],
  w: 32, h: 28,
  rows: [
    'RRRRRRRR#ss#RRRRRRRRRRRRRRRRRRRR', //  0
    'RRRRRRRR#ss#RRRRRRRRRRRRRRRRRRRR', //  1
    'RRRRRRRR#::#RRRRRRRRRRRRRRRRRRRR', //  2
    'RRRRRRR#ssss#RRRRRRRRRRRRRRRRRRR', //  3
    'RRRRRR##::::#*###*#*######RRRRRR', //  4
    'RRRRRR#::::::::::::::::::#RRRRRR', //  5
    'RRRRRR#::::::::::::::::::#RRRRRR', //  6
    'RRRRRR#::::::::::::::::::#RRRRRR', //  7
    'RRRRRR#:::Y:f:f__f:f:Y:::#RRRRRR', //  8
    'RRRRRR#::::::::__::::::::#RRRRRR', //  9
    'RRRRRR#::::::::__::::::::#RRRRRR', // 10
    'RRRRRR#:::Y::::__::::Y:::#######', // 11
    'R######::::::::__::::::::#:####R', // 12
    'R#*o.t#::::::::__:::::::::::::::', // 13
    'R#::::::::Y::::__::::Y::::::::::', // 14
    'R#t::::::::::::__::::::::###:###', // 15
    'R#:::::::::::::__::::::::#R#...#', // 16
    'R#::::#:::Y::::__::::Y:::#R#.,.#', // 17
    'R#t.ot#::::::::__::::::::#R#####', // 18
    'R######::::::::__::::::::#RRRRRR', // 19
    'RRRRRR#:::Y::::__::::Y:::#RRRRRR', // 20
    'RRRRRR#::::::::__::::::::#RRRRRR', // 21
    'RRRRRR#::::::::__::::::::#RRRRRR', // 22
    'RRRRRR#######*::::*#######RRRRRR', // 23
    'RRRRRRRRRRRRRR#::#RRRRRRRRRRRRRR', // 24
    'RRRRRRRRRRRRRR#::#RRRRRRRRRRRRRR', // 25
    'RRRRRRRRRRRRRRR::RRRRRRRRRRRRRRR', // 26
    'RRRRRRRRRRRRRRR::RRRRRRRRRRRRRRR', // 27
  ],
  entities: [
    { id: 'thanes-hearth', kind: 'hearthfire', at: [15, 5], stand: [15, 6, 'n'] },
    { id: 'ih-throne', kind: 'sign', at: [19, 5], look: 'throne', text: 'The Thane\'s chair: one block of black granite, worn smooth by nine Thanes. The cushion on it is new, and has not been sat on much.' },
    { id: 'brundar', kind: 'npc', npc: 'brundar', at: [19, 6], face: 's', if: { not: { flag: 'council-5-done' } } },
    // M7 (spec §3.1): Brundar goes down with the Hollow Council at the fifth council, and comes home freed, to stand
    // beside where he stood
    { id: 'brundar-freed', kind: 'npc', npc: 'brundar', at: [20, 6], face: 's', if: { beaten: 'hollow-brundar' } },
    { id: 'durra', kind: 'npc', npc: 'durra', at: [3, 15], face: 'e' },
    { id: 'ih-guard', kind: 'npc', npc: 'ih-guard', at: [26, 12], face: 's' },
    { id: 'ih-board', kind: 'board', at: [12, 22], opens: 'bounties' },
    { id: 'ih-deeps-plaque', kind: 'sign', at: [7, 5], look: 'plaque', text: 'Cut into the arch, fresh: THE DEEPS ARE SEALED. BY ORDER OF THANE BRUNDAR, WHO WILL HEAR NO MORE ABOUT IT.' },
    // M4.5 road gate (spec A3, §2.2): Tamsin has dropped the Deeps stair's gate and sits in the arch beside it;
    // a win or a yield opens it
    { id: 'ih-deeps-gate', kind: 'gate', area: [8, 4, 10, 4], look: 'gate', open: { any: [{ done: 'tamsin-ironhold' }, { flag: 'tamsin-yielded-3' }] }, guard: 'tamsin-ironhold', text: 'The gate of the Deeps stair is down. Tamsin is sitting in the arch beside it with her boots up on the winch, and she is not moving for you.' },
    { id: 'tamsin-ironhold', kind: 'encounter', enc: 'tamsin-ironhold', mode: 'block', at: [11, 4], face: 's', talk: 'tamsin-ironhold' },
    { id: 'ih-rune-door', kind: 'lock', lock: 'rune-seal', area: [9, 2, 10, 2] },
    { id: 'ih-guardroom-bar', kind: 'lock', lock: 'barred-gate', at: [28, 15] },
    { id: 'ih-guardroom-cache', kind: 'chest', at: [29, 17], loot: { gold: 100, gems: { 'glass-pearl': 1 }, materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'ih-s', area: [15, 27, 16, 27], to: 'iron-stair', anchor: 'from-hold' },
    { id: 'ih-deeps', area: [9, 0, 10, 0], to: 'ironhold-deeps', anchor: 'from-hold' },
    { id: 'ih-e', area: [31, 13, 31, 14], to: 'stormwatch', anchor: 'from-hold' },
  ],
  anchors: { 'from-stair': [15, 26, 'n'], 'from-deeps': [9, 1, 's'], 'from-stormwatch': [30, 13, 'w'] },
  roads: [{ from: 'from-stair', to: 'ih-deeps', gates: ['ih-deeps-gate'] }, { from: 'from-stair', to: 'ih-e', gates: [] }],
  roam: null,
});
