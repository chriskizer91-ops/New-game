// Overworld sprites (M3 spec §5.1): NPCs, map foes, objects and emotes, in the Forge style.
// Browser-only: ImageData.
//
// npcSheet(artKey) -> { img, w: 16, h: 24, foot: [8, 23], head: [8, 3] }
//   3 frames (stand, stepA, stepB) x 4 rows (s, n, e, w; w pre-mirrored), exactly like walkers.
//   Every NPC art key in data/npcs.js has a look in NPC_LOOKS; an unknown key gets a villager
//   built from a hash of the key, and a humanoid foe key reuses that foe's look.
// mapFoeSheet(artKey, { gearTier = 0, variant = null, relic } = {}) -> { img, w, h, foot, frames: 2, rows: 4, head }
//   2 frames (the two steps of the gait; hold frame 0 when standing) x rows s, n, e, w.
//   Humanoids (FOE_ART kind 'humanoid': cutpurse, bandit, tallyman, smuggler, feral-druid,
//   hollowed-ranger, tamsin, and the named holders mags, haskett, hollis, dun, vesper, oda, corra)
//   reuse the walker rig through foeLooks(), so gearTier 0-3 shows. `relic` (or FOE_ART[key].relic,
//   or for tamsin her `variant`, the starter she carries) is drawn in its slot with a glint.
//   `variant` may also be a data/foes.js variant id of the family key (bandit + 'poacher' -> haskett).
//   Beasts get dedicated 16-32 px sprites with exaggerated silhouettes (MAP_FOE_SIZE).
// objectSprite(kind, state, { frame = 0, relic, id, look } = {}) -> ImageData with .anchors.foot and
//   .frames (1 or 2). Place `foot` on the bottom-centre of the entity's tile (tile x*16+8, y*16+15);
//   tall objects rise into the tile above. Area entities (gates, walls) draw one sprite per tile.
// emote(kind, { frame = 0 } = {}) -> ImageData with .anchors.foot (put it on the sprite's head) and .frames
// NPC_LOOKS, OBJECT_KINDS, OBJECT_STATES, EMOTES, MAP_FOE_SIZE
// Owner: WP5.

import { Forge, compose, bayer } from './forge.js';
import { rigSheet, resolveGear, WALKER_W, WALKER_H, WALKER_FOOT } from './walkers.js';
import { foeLooks, relicSlot, FOE_ART } from './foes.js';
import { itemArt, itemIcon, lookFor } from './item-looks.js';
import { RELICS } from '../data/relics.js';
import { FOES } from '../data/foes.js';
import { worldMats } from './tiles.js';
import { lru } from './cache.js';

const P = pts => ({ k: 'p', pts });
const C = (a, b, ra, rb = ra) => ({ k: 'c', a, b, ra, rb });
const O = (c, r) => ({ k: 'o', c, r });
const E = (c, rx, ry) => ({ k: 'e', c, rx, ry });
const RECT = (x0, y0, x1, y1) => P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const A = (r, p) => ({ r, p });
worldMats(); // the 'w.' materials the Sunscorch people wear
const strHash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* =====================================================================
   NPCs: identity layers (heroes.js vocabulary) + gear, drawn by the walker rig
   ===================================================================== */
