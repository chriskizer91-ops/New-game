// The Dust Trail (M4 spec §2.1, §2.3). A red canyon from Sandspire's west gate (E) to Dusthaven (W).
// The mine-cart rails run beside the trail, winding down the middle through a rock cutting (x10-16),
// where the sand-skinks nest. Along the north wall runs Sandspire's aqueduct, a stone-lipped channel from the
// spring at the canyon head; at (29,4) a glass-scorpion nest has choked it with shed shells, and the
// channel runs dry from there to the city. The Dust Cairn stands on a paved rise north of the rails
// (22,8), the glass scorpions hunt mid-canyon, and south of the rails a ring of rock round a sinkhole
// of loose sand hides the Sand Wyrm (33,18): the only way in is across the quicksand at its mouth
// (32-33,13-14). In the south-west a boulder (5,16) closes the ramp up to a ledge with a cache.
// Tiles (canyon): '^' canyon walls, '.' canyon floor, ',' rippled sand and shell litter, 'r' the rails,
// '=' the trail, 'm' the dry, cracked aqueduct bed, '~' the aqueduct, '#' its stone lip, 'o' boulders,
// ':' paving.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'dust-trail', name: 'The Dust Trail', region: 'sunscorch', biome: 'canyon', music: 'desert',
  backdrop: 'dust-trail', zone: 'dust-trail', level: 10, travel: true, dark: false,
  lore: [[862, 482, 45, 11], [830, 520, 22, 9], [795, 552, 0, 11]],
  w: 46, h: 24,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  1
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  2
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  3
    '^^^~~~~~~~~~~~~~~~~~~~~~~~~~~,mmmmmmmmmmmmmm^^', //  4
    '^^.##########################...............^^', //  5
    '^^..o........,^^..............o......^^o...o^^', //  6
    '^^.......o.....^....o:::o..........,..^.....^^', //  7
    '^^o.............o..o.:::.o.......,,.......o.^^', //  8
    '^^.....,...,,........:::................,...^^', //  9
    '^.........................============.......^', // 10
    '===========o.o.o===========rrrrrrrrrr=========', // 11
    'rrrrrrrrrr=======rrrrrrrrrrr........rrrrrrrrrr', // 12
    '^........rrrrrrrrr............^^,,^^.........^', // 13
    '^..,......o.o...o...o........^^,,,,^^.......o^', // 14
    '^.......o......,,.........,..^,,,,,,^...o....^', // 15
    '^^^^^.^^.........,..........^^,,,,,,^^.......^', // 16
    '^.....^^............^.......^,,,,,,,,^.^.,,..^', // 17
    '^.....^...,........^^.o....,^^,,,,,,^^.^^...^^', // 18
    '^^^^^^^^.^^..o....o^^^..,,.^^^^^,,^^^^^o^^^^^^', // 19
    '^^^^^^^^^^^^...^^^^^^^^^..^^^^^^^^^^^^^^^^^^^^', // 20
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 21
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 22
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 23
  ],
  entities: [
    { id: 'dust-cairn', kind: 'hearthfire', at: [22, 8], stand: [22, 9, 'n'], cold: true },
    { id: 'dt-aqueduct', kind: 'encounter', enc: 'dt-aqueduct', mode: 'block', at: [29, 4], face: 's' },
    { id: 'dt-aqueduct-sign', kind: 'sign', at: [27, 6], look: 'plaque', text: 'SANDSPIRE AQUEDUCT. By order of the Cistern Lord: no bathing, no drinking, no camels.' },
    { id: 'dt-skinks', kind: 'encounter', enc: 'dt-skinks', mode: 'pack', at: [12, 16], face: 'n' },
    { id: 'dt-scorpions', kind: 'encounter', enc: 'dt-scorpions', mode: 'pack', at: [24, 16], face: 'n' },
    { id: 'dt-quicksand', kind: 'lock', lock: 'quicksand', area: [32, 13, 33, 14] },
    { id: 'wyrm-lair', kind: 'encounter', enc: 'wyrm-lair', mode: 'lair', at: [33, 18], area: [32, 17, 34, 18], face: 'n' },
    { id: 'dt-boulder', kind: 'lock', lock: 'boulder', at: [5, 16] },
    { id: 'dt-ledge-cache', kind: 'chest', at: [2, 18], loot: { items: [{ rarity: 'tempered', kind: 'bow' }], materials: { silver: 2 } } },
  ],
  exits: [
    { id: 'dt-e', area: [45, 11, 45, 12], to: 'sandspire', anchor: 'from-dust-trail' },
    { id: 'dt-w', area: [0, 11, 0, 12], to: 'dusthaven', anchor: 'from-dust-trail' },
  ],
  anchors: { 'from-sandspire': [44, 11, 'w'], 'from-dusthaven': [1, 11, 'e'] },
  roam: { max: 3, rects: [[6, 6, 27, 19], [28, 5, 37, 9], [38, 5, 44, 19]] },
});
