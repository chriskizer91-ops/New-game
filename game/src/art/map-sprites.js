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
import { lru } from './cache.js';

const P = pts => ({ k: 'p', pts });
const C = (a, b, ra, rb = ra) => ({ k: 'c', a, b, ra, rb });
const O = (c, r) => ({ k: 'o', c, r });
const E = (c, rx, ry) => ({ k: 'e', c, rx, ry });
const RECT = (x0, y0, x1, y1) => P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const A = (r, p) => ({ r, p });
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
  corra: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairBrown', hair: 'crop', eye: '#24381c', tunic: 'rags', cloak: 'hoodGreen', gloves: 'leather', boots: 'leatherDark' }, gear: { body: A('leather', { mat: 'leatherDark', shirt: 'rags', belt: 'leather' }), weapon: A('bow', { limb: 'bogwood', grip: 'leather' }) } },
  garret: { H: { build: 'human', skin: 'skinPale', hairMat: 'hairSilver', hair: 'short', beard: true, eye: '#2a2030', tunic: 'wool', cloak: 'wool', gloves: 'leather', boots: 'leather' }, gear: { head: A('kettle', { look: 'kettle', mat: 'iron' }), offhand: { look: 'lantern', metal: 'iron', glow: 'ember' } } },
  miravel: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairSilver', hair: 'long', ears: 'long', eye: '#5a3a10', mantle: 'moss', gloves: 'skinTan', boots: 'bark' }, gear: { weapon: A('staff', { style: 'gnarl', haft: 'bogwood', leaves: 'moss', glow: 'verdant' }), body: A('robe', { mat: 'robeBark', trim: 'moss', sash: 'hoodGreen' }) } },
  nan: { H: { build: 'dwarf', skin: 'skinTan', hairMat: 'hairSilver', hair: 'bun', eye: '#2a2030', mantle: 'wool', gloves: 'skinTan', boots: 'leather' }, gear: { body: A('robe', { mat: 'robeBark', trim: 'leather', sash: 'wool' }), offhand: { look: 'tome', cover: 'wood' } } },
  ivo: { H: { build: 'human', skin: 'skin', hairMat: 'hairBrown', hair: 'crop', eye: '#1c1f38', gloves: 'skin', boots: 'robe' }, gear: { body: A('robe', { mat: 'gambeson', trim: 'string', sash: 'string' }), amulet: A('amulet', { metal: 'bronze', gem: 'topaz', chain: 'string' }) } },
  pilgrim: { H: { build: 'human', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'short', eye: '#2a2030', cloak: 'wool', gloves: 'skinDeep', boots: 'robe' }, gear: { head: A('hood', { look: 'hood', mat: 'wool', tip: 1 }), body: A('robe', { mat: 'gambeson', trim: 'wool', sash: 'leather' }), weapon: A('staff', { style: 'crook', haft: 'wood' }) } },
  tamsin: { H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'pony', eye: '#2a2030', cloak: 'cloakRed', gloves: 'leather', boots: 'leatherDark' }, gear: { weapon: A('sword', { blade: 'steel', guardMat: 'bronze', grip: 'leatherRed', pommel: 'bronze', bladeL: 44 }), body: A('leather', { mat: 'leatherRed', shirt: 'wool', belt: 'leatherDark', trim: 'bronze' }) } },
  vesper: { H: { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'crop', eye: '#1a1a1a', tunic: 'clothGrey', cloak: 'clothGrey', gloves: 'skinAsh', boots: 'leatherDark' }, gear: { body: A('robe', { mat: 'clothGrey', trim: 'gold', sash: 'leatherDark' }), offhand: { look: 'orb', metal: 'bronze', gem: 'amber' } } },
  rotwarden: { H: { build: 'brute', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', cloak: 'rotwood', tunic: 'rotwood', pants: 'rotwood', boots: 'bark', gloves: 'bark' }, gear: { head: 'ichor-mask', body: A('plate', { mat: 'rotwood', trim: 'bark' }), amulet: 'first-seed' } },
});
const SKINS = ['skin', 'skinPale', 'skinTan', 'skinDeep'], HAIRS = ['hairBrown', 'hairBlack', 'hairAuburn', 'hairBlond', 'hairSilver', 'hairCopper'], STYLES = ['short', 'crop', 'long', 'pony', 'bun'];
const TUNICS = ['wool', 'gambeson', 'rags', 'clothBlue', 'hoodGreen', 'robeRed'];
function villager(key) {
  const h = strHash(key), pick = (a, s) => a[(h >>> s) % a.length];
  return { H: { build: (h & 3) === 3 ? 'brute' : 'human', skin: pick(SKINS, 2), hairMat: pick(HAIRS, 5), hair: pick(STYLES, 9), eye: '#2a2030', tunic: pick(TUNICS, 13), gloves: pick(SKINS, 2), boots: 'leather' }, gear: {} };
}
const npcCache = lru(48);
export function npcSheet(artKey) {
  const img = npcCache.get(String(artKey), () => {
    let look = NPC_LOOKS[artKey];
    if (!look && FOE_ART[artKey] && FOE_ART[artKey].kind === 'humanoid') { const f = foeLooks(artKey, { gearTier: 0 }); if (f.H) look = { H: f.H, gear: f.gear }; }
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
function resolveFoeKey(artKey, variant) {
  if (variant && FOES[artKey] && FOES[artKey].variants && FOES[artKey].variants[variant]) {
    const a = FOES[artKey].variants[variant].art;
    if (a && (FOE_ART[a] || MAP_FOE_SIZE[a])) return a;
  }
  return artKey;
}
const foeCache = lru(64);
export function mapFoeSheet(artKey, { gearTier = 0, variant = null, relic } = {}) {
  const key = resolveFoeKey(artKey, variant), gT = Math.max(0, Math.min(3, gearTier | 0));
  const def = FOE_ART[key], beast = BEASTS[key] || (def && def.kind === 'beast' && BEASTS[def.aliasOf]);
  if (beast && !(def && def.kind === 'humanoid')) {
    const [w, h] = MAP_FOE_SIZE[key] || MAP_FOE_SIZE[def && def.aliasOf] || [16, 16];
    const rel = relic === undefined ? (def && def.relic) || null : relic;
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
const BEASTS = { briarling, thornhound, boglurcher, glowcap, rotgrub, rotstag, oldsnag, briarmaw, gloamwing, mirelord, sapwight, rotwarden };

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
      const set = (x, y, c, a = 1) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4, s = img.data; if (a >= 1 || !s[i + 3]) { s[i] = c[0]; s[i + 1] = c[1]; s[i + 2] = c[2]; s[i + 3] = Math.max(s[i + 3], a * 255); return; } s[i] += (c[0] - s[i]) * a; s[i + 1] += (c[1] - s[i + 1]) * a; s[i + 2] += (c[2] - s[i + 2]) * a; };
      if (anchors.shadow) { // a flyer's shadow on the ground, dithered so the ground shows through
        const [sx, sy, r] = anchors.shadow;
        for (let y = Math.floor(sy - 2); y <= Math.ceil(sy + 2); y++) for (let x = Math.floor(sx - r); x <= Math.ceil(sx + r); x++) if (((x + .5 - sx) / r) ** 2 + ((y + .5 - sy) / 1.6) ** 2 < 1 && !img.data[(y * w + mx(x)) * 4 + 3] && (x + y) % 2 === 0) set(mx(x), y, [10, 8, 14], .7);
      }
      for (const [ex, ey, c] of anchors.eyes || []) set(mx(ex), Math.round(ey), c);
      if (anchors.glint && relic) { const gx = mx(anchors.glint[0]), gy = Math.round(anchors.glint[1]); if (gy >= 0 && gy < h && img.data[(gy * w + gx) * 4 + 3]) set(gx, gy, [255, 250, 226]); }
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
  'pedestal', 'board', 'sign', 'bellframe', 'lookout', 'rope', 'deer', 'ichor', 'door', 'table', 'tally-seal', 'barred-gate', 'rot-knot', 'stream']);
// states each kind draws (the first is the default); any other state string falls back to the default
export const OBJECT_STATES = Object.freeze({
  chest: ['closed', 'open', 'locked', 'sealed'], hearth: ['lit', 'cold'], gate: ['closed', 'open'], chain: ['closed', 'post', 'open'],
  crownwall: ['closed', 'open'], thornwall: ['closed', 'open'], bramble: ['closed', 'open'], boulder: ['closed', 'open'],
  'ford-ice': ['ice', 'stream', 'roots'], pedestal: ['unlit', 'lit'], board: ['bounties', 'ladder'], sign: ['post', 'stone', 'plaque'],
  bellframe: ['empty', 'rung'], lookout: ['closed'], rope: ['closed', 'open'], deer: ['graze', 'alert'], ichor: ['closed'],
  door: ['closed', 'open'], table: ['closed'], 'tally-seal': ['closed', 'open'], 'barred-gate': ['closed', 'open'], 'rot-knot': ['closed', 'open'], stream: ['closed'],
});
// hearthfire id -> look (pass { id } to objectSprite('hearth', state, { id }))
export const HEARTH_LOOKS = Object.freeze({
  'hearthstone-keep': 'hall', 'milestone-fire': 'ring', thornhollow: 'ring', 'den-mouth': 'ring', 'mossfall-cairn': 'cairn', 'mosswatch-fire': 'brazier',
  'hindwood-cairn': 'cairn', 'fawnrest-stone': 'stone', 'eldergrove-hearth': 'ring', 'last-green-coal': 'coal',
});
const OBJ_SIZE = { gate: [16, 24], crownwall: [16, 24], thornwall: [16, 24], pedestal: [16, 24], board: [16, 24], bellframe: [16, 24], lookout: [16, 32], door: [16, 24], 'barred-gate': [16, 24] };
const ANIM = new Set(['crownwall', 'ichor', 'stream']);
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
  // ring: a campfire in a ring of stones
  F.add({ mat: 'granite', prof: 'round', bw: 1, grp: 'ring', shapes: [0, 1, 2, 3, 4, 5, 6].map(k => { const a = Math.PI * (1 + k / 6); return E([8 + Math.cos(a) * 5.6, 12.4 - Math.sin(a) * 2.6 * -1 + (k === 0 || k === 6 ? 0 : 0)], 1.5, 1.2); }).concat([E([4, 14.2], 1.5, 1.2), E([8, 15], 1.6, 1.1), E([12, 14.2], 1.5, 1.2)]) });
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
  // unknown kind: a neutral marker stone
  F.add({ mat: 'granite', prof: 'round', bw: 1.6, grp: 'x', shapes: [E([8, 12], 4, 3)] });
}
const objCache = lru(192);
export function objectSprite(kind, state = null, { frame = 0, relic = null, id = null, look = null } = {}) {
  const states = OBJECT_STATES[kind] || ['closed'];
  const st = states.includes(state) ? state : states[0];
  const lit = kind === 'hearth' && st === 'lit';
  const frames = ANIM.has(kind) || lit || (kind === 'ford-ice' && st === 'stream') || (kind === 'deer' && st !== 'alert') ? 2 : 1;
  const f = frames > 1 ? frame & 1 : 0;
  const hl = kind === 'hearth' ? look || HEARTH_LOOKS[id] || 'ring' : '';
  const rk = relic && typeof relic === 'object' ? `${relic.uid || relic.base || relic.id || '?'}:${relic.temper || 0}` : relic || '';
  return objCache.get(`${kind}|${st}|${f}|${hl}|${rk}`, () => {
    const [W, Hh] = kind === 'hearth' && hl === 'hall' ? [16, 24] : OBJ_SIZE[kind] || [16, 16];
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
