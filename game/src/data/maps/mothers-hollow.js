// The Mother's Hollow (M6 spec §2.1, §2.3): a drowned grove of black willows at the far end of the Lanternfen, dark
// (`dark: true`). A way of roots and planks comes in from the Lanternfen (S) through the flooded grove, past two of
// the Lantern Mother's lamps and a small shoe lost in the mud (9,13), to the sunken house at the grove's heart,
// tilted into the black water with every lamp in it lit. The Lantern Mother waits in its yard before the porch
// (9-11,6-7), and the children she led out of Bogmire lie asleep in the lamplight around her (props the Brand's scene
// uses); once the Brand of Lanterns is won they have gone home.
// Tiles (drowned-grove): 'w' flooded ground, black and shallow, '~' deep water, '.' the yard, '"' rushes, 'r' willow
// roots, 'b' planks, 'T' black willows, '#' the house's walls, 'H' its roof, '+' its door, '_' its porch, '*' its
// lit windows.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

const asleep = (id, at) => ({ id, kind: 'prop', prop: 'sleeping-child', at, solid: true, if: { not: { brand: 'brand-of-lanterns' } } });

export default deepFreeze({
  id: 'mothers-hollow', name: 'The Mother\'s Hollow', region: 'gloomfen', biome: 'drowned-grove', music: 'dungeon',
  backdrop: 'mothers-hollow', zone: null, level: 17, travel: false, dark: true,
  lore: [[360, 540, 10, 10]],
  w: 22, h: 20,
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTT', //  0
    'TTT~~~~HHHHHHHH~~~~TTT', //  1
    'T~~~~~HHHHHHHHHH~~~~~T', //  2
    'T~~~~~HHHHHHHHHH~~~~~T', //  3
    'T.~~~.#*##+#*##*w~~wwT', //  4
    'TwTwww__________ww.TwT', //  5
    'Twwww.r........rwww""T', //  6
    'TTw.wwr........r"wwwTT', //  7
    'TTw"www.........wwwwTT', //  8
    'TwwwwTw........"TwwwwT', //  9
    'Tw~wwww........wwww".T', // 10
    'Tw~~~w.wwwrrwwwww~~~wT', // 11
    'Tw~~~wwwwrrrrwwww~~~wT', // 12
    'Tw~~~w.Twwrrw.Tww~~~wT', // 13
    'T.wwTww.wwrrwwww.TwwwT', // 14
    'Twwww~~wwwbbww."w"wwwT', // 15
    'Twww~~~wwwbbww.~~~.wwT', // 16
    'TTwww~ww.wrrwww.wwwwTT', // 17
    'TTTwwwww.wrrww"ww.wTTT', // 18
    'TTTTTTTTTTrrTTTTTTTTTT', // 19
  ],
  entities: [
    { id: 'hollow-lamp-w', kind: 'prop', prop: 'lantern', at: [9, 15], solid: true },
    { id: 'hollow-lamp-e', kind: 'prop', prop: 'lantern', at: [12, 16], solid: true },
    { id: 'hollow-lamp-w-glow', kind: 'light', at: [9, 15], radius: 2 },
    { id: 'hollow-lamp-e-glow', kind: 'light', at: [12, 16], radius: 2 },
    { id: 'hollow-shoe', kind: 'sign', at: [9, 13], look: 'bootprints', text: 'A small shoe, stuck fast in the mud. The footprints go on without it.' },
    { id: 'hollow-windows-w', kind: 'light', at: [8, 5], radius: 4 },
    { id: 'hollow-windows-e', kind: 'light', at: [13, 5], radius: 4 },
    { id: 'lantern-mother', kind: 'encounter', enc: 'lantern-mother', mode: 'lair', at: [10, 7], area: [9, 6, 11, 7], face: 's' },
    asleep('hollow-child-1', [7, 8]), asleep('hollow-child-2', [14, 8]), asleep('hollow-child-3', [8, 10]), asleep('hollow-child-4', [13, 10]),
  ],
  exits: [
    { id: 'hollow-s', area: [10, 19, 11, 19], to: 'lanternfen', anchor: 'from-hollow' },
  ],
  anchors: { 'from-lanternfen': [10, 18, 'n'] },
  roads: [{ from: 'from-lanternfen', to: 'lantern-mother', gates: [] }],
  roam: null,
});
