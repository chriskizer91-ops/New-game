// The Unsmith's letters (M3 spec §3.1, §3.6; M4 spec §3.6): one per Brand, shown once
// (story['letter:<brandId>']).
// LETTERS[brandId] = { text }
// The Sunscorch Brands come in either order, so their letters never count coals.
// Owner: WP3S (M3), P3 story (M4).

import { deepFreeze } from '../core/freeze.js';

export const LETTERS = deepFreeze({
  'brand-of-briars': { text: 'One coal. How touching. Ask your hearthkeeper what a hearth eats, little Warden, and watch his hands while he answers. — U.' },
  'brand-of-the-heartroot': { text: 'Two. You are making it hungry. Keep going. — U.' },
  // M4: the Sunscorch
  'brand-of-glass': { text: 'The scorpion is only glass again, and you have a warm sword. Keep it polished, little Warden. Metal melts better clean. — U.' },
  'brand-of-ash': { text: 'Scorchgate\'s Warden has finally sat down. Ask Fenwick why your hearth never needed wood. Then ask him how old he is. — U.' },
  // M5: the Ironspire (STUBS until P3 writes them)
  'brand-of-iron': { text: 'Harrow\'s anvil is quiet at last. Did he leave the fire burning for you, or for me? — U.' },
  'brand-of-frost': { text: 'You have woken the Sleeper\'s neighbours. Listen at the ice some night, little Warden. It is listening back. — U.' },
});
