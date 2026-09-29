// The people of the Verdant Wilds (M3 spec §3.1, §4.4), the Sunscorch Wastes (M4 spec §3.1) and the
// Ironspire Peaks (M5 spec §3.1).
//
// NPCS[id] = { id, name, art, role, talk: [{ if?, d }] }
//   art   npc sprite key (art/map-sprites.js npcSheet)
//   role  the short label under the name in the Nearby list
//   talk  the first entry whose `if` holds (rules/cond.js check) picks the dialogue id
// Map entities point here with `npc` (two refugees share 'refugee', two pilgrims 'pilgrim').
// Tamsin and Vesper speak through their encounters' `talk` and are listed for their names, as are
// the Rotwarden and the Ashen Warden (they speak after their fights). "The world notices" lines
// ({ wears }) come after the story lines, and only once the person has been met.
// M4 givers follow one order: the thank-you (it sets the met flag too, so a deed done before the
// meeting is never lost), then the first meeting while the met flag is unset, then story beats,
// then the notices, then the lines that repeat.
// Owner: WP3S (M3), P3 story (M4).

import { deepFreeze } from '../core/freeze.js';

const N = (id, name, role, talk, art = id) => ({ id, name, art, role, talk });

export const NPCS = deepFreeze({
  fenwick: N('fenwick', 'Fenwick', 'Hearthkeeper', [
    // M4: a stone that beats, carried into the Great Hall
    { if: { wears: 'sunstone-heart' }, d: 'notice-fenwick-heart' },
    { if: { flag: 'sunscorch-complete' }, d: 'fenwick-four' },
    { if: { any: [{ brand: 'brand-of-glass' }, { brand: 'brand-of-ash' }] }, d: 'fenwick-three' },
    { if: { brand: 'brand-of-briars' }, d: 'fenwick-brand' },
    { if: { wears: 'watchkeepers-kettle' }, d: 'notice-fenwick-kettle' },
    { d: 'fenwick' },
  ]),
  isolde: N('isolde', 'Isolde', 'Warden-Commander', [
    { if: { all: [{ done: 'keep-vault' }, { not: { flag: 'heard-commission' } }] }, d: 'isolde-commission' },
    // M4: the send-off to the Sunscorch, and what comes after the second council (each once, then it repeats below)
    { if: { all: [{ flag: 'council-2-done' }, { not: { flag: 'heard-next' } }] }, d: 'isolde-next' },
    { if: { all: [{ flag: 'act1-complete' }, { not: { flag: 'sunscorch-complete' } }, { not: { flag: 'heard-south' } }] }, d: 'isolde-south' },
    { if: { wears: 'isoldes-oath' }, d: 'notice-isolde-oath' },
    { if: { all: [{ wears: 'wardens-seal' }, { flag: 'heard-commission' }] }, d: 'notice-isolde-seal' },
    { if: { wears: 'cinder-crown' }, d: 'notice-isolde-crown' },
    { if: { flag: 'council-2-done' }, d: 'isolde-next' },
    { if: { flag: 'act1-complete' }, d: 'isolde-south' },
    { if: { done: 'keep-vault' }, d: 'isolde-commission' },
    { d: 'isolde' },
  ]),
  marta: N('marta', 'Marta', 'Shop', [{ d: 'marta' }]),
  refugee: N('refugee', 'Refugee', 'Flavour', [{ d: 'refugee' }]),
  'gate-guard-e': N('gate-guard-e', 'Gate Guard', 'Flavour', [{ d: 'guard-e' }], 'gate-guard'),
  'gate-guard-se': N('gate-guard-se', 'Gate Guard', 'Flavour', [{ if: { flag: 'act1-complete' }, d: 'guard-se-open' }, { d: 'guard-se' }], 'gate-guard'),
  'gate-guard-sw': N('gate-guard-sw', 'Gate Guard', 'Flavour', [{ d: 'guard-sw' }], 'gate-guard'),
  hilda: N('hilda', 'Hilda', 'Temper', [
    // M4: Hilda critiques the Sunscorch's blades by name, and has news of her brother after the second council
    { if: { wears: 'cinderfang' }, d: 'notice-hilda-cinderfang' },
    { if: { wears: 'dunebreaker' }, d: 'notice-hilda-dunebreaker' },
    // M5: she knows her brother's hammer on sight (the quest harrows-hammer)
    { if: { all: [{ owns: 'worldforge-hammer' }, { not: { flag: 'hammer-shown' } }] }, d: 'hilda-hammer' },
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
    { if: { brand: 'brand-of-briars' }, d: 'miravel-brand' },
    { d: 'miravel' },
  ]),
  nan: N('nan', 'Nan Aldercott', 'Flavour', [{ d: 'nan' }]),
  ivo: N('ivo', 'Brother Ivo', 'Bell quest', [
    { if: { quest: 'silent-bell', state: 'ready' }, d: 'ivo-thanks' },
    { if: { all: [{ wears: 'dawnbell' }, { flag: 'met-ivo' }] }, d: 'notice-ivo-bell' },
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

  // ---- M5: the Ironspire Peaks (spec §3.1). STUBS from the M5 scaffold until P3 writes their talk ----
  // Peak's Veil
  wynn: N('wynn', 'Mother Wynn', 'Abbess of Peak\'s Veil', [
    { if: { all: [{ beaten: 'fm-shrine' }, { not: { flag: 'bell-rung-veil' } }] }, d: 'wynn-bell' },
    { if: { not: { flag: 'met-wynn' } }, d: 'wynn' },
    { d: 'wynn-again' },
  ]),
  kesh: N('kesh', 'Brother Kesh', 'Monk', [{ d: 'kesh' }]),
  novice: N('novice', 'Novice', 'Novice', [{ d: 'novice' }]),
  // Ironhold
  brundar: N('brundar', 'Thane Brundar', 'Thane of Ironhold', [
    { if: { all: [{ any: [{ done: 'tamsin-ironhold' }, { flag: 'tamsin-yielded-3' }] }, { not: { flag: 'rune-given' } }] }, d: 'brundar-rune' },
    { if: { all: [{ beaten: 'id-smith' }, { not: { flag: 'smith-told' } }] }, d: 'brundar-smith' },
    { if: { not: { flag: 'met-brundar' } }, d: 'brundar' },
    { d: 'brundar-again' },
  ]),
  durra: N('durra', 'Durra Ironhand', 'Armourer', [{ d: 'durra' }]),
  'ih-guard': N('ih-guard', 'Hold Guard', 'Hold Guard', [{ d: 'ih-guard' }]),
  // Stormwatch
  rook: N('rook', 'Rook', 'Once a Tallyman', [
    { if: { all: [{ beaten: 'fr-cutters' }, { not: { flag: 'ledger-given' } }] }, d: 'rook-ledger' },
    { if: { not: { flag: 'met-rook' } }, d: 'rook' },
    { d: 'rook-again' },
  ]),
  ysolde: N('ysolde', 'Captain Ysolde', 'Captain of Stormwatch', [{ d: 'ysolde' }]),
  quill: N('quill', 'Quartermaster Quill', 'Quartermaster', [{ d: 'quill' }]),
});

export const NPC_IDS = Object.freeze(Object.keys(NPCS));
