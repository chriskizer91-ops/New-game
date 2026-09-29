// The Frost Road (M5 spec §2.1, §2.3), the Tallymen's road over the tundra from Stormwatch to Frostmere.
// The road comes up from Stormwatch's north gate (SW corner) and turns east across a windswept plain
// of snow, frozen reeds and frost-killed trees, marked by road-cairns. A ridge of ice-crusted crags
// crosses the whole plain from north to south; the road goes through it at the Saw-Cut, a notch where
// the Tallymen have pitched their ice-saw camp (tents and stacked blocks of lake-ice either side), dragged
// a barricade of sledges across the road (20,12-13) and stand in the notch beside it (20,14). East of the
// ridge the Frost Cairn stands on the road (28,11), its fire-bowl full of snow; north of it a hollow in
// the crags is filled with deep drifted snow (31-42,3-6), a lost sledge-load at its back; south, the rime
// wolves run the open snow, and a cleft in the southern crags is sealed by a wall of old blue ice (42,20)
// with a cache behind it. The road runs on east to Frostmere.
// Layout notes: the Tallymen stand in the notch beside their barricade, so a Brand's re-armed Echo
// stands beside an open road. The drift is soft (3% of max HP a step without a key); the ice wall is the
// only way into the cleft.
// Tiles (tundra): '.' wind-packed snow, ',' snow ripples, '"' frozen reeds, 'T' frost-dead trees,
// 'o' boulders and stacked blocks of ice, '^' ice-crusted crags, '=' the road, 'm' deep drifts,
// ':' the cairn's paving, '#' the Frost Cairn's stones, 'H' the Tallymen's tents, 't' sledges.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'frost-road', name: 'The Frost Road', region: 'ironspire', biome: 'tundra', music: 'peaks',
  backdrop: 'frost-road', zone: 'frost-road', level: 16, travel: true, dark: false,
  lore: [[1015, 232, 3, 25], [1000, 180, 28, 11], [985, 128, 47, 12]],
  w: 48, h: 26,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^.,T^,^,^^^^..^^^.,T^^^,^^^^^^^^^^^^^^^^^,,^', //  1
    '^...",....,,.o.....^^^.,,....^^^^^^^.^^^^^^^^..^', //  2
    '^..,.....,,......."^^^..,,.,.^^mmmmmmmmmmmm^^.,^', //  3
    '^",,",.,.,."..,..,,.^^^,.,..,^^mmmmmmmmmmmm^^..^', //  4
    '^,,,".,.,..,...,...^^^..o,.,.^^mmmmmmmmmmmm^^..^', //  5
    '^..,,......,,....,"^^^,.,.,..^^mmmmmmmmmmmm^^..^', //  6
    '^..,,.."...,....,,^^^.....,,.....,......,..,^".^', //  7
    '^....T"..o...HH...^^^......".........,",...,.,o^', //  8
    '^.,...T,,,..,HH.t..^^^...,.."..T.".,..,....,...^', //  9
    '^...,.,...",,..ooo.^^^...T".#....,...,,...."...^', // 10
    '^.o.T"...o.........^o^o...,:::..,.,.,....T.....^', // 11
    '^,.=============================================', // 12
    '^,.=============================================', // 13
    '^..==",..,,."....."...,.....",..T..,.,...",....^', // 14
    '^..==...,,....t.oo.^o^^,,.....""...............^', // 15
    '^..==..,,....HH.o...^^^.,...,"........,.,...,..^', // 16
    '^.T==..,...,"HH..".^^^....o..,".....,T,,,......^', // 17
    '^..==,...,,.....o.,^^^...,..,...,,..."....,,...^', // 18
    '^..==...,....,....^^^...",...,..,,...,.,...o",.^', // 19
    '^."==,..".,...."..^^^,,.....,.".,..",..^^^.^^^.^', // 20
    '^,.==...,.,,....,..^^^...,,.....,,..,.,^^..,^^.^', // 21
    '^.^==^.,.....,,"...^^^.,.,..,.....T..,.^^...^^.^', // 22
    '^.^==^".T,....","..,^^^.,,.,...,,....,.^^^^^^^.^', // 23
    '^^^==^^^^^^^^,,,^^.^^^^^.^^^.T.^.^.^^^.^^^^^^^^^', // 24
    '^^^==^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', // 25
  ],
  entities: [
    { id: 'fr-cairn-west', kind: 'sign', at: [10, 11], look: 'stone', text: 'A road-cairn of ice-glazed stones, taller than a man. Frozen into its top, a Stormwatch pennant, torn to the staff.' },
    // M4.5 road gate (spec A3, §2.2): the Tallymen's sledges across the road in the Saw-Cut, the gang in the notch beside them
    { id: 'fr-saw-barricade', kind: 'gate', area: [20, 12, 20, 13], look: 'barred-gate', open: { beaten: 'fr-cutters' }, guard: 'fr-cutters', text: 'Sledges lashed together across the road where it goes through the ridge, stacked with blocks of lake-ice. A Tallyman sign nailed to them: ICE ROAD. TOLL IN IRON.' },
    { id: 'fr-cutters', kind: 'encounter', enc: 'fr-cutters', mode: 'block', at: [20, 14], face: 'w' },
    { id: 'frost-cairn', kind: 'hearthfire', at: [28, 11], stand: [28, 12, 'n'], cold: true },
    { id: 'fr-drift', kind: 'lock', lock: 'drift', area: [31, 3, 42, 6] },
    { id: 'fr-drift-sledge', kind: 'chest', at: [36, 2], loot: { gold: 110, bag: { 'hearth-tonic': 2 }, materials: { scrap: 1, silver: 1 } } },
    { id: 'fr-cairn-east', kind: 'sign', at: [38, 11], look: 'stone', text: 'A road-cairn. Wedged between its stones, a Tallyman\'s tally-stick: FORTY BLOCKS. PAID IN IRON. FOR THE BUYER UNDER THE ICE.' },
    { id: 'fr-wolves', kind: 'encounter', enc: 'fr-wolves', mode: 'pack', at: [33, 18], face: 'n' },
    { id: 'fr-ice-wall', kind: 'lock', lock: 'ice', at: [42, 20] },
    { id: 'fr-ice-cache', kind: 'chest', at: [42, 22], loot: { items: [{ rarity: 'storied', slot: 'body' }], gems: { 'glass-pearl': 1 }, materials: { embers: 1 } } },
  ],
  exits: [
    { id: 'frost-s', area: [3, 25, 4, 25], to: 'stormwatch', anchor: 'from-frost-road' },
    { id: 'frost-e', area: [47, 12, 47, 13], to: 'frostmere', anchor: 'from-frost-road' },
  ],
  anchors: { 'from-stormwatch': [3, 24, 'n'], 'from-frostmere': [46, 12, 'w'] },
  roads: [{ from: 'from-stormwatch', to: 'frost-e', gates: ['fr-saw-barricade'] }],
  roam: { max: 3, rects: [[2, 2, 17, 10], [6, 14, 17, 22], [23, 14, 38, 22], [23, 3, 28, 10]] },
});
