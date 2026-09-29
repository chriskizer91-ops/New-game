// Rotbridge (M6 spec §2.1, §2.3), the one crossing of the Blackwater Channel: the black water runs wide and slow from
// north to south, and the old bridge crosses it from the east bank (the road from Willowmurk) to the west bank (the road
// to Bogmire): stone abutments with parapets at either end, a timber span between on two piers, each pier with a
// refuge either side; in one of them, the carved stone whose carvings will not keep still (20,12). On the east bank
// Hodge keeps his toll-house, his woodpile and the Toll-Lamp by the road (35,12); his striped bar is down across the
// east abutment (28,13-14), and Hodge sits on his stool beside it (29,12). On the bridge's far half Tamsin has shut
// the old gate at the head of the west abutment (11,13-14) and sits in the bay beside it (11,12). Below the bridge on
// the east side a gravel bar runs out into the shallows where the gars hunt, and at their far end, downstream, a
// black barge lies in the fog with its lamps dark (24,24), until the night it comes for Tamsin. On the west bank a
// jetty runs out to the ferry dock (13,20) and a reed islet with a chest beyond it. Up and downstream the channel has
// slumped the banks to mud, and alder and willow woods close in on both banks.
// Layout notes: the parapets hold both gates: the bar spans the east abutment, and Tamsin's bay is walled on its far
// side, so she never stands in the open road; after her fall she is gone for good (her encounter `leaves` on
// `tamsin-fallen`). Hodge's fight starts only from his toll dialogue: the `hodge` encounter is placed on his stool's
// tile but never stands on the map by itself (`if` any of nothing); the man on the stool is the NPC, and meeting him
// scouts his poster. The ferry dock is the only way to the islet. The shallows never touch the bridge.
// Tiles (channel): '.' sedge, ',' shingle, '"' reeds, '=' the roads, ':' the bridge's stone, 'b' its timber span and
// the jetty, '|' parapets, '~' the Blackwater, 'w' shallows (and the dock's water), 'm' mud banks, 'T' alders and
// willows, 't' scrub, nets on poles and the woodpile, 'o' snags, stumps and sunk ribs, '#' the toll-house's stone,
// 'H' its roof, '+' its door.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'rotbridge', name: 'Rotbridge', region: 'gloomfen', biome: 'channel', music: 'fen',
  backdrop: 'rotbridge', zone: null, level: 16, travel: true, dark: false,
  lore: [[170, 600, 20, 13]],
  w: 40, h: 28,
  rows: [
    'TttTTTTTT~~~~~~~~~~~~~~~~~~~~~~TtooToTTt', //  0
    'T...T.....~~~~~~~~~~~~~~~~~......T...,.T', //  1
    'tT......m~~~~~~~~~~~~~~~~~~~"T..,......t', //  2
    't......Tm~~~~~~~~~~~~~~~o~~~"......,.T.t', //  3
    'T.......m.~~~o~~~~~~~~~~~~~m.....,.....t', //  4
    'T....t.,m.~~~~~~~~~~~~~~~~~m....t......t', //  5
    'T.......T"~~~~~~~~~~~~~~~~"..T..,......T', //  6
    'T.T.......~~~~~~~~~o~~~~~~..,,........TT', //  7
    'o......."~~~~~~~~~~~~~~~~~~m.,.........t', //  8
    'T...,.T."~~~~~~~~~~~~~~~~~~m..HHHHH.,..T', //  9
    'T.........~~~~~~~~~~~~~~~~~...HHHHH....T', // 10
    'TT........~~~~~~~~~~~~~~~~~...#+###tt..t', // 11
    't.......|||::~~~:~~~:~~~~||||........,TT', // 12
    '========::::bbbbbbbbbbbbb::::===========', // 13
    '========::::bbbbbbbbbbbbb::::===========', // 14
    'o.t.==..||||~~~~:~~~:~~~~||||...,......o', // 15
    't...==.."~~~~~~~~~~~~~~~~~~".,....T...tT', // 16
    'T..T==.."~~~~~~~~~~~~~~~~~~"..t..,.....T', // 17
    'T...==..,~~~~~~""~~~~~wwww~,,,.........T', // 18
    'T...==...~~~~~".."~~~wwwwww,,,.......T,o', // 19
    't...==bbbbbbbw".."~~~wwwwww,,,...T.....T', // 20
    'T......."~~~~~".."~~~wwwwww,,,.........o', // 21
    'TT......"~~~~~~""~~~~wwwwww,,,,....t...T', // 22
    'o.....t.."~~~~~~~~~~~~wwwww,,,.........T', // 23
    'T......Tm"~~~~~~~~~~~~wwww~"......,.T..T', // 24
    'T.....,.m.~~o~~~~~~~~~~~~~~"...T.......T', // 25
    'T..T....m~~~~~~~~~o~~~~~~~m......,.....T', // 26
    'TtTTTTttT~~~~~~~~~~~~~~~~~~~~~~~TTtoTtTo', // 27
  ],
  entities: [
    { id: 'toll-lamp', kind: 'hearthfire', at: [35, 12], stand: [35, 13, 'n'] },
    { id: 'rb-toll-board', kind: 'sign', at: [30, 15], look: 'post', text: 'TOLL. What the day asks, the day gets. No credit. No haggling. NO TROLLS, whatever they tell you.' },
    // M4.5 road gate (spec A3, §2.2): Hodge's bar, down across the east abutment; he sits beside it
    { id: 'rb-toll-bar', kind: 'gate', area: [28, 13, 28, 14], look: 'toll-bar', open: { any: [{ flag: 'toll-paid' }, { beaten: 'hodge' }] }, text: 'A striped bar across the bridge, padlocked to the parapet. Hodge keeps the key, and Hodge keeps the bar, and Hodge would like a word.' },
    { id: 'rb-hodge', kind: 'npc', npc: 'hodge', at: [29, 12], face: 'w' },
    // his fight (GLOOM_LEADS.hodge) starts from his toll dialogue only ("Refuse, and make him move."), so it never
    // stands here by itself
    { id: 'hodge', kind: 'encounter', enc: 'hodge', mode: 'block', at: [29, 12], face: 'w', if: { any: [] } },
    { id: 'rb-carvings', kind: 'sign', at: [20, 12], look: 'stone', text: 'Carvings in the old stone: faces, hands, a river running through them. Look away and back, and the river has moved.' },
    // M4.5 road gate: the old gate at the head of the west abutment, shut; Tamsin sits in the bay beside it
    { id: 'rb-far-gate', kind: 'gate', area: [11, 13, 11, 14], look: 'gate', open: { any: [{ beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] }, guard: 'tamsin-rotbridge', text: 'The old bridge-gate is shut, and someone has wedged it with a boot-knife. Tamsin is sitting in the bay beside it with her feet in the fog.' },
    { id: 'tamsin-rotbridge', kind: 'encounter', enc: 'tamsin-rotbridge', mode: 'block', at: [11, 12], face: 'e', talk: 'tamsin-rotbridge' },
    { id: 'rb-signpost', kind: 'sign', at: [6, 12], look: 'post', text: 'BOGMIRE, west. WILLOWMURK, over the bridge. THE BRIDGE IS HODGE\'S.' },
    { id: 'rb-gars', kind: 'encounter', enc: 'rb-gars', mode: 'pack', at: [23, 20], face: 'n' },
    // the Unsmith's black barge, waiting downstream in the fog; it leaves with Tamsin (her fall, spec A12)
    { id: 'rb-black-barge', kind: 'prop', prop: 'black-barge', at: [24, 24], solid: true, if: { not: { flag: 'tamsin-fallen' } } },
    { id: 'rb-ferry-dock', kind: 'lock', lock: 'blackwater', at: [13, 20] },
    { id: 'rb-islet-cache', kind: 'chest', at: [16, 20], loot: { gold: 90, items: [{ rarity: 'runed', slot: 'feet' }], materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'rb-e', area: [39, 13, 39, 14], to: 'willowmurk', anchor: 'from-rotbridge' },
    { id: 'rb-w', area: [0, 13, 0, 14], to: 'bogmire', anchor: 'from-rotbridge' },
  ],
  anchors: { 'from-willowmurk': [38, 13, 'w'], 'from-bogmire': [1, 13, 'e'] },
  roads: [{ from: 'from-willowmurk', to: 'rb-w', gates: ['rb-toll-bar', 'rb-far-gate'] }],
  roam: { max: 2, rects: [[21, 18, 29, 24]] },
});
