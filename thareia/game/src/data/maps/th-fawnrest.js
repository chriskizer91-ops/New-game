// Thareia (T2): Fawnrest Shrine, Chapter 1's copy of the old game's fawnrest.js (design/09-t2-spec.md section 2.9): the
// old rows and painting (`paint`). No white deer; sick pilgrims round their fire, a steaming pool, Keeper Maren by the
// court. Once the hero has reached Fawnrest, stepping into the court finds the stair (c1-stair); the slab lies open and
// the stair (fr-node) goes down to the node. The Dreaming Stone stays cold until the node is cooled. The bell-frame is
// scenery. The scree path east (fr-highfold) stays shut in Chapter 1.
// Rows and tiles as fawnrest.js. Format: src/data/maps/index.js. Owner: M.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-fawnrest', name: 'Fawnrest Shrine', region: 'verdant', biome: 'grove', music: 'hearth', paint: 'fawnrest',
  backdrop: 'fawnrest', zone: null, level: 8, travel: true, dark: false,
  lore: [[370, 170, 11, 10]],
  w: 22, h: 20,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTT', //  0
    'TTTTTTTTTTTTTTTT"""TTT', //  1
    'TTo..TTTT,,,,,T",,,"TT', //  2
    'Ttt..oTT.,,,,,.,,",,,T', //  3
    'TTo...T.#:::::#t,,"",T', //  4
    'TTT..,,.:::::::t,,,,,T', //  5
    'TTT.,,..:::::::.,"",,T', //  6
    'TT..,,..:::::::t,,,,TT', //  7
    'TT...,,.#:::::#.,,tooo', //  8
    'T..t.,.....===========', //  9
    'T.....,...==..........', // 10
    'TtHH..,...==....HH.ooo', // 11
    'T..,.....,==,...oo..TT', // 12
    'TT..HH....==..t....TTT', // 13
    'TTw,.....,==,.....TTTT', // 14
    'TTww,...".==..T..tTTTT', // 15
    'TT~ww,..,.==.,..,TTTTT', // 16
    'TTT~w,.t..==,..TTTTTTT', // 17
    'TTTTT,,...==,.TTTTTTTT', // 18
    'TTTTTTTTTT==TTTTTTTTTT', // 19
  ],
  entities: [
    { id: 'c1-fr-arrive', kind: 'trigger', area: [9, 15, 12, 18], on: 'step', once: true, dialogue: 'c1-fr-arrive' },
    { id: 'th-fr-camp', kind: 'hearthfire', at: [7, 12], stand: [7, 13, 'n'] },
    // the Dreaming Stone stays cold until the node is cooled
    { id: 'th-fr-stone', kind: 'hearthfire', at: [11, 6], stand: [11, 7, 'n'], cold: true, coldUntil: { flag: 'c1-node-cooled' } },
    { id: 'th-fr-bellframe', kind: 'sign', at: [7, 6], look: 'painted', name: 'The bell-frame', text: 'An old bell-frame over the court. Moss has grown on the beam. Nobody has rung it in a long time.' },
    { id: 'th-keeper', kind: 'npc', npc: 'th-keeper', at: [13, 8], face: 's' },
    { id: 'th-pilgrim-1', kind: 'npc', npc: 'th-pilgrim', at: [5, 12], face: 's' },
    { id: 'th-pilgrim-2', kind: 'npc', npc: 'th-pilgrim', at: [8, 14], face: 's' },
    { id: 'th-burner-fr', kind: 'npc', npc: 'th-burner-fr', at: [9, 12], face: 'w', if: { all: [{ flag: 's3-talked' }, { not: { flag: 's3-done' } }] } },
    // the shard drags your hand to the court: the stair under it (c1-stair)
    { id: 'c1-fr-court', kind: 'trigger', area: [9, 5, 13, 8], on: 'step', if: { all: [{ flag: 'c1-fawnrest' }, { not: { flag: 'c1-stair-found' } }] }, dialogue: 'c1-stair' },
    { id: 'th-fr-slab', kind: 'prop', prop: 'open-slab', at: [11, 4], if: { flag: 'c1-stair-found' } },
    { id: 'c1-vesper', kind: 'encounter', enc: 'c1-vesper', mode: 'block', at: [16, 13], face: 'w', talk: 'c1-vesper', if: { not: { flag: 'c1-vesper-gone' } } },
    { id: 'th-fr-offering', kind: 'chest', at: [3, 3], loot: { items: [{ rarity: 'storied', slot: 'amulet' }] } },
    { id: 'th-fr-pilgrim-cache', kind: 'chest', at: [1, 12], loot: { bag: { 'hearth-tonic': 2 } } },
    { id: 'th-fr-meadow', kind: 'chest', at: [20, 3], loot: { gold: 90 } },
    { id: 'th-fr-pool-sample', kind: 'sign', at: [4, 15], text: 'The pool steams. It is too hot to touch.', talk: 'c1-sample-pool', talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-pool' } }] } },
    // S9 done: the white deer come back to the meadow
    { id: 'th-fr-deer-1', kind: 'prop', prop: 'deer', at: [16, 4], if: { flag: 's9-done' } },
    { id: 'th-fr-deer-2', kind: 'prop', prop: 'deer', at: [18, 6], if: { flag: 's9-done' } },
  ],
  exits: [
    { id: 'fr-s', area: [10, 19, 11, 19], to: 'th-hindwood', anchor: 'from-fawnrest' },
    { id: 'fr-node', area: [11, 4, 11, 4], to: 'th-fawnrest-node', anchor: 'from-fawnrest', gate: { flag: 'c1-stair-found' }, sealed: { region: 'verdant', text: 'Paving stones, warm under your feet.' } },
    { id: 'fr-highfold', area: [21, 9, 21, 10], sealed: { region: 'ironspire', text: 'Fallen scree, and somewhere past it, a bell.' } },
  ],
  anchors: { 'from-hindwood': [11, 17, 'n'], 'from-node': [11, 5, 's'], 'from-skiff': [14, 10, 'w'] },
  roam: null,
});
