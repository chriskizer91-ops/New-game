// Thareia (T2): the smugglers' cove on the fjords, reached by Wenna's boat from Mosswatch (S1; design/09-t2-spec.md
// 2.11). Traced tile by tile from the player's painting art-in/scenes/walk-drowned-fjords-cove.png (1536 x 1024, 48 x 32
// tiles at 32 px; `overTiles: false`): night, sheer cliffs over black water, a cliff path of steps with lamps hung low
// down to a plank landing at a cave mouth, and two docks below it with rowing boats and nets in the water.
// Wenna's boat is the one at the east dock's ladder (cove-boat, and the party's arrival). Skeet's crew holds the cliff
// path (c1-fjord-crew, with crates above them); Skeet counts crates on the landing at the cave mouth (c1-fjord-cove),
// and his receipts wait in the cave once he is beaten; the inlet by the rowing boats is not safe (c1-fjord-inlet).
// Tiles: ':' the cliff path, '_' the landing, the cave floor and the docks, 's' the steps down to the docks, 't' crates
// and barrels, '^' the cliffs and the lamp posts, 'o' rocks in the water, '~' the sea (and the boats on it). Owner: G.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-fjords-cove', name: 'The Fjord Cove', region: 'verdant', biome: 'fen', music: 'dungeon',
  backdrop: 'mosswatch', zone: null, level: 7, travel: false, dark: true, overTiles: false,
  lore: [[120, 250, 24, 16]],
  w: 48, h: 32,
  rows: [
    '~~~^^^^^^^^^^^^^^::::^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0  the cliff path, from the headland
    '~~~^^^^^^^^^^^^^^^^::::^^^^^^^^^^^^^^^^^^^^^^^^^', //  1
    '~~~^^^^^^^^^^^^^^^^^^::^^^^^^^^^^^^^^^^^^^^^^^^^', //  2
    '~~~^^^^^^^^^^^^^^^^^^^::ttt^^^^^^^^^^^^^^^^^^^^^', //  3  the crates on the path
    '~~~^^^^^^^^^^^^^^^^^^^::::^^^^^^^^^^^^^^^^^^^^^^', //  4
    '~~~~^^^^^^^^^^^^^^^^^^^::::^^^^^^^^^^^^^^^^^^^^^', //  5
    '~~~~^^^^^^^^^^^^^^^^^^^^:::^^^^^^^^^^^^^^^^^^^^^', //  6
    '~~~~^^^^^^^^^^^^^^^^^^^^:::^^^^^^^^^^^^^^^^^^^^^', //  7
    '~~~~^^^^^^^^^^^^^^^^^^^^^:::^^^^^^^^^^^^^^^^^^^^', //  8
    '~~~~^^^^^^^^^^^^^^^^^^^^^::::^^^^^^^^^^^^^^^^^^^', //  9  the crew on the path
    '~~~~^^^^^^^^^^^^^^^^^^^^^^:::^^^^^tttt^^^^^^^^^^', // 10
    '~~~~^^^^^^^^^^^^^^^^^^^^^^::::^^^_______^^^^^^^^', // 11
    '~~~~~~~^^^^^^^^^^^^^^^^^^^^::::^tt______^^^^^^^^', // 12
    '~~~~~~~~~~^^^^^^^^^^^^^^^^^^:::_tt_____^^^^^^^^^', // 13  the landing at the cave mouth
    '~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^__________^^^^^^^^', // 14
    '~~~~~~~~~~~~~~~~^^^^^^^^^^^^ss_________^^^^^^^^^', // 15
    '~~~~~~~~~~~~~~~~^^^^^^^^ttttss^ss^^^^^^^^^^^^^^^', // 16
    '~~~~~~~~~~~~~~~~~^^^__________^ss^^^^^^^^^^^^^^^', // 17  the west dock
    '~~~~~~~~~~~~~~~~^_____________^ss^^^^^^^^^^^^^^^', // 18
    '~~~~~~~~~~oo~~~~____________^^____^^^^^^^^^^^^^^', // 19
    '~~~~~~~~~~oo~~~~_________~~~~~_______tt~~^^^^^^^', // 20  the east dock
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~______tt~~^^^^^^^', // 21
    '^^^^^~~~~~~~~~~~~~~~~~~~~~~~~~~~~________^^^^^^^', // 22
    '^^^^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~~________^^^^^^', // 23  Wenna's boat at the ladder
    '^^^^^^^oooo~~~~~~~~~~~~~~~~~~~~~~~~~______^^^^^^', // 24
    '^^^^^^^oooo~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^', // 25
    '^^^^^^^^^^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^', // 26
    '^^^^^^^^^^~~~~^^^^^^^^~~~~~~~~~~~~~~~~~^^^^^^^^^', // 27
    '^^^^^^^^^^~~~~^^^^^^^^~~~~~~~~~~~~~~~~~^^^^^^^^^', // 28
    '^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~~~^^^^^^^^^', // 29
    '^^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~^^^^^^^^^', // 30
    '^^^^^^^^^^^^^^^^^^^^^^^^~~~~~~~~~~~~~~~^^^^^^^^^', // 31
  ],
  entities: [
    { id: 'c1-cove-arrive', kind: 'trigger', area: [0, 0, 47, 31], on: 'enter', once: true, dialogue: 'c1-cove-arrive' },
    // the inlet: something under the rowing boats, at the west dock's end
    { id: 'c1-fjord-inlet', kind: 'encounter', enc: 'c1-fjord-inlet', mode: 'lair', at: [16, 19], face: 'w' },
    // Skeet on the landing at the cave mouth; his receipts in the cave, once he is beaten
    { id: 'c1-fjord-cove', kind: 'encounter', enc: 'c1-fjord-cove', mode: 'lair', at: [35, 14], face: 's', talk: 'c1-cove-skeet' },
    { id: 'th-cove-receipts', kind: 'chest', at: [36, 11], if: { beaten: 'c1-fjord-cove' }, loot: { gold: 45, story: 's1-lens-receipt' }, note: 'A ledger of receipts. Crates of sunstone, out by night. Each one is stamped with a small mark.' },
    // the crew across the cliff path, and the crates they keep above them
    { id: 'c1-fjord-crew', kind: 'encounter', enc: 'c1-fjord-crew', mode: 'block', at: [26, 9], area: [25, 9, 28, 9], face: 's' },
    { id: 'th-cove-crates', kind: 'chest', at: [25, 4], loot: { gold: 30, bag: { 'hearth-tonic': 1 } } },
    // the lamps hung low on the path, on the docks and in the cave
    { id: 'th-cove-lamp-1', kind: 'light', at: [23, 2], radius: 2 },
    { id: 'th-cove-lamp-2', kind: 'light', at: [23, 7], radius: 2 },
    { id: 'th-cove-lamp-3', kind: 'light', at: [31, 12], radius: 3 },
    { id: 'th-cove-lamp-4', kind: 'light', at: [22, 16], radius: 2 },
    { id: 'th-cove-lamp-5', kind: 'light', at: [16, 18], radius: 2 },
    { id: 'th-cove-lamp-6', kind: 'light', at: [36, 21], radius: 2 },
    { id: 'th-cove-lamp-7', kind: 'light', at: [38, 10], radius: 3 },
  ],
  exits: [
    { id: 'cove-boat', area: [34, 23, 35, 23], to: 'th-mosswatch-1', anchor: 'from-cove' },
    { id: 'cove-up', area: [17, 0, 20, 0], sealed: { region: 'verdant', text: 'The path climbs to the headland and on for miles. Wenna\'s boat is the way home.' } },
  ],
  anchors: { 'from-boat': [36, 23, 'n'] },
  roam: null,
});
