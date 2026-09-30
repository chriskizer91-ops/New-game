// Thareia (T1): Thornhollow, where the Prologue's first flight lands (the skiff sets down in the clearing outside the
// south gate). The old game's Thornhollow (thornhollow.js) and its painting (`paint`), with Thareia's arrival: Yara
// says goodbye, and Chapter 1 (the Rot's Roots, T2) starts here. Every gate is closed until then.
// T2: the skiff lands at th-landing, outside the south gate (tt-s); the Prologue's th-landing trigger moved there.
// `from-skiff` stays for old saves. Owner: M (after the foundation).
// T2 (design/09-t2-spec.md section 2.1): the town's Chapter 1 people (the outfitter, the trader), Dael's notices, the
// lookout, the rangers' stockade and its cache (S2), and the three roads out, each opened by the story: north to the
// Thornway (c1-courier), west to Mossfall (c1-west-open), north-east to the Hindwood (c1-to-fawnrest).
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
    { id: 'th-aldric', kind: 'npc', npc: 'aldric', at: [16, 8], face: 's' },
    { id: 'th-dael', kind: 'npc', npc: 'th-ranger', at: [7, 6], face: 's' },
    // T2 (spec 2.1): Dael's board opens the side quests once he has spoken to you
    { id: 'th-notices', kind: 'sign', at: [9, 5], text: 'RANGERS\' NOTICES.', talk: 'c1-board', talkIf: { flag: 'c1-dael' } },
    { id: 'th-outfitter', kind: 'npc', npc: 'th-outfitter', at: [18, 15], face: 's' },
    { id: 'th-trader', kind: 'npc', npc: 'th-trader', at: [8, 17], face: 'n' },
    { id: 'th-tt-lookout', kind: 'lookout', at: [2, 3] },
    // the rangers' stockade in the south-east corner opens with Dael's thanks (S2); the cache waits behind it
    { id: 'th-tt-stockade', kind: 'gate', area: [20, 18, 20, 18], look: 'barred-gate', open: { flag: 's2-done' }, text: 'The rangers\' stockade. The gate is barred from inside.' },
    { id: 'th-tt-cache', kind: 'chest', at: [21, 19], loot: { gold: 40, items: [{ rarity: 'runed', ilvl: 6 }], bag: { 'hearth-tonic': 1 } } },
  ],
  exits: [
    { id: 'tt-s', area: [11, 21, 12, 21], to: 'th-landing', anchor: 'from-town' },
    { id: 'tt-n', area: [11, 0, 12, 0], to: 'th-thornway', anchor: 'from-thornhollow', gate: { flag: 'c1-courier' }, sealed: { region: 'verdant', text: 'The Thornway. Aldric has not given you a reason to take it yet.' } },
    { id: 'tt-w', area: [0, 10, 0, 11], to: 'th-mossfall', anchor: 'from-thornhollow', gate: { flag: 'c1-west-open' }, sealed: { region: 'verdant', text: 'The Mossfall road. Shut by the rangers\' order.' } },
    { id: 'tt-ne', area: [23, 3, 23, 4], to: 'th-hindwood', anchor: 'from-thornhollow', gate: { flag: 'c1-to-fawnrest' }, sealed: { region: 'verdant', text: 'The Hindwood road, toward Fawnrest. Nobody goes that way now.' } },
  ],
  anchors: { 'from-skiff': [12, 19, 'n'], 'from-landing': [12, 19, 'n'], 'from-thornway': [12, 2, 's'], 'from-mossfall': [2, 10, 'e'], 'from-hindwood': [21, 4, 'w'] },
  roam: null,
});
