// The Chained Deep (M7 spec §2.1, §2.3), the cavern at the roots of the world, as batch 4 describes it
// (art-requests/batch-4/places.md): fused black slag cracked with faint red, and in the middle, in its hollow (x 13-28,
// rows 9-18, with its rim round it), the First Sleeper, curled under a web of great chains with the Eternal Hearth's
// iron roots sunk in its back (`sleeper-first`, one large solid prop at 20,15; the hollow round it is solid). Three of
// the great chains run from the web to tunnels at the south-west corner, the middle of the south edge and the south-east
// corner; the heaped slag between them is solid too.
// The stair from the Ash Stair comes down at the north-west corner (`cd-up`, 1-4,0; `from-stair` at its foot, 2,3). The
// walkway of iron plates (rows 3-6, four wide) runs east along the top over the hollow, the chain rail on its lower
// side (row 7), and halfway along it squeezes to three between a spur of rock and the hollow's rim (16-19, rows 4-6):
// the unmade stand in the narrows (17,5) and hold the chain gate (x 18). Past it, the Chain Fire burns on a round
// platform in a nook on the north side (25,1; stand 25,2), and the walkway bends down (x 32-35) to the paving before
// the forge door in the middle of the east edge (`cd-forge`, 41,12-15; `from-forge` at 40,13). Tamsin waits on the
// paving (37,13) until she has joined.
// The chains are signs (spec §2.3): the south-west one, `cd-chain-lull`, stands in its chain's line (9,21) beside the
// cavern floor west of the hollow, which steps go down to from the walkway before the narrows (8-10,7); the south-east
// one, `cd-chain-hush` (34,22), beside the floor east of the hollow, below the paving. The chain to the south edge
// runs between the two heaps, away from any floor, so `cd-chain-ash` is read from the walkway: it stands on a plate out
// over the rim (21,7), above the web, where that chain runs straight away south.
// Road-first (spec A3): the chain gate is the only way east. The floors west and east of the hollow never meet: the
// hollow, the heaps and the chain to the south edge lie between them.
// Not painted yet: batch 4 will paint it, and the map is then traced from its painting (spec A10); the ids and roles stay.
// Tiles (chains): '=' the walkway's iron plates, '|' the chain rail, ':' the paving and the Chain Fire's platform,
// 'k' the cavern floor's slag, 'f' red cracks glowing in it, '^' the hollow's rim, 'x' the hollow and the tunnels'
// mouths, 'Y' the great chains, 'o' heaped slag and the web's stakes, '#' the cavern's rock, 'R' the hearth's iron roots
// coming down the walls, 's' the stair in and the steps down, '+' the forge door.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

const CHAIN = (id, at, text) => ({ id, kind: 'sign', at, look: 'chain', text });

