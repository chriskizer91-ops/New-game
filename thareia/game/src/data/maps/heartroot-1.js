// The Heartroot (M3 spec §2.1, §2.3). Root tunnels under the Eldest Tree. From the tree door (12,23)
// the direct way north crosses the ichor lake (pool a), which fills its chamber wall to wall. The
// walled tunnels either side are the long way round: west past the sapwight, east past the missing
// patrol (19,11), who stands in the tunnel's only gap. The upper cavern holds the sap-tappers at the
// tapped roots (north-west) and pool b in its alcove (north-east), the chest on a root hump in the
// middle. The rot-knot (2,12) is the only way into the crack up to the cache (1,9). The Last Green
// Coal glows in its hollow (south-west), root-mulch fills the south-east, and the way on to the Heart
// Chamber darkens (12,0).
// M4.5 (docs/M45-SPEC.md §4): rot-knots close the tunnel mouth from the tree door (11-12,20) and the
// neck up to the Heart Chamber (11-12,1); the grubs (13,20) and the sapwight (13,1) stand in the gap
// beside them. Every other entity sits at its spec coordinates.
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'heartroot-1', name: 'The Heartroot', region: 'verdant', biome: 'roots', music: 'dungeon',
  backdrop: 'heartroot', zone: 'heartroot', level: 6, travel: false, dark: false,
  lore: [[192, 152, 12, 12]],
  w: 24, h: 24,
  rows: [
    'RRRRRRRRRRRRkRRRRRRRRRRR', // 0
    'RRRRRRRRRRRkkkRRRRRRRRRR', // 1
    'RRRRRRRRRRrkkkrRRRRRRRRR', // 2
    'RRRRYYRRRrrrkrrrRRRRRRRR', // 3
    'RRRrrrrrrrrrrrrfRRRRRRRR', // 4
    'RRYrrrrrrrrrrrrrRRRRRRRR', // 5
    'RRYrrrrrYrrYrrrriiiiRRRR', // 6
    'RRYrrrrrYrrYrrrririiRRRR', // 7
    'RRRRrrrrfrrrrrrriiiiRRRR', // 8
    'RrRRRrrrrrrrrYfrrrrRRRRR', // 9
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
    { id: 'h1-ichor-a', kind: 'lock', lock: 'ichor', area: [8, 12, 15, 14] },
    { id: 'h1-ichor-b', kind: 'lock', lock: 'ichor', area: [16, 6, 19, 8] },
    { id: 'last-green-coal', kind: 'hearthfire', at: [4, 20], stand: [4, 21, 'n'], cold: true },
    // M4.5 road gates (docs/M45-SPEC.md §4): rot-knots close the tunnel mouth from the tree door and the
    // neck up to the Heart Chamber; the grubs and the sapwight stand in the gap beside them
    { id: 'h1-grub-knot', kind: 'gate', area: [11, 20, 12, 20], look: 'rot-knot', open: { beaten: 'hr1-grubs' }, guard: 'hr1-grubs', text: 'A knot of black root closes the tunnel mouth, soft with rot. The mulch around it is moving.' },
    { id: 'hr1-grubs', kind: 'encounter', enc: 'hr1-grubs', mode: 'block', at: [13, 20], face: 's' },
    { id: 'h1-sap-knot', kind: 'gate', area: [11, 1, 12, 1], look: 'rot-knot', open: { beaten: 'hr1-sapwight' }, guard: 'hr1-sapwight', text: 'The way to the Heart Chamber is knotted shut with black root, weeping sap. The thing beside it grew from the same root.' },
    { id: 'hr1-sapwight', kind: 'encounter', enc: 'hr1-sapwight', mode: 'block', at: [13, 1], face: 's' },
    { id: 'hollowed-patrol', kind: 'encounter', enc: 'hollowed-patrol', mode: 'block', at: [19, 11], face: 'w' },
    { id: 'hr1-tappers', kind: 'encounter', enc: 'hr1-tappers', mode: 'block', at: [5, 6], face: 'e' },
    { id: 'h1-rot-knot', kind: 'lock', lock: 'rot-knot', at: [2, 12] },
    { id: 'h1-cache', kind: 'chest', at: [1, 9], loot: { items: [{ rarity: 'storied' }] } },
    { id: 'h1-ichor-chest', kind: 'chest', at: [17, 7], loot: { gold: 100, items: [{ rarity: 'runed', slot: 'offhand' }] } },
  ],
  exits: [
    { id: 'h1-s', area: [12, 23, 12, 23], to: 'eldergrove', anchor: 'from-heartroot' },
    { id: 'h1-n', area: [12, 0, 12, 0], to: 'heartroot-2', anchor: 'from-roots' },
  ],
  anchors: { 'from-tree': [12, 21, 'n'], 'from-chamber': [12, 2, 's'] },
  roads: [{ from: 'from-tree', to: 'h1-n', gates: ['h1-grub-knot', 'h1-sap-knot'] }],
  roam: { max: 3, rects: [[3, 3, 21, 21]] },
});
