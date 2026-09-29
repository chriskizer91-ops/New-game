// Hearthstone Keep (M3 spec §2.1, §2.3, A2). The Keep stands on an island in the central lake: a
// curtain wall rings the flagstone yard, with the lake lapping at it on every side. The north gate
// (torches on both towers) opens onto the causeway to the Hearth Road; the Great Hall's facade runs
// along the top, so you walk round it to reach the gate. Three posterns open onto piers and causeway
// ends on the island's edge, each with a gate guard: east (Ironspire) and south-west (Gloomfen) stay
// sealed; south-east is the way into the Sunscorch, gated on act1-complete (M4 spec §2.4). The yard: the old well (NW), the barred armory (NE), the refugee
// tents along the west wall with the Keep's forge among them (Hilda works it after the second Brand),
// the courtyard tree and its flower bed, Marta's stall (E), and the barracks (SE).
// M4.5 (docs/M45-SPEC.md §4): the road from the Great Hall's door to the causeway runs through the
// north gate, which waits on the vault fight in the Great Hall.
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep', name: 'Hearthstone Keep', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: true, dark: false,
  lore: [[540, 390, 15, 12]],
  w: 30, h: 24,
  rows: [
    '~~~~~~~~~~~~oobbboo~~~~~~~~~~~', //  0
    '~############*:::*###########~', //  1
    '~#::::::::::::::::::::::::::#~', //  2
    '~#:ooo::HHHHHHHHHHHHHHH::::T#~', //  3
    '~#:o~o::HHH###*+*###HHH::####~', //  4
    '~#:ooo::HHH:::::::::HHH::#__#~', //  5
    '~#.:::::#*#:::::::::#*#::+__#~', //  6
    '~#..:::::::::::::::::::::#__#~', //  7
    '~#T.:::::::::::::::::::::####~', //  8
    '~#.......:::::::::::::::::::#~', //  9
    '~#HH..,..:::::,,,:::::::::::#~', // 10
    '~#HH.....::::,,T,,::::::::::+b', // 11
    '~#HH.....:::::,,,::HHH::::::+b', // 12
    '~#HH.,...::::::::::###::::::#~', // 13
    '~#......#*#:::::::::::::::::#~', // 14
    '~#.......:::::::::::::::HHHH#~', // 15
    '~#HHH....:::::::::::::::HHHH#~', // 16
    '~#HHH.,..:::::::::::::::#####~', // 17
    '~#.......:::HHHHHHH::::::...#~', // 18
    '~#..,....:::HHHHHHH:::::.,..#~', // 19
    '~#T......:::#######:::::..,T#~', // 20
    '~#####++##############++#####~', // 21
    '~oo~~~bb~~~~~~~~~~~~~~bb~~~oo~', // 22
    '~~~~~~bb~~~~~~~~~~~~~~bb~~~~~~', // 23
  ],
  entities: [
    { id: 'keep-n-gate', kind: 'gate', area: [14, 1, 16, 1], look: 'gate', open: { done: 'keep-vault' }, text: 'Guard: "Not with the Seal still missing, Warden. Captain\'s orders."' },
    { id: 'marta', kind: 'npc', npc: 'marta', at: [20, 14], face: 's' },
    { id: 'refugee-1', kind: 'npc', npc: 'refugee', at: [8, 12], face: 'e' },
    { id: 'refugee-2', kind: 'npc', npc: 'refugee', at: [11, 17], face: 'w' },
    { id: 'hilda', kind: 'npc', npc: 'hilda', at: [9, 15], face: 's', if: { brands: 2 } },
    { id: 'gate-guard-e', kind: 'npc', npc: 'gate-guard-e', at: [27, 10], face: 's' },
    { id: 'gate-guard-se', kind: 'npc', npc: 'gate-guard-se', at: [21, 20], face: 's' },
    { id: 'gate-guard-sw', kind: 'npc', npc: 'gate-guard-sw', at: [8, 20], face: 's' },
    { id: 'keep-armory-bar', kind: 'lock', lock: 'barred-gate', at: [25, 6] },
    { id: 'keep-armory', kind: 'chest', at: [27, 6], loot: { items: [{ rarity: 'tempered', slot: 'head' }] } },
  ],
  exits: [
    { id: 'keep-hall-door', area: [15, 4, 15, 4], to: 'keep-hall', anchor: 'from-court' },
    { id: 'keep-n', area: [14, 0, 16, 0], to: 'hearth-road', anchor: 'from-keep' },
    { id: 'keep-e', area: [29, 11, 29, 12], sealed: { region: 'ironspire', text: 'Rockslide on the pass. Stormwatch hasn\'t sent a writ since spring.' } },
    // M4: the way into the Sunscorch, once Act I is done (spec §2.4)
    { id: 'keep-se', area: [22, 23, 23, 23], to: 'sun-road', anchor: 'from-keep', gate: { flag: 'act1-complete' }, sealed: { region: 'sunscorch', text: 'The Sandspire caravans stopped a month ago, and the dune-glass walls are still too hot to cross.', hint: 'The gate opens once both Brands of the Wilds are yours.' } },
    { id: 'keep-sw', area: [6, 23, 7, 23], sealed: { region: 'gloomfen', text: 'Blackwater\'s up over the causeway. Nobody\'s ferrying.' } },
  ],
  anchors: { 'from-hall': [15, 6, 's'], 'from-road': [15, 2, 's'], 'from-sun-road': [22, 22, 'n'] },
  roads: [{ from: 'from-hall', to: 'keep-n', gates: ['keep-n-gate'] }],
  roam: null,
});
