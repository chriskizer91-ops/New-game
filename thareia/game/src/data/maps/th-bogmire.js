// Thareia (T1): Bogmire, the stilt town, on the first morning of the story (the same morning Sedrin takes Merryn
// Copperpot's parcel). The old game's Bogmire (bogmire.js) and its painting, with Thareia's people in it: the board
// in the market square, where the hero watches a lizardfolk rider take a courier job, and Captain Dustwind's notice.
// The south street runs down to the docks (bogmire-docks); the other roads are closed in the Prologue.
// Rows and tiles as bogmire.js (this map draws bogmire's painting: `paint`).
// Format: src/data/maps/index.js.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'th-bogmire', name: 'Bogmire', region: 'gloomfen', biome: 'stilt-town', music: 'town', paint: 'bogmire',
  backdrop: 'bogmire', zone: null, level: 1, travel: true, dark: false, overTiles: false,
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
    { id: 'th-board', kind: 'sign', at: [22, 9], look: 'post', text: 'THE BOGMIRE BOARD. Jobs, debts and lost goats.', talk: 'th-board' },
    { id: 'merryn', kind: 'npc', npc: 'merryn', at: [21, 10], face: 's' },
    { id: 'sedrin', kind: 'npc', npc: 'sedrin', at: [20, 10], face: 's', if: { not: { flag: 'th-saw-sedrin' } } },
    { id: 'th-sedrin-seen', kind: 'trigger', area: [15, 11, 26, 15], on: 'step', if: { not: { flag: 'th-saw-sedrin' } }, dialogue: 'th-sedrin' },
    { id: 'th-gretch', kind: 'npc', npc: 'th-gretch', at: [9, 7], face: 's' },
    { id: 'th-pell', kind: 'npc', npc: 'th-townsfolk', at: [2, 12], face: 'w' },
    { id: 'th-watch', kind: 'npc', npc: 'th-watch', at: [32, 4], face: 's' },
  ],
  exits: [
    { id: 'tb-docks', area: [28, 27, 29, 27], to: 'bogmire-docks', anchor: 'from-town' },
    { id: 'tb-rotbridge', area: [41, 23, 41, 24], sealed: { region: 'gloomfen', text: 'The road to Rotbridge. A Bogmire watchman leans on his spear across it: "Not today. The water is up and it is warm."', hint: 'Not with a level-one sword arm. Come back stronger.' } },
    { id: 'tb-lanternfen', area: [19, 0, 20, 0], sealed: { region: 'gloomfen', text: 'The north road to the Lanternfen. Its lamps are out, and something is singing out there.', hint: 'Not with a level-one sword arm. Come back stronger.' } },
    { id: 'tb-boardwalk', area: [41, 2, 41, 2], sealed: { region: 'gloomfen', text: 'The long boardwalk. The Stilt-Watch has roped it off.', hint: 'Not with a level-one sword arm. Come back stronger.' } },
  ],
  anchors: { 'from-docks': [28, 26, 'n'] },
  roam: null,
});