export const NPC_LOOKS = Object.freeze({
  fenwick: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairSilver', hair: 'crop', beard: true, eye: '#2a2030', tunic: 'wool', tabard: 'leather', pants: 'pants', boots: 'leatherDark', gloves: 'skinPale' }, gear: { offhand: { look: 'rings', glow: 'ember' } } },
  isolde: { H: { build: 'human', skin: 'skin', hairMat: 'hairBlond', hair: 'braid', eye: '#1c2a48', cloak: 'clothBlue', gloves: 'leather', boots: 'leatherDark' }, gear: { weapon: A('sword', { blade: 'steel', guardMat: 'gold', grip: 'clothBlue', pommel: 'gold', bladeL: 46 }), body: A('plate', { mat: 'steel', trim: 'gold' }), hands: A('gauntlets', { mat: 'steel', plate: 1 }) } },
  marta: { H: { build: 'brute', skin: 'skinTan', hairMat: 'hairBrown', hair: 'bun', eye: '#3a1a10', gloves: 'skinTan', boots: 'leather' }, gear: { head: A('coif', { look: 'coif', mat: 'clothWhite', band: 'paintRed' }), body: A('robe', { mat: 'robeRed', trim: 'gambeson', sash: 'clothWhite' }) } },
  refugee: { H: { build: 'youth', skin: 'skinPale', hairMat: 'hairBrown', hair: 'short', eye: '#2a2030', tunic: 'rags', pants: 'wool', boots: 'rags', gloves: 'skinPale', cloak: 'rags' }, gear: { head: A('hood', { look: 'hood', mat: 'rags', tip: 0 }), offhand: { look: 'tome', cover: 'rags' } } },
  'gate-guard': { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'short', eye: '#1c1f38', tabard: 'cloakRed', gloves: 'leather', boots: 'leather' }, gear: { weapon: A('spear', { head: 'iron', haft: 'wood', socket: 'iron' }), head: A('kettle', { look: 'kettle', mat: 'iron' }), body: A('mail', { mat: 'iron', belt: 'leather' }) } },
  hilda: { H: { build: 'brute', skin: 'skin', hairMat: 'hairCopper', hair: 'bun', eye: '#3a1a10', tunic: 'gambeson', tabard: 'leatherDark', gloves: 'leatherDark', boots: 'leatherDark' }, gear: { weapon: A('hammer', { headMat: 'iron', haft: 'wood', headW: 12, bandMat: 'iron' }), hands: A('gloves', { mat: 'leatherDark' }) } },
  dael: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairSilver', hair: 'crop', beard: true, eye: '#24381c', cloak: 'cloakGreen', gloves: 'leather', boots: 'leatherDark' }, gear: { weapon: A('sword', { blade: 'steel', guardMat: 'bronze', grip: 'leather', pommel: 'bronze', bladeL: 44 }), body: A('leather', { mat: 'leatherDark', shirt: 'hoodGreen', pauldrons: 'hoodGreen', belt: 'leather' }) } },
  nell: { H: { build: 'youth', skin: 'skinPale', hairMat: 'hairAuburn', hair: 'pony', freckles: true, eye: '#24381c', gloves: 'skinPale', boots: 'leather' }, gear: { body: A('robe', { mat: 'hoodGreen', trim: 'gambeson', sash: 'leather' }) } },
  corra: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairAuburn', hair: 'braid', eye: '#24381c', tunic: 'rags', cloak: 'cloakGreen', quiver: 'leatherDark', fletch: 'cloakGreen', gloves: 'leather', boots: 'leatherDark' }, gear: { head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'bronze' }), body: A('leather', { mat: 'leather', shirt: 'cloakGreen', pauldrons: 'iron', belt: 'leatherDark', trim: 'bronze' }), weapon: A('bow', { limb: 'bogwood', grip: 'leather' }) } },
  garret: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairSilver', hair: 'short', beard: true, eye: '#2a2030', tunic: 'wool', cloak: 'wool', gloves: 'leather', boots: 'leather' }, gear: { head: A('kettle', { look: 'kettle', mat: 'iron' }), offhand: { look: 'lantern', metal: 'iron', glow: 'ember' } } },
  miravel: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairSilver', hair: 'long', ears: 'long', eye: '#5a3a10', mantle: 'moss', gloves: 'skinTan', boots: 'bark' }, gear: { weapon: A('staff', { style: 'gnarl', haft: 'bogwood', leaves: 'moss', glow: 'verdant' }), body: A('robe', { mat: 'robeBark', trim: 'moss', sash: 'hoodGreen' }) } },
  nan: { H: { build: 'dwarf', skin: 'skinTan', hairMat: 'hairSilver', hair: 'bun', eye: '#2a2030', mantle: 'wool', gloves: 'skinTan', boots: 'leather' }, gear: { body: A('robe', { mat: 'robeBark', trim: 'leather', sash: 'wool' }), offhand: { look: 'tome', cover: 'wood' } } },
  ivo: { H: { build: 'human', skin: 'skin', hairMat: 'hairBrown', hair: 'crop', eye: '#1c1f38', gloves: 'skin', boots: 'robe' }, gear: { body: A('robe', { mat: 'gambeson', trim: 'string', sash: 'string' }), amulet: A('amulet', { metal: 'bronze', gem: 'topaz', chain: 'string' }) } },
  pilgrim: { H: { build: 'human', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'short', eye: '#2a2030', cloak: 'wool', gloves: 'skinDeep', boots: 'robe' }, gear: { head: A('hood', { look: 'hood', mat: 'wool', tip: 1 }), body: A('robe', { mat: 'gambeson', trim: 'wool', sash: 'leather' }), weapon: A('staff', { style: 'crook', haft: 'wood' }) } },
  tamsin: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'pony', eye: '#2a2030', cloak: 'cloakRed', gloves: 'leather', boots: 'leatherDark' }, gear: { weapon: A('sword', { blade: 'steel', guardMat: 'bronze', grip: 'leatherRed', pommel: 'bronze', bladeL: 44 }), body: A('leather', { mat: 'leatherRed', shirt: 'wool', belt: 'leatherDark', trim: 'bronze' }) } },
  vesper: { H: { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'crop', eye: '#1a1a1a', tunic: 'clothGrey', cloak: 'clothGrey', gloves: 'skinAsh', boots: 'leatherDark' }, gear: { body: A('robe', { mat: 'clothGrey', trim: 'gold', sash: 'leatherDark' }), offhand: { look: 'orb', metal: 'bronze', gem: 'amber' } } },
  rotwarden: { H: { build: 'brute', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', cloak: 'rotwood', tunic: 'rotwood', pants: 'rotwood', boots: 'bark', gloves: 'bark' }, gear: { head: 'ichor-mask', body: A('plate', { mat: 'rotwood', trim: 'bark' }), amulet: 'first-seed' } },
  // M4: the Sunscorch (desert dress: turbans, veils and kaftans; 'wrap', 'fez' and 'cap' are walkers.js head looks)
  zara: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'long', eye: '#3a1a10', cloak: 'robeRed', gloves: 'skinTan', boots: 'leatherRed' }, gear: { head: { look: 'wrap', mat: 'w.saffron', band: 'robeRed', tall: 1, gem: 'ruby', tail: 'w.indigo' }, body: { kind: 'robe', mat: 'w.indigo', trim: 'gold', sash: 'robeRed' }, amulet: { metal: 'gold', gem: 'topaz' } } },
  qasim: { H: { build: 'brute', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'short', beard: true, eye: '#1a1a1a', cloak: 'clothTeal', mantle: 'clothTeal', gloves: 'skinDeep', boots: 'leatherRed' }, gear: { head: { look: 'wrap', mat: 'clothWhite', gem: 'seaglass', tail: false }, body: { kind: 'robe', mat: 'clothWhite', trim: 'gold', sash: 'clothTeal' }, weapon: A('staff', { style: 'orb', haft: 'bogwood', metal: 'gold', glow: 'w.oasis' }) } },
  idris: { H: { build: 'dwarf', skin: 'skinTan', hairMat: 'hairSilver', hair: 'short', beard: true, eye: '#2a2030', gloves: 'skinTan', boots: 'leatherRed', pants: 'wool', trinket: { kind: 'pouch', mat: 'leatherRed' } }, gear: { head: { look: 'fez', mat: 'robeRed', trim: 'gold' }, body: { kind: 'leather', mat: 'hoodGreen', shirt: 'clothWhite', belt: 'leatherRed', trim: 'gold' }, offhand: { look: 'orb', metal: 'gold', gem: 'amethyst' } } },
  'spire-guard': { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'short', eye: '#1c1f38', scarf: 'clothWhite', tabard: 'w.saffron', cloak: 'w.canvas', gloves: 'leather', boots: 'leatherRed' }, gear: { weapon: A('spear', { head: 'steel', haft: 'bogwood', socket: 'bronze', ribbon: 'w.saffron', wings: 1 }), head: { look: 'wrap', style: 'helm', mat: 'clothWhite', metal: 'steel', trim: 'gold', tail: false }, body: { kind: 'mail', mat: 'iron', belt: 'leatherRed' } } },
  'water-seller': { H: { build: 'youth', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'crop', eye: '#2a2030', gloves: 'skinDeep', boots: 'leather', pants: 'w.canvas', trinket: { kind: 'gourd', mat: 'bronze' } }, gear: { head: { look: 'kettle', mat: 'thorn', trim: 'clothBlue' }, body: { kind: 'leather', mat: 'clothBlue', shirt: 'clothWhite', sash: 'clothTeal' }, offhand: { look: 'jar', mat: 'rust', band: 'clothWhite' } } },
  luma: { H: { build: 'youth', skin: 'skinTan', hairMat: 'hairCopper', hair: 'pony', eye: '#24381c', goggles: 'bronze', lens: 'seaglass', mantle: 'clothTeal', gloves: 'leather', boots: 'leatherDark', pants: 'pants' }, gear: { body: { kind: 'leather', mat: 'leather', shirt: 'w.canvas', belt: 'leatherDark', trim: 'bronze' }, weapon: A('hammer', { headMat: 'bronze', haft: 'wood', headW: 10, bandMat: 'leatherDark' }), amulet: { metal: 'bronze', gem: 'topaz' } } },
  ode: { H: { build: 'brute', skin: 'skinTan', hairMat: 'hairSilver', hair: 'none', beard: true, eye: '#2a2030', gloves: 'skinTan', boots: 'leatherDark', pants: 'wool' }, gear: { body: { kind: 'leather', mat: 'leatherDark', shirt: 'wool', belt: 'leather' }, offhand: { look: 'lantern', metal: 'bronze', glow: 'amber' } } },
  miner: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBrown', hair: 'short', eye: '#2a2030', scarf: 'robeRed', gloves: 'leatherDark', boots: 'leatherDark', pants: 'wool' }, gear: { head: { look: 'cap', mat: 'leather', metal: 'bronze', glow: 'amber' }, body: { kind: 'leather', mat: 'leatherDark', shirt: 'wool', belt: 'leather' }, weapon: A('pick', { haft: 'wood', headMat: 'iron' }) } },
  sabah: { H: { build: 'human', skin: 'skinDeep', hairMat: 'hairSilver', hair: 'long', eye: '#2a2030', gloves: 'skinDeep', boots: 'leather' }, gear: { head: { look: 'hood', mat: 'clothWhite', tip: 0, trim: 'gold' }, body: { kind: 'robe', mat: 'clothBlue', trim: 'clothWhite', sash: 'gold' }, offhand: { look: 'jar', mat: 'bronze', band: 'clothTeal' } } },
  'pilgrim-mw': { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBrown', hair: 'short', beard: true, eye: '#2a2030', cloak: 'rags', gloves: 'skinTan', boots: 'leather', trinket: { kind: 'gourd', mat: 'w.saffron' } }, gear: { head: { look: 'wrap', mat: 'clothTeal', tail: 'clothTeal' }, body: { kind: 'robe', mat: 'w.canvas', trim: 'leather', sash: 'leather' }, weapon: A('staff', { style: 'crook', haft: 'wood' }) } },
  cinder: { H: { build: 'human', skin: 'skinAsh', hairMat: 'hairSilver', hair: 'none', beard: true, eye: '#3a1a10', cloak: 'w.char', gloves: 'skinAsh', boots: 'w.char' }, gear: { head: { look: 'hood', mat: 'w.char', tip: 0, trim: 'w.ash' }, body: { kind: 'robe', mat: 'clothGrey', trim: 'w.char', sash: 'string' }, offhand: { look: 'lantern', metal: 'blackiron', glow: 'ember' } } },
  'ashen-warden': { H: { build: 'brute', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', cloak: 'w.char', tunic: 'w.char', pants: 'w.char', boots: 'blackiron', gloves: 'blackiron' }, gear: { head: { look: 'helm', mat: 'blackiron', eyes: 'ember', glowEyes: 1, crest: 'ember', trim: 'gold' }, body: { kind: 'plate', mat: 'blackiron', trim: 'bronze' }, offhand: { look: 'tower', face: 'w.char', rim: 'bronze', boss: 'ember' }, weapon: A('sword', { blade: 'blackiron', guardMat: 'bronze', grip: 'leatherDark', pommel: 'bronze', fuller: 'ember', bladeL: 52 }) } },
});
const SKINS = ['skin', 'skinPale', 'skinTan', 'skinDeep'], HAIRS = ['hairBrown', 'hairBlack', 'hairAuburn', 'hairBlond', 'hairSilver', 'hairCopper'], STYLES = ['short', 'crop', 'long', 'pony', 'bun'];
const TUNICS = ['wool', 'gambeson', 'rags', 'clothBlue', 'hoodGreen', 'robeRed'];
function villager(key) {
  const h = strHash(key), pick = (a, s) => a[(h >>> s) % a.length];
  return { H: { build: (h & 3) === 3 ? 'brute' : 'human', skin: pick(SKINS, 2), hairMat: pick(HAIRS, 5), hair: pick(STYLES, 9), eye: '#2a2030', tunic: pick(TUNICS, 13), gloves: pick(SKINS, 2), boots: 'leather' }, gear: {} };
}
// people met both as NPCs and as foes wear their battle look (art/foes.js) so they read as the same person
const FOE_FIRST = new Set(['tamsin', 'vesper']);
const npcCache = lru(48);
export function npcSheet(artKey) {
  const img = npcCache.get(String(artKey), () => {
    let look = FOE_FIRST.has(artKey) ? null : NPC_LOOKS[artKey];
    if (!look && FOE_ART[artKey] && FOE_ART[artKey].kind === 'humanoid') { const f = foeLooks(artKey, { gearTier: 0 }); if (f.H) look = { H: f.H, gear: f.gear }; }
    if (!look) look = NPC_LOOKS[artKey];
    if (!look) look = villager(artKey);
    const { L, M } = resolveGear(look.gear);
    return rigSheet(look.H, L, { meta: M });
  });
  return { img, w: WALKER_W, h: WALKER_H, foot: WALKER_FOOT.slice(), head: [8, 3] };
}

/* =====================================================================
   Map foes
   ===================================================================== */
export const MAP_FOE_SIZE = Object.freeze({
  briarling: [16, 16], thornhound: [24, 16], boglurcher: [24, 16], glowcap: [16, 16], rotgrub: [16, 12],
  rotstag: [32, 32], oldsnag: [32, 24], briarmaw: [32, 32], gloamwing: [32, 32], mirelord: [32, 32], sapwight: [16, 24], rotwarden: [32, 32],
  'sand-skink': [16, 12], 'glass-scorpion': [24, 16], 'glass-matriarch': [32, 24], 'mirage-wisp': [16, 20],
  'wisp-queen': [32, 32], 'sand-wyrm': [32, 32], gnash: [32, 32], kharzul: [48, 32], 'ashen-warden': [32, 32],
});
// a relic's look for the walker rig, in its slot (relics without RELIC_ART fall back to their kind's art)
function relicLook(relic) {
  const slot = relicSlot(relic) || (RELICS[relic] && RELICS[relic].slot) || null;
  if (!slot) return null;
  const R = RELICS[relic];
  const art = itemArt(relic) || (R ? itemArt({ kind: R.kind, rarity: R.rarity || 'heirloom', aspect: R.aspect, seed: strHash(relic) % 997 }) : null);
  const look = art ? lookFor(slot, art) : null;
  return look ? { slot, look } : null;
}
// M4: a Sunscorch family's named variant -> its own map sprite (the ids are fixed by the M4 spec §3.2-§3.3)
const SUN_VARIANT = { 'dune-raider:rider': 'rasa', 'dune-raider:raider-king': 'gnash', 'glass-scorpion:matriarch': 'glass-matriarch', 'mirage-wisp:queen': 'wisp-queen',
  'ash-wight:captain': 'ash-captain', 'tallyman:foreman': 'brask', 'tallyman:quartermaster': 'quartermaster', 'smuggler:sharpshooter': 'vell' };
function resolveFoeKey(artKey, variant) {
  if (variant && SUN_VARIANT[artKey + ':' + variant]) return SUN_VARIANT[artKey + ':' + variant];
  if (variant && FOES[artKey] && FOES[artKey].variants && FOES[artKey].variants[variant]) {
    const a = FOES[artKey].variants[variant].art;
    if (a && (FOE_ART[a] || MAP_FOE_SIZE[a])) return a;
  }
  return artKey;
}
/* M4 humanoid map foes: the Sunscorch families and named holders through the walker rig, one gear kit per
   gearTier (the Waking re-gear). They take precedence over foeLooks() for these keys. A holder's own relic
   is drawn by its relicLook in relicSlot unless RELIC_ART has the real piece (own: always this look), and
   glintAt names where it glints when that is a place M3 never glinted (boots, a lantern, a belt key). */
const scim = (blade, guard = 'bronze', o = {}) => A('sword', Object.assign({ blade, guardMat: guard, grip: 'leatherDark', pommel: guard, bladeL: 42, shape: 'fang', curve: 1 }, o));
const knife = (blade, o = {}) => A('dagger', Object.assign({ blade, guardMat: 'iron', grip: 'leather', pommel: 'iron', bladeL: 30 }, o));
const blade = (blade, guard, o = {}) => A('sword', Object.assign({ blade, guardMat: guard, grip: 'leatherDark', pommel: guard, bladeL: 44 }, o));
const wrap = (mat, o = {}) => Object.assign({ look: 'wrap', mat, tail: mat }, o);
const WIGHT = { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'w.char', pants: 'w.char', boots: 'blackiron', gloves: 'w.char', tabard: 'robeRed' };
const TALLY = { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'leatherDark', shade: true, shadeEyes: 'amber' };
const SUN_FOES = {
  scavenger: {
    H: { build: 'youth', skin: 'skinTan', hairMat: 'hairBlack', hair: 'crop', eye: '#2a2030', tunic: 'rags', pants: 'wool', boots: 'leatherDark', gloves: 'skinTan', scarf: 'clothTeal', quiver: 'leather', fletch: 'w.canvas' },
    gear: [
      { weapon: knife('rust'), head: wrap('leatherRed', { tail: 'rags' }) },
      { weapon: knife('iron'), head: wrap('leatherRed', { tail: 'rags' }), body: { kind: 'leather', mat: 'leather', shirt: 'rags', belt: 'leatherDark' }, H: { goggles: 'iron', lens: 'w.glass' } },
      { weapon: scim('iron', 'iron'), head: { look: 'kettle', mat: 'rust' }, body: { kind: 'mail', mat: 'iron', belt: 'leather' }, H: { goggles: 'iron', lens: 'w.glass' } },
      { weapon: knife('steel', { fuller: 'amber' }), head: { look: 'hood', mat: 'dark', tip: 1, trim: 'bronze' }, body: { kind: 'leather', mat: 'leatherDark', shirt: 'w.canvas', studs: 'bronze', pauldrons: 'bronze', belt: 'leatherDark' }, H: { goggles: 'bronze', lens: 'amber', cloak: 'rags' } },
    ],
  },
  'dune-raider': {
    H: { build: 'human', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'short', eye: '#1a1a1a', tunic: 'w.indigo', pants: 'w.indigo', boots: 'leatherDark', gloves: 'leatherDark', scarf: 'w.indigo', cloak: 'w.canvas' },
    gear: [
      { weapon: scim('iron'), head: wrap('w.indigo'), body: { kind: 'leather', mat: 'leatherDark', shirt: 'w.indigo', belt: 'leather' } },
      { weapon: scim('steel'), offhand: { look: 'round', face: 'w.terra', rim: 'bronze', boss: 'bronze' }, head: wrap('w.indigo', { gem: 'bronze' }), body: { kind: 'leather', mat: 'leatherDark', shirt: 'w.indigo', belt: 'leather', trim: 'bronze' } },
      { weapon: scim('steel', 'gold'), offhand: { look: 'round', face: 'w.indigo', rim: 'steel', boss: 'gold' }, head: wrap('w.indigo', { style: 'helm', metal: 'steel', trim: 'gold', tail: false }), body: { kind: 'mail', mat: 'iron', belt: 'leather', trim: 'w.indigo' } },
      { weapon: scim('steel', 'gold', { fuller: 'storm' }), offhand: { look: 'round', face: 'w.indigo', rim: 'gold', boss: 'stormglass' }, head: wrap('dark', { style: 'helm', metal: 'blackiron', trim: 'storm', tail: false }), body: { kind: 'mail', mat: 'steel', belt: 'leatherDark', trim: 'storm', pauldrons: 'blackiron' }, H: { cloak: 'w.indigo', scarf: 'dark' } },
    ],
  },
  'ash-wight': {
    H: WIGHT,
    gear: [
      { weapon: blade('rust', 'blackiron'), head: { look: 'helm', mat: 'w.char', eyes: 'ember', glowEyes: 1, crest: null }, body: { kind: 'mail', mat: 'blackiron', belt: 'w.char' } },
      { weapon: blade('rust', 'blackiron'), offhand: { look: 'round', face: 'w.char', rim: 'blackiron', boss: 'rust' }, head: { look: 'helm', mat: 'w.char', eyes: 'ember', glowEyes: 1, crest: null }, body: { kind: 'mail', mat: 'blackiron', belt: 'w.char', trim: 'robeRed' } },
      { weapon: blade('iron', 'blackiron'), offhand: { look: 'round', face: 'w.char', rim: 'blackiron', boss: 'rust' }, head: { look: 'helm', mat: 'blackiron', eyes: 'ember', glowEyes: 1, crest: 'w.char' }, body: { kind: 'plate', mat: 'blackiron', trim: 'w.char' } },
      { weapon: blade('blackiron', 'bronze', { fuller: 'ember' }), offhand: { look: 'heater', face: 'w.char', rim: 'bronze', boss: 'ember' }, head: { look: 'helm', mat: 'blackiron', eyes: 'ember', glowEyes: 1, crest: 'ember' }, body: { kind: 'plate', mat: 'blackiron', trim: 'ember' }, H: { cloak: 'w.char' } },
    ],
  },
  // the named holders (M4 spec §3.3)
  rasa: {
    relic: 'sandwalkers', relicSlot: 'feet', relicLook: { mat: 'bronze', trim: 'w.saffron', greave: 'gold', heirloom: true }, glintAt: ['feet'],
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairAuburn', hair: 'braid', eye: '#3a1a10', tunic: 'w.indigo', pants: 'w.indigo', boots: 'leatherDark', gloves: 'leather', scarf: 'robeRed', cloak: 'robeRed' },
    gear: [0, 1, 2, 3].map(t => ({
      weapon: A('spear', { head: t >= 2 ? 'steel' : 'iron', haft: 'bogwood', socket: 'bronze', ribbon: 'robeRed', wings: t >= 1 ? 1 : 0, fuller: t >= 3 ? 'storm' : null }),
      head: wrap('clothWhite', { tail: 'robeRed', gem: t >= 3 ? 'stormglass' : 'topaz', style: t >= 2 ? 'helm' : null, metal: 'bronze', trim: 'gold' }),
      body: { kind: t >= 2 ? 'mail' : 'leather', mat: t >= 2 ? 'bronze' : 'leatherDark', shirt: 'w.indigo', belt: 'robeRed', trim: t >= 3 ? 'storm' : 'gold' },
    })),
  },
  'ash-captain': {
    relic: 'scorchgate-key', relicSlot: 'trinket', glintAt: ['trinket'],
    H: Object.assign({}, WIGHT, { cloak: 'robeRed', trinket: { kind: 'key', mat: 'blackiron', gem: 'ember' } }),
    gear: [0, 1, 2, 3].map(t => ({
      weapon: blade(t >= 2 ? 'blackiron' : 'iron', 'bronze', { bladeL: 50, fuller: t >= 3 ? 'ember' : null }),
      head: { look: 'helm', mat: 'blackiron', eyes: 'ember', glowEyes: 1, crest: t >= 3 ? 'ember' : 'w.char', plume: 'robeRed', trim: 'bronze' },
      body: { kind: 'plate', mat: 'blackiron', trim: t >= 1 ? 'bronze' : 'w.char', pauldrons: t >= 2 ? 'bronze' : 'blackiron' },
    })),
  },
  brask: {
    relic: 'sunstone-lantern', relicSlot: 'offhand', relicLook: { look: 'lantern', metal: 'bronze', glow: 'amber' }, own: true, glintAt: ['offhand'],
    H: Object.assign({}, TALLY, { build: 'brute', ledger: 'leatherDark' }),
    gear: [0, 1, 2, 3].map(t => ({
      weapon: A('pick', { haft: 'wood', headMat: t >= 2 ? 'steel' : 'iron' }),
      head: { look: 'cap', mat: t >= 3 ? 'blackiron' : 'clothGrey', metal: 'bronze', glow: 'amber' },
      body: { kind: 'robe', mat: 'clothGrey', trim: t >= 3 ? 'blight' : t >= 1 ? 'iron' : 'wool', sash: 'leatherDark', sleeve: t >= 2 ? 'iron' : null },
      H: t >= 2 ? { mantle: t >= 3 ? 'blackiron' : 'iron' } : null,
    })),
  },
  quartermaster: {
    H: Object.assign({}, TALLY, { trinket: { kind: 'ledger', mat: 'leatherDark' } }),
    gear: [0, 1, 2, 3].map(t => ({
      weapon: knife(t >= 2 ? 'steel' : 'iron', t >= 3 ? { fuller: 'blight' } : {}),
      head: { look: 'kettle', mat: 'leatherDark', trim: t >= 1 ? 'gold' : 'clothGrey' },
      body: { kind: 'robe', mat: 'clothGrey', trim: t >= 3 ? 'blight' : 'gold', sash: 'leatherDark' },
      H: t >= 2 ? { mantle: 'iron' } : null,
    })),
  },
  vell: {
    relic: 'saltglass', relicSlot: 'weapon', relicLook: Object.assign(A('bow', { limb: 'pearl', grip: 'clothTeal', gem: 'seaglass', tassel: 'clothTeal' }), { relic: true }),
    H: { build: 'human', skin: 'skinPale', hairMat: 'hairSilver', hair: 'pony', eye: '#1c2a24', tunic: 'clothTeal', pants: 'wool', boots: 'leatherDark', gloves: 'leather', quiver: 'leatherDark', fletch: 'clothWhite', cloak: 'w.canvas' },
    gear: [0, 1, 2, 3].map(t => ({
      weapon: A('bow', { limb: 'wood', grip: 'leather' }),
      head: { look: 'kettle', mat: 'leatherDark', trim: 'clothTeal' },
      body: { kind: 'leather', mat: 'leatherDark', shirt: 'clothTeal', belt: 'leather', studs: t >= 2 ? 'bronze' : null, pauldrons: t >= 3 ? 'steel' : null, trim: t >= 1 ? 'bronze' : null },
    })),
  },
};
function sunFoeSheet(key, gT, rel) {
  const S = SUN_FOES[key], kit = S.gear[gT] || S.gear[0], H = Object.assign({}, S.H, kit.H || {}), gear = Object.assign({}, kit);
  delete gear.H;
  const mine = rel && rel === S.relic, real = mine && !S.own && typeof rel === 'string' ? itemArt(rel) : null;
  if (mine && S.relicLook && !real) gear[S.relicSlot] = S.relicLook;
  const { L, M } = resolveGear(gear);
  if (mine && !real) { if (S.relicSlot !== 'trinket') M[S.relicSlot] = { heirloom: true, relic: true }; if (S.glintAt) M.glintAt = S.glintAt; }
  else if (rel) { const r = relicLook(rel); if (r) { L[r.slot] = r.look; M[r.slot] = { heirloom: true, relic: true }; if (r.slot === 'feet' || r.slot === 'offhand') M.glintAt = [r.slot]; } }
  if (!mine && S.relicSlot === 'trinket') delete H.trinket;
  return rigSheet(H, L, { meta: M, frames: 2, pick: k => k + 1 });
}
const foeCache = lru(64);
export function mapFoeSheet(artKey, { gearTier = 0, variant = null, relic } = {}) {
  const key = resolveFoeKey(artKey, variant), gT = Math.max(0, Math.min(3, gearTier | 0));
  if (SUN_FOES[key]) {
    const rel = relic !== undefined ? relic : SUN_FOES[key].relic || null;
    const img = foeCache.get(`s|${key}|${gT}|${rel || '-'}`, () => sunFoeSheet(key, gT, rel));
    return { img, w: WALKER_W, h: WALKER_H, foot: WALKER_FOOT.slice(), frames: 2, rows: 4, head: [8, 3] };
  }
  const def = FOE_ART[key], beast = BEASTS[key] || (def && def.kind === 'beast' && BEASTS[def.aliasOf]);
  if (beast && (SUN_BEASTS.has(key) || !(def && def.kind === 'humanoid'))) {
    const [w, h] = MAP_FOE_SIZE[key] || MAP_FOE_SIZE[def && def.aliasOf] || [16, 16];
    const rel = relic === undefined ? SUN_BEAST_RELIC[key] || (def && def.relic) || null : relic;
    const img = foeCache.get(`b|${key}|${gT}|${rel || '-'}`, () => beastSheet(beast, w, h, { gT, relic: rel }));
    return { img, w, h, foot: [w >> 1, h - 1], frames: 2, rows: 4, head: [w >> 1, 1] };
  }
  // humanoid (or anything unknown): the walker rig with the foe's own looks
  const rel = relic !== undefined ? relic : key === 'tamsin' && variant && RELICS[variant] ? variant : def && def.relic || null;
  const img = foeCache.get(`h|${key}|${gT}|${rel || '-'}|${key === 'tamsin' ? variant || '' : ''}`, () => {
    let H, L = {}, M = {};
    const f = def ? foeLooks(key, { gearTier: gT }) : { H: null };
    if (f.H) { H = f.H; L = Object.assign({}, f.gear); } else { const v = NPC_LOOKS[key] || villager(key); H = v.H; ({ L, M } = resolveGear(v.gear)); }
    if (key === 'tamsin' && !L.hands) { const g = relicLook('vale-gauntlets'); if (g) { L.hands = g.look; M.hands = { heirloom: true, relic: true }; } }
    if (rel) { const r = relicLook(rel); if (r) { L[r.slot] = r.look; M[r.slot] = { heirloom: true, relic: true }; } }
    return rigSheet(H, L, { meta: M, frames: 2, pick: k => k + 1 });
  });
  return { img, w: WALKER_W, h: WALKER_H, foot: WALKER_FOOT.slice(), frames: 2, rows: 4, head: [8, 3] };
}

/* =====================================================================
   Beasts: dedicated map sprites (never downscaled battle art), 2 gait frames x s/n/e (w mirrored)
   st = { dir: 's'|'n'|'e', f: 0|1, w, h, gT, relic, anchors: { eyes, glint, halo } }
   ===================================================================== */
const spike = (at, ang, len, wd = .8) => { const c = Math.cos(ang), s = Math.sin(ang); return P([[at[0] - s * wd, at[1] + c * wd], [at[0] + c * len, at[1] + s * len], [at[0] + s * wd, at[1] - c * wd]]); };
const FAR = () => -1;
const EYE = { amber: [248, 200, 90], red: [240, 58, 42], blight: [180, 214, 90], dark: [22, 18, 26], gold: [245, 205, 88], pale: [236, 230, 214] };
const eyeCol = gT => (gT >= 2 ? EYE.red : EYE.amber);
const fur = seed => q => (((q.x * 2 + q.y + seed) % 5) === 0 ? -1 : 0);

function briarling(F, st) {
  const { dir, f, gT, anchors } = st, e = dir === 'e', bob = f ? .7 : 0, cx = e ? 7.6 : 8, cy = 8.4 + bob;
  const feet = e ? [[5.2 + (f ? 1.2 : -.6), 15], [10 + (f ? -1 : .8), 15]] : [[5.6, 15 - (f ? 0 : .8)], [10.4, 15 - (f ? .8 : 0)]];
  feet.forEach(([x, y], k) => F.add({ mat: 'bark', prof: 'round', bw: .6, grp: 'leg' + k, shapes: [C([cx + (x - 8) * .5, cy + 2.6], [x, y - .5], .9, .6)], tex: e && !k ? FAR : null }));
  const n = 6 + gT * 2, thorns = [];
  for (let k = 0; k < n; k++) { const a = Math.PI * (1.05 + .9 * k / (n - 1)) + (e ? .15 : 0); thorns.push(spike([cx + Math.cos(a) * 4.4, cy + Math.sin(a) * 4], a, 2.4 + (gT >= 2 && k % 2 ? .8 : 0), .75)); }
  F.add({ mat: gT >= 3 ? 'rot' : 'thorn', prof: 'ridge', grp: 'thorns', shapes: thorns });
  F.add({ mat: 'bramble', prof: 'round', bw: 3, grp: 'body', shapes: [E([cx, cy], 5.3, 4.9)], tex: q => ((q.x * 2 + q.y * 3) % 7 === 0 ? -1 : 0) + ((q.x + 2 * q.y) % 6 === 0 ? { m: 'bark', dd: 0 } : 0) });
  if (gT >= 1) F.add({ mat: gT >= 3 ? 'blight' : 'verdant', prof: 'flat', grp: 'buds', noShadow: true, shapes: [O([cx - 2.4, cy - 1.8], .55), O([cx + 2.2, cy + 1.6], .55)] });
  if (dir !== 'n') anchors.eyes = e ? [[cx + 2.6, cy - .6, eyeCol(gT)]] : [[cx - 1.8, cy - .4, eyeCol(gT)], [cx + 1.4, cy - .4, eyeCol(gT)]];
}
function thornhound(F, st) {
  const { dir, f, gT, anchors } = st, g = f ? 1.1 : -1.1;
  const fur1 = gT >= 3 ? 'rot' : 'wolfFur', spines = 4 + gT;
  if (dir === 'e') {
    F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'legF', tex: FAR, shapes: [C([16, 10], [16.8 - g, 15.2], 1, .75), C([8, 10.5], [7.2 + g, 15.2], 1.05, .75)] });
    F.add({ mat: fur1, prof: 'round', bw: .6, grp: 'tail', shapes: [C([4.6, 8.4], [1.4, 5.6 - f * .6], 1.1, .5)] });
    F.add({ mat: gT >= 2 ? 'rot' : 'thorn', prof: 'ridge', grp: 'spine', shapes: Array.from({ length: spines }, (_, k) => spike([6.6 + k * (9 / spines), 6.6 - Math.sin(k / spines * 3) * .6], -Math.PI / 2 - .5, 2.4 + (k % 2) * .8 + gT * .3, .8)) });
    F.add({ mat: fur1, prof: 'round', bw: 2, grp: 'body', shapes: [E([11, 9.2], 6.4, 3.1), E([15.6, 8.4], 2.8, 2.9)], tex: fur(1) });
    F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'legN', shapes: [C([15, 10.8], [14.4 + g, 15.2], 1.05, .8), C([8.6, 11], [9.4 - g, 15.2], 1.1, .8)] });
    F.add({ mat: fur1, prof: 'round', bw: 1.6, grp: 'head', shapes: [E([18.8, 6.4], 3, 2.4), C([20.4, 7.3], [23.2, 7.9], 1.35, 1)] });
    F.add({ mat: 'wolfPale', prof: 'round', bw: .6, grp: 'jaw', noShadow: true, shapes: [C([20.8, 8.6], [22.8, 8.9], .55)] });
    F.add({ mat: fur1, prof: 'round', bw: .6, grp: 'ear', shapes: [P([[17.2, 4.8], [18, 1.8], [19.6, 4.4]])] });
    anchors.eyes = [[19.9, 5.9, eyeCol(gT)], [23.3, 7.5, EYE.dark]];
    return;
  }
  const s = dir === 's', l1 = f ? .8 : 0, l2 = f ? 0 : .8;
  F.add({ mat: gT >= 2 ? 'rot' : 'thorn', prof: 'ridge', grp: 'spine', shapes: Array.from({ length: spines }, (_, k) => spike([8.5 + k * (7 / (spines - 1 || 1)), s ? 5.6 : 6.2], -Math.PI / 2 + (k - (spines - 1) / 2) * .22, 2.4 + (k % 2) * .9 + gT * .3, .75)) });
  if (!s) F.add({ mat: fur1, prof: 'round', bw: 1.4, grp: 'headB', shapes: [E([12, 4.6], 2.8, 2.2), P([[9.4, 3.8], [9.2, .8], [11, 3]]), P([[14.6, 3.8], [14.8, .8], [13, 3]])] });
  F.add({ mat: fur1, prof: 'round', bw: 2, grp: 'body', shapes: [E([12, s ? 8.6 : 9.6], s ? 4.4 : 4.7, s ? 3.4 : 3.9)], tex: fur(2) });
  if (!s) F.add({ mat: fur1, prof: 'round', bw: .6, grp: 'tail', shapes: [C([12, 7.4], [12.6 + (f ? .8 : -.8), 3.4], 1, .5)] });
  F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'legs', shapes: [C([10.2, 11], [10, 15.2 - l1], 1.05, .8), C([13.8, 11], [14, 15.2 - l2], 1.05, .8)] });
  if (s) {
    F.add({ mat: fur1, prof: 'round', bw: 1.6, grp: 'chest', shapes: [E([12, 10.6], 3.1, 2.6)] });
    F.add({ mat: fur1, prof: 'round', bw: 1.8, grp: 'head', shapes: [E([12, 7], 3.4, 3), P([[9.4, 5], [8.4, 1.6], [11, 4.2]]), P([[14.6, 5], [15.6, 1.6], [13, 4.2]])], tex: fur(3) });
    F.add({ mat: 'wolfPale', prof: 'round', bw: 1, grp: 'snout', shapes: [E([12, 9.2], 1.7, 1.35)] });
    anchors.eyes = [[10.5, 6.4, eyeCol(gT)], [13.5, 6.4, eyeCol(gT)], [11.6, 8.5, EYE.dark]];
  }
}
function boglurcher(F, st) {
  const { dir, f, gT, anchors } = st, sq = f ? .45 : -.2, e = dir === 'e';
  const skin = gT >= 3 ? 'rot' : 'bogwood', weed = gT >= 2 ? 'rot' : 'seaweed';
  if (dir !== 'n') {
    const stalks = e ? [[[14.6, 8], [15.8, 3.6 - sq]], [[17.4, 8.4], [19.2, 4.6 - sq]]] : [[[9.6, 7.6], [8.8, 3.4 - sq]], [[14.4, 7.6], [15.2, 3.4 - sq]]];
    F.add({ mat: skin, prof: 'round', bw: .6, grp: 'stalks', shapes: stalks.map(([a, b]) => C(a, b, .8, .6)) });
    F.add({ mat: 'bone', prof: 'round', bw: 1, grp: 'eyes', shapes: stalks.map(([, b]) => O(b, 1.25)) });
    anchors.eyes = stalks.map(([, b]) => [b[0] + (e ? .5 : 0), b[1] + .2, gT >= 2 ? EYE.red : EYE.dark]);
  }
  F.add({ mat: skin, prof: 'round', bw: 3, grp: 'body', shapes: [E([e ? 11.4 : 12, 10.6 - sq * .5], 9.2 + sq, 5.1 - sq)], tex: q => ((q.x * 3 + q.y * 2) % 7 < 2 && q.y > 7 ? { m: weed, dd: -.3 } : ((q.x + q.y) % 5 === 0 ? -1 : 0)) });
  F.add({ mat: weed, prof: 'round', bw: .5, grp: 'drips', noShadow: true, shapes: [C([6, 12], [5.6, 15], .55), C([17.5, 12.6], [17.8, 15], .5), C([11.4, 13], [11.2, 15.2], .45)] });
  if (dir === 's') F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [C([8.2, 12.2], [15.8, 12.2], .6)] });
  if (e) F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [C([16.6, 12], [20.2, 11.2], .55)] });
}
function glowcap(F, st) {
  const { dir, f, gT, anchors } = st, bob = f ? .7 : 0, e = dir === 'e';
  const glow = gT >= 3 ? 'blight' : 'water';
  F.add({ mat: 'bone', prof: 'round', bw: .7, grp: 'feet', shapes: [E([5.8 + (e && f ? 1 : 0), 15], 1.6, .9), E([10.2 - (e && f ? 1 : 0), 15], 1.6, .9)] });
  F.add({ mat: 'bone', prof: 'round', bw: 2, grp: 'stalk', shapes: [E([8, 11.6], 3.1, 3.3)], tex: q => (q.y % 3 === 0 ? -1 : 0) });
  F.add({ mat: glow, prof: 'flat', grp: 'gill', noShadow: true, shapes: [E([8, 8.3 + bob], 5.4, 1.3)], tex: () => (f ? .4 : -.3) });
  F.add({ mat: gT >= 2 ? 'rot' : 'wood', prof: 'round', bw: 2.6, grp: 'cap', shapes: [E([8, 5.9 + bob], 6.6, 3.9)], cuts: [E([8, 9.6 + bob], 5.4, 1.4)], tex: q => (((q.x - 3) % 4 === 0 && (q.y + (q.x >> 2)) % 3 === 0) ? { m: 'bone', dd: 0 } : 0) });
  if (dir !== 'n') anchors.eyes = e ? [[9.6, 11, EYE.dark]] : [[6.6, 11, EYE.dark], [9.4, 11, EYE.dark]];
  anchors.halo = true;
}
function rotgrub(F, st) {
  const { dir, f, gT, anchors } = st, e = dir === 'e', skin = gT >= 3 ? 'rot' : 'bone', band = 'rot';
  if (e) {
    const segs = [[3.4, 7.4, 2.3], [5.9, 6.8 - f * .5, 2.7], [8.5, 7.1, 2.9], [11, 6.9 + f * .4, 2.7]];
    F.add({ mat: 'claw', prof: 'round', bw: .5, grp: 'legs', tex: FAR, shapes: [C([5, 9], [4.6, 11], .45), C([8, 9.4], [8, 11.2], .45), C([10.6, 9.2], [11, 11], .45)] });
    segs.forEach(([x, y, r], k) => F.add({ mat: skin, prof: 'round', bw: 2, grp: 's' + k, shapes: [O([x, y], r)], tex: q => (Math.abs(q.x - x + r * .7) < .8 ? { m: band, dd: 0 } : 0) }));
    F.add({ mat: 'claw', prof: 'round', bw: 1.4, grp: 'head', shapes: [O([13.2, 7.4], 2.3)] });
    F.add({ mat: 'thorn', prof: 'ridge', grp: 'jaws', shapes: [spike([14.6, 8.4], .5, 1.8, .5), spike([14.8, 6.8], -.2, 1.6, .5)] });
    anchors.eyes = [[13.8, 6.6, gT >= 2 ? EYE.red : EYE.blight]];
    return;
  }
  F.add({ mat: skin, prof: 'round', bw: 2.4, grp: 'back', shapes: [O([8, dir === 's' ? 5.4 : 6.2], 4.6 + f * .2)], tex: q => (q.y % 3 === 0 ? { m: band, dd: 0 } : 0) });
  if (dir === 's') {
    F.add({ mat: 'claw', prof: 'round', bw: 1.6, grp: 'head', shapes: [O([8, 7], 3.1)] });
    F.add({ mat: 'thorn', prof: 'ridge', grp: 'jaws', shapes: [spike([6.4, 9], 1.2, 2, .55), spike([9.6, 9], Math.PI - 1.2, 2, .55)] });
    anchors.eyes = [[6.6, 6.2, gT >= 2 ? EYE.red : EYE.blight], [9.4, 6.2, gT >= 2 ? EYE.red : EYE.blight]];
  } else F.add({ mat: skin, prof: 'round', bw: 1.6, grp: 'tail', shapes: [O([8, 9], 2.6)], tex: () => -.5 });
}
function rotstag(F, st) {
  const { dir, f, gT, anchors, relic } = st, g = f ? 1.2 : -1.2;
  const rotLine = 25 - gT * 2.5, hide = q => (q.y > rotLine + ((q.x * 7) % 3) ? { m: gT >= 2 ? 'rot' : 'rotwood', dd: 0 } : ((q.x + q.y) % 6 === 0 ? -1 : 0));
  const antlerMat = gT >= 2 ? 'rotwood' : 'bone';
  const rack = (bx, by, dirX, spread = 1) => {
    const pts = [[bx, by], [bx + dirX * 2.4 * spread, by - 3.6], [bx + dirX * 5 * spread, by - 5.8], [bx + dirX * 8 * spread, by - 6.4]];
    const sh = []; for (let k = 0; k < 3; k++) sh.push(C(pts[k], pts[k + 1], .75, .6));
    sh.push(C(pts[1], [pts[1][0] - dirX * .6, pts[1][1] - 3], .55, .4), C(pts[2], [pts[2][0] + dirX * .4, pts[2][1] - 3.2], .55, .4), C(pts[2], [pts[2][0] + dirX * 2.4, pts[2][1] + .6], .5, .35));
    return { sh, ring: pts[1] };
  };
  const circlet = at => { if (relic) { F.add({ mat: 'rotwood', prof: 'round', bw: .5, grp: 'circ', relic: true, shapes: [O(at, 1.35)], cuts: [O(at, .6)] }); F.add({ mat: 'blight', prof: 'flat', grp: 'circgem', noShadow: true, relic: true, shapes: [O([at[0] + .4, at[1] + 1], .55)] }); anchors.glint = [at[0] - .6, at[1] - .6]; } };
  if (dir === 'e') {
    F.add({ mat: 'stagWhite', prof: 'round', bw: .7, grp: 'legF', tex: q => (hide(q) || 0) && -1, shapes: [C([21.5, 20.5], [22.6 - g, 30.6], 1.05, .75), C([9.6, 20.5], [8.4 + g, 30.6], 1.15, .75)] });
    const r1 = rack(23.4, 8.2, -1, 1), r2 = rack(24.4, 8, -1, .75);
    F.add({ mat: antlerMat, prof: 'round', bw: .6, grp: 'antlerF', tex: FAR, shapes: r2.sh.map(s => ({ ...s, a: [s.a[0] + 2, s.a[1] + .4], b: [s.b[0] + 2, s.b[1] + .4] })) });
    F.add({ mat: 'stagWhite', prof: 'round', bw: 2.6, grp: 'body', shapes: [E([15, 18.2], 8.2, 4.6), C([20.4, 16.5], [23.2, 10.2], 2.7, 1.9)], tex: hide });
    F.add({ mat: 'stagWhite', prof: 'round', bw: .6, grp: 'tail', shapes: [C([7.2, 15.6], [6.2, 18], .8, .5)] });
    F.add({ mat: 'stagWhite', prof: 'round', bw: .8, grp: 'legN', tex: hide, shapes: [C([20.4, 21], [19.4 + g, 30.6], 1.15, .85), C([10.2, 21], [11.2 - g, 30.6], 1.2, .85)] });
    F.add({ mat: 'stagWhite', prof: 'round', bw: 1.4, grp: 'head', shapes: [E([24.6, 9.2], 2.8, 2.1), C([25.4, 9.6], [28.6, 10.6], 1.45, 1), P([[22.6, 7.8], [20.6, 5.8], [23.8, 7.2]])] });
    F.add({ mat: antlerMat, prof: 'round', bw: .6, grp: 'antler', shapes: r1.sh });
    circlet(r1.ring);
    anchors.eyes = [[25.3, 8.6, gT >= 2 ? EYE.red : EYE.dark], [28.6, 10, EYE.dark]];
    return;
  }
  const s = dir === 's', l1 = f ? 1 : 0, l2 = f ? 0 : 1;
  const L = rack(14.6, 7.6, -1, 1.15), R = rack(17.4, 7.6, 1, 1.15);
  F.add({ mat: antlerMat, prof: 'round', bw: .6, grp: 'antlers', shapes: L.sh.concat(R.sh) });
  if (!s) F.add({ mat: 'stagWhite', prof: 'round', bw: 1.4, grp: 'headB', shapes: [E([16, 10.6], 2.6, 2.8), P([[13.6, 9.6], [11.6, 8.4], [14, 8.4]]), P([[18.4, 9.6], [20.4, 8.4], [18, 8.4]])] });
  F.add({ mat: 'stagWhite', prof: 'round', bw: .8, grp: 'legs', tex: hide, shapes: [C([13.4, 21], [13.2, 30.6 - l1], 1.2, .85), C([18.6, 21], [18.8, 30.6 - l2], 1.2, .85)] });
  F.add({ mat: 'stagWhite', prof: 'round', bw: 2.6, grp: 'body', shapes: [E([16, s ? 19.4 : 18.6], s ? 4.9 : 5.4, s ? 5.6 : 5.2)], tex: hide });
  if (!s) F.add({ mat: 'stagWhite', prof: 'round', bw: .6, grp: 'tail', shapes: [E([16, 14.8], 1.3, 1.6)], tex: () => .5 });
  if (s) {
    F.add({ mat: 'stagWhite', prof: 'round', bw: 1.8, grp: 'neck', shapes: [C([16, 17.4], [16, 12.4], 2.6, 2.2)] });
    F.add({ mat: 'stagWhite', prof: 'round', bw: 1.6, grp: 'head', shapes: [E([16, 10.6], 2.8, 3.1), P([[13.8, 9.4], [11.2, 8.2], [13.6, 8.1]]), P([[18.2, 9.4], [20.8, 8.2], [18.4, 8.1]])] });
    F.add({ mat: 'snout', prof: 'round', bw: .8, grp: 'muzzle', shapes: [E([16, 13.2], 1.6, 1.3)] });
    anchors.eyes = [[14.6, 10.2, gT >= 2 ? EYE.red : EYE.dark], [17.4, 10.2, gT >= 2 ? EYE.red : EYE.dark]];
  }
  circlet(L.ring);
}
function oldsnag(F, st) {
  const { dir, f, gT, anchors, relic } = st, g = f ? 1 : -1, hide = gT >= 3 ? 'rot' : 'boarHide';
  const bristle = q => { const k = (q.x * 2 + q.y * 3 + ((q.y * 7) % 5)) % 9; return k === 0 ? { m: 'grizzle', dd: -.4 } : k === 4 || k === 5 ? -1 : 0; };
  const axe = (base, tip) => {
    if (!relic) { F.add({ mat: 'flesh', prof: 'round', bw: .6, grp: 'wound', noShadow: true, shapes: [E(base, 1.4, .8)] }); return; }
    F.add({ mat: 'bark', prof: 'round', bw: .6, grp: 'haft', relic: true, shapes: [C(base, tip, .7)] });
    const d = [tip[0] - base[0], tip[1] - base[1]], l = Math.hypot(...d), u = [d[0] / l, d[1] / l], p = [-u[1], u[0]];
    const at = (t, s) => [tip[0] + u[0] * t + p[0] * s, tip[1] + u[1] * t + p[1] * s];
    F.add({ mat: 'steel', prof: 'ridge', hs: .6, grp: 'axe', relic: true, tex: () => 1, shapes: [P([at(-2.2, .3), at(.4, .3), at(1.2, 3.2), at(-3, 3.2)])] });
    F.add({ mat: 'verdant', prof: 'flat', grp: 'edge', noShadow: true, noOutline: true, relic: true, shapes: [C(at(1, 3), at(-2.8, 3), .45)] });
    anchors.glint = at(-.6, 1.6);
  };
  if (dir === 'e') {
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'legF', tex: FAR, shapes: [C([22, 16], [22.6 - g, 23], 1.6, 1.3), C([9, 16], [8.4 + g, 23], 1.7, 1.3)] });
    F.add({ mat: hide, prof: 'round', bw: 3.4, grp: 'body', shapes: [E([14.4, 13.2], 10.4, 6.6), E([11.6, 8.6], 6.6, 4.6)], tex: bristle });
    F.add({ mat: 'grizzle', prof: 'ridge', grp: 'bristles', shapes: [0, 1, 2, 3, 4].map(k => spike([6.5 + k * 2.4, 5.4 - Math.sin(k * .8) * .8], -Math.PI / 2 - .4, 1.8 + (k % 2) * .6, .7)) });
    F.add({ mat: hide, prof: 'round', bw: 1.1, grp: 'legN', shapes: [C([21, 17], [20.4 + g, 23], 1.7, 1.4), C([9.6, 17], [10.2 - g, 23], 1.8, 1.4)] });
    F.add({ mat: hide, prof: 'round', bw: 2.4, grp: 'head', shapes: [E([25, 14.2], 4.6, 4.1), P([[23, 10.8], [24.4, 7.6], [25.8, 10.6]])], tex: bristle });
    F.add({ mat: 'snout', prof: 'round', bw: 1.2, grp: 'snout', shapes: [C([27.6, 15.2], [30.4, 15.8], 2.2, 2)] });
    F.add({ mat: 'bone', prof: 'round', bw: .5, grp: 'tusk', shapes: [C([28.2, 17.4], [30.4, 13.8], .85, .45)] });
    axe([11, 5.4], [7.4, .9]);
    anchors.eyes = [[26.2, 12.8, eyeCol(gT)], [30.6, 15.2, EYE.dark]];
    return;
  }
  const s = dir === 's', l1 = f ? 1 : 0, l2 = f ? 0 : 1;
  if (s) axe([18.6, 6], [21.6, 1.2]);
  F.add({ mat: hide, prof: 'round', bw: 3.4, grp: 'body', shapes: [E([16, s ? 11.6 : 12.8], s ? 9.2 : 9.8, s ? 6.4 : 7.4), E([16, s ? 7.6 : 8.2], 6.6, 4)], tex: bristle });
  F.add({ mat: hide, prof: 'round', bw: 1.1, grp: 'legs', shapes: [C([11.4, 17], [11.2, 23 - l1], 1.8, 1.4), C([20.6, 17], [20.8, 23 - l2], 1.8, 1.4)] });
  if (s) {
    F.add({ mat: hide, prof: 'round', bw: 2.4, grp: 'head', shapes: [E([16, 14.2], 5.4, 4.5), P([[11.4, 11.2], [10.4, 8.2], [13.2, 10]]), P([[20.6, 11.2], [21.6, 8.2], [18.8, 10]])], tex: bristle });
    F.add({ mat: 'snout', prof: 'round', bw: 1.4, grp: 'snout', shapes: [E([16, 17.4], 3, 2.2)] });
    F.add({ mat: 'bone', prof: 'round', bw: .5, grp: 'tusks', shapes: [C([13.4, 18.6], [12, 15], .85, .45), C([18.6, 18.6], [20, 15], .85, .45)] });
    anchors.eyes = [[13.8, 12.8, eyeCol(gT)], [18.2, 12.8, eyeCol(gT)], [15.2, 17.2, EYE.dark], [16.8, 17.2, EYE.dark]];
  } else {
    F.add({ mat: hide, prof: 'round', bw: .6, grp: 'tail', shapes: [C([16, 14], [17.2 + (f ? .6 : -.6), 17.4], .7, .45)] });
    F.add({ mat: hide, prof: 'round', bw: 1.2, grp: 'ears', shapes: [P([[11.8, 5.6], [10.6, 2.2], [13.6, 4.6]]), P([[20.2, 5.6], [21.4, 2.2], [18.4, 4.6]])] });
    axe([16, 5.2], [14.2, .6]);
  }
}
function briarmaw(F, st) {
  const { dir, f, gT, anchors, relic } = st, g = f ? 1 : -1;
  const hide = gT >= 2 ? 'rotwood' : 'bark', vine = q => ((q.x * 2 + q.y * 3) % 7 < 2 ? { m: gT >= 3 ? 'rot' : 'bramble', dd: 0 } : 0);
  const crown = (cx, cy, wide) => {
    if (!relic) return;
    F.add({ mat: 'thorn', prof: 'ridge', grp: 'crownT', relic: true, shapes: [-1, -.5, 0, .5, 1].map((t, k) => spike([cx + t * wide, cy], -Math.PI / 2 + t * .5, 2.6 + (k === 2 ? 1 : 0), .7)) });
    F.add({ mat: 'bramble', prof: 'round', bw: .7, grp: 'crownB', relic: true, shapes: [C([cx - wide - .6, cy + .4], [cx + wide + .6, cy + .4], .8)] });
    F.add({ mat: 'verdant', prof: 'flat', grp: 'buds', noShadow: true, relic: true, shapes: [O([cx - wide * .5, cy + .3], .5), O([cx + wide * .5, cy + .3], .5)] });
    anchors.glint = [cx, cy - 2.4];
  };
  const spikes = n => Array.from({ length: n }, (_, k) => k);
  if (dir === 'e') {
    F.add({ mat: hide, prof: 'round', bw: 1.2, grp: 'legF', tex: FAR, shapes: [C([21, 22], [22 - g, 31], 2, 1.6), C([8, 22], [7 + g, 31], 2.1, 1.6)] });
    F.add({ mat: gT >= 3 ? 'rot' : 'thorn', prof: 'ridge', grp: 'backspikes', shapes: spikes(7).map(k => spike([4.6 + k * 2.6, 12.6 - Math.sin(k / 6 * Math.PI) * 3], -Math.PI / 2 - .6, 3 + (k % 2) * 1.2 + gT * .4, 1)) });
    F.add({ mat: hide, prof: 'round', bw: 3.6, grp: 'body', shapes: [E([13.6, 19.4], 10.6, 7.4)], tex: vine });
    F.add({ mat: hide, prof: 'round', bw: 1.3, grp: 'legN', shapes: [C([20.2, 23], [19.4 + g, 31], 2.2, 1.8), C([9, 23], [9.8 - g, 31], 2.2, 1.8)] });
    F.add({ mat: hide, prof: 'round', bw: 2.6, grp: 'head', shapes: [E([24, 14.8], 5.4, 4.8)], tex: vine });
    F.add({ mat: 'flesh', prof: 'round', bw: 1, grp: 'maw', shapes: [P([[25.6, 16.4], [31, 15.6], [31, 19.6], [25.4, 18.8]])] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'teeth', shapes: [spike([27, 16.2], Math.PI / 2, 1.6, .5), spike([29, 16], Math.PI / 2, 1.6, .5), spike([28, 19.4], -Math.PI / 2, 1.6, .5)] });
    if (relic) F.add({ mat: 'bone', prof: 'round', bw: .6, grp: 'fang', relic: true, shapes: [C([26.2, 19.4], [29.8, 23.2], 1, .45)] });
    crown(23.4, 10.4, 3.4);
    anchors.eyes = [[26.4, 13.2, gT >= 2 ? EYE.red : EYE.amber]];
    return;
  }
  const s = dir === 's', l1 = f ? 1 : 0, l2 = f ? 0 : 1;
  F.add({ mat: gT >= 3 ? 'rot' : 'thorn', prof: 'ridge', grp: 'backspikes', shapes: spikes(7).map(k => spike([6 + k * 3.3, s ? 12 : 10.6], -Math.PI / 2 + (k - 3) * .3, 3.2 + (k % 2) * 1.4, 1)) });
  F.add({ mat: hide, prof: 'round', bw: 3.8, grp: 'body', shapes: [E([16, s ? 20.6 : 19.4], 11, s ? 7 : 8.6)], tex: vine });
  F.add({ mat: hide, prof: 'round', bw: 1.3, grp: 'legs', shapes: [C([9.6, 24], [9, 31 - l1], 2.3, 1.9), C([22.4, 24], [23, 31 - l2], 2.3, 1.9)] });
  if (s) {
    F.add({ mat: hide, prof: 'round', bw: 2.6, grp: 'head', shapes: [E([16, 14.2], 5.6, 5)], tex: vine });
    F.add({ mat: 'flesh', prof: 'round', bw: 1, grp: 'maw', shapes: [E([16, 17.4], 3.4, 1.8)] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'teeth', shapes: [spike([14, 16], Math.PI / 2, 1.5, .5), spike([18, 16], Math.PI / 2, 1.5, .5), spike([16, 19], -Math.PI / 2, 1.5, .5)] });
    if (relic) F.add({ mat: 'bone', prof: 'round', bw: .6, grp: 'fang', relic: true, shapes: [C([18.6, 18.4], [20.4, 22.4], 1, .45)] });
    crown(16, 9.6, 3.6);
    anchors.eyes = [[13.8, 13.2, gT >= 2 ? EYE.red : EYE.amber], [18.2, 13.2, gT >= 2 ? EYE.red : EYE.amber]];
  } else crown(16, 9.2, 3.4);
}
function gloamwing(F, st) {
  const { dir, f, gT, anchors, relic } = st, up = !f, fb = f ? 1 : 0, wing = gT >= 3 ? 'rot' : 'pearl', furm = gT >= 2 ? 'wolfFur' : 'wolfPale';
  const wingTex = (cx, cy) => q => { const d = Math.hypot(q.x + .5 - cx, q.y + .5 - cy); return d < 1.3 ? { m: 'amber', dd: -.5 } : d < 2.2 ? { m: 'bone', dd: -1 } : ((q.x + q.y * 2) % 6 === 0 ? -1 : 0); };
  anchors.shadow = [16, 29.5, 6.5];
  const bell = (at) => { if (!relic) return; F.add({ mat: 'string', prof: 'flat', grp: 'silk', noShadow: true, noOutline: true, shapes: [C([at[0] - 1.6, at[1] - 2], [at[0] + 1.6, at[1] - 2.4], .35)] }); F.add({ mat: 'gold', prof: 'round', bw: .8, grp: 'bell', relic: true, shapes: [P([[at[0] - 1.1, at[1] - 1.4], [at[0] + 1.1, at[1] - 1.4], [at[0] + 1.7, at[1] + 1.2], [at[0] - 1.7, at[1] + 1.2]])] }); anchors.glint = [at[0] - .5, at[1] - .8]; };
  if (dir === 'e') {
    const far = up ? P([[16.6, 11.6 + fb], [12, 1.6], [6.6, 2.6], [8.4, 9.6], [14, 13.4]]) : P([[16.6, 13.6], [9, 21.6], [4.6, 19], [6.4, 13.4], [13.6, 12.6]]);
    F.add({ mat: wing, prof: 'round', bw: 1.2, grp: 'wingF', tex: FAR, shapes: [far] });
    F.add({ mat: 'wolfPale', prof: 'round', bw: 1.6, grp: 'abdomen', shapes: [E([12, 15.2 + fb], 4.8, 3)], tex: q => (q.x % 3 === 0 ? -1 : 0) });
    F.add({ mat: furm, prof: 'round', bw: 1.8, grp: 'thorax', shapes: [O([17, 13 + fb], 3.3)], tex: fur(4) });
    F.add({ mat: furm, prof: 'round', bw: 1.2, grp: 'head', shapes: [O([20.6, 11.8 + fb], 2.2)] });
    F.add({ mat: 'bone', prof: 'round', bw: .4, grp: 'antennae', shapes: [C([20.4, 10.2 + fb], [24.2, 5 + fb], .5, .35), C([19.8, 10 + fb], [22.4, 4.2 + fb], .5, .35)] });
    const near = up ? P([[17.4, 12 + fb], [14, .6], [7, 1], [6, 7.6], [13.4, 13.8]]) : P([[17.4, 14], [11, 23.6], [5.4, 22], [5.6, 15.4], [13.6, 13]]);
    F.add({ mat: wing, prof: 'round', bw: 1.6, grp: 'wingN', shapes: [near], tex: up ? wingTex(10.4, 5.4) : wingTex(9.8, 18.4) });
    bell([17, 16.6 + fb]);
    anchors.eyes = [[21.4, 11.4 + fb, gT >= 2 ? EYE.red : EYE.dark]];
    return;
  }
  const L = up ? [[14.4, 12], [7, 1.4], [1.2, 4.6], [2.4, 13.4], [11.6, 16]] : [[14.4, 13.6], [5, 17.6], [.8, 23], [5, 25], [12.8, 18.6]];
  const wings = [P(L), P(L.map(([x, y]) => [32 - x, y]))];
  F.add({ mat: wing, prof: 'round', bw: 1.6, grp: 'wings', shapes: wings, tex: up ? (q => wingTex(q.x < 16 ? 7.4 : 24.6, 7.4)(q)) : (q => wingTex(q.x < 16 ? 6.4 : 25.6, 20.4)(q)) });
  F.add({ mat: 'wolfPale', prof: 'round', bw: 1.6, grp: 'abdomen', shapes: [E([16, 18.4 + fb], 2.7, 4.2)], tex: q => (q.y % 3 === 0 ? -1 : 0) });
  F.add({ mat: furm, prof: 'round', bw: 1.8, grp: 'thorax', shapes: [O([16, 13.2 + fb], 3.3)], tex: fur(5) });
  if (dir === 's') {
    F.add({ mat: furm, prof: 'round', bw: 1.2, grp: 'head', shapes: [O([16, 9.4 + fb], 2.5)] });
    bell([16, 14.6 + fb]);
    anchors.eyes = [[14.4, 9.2 + fb, gT >= 2 ? EYE.red : EYE.dark], [17.6, 9.2 + fb, gT >= 2 ? EYE.red : EYE.dark]];
  }
  F.add({ mat: 'bone', prof: 'round', bw: .4, grp: 'antennae', shapes: [C([15, 7.6 + fb], [11.4, 2 + fb], .5, .35), C([17, 7.6 + fb], [20.6, 2 + fb], .5, .35)] });
}
function mirelord(F, st) {
  const { dir, f, gT, anchors, relic } = st, pulse = f ? .5 : 0, skin = gT >= 3 ? 'rot' : 'drake';
  const spots = q => ((q.x * 3 + q.y * 5) % 11 < 2 ? { m: gT >= 2 ? 'rotwood' : 'moss', dd: 0 } : 0);
  const crown = (cx, cy, w) => {
    F.add({ mat: 'bramble', prof: 'ridge', grp: 'reeds', shapes: [-1, -.5, 0, .5, 1].map((t, k) => spike([cx + t * w, cy + Math.abs(t) * .8], -Math.PI / 2 + t * .45, 3 + (k === 2 ? 1.2 : 0), .65)) });
    if (relic) { F.add({ mat: 'pearl', prof: 'round', bw: 1, grp: 'pearl', relic: true, shapes: [O([cx, cy + 1], 1.5)] }); anchors.glint = [cx - .5, cy + .4]; }
  };
  if (dir === 'e') {
    F.add({ mat: skin, prof: 'round', bw: 1.2, grp: 'armF', tex: FAR, shapes: [C([19, 24], [21.6, 29.8], 1.4, 1), E([22.4, 30], 2, .9)] });
    F.add({ mat: skin, prof: 'round', bw: 4, grp: 'body', shapes: [E([15, 20.6], 11.4, 8 - pulse * .3), O([20.4, 12.4], 3.1)], tex: spots });
    F.add({ mat: 'gambeson', prof: 'round', bw: 2, grp: 'belly', shapes: [E([19, 24.6 + pulse * .3], 6, 3.6 + pulse)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [C([15.6, 20.2], [26.6, 19.6], .55)] });
    F.add({ mat: skin, prof: 'round', bw: 2.4, grp: 'thigh', shapes: [E([8.6, 24], 5, 4.6), E([4.6, 29.6], 3, 1.2)], tex: spots });
    F.add({ mat: skin, prof: 'round', bw: 1.2, grp: 'arm', shapes: [C([21, 25], [23.6, 29.8], 1.5, 1.1), E([24.6, 30], 2.2, .9)] });
    F.add({ mat: 'topaz', prof: 'round', bw: 1, grp: 'eye', shapes: [O([21, 11.8], 1.7)] });
    crown(15.6, 8.6, 3.4);
    anchors.eyes = [[21.4, 11.8, EYE.dark]];
    return;
  }
  const s = dir === 's';
  F.add({ mat: skin, prof: 'round', bw: 4, grp: 'body', shapes: [E([16, 21], 12.4, 8.4 - pulse * .3), O([9.6, 12.8], 3.1), O([22.4, 12.8], 3.1)], tex: spots });
  if (s) {
    F.add({ mat: 'gambeson', prof: 'round', bw: 2, grp: 'belly', shapes: [E([16, 24.6 + pulse * .3], 7.4, 4 + pulse)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [P([[6.4, 19.2], [16, 20.8], [25.6, 19.2], [25.6, 20.2], [16, 21.8], [6.4, 20.2]])] });
    F.add({ mat: 'topaz', prof: 'round', bw: 1, grp: 'eyes', shapes: [O([9.6, 12.4], 1.8), O([22.4, 12.4], 1.8)] });
    anchors.eyes = [[9.6, 12.4, EYE.dark], [22.4, 12.4, EYE.dark]];
  }
  F.add({ mat: skin, prof: 'round', bw: 1.3, grp: 'arms', shapes: [C([6.4, 25], [3, 29.6], 1.6, 1.1), C([25.6, 25], [29, 29.6], 1.6, 1.1), E([2.6, 30], 2.4, .9), E([29.4, 30], 2.4, .9)] });
  crown(16, 9.4, 3.8);
}
function sapwight(F, st) {
  const { dir, f, gT, anchors } = st, sw = f ? .8 : -.4, e = dir === 'e', bark = gT >= 3 ? 'rot' : 'bark';
  const ridge = q => ((q.x + (q.y >> 1)) % 3 === 0 ? -1 : 0) + ((q.x * 5 + q.y) % 13 === 0 ? { m: 'moss', dd: 0 } : 0);
  if (e) {
    F.add({ mat: bark, prof: 'round', bw: .7, grp: 'armF', tex: FAR, shapes: [C([7, 10], [5 - sw, 19], 1, .7)] });
    F.add({ mat: bark, prof: 'round', bw: .8, grp: 'legs', shapes: [C([7.4, 17], [6.4 + sw, 23], 1.1, .8), C([9, 17], [10 - sw, 23], 1.1, .8)] });
    F.add({ mat: bark, prof: 'round', bw: 1.6, grp: 'torso', shapes: [P([[5.4, 9], [10.6, 8.4], [10.4, 17.6], [6, 17.8]])], tex: ridge });
    F.add({ mat: bark, prof: 'round', bw: 1.4, grp: 'head', shapes: [E([10.2, 6], 3, 3.3)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'face', noShadow: true, shapes: [E([11.4, 6.6], 1.6, 2)] });
    F.add({ mat: bark, prof: 'round', bw: .7, grp: 'arm', shapes: [C([9.4, 10], [12.8 + sw, 19.4], 1.1, .75)] });
    F.add({ mat: 'claw', prof: 'ridge', grp: 'claws', shapes: [spike([12.8 + sw, 19.4], 1.2, 1.6, .5), spike([12.6 + sw, 19.6], 1.9, 1.4, .45)] });
    F.add({ mat: 'sap', prof: 'round', bw: .4, grp: 'drip', noShadow: true, shapes: [C([6.4, 10], [6.2, 13.4], .5, .35)] });
    anchors.eyes = [[12, 6.2, gT >= 2 ? EYE.red : EYE.blight]];
    return;
  }
  const s = dir === 's', l1 = f ? .8 : 0, l2 = f ? 0 : .8;
  F.add({ mat: bark, prof: 'round', bw: .8, grp: 'legs', shapes: [C([6.4, 17], [5.8, 23 - l1], 1.1, .8), C([9.6, 17], [10.2, 23 - l2], 1.1, .8)] });
  F.add({ mat: bark, prof: 'round', bw: 1.8, grp: 'torso', shapes: [P([[4.4, 9], [11.6, 9], [11, 17.8], [5, 17.8]])], tex: ridge });
  F.add({ mat: bark, prof: 'round', bw: .7, grp: 'arms', shapes: [C([4.4, 10], [2.6, 19.6 + sw], 1.05, .75), C([11.6, 10], [13.4, 19.6 - sw], 1.05, .75)] });
  F.add({ mat: 'claw', prof: 'ridge', grp: 'claws', shapes: [spike([2.6, 19.6 + sw], 1.9, 1.5, .5), spike([13.4, 19.6 - sw], 1.25, 1.5, .5)] });
  F.add({ mat: bark, prof: 'round', bw: 1.4, grp: 'head', shapes: [E([8, 5.6], 3.3, 3.6)], tex: ridge });
  if (s) {
    F.add({ mat: 'dark', prof: 'flat', grp: 'face', noShadow: true, shapes: [E([8, 6.2], 2.2, 2.2)] });
    F.add({ mat: 'sap', prof: 'round', bw: .4, grp: 'drip', noShadow: true, shapes: [C([5.2, 10], [5, 13.6], .5, .35), C([10.6, 10], [10.8, 12.6], .5, .35)] });
    anchors.eyes = [[6.8, 5.8, gT >= 2 ? EYE.red : EYE.blight], [9.2, 5.8, gT >= 2 ? EYE.red : EYE.blight]];
  }
}
function rotwarden(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', s = dir === 's', l1 = f ? 1 : 0, l2 = f ? 0 : 1;
  const plate = 'rotwood', growth = q => ((q.x * 2 + q.y) % 7 < 2 ? { m: 'bark', dd: 0 } : (q.y % 4 === 0 ? -1 : 0)) + ((q.x * 5 + q.y * 3) % 17 === 0 ? { m: 'moss', dd: 0 } : 0);
  const masks = relic !== null, seed = relic !== null;
  if (e) {
    F.add({ mat: plate, prof: 'round', bw: 1.2, grp: 'legF', tex: FAR, shapes: [C([14.4, 22], [13 + (f ? 2 : -1), 31], 2.3, 1.9)] });
    F.add({ mat: plate, prof: 'round', bw: 1.2, grp: 'armF', tex: FAR, shapes: [C([13, 12.6], [10.6, 22], 2.2, 1.8)] });
    F.add({ mat: plate, prof: 'round', bw: 3, grp: 'torso', shapes: [P([[11, 10.4], [21, 10.4], [21.6, 22.6], [11.4, 22.8]])], tex: growth });
    F.add({ mat: plate, prof: 'round', bw: 1.3, grp: 'legN', shapes: [C([17.6, 22.4], [18.8 + (f ? -2 : 1), 31], 2.4, 2)] });
    F.add({ mat: plate, prof: 'round', bw: 2.2, grp: 'pauld', shapes: [E([17.6, 11.8], 3.6, 2.6)], tex: growth });
    F.add({ mat: plate, prof: 'round', bw: 2.4, grp: 'head', shapes: [E([18.4, 6.8], 4, 4.2)], tex: growth });
    if (masks) { F.add({ mat: 'iron', prof: 'round', bw: 1.2, grp: 'mask', relic: true, shapes: [E([20.8, 7.6], 2.4, 3)] }); anchors.glint = [20.2, 6.2]; }
    F.add({ mat: plate, prof: 'round', bw: 1.3, grp: 'arm', shapes: [C([19.6, 13], [22.4, 22.4], 2.3, 1.9)] });
    F.add({ mat: 'claw', prof: 'ridge', grp: 'claw', shapes: [spike([22.4, 22.6], 1.3, 2.2, .7), spike([22, 23], 1.9, 2, .6)] });
    if (seed) F.add({ mat: 'verdant', prof: 'flat', grp: 'seed', relic: true, shapes: [O([20.4, 15.4], 1.1)] });
    anchors.eyes = [[22.2, 7.2, gT >= 2 ? EYE.red : EYE.blight]];
    return;
  }
  F.add({ mat: plate, prof: 'round', bw: 1.3, grp: 'legs', shapes: [C([12.4, 22.6], [11.8, 31 - l1], 2.4, 2), C([19.6, 22.6], [20.2, 31 - l2], 2.4, 2)] });
  F.add({ mat: plate, prof: 'round', bw: 3.4, grp: 'torso', shapes: [P([[8.4, 10.6], [23.6, 10.6], [22.6, 23], [9.4, 23]])], tex: growth });
  F.add({ mat: plate, prof: 'round', bw: 1.3, grp: 'arms', shapes: [C([7.8, 12.6], [6, 22.6], 2.3, 1.9), C([24.2, 12.6], [26, 22.6], 2.3, 1.9)] });
  F.add({ mat: 'claw', prof: 'ridge', grp: 'claws', shapes: [spike([6, 22.8], 1.9, 2.2, .7), spike([26, 22.8], 1.25, 2.2, .7)] });
  F.add({ mat: plate, prof: 'round', bw: 2.2, grp: 'pauld', shapes: [E([8.6, 11.8], 3.6, 2.6), E([23.4, 11.8], 3.6, 2.6)], tex: growth });
  F.add({ mat: plate, prof: 'round', bw: 2.4, grp: 'head', shapes: [E([16, 6.8], 4.4, 4.4)], tex: growth });
  if (s) {
    if (masks) { F.add({ mat: 'iron', prof: 'round', bw: 1.4, grp: 'mask', relic: true, shapes: [E([16, 7.6], 3.2, 3.2)] }); anchors.glint = [14.8, 6.2]; }
    if (seed) F.add({ mat: 'verdant', prof: 'flat', grp: 'seed', relic: true, shapes: [O([16, 15.6], 1.2)] });
    F.add({ mat: 'sap', prof: 'round', bw: .4, grp: 'ichor', noShadow: true, shapes: [C([12.4, 11.6], [12.2, 15], .5, .35), C([19.2, 12], [19.4, 14.4], .5, .35)] });
    anchors.eyes = [[14.8, 7.2, gT >= 2 ? EYE.red : EYE.blight], [17.2, 7.2, gT >= 2 ? EYE.red : EYE.blight]];
  }
}
/* ---- M4: the Sunscorch beasts and lairs ---- */
// sand-skink 16x12: a quick lizard, a red dorsal stripe (ember-bright at tier 3), a spiny crest from tier 1
function sandSkink(F, st) {
  const { dir, f, gT, anchors } = st, e = dir === 'e', hide = gT >= 3 ? 'w.char' : 'w.skink', stripe = gT >= 3 ? 'ember' : 'leatherRed', g = f ? .9 : -.9;
  const scales = q => ((q.x + q.y * 2) % 4 === 0 ? -.7 : 0);
  if (e) {
    F.add({ mat: hide, prof: 'round', bw: .5, grp: 'legF', tex: FAR, shapes: [C([6.2, 8], [5 + g, 11], .6, .45), C([10.6, 8], [11.6 - g, 11], .6, .45)] });
    F.add({ mat: hide, prof: 'round', bw: .7, grp: 'tail', shapes: [C([5.6, 7.3], [2.6, 8.2 + (f ? -.4 : .3)], 1.2, .75), C([2.6, 8.2 + (f ? -.4 : .3)], [.4, 7 + (f ? .7 : -.3)], .75, .35)] });
    F.add({ mat: hide, prof: 'round', bw: 1.4, grp: 'body', shapes: [E([8.6, 7.4], 4.1, 1.9)], tex: q => (q.y < 6.9 && q.x % 3 !== 1 ? { m: stripe, dd: 0 } : scales(q)) });
    F.add({ mat: hide, prof: 'round', bw: .5, grp: 'legN', shapes: [C([6.8, 8.4], [7.6 - g, 11.4], .65, .45), C([11, 8.4], [10.2 + g, 11.4], .65, .45)] });
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'head', shapes: [E([13, 6.8], 2.2, 1.5), C([13.6, 7.1], [15.4, 7.5], .95, .5)] });
    if (gT >= 1) F.add({ mat: gT >= 3 ? 'w.char' : 'thorn', prof: 'ridge', grp: 'crest', shapes: [0, 1, 2, 3].map(k => spike([6.2 + k * 1.7, 5.9], -Math.PI / 2 - .35, 1.1 + (k % 2) * .5, .5)) });
    anchors.eyes = [[13.4, 6.4, eyeCol(gT)]];
    return;
  }
  const s = dir === 's', l = f ? .8 : 0, l2 = f ? 0 : .8;
  F.add({ mat: hide, prof: 'round', bw: .5, grp: 'legs', shapes: [C([6.2, 4.4], [3.4, 3 + l], .6, .45), C([9.8, 4.4], [12.6, 3 + l2], .6, .45), C([6.2, 7.6], [3.4, 9.4 - l2], .6, .45), C([9.8, 7.6], [12.6, 9.4 - l], .6, .45)] });
  F.add({ mat: hide, prof: 'round', bw: .7, grp: 'tail', shapes: [s ? C([8, 3.4], [8.4 + (f ? .8 : -.8), -.4], .95, .4) : C([8, 8.4], [8.4 + (f ? .8 : -.8), 11.6], .95, .4)] });
  F.add({ mat: hide, prof: 'round', bw: 1.4, grp: 'body', shapes: [E([8, s ? 5.4 : 5.8], 2.4, 3.2)], tex: q => (q.x === 7 || q.x === 8 ? { m: stripe, dd: 0 } : scales(q)) });
  if (gT >= 1) F.add({ mat: gT >= 3 ? 'w.char' : 'thorn', prof: 'ridge', grp: 'crest', shapes: [spike([6.2, 4.6], Math.PI, 1.2, .45), spike([9.8, 4.6], 0, 1.2, .45)] });
  F.add({ mat: hide, prof: 'round', bw: 1, grp: 'head', shapes: [E([8, s ? 8.8 : 2.4], s ? 2.1 : 1.8, s ? 1.7 : 1.4)] });
  if (s) anchors.eyes = [[7, 8.4, eyeCol(gT)], [9, 8.4, eyeCol(gT)]];
}
// glass scorpions: the 24x16 family (k 1), the Glass Matriarch (k 1.3, a brood on her back) and Kharzul (k 2,
// the Glass Carapace plates and Cinderfang lodged by the sting). The shell goes smoky at tier 2, obsidian at 3.
function scorpion(F, st, k = 1, o = {}) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', g = f ? 1 : -1;
  const shell = o.shell || (gT >= 3 ? 'blackiron' : gT >= 2 ? 'stormglass' : 'seaglass'), joint = gT >= 3 ? 'w.char' : 'claw', sting = gT >= 3 ? 'ember' : 'topaz';
  const ox = o.ox || 0, oy = o.oy || 0, T = ([x, y]) => [x * k + ox, y * k + oy], r = v => v * k;
  const cap = (a, b, ra, rb = ra) => C(T(a), T(b), r(ra), r(rb)), ell = (c, rx, ry) => E(T(c), r(rx), r(ry)), poly = pts => P(pts.map(T));
  const seg = q => (Math.round((e ? q.x : q.y) / k) % 3 === 0 ? -1 : 0);
  const pieces = relic !== null && o.pieces;
  if (e) {
    F.add({ mat: joint, prof: 'round', bw: .5, grp: 'legF', tex: FAR, shapes: [[8, 11, 6.6 + g], [10.6, 11.2, 10 - g], [13, 11, 13.8 + g]].flatMap(([x, y, fx]) => [cap([x, y], [x - .6, y + 1.8], .5), cap([x - .6, y + 1.8], [fx, 15], .5, .35)]) });
    const tail = [[6, 9.8], [3.4, 8.2], [2.4, 4.8], [4.4, 2], [7.8, 1.4]];
    F.add({ mat: shell, prof: 'round', bw: r(1), grp: 'tail', shapes: tail.slice(0, -1).map((a, i) => cap(a, tail[i + 1], 1.6 - i * .15, 1.45 - i * .15)), tex: q => ((q.x + q.y) % Math.max(2, Math.round(3 * k)) === 0 ? -.8 : 0) });
    F.add({ mat: sting, prof: 'ridge', grp: 'sting', shapes: [poly([[7.2, .5], [10.8, 2.2], [8.4, 3.1]])] });
    if (pieces) { // Cinderfang, lodged in the tail by the sting, its edge still hot
      F.add({ mat: 'steel', prof: 'ridge', grp: 'fang', relic: true, shapes: [poly([[3.2, 3.6], [.6, 1.6], [-.2, -.2], [1.8, 1], [4, 3]])] });
      F.add({ mat: 'ember', prof: 'flat', grp: 'fangedge', noShadow: true, noOutline: true, relic: true, shapes: [cap([.6, .4], [3, 2.8], .3)] });
      anchors.glint = T([1.2, .8]);
    }
    F.add({ mat: shell, prof: 'round', bw: r(1.4), grp: 'body', shapes: [ell([9.4, 10], 4.6, 2.4), ell([14.4, 9.8], 3, 2.2)], tex: seg });
    if (pieces) F.add({ mat: 'pearl', prof: 'ridge', grp: 'plates', relic: true, shapes: [7, 10, 13].map(x => poly([[x - 1.5, 8.4], [x, 7], [x + 1.5, 8.4]])) });
    else if (gT >= 1) F.add({ mat: shell, prof: 'ridge', grp: 'shards', shapes: [8, 10.4, 12.8].map(x => spike(T([x, 8]), -Math.PI / 2 - .2, r(1.4 + gT * .2), r(.55))) });
    if (o.brood) F.add({ mat: shell, prof: 'round', bw: .6, grp: 'brood', shapes: [[7.4, 7.6], [10.6, 7.4]].map(c => ell(c, 1.1, .7)) });
    F.add({ mat: joint, prof: 'round', bw: .5, grp: 'legN', shapes: [[8.6, 11.4, 8 - g], [11.2, 11.6, 11.6 + g], [13.6, 11.2, 15.2 - g]].flatMap(([x, y, fx]) => [cap([x, y], [x + .4, y + 1.6], .55), cap([x + .4, y + 1.6], [fx, 15.2], .55, .35)]) });
    F.add({ mat: shell, prof: 'round', bw: r(.8), grp: 'arm', shapes: [cap([16.2, 10.6], [19, 12], .8), ell([20.8, 11.6], 2.2, 1.4), poly([[19.8, 10.6], [23.8, 9.8 + (f ? .6 : 0)], [21.6, 11.4]])], cuts: [cap([22, 11], [23.6, 11.2], .3)] });
    anchors.eyes = [T([16.2, 8.8]).concat([o.eye || eyeCol(gT)])];
    return;
  }
  const s = dir === 's', l = f ? .9 : 0, l2 = f ? 0 : .9;
  const legs = [[9, 6.4, 5, 5 + l], [9, 7.8, 5.2, 9 - l2], [9.4, 9.2, 6, 12 - l], [15, 6.4, 19, 5 + l2], [15, 7.8, 18.8, 9 - l], [14.6, 9.2, 18, 12 - l2]];
  F.add({ mat: joint, prof: 'round', bw: .5, grp: 'legs', shapes: legs.flatMap(([x, y, fx, fy]) => [cap([x, y], [(x + fx) / 2, y - 1.2], .55), cap([(x + fx) / 2, y - 1.2], [fx, fy], .5, .35)]) });
  const arms = s ? [[[9.2, 9], [6.2, 11.6]], [[14.8, 9], [17.8, 11.6]]] : [[[9.4, 6.4], [6.6, 3.8]], [[14.6, 6.4], [17.4, 3.8]]];
  F.add({ mat: shell, prof: 'round', bw: r(.8), grp: 'arms', shapes: arms.flatMap(([a, b]) => [cap(a, b, .8), ell([b[0] + (b[0] < 12 ? -1.2 : 1.2), b[1] + (s ? .9 : -.6)], 1.9, 1.4)]) });
  if (s) F.add({ mat: shell, prof: 'round', bw: r(1.3), grp: 'abdomen', shapes: [ell([12, 4.6], 3.4, 2.4)], tex: seg });
  F.add({ mat: shell, prof: 'round', bw: r(1.4), grp: 'body', shapes: [ell([12, s ? 7.4 : 8.6], 3.9, 3)], tex: seg });
  if (!s) F.add({ mat: shell, prof: 'round', bw: r(1.3), grp: 'abdomen', shapes: [ell([12, 11.2], 3.4, 2.4)], tex: seg });
  if (pieces) F.add({ mat: 'pearl', prof: 'ridge', grp: 'plates', relic: true, shapes: [[10, s ? 6 : 8], [14, s ? 6 : 8], [12, s ? 4 : 10.6]].map(([x, y]) => poly([[x - 1.6, y + .8], [x, y - .9], [x + 1.6, y + .8]])) });
  else if (gT >= 1) F.add({ mat: shell, prof: 'ridge', grp: 'shards', shapes: [[10.4, 5.8], [13.6, 5.8]].map(c => spike(T(c), -Math.PI / 2, r(1.3 + gT * .2), r(.5))) });
  if (o.brood) F.add({ mat: shell, prof: 'round', bw: .6, grp: 'brood', shapes: [[10.4, s ? 4.2 : 10.8], [13.8, s ? 4.6 : 11]].map(c => ell(c, 1.1, .7)) });
  // the tail: rising behind the body (s) or toward the viewer and up over it (n), the sting curled forward
  F.add({ mat: shell, prof: 'round', bw: r(1), grp: 'tail', shapes: s ? [cap([12, 3.4], [12, .9], 1.3, 1.05)] : [cap([12, 13.4], [12.4, 8], 1.4, 1.2), cap([12.4, 8], [12, 3.2], 1.2, 1)], tex: q => (q.y % Math.max(2, Math.round(3 * k)) === 0 ? -.8 : 0) });
  F.add({ mat: sting, prof: 'ridge', grp: 'sting', shapes: [s ? poly([[11, 1.2], [13, 1.2], [12, 3.8]]) : poly([[11, 3.4], [13, 3.4], [12, .6]])] });
  if (pieces) {
    F.add({ mat: 'steel', prof: 'ridge', grp: 'fang', relic: true, shapes: [poly(s ? [[12.8, 1.6], [16.6, .2], [17.8, .6], [13.4, 2.4]] : [[12.8, 4.6], [16.8, 3], [18, 3.4], [13.4, 5.4]])] });
    F.add({ mat: 'ember', prof: 'flat', grp: 'fangedge', noShadow: true, noOutline: true, relic: true, shapes: [cap(s ? [13.4, 1.4] : [13.4, 4.4], s ? [17.2, .1] : [17.2, 2.9], .28)] });
    anchors.glint = T(s ? [16.4, .6] : [16.4, 3.4]);
  }
  if (s) anchors.eyes = [T([11, 7.2]).concat([o.eye || eyeCol(gT)]), T([13, 7.2]).concat([o.eye || eyeCol(gT)])];
}
const glassScorpion = (F, st) => scorpion(F, st);
const glassMatriarch = (F, st) => scorpion(F, Object.assign({}, st, { gT: Math.max(1, st.gT) }), 1.3, { oy: 3, brood: true, eye: EYE.amber });
const kharzul = (F, st) => scorpion(F, st, 1.9, { oy: 1.2, ox: 1.2, pieces: true, eye: EYE.amber, shell: st.gT >= 3 ? 'blackiron' : 'seaglass' });
// mirage wisps: shimmering teardrops of light over a dithered shadow; the tail fades (every other pixel)
function mirageWisp(F, st) {
  const { dir, f, gT, anchors } = st, sw = f ? .8 : -.8, core = gT >= 3 ? 'arcane' : 'w.mirage';
  anchors.shadow = [8, 18.8, 3.4]; anchors.halo = true; anchors.fade = 14;
  F.add({ mat: gT >= 2 ? 'arcane' : 'frost', prof: 'flat', grp: 'wisps', noOutline: true, noShadow: true, shapes: [C([6, 12], [4.4 - sw, 16.6], .6, .3), C([10, 12], [11.6 - sw, 16.2], .6, .3)].concat(gT >= 1 ? [C([8, 13], [8 + sw * 1.4, 17.6], .6, .3)] : []), tex: () => -.8 });
  F.add({ mat: core, prof: 'round', bw: 2, grp: 'body', shapes: [E([8, 7], 3.8, 4), P([[4.4, 8], [11.6, 8], [9.6 + sw * .5, 13], [8 + sw, 16.6], [6.4 + sw * .5, 13]])], tex: q => { const d = Math.hypot(q.x - 7.5, q.y - 7); return d < 2 ? .6 : d > 3.6 ? -.7 : 0; } });
  if (dir !== 'n') { const c = gT >= 2 ? EYE.red : [40, 28, 80]; anchors.eyes = dir === 'e' ? [[10, 6.6, c]] : [[6.6, 6.6, c], [9.4, 6.6, c]]; }
}
// the Wisp-Queen 32x32: a gown of light, a crown of light, the Mirage Glass at her breast
function wispQueen(F, st) {
  const { dir, f, gT, anchors, relic } = st, sw = f ? 1 : -1, e = dir === 'e', n = dir === 'n', core = gT >= 3 ? 'arcane' : 'w.mirage';
  anchors.shadow = [16, 30.4, 6]; anchors.halo = true; anchors.fade = 25;
  F.add({ mat: 'frost', prof: 'flat', grp: 'veil', noOutline: true, noShadow: true, shapes: [e ? P([[13, 5], [9.4 - sw, 14], [7 - sw, 24], [11, 19], [14, 9]]) : P([[11.6, 6], [8.4 - sw, 16], [7 - sw, 25], [16, 17], [25 + sw, 25], [23.6 + sw, 16], [20.4, 6]])], tex: () => -.9 });
  F.add({ mat: core, prof: 'round', bw: 2.4, grp: 'gown', shapes: [P(e ? [[14.4, 13.4], [18.4, 13.4], [21 + sw, 23], [19 + sw * 1.4, 29], [15 + sw, 26.6], [11.6 + sw * 1.4, 29.4], [12.6, 22]] : [[13.4, 13.4], [18.6, 13.4], [22.4 + sw * .6, 22], [23 + sw, 29], [19.4, 27], [16 + sw, 29.6], [12.6, 27], [9 + sw, 29], [9.6 + sw * .6, 22]])], tex: q => (q.x % 3 === 0 ? -.6 : 0) + (q.y > 24 ? -.5 : 0) });
  F.add({ mat: core, prof: 'round', bw: .8, grp: 'arms', shapes: e ? [C([17.2, 11], [21.4 + sw * .4, 16.4], .9, .6)] : [C([13.6, 10.8], [9 + sw * .4, 16], .9, .6), C([18.4, 10.8], [23 - sw * .4, 16], .9, .6)] });
  F.add({ mat: core, prof: 'round', bw: 1.6, grp: 'torso', shapes: [E([e ? 16.6 : 16, 11.8], e ? 2.2 : 2.8, 3.4)], tex: () => .3 });
  F.add({ mat: core, prof: 'round', bw: 1.6, grp: 'head', shapes: [E([e ? 17.2 : 16, 6.8], 2.5, 2.8)], tex: () => .6 });
  F.add({ mat: 'radiant', prof: 'flat', grp: 'crown', shapes: (e ? [-1.5, 0, 1.5] : [-2.4, -1.2, 0, 1.2, 2.4]).map((t, k) => C([(e ? 16.8 : 16) + t, 4.6], [(e ? 16.8 : 16) + t * 1.25, 4.6 - 1.6 - (k % 2 ? 0 : 1)], .45, .2)).concat([C([e ? 15 : 13.4, 4.8], [e ? 18.6 : 18.6, 4.8], .45)]) });
  if (relic && !n) { F.add({ mat: 'gold', prof: 'round', bw: .5, grp: 'setting', relic: true, shapes: [O([e ? 18 : 16, 11.4], 1.3)] }); F.add({ mat: 'seaglass', prof: 'round', bw: .6, grp: 'glass', relic: true, shapes: [O([e ? 18 : 16, 11.4], .8)] }); anchors.glint = [e ? 17.4 : 15.4, 10.8]; }
  if (!n) { const c = gT >= 2 ? EYE.red : [40, 28, 80]; anchors.eyes = e ? [[18.4, 6.6, c]] : [[15, 6.8, c], [17, 6.8, c]]; }
}
// the Sand Wyrm 32x32: a banded wyrm rising from its sinkhole, jaws open; Wyrmscale is the gold plate on its brow
function sandWyrm(F, st) {
  const { dir, f, gT, anchors, relic } = st, sw = f ? .8 : -.8, e = dir === 'e', n = dir === 'n', hide = gT >= 3 ? 'rot' : 'w.wyrm';
  const bands = q => ((q.y + (e ? q.x >> 1 : 0)) % 3 === 0 ? -1 : 0) + (gT >= 2 && (q.x * 3 + q.y) % 7 === 0 ? { m: 'w.char', dd: 0 } : 0);
  F.add({ mat: 'w.sand', prof: 'flat', grp: 'pit', noOutline: true, noShadow: true, shapes: [E([16, 28.8], 11.6, 3)], tex: q => (Math.hypot((q.x - 15.5) / 11.6, (q.y - 28.5) / 3) > .72 ? -1 : -2) + ((q.x + q.y) % 4 === 0 ? -.6 : 0) });
  F.add({ mat: 'dark', prof: 'flat', grp: 'hole', noOutline: true, shapes: [E([16, 29], 7.4, 1.7)] });
  const spikes = gT >= 1 ? [[.2, 1.4], [.45, 1.8], [.7, 1.4]] : [[.35, 1.2], [.65, 1.2]];
  if (e) {
    const B = [[11, 29], [10.2 + sw * .4, 21], [12.6 + sw * .6, 14.6], [17.4 + sw, 11]];
    F.add({ mat: hide, prof: 'round', bw: 3, grp: 'body', shapes: B.slice(0, -1).map((a, i) => C(a, B[i + 1], 5 - i * .6, 4.4 - i * .6)), tex: bands });
    F.add({ mat: gT >= 3 ? 'w.char' : 'thorn', prof: 'ridge', grp: 'fins', shapes: spikes.map(([t, l]) => { const a = B[Math.floor(t * 3)], b = B[Math.floor(t * 3) + 1], u = t * 3 % 1; return spike([a[0] + (b[0] - a[0]) * u - 3.6, a[1] + (b[1] - a[1]) * u - 1], -Math.PI * .8, l + 1.2, .8); }) });
    F.add({ mat: hide, prof: 'round', bw: 2.4, grp: 'head', shapes: [E([21.4 + sw, 9.4], 4.6, 3.4), P([[23 + sw, 8], [30.6 + sw, 8.6], [28.6 + sw, 10.2], [23 + sw, 10.4]])] });
    F.add({ mat: 'flesh', prof: 'round', bw: .8, grp: 'maw', shapes: [P([[23.4 + sw, 10.4], [30.4 + sw, 11], [29.6 + sw, 14.4], [23 + sw, 12.4]])] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'teeth', shapes: [25, 27, 29].map(x => spike([x + sw, 10.6], Math.PI / 2, 1.4, .45)).concat([26, 28].map(x => spike([x + sw, 13.8], -Math.PI / 2, 1.3, .45))) });
    if (relic) { F.add({ mat: 'bronze', prof: 'bevel', bw: .8, grp: 'scale', relic: true, shapes: [P([[18.6 + sw, 5.2], [22.4 + sw, 5.6], [22 + sw, 7.8], [19.8 + sw, 8.8], [18.2 + sw, 7.4]])] }); F.add({ mat: 'topaz', prof: 'flat', grp: 'scalegem', noShadow: true, relic: true, shapes: [O([20.4 + sw, 6.8], .7)] }); anchors.glint = [19.4 + sw, 5.8]; }
    anchors.eyes = [[23 + sw, 8.2, gT >= 2 ? EYE.red : EYE.amber]];
    return;
  }
  const S = [[16, 29.4], [11.4 + sw * .4, 23.6], [19.4 + sw * .6, 17], [16 + sw, 11.6]];
  F.add({ mat: hide, prof: 'round', bw: 3, grp: 'body', shapes: S.slice(0, -1).map((a, i) => C(a, S[i + 1], 5.2 - i * .5, 4.8 - i * .5)), tex: bands });
  if (!n) F.add({ mat: 'bone', prof: 'round', bw: 1.2, grp: 'belly', shapes: S.slice(0, -1).map((a, i) => C([a[0] + (i === 1 ? .8 : 0), a[1] - 1], [S[i + 1][0], S[i + 1][1] + 1], 2, 1.7)), tex: q => (q.y % 3 === 0 ? -.8 : 0) });
  F.add({ mat: gT >= 3 ? 'w.char' : 'thorn', prof: 'ridge', grp: 'fins', shapes: spikes.map(([t, l], k) => { const i = Math.min(2, Math.floor(t * 3)), u = t * 3 - i, a = S[i], b = S[i + 1], x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, side = k % 2 ? 1 : -1; return spike([x + side * 4.4, y], side > 0 ? -.3 : Math.PI + .3, l + .6, .7); }) });
  F.add({ mat: hide, prof: 'round', bw: 2.6, grp: 'head', shapes: [E([16 + sw, 8.4], 6.2, 4.4), spike([11 + sw, 6.4], -Math.PI * .8, 3, 1), spike([21 + sw, 6.4], -Math.PI * .2, 3, 1)] });
  if (!n) {
    F.add({ mat: 'flesh', prof: 'round', bw: 1, grp: 'maw', shapes: [E([16 + sw, 11], 3.8, 2.2)] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'teeth', shapes: [13.4, 16, 18.6].map(x => spike([x + sw, 9.4], Math.PI / 2, 1.5, .5)).concat([14.6, 17.4].map(x => spike([x + sw, 12.8], -Math.PI / 2, 1.4, .5))) });
    anchors.eyes = [[12.4 + sw, 7, gT >= 2 ? EYE.red : EYE.amber], [19.6 + sw, 7, gT >= 2 ? EYE.red : EYE.amber]];
  }
  if (relic) { F.add({ mat: 'bronze', prof: 'bevel', bw: .8, grp: 'scale', relic: true, shapes: [P([[13.6 + sw, 3.4], [18.4 + sw, 3.4], [18.4 + sw, 5.2], [16 + sw, 7.2], [13.6 + sw, 5.2]])] }); F.add({ mat: 'topaz', prof: 'flat', grp: 'scalegem', noShadow: true, relic: true, shapes: [O([16 + sw, 4.8], .75)] }); anchors.glint = [14.4 + sw, 4]; }
}
// Gnash the Raider-King 32x32, before his banner: bare-chested in an indigo cloak, a bone crown, Dunebreaker planted at his side
function gnash(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', fl = f ? .8 : -.4, br = f ? .3 : 0;
  const cloth = gT >= 3 ? 'dark' : 'w.indigo', crown = gT >= 2 ? 'iron' : 'bone';
  F.add({ mat: 'bogwood', prof: 'round', bw: .6, grp: 'pole', shapes: [C([e ? 7 : 25, 31], [e ? 7 : 25, 2.4], .7), O([e ? 7 : 25, 2], 1)] });
  F.add({ mat: cloth, prof: 'round', bw: 1, grp: 'flag', shapes: [e ? P([[6.6, 3], [.4, 4 + fl], [1.4, 7.6], [.2, 11.4 + fl], [6.6, 10.6]]) : P([[25.4, 3], [31.6, 4 + fl], [30.6, 7.6], [31.8, 11.4 + fl], [25.4, 10.6]])], tex: q => (q.x % 2 === 0 ? -.5 : 0) });
  F.add({ mat: 'leatherRed', prof: 'flat', grp: 'mark', noShadow: true, noOutline: true, shapes: [e ? O([3.6, 6.8], 1.1) : O([28.4, 6.8], 1.1)] });
  F.add({ mat: cloth, prof: 'round', bw: 1.6, grp: 'cloak', shapes: [P(n ? [[8.6, 10.6], [23.4, 10.6], [25, 26.6], [21, 25], [16, 27.6], [11, 25], [7, 26.6]] : e ? [[12, 10.6], [18.4, 11], [17.6, 18], [15, 26.4], [9.4, 27], [8.6, 18]] : [[9.4, 10.6], [22.6, 10.6], [25, 25.4], [22.4, 24], [9.6, 24], [7, 25.4]])], tex: q => ((q.x + (q.y >> 2)) % 4 === 0 ? -.8 : 0) });
  F.add({ mat: cloth, prof: 'round', bw: 1.4, grp: 'legs', shapes: [C([e ? 15 : 13.4, 21], [e ? 14.4 + fl : 12.8, 29.6], 2.1, 1.8), C([e ? 17.4 : 18.6, 21], [e ? 18.2 - fl : 19.2, 29.6], 2.1, 1.8)] });
  F.add({ mat: 'leatherDark', prof: 'round', bw: 1, grp: 'boots', shapes: [E([e ? 15.2 + fl : 12.8, 29.8], 2.2, 1.4), E([e ? 18.8 - fl : 19.2, 29.8], 2.2, 1.4)] });
  if (!n) F.add({ mat: 'skinDeep', prof: 'round', bw: 2.4, grp: 'torso', shapes: [P(e ? [[12.6, 10.6], [20, 10.6], [20.4, 16], [18.6, 21], [13.4, 21], [12, 16]] : [[9.6, 10.6 + br], [22.4, 10.6 + br], [21.6, 16], [20.4, 21], [11.6, 21], [10.4, 16]])], tex: q => ((q.x * 5 + q.y * 3) % 17 === 0 ? { m: 'flesh', dd: 0 } : 0) });
  F.add({ mat: 'leatherDark', prof: 'round', bw: .6, grp: 'harness', noShadow: true, shapes: n ? [C([9.6, 20.6], [22.4, 20.6], 1.1)] : [C(e ? [13, 11.4] : [11, 11.4], e ? [19, 20] : [21, 20], .7), C(e ? [12.4, 20.4] : [10.6, 20.4], e ? [20, 20.4] : [21.4, 20.4], 1.1)] });
  if (!n) F.add({ mat: 'gold', prof: 'round', bw: .5, grp: 'buckle', noShadow: true, shapes: [O([e ? 17.6 : 16, 20.4], .9)] });
  const armL = e ? [[15, 12.4], [18.6, 19]] : [[9.6, 12.4], [7.4, 19.6]], armR = e ? [[17, 12.6], [21.4, 18]] : [[22.4, 12.4], [24, 19.4]];
  F.add({ mat: n ? cloth : 'skinDeep', prof: 'round', bw: 1.4, grp: 'arms', shapes: [C(armL[0], armL[1], 2, 1.7), C(armR[0], armR[1], 2, 1.7)] });
  F.add({ mat: 'skinDeep', prof: 'round', bw: 1, grp: 'fists', shapes: [O(armL[1], 1.7), O(armR[1], 1.7)] });
  if (relic) { // Dunebreaker, a stone maul, its head on the ground by his side
    const h = e ? [22.6, 19] : [6.6, 20], g0 = e ? [25.4, 27] : [4.6, 27];
    F.add({ mat: 'wood', prof: 'round', bw: .6, grp: 'haft', relic: true, shapes: [C(h, g0, .85)] });
    F.add({ mat: 'w.sandstone', prof: 'bevel', bw: 1.2, grp: 'maul', relic: true, shapes: [P(e ? [[21.8, 25.4], [29.6, 25], [30.2, 30.8], [22.2, 31]] : [[1, 25.2], [8.6, 24.8], [9, 30.8], [1.4, 31]])], tex: q => (q.x % 4 === 0 ? { m: 'bronze', dd: 0 } : 0) });
    anchors.glint = e ? [23.2, 25.8] : [2.2, 25.8];
  }
  F.add({ mat: 'skinDeep', prof: 'round', bw: 2, grp: 'head', shapes: [E([e ? 17 : 16, 7.4], e ? 3.2 : 3.6, 3.4)] });
  F.add({ mat: 'hairBlack', prof: 'round', bw: 1.2, grp: 'beard', shapes: [n ? E([16, 6.4], 3.6, 3.2) : e ? E([18.6, 9.6], 2.4, 2) : E([16, 10], 3, 2)], clip: n ? undefined : RECT(0, 8.6, 32, 32) });
  F.add({ mat: crown, prof: 'ridge', grp: 'crown', shapes: (e ? [-2, 0, 2] : [-3, -1.5, 0, 1.5, 3]).map((t, k) => spike([(e ? 16.6 : 16) + t, 4.8], -Math.PI / 2 + t * .15, 1.8 + (k % 2 ? 0 : .9), .6)) });
  F.add({ mat: gT >= 3 ? 'gold' : 'iron', prof: 'round', bw: .6, grp: 'crownband', shapes: [C([e ? 14.4 : 12.4, 5], [e ? 19.6 : 19.6, 5], .8)] });
  if (!n) anchors.eyes = e ? [[18.6, 7, gT >= 2 ? EYE.red : EYE.dark]] : [[14.6, 7.2, gT >= 2 ? EYE.red : EYE.dark], [17.4, 7.2, gT >= 2 ? EYE.red : EYE.dark]];
}
// the Ashen Warden 32x32: ash-black plate, the Cinder Crown burning on its helm, the Ashen Aegis on its arm, a greatsword planted
function ashenWarden(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', br = f ? .3 : 0, plate = 'blackiron';
  const cracks = q => ((q.x * 3 + q.y * 5) % (13 - gT * 2) === 0 ? { m: 'ember', dd: -1.2, e: 1 } : (q.y % 4 === 0 ? -.6 : 0));
  F.add({ mat: 'w.char', prof: 'round', bw: 1.4, grp: 'cloak', shapes: [P(e ? [[12.4, 11], [18, 11], [16, 20], [13.6, 28.4], [8, 29], [8.4, 19]] : [[9.6, 11], [22.4, 11], [24.6, 28], [21, 26.6], [18, 29], [14, 26.8], [10.4, 29], [7.4, 27.6]])], tex: q => (q.y > 25 && (q.x + q.y) % 3 === 0 ? -1 : 0) });
  F.add({ mat: plate, prof: 'round', bw: 1.4, grp: 'legs', shapes: [C([e ? 14.6 : 13.2, 21], [e ? 14 : 12.8, 30], 2.2, 1.9), C([e ? 17.4 : 18.8, 21], [e ? 18.4 : 19.2, 30], 2.2, 1.9)], tex: q => (q.y % 3 === 0 ? -.8 : 0) });
  if (relic && !e) { // the greatsword planted before it (the Warden's own blade, not a relic)
    F.add({ mat: plate, prof: 'ridge', grp: 'blade', shapes: [P([[15, 17.4], [17, 17.4], [16.6, 29], [16, 30.6], [15.4, 29]])] });
    F.add({ mat: 'ember', prof: 'flat', grp: 'fuller', noShadow: true, noOutline: true, shapes: [C([16, 18.4], [16, 28], .35)] });
  }
  F.add({ mat: plate, prof: 'round', bw: 2.4, grp: 'torso', shapes: [P(e ? [[12.6, 10.6], [19.6, 10.6], [19.2, 21], [13, 21]] : [[10, 10.6 + br], [22, 10.6 + br], [21, 21], [11, 21]])], tex: cracks });
  F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'belt', noShadow: true, shapes: [C(e ? [12.8, 20.4] : [10.8, 20.4], e ? [19.4, 20.4] : [21.2, 20.4], .8)] });
  F.add({ mat: plate, prof: 'round', bw: 1.6, grp: 'pauldrons', shapes: e ? [E([16, 11.6], 3.2, 2.2)] : [E([9.6, 11.8 + br], 3.1, 2.3), E([22.4, 11.8 + br], 3.1, 2.3)], tex: q => (q.y % 2 === 0 ? -.5 : 0) });
  F.add({ mat: plate, prof: 'round', bw: 1.2, grp: 'arms', shapes: e ? [C([16, 13], [18.6, 19.6], 1.8, 1.6)] : [C([9, 13.4], [15, 17.6], 1.8, 1.6), C([23, 13.4], [17, 17.6], 1.8, 1.6)] });
  F.add({ mat: plate, prof: 'round', bw: 2.2, grp: 'helm', shapes: [E([e ? 16.6 : 16, 7.2], 3.4, 3.6)] });
  if (!n) F.add({ mat: 'dark', prof: 'flat', grp: 'visor', noShadow: true, shapes: [e ? RECT(17, 7.4, 20.2, 8.6) : RECT(13.2, 7.4, 18.8, 8.6)] });
  if (relic) {
    // the Cinder Crown: burning tines on a bronze band around the helm
    F.add({ mat: 'ember', prof: 'ridge', grp: 'crown', relic: true, shapes: (e ? [-2, 0, 2] : [-3, -1.5, 0, 1.5, 3]).map((t, k) => spike([(e ? 16.4 : 16) + t, 4.6], -Math.PI / 2 + t * .18, 2 + (k % 2 ? 0 : 1) + (f && k === 2 ? .6 : 0), .7)) });
    F.add({ mat: 'bronze', prof: 'round', bw: .6, grp: 'crownband', relic: true, shapes: [C([e ? 14 : 12.6, 5], [e ? 19.6 : 19.4, 5], .8)] });
    // the Ashen Aegis: a kite shield of ash-black iron with an ember sigil
    const sh = e ? [[18.4, 12.6], [24, 12.6], [24, 19], [21.2, 24.6], [18.4, 19]] : n ? [[3.6, 12.6], [8.4, 12.6], [8.4, 19], [6, 23.4], [3.6, 19]] : [[20.4, 12.4], [27.4, 12.4], [27.4, 19], [23.9, 25.4], [20.4, 19]];
    F.add({ mat: 'w.char', prof: 'bevel', bw: 1.2, grp: 'aegis', relic: true, shapes: [P(sh)] });
    F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'aegisrim', relic: true, noShadow: true, shapes: [P(sh)], cuts: [P(sh.map(([x, y]) => [x + (x < (sh[0][0] + sh[1][0]) / 2 ? .9 : -.9), y + (y < 13 ? .9 : y > 20 ? -1.2 : 0)]))] });
    if (!n) { const c = [(sh[0][0] + sh[1][0]) / 2, 17]; F.add({ mat: 'ember', prof: 'flat', grp: 'sigil', noShadow: true, relic: true, shapes: [C([c[0], c[1] - 2.2], [c[0], c[1] + 2.4], .45), C([c[0] - 1.6, c[1]], [c[0] + 1.6, c[1]], .45)] }); anchors.glint = [sh[0][0] + 1.4, sh[0][1] + 1.4]; anchors.glint2 = [e ? 16.4 : 16, 3.2]; }
  }
  if (!n) anchors.eyes = e ? [[19.4, 8, EYE.amber]] : [[14.6, 8, EYE.amber], [17.4, 8, EYE.amber]];
}
const BEASTS = { briarling, thornhound, boglurcher, glowcap, rotgrub, rotstag, oldsnag, briarmaw, gloamwing, mirelord, sapwight, rotwarden,
  'sand-skink': sandSkink, 'glass-scorpion': glassScorpion, 'glass-matriarch': glassMatriarch, 'mirage-wisp': mirageWisp, 'wisp-queen': wispQueen, 'sand-wyrm': sandWyrm, gnash, kharzul, 'ashen-warden': ashenWarden };
