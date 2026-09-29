// Drystone Lea (M5, the East Road; painted from the player's picture art-in/extra/path-meadow.png). The
// second of the East Road's six painted maps: open meadow, bright with wildflowers, where the road winds
// north between old drystone walls to a gap in the pines. West of the road an old oak stands over its own
// ring of stones, reached by a worn side path from the fork (22, 17); east of it a drystone wall with a
// carved gatepost shuts off a field no one tends now. Rime wolves down from the snows too early lie up in
// the brambles choking the gap (23-26, 2) and watch the road; the gap is the only way north.
// Traced from the painting (one tile is 32 of its px; `overTiles: false`). Tiles: '=' the road and the oak's
// path, '.' the meadow, 'T' the oak, the pines and the flowering shrubs, 'o' boulders, '#' the drystone wall
// and the gatepost.
// Format: src/data/maps/index.js. Owner: the lead (M5 P8, the East Road).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'drystone-lea', name: 'Drystone Lea', region: 'ironspire', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: null, level: 12, travel: true, dark: false, overTiles: false,
  lore: [[566, 372, 23, 30], [574, 366, 25, 0]],
  w: 48, h: 32,
  rows: [
    'TTTT....o.o.TTTTTTTTTTTT==.TTTTTTTTTTTTTTTTTTTTT', //  0
    'TTTTTTT......TooTTTTTTTT==.TTTTTTTTTTooTTTTTTTTT', //  1
    'TTTTTTTT...o....oTTTTTT.===TTTTTTT..TooTTTTTTTTT', //  2
    'TTTTTTTT..........ooTT..===TTTTTT.....oTTTTTTTTT', //  3
    'ToooTTTTTT..............===..T##..........TToTTT', //  4
    'TTTTTTTTTT.TTTTT........===....###........ooooT.', //  5
    'TooooooT...TTTTTTT......===.....####.TTT........', //  6
    'Toooooo...TTTTTTTTT.....===...o...####TTTTTT....', //  7
    'Tooooo...TTTTTTTTTT.....===.......#...##########', //  8
    '.........TTTTTTTTTT.....====......#.....########', //  9
    '.......TTTTTTTTTTTT..=======.....o#.............', // 10
    '.......TTTTTTTTTTTT.....=====................o..', // 11
    '.TTT...TT.TTTTTTTTT.TT...=====..................', // 12
    '.TTT........TTTTTT=.TT....====..................', // 13
    '....TT......TTTTTT==......====............TTT...', // 14
    '....TTT...o....TTT.=......====...........TTTTTTT', // 15
    'TTT.TTT....o.==.TT==.....=====......T....TTTTTTT', // 16
    'TTTooo......==========..=====............TTTTTTT', // 17
    'TTToooo..............=======.............TTTTTTT', // 18
    'TTooooooTTTT..........=====...............TTTTTT', // 19
    '..ooooooooo...........====...................TTT', // 20
    'T..TTT................====.....TTT...TTT....ooTT', // 21
    'TTTTTTT...............===.....TTToo.TTTT........', // 22
    'TTTTTTT...............===.....TTTooo............', // 23
    'TTTTTTT...............===.....oooooooo........TT', // 24
    'TTTTTTTo..............===......ooooo.......TTTTT', // 25
    'TTTTTTTo.....TTT......===..................TTTTT', // 26
    'TTTToooo.....TTT......===.........o..........TTT', // 27
    'TTTToooo....TTTTTT....====.o...........oTTT.TTTT', // 28
    'TTTTT.......ooooTT....====..............TTTTTTTT', // 29
    'TTTT........ooooTooo..====................TTTTTT', // 30
    '............oTTTTo....====............oo..TTTTTT', // 31
  ],
  entities: [
    { id: 'dl-sign', kind: 'sign', at: [22, 17], look: 'post', text: 'DRYSTONE LEA. The west path goes to the old oak, which was here before the walls and will be here after.' },
    { id: 'dl-oak-cache', kind: 'chest', at: [9, 12], loot: { gold: 70, bag: { 'hearth-tonic': 1 }, materials: { scrap: 1 } } },
    // the road gate (road-first, spec A3): brambles choke the gap in the pines, the wolves lie up beside them
    { id: 'dl-brambles', kind: 'gate', area: [23, 2, 26, 2], look: 'bramble', open: { beaten: 'er-wolves' }, guard: 'er-wolves', text: 'Brambles choke the gap in the pines. Something grey and patient lies up in them, watching the road.' },
    { id: 'er-wolves', kind: 'encounter', enc: 'er-wolves', mode: 'block', at: [22, 3], face: 'e' },
  ],
  exits: [
    { id: 'dl-bridge', area: [22, 31, 25, 31], to: 'old-bridge', anchor: 'from-lea' },
    { id: 'dl-ford', area: [24, 0, 26, 0], to: 'plankford', anchor: 'from-lea' },
  ],
  anchors: { 'from-bridge': [23, 30, 'n'], 'from-ford': [25, 1, 's'] },
  roads: [{ from: 'from-bridge', to: 'dl-ford', gates: ['dl-brambles'] }],
});
