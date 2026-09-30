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
    '#:_______________::::::+', // 11
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
    // M4 (spec §3.6): the second council, once both Sunscorch Brands are won (flag-guarded, never `once`)
    { id: 'council-2', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', if: { all: [{ flag: 'sunscorch-complete' }, { not: { flag: 'council-2-done' } }] }, dialogue: 'council-2' },
    // M5 (spec §3.6): the third council, once both Ironspire Brands are won (flag-guarded, never `once`)
    { id: 'council-3', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', if: { all: [{ flag: 'ironspire-complete' }, { not: { flag: 'council-3-done' } }] }, dialogue: 'council-3' },
    // M6 (spec §3.6): the fourth council, once both Gloomfen Brands are won (flag-guarded, never `once`); it ends Act II
    { id: 'council-4', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', if: { all: [{ flag: 'gloomfen-complete' }, { not: { flag: 'council-4-done' } }] }, dialogue: 'council-4' },
    // M7 (spec A5, §2.4): the fifth council, the Opening, once the fourth has sat (flag-guarded, never `once`)
    { id: 'council-5', kind: 'trigger', area: [0, 0, 23, 13], on: 'enter', if: { all: [{ flag: 'council-4-done' }, { not: { flag: 'council-5-done' } }] }, dialogue: 'council-5' },
    // M7 (spec §2.4): the four soot-sealed boxes on the vault's back row, then opened; and the stair that was never
    // there, down through the vault floor (a prop on the exit's tiles, not solid: no row of the painted hall changes).
    // The way from the vault door to the stair, (20,7) to (21,7) to (21,8), stays open.
    { id: 'vault-boxes', kind: 'prop', prop: 'vault-boxes', area: [21, 6, 22, 6], solid: true, if: { all: [{ flag: 'council-4-done' }, { not: { flag: 'council-5-done' } }] } },
    { id: 'vault-boxes-open', kind: 'prop', prop: 'vault-boxes-open', area: [21, 6, 22, 6], solid: true, if: { flag: 'council-5-done' } },
    { id: 'vault-stair', kind: 'prop', prop: 'vault-stair', area: [21, 8, 22, 8], if: { flag: 'council-5-done' } },
  ],
  exits: [
    { id: 'hall-s', area: [12, 13, 12, 13], to: 'keep', anchor: 'from-hall' },
    // M4: the door to the Sunscorch Gallery, the reliquary's second room
    { id: 'hall-e', area: [23, 11, 23, 11], to: 'keep-gallery', anchor: 'from-hall' },
    // M7 (spec A5, §2.2): the vault floor opens onto the stair down to the Hollow Hall once the fifth council has sat.
    // STUB from the M7 scaffold: its sealed words are a first draft (P2 and P3 word them).
    { id: 'hall-down', area: [21, 8, 22, 8], to: 'hollow-hall', anchor: 'from-vault', gate: { flag: 'council-5-done' },
      sealed: { region: 'below', text: 'The vault floor is old stone, cold as a well. Something under it is colder.', hint: 'It opens once the Council has sat a fifth time.' } },
  ],
  anchors: { start: [12, 6, 'n'], 'from-court': [12, 12, 'n'], 'v1:hearthstone-keep': [12, 6, 'n'], 'v1:keep-vault': [18, 7, 'e'], 'from-gallery': [22, 11, 'w'], 'from-below': [21, 7, 'w'] },
  roam: null,
});
