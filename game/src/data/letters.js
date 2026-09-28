// The Unsmith's letters (M3 spec §3.1, §3.6): one per Brand, shown once (story['letter:<brandId>']).
// LETTERS[brandId] = { text }
// Owner: WP3S.

import { deepFreeze } from '../core/freeze.js';

export const LETTERS = deepFreeze({
  'brand-of-briars': { text: 'One coal. How touching. Ask your hearthkeeper what a hearth eats, little Warden, and watch his hands while he answers. — U.' },
  'brand-of-the-heartroot': { text: 'Two. You are making it hungry. Keep going. — U.' },
  // M4 (spec §3.6; STUBS until WP-story writes them)
  'brand-of-glass': { text: 'Three. The glass remembers the fire that made it. So will you. — U.' },
  'brand-of-ash': { text: 'Four, and the Sunscorch is yours. Scorchgate burned for a sword once. Ask Fenwick what it burned for before that. — U.' },
});
