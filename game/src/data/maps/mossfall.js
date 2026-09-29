// Mossfall (M3 spec §2.1, §2.3). A mossy marsh west of Thornhollow, crossed by a raised causeway from
// the Thornhollow gate (E) to the door of Mosswatch Tower (W). North of the causeway: the smugglers'
// dry ground with their tarp and crates, the cold Mossfall Cairn on its stone hillock, and a bramble
// thicket hiding a cache in the north-east corner. South of it: reed pools with a boardwalk out to a
// reedbed (the hidden reed cache), the Sucking Bog, and the Mire Shrine: a drowned ruin on an islet in
// its lagoon, reached only by the ford. The south edge is the Gloomfen border, where the land drops
// away in cliffs and the fen stair goes down into the fog (sealed).
// Layout notes: the cairn's fire-bowl sits at (30,7), next to its stand (30,8) (spec (30,6), moved 1).
// M4.5 (docs/M45-SPEC.md §4): the smugglers have chained the head of the ford (41,13), the only way out
// to the shrine's islet, and stand beside their chain (42,13).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mossfall', name: 'Mossfall', region: 'verdant', biome: 'fen', music: 'wilds',
  backdrop: 'mossfall', zone: 'mossfall', level: 4, travel: true, dark: false,
  lore: [[298, 262, 51, 10], [150, 280, 0, 10]],
  w: 52, h: 22,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', //  0
    'TTtttt."..."......,...,."."..."..,......"""ttttt...T', //  1
    'Tt###......"...".........."..........,.....tt.tt...T', //  2
    'T#####t..T......T...""T..."..."...T...".T".t...t...T', //  3
    'T#####......o."..HH....."".,.....,.,..............,T', //  4
    'T#####t.",.T.....HH..."..,,.,ooo,."".T.."..""."."..T', //  5
    'T#####....."""..,."o"....T...ooo....,"".........T."T', //  6
    'T##*##......."..o...".........:.......""..T..".....T', //  7
    'T##+##...".....,.""...,...,...:...,.,.......,,....,T', //  8
    'T..==============.........,.=============..."....."T', //  9
    'T..=================================================', // 10
    'T..."........b...==========="."....."....===========', // 11
    'T".T...T,.,..b......mmmmmmmmm.."...."".."".."".""".t', // 12
    'T......~~~~~~b~...mmwwmmmmmmmmm..".............~~~.T', // 13
    'TT....~~~~~~~b~~~.mmmmmmmmm~mmm......~~~~w~~~~~~~~~T', // 14
    'T....~~~~~~~~b~~~mmmmmmmmmmmmmmm.."..~".,.".".~~~~~T', // 15
    'T..".~~~~~~~~b~~~.mmm~~mmmmmm~~..."..~.#::#::.~~~~TT', // 16
    'T..."~~~""""bb~~..mmmmmmmwwmmmm".....~.#:~:::#~~~T~T', // 17
    'T...."~~"..""~~...".mmmmmmmmm..."..".~.:::::":~T~~~T', // 18
    'T..""...~~~~~.."~~........"~~...."...~".#~:##.~~T~~T', // 19
    'T...T,.~~~~~~,.~~~^^ss^^~~~~...".."..~~~~~~~~~~~~T~T', // 20
    'TTTTTTTTTTTTTTTTTT^^ss^^TTTTTTTTTTTTT~~~~~~~~~~TTTTT', // 21
  ],
  entities: [
    { id: 'mossfall-cairn', kind: 'hearthfire', at: [30, 7], stand: [30, 8, 'n'], cold: true },
    { id: 'mf-islet-ford', kind: 'lock', lock: 'stream', at: [41, 14] },
    { id: 'mire-shrine', kind: 'encounter', enc: 'mire-shrine', mode: 'lair', at: [42, 18], area: [41, 17, 43, 18], face: 'n' },
    // M4.5 road gate (docs/M45-SPEC.md §4): the Reed-Runners have chained the head of the ford out to the
    // Mire Shrine's islet and stand beside their chain
    { id: 'mf-ford-chain', kind: 'gate', area: [41, 13, 41, 13], look: 'chain', open: { beaten: 'mf-smugglers' }, guard: 'mf-smugglers', text: 'A chain across the head of the ford, padlocked to a stake. The smugglers use this crossing, and nobody else does.' },
    { id: 'mf-smugglers', kind: 'encounter', enc: 'mf-smugglers', mode: 'block', at: [42, 13], face: 'n' },
    { id: 'mf-bog', kind: 'encounter', enc: 'mf-bog', mode: 'pack', at: [24, 14], face: 's' },
    { id: 'mf-bramble-cache', kind: 'chest', at: [46, 3], loot: { items: [{ rarity: 'tempered', kind: 'bow' }] }, lock: 'bramble' },
    { id: 'mf-reed-cache', kind: 'chest', at: [9, 18], loot: { gold: 120 }, hidden: true },
  ],
  exits: [
    { id: 'mf-tower', area: [3, 8, 3, 8], to: 'mosswatch-1', anchor: 'from-mossfall' },
    { id: 'mf-fen-stair', area: [20, 21, 21, 21], sealed: { region: 'gloomfen', text: 'Fog breathes up the stair. Willowmurk\'s safe paths start somewhere below.' } },
    { id: 'mf-e', area: [51, 10, 51, 11], to: 'thornhollow', anchor: 'from-mossfall' },
  ],
  anchors: { 'from-thornhollow': [49, 10, 'w'], 'from-tower': [3, 9, 's'] },
  roads: [{ from: 'from-thornhollow', to: 'mire-shrine', gates: ['mf-ford-chain'] }],
  roam: { max: 3, rects: [[6, 2, 48, 11], [14, 12, 36, 19]] },
});
