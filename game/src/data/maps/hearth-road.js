// The Hearth Road North (M3 spec §2.1, §2.3, A2). From the Keep, a stone causeway-bridge crosses the
// lake (rows 62-69) to a reedy shore where road-rats wait in the ditch. The road then climbs north-west
// into the forest, past the Waymarker Stones (a ring of standing stones, and a signpost that claims to
// be the tenth waymarker) with a boulder-sealed cache in the trees behind them. East of the road the
// millrace runs south from the old mill's pond, and across it, on Poacher's Holm, Haskett watches the
// ford (his nameplate reads from the road). The Milestone Fire burns in its shrine at the millrace
// head. Skarn's chain closes the road at the toll-house; the Smugglers' Hollow hides behind the
// bramble opposite. Past the toll the road bends east along the Rot-Stag's glade (a blighted patch
// round the stag, a pond, and a thornwall pocket in its north-east corner) and on through the forest
// to Thornhollow's south gate.
// Layout notes: the Milestone Fire sits at (15,43), next to its stand (spec (15,42), moved 1).
// Haskett's lair sits at (21,50) on the ford's landing (spec (23,50), moved 2) so the nameplate is in
// range of the road at x=16. The roam rects keep patrols off the causeway and off the Holm.
// Format: src/data/maps/index.js. Owner: WP3.
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'hearth-road', name: 'The Hearth Road North', region: 'verdant', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: 'hearth-road', level: 2, travel: true, dark: false,
  lore: [[520, 375, 13, 69], [325, 268, 12, 0]],
  w: 26, h: 70,
  rows: [
    'TTTTTTTTTtt===ttTTTTTTTTTT', //  0
    'TTTTTTTTT..===..TTTTTTTTTT', //  1
    'TTTTT".,.t.===..tTT.TTTTTT', //  2
    'TTTT..."...===.."....,TTTT', //  3
    'TTTT.,.....===t...."..TTTT', //  4
    'TTTTTT.."..===.TT.,..TTTTT', //  5
    'TTTTTTTTTT.===..TTTTTTTTTT', //  6
    'TTTTTTTTTTt.===.tTTTTTTTTT', //  7
    'TTTTTTTTTTTt.===..",.TTTTT', //  8
    'TTTTTTTTTTTT..===.,.".T..T', //  9
    'TTTTTTTTTTTt..===.,...,..T', // 10
    'TTTTTTTTTTTT..===.."m.,..T', // 11
    'TTTT...".TTT..===..mmm.,.T', // 12
    'TTT..""....,..===.mmmmm..T', // 13
    'TT...~~.""....===.,mm....T', // 14
    'TTT,.~~...TTT.===...m,"..T', // 15
    'TTTT,....TTTT.===....~~.,T', // 16
    'TTTT.,..TTTTT.===..,.~~".T', // 17
    'TTTTTTTTTTTTt.===.."...,.T', // 18
    'TTTTTTTTTTTT.===.,..t..".T', // 19
    'TTTTTTTTT...===.tttttT.ttT', // 20
    'TTTTTTTT.t..===..tTTTTTTTT', // 21
    'TTTTTTT"....===.".tTTTTTTT', // 22
    'TTTTTTT....===..".TTTTTTTT', // 23
    'TtttttttT..===..,.TTTTTTTT', // 24
    'T"...HHtTT.===..TTTTTTTTTT', // 25
    'T....HHtTT.===.TTTTTTTTTTT', // 26
    'T.,.o..tTT.===.TTTHHHHHTTT', // 27
    'To.."..tTT,===||||HHHHHTTT', // 28
    'T......ttT.===::::##*##TTT', // 29
    'T..........===:::::::::TTT', // 30
    'T..........===:::::::::TTT', // 31
    'T..o...tTTT===|||||||||TTT', // 32
    'T"..o..ttTT===..TTTTTTTTTT', // 33
    'T..,...tTT.===.,.TTTTTTTTT', // 34
    'T"...o"tT..===....TTTTTTTT', // 35
    'TtttttttT..===....TTHHHHTT', // 36
    'TTTT.t.....===.....THHHHTT', // 37
    'TTT.,.."...===......####TT', // 38
    'TTT........===.....~~~~~~~', // 39
    'TTTT..TT..t.===....~~~~~~~', // 40
    'TTT.,....tt.===....~~~~~~~', // 41
    'TTTT......t.===ot..~~~~~~~', // 42
    'TTT"......t.===:o..~~~~~~~', // 43
    'TTTTT.,.....===::..~~~~TT~', // 44
    'TToTT..".....===...~~T".TT', // 45
    'To.....,......===..~~..."T', // 46
    'TToo.....o....===..~~".HHT', // 47
    'TTTT.......o..===.,~~..HHT', // 48
    'TTT...".......===..~~...,T', // 49
    'TTTT."o.....o.===..ww....T', // 50
    'TTTTT...."..."===..~~."."T', // 51
    'TTTTT.,o...o..===..~~....T', // 52
    'TTTTTT...o....===,.~~"...T', // 53
    'TTTTTTT.......===.,~~T..TT', // 54
    'TTTTTTTT.....===...~~~TT~~', // 55
    'TTTTTT."...,===...,~~~~~~~', // 56
    'TTTTT""mmm,.===..".~~~~~~~', // 57
    'TTTT.,.mmm".===....~~~~~~~', // 58
    'TT~~~..mmm.,===...,~~~~~~~', // 59
    '~~~~~~".....===".."~~~~~~~', // 60
    '~~~~~~~~""..===.""~~~~~~~~', // 61
    '~~~~~~~~~~~~bbb~~~~~~~~~~~', // 62
    '~~~~o~~~~~~~bbb~~~~~~~~~~~', // 63
    '~~~~~~~~~~~~bbb~~~~~~o~~~~', // 64
    '~~oT~~~~~~~~bbb~~~~~~~~~~~', // 65
    '~~oo~~~~~~~~bbb~~~~~~~~~~~', // 66
    '~~~~~~~~~~~~bbb~~~~o~~~~~~', // 67
    '~~~~~~~~~~~~bbb~~~~~~~~~~~', // 68
    '~~~~~~~~~~~~bbb~~~~~~~~~~~', // 69
  ],
  entities: [
    { id: 'hearth-road', kind: 'encounter', enc: 'hearth-road', mode: 'pack', at: [12, 60], face: 's', leash: 4 },
    { id: 'waymarker-stones', kind: 'encounter', enc: 'waymarker-stones', mode: 'pack', at: [9, 50], face: 's' },
    { id: 'verdant-edge', kind: 'encounter', enc: 'verdant-edge', mode: 'pack', at: [13, 22], face: 's' },
    { id: 'milestone-fire', kind: 'hearthfire', at: [15, 43], stand: [15, 44, 'n'] },
    { id: 'bramble-toll-chain', kind: 'gate', area: [11, 32, 13, 32], look: 'chain', open: { unlocked: 'bramble-toll-chain' }, guard: 'bramble-toll', text: 'A chain across the road, and a toll-house with a Thornwatch hood in the window.' },
    { id: 'bramble-toll', kind: 'encounter', enc: 'bramble-toll', mode: 'block', at: [16, 31], face: 'w' },
    { id: 'rotstag-glade', kind: 'encounter', enc: 'rotstag-glade', mode: 'lair', at: [20, 13], area: [19, 12, 21, 13], face: 'w' },
    { id: 'poachers-holm', kind: 'encounter', enc: 'poachers-holm', mode: 'lair', at: [21, 50], area: [21, 49, 22, 50], face: 'w' },
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
  roam: { max: 3, rects: [[2, 37, 18, 61], [8, 14, 18, 28]] },
});
