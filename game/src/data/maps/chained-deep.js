// The Chained Deep (M7 spec §2.1, §2.3): the cavern of the chains, the First Sleeper under the hearth, Tamsin, and the
// Chain Fire. STUB from the M7 scaffold: laid out roughly as §2.3 says from existing tiles, with the spec's exits,
// anchors, gate, Hearthfire and entity ids. P2 (maps) draws the `chains` biome's tiles and lays it out (then traces
// it from its batch-4 painting); the biome and backdrop are stand-ins until P5 and P6 draw the Deep's own, and P5
// draws the Sleeper (`sleeper-first`).
//   the way in: the stair at the north-west corner (cd-up; from-stair below it)
//   the road: a walkway of iron plates ('='), 4 tiles wide, along the north of the cavern above the Sleeper's hollow,
//   bending down to the forge door in the middle of the east edge
//   the narrows, halfway along: 3 tiles between a spur of rock ('o') and the hollow's rim ('^'): the chain gate, held
//   by the unmade; past it, the Chain Fire on its platform beside the walkway
//   the First Sleeper in the hollow, under the web of chains (the fourth chain), and the three chains out to the
//   tunnels at the south-west corner, the middle of the south edge and the south-east corner
//   Tamsin on the paving before the forge door (until she joins, spec A12); the way on: the forge door (cd-forge;
//   from-forge before it)
// Tiles (stand-ins): '#' rock, '=' the walkway, '^' the rim, 'k' the hollow, ':' the paving and the platform, 'o' the
// spur, 's' the stair, '+' the forge door.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'chained-deep', name: 'The Chained Deep', region: 'below', biome: 'ice-cave', music: 'dungeon',
  backdrop: 'frostmere-below', zone: null, level: 22, travel: true, dark: false,
  lore: [[540, 390, 21, 14]],
  w: 42, h: 28,
  rows: [
    '##ss######################################', //  0
    '##__#####################:::##############', //  1
    '##__#####################:::##############', //  2
    '#=================ooo================#####', //  3
    '#====================================#####', //  4
    '#====================================#####', //  5
    '#====================================#####', //  6
    '#^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^====#####', //  7
    '#^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^====#####', //  8
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk====#####', //  9
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk====#####', // 10
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk====#####', // 11
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk::::::::#', // 12
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk::::::::+', // 13
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk::::::::+', // 14
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk::::::::#', // 15
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk::::::::#', // 16
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 17
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 18
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 19
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 20
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 21
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 22
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 23
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 24
    '###kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk#########', // 25
    '###kk###############kkk#######kk##########', // 26
    '##########################################', // 27
  ],
  entities: [
    { id: 'cd-chain-gate', kind: 'gate', area: [19, 4, 19, 6], open: { beaten: 'cd-unmade' }, guard: 'cd-unmade',
      text: 'The walkway narrows between the spur and the rim, and a length of great chain hangs across it. The unmade stand under it, holding the shapes of what they held.' },
    { id: 'cd-unmade', kind: 'encounter', enc: 'cd-unmade', mode: 'block', at: [18, 5], face: 'w' },
    { id: 'chain-fire', kind: 'hearthfire', at: [26, 1], stand: [26, 2, 'n'] },
    { id: 'sleeper-first', kind: 'prop', prop: 'sleeper-first', area: [14, 12, 23, 18], solid: true },
    { id: 'cd-chain-lull', kind: 'sign', at: [4, 25], text: 'A great chain runs from the web over the Sleeper into the south-west tunnel. It goes to Misthollow, and Lull.' },
    { id: 'cd-chain-ash', kind: 'sign', at: [21, 25], text: 'A great chain runs from the web into the south tunnel. It goes to the Sleeper under the Sunscorch\'s ash.' },
    { id: 'cd-chain-hush', kind: 'sign', at: [31, 25], text: 'A great chain runs from the web into the south-east tunnel. It goes to Frostmere, and Hush.' },
    // Tamsin waits before the forge door, sorry; she leaves the map once she has joined (spec A12, §3.1)
    { id: 'cd-tamsin', kind: 'npc', npc: 'tamsin', talk: 'tamsin-return', at: [38, 15], face: 'w', if: { not: { flag: 'tamsin-returned' } } },
  ],
  exits: [
    { id: 'cd-up', area: [2, 0, 3, 0], to: 'ash-stair', anchor: 'from-deep' },
    { id: 'cd-forge', area: [41, 13, 41, 14], to: 'worldforge', anchor: 'from-deep' },
  ],
  anchors: { 'from-stair': [2, 1, 's'], 'from-forge': [40, 13, 'w'] },
  roads: [{ from: 'from-stair', to: 'cd-forge', gates: ['cd-chain-gate'] }],
  roam: null,
});
