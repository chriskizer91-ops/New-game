// Plankford (M5, the East Road; painted from the player's picture art-in/extra/path-plank-bridge.png). The
// third of the East Road's six painted maps: deep forest, where the road crosses a clear stream on a plank
// bridge (24-25, 12-17) under a weeping willow. Stormwatch deserters have chained the bridge's south end
// (24-25, 18) and stand beside it (26, 19) to take a toll. South of the stream a sandy fork leaves the road
// eastward to a little beach on the water (39-43, 18-20), with a cache at its end.
// Traced from the painting (one tile is 32 of its px; `overTiles: false`). Tiles: '=' the road, '.' the
// verges and glades, ',' the fork's sand and the beach, 'b' the bridge's planks, '#' its rails and the stone
// bollard, 'T' the forest, the willow and the ferns, 'o' boulders and the stream's big stones, '~' the stream.
// Format: src/data/maps/index.js. Owner: the lead (M5 P8, the East Road).
import { deepFreeze } from '../../core/freeze.js';

export default deepFreeze({
  id: 'plankford', name: 'Plankford', region: 'ironspire', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: null, level: 12, travel: true, dark: false, overTiles: false,
  lore: [[578, 364, 23, 30], [586, 358, 21, 0]],
  w: 48, h: 32,
  rows: [
    'TTTTTTTTTTTTTTTTTTTT====.TTTTTTTTTTTTTTTTTTTTTTT', //  0
    'TTTTTTTTTTTT....TTTT.===oTTTTTTTTTTTTTTTTTTTTTTT', //  1
    'TTTTTTToooTT....TTTT.===.TTTTTTTTTTTTTTTTTTTTTTT', //  2
    'TTTTTTTooooT....TTT..===..TTTTTTTTTTTTTTTTTTTTTT', //  3
    'TToooooooooTTTT......===..TTTTTTTTTTTTTTTTTTTTTT', //  4
    '~~ooooooTTTTTTTTTTT...===...TTTTTTTTTTTTTTTTTTTT', //  5
    '~~ooooooTTTTTTTTTTTT..===.o..TTT..TTTTTTTTTTTTTT', //  6
    '~~~~~oooTTTTTTTTTTTT..===...TTTT..TTTTTTTTTTTTTT', //  7
    '~~~~~~ooTTTTTTTTTTTTT..==...TTTT..T...TTTTTTTTTT', //  8
    '~~~~~~~~~~TTTTTTTTTT...===..TTTTTTT...TTTTTTTTTT', //  9
    '~~~~~~~~~~TTTTTTTTToo..===..TTTTTTTTTTTTTTTTTT~~', // 10
    '~oooo~~~~~~~~~~~~TTooo.#==#.ooTTTTToooTTToooo~~~', // 11
    '~ooooooo~~~~~~~~~TTTooo#bb#TooTTTTTooooo~oooo~~~', // 12
    '~~~~~oooo~~~~~~~~~~~ooo#bb#ToooooTTooo~~~~~~~~~~', // 13
    'T~~~~~~~~~~~~~~~~~~~~~~#bb#~oo~~~TT~~~~~~~~~~~~~', // 14
    'TToo~~~~~~~~~~~~~~~~~~~#bb#~~~oo~~~~~~~~~~~TTTTT', // 15
    'TToo~~~~~~~~~~~~~~~~~~~#bb#~~~~~~~~~~~~~~~oTTTTT', // 16
    'TTTTTTT,,,,,TTTTT~~~TTT#bb#~~~~~~~~~~~~~~~~TTTTT', // 17
    'TTTTTTTTTTTTTTTTTTTTTooT==#ooT~~~~~~~T~,,,,,TTTT', // 18
    'TTTTTTTTTTTTTTTTTTTTToo.==.o.TooooooTTT,,,,,TTTT', // 19
    'TTTTTTTTTTTTTTTTTTT.....===...TTooooTTT,,,,,TTTT', // 20
    'TTTTTTTTTTTTTTTTTT......===...TTTTTTTT,,....TTTT', // 21
    'TTTTTTTTTTTTTTTTTTT......====.TTTTTT..,.....TTTT', // 22
    'TTTTTTTTTTTTTTTTTTTT.....====.TTTTTTT,,TT...TTTT', // 23
    'TTTTTTTTTTTTTTTTTTTT......===..TTTTT,,TTTTTTTTTT', // 24
    'TTTTTTTTTTTTTTTTTTTT......===......,,TTTTTTTTTTT', // 25
    'TTTTTTTTTTTTTTTT..TTTT...====....,,,.TTTTTTTTTTT', // 26
    'TTTTTTTTTTTTTTTT..TTTT...===..oo....TTTTTTTTTTTT', // 27
    'TTTTTTTTTTTTT.....TTT...====.TTTTTTTTTTTTTTTTTTT', // 28
    'TTTTTTTTTT......ooTTT...===..TTTTTTTTTTTTTTTTTTT', // 29
    'TTTTTTTTTT......ooTTT..====.ooTTTTTTTTTTTTTTTTTT', // 30
    'TTTTTTTTTT.....TooTTT.====..TTTTTTTTTTTTTTTTTTTT', // 31
  ],
  entities: [
    { id: 'pf-sign', kind: 'sign', at: [29, 24], look: 'post', text: 'PLANKFORD. TOLL, ONE SILVER A HEAD. The paint is fresh, and nobody has signed it.' },
    { id: 'pf-beach-cache', kind: 'chest', at: [43, 19], loot: { gold: 80, items: [{ rarity: 'tempered', slot: 'hands' }] } },
    // the road gate (road-first, spec A3): a chain across the bridge's south end, the deserters beside it
    { id: 'pf-toll-chain', kind: 'gate', area: [24, 18, 25, 18], look: 'chain', open: { beaten: 'er-toll' }, guard: 'er-toll', text: 'A chain across the foot of the plank bridge, a tin cup hung from it. The men beside it wear Stormwatch blue with the badges picked off.' },
    { id: 'er-toll', kind: 'encounter', enc: 'er-toll', mode: 'block', at: [26, 19], face: 'w' },
  ],
  exits: [
    { id: 'pf-lea', area: [22, 31, 25, 31], to: 'drystone-lea', anchor: 'from-ford' },
    { id: 'pf-shrine', area: [20, 0, 23, 0], to: 'shrinewood', anchor: 'from-ford' },
  ],
  anchors: { 'from-lea': [23, 30, 'n'], 'from-shrine': [21, 1, 's'] },
  roads: [{ from: 'from-lea', to: 'pf-shrine', gates: ['pf-toll-chain'] }],
});
