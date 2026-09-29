// The Tidal Flats (M6 spec §2.1, §2.3), where the Blackwater comes out over mud and tide-pools into the Aethersea (N and
// W). The track comes in from the Reach (E) through the Tallymen's barge-camp: barges hauled up on the mud, tents,
// crates, and the camp's beacon, the Flats Beacon (25,12). The camp's stockade faces the sea, and the great chain runs
// out through its west gate at the chain-post (15,13-14), where the Bargemaster stands (15,12), and on along a spit of
// sand and wreck-ribs into the deep, to the Leviathan chained at its end (1-3,13-14). South-east of the camp a
// stretch of soft mud runs out to a wreck with its hold still shut (35,22); beyond lies the salt-marsh.
// Layout notes: the stockade and the sea hold the chain-post's gate (the Bargemaster beside it; a Brand's re-armed
// rematch stands beside an open road). The soft mud is a bog stretch, the only way to the wreck.
// Tiles (mudflat): '.' firm sand and mud, ',' shells and wrack, 'm' soft mud (the bog lock lies on it), '"' salt-marsh
// grass, 'w' tide-pools (and the Leviathan's deep water at the spit's end), '~' the channel and the sea, 'r' the great
// chain, '=' the camp's track, '_' barge decks, 'o' wreck ribs and rocks, 't' crates and coils of chain, '#' barge
// hulls, 'H' their cabins and the tents, '|' the stockade.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'tidal-flats', name: 'The Tidal Flats', region: 'gloomfen', biome: 'mudflat', music: 'fen',
  backdrop: 'tidal-flats', zone: 'tidal-flats', level: 18, travel: true, dark: false,
  lore: [[172, 742, 38, 13], [124, 754, 25, 13], [92, 760, 3, 13]],
  w: 40, h: 30,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  0
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  1
    '~~~~~~~~~~~~~~~~~~~~~~~~~~o~~~~~~~~~~~~~', //  2
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  3
    '~~~~~~~~o~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  4
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~', //  5
    '~~~~~~~~~~~~~~~|...w.,,,..~~~~~~~~"....o', //  6
    '~~~o~~~~~~~~~~~|t,www.m....,.........,.~', //  7
    '~~~~~~~~~~~~~~~|..HHHHH..,..HH.HH"m"...~', //  8
    '~~~~~~~~~~~~~~~|..#####t...,##.##....m.o', //  9
    '~~~~~~~~~~~~~~~|."_____.....m,.wwwww...~', // 10
    '~~~~~~~~~~~~~~~|.t.......,mt,...".,.,".~', // 11
    '~www..o.....o..........."."......m.t,..~', // 12
    '~wwwrrrrrrrrrrrr========================', // 13
    '~www.....o......========================', // 14
    '~www~~~~~~~~~~~|......"...........t..,"~', // 15
    '~~~~~~~~~~~~~~~|"t_____,t...,_____.....~', // 16
    '~~~~~~~~~~~~~~~|"mHHHHH......HHHH#,,ww.~', // 17
    '~~~~~~~~~~~~~~~|..#####..,,".#####.www.~', // 18
    '~~~~~~~~~~~~~~~|......".,..........ww..~', // 19
    '~~~~~~~~~~o~~~~|t.m.......~~~~~~~~~~~..~', // 20
    '~~~~~~~~~~~~~~~|...m..www..mmmmmmmm.~,.~', // 21
    '~~~~~~~~~~~~~~~..m...,.w...mmmmmmmm.~..~', // 22
    '~~~~~o~~~~~~~~~...~~~~~....mmmmmmmm.~..~', // 23
    '~~~~~~~~~~~~~~~~~~~~~~~~""~~~~~~~~~~~..~', // 24
    '~~~~~~~~~~~~~~~~~~~~~~~~~..............~', // 25
    '~~~~~~~~~~~~~~~~~~~~~~~~~.,,...ww....w.o', // 26
    '~~~~~~~~~~~~~~~~~~o~~~~~~....wwwww.,wwwo', // 27
    '~~~~~~~~~~~~~~~~~~~~~~~~~.....w,....,w.o', // 28
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~o~~~~~~o~~~', // 29
  ],
  entities: [
    { id: 'flats-beacon', kind: 'hearthfire', at: [25, 12], stand: [25, 13, 'n'] },
    { id: 'tf-wreck-1', kind: 'prop', prop: 'wreck', at: [37, 19], solid: true },
    { id: 'tf-wreck-2', kind: 'prop', prop: 'wreck', at: [22, 6], solid: true },
    { id: 'tf-post-plaque', kind: 'sign', at: [16, 15], look: 'plaque', text: 'Stamped into the chain-post: HAULAGE BY THE COMPANY. DO NOT FEED THE ENGINE.' },
    // M4.5 road gate (spec A3, §2.2): the chain-post at the stockade's west gate, the Bargemaster beside it
    { id: 'tf-chain-post', kind: 'gate', area: [15, 13, 15, 14], look: 'chain', open: { beaten: 'tf-bargemaster' }, guard: 'tf-bargemaster', text: 'The great chain runs out through the stockade\'s west gate, and the gate is shut across it. Out along the spit the chain goes taut, and slack, and taut, like something breathing.' },
    { id: 'tf-bargemaster', kind: 'encounter', enc: 'tf-bargemaster', mode: 'block', at: [15, 12], face: 'e' },
    { id: 'blackwater-leviathan', kind: 'encounter', enc: 'blackwater-leviathan', mode: 'lair', at: [2, 14], area: [1, 13, 3, 14], face: 'e' },
    { id: 'tf-soft-mud', kind: 'lock', lock: 'bog', area: [27, 21, 34, 23] },
    { id: 'tf-wreck-hold', kind: 'chest', at: [35, 22], loot: { gold: 140, gems: { 'bog-amber': 1 }, materials: { scrap: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'tf-e', area: [39, 13, 39, 14], to: 'blackwater-reach', anchor: 'from-flats' },
  ],
  anchors: { 'from-reach': [38, 13, 'w'] },
  roads: [{ from: 'from-reach', to: 'blackwater-leviathan', gates: ['tf-chain-post'] }],
  roam: { max: 3, rects: [[16, 19, 26, 24], [25, 25, 39, 29], [33, 5, 39, 12]] },
});
