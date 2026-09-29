// Beneath Frostmere (M5 spec §2.1, §2.3), the caves of blue ice under the lake. The Tallymen's steps come
// down from the hole (10-11,0) onto a landing where a little daylight falls. The upper caves are walls
// and columns of blue ice, air pockets glowing in the floor and a pool of black water; three monks of
// Peak's Veil stand frozen in the ice where they stopped. South, the drowned chapel's wall crosses the
// cave: its door (9-11,9) is frozen shut, and the choir stands beside it (12,9), singing one note. In the
// chapel, its flagstones under a skin of ice, a vast shape lies under the floor, lit from within: Hush,
// asleep (10,13). At the altar end the Rime-Abbot, once Brother Aurel, stands before the altar (10,19;
// footprint x9-11, y18-19) facing the door; the Brand of Frost and Hush's scene play here.
// Layout notes: `dark` is the whole map (M3's soft darkness); the daylight at the landing and Hush's
// own glow are lights. The Abbot faces the door with eight clear rows in front of him, so his sprite (about
// five tiles tall) never covers Hush. The choir stands in the doorway beside the door, so a Brand's
// re-armed Echo stands beside an open door and never shuts the way back up to the hole.
// Tiles (ice-cave): 'R' walls of blue ice, 'k' the ice floor, 'Y' ice columns, 'f' glowing air pockets,
// '~' black water, 'o' ice boulders, '#' the drowned chapel's walls, ':' its flagstones, 's' the steps.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'frostmere-below', name: 'Beneath Frostmere', region: 'ironspire', biome: 'ice-cave', music: 'dungeon',
  backdrop: 'frostmere-below', zone: null, level: 17, travel: false, dark: true,
  lore: [[982, 112, 10, 12]],
  w: 22, h: 22,
  rows: [
    'RRRRRRRRRRssRRRRRRRRRR', //  0
    'RRRRRRRRR#kk#RRRRRRRRR', //  1
    'RRRRRRRkkkkkkkkRRRRRRR', //  2
    'RRRRRkkkkYkkYkokkRRRRR', //  3
    'RRRRkkkfkkkkkkfkkkRRRR', //  4
    'RRRkkYkkkk~~kkkkYkkRRR', //  5
    'RRRkkkkkkk~~kkkkkkkRRR', //  6
    'RRRRkfkkkkkkkkkfkkRRRR', //  7
    'RRRRRkkkkkkkkkkkkRRRRR', //  8
    'RRRRRR###kkkk###RRRRRR', //  9
    'RR#kkkk::::::::kkkk#RR', // 10
    'R#kkkY::::::::::Ykkk#R', // 11
    'R#kkk:::::::::::okkk#R', // 12
    'R#kfk::::::::::::kfk#R', // 13
    'R#kkkY::::::::::Ykkk#R', // 14
    'R#kkk::::::::::::kkk#R', // 15
    'R#kko::::::::::::kkk#R', // 16
    'R#kfkY::::::::::Ykfk#R', // 17
    'R#kkk::::::::::::kkk#R', // 18
    'RR#kk::::::::::::fk#RR', // 19
    'RRR#kk::::::::::kk#RRR', // 20
    'RRRR##############RRRR', // 21
  ],
  entities: [
    { id: 'fb-daylight', kind: 'light', at: [10, 1], radius: 3 },
    { id: 'fb-monk-1', kind: 'sign', at: [3, 6], look: 'frozen-monk', text: 'A monk of Peak\'s Veil, frozen upright in the ice wall with his hands folded. His eyes are open, and his lips are still moving.' },
    { id: 'fb-monk-2', kind: 'sign', at: [18, 6], look: 'frozen-monk', text: 'Another of them, younger, a novice\'s rope still knotted round his waist. He came down after his abbot.' },
    // M4.5 road gate (spec A3, §2.2): the drowned chapel's door, frozen shut, the choir in the doorway beside it
    { id: 'fb-chapel-door', kind: 'gate', area: [9, 9, 11, 9], look: 'door', open: { beaten: 'fb-choir' }, guard: 'fb-choir', text: 'The drowned chapel\'s door, frozen shut. The choir stands in the doorway beside it singing one note, over and over, and the ice sings it back.' },
    { id: 'fb-choir', kind: 'encounter', enc: 'fb-choir', mode: 'block', at: [12, 9], face: 'n' },
    { id: 'hush', kind: 'prop', prop: 'hush', at: [10, 13] },
    { id: 'fb-hush-glow', kind: 'light', at: [10, 13], radius: 4 },
    { id: 'fb-monk-3', kind: 'sign', at: [3, 15], look: 'frozen-monk', text: 'A monk frozen kneeling, facing the altar. The ice round him hums, very low, like something breathing out.' },
    { id: 'rime-abbot', kind: 'encounter', enc: 'rime-abbot', mode: 'lair', at: [10, 19], area: [9, 18, 11, 19], face: 'n' },
    { id: 'fb-altar', kind: 'sign', at: [10, 20], look: 'altar', text: 'The altar of the drowned chapel, rimed white. Cut into its front: WE WENT DOWN TO LISTEN. Under it, newer, in a shaking hand: IT IS LISTENING BACK.' },
    { id: 'fb-air-pocket', kind: 'chest', at: [15, 20], hidden: true, loot: { gold: 150, gems: { 'frost-opal': 1 }, materials: { embers: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'fb-up', area: [10, 0, 11, 0], to: 'frostmere', anchor: 'from-below' },
  ],
  anchors: { 'from-frostmere': [10, 1, 's'] },
  roads: [{ from: 'from-frostmere', to: 'rime-abbot', gates: ['fb-chapel-door'] }],
  roam: null,
});
