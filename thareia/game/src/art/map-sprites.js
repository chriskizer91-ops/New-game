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

import { Forge, compose, bayer, hash } from './forge.js';
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
  // Thareia (T1): Captain Yara Dustwind (a grey braid, a pilot's jerkin, a shortbow on her back); Sedrin, the young
  // lizardfolk Outrider (scaled skin, bone-and-leather, a spear); Merryn Copperpot, the tiny halfling herbalist; Aldric
  // Fernshaw, the nervous merchant
  yara: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairSilver', hair: 'braid', eye: '#3a1a10', quiver: 'leather', fletch: 'clothWhite', gloves: 'leather', boots: 'leatherDark' }, gear: { weapon: A('bow', { wood: 'yew' }), body: A('leather', { mat: 'leather', shirt: 'gambeson', belt: 'leatherDark' }) } },
  // Thareia (T2): Taela Greenmantle standing at Eldergrove, before she joins (her hero look, HERO_ART.taela)
  taela: { H: { build: 'human', skin: 'skin', hairMat: 'hairAuburn', hair: 'pony', ears: 'half', marks: 'rotwood', mantle: 'moss', eye: '#24381c', gloves: 'bark', tunic: 'hoodGreen' }, gear: { weapon: A('staff', { style: 'gnarl', headT: 60, haft: 'bark', haftR: 1.9, wobble: 1.2, wrap: 'moss', wrapA: 34, wrapB: 40, bands: [], foot: 'bark', leaves: 'moss', crystal: 'emerald', glow: 'verdant' }), head: A('hood', { look: 'hood', mat: 'moss', tip: 0, trim: 'rotwood' }), body: A('robe', { mat: 'hoodGreen', trim: 'rotwood', sash: 'leatherDark', cowl: 'moss' }), feet: A('boots', { mat: 'rags', trim: 'string' }) } },
  sedrin: { H: { build: 'human', skin: 'drake', hairMat: 'drake', hair: 'none', eye: '#6a4a08', gloves: 'drake', boots: 'drake' }, gear: { weapon: A('spear', { head: 'bone', haft: 'bogwood' }), body: A('leather', { mat: 'leatherDark', shirt: 'robeBark', belt: 'leather' }) } },
  merryn: { H: { build: 'youth', skin: 'skinPale', hairMat: 'hairBrown', hair: 'bun', eye: '#24381c', gloves: 'skinPale', boots: 'leather', bottleRow: ['emerald', 'amber'] }, gear: { body: A('robe', { mat: 'hoodGreen', trim: 'gambeson', sash: 'leather' }) } },
  aldric: { H: { build: 'human', skin: 'skin', hairMat: 'hairBrown', hair: 'short', eye: '#1c2a48', gloves: 'skin', boots: 'leatherDark', tunic: 'wool' }, gear: { body: A('robe', { mat: 'clothBlue', trim: 'gold', sash: 'leatherDark' }) } },
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
  // M5: the Ironspire (the monks of Peak's Veil in grey and white, Ironhold's dwarves, Stormwatch's blue-grey)
  wynn: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairSilver', hair: 'bun', eye: '#2a2030', mantle: 'clothWhite', gloves: 'skinPale', boots: 'leatherDark' }, gear: { head: { look: 'hood', mat: 'clothWhite', tip: 0, trim: 'w.habit' }, body: { kind: 'robe', mat: 'w.habit', trim: 'clothWhite', sash: 'string' }, weapon: A('staff', { style: 'crook', haft: 'bogwood', metal: 'silver' }), amulet: { metal: 'silver', gem: 'pearl' } } },
  kesh: { H: { build: 'brute', skin: 'skinTan', hairMat: 'hairBlack', hair: 'none', eye: '#1c1f38', gloves: 'clothWhite', boots: 'leather', pants: 'w.habit' }, gear: { body: { kind: 'leather', mat: 'w.habit', shirt: 'w.habit', sash: 'robeRed' }, weapon: A('staff', { style: 'quarter', haft: 'wood', metal: 'iron' }) } },
  novice: { H: { build: 'youth', skin: 'skin', hairMat: 'hairBrown', hair: 'crop', eye: '#24381c', mantle: 'clothWhite', gloves: 'skin', boots: 'leather' }, gear: { body: { kind: 'robe', mat: 'w.habit', trim: 'w.habit', sash: 'string' }, offhand: { look: 'lantern', metal: 'iron', glow: 'ember' } } },
  brundar: { H: { build: 'dwarf', skin: 'skinTan', hairMat: 'hairAuburn', hair: 'long', beard: 'braid', clasp: 'gold', eye: '#2a2030', cloak: 'robeRed', mantle: 'wolfPale', gloves: 'leatherDark', boots: 'blackiron' }, gear: { head: { look: 'crown', style: 'regal', metal: 'iron', gem: 'ruby' }, body: { kind: 'plate', mat: 'iron', trim: 'gold' }, weapon: A('axe', { blade: 'steel', haft: 'bogwood', socket: 'iron' }) } },
  durra: { H: { build: 'dwarf', skin: 'skin', hairMat: 'hairCopper', hair: 'braid', eye: '#3a1a10', apron: 'leather', tunic: 'wool', gloves: 'leatherDark', boots: 'leatherDark' }, gear: { weapon: A('hammer', { headMat: 'iron', haft: 'wood', headW: 14, bandMat: 'iron' }), hands: { kind: 'gloves', mat: 'leatherDark' } } },
  'ih-guard': { H: { build: 'dwarf', skin: 'skinTan', hairMat: 'hairBrown', hair: 'short', beard: true, eye: '#1c1f38', gloves: 'iron', boots: 'blackiron' }, gear: { head: { look: 'kettle', mat: 'iron', trim: 'gold' }, body: { kind: 'plate', mat: 'steel', tabard: 'robeRed' }, offhand: { look: 'round', face: 'robeRed', rim: 'iron', boss: 'gold' }, weapon: A('axe', { blade: 'steel', haft: 'bogwood', socket: 'iron' }) } },
  rook: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairBlack', hair: 'crop', eye: '#1a1a1a', mantle: 'leatherDark', gloves: 'leatherDark', boots: 'leatherDark', pants: 'clothGrey', trinket: { kind: 'ledger', mat: 'leatherDark' } }, gear: { body: { kind: 'robe', mat: 'clothGrey', trim: 'bronze', sash: 'robeRed' } } },
  ysolde: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'bun', eye: '#1c2a48', cloak: 'w.army', gloves: 'leather', boots: 'leatherDark' }, gear: { body: { kind: 'mail', mat: 'iron', tabard: 'w.army', belt: 'leatherDark', trim: 'silver' }, weapon: A('sword', { blade: 'steel', guardMat: 'silver', grip: 'leatherDark', pommel: 'silver', bladeL: 44 }) } },
  // Brother Aurel, the Rime-Abbot, as he speaks after his fight (P3's 'abbot-after'): frozen, a beard of icicles, rimed grey
  'rime-abbot': { H: { build: 'human', skin: 'w.rimeskin', hairMat: 'hairSilver', hair: 'crop', beard: true, icicles: 'w.glacier', eye: '#b8ecff', mantle: 'w.ice', gloves: 'w.rimeskin', boots: 'w.drowned' }, gear: { body: { kind: 'robe', mat: 'w.habit', trim: 'w.ice', sash: 'w.drowned' }, weapon: A('staff', { style: 'crook', haft: 'w.drowned', metal: 'silver', gem: 'w.glacier' }) } },
  quill: { H: { build: 'brute', skin: 'skinPale', hairMat: 'hairSilver', hair: 'crop', eye: '#2a2030', spectacles: '#d8f0f6', gloves: 'skinPale', boots: 'leather', pants: 'wool', trinket: { kind: 'pouch', mat: 'leather' } }, gear: { body: { kind: 'leather', mat: 'w.army', shirt: 'wool', belt: 'leather', trim: 'bronze' }, offhand: { look: 'clipboard', mat: 'wood' } } },
  // M6: the Gloomfen, as P3's lines have them (notes/M6-P3-story.md)
  // Elder Moss: a very old man in willow-green with reed charms, a willow staff with a marsh-light in its knot
  moss: { H: { build: 'dwarf', skin: 'skinTan', hairMat: 'hairSilver', hair: 'long', beard: true, eye: '#24381c', cloak: 'w.willow', mantle: 'w.reed', gloves: 'skinTan', boots: 'bark' },
    gear: { body: { kind: 'robe', mat: 'w.willow', trim: 'w.reed', sash: 'string' }, weapon: A('staff', { style: 'gnarl', haft: 'bogwood', leaves: 'w.willow', glow: 'w.marshlight' }), amulet: { metal: 'string', gem: 'w.reed' } } },
  // Sedge: a herb-seller under a straw hat, a basket of herbs at her hip, a bundle of reeds and cattails
  sedge: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairAuburn', hair: 'braid', eye: '#24381c', apron: 'w.canvas', tunic: 'w.sedge', pants: 'wool', gloves: 'skinTan', boots: 'leather', trinket: { kind: 'basket', mat: 'w.thatch', herbs: 'w.fenmoss' } },
    gear: { head: { look: 'hat', style: 'wide', mat: 'w.thatch', band: 'paintRed' }, weapon: A('staff', { style: 'gnarl', haft: 'w.reed', leaves: 'w.cattail' }) } },
  // a villager of Willowmurk in a reed rain-cape, mud to the knees
  'wm-villager': { H: { build: 'human', skin: 'skinPale', hairMat: 'hairBrown', hair: 'crop', eye: '#2a2030', tunic: 'w.sedge', pants: 'w.loam', boots: 'w.peat', gloves: 'skinPale' },
    gear: { head: { look: 'hood', mat: 'w.reed', tip: 0 }, body: { kind: 'leather', mat: 'leather', shirt: 'w.sedge', belt: 'leatherDark' } } },
  // Hodge: an extremely unpleasant old man, as P6 draws him at gear tier 0: short, bald, ruddy and grizzled, a cudgel, a
  // leather jerkin; and his own lantern and toll-book
  hodge: { H: { build: 'dwarf', skin: 'w.oldskin', hairMat: 'hairSilver', hair: 'none', beard: true, eye: '#2a1a14', pants: 'wool', boots: 'leatherDark', gloves: 'w.oldskin', trinket: { kind: 'ledger', mat: 'leatherDark' } },
    gear: { weapon: A('club', { haft: 'bogwood', studs: 'iron' }), offhand: { look: 'lantern', metal: 'iron', glow: 'amber' }, body: { kind: 'leather', mat: 'leather', shirt: 'wool', belt: 'leatherDark' } } },
  // Mayor Gretch: a stout older woman in a red gown, a fur on her shoulders and the chain of office over it
  gretch: { H: { build: 'brute', skin: 'skinPale', hairMat: 'hairSilver', hair: 'bun', eye: '#2a2030', cloak: 'wolfFur', mantle: 'gold', gloves: 'leatherDark', boots: 'leatherDark', trinket: { kind: 'key', mat: 'bronze' } },
    gear: { body: { kind: 'robe', mat: 'robeRed', trim: 'gold', sash: 'leatherDark' }, amulet: { metal: 'gold', gem: 'topaz' } } },
  // Nettie the Swamp Witch: a knotted bog-cotton shawl, bottles at her belt, a crooked hat, a staff with an amber bead
  nettie: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairBlack', hair: 'long', eye: '#3a1a10', cloak: 'clothWhite', gloves: 'skinPale', boots: 'leatherDark', bottleRow: ['seaglass', 'ruby', 'amber'], trinket: { kind: 'bottle', mat: 'emerald' } },
    gear: { head: { look: 'hat', style: 'witch', mat: 'w.peat', band: 'w.reed' }, body: { kind: 'robe', mat: 'w.sedge', trim: 'w.fenmoss', sash: 'leatherRed' }, weapon: A('staff', { style: 'gnarl', haft: 'bogwood', leaves: 'w.reed', gem: 'amber' }) } },
  // Widow Pell, in grey
  pell: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairBrown', hair: 'bun', eye: '#2a2030', mantle: 'clothGrey', gloves: 'skinPale', boots: 'leatherDark' },
    gear: { head: { look: 'hood', mat: 'clothGrey', tip: 0 }, body: { kind: 'robe', mat: 'clothGrey', trim: 'w.char', sash: 'w.char' } } },
  // the Stilt-Watch: a guard in a tarred coat with a pole-lantern, kept dark, on a boat-hook's crook
  'bm-watch': { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'short', beard: true, eye: '#1c1f38', tabard: 'w.tarred', gloves: 'leather', boots: 'leatherDark', pants: 'wool' },
    gear: { weapon: A('staff', { style: 'lamp', haft: 'bogwood', metal: 'iron', glow: 'dark' }), head: { look: 'kettle', mat: 'leatherDark', trim: 'w.tarred' }, body: { kind: 'leather', mat: 'w.tarboards', shirt: 'wool', belt: 'leather' } } },
  // Corvus: a lean, wet diver, goggles pushed up, a coil of rope over one shoulder, a knife and no harpoon
  corvus: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'long', beard: true, eye: '#1c2a24', goggles: 'bronze', lens: 'seaglass', slungChain: 'string', tunic: 'clothTeal', pants: 'leatherDark', boots: 'leatherDark', gloves: 'leather' },
    gear: { body: { kind: 'leather', mat: 'w.tarred', shirt: 'clothTeal', belt: 'leather', studs: 'bronze' }, weapon: A('dagger', { blade: 'steel', grip: 'leather', bladeL: 28 }) } },
  // the Lantern Mother as she speaks after her fight: a young woman in black lace, her mourning veil open at the face, her lantern held out
  'lantern-mother': { H: { build: 'human', skin: 'skinPale', hairMat: 'hairBlack', hair: 'long', eye: '#f8c85a', gloves: 'skinPale', boots: 'w.mourning' },
    gear: { head: { look: 'veil', mat: 'w.mourning', trim: 'clothGrey' }, body: { kind: 'robe', mat: 'w.mourning', trim: 'clothGrey', sash: 'w.char' }, offhand: { look: 'lantern', metal: 'bronze', glow: 'w.lamplight' } } },
  // M7: Harrow Ironvein, the Unsmith, as he speaks (his battle art is a 96 px Champion, so he needs a face of his own, as the
  // Lantern Mother did): Hilda's twin, a tall, broad smith, copper hair cut short and grey at the temples, a copper beard, a
  // tarred boatman's cloak over his leather smith's apron, the clasp at his throat (a hammer in a broken ring), the Unmaking
  // Hammer in his hand, its head edged with the violet-black light. The same look as his map sprite (mapFoeSheet 'unsmith')
  unsmith: { H: { build: 'brute', skin: 'skin', hairMat: 'hairCopper', hair: 'crop', temples: 'hairSilver', beard: true, eye: '#3a1a10', cloak: 'w.boatcloak', tunic: 'w.char',
    apron: 'leatherDark', gloves: 'skin', pants: 'leatherDark', boots: 'leatherDark' },
    gear: { body: { kind: 'leather', mat: 'w.char', shirt: 'w.char', belt: 'leatherDark' }, amulet: { metal: 'bronze', gem: 'bronze' },
      weapon: A('hammer', { headMat: 'blackiron', haft: 'blackiron', headW: 13, bandMat: 'w.hollowlight' }) } },
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
  'rime-wolf': [24, 16], rockling: [16, 16], 'forge-spark': [16, 16], 'peak-troll': [24, 24], 'old-horn': [32, 32], 'thunder-roc': [48, 40], 'mother-anvil': [48, 40], 'rime-abbot': [32, 48],
  'mire-leech': [16, 12], 'marsh-light': [16, 20], 'lamp-moth': [16, 16], 'blackwater-gar': [24, 16], 'old-jaws': [32, 24], 'willow-wight': [16, 24], 'grandfather-willow': [32, 40],
  'lantern-mother': [32, 40], 'blackwater-leviathan': [48, 40], // M6
  'forge-warden': [24, 32], unsmith: [32, 48], // M7
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
// M5: the same for the Ironspire (P4 gives these variants their own art keys too; this covers a family key with the variant)
const IRON_VARIANT = { 'brigand:warden': 'rhune', 'iron-sentinel:captain': 'sentinel-captain', 'forgeborn:bellows': 'bellows', 'forgeborn:journeyman': 'journeyman',
  'peak-troll:old-horn': 'old-horn', 'rime-wraith:abbess': 'drowned-abbess', 'rime-wraith:choir': 'choir-wraith', 'tallyman:ice-cutter': 'cutter-chief', 'smuggler:sawyer': 'sawyer' };
// M6: and for the Gloomfen (the art keys of spec §3.2)
const GLOOM_VARIANT = { 'blackwater-gar:old-jaws': 'old-jaws', 'bog-hag:grue': 'mother-grue', 'willow-wight:grandfather': 'grandfather-willow', 'drowned:bell-ringer': 'bell-ringer',
  'drowned:choir': 'drowned-choir', 'drowned:cantor': 'drowned-cantor', 'tallyman:salvage-master': 'salvage-master', 'tallyman:bargemaster': 'bargemaster',
  'smuggler:reedcutter': 'reedcutter', 'smuggler:diver': 'salvage-diver', 'smuggler:bargehand': 'bargehand' };
function resolveFoeKey(artKey, variant) {
  if (variant && SUN_VARIANT[artKey + ':' + variant]) return SUN_VARIANT[artKey + ':' + variant];
  if (variant && IRON_VARIANT[artKey + ':' + variant]) return IRON_VARIANT[artKey + ':' + variant];
  if (variant && GLOOM_VARIANT[artKey + ':' + variant]) return GLOOM_VARIANT[artKey + ':' + variant];
  if (variant && BELOW_VARIANT[artKey + ':' + variant]) return BELOW_VARIANT[artKey + ':' + variant]; // M7
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
/* M5: the Ironspire's constructs and drowned monks on the walker rig (their battle art is built, not rigged; P6 rigged
   the brigands, Rhune, the Cutter-Chief and the sawyers, and those come through foeLooks() like M3's). */
const SENTINEL = { build: 'dwarf', skin: 'iron', hairMat: 'iron', hair: 'none', eye: '#1a1a1a', tunic: 'iron', pants: 'iron', boots: 'blackiron', gloves: 'iron' };
const SLAG = { build: 'brute', skin: 'w.slag', hairMat: 'w.char', hair: 'none', eye: '#1a1a1a', tunic: 'w.char', pants: 'w.char', boots: 'w.slag', gloves: 'w.slag', shade: true, shadeEyes: 'amber' };
const DROWNED = { build: 'human', skin: 'w.rimeskin', hairMat: 'hairSilver', hair: 'none', eye: '#5ab4dc', tunic: 'w.drowned', pants: 'w.drowned', boots: 'w.drowned', gloves: 'w.rimeskin' };
// a sentinel's kit by gearTier: iron rusted at the joins, rune-lit iron, steel with storm runes, black iron burning; the captain has
// a crest and a hammer
const sentinelKit = (t, cap) => { const m = ['iron', 'iron', 'steel', 'blackiron'][t], rune = ['amber', 'amber', 'storm', 'ember'][t], worn = t ? m : 'rust'; return {
  head: { look: 'helm', mat: m, eyes: rune, glowEyes: 1, crest: cap ? 'gold' : null, trim: cap ? 'gold' : t ? 'bronze' : 'rust' },
  body: { kind: 'plate', mat: m, trim: cap ? 'gold' : t >= 2 ? rune : t ? 'iron' : 'rust', pauldrons: worn }, hands: { kind: 'gauntlets', mat: worn, plate: 1 },
  offhand: cap ? null : { look: 'round', face: worn, rim: 'bronze', boss: t >= 2 ? rune : 'iron' },
  weapon: cap ? A('hammer', { headMat: m, haft: 'iron', headW: 14, bandMat: 'gold' }) : null,
}; };
const IRON_FOES = {
  'iron-sentinel': { H: SENTINEL, gear: [0, 1, 2, 3].map(t => sentinelKit(t)) },
  'sentinel-captain': { relic: 'ironwall', relicSlot: 'offhand', relicLook: { look: 'tower', face: 'iron', rim: 'gold', boss: 'amber', heirloom: true }, glintAt: ['offhand'],
    H: Object.assign({}, SENTINEL, { build: 'brute' }), gear: [0, 1, 2, 3].map(t => sentinelKit(t, true)) },
  forgeborn: { H: SLAG, gear: [0, 1, 2, 3].map(t => ({ body: { kind: 'plate', mat: t >= 2 ? 'blackiron' : 'w.char', tabard: t ? 'ember' : 'amber', trim: 'ember' },
    weapon: t ? A('hammer', { headMat: 'w.slag', haft: 'w.char', headW: 13, bandMat: 'ember' }) : null, H: t >= 3 ? { mantle: 'ember' } : null })) },
  bellows: { H: Object.assign({}, SLAG, { pack: { mat: 'leather' } }), gear: [0, 1, 2, 3].map(t => ({ body: { kind: 'plate', mat: t >= 2 ? 'blackiron' : 'w.char', tabard: 'ember', trim: t >= 1 ? 'ember' : 'w.slag' },
    hands: { kind: 'gauntlets', mat: 'w.slag', plate: 1 }, H: t >= 3 ? { mantle: 'ember' } : null })) },
  journeyman: { relic: 'runestaff', relicSlot: 'weapon', relicLook: Object.assign(A('staff', { style: 'orb', haft: 'bogwood', metal: 'iron', glow: 'ember' }), { relic: true }),
    H: Object.assign({}, SLAG, { build: 'human', apron: 'leather', gloves: 'skinTan' }),
    gear: [0, 1, 2, 3].map(t => ({ body: { kind: 'leather', mat: 'w.char', shirt: 'w.slag', belt: 'leather', tabard: t >= 1 ? 'ember' : null }, head: t >= 2 ? { look: 'cap', mat: 'leatherDark', metal: 'iron', glow: 'ember' } : null })) },
  'rime-wraith': { H: DROWNED, gear: [0, 1, 2, 3].map(t => ({ head: { look: 'hood', mat: t >= 3 ? 'w.drowned' : 'w.habit', tip: 1, trim: t >= 1 ? 'w.ice' : null },
    body: { kind: 'robe', mat: t >= 3 ? 'w.drowned' : 'w.habit', trim: t >= 1 ? 'w.ice' : 'w.habit', sash: t >= 2 ? 'frost' : 'string' }, H: t >= 2 ? { cloak: 'w.drowned' } : null })) },
  'drowned-abbess': { relic: 'drowned-censer', relicSlot: 'offhand', relicLook: { look: 'lantern', metal: 'silver', glow: 'frost', heirloom: true }, glintAt: ['offhand'],
    H: Object.assign({}, DROWNED, { mantle: 'clothWhite' }), gear: [0, 1, 2, 3].map(t => ({ head: { look: 'hood', mat: 'clothWhite', tip: 0, trim: 'w.ice' },
    body: { kind: 'robe', mat: 'w.drowned', trim: 'clothWhite', sash: t >= 2 ? 'frost' : 'silver' }, H: t >= 2 ? { cloak: 'w.drowned' } : null })) },
  'choir-wraith': { H: Object.assign({}, DROWNED, { build: 'youth', shade: false, song: true, eye: '#10141c' }), gear: [0, 1, 2, 3].map(t => ({ head: { look: 'hood', mat: 'w.habit', tip: 1, trim: 'w.ice' },
    body: { kind: 'robe', mat: t >= 2 ? 'w.drowned' : 'w.habit', trim: 'w.ice', sash: t >= 3 ? 'frost' : 'string' }, offhand: { look: 'tome', cover: t >= 2 ? 'w.drowned' : 'w.ice' } })) },
};
/* M6: the Gloomfen's walker-rig foes, one kit per gearTier. As the M4 and M5 kits do, they take precedence over foeLooks()
   for these keys: P6 builds the drowned as battle art (not on the rig), and a battle rig's extras (a cane's hook, a ledger, a
   helm's trims) are drawn for 64 px, not 16; so the map's people are drawn for the map, from the same descriptions and in
   the same colours as P6's (Hodge short, bald under his hat, ruddy, with his cudgel, lantern and toll-book). */
const FEN_DROWNED = { build: 'human', skin: 'w.fenskin', hairMat: 'w.weed', hair: 'long', eye: '#9ee8d0', tunic: 'w.sodden', pants: 'w.sodden', boots: 'w.sodden', gloves: 'w.fenskin' };
const HAG = { build: 'dwarf', skin: 'w.hagskin', hairMat: 'hairSilver', hair: 'long', eye: '#c8e070', tunic: 'rags', pants: 'rags', boots: 'rags', gloves: 'w.hagskin', cloak: 'rags' };
const FEN_HAND = { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'crop', eye: '#1c2a24', tunic: 'wool', pants: 'wool', boots: 'leatherDark', gloves: 'leather', scarf: 'clothTeal' };
const GLOOM_FOES = {
  // Misthollow's drowned: grey-green, weed for hair, sodden rags; a hood, then a dragged chain, then a cold light in the hood
  drowned: { H: FEN_DROWNED, gear: [0, 1, 2, 3].map(t => ({ body: { kind: 'robe', mat: 'w.sodden', trim: t >= 2 ? 'w.weed' : 'w.sodden', sash: 'string' },
    head: t >= 1 ? { look: 'hood', mat: 'w.sodden', tip: 0, trim: t >= 3 ? 'w.weed' : null } : null, H: t >= 3 ? { slungChain: 'iron', shade: true, shadeEyes: 'frost' } : t >= 2 ? { slungChain: 'iron' } : null })) },
  // the bell-ringers: a hand-bell each, the bell-rope still over one shoulder
  'bell-ringer': { H: Object.assign({}, FEN_DROWNED, { slungChain: 'string' }), gear: [0, 1, 2, 3].map(t => ({ offhand: { look: 'bell', metal: t >= 2 ? 'verdigris' : 'bronze' },
    body: { kind: 'robe', mat: 'w.sodden', trim: 'w.weed', sash: 'string' }, head: { look: 'hood', mat: t >= 1 ? 'w.choir' : 'w.sodden', tip: 1 }, H: t >= 3 ? { shade: true, shadeEyes: 'frost' } : null })) },
  // the drowned choir: children's surplices gone green, still singing, their hymnals in their hands
  'drowned-choir': { H: Object.assign({}, FEN_DROWNED, { build: 'youth', hair: 'short', song: true }), gear: [0, 1, 2, 3].map(t => ({ body: { kind: 'robe', mat: 'w.choir', trim: t >= 1 ? 'robeRed' : 'w.choir', sash: t >= 2 ? 'robeRed' : 'string' },
    offhand: { look: 'tome', cover: t >= 3 ? 'robeRed' : 'w.sodden' }, head: t >= 2 ? { look: 'hood', mat: 'w.choir', tip: 0, trim: 'robeRed' } : null })) },
  // the Drowned Cantor: a choir-master's cope and hood, his staff (the Cantor's Staff) held up to keep time
  'drowned-cantor': { relic: 'cantors-staff', relicSlot: 'weapon', relicLook: Object.assign(A('staff', { style: 'orb', haft: 'w.sodden', metal: 'verdigris', glow: 'w.waterlight' }), { relic: true }),
    H: Object.assign({}, FEN_DROWNED, { beard: true, mantle: 'robeRed' }), gear: [0, 1, 2, 3].map(t => ({ body: { kind: 'robe', mat: 'w.choir', trim: 'gold', sash: 'robeRed' },
    head: { look: 'hood', mat: 'w.choir', tip: 1, trim: t >= 2 ? 'gold' : 'robeRed', gem: t >= 3 ? 'seaglass' : null } })) },
  // bog-hags: bent, green-skinned, in rags, a gnarled stick; then a hood, weed on the stick, a mossy shawl, bottles, a blight-light
  'bog-hag': { H: HAG, gear: [0, 1, 2, 3].map(t => ({ weapon: A('staff', { style: 'gnarl', haft: 'bogwood', leaves: t >= 1 ? 'w.weed' : null, glow: t >= 3 ? 'blight' : null, gem: t === 2 ? 'bone' : null }),
    body: { kind: 'robe', mat: 'rags', trim: t >= 2 ? 'w.fenmoss' : 'rags', sash: 'string' },
    head: t >= 1 ? { look: 'hood', mat: t >= 3 ? 'w.tarred' : 'rags', tip: 1 } : null, H: t >= 3 ? { mantle: 'w.fenmoss', bottleRow: ['blight', 'w.greenwater', 'bone'] } : t >= 2 ? { mantle: 'w.fenmoss' } : null })) },
  // Mother Grue: bigger, weed-haired, a moss cloak, a stirring-crook, bottles at her belt; the Hag-Stone on a cord at her throat
  'mother-grue': { relic: 'hag-stone', relicSlot: 'amulet', relicLook: { metal: 'string', gem: 'w.fenstone' }, own: true, glintAt: ['amulet'],
    H: Object.assign({}, HAG, { build: 'brute', hairMat: 'w.weed', cloak: 'w.fenmoss' }), gear: [0, 1, 2, 3].map(t => ({ weapon: A('staff', { style: 'crook', haft: 'bogwood', metal: 'iron', gem: t >= 2 ? 'blight' : null }),
    body: { kind: 'robe', mat: 'w.sodden', trim: 'w.fenmoss', sash: t >= 2 ? 'leatherDark' : 'string' },
    head: { look: 'hood', mat: t >= 2 ? 'w.tarred' : 'w.fenmoss', tip: 1, trim: t >= 3 ? 'blight' : null }, H: t >= 1 ? { bottleRow: ['w.greenwater', 'ruby', 'bone'] } : null })) },
  // the Tallymen's new hands: reedcutters with reed-hooks (a chain from tier 2), divers in tarred leather, bargehands with boat-hooks
  reedcutter: { H: Object.assign({}, FEN_HAND, { tunic: 'w.sedge', scarf: 'w.loam', boots: 'w.peat' }), gear: [0, 1, 2, 3].map(t => ({ weapon: A('hook', { blade: t >= 2 ? 'steel' : 'iron', haft: 'wood' }),
    head: t >= 1 ? { look: 'hat', style: 'wide', mat: 'w.thatch', band: t >= 3 ? 'clothTeal' : null } : null,
    body: t >= 1 ? { kind: t >= 3 ? 'mail' : 'leather', mat: t >= 3 ? 'iron' : 'leather', shirt: 'w.sedge', belt: 'leatherDark' } : null, H: t >= 2 ? { slungChain: 'iron' } : null })) },
  'salvage-diver': { H: Object.assign({}, FEN_HAND, { hair: 'long', goggles: 'bronze', lens: 'seaglass', slungChain: 'string' }), gear: [0, 1, 2, 3].map(t => ({ weapon: A('dagger', { blade: t >= 2 ? 'steel' : 'iron', grip: 'leather', bladeL: 28, fuller: t >= 3 ? 'w.waterlight' : null }),
    body: { kind: 'leather', mat: 'w.tarred', shirt: 'clothTeal', belt: 'leather', studs: t >= 1 ? 'bronze' : null }, head: t >= 3 ? { look: 'kettle', mat: 'bronze' } : null })) },
  bargehand: { H: Object.assign({}, FEN_HAND, { build: 'brute', scarf: 'robeRed' }), gear: [0, 1, 2, 3].map(t => ({ weapon: A('spear', { head: t >= 2 ? 'steel' : 'iron', haft: 'bogwood', socket: 'iron', hook: 1 }),
    body: { kind: 'leather', mat: 'w.tarboards', shirt: 'wool', belt: 'leather', pauldrons: t >= 2 ? 'iron' : null }, head: t >= 1 ? { look: 'kettle', mat: t >= 3 ? 'iron' : 'leatherDark' } : null })) },
  // the Salvage-Master (the Salvager's Helm: a brass diving helm) and the Bargemaster (the Barge-Chain Gauntlets), Tallymen both
  'salvage-master': { relic: 'salvagers-helm', relicSlot: 'head', relicLook: { look: 'helm', mat: 'copper', crest: null, trim: 'bronze', gem: 'seaglass', heirloom: true },
    H: Object.assign({}, TALLY, { apron: 'leather', slungChain: 'string' }), gear: [0, 1, 2, 3].map(t => ({ weapon: A('pick', { haft: 'wood', headMat: t >= 2 ? 'steel' : 'iron' }),
    body: { kind: 'robe', mat: 'clothGrey', trim: t >= 1 ? 'bronze' : 'wool', sash: 'leatherDark' }, H: t >= 2 ? { mantle: 'iron' } : null })) },
  bargemaster: { relic: 'barge-gauntlets', relicSlot: 'hands', relicLook: { kind: 'gauntlets', mat: 'iron', plate: 1, heirloom: true },
    H: Object.assign({}, TALLY, { build: 'brute', slungChain: 'iron' }), gear: [0, 1, 2, 3].map(t => ({ weapon: A('hammer', { headMat: t >= 2 ? 'steel' : 'iron', haft: 'wood', headW: 14, bandMat: 'iron' }),
    body: { kind: 'robe', mat: 'clothGrey', trim: t >= 2 ? 'iron' : 'wool', sash: 'leatherDark' }, head: { look: 'kettle', mat: 'leatherDark', trim: t >= 1 ? 'iron' : 'clothGrey' } })) },
  // Hodge on the map (his fight never stands on it: this is for the gallery and any later use); his Unfair Toll, a clipped coin, at his throat
  hodge: { relic: 'unfair-toll', relicSlot: 'amulet', relicLook: { metal: 'gold', gem: 'gold' }, own: true, glintAt: ['amulet'],
    H: NPC_LOOKS.hodge.H, gear: [0, 1, 2, 3].map(t => Object.assign({}, NPC_LOOKS.hodge.gear, t >= 1 ? { head: { look: 'kettle', mat: 'leatherDark', trim: 'leather' } } : {},
      t >= 2 ? { body: { kind: 'leather', mat: 'leatherDark', shirt: 'wool', belt: 'leather', studs: 'iron' } } : {})) },
};
/* M7: the Hearth Below's walker-rig foes, one kit per gearTier (spec §3.2, §6.1), taking precedence over foeLooks() as the
   earlier kits do.
   - The cinder-thralls are the hearth's ash made to walk, a coal for a heart (the ember at the chest), the fire showing in
     their cracks as they harden (tier 1), a slag maul (tier 2), a helm of slag with ember eyes (tier 3). The Thrall-Overseer is
     a bigger one, a coil of hot wire slung over it, a goad of hot iron in its fist.
   - The unmade are grey husks in grey rags, hooded, pale eyes in the hood, each still holding the ghost of the relic that was
     unmade (a blade, a spear, a blade and a shield, a staff, by tier), which glows.
   - The Hollow Council are the same four folk as their town walkers (NPC_LOOKS), gone grey, violet in the eyes, each wearing
     the gift sent to their chair, glowing violet-black: Miravel's Hollow Wreath, Qasim's Hollow Chalice, Brundar's Hollow
     Gauntlet, Gretch's Hollow Chain. Taken (relic null), the gift is gone. */
const ASHMAN = { build: 'human', skin: 'w.ash', hairMat: 'w.ash', hair: 'none', eye: '#f08a14', tunic: 'w.ash', pants: 'w.ash', boots: 'w.char', gloves: 'w.ash', shade: true, shadeEyes: 'amber' };
const HUSK = { build: 'human', skin: 'w.unmade', hairMat: 'w.unmade', hair: 'none', eye: '#bcb6dc', tunic: 'w.unmade', pants: 'w.unmade', boots: 'w.unmade', gloves: 'w.unmade', shade: true, shadeEyes: 'frost' };
const HOLLOW_EYE = '#b27ae0';
const ghostOf = t => [
  { weapon: A('sword', { blade: 'w.ghost', guardMat: 'w.ghost', grip: 'w.unmade', pommel: 'w.ghost', bladeL: 44 }) },
  { weapon: A('spear', { head: 'w.ghost', haft: 'w.ghost', socket: 'w.unmade' }) },
  { weapon: A('sword', { blade: 'w.ghost', guardMat: 'w.ghost', grip: 'w.unmade', pommel: 'w.ghost', bladeL: 44 }), offhand: { look: 'round', face: 'w.ghost', rim: 'w.unmade', boss: 'w.ghost' } },
  { weapon: A('staff', { style: 'orb', haft: 'w.ghost', metal: 'w.unmade', glow: 'w.ghost' }) },
][t];
const BELOW_FOES = {
  'cinder-thrall': { H: ASHMAN, gear: [0, 1, 2, 3].map(t => ({ amulet: { metal: 'w.char', gem: 'ember' },
    body: { kind: 'leather', mat: 'w.ash', shirt: 'w.ash', belt: 'w.char', trim: t >= 1 ? 'ember' : null },
    weapon: t >= 2 ? A('hammer', { headMat: 'w.slag', haft: 'w.char', headW: 12, bandMat: 'ember' }) : null,
    head: t >= 3 ? { look: 'helm', mat: 'w.slag', eyes: 'ember', glowEyes: 1, crest: null } : null, H: t >= 3 ? { mantle: 'w.char' } : null })) },
  'thrall-overseer': { H: Object.assign({}, ASHMAN, { build: 'brute', slungChain: 'ember', mantle: 'w.char' }), gear: [0, 1, 2, 3].map(t => ({ amulet: { metal: 'w.char', gem: 'ember' },
    body: { kind: 'plate', mat: t >= 2 ? 'w.slag' : 'w.ash', trim: 'ember' }, weapon: A('spear', { head: 'w.molten', haft: 'blackiron', socket: 'iron' }),
    head: t >= 1 ? { look: 'helm', mat: 'w.slag', eyes: 'ember', glowEyes: 1, crest: t >= 3 ? 'ember' : null } : null })) },
  unmade: { H: HUSK, gear: [0, 1, 2, 3].map(t => Object.assign({ body: { kind: 'robe', mat: 'w.unmade', trim: 'w.unmade', sash: 'string' },
    head: { look: 'hood', mat: 'w.unmade', tip: 1, trim: t >= 2 ? 'w.ghost' : null } }, ghostOf(t))) },
  // Miravel: the Elder's robe and gnarled staff, grey; the Hollow Wreath, a thorned circlet of dark iron with the light in it
  'hollow-miravel': { relic: 'hollow-wreath', relicSlot: 'head', relicLook: { look: 'circlet', style: 'rotwood', mat: 'w.hollowlight', gem: 'w.hollowiron' }, own: true,
    H: { build: 'human', skin: 'w.hollowskin', hairMat: 'w.hollowpale', hair: 'long', ears: 'long', eye: HOLLOW_EYE, mantle: 'w.hollowgrey', gloves: 'w.hollowskin', boots: 'w.hollowgrey' },
    gear: [0, 1, 2, 3].map(() => ({ weapon: A('staff', { style: 'gnarl', haft: 'w.soot', leaves: 'w.hollowgrey', glow: 'w.hollowlight' }), body: { kind: 'robe', mat: 'w.hollowgrey', trim: 'w.hollowpale', sash: 'w.soot' } })) },
  // Qasim: the Cistern Lord's white robe and turban, grey; the Hollow Chalice held up in his off hand, the light over its rim
  'hollow-qasim': { relic: 'hollow-chalice', relicSlot: 'offhand', relicLook: { look: 'chalice', metal: 'w.hollowiron', glow: 'w.hollowlight' }, own: true, glintAt: ['offhand'],
    H: { build: 'brute', skin: 'w.hollowskin', hairMat: 'w.hollowgrey', hair: 'short', beard: true, eye: HOLLOW_EYE, cloak: 'w.hollowgrey', mantle: 'w.hollowgrey', gloves: 'w.hollowskin', boots: 'w.hollowgrey' },
    gear: [0, 1, 2, 3].map(() => ({ head: { look: 'wrap', mat: 'w.hollowpale', gem: 'w.hollowiron', tail: false }, body: { kind: 'robe', mat: 'w.hollowpale', trim: 'w.pewter', sash: 'w.hollowgrey' } })) },
  // Brundar: the Thane's plate, crown and axe, grey iron; the Hollow Gauntlet on his hands
  'hollow-brundar': { relic: 'hollow-gauntlet', relicSlot: 'hands', relicLook: { kind: 'gauntlets', mat: 'w.hollowlight', plate: 1 }, own: true,
    H: { build: 'dwarf', skin: 'w.hollowskin', hairMat: 'w.hollowgrey', hair: 'long', beard: 'braid', clasp: 'w.pewter', eye: HOLLOW_EYE, cloak: 'w.hollowgrey', mantle: 'w.hollowpale', gloves: 'w.hollowskin', boots: 'w.hollowiron' },
    gear: [0, 1, 2, 3].map(() => ({ head: { look: 'crown', style: 'regal', metal: 'w.pewter', gem: 'w.hollowiron' }, body: { kind: 'plate', mat: 'w.pewter', trim: 'w.hollowgrey' }, weapon: A('axe', { blade: 'w.pewter', haft: 'w.soot', socket: 'w.hollowgrey' }) })) },
  // Gretch: the Mayor's robe, fur and keys, grey; the Hollow Chain round her neck (its links over her too), its light at her chest
  'hollow-gretch': { relic: 'hollow-chain', relicSlot: 'amulet', relicLook: { metal: 'w.hollowiron', gem: 'w.hollowlight' }, relicH: { slungChain: 'w.hollowlight' }, own: true, glintAt: ['amulet'],
    H: { build: 'brute', skin: 'w.hollowskin', hairMat: 'w.hollowpale', hair: 'bun', eye: HOLLOW_EYE, cloak: 'w.hollowgrey', mantle: 'w.pewter', gloves: 'w.hollowgrey', boots: 'w.hollowgrey', trinket: { kind: 'key', mat: 'w.pewter' } },
    gear: [0, 1, 2, 3].map(() => ({ body: { kind: 'robe', mat: 'w.hollowgrey', trim: 'w.pewter', sash: 'w.soot' } })) },
};
// M7: the Thrall-Overseer is a cinder-thrall variant with no art key of its own in the foe data; on the map it is its own sprite
const BELOW_VARIANT = { 'cinder-thrall:thrall-overseer': 'thrall-overseer' };
// the M5 humanoids P6 rigged: a relic on the feet or in the off hand glints there (as the M4 holders' do)
const IRON_RIGGED = new Set(['brigand', 'rhune', 'cutter-chief', 'sawyer']);
function sunFoeSheet(key, gT, rel, S = SUN_FOES[key]) {
  const kit = S.gear[gT] || S.gear[0], H = Object.assign({}, S.H, kit.H || {}), gear = Object.assign({}, kit);
  delete gear.H;
  const mine = rel && rel === S.relic, real = mine && !S.own && typeof rel === 'string' ? itemArt(rel) : null;
  if (mine && S.relicH) Object.assign(H, S.relicH); // M7: a relic that shows on the body too (the Hollow Chain's links)
  if (mine && S.relicLook && !real) gear[S.relicSlot] = S.relicLook;
  const { L, M } = resolveGear(gear);
  if (mine && !real) { if (S.relicSlot !== 'trinket') M[S.relicSlot] = { heirloom: true, relic: true }; if (S.glintAt) M.glintAt = S.glintAt; }
  else if (rel) { const r = relicLook(rel); if (r) { L[r.slot] = r.look; M[r.slot] = { heirloom: true, relic: true }; if (r.slot === 'feet' || r.slot === 'offhand') M.glintAt = [r.slot]; } }
  if (!mine && S.relicSlot === 'trinket') delete H.trinket;
  return rigSheet(H, L, { meta: M, frames: 2, pick: k => k + 1 });
}
const foeCache = lru(64);
export function mapFoeSheet(artKey, { gearTier = 0, variant = null, relic } = {}) {
  const key = resolveFoeKey(artKey, variant), gT = Math.max(0, Math.min(3, gearTier | 0)), kitted = SUN_FOES[key] || IRON_FOES[key] || GLOOM_FOES[key] || BELOW_FOES[key];
  if (kitted) {
    const rel = relic !== undefined ? relic : kitted.relic || null;
    const img = foeCache.get(`s|${key}|${gT}|${rel || '-'}`, () => sunFoeSheet(key, gT, rel, kitted));
    return { img, w: WALKER_W, h: WALKER_H, foot: WALKER_FOOT.slice(), frames: 2, rows: 4, head: [8, 3] };
  }
  const def = FOE_ART[key], beast = BEASTS[key] || (def && def.kind === 'beast' && BEASTS[def.aliasOf]);
  if (beast && (SUN_BEASTS.has(key) || IRON_BEASTS.has(key) || GLOOM_BEASTS.has(key) || BELOW_BEASTS.has(key) || !(def && def.kind === 'humanoid'))) {
    const [w, h] = MAP_FOE_SIZE[key] || MAP_FOE_SIZE[def && def.aliasOf] || [16, 16];
    const rel = relic === undefined ? SUN_BEAST_RELIC[key] || IRON_BEAST_RELIC[key] || GLOOM_BEAST_RELIC[key] || BELOW_BEAST_RELIC[key] || (def && def.relic) || null : relic;
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
    if (rel) { const r = relicLook(rel); if (r) { L[r.slot] = r.look; M[r.slot] = { heirloom: true, relic: true }; if (IRON_RIGGED.has(key) && (r.slot === 'feet' || r.slot === 'offhand')) M.glintAt = [r.slot]; } }
    return rigSheet(H, L, { meta: M, frames: 2, pick: k => k + 1 });
  });
  return { img, w: WALKER_W, h: WALKER_H, foot: WALKER_FOOT.slice(), frames: 2, rows: 4, head: [8, 3] };
}