// the Sunscorch beasts and lairs draw their own sprites whatever FOE_ART says, and carry their relics by default
const SUN_BEASTS = new Set(['sand-skink', 'glass-scorpion', 'glass-matriarch', 'mirage-wisp', 'wisp-queen', 'sand-wyrm', 'gnash', 'kharzul', 'ashen-warden']);
const SUN_BEAST_RELIC = { 'sand-wyrm': 'wyrmscale', gnash: 'dunebreaker', 'wisp-queen': 'mirage-glass', kharzul: 'cinderfang', 'ashen-warden': 'ashen-aegis' };

function beastSheet(build, w, h, { gT = 0, relic = null } = {}) {
  const out = new ImageData(w * 2, h * 4), d = out.data;
  ['s', 'n', 'e', 'w'].forEach((row, ri) => {
    const mirror = row === 'w', dir = mirror ? 'e' : row;
    for (let f = 0; f < 2; f++) {
      const F = new Forge(w, h), anchors = {};
      build(F, { dir, f, w, h, gT, relic, anchors });
      const R = F.raster({ mirror });
      for (let i = 0; i < R.idx.length; i++) if (R.own[i] >= 0 && R.idx[i] < 1) R.idx[i] = 1;
      const img = compose(R, { glow: !!anchors.halo });
      const mx = x => (mirror ? w - 1 - Math.round(x) : Math.round(x));
      if (anchors.fade) for (let y = anchors.fade; y < h; y++) for (let x = 0; x < w; x++) if ((x + y + f) & 1) img.data[(y * w + x) * 4 + 3] = 0; // a spirit's tail thins out
      const set = (x, y, c, a = 1) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4, s = img.data; if (a >= 1 || !s[i + 3]) { s[i] = c[0]; s[i + 1] = c[1]; s[i + 2] = c[2]; s[i + 3] = Math.max(s[i + 3], a * 255); return; } s[i] += (c[0] - s[i]) * a; s[i + 1] += (c[1] - s[i + 1]) * a; s[i + 2] += (c[2] - s[i + 2]) * a; };
      if (anchors.shadow) { // a flyer's shadow on the ground, dithered so the ground shows through
        const [sx, sy, r] = anchors.shadow;
        for (let y = Math.floor(sy - 2); y <= Math.ceil(sy + 2); y++) for (let x = Math.floor(sx - r); x <= Math.ceil(sx + r); x++) if (((x + .5 - sx) / r) ** 2 + ((y + .5 - sy) / 1.6) ** 2 < 1 && !img.data[(y * w + mx(x)) * 4 + 3] && (x + y) % 2 === 0) set(mx(x), y, [10, 8, 14], .7);
      }
      for (const [ex, ey, c] of anchors.eyes || []) set(mx(ex), Math.round(ey), c);
      for (const gl of [anchors.glint, anchors.glint2]) if (gl && relic) { const gx = mx(gl[0]), gy = Math.round(gl[1]); if (gy >= 0 && gy < h && img.data[(gy * w + gx) * 4 + 3]) set(gx, gy, [255, 250, 226]); }
      const s = img.data, ox = f * w, oy = ri * h;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, j = ((oy + y) * out.width + ox + x) * 4; d[j] = s[i]; d[j + 1] = s[i + 1]; d[j + 2] = s[i + 2]; d[j + 3] = s[i + 3]; }
    }
  });
  return out;
}

