// Thareia (T2): the smugglers' cove on the fjords, reached by Wenna's boat from Mosswatch (S1; design/09-t2-spec.md
// 2.11). Stub by the foundation: a small drawn cove (cliff, beach, a plank dock) until G traces painting 7
// (walk-drowned-fjords-cove.png) and imports it (tools/paint-import.mjs --map=th-fjords-cove). Owner: G.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-fjords-cove', name: 'The Fjord Cove', region: 'verdant', biome: 'fen', music: 'dungeon',
  backdrop: 'mosswatch', zone: null, level: 7, travel: false, dark: true,
  lore: [[120, 250, 8, 6]],
  w: 16, h: 12,
  rows: [
    '^^^^^^^^^^^^^^^^', //  0
    '^^^..........^^^', //  1
    '^^....,.......^^', //  2
    '^^.............^', //  3
    '^...::::::::...^', //  4
    '^...::::::::...^', //  5
    '^~~~~bbbbbb~~~~^', //  6  the dock
    '^~~~~bbbbbb~~~~^', //  7
    '^~~~~~~bb~~~~~~^', //  8
    '^~~~~~~bb~~~~~~^', //  9  Wenna's boat
    '^~~~~~~~~~~~~~~^', // 10
    '^^^^^^^^^^^^^^^^', // 11
  ],
  entities: [],
  exits: [
    { id: 'cove-boat', area: [7, 9, 8, 9], to: 'th-mosswatch-1', anchor: 'from-cove' },
  ],
  anchors: { 'from-boat': [7, 8, 'n'] },
  roam: null,
});
