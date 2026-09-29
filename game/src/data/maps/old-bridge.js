// The Old Bridge (M5, the East Road; painted from the player's picture art-in/extra/path-stone-bridge.png).
// The first of the East Road's six painted maps, between the Keep's east postern and the Rockslide Pass:
// an old stone bridge carries the road north off the Keep's lake to its shore, where a great willow leans
// over the water on the west and oaks and birches crowd the east. The road runs north between them
// through a strip of meadow. A signpost stands at the bridgehead; under the willow, on the sand, a cache.
// Traced from the painting (one tile is 32 of its px; `overTiles: false`: the painting has no tile
// canopies). Tiles: '=' the road, '.' the meadow, ',' the sand of the shores, 'b' the bridge deck, '#' its
// parapets and the bridgehead posts, 'T' the willow, the oaks and the undergrowth, 'o' boulders, '~' the lake.
// Format: src/data/maps/index.js. Owner: the lead (M5 P8, the East Road).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'old-bridge', name: 'The Old Bridge', region: 'ironspire', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: null, level: 12, travel: true, dark: false, overTiles: false,
  lore: [[556, 380, 23, 22], [562, 374, 23, 0]],
  w: 48, h: 32,
  rows: [
    '~~~~~TTTTTTTTTTTT.....====...TTTTTTTTTTTTTToo~~~', //  0
    '~~~~~TTTTTTTTTTTT.....====...TTTTTTTTTTTTTTTT~~~', //  1
    '~~~~~TTTTTTTTTTTT.....====...TTTTTTTTTTTTTTTT~~~', //  2
    '~~~~~TTTTTTTTTTTT.....====...TTTTTTTTTTTTTTT~~~~', //  3
    '~~~~~TTTTTTTTTTTTTo...====...TTTTTTTTTTTTTTT~~~~', //  4
    '~~~~~~TTTTTTTTTTTTTT..====.oooTTTTTTTTTTTTTT~~~~', //  5
    '~~~~~TTTTTTTTTTTTTTT..====.oooTTTTTTTTTTTTTT~~~~', //  6
    '~~~~~TTTTTTTTTTTTTTT..====...TTTTTTTTTTTTTTT~~~~', //  7
    '~~~~~TTTTTTTTTTTTTTT..====...TTTTTTTTTTTTTTT~~~~', //  8
    '~~~~~TTTTTTTTTTTTTTT..====....TTTTTTTTTTTTTT~~~~', //  9
    '~~~~~TTTTTTTTTTTTTTT..====....TTTTTTTTTTTTTT~~~~', // 10
    '~~~~~TTTTTTTTTTTTTT...====....TTTTTTTTTTTTTT~~~~', // 11
    '~~~~~TTTT,,,,,,,,,,,##====##.....,,,,,oo,TTT~~~~', // 12
    '~~~~~TTTT,,,o,,,,,,,##====##,,,,,,,,,ooooTTT~~~~', // 13
    '~~~~~TTTTooooooo,,,,##====##,,,,,ooTTooooTTT~~~~', // 14
    '~~~~~TTTToooooooT,,,##bbbb#ooo,,,ooTTooooTT~~~~~', // 15
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#oooTTTTTTTTTTTT~~~~~~', // 16
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 17
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 18
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 19
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 20
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 21
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 22
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 23
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 24
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 25
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 26
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 27
    '~~~~~~~~~~~~~~~~~~~~~#bbbb#~~~~~~~~~~~~~~~~~~~~~', // 28
    '~~~~~~~~~~~~~TTTT#####bbbb#####~~~~~~~~~~~~~~~~~', // 29
    '~~~~~~~~~~~~~TTTTTTTTTbbbbTTTTTTTT~~~~~~~~~~~~~~', // 30
    '~~~~~~~~~~~~~TTTTTTTTTbbbbTTTTTTTT~~~~~~~~~~~~~~', // 31
  ],
  entities: [
    { id: 'ob-sign', kind: 'sign', at: [21, 9], look: 'post', text: 'THE EAST ROAD. North by the lea and the ford to the Last Camp and the Rockslide Pass. Behind you, over the old bridge: Hearthstone Keep.' },
    { id: 'ob-willow-cache', kind: 'chest', at: [10, 12], loot: { gold: 60, bag: { 'hearth-tonic': 1 } } },
  ],
  exits: [
    { id: 'ob-keep', area: [22, 31, 25, 31], to: 'keep', anchor: 'from-east-road' },
    { id: 'ob-lea', area: [22, 0, 25, 0], to: 'drystone-lea', anchor: 'from-bridge' },
  ],
  anchors: { 'from-keep': [23, 30, 'n'], 'from-lea': [23, 1, 's'] },
  roads: [{ from: 'from-keep', to: 'ob-lea', gates: [] }],
});
