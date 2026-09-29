// The Iron Stair (M5 spec §2.1, §2.3), the dwarf road from Peak's Veil up the cliff to Ironhold. The
// path from the monastery's north gate crosses an alpine meadow to the dwarves' wall, which closes
// the valley from cliff to cliff: its gate (10-12,46) is barred, and the Stair Sentinels, dwarf
// automatons still keeping out whoever the Thane told them to, stand in the arch beside it (13,46).
// Inside, the stair proper: dwarf-cut ledges back and forth up the cliff face, iron chains strung as
// rails along their drop side, stairs cut through at alternate ends, a waterfall down the east gully.
// Halfway up the ledges come out on a scree shelf: the Stair Cairn stands on its paving there (7,24),
// its fire-bowl long cold; the stair trolls forage the shelf, and in its north-east cliff Old Horn
// sleeps in a cave whose mouth is sealed by a wall of old blue ice (17,24). The tarn in the shelf's
// corner spills into the waterfall. Four more ledges climb to the top, where the dwarf road runs
// between two carved kings to Ironhold's door.
// Layout notes: the sentinels come first on IRON_PATH and the Cairn after them, so the gate is at the
// foot of the stair; the sentinels stand in the arch beside it, so a Brand's re-armed Echo stands
// beside an open gate. The ice wall is the only way into Old Horn's cave.
// Tiles (mountain): '^' cliffs, ':' dwarf-cut paving and ledges, '|' iron chain rails, 's' cut stairs,
// '#' the dwarves' wall, '*' its torches, '.' alpine turf, ',' scree and gravel, '"' tussock grass,
// '=' the road, 'T' pines, 'o' boulders, '~' the waterfall and the tarn, 'Y' the carved kings.
// Format: src/data/maps/index.js. Owner: M5 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'iron-stair', name: 'The Iron Stair', region: 'ironspire', biome: 'mountain', music: 'peaks',
  backdrop: 'iron-stair', zone: 'iron-stair', level: 14, travel: true, dark: false,
  lore: [[756, 232, 11, 55], [800, 200, 7, 24], [864, 168, 11, 0]],
  w: 24, h: 56,
  rows: [
    '^^^^^^^^^^^==^^^^^^^^^^^', //  0
    '^^^^^^^^^Y:==:Y^^^^^^^^^', //  1
    '^^^^^^^^^.:==:.^^^^^^^^^', //  2
    '^^^^^^^^::.==.::^^^^^^^^', //  3
    '^^^^^^^^::::::::^^^^^^^^', //  4
    '^^^^^^^^:::::::::^^^^^^^', //  5
    '^^^^^:::::::::::::::^^^^', //  6
    '^^^^^:::::::::::o:::^^^^', //  7
    '^^^^^||||||||||||ss|^^^^', //  8
    '^^^^^^^^^^^^^^^^^ss^^^^^', //  9
    '^^^^^:::::::::::::::^^^^', // 10
    '^^^^^:::o:::::::::::^^^^', // 11
    '^^^^^ss|||||||||||||^^^^', // 12
    '^^^^^ss^^^^^^^^^^^^^^^^^', // 13
    '^^^^^:::::::::::::::^^^^', // 14
    '^^^^^::::::::o::::::^^^^', // 15
    '^^^^^|||||||||||||ss^^^^', // 16
    '^^^^^^^^^^^^^^^^^^ss^^^^', // 17
    '^^^^^:::::::::::::::^^^^', // 18
    '^^^^^:::::::o:::::::^^^^', // 19
    '^^^^^|||ss||||||||||^^^^', // 20
    '^^^^^^^^ss^^^^^^^^^^^^^^', // 21
    '^^^^,..T.,..,..^..,^^^^^', // 22
    '^^^..,...,,..,.^...^^^^^', // 23
    '^^.T..:::..,..,^^.^^^^^^', // 24
    '^^....:::.,...,....^^^^^', // 25
    '^^,....:...T..,...~~^^^^', // 26
    '^^.,..,,...,.,.,.~~~^^^^', // 27
    '^^..,..,..,..,..,~~~~^^^', // 28
    '^^....T...,...,.....~^^^', // 29
    '^^^ss|||||||||||||||~^^^', // 30
    '^^^ss^^^^^^^^^^^^^^^~^^^', // 31
    '^^^:::::::::::::::::~^^^', // 32
    '^^^:::::o:::::::::::~^^^', // 33
    '^^^||||||||||||||ss|~^^^', // 34
    '^^^^^^^^^^^^^^^^^ss^~^^^', // 35
    '^^^:::::::::::::::::~^^^', // 36
    '^^^:::::::::::o:::::~^^^', // 37
    '^^^ss|||||||||||||||~^^^', // 38
    '^^^ss^^^^^^^^^^^^^^^~^^^', // 39
    '^^^:::::::::::::::::~^^^', // 40
    '^^^::::::o::::::::::~^^^', // 41
    '^^^||||||||||||||ss|~^^^', // 42
    '^^^^^^^^^^^^^^^^^ss^~^^^', // 43
    '^^^:::::::::::::::::~~^^', // 44
    '^^^:::::::::o:::::::~~^^', // 45
    '^#######*#::::#*#######^', // 46
    '^^..,..T..===..T..,..^^^', // 47
    '^...."....===...,"....^^', // 48
    '^T.T..,...===..o.....^^^', // 49
    '^...o.....===.T..,.T..^^', // 50
    '^^...,.T..===...T....^^^', // 51
    '^^..T.....===....T...^^^', // 52
    '^^^^^^^...===...^^^^^^^^', // 53
    '^^^^^^^^^.===^^^^^^^^^^^', // 54
    '^^^^^^^^^^===^^^^^^^^^^^', // 55
  ],
  entities: [
    // M4.5 road gate (spec A3, §2.2): the dwarves' gate at the foot of the stair, the sentinels in the arch beside it
    { id: 'is-stair-gate', kind: 'gate', area: [10, 46, 12, 46], look: 'gate', open: { beaten: 'is-sentinels' }, guard: 'is-sentinels', text: 'The dwarves\' gate at the foot of the Iron Stair, iron bars in a granite arch. Its sentinels still keep out whoever the Thane told them to keep out, and nobody has told them to stop.' },
    { id: 'is-sentinels', kind: 'encounter', enc: 'is-sentinels', mode: 'block', at: [13, 46], face: 's' },
    { id: 'is-wall-plaque', kind: 'sign', at: [9, 47], look: 'plaque', text: 'Dwarf runes over the gate, and under them in the common tongue: IRONHOLD. STATE YOUR BUSINESS TO THE SENTINELS. THEY WILL NOT ANSWER.' },
    { id: 'stair-cairn', kind: 'hearthfire', at: [7, 24], stand: [7, 25, 'n'], cold: true },
    { id: 'is-trolls', kind: 'encounter', enc: 'is-trolls', mode: 'pack', at: [12, 27], face: 'w' },
    { id: 'is-ice-wall', kind: 'lock', lock: 'ice', at: [17, 24] },
    { id: 'troll-cave', kind: 'encounter', enc: 'troll-cave', mode: 'lair', at: [17, 23], area: [16, 22, 17, 23], face: 's' },
    { id: 'is-cave-hoard', kind: 'chest', at: [18, 22], loot: { gold: 120, gems: { 'moss-agate': 1 }, materials: { scrap: 2 } } },
    { id: 'is-ledge-pack', kind: 'chest', at: [19, 15], loot: { bag: { 'hearth-tonic': 2, 'frost-draught': 1 }, materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'is-s', area: [10, 55, 12, 55], to: 'peaks-veil', anchor: 'from-stair' },
    { id: 'is-n', area: [11, 0, 12, 0], to: 'ironhold', anchor: 'from-stair' },
  ],
  anchors: { 'from-veil': [11, 54, 'n'], 'from-hold': [11, 1, 's'] },
  roads: [{ from: 'from-veil', to: 'is-n', gates: ['is-stair-gate'] }],
  roam: { max: 2, rects: [[2, 47, 20, 52], [2, 22, 14, 29]] },
});
