// The Unsmith's letters (M3 spec §3.1, §3.6; M4 spec §3.6; M5 spec §3.6; M6 spec §3.6; M7 spec §3.6): one per Brand,
// shown once (story['letter:<brandId>']), and one more, his last (M7).
// LETTERS[brandId | 'hollow'] = { text }
// The Sunscorch Brands come in either order, so their letters never count coals. The Ironspire is
// taken in one order after the Sunscorch (M5 A4), so its letters can: the fifth coal, then the sixth. The
// Gloomfen is taken in one order too (M6 A4): the seventh coal, then the eighth, the last of Act II.
// Owner: WP3S (M3), P3 story (M4, M5, M6, M7).

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
  // M6: the Gloomfen. After the Lantern Mother (and after Rotbridge: he has Tamsin now), and after Lull's scene.
  'brand-of-lanterns': { text: 'Seven. You carried the fen\'s children home, little Warden. I only needed the one, and she came to me on her own. — U.' },
  'brand-of-the-deep': { text: 'Eight. Every coal lit, and the fen has stopped singing. I sent your Council four gifts. Tell them to open them together. — U.' },
  // M7 (spec §3.6): not a Brand's: the Hollow Council's last after-scene shows it (data/dialogue.js hollow-gretch-after,
  // { letter: 'hollow' }), signed with his own initial at last
  hollow: { text: 'Four chairs empty. You are very thorough, little Warden. Come down. I have kept the fire in for you. — H.' },
});
