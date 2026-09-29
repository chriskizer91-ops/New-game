// The Highfold (M5 spec §2.1, §2.3), the scree path from Peak's Veil down to Fawnrest, the side road the
// monks unbar. From the Veil's west gate the path comes in along a ledge (E) to a neck in the ridge
// where two peak-trolls have rolled a boulder across it (22,5-6) and sit beside it arguing (22,7). Past
// the neck it drops down the scree slope in long zigzags. West of the upper slope stands the Thunder-Roc's
// crag, a plateau of rock beyond a crevasse, crossed only where it narrows (7-8,15); the Roc nests on it
// among goat bones (at 3,14). East of the lower slope a hollow in the crags is filled with deep drifted
// snow, a pilgrim's pack at its back. Lower down, a line of scree slides crosses the slope (you can slide
// down them, not climb), the pines thicken and the path runs out at the bottom toward Fawnrest.
// Layout notes: the trolls stand in the neck beside their boulder, so a Brand's re-armed Echo stands
// beside an open path; coming up from Fawnrest, the boulder's far side still calls them out. The
// crevasse is the only way onto the crag; the drift is soft (3% of max HP a step without a key).
// Tiles (scree): ',' loose stones, '.' scree ground, '"' tussock grass, 'o' boulders, 'T' pines,
// '^' crags, '=' the path, 'x' the crevasse, 'm' deep drifts, 'v' the scree slides.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'highfold', name: 'The Highfold', region: 'ironspire', biome: 'scree', music: 'peaks',
  backdrop: 'highfold', zone: 'highfold', level: 14, travel: true, dark: false,
  lore: [[736, 236, 29, 5], [540, 198, 3, 39]],
  w: 30, h: 40,
  rows: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  0
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  1
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', //  2
    '^^^^^^^^^^...,..,...o,^,".o,.^', //  3
    '^^^^^^^^^^o,.,,....T.,^T,..T.^', //  4
    '^^^^^^^^^^,,.o,===============', //  5
    '^^^^^^^^^^",,o,===============', //  6
    '^^^^^^^^^^,,.,.==o".,o.,.,,.,^', //  7
    '^^^^^^^^^^",,..==,,.T.^...,..^', //  8
    '^^^^^^^^^^.,,",==o,..,^^^^^^^^', //  9
    '^^^^^^^^^..,.,"==,,,,,^^^^^^^^', // 10
    '^^^^^^^xx.,T,,.==,.,.,^^^^^^^^', // 11
    '^oo.,".xx.,======...T.o^^^^^^^', // 12
    '^o,....xx,.=====.,,o.,.^^^^^^^', // 13
    '^,.,,..xx,.==,,,,,,.,,.^^^^^^^', // 14
    '^o.,...,,,.==.,,,.,...,^^^^^^^', // 15
    '^,,.,,.xx.,==,.."..",,"^^^^^^^', // 16
    '^..,.ooxx,T==T.,.".,.,.^^^^^^^', // 17
    '^^^^^^^xx,.==.,..,,,,.,^^^^^^^', // 18
    '^^^^^^^^^,.==.o.TT,^^^^^^^^^^^', // 19
    '^,..T,,.,."==.o.o..^mmmmmm^^^^', // 20
    '^"..,.T..,.==o..,...mmmmmm^^^^', // 21
    '^T...,=======.......mmmmmm.^^^', // 22
    '^.",o,======o..,.o,.mmmmmm^^^^', // 23
    '^,,..,==.,,.",.",,T.mmmmmm^^^^', // 24
    '^T,,.,==.,..T.,.,".^mmmmmm^^^^', // 25
    '^.,,,,==.........,"^^^^^^^^^^^', // 26
    '^T,.,"==,.To,..",T,^^^^^^^^^^^', // 27
    '^,.,,,==,".,.,.......,....,,^^', // 28
    '^o,,..==ovvvvvvvvvo..,.,,,,,^^', // 29
    '^o.,,,==.,.,,,,.,,,,....,...^^', // 30
    '^,.,",==.o,,",...,,"...,.",T^^', // 31
    '^,",",==,.,,,.o,T.T,.T.,",T,^^', // 32
    '^.o=====.."...,.T...T,..,,,,^^', // 33
    '^..====,,..,,,,..,..,,.,.,,.^^', // 34
    '^".==.,,,.,.,..,,,....,T,T.T^^', // 35
    '^.o==,..T.T",".,o,..,,,.,...^^', // 36
    '^,.==,.,,..,T,,.."..,,o.o.,.^^', // 37
    '^,,==.....,,..,.",....,.,,,,^^', // 38
    '^^^==^^^^^^^^^^^^^^^^^^^^^^^^^', // 39
  ],
  entities: [
    // M4.5 road gate (spec A3, §2.2): the trolls' boulder across the path in the neck, the trolls beside it
    { id: 'hf-boulder', kind: 'gate', area: [22, 5, 22, 6], look: 'boulder', open: { beaten: 'hf-trolls' }, guard: 'hf-trolls', text: 'A boulder rolled across the path where it squeezes through the ridge. Two trolls are sitting beside it, arguing about whose boulder it is.' },
    { id: 'hf-trolls', kind: 'encounter', enc: 'hf-trolls', mode: 'block', at: [22, 7], face: 'e' },
    { id: 'hf-crevasse', kind: 'lock', lock: 'chasm', area: [7, 15, 8, 15] },
    { id: 'roc-eyrie', kind: 'encounter', enc: 'roc-eyrie', mode: 'lair', at: [3, 14], area: [2, 13, 3, 14], face: 'e' },
    { id: 'hf-nest', kind: 'chest', at: [2, 16], loot: { gold: 140, gems: { 'glass-pearl': 1 }, materials: { embers: 1, silver: 1 } } },
    { id: 'hf-drift', kind: 'lock', lock: 'drift', area: [20, 20, 25, 25] },
    { id: 'hf-drift-pack', kind: 'chest', at: [26, 22], loot: { gold: 100, items: [{ rarity: 'runed', slot: 'head' }], materials: { silver: 1 } } },
    { id: 'hf-waymark', kind: 'sign', at: [5, 37], look: 'post', text: 'THE HIGHFOLD. Up: Peak\'s Veil, a day\'s climb. Down: Fawnrest, and a bath.' },
  ],
  exits: [
    { id: 'hf-e', area: [29, 5, 29, 6], to: 'peaks-veil', anchor: 'from-highfold' },
    { id: 'hf-s', area: [3, 39, 4, 39], to: 'fawnrest', anchor: 'from-highfold' },
  ],
  anchors: { 'from-veil': [28, 5, 'w'], 'from-fawnrest': [3, 38, 'n'] },
  roads: [{ from: 'from-veil', to: 'roc-eyrie', gates: ['hf-boulder'] }, { from: 'from-veil', to: 'hf-s', gates: ['hf-boulder'] }],
  roam: { max: 2, rects: [[9, 10, 21, 19], [1, 20, 18, 38], [19, 28, 27, 38]] },
});
