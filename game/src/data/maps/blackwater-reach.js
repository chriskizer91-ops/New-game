// The Blackwater Reach (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-blackwater-reach.png).
// The lower channel between Misthollow and the Tidal Flats: the black water fills the middle of the map, running west
// to the sea, with the ribs of sunk boats (the Leviathan's work) showing in it. Along the north bank the towpath comes
// in from Misthollow at the east edge (44, 7-8) and runs west to the Flats (0, 1-2). Near the middle a boat hull lies
// beached on the bank, and the Wreck Fire's pit is in it (27,8). East of the hull a gap in the fence (34,6) opens on a
// dark pool in the reeds, where Old Jaws waits (33-34, 3-4); the only way out to him is the dock at the pool's edge
// (34,5). West, the drowned mill stands at the water's edge with its wheel in the channel. The Tallymen have moored a
// barge at the mill's landing (18,10) and run its chain across the towpath where it squeezes past the mill's roof
// (10, 2-3); the bargehands stand on the verge beside it (10,1). Below the towpath the gars hunt in the reeds, and a
// spit of stones runs out into the channel (29-31, 10-14) towards the sunk boats. The far bank (reed-beds, willows, a
// pool) is out of reach.
// Layout notes: the mill's roof and the top edge hold the barge's gate (the bargehands beside it; a Brand's re-armed
// rematch stands beside an open road).
// Traced from the painting (one tile is 34.1 of its px; `overTiles: false`). Tiles: '=' the towpath, '.' sedge and
// grass, '"' reeds, ',' the spit's stones and the trodden earth by the hull, 'b' the mill's landing and the east jetty,
// 'w' the pool's shallows, its dock and the water at the landing, '~' the Blackwater and the pools, 'T' willows, 't' bushes,
// scrub and the reed-beds out of reach, 'o' rocks, posts, the beached hull, the waterwheel and the sunk boats' timbers,
// '#' the mill's stone and its ruined outbuilding, 'H' its roof, '|' the fences and dry-stone walls along the towpath.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'blackwater-reach', name: 'The Blackwater Reach', region: 'gloomfen', biome: 'channel', music: 'fen',
  backdrop: 'blackwater-reach', zone: 'blackwater', level: 18, travel: true, dark: false, overTiles: false,
  lore: [[322, 702, 43, 8], [245, 727, 27, 9], [180, 735, 1, 1]],
  w: 45, h: 30,
  rows: [
    'tttttootttttTTTtttttTTTTttTTTToottttttTTTTTtt', //  0
    '=======o.....TT.ttttTTTTttTTTTtootottttTTTTtt', //  1
    '....=======..o..tttooTTTttTTTTtt~~~~~~tTTTttt', //  2
    'o.......HH=======too|||||||otttt~ww~~~~"""ooo', //  3
    'o##||#|HHHH##=========.||||otttt~ww~~~~"""oot', //  4
    't#|||#HHHHH#####.============.||.~w.........o', //  5
    't#ttt###########.o....===o====...|.||||||||||', //  6
    'ttttt###########ooo......oooo================', //  7
    'tttt###oooo#####bbbb"""""oo,oo===============', //  8
    '~~~~##~oooo#~~##bbbb""""",,,,,o||...........t', //  9
    '~~~~~~~oooo~~~~~~~w~""""""o..,,".....o......t', // 10
    '~~~~~~~~~~~~~~~~~~~~~"""""""",,,""""o""bbbbbo', // 11
    '~~~~~~~~~~~~~~~~~~~~~~~~~"""",,,"""~~~~~~~~~~', // 12
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~,,,~~~~~~~~~~~~~', // 13
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~,ooo~~~~~~~~~~~', // 14
    'ttto~~~oo~~~~~~~~~~ooooooooo~~~ooo~~~~ooooo~~', // 15
    'tttttt~~~~~o~~~~~~~~oooooooo~~~~~~~~~~oooooo~', // 16
    'ttttttTTTTTo~~~~~~~~oooooooooo~~~~~~~~oooooo~', // 17
    'ttttTTTTTTTttt~~~~~~~~~~~~~oooo~~~~~~~~~~~~~~', // 18
    'ttttTTTTTTTttttttttt~~~~~~~~~~~~~~~~~~~~~~~~~', // 19
    'ttttTTTTTTTttttttttt~~~~~~~~~~ttt~~~~~~~~~~~~', // 20
    'ttttTTTTTTTttttTTTTTttttttttttoootttttttttttt', // 21
    'ttttTTTTTTToottTTTTTttTTTtttttoootttttttttttt', // 22
    'ttttTTTTTTTotttTTTTTTTTTTtttttttttttttttttttt', // 23
    'ttttttTTTTttttttTTTTTTTTTTttttttttttttttttttt', // 24
    'tttttttttt~~~~oottttTTTTTtttttttttttoooootttt', // 25
    'tttttttttt~~~~~tttttTTTTTttttttttttttooootttt', // 26
    'tttttttttt~~~~~tttttTTTTTttttttttttttttootttt', // 27
    'tttttttttt~~~~~tttttttttttttttttttttttttttttt', // 28
    'tttttttttt~~~~~tttttttttttttttttttttttttttttt', // 29
  ],
  entities: [
    { id: 'br-milestone', kind: 'sign', at: [42, 9], look: 'stone', text: 'A towpath milestone: MISTHOLLOW 1, THE FLATS 2. Under the numbers someone has scratched a fish with far too many teeth.' },
    { id: 'wreck-fire', kind: 'hearthfire', at: [27, 8], stand: [27, 9, 'n'], cold: true },
    { id: 'br-gars', kind: 'encounter', enc: 'br-gars', mode: 'pack', at: [33, 11], face: 'n' },
    { id: 'br-sunk-boat', kind: 'sign', at: [30, 14], look: 'painted', name: 'The sunk boats', text: 'Boats lie on the bottom of the Reach all along here, and every one of them was holed from below. The Tallymen moor well clear of them.' },
    // M4.5 road gate (spec A3, §2.2): the barge moored at the mill's landing, its chain across the towpath at the mill's corner, the bargehands beside it
    { id: 'br-barge-chain', kind: 'gate', area: [10, 2, 10, 3], look: 'chain', open: { beaten: 'br-barge' }, guard: 'br-barge', text: 'A Tallyman barge is moored at the mill\'s landing, and its chain is run across the towpath. TOWPATH CLOSED FOR COMPANY BUSINESS. The bargehands do not look busy.' },
    { id: 'br-barge', kind: 'encounter', enc: 'br-barge', mode: 'block', at: [10, 1], face: 'e' },
    { id: 'br-barge-hull', kind: 'prop', prop: 'barge', at: [18, 10], solid: true },
    { id: 'br-mill', kind: 'sign', at: [16, 6], look: 'post', text: 'The old mill leans out over the channel with half its roof gone. When the water runs hard its wheel still turns, and something under the wheel turns with it.' },
    // Old Jaws's pool (GLOOM_LEADS.jaws), behind the dock
    { id: 'br-pond-dock', kind: 'lock', lock: 'blackwater', at: [34, 5] },
    { id: 'old-jaws', kind: 'encounter', enc: 'old-jaws', mode: 'lair', at: [34, 4], area: [33, 3, 34, 4], face: 's' },
  ],
  exits: [
    { id: 'br-n', area: [44, 7, 44, 8], to: 'misthollow', anchor: 'from-reach' },
    { id: 'br-w', area: [0, 1, 0, 2], to: 'tidal-flats', anchor: 'from-reach' },
  ],
  anchors: { 'from-misthollow': [43, 8, 'w'], 'from-flats': [1, 1, 'e'] },
  roads: [{ from: 'from-misthollow', to: 'br-w', gates: ['br-barge-chain'] }],
  roam: { max: 3, rects: [[11, 1, 22, 5], [19, 5, 30, 11], [31, 7, 43, 11]] },
});