// mapFoeLook(artKey, variant) -> which drawing mapFoeSheet gives that foe (for the tests and the gallery): 'kit' (a walker-rig
// kit in this file), 'beast' (a dedicated sprite), 'rig' (the battle foe's own rig through foeLooks), 'stand-in' (the rig of a
// battle stand-in: the foe's art is not drawn yet), 'npc' (an NPC look) or 'villager' (a hashed face: no look at all)
export function mapFoeLook(artKey, variant = null) {
  const key = resolveFoeKey(artKey, variant), def = FOE_ART[key];
  if (SUN_FOES[key] || IRON_FOES[key] || GLOOM_FOES[key] || BELOW_FOES[key]) return 'kit';
  const beast = BEASTS[key] || (def && def.kind === 'beast' && BEASTS[def.aliasOf]);
  if (beast && (SUN_BEASTS.has(key) || IRON_BEASTS.has(key) || GLOOM_BEASTS.has(key) || BELOW_BEASTS.has(key) || !(def && def.kind === 'humanoid'))) return 'beast';
  if (def && foeLooks(key, { gearTier: 0 }).H) return def.standIn ? 'stand-in' : 'rig';
  return NPC_LOOKS[key] ? 'npc' : 'villager';
}

/* =====================================================================
   Beasts: dedicated map sprites (never downscaled battle art), 2 gait frames x s/n/e (w mirrored)
   st = { dir: 's'|'n'|'e', f: 0|1, w, h, gT, relic, anchors: { eyes, glint, halo } }
   ===================================================================== */
const spike = (at, ang, len, wd = .8) => { const c = Math.cos(ang), s = Math.sin(ang); return P([[at[0] - s * wd, at[1] + c * wd], [at[0] + c * len, at[1] + s * len], [at[0] + s * wd, at[1] - c * wd]]); };
const FAR = () => -1;
const EYE = { amber: [248, 200, 90], red: [240, 58, 42], blight: [180, 214, 90], dark: [22, 18, 26], gold: [245, 205, 88], pale: [236, 230, 214], frost: [184, 236, 255], mica: [228, 246, 252], ember: [255, 170, 60] };
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

