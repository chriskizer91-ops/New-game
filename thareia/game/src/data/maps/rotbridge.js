// Rotbridge (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-rotbridge.png), the one crossing
// of the Blackwater Channel. The black water runs wide and slow from north to south through the middle, and one old
// timber bridge on four stone piers crosses it from the east bank (the road from Willowmurk) to the west bank (the road
// to Bogmire); its deck is rows 8-9, and a carved stone stands on it over the middle pier (22,9). On the east bank
// Hodge's toll-house (dark timber, a slate roof) stands behind a low stone wall, and the road comes in from the east
// edge past its door, where the Toll-Lamp stands (37,8), to the bridge. Where the painter left the road plain at the
// bridge's east end, Hodge's striped bar is down across it (31,8-9), and Hodge sits on the verge beside it (32,8); his
// toll board stands at the bend (35,10). At the bridge's far (west) end Tamsin has shut the old gate (12,8-9) and sits
// on the parapet just east of it, her feet over the water (13,7). On the west bank the road runs on north-west to
// Bogmire past a walled garden, with a signpost by it (8,6), and a track runs down past a dead tree to a small jetty
// with a rowboat moored at its end: the ferry dock (14,17-19), black water between the boat and a reed islet with a
// willow and a chest (20,20). Below the bridge on the east side a rocky bank drops to mud flats and reeds, where the
// gars hunt in the shallows (28,15); at their south end, downstream, the black barge lies in the lily-pad shallows with
// its lamps dark (29,23), until the night it comes for Tamsin. Alders, willows and scrub close in on both banks.
// Traced from the painting (one tile is 36.6 of its px; `overTiles: false`). The bank north of the road on the east
// side (the toll-house's garden, the reeds above the bridge, the clearing behind the fence) is shut in by the low wall,
// the house and the fence, and the west bank's garden by its own walls: both are traced solid.
// Layout notes: the parapets (rows 7 and 10 along the span) hold both gates: the bar spans the road at the east end,
// and Tamsin sits in the one gap in the north parapet, between the span and the west bank's reeds, so she and her gate
// hold the bridge together and she never stands in the open road; after her fall she is gone for good (her encounter
// `leaves` on `tamsin-fallen`). Hodge's fight starts only from his toll dialogue: the `hodge` encounter is placed on
// his stool's tile but never stands on the map by itself (`if` any of nothing); the man on the stool is the NPC, and
// meeting him scouts his poster. The ferry dock is the only way to the islet: the lock covers the black water from the
// rowboat to the islet's reeds (a punt waits on each of its tiles once it opens), and the mud flats' shallows never
// reach the islet or the bridge.
// Tiles (channel): '.' sedge and grass, '"' reeds, '=' the road and the tracks, 'b' the bridge's timber deck, the jetty
// and the moored rowboat, '|' the bridge's parapets, the drystone walls and the fences, '~' the Blackwater, 'w'
// shallows (the gars' shallows, and the dock's water), 'm' mud flats, 'T' alders, willows and the dead trees' trunks,
// 't' scrub, bushes and the shut-in banks, 'o' rocks, snags and the fallen log, '#' the bridge's stone piers and
// abutments and the toll-house's walls, 'H' its slate roof.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'rotbridge', name: 'Rotbridge', region: 'gloomfen', biome: 'channel', music: 'fen',
  backdrop: 'rotbridge', zone: null, level: 16, travel: true, dark: false, overTiles: false,
  lore: [[170, 600, 21, 13]],
  w: 42, h: 28,
  rows: [
    'TTTTTTtttTTTT~~~~~~~~~~~~~~~oottTTTttTTTTT', //  0
    'TTT......TTTTT~~~~~~~~~~~~~~oottTTTtoTTTtt', //  1
    '|TT......TTTT"""~~~~~~~~~~~~oottTTTttTTttt', //  2
    't.|||T..oTTTT"""~~~~~~~~~~~~ootoHHHHHHottt', //  3
    '=====Tt......"""~~~~~~~~~~~~oottHHHHHHttoo', //  4
    '======......"""""~~~~~~~~~~~ttttHHHHHHttto', //  5
    '|t======.ot."""""~~~~~~~~~~~tttt####HH|ttt', //  6
    '|to=======..""|||||||||||||||||||#####|||t', //  7
    'tott|=======bbbbbbbbbbbbbbbbbbb=....|=||||', //  8
    'ttt||=======bbbbbbbbbbbbbbbbbbb=======||||', //  9
    '||====tttt##||||||||||||||||||#||||.======', // 10
    't====.tttt###~##~~##~~##~~~#~"oooot|......', // 11
    'TT===ott.."""~##~~##~~##~~~#~""oooo|...ttt', // 12
    'TTT===||.o"""~~~~~~~~~~~~~~~w"ooooo....ttt', // 13
    'TTT=====bb"""~~~~~~~~~~~~~~~wmo"ooo....ttt', // 14
    'TTT.to.bbbbbb~~~~~~~~~~~~~~wmm"""oo"......', // 15
    'ttttoo."~~~bbb~~~~~~~~~~~~~wm""""m"""oo...', // 16
    'tttt...""~~~~bw~~~~~TTTT~~~wmm"""m""".....', // 17
    'ttttooo"""~~~~w~~wwwTTTT~~~~wmmmmmoo......', // 18
    'ttttooo"""~~~~w~~w..TTTTo~~~wwmmmoo.....oo', // 19
    'tttoo.."""~~~~"""".....oo~~~~wwoommmm...oo', // 20
    'tttoo.o""~~~~~"""".....oo~~~~~wmmmm""""...', // 21
    'tttoooo""m~~~~~~~""""""""~~~~~wwoom""""ttt', // 22
    'tttoooommm""~~~~~"""""""~~~~~wwwmmm""""ttt', // 23
    'TTTTottttt""""""~~~~~~~~~~~~~~~~wmm""""ttt', // 24
    'TTTTtttttt..."""~~~~~~~~~~~~~~~~wmmmoo"ttt', // 25
    'TTTTtttttt..."""~~~~~~~~~~~~~~~~~wmm"""ttt', // 26
    'TTTTtttttttttt~~~~~~~~~~~~~~~~~~~~tttttttt', // 27
  ],
  entities: [
    { id: 'toll-lamp', kind: 'hearthfire', at: [37, 8], stand: [37, 9, 'n'] },
    { id: 'rb-toll-board', kind: 'sign', at: [35, 10], look: 'post', text: 'TOLL. What the day asks, the day gets. No credit. No haggling. NO TROLLS, whatever they tell you.' },
    // M4.5 road gate (spec A3, §2.2): Hodge's bar, down across the road at the bridge's east end; he sits beside it
    { id: 'rb-toll-bar', kind: 'gate', area: [31, 8, 31, 9], look: 'toll-bar', open: { any: [{ flag: 'toll-paid' }, { beaten: 'hodge' }] }, text: 'A striped bar across the bridge, padlocked to the parapet. Hodge keeps the key, and Hodge keeps the bar, and Hodge would like a word.' },
    { id: 'rb-hodge', kind: 'npc', npc: 'hodge', at: [32, 8], face: 'w' },
    // his fight (GLOOM_LEADS.hodge) starts from his toll dialogue only ("Refuse, and make him move."), so it never
    // stands here by itself
    { id: 'hodge', kind: 'encounter', enc: 'hodge', mode: 'block', at: [32, 8], face: 'w', if: { any: [] } },
    { id: 'rb-carvings', kind: 'sign', at: [22, 9], look: 'stone', text: 'Carvings in the old stone: faces, hands, a river running through them. Look away and back, and the river has moved.' },
    // M4.5 road gate: the old gate at the bridge's west end, shut; Tamsin sits on the parapet beside it
    { id: 'rb-far-gate', kind: 'gate', area: [12, 8, 12, 9], look: 'gate', open: { any: [{ beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] }, guard: 'tamsin-rotbridge', text: 'The old bridge-gate is shut, and someone has wedged it with a boot-knife. Tamsin is sitting in the bay beside it with her feet in the fog.' },
    { id: 'tamsin-rotbridge', kind: 'encounter', enc: 'tamsin-rotbridge', mode: 'block', at: [13, 7], face: 'e', talk: 'tamsin-rotbridge' },
    { id: 'rb-signpost', kind: 'sign', at: [8, 6], look: 'post', text: 'BOGMIRE, west. WILLOWMURK, over the bridge. THE BRIDGE IS HODGE\'S.' },
    { id: 'rb-gars', kind: 'encounter', enc: 'rb-gars', mode: 'pack', at: [28, 15], face: 'n' },
    // the Unsmith's black barge, waiting downstream in the fog; it leaves with Tamsin (her fall, spec A12)
    { id: 'rb-black-barge', kind: 'prop', prop: 'black-barge', at: [29, 23], solid: true, if: { not: { flag: 'tamsin-fallen' } } },
    { id: 'rb-ferry-dock', kind: 'lock', lock: 'blackwater', area: [14, 17, 14, 19] },
    { id: 'rb-islet-cache', kind: 'chest', at: [20, 20], loot: { gold: 90, items: [{ rarity: 'runed', slot: 'feet' }], materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'rb-e', area: [41, 10, 41, 11], to: 'willowmurk', anchor: 'from-rotbridge' },
    { id: 'rb-w', area: [0, 4, 0, 5], to: 'bogmire', anchor: 'from-rotbridge' },
  ],
  anchors: { 'from-willowmurk': [40, 10, 'w'], 'from-bogmire': [1, 4, 'e'] },
  roads: [{ from: 'from-willowmurk', to: 'rb-w', gates: ['rb-toll-bar', 'rb-far-gate'] }],
  roam: { max: 2, rects: [[28, 14, 34, 21]] },
});
