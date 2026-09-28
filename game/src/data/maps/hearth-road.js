// The Hearth Road North (M3 spec §2.1, §2.3). The causeway bridge over the lake (rows 62-69, A2), then the road north; the millrace and Poacher's Holm to the east, the Smugglers' Hollow to the west.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'hearth-road', name: 'The Hearth Road North', region: 'verdant', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: 'hearth-road', level: 2, travel: true, dark: false,
  lore: [[520, 375, 13, 69], [325, 268, 12, 0]],
  w: 26, h: 70,
  rows: [
    'TTTTTTTTTTT===TTTTTTTTTTTT', // 0
    'T..........===...........T', // 1
    'T..........===...........T', // 2
    'T..........===...........T', // 3
    'T..........===...........T', // 4
    'T..........===...........T', // 5
    'T..........===...........T', // 6
    'T..........===...........T', // 7
    'T..........===...........T', // 8
    'T..........===...,.......T', // 9
    'T..........===...........T', // 10
    'T..........===.......,...T', // 11
    'T..........===...........T', // 12
    'T..........===...........T', // 13
    'T..........===...........T', // 14
    'T..........===...........T', // 15
    'T..........===........,..T', // 16
    'T..........===...........T', // 17
    'T..........===...........T', // 18
    'T..........===....,......T', // 19
    'T..........===...........T', // 20
    'T..........===...........T', // 21
    'T..........===...........T', // 22
    'T..........===...........T', // 23
    'Tttttttt...===...........T', // 24
    'T......t...===...........T', // 25
    'T......t...===...........T', // 26
    'T......t...===...........T', // 27
    'T......t...===...........T', // 28
    'T......t...===...........T', // 29
    'T..........===...........T', // 30
    'T..........===...........T', // 31
    'T......t...===...........T', // 32
    'T......t...===...........T', // 33
    'T......t...===...........T', // 34
    'T......t...===...........T', // 35
    'Tttttttt...===...........T', // 36
    'T..........===...........T', // 37
    'T..........===...........T', // 38
    'T..........===...........T', // 39
    'T..........===.....~~....T', // 40
    'T...........===....~~....T', // 41
    'T...........===....~~....T', // 42
    'T...........===....~~....T', // 43
    'T...........===....~~....T', // 44
    'T...........===....~~....T', // 45
    'T...........===....~~....T', // 46
    'T...........===....~~....T', // 47
    'T...........===....~~....T', // 48
    'T.........o.===....~~....T', // 49
    'T...........===....ww....T', // 50
    'T......o...o===....~~....T', // 51
    'T...........===....~~....T', // 52
    'T.......o...===....~~....T', // 53
    'T...........===....~~....T', // 54
    'T...........===....~~....T', // 55
    'T...........===....~~....T', // 56
    'T...........===....~~....T', // 57
    'T...........===....~~....T', // 58
    'T...........===....~~....T', // 59
    'T...........===....~~....T', // 60
    'T...........===..........T', // 61
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 62
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 63
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 64
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 65
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 66
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 67
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 68
    '~~~~~~~~~~~bbbbb~~~~~~~~~~', // 69
  ],
  entities: [
    { id: 'hearth-road', kind: 'encounter', enc: 'hearth-road', mode: 'pack', at: [12, 60], face: 's', leash: 4 },
    { id: 'waymarker-stones', kind: 'encounter', enc: 'waymarker-stones', mode: 'pack', at: [9, 50], face: 's' },
    { id: 'verdant-edge', kind: 'encounter', enc: 'verdant-edge', mode: 'pack', at: [13, 22], face: 's' },
    { id: 'milestone-fire', kind: 'hearthfire', at: [15, 42], stand: [15, 44, 'n'] },
    { id: 'bramble-toll-chain', kind: 'gate', area: [11, 32, 13, 32], look: 'chain', open: { unlocked: 'bramble-toll-chain' }, guard: 'bramble-toll', text: 'A chain across the road, and a toll-house with a Thornwatch hood in the window.' },
    { id: 'bramble-toll', kind: 'encounter', enc: 'bramble-toll', mode: 'block', at: [16, 31], face: 'w' },
    { id: 'rotstag-glade', kind: 'encounter', enc: 'rotstag-glade', mode: 'lair', at: [20, 13], face: 'w' },
    { id: 'poachers-holm', kind: 'encounter', enc: 'poachers-holm', mode: 'lair', at: [23, 50], face: 'w' },
    { id: 'hr-millrace-ford', kind: 'lock', lock: 'stream', area: [19, 50, 20, 50] },
    { id: 'hr-hollow-bramble', kind: 'lock', lock: 'bramble', area: [7, 30, 7, 31] },
    { id: 'hr-smugglers', kind: 'encounter', enc: 'hr-smugglers', mode: 'block', at: [3, 30], face: 'e' },
    { id: 'hr-ditch', kind: 'chest', at: [8, 58], loot: { gold: 30, bag: { 'hearth-tonic': 2 } } },
    { id: 'hr-glade-chest', kind: 'chest', at: [24, 9], loot: { items: [{ rarity: 'tempered', slot: 'weapon' }] } },
    { id: 'hr-glade-wall', kind: 'lock', lock: 'thornwall', area: [23, 10, 24, 10] },
    { id: 'hr-boulder-chest', kind: 'chest', at: [2, 46], loot: { gold: 60, bag: { 'frost-draught': 2 } } },
    { id: 'hr-boulder', kind: 'lock', lock: 'boulder', at: [3, 46] },
    { id: 'hr-tenth-waymarker', kind: 'sign', at: [8, 48], text: 'The tenth waymarker. The old road only ever had nine, and this one points at the Keep.' },
  ],
  exits: [
    { id: 'hr-s', area: [12, 69, 14, 69], to: 'keep', anchor: 'from-road' },
    { id: 'hr-n', area: [11, 0, 13, 0], to: 'thornhollow', anchor: 'from-road' },
  ],
  anchors: { 'from-keep': [13, 67, 'n'], 'from-thornhollow': [12, 2, 's'], 'v1:hearth-road': [13, 64, 'n'], 'v1:waymarker-stones': [12, 54, 'n'], 'v1:milestone-fire': [15, 44, 'n'], 'v1:bramble-toll': [12, 35, 'n'], 'v1:verdant-edge': [13, 26, 'n'], 'v1:rotstag-glade': [17, 14, 'e'] },
  roam: { max: 3, rects: [[2, 38, 24, 66], [8, 14, 18, 28]] },
});
