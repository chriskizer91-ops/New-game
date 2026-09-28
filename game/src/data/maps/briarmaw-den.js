// Briarmaw's Den (M3 spec §2.1, §2.3). A root-walled den; Briarmaw fills the top of it.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'briarmaw-den', name: 'Briarmaw\'s Den', region: 'verdant', biome: 'den', music: 'dungeon',
  backdrop: 'briarmaw-den', zone: null, level: 7, travel: false, dark: false,
  lore: [[262, 205, 8, 9]],
  w: 16, h: 18,
  rows: [
    'RRRRRRRRRRRRRRRR', // 0
    'RrrrrrrrrrrrrrrR', // 1
    'RrrrrrrrrrrrrrrR', // 2
    'RrrrrrrrrrrrrrrR', // 3
    'RrrrrrrrrrrrrrrR', // 4
    'RrrrrrrrrrrrrrrR', // 5
    'RrrrrrrrrrrrrrrR', // 6
    'RrrrrrrrrrrrrrrR', // 7
    'RrrrrrrrrrrrrrrR', // 8
    'RrrrrrrrrrrrrrrR', // 9
    'RrrrrrrrrrrrrrrR', // 10
    'RrrrrrrrrrrrrrrR', // 11
    'RrrrrrrrrrrrrrrR', // 12
    'RrrrrrrrrrrrrrrR', // 13
    'RrrrrrrrrrrrrrrR', // 14
    'RrrrrrrrrrrrrrrR', // 15
    'RrrrrrrrrrrrrrrR', // 16
    'RRRRRRRrrRRRRRRR', // 17
  ],
  entities: [
    { id: 'briarmaw-den', kind: 'encounter', enc: 'briarmaw-den', mode: 'lair', at: [8, 5], face: 's', area: [6, 3, 10, 6] },
  ],
  exits: [
    { id: 'den-s', area: [7, 17, 8, 17], to: 'thornway', anchor: 'from-den' },
  ],
  anchors: { 'from-thornway': [8, 15, 'n'], 'v1:briarmaw-den': [8, 13, 'n'] },
  roam: null,
});
