// Thareia (T2): under Fawnrest, the node (design/09-t2-spec.md 2.10, beats 12-14). Traced tile by tile from the
// player's painting art-in/scenes/walk-fawnrest-node.png (1536 x 1024, 48 x 32 tiles at 32 px; `overTiles: false`): a
// round hall of fitted stone under the roots, a ring of floor round a raised dais, and on the dais the node, a crystal as
// tall as a door grown through with roots. Straight channels of warm water run either side; walkways cross them to a lit
// alcove (north-west), a stair behind the node (north), a stair in the north-east corner and an arch in the east.
// The way in is the stair from the south edge (up to Fawnrest's court). The stair gate (roots across its head) waits on
// c1-node-stair; the hall trigger at its head starts c1-node-hall; the dais rim is shut but for the root gate at its
// front (c1-node-roots), and past it the Hart of Fawnrest (c1-guardian) lies before the node.
// Tiles: ':' the floors, 's' the stairs, '#' walls, the dais rim (its steps) and the node's crystal, '~' the channels,
// 'Y' the great roots. The node prop (th-fn-node) is its glow, drawn over the painting's crystal: white-hot until
// c1-node-cooled, then gold (ui/world/view.js, art/map-sprites.js). Owner: G.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-fawnrest-node', name: 'Under Fawnrest', region: 'verdant', biome: 'roots', music: 'dungeon',
  backdrop: 'fawnrest-node', zone: null, level: 9, travel: false, dark: true, overTiles: false,
  lore: [[370, 170, 24, 16]],
  w: 48, h: 32,
  rows: [
    'YYYYYYY#############:::::::#####################', //  0  the door at the head of the north stair
    'YYYYYYY#############:::::::#######sss###########', //  1
    'YYYYYYY##############ssss#########sss###########', //  2
    'YYYYYYY##############ssss#########sss###########', //  3
    'YY#:::###############ssss########:::::####::::##', //  4
    'YY::::::#############ss##########:::::####::::##', //  5
    'YY::::::###########::::#####:::::::~~~~~~~::::~#', //  6
    'YY::::::~~~~~######::::#####:::::::~~~~~~~::::~#', //  7
    'YY::::::~~~~~#####::::#######::####~~~~~~~::::~#', //  8
    'YY~~~::::::::##::::::#########::::#~~~~~~~::::~#', //  9  the ring round the dais
    'YY~~~:::::::::::::##############::::~:::::::::YY', // 10
    'YY~~~~~~~~~:::::###:##########:###::::::::::::YY', // 11
    'YY~~~~~~~~~::::##:::##########:::#::::~~~~~~~~YY', // 12
    'YY~~~~~~~~:::::#::::##########:::##::::~~~~~~~YY', // 13
    'YY~~~~~~~~:::::#::::##########::::#::::~~~~~~~YY', // 14
    'YY~~~~~~~~:::::##::::#########:::##::::~~~~~~~YY', // 15
    'YY~~~~~~~~::::::##::::::::::::::##:::::~~~~~~~YY', // 16  the dais top, before the node
    'YY~~~~~~~~~::::::###:::::::::####:::::~~~~~~~~YY', // 17
    'YY~~~~~~~~~~:::::::###:::::###:::::::~~~~~~~~~YY', // 18  the root gate in the dais rim
    'YY~~~~~~~~~~~#:::::::::::::::::::::~~~~~~~~~~~YY', // 19
    'YY~~~~~~~~~~~###::::#::::::#:::::##~~~~~~~~~~~YY', // 20
    'YY~~~~~~~~~~~########::::::########~~~~~~~~~~~YY', // 21  the hall trigger at the stair head
    'YY~~~~~~~~~~~########ssssss########~~~~~~~~~~~YY', // 22  the stair gate
    'YY~~~~~~~~~~~########ssssss########~~~~~~~~~~~YY', // 23
    'YYYYY~~~~~~~~########ssssss########~~~~~~~~~~~YY', // 24
    'YYYYY~~~~~~~~########ssssss########~~~~~~~~~~~YY', // 25
    'YYYYY~~~~~~~~########ssssss########~~~~~~~~YYYYY', // 26
    'YYYYY#####YYYYYY#####ssssss######YYYYYY####YYYYY', // 27
    'YYYYY#####YYYYYY###:::::::::::###YYYYYY####YYYYY', // 28
    'YYYYY#####YYYYYY###:::::::::::###YYYYYY####YYYYY', // 29
    'YYYYY#####YYYYYY:::::::::::::::::YYYYYY####YYYYY', // 30
    'YYYYY#####YYYYYY:::::::::::::::::YYYYYY####YYYYY', // 31  the stair up to Fawnrest
  ],
  entities: [
    // the stair down: hot water (Taela goes quiet), then roots across its head and what lives in them
    { id: 'c1-fn-hot', kind: 'trigger', area: [21, 26, 26, 27], on: 'step', once: true, dialogue: 'c1-fn-hot' },
    { id: 'th-fn-stair-gate', kind: 'gate', area: [21, 22, 25, 22], look: 'rot-knot', open: { beaten: 'c1-node-stair' }, guard: 'c1-node-stair', text: 'Black roots grown across the stair, wet and warm.' },
    { id: 'c1-node-stair', kind: 'encounter', enc: 'c1-node-stair', mode: 'block', at: [26, 22], face: 's' },
    // the hall: fitted floors, straight channels, then the fight in them (guarded by the fight, so a reload replays it)
    { id: 'c1-fn-hall', kind: 'trigger', area: [21, 21, 26, 21], on: 'step', if: { not: { beaten: 'c1-node-hall' } }, dialogue: 'c1-fn-hall' },
    { id: 'th-fn-sign', kind: 'sign', at: [15, 13], look: 'painted', text: 'A script runs round the dais, cut deep in the stone. No one here can read it.' },
    // the dais: roots across the front of it, and the node on it
    { id: 'th-fn-root-gate', kind: 'gate', area: [22, 18, 25, 18], look: 'rot-knot', open: { beaten: 'c1-node-roots' }, guard: 'c1-node-roots', text: 'Roots from the node, grown over the dais steps.' },
    { id: 'c1-node-roots', kind: 'encounter', enc: 'c1-node-roots', mode: 'block', at: [26, 18], face: 's' },
    { id: 'th-fn-node', kind: 'prop', prop: 'node', at: [25, 15], solid: true },
    { id: 'c1-guardian', kind: 'encounter', enc: 'c1-guardian', mode: 'lair', at: [24, 17], area: [22, 16, 26, 17], face: 's', talk: 'c1-guardian-wakes' },
    // the node's light, and the lamps in the alcoves and the stair's niches
    { id: 'th-fn-node-light', kind: 'light', at: [25, 13], radius: 6 },
    { id: 'th-fn-lamp-nw', kind: 'light', at: [4, 5], radius: 2 },
    { id: 'th-fn-lamp-e', kind: 'light', at: [44, 5], radius: 2 },
    { id: 'th-fn-lamp-sw', kind: 'light', at: [16, 25], radius: 2 },
    { id: 'th-fn-lamp-se', kind: 'light', at: [31, 25], radius: 2 },
  ],
  exits: [
    { id: 'fn-up', area: [21, 31, 26, 31], to: 'th-fawnrest', anchor: 'from-node' },
  ],
  anchors: { 'from-fawnrest': [23, 30, 'n'] },
  roam: null,
});
