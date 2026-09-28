// The Great Hall (M3 spec §2.1, §2.3). The Eternal Hearth burns in a chimney-breast on the north wall
// with Fenwick and Isolde either side; the war-room corner (Ladder board, war-table) is walled off at the
// top left; Sneck stands in the vault doorway on the east wall; the reliquary gallery fills the south
// half: 24 pedestals in codex order on rows 10 and 12, a walkway on row 11 and a central aisle at x=12
// from the courtyard door straight up to the hearth.
// Layout notes: the hearthfire sits at (12,4), next to its stand (12,5), so `interact` from the stand
// reaches it (spec (12,3), moved 1). Codex 10-12 and 22-24 sit at x=13-15 (moved 1) to keep the aisle
// and `from-court` (12,12) clear.
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep-hall', name: 'The Great Hall', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: true, dark: false,
  lore: [[540, 385, 12, 7]],
  w: 24, h: 14,
  rows: [
    '###*#################*##', //  0
    '#_____#:::#####::::::::#', //  1
    '#_____#:::#####::::::::#', //  2
    '#_____::::*###*::::::::#', //  3
    '#_____:::::::::::::::::#', //  4
    '#:::::::::::::::::::####', //  5
    '#:::::::#:::::::#:::#kk#', //  6
    '#:::::::::::::::::::+kk#', //  7
    '#:::::::#:::::::#:::#kk#', //  8
    '#:::::::::::::::::::####', //  9
    '#:_______________::::::#', // 10
    '#:_______________::::::#', // 11
    '#:_______________::::::#', // 12
    '##########*#+#*#########', // 13
  ],
  entities: [
    { id: 'hearthstone-keep', kind: 'hearthfire', at: [12, 4], stand: [12, 5, 'n'] },
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
    { id: 'pedestal-thornwatch-boots', kind: 'pedestal', relic: 'thornwatch-boots', at: [13, 10] },
    { id: 'pedestal-thornwreath', kind: 'pedestal', relic: 'thornwreath', at: [14, 10] },
    { id: 'pedestal-briarfang', kind: 'pedestal', relic: 'briarfang', at: [15, 10] },
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
    { id: 'keep-vault-cradle', kind: 'sign', at: [22, 7], text: 'The Seal\'s cradle: old velvet that still holds its shape, and a fresh knife-scratch where Sneck worked it loose.' },
    // guarded by the flags their scenes set, not by `once` (a reload mid-scene plays it again)
    { id: 'keep-intro', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', if: { not: { flag: 'intro-done' } }, dialogue: 'keep-intro' },
    { id: 'council', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', if: { all: [{ flag: 'act1-complete' }, { not: { flag: 'council-done' } }] }, dialogue: 'council' },
  ],
  exits: [
    { id: 'hall-s', area: [12, 13, 12, 13], to: 'keep', anchor: 'from-hall' },
  ],
  anchors: { start: [12, 6, 'n'], 'from-court': [12, 12, 'n'], 'v1:hearthstone-keep': [12, 6, 'n'], 'v1:keep-vault': [18, 7, 'e'] },
  roam: null,
});
