// Harrow's Forge (M5 spec §2.1, §2.3), Harrow Ironvein's own forge at the bottom of the Deeps. The
// stair from the Bellows Hall comes up into a round chamber of soot-black stone lit by braziers in the
// wall. In its middle is a pit of cold fire (8-11,8-10), embers at its corners, and a ring of anvils
// stands round it. At the head of the chamber, on a dais of worked stone, Mother Anvil waits (at 9,4;
// footprint x8-10, y3-4), Harrow's first forge-golem, with the Worldforge Hammer in her arm and the
// Anvil Heart glowing through her ribs. Behind her, cut deep into the wall, is Harrow's broken-ring
// mark (7,2); something has been left in the ash on the dais' far side (12,2). The Brand scene plays here.
// Layout notes: Mother Anvil faces the stair with twelve rows in front of her, so her sprite (about five
// tiles tall) stands clear of the wall; the pit is solid.
// Tiles (forge): 'R' rock, '#' the chamber wall, '*' braziers, 'k' the soot-black floor, ':' the dais,
// 'x' the pit of cold fire, 'f' embers, 'Y' anvils, 'o' a slag heap, 'm' cooled slag, 's' the stair.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'harrows-forge', name: 'Harrow\'s Forge', region: 'ironspire', biome: 'forge', music: 'dungeon',
  backdrop: 'harrows-forge', zone: null, level: 16, travel: false, dark: false,
  lore: [[882, 186, 9, 9]],
  w: 20, h: 18,
  rows: [
    'RRRRRRRRRRRRRRRRRRRR', //  0
    'RRRRR##*####*##RRRRR', //  1
    'RRRR##kk::::kk##RRRR', //  2
    'RRR#kkk::::::kkk#RRR', //  3
    'RR#kkkk::::::kkkk#RR', //  4
    'R#kkkkkk::::kkkkkk#R', //  5
    'R#kkkYkkkkkkkkYkkk#R', //  6
    'R*kkkkkfkkkkfkkkkk*R', //  7
    '#kkkkkkkxxxxkkkkkkk#', //  8
    '#kkkYkkkxxxxkkkYkkk#', //  9
    'R#kokkkkxxxxkkkkmk#R', // 10
    'R#kkkkkfkkkkfkkkkk#R', // 11
    'R*kkkYkkkkkkkkYkkk*R', // 12
    'RR#kkkkkkkYkkkkkk#RR', // 13
    'RRR#kkmkkkkkkkkk#RRR', // 14
    'RRRR##kkkkkkkk##RRRR', // 15
    'RRRRRR###kk###RRRRRR', // 16
    'RRRRRRRRRssRRRRRRRRR', // 17
  ],
  entities: [
    { id: 'mother-anvil', kind: 'encounter', enc: 'mother-anvil', mode: 'lair', at: [9, 4], area: [8, 3, 10, 4], face: 's' },
    { id: 'fg-mark', kind: 'sign', at: [7, 2], look: 'plaque', text: 'A broken ring, cut deep into the wall behind the anvil: Harrow Ironvein\'s mark. Under it, smaller and newer, the same hand has cut: NOT YET.' },
    { id: 'fg-ash-cache', kind: 'chest', at: [12, 2], hidden: true, loot: { gold: 180, gems: { sunstone: 1 }, materials: { embers: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'fg-up', area: [9, 17, 10, 17], to: 'ironhold-deeps', anchor: 'from-forge' },
  ],
  anchors: { 'from-deeps': [9, 16, 'n'] },
  roads: [{ from: 'from-deeps', to: 'mother-anvil', gates: [] }],
  roam: null,
});
