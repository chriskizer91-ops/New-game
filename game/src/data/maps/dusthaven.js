// Dusthaven (M4 spec §2.1, §2.3), the mining camp at the head of the Dust Trail's canyon. Tents and
// timber crowd a bowl of red rock. The shaft head is in the north-west cliff: a timber frame over the
// stair down to the Deep Shaft (5-6,2), with the rails running out of it, down the camp's west side and
// east along the main street to the trail. The Pithead Fire burns in its paved yard beside the shaft
// (9,5). Luma's assay shed stands under the north-east cliff with Luma at its door (16,6); Old Ode keeps
// the Pithead store in the south-west (4,15); miners loaf by the fire and the tents.
// Tiles (mine-camp): '^' canyon walls, '.' packed earth, 'r' the rails, '=' the camp's road, '|' timber
// (the headframe and fences), 's' the shaft stair, 'H' tents and roofs, '#' timber walls, '+' doors
// (decoration: the NPCs stand in them), ':' the fire yard, 'o' ore piles and crates, ',' spoil, '~' a
// water trough.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'dusthaven', name: 'Dusthaven', region: 'sunscorch', biome: 'mine-camp', music: 'town',
  backdrop: 'dust-trail', zone: null, level: 11, travel: true, dark: false,
  lore: [[780, 560, 9, 6]],
  w: 24, h: 22,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^^^^^^^^^^^^^', //  1
    '^^^^|ss|^^^^^^^^^^^^^^^^', //  2
    '^^^.|r=|o.^^..HHHHHH.^^^', //  3
    '^^.o.r=.:::,..HHHHHH..^^', //  4
    '^^.o.r=.:::.,.##+###..^^', //  5
    '^^...r=.:::..........|^^', //  6
    '^^...r=.....HH....o..|^^', //  7
    '^^|..r=.....HH.,.....|^^', //  8
    '^^|..r=.......o....,..^^', //  9
    '^^...r==================', // 10
    '^^...rrrrrrrrrrrrrrrrrrr', // 11
    '^^....................^^', // 12
    '^^HHHHH...~......,.HH.^^', // 13
    '^^##+##.....HH.....HH.^^', // 14
    '^^.......o..HH........^^', // 15
    '^^.....,........HH....^^', // 16
    '^^^.o.,.........HH...^^^', // 17
    '^^^^.....^^...o.....^^^^', // 18
    '^^^^^^^^^^^^^^^^^^^^^^^^', // 19
    '^^^^^^^^^^^^^^^^^^^^^^^^', // 20
    '^^^^^^^^^^^^^^^^^^^^^^^^', // 21
  ],
  entities: [
    { id: 'pithead', kind: 'hearthfire', at: [9, 5], stand: [9, 6, 'n'] },
    { id: 'dh-shaft-sign', kind: 'sign', at: [3, 3], text: 'THE DEEP SHAFT. Lamps lit below the first landing. (Someone has added: THEY ARE NOT.)' },
    { id: 'luma', kind: 'npc', npc: 'luma', at: [16, 6], face: 's' },
    { id: 'ode', kind: 'npc', npc: 'ode', at: [4, 15], face: 's' },
    { id: 'miner-1', kind: 'npc', npc: 'miner', at: [11, 6], face: 'w' },
    { id: 'miner-2', kind: 'npc', npc: 'miner', at: [15, 12], face: 's' },
  ],
  exits: [
    { id: 'dh-e', area: [23, 10, 23, 11], to: 'dust-trail', anchor: 'from-dusthaven' },
    { id: 'dh-shaft', area: [5, 2, 6, 2], to: 'deep-shaft-1', anchor: 'from-dusthaven' },
  ],
  anchors: { 'from-dust-trail': [22, 10, 'w'], 'from-deep-shaft': [5, 4, 's'] },
  roam: null,
});
