// Thareia (T2): the cliff den off the Thornway, Chapter 1's copy of the old game's briarmaw-den.js (design/09-t2-spec.md
// section 2.11): the old rows and painting (`paint`), no new art. The S6 lair after the node (Dael's bounty), two
// chests either side of it, and a pool of black, warm water.
// Rows and tiles as briarmaw-den.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-briarmaw-den', name: 'The Cliff Den', region: 'verdant', biome: 'den', music: 'dungeon', paint: 'briarmaw-den',
  backdrop: 'briarmaw-den', zone: null, level: 7, travel: false, dark: false,
  lore: [[262, 205, 8, 9]],
  w: 16, h: 18,
  rows: [
    'RRRRRRRRRRRRRRRR', //  0
    'RRRRRtYttYtRRRRR', //  1
    'RRRttkrrrrrkttRR', //  2
    'RRtrkrrrrrrrkrtR', //  3
    'RRtrrrrrrrrrrrtR', //  4
    'RRYrrrrrrrrrrrYR', //  5
    'RRtrrrrrrrrrrrtR', //  6
    'RRRrrrrrrrrrrrRR', //  7
    'RRtrrokrrrkorrtR', //  8
    'RR~~rrrrrrrrr~RR', //  9
    'RRR~rrmrrmrrrRRR', // 10
    'RRRtrrrrrrrrtRRR', // 11
    'RRRRtrrrrrrtRRRR', // 12
    'RRRRRrrrrrrRRRRR', // 13
    'RRRRRRrrrrRRRRRR', // 14
    'RRRRRRrrrrRRRRRR', // 15
    'RRRRRRtrrtRRRRRR', // 16
    'RRRRRRRrrRRRRRRR', // 17
  ],
  entities: [
    { id: 'c1-den-enter', kind: 'trigger', area: [7, 14, 8, 14], on: 'step', if: { not: { flag: 's6-den' } }, dialogue: 'c1-den-enter' },
    // S6: Dael's bounty sleeps at the back of the den
    { id: 'c1-dael-bounty', kind: 'encounter', enc: 'c1-dael-bounty', mode: 'lair', at: [8, 5], area: [6, 3, 10, 6], face: 's' },
    { id: 'th-den-chest-w', kind: 'chest', at: [3, 4], loot: { gold: 70, items: [{ rarity: 'runed' }] } },
    { id: 'th-den-chest-e', kind: 'chest', at: [12, 4], loot: { items: [{ rarity: 'storied' }] } },
    // black, warm water in the den's pool
    { id: 'c1-den-pool', kind: 'trigger', area: [4, 9, 4, 9], on: 'step', once: true, dialogue: 'c1-den-pool' },
  ],
  exits: [
    { id: 'den-s', area: [7, 17, 8, 17], to: 'th-thornway', anchor: 'from-den' },
  ],
  anchors: { 'from-thornway': [8, 15, 'n'] },
  roam: null,
});
