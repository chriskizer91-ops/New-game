// Hearthstone Keep (M3 spec §2.1, §2.3). Walls ring a flagstone yard; the hall facade runs along the top; the north gate opens onto the causeway (A2).
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep', name: 'Hearthstone Keep', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: true, dark: false,
  lore: [[540, 390, 15, 12]],
  w: 30, h: 24,
  rows: [
    '##############:::#############', // 0
    '#::::::::::::::::::::::::::::#', // 1
    '#::::::::::::::::::::::::::::#', // 2
    '#::::::::HHHHHHHHHHHHH:::::::#', // 3
    '#::::::::######+######:::::::#', // 4
    '#::::::::::::::::::::::::::::#', // 5
    '#::::::::::::::::::::::::::::#', // 6
    '#::::::::::::::::::::::::::::#', // 7
    '#::::::::::::::::::::::::::::#', // 8
    '#::::::::::::::::::::::::::::#', // 9
    '#::::::::::::::::::::::::::::#', // 10
    '#:::::::::::::::::::::::::::::', // 11
    '#:::::::::::::::::::::::::::::', // 12
    '#::::::::::::::::::::::::::::#', // 13
    '#::::::::::::::::::::::::::::#', // 14
    '#::::::::::::::::::::::::::::#', // 15
    '#::::::::::::::::::::::::::::#', // 16
    '#::::::::::::::::::::::::::::#', // 17
    '#::::::::::::::::::::::::::::#', // 18
    '#::::::::::::::::::::::::::::#', // 19
    '#::::::::::::::::::::::::::::#', // 20
    '#::::::::::::::::::::::::::::#', // 21
    '#::::::::::::::::::::::::::::#', // 22
    '######::##############::######', // 23
  ],
  entities: [
    { id: 'keep-n-gate', kind: 'gate', area: [14, 1, 16, 1], look: 'gate', open: { done: 'keep-vault' }, text: 'Guard: "Not with the Seal still missing, Warden. Captain\'s orders."' },
    { id: 'marta', kind: 'npc', npc: 'marta', at: [20, 14], face: 's' },
    { id: 'refugee-1', kind: 'npc', npc: 'refugee', at: [8, 12], face: 's' },
    { id: 'refugee-2', kind: 'npc', npc: 'refugee', at: [11, 17], face: 's' },
    { id: 'hilda', kind: 'npc', npc: 'hilda', at: [9, 15], face: 's', if: { brands: 2 } },
    { id: 'gate-guard-e', kind: 'npc', npc: 'gate-guard-e', at: [28, 10], face: 'w' },
    { id: 'gate-guard-se', kind: 'npc', npc: 'gate-guard-se', at: [21, 22], face: 's' },
    { id: 'gate-guard-sw', kind: 'npc', npc: 'gate-guard-sw', at: [8, 22], face: 's' },
    { id: 'keep-armory-bar', kind: 'lock', lock: 'barred-gate', at: [25, 6] },
    { id: 'keep-armory', kind: 'chest', at: [26, 6], loot: { items: [{ rarity: 'tempered', slot: 'head' }] } },
  ],
  exits: [
    { id: 'keep-hall-door', area: [15, 4, 15, 4], to: 'keep-hall', anchor: 'from-court' },
    { id: 'keep-n', area: [14, 0, 16, 0], to: 'hearth-road', anchor: 'from-keep' },
    { id: 'keep-e', area: [29, 11, 29, 12], sealed: { region: 'ironspire', text: 'Rockslide on the pass. Stormwatch hasn\'t sent a writ since spring.' } },
    { id: 'keep-se', area: [22, 23, 23, 23], sealed: { region: 'sunscorch', text: 'The Sandspire caravans stopped a month ago, and the dune-glass walls are still too hot to cross.' } },
    { id: 'keep-sw', area: [6, 23, 7, 23], sealed: { region: 'gloomfen', text: 'Blackwater\'s up over the causeway. Nobody\'s ferrying.' } },
  ],
  anchors: { 'from-hall': [15, 6, 's'], 'from-road': [15, 2, 's'] },
  roam: null,
});
