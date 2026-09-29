// The Last Camp (M5, the East Road; painted from the player's picture art-in/extra/path-palisade-camp.png).
// The last of the East Road's six painted maps: a clearing in the pines before the palisade the Stormwatch
// deserters have thrown across the road, the last camp before the Rockslide Pass. On its west side a ring
// of stones around a fire pit (12-14, 15-17), with a log for a bench beside it: the Last Camp Fire, where
// travellers kindle a Hearthfire and rest before the climb. The deserters' sergeant holds the palisade gate
// (21-26, 4) with his men, standing inside it (21, 5); through it the road climbs north to the pass.
// Traced from the painting (one tile is 32 of its px; `overTiles: false`). Tiles: '=' the road and the track
// across the clearing, '.' the clearing's grass, ',' the gravel under the rock wall, '|' the palisade's stakes,
// '#' the gateposts, the fire ring, the log bench and the rock wall, 'T' the forest, 'o' boulders.
// Format: src/data/maps/index.js. Owner: the lead (M5 P8, the East Road).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'last-camp', name: 'The Last Camp', region: 'ironspire', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: null, level: 12, travel: true, dark: false, overTiles: false,
  lore: [[614, 340, 23, 30], [622, 334, 23, 0]],
  w: 48, h: 32,
  rows: [
    'TTTTTTTTTTTTTTTTTTT##.====.##TTTTTTTTTTTTTTTTTTT', //  0
    'TTTTTTTTTTTTTTTTTTT##.====.##TTTTTTTTTTTTTTTTTTT', //  1
    'TTTTTTTT|||||||||||##.====.##|||||||||||TTTTTTTT', //  2
    'TTTTTTTT|||||||||||##.====.##|||||||||||TTTTTTTT', //  3
    'TTTTTTTT|||||||||||##.====.##|||||||||||TTTTTTTT', //  4
    'TTTTTTTTTTTT|||||||##.====.##|||||TT||||TTTTTTTT', //  5
    'TTTTTTTTTTTT.......##.====.##.....TTTTTTTTTTTTTT', //  6
    'TTTTTTTTTTTT..........=====.......TTTTTTTTTTTTTT', //  7
    'TTTTTTTTTTTTTT..o.....=====.........TTTTTTTTTTTT', //  8
    'TTTTTTTTTTTTTT........=====.........TTTTTTTTTTTT', //  9
    'TTTTTTTTTTTTTTT......=======......#..TTTTTTTTTTT', // 10
    'TTTTTTTTTTTTTTT......========....####TTTTTTTTTTT', // 11
    'TTTTTTTTTTTTTT.......========....,,###TTTTTTTTTT', // 12
    'TTTTTTTTTooT#........==========..,,,###TTTTTTTTT', // 13
    'TTTTTTTT..###........==========..,,,,,##TTTTTTTT', // 14
    'TTTTTTTT.##=###==================,,,,,###TTTTTTT', // 15
    'TTTTTTT....=###==================...,,###TTTTTTT', // 16
    'TTTTTTT....=#.#==================...,,,,##TTTTTT', // 17
    'TTTTTTT....======================.....,,###TTTTT', // 18
    'TTTTTTT.TT...........=========..........T##TTTTT', // 19
    'TTTTTTTTTTTTT.........=======...........T##TTTTT', // 20
    'TTTTTTTTTTTTT......TT.======....TT.TTTTTTT##TTTT', // 21
    'TTTTTTTTTTTTTT.....T..====......TTTTTTTTTT##TTTT', // 22
    'TTTTTTTTTTTTTT...TT...====......TTTTTTTTTTTTTTTT', // 23
    'TTTTTTTTTTTTTToooTToo.====...TTTTTTTTTTTTTTTTTTT', // 24
    'TTTTTTTTTTTTTToooTToo.====.oTTTTTTTTTTTTTTTTTTTT', // 25
    'TTTTTTTTTTTTTTTTTTTTTT====.,TTTTTTTTTTTTTTTTTTTT', // 26
    'TTTTTTTTTTTTTTTTTTTTTT====.,TTTTTTTTTTTTTTTTTTTT', // 27
    'TTTTTTTTTTTTTTTTTTTTTT====.,TTTTTTTTTTTTTTTTTTTT', // 28
    'TTTTTTTTTTTTTTTTTTTToo====.oTTTTTTTTTTTTTTTTTTTT', // 29
    'TTTTTTTTTTTTTTTTTTTToo====.oTTTTTTTTTTTTTTTTTTTT', // 30
    'TTTTTTTTTTTTTTTTTTTToo====.,TTTTTTTTTTTTTTTTTTTT', // 31
  ],
  entities: [
    { id: 'camp-fire', kind: 'hearthfire', at: [13, 17], stand: [13, 18, 'n'] },
    { id: 'lc-sign', kind: 'sign', at: [20, 14], look: 'post', text: 'THE LAST CAMP. Through the gate the road climbs to the Rockslide Pass. Past that: rock, snow and Stormwatch.' },
    { id: 'lc-bench-cache', kind: 'chest', at: [9, 14], loot: { gold: 100, bag: { 'hearth-tonic': 1 }, items: [{ rarity: 'tempered', slot: 'feet' }] } },
    // the road gate (road-first, spec A3): the palisade gate barred, the sergeant and his men inside it
    { id: 'lc-palisade-gate', kind: 'gate', area: [21, 4, 26, 4], look: 'barred-gate', open: { beaten: 'er-camp' }, guard: 'er-camp', text: 'The palisade gate is barred, and the men who hold it drill as if Stormwatch still paid them. Their sergeant watches the road.' },
    { id: 'er-camp', kind: 'encounter', enc: 'er-camp', mode: 'block', at: [21, 5], face: 'e' },
  ],
  exits: [
    { id: 'lc-falls', area: [22, 31, 25, 31], to: 'silverfall', anchor: 'from-camp' },
    { id: 'lc-pass', area: [21, 0, 26, 0], to: 'rockslide-pass', anchor: 'from-camp' },
  ],
  anchors: { 'from-falls': [23, 30, 'n'], 'from-pass': [23, 1, 's'] },
  roads: [{ from: 'from-falls', to: 'lc-pass', gates: ['lc-palisade-gate'] }],
});
