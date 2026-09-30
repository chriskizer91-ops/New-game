// Bogmire (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-bogmire.png), the stilt town:
// plank streets on piles over black water, weathered timber houses under thatch and patched shingles, rope rails and
// lanterns on poles. The big moot-hall stands top left; Mayor Gretch keeps its porch (9,7), at the head of the stair
// that comes down to the west street. The street runs east to the market square in the middle, four stalls round a
// plain centre where the Stilt Hearth burns (20,12), with the Bogmire board at its north edge (22,9). Plank roads leave
// the picture four ways: north up the north road to the Lanternfen; north-east along the boardwalk, past the
// Stilt-Watch at the gap in its rail by his hut (32,4), to the long boardwalk (E edge); south-east past a house on
// stilts to Rotbridge; and south from the square's south street, round the net shed, to the causeway (S edge: under
// the Blackwater until it falls). East of the square the net-mender's porch ends at the closed street (34,12), where the
// east quarter's stilts have rotted and its planks lie broken in the water. Widow Pell stands at the end of her porch,
// west, looking out over the water (2,12); Nettie at the door of her hut south-west (4,22), past the pier and its stair.
// Layout notes: no fight holds Bogmire; its roads run from the south-east road to the other three ways out. The square
// meets the boardwalk and the south-east road only by the lanes along its east rail. The Watch's porch behind him is
// solid, and so is the long house's railed front deck: nothing reaches them. A stair climbs from the boardwalk's head
// to the porch of the house north of the square.
// Traced from the painting (one tile is 36.6 of its px; `overTiles: false`). Tiles (stilt-town): '_' plank streets,
// porches, piers and stairs, ':' the market deck and the moot-hall's porch and stair, '+' doors, '~' black water, 'T'
// dead trees, '#' board walls, 'H' thatch and shingle roofs, '|' rails and fences (and the Watch's porch), '*' lanterns
// on poles, 't' stalls, crates, barrels and nets, 'o' piles and moored boats, 'x' the east quarter's broken planks.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3 (traced from the painting).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'bogmire', name: 'Bogmire', region: 'gloomfen', biome: 'stilt-town', music: 'town',
  backdrop: 'bogmire', zone: null, level: 16, travel: true, dark: false, overTiles: false,
  lore: [[280, 530, 21, 14]],
  w: 42, h: 28,
  rows: [
    '~~~~~TT~HH~~~~~~~~~__~~~~~~~~HHHHH~TTT~~~~', //  0
    'TTT~~TTHHHH~~H~~~~*__*HHHHH~~HHHHH~~~~~~~~', //  1
    'TTT|tHHHHHHHHHHt~~~__~HHHHH~~#####~~~~____', //  2
    '~TT|_HHHHHHHHHHt|||__~HHHHH~~~||t*~~____~~', //  3
    '~TT|_HHHHHHHHHHt_____*_+___|oo||_t___~~~~~', //  4
    '~~~|_##########t|||__~~~~~_~oo~~___~~~~~~~', //  5
    '~~~|_###+######t~~~__~~~~~_~~~___~~~~~~~~~', //  6
    '~~~|_::::::::::_~~~__~~~~~_____~~~~~~~~~~~', //  7
    '~~~~~~~~:|~~~~~_~~*__~~~~~__~~~~~~~~~~~~~~', //  8
    '~HHHHHH~:|~~~~~:ttt::::t::_~~HHHHHH~~~~~~~', //  9
    '~HHHHHH~:|~~~~~:ttt:::tt:|~~oHHHHHH~~~~~~~', // 10
    '~#####_________:tt::::tt:|~ot###+##xxxxxxx', // 11
    '~~_____________:::::::::::_________xxxxxxx', // 12
    '~~~~~~~~~~~~~~~:ttt:::::t:~~~~~~xxx~~~~~~~', // 13
    '~~~~~~~~~~~____:ttt:::ttt:~~~~~~xxxxxxxxxx', // 14
    '~~~~~~~~~~~____:ttt:::ttt:~~~~~~~~~xxxxxxx', // 15
    'HHHH~~~~~~~__~~|||||:||||:_~~~~~~~~~~~~~~~', // 16
    'HHHH~|||||~__~~~~~~~_~~~~~__~~~~HHHHHH~~~~', // 17
    'HHHHHHH~~____~~~~~~~_~~~~~~_____HHHHHH~~~~', // 18
    '####HHH____~~~~~~~~~___~~~~~~__tHHHHHH~~~~', // 19
    '||||HHH____~~~~~HHHHHH_t~~~~~~__##+###_~~~', // 20
    '~~~~###____~~~~~HHHHHH____~~~~~______t_~~~', // 21
    '~~~~_____~~~~~~~HHHHHHHHH__~~~~~~~~____~~~', // 22
    '~~~~~~~~~~~~~~~~HHHHHHHHH__~~~~~~~~~~~____', // 23
    '~~~~~~~~~~~~~~~~#########t_~~~~~~~~~~~~___', // 24
    '~~~~~~~~~~~~~~~~|||||||||~__~~~~~~~~~~~~~~', // 25
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~__~~~~~~~~~~~~~', // 26
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~__~~~~~~~~~~~~', // 27
  ],
  entities: [
    { id: 'stilt-hearth', kind: 'hearthfire', at: [20, 12], stand: [20, 13, 'n'] },
    { id: 'bm-board', kind: 'board', at: [22, 9], opens: 'bounties' },
    { id: 'gretch', kind: 'npc', npc: 'gretch', at: [9, 7], face: 's' },
    { id: 'nettie', kind: 'npc', npc: 'nettie', at: [4, 22], face: 'e' },
    { id: 'pell', kind: 'npc', npc: 'pell', at: [2, 12], face: 'w' },
    { id: 'bm-watch', kind: 'npc', npc: 'bm-watch', at: [32, 4], face: 's' },
    { id: 'bm-causeway-sign', kind: 'sign', at: [19, 15], look: 'post', text: 'THE CAUSEWAY, TO THE KEEP. Under the Blackwater since spring. DO NOT WADE.' },
    { id: 'bm-boardwalk-sign', kind: 'sign', at: [38, 2], look: 'post', text: 'THE LONG BOARDWALK, to Misthollow. Keep to the lamps, and count them as you go.' },
    { id: 'bm-closed', kind: 'sign', at: [34, 12], look: 'plaque', text: 'CLOSED. THE STILTS ARE ROTTEN. BY ORDER OF THE MAYOR. Under it, in another hand: AND OF THE MAYOR\'S COUSIN, WHO SANK THEM.' },
  ],
  exits: [
    { id: 'bm-rotbridge', area: [41, 23, 41, 24], to: 'rotbridge', anchor: 'from-bogmire' },
    { id: 'bm-causeway', area: [28, 27, 29, 27], to: 'causeway', anchor: 'from-bogmire', gate: { brand: 'brand-of-the-deep' }, sealed: { region: 'gloomfen', text: 'The causeway is under the Blackwater, and the Blackwater is moving.', hint: 'The causeway clears once the Blackwater falls.' } },
    { id: 'bm-lanternfen', area: [19, 0, 20, 0], to: 'lanternfen', anchor: 'from-bogmire' },
    { id: 'bm-boardwalk', area: [41, 2, 41, 2], to: 'long-boardwalk', anchor: 'from-bogmire' },
  ],
  anchors: { 'from-rotbridge': [40, 23, 'w'], 'from-causeway': [28, 26, 'n'], 'from-lanternfen': [19, 1, 's'], 'from-boardwalk': [40, 2, 'w'] },
  roads: [
    { from: 'from-rotbridge', to: 'bm-lanternfen', gates: [] }, { from: 'from-rotbridge', to: 'bm-boardwalk', gates: [] },
    { from: 'from-rotbridge', to: 'bm-causeway', gates: [] },
  ],
  roam: null,
});
