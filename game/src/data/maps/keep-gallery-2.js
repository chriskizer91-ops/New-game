// The Ironspire Gallery (M5 spec §2.1, §2.4): the reliquary's third room, through the door on the
// Sunscorch Gallery's east wall (0,4). A torch-lit gallery like the Sunscorch Gallery, with the runner
// from the door to the plaque at the east end (16,4). Codex Page III's 14 pedestals stand in codex order
// on rows 2 and 5 (west to east), seven a side, with the walkway between; the flagstone aisles behind
// them let you walk round every one.
// Tiles (keep): '#' stone walls, '*' torches, ':' flagstones, '_' the runner, '+' the door to the Gallery.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep-gallery-2', name: 'The Ironspire Gallery', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: false, dark: false,
  lore: [[550, 385, 9, 4]],
  w: 18, h: 8,
  rows: [
    '####*###*###*###*#', // 0
    '#::::::::::::::::#', // 1
    '#::::::::::::::::#', // 2
    '#:______________:#', // 3
    '+:______________:+', // 4
    '#::::::::::::::::#', // 5
    '#::::::::::::::::#', // 6
    '####*###*###*###*#', // 7
  ],
  entities: [
    { id: 'pedestal-windstep-boots', kind: 'pedestal', relic: 'windstep-boots', at: [3, 2] },
    { id: 'pedestal-veilbell', kind: 'pedestal', relic: 'veilbell', at: [5, 2] },
    { id: 'pedestal-ironwall', kind: 'pedestal', relic: 'ironwall', at: [7, 2] },
    { id: 'pedestal-drowned-censer', kind: 'pedestal', relic: 'drowned-censer', at: [9, 2] },
    { id: 'pedestal-ironvein-bracers', kind: 'pedestal', relic: 'ironvein-bracers', at: [11, 2] },
    { id: 'pedestal-roc-feather-cloak', kind: 'pedestal', relic: 'roc-feather-cloak', at: [13, 2] },
    { id: 'pedestal-thanes-rune', kind: 'pedestal', relic: 'thanes-rune', at: [15, 2] },
    { id: 'pedestal-trollhide-mantle', kind: 'pedestal', relic: 'trollhide-mantle', at: [3, 5] },
    { id: 'pedestal-runestaff', kind: 'pedestal', relic: 'runestaff', at: [5, 5] },
    { id: 'pedestal-anvil-heart', kind: 'pedestal', relic: 'anvil-heart', at: [7, 5] },
    { id: 'pedestal-worldforge-hammer', kind: 'pedestal', relic: 'worldforge-hammer', at: [9, 5] },
    { id: 'pedestal-cutters-pick', kind: 'pedestal', relic: 'cutters-pick', at: [11, 5] },
    { id: 'pedestal-rime-crozier', kind: 'pedestal', relic: 'rime-crozier', at: [13, 5] },
    { id: 'pedestal-hushweave-cowl', kind: 'pedestal', relic: 'hushweave-cowl', at: [15, 5] },
    { id: 'gal2-plaque', kind: 'sign', at: [16, 1], look: 'plaque', text: 'The Ironspire Gallery: fourteen pedestals of Ironhold granite, cut for the third page of the Codex. They are cold to the touch.' },
  ],
  exits: [
    { id: 'gal2-w', area: [0, 4, 0, 4], to: 'keep-gallery', anchor: 'from-gallery-2' },
    // M6: the door to the Gloomfen Gallery, the reliquary's fourth room (M6 spec §2.4)
    { id: 'gal2-e', area: [17, 4, 17, 4], to: 'keep-gallery-3', anchor: 'from-gallery-2' },
  ],
  anchors: { 'from-gallery': [1, 4, 'e'], 'from-gallery-3': [16, 4, 'w'] },
  roam: null,
});
