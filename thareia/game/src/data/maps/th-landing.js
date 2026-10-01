// Thareia (T2): the landing field outside Thornhollow's south gate, where the skiff sets down (design/09-t2-spec.md
// 2.11). Traced tile by tile from the player's painting art-in/scenes/walk-thornhollow-landing.png (1536 x 1024,
// 48 x 32 tiles at 32 px; `overTiles: false`): the palisade and its open gate along the top, a dirt road from the gate
// down past the mooring mast to the Hearth Road at the bottom, the flagstone-and-plank platform round the mast, the
// cargo skiff moored over the grass to its west, and Hob Dustwind's hire hut with its crates and lamp post to the east.
// Tiles: '|' the palisade, its two open gate leaves and the fences; '=' the road; '_' the platform's deck and the
// gangway; 's' the platform's steps; '#' the skiff (hull, masts, sails and crystals), the mooring mast's base, the hut and the platform's front beam; 't' crates, the winch and the
// hut's counters; 'o' rocks; 'T' the woods.
// It holds the Prologue's th-landing trigger (moved here from th-thornhollow by the foundation), so the first flight
// still ends here with Yara's goodbye and the Prologue's card. Owner: G.
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-landing', name: 'Thornhollow Landing', region: 'verdant', biome: 'wilds', music: 'town',
  backdrop: 'verdant-wood', zone: 'th-landing', level: 2, travel: true, dark: false, overTiles: false,
  lore: [[310, 268, 24, 16]],
  w: 48, h: 32,
  // the mooring mast's pole and crossbar stand over the grass behind the platform: the party walks behind them
  overhang: [[23, 2, 24, 10], [21, 5, 26, 6]],
  rows: [
    'TTTTTTTTTTT|||||||||||||||||====||||||||||||TTTT', //  0
    'TTTTTTTTTTT|TTTTTT||||||||||====||||||||||||TTTT', //  1
    'TTTTTTTTTTT|TTTTTT||||||||||====||||||||||||TTTT', //  2
    'TTTTTTTTTTTTTTTTTTTT......||====||||||||||TTTTTT', //  3
    'TTTTTTTTTTTTTTTTTT........||====||ooooo...TTTTTT', //  4
    'TTTTTTTToooooTTTTT..........=====|..|......TTTTT', //  5
    'TTTTTTTTooooo................====....||.ooo.TTTT', //  6
    'TTTTTTTTooooo................====......|ooo.TTTT', //  7
    'TTTTT#############...........=====.......|..TTTT', //  8
    'TTTTT#############...........=====.......|.ooooT', //  9
    'TTTTT################........o====.........ooooT', // 10
    'TTTT.################.######..====..........oooT', // 11
    'TT...################.######..=====...#######ooT', // 12
    'TT...#######################..=====#..#######TTT', // 13
    'TT..#####################ttt__=====#..#######TTT', // 14
    'TT..############_________ttt____ttt#tt#######TTT', // 15
    'TT..############________________ttt#tt#######..T', // 16
    'TT..################____________tttttt#######..T', // 17
    'TT.#################_________#___ttttt###ttttttT', // 18
    'TT.######################sss####.ttttt...ttttttT', // 19
    'TT....######............=sss===..||.......|||||T', // 20
    'TTTTT...................=======....||||||....TTT', // 21
    'TTTTTTTTTT........oo..oo=======.t.oo......TTTTTT', // 22
    'TTTTTTTTTTTTTT....oo..oo======....oo....TTTTTTTT', // 23
    'TTTTTTTTTTTTTTooooTT||||======........TTTTTTTTTT', // 24
    'TTTTTTTTTTTTTTooooTT|...=====.....t...TTTTTTTTTT', // 25
    'TTTTTTTTTTTTTTooooTT|...=====.......ooTTTTTTTTTT', // 26
    'TTTTTTTTTTTTTTTTTTTT|...=====.......ooTTTTTTTTTT', // 27
    'TTTTTTTTTTTTTTTTTTTT|TTT=====...|TTTTTTTTTTTTTTT', // 28
    'TTTTTTTTTTTTTTTTTTT|TTTT=====...|TTTTTTTTTTTTTTT', // 29
    'TTTTTTTTTTTTTTTTTTT|TTTT====.....|TTTTTTTTTTTTTT', // 30
    'TTTTTTTTTTTTTTTTTTT|TTTT====.....|TTTTTTTTTTTTTT', // 31
  ],
  entities: [
    // the Prologue's end (T1): Yara's goodbye, the gold, and the Prologue's card (it also sets c1-start)
    { id: 'th-landing', kind: 'trigger', area: [0, 0, 47, 31], on: 'enter', if: { not: { flag: 'th-landed' } }, dialogue: 'th-landing' },
    // Chapter 1, beat 1: two road-rats at the split crate; any step on the platform or the gangway starts it
    { id: 'c1-crate-thieves', kind: 'trigger', area: [16, 14, 33, 18], on: 'step', if: { all: [{ flag: 'c1-start' }, { not: { beaten: 'c1-landing' } }] }, dialogue: 'c1-crate-thieves' },
    { id: 'th-landing-crate', kind: 'sign', at: [26, 15], look: 'painted', text: 'FERNSHAW, THORNHOLLOW. One seam split. It still hums, faintly.' },
    // Hob Dustwind at the door of the hire hut; the hire sign hangs on the lamp post by his crates
    { id: 'th-skyhire', kind: 'npc', npc: 'th-hire-landing', at: [39, 20], face: 's' },
    { id: 'th-skyhire-post', kind: 'sign', at: [35, 14], look: 'painted', text: 'DUSTWIND SKIFF HIRE. Licensed docks only. No night flying.' },
  ],
  exits: [
    { id: 'tl-n', area: [28, 0, 31, 0], to: 'th-thornhollow', anchor: 'from-landing' },
    { id: 'tl-s', area: [24, 31, 27, 31], sealed: { region: 'verdant', text: 'The Hearth Road, to the Keep. Not yet: the Wilds first.' } },
  ],
  anchors: { 'from-skiff': [29, 16, 'n'], 'from-town': [29, 1, 's'] },
  roam: { max: 1, rects: [[33, 5, 42, 12]] },
});
