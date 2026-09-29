// The Unsmith's letters (M3 spec §3.1, §3.6; M4 spec §3.6; M5 spec §3.6): one per Brand, shown once
// (story['letter:<brandId>']).
// LETTERS[brandId] = { text }
// The Sunscorch Brands come in either order, so their letters never count coals. The Ironspire is
// taken in one order after the Sunscorch (M5 A4), so its letters can: the fifth coal, then the sixth.
// Owner: WP3S (M3), P3 story (M4, M5).

import { deepFreeze } from '../core/freeze.js';

export const LETTERS = deepFreeze({
  'brand-of-briars': { text: 'One coal. How touching. Ask your hearthkeeper what a hearth eats, little Warden, and watch his hands while he answers. — U.' },
  'brand-of-the-heartroot': { text: 'Two. You are making it hungry. Keep going. — U.' },
  // M4: the Sunscorch
  'brand-of-glass': { text: 'The scorpion is only glass again, and you have a warm sword. Keep it polished, little Warden. Metal melts better clean. — U.' },
  'brand-of-ash': { text: 'Scorchgate\'s Warden has finally sat down. Ask Fenwick why your hearth never needed wood. Then ask him how old he is. — U.' },
  // M5: the Ironspire. After Mother Anvil (his "first daughter"), and after Hush's heartbeat slows.
  'brand-of-iron': { text: 'Five coals, and my hammer off my first daughter. Keep it, little Warden. I have a bigger one now. Give Hild my love. — U.' },
  'brand-of-frost': { text: 'Six. Did you feel it slow, down on the ice? Every coal you light, it beats a little slower. Keep going, little Warden. — U.' },
  // M6: the Gloomfen (STUBS from the M6 scaffold; P3 writes them). The seventh coal, then the eighth.
  'brand-of-lanterns': { text: 'Seven. The fen\'s children are home, and you are a lamp in a window, little Warden. Moths come to lamps. — U.' },
  'brand-of-the-deep': { text: 'Eight. All of them lit, and the fen has stopped singing. Come down to the Hearth, little Warden. I kept you a chair. — U.' },
});
