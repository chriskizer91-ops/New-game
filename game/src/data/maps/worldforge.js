// The Worldforge (M7 spec §2.1, §2.3), Harrow's forge at the bottom of the world, as batch 4 describes it
// (art-requests/batch-4/places.md): a forge-hall hewn into the rock and plated with black iron. The walkway comes in
// from the Chained Deep through the iron door in the middle of the west edge (`wf-out`, 0,10-12; `from-deep` at 1,11).
// A moat of molten metal, three wide, runs from the north edge to the south a third of the way in (x 11-13), and one
// iron bridge crosses it in line with the walkway (rows 10-12). The forge-warden stands at the bridge's near end
// (10,11) and holds the bridge gate behind it (x 11).
// Beyond lies the forge floor of iron plates, with smaller molten channels along its north and south edges from the
// furnace to the moat. Against the east wall stands the Worldforge itself, a heart of firebrick and black iron (one
// large solid prop, `worldforge`, at its foot 32,18; the wall round it is solid), its mouth to the west. Before it is
// the smith's place, hammered stone about five across (x 23-28, rows 9-14), with the great anvil to its north (prop
// `great-anvil` at 25,7, on heaped slag). The Unsmith's lair stands in it (26-28,11-12; his foot at 27,12), and behind
// him, in the recess before the furnace's mouth, is the heart's step (`wf-heart`, 30,11): the only way to it is past
// him. Its talk opens the endings once he is beaten (spec §4.7).
// Road-first (spec A3): the bridge gate is the only way over the moat; the road ends at the finale.
// Not painted yet: batch 4 will paint it, and the map is then traced from its painting (spec A10); the ids and roles stay.
// Tiles (worldforge): 'k' the near floor's soot-black stone, '=' the walkway's iron plates, '+' the iron door, '~' the
// molten moat and channels, 'b' the iron bridge, '_' the forge floor's iron plates, ':' the smith's place and the
// heart's step (hammered stone), ',' cinders and scale, 't' racks of giant tongs and hammers, 'Y' chains and hooks hung
// with broken relics, 'o' heaps of slag, '#' the iron-plated rock and the furnace's firebrick, '*' fire-vents.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'worldforge', name: 'The Worldforge', region: 'below', biome: 'worldforge', music: 'boss',
  backdrop: 'worldforge', zone: null, level: 22, travel: false, dark: false,
  lore: [[540, 390, 18, 12]],
  w: 36, h: 24,
  rows: [
    '###########~~~######################', //  0
    '####*###*##~~~####*#####*###########', //  1
    '#kkkkkkkkkk~~~~~~~~~~~~~~~~~~~~~####', //  2
    '#,ttkkkktkk~~~_tt__tt_________~~####', //  3
    '#kkkkkkkkkk~~~_____________Y__######', //  4
    '*kk,kkkkkkk~~~_____,_Y______o_######', //  5
    '#kk,kokkkkk~~~___Y______ooo___######', //  6
    '#kkkkkkkkkk~~~,_________o:o___######', //  7
    '#kkkkk,kkkk~~~_o______,___,___######', //  8
    '#kkkkkkkkkk~~~_________::::::#######', //  9
    '+==========bbb_________::::::#######', // 10
    '+==========bbb_________::::::::#####', // 11
    '+==========bbb____,___,::::::::#####', // 12
    '#kkkkkkkkkk~~~____,____::::::#######', // 13
    '#ko,,kkkkkk~~~_______,_::::::#######', // 14
    '#kkkk,kkkkk~~~_o______________######', // 15
    '#kkkkk,okkk~~~___,Y____,______######', // 16
    '*kkkkkkkkkk~~~_______Y____,___######', // 17
    '#kkkkkkkkkk~~~____________,_o_##:###', // 18
    '#kkkkkkkkkk~~~_____o_______Y__#~~###', // 19
    '#kttkkkk,tk~~~_tt,____tt___,__~~####', // 20
    '#kkkkkkkkkk~~~~~~~~~~~~~~~~~~~~~####', // 21
    '####*###*##~~~####*#####*###########', // 22
    '###########~~~######################', // 23
  ],
  entities: [
    // the bridge's near end: the forge-warden before the bridge gate (spec A3)
    { id: 'wf-bridge-gate', kind: 'gate', area: [11, 10, 11, 12], open: { beaten: 'wf-warden' }, guard: 'wf-warden',
      text: 'An iron grate across the near end of the bridge, and the forge-warden before it, its bellows breathing.' },
    { id: 'wf-warden', kind: 'encounter', enc: 'wf-warden', mode: 'block', at: [10, 11], face: 'w' },
    // the finale (spec A3): his lair on the smith's place before the furnace, his sprite's foot inside it
    { id: 'unsmith', kind: 'encounter', enc: 'unsmith', mode: 'lair', at: [27, 12], area: [26, 11, 28, 12], face: 'w' },
    // the heart: the step before the furnace's mouth, behind him (spec §4.7). Its look is `heart-step` until batch 4's
    // painting lands, and then `painted` (spec §2.3)
    { id: 'wf-heart', kind: 'sign', at: [30, 11], look: 'heart-step', talk: 'the-heart', talkIf: { beaten: 'unsmith' }, text: 'The step before the furnace\'s mouth. The heat comes out of it like breath.' },
    // the Worldforge in the east wall, and the great anvil beside the smith's place (each drawn once, at its foot)
    { id: 'wf-furnace', kind: 'prop', prop: 'worldforge', at: [32, 18], solid: true },
    { id: 'wf-anvil', kind: 'prop', prop: 'great-anvil', at: [25, 7], solid: true },
  ],
  exits: [
    { id: 'wf-out', area: [0, 10, 0, 12], to: 'chained-deep', anchor: 'from-forge' },
  ],
  anchors: { 'from-deep': [1, 11, 'e'] },
  roads: [{ from: 'from-deep', to: 'unsmith', gates: ['wf-bridge-gate'] }],
  roam: null,
});
