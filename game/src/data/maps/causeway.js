// The Blackwater Causeway (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-causeway.png), the
// raised causeway of old stone setts between long kerb stones across Mirrordeep's shallows, from Bogmire's road at the
// south-west corner to the road on to the Keep's south-west gate at the north-east corner. It was under the Blackwater
// all spring and comes up out of the water only once the Blackwater falls (A5): both ways onto it open with the Brand
// of the Deep. Stone pillars stand along both kerbs. West of its first half lies a reed marsh, shallow enough to wade,
// with an islet of a bush and two stones where a traveller left a bundle when the water came up (4,9); south of it, a
// reed-bed of small islets, where the marsh-lights linger (15,18). A causeway stone near the Bogmire end names both
// ends (9,17); half-way, the water-mark still shows on the stones (18,12). Everywhere else the water is open and
// deeper: reed clumps, rocks and a big islet stand out of it with no way to them.
// Traced from the painting (one tile is 42.7 of its px; `overTiles: false`). The painting's water is clear and shallow
// everywhere; the marsh and the reed-bed, thick with reeds and lily pads, are traced as shallows, the open stretches as
// deep water.
// Layout notes: no fight holds the causeway; it is the way home, as the Highfold was M5's.
// Tiles (causeway): '=' the causeway's crown, ':' its kerb stones, '"' reeds, '.' grassy shores and islets, 'm' the
// trodden earth of the roads on the shores, 'w' shallows (the marsh and the reed-bed), '~' Mirrordeep's open water, 'T'
// a willow on the shore, 't' bushes, and the reed clumps and the islet out in the open water, 'o' the kerbs' pillars,
// rocks and stones.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'causeway', name: 'The Blackwater Causeway', region: 'gloomfen', biome: 'causeway', music: 'road',
  backdrop: 'causeway', zone: 'causeway', level: 16, travel: true, dark: false, overTiles: false,
  lore: [[300, 518, 3, 21], [520, 410, 32, 2]],
  w: 36, h: 24,
  rows: [
    '~~~~~~~~~~~~~~~~~~~ttt~~~~oooottmmmt', //  0
    '~"""wwww".ttttt~~~~ttoo""ooooommmmtt', //  1
    '~""wwwww".ttttt~~~~~~~~"""oooommmttt', //  2
    '~wwwwwwwwoooott~t~~~~~~"""~::=:m.ttt', //  3
    '~w"wwwwwwoooooo~tt~~~~~""":===:...tt', //  4
    '~""""w"wwwwow~~~~~~~~~~o::==:ooooooo', //  5
    '~"""""""wwwww~~~~~""""::===:~~oooooo', //  6
    '~"wtt"""wwwwo~~~~"""":===:o"~~~~tt~~', //  7
    '~w.tt""wwwwwww~~~"o::===:~~"~~~~~~ot', //  8
    '~woo.""wwwwwwww~~::===::"~~~~~~~~~tt', //  9
    '~ww..w"ww"wwww"o:===:o"""~~~~~~~~~~~', // 10
    '~"wwooww"""w"w::===:~~"""~~~~~oo~~~~', // 11
    '~""wwwwo"""wo:===::~~~~~~~o~~~~~~~~~', // 12
    '~"ww""www"w::===:~""~~~~~tttttt~~~~~', // 13
    'o.w""""ww::===::ww""~~~~~tttttttt~~~', // 14
    'toott""o:===::o"wwww~~~~~toottttt~~~', // 15
    't..ttw::===:ww""wwwww~~~~ooootttt~~~', // 16
    'TT.o.:===::"wwwwwwwwo~~~~oooottt~~~~', // 17
    'TT..mm:::w""wtwwwttww~~~~tootttt~~tt', // 18
    'TT.mmmm.oowwwwwwow""w~~~~~~~~tt~~~tt', // 19
    't.mmmm.....o""wwww"ww~~~~~~~~~~~~~tt', // 20
    'tmmmm.o...oo"""wwwww~~~~oo~~~~o~~~tt', // 21
    'tmmmtto......ooww~~~~~~~oo~~~~~~~~~~', // 22
    'mmmtttttottttoot~~~~~~~~~~~~~~~~~~~~', // 23
  ],
  entities: [
    { id: 'cw-milestone', kind: 'sign', at: [9, 17], look: 'stone', text: 'A causeway stone: HEARTHSTONE KEEP one way, BOGMIRE the other, and between them a line of green weed where the water stood all spring.' },
    { id: 'cw-bundle', kind: 'chest', at: [4, 9], loot: { gold: 90, bag: { 'hearth-tonic': 2 }, materials: { silver: 1 } } },
    { id: 'cw-mark', kind: 'sign', at: [18, 12], look: 'stone', text: 'A water-mark on the causeway stones, higher than your head.' },
    { id: 'cw-lights', kind: 'encounter', enc: 'cw-lights', mode: 'pack', at: [15, 18], face: 'n' },
  ],
  exits: [
    { id: 'cw-s', area: [0, 23, 2, 23], to: 'bogmire', anchor: 'from-causeway' },
    { id: 'cw-n', area: [32, 0, 34, 0], to: 'keep', anchor: 'from-causeway' },
  ],
  anchors: { 'from-bogmire': [1, 22, 'n'], 'from-keep': [33, 1, 's'] },
  roads: [{ from: 'from-bogmire', to: 'cw-n', gates: [] }],
  roam: { max: 2, rects: [[9, 14, 20, 21], [1, 1, 12, 12]] },
});
