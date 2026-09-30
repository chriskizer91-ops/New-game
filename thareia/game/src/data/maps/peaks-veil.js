// Peak's Veil (M5 spec §2.1, §2.3), the monastery on its shelf of rock. The road from the Rockslide
// Pass comes up to the south gate; inside, a flagstone walk runs straight through to the north gate and
// the road up the Iron Stair. In the middle stands the cloister, an arcade of columns round a snowy
// garth where the Cloister Fire burns (14,11) and Mother Wynn keeps watch beside it. North-west is the
// bell tower, the bell rope hanging in its open arch (3,6), with the font beside it: the quest's bell,
// rung there once the Drowned Abbess is quiet. North-east is the long refectory. The chapter house (W)
// and the cells (E) face the cross-walk, whose west end is the Highfold gate (the exit at x=0), barred
// until Wynn has the monks unbar it. South-west is the fenced herb garden; south-east Brother Kesh's
// practice yard, with its practice stones and the lookout over the drop.
// Tiles (monastery): '#' whitewashed walls, 'H' slate roofs, ':' flagstones, '.' snow, ',' gravel and
// herb beds, '"' herbs, 't' herb bushes, 'Y' cloister columns, '|' fences, 'o' practice stones,
// '~' the font, '*' lamps on the gate towers, '+' doors (decoration), '=' the road, '^' the rock.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'peaks-veil', name: 'Peak\'s Veil', region: 'ironspire', biome: 'monastery', music: 'town',
  backdrop: 'peaks-veil', zone: null, level: 13, travel: true, dark: false,
  lore: [[750, 240, 14, 11]],
  w: 28, h: 24,
  rows: [
    '^^^^^^^^^^^^^==^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^o==.^^^^^^^^^^^^', //  1
    '^###########*==*###########^', //  2
    '^#HHH..:::...::..HHHHHHHHH#^', //  3
    '^#HHH..:~:...::..HHHHHHHHH#^', //  4
    '^#HHH..:::"..::..HHHHHHHHH#^', //  5
    '^##:#........::..####+#####^', //  6
    '^#...........::...........#^', //  7
    '^#HHHHH.::::::::::::HHHHHH#^', //  8
    '^#HHHHH.:Y:Y::::Y:Y:HHHHHH#^', //  9
    '^*##+##.:Y"..::.."Y:+#+#+##^', // 10
    '::::::::::...::...::::::::#^', // 11
    '::::::::::...::...::::::::#^', // 12
    '^*t.t.t|:Y"..::.."Y:|.....#^', // 13
    '^#,"",,|:Y:Y::::Y:Y:|.....#^', // 14
    '^#.....|::::::::::::|.o.o.#^', // 15
    '^#",","......::...........#^', // 16
    '^#.....|..t..::.....|.o.o.#^', // 17
    '^#,",",|.....::.t...|.....#^', // 18
    '^#t...t|."...::.....|.....#^', // 19
    '^#.....|...".::.....|.....#^', // 20
    '^###########*==*###########^', // 21
    '^^^^^^^^^^o..==o^^^^^^^^^^^^', // 22
    '^^^^^^^^^^^^^==^^^^^^^^^^^^^', // 23
  ],
  entities: [
    { id: 'veil-hearth', kind: 'hearthfire', at: [14, 11], stand: [14, 12, 'n'] },
    { id: 'wynn', kind: 'npc', npc: 'wynn', at: [12, 11], face: 'e' },
    { id: 'kesh', kind: 'npc', npc: 'kesh', at: [23, 16], face: 'w' },
    { id: 'novice', kind: 'npc', npc: 'novice', at: [5, 6], face: 's' },
    // the bell rope in the tower's arch: the quest's `use` entity (it opens DIALOGUE['pv-bell-rope'], where the
    // bell is rung once the Drowned Abbess is quiet); `look` and `flag` say how the view should draw it
    { id: 'pv-bell-rope', kind: 'bellframe', at: [3, 6], look: 'bell-rope', flag: 'bell-rung-veil', if: { not: { flag: 'bell-rung-veil' } } },
    // once rung, the same rope hangs loose (its own node: DIALOGUE['pv-bell-rope-rung'])
    { id: 'pv-bell-rope-rung', kind: 'bellframe', at: [3, 6], look: 'bell-rope', flag: 'bell-rung-veil', if: { flag: 'bell-rung-veil' } },
    { id: 'pv-gate-plaque', kind: 'sign', at: [15, 20], look: 'plaque', text: 'PEAK\'S VEIL. Leave your weapons at the gate, and your voices. (Nobody has ever left a weapon.)' },
    { id: 'pv-lookout', kind: 'lookout', at: [24, 20] },
  ],
  exits: [
    { id: 'pv-s', area: [13, 23, 14, 23], to: 'rockslide-pass', anchor: 'from-veil' },
    { id: 'pv-n', area: [13, 0, 14, 0], to: 'iron-stair', anchor: 'from-veil' },
    // M5 (spec §2.3, A5): the Highfold gate, barred until Mother Wynn has the monks open it (a second way home)
    { id: 'pv-w', area: [0, 11, 0, 12], to: 'highfold', anchor: 'from-veil', gate: { flag: 'highfold-open' }, sealed: { region: 'ironspire', text: 'The west gate is barred from the inside, and the bar is chained. Past it, the Highfold path goes down to Fawnrest.', hint: 'The gate opens once you have spoken with Mother Wynn.' } },
  ],
  anchors: { 'from-pass': [13, 22, 'n'], 'from-stair': [13, 1, 's'], 'from-highfold': [1, 11, 'e'] },
  roads: [{ from: 'from-pass', to: 'pv-n', gates: [] }, { from: 'from-pass', to: 'pv-w', gates: [] }],
  roam: null,
});
