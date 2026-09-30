// A 12x9 test map in the §4.2 format, so the world engine can be tested without the real maps.
// Register it with rules/world.js registerMap(MINI) before use. It points at real encounter,
// dialogue and NPC ids. Owner: WP1.
//
//   x  0123456789AB
//   0  #####::#####   mini-n exit [5..6,0] -> keep-hall 'start', behind mini-gate [5..6,1]
//   1  #S........C#   S sign (1,1), C chest (10,1)
//   2  #...v......#   v one-way ledge (4,2)
//   3  #..P....L..#   P pack 'hearth-road' (3,3), L thornwall lock (8,3)
//   4  #.T........:   T tree (2,4), sealed exit mini-e (11,4)
//   5  #....a...B.#   a anchor 'start' (5,5), B block 'bramble-toll' (9,5)
//   6  #.N...t.ii.#   N npc fenwick (2,6), t step trigger (6,6), ii soft ichor lock [8..9,6]
//   7  #....b....H#   b anchor 'south' (5,7), H cold hearthfire 'mossfall-cairn' (10,7), stand (10,6)
//   8  #####::#####   mini-s exit [5..6,8] -> keep 'from-hall'
export const MINI = Object.freeze({
  id: 'mini', name: 'The Mini Map', region: 'verdant', biome: 'wilds', music: 'wilds', backdrop: 'verdant-wood',
  zone: null, level: 2, travel: true, dark: false, lore: [[300, 260, 6, 4]],
  w: 12, h: 9,
  rows: Object.freeze([
    '#####::#####',
    '#..........#',
    '#...v......#',
    '#..........#',
    '#.T........:',
    '#..........#',
    '#.......ii.#',
    '#..........#',
    '#####::#####',
  ]),
  entities: Object.freeze([
    { id: 'mini-gate', kind: 'gate', area: [5, 1, 6, 1], look: 'gate', open: { flag: 'mini-open' }, text: 'The gate is shut.' },
    { id: 'mini-sign', kind: 'sign', at: [1, 1], text: 'Mind the ledge.' },
    { id: 'mini-chest', kind: 'chest', at: [10, 1], loot: { gold: 5 } },
    { id: 'hearth-road', kind: 'encounter', enc: 'hearth-road', mode: 'pack', at: [3, 3], face: 's', leash: 2 },
    { id: 'mini-thorn', kind: 'lock', lock: 'thornwall', at: [8, 3] },
    { id: 'bramble-toll', kind: 'encounter', enc: 'bramble-toll', mode: 'block', at: [9, 5], face: 'w' },
    { id: 'mini-fenwick', kind: 'npc', npc: 'fenwick', at: [2, 6], face: 'e' },
    { id: 'mini-step', kind: 'trigger', area: [6, 6, 6, 6], on: 'step', once: true, dialogue: 'boots-clue' },
    { id: 'mini-ichor', kind: 'lock', lock: 'ichor', area: [8, 6, 9, 6] },
    { id: 'mossfall-cairn', kind: 'hearthfire', at: [10, 7], stand: [10, 6, 'n'], cold: true },
  ].map(e => Object.freeze(e))),
  exits: Object.freeze([
    { id: 'mini-n', area: [5, 0, 6, 0], to: 'keep-hall', anchor: 'start' },
    { id: 'mini-e', area: [11, 4, 11, 4], sealed: { region: 'gloomfen', text: 'Fog.' } },
    { id: 'mini-s', area: [5, 8, 6, 8], to: 'keep', anchor: 'from-hall' },
  ]),
  anchors: Object.freeze({ start: [5, 5, 'n'], south: [5, 7, 'n'] }),
  roam: Object.freeze({ max: 1, rects: [[1, 1, 10, 7]] }),
});

export default MINI;
