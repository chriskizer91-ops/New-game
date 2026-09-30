// Thareia (T1): Thornhollow, where the Prologue's first flight lands (the skiff sets down in the clearing outside the
// south gate). The old game's Thornhollow (thornhollow.js) and its painting (`paint`), with Thareia's arrival: Yara
// says goodbye, and Chapter 1 (the Rot's Roots, T2) starts here. Every gate is closed until then.
// Rows and tiles as thornhollow.js. Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-thornhollow', name: 'Thornhollow', region: 'verdant', biome: 'town', music: 'town', paint: 'thornhollow',
  backdrop: 'thornhollow', zone: null, level: 3, travel: true, dark: false,
  lore: [[310, 260, 12, 11]],
  w: 24, h: 22,
  rows: [
    '|||||||||||==|||||||||||', //  0
    '|:::HHHHHH.==.T..,..T..|', //  1
    '|:::HHHHHH.==.,..".....|', //  2
    '|:::HHHHHH.=============', //  3
    '|..:######.=============', //  4
    '|T.........==.HHHHH....|', //  5
    '|..,.......==.HHHHH.T..|', //  6
    '|.....,....==.#####..."|', //  7
    '|T.........==.........T|', //  8
    '|..T.....t:::::t..,,,..|', //  9
    '=========:::::::..,",..|', // 10
    '=========:::::::.......|', // 11
    '|.HHHHH..:::::::.HHHHH.|', // 12
    '|.HHHHH..:::::::.HHHHH.|', // 13
    '|.#####..:::::::.##*##.|', // 14
    '|....,...t:::::t.......|', // 15
    '|..T....HH.==.HH.......|', // 16
    '|.HHHHH....==.......||||', // 17
    '|.HHHHH....==.,.,...:..|', // 18
    '|.#####....==..,,...|..|', // 19
    '|..,...,...==....T..|..|', // 20
    '|||||||||||==|||||||||||', // 21
  ],
  entities: [
    { id: 'th-hearth', kind: 'hearthfire', at: [12, 12], stand: [12, 13, 'n'] },
    { id: 'th-landing', kind: 'trigger', area: [0, 0, 23, 21], on: 'enter', if: { not: { flag: 'th-landed' } }, dialogue: 'th-landing' },
    { id: 'th-aldric', kind: 'npc', npc: 'aldric', at: [16, 8], face: 's' },
    { id: 'th-dael', kind: 'npc', npc: 'th-ranger', at: [7, 6], face: 's' },
  ],
  exits: [
    { id: 'tt-s', area: [11, 21, 12, 21], sealed: { region: 'verdant', text: 'The Hearth Road south, to the Keep.' } },
    { id: 'tt-n', area: [11, 0, 12, 0], sealed: { region: 'verdant', text: 'The Thornway, north into the Verdant Wilds.' } },
    { id: 'tt-w', area: [0, 10, 0, 11], sealed: { region: 'verdant', text: 'The west road to Mossfall.' } },
    { id: 'tt-ne', area: [23, 3, 23, 4], sealed: { region: 'verdant', text: 'The Hindwood road.' } },
  ],
  anchors: { 'from-skiff': [12, 19, 'n'] },
  roam: null,
});
