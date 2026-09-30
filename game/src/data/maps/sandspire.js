// Sandspire (M4 spec §2.1, §2.3), the trade city on its mesa. The Sunward Road climbs the north ramp to
// a torch-lit gate where the Spire Guard stands. Inside: Zara al-Khem's caravanserai (north-west), an
// arcaded courtyard with the empty crate cradle beside her; Cistern Lord Qasim at the door of his
// palace (north-east), and beside it the cistern itself, a barred gate (19,7) over dark water and the
// cache kept inside. The market square fills the middle: the Spire Hearth (15,12) where the three
// streets meet, the bounty board, two awning stalls, palms, and the fountain where the Water-Seller
// works. The west gate goes down to the Dust Trail, the east gate out to the Glass Flats (M4.5: barred
// until the Brand of Glass, so Kharzul comes before the Ashen Warden). South of the
// square: Idris the Gemwright under his awning (8,18), houses, the red rock of the Spire itself (the
// city grew round it) and the terrace on the mesa edge with the lookout (15,23).
// Tiles (desert-town): '^' mesa cliff, '#' sandstone walls, 'H' roofs and awnings, ':' paving, '='
// streets, '.' sand, '~' cistern and fountain water, '_' the cistern ledge, '*' gate torches, 'T' palms,
// 'o' crates, 't' jars, '+' the palace door (decoration: Qasim stands in it).
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'sandspire', name: 'Sandspire', region: 'sunscorch', biome: 'desert-town', music: 'town',
  backdrop: 'sandspire', zone: null, level: 10, travel: true, dark: false,
  lore: [[870, 470, 15, 12]],
  w: 30, h: 26,
  rows: [
    '^^^^^^^^^^^^^^==^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^^.==.^^^^^^^^^^^^^', //  1
    '^############*==*############^', //  2
    '^#HHHHHHHHHH#.==.####HHHHHHH#^', //  3
    '^#::::::::::#.==.#~~~HHHHHHH#^', //  4
    '^#::::::::::..==.#~__HHHHHHH#^', //  5
    '^#:o::::::o:..==.#~__###+####^', //  6
    '^#::::::::::#.==.##:#:::::::#^', //  7
    '^#####::#####.==...:.:::::::#^', //  8
    '^#HHHtT.HHH:::==:::HHH.T.HHH#^', //  9
    '^####HH::::::::::::::::HH####^', // 10
    '^*...::::::::::::::::::::...*^', // 11
    '=====::::::::::::::::::::=====', // 12
    '=====::::::::::::::::::::=====', // 13
    '^*...::::::::::::::::~~::...*^', // 14
    '^####HH::::::::::::::~~::####^', // 15
    '^#HHH.T:::::::==:::::::T.HHH#^', // 16
    '^####:::::::::==:::::::::####^', // 17
    '^#HHH.:::::.::==::..^^^^.HHH#^', // 18
    '^####.#HHH#.::==::.^^^^^.####^', // 19
    '^.....#####.::==::.^^^^^.....^', // 20
    '^.T........::::::::^^^^......^', // 21
    '^^.........::::::::^^^......^^', // 22
    '^^^^.......::::::::......^^^^^', // 23
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 24
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 25
  ],
  entities: [
    { id: 'spire-hearth', kind: 'hearthfire', at: [15, 12], stand: [15, 13, 'n'] },
    { id: 'spire-guard', kind: 'npc', npc: 'spire-guard', at: [13, 3], face: 's' },
    { id: 'zara', kind: 'npc', npc: 'zara', at: [6, 5], face: 's' },
    { id: 'crate-cradle', kind: 'sign', at: [9, 5], look: 'cradle', if: { not: { flag: 'crate-returned' } }, text: 'An empty cradle of rope and straw, the shape of a crate. The straw is scorched in rings, as if something in it hummed.' },
    { id: 'crate-cradle-full', kind: 'sign', at: [9, 5], look: 'cradle-full', if: { flag: 'crate-returned' }, text: 'The crate is back in its cradle, empty and quiet now. Zara has hung a water-skin over it, for luck.' },
    { id: 'qasim', kind: 'npc', npc: 'qasim', at: [24, 7], face: 's', if: { not: { flag: 'council-5-done' } } },
    // M7 (spec §3.1): Qasim goes down with the Hollow Council at the fifth council, and comes home freed, to stand
    // beside where he stood
    { id: 'qasim-freed', kind: 'npc', npc: 'qasim', at: [25, 7], face: 's', if: { beaten: 'hollow-qasim' } },
    { id: 'ss-cistern', kind: 'lock', lock: 'barred-gate', at: [19, 7] },
    { id: 'ss-cistern-cache', kind: 'chest', at: [20, 5], loot: { gold: 120, gems: { 'glass-pearl': 1 }, materials: { silver: 1 } } },
    { id: 'ss-board', kind: 'board', at: [12, 10], opens: 'bounties' },
    { id: 'water-seller', kind: 'npc', npc: 'water-seller', at: [20, 14], face: 's' },
    { id: 'idris', kind: 'npc', npc: 'idris', at: [8, 18], face: 'n' },
    { id: 'ss-spire', kind: 'sign', at: [18, 20], look: 'spire', text: 'The Spire: a finger of red rock the city grew round. Carved at its foot: THE SAND REMEMBERS.' },
    { id: 'ss-lookout', kind: 'lookout', at: [15, 23] },
  ],
  exits: [
    { id: 'ss-n', area: [14, 0, 15, 0], to: 'sun-road', anchor: 'from-sandspire' },
    { id: 'ss-w', area: [0, 12, 0, 13], to: 'dust-trail', anchor: 'from-sandspire' },
    // M4.5 (docs/M45-SPEC.md A3): the east gate opens with the Brand of Glass, so Kharzul comes before the Ashen Warden
    { id: 'ss-e', area: [29, 12, 29, 13], to: 'glass-flats', anchor: 'from-sandspire', gate: { brand: 'brand-of-glass' }, sealed: { region: 'sunscorch', text: 'The east gate is barred. Out on the Flats the dunes are still fusing into glass in the heat, and the Spire Guard lets nobody through.', hint: 'The gate opens once the Glass Heart under the Deep Shaft goes quiet.' } },
  ],
  anchors: { 'from-sun-road': [14, 1, 's'], 'from-dust-trail': [1, 12, 'e'], 'from-glass-flats': [28, 12, 'w'] },
  roam: null,
});
