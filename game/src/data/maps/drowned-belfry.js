// The Drowned Belfry (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-drowned-belfry.png),
// the bell-hall under Misthollow, dark (`dark: true`). The stair comes in at the south edge (9-12,28-32) onto a landing,
// and the nave runs north over big old flagstones between two rows of great pillars. Green water pools in the side
// aisles beyond them, under arches and broken walls, with air pockets glowing in it and bells hanging low over its edge
// (5,14; 16,14; 5,24; 16,24). In the middle of the nave's floor a brass plaque asks you to sing soft (10,22), and under
// the floor there is a shape, and a slow light that comes and goes: the Sleeper (10,18). A carved wooden choir-screen
// crosses the nave, its gate shut in its arch (10,11) and the drowned choir in the arch beside it (11,11); behind it the
// alms box (14,8) and the apse, where the three great bells hang in their niches and the Drowned Cantor keeps time on
// the plain floor before them (9-11,6-7).
// Layout notes: the screen's gate is the only way into the choir and the apse (GLOOM_LEADS.cantor: the choir, then the
// Cantor); the choir stands in the arch beside it.
// Traced from the painting (one tile is 46.5 of its px; `overTiles: false`). Tiles (belfry): 'k' the nave's
// flagstones, ':' the apse's and the landings' flagstones, 'w' the flooded aisles (green shallow water), 'f' air
// pockets glowing in it, '~' deep water under the arches, 'Y' the pillars and the aisles' columns, 't' the carved
// choir-screen, 'o' fallen masonry, '#' walls, arches and the apse's bell niches, 's' the stair up.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

const bell = (id, at) => ({ id, kind: 'prop', prop: 'bell', at, solid: true });
const glow = (id, at, radius = 2) => ({ id, kind: 'light', at, radius });

export default deepFreeze({
  id: 'drowned-belfry', name: 'The Drowned Belfry', region: 'gloomfen', biome: 'belfry', music: 'dungeon',
  backdrop: 'drowned-belfry', zone: null, level: 18, travel: false, dark: true, overTiles: false,
  lore: [[330, 690, 10, 14]],
  w: 22, h: 33,
  rows: [
    '######################', //  0
    '######################', //  1
    '######################', //  2
    '~~##################~~', //  3
    '~~##################~~', //  4
    '##Y#~Y#::::::::#Y~#Y##', //  5
    '#~Y#~Y#::::::::#Y~#Y~#', //  6
    '#~YwwY#::::::::#YwwY~#', //  7
    '#~Ywww#::::::::#wwwY~#', //  8
    '#wwwww#::::::::#wwwww#', //  9
    '#wwoww#ttt::ttt#wwoww#', // 10
    '####w:#ttt::ttt#:w####', // 11
    '###Y::kkkkkkkkkk::Y###', // 12
    '#~#YwwYYkkkkkkYYwwY#~#', // 13
    '#~wYwwYYkkkkkkYYwwYw~#', // 14
    '#wwwwwYYkkkkkkYYwwwww#', // 15
    '##wwfwkkkkkkkkkkwfww##', // 16
    '##wwwwYYkkkkkkYYwwww##', // 17
    '##wwwwYYkkkkkkYYwwww##', // 18
    '##wwwwYYkkkkkkYYwwww##', // 19
    '####::YYkkkkkkYY::####', // 20
    '###Y::kkkkkkkkkk::Y###', // 21
    '#~~YwwYYkkkkkkYYwwY~~#', // 22
    '#~~YfwYYkkkkkkYYwfY~~#', // 23
    '#wwwwwYYkkkkkkYYwwwww#', // 24
    '#wwwwwYYkkkkkkYYwwwww#', // 25
    '##wwwwkkkkkkkkkkwwww##', // 26
    '##www####::::####www##', // 27
    '###ww####ssss####ww###', // 28
    '###ww####ssss####ww###', // 29
    '#########ssss#########', // 30
    '#########ssss#########', // 31
    '#########::::#########', // 32
  ],
  entities: [
    // the bells hanging low over the water's edge in the flooded aisles (the painting's three great bells hang in the apse)
    bell('db-bell-1', [5, 14]), bell('db-bell-2', [16, 14]), bell('db-bell-3', [5, 24]), bell('db-bell-4', [16, 24]),
    glow('db-air-1', [4, 16]), glow('db-air-2', [17, 16]), glow('db-air-3', [17, 23]), glow('db-air-4', [4, 23]),
    { id: 'db-plaque', kind: 'sign', at: [10, 22], look: 'plaque', text: 'A brass plaque in the floor, green with age: THE CHOIR KEEPS ITS WATCH HERE. SING SOFT.' },
    // the Sleeper, under the floor (a prop the scene after the Brand of the Deep uses)
    { id: 'sleeper', kind: 'prop', prop: 'sleeper', at: [10, 18] },
    // M4.5 road gate (spec A3, §2.2): the choir screen's gate in its arch, the drowned choir in the arch beside it
    { id: 'db-choir-screen', kind: 'gate', area: [10, 11, 10, 11], look: 'choir-screen', open: { beaten: 'db-choir' }, guard: 'db-choir', text: 'The choir screen\'s gate is shut, and the drowned choir stands at it in rows, mouths open. There is no sound. Then there is.' },
    { id: 'db-choir', kind: 'encounter', enc: 'db-choir', mode: 'block', at: [11, 11], face: 's' },
    { id: 'db-alms', kind: 'chest', at: [14, 8], loot: { gold: 110, gems: { 'glass-pearl': 1 }, materials: { silver: 1 } } },
    glow('db-apse-light', [10, 5], 4),
    // the two candles the painting sets on the choir-screen, either side of its arch
    glow('db-screen-candle-w', [8, 11], 1), glow('db-screen-candle-e', [13, 11], 1),
    { id: 'cantor', kind: 'encounter', enc: 'cantor', mode: 'lair', at: [10, 7], area: [9, 6, 11, 7], face: 's' },
  ],
  exits: [
    { id: 'db-up', area: [9, 32, 12, 32], to: 'misthollow', anchor: 'from-belfry' },
  ],
  anchors: { 'from-misthollow': [10, 31, 'n'] },
  roads: [{ from: 'from-misthollow', to: 'cantor', gates: ['db-choir-screen'] }],
  roam: null,
});