/* ---- M5: the Ironspire's beasts and lairs ---- */
// rime-wolf 24x16: a lean grey-white wolf, ice crystals in its ruff from tier 1, pale blue eyes (red from tier 2), dark at tier 3
function rimeWolf(F, st) {
  const { dir, f, gT, anchors } = st, g = f ? 1.1 : -1.1, fur1 = gT >= 3 ? 'w.crag' : 'w.rimefur', eye = gT >= 2 ? EYE.red : EYE.frost, n = 1 + gT;
  if (dir === 'e') {
    F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'legF', tex: FAR, shapes: [C([16, 10], [16.8 - g, 15.2], 1, .75), C([8, 10.5], [7.2 + g, 15.2], 1.05, .75)] });
    F.add({ mat: fur1, prof: 'round', bw: .8, grp: 'tail', shapes: [C([4.8, 8.4], [1.4, 7.2 - f * .6], 1.5, .8)], tex: fur(1) });
    F.add({ mat: fur1, prof: 'round', bw: 2, grp: 'body', shapes: [E([11, 9.2], 6.2, 3), E([15.4, 8.2], 3.2, 3.2)], tex: fur(1) });
    if (gT) F.add({ mat: 'w.glacier', prof: 'ridge', grp: 'ruff', shapes: Array.from({ length: n }, (_, k) => spike([13 + k * 1.4, 6.4 - (k & 1) * .4], -Math.PI / 2 - .6 + k * .15, 1.6 + (k % 2) * .6 + gT * .2, .6)) });
    F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'legN', shapes: [C([15, 10.8], [14.4 + g, 15.2], 1.05, .8), C([8.6, 11], [9.4 - g, 15.2], 1.1, .8)] });
    F.add({ mat: fur1, prof: 'round', bw: 1.6, grp: 'head', shapes: [E([18.8, 6.4], 3, 2.4), C([20.4, 7.3], [23, 7.9], 1.3, .95)] });
    F.add({ mat: 'wolfPale', prof: 'round', bw: .6, grp: 'jaw', noShadow: true, shapes: [C([20.8, 8.6], [22.6, 8.9], .55)] });
    F.add({ mat: fur1, prof: 'round', bw: .6, grp: 'ear', shapes: [P([[17.2, 4.8], [18, 1.8], [19.6, 4.4]])] });
    anchors.eyes = [[19.9, 5.9, eye], [22.9, 7.5, EYE.dark]];
    return;
  }
  const s = dir === 's', l1 = f ? .8 : 0, l2 = f ? 0 : .8;
  if (gT) F.add({ mat: 'w.glacier', prof: 'ridge', grp: 'ruff', shapes: Array.from({ length: n + 1 }, (_, k) => spike([8.4 + k * (7 / n), s ? 5.8 : 6.4], -Math.PI / 2 + (k - n / 2) * .28, 1.8 + (k % 2) * .6 + gT * .2, .6)) });
  if (!s) F.add({ mat: fur1, prof: 'round', bw: 1.4, grp: 'headB', shapes: [E([12, 4.6], 2.8, 2.2), P([[9.4, 3.8], [9.2, .8], [11, 3]]), P([[14.6, 3.8], [14.8, .8], [13, 3]])] });
  F.add({ mat: fur1, prof: 'round', bw: 2, grp: 'body', shapes: [E([12, s ? 8.6 : 9.6], s ? 4.4 : 4.7, s ? 3.4 : 3.9)], tex: fur(2) });
  if (!s) F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'tail', shapes: [C([12, 7.4], [12.6 + (f ? .8 : -.8), 3.2], 1.3, .7)] });
  F.add({ mat: fur1, prof: 'round', bw: .7, grp: 'legs', shapes: [C([10.2, 11], [10, 15.2 - l1], 1.05, .8), C([13.8, 11], [14, 15.2 - l2], 1.05, .8)] });
  if (s) {
    F.add({ mat: 'wolfPale', prof: 'round', bw: 1.6, grp: 'chest', shapes: [E([12, 10.6], 3.1, 2.6)] });
    F.add({ mat: fur1, prof: 'round', bw: 1.8, grp: 'head', shapes: [E([12, 7], 3.4, 3), P([[9.4, 5], [8.4, 1.6], [11, 4.2]]), P([[14.6, 5], [15.6, 1.6], [13, 4.2]])], tex: fur(3) });
    F.add({ mat: 'wolfPale', prof: 'round', bw: 1, grp: 'snout', shapes: [E([12, 9.2], 1.7, 1.35)] });
    anchors.eyes = [[10.5, 6.4, eye], [13.5, 6.4, eye], [11.6, 8.5, EYE.dark]];
  }
}
// rockling 16x16: a heap of grey scree that stood up, pebble feet and fists, mica chips for eyes; lichen, then amber veins, then
// glowing cracks as the Waking climbs
function rockling(F, st) {
  const { dir, f, gT, anchors } = st, e = dir === 'e', bob = f ? .6 : 0, m = gT >= 3 ? 'w.slag' : 'w.crag';
  F.add({ mat: m, prof: 'round', bw: .8, grp: 'feet', shapes: [O([4.6 + (e ? (f ? 1 : -.4) : 0), 14.6 - (!e && f ? .6 : 0)], 1.6), O([11.4 - (e ? (f ? 1 : -.4) : 0), 14.6 - (!e && !f ? .6 : 0)], 1.6)] });
  F.add({ mat: m, prof: 'round', bw: 2.2, grp: 'body', shapes: [[8, 10.2, 5.8, 4.2], [5.4, 7, 3.4, 3], [10.6, 6.6, 3.6, 3.2], [8, 4.4, 3, 2.6]].map(([x, y, rx, ry]) => E([x, y + bob], rx, ry)), tex: q => ((q.x * 3 + q.y * 5) % 7 === 0 ? -1 : 0) + ((q.x + q.y * 2) % 9 === 0 ? .6 : 0) });
  F.add({ mat: m, prof: 'round', bw: .9, grp: 'fists', shapes: e ? [O([12.6, 10.4 + bob], 1.5)] : [O([2.2, 10.4 + bob], 1.5), O([13.8, 10.4 + bob], 1.5)] });
  if (gT >= 1) F.add({ mat: gT >= 2 ? 'amber' : 'w.alpine', prof: 'flat', grp: 'vein', noShadow: true, noOutline: true, shapes: gT >= 2 ? [C([5, 9 + bob], [7.4, 11.6 + bob], .45), C([10.6, 5.8 + bob], [11.8, 8.4 + bob], .4), C([8.6, 12 + bob], [10.4, 10.6 + bob], .4)] : [E([6, 4.6 + bob], 1.6, .8), E([11.4, 11.6 + bob], 1.4, .7)], tex: () => (gT >= 3 ? .2 : gT >= 2 ? -.8 : 0) });
  if (dir !== 'n') anchors.eyes = e ? [[11.4, 7.6 + bob, EYE.mica]] : [[6.4, 7.8 + bob, EYE.mica], [9.6, 7.8 + bob, EYE.mica]];
  if (gT >= 2) anchors.halo = true;
}
// forge-spark 16x16: a fist-sized living cinder, an ember core in a cage of slag, sparks trailing; it floats (white-hot at tier 3)
function forgeSpark(F, st) {
  const { dir, f, gT, anchors } = st, cy = 7 - (f ? .8 : 0);
  anchors.shadow = [8, 14.4, 2.8]; anchors.halo = true;
  F.add({ mat: gT >= 3 ? 'radiant' : 'ember', prof: 'round', bw: 1.6, grp: 'core', shapes: [O([8, cy], 2.8)], tex: () => (f ? .6 : 0) });
  F.add({ mat: 'w.slag', prof: 'round', bw: .9, grp: 'cage', shapes: [0, 1, 2, 3, 4].map(k => { const a = k * 1.26 + (f ? .3 : 0); return E([8 + Math.cos(a) * 3.2, cy + Math.sin(a) * 2.8], 1.5, 1.2); }) });
  F.add({ mat: 'amber', prof: 'flat', grp: 'sparks', noShadow: true, noOutline: true, shapes: (f ? [[5, 12], [11, 11.4], [8, 13.2], [3, 9]] : [[6, 11.4], [10, 12.6], [3.6, 10], [12.6, 9]]).slice(0, 2 + (gT >> 1)).map(([x, y]) => O([x, y], .55)) });
  if (dir !== 'n') anchors.eyes = dir === 'e' ? [[9.6, cy - .4, EYE.dark]] : [[7, cy - .4, EYE.dark], [9, cy - .4, EYE.dark]];
}
// peak-troll 24x24: grey-green hide, mossy stone warts, a heavy brow over a big nose, an underbite with tusks, long arms and a
// tree-limb club dragged along; Old Horn (32x32, k 4/3) is older, one great horn, a grey muzzle, the Trollhide Mantle (a
// patchwork of other trolls' hides) over his shoulders
function peakTroll(F, st, o = {}) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', k = o.k || 1;
  const T = ([x, y]) => [x * k, y * k], r = v => v * k, cap = (a, b, ra, rb = ra) => C(T(a), T(b), r(ra), r(rb)), ell = (c, rx, ry) => E(T(c), r(rx), r(ry));
  const hide = gT >= 3 ? 'w.crag' : 'w.troll', sw = f ? .7 : -.7, eye = gT >= 2 ? EYE.red : EYE.amber, jaw = o.horn ? 'wolfPale' : hide;
  const warts = q => ((q.x * 5 + q.y * 3) % 11 === 0 ? { m: 'w.crag', dd: .3 } : (q.x * 2 + q.y * 7) % 13 === 0 ? { m: 'w.alpine', dd: 0 } : 0);
  const mantle = o.horn && relic, patch = q => ({ m: ['w.hide', 'leather', 'wolfFur', 'w.troll'][((q.x >> 2) + (q.y >> 2) * 3) & 3], dd: (q.x + q.y) % 5 === 0 ? -1 : 0 });
  if (e) {
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'legF', tex: FAR, shapes: [cap([9.4, 16], [8.6 - sw, 23], 2, 1.7)] });
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'armF', tex: FAR, shapes: [cap([12.4, 9.6], [15.4 - sw * .5, 17.4], 1.5, 1.2)] });
    F.add({ mat: hide, prof: 'round', bw: 2.4, grp: 'body', shapes: [ell([10.6, 12], 6, 5.4), ell([8.4, 8.6], 4.4, 3.8)], tex: warts });
    if (mantle) F.add({ mat: 'w.hide', prof: 'round', bw: 1.4, grp: 'mantle', relic: true, shapes: [P([T([4, 7.4]), T([12.4, 5.6]), T([14, 10]), T([9.6, 15.4]), T([4.6, 14])])], tex: patch });
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'legN', shapes: [cap([12, 16.2], [12.8 + sw, 23], 2.1, 1.8)] });
    F.add({ mat: hide, prof: 'round', bw: .6, grp: 'ear', shapes: [P([T([13.6, 8.8]), T([12, 6.6]), T([14.8, 7.8])])] });
    F.add({ mat: hide, prof: 'round', bw: 1.6, grp: 'head', shapes: [ell([16, 9.8], 3.2, 2.7)], tex: warts });
    F.add({ mat: jaw, prof: 'round', bw: 1, grp: 'jaw', shapes: [ell([17.6, 11.4], 2.2, 1.3)] });
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'nose', shapes: [ell([19.2, 9.8], 1.3, 1.2)], tex: () => .6 });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'tusk', shapes: [spike(T([18.4, 11]), -Math.PI / 2.4, r(1.8), r(.5))] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [cap([15.6, 8], [18.2, 8.4], .45)] });
    if (o.horn) F.add({ mat: 'bone', prof: 'round', bw: .8, grp: 'horn', shapes: [cap([15.6, 7.4], [13.4, 3], 1.1, .8), cap([13.4, 3], [15.4, .8], .8, .4)], tex: q => (q.y % 2 ? -.6 : 0) });
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'armN', shapes: [cap([11.4, 10], [14.8, 18.4], 1.7, 1.4), ell([15.2, 19.2], 1.9, 1.6)] });
    F.add({ mat: 'bark', prof: 'round', bw: .8, grp: 'club', shapes: [cap([15.2, 19.2], [22.4, 22.8], 1, 1.7)], tex: q => (q.x % 3 === 0 ? -1 : 0) });
    anchors.eyes = [T([17.2, 8.9]).concat([eye])];
    if (mantle) anchors.glint = T([6, 9]);
    return;
  }
  const l1 = f ? .8 : 0, l2 = f ? 0 : .8;
  if (n) F.add({ mat: hide, prof: 'round', bw: 1.6, grp: 'headB', shapes: [ell([12, 7.4], 3.2, 2.6)] });
  if (o.horn && n) F.add({ mat: 'bone', prof: 'round', bw: .8, grp: 'horn', shapes: [cap([10, 6], [6.4, 1.6], 1.1, .8), cap([6.4, 1.6], [4.8, 3.6], .8, .4)] });
  F.add({ mat: hide, prof: 'round', bw: 1, grp: 'legs', shapes: [cap([9, 17], [8.6, 23 - l1], 2, 1.7), cap([15, 17], [15.4, 23 - l2], 2, 1.7)] });
  F.add({ mat: hide, prof: 'round', bw: 2.6, grp: 'body', shapes: [ell([12, 12.6], 7, 6)], tex: warts });
  F.add({ mat: hide, prof: 'round', bw: 1.8, grp: 'shoulders', shapes: [ell([6, 9.4], 3.2, 2.8), ell([18, 9.4], 3.2, 2.8)], tex: warts });
  if (mantle) F.add({ mat: 'w.hide', prof: 'round', bw: 1.4, grp: 'mantle', relic: true, shapes: [P([T([3, 8.4]), T([21, 8.4]), T([20, 14]), T([12, 16]), T([4, 14])])], tex: patch });
  F.add({ mat: hide, prof: 'round', bw: 1, grp: 'arms', shapes: [cap([5.4, 10], [4 - sw * .4, 19.6], 1.7, 1.4), cap([18.6, 10], [20 + sw * .4, 19.6], 1.7, 1.4), ell([4 - sw * .4, 20.4], 2, 1.7), ell([20 + sw * .4, 20.4], 2, 1.7)] });
  F.add({ mat: 'bark', prof: 'round', bw: .8, grp: 'club', shapes: [n ? cap([20 + sw * .4, 20.4], [21.4, 23.6], 1, 1.6) : cap([4 - sw * .4, 20.4], [2.6, 23.6], 1, 1.6)] });
  if (!n) {
    F.add({ mat: hide, prof: 'round', bw: .6, grp: 'ears', shapes: [P([T([9, 7.6]), T([6.8, 6]), T([9.2, 9.2])]), P([T([15, 7.6]), T([17.2, 6]), T([14.8, 9.2])])] });
    F.add({ mat: hide, prof: 'round', bw: 1.8, grp: 'head', shapes: [ell([12, 8.2], 3.6, 3)], tex: warts });
    F.add({ mat: jaw, prof: 'round', bw: 1, grp: 'jaw', shapes: [ell([12, 10.6], 2.8, 1.4)] });
    F.add({ mat: hide, prof: 'round', bw: 1, grp: 'nose', shapes: [ell([12, 8.9], 1.2, 1.2)], tex: () => .6 });
    F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [cap([9.6, 6.8], [11.4, 7.4], .45), cap([12.6, 7.4], [14.4, 6.8], .45)] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'tusks', shapes: [spike(T([10.4, 10.4]), -Math.PI / 2 - .25, r(1.7), r(.55)), spike(T([13.6, 10.4]), -Math.PI / 2 + .25, r(1.7), r(.55))] });
    if (o.horn) F.add({ mat: 'bone', prof: 'round', bw: .8, grp: 'horn', shapes: [cap([10, 6], [6.4, 1.6], 1.1, .8), cap([6.4, 1.6], [4.8, 3.6], .8, .4)], tex: q => (q.y % 2 ? -.6 : 0) });
    anchors.eyes = [T([10.8, 7.9]).concat([eye]), T([13.2, 7.9]).concat([eye])];
  }
  if (mantle) anchors.glint = T([6, 10]);
}
// the Thunder-Roc 48x40 on its eyrie: a storm-dark eagle mantling over its nest, wings raised and pinions spread like fingers,
// lightning running along their leading edges (2 frames), a hooked beak, yellow talons on the rim; the Roc-Feather Cloak
// snagged on the sticks
function thunderRoc(F, st) {
  const { dir, f, anchors, relic } = st, e = dir === 'e', n = dir === 'n', fl = f ? -1 : 0, fe = 'w.stormfeather';
  anchors.halo = true;
  const barred = q => ((q.y + (q.x >> 2)) % 3 === 0 ? -.7 : 0);
  const bolt = pts => pts.slice(0, -1).map((a, i) => C(a, pts[i + 1], .45));
  F.add({ mat: 'bogwood', prof: 'round', bw: 1.6, grp: 'nest', shapes: [E([24, 35.6], 21, 4.2)], tex: q => ((q.x + q.y * 3) % 5 === 0 ? { m: 'bark', dd: .4 } : (q.x * 2 + q.y) % 7 === 0 ? -1 : 0) });
  F.add({ mat: 'bark', prof: 'round', bw: .5, grp: 'sticks', shapes: [C([2, 33], [14, 37.6], .6), C([46, 32.6], [34, 38], .6), C([10, 38.6], [26, 36], .55), C([22, 38.8], [40, 36.4], .55)] });
  if (relic) { // the Roc-Feather Cloak, caught on the rim
    F.add({ mat: 'clothBlue', prof: 'round', bw: .8, grp: 'cloak', relic: true, shapes: [P([[31, 31.4], [37.4, 30.8], [39, 38.8], [31.6, 38.8]])], tex: q => ((q.y + (q.x & 1)) % 2 ? { m: fe, dd: .6 } : 0) });
    anchors.glint = [33, 32.2];
  }
  if (e) {
    F.add({ mat: fe, prof: 'round', bw: 1.6, grp: 'wingF', tex: FAR, shapes: [P([[21, 15], [26, 5 + fl], [23.6, .4 + fl], [19, 1 + fl], [17, 12]])] });
    F.add({ mat: fe, prof: 'round', bw: 1, grp: 'tail', shapes: [P([[15, 25], [4, 32], [7, 35.4], [18, 30]])], tex: barred });
    F.add({ mat: fe, prof: 'round', bw: 2.8, grp: 'body', shapes: [P([[16, 15], [27, 12], [32, 19], [29, 29], [19, 31], [13, 24]])], tex: q => (q.x > 25 && q.y > 15 ? (q.y % 3 ? .5 : -.4) : barred(q)) });
    F.add({ mat: fe, prof: 'round', bw: 1, grp: 'legs', shapes: [E([22.6, 30], 2.4, 2.6), E([27, 29.6], 2, 2.4)] });
    F.add({ mat: 'gold', prof: 'round', bw: .5, grp: 'talons', shapes: [C([21.6, 32], [21, 34.4], .7), C([23.6, 32], [24.8, 34.4], .7), C([27, 31.6], [28.6, 34], .7)] });
    F.add({ mat: fe, prof: 'round', bw: .8, grp: 'pinions', shapes: [0, 1, 2, 3].map(i => C([12.4 + i * .6, 4 + i * 2.8 + fl * .6], [5.6 + i * 1.2, 1.4 + i * 4.4 + fl * .6], 1.2, .7)), tex: q => (q.y < 5 + fl ? .4 : 0) });
    F.add({ mat: fe, prof: 'round', bw: 1.8, grp: 'wingN', shapes: [P([[17, 16], [25, 14], [23, 6 + fl], [16, 1.6 + fl], [11, 3 + fl], [11.4, 12], [15, 20]])], tex: q => (q.y < 8 + fl ? .5 : barred(q)) });
    F.add({ mat: fe, prof: 'round', bw: 1.6, grp: 'head', shapes: [E([31, 10.6], 4, 3.6)] });
    F.add({ mat: fe, prof: 'ridge', grp: 'crest', shapes: [spike([28, 8.4], Math.PI + .6, 3.6, .8), spike([27.6, 10.4], Math.PI + .25, 3.2, .8)] });
    F.add({ mat: 'iron', prof: 'bevel', bw: .8, grp: 'beak', shapes: [P([[33.4, 9.2], [37.6, 9.8], [39, 12.2], [38, 14.6], [37, 12.6], [33.4, 12.8]])] });
    F.add({ mat: 'gold', prof: 'flat', grp: 'cere', noShadow: true, shapes: [C([33.6, 10], [34.8, 10.2], .55)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [C([30, 8.6], [33, 9.2], .45)] });
    F.add({ mat: 'storm', prof: 'flat', grp: 'bolts', noShadow: true, noOutline: true, shapes: bolt(f ? [[4, 3.4], [8, .8], [11, 3.6], [16, 1.4], [21, 5.6]] : [[8, 4.6], [12, 2], [15, 4.6], [20, 3], [24, 9]]), tex: () => .5 });
    anchors.eyes = [[32.4, 10, EYE.gold]];
    return;
  }
  // facing, or seen from behind: mantling, both wings raised
  // the pinions fan out from the wrist as separate fingers, then the arm of the wing covers their roots
  F.add({ mat: fe, prof: 'round', bw: .8, grp: 'pinions', shapes: [-1, 1].flatMap(s => [0, 1, 2, 3].map(i => C([24 + s * 15.6, 6.4 + i * 3 + fl * (1 - i / 4)], [24 + s * (22.8 - i * .5), 2.6 + i * 4.8 + fl * (1 - i / 4)], 1.2, .7))), tex: q => (q.y < 7 + fl ? .4 : 0) });
  const wing = s => P([[24 + s * 5, 15], [24 + s * 12, 4 + fl], [24 + s * 17.6, 4.6 + fl], [24 + s * 18.6, 17], [24 + s * 13, 24.6], [24 + s * 6, 24]]);
  F.add({ mat: fe, prof: 'round', bw: 2, grp: 'wings', shapes: [wing(1), wing(-1)], tex: q => (Math.abs(q.x - 24) > 7 && q.y < 9 + fl ? .5 : barred(q)) });
  F.add({ mat: fe, prof: 'round', bw: 1, grp: 'tail', shapes: [P([[19, 28], [29, 28], [32.4, 34.6], [15.6, 34.6]])], tex: barred });
  F.add({ mat: fe, prof: 'round', bw: 3, grp: 'body', shapes: [E([24, 21.6], 7.4, 9.4)], tex: q => (!n && Math.abs(q.x - 24) < 5 && q.y > 15 ? (q.y % 3 ? .5 : -.5) : barred(q)) });
  F.add({ mat: fe, prof: 'round', bw: 1, grp: 'legs', shapes: [E([20.4, 29.4], 2.4, 2.6), E([27.6, 29.4], 2.4, 2.6)] });
  F.add({ mat: 'gold', prof: 'round', bw: .5, grp: 'talons', shapes: [-1, 1].flatMap(s => [C([24 + s * 2.8, 31.4], [24 + s * 2, 34.2], .7), C([24 + s * 4.2, 31.6], [24 + s * 4.6, 34.4], .7), C([24 + s * 5.6, 31.4], [24 + s * 7, 33.6], .7)]) });
  F.add({ mat: fe, prof: 'round', bw: 1.8, grp: 'head', shapes: [E([24, 10.8], 4.2, 3.8)] });
  F.add({ mat: fe, prof: 'ridge', grp: 'crest', shapes: [spike([22.4, 8], -Math.PI / 2 - .5, 3, .8), spike([24, 7.4], -Math.PI / 2, 3.2, .8), spike([25.6, 8], -Math.PI / 2 + .5, 3, .8)] });
  if (!n) {
    F.add({ mat: 'iron', prof: 'bevel', bw: .8, grp: 'beak', shapes: [P([[22.4, 12], [25.6, 12], [25, 15], [24, 17], [23, 15]])] });
    F.add({ mat: 'gold', prof: 'flat', grp: 'cere', noShadow: true, shapes: [C([22.8, 12.2], [25.2, 12.2], .5)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [C([20.4, 9.4], [23, 10.4], .45), C([25, 10.4], [27.6, 9.4], .45)] });
    anchors.eyes = [[22, 10.8, EYE.gold], [26, 10.8, EYE.gold]];
  }
  const edge = [[29, 15], [37, 4 + fl], [45, 5 + fl], [47, 12 + fl]].map(([x, y], i) => [x, y + (i % 2 ? 1.2 : -.6)]);
  F.add({ mat: 'storm', prof: 'flat', grp: 'bolts', noShadow: true, noOutline: true, shapes: bolt(f ? edge.map(([x, y]) => [48 - x, y]) : edge), tex: () => .5 });
}
// Mother Anvil 48x40 (a 3x2 lair): a black-iron anvil the size of a cart on four stubby legs, the Anvil Heart glowing in a barred
// window in its waist (2 frames: it breathes), ember eyes under its face, the Worldforge Hammer raised in one iron arm
function motherAnvil(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', m = 'blackiron', hr = f ? 3.6 : 3.1;
  anchors.halo = true;
  const face = q => (q.y <= 8 ? 1.4 : q.y === 9 ? .6 : (q.x * 3 + q.y) % 13 === 0 ? -.8 : 0);
  const heart = (c, w0) => {
    F.add({ mat: 'dark', prof: 'flat', grp: 'chamber', shapes: [RECT(c - w0 - .6, 13.2, c + w0 + .6, 21.6)] });
    F.add({ mat: gT >= 3 ? 'radiant' : 'ember', prof: 'round', bw: 2, grp: 'heart', shapes: [O([c, 17.4], hr)], tex: () => (f ? .5 : 0) });
  };
  const bars = (c, w0) => F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'bars', shapes: [-1, 0, 1].map(i => C([c + i * w0 * .55, 13.8], [c + i * w0 * .55, 21], .5)) });
  if (e) {
    F.add({ mat: m, prof: 'round', bw: 1, grp: 'legsF', tex: FAR, shapes: [C([15, 27], [13.6, 38.4], 2.2, 1.8), C([31, 27], [32.4, 38.4], 2.2, 1.8)] });
    heart(23, 5);
    F.add({ mat: m, prof: 'bevel', bw: 1.6, grp: 'body', shapes: [P([[4, 7], [38, 7], [47, 9], [38, 12], [34, 12.6], [32, 21], [37, 23], [38, 28], [8, 28], [9, 23], [14, 21], [12, 12.6], [4, 12]])], cuts: [RECT(18, 13.8, 28, 21)], tex: face });
    bars(23, 5);
    F.add({ mat: m, prof: 'round', bw: 1.2, grp: 'legs', shapes: [C([12, 27], [10.6, 38.6], 2.4, 2), C([34, 27], [35.4, 38.6], 2.4, 2)] });
    F.add({ mat: 'ember', prof: 'flat', grp: 'eye', noShadow: true, noOutline: true, shapes: [C([37.6, 10.6], [41, 10], .5)], tex: () => .3 });
    if (gT >= 1) F.add({ mat: 'ember', prof: 'flat', grp: 'seams', noShadow: true, noOutline: true, shapes: [C([10, 26.4], [18, 25.6], .4), C([28, 25.6], [36, 26.4], .4)].concat(gT >= 3 ? [C([8, 9.6], [14, 10.6], .4), C([26, 10.6], [32, 9.6], .4)] : []), tex: () => -1 });
    if (relic) { F.add({ mat: m, prof: 'round', bw: 1, grp: 'arm', shapes: [C([11, 12], [7, 4.6], 1.8, 1.4)] }); F.add({ mat: 'iron', prof: 'bevel', bw: 1, grp: 'hammer', relic: true, shapes: [RECT(1, .4, 12.4, 5.4)], tex: q => (q.x === 6 ? { m: 'ember', dd: -.6 } : 0) }); anchors.glint = [2.4, 1.4]; }
    return;
  }
  F.add({ mat: m, prof: 'round', bw: 1, grp: 'legsF', tex: FAR, shapes: [C([17, 27], [16.4, 38], 2, 1.7), C([31, 27], [31.6, 38], 2, 1.7)] });
  if (!n) heart(24, 6.4);
  F.add({ mat: m, prof: 'bevel', bw: 1.6, grp: 'body', shapes: [P([[6, 7], [42, 7], [44, 8.4], [43, 12], [36, 12], [34, 21], [39, 23], [40, 28], [8, 28], [9, 23], [14, 21], [12, 12], [6, 12]]), P([[6, 7.6], [.6, 9.6], [6, 11.6]])], cuts: n ? [] : [RECT(17.6, 13.8, 30.4, 21)], tex: face });
  if (!n) bars(24, 6.4);
  F.add({ mat: m, prof: 'round', bw: 1.2, grp: 'legs', shapes: [C([12, 27], [9.6, 38.6], 2.4, 2), C([36, 27], [38.4, 38.6], 2.4, 2)] });
  if (gT >= 1) F.add({ mat: 'ember', prof: 'flat', grp: 'seams', noShadow: true, noOutline: true, shapes: [C([9, 26.4], [17, 25.6], .4), C([31, 25.6], [39, 26.4], .4)].concat(gT >= 3 ? [C([8, 10.8], [13, 11.4], .4), C([35, 11.4], [41, 10.8], .4)] : []), tex: () => -1 });
  if (!n) F.add({ mat: 'ember', prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [C([16.4, 9.8], [20, 10.6], .5), C([28, 10.6], [31.6, 9.8], .5)], tex: () => .3 });
  if (relic) { F.add({ mat: m, prof: 'round', bw: 1, grp: 'arm', shapes: [C([39, 12], [43, 4.6], 1.8, 1.4)] }); F.add({ mat: 'iron', prof: 'bevel', bw: 1, grp: 'hammer', relic: true, shapes: [RECT(38, .4, 47.4, 5.4)], tex: q => (q.x === 43 ? { m: 'ember', dd: -.6 } : 0) }); anchors.glint = [39.4, 1.4]; }
}
// the Rime-Abbot 32x48 (a 3x2 lair): Brother Aurel, tall and frozen: a blue-white face under the Hushweave Cowl (it stirs: 2
// frames), a beard of icicles, a slate habit rimed with frost and frozen at the hem, the Rime Crozier in his hand, ice at his feet
function rimeAbbot(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', sw = f ? .5 : -.5, robe = gT >= 3 ? 'dark' : 'w.drowned';
  anchors.halo = true;
  const rime = q => (hash(q.x, q.y, 23) < .07 + Math.max(0, q.y - 30) * .006 ? { m: 'w.rimefur', dd: .4 } : q.y > 42 ? { m: 'w.ice', dd: (q.x + q.y) % 2 ? -.3 : .3 } : q.x % 3 === 0 ? -1 : 0);
  const sx = e ? 23 : n ? 7.4 : 24.6;
  F.add({ mat: 'w.ice', prof: 'flat', grp: 'pool', noOutline: true, noShadow: true, shapes: [E([16, 46.2], 12.6, 1.8)], tex: q => ((q.x * 3 + q.y) % 5 === 0 ? .8 : 0) });
  const crozier = () => {
    F.add({ mat: 'silver', prof: 'round', bw: .5, grp: 'crozier', relic: true, shapes: [C([sx, 46], [sx, 6.4], .8)], tex: q => (q.y % 6 === 0 ? { m: 'w.glacier', dd: .4 } : 0) });
    if (n) return;
    F.add({ mat: 'w.glacier', prof: 'round', bw: .6, grp: 'crook', relic: true, shapes: [C([sx, 6.4], [sx + 2.4, 3], .8), C([sx + 2.4, 3], [sx + 4.4, 5], .7)] });
    F.add({ mat: 'frost', prof: 'round', bw: .8, grp: 'orb', relic: true, noShadow: true, shapes: [O([sx + 1.8, 6.4], 1.3)], tex: () => (f ? .5 : 0) });
    anchors.glint = [sx - .4, 9];
  };
  if (relic && n) crozier();
  F.add({ mat: robe, prof: 'round', bw: 2.6, grp: 'robe', shapes: [P(e ? [[12.6, 15], [19.6, 15], [22.4 + sw, 45.4], [19, 46.4], [14, 45.6], [9.6, 46.4]] : [[10.4, 15], [21.6, 15], [26 + sw, 45.6], [22, 46.6], [16, 45.8], [10, 46.6], [6 - sw, 45.6]])], tex: rime });
  F.add({ mat: 'w.glacier', prof: 'ridge', grp: 'hem', shapes: (e ? [11, 14, 17, 20] : [8, 11, 14, 17, 20, 23]).map((x, i) => spike([x + .5, 45.2], Math.PI / 2, 1.6 + (i % 2) * .6, .7)) });
  if (!n) F.add({ mat: 'w.habit', prof: 'round', bw: 1, grp: 'scapular', shapes: [e ? RECT(17.4, 17, 20.2, 44.4) : RECT(13.8, 17, 18.2, 44.6)], tex: rime });
  F.add({ mat: 'string', prof: 'round', bw: .4, grp: 'belt', shapes: [e ? C([12.8, 27.4], [21, 27.4], .55) : C([10.6, 27.4], [21.4, 27.4], .55), C(e ? [13.4, 27.6] : [12, 27.6], e ? [13, 33] : [11.6, 33.4], .45)] });
  F.add({ mat: robe, prof: 'round', bw: 1.6, grp: 'sleeves', shapes: e ? [C([16.2, 17], [21.4, 26], 2.2, 2.8)] : [C([10.6, 17], [8.4, 27.4], 2.2, 3), C([21.4, 17], [23.4, 26.2], 2.2, 2.8)], tex: rime });
  F.add({ mat: 'w.rimeskin', prof: 'round', bw: .8, grp: 'hands', shapes: e ? [O([sx, 27], 1.6)] : n ? [O([8.4, 29.2], 1.5), O([23.6, 28], 1.5)] : [O([8.4, 29.2], 1.5), O([sx, 27.2], 1.6)] });
  if (relic) { // the Hushweave Cowl, grey and faintly moving
    F.add({ mat: 'w.habit', prof: 'round', bw: 2, grp: 'cowl', relic: true, shapes: [e ? E([16.4, 11.4], 5.4, 6) : E([16, 11.4], 5.8, 6.2), e ? P([[12.4, 7], [14, 2.8], [17.4, 6]]) : P([[13.6, 6.4], [16.6, 2.6], [18.8, 7]]),
      P(e ? [[11.6, 14.4], [20.6, 14.4], [22 + sw, 20], [16, 21.2], [10.6, 20]] : [[9.6, 14.4], [22.4, 14.4], [24.2 + sw, 20], [16, 21.4], [7.8 - sw, 20]])],
      tex: q => ((((q.x + q.y + f * 2) >> 1) % 3 === 0 ? -1 : 0) + ((q.x * 5 + q.y * 3) % 13 === 0 ? .8 : 0)) });
    anchors.glint2 = [e ? 14 : 12.4, 7];
  } else F.add({ mat: 'w.rimeskin', prof: 'round', bw: 2, grp: 'head', shapes: [e ? E([17, 11.6], 3.6, 4) : E([16, 11.6], 3.8, 4.2)] });
  if (!n) {
    if (relic) F.add({ mat: 'dark', prof: 'flat', grp: 'hollow', noShadow: true, shapes: [e ? E([19, 12.8], 2.4, 3.6) : E([16, 12.8], 3.4, 3.8)] });
    F.add({ mat: 'w.rimeskin', prof: 'round', bw: 1.2, grp: 'face', shapes: [e ? E([19.6, 13.2], 1.8, 2.8) : E([16, 13.4], 2.6, 3)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [e ? C([18.8, 11.6], [21, 11.8], .45) : C([13.8, 11.6], [18.2, 11.6], .45)] });
    F.add({ mat: 'w.glacier', prof: 'bevel', bw: .5, grp: 'beard', shapes: (e ? [[19.4, 3.4], [20.8, 4.6], [21.8, 2.6]] : [[13.8, 3], [15, 4.6], [16.2, 5.6], [17.4, 4.4], [18.4, 2.8]]).map(([x, l]) => P([[x - .8, 15.6], [x + .8, 15.6], [x, 15.8 + l]])) });
    anchors.eyes = e ? [[20.6, 12.6, EYE.frost]] : [[14.8, 12.8, EYE.frost], [17.2, 12.8, EYE.frost]];
  }
  if (relic && !n) crozier();
  F.add({ mat: 'frost', prof: 'flat', grp: 'motes', noShadow: true, noOutline: true, shapes: (f ? [[4, 20], [28, 30], [6, 38]] : [[5, 26], [27, 22], [29, 40]]).map(([x, y]) => O([x, y], .5)), tex: () => -.5 });
}
Object.assign(BEASTS, { 'rime-wolf': rimeWolf, rockling, 'forge-spark': forgeSpark, 'peak-troll': (F, st) => peakTroll(F, st), 'old-horn': (F, st) => peakTroll(F, st, { k: 4 / 3, horn: 1 }),
  'thunder-roc': thunderRoc, 'mother-anvil': motherAnvil, 'rime-abbot': rimeAbbot });
// the Ironspire beasts and lairs draw their own sprites whatever FOE_ART says, and carry their relics by default
const IRON_BEASTS = new Set(['rime-wolf', 'rockling', 'forge-spark', 'peak-troll', 'old-horn', 'thunder-roc', 'mother-anvil', 'rime-abbot']);
const IRON_BEAST_RELIC = { 'old-horn': 'trollhide-mantle', 'thunder-roc': 'roc-feather-cloak', 'mother-anvil': 'worldforge-hammer', 'rime-abbot': 'rime-crozier' };

/* ---- M6: the Gloomfen's beasts and lairs (the lairs play as P6's battle art in the game; these are their map sprites) ---- */
// mire-leech 16x12: a fat black leech inching through the mud, an orange stripe down its back, a round sucker; red-eyed at tier 3
function mireLeech(F, st) {
  const { dir, f, gT, anchors } = st, fat = gT >= 2 ? .5 : 0;
  if (dir === 'e') {
    const p = f ? [[2, 9.6], [5, 7.4], [8.6, 6.4], [12, 7.4], [14.2, 9.4]] : [[1.4, 9.8], [4.4, 9], [8, 8.2], [11.6, 8.6], [14.6, 9.6]];
    F.add({ mat: 'w.leech', prof: 'round', bw: 1.6, grp: 'body', shapes: p.slice(0, -1).map((a, i) => C(a, p[i + 1], 1.5 + fat - Math.abs(i - 1.5) * .25, 1.5 + fat - Math.abs(i - .5) * .25)), tex: q => (q.x % 3 === 0 ? -.8 : .2) });
    F.add({ mat: 'amber', prof: 'flat', grp: 'stripe', noShadow: true, noOutline: true, shapes: [C([p[1][0], p[1][1] - 1], [p[2][0], p[2][1] - 1], .35), C([p[2][0], p[2][1] - 1], [p[3][0], p[3][1] - 1], .35)], tex: () => -1.4 });
    F.add({ mat: 'w.leech', prof: 'round', bw: .6, grp: 'sucker', shapes: [O([p[4][0] + .3, p[4][1]], 1.2)], cuts: [O([p[4][0] + .6, p[4][1]], .5)] });
    if (gT >= 3) anchors.eyes = [[p[4][0] - .8, p[4][1] - 1.1, EYE.red]];
    return;
  }
  const hump = f ? 1.4 : 0; // end-on: its body humps up (stepA) or lies flat (stepB)
  F.add({ mat: 'w.leech', prof: 'round', bw: 1.8, grp: 'body', shapes: [E([8, 7.4 - hump * .5], 3.4 + fat, 3 + hump * .3), E([8, 9.8], 4.2 + fat, 1.8)], tex: q => (q.y % 3 === 0 ? -.8 : .2) });
  F.add({ mat: 'amber', prof: 'flat', grp: 'stripe', noShadow: true, noOutline: true, shapes: [C([8, 5.2 - hump * .5], [8, 9.2], .35)], tex: () => -1.4 });
  if (dir === 's') {
    F.add({ mat: 'w.leech', prof: 'round', bw: .6, grp: 'sucker', shapes: [O([8, 9.8], 1.4)], cuts: [O([8, 9.8], .6)] });
    if (gT >= 3) anchors.eyes = [[7, 7.4 - hump * .5, EYE.red], [9, 7.4 - hump * .5, EYE.red]];
  }
}
// marsh-light 16x20: a light hanging in the air over the water, its heart bright, a wisp of pale fire trailing under it; a light
// more circles it for each step of the Waking
function marshLight(F, st) {
  const { dir, f, gT, anchors } = st, cy = 7 - (f ? 1 : 0);
  anchors.shadow = [8, 18.4, 2.6]; anchors.halo = true; anchors.fade = 13;
  F.add({ mat: 'w.marshlight', prof: 'round', bw: 1.4, grp: 'tail', noShadow: true, shapes: [C([8, cy + 1], [8 + (f ? .8 : -.8), cy + 9], 1.9, .4)], tex: () => -.6 });
  F.add({ mat: 'w.marshlight', prof: 'round', bw: 2, grp: 'core', noShadow: true, shapes: [O([8, cy], 3)], tex: q => (Math.hypot(q.x + .5 - 7.6, q.y + .5 - cy + .4) < 1.5 ? 1 : .1) });
  const sats = [[3.4, cy - 3], [12.6, cy + 2], [4, cy + 5]].slice(0, gT);
  if (sats.length) F.add({ mat: 'w.marshlight', prof: 'round', bw: .6, grp: 'sats', noShadow: true, shapes: sats.map(([x, y]) => O([x + (f ? .6 : -.6), y], .9)), tex: () => .2 });
  if (dir !== 'n') anchors.eyes = dir === 'e' ? [[9.6, cy - .4, EYE.dark]] : [[7, cy - .4, EYE.dark], [9, cy - .4, EYE.dark]];
}
// lamp-moth 16x16: a big pale moth, a lamp-bright eye-spot on each wing (brighter as the Waking climbs), flying (a shadow under it)
function lampMoth(F, st) {
  const { dir, f, gT, anchors } = st, e = dir === 'e', cy = 6.6 - (f ? .6 : 0), up = f ? 1 : 0;
  anchors.shadow = [8, 14.6, 3]; anchors.halo = gT >= 1;
  const wing = s => P(e ? [[7, cy], [2 + up, cy - 4.6 + up * 2], [.8, cy - 1.4], [3.6, cy + 2.2]] : [[8, cy - .6], [8 + s * 6.8, cy - 4 + up * 3], [8 + s * 7.4, cy + .8], [8 + s * 3.2, cy + 3]]);
  F.add({ mat: 'w.moth', prof: 'round', bw: 1, grp: 'wings', shapes: e ? [wing(1)] : [wing(-1), wing(1)], tex: q => ((q.x + q.y) % 4 === 0 ? -.8 : .2) });
  F.add({ mat: 'w.lamplight', prof: 'flat', grp: 'spots', noShadow: true, noOutline: true, shapes: e ? [O([3.6, cy - .8 + up], .7)] : [O([4, cy - .4 + up], .75), O([12, cy - .4 + up], .75)], tex: () => (gT >= 2 ? .4 : -.4) });
  F.add({ mat: 'w.moth', prof: 'round', bw: .8, grp: 'body', shapes: [e ? C([6, cy + .6], [11, cy], 1.2, .9) : E([8, cy + .6], 1.3, 2.8)], tex: q => (q.y % 2 ? -.6 : 0) });
  F.add({ mat: 'w.moth', prof: 'round', bw: .4, grp: 'feelers', noShadow: true, shapes: e ? [C([11, cy - .4], [13.4, cy - 2.4], .3)] : [C([7.4, cy - 2], [6, cy - 4], .3), C([8.6, cy - 2], [10, cy - 4], .3)] });
  if (dir !== 'n') anchors.eyes = e ? [[10.6, cy - .4, EYE.dark]] : [[7.2, cy - 1.4, EYE.dark], [8.8, cy - 1.4, EYE.dark]];
}
// blackwater-gar 24x16: a long gar leaping from the black water, its needle jaw full of teeth, a splash ring under it. Old Jaws
// (32x24, k 4/3) is older and scarred, and the Gar's Tooth is one of his teeth (it glints)
function blackwaterGar(F, st, o = {}) {
  const { dir, f, gT, anchors, relic } = st, k = o.k || 1, eye = gT >= 2 ? EYE.red : EYE.amber;
  const T = ([x, y]) => [x * k, y * k], r = v => v * k, cap = (a, b, ra, rb = ra) => C(T(a), T(b), r(ra), r(rb));
  const skin = q => (o.old && (q.x * 3 + q.y) % 11 === 0 ? { m: 'bone', dd: -1.2 } : (q.y % 2 ? -.6 : 0) + ((q.x + q.y) % 5 === 0 ? .5 : 0)); // Old Jaws: pale old scars
  F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'splash', noShadow: true, noOutline: true, shapes: [E(T([12, 14.4]), r(8), r(1.6))], cuts: [E(T([12, 14.4]), r(6.4), r(.9))], tex: () => -1 });
  if (dir === 'e') {
    const a = f ? [[4, 13], [9, 8.4], [15, 7], [20.4, 9.2]] : [[3.6, 11], [9, 6.6], [15, 6.4], [20.6, 8.8]];
    F.add({ mat: 'w.gar', prof: 'round', bw: 1.4, grp: 'body', shapes: [cap(a[0], a[1], 1.3, 1.9), cap(a[1], a[2], 1.9, 1.6), cap(a[2], a[3], 1.6, .9)], tex: skin });
    F.add({ mat: 'w.gar', prof: 'ridge', grp: 'fins', shapes: [P([T([a[0][0] - 1.6, a[0][1] - .4]), T([a[0][0] - 3.4, a[0][1] - 2.6]), T([a[0][0] - 3, a[0][1] + 1.6])]), P([T([10, a[1][1] - 1]), T([12.4, a[1][1] - 3.8]), T([13, a[1][1] - .8])])] });
    F.add({ mat: 'bone', prof: 'round', bw: .4, grp: 'jaw', shapes: [cap(a[3], [23.4, a[3][1] + .4], .6, .3)] });
    anchors.eyes = [[a[3][0] * k - r(.6), a[3][1] * k - r(.8), eye]];
    if (relic) anchors.glint = [r(22.6), r(a[3][1] + .6)];
    return;
  }
  const y0 = f ? 5 : 6.4; // coming at you (or going from you) out of the water, snout up
  F.add({ mat: 'w.gar', prof: 'round', bw: 1.6, grp: 'body', shapes: [E(T([12, y0 + 4]), r(3.4), r(4.6)), cap([12, y0 + 1], [12, y0 - 3.6], 1.4, .6)], tex: skin });
  F.add({ mat: 'w.gar', prof: 'ridge', grp: 'fins', shapes: [P([T([8.8, y0 + 5]), T([5.4, y0 + 7.4]), T([9, y0 + 7])]), P([T([15.2, y0 + 5]), T([18.6, y0 + 7.4]), T([15, y0 + 7])])] });
  if (dir === 's') {
    F.add({ mat: 'bone', prof: 'flat', grp: 'teeth', noShadow: true, noOutline: true, shapes: [cap([11.4, y0 - 2], [11.4, y0 + .4], .25), cap([12.6, y0 - 2], [12.6, y0 + .4], .25)] });
    anchors.eyes = [[r(10.6), r(y0 + 1.6), eye], [r(13.4), r(y0 + 1.6), eye]];
    if (relic) anchors.glint = [r(12), r(y0 - 2.4)];
  }
}
// willow-wight 16x24: a willow walking on its roots: a split trunk, a knot of a face, weeping fronds for hair and arms; thorned from
// tier 1, rotten and red-eyed at tier 3. Grandfather Willow (32x40, k 1.6) is the old one, the Weeping Bow grown into his boughs
function willowWight(F, st, o = {}) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', k = o.k || 1, ox = o.ox || 0;
  const T = ([x, y]) => [x * k + ox, y * k], r = v => v * k, cap = (a, b, ra, rb = ra) => C(T(a), T(b), r(ra), r(rb));
  const bark = gT >= 3 ? 'rotwood' : 'bark', leaf = 'w.willow', sw = f ? .7 : -.7, eye = gT >= 3 ? EYE.red : gT >= 2 ? EYE.blight : EYE.amber;
  const grain = q => ((q.x + (q.y >> 2)) % 3 === 0 ? -1 : 0);
  const frond = (x0, y0, x1, y1) => cap([x0, y0], [x1 + sw * .6, y1], .8, .35);
  // fronds behind the trunk
  F.add({ mat: leaf, prof: 'round', bw: .6, grp: 'frondsB', tex: FAR, shapes: (n ? [[4, 4, 1.6, 18], [6, 3.6, 4.6, 20], [8, 3.4, 8, 20.6], [10, 3.6, 11.4, 20], [12, 4, 14.4, 18]] : [[4.4, 4.6, 1.8, 16.6], [11.6, 4.6, 14.2, 16.6]]).map(a => frond(...a)) });
  // root legs
  F.add({ mat: bark, prof: 'round', bw: .8, grp: 'roots', shapes: [cap([6.2, 17], [4.4 + (e ? sw : 0), 23.4], 1.1, .7), cap([9.8, 17], [11.6 - (e ? sw : 0), 23.4], 1.1, .7), cap([8, 18], [8 + sw, 23.4], .8, .5)], tex: grain });
  // the trunk, and its bough-arms
  F.add({ mat: bark, prof: 'round', bw: 1.6, grp: 'trunk', shapes: [P(e ? [[6, 18], [6.4, 9], [7.2, 4.6], [9.6, 4.6], [10.2, 9], [10.4, 18]].map(T) : [[5, 18], [5.4, 9], [6.4, 4.8], [9.6, 4.8], [10.6, 9], [11, 18]].map(T))], tex: grain });
  F.add({ mat: bark, prof: 'round', bw: .7, grp: 'arms', shapes: e ? [cap([9, 8.6], [13.4, 12.4 + sw], .8, .5)] : [cap([5.8, 8.4], [2.2, 13 - sw], .8, .5), cap([10.2, 8.4], [13.8, 13 + sw], .8, .5)], tex: grain });
  if (gT >= 1) F.add({ mat: 'thorn', prof: 'ridge', grp: 'thorns', shapes: (e ? [[11, 10, -.8], [12.6, 11.8, .6]] : [[4, 10.4, -2.4], [12, 10.4, -.7], [6, 14, 3], [10.4, 15, .2]]).slice(0, 1 + gT).map(([x, y, a]) => spike(T([x, y]), a, r(1.6), r(.5))) });
  // the face, a knot with hollows for eyes and mouth
  if (!n) {
    F.add({ mat: 'dark', prof: 'flat', grp: 'hollows', noShadow: true, noOutline: true, shapes: e ? [E(T([9.2, 9]), r(.7), r(.8)), E(T([9.4, 12.4]), r(.6), r(.9))] : [E(T([6.8, 9.2]), r(.8), r(.9)), E(T([9.2, 9.2]), r(.8), r(.9)), E(T([8, 12.6]), r(1.1), r(.8))] });
    anchors.eyes = e ? [[T([9.2, 9])[0], T([9.2, 9])[1], eye]] : [[T([6.8, 9.2])[0], T([6.8, 9.2])[1], eye], [T([9.2, 9.2])[0], T([9.2, 9.2])[1], eye]];
  }
  // the crown: fronds weeping over the shoulders and hanging from the arms
  F.add({ mat: leaf, prof: 'round', bw: 1.2, grp: 'crown', shapes: [E(T([8, 4.2]), r(4.6), r(2.4))], tex: q => ((q.x + q.y) % 3 === 0 ? -.8 : .2) });
  F.add({ mat: leaf, prof: 'round', bw: .6, grp: 'fronds', tex: q => ((q.x + q.y) % 4 === 0 ? -.6 : 0), shapes: (e ? [[7, 4.6, 5.4, 15.4], [9.6, 5, 11.4, 13.6], [13.4, 12, 13.6, 17.4]] : n ? [[5, 5, 3.4, 13.6], [11, 5, 12.6, 13.6]] : [[4.6, 4.8, 3, 14.6], [11.4, 4.8, 13, 14.6], [2.4, 12.6, 1.8, 18], [13.6, 12.6, 14.2, 18], [6.4, 5.4, 5.8, 8.6], [9.6, 5.4, 10.2, 8.6]]).map(a => frond(...a)) });
  if (relic && o.bow) { // the Weeping Bow grown into his boughs: a long drooping bow of pale willow, a string of green light
    const bx = e ? 12.6 : 13.4;
    F.add({ mat: 'w.willow', prof: 'round', bw: .5, grp: 'bow', relic: true, shapes: [cap([bx, 2], [bx + 1.6, 8], .45), cap([bx + 1.6, 8], [bx, 14], .45)], tex: () => .8 });
    F.add({ mat: 'verdant', prof: 'flat', grp: 'bowstring', noShadow: true, noOutline: true, shapes: [cap([bx, 2.2], [bx, 13.8], .22)], tex: () => -.6 });
    anchors.glint = T([bx + 1.4, 7]);
  }
}
// the Lantern Mother 32x40: tall, in black lace under her mourning veil, the Lamplighter's Lantern held out before her (gone when it
// is snapped off), moths round its light
function lanternMother(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', sw = f ? .6 : -.6;
  anchors.halo = true;
  const lace = q => (((q.x + q.y) & 1) && q.y > 26 ? -1 : (q.x * 3 + q.y) % 7 === 0 ? .5 : 0);
  // the gown, flaring to the ground and trailing
  F.add({ mat: 'w.mourning', prof: 'round', bw: 2.6, grp: 'gown', shapes: [P(e ? [[13, 14], [19, 14], [21.4 + sw, 39], [15, 39.4], [8.6, 39]] : [[11.4, 14], [20.6, 14], [25 + sw, 39], [16, 39.6], [7 - sw, 39]])], tex: lace });
  // the veil over head and shoulders
  F.add({ mat: 'w.mourning', prof: 'round', bw: 2, grp: 'veil', shapes: [e ? E([16.6, 8.6], 4.4, 5) : E([16, 8.4], 4.8, 5.2), P(e ? [[12, 9], [20.6, 9], [21.8, 20], [11.4, 21]] : [[10.8, 9], [21.2, 9], [23.4, 21], [8.6, 21]])], tex: q => (((q.x + q.y) & 1) && q.y > 12 ? -.8 : .2) });
  if (!n) F.add({ mat: 'clothGrey', prof: 'round', bw: .4, grp: 'veiltrim', noShadow: true, shapes: [e ? C([11.6, 20.6], [21.6, 19.8], .45) : C([8.8, 20.8], [23.2, 20.8], .45)] });
  // her hands, and the lantern held out
  const hand = e ? [23.4, 17.6 + sw * .4] : [23.6, 18.4 + sw * .4];
  F.add({ mat: 'w.mourning', prof: 'round', bw: 1, grp: 'arm', shapes: [e ? C([18, 15.4], hand, 1.6, 1) : C([20.4, 15], hand, 1.5, 1)] });
  F.add({ mat: 'skinPale', prof: 'round', bw: .8, grp: 'hand', shapes: [O(hand, 1.2)] });
  if (!e) F.add({ mat: 'skinPale', prof: 'round', bw: .8, grp: 'hand2', shapes: [O([10.6, 24.4], 1.1)] });
  if (relic) {
    const [lx, ly] = [hand[0], hand[1] + 1.4];
    F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'ring', relic: true, shapes: [C([lx, ly - .4], [lx, ly + 1], .4)] });
    F.add({ mat: 'bronze', prof: 'bevel', bw: .7, grp: 'lantern', relic: true, shapes: [RECT(lx - 2.2, ly + 1, lx + 2.2, ly + 7), P([[lx - 2.8, ly + 1.4], [lx, ly - .4], [lx + 2.8, ly + 1.4]]), RECT(lx - 1.6, ly + 7, lx + 1.6, ly + 8)] });
    F.add({ mat: 'w.lamplight', prof: 'flat', grp: 'flame', relic: true, noShadow: true, shapes: [RECT(lx - 1.3, ly + 2, lx + 1.3, ly + 6.2)], tex: () => (f ? .6 : .1) });
    anchors.glint = [lx - 1.6, ly + 1.6];
  }
  // moths about the light
  F.add({ mat: 'w.moth', prof: 'flat', grp: 'moths', noShadow: true, noOutline: true, shapes: (f ? [[27, 14], [29.4, 24], [6, 16], [25, 29]] : [[28.4, 17], [26.4, 26.6], [4.6, 20], [29, 12]]).slice(0, 2 + (gT >> 1)).map(([x, y]) => E([x, y], 1, .6)), tex: () => .8 });
  if (!n) anchors.eyes = e ? [[19, 9.6, EYE.gold]] : [[14.6, 9.6, EYE.gold], [17.4, 9.6, EYE.gold]];
}
// the Blackwater Leviathan 48x40: a great eel-like head and neck up out of the black water, two coils of its back behind; an iron
// collar on its neck with the Tallymen's chain running off into the water, Corvus's Harpoon deep in its side (it glints) and the
// Deep-Pearl set in its brow
function leviathan(F, st) {
  const { dir, f, gT, anchors, relic } = st, e = dir === 'e', n = dir === 'n', bob = f ? 1 : 0, eye = gT >= 2 ? EYE.red : EYE.frost;
  anchors.halo = gT >= 2;
  const scale = q => ((q.x + (q.y >> 1) * 2) % 4 === 0 ? -.8 : (q.x * 3 + q.y) % 13 === 0 ? { m: 'w.fenstone', dd: .4 } : 0); // barnacles
  F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'water', noShadow: true, noOutline: true, shapes: [E([24, 35.6], 23, 4.2)], tex: q => -2.62 + ((q.x * 2 + q.y * 5 + f * 3) % 17 === 0 ? .8 : 0) });
  // its back breaking the water behind it, twice
  F.add({ mat: 'w.levi', prof: 'round', bw: 3, grp: 'coils', tex: FAR, shapes: e ? [E([8, 33 - bob * .4], 7, 4.6), E([20, 34 + bob * .4], 5.4, 3.2)] : [E([7.4, 33.4 - bob * .4], 6.6, 4.4), E([40.6, 33.8 + bob * .4], 6.2, 4)] });
  F.add({ mat: 'w.levi', prof: 'ridge', grp: 'spines', tex: FAR, shapes: (e ? [[4, 29], [8, 28.2], [12, 29]] : [[4, 29.6], [7.4, 28.8], [11, 29.6], [37, 30.2], [40.6, 29.6], [44, 30.2]]).map(([x, y]) => spike([x, y - bob * .4], -Math.PI / 2, 2.4, .8)) });
  // the neck rising from the water
  const nx = e ? 30 : 24, hy = 11 - bob;
  F.add({ mat: 'w.levi', prof: 'round', bw: 3.4, grp: 'neck', shapes: [C([nx - (e ? 4 : 0), 36], [nx, hy + 6], 7.4, 5.6)], tex: scale });
  // the collar and its chain
  F.add({ mat: 'blackiron', prof: 'round', bw: .8, grp: 'collar', shapes: [RECT(nx - 6.4 + (e ? -1.4 : 0), hy + 12, nx + 6.4 - (e ? 1.4 : 0), hy + 14.6)], tex: q => (q.x % 3 === 0 ? -.8 : 0) });
  F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'chain', shapes: [0, 1, 2, 3, 4, 5].map(i => { const x = (e ? nx - 6 : nx + 6) + (e ? -i * 2.4 : i * 2.4), y = hy + 14 + i * 2.6; return i % 2 ? E([x, y], 1.2, .7) : E([x, y], .8, 1.1); }) });
  // the head
  if (n) F.add({ mat: 'w.levi', prof: 'round', bw: 3, grp: 'head', shapes: [E([nx, hy + 2], 7.4, 6)], tex: scale });
  else if (e) {
    F.add({ mat: 'w.levi', prof: 'round', bw: 3, grp: 'head', shapes: [E([nx + 2, hy + 1], 7, 5.4), C([nx + 4, hy + 2], [nx + 14.6, hy + 4.4], 3.6, 2.2)], tex: scale });
    F.add({ mat: 'dark', prof: 'flat', grp: 'maw', noShadow: true, shapes: [C([nx + 6, hy + 5.4], [nx + 15, hy + 5.6], .6)] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'teeth', shapes: [8, 10.4, 12.8].map(x => P([[nx + x - .6, hy + 5], [nx + x, hy + 6.8], [nx + x + .6, hy + 5]])) });
    anchors.eyes = [[nx + 5.4, hy - .6, eye]];
  } else {
    F.add({ mat: 'w.levi', prof: 'round', bw: 3, grp: 'head', shapes: [E([nx, hy + 1], 7.6, 5.8), E([nx, hy + 6.4], 5.4, 3.6)], tex: scale });
    F.add({ mat: 'dark', prof: 'flat', grp: 'maw', noShadow: true, shapes: [E([nx, hy + 7.6], 3.8, 1.4)] });
    F.add({ mat: 'bone', prof: 'ridge', grp: 'teeth', shapes: [-2.6, -.8, .8, 2.6].map(x => P([[nx + x - .5, hy + 6.6], [nx + x, hy + 8.4], [nx + x + .5, hy + 6.6]])) });
    anchors.eyes = [[nx - 3.6, hy + .6, eye], [nx + 3.6, hy + .6, eye]];
  }
  // the Deep-Pearl in its brow
  if (!n) F.add({ mat: 'w.pearl', prof: 'round', bw: 1, grp: 'pearl', shapes: [O(e ? [nx + 3.4, hy - 3.4] : [nx, hy - 2.6], 1.5)], tex: () => .6 });
  // Corvus's Harpoon deep in its side
  if (relic) {
    const hx0 = e ? nx - 2 : nx + 5, hy0 = hy + 20;
    F.add({ mat: 'wood', prof: 'round', bw: .5, grp: 'harpoon', relic: true, shapes: [C([hx0, hy0], [hx0 + (e ? -9 : 9), hy0 - 9], .7)], tex: q => ((q.x + q.y) % 3 === 0 ? -.8 : 0) });
    F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'line', relic: true, noShadow: true, shapes: [C([hx0 + (e ? -9 : 9), hy0 - 9], [hx0 + (e ? -12 : 12), hy0 - 5], .35)] });
    anchors.glint = [hx0 + (e ? -8.4 : 8.4), hy0 - 8.4];
  }
}
Object.assign(BEASTS, { 'mire-leech': mireLeech, 'marsh-light': marshLight, 'lamp-moth': lampMoth, 'blackwater-gar': (F, st) => blackwaterGar(F, st),
  'old-jaws': (F, st) => blackwaterGar(F, st, { k: 4 / 3, old: 1 }), 'willow-wight': (F, st) => willowWight(F, st),
  'grandfather-willow': (F, st) => willowWight(F, st, { k: 1.6, ox: 3.2, bow: 1 }), 'lantern-mother': lanternMother, 'blackwater-leviathan': leviathan });
