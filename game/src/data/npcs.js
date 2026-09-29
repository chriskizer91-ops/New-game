// The people of the Verdant Wilds (M3 spec §3.1, §4.4), the Sunscorch Wastes (M4 spec §3.1), the
// Ironspire Peaks (M5 spec §3.1) and the Gloomfen Marsh (M6 spec §3.1).
//
// NPCS[id] = { id, name, art, role, talk: [{ if?, d }] }
//   art   npc sprite key (art/map-sprites.js npcSheet)
//   role  the short label under the name in the Nearby list
//   talk  the first entry whose `if` holds (rules/cond.js check) picks the dialogue id
// Map entities point here with `npc` (two refugees share 'refugee', two pilgrims 'pilgrim').
// Tamsin and Vesper speak through their encounters' `talk` and are listed for their names, as are
// the Rotwarden, the Ashen Warden, the Rime-Abbot, Brother Aurel, and the Lantern Mother (they speak after their
// fights). "The world notices" lines ({ wears }) come after the story lines, and only once the person has been met.
// M4 givers follow one order: the thank-you (it sets the met flag too, so a deed done before the
// meeting is never lost), then the first meeting while the met flag is unset, then story beats,
// then the notices, then the lines that repeat. The Ironspire's givers (M5) and the Gloomfen's (M6) keep it.
// Owner: WP3S (M3), P3 story (M4, M5, M6).

import { deepFreeze } from '../core/freeze.js';

