// Gems (M4 spec §4.5) and forge materials (§3.7). Gems are regional stones set into sockets at
// Hilda's forge. A gem in a weapon adds its `weapon` stats; in anything else, its `other` stats (the
// same keys as affix stats, rules/stats.js). `price` is Idris's price in Sandspire (null: never sold;
// the Ash Garnet only drops in Scorchgate).
// Owner: P1 (M4, M5, M6).

import { deepFreeze } from '../core/freeze.js';

const G = (id, name, region, color, weapon, other, price) => ({ id, name, region, color, weapon, other, price });

export const GEMS = deepFreeze({
  sunstone: G('sunstone', 'Dusthaven Sunstone', 'sunscorch', '#ffb43c', { extraDice: 2, aspect: 'ember' }, { resist: { ember: 10 } }, 90),
  'moss-agate': G('moss-agate', 'Moss Agate', 'verdant', '#6fbf5a', { vsHurt: 1 }, { regen: 1 }, 70),
  'glass-pearl': G('glass-pearl', 'Glass Pearl', 'sunscorch', '#cfe8ff', { hit: 1 }, { mp: 4 }, 110),
  'ash-garnet': G('ash-garnet', 'Ash Garnet', 'sunscorch', '#b3261e', { crit: 1 }, { hp: 6 }, null),
  // M5 (spec §3.7): +1d4 frost in a weapon; frost resist and Guard in anything else
  'frost-opal': G('frost-opal', 'Frost Opal', 'ironspire', '#bfe6ff', { extraDice: 2, aspect: 'frost' }, { resist: { frost: 10 }, guard: 1 }, 120),
  // M6 (spec §3.7): +1d4 blight in a weapon; blight resist and +1 regeneration in anything else
  'bog-amber': G('bog-amber', 'Bog Amber', 'gloomfen', '#c8811e', { extraDice: 2, aspect: 'blight' }, { resist: { blight: 10 }, regen: 1 }, 120),
});

export const GEM_IDS = Object.freeze(Object.keys(GEMS));

// Forge materials (M4 spec §3.7, §4.2): from Salvage, Sunscorch chests and the spoils of Sunscorch
// fights (TUNING.forge.spoils). game.materials = { scrap, silver, embers }.
const M = (id, name, text) => ({ id, name, text });

export const MATERIALS = deepFreeze({
  scrap: M('scrap', 'Scrap', 'Iron and brass from gear Hilda melted down. Rerolls wrought and tempered pieces.'),
  silver: M('silver', 'Silver', 'Clean silver for the middle tempers (+4 to +6) and for rerolling runed and storied pieces.'),
  embers: M('embers', 'Embers', 'Coals that never cool, from the Sunscorch. The high tempers (+7 to +10) and the Awakening need them.'),
});

export const MATERIAL_IDS = Object.freeze(Object.keys(MATERIALS));
