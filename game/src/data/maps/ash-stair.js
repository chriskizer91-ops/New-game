// The Ash Stair (M7 spec §2.1, §2.3), where the Eternal Hearth's roots go down through the world, as batch 4 describes
// it (art-requests/batch-4/places.md): a shaft of grey rock wrapped in black iron roots, ember seams glowing in it, ash
// on every step. The stair (4 wide) comes down from the Hollow Hall at the top edge, left of centre (`as-up`, 7-10,0;
// `from-hall` at 8,1), and winds down in switchbacks round the open drop in the middle, which glows red from far below:
// east along the north wall, then onto the first landing (x 12-21, rows 5-10), where the Under-Coal lies cold in its
// niche in the east wall (22,7; stand 21,7 facing it). Just below the landing the stair squeezes to three between two
// great iron roots (17-19, rows 11-13): the cinder-thralls stand in the narrows (18,11) and hold the ash gate behind
// them (row 12). Then down along the east wall and west across the shaft to the middle landing (x 1-10, rows 15-22),
// where a narrow ledge runs north along the west wall (x 1, rows 9-14) to a small flat spot with the cache (1,6);
// down the west wall and east again to the lower landing (x 12-21, rows 25-31), and on down out of the bottom edge
// (`as-down`, 14-17,35; `from-deep` at 15,34). The zone's patrols roam the two wide landings, and the stair's steps
// keep them there (stairs are never roamed).
// Road-first (spec A3): the ash gate is the only way down; the side ledge leads nowhere but the cache.
// Not painted yet: batch 4 will paint it, and the map is then traced from its painting (spec A10); the ids and roles stay.
// Tiles (hearth-roots): 's' the stair's rough-cut steps, '.' the landings, the ledge and the flat spot (flat rock under
// grey ash), ',' drifted ash, 'm' deep ash, 'i' ember veins glowing through the floor, 'k' the niche's floor, 'x' the
// open drop, '^' its broken lip, 'Y' the hearth's black iron roots, '#' the shaft's rock, '*' ember seams in it, 'o'
// fallen rock.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  // STUB (M7 P2): the biome is `ash` (Scorchgate's tiles) until art/tiles.js draws `hearth-roots` (P5);
  // test/world-art.test.mjs wants every map's biome drawn. The lead switches it when P5's tiles land.
  id: 'ash-stair', name: 'The Ash Stair', region: 'below', biome: 'ash', music: 'dungeon',
  backdrop: 'ash-stair', zone: 'ash-stair', level: 22, travel: true, dark: false,
  lore: [[540, 390, 12, 18]],
  w: 24, h: 36,
  rows: [
    '######*ssss*############', //  0
    '#######sssssssssssssss##', //  1
    '#######sssssssssssssss##', //  2
    '#######sssssssssssssssY#', //  3
    '#######sssssssssssssssY#', //  4
    '####^xxxxxx^m.........##', //  5
    '#...xxxxxxxx,....i....##', //  6
    '#.,.xxxxxxxx....,.,,..k#', //  7
    '#.,.xxxxxxxx..........##', //  8
    '#.xxxxxxxxxx.,.....ii.*#', //  9
    '#.xxxxxxxxxx.........o##', // 10
    '#.xxxxxxxxxxxxYYYsssYYY#', // 11
    '*.xxxxxxxxxxxxYYYsssYYY#', // 12
    '#.xxxxxxxxxxxxxxYsssYYY#', // 13
    '#.xxxxxxxxxxxxxxxssss###', // 14
    '#m.....i,,mxxxxxxssss#Y#', // 15
    '#...o......xxxxxxssss#Y#', // 16
    'Y..i.......x^xxx^ssss###', // 17
    'Y.i..,i.,..ssssssssss#*#', // 18
    '#i,........ssssssssss###', // 19
    '*....i.,...ssssssssss###', // 20
    '#........i.ssssssssss#Y#', // 21
    '#m.......,oxxxxxxxxxxx##', // 22
    '#ssssxxxxxxxxxxxxxxxxx##', // 23
    '#ssssxxxxxxxxxxxxxxxx^##', // 24
    'Yssssxxxxxxxoi,......m##', // 25
    'Yssss^xxxxxx..i,....,.*#', // 26
    '#sssssssssss..,...,...##', // 27
    '#sssssssssss..........##', // 28
    '*sssssssssss,..i.....iY#', // 29
    '#sssssssssss..........##', // 30
    '############m.......,m##', // 31
    '##############ssss######', // 32
    '#############YssssY#####', // 33
    '###########*##ssss##*###', // 34
    '##############ssss######', // 35
  ],
  entities: [
    // the Under-Coal, cold, in its niche behind the first landing (spec §2.5)
    { id: 'under-coal', kind: 'hearthfire', at: [22, 7], stand: [21, 7, 'e'], cold: true },
    // the narrows between the two iron roots: the cinder-thralls stand in them and hold the ash gate (spec A3)
    { id: 'as-ash-gate', kind: 'gate', area: [17, 12, 19, 12], open: { beaten: 'as-thralls' }, guard: 'as-thralls',
      text: 'Ash drifted across the narrows between the iron roots, and the cinder-thralls standing in it. They were shaped from it.' },
    { id: 'as-thralls', kind: 'encounter', enc: 'as-thralls', mode: 'block', at: [18, 11], face: 'n' },
    // the zone's pack on the middle landing (spec §2.6)
    { id: 'as-patrol', kind: 'encounter', enc: 'as-patrol', mode: 'pack', at: [6, 19], face: 'e' },
    // the cache on the side ledge's flat spot
    { id: 'as-cache', kind: 'chest', at: [1, 6], loot: { gold: 160, items: [{ rarity: 'storied', slot: 'ring' }], materials: { scrap: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'as-up', area: [7, 0, 10, 0], to: 'hollow-hall', anchor: 'from-ash' },
    { id: 'as-down', area: [14, 35, 17, 35], to: 'chained-deep', anchor: 'from-stair' },
  ],
  anchors: { 'from-hall': [8, 1, 's'], 'from-deep': [15, 34, 'n'] },
  roads: [{ from: 'from-hall', to: 'as-down', gates: ['as-ash-gate'] }],
  roam: { max: 3, rects: [[1, 15, 10, 22], [12, 25, 21, 31]] },
});
