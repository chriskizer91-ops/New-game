// The Lamp Room (M3 spec §2.1, §2.3). The dark top floor. Hollis's lantern is the only light until the signal fire is lit.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mosswatch-2', name: 'The Lamp Room', region: 'verdant', biome: 'tower', music: 'dungeon',
  backdrop: 'mosswatch', zone: null, level: 5, travel: false, dark: true,
  lore: [[140, 280, 6, 6]],
  w: 12, h: 12,
  rows: [
    '############', // 0
    '#__________#', // 1
    '#__________#', // 2
    '#__________#', // 3
    '#__________#', // 4
    '#__________#', // 5
    '#__________#', // 6
    '#__________#', // 7
    '#__________#', // 8
    '#__________#', // 9
    '#__________#', // 10
    '######s#####', // 11
  ],
  entities: [
    { id: 'mw-lantern', kind: 'encounter', enc: 'mw-lantern', mode: 'lair', at: [6, 5], face: 's' },
    { id: 'mw-lantern-light', kind: 'light', at: [6, 5], radius: 3, if: { not: { beaten: 'mw-lantern' } } },
    { id: 'mosswatch-fire', kind: 'hearthfire', at: [6, 2], stand: [6, 3, 'n'], cold: true },
    { id: 'mw-lookout', kind: 'lookout', at: [10, 2] },
  ],
  exits: [
    { id: 'mw2-down', area: [6, 11, 6, 11], to: 'mosswatch-1', anchor: 'from-lamp' },
  ],
  anchors: { 'from-stair': [6, 9, 'n'] },
  roam: null,
});
