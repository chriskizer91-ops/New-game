// Thornhollow (M3 spec §2.1, §2.3). A palisade ring around a square with the hearth in the middle.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'thornhollow', name: 'Thornhollow', region: 'verdant', biome: 'town', music: 'town',
  backdrop: 'thornhollow', zone: null, level: 4, travel: true, dark: false,
  lore: [[310, 260, 12, 11]],
  w: 24, h: 22,
  rows: [
    '|||||||||||==|||||||||||', // 0
    '|..........==..........|', // 1
    '|..........==..........|', // 2
    '|..........=============', // 3
    '|..........=============', // 4
    '|..........==..........|', // 5
    '|..........==..........|', // 6
    '|..........==..........|', // 7
    '|..........==..........|', // 8
    '|..........==..........|', // 9
    '=============..........|', // 10
    '============...........|', // 11
    '|..........==..........|', // 12
    '|..........==..........|', // 13
    '|..........==..........|', // 14
    '|..........==..........|', // 15
    '|..........==..........|', // 16
    '|..........==..........|', // 17
    '|..........==..........|', // 18
    '|..........==..........|', // 19
    '|..........==..........|', // 20
    '|||||||||||==|||||||||||', // 21
  ],
  entities: [
    { id: 'thornhollow', kind: 'hearthfire', at: [12, 11], stand: [12, 13, 'n'] },
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
