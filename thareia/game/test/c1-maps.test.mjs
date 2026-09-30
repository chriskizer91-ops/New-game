// Thareia (T2): Chapter 1's walked maps, the nine th-* copies of the old Verdant Wilds maps and the cliff den
// (design/09-t2-spec.md sections 2.1-2.9, th-briarmaw-den in 2.11, the checks of 2.12 and 7.1 items 1-2).
// Each copy keeps the old map's rows and draws its painting (`paint`); every id and coordinate of the spec is placed
// where the spec puts it; everything is in bounds and stands where it can be walked to; lock, gate, chest and trigger
// ids are unique across all maps (old ones too); hearthfires touch their stand; and the story's gates hold the main
// path shut until the story opens them, walked through the engine (rules/world.js canWalk) on synthetic games.
// Owner: M.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, TH_MAP_IDS, anchor } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { LOCKS } from '../src/data/locks.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { newGame } from '../src/rules/gauntlet.js';
import { canWalk } from '../src/rules/world.js';

const COPIES = ['th-thornhollow', 'th-thornway', 'th-eldergrove', 'th-heartroot-1', 'th-mossfall', 'th-mosswatch-1',
  'th-mosswatch-2', 'th-hindwood', 'th-fawnrest', 'th-briarmaw-den'];
const GATE_LOOKS = new Set(['bramble', 'rot-knot', 'barred-gate', 'door', 'chain', 'thornwall']);
const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const STEPS = Object.entries(DIRS);

const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
const cellsOf = e => { const [x0, y0, x1, y1] = areaOf(e), out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]); return out; };
const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
const walkable = (m, x, y) => inside(m, x, y) && !tileOf(m.rows[y][x]).solid;
const find = (mapId, id) => MAPS[mapId].entities.find(e => e.id === id) || MAPS[mapId].exits.find(e => e.id === id);

