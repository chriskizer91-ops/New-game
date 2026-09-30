// The Mother's Hollow (M6 spec §2.1, §2.3; painted from the player's picture art-in/batch-3/map-mothers-hollow.png): a
// drowned grove of black willows at the far end of the Lanternfen, dark (`dark: true`). Great willows stand in black
// water all round a long, sunken house of dark timber, every lamp in its windows lit. A path of trodden earth comes up
// from the Lanternfen (S, 14-15,19) between two of the willows, past two of the Lantern Mother's lamps (13,15 and 16,15)
// and a small shoe lost at its edge (13,17), to the yard before the house's door (14-15,7). The Lantern Mother waits in
// the yard, on the path's end (14-16,9-10), and the children she led out of Bogmire lie asleep in the lamplight around
// her (props the Brand's scene uses); once the Brand of Lanterns is won they have gone home. The ground behind the house
// and the islets out in the water are the painting's own, and no way leads to them.
// Traced from the painting (one tile is 51.2 of its px; `overTiles: false`). Tiles: '.' the yard, the path and the
// raised ground, ',' fallen leaves and flowers, '"' rushes, 'r' willow roots, '_' the porch steps, '+' the house's door,
// '~' deep water, 'T' black willows, 't' dead brush, 'o' stones, '#' the house's walls, 'H' its roof, '*' its lit
// windows.
// Format: src/data/maps/index.js. Owner: M6 P2; M6 batch 3 (traced from the painting).
import { deepFreeze } from '../../core/freeze.js';

const asleep = (id, at) => ({ id, kind: 'prop', prop: 'sleeping-child', at, solid: true, if: { not: { brand: 'brand-of-lanterns' } } });

export default deepFreeze({
  id: 'mothers-hollow', name: 'The Mother\'s Hollow', region: 'gloomfen', biome: 'drowned-grove', music: 'dungeon',
  backdrop: 'mothers-hollow', zone: null, level: 17, travel: false, dark: true, overTiles: false,
  lore: [[360, 540, 14, 10]],
  w: 30, h: 20,
  rows: [
    '~~~TTTTTTTTTttt~~~~TTTTTTTTTTT', //  0
    '~~~TTTTTTTTTtttoo~~TTTTTTTTTTT', //  1
    'tTTTTTTTTttttttHoottttTTTTTT~~', //  2
    'tTTTTTTTHHHHHHHHHHHHHHTTTTTT~~', //  3
    'tTTTTTT~HHHHHHHHHHHHHHHTTTTT~t', //  4
    'tTTTTT~~#HHHHHHHHHHHHHHHTTT~~t', //  5
    'tTTTT~~##HHHHHHHHHHHHH*#~~~~~t', //  6
    'TTTTT~~###*#*#++#*#*####TTTTTT', //  7
    'TTT~~o~~~rr...__.,,,,._~TTTTTT', //  8
    'TTT~~~~o~~r........,,~~~TTTTTT', //  9
    'TTTTT~~~~~.........,,~~~TTTTTT', // 10
    'TTTTTTTTTT.......TTTTTTTTTTTTT', // 11
    'tttTTTTTTTTTT~..TTTTTTT~TTTTTT', // 12
    'otooTTTTTTTTT~..~TTTTTT~~ttTTT', // 13
    't~oo~TTTTTTTT~..TTTTTTTTTttTtt', // 14
    '~~~~~TTTTT",""..,,,rTTTTT~~~~~', // 15
    '~~oo~~TTTr".."..,,.rTTTTT~~~~~', // 16
    '~~oo~~TTrr"oo,..,o.rTTTTT~~~tt', // 17
    'to~~.rrrrro.......,rTTTTTT~~tt', // 18
    'tttttttttttttt..tttttttttttttt', // 19
  ],
  entities: [
    { id: 'hollow-lamp-w', kind: 'prop', prop: 'lantern', at: [13, 15], solid: true },
    { id: 'hollow-lamp-e', kind: 'prop', prop: 'lantern', at: [16, 15], solid: true },
    { id: 'hollow-lamp-w-glow', kind: 'light', at: [13, 15], radius: 2 },
    { id: 'hollow-lamp-e-glow', kind: 'light', at: [16, 15], radius: 2 },
    { id: 'hollow-shoe', kind: 'sign', at: [13, 17], look: 'bootprints', text: 'A small shoe, stuck fast in the mud. The footprints go on without it.' },
    { id: 'hollow-windows-w', kind: 'light', at: [12, 7], radius: 4 },
    { id: 'hollow-windows-e', kind: 'light', at: [17, 7], radius: 4 },
    { id: 'lantern-mother', kind: 'encounter', enc: 'lantern-mother', mode: 'lair', at: [15, 10], area: [14, 9, 16, 10], face: 's' },
    asleep('hollow-child-1', [12, 9]), asleep('hollow-child-2', [18, 9]), asleep('hollow-child-3', [13, 11]), asleep('hollow-child-4', [17, 8]),
  ],
  exits: [
    { id: 'hollow-s', area: [14, 19, 15, 19], to: 'lanternfen', anchor: 'from-hollow' },
  ],
  anchors: { 'from-lanternfen': [14, 18, 'n'] },
  roads: [{ from: 'from-lanternfen', to: 'lantern-mother', gates: [] }],
  roam: null,
});
