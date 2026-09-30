// The Lanternfen (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-lanternfen.png), Bogmire's
// eastern bogs: open black water and wet ground, dead grey trees, reed tussocks, small patches of peat, and lanterns
// hung over the water. A road of trodden earth comes in from Bogmire at the south-west corner (S), where small
// bootprints in the mud all go one way (5,27), and winds north-east. West of it a sunken old hut stands in the reeds:
// Mother Grue's hollow. A side way climbs from the reeds by the road up the steps to her deck (8-10,12-14), behind a
// witch-ward across the steps (9-10,13), with the hag at her door (6-7,11) and her pantry at the end of her jetty
// (12,11). Past the rocks east of the road, behind a patch of peat (8-9,27), a pedlar's pack lies where it was dropped
// (8,28). The road crosses the pools on an old plank bridge, where a dead bough hangs low across it, hung with lanterns
// and thick with the Lantern Mother's moths (19-22,15; the moths at its south-west end, 18,15). Beyond it the Fen Cairn
// stands cold on a spit of moss beside the path (31,11), and the path runs on to the edge of the drowned grove, where
// it squeezes between a lamp-post and a great dead tree: the hags have staked a hedge of bones and bottles across it
// there (40-41,3; the hags beside it, 42,3). Past them two of the Lantern Mother's lamps burn either side of the way into
// her Hollow (N): the painting's lamp-post (39,3) and another across the path (43,1). Marsh-lights hang over the pools;
// the island of dead trees in the middle of the fen, and every islet, is out of reach across the water.
// Layout notes: the bridge and the neck between the lamp-post and the dead tree are the only ways on (a Brand's
// re-armed rematch stands beside an open road); the witch-ward is the only way up to Grue's hollow; the peat is the
// only way to the pedlar's pack. The map is foggy (`fog: true`).
// Traced from the painting (one tile is 34.1 of its px; `overTiles: false`). Tiles (bog): '=' the road, '.' moss and
// wet ground, '"' reeds and rushes, 'b' the hut's deck, jetty and steps, and the plank bridge, 'r' the dead trees'
// roots, 'm' the peat before the pedlar's pack (the bog lock lies on it), '~' black water, 'T' dead trees, 't' brush,
// reed beds and islets out of reach, 'o' stumps, stones, rocks and posts, '#' the hut's walls, 'H' its thatch, '+' its
// door.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'lanternfen', name: 'The Lanternfen', region: 'gloomfen', biome: 'bog', music: 'fen',
  backdrop: 'lanternfen', zone: 'lanternfen', level: 16, travel: true, dark: false, fog: true, overTiles: false,
  lore: [[292, 522, 7, 28], [352, 545, 36, 1]],
  w: 45, h: 30,
  rows: [
    '~~o~~~~~~~T~~~~~~tt~~Ttt~~TTT~~~~~~tt~~tt===t', //  0
    't~~~T~~~~~T~t~~~~~~~~To~~~TTT~~~"".....o====t', //  1
    't~~~T~~~~~T~~~~~~~~~tto~t~TTT~~"""..oo.o===.t', //  2
    't...T."~~~~~~~~T~~~~tt~~t~TTTro"""..oo..==.Tt', //  3
    't...T.""~~~~~~~Ttttttt~~~rrTrro..o..=====.rTt', //  4
    't.....""~o~~~~~Ttttttt~~~rr..ro..=======.rTTt', //  5
    't""~~HHHH~"""~~ttttttt~~~~~~t..=======...rrTt', //  6
    't""HHHHHH~""""~~~~~~~T~~~~~~t.=====....""".rt', //  7
    't"HHHHHHH~""""~~~~~~~T~~~~~..====~~~~.."""..t', //  8
    't"HHHHHHH~""""~~~~~~~T.......===.~~~~~.o""~"t', //  9
    't"###+#bbbb""~~~~~""........===..o~o~~..~~~"t', // 10
    't"""""bbbbbbboo~~~"".......====..o~o~~~~~~~"t', // 11
    't"""""""bb~~~~~~~~"".o..======....~~~~~~~~~~t', // 12
    't"o"""""bbb~~~~~~~~~obbb====......~~~~~~~~o~t', // 13
    '~~o~~~~~~~b~~~~~~~~~bbbbo......~~~~~~~~~~~o~~', // 14
    '~~~~oo~""""""~~~~o.bbbb~~~~~~~~~TtttttTTttott', // 15
    '~~~~o~~"""""".....==~~~~~~~~~~~~TTttttTTttott', // 16
    't""~~~~""""""o...===.o"""~~~~~otTtttttTTttttt', // 17
    't""~~~~."""""o.=====.."""~~~~~otttttttTTttttt', // 18
    't""""".........====.t."""~~~~~otttttttTTtt~~t', // 19
    't"""".==========....t...oo~~~~~~~~~ttttt~~~~t', // 20
    't....=====..""".........oo~~~~~~~~~tttt~~~~~t', // 21
    't.oo=====..T""".oo....ooo~~~~~~~o~~~~~~tttttt', // 22
    't.oo====...T"""~oo."".ooo~~~~~~~T~~~~~~tttttt', // 23
    't..o====oo.T~~~~~o~""~~~~~~~~~~tTttt~~~tttttt', // 24
    't..=====oo.T~~~~~~~~~~~~~~~~~~ttooot~~~~ttttt', // 25
    'o======oo..T~~~~~~~~~~~~~~~~~~ttoooo~~~~~~ttt', // 26
    'o=====oomm..~~~..~~~~~~~~tttttttoooo~~~~~~ttt', // 27
    't=====oo.o........~~~~~~~ttttttoooo~~~~~~~ttt', // 28
    't===tooooottttttttt~~~~~~ttttt~~~~~~~~~~~~~tt', // 29
  ],
  entities: [
    { id: 'lf-boots', kind: 'sign', at: [5, 27], look: 'bootprints', text: 'Small bootprints, all going one way.' },
    // Mother Grue's hollow (GLOOM_LEADS.grue), behind a witch-ward across the steps up to her deck
    { id: 'lf-witch-ward', kind: 'lock', lock: 'witch-ward', area: [9, 13, 10, 13] },
    { id: 'grue-hollow', kind: 'encounter', enc: 'grue-hollow', mode: 'lair', at: [7, 11], area: [6, 11, 7, 11], face: 'e' },
    { id: 'lf-grue-pantry', kind: 'chest', at: [12, 11], loot: { gold: 80, bag: { bitterroot: 2 }, gems: { 'bog-amber': 1 } } },
    // the pedlar's pack, dropped in a nook of the rocks behind a patch of peat
    { id: 'lf-bog', kind: 'lock', lock: 'bog', area: [8, 27, 9, 27] },
    { id: 'lf-pedlar-pack', kind: 'chest', at: [8, 28], loot: { gold: 100, items: [{ rarity: 'runed', slot: 'hands' }], materials: { silver: 1 } } },
    { id: 'lf-light-1', kind: 'prop', prop: 'marsh-lights', at: [5, 19] },
    { id: 'lf-light-2', kind: 'prop', prop: 'marsh-lights', at: [14, 21] },
    // M4.5 road gate (spec A3, §2.2): the lantern-hung bough across the plank bridge, the moths beside it
    { id: 'lf-lantern-bough', kind: 'gate', area: [19, 15, 22, 15], look: 'hung-lanterns', open: { beaten: 'lf-moths' }, guard: 'lf-moths', text: 'A dead bough bent low across the path, hung with little lanterns. The moths are so thick around them that the light comes through in pieces.' },
    { id: 'lf-moths', kind: 'encounter', enc: 'lf-moths', mode: 'block', at: [18, 15], face: 's' },
    { id: 'fen-cairn', kind: 'hearthfire', at: [31, 11], stand: [31, 12, 'n'], cold: true },
    { id: 'lf-lights', kind: 'encounter', enc: 'lf-lights', mode: 'pack', at: [35, 4], face: 'w' },
    { id: 'lf-light-3', kind: 'prop', prop: 'marsh-lights', at: [36, 7] },
    { id: 'lf-light-4', kind: 'prop', prop: 'marsh-lights', at: [28, 14] },
    // M4.5 road gate: the hags' hedge across the path between the lamp-post and the dead tree, the hags beside it
    { id: 'lf-hag-hedge', kind: 'gate', area: [40, 3, 41, 3], look: 'hag-fence', open: { beaten: 'lf-hags' }, guard: 'lf-hags', text: 'A hedge of stakes across the path, hung with bones, bottles and knotted hair. Whatever is in the pot beyond it smells like supper.' },
    { id: 'lf-hags', kind: 'encounter', enc: 'lf-hags', mode: 'block', at: [42, 3], face: 's' },
    // the Lantern Mother's lamps at the edge of the drowned grove, either side of the way: the painting's lamp-post on
    // the west, and another across the way
    { id: 'lf-lamp-1', kind: 'sign', at: [39, 3], look: 'painted', name: 'The lamp-post', text: 'A lantern hung from a crooked post, lit, though nobody comes this way to light it. Another burns across the path. Past them the trees close in over the way to the Hollow.' },
    { id: 'lf-lamp-2', kind: 'prop', prop: 'lantern', at: [43, 1], solid: true },
  ],
  exits: [
    { id: 'lf-s', area: [1, 29, 3, 29], to: 'bogmire', anchor: 'from-lanternfen' },
    { id: 'lf-n', area: [41, 0, 43, 0], to: 'mothers-hollow', anchor: 'from-lanternfen' },
  ],
  anchors: { 'from-bogmire': [2, 28, 'n'], 'from-hollow': [42, 1, 's'] },
  roads: [{ from: 'from-bogmire', to: 'lf-n', gates: ['lf-lantern-bough', 'lf-hag-hedge'] }],
  roam: { max: 3, rects: [[0, 17, 18, 25], [20, 2, 31, 13], [31, 1, 38, 9], [31, 4, 43, 9]] },
});