// the spec's placements, id by id: [map, id, kind, at | area, extra fields that must match]
const SPEC = [
  // 2.1 th-thornhollow
  ['th-thornhollow', 'th-hearth', 'hearthfire', [12, 12], { stand: [12, 13, 'n'] }],
  ['th-thornhollow', 'th-aldric', 'npc', [16, 8], { npc: 'aldric', face: 's' }],
  ['th-thornhollow', 'th-dael', 'npc', [7, 6], { npc: 'th-ranger', face: 's' }],
  ['th-thornhollow', 'th-notices', 'sign', [9, 5], { talk: 'c1-board', talkIf: { flag: 'c1-dael' }, text: 'RANGERS\' NOTICES.' }],
  ['th-thornhollow', 'th-outfitter', 'npc', [18, 15], { npc: 'th-outfitter', face: 's' }],
  ['th-thornhollow', 'th-trader', 'npc', [8, 17], { npc: 'th-trader', face: 'n' }],
  ['th-thornhollow', 'th-tt-lookout', 'lookout', [2, 3], {}],
  ['th-thornhollow', 'th-tt-stockade', 'gate', [20, 18, 20, 18], { look: 'barred-gate', open: { flag: 's2-done' } }],
  ['th-thornhollow', 'th-tt-cache', 'chest', [21, 19], {}],
  // 2.2 th-thornway
  ['th-thornway', 'c1-tw-enter', 'trigger', [12, 50, 16, 54], { on: 'enter', dialogue: 'c1-tw-enter' }],
  ['th-thornway', 'c1-runner-camp', 'encounter', [11, 40], { enc: 'c1-runner-camp', mode: 'block', face: 's' }],
  ['th-thornway', 'th-tw-barricade', 'gate', [12, 40, 14, 40], { look: 'barred-gate', open: { beaten: 'c1-runner-camp' }, text: 'A smugglers\' barricade of carts and rope.' }],
  ['th-thornway', 'th-tw-strongbox', 'chest', [2, 42], { if: { beaten: 'c1-runner-camp' } }],
  ['th-thornway', 'th-tw-goblins', 'npc', [22, 43], { npc: 'th-goblin', face: 'w', if: { not: { flag: 's7-chased' } } }],
  ['th-thornway', 'c1-snag-wallow', 'encounter', [21, 33, 23, 34], { at: [22, 34], mode: 'lair' }],
  ['th-thornway', 'th-tw-boulder-chest', 'chest', [3, 14], { if: { beaten: 'c1-snag-wallow' } }],
  ['th-thornway', 'th-tw-bramble-cache', 'chest', [8, 24], {}],
  ['th-thornway', 'th-tw-thorn-chest', 'chest', [27, 28], { if: { flag: 'c1-taela-guest' } }],
  ['th-thornway', 'c1-tw-whisper', 'trigger', [19, 15, 24, 17], { dialogue: 'c1-tw-whisper' }],
  ['th-thornway', 'c1-bramble-deep', 'encounter', [15, 20], { mode: 'block', face: 's' }],
  ['th-thornway', 'th-tw-bramble', 'gate', [16, 18, 20, 20], { look: 'bramble', open: { beaten: 'c1-bramble-deep' }, text: 'Thorns gone black and wet with Rot.' }],
  ['th-thornway', 'c1-tw-boots', 'trigger', [14, 19, 18, 22], { dialogue: 'c1-tw-boots' }],
  ['th-thornway', 'th-tw-hearth', 'hearthfire', [22, 9], { stand: [22, 10, 'n'] }],
  ['th-thornway', 'tw-s', 'exit', [13, 55, 14, 55], { to: 'th-thornhollow', anchor: 'from-thornway' }],
  ['th-thornway', 'tw-n', 'exit', [14, 0, 15, 0], { to: 'th-eldergrove', anchor: 'from-thornway' }],
  ['th-thornway', 'tw-den', 'exit', [26, 4, 26, 4], { to: 'th-briarmaw-den', anchor: 'from-thornway', gate: { flag: 's6-open' } }],
  // 2.3 th-eldergrove
  ['th-eldergrove', 'c1-eg-arrive', 'trigger', [0, 0, 29, 25], { on: 'enter', if: { not: { flag: 'c1-thornway' } }, dialogue: 'c1-eg-arrive' }],
  ['th-eldergrove', 'th-taela', 'npc', [16, 4], { npc: 'taela', face: 's', if: { not: { flag: 'c1-taela-guest' } } }],
  ['th-eldergrove', 'c1-eg-shard', 'trigger', [13, 3, 18, 4], { on: 'step', dialogue: 'c1-shard-glows', if: { all: [{ flag: 'c1-met-taela' }, { not: { flag: 'c1-shard-roots' } }] } }],
  ['th-eldergrove', 'c1-grove-circle', 'encounter', [4, 5, 4, 6], { at: [4, 6], mode: 'lair', face: 'e', talk: 'c1-grove-circle-before', if: { flag: 'c1-taela-guest' } }],
  ['th-eldergrove', 'th-eg-acolyte', 'npc', [3, 7], { npc: 'th-acolyte', face: 'e', if: { not: { beaten: 'c1-grove-circle' } } }],
  ['th-eldergrove', 'th-miravel', 'npc', [17, 11], { npc: 'th-miravel', face: 's' }],
  ['th-eldergrove', 'th-scholar', 'npc', [12, 19], { npc: 'th-scholar', face: 'e' }],
  ['th-eldergrove', 'th-eg-supplier', 'npc', [20, 18], { npc: 'th-eg-supplier', face: 'n' }],
  ['th-eldergrove', 'th-eg-bryn-house', 'sign', [5, 12], {}],
  ['th-eldergrove', 'th-eg-hearth', 'hearthfire', [13, 15], { stand: [13, 16, 'n'] }],
  ['th-eldergrove', 'th-eldest-door', 'gate', [15, 2, 15, 2], { look: 'door', open: { beaten: 'c1-grove-circle' } }],
  ['th-eldergrove', 'th-eg-brook', 'gate', [24, 12, 24, 13], { open: { flag: 'c1-taela-guest' } }],
  ['th-eldergrove', 'th-eg-brook-chest', 'chest', [26, 12], {}],
  ['th-eldergrove', 'th-eg-hire', 'npc', [16, 23], { npc: 'th-hire-eg', face: 'w' }],
  ['th-eldergrove', 'th-eg-skiff-post', 'sign', [13, 22], { text: 'DUSTWIND SKIFF HIRE. Licensed docks only. No night flying.' }],
  ['th-eldergrove', 'eg-s', 'exit', [14, 25, 15, 25], { to: 'th-thornway', anchor: 'from-eldergrove' }],
  ['th-eldergrove', 'eg-tree', 'exit', [15, 1, 15, 1], { to: 'th-heartroot-1', anchor: 'from-tree' }],
  ['th-eldergrove', 'eg-e', 'exit', [29, 8, 29, 9], { to: 'th-hindwood', anchor: 'from-eldergrove', gate: { flag: 'c1-fawnrest' } }],
  // 2.4 th-heartroot-1
  ['th-heartroot-1', 'c1-hr-descent', 'trigger', [11, 21, 13, 22], { dialogue: 'c1-hr-descent' }],
  ['th-heartroot-1', 'th-hr-grub-knot', 'gate', [11, 20, 12, 20], { look: 'rot-knot', open: { beaten: 'c1-roots-grubs' } }],
  ['th-heartroot-1', 'c1-roots-grubs', 'encounter', [13, 20], { mode: 'block' }],
  ['th-heartroot-1', 'th-hr-coal', 'hearthfire', [4, 20], { stand: [4, 21, 'n'], cold: true, coldTalk: 'c1-hr-coal' }],
  ['th-heartroot-1', 'th-hr-ichor-a', 'lock', [8, 12, 15, 14], { lock: 'ichor' }],
  ['th-heartroot-1', 'th-hr-ichor-b', 'lock', [16, 6, 19, 8], { lock: 'ichor' }],
  ['th-heartroot-1', 'c1-hr-hot-lake', 'trigger', [11, 15, 12, 15], { once: true, dialogue: 'c1-hr-hot-lake' }],
  ['th-heartroot-1', 'c1-missing-patrol', 'encounter', [19, 11], { mode: 'block', if: { flag: 's2-open' } }],
  ['th-heartroot-1', 'th-hr-sick-rangers', 'npc', [20, 14], { npc: 'th-sick-ranger', if: { all: [{ beaten: 'c1-missing-patrol' }, { not: { flag: 's2-healed' } }] } }],
  ['th-heartroot-1', 'th-hr-rot-knot', 'gate', [2, 12, 2, 12], { look: 'rot-knot', open: { flag: 'c1-shard-roots' } }],
  ['th-heartroot-1', 'th-hr-cache', 'chest', [1, 9], {}],
  ['th-heartroot-1', 'th-hr-ichor-chest', 'chest', [17, 7], {}],
  ['th-heartroot-1', 'c1-roots-sapwight', 'encounter', [13, 1], { mode: 'block' }],
  ['th-heartroot-1', 'c1-hr-spring', 'trigger', [11, 2, 13, 2], { on: 'step', dialogue: 'c1-warm-water' }],
  ['th-heartroot-1', 'th-hr-spring-sample', 'sign', [10, 2], { talk: 'c1-sample-spring', talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-spring' } }] }, text: 'Warm water wells up between the roots.' }],
  ['th-heartroot-1', 'h1-s', 'exit', [12, 23, 12, 23], { to: 'th-eldergrove', anchor: 'from-heartroot' }],
  ['th-heartroot-1', 'h1-n', 'exit', [12, 0, 12, 0], { to: undefined }],
  // 2.5 th-mossfall
  ['th-mossfall', 'c1-mf-arrive', 'trigger', [46, 9, 50, 11], { once: true, dialogue: 'c1-mf-arrive' }],
  ['th-mossfall', 'th-mf-cairn', 'hearthfire', [30, 7], { stand: [30, 8, 'n'] }],
  ['th-mossfall', 'c1-mire-bog', 'encounter', [24, 14], { mode: 'pack' }],
  ['th-mossfall', 'th-mf-runner-crate', 'chest', [16, 4], {}],
  ['th-mossfall', 'th-mf-ford-chain', 'gate', [41, 13, 41, 13], { look: 'chain', open: { beaten: 'c1-mf-runners' } }],
  ['th-mossfall', 'c1-mf-runners', 'encounter', [42, 13], { mode: 'block' }],
  ['th-mossfall', 'th-mf-islet-ford', 'lock', [41, 14], { lock: 'stream' }],
  ['th-mossfall', 'c1-mf-islet', 'trigger', [38, 15, 45, 15], { once: true, dialogue: 'c1-mf-islet' }],
  ['th-mossfall', 'c1-mire-shrine', 'encounter', [41, 17, 43, 18], { at: [42, 18], mode: 'lair' }],
  ['th-mossfall', 'th-mf-bramble-cache', 'chest', [46, 3], { lock: 'bramble' }],
  ['th-mossfall', 'th-mf-reed-cache', 'chest', [9, 18], { loot: { gold: 120 }, hidden: true }],
  ['th-mossfall', 'th-mf-shore-sample', 'sign', [36, 14], { talk: 'c1-sample-coast', talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-coast' } }] } }],
  ['th-mossfall', 'th-mw-hire', 'npc', [6, 9], { npc: 'th-hire-mw', face: 'e' }],
  ['th-mossfall', 'mf-e', 'exit', [51, 10, 51, 11], { to: 'th-thornhollow', anchor: 'from-mossfall' }],
  ['th-mossfall', 'mf-tower', 'exit', [3, 8, 3, 8], { to: 'th-mosswatch-1', anchor: 'from-mossfall' }],
  ['th-mossfall', 'mf-fen-stair', 'exit', [20, 21, 21, 21], { to: undefined }],
  // 2.6 th-mosswatch-1
  ['th-mosswatch-1', 'c1-mw-arrive', 'trigger', [5, 13, 8, 14], { once: true, dialogue: 'c1-mw-arrive' }],
  ['th-mosswatch-1', 'th-garret', 'npc', [4, 11], { npc: 'th-garret', face: 'e', if: { not: { beaten: 'c1-mw-lantern' } } }],
  ['th-mosswatch-1', 'c1-mw-stair', 'encounter', [7, 4], { mode: 'block', face: 's', talk: 'c1-mw-stair-before' }],
  ['th-mosswatch-1', 'th-mw-ledger-door', 'gate', [10, 6, 10, 6], { look: 'door', open: { flag: 'c1-mosswatch' } }],
  ['th-mosswatch-1', 'th-mw-manifest', 'chest', [11, 3], {}],
  ['th-mosswatch-1', 'th-mw-hearth', 'hearthfire', [1, 11], { stand: [2, 11, 'w'] }],
  ['th-mosswatch-1', 'th-mw-alcove', 'chest', [1, 3], {}],
  ['th-mosswatch-1', 'th-mw-crate', 'chest', [12, 12], {}],
  ['th-mosswatch-1', 'th-wenna', 'npc', [11, 9], { npc: 'th-wenna', face: 'w', if: { flag: 's1-open' } }],
  ['th-mosswatch-1', 'mw1-door', 'exit', [6, 15, 7, 15], { to: 'th-mossfall', anchor: 'from-tower' }],
  ['th-mosswatch-1', 'mw1-up', 'exit', [7, 2, 7, 2], { to: 'th-mosswatch-2', anchor: 'from-stair' }],
  // 2.7 th-mosswatch-2
  ['th-mosswatch-2', 'c1-mw2-arrive', 'trigger', [5, 8, 7, 8], { once: true, dialogue: 'c1-mw2-arrive' }],
  ['th-mosswatch-2', 'c1-mw-lantern', 'encounter', [6, 4, 6, 5], { at: [6, 5], mode: 'lair', face: 's', talk: 'c1-mw-lantern-before' }],
  ['th-mosswatch-2', 'th-mw-signal-light', 'light', [6, 5], { radius: 3, if: { not: { beaten: 'c1-mw-lantern' } } }],
  ['th-mosswatch-2', 'th-mw-fire', 'hearthfire', [6, 2], { stand: [6, 3, 'n'], cold: true, coldUntil: { beaten: 'c1-mw-lantern' } }],
  ['th-mosswatch-2', 'th-garret-up', 'npc', [4, 3], { npc: 'th-garret', face: 'e', if: { beaten: 'c1-mw-lantern' } }],
  ['th-mosswatch-2', 'th-mw-lookout', 'lookout', [10, 2], {}],
  ['th-mosswatch-2', 'th-mw-cache', 'chest', [1, 3], {}],
  ['th-mosswatch-2', 'th-mw-oil', 'chest', [3, 10], {}],
  ['th-mosswatch-2', 'mw2-down', 'exit', [6, 11, 6, 11], { to: 'th-mosswatch-1', anchor: 'from-lamp' }],
  // 2.8 th-hindwood
  ['th-hindwood', 'c1-hw-roots', 'trigger', [20, 29, 23, 31], { once: true, dialogue: 'c1-hw-roots' }],
  ['th-hindwood', 'c1-hw-ford', 'trigger', [8, 22, 12, 22], { once: true, dialogue: 'c1-hw-ford' }],
  ['th-hindwood', 'th-hw-cairn', 'hearthfire', [10, 25], { stand: [10, 26, 'n'] }],
  ['th-hindwood', 'c1-feral-druid', 'encounter', [18, 28], { mode: 'block', talk: 'c1-burners', if: { not: { flag: 's3-talked' } } }],
  ['th-hindwood', 'c1-glowcaps', 'encounter', [25, 22], { mode: 'block' }],
  ['th-hindwood', 'th-hw-bridge-knot', 'gate', [26, 21, 27, 21], { look: 'rot-knot', open: { beaten: 'c1-glowcaps' } }],
  ['th-hindwood', 'th-hw-ford-knot', 'gate', [9, 20, 12, 20], { look: 'rot-knot', open: { beaten: 'c1-glowcaps' }, text: 'Black roots choke the ford. Spores drift off them.' }],
  ['th-hindwood', 'c1-gloamwing', 'encounter', [21, 11, 23, 12], { at: [22, 12], mode: 'lair', if: { flag: 'c1-node-cooled' } }],
  ['th-hindwood', 'th-hw-thornwall', 'gate', [27, 7, 28, 7], { look: 'thornwall', open: { flag: 'c1-taela-joined' } }],
  ['th-hindwood', 'th-hw-thorn-chest', 'chest', [28, 6], {}],
  ['th-hindwood', 'th-hw-pond-chest', 'chest', [2, 33], {}],
  ['th-hindwood', 'th-hw-glade-chest', 'chest', [3, 14], {}],
  ['th-hindwood', 'th-hw-sign', 'sign', [27, 33], { text: 'Hindwood road. Ford west, bridge east. Fawnrest ahead.' }],
  ['th-hindwood', 'th-deer-1', 'sign', [5, 7], { prop: 'deer', talk: 'c1-deer-1', if: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-1' } }] } }],
  ['th-hindwood', 'th-deer-2', 'sign', [28, 25], { prop: 'deer', talk: 'c1-deer-2', if: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-2' } }] } }],
  ['th-hindwood', 'hw-se', 'exit', [31, 34, 31, 35], { to: 'th-thornhollow', anchor: 'from-hindwood' }],
  ['th-hindwood', 'hw-n', 'exit', [15, 0, 16, 0], { to: 'th-fawnrest', anchor: 'from-hindwood', gate: { flag: 'c1-hindwood' } }],
  ['th-hindwood', 'hw-w', 'exit', [0, 8, 0, 9], { to: 'th-eldergrove', anchor: 'from-hindwood', gate: { flag: 'c1-fawnrest' } }],
  // 2.9 th-fawnrest
  ['th-fawnrest', 'c1-fr-arrive', 'trigger', [9, 15, 12, 18], { once: true, dialogue: 'c1-fr-arrive' }],
  ['th-fawnrest', 'th-fr-camp', 'hearthfire', [7, 12], { stand: [7, 13, 'n'] }],
  ['th-fawnrest', 'th-fr-stone', 'hearthfire', [11, 6], { stand: [11, 7, 'n'], cold: true, coldUntil: { flag: 'c1-node-cooled' } }],
  ['th-fawnrest', 'th-keeper', 'npc', [13, 8], { npc: 'th-keeper', face: 's' }],
  ['th-fawnrest', 'th-pilgrim-1', 'npc', [5, 12], { npc: 'th-pilgrim', face: 's' }],
  ['th-fawnrest', 'th-pilgrim-2', 'npc', [8, 14], { npc: 'th-pilgrim', face: 's' }],
  ['th-fawnrest', 'th-burner-fr', 'npc', [9, 12], { npc: 'th-burner-fr', face: 'w', if: { all: [{ flag: 's3-talked' }, { not: { flag: 's3-done' } }] } }],
  ['th-fawnrest', 'c1-fr-court', 'trigger', [9, 5, 13, 8], { on: 'step', dialogue: 'c1-stair', if: { all: [{ flag: 'c1-fawnrest' }, { not: { flag: 'c1-stair-found' } }] } }],
  ['th-fawnrest', 'th-fr-slab', 'prop', [11, 4], { prop: 'open-slab', if: { flag: 'c1-stair-found' } }],
  ['th-fawnrest', 'c1-vesper', 'encounter', [16, 13], { mode: 'block', face: 'w', talk: 'c1-vesper', if: { not: { flag: 'c1-vesper-gone' } } }],
  ['th-fawnrest', 'th-fr-offering', 'chest', [3, 3], { lock: undefined }],
  ['th-fawnrest', 'th-fr-pilgrim-cache', 'chest', [1, 12], {}],
  ['th-fawnrest', 'th-fr-meadow', 'chest', [20, 3], {}],
  ['th-fawnrest', 'th-fr-pool-sample', 'sign', [4, 15], { talk: 'c1-sample-pool', talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-pool' } }] }, text: 'The pool steams. It is too hot to touch.' }],
  ['th-fawnrest', 'th-fr-deer-1', 'prop', [16, 4], { prop: 'deer', if: { flag: 's9-done' } }],
  ['th-fawnrest', 'th-fr-deer-2', 'prop', [18, 6], { prop: 'deer', if: { flag: 's9-done' } }],
  ['th-fawnrest', 'fr-s', 'exit', [10, 19, 11, 19], { to: 'th-hindwood', anchor: 'from-fawnrest' }],
  ['th-fawnrest', 'fr-node', 'exit', [11, 4, 11, 4], { to: 'th-fawnrest-node', anchor: 'from-fawnrest', gate: { flag: 'c1-stair-found' } }],
  ['th-fawnrest', 'fr-highfold', 'exit', [21, 9, 21, 10], { to: undefined }],
  // 2.11 th-briarmaw-den
  ['th-briarmaw-den', 'c1-dael-bounty', 'encounter', [6, 3, 10, 6], { at: [8, 5], mode: 'lair' }],
  ['th-briarmaw-den', 'c1-den-enter', 'trigger', [7, 14, 8, 14], {}],
  ['th-briarmaw-den', 'th-den-chest-w', 'chest', [3, 4], {}],
  ['th-briarmaw-den', 'th-den-chest-e', 'chest', [12, 4], {}],
  ['th-briarmaw-den', 'c1-den-pool', 'trigger', [4, 9, 4, 9], { dialogue: 'c1-den-pool' }],
  ['th-briarmaw-den', 'den-s', 'exit', [7, 17, 8, 17], { to: 'th-thornway', anchor: 'from-den' }],
  // 2.1 exits
  ['th-thornhollow', 'tt-n', 'exit', [11, 0, 12, 0], { to: 'th-thornway', anchor: 'from-thornhollow', gate: { flag: 'c1-courier' } }],
  ['th-thornhollow', 'tt-w', 'exit', [0, 10, 0, 11], { to: 'th-mossfall', anchor: 'from-thornhollow', gate: { flag: 'c1-west-open' } }],
  ['th-thornhollow', 'tt-ne', 'exit', [23, 3, 23, 4], { to: 'th-hindwood', anchor: 'from-thornhollow', gate: { flag: 'c1-to-fawnrest' } }],
  ['th-thornhollow', 'tt-s', 'exit', [11, 21, 12, 21], { to: 'th-landing', anchor: 'from-town', gate: undefined }],
];
const ANCHORS = {
  'th-thornhollow': { 'from-skiff': [12, 19, 'n'], 'from-landing': [12, 19, 'n'], 'from-thornway': [12, 2, 's'], 'from-mossfall': [2, 10, 'e'], 'from-hindwood': [21, 4, 'w'] },
  'th-thornway': { 'from-thornhollow': [14, 53, 'n'], 'from-eldergrove': [14, 2, 's'], 'from-den': [26, 6, 's'], 'v1:c1-snag-wallow': [21, 36, 'e'], 'v1:c1-bramble-deep': [15, 23, 'n'] },
  'th-eldergrove': { 'from-thornway': [14, 23, 'n'], 'from-heartroot': [15, 4, 's'], 'from-hindwood': [27, 8, 'w'], 'from-skiff': [15, 22, 'n'] },
  'th-heartroot-1': { 'from-tree': [12, 21, 'n'], 'from-chamber': [12, 2, 's'] },
  'th-mossfall': { 'from-thornhollow': [49, 10, 'w'], 'from-tower': [3, 9, 's'], 'from-skiff': [7, 9, 'w'] },
  'th-mosswatch-1': { 'from-mossfall': [6, 13, 'n'], 'from-lamp': [7, 3, 's'], 'from-cove': [6, 13, 'n'] },
  'th-mosswatch-2': { 'from-stair': [6, 9, 'n'] },
  'th-hindwood': { 'from-thornhollow': [29, 34, 'w'], 'from-fawnrest': [15, 2, 's'], 'from-eldergrove': [2, 8, 'e'] },
  'th-fawnrest': { 'from-hindwood': [11, 17, 'n'], 'from-node': [11, 5, 's'], 'from-skiff': [14, 10, 'w'] },
  'th-briarmaw-den': { 'from-thornway': [8, 15, 'n'] },
};

test('the ten copies keep the old rows, draw the old painting and sit in the Verdant Wilds', () => {
  for (const id of COPIES) {
    const m = MAPS[id];
    assert.ok(m && TH_MAP_IDS.includes(id), `${id} is registered`);
    assert.ok(m.paint && MAPS[m.paint], `${id} draws a painting`);
    assert.equal(m.paint, id.slice(3), `${id} draws ${id.slice(3)}`);
    assert.deepEqual(m.rows, MAPS[m.paint].rows, `${id}: rows equal to ${m.paint}`);
    assert.equal(m.w, MAPS[m.paint].w); assert.equal(m.h, MAPS[m.paint].h);
    assert.equal(m.region, 'verdant', id);
    assert.equal(m.rows.length, m.h, id);
    for (const r of m.rows) assert.equal(r.length, m.w, id);
  }
});

test('every id of spec sections 2.1-2.9 and the den is placed where the spec puts it', () => {
  for (const [mapId, id, kind, where, extra] of SPEC) {
    const e = find(mapId, id);
    assert.ok(e, `${mapId}/${id} is placed`);
    if (kind === 'exit') {
      assert.ok(MAPS[mapId].exits.includes(e), `${mapId}/${id} is an exit`);
      assert.deepEqual(e.area, where, `${mapId}/${id} area`);
    } else {
      assert.equal(e.kind, kind, `${mapId}/${id} kind`);
      assert.deepEqual(where.length === 4 ? e.area : e.at, where, `${mapId}/${id} at`);
    }
    for (const [k, v] of Object.entries(extra)) assert.deepEqual(e[k], v, `${mapId}/${id}.${k}`);
  }
  for (const [mapId, list] of Object.entries(ANCHORS)) assert.deepEqual(MAPS[mapId].anchors, list, `${mapId} anchors`);
  // dropped from the old maps (spec 2.2-2.9): nothing of the old game's rides along
  const ids = COPIES.flatMap(id => [...MAPS[id].entities, ...MAPS[id].exits].map(e => e.id));
  for (const old of ['tw-thornwall', 'tw-crown-n', 'tw-snag-boulder', 'tw-boots', 'th-eg-pulse', 'c1-eg-pulse', 'th-hr-sap-knot', 'hr1-tappers', 'hollowed-patrol', 'hw-rope', 'th-landing']) {
    assert.ok(!ids.includes(old), `${old} is dropped`);
  }
});

test('everything in bounds; anchors, people, chests and fights on walkable ground; hearthfires touch their stand', () => {
  for (const id of COPIES) {
    const m = MAPS[id];
    for (const [name, [x, y, face]] of Object.entries(m.anchors)) { assert.ok(walkable(m, x, y), `${id}:${name} walkable`); assert.ok(DIRS[face], `${id}:${name} face`); }
    const seen = new Set();
    for (const e of m.entities) {
      assert.ok(!seen.has(e.id), `${id}/${e.id} is one entity`); seen.add(e.id);
      for (const [x, y] of cellsOf(e)) assert.ok(inside(m, x, y), `${id}/${e.id} in bounds`);
      if (e.at) assert.ok(inside(m, ...e.at), `${id}/${e.id} at in bounds`);
      if (['npc', 'chest', 'encounter'].includes(e.kind)) assert.ok(walkable(m, ...e.at), `${id}/${e.id} stands on walkable ground`);
      // a sign, lookout or prop is read from a walkable tile beside it
      if (['sign', 'lookout', 'hearthfire'].includes(e.kind)) assert.ok(STEPS.some(([, [dx, dy]]) => walkable(m, e.at[0] + dx, e.at[1] + dy)), `${id}/${e.id} can be reached`);
      if (e.kind === 'gate' || e.kind === 'trigger' || e.kind === 'lock') assert.ok(cellsOf(e).some(([x, y]) => walkable(m, x, y)), `${id}/${e.id} covers walkable ground`);
      if (e.kind === 'hearthfire') {
        const [sx, sy, face] = e.stand;
        assert.ok(walkable(m, sx, sy), `${id}/${e.id} stand walkable`);
        assert.deepEqual([sx + DIRS[face][0], sy + DIRS[face][1]], e.at, `${id}/${e.id} touches its stand`);
      }
      if (e.kind === 'gate') {
        assert.ok(e.open, `${id}/${e.id} opens on the story`);
        assert.ok(!e.look || GATE_LOOKS.has(e.look), `${id}/${e.id}: look ${e.look}`);
        assert.ok(e.text, `${id}/${e.id} says what it is`);
      }
      if (e.kind === 'lock') assert.ok(LOCKS[e.lock], `${id}/${e.id}: lock ${e.lock}`);
      if (e.kind === 'chest') { assert.ok(e.loot, `${id}/${e.id} holds loot`); if (e.lock) assert.ok(LOCKS[e.lock], `${id}/${e.id}: lock ${e.lock}`); }
      if (e.kind === 'trigger') { assert.ok(['enter', 'step'].includes(e.on), `${id}/${e.id}: on`); assert.ok(e.dialogue, `${id}/${e.id}: dialogue`); }
      if (e.kind === 'sign') assert.ok(e.text, `${id}/${e.id} has text`);
      if (e.kind === 'sign' && e.talk) assert.ok(e.talkIf, `${id}/${e.id}: a scene sign says when`);
      if (e.kind === 'encounter') { assert.equal(e.enc, e.id, `${id}/${e.id}: enc`); assert.ok(['pack', 'block', 'lair'].includes(e.mode), `${id}/${e.id}: mode`); }
    }
    for (const ex of m.exits) {
      for (const [x, y] of cellsOf(ex)) { assert.ok(inside(m, x, y), `${id}/${ex.id} in bounds`); assert.ok(walkable(m, x, y), `${id}/${ex.id} walkable`); }
      if (ex.to) assert.ok(anchor(ex.to, ex.anchor), `${id}/${ex.id}: ${ex.to}:${ex.anchor}`);
      else assert.ok(ex.sealed?.text, `${id}/${ex.id} says why it is shut`);
      if (ex.gate) assert.ok(ex.sealed?.text, `${id}/${ex.id}: a gated exit says why it is shut`);
      if (ex.sealed) assert.ok(ex.sealed.text.length <= 140, `${id}/${ex.id} text fits`);
    }
  }
});

test('lock, gate, chest and trigger ids are unique across every map, the old ones included', () => {
  const owner = new Map();
  for (const m of Object.values(MAPS)) for (const e of m.entities) {
    if (!['lock', 'gate', 'chest', 'trigger'].includes(e.kind)) continue;
    assert.ok(!owner.has(e.id), `${e.id}: on ${owner.get(e.id)} and ${m.id}`);
    owner.set(e.id, m.id);
  }
  // the renamed Thornhollow ids (the old thornhollow map keeps th-stockade, th-cache and th-lookout)
  for (const id of ['th-stockade', 'th-cache', 'th-lookout']) assert.ok(!MAPS['th-thornhollow'].entities.some(e => e.id === id), id);
});

test('player-facing text on the copies: short lines, no old-game faction words', () => {
  const BANNED = /Dustveil|Cistern|Unwaning|Tallym|tally|Brand|Sleeper|Hollow Council|Rotwarden|First Seed|Briarmaw|Thornwatch/i;
  for (const id of COPIES) {
    const m = MAPS[id];
    const texts = [m.name, ...m.entities.flatMap(e => [e.text, e.name, e.note]), ...m.exits.flatMap(ex => [ex.sealed?.text, ex.sealed?.hint])].filter(Boolean);
    for (const t of texts) { assert.ok(t.length <= 140, `${id}: "${t}"`); assert.ok(!BANNED.test(t), `${id}: "${t}"`); }
  }
});

test('a trigger whose scene changes the game is guarded by a flag, never by `once` (as test/story-data.test.mjs asks of the old maps)', () => {
  // `once` is saved the moment the trigger fires, before the scene's effects are: a reload mid-scene would lose them
  const effects = (id, seen = new Set()) => {
    const n = DIALOGUE[id];
    if (!n || seen.has(id)) return false;
    seen.add(id);
    return !!n.do?.length || (n.choices || []).some(c => c.do?.length || c.contest || effects(c.next, seen)) || effects(n.next, seen);
  };
  // the scenes spec 3.2 gives effects, checked by name so the rule holds before the dialogue is written
  const CHANGES = new Set(['c1-tw-enter', 'c1-tw-whisper', 'c1-tw-boots', 'c1-eg-arrive', 'c1-shard-glows', 'c1-hr-descent', 'c1-warm-water', 'c1-stair']);
  for (const id of COPIES) for (const e of MAPS[id].entities) {
    if (e.kind !== 'trigger' || !(CHANGES.has(e.dialogue) || effects(e.dialogue))) continue;
    assert.ok(!e.once, `${id}/${e.id} plays ${e.dialogue}, which changes the game: guard it with a flag instead of once`);
    assert.ok(e.if, `${id}/${e.id} needs a guard so it stops once ${e.dialogue} has done its work`);
  }
});

// ---- reachability through the engine ------------------------------------------------------------------
// A synthetic game with story flags set and fights won (`done` removes a fight from the map, as a won story fight does)
function gameWith({ flags = [], won = [] } = {}) {
  const g = newGame({ seed: 7 });
  const f = g.progress.flags;
  f.story = { ...(f.story || {}), ...Object.fromEntries(flags.map(k => [k, true])) };
  f.done = { ...(f.done || {}), ...Object.fromEntries(won.map(k => [k, true])) };
  f.beaten = { ...(f.beaten || {}), ...Object.fromEntries(won.map(k => [k, 1])) };
  return g;
}
function reach(game, mapId, from) {
  const m = MAPS[mapId], [x0, y0] = m.anchors[from];
  const seen = new Set([`${x0},${y0}`]), q = [[x0, y0]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dir, [dx, dy]] of STEPS) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && canWalk(game, mapId, nx, ny, { dir })) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
// a solid thing is reached from a tile beside it; a trigger or an exit by standing in it
const reached = (seen, mapId, id) => {
  const e = find(mapId, id);
  const cells = cellsOf(e);
  if (e.kind === 'trigger' || MAPS[mapId].exits.includes(e)) return cells.some(([x, y]) => seen.has(`${x},${y}`));
  if (e.kind === 'hearthfire') return seen.has(`${e.stand[0]},${e.stand[1]}`);
  return cells.some(([x, y]) => STEPS.some(([, [dx, dy]]) => seen.has(`${x + dx},${y + dy}`)));
};
const reaches = (game, mapId, from, ids) => { const s = reach(game, mapId, from); for (const id of ids) assert.ok(reached(s, mapId, id), `${mapId}: ${from} reaches ${id}`); };
const blocks = (game, mapId, from, ids) => { const s = reach(game, mapId, from); for (const id of ids) assert.ok(!reached(s, mapId, id), `${mapId}: ${from} does not reach ${id} yet`); };

test('Thornhollow: from the landing gate, every person, the notices and the three roads; the cache waits behind the stockade', () => {
  const g = gameWith();
  reaches(g, 'th-thornhollow', 'from-landing', ['th-aldric', 'th-dael', 'th-notices', 'th-outfitter', 'th-trader', 'th-tt-lookout', 'th-hearth', 'tt-n', 'tt-w', 'tt-ne', 'tt-s']);
  blocks(g, 'th-thornhollow', 'from-landing', ['th-tt-cache']);
  reaches(gameWith({ flags: ['s2-done'] }), 'th-thornhollow', 'from-landing', ['th-tt-cache']);
});

test('the Thornway: the runners and the Bramble-Deep hold the road; with both beaten it reaches tw-n', () => {
  const road = ['c1-runner-camp', 'c1-bramble-deep'];
  blocks(gameWith(), 'th-thornway', 'from-thornhollow', ['tw-n', 'c1-bramble-deep', 'th-tw-hearth']);
  reaches(gameWith(), 'th-thornway', 'from-thornhollow', ['c1-tw-enter', 'c1-runner-camp', 'th-tw-barricade']);
  const one = gameWith({ won: ['c1-runner-camp'] });
  reaches(one, 'th-thornway', 'from-thornhollow', ['c1-bramble-deep', 'th-tw-strongbox', 'th-tw-goblins', 'c1-snag-wallow', 'th-tw-bramble-cache']);
  blocks(one, 'th-thornway', 'from-thornhollow', ['tw-n', 'c1-tw-whisper', 'th-tw-boulder-chest']);
  const both = gameWith({ won: road });
  reaches(both, 'th-thornway', 'from-thornhollow', ['tw-n', 'c1-tw-whisper', 'c1-tw-boots', 'th-tw-hearth', 'tw-den', 'th-tw-boulder-chest']);
  // the boar's wallow is optional: the road never waits on it (spec 2.2, Decided)
  reaches(gameWith({ won: road }), 'th-thornway', 'from-thornhollow', ['tw-n']);
  reaches(gameWith({ won: road, flags: ['c1-taela-guest'] }), 'th-thornway', 'from-thornhollow', ['th-tw-thorn-chest']);
});

test('Eldergrove: Taela and the circle from the south road; the Eldest Tree\'s door waits on the circle', () => {
  reaches(gameWith(), 'th-eldergrove', 'from-thornway', ['th-taela', 'c1-eg-shard', 'th-eg-hearth', 'th-miravel', 'th-scholar', 'th-eg-supplier', 'th-eg-hire', 'th-eg-skiff-post', 'th-eg-acolyte', 'eg-e']);
  blocks(gameWith(), 'th-eldergrove', 'from-thornway', ['eg-tree', 'th-eg-brook-chest']);
  const guest = gameWith({ flags: ['c1-met-taela', 'c1-taela-guest'] });
  reaches(guest, 'th-eldergrove', 'from-thornway', ['c1-grove-circle', 'th-eg-brook-chest']);
  blocks(guest, 'th-eldergrove', 'from-thornway', ['eg-tree']);
  reaches(gameWith({ flags: ['c1-taela-guest'], won: ['c1-grove-circle'] }), 'th-eldergrove', 'from-thornway', ['eg-tree']);
  reaches(gameWith(), 'th-eldergrove', 'from-skiff', ['th-eg-hire', 'th-taela']);
});

test('the Heartroot: the grubs hold the tunnel; with the grub knot open it reaches the warm spring', () => {
  blocks(gameWith(), 'th-heartroot-1', 'from-tree', ['c1-hr-spring', 'th-hr-coal', 'c1-roots-sapwight']);
  reaches(gameWith(), 'th-heartroot-1', 'from-tree', ['c1-roots-grubs', 'c1-hr-descent']);
  const open = gameWith({ won: ['c1-roots-grubs'] });
  reaches(open, 'th-heartroot-1', 'from-tree', ['c1-hr-spring', 'c1-roots-sapwight', 'th-hr-coal', 'c1-hr-hot-lake', 'th-hr-spring-sample', 'th-hr-ichor-chest', 'h1-n']);
  blocks(open, 'th-heartroot-1', 'from-tree', ['th-hr-cache']);
  reaches(gameWith({ won: ['c1-roots-grubs'], flags: ['c1-shard-roots'] }), 'th-heartroot-1', 'from-tree', ['th-hr-cache']);
  reaches(gameWith({ won: ['c1-roots-grubs'], flags: ['s2-open'] }), 'th-heartroot-1', 'from-tree', ['c1-missing-patrol']);
});

test('Mossfall and Mosswatch: the tower from the east road; the crates hold the stair; the Lamp Room\'s fire and Garret after the signalman', () => {
  reaches(gameWith(), 'th-mossfall', 'from-thornhollow', ['c1-mf-arrive', 'th-mf-cairn', 'mf-tower', 'th-mw-hire', 'th-mf-shore-sample', 'th-mf-runner-crate', 'c1-mf-runners', 'th-mf-bramble-cache', 'mf-fen-stair']);
  blocks(gameWith(), 'th-mossfall', 'from-thornhollow', ['c1-mire-shrine']);
  reaches(gameWith(), 'th-mossfall', 'from-skiff', ['mf-tower', 'th-mw-hire', 'mf-e']);
  reaches(gameWith(), 'th-mosswatch-1', 'from-mossfall', ['th-garret', 'c1-mw-stair', 'th-mw-hearth', 'th-mw-crate', 'mw1-door', 'c1-mw-arrive']);
  blocks(gameWith(), 'th-mosswatch-1', 'from-mossfall', ['mw1-up']);
  reaches(gameWith({ won: ['c1-mw-stair'] }), 'th-mosswatch-1', 'from-mossfall', ['mw1-up', 'th-mw-alcove']);
  blocks(gameWith({ won: ['c1-mw-stair'] }), 'th-mosswatch-1', 'from-mossfall', ['th-mw-manifest']);
  reaches(gameWith({ won: ['c1-mw-stair'], flags: ['c1-mosswatch'] }), 'th-mosswatch-1', 'from-mossfall', ['th-mw-manifest']);
  reaches(gameWith({ flags: ['s1-open'] }), 'th-mosswatch-1', 'from-cove', ['th-wenna', 'mw1-door']);
  reaches(gameWith(), 'th-mosswatch-2', 'from-stair', ['c1-mw-lantern', 'c1-mw2-arrive', 'th-mw-oil', 'mw2-down']);
  blocks(gameWith(), 'th-mosswatch-2', 'from-stair', ['th-mw-fire', 'th-garret-up']);
  reaches(gameWith(), 'th-mosswatch-2', 'from-stair', ['th-mw-lookout']);
  reaches(gameWith({ won: ['c1-mw-lantern'] }), 'th-mosswatch-2', 'from-stair', ['th-mw-fire', 'th-garret-up', 'th-mw-lookout', 'th-mw-cache']);
});

test('the Hindwood: with both crossings shut hw-n cannot be reached from the south-east road; with the glowcaps beaten it can', () => {
  const shut = gameWith();
  reaches(shut, 'th-hindwood', 'from-thornhollow', ['c1-glowcaps', 'c1-feral-druid', 'c1-hw-roots', 'th-hw-cairn', 'th-hw-sign', 'c1-hw-ford', 'th-hw-pond-chest', 'hw-se']);
  blocks(shut, 'th-hindwood', 'from-thornhollow', ['hw-n', 'hw-w', 'th-hw-glade-chest']);
  const open = gameWith({ won: ['c1-glowcaps'] });
  reaches(open, 'th-hindwood', 'from-thornhollow', ['hw-n', 'hw-w', 'th-hw-glade-chest']);
  blocks(open, 'th-hindwood', 'from-thornhollow', ['th-hw-thorn-chest']);
  reaches(gameWith({ won: ['c1-glowcaps'], flags: ['c1-taela-joined'] }), 'th-hindwood', 'from-thornhollow', ['th-hw-thorn-chest']);
  reaches(gameWith({ won: ['c1-glowcaps'], flags: ['c1-node-cooled'] }), 'th-hindwood', 'from-thornhollow', ['c1-gloamwing']);
  reaches(gameWith({ flags: ['s9-open'] }), 'th-hindwood', 'from-thornhollow', ['th-deer-2']);
  reaches(gameWith({ won: ['c1-glowcaps'], flags: ['s9-open'] }), 'th-hindwood', 'from-thornhollow', ['th-deer-1']);
  // the rope ledge and the north road bring you back to the same wood
  reaches(gameWith({ won: ['c1-glowcaps'] }), 'th-hindwood', 'from-eldergrove', ['hw-n', 'hw-se']);
  reaches(gameWith({ won: ['c1-glowcaps'] }), 'th-hindwood', 'from-fawnrest', ['hw-se']);
});

test('Fawnrest: from the Hindwood road the keeper, the camp fire, the court and the node stair; the den from the Thornway', () => {
  reaches(gameWith(), 'th-fawnrest', 'from-hindwood', ['c1-fr-arrive', 'th-fr-camp', 'th-fr-stone', 'th-keeper', 'th-pilgrim-1', 'th-pilgrim-2', 'c1-fr-court', 'fr-node', 'c1-vesper', 'th-fr-offering', 'th-fr-pilgrim-cache', 'th-fr-meadow', 'th-fr-pool-sample', 'fr-highfold', 'fr-s']);
  reaches(gameWith(), 'th-fawnrest', 'from-node', ['fr-s', 'th-keeper']);
  reaches(gameWith(), 'th-fawnrest', 'from-skiff', ['fr-node', 'th-keeper']);
  reaches(gameWith(), 'th-briarmaw-den', 'from-thornway', ['c1-den-enter', 'c1-dael-bounty', 'th-den-chest-w', 'th-den-chest-e', 'c1-den-pool', 'den-s']);
});

test('the node (G\'s map): with both gates open the guardian is reached from the stair', () => {
  const m = MAPS['th-fawnrest-node'];
  const ids = new Set(m.entities.map(e => e.id));
  if (!ids.has('c1-guardian')) return; // G places it; until then there is nothing to reach
  blocks(gameWith(), 'th-fawnrest-node', 'from-fawnrest', ['c1-guardian']);
  reaches(gameWith({ won: ['c1-node-stair', 'c1-node-roots'] }), 'th-fawnrest-node', 'from-fawnrest', ['c1-guardian']);
});
