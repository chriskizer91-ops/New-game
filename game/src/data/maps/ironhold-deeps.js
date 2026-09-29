// The Ironhold Deeps (M5 spec §2.1, §2.3), Harrow Ironvein's abandoned works under the hall. The stair
// from the rune-sealed door comes down onto a landing where the only light is what falls from Ironhold.
// North, the mine rails run into a tunnel the forgeborn have choked with slag (12-14,21); they stand in
// it beside their heap (15,21), glowing. Past it lies the Furnace Hall: anvils, cold furnaces, and in the
// north-west the Deeps Furnace in its brick housing (6,13), one of Harrow's own, waiting to be relit; a
// field of cooled slag spreads over the hall's south-west corner with a cache half buried in it. East,
// behind a door the Thane's runes still seal (18,17), Harrow's journeyman works at a forge that has
// never gone out. A passage leads on into the Bellows Hall, with two more cold furnaces and the great
// bellows, and the rails end at the iron doors (12-14,3) at the head of the stair down to Harrow's Forge,
// the Bellows breathing sparks beside them (15,3).
// Layout notes: `dark` is the whole map (M3's soft darkness: 2 tiles of sight without a key); lights
// keep the landing, the glowing forgeborn and the journeyman's forge lit, and relighting the Deeps
// Furnace lights the hall round it. Both road guards stand in the gap beside their gates, so a Brand's
// re-armed Echo stands beside an open gate and never shuts the way back up to Ironhold.
// Tiles (forge): 'R' the rock of the Deeps, '#' furnace brick and the works' walls, 'H' furnace hoods
// and the great bellows, 'k' the soot-black floor, 'r' the rails, 'm' cooled slag, 'o' slag heaps,
// 'Y' anvils, 'f' embers, '*' the journeyman's braziers, 't' a quench barrel, ':' the stair landing,
// 's' the stairs.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'ironhold-deeps', name: 'The Ironhold Deeps', region: 'ironspire', biome: 'forge', music: 'dungeon',
  backdrop: 'ironhold-deeps', zone: 'deeps', level: 15, travel: false, dark: true,
  lore: [[875, 175, 13, 13]],
  w: 28, h: 28,
  rows: [
    'RRRRRRRRRRRR#ss#RRRRRRRRRRRR', //  0
    'RRRRRRRRRRRR#::#RRRRRRRRRRRR', //  1
    'RRRRRRRRRRR#k::k#RRRRRRRRRRR', //  2
    'RRRRRRRRRR##kkkk##RRRRRRRRRR', //  3
    'RRRR########krkk########RRRR', //  4
    'RRRRkHHkHHkkkrkkkHHHHHkkRRRR', //  5
    'RRRRk##k##mkkrkkkHHHHHkkRRRR', //  6
    'RRRRkokkkokkkrkkk##k##kkRRRR', //  7
    'RRRRkkkkkmkkkrkkkkkkkkmkRRRR', //  8
    'RRRRokkkkkkkkrkmkkkkkkokRRRR', //  9
    'RRRRkkmkkkkkkrkkkkkkkmokRRRR', // 10
    'RRRRRRRRRRRkkrkkkRRRRRRRRRRR', // 11
    'RRRkkHHHkkYkkrkHHk########RR', // 12
    'RRRkk#k#kkkkkrk##k#*Ykfk*#RR', // 13
    'RRRkfkkkfkkkkrkkkk#kkfkkk#RR', // 14
    'RRRkkkkkkkkkkrkkkk#kkkkkk#RR', // 15
    'RRmmommkkYkkkrkkYk#kkkkmk#RR', // 16
    'RRmmmomkkkkkkrkkkkkkkkkkt#RR', // 17
    'RRomkmmkkkkkkrkmkk#mkkkko#RR', // 18
    'RRmmmmokkkkmkrkkko#kkkmkk#RR', // 19
    'RRomkmmkkkkkkrkkkk#okkkkk#RR', // 20
    'RRRRRRRRRRRRkrkkRR########RR', // 21
    'RRRRRRRRRRkkkrkkkkRRRRRRRRRR', // 22
    'RRRRRRRRRRokkrkkkkRRRRRRRRRR', // 23
    'RRRRRRRRRkkmkrkkkkkRRRRRRRRR', // 24
    'RRRRRRRRRkkkkrkkokkRRRRRRRRR', // 25
    'RRRRRRRRRkk#krkk#kkRRRRRRRRR', // 26
    'RRRRRRRRRRRR#ss#RRRRRRRRRRRR', // 27
  ],
  entities: [
    { id: 'id-stair-light', kind: 'light', at: [13, 26], radius: 3 },
    // M4.5 road gates (spec A3, §2.2): the forgeborn's slag across the rail tunnel, and the Bellows Hall's
    // iron doors at the head of the stair down; each guard stands in the gap beside its gate
    { id: 'id-slag-gate', kind: 'gate', area: [12, 21, 14, 21], look: 'boulder', open: { beaten: 'id-forgeborn' }, guard: 'id-forgeborn', text: 'A heap of slag dumped across the rails, still warm at its heart. The forgeborn stand beside it, and keep adding to it.' },
    { id: 'id-forgeborn', kind: 'encounter', enc: 'id-forgeborn', mode: 'block', at: [15, 21], face: 's' },
    { id: 'id-forgeborn-glow', kind: 'light', at: [15, 21], radius: 3, if: { not: { cleared: 'id-forgeborn' } } },
    { id: 'deeps-forge', kind: 'hearthfire', at: [6, 13], stand: [6, 14, 'n'], cold: true },
    { id: 'id-furnace-glow', kind: 'light', at: [6, 13], radius: 5, if: { kindled: 'deeps-forge' } },
    { id: 'id-slag-cache', kind: 'chest', at: [2, 17], loot: { gold: 80, gems: { sunstone: 1 }, materials: { scrap: 2 } } },
    { id: 'id-works-seal', kind: 'lock', lock: 'rune-seal', at: [18, 17] },
    { id: 'id-smith', kind: 'encounter', enc: 'id-smith', mode: 'block', at: [21, 14], face: 's' },
    { id: 'id-smith-forge', kind: 'light', at: [21, 13], radius: 4, if: { not: { cleared: 'id-smith' } } },
    { id: 'id-works-note', kind: 'sign', at: [23, 16], look: 'plaque', text: 'Chalked on the quench-barrel lid in a big square hand: KEEP THE FIRE IN. BACK BY THE THAW. H. The chalk is years old.' },
    { id: 'id-works-cache', kind: 'chest', at: [24, 20], loot: { items: [{ rarity: 'storied', slot: 'hands' }], materials: { embers: 1, silver: 1 } } },
    { id: 'id-bellows-doors', kind: 'gate', area: [12, 3, 14, 3], look: 'vault-door', open: { beaten: 'id-bellows' }, guard: 'id-bellows', text: 'Iron doors at the head of the stair down to Harrow\'s own forge, shut. Beside them the Bellows breathes sparks, in and out, in and out.' },
    { id: 'id-bellows', kind: 'encounter', enc: 'id-bellows', mode: 'block', at: [15, 3], face: 's' },
    { id: 'id-bellows-glow', kind: 'light', at: [15, 3], radius: 3, if: { not: { cleared: 'id-bellows' } } },
  ],
  exits: [
    { id: 'id-up', area: [13, 27, 14, 27], to: 'ironhold', anchor: 'from-deeps' },
    { id: 'id-down', area: [13, 0, 14, 0], to: 'harrows-forge', anchor: 'from-deeps' },
  ],
  anchors: { 'from-hold': [13, 26, 'n'], 'from-forge': [13, 1, 's'] },
  roads: [{ from: 'from-hold', to: 'id-down', gates: ['id-slag-gate', 'id-bellows-doors'] }],
  roam: { max: 2, rects: [[4, 5, 23, 10], [3, 14, 17, 20]] },
});
