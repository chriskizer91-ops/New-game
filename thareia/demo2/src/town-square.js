// The Town Square (Thareia demo 2): the player's painting thareia/art-in/scenes/town-square.png, fitted to 45 x 34 tiles
// at 32 painting px per tile, traced by hand tile by tile (tools/trace-town-square.mjs): ':' cobbles and paths, 's' steps,
// 'b' the stone bridge, '#' everything else. The bridge road in the north-east is walled off behind the smithy in the
// painting, so it is its own patch. Rhune the Pass-Warden stands in the square, wearing the Windstep Boots.
// Format: src/data/maps/index.js of the Aethermoor game (commit 49195c1).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'town-square', name: 'The Town Square', region: 'verdant', biome: 'town', music: 'town',
  backdrop: 'forest-ruins', zone: null, level: 12, travel: false, dark: false, overTiles: false,
  lore: [[540, 390, 22, 22]],
  w: 45, h: 34,
  rows: [
    '########################################:::##', //  0
    '#######################################::::##', //  1
    '#######################################::::##', //  2
    '#######################################bbb###', //  3
    '#####################################bbbb####', //  4
    '####################################bbbb#####', //  5
    '###################################bbbb######', //  6
    '##################################::::#######', //  7
    '##################################::::#######', //  8
    '##################ss##############::::#######', //  9
    '#################:ss##############::::#######', // 10
    '################:::###############:::########', // 11
    '################:::##:::#####################', // 12
    '################:::::::ss####################', // 13
    '################:#:::::::####################', // 14
    '############sss###:::::::##:#################', // 15
    '############sss::::::##:::::#################', // 16
    '############:::::::####::::::::##############', // 17
    '############:::::::####::::::::##############', // 18
    '###########::::::::####:::::::::#############', // 19
    '########:::::::::::####::::::::::::##########', // 20
    '##############::::::::::::::::::#############', // 21
    '##############::::::::::::::::::#############', // 22
    '##############:::::####::::::::##############', // 23
    '#############ss#:::####::::::#::#############', // 24
    '#############ss################:::###########', // 25
    '###########:ss##################::::#########', // 26
    '###########:::####################sss########', // 27
    '##################################sss########', // 28
    '##################################ssss#######', // 29
    '###################################sss#######', // 30
    '###################################ssss######', // 31
    '####################################:::::####', // 32
    '####################################:::::####', // 33
  ],
  entities: [
    { id: 'ts-well', kind: 'sign', at: [18, 20], look: 'post', text: 'The well is older than the town round it. Somebody has scratched a compass rose into the rim, and a moon above it.' },
    { id: 'ts-cache', kind: 'chest', at: [11, 20], loot: { gold: 60, items: [{ rarity: 'tempered', slot: 'weapon' }] } },
    { id: 'ts-rhune', kind: 'encounter', enc: 'ts-rhune', mode: 'block', at: [28, 21], face: 'w' },
  ],
  exits: [],
  anchors: { start: [24, 22, 'n'] },
  roam: null,
});
