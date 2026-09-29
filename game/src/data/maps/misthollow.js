// The Misthollow Ruins (M6 spec §2.1, §2.3), the city the marsh swallowed, in fog (`fog: true`): towers leaning out of
// the water, arches, half-drowned streets. The long boardwalk comes in at the old quay (W), where a carved lintel has
// fallen across the stones. North of the quay the dry belfry stands open at its foot, the Belltower Fire's bowl cold
// in it (3,10); Corvus sits at the end of a broken pier over the drowned north (8,5); south-west a tower stands in a
// flooded pool, reached from the quay only by the dock (3,20), with a chest inside. The old street runs east to the
// Great Canal, and the Tallymen's salvage camp is built along the canal's bank at the bridgehead: decks, scaffolding,
// a crane, the diving bell and the sealed chest on their jetty (13-14,19). They have chained the street at the bridge
// (12,15-16), and the Salvage-Master stands beside the chain (12,17). Over the canal lies the old city: the old street
// runs on east between the arcades of the old square; Bell Street runs north from it to the sunken belltower (NE),
// whose stair goes down to the Drowned Belfry (27-28,5); Gate Street runs south over the Little Canal's bridge to the
// south wall, where the water-gate lets the flooded street out to the Blackwater Reach and the drowned bell-ringers
// stand in its arch beside the portcullis (26,26). Leaning towers and roofless houses stand between the streets, a
// second belltower over the square; the south-east quarter is drowned, its towers standing up out of the water.
// Layout notes: the canal and the south wall hold both gates; each guard stands in its pass beside its gate (a
// Brand's re-armed rematch stands beside an open road). The dock is the only way into the flooded tower.
// Tiles (sunken-city): ':' old paving, ',' rubble and weeds, 'w' flooded streets, '~' deep water, '"' reeds,
// '_' the salvage camp's decks, 'b' its planks and the bridge, '|' its scaffolding, 't' its crates, '#' ruined
// masonry, 'H' tower tops, 'Y' columns and arches, 'o' fallen masonry, '+' doors, 's' the stair down.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'misthollow', name: 'The Misthollow Ruins', region: 'gloomfen', biome: 'sunken-city', music: 'fen',
  backdrop: 'misthollow', zone: 'misthollow', level: 17, travel: true, dark: false, fog: true,
  lore: [[330, 680, 17, 15]],
  w: 36, h: 32,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', //  0
    '~~HH~~~~~~Y~~~~~~~~~~~~~~~~~~~~~~HH~', //  1
    '~~##~~~~~~~~~~~~~~~HHH~~oHHHHH~~~HH~', //  2
    '~~~~~~Y~~Y~~~~~~~~~###~~~HHHHH~~~##~', //  3
    '~~~~~~~~~~~o~~~~~~~~~~~Y~#####~~~~~~', //  4
    '~~~~~o~~b~~~~~~~~o~~~~~~~##ss#~o~~~~', //  5
    '~~~~~~~~bb,::~~~~~~~~~~~~:::::~~~~~~', //  6
    '~HHHHH::bb:::~~~:HH:HHHH,::::::HHH~~', //  7
    '~HHHHH::bb,::~~~:HH:#+##::::,::HHH~~', //  8
    '~#####::bb|__~~~w##:::,::w::##:HHH~~', //  9
    '~#:::#::bb__t~~~w:o:ww::::::##:#+#~~', // 10
    'o:,,::::bb___~~~::w:Y::Y::::Y::Y::o~', // 11
    'o:w:::,:bb___~~~:,:::::::o::::::ww:#', // 12
    'o::::::w::_t_~~~:::,Y::Y::::Y::Ywww#', // 13
    'o::w:::::,__|~~~::::::,::::::::::w:#', // 14
    '::::::::::___bbb::::::::::::::::::o#', // 15
    '::::::::::___bbb::::::::::::::::::,#', // 16
    'o:::::::::___~~~:HHH:HH:::::,:::HH:#', // 17
    'o:::::,:::__|~~~:#+#:HH::::::ww:##:#', // 18
    '~::::::::,___bb~:::,:##::::w~~~~~~~#', // 19
    '~~~w~~~~:,__t~~~~~~~~~~~bb~~~~~~~~~#', // 20
    '~##w##~~::t__~~~~~~~~~~~bb~~~HH~~~~#', // 21
    '~#www#~~:w:::~~~::HHH:,:::w~~##~o~~#', // 22
    '~#www#~~::::,~~~::#+#::::::w~~~~~HH#', // 23
    '~#####~~::w::~~~w:::,:Y:::::ww~~~###', // 24
    '~~~~~~~~,::::~~~::,:::::www::www::,#', // 25
    '~~~~~~~~~~~~~~~~########www#########', // 26
    '~~~~~~~~~~~~~~~~~~~~~~~~ww"""~~~~~~~', // 27
    '~~~~~~~~~~~~~~~~~~~~""""ww"""~~~~~~~', // 28
    '~~~~~~~~~~~~~~~~~~~~""""ww"""~~~~~~~', // 29
    '~~~~~~~~~~~~~~~~~~~~""""ww~~~~~~~~~~', // 30
    '~~~~~~~~~~~~~~~~~~~~~~~~ww~~~~~~~~~~', // 31
  ],
  entities: [
    { id: 'mh-lintel', kind: 'sign', at: [6, 14], look: 'stone', text: 'A carved lintel, fallen across the quay: MISTHOLLOW, CITY OF BELLS. Stand still, and you can hear them still, under the water.' },
    { id: 'bell-hearth', kind: 'hearthfire', at: [3, 10], stand: [3, 11, 'n'], cold: true },
    { id: 'corvus', kind: 'npc', npc: 'corvus', at: [8, 5], face: 'n' },
    { id: 'mh-tower-dock', kind: 'lock', lock: 'blackwater', at: [3, 20] },
    { id: 'mh-tower-cache', kind: 'chest', at: [3, 23], loot: { gold: 130, items: [{ rarity: 'storied', slot: 'ring' }], materials: { silver: 1, embers: 1 } } },
    { id: 'mh-salvage-notice', kind: 'sign', at: [9, 17], look: 'post', text: 'SALVAGE RIGHTS: THE COMPANY. EVERYTHING UNDER THE WATER IS TALLIED. SO ARE TRESPASSERS.' },
    { id: 'mh-crane', kind: 'prop', prop: 'crane', at: [11, 11], solid: true },
    { id: 'mh-diving-bell', kind: 'prop', prop: 'diving-bell', at: [14, 19], solid: true },
    // the sealed chest the salvage crew pulled up (the quest The Dead Tongue): theirs until they are beaten
    { id: 'mh-sealed-chest', kind: 'prop', prop: 'sealed-chest', at: [13, 19], solid: true, if: { not: { beaten: 'mh-salvage' } } },
    // M4.5 road gate (spec A3, §2.2): the salvage camp's chain across the old street at the bridge, the crew beside it
    { id: 'mh-salvage-chain', kind: 'gate', area: [12, 15, 12, 16], look: 'chain', open: { beaten: 'mh-salvage' }, guard: 'mh-salvage', text: 'A chain across the old street at the bridge, and a tally-board on it: SALVAGE IN PROGRESS. The Salvage-Master looks up from his ledger, and does not put it down.' },
    { id: 'mh-salvage', kind: 'encounter', enc: 'mh-salvage', mode: 'block', at: [12, 17], face: 'w' },
    // M4.5 road gate: the water-gate's portcullis in the south wall, the drowned bell-ringers in its arch beside it
    { id: 'mh-water-gate', kind: 'gate', area: [24, 26, 25, 26], look: 'water-gate', open: { beaten: 'mh-ringers' }, guard: 'mh-ringers', text: 'The water-gate\'s portcullis is down to the flood. The bell-ringers stand in the arch beside it, their ropes still in their hands.' },
    { id: 'mh-ringers', kind: 'encounter', enc: 'mh-ringers', mode: 'block', at: [26, 26], face: 'n' },
  ],
  exits: [
    { id: 'mh-w', area: [0, 15, 0, 16], to: 'long-boardwalk', anchor: 'from-misthollow' },
    { id: 'mh-belfry', area: [27, 5, 28, 5], to: 'drowned-belfry', anchor: 'from-misthollow' },
    { id: 'mh-s', area: [24, 31, 25, 31], to: 'blackwater-reach', anchor: 'from-misthollow' },
  ],
  anchors: { 'from-boardwalk': [1, 15, 'e'], 'from-belfry': [27, 6, 's'], 'from-reach': [24, 30, 'n'] },
  roads: [
    { from: 'from-boardwalk', to: 'mh-s', gates: ['mh-salvage-chain', 'mh-water-gate'] },
    { from: 'from-boardwalk', to: 'mh-belfry', gates: ['mh-salvage-chain'] },
  ],
  roam: { max: 3, rects: [[0, 6, 9, 19], [16, 7, 35, 14], [16, 17, 35, 25]] },
});
