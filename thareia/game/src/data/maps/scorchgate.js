// Scorchgate Ruins (M4 spec §2.1, §2.3), the burned fortress city south of the Glass Flats. The road
// comes in through the broken north gate, its leaves lying flat in the ash (15-16,2). Inside the
// curtain, the lower town: roofless houses, charred trees and rubble along the old high street and the
// cross street, where the ash-wights still walk. Brother Cinder keeps the one roof that held, a shrine
// in the west (4,12); the burned armory in the east is choked with fallen masonry (22,12), its cache
// behind it. The last wall crosses the city with its gate fallen in the gap (14-17,15-16); the Last
// Watchfire stands cold against it (20,14). Beyond it lies the old parade ground, with the reviewing
// stand burned to its base, and at its south end the keep's base and its steps, above the Vault door:
// the ash-black seal (15-16,30) over the stair down to the Scorchgate Vaults.
// Layout notes: the Last Watchfire faces south to the wall, so its stand is north of it (20,13, 's').
// M4.5 (docs/M45-SPEC.md §4): the road holds. The Ash-Captain has hauled the last wall's gate back up
// across the gap (14-16,15) and stands in the gap beside it (17,15); once he falls, Tamsin waits at the
// keep's portcullis on the steps (13-17,28), beside it (18,28), and a win or a yield opens it. Both
// guards stand beside their gates, so the re-armed Captain never shuts the way up out of the Vaults.
// Tiles (ash): '.' ash, 'm' ash drifts, '#' burned stone, '^' rubble and the ground beyond the walls,
// '=' the old paving of the streets, ':' the parade ground and the keep's steps, 't' charred trees,
// 'o' rubble, 'b' fallen gate leaves, '*' braziers, 'H' the shrine's roof, '+' its door (decoration).
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'scorchgate', name: 'Scorchgate Ruins', region: 'sunscorch', biome: 'ash', music: 'wilds',
  backdrop: 'scorchgate', zone: 'scorchgate', level: 12, travel: true, dark: false,
  lore: [[928, 646, 15, 0], [930, 660, 20, 13], [934, 676, 15, 31]],
  w: 32, h: 32,
  rows: [
    '^^^^^^^^^^^^^^^..^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^^##..##^^^^^^^^^^^^^', //  1
    '^#######^^#####bb#######^######^', //  2
    '^#############*==*######......#^', //  3
    '^###o..##...o#.==..#m.o#.ot...#^', //  4
    '^###.m.##.m..#.==..#...#....t.#^', //  5
    '^#####.####.##.==..#.###m.....^^', //  6
    '^#..m..........==.........m...^^', //  7
    '^#.t....==================....#^', //  8
    '^^HHHHH.==================.t..#^', //  9
    '^^HHHHH.......m==o..t.o.......#^', // 10
    '^###+##..##.##.==..t..#########^', // 11
    '^#*...*.o#m..#.==.m.....o.m..##^', // 12
    '^#.m....t#..o#.==..:::#.....o##^', // 13
    '^#.......#####.==..:::#########^', // 14
    '^#####^######*bbbb*############^', // 15
    '^#############bbbb######^######^', // 16
    '^#...:::::::........:::::::...#^', // 17
    '^#.t.::mm::::::::::::::::::...#^', // 18
    '^#...**::::::::::::::o::m::...#^', // 19
    '^#...##::::::::::::::::::::.t.#^', // 20
    '^^...##:::::m::::::::::::::...#^', // 21
    '^#...##::::::::::::::::::::...#^', // 22
    '^#...##::::::::::::m:::::::...#^', // 23
    '^#..t:::::o::::::::::::::::...^^', // 24
    '^#...::::::::::::::::::m:::...#^', // 25
    '^#...:m::::::::::::::::::::t..#^', // 26
    '^#...::::::::::::::::::::::...#^', // 27
    '^###########*::::::*###########^', // 28
    '^############::::::############^', // 29
    '^##############::##############^', // 30
    '^^^^^^^^^^^^^^^ss^^^^^^^^^^^^^^^', // 31
  ],
  entities: [
    { id: 'sg-gate-plaque', kind: 'sign', at: [14, 4], look: 'plaque', text: 'Cut into the gate-tower, under three hundred years of soot: HERE THE DRAGON WILL BE TURNED.' },
    { id: 'sg-wights', kind: 'encounter', enc: 'sg-wights', mode: 'pack', at: [24, 9], face: 'w' },
    { id: 'cinder', kind: 'npc', npc: 'cinder', at: [4, 12], face: 's' },
    { id: 'sg-armory-rubble', kind: 'lock', lock: 'boulder', at: [22, 12] },
    { id: 'sg-armory-cache', kind: 'chest', at: [28, 12], loot: { items: [{ rarity: 'runed', slot: 'weapon' }], gems: { 'ash-garnet': 1 }, materials: { silver: 1 } } },
    { id: 'last-watchfire', kind: 'hearthfire', at: [20, 14], stand: [20, 13, 's'], cold: true },
    // M4.5 road gates (docs/M45-SPEC.md §4): the Ash-Captain holds the last wall's gate, raised again
    // across the gap, and stands in the gap beside it; once he falls, Tamsin waits at the keep's
    // portcullis on the steps above the Vault door (a lost duel is a yield and opens it too)
    { id: 'sg-wall-gate', kind: 'gate', area: [14, 15, 16, 15], look: 'gate', open: { beaten: 'sg-captain' }, guard: 'sg-captain', text: 'Scorchgate\'s last gate, hauled up out of the ash and wedged back across the gap. The Ash-Captain has not given up the wall.' },
    { id: 'sg-captain', kind: 'encounter', enc: 'sg-captain', mode: 'block', at: [17, 15], face: 'n' },
    { id: 'sg-keep-gate', kind: 'gate', area: [13, 28, 17, 28], look: 'gate', open: { any: [{ done: 'tamsin-scorchgate' }, { flag: 'tamsin-yielded-2' }] }, guard: 'tamsin-scorchgate', text: 'The keep\'s portcullis is down. Tamsin is leaning on the winch, and she is not letting you past without a fight.' },
    { id: 'tamsin-scorchgate', kind: 'encounter', enc: 'tamsin-scorchgate', mode: 'block', at: [18, 28], face: 'n', talk: 'tamsin-scorchgate' },
    { id: 'sg-vault-door', kind: 'lock', lock: 'vault-seal', area: [15, 30, 16, 30] },
  ],
  exits: [
    { id: 'sg-n', area: [15, 0, 16, 0], to: 'glass-flats', anchor: 'from-scorchgate' },
    { id: 'sg-vault', area: [15, 31, 16, 31], to: 'scorchgate-vaults', anchor: 'from-scorchgate' },
  ],
  anchors: { 'from-glass-flats': [15, 1, 's'], 'from-vaults': [16, 29, 'n'] },
  roads: [{ from: 'from-glass-flats', to: 'sg-vault', gates: ['sg-wall-gate', 'sg-keep-gate'] }],
  roam: { max: 3, rects: [[2, 3, 21, 14], [22, 3, 29, 10], [3, 17, 28, 27]] },
});
