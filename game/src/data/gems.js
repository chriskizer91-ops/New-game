// Gems (M4 spec §4.5): regional stones set into sockets at Hilda's forge. A gem in a weapon adds its
// `weapon` stats; in anything else, its `other` stats (the same keys as affix stats, rules/stats.js).
// `price` is Idris's price in Sandspire (null: never sold; the Ash Garnet only drops in Scorchgate).
// Owner: P1 (M4).

import { deepFreeze } from '../core/freeze.js';

const G = (id, name, region, color, weapon, other, price) => ({ id, name, region, color, weapon, other, price });

export const GEMS = deepFreeze({
  sunstone: G('sunstone', 'Dusthaven Sunstone', 'sunscorch', '#ffb43c', { extraDice: 2, aspect: 'ember' }, { resist: { ember: 10 } }, 90),
  'moss-agate': G('moss-agate', 'Moss Agate', 'verdant', '#6fbf5a', { vsHurt: 1 }, { regen: 1 }, 70),
  'glass-pearl': G('glass-pearl', 'Glass Pearl', 'sunscorch', '#cfe8ff', { hit: 1 }, { mp: 4 }, 110),
  'ash-garnet': G('ash-garnet', 'Ash Garnet', 'sunscorch', '#b3261e', { crit: 1 }, { hp: 6 }, null),
});

export const GEM_IDS = Object.freeze(Object.keys(GEMS));
