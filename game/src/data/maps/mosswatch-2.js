// The Lamp Room (M3 spec §2.1, §2.3), the dark top of Mosswatch Tower. The signal fire (6,2) stands
// on a raised platform behind a parapet whose one gap (6,4) is where Hollis (6,5) keeps the Lantern
// lit, so the fire is reached past him. The lookout (10,2) sits in the north-east window bay; the
// stair down is in the south wall. Every entity sits at its spec coordinates.
// Format: src/data/maps/index.js. Owner: WP3B.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'mosswatch-2', name: 'The Lamp Room', region: 'verdant', biome: 'tower', music: 'dungeon',
  backdrop: 'mosswatch', zone: null, level: 5, travel: false, dark: true,
  lore: [[140, 280, 6, 6]],
  w: 12, h: 12,
  rows: [
    'xxx######xxx', // 0
    'xx#::::::##x', // 1
    'x##::::::#:#', // 2
    '#_#::::::#_#', // 3
    '#.####:###_#', // 4
    '#_______o_.#', // 5
    '#_.____"___#', // 6
    '#o_______oo#', // 7
    '#_________o#', // 8
    'x#._______#x', // 9
    'xx#..____#xx', // 10
    'xxx###s##xxx', // 11
  ],
  entities: [
    { id: 'mw-lantern', kind: 'encounter', enc: 'mw-lantern', mode: 'lair', at: [6, 5], face: 's', area: [6, 4, 6, 5] },
    { id: 'mw-lantern-light', kind: 'light', at: [6, 5], radius: 3, if: { not: { beaten: 'mw-lantern' } } },
    { id: 'mosswatch-fire', kind: 'hearthfire', at: [6, 2], stand: [6, 3, 'n'], cold: true },
    { id: 'mw-lookout', kind: 'lookout', at: [10, 2] },
  ],
  exits: [
    { id: 'mw2-down', area: [6, 11, 6, 11], to: 'mosswatch-1', anchor: 'from-lamp' },
  ],
  anchors: { 'from-stair': [6, 9, 'n'] },
  roam: null,
});