// the Gloomfen's beasts and lairs draw their own sprites whatever FOE_ART says, and carry their relics by default
const GLOOM_BEASTS = new Set(['mire-leech', 'marsh-light', 'lamp-moth', 'blackwater-gar', 'old-jaws', 'willow-wight', 'grandfather-willow', 'lantern-mother', 'blackwater-leviathan']);
const GLOOM_BEAST_RELIC = { 'old-jaws': 'gar-tooth', 'grandfather-willow': 'weeping-bow', 'lantern-mother': 'lamplighters-lantern', 'blackwater-leviathan': 'corvus-harpoon' };
/* M7: the Hearth Below's two big walkers, drawn whole (as M5's Rime Abbot is) */
// the Forge-Warden (24 x 32): a bellows-and-anvil construct as tall as a door: an anvil for a body on two thick iron legs, the
// anvil's face its shoulders and its horn its brow, two coals for eyes under it, a grate in its chest with the fire behind, arms
// of chain ending in anvil-block fists, and a great leather bellows on its back that breathes (the two frames: drawn, pressed; it
// blows sparks from its nozzle as it presses)
function forgeWarden(F, st) {
  const { dir, f, gT, anchors } = st, e = dir === 'e', n = dir === 'n', br = f ? -1 : 0, hot = gT >= 2;
  anchors.halo = true;
  const iron = q => (q.y % 5 === 0 ? { m: 'iron', dd: -.4 } : 0) + (hash(q.x, q.y, 10180) < .05 ? -.7 : 0);
  F.add({ mat: 'dark', prof: 'flat', grp: 'shade', noOutline: true, noShadow: true, shapes: [E([12, 30.6], 9, 1.6)], tex: () => -1.2 });
  const st1 = f ? .8 : -.8;
  // the legs: iron columns, stepping
  F.add({ mat: 'blackiron', prof: 'round', bw: 1.2, grp: 'legs', shapes: e ? [RECT(8.6 - st1, 23, 12 - st1, 30.4), RECT(12 + st1, 23, 15.4 + st1, 30.6)] : [RECT(6, 23, 10, 30.4 + (f ? -.4 : 0)), RECT(14, 23, 18, 30.4 + (f ? 0 : -.4))], tex: iron });
  // the bellows: leather boards and pleats on the back, full in the back view
  const pleats = q => (q.y % 3 === 0 ? -1 : 0);
  if (n) F.add({ mat: 'leather', prof: 'round', bw: 1.4, grp: 'bellows', shapes: [P([[5, 7.4], [19, 7.4], [20 - br, 19], [4 + br, 19]])], tex: pleats });
  else if (e) F.add({ mat: 'leather', prof: 'round', bw: 1.2, grp: 'bellows', shapes: [P([[3.6 + br, 8], [8, 7.6], [8, 19.4], [2.4 + br, 18.6]])], tex: pleats });
  else F.add({ mat: 'leather', prof: 'round', bw: 1.2, grp: 'bellows', shapes: [P([[3.4 + br, 7], [20.6 - br, 7], [21.4 - br, 17], [2.6 + br, 17]])], tex: pleats });
  F.add({ mat: 'bronze', prof: 'round', bw: .6, grp: 'nozzle', shapes: [e ? C([4, 8], [2.6, 3.6], .9, .6) : C([12, 7.4], [12, 2.6], 1, .7)] });
  // the anvil: its face across the shoulders, its waist, its foot on the legs; the horn forward in profile
  const body = e ? P([[6, 8], [17, 8], [23.6, 9.6], [17, 11.4], [15.6, 14], [15.6, 21.4], [18, 24.4], [6.4, 24.4], [8.8, 21.4], [8.8, 14], [7, 12]])
    : P([[1.6, 8], [22.4, 8], [20.4, 12], [16.4, 14], [16.4, 21.4], [19.4, 24.6], [4.6, 24.6], [7.6, 21.4], [7.6, 14], [3.6, 12]]);
  F.add({ mat: 'blackiron', prof: 'round', bw: 2, grp: 'anvil', shapes: [body], tex: q => (q.y <= 9 ? .9 : q.y === 10 ? .2 : 0) + (hash(q.x, q.y, 10181) < .05 ? -.8 : 0) });
  if (!n) { // the chest grate, the fire behind it
    const g = e ? [10, 15, 14.4, 21] : [9.4, 15, 14.6, 21];
    F.add({ mat: 'ember', prof: 'flat', grp: 'fire', noShadow: true, shapes: [RECT(...g)], tex: q => (hot ? .4 : 0) + (f ? .3 : -.2) + (q.y > 18 ? .3 : 0) });
    F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'grate', noShadow: true, shapes: [0, 1, 2].map(i => RECT(g[0] + .6 + i * 1.6, g[1], g[0] + 1.3 + i * 1.6, g[3])).concat([RECT(g[0], g[1], g[2], g[1] + .8)]) });
    anchors.eyes = e ? [[19.4, 10.6, EYE.ember]] : [[8.4, 10.4, EYE.ember], [15.6, 10.4, EYE.ember]];
  }
  // the arms: chains down from the shoulders, the anvil-block fists
  const links = (a, b) => { const L = []; for (let i = 0; i < 4; i++) { const t = (i + .5) / 4, c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; L.push(i % 2 ? E(c, .7, 1.3) : E(c, 1.2, .8)); } return L; };
  const arms = e ? [[[14, 11], [18.6, 18]]] : [[[3, 10], [2, 17.6]], [[21, 10], [22, 17.6]]];
  arms.forEach(([a, b], i) => {
    F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'arm' + i, shapes: links(a, b), tex: q => (hash(q.x, q.y, 10182) < .2 ? { m: 'rust', dd: -.6 } : 0) });
    F.add({ mat: 'blackiron', prof: 'bevel', bw: 1, grp: 'fist' + i, shapes: [RECT(b[0] - 2.6, b[1], b[0] + 2.6, b[1] + 4.6)], tex: q => (q.y === Math.round(b[1]) ? .7 : 0) });
  });
  // sparks blown from the nozzle as the bellows press
  if (f || gT >= 3) F.add({ mat: 'ember', prof: 'flat', grp: 'sparks', noShadow: true, noOutline: true, shapes: (e ? [[1.6, 1.4], [3.6, .6]] : [[10.6, 1.2], [13.6, .6], [12.4, 2]]).map(([x, y]) => O([x, y], .5)), tex: () => .5 });
}
// the Unsmith (32 x 48): Harrow Ironvein, Hilda's twin, tall: a boatman's cloak of black oilcloth over a smith's leather apron
// (the Ironvein Apron, iron veined through it), its clasp a hammer in a broken ring; copper hair and beard gone grey at the
// temples; the Worldforge Heart a ring glowing on his left hand; the Unmaking Hammer in his right, its head edged with the
// violet-black light (it is gone when `relic` is null)
function unsmithBeast(F, st) {
  const { dir, f, anchors, relic } = st, e = dir === 'e', n = dir === 'n', sw = f ? .6 : -.6;
  anchors.halo = true;
  F.add({ mat: 'dark', prof: 'flat', grp: 'shade', noOutline: true, noShadow: true, shapes: [E([16, 46.6], 9.4, 1.4)], tex: () => -1.2 });
  const hammer = hx => { // the Unmaking Hammer, head down at his side, its haft in his hand
    const [x, y] = hx;
    F.add({ mat: 'blackiron', prof: 'round', bw: .5, grp: 'haft', relic: true, shapes: [C([x, y - 2], [x + 1.4, y + 13], .75)] });
    F.add({ mat: 'blackiron', prof: 'bevel', bw: 1, grp: 'hammerhead', relic: true, shapes: [P([[x - 3.2, y + 12], [x + 5.6, y + 11.2], [x + 6, y + 16], [x - 2.8, y + 16.6]])], tex: q => (q.y <= y + 12.6 ? .6 : 0) });
    F.add({ mat: 'w.hollowlight', prof: 'flat', grp: 'unmaking', relic: true, noShadow: true, noOutline: true, shapes: [C([x - 3, y + 16.2], [x + 5.8, y + 15.6], .5)], tex: () => (f ? -.4 : -1) });
    anchors.glint = [x + 5, y + 12];
  };
  const cloak = q => ((q.x + (q.y >> 2)) % 4 === 0 ? -.8 : 0) + (q.y > 40 ? -.4 : 0);
  // boots under the cloak, stepping
  F.add({ mat: 'leatherDark', prof: 'round', bw: .8, grp: 'boots', shapes: e ? [RECT(13 - sw, 41, 16.4 - sw, 46.4), RECT(16 + sw, 41, 19.6 + sw, 46.6)] : [RECT(11, 41, 14.6, 46.4 + (f ? -.4 : 0)), RECT(17.4, 41, 21, 46.4 + (f ? 0 : -.4))] });
  if (n) { // from behind: the cloak hangs to his heels, his hair over its collar, the hammer's head at his side
    F.add({ mat: 'w.boatcloak', prof: 'round', bw: 2.6, grp: 'cloak', shapes: [P([[9, 12.4], [23, 12.4], [26 + sw, 44.4], [16, 45], [6 - sw, 44.4]])], tex: cloak });
    F.add({ mat: 'w.boatcloak', prof: 'round', bw: 1.2, grp: 'collar', shapes: [C([10, 13], [22, 13], 1.8)] });
    F.add({ mat: 'hairCopper', prof: 'round', bw: 2, grp: 'head', shapes: [E([16, 8.4], 4.4, 4.8)], tex: q => ((q.x + q.y) % 3 === 0 ? -.8 : 0) + (q.y > 10 ? { m: 'hairSilver', dd: -.4 } : 0) });
    if (relic) hammer([8, 27]);
    return;
  }
  // the cloak behind him, open at the front on the apron
  F.add({ mat: 'w.boatcloak', prof: 'round', bw: 2.4, grp: 'cloakback', shapes: [P(e ? [[9.4, 12.4], [18, 12.4], [16.8, 44], [11, 45], [4.6 - sw, 44]] : [[8.4, 12.4], [23.6, 12.4], [26.6 + sw, 44.6], [16, 45.2], [5.4 - sw, 44.6]])], tex: cloak });
  // the body in a dark shirt, and over it the Ironvein Apron: leather, a vein of iron down it, studs at its edge
  F.add({ mat: 'w.char', prof: 'round', bw: 1.4, grp: 'shirt', shapes: [P(e ? [[12, 13], [19, 13], [19.6, 40], [12.4, 40]] : [[11.2, 13], [20.8, 13], [21.4, 40], [10.6, 40]])], tex: q => (q.x % 3 === 0 ? -.6 : 0) });
  F.add({ mat: 'leatherDark', prof: 'round', bw: 1, grp: 'apron', shapes: [P(e ? [[15, 17], [20, 17], [21, 41.4], [15.4, 41.4]] : [[12.4, 17], [19.6, 17], [20.6, 41.6], [11.4, 41.6]])],
    tex: q => (Math.abs(q.x - (e ? 18 : 16) - Math.sin(q.y / 3) * .8) < .6 ? { m: 'iron', dd: .2 } : (q.y % 5 === 0 && (q.x === (e ? 20 : 12) || q.x === (e ? 15 : 19)) ? { m: 'iron', dd: .6 } : 0)) });
  F.add({ mat: 'leatherDark', prof: 'round', bw: .4, grp: 'apronstrap', noShadow: true, shapes: e ? [C([15.4, 17], [13.4, 13.4], .5)] : [C([12.6, 17], [11.4, 13.4], .5), C([19.4, 17], [20.6, 13.4], .5)] });
  // the cloak's fronts falling either side of the apron
  if (!e) F.add({ mat: 'w.boatcloak', prof: 'round', bw: 1.4, grp: 'cloakfront', shapes: [P([[8.4, 12.6], [11.4, 13.4], [10.2, 43.4], [5.6 - sw, 44.2]]), P([[23.6, 12.6], [20.6, 13.4], [21.8, 43.4], [26.4 + sw, 44.2]])], tex: cloak });
  F.add({ mat: 'w.boatcloak', prof: 'round', bw: 1.2, grp: 'collar', shapes: [e ? C([10, 13], [18.4, 13.2], 1.8) : C([9.6, 13], [22.4, 13], 1.8)] });
  // the arms in the cloak's sleeves, the hands
  const lh = e ? null : [7.6, 29.4], rh = e ? [20.6, 28.6] : [24.4, 29];
  F.add({ mat: 'w.boatcloak', prof: 'round', bw: 1.2, grp: 'arms', shapes: e ? [C([15.6, 15], [20.2, 27.4], 2.6, 2.2)] : [C([10, 15], [7.8, 28], 2.6, 2.2), C([22, 15], [24.2, 27.6], 2.6, 2.2)], tex: cloak });
  if (relic) hammer(rh);
  F.add({ mat: 'skinTan', prof: 'round', bw: .8, grp: 'hands', shapes: (lh ? [O(lh, 1.8)] : []).concat([O(rh, 1.8)]) });
  if (lh) { F.add({ mat: 'w.whitegold', prof: 'round', bw: .4, grp: 'ring', noShadow: true, shapes: [O([lh[0] + .6, lh[1] - .2], .75)], tex: () => (f ? .4 : 0) }); anchors.glint2 = [lh[0] + .6, lh[1] - .8]; }
  // the head: copper hair and beard, grey at the temples, soot on his brow; the clasp at his throat
  const hc = e ? [18, 8.6] : [16, 8.6];
  F.add({ mat: 'skinTan', prof: 'round', bw: 2, grp: 'head', shapes: [e ? E(hc, 3.8, 4.4) : E(hc, 4, 4.6)] });
  F.add({ mat: 'hairCopper', prof: 'round', bw: 1.4, grp: 'hair', shapes: e ? [P([[13.6, 8], [14, 4.4], [17, 3.4], [21.4, 4.6], [21, 6.4], [17.4, 5.6], [15.6, 9.6]])] : [P([[11.8, 8.4], [12.2, 4.8], [16, 3.4], [19.8, 4.8], [20.2, 8.4], [19, 6.2], [13, 6.2]])], tex: q => ((q.x + q.y) % 3 === 0 ? -.8 : 0) + ((e ? q.x < 15 : q.x < 13 || q.x > 19) ? { m: 'hairSilver', dd: -.3 } : 0) });
  F.add({ mat: 'hairCopper', prof: 'round', bw: 1.2, grp: 'beard', shapes: [e ? P([[17, 10.4], [21.6, 10.2], [20.6, 14.4], [18, 14.6]]) : P([[12.6, 10.4], [19.4, 10.4], [18.4, 14.4], [16, 15.4], [13.6, 14.4]])], tex: q => (q.y % 2 ? -.7 : 0) });
  F.add({ mat: 'w.soot', prof: 'flat', grp: 'soot', noShadow: true, noOutline: true, shapes: [e ? C([18, 6.8], [21, 7], .5) : C([13.4, 6.8], [18.6, 6.8], .5)], tex: () => -.4 });
  anchors.eyes = e ? [[20.4, 8.6, EYE.dark]] : [[14.4, 8.8, EYE.dark], [17.6, 8.8, EYE.dark]];
  const cc = e ? [15.2, 14.2] : [16, 14.6];
  F.add({ mat: 'bronze', prof: 'round', bw: .5, grp: 'clasp', shapes: [O(cc, 1.6)], cuts: [O(cc, .7), RECT(cc[0] + .2, cc[1] - 1.8, cc[0] + 1.8, cc[1] - .4)] });
}
Object.assign(BEASTS, { 'forge-warden': forgeWarden, unsmith: unsmithBeast });
const BELOW_BEASTS = new Set(['forge-warden', 'unsmith']);
const BELOW_BEAST_RELIC = { unsmith: 'unmaking-hammer' };

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
  'dune-glass', 'mirage', 'quicksand', 'vault-seal', 'glass-spire', 'vault-door',
  'chasm', 'ice', 'rune-seal', 'drift', 'prayer-flags', 'hush', 'ice-blocks', 'frozen-door',
  // M6: the Gloomfen's gate looks, its two hard locks, and its props
  'toll-bar', 'leech-ford', 'ward-gate', 'hung-lanterns', 'hag-fence', 'barge-planks', 'water-gate', 'choir-screen', 'blackwater', 'witch-ward',
  'wreck', 'marsh-lights', 'black-barge', 'lantern', 'sleeping-child', 'crane', 'diving-bell', 'sealed-chest', 'barge', 'bell', 'sleeper',
  // M7: the Hearth Below's gate look and its props
  'hollow-gate', 'vault-stair', 'vault-boxes', 'vault-boxes-open', 'sleeper-first', 'worldforge', 'great-anvil',
  // Thareia (T2): the node under Fawnrest, and the slab pushed off the stair down to it
  'node', 'open-slab']);
// states each kind draws (the first is the default); any other state string falls back to the default
export const OBJECT_STATES = Object.freeze({
  chest: ['closed', 'open', 'locked', 'sealed'], hearth: ['lit', 'cold'], gate: ['closed', 'open'], chain: ['closed', 'post', 'open'],
  crownwall: ['closed', 'open'], thornwall: ['closed', 'open'], bramble: ['closed', 'open'], boulder: ['closed', 'open'],
  'ford-ice': ['ice', 'stream', 'roots'], pedestal: ['unlit', 'lit'], board: ['bounties', 'ladder'], sign: ['post', 'stone', 'plaque', 'cradle', 'cradle-full', 'monolith', 'spire', 'bell-rope', 'throne', 'frozen-monk', 'altar', 'ward-stone', 'ward-stone-dark', 'bootprints',
    'chain', 'chair-tree', 'chair-sun', 'chair-anvil', 'chair-lantern', 'heart-step'],
  bellframe: ['empty', 'rung'], lookout: ['closed'], rope: ['closed', 'open'], deer: ['graze', 'alert'], ichor: ['closed'],
  door: ['closed', 'open'], table: ['closed'], 'tally-seal': ['closed', 'open'], 'barred-gate': ['closed', 'open'], 'rot-knot': ['closed', 'open'], stream: ['closed'],
  'dune-glass': ['closed', 'open'], mirage: ['closed', 'open'], quicksand: ['closed', 'open'], 'vault-seal': ['closed', 'open'], 'glass-spire': ['closed'], 'vault-door': ['closed', 'open'],
  chasm: ['closed', 'open'], ice: ['closed', 'open'], 'rune-seal': ['closed', 'open'], drift: ['closed', 'open'], 'prayer-flags': ['closed'], hush: ['closed'],
  'ice-blocks': ['closed', 'open'], 'frozen-door': ['closed', 'open'],
  'toll-bar': ['closed', 'open'], 'leech-ford': ['closed', 'open'], 'ward-gate': ['closed', 'open'], 'hung-lanterns': ['closed', 'open'], 'hag-fence': ['closed', 'open'],
  'barge-planks': ['closed', 'open'], 'water-gate': ['closed', 'open'], 'choir-screen': ['closed', 'open'], blackwater: ['closed', 'open'], 'witch-ward': ['closed', 'open'],
  wreck: ['closed'], 'marsh-lights': ['closed'], 'black-barge': ['closed'], lantern: ['closed'], 'sleeping-child': ['closed'], crane: ['closed'], 'diving-bell': ['closed'],
  'sealed-chest': ['closed'], barge: ['closed'], bell: ['closed'], sleeper: ['closed'],
  'hollow-gate': ['closed', 'open'], 'vault-stair': ['closed'], 'vault-boxes': ['closed'], 'vault-boxes-open': ['closed'], 'sleeper-first': ['closed'],
  worldforge: ['closed'], 'great-anvil': ['closed'],
  node: ['white', 'gold'], 'open-slab': ['closed'], // Thareia (T2): the node is white-hot until c1-node-cooled, then gold
});
// hearthfire id -> look (pass { id } to objectSprite('hearth', state, { id }))
export const HEARTH_LOOKS = Object.freeze({
  'hearthstone-keep': 'hall', 'milestone-fire': 'ring', thornhollow: 'ring', 'den-mouth': 'ring', 'mossfall-cairn': 'cairn', 'mosswatch-fire': 'brazier',
  'hindwood-cairn': 'cairn', 'fawnrest-stone': 'stone', 'eldergrove-hearth': 'ring', 'last-green-coal': 'coal',
  waystone: 'sandring', 'spire-hearth': 'sunbrazier', 'dust-cairn': 'sandcairn', pithead: 'brazier', 'shaft-lamp': 'lamp', 'well-fire': 'sandring', 'last-watchfire': 'watch',
  'pass-shrine': 'shrine', 'veil-hearth': 'cloister', 'stair-cairn': 'snowcairn', 'thanes-hearth': 'dwarfhall', 'deeps-forge': 'furnace', 'stormwatch-fire': 'beacon', 'frost-cairn': 'snowcairn',
  'camp-fire': 'painted', // M5: the Last Camp's ring of stones is in the map's painting; the sprite is only its fire
  // M6: the Gloomfen's eight
  'reed-shrine': 'reedshrine', 'willow-hearth': 'mootring', 'toll-lamp': 'tollpost', 'stilt-hearth': 'firebasket', 'fen-cairn': 'fencairn',
  'bell-hearth': 'bellbowl', 'wreck-fire': 'painted', 'flats-beacon': 'painted', // batch 3: the beached hull and the beacon are in their maps' paintings
  // M7: the Hearth Below's two: the Under-Coal (a coal the size of a cart) and the Chain Fire (a brazier hung from a broken chain)
  'under-coal': 'undercoal', 'chain-fire': 'chainfire',
  // Thareia (T1): the docks' brazier under the mooring tower (a fire basket, as Bogmire's), Thornhollow's ring
  'docks-lantern': 'firebasket', 'th-hearth': 'ring',
  // Thareia (T2): Chapter 1's nine, as the old Wilds fires in the same spots (the Thornway Stone keeps the den-mouth's
  // ring; Garret's kitchen hearth is a hearth under a mantel; the pilgrims' camp is a ring of stones)
  'th-tw-hearth': 'ring', 'th-eg-hearth': 'ring', 'th-hr-coal': 'coal', 'th-mf-cairn': 'cairn', 'th-mw-hearth': 'hall',
  'th-mw-fire': 'brazier', 'th-hw-cairn': 'cairn', 'th-fr-camp': 'ring', 'th-fr-stone': 'stone',
});
const OBJ_SIZE = { gate: [16, 24], crownwall: [16, 24], thornwall: [16, 24], pedestal: [16, 24], board: [16, 24], bellframe: [16, 24], lookout: [16, 32], door: [16, 24], 'barred-gate': [16, 24] };
Object.assign(OBJ_SIZE, { 'dune-glass': [16, 24], 'vault-seal': [16, 24], 'glass-spire': [16, 24], 'vault-door': [16, 24] });
Object.assign(OBJ_SIZE, { ice: [16, 24], 'rune-seal': [16, 24], 'prayer-flags': [16, 24], hush: [112, 64], 'ice-blocks': [16, 24], 'frozen-door': [16, 24] });
Object.assign(OBJ_SIZE, { 'toll-bar': [16, 24], 'leech-ford': [16, 24], 'ward-gate': [16, 24], 'hung-lanterns': [16, 24], 'hag-fence': [16, 24], 'barge-planks': [16, 24],
  'water-gate': [16, 24], 'choir-screen': [16, 24], blackwater: [16, 20], 'witch-ward': [16, 24], wreck: [32, 20], 'marsh-lights': [16, 24], 'black-barge': [64, 36],
  lantern: [16, 32], crane: [32, 40], 'diving-bell': [16, 32], barge: [48, 28], bell: [16, 32], sleeper: [96, 56] }); // M6
Object.assign(OBJ_SIZE, { 'hollow-gate': [16, 24], 'vault-boxes': [16, 20], 'vault-boxes-open': [16, 20], 'sleeper-first': [240, 152], worldforge: [112, 240],
  'great-anvil': [48, 40] }); // M7
