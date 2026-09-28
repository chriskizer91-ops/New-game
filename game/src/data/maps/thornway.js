// The Thornway (M3 spec §2.1, §2.3). The path winds north from the Thornhollow gate; the Tally camp to the west, Old Snag's wallow to the east, the den door in the rock face at the top right.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'thornway', name: 'The Thornway', region: 'verdant', biome: 'wilds', music: 'wilds',
  backdrop: 'verdant-wood', zone: 'thornway', level: 5, travel: true, dark: false,
  lore: [[305, 250, 13, 55], [262, 205, 14, 0]],
  w: 30, h: 56,
  rows: [
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT', // 0
    'T.............==.......ooooooT', // 1
    'T.............==.......ooooooT', // 2
    'T.............==.......ooooooT', // 3
    'T.............==.......ooo+ooT', // 4
    'T.............==.............T', // 5
    'T.............==.............T', // 6
    'T.............==.............T', // 7
    'T.............==.............T', // 8
    'T.............==.............T', // 9
    'T.............==.............T', // 10
    'T.............==.............T', // 11
    'T.............==.............T', // 12
    'T.............==.............T', // 13
    'T.............==.............T', // 14
    'T.............==.............T', // 15
    'T.............==.............T', // 16
    'T.............==.............T', // 17
    'T.............==.............T', // 18
    'T.............==.............T', // 19
    'T.............==.............T', // 20
    'T.............==.............T', // 21
    'T.............==.............T', // 22
    'T.............==.............T', // 23
    'T.............==.............T', // 24
    'T.............==.............T', // 25
    'T.............==.............T', // 26
    'T............==..............T', // 27
    'T............==..............T', // 28
    'T............==..............T', // 29
    'T............==.....mmmmmmmmmT', // 30
    'T............==.....mmmmmmmmmT', // 31
    'T............==.....mmmmmmmmmT', // 32
    'T............==.....mmmmmmmmmT', // 33
    'T............==.....mmmmmmmmmT', // 34
    'T............==.....mmmmmmmmmT', // 35
    'T............==.....mmmmmmmmmT', // 36
    'T............==.....mmmmmmmmmT', // 37
    'T............==.....mmmmmmmmmT', // 38
    'T............==..............T', // 39
    'T............==..............T', // 40
    'T............==..............T', // 41
    'T............==..............T', // 42
    'T............==..............T', // 43
    'T............==..............T', // 44
    'T............==..............T', // 45
    'T............==..............T', // 46
    'T............==..............T', // 47
    'T............==..............T', // 48
    'T............==..............T', // 49
    'T............==..............T', // 50
    'T............==..............T', // 51
    'T............==..............T', // 52
    'T............==..............T', // 53
    'T............==..............T', // 54
    'TTTTTTTTTTTTT==TTTTTTTTTTTTTTT', // 55
  ],
  entities: [
    { id: 'tally-camp', kind: 'encounter', enc: 'tally-camp', mode: 'block', at: [5, 44], face: 'e' },
    { id: 'tw-strongbox', kind: 'chest', at: [2, 42], loot: { gold: 80, items: [{ rarity: 'runed' }] }, lock: 'tally-seal' },
    { id: 'snag-wallow', kind: 'encounter', enc: 'snag-wallow', mode: 'lair', at: [24, 34], face: 'w' },
    { id: 'tw-thornwall', kind: 'lock', lock: 'thornwall', area: [12, 26, 16, 26] },
    { id: 'bramble-deep', kind: 'encounter', enc: 'bramble-deep', mode: 'block', at: [15, 20], face: 's' },
    { id: 'tw-boots', kind: 'trigger', area: [14, 19, 18, 22], on: 'step', once: true, dialogue: 'boots-clue' },
    { id: 'den-mouth', kind: 'hearthfire', at: [22, 8], stand: [22, 10, 'n'] },
    { id: 'tw-crown-n', kind: 'gate', area: [14, 1, 15, 1], look: 'crownwall', open: { brand: 'brand-of-briars' }, text: 'Briarmaw\'s crown-growth walls the road. A green heart-knot pulses in it.' },
    { id: 'tw-thorn-chest', kind: 'chest', at: [27, 28], loot: { items: [{ rarity: 'tempered', slot: 'body' }] }, lock: 'thornwall' },
    { id: 'tw-boulder-chest', kind: 'chest', at: [3, 14], loot: { items: [{ rarity: 'runed', slot: 'ring' }] }, lock: 'boulder' },
    { id: 'tw-bramble-cache', kind: 'chest', at: [8, 24], loot: { bag: { bitterroot: 2, 'ember-salts': 1 } }, lock: 'bramble' },
  ],
  exits: [
    { id: 'tw-s', area: [13, 55, 14, 55], to: 'thornhollow', anchor: 'from-thornway' },
    { id: 'tw-den', area: [26, 4, 26, 4], to: 'briarmaw-den', anchor: 'from-thornway' },
    { id: 'tw-n', area: [14, 0, 15, 0], to: 'eldergrove', anchor: 'from-thornway' },
  ],
  anchors: { 'from-thornhollow': [14, 53, 'n'], 'from-den': [26, 6, 's'], 'from-eldergrove': [14, 2, 's'], 'v1:tally-camp': [8, 46, 'w'], 'v1:snag-wallow': [21, 36, 'e'], 'v1:bramble-deep': [15, 23, 'n'], 'v1:den-mouth': [22, 10, 'n'] },
  roam: { max: 3, rects: [[4, 28, 26, 52], [4, 6, 26, 24]] },
});
