// Mossfall (M3 spec §2.1, §2.3). A marsh with the Gloomfen border to the south; Mosswatch Tower at the west end, the Mire Shrine islet to the south-east.
// SCAFFOLD DRAFT: exits, anchors, encounters, Hearthfires and the other entities sit at their spec
// coordinates; the tiles are a simple walkable draft (no pockets or barriers enforce the locks yet).
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mossfall', name: 'Mossfall', region: 'verdant', biome: 'fen', music: 'wilds',
  backdrop: 'mossfall', zone: 'mossfall', level: 4, travel: true, dark: false,
  lore: [[298, 262, 51, 10], [150, 280, 0, 10]],
  w: 52, h: 22,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 0
    'T..................................................T', // 1
    'T..................................................T', // 2
    'T#####.............................................T', // 3
    'T#####.............................................T', // 4
    'T#####.............................................T', // 5
    'T#####.............................................T', // 6
    'T#####.............................................T', // 7
    'T##+##.............................................T', // 8
    'T..................................................T', // 9
    'T.....==============================================', // 10
    'T..................................................=', // 11
    'T.................mmmmmmmmmmm......................T', // 12
    'T.................mmmmmmmmmmm......................T', // 13
    'T.................mmmmmmmmmmm........~~~~w~~~~~....T', // 14
    'T.................mmmmmmmmmmm........~........~....T', // 15
    'T.................mmmmmmmmmmm........~........~....T', // 16
    'T.................mmmmmmmmmmm........~........~....T', // 17
    'T.................mmmmmmmmmmm........~........~....T', // 18
    'T....................................~........~....T', // 19
    'T....................................~........~....T', // 20
    'TTTTTTTTTTTTTTTTTTTTssTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', // 21
  ],
  entities: [
    { id: 'mossfall-cairn', kind: 'hearthfire', at: [30, 6], stand: [30, 8, 'n'], cold: true },
    { id: 'mf-islet-ford', kind: 'lock', lock: 'stream', at: [41, 14] },
    { id: 'mire-shrine', kind: 'encounter', enc: 'mire-shrine', mode: 'lair', at: [42, 18], face: 'n' },
    { id: 'mf-smugglers', kind: 'encounter', enc: 'mf-smugglers', mode: 'pack', at: [14, 6], face: 's' },
    { id: 'mf-bog', kind: 'encounter', enc: 'mf-bog', mode: 'pack', at: [24, 14], face: 's' },
    { id: 'mf-bramble-cache', kind: 'chest', at: [46, 3], loot: { items: [{ rarity: 'tempered', kind: 'bow' }] }, lock: 'bramble' },
    { id: 'mf-reed-cache', kind: 'chest', at: [9, 18], loot: { gold: 120 }, hidden: true },
  ],
  exits: [
    { id: 'mf-tower', area: [3, 8, 3, 8], to: 'mosswatch-1', anchor: 'from-mossfall' },
    { id: 'mf-fen-stair', area: [20, 21, 21, 21], sealed: { region: 'gloomfen', text: 'Fog breathes up the stair. Willowmurk\'s safe paths start somewhere below.' } },
    { id: 'mf-e', area: [51, 10, 51, 11], to: 'thornhollow', anchor: 'from-mossfall' },
  ],
  anchors: { 'from-thornhollow': [49, 10, 'w'], 'from-tower': [3, 9, 's'] },
  roam: { max: 3, rects: [[6, 2, 48, 20]] },
});
