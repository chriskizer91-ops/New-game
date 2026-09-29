// The Murkway (M6 spec §2.1, §2.3): Willowmurk's safe paths, from the foot of the fen stair below Mossfall's cliffs
// (N) south-east through reed-beds, black pools and tussock to Willowmurk's east gate (SE). The path is the road,
// and the bog lies either side of it. At the stair's foot it runs between two strips of bog, the Sucking Mire off to
// the west, where a pedlar's cart went down with its load (1,6). Then it fords the Leech Water, the slow channel that
// crosses the whole fen: the leeches have the ford (19-20,10) and lie in its third lane (21,10). South of the water
// the Reed Shrine stands on its hummock of flowers (25,13), a lamp in its bound reeds; the side pool where the
// boglurchers wallow lies west. Then the Black Mere crosses the fen, but for a neck of reeds the Tallymen are cutting
// a way through: their tent and cut bundles stand at its head, a chain across the cut (30-32,24) and the reedcutters
// in it beside the chain (33,24). The last stretch runs past a ward-stone to Willowmurk.
// Layout notes: both road guards stand in their pass beside their gates, so a Brand's re-armed rematch stands beside
// an open road. The bog is soft (3% of max HP a step without a key); the channel and the mere are water from edge to
// edge, so the bog is never a way round a gate.
// Tiles (fen, M3's): '.' marsh grass, ',' marsh flowers, '"' reeds, '=' the safe path, ':' the stair's landing,
// 'm' bog mud (the bog locks lie on it), '~' black water, 'w' the ford, 'T' willows, 't' bramble, 'o' stones,
// '^' Mossfall's cliffs, 's' the fen stair, 'H' the Tallymen's tent.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'murkway', name: 'The Murkway', region: 'gloomfen', biome: 'fen', music: 'fen',
  backdrop: 'murkway', zone: 'murkway', level: 15, travel: true, dark: false,
  lore: [[210, 290, 20, 3], [288, 487, 25, 14], [405, 605, 38, 38]],
  w: 44, h: 40,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^ss^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^^^^^^^^^ss^^^^^^^^^^^^^^^^^^^^^^', //  1
    '^^^^^^^^^^^^^^^^^^^^ss^^^^^^^^^^^^^^^^^^^^^^', //  2
    'to~T~~o.."T.o.T....::::."""T."............TT', //  3
    '~~~~~~~".,.....tmmm.==.mmm..".""....T."""".T', //  4
    'T""mmmmmmmmmm.T.mmm.==.mmmt.""~~~~~,..~~~~.t', //  5
    't".mmmmmmmmmm.."mmm.==.mmm""~~~~~~~"."~~~~"T', //  6
    'T".mmmmmmmmmmT..mmm.==.mmm.T~~~~~."""...""TT', //  7
    '~~~~~~~~~"....."mmm.==.""""~~~~~~~~~~."."".t', //  8
    't~~~~~~..""..".~~~~www~~~~~~~~~~~~~~~~~.~.~~', //  9
    '~~~~~~~~~~~~~~~~~~~www~~~~~~~~~~~~~~~~~~~~~~', // 10
    '~~~~~~"~~~~~~~~~~~~www~~~"~~~~~~~~~~~~~~~~~~', // 11
    't.~~..""~~~~~~~T..."=="",,,,~~".~T~~~~~~~~~~', // 12
    'T.T~~...""..".".....==.,,,,.,"."".o~~~~~~~TT', // 13
    'T..~~~.."""......T..======."......"~~~~~~~~t', // 14
    't..""~"~~".".t".....==========.....t""~~~~"T', // 15
    'T."."~~~~~~~"......mmmmm=========.....,""..T', // 16
    'T."..~~~~~~~....,."mmmmm....=====......."""t', // 17
    't...~~~~~~~~~"..."...,...".mmm.==.t..t..~~~T', // 18
    'T...".~~~~~~~"...t.........mmm.==..HH...~~~T', // 19
    'T....o"".."~~~"."...,..T...mmm.==..HH.t."".t', // 20
    't.T....."..~~~~.T".,~..".."mmm.==..".t~T~~~~', // 21
    '~."".."""."..".".~~~~~""".~~~~"=="~~~~~~~~~~', // 22
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"=="~~~~~~~~~~', // 23
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"=="~~~~~~~~~~', // 24
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"=="~~~~~~~~~~', // 25
    '~~~~.~~~""""...~".~~.".~~~~~~~"=="~~~~~~~~~~', // 26
    '~~"".."".....T...."...."...."".==..."""~~~~~', // 27
    'T"T,..",t....,.......T....mmmm.==.".t..""~~T', // 28
    'T..""...""..""...,t.""....mmmm.=====...."~~t', // 29
    't"".~~~~~~~~~~.T..".......mmmm.=====.....~~T', // 30
    'T....~~~~~~~~~~........T..mmmm.,..==.....~~T', // 31
    'T.....~~~~~~~~..."""."..".".......=====.mmmt', // 32
    't....,".""..".,..~~~~~~~~"........====="mmmT', // 33
    'T....,t,......,..~~~~~~~...,.".".....==.mmmT', // 34
    'T................o...."..t.."....T.".==.mmmt', // 35
    't...T""....t"."""...,,"....."T...,...===mmmT', // 36
    'T.........."~~~~~,.,....T.....".o."...==mmmT', // 37
    'T"............~"".".............""....==t."t', // 38
    'tTTtTTtTTtTTtTTtTTtTTtTTtTTtTTtTTtTTtT==TTtT', // 39
  ],
  entities: [
    { id: 'mk-sign', kind: 'sign', at: [23, 3], look: 'post', text: 'Willowmurk. Keep to the path. The path keeps to you.' },
    { id: 'mk-bog-west', kind: 'lock', lock: 'bog', area: [16, 4, 18, 8] },
    { id: 'mk-bog-east', kind: 'lock', lock: 'bog', area: [23, 4, 25, 7] },
    { id: 'mk-mire', kind: 'lock', lock: 'bog', area: [3, 5, 12, 7] },
    { id: 'mk-pedlar-cart', kind: 'chest', at: [1, 6], loot: { gold: 110, gems: { 'bog-amber': 1 }, materials: { silver: 1 } } },
    { id: 'mk-boundary', kind: 'sign', at: [22, 8], look: 'stone', text: 'An old boundary stone, half sunk. One face says MOSSFALL. The other has been scratched out, and smaller, newer letters cut under it: KEEP TO THE PATH.' },
    // M4.5 road gate (spec A3, §2.2): the leeches have the ford of the safe path, and lie in its third lane
    { id: 'mk-leech-ford', kind: 'gate', area: [19, 10, 20, 10], look: 'leech-ford', open: { beaten: 'mk-leeches' }, guard: 'mk-leeches', text: 'The ford is black and moving. The Leech Water has earned its name.' },
    { id: 'mk-leeches', kind: 'encounter', enc: 'mk-leeches', mode: 'block', at: [21, 10], face: 'n' },
    { id: 'mk-wreck', kind: 'prop', prop: 'wreck', at: [37, 8] },
    { id: 'reed-shrine', kind: 'hearthfire', at: [25, 13], stand: [25, 14, 'n'] },
    { id: 'mk-bog-shrine', kind: 'lock', lock: 'bog', area: [19, 16, 23, 17] },
    { id: 'mk-bogfolk', kind: 'encounter', enc: 'mk-bogfolk', mode: 'pack', at: [9, 14], face: 's' },
    { id: 'mk-bog-camp', kind: 'lock', lock: 'bog', area: [27, 18, 29, 21] },
    { id: 'mk-tally-post', kind: 'sign', at: [33, 21], look: 'post', text: 'A tally-post, notched to the top. CUT REEDS, SIXTY BUNDLES. THE WAY THROUGH IS THE COMPANY\'S. TOLL BY THE HEAD.' },
    // M4.5 road gate: the Tallymen's chain across the cut through the reeds, the reedcutters in the cut beside it
    { id: 'mk-reed-chain', kind: 'gate', area: [30, 24, 32, 24], look: 'chain', open: { beaten: 'mk-reedcutters' }, guard: 'mk-reedcutters', text: 'A chain across the cut, hung with a tally-board: THE COMPANY\'S WAY. The reedcutters lean on their hooks beside it and watch you come.' },
    { id: 'mk-reedcutters', kind: 'encounter', enc: 'mk-reedcutters', mode: 'block', at: [33, 24], face: 'n' },
    { id: 'mk-lights-1', kind: 'prop', prop: 'marsh-lights', at: [9, 22] },
    { id: 'mk-lights-2', kind: 'prop', prop: 'marsh-lights', at: [16, 26] },
    { id: 'mk-bog-south', kind: 'lock', lock: 'bog', area: [26, 28, 29, 31] },
    { id: 'mk-bog-end', kind: 'lock', lock: 'bog', area: [40, 32, 42, 37] },
    { id: 'mk-ward-stone', kind: 'sign', at: [37, 37], look: 'ward-stone', text: 'A ward-stone, hung with reed charms. It hums as you pass, as if it were counting you.' },
  ],
  exits: [
    { id: 'mk-n', area: [20, 0, 21, 0], to: 'mossfall', anchor: 'from-murkway' },
    { id: 'mk-s', area: [38, 39, 39, 39], to: 'willowmurk', anchor: 'from-murkway' },
  ],
  anchors: { 'from-mossfall': [20, 2, 's'], 'from-willowmurk': [38, 38, 'n'] },
  roads: [{ from: 'from-mossfall', to: 'mk-s', gates: ['mk-leech-ford', 'mk-reed-chain'] }],
  roam: { max: 3, rects: [[1, 12, 18, 21], [33, 12, 42, 17], [1, 27, 25, 38]] },
});