Object.assign(OBJ_SIZE, { node: [48, 64], 'open-slab': [16, 16] }); // Thareia (T2)
// M7: a big prop whose foot is not at its bottom edge (the First Sleeper lies round its foot, in the middle of its hollow)
const FOOT_UP = { 'sleeper-first': 44 };
const OBJ_STATE_SIZE = { 'sign:monolith': [16, 24], 'sign:spire': [16, 32], 'sign:bell-rope': [16, 24], 'sign:throne': [16, 24], 'sign:frozen-monk': [16, 24] };
Object.assign(OBJ_STATE_SIZE, { 'sign:ward-stone': [16, 24], 'sign:ward-stone-dark': [16, 24] }); // M6
Object.assign(OBJ_STATE_SIZE, { 'sign:chain': [16, 24], 'sign:chair-tree': [24, 32], 'sign:chair-sun': [24, 32], 'sign:chair-anvil': [24, 32], 'sign:chair-lantern': [24, 32] }); // M7
const TALL_HEARTH = new Set(['hall', 'sunbrazier', 'lamp', 'watch', 'shrine', 'cloister', 'dwarfhall', 'furnace', 'beacon']);
const ANIM = new Set(['crownwall', 'ichor', 'stream']);
const SUN_ANIM = new Set(['mirage', 'quicksand', 'vault-seal']); // two frames while shut
const IRON_ANIM = new Set(['chasm', 'rune-seal', 'drift', 'prayer-flags', 'hush']); // M5: two frames while shut
const flame = (F, cx, base, f, s = 1, mat = 'ember') => {
  const fl = f ? [[cx + .6 * s, base - 6.4 * s], [cx + 2.6 * s, base - 2.6 * s], [cx + 2.2 * s, base], [cx - 2.2 * s, base], [cx - 2.4 * s, base - 2.4 * s]] : [[cx - .6 * s, base - 6.8 * s], [cx + 2.4 * s, base - 2.2 * s], [cx + 2.2 * s, base], [cx - 2.2 * s, base], [cx - 2.6 * s, base - 3 * s]];
  F.add({ mat, prof: 'round', bw: 1.6 * s, grp: 'flame', noShadow: true, shapes: [P(fl)], tex: q => (q.y > base - 2.4 * s ? .9 : .2) + (f ? .3 : 0) });
  F.add({ mat: mat === 'ember' ? 'amber' : mat, prof: 'flat', grp: 'core', noShadow: true, noOutline: true, shapes: [E([cx, base - 1.6 * s], 1.1 * s, 1.5 * s)], tex: () => 1.2 });
};
const logs = (F, cx, y, charred) => F.add({ mat: charred ? 'rot' : 'wood', prof: 'round', bw: .8, grp: 'logs', shapes: [C([cx - 4, y + .6], [cx + 3.6, y - 1], .95), C([cx - 3.6, y - 1], [cx + 4, y + .6], .95)] });
function hearthParts(F, look, lit, f) {
  if (GLOOM_HEARTH.has(look)) return gloomHearth(F, look, lit, f); // M6
  if (BELOW_HEARTH.has(look)) return belowHearth(F, look, lit, f); // M7
  if (look === 'painted') { // M5: the fire alone, in the middle of a painted ring a tile above the entity (16 x 32)
    logs(F, 8, 10.4, !lit);
    if (lit) flame(F, 8, 9.8, f, 1.1, 'ember'); else F.add({ mat: 'clothGrey', prof: 'round', bw: .8, grp: 'ash', shapes: [E([8, 11], 3.8, 1.3)] });
    return;
  }
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
  // M5: the Ironspire Hearthfires
  if (look === 'shrine') { // the Pass Shrine: a way-shrine of fitted stone under a slate roof, a coal in its niche (16 x 24)
    F.add({ mat: 'w.crag', prof: 'bevel', bw: 1, grp: 'base', shapes: [RECT(2.4, 17, 13.6, 23.6)], tex: q => (q.y === 20 ? -1 : 0) });
    F.add({ mat: 'w.crag', prof: 'round', bw: 1.2, grp: 'sides', shapes: [RECT(2.4, 8.4, 4.8, 17.2), RECT(11.2, 8.4, 13.6, 17.2)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'niche', shapes: [RECT(4.8, 9, 11.2, 17)] });
    F.add({ mat: 'w.slate', prof: 'bevel', bw: 1, grp: 'roof', shapes: [P([[.4, 9.4], [8, 2.6], [15.6, 9.4], [15.6, 10.8], [.4, 10.8]])], tex: q => (q.y % 2 ? -.6 : 0) });
    F.add({ mat: 'w.snow', prof: 'round', bw: .8, grp: 'snow', shapes: [P([[2, 8.2], [8, 2.6], [14, 8.2], [8, 4.6]])] });
    if (lit) flame(F, 8, 16.4, f, .75); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'coal', shapes: [E([8, 16.2], 2, .9)] });
    return;
  }
  if (look === 'cloister') { // the Cloister Fire: a bronze fire-bowl on a pale stone plinth (16 x 24)
    F.add({ mat: 'w.limestone', prof: 'bevel', bw: 1, grp: 'plinth', shapes: [RECT(3, 18, 13, 23.6)] });
    F.add({ mat: 'w.limestone', prof: 'round', bw: 1.6, grp: 'pillar', shapes: [RECT(5.6, 10.6, 10.4, 18.4)], tex: q => (q.x === 7 ? .4 : 0) });
    F.add({ mat: 'bronze', prof: 'round', bw: 1.2, grp: 'bowl', shapes: [P([[2.2, 7.4], [13.8, 7.4], [11.6, 11.2], [4.4, 11.2]])] });
    if (lit) flame(F, 8, 7.8, f, 1.1); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 7.6], 3.8, 1)] });
    return;
  }
  if (look === 'snowcairn') { // the Stair Cairn and the Frost Cairn: grey stones heaped, snow on their shoulders
    F.add({ mat: 'w.crag', prof: 'round', bw: 1.6, grp: 'stones', shapes: [E([8, 13.2], 6.4, 2.6), E([5.6, 10.6], 3, 2), E([10.6, 10.8], 3, 2), E([8, 8.6], 3.2, 1.9)] });
    F.add({ mat: 'w.snow', prof: 'round', bw: .8, grp: 'snow', shapes: [E([5, 9.4], 2, .8), E([11.2, 9.6], 1.8, .7), E([3.6, 12], 1.4, .6)] });
    if (lit) flame(F, 8, 7.8, f, .9); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 7.6], 2.2, .9)] });
    return;
  }
  if (look === 'dwarfhall') { // the Thane's Hearth: a granite mantel banded with iron, a rune over it, fire-dogs (16 x 24)
    F.add({ mat: 'w.hewn', prof: 'bevel', bw: 1.2, grp: 'mantel', shapes: [RECT(.4, 3, 15.6, 23.6)], cuts: [RECT(3.2, 9.4, 12.8, 23.8)], tex: q => (q.y % 5 === 0 ? -.8 : 0) });
    F.add({ mat: 'iron', prof: 'bevel', bw: .6, grp: 'band', shapes: [RECT(.2, 6.2, 15.8, 8)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'back', shapes: [RECT(3.2, 9.4, 12.8, 23.6)] });
    F.add({ mat: lit ? 'amber' : 'iron', prof: 'flat', grp: 'rune', noShadow: true, noOutline: true, shapes: [C([8, 3.6], [8, 5.6], .45), C([6.4, 4.2], [9.6, 5], .4)], tex: () => (lit ? -.8 : -1) });
    F.add({ mat: 'blackiron', prof: 'round', bw: .6, grp: 'dogs', shapes: [C([4.6, 22.8], [4.6, 18.4], .6), C([11.4, 22.8], [11.4, 18.4], .6)] });
    logs(F, 8, 21.8, !lit);
    if (lit) flame(F, 8, 21.2, f, 1.2); else F.add({ mat: 'clothGrey', prof: 'round', bw: .8, grp: 'ash', shapes: [E([8, 22.4], 3.6, 1.2)] });
    return lit ? 'halo' : undefined;
  }
  if (look === 'furnace') { // the Deeps Furnace: a brick furnace, its arch dark and full of ash until it is lit again (16 x 24)
    F.add({ mat: 'w.brick', prof: 'round', bw: 2, grp: 'dome', shapes: [P([[.8, 23.6], [1, 11], [3, 6.6], [8, 5], [13, 6.6], [15, 11], [15.2, 23.6]]), RECT(5.8, .8, 10.2, 6)], tex: q => ((q.y & 1) === 0 || ((q.x + ((q.y >> 1) & 1) * 2) & 3) === 0 ? -1.2 : q.y < 9 ? -.6 : 0) });
    F.add({ mat: 'w.char', prof: 'bevel', bw: .6, grp: 'lip', shapes: [RECT(5.2, .2, 10.8, 1.8)] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', shapes: [P([[4, 23.6], [4, 16], [5.6, 13.2], [8, 12.4], [10.4, 13.2], [12, 16], [12, 23.6]])] });
    F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'grate', noShadow: true, shapes: [C([4, 20.6], [12, 20.6], .4)] });
    if (lit) { flame(F, 8, 22.8, f, 1); return 'halo'; }
    F.add({ mat: 'clothGrey', prof: 'round', bw: .8, grp: 'ash', shapes: [E([8, 22.6], 3.4, 1)] });
    return;
  }
  if (look === 'beacon') { // the Watch Fire: an iron fire-basket on a strapped timber post (16 x 24)
    F.add({ mat: 'w.timber', prof: 'round', bw: 1, grp: 'post', shapes: [RECT(6.4, 9.6, 9.6, 23.6), P([[4, 23.6], [6.4, 19], [9.6, 19], [12, 23.6]])], tex: q => (q.y % 4 === 0 ? -1 : 0) });
    F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'straps', noShadow: true, shapes: [RECT(6.2, 13, 9.8, 14), RECT(6.2, 17, 9.8, 18)] });
    F.add({ mat: 'blackiron', prof: 'round', bw: .6, grp: 'basket', shapes: [C([2.8, 4.2], [5.2, 9.8], .55), C([13.2, 4.2], [10.8, 9.8], .55), C([8, 4.4], [8, 9.8], .5), C([3, 6.6], [13, 6.6], .45), C([4.4, 9.6], [11.6, 9.6], .55)] });
    logs(F, 8, 8.6, !lit);
    if (lit) flame(F, 8, 7.6, f, 1.05); else F.add({ mat: 'w.ash', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8, 7.8], 3.4, .9)] });
    return;
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
      if (GLOOM_SIGNS.has(st)) return gloomSign(F, st, f); // M6
      if (BELOW_SIGNS.has(st)) return belowSign(F, st, f); // M7
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
      if (st === 'bell-rope') { // Peak's Veil's bell rope: down from the tower, a fat red-and-white sally, the tail coiled on the floor
        F.add({ mat: 'string', prof: 'round', bw: .6, grp: 'rope', shapes: [C([8, -1], [8.2, 18.6], .8), C([8.2, 18.6], [11.6, 21.4], .7), E([7.8, 21.6], 3.4, 1.4)], cuts: [E([7.8, 21.6], 1.6, .5)], tex: q => ((q.y + (q.x & 1)) % 3 === 0 ? -1.2 : 0) });
        F.add({ mat: 'paintRed', prof: 'round', bw: 1, grp: 'sally', shapes: [C([8.1, 7.6], [8.2, 14.6], 1.9)], tex: q => ((q.y >> 1) % 2 ? { m: 'clothWhite', dd: -.2 } : .2) });
        return;
      }
      if (st === 'altar') { // the drowned chapel's altar: a stone block under a rime-white cloth, frost on its step
        F.add({ mat: 'w.crag', prof: 'bevel', bw: 1, grp: 'step', shapes: [RECT(.6, 12.4, 15.4, B + .4)] });
        F.add({ mat: 'w.crag', prof: 'bevel', bw: 1.2, grp: 'block', shapes: [RECT(2, 4.6, 14, 13.4)], tex: q => (q.y === 9 ? -1 : 0) });
        F.add({ mat: 'clothWhite', prof: 'round', bw: .8, grp: 'cloth', shapes: [P([[1.4, 4], [14.6, 4], [14.6, 6.2], [12.4, 10.4], [11.2, 6.4], [4.8, 6.4], [3.6, 10.4], [1.4, 6.2]])], tex: q => (q.x % 3 === 0 ? -.6 : 0) });
        F.add({ mat: 'w.ice', prof: 'flat', grp: 'frost', noShadow: true, noOutline: true, shapes: [C([3, 14.2], [7, 14.6], .6), C([10.6, 14.4], [13, 14.2], .5)], tex: () => .6 });
        return;
      }
      if (st === 'throne') { // the Thane's chair: one block of black granite, iron-studded, a new red cushion
        F.add({ mat: 'blackiron', prof: 'bevel', bw: 1.2, grp: 'back', shapes: [RECT(2.4, 1.4, 13.6, 17)], tex: q => (q.y === 4 || q.x === 8 ? -.8 : 0) });
        F.add({ mat: 'amber', prof: 'flat', grp: 'rune', noShadow: true, noOutline: true, shapes: [C([8, 5.4], [8, 10.4], .45), C([6, 6.6], [10, 9.2], .42)], tex: () => -1.4 });
        F.add({ mat: 'blackiron', prof: 'bevel', bw: 1, grp: 'seat', shapes: [RECT(1, 14.6, 15, B + .4)] });
        F.add({ mat: 'robeRed', prof: 'round', bw: 1.2, grp: 'cushion', shapes: [RECT(2.8, 13.2, 13.2, 16.2)], tex: q => (q.x === 8 ? -.8 : 0) });
        F.add({ mat: 'steel', prof: 'round', bw: .4, grp: 'studs', noShadow: true, shapes: [O([3.6, 3], .5), O([12.4, 3], .5), O([2.6, 19.4], .5), O([13.4, 19.4], .5)] });
        return;
      }
      if (st === 'frozen-monk') { // a monk of Peak's Veil frozen upright in the ice, hands folded, hood up
        F.add({ mat: 'w.habit', prof: 'round', bw: 1.4, grp: 'monk', shapes: [P([[4.6, B], [5.2, 12], [6.4, 8.6], [9.6, 8.6], [10.8, 12], [11.4, B]]), O([8, 7], 2.8)], tex: q => (q.y > 18 && q.x % 3 === 0 ? -.8 : 0) });
        F.add({ mat: 'skinAsh', prof: 'round', bw: .8, grp: 'face', shapes: [E([8, 7.8], 1.7, 1.6)] });
        F.add({ mat: 'skinAsh', prof: 'round', bw: .6, grp: 'hands', shapes: [E([8, 13.4], 1.8, 1)] });
        F.add({ mat: 'w.glacier', prof: 'flat', grp: 'ice', noShadow: true, shapes: [P([[1.6, B + .4], [1.8, 5.6], [4.6, 2], [10.4, 1.2], [14, 4.4], [14.4, B + .4]])], cuts: [P([[4.4, B], [5, 12], [6.2, 8.4], [5.8, 5], [8, 3.8], [10.2, 5], [9.8, 8.4], [11, 12], [11.6, B]])], tex: q => ((q.x + q.y) % 6 === 0 ? .4 : -.9) });
        F.add({ mat: 'w.ice', prof: 'flat', grp: 'glaze', noShadow: true, noOutline: true, shapes: [C([6, 17], [7.2, 11], .5), C([9.6, 5.4], [10.4, 3.6], .45)], tex: () => .4 });
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
  // M5: the Ironspire's locks and props
  if (kind === 'chasm') { // a gap in the rock that the way crosses east-west (as P2's maps lay it): the void runs on through it north
    // and south, the wind coming up it (2 frames). The rock look is 16x25 with its foot 8 px from the bottom, so it reaches 2 px
    // into the tile above and 7 px into the one below, over the void's lip and far face there. With look 'floes' (Frostmere's)
    // it is black water and broken floes, one tile. Every piece fills its tile edge to edge, so an area joins east-west. Open,
    // planks are lashed across it (floes: the floes have jammed together into a crossing).
    const floes = o.look === 'floes', y0 = floes ? 0 : 2, Y = y => y + y0, open = st === 'open';
    if (floes) F.add({ mat: 'w.frostwater', prof: 'flat', grp: 'deep', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [RECT(-1, -1, 17, H + 1)], tex: q => -2.62 + (hash(q.x, q.y, 61 + f) < .06 ? .8 : 0) });
    else F.add({ mat: 'dark', prof: 'flat', grp: 'deep', noShadow: true, noOutline: true, lo: 1, hi: 1, shapes: [RECT(-1, -1, 17, H + 1)], tex: () => -3 });
    if (!open && floes) { // broken floes drifting east (2 frames)
      const d = f ? 1 : 0, plates = [[[1.2, 3.4], [6.8, 2.6], [8, 5.6], [5.6, 7.4], [1.6, 6.8]], [[9.4, 8.8], [14.4, 8], [15.4, 11.4], [11.2, 13.2], [8.8, 11.8]], [[2.4, 11.2], [5.8, 10.8], [6.2, 13.4], [2.8, 13.8]]];
      F.add({ mat: 'w.snow', prof: 'bevel', bw: .8, grp: 'floes', shapes: plates.map(pts => P(pts.map(([x, y]) => [x + d, y]))), tex: q => (hash(q.x - d, q.y, 91) < .08 ? -1 : -.3) });
    }
    if (!open && !floes) F.add({ mat: 'w.snow', prof: 'flat', grp: 'wind', noShadow: true, noOutline: true, shapes: (f ? [[3, 9, 4], [8.6, 14, 8], [13, 6.4, 1.6]] : [[3.4, 12, 7], [9, 10, 5], [12.6, 15, 10.4]]).map(([x, ya, yb]) => C([x, Y(ya)], [x + .6, Y(yb)], .45)), tex: () => -2.4 });
    if (open && floes) { // the floes jammed edge to edge into a crossing
      F.add({ mat: 'w.snow', prof: 'bevel', bw: .9, grp: 'jam', shapes: [P([[-1, 4.4], [6.4, 3.6], [7.4, 9.6], [-1, 10.2]]), P([[7.2, 3.8], [17, 4.6], [17, 10], [8.2, 9.4]]), P([[-1, 10.8], [9.4, 10], [8.6, 15.6], [-1, 15.4]]), P([[10, 10.2], [17, 10.6], [17, 15.4], [9.2, 15.6]])], tex: q => (hash(q.x, q.y, 90) < .1 ? -.8 : -.3) });
    }
    if (open && !floes) { // planks lashed across the gap, a rope along each side
      F.add({ mat: 'wood', prof: 'bevel', bw: .7, grp: 'planks', shapes: [RECT(-1, Y(4.6), 17, Y(7.6)), RECT(-1, Y(8.2), 17, Y(11.2)), RECT(-1, Y(11.8), 17, Y(14.8))], tex: q => ((q.x + (q.y >> 2) * 5) % 9 === 0 ? -1 : 0) });
      F.add({ mat: 'string', prof: 'round', bw: .4, grp: 'lashing', noShadow: true, shapes: [C([2.2, Y(4.4)], [2.2, Y(15)], .5), C([13.8, Y(4.4)], [13.8, Y(15)], .5), C([-1, Y(3.4)], [17, Y(3.4)], .4)] });
    }
    return;
  }
  if (kind === 'ice') { // a wall of old blue ice, bubbles frozen in it; it joins its neighbours. Open, it has melted to a pool and shards
    if (st === 'open') {
      F.add({ mat: 'w.frostwater', prof: 'flat', grp: 'pool', noShadow: true, shapes: [E([8, B - 1.6], 6.6, 1.8)], tex: q => ((q.x + q.y) % 4 === 0 ? -1.2 : -2) });
      F.add({ mat: 'w.glacier', prof: 'bevel', bw: .6, grp: 'shards', shapes: [spike([3.2, B - 1.2], -2.4, 2.6, .8), spike([12.8, B - 1], -.8, 2.2, .7)] });
      return;
    }
    F.add({ mat: 'w.glacier', prof: 'round', bw: 3, grp: 'mass', shapes: [P([[-1, B + .5], [-1, 8.6], [1.6, 4.8], [5.2, 3.4], [8.6, 1.6], [12.2, 3], [15.4, 4.8], [17, 8], [17, B + .5]])], tex: q => -1.1 + (q.y > B - 2 ? -.6 : 0) + ((q.x * 2 + q.y) % 11 === 0 ? .6 : 0) });
    F.add({ mat: 'w.glacier', prof: 'round', bw: 2, grp: 'lumps', shapes: [E([4.4, 15.2], 3.6, 3.4), E([11.6, 10.6], 3.8, 3.4)], tex: () => -.7 });
    F.add({ mat: 'w.snow', prof: 'flat', grp: 'bubbles', noShadow: true, noOutline: true, shapes: [O([5.5, 9.5], .6), O([10.5, 16.5], .7), O([12.5, 6.5], .5), O([3.5, 18.5], .5)], tex: () => -.2 });
    F.add({ mat: 'w.ice', prof: 'flat', grp: 'crack', noShadow: true, noOutline: true, shapes: [C([7.5, 4.5], [6, 10.5], .5), C([6, 10.5], [8, 14.5], .5)], tex: () => 1 });
    F.add({ mat: 'w.snow', prof: 'flat', grp: 'cap', noShadow: true, shapes: [P([[1.4, 5], [5.2, 3.2], [8.6, 1.4], [12.2, 2.8], [15.2, 4.6], [12, 4.2], [8.6, 2.8], [5, 4.4]])], tex: () => .4 });
    return 'halo';
  }
  if (kind === 'rune-seal') { // a door-slab of dwarf granite, its runes cut deep and filled with iron (they glint, then glow, as
    // they read you); the slabs join in a row. Open, the slab has sunk into the floor and the way is dark
    F.add({ mat: 'w.hewn', prof: 'bevel', bw: 1, grp: 'lintel', shapes: [RECT(-1, 1.6, 17, 4.6)], tex: q => (q.x === 0 ? -1 : 0) });
    if (st === 'open') {
      F.add({ mat: 'dark', prof: 'flat', grp: 'way', shapes: [RECT(-1, 4.6, 17, B + .5)], tex: q => (q.y > 17 ? -1 : 0) });
      F.add({ mat: 'w.hewn', prof: 'bevel', bw: .7, grp: 'sunk', shapes: [RECT(-1, B - 1.6, 17, B + .5)] });
      return;
    }
    F.add({ mat: 'w.hewn', prof: 'bevel', bw: 1, grp: 'slab', shapes: [RECT(-1, 4.6, 17, B + .5)], tex: q => (q.x === 0 ? { m: 'dark', dd: -1.4 } : q.y % 6 === 5 ? -.5 : 0) });
    const R = [[[8, 7.4], [8, 19.6]], [[8, 10], [11.4, 7.6]], [[8, 13], [4.6, 15.8]], [[8, 16.4], [11, 18.8]]].map(([a, b]) => C(a, b, .7));
    F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'runes', noShadow: true, shapes: R, tex: () => (f ? .6 : 0) });
    if (f) F.add({ mat: 'amber', prof: 'flat', grp: 'glow', noShadow: true, noOutline: true, shapes: R.map(r => C(r.a, r.b, .3)), tex: () => -1.2 });
    return 'halo';
  }
  if (kind === 'ice-blocks') { // gate look: sledges lashed across the way, stacked with blocks of lake-ice; the pieces join along
    // the way's width. Open, the sledges are dragged aside: one runner and loose blocks at the edge
    const ice = q => (hash(q.x, q.y, 310) < .07 ? { m: 'w.snow', dd: -.2 } : (q.x * 2 + q.y) % 9 === 0 ? -.9 : -.4);
    if (st === 'open') {
      F.add({ mat: 'wood', prof: 'bevel', bw: .6, grp: 'runner', shapes: [RECT(-1, B - 2.2, 4.4, B - .6)] });
      F.add({ mat: 'w.ice', prof: 'bevel', bw: 1, grp: 'blocks', shapes: [RECT(-.6, B - 8.4, 3.8, B - 2.2), P([[11.6, B - .6], [12.6, B - 3.8], [15.6, B - 3.2], [15.2, B - .4]])], tex: ice });
      return;
    }
    F.add({ mat: 'wood', prof: 'bevel', bw: .7, grp: 'runners', shapes: [RECT(-1, B - 2.4, 17, B - .6), RECT(-1, 13.2, 17, 14.6)], tex: q => (q.x % 5 === 0 ? -1 : 0) });
    F.add({ mat: 'w.ice', prof: 'bevel', bw: 1.2, grp: 'blocks', shapes: [RECT(-.4, 14.6, 7.6, B - 2.4), RECT(8.2, 14.6, 16.4, B - 2.4), RECT(-.2, 7.2, 5.4, 13.2), RECT(5.8, 6.6, 11, 13.2), RECT(11.4, 7.6, 16.2, 13.2), RECT(3.6, 1.8, 10.6, 6.6)], tex: ice });
    F.add({ mat: 'w.snow', prof: 'round', bw: .8, grp: 'caps', shapes: [E([7.1, 2.4], 3.6, 1), E([2.6, 7.6], 2.4, .8), E([13.8, 8], 2.2, .8)], tex: () => .4 });
    F.add({ mat: 'string', prof: 'round', bw: .4, grp: 'lashing', noShadow: true, shapes: [C([-1, 10.6], [17, 10.2], .45), C([2, 20.4], [14.4, 15.6], .4)] });
    return 'halo';
  }
  if (kind === 'frozen-door') { // gate look: a chapel door of black oak under a skin of old ice, iron-banded, icicles hanging from the
    // lintel; the leaves join east-west into one door. Open, the ice has shattered and the doorway stands dark, shards on the sill
    F.add({ mat: 'granite', prof: 'bevel', bw: 1, grp: 'lintel', shapes: [RECT(-1, 1.4, 17, 4.4)], tex: q => (q.y === 2 ? .6 : 0) });
    if (st === 'open') {
      F.add({ mat: 'dark', prof: 'flat', grp: 'way', shapes: [RECT(-1, 4.4, 17, B + .5)], tex: q => (q.y > 18 ? -.6 : 0) });
      F.add({ mat: 'w.glacier', prof: 'bevel', bw: .5, grp: 'shards', shapes: [spike([2.4, B - .4], -2.2, 3, .9), spike([7.6, B - .2], -1.3, 2.4, .8), spike([13.4, B - .4], -.8, 3.2, .9)] });
      F.add({ mat: 'w.glacier', prof: 'bevel', bw: .4, grp: 'icicles', shapes: [3, 9, 14].map((x, i) => P([[x - .8, 4.2], [x + .8, 4.2], [x, 5.8 + i % 2]])) });
      return;
    }
    F.add({ mat: 'bogwood', prof: 'bevel', bw: .8, grp: 'leaves', shapes: [RECT(-1, 4.4, 17, B + .5)], tex: q => (q.x % 4 === 3 ? -1.2 : 0) });
    F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'bands', shapes: [C([-1, 8.6], [17, 8.6], .7), C([-1, 17.4], [17, 17.4], .7)] });
    F.add({ mat: 'w.glacier', prof: 'bevel', bw: 1.4, grp: 'glaze', shapes: [P([[-1, 11], [4, 9.6], [9, 11.2], [13.4, 9.8], [17, 10.6], [17, B + .5], [-1, B + .5]]), E([12, 6.8], 2.6, 1.8)], tex: q => (hash(q.x, q.y, 320) < .1 ? { m: 'w.snow', dd: -.4 } : (q.x + q.y * 2) % 11 === 0 ? .3 : -1) });
    F.add({ mat: 'w.glacier', prof: 'bevel', bw: .5, grp: 'icicles', shapes: [1.6, 4.6, 7.6, 10.6, 13.6].map((x, i) => P([[x - .9, 4.2], [x + .9, 4.2], [x, 7 + (i % 3) * 1.4]])) });
    F.add({ mat: 'w.snow', prof: 'flat', grp: 'rime', noShadow: true, noOutline: true, shapes: [RECT(-1, B - 1.4, 17, B + .5)], tex: q => (q.x % 3 ? -.6 : .2) });
    return 'halo';
  }
  if (kind === 'drift') { // on a drift's snow: a wind-cut cornice and glitter; open, a trench of firm boot prints
    if (st === 'open') {
      F.add({ mat: 'w.snow', prof: 'flat', grp: 'trench', noShadow: true, noOutline: true, shapes: [RECT(4.6, -1, 11.4, 17)], tex: q => (q.x === 5 || q.x === 10 ? -.2 : -1.3) + bayer(q.x, q.y) * .3 });
      F.add({ mat: 'w.snow', prof: 'flat', grp: 'prints', noShadow: true, noOutline: true, shapes: [[6.4, 2], [9.4, 6], [6.4, 10], [9.4, 14]].map(([x, y]) => E([x, y], .9, 1.4)), tex: () => -2 });
      return;
    }
    F.add({ mat: 'w.snow', prof: 'round', bw: 1.4, grp: 'cornice', shapes: [P([[-1, 9.4], [3, 6.6], [7.4, 5.8], [11.6, 6.8], [17, 9], [17, 10.4], [12, 9.2], [7.4, 8.6], [3, 9.4], [-1, 11]])], tex: q => (q.y < 7.6 ? .8 : -.4) });
    F.add({ mat: 'w.snow', prof: 'flat', grp: 'lee', noShadow: true, noOutline: true, shapes: [P([[-1, 11], [3, 9.4], [7.4, 8.6], [12, 9.2], [17, 10.4], [17, 12], [11, 11], [6, 11.4], [-1, 12.6]])], tex: () => -1.6 });
    F.add({ mat: 'w.snow', prof: 'flat', grp: 'glitter', noShadow: true, noOutline: true, shapes: [f ? O([4.5, 3.5], .6) : O([12.5, 13.5], .6), f ? O([13.5, 4.5], .5) : O([2.5, 14.5], .5)], tex: () => 2 });
    return;
  }
  if (kind === 'prayer-flags') { // a pole with a line of prayer flags run down to a stake, snapping in the wind (2 frames)
    F.add({ mat: 'w.timber', prof: 'round', bw: .6, grp: 'pole', shapes: [C([3.4, B + .2], [3.4, 1.6], .75), O([3.4, 1.2], .9)] });
    F.add({ mat: 'string', prof: 'flat', grp: 'cord', noShadow: true, noOutline: true, shapes: [C([3.8, 2.2], [9, 10.6], .35), C([9, 10.6], [14.6, B - 1.8], .35)] });
    F.add({ mat: 'wood', prof: 'round', bw: .5, grp: 'stake', shapes: [C([14.8, B - 2.4], [14.8, B + .2], .6)] });
    ['paintRed', 'clothWhite', 'clothBlue', 'gold', 'hoodGreen'].forEach((m, i) => {
      const t = (i + .5) / 5.2, x = 3.8 + t * 10.8, y = 2.2 + t * (B - 4) + Math.sin(t * Math.PI) * 1, fl = (f + i) % 2 ? 1 : 0;
      F.add({ mat: m, prof: 'flat', grp: 'flag' + i, shapes: [P([[x - 1.2, y], [x + 1.3, y + .5], [x + 1.3 + fl * .6, y + 3.6], [x - 1.2 + fl * .8, y + 3.2]])], tex: q => (q.y % 2 ? 0 : .5) });
    });
    return;
  }
  if (kind === 'hush') { // Hush asleep under the floor (112 x 64): a vast body curled on itself, a great eye shut, its heart glowing faintly
    // and beating (2 frames). objectSprite dithers the dark away toward the edges, so the floor shows through
    const at = t => { const a = Math.PI * (-.15 + t * 1.55); return [58 + Math.cos(a) * 40, 34 + Math.sin(a) * 15]; };
    const tube = []; for (let i = 0; i <= 26; i++) tube.push(O(at(i / 26), 3 + i / 26 * 10));
    F.add({ mat: 'w.hush', prof: 'flat', grp: 'under', noOutline: true, noShadow: true, shapes: [E([60, 33], 28, 10)], tex: () => -1.2 });
    F.add({ mat: 'w.hush', prof: 'round', bw: 7, grp: 'body', noOutline: true, shapes: tube, tex: q => ((q.x * 3 + q.y * 7) % 23 === 0 ? .8 : 0) });
    F.add({ mat: 'w.hush', prof: 'round', bw: 1.2, grp: 'ridge', noOutline: true, noShadow: true, shapes: [4, 7, 10, 13, 16, 19, 22].map(i => { const [x, y] = at(i / 26); return E([x, y - 1 - i * .15], 2.2 + i * .12, 1.2); }), tex: () => 1 });
    F.add({ mat: 'w.hush', prof: 'flat', grp: 'eye', noShadow: true, noOutline: true, shapes: [C([36, 16.4], [44.6, 15.2], .6), C([44.6, 15.2], [48, 16.6], .5)], tex: () => 2 });
    const hc = at(.62), veins = [[at(.5), at(.3)], [at(.5), at(.18)], [hc, at(.8)], [at(.8), at(.95)], [hc, [hc[0] + 10, hc[1] - 12]]];
    F.add({ mat: 'w.hushglow', prof: 'flat', grp: 'veins', noShadow: true, noOutline: true, shapes: veins.map(([a, b]) => C(a, b, .6)).concat([C(hc, at(.5), .6)]), tex: () => (f ? 0 : -.7) });
    F.add({ mat: 'w.hushglow', prof: 'round', bw: 3, grp: 'heart', noShadow: true, noOutline: true, shapes: [O(hc, f ? 5.2 : 4.2)], tex: () => (f ? .4 : -.5) });
    return 'halo';
  }
  if (GLOOM_OBJ.has(kind)) return gloomObjectParts(F, kind, st, f, o, W, H); // M6
  if (BELOW_OBJ.has(kind)) return belowObjectParts(F, kind, st, f, o, W, H); // M7
  // unknown kind: a neutral marker stone
  F.add({ mat: 'granite', prof: 'round', bw: 1.6, grp: 'x', shapes: [E([8, 12], 4, 3)] });
}
/* ---- M6: the Gloomfen's gates, locks, props, signs and Hearthfires (the looks P2's maps name, notes/M6-P2-maps.md).
   A gate or lock covering several tiles draws its piece on each, so every piece joins its neighbours: east-west for
   the ones laid across a north-south way (the bough, the hag-fence, the screen, the water-gate, the leech ford), and
   north-south for the ones laid across an east-west way (Hodge's toll-bar and Willowmurk's ward-gate draw a length of
   bar or hurdle running down the tile; the boardwalk's gap is water between broken plank ends). ---- */
