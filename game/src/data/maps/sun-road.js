// The Sunward Road (M4 spec §2.1, §2.3). From the Keep's south-east postern a causeway-bridge crosses
// the lake (rows 0-6) to a reedy shore, where a signpost points the way. The caravan road then runs
// south through green scrub and cacti (the north third), past the Waystone Fire in its ring of old
// paving beside a standing stone (16,20), and out into the sand. West of the road a rocky outcrop hides
// a hollow whose only way in is a fused dune-glass wall (7,30), with a cache inside. Two-thirds of the
// way down the scarps close in to a rocky neck: Rasa the Dune-Rider has strung a chain across the road
// (12-14,41) and waits beside it with her raiders (15-16,41) in front of her tent. Past the neck the
// dunes open out (the sand-skinks' ground, and a picked-over caravan wreck) until the road climbs
// between two sandstone milestones to Sandspire's north ramp.
// Layout notes: the toll is M3's Bramble Toll pattern: the chain opens for good once Rasa is beaten
// (flags.beaten), so the Brand of Glass's re-armed Echo stands beside the road, never across it.
// Tiles (desert): '.' sand, ',' sand ripples, '"' green scrub, '=' the caravan road, 'T' cacti, 't'
// thornbush, 'o' rock, '^' scarp, '~' the lake, 'b' the causeway, 'H' a tent or a wagon's canopy, '#' a
// sandstone milestone, ':' old paving.
// Format: src/data/maps/index.js. Owner: M4 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'sun-road', name: 'The Sunward Road', region: 'sunscorch', biome: 'desert', music: 'desert',
  backdrop: 'sun-road', zone: 'sun-road', level: 9, travel: true, dark: false,
  lore: [[556, 402, 12, 0], [700, 420, 16, 21], [858, 458, 12, 63]],
  w: 26, h: 64,
  rows: [
    '~~~~~~~~~~~~bb~~~~~~~~~~~~', //  0
    '~~o~~~~~~~~~bb~~~~~~~~o~~~', //  1
    '~~~~~~~~~~~~bb~~~~~~~~~~~~', //  2
    '~~~~~~o~~~~~bb~~~~~~~~~~~~', //  3
    '~~~~~~~~~~~~bb~~~~~~o~~~~~', //  4
    '~~~~~~~~~~~~bb~~~~~~~~~~~~', //  5
    '~~~~~~~~~~".bb."~~~~~~~~~~', //  6
    '~~~~""~",,..==..,"~~""~~~~', //  7
    '~~""",""..,.==.,..,"",""~~', //  8
    '~",.."."....==..",."."""~~', //  9
    'T"..t..,.."===.."..t.""..T', // 10
    'TT.,..T....===,...,...T.TT', // 11
    'T..."......===..."......TT', // 12
    'T.t...,..t.===.,...t.,...T', // 13
    'TT.."....,===..".....T..TT', // 14
    'T.,.T.."..===.,..T..,.t..T', // 15
    'T....,....===..."...,.."TT', // 16
    'TT.t..".,.===..t.....".tTT', // 17
    'T..".....===..,.o...o..,.T', // 18
    'T.,..t...===.,.:::..."...T', // 19
    'T..t.....===..:::::.o..,.T', // 20
    'T...,..".===.::::::...t..T', // 21
    'TT.....,.===..::::..,..".T', // 22
    'T.t..,...===...o..".....tT', // 23
    'T.....t..===..,....o...,.T', // 24
    'To...,...===....,......o.T', // 25
    'o....o....===.....,....o.o', // 26
    '^^^^^^^o..===..,.....o...^', // 27
    '^..,..^^..===.....,,.....^', // 28
    '^.....^^..===..o...,,,...^', // 29
    '^.,.....,..===....,.....o^', // 30
    '^^....^^...===..,....,,..^', // 31
    '^^^^^^^o...===.o.....,...^', // 32
    'o.....,....===....o......^', // 33
    '^...,.......===..,...,...^', // 34
    '^..,,...,...===...,,....o^', // 35
    '^o.....,....===.,.....,..^', // 36
    '^^..o.......===....o.....^', // 37
    '^^^^...,...o===...HH..o^^^', // 38
    '^^^^^^^^^^..===..oHH^^^^^^', // 39
    '^^^^^^^^^^^o===..^^^^^^^^^', // 40
    '^^^^^^^^^^^^===..^^^^^^^^^', // 41
    '^^^^^^^^^^^.===.o^^^^^^^^^', // 42
    '^^^^^^^^^...===...^^^^^^^^', // 43
    '^^^^.....,.===.....,...^^^', // 44
    '^^...,,....===..o.....,.^^', // 45
    '^...,,,...o===......,....^', // 46
    '^..o..,....===..,,.......^', // 47
    '^..........===.,,,...o...^', // 48
    '^^..,......===..,,.......^', // 49
    '^...,,..o..===.......,..o^', // 50
    '^..o......===..,....,,...^', // 51
    '^.HH.....,===......,.....^', // 52
    '^o.,......===...o....,...^', // 53
    '^^...,....===.......,,...^', // 54
    '^...,,....===...,........^', // 55
    '^^.....o..===......o....^^', // 56
    '^^^..,.....===..,......^^^', // 57
    '^^^^.......===.......o.^^^', // 58
    '^^^^^^.....===......^^^^^^', // 59
    '^^^^^^^...#===#...^^^^^^^^', // 60
    '^^^^^^^^^...==...^^^^^^^^^', // 61
    '^^^^^^^^^^..==..^^^^^^^^^^', // 62
    '^^^^^^^^^^^^==^^^^^^^^^^^^', // 63
  ],
  entities: [
    { id: 'sr-gate-sign', kind: 'sign', at: [14, 8], look: 'post', text: 'Sandspire, three days by caravan.' },
    { id: 'waystone', kind: 'hearthfire', at: [16, 20], stand: [16, 21, 'n'] },
    { id: 'sr-standing-stone', kind: 'sign', at: [17, 19], look: 'monolith', text: 'A standing stone taller than a rider, carved with a sun above a road. Scratched under it: WATER AT SANDSPIRE.' },
    { id: 'sr-glass-wall', kind: 'lock', lock: 'dune-glass', at: [7, 30] },
    { id: 'sr-glass-cache', kind: 'chest', at: [2, 29], loot: { items: [{ rarity: 'runed', slot: 'feet' }], materials: { silver: 1 } } },
    { id: 'sr-toll-chain', kind: 'gate', area: [12, 41, 14, 41], look: 'chain', open: { beaten: 'sr-toll' }, guard: 'sr-toll', text: 'A chain across the road, hung with empty water-skins. Rasa the Dune-Rider takes her toll in water.' },
    { id: 'sr-toll', kind: 'encounter', enc: 'sr-toll', mode: 'block', at: [15, 41], area: [15, 41, 16, 41], face: 'w' },
    { id: 'sr-skinks', kind: 'encounter', enc: 'sr-skinks', mode: 'pack', at: [19, 48], face: 's' },
    { id: 'sr-wreck', kind: 'chest', at: [2, 53], loot: { gold: 40, bag: { 'frost-draught': 2 }, materials: { scrap: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'sr-n', area: [12, 0, 13, 0], to: 'keep', anchor: 'from-sun-road' },
    { id: 'sr-s', area: [12, 63, 13, 63], to: 'sandspire', anchor: 'from-sun-road' },
  ],
  anchors: { 'from-keep': [12, 1, 's'], 'from-sandspire': [12, 62, 'n'] },
  roam: { max: 3, rects: [[1, 9, 24, 17], [8, 18, 24, 37], [1, 44, 24, 58]] },
});
