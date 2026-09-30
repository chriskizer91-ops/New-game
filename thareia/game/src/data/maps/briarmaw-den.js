// Briarmaw's Den (M3 spec §2.1, §2.3). A cave of living root and thorn under the rock face. A narrow
// root tunnel climbs from the den door into a wide arena: pools of black water, bones, and the
// crown-growth thorns behind the beast. Briarmaw fills the top of the arena (its solid footprint is
// the lair area); the arena in front is open, so the fight reads from the tunnel mouth.
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'briarmaw-den', name: 'Briarmaw\'s Den', region: 'verdant', biome: 'den', music: 'dungeon',
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
    { id: 'briarmaw-den', kind: 'encounter', enc: 'briarmaw-den', mode: 'lair', at: [8, 5], face: 's', area: [6, 3, 10, 6] },
  ],
  exits: [
    { id: 'den-s', area: [7, 17, 8, 17], to: 'thornway', anchor: 'from-den' },
  ],
  anchors: { 'from-thornway': [8, 15, 'n'], 'v1:briarmaw-den': [8, 13, 'n'] },
  roam: null,
});
