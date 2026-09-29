// The Blackwater Reach (M6 spec §2.1, §2.3), the lower channel from Misthollow to the Tidal Flats: wide black water
// between reed-banks, running west to the sea, with the ribs of sunk boats (the Leviathan's work) showing in it. A lane
// comes down from Misthollow's water-gate (NE) to the towpath, which follows the north bank west to the Flats (W). Near
// the lane a hull lies beached on the bank, and the Wreck Fire's pit is in it (34,4); below the towpath the gars hunt
// in the shallows, where another boat went down (30,8). Half-way the towpath crosses the mill creek on a plank bridge:
// the Tallymen have moored a barge at the creek mouth and run its chain across the bridge (23,5-6), and the bargehands
// stand on the bridge beside it (23,4). West of the creek the drowned mill stands in the water to its windows, and
// behind it lies the millpond, where Old Jaws waits; the only way out to him is the dock (12,3).
// Layout notes: the creek and the channel hold the barge's gate; the bargehands stand on the bridge beside the chain
// (a Brand's re-armed rematch stands beside an open road). The far bank is scrub and alders, out of reach.
// Tiles (channel): '.' sedge, ',' shingle, '"' reeds, '=' the towpath and the lane, 'b' the creek bridge, 'm' the
// mudbank, '~' the Blackwater, 'w' shallows (and the dock's water), 'T' alders, 't' scrub, 'o' snags and sunk ribs,
// '^' cut banks, '#' the mill's stone, 'H' its roof, '+' its door.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'blackwater-reach', name: 'The Blackwater Reach', region: 'gloomfen', biome: 'channel', music: 'fen',
  backdrop: 'blackwater-reach', zone: 'blackwater', level: 18, travel: true, dark: false,
  lore: [[322, 702, 40, 1], [245, 727, 34, 5], [180, 735, 1, 5]],
  w: 48, h: 26,
  rows: [
    'totTtTt~~~~~~~~~~~HHHHH~~otTTtTttTTttttT==TtttTt', //  0
    'T.T...T.~~~ww~~~~~HHHHHo~.,.,T...",.T...==.....t', //  1
    't...".,.~~~ww~~~~~##+##~o.T...",.T....t.==..T..T', //  2
    't",t.T..~~~~w~~~~~,....~~......t..."....==...t.T', //  3
    'T......,"".....t."."...bb".t........"...==.....t', //  4
    '=======================bb=================....Tt', //  5
    '=======================bb=================...."T', //  6
    '~T.~"".."...."......"."~m""wwwwwwwwwww~....T.."t', //  7
    '~~~~~~~"~~~~~~~~~~~,~~~~~~~wwwwwwwwwwww.."~~~~~~', //  8
    '~~~t~~~~~~~~~~~~~~~t~~~~~~~wwwwwwwwwwww~~~~~t~~~', //  9
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~wwwwwwwwww~~~~~~~~~~', // 10
    '~~~~~oo~~~~~~~~~~~~~~o~~~~~~~~~~~~~~~~~o~~~~~~~~', // 11
    '~~~~~~~oo~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~o~~~~o~~', // 12
    '~~~~~~~~~~~~~~oo~~~~~~~~~~~~~~~~~~~o~~~~~~~~~~~~', // 13
    '~~~~~~~~~~~~~~~~o~~~~~~~~~~oo~~~~~~~~~~~~~~~~~~~', // 14
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~o~~~~~~~~~~~~~~o~~~', // 15
    '~~~~~~~~~~o~t~~~~~o~~~~~~~~~~~~~~~~~~t~~~~~~~~~~', // 16
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 17
    '~~^^~~~~~~^o~~~~~~~^^~~~~~~~~~o^~~~~~~~~o^~~~~~~', // 18
    '^^tt^o~~^otto^^~~oott^^oo~~^ooot^~~~oo^ott^o~~oo', // 19
    'tttott^ottttttTTootttotot^otttttt~~^TTTTottto^tt', // 20
    'tTTTtttttotottTTTttttttotttttTTTt~~TTTTTtttttttt', // 21
    'TTTTttttTTTTttTTTTtoTTTTttotTTTTT~~TTTtttttTTTtt', // 22
    'tTTTtttTTTTTttttttttTTTTTtttTTTto~~tttotottTTTTt', // 23
    'tttttTTTTTttttttttttttTTTTTTttttt~~ttttTTTTTTTtt', // 24
    'tttttTTTtttttttottttttttTTTTttttt~~ttttTTTtttttt', // 25
  ],
  entities: [
    { id: 'br-milestone', kind: 'sign', at: [39, 4], look: 'stone', text: 'A towpath milestone: MISTHOLLOW 1, THE FLATS 2. Under the numbers someone has scratched a fish with far too many teeth.' },
    { id: 'wreck-fire', kind: 'hearthfire', at: [34, 4], stand: [34, 5, 'n'], cold: true },
    { id: 'br-gars', kind: 'encounter', enc: 'br-gars', mode: 'pack', at: [33, 9], face: 'n' },
    { id: 'br-sunk-boat', kind: 'prop', prop: 'wreck', at: [30, 8], solid: true },
    // M4.5 road gate (spec A3, §2.2): the barge moored at the creek mouth, its chain across the bridge, the bargehands beside it
    { id: 'br-barge-chain', kind: 'gate', area: [23, 5, 23, 6], look: 'chain', open: { beaten: 'br-barge' }, guard: 'br-barge', text: 'A Tallyman barge is moored at the creek mouth with its chain run across the bridge. TOWPATH CLOSED FOR COMPANY BUSINESS. The bargehands do not look busy.' },
    { id: 'br-barge', kind: 'encounter', enc: 'br-barge', mode: 'block', at: [23, 4], face: 'e' },
    { id: 'br-barge-hull', kind: 'prop', prop: 'barge', at: [24, 7], solid: true },
    { id: 'br-mill', kind: 'sign', at: [21, 3], look: 'post', text: 'The mill is drowned to its windows. When the channel runs hard its wheel still turns, and something in the millpond turns with it.' },
    // Old Jaws's millpond (GLOOM_LEADS.jaws), behind the dock
    { id: 'br-pond-dock', kind: 'lock', lock: 'blackwater', at: [12, 3] },
    { id: 'old-jaws', kind: 'encounter', enc: 'old-jaws', mode: 'lair', at: [12, 2], area: [11, 1, 12, 2], face: 's' },
    { id: 'br-drowned-punt', kind: 'prop', prop: 'wreck', at: [5, 7], solid: true },
  ],
  exits: [
    { id: 'br-n', area: [40, 0, 41, 0], to: 'misthollow', anchor: 'from-reach' },
    { id: 'br-w', area: [0, 5, 0, 6], to: 'tidal-flats', anchor: 'from-reach' },
  ],
  anchors: { 'from-misthollow': [40, 1, 's'], 'from-flats': [1, 5, 'e'] },
  roads: [{ from: 'from-misthollow', to: 'br-w', gates: ['br-barge-chain'] }],
  roam: { max: 3, rects: [[27, 7, 38, 10], [0, 3, 22, 7], [25, 1, 39, 4]] },
});
