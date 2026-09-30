// Thareia (T2): the landing field outside Thornhollow's south gate, where the skiff sets down (design/09-t2-spec.md
// 2.11). Stub by the foundation: a small drawn clearing (a road from the gate, the skiff's flagstone platform) until G
// traces painting 5 (walk-thornhollow-landing.png) and imports it (tools/paint-import.mjs --map=th-landing). It holds
// the Prologue's th-landing trigger (moved here from th-thornhollow), so the first flight still ends here with Yara's
// goodbye and the Prologue's card. Owner: G.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-landing', name: 'Thornhollow Landing', region: 'verdant', biome: 'wilds', music: 'town',
  backdrop: 'verdant-wood', zone: null, level: 2, travel: true, dark: false,
  lore: [[310, 268, 12, 8]],
  w: 24, h: 16,
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT', //  0
    'T.,....t...==...t..,...T', //  1
    'T..........==..........T', //  2
    'T...,......==.....,....T', //  3
    'T..........==..........T', //  4
    'T.....::::::::::::.....T', //  5
    'T.....::::::::::::..,..T', //  6
    'T..,..::::::::::::.....T', //  7
    'T.....::::::::::::.....T', //  8
    'T.....::::::::::::.....T', //  9
    'T.....::::::::::::..t..T', // 10
    'T..t.......==.........,T', // 11
    'T..........==..........T', // 12
    'T...,......==....,.....T', // 13
    'T..........==..........T', // 14
    'TTTTTTTTTTT==TTTTTTTTTTT', // 15
  ],
  entities: [
    // the Prologue's end (T1): Yara's goodbye, the gold, and the Prologue's card (it also sets c1-start)
    { id: 'th-landing', kind: 'trigger', area: [0, 0, 23, 15], on: 'enter', if: { not: { flag: 'th-landed' } }, dialogue: 'th-landing' },
  ],
  exits: [
    { id: 'tl-n', area: [11, 0, 12, 0], to: 'th-thornhollow', anchor: 'from-landing' },
    { id: 'tl-s', area: [11, 15, 12, 15], sealed: { region: 'verdant', text: 'The Hearth Road, to the Keep. Not yet: the Wilds first.' } },
  ],
  anchors: { 'from-skiff': [12, 8, 'n'], 'from-town': [12, 1, 's'] },
  roam: null,
});
