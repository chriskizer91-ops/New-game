// The Misthollow Ruins (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-misthollow.png): the
// city the marsh swallowed, in fog (`fog: true`). Grey towers lean out of green water among arches and half-drowned
// streets. At the top left the Tallymen's salvage camp stands on timber decking over the water: crates, two tents,
// their crane (7,3), a moored boat, and the jetty where the sealed chest waits (7,10). The long boardwalk comes in on
// the camp's upper deck (W), past the Company's notice (1,5); the deck runs east onto the broken pier, where Corvus
// stands at the end (12,4). Beyond him the planks are gone, but the old street under the pier's last posts is only
// knee-deep: it wades east to the old lane (19,4), where a carved lintel lies across the quay (20,3). The lane runs
// south past the old square (its fountain, columns, a small ruin, the arcade) to the little humped bridge, whose
// landing stops at the drowned belltower's wall. The avenue runs east below the square to the dry belltower, the
// Belltower Fire's bowl cold at its foot (38,13), and on to a terrace whose stair goes down into a flooded court. The
// main street runs south from the avenue out of the picture: the Tallymen have chained it (28-30,16), the
// Salvage-Master beside the chain (31,16); lower down the water-gate's portcullis shuts it (27-29,25), the drowned
// bell-ringers beside it (30,25), before it leaves for the Blackwater Reach (S). Past the chain a break in the street's
// west wall (26,17) lets you down into the flooded streets: the drowned square west of it, its paving plain under the
// water, runs to the drowned belltower, whose spiral stair climbs its side to the door, the stair down to the Drowned
// Belfry (12-13,15); a gap in a low wall opens on a small square with steps down to the water (20-24,22-24); and a
// drowned street runs south to a little arched bridge whose last span is gone, the dock (14,24), into a drowned tower
// with a chest on its floor (8,22).
// Layout notes: the Belltower Fire comes before the salvage crew on GLOOM_PATH, so the chain holds the main street
// just below the avenue, where the ways to the Belfry and to the Reach part from the Fire's side of the city; each
// guard stands at its gate's end, facing up the street. The painting shows no way from the camp to the city, so the
// broken pier's line is a wade (the shallows at x 11-18, y 4-5). The dock is the only way into the drowned tower.
// Traced from the painting (one tile is 36.6 of its px; `overTiles: false`). Tiles (sunken-city): ':' old paving,
// ',' weeds and planted ground, 'w' flooded streets and the wade, '~' deep water, '"' reeds, '_' the camp's decks,
// 'b' the pier, the jetty and the bridges, '|' the crane, the rails and posts, 't' crates, 'T' trees and bushes,
// '#' ruined masonry, 'H' tower tops and tents, 'Y' columns and pillars, 'o' fallen masonry and the fountain,
// 's' the stair down.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'misthollow', name: 'The Misthollow Ruins', region: 'gloomfen', biome: 'sunken-city', music: 'fen',
  backdrop: 'misthollow', zone: 'misthollow', level: 17, travel: true, dark: false, fog: true, overTiles: false,
  lore: [[330, 680, 20, 13]],
  w: 42, h: 28,
  rows: [
    'TT~~~~~~~~~~~~~~~~~#############~~Y##HHH##', //  0
    'TT~~~~~~~~~~~~~~~~~::###########TTY##HHHH#', //  1
    '~~~~~~~||~~~~~~~~~~::###########TT~##HHHH#', //  2
    '~tttHH~_|~~~~~~~~~~::###########TT~##HHHH#', //  3
    '___________bbwwwww"::TT#####::::o####HHHH#', //  4
    '__|||_|||_|wwww##TT:::::::Y::oo::::##HHHH#', //  5
    '||tHH_|~~_|~~~~##TT:::Y:::Y::oo:#~~##HHHH#', //  6
    '|||tt______|HH##~TT:::###:Y::oo:#~~##HHHH#', //  7
    '~~_________|HH##~TT:::###::Y:::o#~~##HHHH#', //  8
    '~~_~~~~b~~~HHHH~~~~:::###ToYT:::##########', //  9
    '~~~~~~~b~~YHHHH##~~:::::TT#YT::##~~#######', // 10
    '~~~~~~~~~~YHHHH####:::::::::T::T#~~#######', // 11
    '~~~~~~~~~~YHHHH#:::bbbb:::::::::##########', // 12
    '~~~~~~~~~~#####:::#########T:::::::::::::#', // 13
    '~~~~~~~~~~##########~~#####T:::::::::::::#', // 14
    '~~~~~~~~~~##ss###wwwwwwwow##::::###T:::::#', // 15
    '~~~~~~~~~~##ss###wYwwwwYww##::::###T:::::#', // 16
    '~~~~~~~~~~###s###wYwwwwYwww::::####~~:####', // 17
    '~~~~~~~~~~###ss#wwwwwwwYw##Y:::#wwwwY:####', // 18
    '~~~~~~~~~~####sswYw##wwww##Y:::#wwowY:####', // 19
    '~~~~~########~owwww###ww###Y:::#wwwwww####', // 20
    '~~~~~########~owwwY###:####Y:::#wY########', // 21
    '~~~~~##::::ww~~ww~##:::::#,::::#~~########', // 22
    '~~~~~##::::,,~~ww~##:::::#,:::::::########', // 23
    '~~~~~######,bbwww~##::::##,:::::::########', // 24
    '~~~~~##########ww~####::###::::#~~########', // 25
    '~~~~~##########ww~####::###::::#~~########', // 26
    '~~~~~~~~~~~~~~~~~~##~~~~~~#::::#~~########', // 27
  ],
  entities: [
    { id: 'mh-lintel', kind: 'sign', at: [20, 3], look: 'stone', text: 'A carved lintel, fallen across the quay: MISTHOLLOW, CITY OF BELLS. Stand still, and you can hear them still, under the water.' },
    { id: 'bell-hearth', kind: 'hearthfire', at: [38, 13], stand: [38, 14, 'n'], cold: true },
    { id: 'corvus', kind: 'npc', npc: 'corvus', at: [12, 4], face: 'n' },
    { id: 'mh-tower-dock', kind: 'lock', lock: 'blackwater', at: [14, 24] },
    { id: 'mh-tower-cache', kind: 'chest', at: [8, 22], loot: { gold: 130, items: [{ rarity: 'storied', slot: 'ring' }], materials: { silver: 1, embers: 1 } } },
    { id: 'mh-salvage-notice', kind: 'sign', at: [1, 5], look: 'post', text: 'SALVAGE RIGHTS: THE COMPANY. EVERYTHING UNDER THE WATER IS TALLIED. SO ARE TRESPASSERS.' },
    // the crane is in the painting: the entity only lets you read it (the painting shows no diving bell)
    { id: 'mh-crane', kind: 'sign', at: [7, 3], look: 'painted', name: 'The crane', text: 'The Tallymen\'s crane, lashed to the deck with tarred rope. A net hangs from its jib, heavy with what the water gave up: roof-lead, green bronze, the clapper of a bell as long as your arm.' },
    // the sealed chest the salvage crew pulled up (the quest The Dead Tongue): theirs until they are beaten
    { id: 'mh-sealed-chest', kind: 'prop', prop: 'sealed-chest', at: [7, 10], solid: true, if: { not: { beaten: 'mh-salvage' } } },
    // M4.5 road gate (spec A3, §2.2): the salvage crew's chain across the main street below the avenue, the
    // Salvage-Master at its end
    { id: 'mh-salvage-chain', kind: 'gate', area: [28, 16, 30, 16], look: 'chain', open: { beaten: 'mh-salvage' }, guard: 'mh-salvage', text: 'A chain across the old high street, below the square, and a tally-board on it: SALVAGE IN PROGRESS. The Salvage-Master looks up from his ledger, and does not put it down.' },
    { id: 'mh-salvage', kind: 'encounter', enc: 'mh-salvage', mode: 'block', at: [31, 16], face: 'n' },
    // M4.5 road gate: the water-gate's portcullis across the main street near the south edge, the drowned bell-ringers
    // at its end
    { id: 'mh-water-gate', kind: 'gate', area: [27, 25, 29, 25], look: 'water-gate', open: { beaten: 'mh-ringers' }, guard: 'mh-ringers', text: 'The water-gate\'s portcullis is down to the flood. The bell-ringers stand in the arch beside it, their ropes still in their hands.' },
    { id: 'mh-ringers', kind: 'encounter', enc: 'mh-ringers', mode: 'block', at: [30, 25], face: 'n' },
  ],
  exits: [
    { id: 'mh-w', area: [0, 4, 0, 5], to: 'long-boardwalk', anchor: 'from-misthollow' },
    { id: 'mh-belfry', area: [12, 15, 13, 15], to: 'drowned-belfry', anchor: 'from-misthollow' },
    { id: 'mh-s', area: [27, 27, 30, 27], to: 'blackwater-reach', anchor: 'from-misthollow' },
  ],
  anchors: { 'from-boardwalk': [1, 4, 'e'], 'from-belfry': [13, 16, 's'], 'from-reach': [28, 26, 'n'] },
  roads: [
    { from: 'from-boardwalk', to: 'mh-s', gates: ['mh-salvage-chain', 'mh-water-gate'] },
    { from: 'from-boardwalk', to: 'mh-belfry', gates: ['mh-salvage-chain'] },
  ],
  roam: { max: 3, rects: [[21, 5, 31, 11], [23, 12, 40, 14], [16, 15, 25, 21]] },
});
