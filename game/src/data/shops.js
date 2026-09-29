// Shops (M3 spec §3.9, M4 spec §3.7). Consumable prices come from CONSUMABLES[id].price in
// data/items.js; gem prices from GEMS[id].price in data/gems.js.
// SHOPS[id] = { id, name, items: [consumableId], gems?: [gemId] }. Opened by the dialogue effect
// { open: 'shop:<id>' }.
// Owner: WP3S (M3), P3 story (M4).

import { deepFreeze } from '../core/freeze.js';

const STOCK = ['hearth-tonic', 'bitterroot', 'frost-draught', 'ember-salts'];

export const SHOPS = deepFreeze({
  marta: { id: 'marta', name: 'Marta\'s Stall', items: STOCK },
  nell: { id: 'nell', name: 'Nell\'s Store', items: STOCK },
  // M4: Idris sells gems, not consumables, and never the Ash Garnet (it only comes out of Scorchgate's ash)
  idris: { id: 'idris', name: 'Idris the Gemwright', items: [], gems: ['sunstone', 'moss-agate', 'glass-pearl'] },
  // Old Ode's store at the pithead: the same stock, with the Frost Draught first (the Sunscorch burns)
  pithead: { id: 'pithead', name: 'The Pithead Store', items: ['frost-draught', 'hearth-tonic', 'bitterroot', 'ember-salts'] },
  // M5 (spec §3.7): Durra Ironhand's armoury at Ironhold (consumables and three gems), Quill's stores at Stormwatch
  durra: { id: 'durra', name: 'Durra Ironhand\'s Armoury', items: ['ember-salts', 'hearth-tonic', 'bitterroot', 'frost-draught'], gems: ['moss-agate', 'glass-pearl', 'frost-opal'] },
  quill: { id: 'quill', name: 'Quartermaster Quill\'s Stores', items: ['ember-salts', 'hearth-tonic', 'bitterroot', 'frost-draught'] },
});
