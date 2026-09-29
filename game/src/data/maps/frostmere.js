// Frostmere (M5 spec §2.1, §2.3), the frozen lake. The road from the tundra comes down the west shore's
// snowy pines onto the ice: snow over the ice, with broad patches the wind has scoured to clear black ice,
// cracked by open leads and heaved into pressure ridges. Two trodden paths lead out over it: north to the
// Tallymen's hole, and south-east along the monks' prayer-flags to the drowned shrine. North, the Tallymen have cut their hole in the ice (16-20,4-6) and walled it round
// with the blocks they cut, steps going down into the dark beside it (17-18,7); the one gap in the wall
// (17-19,10) is strung with a chain of prayer-bells, and the drowned stand at it (19,10), waiting to go
// back down. South-east, the drowned shrine stands on its island in a ring of open water: the only way
// over is a causeway of broken floes (23-25,22), and the Drowned Abbess waits before the shrine (29,23).
// Layout notes: the wraiths stand in the gap beside their chain, so a Brand's re-armed Echo stands beside
// an open way up out of Beneath Frostmere. The floes are a chasm lock, the only way to the island.
// Tiles (frozen-lake): '.' snow on the ice and the shore, ':' clear black ice, ',' cracks, '=' the trodden paths,
// '~' open water (the hole, the leads, the ring round the island), 'o' heaved ice and the cut blocks,
// 'w' broken floes, '^' the rocky shore and the island's rocks, 'T' snowy pines,
// 's' the steps cut down into the hole, 't' the Tallymen's sledges, 'H' the shrine's roof, '#' its walls.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'frostmere', name: 'Frostmere', region: 'ironspire', biome: 'frozen-lake', music: 'peaks',
  backdrop: 'frostmere', zone: 'frostmere', level: 16, travel: true, dark: false,
  lore: [[980, 120, 17, 14]],
  w: 36, h: 30,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^......^^^.^^T^^^^^^TT^^^^^T^^T^T^^^', //  1
    'T..T........,ooooooooooo...:::::..^^', //  2
    'T............ot::::::::o..:::::::..^', //  3
    '^..T...:::::.o::~~~~~,:o...:::::..^^', //  4
    '^.....:::::::o::~~~~~::o.~~........^', //  5
    '^...,..:::::.o::~~~~~::o..~~......^^', //  6
    '^.T..........o:::ss::::o...~~.,....^', //  7
    'TTT........,.o:.::::::to..,.~~.,,.^^', //  8
    '^.T..:::.....o:::::::::o,.:::~~...^^', //  9
    '^...,::::....oooo:::oooo:::::::...^^', // 10
    'T..,.:::....=======....:::::::::...^', // 11
    '^T...,.,=====.......,...:::::::...^^', // 12
    '^.......=..........:::::..:::..,..^^', // 13
    '=========.,........:::::...,.......^', // 14
    '========..........oo::::...........^', // 15
    '^......=....:::.....oo...,.........^', // 16
    'T..T...======:::.......~~~~~~~~~~~~^', // 17
    '^.T.,.......=::,.......~~~^^^^^^^^~^', // 18
    'T......oo...======.....~~~^THHH.T^~^', // 19
    '^TT~~..::oo:::,..=.....~~~^.HHH..^~^', // 20
    'TT..~~.::::oo:...=====.~~~^.#+#..^~^', // 21
    '^TT..~~::::::oo......==www.......^~^', // 22
    '^T........:....o..,....~~~^......^~^', // 23
    '^...............,.....,~~~^^.....^~^', // 24
    'T..T,::.......:::::...,~~~^.....^^~^', // 25
    '^T..::::..,..:::::::..,~~~^^^^^^^^~^', // 26
    'TTT..::....,..:::::....~~~~~~~~~~~~^', // 27
    'TT..,^^^T^.^T^^^^^.^..T^^^T^^^T^^^^^', // 28
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 29
  ],
  entities: [
    { id: 'fm-flags-1', kind: 'prop', prop: 'prayer-flags', at: [6, 16] },
    { id: 'fm-flags-2', kind: 'prop', prop: 'prayer-flags', at: [10, 18] },
    { id: 'fm-flags-3', kind: 'prop', prop: 'prayer-flags', at: [14, 20] },
    { id: 'fm-flags-4', kind: 'prop', prop: 'prayer-flags', at: [19, 22] },
    { id: 'fm-flags-5', kind: 'prop', prop: 'prayer-flags', at: [13, 12] },
    // M4.5 road gate (spec A3, §2.2): the prayer-chain across the gap in the Tallymen's wall, the drowned beside it
    { id: 'fm-prayer-chain', kind: 'gate', area: [17, 10, 18, 10], look: 'chain', open: { beaten: 'fm-wraiths' }, guard: 'fm-wraiths', text: 'A chain of prayer-bells strung across the gap in the Tallymen\'s wall of cut ice, as if someone meant to keep something in. The drowned stand beside it, dripping, and the bells do not ring.' },
    { id: 'fm-wraiths', kind: 'encounter', enc: 'fm-wraiths', mode: 'block', at: [19, 10], face: 's' },
    { id: 'fm-tally-chalk', kind: 'sign', at: [21, 7], look: 'plaque', text: 'Tally-chalk on a block of cut ice: FORTY MORE. HE WANTS THEM FROM DEEPER. HE SAYS WE ARE CLOSE.' },
    { id: 'fm-tally-sledge', kind: 'chest', at: [15, 8], loot: { gold: 90, gems: { 'frost-opal': 1 }, materials: { scrap: 1 } } },
    { id: 'fm-floes', kind: 'lock', lock: 'chasm', area: [23, 22, 25, 22], look: 'floes' },
    { id: 'fm-shrine', kind: 'encounter', enc: 'fm-shrine', mode: 'lair', at: [29, 23], area: [29, 23, 30, 23], face: 'w' },
    { id: 'fm-shrine-offerings', kind: 'chest', at: [32, 23], loot: { items: [{ rarity: 'storied', slot: 'amulet' }], gems: { 'frost-opal': 1 }, materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'fm-w', area: [0, 14, 0, 15], to: 'frost-road', anchor: 'from-frostmere' },
    { id: 'fm-hole', area: [17, 7, 18, 7], to: 'frostmere-below', anchor: 'from-frostmere' },
  ],
  anchors: { 'from-frost-road': [1, 14, 'e'], 'from-below': [17, 8, 's'] },
  roads: [{ from: 'from-frost-road', to: 'fm-hole', gates: ['fm-prayer-chain'] }],
  roam: { max: 3, rects: [[5, 11, 21, 27], [24, 2, 33, 15], [2, 2, 11, 9]] },
});
