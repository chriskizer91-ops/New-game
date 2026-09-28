// The Heartroot (M3 spec §2.1, §2.3). Under the Eldest Tree: two ichor pools, the sap-tappers, the missing patrol, and a rot-knot side passage.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'heartroot-1', name: 'The Heartroot', region: 'verdant', biome: 'roots', music: 'dungeon',
  backdrop: 'heartroot', zone: 'heartroot', level: 6, travel: false, dark: false,
  lore: [[192, 152, 12, 12]],
  w: 24, h: 24,
  rows: [
    'RRRRRRRRRRRRrRRRRRRRRRRR', // 0
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 1
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 2
    'RrrfrrrrrrrrrrrrrrrrrrrR', // 3
    'RrrrrrrrrrrrrrrrrrrrfrrR', // 4
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 5
    'RrrrrrrrrrrrrrrriiiirrrR', // 6
    'RrrrrrrrrrrrrrrriiiirrrR', // 7
    'RrrrrrrrrrfrrrrriiiirrrR', // 8
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 9
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 10
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 11
    'RrrrrrrriiiiiiiirrrrrrrR', // 12
    'RrrrrrrriiiiiiiirrrrrrrR', // 13
    'RrrrrrrriiiiiiiirrrrrrrR', // 14
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 15
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 16
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 17
    'RrrrrrfrrrrrrrrrrrrrrrrR', // 18
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 19
    'RrrrrrrrrrrrrrrrrrfrrrrR', // 20
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 21
    'RrrrrrrrrrrrrrrrrrrrrrrR', // 22
    'RRRRRRRRRRRRrRRRRRRRRRRR', // 23
  ],
  entities: [
    { id: 'h1-ichor-a', kind: 'lock', lock: 'ichor', area: [8, 12, 15, 14] },
    { id: 'h1-ichor-b', kind: 'lock', lock: 'ichor', area: [16, 6, 19, 8] },
    { id: 'last-green-coal', kind: 'hearthfire', at: [4, 20], stand: [4, 21, 'n'], cold: true },
    { id: 'hr1-grubs', kind: 'encounter', enc: 'hr1-grubs', mode: 'pack', at: [16, 18], face: 's' },
    { id: 'hr1-sapwight', kind: 'encounter', enc: 'hr1-sapwight', mode: 'pack', at: [8, 16], face: 's' },
    { id: 'hollowed-patrol', kind: 'encounter', enc: 'hollowed-patrol', mode: 'block', at: [19, 11], face: 'w' },
    { id: 'hr1-tappers', kind: 'encounter', enc: 'hr1-tappers', mode: 'block', at: [5, 6], face: 'e' },
    { id: 'h1-rot-knot', kind: 'lock', lock: 'rot-knot', at: [2, 12] },
    { id: 'h1-cache', kind: 'chest', at: [1, 9], loot: { items: [{ rarity: 'storied' }] } },
    { id: 'h1-ichor-chest', kind: 'chest', at: [17, 7], loot: { gold: 100, items: [{ rarity: 'runed', slot: 'offhand' }] } },
  ],
  exits: [
    { id: 'h1-s', area: [12, 23, 12, 23], to: 'eldergrove', anchor: 'from-heartroot' },
    { id: 'h1-n', area: [12, 0, 12, 0], to: 'heartroot-2', anchor: 'from-roots' },
  ],
  anchors: { 'from-tree': [12, 21, 'n'], 'from-chamber': [12, 2, 's'] },
  roam: { max: 3, rects: [[3, 3, 21, 21]] },
});
