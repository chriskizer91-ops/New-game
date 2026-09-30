// Thareia (T2): The Hindwood, Chapter 1's copy of the old game's hindwood.js (design/09-t2-spec.md section 2.8): the old
// rows and painting (`paint`). The stream (rows 20-21) splits the wood; black root chokes both its crossings, the ford
// (x9-12) and the bridge (x26-27), until the glowcaps by the bridge are beaten, so with both shut the north road (hw-n)
// cannot be reached from the south-east road. The burners' camp holds the north road (hw-n opens on c1-hindwood). The
// rope ledge west (hw-w) opens both ways once Fawnrest is reached. The white deer (S9) are signs drawn as deer.
// Rows and tiles as hindwood.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-hindwood', name: 'The Hindwood', region: 'verdant', biome: 'wilds', music: 'wilds', paint: 'hindwood',
  backdrop: 'verdant-wood', zone: 'th-hindwood', level: 7, travel: true, dark: false,
  lore: [[320, 252, 31, 35], [365, 180, 15, 0]],
  w: 32, h: 40,
  rows: [
    'TTTTTTTTTTTTTTT==TTTTTTTTTTTTTTT', //  0
    'TTTTTTTTTTTTTT.==.TTTTTTTTTTTTTT', //  1
    '^^^TTTTTTTTTT..==..TTTTTTTTTTTTT', //  2
    '^^^TTTTTTTTT...==...TTTTTooooooT', //  3
    '^^^.TTTTTTT,...==....TTTTo,.,,oT', //  4
    '^^...TTTTTT,,..==.....TTTo.,,.oT', //  5
    '^^.....TTTT"...==..T...TTo,.,,oT', //  6
    '^^......TTT""..=........Too..ooT', //  7
    '==......TTT"..==.....t.......TTT', //  8
    '==........T...==.....t,.....TTTT', //  9
    '^^...o......===TTTTTTTtTTTtTTTTT', // 10
    '^^...,,f,f,.=...TTT.,,"",,,,.TTT', // 11
    '^^..,f,,,,,f=....TT.,,,,,"",.TTT', // 12
    '^^T.f,,,,,,,=,...TT.,,",,,,,TTTT', // 13
    '^^T..,,,,,,,=,...TT..,,,,,,.TTTT', // 14
    '^^T.f,,,,,,,=,..TTTT..,,,,..TTTT', // 15
    '^^T.,f,,,,,f=,.TTTTTT......TTTTT', // 16
    '^^TT..,f,f===..TTTTTTT.......TTT', // 17
    '^^^TT.....=.TTTTTTTTTTT..o...TTT', // 18
    '^^^TTT.......TTTTTTTTTTTT.....TT', // 19
    '^^^~~~~~~wwww~~~~~~~~~~~~~bb~~~~', // 20
    '^^^~~~~~~wwww~~~~~~~~~~~~~bb~~~~', // 21
    '^^TTTTTT...=.TTTTTTTTTTTT.....TT', // 22
    '^^TTTTTT...=..TTT...TTTT..t...TT', // 23
    '^TTTTTT.....o..T.......TTT....TT', // 24
    'TTTTTTT..o......,,o,,,..TT.....T', // 25
    'TTTTTTTT...o...,,,,,,,,,..T....T', // 26
    'TTTTTTTT..===..o,,,,,,,o...."..T', // 27
    'TTTTTTTT....=..,,,,,,,,,,..""..T', // 28
    'TTT.........=====,,,,,,,,......T', // 29
    'TT..............o,=,,,,........T', // 30
    'TT..mm....TTTTT..,=====..TT....T', // 31
    'TT.m~~m...TTTTTT......=...TT...T', // 32
    'TT.m~~m..TTTTTTTT.....=.....o..T', // 33
    'TT..mm...TTTTTTTTTTT..==========', // 34
    'TT......TTTTTTTTTTTTT.........==', // 35
    'TTT...TTTTTTTTTTTTTTTTT.......oo', // 36
    'TTTTTTTTTTTTTTTTTTTTTTTTT.....oT', // 37
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 38
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 39
  ],
  entities: [
    { id: 'c1-hw-roots', kind: 'trigger', area: [20, 29, 23, 31], on: 'step', once: true, dialogue: 'c1-hw-roots' },
    { id: 'c1-hw-ford', kind: 'trigger', area: [8, 22, 12, 22], on: 'step', once: true, dialogue: 'c1-hw-ford' },
    { id: 'th-hw-cairn', kind: 'hearthfire', at: [10, 25], stand: [10, 26, 'n'] },
    // the burners' camp: talk them down with Taela, or fight (S3)
    { id: 'c1-feral-druid', kind: 'encounter', enc: 'c1-feral-druid', mode: 'block', at: [18, 28], face: 's', talk: 'c1-burners', if: { not: { flag: 's3-talked' } } },
    // the glowcaps choke both crossings of the stream: the bridge (east) and the ford (west) open once they are beaten
    { id: 'c1-glowcaps', kind: 'encounter', enc: 'c1-glowcaps', mode: 'block', at: [25, 22], face: 's' },
    { id: 'th-hw-bridge-knot', kind: 'gate', area: [26, 21, 27, 21], look: 'rot-knot', open: { beaten: 'c1-glowcaps' }, guard: 'c1-glowcaps', text: 'Black root has knotted across the bridge. The glowing caps at its foot all turn toward you.' },
    { id: 'th-hw-ford-knot', kind: 'gate', area: [9, 20, 12, 20], look: 'rot-knot', open: { beaten: 'c1-glowcaps' }, text: 'Black roots choke the ford. Spores drift off them.' },
    { id: 'c1-gloamwing', kind: 'encounter', enc: 'c1-gloamwing', mode: 'lair', at: [22, 12], area: [21, 11, 23, 12], face: 's', if: { flag: 'c1-node-cooled' } },
    { id: 'th-hw-thornwall', kind: 'gate', area: [27, 7, 28, 7], look: 'thornwall', open: { flag: 'c1-taela-joined' }, text: 'A wall of old thorn. It will not part for a blade.' },
    { id: 'th-hw-thorn-chest', kind: 'chest', at: [28, 6], loot: { items: [{ rarity: 'storied', unidentified: true }] } },
    { id: 'th-hw-pond-chest', kind: 'chest', at: [2, 33], loot: { gold: 45, bag: { bitterroot: 2 } } },
    { id: 'th-hw-glade-chest', kind: 'chest', at: [3, 14], loot: { bag: { 'hearth-tonic': 1 } } },
    { id: 'th-hw-sign', kind: 'sign', at: [27, 33], text: 'Hindwood road. Ford west, bridge east. Fawnrest ahead.' },
    // S9: the white deer, found once the node is cooled
    { id: 'th-deer-1', kind: 'sign', prop: 'deer', at: [5, 7], text: 'A white deer. It watches you, and does not run.', talk: 'c1-deer-1', talkIf: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-1' } }] }, if: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-1' } }] } },
    { id: 'th-deer-2', kind: 'sign', prop: 'deer', at: [28, 25], text: 'A white deer. It watches you, and does not run.', talk: 'c1-deer-2', talkIf: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-2' } }] }, if: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-2' } }] } },
  ],
  exits: [
    { id: 'hw-se', area: [31, 34, 31, 35], to: 'th-thornhollow', anchor: 'from-hindwood' },
    { id: 'hw-n', area: [15, 0, 16, 0], to: 'th-fawnrest', anchor: 'from-hindwood', gate: { flag: 'c1-hindwood' }, sealed: { region: 'verdant', text: 'Taela stops you. \'The burners\' camp first, or they follow us north.\'' } },
    // the rope ledge up to Eldergrove: two-way once Fawnrest is reached (eg-e is its other end)
    { id: 'hw-w', area: [0, 8, 0, 9], to: 'th-eldergrove', anchor: 'from-hindwood', gate: { flag: 'c1-fawnrest' }, sealed: { region: 'verdant', text: 'A cliff up to Eldergrove. Too steep without a rope.' } },
  ],
  anchors: { 'from-thornhollow': [29, 34, 'w'], 'from-fawnrest': [15, 2, 's'], 'from-eldergrove': [2, 8, 'e'] },
  roam: { max: 2, rects: [[2, 4, 30, 38]] },
});
