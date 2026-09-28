// The Sunscorch Gallery (M4 spec §2.4): the reliquary's second room, through a door on the Great Hall's
// east wall. Codex Page II's 14 pedestals stand in codex order on rows 2 and 5 (west to east), with a
// walkway between. STUB from the M4 scaffold: WP-maps (P2) dresses the room.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'keep-gallery', name: 'The Sunscorch Gallery', region: 'verdant', biome: 'keep', music: 'hearth',
  backdrop: 'hearth-road', zone: null, level: 1, travel: false, dark: false,
  lore: [[545, 385, 9, 4]],
  w: 18, h: 8,
  rows: [
    '##################', // 0
    '#________________#', // 1
    '#________________#', // 2
    '#________________#', // 3
    '.________________#', // 4
    '#________________#', // 5
    '#________________#', // 6
    '##################', // 7
  ],
  entities: [
    { id: 'pedestal-sandwalkers', kind: 'pedestal', relic: 'sandwalkers', at: [3, 2] },
    { id: 'pedestal-zaras-orrery', kind: 'pedestal', relic: 'zaras-orrery', at: [5, 2] },
    { id: 'pedestal-wyrmscale', kind: 'pedestal', relic: 'wyrmscale', at: [7, 2] },
    { id: 'pedestal-sunstone-lantern', kind: 'pedestal', relic: 'sunstone-lantern', at: [9, 2] },
    { id: 'pedestal-glass-carapace', kind: 'pedestal', relic: 'glass-carapace', at: [11, 2] },
    { id: 'pedestal-dunebreaker', kind: 'pedestal', relic: 'dunebreaker', at: [13, 2] },
    { id: 'pedestal-cinderfang', kind: 'pedestal', relic: 'cinderfang', at: [15, 2] },
    { id: 'pedestal-mirage-glass', kind: 'pedestal', relic: 'mirage-glass', at: [3, 5] },
    { id: 'pedestal-qasims-signet', kind: 'pedestal', relic: 'qasims-signet', at: [5, 5] },
    { id: 'pedestal-sunstone-heart', kind: 'pedestal', relic: 'sunstone-heart', at: [7, 5] },
    { id: 'pedestal-scorchgate-key', kind: 'pedestal', relic: 'scorchgate-key', at: [9, 5] },
    { id: 'pedestal-ashen-aegis', kind: 'pedestal', relic: 'ashen-aegis', at: [11, 5] },
    { id: 'pedestal-cinder-crown', kind: 'pedestal', relic: 'cinder-crown', at: [13, 5] },
    { id: 'pedestal-saltglass', kind: 'pedestal', relic: 'saltglass', at: [15, 5] },
  ],
  exits: [
    { id: 'gal-w', area: [0, 4, 0, 4], to: 'keep-hall', anchor: 'from-gallery' },
  ],
  anchors: { 'from-hall': [1, 4, 'e'] },
  roam: null,
});
