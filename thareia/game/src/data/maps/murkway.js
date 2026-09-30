// The Murkway (M6 spec §2.1, §2.3; painted from the player's pictures art-in/batch-3/map-murkway-a.png and -b.png, side
// by side and blended over x 21-24): Willowmurk's safe paths, from the foot of Mossfall's cliffs south and east through
// reed-beds, black pools and tussock to Willowmurk. A grey cliff runs along the top with two stone stairs down it. The
// western one is the fen stair from Mossfall (11-12,0-3). Below it the path runs between two patches of sucking bog
// (east of its first bridge, then west of it), over three plank bridges to the stepping-stones of the Leech Water,
// where the leeches have the ford (10-11,17) and lie in its third lane (12,17). South of the water it crosses a fourth
// bridge and the long boardwalk, climbs through the reeds where the two halves meet (20-24,25-28) and crosses a bridge
// to the fork (29-33,25-26), where the path from the eastern stair comes down: an older stair, whose top fell with the
// cliff (30-31,0-1, cliff now; a painted sign on its highest step). Past a last bridge the Reed Shrine stands on its
// hummock between the standing stones (39,25); then the Tallymen's chain crosses the cut through the reeds (41-42,30)
// with the reedcutters in it beside the chain (43,30), past a ward-stone, and the path leaves at the south-east corner.
// South of the long boardwalk lies the Sucking Mire, the big peat, and the pedlar's cart went down past it (16,34).
// Layout notes: both road guards stand beside their gates, so a Brand's re-armed rematch stands beside an open road.
// The bog is soft (3% of max HP a step without a key); water, scrub and stones close each gate from side to side, so
// the bog is never a way round one. Reed-beds and islets the paths cannot reach are solid.
// Traced from the painting (one tile is 42.7 of its px; `overTiles: false`). Tiles (fen): '=' the safe path, 'b' the
// plank bridges and the long boardwalk, 'w' the ford's stepping-stones, 's' the stairs, '.' tussock grass, ',' marsh
// flowers, '"' reeds, 'm' bare peat (the bog locks lie on it), '~' black water, 'T' willows and dead trees, 't' bushes,
// scrub and reed-beds in the water, 'o' stones, stumps and logs, '^' the cliffs.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'murkway', name: 'The Murkway', region: 'gloomfen', biome: 'fen', music: 'fen',
  backdrop: 'murkway', zone: 'murkway', level: 15, travel: true, dark: false, overTiles: false,
  lore: [[210, 290, 20, 3], [288, 487, 26, 13], [405, 605, 39, 34]],
  w: 45, h: 36,
  rows: [
    '^^^^^^^^^^^ss^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^ss^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  1
    '^ttt^^^^^ttss^^^^t^"""^^TTT^^^ss^^^^^^^^^^^^^', //  2
    'ttttotoottosstt^ot."""ttTTTtooss..too^^tttttt', //  3
    't~ooo~~....==......"""~~~T~t..=="""ooootttttt', //  4
    '~~~~~~~""".==".....~~~~~~~~~""==."~~~~~~tttt~', //  5
    '~"~~~""~~~"bbmmmmm.~~~~~~~~~""bb.."~~~~~tttt~', //  6
    't....""""~"bbmmm~~~~~~~~~~~~"""bbo"oo~~~~~~~~', //  7
    't...TTT"",,==.,~~~~~~~~~~~~~""."===tt~~~~~~~~', //  8
    'tm.TTTTTT,,==,,""""~~~~~~~~~~~~".==tt~~~~~o~~', //  9
    'tm.TTTTTT..==..""""~~~~~Tttttt~".=bbt~~~~~o~~', // 10
    't"~oooTTTmm"bbb"~o~~~~~~Tttttt~~"""bb~~~~~o~~', // 11
    't""ooooo"mm."bb..~~TTTT~ttttt~~~~...===o""~~~', // 12
    't"~ooooo"""""==..~oTTTT~ttooo~~~~..."===""~~~', // 13
    '~~~~~~~~~~""==.....TTTT~~~~~~~~~~....=bbo"~~~', // 14
    '~~~~~~~~~oobb."""....TT""~~~~~""".mmm.bb"""oo', // 15
    '~~~o~~~~~~wwwo"""~...."""~~~~"""~~~~~obb"""oo', // 16
    '~ttTTTTTT"www~"""~oo...""~~Tttt""~~~~"==""""o', // 17
    '~ttTTTTTT"www~~~~~~~m...~~~Tttt""~~~bb=""""~~', // 18
    '~ttTTTTTT"www"""""~~""""~~~Tttt=====bb"""""~~', // 19
    '~~~TTo.....=="""~~~~~~~~TTT~tto===="~~~~~~~~~', // 20
    '~~~~~~.mmm"=="""""~~TTT~~~~~~~~===="~tttoo~~~', // 21
    '~~T~~~~""mm"=bb"""~~TTT~~~~~~~~bbb"~~~~TT~~~~', // 22
    '~~T~~~~""mmmmbb"""~~TTT~~~~~~~~bb"~~~~~TT~~~~', // 23
    '~TTT~~~~~mmm"bb=""""ttttt~~"""====~~~~oTTo~~~', // 24
    '~TTT~~~~~mmm""=="""""====bbbb=====~~~~,..,~~~', // 25
    '~~~~~~~~~~mm""==""""~....bbbb=t==bbb~~,,,oo~~', // 26
    '~~~~~~~TTo~""""bbb,,.....~~~~mmm"bbbbb,,oo~~~', // 27
    '~~~~~~~TTT~~~""bbbbbb==.o~~~~mmm"~~bb=====~~~', // 28
    '~~~~~~~TTT~~~~~,,,,,,.~~~~~~~~""~~~""======"~', // 29
    '~~~~~~~TTT~~~~~""",,,TTTT~~~~~TTTTT""mmmo=="t', // 30
    '~~~TTTT~~~~mmmm"""mmmTTTT~~~~~TTTTTt~mmmtt==t', // 31
    'TTTTTTT~~~~mmmmmmmmmmTTTT~~~~~TTTTT~~~~~oo===', // 32
    'TTTTTTT~~~~mmmmmmmmmmTTTT~~~~~TTTTT~~~~~"""==', // 33
    'TTTTTTTt~~"""mmmmmmmmTTtt~~~~~TTTTT~~~~~""""t', // 34
    'TTTTTTT~~~~~tttttttttTTTT~~~~~TTTTT~~~~~ttttt', // 35
  ],
  entities: [
    { id: 'mk-sign', kind: 'sign', at: [13, 5], look: 'post', text: 'Willowmurk. Keep to the path. The path keeps to you.' },
    { id: 'mk-bog-west', kind: 'lock', lock: 'bog', area: [9, 11, 10, 12] },
    { id: 'mk-bog-east', kind: 'lock', lock: 'bog', area: [13, 6, 15, 7] },
    { id: 'mk-mire', kind: 'lock', lock: 'bog', area: [11, 31, 20, 33] },
    { id: 'mk-pedlar-cart', kind: 'chest', at: [16, 34], loot: { gold: 110, gems: { 'bog-amber': 1 }, materials: { silver: 1 } } },
    { id: 'mk-boundary', kind: 'sign', at: [11, 14], look: 'stone', text: 'An old boundary stone, half sunk. One face says MOSSFALL. The other has been scratched out, and smaller, newer letters cut under it: KEEP TO THE PATH.' },
    // M4.5 road gate (spec A3, §2.2): the leeches have the ford of the safe path, and lie in its third lane
    { id: 'mk-leech-ford', kind: 'gate', area: [10, 17, 11, 17], look: 'leech-ford', open: { beaten: 'mk-leeches' }, guard: 'mk-leeches', text: 'The ford is black and moving. The Leech Water has earned its name.' },
    { id: 'mk-leeches', kind: 'encounter', enc: 'mk-leeches', mode: 'block', at: [12, 17], face: 'n' },
    { id: 'mk-wreck', kind: 'prop', prop: 'wreck', at: [7, 4] },
    // the eastern stair is in the painting: the entity only lets you read it (its top two steps are cliff now)
    { id: 'mk-old-stair', kind: 'sign', at: [30, 2], look: 'painted', name: 'The old stair', text: 'An older stair than the fen stair climbs this cliff, but its top fell with the rock long ago, and the steps now stop halfway up.' },
    { id: 'reed-shrine', kind: 'hearthfire', at: [39, 25], stand: [39, 26, 'n'] },
    { id: 'mk-bog-shrine', kind: 'lock', lock: 'bog', area: [29, 27, 31, 28] },
    { id: 'mk-bogfolk', kind: 'encounter', enc: 'mk-bogfolk', mode: 'pack', at: [7, 20], face: 's' },
    { id: 'mk-bog-camp', kind: 'lock', lock: 'bog', area: [37, 30, 39, 31] },
    { id: 'mk-tally-post', kind: 'sign', at: [36, 29], look: 'post', text: 'A tally-post, notched to the top. CUT REEDS, SIXTY BUNDLES. THE WAY THROUGH IS THE COMPANY\'S. TOLL BY THE HEAD.' },
    // M4.5 road gate: the Tallymen's chain across the cut through the reeds, the reedcutters in the cut beside it
    { id: 'mk-reed-chain', kind: 'gate', area: [41, 30, 42, 30], look: 'chain', open: { beaten: 'mk-reedcutters' }, guard: 'mk-reedcutters', text: 'A chain across the cut, hung with a tally-board: THE COMPANY\'S WAY. The reedcutters lean on their hooks beside it and watch you come.' },
    { id: 'mk-reedcutters', kind: 'encounter', enc: 'mk-reedcutters', mode: 'block', at: [43, 30], face: 'n' },
    { id: 'mk-lights-1', kind: 'prop', prop: 'marsh-lights', at: [7, 22] },
    { id: 'mk-lights-2', kind: 'prop', prop: 'marsh-lights', at: [23, 28] },
    { id: 'mk-bog-south', kind: 'lock', lock: 'bog', area: [9, 22, 11, 25] },
    { id: 'mk-bog-end', kind: 'lock', lock: 'bog', area: [34, 15, 36, 15] },
    { id: 'mk-ward-stone', kind: 'sign', at: [42, 33], look: 'ward-stone', text: 'A ward-stone, hung with reed charms. It hums as you pass, as if it were counting you.' },
  ],
  exits: [
    { id: 'mk-n', area: [11, 0, 12, 0], to: 'mossfall', anchor: 'from-murkway' },
    { id: 'mk-s', area: [44, 32, 44, 33], to: 'willowmurk', anchor: 'from-murkway' },
  ],
  anchors: { 'from-mossfall': [12, 4, 's'], 'from-willowmurk': [43, 32, 'w'] },
  roads: [{ from: 'from-mossfall', to: 'mk-s', gates: ['mk-leech-ford', 'mk-reed-chain'] }],
  roam: { max: 3, rects: [[5, 19, 17, 24], [31, 12, 43, 19], [13, 24, 24, 30]] },
});
