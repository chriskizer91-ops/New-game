// The Gloomfen Gallery (M6 spec §2.1, §2.4): the reliquary's fourth room, through the door on the Ironspire
// Gallery's east wall (0,4). A torch-lit gallery like the three before it, the last of them for now: the runner
// goes from the door to the plaque at the east end (16,4). Codex Page IV's 14 pedestals stand in codex order on
// rows 2 and 5 (west to east), seven a side, with the walkway between; the flagstone aisles behind them let you
// walk round every one.
// Tiles (keep): '#' stone walls, '*' torches, ':' flagstones, '_' the runner, '+' the door to the Ironspire Gallery.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep-gallery-3', name: 'The Gloomfen Gallery', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: false, dark: false,
  lore: [[552, 385, 9, 4]],
  w: 18, h: 8,
  rows: [
    '####*###*###*###*#', // 0
    '#::::::::::::::::#', // 1
    '#::::::::::::::::#', // 2
    '#:______________:#', // 3
    '+:______________:#', // 4
    '#::::::::::::::::#', // 5
    '#::::::::::::::::#', // 6
    '####*###*###*###*#', // 7
  ],
  entities: [
    { id: 'pedestal-unfair-toll', kind: 'pedestal', relic: 'unfair-toll', at: [3, 2] },
    { id: 'pedestal-bogstriders', kind: 'pedestal', relic: 'bogstriders', at: [5, 2] },
    { id: 'pedestal-weeping-bow', kind: 'pedestal', relic: 'weeping-bow', at: [7, 2] },
    { id: 'pedestal-willow-ward', kind: 'pedestal', relic: 'willow-ward', at: [9, 2] },
    { id: 'pedestal-hag-stone', kind: 'pedestal', relic: 'hag-stone', at: [11, 2] },
    { id: 'pedestal-lamplighters-lantern', kind: 'pedestal', relic: 'lamplighters-lantern', at: [13, 2] },
    { id: 'pedestal-mourning-veil', kind: 'pedestal', relic: 'mourning-veil', at: [15, 2] },
    { id: 'pedestal-salvagers-helm', kind: 'pedestal', relic: 'salvagers-helm', at: [3, 5] },
    { id: 'pedestal-cantors-staff', kind: 'pedestal', relic: 'cantors-staff', at: [5, 5] },
    { id: 'pedestal-gar-tooth', kind: 'pedestal', relic: 'gar-tooth', at: [7, 5] },
    { id: 'pedestal-barge-gauntlets', kind: 'pedestal', relic: 'barge-gauntlets', at: [9, 5] },
    { id: 'pedestal-corvus-harpoon', kind: 'pedestal', relic: 'corvus-harpoon', at: [11, 5] },
    { id: 'pedestal-deep-pearl', kind: 'pedestal', relic: 'deep-pearl', at: [13, 5] },
    { id: 'pedestal-hexbane-shawl', kind: 'pedestal', relic: 'hexbane-shawl', at: [15, 5] },
    { id: 'gal3-plaque', kind: 'sign', at: [16, 4], look: 'plaque', text: 'The Gloomfen Gallery: fourteen pedestals of bog-oak, cut for the fourth page of the Codex. They smell of the fen.' },
  ],
  exits: [
    { id: 'gal3-w', area: [0, 4, 0, 4], to: 'keep-gallery-2', anchor: 'from-gallery-3' },
  ],
  anchors: { 'from-gallery-2': [1, 4, 'e'] },
  roam: null,
});
