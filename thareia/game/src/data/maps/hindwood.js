// The Hindwood (M3 spec §2.1, §2.3). Glades strung along a trail from Thornhollow (east, 31,34..35)
// to Fawnrest (north, 15..16,0). A stream crosses the wood from the escarpment, with a ford on the
// west route (the hunters' cairn, the glowcap ring) and a bridge on the east route (the Gloamwing's
// pale hollow). The escarpment walls the west side: the rope-ledge (1,8..9) is
// the only way up to Eldergrove (the ledge drop from Eldergrove kicks the rope down). The thornwall
// (27..28,7) is the only way into the rock alcove with the chest. The feral druid's camp (18,28) and
// the hinds' pool (SW) fill the south. Every entity sits at its spec coordinates except the cairn,
// moved 1 south to (10,25) so it touches its stand (10,26), and the glowcaps (below).
// M4.5 (docs/M45-SPEC.md §4): a rim of trees (row 10) closes the Gloamwing's hollow to the north, so
// the one way in is the east bridge, knotted shut with black root (26-27,21) and held by the glowcaps
// at its foot (25,22). The ford and the trail north to Fawnrest are open as before.
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'hindwood', name: 'The Hindwood', region: 'verdant', biome: 'wilds', music: 'wilds',
  backdrop: 'verdant-wood', zone: 'hindwood', level: 4, travel: true, dark: false,
  lore: [[320, 252, 31, 35], [365, 180, 15, 0]],
  w: 32, h: 40,
  rows: [
    'TTTTTTTTTTTTTTT==TTTTTTTTTTTTTTT', // 0
    'TTTTTTTTTTTTTT.==.TTTTTTTTTTTTTT', // 1
    '^^^TTTTTTTTTT..==..TTTTTTTTTTTTT', // 2
    '^^^TTTTTTTTT...==...TTTTTooooooT', // 3
    '^^^.TTTTTTT,...==....TTTTo,.,,oT', // 4
    '^^...TTTTTT,,..==.....TTTo.,,.oT', // 5
    '^^.....TTTT"...==..T...TTo,.,,oT', // 6
    '^^......TTT""..=........Too..ooT', // 7
    '==......TTT"..==.....t.......TTT', // 8
    '==........T...==.....t,.....TTTT', // 9
    '^^...o......===TTTTTTTtTTTtTTTTT', // 10
    '^^...,,f,f,.=...TTT.,,"",,,,.TTT', // 11
    '^^..,f,,,,,f=....TT.,,,,,"",.TTT', // 12
    '^^T.f,,,,,,,=,...TT.,,",,,,,TTTT', // 13
    '^^T..,,,,,,,=,...TT..,,,,,,.TTTT', // 14
    '^^T.f,,,,,,,=,..TTTT..,,,,..TTTT', // 15
    '^^T.,f,,,,,f=,.TTTTTT......TTTTT', // 16
    '^^TT..,f,f===..TTTTTTT.......TTT', // 17
    '^^^TT.....=.TTTTTTTTTTT..o...TTT', // 18
    '^^^TTT.......TTTTTTTTTTTT.....TT', // 19
    '^^^~~~~~~wwww~~~~~~~~~~~~~bb~~~~', // 20
    '^^^~~~~~~wwww~~~~~~~~~~~~~bb~~~~', // 21
    '^^TTTTTT...=.TTTTTTTTTTTT.....TT', // 22
    '^^TTTTTT...=..TTT...TTTT..t...TT', // 23
    '^TTTTTT.....o..T.......TTT....TT', // 24
    'TTTTTTT..o......,,o,,,..TT.....T', // 25
    'TTTTTTTT...o...,,,,,,,,,..T....T', // 26
    'TTTTTTTT..===..o,,,,,,,o...."..T', // 27
    'TTTTTTTT....=..,,,,,,,,,,..""..T', // 28
    'TTT.........=====,,,,,,,,......T', // 29
    'TT..............o,=,,,,........T', // 30
    'TT..mm....TTTTT..,=====..TT....T', // 31
    'TT.m~~m...TTTTTT......=...TT...T', // 32
    'TT.m~~m..TTTTTTTT.....=.....o..T', // 33
    'TT..mm...TTTTTTTTTTT..==========', // 34
    'TT......TTTTTTTTTTTTT.........==', // 35
    'TTT...TTTTTTTTTTTTTTTTT.......oo', // 36
    'TTTTTTTTTTTTTTTTTTTTTTTTT.....oT', // 37
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 38
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 39
  ],
  entities: [
    { id: 'gloamwing-hollow', kind: 'encounter', enc: 'gloamwing-hollow', mode: 'lair', at: [22, 12], face: 's', area: [21, 11, 23, 12] },
    { id: 'hindwood-cairn', kind: 'hearthfire', at: [10, 25], stand: [10, 26, 'n'], cold: true },
    // M4.5 road gate (docs/M45-SPEC.md §4): the Gloamwing's hollow is closed to the north by its rim of
    // trees (row 10), so the way in is over the east bridge, where black root has knotted across the
    // planks and the glowcaps stand at its foot
    { id: 'hw-bridge-knot', kind: 'gate', area: [26, 21, 27, 21], look: 'rot-knot', open: { beaten: 'hw-glowcaps' }, guard: 'hw-glowcaps', text: 'Black root has knotted across the bridge from rail to rail, and the mushrooms at its foot have all turned toward your light.' },
    { id: 'hw-glowcaps', kind: 'encounter', enc: 'hw-glowcaps', mode: 'block', at: [25, 22], face: 's' },
    { id: 'hw-druids', kind: 'encounter', enc: 'hw-druids', mode: 'pack', at: [18, 28], face: 's' },
    { id: 'hw-thorn-chest', kind: 'chest', at: [28, 6], loot: { items: [{ rarity: 'storied', unidentified: true }] } },
    { id: 'hw-thornwall', kind: 'lock', lock: 'thornwall', area: [27, 7, 28, 7] },
    { id: 'hw-rope', kind: 'lock', lock: 'rope-ledge', area: [1, 8, 1, 9] },
  ],
  exits: [
    { id: 'hw-se', area: [31, 34, 31, 35], to: 'thornhollow', anchor: 'from-hindwood' },
    { id: 'hw-n', area: [15, 0, 16, 0], to: 'fawnrest', anchor: 'from-hindwood' },
    { id: 'hw-w', area: [0, 8, 0, 9], to: 'eldergrove', anchor: 'from-hindwood' },
  ],
  anchors: { 'from-thornhollow': [29, 34, 'w'], 'from-fawnrest': [15, 2, 's'], 'from-eldergrove': [2, 8, 'e'] },
  roads: [{ from: 'from-thornhollow', to: 'gloamwing-hollow', gates: ['hw-bridge-knot'] }],
  roam: { max: 3, rects: [[2, 4, 30, 38]] },
});
