// The Drowned Belfry (M6 spec §2.1, §2.3), the bell-hall under Misthollow, dark (`dark: true`). The stair comes down from
// the sunken belltower (S) into the narthex, and the nave runs north between two rows of pillars, its aisles flooded
// green, bells hanging low over the water and air pockets glowing along the walls. In the middle of the nave's floor a
// brass plaque asks you to sing soft (10,18), and under the floor there is a shape, and a slow light that comes and goes:
// the Sleeper (10,15). The choir screen crosses the nave, its gate shut, the drowned choir at it (12,11); behind it the
// choir-stalls and the alms box, and beyond them the apse, where the Drowned Cantor keeps time (9-11,4-5).
// Layout notes: the screen's gate is the only way into the choir and the apse (GLOOM_LEADS.cantor: the choir, then the
// Cantor); the choir stands in the opening beside it.
// Tiles (belfry): 'k' the bell-hall's floor, ':' the narthex's and the apse's flagstones, '_' the choir's floorboards,
// 'w' flooded floor, '~' the sunken aisles' deep water, 'f' air pockets, 't' the choir-stalls, 'Y' pillars, '#' walls,
// 's' the stair up.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

const bell = (id, at) => ({ id, kind: 'prop', prop: 'bell', at, solid: true });
const glow = (id, at, radius = 2) => ({ id, kind: 'light', at, radius });

export default deepFreeze({
  id: 'drowned-belfry', name: 'The Drowned Belfry', region: 'gloomfen', biome: 'belfry', music: 'dungeon',
  backdrop: 'drowned-belfry', zone: null, level: 18, travel: false, dark: true,
  lore: [[330, 690, 10, 10]],
  w: 22, h: 24,
  rows: [
    '######################', //  0
    '######################', //  1
    '####~~kkkkkkkkkk~~####', //  2
    '###~~kk::::::::kk~~###', //  3
    '###~wk::::::::::kw~###', //  4
    '###~wk::::::::::kw~###', //  5
    '###~wwk::::::::kww~###', //  6
    '####wwkkkkkkkkkkww####', //  7
    '####ttt________ttt####', //  8
    '####ttt________ttt####', //  9
    '####ttt________ttt####', // 10
    '##Y######kkkk######Y##', // 11
    '##~~wwYkkkkkkkkYww~~##', // 12
    '##~wwwwkkkkkkkkwwwww##', // 13
    '##~wfwYkkkkkkkkYwfww##', // 14
    '##~wwwwkkkkkkkkwwww~##', // 15
    '##~~wwYkkkkkkkkYwww~##', // 16
    '##~wwwwkkkkkkkkwwfw~##', // 17
    '##~wfwYkkkkkkkkYwww~##', // 18
    '###wwwwkkkkkkkkwwww###', // 19
    '#####Y#kk::::kk#Y#####', // 20
    '#######kk::::kk#######', // 21
    '########k:ss:k########', // 22
    '##########ss##########', // 23
  ],
  entities: [
    bell('db-bell-1', [4, 13]), bell('db-bell-2', [18, 13]), bell('db-bell-3', [5, 16]), bell('db-bell-4', [17, 16]),
    glow('db-air-1', [4, 14]), glow('db-air-2', [17, 14]), glow('db-air-3', [17, 17]), glow('db-air-4', [4, 18]),
    { id: 'db-plaque', kind: 'sign', at: [10, 18], look: 'plaque', text: 'A brass plaque in the floor, green with age: THE CHOIR KEEPS ITS WATCH HERE. SING SOFT.' },
    // the Sleeper, under the floor (a prop the scene after the Brand of the Deep uses)
    { id: 'sleeper', kind: 'prop', prop: 'sleeper', at: [10, 15] },
    // M4.5 road gate (spec A3, §2.2): the choir screen's gate, the drowned choir in the opening beside it
    { id: 'db-choir-screen', kind: 'gate', area: [9, 11, 11, 11], look: 'choir-screen', open: { beaten: 'db-choir' }, guard: 'db-choir', text: 'The choir screen\'s gate is shut, and the drowned choir stands at it in rows, mouths open. There is no sound. Then there is.' },
    { id: 'db-choir', kind: 'encounter', enc: 'db-choir', mode: 'block', at: [12, 11], face: 's' },
    { id: 'db-alms', kind: 'chest', at: [14, 9], loot: { gold: 110, gems: { 'glass-pearl': 1 }, materials: { silver: 1 } } },
    glow('db-apse-light', [10, 3], 4),
    { id: 'cantor', kind: 'encounter', enc: 'cantor', mode: 'lair', at: [10, 5], area: [9, 4, 11, 5], face: 's' },
  ],
  exits: [
    { id: 'db-up', area: [10, 23, 11, 23], to: 'misthollow', anchor: 'from-belfry' },
  ],
  anchors: { 'from-misthollow': [10, 22, 'n'] },
  roads: [{ from: 'from-misthollow', to: 'cantor', gates: ['db-choir-screen'] }],
  roam: null,
});
