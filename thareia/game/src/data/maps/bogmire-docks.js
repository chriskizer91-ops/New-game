// Thareia (T1): the Bogmire docks, where the Prologue starts. Traced tile by tile from the player's painting
// art-in/scenes/walk-bogmire.webp (1536 x 1024, 48 x 32 tiles at 32 px; `overTiles: false`): a stilt village on
// the south edge of Bogmire, a mooring tower with Captain Yara Dustwind's cargo skiff riding at its ropes, plank
// boardwalks over black water, and reed islands.
// The north stair climbs to Bogmire's south street (th-bogmire). The west boardwalk runs into the deep fen, the east
// boardwalk to a reed island and on east, and a dirt path crosses the south island by a little bridge: all three are
// closed in the Prologue (the water is warming, and what lives in it is coming up).
// Tiles: '_' boardwalks and decks, 's' stairs, '=' the islands' dirt paths, 'b' the bridge, '~' water, 'T' reed and tree
// islands, '#' the three houses and the mooring tower, 't' the crates on the dock (and a planter), 'o' a rock.
// The skiff is a painted-only sign over the water north of the dock (27..33, 6..11): face it from the dock to board.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'bogmire-docks', name: 'Bogmire Docks', region: 'gloomfen', biome: 'stilt-town', music: 'marsh',
  backdrop: 'bogmire', zone: null, level: 1, travel: true, dark: false, overTiles: false,
  lore: [[280, 540, 24, 16]],
  w: 48, h: 32,
  rows: [
    'TTTTTTTTTTTTTTTT~TTTTTT__~TTTTTTTTTTTT~~~~~~~~~~', //  0
    'TTTTTTTTTTTTTTTT~TTTTTT__~TTTTTTTTTTTT~~~~~~~~~~', //  1
    'TTTTTTTTTTTTTTTT~TTTTTTsssTTTTTTTTTTTT~~~~~~~~~~', //  2
    'TTTTTTTTTTTTTTTT~TTTTTT~ssTTTTTTTTTTTT~~~~~~~~~~', //  3
    'TTTTTTTTTTTTTTTT~TTTTTT~__~~~~~~~TTTTT=====TTTTT', //  4
    'TTTTTTTTTTTTTTTT~~~~~~~~____~~~~~TTTTT======TTTT', //  5
    'TTTTTTTTTTTTTTTT~~~~~~~##__~~~~~~TTTTTTTT====TTT', //  6
    'TTTTTTTTTTTTTTTT___________~~~~~~TTTTTTTTTT__TTT', //  7
    'TTTTTTTTTTTTTTT____##__##_~~~~~~~~~~~~~~~~~___~~', //  8
    'TTTTTTTTTTTTTTTT~########_~~~~~~~~~~~~~~~~~~____', //  9
    'TTTTTTTTTTTTTTTT~########_~~~~~~~~~~~~~~~~~~~___', // 10
    '~~~~~~~~~~~##############_~~~~~~~~~~~~~~~~~~____', // 11
    '~~~~~~~~~~~##############____~~~~~~~~~~~~~_____~', // 12
    '___~~~~~~~~##############___tt~~~~~~~~_______~~~', // 13
    '______~~~~~##############_______~~_______~~~~~~~', // 14
    '~~~______~~###########~~~_~~________~~~~___~~~~~', // 15
    '~~~~~~_________#######_______________TTTTTTTTTTT', // 16
    '~~~~~~~~~~~____#####_______TTT_____TTTTTTTTTTTTT', // 17
    '~~~~~~~~~~~~~~__________~~~TTTTTTTTTTTTTTTTTTTTT', // 18
    'TTTTTTT~~~~~~~~~~~~~~~sss~~TTTTTTTTTTTTTTTTTTTTT', // 19
    'TTTTTTT~~~~~~~~~~~~~~~~sss~TTTTTTTTTTTTTTTTTTTTT', // 20
    'TTTTTTT~~~~~~~~~~~~~~~~~sssTTTTTTTTTTTTTTTTTTTTT', // 21
    'TTTTTTTTTTTTTTTTTTTTTTTT====TTTTTTTTTTTTTTTTTTTT', // 22
    'TTTTTTTTTTTTTTTTTTTTTTTT~====TTTTTTTTTTTTTTTTTTT', // 23
    'TTTTTTTTTTTTTTTTTTTTTTTT~~===TTTTTTTTTTTTTTTTTTT', // 24
    'TTTTTTTTTTTTTTTTTTTTTTTT~~===TTTTTTTTTTTTTTTTTTT', // 25
    'TTTTTTTTTTTTTTTTTTTTTTTT~~bbbTTTTTTTTTTTTTTTTTTT', // 26
    'TTTTTTTTTTTTTTTTTTTTTTTT~~bbbTTTTTTTTTTTTTTTTTTT', // 27
    'TTTTTTTTTTTTTTTTTTTTTTTT~=====TTTTTTTTTTTTTTTTTT', // 28
    'TTTTTTTTTTTTTTTTTTTTTT=======TTTTTTTTTTTTTTTTTTT', // 29
    'TTTTTTTTTTTTTTTTTTTT=======TTTTTTTTTTTTTTTTTTTTT', // 30
    'TTTTTTTTTTTTTTTTTTT=======~TTTTTTTTTTTTTTTTTTTTT', // 31
  ],
  entities: [
    { id: 'th-intro', kind: 'trigger', area: [0, 0, 47, 31], on: 'enter', if: { not: { flag: 'th-arrived' } }, dialogue: 'th-intro' },
    { id: 'dk-leeches', kind: 'encounter', enc: 'dk-leeches', mode: 'block', at: [44, 8], face: 's' },
    { id: 'docks-lantern', kind: 'hearthfire', at: [27, 5], stand: [26, 5, 'e'] },
    { id: 'yara', kind: 'npc', npc: 'yara', at: [27, 12], face: 'n', if: { not: { flag: 'th-hired' } } },
    { id: 'yara-deck', kind: 'npc', npc: 'yara', at: [29, 14], face: 'w', if: { all: [{ flag: 'th-hired' }, { not: { flag: 'th-shard' } }] } },
    { id: 'dock-crate', kind: 'sign', look: 'painted', area: [28, 13, 29, 13], text: 'Crates of salt fish and lamp oil, waiting for the next boat out.', talk: 'th-crate' },
    { id: 'skiff', kind: 'sign', look: 'painted', area: [27, 6, 33, 11], text: 'Captain Dustwind\'s cargo skiff, riding at its ropes. Four sunstone crystals glow above the deck.', talk: 'th-skiff' },
    { id: 'dock-fisher', kind: 'npc', npc: 'th-fisher', at: [4, 14], face: 'e' },
    { id: 'dock-widow', kind: 'npc', npc: 'th-netmender', at: [13, 17], face: 's' },
    { id: 'island-cache', kind: 'chest', at: [40, 4], loot: { gold: 25, bag: { 'hearth-tonic': 1 } } },
    { id: 'docks-sign', kind: 'sign', at: [21, 17], look: 'post', text: 'BOGMIRE DOCKS. Up the stair to the town. Mind the planks: some of them are only pretending.' },
  ],
  exits: [
    { id: 'dk-town', area: [23, 0, 24, 0], to: 'th-bogmire', anchor: 'from-docks' },
    { id: 'dk-west', area: [0, 13, 0, 14], sealed: { region: 'gloomfen', text: 'The west boardwalk runs out into the deep fen. Something big moves under the planks, and the water steams.', hint: 'Not with a level-one sword arm. Come back stronger.' } },
    { id: 'dk-east', area: [47, 9, 47, 11], sealed: { region: 'gloomfen', text: 'The east boardwalk is half under water, and the water is warm as a bath.', hint: 'Not with a level-one sword arm. Come back stronger.' } },
    { id: 'dk-south', area: [19, 31, 25, 31], sealed: { region: 'gloomfen', text: 'The marsh road south. Nobody walks it since the water warmed. Nobody who came back, anyway.', hint: 'Not with a level-one sword arm. Come back stronger.' } },
  ],
  anchors: { start: [24, 17, 'n'], 'from-town': [24, 1, 's'], 'from-skiff': [26, 13, 's'] },
  roam: null,
});
