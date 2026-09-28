// Consumable shops (M3 spec §3.9). Prices come from CONSUMABLES[id].price in data/items.js.
// SHOPS[id] = { id, name, items: [consumableId] }. Opened by the dialogue effect { open: 'shop:<id>' }.
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

const STOCK = ['hearth-tonic', 'bitterroot', 'frost-draught', 'ember-salts'];

export const SHOPS = deepFreeze({
  marta: { id: 'marta', name: 'Marta\'s Stall', items: STOCK },
  nell: { id: 'nell', name: 'Nell\'s Store', items: STOCK },
  // M4 (spec §3.7): Idris sells gems (data/gems.js prices), not consumables
  idris: { id: 'idris', name: 'Idris the Gemwright', items: [], gems: ['sunstone', 'moss-agate', 'glass-pearl'] },
  pithead: { id: 'pithead', name: 'The Pithead Store', items: STOCK },
});
