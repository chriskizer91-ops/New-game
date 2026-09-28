// Eldergrove (M3 spec §2.1, §2.3). A village among First-Age roots under the Eldest Tree (top middle;
// its door (15,2) between two torches). Roots radiate from the trunk: west over the lane to the stone
// Grove circle (x1-7, y3-9), east into the seed-vault mound whose door Miravel (17,11) keeps. Homes
// are carved into roots with lit windows, and glow fungus lines the lanes: Bryn's house (west), Nan's
// cottage and herb garden (south-west), the hearth plaza (centre), Hilda's forge by the pond
// (south-east), torch posts at the south gate. The brook runs from a spring (north-east) under a
// footbridge to the pond; its ford (24,12..13) is the only way into the nook with the brook chest. The
// east edge is the escarpment, where the ledge (29,8..9) drops to the Hindwood. The door tiles behind
// Bryn's sign, Miravel and Nan are decoration and unreachable on purpose. Every entity sits at its
// spec coordinates except the hearth, moved 1 south to (13,15) so it touches its stand (13,16).
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'eldergrove', name: 'Eldergrove', region: 'verdant', biome: 'grove', music: 'town',
  backdrop: 'eldergrove', zone: null, level: 4, travel: true, dark: false,
  lore: [[200, 160, 15, 13]],
  w: 30, h: 26,
  rows: [
    'TTTTTTTTTTTYYYYYYYYYTTTTTTTTTT', // 0
    'TTTTTTTTTTYYYYYkYYYYYTTTTTTTTT', // 1
    'TTTTTTTTTTYYYY*k*YYYYTTTTTTTTT', // 2
    'TTToooTTYYYYYrrrrrrYYTTo~oTTTT', // 3
    'TTo,,,oTYYrYrrrrrrrrYTT.~.t..T', // 4
    'To,,,,,oY..frfrrrrfrYY..~..ftT', // 5
    'To,,:,,f=====rrrrrr.YY.=b===.^', // 6
    'To,,,,,o==""""==..YYYYf=~..=.^', // 7
    'Tto,,,o..=YYY"==.YYYYY.=~..==v', // 8
    'Tttooo...=Y*Y"==YYYYYY==~.t..v', // 9
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
    { id: 'eldergrove-hearth', kind: 'hearthfire', at: [13, 15], stand: [13, 16, 'n'] },
    { id: 'miravel', kind: 'npc', npc: 'miravel', at: [17, 11], face: 's' },
    { id: 'nan', kind: 'npc', npc: 'nan', at: [8, 16], face: 's' },
    { id: 'hilda', kind: 'npc', npc: 'hilda', at: [22, 18], face: 's', if: { all: [{ brand: 'brand-of-briars' }, { not: { brands: 2 } }] } },
    { id: 'eg-bryn-house', kind: 'sign', at: [5, 12], text: 'Bryn\'s house. The door is carved with tree-rings, and someone has added one.' },
    { id: 'eg-brook-chest', kind: 'chest', at: [26, 12], loot: { items: [{ rarity: 'runed', kind: 'staff' }] } },
    { id: 'eg-brook', kind: 'lock', lock: 'stream', area: [24, 12, 24, 13] },
    { id: 'grove-circle', kind: 'encounter', enc: 'grove-circle', mode: 'lair', at: [4, 6], face: 'e', area: [4, 5, 4, 6] },
    { id: 'tamsin-duel', kind: 'encounter', enc: 'tamsin-duel', mode: 'block', at: [17, 3], face: 'w', talk: 'tamsin-door', if: { brand: 'brand-of-briars' } },
    { id: 'eldest-door', kind: 'gate', area: [15, 2, 15, 2], look: 'door', open: { all: [{ brand: 'brand-of-briars' }, { any: [{ done: 'tamsin-duel' }, { flag: 'tamsin-yielded' }] }] }, text: 'The Eldest Tree\'s door is shut. Something behind it is breathing sap.' },
  ],
  exits: [
    { id: 'eg-tree', area: [15, 1, 15, 1], to: 'heartroot-1', anchor: 'from-tree' },
    { id: 'eg-s', area: [14, 25, 15, 25], to: 'thornway', anchor: 'from-eldergrove' },
    { id: 'eg-e', area: [29, 8, 29, 9], to: 'hindwood', anchor: 'from-eldergrove', unlock: 'hw-rope' },
  ],
  anchors: { 'from-thornway': [14, 23, 'n'], 'from-heartroot': [15, 4, 's'], 'from-hindwood': [27, 8, 'w'] },
  roam: null,
});
