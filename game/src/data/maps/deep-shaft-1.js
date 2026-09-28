// The Deep Shaft (M4 spec §2.1, §2.3). Timbered tunnels under Dusthaven. The stair from the pithead
// (11-12,0) comes down a propped neck onto the first landing, a wide gallery lit by the miners' lamps.
// East of it Foreman Brask's crew works the sunstone face by the light of a stolen lantern (19,9); west
// of it a crack fused shut with dune-glass (4,7) seals a pocket with a cache. The rails run down the
// main shaft to the lamp chamber, where the Shaft Lamp hangs cold on the timbers (8,11): below it the
// mine is dark. The way on goes west into the scorpions' cave, then south-east over a plank bridge
// across a chasm (12-14,19-20) into the far chamber and the stair down to the Glass Heart (18-19,23).
// Layout notes: `dark` is the whole map (M3's soft darkness: 2 tiles of sight without a key); `light`
// entities keep the upper half lit, Brask's lantern glows until he is beaten, and kindling the Shaft
// Lamp lights the chamber round it. Brask's crew stands off the main shaft, so the Brand of Glass's
// re-armed Echo never closes the way back up.
// Tiles (mine): 'R' rock, 'k' the tunnel floor, 'r' rails, '|' timber props, 'f' glowing sunstone
// veins, 'o' ore and rubble, 'x' the chasm, 'b' the plank bridge, 's' stairs.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'deep-shaft-1', name: 'The Deep Shaft', region: 'sunscorch', biome: 'mine', music: 'dungeon',
  backdrop: 'deep-shaft', zone: 'deep-shaft', level: 11, travel: false, dark: true,
  lore: [[779, 563, 11, 0], [770, 575, 8, 12], [762, 588, 18, 23]],
  w: 24, h: 24,
  rows: [
    'RRRRRRRRRRRssRRRRRRRRRRR', //  0
    'RRRRRRRRRR|kr|RRRRRRRRRR', //  1
    'RRRRRRRRRR|kr|RRRRRRRRRR', //  2
    'RRR|kkkk|kkkrkk|kkkk|RRR', //  3
    'RRkkkkkkkkkkrkkkkkkkkRRR', //  4
    'RRkkkkkkkkkkrkkkkkkkkkRR', //  5
    'RRRkkkkkkkkkrkkkkkkkkkRR', //  6
    'RRRRkRRRRRkkrkRkkkokkfRR', //  7
    'RRkkkfRRRRkkrkRkkkkkkkRR', //  8
    'RRkkkkRRRRkkrkRkkkkkkkRR', //  9
    'RRfkkkRRokkkrkkkkkkkkfRR', // 10
    'RRRRRRRRkkkkrkkkfkkkfRRR', // 11
    'RRRRRkkkkkkkrkkkRRRRRRRR', // 12
    'RRRRRkkkkkkkkkkoRRRRRRRR', // 13
    'RRRkkkkkkRRRRRRRRRRRRRRR', // 14
    'RRkkkkkfkkRRRRRRkkkkkRRR', // 15
    'RRkkokkkkkRRRRRkkkkkfkRR', // 16
    'RRkfkkkkkkRRxxxkkkkokkRR', // 17
    'RRkkkkkkokkkxxxkkkkkkkRR', // 18
    'RRRkkkkkkrrrbbbrrrrkkkRR', // 19
    'RRRRRRRRRkkkbbbkkkrkkkRR', // 20
    'RRRRRRRRRRRRxxxkfkrkkRRR', // 21
    'RRRRRRRRRRRRRRRRRRrkRRRR', // 22
    'RRRRRRRRRRRRRRRRRRssRRRR', // 23
  ],
  entities: [
    { id: 'ds-lamp-w', kind: 'light', at: [5, 4], radius: 3 },
    { id: 'ds-lamp-e', kind: 'light', at: [17, 4], radius: 3 },
    { id: 'ds-lamp-shaft', kind: 'light', at: [11, 7], radius: 3 },
    { id: 'ds-tally-mark', kind: 'sign', at: [16, 3], look: 'plaque', text: 'Tally-chalk on the timbers: SHAFT THREE. SUNSTONE, FORTY WEIGHT. TAKEN BY ORDER. B.' },
    { id: 'ds-crew', kind: 'encounter', enc: 'ds-crew', mode: 'block', at: [19, 9], face: 'w' },
    { id: 'ds-crew-lantern', kind: 'light', at: [19, 9], radius: 3, if: { not: { beaten: 'ds-crew' } } },
    { id: 'ds-glass-seam', kind: 'lock', lock: 'dune-glass', at: [4, 7] },
    { id: 'ds-seam-cache', kind: 'chest', at: [2, 9], loot: { gems: { sunstone: 1 }, materials: { silver: 2 } } },
    { id: 'shaft-lamp', kind: 'hearthfire', at: [8, 11], stand: [8, 12, 'n'], cold: true },
    { id: 'ds-shaft-lamp-glow', kind: 'light', at: [8, 11], radius: 5, if: { kindled: 'shaft-lamp' } },
    { id: 'ds-scorpions', kind: 'encounter', enc: 'ds-scorpions', mode: 'pack', at: [5, 17], face: 'e' },
  ],
  exits: [
    { id: 'ds-up', area: [11, 0, 12, 0], to: 'dusthaven', anchor: 'from-deep-shaft' },
    { id: 'ds-down', area: [18, 23, 19, 23], to: 'deep-shaft-2', anchor: 'from-deep-shaft-1' },
  ],
  anchors: { 'from-dusthaven': [11, 2, 's'], 'from-deep-shaft-2': [18, 22, 'n'] },
  roam: { max: 2, rects: [[3, 3, 20, 6], [2, 14, 9, 19], [15, 15, 21, 21]] },
});
