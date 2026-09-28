// Eldergrove (M3 spec §2.1, §2.3). The druid village under the Eldest Tree (top middle); the Grove circle in the north-west, the brook to the east.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'eldergrove', name: 'Eldergrove', region: 'verdant', biome: 'grove', music: 'town',
  backdrop: 'eldergrove', zone: null, level: 4, travel: true, dark: false,
  lore: [[200, 160, 15, 13]],
  w: 30, h: 26,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 0
    'T...........YYY+YYY..........T', // 1
    'T............................T', // 2
    'Tooooooo.....................T', // 3
    'To.....o.....................T', // 4
    'To.....o.....................T', // 5
    'To...........................T', // 6
    'To.....o.....................T', // 7
    'To.....o.....................v', // 8
    'Tooo.ooo................~....v', // 9
    'T.......................~....T', // 10
    'T.......................~....T', // 11
    'T.......................w....T', // 12
    'T.......................w....T', // 13
    'T.......................~....T', // 14
    'T.......................~....T', // 15
    'T.......................~....T', // 16
    'T.............==.............T', // 17
    'T.............==.............T', // 18
    'T.............==.............T', // 19
    'T.............==.............T', // 20
    'T.............==.............T', // 21
    'T.............==.............T', // 22
    'T.............==.............T', // 23
    'T.............==.............T', // 24
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT', // 25
  ],
  entities: [
    { id: 'eldergrove-hearth', kind: 'hearthfire', at: [13, 14], stand: [13, 16, 'n'] },
    { id: 'miravel', kind: 'npc', npc: 'miravel', at: [17, 11], face: 's' },
    { id: 'nan', kind: 'npc', npc: 'nan', at: [8, 16], face: 's' },
    { id: 'hilda', kind: 'npc', npc: 'hilda', at: [22, 18], face: 's', if: { all: [{ brand: 'brand-of-briars' }, { not: { brands: 2 } }] } },
    { id: 'eg-bryn-house', kind: 'sign', at: [5, 12], text: 'Bryn\'s house. The door is carved with tree-rings, and someone has added one.' },
    { id: 'eg-brook-chest', kind: 'chest', at: [26, 12], loot: { items: [{ rarity: 'runed', kind: 'staff' }] } },
    { id: 'eg-brook', kind: 'lock', lock: 'stream', area: [24, 12, 24, 13] },
    { id: 'grove-circle', kind: 'encounter', enc: 'grove-circle', mode: 'lair', at: [4, 6], face: 'e' },
    { id: 'tamsin-duel', kind: 'encounter', enc: 'tamsin-duel', mode: 'block', at: [17, 3], face: 'w', talk: 'tamsin-door', if: { brand: 'brand-of-briars' } },
    { id: 'eldest-door', kind: 'gate', area: [15, 2, 15, 2], look: 'door', open: { all: [{ brand: 'brand-of-briars' }, { any: [{ done: 'tamsin-duel' }, { flag: 'tamsin-yielded' }] }] }, text: 'The Eldest Tree\'s door is shut. Something behind it is breathing sap.' },
  ],
  exits: [
    { id: 'eg-tree', area: [15, 1, 15, 1], to: 'heartroot-1', anchor: 'from-tree' },
    { id: 'eg-s', area: [14, 25, 15, 25], to: 'thornway', anchor: 'from-eldergrove' },
    { id: 'eg-e', area: [29, 8, 29, 9], to: 'hindwood', anchor: 'from-eldergrove', unlock: 'hw-rope' },
  ],
  anchors: { 'from-thornway': [14, 23, 'n'], 'from-heartroot': [15, 4, 's'], 'from-hindwood': [27, 8, 'w'] },
  roam: null,
});
