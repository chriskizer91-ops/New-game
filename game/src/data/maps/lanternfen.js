// The Lanternfen (M6 spec §2.1, §2.3), Bogmire's eastern bogs: open bog and dead trees in fog, black pools with small
// lights hanging over them. The duckboards come in from Bogmire (S), where small bootprints in the mud all go one way
// (8,27). The old path runs north to the first line of pools across the bog, pinched to a neck of rushes where a dead
// bough hangs low over the way, hung with lanterns and thick with the Lantern Mother's moths (11-13,22; the moths
// beside it, 14,22). Past it the Fen Cairn stands cold beside the path (20,16), and a side path runs west to a hollow
// in the peat banks: Mother Grue's sunken hut, behind a witch-ward (8,15-16), with the hag at her door (5-6,16) and her
// pantry. The marsh-lights haunt the pools to the east. The second line of pools is crossed at another neck, where
// the hags have staked a hedge of bones and bottles across the path (27-29,11; the hags beside it, 30,11). Beyond, the
// path runs on to the edge of the drowned grove (N), where two of the Lantern Mother's lamps burn either side of the way
// into her Hollow. South-east, out across a stretch of bog, a pedlar's pack lies where it was dropped.
// Layout notes: both road guards stand in their necks beside their gates (a Brand's re-armed rematch stands beside an
// open road); the pool lines run edge to edge, so the bog is never a way round a gate. The witch-ward is the only way
// into Grue's hollow; the bog stretch is the only way to the pedlar's pack. The map is foggy (`fog: true`).
// Tiles (bog): '.' sphagnum, ',' bog cotton, '"' rushes, '=' the old path, 'b' duckboards, 'm' black bog mud (the bog
// lock lies on it), '~' black pools, 'w' the grove's flooded edge, 'T' dead trees (black willows at the grove),
// 't' gorse, 'o' stumps, '^' peat banks, '#' the sunken hut's walls, 'H' its thatch, '+' its door.
// Format: src/data/maps/index.js. Owner: M6 P2.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'lanternfen', name: 'The Lanternfen', region: 'gloomfen', biome: 'bog', music: 'fen',
  backdrop: 'lanternfen', zone: 'lanternfen', level: 16, travel: true, dark: false, fog: true,
  lore: [[292, 522, 6, 30], [352, 545, 32, 1]],
  w: 40, h: 32,
  rows: [
    'oTotTTtTTTttTTottttTTTttTotTtttt==tTttTT', //  0
    't.T.".........T...."....".wwwTww==wwwTwT', //  1
    'T.....T..,"""....,.t."".."Twwwww==wwwwwt', //  2
    't.....".o.~~~."....."~~~~"".....==.~~~T~', //  3
    'o."..t"~~~~~~~""..."~~~~~".."..t==,.~~~~', //  4
    'T....."~~~~~~~..."."~~~~~..o....==."~~~~', //  5
    'o.,..."~~~~~~t...,.....".T......==...~~~', //  6
    't.T,.""."~~~,"...T."........======."T".~', //  7
    't.".,"".."T".."..,........".======.."".~', //  8
    '~.~.~~~"..~,~.~"~~...".."...==.".~~~~~~~', //  9
    '~~~~~~~~~~~~~~~~~~~~.~~~"~~"=="~~~~~~~~~', // 10
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~"=="~~~~~~~~~', // 11
    '~~~~~~~~~~~~~~~~~~~.~~~~~~~"=="~~.~",""~', // 12
    '^^^^^^^^~~~~"..~~,"."...t.."==,,...,...t', // 13
    '^^HHH^..~~~~..,."...T...."".==.....".t.t', // 14
    '^^#+#...====,..,"....o..T...==...T,"...t', // 15
    '^^o.....====..".T..,..."....==.,.~~~..Tt', // 16
    '^^^^....~~~~==================.."~~~"..T', // 17
    '^^^^^..o~~~~==================...~~~..,t', // 18
    '^^^^^^^^~~~~==.t......T...T."..o..."...T', // 19
    '^~~~~~~~~"".=="..""...,...."...........t', // 20
    '^~~~~~~~~~~"=="~~~~~....",".".""".","."^', // 21
    '^~~~~~~~~~~"=="~~~~~~~~~~~~~~~~~~~~~~~~^', // 22
    '^~~~~~~~~~~"=="~~~~.~~~~~~~~~~~~~~~~~~~^', // 23
    't..~~~......=="",.""""""~~~~,."~~~~~~~~~', // 24
    'tt.",.========.............".,,.."",".T~', // 25
    't..T..========....".~~~~~~~~~~~~.."..o~~', // 26
    'o.""""bb...."""".T.,"mmmmmmmm..~"~~~~~~~', // 27
    'o~~~~~bb..t.~~~~~"...mmmmmmmm..~~~~~~~~T', // 28
    '~~~~~~bb....~~~~~~~~"mmmmmmmm..~~~~~T~~t', // 29
    '~~~~~~bb.o""~~~~~~~~~~~~~~~~~~~~~~t~~~~T', // 30
    '~~~~~~bbTttT~~~~~~~~T~t~~~~~~~~~~~~~tooT', // 31
  ],
  entities: [
    { id: 'lf-boots', kind: 'sign', at: [8, 27], look: 'bootprints', text: 'Small bootprints, all going one way.' },
    // M4.5 road gate (spec A3, §2.2): the lantern-hung bough across the first neck, the moths beside it
    { id: 'lf-lantern-bough', kind: 'gate', area: [11, 22, 13, 22], look: 'hung-lanterns', open: { beaten: 'lf-moths' }, guard: 'lf-moths', text: 'A dead bough bent low across the path, hung with little lanterns. The moths are so thick around them that the light comes through in pieces.' },
    { id: 'lf-moths', kind: 'encounter', enc: 'lf-moths', mode: 'block', at: [14, 22], face: 's' },
    { id: 'fen-cairn', kind: 'hearthfire', at: [20, 16], stand: [20, 17, 'n'], cold: true },
    // Mother Grue's hollow (GLOOM_LEADS.grue), behind a witch-ward
    { id: 'lf-witch-ward', kind: 'lock', lock: 'witch-ward', area: [8, 15, 8, 16] },
    { id: 'grue-hollow', kind: 'encounter', enc: 'grue-hollow', mode: 'lair', at: [5, 16], area: [5, 16, 6, 16], face: 'e' },
    { id: 'lf-grue-pantry', kind: 'chest', at: [6, 18], loot: { gold: 80, bag: { bitterroot: 2 }, gems: { 'bog-amber': 1 } } },
    { id: 'lf-lights', kind: 'encounter', enc: 'lf-lights', mode: 'pack', at: [36, 16], face: 'w' },
    { id: 'lf-light-1', kind: 'prop', prop: 'marsh-lights', at: [14, 4] },
    { id: 'lf-light-2', kind: 'prop', prop: 'marsh-lights', at: [22, 24] },
    { id: 'lf-light-3', kind: 'prop', prop: 'marsh-lights', at: [30, 24] },
    { id: 'lf-light-4', kind: 'prop', prop: 'marsh-lights', at: [32, 16] },
    // M4.5 road gate: the hags' hedge across the second neck, the hags beside it
    { id: 'lf-hag-hedge', kind: 'gate', area: [27, 11, 29, 11], look: 'hag-fence', open: { beaten: 'lf-hags' }, guard: 'lf-hags', text: 'A hedge of stakes across the path, hung with bones, bottles and knotted hair. Whatever is in the pot beyond it smells like supper.' },
    { id: 'lf-hags', kind: 'encounter', enc: 'lf-hags', mode: 'block', at: [30, 11], face: 's' },
    // the Lantern Mother's lamps at the edge of the drowned grove
    { id: 'lf-lamp-1', kind: 'prop', prop: 'lantern', at: [31, 2], solid: true },
    { id: 'lf-lamp-2', kind: 'prop', prop: 'lantern', at: [34, 2], solid: true },
    { id: 'lf-bog', kind: 'lock', lock: 'bog', area: [21, 27, 28, 29] },
    { id: 'lf-pedlar-pack', kind: 'chest', at: [30, 28], loot: { gold: 100, items: [{ rarity: 'runed', slot: 'hands' }], materials: { silver: 1 } } },
  ],
  exits: [
    { id: 'lf-s', area: [6, 31, 7, 31], to: 'bogmire', anchor: 'from-lanternfen' },
    { id: 'lf-n', area: [32, 0, 33, 0], to: 'mothers-hollow', anchor: 'from-lanternfen' },
  ],
  anchors: { 'from-bogmire': [6, 30, 'n'], 'from-hollow': [32, 1, 's'] },
  roads: [{ from: 'from-bogmire', to: 'lf-n', gates: ['lf-lantern-bough', 'lf-hag-hedge'] }],
  roam: { max: 3, rects: [[0, 0, 25, 9], [13, 13, 27, 20], [31, 13, 39, 20], [8, 24, 19, 31]] },
});