const GLOOM_OBJ = new Set(['toll-bar', 'leech-ford', 'ward-gate', 'hung-lanterns', 'hag-fence', 'barge-planks', 'water-gate', 'choir-screen',
  'blackwater', 'witch-ward', 'wreck', 'marsh-lights', 'black-barge', 'lantern', 'sleeping-child', 'crane', 'diving-bell', 'sealed-chest', 'barge', 'bell', 'sleeper']);
const GLOOM_ANIM = new Set(['leech-ford', 'hung-lanterns', 'witch-ward', 'blackwater', 'barge-planks', 'marsh-lights', 'lantern', 'bell', 'sleeper']); // two frames while shut (a prop is always 'closed')
const GLOOM_ANIM_ANY = new Set(['toll-bar', 'water-gate']); // two frames in either state
const GLOOM_SIGNS = new Set(['ward-stone', 'ward-stone-dark', 'bootprints']);
const GLOOM_HEARTH = new Set(['reedshrine', 'mootring', 'tollpost', 'firebasket', 'fencairn', 'bellbowl', 'hullfire', 'ironbeacon']);
const HEARTH_SIZE = { reedshrine: [16, 24], tollpost: [16, 24], firebasket: [16, 24], bellbowl: [16, 24], hullfire: [24, 20], ironbeacon: [16, 32] };
const weave = q => ((((q.x >> 1) + (q.y >> 1)) & 1) ? -.9 : .1);
const deepWater = (mat, seed, f) => q => -2.62 + (hash(q.x, q.y, seed + f) < .035 ? .85 : 0) + bayer(q.x, q.y) * .1;
function gloomObjectParts(F, kind, st, f, o, W, H) {
  const B = H - 1, open = st === 'open';
  switch (kind) {
    case 'toll-bar': { // Hodge's bar: a length of pole painted in faded bands, on a trestle, his lantern on a hook; open, swung up
      F.add({ mat: 'bogwood', prof: 'round', bw: .6, grp: 'trestle', shapes: [C([8, 13], [4, B + .3], .75, .6), C([8, 13], [12, B + .3], .75, .6), C([5.2, 19.8], [10.8, 19.8], .45)] });
      if (!open) F.add({ mat: 'clothWhite', prof: 'round', bw: 1.1, grp: 'bar', shapes: [RECT(6.3, -.6, 9.7, 16.6)], tex: q => ((q.y + 64) % 8 < 4 ? { m: 'robeRed', dd: -.3 } : -.4) });
      else {
        F.add({ mat: 'w.fenstone', prof: 'round', bw: 1.2, grp: 'weight', shapes: [E([5.4, 15.2], 2.2, 1.8)] });
        F.add({ mat: 'clothWhite', prof: 'round', bw: 1.1, grp: 'bar', shapes: [C([6.6, 15.4], [13.2, -1.4], 1.6)], tex: q => (Math.floor((.37 * q.x - .93 * q.y + 64) / 4) % 2 ? { m: 'robeRed', dd: -.3 } : -.4) });
      }
      const [lx, ly] = open ? [13.2, 7.4] : [12, 5.6];
      F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'hook', shapes: [C([lx - (open ? 1.2 : 2.4), ly - 1.4], [lx, ly - 1.2], .35), C([lx, ly - 1.2], [lx, ly], .3)] });
      F.add({ mat: 'iron', prof: 'bevel', bw: .6, grp: 'lamp', shapes: [RECT(lx - 1.5, ly, lx + 1.5, ly + 4), P([[lx - 1.9, ly + .4], [lx, ly - .8], [lx + 1.9, ly + .4]])] });
      F.add({ mat: 'amber', prof: 'flat', grp: 'glass', noShadow: true, shapes: [RECT(lx - .8, ly + .9, lx + .8, ly + 3.2)], tex: () => (f ? .6 : 0) });
      return 'halo';
    }
    case 'leech-ford': { // the Murkway's ford, black and heaving with leeches; open, they are gone and the ford shows clear
      if (open) return;
      F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'water', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [RECT(-1, 7.6, 17, B + 1)], tex: deepWater('w.blackwater', 91, f) });
      const L = f ? [[2.4, 11.2, 5.6, 12.8], [9.2, 14.8, 12.6, 13], [4.6, 19.6, 8, 21], [11.6, 20.4, 14.4, 18.4]] : [[2.8, 12.6, 5.8, 11], [9.4, 13.2, 12.8, 14.8], [4.4, 20.6, 7.8, 19], [11.8, 18.4, 14.6, 20.2]];
      F.add({ mat: 'w.leech', prof: 'round', bw: .8, grp: 'leeches', shapes: L.map(([a, b, c, d]) => C([a, b], [c, d], 1, .7)), tex: q => .5 + ((q.x * 2 + q.y) % 4 === 0 ? .6 : 0) });
      F.add({ mat: 'amber', prof: 'flat', grp: 'stripes', noShadow: true, noOutline: true, shapes: L.map(([a, b, c, d]) => C([a + (c - a) * .25, b + (d - b) * .25], [a + (c - a) * .75, b + (d - b) * .75], .3)), tex: () => -1.6 });
      const rc = f ? [7.5, 16.5] : [12.5, 10.5];
      F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'rings', noShadow: true, noOutline: true, shapes: [E(rc, 2.4, 1.3)], cuts: [E(rc, 1.5, .7)], tex: () => -1.7 });
      return;
    }
    case 'ward-gate': { // Willowmurk's broken ward-gate: a hurdle of wicker and bone, stakes through it, a willow root grown over it
      if (open) {
        F.add({ mat: 'w.thatch', prof: 'round', bw: 1, grp: 'stub', shapes: [RECT(5.4, 15.4, 10.6, 21.4)], tex: weave });
        F.add({ mat: 'bark', prof: 'round', bw: .6, grp: 'cut', shapes: [C([1.6, B], [4.6, 19.6], 1, .7), C([15, B - 1.4], [12, 18.4], .9, .6)] });
        F.add({ mat: 'bone', prof: 'round', bw: .4, grp: 'bone', shapes: [C([11.6, 21.8], [13.8, 21.2], .45)] });
        return;
      }
      F.add({ mat: 'w.thatch', prof: 'round', bw: 1.2, grp: 'hurdle', shapes: [RECT(5.2, .4, 10.8, 21.4)], tex: weave });
      F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'stakes', shapes: [C([5.6, -.8], [5.6, 21.6], .55), C([10.4, -.8], [10.4, 21.6], .55)] });
      F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'ties', noShadow: true, shapes: [C([10.4, 4], [11.2, 5.4], .3), C([5.6, 11], [4.6, 12.4], .3)] });
      F.add({ mat: 'bone', prof: 'round', bw: .5, grp: 'bones', shapes: [C([11, 5.2], [12.8, 7.6], .5), O([13, 7.9], .7), C([4.6, 12.2], [3, 14.8], .45), E([11.6, 15.8], 1.1, .8)] });
      F.add({ mat: 'bark', prof: 'round', bw: .8, grp: 'roots', shapes: [C([.6, B], [4.6, 17], 1.1, .8), C([4.6, 17], [9, 9.6], .8, .6), C([9, 9.6], [14.8, 3.6], .6, .35), C([15.6, B - 1], [12, 18.6], .9, .6)] });
      return;
    }
    case 'hung-lanterns': { // a dead bough bent low over the path, hung with little lanterns, moths thick round them;
      // open, the bough is lifted aside and one lantern lies dark in the path
      if (open) {
        F.add({ mat: 'iron', prof: 'bevel', bw: .5, grp: 'lamp', shapes: [P([[9.6, 19.6], [12.8, 18.2], [13.8, 20.6], [10.6, 22]])] });
        F.add({ mat: 'dark', prof: 'flat', grp: 'glass', noShadow: true, shapes: [P([[10.6, 19.8], [12.4, 19], [12.9, 20.2], [11.1, 21]])] });
        F.add({ mat: 'bogwood', prof: 'round', bw: .4, grp: 'twig', shapes: [C([2.4, 21.6], [6.8, 20.4], .45, .3)] });
        return;
      }
      const sw = f ? .5 : -.5;
      F.add({ mat: 'bogwood', prof: 'round', bw: .9, grp: 'bough', shapes: [C([-1, 5.4], [6, 7.2], 1.35, 1.2), C([6, 7.2], [11, 6.4], 1.2, 1.1), C([11, 6.4], [17, 5.4], 1.1, 1.35), C([6.4, 7], [7.6, 2.4], .5, .3), C([12.6, 6.2], [14.4, 3], .45, .3)] });
      for (const [x, l] of [[3.6, 4.8], [11.8, 3.6]]) {
        const cx = x + sw * (x > 8 ? -1 : 1), top = 6.8 + (x > 8 ? -.4 : .6);
        F.add({ mat: 'string', prof: 'flat', grp: 'cord' + x, noShadow: true, noOutline: true, shapes: [C([x, top], [cx, top + l], .3)] });
        F.add({ mat: 'iron', prof: 'bevel', bw: .5, grp: 'lamp' + x, shapes: [RECT(cx - 1.3, top + l, cx + 1.3, top + l + 3.6), P([[cx - 1.6, top + l + .3], [cx, top + l - .7], [cx + 1.6, top + l + .3]])] });
        F.add({ mat: 'w.lamplight', prof: 'flat', grp: 'glass' + x, noShadow: true, shapes: [RECT(cx - .7, top + l + .8, cx + .7, top + l + 2.9)], tex: () => (f ? .5 : 0) });
      }
      F.add({ mat: 'w.moth', prof: 'flat', grp: 'moths', noShadow: true, noOutline: true, shapes: (f ? [[1.6, 10], [6.4, 14.6], [9.6, 9], [14.4, 15]] : [[2.8, 15.4], [5.6, 9.4], [10.6, 16], [14, 10.4]]).map(([x, y]) => E([x, y], .9, .5)), tex: () => .8 });
      return 'halo';
    }
    case 'hag-fence': { // stakes across the path hung with bones, bottles and knotted hair; open, pulled down
      if (open) {
        F.add({ mat: 'bogwood', prof: 'round', bw: .6, grp: 'stakes', shapes: [C([1, 20.6], [9.4, 18.4], .7, .5), C([7.4, 22.4], [15.4, 20.8], .7, .5)] });
        F.add({ mat: 'bone', prof: 'round', bw: .4, grp: 'bones', shapes: [C([10.6, 21.4], [12.6, 22.2], .45), O([4, 22.4], .7)] });
        F.add({ mat: 'seaglass', prof: 'round', bw: .4, grp: 'bottle', shapes: [C([12.4, 18.2], [14.4, 17.6], .7, .5)] });
        return;
      }
      F.add({ mat: 'bogwood', prof: 'round', bw: .6, grp: 'stakes', shapes: [3.6, 12.4].map((x, i) => P([[x - .9, B + .3], [x - .8, 7], [x + (i ? .4 : -.4), 4.2], [x + .8, 7], [x + .9, B + .3]])) });
      F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'cord', noShadow: true, shapes: [C([-1, 9.2], [3.6, 8], .35), C([3.6, 8], [8, 9.6], .35), C([8, 9.6], [12.4, 8], .35), C([12.4, 8], [17, 9.2], .35)] });
      const s = f ? .4 : -.4;
      F.add({ mat: 'bone', prof: 'round', bw: .5, grp: 'bones', shapes: [C([6.2 + s, 9.6], [6.2 + s * 2, 12.4], .5), E([6.2 + s * 2, 13.6], 1.3, 1.1), E([15 + s, 12], .8, 1.4)] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'sockets', noShadow: true, noOutline: true, shapes: [O([5.7 + s * 2, 13.5], .35), O([6.8 + s * 2, 13.5], .35)] });
      F.add({ mat: 'seaglass', prof: 'round', bw: .5, grp: 'bottle', shapes: [RECT(9.4 + s, 11.2, 10.8 + s, 14.2), C([10.1 + s, 9.4], [10.1 + s, 11.2], .3)] });
      F.add({ mat: 'hairBlack', prof: 'round', bw: .4, grp: 'hair', shapes: [C([1.2, 9], [.8 + s, 13.6], .6, .3), C([1.8, 9], [2.4 + s, 12.6], .5, .3)] });
      return;
    }
    case 'barge-planks': { // the long boardwalk's gap: black water between the broken plank ends, one plank adrift; open, barge-planks
      // are laid across it (the tile's own planks show), lashed where they meet the boardwalk
      if (open) {
        F.add({ mat: 'string', prof: 'round', bw: .4, grp: 'lash', noShadow: true, shapes: [C([1.4, 9.4], [1.4, 22.6], .55), C([14.6, 9.4], [14.6, 22.6], .55)], tex: q => (q.y % 2 ? -.8 : 0) });
        return;
      }
      F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'water', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [RECT(-.5, 7.6, 16.5, B + 1)], tex: deepWater('w.blackwater', 93, f) });
      const ends = side => P(side < 0 ? [[-1, 8], [2.6, 8], [1.4, 11.6], [3.2, 11.8], [2, 15.4], [3.4, 15.6], [1.6, 19.6], [2.8, 19.8], [1.2, B + .6], [-1, B + .6]]
        : [[17, 8], [13.8, 8], [14.8, 11.4], [13, 11.8], [14.2, 15.2], [12.8, 15.6], [14.4, 19.4], [13.4, 19.8], [14.6, B + .6], [17, B + .6]]);
      F.add({ mat: 'w.boards', prof: 'bevel', bw: .6, grp: 'ends', shapes: [ends(-1), ends(1)], tex: q => ((q.y - 8) % 4 === 0 ? -1.1 : 0) });
      const d = f ? .4 : 0;
      F.add({ mat: 'w.boards', prof: 'bevel', bw: .5, grp: 'adrift', shapes: [P([[5.4, 14.4 + d], [10.6, 13.2 + d], [11, 14.8 + d], [5.8, 16 + d]])] });
      return;
    }
    case 'water-gate': { // Misthollow's water-gate: a portcullis let down into the flood under a stone lintel; open, raised
      F.add({ mat: 'w.ruin', prof: 'bevel', bw: 1, grp: 'lintel', shapes: [RECT(-1, .4, 17, 4.6)], tex: q => (q.x % 8 === 0 ? -1 : q.y === 1 ? .5 : 0) });
      const bot = open ? 7.4 : 21.6, xs = [2, 6, 10, 14];
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'bars', shapes: xs.map(x => C([x, 4.4], [x, bot], .7)).concat(open ? [C([-1, 6], [17, 6], .6)] : [C([-1, 9], [17, 9], .6), C([-1, 15], [17, 15], .6)]), tex: q => (hash(q.x >> 1, q.y >> 1, 95) < .3 ? { m: 'rust', dd: -.6 } : -.3) });
      F.add({ mat: 'iron', prof: 'ridge', grp: 'spikes', shapes: xs.map(x => P([[x - .9, bot - .6], [x, bot + 1.6], [x + .9, bot - .6]])) });
      F.add({ mat: 'w.weed', prof: 'round', bw: .4, grp: 'weed', shapes: [C([6, open ? 7 : 12], [6.6, open ? 10 : 16.6], .5, .3), C([14, open ? 7 : 10], [13.4, open ? 9.6 : 14], .45, .3)] });
      F.add({ mat: 'w.canal', prof: 'flat', grp: 'flow', noShadow: true, noOutline: true, shapes: (f ? [[1, 18.6, 5], [8.4, 21.2, 13]] : [[3, 20.4, 7.4], [9.6, 18.8, 14.6]]).map(([a, y, b]) => C([a, y], [b, y], .45)), tex: () => -1.2 });
      return;
    }
    case 'choir-screen': { // the Drowned Belfry's carved screen: a rail and pointed tracery over a panelled base; open, the leaves stand back
      const wood = q => ((q.x * 3 + q.y) % 9 === 0 ? -1 : 0);
      F.add({ mat: 'bogwood', prof: 'bevel', bw: .8, grp: 'rail', shapes: [RECT(-1, 1, 17, 3.4)], tex: wood });
      F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'tracery', shapes: [C([0, 3.4], [4, 7.6], .5), C([4, 7.6], [8, 3.4], .5), C([8, 3.4], [12, 7.6], .5), C([12, 7.6], [16, 3.4], .5)] });
      F.add({ mat: 'bogwood', prof: 'bevel', bw: .7, grp: 'posts', shapes: [RECT(-.6, 3, 1.2, B + .4), RECT(14.8, 3, 16.6, B + .4)] });
      if (open) return;
      F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'mullions', shapes: [C([4, 7.6], [4, 15], .5), C([8, 3.4], [8, 15], .55), C([12, 7.6], [12, 15], .5)] });
      F.add({ mat: 'bogwood', prof: 'bevel', bw: .8, grp: 'panel', shapes: [RECT(-1, 14.6, 17, B + .4)], tex: q => wood(q) + (q.y === 15 ? .6 : 0) });
      F.add({ mat: 'w.waterlight', prof: 'flat', grp: 'carving', noShadow: true, noOutline: true, shapes: [O([8, 19], 1.4)], cuts: [O([8, 19], .7)], tex: () => -1.8 });
      F.add({ mat: 'w.waterlight', prof: 'flat', grp: 'glints', noShadow: true, noOutline: true, shapes: [O([2.5, 10.5], .5), O([13.5, 9.5], .5)], tex: () => -1.4 });
      return;
    }
    case 'blackwater': { // a dock: deep black water at a jetty's end, something moving under it; open, a punt moored across it
      const T0 = H - 16;
      F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'water', noShadow: true, noOutline: true, lo: 1, hi: 2, shapes: [RECT(-.5, T0 - .5, 16.5, B + 1)], tex: deepWater('w.blackwater', 97, f) });
      if (!open) {
        const c = f ? [10, T0 + 9] : [6.4, T0 + 6.6];
        F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'rings', noShadow: true, noOutline: true, shapes: [E(c, 4.4, 2.4)], cuts: [E(c, 3.4, 1.7)], tex: () => -1.6 });
        F.add({ mat: 'w.gar', prof: 'round', bw: .8, grp: 'back', shapes: [C([c[0] - 2.2, c[1] + .2], [c[0] + 1.8, c[1] - .2], .8, .5)], tex: () => -.6 });
        return;
      }
      F.add({ mat: 'w.wreck', prof: 'bevel', bw: .9, grp: 'hull', shapes: [P([[-.8, T0 + 7.6], [1.6, T0 + 3.6], [14.4, T0 + 3.6], [16.8, T0 + 7.6], [14.4, T0 + 12], [1.6, T0 + 12]])], tex: () => .3 });
      F.add({ mat: 'w.boards', prof: 'flat', grp: 'bottom', shapes: [P([[1.4, T0 + 7.6], [2.8, T0 + 5], [13.2, T0 + 5], [14.6, T0 + 7.6], [13.2, T0 + 10.6], [2.8, T0 + 10.6]])], tex: q => (q.y === T0 + 7 || q.y === T0 + 9 ? -1.6 : -.9) });
      F.add({ mat: 'bogwood', prof: 'bevel', bw: .5, grp: 'thwart', shapes: [RECT(7, T0 + 4.4, 9, T0 + 11.2)] });
      F.add({ mat: 'wood', prof: 'round', bw: .4, grp: 'pole', shapes: [C([2.6, T0 + 9.8], [13.8, T0 + 6.2], .45)] });
      F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'painter', noShadow: true, shapes: [C([1.2, T0 + 5.4], [-.6, T0 + 1.4], .35)] });
      return;
    }
    case 'witch-ward': { // a ward-stone with cords run out from it across the way, holed stones, a feather and twigs hung on them,
      // the air humming; open, the cords are down and the charms lie quiet
      F.add({ mat: 'w.fenstone', prof: 'round', bw: 1.6, grp: 'stone', shapes: [P([[5.4, B + .3], [5.6, 16.4], [6.8, 13.4], [9.4, 13], [10.6, 15.6], [10.8, B + .3]])], tex: q => ((q.x * 3 + q.y) % 7 === 0 ? { m: 'w.fenmoss', dd: 0 } : 0) });
      F.add({ mat: open ? 'dark' : 'w.marshlight', prof: 'flat', grp: 'sigil', noShadow: true, noOutline: true, shapes: [O([8.1, 17.4], 1.2)], cuts: [O([8.1, 17.4], .5)], tex: () => (open ? -1 : f ? -.6 : -1.2) });
      if (open) {
        F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'cords', noShadow: true, shapes: [C([-1, 21.4], [5.4, 20.6], .35), C([10.8, 20.8], [17, 21.6], .35)] });
        F.add({ mat: 'w.fenstone', prof: 'round', bw: .5, grp: 'charms', shapes: [O([2.4, 21.8], 1)], cuts: [O([2.4, 21.8], .4)] });
        F.add({ mat: 'bone', prof: 'round', bw: .4, grp: 'bone', shapes: [C([12.6, 22], [14.4, 21.4], .4)] });
        return;
      }
      const s = f ? .45 : -.45;
      F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'cords', noShadow: true, shapes: [C([-1, 13.6], [3, 14.6], .35), C([3, 14.6], [7, 13.2], .35), C([9, 13.2], [13, 14.6], .35), C([13, 14.6], [17, 13.6], .35)] });
      F.add({ mat: 'string', prof: 'flat', grp: 'strings', noShadow: true, noOutline: true, shapes: [C([2.4, 14.4], [2.2 + s, 16.6], .25), C([13.4, 14.4], [13.6 + s, 16.8], .25), C([4.8, 14], [4.8 + s, 15.6], .25), C([11.2, 14], [11.2 + s, 15.8], .25)] });
      F.add({ mat: 'w.fenstone', prof: 'round', bw: .5, grp: 'holed', shapes: [O([2.2 + s, 17.6], 1.1), O([13.6 + s, 17.8], 1)], cuts: [O([2.2 + s, 17.6], .4), O([13.6 + s, 17.8], .4)] });
      F.add({ mat: 'clothWhite', prof: 'round', bw: .4, grp: 'feather', shapes: [E([4.8 + s, 17], .6, 1.4)] });
      F.add({ mat: 'bogwood', prof: 'round', bw: .4, grp: 'twigs', shapes: [C([10.4 + s, 16], [12 + s, 18.6], .35), C([12 + s, 16], [10.4 + s, 18.6], .35)] });
      F.add({ mat: 'w.marshlight', prof: 'flat', grp: 'hum', noShadow: true, noOutline: true, shapes: (f ? [[3.5, 11.5], [12.5, 10.5]] : [[4.5, 10.5], [11.5, 11.5]]).map(c => O(c, .45)), tex: () => -.8 });
      return 'halo';
    }
    case 'wreck': { // a boat's hull on its side, stove in: the keel along the top, the planking, ribs where it broke
      F.add({ mat: 'w.wreck', prof: 'round', bw: 2, grp: 'hull', shapes: [P([[1.6, 15.6], [4, 9], [9, 6.2], [20, 5.6], [27.4, 7.4], [30.6, 11.4], [29.6, 18.4], [18, 19.4], [6, 19.2]])], tex: q => ((q.y - 6) % 3 === 0 ? -1.1 : 0) + (hash(q.x >> 2, q.y, 101) < .08 ? -.8 : 0) });
      F.add({ mat: 'bogwood', prof: 'round', bw: .7, grp: 'keel', shapes: [C([3.4, 9.6], [9, 5.4], .8), C([9, 5.4], [24, 4.8], .9), C([24, 4.8], [29.4, 7.6], .8)] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'hole', noShadow: true, shapes: [P([[12.6, 10.4], [17.4, 9.8], [19.6, 13.4], [16.4, 17], [12, 15.6]])] });
      F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'ribs', shapes: [C([13.6, 17], [12.8, 9.6], .5), C([16.4, 17], [16.6, 9.4], .5), C([19, 16.4], [19.6, 10.8], .45)] });
      F.add({ mat: 'w.fenstone', prof: 'flat', grp: 'barnacles', noShadow: true, noOutline: true, shapes: [O([5.5, 16.5], .6), O([7.5, 17.5], .5), O([26.5, 16.5], .6), O([24.5, 17.5], .5)], tex: () => .6 });
      return;
    }
    case 'marsh-lights': { // small lights hanging over the water, drifting (2 frames), their broken reflections below
      const L = f ? [[4, 9, 1.2], [11.4, 5, 1], [8.4, 14.4, .9]] : [[4.8, 7.6, 1], [10.6, 6.4, 1.2], [7.6, 13.4, 1]];
      F.add({ mat: 'w.marshlight', prof: 'round', bw: 1, grp: 'lights', noShadow: true, shapes: L.map(([x, y, r]) => O([x, y], r)), tex: () => (f ? .6 : .2) });
      F.add({ mat: 'w.marshlight', prof: 'flat', grp: 'shine', noShadow: true, noOutline: true, shapes: L.map(([x, , r]) => C([x - r, 21], [x + r, 21], .35)), tex: () => -1.6 });
      return 'halo';
    }
    case 'black-barge': { // the Unsmith's barge: long, low and black, its lamps dark, his mark on the prow (a hammer in a broken ring)
      F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'wake', noShadow: true, noOutline: true, shapes: [E([32, B - 3], 31, 3.4)], tex: q => -2.62 + ((q.x + q.y * 3) % 9 === 0 ? .6 : 0) });
      F.add({ mat: 'w.tarred', prof: 'round', bw: 2.4, grp: 'hull', shapes: [P([[1, 12.6], [4.6, 18.8], [10, 26], [18, 30], [60.4, 30], [62.6, 21.6], [62.6, 18.6], [8, 20], [4.4, 16]])], tex: q => (q.y === 22 || q.y === 26 ? -1 : 0) + (hash(q.x >> 3, q.y, 103) < .1 ? .4 : 0) });
      F.add({ mat: 'w.tarred', prof: 'bevel', bw: 1, grp: 'gunwale', shapes: [P([[2.6, 12.8], [8.6, 18.6], [62.6, 17.8], [62.6, 19.6], [8, 20.6], [2, 14.4]])], tex: () => .6 });
      F.add({ mat: 'w.tarboards', prof: 'bevel', bw: 1, grp: 'cabin', shapes: [RECT(26, 10.4, 50, 19)], tex: q => (q.x % 4 === 0 ? -1 : 0) });
      F.add({ mat: 'w.mourning', prof: 'round', bw: 2, grp: 'roof', shapes: [P([[24.4, 11.4], [26.6, 6.8], [49.4, 6.8], [51.6, 11.4]])] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'door', noShadow: true, shapes: [RECT(35.4, 12.4, 39.4, 19)] });
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'poles', shapes: [C([7.6, 17.6], [7.6, 4], .6), C([7.6, 4], [10.4, 4], .5), C([58.6, 18], [58.6, 6.4], .6)] });
      F.add({ mat: 'iron', prof: 'bevel', bw: .5, grp: 'lamps', shapes: [RECT(9.2, 4.6, 11.8, 8.6), RECT(57.2, 3, 60, 6.6)] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'glass', noShadow: true, shapes: [RECT(9.8, 5.4, 11.2, 7.8), RECT(57.8, 3.8, 59.4, 5.8)] });
      F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'ring', noShadow: true, shapes: [O([13.4, 23], 2.3)], cuts: [O([13.4, 23], 1.4), RECT(14.2, 19.6, 16.8, 22.2)] });
      F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'hammer', noShadow: true, shapes: [C([12.2, 24.8], [14.6, 21.8], .35), RECT(13.6, 20.8, 15.8, 22)] });
      return;
    }
    case 'lantern': { // the Lantern Mother's lamps: a tall old street-lamp of Misthollow's, its iron bent, lit, moths round it
      F.add({ mat: 'iron', prof: 'round', bw: .6, grp: 'foot', shapes: [P([[4.6, B + .3], [6.4, B - 3], [9.6, B - 3], [11.4, B + .3]])] });
      F.add({ mat: 'iron', prof: 'round', bw: .6, grp: 'post', shapes: [C([8, B - 2.6], [8.4, 11], .8, .65), C([8.4, 11], [7.8, 9.6], .6)] });
      F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'scroll', noShadow: true, shapes: [O([6.2, 13.4], 1.2)], cuts: [O([6.2, 13.4], .5)] });
      F.add({ mat: 'iron', prof: 'bevel', bw: .7, grp: 'head', shapes: [P([[4, 3.4], [8, .6], [12, 3.4]]), RECT(4.6, 3.4, 11.4, 9), RECT(5.6, 9, 10.4, 10)] });
      F.add({ mat: 'w.lamplight', prof: 'flat', grp: 'glass', noShadow: true, shapes: [RECT(5.6, 4.2, 10.4, 8.4)], tex: q => (q.x === 8 ? { m: 'iron', dd: -.5 } : f ? .4 : 0) });
      F.add({ mat: 'w.moth', prof: 'flat', grp: 'moths', noShadow: true, noOutline: true, shapes: (f ? [[2.6, 6], [13.4, 3.4], [12.4, 11.6]] : [[3.2, 10.4], [13, 7.4], [2.4, 2.6]]).map(([x, y]) => E([x, y], .9, .5)), tex: () => .8 });
      return 'halo';
    }
    case 'sleeping-child': { // a child asleep on the ground, curled on one side, knees drawn up, a hand under the cheek
      F.add({ mat: 'skinPale', prof: 'round', bw: .8, grp: 'feet', shapes: [E([14.4, 13.4], 1.3, .9)] });
      F.add({ mat: 'clothWhite', prof: 'round', bw: 1.6, grp: 'shirt', shapes: [P([[5.4, 8.6], [9.6, 7.4], [13.2, 8.8], [14.8, 12], [12.8, 14.8], [7, 15], [5, 12.8]])], tex: q => (q.x % 3 === 0 ? -1.2 : -.6) });
      F.add({ mat: 'clothWhite', prof: 'round', bw: .8, grp: 'knees', shapes: [E([12.4, 11.6], 2.2, 1.8)], tex: () => -.3 });
      F.add({ mat: 'skinPale', prof: 'round', bw: 1.4, grp: 'head', shapes: [O([3.8, 10.2], 2.8)] });
      F.add({ mat: 'hairBrown', prof: 'round', bw: 1.2, grp: 'hair', shapes: [E([3.2, 9], 2.9, 2.1), E([1.6, 11], 1, 1.6)] });
      F.add({ mat: 'skinPale', prof: 'round', bw: .6, grp: 'hand', shapes: [O([5.6, 12.6], 1)] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'lids', noShadow: true, noOutline: true, shapes: [C([3.4, 10.8], [4.6, 10.8], .3)] });
      return;
    }
    case 'crane': { // the salvage camp's timber crane: a stayed mast, a jib out over the water, a rope and hook, the winch
      F.add({ mat: 'w.boards', prof: 'bevel', bw: .8, grp: 'base', shapes: [RECT(10, B - 3.4, 22, B + .3)], tex: q => (q.x % 4 === 0 ? -1 : 0) });
      F.add({ mat: 'bogwood', prof: 'round', bw: .8, grp: 'mast', shapes: [RECT(14.4, 4, 17.6, B - 3)], tex: q => (q.y % 6 === 0 ? -1 : 0) });
      F.add({ mat: 'bogwood', prof: 'round', bw: .6, grp: 'stays', shapes: [C([16, 6], [10.4, B - 3.2], .45), C([16, 6], [21.6, B - 3.2], .45)] });
      F.add({ mat: 'bogwood', prof: 'round', bw: .7, grp: 'jib', shapes: [C([17, B - 12], [30.4, 3], .9, .7)] });
      F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'ropes', noShadow: true, shapes: [C([16, 4.6], [30, 3.2], .3), C([30, 3.6], [30, 22], .3)] });
      F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'hook', shapes: [C([30, 22], [30, 24.6], .45), C([30, 24.6], [28.6, 25.6], .4), C([28.6, 25.6], [28, 24.4], .35)] });
      F.add({ mat: 'iron', prof: 'round', bw: .6, grp: 'winch', shapes: [O([19.6, B - 8], 2)], cuts: [O([19.6, B - 8], .7)] });
      return;
    }
    case 'diving-bell': { // the salvagers' diving bell, bronze gone green, two ports, hung on a chain over the canal
      F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'chain', shapes: [0, 1, 2, 3, 4].map(k => (k % 2 ? E([8, 1 + k * 2], .6, 1.1) : E([8, 1 + k * 2], 1, .6))), cuts: [0, 1, 2, 3, 4].map(k => E([8, 1 + k * 2], .25, .3)) });
      F.add({ mat: 'bronze', prof: 'round', bw: 2, grp: 'bell', shapes: [P([[5, 11.6], [11, 11.6], [13.4, 17], [14.4, 24.6], [1.6, 24.6], [2.6, 17]]), E([8, 11.6], 3, 1.6)], tex: q => (hash(q.x, q.y, 105) < .08 ? { m: 'verdigris', dd: 0 } : q.y === 22 ? -1 : 0) });
      F.add({ mat: 'bronze', prof: 'bevel', bw: .6, grp: 'rim', shapes: [RECT(1, 23.8, 15, 25.6)] });
      F.add({ mat: 'seaglass', prof: 'round', bw: .5, grp: 'ports', shapes: [O([5.4, 18.6], 1.3), O([10.6, 18.6], 1.3)] });
      F.add({ mat: 'w.canal', prof: 'flat', grp: 'ripples', noShadow: true, noOutline: true, shapes: [E([8, B - 1.6], 7, 1.6)], cuts: [E([8, B - 1.6], 5.6, 1)], tex: () => -1.4 });
      return;
    }
    case 'sealed-chest': { // the chest they pulled up: a sea-chest crusted with barnacles, chained shut, a seal of soot on its lid
      F.add({ mat: 'w.wreck', prof: 'bevel', bw: 1.2, grp: 'body', shapes: [RECT(1.6, 7, 14.4, 14.8)], tex: q => (q.y === 10 ? -1 : 0) + (hash(q.x, q.y, 107) < .1 ? .6 : 0) });
      F.add({ mat: 'w.wreck', prof: 'round', bw: 1.6, grp: 'lid', shapes: [E([8, 7.4], 6.5, 3.4)], clip: RECT(0, 0, 16, 8.2) });
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'chain', shapes: [2.6, 5, 7.4, 9.8, 12.2].map((x, k) => (k % 2 ? E([x, 9.6], 1.1, .6) : E([x, 9.6], .7, .9))), cuts: [2.6, 5, 7.4, 9.8, 12.2].map(x => O([x, 9.6], .25)) });
      F.add({ mat: 'dark', prof: 'round', bw: .6, grp: 'seal', shapes: [O([8, 6.2], 1.7)] });
      F.add({ mat: 'w.char', prof: 'flat', grp: 'soot', noShadow: true, noOutline: true, shapes: [C([6.8, 5.8], [9.2, 6.6], .3)], tex: () => .8 });
      return;
    }
    case 'barge': { // a Tallyman barge moored by its chain across the towpath: grey-tarred, crates and a chain on deck, their mark on the side
      F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'wake', noShadow: true, noOutline: true, shapes: [E([24, B - 2.6], 23, 2.8)], tex: q => -2.62 + ((q.x * 2 + q.y) % 11 === 0 ? .6 : 0) });
      F.add({ mat: 'w.tarboards', prof: 'round', bw: 2, grp: 'hull', shapes: [P([[1.4, 13], [46.6, 13], [45.4, 21.6], [42, 24.6], [6, 24.6], [2.6, 21.6]])], tex: q => (q.y === 17 || q.y === 21 ? -1 : 0) });
      F.add({ mat: 'w.boards', prof: 'bevel', bw: .8, grp: 'deck', shapes: [RECT(2, 10.4, 46, 14)], tex: q => (q.x % 5 === 0 ? -1 : 0) });
      F.add({ mat: 'w.tarboards', prof: 'bevel', bw: 1, grp: 'house', shapes: [RECT(28, 3.4, 42, 12)], tex: q => (q.x % 4 === 0 ? -1 : 0) });
      F.add({ mat: 'w.slate', prof: 'bevel', bw: .8, grp: 'roof', shapes: [RECT(27, 2, 43, 4.2)] });
      F.add({ mat: 'wood', prof: 'bevel', bw: .8, grp: 'crates', shapes: [RECT(5, 5.6, 11, 11.4), RECT(11.6, 7.4, 16.6, 11.4)], tex: q => (q.y === 8 || q.x === 8 ? -1 : 0) });
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'chain', shapes: [0, 1, 2, 3, 4, 5].map(k => E([19.6 + k * 1.6, 11 - (k % 2) * .3], k % 2 ? .9 : .6, k % 2 ? .5 : .8)) });
      F.add({ mat: 'clothWhite', prof: 'flat', grp: 'tally', noShadow: true, noOutline: true, shapes: [16, 17.6, 19.2, 20.8].map(x => C([x, 16.6], [x, 20], .35)).concat([C([15.2, 20.2], [21.6, 16.4], .35)]), tex: () => -.8 });
      return;
    }
    case 'bell': { // a bell of the drowned belfry hanging low over the flooded aisle on a rotten rope, swaying (2 frames)
      const s = f ? .5 : -.5;
      F.add({ mat: 'string', prof: 'round', bw: .4, grp: 'rope', shapes: [C([8, -1], [8 + s, 10.6], .6)], tex: q => (q.y % 2 ? -.8 : 0) });
      F.add({ mat: 'bronze', prof: 'round', bw: 2.2, grp: 'bell', shapes: [P([[5.2 + s, 11.4], [10.8 + s, 11.4], [12.8 + s, 17], [14.6 + s, 23.4], [1.4 + s, 23.4], [3.2 + s, 17]]), E([8 + s, 11.6], 3, 1.8)], tex: q => (hash(q.x, q.y, 109) < .12 || (q.x + q.y * 2) % 13 === 0 ? { m: 'verdigris', dd: 0 } : q.y === 20 ? -1 : 0) });
      F.add({ mat: 'bronze', prof: 'bevel', bw: .6, grp: 'lip', shapes: [RECT(.8 + s, 22.6, 15.2 + s, 24.4)] });
      F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [E([8 + s, 24.2], 6, .7)] });
      F.add({ mat: 'w.greenwater', prof: 'flat', grp: 'ripples', noShadow: true, noOutline: true, shapes: [E([8, B - 1.8], 7, 1.8)], cuts: [E([8, B - 1.8], 5.4, 1.1)], tex: () => -1.2 });
      return;
    }
    case 'sleeper': { // Lull, asleep under the Belfry's floor: a vast pale shape curled on its side, a closed eye, a hand folded under
      // its cheek, and in its breast a slow light that comes and goes (2 frames); objectSprite thins its edges into the floor
      F.add({ mat: 'w.fenskin', prof: 'flat', grp: 'under', noOutline: true, noShadow: true, shapes: [E([50, 30], 40, 17)], tex: () => -1.6 });
      F.add({ mat: 'w.fenskin', prof: 'round', bw: 8, grp: 'body', noOutline: true, shapes: [O([24, 26], 14), E([54, 32], 26, 14), E([80, 36], 12, 9)], tex: q => ((q.x * 5 + q.y * 3) % 29 === 0 ? .6 : 0) - .6 });
      F.add({ mat: 'w.fenskin', prof: 'round', bw: 2, grp: 'hand', noOutline: true, noShadow: true, shapes: [E([30, 40], 9, 4), C([22, 42], [38, 42], 1.2)], tex: () => -.2 });
      F.add({ mat: 'dark', prof: 'flat', grp: 'eye', noShadow: true, noOutline: true, shapes: [C([16, 22], [26, 21], .6)] });
      F.add({ mat: 'w.waterlight', prof: 'round', bw: 3, grp: 'heart', noShadow: true, noOutline: true, shapes: [O([52, 30], f ? 5 : 3.6)], tex: () => (f ? .3 : -.8) });
      F.add({ mat: 'w.waterlight', prof: 'flat', grp: 'veins', noShadow: true, noOutline: true, shapes: [C([52, 30], [40, 26], .5), C([52, 30], [64, 36], .5), C([52, 30], [56, 20], .5)], tex: () => (f ? -.4 : -1.4) });
      return 'halo';
    }
  }
}
// the Gloomfen's sign looks: Willowmurk's ward-stones (lit and humming, or dark and cracked) and small bootprints in the mud
function gloomSign(F, st, f) {
  if (st === 'bootprints') { // small bootprints in the mud, all going one way (north)
    const pr = [[5.6, 12.6], [9, 9.8], [5.8, 6.8], [9.2, 4], [6, 1.4]];
    F.add({ mat: 'w.peat', prof: 'flat', grp: 'prints', noShadow: true, noOutline: true, shapes: pr.map(([x, y]) => E([x, y], .9, 1.35)).concat(pr.map(([x, y]) => O([x, y + 1.9], .7))), tex: () => -1.2 });
    F.add({ mat: 'w.blackwater', prof: 'flat', grp: 'wet', noShadow: true, noOutline: true, shapes: pr.map(([x, y]) => O([x + .3, y - .4], .45)), tex: () => -1.4 }); // water standing in them
    return;
  }
  const lit = st === 'ward-stone', B = 23;
  F.add({ mat: 'w.fenstone', prof: 'round', bw: 2.2, grp: 'stone', shapes: [P([[3.8, B + .3], [4.2, 8], [5.6, 3.6], [8.6, 2.2], [11, 3.8], [12, 8.6], [12.4, B + .3]])], tex: q => ((q.x * 3 + q.y) % 11 === 0 ? { m: 'w.fenmoss', dd: lit ? -.2 : .2 } : q.y > 19 && (q.x + q.y) % 3 === 0 ? { m: 'w.fenmoss', dd: -.4 } : 0) });
  const sp = []; for (let k = 0; k < 14; k++) { const a = k * .7, r = .5 + k * .22; sp.push([8.2 + Math.cos(a) * r, 13.4 + Math.sin(a) * r]); }
  F.add({ mat: lit ? 'w.marshlight' : 'dark', prof: 'flat', grp: 'ward', noShadow: true, noOutline: true, shapes: sp.slice(0, -1).map((p, i) => C(p, sp[i + 1], .45)), tex: () => (lit ? (f ? .2 : -.4) : -1) });
  if (!lit) F.add({ mat: 'dark', prof: 'flat', grp: 'crack', noShadow: true, noOutline: true, shapes: [C([6.4, 4.4], [8, 9], .35), C([8, 9], [7, 11.4], .35)] });
  F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'cord', noShadow: true, shapes: [C([4, 7], [8, 8.4], .35), C([8, 8.4], [12, 7.4], .35)] });
  const s = lit ? (f ? .35 : -.35) : 0;
  F.add({ mat: 'w.fenstone', prof: 'round', bw: .4, grp: 'charm', shapes: [O([5.4 + s, 10.2], .8)], cuts: [O([5.4 + s, 10.2], .3)] });
  F.add({ mat: lit ? 'clothWhite' : 'clothGrey', prof: 'round', bw: .4, grp: 'feather', shapes: [E([10.6 + s, 10.4], .5, 1.3)] });
  return lit ? 'halo' : undefined;
}
// the Gloomfen's Hearthfires (HEARTH_LOOKS below; the tall ones' sizes in HEARTH_SIZE)
function gloomHearth(F, look, lit, f) {
  if (look === 'reedshrine') { // the Reed Shrine: bound reeds made into a little house on a mossy hummock, a lamp inside
    F.add({ mat: 'w.fenmoss', prof: 'round', bw: 2, grp: 'hummock', shapes: [E([8, 20.4], 7.4, 3.4)], tex: q => ((q.x * 3 + q.y) % 5 === 0 ? -1 : 0) });
    F.add({ mat: 'w.reed', prof: 'round', bw: 1.2, grp: 'shrine', shapes: [P([[2.6, 19.4], [3, 11.6], [8, 5], [13, 11.6], [13.4, 19.4]])], tex: q => (q.x % 2 ? -.8 : 0) });
    F.add({ mat: 'dark', prof: 'flat', grp: 'niche', shapes: [P([[5.4, 19.2], [5.4, 13.6], [8, 10.6], [10.6, 13.6], [10.6, 19.2]])] });
    F.add({ mat: 'string', prof: 'round', bw: .3, grp: 'binding', noShadow: true, shapes: [C([3.4, 12.6], [12.6, 12.6], .35), C([6.2, 7.6], [9.8, 7.6], .35)] });
    F.add({ mat: 'w.reed', prof: 'ridge', grp: 'tuft', shapes: [P([[7, 5.6], [8, .6], [9, 5.6]])] });
    F.add({ mat: 'w.loam', prof: 'round', bw: .8, grp: 'lamp', shapes: [E([8, 18.2], 1.8, 1)] });
    if (lit) flame(F, 8, 17.6, f, .55); else F.add({ mat: 'rot', prof: 'round', bw: .4, grp: 'wick', shapes: [O([8, 17.4], .5)] });
    return;
  }
  if (look === 'mootring') { // the Willow Hearth: a fire in the moot-circle's ring of flat old stones, mossed
    F.add({ mat: 'w.fenstone', prof: 'round', bw: 1, grp: 'ring', shapes: [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = Math.PI * 2 * k / 8 + .3; return E([8 + Math.cos(a) * 5.8, 11.8 + Math.sin(a) * 2.9], 1.9, 1.1); }), tex: q => ((q.x * 2 + q.y) % 5 === 0 ? { m: 'w.fenmoss', dd: 0 } : 0) });
    logs(F, 8, 12.6, !lit);
    if (lit) flame(F, 8, 12.4, f, 1); else F.add({ mat: 'clothGrey', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8, 12.8], 2.6, 1)] });
    return;
  }
  if (look === 'tollpost') { // the Toll-Lamp: a lamp on a crooked bog-oak post by the road, a toll-bell under its arm
    F.add({ mat: 'bogwood', prof: 'round', bw: .8, grp: 'post', shapes: [C([6, 23.6], [5.4, 5], 1.3, 1.05), C([5.4, 5.6], [12.4, 4.2], .7)], tex: q => ((q.x + q.y) % 5 === 0 ? -1 : 0) });
    F.add({ mat: 'w.fenstone', prof: 'round', bw: 1, grp: 'stones', shapes: [E([4.4, 22.8], 2.4, 1.2), E([8.4, 23], 1.8, 1)] });
    F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'hook', shapes: [C([11.4, 4.4], [11.4, 6.2], .35)] });
    F.add({ mat: 'iron', prof: 'bevel', bw: .7, grp: 'lamp', shapes: [RECT(9, 6.4, 13.8, 12.4), P([[8.4, 6.8], [11.4, 4.8], [14.4, 6.8]]), RECT(9.6, 12.2, 13.2, 13.2)] });
    F.add({ mat: lit ? 'amber' : 'dark', prof: 'flat', grp: 'glass', noShadow: true, shapes: [RECT(9.8, 7.4, 13, 11.6)], tex: () => (lit ? (f ? .6 : 0) : -1) });
    F.add({ mat: 'bronze', prof: 'round', bw: .6, grp: 'bell', shapes: [P([[6.8, 8.4], [8.4, 8.4], [9, 10.8], [6.2, 10.8]])] });
    return;
  }
  if (look === 'firebasket') { // the Stilt Hearth: an iron fire-basket on a slab of stone laid on the market deck
    F.add({ mat: 'w.fenstone', prof: 'bevel', bw: 1, grp: 'slab', shapes: [RECT(1.6, 19.4, 14.4, 23.6)], tex: q => (q.x === 8 ? -1 : 0) });
    F.add({ mat: 'blackiron', prof: 'round', bw: .5, grp: 'legs', shapes: [C([4.4, 19.6], [5.4, 13.6], .6), C([11.6, 19.6], [10.6, 13.6], .6), C([8, 19.8], [8, 14], .55)] });
    F.add({ mat: 'blackiron', prof: 'round', bw: .6, grp: 'basket', shapes: [C([2.4, 8.4], [5, 14], .55), C([13.6, 8.4], [11, 14], .55), C([8, 8.6], [8, 14], .5), C([2.6, 10.6], [13.4, 10.6], .45), C([4.4, 13.8], [11.6, 13.8], .55)] });
    logs(F, 8, 12.8, !lit);
    if (lit) flame(F, 8, 11.8, f, 1.05); else F.add({ mat: 'w.char', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8, 12], 3.4, .9)] });
    return;
  }
  if (look === 'fencairn') { // the Fen Cairn: fen-stones heaped on a tussock, moss on them, bog cotton round its foot
    F.add({ mat: 'w.fenstone', prof: 'round', bw: 1.6, grp: 'stones', shapes: [E([8, 13.2], 6.4, 2.6), E([5.6, 10.6], 3, 2), E([10.6, 10.8], 3, 2), E([8, 8.6], 3.2, 1.9)], tex: q => ((q.x * 3 + q.y) % 5 === 0 ? { m: 'w.fenmoss', dd: 0 } : 0) });
    F.add({ mat: 'clothWhite', prof: 'round', bw: .5, grp: 'cotton', shapes: [O([2, 14], .8), O([14.2, 13.6], .7), O([12.8, 15], .6)] });
    if (lit) flame(F, 8, 7.8, f, .9); else F.add({ mat: 'rot', prof: 'round', bw: .6, grp: 'char', shapes: [E([8, 7.6], 2.2, .9)] });
    return;
  }
  if (look === 'bellbowl') { // the Belltower Fire: a bronze fire-bowl gone green, on a drum of fallen column, a cracked bell beside it
    F.add({ mat: 'bronze', prof: 'round', bw: 1.4, grp: 'bell', shapes: [P([[10.2, 13.4], [13.4, 13.4], [14.8, 20.6], [9, 21.4]]), E([11.8, 13.4], 1.7, 1)], tex: q => ((q.x + q.y) % 4 === 0 ? { m: 'verdigris', dd: 0 } : 0) });
    F.add({ mat: 'w.ruin', prof: 'round', bw: 1.4, grp: 'drum', shapes: [RECT(3.4, 13.6, 10.6, 23.6)], tex: q => (q.x === 5 || q.x === 8 ? -.8 : 0) });
    F.add({ mat: 'w.ruin', prof: 'round', bw: 1, grp: 'drumtop', shapes: [E([7, 13.6], 3.6, 1.2)] });
    F.add({ mat: 'bronze', prof: 'round', bw: 1.2, grp: 'bowl', shapes: [P([[1.6, 8.8], [12.4, 8.8], [10.4, 12.8], [3.6, 12.8]])], tex: q => (hash(q.x, q.y, 111) < .25 ? { m: 'verdigris', dd: 0 } : 0) });
    if (lit) flame(F, 7, 9.2, f, 1); else F.add({ mat: 'w.char', prof: 'round', bw: .6, grp: 'ash', shapes: [E([7, 9], 3.6, 1)] });
    return;
  }
  if (look === 'hullfire') { // the Wreck Fire: a fire-pit dug in the lee of a beached boat's broken hull (24 x 20)
    F.add({ mat: 'w.wreck', prof: 'round', bw: 1.6, grp: 'hull', shapes: [P([[1, 17.6], [2, 10], [6, 5.4], [12.4, 4], [19, 5.4], [22.6, 9.6], [23, 17.6], [18, 12.6], [12, 11.4], [6, 12.6]])], tex: q => ((q.y + (q.x >> 2)) % 3 === 0 ? -1 : 0) });
    F.add({ mat: 'bogwood', prof: 'round', bw: .5, grp: 'ribs', shapes: [C([5, 13], [4.4, 7.6], .5), C([19, 13], [19.6, 7.6], .5)] });
    F.add({ mat: 'w.silt', prof: 'round', bw: 1, grp: 'pit', shapes: [E([12, 16.8], 5.6, 2.2)] });
    logs(F, 12, 16.4, !lit);
    if (lit) flame(F, 12, 16, f, 1); else F.add({ mat: 'w.char', prof: 'round', bw: .6, grp: 'ash', shapes: [E([12, 16.4], 3, 1)] });
    return;
  }
  // ironbeacon, the Flats Beacon: the barge-camp's tall iron beacon, a fire-basket on a braced iron mast (16 x 32)
  F.add({ mat: 'w.fenstone', prof: 'round', bw: 1, grp: 'footing', shapes: [E([8, 30.4], 5.6, 1.6)] });
  F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'legs', shapes: [C([3.4, 30.6], [7.2, 10], .6), C([12.6, 30.6], [8.8, 10], .6), C([8, 30.6], [8, 10], .55)] });
  F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'bracing', noShadow: true, shapes: [C([4.4, 25], [11.4, 20], .35), C([11.6, 25], [4.8, 20], .35), C([5.6, 16], [10.4, 16], .35)] });
  F.add({ mat: 'blackiron', prof: 'round', bw: .6, grp: 'basket', shapes: [C([2.8, 3.6], [5.4, 9.8], .55), C([13.2, 3.6], [10.6, 9.8], .55), C([8, 3.8], [8, 9.8], .5), C([3, 6], [13, 6], .45), C([4.6, 9.6], [11.4, 9.6], .55)] });
  logs(F, 8, 8.6, !lit);
  if (lit) flame(F, 8, 7.6, f, 1.15); else F.add({ mat: 'w.ash', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8, 7.8], 3.4, .9)] });
}
/* ---- M7: the Hearth Below's gate, props, signs and Hearthfires (spec §6.1; the names the maps use, spec §2.3-§2.5).
   A big prop (the First Sleeper, the Worldforge, the great anvil) is one sprite, drawn once at its foot: place it with `at` (not
   `area`: an area draws its sprite on every tile) and make the tiles under it solid in the rows. Each is drawn to the footprint the
   maps give it (notes/M7-P2-maps.md): the Sleeper fills its hollow round its foot, the Worldforge stands up the forge's east wall
   from its foot with its mouth on its west side two rows above the step, and the anvil stands over its footing. ---- */
