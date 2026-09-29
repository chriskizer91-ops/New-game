// Willowmurk (M6 spec §2.1, §2.3), the hidden village: reed-thatched huts under great weeping willows, on islets in a
// black lagoon joined by plank walks, inside a ring of ward-stones. Three of the stones have gone dark (the two at
// the broken west gate, and the one that faces Grandfather Willow's clearing): the wards are failing. The Murkway
// comes in at the east gate (E); the street crosses the lagoon on planks to the moot islet, where the Willow Hearth
// burns in the moot-circle (15,10), and on west to the ward-line. Elder Moss sits at the roots of the oldest willow on
// the north islet, beside his hut (13,4); Sedge keeps her herbs on the islet to the north-east (24,6); the south
// islet has the huts and drying racks, and a villager (14,20). The ward-line runs down the lagoon's west side: the
// only way through is the broken ward-gate (4,13-14), where the willow-wights stand in the pass (4,12). Past it the
// west road goes on to Rotbridge, and a side road runs south along the shore, out past the wards, to Grandfather
// Willow's clearing; the villagers have hung a witch-ward across it (1-2,17).
// Layout notes: the wights stand in the pass beside their gate, so a Brand's re-armed rematch stands beside an open
// road. The witch-ward is the only way to the clearing (Grandfather Willow and his hoard). When the wards are mended
// (`wards-mended`) the three dark stones light again.
// Tiles (willow-village): '.' islet turf, ',' marigolds and herb beds, '"' reeds, '=' the paths, ':' the moot-circle's
// stones, 'b' plank walks, 'r' willow roots, '~' black water, 'T' weeping willows, 't' drying racks and eel-traps,
// '#' wattle-and-daub walls, 'H' reed thatch, '+' doors, '*' lanterns on posts.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

// A ward-stone gone dark until the wards are mended, then lit again (two entities, one tile).
const failing = (id, at) => [
  { id, kind: 'sign', at, look: 'ward-stone-dark', if: { not: { flag: 'wards-mended' } }, text: 'A ward-stone gone dark and cold. The charms on it hang still, and something has scored the moss off one side.' },
  { id: `${id}-lit`, kind: 'sign', at, look: 'ward-stone', if: { flag: 'wards-mended' }, text: 'A ward-stone, lit again. It hums, low, the way the others do.' },
];
const ward = (id, at) => ({ id, kind: 'sign', at, look: 'ward-stone', text: 'A ward-stone hung with reed charms. It hums, low, as if it were keeping count.' });

export default deepFreeze({
  id: 'willowmurk', name: 'Willowmurk', region: 'gloomfen', biome: 'willow-village', music: 'town',
  backdrop: 'willowmurk', zone: null, level: 15, travel: true, dark: false,
  lore: [[410, 620, 15, 12]],
  w: 30, h: 26,
  rows: [
    'TTTT~~TTTTTTTT~~TTTTTTTTT~~TTT', //  0
    'T"."~~~~~~~~~~~~~~~~~~~~~~~~~T', //  1
    'T...~~~~~~~"".".""..~~~~~~~~~T', //  2
    't.t"~~~~~~",TTT.HHH..~.."."~~T', //  3
    'T...~~~~~~"rrrrr#+#.."HHHH."~T', //  4
    'tT."~~~~~~T.........".#+##..~T', //  5
    't...~~HHH~~T"..".."T~t....."~T', //  6
    'T...~.#+#.~~~*b~~~~~~,,...."~T', //  7
    'T...~"....~~~."."...~t,.,,t"~T', //  8
    'tt..~~..t~~~T.:::..T.~.."..~~T', //  9
    't..T~~~b~~~~.:::::.."~~b~~~T~T', // 10
    'T....~"."~~~":::::.."~~b~~.,"T', // 11
    'T.."="..,*~~*.:::...*~~b~*..,T', // 12
    '==========bb=========bbbb=====', // 13
    '==========bb=========bbbb=====', // 14
    't==~.~"".~~~~".=....~~~~~*,..t', // 15
    'T==~~~~~~~~~~~~b*~~~~~~~~~.T.T', // 16
    'T==~~~~~~"".""""""""T~~~~~~~~T', // 17
    'T==~~~~~~HHH..,..HHH,.~~~~~~~T', // 18
    'T===.~~~"#+#.....#+#."~~~~~~~T', // 19
    'T===r~~~"............T~~~~~~~T', // 20
    'T...r~~~T..t...,...t.,~~~~~~~T', // 21
    'T...r~~~".T..t......."~~~~~~~T', // 22
    'tr.r.~~~~."",,"."....~~~~~~~~T', // 23
    'T""..~~~~~~~~~~~~~~~~~~~~~~~~T', // 24
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 25
  ],
  entities: [
    { id: 'wm-sign', kind: 'sign', at: [28, 11], look: 'post', text: 'WILLOWMURK. The wards keep what the willows would take. Walk the planks, and speak soft.' },
    { id: 'willow-hearth', kind: 'hearthfire', at: [15, 10], stand: [15, 11, 'n'] },
    { id: 'moss', kind: 'npc', npc: 'moss', at: [13, 4], face: 's' },
    { id: 'sedge', kind: 'npc', npc: 'sedge', at: [24, 6], face: 's' },
    { id: 'wm-villager', kind: 'npc', npc: 'wm-villager', at: [14, 20], face: 'w' },
    // the ring of ward-stones round the village, three of them dark
    ward('wm-stone-nw', [11, 2]), ward('wm-stone-n', [19, 2]), ward('wm-stone-ne', [27, 5]),
    ward('wm-stone-e1', [26, 11]), ward('wm-stone-e2', [26, 16]), ward('wm-stone-se', [21, 21]),
    ward('wm-stone-s', [13, 23]),
    ...failing('wm-stone-sw', [8, 19]), ...failing('wm-stone-gate-n', [4, 11]), ...failing('wm-stone-gate-s', [4, 15]),
    // M4.5 road gate (spec A3, §2.2): the broken ward-gate in the pass through the ward-line, the wights beside it
    { id: 'wm-ward-gate', kind: 'gate', area: [4, 13, 4, 14], look: 'ward-gate', open: { beaten: 'wm-wights' }, guard: 'wm-wights', text: 'The ward-gate: wicker and bone between two dark stones, broken outward. Willow-roots have grown through it, and some of the roots are moving.' },
    { id: 'wm-wights', kind: 'encounter', enc: 'wm-wights', mode: 'block', at: [4, 12], face: 'e' },
    // the side road out past the wards to Grandfather Willow (the lead: GLOOM_LEADS.willow)
    { id: 'wm-witch-ward', kind: 'lock', lock: 'witch-ward', area: [1, 17, 2, 17] },
    { id: 'wm-willow', kind: 'encounter', enc: 'wm-willow', mode: 'lair', at: [2, 22], area: [1, 21, 3, 22], face: 'n' },
    { id: 'wm-willow-hoard', kind: 'chest', at: [2, 23], loot: { gold: 120, gems: { 'bog-amber': 1 }, materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'wm-e', area: [29, 13, 29, 14], to: 'murkway', anchor: 'from-willowmurk' },
    { id: 'wm-w', area: [0, 13, 0, 14], to: 'rotbridge', anchor: 'from-willowmurk' },
  ],
  anchors: { 'from-murkway': [28, 13, 'w'], 'from-rotbridge': [1, 13, 'e'] },
  roads: [{ from: 'from-murkway', to: 'wm-w', gates: ['wm-ward-gate'] }, { from: 'from-rotbridge', to: 'wm-willow', gates: [] }],
  roam: null,
});
