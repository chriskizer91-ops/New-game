// Bogmire (M6 spec §2.1, §2.3), the stilt town: plank streets on piles over black water, rope bridges, lanterns on
// poles. The main street runs from the west platforms to the head of the long boardwalk (E), where the Stilt-Watch
// keeps his post (31,10). North of it Mayor Gretch holds the moot-hall (19,9), and the north street climbs to the
// causeway's head, whose stones go down under the Blackwater (N: shut until the Blackwater falls); the duckboards to
// the Lanternfen leave from the north-east past a reed hummock, where the eastern bogs begin. South of the main street
// lies the market square with the Stilt Hearth (17,15) and the Bogmire board; west over a rope bridge, Nettie's hut of
// bottles and drying herbs (5,17); east, the closed street into the rotten quarter, where the stilts have gone and the
// huts sag into the water. A rope bridge drops to the south street and the east road in from Rotbridge (SE); Widow
// Pell's platform is south-west (7,25), with the net-mender's hut and the fishing jetty along the south.
// Layout notes: no fight holds Bogmire; its roads run from the east road to the other three ways out.
// Tiles (stilt-town): '_' plank streets and platforms, ':' the market deck, 'b' rope bridges and duckboards, '=' the
// east road's earth and the causeway's stones, '~' black water, 'm' slumped mud, '"' reeds, 'T' a dead tree,
// '#' board walls, 'H' tarred roofs, '+' doors, '|' the rail across the closed street, '*' lanterns on poles,
// 't' crates, nets and bottle racks, ',' Nettie's herb pots, 'o' bare piles, 'x' holes in the rotten planks.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'bogmire', name: 'Bogmire', region: 'gloomfen', biome: 'stilt-town', music: 'town',
  backdrop: 'bogmire', zone: null, level: 16, travel: true, dark: false,
  lore: [[280, 530, 17, 14]],
  w: 34, h: 28,
  rows: [
    '~~~~~~~~~~==~~~~~~~~~~~~~~bb~~~~~~', //  0
    '~~~~~~~o~~==~~o~~~~~~~~~~~bb~"""~~', //  1
    '~~~o~~~~~*==*~~~~~~o~~o~~~bb"""""~', //  2
    '~~~~~~~~______~~o~~~~~~~~~bb"mmm"~', //  3
    '~~~~~~~~______~~~~~~~~~~o~bb"mTm"~', //  4
    '~_HHH____~__*_HHHHHHHHt~~~bb"mmm"~', //  5
    'o_#+#____~__~_HHHHHHHH_~~~bb"mmm"~', //  6
    '~____HHH_~__~_HHHHHHHH_~~~bb"""""~', //  7
    '~____##+_~__~_###++###_~~~bb~"""~~', //  8
    'o________~__~__________~~~bb~____~', //  9
    '~t_______*__~_________t~~*bb*____*', // 10
    '~_________________________________', // 11
    '~_________________________________', // 12
    '~~~~~~~o~~~~*:::::::::*~~|xxHHHxx~', // 13
    '~_HHHH__~~~~~:::::::::~~~|xx###xo~', // 14
    '~_HHHH__~~~~~:::::::::~~~|xxxxxx~~', // 15
    'o_#+##,_bbbbb:::::::::___|xoxxHHxx', // 16
    '~_____,_~~~~~:::::::::___|xxx##Hxx', // 17
    '~_____,_o~~o~:::::::::~~~|~xxxxx#x', // 18
    'o_,,____~~~~~t:::::::t~o~|xHHHxx~~', // 19
    '~t____tt~~~~~~~~~b~~~~~~~|o###~o~~', // 20
    '~~~~~~~~*~~~~~o~*b~~o~~~~~~*~~m~m~', // 21
    '~~~~_________________________=====', // 22
    '~~~~_________________________=====', // 23
    '~~~_HHH___t~~_HHH_~~~bb~~~~~~~~~~~', // 24
    '~~~_#+#____~~_#+#t~~~bb~o~~~~o~~~~', // 25
    '~~~_______t~o_____~o~bt~~~o~~~~~o~', // 26
    '~~~~~~~~o~~~~~~~~~~~~~~~~~~~~~~~~~', // 27
  ],
  entities: [
    { id: 'stilt-hearth', kind: 'hearthfire', at: [17, 15], stand: [17, 16, 'n'] },
    { id: 'bm-board', kind: 'board', at: [14, 13], opens: 'bounties' },
    { id: 'gretch', kind: 'npc', npc: 'gretch', at: [19, 9], face: 's' },
    { id: 'nettie', kind: 'npc', npc: 'nettie', at: [5, 17], face: 'e' },
    { id: 'pell', kind: 'npc', npc: 'pell', at: [7, 25], face: 'w' },
    { id: 'bm-watch', kind: 'npc', npc: 'bm-watch', at: [31, 10], face: 's' },
    { id: 'bm-causeway-sign', kind: 'sign', at: [13, 3], look: 'post', text: 'THE CAUSEWAY, TO THE KEEP. Under the Blackwater since spring. DO NOT WADE.' },
    { id: 'bm-boardwalk-sign', kind: 'sign', at: [30, 9], look: 'post', text: 'THE LONG BOARDWALK, to Misthollow. Keep to the lamps, and count them as you go.' },
    { id: 'bm-closed', kind: 'sign', at: [24, 16], look: 'plaque', text: 'CLOSED. THE STILTS ARE ROTTEN. BY ORDER OF THE MAYOR. Under it, in another hand: AND OF THE MAYOR\'S COUSIN, WHO SANK THEM.' },
  ],
  exits: [
    { id: 'bm-rotbridge', area: [33, 22, 33, 23], to: 'rotbridge', anchor: 'from-bogmire' },
    { id: 'bm-causeway', area: [10, 0, 11, 0], to: 'causeway', anchor: 'from-bogmire', gate: { brand: 'brand-of-the-deep' }, sealed: { region: 'gloomfen', text: 'The causeway is under the Blackwater, and the Blackwater is moving.', hint: 'The causeway clears once the Blackwater falls.' } },
    { id: 'bm-lanternfen', area: [26, 0, 27, 0], to: 'lanternfen', anchor: 'from-bogmire' },
    { id: 'bm-boardwalk', area: [33, 11, 33, 12], to: 'long-boardwalk', anchor: 'from-bogmire' },
  ],
  anchors: { 'from-rotbridge': [32, 22, 'w'], 'from-causeway': [10, 1, 's'], 'from-lanternfen': [26, 1, 's'], 'from-boardwalk': [32, 11, 'w'] },
  roads: [
    { from: 'from-rotbridge', to: 'bm-lanternfen', gates: [] }, { from: 'from-rotbridge', to: 'bm-boardwalk', gates: [] },
    { from: 'from-rotbridge', to: 'bm-causeway', gates: [] },
  ],
  roam: null,
});
