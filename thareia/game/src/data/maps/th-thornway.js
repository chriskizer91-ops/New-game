// Thareia (T2): The Thornway, Chapter 1's copy of the old game's thornway.js (design/09-t2-spec.md section 2.2): the
// old rows and painting (`paint`), with Chapter 1's road north to Eldergrove. The runners' camp bars the road at its
// north end (th-tw-barricade), and the Bramble-Deep's bandit, in ranger boots, has woven the road shut beside him
// (th-tw-bramble). The boar's wallow is optional and gates nothing on the road. The den door (tw-den) opens for S6.
// Rows and tiles as thornway.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-thornway', name: 'The Thornway', region: 'verdant', biome: 'wilds', music: 'wilds', paint: 'thornway',
  backdrop: 'verdant-wood', zone: 'th-thornway', level: 3, travel: true, dark: false,
  lore: [[305, 250, 13, 55], [262, 205, 14, 0]],
  w: 30, h: 56,
  rows: [
    'TTTTTTTTTTTTTT==TTT^^^^^^^^^^^', //  0
    'TTTTTTTTTTTTTt==tTT^^^^^^^^^^^', //  1
    'TTTTTTTTTTTTT.==.tT^^^^^^^^^^^', //  2
    'TTTTTTTTTTTT.,===.To^^^^^^^^^o', //  3
    'TTTTTTTTTTT...===.too^^^^^+^^o', //  4
    'TTTTTT.."..TT.===.TT.,....=.TT', //  5
    'TTTTT.,.......===.t..,....=..T', //  6
    'TTTT..."......===..".,....==.T', //  7
    'TTTTT.,.....T.===........=.,TT', //  8
    'TTTTTTT....TT.===.....:..=..TT', //  9
    'TTTTTTTTT..TT.========:===..TT', // 10
    'TTT...TTTTTTT.===.t........".T', // 11
    'TT.....TTTTTT.===.TTttTTTTTTTT', // 12
    'T...,.........===.TTTTTTTTTTTT', // 13
    'T.........,...===.TTTTTTTTTTTT', // 14
    'T.......TTTTT.===.TTT..,..TTTT', // 15
    'TT.,...TTTTTT.===..."....TTTTT', // 16
    'TTT...TTTTTTT.===....,...TTTTT', // 17
    'TTTTTTTTTTtttt===.......TTTTTT', // 18
    'TTTTTTTT...ttttt===tt..TTTTTTT', // 19
    'TTTTTTT"...tttt.===tt.TTTTTTTT', // 20
    'TTTTTTT.,.ttttt.===ttTTTTTTTTT', // 21
    'TTTTTTT....tttt.===tTTTTTTTTTT', // 22
    'TTTTTTT.....t.===.TTTTTTTTTTTT', // 23
    'TTTTTTT....,..===.TTTTTTTTTTTT', // 24
    'TTTTtttttttt.===.tttttttttTTTT', // 25
    'TTTTtttttttt=====tttttttttTTTT', // 26
    'TTTTtttttttt.===.tttttttttTTTT', // 27
    'TTTTTTTTTTTTt===tTTTTTTTTTt.tT', // 28
    'TTTTTTTTTTTT.===..TTTTTTTt..tT', // 29
    'TTTTTTTTTTT.,..===.T."mmm~~..T', // 30
    'TTTTTTTTTT.....===..."mmmmm~..', // 31
    'TTTTTTTTT..,...===..mmmmmmm".T', // 32
    'TTTTTTT..".....===..mmmmmmmm.T', // 33
    'TTTTTTT..,.....===..mmmmmmmm.T', // 34
    'TTTTTTT.......t===..mmmmmmm".T', // 35
    'TTTTTTTT"......===...mmmm~m..T', // 36
    'TTTTTTTTTT..T..===..".~~mmm..T', // 37
    'TTTTTTTTTTTT.===...T.."....TTT', // 38
    'TTTTTTTTTTTT.===.TTTT.,...TTTT', // 39
    'TTHH...HHTT.===ttTTTTTTTTTTTTT', // 40
    'TTHH.,.HHT..===.tTTTT..,.TTTTT', // 41
    'T..........===.TTT...."..TTTTT', // 42
    'T.....*.....===.TT..,....TTTTT', // 43
    'To.........===.....".,...TTTTT', // 44
    'T.o........===......,...TTTTTT', // 45
    'T..........===.TTT.."..TTTTTTT', // 46
    'To.......T..===.TTTTTTTTTTTTTT', // 47
    'TT..,....TT.===.TTTTTTTTTTTTTT', // 48
    'TTTTTTTTTTTT===.TTTTTTTTTTTTTT', // 49
    'TTTTTTTTTTTT.===.TTTTTTTTTTTTT', // 50
    'TTTTTTTTTTT.,===.",.TTTTTTTTTT', // 51
    'TTTTTTTTTTt..===...,.TTTTTTTTT', // 52
    'TTTTTTTTTTT".===....TTTTTTTTTT', // 53
    'TTTTTTTTTTTT.===.TTTTTTTTTTTTT', // 54
    'TTTTTTTTTTTTT==TTTTTTTTTTTTTTT', // 55
  ],
  entities: [
    // a trigger whose scene changes the game is guarded by what the scene sets, not `once` (a reload mid-scene
    // plays it again): the road's first fight, the whisper (c1-whisper), the boots (s2-lead)
    // the first steps north of the gate: the Rot smell, the shard hums, then the road's first fight
    { id: 'c1-tw-enter', kind: 'trigger', area: [12, 50, 16, 54], on: 'enter', if: { not: { beaten: 'c1-verdant-edge' } }, dialogue: 'c1-tw-enter' },
    // the runners' camp bars the road at its north end; their strongbox waits until they are beaten
    { id: 'c1-runner-camp', kind: 'encounter', enc: 'c1-runner-camp', mode: 'block', at: [11, 40], face: 's' },
    { id: 'th-tw-barricade', kind: 'gate', area: [12, 40, 14, 40], look: 'barred-gate', open: { beaten: 'c1-runner-camp' }, guard: 'c1-runner-camp', text: 'A smugglers\' barricade of carts and rope.' },
    { id: 'th-tw-strongbox', kind: 'chest', at: [2, 42], if: { beaten: 'c1-runner-camp' }, loot: { gold: 60, items: [{ rarity: 'runed' }] }, note: 'Fernshaw, Thornhollow: sunstone, paid in full.' },
    { id: 'th-tw-goblins', kind: 'npc', npc: 'th-goblin', at: [22, 43], face: 'w', if: { not: { flag: 's7-chased' } } },
    // optional: the boar in the black mud; beaten, it has shifted the stone off the west chest
    { id: 'c1-snag-wallow', kind: 'encounter', enc: 'c1-snag-wallow', mode: 'lair', at: [22, 34], area: [21, 33, 23, 34], face: 'w' },
    { id: 'th-tw-boulder-chest', kind: 'chest', at: [3, 14], if: { beaten: 'c1-snag-wallow' }, loot: { items: [{ rarity: 'runed', slot: 'ring' }] } },
    { id: 'th-tw-bramble-cache', kind: 'chest', at: [8, 24], loot: { bag: { bitterroot: 2, 'hearth-tonic': 1 } } },
    { id: 'th-tw-thorn-chest', kind: 'chest', at: [27, 28], if: { flag: 'c1-taela-guest' }, loot: { items: [{ rarity: 'tempered', slot: 'body' }] } },
    { id: 'c1-tw-whisper', kind: 'trigger', area: [19, 15, 24, 17], on: 'step', if: { not: { flag: 'c1-whisper' } }, dialogue: 'c1-tw-whisper' },
    // the Bramble-Deep: a bandit in the thorns beside the road, the road woven shut beside him
    { id: 'c1-bramble-deep', kind: 'encounter', enc: 'c1-bramble-deep', mode: 'block', at: [15, 20], face: 's' },
    { id: 'th-tw-bramble', kind: 'gate', area: [16, 18, 20, 20], look: 'bramble', open: { beaten: 'c1-bramble-deep' }, guard: 'c1-bramble-deep', text: 'Thorns gone black and wet with Rot.' },
    { id: 'c1-tw-boots', kind: 'trigger', area: [14, 19, 18, 22], on: 'step', if: { all: [{ beaten: 'c1-bramble-deep' }, { not: { flag: 's2-lead' } }] }, dialogue: 'c1-tw-boots' },
    { id: 'th-tw-hearth', kind: 'hearthfire', at: [22, 9], stand: [22, 10, 'n'] },
  ],
  exits: [
    { id: 'tw-s', area: [13, 55, 14, 55], to: 'th-thornhollow', anchor: 'from-thornway' },
    { id: 'tw-n', area: [14, 0, 15, 0], to: 'th-eldergrove', anchor: 'from-thornway' },
    { id: 'tw-den', area: [26, 4, 26, 4], to: 'th-briarmaw-den', anchor: 'from-thornway', gate: { flag: 's6-open' }, sealed: { region: 'verdant', text: 'A den mouth in the cliff. Something big sleeps in there. Not alone, and not yet.' } },
  ],
  anchors: { 'from-thornhollow': [14, 53, 'n'], 'from-eldergrove': [14, 2, 's'], 'from-den': [26, 6, 's'], 'v1:c1-snag-wallow': [21, 36, 'e'], 'v1:c1-bramble-deep': [15, 23, 'n'] },
  roads: [{ from: 'from-thornhollow', to: 'tw-n', gates: ['th-tw-barricade', 'th-tw-bramble'] }],
  roam: { max: 2, rects: [[4, 28, 26, 52], [4, 6, 26, 24]] },
});
