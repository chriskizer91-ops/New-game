// Thareia (T2): Mossfall, Chapter 1's copy of the old game's mossfall.js (design/09-t2-spec.md section 2.5): the old
// rows and painting (`paint`), with Chapter 1's marsh: warm water in autumn, a runners' crate, the runners' chain at the
// head of the islet ford (optional), the shrine lair on the islet, the S4 shore sample, and the Mosswatch hire post by
// the tower door. The fen stair down to the Gloomfen stays shut in Chapter 1.
// Rows and tiles as mossfall.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-mossfall', name: 'Mossfall', region: 'verdant', biome: 'fen', music: 'wilds', paint: 'mossfall',
  backdrop: 'mossfall', zone: 'th-mossfall', level: 6, travel: true, dark: false,
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
    { id: 'c1-mf-arrive', kind: 'trigger', area: [46, 9, 50, 11], on: 'step', once: true, dialogue: 'c1-mf-arrive' },
    { id: 'th-mf-cairn', kind: 'hearthfire', at: [30, 7], stand: [30, 8, 'n'] },
    { id: 'c1-mire-bog', kind: 'encounter', enc: 'c1-mire-bog', mode: 'pack', at: [24, 14], face: 's' },
    { id: 'th-mf-runner-crate', kind: 'chest', at: [16, 4], loot: { gold: 25, bag: { 'hearth-tonic': 1 } }, note: 'Fernshaw\'s mark. Fjord run. Sandspire buyer.' },
    // the runners have chained the head of the ford out to the islet and stand beside their chain (optional)
    { id: 'th-mf-ford-chain', kind: 'gate', area: [41, 13, 41, 13], look: 'chain', open: { beaten: 'c1-mf-runners' }, guard: 'c1-mf-runners', text: 'A chain across the head of the ford, padlocked to a stake.' },
    { id: 'c1-mf-runners', kind: 'encounter', enc: 'c1-mf-runners', mode: 'block', at: [42, 13], face: 'n' },
    // the ford keeps its lock; the node cooling (c1-node-cools) also unlocks it
    { id: 'th-mf-islet-ford', kind: 'lock', lock: 'stream', at: [41, 14] },
    { id: 'c1-mf-islet', kind: 'trigger', area: [38, 15, 45, 15], on: 'step', once: true, dialogue: 'c1-mf-islet' },
    { id: 'c1-mire-shrine', kind: 'encounter', enc: 'c1-mire-shrine', mode: 'lair', at: [42, 18], area: [41, 17, 43, 18], face: 'n' },
    { id: 'th-mf-bramble-cache', kind: 'chest', at: [46, 3], loot: { items: [{ rarity: 'tempered', kind: 'bow' }] }, lock: 'bramble' },
    { id: 'th-mf-reed-cache', kind: 'chest', at: [9, 18], loot: { gold: 120 }, hidden: true },
    { id: 'th-mf-shore-sample', kind: 'sign', at: [36, 14], text: 'The lagoon shore steams a little in the cold.', talk: 'c1-sample-coast', talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-coast' } }] } },
    { id: 'th-mw-hire', kind: 'npc', npc: 'th-hire-mw', at: [6, 9], face: 'e' },
  ],
  exits: [
    { id: 'mf-e', area: [51, 10, 51, 11], to: 'th-thornhollow', anchor: 'from-mossfall' },
    { id: 'mf-tower', area: [3, 8, 3, 8], to: 'th-mosswatch-1', anchor: 'from-mossfall' },
    { id: 'mf-fen-stair', area: [20, 21, 21, 21], sealed: { region: 'gloomfen', text: 'Fog breathes up the stair. The Gloomfen is not for walking, not yet.' } },
  ],
  anchors: { 'from-thornhollow': [49, 10, 'w'], 'from-tower': [3, 9, 's'], 'from-skiff': [7, 9, 'w'] },
  roads: [{ from: 'from-thornhollow', to: 'c1-mire-shrine', gates: ['th-mf-ford-chain'] }],
  roam: { max: 2, rects: [[6, 2, 48, 11], [14, 12, 36, 19]] },
});
