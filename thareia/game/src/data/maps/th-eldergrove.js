// Thareia (T2): Eldergrove, Chapter 1's copy of the old game's eldergrove.js (design/09-t2-spec.md section 2.3): the old
// rows and painting (`paint`), with Chapter 1's grove. The courier drop, Taela at the Eldest Tree's dying roots, the
// burners at the stone circle (once she walks with you), the Eldest Tree's door (open once they are beaten), the brook
// Taela shows you across, the hearth where the pulse comes, and the Eldergrove skiff hire post. The rope ledge east to
// the Hindwood (eg-e) opens both ways once Fawnrest is reached.
// Rows and tiles as eldergrove.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-eldergrove', name: 'Eldergrove', region: 'verdant', biome: 'grove', music: 'town', paint: 'eldergrove',
  backdrop: 'eldergrove', zone: null, level: 4, travel: true, dark: false,
  lore: [[200, 160, 15, 13]],
  w: 30, h: 26,
  rows: [
    'TTTTTTTTTTTYYYYYYYYYTTTTTTTTTT', //  0
    'TTTTTTTTTTYYYYYkYYYYYTTTTTTTTT', //  1
    'TTTTTTTTTTYYYY*k*YYYYTTTTTTTTT', //  2
    'TTToooTTYYYYYrrrrrrYYTTo~oTTTT', //  3
    'TTo,,,oTYYrYrrrrrrrrYTT.~.t..T', //  4
    'To,,,,,oY..frfrrrrfrYY..~..ftT', //  5
    'To,,:,,f=====rrrrrr.YY.=b===.^', //  6
    'To,,,,,o==""""==..YYYYf=~..=.^', //  7
    'Tto,,,o..=YYY"==.YYYYY.=~..==v', //  8
    'Tttooo...=Y*Y"==YYYYYY==~.t..v', //  9
    'TTYYYYYYY=""""==*+*YYY=f~oooo^', // 10
    'TTY*Y+Y*Y=""""=========.~,,,,^', // 11
    'T..====..=f.::::...T.f=.w..,,^', // 12
    'T"""""=====::::::YYYY.=.w.,,,^', // 13
    'TTTT""HHHHH::::::Y*YYt=.~,,,T^', // 14
    'TTT"""Y*+*Y::::::.f.T.=.~ooooT', // 15
    'TT""""....T::::::....==.~TTTTT', // 16
    'T.tt,,ftt...::::...#*#..~~TTTT', // 17
    'T.t"",,""t.......f...=.~~~~~TT', // 18
    'T.t",,,,"t....==.YYYY..~~~~~TT', // 19
    'T.t"",,""t...f==.Y*YY.t~~~~~TT', // 20
    'T.t",,,,"t..*Y==Y*....~~~~~~TT', // 21
    'T.tt""""tt,TY,=="YT"T..TTTTTTT', // 22
    'Tf........,,,,==""""....TTTTTT', // 23
    'T....T...T,,,,==""""T...TTTTTT', // 24
    'TTTTTTTTTTTTTT==TTTTTTTTTTTTTT', // 25
  ],
  entities: [
    // the courier drop: grey roots, black sap, 12 gp (sets c1-thornway)
    { id: 'c1-eg-arrive', kind: 'trigger', area: [0, 0, 29, 25], on: 'enter', if: { not: { flag: 'c1-thornway' } }, dialogue: 'c1-eg-arrive' },
    { id: 'th-taela', kind: 'npc', npc: 'taela', at: [16, 4], face: 's', if: { not: { flag: 'c1-taela-guest' } } },
    { id: 'c1-eg-shard', kind: 'trigger', area: [13, 3, 18, 4], on: 'step', if: { all: [{ flag: 'c1-met-taela' }, { not: { flag: 'c1-shard-roots' } }] }, dialogue: 'c1-shard-glows' },
    // the burners at the stone circle, once Taela walks with you
    { id: 'c1-grove-circle', kind: 'encounter', enc: 'c1-grove-circle', mode: 'lair', at: [4, 6], area: [4, 5, 4, 6], face: 'e', talk: 'c1-grove-circle-before', if: { flag: 'c1-taela-guest' } },
    { id: 'th-eg-acolyte', kind: 'npc', npc: 'th-acolyte', at: [3, 7], face: 'e', if: { not: { beaten: 'c1-grove-circle' } } },
    { id: 'th-miravel', kind: 'npc', npc: 'th-miravel', at: [17, 11], face: 's' },
    { id: 'th-scholar', kind: 'npc', npc: 'th-scholar', at: [12, 19], face: 'e' },
    { id: 'th-eg-supplier', kind: 'npc', npc: 'th-eg-supplier', at: [20, 18], face: 'n' },
    { id: 'th-eg-bryn-house', kind: 'sign', at: [5, 12], text: 'Rings cut from a dead root hang on the door. They are black from the inside out.' },
    { id: 'th-eg-hearth', kind: 'hearthfire', at: [13, 15], stand: [13, 16, 'n'] },
    { id: 'th-eldest-door', kind: 'gate', area: [15, 2, 15, 2], look: 'door', open: { beaten: 'c1-grove-circle' }, text: 'The Eldest Tree\'s door is shut. Black sap weeps from the seams.' },
    { id: 'th-eg-brook', kind: 'gate', area: [24, 12, 24, 13], open: { flag: 'c1-taela-guest' }, text: 'The brook runs fast over slick stones. You cannot see a safe way across.' },
    { id: 'th-eg-brook-chest', kind: 'chest', at: [26, 12], loot: { items: [{ rarity: 'tempered', kind: 'staff', ilvl: 5 }], bag: { bitterroot: 1 } } },
    { id: 'th-eg-hire', kind: 'npc', npc: 'th-hire-eg', at: [16, 23], face: 'w' },
    { id: 'th-eg-skiff-post', kind: 'sign', at: [13, 22], text: 'DUSTWIND SKIFF HIRE. Licensed docks only. No night flying.' },
  ],
  exits: [
    { id: 'eg-s', area: [14, 25, 15, 25], to: 'th-thornway', anchor: 'from-eldergrove' },
    { id: 'eg-tree', area: [15, 1, 15, 1], to: 'th-heartroot-1', anchor: 'from-tree' },
    // the rope ledge down into the Hindwood: two-way once Fawnrest is reached (hw-w is its other end)
    { id: 'eg-e', area: [29, 8, 29, 9], to: 'th-hindwood', anchor: 'from-eldergrove', gate: { flag: 'c1-fawnrest' }, sealed: { region: 'verdant', text: 'The ledge drops into the Hindwood. Too steep without a rope.' } },
  ],
  anchors: { 'from-thornway': [14, 23, 'n'], 'from-heartroot': [15, 4, 's'], 'from-hindwood': [27, 8, 'w'], 'from-skiff': [15, 22, 'n'] },
  roam: null,
});