export default deepFreeze({
  // STUB (M7 P2): the biome is `forge` (Harrow's Forge's slag and soot) until art/tiles.js draws `chains` (P5);
  // test/world-art.test.mjs wants every map's biome drawn. The lead switches it when P5's tiles land.
  id: 'chained-deep', name: 'The Chained Deep', region: 'below', biome: 'forge', music: 'dungeon',
  backdrop: 'chained-deep', zone: null, level: 22, travel: true, dark: false,
  lore: [[540, 390, 21, 14]],
  w: 42, h: 28,
  rows: [
    '#ssss########RR##############RR######RR###', //  0
    '#ssss###################:::###############', //  1
    '#ssss###################:::###############', //  2
    '#===============####================######', //  3
    '#===================================######', //  4
    '#===================================######', //  5
    '#===================================######', //  6
    '#|||||||sss|||||^^^^|=||||||||||====######', //  7
    '#kkkkkkkkkkk^^^^^^^^^^^^^^^^^^#|====######', //  8
    '#kkkkkkkkkko^xxxxxxxxxxxxxxxx^#|====######', //  9
    'Rkkfkkkkkkkk^xxxxxxxxxxxxxxxx^#|====######', // 10
    'Rkkkkkkkkkkk^xxxxxxxxxxxxxxxx^#|====######', // 11
    '#kkokkkkkkkk^xxxxxxxxxxxxxxxx^:::::::::::+', // 12
    '#kkkkkkkkkfk^xxxxxxxxxxxxxxxx^:::::::::::+', // 13
    '#kkkkkkkkkko^xxxxxxxxxxxxxxxx^:::::::::::+', // 14
    '#kkkkkkkkkkk^xxxxxxxkxxxxxxxx^:::::::::::+', // 15
    '#kkkkkkkkkkk^xxxxxxxxxxxxxxxx^kkfkkkkkkkk#', // 16
    '#kkkkkkkokkk^xxxxxxxxxxxxxxxx^okkkkkkkkkk#', // 17
    'Rkfkkkkkkkko^xxxxxxxxxxxxxxxx^fkkkkkkkkkkR', // 18
    'RkkkkkkkkkkYY^^^^^^^^^^^^^^^^YYkkkkkkokkkR', // 19
    '#kkkkkkkkkYYooooooooYYooooooooYYkkfkkkkkk#', // 20
    '#kkkkkkkYkYoooooooooYYoooooooooYYYkfkkkkfR', // 21
    '#fkfkkkYYoooooooooooYYoooooooooooYkkkkkfk#', // 22
    '#kfkkYYYooooooooooooYYooooooooooooYYYfkkk#', // 23
    '#kkkYYooooooooooooooYYooooooooooooooYYkkk#', // 24
    'xxYYYoooooooooooooooYYoooooooooooooooYYYxx', // 25
    'xxYoooooooooooooooooYYoooooooooooooooooYxx', // 26
    'xx##################xx##################xx', // 27
  ],
  entities: [
    // the narrows, halfway along the walkway: the unmade stand in them and hold the chain gate (spec A3)
    { id: 'cd-chain-gate', kind: 'gate', area: [18, 4, 18, 6], open: { beaten: 'cd-unmade' }, guard: 'cd-unmade',
      text: 'The walkway narrows between the spur and the rim, and a length of great chain hangs across it. The unmade stand under it, holding the shapes of what they held.' },
    { id: 'cd-unmade', kind: 'encounter', enc: 'cd-unmade', mode: 'block', at: [17, 5], face: 'w' },
    // the Chain Fire, lit, on its platform past the narrows (spec §2.5)
    { id: 'chain-fire', kind: 'hearthfire', at: [25, 1], stand: [25, 2, 'n'] },
    // the First Sleeper in its hollow, under the web of chains (spec §2.3; drawn once, at its foot)
    { id: 'sleeper-first', kind: 'prop', prop: 'sleeper-first', at: [20, 15], solid: true },
    // the three great chains out of the web, and where each goes
    CHAIN('cd-chain-lull', [9, 21], 'A great chain runs out of the web over the Sleeper and away into the tunnel in the south-west corner. Its last link before the dark is cut with a bell. Misthollow, then, and Lull asleep under the Belfry.'),
    CHAIN('cd-chain-ash', [21, 7], 'Below the rail one chain runs straight down the cavern, over the Sleeper\'s back and into the tunnel in the south wall. Ash has settled on its links, and they are warm. It goes to the Sleeper under the Sunscorch.'),
    CHAIN('cd-chain-hush', [34, 22], 'A great chain runs out of the web into the tunnel in the south-east corner, and frost furs its links where they go into the dark. Frostmere, then, and Hush under the ice.'),
    // Tamsin waits before the forge door, sorry; she leaves the map once she has joined (spec A12, §3.1)
    { id: 'cd-tamsin', kind: 'npc', npc: 'tamsin', talk: 'tamsin-return', at: [37, 13], face: 'w', if: { not: { flag: 'tamsin-returned' } } },
  ],
  exits: [
    { id: 'cd-up', area: [1, 0, 4, 0], to: 'ash-stair', anchor: 'from-deep' },
    { id: 'cd-forge', area: [41, 12, 41, 15], to: 'worldforge', anchor: 'from-deep' },
  ],
  anchors: { 'from-stair': [2, 3, 's'], 'from-forge': [40, 13, 'w'] },
  roads: [{ from: 'from-stair', to: 'cd-forge', gates: ['cd-chain-gate'] }],
  roam: null,
});
