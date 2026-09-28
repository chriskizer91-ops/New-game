// The Great Hall (M3 spec §2.1, §2.3). The Eternal Hearth at the top, the war-room corner at the top left, the reliquary gallery in the south half.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep-hall', name: 'The Great Hall', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: true, dark: false,
  lore: [[540, 385, 12, 7]],
  w: 24, h: 14,
  rows: [
    '######*###########*#####', // 0
    '#______________________#', // 1
    '#______________________#', // 2
    '#______________________#', // 3
    '#______________________#', // 4
    '#______________________#', // 5
    '#______________________#', // 6
    '#______________________#', // 7
    '#______________________#', // 8
    '#______________________#', // 9
    '#______________________#', // 10
    '#______________________#', // 11
    '#______________________#', // 12
    '############+###########', // 13
  ],
  entities: [
    { id: 'hearthstone-keep', kind: 'hearthfire', at: [12, 3], stand: [12, 5, 'n'] },
    { id: 'fenwick', kind: 'npc', npc: 'fenwick', at: [10, 4], face: 's' },
    { id: 'isolde', kind: 'npc', npc: 'isolde', at: [14, 4], face: 's' },
    { id: 'keep-vault', kind: 'encounter', enc: 'keep-vault', mode: 'block', at: [20, 7], face: 'w' },
    { id: 'ladder-board', kind: 'board', at: [2, 2], opens: 'ladder' },
    { id: 'war-table', kind: 'table', at: [4, 2], opens: 'atlas' },
    { id: 'pedestal-hearthbrand', kind: 'pedestal', relic: 'hearthbrand', at: [3, 10] },
    { id: 'pedestal-stillwater-lance', kind: 'pedestal', relic: 'stillwater-lance', at: [4, 10] },
    { id: 'pedestal-cairnmaul', kind: 'pedestal', relic: 'cairnmaul', at: [5, 10] },
    { id: 'pedestal-wardens-seal', kind: 'pedestal', relic: 'wardens-seal', at: [6, 10] },
    { id: 'pedestal-tallyknife', kind: 'pedestal', relic: 'tallyknife', at: [7, 10] },
    { id: 'pedestal-thornsplitter', kind: 'pedestal', relic: 'thornsplitter', at: [8, 10] },
    { id: 'pedestal-rotwood-circlet', kind: 'pedestal', relic: 'rotwood-circlet', at: [9, 10] },
    { id: 'pedestal-thornwatch-hood', kind: 'pedestal', relic: 'thornwatch-hood', at: [10, 10] },
    { id: 'pedestal-thornwatch-jerkin', kind: 'pedestal', relic: 'thornwatch-jerkin', at: [11, 10] },
    { id: 'pedestal-thornwatch-boots', kind: 'pedestal', relic: 'thornwatch-boots', at: [12, 10] },
    { id: 'pedestal-thornwreath', kind: 'pedestal', relic: 'thornwreath', at: [13, 10] },
    { id: 'pedestal-briarfang', kind: 'pedestal', relic: 'briarfang', at: [14, 10] },
    { id: 'pedestal-lightfingers', kind: 'pedestal', relic: 'lightfingers', at: [3, 12] },
    { id: 'pedestal-hartshorn', kind: 'pedestal', relic: 'hartshorn', at: [4, 12] },
    { id: 'pedestal-mosswatch-lantern', kind: 'pedestal', relic: 'mosswatch-lantern', at: [5, 12] },
    { id: 'pedestal-watchkeepers-kettle', kind: 'pedestal', relic: 'watchkeepers-kettle', at: [6, 12] },
    { id: 'pedestal-mire-pearl', kind: 'pedestal', relic: 'mire-pearl', at: [7, 12] },
    { id: 'pedestal-dawnbell', kind: 'pedestal', relic: 'dawnbell', at: [8, 12] },
    { id: 'pedestal-rootsong', kind: 'pedestal', relic: 'rootsong', at: [9, 12] },
    { id: 'pedestal-oathshield', kind: 'pedestal', relic: 'oathshield', at: [10, 12] },
    { id: 'pedestal-isoldes-oath', kind: 'pedestal', relic: 'isoldes-oath', at: [11, 12] },
    { id: 'pedestal-ichor-mask', kind: 'pedestal', relic: 'ichor-mask', at: [13, 12] },
    { id: 'pedestal-first-seed', kind: 'pedestal', relic: 'first-seed', at: [14, 12] },
    { id: 'pedestal-vale-gauntlets', kind: 'pedestal', relic: 'vale-gauntlets', at: [15, 12] },
    { id: 'keep-intro', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', once: true, if: { not: { flag: 'intro-done' } }, dialogue: 'keep-intro' },
    { id: 'council', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', once: true, if: { flag: 'act1-complete' }, dialogue: 'council' },
  ],
  exits: [
    { id: 'hall-s', area: [12, 13, 12, 13], to: 'keep', anchor: 'from-hall' },
  ],
  anchors: { start: [12, 6, 'n'], 'from-court': [12, 12, 'n'], 'v1:hearthstone-keep': [12, 6, 'n'], 'v1:keep-vault': [18, 7, 'e'] },
  roam: null,
});
