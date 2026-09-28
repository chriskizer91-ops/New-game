// The people of the Verdant Wilds (M3 spec §3.1, §4.4).
//
// NPCS[id] = { id, name, art, role, talk: [{ if?, d }] }
//   art   npc sprite key (art/map-sprites.js npcSheet)
//   talk  the first entry whose `if` holds (rules/cond.js check) picks the dialogue id
// Map entities point here with `npc` (two refugees share 'refugee', two pilgrims 'pilgrim').
// Tamsin and Vesper speak through their encounters' `talk` and are listed for their names.
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const N = (id, name, role, talk, art = id) => ({ id, name, art, role, talk });

export const NPCS = deepFreeze({
  fenwick: N('fenwick', 'Fenwick', 'Hearthkeeper', [{ if: { brand: 'brand-of-briars' }, d: 'fenwick-brand' }, { d: 'fenwick' }]),
  isolde: N('isolde', 'Isolde', 'Warden-Commander', [{ if: { done: 'keep-vault' }, d: 'isolde-commission' }, { d: 'isolde' }]),
  marta: N('marta', 'Marta', 'Shop', [{ d: 'marta' }]),
  refugee: N('refugee', 'Refugee', 'Flavour', [{ d: 'refugee' }]),
  'gate-guard-e': N('gate-guard-e', 'Gate Guard', 'Flavour', [{ d: 'guard-e' }], 'gate-guard'),
  'gate-guard-se': N('gate-guard-se', 'Gate Guard', 'Flavour', [{ d: 'guard-se' }], 'gate-guard'),
  'gate-guard-sw': N('gate-guard-sw', 'Gate Guard', 'Flavour', [{ d: 'guard-sw' }], 'gate-guard'),
  hilda: N('hilda', 'Hilda', 'Temper', [{ if: { owns: 'ichor-mask' }, d: 'hilda-mask' }, { d: 'hilda' }]),
  dael: N('dael', 'Captain Dael', 'Bounty-giver', [
    { if: { all: [{ brand: 'brand-of-briars' }, { not: { flag: 'paid-briarmaw' } }] }, d: 'dael-brand' },
    { if: { flag: 'rangers-home' }, d: 'dael-home' },
    { d: 'dael' },
  ]),
  nell: N('nell', 'Nell', 'Shop', [{ d: 'nell' }]),
  corra: N('corra', 'Corra Thistle', 'Rescued', [{ d: 'corra' }]),
  garret: N('garret', 'Old Garret', 'Quest, contest', [
    { if: { all: [{ beaten: 'mw-lantern' }, { kindled: 'mosswatch-fire' }, { not: { flag: 'garret-told' } }] }, d: 'garret-thanks' },
    { d: 'garret' },
  ]),
  miravel: N('miravel', 'Miravel', 'Main quest', [{ if: { brand: 'brand-of-briars' }, d: 'miravel-brand' }, { d: 'miravel' }]),
  nan: N('nan', 'Nan Aldercott', 'Flavour', [{ d: 'nan' }]),
  ivo: N('ivo', 'Brother Ivo', 'Bell quest', [{ d: 'ivo' }]),
  pilgrim: N('pilgrim', 'Pilgrim', 'Flavour', [{ d: 'pilgrim' }]),
  tamsin: N('tamsin', 'Tamsin', 'Rival', [{ d: 'tamsin-door' }]),
  vesper: N('vesper', 'Vesper', 'Tallyman con', [{ d: 'vesper' }]),
});

export const NPC_IDS = Object.freeze(Object.keys(NPCS));
