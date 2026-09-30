// The Tidal Flats (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-tidal-flats.png).
// Where the Blackwater comes out over grey-brown mud and tide-pools into the shallow sea (W and S). A road of planks
// and packed mud comes in from the Reach at the east edge (44, 12-13) to the Tallymen's barge-camp in the middle:
// timber decks on piles, tarred sheds and tents, a crane, boats moored at its walks, and the camp's tall beacon, the
// Flats Beacon (its foot 18,8). The road runs west through the camp along one deck to where it meets the great chain
// (12,12); the Tallymen have chained the deck shut where its last arm leaves the camp (15,12), and the Bargemaster
// stands beside the chain at the head of the south walk (15,13). From the deck's end the chain runs west over the
// water to a post with a fire (1-2, 10-13), where the Leviathan is chained (3-5, 10-11). North and south of the camp
// the mud runs out to old wrecks: one sunk to its ribs in the north, and in the south a barge half swallowed by the
// mud, its hold still shut (28,21) past a stretch of soft mud.
// Layout notes: the deck, the piles and the sea hold the chain-post's gate (the Bargemaster beside it, off the road; a
// Brand's re-armed rematch stands beside an open road). The soft mud is a bog stretch, the only way to the hold.
// Traced from the painting (one tile is 34.1 of its px; `overTiles: false`). Tiles: '.' the mud, '=' the camp's yard
// and the packed-mud road, 'b' the plank road and the ladders, '_' the decks and walks, 'r' the great chain, 'm' the
// soft mud, 'w' tide-pools, '~' the sea, 't' crates, barrels and nets, 'o' rocks, piles, posts, the beacon's timbers
// and the wrecks' ribs, '#' hulls, the sheds' walls, the stone pier and the beacon's stone foot, 'H' tents and shed
// roofs, '|' the fences and the net frame.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'tidal-flats', name: 'The Tidal Flats', region: 'gloomfen', biome: 'mudflat', music: 'fen',
  backdrop: 'tidal-flats', zone: 'tidal-flats', level: 18, travel: true, dark: false, overTiles: false,
  lore: [[172, 742, 43, 12], [124, 754, 18, 9], [92, 760, 4, 11]],
  w: 45, h: 30,
  rows: [
    '~~~~~~~~~ooo~~oo~oooooooooooooooooooooooooooo', //  0
    '~~ooooo~oooo~~~~~oo.ww..o..........oooo...ooo', //  1
    '~~ooooo~ooo~o~~~~oo.ww..o.o.www...........ooo', //  2
    '~~ooooo~ooo~ooo~~ooo.....oo...ooooooo.....ooo', //  3
    '~~~~~~~~oooo~ooo~ooott..w...ooooooooo.....ooo', //  4
    'oooooooooooo~~~oooo___t.......ooooooo.....ooo', //  5
    'oooooooooooo~oooo##___o.......ooowwwwww...ooo', //  6
    '~~~~~oooo~~~~o~ot##__o...HH||||..wwwwwwww.ooo', //  7
    '~~~~~~~~~~~~~~ott____o...HHHHHH||wwwwowww.ooo', //  8
    '~~~~~~~~~~~~~~o_____HHHH.HHHHHH||wwwwwoow.ooo', //  9
    '~oo~~~~~~~~~ooo~_tt_HHHH_tttttt||.........ooo', // 10
    '~oorrrrrrrrr_ooo_tt_tttt_ttt##t__oooooooooooo', // 11
    '~oo~~~~~~~~r______________===bbbbbbbbb=======', // 12
    '~oo~~~~~....ooo__ooHHHHHHo==bbbbbbbbbb=======', // 13
    '~~~~~ooo....~~~__ooHHHHHHo__#boooooooooo..|||', // 14
    '~~~~~~ooo#####~__~~######o__..o....wwwwww.ooo', // 15
    '~~~~~~~~~#####~____tt####o__..o....wwwwww.ooo', // 16
    '~~oooo~~~#####~__________o....www..wwwwww.ooo', // 17
    '~~oooooo~#####~__~~~o.bo.omm..wwww.oo.....ooo', // 18
    'ooo~oooo~#####~__~~~......mm.wwwwwwoo....oooo', // 19
    'ooo~oooo~~~~~~___##~......mm#####ow......oooo', // 20
    '~~~~~~ooooo~~~~bb##~....oomm_#####o.oo.oooooo', // 21
    '~~~~~~ooooo~~~~~~~~~....ooo########oooooooooo', // 22
    '~~~~~~ooooo~~~~~~~~~.....www..######ooooooooo', // 23
    '~~ooo~~ooooo~~~~~.................ooooooo~~oo', // 24
    '~~ooo~~ooooo~~oooo~~~~~~~~ooo~~~~~oooooooooo~', // 25
    '~~~~~~~oooooooooooo~~~~~~~ooo~~~~~oooooooooo~', // 26
    '~~~~oo~oooooooooooo~~oooo~ooo~~~~~ooooooo~~~~', // 27
    '~~~~oo~~~oooooooooo~~oooo~~~~~~~~~ooooooo~~~~', // 28
    '~~~~~~~~~ooooo~oooo~~~~~~~~~~~~~~~ooooooo~~~~', // 29
  ],
  entities: [
    { id: 'flats-beacon', kind: 'hearthfire', at: [18, 8], stand: [18, 9, 'n'] },
    { id: 'tf-wreck-1', kind: 'sign', at: [31, 19], look: 'painted', name: 'The sunk barge', text: 'A barge lies half swallowed by the mud. Something took its stern off in one bite, and the Tallymen still have not come for the rest.' },
    { id: 'tf-wreck-2', kind: 'sign', at: [33, 6], look: 'painted', name: 'The old wreck', text: 'The ribs of a boat older than the Company stand up out of the mud, green with weed. The tide goes in and out through them twice a day, and the gulls sit on them and argue.' },
    { id: 'tf-post-plaque', kind: 'sign', at: [12, 11], look: 'plaque', text: 'Stamped into the chain-post: HAULAGE BY THE COMPANY. DO NOT FEED THE ENGINE.' },
    // M4.5 road gate (spec A3, §2.2): the deck chained shut where it runs out to the great chain, the Bargemaster beside it
    { id: 'tf-chain-post', kind: 'gate', area: [15, 12, 15, 12], look: 'chain', open: { beaten: 'tf-bargemaster' }, guard: 'tf-bargemaster', text: 'The great chain runs off the end of the camp\'s deck, and a gate of planks is shut across it. Out over the water the chain goes taut, and slack, and taut, like something breathing.' },
    { id: 'tf-bargemaster', kind: 'encounter', enc: 'tf-bargemaster', mode: 'block', at: [15, 13], face: 'e' },
    { id: 'blackwater-leviathan', kind: 'encounter', enc: 'blackwater-leviathan', mode: 'lair', at: [4, 11], area: [3, 10, 5, 11], face: 'e' },
    { id: 'tf-soft-mud', kind: 'lock', lock: 'bog', area: [26, 18, 27, 21] },
    { id: 'tf-wreck-hold', kind: 'chest', at: [28, 21], loot: { gold: 140, gems: { 'bog-amber': 1 }, materials: { scrap: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'tf-e', area: [44, 12, 44, 13], to: 'blackwater-reach', anchor: 'from-flats' },
  ],
  anchors: { 'from-reach': [43, 12, 'w'] },
  roads: [{ from: 'from-reach', to: 'blackwater-leviathan', gates: ['tf-chain-post'] }],
  roam: { max: 3, rects: [[20, 1, 41, 6], [26, 15, 40, 19], [33, 7, 41, 10]] },
});
