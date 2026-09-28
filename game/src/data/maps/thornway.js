// The Thornway (M3 spec §2.1, §2.3). The forest path winds north from Thornhollow's north gate. Past
// the Tallyman camp (tents, crates and a lamp in a western clearing) and Old Snag's wallow (black mud
// and pools to the east), a band of thorn thicket crosses the whole wood: the thornwall is the only
// way through. North of it the path squeezes through the Bramble-Deep, where a bandit in Thornwatch
// boots waits in the thorns beside the path (not across it, so the Brand's re-armed Echo never shuts
// the road). Clearings hold the boulder-sealed chest (W) and the bramble cache (by the thorn band).
// At the top the path forks: north to the crownwall and Eldergrove, east to the Last Coals and the den
// door in the rock face.
// Layout notes: the den-mouth hearthfire sits at (22,9), next to its stand (22,10) (spec (22,8), moved
// 1). Old Snag's lair sits at (22,34) (spec (24,34), moved 2) so the wallow reads from the path.
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'thornway', name: 'The Thornway', region: 'verdant', biome: 'wilds', music: 'wilds',
  backdrop: 'verdant-wood', zone: 'thornway', level: 5, travel: true, dark: false,
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
    'TTTTTTTTTTTT.===.TTTTTTTTTt.tT', // 28
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
    'TTHH...HHTT.===..TTTTTTTTTTTTT', // 40
    'TTHH.,.HHT..===..TTTT..,.TTTTT', // 41
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
    { id: 'tally-camp', kind: 'encounter', enc: 'tally-camp', mode: 'block', at: [5, 44], face: 'e' },
    { id: 'tw-strongbox', kind: 'chest', at: [2, 42], loot: { gold: 80, items: [{ rarity: 'runed' }] }, lock: 'tally-seal' },
    { id: 'snag-wallow', kind: 'encounter', enc: 'snag-wallow', mode: 'lair', at: [22, 34], area: [21, 33, 23, 34], face: 'w' },
    { id: 'tw-thornwall', kind: 'lock', lock: 'thornwall', area: [12, 26, 16, 26] },
    { id: 'bramble-deep', kind: 'encounter', enc: 'bramble-deep', mode: 'block', at: [15, 20], face: 's' },
    { id: 'tw-boots', kind: 'trigger', area: [14, 19, 18, 22], on: 'step', if: { not: { flag: 'saw-boots' } }, dialogue: 'boots-clue' },
    { id: 'den-mouth', kind: 'hearthfire', at: [22, 9], stand: [22, 10, 'n'] },
    { id: 'tw-crown-n', kind: 'gate', area: [14, 1, 15, 1], look: 'crownwall', open: { brand: 'brand-of-briars' }, text: 'Briarmaw\'s crown-growth walls the road. A green heart-knot pulses in it.' },
    { id: 'tw-thorn-chest', kind: 'chest', at: [27, 28], loot: { items: [{ rarity: 'tempered', slot: 'body' }] }, lock: 'thornwall' },
    { id: 'tw-boulder-chest', kind: 'chest', at: [3, 14], loot: { items: [{ rarity: 'runed', slot: 'ring' }] }, lock: 'boulder' },
    { id: 'tw-bramble-cache', kind: 'chest', at: [8, 24], loot: { bag: { bitterroot: 2, 'ember-salts': 1 } }, lock: 'bramble' },
  ],
  exits: [
    { id: 'tw-s', area: [13, 55, 14, 55], to: 'thornhollow', anchor: 'from-thornway' },
    { id: 'tw-den', area: [26, 4, 26, 4], to: 'briarmaw-den', anchor: 'from-thornway' },
    { id: 'tw-n', area: [14, 0, 15, 0], to: 'eldergrove', anchor: 'from-thornway' },
  ],
  anchors: { 'from-thornhollow': [14, 53, 'n'], 'from-den': [26, 6, 's'], 'from-eldergrove': [14, 2, 's'], 'v1:tally-camp': [8, 46, 'w'], 'v1:snag-wallow': [21, 36, 'e'], 'v1:bramble-deep': [15, 23, 'n'], 'v1:den-mouth': [22, 10, 'n'] },
  roam: { max: 3, rects: [[4, 28, 26, 52], [4, 6, 26, 24]] },
});
