// Silverfall (M5, the East Road; painted from the player's picture art-in/extra/path-waterfall.png). The
// fifth of the East Road's six painted maps: the road winds north through birch and pine past a waterfall
// that drops from a mossy crag into a clear pool (west, 8-24, 3-17), ringed with stones. A sandy beach on the
// pool's south shore (12-24, 18-20) opens straight off the road; there is a gap in the ring stones at (20, 18)
// where you can kneel at the water. North-east, a nook among the rocks (32, 6) holds a cache.
// Traced from the painting (one tile is 32 of its px; `overTiles: false`). Tiles: '=' the road, '.' grass,
// ',' the pool's beach, '~' the pool and the falls, 'o' the ring stones, the crag and the boulders, 'T' the
// forest and the ferns.
// Format: src/data/maps/index.js. Owner: the lead (M5 P8, the East Road).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'silverfall', name: 'Silverfall', region: 'ironspire', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: null, level: 12, travel: true, dark: false, overTiles: false,
  lore: [[602, 348, 24, 30], [610, 342, 25, 0]],
  w: 48, h: 32,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTT===.TTTTTTTTTTTTTTTTTTTT', //  0
    'TTTTTTTTToooooooooTTTTTT===.TTTTTTTTTTTTTTTTTTTT', //  1
    'TTTTooooToooooooooTTTTTT===.TTTTTTTTTTTTTTTTTTTT', //  2
    'TTTToooo~oooooooooTTTTTT===.TTTTTTTTTTTTTTTTTTTT', //  3
    'TTTToooo~~~ooooooTTTTTTTT===.oooooTTTTTTTTTTTTTT', //  4
    'TTTToooo~~~ooooooTTTTTTTT===.oooooTTTTTTTTTTTTTT', //  5
    'TTTToooo~~~ooooooTTTTTTT.====....T...TTTTTTTTTTT', //  6
    'TTTToooo~~~ooooooTTTTTTToo====..oo...TTTTTTTTTTT', //  7
    'TTTToooo~~~ooooooTTTTTTTooo====......oTTTTTTTTTT', //  8
    'oooooooo~~~~TTTTTTTTTTTTooo.====.....oTTTTTTTTTT', //  9
    'oooooooo~~~~~~~~~~oooTT......===......TTTTTTTTTT', // 10
    'oooooooo~~~~~~~~~~~ooooo.....====.ooo..TTTTTTTTT', // 11
    'ooooTooo~~~~~~~~~~~~~ooooo....===.ooo..TTTTTTTTT', // 12
    'oooooooo~~~~~~~~~~~~~~~~ooo...===.......TTTTTTTT', // 13
    'ooooooo~~~~~~~~~~~~~~~~~~oo...===.......TTTTTTTT', // 14
    'ooooo~~~~~~~~~~~~~~~~~~~oo...====........TTTTTTT', // 15
    '~~~ooTTTo~~o~~oo~~~~~~~~oo...===..........TTTTTT', // 16
    '~~~ooTTToooo,,ooo~~~,~~oo...====..ooooo...TTTTTT', // 17
    'TTTTTTTTTTTT,,,,,ooo,o,,,..=====..oooooo..TTTTTT', // 18
    'TTTTTTTTTTTT,,,,,,oo,,,,,.=====...ooooooTTTTTTTT', // 19
    'TTTTTTTTTTTT,,,,,,,,,,,,=======..ToooooTTTTTTTTT', // 20
    'TTTTTTTTTTTTTTTTT.......======...ToooooTTTTTTTTT', // 21
    'TTTTTTTTTTTTTTTTT..oo...====......TTTTTTTTTTTTTT', // 22
    'TTTTTTTTTTTTTTTTT..ooo..====..........TTTTTTTTTT', // 23
    'TTTTTTTTTTTTTTTTT.......===TTT........TTTTTTTTTT', // 24
    'TTTTTTTTTTTTTTTTTTT....====TTTT.......TTTTTTTTTT', // 25
    'TTTTTTTTTTTTTTTTTTTT...====.Tooooo....TTTTTTTTTT', // 26
    'TTTTTTTTTTTTTTTTTTTT...====.Tooooo....TTTTTTTTTT', // 27
    'TTTTTTTTTTTTTTTTTTTT...====.ToooooTTTTTTTTTTTTTT', // 28
    'TTTTTTTTTTTTTTTTTTTT...====.ToooooTTTTTTTTTTTTTT', // 29
    'TTTTTTTTTTTTTTTTTTTT...====.ToooooTTTTTTTTTTTTTT', // 30
    'TTTTTTTTTTTTTTTTTTTT...====.TTTTTTTTTTTTTTTTTTTT', // 31
  ],
  entities: [
    { id: 'sf-sign', kind: 'sign', at: [23, 21], look: 'post', text: 'SILVERFALL. Fill your waterskins here. There is no water on the pass that is not snow.' },
    // the pool is in the painting: the entity only lets you look into it from the gap in the ring stones
    { id: 'sf-pool', kind: 'sign', at: [20, 17], look: 'painted', name: 'The pool', text: 'The pool under the falls is so clear you can count the stones on its floor. Far down among them something glints, well out of reach, and the cold of the water comes up off it like breath.' },
    { id: 'sf-rock-cache', kind: 'chest', at: [32, 6], loot: { gold: 90, materials: { scrap: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'sf-shrine', area: [23, 31, 26, 31], to: 'shrinewood', anchor: 'from-falls' },
    { id: 'sf-camp', area: [24, 0, 26, 0], to: 'last-camp', anchor: 'from-falls' },
  ],
  anchors: { 'from-shrine': [24, 30, 'n'], 'from-camp': [25, 1, 's'] },
  roads: [{ from: 'from-shrine', to: 'sf-camp', gates: [] }],
});
