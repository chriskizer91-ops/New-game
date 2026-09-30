// Willowmurk (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-willowmurk.png), the hidden
// village: reed-thatched huts on islets in a black lagoon under great weeping willows, joined by plank walks, inside a
// ring of carved ward-stones. Three of the stones have gone dark (the two at the broken west gate, and the one that
// faces Grandfather Willow's clearing): the wards are failing. The Murkway comes in from the east (41,11-12), and a road
// of packed earth crosses the village on two plank bridges, through the moot-circle of old flagstones in the middle,
// where the Willow Hearth burns in the plain centre (21,12). Five huts stand round the circle: Elder Moss's big hut to
// the north-west, with the oldest willow over its yard, where he stands at the roots (16,5); a round hut to the north;
// a hut to the north-east with Sedge's herb stall on its deck, where she stands at the deck's end (35,8); a round hut
// to the south; and a hut to the south-east, a villager in its garden (28,18). West of the village the road passes the
// ring between two of its stones, where the broken ward-gate stands across it (3,12-13), the willow-wights in the pass
// beside it (3,11), and goes on to Rotbridge (0,11-12). There a side path runs south outside the ring, between a willow
// and a ward-stone, where the villagers have hung a witch-ward across it (1-2,16), and on past the stones into the
// willows, to Grandfather Willow's clearing, where he stands at the back by the water (8-10,23-24), his hoard
// beside him (10,25).
// Layout notes: the wights stand in the pass beside their gate, so a Brand's re-armed rematch stands beside an open
// road. The ring is closed on the west (the painted stones, and the dark stone in the gap that faces the clearing), so
// the ward-gate is the only way through it and the witch-ward the only way to the clearing. When the wards are mended
// (`wards-mended`) the three dark stones light again; they are sprites on plain ground in the ring. The other seven
// ward-stones are the painting's own (signs with the painted look).
// Traced from the painting (one tile is 36.6 of its px; `overTiles: false`). Tiles: '=' the road and the side path,
// '.' islet turf, ',' flower beds and gardens, '"' reeds and iris, 'b' plank walks and bridges, '_' decks and porches,
// ':' the moot-circle's flagstones, '+' hut doors, '~' black water, 'T' weeping willows, 'H' reed thatch, '#' hut
// walls, 't' market stalls, barrels, posts and brush, '|' the back garden's fence, 'o' the carved stones, boulders and
// stumps.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3 (traced from the painting).
import { deepFreeze } from '../../core/freeze.js';

// A ward-stone gone dark until the wards are mended, then lit again (two entities, one tile).
const failing = (id, at) => [
  { id, kind: 'sign', at, look: 'ward-stone-dark', if: { not: { flag: 'wards-mended' } }, text: 'A ward-stone gone dark and cold. The charms on it hang still, and something has scored the moss off one side.' },
  { id: `${id}-lit`, kind: 'sign', at, look: 'ward-stone', if: { flag: 'wards-mended' }, text: 'A ward-stone, lit again. It hums, low, the way the others do.' },
];
// A ward-stone of the ring that the painting shows (the sign lets you read it and draws no sprite).
const ward = (id, at) => ({ id, kind: 'sign', at, look: 'painted', name: 'The ward-stone', text: 'A ward-stone hung with reed charms. It hums, low, as if it were keeping count.' });

