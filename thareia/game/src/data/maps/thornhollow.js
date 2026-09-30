// Thornhollow (M3 spec §2.1, §2.3). The rangers' outpost inside a ring of enchanted thorn palisade,
// with four gates: south to the Hearth Road, north to the Thornway, west to Mossfall and north-east
// to the Hindwood (the last two behind Briarmaw's crownwalls until the Brand). A flagstone square holds
// the hearth; round it: the Thornwatch lodge with Dael, his bounty board and the corner lookout (NW),
// Nell's store (NE), Hilda's forge (SE), houses (W, SW), two market stalls on the south street, and the
// barred stockade with the Thornwatch cache in the south-east corner.
// Layout notes: the hearthfire sits at (12,12), next to its stand (12,13) (spec (12,11), moved 1).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'thornhollow', name: 'Thornhollow', region: 'verdant', biome: 'town', music: 'town',
  backdrop: 'thornhollow', zone: null, level: 4, travel: true, dark: false,
  lore: [[310, 260, 12, 11]],
  w: 24, h: 22,
  rows: [
    '|||||||||||==|||||||||||', //  0
    '|:::HHHHHH.==.T..,..T..|', //  1
    '|:::HHHHHH.==.,..".....|', //  2
    '|:::HHHHHH.=============', //  3
    '|..:######.=============', //  4
    '|T.........==.HHHHH....|', //  5
    '|..,.......==.HHHHH.T..|', //  6
    '|.....,....==.#####..."|', //  7
    '|T.........==.........T|', //  8
    '|..T.....t:::::t..,,,..|', //  9
    '=========:::::::..,",..|', // 10
    '=========:::::::.......|', // 11
    '|.HHHHH..:::::::.HHHHH.|', // 12
    '|.HHHHH..:::::::.HHHHH.|', // 13
    '|.#####..:::::::.##*##.|', // 14
    '|....,...t:::::t.......|', // 15
    '|..T....HH.==.HH.......|', // 16
    '|.HHHHH....==.......||||', // 17
    '|.HHHHH....==.,.,...:..|', // 18
    '|.#####....==..,,...|..|', // 19
    '|..,...,...==....T..|..|', // 20
    '|||||||||||==|||||||||||', // 21
  ],
  entities: [
    { id: 'thornhollow', kind: 'hearthfire', at: [12, 12], stand: [12, 13, 'n'] },
    { id: 'dael', kind: 'npc', npc: 'dael', at: [7, 6], face: 's' },
    { id: 'nell', kind: 'npc', npc: 'nell', at: [16, 8], face: 's' },
    { id: 'hilda', kind: 'npc', npc: 'hilda', at: [18, 15], face: 's', if: { not: { brand: 'brand-of-briars' } } },
    { id: 'corra', kind: 'npc', npc: 'corra', at: [8, 15], face: 's', if: { flag: 'rangers-home' } },
    { id: 'bounty-board', kind: 'board', at: [9, 5], opens: 'bounties' },
    { id: 'th-lookout', kind: 'lookout', at: [3, 3] },
    { id: 'th-cache', kind: 'chest', at: [21, 19], loot: { items: [{ rarity: 'tempered', slot: 'ring' }] } },
    { id: 'th-stockade', kind: 'lock', lock: 'barred-gate', at: [20, 18] },
    { id: 'th-crown-w', kind: 'gate', area: [1, 10, 1, 11], look: 'crownwall', open: { brand: 'brand-of-briars' }, text: 'Briarmaw\'s crown-growth walls the road. A green heart-knot pulses in it.' },
    { id: 'th-crown-ne', kind: 'gate', area: [22, 3, 22, 4], look: 'crownwall', open: { brand: 'brand-of-briars' }, text: 'Briarmaw\'s crown-growth walls the road. A green heart-knot pulses in it.' },
  ],
  exits: [
    { id: 'th-s', area: [11, 21, 12, 21], to: 'hearth-road', anchor: 'from-thornhollow' },
    { id: 'th-n', area: [11, 0, 12, 0], to: 'thornway', anchor: 'from-thornhollow' },
    { id: 'th-w', area: [0, 10, 0, 11], to: 'mossfall', anchor: 'from-thornhollow' },
    { id: 'th-ne', area: [23, 3, 23, 4], to: 'hindwood', anchor: 'from-thornhollow' },
  ],
  anchors: { 'from-road': [12, 19, 'n'], 'from-thornway': [12, 2, 's'], 'from-mossfall': [2, 10, 'e'], 'from-hindwood': [21, 4, 'w'], 'v1:thornhollow': [12, 13, 'n'] },
  roam: null,
});
