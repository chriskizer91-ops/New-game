// Stormwatch (M5 spec §2.1, §2.3), the army post on its ridge above the ice. A timber stockade rings
// the yard, with stone towers at its two gates: the west gate, where the road comes in from Ironhold,
// and the north gate onto the Frost Road, which Captain Ysolde keeps shut (it opens with the Brand of
// Iron). In the north-west stands the stone watch tower, in the north-east the long barracks; the
// quartermaster's store is on the east side, Quartermaster Quill beside its door among his crates. The
// roads meet at the Watch Fire (13,13) on its ring of flagstones, with the Stormwatch board beside it.
// South-west is the drill ground, with its practice posts; south-east, the stockade's one cell, where
// Rook, once a Tallyman, talks through the bars of its door (19,17).
// Tiles (outpost): '|' the timber stockade (and the cell's bars), '#' the stone towers, 'H' plank and
// slate roofs, '+' doors (decoration), '=' the road, ':' the fire's flagstones, '.' trodden snow,
// ',' gravel, 'o' practice posts and rocks, 't' crates, barrels and the cell's cot, '*' gate torches,
// '^' the ridge.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'stormwatch', name: 'Stormwatch', region: 'ironspire', biome: 'outpost', music: 'town',
  backdrop: 'stormwatch', zone: null, level: 15, travel: true, dark: false,
  lore: [[1020, 240, 13, 13]],
  w: 26, h: 24,
  rows: [
    '^^^^^^^^^^^.==.^^^^^^^^^^^', //  0
    '^^^^^^^^^^o.==.o^^^^^^^^^^', //  1
    '^|||||||||#*==*#|||||||||^', //  2
    '^|tHHHH.....==.HHHHHHHHH|^', //  3
    '^|.HHHH.....==.HHHHHHHHH|^', //  4
    '^|.HHHH,....==.#+##+##+#|^', //  5
    '^|.HHHH.....==..........|^', //  6
    '^|.#+##.....==......,...|^', //  7
    '^|......,...==...HHHHHHH|^', //  8
    '^|..........==...HHHHHHH|^', //  9
    '^#..........==...##+####|^', // 10
    '==============....t..t..|^', // 11
    '===========:==::........|^', // 12
    '^#.........:::::......tt|^', // 13
    '^|.........:::::.......t|^', // 14
    '^|.,,,,,,..:::::........|^', // 15
    '^|.,o,,o,.......,.......|^', // 16
    '^|.,,,,,,.........|.|...|^', // 17
    '^|.,o,,o,.........|t|...|^', // 18
    '^|.,,,,,,tt.o.....|||to.|^', // 19
    '^|......................|^', // 20
    '^||||||||||||||||||||||||^', // 21
    '^^^^^^^^^^^^^^^^^^^^^^^^^^', // 22
    '^^^^^^^^^^^^^^^^^^^^^^^^^^', // 23
  ],
  entities: [
    { id: 'stormwatch-fire', kind: 'hearthfire', at: [13, 13], stand: [13, 14, 'n'] },
    { id: 'ysolde', kind: 'npc', npc: 'ysolde', at: [14, 4], face: 'w' },
    { id: 'quill', kind: 'npc', npc: 'quill', at: [20, 11], face: 's' },
    { id: 'rook', kind: 'npc', npc: 'rook', at: [19, 17], face: 'n' },
    { id: 'sw-board', kind: 'board', at: [10, 13], opens: 'bounties' },
    { id: 'sw-orders', kind: 'sign', at: [11, 3], look: 'plaque', text: 'STORMWATCH. THIRD COMPANY. THE NORTH ROAD IS CLOSED UNTIL FURTHER ORDERS. Someone has added, in pencil: WHICH ORDERS.' },
  ],
  exits: [
    { id: 'sw-w', area: [0, 11, 0, 12], to: 'ironhold', anchor: 'from-stormwatch' },
    // M5 (spec §2.2, A4): the north gate onto the Frost Road opens with the Brand of Iron
    { id: 'sw-n', area: [12, 0, 13, 0], to: 'frost-road', anchor: 'from-stormwatch', gate: { brand: 'brand-of-iron' }, sealed: { region: 'ironspire', text: 'Captain Ysolde\'s orders: the north gate stays shut while the Tallymen hold the ice road, and nobody on this wall knows what is under Ironhold.', hint: 'The gate opens once the Brand of Iron is yours.' } },
  ],
  anchors: { 'from-hold': [1, 11, 'e'], 'from-frost-road': [12, 1, 's'] },
  roads: [{ from: 'from-hold', to: 'sw-n', gates: [] }],
  roam: null,
});
