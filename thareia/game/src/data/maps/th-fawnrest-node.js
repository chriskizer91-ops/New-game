// Thareia (T2): under Fawnrest, the node (design/09-t2-spec.md 2.10). Stub by the foundation: the drawn tile map of
// 2.10 (rows, anchors and the stair up) until G traces painting 6 (walk-fawnrest-node.png) and imports it
// (tools/paint-import.mjs --map=th-fawnrest-node), keeping the spec's entity ids. Owner: G.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-fawnrest-node', name: 'Under Fawnrest', region: 'verdant', biome: 'roots', music: 'dungeon',
  backdrop: 'fawnrest-node', zone: null, level: 9, travel: false, dark: true,
  lore: [[370, 170, 9, 11]],
  w: 18, h: 22,
  rows: [
    '##################', //  0
    '#####::::::::#####', //  1
    '###::::::::::::###', //  2  dais chamber
    '##::::::::::::::##', //  3
    '##::::::::::::::##', //  4
    '##::::::::::::::##', //  5
    '###::::::::::::###', //  6
    '#######:::########', //  7  root gate
    '#######:::########', //  8
    '##::::::::::::::##', //  9  channel hall
    '##::~::::::::~::##', // 10  straight channels at x4 and x13
    '##::~::::::::~::##', // 11
    '##::~::::::::~::##', // 12
    '##::~::::::::~::##', // 13
    '##::~::::::::~::##', // 14
    '##::::::::::::::##', // 15
    '#######kkk########', // 16  stair gate
    '#######kkk########', // 17
    '#######kkk########', // 18
    '#######kkk########', // 19
    '########kk########', // 20
    '#########s########', // 21  stair up
  ],
  entities: [],
  exits: [
    { id: 'fn-up', area: [9, 21, 9, 21], to: 'th-fawnrest', anchor: 'from-node' },
  ],
  anchors: { 'from-fawnrest': [9, 20, 'n'] },
  roam: null,
});
