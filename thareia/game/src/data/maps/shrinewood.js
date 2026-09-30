// Shrinewood (M5, the East Road; painted from the player's picture art-in/extra/path-forest-ruin.png). The
// fourth of the East Road's six painted maps: old forest of oak and pine, where the road runs north over
// stretches of worn flagstones. West of it, in a clearing, stand the ruins of a wayside shrine: a broken
// arch (its doorway at (13, 10)) and a standing stone carved with a tree (16, 14). No one is sure whose shrine
// it was. The road is open here; this is where travellers stop.
// Traced from the painting (one tile is 32 of its px; `overTiles: false`). Tiles: '=' the road, ':' its
// flagstones and the shrine's floor, '.' the clearing, '#' the ruin's walls, the arch and the carved stone,
// 'T' the forest, 'o' boulders and fallen blocks.
// Format: src/data/maps/index.js. Owner: the lead (M5 P8, the East Road).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'shrinewood', name: 'Shrinewood', region: 'ironspire', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: null, level: 12, travel: true, dark: false, overTiles: false,
  lore: [[590, 356, 23, 30], [598, 350, 22, 0]],
  w: 48, h: 32,
  rows: [
    'TTTTTTTTTTTTTTTTTTTT.====TTTTTTTTTTTTTTTTTTTTTTT', //  0
    'TTTTTTTTTTTTTTTTTTTT.====TTTTTTTTTTTTTTTTTTTTTTT', //  1
    'TTTTTTTTTTTTTTTTTTTT.====TToTTTTTTTTTTTTTTTTTTTT', //  2
    'TTTTTTTTTTTTTTTTTTTT.=:::TTTTTTTTTTTTTTTTTTTTTTT', //  3
    'TTTTTTTTTTTTTTTTTTTT.=:::TTTTTTTTTTTTTTTTTTTTTTT', //  4
    'TTTTTTTTTTTTTTTTTTTT.=:::TTTTTTTTTTTTTTTTTTTTTTT', //  5
    'TTToTTTTTTTT.....TT..=:::TTTTTTTTTTTTTTTTTTTTTTT', //  6
    'TTToTTTT........TTT..====..TTTTTTTTTTTTTTTTTTTTT', //  7
    'TTTTTTT..#......TTTo.====..TTTTTTTTTTTTTTTTTTTTT', //  8
    'TTTTT....######.TTT.o.===...ooTTTTTTTTTTTTTTTTTT', //  9
    'TTTTT..######..#......===....TTTTTTTTTTTTTTTTTTT', // 10
    'TTTTT..#..TT#..###....=====..TTTTTTTTTTTTTTTTTTT', // 11
    'TTTTT..#...T#::####T..=====.TTTTTTTTTTTTTTTTTTTT', // 12
    'TTT...######:::####T..=====.oTTTTTTTTTTTooTTTTTT', // 13
    'TTT....#####:::#.##...=====.oTTTTTTTTTTTTTTTTTTT', // 14
    'TTT.......#oo:====oo.======..TTTTTTTTTTTTTTTTTTT', // 15
    'TTTT..o......o.=========:::..TTTTTTTTTTTTTTTTTTT', // 16
    'TTTTT.o.....o...T=====:::::..TTTTTTTTTTTTTTTTTTT', // 17
    'TTTTTTTTT......TTT..==:::::.TTTTTTTTTTTTTTTTTTTT', // 18
    'TTTTTTTTT.....TTTToo.=:::::.TTTTTTTTTTTTTTTTTTTT', // 19
    'TTTTTTTTT.....TTTToT.=::===.TTTTTTTTTTTTTTTTTTTT', // 20
    'TTTTTTTTT.TTooTTTToo.=::===.ooTTTTTTTTTTTTTTTTTT', // 21
    'TTTTTTTTTTTTTooooooo.======.TTTooTTTTTTTTTTTTTTT', // 22
    'TTTTTTTTTTTTToooooTT.======.TTTooTTTTTTTTTTTTTTT', // 23
    'TTTTTTTTTTTTToooooTT.======.TTTTTTTTTTTTTTTTTTTT', // 24
    'TTTTTTTTTTTTToooooTT.======.TTTTTTTTTTTTTTTTTTTT', // 25
    'TTTTTTTTTTTTTTTTTTTo.======.TTTTTooTTTTTTTTTTTTT', // 26
    'TTTTTTTTTTTTTTTTTTTT.===::=..TTTTooTTTTTTTTTTTTT', // 27
    'TTTTTTTTTTTTTTTTTTTT.===::::.TTTTTTTTTTTTTTTTTTT', // 28
    'TTTTTTTTTTTTTTTTTTTT.===::::.TTTTTTTTTTTTTTTTTTT', // 29
    'TTTTTTTTTTTTTTTTTTTT.===::::.TTToooTTTTTTTTTTTTT', // 30
    'TTTTTTTTTTTTTTTTTTTT.======..TTToooTTTTTTTTTTTTT', // 31
  ],
  entities: [
    { id: 'sw-sign', kind: 'sign', at: [20, 15], look: 'post', text: 'SHRINEWOOD. The shrine keeps no god anyone remembers. Leave something anyway.' },
    // the carved stone is in the painting: the entity only lets you read it
    { id: 'sw-carved-stone', kind: 'sign', at: [16, 14], look: 'painted', name: 'The carved stone', text: 'A standing stone carved with a tree, its roots running down into the ground. Moss has filled the cuts. Someone has left a sprig of juniper at its foot, not long ago.' },
    { id: 'sw-arch-cache', kind: 'chest', at: [13, 10], loot: { gold: 60, bag: { 'hearth-tonic': 2 } } },
  ],
  exits: [
    { id: 'sw-ford', area: [21, 31, 26, 31], to: 'plankford', anchor: 'from-shrine' },
    { id: 'sw-falls', area: [20, 0, 24, 0], to: 'silverfall', anchor: 'from-shrine' },
  ],
  anchors: { 'from-ford': [23, 30, 'n'], 'from-falls': [22, 1, 's'] },
  roads: [{ from: 'from-ford', to: 'sw-falls', gates: [] }],
});
