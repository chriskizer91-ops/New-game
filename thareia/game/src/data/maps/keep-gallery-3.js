// The Gloomfen Gallery (M6 spec §2.1, §2.4; painted from the player's picture art-in/batch-3/map-keep-gallery-3.png): the
// reliquary's fourth room, through the door on the Ironspire Gallery's east wall. A torch-lit gallery of weathered grey
// granite like the three before it, the last of them for now: pillars, torches and moss-green banners along the north
// and south walls, a door in the middle of the west wall (0,5-6), a floor of worn flagstones, and a long runner of
// planks from the door to the east wall (rows 5-6), where the plaque stands at its end (16,5). Codex Page IV's 14
// pedestals stand in codex order on the flagstone rows either side of the runner, rows 4 and 7 (west to east), seven a
// side; the runner and the flagstone aisles behind them let you walk round every one.
// Traced from the painting (one tile is 85.3 of its px; `overTiles: false`). Tiles (keep): '#' the granite walls, '*'
// their torches, ':' the flagstones and the door's threshold, '_' the runner, '+' the door to the Ironspire Gallery.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep-gallery-3', name: 'The Gloomfen Gallery', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: false, dark: false, overTiles: false,
  lore: [[552, 385, 9, 6]],
  w: 18, h: 12,
  rows: [
    '##################', //  0
    '#####*######*#####', //  1
    '#::::::::::::::::#', //  2
    '#::::::::::::::::#', //  3
    '*::::::::::::::::#', //  4
    '+:_______________#', //  5
    '+:_______________#', //  6
    '*::::::::::::::::#', //  7
    '#::::::::::::::::#', //  8
    '#::::::::::::::::#', //  9
    '#####*######*#####', // 10
    '##################', // 11
  ],
  entities: [
    { id: 'pedestal-unfair-toll', kind: 'pedestal', relic: 'unfair-toll', at: [3, 4] },
    { id: 'pedestal-bogstriders', kind: 'pedestal', relic: 'bogstriders', at: [5, 4] },
    { id: 'pedestal-weeping-bow', kind: 'pedestal', relic: 'weeping-bow', at: [7, 4] },
    { id: 'pedestal-willow-ward', kind: 'pedestal', relic: 'willow-ward', at: [9, 4] },
    { id: 'pedestal-hag-stone', kind: 'pedestal', relic: 'hag-stone', at: [11, 4] },
    { id: 'pedestal-lamplighters-lantern', kind: 'pedestal', relic: 'lamplighters-lantern', at: [13, 4] },
    { id: 'pedestal-mourning-veil', kind: 'pedestal', relic: 'mourning-veil', at: [15, 4] },
    { id: 'pedestal-salvagers-helm', kind: 'pedestal', relic: 'salvagers-helm', at: [3, 7] },
    { id: 'pedestal-cantors-staff', kind: 'pedestal', relic: 'cantors-staff', at: [5, 7] },
    { id: 'pedestal-gar-tooth', kind: 'pedestal', relic: 'gar-tooth', at: [7, 7] },
    { id: 'pedestal-barge-gauntlets', kind: 'pedestal', relic: 'barge-gauntlets', at: [9, 7] },
    { id: 'pedestal-corvus-harpoon', kind: 'pedestal', relic: 'corvus-harpoon', at: [11, 7] },
    { id: 'pedestal-deep-pearl', kind: 'pedestal', relic: 'deep-pearl', at: [13, 7] },
    { id: 'pedestal-hexbane-shawl', kind: 'pedestal', relic: 'hexbane-shawl', at: [15, 7] },
    { id: 'gal3-plaque', kind: 'sign', at: [16, 5], look: 'plaque', text: 'The Gloomfen Gallery: fourteen pedestals of bog-oak, cut for the fourth page of the Codex. They smell of the fen.' },
  ],
  exits: [
    { id: 'gal3-w', area: [0, 5, 0, 6], to: 'keep-gallery-2', anchor: 'from-gallery-3' },
  ],
  anchors: { 'from-gallery-2': [1, 5, 'e'] },
  roam: null,
});