export default deepFreeze({
  id: 'willowmurk', name: 'Willowmurk', region: 'gloomfen', biome: 'willow-village', music: 'town',
  backdrop: 'willowmurk', zone: null, level: 15, travel: true, dark: false, overTiles: false,
  lore: [[410, 620, 21, 13]],
  w: 42, h: 28,
  rows: [
    'TTTT~~~TTTTTTTTTT~~TTTTTTTTTTTTT~ooTTTTTTT', //  0
    'TTTT~~oTTTTTTTTTT~~TTTTT~~~TTTTT~ooTTT~TTT', //  1
    'TToo~.o.Tbb|||TTT~oTHHHH~~oTTTTT~ooTTToTTT', //  2
    'T~oo".o..bb,,,TTT~o.HHHH.~oTTTTT~.....ooT~', //  3
    '~~o.....HHHHHHHTT...HHHH.bo~~HHHH......o~~', //  4
    '~~t,""",HHHHHHHt.....+_..b..~HHHHttt__..oo', //  5
    'TTT~~~~,####+##tt~...bb..b~..HHHHttt__..oo', //  6
    'TTT""~~,________b~~~~bb~~bbbb##+#ttt~~~.oo', //  7
    'TTo""~~~~,,,bb,,bb"o,bb."".....b____~~""oo', //  8
    'TTo,..~~~,,"b~~,,bbo,::o.......b..~~~~""oo', //  9
    'T.o.,,..""~~b~~~~o:::::::o.~~~~b~~~~~~"".o', // 10
    '===.......~~b~~~~o:::==::o.~~~~b~~......==', // 11
    '==========bbbbbbb=:::==::==bbbbbbb========', // 12
    't=========bbbbbbb.:::==::..bbbbbbb=====..t', // 13
    'T==o."."""~~~b~~~.o::::::o.~~~~b""TTTT"".T', // 14
    'T==o""~~~TTT~bTTTb..obbo..bb...b""TTTT"ooT', // 15
    'T==o"~~~TTTHHHTTT~...bb...bb.HHHHHHTTT~ooT', // 16
    'T==o..~bTTTHHHTTT~~~~bb~~~~..HHHHHHTTTtoTT', // 17
    'TT=.o..b__HHHHHTT~~~HHHH.~~..HHHHHHTTT~~TT', // 18
    'TT==o".b,,H###+t,~~~HHHH.~~..##+ttttt~~~TT', // 19
    'TT==o".~~,,,,,_bbbbbH+#..~~.._____ttt~~~TT', // 20
    'Too=..o~~,,,,,b~~~~,.bb.~~~~~~~b~b___~~oTT', // 21
    'Too==.oo~~~~~~b~~~~~,bb.~~~~~~~b~b~~~~~o~T', // 22
    'TTTT==.o..o~~~~~~~~~,bb.~~~~~~~~~b~~oo~o~T', // 23
    'TTTTo=.o..oo~~~~~~...bb...oo""TTTTT~oo~~~T', // 24
    'TTTTT==....ooTTTTTo..==TT..o""TTTTT~ooTTTT', // 25
    'TTTTTT==...ooTTTTTTTTTTTT""""TTTTTT~~~TTTT', // 26
    'TTTTTTTTTTTooTTTTTTTTTTTTTTTTTTTTTT~~~TTTT', // 27
  ],
  entities: [
    { id: 'wm-sign', kind: 'sign', at: [38, 11], look: 'post', text: 'WILLOWMURK. The wards keep what the willows would take. Walk the planks, and speak soft.' },
    { id: 'willow-hearth', kind: 'hearthfire', at: [21, 12], stand: [21, 13, 'n'] },
    { id: 'moss', kind: 'npc', npc: 'moss', at: [16, 5], face: 's' },
    { id: 'sedge', kind: 'npc', npc: 'sedge', at: [35, 8], face: 's' },
    { id: 'wm-villager', kind: 'npc', npc: 'wm-villager', at: [28, 18], face: 'w' },
    // the ring of ward-stones round the village (the painting's own), three of them dark (sprites on plain ground)
    ward('wm-stone-nw', [3, 4]), ward('wm-stone-n', [18, 4]), ward('wm-stone-ne', [38, 4]),
    ward('wm-stone-e1', [40, 10]), ward('wm-stone-e2', [40, 14]), ward('wm-stone-se', [26, 25]),
    ward('wm-stone-s', [18, 24]),
    ...failing('wm-stone-sw', [5, 21]), ...failing('wm-stone-gate-n', [3, 10]), ...failing('wm-stone-gate-s', [4, 14]),
    // M4.5 road gate (spec A3, §2.2): the broken ward-gate in the pass through the ward-line, the wights beside it
    { id: 'wm-ward-gate', kind: 'gate', area: [3, 12, 3, 13], look: 'ward-gate', open: { beaten: 'wm-wights' }, guard: 'wm-wights', text: 'The ward-gate: wicker and bone between two dark stones, broken outward. Willow-roots have grown through it, and some of the roots are moving.' },
    { id: 'wm-wights', kind: 'encounter', enc: 'wm-wights', mode: 'block', at: [3, 11], face: 'e' },
    // the side path out past the wards to Grandfather Willow (the lead: GLOOM_LEADS.willow)
    { id: 'wm-witch-ward', kind: 'lock', lock: 'witch-ward', area: [1, 16, 2, 16] },
    { id: 'wm-willow', kind: 'encounter', enc: 'wm-willow', mode: 'lair', at: [9, 24], area: [8, 23, 10, 24], face: 'n' },
    { id: 'wm-willow-hoard', kind: 'chest', at: [10, 25], loot: { gold: 120, gems: { 'bog-amber': 1 }, materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'wm-e', area: [41, 11, 41, 12], to: 'murkway', anchor: 'from-willowmurk' },
    { id: 'wm-w', area: [0, 11, 0, 12], to: 'rotbridge', anchor: 'from-willowmurk' },
  ],
  anchors: { 'from-murkway': [40, 12, 'w'], 'from-rotbridge': [1, 12, 'e'] },
  roads: [{ from: 'from-murkway', to: 'wm-w', gates: ['wm-ward-gate'] }, { from: 'from-rotbridge', to: 'wm-willow', gates: [] }],
  roam: null,
});
