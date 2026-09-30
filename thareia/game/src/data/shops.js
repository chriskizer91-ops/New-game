// Shops (M3 spec §3.9, M4 spec §3.7, M5 spec §3.7, M6 spec §3.7). Consumable prices come from CONSUMABLES[id].price
// in data/items.js; gem prices from GEMS[id].price in data/gems.js.
// SHOPS[id] = { id, name, items: [consumableId], gems?: [gemId] }. Opened by the dialogue effect
// { open: 'shop:<id>' }.
// Owner: WP3S (M3), P3 story (M4, M5, M6).

import { deepFreeze } from '../core/freeze.js';
import { C1_SHOPS } from './thareia/c1-shops.js';

const STOCK = ['hearth-tonic', 'bitterroot', 'frost-draught', 'ember-salts'];

export const SHOPS = deepFreeze({
  marta: { id: 'marta', name: 'Marta\'s Stall', items: STOCK },
  nell: { id: 'nell', name: 'Nell\'s Store', items: STOCK },
  // M4: Idris sells gems, not consumables, and never the Ash Garnet (it only comes out of Scorchgate's ash)
  idris: { id: 'idris', name: 'Idris the Gemwright', items: [], gems: ['sunstone', 'moss-agate', 'glass-pearl'] },
  // Old Ode's store at the pithead: the same stock, with the Frost Draught first (the Sunscorch burns)
  pithead: { id: 'pithead', name: 'The Pithead Store', items: ['frost-draught', 'hearth-tonic', 'bitterroot', 'ember-salts'] },
  // M5 (spec §3.7): Durra Ironhand's armoury at Ironhold: the consumables, with the Frost Draught first
  // (the Deeps' forgeborn burn), and three gems, the new Frost Opal first. Never the Sunstone or the Ash Garnet.
  durra: { id: 'durra', name: 'Durra Ironhand\'s Armoury', items: ['frost-draught', 'hearth-tonic', 'bitterroot', 'ember-salts'], gems: ['frost-opal', 'moss-agate', 'glass-pearl'] },
  // Quartermaster Quill's stores at Stormwatch: the consumables, tonics first for the ice road
  quill: { id: 'quill', name: 'Quartermaster Quill\'s Stores', items: ['hearth-tonic', 'ember-salts', 'bitterroot', 'frost-draught'] },
  // M6 (spec §3.7): Nettie's hut in Bogmire (the consumables and three gems, the new Bog Amber first; never the
  // Sunstone, the Ash Garnet or the Frost Opal), and Sedge's herbs in Willowmurk, Bitterroot first (the fen's
  // leeches bleed you; his Hearth Tonics also pay Hodge's toll one day in three)
  nettie: { id: 'nettie', name: 'Nettie\'s Hut', items: ['hearth-tonic', 'bitterroot', 'frost-draught', 'ember-salts'], gems: ['bog-amber', 'moss-agate', 'glass-pearl'] },
  sedge: { id: 'sedge', name: 'Sedge\'s Herbs', items: ['bitterroot', 'hearth-tonic', 'frost-draught', 'ember-salts'] },
  ...C1_SHOPS, // Thareia (T2): Chapter 1
});
