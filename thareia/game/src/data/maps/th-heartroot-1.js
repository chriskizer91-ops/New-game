// Thareia (T2): The Heartroot, Chapter 1's copy of the old game's heartroot-1.js (design/09-t2-spec.md section 2.4):
// the old rows and painting (`paint`), under the Eldest Tree. The grubs and a knot of black root close the tunnel
// mouth; Taela sings the black sap back (the ichor pools unlock in c1-hr-descent) and lights the last coal. The
// sapwight stands on the warm spring (c1-warm-water). The way down (h1-n) is too hot: heartroot-2 is not in Chapter 1.
// Rows and tiles as heartroot-1.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-heartroot-1', name: 'The Heartroot', region: 'verdant', biome: 'roots', music: 'dungeon', paint: 'heartroot-1',
  backdrop: 'heartroot', zone: 'th-roots', level: 6, travel: false, dark: false,
  lore: [[192, 152, 12, 12]],
  w: 24, h: 24,
  rows: [
    'RRRRRRRRRRRRkRRRRRRRRRRR', //  0
    'RRRRRRRRRRRkkkRRRRRRRRRR', //  1
    'RRRRRRRRRRrkkkrRRRRRRRRR', //  2
    'RRRRYYRRRrrrkrrrRRRRRRRR', //  3
    'RRRrrrrrrrrrrrrfRRRRRRRR', //  4
    'RRYrrrrrrrrrrrrrRRRRRRRR', //  5
    'RRYrrrrrYrrYrrrriiiiRRRR', //  6
    'RRYrrrrrYrrYrrrririiRRRR', //  7
    'RRRRrrrrfrrrrrrriiiiRRRR', //  8
    'RrRRRrrrrrrrrYfrrrrRRRRR', //  9
    'RrRRRrrYrrrrrrrrrrrRRRRR', // 10
    'RrRrrrRRrrrfrrrrRrrrrrRR', // 11
    'RrrrrrRRiiiiiiiiRRRrrrRR', // 12
    'RRRrrrRRiiiiiiiiRRRrfrRR', // 13
    'RRRfrrRRiiiiiiiiRRRrrrRR', // 14
    'RRRrrrRRrrrrrrrrRRRrrrRR', // 15
    'RRRrrrrrrrrfrrrrrmmrrrRR', // 16
    'RRRrrrrrrYrrrYrrmmmmrRRR', // 17
    'RRrrrrRrrrrrrrrmmmmmrRRR', // 18
    'RRfrrrrrrrrrrrrrmmmmrRRR', // 19
    'RRrrrrrrfrrrrrrrrmmrrRRR', // 20
    'RRrrrrrRRRRrrrRRRRRRRRRR', // 21
    'RRRRRRRRRRRrrrRRRRRRRRRR', // 22
    'RRRRRRRRRRRRrRRRRRRRRRRR', // 23
  ],
  entities: [
    // down from the tree door: the shard warms, and Taela sings the black sap back (unlocks both ichor pools). A trigger
    // whose scene changes the game is guarded by what it sets, not `once`, so a reload mid-scene plays it again
    { id: 'c1-hr-descent', kind: 'trigger', area: [11, 21, 13, 22], on: 'step', if: { not: { unlocked: 'th-hr-ichor-a' } }, dialogue: 'c1-hr-descent' },
    { id: 'th-hr-grub-knot', kind: 'gate', area: [11, 20, 12, 20], look: 'rot-knot', open: { beaten: 'c1-roots-grubs' }, guard: 'c1-roots-grubs', text: 'A knot of black root closes the tunnel. The mulch around it is moving.' },
    { id: 'c1-roots-grubs', kind: 'encounter', enc: 'c1-roots-grubs', mode: 'block', at: [13, 20], face: 's' },
    { id: 'th-hr-coal', kind: 'hearthfire', at: [4, 20], stand: [4, 21, 'n'], cold: true, coldTalk: 'c1-hr-coal' },
    { id: 'th-hr-ichor-a', kind: 'lock', lock: 'ichor', area: [8, 12, 15, 14] },
    { id: 'th-hr-ichor-b', kind: 'lock', lock: 'ichor', area: [16, 6, 19, 8] },
    { id: 'c1-hr-hot-lake', kind: 'trigger', area: [11, 15, 12, 15], on: 'step', once: true, dialogue: 'c1-hr-hot-lake' },
    // S2: the missing ranger patrol, and the sick rangers once they are found
    { id: 'c1-missing-patrol', kind: 'encounter', enc: 'c1-missing-patrol', mode: 'block', at: [19, 11], face: 'w', if: { flag: 's2-open' } },
    { id: 'th-hr-sick-rangers', kind: 'npc', npc: 'th-sick-ranger', at: [20, 14], face: 'n', if: { all: [{ beaten: 'c1-missing-patrol' }, { not: { flag: 's2-healed' } }] } },
    { id: 'th-hr-rot-knot', kind: 'gate', area: [2, 12, 2, 12], look: 'rot-knot', open: { flag: 'c1-shard-roots' }, text: 'A knot of black root. It shivers when the shard comes near.' },
    { id: 'th-hr-cache', kind: 'chest', at: [1, 9], loot: { items: [{ rarity: 'runed' }] } },
    { id: 'th-hr-ichor-chest', kind: 'chest', at: [17, 7], loot: { gold: 60, items: [{ rarity: 'runed', slot: 'offhand' }] } },
    // the sapwight stands on the warm spring; the spring's scene waits until it is beaten
    { id: 'c1-roots-sapwight', kind: 'encounter', enc: 'c1-roots-sapwight', mode: 'block', at: [13, 1], face: 's' },
    { id: 'c1-hr-spring', kind: 'trigger', area: [11, 2, 13, 2], on: 'step', if: { all: [{ beaten: 'c1-roots-sapwight' }, { not: { flag: 'c1-warm-water' } }] }, dialogue: 'c1-warm-water' },
    { id: 'th-hr-spring-sample', kind: 'sign', at: [10, 2], text: 'Warm water wells up between the roots.', talk: 'c1-sample-spring', talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-spring' } }] } },
  ],
  exits: [
    { id: 'h1-s', area: [12, 23, 12, 23], to: 'th-eldergrove', anchor: 'from-heartroot' },
    { id: 'h1-n', area: [12, 0, 12, 0], sealed: { region: 'verdant', text: 'The roots below are too hot to walk.' } },
  ],
  anchors: { 'from-tree': [12, 21, 'n'], 'from-chamber': [12, 2, 's'] },
  roads: [{ from: 'from-tree', to: 'c1-roots-sapwight', gates: ['th-hr-grub-knot'] }],
  roam: { max: 2, rects: [[3, 3, 21, 21]] },
});