/* =====================================================================
   Objects (entities on the map)
   ===================================================================== */
export const OBJECT_KINDS = Object.freeze(['chest', 'hearth', 'gate', 'chain', 'crownwall', 'thornwall', 'bramble', 'boulder', 'ford-ice',
  'pedestal', 'board', 'sign', 'bellframe', 'lookout', 'rope', 'deer', 'ichor', 'door', 'table', 'tally-seal', 'barred-gate', 'rot-knot', 'stream',
  'dune-glass', 'mirage', 'quicksand', 'vault-seal', 'glass-spire', 'vault-door']);
// states each kind draws (the first is the default); any other state string falls back to the default
export const OBJECT_STATES = Object.freeze({
  chest: ['closed', 'open', 'locked', 'sealed'], hearth: ['lit', 'cold'], gate: ['closed', 'open'], chain: ['closed', 'post', 'open'],
  crownwall: ['closed', 'open'], thornwall: ['closed', 'open'], bramble: ['closed', 'open'], boulder: ['closed', 'open'],
  'ford-ice': ['ice', 'stream', 'roots'], pedestal: ['unlit', 'lit'], board: ['bounties', 'ladder'], sign: ['post', 'stone', 'plaque', 'cradle', 'cradle-full', 'monolith', 'spire'],
  bellframe: ['empty', 'rung'], lookout: ['closed'], rope: ['closed', 'open'], deer: ['graze', 'alert'], ichor: ['closed'],
  door: ['closed', 'open'], table: ['closed'], 'tally-seal': ['closed', 'open'], 'barred-gate': ['closed', 'open'], 'rot-knot': ['closed', 'open'], stream: ['closed'],
  'dune-glass': ['closed', 'open'], mirage: ['closed', 'open'], quicksand: ['closed', 'open'], 'vault-seal': ['closed', 'open'], 'glass-spire': ['closed'], 'vault-door': ['closed', 'open'],
});
// hearthfire id -> look (pass { id } to objectSprite('hearth', state, { id }))
export const HEARTH_LOOKS = Object.freeze({
  'hearthstone-keep': 'hall', 'milestone-fire': 'ring', thornhollow: 'ring', 'den-mouth': 'ring', 'mossfall-cairn': 'cairn', 'mosswatch-fire': 'brazier',
  'hindwood-cairn': 'cairn', 'fawnrest-stone': 'stone', 'eldergrove-hearth': 'ring', 'last-green-coal': 'coal',
  waystone: 'sandring', 'spire-hearth': 'sunbrazier', 'dust-cairn': 'sandcairn', pithead: 'brazier', 'shaft-lamp': 'lamp', 'well-fire': 'sandring', 'last-watchfire': 'watch',
});
const OBJ_SIZE = { gate: [16, 24], crownwall: [16, 24], thornwall: [16, 24], pedestal: [16, 24], board: [16, 24], bellframe: [16, 24], lookout: [16, 32], door: [16, 24], 'barred-gate': [16, 24] };
Object.assign(OBJ_SIZE, { 'dune-glass': [16, 24], 'vault-seal': [16, 24], 'glass-spire': [16, 24], 'vault-door': [16, 24] });
const OBJ_STATE_SIZE = { 'sign:monolith': [16, 24], 'sign:spire': [16, 32] };
const TALL_HEARTH = new Set(['hall', 'sunbrazier', 'lamp', 'watch']);
const ANIM = new Set(['crownwall', 'ichor', 'stream']);
const SUN_ANIM = new Set(['mirage', 'quicksand', 'vault-seal']); // two frames while shut
const flame = (F, cx, base, f, s = 1, mat = 'ember') => {
  const fl = f ? [[cx + .6 * s, base - 6.4 * s], [cx + 2.6 * s, base - 2.6 * s], [cx + 2.2 * s, base], [cx - 2.2 * s, base], [cx - 2.4 * s, base - 2.4 * s]] : [[cx - .6 * s, base - 6.8 * s], [cx + 2.4 * s, base - 2.2 * s], [cx + 2.2 * s, base], [cx - 2.2 * s, base], [cx - 2.6 * s, base - 3 * s]];
  F.add({ mat, prof: 'round', bw: 1.6 * s, grp: 'flame', noShadow: true, shapes: [P(fl)], tex: q => (q.y > base - 2.4 * s ? .9 : .2) + (f ? .3 : 0) });
  F.add({ mat: mat === 'ember' ? 'amber' : mat, prof: 'flat', grp: 'core', noShadow: true, noOutline: true, shapes: [E([cx, base - 1.6 * s], 1.1 * s, 1.5 * s)], tex: () => 1.2 });
};
const logs = (F, cx, y, charred) => F.add({ mat: charred ? 'rot' : 'wood', prof: 'round', bw: .8, grp: 'logs', shapes: [C([cx - 4, y + .6], [cx + 3.6, y - 1], .95), C([cx - 3.6, y - 1], [cx + 4, y + .6], .95)] });
function hearthParts(F, look, lit, f) {
  if (look === 'hall') {
    F.add({ mat: 'granite', prof: 'bevel', bw: 1.2, grp: 'mantel', shapes: [P([[.5, 23.5], [.5, 6], [2.5, 3.2], [8, 1.8], [13.5, 3.2], [15.5, 6], [15.5, 23.5]])], cuts: [P([[3.4, 23.8], [3.4, 11], [5, 8.4], [8, 7.6], [11, 8.4], [12.6, 11], [12.6, 23.8]])], tex: q => (q.y % 4 === 0 ? -1 : 0) });
    F.add({ mat: 'dark', prof: 'flat', grp: 'back', shapes: [P([[3.4, 23.5], [3.4, 11], [5, 8.4], [8, 7.6], [11, 8.4], [12.6, 11], [12.6, 23.5]])] });
    logs(F, 8, 21.6, !lit);
    if (lit) flame(F, 8, 21, f, 1.25, 'ember'); else F.add({ mat: 'clothGrey', prof: 'round', bw: .8, grp: 'ash', shapes: [E([8, 22.4], 3.6, 1.2)] });
    return;
  }
  if (look === 'cairn') {
    F.add({ mat: 'granite', prof: 'round', bw: 1.6, grp: 'stones', shapes: [E([8, 13.2], 6.4, 2.6), E([5.6, 10.6], 3, 2), E([10.6, 10.8], 3, 2), E([8, 8.6], 3.2, 1.9)] });
    if (lit) flame(F, 8, 7.8, f, .9); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 7.6], 2.2, .9)] });
    return;
  }
  if (look === 'brazier') {
    F.add({ mat: 'iron', prof: 'round', bw: .6, grp: 'legs', shapes: [C([5, 9], [3.6, 15.4], .7), C([11, 9], [12.4, 15.4], .7), C([8, 9], [8, 15.4], .7)] });
    F.add({ mat: 'iron', prof: 'round', bw: 1.2, grp: 'bowl', shapes: [P([[2.6, 6], [13.4, 6], [11.4, 9.8], [4.6, 9.8]])] });
    if (lit) flame(F, 8, 6.4, f, 1); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 6.2], 3.6, 1)] });
    return;
  }
  if (look === 'stone') {
    F.add({ mat: 'granite', prof: 'round', bw: 2.2, grp: 'stone', shapes: [P([[4.4, 15.4], [4.8, 4], [7, 1], [10, 1.4], [11.6, 4.6], [11.8, 15.4]])], tex: q => ((q.x * 3 + q.y) % 9 === 0 ? { m: 'moss', dd: 0 } : 0) });
    F.add({ mat: lit ? 'radiant' : 'granite', prof: 'flat', grp: 'runes', noShadow: true, noOutline: true, shapes: [C([8.5, 4.5], [8.5, 8.5], .55), C([6.5, 10.5], [10.5, 10.5], .55), O([8.5, 12.8], .75)], tex: () => (lit ? (f ? .3 : -.3) : -1.4) });
    if (lit) return 'halo';
    return;
  }
  if (look === 'coal') {
    F.add({ mat: 'bark', prof: 'round', bw: 1.4, grp: 'roots', shapes: [C([1.4, 14.6], [6, 10.6], 1.2, .8), C([14.6, 14.6], [10, 10.6], 1.2, .8), E([8, 13.4], 5.6, 2.4)] });
    F.add({ mat: lit ? 'verdant' : 'rot', prof: 'round', bw: 1.2, grp: 'coal', noShadow: true, shapes: [O([8, 10.6], 2.2)], tex: () => (lit ? (f ? .5 : -.2) : 0) });
    if (lit) return 'halo';
    return;
  }
  if (look === 'sunbrazier') { // the Spire Hearth: a bronze brazier on a sandstone plinth (16 x 24)
    F.add({ mat: 'w.sandstone', prof: 'bevel', bw: 1, grp: 'plinth', shapes: [RECT(3, 18, 13, 23.6)] });
    F.add({ mat: 'w.sandstone', prof: 'round', bw: 1.6, grp: 'pillar', shapes: [RECT(5.6, 10.6, 10.4, 18.4)], tex: q => (q.x === 7 ? -.8 : 0) });
    F.add({ mat: 'bronze', prof: 'round', bw: 1.2, grp: 'bowl', shapes: [P([[2.2, 7.4], [13.8, 7.4], [11.6, 11.2], [4.4, 11.2]])] });
    if (lit) flame(F, 8, 7.8, f, 1.1); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 7.6], 3.8, 1)] });
    return;
  }
  if (look === 'sandcairn') { // the Dust Cairn: red canyon stones
    F.add({ mat: 'w.redrock', prof: 'round', bw: 1.6, grp: 'stones', shapes: [E([8, 13.2], 6.4, 2.6), E([5.6, 10.6], 3, 2), E([10.6, 10.8], 3, 2), E([8, 8.6], 3.2, 1.9)] });
    if (lit) flame(F, 8, 7.8, f, .9); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 7.6], 2.2, .9)] });
    return;
  }
  if (look === 'lamp') { // the Shaft Lamp: a great miner's lamp hung from a timber post (16 x 24)
    F.add({ mat: 'wood', prof: 'bevel', bw: .8, grp: 'post', shapes: [RECT(2.6, 4, 5, 23.6), RECT(2.6, 4, 13, 6.2)] });
    F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'hook', shapes: [C([10.6, 6.2], [10.6, 8.6], .4)] });
    F.add({ mat: 'iron', prof: 'bevel', bw: .8, grp: 'lamp', shapes: [RECT(7.6, 8.8, 13.6, 15.6), P([[7, 9.2], [10.6, 7.4], [14.2, 9.2]]), RECT(8.4, 15.4, 12.8, 16.8)] });
    F.add({ mat: lit ? 'amber' : 'dark', prof: 'flat', grp: 'glass', noShadow: true, shapes: [RECT(8.6, 10, 12.6, 14.6)], tex: () => (lit ? (f ? .6 : 0) : -1) });
    return lit ? 'halo' : undefined;
  }
  if (look === 'watch') { // the Last Watchfire: a scorched stone pillar and its iron fire-bowl (16 x 24)
    F.add({ mat: 'w.char', prof: 'round', bw: 1.6, grp: 'pillar', shapes: [RECT(4.6, 10.4, 11.4, 23.6)], tex: q => (q.y % 4 === 0 ? -1 : 0) });
    F.add({ mat: 'blackiron', prof: 'round', bw: 1.2, grp: 'bowl', shapes: [P([[1.8, 7], [14.2, 7], [12, 11], [4, 11]])] });
    if (lit) flame(F, 8, 7.4, f, 1.1); else F.add({ mat: 'w.ash', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8, 7.2], 4, 1.1)] });
    return;
  }
  // ring: a campfire in a ring of stones (sandring: the Sunscorch's sandstone)
  F.add({ mat: look === 'sandring' ? 'w.sandstone' : 'granite', prof: 'round', bw: 1, grp: 'ring', shapes: [0, 1, 2, 3, 4, 5, 6].map(k => { const a = Math.PI * (1 + k / 6); return E([8 + Math.cos(a) * 5.6, 12.4 - Math.sin(a) * 2.6 * -1 + (k === 0 || k === 6 ? 0 : 0)], 1.5, 1.2); }).concat([E([4, 14.2], 1.5, 1.2), E([8, 15], 1.6, 1.1), E([12, 14.2], 1.5, 1.2)]) });
  logs(F, 8, 13, !lit);
  if (lit) flame(F, 8, 12.8, f, 1); else F.add({ mat: 'clothGrey', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8, 13.2], 2.6, 1)] });
}
function objectParts(F, kind, st, f, o, W, H) {
  const B = H - 1; // ground row
  switch (kind) {
    case 'chest': {
      const open = st === 'open';
      if (open) F.add({ mat: 'bogwood', prof: 'bevel', bw: .8, grp: 'lid', shapes: [P([[2.2, 2.4], [13.8, 2.4], [14.2, 7.4], [1.8, 7.4]])], tex: q => (q.x === 4 || q.x === 11 ? { m: 'iron', dd: 0 } : -.4) });
      F.add({ mat: 'wood', prof: 'bevel', bw: 1.2, grp: 'body', shapes: [RECT(1.6, 7.2, 14.4, 14.8)], tex: q => (q.y === 10 ? -1 : 0) });
      if (open) F.add({ mat: 'dark', prof: 'flat', grp: 'inside', shapes: [RECT(2.6, 7.2, 13.4, 9.2)] });
      else F.add({ mat: 'wood', prof: 'round', bw: 1.6, grp: 'lid', shapes: [E([8, 7.6], 6.5, 3.6)], clip: RECT(0, 0, 16, 8.2), tex: q => ((q.x + q.y) % 4 === 0 ? -1 : 0) });
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'bands', noShadow: true, shapes: [RECT(3.6, open ? 7.2 : 4.4, 4.8, 14.8), RECT(11.2, open ? 7.2 : 4.4, 12.4, 14.8)] });
      if (!open) F.add({ mat: st === 'sealed' ? 'ruby' : 'gold', prof: 'round', bw: .6, grp: 'lock', shapes: [st === 'sealed' ? O([8, 9], 1.5) : RECT(6.8, 7.6, 9.2, 10.4)] });
      if (st === 'locked') F.add({ mat: 'iron', prof: 'round', bw: .6, grp: 'padlock', shapes: [RECT(6.6, 9.6, 9.4, 12.6), C([7, 9.6], [9, 9.6], .5)], cuts: [RECT(7.6, 8.6, 8.4, 9.6)] });
      return;
    }
    case 'hearth': return hearthParts(F, o.look || HEARTH_LOOKS[o.id] || 'ring', st !== 'cold', f);
    case 'gate': {
      const up = st === 'open', top = up ? 1 : 1, bot = up ? 8.5 : B + .5;
      F.add({ mat: 'wood', prof: 'bevel', bw: .8, grp: 'beam', shapes: [RECT(-1, top, 17, top + 2.6)] });
      F.add({ mat: 'iron', prof: 'round', bw: .6, grp: 'bars', shapes: [2.5, 6, 10, 13.5].map(x => C([x, top + 2], [x, bot - .6], .75)).concat([C([-1, (top + bot) / 2 + 1], [17, (top + bot) / 2 + 1], .6), C([-1, bot - 3], [17, bot - 3], .6)]) });
      if (!up) F.add({ mat: 'iron', prof: 'ridge', grp: 'spikes', shapes: [2.5, 6, 10, 13.5].map(x => P([[x - .9, bot - 1.2], [x, bot + .4], [x + .9, bot - 1.2]])) });
      return;
    }
    case 'chain': {
      if (st === 'post' || st === 'closed') {
        const links = []; for (let k = 0; k < 7; k++) { const x = k * 2.4 + .2, y = 8.6 + Math.sin((x / 16) * Math.PI) * 2.4; links.push(k % 2 ? E([x, y], 1.3, .7) : E([x, y], .8, 1.1)); }
        F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'links', shapes: links, cuts: links.map(l => E(l.c, l.rx * .45, l.ry * .45)) });
      }
      if (st === 'post') F.add({ mat: 'wood', prof: 'round', bw: 1.2, grp: 'post', shapes: [RECT(1, 3, 4.4, B + .4), E([2.7, 3], 1.7, 1)] });
      if (st === 'open') F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'links', shapes: [0, 1, 2, 3, 4, 5].map(k => E([k * 2.6 + 1.6, 13.6 + (k % 2) * .6], k % 2 ? 1.3 : .8, k % 2 ? .7 : .9)) });
      return;
    }
    case 'crownwall': {
      if (st === 'open') { F.add({ mat: 'rotwood', prof: 'round', bw: 1, grp: 'stumps', shapes: [C([3, B], [2.2, B - 4], 1.4, .8), C([8.4, B], [9, B - 5], 1.5, .8), C([13, B], [13.8, B - 3.4], 1.3, .7)] }); return; }
      const vines = [[[-1, B - 2], [5, 8], [3, 1]], [[17, B - 1], [11, 9], [13, 1.4]], [[2, B], [9, 13], [15, 5]], [[14, B], [7, 12], [1, 6]]];
      vines.forEach((pts, k) => F.add({ mat: k % 2 ? 'bark' : 'bramble', prof: 'round', bw: 1.2, grp: 'v' + k, shapes: [C(pts[0], pts[1], 1.6, 1.3), C(pts[1], pts[2], 1.3, .8)] }));
      F.add({ mat: 'thorn', prof: 'ridge', grp: 'thorns', shapes: [[3, 5, -2.4], [12.4, 6, -.6], [5.6, 16, 2.6], [11, 17, .4], [8, 3, -1.6], [2, 12, 3], [14, 12, -.2]].map(([x, y, a]) => spike([x, y], a, 2.4, .7)) });
      F.add({ mat: 'verdant', prof: 'round', bw: 1.4, grp: 'knot', noShadow: true, shapes: [O([8, 11.4], f ? 2.5 : 2)], tex: () => (f ? .6 : -.2) });
      F.add({ mat: 'bramble', prof: 'round', bw: .6, grp: 'knotwrap', shapes: [C([5.6, 10], [10.4, 12.8], .6), C([5.6, 12.8], [10.4, 10], .6)] });
      return 'halo';
    }
    case 'thornwall': {
      if (st === 'open') { F.add({ mat: 'thorn', prof: 'round', bw: .8, grp: 'stumps', shapes: [C([2, B], [2.8, B - 3], 1.2, .6), C([7, B], [6.4, B - 4], 1.3, .6), C([12, B], [12.8, B - 2.6], 1.2, .6)] }); F.add({ mat: 'bramble', prof: 'round', bw: .5, grp: 'cut', shapes: [C([0, B - .6], [16, B - .4], .7)] }); return; }
      // a wall of enchanted thorn: a dark mass, thick twisted vines across it, long thorns, a few green glints
      F.add({ mat: 'bramble', prof: 'round', bw: 2, grp: 'mass', shapes: [P([[-1, B + .5], [-1, 5.4], [2.6, 2.2], [6.4, 4.6], [10, 1.2], [13.4, 3.6], [17, 2.6], [17, B + .5]])], tex: q => ((q.x * 2 + q.y * 3) % 7 < 2 ? -1 : 0) - .4 });
      F.add({ mat: 'bark', prof: 'round', bw: 1, grp: 'vines', shapes: [C([-1, 9], [6, 12.6], 1.5, 1.2), C([6, 12.6], [17, 8], 1.2, 1.5), C([-1, 18], [8, 15.4], 1.4, 1.1), C([8, 15.4], [17, 18.6], 1.1, 1.4), C([4, B + .5], [5.4, 5.6], 1.1, .7), C([12.4, B + .5], [11, 4], 1.1, .7)] });
      F.add({ mat: 'thorn', prof: 'ridge', grp: 'thorns', shapes: [[2.4, 3, -2.2, 3], [6.4, 4.4, -1.5, 2.6], [10, 1.4, -1.2, 3.2], [14, 3.4, -.6, 2.8], [1.4, 10.4, -2.8, 2.6], [8.2, 12.6, -1.9, 2.4], [15.2, 9, -.4, 2.6], [4, 16.6, -2.7, 2.4], [11.6, 15.8, -.3, 2.6], [.6, 19, 2.9, 2.2], [15.4, 19.4, .2, 2.2]].map(([x, y, a, l]) => spike([x, y], a, l, .8)) });
      F.add({ mat: 'verdant', prof: 'flat', grp: 'glints', noShadow: true, noOutline: true, shapes: [O([6.5, 8.5], .6), O([12.5, 13.5], .6), O([3.5, 20.5], .5)] });
      return;
    }
    case 'bramble': {
      if (st === 'open') { F.add({ mat: 'bramble', prof: 'round', bw: 1, grp: 'sides', shapes: [E([1.6, 12], 2.6, 3.4), E([14.4, 12.4], 2.6, 3)] }); return; }
      F.add({ mat: 'bramble', prof: 'round', bw: 2.2, grp: 'bush', shapes: [E([5, 10.4], 4.6, 4.6), E([11, 10], 4.8, 4.8), E([8, 6.6], 4.6, 4.2)], tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? -1 : 0) + ((q.x + 2 * q.y) % 5 === 0 ? { m: 'bark', dd: 0 } : 0) });
      F.add({ mat: 'thorn', prof: 'ridge', grp: 'thorns', shapes: [[2, 7, -2.6], [8, 2.6, -1.6], [14, 7, -.5], [1.4, 13, 2.8], [14.6, 13, .3]].map(([x, y, a]) => spike([x, y], a, 2, .6)) });
      return;
    }
    case 'boulder': {
      if (st === 'open') { F.add({ mat: 'granite', prof: 'round', bw: 1.4, grp: 'rubble', shapes: [E([4, 13], 2.8, 2), E([11.6, 13.4], 3, 1.8), E([8, 14.4], 2, 1.2), E([13.4, 10.6], 1.4, 1.1)] }); return; }
      F.add({ mat: 'granite', prof: 'round', bw: 3.4, grp: 'rock', shapes: [P([[1.6, 14.6], [2.2, 7], [5, 2.8], [10.4, 2.2], [14, 5.6], [14.6, 14.6], [8, 15.4]])], tex: q => (q.x + (q.y >> 1)) % 7 === 0 ? -1 : 0 });
      F.add({ mat: 'dark', prof: 'flat', grp: 'crack', noShadow: true, noOutline: true, shapes: [C([8.4, 3], [7, 8], .5), C([7, 8], [9.6, 12.6], .5), C([7, 8], [4.6, 10], .4)] });
      return;
    }
    case 'ford-ice': {
      if (st === 'stream') return objectParts(F, 'stream', 'closed', f, o, W, H);
      if (st === 'roots') { F.add({ mat: 'bark', prof: 'round', bw: 1.6, grp: 'roots', shapes: [C([-1, 5], [17, 7], 1.8), C([-1, 11], [17, 10], 2), C([4, -1], [6, 17], 1)], tex: q => ((q.x + q.y) % 3 === 0 ? -1 : 0) }); F.add({ mat: 'water', prof: 'flat', grp: 'glow', noShadow: true, noOutline: true, shapes: [O([6, 8], .6), O([12, 10], .6)] }); return; }
      F.add({ mat: 'rime', prof: 'flat', grp: 'ice', noShadow: true, noOutline: true, shapes: [RECT(-1, -1, 17, 17)], tex: q => ((q.x * 3 + q.y * 7) % 13 === 0 ? -.2 : (q.x - q.y + 16) % 9 === 0 ? -1.9 : -1.2) + bayer(q.x, q.y) * .4 });
      F.add({ mat: 'rime', prof: 'flat', grp: 'cracks', noShadow: true, noOutline: true, shapes: [C([2.5, 3.5], [7.5, 7.5], .55), C([7.5, 7.5], [13.5, 5.5], .55), C([7.5, 7.5], [9.5, 13.5], .55)], tex: () => -2.2 });
      return;
    }
    case 'stream': {
      const sh = [0, 1, 2, 3].map(k => { const y = 2.5 + k * 4 + (f ? 2 : 0) % 4, x0 = (k * 5 + (f ? 3 : 0)) % 8 + .5; return C([x0, y], [x0 + 5, y + .4], .55); });
      F.add({ mat: 'rime', prof: 'flat', grp: 'foam', noShadow: true, noOutline: true, shapes: sh, tex: q => ((q.x + q.y) % 3 === 0 ? -.6 : -1.4) });
      F.add({ mat: 'water', prof: 'flat', grp: 'wake', noShadow: true, noOutline: true, shapes: sh.map(s => C([s.a[0] + 1, s.a[1] + 1], [s.b[0] + 2, s.b[1] + 1], .45)), tex: () => -1.6 });
      return;
    }
    case 'pedestal': {
      const lit = st === 'lit';
      F.add({ mat: 'granite', prof: 'bevel', bw: 1, grp: 'base', shapes: [RECT(3, B - 2.6, 13, B + .4)] });
      F.add({ mat: 'granite', prof: 'round', bw: 1.6, grp: 'column', shapes: [RECT(5, 13, 11, B - 2.4)], tex: q => (q.x === 7 ? -1 : 0) });
      F.add({ mat: 'granite', prof: 'bevel', bw: 1, grp: 'top', shapes: [RECT(3.4, 11, 12.6, 13.6)] });
      if (lit) { F.add({ mat: 'radiant', prof: 'flat', grp: 'glow', noShadow: true, noOutline: true, shapes: [E([8, 10.6], 3.4, .9)], tex: () => -1 }); return 'halo'; }
      return;
    }
    case 'board': {
      F.add({ mat: 'wood', prof: 'round', bw: .8, grp: 'posts', shapes: [RECT(1.4, 5, 3.2, B + .4), RECT(12.8, 5, 14.6, B + .4)] });
      F.add({ mat: st === 'ladder' ? 'bogwood' : 'wood', prof: 'bevel', bw: 1, grp: 'board', shapes: [RECT(.6, 5.4, 15.4, 15.4)], tex: q => (q.y % 3 === 0 ? -1 : 0) });
      F.add({ mat: 'bogwood', prof: 'bevel', bw: .8, grp: 'roof', shapes: [P([[-.4, 5.8], [8, 1.6], [16.4, 5.8], [16.4, 6.8], [-.4, 6.8]])] });
      F.add({ mat: 'parchment', prof: 'flat', grp: 'notes', shapes: st === 'ladder' ? [RECT(2, 7.4, 5.4, 11.6), RECT(6.4, 7.4, 9.6, 11.6), RECT(10.6, 7.4, 14, 11.6), RECT(4, 12.4, 7.4, 14.6), RECT(8.6, 12.4, 12, 14.6)] : [RECT(2, 7.6, 6.4, 12.6), RECT(7.4, 8.4, 11, 11.8), RECT(11.6, 7.4, 14.2, 13.6), RECT(4.4, 13, 8.6, 14.8)], tex: q => (q.y % 2 === 0 ? -1.2 : 0) });
      F.add({ mat: 'paintRed', prof: 'flat', grp: 'pins', noShadow: true, shapes: [O([4.2, 8.2], .5), O([9.2, 9], .5), O([12.9, 8], .5)] });
      return;
    }
    case 'sign': {
      if (st === 'cradle' || st === 'cradle-full') { // Zara's crate cradle: a rope-slung frame on straw; full, the humming crate is home
        F.add({ mat: 'thorn', prof: 'flat', grp: 'straw', noShadow: true, shapes: [E([8, B - 1.2], 7, 2)], tex: q => ((q.x + q.y * 2) % 3 === 0 ? -1 : 0) });
        F.add({ mat: 'wood', prof: 'round', bw: .7, grp: 'frame', shapes: [C([1.6, B], [3.4, 6.6], .7), C([5.2, B], [3.4, 6.6], .7), C([14.4, B], [12.6, 6.6], .7), C([10.8, B], [12.6, 6.6], .7), C([3.4, 7.2], [12.6, 7.2], .6)] });
        if (st === 'cradle-full') {
          F.add({ mat: 'wood', prof: 'bevel', bw: 1, grp: 'crate', shapes: [RECT(3.4, 8.4, 12.6, 14.6)], tex: q => (q.y === 11 || q.x === 8 ? -1 : 0) });
          F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'fittings', noShadow: true, shapes: [RECT(3.4, 8.4, 4.6, 14.6), RECT(11.4, 8.4, 12.6, 14.6)] });
          F.add({ mat: 'leather', prof: 'round', bw: .8, grp: 'waterskin', shapes: [E([13.4, 10.4], 1.4, 2)] });
        } else F.add({ mat: 'string', prof: 'round', bw: .4, grp: 'ropes', shapes: [C([3.6, 7.6], [6, 13.6], .4), C([12.4, 7.6], [10, 13.6], .4), C([6, 13.6], [10, 13.6], .4)] });
        return;
      }
      if (st === 'monolith') { // a standing stone taller than a rider, a sun carved above a road (16 x 24)
        F.add({ mat: 'w.sandstone', prof: 'round', bw: 2.2, grp: 'stone', shapes: [P([[4, B + .4], [4.4, 5], [6.4, 1.6], [10, 1.2], [11.8, 4.6], [12.2, B + .4]])], tex: q => (q.y % 5 === 0 ? -.6 : 0) });
        F.add({ mat: 'dark', prof: 'flat', grp: 'carving', noShadow: true, noOutline: true, shapes: [O([8.2, 7], 1.6), C([8.2, 11.6], [8.2, 17], .45), C([6.2, 17], [10.2, 17], .45)], cuts: [O([8.2, 7], .8)], tex: () => -1 });
        return;
      }
      if (st === 'spire') { // the Spire: a finger of red rock the city grew round (16 x 32)
        F.add({ mat: 'w.redrock', prof: 'round', bw: 2.6, grp: 'rock', shapes: [P([[2.4, B + .4], [3.6, 16], [5, 6], [7.4, 1], [9.6, 2.2], [11.4, 9], [12.6, 18], [13.6, B + .4]])], tex: q => ((q.y + (q.x >> 2)) % 4 === 0 ? -.8 : 0) });
        F.add({ mat: 'dark', prof: 'flat', grp: 'words', noShadow: true, noOutline: true, shapes: [C([5.4, 26], [10.6, 26], .35), C([6, 28], [10, 28], .35)], tex: () => -1 });
        return;
      }
      if (st === 'stone') { F.add({ mat: 'granite', prof: 'round', bw: 2, grp: 'stone', shapes: [P([[4, 15.4], [4.4, 5], [8, 2.6], [11.6, 5], [12, 15.4]])], tex: q => ((q.x * 3 + q.y) % 11 === 0 ? { m: 'moss', dd: 0 } : 0) }); F.add({ mat: 'dark', prof: 'flat', grp: 'mark', noShadow: true, noOutline: true, shapes: [C([8, 6], [8, 11], .5), C([6.4, 7.6], [9.6, 7.6], .45)] }); return; }
      F.add({ mat: 'wood', prof: 'round', bw: .8, grp: 'post', shapes: [RECT(7, 6, 9, B + .4)] });
      F.add({ mat: 'wood', prof: 'bevel', bw: .9, grp: 'plank', shapes: [st === 'plaque' ? RECT(2.4, 3, 13.6, 9.4) : P([[1.4, 3.4], [12.4, 3.4], [14.8, 6.2], [12.4, 9], [1.4, 9]])], tex: q => (q.y === 6 ? -1 : 0) });
      F.add({ mat: 'dark', prof: 'flat', grp: 'text', noShadow: true, noOutline: true, shapes: [C([3.4, 5.2], [10, 5.2], .35), C([3.4, 7.2], [8.4, 7.2], .35)], tex: () => 1 });
      return;
    }
    case 'bellframe': {
      F.add({ mat: 'wood', prof: 'round', bw: .9, grp: 'frame', shapes: [RECT(1.4, 3, 3.2, B + .4), RECT(12.8, 3, 14.6, B + .4), RECT(.4, 2.4, 15.6, 4.6)] });
      F.add({ mat: 'bogwood', prof: 'round', bw: .6, grp: 'brace', shapes: [C([3, 8], [6, 4.4], .5), C([13, 8], [10, 4.4], .5)] });
      if (st === 'rung') { F.add({ mat: 'bronze', prof: 'round', bw: 1.4, grp: 'bell', shapes: [P([[6, 6.4], [10, 6.4], [11.6, 12.6], [4.4, 12.6]]), E([8, 6.4], 2, 1.2)] }); F.add({ mat: 'gold', prof: 'round', bw: .5, grp: 'lip', noShadow: true, shapes: [C([4.4, 12.4], [11.6, 12.4], .6)] }); }
      else F.add({ mat: 'string', prof: 'flat', grp: 'rope', noShadow: true, shapes: [C([8, 4.6], [8.6, 11], .4)] });
      return;
    }
    case 'lookout': {
      F.add({ mat: 'wood', prof: 'round', bw: .8, grp: 'legs', shapes: [C([2.6, B + .4], [3.8, 12], .9), C([13.4, B + .4], [12.2, 12], .9)] });
      F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'ladder', shapes: [C([6.4, B + .4], [6.4, 12], .45), C([9.6, B + .4], [9.6, 12], .45)].concat([15, 19, 23, 27].map(y => C([6.4, y], [9.6, y], .4))) });
      F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'cross', noShadow: true, shapes: [C([3, 26], [12.8, 16], .45), C([13, 26], [3.2, 16], .45)] });
      F.add({ mat: 'wood', prof: 'bevel', bw: 1, grp: 'deck', shapes: [RECT(.6, 9.4, 15.4, 12.6)], tex: q => (q.x % 3 === 0 ? -1 : 0) });
      F.add({ mat: 'wood', prof: 'round', bw: .6, grp: 'rail', shapes: [RECT(.6, 5, 2, 9.6), RECT(14, 5, 15.4, 9.6), C([1, 5.4], [15, 5.4], .5)] });
      F.add({ mat: 'leather', prof: 'bevel', bw: .8, grp: 'roof', shapes: [P([[-.4, 4.4], [8, .6], [16.4, 4.4], [16.4, 5.4], [-.4, 5.4]])] });
      return;
    }
    case 'rope': {
      F.add({ mat: 'wood', prof: 'round', bw: .7, grp: 'stake', shapes: [RECT(6.6, .4, 9.4, 3.6)] });
      if (st === 'open') F.add({ mat: 'string', prof: 'round', bw: .5, grp: 'rope', shapes: [C([8, 3], [8.6, 9], .6), C([8.6, 9], [7.6, 15.4], .6), O([8.4, 7], .9), O([8, 12], .9)] });
      else F.add({ mat: 'string', prof: 'round', bw: .5, grp: 'rope', shapes: [C([8, 3], [9.6, 5.4], .55), C([9.6, 5.4], [10.4, 5.2], .4)] });
      return;
    }
    case 'deer': {
      const down = st !== 'alert' && f === 0;
      F.add({ mat: 'stagWhite', prof: 'round', bw: .6, grp: 'legsF', tex: FAR, shapes: [C([4.6, 10], [4, 15.4], .6), C([10.6, 10], [11.4, 15.4], .6)] });
      F.add({ mat: 'stagWhite', prof: 'round', bw: 1.6, grp: 'body', shapes: [E([8, 9], 4.6, 2.6)], tex: q => (q.y > 10 ? -.5 : 0) });
      F.add({ mat: 'stagWhite', prof: 'round', bw: .6, grp: 'legs', shapes: [C([5.4, 10.4], [5.8, 15.4], .6), C([10, 10.4], [9.6, 15.4], .6)] });
      F.add({ mat: 'stagWhite', prof: 'round', bw: 1, grp: 'head', shapes: down ? [C([4, 8.4], [2.4, 12.4], 1.2, .8), E([2, 13], 1.4, 1)] : [C([4, 8], [3, 4.4], 1.2, .9), E([2.4, 3.8], 1.6, 1.1), P([[3.2, 2.8], [4.6, .6], [4.4, 3]])] });
      F.add({ mat: 'stagWhite', prof: 'round', bw: .5, grp: 'tail', shapes: [C([12.4, 8], [13.6, 7.2], .7, .4)] });
      return;
    }
    case 'ichor': {
      const b = f ? [[4, 5, 1.2], [11, 10, 1.5], [7, 12, .9]] : [[5, 6, 1], [10.4, 9.4, 1.1], [8, 12.6, 1.3]];
      F.add({ mat: 'sap', prof: 'round', bw: .8, grp: 'bubbles', shapes: b.map(([x, y, r]) => O([x, y], r)) });
      F.add({ mat: 'blight', prof: 'flat', grp: 'glints', noShadow: true, noOutline: true, shapes: b.map(([x, y, r]) => O([x - r * .4, y - r * .4], .45)), tex: () => (f ? .2 : -.6) });
      return;
    }
    case 'door': {
      F.add({ mat: 'bark', prof: 'bevel', bw: 1.2, grp: 'frame', shapes: [P([[.6, B + .5], [.6, 7], [3, 2.6], [8, 1], [13, 2.6], [15.4, 7], [15.4, B + .5]])], tex: q => ((q.x + (q.y >> 1)) % 4 === 0 ? -1 : 0) });
      const inner = P([[3.2, B + .5], [3.2, 8], [5, 5], [8, 4], [11, 5], [12.8, 8], [12.8, B + .5]]);
      if (st === 'open') F.add({ mat: 'dark', prof: 'flat', grp: 'opening', shapes: [inner] });
      else { F.add({ mat: 'wood', prof: 'bevel', bw: .8, grp: 'leaf', shapes: [inner], tex: q => (q.x === 8 ? -1.2 : ((q.x * 5 + q.y) % 9 === 0 ? -1 : 0)) }); F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'ring', shapes: [O([10.4, 15], .9)], cuts: [O([10.4, 15], .4)] }); F.add({ mat: 'verdant', prof: 'flat', grp: 'rings', noShadow: true, noOutline: true, shapes: [O([8, 9], 1.6)], cuts: [O([8, 9], 1)], tex: () => -1.6 }); }
      return;
    }
    case 'table': {
      F.add({ mat: 'wood', prof: 'round', bw: .6, grp: 'legs', shapes: [RECT(2, 10, 3.4, 15.4), RECT(12.6, 10, 14, 15.4)] });
      F.add({ mat: 'wood', prof: 'bevel', bw: 1, grp: 'top', shapes: [RECT(.4, 5, 15.6, 11)] });
      F.add({ mat: 'parchment', prof: 'flat', grp: 'map', shapes: [RECT(2.4, 5.8, 13.6, 9.8)], tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? { m: 'moss', dd: -1 } : 0) });
      F.add({ mat: 'paintRed', prof: 'flat', grp: 'pins', noShadow: true, noOutline: true, shapes: [O([5, 7.4], .5), O([10.4, 8.4], .5)] });
      return;
    }
    case 'tally-seal': {
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'chain', shapes: [C([2, 4], [8, 8], .45), C([14, 4], [8, 8], .45)] });
      if (st === 'open') { F.add({ mat: 'ruby', prof: 'round', bw: .6, grp: 'shards', shapes: [E([6.4, 12.6], 1.4, .8), E([10, 13.2], 1.2, .7)] }); return; }
      F.add({ mat: 'ruby', prof: 'round', bw: 1.4, grp: 'wax', shapes: [O([8, 9.6], 3.1)] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'tally', noShadow: true, noOutline: true, shapes: [C([6.6, 8.2], [6.6, 11], .35), C([8, 8.2], [8, 11], .35), C([9.4, 8.2], [9.4, 11], .35), C([5.8, 11], [10.2, 8.2], .35)], tex: () => -1 });
      return;
    }
    case 'barred-gate': {
      const open = st === 'open';
      F.add({ mat: 'wood', prof: 'round', bw: 1, grp: 'posts', shapes: [RECT(.2, 3, 2.4, B + .5), RECT(13.6, 3, 15.8, B + .5)] });
      if (!open) F.add({ mat: 'wood', prof: 'bevel', bw: .8, grp: 'planks', shapes: [RECT(2.4, 5, 13.6, B)], tex: q => ((q.x - 2) % 3 === 0 ? -1.2 : 0) });
      else F.add({ mat: 'wood', prof: 'bevel', bw: .8, grp: 'planks', shapes: [RECT(2.4, 5, 5, B)], tex: q => (q.x === 4 ? -1 : 0) });
      F.add({ mat: open ? 'bogwood' : 'iron', prof: 'round', bw: .7, grp: 'bar', shapes: [open ? C([13, 5], [15.4, 13], .9) : C([.4, 13], [15.6, 13], 1)] });
      return;
    }
    case 'rot-knot': {
      if (st === 'open') { F.add({ mat: 'rotwood', prof: 'round', bw: .6, grp: 'strands', shapes: [C([1, 14], [6, 9], .7, .4), C([15, 14], [10, 8.6], .7, .4), C([8, 15.4], [8.4, 10], .7, .4)] }); return; }
      F.add({ mat: 'rotwood', prof: 'round', bw: 2, grp: 'knot', shapes: [C([-1, 13], [9, 6], 2.2, 1.6), C([17, 13], [7, 6.4], 2.2, 1.6), O([8, 8.4], 3.6)], tex: q => ((q.x + q.y) % 3 === 0 ? -1 : 0) });
      F.add({ mat: 'sap', prof: 'round', bw: .5, grp: 'ooze', noShadow: true, shapes: [C([6.6, 10.6], [6.4, 14.4], .55, .35)] });
      F.add({ mat: 'blight', prof: 'flat', grp: 'heart', noShadow: true, noOutline: true, shapes: [O([8.4, 8.2], 1)], tex: () => -.6 });
      return;
    }
  }
  if (kind === 'dune-glass') { // a dune fused to glass, still warm: a honey-amber wall that joins its neighbours; open, it has run flat
    if (st === 'open') {
      F.add({ mat: 'w.glass', prof: 'round', bw: .8, grp: 'pool', shapes: [E([8, B - 1.6], 6.4, 1.8)], tex: q => ((q.x + q.y) % 3 === 0 ? -.8 : 0) });
      F.add({ mat: 'w.glass', prof: 'ridge', grp: 'shards', shapes: [spike([3.4, B - 1.6], -2.3, 2.2, .6), spike([12.6, B - 1.2], -.9, 1.9, .6)] });
      return;
    }
    F.add({ mat: 'w.glass', prof: 'round', bw: 3, grp: 'mass', shapes: [P([[-1, B + .5], [-1, 9], [1.6, 5.4], [5.4, 4.2], [8.6, 2], [12.4, 3.4], [15.4, 5], [17, 7.6], [17, B + .5]])], tex: q => -.7 + (q.y > B - 2 ? -.6 : 0) });
    F.add({ mat: 'w.glass', prof: 'round', bw: 2.2, grp: 'lumps', shapes: [E([4.4, 14.6], 3.6, 3.2), E([11.6, 10.4], 3.8, 3.4)], tex: () => -.4 });
    F.add({ mat: 'w.glass', prof: 'flat', grp: 'cracks', noShadow: true, noOutline: true, shapes: [C([6.5, 5.5], [4.5, 10.5], .6), C([4.5, 10.5], [5.5, 12.5], .6), C([13.5, 15.5], [11.5, 20.5], .6)], tex: () => -2.2 });
    F.add({ mat: 'w.glass', prof: 'flat', grp: 'shine', noShadow: true, noOutline: true, shapes: [C([2.5, 8.5], [4.5, 6.5], .6), C([9.5, 3.5], [11.5, 3.5], .6), C([10.5, 8.5], [11.5, 7.5], .6)], tex: () => 2 });
    F.add({ mat: 'amber', prof: 'flat', grp: 'heat', noShadow: true, noOutline: true, shapes: [C([3.5, 18.5], [6.5, 15.5], .6), C([12.5, 7.5], [13.5, 10.5], .6)], tex: () => -1.4 });
    return;
  }
  if (kind === 'mirage') { // heat shimmer: pale wavering lines with glints of false sky, the ground showing through; open: gone
    if (st === 'open') return;
    const ph = f ? 1.6 : 0, lines = [2.4, 7.4, 12.4].map((x0, k) => { const pts = []; for (let y = -1; y <= 17; y += 2) pts.push([x0 + Math.sin(((y + ph + k * 5) / 16) * Math.PI * 4) * 1.2, y]); return pts; });
    F.add({ mat: 'w.mirage', prof: 'flat', grp: 'waves', noShadow: true, noOutline: true, shapes: lines.flatMap(pts => pts.slice(0, -1).map((a, i) => C(a, pts[i + 1], .45))), tex: q => ((q.y + (f ? 2 : 0)) % 4 === 0 ? .2 : -.8) });
    F.add({ mat: 'frost', prof: 'flat', grp: 'sky', noShadow: true, noOutline: true, shapes: [C([4.4, 4 + ph], [6, 4 + ph], .4), C([9.6, 11 - ph], [11.4, 11 - ph], .4)], tex: () => -.4 });
    return 'halo';
  }
  if (kind === 'quicksand') { // the sand breathes: dark wet rings that swell and settle; open: firm stones mark the way across
    // a periodic swirl (noise contours, period 16) so a field of quicksand reads as one, not as tiles
    F.add({ mat: 'w.sand', prof: 'flat', grp: 'sand', noOutline: true, noShadow: true, shapes: [RECT(-1, -1, 17, 17)], tex: q => { const n = qsNoise(q.x + (f ? 1 : 0), q.y); return Math.abs(n - .5) < .07 ? -.5 : Math.abs(n - .3) < .05 ? -.9 : -1.7 + n * .6 + bayer(q.x, q.y) * .3; } });
    if (st === 'open') F.add({ mat: 'w.sandstone', prof: 'round', bw: 1, grp: 'stones', shapes: [E([4, 5], 2.2, 1.5), E([10.6, 8.6], 2.4, 1.6), E([5.6, 12.6], 2.2, 1.5)] });
    else F.add({ mat: 'w.sand', prof: 'flat', grp: 'bubble', noShadow: true, noOutline: true, shapes: [O(f ? [9.5, 6.5] : [6.5, 9.5], .7)], tex: () => .4 });
    return;
  }
  if (kind === 'vault-seal') { // an ash-black seal across the vault door, older than Scorchgate; open, it has crumbled and the way down is dark
    F.add({ mat: 'w.char', prof: 'bevel', bw: 1, grp: 'lintel', shapes: [RECT(-1, 2, 17, 5.4)] });
    if (st === 'open') {
      F.add({ mat: 'dark', prof: 'flat', grp: 'way', shapes: [RECT(-1, 5.4, 17, B + .5)], tex: q => (q.y > 18 ? -1 : 0) });
      F.add({ mat: 'w.char', prof: 'round', bw: .8, grp: 'crumbs', shapes: [E([3, B - 1], 2.6, 1.2), E([12.4, B - .6], 2.2, 1), E([8, B - 1.8], 1.2, .8)] });
      return;
    }
    F.add({ mat: 'blackiron', prof: 'bevel', bw: 1, grp: 'door', shapes: [RECT(-1, 5.4, 17, B + .5)], tex: q => (q.x === 0 ? { m: 'dark', dd: -1 } : q.y % 5 === 1 ? { m: 'bronze', dd: -.8 } : 0) });
    F.add({ mat: 'w.char', prof: 'round', bw: 2, grp: 'seal', shapes: [O([8, 14], 5)] });
    F.add({ mat: 'ember', prof: 'flat', grp: 'ring', noShadow: true, noOutline: true, shapes: [O([8, 14], 3.7)], cuts: [O([8, 14], 2.5)], tex: () => (f ? -.4 : -1) });
    F.add({ mat: 'ember', prof: 'flat', grp: 'sigil', noShadow: true, shapes: [C([8, 10.5], [8, 17.5], .6), C([4.5, 14], [11.5, 14], .6)], cuts: [O([8, 14], .9)], tex: () => (f ? .3 : -.4) });
    return 'halo';
  }
  if (kind === 'glass-spire') { // a pedestal of living glass (the Glass Heart's formations)
    F.add({ mat: 'w.cave', prof: 'round', bw: 1.6, grp: 'base', shapes: [E([8, B - 1.4], 6, 2.4)] });
    F.add({ mat: 'seaglass', prof: 'bevel', bw: 1.4, grp: 'xtal', shapes: [P([[4.4, B - 1], [5.2, 8], [7.6, 3.4], [9.6, 6.6], [10.8, B - 1]]), P([[9.4, B - .6], [12.6, 10], [13.8, 13.6], [12.8, B - .6]]), P([[2.6, B - .8], [3, 14.6], [5, 17.6], [5.4, B - .8]])] });
    F.add({ mat: 'frost', prof: 'flat', grp: 'core', noShadow: true, noOutline: true, shapes: [C([7.4, B - 3], [7.6, 7.4], .5)], tex: () => -.6 });
    return 'halo';
  }
  if (kind === 'vault-door') { // a vault door of blackened iron with bronze bands; open, the dark beyond
    F.add({ mat: 'w.basalt', prof: 'bevel', bw: 1.2, grp: 'frame', shapes: [P([[.6, B + .5], [.6, 6], [2.6, 2.6], [8, 1.2], [13.4, 2.6], [15.4, 6], [15.4, B + .5]])], tex: q => (q.y % 4 === 0 ? -.8 : 0) });
    const inner = P([[3, B + .5], [3, 7.4], [4.8, 4.6], [8, 3.8], [11.2, 4.6], [13, 7.4], [13, B + .5]]);
    if (st === 'open') { F.add({ mat: 'dark', prof: 'flat', grp: 'opening', shapes: [inner] }); return; }
    F.add({ mat: 'blackiron', prof: 'bevel', bw: .8, grp: 'leaf', shapes: [inner], tex: q => (q.x === 8 ? -1.2 : q.y % 5 === 0 ? { m: 'bronze', dd: -.4 } : 0) });
    F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'rings', shapes: [O([6.4, 15], .9), O([9.6, 15], .9)], cuts: [O([6.4, 15], .4), O([9.6, 15], .4)] });
    return;
  }
  // unknown kind: a neutral marker stone
  F.add({ mat: 'granite', prof: 'round', bw: 1.6, grp: 'x', shapes: [E([8, 12], 4, 3)] });
}
// periodic value noise (16 px) for the quicksand's swirl
function qsNoise(x, y) {
  const g = (a, b) => ((Math.imul((a & 3) * 73856093 ^ (b & 3) * 19349663, 2654435761) >>> 0) % 1000) / 1000;
  const u = x / 4, v = y / 4, xi = Math.floor(u), yi = Math.floor(v), xf = u - xi, yf = v - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
  const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const objCache = lru(192);
export function objectSprite(kind, state = null, { frame = 0, relic = null, id = null, look = null } = {}) {
  const states = OBJECT_STATES[kind] || ['closed'];
  const st = states.includes(state) ? state : states[0];
  const lit = kind === 'hearth' && st === 'lit';
  const frames = ANIM.has(kind) || lit || (kind === 'ford-ice' && st === 'stream') || (kind === 'deer' && st !== 'alert') || (SUN_ANIM.has(kind) && st === 'closed') ? 2 : 1;
  const f = frames > 1 ? frame & 1 : 0;
  const hl = kind === 'hearth' ? look || HEARTH_LOOKS[id] || 'ring' : '';
  const rk = relic && typeof relic === 'object' ? `${relic.uid || relic.base || relic.id || '?'}:${relic.temper || 0}` : relic || '';
  return objCache.get(`${kind}|${st}|${f}|${hl}|${rk}`, () => {
    const [W, Hh] = kind === 'hearth' && TALL_HEARTH.has(hl) ? [16, 24] : OBJ_STATE_SIZE[kind + ':' + st] || OBJ_SIZE[kind] || [16, 16];
    const F = new Forge(W, Hh);
    const r = objectParts(F, kind, st, f, { look: hl, id }, W, Hh);
    const R = F.raster();
    for (let i = 0; i < R.idx.length; i++) if (R.own[i] >= 0 && R.idx[i] < 1) R.idx[i] = 1;
    const img = compose(R, { glow: r === 'halo' || lit });
    if (kind === 'pedestal' && st === 'lit' && relic) { // the claimed relic floats over its pedestal
      const icon = itemIcon(relic, { size: 12 });
      if (icon) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const i = (y * 12 + x) * 4; if (!icon.data[i + 3]) continue; const X = x + 2, Y = y; const j = (Y * W + X) * 4; img.data[j] = icon.data[i]; img.data[j + 1] = icon.data[i + 1]; img.data[j + 2] = icon.data[i + 2]; img.data[j + 3] = 255; }
    }
    img.anchors = { foot: [8, Hh - 1] };
    img.frames = frames;
    return img;
  });
}

