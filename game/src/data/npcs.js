// The people of the Verdant Wilds (M3 spec §3.1, §4.4).
//
// NPCS[id] = { id, name, art, role, talk: [{ if?, d }] }
//   art   npc sprite key (art/map-sprites.js npcSheet)
//   talk  the first entry whose `if` holds (rules/cond.js check) picks the dialogue id
// Map entities point here with `npc` (two refugees share 'refugee', two pilgrims 'pilgrim').
// Tamsin and Vesper speak through their encounters' `talk` and are listed for their names, as is
// the Rotwarden (it speaks after its fight). "The world notices" lines ({ wears }) come after the
// story lines, and only once the person has been met.
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const N = (id, name, role, talk, art = id) => ({ id, name, art, role, talk });

export const NPCS = deepFreeze({
  fenwick: N('fenwick', 'Fenwick', 'Hearthkeeper', [
    { if: { brand: 'brand-of-briars' }, d: 'fenwick-brand' },
    { if: { wears: 'watchkeepers-kettle' }, d: 'notice-fenwick-kettle' },
    { d: 'fenwick' },
  ]),
  isolde: N('isolde', 'Isolde', 'Warden-Commander', [
    { if: { all: [{ done: 'keep-vault' }, { not: { flag: 'heard-commission' } }] }, d: 'isolde-commission' },
    { if: { wears: 'isoldes-oath' }, d: 'notice-isolde-oath' },
    { if: { all: [{ wears: 'wardens-seal' }, { flag: 'heard-commission' }] }, d: 'notice-isolde-seal' },
    { if: { done: 'keep-vault' }, d: 'isolde-commission' },
    { d: 'isolde' },
  ]),
  marta: N('marta', 'Marta', 'Shop', [{ d: 'marta' }]),
  refugee: N('refugee', 'Refugee', 'Flavour', [{ d: 'refugee' }]),
  'gate-guard-e': N('gate-guard-e', 'Gate Guard', 'Flavour', [{ d: 'guard-e' }], 'gate-guard'),
  'gate-guard-se': N('gate-guard-se', 'Gate Guard', 'Flavour', [{ d: 'guard-se' }], 'gate-guard'),
  'gate-guard-sw': N('gate-guard-sw', 'Gate Guard', 'Flavour', [{ d: 'guard-sw' }], 'gate-guard'),
  hilda: N('hilda', 'Hilda', 'Temper', [
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
  // M4: the Sunscorch Wastes (spec §3.1; STUBS until WP-story writes their talk tables)
  zara: N('zara', 'Zara al-Khem', 'Caravan-mistress', [
    { if: { all: [{ beaten: 'gf-caravan' }, { not: { flag: 'crate-returned' } }] }, d: 'zara-crate' },
    { d: 'zara' },
  ]),
  qasim: N('qasim', 'Cistern Lord Qasim', 'Lord of the cistern', [
    { if: { all: [{ beaten: 'dt-aqueduct' }, { not: { flag: 'cistern-told' } }] }, d: 'qasim-water' },
    { d: 'qasim' },
  ]),
  idris: N('idris', 'Idris the Gemwright', 'Gems', [{ d: 'idris' }]),
  'spire-guard': N('spire-guard', 'Spire Guard', 'Flavour', [{ d: 'spire-guard' }]),
  'water-seller': N('water-seller', 'Water-Seller', 'Flavour', [{ d: 'water-seller' }]),
  luma: N('luma', 'Luma of Dusthaven', 'Assayer', [
    { if: { all: [{ owns: 'sunstone-lantern' }, { not: { flag: 'luma-trusted' } }] }, d: 'luma-secret' },
    { d: 'luma' },
  ]),
  ode: N('ode', 'Old Ode', 'Pithead store', [{ d: 'ode' }]),
  miner: N('miner', 'Miner', 'Flavour', [{ d: 'miner' }]),
  sabah: N('sabah', 'Sabah the Well-Keeper', 'Keeper of the well', [
    { if: { all: [{ beaten: 'wisp-queen' }, { not: { flag: 'well-told' } }] }, d: 'sabah-well' },
    { d: 'sabah' },
  ]),
  'pilgrim-mw': N('pilgrim-mw', 'Pilgrim', 'Flavour', [{ d: 'pilgrim-mw' }]),
  cinder: N('cinder', 'Brother Cinder', 'Ash-hermit', [{ d: 'cinder' }]),
});

export const NPC_IDS = Object.freeze(Object.keys(NPCS));
