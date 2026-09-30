// The Warden's Masterpiece (M7 spec §4.5): the one weapon Hilda forges at the end, once the Hollow Council is beaten
// and the party holds the Worldforge page. The Warden picks a base from these and names it; it is Primal, at the
// party's level, with the best traits its base can have, and its Legend Surge is Kindle. One per save.
// rules/forge.js masterpieceOffer / forgeMasterpiece; the price is TUNING.masterpiece.
// Owner: P1 (M7).

import { deepFreeze } from '../core/freeze.js';

// the finest of each weapon kind (data/items.js)
export const MASTERPIECE_BASES = Object.freeze(['longsword', 'greatsword', 'bearded-axe', 'warhammer', 'maul', 'flanged-mace', 'boar-spear', 'longbow', 'rowan-staff', 'rondel']);

// The name the Warden gives it: 1 to 24 letters, digits, spaces, apostrophes and hyphens (shown only as text).
export const MASTERPIECE_NAME = /^[A-Za-z0-9 '-]{1,24}$/;

export const MASTERPIECE_POWER = deepFreeze({
  id: 'masterpiece-kindle', name: 'Kindle', target: 'all-allies',
  text: 'Your Masterpiece lights every hero\'s fire: Hearthlit (+1 to hit) and Warded for 20.',
  effects: [{ type: 'status', status: 'hearthlit' }, { type: 'status', status: 'warded', value: { dice: '20' } }],
});