const N = (id, name, role, talk, art = id) => ({ id, name, art, role, talk });
// M6: Tamsin has fallen: her Rotbridge duel is over, won or yielded (the rules record both), whether or not the
// scene after it played to its end (tamsin-fallen)
const FALLEN = { any: [{ flag: 'tamsin-fallen' }, { beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] };

export const NPCS = deepFreeze({
  fenwick: N('fenwick', 'Fenwick', 'Hearthkeeper', [
    // M4: a stone that beats, carried into the Great Hall (M5: and a hood woven under the ice; M6: and her lantern)
    { if: { wears: 'sunstone-heart' }, d: 'notice-fenwick-heart' },
    { if: { wears: 'hushweave-cowl' }, d: 'notice-fenwick-cowl' },
    { if: { wears: 'lamplighters-lantern' }, d: 'notice-fenwick-lantern' },
    // M6: the seventh coal, and the eighth (after the fourth council the hearth goes quiet)
    { if: { flag: 'council-4-done' }, d: 'fenwick-eight' },
    { if: { brand: 'brand-of-lanterns' }, d: 'fenwick-seven' },
    // M5: the fifth coal, and the sixth (after the third council he stares into the fire)
    { if: { flag: 'council-3-done' }, d: 'fenwick-six' },
    { if: { brand: 'brand-of-iron' }, d: 'fenwick-five' },
    { if: { flag: 'sunscorch-complete' }, d: 'fenwick-four' },
    { if: { any: [{ brand: 'brand-of-glass' }, { brand: 'brand-of-ash' }] }, d: 'fenwick-three' },
    { if: { brand: 'brand-of-briars' }, d: 'fenwick-brand' },
    { if: { wears: 'watchkeepers-kettle' }, d: 'notice-fenwick-kettle' },
    { d: 'fenwick' },
  ]),
  isolde: N('isolde', 'Isolde', 'Warden-Commander', [
    { if: { all: [{ done: 'keep-vault' }, { not: { flag: 'heard-commission' } }] }, d: 'isolde-commission' },
    // M5: after the third council, the Gloomfen (once, then it repeats below). M6: she sends you to the fen stair,
    // never once Rotbridge is behind you or the fourth council has sat
    { if: { all: [{ flag: 'council-3-done' }, { not: { flag: 'heard-gloomfen' } }, { not: FALLEN }, { not: { flag: 'council-4-done' } }] }, d: 'isolde-gloomfen' },
    // M4: the send-off to the Sunscorch, and what comes after the second council (each once, then it
    // repeats below). M5: after the second council she points east, through the open postern.
    { if: { all: [{ flag: 'council-2-done' }, { not: { flag: 'council-3-done' } }, { not: { flag: 'heard-next' } }] }, d: 'isolde-next' },
    { if: { all: [{ flag: 'act1-complete' }, { not: { flag: 'sunscorch-complete' } }, { not: { flag: 'heard-south' } }] }, d: 'isolde-south' },
    { if: { wears: 'isoldes-oath' }, d: 'notice-isolde-oath' },
    { if: { all: [{ wears: 'wardens-seal' }, { flag: 'heard-commission' }] }, d: 'notice-isolde-seal' },
    { if: { wears: 'cinder-crown' }, d: 'notice-isolde-crown' },
    { if: { wears: 'thanes-rune' }, d: 'notice-isolde-rune' },
    { if: { wears: 'bogstriders' }, d: 'notice-isolde-boots' },
    // M6: after the fourth council, the four boxes; after Rotbridge, she will hear it at the Council table
    { if: { flag: 'council-4-done' }, d: 'isolde-boxes' },
    { if: FALLEN, d: 'isolde-rotbridge' },
    { if: { flag: 'council-3-done' }, d: 'isolde-gloomfen' },
    { if: { flag: 'council-2-done' }, d: 'isolde-next' },
    { if: { flag: 'act1-complete' }, d: 'isolde-south' },
    { if: { done: 'keep-vault' }, d: 'isolde-commission' },
    { d: 'isolde' },
  ]),
  marta: N('marta', 'Marta', 'Shop', [{ d: 'marta' }]),
  refugee: N('refugee', 'Refugee', 'Flavour', [{ d: 'refugee' }]),
  // M5: the east postern opens with the second council; Stormwatch writes again once the Ironspire is won
  'gate-guard-e': N('gate-guard-e', 'Gate Guard', 'Flavour', [
    { if: { flag: 'ironspire-complete' }, d: 'guard-e-writ' },
    { if: { flag: 'council-2-done' }, d: 'guard-e-open' },
    { d: 'guard-e' },
  ], 'gate-guard'),
  'gate-guard-se': N('gate-guard-se', 'Gate Guard', 'Flavour', [{ if: { flag: 'act1-complete' }, d: 'guard-se-open' }, { d: 'guard-se' }], 'gate-guard'),
  // M6: the causeway is under the Blackwater until it falls; after the third council the guard points to Mossfall
  'gate-guard-sw': N('gate-guard-sw', 'Gate Guard', 'Flavour', [
    { if: { brand: 'brand-of-the-deep' }, d: 'guard-sw-open' },
    { if: { flag: 'council-3-done' }, d: 'guard-sw-fen' },
    { d: 'guard-sw' },
  ], 'gate-guard'),
  hilda: N('hilda', 'Hilda', 'Temper', [
    // M5: Hilda is a giver now, in the givers' order. The thank-you first: she knows her brother's hammer on
    // sight (harrows-hammer), whatever you wear. Then her news of him after the third council (once).
    { if: { all: [{ owns: 'worldforge-hammer' }, { not: { flag: 'hammer-shown' } }] }, d: 'hilda-hammer' },
    { if: { all: [{ flag: 'council-3-done' }, { not: { flag: 'heard-hild' } }] }, d: 'hilda-letter' },
    // M6: the man on the barge wore her brother's mark on his clasp (once, when you come home from Rotbridge)
    { if: { all: [FALLEN, { not: { flag: 'heard-barge' } }] }, d: 'hilda-barge' },
    // M4: Hilda critiques the Sunscorch's blades by name (M5: and her brother's work; M6: the fen's iron)
    { if: { wears: 'cinderfang' }, d: 'notice-hilda-cinderfang' },
    { if: { wears: 'dunebreaker' }, d: 'notice-hilda-dunebreaker' },
    { if: { wears: 'worldforge-hammer' }, d: 'notice-hilda-hammer' },
    { if: { wears: 'anvil-heart' }, d: 'notice-hilda-heart' },
    { if: { wears: 'runestaff' }, d: 'notice-hilda-runestaff' },
    { if: { wears: 'ironvein-bracers' }, d: 'notice-hilda-bracers' },
    { if: { wears: 'barge-gauntlets' }, d: 'notice-hilda-chain' },
    { if: { wears: 'corvus-harpoon' }, d: 'notice-hilda-harpoon' },
    // her brother: in the Ironspire (after the second council), the hammer he left, the letter he sent
    { if: { flag: 'council-3-done' }, d: 'hilda-waits' },
    { if: { flag: 'hammer-shown' }, d: 'hilda-harrow' },
    { if: { flag: 'council-2-done' }, d: 'hilda-ironspire' },
    { if: { owns: 'ichor-mask' }, d: 'hilda-mask' },
    { if: { wears: 'thornwreath' }, d: 'notice-hilda-crown' },
    { if: { wears: 'vale-gauntlets' }, d: 'notice-hilda-gauntlets' },
    { d: 'hilda' },
  ]),
  dael: N('dael', 'Captain Dael', 'Bounty-giver', [
    { if: { all: [{ brand: 'brand-of-briars' }, { not: { flag: 'paid-briarmaw' } }] }, d: 'dael-brand' },
    { if: { all: [{ beaten: 'hollowed-patrol' }, { not: { flag: 'reported-patrol' } }] }, d: 'dael-report' },
    { if: { flag: 'rangers-home' }, d: 'dael-home' },
    { if: { all: [{ wears: 'thornwatch-hood' }, { flag: 'met-dael' }] }, d: 'notice-dael-hood' },
    { if: { all: [{ wears: 'thornsplitter' }, { flag: 'met-dael' }] }, d: 'notice-dael-splitter' },
    { d: 'dael' },
  ]),
  nell: N('nell', 'Nell', 'Shop', [{ if: { wears: 'lightfingers' }, d: 'notice-nell-gloves' }, { d: 'nell' }]),
  corra: N('corra', 'Corra Thistle', 'Rescued', [{ if: { wears: 'oathshield' }, d: 'notice-corra-shield' }, { d: 'corra' }]),
  garret: N('garret', 'Old Garret', 'Quest, contest', [
    { if: { all: [{ beaten: 'mw-lantern' }, { kindled: 'mosswatch-fire' }, { not: { flag: 'garret-told' } }, { owns: 'watchkeepers-kettle' }] }, d: 'garret-thanks-gold' },
    { if: { all: [{ beaten: 'mw-lantern' }, { kindled: 'mosswatch-fire' }, { not: { flag: 'garret-told' } }] }, d: 'garret-thanks' },
    { if: { all: [{ wears: 'mosswatch-lantern' }, { flag: 'met-garret' }] }, d: 'notice-garret-lantern' },
    { d: 'garret' },
  ]),
  miravel: N('miravel', 'Miravel', 'Main quest', [
    { if: { all: [{ brand: 'brand-of-briars' }, { not: { flag: 'met-miravel-rot' } }] }, d: 'miravel-brand' },
    { if: { wears: 'rootsong' }, d: 'notice-miravel-rootsong' },
    { if: { wears: 'rotwood-circlet' }, d: 'notice-miravel-circlet' },
    // M6: she laid Eldergrove's soot-sealed box on the fourth council's table
    { if: { flag: 'council-4-done' }, d: 'miravel-box' },
    { if: { brand: 'brand-of-briars' }, d: 'miravel-brand' },
    { d: 'miravel' },
  ]),
  nan: N('nan', 'Nan Aldercott', 'Flavour', [{ d: 'nan' }]),
  ivo: N('ivo', 'Brother Ivo', 'Bell quest', [
    { if: { quest: 'silent-bell', state: 'ready' }, d: 'ivo-thanks' },
    { if: { all: [{ wears: 'dawnbell' }, { flag: 'met-ivo' }] }, d: 'notice-ivo-bell' },
    // M5: the Highfold path from Peak's Veil is open again (only once he has told you about the bell)
    { if: { all: [{ flag: 'highfold-open' }, { flag: 'met-ivo' }] }, d: 'ivo-highfold' },
    { d: 'ivo' },
  ]),
  pilgrim: N('pilgrim', 'Pilgrim', 'Flavour', [{ if: { quest: 'miracle-sap', state: 'ready' }, d: 'pilgrim-thanks' }, { d: 'pilgrim' }]),
  tamsin: N('tamsin', 'Tamsin', 'Rival', [{ d: 'tamsin-door' }]),
  vesper: N('vesper', 'Vesper', 'Tallyman con', [{ d: 'vesper' }]),
  rotwarden: N('rotwarden', 'The Rotwarden', 'Boss', []),

  // ---- M4: the Sunscorch Wastes (spec §3.1) ------------------------------------------------------
  // Sandspire
  zara: N('zara', 'Zara al-Khem', 'Caravans, bounties', [
    { if: { all: [{ any: [{ flag: 'crate-found' }, { beaten: 'gf-caravan' }] }, { not: { flag: 'crate-returned' } }] }, d: 'zara-crate' },
    { if: { not: { flag: 'met-zara' } }, d: 'zara' },
    { if: { wears: 'zaras-orrery' }, d: 'notice-zara-orrery' },
    { if: { wears: 'saltglass' }, d: 'notice-zara-saltglass' },
    { if: { flag: 'crate-returned' }, d: 'zara-home' },
    { d: 'zara-again' },
  ]),
  qasim: N('qasim', 'Cistern Lord Qasim', 'Lord of the cistern', [
    { if: { all: [{ beaten: 'dt-aqueduct' }, { not: { flag: 'cistern-told' } }] }, d: 'qasim-water' },
    { if: { not: { flag: 'met-qasim' } }, d: 'qasim' },
    { if: { all: [{ flag: 'sunscorch-complete' }, { not: { flag: 'council-2-done' } }] }, d: 'qasim-summons' },
    { if: { wears: 'qasims-signet' }, d: 'notice-qasim-signet' },
    { if: { wears: 'cinderfang' }, d: 'notice-qasim-cinderfang' },
    { if: { flag: 'council-2-done' }, d: 'qasim-council' },
    { if: { flag: 'cistern-told' }, d: 'qasim-home' },
    { d: 'qasim-again' },
  ]),
  idris: N('idris', 'Idris the Gemwright', 'Gems', [
    { if: { wears: 'sunstone-heart' }, d: 'notice-idris-heart' },
    { if: { wears: 'mirage-glass' }, d: 'notice-idris-glass' },
    { d: 'idris' },
  ]),
  'spire-guard': N('spire-guard', 'Spire Guard', 'Guard', [
    { if: { wears: 'cinderfang' }, d: 'notice-guard-cinderfang' },
    { if: { flag: 'crate-returned' }, d: 'spire-guard-caravans' },
    { d: 'spire-guard' },
  ]),
  'water-seller': N('water-seller', 'Water-Seller', 'Water', [
    { if: { wears: 'qasims-signet' }, d: 'notice-water-signet' },
    { if: { beaten: 'dt-aqueduct' }, d: 'water-seller-flowing' },
    { d: 'water-seller' },
  ]),
  // Dusthaven
  luma: N('luma', 'Luma of Dusthaven', 'Assayer', [
    { if: { all: [{ owns: 'sunstone-lantern' }, { not: { flag: 'luma-trusted' } }] }, d: 'luma-secret' },
    { if: { not: { flag: 'met-luma' } }, d: 'luma' },
    { if: { wears: 'sunstone-heart' }, d: 'notice-luma-heart' },
    { if: { wears: 'sunstone-lantern' }, d: 'notice-luma-lantern' },
    { if: { all: [{ flag: 'luma-trusted' }, { brand: 'brand-of-glass' }] }, d: 'luma-someday' },
    { if: { flag: 'luma-trusted' }, d: 'luma-after' },
    { d: 'luma-again' },
  ]),
  ode: N('ode', 'Old Ode', 'Pithead store', [
    { if: { wears: 'sunstone-lantern' }, d: 'notice-ode-lantern' },
    { if: { beaten: 'ds-crew' }, d: 'ode-brask' },
    { d: 'ode' },
  ]),
  miner: N('miner', 'Miner', 'Miner', [
    { if: { brand: 'brand-of-glass' }, d: 'miner-glass' },
    { if: { beaten: 'ds-crew' }, d: 'miner-crew' },
    { d: 'miner' },
  ]),
  // Miragewell
  sabah: N('sabah', 'Sabah the Well-Keeper', 'Keeper of the well', [
    { if: { all: [{ beaten: 'wisp-queen' }, { not: { flag: 'well-told' } }] }, d: 'sabah-well' },
    { if: { not: { flag: 'met-sabah' } }, d: 'sabah' },
    { if: { wears: 'mirage-glass' }, d: 'notice-sabah-glass' },
    { if: { flag: 'well-told' }, d: 'sabah-after' },
    { d: 'sabah-again' },
  ]),
  'pilgrim-mw': N('pilgrim-mw', 'Pilgrim', 'Pilgrim', [
    { if: { beaten: 'wisp-queen' }, d: 'pilgrim-mw-well' },
    { d: 'pilgrim-mw' },
  ]),
  // Scorchgate
  cinder: N('cinder', 'Brother Cinder', 'Ash-hermit', [
    { if: { all: [{ brand: 'brand-of-ash' }, { not: { flag: 'cinder-sleepers' } }] }, d: 'cinder-ash' },
    { if: { not: { flag: 'met-cinder' } }, d: 'cinder' },
    { if: { wears: 'cinderfang' }, d: 'notice-cinder-fang' },
    { if: { wears: 'cinder-crown' }, d: 'notice-cinder-crown' },
    { if: { wears: 'ashen-aegis' }, d: 'notice-cinder-aegis' },
    { if: { flag: 'cinder-sleepers' }, d: 'cinder-after' },
    { d: 'cinder-again' },
  ]),
  'ashen-warden': N('ashen-warden', 'The Ashen Warden', 'Champion', []),

  // ---- M5: the Ironspire Peaks (spec §3.1) ------------------------------------------------------------
  // Peak's Veil
  wynn: N('wynn', 'Mother Wynn', 'Abbess of Peak\'s Veil', [
    // the thank-you: the bell rung from its rope (also a first meeting)
    { if: { all: [{ flag: 'bell-rung-veil' }, { not: { flag: 'veil-thanked' } }] }, d: 'wynn-thanks' },
    // the Abbess at rest: ring for them (also a first meeting, for a Warden who went out to the island first)
    { if: { all: [{ beaten: 'fm-shrine' }, { not: { flag: 'bell-rung-veil' } }] }, d: 'wynn-ring' },
    { if: { not: { flag: 'met-wynn' } }, d: 'wynn' },
    { if: { wears: 'veilbell' }, d: 'notice-wynn-bell' },
    { if: { wears: 'drowned-censer' }, d: 'notice-wynn-censer' },
    { if: { wears: 'rime-crozier' }, d: 'notice-wynn-crozier' },
    { if: { brand: 'brand-of-frost' }, d: 'wynn-frost' },
    { if: { flag: 'veil-thanked' }, d: 'wynn-after' },
    { d: 'wynn-again' },
  ]),
  // a fighting monk: Frostmere's history, and advice before each Champion
  kesh: N('kesh', 'Brother Kesh', 'Fighting monk', [
    { if: { not: { flag: 'met-kesh' } }, d: 'kesh' },
    { if: { wears: 'windstep-boots' }, d: 'notice-kesh-boots' },
    { if: { wears: 'hushweave-cowl' }, d: 'notice-kesh-cowl' },
    { if: { brand: 'brand-of-frost' }, d: 'kesh-frost' },
    { d: 'kesh-again' },
  ]),
  novice: N('novice', 'Novice', 'Novice', [
    { if: { wears: 'veilbell' }, d: 'notice-novice-bell' },
    { if: { brand: 'brand-of-frost' }, d: 'novice-frost' },
    { if: { flag: 'bell-rung-veil' }, d: 'novice-bell' },
    { d: 'novice' },
  ]),
  // Ironhold
  brundar: N('brundar', 'Thane Brundar', 'Thane of Ironhold', [
    // the Thane's leave (the main quest): Tamsin's duel won or yielded gives the Rune-Key (also a first meeting)
    { if: { all: [{ any: [{ beaten: 'tamsin-ironhold' }, { flag: 'tamsin-yielded-3' }] }, { not: { flag: 'rune-given' } }] }, d: 'brundar-rune' },
    // the thank-you of the Sentinel's Oath
    { if: { all: [{ beaten: 'id-smith' }, { not: { flag: 'smith-told' } }] }, d: 'brundar-smith' },
    { if: { not: { flag: 'met-brundar' } }, d: 'brundar' },
    { if: { all: [{ flag: 'ironspire-complete' }, { not: { flag: 'council-3-done' } }] }, d: 'brundar-summons' },
    { if: { wears: 'thanes-rune' }, d: 'notice-brundar-rune' },
    { if: { wears: 'worldforge-hammer' }, d: 'notice-brundar-hammer' },
    { if: { wears: 'ironwall' }, d: 'notice-brundar-wall' },
    { if: { flag: 'council-3-done' }, d: 'brundar-council' },
    { if: { brand: 'brand-of-iron' }, d: 'brundar-iron' },
    { if: { flag: 'rune-given' }, d: 'brundar-again' },
    { d: 'brundar-stair' },
  ]),
  // Harrow's old rival: consumables and gems (shop durra)
  durra: N('durra', 'Durra Ironhand', 'Armourer', [
    { if: { wears: 'worldforge-hammer' }, d: 'notice-durra-hammer' },
    { if: { wears: 'ironvein-bracers' }, d: 'notice-durra-bracers' },
    { if: { wears: 'runestaff' }, d: 'notice-durra-staff' },
    { if: { brand: 'brand-of-iron' }, d: 'durra-iron' },
    { d: 'durra' },
  ]),
  'ih-guard': N('ih-guard', 'Hold Guard', 'Guard', [
    { if: { wears: 'ironwall' }, d: 'notice-ih-guard-wall' },
    { if: { brand: 'brand-of-iron' }, d: 'ih-guard-iron' },
    { if: { flag: 'rune-given' }, d: 'ih-guard-rune' },
    { d: 'ih-guard' },
  ]),
  // Stormwatch
  rook: N('rook', 'Rook', 'Once a Tallyman', [
    // the thank-you of Rook's Ledger (also a first meeting)
    { if: { all: [{ beaten: 'fr-cutters' }, { not: { flag: 'ledger-given' } }] }, d: 'rook-ledger' },
    { if: { not: { flag: 'met-rook' } }, d: 'rook' },
    { if: { wears: 'cutters-pick' }, d: 'notice-rook-pick' },
    { if: { wears: 'tallyknife' }, d: 'notice-rook-knife' },
    { if: { brand: 'brand-of-frost' }, d: 'rook-frost' },
    { if: { flag: 'ledger-given' }, d: 'rook-after' },
    { d: 'rook-again' },
  ]),
  // the Stormwatch board: she takes bounties in (any bounty-giver pays any bounty)
  ysolde: N('ysolde', 'Captain Ysolde', 'Captain of Stormwatch', [
    { if: { not: { flag: 'met-ysolde' } }, d: 'ysolde' },
    { if: { wears: 'windstep-boots' }, d: 'notice-ysolde-boots' },
    { if: { wears: 'roc-feather-cloak' }, d: 'notice-ysolde-cloak' },
    { if: { brand: 'brand-of-frost' }, d: 'ysolde-home' },
    { if: { brand: 'brand-of-iron' }, d: 'ysolde-gate' },
    { d: 'ysolde-again' },
  ]),
  quill: N('quill', 'Quartermaster Quill', 'Quartermaster', [
    { if: { wears: 'trollhide-mantle' }, d: 'notice-quill-mantle' },
    { if: { brand: 'brand-of-frost' }, d: 'quill-frost' },
    { d: 'quill' },
  ]),
  // Brother Aurel speaks once, after the Rime-Abbot's fight (like the Ashen Warden)
  'rime-abbot': N('rime-abbot', 'Brother Aurel', 'Champion', []),
  // ---- M6: the Gloomfen Marsh (spec §3.1) ------------------------------------------------------------
  // Their art keys are their own (art/map-sprites.js draws them).
  // Willowmurk: Elder Moss, who sent for you (the wards; he reads the dead tongue on the sealed chest)
  moss: N('moss', 'Elder Moss', 'Elder of Willowmurk', [
    // the thank-you of the Failing Wards, and the chest's warnings read (each also a first meeting)
    { if: { all: [{ beaten: 'wm-willow' }, { not: { flag: 'wards-mended' } }] }, d: 'moss-wards' },
    { if: { all: [{ beaten: 'mh-salvage' }, { not: { flag: 'chest-read' } }] }, d: 'moss-chest' },
    { if: { not: { flag: 'met-moss' } }, d: 'moss' },
    { if: { wears: 'willow-ward' }, d: 'notice-moss-ward' },
    { if: { wears: 'weeping-bow' }, d: 'notice-moss-bow' },
    { if: { wears: 'cantors-staff' }, d: 'notice-moss-staff' },
    { if: { brand: 'brand-of-the-deep' }, d: 'moss-deep' },
    { if: { brand: 'brand-of-lanterns' }, d: 'moss-lanterns' },
    { if: { flag: 'wards-mended' }, d: 'moss-after' },
    { d: 'moss-again' },
  ]),
  // Willowmurk's herb-seller (shop sedge)
  sedge: N('sedge', 'Sedge', 'Herb-seller', [
    { if: { wears: 'hexbane-shawl' }, d: 'notice-sedge-shawl' },
    { if: { flag: 'wards-mended' }, d: 'sedge-wards' },
    { d: 'sedge' },
  ]),
  'wm-villager': N('wm-villager', 'Villager', 'Villager', [
    { if: { wears: 'weeping-bow' }, d: 'notice-villager-bow' },
    { if: { brand: 'brand-of-the-deep' }, d: 'wm-villager-deep' },
    { if: { flag: 'wards-mended' }, d: 'wm-villager-wards' },
    { d: 'wm-villager' },
  ]),
  // Rotbridge: Hodge on his stool by the toll-bar (spec A11). Every one of his lines carries the toll's choices
  // (data/dialogue.js TOLL): the day's price while the bar is down, his toll game, and the fight.
  hodge: N('hodge', 'Hodge', 'Toll-keeper', [
    { if: { not: { flag: 'met-hodge' } }, d: 'hodge' },
    // after Tamsin's fall, once (it sets tamsin-fallen too, should the scene have been cut short)
    { if: { all: [FALLEN, { not: { flag: 'hodge-heavier' } }] }, d: 'hodge-heavier' },
    { if: { wears: 'unfair-toll' }, d: 'notice-hodge-coin' },
    { if: { wears: 'bogstriders' }, d: 'notice-hodge-boots' },
    { if: { beaten: 'hodge' }, d: 'hodge-stool' },
    { if: { flag: 'toll-paid' }, d: 'hodge-paid' },
    // the price of the day (spec §4.4): the same rotation as the pay choices
    { if: { day: { every: 3, at: 1 } }, d: 'hodge-gold' },
    { if: { day: { every: 3, at: 2 } }, d: 'hodge-silver' },
    { if: { day: { every: 3, at: 0 } }, d: 'hodge-tonics' },
    { d: 'hodge-toll' },
  ]),
  // Bogmire: Mayor Gretch keeps order with fear and favours (the main quest, the Bogmire board, a soot-sealed box)
  gretch: N('gretch', 'Mayor Gretch', 'Mayor of Bogmire', [
    // the children home: the town's thanks (also a first meeting, for a Warden who went straight into the bogs)
    { if: { all: [{ flag: 'children-home' }, { not: { flag: 'gretch-thanked' } }] }, d: 'gretch-children' },
    { if: { not: { flag: 'met-gretch' } }, d: 'gretch' },
    { if: { all: [{ flag: 'gloomfen-complete' }, { not: { flag: 'council-4-done' } }] }, d: 'gretch-summons' },
    { if: { wears: 'lamplighters-lantern' }, d: 'notice-gretch-lantern' },
    { if: { wears: 'hexbane-shawl' }, d: 'notice-gretch-shawl' },
    { if: { flag: 'council-4-done' }, d: 'gretch-council' },
    { if: { flag: 'children-home' }, d: 'gretch-home' },
    { d: 'gretch-again' },
  ]),
  // Nettie the Swamp Witch: consumables and gems (shop nettie), her remedy, and one day perhaps more (a hint only)
  nettie: N('nettie', 'Nettie the Swamp Witch', 'Healer, herbalist', [
    { if: { all: [{ beaten: 'grue-hollow' }, { not: { flag: 'grue-told' } }] }, d: 'nettie-grue' },
    { if: { not: { flag: 'met-nettie' } }, d: 'nettie' },
    { if: { wears: 'hag-stone' }, d: 'notice-nettie-stone' },
    { if: { wears: 'hexbane-shawl' }, d: 'notice-nettie-shawl' },
    { if: { wears: 'mourning-veil' }, d: 'notice-nettie-veil' },
    { if: { all: [{ flag: 'grue-told' }, { brand: 'brand-of-lanterns' }] }, d: 'nettie-someday' },
    { if: { flag: 'grue-told' }, d: 'nettie-after' },
    { d: 'nettie-again' },
  ]),
  // Widow Pell: her boy Lark followed the lights; he comes home with the others (children-home)
  pell: N('pell', 'Widow Pell', 'Widow', [
    { if: { wears: 'lamplighters-lantern' }, d: 'notice-pell-lantern' },
    { if: { flag: 'children-home' }, d: 'pell-home' },
    { d: 'pell' },
  ]),
  'bm-watch': N('bm-watch', 'Stilt-Watch', 'Guard', [
    { if: { wears: 'barge-gauntlets' }, d: 'notice-watch-chain' },
    { if: { brand: 'brand-of-the-deep' }, d: 'bm-watch-deep' },
    { if: { flag: 'children-home' }, d: 'bm-watch-home' },
    { d: 'bm-watch' },
  ]),
  // Misthollow: Corvus the diver (his harpoon, and the sealed chest he pulled up for the Tallymen)
  corvus: N('corvus', 'Corvus', 'Treasure diver', [
    // the two thank-yous, each also a first meeting: he knows his harpoon on sight
    { if: { all: [{ owns: 'corvus-harpoon' }, { not: { flag: 'harpoon-shown' } }] }, d: 'corvus-harpoon' },
    { if: { all: [{ flag: 'chest-read' }, { not: { flag: 'chest-told' } }] }, d: 'corvus-chest' },
    { if: { not: { flag: 'met-corvus' } }, d: 'corvus' },
    { if: { all: [{ beaten: 'mh-salvage' }, { not: { flag: 'chest-read' } }] }, d: 'corvus-chest-taken' },
    { if: { wears: 'corvus-harpoon' }, d: 'notice-corvus-harpoon' },
    { if: { wears: 'salvagers-helm' }, d: 'notice-corvus-helm' },
    { if: { wears: 'gar-tooth' }, d: 'notice-corvus-tooth' },
    { if: { wears: 'deep-pearl' }, d: 'notice-corvus-pearl' },
    { if: { all: [{ flag: 'harpoon-shown' }, { flag: 'chest-told' }] }, d: 'corvus-after' },
    { if: { brand: 'brand-of-the-deep' }, d: 'corvus-deep' },
    { d: 'corvus-again' },
  ]),
  // the Lantern Mother speaks once, after her fight (like the Ashen Warden and Brother Aurel)
  'lantern-mother': N('lantern-mother', 'The Lantern Mother', 'Champion', []),
});

export const NPC_IDS = Object.freeze(Object.keys(NPCS));
