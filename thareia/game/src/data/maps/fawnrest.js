// Fawnrest Shrine (M3 spec §2.1, §2.3). A clearing ringed by old trees. The Dreaming Stone stands on
// a mossy paved court with four old pillars, the empty bell-frame (7,6) at its west edge and Brother
// Ivo by the south pillar. The white-deer meadow (north-east, behind a hedge) is where the deer come
// home. The pilgrims' tents and bathing pool are in the south-west, Vesper stands in front of his
// awning stall in the east, and the scree path runs east to the Highfold way (21,9..10), which the
// monks of Peak's Veil clear from above (flag highfold-open, M5 spec §2.4). The offering chest (3,3)
// waits in a rocky nook.
// Every entity sits at its spec coordinates except two, each moved 1 tile south:
// - the Dreaming Stone, to (11,6), so it touches its stand (11,7) and interact reaches it there;
// - Vesper, to (16,13), so the awning (an overhead roof) never hides his head.
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'fawnrest', name: 'Fawnrest Shrine', region: 'verdant', biome: 'grove', music: 'hearth',
  backdrop: 'fawnrest', zone: null, level: 4, travel: true, dark: false,
  lore: [[370, 170, 11, 10]],
  w: 22, h: 20,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTT', // 0
    'TTTTTTTTTTTTTTTT"""TTT', // 1
    'TTo..TTTT,,,,,T",,,"TT', // 2
    'Ttt..oTT.,,,,,.,,",,,T', // 3
    'TTo...T.#:::::#t,,"",T', // 4
    'TTT..,,.:::::::t,,,,,T', // 5
    'TTT.,,..:::::::.,"",,T', // 6
    'TT..,,..:::::::t,,,,TT', // 7
    'TT...,,.#:::::#.,,tooo', // 8
    'T..t.,.....===========', // 9
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
    { id: 'fawnrest-stone', kind: 'hearthfire', at: [11, 6], stand: [11, 7, 'n'] },
    { id: 'fr-bellframe', kind: 'bellframe', at: [7, 6] },
    { id: 'ivo', kind: 'npc', npc: 'ivo', at: [13, 8], face: 's' },
    { id: 'pilgrim-1', kind: 'npc', npc: 'pilgrim', at: [5, 12], face: 's' },
    { id: 'pilgrim-2', kind: 'npc', npc: 'pilgrim', at: [8, 14], face: 's' },
    { id: 'vesper-stall', kind: 'encounter', enc: 'vesper-stall', mode: 'block', at: [16, 13], face: 'w', talk: 'vesper' },
    { id: 'fr-deer-1', kind: 'prop', prop: 'deer', at: [16, 4], if: { flag: 'bell-rung' } },
    { id: 'fr-deer-2', kind: 'prop', prop: 'deer', at: [18, 6], if: { flag: 'bell-rung' } },
    { id: 'fr-offering', kind: 'chest', at: [3, 3], loot: { items: [{ rarity: 'storied', slot: 'amulet' }] }, lock: 'boulder' },
  ],
  exits: [
    // M5: the Highfold's scree path, opened from Peak's Veil's side (spec §2.4)
    { id: 'fr-highfold', area: [21, 9, 21, 10], to: 'highfold', anchor: 'from-fawnrest', gate: { flag: 'highfold-open' }, sealed: { region: 'ironspire', text: 'Fallen scree, and somewhere past it, a bell.', hint: 'The monks of Peak\'s Veil clear this path from above.' } },
    { id: 'fr-s', area: [10, 19, 11, 19], to: 'hindwood', anchor: 'from-fawnrest' },
  ],
  anchors: { 'from-hindwood': [11, 17, 'n'], 'from-highfold': [20, 9, 'w'] },
  roam: null,
});
