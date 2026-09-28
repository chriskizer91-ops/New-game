// The Hindwood (M3 spec §2.1, §2.3). Pale trees; the Gloamwing's hollow in the north-east, the rope-ledge up to Eldergrove in the west.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'hindwood', name: 'The Hindwood', region: 'verdant', biome: 'wilds', music: 'wilds',
  backdrop: 'verdant-wood', zone: 'hindwood', level: 4, travel: true, dark: false,
  lore: [[320, 252, 31, 35], [365, 180, 15, 0]],
  w: 32, h: 40,
  rows: [
    'TTTTTTTTTTTTTTT==TTTTTTTTTTTTTTT', // 0
    'T..............==..............T', // 1
    'T..............==..............T', // 2
    'T..............==..............T', // 3
    'T..............==..............T', // 4
    'T..............==..............T', // 5
    'T..............==..............T', // 6
    'T..............==..............T', // 7
    '=================..............T', // 8
    '=================..............T', // 9
    'T..............==..............T', // 10
    'T..............==..............T', // 11
    'T..............==..............T', // 12
    'T..............==..............T', // 13
    'T..............==..............T', // 14
    'T..............==..............T', // 15
    'T..............==..............T', // 16
    'T..............==..............T', // 17
    'T..............==..............T', // 18
    'T..............==..............T', // 19
    'T..............==..............T', // 20
    'T..............==..............T', // 21
    'T..............==..............T', // 22
    'T..............==..............T', // 23
    'T..............==..............T', // 24
    'T..............==..............T', // 25
    'T..............==..............T', // 26
    'T..............==..............T', // 27
    'T..............==..............T', // 28
    'T..............==..............T', // 29
    'T..............==..............T', // 30
    'T..............==..............T', // 31
    'T..............==..............T', // 32
    'T..............==..............T', // 33
    'T..............=================', // 34
    'T..............=================', // 35
    'T..............................T', // 36
    'T..............................T', // 37
    'T..............................T', // 38
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 39
  ],
  entities: [
    { id: 'gloamwing-hollow', kind: 'encounter', enc: 'gloamwing-hollow', mode: 'lair', at: [22, 12], face: 's' },
    { id: 'hindwood-cairn', kind: 'hearthfire', at: [10, 24], stand: [10, 26, 'n'], cold: true },
    { id: 'hw-glowcaps', kind: 'encounter', enc: 'hw-glowcaps', mode: 'pack', at: [8, 14], face: 's' },
    { id: 'hw-druids', kind: 'encounter', enc: 'hw-druids', mode: 'pack', at: [18, 28], face: 's' },
    { id: 'hw-thorn-chest', kind: 'chest', at: [28, 6], loot: { items: [{ rarity: 'storied', unidentified: true }] } },
    { id: 'hw-thornwall', kind: 'lock', lock: 'thornwall', area: [27, 7, 28, 7] },
    { id: 'hw-rope', kind: 'lock', lock: 'rope-ledge', area: [1, 8, 1, 9] },
  ],
  exits: [
    { id: 'hw-se', area: [31, 34, 31, 35], to: 'thornhollow', anchor: 'from-hindwood' },
    { id: 'hw-n', area: [15, 0, 16, 0], to: 'fawnrest', anchor: 'from-hindwood' },
    { id: 'hw-w', area: [0, 8, 0, 9], to: 'eldergrove', anchor: 'from-hindwood' },
  ],
  anchors: { 'from-thornhollow': [29, 34, 'w'], 'from-fawnrest': [15, 2, 's'], 'from-eldergrove': [2, 8, 'e'] },
  roam: { max: 3, rects: [[2, 4, 30, 38]] },
});
