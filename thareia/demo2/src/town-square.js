// The Town Square (Thareia demo 2): the player's painting thareia/art-in/scenes/town-square.png, fitted to 45 x 34 tiles
// at 32 painting px per tile (the painting is resized from 1448 x 1086 to 1440 x 1088 first). Tiles: ':' cobbles, 'b' the
// stone bridge climbing north-east, 's' the steps down in the south-east, '#' buildings, the well, the stall and walls,
// 'T' trees and gardens, '~' the river. Rhune the Pass-Warden stands in the square, wearing the Windstep Boots.
// Format: src/data/maps/index.js of the Aethermoor game (commit 49195c1).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'town-square', name: 'The Town Square', region: 'verdant', biome: 'town', music: 'town',
  backdrop: 'forest-ruins', zone: null, level: 12, travel: false, dark: false,
  lore: [[540, 390, 22, 22]],
  w: 45, h: 34,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~TTTTTTTTTT', //  0
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~TTTTTTTTTT', //  1
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~TTTTTTTbbb', //  2
    '~~~~HHHHHHHHHHH~~~~~~~~~~~~~~~~~~~~TTTTTbbbbb', //  3
    '~~~#HHHHHHHHHHH#TTT######TTTTTT~~~~TTTbbbbbbT', //  4
    '~~~#HHHHHHHHHHH#TTT######TTTTTT~~~~TbbbbbbTTT', //  5
    '~~~#############TTT##########TTTTTbbbbbbT~~~~', //  6
    '~~~#############TTT##########TT###bbbbTTT~~~~', //  7
    '~~~#############TT:##########TT###::::~~~~~~~', //  8
    '~~~#############TT:::TT###########::::~~~~~~~', //  9
    'TTT#############TT:::TT###########::::~~~~~~~', // 10
    'TTT#############::::::::::########::::~~~~~~~', // 11
    'TTT#############::::::::::########::::TTTTTTT', // 12
    'TTT#############::::::::::#########:#########', // 13
    'TTT#############::::::::::#########:#########', // 14
    'TTTTT######:::::::::::::::#########:#########', // 15
    'TTTTT######::::::::#####::#########:#########', // 16
    'TTTTT######::::::::#####::#########:#########', // 17
    'TTTTT######::::::::#####::#########:#########', // 18
    'TTTTT######::::::::#####::::::::::::#########', // 19
    '#########::::::::::#####::::::::::::#########', // 20
    '#########TTTT:::::::::::::::::::::###########', // 21
    '#########TTTT:::::::::::::::::::::###########', // 22
    '#########TTTT:::::::::::::::::::::###########', // 23
    '#########TTTT:###########:::::::::###########', // 24
    '#########TTTTT###########TTTT:::::##TTTTTTTTT', // 25
    '#########TTTTT###########TTTT:::::TTTTTTTTTTT', // 26
    '#########TTTTT###########TTTT::::sssssTTTTTTT', // 27
    '#########TTTTT###########TTTTTTTTsssssTTTTTTT', // 28
    '#########TTTTT###########TTTTTTTTsssssTTTTTTT', // 29
    '#########TTTTT###########TTTTTTTTsssssTTTTTTT', // 30
    '#########TTTTT###########TTTTTTTTsssssTTTTTTT', // 31
    '#########TTTTT###########TTTTTTTTsssssTTTTTTT', // 32
    '#########TTTTT###########TTTTTTTTsssssTTTTTTT', // 33
  ],
  entities: [
    { id: 'ts-well', kind: 'sign', at: [18, 20], look: 'post', text: 'The well is older than the town round it. Somebody has scratched a compass rose into the rim, and a moon above it.' },
    { id: 'ts-cache', kind: 'chest', at: [11, 20], loot: { gold: 60, items: [{ rarity: 'tempered', slot: 'weapon' }] } },
    { id: 'ts-rhune', kind: 'encounter', enc: 'ts-rhune', mode: 'block', at: [28, 21], face: 'w' },
  ],
  exits: [],
  anchors: { start: [22, 23, 'n'] },
  roam: null,
});
