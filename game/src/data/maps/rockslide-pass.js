// The Rockslide Pass (M5 spec §2.1, §2.3). From the Last Camp at the end of the East Road (the Keep's east
// postern's six painted maps) a causeway crosses a mountain tarn (rows 55-56) to a paved landing at the foot
// of the mountains, where a signpost points up the pass.
// The road climbs north through pines and juniper to the Pass Shrine, a way-shrine cut into the crag
// east of the road with a coal the monks keep lit (19,40), a third of the way up. Above it lies the
// great slide: a band of boulders heaped right across the valley (rows 27-35), through which the monks
// dug a cut for the road. Rhune the Pass-Warden and his Stormwatch deserters have chained the cut
// (12-14,32) and stand in it beside the chain (15,32), their tent and toll-board below it. Past the
// slide the valley opens: west of the road a side hollow in the pines where the rime wolves den
// (5,23); east of it a crevasse the slide opened (x=21) with a cache on the shelf beyond, crossed only
// where it narrows (21,23). Higher up the road crosses the scree field, where the rocklings nest: two
// crags pinch the field to the road, the scree has slid across it (11-13,14) and the rocklings sit
// beside it (14,14). Above the field the road climbs to the col and on to Peak's Veil.
// Layout notes: both road guards stand in the gap beside their gates, so when a Brand re-arms them
// they stand beside open gates and never shut the road home. The crevasse is the only way to the shelf.
// Tiles (mountain): '.' alpine turf, ',' gravel and scree, '"' tussock grass, '=' the road, ':' the
// landing's and the shrine's paving, 'T' pines, 't' juniper, 'o' boulders, '^' crags and cliffs,
// 'x' the crevasse, '#' the shrine's drystone, '~' the tarn, 'b' the causeway, 'H' the deserters' tent.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'rockslide-pass', name: 'The Rockslide Pass', region: 'ironspire', biome: 'mountain', music: 'peaks',
  backdrop: 'rockslide-pass', zone: 'rockslide-pass', level: 13, travel: true, dark: false,
  lore: [[626, 332, 0, 55], [650, 330, 19, 40], [744, 246, 12, 0]],
  w: 26, h: 60,
  rows: [
    '^^^^^^^^^^^^==^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^o==o^^^^^^^^^^^', //  1
    '^^^^^^^^^T.,==..T^^^^^^^^^', //  2
    '^^^^^^^^...,==.,..^^^^^^^^', //  3
    '^^^^^^T..o..==....,T^^^^^^', //  4
    '^^^^^....,..==...o..^^^^^^', //  5
    '^^^^T....,..===...,..T^^^^', //  6
    '^^^^.,......===..,...,.^^^', //  7
    '^^^..o...,,.===.......o^^^', //  8
    '^^^,,,o,,,,,===,,o,o,,,^^^', //  9
    '^^oooo,,,,,,===,,,o,,,,o^^', // 10
    '^^oooo,ooo,,===,ooo,,,oo^^', // 11
    '^^^ooo,,o,,===,,ooo,,,,^^^', // 12
    '^^^^^^oo,,,===,,,oo^^^^^^^', // 13
    '^^^^^^^^^^^===,^^^^^^^^^^^', // 14
    '^^^^^^^o,,,===,,,o^^^^^^^^', // 15
    '^^^,o,,,,,,===,,,,,oooo^^^', // 16
    '^^,,o,,,,,,===,,,o,ooooo^^', // 17
    '^^^,,,oooo,===,,o,,,ooo^^^', // 18
    '^^^^.,oo,,,===,,,,,,,^^^^^', // 19
    '^^^^T..T....===..T..^xx^^^', // 20
    '^^^T..."....===....T^x...^', // 21
    '^^T.."......===.....^x.,.^', // 22
    '^^T...,..T..===........o.^', // 23
    '^^TT......"..===..T.^x...^', // 24
    '^^^T.."...T..===....^x..T^', // 25
    '^^^^TT.....T.===...o^xx^^^', // 26
    '^^^^^^^oo.....===.oo^^^^^^', // 27
    '^^^^^^^^oooo..===ooooo^^^^', // 28
    '^^^^^^oooooo..===oooooooo^', // 29
    '^^^^oooooooo,.===.oooooooo', // 30
    '^^ooooooooooo===.ooooooooo', // 31
    '^ooooooooooo===.ooooooooo^', // 32
    '^^oooooooooo===..oooooooo^', // 33
    '^^^ooooooo,.===..,oooooo^^', // 34
    '^^^^ooooo...===...oooo^^^^', // 35
    '^^^^^^oo..HH===..t..o^^^^^', // 36
    '^^^^^T....HH.===...t..^^^^', // 37
    '^^^^T..,.....===.......^^^', // 38
    '^^^^..t...,..===.^###^^^^^', // 39
    '^^^T....t...===...#:#^^^^^', // 40
    '^^^..".....===..,.....T^^^', // 41
    '^^T..,....===...,..t...^^^', // 42
    '^^...t...===..,"........^^', // 43
    '^^T.....===..."...T..t..^^', // 44
    '^T.."..===....o......"..T^', // 45
    '^^...,.===..T.....T.....^^', // 46
    '^^T....===.......,..o..T^^', // 47
    '^^^.t..===..,..T........^^', // 48
    '^^^T....===......"..T..^^^', // 49
    '^^^^T...===..T.........^^^', // 50
    '^^^^^..,.===......t...^^^^', // 51
    '~~~~~~...:===..,..T..^^^^^', // 52
    '~~~~~~~.::===:.......^^^^^', // 53
    '~~~~~~~:::===::.....T^^^^^', // 54
    'bbbbbbbbb::::::,..o..^^^^^', // 55
    'bbbbbbbbb:::::...T...^^^^^', // 56
    '~~~~~~~~~::::..."...^^^^^^', // 57
    '~~~~~~~~~~~~..o..T.^^^^^^^', // 58
    '~~~~~~~~~~~~~~~^^^^^^^^^^^', // 59
  ],
  entities: [
    { id: 'rp-sign', kind: 'sign', at: [15, 54], look: 'post', text: 'Peak\'s Veil. The bell will tell you when you are close.' },
    { id: 'pass-shrine', kind: 'hearthfire', at: [19, 40], stand: [19, 41, 'n'] },
    // M4.5 road gates (spec A3, §2.2): Rhune's chain across the cut through the slide, the deserters in
    // the gap beside it; higher up, the scree slid across the road, the rocklings beside it
    { id: 'rp-toll-chain', kind: 'gate', area: [12, 32, 14, 32], look: 'chain', open: { beaten: 'rp-brigands' }, guard: 'rp-brigands', text: 'A chain across the cut the monks dug through the slide, hung with a tin cup. Rhune the Pass-Warden takes his toll in coin, and he has deserted from better posts than this.' },
    { id: 'rp-brigands', kind: 'encounter', enc: 'rp-brigands', mode: 'block', at: [15, 32], face: 's' },
    { id: 'rp-toll-board', kind: 'sign', at: [9, 35], look: 'post', text: 'TOLL. ONE SILVER A HEAD, TWO FOR A MULE. BY ORDER OF THE PASS-WARDEN. Under it, older and deeper: STORMWATCH 3RD COMPANY.' },
    { id: 'rp-wolves', kind: 'encounter', enc: 'rp-wolves', mode: 'pack', at: [5, 23], face: 'e' },
    { id: 'rp-crevasse', kind: 'lock', lock: 'chasm', at: [21, 23] },
    { id: 'rp-crevasse-cache', kind: 'chest', at: [23, 21], loot: { gold: 90, items: [{ rarity: 'runed', slot: 'feet' }], materials: { silver: 1 } } },
    { id: 'rp-scree', kind: 'gate', area: [11, 14, 13, 14], look: 'boulder', open: { beaten: 'rp-rocklings' }, guard: 'rp-rocklings', text: 'The scree has slid across the road again. Some of the stones in it are breathing.' },
    { id: 'rp-rocklings', kind: 'encounter', enc: 'rp-rocklings', mode: 'block', at: [14, 14], face: 's' },
  ],
  exits: [
    { id: 'rp-camp', area: [0, 55, 0, 56], to: 'last-camp', anchor: 'from-pass' },
    { id: 'rp-veil', area: [12, 0, 13, 0], to: 'peaks-veil', anchor: 'from-pass' },
  ],
  anchors: { 'from-camp': [1, 55, 'e'], 'from-veil': [12, 1, 's'] },
  roads: [{ from: 'from-camp', to: 'rp-veil', gates: ['rp-toll-chain', 'rp-scree'] }],
  roam: { max: 3, rects: [[3, 41, 22, 51], [3, 20, 12, 26], [3, 9, 22, 12], [3, 16, 22, 19]] },
});
