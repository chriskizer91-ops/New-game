// Fawnrest Shrine (M3 spec §2.1, §2.3). The Dreaming Stone, the empty bell-frame, and the white-deer clearing in the north-east.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'fawnrest', name: 'Fawnrest Shrine', region: 'verdant', biome: 'grove', music: 'hearth',
  backdrop: 'fawnrest', zone: null, level: 4, travel: true, dark: false,
  lore: [[370, 170, 11, 10]],
  w: 22, h: 20,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTT', // 0
    'T....................T', // 1
    'T.............,,,,,,,T', // 2
    'T.............,,,,,,,T', // 3
    'T.............,,,,,,,T', // 4
    'T.............,,,,,,,T', // 5
    'T.............,,,,,,,T', // 6
    'T.............,,,,,,,T', // 7
    'T.........==..,,,,,,,T', // 8
    'T.........==.........=', // 9
    'T.........==.........=', // 10
    'T.........==.........T', // 11
    'T.........==.........T', // 12
    'T.........==.........T', // 13
    'T.........==.........T', // 14
    'T.........==.........T', // 15
    'T.........==.........T', // 16
    'T.........==.........T', // 17
    'T.........==.........T', // 18
    'TTTTTTTTTT==TTTTTTTTTT', // 19
  ],
  entities: [
    { id: 'fawnrest-stone', kind: 'hearthfire', at: [11, 5], stand: [11, 7, 'n'] },
    { id: 'fr-bellframe', kind: 'bellframe', at: [7, 6] },
    { id: 'ivo', kind: 'npc', npc: 'ivo', at: [13, 8], face: 's' },
    { id: 'pilgrim-1', kind: 'npc', npc: 'pilgrim', at: [5, 12], face: 's' },
    { id: 'pilgrim-2', kind: 'npc', npc: 'pilgrim', at: [8, 14], face: 's' },
    { id: 'vesper-stall', kind: 'encounter', enc: 'vesper-stall', mode: 'block', at: [16, 12], face: 'w', talk: 'vesper' },
    { id: 'fr-deer-1', kind: 'prop', prop: 'deer', at: [16, 4], if: { flag: 'bell-rung' } },
    { id: 'fr-deer-2', kind: 'prop', prop: 'deer', at: [18, 6], if: { flag: 'bell-rung' } },
    { id: 'fr-offering', kind: 'chest', at: [3, 3], loot: { items: [{ rarity: 'storied', slot: 'amulet' }] }, lock: 'boulder' },
  ],
  exits: [
    { id: 'fr-highfold', area: [21, 9, 21, 10], sealed: { region: 'ironspire', text: 'Fallen scree, and somewhere past it, a bell.' } },
    { id: 'fr-s', area: [10, 19, 11, 19], to: 'hindwood', anchor: 'from-fawnrest' },
  ],
  anchors: { 'from-hindwood': [11, 17, 'n'] },
  roam: null,
});