/* =====================================================================
   Emotes
   ===================================================================== */
export const EMOTES = Object.freeze(['!', 'sweat', '?', 'sparkle', '...']);
const GLYPH = {
  '!': ['.#.', '.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['###', '..#', '.##', '.#.', '...', '.#.'],
  '...': ['.....', '.....', '.....', '#.#.#', '.....', '.....'],
};
const emoteCache = lru(24);
export function emote(kind, { frame = 0 } = {}) {
  const k = EMOTES.includes(kind) ? kind : '!';
  const frames = k === 'sparkle' || k === 'sweat' ? 2 : 1, f = frames > 1 ? frame & 1 : 0;
  return emoteCache.get(k + '|' + f, () => {
    let img;
    if (k === 'sweat') {
      const F = new Forge(7, 9);
      F.add({ mat: 'frost', prof: 'round', bw: 1.4, grp: 'drop', shapes: [O([3.5, 5.4 + f], 2.2), P([[1.6, 4.6 + f], [3.5, .8 + f], [5.4, 4.6 + f]])], tex: () => -.6 });
      const R = F.raster(); img = compose(R, { glow: false });
      const i = ((4 + f) * 7 + 2) * 4; img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = 255;
    } else if (k === 'sparkle') {
      const F = new Forge(9, 9), r = f ? 4 : 3;
      F.add({ mat: 'radiant', prof: 'flat', grp: 'star', noShadow: true, shapes: [P([[4.5, 4.5 - r], [5.1, 3.9], [4.5 + r, 4.5], [5.1, 5.1], [4.5, 4.5 + r], [3.9, 5.1], [4.5 - r, 4.5], [3.9, 3.9]])], tex: q => (Math.abs(q.x - 4) + Math.abs(q.y - 4) < 2 ? 1 : -.4) });
      img = compose(F.raster(), { glow: false });
    } else {
      const g = GLYPH[k], gw = g[0].length, W = gw + 4, H = 11;
      const F = new Forge(W, H);
      F.add({ mat: 'clothWhite', prof: 'flat', grp: 'bubble', shapes: [P([[1, 1.4], [W - 1, 1.4], [W - 1, 8.4], [W / 2 + 1.2, 8.4], [W / 2, 10.2], [W / 2 - 1.2, 8.4], [1, 8.4]])], tex: q => (g[q.y - 2] && g[q.y - 2][q.x - 2] === '#' ? { m: k === '!' ? 'paintRed' : k === '?' ? 'clothBlue' : 'dark', dd: k === '...' ? -2 : .6 } : .6) });
      img = compose(F.raster(), { glow: false });
    }
    img.anchors = { foot: [img.width >> 1, img.height - 1] };
    img.frames = frames;
    return img;
  });
}
