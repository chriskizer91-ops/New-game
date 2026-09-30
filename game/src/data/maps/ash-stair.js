// The Ash Stair (M7 spec §2.1, §2.3): the hearth's roots, a stair down through drifted ash and glowing ember veins.
// STUB from the M7 scaffold: laid out roughly as §2.3 says from existing tiles, with the spec's exits, anchors, gate,
// Hearthfire and entity ids. P2 (maps) draws the `ash` biome's tiles and lays it out (then traces it from its batch-4
// painting); the backdrop is a stand-in until P6 paints the Stair's own.
//   the way in: the top edge, left of centre (as-up; from-hall below it)
//   the stair: 4 tiles wide, in switchbacks along the shaft's walls round the open drop ('x')
//   the first landing (the top third, east): the Under-Coal in its niche (cold)
//   the narrows just below it, 3 tiles between two iron roots ('Y'): the ash gate, held by the cinder-thralls
//   two wide landings, the middle one west and the lower one east, where the zone's patrols roam; the side ledge off
//   the middle landing holds the cache
//   the way on: the bottom edge (as-down; from-deep above it)
// Tiles (stand-ins): '#' walls, 'x' the drop, '_' the stair, ':' the landings, 'Y' the iron roots, 's' the stairs out.
// Format: src/data/maps/index.js. Owner: M7 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'ash-stair', name: 'The Ash Stair', region: 'below', biome: 'ash', music: 'dungeon',
  backdrop: 'scorchgate', zone: 'ash-stair', level: 22, travel: true, dark: false,
  lore: [[540, 390, 12, 18]],
  w: 24, h: 36,
  rows: [
    '########ss##############', //  0
    '#______________________#', //  1
    '#______________________#', //  2
    '#______________________#', //  3
    '#______________________#', //  4
    '#xxxxxxxxxxxxxx::::::::#', //  5
    '#xxxxxxxxxxxxxx::::::::#', //  6
    '#xxxxxxxxxxxxxx::::::::#', //  7
    '#xxxxxxxxxxxxxx::::::::#', //  8
    '#xxxxxxxxxxxxxx::::::::#', //  9
    '#xxxxxxxxxxxxxxxxxx____#', // 10
    '#xxxxxxxxxxxxxxxxxY___Y#', // 11
    '#xxxxxxxxxxxxxxxxxY___Y#', // 12
    '#xxxxxxxxxxxxxxxxxx____#', // 13
    '#:::xxxxxxxxxxxxxxx____#', // 14
    '#:::xxxxxxxxxxxxxxx____#', // 15
    '#:::xxxxxxxxxxxxxxx____#', // 16
    '#::::::::::____________#', // 17
    '#::::::::::____________#', // 18
    '#::::::::::____________#', // 19
    '#::::::::::____________#', // 20
    '#::::::::::xxxxxxxxxxxx#', // 21
    '#::::::::::xxxxxxxxxxxx#', // 22
    '#____xxxxxxxxxxxxxxxxxx#', // 23
    '#____xxxxxxxxxxxxxxxxxx#', // 24
    '#____xxxxxxxxxxxxxxxxxx#', // 25
    '#____xxxxxxxx::::::::::#', // 26
    '#____________::::::::::#', // 27
    '#____________::::::::::#', // 28
    '#____________::::::::::#', // 29
    '#____________::::::::::#', // 30
    '#xxxxxxxxxxxx::::::::::#', // 31
    '#xxxxxxxxxxxx::::::::::#', // 32
    '#xxxxxxxxxxxxxxxx______#', // 33
    '#xxxxxxxxxxxxxxxx______#', // 34
    '###################ss###', // 35
  ],
  entities: [
    { id: 'under-coal', kind: 'hearthfire', at: [21, 6], stand: [21, 7, 'n'], cold: true },
    { id: 'as-ash-gate', kind: 'gate', area: [19, 12, 21, 12], open: { beaten: 'as-thralls' }, guard: 'as-thralls',
      text: 'Ash drifted across the narrows between the iron roots, and the cinder-thralls standing in it. They were shaped from it.' },
    { id: 'as-thralls', kind: 'encounter', enc: 'as-thralls', mode: 'block', at: [20, 11], face: 'n' },
    { id: 'as-patrol', kind: 'encounter', enc: 'as-patrol', mode: 'pack', at: [5, 19], face: 'e' },
    { id: 'as-cache', kind: 'chest', at: [1, 14], loot: { gold: 160, items: [{ rarity: 'storied', slot: 'ring' }], materials: { scrap: 1, silver: 1 } } },
  ],
  exits: [
    { id: 'as-up', area: [8, 0, 9, 0], to: 'hollow-hall', anchor: 'from-ash' },
    { id: 'as-down', area: [19, 35, 20, 35], to: 'chained-deep', anchor: 'from-stair' },
  ],
  anchors: { 'from-hall': [8, 1, 's'], 'from-deep': [19, 34, 'n'] },
  roads: [{ from: 'from-hall', to: 'as-down', gates: ['as-ash-gate'] }],
  roam: { max: 3, rects: [[1, 17, 10, 22], [13, 26, 22, 32]] },
});
