// The Worldforge (M7 spec §2.1, §2.3): Harrow's forge at the bottom of the world, the Unsmith, and the ending at the
// forge's heart. STUB from the M7 scaffold: laid out roughly as §2.3 says from existing tiles, with the spec's exits,
// anchor, gate, lair and entity ids. P2 (maps) draws the `forge` biome's tiles and lays it out (then traces it from its
// batch-4 painting); the backdrop is a stand-in until P6 paints the Worldforge's own, and P5 draws the furnace.
//   the way in: the iron door in the middle of the west edge (wf-out; from-deep inside it)
//   the moat: a molten channel ('~'), 3 tiles wide, north edge to south edge a third of the way in
//   the bridge ('b') across it in line with the way in, 3 tiles wide: the bridge gate at its near end, held by the
//   forge-warden
//   the forge floor beyond: the great anvil ('o'), and the Worldforge in the east wall ('#'), a heart-shaped furnace
//   with molten channels running from it
//   the Unsmith's lair (3 by 2) on the open space before the furnace, and behind him the heart: the step before the
//   furnace's mouth (its talk opens the endings once he is beaten, spec §4.7: P1's)
// Tiles (stand-ins): '#' walls and the furnace, ':' the near floor, 'k' the forge floor, '~' the molten channels, 'b'
// the bridge, 'o' the anvil, '+' the iron door.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'worldforge', name: 'The Worldforge', region: 'below', biome: 'forge', music: 'boss',
  backdrop: 'harrows-forge', zone: null, level: 22, travel: false, dark: false,
  lore: [[540, 390, 18, 12]],
  w: 36, h: 24,
  rows: [
    '###########~~~######################', //  0
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', //  1
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', //  2
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', //  3
    '#::::::::::~~~kkkkkkkk~~~~~~~~~kkkk#', //  4
    '#::::::::::~~~kkkkkoookkkkkkkkkkkkk#', //  5
    '#::::::::::~~~kkkkkoookkkkkkkkk#####', //  6
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', //  7
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', //  8
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', //  9
    '#::::::::::bbbkkkkkkkkkkkkkkkkk#####', // 10
    '+::::::::::bbbkkkkkkkkkkkkkkkkkk####', // 11
    '+::::::::::bbbkkkkkkkkkkkkkkkkkk####', // 12
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', // 13
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', // 14
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', // 15
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', // 16
    '#::::::::::~~~kkkkkkkkkkkkkkkkk#####', // 17
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', // 18
    '#::::::::::~~~kkkkkkkk~~~~~~~~~kkkk#', // 19
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', // 20
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', // 21
    '#::::::::::~~~kkkkkkkkkkkkkkkkkkkkk#', // 22
    '###########~~~######################', // 23
  ],
  entities: [
    { id: 'wf-bridge-gate', kind: 'gate', area: [11, 10, 11, 12], open: { beaten: 'wf-warden' }, guard: 'wf-warden',
      text: 'An iron grate across the near end of the bridge, and the forge-warden before it, its bellows breathing.' },
    { id: 'wf-warden', kind: 'encounter', enc: 'wf-warden', mode: 'block', at: [10, 11], face: 'w' },
    // the finale (spec A3): his lair before the furnace, his sprite's foot inside it
    { id: 'unsmith', kind: 'encounter', enc: 'unsmith', mode: 'lair', at: [27, 12], area: [26, 11, 28, 12], face: 'w' },
    // STUB from the M7 scaffold: the heart speaks only its words until P1 wires its talk (the-heart) and P5/P2 its look
    { id: 'wf-heart', kind: 'sign', at: [30, 11], talk: 'the-heart', text: 'The step before the furnace\'s mouth. The heat comes out of it like breath.' },
  ],
  exits: [
    { id: 'wf-out', area: [0, 11, 0, 12], to: 'chained-deep', anchor: 'from-forge' },
  ],
  anchors: { 'from-deep': [1, 11, 'e'] },
  roads: [{ from: 'from-deep', to: 'unsmith', gates: ['wf-bridge-gate'] }],
  roam: null,
});