const BELOW_OBJ = new Set(['hollow-gate', 'vault-stair', 'vault-boxes', 'vault-boxes-open', 'sleeper-first', 'worldforge', 'great-anvil',
  'node', 'open-slab']); // Thareia (T2): drawn in the same switch
const BELOW_ANIM = new Set(['hollow-gate', 'sleeper-first', 'worldforge', 'great-anvil']); // two frames while shut (a prop is always 'closed')
// Thareia (T2): the node (48 x 64): a stone dais, roots gripping it, and a cluster of crystal as tall as a door, white-hot
// (radiant) until it is cooled, then a steady gold (amber); it pulses (2 frames) either way
function nodeProp(F, st, f, W, H) {
  const B = H - 1, hot = st !== 'gold', glass = hot ? 'radiant' : 'amber';
  F.add({ mat: 'granite', prof: 'bevel', bw: 1.4, grp: 'dais', shapes: [E([24, B - 5], 23, 5.6)], tex: q => (q.y > B - 4 ? -.8 : (q.x + q.y) % 7 === 0 ? -.6 : 0) });
  F.add({ mat: 'granite', prof: 'bevel', bw: 1, grp: 'step', shapes: [E([24, B - 8], 18, 4.4)], tex: q => ((q.x * 3 + q.y) % 11 === 0 ? -.8 : .2) });
  F.add({ mat: hot ? 'amber' : 'gold', prof: 'flat', grp: 'script', noShadow: true, noOutline: true, shapes: [3, 9, 15, 33, 39, 45].map(x => RECT(x, B - 4.6, x + 1.6, B - 3.8)), tex: () => (hot ? .4 : -.2) });
  const roots = [[[20, B - 12], [4, B - 6]], [[21, B - 11], [10, B - 2]], [[28, B - 12], [44, B - 5]], [[27, B - 11], [36, B - 1]], [[24, B - 12], [25, B]]];
  F.add({ mat: 'bark', prof: 'round', bw: 1, grp: 'roots', shapes: roots.map(([a, b]) => C(a, b, 2, .8)), tex: q => ((q.x + q.y) % 5 === 0 ? -.8 : 0) });
  const k = f ? 1.04 : 1, sh = (pts) => P(pts.map(([x, y]) => [24 + (x - 24) * k, B - 10 - (B - 10 - y) * k]));
  const shards = [
    sh([[14, B - 10], [12, B - 30], [15, B - 36], [19, B - 12]]),
    sh([[31, B - 10], [34, B - 28], [37, B - 32], [36, B - 10]]),
    sh([[18, B - 9], [19, B - 44], [24, B - 58], [29, B - 42], [30, B - 9]]),
    sh([[9, B - 9], [8, B - 20], [11, B - 23], [13, B - 9]]),
    sh([[35, B - 9], [38, B - 22], [41, B - 19], [40, B - 9]]),
  ];
  F.add({ mat: glass, prof: 'bevel', bw: 1.4, grp: 'crystal', shapes: shards, tex: q => (q.x < 24 ? .5 : -.3) + ((q.x * 2 + q.y) % 9 === 0 ? .4 : 0) });
  F.add({ mat: hot ? 'radiant' : 'topaz', prof: 'flat', grp: 'core', noShadow: true, noOutline: true, shapes: [E([24, B - 26], f ? 4.4 : 3.6, f ? 12 : 10.5)], tex: () => (hot ? 1.3 : .6) });
  F.add({ mat: 'bark', prof: 'round', bw: .8, grp: 'grip', shapes: [C([17, B - 12], [21, B - 24], 1.2, .7), C([31, B - 12], [27, B - 22], 1.2, .7)] });
  return 'halo';
}
// the node over a painted map: only its light, a soft round glow laid over the painting's own crystal (192 x 176, foot 6 px up)
function nodeGlow(st, f) {
  const W = 192, H = 176, cx = 96, cy = 86, hot = st !== 'gold';
  const r = (hot ? 88 : 80) * (f ? 1.05 : 1), peak = (hot ? .62 : .34) * (f ? .88 : 1);
  const inner = hot ? [255, 252, 236] : [255, 214, 120], outer = hot ? [255, 222, 150] : [238, 160, 60];
  const img = new ImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = Math.hypot(x - cx, (y - cy) * 1.12) / r;
    if (t >= 1) continue;
    const a = peak * (1 - t) * (1 - t) + (bayer(x, y) - .5) * .02, i = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) d[i + c] = inner[c] + (outer[c] - inner[c]) * t;
    d[i + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
  img.anchors = { foot: [cx, H - 7] };
  img.frames = 2;
  return img;
}
const BELOW_SIGNS = new Set(['chain', 'chair-tree', 'chair-sun', 'chair-anvil', 'chair-lantern', 'heart-step']);
const BELOW_HEARTH = new Set(['undercoal', 'chainfire']);
Object.assign(HEARTH_SIZE, { undercoal: [28, 28], chainfire: [16, 32] });
// a great chain from a to b: flat rings and links on edge in turn (the Deep's chains, the web over the Sleeper, the Chain Fire's)
function chainLinks(F, a, b, { n = 0, r = 2.2, mat = 'iron', grp = 'chain', rust = .12, tex = null } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = n || Math.max(2, Math.round(L / (r * 2.1))), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  const flat = [], edge = [];
  for (let i = 0; i < k; i++) {
    const t = (i + .5) / k, c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], s = L / k * .62;
    if (i % 2) edge.push(C([c[0] - u[0] * s, c[1] - u[1] * s], [c[0] + u[0] * s, c[1] + u[1] * s], r * .42));
    else flat.push(P([0, 1, 2, 3, 4, 5, 6, 7].map(j => { const q = j * Math.PI / 4, px = Math.cos(q) * s * 1.05, py = Math.sin(q) * r * .85; return [c[0] + u[0] * px - u[1] * py, c[1] + u[1] * px + u[0] * py]; })));
  }
  const rt = tex || (q => (hash(q.x, q.y, 10100) < rust ? { m: 'rust', dd: -.6 } : 0));
  if (flat.length) F.add({ mat, prof: 'round', bw: r * .55, grp: grp + 'f', shapes: flat, cuts: flat.map(p => { const cx = p.pts.reduce((s2, q) => s2 + q[0], 0) / 8, cy = p.pts.reduce((s2, q) => s2 + q[1], 0) / 8; return E([cx, cy], Math.max(.6, r * .5), Math.max(.4, r * .32)); }), tex: rt });
  if (edge.length) F.add({ mat, prof: 'round', bw: r * .4, grp: grp + 'e', shapes: edge, tex: q => rt(q) || -.2 });
}
function belowObjectParts(F, kind, st, f, o, W, H) {
  const B = H - 1, open = st === 'open';
  switch (kind) {
    case 'hollow-gate': { // a line of soot across the floor, and the gift's violet-black light standing up out of it that will not let you
      // cross; laid a tile at a time across an east-west way, so each piece is a length of the line running down the tile. Open, the
      // soot is scuffed through and the light is gone
      const T0 = H - 16;
      if (open) { F.add({ mat: 'w.soot', prof: 'flat', grp: 'soot', noShadow: true, noOutline: true, shapes: [E([7, T0 + 3], 2.2, 1.6), E([9.4, T0 + 7.6], 1.6, 1.2), E([6.6, T0 + 12.4], 2, 1.3)], tex: q => (hash(q.x, q.y, 10110) < .3 ? -1.2 : -.4) }); return; }
      F.add({ mat: 'w.soot', prof: 'flat', grp: 'soot', noShadow: true, noOutline: true, shapes: [P([[4.4, T0 - .6], [11.6, T0 - .6], [12, T0 + 5], [11.4, T0 + 10], [11.8, B + 1], [4.2, B + 1], [4.6, T0 + 11], [4, T0 + 5]])],
        tex: q => (Math.abs(q.x + .5 - 8) < 1.6 ? -1.6 : -.5) + (hash(q.x, q.y, 10111) < .2 ? -.8 : 0) });
      // the curtain: a sheet of the light over the line, thickest at its foot, thinning upward in dithered strands
      F.add({ mat: 'w.hollowlight', prof: 'flat', grp: 'sheet', noShadow: true, noOutline: true, shapes: [RECT(5, -1, 11, B + 1)], tex: q => {
        const up = (B - q.y) / (B + 1), strand = Math.abs(((q.x + Math.round(Math.sin((q.y + (f ? 3 : 0)) / 2.6))) % 3)) === 1;
        if (hash(q.x, q.y + (f ? 7 : 0), 10112) < up * (strand ? .35 : .75)) return -9;
        return (strand ? .1 : -.9) - up * 1.2 + (q.y > T0 + 8 ? .3 : 0);
      } });
      F.add({ mat: 'w.hollowlight', prof: 'flat', grp: 'motes', noShadow: true, noOutline: true, shapes: (f ? [[3.6, 7], [12.4, 11.6], [8.4, 1.4]] : [[12.4, 5], [3.6, 13], [7.4, 4]]).map(([x, y]) => O([x, y], .6)), tex: () => .4 });
      return 'halo';
    }
    case 'vault-stair': { // a stair going down through the vault's floor: the cut edge of the stone, the steps falling into the dark, the
      // hollow light far down (no side walls, so the stair's two tiles make one wide stair)
      F.add({ mat: 'w.firstage', prof: 'flat', grp: 'lip', noShadow: true, noOutline: true, shapes: [RECT(-1, 0, 17, 2)], tex: q => (q.y === 0 ? .4 : -1.2) });
      for (let k = 0; k < 4; k++) { const y0 = 2 + k * 3.4; F.add({ mat: 'w.firstage', prof: 'flat', grp: 'step' + k, noShadow: true, noOutline: true, shapes: [RECT(-1, y0, 17, y0 + 3.4)], tex: q => (q.y === Math.ceil(y0) ? .7 : q.y === Math.ceil(y0) + 2 ? -2 : -.9) - k * .5 + bayer(q.x, q.y) * .15 }); }
      F.add({ mat: 'dark', prof: 'flat', grp: 'below', noShadow: true, noOutline: true, shapes: [RECT(-1, 15.2, 17, 17)], tex: () => -1 });
      F.add({ mat: 'w.hollowlight', prof: 'flat', grp: 'far', noShadow: true, noOutline: true, shapes: [RECT(3, 14, 13, 15)], tex: q => ((q.x & 1) ? -2.2 : -1.8) });
      return;
    }
    case 'vault-boxes': case 'vault-boxes-open': { // two of the four gift boxes on the vault's back row (the prop's two tiles hold four): old
      // wood bound with black iron, each sealed with a smear of soot, a violet-black thread of light at the seam; opened, their lids
      // stand back, they are empty, and the soot lies broken on the floor
      const opened = kind === 'vault-boxes-open';
      F.add({ mat: 'w.soot', prof: 'flat', grp: 'floor', noShadow: true, noOutline: true, shapes: [E([8, B - .8], 7.4, 1.6)], tex: q => (hash(q.x, q.y, 10120) < .4 ? -1.4 : -.8) });
      for (const [x0, y0, w, h, i] of [[1, 9.4, 7, 7.2, 0], [8.6, 10.8, 6.4, 6.6, 1]]) {
        const x1 = x0 + w, y1 = y0 + h;
        F.add({ mat: 'bogwood', prof: 'bevel', bw: .8, grp: 'box' + i, shapes: [RECT(x0, y0, x1, y1)], tex: q => ((q.y - Math.floor(y0)) % 3 === 0 ? -.8 : 0) });
        F.add({ mat: 'blackiron', prof: 'round', bw: .4, grp: 'bands' + i, noShadow: true, shapes: [RECT(x0, y0, x0 + 1, y1), RECT(x1 - 1, y0, x1, y1)] });
        if (opened) {
          F.add({ mat: 'dark', prof: 'flat', grp: 'inside' + i, noShadow: true, shapes: [RECT(x0 + 1, y0, x1 - 1, y0 + 1.8)] });
          F.add({ mat: 'bogwood', prof: 'bevel', bw: .6, grp: 'lid' + i, shapes: [P([[x0 + .4, y0], [x1 - .4, y0], [x1 - 1, y0 - 3.6], [x0 + 1, y0 - 3.6]])], tex: q => (q.y % 2 ? -.6 : 0) });
        } else {
          F.add({ mat: 'bogwood', prof: 'bevel', bw: .6, grp: 'lid' + i, shapes: [RECT(x0 - .3, y0 - 1.6, x1 + .3, y0 + .6)] });
          F.add({ mat: 'w.soot', prof: 'round', bw: .6, grp: 'seal' + i, shapes: [E([(x0 + x1) / 2, y0 + 2.2], 1.8, 1.4), C([(x0 + x1) / 2 - 1.4, y0 + .2], [(x0 + x1) / 2 + 1.2, y0 + 3.8], .5)], tex: () => -.6 });
          F.add({ mat: 'w.hollowlight', prof: 'flat', grp: 'seam' + i, noShadow: true, noOutline: true, shapes: [RECT(x0 + 1.4, y0 + .2, x0 + 3, y0 + .9)], tex: () => -.8 });
        }
      }
      if (opened) F.add({ mat: 'w.soot', prof: 'flat', grp: 'broken', noShadow: true, noOutline: true, shapes: [O([3.4, B - .4], .8), O([12.6, B - .2], .7), O([7.6, B + .1], .6)], tex: () => -.6 });
      return;
    }
    case 'sleeper-first': return firstSleeper(F, f, W, H);
    case 'worldforge': return worldforge(F, f, W, H);
    case 'node': return nodeProp(F, st, f, W, H);
    case 'open-slab': { // Thareia (T2): Fawnrest's court, a paving slab pushed aside off a dark stair going down
      F.add({ mat: 'dark', prof: 'flat', grp: 'hole', shapes: [RECT(1.6, 4, 11, 14.6)], tex: () => -1 });
      F.add({ mat: 'granite', prof: 'bevel', bw: .6, grp: 'steps', shapes: [RECT(2.4, 6.6, 10.2, 7.8), RECT(2.4, 9.6, 10.2, 10.8), RECT(2.4, 12.6, 10.2, 13.8)], tex: q => (q.y > 12 ? -1.2 : q.y > 9 ? -.8 : -.3) });
      F.add({ mat: 'granite', prof: 'bevel', bw: 1, grp: 'slab', shapes: [P([[10.4, 2.6], [15.6, 4.4], [15.6, 15.4], [10.4, 13.8]])], tex: q => ((q.x + q.y) % 5 === 0 ? -1 : .2) });
      F.add({ mat: 'moss', prof: 'flat', grp: 'moss', noShadow: true, noOutline: true, shapes: [O([12.6, 5.2], .8), O([14.6, 12.6], .7)], tex: () => -.4 });
      return;
    }
    case 'great-anvil': { // the great anvil: black iron on a stepped plinth, its face worn bright, a bar of metal glowing on it
      F.add({ mat: 'w.firebrick', prof: 'bevel', bw: 1, grp: 'plinth', shapes: [RECT(8, B - 5.4, 40, B + .4)], tex: q => ((q.y & 1) === 0 || (q.x + ((q.y >> 1) & 1) * 2) % 5 === 0 ? -1.1 : -.2) });
      F.add({ mat: 'blackiron', prof: 'round', bw: 1.6, grp: 'waist', shapes: [P([[15, B - 5], [17, 21], [31, 21], [33, B - 5]])], tex: q => (q.y % 4 === 0 ? -.6 : 0) });
      F.add({ mat: 'blackiron', prof: 'round', bw: 2, grp: 'body', shapes: [P([[1, 12.4], [6, 10.6], [9, 9], [42, 9], [46, 12], [44, 15.6], [37, 17.4], [33, 21.6], [15, 21.6], [11, 17.6], [6, 15]])], tex: q => (q.y <= 10 ? .9 : q.y === 11 ? .2 : 0) + (hash(q.x, q.y, 10130) < .05 ? -.8 : 0) });
      F.add({ mat: 'iron', prof: 'round', bw: .5, grp: 'hardy', noShadow: true, shapes: [RECT(37.4, 9.4, 39.4, 10.8)] });
      F.add({ mat: 'w.molten', prof: 'round', bw: 1, grp: 'bar', noShadow: true, shapes: [C([15, 7.6], [29, 7.9], 1.2)], tex: q => (q.x < 19 ? .4 : 0) + (f ? .3 : -.2) });
      F.add({ mat: 'w.molten', prof: 'flat', grp: 'sparks', noShadow: true, noOutline: true, shapes: (f ? [[30.6, 4.4], [33.4, 2.4], [27, 1.6]] : [[31.6, 5.2], [26, 3], [34, 4]]).map(([x, y]) => O([x, y], .5)), tex: () => .6 });
      return 'halo';
    }
  }
}
// the First Sleeper (240 x 152, its foot 44 px above its bottom edge, so that at its `at` it lies in the middle of its hollow): the
// oldest thing in Aethermoor, asleep, curled like a low hill of dark stone and old ember, its back to the roof, its head laid low at
// the front with one enormous eye shut, its tail wrapped round; its heart glows slow and red through its flank (2 frames). A web of
// great chains pins it down, made fast to stakes all round the hollow: the long chain down its back runs on out of its bottom edge
// to the south tunnel, and two more run out of its lower corners to the south-west and south-east ones (where the chains' 'Y'
// tiles take them on). The Eternal Hearth's black iron roots come down out of the dark and are sunk in its back, like a tap in a
// tree. Kin to Hush and Lull, but whole, in the open
function firstSleeper(F, f, W, H) {
  const hide = q => ((q.x * 3 + q.y * 7) % 37 === 0 ? .7 : (q.x + q.y * 2) % 19 === 0 ? -.8 : 0) + (q.y > 112 ? -.5 : 0);
  F.add({ mat: 'dark', prof: 'flat', grp: 'shade', noOutline: true, noShadow: true, shapes: [E([124, 132], 108, 18)], tex: () => -1.4 });
  // the tail, wrapped round the front from the haunch
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 6, grp: 'tail', shapes: [C([206, 96], [186, 128], 14, 12), C([186, 128], [134, 140], 12, 10), C([134, 140], [88, 138], 10, 7), C([88, 138], [48, 130], 7, 3)], tex: hide });
  // the back and the haunch, the neck going down to the head
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 18, grp: 'body', shapes: [E([138, 78], 78, 46), E([190, 82], 34, 38), C([102, 86], [68, 102], 28, 20)], tex: hide });
  // old ember in the stone of its back: seams glowing faintly
  F.add({ mat: 'w.heartglow', prof: 'flat', grp: 'seams', noShadow: true, noOutline: true, shapes: [C([108, 52], [122, 60], .6), C([122, 60], [130, 56], .55), C([160, 46], [168, 58], .6), C([168, 58], [182, 62], .55), C([196, 72], [204, 88], .6), C([146, 116], [160, 120], .55)], tex: () => (f ? -1.9 : -2.3) });
  // plates along the spine, over the curve of the back
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 2.6, grp: 'ridge', noShadow: true, shapes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => { const a = Math.PI * (1.08 + i * .09); return E([140 + Math.cos(a) * 72, 82 + Math.sin(a) * 46], 5 - Math.abs(i - 4.5) * .3, 3); }), tex: () => .9 });
  // a forelimb folded under the chin, its claws
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 4.5, grp: 'limb', shapes: [C([90, 110], [74, 124], 11, 8), E([64, 126], 14, 6)], tex: hide });
  F.add({ mat: 'w.sleeperhide', prof: 'ridge', grp: 'claws', shapes: [[48, 128], [53.6, 130.4], [59, 131.6]].map(([x, y]) => P([[x + 2, y - 2], [x - 3, y + .6], [x + 1.4, y + 1.8]])), tex: () => .6 });
  // the head, laid low on the forelimb: a great wedge of a skull, horns swept back over the neck, a heavy brow over the enormous
  // eye, shut, the long lid lit along its fold; the nostril, the line of the jaw
  const head = P([[6, 114], [7, 104], [18, 94], [40, 86], [66, 82], [86, 88], [94, 100], [88, 116], [66, 124], [36, 125], [14, 122]]);
  F.add({ mat: 'dark', prof: 'flat', grp: 'headshade', noOutline: true, noShadow: true, shapes: [P(head.pts.map(([x, y]) => [x + 2, y + 3]))], tex: () => -.8 });
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 3.6, grp: 'horns', shapes: [C([74, 88], [100, 70], 6.4, 3), C([100, 70], [118, 66], 3, .8), C([60, 86], [80, 66], 4.6, 2), C([80, 66], [92, 60], 2, .6)], tex: q => (((q.x + q.y * 2) >> 1) % 3 === 0 ? -.6 : .5) });
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 8, grp: 'head', shapes: [head], tex: q => hide(q) + .35 - (q.y > 112 ? .3 : 0) });
  F.add({ mat: 'w.sleeperhide', prof: 'round', bw: 2.6, grp: 'brow', shapes: [C([22, 97], [50, 89], 4.2, 3.6), C([50, 89], [74, 91], 3.6, 2.4)], tex: () => .9 });
  F.add({ mat: 'dark', prof: 'flat', grp: 'socket', noShadow: true, noOutline: true, shapes: [C([30, 101], [52, 96.4], 2.4, 2.8), C([52, 96.4], [70, 99], 2.8, 1.6)], tex: () => -.6 });
  F.add({ mat: 'w.sleeperhide', prof: 'flat', grp: 'lid', noShadow: true, noOutline: true, shapes: [C([31, 101.4], [52, 97.2], 1.3), C([52, 97.2], [69, 99.6], 1.3)], tex: () => 1.5 });
  F.add({ mat: 'dark', prof: 'flat', grp: 'eye', noShadow: true, noOutline: true, shapes: [C([30, 103], [52, 99.4], .9), C([52, 99.4], [70, 101.4], .8)] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'wrinkles', noShadow: true, noOutline: true, shapes: [C([36, 108], [50, 106], .6), C([56, 107], [66, 109], .6), C([72, 94], [80, 100], .6)] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'nostril', noShadow: true, noOutline: true, shapes: [E([13, 106], 2.2, 1.4), C([10, 116], [44, 119], .8)] });
  // the heart, slow and red, glowing through the flank, a little of its light along the veins near it
  const hc = [148, 96];
  F.add({ mat: 'w.heartglow', prof: 'flat', grp: 'veins', noShadow: true, noOutline: true, shapes: [C(hc, [132, 86], .7), C([132, 86], [122, 90], .6), C(hc, [168, 102], .7), C([168, 102], [174, 112], .6), C(hc, [150, 112], .6)], tex: () => (f ? -.9 : -1.7) });
  F.add({ mat: 'w.heartglow', prof: 'round', bw: 4.5, grp: 'heart', noShadow: true, noOutline: true, shapes: [O(hc, f ? 9.6 : 7.6)], tex: q => (Math.hypot(q.x - hc[0], q.y - hc[1]) < 3.6 ? .9 : .1) + (f ? .3 : -.4) });
  // the hearth's black iron roots come down out of the dark and are sunk in its back, embers where they go in
  const roots = [[[102, -2], [108, 18], [112, 40]], [[146, -2], [142, 14], [146, 34]], [[192, -2], [186, 24], [180, 48]]];
  roots.forEach((pts, i) => F.add({ mat: 'w.ironroot', prof: 'round', bw: 3.4, grp: 'root' + i, shapes: [C(pts[0], pts[1], 8, 6.6), C(pts[1], pts[2], 6.6, 4.2)], tex: q => ((q.x * 2 + (q.y >> 1)) % 5 === 0 ? -.9 : 0) }));
  F.add({ mat: 'ember', prof: 'flat', grp: 'wounds', noShadow: true, noOutline: true, shapes: roots.map(pts => E([pts[2][0], pts[2][1] + 3], 4.6, 2)), tex: () => (f ? .1 : -.6) });
  // the web of great chains over it, each made fast to a stake at the hollow's rim
  const web = [
    [[136, -2], [138, 34], [132, 74], [124, 116], [120, 153]], // down its back, and on out to the south tunnel
    [[-2, 6], [58, 42], [130, 36], [200, 44], [242, 58]], // over its back, rim to rim
    [[-2, 78], [48, 72], [100, 60], [150, 58]], // from a stake on the west rim, over its neck
    [[-2, 142], [34, 136], [76, 120], [104, 100]], // from a stake at the west rim's foot, over its limb
    [[-2, 153], [40, 146], [92, 132], [150, 104]], // on out to the south-west tunnel
    [[242, 126], [214, 112], [196, 76], [170, 54]], // from the stake on the east rim
    [[242, 153], [210, 140], [178, 116]], // on out to the south-east tunnel
  ];
  web.forEach((pts, i) => { for (let j = 0; j < pts.length - 1; j++) chainLinks(F, pts[j], pts[j + 1], { r: 4.4, grp: 'web' + i + '-' + j, rust: .08 }); });
  return 'halo';
}
// the Worldforge (112 x 240): against the forge's east wall, a furnace as big as a house in the shape of a great heart, black iron
// plates riveted over firebrick, its point set in a pedestal of firebrick; its open mouth blazes white-gold low on its west side (2
// frames), over the step where the forge's heart is kept, the fire licking out toward it; a flue goes up out of its cleft into the
// dark, and molten metal runs away from it: out of its pedestal to the south, and from its west lobe to the north, where the forge
// floor's channels take it on
function worldforge(F, f, W, H) {
  const B = H - 1, flow = q => (((q.y + (f ? 3 : 0)) % 7) < 2 ? .5 : 0) + ((q.x + q.y) % 5 === 0 ? -.4 : 0);
  F.add({ mat: 'w.molten', prof: 'flat', grp: 'channels', noShadow: true, noOutline: true, shapes: [RECT(36, 196, 60, B + 1), RECT(20, -1, 40, 76)], tex: flow });
  F.add({ mat: 'w.firebrick', prof: 'bevel', bw: .8, grp: 'banks', shapes: [RECT(32, 196, 36, B + 1), RECT(60, 196, 64, B + 1), RECT(16, -1, 20, 76), RECT(40, -1, 44, 70)], tex: q => (q.y % 3 === 0 ? -1 : -.3) });
  // the pedestal of firebrick the heart's point is set in
  F.add({ mat: 'w.firebrick', prof: 'bevel', bw: 1.4, grp: 'pedestal', shapes: [P([[22, 212], [30, 174], [104, 174], [110, 212]])], tex: q => ((q.y & 1) === 0 || (q.x + ((q.y >> 1) & 1) * 2) % 5 === 0 ? -1.1 : -.3) + (q.y > 204 ? -.6 : 0) });
  F.add({ mat: 'blackiron', prof: 'bevel', bw: 1, grp: 'pedtop', shapes: [RECT(28, 170, 106, 176)], tex: q => (q.x % 6 === 0 ? { m: 'iron', dd: .4 } : 0) });
  // the flue out of the cleft, up into the dark
  F.add({ mat: 'blackiron', prof: 'round', bw: 2.4, grp: 'flue', shapes: [RECT(60, -1, 78, 76)], tex: q => (q.y % 8 === 0 ? { m: 'iron', dd: -.3 } : q.x === 63 ? .4 : 0) });
  // the heart: black iron plates riveted over firebrick, a course of the brick showing, vents glowing in the east lobe
  F.add({ mat: 'blackiron', prof: 'round', bw: 8, grp: 'heart', shapes: [O([52, 96], 27), O([86, 96], 27), P([[25, 102], [113, 102], [76, 182], [69, 190], [62, 182]])], tex: q => {
    if (q.y % 16 === 7) return { m: 'iron', dd: -.2 };
    if (q.y % 16 === 8 && q.x % 5 === 0) return { m: 'iron', dd: .6 };
    if (q.y > 150 && q.y < 160) return { m: 'w.firebrick', dd: ((q.x + (q.y >> 1)) % 4 === 0 || q.y % 2 === 0 ? -1.2 : -.2) };
    return (q.x % 22 === 0 ? -.8 : 0) + (hash(q.x >> 2, q.y >> 2, 10150) < .08 ? -.6 : 0);
  } });
  F.add({ mat: 'w.molten', prof: 'flat', grp: 'vents', noShadow: true, noOutline: true, shapes: [RECT(80, 88, 102, 90), RECT(80, 95, 104, 97), RECT(82, 102, 102, 104)], tex: () => (f ? -.6 : -1.2) });
  F.add({ mat: 'dark', prof: 'flat', grp: 'cleft', noShadow: true, noOutline: true, shapes: [C([69, 72], [69, 88], 1)] });
  // the mouth, low on the west side: an arch of firebrick open on the fire, blazing white-gold, flames standing in it
  F.add({ mat: 'w.firebrick', prof: 'bevel', bw: 1.4, grp: 'arch', shapes: [P([[28, 150], [28, 118], [35, 106], [50, 101], [62, 108], [66, 124], [64, 150]])], tex: q => ((q.x + q.y) % 3 === 0 ? -1 : 0) });
  F.add({ mat: 'w.whitegold', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [P([[31, 148], [31, 120], [37, 110], [49, 106], [58, 112], [61, 126], [60, 148]])], tex: q => (q.y > 132 ? .8 : .3) + (f ? .3 : 0) + ((q.x + q.y + (f ? 1 : 0)) % 5 === 0 ? -.5 : 0) });
  F.add({ mat: 'w.molten', prof: 'round', bw: 2.2, grp: 'flames', noShadow: true, shapes: (f ? [[37, 132, 4], [46, 124, 5], [54, 130, 4]] : [[38, 128, 4], [47, 126, 4.6], [55, 127, 4.2]]).map(([x, y, r]) => P([[x - r, 148], [x - r * .6, y + r], [x, y - r * 1.4], [x + r * .6, y + r], [x + r, 148]])), tex: q => (q.y > 140 ? .6 : -.2) });
  // the fire licks out of the mouth to the west, over the step
  F.add({ mat: 'w.molten', prof: 'round', bw: 1.2, grp: 'lick', noShadow: true, shapes: (f ? [[30, 128, 16, 124, 4], [30, 142, 12, 144, 3.4]] : [[30, 132, 14, 131, 3.6], [30, 144, 18, 147, 3]]).map(([a, b, c, d, w]) => P([[a, b - w], [(a + c) / 2, b - w * .5 + (d - b) * .4], [c, d], [(a + c) / 2 + 2, b + w * .4 + (d - b) * .5], [a, b + w]])), tex: q => (q.x > 24 ? .5 : -.3) });
  return 'halo';
}
// the Hearth Below's sign looks: a great chain made fast in the rock at a tunnel's mouth, running off toward the web; the four
// First-Age chairs, each on its dais, its back carved with its region's mark; the step before the Worldforge's mouth
function belowSign(F, st, f) {
  const B = 23;
  if (st === 'heart-step') { // 16 x 16: a step of firebrick with an iron nosing, the furnace's heat in its cracks
    F.add({ mat: 'w.firebrick', prof: 'bevel', bw: 1, grp: 'step', shapes: [RECT(.4, 5, 15.6, 15.6)], tex: q => ((q.y & 1) === 0 || (q.x + ((q.y >> 1) & 1) * 3) % 6 === 0 ? -1.1 : -.2) });
    F.add({ mat: 'iron', prof: 'bevel', bw: .6, grp: 'nosing', shapes: [RECT(0, 3.6, 16, 5.8)] });
    F.add({ mat: 'w.molten', prof: 'flat', grp: 'heat', noShadow: true, noOutline: true, shapes: [C([4, 9], [7, 11], .4), C([10.6, 12], [12.4, 9.6], .4)], tex: () => -1.4 });
    return;
  }
  if (st === 'chain') { // 16 x 24
    F.add({ mat: 'w.fused', prof: 'bevel', bw: 1, grp: 'block', shapes: [P([[2, B + .4], [3, 17.4], [13, 17], [14, B + .4]])], tex: q => (q.y === 19 ? -1 : 0) });
    F.add({ mat: 'blackiron', prof: 'round', bw: .8, grp: 'staple', shapes: [O([8, 17.6], 2.6)], cuts: [O([8, 17.6], 1.3)] });
    chainLinks(F, [8, 15.8], [8.6, -3], { n: 3, r: 3.6, grp: 'chain' });
    return;
  }
  // the chairs (24 x 32): a great stone chair on its dais, its high back carved with its region's mark, a violet-black light
  // clinging to the seat as if someone rose from it a moment ago
  const b = 31;
  F.add({ mat: 'w.firstage', prof: 'bevel', bw: 1, grp: 'dais', shapes: [RECT(0, 26, 24, b + .4)], tex: q => (q.y === 27 ? .4 : -.4) });
  F.add({ mat: 'w.firstage', prof: 'bevel', bw: 1.4, grp: 'back', shapes: [P([[3.6, 22], [3.6, 5], [7.4, 1], [16.6, 1], [20.4, 5], [20.4, 22]])], tex: q => (q.x === 4 || q.y === 2 ? .3 : 0) + (q.y > 17 ? -.3 : 0) });
  F.add({ mat: 'w.firstage', prof: 'bevel', bw: 1, grp: 'seat', shapes: [RECT(2, 20, 22, 26.6)], tex: q => (q.y === 20 ? .5 : -.2) });
  F.add({ mat: 'w.firstage', prof: 'bevel', bw: .9, grp: 'arms', shapes: [RECT(.4, 14.6, 4.4, 26.6), RECT(19.6, 14.6, 23.6, 26.6)], tex: q => (q.y === 15 ? .4 : 0) });
  F.add({ mat: 'w.hollowlight', prof: 'flat', grp: 'light', noShadow: true, noOutline: true, shapes: [E([12, 21.6], 7.6, 1.6), E([12, 18.6], 5, 2.4)], tex: q => (q.y > 20 ? -1.3 : -2.1) + (hash(q.x, q.y, 10170) < .3 ? -.6 : 0) });
  const c = [12, 11], k = 1.45, at = ([x, y]) => [c[0] + (x - 8) * k, c[1] + (y - 8) * k];
  const mark = st === 'chair-tree' ? [C(at([8, 13]), at([8, 7.4]), .7), C(at([8, 9.6]), at([5.6, 7.4]), .55), C(at([8, 9.2]), at([10.4, 7]), .55), O(at([8, 5.6]), 3.2)]
    : st === 'chair-sun' ? [O(c, 3.2)].concat([0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return C([c[0] + Math.cos(a) * 4.6, c[1] + Math.sin(a) * 4.6], [c[0] + Math.cos(a) * 6.6, c[1] + Math.sin(a) * 6.6], .55); }))
      : st === 'chair-anvil' ? [P([at([4, 8.4]), at([8, 3.4]), at([12, 8.4])]), P([at([4.6, 10]), at([11.6, 10]), at([10.4, 11.4]), at([9.2, 11.4]), at([9.6, 12.8]), at([6.4, 12.8]), at([6.8, 11.4]), at([5.4, 11.4])])]
        : [RECT(...at([6.6, 6]), ...at([9.4, 10.6])), P([at([6, 6.2]), at([8, 4.6]), at([10, 6.2])]), C(at([4, 13]), at([4.6, 5.4]), .55), C(at([12, 13]), at([11.4, 6]), .55), C(at([3, 13]), at([2.8, 8.4]), .5)]; // the lantern among reeds
  const cuts = st === 'chair-sun' ? [O(c, 1.7)] : st === 'chair-lantern' ? [RECT(...at([7.4, 7]), ...at([8.6, 9.6]))] : undefined;
  F.add({ mat: 'w.firstage', prof: 'flat', grp: 'marklit', noShadow: true, noOutline: true, shapes: mark.map(sh => shiftShape(sh, .9, .9)), cuts: cuts && cuts.map(sh => shiftShape(sh, .9, .9)), tex: () => .45 });
  F.add({ mat: 'w.firstdark', prof: 'flat', grp: 'mark', noShadow: true, noOutline: true, shapes: mark, cuts, tex: () => -1.4 });
}
// a shape moved by (dx, dy) (a carving's lit lip is the carving itself, a pixel down and right, drawn under it)
const shiftShape = (sh, dx, dy) => (sh.k === 'p' ? P(sh.pts.map(([x, y]) => [x + dx, y + dy])) : sh.k === 'c' ? C([sh.a[0] + dx, sh.a[1] + dy], [sh.b[0] + dx, sh.b[1] + dy], sh.ra, sh.rb)
  : sh.k === 'o' ? O([sh.c[0] + dx, sh.c[1] + dy], sh.r) : E([sh.c[0] + dx, sh.c[1] + dy], sh.rx, sh.ry));
