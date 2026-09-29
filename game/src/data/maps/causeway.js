// The Blackwater Causeway (M6 spec §2.1, §2.3), the raised stone causeway across Mirrordeep's shallows between Bogmire
// (SW) and the Keep's south-west gate (NE). It was under the Blackwater all spring and comes up out of the water only
// once the Blackwater falls (A5): both ways onto it open with the Brand of the Deep. The stones are still hung with weed
// and wrack; where the water was deepest the causeway runs between high walls, and a gap in one lets you down onto a
// reed-bed below it, where the marsh-lights linger (25,11). A causeway stone near the Bogmire end names both ends
// (6,12); half-way, the water-mark still shows on a marker stone, higher than your head (30,6). Out on a mudbank by the
// Bogmire end lies a bundle a traveller left when the water came up (2,4).
// Layout notes: no fight holds the causeway; it is the way home, as the Highfold was M5's.
// Tiles (causeway): '=' the causeway's crown, ':' its edge stones, ',' weed and wrack on the stones, '^' its high
// walls, '~' Mirrordeep's water, 'w' shallows, 'm' mud the falling water left, '"' reeds, 'T' willows, 'o' fallen
// blocks.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'causeway', name: 'The Blackwater Causeway', region: 'gloomfen', biome: 'causeway', music: 'road',
  backdrop: 'causeway', zone: 'causeway', level: 16, travel: true, dark: false,
  lore: [[300, 518, 4, 14], [520, 410, 42, 1]],
  w: 48, h: 16,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~o==o~~~', //  0
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T~:==:~T~', //  1
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:==:~~~', //  2
    '~m"m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:==:~~~', //  3
    '~"""m~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~:==:~~~', //  4
    '~mmm~w~~~o~~~~~~o~~~~~~~~~~~~~~~~~~~~~~~w:==:~~T', //  5
    '~~~::::,::^^^^^:::::::^^^^^^::,::^^^^:::::==,~~~', //  6
    '~~~,=====================================,==:o~~', //  7
    '~~~:=====================================:==:~~~', //  8
    '~~~:,,::::^^^^^:::::::^^::^^::,::^^^^,::,,:,:~~~', //  9
    '~~~,==:~~~~~~~~w~w~~o~~"""""~~o~w~~~~wo~~~~~~~~~', // 10
    '~~T:==:~~~~~~~~~~~~~~~~"""""~~~~~~~~~~~~~~~~~~~~', // 11
    '~~w:==:~T~~~~~~~~~~~~wm"""""""m~~~~~~~~~~~~~~~~~', // 12
    '~Tw:==:w~~~~~~~~~~~~~~~"""""mm~~~~~~~~~~~~~~~~~~', // 13
    '~~~,==:T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 14
    '~~~o==o~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 15
  ],
  entities: [
    { id: 'cw-milestone', kind: 'sign', at: [6, 12], look: 'stone', text: 'A causeway stone: HEARTHSTONE KEEP one way, BOGMIRE the other, and between them a line of green weed where the water stood all spring.' },
    { id: 'cw-bundle', kind: 'chest', at: [2, 4], loot: { gold: 90, bag: { 'hearth-tonic': 2 }, materials: { silver: 1 } } },
    { id: 'cw-mark', kind: 'sign', at: [30, 6], look: 'stone', text: 'A water-mark on the causeway stones, higher than your head.' },
    { id: 'cw-lights', kind: 'encounter', enc: 'cw-lights', mode: 'pack', at: [25, 11], face: 'n' },
  ],
  exits: [
    { id: 'cw-s', area: [4, 15, 5, 15], to: 'bogmire', anchor: 'from-causeway' },
    { id: 'cw-n', area: [42, 0, 43, 0], to: 'keep', anchor: 'from-causeway' },
  ],
  anchors: { 'from-bogmire': [4, 14, 'n'], 'from-keep': [42, 1, 's'] },
  roads: [{ from: 'from-bogmire', to: 'cw-n', gates: [] }],
  roam: { max: 2, rects: [[21, 10, 30, 13], [7, 6, 40, 9]] },
});