// the Hearth Below's Hearthfires: the Under-Coal (28 x 28), a coal the size of a cart in its niche, the hearth's iron roots gripping
// it, cracked right through and glowing when lit (cold, it is black and its cracks are dead); the Chain Fire (16 x 32), a fire in an iron
// brazier hung from a broken chain over its platform
function belowHearth(F, look, lit, f) {
  if (look === 'undercoal') { // 28 x 28: a lump of coal the size of a cart in its niche, all facets like anthracite, the hearth's iron
    // roots gripping it from the rock behind; lit, fire lives in its cracks and licks up out of them; cold, the cracks are dead and ash
    // lies on its shoulders
    F.add({ mat: 'dark', prof: 'flat', grp: 'shade', noOutline: true, noShadow: true, shapes: [E([14, 25.8], 13.4, 2.4)], tex: () => -1 });
    const grip = q => ((q.x + q.y) % 3 === 0 ? -.8 : 0);
    F.add({ mat: 'w.ironroot', prof: 'round', bw: 1.4, grp: 'rootsback', shapes: [C([-1, 3], [5, 9], 2.2, 1.8), C([5, 9], [5.4, 21], 1.8, 1.1), C([29, 2], [23, 8], 2.2, 1.8), C([23, 8], [23.6, 20], 1.8, 1.1)], tex: grip });
    const lump = P([[2, 25.6], [1.6, 19], [3.8, 13], [7.4, 8.6], [12.8, 5.4], [18.8, 5.8], [23.6, 9], [26.4, 14.6], [26.8, 20.4], [25.8, 25.6], [14, 27.4]]);
    const S = [[8, 11], [15, 9], [21, 12], [6, 19], [12.6, 16.4], [19.6, 19], [10, 24], [22.6, 24.4]]; // the facets, each flat like a cut face
    const cracks = [[[6.4, 13.4], [10.6, 16.2], [9.6, 21.6], [11, 26.4]], [[10.6, 16.2], [16.4, 13.6], [21.6, 17.4], [23.4, 25.4]], [[16.4, 13.6], [15.6, 7.4]], [[4, 21], [9.6, 21.6]], [[21.6, 17.4], [25.6, 15.6]]];
    F.add({ mat: 'w.soot', prof: 'bevel', bw: 1.6, grp: 'coal', shapes: [lump], tex: q => {
      let d1 = 99, d2 = 99, i1 = 0; S.forEach(([sx, sy], i) => { const d = Math.hypot(q.x + .5 - sx, q.y + .5 - sy); if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) d2 = d; });
      const [sx, sy] = S[i1], face = [1.3, 1.7, .6, .2, 1, 0, -.6, -.5][i1];
      if (d2 - d1 < .9 && q.x + .5 < sx) return face + .9; // a glossy edge where two facets meet
      return face + (q.x + .5 < sx && q.y + .5 < sy ? .3 : 0) + (hash(q.x, q.y, 10161) < .04 ? 1 : 0) - (q.y > 23 ? .5 : 0) + (lit ? .2 : 0);
    } });
    const sh = []; cracks.forEach(pts => { for (let i = 0; i < pts.length - 1; i++) sh.push(C(pts[i], pts[i + 1], .75, .55)); });
    F.add({ mat: 'dark', prof: 'flat', grp: 'cracks', noShadow: true, noOutline: true, shapes: sh.map(c => C([c.a[0] + .4, c.a[1] + .5], [c.b[0] + .4, c.b[1] + .5], c.ra + .3, c.rb + .3)), tex: () => -1.2 });
    F.add({ mat: 'w.ironroot', prof: 'round', bw: 1, grp: 'rootfront', shapes: [C([27, 6], [23.4, 10.4], 1.4, 1.1), C([23.4, 10.4], [19.6, 10], 1.1, .7)], tex: grip });
    if (!lit) { // cold: the cracks dead and black, grey ash on its shoulders
      F.add({ mat: 'dark', prof: 'flat', grp: 'deadcracks', noShadow: true, noOutline: true, shapes: sh, tex: () => -1.6 });
      F.add({ mat: 'w.ash', prof: 'round', bw: .6, grp: 'ash', shapes: [E([12.4, 6.6], 4.4, 1.2), E([19.4, 7.2], 3, 1), E([5.4, 11.8], 1.6, .8)], tex: () => -.2 });
      return;
    }
    F.add({ mat: 'ember', prof: 'flat', grp: 'fire', noShadow: true, noOutline: true, shapes: sh, tex: q => (f ? .4 : -.1) + ((q.x + q.y + f) % 4 === 0 ? .5 : 0) });
    F.add({ mat: 'w.molten', prof: 'flat', grp: 'core', noShadow: true, noOutline: true, shapes: [O([10.6, 16.2], .9), O([16.4, 13.6], .9), O([21.6, 17.4], .8)], tex: () => (f ? .5 : 0) });
    flame(F, 16, 13.2, f, .75); flame(F, 10.4, 15.8, 1 - f, .6); flame(F, 21.4, 16.8, f, .5);
    return 'halo';
  }
  // chainfire: the chain from above, the brazier hung crooked from it (its other chain broken and hanging), its shadow on the platform
  F.add({ mat: 'dark', prof: 'flat', grp: 'shadow', noOutline: true, noShadow: true, shapes: [E([8, 29.6], 5.2, 1.6)], tex: () => -1.2 });
  chainLinks(F, [9, -1], [9.2, 12.4], { n: 4, r: 1.7, grp: 'hang' });
  chainLinks(F, [3.4, 15], [2.4, 22.4], { n: 2, r: 1.4, grp: 'broken' });
  F.add({ mat: 'blackiron', prof: 'round', bw: .8, grp: 'bowl', shapes: [P([[2, 14.6], [15, 13.4], [12.8, 19.4], [4.6, 20]])], tex: q => (q.x % 3 === 0 ? -.6 : 0) });
  F.add({ mat: 'iron', prof: 'round', bw: .4, grp: 'rim', noShadow: true, shapes: [C([2, 14.6], [15, 13.4], .5)] });
  logs(F, 8.6, 14.6, !lit);
  if (lit) { flame(F, 8.6, 14, f, 1); return 'halo'; }
  F.add({ mat: 'w.ash', prof: 'round', bw: .6, grp: 'ash', shapes: [E([8.6, 14], 3.4, .9)] });
}
// Hush lies under the floor: its dark body thins out (dithered) toward its edge so the floor shows through; the glow, the
// ridges and the eye stay whole
function underIce(R) {
  const { w, h, own, emi, parts } = R, a = Uint8Array.from(own, o => (o >= 0 ? 1 : 0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!a[i] || emi[i] || parts[own[i]].grp !== 'body' && parts[own[i]].grp !== 'under') continue;
    let e = 9; for (let r = 1; r <= 8 && e === 9; r++) if (!a[Math.max(0, y - r) * w + x] || !a[Math.min(h - 1, y + r) * w + x] || !a[y * w + Math.max(0, x - r)] || !a[y * w + Math.min(w - 1, x + r)]) e = r;
    if (bayer(x, y) + .5 > Math.min(.9, e * .13)) own[i] = -1;
  }
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
  if (kind === 'node' && look === 'glow') { const s2 = states.includes(state) ? state : states[0]; return objCache.get(`node-glow|${s2}|${frame & 1}`, () => nodeGlow(s2, frame & 1)); }
  const frames = kind === 'node' || ANIM.has(kind) || lit || (kind === 'ford-ice' && st === 'stream') || (kind === 'deer' && st !== 'alert') || ((SUN_ANIM.has(kind) || IRON_ANIM.has(kind)) && st === 'closed')
    || (GLOOM_ANIM.has(kind) && st === 'closed') || GLOOM_ANIM_ANY.has(kind) || (kind === 'sign' && st === 'ward-stone') || (BELOW_ANIM.has(kind) && st === 'closed') ? 2 : 1;
  const f = frames > 1 ? frame & 1 : 0;
  const hl = kind === 'hearth' ? look || HEARTH_LOOKS[id] || 'ring' : look || '';
  const rk = relic && typeof relic === 'object' ? `${relic.uid || relic.base || relic.id || '?'}:${relic.temper || 0}` : relic || '';
  return objCache.get(`${kind}|${st}|${f}|${hl}|${rk}`, () => {
    const deep = kind === 'chasm' && hl !== 'floes'; // the rock chasm reaches over the void's lip above and its far face below
    const [W, Hh] = kind === 'hearth' && HEARTH_SIZE[hl] ? HEARTH_SIZE[hl] : kind === 'hearth' && TALL_HEARTH.has(hl) ? [16, 24] : kind === 'hearth' && hl === 'painted' ? [16, 32] : deep ? [16, 25] : OBJ_STATE_SIZE[kind + ':' + st] || OBJ_SIZE[kind] || [16, 16];
    const F = new Forge(W, Hh);
    const r = objectParts(F, kind, st, f, { look: hl, id }, W, Hh);
    const R = F.raster();
    for (let i = 0; i < R.idx.length; i++) if (R.own[i] >= 0 && R.idx[i] < 1) R.idx[i] = 1;
    if (kind === 'hush' || kind === 'sleeper') underIce(R);
    const img = compose(R, { glow: r === 'halo' || lit });
    if (kind === 'pedestal' && st === 'lit' && relic) { // the claimed relic floats over its pedestal
      const icon = itemIcon(relic, { size: 12 });
      if (icon) for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const i = (y * 12 + x) * 4; if (!icon.data[i + 3]) continue; const X = x + 2, Y = y; const j = (Y * W + X) * 4; img.data[j] = icon.data[i]; img.data[j + 1] = icon.data[i + 1]; img.data[j + 2] = icon.data[i + 2]; img.data[j + 3] = 255; }
    }
    img.anchors = { foot: [W >> 1, deep ? Hh - 8 : Hh - 1 - (FOOT_UP[kind] || 0)] };
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
