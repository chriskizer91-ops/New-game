// Foe sprites for the Verdant Wilds slice. Humanoids reuse the layered hero rig (mirrored so they
// face right, toward the party); beasts are built from lit vector parts like the item recipes.
//
// renderFoe(key, { tier, gearTier, relic, relicHeld, phase, pose, t, broken, flip, reduced, tint }) -> ImageData
//   tier      'rabble' | 'veteran' | 'relic-bearer' | 'champion' (or 0..3)
//   gearTier  0..3: the Waking re-gear. Humanoids swap visible gear; beasts grow thornier and rot.
//   relic     relic id carried (defaults to FOE_ART[key].relic); drawn from RELIC_ART, the same art as the card
//   relicHeld false once the relic is disarmed: it disappears from the sprite
//   phase     1..3 (briarmaw): increasingly enraged and rotted
//   pose      'idle' | 'attack' | 'hurt' | 'ko'  (humanoids also 'cast', 'guard')
//   t         seconds (idle breath frames, attack progress 0..1, flicker, relic glint)
//   broken    ['thornwreath', 'briarfang'] pieces snapped off (briarmaw)
//   flip      face left instead of right
// The ImageData carries .anchors (canvas px): foot, head, center, relic (glint point), mouth, weaponTip;
// a foe with two relics also carries relics: [point, point] (Briarmaw, the Rotwarden, Tamsin).
//
// M3 adds the ten new families (spec §3.2), the seven named holders, and Tamsin. Relics 13-24 are drawn
// from RELIC_ART like the rest; until WP6B lands a look, a procedural heirloom of the same kind and aspect
// stands in (see relicArt), so a missing RELIC_ART key never throws.
// M5 adds the Ironspire: the pass brigands and the Tallymen's ice-cutters on the rig; rime wolves, rocklings,
// forge-sparks, iron sentinels, the forgeborn, peak-trolls and the drowned monks of Frostmere as beasts; the
// relic-bearers each carrying their relic drawn from its recipe (the Sentinel-Captain, Harrow's Journeyman, Old Horn,
// the Drowned Abbess, the Thunder-Roc); and two Champions whose pieces are their relics' own art, each gone once
// snapped off (Mother Anvil: the Worldforge Hammer and the Anvil Heart; the Rime-Abbot: the Rime Crozier and the
// Hushweave Cowl). Their gear tiers 0-3 are the Waking.
import { Forge, Xf, compose, vnoise, hash } from './forge.js';
import { RECIPE, TX, TX2 } from './recipes.js';
import { ART, rimeTex } from './item-art.js';
import { heroForge, posePreset, paintFace, BUILD, FRAME_BATTLE } from './heroes.js';
import { RELIC_ART, gearLooks, itemArt, stagedArt, awakenMotes } from './item-looks.js';
import { FOES } from '../data/foes.js';
import { lru } from './cache.js';

const TIERS = { rabble: 0, veteran: 1, 'relic-bearer': 2, bearer: 2, relic: 2, champion: 3 };
export const tierNum = t => (typeof t === 'number' ? t : TIERS[t] ?? 0);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ---------- canvas-space shape helpers ---------- */
const cap = (a, b, ra, rb = ra) => ({ k: 'c', a, b, ra, rb });
const circ = (c, r) => ({ k: 'o', c, r });
const ell = (c, rx, ry) => ({ k: 'e', c, rx, ry });
const poly = pts => ({ k: 'p', pts });
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const chainC = (pts, rs) => { const S = []; for (let k = 0; k < pts.length - 1; k++) S.push(cap(pts[k], pts[k + 1], Array.isArray(rs) ? rs[k] : rs, Array.isArray(rs) ? rs[k + 1] : rs)); return S; };
// rotated ellipse as a polygon in a local frame
const rell = (X, t, s, rx, ry, n = 20) => X.poly(Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2; return [t + Math.cos(a) * rx, s + Math.sin(a) * ry]; }));
// canvas-space spikes: [x, y, dx, dy, len, halfWidth]
const spikesC = list => list.map(([x, y, dx, dy, len, w]) => { const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; return poly([[x - uy * w, y + ux * w], [x + ux * len, y + uy * len], [x + uy * w, y - ux * w]]); });
// frame at (x, y) rotated by angle a (radians, 0 = facing right)
const frame = (x, y, a, k = 1) => Xf(x, y, Math.cos(a), Math.sin(a), k);
const DARK = () => -1;
const furTex = (seed, streak = 6) => ({ x, y }) => { const n = vnoise(x * .5, y * .22, seed); return n > .7 ? -1 : ((x * 2 + y) % streak === 0 ? -1 : 0); };
const farTex = tex => q => { const r = tex ? tex(q) : 0; return typeof r === 'object' ? Object.assign({}, r, { dd: (r.dd || 0) - 1 }) : r - 1; };

// draw a relic (or any item art) into a creature through its recipe, flagged so it can glint.
// Card-space point `center` lands on canvas point `at`; the card is rotated by `angle` and scaled by k.
// Returns map(Q) -> canvas point for any card-space point Q (for anchors).
function drawItem(F, art, at, angle, k, opt = {}) {
  const R = RECIPE[art.r], c = Math.cos(angle), sn = Math.sin(angle), [ct, cs] = opt.center || [32, 32];
  const map = Q => [at[0] + (c * (Q[0] - ct) - sn * (Q[1] - cs)) * k, at[1] + (sn * (Q[0] - ct) + c * (Q[1] - cs)) * k];
  const rl = Math.hypot(R.a[0], R.a[1]), rax = R.a[0] / rl, ray = R.a[1] / rl, o = map(R.o);
  const WX = Xf(o[0], o[1], c * rax - sn * ray, sn * rax + c * ray, k, .6);
  const n0 = F.parts.length;
  R.fn(F, WX, art.p);
  const drop = opt.drop ? new Set(opt.drop) : null;
  for (let i = F.parts.length - 1; i >= n0; i--) {
    const pt = F.parts[i];
    if (drop && drop.has(pt.grp)) { F.parts.splice(i, 1); continue; }
    if (!opt.plain) pt.relic = true;
    if (opt.cut) pt.cuts = (pt.cuts || []).concat(opt.cut);
  }
  return map;
}

/* =====================================================================
   HUMANOIDS (layered hero rig)
   ===================================================================== */
const rusty = { r: 'dagger', p: { shape: 'knife', gripEnd: 12, guardT: 2.6, bladeL: 34, bladeW: 5, blade: 'iron', bladeTex: TX.rust(3), guard: 'bar', guardMat: 'iron', guardW: 4.5, grip: 'rags', gripR: 2, pommel: 'iron', pommelR: 2.6, notches: [[40, 4.6, 1.3], [33, 5, 1]] } };
const ironKnife = { r: 'dagger', p: { shape: 'knife', gripEnd: 12, guardT: 2.8, bladeL: 36, bladeW: 5.2, blade: 'iron', guard: 'bar', guardMat: 'iron', guardW: 5.5, grip: 'leather', gripR: 2, pommel: 'iron', pommelR: 2.8 } };
const temperedKnife = { r: 'dagger', p: { shape: 'leaf', gripEnd: 12, guardT: 3, bladeL: 38, bladeW: 5, blade: 'steel', fuller: 'iron', guard: 'quillon', guardMat: 'bronze', guardW: 6.5, grip: 'hoodGreen', gripR: 2.1, pommel: 'bronze', pommelR: 3, pommelGem: 'emerald' } };
const runedKnife = { r: 'dagger', p: { shape: 'straight', gripEnd: 12, guardT: 3, bladeL: 40, bladeW: 5.2, blade: 'blackiron', fuller: 'frost', guard: 'quillon', guardMat: 'steel', guardW: 7, grip: 'clothBlue', gripR: 2.1, pommel: 'steel', pommelR: 3, pommelGem: 'sapphire' } };
const blightKnife = { r: 'dagger', p: { shape: 'knife', gripEnd: 12, guardT: 2.8, bladeL: 38, bladeW: 5.6, blade: 'blackiron', tally: 'blight', guard: 'bar', guardMat: 'blackiron', guardW: 5, grip: 'clothGrey', gripR: 2, pommel: 'blackiron', pommelR: 2.8 } };
const ironSword = { r: 'sword', p: Object.assign({}, ART.shortsword.p) };
const runedSword = { r: 'sword', p: { gripEnd: 13.5, guardT: 3.6, bladeW: 3.8, bladeL: 48, tipL: 9, taper: .87, blade: 'steel', fuller: 'frost', fullerR: 1, guard: 'bar', guardMat: 'steel', guardW: 9.5, guardR: 1.9, grip: 'clothBlue', gripR: 2.1, pommel: 'steel', pommelR: 3.2, pommelGem: 'sapphire' } };
const plainBuckler = { r: 'shield', p: { r: 22, face: 'wood', planks: true, rim: 'iron', bossR: 7 } };
const paintedShield = { r: 'shield', p: { r: 27, face: 'paintGreen', paint: 'chevron', paint2: 'paintRed', rim: 'iron', boss: 'iron', bossR: 7.5, rivets: 'iron' } };
const runedShield = { r: 'shield', p: { r: 27, face: 'paintGreen', paint: 'chevron', paint2: 'paintRed', rim: 'steel', boss: 'steel', bossR: 7.5, rivets: 'steel', runes: 'frost', gem: 'sapphire' } };
const A = (r, p) => ({ r, p });

export const FOE_ART = {
  cutpurse: {
    name: 'Cutpurse', kind: 'humanoid', w: 64, h: 64, foot: [32, 56], defaultTier: 'rabble',
    H: { build: 'youth', skin: 'skinPale', hairMat: 'hairBrown', hair: 'crop', eye: '#2a2030', tunic: 'rags', pants: 'wool', boots: 'rags', gloves: 'skinPale', scarf: 'rags', buckle: 'iron' },
    gear: [
      { weapon: rusty, head: A('hood', { look: 'hood', mat: 'rags', tip: 0 }) },
      { weapon: ironKnife, head: A('hood', { look: 'hood', mat: 'leatherDark', tip: 1 }), body: A('leather', { mat: 'leatherDark', shirt: 'rags', laces: false, belt: 'leather' }), feet: A('boots', { mat: 'leather' }) },
      { weapon: temperedKnife, head: A('hood', { look: 'hood', mat: 'clothGrey', tip: 1, trim: 'leatherDark' }), body: A('leather', { mat: 'leatherDark', shirt: 'wool', studs: 'iron', pauldrons: 'leatherDark', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'leather' }), H: { scarf: 'clothGrey' } },
      { weapon: runedKnife, head: A('hood', { look: 'hood', mat: 'dark', tip: 1, trim: 'blackiron', clasp: 'steel', gem: 'frost' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothBlue', studs: 'steel', pauldrons: 'steel', belt: 'leatherDark' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: A('boots', { mat: 'leatherDark', trim: 'steel', greave: 'blackiron' }), H: { scarf: 'dark', cloak: 'dark' } },
    ],
  },
  bandit: {
    name: 'Thornhollow Bandit', kind: 'humanoid', w: 64, h: 64, foot: [32, 56], defaultTier: 'rabble',
    H: { build: 'brute', skin: 'skinTan', hairMat: 'hairBlack', hair: 'short', stubble: true, eye: '#1c1f38', tunic: 'rags', pants: 'wool', boots: 'leather', gloves: 'leather', scarf: 'leatherRed', buckle: 'iron' },
    gear: [
      { weapon: A('sword', ART.rusted.p), head: A('coif', { look: 'coif', mat: 'leather' }) },
      { weapon: ironSword, offhand: plainBuckler, head: A('coif', { look: 'coif', mat: 'leather', flaps: 1 }), body: A('leather', { mat: 'leather', shirt: 'rags', belt: 'leatherDark' }), feet: A('boots', { mat: 'leather' }) },
      { weapon: temperedKnife, offhand: plainBuckler, head: A('kettle', { look: 'kettle', mat: 'iron' }), body: A('mail', { mat: 'iron', belt: 'leather', trim: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'leather' }) },
      { weapon: runedSword, offhand: A('shield', Object.assign({}, plainBuckler.p, { rim: 'steel', runes: 'frost' })), head: A('helm', { look: 'helm', mat: 'steel', trim: 'blackiron', runes: 'frost', eyes: 'frost', crest: true }), body: A('mail', { mat: 'steel', belt: 'leatherDark', trim: 'blackiron', pauldrons: 'steel' }), hands: A('gauntlets', { mat: 'steel', plate: 1 }), feet: A('boots', { mat: 'leatherDark', greave: 'steel' }), H: { cloak: 'hoodGreen' } },
    ],
    veteran: { gear: { offhand: paintedShield }, gear3: { offhand: runedShield }, H: { cloak: 'cloakGreen' } },
  },
  tallyman: {
    name: 'Tallyman', kind: 'humanoid', w: 64, h: 64, foot: [32, 56], defaultTier: 'rabble', beltRelic: true,
    H: { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'skinAsh', shade: true, shadeEyes: 'amber', ledger: 'leatherDark', coins: true, buckle: 'blackiron' },
    gear: [
      { weapon: ironKnife, head: A('hood', { look: 'hood', mat: 'clothGrey', tip: 1 }), body: A('robe', { mat: 'clothGrey', trim: 'wool', sash: 'leatherDark' }) },
      { weapon: ironKnife, head: A('hood', { look: 'hood', mat: 'clothGrey', tip: 1, trim: 'iron', clasp: 'iron' }), body: A('robe', { mat: 'clothGrey', trim: 'iron', sash: 'leatherDark' }), hands: A('gloves', { mat: 'leatherDark' }), H: { mantle: 'iron' } },
      { weapon: blightKnife, head: A('hood', { look: 'hood', mat: 'clothGrey', tip: 1, trim: 'blackiron', clasp: 'gold' }), body: A('robe', { mat: 'clothGrey', trim: 'blackiron', sash: 'leatherDark', sleeve: 'iron' }), hands: A('gloves', { mat: 'leatherDark' }), H: { mantle: 'blackiron', shade: false, mask: 'iron', maskEyes: 'amber' } },
      { weapon: blightKnife, head: A('hood', { look: 'hood', mat: 'dark', tip: 1, trim: 'blight', clasp: 'gold', gem: 'blight' }), body: A('robe', { mat: 'clothGrey', trim: 'blight', sash: 'blackiron', sleeve: 'blackiron', glyph: 'blight' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), H: { mantle: 'blackiron', shade: false, mask: 'bone', maskEyes: 'blight', cloak: 'clothGrey' } },
    ],
  },
};
const RELIC_SLOT = { sword: 'weapon', spear: 'weapon', hammer: 'weapon', axe: 'weapon', dagger: 'weapon', mace: 'weapon', staff: 'weapon', bow: 'weapon', amulet: 'amulet', circlet: 'head', hood: 'head', crown: 'head', helm: 'head', kettle: 'head', coif: 'head', leather: 'body', robe: 'body', mail: 'body', plate: 'body', boots: 'feet', gloves: 'hands', gauntlets: 'hands', shield: 'offhand', focus: 'offhand', ring: 'ring' };
export const relicSlot = id => { const a = relicArt(id); return a ? RELIC_SLOT[a.r] || (M3_RELICS[id] ? RELIC_SLOT[M3_RELICS[id][0]] : null) : null; };

// the relic amulet hanging from a belt (the Tallyman's stolen Warden's Seal)
const beltCharm = art => (F, X, c0, anchors) => {
  const [x, y] = c0, p = art.p, n0 = F.parts.length;
  F.add({ X, mat: p.chain || 'gold', prof: 'round', bw: .5, grp: 'charmchain', relic: true, shapes: [X.cap(x, y, x + .6, y + 2.6, .45)] });
  if (p.style === 'sun') F.add({ X, mat: p.rays || p.metal || 'gold', prof: 'ridge', grp: 'charmrays', shapes: [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k / 8 * Math.PI * 2, cx = x + .6, cy = y + 5; return X.poly([[cx + Math.cos(a - .35) * 1.8, cy + Math.sin(a - .35) * 1.8], [cx + Math.cos(a) * 3.4, cy + Math.sin(a) * 3.4], [cx + Math.cos(a + .35) * 1.8, cy + Math.sin(a + .35) * 1.8]]); }) });
  F.add({ X, mat: p.metal || 'gold', prof: 'round', bw: 1.2, grp: 'charm', shapes: [X.circ(x + .6, y + 5, 2.1)] });
  F.add({ X, mat: p.core || p.gem || 'ruby', prof: 'round', bw: 1, grp: 'charm', noShadow: true, shapes: [X.circ(x + .6, y + 5, 1.05)] });
  for (let i = n0; i < F.parts.length; i++) F.parts[i].relic = true;
  anchors.relic = X.P(x + .6, y + 5);
};

function humanoid(def, o) {
  const gt = clamp(o.gearTier ?? 0, 0, 3), T = def.gear[gt], tier = tierNum(o.tier ?? def.defaultTier);
  const H = Object.assign({}, def.H, T.H || {});
  const gear = Object.assign({}, T); delete gear.H;
  if (tier >= 1 && def.veteran) { Object.assign(gear, gt >= 3 && def.veteran.gear3 ? def.veteran.gear3 : def.veteran.gear); Object.assign(H, def.veteran.H || {}); if (T.H && T.H.cloak) H.cloak = T.H.cloak; }
  const relic = o.relic === undefined ? def.relic : o.relic, held = o.relicHeld !== false;
  let relicSlotName = null;
  if (relic && !held && relicSlot(relic) === 'weapon') gear.weapon = null; // the relic clattered away
  if (relic && held && RELIC_ART[relic]) {
    const slot = relicSlot(relic);
    relicSlotName = slot;
    if (slot === 'amulet' && def.beltRelic) H.beltCharm = beltCharm(RELIC_ART[relic]);
    else gear[slot] = RELIC_ART[relic];
    if (slot === 'weapon' && RELIC_ART[relic].r === 'dagger' && def.name === 'Tallyman') gear.offhand = null;
  }
  return { H, gear, relicSlotName };
}

/* =====================================================================
   BEASTS
   ===================================================================== */
// Each builder: (F, st) where st = { pose, f (breath frame), gT, phase, relic, held, broken, anchors }

/* ---- shared creature bits ---- */
const legOf = (F, pts, rs, mat, tex, grp, far) => F.add({ mat, prof: 'round', bw: Math.max(1.2, rs[0] * .7), grp, shapes: chainC(pts, rs), tex: far ? farTex(tex) : tex });
const eyeOf = (F, X, t, s, rx, ry, mat, shut, grp = 'eye') => {
  if (shut) F.add({ mat: 'dark', prof: 'flat', grp, noShadow: true, noOutline: true, shapes: [X.cap(t - rx, s + .2, t + rx, s + .4, .55)] });
  else F.add({ mat, prof: 'flat', grp, noShadow: true, noOutline: true, shapes: [rell(X, t, s, rx, ry, 10)] });
};
// thorn spikes spread along a polyline, lengths shaped by a sine envelope
function spineThorns(pts, n, len, w, lean = -.45, env = true) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const u = (k + .5) / n, i = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), fr = u * (pts.length - 1) - i;
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * fr, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * fr;
    const L = len * (env ? .62 + .5 * Math.sin(u * Math.PI) : 1) * (.85 + hash(k, 3, 11) * .3);
    out.push([x, y - .6, lean + (hash(k, 5, 11) - .5) * .3, -1, L, w]);
  }
  return out;
}

/* ---- THORNHOUND: a wolf with a bramble-thorn spine (64x48, ground 45) ---- */
function thornhound(F, st) {
  const { pose, f, gT } = st, A = st.anchors;
  let bx = 0, by = 0, H = [49.5, 17.5 + f], ha = .08, jaw = 0, eye = 'open', lie = false;
  let legs = {
    ff: [[36, 31.5], [36.2, 37.5], [36.8, 43.4]], fn: [[40.5, 31], [41.8, 37.5], [42.8, 43.4]],
    hf: [[16.5, 30.5], [19.2, 35.5], [15.4, 39.5], [16.2, 43.4]], hn: [[21, 29.5], [24, 35], [20.2, 39.5], [21, 43.4]],
  };
  let tail = [[12.5, 23], [8, 26.5], [5.5, 31.5], [5, 36]];
  if (pose === 'attack') {
    bx = 3; by = 2; H = [57.5, 22.5]; ha = .3; jaw = 1;
    legs = { ff: [[39, 33.5], [44.5, 37], [49, 41.5]], fn: [[43.5, 33], [50, 35.5], [55.5, 39.5]], hf: [[19.5, 32], [14.5, 36.5], [9, 40.5], [6, 43.4]], hn: [[24, 31.5], [18.5, 36], [12.5, 40.5], [9.5, 43.6]] };
    tail = [[15.5, 25], [10.5, 24], [6, 24.5], [2.5, 26.5]];
  } else if (pose === 'hurt') {
    bx = -3; by = 1; H = [44.5, 15.5]; ha = -.25; jaw = .5; eye = 'shut';
    legs = { ff: [[33, 32.5], [35.5, 38], [38.5, 43.4]], fn: [[37.5, 32], [41, 37.5], [44, 43.4]], hf: [[13.5, 31.5], [17, 36.5], [12.5, 40], [13.2, 43.4]], hn: [[18, 30.5], [21.5, 36.5], [17, 40], [17.8, 43.4]] };
    tail = [[9.5, 24.5], [7.5, 29], [8, 34], [10.5, 38]];
  } else if (pose === 'ko') {
    lie = true; H = [49.5, 38.4]; ha = .1; eye = 'shut';
    legs = { ff: [[37, 38.5], [42, 40.4], [47.5, 41.8]], fn: [[40, 41.2], [46, 42.8], [52, 43.4]], hf: [[18, 38.5], [13, 40.2], [8, 41.4], [4.5, 42]], hn: [[21, 41.2], [16, 43], [11, 43.8], [7, 44]] };
    tail = [[12.5, 35.5], [8.5, 38], [4.5, 40.5], [1.5, 42]];
  }
  const S = p => [p[0] + bx, p[1] + by];
  const fur = 'wolfFur', ftex = furTex(4), rs3 = [3.3, 2.3, 1.8], rs4 = [4.4, 2.8, 1.9, 1.7];
  const legP = pts => (lie || pose === 'attack' || pose === 'hurt' ? pts : pts.map((p, i) => (i === 0 ? S(p) : p)));
  const paw = (p, far, g) => F.add({ mat: fur, prof: 'round', bw: 1.2, grp: g, shapes: [ell([p[0] + 1.3, p[1] + .9], 2.6, 1.3)], tex: far ? DARK : null });
  const leg = (pts, far, name) => { const P = legP(pts); legOf(F, P, P.length === 3 ? rs3 : rs4, fur, ftex, name, far); paw(P[P.length - 1], far, name + 'p'); };
  const thornM = gT >= 3 ? 'rotwood' : 'thorn', vineM = gT >= 3 ? 'rot' : 'bramble';
  leg(legs.hf, true, 'hf'); leg(legs.ff, true, 'ff');
  const tl = lie || pose !== 'idle' ? tail : tail.map(S);
  F.add({ mat: fur, prof: 'round', bw: 2.4, grp: 'tail', shapes: chainC(tl, [2.8, 3.6, 3.1, 1.5]), tex: ftex });
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'tailthorn', shapes: spikesC([[tl[1][0], tl[1][1] - 3, -.4, -1, 3.4 + gT * .7, 1], [tl[2][0] - 2.4, tl[2][1] - .5, -1, -.25, 3 + gT * .6, .9]]) });
  const bodyS = lie ? [ell([20, 37], 9, 6.4), ell([29, 37.4], 11.5, 5.8), ell([38.5, 37], 8, 6.8)] : [ell(S([19.5, 26.5]), 8.6, 7.8), ell(S([29, 25.6]), 11, 6.2), ell(S([39, 26.5 - f * .3]), 8.6, 9.4 + f * .3)];
  F.add({ mat: fur, prof: 'round', bw: 6, hs: .8, grp: 'body', shapes: bodyS, tex: ftex });
  F.add({ mat: 'wolfPale', prof: 'round', bw: 2.5, grp: 'body', shapes: [lie ? ell([43.5, 38.5], 3.5, 4) : ell(S([44, 28]), 3.6, 6.2)], tex: furTex(8, 5) });
  const sp = lie ? [[43, 32.5], [35, 31.8], [27, 32], [19, 32], [13, 33.5]] : [[42.5, 18.8], [35, 19.8], [27, 20.2], [19.5, 19.8], [13, 22]].map(S);
  F.add({ mat: vineM, prof: 'round', bw: 1.5, grp: 'spine', shapes: chainC(sp, [2, 2.4, 2.4, 2.2, 1.6]), tex: ({ x, y }) => ((x + y) % 3 === 0 ? -1 : 0) });
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'thorns', shapes: spikesC(spineThorns(sp, 7 + gT * 2, (6.2 + gT * 1.5) * (lie ? .75 : 1), 1.35 + gT * .12, lie ? -.6 : -.5)) });
  if (gT >= 1) F.add({ mat: 'moss', prof: 'round', bw: 1, grp: 'leaves', shapes: [poly([add2(sp[1], [0, -1]), add2(sp[1], [3.5, -3.5]), add2(sp[1], [4.5, -1.5])]), poly([add2(sp[3], [0, -1]), add2(sp[3], [-3.5, -3]), add2(sp[3], [-4, -.5])])] });
  if (gT >= 2) F.add({ mat: gT >= 3 ? 'blight' : 'verdant', prof: 'round', bw: 1, grp: 'buds', noShadow: true, shapes: [circ(add2(sp[1], [-1, -.8]), 1.1), circ(add2(sp[3], [1, -.6]), 1)] });
  leg(legs.hn, false, 'hn'); leg(legs.fn, false, 'fn');
  const hf = frame(H[0], H[1], ha);
  const neckA = lie ? [41.5, 35.5] : S([40.5, 22.5]);
  F.add({ mat: fur, prof: 'round', bw: 3.5, grp: 'neck', shapes: [cap(neckA, hf.P(-2.6, 1.6), 5.6, 4.4)], tex: ftex });
  F.add({ mat: fur, prof: 'round', bw: 1.2, grp: 'earF', shapes: [hf.poly([[-.2, -3.9], [-.6, -9.4], [2.8, -4.2]])], tex: DARK });
  const jf = frame(...hf.P(1.4, 3), ha + jaw * .6);
  if (jaw > 0) F.add({ mat: 'flesh', prof: 'round', bw: 1.5, grp: 'maw', shapes: [poly([hf.P(1.2, 2), hf.P(9, 2.6), jf.P(7.2, .4), jf.P(0, 0)])] });
  F.add({ mat: fur, prof: 'round', bw: 1.6, grp: 'jaw', shapes: [jf.cap(0, 0, 7, .3, 2.1, 1.3)], tex: ftex });
  if (jaw > 0) F.add({ mat: 'bone', prof: 'ridge', grp: 'teethL', shapes: [jf.poly([[3, -1], [3.7, -3.2], [4.4, -1]]), jf.poly([[5.4, -.8], [6, -2.7], [6.6, -.7]])] });
  F.add({ mat: fur, prof: 'round', bw: 3.5, grp: 'head', shapes: [rell(hf, 0, 0, 5.5, 4.7), hf.cap(1.8, .7, 9.8, 2.2, 3.2, 1.9)], tex: ftex });
  F.add({ mat: 'wolfPale', prof: 'round', bw: 1.2, grp: 'head', shapes: [hf.cap(3, 3, 8.6, 3.2, 1.4, 1)] });
  if (jaw > 0) F.add({ mat: 'bone', prof: 'ridge', grp: 'teethU', shapes: [hf.poly([[4.8, 3.3], [5.6, 5.6], [6.4, 3.3]]), hf.poly([[7.2, 3.1], [7.8, 4.9], [8.4, 3]])] });
  F.add({ mat: 'dark', prof: 'round', bw: 1, grp: 'nose', shapes: [hf.circ(10, 1.6, 1.3)] });
  F.add({ mat: fur, prof: 'round', bw: 1.2, grp: 'ear', shapes: [hf.poly([[-3.2, -3], [-5.2, -9.8], [-.2, -4.4]])], tex: ftex });
  eyeOf(F, hf, 2.7, -1.3, 1.25, .8, gT >= 2 ? 'eyeRed' : 'amber', eye === 'shut');
  if (eye !== 'shut') F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [hf.cap(1.2, -2.8, 4.6, -2.1, .55)] });
  A.head = hf.P(2.7, -1.3); A.mouth = hf.P(8.5, 3); A.center = lie ? [30, 37] : S([30, 26]);
}

/* ---- BRIARLING: a walking knot of bramble (48x48, ground 45) ---- */
function briarling(F, st) {
  const { pose, f, gT } = st, A = st.anchors;
  let B = [24, 29 + f], rx = 9.8, ry = 9, eye = 'open', lie = false;
  let armN = [[31.5, 30], [35.5, 32], [38, 28.5], [36.5, 25.2]], armF = [[17, 30.5], [13, 33], [10.8, 29.5], [12.4, 26.2]];
  let legN = [[27, 36.5], [29, 40.5], [29.8, 44.6]], legF = [[21, 36.5], [19.5, 40.5], [18.6, 44.6]];
  if (f) { legN = [[27, 37], [28.5, 41], [29, 44.6]]; legF = [[21, 37], [20, 41], [19.6, 44.6]]; }
  if (pose === 'attack') {
    B = [28, 28]; armN = [[35.5, 28.5], [40, 26.5], [44, 24.5], [47, 26]]; armF = [[21, 29.5], [16.5, 27], [13.5, 23], [14.5, 19.5]];
    legN = [[31, 35.5], [35, 39.5], [37, 44.6]]; legF = [[25, 36], [21, 40.5], [18, 44.6]];
  } else if (pose === 'hurt') {
    B = [21.5, 31]; rx = 10.8; ry = 7.8; eye = 'shut';
    armN = [[29.5, 29], [33.5, 25.5], [35, 21.5], [33.5, 19]]; armF = [[14, 29], [10.5, 25.5], [9.5, 21.5], [11, 19]];
    legN = [[25, 37], [27.5, 41], [29, 44.6]]; legF = [[19, 37], [17, 41], [15.5, 44.6]];
  } else if (pose === 'ko') {
    lie = true; B = [24, 39.5]; rx = 11.5; ry = 5.6; eye = 'shut';
    armN = [[33, 41], [37.5, 43], [41.5, 43.8], [44.5, 44]]; armF = [[15, 41], [10.5, 43], [6.5, 43.8], [3.5, 44]];
    legN = [[27, 42], [31, 44], [34, 44.6]]; legF = [[21, 42], [17, 44], [14, 44.6]];
  }
  const vine = gT >= 3 ? 'rotwood' : 'bramble', thornM = gT >= 3 ? 'rotwood' : 'thorn', wov = ({ x, y }) => (((x + y) % 4 === 0) || ((x - y + 64) % 5 === 0) ? -1 : vnoise(x * .4, y * .4, 7) > .72 ? { m: 'bark' } : 0);
  const root = (p, g, far) => F.add({ mat: 'bark', prof: 'round', bw: .8, grp: g, shapes: [cap(p, [p[0] - 2.4, p[1] + .5], .8, .5), cap(p, [p[0] + 2.2, p[1] + .6], .8, .5)], tex: far ? DARK : null });
  F.add({ mat: vine, prof: 'round', bw: 1, grp: 'armF', shapes: chainC(armF, [1.6, 1.3, 1, .7]), tex: DARK });
  legOf(F, legF, [1.7, 1.4, 1.1], 'bark', null, 'legF', true); root(legF[2], 'rootF', true);
  // body ball, wrapping vines, thorns
  F.add({ mat: vine, prof: 'round', bw: 5, hs: .7, grp: 'body', shapes: [ell(B, rx, ry)], tex: wov });
  const arcs = lie ? [[[B[0] - 10, B[1] - 1], [B[0], B[1] - 4.5], [B[0] + 10, B[1] - 1]]] : [[[B[0] - 9, B[1] - 4], [B[0] - 2, B[1] - 8.5], [B[0] + 8, B[1] - 5]], [[B[0] - 8.5, B[1] + 4], [B[0], B[1] + 8.4], [B[0] + 9, B[1] + 3]]];
  F.add({ mat: 'bark', prof: 'round', bw: 1, grp: 'wrap', shapes: arcs.flatMap(a => chainC(a, 1.2)) });
  const nT = 9 + gT * 2, th = [];
  for (let k = 0; k < nT; k++) {
    const a = lie ? -Math.PI + (k + .5) / nT * Math.PI : -Math.PI * 1.08 + (k + .5) / nT * Math.PI * 1.16;
    const L = (3.4 + gT * .9) * (.8 + hash(k, 1, 5) * .5) * (lie ? .7 : 1);
    th.push([B[0] + Math.cos(a) * rx * .92, B[1] + Math.sin(a) * ry * .92, Math.cos(a + (lie ? .6 : 0)), Math.sin(a + (lie ? .6 : 0)), L, 1 + gT * .1]);
  }
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'thorns', shapes: spikesC(th) });
  // sprout
  const sp0 = [B[0] + 1, B[1] - ry + 1], sp1 = lie ? [sp0[0] + 4, sp0[1] - 1] : [sp0[0] + 1.5, sp0[1] - 5.5];
  F.add({ mat: 'moss', prof: 'round', bw: .8, grp: 'stem', shapes: [cap(sp0, sp1, .8, .6)] });
  const droop = lie || pose === 'hurt';
  F.add({ mat: gT >= 3 ? 'rot' : 'moss', prof: 'round', bw: 1.2, grp: 'leaf', shapes: droop ? [poly([sp1, [sp1[0] + 3, sp1[1] + 2.8], [sp1[0] + 5.2, sp1[1] + 1.6]]), poly([sp1, [sp1[0] - 1.5, sp1[1] + 3], [sp1[0] - 3.4, sp1[1] + 3.2]])] : [poly([sp1, [sp1[0] - 3, sp1[1] - 3.2], [sp1[0] - 5.8, sp1[1] - 2], [sp1[0] - 3, sp1[1] + .2]]), poly([sp1, [sp1[0] + 2.8, sp1[1] - 3.4], [sp1[0] + 5.6, sp1[1] - 2.4], [sp1[0] + 3, sp1[1] + .2]])] });
  if (gT >= 2 && !lie) F.add({ mat: gT >= 3 ? 'blight' : 'ruby', prof: 'round', bw: 1, grp: 'berry', noShadow: true, shapes: [circ([B[0] - 6, B[1] - 3.5], 1.2), circ([B[0] + 6.5, B[1] + 4], 1.1)] });
  // face hollow
  const fc = [B[0] + 3.5, B[1] + (lie ? 0 : .5)];
  F.add({ mat: 'dark', prof: 'flat', grp: 'face', noShadow: true, shapes: [ell(fc, 4.8, lie ? 2.6 : 3.6)] });
  const X0 = Xf(0, 0, 1, 0, 1), em = gT >= 3 ? 'blight' : gT >= 2 ? 'eyeRed' : 'amber';
  eyeOf(F, X0, fc[0] - 1.8, fc[1] - .4, 1, .8, em, eye === 'shut', 'eyeL'); eyeOf(F, X0, fc[0] + 2, fc[1] - .4, 1, .8, em, eye === 'shut', 'eyeR');
  if (pose === 'attack') F.add({ mat: 'bone', prof: 'ridge', grp: 'fangs', shapes: [poly([[fc[0] - 1.5, fc[1] + 1.4], [fc[0] - .8, fc[1] + 3.2], [fc[0] - .1, fc[1] + 1.4]]), poly([[fc[0] + .9, fc[1] + 1.4], [fc[0] + 1.6, fc[1] + 3.2], [fc[0] + 2.3, fc[1] + 1.4]])] });
  legOf(F, legN, [1.8, 1.5, 1.2], 'bark', null, 'legN'); root(legN[2], 'rootN');
  F.add({ mat: vine, prof: 'round', bw: 1, grp: 'armN', shapes: chainC(armN, [1.7, 1.4, 1.1, .8]) });
  F.add({ mat: thornM, prof: 'ridge', grp: 'armthorn', shapes: spikesC([[armN[1][0], armN[1][1] - 1, .2, -1, 2.6, .7], [armN[3][0], armN[3][1], (armN[3][0] - armN[2][0]), (armN[3][1] - armN[2][1]), 2.6, .7]]) });
  A.head = fc; A.mouth = fc; A.center = B;
}

function rotstag(F, st) {
  const { pose, f, gT, relic, held } = st, A = st.anchors;
  let bx = 0, by = 0, H = [48, 23 + f], ha = .5, eye = 'open', lie = false, neck0 = [39.5, 33.5];
  let legs = {
    ff: [[34.5, 42.5], [35, 50.5], [34.2, 56], [34.8, 61]], fn: [[38.5, 42], [40, 50], [39.5, 56], [40.2, 61]],
    hf: [[17, 41], [19.5, 47.5], [15, 53.5], [15.5, 61]], hn: [[21.5, 40.5], [24, 47], [19.5, 53], [20, 61]],
  };
  if (pose === 'attack') {
    bx = 2; by = 1.5; H = [52.5, 35]; ha = 1.3; neck0 = [41.5, 36.5];
    legs = { ff: [[36.5, 44], [39.5, 50], [37.5, 55.5], [40, 61]], fn: [[40.5, 43.5], [44.5, 49], [42.5, 55], [45.5, 61]], hf: [[19, 42.5], [15, 48], [10, 53], [7.5, 60.5]], hn: [[23.5, 42], [19.5, 48], [14.5, 53.5], [12, 61]] };
  } else if (pose === 'hurt') {
    bx = -2.5; by = -1; H = [44, 18.5]; ha = .05; eye = 'shut'; neck0 = [37, 31.5];
    legs = { ff: [[32, 41.5], [34.5, 48.5], [36.5, 53], [36, 57.5]], fn: [[36, 41], [39.5, 47.5], [42, 52], [41.5, 56.5]], hf: [[14.5, 40], [17.5, 47], [13, 53.5], [13.5, 61]], hn: [[19, 39.5], [22, 46.5], [17.5, 53], [18, 61]] };
  } else if (pose === 'ko') {
    lie = true; H = [47.5, 53.5]; ha = .7; eye = 'shut'; neck0 = [39, 51];
    legs = { ff: [[35, 55], [39, 58.5], [44, 60]], fn: [[38.5, 56.5], [43, 59.5], [48, 61]], hf: [[17, 55], [12, 58], [7, 60]], hn: [[21, 56.5], [16, 59.5], [10.5, 61]] };
  }
  const S = p => [p[0] + bx, p[1] + by], legP = pts => (lie ? pts : pts.map((p, i) => (i === 0 ? S(p) : p)));
  const fur = 'stagWhite', rotLine = (lie ? 56 : 47) - gT * 3.2;
  // rot-blackened from the hooves up, plus patches that grow with gearTier
  const ftex = ({ x, y }) => {
    const n = vnoise(x * .3, y * .3, 13), up = (y - rotLine) / 7 + (n - .5) * 1.4, patch = n > .84 - gT * .045;
    if (up > .5 || patch) return { m: 'rot', dd: up > 1.2 || n > .85 ? 0 : 1 };
    if (up > .1) return (x + y) & 1 ? { m: 'rot', dd: 1 } : -1;
    return ((x * 2 + y) % 7 === 0 ? -1 : 0);
  };
  const hoof = (p, g, far) => F.add({ mat: 'rotwood', prof: 'round', bw: .8, grp: g, shapes: [poly([[p[0] - 1.4, p[1] - 1.2], [p[0] + 1.6, p[1] - 1.2], [p[0] + 2, p[1] + .9], [p[0] - 1.4, p[1] + .9]])], tex: far ? DARK : null });
  const leg = (pts, far, g) => { const P = legP(pts); legOf(F, P, P.length === 3 ? [3.4, 2, 1.4] : g[0] === 'h' ? [4, 2.2, 1.4, 1.2] : [3, 1.7, 1.3, 1.2], fur, ftex, g, far); if (!lie) hoof(P[P.length - 1], g + 'h', far); };
  leg(legs.hf, true, 'hf'); leg(legs.ff, true, 'ff');
  const tailP = lie ? [11, 51] : S([11.5, 33]);
  F.add({ mat: fur, prof: 'round', bw: 1.2, grp: 'tail', shapes: [cap(tailP, [tailP[0] - 2.4, tailP[1] - 2.6], 1.7, 1.2)] });
  const bodyS = lie ? [ell([19, 52], 8, 6.4), ell([28.5, 53], 11.5, 6), ell([37.5, 52], 7, 7)] : [ell(S([19, 37]), 7.8, 7.2), ell(S([28.5, 37.5 - f * .2]), 11.5, 6.4), ell(S([38, 37]), 7.4, 8.6 + f * .3)];
  F.add({ mat: fur, prof: 'round', bw: 5.5, hs: .8, grp: 'body', shapes: bodyS, tex: ftex });
  // blight cracks where the rot has broken through
  const vein = (pts, g) => F.add({ mat: 'blight', prof: 'round', bw: .6, grp: g, noShadow: true, shapes: chainC(pts, .55) });
  if (!lie && gT >= 1) vein([S([20, 40]), S([22, 37.5]), S([21, 35]), S([23.5, 33])], 'v1');
  if (!lie && gT >= 2) vein([S([34, 42]), S([32.5, 39.5]), S([34.5, 37])], 'v2');
  if (!lie) { const d = gT + 1; F.add({ mat: 'sap', prof: 'round', bw: .8, grp: 'drip', noShadow: true, shapes: [cap(S([26, 43.4]), S([26, 45 + d * .6]), .6, .8), cap(S([31.5, 43.6]), S([31.5, 45.6 + (d > 2 ? 1.5 : 0)]), .5, .7)].slice(0, d >= 2 ? 2 : 1) }); }
  leg(legs.hn, false, 'hn'); leg(legs.fn, false, 'fn');
  const hf = frame(H[0], H[1], ha);
  // neck with a shaggy ruff underneath
  const n0 = lie ? neck0 : S(neck0), n1 = hf.P(-2.6, 1.2);
  F.add({ mat: fur, prof: 'round', bw: 3, grp: 'neck', shapes: [cap(n0, n1, 5.2, 3.6)], tex: ftex });
  F.add({ mat: fur, prof: 'ridge', hs: .8, grp: 'ruff', shapes: spikesC([[(n0[0] * 2 + n1[0]) / 3 + 2.4, (n0[1] * 2 + n1[1]) / 3 + 2.4, .25, 1, 3.4, 1.1], [(n0[0] + n1[0] * 2) / 3 + 2.4, (n0[1] + n1[1] * 2) / 3 + 2.2, .15, 1, 3, 1]]), tex: ftex });
  // antlers: rot-blackened tips
  const antTex = t0 => ({ x, y }) => (y < t0 + vnoise(x * .5, y * .5, 21) * 2.5 + gT * 1.6 ? { m: 'rotwood', dd: 0 } : 0);
  const antler = (o2, lean, far, g) => {
    const P = (t, s) => { const q = hf.P(t + o2[0], s + o2[1]); return [q[0] + lean * (-s - 3) * .18, q[1]]; };
    const beam = [P(-.6, -3), P(-3.4, -8.5), P(-4.4, -14.5), P(-3.2, -20), P(-.6, -24)];
    const Sh = chainC(beam, [1.35, 1.2, 1.05, .8, .5]);
    Sh.push(cap(P(-1, -4.2), P(3.6, -6.6), 1, .5), cap(P(-3.6, -9.5), P(1.8, -12.6), .95, .45), cap(P(-4.4, -15), P(.4, -18.8), .9, .45), cap(P(-4, -17.6), P(-9.2, -21), .8, .4), cap(P(-3.2, -20.4), P(-6.4, -25), .7, .4));
    const tipY = Math.min(...beam.map(p => p[1]));
    F.add({ mat: 'bone', prof: 'round', bw: 1, grp: g, shapes: Sh, tex: far ? farTex(antTex(tipY + 2)) : antTex(tipY + 2) });
    return P;
  };
  antler([2.8, -.4], 1.4, true, 'antF');
  F.add({ mat: fur, prof: 'round', bw: 1, grp: 'earF', shapes: [hf.poly([[-1.2, -3], [-4.4, -7], [-2.2, -1.4]])], tex: DARK });
  F.add({ mat: fur, prof: 'round', bw: 3, grp: 'head', shapes: [rell(hf, 0, 0, 4.8, 3.8), hf.cap(1.4, .9, 8.4, 2.1, 3, 1.7)], tex: ftex });
  F.add({ mat: 'rotwood', prof: 'round', bw: 1, grp: 'nose', shapes: [hf.circ(8.8, 2, 1.15)] });
  F.add({ mat: fur, prof: 'round', bw: 1, grp: 'ear', shapes: [hf.poly([[-2.2, -2.4], [-7.4, -5], [-2.8, -.2]])], tex: ftex });
  eyeOf(F, hf, 1.5, -1, 1.15, .75, gT >= 2 ? 'blight' : 'verdant', eye === 'shut');
  // the Rotwood Circlet threaded on the near antler (drawn before it, so the beam passes through the ring)
  const AP0 = (t, s) => { const q = hf.P(t, s); return [q[0] + (-s - 3) * .18 * -.6, q[1]]; };
  if (relic && held && RELIC_ART[relic]) {
    const at = AP0(-4, -11.6), m = drawItem(F, RELIC_ART[relic], at, ha - .9, .34, { center: [32, 36] });
    A.relic = m([32, 43]);
    F.add({ mat: 'moss', prof: 'round', bw: .6, grp: 'moss', noShadow: true, shapes: [cap(m([10, 40]), add2(m([10, 40]), [0, 5 + f * .5]), .55, .4), cap(m([52, 44]), add2(m([52, 44]), [.4, 3.5]), .5, .35)] });
  } else if (!held) {
    F.add({ mat: 'rotwood', prof: 'round', bw: .6, grp: 'torn', shapes: [cap(AP0(-4, -11.6), add2(AP0(-4, -11.6), [1.5, 4]), .6, .4)] });
  }
  antler([0, 0], -.6, false, 'antN');
  A.head = hf.P(1.5, -1); A.mouth = hf.P(8, 2.5); A.center = lie ? [29, 52] : S([29, 38]);
}

function oldsnag(F, st) {
  const { pose, f, gT, relic, held } = st, A = st.anchors;
  let bx = 0, by = 0, H = [50.5, 45 + f * .5], ha = .18, eye = 'open', lie = false;
  let legs = {
    ff: [[40, 50], [39.2, 55.5], [39.8, 59.6]], fn: [[45, 51], [46, 56], [46.6, 59.6]],
    hf: [[14, 50], [12.5, 55.5], [13.6, 59.6]], hn: [[18.5, 51], [17, 56], [18.2, 59.6]],
  };
  if (pose === 'attack') {
    bx = 2; by = 1; H = [53, 50]; ha = .42;
    legs = { ff: [[41, 51], [43.5, 55.5], [45.5, 59.6]], fn: [[46, 52], [49.5, 56], [51.5, 59.6]], hf: [[15.5, 51], [11, 55.5], [7.5, 59.6]], hn: [[20, 52], [15.5, 56.5], [12, 59.6]] };
  } else if (pose === 'hurt') {
    bx = -2.5; by = -1; H = [47.5, 40]; ha = -.3; eye = 'shut';
    legs = { ff: [[37, 49], [38.5, 54.5], [40, 59.6]], fn: [[42, 50], [44.5, 55], [46, 59.6]], hf: [[11.5, 49.5], [10.5, 55], [11.5, 59.6]], hn: [[16, 50.5], [15, 55.5], [16, 59.6]] };
  } else if (pose === 'ko') {
    lie = true; by = 7; H = [50, 54.5]; ha = .32; eye = 'shut';
    legs = { ff: [[40, 56], [44, 58.5], [48, 59.6]], fn: [[44, 57.5], [49, 59.2], [53, 60]], hf: [[14, 56.5], [10, 58.8], [6, 59.8]], hn: [[18.5, 57.5], [14, 59.5], [9.5, 60.2]] };
  }
  const S = p => [p[0] + bx, p[1] + by], legP = pts => (lie ? pts : pts.map((p, i) => (i === 0 ? S(p) : p)));
  const hide = 'boarHide';
  const htex = ({ x, y }) => { const n = vnoise(x * .35, y * .5, 6); if (n > .82) return { m: 'grizzle', dd: 0 }; return (x + y * 3) % 5 === 0 ? -1 : n < .3 ? 1 : 0; };
  const hoof = (p, g, far) => F.add({ mat: 'blackiron', prof: 'round', bw: .8, grp: g, shapes: [poly([[p[0] - 1.8, p[1] - .8], [p[0] + 1.8, p[1] - .8], [p[0] + 2.2, p[1] + 1.4], [p[0] - 1.8, p[1] + 1.4]])], tex: far ? DARK : null });
  const leg = (pts, far, g) => { const P = legP(pts); legOf(F, P, g[0] === 'h' ? [4.8, 3, 2.4] : [4.3, 3, 2.5], hide, htex, g, far); hoof(P[P.length - 1], g + 'h', far); };
  leg(legs.hf, true, 'hf'); leg(legs.ff, true, 'ff');
  const tl = lie ? [[7, 52], [4, 54], [3, 57]] : [S([7.5, 40]), S([5, 43]), S([4.6, 47])];
  F.add({ mat: hide, prof: 'round', bw: .8, grp: 'tail', shapes: chainC(tl, [1.1, .9, .6]).concat([circ(tl[2], 1.4)]) });
  const bodyS = lie ? [ell([17, 51], 9.5, 7.6), ell([27, 52], 14, 8.2), ell([37, 48.5], 12.5, 9.5), ell([44, 52], 7.5, 7)] : [ell(S([16.5, 44]), 10, 9.6), ell(S([27, 45.5]), 14, 10.5), ell(S([37, 39 - f * .5]), 13, 12.5 + f * .5), ell(S([44, 46]), 8, 9)];
  F.add({ mat: hide, prof: 'round', bw: 7, hs: .8, grp: 'body', shapes: bodyS, tex: htex });
  // silvered back of an old boar, and scars
  const grz = lie ? [ell([33, 44], 9, 3)] : [ell(S([34, 30.5 - f * .5]), 9.5, 3.2)];
  F.add({ mat: 'grizzle', prof: 'round', bw: 2, hs: .6, grp: 'body', shapes: grz, tex: ({ x, y }) => ((x + y * 3) % 4 === 0 ? -1 : 0) });
  const sc = lie ? [[22, 50], [29, 53], [25, 48], [31, 51]] : [S([22, 43]), S([29, 47]), S([25, 40.5]), S([31, 44.5])];
  F.add({ mat: 'grizzle', prof: 'flat', grp: 'scars', noShadow: true, noOutline: true, shapes: [cap(sc[0], sc[1], .45), cap(sc[2], sc[3], .45)] });
  const mane = lie ? [[47, 44], [40, 39.5], [32, 40.5], [24, 44], [14, 45.5]] : [[48, 34], [40, 27.5], [32, 28.3], [24, 33.2], [14, 36]].map(S);
  F.add({ mat: 'leatherDark', prof: 'ridge', hs: .9, grp: 'mane', shapes: spikesC(spineThorns(mane, 14 + gT * 2, 5.5 + gT * .8, 1.2, -.6)) });
  if (gT >= 2) F.add({ mat: gT >= 3 ? 'rotwood' : 'thorn', prof: 'ridge', hs: .9, grp: 'thornmane', shapes: spikesC(spineThorns(mane, 4 + gT, 6 + gT, 1.3, -.4)) });
  const wound = lie ? [35, 40.5] : S([35.5, 28.5]);
  F.add({ mat: 'flesh', prof: 'round', bw: 1.2, grp: 'wound', noShadow: true, shapes: [ell(wound, 3.2, 1.7)] });
  F.add({ mat: 'sap', prof: 'round', bw: .6, grp: 'blood', noShadow: true, shapes: [cap([wound[0] + 1.5, wound[1] + 1], [wound[0] + 2, wound[1] + 4.5], .6, .8)] });
  leg(legs.hn, false, 'hn'); leg(legs.fn, false, 'fn');
  const hf = frame(H[0], H[1], ha);
  F.add({ mat: 'bone', prof: 'round', bw: 1, grp: 'tuskF', shapes: chainC([hf.P(7, 5.4), hf.P(10.2, 4.2), hf.P(12, .8), hf.P(11.4, -2)], [1.3, 1.1, .8, .45]), tex: DARK });
  F.add({ mat: hide, prof: 'round', bw: 1.2, grp: 'earF', shapes: [hf.poly([[-.8, -6.6], [-3.4, -12], [1.8, -7.2]])], tex: DARK });
  F.add({ mat: hide, prof: 'round', bw: 3.5, grp: 'head', shapes: [rell(hf, 0, 0, 8, 7.2), hf.cap(4, 1.5, 12, 3.2, 4.8, 3.6), hf.cap(3, 5.5, 9.5, 6, 3, 2.2)], tex: ({ x, y, u }) => (u > 4 && vnoise(x * .5, y * .5, 9) > .5 ? { m: 'grizzle' } : htex({ x, y })) });
  F.add({ mat: 'snout', prof: 'round', bw: 1.2, grp: 'snout', shapes: [rell(hf, 12.8, 3.3, 1.4, 3.1, 12)] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'nostril', noShadow: true, noOutline: true, shapes: [hf.circ(13.3, 2.2, .55), hf.circ(13.3, 4.4, .55)] });
  F.add({ mat: 'bone', prof: 'round', bw: 1, grp: 'tusk', shapes: chainC([hf.P(8, 6), hf.P(11.6, 5), hf.P(13.6, 1.4), hf.P(13, -2.2)], [1.6, 1.3, .9, .5]) });
  F.add({ mat: hide, prof: 'round', bw: 1.2, grp: 'ear', shapes: [hf.poly([[-3.2, -5.6], [-7.8, -11.6], [-.4, -7.4]])], tex: htex });
  F.add({ mat: 'leatherDark', prof: 'round', bw: .8, grp: 'brow', shapes: [hf.cap(1, -3.6, 5.6, -2.6, 1)] });
  eyeOf(F, hf, 3.6, -1.6, 1.1, .8, 'eyeRed', eye === 'shut');
  // the Thornsplitter hatchet, its edge bitten into the hump, haft standing out of the hide
  if (relic && held && RELIC_ART[relic]) {
    const cut = lie ? ell([37, 50], 11, 7.4) : ell(S([37, 41.5]), 11.6, 10.4);
    const m = drawItem(F, RELIC_ART[relic], [wound[0] + .5, wound[1] - 1], Math.PI + .28, .46, { center: [30, 14], cut: [cut] });
    A.relic = m([41.2, 23.8]);
  }
  A.head = hf.P(3.6, -1.6); A.mouth = hf.P(12, 5); A.center = lie ? [28, 50] : S([30, 42]);
}

function briarmaw(F, st) {
  const { pose, f, phase, broken } = st, A = st.anchors;
  const P3 = phase >= 3, P2 = phase >= 2;
  const baseM = P3 ? 'rotwood' : 'bark', ropeM = P3 ? 'rot' : 'bramble', thornM = P3 ? 'rotwood' : 'thorn', eyeM = P3 ? 'blight' : P2 ? 'eyeRed' : 'amber';
  let bx = 0, by = P3 ? 2 : 0, H = [77, 58 + f + (P3 ? 2 : 0)], ha = .1 + (P3 ? .08 : 0), jaw = .1 + (P2 ? .12 : 0) + f * .05, eye = 'open', lie = false;
  let armN = [[61, 58], [65, 72], [67, 85]], armF = [[52, 57], [51, 71], [52.5, 85]];
  let legN = [[31, 72], [37, 80], [32, 86], [34, 90]], legF = [[26, 70], [31.5, 79], [27, 85], [28.5, 90]];
  let pawN = [70.5, 89], pawF = [56, 89.5];
  if (pose === 'attack') {
    bx = 3; H = [83, 63 + (P3 ? 2 : 0)]; ha = .3; jaw = 1;
    armN = [[65, 55], [74, 48], [83, 43]]; pawN = [86.5, 41.5];
    armF = [[56, 58], [59, 72], [62.5, 85]]; pawF = [66.5, 89.5];
    legN = [[34, 72], [40, 80], [34, 86], [35, 90]]; legF = [[29, 70], [34, 79], [28, 85], [28, 90]];
  } else if (pose === 'hurt') {
    bx = -4; by -= 2; H = [71, 49]; ha = -.38; jaw = .6; eye = 'shut';
    armN = [[57, 56], [61, 70], [62, 84.5]]; pawN = [66, 88.5]; armF = [[48, 55], [46, 69], [47, 84.5]]; pawF = [51, 88.5];
  } else if (pose === 'ko') {
    lie = true; H = [75, 83]; ha = .22; jaw = .35; eye = 'shut';
    armN = [[60, 78], [70, 85], [79, 89]]; pawN = [83, 90]; armF = [[52, 78], [58, 86], [65, 90]]; pawF = [69, 90.5];
    legN = [[30, 82], [22, 87], [14, 90]]; legF = [[26, 81], [18, 86], [10, 89]];
  }
  // body space: idle coordinates, squashed onto the ground when fallen
  const T = p => (lie ? [p[0], 74 + (p[1] - 52) * .62] : [p[0] + bx, p[1] + by]);
  const barkTex = ({ x, y }) => { const n = vnoise(x * .22, y * .22, 3); if (!P3 && n > .76) return { m: 'moss', dd: 0 }; return ((x * 3 + y) % 7 === 0 || (x - y * 2 + 99) % 11 === 0) ? -1 : n < .25 ? 1 : 0; };
  const ropeTex = ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0);
  const claws = (p, g, far) => F.add({ mat: 'claw', prof: 'ridge', hs: .9, grp: g, shapes: spikesC([[p[0] + 4.5, p[1] - 1.5, 1, .3, 5, 1.3], [p[0] + 5.5, p[1] + .6, 1, .6, 5, 1.3], [p[0] + 4.5, p[1] + 2.5, .9, .9, 4.4, 1.2]]), tex: far ? DARK : null });
  const paw = (p, g, far) => { F.add({ mat: baseM, prof: 'round', bw: 3, grp: g, shapes: [ell(p, 7.5, 4)], tex: far ? farTex(barkTex) : barkTex }); claws(p, g + 'c', far); };
  const limb = (pts, rs, g, far) => {
    F.add({ mat: baseM, prof: 'round', bw: rs[0] * .7, grp: g, shapes: chainC(pts, rs), tex: far ? farTex(barkTex) : barkTex });
    // a bramble rope spiralling down the limb
    const R = []; for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1]; for (let u = 0; u < 1; u += .2) { const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, r = rs[k] + (rs[k + 1] - rs[k]) * u; R.push([x + Math.sin((k + u) * 2.2) * r * .55, y]); } }
    R.push(pts[pts.length - 1]);
    F.add({ mat: ropeM, prof: 'round', bw: 1.2, grp: g + 'r', shapes: chainC(R, 1.4), tex: far ? farTex(ropeTex) : ropeTex });
  };
  // far limbs
  limb(lie ? legF : legF.map((p, i) => (i === 0 ? T(p) : p)), lie ? [7, 5, 4] : [7, 5, 4, 3.6], 'legF', true);
  limb(armF.map((p, i) => (i === 0 ? T(p) : p)), [7.5, 6, 5], 'armF', true); paw(pawF, 'pawF', true);
  const tl = [T([15, 62]), T([9, 67]), T([6, 73])];
  F.add({ mat: baseM, prof: 'round', bw: 3, grp: 'tail', shapes: chainC(tl, [5, 4, 2]), tex: barkTex });
  // body mass (bark) wrapped in bramble ropes
  const bodyS = [ell(T([28, 64]), 14, lie ? 9 : 13.5), ell(T([46, 68]), 17, lie ? 7.6 : 11), ell(T([50, 52 - f]), 21, (19 + f * .5) * (lie ? .66 : 1)), ell(T([64, 57]), 10, lie ? 7.4 : 11)];
  F.add({ mat: baseM, prof: 'round', bw: 10, hs: .8, grp: 'body', shapes: bodyS, tex: barkTex });
  // braided bramble cords twisting diagonally over the bark, like wound muscle
  const ropes = [
    [[21, 55], [30, 44.5], [42, 37], [54, 34.5], [63, 38]], [[17, 67], [27, 58], [39, 50], [52, 45.5], [63, 46], [70, 51]],
    [[24, 77], [35, 68], [47, 60], [59, 57], [67, 61]], [[40, 79], [51, 72], [60, 69]],
  ];
  const cross = [[[37, 39], [35, 50], [29, 60], [24, 70]], [[57, 35], [57, 47], [52, 60], [46, 73]], [[68, 44], [67, 55], [63, 66]]];
  ropes.forEach((r, k) => F.add({ mat: ropeM, prof: 'round', bw: 2.2, grp: 'rope' + k, shapes: chainC(r.map(T), r.map((_, i) => 2 + Math.sin(i / (r.length - 1) * Math.PI) * 1.3)), tex: ropeTex }));
  cross.forEach((r, k) => F.add({ mat: ropeM, prof: 'round', bw: 1.8, grp: 'cross' + k, shapes: chainC(r.map(T), r.map((_, i) => 1.5 + Math.sin(i / (r.length - 1) * Math.PI) * 1)), tex: farTex(ropeTex) }));
  // back thorns and thorns bursting from the rope crossings
  const back = [[68, 43], [58, 35.5], [46, 33.5], [34, 38.5], [22, 49], [13, 59]].map(T);
  const len = (P3 ? 15 : P2 ? 12.5 : 10.5) * (lie ? .7 : 1);
  const bt = spineThorns(back, P3 ? 15 : P2 ? 12 : 10, len, 2.3, lie ? -.7 : -.35);
  const burst = [[35, 50, -.9, -.4, 5, 1.4], [57, 47, .3, -1, 5.5, 1.4], [29, 60, -1, .2, 4.5, 1.3], [52, 60, .5, .4, 4, 1.2]].map(([x, y, dx, dy, l, w]) => { const q = T([x, y]); return [q[0], q[1], dx, dy, l * (P2 ? 1.3 : 1), w]; });
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'thorns', shapes: spikesC(bt.concat(burst)) });
  if (P3) F.add({ mat: 'blight', prof: 'round', bw: 1, grp: 'tips', noShadow: true, shapes: bt.filter((_, k) => k % 2 === 0).map(([x, y, dx, dy, L]) => { const l = Math.hypot(dx, dy); return circ([x + dx / l * L * .82, y + dy / l * L * .82], 1.1); }) });
  // glowing blight cracks
  const V = [[[42, 44], [44.5, 48], [42.5, 52.5], [45, 57]], [[57, 40], [55, 45], [58, 50]], [[29, 60], [32, 63.5], [30, 68]], [[62, 50], [60, 55.5], [63, 61]], [[47, 59], [50, 63.5], [48, 69]], [[24, 55], [21, 60], [24, 64]]];
  const nV = P3 ? 6 : P2 ? 3 : 0;
  for (let k = 0; k < nV; k++) F.add({ mat: 'blight', prof: 'round', bw: .7, grp: 'vein' + k, noShadow: true, shapes: chainC(V[k].map(T), P3 ? .75 : .6) });
  if (P2 && !lie) F.add({ mat: 'sap', prof: 'round', bw: 1, grp: 'sap', noShadow: true, shapes: [cap(T([40, 77]), T([40, 80.5 + f]), 1, 1.3), cap(T([50, 78]), T([50, 81.5]), .9, 1.2)].concat(P3 ? [cap(T([30, 76]), T([30, 80]), .9, 1.2), cap(T([58, 66]), T([58.5, 70]), .8, 1.1)] : []) });
  limb(lie ? legN : legN.map((p, i) => (i === 0 ? T(p) : p)), lie ? [8, 5.6, 4.4] : [8, 5.6, 4.4, 4], 'legN');
  if (!lie) paw([legN[3][0] + 2, legN[3][1] + .5], 'pawH');
  // head: a long bark skull with thorn horns, a glowing eye, a thorn-toothed maw and a sabre fang
  const hf = frame(H[0] + bx * .5, H[1], ha);
  const jf = frame(...hf.P(-1, 5.6), ha + jaw * .6);
  F.add({ mat: baseM, prof: 'round', bw: 5, grp: 'neck', shapes: [cap(T([63, 55]), hf.P(-5, 1), 10, 8.5)], tex: barkTex });
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'hornF', shapes: [hf.poly([[-2, -7.5], [-8, -17.5], [2, -8.5]])], tex: DARK });
  // the thorn crown (Thornwreath) sits on the crown of the skull, behind the eyes
  const crownAt = hf.P(-6.5, -10.2);
  const crownOn = !broken.includes('thornwreath') && st.held && RELIC_ART.thornwreath;
  if (jaw > .2) F.add({ mat: 'flesh', prof: 'round', bw: 2, grp: 'maw', shapes: [poly([hf.P(-1, 3.5), hf.P(17, 3.8), jf.P(16, 1), jf.P(0, 0)])] });
  F.add({ mat: baseM, prof: 'round', bw: 3, grp: 'jaw', shapes: [jf.poly([[-1.5, -1.6], [16, 0], [17, 2.6], [11, 5.4], [-1, 4.8]])], tex: barkTex });
  F.add({ mat: 'bone', prof: 'ridge', grp: 'teethL', shapes: [3, 6.5, 10, 14].map(t => jf.poly([[t - 1.1, -.3], [t, -3.4 - (jaw > .5 ? .8 : 0)], [t + 1.1, -.3]])) });
  F.add({ mat: baseM, prof: 'round', bw: 5, grp: 'skull', shapes: [rell(hf, -1, -.5, 10.5, 8.8), hf.poly([[0, -6], [13, -4], [19.5, -.6], [19.8, 3], [17, 4.8], [0, 5]])], tex: barkTex });
  F.add({ mat: 'bone', prof: 'ridge', grp: 'teethU', shapes: [4, 7.5, 13.5, 17].map(t => hf.poly([[t - 1, 4.4], [t, 7.6 + (jaw > .5 ? .8 : 0)], [t + 1, 4.4]])) });
  F.add({ mat: ropeM, prof: 'round', bw: 1.3, grp: 'jawrope', shapes: chainC([hf.P(-8, 4), hf.P(-4, 6.5), hf.P(0, 6)], 1.5), tex: ropeTex });
  F.add({ mat: baseM, prof: 'round', bw: 1.8, grp: 'brow', shapes: [hf.cap(-4, -6.6, 9, -4.4, 2.8, 1.5)], tex: barkTex });
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'browthorn', shapes: [hf.poly([[5.5, -5], [10, -9.4], [9, -4.4]])] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'nostril', noShadow: true, noOutline: true, shapes: [hf.circ(18.6, .2, .8)] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'socket', noShadow: true, noOutline: true, shapes: [rell(hf, 3.4, -2.2, 3.4, 2.3, 12)] });
  eyeOf(F, hf, 3.6, -2.2, 2.5, 1.5, eyeM, eye === 'shut', 'eyeN');
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'horn', shapes: [hf.poly([[-6.5, -5], [-19, -12], [-3.5, -8.8]])] });
  if (P2 && !lie && jaw < .6) F.add({ mat: 'sap', prof: 'round', bw: .8, grp: 'drool', noShadow: true, shapes: [cap(jf.P(13.5, 5), add2(jf.P(13.5, 5), [0, 4.5 + f]), .8, 1.1)] });
  if (P2) F.add({ mat: 'blight', prof: 'round', bw: .6, grp: 'headvein', noShadow: true, shapes: chainC([hf.P(-7, -2), hf.P(-4, 1), hf.P(-6, 4)], .6) });
  if (crownOn) { const m = drawItem(F, RELIC_ART.thornwreath, crownAt, ha - .22, .5, { center: [32, 43] }); A.crown = m([32, 44]); }
  else F.add({ mat: thornM, prof: 'ridge', grp: 'crownstubs', shapes: spikesC([[crownAt[0] - 4, crownAt[1] + 2, -.3, -1, 2.5, 1], [crownAt[0] + 1, crownAt[1] + 1.5, 0, -1, 2, 1], [crownAt[0] + 5, crownAt[1] + 2, .3, -1, 2.3, 1]]) });
  // the great fang (Briarfang): a sabre tooth hanging from the upper jaw, curving back
  const fangAt = hf.P(10.5, 4.2);
  if (!broken.includes('briarfang') && st.held && RELIC_ART.briarfang) {
    const m = drawItem(F, RELIC_ART.briarfang, fangAt, ha + 2.36 - .15, .52, { center: [22, 42], drop: ['grip', 'pommel', 'guard', 'guardthorn', 'guardgem'] });
    A.fang = m([38, 28]);
  } else {
    F.add({ mat: 'bone', prof: 'round', bw: 1.2, grp: 'stump', shapes: [poly([add2(fangAt, [-2, -.5]), add2(fangAt, [2, -.5]), add2(fangAt, [1.6, 2.6]), add2(fangAt, [.4, 1.6]), add2(fangAt, [-.6, 3.2]), add2(fangAt, [-1.8, 2])])] });
  }
  // near arm last: in front of the head when it swipes
  const armP = pose === 'attack' || lie ? armN : armN.map((p, i) => (i === 0 ? T(p) : p));
  limb(armP, [8.5, 7, 5.6], 'armN');
  F.add({ mat: thornM, prof: 'ridge', hs: .9, grp: 'armthorns', shapes: spikesC([[armP[0][0] + 1, armP[0][1] - 6.5, .3, -1, P2 ? 8 : 6, 1.7], [armP[1][0] + 4.5, armP[1][1] - 2, 1, -.5, P2 ? 7 : 5, 1.5]].concat(P3 ? [[armP[1][0] - 3.5, armP[1][1] + 4, -1, -.2, 5.5, 1.3]] : [])) });
  paw(pawN, 'pawN');
  A.head = hf.P(3.6, -2.2); A.mouth = jf.P(10, 1); A.center = lie ? [44, 76] : T([46, 60]);
  A.relics = [A.crown, A.fang].filter(Boolean); A.relic = A.relics[0] || null;
}

/* ---------- registry of beasts ---------- */
Object.assign(FOE_ART, {
  briarling: { name: 'Briarling', kind: 'beast', w: 48, h: 48, foot: [24, 45], defaultTier: 'rabble', build: briarling },
  thornhound: { name: 'Thornhound', kind: 'beast', w: 64, h: 48, foot: [30, 45], defaultTier: 'rabble', build: thornhound },
  rotstag: { name: 'The Rot-Stag', kind: 'beast', w: 64, h: 64, foot: [30, 62], defaultTier: 'relic-bearer', relic: 'rotwood-circlet', build: rotstag },
  oldsnag: { name: 'Old Snag', kind: 'beast', w: 64, h: 64, foot: [30, 61], defaultTier: 'relic-bearer', relic: 'thornsplitter', build: oldsnag },
  briarmaw: { name: 'Briarmaw', kind: 'beast', w: 96, h: 96, foot: [46, 93], defaultTier: 'champion', relic: 'thornwreath', relics: ['thornwreath', 'briarfang'], phases: 3, build: briarmaw },
});

/* =====================================================================
   M3 · THE VERDANT WILDS (spec §3.2): ten new families, the seven named holders, and Tamsin
   ===================================================================== */

// Relics 13-24 (spec §3.4): kind and aspect. RELIC_ART (WP6B) owns their looks. Until one lands, a
// procedural heirloom of the same kind and aspect stands in (built by itemArt, as the card is), so a
// missing RELIC_ART key never throws and the holder still carries something of the right kind.
const M3_RELICS = {
  lightfingers: ['gloves', 'frost'], hartshorn: ['bow', 'storm'], 'mosswatch-lantern': ['focus', 'ember'],
  'watchkeepers-kettle': ['kettle', 'storm'], 'mire-pearl': ['ring', 'tide'], dawnbell: ['mace', 'radiant'],
  rootsong: ['staff', 'tide'], oathshield: ['shield', 'stone'], 'isoldes-oath': ['sword', 'frost'],
  'ichor-mask': ['helm', 'blight'], 'first-seed': ['amulet', 'verdant'], 'vale-gauntlets': ['gauntlets', 'storm'],
};
const standIns = new Map();
// relicArt(id) -> the relic's art { r, p, relic } (RELIC_ART, else the stand-in), or null for an unknown id
function relicArt(id) {
  if (!id || typeof id !== 'string') return null;
  if (RELIC_ART[id]) return RELIC_ART[id];
  const k = M3_RELICS[id];
  if (!k) return null;
  if (!standIns.has(id)) {
    const a = itemArt({ base: id, kind: k[0], rarity: 'heirloom', aspect: k[1], seed: 24 });
    standIns.set(id, a && RECIPE[a.r] ? Object.assign({}, a, { relic: true }) : null);
  }
  return standIns.get(id);
}
// draw a relic into a beast only when its recipe exists (a look WP6B has not written yet never throws)
const drawRelic = (F, art, at, angle, k, opt) => (art && RECIPE[art.r] ? drawItem(F, art, at, angle, k, opt) : null);
// card-space point of a weapon recipe, t along the weapon and s across it (for glints and placement)
function cardPt(art, t, s = 0) {
  const R = RECIPE[art.r], l = Math.hypot(R.a[0], R.a[1]), ax = R.a[0] / l, ay = R.a[1] / l;
  return [R.o[0] + ax * t - ay * s, R.o[1] + ay * t + ax * s];
}

/* ---------- M3 humanoids: the same rig, plus the few parts it does not know, drawn in rig space ----------
   Rig coordinates face left before the mirror (-x is the front); r.j holds the joints (hc head centre,
   cx, sh shoulders, wa waist, hL weapon hand, hR off hand, lean), r.b the build. */

// rig groups that make up a worn look, so a worn relic glints like a held one
const LOOK_GRPS = {
  head: ['hood', 'hoodtrim', 'hoodvine', 'hoodclasp', 'helm', 'helmin', 'plume', 'helmface', 'helmcrest', 'helmband', 'helmrunes', 'helmgem', 'helmeyes', 'brim', 'circlet', 'circletthorn', 'coif', 'coifband', 'crown', 'crownband', 'crownthorns', 'crownbuds', 'bell-1', 'bell1'],
  body: ['torso', 'faulds', 'trim', 'vine', 'glyph', 'belt', 'buckle', 'pd-1', 'pd1', 'pdt-1', 'pdt1', 'robe'],
  hands: ['handR', 'handL', 'handRt', 'handLt', 'vamR', 'vamL'],
  offhand: ['shield', 'shieldrim', 'shieldboss', 'sigil', 'sigilchain', 'orbcradle', 'tome', 'tomepg', 'rings', 'ringscord', 'ringsglow'],
  feet: ['boot-1', 'boot1', 'greave-1', 'greave1', 'bootcuff-1', 'bootcuff1', 'bootgem-1', 'bootgem1'],
  amulet: ['amuchain', 'amulet'],
};
// gear and identity of an M3 humanoid: like humanoid(), plus an always-worn relic (def.wear) and stand-ins
function humanoidM3(def, o) {
  const gt = clamp(o.gearTier ?? 0, 0, def.gear.length - 1), T = def.gear[gt], tier = tierNum(o.tier ?? def.defaultTier);
  const H = Object.assign({}, def.H, T.H || {});
  const gear = Object.assign({}, T); delete gear.H;
  if (tier >= 1 && def.veteran) Object.assign(gear, def.veteran.gear);
  if (def.wear) { const a = relicArt(def.wear), s = relicSlot(def.wear); if (a && s) gear[s] = a; }
  const relic = o.relic === undefined ? def.relic : o.relic, held = o.relicHeld !== false, slot = relic ? relicSlot(relic) : null;
  if (relic && !held && slot === 'weapon') gear.weapon = null; // the relic clattered away
  if (relic && held && slot) gear[slot] = relicArt(relic);
  // a kindled kit (Tamsin at Scorchgate, gearTier 4): everything she carries has the Kindled stage's ember rim
  if (T.kindle) for (const s of Object.keys(gear)) if (gear[s] && gear[s].p) gear[s] = stagedArt(gear[s], 'kindled');
  return { H, gear, relic, held, relicSlotName: relic && held && slot ? slot : null };
}
const capsX = (X, pts, rs) => { const S = []; for (let k = 0; k < pts.length - 1; k++) S.push(X.cap(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], Array.isArray(rs) ? rs[k] : rs, Array.isArray(rs) ? rs[k + 1] : rs)); return S; };
// add a part just behind the first part of any of these groups (so it sits under them)
function under(F, part, grps) {
  const p = F.add(part);
  if (!p) return p;
  const i = F.parts.findIndex(q => grps.includes(q.grp));
  if (i >= 0 && i < F.parts.length - 1) { F.parts.pop(); F.parts.splice(i, 0, p); }
  return p;
}
// a strap across the chest, back shoulder to front hip, under the arms; returns a point along it (0..1)
function strap(c, mat, r = .8) {
  const { F, X, j, b } = c, a = [j.cx + b.shW - 1.2 + j.lean, j.sh - .3], z = [j.cx - b.waW - .3, j.wa + .8];
  under(F, { X, mat, prof: 'round', bw: .8, grp: 'strap', shapes: [X.cap(a[0], a[1], z[0], z[1], r)] }, ['armR']);
  return u => [a[0] + (z[0] - a[0]) * u, a[1] + (z[1] - a[1]) * u];
}
// a ragged hem: small bites out of the bottom of a part (the cloak by default)
function tatter(c, grp = 'cloak', n = 7) {
  const p = c.F.parts.find(q => q.grp === grp);
  if (!p) return;
  const { X, j, b } = c, bot = j.kneel ? 46.8 : 44.2, x0 = j.cx - b.shW - 4.2, x1 = j.cx + b.shW + 4.2, cuts = [];
  for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0) * (k + .5) / n, h = 1.4 + hash(k, 3, 17) * 2.4; cuts.push(X.poly([[x - 1.2, bot + 3], [x + (hash(k, 5, 17) - .5) * 1.2, bot + 1.4 - h], [x + 1.2, bot + 3]])); }
  p.cuts = (p.cuts || []).concat(cuts);
}
// antlers rising from the head (the feral druids and the Thornmother), size 1..5
function antlers(c, size, mat, tip) {
  const { F, X, j } = c, [hx0, hy0] = j.hc, s = .5 + size * .15, w = Math.min(1.25, .8 + size * .1);
  for (const side of [-1, 1]) {
    const Pt = (a, h) => [hx0 + side * (2.4 + a * s), hy0 - 5.4 - h * s];
    const S = capsX(X, [Pt(0, 0), Pt(1.8, 3.6), Pt(3.2, 7.6), Pt(3.4, 11.8), Pt(2.4, 15.4)], [1.2 * w, 1.05 * w, .9 * w, .7 * w, .45 * w]);
    S.push(X.cap(...Pt(2, 4.2), ...Pt(6, 5.8), .8 * w, .4), X.cap(...Pt(3.3, 8.6), ...Pt(7.4, 10.6), .75 * w, .35));
    if (size >= 3) S.push(X.cap(...Pt(3.4, 12), ...Pt(6.8, 15.8), .65 * w, .3));
    if (size >= 5) S.push(X.cap(...Pt(1.2, 2), ...Pt(4.6, 1.2), .7, .35), X.cap(...Pt(2.8, 14), ...Pt(.6, 18.6), .55, .3));
    F.add({ X, mat, prof: 'round', bw: .8, grp: 'antler' + side, shapes: S, tex: ({ x, y }) => ((x + y) % 4 === 0 ? -1 : 0) });
    if (tip) F.add({ X, mat: tip, prof: 'round', bw: .6, grp: 'antlertip' + side, noShadow: true, shapes: [X.circ(...Pt(2.4, 15.4), .75), X.circ(...Pt(7.4, 10.6), .7), X.circ(...Pt(6, 5.8), .65)] });
  }
}
// after heroForge: worn relics glint, then the identity's own extra parts
function m3Humanoid(def, r, c) {
  const F = r.F, X = c.P.lie ? Xf(r.OX + 41, r.OY + 22.5, 0, 1, 1) : Xf(r.OX, r.OY, 1, 0, 1);
  const ctx = Object.assign({ F, X, j: r.j, b: r.b, anchors: r.anchors, lie: !!c.P.lie }, c);
  const flag = slot => { const g = LOOK_GRPS[slot]; if (g) for (const p of F.parts) if (g.includes(p.grp)) p.relic = true; };
  if (c.relic && c.held && c.slot && c.slot !== 'weapon' && !c.drawn) {
    flag(c.slot);
    if (c.slot === 'hands') r.anchors.relic = r.anchors.handL;
    if (c.slot === 'offhand') r.anchors.relic = r.anchors.handR;
  }
  if (def.wear && relicArt(def.wear)) flag(relicSlot(def.wear));
  if (def.extra) def.extra(ctx);
}

/* ---- the identities' extra parts ---- */
// smuggler: a satchel on a strap, and at gearTier 0 a knotted head-wrap (the teal kerchief is the rig's scarf)
function smugglerX(c) {
  const { F, X, j, H } = c, [hx0, hy0] = j.hc, at = strap(c, H.satchel || 'leather'), z = at(1);
  under(F, { X, mat: H.satchel || 'leather', prof: 'round', bw: 1.4, grp: 'satchel', shapes: [X.poly([[z[0] - 3, z[1] - 1], [z[0] + 1.8, z[1] - 1.4], [z[0] + 2, z[1] + 3.6], [z[0] - 2.8, z[1] + 4]])], tex: ({ y }) => (y % 4 === 0 ? -1 : 0) }, ['armR']);
  if (H.headwrap) {
    F.add({ X, mat: H.headwrap, prof: 'round', bw: 2.5, grp: 'headwrap', shapes: [X.ell(hx0 + .3, hy0 - 3, 7.4, 5.8)], clip: X.poly([[hx0 - 12, hy0 - 14], [hx0 + 12, hy0 - 14], [hx0 + 12, hy0 - 1.4], [hx0 - 12, hy0 - 1.4]]), tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) });
    F.add({ X, mat: H.headwrap, prof: 'round', bw: 1.2, grp: 'wrapknot', shapes: [X.circ(hx0 + 6.7, hy0 - 3.2, 1.7), X.cap(hx0 + 7, hy0 - 2.8, hx0 + 10.2, hy0 + 2.8, 1.1, .6), X.cap(hx0 + 7.2, hy0 - 2.4, hx0 + 8.6, hy0 + 4.6, 1, .5)] });
  }
}
// Mags Kestrel: a neckerchief worn loose, and a kestrel feather in the hat band
function magsX(c) {
  const { F, X, j, H, L } = c, [hx0, hy0] = j.hc;
  F.add({ X, mat: H.neckerchief || 'clothTeal', prof: 'round', bw: 1.5, grp: 'kerchief', shapes: [X.poly([[hx0 - 4.6, hy0 + 5.2], [hx0 + 4.6, hy0 + 5.2], [hx0 + 3.4, hy0 + 8], [hx0, hy0 + 9.2], [hx0 - 3.4, hy0 + 8]]), X.cap(hx0 + 2.8, hy0 + 7.4, hx0 + 4.8, hy0 + 10.6, .8, .5)] });
  if (c.relic && c.held && c.slot === 'hands' && !c.lie) F.add({ X, mat: M3_RELICS[c.relic] ? M3_RELICS[c.relic][1] === 'frost' ? 'frost' : 'arcane' : 'arcane', prof: 'round', bw: .6, grp: 'fingerglow', noShadow: true, noOutline: true, shapes: [X.circ(j.hL[0] - 1.6, j.hL[1] + 1, .6), X.circ(j.hR[0] - 1.4, j.hR[1] + 1.1, .6)] });
  if (L.head && L.head.look === 'kettle') F.add({ X, mat: 'hairCopper', prof: 'round', bw: .8, grp: 'feather', shapes: [X.poly([[hx0 + 5.2, hy0 - 3.2], [hx0 + 8.4, hy0 - 9.4], [hx0 + 10.8, hy0 - 13.6], [hx0 + 10.6, hy0 - 9.2], [hx0 + 7, hy0 - 2.6]])], tex: ({ x, y }) => ((x + y) % 3 === 0 ? { m: 'leatherDark', dd: 0 } : 0) });
}
function druidX(c) { if (c.H.antlers) antlers(c, c.H.antlers, c.gT >= 3 ? 'rotwood' : 'bone', c.gT >= 3 ? 'blight' : null); }
// Oda the Thornmother: a great antler crown with blossoms caught in it, over a torn bramble cloak
function odaX(c) {
  const { F, X, j, gT } = c, [hx0, hy0] = j.hc;
  tatter(c);
  antlers(c, c.H.antlers || 5, gT >= 3 ? 'rotwood' : 'bone', gT >= 3 ? 'blight' : null);
  F.add({ X, mat: gT >= 3 ? 'blight' : 'clothWhite', prof: 'round', bw: .8, grp: 'blossom', noShadow: true, shapes: [X.circ(hx0 - 5.6, hy0 - 8.8, 1.1), X.circ(hx0 + 6.2, hy0 - 11.2, 1), X.circ(hx0 - 7.6, hy0 - 13.8, .9)] });
}
// Hollowed rangers: a torn Thornwatch cloak; bracket fungus on the shoulder from gearTier 2
function rangerX(c) {
  const { F, X, j, b, gT } = c, cx = j.cx;
  tatter(c);
  if (gT >= 2) F.add({ X, mat: gT >= 3 ? 'rot' : 'thorn', prof: 'round', bw: 1, grp: 'fungus', shapes: [X.ell(cx + b.shW + .4 + j.lean, j.sh + .4, 2.2, 1), X.ell(cx + b.shW + 1.2 + j.lean, j.sh + 2.4, 1.7, .8)] });
  if (gT >= 3) F.add({ X, mat: 'blight', prof: 'round', bw: .6, grp: 'sporeglow', noShadow: true, shapes: [X.circ(cx + b.shW - .2 + j.lean, j.sh - .1, .7)] });
}
// Sgt Corra Thistle: a ranger with the sergeant's bronze badge
function corraX(c) {
  rangerX(c);
  const { F, X, j } = c, x = j.cx - 2.4 + j.lean, y = j.sh + 2.8;
  F.add({ X, mat: 'bronze', prof: 'round', bw: .8, grp: 'badge', shapes: [X.poly([[x - 1.2, y - 1], [x + 1.2, y - 1], [x + 1, y + .8], [x, y + 1.6], [x - 1, y + .8]])] });
}
// Haskett the poacher: a wolf-pelt hood (ears, snout, teeth) and a hunting horn at the hip
function haskettX(c) {
  const { F, X, j, b, H, L } = c, [hx0, hy0] = j.hc, cx = j.cx, m = H.pelt || 'grizzle';
  if (L.head && L.head.look === 'hood') {
    F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'peltears', shapes: [X.poly([[hx0 - 6, hy0 - 5.6], [hx0 - 6.8, hy0 - 11.6], [hx0 - 3, hy0 - 8.2]]), X.poly([[hx0 + 2.4, hy0 - 8.6], [hx0 + 5.6, hy0 - 12.2], [hx0 + 6.4, hy0 - 6.2]])] });
    // the wolf's head worn over his brow: its muzzle juts forward, teeth over his eyes
    F.add({ X, mat: 'wolfFur', prof: 'round', bw: 1.6, grp: 'peltsnout', shapes: [X.poly([[hx0 - 2.6, hy0 - 10.4], [hx0 - 10.4, hy0 - 9], [hx0 - 13.2, hy0 - 7.2], [hx0 - 12.4, hy0 - 5.4], [hx0 - 3.6, hy0 - 5.2]])], tex: ({ x, y }) => ((x * 2 + y) % 5 === 0 ? -1 : 0) });
    F.add({ X, mat: 'dark', prof: 'round', bw: .6, grp: 'peltnose', noShadow: true, shapes: [X.circ(hx0 - 12.8, hy0 - 7, 1.05)] });
    F.add({ X, mat: 'dark', prof: 'flat', grp: 'pelteye', noShadow: true, noOutline: true, shapes: [X.cap(hx0 - 6, hy0 - 8.9, hx0 - 7.6, hy0 - 8.5, .45)] });
    F.add({ X, mat: 'bone', prof: 'ridge', grp: 'peltteeth', noShadow: true, shapes: [X.poly([[hx0 - 11, hy0 - 5.6], [hx0 - 10.5, hy0 - 3.8], [hx0 - 10, hy0 - 5.6]]), X.poly([[hx0 - 7.4, hy0 - 5.4], [hx0 - 6.9, hy0 - 3.8], [hx0 - 6.4, hy0 - 5.4]])] });
  }
  under(F, { X, mat: 'bone', prof: 'round', bw: 1, grp: 'horn', shapes: capsX(X, [[cx + b.waW + .6, j.wa + .2], [cx + b.waW + 3, j.wa + 3], [cx + b.waW + 2.6, j.wa + 6.4]], [.7, 1.1, 1.5]) }, ['armR']);
  under(F, { X, mat: 'bronze', prof: 'round', bw: .8, grp: 'hornrim', shapes: [X.circ(cx + b.waW + 2.6, j.wa + 6.8, 1.5)] }, ['armR']);
}
// Hollis Fairweight: the Mosswatch Lantern, held up in the off hand (drawn from its own recipe)
function hollisX(c) {
  const { F, X, j, drawn } = c;
  const m = drawRelic(F, drawn, X.P(j.hR[0] + .3, j.hR[1] + 1.2), Math.atan2(X.ay, X.ax), .27, { center: [32, 9] });
  if (m) c.anchors.relic = m([32, 34]);
}
// Dun the Counter: a bandolier of coins
function dunX(c) {
  const at = strap(c, 'leatherDark', 1), { F, X } = c;
  under(F, { X, mat: c.H.bandolier || 'gold', prof: 'round', bw: .8, grp: 'coinrow', noShadow: true, shapes: [.2, .4, .6, .8].map(u => { const p = at(u); return X.circ(p[0], p[1], .9); }) }, ['armR']);
}
// Vesper: a bandolier of vials, and a thimble of miracle sap held up in the free hand
function vesperX(c) {
  const { F, X, j, H, lie } = c, sap = H.vials || 'amber', at = strap(c, 'leatherRed', .75), V = [], S = [];
  for (const u of [.3, .5, .7]) { const [x, y] = at(u); V.push(X.cap(x, y - .4, x, y + 2, .8)); S.push(X.circ(x, y + 1.3, .55)); }
  under(F, { X, mat: 'seaglass', prof: 'round', bw: .6, grp: 'vials', shapes: V }, ['armR']);
  under(F, { X, mat: sap, prof: 'round', bw: .5, grp: 'vialsap', noShadow: true, shapes: S }, ['armR']);
  if (lie) return;
  const h = j.hR;
  F.add({ X, mat: 'seaglass', prof: 'round', bw: .8, grp: 'vial', shapes: [X.cap(h[0] + .3, h[1] - 2, h[0] + .3, h[1] - 5.6, 1.2, 1)] });
  F.add({ X, mat: sap, prof: 'round', bw: .8, grp: 'vialfill', noShadow: true, shapes: [X.cap(h[0] + .3, h[1] - 2.2, h[0] + .3, h[1] - 4, .8)] });
  F.add({ X, mat: 'leather', prof: 'round', bw: .6, grp: 'cork', shapes: [X.circ(h[0] + .3, h[1] - 6.2, .8)] });
}
// Tamsin: two glints, the lent starter in her hand and the Vale Gauntlets on her fists
function tamsinX(c) {
  const pts = [];
  if (c.relic && c.held && c.slot === 'weapon' && c.anchors.weaponMid) pts.push(c.anchors.weaponMid);
  if (relicArt(FOE_ART.tamsin.wear) && c.anchors.handR) pts.push(c.anchors.handR);
  if (pts.length) { c.anchors.relics = pts; c.anchors.relic = pts[0]; }
}

/* ---- M3 humanoid gear (art params, like the M2 kits above) ---- */
const fenKnife = A('dagger', { shape: 'knife', gripEnd: 12, guardT: 2.8, bladeL: 37, bladeW: 5.4, blade: 'steel', guard: 'bar', guardMat: 'bronze', guardW: 5.5, grip: 'clothTeal', gripR: 2, pommel: 'bronze', pommelR: 2.8 });
const tideKnife = A('dagger', { shape: 'leaf', gripEnd: 12, guardT: 3, bladeL: 40, bladeW: 5.2, blade: 'blackiron', fuller: 'water', guard: 'quillon', guardMat: 'steel', guardW: 7, grip: 'clothTeal', gripR: 2.1, pommel: 'steel', pommelR: 3, pommelGem: 'seaglass' });
const queenKnife = A('dagger', { shape: 'straight', gripEnd: 12, guardT: 3, bladeL: 38, bladeW: 4.6, blade: 'steel', guard: 'quillon', guardMat: 'gold', guardW: 6.5, grip: 'leatherRed', gripR: 2, pommel: 'gold', pommelR: 2.9, pommelGem: 'ruby' });
const queenKnife3 = A('dagger', { shape: 'straight', gripEnd: 12, guardT: 3, bladeL: 40, bladeW: 4.8, blade: 'silver', fuller: 'frost', guard: 'quillon', guardMat: 'gold', guardW: 7, grip: 'clothTeal', gripR: 2.1, pommel: 'gold', pommelR: 3, pommelGem: 'sapphire' });
const counterCleaver = A('dagger', { shape: 'knife', gripEnd: 12, guardT: 2.8, bladeL: 36, bladeW: 7, blade: 'iron', guard: 'coin', guardMat: 'gold', guardW: 6, grip: 'clothGrey', gripR: 2.1, pommel: 'gold', pommelShape: 'coin', pommelR: 3.2 });
const staffT = (headT, haft, crystal, extra = {}) => A('staff', Object.assign({ style: 'gnarl', headT, haft, haftR: 2.05, wobble: 1.1, crystal, leaves: 'moss' }, extra));
const druidStaffs = [
  staffT(58, 'bark', 'thorn'),
  staffT(60, 'bark', 'emerald', { wrap: 'bramble', wrapA: 26, wrapB: 40 }),
  staffT(62, 'wood', 'verdant', { wrap: 'bramble', wrapA: 26, wrapB: 40, bands: [46], bandMat: 'bronze' }),
  staffT(62, 'rotwood', 'blight', { leaves: 'rot', wrap: 'rot', wrapA: 26, wrapB: 40, bands: [46], bandMat: 'blackiron' }),
];
const bowT = (len, limb, grip, extra = {}) => A('bow', Object.assign({ len, bulge: len > 58 ? 10 : 9, limbR: 3, tipR: 1.4, limb, nock: 'bone', grip, bindings: [] }, extra));
const rangerBows = [
  bowT(54, 'bogwood', 'rags'),
  bowT(56, 'bogwood', 'leather', { bindings: [.27, .73], bindMat: 'leatherDark' }),
  bowT(62, 'bogwood', 'leatherDark', { bindings: [.27, .73], bindMat: 'hoodGreen', limbTex: TX2.cracks(7, 'rot', .05) }),
  bowT(64, 'rotwood', 'clothGrey', { bindings: [.27, .73], bindMat: 'blackiron', limbTex: TX2.cracks(9, 'blight', .045), gem: 'amethyst', gemMat: 'blackiron' }),
];
const huntBows = [
  bowT(60, 'wood', 'leather', { bindings: [.27, .73], bindMat: 'leatherDark' }),
  bowT(62, 'wood', 'leather', { bindings: [.27, .73], bindMat: 'bronze' }),
  bowT(64, 'bogwood', 'leatherDark', { bindings: [.27, .73], bindMat: 'bronze', tassel: 'hoodGreen' }),
  bowT(64, 'bogwood', 'leatherDark', { bindings: [.27, .73], bindMat: 'steel', tassel: 'hoodGreen', gem: 'stormglass', gemMat: 'steel' }),
];
const armingSword = A('sword', { gripEnd: 13, guardT: 3.2, bladeW: 3.4, bladeL: 44, tipL: 8, taper: .9, blade: 'steel', guard: 'bar', guardMat: 'gold', guardW: 8, guardR: 1.7, grip: 'leatherRed', gripR: 2, pommel: 'gold', pommelR: 3 });
const longSword = A('sword', { gripEnd: 15, guardT: 3.4, bladeW: 3.6, bladeL: 50, tipL: 9, taper: .88, blade: 'steel', fuller: 'iron', fullerR: .9, guard: 'bar', guardMat: 'gold', guardW: 9, guardR: 1.8, grip: 'leatherRed', gripR: 2.1, pommel: 'gold', pommelR: 3.2, pommelGem: 'ruby' });
const waders = A('boots', { mat: 'leatherDark', trim: 'leather', fold: true });
const tallyHood = (mat, trim, clasp, gem) => A('hood', { look: 'hood', mat, tip: 1, trim, clasp, gem });
const tallyRobe = (trim, sash, o = {}) => A('robe', Object.assign({ mat: 'clothGrey', trim, sash }, o));

const H3 = (name, defaultTier, o) => Object.assign({ name, kind: 'humanoid', m3: true, w: 64, h: 64, foot: [32, 56], defaultTier }, o);
// raise the off hand (a lantern or a vial held up)
const raiseOff = (dy = 9) => (P, { pose, b }) => { if (pose !== 'ko') P.hR = [b.hR[0] + 2, b.hR[1] - dy + (pose === 'hurt' ? 2.5 : 0)]; };
Object.assign(FOE_ART, {
  smuggler: H3('Smuggler', 'rabble', {
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'crop', eye: '#1c2a24', tunic: 'wool', pants: 'wool', boots: 'leatherDark', gloves: 'leather', scarf: 'clothTeal', buckle: 'iron', headwrap: 'leatherDark', satchel: 'leather' },
    gear: [
      { weapon: rusty, feet: waders },
      { weapon: ironKnife, head: A('hood', { look: 'hood', mat: 'wool', tip: 0 }), body: A('leather', { mat: 'leather', shirt: 'wool', belt: 'leatherDark' }), feet: waders, H: { headwrap: null } },
      { weapon: fenKnife, head: A('coif', { look: 'coif', mat: 'iron', flaps: 1 }), body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', studs: 'iron', pauldrons: 'leather', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: waders, H: { headwrap: null } },
      { weapon: tideKnife, head: A('coif', { look: 'coif', mat: 'steel', flaps: 1 }), body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', studs: 'steel', pauldrons: 'steel', belt: 'leatherDark' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: A('boots', { mat: 'leatherDark', trim: 'steel', greave: 'blackiron' }), H: { headwrap: null, cloak: 'clothTeal', satchel: 'leatherDark' } },
    ],
    extra: smugglerX,
  }),
  mags: H3('Mags Kestrel', 'relic-bearer', {
    relic: 'lightfingers',
    H: { build: 'human', skin: 'skinPale', hairMat: 'hairCopper', hair: 'braid', freckles: true, eye: '#24381c', tunic: 'clothTeal', pants: 'wool', boots: 'leatherDark', gloves: 'leatherDark', cloak: 'clothTeal', buckle: 'gold', neckerchief: 'clothTeal', feather: 'hairCopper' },
    gear: [
      { weapon: queenKnife, head: A('kettle', { look: 'kettle', mat: 'leatherDark', trim: 'leatherRed' }), body: A('leather', { mat: 'leatherDark', shirt: 'wool', belt: 'leather', trim: 'gold' }), hands: A('gloves', { mat: 'leatherDark' }), feet: waders },
      { weapon: queenKnife, head: A('kettle', { look: 'kettle', mat: 'leatherDark', trim: 'leatherRed' }), body: A('leather', { mat: 'leatherDark', shirt: 'wool', pauldrons: 'leatherDark', belt: 'leather', trim: 'gold' }), hands: A('gloves', { mat: 'leatherDark' }), feet: waders },
      { weapon: queenKnife, head: A('kettle', { look: 'kettle', mat: 'leatherDark', trim: 'gold' }), body: A('leather', { mat: 'leatherDark', shirt: 'leatherRed', pauldrons: 'leatherRed', belt: 'leather', trim: 'gold' }), hands: A('gloves', { mat: 'leatherRed' }), feet: waders, H: { mantle: 'wolfPale' } },
      { weapon: queenKnife3, head: A('kettle', { look: 'kettle', mat: 'dark', trim: 'gold', gem: 'sapphire' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothBlue', studs: 'gold', pauldrons: 'gold', belt: 'leatherDark', trim: 'gold' }), hands: A('gloves', { mat: 'leatherRed', trim: 'gold' }), feet: A('boots', { mat: 'leatherDark', trim: 'gold', greave: 'steel' }), H: { mantle: 'wolfPale' } },
    ],
    extra: magsX,
  }),
  'feral-druid': H3('Feral Druid', 'veteran', {
    glow: gT => (gT >= 3 ? 'blight' : 'verdant'),
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairMoss', hair: 'long', ears: 'long', marks: 'bark', eye: '#5a3a10', tunic: 'robeBark', pants: 'robeBark', boots: 'skinTan', gloves: 'skinTan', antlers: 1 },
    gear: [
      { weapon: druidStaffs[0], head: A('hood', { look: 'hood', mat: 'robeBark', tip: 0, trim: 'bark' }), body: A('robe', { mat: 'robeBark', trim: 'moss', sash: 'leather' }) },
      { weapon: druidStaffs[1], head: A('hood', { look: 'hood', mat: 'hoodGreen', tip: 0, trim: 'bark', vine: 'bramble' }), body: A('robe', { mat: 'robeBark', trim: 'moss', sash: 'bramble', vine: 'bramble' }), H: { mantle: 'moss', antlers: 2 } },
      { weapon: druidStaffs[2], head: A('crown', { style: 'thorn', mat: 'bramble', buds: 'verdant' }), body: A('robe', { mat: 'cloakGreen', trim: 'bark', sash: 'bramble', vine: 'bramble', glyph: 'verdant' }), H: { mantle: 'moss', antlers: 3 } },
      { weapon: druidStaffs[3], head: A('crown', { style: 'thorn', mat: 'rotwood', buds: 'blight' }), body: A('robe', { mat: 'rotwood', trim: 'rot', sash: 'blackiron', vine: 'rot', glyph: 'blight' }), H: { mantle: 'rotwood', antlers: 4, marks: 'blight', eye: '#b4d65a', hairMat: 'hairBlack' } },
    ],
    extra: druidX,
  }),
  oda: H3('Oda the Thornmother', 'relic-bearer', {
    relic: 'rootsong', glow: gT => (gT >= 3 ? 'blight' : 'water'),
    H: { build: 'human', skin: 'skinAsh', hairMat: 'hairSilver', hair: 'long', ears: 'long', marks: 'moss', eye: '#2a4a3a', tunic: 'robeBark', pants: 'robeBark', boots: 'skinAsh', gloves: 'skinAsh', cloak: 'cloakGreen', mantle: 'moss', antlers: 5 },
    gear: [
      { weapon: druidStaffs[2], head: A('crown', { style: 'thorn', mat: 'bramble', buds: 'ruby' }), body: A('robe', { mat: 'robeBark', trim: 'moss', sash: 'hoodGreen', vine: 'bramble' }) },
      { weapon: druidStaffs[2], head: A('crown', { style: 'thorn', mat: 'bramble', buds: 'verdant' }), body: A('robe', { mat: 'robeBark', trim: 'moss', sash: 'hoodGreen', vine: 'bramble', glyph: 'verdant' }) },
      { weapon: druidStaffs[2], head: A('crown', { style: 'thorn', mat: 'bramble', buds: 'verdant' }), body: A('robe', { mat: 'cloakGreen', trim: 'moss', sash: 'bramble', vine: 'bramble', glyph: 'verdant' }), H: { mantle: 'bramble' } },
      { weapon: druidStaffs[3], head: A('crown', { style: 'thorn', mat: 'rotwood', buds: 'blight' }), body: A('robe', { mat: 'rotwood', trim: 'rot', sash: 'blackiron', vine: 'rot', glyph: 'blight' }), H: { mantle: 'rotwood', marks: 'blight', cloak: 'rot' } },
    ],
    extra: odaX,
  }),
  'hollowed-ranger': H3('Hollowed Ranger', 'veteran', {
    H: { build: 'human', skin: 'skinAsh', hairMat: 'hairBrown', hair: 'crop', eye: '#101010', tunic: 'rags', pants: 'wool', boots: 'leatherDark', gloves: 'skinAsh', quiver: 'leatherDark', fletch: 'dark', shade: true, shadeEyes: 'blight', cloak: 'cloakGreen' },
    gear: [
      { weapon: rangerBows[0], head: A('hood', { look: 'hood', mat: 'cloakGreen', tip: 1 }) },
      { weapon: rangerBows[1], head: A('hood', { look: 'hood', mat: 'cloakGreen', tip: 1, trim: 'leather' }), body: A('leather', { mat: 'leather', shirt: 'cloakGreen', belt: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'cloakGreen', fold: true }) },
      { weapon: rangerBows[2], head: A('hood', { look: 'hood', mat: 'cloakGreen', tip: 1, trim: 'leather' }), body: A('leather', { mat: 'leatherDark', shirt: 'cloakGreen', studs: 'iron', pauldrons: 'moss', belt: 'leather' }), feet: A('boots', { mat: 'leatherDark', trim: 'cloakGreen', fold: true }), H: { mantle: 'moss' } },
      { weapon: rangerBows[3], head: A('coif', { look: 'coif', mat: 'iron', flaps: 1 }), body: A('leather', { mat: 'leatherDark', shirt: 'rot', studs: 'blackiron', pauldrons: 'moss', belt: 'leather', glyph: 'blight' }), feet: A('boots', { mat: 'leatherDark', trim: 'moss', greave: 'iron' }), H: { mantle: 'moss' } },
    ],
    extra: rangerX,
  }),
  corra: H3('Sgt Corra Thistle', 'relic-bearer', {
    relic: 'oathshield',
    H: { build: 'human', skin: 'skinAsh', hairMat: 'hairAuburn', hair: 'braid', eye: '#101010', tunic: 'rags', pants: 'wool', boots: 'leatherDark', gloves: 'skinAsh', quiver: 'leatherDark', fletch: 'cloakGreen', shade: true, shadeEyes: 'blight', cloak: 'cloakGreen' },
    gear: [
      { weapon: rangerBows[1], head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'bronze' }), body: A('leather', { mat: 'leather', shirt: 'cloakGreen', pauldrons: 'iron', belt: 'leatherDark', trim: 'bronze' }), feet: A('boots', { mat: 'leatherDark', trim: 'cloakGreen', fold: true }) },
      { weapon: rangerBows[1], head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'bronze' }), body: A('leather', { mat: 'leatherDark', shirt: 'cloakGreen', pauldrons: 'iron', belt: 'leatherDark', trim: 'bronze' }), feet: A('boots', { mat: 'leatherDark', trim: 'cloakGreen', fold: true }) },
      { weapon: rangerBows[2], head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'bronze' }), body: A('leather', { mat: 'leatherDark', shirt: 'cloakGreen', studs: 'iron', pauldrons: 'iron', belt: 'leather', trim: 'bronze' }), feet: A('boots', { mat: 'leatherDark', trim: 'cloakGreen', fold: true }), H: { mantle: 'moss' } },
      { weapon: rangerBows[3], head: A('kettle', { look: 'kettle', mat: 'blackiron', trim: 'bronze' }), body: A('leather', { mat: 'leatherDark', shirt: 'rot', studs: 'bronze', pauldrons: 'blackiron', belt: 'leather', trim: 'bronze', glyph: 'blight' }), feet: A('boots', { mat: 'leatherDark', trim: 'moss', greave: 'iron' }), H: { mantle: 'moss' } },
    ],
    extra: corraX,
  }),
  haskett: H3('Haskett', 'relic-bearer', {
    relic: 'hartshorn',
    H: { build: 'brute', skin: 'skinTan', hairMat: 'hairBrown', hair: 'short', beard: true, eye: '#2a2030', tunic: 'gambeson', pants: 'leather', boots: 'leatherDark', gloves: 'leather', quiver: 'leather', fletch: 'hoodGreen', buckle: 'bronze', pelt: 'grizzle' },
    gear: [
      { weapon: huntBows[0], head: A('hood', { look: 'hood', mat: 'grizzle', tip: 0 }), body: A('leather', { mat: 'leather', shirt: 'gambeson', belt: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', fold: true }) },
      { weapon: huntBows[1], head: A('hood', { look: 'hood', mat: 'grizzle', tip: 0 }), body: A('leather', { mat: 'leather', shirt: 'gambeson', pauldrons: 'grizzle', belt: 'leatherDark' }), hands: A('gloves', { mat: 'leather' }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', fold: true }) },
      { weapon: huntBows[2], head: A('hood', { look: 'hood', mat: 'grizzle', tip: 0 }), body: A('leather', { mat: 'leatherDark', shirt: 'gambeson', studs: 'bronze', pauldrons: 'grizzle', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', fold: true }), H: { mantle: 'wolfFur' } },
      { weapon: huntBows[3], head: A('hood', { look: 'hood', mat: 'grizzle', tip: 0 }), body: A('mail', { mat: 'iron', trim: 'leather', belt: 'leatherDark', pauldrons: 'grizzle' }), hands: A('gauntlets', { mat: 'iron', plate: 1 }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', greave: 'iron' }), H: { mantle: 'wolfFur', cloak: 'wolfFur' } },
    ],
    extra: haskettX,
  }),
  hollis: H3('Hollis Fairweight', 'relic-bearer', {
    relic: 'mosswatch-lantern', drawSlot: 'offhand', pose: raiseOff(9),
    H: { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'skinAsh', shade: true, shadeEyes: 'ember', ledger: 'leatherDark', coins: true, buckle: 'blackiron', lantern: true },
    gear: [
      { weapon: ironKnife, head: tallyHood('clothGrey', 'iron', 'bronze'), body: tallyRobe('bronze', 'leatherRed'), hands: A('gloves', { mat: 'leatherDark' }) },
      { weapon: ironKnife, head: tallyHood('clothGrey', 'iron', 'bronze'), body: tallyRobe('bronze', 'leatherRed'), hands: A('gloves', { mat: 'leatherDark' }), H: { mantle: 'iron' } },
      { weapon: blightKnife, head: tallyHood('clothGrey', 'blackiron', 'bronze'), body: tallyRobe('blackiron', 'leatherRed', { sleeve: 'iron' }), hands: A('gloves', { mat: 'leatherDark' }), H: { mantle: 'blackiron' } },
      { weapon: blightKnife, head: tallyHood('dark', 'blackiron', 'gold', 'ember'), body: tallyRobe('ember', 'blackiron', { sleeve: 'blackiron', glyph: 'ember' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), H: { mantle: 'blackiron', cloak: 'clothGrey' } },
    ],
    extra: hollisX,
  }),
  dun: H3('Dun the Counter', 'relic-bearer', {
    relic: 'isoldes-oath',
    H: { build: 'brute', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'leatherDark', mask: 'iron', maskEyes: 'amber', ledger: 'leatherDark', coins: true, buckle: 'gold', mantle: 'iron', bandolier: 'gold' },
    gear: [
      { weapon: counterCleaver, head: tallyHood('clothGrey', 'iron', 'gold'), body: tallyRobe('iron', 'leatherDark', { sleeve: 'iron' }), hands: A('gloves', { mat: 'leatherDark' }) },
      { weapon: counterCleaver, head: tallyHood('clothGrey', 'iron', 'gold'), body: tallyRobe('iron', 'leatherDark', { sleeve: 'iron' }), hands: A('gauntlets', { mat: 'iron', plate: 1 }) },
      { weapon: counterCleaver, head: tallyHood('clothGrey', 'blackiron', 'gold'), body: tallyRobe('blackiron', 'leatherDark', { sleeve: 'blackiron' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), H: { mantle: 'blackiron' } },
      { weapon: counterCleaver, head: tallyHood('dark', 'blight', 'gold', 'blight'), body: tallyRobe('blight', 'blackiron', { sleeve: 'blackiron', glyph: 'blight' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), H: { mantle: 'blackiron', mask: 'bone', maskEyes: 'blight', cloak: 'clothGrey' } },
    ],
    extra: dunX,
  }),
  vesper: H3('Vesper', 'veteran', {
    pose: raiseOff(7),
    H: { build: 'human', skin: 'skinPale', hairMat: 'hairBlack', hair: 'crop', eye: '#3a1a10', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'skinPale', ledger: 'leatherRed', coins: true, buckle: 'gold', mantle: 'clothGrey', vials: 'amber' },
    gear: [
      { weapon: ironKnife, head: A('kettle', { look: 'kettle', mat: 'leatherRed', trim: 'gold' }), body: tallyRobe('gold', 'leatherRed') },
      { weapon: ironKnife, head: A('kettle', { look: 'kettle', mat: 'leatherRed', trim: 'gold' }), body: tallyRobe('gold', 'leatherRed'), hands: A('gloves', { mat: 'leatherRed' }) },
      { weapon: blightKnife, head: A('kettle', { look: 'kettle', mat: 'leatherRed', trim: 'gold', gem: 'amber' }), body: tallyRobe('gold', 'leatherRed', { sleeve: 'leatherRed' }), hands: A('gloves', { mat: 'leatherRed' }), H: { mantle: 'leatherRed' } },
      { weapon: blightKnife, head: A('kettle', { look: 'kettle', mat: 'dark', trim: 'blight', gem: 'blight' }), body: tallyRobe('blight', 'leatherRed', { sleeve: 'leatherRed', glyph: 'blight' }), hands: A('gloves', { mat: 'leatherRed' }), H: { mantle: 'leatherRed', vials: 'blight' } },
    ],
    extra: vesperX,
  }),
  // The rival: the Keep's other Warden. She carries your counter-starter (relic, lent) and always
  // wears the Vale Gauntlets. `variant` (the rival starter id) also picks the lent starter.
  tamsin: H3('Tamsin', 'relic-bearer', {
    wear: 'vale-gauntlets', variantRelic: true,
    // en garde at idle: the weapon (her lent starter) raised toward the party, where it can be seen
    pose: (P, { pose, b, L }) => { if ((pose === 'idle' || !pose) && L.weapon) { P.hL = [b.hL[0] - 1.2, b.hL[1] - 5.2]; P.wAxis = L.weapon.cls === 'spear' ? [-.42, -1] : L.weapon.cls === 'blunt' ? [-.3, -1] : [-.62, -1]; } },
    H: { build: 'human', skin: 'skin', hairMat: 'hairBlond', hair: 'pony', eye: '#1c2a48', cloak: 'cloakRed', tabard: 'cloakRed', emblem: 'gold', tunic: 'gambeson', pants: 'pants', boots: 'leather', gloves: 'leather', buckle: 'gold' },
    gear: [
      { weapon: armingSword, body: A('leather', { mat: 'leather', shirt: 'gambeson', belt: 'leatherDark' }), feet: A('boots', { mat: 'leather', trim: 'leatherDark', fold: true }) },
      { weapon: armingSword, body: A('leather', { mat: 'leatherDark', shirt: 'gambeson', studs: 'bronze', pauldrons: 'leather', belt: 'leather' }), feet: A('boots', { mat: 'leatherDark', trim: 'leather', fold: true }) },
      { weapon: longSword, body: A('mail', { mat: 'steel', trim: 'gold', belt: 'leather', pauldrons: 'steel' }), feet: A('boots', { mat: 'leatherDark', trim: 'gold', greave: 'steel' }), H: { mantle: 'cloakRed' } },
      { weapon: longSword, head: A('circlet', { look: 'circlet', mat: 'gold', gem: 'ruby' }), body: A('mail', { mat: 'steel', trim: 'gold', belt: 'leatherDark', pauldrons: 'steel' }), feet: A('boots', { mat: 'leatherDark', trim: 'gold', greave: 'steel' }), H: { mantle: 'cloakRed' } },
    ],
    extra: tamsinX,
  }),
});

/* =====================================================================
   M3 BEASTS
   ===================================================================== */
const rot2 = (d, a) => [d[0] * Math.cos(a) - d[1] * Math.sin(a), d[0] * Math.sin(a) + d[1] * Math.cos(a)];

/* ---- BOGLURCHER: a heap of bog with eyes in it (48x48, ground 45) ---- */
function boglurcher(F, st) {
  const { pose, f, gT } = st, A = st.anchors, T3 = gT >= 3;
  const mud = T3 ? 'rot' : 'bogwood', mud2 = T3 ? 'rotwood' : 'boarHide', reedM = T3 ? 'rotwood' : 'seaweed';
  const eyeM = T3 ? 'blight' : gT >= 2 ? 'eyeRed' : 'amber';
  let B = [23, 35.5 + f * .5], sq = 1 - f * .05, eye = 'open', lie = false, mouth = .3, grab = false;
  // mud arms: shoulder, elbow, wrist
  let armN = [[33, 35], [37.5, 38.5], [39.5, 42.4]], armF = [[13, 35], [9, 38.5], [7.2, 42.4]];
  if (pose === 'attack') { B = [26, 33]; sq = 1.12; mouth = 1; grab = true; armN = [[35.5, 34], [40.5, 37], [44.4, 40.6]]; armF = [[15.5, 33], [11, 30.5], [8.6, 27]]; }
  else if (pose === 'hurt') { B = [20.5, 38]; sq = .78; eye = 'shut'; mouth = .6; armN = [[30.5, 37.5], [35, 40.2], [38, 43.2]]; armF = [[10, 38], [6, 40.8], [3.8, 43.2]]; }
  else if (pose === 'ko') { lie = true; B = [24, 41.8]; sq = .42; eye = 'shut'; mouth = 0; armN = [[36.5, 42.6], [41, 43.6], [44.2, 44]]; armF = [[11.5, 42.6], [7, 43.6], [3.8, 44]]; }
  const Y = (dx, dy) => [B[0] + dx, B[1] + dy * sq];
  // wet peat: broad patches of darker mud and moss, a few bright wet specks
  const mtex = ({ x, y }) => {
    const n = vnoise(x * .2, y * .2, 41), m2 = vnoise(x * .45, y * .45, 43);
    if (n > .74 - gT * .02) return { m: T3 ? 'rotwood' : 'moss', dd: m2 > .6 ? 1 : 0 };
    if (n < .3) return { m: mud2, dd: m2 > .7 ? 1 : 0 };
    if (m2 > .9) return 2;
    return (x * 3 + y * 5) % 13 === 0 ? -1 : 0;
  };
  // arms of dripping mud (no moss on them, so they never read as heads)
  const atex = ({ x, y }) => { const n = vnoise(x * .3, y * .3, 47); return n < .35 ? { m: mud2, dd: 0 } : (x + y * 2) % 7 === 0 ? -1 : 0; };
  const limb = (pts, g, far) => {
    const tex = far ? farTex(atex) : atex, h = pts[2], s = far ? -1 : 1;
    F.add({ mat: mud, prof: 'round', bw: 2, grp: g, shapes: [circ(pts[0], 3.2), circ(pts[1], 2.6), circ(h, 2.3)].concat(chainC(pts, [2.8, 2.3, 1.9])), tex });
    const fing = grab ? [[3.4, -1.4], [3.8, .8], [2.4, 2.8]] : [[1.4, 2.8], [-.6, 3], [2.8, 1.6]];
    F.add({ mat: mud, prof: 'round', bw: 1.2, grp: g + 'h', shapes: fing.map(([dx, dy]) => cap(h, [h[0] + dx * s, h[1] + dy], 1.2, .6)), tex });
  };
  // reeds and cattails growing out of the top of the heap
  const reeds = lie ? [[[14, 40.5], [3.5, 38], 0, 1], [[31, 40.5], [42, 37.5], 0, 1], [[22, 39.5], [18, 34.5], 0, 0]]
    : [[Y(-7, -8), Y(-9.5, -22), -1, 1], [Y(-1.5, -10.5), Y(-.5, -25), 1, 1], [Y(4, -10), Y(8.5, -19), 1.5, 0]]
      .concat(gT >= 1 ? [[Y(9, -6), Y(13.5, -14.5), 1, 1]] : []).concat(gT >= 2 ? [[Y(-11, -4), Y(-15.5, -13), -1, 0]] : []);
  reeds.forEach(([a, b, bend, head], k) => {
    const m = [(a[0] + b[0]) / 2 + bend, (a[1] + b[1]) / 2], d = [b[0] - m[0], b[1] - m[1]], l = Math.hypot(d[0], d[1]) || 1, u = [d[0] / l, d[1] / l];
    F.add({ mat: reedM, prof: 'round', bw: .6, grp: 'reed' + k, shapes: chainC([a, m, b], [.85, .7, .45]) });
    if (head) F.add({ mat: T3 ? 'rot' : 'leather', prof: 'round', bw: 1, grp: 'cattail' + k, shapes: [cap([b[0] - u[0] * 6, b[1] - u[1] * 6], [b[0] - u[0] * 1.6, b[1] - u[1] * 1.6], 1.3, 1.15)] });
  });
  limb(armF, 'armF', true);
  // the heap: a mound of peat and lumps, spreading into a skirt of mud on the ground
  F.add({ mat: mud2, prof: 'round', bw: 2, grp: 'skirt', shapes: [ell([B[0] + 1, 44.2], lie ? 22 : 19.5, 2.1)], tex: mtex });
  const lumps = lie ? [ell(B, 19, 4.4), ell([B[0] - 6, B[1] - 2.5], 8, 3), ell([B[0] + 7, B[1] - 2], 8, 3)]
    : [ell(Y(0, 2.5), 16, 9 * sq), ell(Y(-6.5, -3.5), 8.5, 7.5 * sq), ell(Y(3, -6.5), 9, 7.5 * sq), ell(Y(9.5, -1), 7.5, 7 * sq)];
  F.add({ mat: mud, prof: 'round', bw: 6, hs: .75, grp: 'body', shapes: lumps, tex: mtex });
  if (!lie) F.add({ mat: T3 ? 'rotwood' : 'seaweed', prof: 'round', bw: .8, grp: 'weed', shapes: [cap(Y(-9, -5), Y(-10.5, 3), .8, .5), cap(Y(1, -11), Y(2.5, -3), .9, .5), cap(Y(-3.5, -9), Y(-4.2, -1.5), .7, .45)] });
  if (gT >= 1 && !lie) F.add({ mat: 'bone', prof: 'round', bw: .8, grp: 'bone', shapes: [cap(Y(-11, -2), Y(-16.5, -6.5), .9, .7), circ(Y(-16.8, -6.8), 1.2), circ(Y(-16, -7.8), 1)] });
  if (gT >= 2 && !lie) {
    F.add({ mat: 'moss', prof: 'round', bw: 1, grp: 'pad', shapes: [ell(Y(-5, -10.8), 4, 1.3)] });
    F.add({ mat: T3 ? 'blight' : 'water', prof: 'round', bw: 1, grp: 'bubbles', noShadow: true, shapes: [circ(Y(-8, 1), T3 ? 1.3 : .9), circ(Y(-2, 5), T3 ? 1.2 : .8)].concat(T3 ? [circ(Y(3.5, -4), 1), circ(Y(-12, 4.5), .9)] : []) });
  }
  // a hollow in the front of the heap with the eyes in it, and a slack mouth of mud under it
  const X0 = Xf(0, 0, 1, 0, 1), fc = lie ? [B[0] + 10.5, B[1] - .6] : Y(9.2, -4);
  F.add({ mat: 'dark', prof: 'round', bw: 2, grp: 'hollow', shapes: [lie ? ell(fc, 5.4, 2.2) : ell(fc, 6, 4.2 * Math.min(1.15, sq))] });
  const e1 = [fc[0] - 2.4, fc[1] - .4], e2 = [fc[0] + 2.5, fc[1] - .6], e3 = [fc[0] + .1, fc[1] + 2.2];
  eyeOf(F, X0, e1[0], e1[1], 1.75, 1.3, eyeM, eye === 'shut', 'eye1'); eyeOf(F, X0, e2[0], e2[1], 1.5, 1.2, eyeM, eye === 'shut', 'eye2');
  if (gT >= 1 && !lie) eyeOf(F, X0, e3[0], e3[1], .75, .6, eyeM, eye === 'shut', 'eye3');
  const mo = lie ? [fc[0] + .4, fc[1] + 2.6] : Y(10.4, 5);
  F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [ell(mo, 3.6, .45 + mouth * 1.9)] });
  if (mouth > .5) F.add({ mat: mud2, prof: 'round', bw: .6, grp: 'drool', noShadow: true, shapes: [cap([mo[0] - 1.5, mo[1] + 1], [mo[0] - 1.5, mo[1] + 3.6], .6, .5), cap([mo[0] + 1.3, mo[1] + 1.2], [mo[0] + 1.5, mo[1] + 3], .5, .4)] });
  limb(armN, 'armN');
  if (!lie) F.add({ mat: mud2, prof: 'round', bw: .6, grp: 'drip', noShadow: true, shapes: [cap(armN[1], [armN[1][0] + .5, armN[1][1] + 4 + f], .6, .85), cap(Y(-4, 7), Y(-4, 9 + f * .6), .6, .8)] });
  A.head = e1; A.mouth = mo; A.center = lie ? B : Y(0, -1);
}

/* ---- GLOWCAP: a walking mushroom with glowing gills (48x48, ground 45) ---- */
function glowcap(F, st) {
  const { pose, f, gT } = st, A = st.anchors, T2 = gT >= 2, T3 = gT >= 3;
  const capM = T3 ? 'rot' : 'snout', gillM = T3 ? 'blight' : 'verdant', spotM = T3 ? 'blight' : gT >= 1 ? 'pearl' : 'bone', stalkM = 'bone';
  const glowEye = T3 ? 'blight' : T2 ? 'eyeRed' : null;
  let base = [24, 41.4], top = [24.6, 31.2 + f * .5], capC = [24.8, 25.2 + f], ca = -.04, crx = 16, cry = 9.4, eye = 'open', lie = false, mouthO = 0;
  let legN = [[27.6, 41.6], [29.8, 44.6]], legF = [[20.6, 41.6], [18.4, 44.6]], armN = [[28.8, 35.6], [32, 38.4]], armF = [[20.2, 35.6], [17, 38.2]];
  if (pose === 'attack') { base = [25.5, 41.4]; top = [29, 30.6]; capC = [31.8, 24.6]; ca = .42; mouthO = 1; legN = [[28.8, 41.6], [33, 44.6]]; legF = [[22.4, 41.6], [17.6, 44.6]]; armN = [[32, 34.4], [35.8, 32.6]]; armF = [[25, 34.6], [21.4, 36.6]]; }
  else if (pose === 'hurt') { base = [23, 41.4]; top = [21.4, 32.2]; capC = [19.2, 27]; ca = -.42; cry = 8.4; eye = 'shut'; armN = [[26, 35.4], [29, 31.8]]; armF = [[17.4, 35.6], [14.4, 32]]; }
  else if (pose === 'ko') { lie = true; base = [11.5, 40.6]; top = [22.5, 41]; capC = [30.5, 37.6]; ca = Math.PI / 2 - .1; eye = 'shut'; legN = [[11, 42.8], [7, 44.4]]; legF = [[12, 38.6], [8, 37.4]]; armN = [[18, 44], [20.6, 44.6]]; armF = [[18, 37], [20.6, 35.4]]; }
  const hf = frame(capC[0], capC[1], ca), sa = Math.atan2(top[1] - base[1], top[0] - base[0]), sf = frame(top[0], top[1], sa), es = lie ? -1 : 1;
  const fiber = ({ x, y }) => ((x + y * 3) % 7 === 0 ? -1 : 0);
  F.add({ mat: stalkM, prof: 'round', bw: 1.4, grp: 'legF', shapes: [cap(legF[0], legF[1], 2.2, 1.5)], tex: DARK });
  F.add({ mat: stalkM, prof: 'round', bw: .8, grp: 'armF', shapes: [cap(armF[0], armF[1], 1.2, .9)], tex: DARK });
  if (gT >= 1 && !lie) { // a young cap sprouting at its foot
    const b0 = [base[0] - 8.4, 44.6], bf = frame(b0[0] - .4, b0[1] - 5, -.1);
    F.add({ mat: stalkM, prof: 'round', bw: 1, grp: 'babystalk', shapes: [cap(b0, [b0[0] - .4, b0[1] - 4.6], 1.3, 1)] });
    const d = []; for (let k = 0; k <= 10; k++) { const a = Math.PI + Math.PI * k / 10; d.push([Math.cos(a) * 4.2, Math.sin(a) * 2.8]); }
    d.push([3.8, .8], [0, 1.4], [-3.8, .8]);
    F.add({ mat: capM, prof: 'round', bw: 1.4, grp: 'babycap', shapes: [bf.poly(d)] });
    F.add({ mat: spotM, prof: 'round', bw: .6, grp: 'babyspot', noShadow: true, shapes: [bf.circ(-1.2, -1.4, .7)] });
  }
  // a stout stalk for a body, with a frill under the gills
  F.add({ mat: stalkM, prof: 'round', bw: 4.5, grp: 'stalk', shapes: [lie ? ell(base, 4.8, 4.4) : ell(base, 6, 4.4), cap(base, top, lie ? 4.6 : 5.8, 5.2)], tex: fiber });
  F.add({ mat: stalkM, prof: 'round', bw: 1, grp: 'ring', shapes: [rell(sf, -1.4, 0, 1.3, 6.2, 14)] });
  // glowing gills under the cap, then the cap and its spots
  F.add({ X: hf, mat: gillM, prof: 'round', bw: 1.2, grp: 'gills', shapes: [hf.poly([[-crx + 1.2, .6], [crx - 1.2, .6], [crx * .62, 3.4], [0, 4.4], [-crx * .62, 3.4]])], tex: ({ u }) => (Math.abs(((u + 40) % 2.2) - 1.1) < .45 ? -1 : 0) });
  const dome = []; for (let k = 0; k <= 18; k++) { const a = Math.PI + Math.PI * k / 18; dome.push([Math.cos(a) * crx, Math.sin(a) * cry]); }
  dome.push([crx - .4, 1.5], [crx * .5, 2.4], [0, 2.7], [-crx * .5, 2.4], [-crx + .4, 1.5]);
  F.add({ mat: capM, prof: 'round', bw: 4.5, hs: .8, grp: 'cap', shapes: [hf.poly(dome)], tex: ({ x, y }) => (vnoise(x * .4, y * .4, 51) > .76 ? -1 : 0) });
  const spots = [[-9.5, -3.6, 1.8], [-3.8, -6.8, 1.5], [3, -7.4, 1.3], [8.8, -4.4, 1.9], [12.4, -1.3, 1.1], [-12.8, -.9, 1.1]].concat(gT >= 1 ? [[-6.2, -1.6, 1], [5.6, -1.8, 1.1], [.2, -4, .9]] : []);
  F.add({ mat: spotM, prof: 'round', bw: 1, grp: 'spots', noShadow: true, shapes: spots.map(([t, s, r]) => hf.circ(t, s * cry / 9.4, r)) });
  // a small face on the stalk: two round black eyes (red, then blight, as it wakes) and a little mouth
  const e1 = sf.P(-3.8, 1.2 * es), e2 = sf.P(-3.8, 4.1 * es), mo = sf.P(-6.8, 2.8 * es), X0 = Xf(0, 0, 1, 0, 1);
  if (eye === 'shut' || glowEye) { eyeOf(F, X0, e1[0], e1[1], 1, 1.1, glowEye || 'dark', eye === 'shut', 'eye1'); eyeOf(F, X0, e2[0], e2[1], .95, 1.05, glowEye || 'dark', eye === 'shut', 'eye2'); }
  else {
    F.add({ mat: 'dark', prof: 'round', bw: 1, grp: 'eyes', noShadow: true, shapes: [rell(X0, e1[0], e1[1], .95, 1.35, 10), rell(X0, e2[0], e2[1], .9, 1.3, 10)] });
    F.add({ mat: 'clothWhite', prof: 'flat', grp: 'eyeglint', noShadow: true, noOutline: true, shapes: [circ([e1[0] - .3, e1[1] - .6], .5), circ([e2[0] - .3, e2[1] - .6], .5)] });
  }
  F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, noOutline: true, shapes: [mouthO ? circ(mo, 1.1) : ell(mo, .9, .5)] });
  F.add({ mat: stalkM, prof: 'round', bw: 1.4, grp: 'legN', shapes: [cap(legN[0], legN[1], 2.3, 1.6)], tex: fiber });
  F.add({ mat: 'bark', prof: 'round', bw: .6, grp: 'toes', shapes: lie ? [] : [cap([legN[1][0] + .8, legN[1][1] + .1], [legN[1][0] + 3, legN[1][1] + .3], .6, .3), cap([legF[1][0] - .8, legF[1][1] + .1], [legF[1][0] - 3, legF[1][1] + .3], .6, .3)] });
  F.add({ mat: stalkM, prof: 'round', bw: .8, grp: 'armN', shapes: [cap(armN[0], armN[1], 1.3, 1), cap(armN[1], [armN[1][0] + 1.4, armN[1][1] + .8], .7, .4), cap(armN[1], [armN[1][0] + .6, armN[1][1] + 1.6], .7, .4)] });
  const spores = pose === 'hurt' ? [[-14, -6], [-9, -13], [2, -14], [12, -10], [16, -3]] : T2 && !lie ? [[-13, -8 - f], [11, -11 + f], [-3, -15 - f * .5]] : [];
  if (spores.length) F.add({ mat: gillM, prof: 'round', bw: .8, grp: 'spores', noShadow: true, noOutline: true, shapes: spores.map(([dx, dy]) => circ([capC[0] + dx, capC[1] + dy], .8)) });
  A.head = e1; A.mouth = mo; A.center = lie ? [22, 39] : [24.5, 31];
}

/* ---- ROTGRUB: a pale grub fat on black sap (48x32, ground 30) ---- */
function rotgrub(F, st) {
  const { pose, f, gT } = st, A = st.anchors, T3 = gT >= 3, eyeM = T3 ? 'blight' : gT >= 2 ? 'eyeRed' : 'dark';
  let segs = [[7.6, 25.8], [12.6, 24.3], [18.2, 23.3], [24, 22.9], [29.8, 23.1], [35.2, 23.8]], rs = [3.2, 4.5, 5.3, 5.7, 5.5, 4.9];
  let head = [40.4, 24.8], ha = .08, jaw = .25, eye = 'open', up = false;
  if (!pose || pose === 'idle') segs = segs.map(([x, y], i) => [x, y + Math.sin(i * 1.4 + f * Math.PI) * .45]);
  if (pose === 'attack') { segs = [[6.8, 26.8], [11.8, 25.8], [17, 24.1], [21.6, 21], [25.4, 16.8], [28.6, 12.4]]; head = [32, 8.6]; ha = -.95; jaw = 1; }
  else if (pose === 'hurt') { segs = [[10.2, 25.2], [14.6, 23], [19.6, 21.6], [24.8, 21.6], [29, 23.4], [31.8, 26]]; head = [33.6, 27.8]; ha = 1.35; eye = 'shut'; jaw = .6; }
  else if (pose === 'ko') { segs = [[7.6, 27.2], [12.6, 26.8], [18.2, 26.6], [24, 26.6], [29.8, 26.8], [35.2, 27.2]]; rs = [2.9, 4, 4.6, 4.8, 4.6, 4.2]; head = [40.2, 27.8]; ha = .12; eye = 'shut'; jaw = .5; up = true; }
  const legs = (grp, far) => {
    const S = [3, 4, 5].map(i => { const c = segs[i], r = rs[i]; const a = up ? [c[0] + (far ? -1.2 : 0), c[1] - r * .7] : [c[0] + (far ? -1.2 : .4), c[1] + r * .72]; const b = up ? [a[0] + .8, a[1] - 3] : [a[0] + 1, a[1] + 2.6]; return cap(a, b, .9, .55); });
    F.add({ mat: 'claw', prof: 'round', bw: .6, grp, shapes: S, tex: far ? DARK : null });
  };
  if (!up) legs('legsF', true);
  F.add({ mat: 'bone', prof: 'round', bw: 1.5, grp: 'tail', shapes: [poly([[segs[0][0] + 1, segs[0][1] - 2.2], [segs[0][0] - 4.6, segs[0][1] + 1.4], [segs[0][0] + 1, segs[0][1] + 2.6]])] });
  // one part per segment: each covers the last, so the creases draw themselves; black sap shows through the skin
  segs.forEach((c, i) => F.add({ mat: 'bone', prof: 'round', bw: rs[i] * .8, hs: .8, grp: 'seg' + i, shapes: [ell(c, rs[i] * .92, rs[i] * (up ? .85 : 1))], tex: ({ x, y }) => { const n = vnoise(x * .45, y * .45, 60 + i); if (n > .86 - gT * .045) return { m: T3 && n > .92 ? 'rot' : 'sap', dd: 1 }; return (x + y * 2) % 9 === 0 ? -1 : 0; } }));
  if (T3) F.add({ mat: 'blight', prof: 'round', bw: .6, grp: 'vein', noShadow: true, shapes: chainC(segs.map((c, i) => [c[0], c[1] - rs[i] * .7]), .55) });
  if (!up) legs('legsN');
  const hf = frame(head[0], head[1], ha);
  // two pincers: open wide when it latches, never meeting at the tips
  const mand = (sg, g) => F.add({ mat: 'claw', prof: 'round', bw: .9, grp: g, shapes: chainC([hf.P(2.6, sg * 1.4), hf.P(5.4, sg * (2.3 + jaw * 1.6)), hf.P(7.6, sg * (1.9 + jaw * 1.9)), hf.P(8.6, sg * (.9 + jaw * 1.5))], [1.15, 1, .7, .35]), tex: sg < 0 ? DARK : null });
  mand(-1, 'mandF');
  F.add({ mat: 'thorn', prof: 'round', bw: 2.2, grp: 'head', shapes: [rell(hf, 0, 0, 4.4, 3.9)], tex: ({ x, y }) => ((x + y) % 5 === 0 ? -1 : 0) });
  F.add({ mat: 'dark', prof: 'flat', grp: 'maw', noShadow: true, shapes: [rell(hf, 3.4, .4, 1.3, 1 + jaw * .8, 10)] });
  eyeOf(F, hf, .8, -1.9, .75, .65, eyeM, eye === 'shut');
  mand(1, 'mandN');
  if (gT >= 2 && !up) { const d = hf.P(6.4, 1.6); F.add({ mat: 'sap', prof: 'round', bw: .6, grp: 'drip', noShadow: true, shapes: [cap(d, [d[0], d[1] + 3 + f], .5, .7)] }); }
  if (up) legs('legsUp');
  A.head = hf.P(.8, -1.9); A.mouth = hf.P(6, 0); A.center = segs[3];
}

/* ---- SAPWIGHT: a hunched ghoul of bark and black sap (48x64, ground 61) ---- */
function sapwight(F, st) {
  const { pose, f, gT } = st, A = st.anchors, T2 = gT >= 2, T3 = gT >= 3;
  const barkM = T3 ? 'rotwood' : 'bogwood', eyeM = T3 ? 'blight' : T2 ? 'eyeRed' : 'amber';
  let J = { hip: [22, 39.5], chest: [23, 28.4 + f * .4], head: [30.6, 18.4 + f * .6], sF: [18.2, 24.6 + f * .4], eF: [14, 34.2], hF: [14.8, 45.4], sN: [27, 24.2 + f * .4], eN: [30.4, 35], hN: [33, 46], kF: [18, 50], fF: [16.6, 60.4], kN: [26.4, 50.2], fN: [29.2, 60.4] };
  let ha = .3, jaw = .4, eye = 'open', lie = false, reachN = [.12, 1], reachF = [-.05, 1];
  if (pose === 'attack') { J = { hip: [24.6, 39.5], chest: [27.4, 28.2], head: [36.6, 18.6], sF: [22.8, 24], eF: [17.4, 30.4], hF: [12.4, 35], sN: [31.6, 24], eN: [37.6, 27], hN: [43.8, 24.6], kF: [20, 50], fF: [15.8, 60.4], kN: [31, 49.6], fN: [35, 60.4] }; ha = .42; jaw = 1; reachN = [1, -.2]; reachF = [-.7, .7]; }
  else if (pose === 'hurt') { J = { hip: [20.4, 40], chest: [19.8, 29], head: [22.6, 16], sF: [15.6, 24.6], eF: [11.2, 32.6], hF: [10.6, 41.6], sN: [23.8, 24.4], eN: [28.2, 32.6], hN: [32, 40.6], kF: [16.4, 50.4], fF: [15.4, 60.4], kN: [24.4, 50.6], fN: [26.6, 60.4] }; ha = -.35; jaw = .7; eye = 'shut'; }
  else if (pose === 'ko') { lie = true; J = { hip: [15.5, 55.5], chest: [26, 54.5], head: [37.8, 56.4], sF: [24.5, 50.5], eF: [30, 48], hF: [36.5, 48.8], sN: [26.5, 57.2], eN: [32.2, 59.6], hN: [39.6, 60.4], kF: [9.5, 52.5], fF: [3.5, 56], kN: [9.5, 58.4], fN: [3.2, 60.4] }; ha = .1; jaw = .55; eye = 'shut'; reachN = [1, .2]; reachF = [1, -.1]; }
  const bt = ({ x, y }) => { const n = vnoise(x * .35, y * .35, 71); if (!T3 && n > .8 - gT * .03) return { m: 'moss', dd: 0 }; if (n < .18) return { m: 'sap', dd: 0 }; return ((x * 3 + y) % 7 === 0 || (x - y * 2 + 99) % 9 === 0) ? -1 : 0; };
  const plates = ({ x, y }) => { const r = bt({ x, y }); return typeof r === 'object' ? r : y % 3 === 0 ? -1.5 : r; };
  const limb = (pts, rs, g, far) => F.add({ mat: barkM, prof: 'round', bw: rs[0] * .7, grp: g, shapes: chainC(pts, rs), tex: far ? farTex(bt) : bt });
  // long root fingers
  const fingers = (h, dir, g, far) => {
    const S = [circ(h, 1.9)];
    for (const [a, l] of [[-.5, 5], [-.15, 6.6], [.2, 6.8], [.55, 5.4]]) { const d = rot2(dir, a), m = [h[0] + d[0] * l * .5, h[1] + d[1] * l * .5 + .6]; S.push(...chainC([h, m, [h[0] + d[0] * l, h[1] + d[1] * l]], [1, .75, .3])); }
    F.add({ mat: barkM, prof: 'round', bw: .8, grp: g, shapes: S, tex: far ? DARK : null });
  };
  const roots = (p, g, far) => F.add({ mat: barkM, prof: 'round', bw: .8, grp: g, shapes: [cap(p, [p[0] - 5, p[1] + .5], 1.3, .4), cap(p, [p[0] + 5.5, p[1] + .6], 1.3, .4), cap([p[0], p[1] - 1], [p[0] + 1.5, p[1] + .3], 1.8, 1.1)], tex: far ? DARK : null });
  limb([J.sF, J.eF, J.hF], [2.3, 1.8, 1.4], 'armF', true); fingers(J.hF, reachF, 'handF', true);
  limb([J.hip, J.kF, J.fF], [3, 2.2, 1.6], 'legF', true); if (!lie) roots(J.fF, 'rootF', true);
  // a ribcage of bark over a hollow of black sap, plates of bark on the shoulders
  F.add({ mat: barkM, prof: 'round', bw: 3, grp: 'belly', shapes: [cap(J.chest, J.hip, lie ? 5 : 5.2, lie ? 3.8 : 3.8), ell(J.hip, lie ? 4.5 : 4.8, lie ? 3.2 : 3.4)], tex: ({ x, y }) => (!lie && y % 3 === 0 && Math.abs(x - J.hip[0] - .5) < 3.2 ? { m: 'sap', dd: 0 } : bt({ x, y })) });
  F.add({ mat: barkM, prof: 'round', bw: 5, hs: .8, grp: 'chest', shapes: [lie ? ell(J.chest, 9, 5.5) : ell(J.chest, 7.2, 7.8)], tex: plates });
  if (T2) { const c = J.chest; F.add({ mat: 'blight', prof: 'round', bw: .6, grp: 'cracks', noShadow: true, shapes: chainC([[c[0] - 3, c[1] - 5], [c[0] - 1, c[1] - 1.5], [c[0] - 3.2, c[1] + 2.5], [c[0] - 1.6, c[1] + 6]], .5).concat(T3 ? chainC([[c[0] + 3.5, c[1] - 4], [c[0] + 2, c[1]], [c[0] + 4, c[1] + 3.5]], .5) : []) }); }
  for (const [s, g] of [[J.sF, 'pdF'], [J.sN, 'pdN']]) F.add({ mat: barkM, prof: 'round', bw: 2, grp: g, shapes: [lie ? ell(s, 2.6, 3.2) : ell([s[0], s[1] - .4], 3.6, 2.6)], tex: plates });
  limb([J.hip, J.kN, J.fN], [3.2, 2.4, 1.7], 'legN'); if (!lie) roots(J.fN, 'rootN');
  // the head: a bark skull thrust forward on a long neck, twigs for hair, hollow eyes, a jaw that drips sap
  const hf = frame(J.head[0], J.head[1], ha), nb = lie ? [J.chest[0] + 7, J.chest[1]] : [J.chest[0] + 2.4, J.chest[1] - 6.4];
  F.add({ mat: barkM, prof: 'round', bw: 2, grp: 'neck', shapes: [cap(nb, hf.P(-2.5, 2.5), 2.4, 2)], tex: bt });
  F.add({ mat: barkM, prof: 'round', bw: .7, grp: 'twigs', shapes: [hf.cap(-2, -4.5, -5.5, -10.5, .95, .4), hf.cap(-4.4, -8.2, -8.4, -9.2, .6, .3), hf.cap(.4, -5, 1.8, -10, .85, .35), hf.cap(1.4, -8.2, 4.2, -9.8, .5, .3)].concat(gT >= 1 ? [hf.cap(-3.6, -3.8, -8.6, -5.4, .7, .3)] : []) });
  if (T3) F.add({ mat: 'blight', prof: 'round', bw: .5, grp: 'twigtips', noShadow: true, shapes: [hf.circ(-5.5, -10.5, .6), hf.circ(1.8, -10, .6), hf.circ(-8.4, -9.2, .5)] });
  F.add({ mat: barkM, prof: 'round', bw: 1.4, grp: 'jaw', shapes: [hf.poly([[-1, 2], [5, 2 + jaw], [5.4, 3.8 + jaw * 2.6], [0, 4.7 + jaw * 1.8]])], tex: bt });
  F.add({ mat: 'dark', prof: 'flat', grp: 'maw', noShadow: true, shapes: [hf.poly([[.5, 1.6], [5, 1.6 + jaw * .5], [4.6, 2.2 + jaw * 2.2], [.8, 3 + jaw * 1.3]])] });
  F.add({ mat: barkM, prof: 'round', bw: 3, grp: 'skull', shapes: [rell(hf, 0, -.8, 4.8, 4.6), hf.poly([[1, -3], [5.6, -1.5], [5.8, 1.6], [1, 2.2]])], tex: bt });
  F.add({ mat: 'dark', prof: 'flat', grp: 'socket', noShadow: true, shapes: [rell(hf, 2.5, -1.4, 1.8, 1.4, 10), rell(hf, -1.2, -1.6, 1.3, 1.1, 10)] });
  eyeOf(F, hf, 2.6, -1.4, 1.05, .75, eyeM, eye === 'shut', 'eyeN'); eyeOf(F, hf, -1.2, -1.6, .7, .55, eyeM, eye === 'shut', 'eyeF');
  if (!lie) { const d = hf.P(3.8, 4.2 + jaw * 2.2); F.add({ mat: 'sap', prof: 'round', bw: .7, grp: 'drool', noShadow: true, shapes: [cap(d, [d[0], d[1] + 3.4 + f], .6, .85)] }); }
  if (gT >= 1 && !lie) F.add({ mat: 'moss', prof: 'round', bw: 1, grp: 'moss', shapes: [ell([J.sN[0] - .6, J.sN[1] - 1.8], 2.4, 1.1), ell([J.sF[0] + .4, J.sF[1] - 1.6], 1.8, .9)] });
  limb([J.sN, J.eN, J.hN], [2.5, 2, 1.5], 'armN'); fingers(J.hN, reachN, 'handN');
  if (!lie) F.add({ mat: 'sap', prof: 'round', bw: .6, grp: 'drip', noShadow: true, shapes: [cap(J.eN, [J.eN[0], J.eN[1] + 3.5], .55, .75)] });
  A.head = hf.P(2.6, -1.4); A.mouth = hf.P(3.5, 3); A.center = J.chest;
}

/* ---- THE GLOAMWING: a pale moth, wings spread, the Dawnbell silk-spun under its thorax (64x64, ground 61) ---- */
// wing outlines in a wing frame: t runs from the root to the tip, the broad trailing edge on -s
const FOREWING = [[0, 1.2], [6, 2.8], [14, 3.4], [21, 2.8], [26.6, 1], [27.8, -2.2], [26.2, -6.4], [21, -10], [14, -11.6], [7, -10], [2.2, -6.2], [0, -2.6]];
const HINDWING = [[0, 1], [6, 2.2], [12.5, 2], [17.4, .2], [19.6, -3], [18.8, -7], [15.4, -10.4], [9.8, -11.8], [4.6, -9.6], [1, -5.4]];
const HIND_BITES = [[6.6, -12, 1.5], [11.6, -11.6, 1.5], [15.8, -9.4, 1.4], [18.8, -5.6, 1.3]];
// a moth wing rooted at `root`, pointing along angle `a`, sized k; sg flips the trailing edge to the other
// side; sq squashes it flat onto the ground line (the fallen moth)
function mothWing(F, { shape, root, a, sg, k, spot, spotM, g, far, sq, gT, bites }) {
  const X = frame(root[0], root[1], a), G = 59.2, L = Math.max(...shape.map(p => p[0]));
  const toC = (t, s) => { const p = X.P(t * k, s * sg * k); return sq ? [p[0], G + (p[1] - G) * sq] : p; };
  const fromC = (cx, cy) => { const [u, v] = X.uv(cx, sq ? G + (cy - G) / sq : cy); return [u / k, v * sg / k]; };
  const tex = ({ cx, cy, d }) => {
    const [t, s] = fromC(cx, cy);
    if (spot) { const r = Math.hypot(t - spot[0], s - spot[1]); if (r < spot[2] * .42) return { m: spotM, dd: 0 }; if (r < spot[2] * .74) return { m: 'bone', dd: 1 }; if (r < spot[2]) return { m: 'dark', dd: 2 }; }
    if (d < 1) return gT >= 3 ? { m: 'rot', dd: 1 } : -1; // the dusky fringe
    const r = Math.hypot(t, s) / L, ang = Math.atan2(s, Math.max(.6, t));
    if (Math.abs(r - .63 - Math.sin(ang * 9) * .03) < .035) return { m: 'bone', dd: -1 }; // the wavy cross-line
    if (t < 3.6) return { m: 'wolfPale', dd: 0 }; // fur at the root
    if (s > 1.2) return -1; // the darker leading edge
    if (t > 4 && Math.abs(((ang + 3.2) * 3.2) % 1 - .5) < .07) return -1; // veins
    return 0;
  };
  const cuts = bites ? bites.map(([t, s, r]) => { const c = toC(t, s); return sq ? ell(c, r * k, r * k * sq) : circ(c, r * k); }) : null;
  F.add({ mat: 'stagWhite', prof: 'round', bw: 2.2, hs: .55, grp: g, shapes: [poly(shape.map(([t, s]) => toC(t, s)))], cuts, tex: far ? farTex(tex) : tex });
}
function gloamwing(F, st) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, T2 = gT >= 2, T3 = gT >= 3, idle = !pose || pose === 'idle';
  const spotM = T3 ? 'blight' : T2 ? 'amber' : gT >= 1 ? 'radiant' : 'bone', eyeM = T3 ? 'blight' : T2 ? 'eyeRed' : 'sap';
  const b = idle ? f * .8 : 0;
  // the moth faces the party three-quarters on: head up and to the right, abdomen hanging below
  let T = [35.4, 26.4 + b], Hd = [37.4, 19.6 + b], ab = [[34.8, 32.8], [34.2, 38.2], [33.6, 43], [33.2, 46.6]].map(p => [p[0], p[1] + b]), abR = [4.6, 4, 3.2, 2.1];
  let W = { lf: -2.52 + f * .12, lh: 2.72 - f * .08, rf: -.62 - f * .12, rh: .5 + f * .08 }, lie = false, dim = false, sq = 0;
  if (pose === 'attack') { const d = [3, -2.4]; T = [T[0] + d[0], T[1] + d[1]]; Hd = [Hd[0] + d[0] + 1.2, Hd[1] + d[1]]; ab = ab.map(p => [p[0] + d[0] - 1, p[1] + d[1]]); W = { lf: -1.95, lh: 2.95, rf: -.38, rh: .95 }; }
  else if (pose === 'hurt') { const d = [-3.2, 1.6]; T = [T[0] + d[0], T[1] + d[1]]; Hd = [Hd[0] + d[0] - 1, Hd[1] + d[1] + .4]; ab = ab.map((p, i) => [p[0] + d[0] + i * .6, p[1] + d[1]]); W = { lf: -2.95, lh: 2.35, rf: -1.25, rh: 1.2 }; dim = true; }
  else if (pose === 'ko') { lie = true; dim = true; sq = .3; T = [34.4, 55.2]; Hd = [41.2, 55.8]; ab = [[28.8, 56], [24.4, 56.6], [20.4, 57], [17.4, 57.2]]; abR = [4.2, 3.6, 2.9, 2]; W = { lf: Math.PI - .05, lh: 2.75, rf: -.05, rh: .35 }; }
  const fur = furTex(12, 5);
  const wing = (shape, root, a, sg, k, spot, g, far, bites) => mothWing(F, { shape, root, a, sg, k, spot, spotM, g, far, sq: lie ? sq : 0, gT, bites });
  const rootL = [T[0] - 2.6, T[1] - 2.2], rootLh = [T[0] - 2.4, T[1] + 1.4], rootR = [T[0] + 2.8, T[1] - 2.4], rootRh = [T[0] + 2.4, T[1] + 1.2];
  // the far (right) wings, a little smaller and darker, then the near (left) wings; the body in front of them all
  wing(HINDWING, rootRh, W.rh, -1, .8, gT >= 1 ? [10, -5.8, 2.4] : null, 'rh', true, HIND_BITES);
  wing(FOREWING, rootR, W.rf, -1, .92, [15, -4.4, 3.2], 'rf', true);
  wing(HINDWING, rootLh, W.lh, 1, .95, gT >= 1 ? [10, -5.8, 2.6] : null, 'lh', false, HIND_BITES);
  wing(FOREWING, rootL, W.lf, 1, 1.1, [15, -4.4, 3.4], 'lf', false);
  F.add({ mat: 'wolfPale', prof: 'round', bw: 3, grp: 'abdomen', shapes: ab.map((c, i) => ell(c, abR[i], abR[i] * .92)), tex: ({ x, y }) => (y % 4 === 0 && hash(x, y, 5) < .6 ? -1 : fur({ x, y })) });
  F.add({ mat: 'wolfPale', prof: 'round', bw: 4, grp: 'thorax', shapes: [ell(T, 5.8, 5.2)], tex: fur });
  const ruff = [[-4.4, -3.2, -.8, -1], [-1.8, -4.6, -.2, -1], [1.6, -4.6, .3, -1], [4.2, -3, .9, -.8], [5, .4, 1, .2], [-5, .4, -1, .2]];
  F.add({ mat: 'wolfPale', prof: 'ridge', hs: .8, grp: 'ruff', shapes: spikesC(ruff.map(([dx, dy, ux, uy]) => [T[0] + dx, T[1] + dy, ux, uy, 2.6, 1.2])), tex: fur });
  // head: two great dark eyes (red, then blight, as it wakes) and feathered antennae
  F.add({ mat: 'wolfPale', prof: 'round', bw: 2.5, grp: 'head', shapes: [circ(Hd, 3.5)], tex: fur });
  const eyes = [ell([Hd[0] - 2.3, Hd[1] + .3], 1.7, 2.1), ell([Hd[0] + 2.2, Hd[1] + .2], 1.8, 2.2)];
  F.add({ mat: dim ? 'dark' : eyeM, prof: 'round', bw: 1.2, grp: 'eyes', noShadow: true, shapes: eyes, tex: eyeM === 'sap' && !dim ? ({ x, y }) => ((x + y) % 2 === 0 ? 1 : 0) : null });
  const antenna = (s0, pts, g) => {
    const P = [s0].concat(pts.map(p => [s0[0] + p[0], s0[1] + p[1]]));
    F.add({ mat: 'bone', prof: 'round', bw: .7, grp: g, shapes: chainC(P, [.6, 1.35, 1.5, 1.1, .5]), tex: ({ x, y }) => ((x + y) & 1 ? -1 : 0) });
  };
  const aL = lie ? [[3, -2], [7, -2.6], [10.6, -1.4], [12.6, 1]] : pose === 'attack' ? [[2.4, -3.4], [6, -6.2], [10, -7.2], [13.4, -6.4]] : [[-1.6, -3.4], [-3.8, -7], [-6.6, -9.6], [-10, -10.4]];
  const aR = lie ? [[3.2, 1.2], [7, 2.2], [10.4, 2], [12.4, .4]] : pose === 'attack' ? [[3.2, -2.4], [7, -4], [11, -3.6], [13.8, -1.6]] : [[1.8, -3.4], [4.2, -7], [7.4, -9.2], [10.8, -9.6]];
  antenna([Hd[0] - 1.4, Hd[1] - 2.8], aL, 'antL'); antenna([Hd[0] + 1.4, Hd[1] - 2.9], aR, 'antR');
  // legs dangling from the thorax
  const legs = lie ? [[[1, -3], [2.6, -7.4], [5.4, -9]], [[3.6, -2.6], [6.6, -6.4], [9.4, -7.4]], [[-1.4, -3.2], [-2.4, -7.6], [-1, -10.6]]]
    : [[[-3, 3], [-6, 8], [-6.6, 12.6]], [[3, 3], [6.2, 7.6], [7, 12]], [[-1.4, 4], [-2.8, 9.2], [-2.4, 14]], [[1.6, 4], [3, 9], [3, 13.6]]];
  F.add({ mat: 'claw', prof: 'round', bw: .6, grp: 'legs', shapes: legs.flatMap(L => chainC(L.map(p => [T[0] + p[0], T[1] + p[1]]), [.8, .65, .4])) });
  // the Dawnbell hangs head-down under the thorax, bound on with silk (torn silk once it is gone)
  const silk = (S, g) => F.add({ mat: 'string', prof: 'round', bw: .5, grp: g, noShadow: true, noOutline: true, shapes: S });
  const art = relic && held ? relicArt(relic) : null, R = art && RECIPE[art.r];
  if (R) {
    const hang = lie ? [T[0] - 1.6, T[1] + 1.4] : [T[0] - .2, T[1] + 3.2], grip = cardPt(art, 8), headPt = cardPt(art, art.p.headT ?? 52);
    const m = drawItem(F, art, hang, lie ? Math.PI * 1.25 : Math.PI * .75, .36, { center: grip });
    A.relic = m(headPt);
    const hp = m(headPt), d = [hp[0] - hang[0], hp[1] - hang[1]], l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l, d[0] / l];
    const at = u => [hang[0] + d[0] * u, hang[1] + d[1] * u];
    // silk wound round the haft at a slant, and strands to the thorax
    const band = (u, w, sk) => { const p = at(u), q = [n[0] * w + d[0] / l * sk, n[1] * w + d[1] / l * sk]; return cap([p[0] - q[0], p[1] - q[1]], [p[0] + q[0], p[1] + q[1]], .42); };
    silk([band(.18, 3.4, 1.4), band(.42, 2.6, -1.2), cap([T[0] - 4.2, T[1] + 1.2], at(.3), .38), cap([T[0] + 4, T[1] + .8], at(.24), .38), cap(at(.5), [T[0] + 2.4, T[1] + 4], .35)], 'silk');
  } else if (!held) silk([cap([T[0] - 1, T[1] + 4], [T[0] - 1.8, T[1] + 10.6], .45), cap([T[0] + 1.6, T[1] + 4], [T[0] + 3.2, T[1] + 9.4], .4), cap([T[0] - 3, T[1] + 3.4], [T[0] - 5.2, T[1] + 7.6], .4)], 'torn');
  A.head = Hd; A.mouth = [Hd[0] + .6, Hd[1] + 3.4]; A.center = T;
}
// Dreamdust: pale wing-scales drifting down (compose particles, from t only; none with reduced motion)
function gloamMotes(t, a) {
  const c = a.center || [32, 30], out = [];
  for (let k = 0; k < 7; k++) {
    const ph = (t * .3 + k / 7) % 1;
    out.push({ x: c[0] - 24 + hash(k, 1, 91) * 44 + Math.sin(t * 1.3 + k) * 2, y: c[1] - 14 + ph * 34, c: [236, 230, 216], a: .7 * Math.sin(ph * Math.PI) });
  }
  return out;
}

/* ---- GORROW THE MIRE-KING: a frog-king, the Mire Pearl set in his crown of reeds (64x64, ground 61) ---- */
function mirelord(F, st) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, T2 = gT >= 2, T3 = gT >= 3;
  const skin = 'seaweed', eyeM = T3 ? 'blight' : T2 ? 'eyeRed' : 'amber', reedM = T3 ? 'rotwood' : 'moss';
  let bx = 0, by = 0, jaw = 0, eye = 'open', lie = false, tongue = 0, tilt = 0;
  if (pose === 'attack') { bx = 3; by = -1.5; jaw = 1; tongue = 1; }
  else if (pose === 'hurt') { bx = -3; by = 1; eye = 'shut'; jaw = .35; tilt = -.12; }
  else if (pose === 'ko') { lie = true; eye = 'shut'; jaw = .6; }
  const br = lie || (pose && pose !== 'idle') ? 0 : f;
  const T = p => (lie ? [p[0], 51 + (p[1] - 44) * .55] : [p[0] + bx, p[1] + by]);
  const H = lie ? [47, 50.5] : T([45, 35 + br * .4]), hf = frame(H[0], H[1], tilt);
  // murky, warty skin: olive with moss warts and brown mottling (rot and blight at the last Waking)
  const wtex = ({ x, y }) => {
    const n = vnoise(x * .45, y * .45, 81), m = vnoise(x * .18, y * .18, 83);
    if (n > .8 - gT * .03) return { m: T3 && n > .9 ? 'blight' : 'moss', dd: 1 };
    if (m > .66) return { m: T3 ? 'rot' : 'bogwood', dd: m > .76 ? 0 : 1 };
    return hash(x, y, 9) < .07 ? -1 : 0;
  };
  const web = (p, g, far, s = 1) => F.add({ mat: skin, prof: 'round', bw: 1, grp: g, shapes: [ell(p, 3.4, 1.3), poly([[p[0] - 1, p[1]], [p[0] + 3.4 * s, p[1] - .6], [p[0] + 5 * s, p[1] + 1], [p[0] + .5, p[1] + 1.2]])], tex: far ? DARK : wtex });
  F.add({ mat: skin, prof: 'round', bw: 3, grp: 'hindF', shapes: [ell(T([14.5, 47.5]), 7, 5)], tex: farTex(wtex) });
  F.add({ mat: skin, prof: 'round', bw: 1.6, grp: 'armF', shapes: chainC([T([37.5, 49]), [38.2, 55.5], [38.8, 59.6]], [3, 2.4, 1.9]), tex: farTex(wtex) }); web([39.4, 60.2], 'handF', true);
  // the body: a squat hump, a wide flat head, one pale underside from the throat to the belly
  const bc = T([33.5, 51.5]), inE = (x, y, c, rx, ry) => ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 < 1;
  const belly = ({ x, y, cx, cy }) => {
    const [u, v] = hf.uv(cx, cy), throat = !lie && ((u + .6) / 9.6) ** 2 + ((v - 7.4) / (3.6 * (1 + br * .22))) ** 2 < 1;
    if (throat || inE(cx, cy, bc, lie ? 16 : 15.5, lie ? 3.2 : 5.2)) return { m: 'bone', dd: (y + (x >> 2)) % 3 === 0 ? -1 : 0 };
    return wtex({ x, y });
  };
  F.add({ mat: skin, prof: 'round', bw: 7, hs: .8, grp: 'body', shapes: [ell(T([28, 45]), 21, 12.5 + br * .3), ell(T([22, 38.5]), 14.5, 9), lie ? ell(H, 13, 6.5) : rell(hf, 0, 0, 12.8, 8.8)], tex: belly });
  // the mouth: a long line, or a gaping maw with the tongue lashing out
  if (jaw > .3) {
    F.add({ mat: 'dark', prof: 'flat', grp: 'maw', noShadow: true, shapes: [hf.poly([[-8, 4.2], [11.5, 2.6], [10.5, 4.2 + jaw * 3.4], [2, 5.6 + jaw * 3], [-6, 5.2]])] });
    F.add({ mat: 'snout', prof: 'round', bw: 1.4, grp: 'tongueroot', shapes: [hf.poly([[-3, 5.2 + jaw * 1.4], [8, 4.2 + jaw * 2], [7, 5.4 + jaw * 2.6], [-2, 6 + jaw * 2]])] });
  } else F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, noOutline: true, shapes: chainC([hf.P(-9, 4.2), hf.P(-2, 5.6), hf.P(6, 4.8), hf.P(11.2, 2.8)], .45) });
  if (tongue) { const t0 = hf.P(10, 4.8); F.add({ mat: 'snout', prof: 'round', bw: 1.6, grp: 'tongue', shapes: chainC([t0, [t0[0] + 5, t0[1] - 2.6], [58.4, 29.2], [61.2, 27.8]], [1.9, 1.7, 1.5, 1.4]).concat([ell([61.2, 27.6], 2.4, 2.1)]) }); }
  // the near hind leg, folded along the ground
  F.add({ mat: skin, prof: 'round', bw: 4, grp: 'hindN', shapes: [ell(T([17, 50.5]), 9.5, 7)], tex: wtex });
  F.add({ mat: skin, prof: 'round', bw: 1.8, grp: 'shinN', shapes: [cap([10.5, 57.6], [22.5, 59.8], 3, 2.2)], tex: wtex }); web([24, 60], 'footN');
  if (gT >= 1) F.add({ mat: 'moss', prof: 'round', bw: 1, grp: 'pad', shapes: [ell(T([18, 34.5]), 4.6, 1.4)] });
  if (T2 && !lie) F.add({ mat: 'water', prof: 'round', bw: .8, grp: 'drops', noShadow: true, shapes: [circ(T([12, 44]), .8), circ(T([30, 36]), .7), circ(T([24, 47]), .8)] });
  // eyes on top of the head, and between them the crown of reeds with the pearl
  const eyeAt = (t, s, r, g) => {
    F.add({ mat: skin, prof: 'round', bw: 2, grp: g, shapes: [hf.circ(t, s, r)], tex: wtex });
    if (eye === 'shut') F.add({ mat: skin, prof: 'round', bw: 1, grp: g + 'lid', shapes: [hf.cap(t - r * .8, s + .3, t + r * .8, s + .3, r * .45)], tex: () => -1 });
    else { F.add({ mat: eyeM, prof: 'round', bw: 1, grp: g + 'iris', noShadow: true, shapes: [hf.ell(t + .3, s, r * .7, r * .6)] }); F.add({ mat: 'dark', prof: 'flat', grp: g + 'pupil', noShadow: true, noOutline: true, shapes: [hf.cap(t - r * .45, s, t + r * .65, s, .45)] }); }
  };
  eyeAt(-6.4, -6.6, 3.7, 'eyeF');
  const Cc = hf.P(-.6, -8.8), cp = (dx, dy) => [Cc[0] + dx, Cc[1] + dy];
  const reeds = [[-5.6, 6, -.6], [-3.8, 9, -.4], [-1.9, 11.5, -.2], [0, 13, 0], [1.9, 11, .3], [3.8, 9.5, .5], [5.6, 6.5, .7]];
  const stalk = (list, g) => F.add({ mat: reedM, prof: 'round', bw: .6, grp: g, shapes: list.map(([x, h, l]) => cap(cp(x, 0), cp(x + l * h * .3, -h), .8, .45)) });
  stalk(reeds.filter((_, i) => i % 2), 'reedsB');
  F.add({ mat: T3 ? 'rot' : 'leather', prof: 'round', bw: 1, grp: 'cattails', shapes: [1, 4, 6].map(i => { const [x, h, l] = reeds[i]; return cap(cp(x + l * h * .21, -h * .7), cp(x + l * h * .28, -h * .93), 1.1); }) });
  // the pearl, set into the front of the crown (its band hidden among the reeds)
  const art = relic && held ? relicArt(relic) : null;
  const m = art ? drawRelic(F, art, cp(0, -4.2), tilt, .34, { center: [32, 20], drop: ['ring', 'runes'] }) : null;
  if (m) A.relic = m([32, 20]);
  stalk(reeds.filter((_, i) => !(i % 2)), 'reedsF');
  F.add({ mat: 'thorn', prof: 'round', bw: 1, grp: 'band', shapes: [cap(cp(-6.6, .6), cp(6.6, -.4), 1.5)], tex: ({ x, y }) => ((x * 2 + y) % 4 === 0 ? -1 : (x + y) % 4 === 0 ? 1 : 0) });
  if (!m) F.add({ mat: 'dark', prof: 'flat', grp: 'socket', noShadow: true, shapes: [ell(cp(0, -1.8), 1.8, 1.4)] });
  eyeAt(5.2, -7.4, 4.3, 'eyeN');
  F.add({ mat: skin, prof: 'round', bw: 1.8, grp: 'armN', shapes: chainC([T([51.5, 47]), [54.8, 54], [55.8, 59.6]], [3.2, 2.6, 2.1]), tex: wtex }); web([56.8, 60.2], 'handN');
  A.head = hf.P(5.2, -7.4); A.mouth = hf.P(10, 4.2); A.center = T([30, 44]);
}

/* ---- THE ROTWARDEN: a First-Age warden in green-gone bronze, bark grown through every seam, the Ichor
   Mask on its face and the First Seed in its chest; 3 phases (96x96, ground 93) ---- */
function rotwarden(F, st) {
  const { pose, f, phase, broken } = st, A = st.anchors, P2 = phase >= 2, P3 = phase >= 3;
  const barkM = P3 ? 'rotwood' : 'bark', idle = !pose || pose === 'idle';
  const maskArt = relicArt('ichor-mask'), seedArt = relicArt('first-seed');
  const maskOn = st.held && !broken.includes('ichor-mask') && !!maskArt, seedOn = st.held && !broken.includes('first-seed') && !!seedArt;
  let J = { head: [55.5, 19.5], shF: [35.5, 32.5], shN: [62.5, 32.5], chest: [48.5, 43], waist: [48, 55.5], elF: [30, 47.5], haF: [28.4, 61], elN: [69.5, 47], haN: [73.5, 59.5], hipF: [41.5, 61], knF: [38.6, 75.5], anF: [38.2, 88.4], hipN: [55, 61], knN: [58.8, 75.5], anN: [59.2, 88.4] };
  let whip = [[73.5, 59.5], [78.5, 67], [83, 76.5], [87.5, 86], [93, 91]], eye = 'open', kneel = false, tilt = 0;
  if (pose === 'attack') {
    J = Object.assign(J, { head: [59.5, 20.5], shF: [38.5, 33], shN: [65.5, 33], chest: [51, 44], waist: [49.5, 56], elF: [30.5, 43.5], haF: [23, 52], elN: [74, 38.5], haN: [81, 31], hipF: [42.5, 61], knF: [36, 75], anF: [32, 88.4], hipN: [56.5, 61], knN: [64, 74.5], anN: [66.5, 88.4] });
    whip = [[81, 31], [86, 26.5], [90.5, 22.5], [94.5, 19.5]]; tilt = .1;
  } else if (pose === 'hurt') {
    J = Object.assign(J, { head: [50.5, 17], shF: [31, 31], shN: [58.5, 31], chest: [45, 42.5], waist: [46, 55.5], elF: [25, 43.5], haF: [19, 53.5], elN: [67, 41], haN: [76, 48], hipF: [40, 61], knF: [36.6, 75.5], anF: [36.6, 88.4], hipN: [53, 61], knN: [57, 75.5], anN: [57, 88.4] });
    whip = [[76, 48], [83, 53], [88, 61], [91.5, 70]]; eye = 'shut'; tilt = -.25;
  } else if (pose === 'ko') {
    kneel = true; eye = 'shut'; tilt = .45;
    J = { head: [64, 56], shF: [39.5, 49], shN: [60.5, 49.5], chest: [50.5, 59.5], waist: [46, 70.5], elF: [34.5, 66], haF: [35, 84.5], elN: [67, 66], haN: [71, 84], hipF: [40.5, 75], knF: [35.5, 88], anF: [21.5, 90.5], hipN: [50.5, 76], knN: [58.5, 89], anN: [44.5, 91] };
    whip = [[71, 84], [78, 88.5], [86, 90.5], [94, 91]];
  }
  // phase 3 hunches it lower, head thrust forward; idle breathes
  if (P3 && !kneel) for (const [k, d] of [['head', [4, 7]], ['shF', [2, 4.5]], ['shN', [2, 4.5]], ['chest', [1.5, 3]], ['elF', [1.5, 3]], ['elN', [1.5, 3]]]) J[k] = [J[k][0] + d[0], J[k][1] + d[1]];
  if (idle) for (const k of ['head', 'shF', 'shN', 'chest', 'elF', 'elN']) J[k] = [J[k][0], J[k][1] + f * .7];
  const barkTex = ({ x, y }) => { const n = vnoise(x * .22, y * .22, 93); if (!P3 && n > .8) return { m: 'moss', dd: 0 }; return ((x * 3 + y) % 7 === 0 || (x - y * 2 + 99) % 11 === 0) ? -1 : n < .25 ? 1 : 0; };
  // First-Age bronze gone green: worn bronze at the rims and in patches, bark grown up through the seams
  // (wider each phase), moss in the hollows
  const seam = P3 ? .075 : P2 ? .06 : .045;
  const plateTex = (seed, dk = -1) => ({ x, y, d, nx, ny }) => {
    if (d < 1.05) return nx + ny < -.12 ? { m: 'bronze', dd: dk } : { m: 'verdigris', dd: dk - 1 };
    const s = Math.abs(vnoise(x * .16, y * .09, seed) - .5);
    if (s < seam) return { m: barkM, dd: s < .02 ? -1 : 0 };
    const n = vnoise(x * .3, y * .3, 97 + seed);
    if (n > .77) return { m: 'bronze', dd: dk - 1 };
    if (!P3 && n < .16) return { m: 'moss', dd: 0 };
    return { m: 'verdigris', dd: dk - (hash(x, y, 4) < .07 ? 1 : 0) - (P3 ? 1 : 0) };
  };
  const plate = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: 'verdigris', prof: 'round', bw: 3, grp: g, shapes, tex: far ? farTex(plateTex(seed)) : plateTex(seed) }, o));
  const bark = (shapes, g, far, o = {}) => F.add(Object.assign({ mat: barkM, prof: 'round', bw: 2.5, grp: g, shapes, tex: far ? farTex(barkTex) : barkTex }, o));
  const rootHand = (h, dir, g, far) => {
    const S = [circ(h, 3.4)];
    for (const [a, l] of [[-.6, 7], [-.2, 8.6], [.2, 8], [.62, 6]]) { const d = rot2(dir, a); S.push(...chainC([h, [h[0] + d[0] * l * .5, h[1] + d[1] * l * .5 + .6], [h[0] + d[0] * l, h[1] + d[1] * l]], [1.7, 1.2, .4])); }
    bark(S, g, far, { bw: 1.2 });
  };
  const rootFoot = (p, g, far) => bark([cap(p, [p[0] - 7.4, p[1] + 2.4], 2.6, .6), cap(p, [p[0] + 8, p[1] + 2.6], 2.6, .6), cap(p, [p[0] + 1.5, p[1] + 2.2], 3.4, 1.8), cap(p, [p[0] - 3, p[1] + 3.2], 1.6, .5)], g, far, { bw: 1.2 });
  const pauldron = (sh, g, seed, far, cuts) => { plate([ell(sh, 9.2, 7.2)], g, seed, far, { bw: 4.5, cuts }); plate([ell([sh[0], sh[1] + 5.4], 8.2, 3.4)], g + 'l', seed + 1, far, { bw: 2 }); };
  const hf = frame(J.head[0], J.head[1], tilt), C = J.chest, Wst = J.waist;
  // behind: branches grown up through the helm; in phase 2 roots arch off its back
  const branches = [[[-3, -7], [-7, -14], [-9, -20], [-8.4, -25.5]], [[1, -8], [3, -15], [7, -19.5], [11.5, -21.5]], [[-1, -8], [-1.6, -17], [.6, -23.5]]];
  bark(branches.flatMap(b => chainC(b.map(p => hf.P(p[0], p[1])), [1.9, 1.5, 1, .55])).concat([hf.cap(-7, -14, -12, -16.5, .9, .4), hf.cap(3, -15, 1.5, -20, .8, .35)]), 'branches', false, { bw: 1.2 });
  if (!P3) F.add({ mat: 'moss', prof: 'round', bw: .8, grp: 'leaves', shapes: [hf.ell(-9.4, -21, 2, 1.1), hf.ell(10.8, -22, 1.8, 1), hf.ell(.4, -24.4, 1.6, 1)] });
  if (P3) F.add({ mat: 'blight', prof: 'round', bw: .6, grp: 'budtips', noShadow: true, shapes: [hf.circ(-8.4, -25.5, .9), hf.circ(11.5, -21.5, .9), hf.circ(.6, -23.5, .8), hf.circ(-12, -16.5, .7)] });
  if (P2 && !kneel) bark(chainC([[J.shF[0] + 2, J.shF[1] - 3], [J.shF[0] - 6, J.shF[1] - 13], [J.shF[0] - 14, J.shF[1] - 15], [J.shF[0] - 19, J.shF[1] - 11]], [2.6, 2, 1.3, .6]).concat(chainC([[J.shF[0] + 6, J.shF[1] - 4], [J.shF[0] + 2, J.shF[1] - 16], [J.shF[0] - 4, J.shF[1] - 22]], [2.2, 1.5, .6])), 'backroots', true, { bw: 1.2 });
  // far arm, pauldron (gone in phase 3: bark where it broke away) and leg
  plate([cap(J.shF, J.elF, 4.8, 4.2)], 'armF', 3, true); plate([circ(J.elF, 3.3)], 'elbowF', 4, true);
  plate([cap(J.elF, J.haF, 4, 3.5)], 'foreF', 5, true); rootHand(J.haF, kneel ? [0, 1] : pose === 'attack' ? [-.7, .7] : [.05, 1], 'handF', true);
  if (P3) bark([ell(J.shF, 6.4, 5.6)], 'shoulderF', true, { bw: 3 }); else pauldron(J.shF, 'pdF', 6, true);
  plate([cap(J.hipF, J.knF, 5.6, 4.8)], 'thighF', 8, true); plate([circ(J.knF, 3.8)], 'kneeF', 9, true);
  plate([cap(J.knF, J.anF, 4.6, 3.8)], 'shinF', 10, true); rootFoot(J.anF, 'footF', true);
  // the body: bark under the plate (seen where the plate has broken), the cuirass and three lames of fauld
  bark([ell(C, 14.5, 14), cap(C, Wst, 12, 10)], 'core', false, { bw: 6, tex: ({ x, y }) => (y % 4 === 0 ? -1.5 : barkTex({ x, y })) });
  const cuirass = [[C[0] - 13, C[1] - 11], [C[0] - 3, C[1] - 13], [C[0] + 4, C[1] - 13], [C[0] + 14, C[1] - 10.5], [C[0] + 15.4, C[1] - 2], [C[0] + 11.6, Wst[1] - 1.4], [Wst[0] + 1, Wst[1] + 1.6], [C[0] - 11.6, Wst[1] - 1.4], [C[0] - 14.8, C[1] - 2]];
  const holes = P3 ? [ell([C[0] - 6.5, C[1] + 3.5], 4.4, 3.2), ell([C[0] + 9, C[1] - 6], 3.2, 2.5), ell([C[0] - 1, C[1] + 10.5], 3.8, 2.2)] : P2 ? [poly([[C[0] - 9, C[1] - 9], [C[0] - 7.6, C[1] - 9.4], [C[0] - 5, C[1] - 2], [C[0] - 6.6, C[1] + 5], [C[0] - 7.6, C[1] + 4.6], [C[0] - 6.4, C[1] - 2]])] : [];
  plate([poly(cuirass)], 'cuirass', 12, false, { bw: 6, hs: .8, cuts: holes });
  for (let k = 0; k < 3; k++) { const y0 = Wst[1] + .6 + k * 3.3, w0 = 11.6 + k * 1.4; plate([poly([[Wst[0] - w0, y0], [Wst[0] + w0, y0], [Wst[0] + w0 + .8, y0 + 3.6], [Wst[0] - w0 - .8, y0 + 3.6]])], 'fauld' + k, 13 + k, false, { bw: 1.6 }); }
  plate([cap([C[0] - 6.4, C[1] - 12.4], [C[0] + 7.4, C[1] - 12.4], 3)], 'gorget', 16, false, { bw: 2 });
  // the heart: the First Seed held in a cage of roots (torn stumps once it is out), roots spreading from it
  const S0 = [C[0] + 2.5, C[1] - 1.5];
  bark(chainC([S0, [S0[0] - 6, S0[1] - 4], [S0[0] - 11, S0[1] - 5]], [1.3, 1, .5]).concat(chainC([S0, [S0[0] + 6, S0[1] + 3.5], [S0[0] + 10.5, S0[1] + 7.5]], [1.3, 1, .5]), chainC([S0, [S0[0] - 3.5, S0[1] + 6], [S0[0] - 4.5, S0[1] + 11]], [1.2, .9, .5])), 'veins', false, { bw: .8 });
  F.add({ mat: 'dark', prof: 'round', bw: 2, grp: 'hollow', shapes: [ell(S0, 4.8, 5.4)] });
  const mSeed = seedOn ? drawRelic(F, seedArt, S0, 0, .28, { center: [32, 42], drop: ['chain'] }) : null;
  if (mSeed) A.seed = mSeed([32, 42]);
  bark(mSeed ? [cap([S0[0] - 5, S0[1] - 4], [S0[0] + 4.6, S0[1] + 4.4], .9, .7), cap([S0[0] + 5, S0[1] - 4.4], [S0[0] - 4.2, S0[1] + 4.8], .9, .7), cap([S0[0] - 5.4, S0[1] + .4], [S0[0] + 5.4, S0[1] - .2], .8)]
    : [cap([S0[0] - 5, S0[1] - 4], [S0[0] - 2.4, S0[1] - 1.6], 1, .5), cap([S0[0] + 5, S0[1] - 4.4], [S0[0] + 2.6, S0[1] - 2], 1, .5), cap([S0[0] + 5.2, S0[1] + 3.8], [S0[0] + 2.8, S0[1] + 1.8], .9, .45)], 'cage', false, { bw: .8 });
  if (!mSeed) F.add({ mat: 'sap', prof: 'round', bw: .8, grp: 'bleed', noShadow: true, shapes: [cap([S0[0] - .5, S0[1] + 4], [S0[0] - .5, S0[1] + 9 + f], .8, 1.1)] });
  // glowing blight in the seams (phase 2), everywhere (phase 3)
  const V = [[[C[0] - 10, C[1] - 7], [C[0] - 7, C[1] - 2], [C[0] - 9, C[1] + 4]], [[C[0] + 6, C[1] + 5], [C[0] + 9, C[1] + 9], [C[0] + 7, C[1] + 13]], [[Wst[0] - 8, Wst[1] + 1], [Wst[0] - 5, Wst[1] + 5]], [[C[0] - 3, C[1] - 11], [C[0] + 1, C[1] - 8], [C[0] - 1, C[1] - 5]]];
  for (let k = 0; k < (P3 ? 4 : P2 ? 2 : 0); k++) F.add({ mat: 'blight', prof: 'round', bw: .7, grp: 'vein' + k, noShadow: true, shapes: chainC(V[k], P3 ? .75 : .6) });
  // near leg
  plate([cap(J.hipN, J.knN, 6, 5)], 'thighN', 17); plate([circ(J.knN, 4)], 'kneeN', 18);
  plate([cap(J.knN, J.anN, 4.8, 4)], 'shinN', 19); rootFoot(J.anN, 'footN');
  // the head: a knot of bark under a First-Age helm; the mask's eye-slit glows from behind
  bark([cap([C[0] + 4, C[1] - 11], hf.P(-2, 4), 5, 4.4)], 'neck');
  bark([rell(hf, 0, 0, 7.4, 8.4)], 'skull', false, { bw: 4 });
  F.add({ mat: maskOn ? (P3 ? 'blight' : 'amber') : 'dark', prof: 'round', bw: 1, grp: 'maskglow', noShadow: true, shapes: [hf.cap(-3.4, 1.1, 6.4, 1.1, maskOn && P3 ? 1.3 : .9)] });
  plate([rell(hf, 0, -1.6, 8.4, 8.4)], 'helm', 20, false, { bw: 4, clip: hf.poly([[-12, -14], [12, -14], [12, -3.2], [-12, -3.2]]) });
  if (maskOn) {
    // the Ichor Mask: a smith's mask that is not its face (a full helm's face plate, its dome dropped)
    const full = maskArt.r === 'helm' && (!maskArt.p.look || maskArt.p.look === 'helm');
    const m = drawRelic(F, maskArt, hf.P(1.2, 2.6), tilt, .34, { center: [32, 38], drop: full ? ['dome', 'crest', 'plume', 'in'] : [] });
    if (m) A.mask = m([32, 34]);
    if (P2 && !kneel) F.add({ mat: 'sap', prof: 'round', bw: .8, grp: 'ichor', noShadow: true, shapes: [cap(hf.P(1.6, 9.4), hf.P(1.4, 13.4 + f), .7, 1), cap(hf.P(5.2, 8.6), hf.P(5.4, 11.4), .6, .85)] });
  } else {
    // under the mask: knotted wood, and green eyes the Rot never reached; a shard of the mask still hangs on
    F.add({ mat: 'dark', prof: 'flat', grp: 'knots', noShadow: true, shapes: [rell(hf, 3.4, .6, 1.9, 1.5, 10), rell(hf, -2.2, .8, 1.6, 1.3, 10)] });
    eyeOf(F, hf, 3.4, .6, 1.05, .8, 'verdant', eye === 'shut', 'eyeN'); eyeOf(F, hf, -2.2, .8, .85, .7, 'verdant', eye === 'shut', 'eyeF');
    bark([hf.cap(-3, 4.8, 5.8, 4.2, .9)], 'grain', false, { bw: .8 });
    if (P2) F.add({ mat: 'sap', prof: 'round', bw: .6, grp: 'tears', noShadow: true, shapes: [cap(hf.P(3.6, 1.6), hf.P(3.8, 5.4), .5, .7)] });
    F.add({ mat: 'iron', prof: 'bevel', bw: 1, grp: 'shard', shapes: [hf.poly([[-7.6, .2], [-5.2, -.6], [-4.6, 3.8], [-6.2, 6.2], [-7.8, 4]])], tex: ({ x, y }) => (hash(x, y, 3) < .2 ? -1 : 0) });
  }
  // near arm: a plated upper arm, a forearm braided of roots, and the Rootlash trailing from the fist
  plate([cap(J.shN, J.elN, 5.2, 4.6)], 'armN', 21); plate([circ(J.elN, 3.6)], 'elbowN', 22);
  bark([cap(J.elN, J.haN, 4.6, 4)], 'foreN');
  const braid = []; for (let k = 0; k < 3; k++) { const o = (k - 1) * 1.8; braid.push(...chainC([[J.elN[0] + o, J.elN[1]], [(J.elN[0] + J.haN[0]) / 2 - o, (J.elN[1] + J.haN[1]) / 2], [J.haN[0] + o * .5, J.haN[1]]], 1.3)); }
  bark(braid, 'braid', false, { bw: 1, tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) });
  bark(chainC(whip, whip.map((_, i) => 3.4 - i * 2.6 / (whip.length - 1))), 'whip', false, { bw: 1.6 });
  F.add({ mat: P3 ? 'rotwood' : 'thorn', prof: 'ridge', hs: .9, grp: 'whipthorns', shapes: spikesC(spineThorns(whip, P2 ? 6 : 4, P2 ? 4.5 : 3.4, 1.1, -.4, false)) });
  rootHand(J.haN, pose === 'attack' ? [.8, -.6] : [.2, 1], 'handN');
  pauldron(J.shN, 'pdN', 23, false, P2 ? [poly([[J.shN[0] - 1, J.shN[1] - 9], [J.shN[0] + 1.4, J.shN[1] - 9], [J.shN[0] + 2.4, J.shN[1] - 2], [J.shN[0] - .4, J.shN[1] - 1]])] : null);
  if (P2) bark([ell([J.shN[0] + .6, J.shN[1] - 4], 2.4, 3.6)], 'burst', false, { bw: 1.5 });
  if (P2 && !kneel) F.add({ mat: 'sap', prof: 'round', bw: .8, grp: 'drips', noShadow: true, shapes: [cap([C[0] - 6, C[1] + 13], [C[0] - 6, C[1] + 17 + f], .8, 1.1), cap([C[0] + 9, C[1] + 11], [C[0] + 9.2, C[1] + 14.5], .7, 1)].concat(P3 ? [cap([Wst[0] + 3, Wst[1] + 10], [Wst[0] + 3.2, Wst[1] + 14], .8, 1.1)] : []) });
  A.head = hf.P(2, .6); A.mouth = hf.P(3, 5); A.center = kneel ? [50, 64] : C;
  A.relics = [A.mask, A.seed].filter(Boolean); A.relic = A.relics[0] || null;
}

/* ---------- registry of the M3 beasts ---------- */
Object.assign(FOE_ART, {
  boglurcher: { name: 'Boglurcher', kind: 'beast', w: 48, h: 48, foot: [24, 45], defaultTier: 'rabble', build: boglurcher },
  glowcap: { name: 'Glowcap', kind: 'beast', w: 48, h: 48, foot: [24, 45], defaultTier: 'rabble', build: glowcap },
  rotgrub: { name: 'Rotgrub', kind: 'beast', w: 48, h: 32, foot: [24, 30], defaultTier: 'rabble', build: rotgrub },
  sapwight: { name: 'Sapwight', kind: 'beast', w: 48, h: 64, foot: [24, 61], defaultTier: 'veteran', build: sapwight },
  gloamwing: { name: 'The Gloamwing', kind: 'beast', w: 64, h: 64, foot: [32, 61], defaultTier: 'relic-bearer', relic: 'dawnbell', build: gloamwing, motes: gloamMotes },
  mirelord: { name: 'Gorrow the Mire-King', kind: 'beast', w: 64, h: 64, foot: [32, 61], defaultTier: 'relic-bearer', relic: 'mire-pearl', build: mirelord },
  rotwarden: { name: 'The Rotwarden', kind: 'beast', w: 96, h: 96, foot: [48, 93], defaultTier: 'champion', relic: 'ichor-mask', relics: ['ichor-mask', 'first-seed'], phases: 3, build: rotwarden },
});

/* =====================================================================
   M4 · THE SUNSCORCH (spec §3.2, §6.2): the nine families, their named holders and variants, Tamsin kindled
   ===================================================================== */
// sun-scorched hide at the last Waking: cracks of live ember through it
const emberCracks = seed => ({ x, y }) => (Math.abs(vnoise(x * .5, y * .5, seed) - .5) < .055 ? { m: 'ember', dd: 0 } : 0);

/* ---- SAND-SKINK: a quick little lizard the colour of hot sand (48x32, ground 30) ---- */
function sandSkink(F, st) {
  const { pose, f, gT } = st, A = st.anchors, T3 = gT >= 3, hide = T3 ? 'char' : 'skink';
  let B = [20.5, 24 + f * .3], H = [33.4, 21.2 + f * .4], ha = -.06, jaw = 0, eye = 'open', up = false, spit = false;
  let legs = { fn: [[27, 25.2], [29.8, 26.6], [31.8, 29.4]], ff: [[25.4, 24.4], [26.8, 26.8], [28.4, 29.4]], hn: [[15.4, 25.4], [12.8, 27.2], [15.2, 29.4]], hf: [[17.6, 24.8], [18.4, 27.2], [20.2, 29.4]] };
  let tail = [[13.4, 24.2], [8.6, 25.8], [4.8, 26.6], [2.2, 25], [2.8, 22.2]];
  if (pose === 'attack') {
    B = [24, 23]; H = [37.8, 19.2]; ha = -.28; jaw = 1; spit = true;
    legs = { fn: [[30.4, 24.2], [33.8, 26], [36.8, 29.4]], ff: [[28.8, 23.6], [31, 26.2], [33.6, 29.4]], hn: [[19, 24.6], [15, 26.8], [12.2, 29.4]], hf: [[21, 24.2], [18.2, 27], [16, 29.4]] };
    tail = [[17, 23.4], [12, 24.2], [7.6, 25.6], [4, 27], [1.4, 26.6]];
  } else if (pose === 'hurt') {
    B = [18.4, 23.2]; H = [29.8, 17.6]; ha = -.55; jaw = .5; eye = 'shut';
    legs = { fn: [[24.6, 24.6], [27, 27], [28.6, 29.4]], ff: [[23, 24], [23.8, 26.8], [25.4, 29.4]], hn: [[13.4, 24.6], [11, 27], [13, 29.4]], hf: [[15.4, 24.2], [16, 27], [17.6, 29.4]] };
    tail = [[11.6, 23.6], [7.4, 21.8], [4.8, 18.6], [4, 15.2], [5.4, 12.8]];
  } else if (pose === 'ko') {
    up = true; B = [21.5, 26.6]; H = [33.8, 26.4]; ha = .1; eye = 'shut'; jaw = .3;
    legs = { fn: [[27, 24], [28.8, 21.4], [30.6, 19.8]], ff: [[25.2, 24.2], [25.6, 21.4], [26.8, 19.6]], hn: [[16, 24.4], [14.2, 21.6], [15.6, 19.6]], hf: [[18, 24.2], [18.8, 21.4], [20.6, 19.6]] };
    tail = [[13.4, 27], [8.6, 28], [4.4, 28.4], [1.6, 27.6], [.6, 26]];
  }
  const belly = up ? B[1] - 1.8 : B[1] + 1.2;
  const scales = T3 ? (q => emberCracks(61)(q) || ((q.x + q.y) % 4 === 0 ? -1 : 0)) : ({ x, y }) => (y > belly ? (up ? 0 : { m: 'sand', dd: 1 }) : (x + (y >> 1)) % 6 < 2 ? -1 : hash(x, y, 7) < .08 ? 1 : 0);
  const leg = (pts, far, g) => { legOf(F, pts, [1.4, 1.05, .8], hide, null, g, far); const e = pts[2]; F.add({ mat: hide, prof: 'round', bw: .6, grp: g + 't', shapes: up ? [cap(e, [e[0] - 1, e[1] - 1.2], .55, .3), cap(e, [e[0] + 1, e[1] - 1.2], .55, .3)] : [cap(e, [e[0] + 1.8, e[1] + .2], .55, .3), cap(e, [e[0] - 1.4, e[1] + .3], .55, .3)], tex: far ? DARK : null }); };
  if (!up) { leg(legs.hf, true, 'hf'); leg(legs.ff, true, 'ff'); }
  F.add({ mat: hide, prof: 'round', bw: 1.6, grp: 'tail', shapes: chainC(tail, [2.6, 2, 1.4, .9, .5]), tex: scales });
  F.add({ mat: hide, prof: 'round', bw: 3, hs: .8, grp: 'body', shapes: up ? [ell(B, 9, 3.2), ell([B[0] + 5.6, B[1] + .2], 4.6, 2.8)] : [ell(B, 8.4, 3.9), ell([B[0] + 5.4, B[1] - .3], 4.6, 3.3)], tex: scales });
  const back = up ? [[B[0] - 7, B[1] + 2.6], [B[0], B[1] + 3], [B[0] + 7, B[1] + 2.4]] : [[B[0] - 7.4, B[1] - 2.8], [B[0] - 2, B[1] - 3.8], [B[0] + 4, B[1] - 3.8], [B[0] + 8.6, B[1] - 3]];
  if (gT >= 1 && !up) F.add({ mat: T3 ? 'ember' : 'thorn', prof: 'ridge', hs: .9, grp: 'spines', noShadow: T3, shapes: spikesC(spineThorns(back, 4 + gT, 2.2 + gT * .5, .8, -.45)) });
  if (up) { leg(legs.hf, false, 'hf'); leg(legs.ff, false, 'ff'); }
  const hf = frame(H[0], H[1], ha), jf = frame(...hf.P(.6, 1.4), ha + jaw * .5);
  F.add({ mat: hide, prof: 'round', bw: 1.8, grp: 'neck', shapes: [cap([B[0] + 7, B[1] - .6], hf.P(-2.2, .6), 3, 2.3)], tex: scales });
  // the frill round its neck: a crest, then a fan of saffron skin, then a fan of living ember
  const fr = gT >= 2 ? 1.35 : 1;
  if (gT >= 1 || pose === 'attack') F.add({ mat: T3 ? 'ember' : 'clothSaffron', prof: 'round', bw: 1, grp: 'frill', noShadow: T3, shapes: [hf.poly([[-2.4, -2.2], [-4.6 * fr, -5.8 * fr], [-6.6 * fr, -2.6], [-6.8 * fr, 1.2], [-5.2 * fr, 4.4 * fr], [-2.4, 2.6]])], tex: ({ x, y }) => ((x * 2 + y) % 4 === 0 ? -1 : 0) });
  if (jaw > .3) F.add({ mat: 'flesh', prof: 'round', bw: 1, grp: 'maw', shapes: [poly([hf.P(.6, 1), hf.P(6.6, 1.4), jf.P(5.8, .5), jf.P(0, 0)])] });
  F.add({ mat: hide, prof: 'round', bw: 1, grp: 'jaw', shapes: [jf.cap(0, 0, 5.4, .4, 1.2, .6)], tex: scales });
  F.add({ mat: hide, prof: 'round', bw: 2, grp: 'head', shapes: [rell(hf, 0, 0, 3.8, 2.7), hf.cap(1.6, .4, 6.6, 1, 2.2, 1.1)], tex: scales });
  eyeOf(F, hf, 1.3, -1.1, .85, .7, gT >= 2 ? 'eyeRed' : 'amber', eye === 'shut');
  if (spit) F.add({ mat: 'ember', prof: 'round', bw: 1, grp: 'spit', noShadow: true, shapes: [circ(hf.P(10.4, 2.4), 1.5), circ(hf.P(13.6, 3.6), .9), circ(hf.P(8.4, 1.6), .7)] });
  if (!up) { leg(legs.hn, false, 'hn'); leg(legs.fn, false, 'fn'); }
  else { leg(legs.hn, false, 'hn'); leg(legs.fn, false, 'fn'); }
  A.head = hf.P(1.3, -1.1); A.mouth = hf.P(6, 1.4); A.center = [B[0] + 2, B[1]];
}

/* ---- GLASS SCORPIONS: a scorpion gone to cloudy glass in the heat. One builder draws the family (64x48, ground
   45), the Aqueduct Matriarch (scaled up, her shell split to moult) and Kharzul (the Champion: Cinderfang in its
   tail, the Glass Carapace over its back, three phases), in a 64x48 base space mapped by S = { k, dx, dy } ---- */
const TAIL = {
  idle: [[12.6, 30.4], [8.4, 25], [7.6, 18.4], [10.4, 12.6], [16, 9], [22.4, 8.8]],
  attack: [[13.4, 30], [11, 23.6], [12.8, 17], [18.6, 12.8], [26, 12.6], [32, 16.4]],
  hurt: [[12, 30.6], [7, 26], [4.6, 19.6], [5.6, 13], [9.4, 8.4], [15, 6.4]],
  ko: [[12.4, 36.6], [8, 39.6], [3.8, 41.2], [1, 39.2], [1.2, 35.4], [3.6, 33.2]],
};
const BOSS_TAIL = {
  idle: [[12.6, 30.4], [7.8, 23.4], [6.6, 15], [9.6, 7.6], [15.4, 2.8], [22.2, 1.6], [27.8, 4.2]],
  attack: [[13.4, 30], [10.4, 21.6], [12, 13], [18.2, 6.6], [26.4, 4.4], [34, 7.4], [39, 13]],
  hurt: [[12, 30.6], [6.6, 24], [3.8, 15.4], [4.6, 7.4], [9, 1.8], [15, -.8], [20.6, .2]],
  ko: [[12.4, 36.6], [7.8, 39.8], [3.2, 41.4], [.4, 38.6], [1, 34.4], [3.8, 31.6], [7.4, 31]],
};
function scorpion(F, st, S) {
  const { pose, f, gT, phase, broken, held } = st, A = st.anchors, k = S.k, T = p => [S.dx + p[0] * k, S.dy + p[1] * k];
  const boss = !!S.boss, P2 = boss && phase >= 2, P3 = boss && phase >= 3, mat = S.matriarch;
  const idle = !pose || pose === 'idle', lie = pose === 'ko';
  const glass = P3 || (gT >= 3 && !boss) ? 'smokeglass' : 'sandglass', veinM = P3 || gT >= 3 ? 'ember' : 'amber';
  const eyeM = boss ? (P2 ? 'eyeRed' : 'amber') : gT >= 2 ? 'eyeRed' : 'amber';
  let bx = 0, by = idle ? f * .3 : 0, open = .12 + (idle ? f * .08 : 0), clawUp = 0;
  if (pose === 'attack') { bx = 2; by = -.4; open = .95; } else if (pose === 'hurt') { bx = -2; by = -.6; open = .5; clawUp = 1; } else if (lie) { by = 4; open = .3; }
  const B = p => T([p[0] + bx, p[1] + by]), R = r => r * k;
  const tail = ((boss ? BOSS_TAIL : TAIL)[pose] || (boss ? BOSS_TAIL : TAIL).idle).map((p, i) => (idle ? T([p[0] + Math.sin(f * 1.7 + i) * .06 * i, p[1] + f * .07 * i]) : lie ? T(p) : T([p[0] + (i ? 0 : bx), p[1] + (i ? 0 : by)])));
  // cloudy glass: milky patches and bright facets; sand crusted up the legs and belly once it has burrowed (phase 2+)
  const sandLine = S.dy + (35.6 + (lie ? 3 : 0)) * k;
  const gtex = seed => ({ x, y }) => {
    if (P2 && y > sandLine && vnoise(x * .45, y * .45, seed + 9) > .32) return { m: 'sand', dd: y > sandLine + 3 * k ? 0 : -1 };
    const n = vnoise(x * .32, y * .32, seed); if (n > .75) return 1; if (n < .24) return -1; return hash(x, y, seed) < .05 ? 1 : 0;
  };
  // eight legs, four a side: up to a high knee, then down to the ground; the far side a shade darker, behind
  const LEGS = [[[19.6, 36.8], [15.2, 34.4], [12.4, 45]], [[24.2, 37.4], [20.6, 35], [18.8, 45]], [[29, 37.4], [32.6, 35], [34.4, 45]], [[33.6, 36.8], [38.2, 34.4], [41.2, 45]]];
  const legPts = (L, far) => L.map((p, j) => (lie ? T([p[0] + (far ? 1.2 : 0), j === 2 ? 43.4 - (far ? .4 : 0) : p[1] + 4 + (j === 1 ? -2 : 0)]) : j === 2 ? T([p[0] + (far ? 1.6 : 0) + bx * .3, 45 - (far ? .6 : 0)]) : B([p[0] + (far ? 1.6 : 0), p[1] - (far ? 1.2 : 0)])));
  LEGS.forEach((L, i) => legOf(F, legPts(L, true), [R(1.6), R(1.25), R(.75)], glass, gtex(40 + i), 'legF' + i, true));
  // the pincers: a long arm and a great glass claw; open when it strikes, raised when it is hurt
  const claw = (arm, ch, fx, fy, g, far) => {
    const up = clawUp * (far ? 5 : 7), a0 = B(arm[0]), a1 = B([arm[1][0], arm[1][1] - up * .6]), c = B([ch[0], ch[1] - up]);
    F.add({ mat: glass, prof: 'round', bw: R(1.8), grp: g, shapes: chainC([a0, a1, c], [R(2.6), R(2.3), R(2.1)]), tex: far ? farTex(gtex(50)) : gtex(50) });
    const hf = frame(c[0], c[1], -.18 - clawUp * .5), o = open * .6;
    F.add({ mat: glass, prof: 'round', bw: R(1.1), grp: g + 'f', shapes: [poly([hf.P(R(fx * .5), R(-fy * .7)), hf.P(R(fx * 2), R(-fy * .75 - o * 3)), hf.P(R(fx * 2.1), R(-fy * .4 - o * 3)), hf.P(R(fx * .9), R(-fy * .05))]), poly([hf.P(R(fx * .5), R(fy * .7)), hf.P(R(fx * 1.95), R(fy * .6 + o * 4)), hf.P(R(fx * 1.9), R(fy * .25 + o * 4)), hf.P(R(fx * .9), R(fy * .1))])], tex: far ? DARK : gtex(52) });
    F.add({ mat: glass, prof: 'round', bw: R(2.2), grp: g + 'h', shapes: [rell(hf, 0, 0, R(fx), R(fy), 16)], tex: far ? farTex(gtex(51)) : gtex(51) });
  };
  claw([[42.6, 32.6], [47, 27.6]], [52.6, 26.4], 5.4, 3.8, 'clawF', true);
  // the tail: glass segments rising over the back, each a little smaller; the sting, or Cinderfang
  const tr = boss ? [3.8, 3.5, 3.3, 3.1, 2.9, 2.7, 2.6] : [3.2, 3, 2.8, 2.6, 2.4, 2.2];
  for (let i = 0; i < tail.length - 1; i++) F.add({ mat: glass, prof: 'round', bw: R(2.2), grp: 'tail' + i, shapes: [cap(tail[i], tail[i + 1], R(tr[i] * 1.08), R(tr[i + 1]))], tex: gtex(60 + i) });
  const tn = tail[tail.length - 1], tp = tail[tail.length - 2], d = [tn[0] - tp[0], tn[1] - tp[1]], dl = Math.hypot(d[0], d[1]) || 1, ang = Math.atan2(d[1], d[0]);
  if ((gT >= 1 || mat || P2) && !lie) F.add({ mat: glass, prof: 'ridge', hs: .9, grp: 'tailspikes', shapes: spikesC(tail.slice(1, -1).map((p, i) => { const q = tail[i + 2], n = [q[1] - p[1], -(q[0] - p[0])], nl = Math.hypot(n[0], n[1]) || 1; return [p[0], p[1], -n[0] / nl, -n[1] / nl, R(tr[i + 1] + 1.4 + gT * .4 + (P2 ? 1 : 0)), R(.9)]; })) });
  const blade = boss && held && !broken.includes('cinderfang') ? relicArt('cinderfang') : null;
  if (boss) {
    // the tip of the tail swells round the hilt it has held for three hundred years
    F.add({ mat: glass, prof: 'round', bw: R(2.4), grp: 'telson', shapes: [ell(tn, R(3.9), R(3.5))], tex: gtex(69) });
    if (blade) {
      const art = P3 ? phaseBlade(blade) : blade, fwd = ang + (pose === 'attack' ? .45 : .9);
      const m = drawItem(F, art, [tn[0] + Math.cos(ang) * R(1.4), tn[1] + Math.sin(ang) * R(1.4)], fwd + Math.PI / 4, .66 * k / 1.46, { center: cardPt(art, 15), drop: ['grip', 'pommel'] });
      A.blade = m(cardPt(art, 44));
    } else {
      // pried loose: the socket it grew round, still molten
      F.add({ mat: 'ember', prof: 'round', bw: R(1), grp: 'wound', noShadow: true, shapes: [circ([tn[0] + Math.cos(ang) * R(2.2), tn[1] + Math.sin(ang) * R(2.2)], R(1.8))] });
      F.add({ mat: glass, prof: 'ridge', grp: 'stumpspikes', shapes: spikesC([[tn[0], tn[1], Math.cos(ang - .6), Math.sin(ang - .6), R(3.2), R(1)], [tn[0], tn[1], Math.cos(ang + .7), Math.sin(ang + .7), R(2.8), R(.9)]]) });
    }
  } else {
    F.add({ mat: glass, prof: 'round', bw: R(2), grp: 'telson', shapes: [ell([tn[0] + d[0] / dl * R(2), tn[1] + d[1] / dl * R(2)], R(3.4), R(2.9))], tex: gtex(69) });
    const s0 = [tn[0] + d[0] / dl * R(4.6), tn[1] + d[1] / dl * R(4.6)], sd = [Math.cos(ang + 1.1), Math.sin(ang + 1.1)];
    F.add({ mat: gT >= 3 ? 'ember' : 'glass', prof: 'ridge', hs: .9, grp: 'sting', noShadow: gT >= 3, shapes: spikesC([[s0[0], s0[1], sd[0], sd[1], R(5), R(1.3)]]) });
  }
  // the body: the plates of the back over the underside, the head (prosoma) in front
  // (Kharzul's body is deeper, grown up over the same belly line)
  const SEGS = [[15.8, 32, 4.8, 5.4], [20.8, 31.4, 5, 5.9], [26, 31.2, 5.2, 6.1], [31.2, 31.6, 5, 5.8]].map(([x, y, rx, ry]) => (boss ? [x, y - ry * .22, rx * 1.06, ry * 1.22] : [x, y, rx, ry]));
  const bodyS = lie ? SEGS.map(([x, y, rx, ry]) => ell(T([x, y + 5.4]), R(rx), R(ry * .72))) : SEGS.map(([x, y, rx, ry]) => ell(B([x, y]), R(rx), R(ry)));
  F.add({ mat: glass, prof: 'round', bw: R(4.4), hs: .8, grp: 'body', shapes: bodyS, tex: gtex(70) });
  const head = lie ? T([39.4, 38]) : B([39.4, 32.2]);
  F.add({ mat: glass, prof: 'round', bw: R(3.6), hs: .8, grp: 'prosoma', shapes: [ell(boss && !lie ? [head[0], head[1] - R(.8)] : head, R(boss ? 7.9 : 7.4), R(lie ? 3.8 : boss ? 6 : 5.2))], tex: gtex(71) });
  // a light inside the glass (amber, then ember at the last Waking and in the Glass Storm)
  const bare = boss && (broken.includes('glass-carapace') || !held);
  if ((gT >= 2 || boss || mat) && !lie) F.add({ mat: veinM, prof: 'round', bw: R(.6), grp: 'veins', noShadow: true, shapes: chainC([B([13.6, 32.6]), B([18.4, 30.4]), B([23.4, 32.8]), B([28.6, 30.4]), B([33.6, 32.6]), B([39, 31])], R(bare || P3 ? .85 : .5)) });
  if (gT >= 1 && !boss && !lie) F.add({ mat: glass, prof: 'ridge', hs: .9, grp: 'backspikes', shapes: spikesC(SEGS.map(([x, y, rx, ry], i) => { const p = B([x, y - ry + .6]); return [p[0], p[1], -.3 + i * .15, -1, R(2 + gT * .8), R(1)]; })) });
  if (mat && !lie) { // the Matriarch has split her shell to moult: a glowing seam down her back, shed plates standing up
    F.add({ mat: 'amber', prof: 'round', bw: R(.6), grp: 'moult', noShadow: true, shapes: chainC([B([12.6, 27.4]), B([18.4, 25.6]), B([24.6, 25]), B([30.6, 25.6]), B([35.6, 27.4])], R(.8)) });
    F.add({ mat: glass, prof: 'bevel', bw: R(1), grp: 'shed', shapes: [poly([B([17, 26.2]), B([15.6, 20.2]), B([20.8, 22.6]), B([22, 25.8])]), poly([B([27, 25.4]), B([28.8, 18.8]), B([33.2, 23.4]), B([32.4, 25.8])])] });
  }
  // Kharzul: the Glass Carapace, clear plates over its back with light in the seams, until it is snapped off
  const shell = boss && held && !broken.includes('glass-carapace') ? relicArt('glass-carapace') : null;
  if (shell) { // (fallen, the plates lie flattened with the body)
    const sm = shell.p.seam || 'amber', Q = y0 => (px, py) => (lie ? T([px, y0 + 5.4 + (py - y0) * .72]) : B([px, py])), QH = (px, py) => (lie ? T([px, 38 + (py - 32.2) * .72]) : B([px, py]));
    F.add({ mat: sm, prof: 'flat', grp: 'seams', noShadow: true, shapes: SEGS.map(([x, y, rx, ry]) => ell(Q(y)(x, y - ry * .42), R(rx + .5), R(ry * .62 * (lie ? .72 : 1)))) });
    SEGS.forEach(([x, y, rx, ry], i) => { const q = Q(y); F.add({ mat: 'glass', prof: 'bevel', bw: R(1.5), grp: 'plate' + i, relic: true, shapes: [poly([q(x - rx - .2, y - ry * .05), q(x - rx * .7, y - ry - .6), q(x + rx * .2, y - ry - 1.1), q(x + rx + .6, y - ry * .45), q(x + rx * .55, y + ry * .02)])], tex: ({ x: px, y: py }) => (hash(px, py, 81 + i) < .07 ? 1 : 0) }); });
    F.add({ mat: 'glass', prof: 'bevel', bw: R(1.5), grp: 'plateH', relic: true, shapes: [poly([QH(33.8, 29.4), QH(37.4, 26.8), QH(43.6, 27.4), QH(46.4, 30.6), QH(40.4, 31)])] });
    A.shell = lie ? T([23.6, 30.4]) : B([23.6, 25]);
  } else if (bare && !lie) {
    // bare: the soft glass under the plates, veined with fire
    F.add({ mat: 'ember', prof: 'round', bw: R(.5), grp: 'rawveins', noShadow: true, shapes: chainC([B([13.6, 27.6]), B([18.8, 25.8]), B([24.2, 27.2]), B([29.4, 25.8]), B([34.6, 27.6])], R(.6)).concat(chainC([B([18.8, 25.8]), B([19.6, 31])], R(.5)), chainC([B([29.4, 25.8]), B([30.2, 31])], R(.5))) });
  }
  const eyes = lie ? T([44, 36.4]) : B([44, 29.6]);
  eyeOf(F, frame(eyes[0], eyes[1], 0), 0, 0, R(.9), R(.7), eyeM, false, 'eyeN');
  eyeOf(F, frame(eyes[0] - R(2.8), eyes[1] - R(.5), 0), 0, 0, R(.75), R(.6), eyeM, false, 'eyeF');
  LEGS.forEach((L, i) => legOf(F, legPts(L, false), [R(1.7), R(1.35), R(.8)], glass, gtex(90 + i), 'legN' + i));
  claw([[44.6, 34.4], [49.6, 29.6]], [55.4, 28.8], 6, 4.2, 'clawN', false);
  if (P3 && !lie) { // the Glass Storm: needles of glass hang in the air round it
    const N = [[8, 6], [44, 2], [58, 14], [70, 6], [22, -4], [84, 20]];
    F.add({ mat: 'glass', prof: 'ridge', hs: .9, grp: 'storm', noShadow: true, shapes: spikesC(N.map(([x, y], i) => [x + (i & 1 ? f : -f) * .6, y + 14 + f, .3 - i * .1, 1, 4.6, .9])) });
  }
  A.head = eyes; A.mouth = lie ? T([47, 38]) : B([47, 32.4]); A.center = lie ? T([26, 38]) : B([27, 32]);
  if (!boss) return;
  A.relics = [A.blade, A.shell].filter(Boolean); A.relic = A.relics[0] || null;
}
// Cinderfang in the Glass Storm: white-hot along the edge
const phaseBladeCache = new Map();
const phaseBlade = art => { if (!phaseBladeCache.has(art)) phaseBladeCache.set(art, Object.assign({}, art, { p: Object.assign({}, art.p, { edge: 'primal' }) })); return phaseBladeCache.get(art); };
const glassScorpion = (F, st) => scorpion(F, st, { k: 1, dx: 0, dy: 0 });
const glassMatriarch = (F, st) => scorpion(F, st, { k: 1.3, dx: -1.6, dy: 2.5, matriarch: true });
const kharzul = (F, st) => scorpion(F, st, { k: 1.46, dx: 1.3, dy: 27.3, boss: true });

/* ---- MIRAGE WISPS: a shimmer that walks on its own, looks like water until it bites (48x64, ground 61); the
   Wisp-Queen is taller, crowned with glass and holds the Mirage Glass at her heart (64x80, ground 77) ---- */
function wisp(F, st, S) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, k = S.k, q = !!S.queen, T = p => [S.dx + p[0] * k, S.dy + p[1] * k], R = r => r * k;
  const idle = !pose || pose === 'idle', lie = pose === 'ko';
  let bx = 0, by = idle ? f * 1.2 : 0, reach = 0, mouth = 0, eye = 'open', shift = 0;
  if (pose === 'attack') { bx = 4; by = -1; reach = 1; mouth = 1; } else if (pose === 'hurt') { bx = -3; by = 1; eye = 'shut'; shift = 1; } else if (lie) { eye = 'shut'; }
  const B = p => T([p[0] + bx, p[1] + by]);
  const body = gT >= 3 ? 'water' : 'haze', core = gT >= 2 ? 'frost' : 'water', eyeM = gT >= 2 ? 'frost' : 'dark';
  // the shimmer: bands of brighter water rippling across it, and a dither of holes where you see through
  const shim = ({ x, y }) => ({ dd: (Math.sin(y * .9 + x * .25 + (by * 2)) > .7 ? 1 : 0) - ((x + y) % 5 === 0 ? 1 : 0) });
  const cutsHurt = shift ? [0, 1, 2].map(i => { const y = B([0, 22 + i * 8])[1]; return poly([[0, y], [64, y], [64, y + 1.2 * k], [0, y + 1.2 * k]]); }) : null;
  if (lie) {
    // dissipating: a pool of shimmer on the ground, a last wisp rising off it
    F.add({ mat: body, prof: 'round', bw: R(2), grp: 'pool', shapes: [ell(T([24, 58.4]), R(12), R(2.8)), ell(T([27, 55.6]), R(6), R(2.4))], tex: shim });
    F.add({ mat: body, prof: 'round', bw: R(1), grp: 'rise', shapes: chainC([T([27, 54]), T([26, 49]), T([28, 45]), T([27, 41])], [R(2), R(1.4), R(.9), R(.4)]), tex: shim });
    F.add({ mat: 'pearl', prof: 'round', bw: R(1.4), grp: 'mask', shapes: [ell(T([22.4, 57.2]), R(3.4), R(1.8))] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [cap(T([20.6, 57]), T([21.8, 57]), R(.4)), cap(T([23, 57]), T([24.2, 57]), R(.4))] });
    A.head = T([22.4, 57]); A.mouth = A.head; A.center = T([24, 56]);
    return;
  }
  // a dithered shadow on the ground under the hovering wisp
  const sh = []; for (let i = 0; i < 9; i++) { const x = 16 + i * 2, y = 60.2 + (i & 1) * .8; sh.push(circ(T([x + bx * .5, y]), R(.55))); }
  F.add({ mat: 'dark', prof: 'flat', grp: 'shadow', noShadow: true, noOutline: true, shapes: sh });
  // gT 3: a mirage double a step behind it (it blinks)
  if (gT >= 3) F.add({ mat: 'haze', prof: 'round', bw: R(2), grp: 'double', shapes: [ell(B([17, 30]), R(7.6), R(8.6)), cap(B([17, 34]), B([16, 47]), R(7.4), R(2.4))], tex: ({ x, y }) => ((x + y) & 1 ? -2 : -1) });
  // trailing wisps below the body
  const tails = [[[21, 44], [18.6, 49], [20.6, 53], [18.4, 57]], [[25, 45], [26.4, 50], [24.8, 54], [26.6, 58]]].concat(gT >= 1 ? [[[23, 44], [22.6, 50], [23.4, 55.4]]] : []).concat(q ? [[[18, 43], [14.4, 49], [15.6, 55], [12.6, 60]], [[28, 43], [31.6, 49], [30.4, 55], [33.6, 60]]] : []);
  tails.forEach((L, i) => F.add({ mat: body, prof: 'round', bw: R(1.2), grp: 'tail' + i, shapes: chainC(L.map(p => B([p[0] + (idle ? Math.sin(f * 2 + i) * .8 : 0), p[1]])), [R(3.2), R(2.2), R(1.4), R(.6)].slice(0, L.length)), tex: shim, cuts: cutsHurt }));
  // arms of shimmer; the near one reaches when it strikes
  const armF = [[17.4, 31], [12.6, 34.4], [10.6, 39.4]], armN = reach ? [[30.4, 30], [37, 28.4], [44, 29.6]] : [[30.6, 31], [35.4, 34.4], [37.4, 39.4]];
  F.add({ mat: body, prof: 'round', bw: R(1.2), grp: 'armF', shapes: chainC(armF.map(B), [R(2.3), R(1.6), R(.7)]), tex: q2 => { const r = shim(q2); return { dd: r.dd - 1 }; } });
  // the body: a flame of water leaning back, a pale face-mask in it, a colder light at its heart
  F.add({ mat: body, prof: 'round', bw: R(4), hs: .7, grp: 'body', shapes: [ell(B([24, 27]), R(8.4), R(9)), cap(B([24, 31]), B([23, 44]), R(8.8), R(3.8)), poly([B([18.6, 22.6]), B([25.4, 8.6 - (q ? 3 : 0)]), B([29.8, 21.6])])], tex: shim, cuts: cutsHurt });
  F.add({ mat: core, prof: 'round', bw: R(1.6), grp: 'core', noShadow: true, shapes: [ell(B([24, 34.4]), R(2.8), R(3.4))] });
  F.add({ mat: 'pearl', prof: 'round', bw: R(2), grp: 'mask', shapes: [poly([B([19.4, 22.6]), B([28.6, 22.6]), B([28.2, 28.4]), B([24, 31.6]), B([19.8, 28.4])])] });
  const e1 = B([21.6, 25.6]), e2 = B([26.4, 25.6]);
  if (eye === 'shut') F.add({ mat: 'dark', prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [cap([e1[0] - R(1.2), e1[1]], [e1[0] + R(1.2), e1[1]], R(.45)), cap([e2[0] - R(1.2), e2[1]], [e2[0] + R(1.2), e2[1]], R(.45))] });
  else F.add({ mat: eyeM, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [ell(e1, R(1.3), R(1.8)), ell(e2, R(1.3), R(1.8))] });
  const mo = B([24, 29.4]);
  F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, noOutline: true, shapes: [mouth ? ell(mo, R(1.4), R(1.3)) : ell(mo, R(.9), R(.45))] });
  if (gT >= 2 || q) F.add({ mat: q ? 'glass' : 'rime', prof: 'ridge', hs: .9, grp: 'crown', shapes: spikesC((q ? [[20, 20.4, -.5, -1, 6, 1.2], [22.6, 19, -.2, -1, 8, 1.3], [25.4, 18.8, .15, -1, 9, 1.3], [28, 20, .5, -1, 6.4, 1.2]] : [[21, 20.6, -.4, -1, 3.4, .9], [24.4, 19.4, 0, -1, 4, 1], [27.4, 20.4, .4, -1, 3.2, .9]]).map(([x, y, dx, dy, l, w]) => { const p = B([x, y]); return [p[0], p[1], dx, dy, R(l), R(w)]; })) });
  F.add({ mat: body, prof: 'round', bw: R(1.2), grp: 'armN', shapes: chainC(armN.map(B), [R(2.4), R(1.7), R(.8)]), tex: shim });
  if (reach) F.add({ mat: 'frost', prof: 'round', bw: R(.6), grp: 'touch', noShadow: true, shapes: [circ(B([46.4, 29.6]), R(1.2)), circ(B([44.6, 27.2]), R(.7))] });
  // the Wisp-Queen holds the Mirage Glass at her heart; pried loose, a hollow of cold light is left
  if (q) {
    const art = relic && held ? relicArt(relic) : null, at = B([24, 36.4]);
    const m = art ? drawRelic(F, art, at, 0, .24 * k / 1.3, { center: [32, 43], drop: ['chain', 'bail'] }) : null;
    if (m) A.relic = m([32, 43]);
    else F.add({ mat: 'frost', prof: 'flat', grp: 'hollow', noShadow: true, shapes: [ell(at, R(2), R(2.4))] });
  }
  A.head = e2; A.mouth = mo; A.center = B([24, 32]);
}
const mirageWisp = (F, st) => wisp(F, st, { k: 1, dx: 0, dy: 0 });
const wispQueen = (F, st) => wisp(F, st, { k: 1.3, dx: .8, dy: -2.3, queen: true });
// wisps shed cold sparks, the queen a few more
const wispMotes = n => (t, a) => { const c = a.center || [24, 32], out = []; for (let k = 0; k < n; k++) { const ph = (t * .4 + k / n) % 1; out.push({ x: c[0] - 12 + hash(k, 3, 97) * 24 + Math.sin(t * 2 + k) * 2, y: c[1] + 10 - ph * 30, c: k & 1 ? [168, 236, 228] : [236, 252, 255], a: .8 * Math.sin(ph * Math.PI) }); } return out; };

/* ---- THE SAND WYRM: it swims in the sand under the Dust Trail; one scale in its hide (Wyrmscale) is the size of
   a door, and it glints (96x64, ground 61) ---- */
function sandWyrm(F, st) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, idle = !pose || pose === 'idle', lie = pose === 'ko';
  const hide = 'wyrmHide', eyeM = gT >= 2 ? 'eyeRed' : 'amber';
  let P = [[36, 58], [31, 47], [32, 36], [38, 27], [48, 21], [59, 19], [68, 22]], H = [74, 27], ha = .5, maw = .35, eye = 'open';
  if (idle) P = P.map(([x, y], i) => [x + Math.sin(f * 1.6 + i * .7) * i * .12, y + f * i * .12]);
  if (pose === 'attack') { P = [[37, 58], [34, 47], [37, 37], [45, 30], [56, 27], [66, 29], [74, 34]]; H = [80, 40]; ha = .85; maw = 1; }
  else if (pose === 'hurt') { P = [[35, 58], [29, 47], [28, 35], [31, 24], [39, 16], [49, 12], [58, 13]]; H = [64, 16]; ha = -.2; maw = .6; eye = 'shut'; }
  else if (lie) { P = [[30, 58], [38, 56], [48, 55], [58, 56], [67, 57], [74, 57.4], [80, 57.4]]; H = [85, 55.6]; ha = .15; maw = .25; eye = 'shut'; }
  const rs = [10, 9.6, 9, 8.4, 7.8, 7.2, 6.8];
  const ringTex = ({ x, y }) => (vnoise(x * .3, y * .3, 43) > .74 ? { m: 'sand', dd: 1 } : hash(x, y, 44) < .06 ? -1 : 0);
  // the mound of sand it rises out of (it pours off its hide)
  F.add({ mat: 'sand', prof: 'round', bw: 3, hs: .6, grp: 'mound', shapes: [ell([40, 59.6], 26, 5), ell([30, 57.4], 12, 5.4), ell([52, 58], 12, 4)], tex: ({ x, y }) => ((x * 3 + y * 5) % 11 === 0 ? -1 : hash(x, y, 45) < .08 ? 1 : 0) });
  // the body from the sand up to the head: a ring of hide per segment, each a short barrel (so the rings read), the
  // belly paler along the inside of the arch
  const nrm = i => { const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
  for (let i = 0; i < P.length - 1; i++) F.add({ mat: hide, prof: 'round', bw: rs[i] * .5, hs: .8, grp: 'seg' + i, shapes: [cap(P[i], P[i + 1], rs[i], rs[i + 1] * .96)], tex: ringTex, cuts: i === 0 && !lie ? [poly([[0, 58.6], [96, 58.6], [96, 64], [0, 64]])] : null });
  if (!lie) F.add({ mat: 'sand', prof: 'round', bw: 1, hs: .5, noOutline: true, grp: 'belly', shapes: P.slice(1, -1).map((p, k) => { const i = k + 1, [nx, ny] = nrm(i), q = P[i + 1], [mx, my] = nrm(i + 1); return cap([p[0] - nx * rs[i] * .72, p[1] - ny * rs[i] * .72], [q[0] - mx * rs[i + 1] * .72, q[1] - my * rs[i + 1] * .72], rs[i] * .24, rs[i + 1] * .2); }), tex: ({ x, y }) => ((x * 2 + y * 3) % 5 === 0 ? -1 : 0) });
  // ridge plates along its back, glassed spines from the last Waking
  const top = P.map((p, i) => { const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dy / l * rs[i] * .92, p[1] - dx / l * rs[i] * .92, dy / l, -dx / l]; });
  F.add({ mat: gT >= 3 ? 'glass' : 'claw', prof: 'ridge', hs: .9, grp: 'ridge', shapes: spikesC(top.slice(1).map(([x, y, nx, ny]) => [x, y, nx, ny, 3.2 + gT * 1.1, 1.8])) });
  // sand pouring off it
  if (!lie) F.add({ mat: 'sand', prof: 'round', bw: .8, grp: 'pour', noShadow: true, shapes: [cap([P[2][0] - 8, P[2][1] + 2], [P[2][0] - 8.6, P[2][1] + 9 + f], .8, .5), cap([P[1][0] - 9.6, P[1][1] + 1], [P[1][0] - 10, P[1][1] + 7], .7, .4)] });
  // Wyrmscale, grown into its hide at the shoulder (a raw patch once it is pried loose)
  const at = [P[3][0] + 1, P[3][1] + 2], art = relic && held ? relicArt(relic) : null;
  const m = art ? drawRelic(F, art, at, -.35, .3, { center: [32, 30] }) : null;
  if (m) A.relic = m([32, 20]);
  else F.add({ mat: 'flesh', prof: 'round', bw: 1.6, grp: 'raw', shapes: [ell(at, 5.4, 4)], tex: ({ x, y }) => ((x + y) % 3 === 0 ? -1 : 0) });
  // the head: a blunt wedge with a round maw ringed in glass teeth
  const hf = frame(H[0], H[1], ha);
  F.add({ mat: hide, prof: 'round', bw: 4, grp: 'head', shapes: [rell(hf, 0, 0, 10.4, 8.4), hf.cap(1, 0, 8.6, 0, 8.2, 7.6)], tex: ringTex });
  F.add({ mat: 'wyrmHide', prof: 'round', bw: 1.4, grp: 'lip', shapes: [rell(frame(hf.P(9.6, .4)[0], hf.P(9.6, .4)[1], ha), 0, 0, 2.6, 7.4, 16)] });
  const mc = hf.P(10.2, .6), mr = 3.8 + maw * 2.6;
  F.add({ mat: 'dark', prof: 'round', bw: 2, grp: 'maw', shapes: [rell(frame(mc[0], mc[1], ha), 0, 0, mr * .7, mr, 16)] });
  if (maw > .5) F.add({ mat: 'flesh', prof: 'round', bw: 1, grp: 'throat', shapes: [rell(frame(mc[0], mc[1], ha), .4, 0, mr * .4, mr * .6, 12)] });
  F.add({ mat: gT >= 3 ? 'glass' : 'bone', prof: 'ridge', grp: 'teeth', shapes: spikesC(Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2, c = Math.cos(a) * mr * .7, s = Math.sin(a) * mr, p = frame(mc[0], mc[1], ha).P(c, s); return [p[0], p[1], mc[0] - p[0], mc[1] - p[1], 2.2 + maw, .8]; })) });
  for (const [t, s, r] of [[1.4, -5, 1], [-2, -5.6, .85], [-5, -5, .75]]) eyeOf(F, hf, t, s, r, r * .8, eyeM, eye === 'shut', 'eye' + t);
  A.head = hf.P(-2, -5.6); A.mouth = mc; A.center = lie ? [55, 55] : P[3];
}

/* ---- THE ASHEN WARDEN: the last Warden of Scorchgate, an armoured dead man of ash still guarding a vault of it.
   The Ashen Aegis on its arm and the Cinder Crown on its brow are all that did not burn; three phases (96x96,
   ground 93) ---- */
const ASH_BLADE = { r: 'sword', p: { gripEnd: 15, guardT: 3.6, bladeW: 4.4, bladeL: 54, tipL: 9, taper: .86, blade: 'char', bladeTex: TX2.cracks(77, 'ember', .03), fuller: 'ember', fullerR: .9, guard: 'bar', guardMat: 'bronze', guardW: 10.5, guardR: 2, grip: 'leatherDark', gripR: 2.2, pommel: 'bronze', pommelR: 3.4 } };
// the Last Watch: the Crown burns white
const whiteCrown = new Map();
const crownOfLastWatch = art => { if (!whiteCrown.has(art)) whiteCrown.set(art, Object.assign({}, art, { p: Object.assign({}, art.p, { embers: 'primal', gem: 'primal' }) })); return whiteCrown.get(art); };
function ashenWarden(F, st) {
  const { pose, f, phase, broken, held } = st, A = st.anchors, P2 = phase >= 2, P3 = phase >= 3, idle = !pose || pose === 'idle';
  const aegisArt = relicArt('ashen-aegis'), crownArt = relicArt('cinder-crown');
  const aegisOn = held && !broken.includes('ashen-aegis') && !!aegisArt, crownOn = held && !broken.includes('cinder-crown') && !!crownArt;
  let J = { head: [56, 20], shF: [43, 33], shN: [65, 33.5], chest: [54, 44.5], waist: [53, 57.5], elF: [37, 41], haF: [35, 31], elN: [70.5, 45.5], haN: [68.6, 55], hipF: [47, 62.5], knF: [44.6, 76.4], anF: [43.6, 89.6], hipN: [59, 62.5], knN: [62, 76.4], anN: [63, 89.6] };
  let swordA = -1.95, swordFront = false, eye = 'open', kneel = false, tilt = 0, shieldA = -.06;
  if (pose === 'attack') { J = Object.assign(J, { head: [59, 21], shF: [45, 33.6], shN: [67, 34], chest: [56, 45], elF: [53, 37], haF: [69, 37], elN: [74, 45], haN: [74, 54] }); swordA = .45; swordFront = true; tilt = .08; }
  else if (pose === 'hurt') { J = Object.assign(J, { head: [51, 19.4], shF: [39, 32], shN: [61, 32.6], chest: [50, 44], elF: [33, 42], haF: [28.6, 35], elN: [67, 43.6], haN: [66.6, 51.4] }); swordA = -2.5; eye = 'shut'; tilt = -.2; shieldA = -.28; }
  else if (pose === 'ko') {
    kneel = true; eye = 'shut'; tilt = .42; swordA = .04; shieldA = 1.36; swordFront = true;
    J = { head: [62, 55], shF: [42, 50], shN: [62, 51], chest: [52, 60], waist: [48, 71], elF: [36, 64], haF: [30, 82], elN: [68, 64], haN: [72, 76], hipF: [42, 76], knF: [36, 88.6], anF: [22, 90.6], hipN: [52, 77], knN: [60, 89], anN: [46, 91] };
  }
  if (P3 && !kneel) for (const [k, d] of [['head', [3, 5]], ['shF', [1.5, 3]], ['shN', [1.5, 3]], ['chest', [1, 2]], ['elF', [1, 2]], ['elN', [1, 2]], ['haN', [1, 2]]]) J[k] = [J[k][0] + d[0], J[k][1] + d[1]];
  if (idle) for (const k of ['head', 'shF', 'shN', 'chest', 'elF', 'elN', 'haF', 'haN']) J[k] = [J[k][0], J[k][1] + f * .7];
  const C = J.chest, Wst = J.waist;
  // charred plate with its bronze rim; the fire shows through its cracks, more of it each phase
  const plateTex = seed => ({ x, y, d }) => {
    if (d < 1.05) return { m: 'bronze', dd: -1 };
    if (Math.abs(vnoise(x * .3, y * .3, seed) - .5) < (P3 ? .07 : P2 ? .05 : .03)) return { m: 'ember', dd: 0 };
    return vnoise(x * .5, y * .5, seed + 1) > .78 ? { m: 'ash', dd: 0 } : hash(x, y, seed) < .06 ? -1 : 0;
  };
  const plate = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: 'char', prof: 'round', bw: 3, grp: g, shapes, tex: far ? farTex(plateTex(seed)) : plateTex(seed) }, o));
  const ashen = (shapes, g, far, o = {}) => F.add(Object.assign({ mat: 'ash', prof: 'round', bw: 2.4, grp: g, shapes, tex: far ? DARK : ({ x, y }) => (hash(x, y, 71) < .08 ? -1 : 0) }, o));
  const sword = () => { const at = J.haF, a = swordA; drawItem(F, ASH_BLADE, at, a + Math.PI / 4, .5, { center: cardPt(ASH_BLADE, 9), plain: true }); A.weaponTip = [at[0] + Math.cos(a) * 30, at[1] + Math.sin(a) * 30]; };
  // behind: a cloak of ash, burning at the hem from the second phase
  if (!kneel) {
    const hem = 86 + f * .4;
    F.add({ mat: 'ash', prof: 'round', bw: 3, grp: 'cloak', shapes: [poly([[J.shF[0] - 2, J.shF[1] - 2.4], [J.shN[0] + 1, J.shN[1] - 2.4], [J.shN[0] + 5, 58], [J.shN[0] + 3, hem - 2], [C[0] + 4, hem], [J.shF[0] - 9, hem - 1], [J.shF[0] - 9.4, 58]])], tex: ({ x, y }) => (P2 && y > hem - 4 && hash(x, y, 7) < .3 ? { m: 'ember', dd: 0 } : (x + y * 2) % 7 === 0 ? -2 : -1), cuts: Array.from({ length: 6 }, (_, i) => { const x = J.shF[0] - 7 + i * 4.6, h = 2 + hash(i, 3, 73) * 4; return poly([[x - 1.6, hem + 2], [x, hem - h], [x + 1.6, hem + 2]]); }) });
  }
  if (!swordFront) sword();
  // far arm and leg
  plate([cap(J.shF, J.elF, 4.4, 4)], 'armF', 3, true); plate([circ(J.elF, 3.2)], 'elbowF', 4, true);
  plate([cap(J.elF, J.haF, 3.8, 3.2)], 'foreF', 5, true); plate([circ(J.haF, 3.4)], 'handF', 6, true);
  plate([cap(J.hipF, J.knF, 5.4, 4.6)], 'thighF', 8, true); plate([circ(J.knF, 3.8)], 'kneeF', 9, true);
  plate([cap(J.knF, J.anF, 4.6, 3.8)], 'shinF', 10, true); plate([poly([[J.anF[0] - 4, J.anF[1] - 1.4], [J.anF[0] + 6.4, J.anF[1] - 1], [J.anF[0] + 7.6, J.anF[1] + 3.2], [J.anF[0] - 4.4, J.anF[1] + 3.2]])], 'footF', 11, true);
  // the body: ash under the plate where it has burned through, the cuirass with Scorchgate's gate on it, faulds
  ashen([ell(C, 13.4, 13), cap(C, Wst, 11, 9.4)], 'core');
  plate([poly([[C[0] - 12.4, C[1] - 10.6], [C[0] - 2.6, C[1] - 12.8], [C[0] + 4, C[1] - 12.8], [C[0] + 13, C[1] - 10], [C[0] + 14.4, C[1] - 1.6], [C[0] + 10.8, Wst[1] - 1.4], [Wst[0] + 1, Wst[1] + 1.4], [C[0] - 11, Wst[1] - 1.4], [C[0] - 14, C[1] - 2]])], 'cuirass', 12, false, { bw: 6, hs: .8, cuts: P3 ? [ell([C[0] - 6, C[1] + 4], 3.8, 2.6), ell([C[0] + 7.4, C[1] - 5.4], 2.8, 2)] : null });
  if (P3) F.add({ mat: 'ember', prof: 'round', bw: 1, grp: 'burn', noShadow: true, shapes: [ell([C[0] - 6, C[1] + 4], 3.8, 2.6), ell([C[0] + 7.4, C[1] - 5.4], 2.8, 2)] });
  F.add({ mat: 'bronze', prof: 'bevel', bw: 1, grp: 'gate', shapes: [poly([[C[0] - 5.6, C[1] + 3.6], [C[0] - 5.6, C[1] - 4.4], [C[0] - 3.6, C[1] - 4.4], [C[0] - 3.6, C[1] - 2.6], [C[0] + 3.6, C[1] - 2.6], [C[0] + 3.6, C[1] - 4.4], [C[0] + 5.6, C[1] - 4.4], [C[0] + 5.6, C[1] + 3.6]])], cuts: [poly([[C[0] - 2.2, C[1] + 3.8], [C[0] - 2.2, C[1] - .4], [C[0], C[1] - 1.8], [C[0] + 2.2, C[1] - .4], [C[0] + 2.2, C[1] + 3.8]])] });
  F.add({ mat: 'ember', prof: 'flat', grp: 'gatefire', noShadow: true, shapes: [poly([[C[0] - 1.6, C[1] + 3.6], [C[0] - 1.4, C[1] + .4], [C[0], C[1] - .8], [C[0] + 1.4, C[1] + .4], [C[0] + 1.6, C[1] + 3.6]])] });
  for (let k = 0; k < 3; k++) { const y0 = Wst[1] + .6 + k * 3.2, w0 = 11 + k * 1.3; plate([poly([[Wst[0] - w0, y0], [Wst[0] + w0, y0], [Wst[0] + w0 + .8, y0 + 3.4], [Wst[0] - w0 - .8, y0 + 3.4]])], 'fauld' + k, 13 + k, false, { bw: 1.6 }); }
  plate([cap([C[0] - 6, C[1] - 12], [C[0] + 7, C[1] - 12], 3)], 'gorget', 16, false, { bw: 2 });
  // near leg
  plate([cap(J.hipN, J.knN, 5.8, 4.8)], 'thighN', 17); plate([circ(J.knN, 4)], 'kneeN', 18);
  plate([cap(J.knN, J.anN, 4.8, 4)], 'shinN', 19); plate([poly([[J.anN[0] - 4, J.anN[1] - 1.4], [J.anN[0] + 6.8, J.anN[1] - 1], [J.anN[0] + 8, J.anN[1] + 3.2], [J.anN[0] - 4.4, J.anN[1] + 3.2]])], 'footN', 20);
  // the head: a helm with a slit visor and the fire behind it; the Cinder Crown on its brow
  const hf = frame(J.head[0], J.head[1], tilt);
  ashen([cap([C[0] + 3, C[1] - 11], hf.P(-1.4, 5), 4.2, 3.6)], 'neck');
  plate([rell(hf, 0, -.4, 7.4, 8.6)], 'helm', 21, false, { bw: 4 });
  F.add({ mat: 'dark', prof: 'flat', grp: 'visor', noShadow: true, shapes: [hf.cap(-4.4, -.4, 6.4, -.4, .9), hf.cap(2.8, -.4, 2.8, 5.4, .8)] });
  const eyeM = P3 ? 'primal' : 'ember';
  if (eye !== 'shut') F.add({ mat: eyeM, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [hf.ell(-1.4, -.4, 1.5, .6), hf.ell(4.8, -.4, 1.3, .55)] });
  F.add({ mat: 'bronze', prof: 'round', bw: .8, grp: 'helmrim', shapes: [hf.cap(-7.2, -2.6, 7.2, -2.6, .8)] });
  if (crownOn) {
    const art = P3 ? crownOfLastWatch(crownArt) : crownArt, m = drawItem(F, art, hf.P(-.4, -6.2), tilt, .3, { center: [32, 40] });
    A.crown = m([32, 30]);
  } else F.add({ mat: 'char', prof: 'round', bw: .8, grp: 'scorch', shapes: [hf.cap(-6.6, -6.4, 6.6, -6.4, 1)], tex: ({ x, y }) => (hash(x, y, 5) < .3 ? { m: 'ember', dd: -1 } : -1) });
  // the near arm, and the Ashen Aegis over it (a bare arm of ash and a torn strap once it is gone)
  plate([cap(J.shN, J.elN, 4.8, 4.2)], 'armN', 22); plate([circ(J.elN, 3.4)], 'elbowN', 23);
  if (aegisOn) {
    ashen([cap(J.elN, J.haN, 3.6, 3.2)], 'foreN');
    const m = drawItem(F, aegisArt, [J.haN[0] + 1, J.haN[1] - 1.6], shieldA, .5, { center: [32, 34] });
    A.aegis = m([32, 13.5]);
  } else {
    ashen([cap(J.elN, J.haN, 3.4, 2.8), circ(J.haN, 2.8)], 'foreN');
    F.add({ mat: 'leatherDark', prof: 'round', bw: .8, grp: 'strap', shapes: [cap([J.haN[0] - 3, J.haN[1] - 4], [J.haN[0] + 1.6, J.haN[1] + 3.4], .9), cap([J.haN[0] + 1.6, J.haN[1] + 3.4], [J.haN[0] + 3.4, J.haN[1] + 7], .8, .5)] });
  }
  plate([ell(J.shN, 8.6, 6.8)], 'pdN', 24, false, { bw: 4.4 }); plate([ell([J.shN[0], J.shN[1] + 5], 7.6, 3)], 'pdNl', 25, false, { bw: 2 });
  if (P3 && !kneel) F.add({ mat: 'ember', prof: 'round', bw: 1.2, grp: 'flames', noShadow: true, shapes: spikesC([[J.shN[0] - 4, J.shN[1] - 5, -.2, -1, 7 + f, 2], [J.shN[0] + 2, J.shN[1] - 5.6, .15, -1, 9 - f, 2.2], [J.shF[0] - 1, J.shF[1] - 4.6, -.1, -1, 6, 1.8], [J.shF[0] + 4, J.shF[1] - 5, .1, -1, 7.4 + f, 1.9]]) });
  if (swordFront) sword();
  A.head = hf.P(1.4, -.4); A.mouth = hf.P(3, 4); A.center = kneel ? [50, 64] : C;
  A.relics = [A.aegis, A.crown].filter(Boolean); A.relic = A.relics[0] || null;
}
// ash falling like snow, embers rising: more of both each phase
const ashMotes = (base, per) => (t, a, gT, phase = 1) => {
  const c = a.center || [32, 32], out = [], n = base + per * (phase - 1);
  for (let k = 0; k < n; k++) {
    const ember = k % 3 === 0, ph = (t * (ember ? .35 : .18) + hash(k, 2, 83)) % 1;
    out.push({ x: c[0] - 26 + hash(k, 1, 83) * 52 + Math.sin(t * 1.3 + k) * 2, y: ember ? c[1] + 24 - ph * 56 : c[1] - 34 + ph * 60, c: ember ? [255, 150, 60] : [170, 162, 154], a: (ember ? .9 : .7) * Math.sin(ph * Math.PI) });
  }
  return out;
};

/* ---------- registry of the Sunscorch beasts ---------- */
Object.assign(FOE_ART, {
  'sand-skink': { name: 'Sand-Skink', kind: 'beast', w: 48, h: 32, foot: [24, 30], defaultTier: 'rabble', build: sandSkink },
  'glass-scorpion': { name: 'Glass Scorpion', kind: 'beast', w: 64, h: 48, foot: [32, 45], defaultTier: 'veteran', build: glassScorpion },
  'glass-matriarch': { name: 'The Glass Matriarch', kind: 'beast', w: 80, h: 64, foot: [40, 61], defaultTier: 'relic-bearer', build: glassMatriarch },
  'mirage-wisp': { name: 'Mirage Wisp', kind: 'beast', w: 48, h: 64, foot: [24, 61], defaultTier: 'veteran', build: mirageWisp, motes: wispMotes(4) },
  'wisp-queen': { name: 'The Wisp-Queen', kind: 'beast', w: 64, h: 80, foot: [32, 77], defaultTier: 'relic-bearer', relic: 'mirage-glass', build: wispQueen, motes: wispMotes(8) },
  'sand-wyrm': { name: 'The Sand Wyrm', kind: 'beast', w: 96, h: 64, foot: [48, 61], defaultTier: 'relic-bearer', relic: 'wyrmscale', build: sandWyrm },
  kharzul: { name: 'Kharzul the Glass Scorpion', kind: 'beast', w: 96, h: 96, foot: [48, 93], defaultTier: 'champion', relic: 'cinderfang', relics: ['cinderfang', 'glass-carapace'], phases: 3, build: kharzul },
  'ashen-warden': { name: 'The Ashen Warden', kind: 'beast', w: 96, h: 96, foot: [48, 93], defaultTier: 'champion', relic: 'ashen-aegis', relics: ['ashen-aegis', 'cinder-crown'], phases: 3, build: ashenWarden, motes: ashMotes(8, 6) },
});

/* ---------- the Sunscorch humanoids: the same rig, their own kits ---------- */
const scim = (blade, guardMat, o = {}) => A('sword', Object.assign({ shape: 'scimitar', curve: 5, gripEnd: 12, guardT: 2.6, bladeW: 3.2, bladeL: 40, tipL: 7, taper: .9, blade, guard: 'hook', guardMat, guardW: 6, grip: 'leather', gripR: 2, pommel: guardMat, pommelR: 2.6 }, o));
const scimitars = [
  scim('iron', 'iron', { bladeTex: TX.rust(21) }),
  scim('steel', 'bronze', { grip: 'clothIndigo' }),
  scim('steel', 'brass', { bladeL: 42, grip: 'clothIndigo', gem: 'topaz' }),
  scim('steel', 'gold', { bladeL: 46, bladeW: 3.6, curve: 6, fuller: 'storm', grip: 'clothIndigo', gem: 'stormglass' }),
];
const hookKnife = A('dagger', { shape: 'fang', curve: 5, gripEnd: 12, guardT: 2, bladeL: 30, bladeW: 4.4, blade: 'iron', bladeTex: TX.rust(33), guard: 'none', grip: 'rags', gripR: 2, pommel: 'iron', pommelR: 2.4 });
const handAxe = A('axe', { headT: 44, bladeLo: 9, bladeHi: 6, bladeW: 12, bulge: 2, back: 'poll', haft: 'wood', haftR: 2, blade: 'iron', bladeTex: TX.rust(35), socket: 'iron' });
const wreckSpear = (head, o = {}) => A('spear', Object.assign({ headT: 58, headL: 15, headW: 4.2, haft: 'wood', haftR: 1.7, butt: 'iron', wrap: 'rags', wrapA: 24, wrapB: 34, head, socket: 'iron' }, o));
const pick = (blade, socket, o = {}) => A('axe', Object.assign({ headT: 46, bladeLo: 2.2, bladeHi: 2.2, bladeW: 13, bulge: -1.5, back: 'spike', spikeL: 10, haft: 'wood', haftR: 2.1, wrap: 'leather', wrapEnd: 16, blade, socket }, o));
const crowbar = A('axe', { headT: 50, bladeLo: 1.4, bladeHi: 1.4, bladeW: 5.5, bulge: 0, back: 'none', haft: 'iron', haftR: 1.5, wrap: 'leatherDark', wrapEnd: 14, blade: 'iron', socket: 'iron' });
const wightSpear = A('spear', { headT: 60, headL: 17, headW: 4.6, haft: 'char', haftR: 1.8, butt: 'bronze', head: 'iron', headTex: TX.rust(41), socket: 'bronze', wrap: 'cloakRed', wrapA: 26, wrapB: 34 });
const wightSword = (o = {}) => A('sword', Object.assign({ gripEnd: 15, guardT: 3.4, bladeW: 3.6, bladeL: 48, tipL: 9, taper: .88, blade: 'char', bladeTex: TX2.cracks(43, 'ember', .03), fuller: 'ember', fullerR: .8, guard: 'bar', guardMat: 'bronze', guardW: 9, guardR: 1.8, grip: 'leatherDark', gripR: 2.1, pommel: 'bronze', pommelR: 3 }, o));
const ashBuckler = A('shield', { r: 21, face: 'char', rim: 'bronze', boss: 'bronze', bossR: 6.4 });
const gateShield = A('shield', { shape: 'heater', face: 'cloakRed', paint: 'chevron', paint2: 'char', rim: 'bronze', boss: 'bronze', rivets: 'bronze', gem: 'ember' });
const sandBoots = A('boots', { mat: 'sand', trim: 'leather', fold: true });
// a head-wrap's long tail flowing behind (raiders), and a saffron scarf's (Rasa)
function wrapTail(c, mat, len = 1) {
  const { F, X, j } = c, [hx0, hy0] = j.hc;
  F.add({ X, mat, prof: 'round', bw: 1.2, grp: 'wraptail', shapes: capsX(X, [[hx0 + 5.4, hy0 - 1.6], [hx0 + 9.4, hy0 + 2.4 * len], [hx0 + 11.6, hy0 + 7.4 * len], [hx0 + 10.6, hy0 + 12 * len]], [1.7, 1.4, 1.1, .6]), tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) });
}
// the salvage sack a scavenger drags about, on a strap; dune-glass goggles from the second Waking
function scavengerX(c) {
  const { F, X, j, b, H, gT } = c, [hx0, hy0] = j.hc;
  strap(c, 'leatherDark', .7);
  under(F, { X, mat: H.sack || 'rags', prof: 'round', bw: 3, grp: 'sack', shapes: [X.ell(j.cx + b.shW + 2 + j.lean, j.sh + 6.4, 4.6, 6), X.cap(j.cx + b.shW + 1.4 + j.lean, j.sh + 1, j.cx + b.shW + 2.6 + j.lean, j.sh - 2.6, 1.6, 1)], tex: ({ x, y }) => ((x * 2 + y) % 6 === 0 ? -1 : 0) }, ['torso']);
  if (gT >= 2 && !c.lie) {
    F.add({ X, mat: 'leatherDark', prof: 'round', bw: .6, grp: 'gogglestrap', shapes: [X.cap(hx0 - 7, hy0 - .4, hx0 + 7, hy0 - .4, .6)] });
    F.add({ X, mat: 'glass', prof: 'round', bw: 1, grp: 'goggles', shapes: [X.circ(hx0 - 3.4, hy0 + .2, 1.7), X.circ(hx0 + 3, hy0 + .2, 1.7)] });
  }
}
const raiderX = c => wrapTail(c, c.H.wrapTail || 'clothIndigo', 1);
function rasaX(c) { wrapTail(c, 'clothSaffron', 1.3); raiderX(c); }
// the Raider-King: a necklace of glass teeth taken off the dune-wyrms
function gnashX(c) {
  const { F, X, j } = c, y = j.sh + 2.6;
  F.add({ X, mat: c.gT >= 3 ? 'glass' : 'bone', prof: 'ridge', hs: .9, grp: 'teeth', shapes: [-3.4, -1.2, 1.2, 3.4].map(dx => X.poly([[j.cx + dx - .8 + j.lean, y], [j.cx + dx + j.lean, y + 2.8], [j.cx + dx + .8 + j.lean, y]])) });
}
// ash-wights: a torn cloak and tabard, burnt at the hem
function wightX(c) { tatter(c); tatter(c, 'tabard', 4); }
// the Ash-Captain: a jailer's key ring at his belt with no key on it (the Scorchgate Key)
function captainX(c) {
  wightX(c);
  const { F, X, j, b } = c;
  if (!(c.relic && c.held) || c.lie) return;
  const x = j.cx - b.waW - 1.4, y = j.wa + 3.4;
  F.add({ X, mat: 'blackiron', prof: 'round', bw: .8, grp: 'keyring', relic: true, shapes: [X.circ(x, y, 2.6)], cuts: [X.circ(x, y, 1.5)] });
  F.add({ X, mat: 'ember', prof: 'flat', grp: 'keyglow', noShadow: true, relic: true, shapes: [X.circ(x + .2, y - 2.3, .6)] });
  c.anchors.relic = X.P(x, y + 2.4);
}
// Foreman Brask: the Sunstone Lantern held up in the off hand, drawn from its own recipe (like Hollis's)
function braskX(c) { hollisX(c); }
// the Quartermaster: a crate strapped to his back, and a ring of stolen keys at his belt
function quartermasterX(c) {
  const { F, X, j, b } = c;
  under(F, { X, mat: 'wood', prof: 'bevel', bw: 1.2, grp: 'crate', shapes: [X.poly([[j.cx + 1 + j.lean, j.sh - 3], [j.cx + b.shW + 5 + j.lean, j.sh - 3.4], [j.cx + b.shW + 5.4, j.wa + 3], [j.cx + 1.4, j.wa + 3]])], tex: ({ y }) => (y % 3 === 0 ? -1.5 : 0) }, ['torso']);
  strap(c, 'leather', .8);
  F.add({ X, mat: 'bronze', prof: 'round', bw: .6, grp: 'keys', noShadow: true, shapes: [X.circ(j.cx - b.waW - .6, j.wa + 2.2, .8), X.cap(j.cx - b.waW - .6, j.wa + 2.8, j.cx - b.waW - 1.2, j.wa + 4.8, .45), X.cap(j.cx - b.waW, j.wa + 2.8, j.cx - b.waW + .4, j.wa + 5, .45)] });
}
// Vell Saltglass: glass goggles pushed up on the brow, a salt-white neckerchief
function vellX(c) {
  const { F, X, j, H } = c, [hx0, hy0] = j.hc;
  F.add({ X, mat: H.neckerchief || 'clothWhite', prof: 'round', bw: 1.4, grp: 'kerchief', shapes: [X.poly([[hx0 - 4.4, hy0 + 5.4], [hx0 + 4.4, hy0 + 5.4], [hx0 + 3.2, hy0 + 8], [hx0, hy0 + 9], [hx0 - 3.2, hy0 + 8]])] });
  if (c.lie) return;
  F.add({ X, mat: 'leatherDark', prof: 'round', bw: .6, grp: 'gogglestrap', shapes: [X.cap(hx0 - 7.2, hy0 - 3.6, hx0 + 7.2, hy0 - 3.6, .6)] });
  F.add({ X, mat: 'glass', prof: 'round', bw: 1, grp: 'goggles', shapes: [X.circ(hx0 - 3.2, hy0 - 4.4, 1.6), X.circ(hx0 + 2.8, hy0 - 4.4, 1.6)] });
}
const shortBow = bowT(56, 'wood', 'leatherDark', { bindings: [.27, .73], bindMat: 'leatherDark' });
const indigoHood = (o = {}) => A('hood', Object.assign({ look: 'hood', mat: 'clothIndigo', tip: 0 }, o));
const wightMail = (o = {}) => A('mail', Object.assign({ mat: 'blackiron', trim: 'bronze', belt: 'leatherDark' }, o));
const wightH = { build: 'human', skin: 'ash', hairMat: 'hairBlack', hair: 'none', eye: '#101010', mask: 'ash', maskEyes: 'ember', tunic: 'char', pants: 'char', boots: 'char', gloves: 'ash', tabard: 'cloakRed', emblem: 'bronze', buckle: 'bronze' };
Object.assign(FOE_ART, {
  scavenger: H3('Dune Scavenger', 'rabble', {
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairBrown', hair: 'none', eye: '#2a2030', scarf: 'robe', tunic: 'rags', pants: 'robe', boots: 'rags', gloves: 'rags', buckle: 'iron', sack: 'rags' },
    gear: [
      { weapon: hookKnife, head: A('hood', { look: 'hood', mat: 'robe', tip: 0 }) },
      { weapon: handAxe, head: A('hood', { look: 'hood', mat: 'robe', tip: 0, trim: 'leather' }), body: A('leather', { mat: 'leather', shirt: 'robe', belt: 'leatherDark' }), feet: sandBoots },
      { weapon: wreckSpear('iron'), head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'leather' }), body: A('leather', { mat: 'leather', shirt: 'robe', studs: 'iron', belt: 'leatherDark' }), hands: A('gloves', { mat: 'leather' }), feet: sandBoots, H: { sack: 'leather' } },
      { weapon: wreckSpear('glass', { fuller: 'amber', socket: 'brass', wrap: 'clothSaffron', ribbon: 'clothSaffron' }), head: A('kettle', { look: 'kettle', mat: 'brass', trim: 'leatherDark' }), body: A('leather', { mat: 'leatherDark', shirt: 'robe', studs: 'brass', pauldrons: 'leather', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'sand', fold: true }), H: { sack: 'leather', cloak: 'robe' } },
    ],
    extra: scavengerX,
  }),
  'dune-raider': H3('Dune Raider', 'veteran', {
    glow: () => 'storm',
    H: { build: 'human', skin: 'skinDeep', hairMat: 'hairBlack', hair: 'none', eye: '#101010', scarf: 'clothIndigo', tunic: 'clothIndigo', pants: 'robe', boots: 'leather', gloves: 'leather', buckle: 'bronze', wrapTail: 'clothIndigo' },
    gear: [
      { weapon: scimitars[0], head: indigoHood(), body: A('leather', { mat: 'leather', shirt: 'clothIndigo', belt: 'clothSaffron' }), feet: sandBoots },
      { weapon: scimitars[1], offhand: A('shield', { r: 21, face: 'wyrmHide', rim: 'bronze', boss: 'bronze', bossR: 6.4 }), head: indigoHood({ trim: 'bronze' }), body: A('leather', { mat: 'leather', shirt: 'clothIndigo', pauldrons: 'leather', belt: 'clothSaffron' }), feet: sandBoots },
      { weapon: scimitars[2], offhand: A('shield', { r: 22, face: 'wyrmHide', rim: 'brass', boss: 'brass', bossR: 6.6, rivets: 'brass' }), head: A('kettle', { look: 'kettle', mat: 'brass', trim: 'clothIndigo', crest: 'brass' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothIndigo', studs: 'brass', pauldrons: 'brass', belt: 'clothSaffron' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'sand', trim: 'clothIndigo', fold: true }) },
      { weapon: scimitars[3], offhand: A('shield', { shape: 'heater', face: 'clothIndigo', paint: 'chevron', paint2: 'clothSaffron', rim: 'gold', boss: 'gold', rivets: 'gold', runes: 'storm', gem: 'stormglass' }), head: A('helm', { look: 'helm', mat: 'steel', trim: 'gold', crest: 'clothIndigo', runes: 'storm', eyes: 'storm' }), body: A('mail', { mat: 'steel', trim: 'gold', belt: 'clothSaffron', pauldrons: 'brass' }), hands: A('gauntlets', { mat: 'steel', plate: 1 }), feet: A('boots', { mat: 'sand', trim: 'clothIndigo', greave: 'steel' }), H: { cloak: 'clothIndigo' } },
    ],
    extra: raiderX,
  }),
  rasa: H3('Rasa the Dune-Rider', 'relic-bearer', {
    relic: 'sandwalkers', glow: () => 'storm',
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairBlack', hair: 'braid', eye: '#1c1f38', tunic: 'clothIndigo', pants: 'robe', boots: 'leather', gloves: 'leather', buckle: 'brass', cloak: 'clothSaffron', wrapTail: 'clothIndigo' },
    gear: [
      { weapon: scimitars[1], head: indigoHood(), body: A('leather', { mat: 'leather', shirt: 'clothIndigo', belt: 'clothSaffron', trim: 'brass' }) },
      { weapon: scimitars[1], head: indigoHood({ trim: 'brass' }), body: A('leather', { mat: 'leather', shirt: 'clothIndigo', pauldrons: 'leather', belt: 'clothSaffron', trim: 'brass' }), hands: A('gloves', { mat: 'leather' }) },
      { weapon: scimitars[2], head: indigoHood({ trim: 'brass', clasp: 'brass' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothIndigo', studs: 'brass', pauldrons: 'brass', belt: 'clothSaffron', trim: 'brass' }), hands: A('gloves', { mat: 'leatherDark' }), H: { mantle: 'clothSaffron' } },
      { weapon: scimitars[3], head: indigoHood({ trim: 'gold', clasp: 'gold', gem: 'stormglass' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothIndigo', studs: 'gold', pauldrons: 'gold', belt: 'clothSaffron', trim: 'gold', glyph: 'storm' }), hands: A('gloves', { mat: 'leatherDark', trim: 'gold' }), H: { mantle: 'clothSaffron' } },
    ],
    extra: rasaX,
  }),
  gnash: H3('Gnash the Raider-King', 'relic-bearer', {
    relic: 'dunebreaker',
    H: { build: 'brute', skin: 'skinTan', hairMat: 'hairBlack', hair: 'none', beard: true, eye: '#1a1010', marks: 'clothSaffron', tunic: 'wyrmHide', pants: 'clothIndigo', boots: 'leatherDark', gloves: 'leatherDark', buckle: 'brass', mantle: 'wyrmHide' },
    gear: [
      { weapon: A('hammer', { headT: 50, headH: 11, headW: 10, haft: 'wood', haftR: 2.4, wrap: 'rags', wrapEnd: 15, bands: [], headMat: 'sandstone', faces: 0 }), head: A('crown', { style: 'regal', metal: 'brass', gem: 'topaz', tines: 5 }), body: A('leather', { mat: 'wyrmHide', shirt: 'wyrmHide', belt: 'clothSaffron', laces: false }) },
      { weapon: A('hammer', { headT: 50, headH: 11, headW: 10, haft: 'wood', haftR: 2.4, wrap: 'rags', wrapEnd: 15, bands: [], headMat: 'sandstone', faces: 0 }), head: A('crown', { style: 'regal', metal: 'brass', gem: 'topaz', tines: 5 }), body: A('leather', { mat: 'wyrmHide', shirt: 'wyrmHide', pauldrons: 'brass', belt: 'clothSaffron', laces: false }) },
      { weapon: A('hammer', { headT: 50, headH: 12, headW: 11, haft: 'wood', haftR: 2.4, wrap: 'leather', wrapEnd: 15, bands: [28], bandMat: 'iron', headMat: 'sandstone', faces: 1 }), head: A('crown', { style: 'regal', metal: 'gold', gem: 'ruby', tines: 5 }), body: A('leather', { mat: 'leatherDark', shirt: 'wyrmHide', studs: 'brass', pauldrons: 'brass', belt: 'clothSaffron', laces: false }), hands: A('gauntlets', { mat: 'brass', plate: 1 }) },
      { weapon: A('hammer', { headT: 50, headH: 12, headW: 11, haft: 'bogwood', haftR: 2.5, wrap: 'leatherDark', wrapEnd: 16, bands: [28], bandMat: 'gold', headMat: 'sandstone', faces: 1, runes: 'amber' }), head: A('crown', { style: 'regal', metal: 'gold', gem: 'stormglass', gem2: 'topaz', tines: 7, tall: true }), body: A('leather', { mat: 'leatherDark', shirt: 'wyrmHide', studs: 'gold', pauldrons: 'gold', belt: 'clothSaffron', trim: 'gold', laces: false }), hands: A('gauntlets', { mat: 'gold', plate: 1 }), feet: A('boots', { mat: 'leatherDark', trim: 'gold', greave: 'brass' }), H: { cloak: 'clothSaffron' } },
    ],
    extra: gnashX,
  }),
  'ash-wight': H3('Ash-Wight', 'veteran', {
    glow: () => 'ember',
    H: Object.assign({}, wightH),
    gear: [
      { weapon: wightSpear, head: A('kettle', { look: 'kettle', mat: 'blackiron', trim: 'bronze', tex: TX.rust(51) }), body: wightMail() },
      { weapon: wightSpear, offhand: ashBuckler, head: A('kettle', { look: 'kettle', mat: 'blackiron', trim: 'bronze', tex: TX.rust(51) }), body: wightMail() },
      { weapon: wightSword(), offhand: ashBuckler, head: A('helm', { look: 'helm', mat: 'blackiron', trim: 'bronze', eyes: 'ember' }), body: wightMail({ pauldrons: 'char' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }) },
      { weapon: wightSword({ heat: 1 }), offhand: gateShield, head: A('helm', { look: 'helm', mat: 'blackiron', trim: 'bronze', eyes: 'ember', runes: 'ember', crest: 'bronze' }), body: wightMail({ pauldrons: 'bronze' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: A('boots', { mat: 'char', trim: 'bronze', greave: 'blackiron' }), H: { cloak: 'char' } },
    ],
    extra: wightX,
  }),
  'ash-captain': H3('The Ash-Captain', 'relic-bearer', {
    relic: 'scorchgate-key', glow: () => 'ember',
    H: Object.assign({}, wightH, { mantle: 'cloakRed', cloak: 'char' }),
    gear: [
      { weapon: wightSword(), offhand: gateShield, head: A('helm', { look: 'helm', mat: 'blackiron', trim: 'bronze', eyes: 'ember', plume: 'cloakRed', crest: false }), body: wightMail({ pauldrons: 'bronze' }) },
      { weapon: wightSword(), offhand: gateShield, head: A('helm', { look: 'helm', mat: 'blackiron', trim: 'bronze', eyes: 'ember', plume: 'cloakRed', crest: false }), body: wightMail({ pauldrons: 'bronze' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }) },
      { weapon: wightSword({ heat: 1 }), offhand: gateShield, head: A('helm', { look: 'helm', mat: 'blackiron', trim: 'gold', eyes: 'ember', plume: 'cloakRed', crest: false }), body: wightMail({ pauldrons: 'bronze', trim: 'gold' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: A('boots', { mat: 'char', trim: 'bronze', greave: 'blackiron' }) },
      { weapon: wightSword({ heat: 1, bladeL: 52 }), offhand: gateShield, head: A('helm', { look: 'helm', mat: 'blackiron', trim: 'gold', eyes: 'ember', runes: 'ember', plume: 'cloakRed', crest: false }), body: wightMail({ pauldrons: 'gold', trim: 'gold' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: A('boots', { mat: 'char', trim: 'gold', greave: 'blackiron' }) },
    ],
    extra: captainX,
  }),
  brask: H3('Foreman Brask', 'relic-bearer', {
    relic: 'sunstone-lantern', drawSlot: 'offhand', pose: raiseOff(9),
    H: { build: 'brute', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'leatherDark', shade: true, shadeEyes: 'amber', ledger: 'leatherDark', coins: true, buckle: 'brass', lantern: true },
    gear: [
      { weapon: pick('iron', 'iron'), head: tallyHood('clothGrey', 'iron', 'brass'), body: A('leather', { mat: 'leatherDark', shirt: 'clothGrey', belt: 'leather', pouch: 'leather', laces: false }) },
      { weapon: pick('iron', 'iron'), head: tallyHood('clothGrey', 'iron', 'brass'), body: A('leather', { mat: 'leatherDark', shirt: 'clothGrey', belt: 'leather', pouch: 'leather', laces: false }), H: { mantle: 'iron' } },
      { weapon: pick('steel', 'brass'), head: tallyHood('clothGrey', 'blackiron', 'brass'), body: A('leather', { mat: 'leatherDark', shirt: 'clothGrey', studs: 'iron', belt: 'leather', pouch: 'leather', laces: false }), H: { mantle: 'blackiron', shade: false, mask: 'iron', maskEyes: 'amber' } },
      { weapon: pick('steel', 'brass', { edge: 'amber' }), head: tallyHood('dark', 'amber', 'brass', 'amber'), body: A('leather', { mat: 'leatherDark', shirt: 'clothGrey', studs: 'brass', pauldrons: 'blackiron', belt: 'leather', pouch: 'leather', laces: false, glyph: 'amber' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), H: { mantle: 'blackiron', shade: false, mask: 'bone', maskEyes: 'amber', cloak: 'clothGrey' } },
    ],
    extra: braskX,
  }),
  quartermaster: H3('The Quartermaster', 'veteran', {
    H: { build: 'human', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'crop', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'skinAsh', ledger: 'leatherRed', coins: true, buckle: 'gold', mantle: 'clothGrey' },
    gear: [
      { weapon: crowbar, head: A('kettle', { look: 'kettle', mat: 'leatherDark', trim: 'brass' }), body: tallyRobe('brass', 'leatherDark') },
      { weapon: crowbar, head: A('kettle', { look: 'kettle', mat: 'leatherDark', trim: 'brass' }), body: tallyRobe('brass', 'leatherDark'), hands: A('gloves', { mat: 'leatherDark' }) },
      { weapon: crowbar, head: A('kettle', { look: 'kettle', mat: 'leatherDark', trim: 'gold', gem: 'topaz' }), body: tallyRobe('gold', 'leatherDark', { sleeve: 'leatherDark' }), hands: A('gloves', { mat: 'leatherDark' }), H: { mantle: 'leatherDark' } },
      { weapon: crowbar, head: A('kettle', { look: 'kettle', mat: 'dark', trim: 'gold', gem: 'amber' }), body: tallyRobe('gold', 'leatherDark', { sleeve: 'leatherDark', glyph: 'amber' }), hands: A('gauntlets', { mat: 'brass', plate: 1 }), H: { mantle: 'leatherDark', cloak: 'clothGrey' } },
    ],
    extra: quartermasterX,
  }),
  vell: H3('Vell Saltglass', 'relic-bearer', {
    relic: 'saltglass', glow: () => 'storm',
    H: { build: 'human', skin: 'skinPale', hairMat: 'hairSilver', hair: 'pony', eye: '#1c2a34', tunic: 'clothTeal', pants: 'wool', boots: 'leatherDark', gloves: 'leatherDark', cloak: 'clothTeal', quiver: 'leatherDark', fletch: 'clothWhite', buckle: 'silver', neckerchief: 'clothWhite' },
    gear: [
      { weapon: shortBow, body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', belt: 'leather', trim: 'silver' }), feet: waders },
      { weapon: shortBow, body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', pauldrons: 'leatherDark', belt: 'leather', trim: 'silver' }), hands: A('gloves', { mat: 'leatherDark' }), feet: waders },
      { weapon: shortBow, body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', studs: 'silver', pauldrons: 'leatherDark', belt: 'leather', trim: 'silver' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'clothTeal', fold: true }), H: { mantle: 'clothWhite' } },
      { weapon: shortBow, body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', studs: 'silver', pauldrons: 'silver', belt: 'leather', trim: 'silver', glyph: 'storm' }), hands: A('gloves', { mat: 'leatherDark', trim: 'silver' }), feet: A('boots', { mat: 'leatherDark', trim: 'clothTeal', greave: 'silver' }), H: { mantle: 'clothWhite' } },
    ],
    extra: vellX,
  }),
});
// Tamsin at Scorchgate (spec §3.5): gearTier 4 is her kindled look, the M3 gearTier 3 kit with the Kindled stage's
// ember rim on everything she carries (her lent starter too) and ember motes rising off her
FOE_ART.tamsin.gear.push(Object.assign({}, FOE_ART.tamsin.gear[3], { kindle: true, head: A('circlet', { look: 'circlet', mat: 'gold', gem: 'ember' }), body: A('mail', { mat: 'steel', trim: 'gold', belt: 'leatherDark', pauldrons: 'steel', glyph: 'ember' }), H: { mantle: 'cloakRed' } }));
FOE_ART.tamsin.motes = (t, a, gT) => (gT >= 4 ? awakenMotes(t, { x: (a.center || [32, 36])[0] - 12, y: (a.center || [32, 36])[1] - 24, w: 24, h: 36 }, { n: 7 }) : null);
FOE_ART.tamsin.aura = (gT, t) => (gT >= 4 ? [[255, 146, 58], 2, .34 + .08 * Math.sin(t * 3)] : null); // a faint ember halo

/* =====================================================================
   M5 · THE IRONSPIRE PEAKS (spec §3.2, §3.5, §6.2): the families of the mountains, their named holders and variants,
   the Tallymen's ice-cutters, and the two Champions, Mother Anvil and the Rime-Abbot
   ===================================================================== */

/* ---------- the Ironspire humanoids: the same rig, their own kits ---------- */
const pileTex = ({ x, y }) => ((x * 2 + y) % 4 === 0 ? -1 : hash(x, y, 201) < .12 ? 1 : 0);
const armySword = (blade, guardMat, o = {}) => A('sword', Object.assign({ gripEnd: 13, guardT: 3.2, bladeW: 3.4, bladeL: 44, tipL: 8, taper: .9, blade, guard: 'bar', guardMat, guardW: 8, guardR: 1.7, grip: 'leatherDark', gripR: 2, pommel: guardMat, pommelR: 3 }, o));
const deserterSwords = [
  armySword('iron', 'iron', { bladeTex: TX.rust(211) }),
  armySword('steel', 'iron', { grip: 'clothSlate' }),
  armySword('steel', 'brass', { bladeL: 50, gripEnd: 15, fuller: 'storm', fullerR: .9, grip: 'clothSlate', pommelGem: 'stormglass' }),
];
const beardAxe = (blade, socket, o = {}) => A('axe', Object.assign({ headT: 47, bladeLo: 15, bladeHi: 6.5, bladeW: 16, bulge: 3, back: 'spike', spikeL: 6, haft: 'wood', haftR: 2.2, wrap: 'leatherDark', wrapEnd: 16, blade, socket }, o));
const iceSaw = (blade, o = {}) => A('sword', Object.assign({ gripEnd: 11, guardT: 2.4, bladeW: 5, bladeL: 56, tipL: 2, taper: 1, blade, teeth: 1, guard: 'bar', guardMat: 'wood', guardW: 7.5, guardR: 1.7, grip: 'wood', gripR: 1.9, pommel: 'wood', pommelR: 2.2 }, o));
const slateHood = (o = {}) => A('hood', Object.assign({ look: 'hood', mat: 'clothSlate', tip: 0, trim: 'grizzle' }, o));
const furHood = (o = {}) => A('hood', Object.assign({ look: 'hood', mat: 'wolfFur', tip: 0, trim: 'wolfPale' }, o));
const cleatBoots = (o = {}) => A('boots', Object.assign({ mat: 'leatherDark', trim: 'wolfPale', fold: true }, o));
// a crossbow slung across the back (the deserters, from the second Waking): its stock over one shoulder, the prod
// across the back
function crossbowBack(c) {
  const { F, X, j, b } = c, cx = j.cx + j.lean, y0 = j.sh - 2.6, w = b.shW + 3.4;
  under(F, { X, mat: 'wood', prof: 'round', bw: .8, grp: 'xbstock', shapes: [X.cap(cx + 1.5, y0 - 1, cx + b.waW + 3.4, j.wa + 4.6, 1, .9)] }, ['torso']);
  under(F, { X, mat: c.gT >= 3 ? 'steel' : 'iron', prof: 'round', bw: .8, grp: 'xbprod', shapes: capsX(X, [[cx - w, y0 + 1.6], [cx - w * .45, y0 - .4], [cx + w * .45, y0 - .8], [cx + w, y0 + 1]], [.55, .8, .8, .55]) }, ['torso']);
  under(F, { X, mat: 'string', prof: 'flat', grp: 'xbstring', noOutline: true, shapes: [X.cap(cx - w + .4, y0 + 1.8, cx + w - .4, y0 + 1.2, .35)] }, ['torso']);
}
// the Stormwatch deserters: the surcoat's badge picked off (the rig's emblem, in the unfaded cloth), a crossbow later
function brigandX(c) { if (c.gT >= 2) crossbowBack(c); }
// Rhune: the toll-chain over one shoulder (links, and the padlock that hung across the pass), little wings of feather
// at the ankles while he wears the Windstep Boots
function tollChain(c) {
  const { F, X, j, b } = c, a = [j.cx - b.shW + 1 + j.lean, j.sh - .6], z = [j.cx + b.waW + .8, j.wa + 1.6], S = [], n = 9;
  for (let k = 0; k <= n; k++) { const u = k / n, x = a[0] + (z[0] - a[0]) * u, y = a[1] + (z[1] - a[1]) * u + Math.sin(u * Math.PI) * 1.2; S.push(k & 1 ? X.ell(x, y, .75, 1.1) : X.ell(x, y, 1.1, .7)); }
  under(F, { X, mat: 'iron', prof: 'round', bw: .7, grp: 'tollchain', shapes: S }, ['armR']);
  F.add({ X, mat: 'bronze', prof: 'round', bw: 1, grp: 'padlock', shapes: [X.poly([[z[0] - 1.4, z[1] + 1.2], [z[0] + 1.6, z[1] + 1.2], [z[0] + 1.6, z[1] + 4], [z[0] - 1.4, z[1] + 4]])] });
  F.add({ X, mat: 'iron', prof: 'round', bw: .5, grp: 'shackle', shapes: [X.circ(z[0] + .1, z[1] + .8, 1.1)], cuts: [X.circ(z[0] + .1, z[1] + .8, .5)] });
}
function ankleWings(c) {
  const { F, X, j, b } = c, bt = b.bootT, S = [];
  if (j.kneel || c.lie) return;
  for (const s of [-1, 1]) {
    const d = s < 0 ? -j.stride : j.stride * .5, r = [j.cx + s * 6.6 + d, bt + 1.2];
    for (const [a, L] of [[1, 6.2], [.62, 5.6], [.26, 4.6]]) { const e = [r[0] + s * Math.cos(a) * L, r[1] - Math.sin(a) * L], m = [r[0] + s * Math.cos(a) * L * .5, r[1] - Math.sin(a) * L * .5]; S.push(X.poly([[r[0], r[1] - .9], [m[0] - s * .5, m[1] - 1], [e[0], e[1]], [m[0] + s * .6, m[1] + .9], [r[0] + s * .6, r[1] + .9]])); }
  }
  F.add({ X, mat: 'clothWhite', prof: 'round', bw: .6, grp: 'anklewings', relic: true, shapes: S });
}
function rhuneX(c) { tollChain(c); if (c.relic && c.held && c.slot === 'feet') ankleWings(c); if (c.gT >= 2) crossbowBack(c); }
// the Cutter-Chief: snow goggles over the shadow of the hood, lenses of lake-ice
function goggles(c, mat = 'ice') {
  const { F, X, j } = c, [hx0, hy0] = j.hc;
  if (c.lie) return;
  F.add({ X, mat: 'leatherDark', prof: 'round', bw: .6, grp: 'gogglestrap', shapes: [X.cap(hx0 - 6.8, hy0 + .2, hx0 + 6.8, hy0 + .2, .7)] });
  F.add({ X, mat: 'blackiron', prof: 'round', bw: .8, grp: 'gogglerims', shapes: [X.circ(hx0 - 2.6, hy0 + .4, 2), X.circ(hx0 + 2.6, hy0 + .4, 2)] });
  F.add({ X, mat, prof: 'round', bw: 1, grp: 'goggles', shapes: [X.circ(hx0 - 2.6, hy0 + .4, 1.3), X.circ(hx0 + 2.6, hy0 + .4, 1.3)] });
}
// ice-cleats: iron spikes under the boots
function cleats(c) {
  const { F, X, j } = c, S = [];
  if (j.kneel || c.lie) return;
  for (const s of [-1, 1]) { const d = s < 0 ? -j.stride : j.stride * .5; for (const dx of [-5.8, -3.4, -1.2]) { const x = j.cx + s * (-dx) + d; S.push(X.poly([[x - .6, 46.4], [x, 47.8], [x + .6, 46.4]])); } }
  F.add({ X, mat: 'iron', prof: 'ridge', grp: 'cleats', shapes: S });
}
function furRuff(c, mat = 'wolfPale') {
  const { F, X, j } = c, [hx0, hy0] = j.hc;
  if (c.lie) return;
  const T = []; for (let k = 0; k < 9; k++) { const u = k / 8, x = hx0 - 8.6 + u * 17.2, y = hy0 + 9.8 + Math.sin(u * Math.PI) * .8; T.push(X.poly([[x - 1.3, y - 1], [x + (hash(k, 3, 203) - .5) * 1.4, y + 1.8 + hash(k, 4, 203) * 1.4], [x + 1.3, y - 1]])); }
  F.add({ X, mat, prof: 'round', bw: 1.6, grp: 'ruff', shapes: [X.ell(hx0, hy0 + 9, 9.4, 2.7)].concat(T), tex: pileTex });
}
function cutterX(c) { furRuff(c); goggles(c); if (c.gT >= 2) cleats(c); }
function sawyerX(c) { smugglerX(c); cleats(c); if (c.gT >= 3) goggles(c); }
const cutterRobe = (trim, o = {}) => A('robe', Object.assign({ mat: 'clothGrey', trim, sash: 'leatherDark' }, o));
Object.assign(FOE_ART, {
  brigand: H3('Pass Brigand', 'rabble', {
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairBrown', hair: 'short', stubble: true, eye: '#20202c', tunic: 'clothSlate', pants: 'wool', boots: 'leatherDark', gloves: 'leather', buckle: 'iron', mantle: 'grizzle', mantleTex: pileTex, emblem: 'clothBlue' },
    gear: [
      { weapon: handAxe, head: slateHood(), body: A('leather', { mat: 'leather', shirt: 'clothSlate', belt: 'leatherDark' }) },
      { weapon: deserterSwords[0], head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'clothSlate', tex: TX.rust(213) }), body: A('leather', { mat: 'leather', shirt: 'clothSlate', belt: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', fold: true }), H: { tabard: 'clothSlate' } },
      { weapon: deserterSwords[1], offhand: A('shield', { r: 21, face: 'clothSlate', rim: 'iron', boss: 'iron', bossR: 6.4 }), head: A('kettle', { look: 'kettle', mat: 'iron', trim: 'clothSlate' }), body: A('mail', { mat: 'iron', trim: 'clothSlate', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', fold: true }), H: { tabard: 'clothSlate' } },
      { weapon: deserterSwords[2], offhand: A('shield', { shape: 'heater', face: 'clothSlate', paint: 'chevron', paint2: 'clothWhite', rim: 'steel', boss: 'steel', rivets: 'steel', runes: 'storm' }), head: A('helm', { look: 'helm', mat: 'steel', trim: 'clothSlate', eyes: 'storm', crest: false }), body: A('mail', { mat: 'steel', trim: 'blackiron', belt: 'leatherDark', pauldrons: 'steel' }), hands: A('gauntlets', { mat: 'steel', plate: 1 }), feet: A('boots', { mat: 'leatherDark', trim: 'grizzle', greave: 'steel' }), H: { tabard: 'clothSlate', cloak: 'clothSlate' } },
    ],
    extra: brigandX,
  }),
  rhune: H3('Rhune the Pass-Warden', 'relic-bearer', {
    relic: 'windstep-boots', glow: () => 'storm',
    H: { build: 'brute', skin: 'skinTan', hairMat: 'hairAuburn', hair: 'short', beard: true, eye: '#1c1f2c', tunic: 'clothSlate', pants: 'wool', boots: 'leatherDark', gloves: 'leatherDark', buckle: 'brass', mantle: 'grizzle', mantleTex: pileTex, cloak: 'clothSlate', tabard: 'clothSlate', emblem: 'clothBlue' },
    gear: [
      { weapon: beardAxe('iron', 'iron', { bladeTex: TX.rust(215) }), body: A('leather', { mat: 'leatherDark', shirt: 'clothSlate', pauldrons: 'leatherDark', belt: 'leather' }) },
      { weapon: beardAxe('steel', 'iron'), body: A('leather', { mat: 'leatherDark', shirt: 'clothSlate', pauldrons: 'brass', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark', trim: 'brass' }) },
      { weapon: beardAxe('steel', 'brass', { bands: [24], bandMat: 'brass' }), head: A('kettle', { look: 'kettle', mat: 'steel', trim: 'brass', crest: 'clothBlue' }), body: A('mail', { mat: 'steel', trim: 'brass', belt: 'leather', pauldrons: 'brass' }), hands: A('gloves', { mat: 'leatherDark', trim: 'brass' }) },
      { weapon: beardAxe('steel', 'brass', { bands: [24], bandMat: 'brass', edge: 'storm', gem: 'stormglass', runes: 'storm' }), head: A('helm', { look: 'helm', mat: 'steel', trim: 'brass', plume: 'clothBlue', crest: false, eyes: 'storm' }), body: A('mail', { mat: 'steel', trim: 'brass', belt: 'leatherDark', pauldrons: 'brass', glyph: 'storm' }), hands: A('gauntlets', { mat: 'steel', plate: 1, trim: 'brass' }) },
    ],
    extra: rhuneX,
  }),
  'cutter-chief': H3('The Cutter-Chief', 'relic-bearer', {
    relic: 'cutters-pick', glow: () => 'frost',
    H: { build: 'brute', skin: 'skinAsh', hairMat: 'hairBlack', hair: 'none', eye: '#1a1a1a', tunic: 'clothGrey', pants: 'clothGrey', boots: 'leatherDark', gloves: 'leatherDark', shade: true, shadeEyes: 'frost', ledger: 'leatherDark', coins: true, buckle: 'blackiron', mantle: 'wolfPale', mantleTex: pileTex },
    gear: [
      { weapon: pick('iron', 'iron'), head: tallyHood('clothGrey', 'wolfPale', 'iron'), body: cutterRobe('wolfPale'), hands: A('gloves', { mat: 'leatherDark' }), feet: cleatBoots() },
      { weapon: pick('iron', 'iron'), head: tallyHood('clothGrey', 'wolfPale', 'bronze'), body: cutterRobe('wolfPale', { sleeve: 'wolfFur' }), hands: A('gloves', { mat: 'leatherDark' }), feet: cleatBoots() },
      { weapon: pick('steel', 'blackiron'), head: tallyHood('clothGrey', 'wolfPale', 'gold'), body: cutterRobe('wolfPale', { sleeve: 'wolfFur', glyph: 'frost' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: cleatBoots({ greave: 'blackiron' }), H: { mantle: 'wolfFur' } },
      { weapon: pick('steel', 'blackiron', { edge: 'frost' }), head: tallyHood('dark', 'wolfPale', 'gold', 'frost'), body: cutterRobe('rime', { sleeve: 'wolfFur', glyph: 'frost', sash: 'blackiron' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: cleatBoots({ greave: 'blackiron' }), H: { mantle: 'wolfFur', cloak: 'wolfPale' } },
    ],
    extra: cutterX,
  }),
  sawyer: H3('Sawyer', 'rabble', {
    H: { build: 'human', skin: 'skinTan', hairMat: 'hairBrown', hair: 'crop', eye: '#1c2a24', tunic: 'wool', pants: 'wool', boots: 'leatherDark', gloves: 'leather', scarf: 'clothTeal', buckle: 'iron', satchel: 'leather', mantle: 'wolfFur', mantleTex: pileTex },
    gear: [
      { weapon: iceSaw('iron', { bladeTex: TX.rust(217) }), head: A('coif', { look: 'coif', mat: 'wool', flaps: 1 }), body: A('leather', { mat: 'leather', shirt: 'wool', belt: 'leatherDark' }), feet: cleatBoots() },
      { weapon: iceSaw('iron'), head: furHood(), body: A('leather', { mat: 'leather', shirt: 'wool', belt: 'leatherDark' }), hands: A('gloves', { mat: 'leather' }), feet: cleatBoots() },
      { weapon: iceSaw('steel'), head: furHood({ clasp: 'iron' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', studs: 'iron', pauldrons: 'wolfFur', belt: 'leather' }), hands: A('gloves', { mat: 'leatherDark' }), feet: cleatBoots(), H: { satchel: 'leatherDark' } },
      { weapon: iceSaw('steel', { bladeTex: rimeTex, fuller: 'frost', fullerR: .7 }), head: furHood({ clasp: 'steel', gem: 'frost' }), body: A('leather', { mat: 'leatherDark', shirt: 'clothTeal', studs: 'steel', pauldrons: 'wolfFur', belt: 'leatherDark' }), hands: A('gauntlets', { mat: 'blackiron', plate: 1 }), feet: cleatBoots({ greave: 'blackiron' }), H: { satchel: 'leatherDark', cloak: 'wolfFur' } },
    ],
    extra: sawyerX,
  }),
});


/* ---- RIME WOLF: a lean grey-white wolf of the high passes, frost in its ruff and on its muzzle, pale eyes, its breath
   steaming (64x48, ground 45). The Waking hangs icicles off it (1), grows a ridge of ice down its spine (2) and
   drives the ice through its hide, cold light in the cracks (3) ---- */
function rimeWolf(F, st) {
  const { pose, f, gT } = st, A = st.anchors, idle = !pose || pose === 'idle';
  let bx = 0, by = 0, H = [50.5, 18 + f], ha = .06, jaw = 0, eye = 'open', lie = false;
  let legs = {
    ff: [[37, 31.5], [37.6, 37.6], [38, 43.4]], fn: [[41.5, 31], [43, 37.6], [44, 43.4]],
    hf: [[16.5, 30.5], [19.6, 35.6], [15.8, 39.6], [16.6, 43.4]], hn: [[21, 29.5], [24.4, 35.2], [20.6, 39.6], [21.4, 43.4]],
  };
  let tail = [[12, 23.6], [7.6, 26.4], [5, 31], [4.4, 35.6]];
  if (pose === 'attack') {
    bx = 1; by = 2; H = [50, 23.4]; ha = .3; jaw = 1;
    legs = { ff: [[40, 33.5], [45.5, 37], [50, 41.6]], fn: [[44.5, 33], [51, 35.6], [56.4, 39.6]], hf: [[19.5, 32], [14.5, 36.5], [9, 40.5], [6, 43.4]], hn: [[24, 31.5], [18.5, 36], [12.5, 40.5], [9.5, 43.6]] };
    tail = [[15, 24.6], [10, 23.4], [5.4, 23.8], [1.8, 25.6]];
  } else if (pose === 'hurt') {
    bx = -3; by = 1; H = [45.5, 15.8]; ha = -.28; jaw = .5; eye = 'shut';
    legs = { ff: [[34, 32.5], [36.5, 38], [39.5, 43.4]], fn: [[38.5, 32], [42, 37.5], [45, 43.4]], hf: [[13.5, 31.5], [17, 36.5], [12.5, 40], [13.2, 43.4]], hn: [[18, 30.5], [21.5, 36.5], [17, 40], [17.8, 43.4]] };
    tail = [[9.4, 24.4], [7.2, 29], [7.8, 34], [10.4, 38]];
  } else if (pose === 'ko') {
    lie = true; H = [50.5, 38.4]; ha = .1; eye = 'shut';
    legs = { ff: [[38, 38.5], [43, 40.4], [48.5, 41.8]], fn: [[41, 41.2], [47, 42.8], [53, 43.4]], hf: [[18, 38.5], [13, 40.2], [8, 41.4], [4.5, 42]], hn: [[21, 41.2], [16, 43], [11, 43.8], [7, 44]] };
    tail = [[12.5, 35.5], [8.5, 38], [4.5, 40.5], [1.5, 42]];
  }
  const S = p => [p[0] + bx, p[1] + by];
  const fur = 'rimeFur', pale = 'snow';
  // grey fur streaked darker, rime settled on whatever faces up (more of it with each Waking)
  const ftex = ({ x, y, ny }) => { const n = vnoise(x * .5, y * .22, 221); if (ny < -.5 + gT * .1 && vnoise(x * .4, y * .4, 222) > .68 - gT * .07) return { m: 'rime', dd: -1 }; return n > .72 ? -1 : ((x * 2 + y) % 6 === 0 ? -1 : 0); };
  const legP = pts => (lie || !idle ? pts : pts.map((p, i) => (i === 0 ? S(p) : p)));
  const paw = (p, far, g) => F.add({ mat: fur, prof: 'round', bw: 1.2, grp: g, shapes: [ell([p[0] + 1.3, p[1] + .9], 2.6, 1.3)], tex: far ? DARK : null });
  const leg = (pts, far, name) => { const P = legP(pts); legOf(F, P, P.length === 3 ? [3.1, 2.1, 1.7] : [4.2, 2.6, 1.8, 1.6], fur, ftex, name, far); paw(P[P.length - 1], far, name + 'p'); };
  leg(legs.hf, true, 'hf'); leg(legs.ff, true, 'ff');
  const tl = lie || !idle ? tail : tail.map(S);
  F.add({ mat: fur, prof: 'round', bw: 2.6, grp: 'tail', shapes: chainC(tl, [3.4, 4.2, 3.6, 2]), tex: ftex });
  F.add({ mat: pale, prof: 'round', bw: 1, grp: 'tailtip', shapes: [circ(tl[3], 1.9)], tex: ftex });
  const bodyS = lie ? [ell([20, 37], 8.6, 6.2), ell([29, 37.4], 11, 5.6), ell([39, 37], 8, 6.6)] : [ell(S([19.5, 26.6]), 8.2, 7.4), ell(S([29, 25.8]), 10.6, 5.8), ell(S([39.5, 26.6 - f * .3]), 8.4, 9 + f * .3)];
  F.add({ mat: fur, prof: 'round', bw: 5.6, hs: .8, grp: 'body', shapes: bodyS, tex: ftex });
  F.add({ mat: pale, prof: 'round', bw: 2.4, grp: 'chest', shapes: [lie ? ell([44, 38.5], 3.5, 4) : ell(S([44.4, 28.4]), 3.8, 6.4)], tex: q => furTex(223, 5)(q) - 1 });
  // the spine: a ridge of ice from the second Waking, long shards of it through the hide at the third
  const sp = lie ? [[43, 32.5], [35, 31.8], [27, 32], [19, 32], [13, 33.5]] : [[42.5, 19], [35, 20], [27, 20.4], [19.5, 20], [13, 22.2]].map(S);
  if (gT >= 2) F.add({ mat: 'ice', prof: 'ridge', hs: .9, grp: 'icespine', shapes: spikesC(spineThorns(sp, gT >= 3 ? 8 : 6, (gT >= 3 ? 6.4 : 4) * (lie ? .75 : 1), gT >= 3 ? 1.35 : 1.1, lie ? -.6 : -.55)) });
  if (gT >= 3 && !lie) F.add({ mat: 'frost', prof: 'round', bw: .6, grp: 'frostvein', noShadow: true, shapes: chainC([S([22, 25]), S([26, 27.4]), S([30, 25.2]), S([34.6, 27.6])], .5) });
  // icicles hanging off the belly from the first Waking
  if (gT >= 1 && !lie) F.add({ mat: 'ice', prof: 'ridge', hs: .9, grp: 'bellyicicles', shapes: spikesC([[S([24, 32])[0], S([24, 32])[1], .05, 1, 2.6 + gT * .5, .8], [S([30, 31.4])[0], S([30, 31.4])[1], -.05, 1, 3.2 + gT * .5, .9], [S([35.5, 32.2])[0], S([35.5, 32.2])[1], .1, 1, 2.4 + gT * .4, .8]]) });
  leg(legs.hn, false, 'hn'); leg(legs.fn, false, 'fn');
  const hf = frame(H[0], H[1], ha), neckA = lie ? [42, 35.5] : S([41, 22.6]);
  // a heavy ruff of frosted fur round the neck
  F.add({ mat: fur, prof: 'round', bw: 3.6, grp: 'neck', shapes: [cap(neckA, hf.P(-2.6, 1.6), 6.2, 4.6)], tex: ftex });
  const rf = lie ? [] : [[-3.4, 3.6, -.9, .7], [-1.4, 5.2, -.4, 1], [-4.8, 1.2, -1, .2]].map(([t, s, dx, dy], k) => { const p = hf.P(t, s); return [p[0], p[1], dx + (hash(k, 1, 224) - .5) * .3, dy, 3.6 + k * .4, 1.4]; });
  if (rf.length) F.add({ mat: pale, prof: 'ridge', hs: .8, grp: 'ruff', shapes: spikesC(rf), tex: ftex });
  F.add({ mat: fur, prof: 'round', bw: 1.2, grp: 'earF', shapes: [hf.poly([[-.2, -3.9], [-.6, -9.4], [2.8, -4.2]])], tex: DARK });
  const jf = frame(...hf.P(1.4, 3), ha + jaw * .6);
  if (jaw > 0) F.add({ mat: 'flesh', prof: 'round', bw: 1.5, grp: 'maw', shapes: [poly([hf.P(1.2, 2), hf.P(9.2, 2.6), jf.P(7.4, .4), jf.P(0, 0)])] });
  F.add({ mat: fur, prof: 'round', bw: 1.6, grp: 'jaw', shapes: [jf.cap(0, 0, 7.2, .3, 2.1, 1.3)], tex: ftex });
  if (jaw > 0) F.add({ mat: 'bone', prof: 'ridge', grp: 'teethL', shapes: [jf.poly([[3, -1], [3.7, -3.2], [4.4, -1]]), jf.poly([[5.4, -.8], [6, -2.7], [6.6, -.7]])] });
  F.add({ mat: fur, prof: 'round', bw: 3.4, grp: 'head', shapes: [rell(hf, 0, 0, 5.4, 4.6), hf.cap(1.8, .7, 10.2, 2.1, 3.1, 1.8)], tex: ftex });
  F.add({ mat: pale, prof: 'round', bw: 1.2, grp: 'muzzle', shapes: [hf.cap(3, 3, 9, 3.1, 1.4, 1)], tex: ({ x, y }) => (hash(x, y, 225) < .3 ? { m: 'rime', dd: 0 } : 0) });
  if (jaw > 0) F.add({ mat: 'bone', prof: 'ridge', grp: 'teethU', shapes: [hf.poly([[4.8, 3.3], [5.6, 5.6], [6.4, 3.3]]), hf.poly([[7.2, 3.1], [7.8, 4.9], [8.4, 3]])] });
  F.add({ mat: 'dark', prof: 'round', bw: 1, grp: 'nose', shapes: [hf.circ(10.4, 1.5, 1.3)] });
  F.add({ mat: fur, prof: 'round', bw: 1.2, grp: 'ear', shapes: [hf.poly([[-3.2, -3], [-5.4, -9.8], [-.2, -4.4]])], tex: ftex });
  eyeOf(F, hf, 2.7, -1.3, 1.25, .8, 'frost', eye === 'shut');
  if (eye !== 'shut') F.add({ mat: 'dark', prof: 'flat', grp: 'brow', noShadow: true, noOutline: true, shapes: [hf.cap(1.2, -2.8, 4.6, -2.1, .55)] });
  if (gT >= 1 && !lie) F.add({ mat: 'ice', prof: 'ridge', grp: 'jawicicles', shapes: spikesC([[...jf.P(2.6, 1.4), .1, 1, 2.2 + gT * .3, .6], [...jf.P(5, 1.2), 0, 1, 1.6 + gT * .3, .5]]) });
  // breath: a steaming puff when it stands, a spray of frost when it bites
  if (!lie && pose !== 'hurt') {
    const m = hf.P(10.8, 3.4);
    if (jaw > .5) F.add({ mat: 'frost', prof: 'round', bw: 1, grp: 'breath', noShadow: true, noOutline: true, shapes: [circ([m[0] + 2.2, m[1] + 1], 1.6), circ([m[0] + 4.4, m[1] + 2.2], 1.1), circ([m[0] + 3.6, m[1] - .6], .8)] });
    else F.add({ mat: 'mist', prof: 'flat', grp: 'breath', noShadow: true, noOutline: true, shapes: [circ([m[0] + 2 + f, m[1] - .6 - f], 1.5 + f * .3), circ([m[0] + 4.2 + f, m[1] - 2.2 - f], 1)], tex: ({ x, y }) => ((x + y) & 1 ? -1 : 0) });
  }
  A.head = hf.P(2.7, -1.3); A.mouth = hf.P(8.5, 3); A.center = lie ? [30, 37] : S([30, 26]);
}

/* ---- ROCKLING: a knee-high heap of grey scree that stood up: boulders for a body, pebbles for limbs, two chips of
   mica for eyes, snow in its cracks; it rolls into you (48x48, ground 45). Lichen at the first Waking, a light like
   hot ore in its seams at the second, crystals of quartz through it at the third ---- */
function rockling(F, st) {
  const { pose, f, gT } = st, A = st.anchors, idle = !pose || pose === 'idle', roll = pose === 'attack', lie = pose === 'ko';
  const rock = gT >= 3 ? 'granite' : 'scree', seam = gT >= 3 ? 'ember' : 'amber';
  const rtex = seed => ({ x, y, nx, ny }) => {
    if (ny < -.45 && vnoise(x * .4, y * .4, seed + 1) > .5) return { m: 'snow', dd: 0 };
    if (gT >= 1 && vnoise(x * .35, y * .35, seed + 2) > .78) return { m: 'lichen', dd: 0 };
    const n = vnoise(x * .3, y * .3, seed); return n > .72 ? -1 : n < .22 ? 1 : hash(x, y, seed) < .06 ? -1 : 0;
  };
  if (lie) {
    // knocked apart: a low heap of loose stones, the mica eyes dark
    const P = [[14, 41.2, 5.4, 3.6], [22.4, 40.4, 6.4, 4.4], [31.6, 41.4, 5.6, 3.6], [38.6, 42.4, 3.8, 2.6], [19, 36.8, 4, 3], [27, 36.6, 4.2, 3.2], [8.4, 43, 3, 1.8]];
    P.forEach(([x, y, rx, ry], k) => F.add({ mat: rock, prof: 'round', bw: 2.6, hs: .8, grp: 'stone' + k, shapes: [ell([x, y], rx, ry)], tex: rtex(230 + k) }));
    F.add({ mat: 'dark', prof: 'flat', grp: 'mica', noShadow: true, shapes: [circ([25.6, 36.2], .8), circ([28.2, 36.4], .7)] });
    A.head = [27, 36]; A.mouth = [27, 37]; A.center = [24, 40];
    return;
  }
  if (roll) {
    // tucked into a boulder and rolling in: one ball of stones, dust and pebbles behind it
    const c = [30 + f, 34.6], R = 10.2 + gT * .3;
    F.add({ mat: 'granite', prof: 'flat', grp: 'dust', noShadow: true, noOutline: true, shapes: [ell([14, 43.4], 7, 1.6), ell([8, 42.6], 4, 1.2)], tex: ({ x, y }) => ((x + y) & 1 ? -1 : -2) });
    F.add({ mat: rock, prof: 'round', bw: 1.2, grp: 'pebbles', shapes: [circ([15.4, 38.4], 1.5), circ([11, 35.6], 1.1), circ([18, 32.6], 1)] });
    F.add({ mat: rock, prof: 'round', bw: 6, hs: .85, grp: 'ball', shapes: [circ(c, R)], tex: rtex(236) });
    const Sg = []; for (let k = 0; k < 5; k++) { const a = -.4 + k * 1.26; Sg.push(cap([c[0] + Math.cos(a) * R * .15, c[1] + Math.sin(a) * R * .15], [c[0] + Math.cos(a) * R * .95, c[1] + Math.sin(a) * R * .95], .5)); }
    F.add({ mat: 'dark', prof: 'flat', grp: 'cracks', noShadow: true, noOutline: true, shapes: Sg });
    if (gT >= 2) F.add({ mat: seam, prof: 'flat', grp: 'seamglow', noShadow: true, shapes: Sg.slice(0, gT >= 3 ? 5 : 3).map(s0 => cap(s0.a, [(s0.a[0] + s0.b[0]) / 2, (s0.a[1] + s0.b[1]) / 2], .45)) });
    for (const [dx, dy] of [[-15, -2], [-18, 2], [-13, 5]]) F.add({ mat: 'granite', prof: 'flat', grp: 'streak' + dx, noShadow: true, noOutline: true, shapes: [cap([c[0] + dx, c[1] + dy], [c[0] + dx - 5, c[1] + dy], .45)], tex: () => -1 });
    A.head = [c[0] + 4, c[1] - 3]; A.mouth = A.head; A.center = c;
    return;
  }
  const hurt = pose === 'hurt', b = [24 + (hurt ? -2 : 0), 33 + (idle ? f * .4 : 0)];
  // pebble limbs: a chain of small stones each; the far pair darker
  const limb = (pts, g, far) => F.add({ mat: rock, prof: 'round', bw: 1.4, grp: g, shapes: pts.map(([x, y], k) => circ([x, y], 2.1 - k * .3)), tex: far ? farTex(rtex(240)) : rtex(240) });
  limb([[b[0] - 7, b[1] + 6], [b[0] - 8.6, b[1] + 9], [b[0] - 9, b[1] + 11.4]], 'legF', true);
  limb(hurt ? [[b[0] - 9, b[1] - 1], [b[0] - 12.4, b[1] - 4], [b[0] - 14.6, b[1] - 7]] : [[b[0] - 9.6, b[1] + 1], [b[0] - 12, b[1] + 4.4], [b[0] - 12.6, b[1] + 7.6]], 'armF', true);
  // the heap: a big stone for the body, a smaller one for the head, a few more wedged in
  const stones = [[b[0], b[1], 9.6, 8.4], [b[0] + 3.4, b[1] - 9.6 + (hurt ? 1.6 : 0), 6.6, 5.6], [b[0] - 7, b[1] - 3.4, 4.4, 4.2], [b[0] + 8.4, b[1] + 2.6, 4.4, 4], [b[0] - 3.6, b[1] + 6.4, 4.6, 3.2]].concat(gT >= 1 ? [[b[0] - 4.6, b[1] - 8.4, 3.2, 3]] : []).concat(gT >= 2 ? [[b[0] + 9.6, b[1] - 5.2, 3, 3]] : []);
  stones.forEach(([x, y, rx, ry], k) => F.add({ mat: rock, prof: 'round', bw: Math.min(rx, ry) * .8, hs: .8, grp: 'stone' + k, shapes: [ell([x, y], rx, ry)], tex: rtex(230 + k) }));
  // hot ore in the seams between the stones (the second Waking), quartz crystals (the third)
  if (gT >= 2) F.add({ mat: seam, prof: 'flat', grp: 'seams', noShadow: true, shapes: chainC([[b[0] - 5.6, b[1] - 6.8], [b[0] - 2, b[1] - 3.6], [b[0] + 2, b[1] - 5], [b[0] + 6, b[1] - 2]], .5).concat(chainC([[b[0] - 1, b[1] + 4.4], [b[0] + 3, b[1] + 2.4], [b[0] + 6.6, b[1] + 4.4]], .45)) });
  if (gT >= 3) F.add({ mat: 'glass', prof: 'ridge', hs: .9, grp: 'quartz', shapes: spikesC([[b[0] - 5, b[1] - 7.6, -.5, -1, 5.4, 1.4], [b[0] - 3.4, b[1] - 8.4, -.1, -1, 6.8, 1.5], [b[0] + 7.2, b[1] - 1, .6, -1, 4.8, 1.3], [b[0] + 8.4, b[1] - .2, 1, -.5, 3.6, 1.1]]) });
  // the face: a crack for a mouth, two chips of mica for eyes
  const hc = [b[0] + 5.4, b[1] - 9.6 + (hurt ? 1.6 : 0)];
  F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, noOutline: true, shapes: [cap([hc[0] - 1, hc[1] + 3], [hc[0] + 3.6, hc[1] + 2.2], .5)] });
  if (hurt) F.add({ mat: 'dark', prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [cap([hc[0] - 1.6, hc[1] - .2], [hc[0] + .2, hc[1] - .2], .45), cap([hc[0] + 2, hc[1] - .4], [hc[0] + 3.8, hc[1] - .4], .45)] });
  else F.add({ mat: gT >= 2 ? seam : 'pearl', prof: 'ridge', grp: 'eyes', noShadow: true, shapes: [poly([[hc[0] - 1.4, hc[1] - .6], [hc[0] - .4, hc[1] - 1.6], [hc[0] + .4, hc[1] + .2]]), poly([[hc[0] + 2.2, hc[1] - .6], [hc[0] + 3.2, hc[1] - 1.8], [hc[0] + 3.8, hc[1] + .1]])] });
  limb([[b[0] + 6.4, b[1] + 6.4], [b[0] + 8, b[1] + 9.2], [b[0] + 8.6, b[1] + 11.6]], 'legN');
  limb(hurt ? [[b[0] + 9, b[1] - 3], [b[0] + 11, b[1] - 7], [b[0] + 12, b[1] - 10]] : [[b[0] + 10.4, b[1] - 1], [b[0] + 13, b[1] + 2.4], [b[0] + 14, b[1] + 5.6]], 'armN');
  if (hurt) F.add({ mat: rock, prof: 'round', bw: 1, grp: 'chip', shapes: [circ([b[0] + 13, b[1] - 13], 1.3), circ([b[0] + 16, b[1] - 9], .9)] });
  A.head = hc; A.mouth = [hc[0] + 1.4, hc[1] + 2.6]; A.center = b;
}

/* ---- FORGE-SPARK: a fist-sized living cinder: a bright ember core in a cage of slag, trailing sparks; it floats at
   head height and darts (40x40, ground 38). Hotter with every Waking; white at the last ---- */
function forgeSpark(F, st) {
  const { pose, f, gT } = st, A = st.anchors, lie = pose === 'ko';
  const core = gT >= 3 ? 'primal' : 'ember', hot = gT >= 2;
  if (lie) {
    F.add({ mat: 'slag', prof: 'round', bw: 2, grp: 'cinder', shapes: [ell([20, 36], 5.6, 2.8)], tex: ({ x, y }) => (hash(x, y, 250) < .3 ? -1 : 0) });
    F.add({ mat: 'ember', prof: 'flat', grp: 'lastglow', noShadow: true, shapes: [circ([19, 35.6], .9)] });
    A.head = [20, 34]; A.mouth = A.head; A.center = [20, 35];
    return;
  }
  const c = pose === 'attack' ? [26, 22] : pose === 'hurt' ? [17, 20] : [20, 19 + f * 1.2], R = 5.2 + gT * .3;
  // a dithered glow on the floor under it
  F.add({ mat: 'char', prof: 'flat', grp: 'floorglow', noShadow: true, noOutline: true, shapes: [ell([c[0], 36.8], 5.4, 1.1)], tex: ({ x, y }) => (pose !== 'hurt' && hash(x, y, 253) < .22 ? { m: 'ember', dd: -2 } : (x + y) & 1 ? -1 : 0) });
  // a tail of sparks drifting behind it
  const back = pose === 'attack' ? [-1, .25] : [-.9, .42];
  F.add({ mat: core, prof: 'round', bw: .6, grp: 'trail', noShadow: true, noOutline: true, shapes: [2, 4.4, 7, 9.8].map((d, k) => circ([c[0] + back[0] * (R + d) + (k & 1 ? 1 : -1) * .8, c[1] + back[1] * (R + d)], .9 - k * .14)) });
  // the core, then the slag cage over it
  F.add({ mat: core, prof: 'round', bw: 2, grp: 'core', noShadow: true, shapes: [circ(c, R * (pose === 'hurt' ? .7 : .86))] });
  if (hot) F.add({ mat: core, prof: 'round', bw: 1, grp: 'flames', noShadow: true, noOutline: true, shapes: spikesC([[c[0] - 2, c[1] - R * .7, -.2, -1, 3 + f, 1.2], [c[0] + 1.4, c[1] - R * .8, .15, -1, 4 - f, 1.3], [c[0] + 3.6, c[1] - R * .5, .5, -1, 2.4, 1]]) });
  const bars = []; for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI + .4; bars.push(cap([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R], [c[0] - Math.cos(a) * R, c[1] - Math.sin(a) * R], .95)); }
  bars.push(...[0, 1, 2, 3, 4, 5].map(k => { const a = k / 6 * Math.PI * 2; return cap([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R], [c[0] + Math.cos(a + 1.05) * R, c[1] + Math.sin(a + 1.05) * R], .9); }));
  F.add({ mat: 'slag', prof: 'round', bw: .9, grp: 'cage', shapes: bars.slice(0, 2 + gT).concat(bars.slice(4)), tex: ({ x, y }) => (hash(x, y, 251) < .2 ? { m: 'ember', dd: -1 } : 0) });
  // a pair of eyes in the heat
  if (pose !== 'hurt') F.add({ mat: 'dark', prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [cap([c[0] + .6, c[1] - .6], [c[0] + 1.6, c[1] - .4], .45), cap([c[0] + 3, c[1] - .4], [c[0] + 3.8, c[1] - .2], .4)] });
  if (pose === 'attack') F.add({ mat: core, prof: 'round', bw: .8, grp: 'flare', noShadow: true, noOutline: true, shapes: spikesC([[c[0] + R, c[1], 1, 0, 5, 1.4], [c[0] + R * .7, c[1] - R * .7, .7, -.7, 3.6, 1.1], [c[0] + R * .7, c[1] + R * .7, .7, .7, 3.6, 1.1]]) });
  A.head = c; A.mouth = c; A.center = c;
}
// draw a builder into a wider canvas: every shape it adds moved by (dx, dy), and the anchors it sets with them (the
// foot anchor stays the def's)
const moveShape = (s, dx, dy) => (s.k === 'c' ? { ...s, a: [s.a[0] + dx, s.a[1] + dy], b: [s.b[0] + dx, s.b[1] + dy] } : s.k === 'p' ? { ...s, pts: s.pts.map(([x, y]) => [x + dx, y + dy]) } : { ...s, c: [s.c[0] + dx, s.c[1] + dy] });
const shifted = (build, dx, dy) => (F, st) => {
  const foot = st.anchors.foot, mv = s => moveShape(s, dx, dy);
  const F2 = { w: F.w, h: F.h, get parts() { return F.parts; }, add: p => { p.shapes = p.shapes.map(mv); if (p.cuts) p.cuts = p.cuts.map(mv); if (p.clip) p.clip = mv(p.clip); return F.add(p); } };
  build(F2, st);
  for (const k of Object.keys(st.anchors)) { const a = st.anchors[k]; if (k !== 'foot' && a) st.anchors[k] = k === 'relics' ? a.map(q => [q[0] + dx, q[1] + dy]) : [a[0] + dx, a[1] + dy]; }
  st.anchors.foot = foot;
};
// sparks drifting up off the forge-spark (and more off the Bellows)
const sparkMotes = (n, spread = 10) => (t, a) => { const c = a.center || [20, 20], out = []; for (let k = 0; k < n; k++) { const ph = (t * (.5 + hash(k, 2, 252) * .4) + hash(k, 3, 252)) % 1; out.push({ x: c[0] - spread / 2 + hash(k, 1, 252) * spread + Math.sin(t * 3 + k) * 1.5, y: c[1] + 4 - ph * 24, c: k % 3 ? [255, 176, 74] : [255, 236, 170], a: Math.min(1, (1 - ph) * 2) * .9 }); } return out; };

Object.assign(FOE_ART, {
  'rime-wolf': { name: 'Rime Wolf', kind: 'beast', w: 72, h: 48, foot: [35, 45], defaultTier: 'rabble', build: shifted(rimeWolf, 4, 0) },
  rockling: { name: 'Rockling', kind: 'beast', w: 48, h: 48, foot: [24, 45], defaultTier: 'rabble', build: rockling },
  'forge-spark': { name: 'Forge-Spark', kind: 'beast', w: 40, h: 40, foot: [20, 38], defaultTier: 'rabble', build: forgeSpark, motes: sparkMotes(5) },
});


/* ---- IRON SENTINELS: a dwarven automaton of riveted iron plate, broad and squat, a rune-lit visor slit and an iron
   beard, a round dwarf shield and a fist like an anvil (64x64, ground 61). The Sentinel-Captain is taller, crested,
   banded in gold runes, and holds Ironwall (80x80, ground 77). One builder, in a 64x64 base space mapped by
   S = { k, dx, dy }. The Waking: rust (0), clean iron and bronze rivets (1), steel bands and more runes (2), black
   iron, gold and steam (3) ---- */
function sentinel(F, st, S) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, k = S.k, capt = !!S.captain, T = p => [S.dx + p[0] * k, S.dy + p[1] * k], R = r => r * k;
  const idle = !pose || pose === 'idle', kneel = pose === 'ko';
  const M = gT >= 3 ? 'blackiron' : 'iron', trim = capt || gT >= 3 ? 'gold' : gT >= 2 ? 'steel' : 'bronze', rune = 'amber';
  let bx = 0, by = idle ? f * .5 : 0, tilt = 0, dim = false;
  let J = { hipF: [27.4, 45], knF: [26.4, 52], ftF: [25.4, 59.6], hipN: [37, 45], knN: [38.6, 52], ftN: [39.8, 59.6], shF: [22.4, 27.6], elF: [30.6, 35], haF: [42.6, 37.4], shN: [43.4, 27.4], elN: [45.4, 37], haN: [45.8, 46], head: [34.6, 18.4] };
  if (pose === 'attack') { bx = 1; tilt = .12; J = Object.assign(J, { elN: [48.6, 30.4], haN: [53.4, 30.2], elF: [30.4, 34], haF: [41.4, 35.6] }); }
  else if (pose === 'hurt') { bx = -2.4; tilt = -.2; dim = true; J = Object.assign(J, { elN: [43.6, 38], haN: [42.6, 46.6], haF: [40.6, 38.6] }); }
  else if (kneel) {
    by = 8.6; tilt = .5; dim = true;
    J = { hipF: [27.4, 53.4], knF: [25.4, 59.8], ftF: [18.4, 60.4], hipN: [37, 53.6], knN: [41.4, 59.8], ftN: [33.4, 60.6], shF: [22.4, 36], elF: [27.6, 45.4], haF: [34, 54], shN: [43.4, 36], elN: [46.6, 46], haN: [48.4, 55.6], head: [38.4, 29.4] };
  }
  const B = p => T([p[0] + bx, p[1] + by]), U = p => (kneel ? T(p) : B(p)), L = p => T(p);
  const plateTex = seed => ({ x, y }) => { if (gT === 0 && vnoise(x * .3, y * .3, seed) > .74) return { m: 'rust', dd: hash(x, y, seed) < .4 ? -1 : 0 }; return (y % Math.round(4 * k) === 0 ? -.8 : 0) + (hash(x, y, seed) < .05 ? -1 : 0); };
  const plate = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: M, prof: 'round', bw: R(2.4), grp: g, shapes, tex: far ? farTex(plateTex(seed)) : plateTex(seed) }, o));
  const rivets = (pts, g) => F.add({ mat: trim, prof: 'round', bw: .6, grp: g, noShadow: true, shapes: pts.map(p => circ(p, R(.8))) });
  const J2 = {}; for (const key of Object.keys(J)) J2[key] = (key.startsWith('hip') || key.startsWith('kn') || key.startsWith('ft')) ? (kneel ? T(J[key]) : key.startsWith('hip') ? B(J[key]) : L(J[key])) : U(J[key]);
  // a leg: a thick thigh, a knee-cop, a greave and a flat iron boot
  const leg = (h, kn, ft, g, far) => {
    plate([cap(h, kn, R(4.2), R(3.8))], g + 'th', 301, far); plate([circ(kn, R(3))], g + 'kn', 302, far);
    plate([cap(kn, [ft[0], ft[1] - R(2)], R(3.8), R(3.4))], g + 'sh', 303, far);
    plate([poly([[ft[0] - R(4.4), ft[1] - R(3.4)], [ft[0] + R(3.6), ft[1] - R(3.4)], [ft[0] + R(6.2), ft[1] + R(.4)], [ft[0] - R(4.6), ft[1] + R(.4)]])], g + 'ft', 304, far, { bw: R(1.4) });
  };
  leg(J2.hipF, J2.knF, J2.ftF, 'legF', true);
  // the far pauldron, the far arm, and the shield it holds forward (Ironwall for the Captain)
  plate([ell(J2.shF, R(6.6), R(5.6))], 'pdF', 305, true, { bw: R(3) });
  plate([cap(J2.shF, J2.elF, R(3.6), R(3.2)), cap(J2.elF, J2.haF, R(3.2), R(2.8))], 'armF', 306, true);
  if (capt) { // the Captain's far hand is a fist too
    const fa0 = Math.atan2(J2.haF[1] - J2.elF[1], J2.haF[0] - J2.elF[0]), f0 = frame(J2.haF[0], J2.haF[1], fa0);
    plate([f0.poly([[-R(1), -R(3.6)], [R(5), -R(4)], [R(6), -R(2.8)], [R(6), R(2.8)], [R(5), R(4)], [-R(1), R(3.6)]])], 'fistF', 318, true, { bw: R(1.6) });
  } else {
    const c = [J2.haF[0] + R(9), J2.haF[1] - R(1.6)], r = R(9.2);
    F.add({ mat: M, prof: 'round', bw: R(5), hs: .6, grp: 'shield', shapes: [circ(c, r)], tex: ({ x, y }) => (gT === 0 && vnoise(x * .3, y * .3, 307) > .66 ? { m: 'rust', dd: 0 } : Math.hypot(x - c[0], y - c[1]) % R(3.2) < .9 ? -1 : 0) });
    F.add({ mat: trim, prof: 'round', bw: R(1.2), grp: 'shieldrim', shapes: [circ(c, r)], cuts: [circ(c, r - R(1.6))] });
    F.add({ mat: trim, prof: 'round', bw: R(2.4), grp: 'shieldboss', shapes: [circ(c, R(3.1))] });
    if (gT >= 2) F.add({ mat: rune, prof: 'flat', grp: 'shieldrunes', noShadow: true, shapes: [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2 + .3; return cap([c[0] + Math.cos(a) * r * .66, c[1] + Math.sin(a) * r * .66], [c[0] + Math.cos(a + .3) * r * .66, c[1] + Math.sin(a + .3) * r * .66], R(.5)); }) });
  }
  // the body: plate faulds, a barrel of a cuirass, a belt, the chest rune (the Captain's gold rune-band)
  const C = U([33.4, 35]), W = U([33.2, 44.6]);
  for (let i = 0; i < 2; i++) plate([poly([[W[0] - R(10.6 + i), W[1] + R(i * 3.4)], [W[0] + R(10.6 + i), W[1] + R(i * 3.4)], [W[0] + R(11.4 + i), W[1] + R(3.6 + i * 3.4)], [W[0] - R(11.4 + i), W[1] + R(3.6 + i * 3.4)]])], 'fauld' + i, 308 + i, false, { bw: R(1.2) });
  plate([ell(C, R(12.8), R(11.6))], 'cuirass', 310, false, { bw: R(5), hs: .8 });
  F.add({ mat: 'leatherDark', prof: 'round', bw: R(1), grp: 'belt', shapes: [cap([C[0] - R(11.6), C[1] + R(8.8)], [C[0] + R(11.6), C[1] + R(8.8)], R(1.4))] });
  F.add({ mat: trim, prof: 'bevel', bw: R(.8), grp: 'buckle', shapes: [poly([[C[0] - R(1.8), C[1] + R(7.2)], [C[0] + R(1.8), C[1] + R(7.2)], [C[0] + R(1.8), C[1] + R(10.4)], [C[0] - R(1.8), C[1] + R(10.4)]])] });
  rivets([[-10, -3], [-7.4, -8.6], [-2, -11], [4, -10.8], [9, -7.6], [11, -2.6], [-9.4, 3.6], [10.4, 3.4]].map(([dx, dy]) => [C[0] + R(dx), C[1] + R(dy)]), 'rivets');
  if (capt) {
    F.add({ mat: 'gold', prof: 'round', bw: R(1.2), grp: 'runeband', shapes: [cap([C[0] - R(12), C[1] - R(1.2)], [C[0] + R(12), C[1] - R(1.2)], R(1.7))] });
    F.add({ mat: rune, prof: 'flat', grp: 'bandrunes', noShadow: true, shapes: [-8, -4, 0, 4, 8].map(dx => cap([C[0] + R(dx - .8), C[1] - R(2.2)], [C[0] + R(dx + .6), C[1] - R(.2)], R(.45))) });
  }
  const ru = [[0, -7.4, 0, -1.4], [0, -4.4, 3, -6.8], [0, -4.4, -3, -6.8]].concat(gT >= 2 ? [[-4, 1.6, 4, 1.6]] : []);
  F.add({ mat: dim && gT < 2 ? 'dark' : rune, prof: 'flat', grp: 'chestrune', noShadow: true, shapes: ru.map(([a, b2, c2, d2]) => cap([C[0] + R(a), C[1] + R(b2)], [C[0] + R(c2), C[1] + R(d2)], R(.55))) });
  leg(J2.hipN, J2.knN, J2.ftN, 'legN', false);
  // the head: a bucket helm sunk between the shoulders, the visor slit alight, an iron beard in braids; the Captain's crest
  const hf = frame(...J2.head, tilt);
  if (capt) F.add({ mat: 'gold', prof: 'ridge', hs: .9, grp: 'crest', shapes: [hf.poly([[-R(5.6), -R(5)], [-R(2), -R(11.6)], [R(3.6), -R(10.2)], [R(4.6), -R(5)]])] });
  plate([hf.poly([[-R(6.4), R(5.6)], [-R(6.8), -R(2)], [-R(5), -R(5.8)], [0, -R(7)], [R(5), -R(5.8)], [R(6.8), -R(2)], [R(6.6), R(5.6)]])], 'helm', 311, false, { bw: R(3) });
  F.add({ mat: 'dark', prof: 'flat', grp: 'visor', noShadow: true, shapes: [hf.cap(-R(.6), R(1), R(6.6), R(1), R(1))] });
  F.add({ mat: dim ? 'dark' : rune, prof: 'flat', grp: 'visorglow', noShadow: true, noOutline: true, shapes: [hf.cap(R(.8), R(1), R(5.8), R(1), R(.5))] });
  plate([hf.poly([[R(-.4), R(4.8)], [R(6.8), R(4.8)], [R(5.2), R(9.4)], [R(2.4), R(11.2)], [R(.6), R(8.6)]])], 'beard', 312, false, { bw: R(1.2), tex: ({ x, y }) => ((x + y) % Math.max(2, Math.round(2.6 * k)) === 0 ? -1.2 : 0) });
  // pauldron over the near shoulder, then the near arm and the anvil fist
  plate([ell(J2.shN, R(7), R(5.8))], 'pdN', 313, false, { bw: R(3.2) });
  rivets([[-4, -1.6], [0, -3.4], [4, -1.8]].map(([dx, dy]) => [J2.shN[0] + R(dx), J2.shN[1] + R(dy)]), 'pdNr');
  plate([cap(J2.shN, J2.elN, R(3.8), R(3.4))], 'armN', 314);
  plate([circ(J2.elN, R(2.8))], 'elbowN', 315);
  plate([cap(J2.elN, J2.haN, R(3.4), R(3))], 'foreN', 316);
  const fa = Math.atan2(J2.haN[1] - J2.elN[1], J2.haN[0] - J2.elN[0]), ff = frame(J2.haN[0], J2.haN[1], fa);
  plate([ff.poly([[-R(1), -R(4.4)], [R(6.4), -R(4.8)], [R(7.6), -R(3.4)], [R(7.6), R(3.4)], [R(6.4), R(4.8)], [-R(1), R(4.4)]])], 'fist', 317, false, { bw: R(2) });
  F.add({ mat: trim, prof: 'round', bw: R(.8), grp: 'knuckles', shapes: [ff.cap(R(6.2), -R(3.6), R(6.2), R(3.6), R(.9))] });
  const wall = capt && relic && held ? relicArt(relic) : null;
  if (wall) {
    const at = kneel ? [J2.haN[0] - R(2), J2.haN[1] - R(6)] : pose === 'attack' ? [J2.haN[0] + R(1), J2.haN[1] + R(2)] : [J2.haN[0] - R(3.4), J2.haN[1] - R(6.6)];
    const m = drawRelic(F, wall, at, kneel ? .5 : pose === 'hurt' ? -.12 : 0, .43 * k, { center: [32, 33] });
    if (m) A.relic = m([32, 30]);
  } else if (capt) {
    F.add({ mat: trim, prof: 'bevel', bw: R(1), grp: 'bracket', shapes: [poly([[J2.elN[0] - R(1.6), J2.elN[1] + R(1)], [J2.elN[0] + R(2), J2.elN[1] + R(1)], [J2.elN[0] + R(2), J2.elN[1] + R(5.4)], [J2.elN[0] - R(1.6), J2.elN[1] + R(5.4)]])] });
  }
  if (gT >= 3 && !kneel) F.add({ mat: 'mist', prof: 'flat', grp: 'steam', noShadow: true, noOutline: true, shapes: [circ([J2.shN[0] + R(1), J2.shN[1] - R(6.6) - f], R(1.8)), circ([J2.shN[0] + R(3), J2.shN[1] - R(9.4) - f], R(1.2)), circ([J2.shF[0] - R(1), J2.shF[1] - R(6.6) + f * .5], R(1.5))], tex: ({ x, y }) => ((x + y) & 1 ? -1 : 0) });
  A.head = hf.P(R(3), R(1)); A.mouth = hf.P(R(3), R(6)); A.center = C;
}
const ironSentinel = (F, st) => sentinel(F, st, { k: 1, dx: 0, dy: 0 });
const sentinelCaptain = (F, st) => sentinel(F, st, { k: 1.16, dx: 2.9, dy: 6.2, captain: true });

/* ---- FORGEBORN: Harrow's molten servants: a hunched man-shape of black slag with the heat showing in its cracks,
   a furnace glowing behind the grate of its chest (64x64, ground 61). The Bellows carries a great leather bellows on
   its back and breathes sparks out of the nozzle (72x72, ground 69). Harrow's Journeyman stands straighter, half man
   and half forge: a smith's apron and cap over the slag, one hand still flesh, carrying Harrow's Runestaff (64x72,
   ground 69). The Waking opens the cracks (0-2) and burns the heart white (3) ---- */
function forgeborn(F, st, S) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, k = S.k, T = p => [S.dx + p[0] * k, S.dy + p[1] * k], R = r => r * k;
  const idle = !pose || pose === 'idle', lie = pose === 'ko', jm = S.variant === 'journeyman', bel = S.variant === 'bellows';
  const heat = gT >= 3 ? 'heat' : 'ember', core = gT >= 3 ? 'primal' : 'ember', cr = .022 + gT * .009;
  const slagTex = seed => ({ x, y }) => { const n = Math.abs(vnoise(x * .2 / k, y * .2 / k, seed) - .5); if (n < cr) return { m: 'ember', dd: n < cr * .4 ? 1 : 0 }; return vnoise(x * .3, y * .3, seed + 1) > .72 ? -1 : vnoise(x * .5, y * .5, seed + 2) < .25 ? .6 : 0; };
  const slag = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: 'slag', prof: 'round', bw: R(2.4), grp: g, shapes, tex: far ? farTex(slagTex(seed)) : slagTex(seed) }, o));
  const hunch = jm ? 0 : 1;
  let bx = 0, by = idle ? f * .6 : 0, J;
  J = { hipF: [27, 43], knF: [24.6, 51.4], ftF: [23.4, 59.8], hipN: [34.6, 43.4], knN: [37.4, 51.4], ftN: [38.6, 59.8], back: [28.6, 27 + hunch * 1.4], chest: [36, 32 + hunch], belly: [32.4, 39.4], shF: [27, 26.4 + hunch * 2], elF: [22.6, 36.6], haF: [24.4, 46.2], shN: [40, 27.4 + hunch * 2], elN: [44.6, 36.6], haN: [47.4, 44.6], head: [45 - (jm ? 4 : 0), 22.6 + hunch * 2.4 - (jm ? 3.6 : 0)] };
  if (jm) Object.assign(J, { elN: [45.4, 33.6], haN: [48.6, 39.4], back: [30.6, 26.4], chest: [36.4, 30.4], belly: [33.4, 39.6], shF: [28.6, 24], shN: [40.6, 24.6], elF: [24.6, 33.6], haF: [25.4, 42.6] });
  if (pose === 'attack') { bx = 1.6; Object.assign(J, { elN: [49.4, 30], haN: [54.4, 28.4], head: [J.head[0] + 2, J.head[1] + 1] }); if (jm) Object.assign(J, { elN: [47.4, 29], haN: [50.6, 24.4] }); }
  else if (pose === 'hurt') { bx = -2.6; by = -.6; Object.assign(J, { head: [J.head[0] - 3, J.head[1] - 1.6], elN: [42, 34], haN: [41.4, 26.6], elF: [20.4, 33], haF: [16.4, 27.4] }); }
  else if (lie) {
    J = { hipF: [22, 55], knF: [15, 57.4], ftF: [8, 60], hipN: [24, 57], knN: [17, 59.6], ftN: [10, 60.8], back: [34, 52.6], chest: [38, 56], belly: [28.4, 56.4], shF: [40, 52], elF: [45.6, 50.4], haF: [51.6, 53.6], shN: [41, 57.6], elN: [47.4, 59.2], haN: [54, 59.6], head: [49.6, 55.4] };
  }
  const B = p => T(lie ? p : [p[0] + bx, p[1] + by]), P = {}; for (const key of Object.keys(J)) P[key] = key.startsWith('hip') || key.startsWith('kn') || key.startsWith('ft') ? (lie ? T(J[key]) : key.startsWith('hip') ? B(J[key]) : T(J[key])) : B(J[key]);
  const limb = (pts, rs, g, seed, far) => slag(chainC(pts, rs.map(R)), g, seed, far, { bw: R(rs[0] * .7) });
  const hand = (h, dir, g, far, flesh) => {
    const Sh = [circ(h, R(2.6))]; for (const [a, l] of [[-.5, 4], [-.1, 4.6], [.3, 4.2]]) { const d = rot2(dir, a); Sh.push(cap(h, [h[0] + d[0] * R(l), h[1] + d[1] * R(l)], R(1.3), R(.8))); }
    if (flesh) F.add({ mat: 'skinTan', prof: 'round', bw: R(1.2), grp: g, shapes: Sh, tex: far ? DARK : null });
    else slag(Sh, g, 321, far, { bw: R(1.2) });
  };
  // legs, the far arm
  limb([P.hipF, P.knF, P.ftF], [4, 3.2, 2.6], 'legF', 322, true);
  slag([ell([P.ftF[0] + R(1.6), P.ftF[1] + R(.4)], R(3.8), R(1.6))], 'footF', 323, true, { bw: R(1.2) });
  limb([P.shF, P.elF, P.haF], [3.6, 3, 2.6], 'armF', 324, true); hand(P.haF, lie ? [1, .2] : [.1, 1], 'handF', true, false);
  // the Bellows: a great leather bellows strapped on its back, the nozzle over the shoulder (the boards squeeze with each
  // breath), sparks puffing out of it
  if (bel && !lie) {
    const sq = idle ? f * .6 : pose === 'attack' ? 1.2 : 0, b0 = B([20.6, 25.6]);
    F.add({ mat: 'wood', prof: 'bevel', bw: R(1.2), grp: 'board1', shapes: [poly([[b0[0] - R(9), b0[1] - R(2)], [b0[0] + R(4), b0[1] - R(9)], [b0[0] + R(8.6), b0[1] - R(5.6)], [b0[0] - R(4.4), b0[1] + R(3.4)]])], tex: TX.grain(331) });
    F.add({ mat: 'leatherDark', prof: 'round', bw: R(2.6), grp: 'pleats', shapes: [poly([[b0[0] - R(8.4), b0[1] - R(.4)], [b0[0] + R(6.6), b0[1] - R(7.6 - sq)], [b0[0] + R(8.6), b0[1] + R(1.4)], [b0[0] - R(4), b0[1] + R(7.4)]])], tex: ({ x, y }) => ((x - y + 99) % Math.round(3 * k) === 0 ? -1.4 : .2) });
    F.add({ mat: 'wood', prof: 'bevel', bw: R(1.2), grp: 'board2', shapes: [poly([[b0[0] - R(5), b0[1] + R(5.4 - sq * .5)], [b0[0] + R(8.4), b0[1] - R(1.4 + sq)], [b0[0] + R(11.4), b0[1] + R(2.6 - sq)], [b0[0] - R(1.4), b0[1] + R(9.6)]])], tex: TX.grain(332) });
    F.add({ mat: 'brass', prof: 'round', bw: R(1.2), grp: 'nozzle', shapes: chainC([[b0[0] + R(6), b0[1] - R(6.6)], [b0[0] + R(10), b0[1] - R(12.4)], [b0[0] + R(15.4), b0[1] - R(14.4)]], [R(1.8), R(1.5), R(1.1)]) });
    F.add({ mat: 'iron', prof: 'round', bw: R(.8), grp: 'bellowstraps', shapes: [cap([b0[0] + R(3), b0[1] - R(1)], B([36, 30]), R(.8)), cap([b0[0] + R(6), b0[1] + R(4)], B([33, 40]), R(.8))] });
    A.nozzle = [b0[0] + R(16), b0[1] - R(14.6)];
    F.add({ mat: core, prof: 'round', bw: .6, grp: 'nozzlesparks', noShadow: true, noOutline: true, shapes: [circ([A.nozzle[0] + R(1.6), A.nozzle[1] - R(.6) - f], R(.8)), circ([A.nozzle[0] + R(3.4), A.nozzle[1] - R(2.4)], R(.6)), circ([A.nozzle[0] + R(2.4), A.nozzle[1] + R(1.4) + f], R(.5))] });
  }
  // the body: a hump of slag, the belly, the chest with its furnace
  slag([ell(P.back, R(10.4), R(9.4)), ell(P.belly, R(9.4), R(8)), ell(P.chest, R(9.8), R(9.2))], 'body', 325, false, { bw: R(5), hs: .8 });
  if (jm && !lie) { // the smith's apron
    const a0 = B([35.4, 30]);
    F.add({ mat: 'leather', prof: 'round', bw: R(2), grp: 'apron', shapes: [poly([[a0[0] - R(5.2), a0[1]], [a0[0] + R(5), a0[1]], [a0[0] + R(7.4), a0[1] + R(19.6)], [a0[0] - R(6.4), a0[1] + R(20.2)]])], tex: ({ x, y }) => (hash(x, y, 333) < .1 ? { m: 'char', dd: 0 } : (x + y * 3) % 11 === 0 ? -1 : 0) });
    F.add({ mat: 'leather', prof: 'round', bw: R(.6), grp: 'apronstrap', shapes: [cap([a0[0] - R(4.8), a0[1] + R(.4)], B([40, 21]), R(.6))] });
  }
  limb([P.hipN, P.knN, P.ftN], [4.2, 3.4, 2.8], 'legN', 326, false);
  slag([ell([P.ftN[0] + R(1.8), P.ftN[1] + R(.4)], R(4), R(1.7))], 'footN', 327, false, { bw: R(1.2) });
  // the head: a lump of slag thrust forward, eye-holes and a mouth full of fire (the Journeyman: a smith's cap, one eye
  // still a man's)
  const hf = frame(...P.head, lie ? .2 : pose === 'hurt' ? -.3 : .1);
  slag([cap(hf.P(-R(6), R(3)), B(J.chest), R(3.4), R(4.4))], 'neck', 328);
  slag([rell(hf, 0, 0, R(6.4), R(5.8)), hf.cap(R(1), R(1.6), R(6.4), R(2.4), R(3.8), R(2.8))], 'head', 329, false, { bw: R(3.4) });
  F.add({ mat: pose === 'hurt' ? 'dark' : core, prof: 'flat', grp: 'mouthfire', noShadow: true, shapes: [hf.cap(R(2), R(3.8), R(6.8), R(3.4), R(1))] });
  if (jm) {
    F.add({ mat: 'leatherDark', prof: 'round', bw: R(1.6), grp: 'cap', shapes: [hf.poly([[-R(6), -R(1.4)], [-R(5), -R(5.4)], [R(1), -R(6.4)], [R(5.6), -R(3.4)], [R(6), -R(1)]])] });
    F.add({ mat: 'clothWhite', prof: 'flat', grp: 'maneye', noShadow: true, noOutline: true, shapes: [hf.ell(R(3.4), -R(.4), R(1.2), R(.8))] });
    F.add({ mat: 'dark', prof: 'flat', grp: 'manpupil', noShadow: true, noOutline: true, shapes: [hf.circ(R(3.8), -R(.4), R(.5))] });
    eyeOf(F, hf, -R(.6), -R(.6), R(1), R(.7), heat, pose === 'hurt', 'forgeeye');
  } else {
    eyeOf(F, hf, R(3.4), -R(1), R(1.5), R(1), core, false, 'eyeN'); eyeOf(F, hf, -R(.4), -R(1.4), R(1.1), R(.8), core, false, 'eyeF');
  }
  // the furnace behind the grate of its chest (over the neck, so the head never hides it)
  const gc = jm ? (lie ? [P.chest[0] - R(1), P.chest[1] - R(2)] : B([35.4, 25.4])) : lie ? [P.chest[0] - R(2), P.chest[1] - R(1)] : [P.chest[0] - R(3.4), P.chest[1] + R(3)];
  const fw = R(jm ? 3.2 : 4.6), fh = R(jm ? 2.6 : 3.8);
  F.add({ mat: 'blackiron', prof: 'round', bw: R(1), grp: 'furnaceframe', shapes: [ell(gc, fw + R(1.2), fh + R(1.2))] });
  F.add({ mat: 'ember', prof: 'round', bw: R(1.4), grp: 'furnace', noShadow: true, shapes: [ell(gc, fw, fh)], tex: ({ x, y }) => (Math.hypot((x + .5 - gc[0]) / fw, (y + .5 - gc[1]) / fh) < .45 ? 1 : 0) + (gT >= 3 ? 1 : 0) });
  F.add({ mat: 'blackiron', prof: 'round', bw: R(.6), grp: 'grate', shapes: [-.5, 0, .5].map(d => cap([gc[0] + fw * d * 1.2, gc[1] - fh * .9], [gc[0] + fw * d * 1.2, gc[1] + fh * .9], R(.55))) });
  if (gT >= 3 && !lie) F.add({ mat: 'ember', prof: 'round', bw: R(1), grp: 'flames', noShadow: true, noOutline: true, shapes: spikesC([[P.shN[0], P.shN[1] - R(2), .1, -1, R(5 + f), R(1.6)], [P.shF[0] + R(1), P.shF[1] - R(2), -.2, -1, R(4.2 - f * .6), R(1.4)], [P.back[0] - R(2), P.back[1] - R(7), -.3, -1, R(3.6), R(1.2)]]) });
  // the near arm; molten drops off the hand from the second Waking
  limb([P.shN, P.elN, P.haN], [3.8, 3.2, 2.8], 'armN', 330, false);
  const staff = jm && relic && held ? relicArt(relic) : null;
  if (staff) {
    const up = pose === 'attack' ? [.3, -1] : pose === 'hurt' ? [-.2, -1] : [.04, -1], ang = Math.atan2(up[1], up[0]);
    const m = drawItem(F, staff, [P.haN[0], P.haN[1]], ang + Math.PI / 4, .42 * k, { center: cardPt(staff, 36) });
    A.relic = m(cardPt(staff, 58 + 8)); A.weaponTip = A.relic;
  }
  hand(P.haN, pose === 'attack' ? [1, -.3] : lie ? [1, 0] : [.2, 1], 'handN', false, jm);
  if (gT >= 2 && !lie) F.add({ mat: heat, prof: 'round', bw: R(.8), grp: 'drips', noShadow: true, shapes: [cap([P.haF[0], P.haF[1] + R(3.4)], [P.haF[0], P.haF[1] + R(5.6 + f)], R(.7), R(.9)), cap([P.belly[0] + R(4), P.belly[1] + R(7)], [P.belly[0] + R(4), P.belly[1] + R(9.4)], R(.6), R(.8))] });
  A.head = hf.P(R(3), -R(1)); A.mouth = hf.P(R(4), R(3.4)); A.center = lie ? T([32, 55]) : P.chest;
}
const forgebornBase = (F, st) => forgeborn(F, st, { k: 1, dx: 0, dy: 0 });
const bellowsBuild = (F, st) => forgeborn(F, st, { k: 1.12, dx: 0, dy: .7, variant: 'bellows' });
const journeymanBuild = (F, st) => forgeborn(F, st, { k: 1.05, dx: -1.6, dy: 4.9, variant: 'journeyman' });

/* ---- PEAK-TROLLS: a big grey-green troll of the high passes, mossed like a boulder with stone warts, long arms, a
   tree-limb for a club; a wound on it knitting while you watch (72x72, ground 69). Old Horn is older and bigger: one
   great horn and one broken, a grey muzzle, and the Trollhide Mantle over his shoulders (88x88, ground 85). The Waking:
   snow on its shoulders and a wound that knits (1), plates of rock grown over its back and an iron band on the club
   (2), quartz crystals through the rock and eyes like hot ore (3) ---- */
function troll(F, st, S) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, k = S.k, T = p => [S.dx + p[0] * k, S.dy + p[1] * k], R = r => r * k;
  const idle = !pose || pose === 'idle', lie = pose === 'ko', old = !!S.old;
  const hide = 'trollHide', eyeM = gT >= 3 ? 'amber' : gT >= 2 ? 'eyeRed' : 'dark';
  const htex = seed => ({ x, y, ny }) => {
    if (gT >= 1 && ny < -.55 && vnoise(x * .4, y * .4, seed + 3) > .5) return { m: 'snow', dd: -1 };
    const n = vnoise(x * .35 / k, y * .35 / k, seed); if (n > .78) return { m: 'moss', dd: 0 };
    return n < .22 ? 1 : (x * 2 + y) % 7 === 0 ? -1 : 0;
  };
  const skin = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: hide, prof: 'round', bw: R(3), grp: g, shapes, tex: far ? farTex(htex(seed)) : htex(seed) }, o));
  let bx = 0, by = idle ? f * .7 : 0, J = { hipF: [30.4, 50], knF: [27.6, 58.6], ftF: [26.4, 67.6], hipN: [40, 50.4], knN: [43.6, 58.6], ftN: [45.4, 67.6], belly: [35.4, 46.6], chest: [37, 35.4], hump: [29, 30.6], shF: [28.6, 31.6], elF: [22.4, 44], haF: [23.6, 56.6], shN: [43, 33], elN: [49.4, 44.4], haN: [51.2, 55.4], head: [49.4, 29.4] };
  let club = [[51.2, 55.4], [66, 65.6]], ha = .06, eye = 'open';
  if (pose === 'attack') { bx = 2.6; Object.assign(J, { elN: [50.6, 25.4], haN: [55.4, 16.4], head: [52, 31] }); club = [[55.4, 16.4], [62.6, 5.8]]; ha = .2; }
  else if (pose === 'hurt') { bx = -3; by = -.6; Object.assign(J, { head: [44.4, 25.6], elN: [47, 41.6], haN: [48.4, 52], elF: [19.6, 40], haF: [18.4, 50.6] }); club = [[48.4, 52], [58.4, 64.6]]; ha = -.28; eye = 'shut'; }
  else if (lie) {
    J = { hipF: [24, 60], knF: [16.4, 62.4], ftF: [8.4, 66.4], hipN: [26, 63.4], knN: [18, 65.4], ftN: [10, 68.2], belly: [31, 60.4], chest: [41.4, 60], hump: [37.4, 55.6], shF: [45, 56.6], elF: [52.4, 54.6], haF: [59.4, 57.6], shN: [45, 62.4], elN: [52, 65.4], haN: [60.4, 66.4], head: [54.6, 58.6] };
    club = [[60.4, 66.4], [45.4, 67.6]]; ha = .5; eye = 'shut';
  }
  const B = p => T(lie ? p : [p[0] + bx, p[1] + by]), P = {}; for (const key of Object.keys(J)) P[key] = key.startsWith('hip') || key.startsWith('kn') || key.startsWith('ft') ? (lie ? T(J[key]) : key.startsWith('hip') ? B(J[key]) : T(J[key])) : B(J[key]);
  const limb = (pts, rs, g, seed, far) => skin(chainC(pts, rs.map(R)), g, seed, far, { bw: R(rs[0] * .7) });
  const foot = (p, g, far) => { skin([ell([p[0] + R(2.2), p[1] + R(.2)], R(4.6), R(1.8))], g, 341, far, { bw: R(1.2) }); F.add({ mat: 'claw', prof: 'round', bw: R(.6), grp: g + 'toes', shapes: [circ([p[0] + R(6.4), p[1] + R(.8)], R(.9)), circ([p[0] + R(4.8), p[1] + R(1.2)], R(.9))], tex: far ? DARK : null }); };
  const hand = (h, g, far) => skin([circ(h, R(3.2)), cap(h, [h[0] + R(2.6), h[1] + R(3)], R(1.6), R(1)), cap(h, [h[0] - R(1.2), h[1] + R(3.4)], R(1.5), R(.9))], g, 342, far, { bw: R(1.4) });
  // the far leg and the far arm
  limb([P.hipF, P.knF, P.ftF], [5, 4, 3.2], 'legF', 343, true); foot(P.ftF, 'footF', true);
  limb([P.shF, P.elF, P.haF], [4.4, 3.6, 3], 'armF', 344, true); hand(P.haF, 'handF', true);
  // the body: a hump, a chest, a pot-belly, mossy stone warts
  skin([ell(P.hump, R(11.4), R(10)), ell(P.chest, R(11.6), R(10.2)), ell(P.belly, R(11.2), R(9.4))], 'body', 345, false, { bw: R(6), hs: .8 });
  const warts = [[-6, -6.4], [-1.4, -8], [-9.6, -1.8], [5, -5]].map(([dx, dy]) => [P.hump[0] + R(dx), P.hump[1] + R(dy)]);
  F.add({ mat: 'scree', prof: 'round', bw: R(1.2), grp: 'warts', shapes: warts.map((p, i) => circ(p, R(1.6 - i * .15))), tex: ({ x, y }) => (vnoise(x * .5, y * .5, 346) > .55 ? { m: 'moss', dd: 0 } : 0) });
  if (gT >= 2 && !lie) F.add({ mat: 'slate', prof: 'bevel', bw: R(1.4), grp: 'rockplates', shapes: [[-4, -4, 5.6, 4.4, -.4], [3.4, -5, 4.6, 3.8, .3], [-10, 1, 4.4, 4, -.8]].map(([dx, dy, w, h, a]) => { const c0 = [P.hump[0] + R(dx), P.hump[1] + R(dy)], fr = frame(c0[0], c0[1], a); return fr.poly([[-R(w), R(h * .4)], [-R(w * .5), -R(h)], [R(w * .6), -R(h * .8)], [R(w), R(h * .3)], [0, R(h)]]); }), tex: ({ x, y }) => (hash(x, y, 347) < .1 ? -1 : 0) });
  if (gT >= 3 && !lie) F.add({ mat: 'glass', prof: 'ridge', hs: .9, grp: 'quartz', shapes: spikesC([[P.hump[0] - R(3), P.hump[1] - R(8), -.3, -1, R(6), R(1.5)], [P.hump[0] + R(1), P.hump[1] - R(9.4), .1, -1, R(7.4), R(1.6)], [P.hump[0] + R(5.6), P.hump[1] - R(7), .5, -1, R(5), R(1.3)]]) });
  // wounds that knit while you watch: a raw gash across the belly, pale new skin drawn over it in threads
  if (!lie) {
    const w0 = B(old ? [33.4, 44.6] : [30.6, 42.4]), wa = add2(w0, [-R(4), -R(3)]), wb = add2(w0, [R(3.6), R(2.8)]), wd = [wb[0] - wa[0], wb[1] - wa[1]];
    F.add({ mat: 'flesh', prof: 'round', bw: R(.8), grp: 'wound', noShadow: true, shapes: [cap(wa, wb, R(.8), R(1.2))], tex: () => -1 });
    const n = gT >= 2 ? 4 : 3; F.add({ mat: 'wolfPale', prof: 'round', bw: R(.4), grp: 'knit', noShadow: true, shapes: Array.from({ length: n }, (_, j) => { const u = (j + .6) / (n + .2), c = [wa[0] + wd[0] * u, wa[1] + wd[1] * u]; return cap([c[0] - R(1.1), c[1] + R(1.4)], [c[0] + R(1.1), c[1] - R(1.4)], R(.36)); }) });
  }
  // Old Horn: the Trollhide Mantle over his shoulders, the relic's own patchwork of the hides of trolls who argued with
  // him (green hide, grizzled hide, dark hide, stitched along every seam), a grizzled ruff at the neck, a ragged hem
  // and the horn toggle at the shoulder; torn stitches where it hung once it is taken
  const mantle = old && relic && held ? relicArt(relic) : null;
  const mTop = [[44.6, 24.6], [41.4, 21], [37, 19.2], [32.4, 18.4], [27.6, 18.8], [23.4, 20.8], [19.8, 24.4]];
  if (mantle && !lie) {
    const p = mantle.p, n0 = F.parts.length, hideM = p.mat || 'trollHide', ruffM = p.mat2 || 'grizzle', Q = q => B(q);
    const seeds = [[[41, 25], hideM, 0], [[31, 21.4], ruffM, 0], [[21.4, 29], hideM, -1.6], [[22, 41], ruffM, -1.2], [[31.4, 32.6], hideM, -.6]].map(([q, m, dd]) => [Q(q), m, dd]);
    const patch = ({ x, y }) => {
      let d1 = 1e9, d2 = 1e9, best = 0; seeds.forEach(([c], i) => { const d = Math.hypot(x + .5 - c[0], y + .5 - c[1]); if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d; });
      if (d2 - d1 < R(1.1)) return (x + y) % 3 === 0 ? { m: p.stitch || 'leatherDark', dd: 1.4 } : -2;
      const [, m, dd] = seeds[best];
      if (p.moss && best === 4 && vnoise(x * .3 / k, y * .3 / k, 349) > .66) return { m: p.moss, dd: 0 };
      const fur = m === ruffM ? ((x * 1.6 + y) % 3.4 < .7 ? -1 : 0) : hash(x, y, 348) < .08 ? -1 : 0;
      return { m, dd: dd + fur };
    };
    F.add({ mat: hideM, prof: 'round', bw: R(3.4), hs: .8, grp: 'mantle', shapes: [poly([[45.4, 25.6], [40.4, 20.2], [32.4, 18], [24.6, 19.8], [19, 25], [16.4, 32], [17, 40.6], [21.4, 46.2], [27, 45.8], [31.6, 42.8], [35.6, 38.4], [39.6, 33.8], [43.6, 30]].map(Q))], tex: patch });
    // the hem: a ragged fringe of hide strips
    const hem = [[17.6, 41.4], [20.2, 45], [23.8, 46.4], [27.8, 45.2], [31.4, 42.6], [34.8, 39], [38.2, 35.2]];
    F.add({ mat: hideM, prof: 'ridge', hs: .8, grp: 'mantlefringe', shapes: spikesC(hem.map((q, i) => { const c = Q(q); return [c[0], c[1] - R(.8), -.25 + (hash(i, 1, 349) - .5) * .5, 1, R(2.4 + hash(i, 2, 349) * 2.2), R(1.2)]; })), tex: () => -1.4 });
    // the ruff: shaggy grizzled fur standing up round the neck and the front of the shoulders
    const hc = [31.4, 31], rTop = mTop.slice(0, 4);
    F.add({ mat: ruffM, prof: 'ridge', hs: .8, grp: 'mantleruff', shapes: spikesC(rTop.map((q, i) => { const c = Q(q), d = [q[0] - hc[0], q[1] - hc[1]]; return [c[0], c[1] + R(.8), d[0], d[1], R(4.2 - i * .7 + hash(i, 3, 349) * 1.2), R(1.9 - i * .2)]; })) });
    F.add({ mat: ruffM, prof: 'round', bw: R(1.8), grp: 'mantleruffband', shapes: chainC(rTop.map(Q), [R(3), R(2.7), R(2.2), R(1.4)]), tex: ({ x, y }) => ((x * 1.4 + y) % 2.8 < .7 ? -1 : 0) });
    // the clasp: a troll's horn toggle through two iron loops at the front of the shoulder
    const l1 = Q([37.2, 25]), l2 = Q([41.8, 27]);
    F.add({ mat: p.clasp || 'iron', prof: 'round', bw: R(.8), grp: 'mantleloops', shapes: [circ(l1, R(1.5)), circ(l2, R(1.5))], cuts: [circ(l1, R(.6)), circ(l2, R(.6))] });
    F.add({ mat: p.horn || 'bone', prof: 'round', bw: R(1.2), grp: 'mantlehorn', shapes: chainC([Q([34.6, 23.4]), Q([38, 25.4]), Q([41.6, 26.8]), Q([44.2, 26.4])], [R(.8), R(1.4), R(1.2), R(.5)]), tex: ({ x, y }) => ((x * 2 + y) % 3 === 0 ? -1 : 0) });
    for (let i = n0; i < F.parts.length; i++) F.parts[i].relic = true;
    A.relic = Q([39.4, 26]);
  } else if (old && !lie) {
    F.add({ mat: 'leatherDark', prof: 'round', bw: R(.5), grp: 'tornstitches', noShadow: true, shapes: mTop.slice(1, 6).map(q => { const c = B([q[0], q[1] + 2.4]); return cap([c[0] - R(1), c[1] - R(1)], [c[0] + R(1), c[1] + R(1)], R(.45)); }) });
  }
  limb([P.hipN, P.knN, P.ftN], [5.4, 4.2, 3.4], 'legN', 350, false); foot(P.ftN, 'footN', false);
  // the head: a heavy brow, a big nose, small eyes under it, tusks up out of the jaw, a ragged ear; Old Horn's horns
  const hf = frame(...P.head, ha);
  skin([cap(B(J.chest), hf.P(-R(4), R(3)), R(6), R(4.4))], 'neck', 351);
  if (old) F.add({ mat: 'bone', prof: 'round', bw: R(1.6), grp: 'hornF', shapes: [hf.poly([[-R(4.6), -R(4)], [-R(6.6), -R(7)], [-R(5), -R(9)], [-R(2.6), -R(6.4)]])], tex: DARK });
  skin([rell(hf, 0, 0, R(7), R(6.2)), hf.cap(R(2), R(1.6), R(7.4), R(3.4), R(4.6), R(3.4))], 'head', 352, false, { bw: R(3.4) });
  if (old) F.add({ mat: 'wolfPale', prof: 'round', bw: R(1.6), grp: 'muzzle', shapes: [hf.poly([[R(.6), R(3)], [R(8.6), R(3.6)], [R(8), R(7.6)], [R(3.4), R(8.4)], [-R(1.6), R(6)]])], tex: ({ x, y }) => ((x + y * 2) % 3 === 0 ? -1 : 0) });
  F.add({ mat: 'bone', prof: 'ridge', grp: 'tusks', shapes: [hf.poly([[R(4.4), R(5)], [R(5.6), R(.8)], [R(6.4), R(5)]]), hf.poly([[R(7.2), R(4.8)], [R(8), R(2.2)], [R(8.6), R(4.6)]])] });
  skin([hf.cap(R(6.6), -R(.4), R(9.6), R(1.6), R(2), R(2.2))], 'nose', 353, false, { bw: R(1.4) });
  skin([hf.cap(-R(2.4), -R(3.4), R(5.8), -R(2.8), R(1.8), R(1.4))], 'brow', 354, false, { bw: R(1.2) });
  eyeOf(F, hf, R(3.4), -R(1.2), R(.9), R(.7), eyeM, eye === 'shut', 'eyeN');
  skin([hf.poly([[-R(5.4), -R(1.6)], [-R(9.6), -R(4.4)], [-R(5.8), R(1.6)]])], 'ear', 355, false, { bw: R(1) });
  if (!old) F.add({ mat: 'hairBlack', prof: 'round', bw: R(1), grp: 'tuft', shapes: [hf.poly([[-R(3), -R(5.4)], [-R(1), -R(8.4)], [R(1.6), -R(5.6)], [R(3.4), -R(7.2)], [R(3.4), -R(4.6)]])] });
  if (old) { // the great horn, curling up and forward; the other is a stump
    F.add({ mat: 'bone', prof: 'round', bw: R(1.8), grp: 'horn', shapes: chainC([hf.P(-R(1), -R(5)), hf.P(-R(3), -R(10)), hf.P(-R(1), -R(15)), hf.P(R(4), -R(17.6)), hf.P(R(8.4), -R(16))], [R(2.6), R(2.3), R(1.9), R(1.3), R(.5)]), tex: ({ x, y }) => ((x * 2 + y) % 4 === 0 ? -1 : 0) });
    F.add({ mat: 'claw', prof: 'round', bw: R(1), grp: 'hornstump', shapes: [hf.poly([[R(1.6), -R(5)], [R(2.6), -R(8)], [R(4.6), -R(7.6)], [R(4.2), -R(4.6)]])] });
  }
  // the near arm and the club: a limb torn off a pine (Old Horn's is a young trunk), grey bark in long grain, a knot, a
  // lopped branch and a knobbled head; banded (2) and spiked (3) as it wakes
  limb([P.shN, P.elN, P.haN], [4.8, 4, 3.4], 'armN', 356, false);
  const cH = P.haN, cE = !lie && pose === 'attack' ? B(club[1]) : T(club[1]);
  const cl = Math.hypot(cE[0] - cH[0], cE[1] - cH[1]) || 1, cu = [(cE[0] - cH[0]) / cl, (cE[1] - cH[1]) / cl], cn = [-cu[1], cu[0]];
  const cP = (u, s) => [cH[0] + cu[0] * u + cn[0] * s, cH[1] + cu[1] * u + cn[1] * s];
  const r0 = R(old ? 2.5 : 2), r1 = R(old ? 3.8 : 3.1);
  const grain = ({ x, y }) => {
    const rx = x + .5 - cH[0], ry = y + .5 - cH[1], a = rx * cu[0] + ry * cu[1], s = rx * cn[0] + ry * cn[1];
    if (vnoise(x * .3, y * .3, 357) > .8) return { m: 'moss', dd: 0 };
    const g = Math.sin(s * 2.1 / k + Math.sin(a * .3 / k) * 1.3); return g > .72 ? -1.2 : 0;
  };
  F.add({ mat: 'bogwood', prof: 'round', bw: R(2.2), grp: 'club', shapes: [cap(cP(-R(3.6), 0), cP(cl - r1 * .4, 0), r0, r1), circ(cP(cl * .8, r1 * .35), r1 * .98), circ(cP(cl - r1 * .3, -r1 * .3), r1 * .9)], tex: grain });
  F.add({ mat: 'bogwood', prof: 'round', bw: R(.8), grp: 'clubstub', shapes: [cap(cP(cl * .44, -r0 * .7), cP(cl * .52, -r0 - R(3)), R(1.1), R(.8))], tex: grain });
  F.add({ mat: 'claw', prof: 'flat', grp: 'clubstubend', noShadow: true, noOutline: true, shapes: [circ(cP(cl * .52, -r0 - R(3)), R(.6))] });
  F.add({ mat: 'bark', prof: 'round', bw: R(.7), grp: 'clubknot', noShadow: true, shapes: [ell(cP(cl * .64, r1 * .1), R(1.2), R(.9))], tex: () => -1 });
  if (gT >= 2) F.add({ mat: 'iron', prof: 'round', bw: R(.8), grp: 'clubband', shapes: [cap(cP(cl * .74, r1 * 1.08), cP(cl * .74, -r1 * 1.08), R(1))] });
  if (gT >= 3) F.add({ mat: 'iron', prof: 'ridge', hs: .9, grp: 'clubspikes', shapes: spikesC([.86, 1].flatMap(u => [1, -1].map(g => { const c = cP(cl * u - r1 * .3, g * r1 * .85); return [c[0], c[1], cn[0] * g + cu[0] * .4, cn[1] * g + cu[1] * .4, R(2.6), R(.9)]; })).concat([(() => { const c = cP(cl + r1 * .1, 0); return [c[0], c[1], cu[0], cu[1], R(2.4), R(.9)]; })()])) });
  hand(P.haN, 'handN', false);
  A.head = hf.P(R(3.4), -R(1.2)); A.mouth = hf.P(R(6), R(4)); A.center = lie ? T([34, 60]) : P.chest; A.weaponTip = cE;
}
const peakTroll = (F, st) => troll(F, st, { k: 1, dx: 0, dy: 0 });
const oldHorn = (F, st) => troll(F, st, { k: 1.18, dx: .9, dy: 3.6, old: true });

Object.assign(FOE_ART, {
  'iron-sentinel': { name: 'Iron Sentinel', kind: 'beast', w: 64, h: 64, foot: [33, 61], defaultTier: 'veteran', build: ironSentinel },
  'sentinel-captain': { name: 'The Sentinel-Captain', kind: 'beast', w: 80, h: 80, foot: [41, 77], defaultTier: 'relic-bearer', relic: 'ironwall', build: sentinelCaptain },
  forgeborn: { name: 'Forgeborn', kind: 'beast', w: 64, h: 64, foot: [32, 61], defaultTier: 'veteran', build: forgebornBase },
  bellows: { name: 'The Bellows', kind: 'beast', w: 72, h: 72, foot: [36, 69], defaultTier: 'veteran', build: bellowsBuild, motes: sparkMotes(6, 8) },
  journeyman: { name: 'Harrow\'s Journeyman', kind: 'beast', w: 64, h: 72, foot: [32, 69], defaultTier: 'relic-bearer', relic: 'runestaff', build: journeymanBuild },
  'peak-troll': { name: 'Peak-Troll', kind: 'beast', w: 72, h: 72, foot: [36, 69], defaultTier: 'veteran', build: peakTroll },
  'old-horn': { name: 'Old Horn', kind: 'beast', w: 88, h: 88, foot: [44, 85], defaultTier: 'relic-bearer', relic: 'trollhide-mantle', build: oldHorn },
});

/* ---- RIME-WRAITHS: the drowned monks of Frostmere, hovering over the ice in sodden grey habits rimed with frost,
   the hood up over a blue-white face, water still dripping off them and freezing as it falls (64x64, ground 61). The
   Drowned Abbess wears a wimple and a veil frozen stiff and swings the Drowned Censer, wet smoke out of it (72x72,
   ground 69). A Choir-Wraith sings one long note with its mouth open, a hymnal frozen to its hands (64x64). One
   builder in a 64x64 base space mapped by S = { k, dx, dy }. The Waking: rime over the shoulders and the hood (1), a
   rosary of ice beads and longer icicles (2), Hush's violet light in the eyes and under the hood (3) ---- */
function wraith(F, st, S) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, k = S.k, T = p => [S.dx + p[0] * k, S.dy + p[1] * k], R = r => r * k;
  const idle = !pose || pose === 'idle', lie = pose === 'ko', abb = S.variant === 'abbess', choir = S.variant === 'choir';
  const eyeM = gT >= 3 ? 'hush' : 'frost', skinM = 'drownedSkin';
  let bx = 0, by = idle ? f * .8 - .4 : 0, tilt = 0, eye = 'open', sing = choir ? 1 : 0;
  const J = { head: [37.4, 16.4], shF: [29.4, 25], shN: [40.6, 25.4], elF: [26.4, 34.4], haF: [27.6, 42.4], elN: [45, 33.4], haN: [49.4, 38.6] };
  if (choir) Object.assign(J, { elF: [33, 34.6], haF: [41.4, 33.4], elN: [45.4, 34], haN: [48.6, 31] });
  if (abb) Object.assign(J, { elN: [45.4, 32.4], haN: [50.4, 35.6] });
  if (pose === 'attack') {
    bx = 3; tilt = .14; sing = 1.5;
    if (choir) Object.assign(J, { head: [38.4, 17.2], haF: [42.6, 31.4], haN: [50, 28.4], elN: [46.4, 32] });
    else if (abb) Object.assign(J, { head: [38.6, 17.4], elN: [45.8, 28.8], haN: [49.8, 27.4], elF: [30.4, 33.4], haF: [34, 41] });
    else Object.assign(J, { head: [39.4, 17.6], elN: [48, 27.8], haN: [54.2, 26.8], elF: [35.6, 29.4], haF: [45.6, 29.6] });
  } else if (pose === 'hurt') {
    bx = -3.4; by = -.8; tilt = -.26; eye = 'shut'; sing = 0;
    Object.assign(J, choir ? { head: [34.6, 16.8], elN: [42.6, 33.4], haN: [45.6, 31], elF: [30.6, 34.4], haF: [38.6, 33] } : { head: [34.6, 16.8], elN: [43.4, 21.4], haN: [47, 15.6], elF: [23.6, 31.6], haF: [19.6, 37.6] });
  }
  // a lean: the top moves with the pose, the hem stays over its ice
  const B = p => T([p[0] + bx * clamp((57 - p[1]) / 38, 0, 1), p[1] + by]);
  const P = {}; for (const key of Object.keys(J)) P[key] = B(J[key]);
  const habitTex = (seed, far) => ({ x, y, ny }) => {
    const yb = (y - S.dy) / k;
    if (gT >= 1 && ny < -.45 && yb < 36) return { m: 'rime', dd: far ? -1 : 0 };
    if (hash(x, y, seed) < .018) return { m: 'rime', dd: -1 };
    const fold = Math.sin((x + vnoise(x * .06, y * .09, seed) * 7) * 1.05 / k) > .78 ? -1 : 0;
    return fold + (yb > 45 ? -1 : 0) + (far ? -1 : 0);
  };
  const cloth = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: 'drowned', prof: 'round', bw: R(3), grp: g, shapes, tex: habitTex(seed, far) }, o));
  const icicles = (pts, g, len) => F.add({ mat: 'ice', prof: 'ridge', hs: .9, grp: g, shapes: spikesC(pts.map(([p, l], i) => [p[0], p[1] - R(.4), (hash(i, 7, 371) - .5) * .12, 1, R((l || 2.4) * len * (.7 + hash(i, 8, 371) * .6)), R(.75)])) });
  const hand = (h, dir, g, far, spread = 1) => {
    const Sh = [circ(h, R(1.7))]; for (const [a, l] of [[-.42 * spread, 3.4], [-.08 * spread, 4], [.28 * spread, 3.6]]) { const d = rot2(dir, a); Sh.push(cap(h, [h[0] + d[0] * R(l), h[1] + d[1] * R(l)], R(.8), R(.45))); }
    F.add({ mat: skinM, prof: 'round', bw: R(.9), grp: g, shapes: Sh, tex: far ? DARK : ({ x, y }) => (hash(x, y, 372) < .12 ? -1 : 0) });
  };
  // a bell sleeve from shoulder to wrist, widening to the cuff, icicles under the cuff
  const sleeve = (sh, el, ha, g, far) => {
    cloth([cap(sh, el, R(3.6), R(3.8))], g + 'up', 373, far);
    const a = Math.atan2(ha[1] - el[1], ha[0] - el[0]), d = Math.hypot(ha[0] - el[0], ha[1] - el[1]), X = frame(el[0], el[1], a);
    cloth([X.poly([[-R(1), -R(3.6)], [d - R(1.6), -R(5)], [d + R(.4), -R(4.4)], [d + R(.6), R(4.6)], [d - R(1.4), R(5.6)], [-R(1), R(3.8)]])], g + 'cuff', 374, far);
    if (!far || gT >= 1) icicles([[X.P(d - R(1.4), R(5.2)), 2], [X.P(d - R(.2), R(4.8)), 1.4], [X.P(d - R(3), R(5)), 1.2]].filter(([p]) => p[1] > el[1] - R(1)), g + 'ice', gT >= 2 ? 1.5 : 1);
    return X.P(d + R(.4), 0);
  };

  if (lie) { // collapsed: the habit a heap on the ice, the hood fallen forward, one hand out, water pooling
    F.add({ mat: 'ice', prof: 'flat', grp: 'pool', noShadow: true, noOutline: true, shapes: [ell(T([33, 60.4]), R(20), R(2))], tex: ({ x }) => (x % 5 === 0 ? 1 : 0) });
    cloth([poly([[10.6, 61], [13.4, 55.6], [19, 51.6], [27, 49.8], [35, 50.4], [42, 52.6], [46.6, 56.4], [48, 61]].map(T))], 'heap', 375, false, { bw: R(5), hs: .8 });
    F.add({ mat: 'string', prof: 'round', bw: R(.7), grp: 'cord', shapes: chainC([[20, 55.4], [28, 54.2], [36, 55.6], [40, 58.6]].map(T), R(.8)) });
    const hf = frame(...T([47.6, 55.6]), 1.2);
    if (abb) F.add({ mat: 'clothGrey', prof: 'round', bw: R(2), grp: 'veil', shapes: [hf.poly([[-R(6.4), -R(6)], [R(4), -R(7)], [R(7), -R(3)], [R(6.4), R(4)], [-R(8.4), R(6.6)]])], tex: ({ x, y }) => ((x + y) % 4 === 0 ? -1 : 0) });
    else cloth([rell(hf, 0, 0, R(6.6), R(7.4)), hf.poly([[-R(6), -R(3)], [-R(10.4), R(1.4)], [-R(6), R(3)]])], 'hood', 376, false, { bw: R(3) });
    hand(T([55.4, 59.2]), [1, .2], 'hand', false, 1.2);
    icicles([[T([16, 56]), 1.2], [T([24, 52.4]), 1.4], [T([40, 53.4]), 1.2]], 'heapice', 1);
    if (choir) { const b0 = T([22.6, 58.8]); F.add({ mat: 'leatherDark', prof: 'round', bw: R(1), grp: 'book', shapes: [poly([[b0[0] - R(5), b0[1] + R(1.6)], [b0[0] + R(5), b0[1] + R(1.6)], [b0[0] + R(4.4), b0[1] - R(1.4)], [b0[0] - R(4.4), b0[1] - R(1.4)]])] }); F.add({ mat: 'parchment', prof: 'round', bw: R(.8), grp: 'pages', shapes: [poly([[b0[0] - R(4.2), b0[1] + R(.6)], [b0[0], b0[1] + R(1)], [b0[0] + R(4.2), b0[1] + R(.6)], [b0[0] + R(3.6), b0[1] - R(1.6)], [b0[0], b0[1] - R(.8)], [b0[0] - R(3.6), b0[1] - R(1.6)]])] }); }
    if (abb && relic && held) { const art = relicArt(relic), m = drawRelic(F, art, T([46, 57.4]), -1.5, .34 * k, { center: [32, 5] }); if (m) A.relic = m([32, 40]); }
    A.head = hf.P(0, 0); A.mouth = hf.P(R(3), R(2)); A.center = T([30, 55]);
    return;
  }
  // the ice it drips onto, and the drops falling
  F.add({ mat: 'ice', prof: 'flat', grp: 'pool', noShadow: true, noOutline: true, shapes: [ell(T([32.6, 60.4]), R(13), R(1.7))], tex: ({ x }) => (x % 5 === 0 ? 1 : 0) });
  F.add({ mat: 'water', prof: 'round', bw: .6, grp: 'drops', noShadow: true, noOutline: true, shapes: [circ(T([19.4, 57.4 + f * 1.6]), R(.6)), circ(T([29.4, 59.2 - f * 1.2]), R(.55)), circ(T([41, 57.8 + f]), R(.6))] });
  // the far sleeve and hand (behind the habit), then the habit: a bell of sodden wool, ragged at the hem
  const cuffF = choir ? null : sleeve(P.shF, P.elF, P.haF, 'sleeveF', true);
  if (!choir) hand(cuffF, pose === 'attack' ? [1, -.1] : [.2, 1], 'handF', true);
  const hem = [[15.6, 55.2], [18.8, 53.2], [21.6, 56.6], [25, 54.2], [28.6, 57.2], [32.4, 54.6], [36, 57.4], [39.6, 54.8], [43.2, 56.8], [46.8, 54.4]];
  const habit = [[40.2, 21.4], [33, 20.6], [27.4, 22], [23.4, 31], [20, 42], [16.6, 50.6]].concat(hem, [[47.8, 51.6], [45.8, 43], [43.8, 33.6], [43, 25]]);
  cloth([poly(habit.map(B))], 'habit', 377, false, { bw: R(5), hs: .8 });
  icicles(hem.filter((_, i) => i % 2 === 0).map(q => [B([q[0], q[1] - .4]), 1.8]), 'hemice', gT >= 2 ? 1.5 : 1);
  // the cord round the waist, its knotted end hanging; a rosary of ice beads from the second Waking
  const w0 = B([24.4, 37.6]), w1 = B([44.8, 38.4]);
  F.add({ mat: 'string', prof: 'round', bw: R(.7), grp: 'cord', shapes: [cap(w0, w1, R(.9))].concat(chainC([[43.2, 38.6], [44.4, 43.4], [43.6, 48.4]].map(B), R(.75))), tex: ({ x, y }) => ((x + y) % 3 === 0 ? -1 : 0) });
  F.add({ mat: 'string', prof: 'round', bw: R(.8), grp: 'knots', shapes: [circ(B([44.2, 42.4]), R(1.2)), circ(B([43.7, 47]), R(1.1))] });
  if (gT >= 2) {
    const beads = []; for (let i = 0; i <= 8; i++) { const u = i / 8, x = 34.4 + u * 6.4, y = 39 + Math.sin(u * Math.PI) * 7; beads.push(circ(B([x, y]), R(.85))); }
    F.add({ mat: 'ice', prof: 'round', bw: R(.6), grp: 'rosary', shapes: beads });
    F.add({ mat: 'silver', prof: 'round', bw: R(.5), grp: 'rosarycross', shapes: [cap(B([37.6, 46]), B([37.6, 50.2]), R(.5)), cap(B([36.2, 47.4]), B([39, 47.4]), R(.5))] });
  }
  // the head: a cowl with the point hanging back (the Abbess: a veil frozen stiff over a wimple), the drowned face in it
  const hf = frame(...P.head, tilt);
  if (abb) {
    F.add({ mat: 'clothGrey', prof: 'round', bw: R(2.4), grp: 'veil', shapes: [hf.poly([[-R(5.4), -R(7.6)], [R(1.6), -R(9)], [R(6.6), -R(7)], [R(7.8), -R(3.4)], [R(3), -R(5)], [-R(3), -R(3.6)], [-R(5.6), R(1.4)], [-R(7.4), R(8.4)], [-R(10.6), R(15.4)], [-R(13), R(11)], [-R(11), R(2)], [-R(8.8), -R(4.4)]])], tex: ({ x, y, ny }) => (gT >= 1 && ny < -.4 ? { m: 'rime', dd: -1 } : (x * 2 + y) % 6 === 0 ? -1 : 0) });
    F.add({ mat: 'clothWhite', prof: 'round', bw: R(1.6), grp: 'wimple', shapes: [rell(hf, R(3), R(1.4), R(5.8), R(7)), hf.poly([[-R(1), R(5)], [R(7.6), R(5)], [R(8.6), R(10.4)], [-R(2.6), R(10.4)]])], cuts: [rell(hf, R(4), R(.4), R(3.4), R(4.4))], tex: ({ x, y }) => (hash(x, y, 378) < .1 ? { m: 'rime', dd: 0 } : (y % 3 === 0 ? -1 : 0)) });
    icicles([[hf.P(R(7.4), -R(3)), 1.2], [hf.P(-R(10.4), R(14.4)), 1.6], [hf.P(-R(12.4), R(11.4)), 1.2]], 'veilice', gT >= 2 ? 1.4 : 1);
  } else {
    cloth([rell(hf, 0, 0, R(7.4), R(8.4)), hf.poly([[-R(6), -R(5.4)], [-R(11.4), -R(1)], [-R(12.6), R(3)], [-R(7), R(3)]])], 'hood', 379, false, { bw: R(3.4) });
    F.add({ mat: gT >= 3 ? 'hush' : 'dark', prof: 'flat', grp: 'hoodin', noShadow: true, tex: gT >= 3 ? () => -2.6 : null, shapes: [rell(hf, R(3.8), R(.8), R(4.4), R(5.8))] });
    icicles([[hf.P(R(6.4), -R(4.4)), 1.1], [hf.P(R(7.6), R(3.6)), 1.4], [hf.P(R(5.4), R(6.6)), 1]], 'hoodice', gT >= 2 ? 1.4 : 1);
  }
  // the face: blue-white and gaunt, dark sockets with a cold light in them, the mouth a hole (the Choir's open in its note)
  F.add({ mat: skinM, prof: 'round', bw: R(1.6), grp: 'face', shapes: [rell(hf, R(4.4), R(.6), R(3.2), R(4.4))], tex: ({ x, y }) => (hash(x, y, 380) < .1 ? -1 : 0) });
  F.add({ mat: 'dark', prof: 'flat', grp: 'sockets', noShadow: true, shapes: [rell(hf, R(4.4), -R(1), R(1.2), R(1), 10), rell(hf, R(6.6), -R(.8), R(.9), R(.9), 10)] });
  if (eye !== 'shut') F.add({ mat: eyeM, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [hf.circ(R(4.6), -R(1), R(.66)), hf.circ(R(6.7), -R(.8), R(.56))] });
  const mo = sing ? [R(1.2) + R(.3) * sing, R(1.3) + R(.6) * sing] : [R(1.1), R(.45)];
  F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [rell(hf, R(5.6), R(3.2), mo[0], mo[1], 12)] });
  if (sing) { // the note: cold breath going out of it in rings
    const m0 = hf.P(R(7), R(3.2)), n = choir ? 3 : 2;
    F.add({ mat: 'frost', prof: 'flat', grp: 'note', noShadow: true, noOutline: true, shapes: Array.from({ length: n }, (_, i) => { const c = [m0[0] + R(2.6 + i * 3.2), m0[1] - R(i * .6)], r = R(1.6 + i * 1.1); return poly([[c[0], c[1] - r], [c[0] + R(1), c[1] - r * .5], [c[0] + R(1.2), c[1]], [c[0] + R(1), c[1] + r * .5], [c[0], c[1] + r], [c[0] + R(.3), c[1]]]); }), tex: () => -1 });
  }
  // the Choir's hymnal, frozen to both hands: an open book held up to sing from, ice down its edges
  if (choir) {
    const cF = sleeve(P.shF, P.elF, P.haF, 'sleeveF', true), cN = sleeve(P.shN, P.elN, P.haN, 'sleeveN', false);
    const bc = [(cF[0] + cN[0]) / 2, (cF[1] + cN[1]) / 2 - R(3.2)], bf = frame(bc[0], bc[1], -.22 + (pose === 'attack' ? -.25 : 0));
    F.add({ mat: 'leatherDark', prof: 'round', bw: R(1), grp: 'bookcover', shapes: [bf.poly([[-R(7), -R(5.2)], [0, -R(4)], [R(7), -R(5.2)], [R(7.2), R(4)], [0, R(5.2)], [-R(7.2), R(4)]])] });
    F.add({ mat: 'parchment', prof: 'round', bw: R(1), grp: 'bookpages', shapes: [bf.poly([[-R(6.2), -R(4.4)], [0, -R(3.4)], [R(6.2), -R(4.4)], [R(6.4), R(3.2)], [0, R(4.4)], [-R(6.4), R(3.2)]])], tex: ({ x, y }) => (y % 2 === 0 && hash(x, y, 381) < .6 ? -1.2 : 0) });
    F.add({ mat: 'ice', prof: 'round', bw: R(.8), grp: 'bookice', shapes: [bf.cap(-R(6.6), R(4), R(6.6), R(4), R(.9))] });
    icicles([[bf.P(-R(4.4), R(4.8)), 1.4], [bf.P(R(.6), R(5.4)), 1.8], [bf.P(R(4.8), R(4.8)), 1.2]], 'bookicicles', 1);
    hand(cF, [.3, -1], 'handF', false, .8); hand(cN, [-.2, -1], 'handN', false, .8);
  }
  // the near sleeve and hand (the Abbess swings the Drowned Censer from it on its chain, wet smoke out of the lid)
  const cuffN = choir ? null : sleeve(P.shN, P.elN, P.haN, 'sleeveN', false);
  const censer = abb && relic && held ? relicArt(relic) : null;
  if (censer) {
    const sw = pose === 'attack' ? -.66 : pose === 'hurt' ? .55 : f ? .12 : -.1;
    const m = drawRelic(F, censer, cuffN, sw, .36 * k, { center: [32, 5] });
    if (m) { A.relic = m([32, 40]); A.censer = m([32, 34]); }
  } else if (abb) F.add({ mat: 'silver', prof: 'round', bw: R(.5), grp: 'brokenchain', shapes: [0, 1, 2].map(i => rell(frame(cuffN[0], cuffN[1] + R(1.6 + i * 1.6), 0), 0, 0, R(i & 1 ? .6 : .9), R(i & 1 ? 1 : .6), 8)) });
  if (!choir) hand(cuffN, abb ? [.3, 1] : pose === 'attack' ? [1, -.15] : pose === 'hurt' ? [.1, -1] : [.35, 1], 'handN', false, pose === 'attack' ? 1.3 : 1);
  A.head = hf.P(R(4.4), -R(.6)); A.mouth = hf.P(R(5.6), R(3.2)); A.center = B([33, 36]);
}
const rimeWraith = (F, st) => wraith(F, st, { k: 1, dx: 0, dy: 0 });
const drownedAbbess = (F, st) => wraith(F, st, { k: 1.14, dx: 2.4, dy: 7.5, variant: 'abbess' });
const choirWraith = (F, st) => wraith(F, st, { k: 1, dx: 0, dy: 0, variant: 'choir' });
// frost mist curling up off the drowned (more of it as they wake)
const rimeMotes = n => (t, a, gT) => { const c = a.center || [32, 36], out = []; for (let j = 0; j < n + (gT || 0); j++) { const ph = (t * (.25 + hash(j, 2, 382) * .2) + hash(j, 3, 382)) % 1; out.push({ x: c[0] - 14 + hash(j, 1, 382) * 28 + Math.sin(t * 1.4 + j) * 2, y: c[1] + 22 - ph * 34, c: gT >= 3 && j % 3 === 0 ? [180, 170, 255] : [200, 230, 255], a: Math.sin(ph * Math.PI) * .55 }); } return out; };

Object.assign(FOE_ART, {
  'rime-wraith': { name: 'Rime-Wraith', kind: 'beast', w: 64, h: 64, foot: [33, 61], defaultTier: 'veteran', build: rimeWraith, motes: rimeMotes(3) },
  'drowned-abbess': { name: 'The Drowned Abbess', kind: 'beast', w: 80, h: 80, foot: [40, 77], defaultTier: 'relic-bearer', relic: 'drowned-censer', build: drownedAbbess, motes: rimeMotes(4) },
  'choir-wraith': { name: 'Choir-Wraith', kind: 'beast', w: 64, h: 64, foot: [33, 61], defaultTier: 'veteran', build: choirWraith, motes: rimeMotes(3) },
});

/* ---- THE THUNDER-ROC: a storm-grey eagle the size of a barn, hanging over its eyrie with its wings up in a V,
   lightning crackling along the pinions, the great yellow feet thrown forward with the talons open; the Roc-Feather
   Cloak (a shepherd's cloak of its own feathers, from its recipe) snagged on a talon and streaming in the downdraught
   (96x96, ground 93). The Waking: snow on its back (1), a brighter crackle and storm-cloud at the wingtips (2), eyes
   and bolts white-hot (3) ---- */
function thunderRoc(F, st) {
  const { pose, f, gT, relic, held } = st, A = st.anchors, idle = !pose || pose === 'idle', lie = pose === 'ko';
  const fm = 'rocFeather', eyeM = gT >= 3 ? 'storm' : 'amber';
  let pitch = 0, bx = 0, by = idle ? f * 1.4 : 0, flap = idle ? f * .14 : 0, gape = 0, eye = 'open';
  if (pose === 'attack') { pitch = .26; bx = 3; by = 3; flap = 0; gape = 1; }
  else if (pose === 'hurt') { pitch = -.2; bx = -1.4; by = -1; flap = .06; gape = .7; eye = 'shut'; }
  else if (lie) { pitch = .12; by = 6; }
  const piv = [50, 52], cp = Math.cos(pitch), sp = Math.sin(pitch);
  const W = p => { const dx = p[0] - piv[0], dy = p[1] - piv[1]; return [piv[0] + dx * cp - dy * sp + bx, piv[1] + dx * sp + dy * cp + by + 4]; };
  // a pointed feather as a polygon: root, angle, length, half-width
  const plume = (root, ang, len, w) => { const X = frame(root[0], root[1], ang), up = [], dn = []; for (let i = 0; i <= 8; i++) { const u = i / 8, h = w * Math.pow(Math.sin(Math.PI * (u * .94 + .06)), .65); up.push([u * len, -h]); dn.push([u * len, h * .8]); } return X.poly(up.concat(dn.reverse())); };
  const barTex = (ang, far, seed) => ({ x, y, ny }) => {
    if (gT >= 1 && !far && ny < -.5 && vnoise(x * .4, y * .4, seed) > .45) return { m: 'snow', dd: -1 };
    const a = x * Math.cos(ang) + y * Math.sin(ang), b = ((a % 5) + 5) % 5;
    return (b < 1 ? -1 : 0) + (far ? -1 : 0) + (hash(x, y, seed) < .04 ? 1 : 0);
  };
  const bolt = (pts, g, seed) => { // a zigzag of lightning along a line of points
    const S = []; let prev = null;
    pts.forEach(([p, q], i) => { const n = 4; for (let j = 0; j <= n; j++) { const u = j / n, x = p[0] + (q[0] - p[0]) * u, y = p[1] + (q[1] - p[1]) * u, dx = q[1] - p[1], dy = -(q[0] - p[0]), l = Math.hypot(dx, dy) || 1, o = (hash(i * 7 + j, f + gT * 3, seed) - .5) * 3.4; const c = [x + dx / l * o, y + dy / l * o]; if (prev) S.push(cap(prev, c, gT >= 2 ? .6 : .45)); prev = c; } });
    F.add({ mat: 'storm', prof: 'flat', grp: g, noShadow: true, noOutline: true, shapes: S, tex: () => (gT >= 3 ? 1 : gT >= 2 ? .5 : 0) });
  };
  // a wing: arm from shoulder to wrist (coverts over the feather roots), secondaries off the forearm, primaries fanned
  // from the wrist; `side` +1 fans the primaries forward (the far wing, behind the neck), -1 back (the near wing)
  const wing = (sh, wr, prim, g, far) => {
    const a = Math.atan2(wr[1] - sh[1], wr[0] - sh[0]), L = Math.hypot(wr[0] - sh[0], wr[1] - sh[1]), X = frame(sh[0], sh[1], a);
    const Sec = [], Pri = [];
    for (let i = 0; i < 5; i++) { const u = .12 + i * .19; Sec.push(plume(X.P(L * u, -R0(3.4)), a - 1.95 + i * .05, 13 + i * .6, 3)); }
    prim.forEach(([ra, len], i) => Pri.push(plume(X.P(L - 1.4, -1.6 - i * .4), a + ra, len, 3.1)));
    F.add({ mat: fm, prof: 'round', bw: 2.2, grp: g + 'sec', shapes: Sec, tex: barTex(a + 1.6, far, 391) });
    F.add({ mat: fm, prof: 'round', bw: 2.2, grp: g + 'pri', shapes: Pri, tex: barTex(a + .6, far, 392) });
    F.add({ mat: fm, prof: 'round', bw: 3, hs: .8, grp: g + 'arm', shapes: [X.poly([[-1, 3.6], [L * .5, 3.8], [L, 2.4], [L + 2.4, 0], [L + .6, -4.2], [L * .62, -7.4], [L * .3, -8.6], [-1, -9.4]])], tex: ({ x, y, ny }) => { if (gT >= 1 && !far && ny < -.5) return { m: 'snow', dd: -1 }; return (hash(x, y, 393) < .12 ? -1 : 0) + (far ? -1 : 0); } });
    const tipDir = a + prim[0][0], tip = [wr[0] + Math.cos(tipDir) * prim[0][1], wr[1] + Math.sin(tipDir) * prim[0][1]];
    return { lead: [[X.P(L * .2, 3.4), X.P(L * .9, 2.6)], [X.P(L * .9, 2.6), tip]], tips: prim.map(([ra, len]) => [wr[0] + Math.cos(a + ra) * len, wr[1] + Math.sin(a + ra) * len]) };
  };
  const R0 = r => r;
  if (lie) { // down on the crag: one wing spread on the ground, the other folded, the head down, the feet up
    wing([46, 72], [22, 80], [[.3, 20], [0, 21], [-.3, 19], [-.6, 17]], 'wingN', false);
    F.add({ mat: fm, prof: 'round', bw: 5, hs: .8, grp: 'body', shapes: [rell(frame(52, 78, .15), 0, 0, 17, 9.4)], tex: barTex(1.2, false, 394) });
    F.add({ mat: 'rimeFur', prof: 'round', bw: 3, grp: 'chest', shapes: [rell(frame(57, 81, .15), 0, 0, 10, 5)], tex: ({ y }) => (y % 3 === 0 ? -1 : 0) });
    const hf = frame(74, 86, .5);
    F.add({ mat: fm, prof: 'round', bw: 3, grp: 'head', shapes: [cap([64, 80], hf.P(0, 0), 5, 4.4), rell(hf, 0, 0, 6, 5)], tex: barTex(.4, false, 395) });
    F.add({ mat: 'claw', prof: 'round', bw: 1.4, grp: 'beak', shapes: [hf.poly([[4.6, -2], [10, 0], [11.4, 3.6], [9, 4], [5, 2.6]])] });
    F.add({ mat: 'rocLeg', prof: 'round', bw: 1, grp: 'legs', shapes: [cap([54, 74], [58, 66], 2, 1.6), cap([48, 74], [49, 65.4], 1.9, 1.5)] });
    F.add({ mat: 'blackiron', prof: 'round', bw: .6, grp: 'talons', shapes: [[58, 66], [49, 65.4]].flatMap(p => [cap(p, [p[0] + 3, p[1] - 3], .9, .4), cap(p, [p[0] - 1, p[1] - 4], .9, .4), cap(p, [p[0] + 3.6, p[1] + .4], .9, .4)]) });
    if (relic && held) { const art = relicArt(relic), m = drawRelic(F, art, [60, 64.4], 1.3, .3, { center: [29.4, 9.4] }); if (m) A.relic = m([32, 30]); }
    A.head = hf.P(0, 0); A.mouth = hf.P(8, 2); A.center = [50, 78];
    return;
  }
  // the far wing, up behind the neck, its primaries fanned forward
  const shF = W([55, 40]), wrF = W([63 + flap * 16, 19 + flap * 24]);
  const wf = wing(shF, wrF, [[.15, 17], [.45, 16], [.75, 15], [1.05, 14], [1.35, 12]], 'wingF', true);
  // the tail: a fan of long feathers down behind
  const tr = W([37, 60]);
  F.add({ mat: fm, prof: 'round', bw: 2.2, grp: 'tail', shapes: [2.05, 2.25, 2.45, 2.65, 2.85].map((a, i) => plume(tr, a + pitch, 18 + (i === 2 ? 3 : i === 1 || i === 3 ? 2 : 0), 3.2)), tex: barTex(-1, false, 396) });
  // the far leg, the body, the pale barred breast
  const leg = (hip, kn, ft, g, far) => {
    F.add({ mat: fm, prof: 'round', bw: 3, grp: g + 'thigh', shapes: [ell(hip, 5, 6.4), cap(hip, kn, 4.4, 3)], tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) + (far ? -1 : 0) });
    F.add({ mat: 'rocLeg', prof: 'round', bw: 1.2, grp: g + 'shank', shapes: [cap(kn, ft, 2.1, 1.8)], tex: ({ y }) => (y % 2 === 0 ? -1 : 0) + (far ? -1 : 0) });
    const toes = pose === 'attack' ? [[5.4, -3], [6.6, .6], [5, 3.6], [-3, 2.4]] : [[5, -1.4], [6, 2], [3.6, 4.6], [-3.4, 2.6]];
    const T0 = toes.map(([dx, dy]) => [ft[0] + dx, ft[1] + dy]);
    const grip = () => { // the toes and their talons (drawn after anything they hold)
      F.add({ mat: 'rocLeg', prof: 'round', bw: 1, grp: g + 'toes', shapes: T0.map(p => cap(ft, p, 1.5, 1.1)), tex: far ? DARK : null });
      F.add({ mat: 'blackiron', prof: 'ridge', hs: .9, grp: g + 'talons', shapes: T0.map((p, i) => { const d = [p[0] - ft[0], p[1] - ft[1]], l = Math.hypot(d[0], d[1]) || 1, u = [d[0] / l, d[1] / l], cu = rot2(u, i === 3 ? -.9 : .9); return poly([[p[0] - cu[1] * .9, p[1] + cu[0] * .9], [p[0] + u[0] * 2.6 + cu[0] * 1.6, p[1] + u[1] * 2.6 + cu[1] * 1.6], [p[0] + cu[1] * .9, p[1] - cu[0] * .9]]); }), tex: far ? DARK : null });
    };
    if (far) grip();
    return { T0, grip };
  };
  const kF = pose === 'attack' ? [55, 66] : [50, 68], fF = pose === 'attack' ? [60, 72] : [53.4, 75.4];
  leg(W([47, 60]), W(kF), W(fF), 'legF', true);
  const body = W([50, 52]);
  F.add({ mat: fm, prof: 'round', bw: 6, hs: .8, grp: 'body', shapes: [rell(frame(body[0], body[1], -.62 + pitch), 0, 0, 17.4, 11.6)], tex: barTex(1.2, false, 397) });
  const ch = W([57.4, 51.6]);
  F.add({ mat: 'rimeFur', prof: 'round', bw: 4, grp: 'breast', shapes: [rell(frame(ch[0], ch[1], -.9 + pitch), 0, 0, 11, 7.2)], tex: ({ x, y }) => { const v = (y + Math.round(Math.sin(x * .7) * .8)) % 4; return v === 0 ? -1.4 : v === 2 && (x & 1) ? -1 : 0; } });
  // the near leg thrown forward, the talon the cloak is caught on
  const kN = pose === 'attack' ? [63, 60.4] : [61, 63.6], fN = pose === 'attack' ? [70, 61.4] : [66.6, 65.6];
  const legN = leg(W([55, 60]), W(kN), W(fN), 'legN', false), talonsN = legN.T0;
  // the Roc-Feather Cloak snagged on the front talon, streaming back in the downdraught
  const cloak = relic && held ? relicArt(relic) : null;
  if (cloak) {
    const m = drawRelic(F, cloak, talonsN[1], pose === 'attack' ? 1.2 : pose === 'hurt' ? .6 : .86 + f * .08, .44, { center: [29.4, 9.4] });
    if (m) A.relic = m([30, 30]);
  } else F.add({ mat: 'rocFeather', prof: 'round', bw: .5, grp: 'snag', shapes: [cap(talonsN[0], [talonsN[0][0] - 1.6, talonsN[0][1] + 3], .6, .3)], tex: () => 1 });
  legN.grip();
  // the neck, hackles, head: a heavy brow, a fierce eye, the hooked beak (open to scream in the attack)
  const nk0 = W([58, 44]), hc = W([68.4, 29]), ha = pitch * .6 + (pose === 'hurt' ? -.3 : 0), hf = frame(hc[0], hc[1], ha);
  F.add({ mat: fm, prof: 'round', bw: 3.6, grp: 'neck', shapes: [cap(nk0, hf.P(-2, 2), 7, 5.4)], tex: barTex(.3, false, 398) });
  F.add({ mat: fm, prof: 'ridge', hs: .8, grp: 'hackles', shapes: spikesC([[-4.6, -3.4, -1, -.5, 5.6, 1.6], [-5.6, .6, -1, -.1, 6, 1.7], [-5, 4.6, -1, .3, 5.4, 1.6], [-2.4, 7.4, -.9, .6, 4.4, 1.4]].map(([dx, dy, ux, uy, l, w]) => { const p = hf.P(dx, dy), d = rot2([ux, uy], ha); return [p[0], p[1], d[0], d[1], l, w]; })), tex: DARK });
  F.add({ mat: fm, prof: 'round', bw: 3.4, grp: 'head', shapes: [rell(hf, 0, 0, 7.6, 6.4)], tex: ({ x, y, ny }) => (gT >= 1 && ny < -.6 ? { m: 'snow', dd: -1 } : (x + y) % 4 === 0 ? -1 : 0) });
  F.add({ mat: 'claw', prof: 'round', bw: 1.6, grp: 'beak', shapes: [hf.poly([[4.4, -3.4], [9.4, -2.8], [12.6, -.4], [13.2, 3.6], [11.6, 5.8], [11, 2.8], [8.6, 2], [4.4, 2.4]])], tex: ({ x, y }) => { const p = hf.P(11.6, 3); return Math.hypot(x - p[0], y - p[1]) < 2.4 ? -2 : 0; } });
  F.add({ mat: 'claw', prof: 'round', bw: 1, grp: 'jaw', shapes: [hf.poly([[4.8, 2.6 + gape * 1.4], [10.4, 3 + gape * 3.6], [9.4, 4.8 + gape * 3.8], [5, 4.4 + gape * 1.4]])], tex: () => -1 });
  if (gape) F.add({ mat: 'dark', prof: 'flat', grp: 'gape', noShadow: true, shapes: [hf.poly([[5, 2.4], [10.6, 2.4], [10.2, 2.8 + gape * 3.2], [5, 2.6 + gape * 1.2]])] });
  F.add({ mat: fm, prof: 'round', bw: 1.2, grp: 'brow', shapes: [hf.cap(.6, -3.6, 6.4, -2.8, 1.8, 1.3)], tex: () => -1 });
  if (eye === 'shut') F.add({ mat: 'dark', prof: 'flat', grp: 'eye', noShadow: true, shapes: [hf.cap(2.8, -1.2, 5.8, -1, .5)] });
  else { F.add({ mat: eyeM, prof: 'flat', grp: 'eye', noShadow: true, shapes: [rell(hf, 4.2, -1, 1.6, 1.3, 12)] }); F.add({ mat: 'dark', prof: 'flat', grp: 'pupil', noShadow: true, noOutline: true, shapes: [hf.circ(4.6, -1, .75)] }); }
  // the near wing, up and back, over the body
  const shN = W([49, 42]), wrN = W([31 - flap * 6, 22 + flap * 26]);
  const wn = wing(shN, wrN, [[-.1, 20], [-.4, 20], [-.7, 19], [-1, 17.4], [-1.3, 15.6]], 'wingN', false);
  // lightning along the pinions (more of it as it wakes), storm-cloud at the tips from the second Waking
  bolt(wn.lead, 'boltN', 399); bolt(wf.lead, 'boltF', 400);
  if (gT >= 1) bolt([[wn.tips[1], wn.tips[3]]], 'boltN2', 401);
  if (gT >= 2) F.add({ mat: 'mist', prof: 'round', bw: 1.6, grp: 'cloud', noShadow: true, shapes: wn.tips.slice(0, 3).map((p, i) => circ(p, 2.6 - i * .4)).concat(wf.tips.slice(0, 2).map(p => circ(p, 2))), tex: ({ x, y }) => ((x + y) & 1 ? -1 : 0) });
  A.head = hf.P(4, -1); A.mouth = hf.P(10, 2); A.center = W([52, 50]); A.weaponTip = talonsN[1];
}
// sparks jumping off the pinions
const rocMotes = n => (t, a, gT) => { const c = a.center || [48, 44], out = []; for (let j = 0; j < n + (gT || 0) * 2; j++) { const ph = (t * (1.2 + hash(j, 2, 402)) + hash(j, 3, 402)) % 1; if (ph > .5) continue; out.push({ x: c[0] - 30 + hash(j, 1, 402) * 44, y: c[1] - 36 + hash(j, 4, 402) * 30, c: gT >= 3 ? [255, 252, 224] : [170, 210, 255], a: (1 - ph * 2) * .9 }); } return out; };

Object.assign(FOE_ART, {
  'thunder-roc': { name: 'The Thunder-Roc', kind: 'beast', w: 96, h: 96, foot: [52, 93], defaultTier: 'relic-bearer', relic: 'roc-feather-cloak', build: thunderRoc, motes: rocMotes(5) },
});

/* ---- MOTHER ANVIL (the Champion): Harrow's first forge-golem, an anvil the size of a cart on four iron legs: the face
   on top polished by a thousand years of blows, the horn thrust forward for a head with a slit of fire under an iron
   brow, Harrow's broken-ring mark on her flank, the Anvil Heart burning in a cage at her waist (its own ribs and heart,
   from its recipe) and the Worldforge Hammer in her one great arm (from its recipe). Each piece is gone when it is
   snapped off: an empty cage going cold, an empty fist. Quench (2): steam off her, her plate tempered blue in patches;
   the Last Strike (3): the Heart white through the ribs, the cracks in her plate alight, the Hammer lifted high
   (96x96, ground 93) ---- */
function motherAnvil(F, st) {
  const { pose, f, phase, broken, held } = st, A = st.anchors, P2 = phase >= 2, P3 = phase >= 3, idle = !pose || pose === 'idle', lie = pose === 'ko';
  const hammerArt = relicArt('worldforge-hammer'), heartArt0 = relicArt('anvil-heart');
  const hammerOn = held && !broken.includes('worldforge-hammer') && !!hammerArt, heartOn = held && !broken.includes('anvil-heart') && !!heartArt0;
  const heartArt = heartOn && P3 ? Object.assign({}, heartArt0, { p: Object.assign({}, heartArt0.p, { core: 'radiant' }) }) : heartArt0;
  let pitch = 0, bx = 0, by = idle ? f * .8 : lie ? 12 : 0, eye = lie ? 'shut' : 'open';
  let hand = [60, 24], elbow = [53, 29], hamA = -2.3; // the hammer's direction, grip to head
  if (P3) { hand = [59, 22]; elbow = [52, 28]; hamA = -2.12; }
  if (pose === 'attack') { pitch = -.06; bx = 2; hand = [70, 35]; elbow = [60, 31]; hamA = .85; }
  else if (pose === 'hurt') { pitch = .04; bx = -3; hand = [52, 21]; elbow = [47, 28]; hamA = -2.7; eye = 'shut'; }
  else if (lie) { pitch = .07; hand = [66, 30]; elbow = [58, 31]; }
  const piv = [26, 84], cp = Math.cos(pitch), sp = Math.sin(pitch);
  const W = p => { const dx = p[0] - piv[0], dy = p[1] - piv[1]; return [piv[0] + dx * cp - dy * sp + bx, piv[1] + dx * sp + dy * cp + by + 7]; };
  const plateTex = (seed, far) => ({ x, y }) => {
    let r;
    if (P3 && Math.abs(vnoise(x * .15, y * .15, seed) - .5) < .026) r = { m: 'ember', dd: 0 };
    else if (P2 && vnoise(x * .12, y * .12, seed + 5) > .6) r = { m: 'temperBlue', dd: hash(x, y, seed) < .1 ? -2 : -1 };
    else r = { m: 'blackiron', dd: (hash(x, y, seed) < .06 ? -1 : 0) + (vnoise(x * .4, y * .4, seed + 2) > .76 ? 1 : 0) };
    if (far) r.dd -= 1;
    return r;
  };
  const iron = (shapes, g, seed, far, o = {}) => F.add(Object.assign({ mat: 'blackiron', prof: 'round', bw: 2.6, grp: g, shapes, tex: plateTex(seed, far) }, o));
  const rivets = (pts, g) => F.add({ mat: 'bronze', prof: 'round', bw: .6, grp: g, noShadow: true, shapes: pts.map(p => circ(p, .95)) });
  // a leg: a plated thigh, a knee-cop, a shin and a flared anvil-foot with three claws
  const leg = (hip, kn, an, g, far) => {
    const [h, k2, a] = lie ? [W(hip), [kn[0] + (kn[0] > 46 ? 6 : -6), 88.6], [an[0] + (an[0] > 46 ? 12 : -12), 89]] : [W(hip), W(kn), W(an)];
    iron([cap(h, k2, 4.8, 4.2)], g + 'th', 411, far); iron([circ(k2, 3.6)], g + 'kn', 412, far, { bw: 2 });
    iron([cap(k2, a, 4.2, 3.4)], g + 'sh', 413, far);
    iron([poly([[a[0] - 5.4, a[1] + 3.4], [a[0] - 3.4, a[1] - 1.4], [a[0] + 3.4, a[1] - 1.4], [a[0] + 5.8, a[1] + 3.4]])], g + 'ft', 414, far, { bw: 1.4 });
    F.add({ mat: 'blackiron', prof: 'ridge', hs: .9, grp: g + 'claws', shapes: spikesC([[a[0] + 5, a[1] + 2.6, 1, .3, 2.6, 1], [a[0] + 1.4, a[1] + 3, .4, 1, 1.6, .9], [a[0] - 4.6, a[1] + 2.6, -1, .3, 2, .9]]), tex: far ? DARK : null });
  };
  const front = pose === 'attack' ? [[62, 64], [67, 71.4], [70, 78]] : [[61, 64], [64.6, 73.4], [63, 81.8]];
  const frontN = pose === 'attack' ? [[68, 66], [74, 72.4], [77, 78.8]] : [[68, 66], [71.6, 74.4], [70, 82]];
  leg([27, 64], [22.4, 73.4], [24, 81.8], 'legBF', true); leg(front[0], front[1], front[2], 'legFF', true);
  // steam off her from the Quench on
  const wisp = (pts, r) => chainC(pts.map(([x, y], i) => [x + (f && i ? 1 : 0), y - (f ? 1 : 0)]), r);
  if (P2 && !lie) F.add({ mat: 'mist', prof: 'flat', grp: 'steamlow', noShadow: true, noOutline: true, shapes: [...wisp([[16, 86], [13, 80], [16, 74], [13, 68]], [1.8, 1.6, 1.2, .7]), ...wisp([[78, 86], [81, 80], [78, 75], [80, 70]], [1.8, 1.5, 1.1, .6])], tex: ({ x, y }) => ((x + y) & 1 ? -1.4 : 0) });
  // the body: the foot of the anvil, the waist with its cage, the face block with the heel overhang, the horn
  iron([poly([[16, 57.6], [76, 57.6], [80.6, 67.4], [11.4, 67.4]].map(W))], 'base', 415, false, { bw: 3 });
  iron([poly([[15.4, 43.4], [31, 43.4], [31, 58], [13, 58], [17.4, 51]].map(W))], 'heel', 416, false, { bw: 3 });
  iron([poly([[61, 43.4], [71.4, 43.4], [75.4, 51], [78.4, 58], [61, 58]].map(W))], 'waistN', 417, false, { bw: 3 });
  // the cage: dark inside, the Anvil Heart in it (its own ribs and heart), two great bars of hers across it
  F.add({ mat: 'char', prof: 'round', bw: 3, hs: .6, grp: 'cavity', shapes: [poly([[30, 43.6], [62, 43.6], [62, 58], [30, 58]].map(W))], tex: ({ x, y }) => (heartOn ? (hash(x, y, 418) < .2 ? { m: 'ember', dd: -2.6 } : -1) : hash(x, y, 418) < .06 ? { m: 'ember', dd: -3 } : -2) });
  if (heartOn) {
    const m = drawItem(F, heartArt, W([46, 51.6]), pitch, .56, { center: [32, 46], drop: ['chain', 'bail'] });
    A.heart = m([32.2, 43.4]);
  }
  iron([cap(W([35.4, 44]), W([34, 57.6]), 1.8, 1.8), cap(W([56.6, 44]), W([58, 57.6]), 1.8, 1.8)], 'bars', 419, false, { bw: 1.6 });
  iron([poly([[6, 31.4], [70, 31.4], [70, 44.4], [16, 44.4], [16, 40.4], [8.6, 39.6]].map(W))], 'face', 420, false, { bw: 3.4, hs: .8 });
  F.add({ mat: 'steel', prof: 'round', bw: 1.2, grp: 'faceplate', shapes: [cap(W([7, 32]), W([69.4, 32]), 1.3)], tex: ({ x }) => (x % 7 === 0 ? -1 : 0) });
  rivets([[20, 41.6], [28, 41.6], [52, 41.6], [60, 41.6], [22, 64.4], [36, 64.4], [56, 64.4], [70, 64.4]].map(W), 'rivets');
  // Harrow's mark, the broken ring, on her flank (the same mark as on the Hammer)
  const mk = W([42.6, 37.6]), mS = []; for (let i = 0; i < 9; i++) { const a = .5 + i / 9 * Math.PI * 1.7, b = .5 + (i + 1) / 9 * Math.PI * 1.7; mS.push(cap([mk[0] + Math.cos(a) * 3, mk[1] + Math.sin(a) * 3], [mk[0] + Math.cos(b) * 3, mk[1] + Math.sin(b) * 3], .55)); }
  F.add({ mat: 'gold', prof: 'flat', grp: 'mark', noShadow: true, shapes: mS });
  // the horn, her head: an iron brow, one slit of fire for an eye, a seam of a mouth (glowing when she strikes)
  iron([poly([[68.6, 31.6], [78, 33], [86, 35.8], [91.4, 39], [86.6, 40.8], [78, 42.8], [70, 45.4]].map(W))], 'horn', 421, false, { bw: 3 });
  F.add({ mat: 'steel', prof: 'round', bw: .8, grp: 'hornplate', shapes: [cap(W([69, 32.2]), W([84, 35.4]), .9, .6)] });
  iron([cap(W([68.6, 34.6]), W([76.6, 35.4]), 1.6, 1.1)], 'brow', 422, false, { bw: 1.2, tex: () => -1 });
  const eM = P3 ? 'heat' : 'ember';
  if (eye === 'shut') F.add({ mat: 'dark', prof: 'flat', grp: 'eye', noShadow: true, shapes: [cap(W([70.6, 37.4]), W([74.6, 37.8]), .5)] });
  else F.add({ mat: eM === 'heat' ? 'radiant' : 'ember', prof: 'flat', grp: 'eye', noShadow: true, shapes: [cap(W([70.2, 37.3]), W([75, 37.9]), 1.1)] });
  F.add({ mat: pose === 'attack' ? 'ember' : 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [cap(W([71.6, 41.6]), W([83.4, 39.6]), pose === 'attack' ? .8 : .45)] });
  leg([34, 66], [29.4, 74.4], [31, 82], 'legBN', false); leg(frontN[0], frontN[1], frontN[2], 'legFN', false);
  // the arm: a great pauldron on the face block, the arm in plates, the Worldforge Hammer in the fist
  const sh = W([45.4, 36.4]), el = W(elbow), ha = W(hand);
  iron([cap(sh, el, 4.2, 3.8)], 'upperarm', 423); iron([circ(el, 3.4)], 'elbow', 424, false, { bw: 2 });
  iron([cap(el, ha, 3.8, 3.2)], 'forearm', 425);
  if (hammerOn) {
    const a = lie ? -.08 : hamA + pitch, at = lie ? [58, 88] : ha;
    const m = drawItem(F, hammerArt, at, a + Math.PI / 4, .56, { center: cardPt(hammerArt, 12) });
    A.hammer = m(cardPt(hammerArt, 52)); A.weaponTip = A.hammer;
  }
  iron([ell(sh, 6.4, 5.4)], 'pauldron', 426, false, { bw: 3.4 });
  rivets([[-3.6, -2.4], [0, -3.8], [3.6, -2.4]].map(([dx, dy]) => [sh[0] + dx, sh[1] + dy]), 'pauldronr');
  const fa = Math.atan2(ha[1] - el[1], ha[0] - el[0]), ff = frame(ha[0], ha[1], fa);
  iron([ff.poly([[-1.4, -4], [4.6, -4.4], [6, -2.8], [6, 2.8], [4.6, 4.4], [-1.4, 4]])], 'fist', 427, false, { bw: 2 });
  F.add({ mat: 'bronze', prof: 'round', bw: .8, grp: 'knuckles', shapes: [ff.cap(4.8, -3.2, 4.8, 3.2, .9)] });
  if (P2 && !lie) F.add({ mat: 'mist', prof: 'flat', grp: 'steamhigh', noShadow: true, noOutline: true, shapes: [...wisp([W([22, 30]), W([19, 24]), W([22, 18]), W([19, 13])], [1.7, 1.4, 1.1, .6]), ...wisp([W([36, 30]), W([39, 25]), W([36, 20])], [1.5, 1.2, .7])], tex: ({ x, y }) => ((x + y) & 1 ? -1.4 : 0) });
  A.head = W([73, 37.6]); A.mouth = W([78, 41]); A.center = W([46, 50]);
  A.relics = [A.hammer, A.heart].filter(Boolean); A.relic = A.relics[0] || null;
}
// sparks off the anvil and the Heart; steam from the Quench; more of both as she wakes
const anvilMotes = (t, a, gT, phase = 1) => {
  const out = [], c = a.heart || a.center || [46, 50], n = 3 + phase * 2;
  for (let j = 0; j < n; j++) { const ph = (t * (.7 + hash(j, 2, 428) * .6) + hash(j, 3, 428)) % 1; out.push({ x: c[0] - 10 + hash(j, 1, 428) * 20 + Math.sin(t * 2 + j) * 3, y: c[1] - ph * 40, c: phase >= 3 && j % 2 ? [255, 250, 220] : [255, 170, 70], a: (1 - ph) * .9 }); }
  if (phase >= 2) for (let j = 0; j < 4; j++) { const ph = (t * .3 + hash(j, 5, 428)) % 1; out.push({ x: 20 + hash(j, 6, 428) * 60, y: 88 - ph * 60, c: [220, 226, 232], a: Math.sin(ph * Math.PI) * .45 }); }
  return out;
};

Object.assign(FOE_ART, {
  'mother-anvil': { name: 'Mother Anvil', kind: 'beast', w: 96, h: 96, foot: [48, 93], defaultTier: 'champion', relic: 'worldforge-hammer', relics: ['worldforge-hammer', 'anvil-heart'], phases: 3, build: motherAnvil, motes: anvilMotes },
});

/* ---- THE RIME-ABBOT (the Champion): Brother Aurel, who went down to listen to Hush and did not come up. A tall
   frozen abbot standing in the ice to his knees, facing you: a cope rimed stiff over a drowned habit, a beard of
   icicles, the Hushweave Cowl over his head (from its recipe, his face in its shadow) and the Rime Crozier frozen to
   his hand (from its recipe, the cold light in its curl). Each piece is gone when it is snapped off: his bare frozen
   head, the tonsure white with frost; a jag of ice in his fist where the Crozier broke. Vespers (1): the Crozier's
   light; Compline (2): he sings, the ice climbing his cope; Hush (3): violet light up through the ice from what
   sleeps under it, in his eyes and in the cracks (96x96, ground 93) ---- */
function rimeAbbot(F, st) {
  const { pose, f, phase, broken, held } = st, A = st.anchors, P2 = phase >= 2, P3 = phase >= 3, idle = !pose || pose === 'idle', lie = pose === 'ko';
  const crozArt = relicArt('rime-crozier'), cowlArt = relicArt('hushweave-cowl');
  const crozOn = held && !broken.includes('rime-crozier') && !!crozArt, cowlOn = held && !broken.includes('hushweave-cowl') && !!cowlArt;
  const eyeM = P3 ? 'hush' : 'frost', skinM = 'drownedSkin';
  let lean = 0, by = idle ? f * .6 : 0, eye = 'open', sing = P2 ? 1 : 0, crozA = 0, hand = [71.4, 57], farHand = [27.4, 63.4];
  if (pose === 'attack') { lean = .1; crozA = .44; hand = [70, 49]; farHand = [24, 54]; sing = 1.4; }
  else if (pose === 'hurt') { lean = -.1; crozA = -.22; hand = [69, 58]; farHand = [22, 58]; eye = 'shut'; sing = .8; }
  else if (lie) { by = 18; eye = 'shut'; sing = 0; }
  // lean the figure about its feet (the hem stays frozen in the ice)
  const L = p => { const k2 = clamp((91 - p[1]) / 60, 0, 1); return [p[0] + lean * (91 - p[1]) * .5 * k2, p[1] + by * (lie ? clamp((93 - p[1]) / 40, 0, 1) : 1)]; };
  const iceT = seed => ({ x, y, ny }) => (P3 && Math.abs(vnoise(x * .25, y * .25, seed) - .5) < .04 ? { m: 'hush', dd: -1 } : ny < -.3 ? 1 : hash(x, y, seed) < .1 ? -1 : 0);
  const clothT = (seed, rime) => ({ x, y, ny }) => {
    if (P3 && y > 84 && hash(x, y, seed) < (y - 84) * .08) return { m: 'hush', dd: -2.4 };
    if ((rime || P2) && ny < -.35 && vnoise(x * .3, y * .3, seed) > (P2 ? .3 : .5)) return { m: 'rime', dd: 0 };
    if (hash(x, y, seed) < .02) return { m: 'rime', dd: -1 };
    return Math.sin((x + vnoise(x * .05, y * .08, seed) * 8) * .9) > .8 ? -1 : 0;
  };
  const icicles = (list, g) => F.add({ mat: 'ice', prof: 'ridge', hs: .9, grp: g, shapes: spikesC(list.map(([p, len, w], i) => [p[0], p[1], (hash(i, 3, 431) - .5) * .15, 1, len, w || .9])) });
  // the ice he stands in: a sheet with shards grown up round his hem (cracked violet from under it at Hush)
  F.add({ mat: 'ice', prof: 'flat', grp: 'sheet', noShadow: true, noOutline: true, shapes: [ell([46, 91.6], 30, 2.6)], tex: ({ x }) => (P3 && x % 4 === 0 ? { m: 'hush', dd: -1 } : x % 5 === 0 ? 1 : 0) });
  // the crozier planted behind his near hand when it rests; drawn first so the hand grips it
  const croz = () => {
    if (!crozOn) return;
    const a = lie ? 1.34 : crozA, at = lie ? [34, 90] : L(hand), g = lie ? 20 : 34;
    const m = drawItem(F, crozArt, at, a - Math.PI / 4, 1.1, { center: cardPt(crozArt, g) });
    A.crozier = m(cardPt(crozArt, 60, -8)); A.weaponTip = A.crozier;
  };
  if (lie) croz();
  // the robe: a drowned habit under a cope, the hem frozen into the ice
  const robe = lie ? [[26, 93], [30, 76], [36, 66], [56, 66], [62, 76], [68, 93]] : [[33, 40], [59, 40], [63.4, 60], [68.4, 91], [23.6, 91], [28.4, 60]];
  F.add({ mat: 'drowned', prof: 'round', bw: 6, hs: .8, grp: 'habit', shapes: [poly(robe.map(L))], tex: clothT(432, false) });
  // the sleeves and the far hand (the near hand after the cope, on the crozier)
  const sleeve = (sh, cu, g) => F.add({ mat: 'clothSlate', prof: 'round', bw: 3, grp: g, shapes: [cap(L(sh), L(cu), 4, 5.4)], tex: clothT(433, true) });
  const hnd = (h, dir, g, spread = 1) => { const Sh = [circ(h, 2)]; for (const [a, l] of [[-.5 * spread, 4], [-.15 * spread, 4.6], [.2 * spread, 4.3], [.55 * spread, 3.4]]) { const d = rot2(dir, a); Sh.push(cap(h, [h[0] + d[0] * l, h[1] + d[1] * l], .9, .55)); } F.add({ mat: skinM, prof: 'round', bw: 1, grp: g, shapes: Sh, tex: ({ x, y }) => (hash(x, y, 434) < .12 ? -1 : 0) }); };
  if (!lie) {
    sleeve([33, 44], [farHand[0] + 1, farHand[1] - 3], 'sleeveF');
    hnd(L(farHand), pose === 'attack' ? [-.4, -1] : [-.1, 1], 'handF', pose === 'attack' ? 1.3 : 1);
  }
  // the cope: two stiff panels over the shoulders, silver orphreys down the front edges, a morse at the chest
  const pan = sd => (lie ? [[46 + sd * 2, 66], [46 + sd * 16, 68], [46 + sd * 21, 86], [46 + sd * 8, 86]] : [[46 + sd * 16, 38], [46 + sd * 2, 41], [46 + sd * 5, 66], [46 + sd * 17, 77], [46 + sd * 22, 64], [46 + sd * 20, 46]]).map(L);
  for (const sd of [-1, 1]) F.add({ mat: 'clothSlate', prof: 'round', bw: 4, grp: 'cope' + sd, shapes: [poly(pan(sd))], tex: clothT(435 + sd, true) });
  if (!lie) {
    F.add({ mat: 'silver', prof: 'round', bw: 1.2, grp: 'orphrey', shapes: [-1, 1].map(sd => cap(L([46 + sd * 2.4, 41.4]), L([46 + sd * 5.2, 66]), 1.4)), tex: ({ y }) => (y % 4 === 0 ? -1.5 : 0) });
    icicles([[L([29.4, 76]), 4.4], [L([33, 74]), 3], [L([62.6, 76]), 4.8], [L([59, 74]), 3.2], [L([25, 65]), 3], [L([67, 65]), 3.4]], 'copeice');
  }
  // the near sleeve and the hand on the crozier
  if (!lie) { croz(); sleeve([59, 44], [hand[0] - 1.6, hand[1] - 1.4], 'sleeveN'); }
  const hN = L(hand);
  if (!lie) {
    if (crozOn) { F.add({ mat: skinM, prof: 'round', bw: 1.2, grp: 'fist', shapes: [ell(hN, 2.6, 3.2), cap([hN[0] - 2.2, hN[1] - 1.6], [hN[0] - 2.2, hN[1] + 2], 1)], tex: ({ x, y }) => ((x + y) % 3 === 0 ? -1 : 0) }); F.add({ mat: 'ice', prof: 'round', bw: 1, grp: 'frozenhand', shapes: [cap([hN[0] - 2, hN[1] + 2.4], [hN[0] + 2, hN[1] + 3], 1.2)] }); }
    else { // the Crozier broke off at his fist: a jag of ice stuck in it
      F.add({ mat: skinM, prof: 'round', bw: 1.2, grp: 'fist', shapes: [ell(hN, 2.6, 3.2)] });
      F.add({ mat: 'ice', prof: 'ridge', hs: .9, grp: 'stump', shapes: [poly([[hN[0] - 1.4, hN[1] - 2], [hN[0] - .4, hN[1] - 8.4], [hN[0] + .8, hN[1] - 5], [hN[0] + 1.8, hN[1] - 7.4], [hN[0] + 1.6, hN[1] - 2]]), poly([[hN[0] - 1.2, hN[1] + 2.4], [hN[0] + .4, hN[1] + 7], [hN[0] + 1.4, hN[1] + 2.4]])] });
    }
  }
  // the head: the Hushweave Cowl with his face in its shadow, or his bare frozen head once it is snapped off
  const hc = L(lie ? [48, 60] : [46, 29.6]), tilt = lie ? .5 : pose === 'hurt' ? -.12 : pose === 'attack' ? .08 : 0;
  if (cowlOn) {
    const m = drawItem(F, cowlArt, hc, tilt, .5, { center: [32, 36] });
    A.cowl = m([32, 20]);
  } else {
    F.add({ mat: skinM, prof: 'round', bw: 3.4, grp: 'skull', shapes: [rell(frame(hc[0], hc[1] - 1.4, tilt), 0, 0, 7, 8.6)], tex: ({ x, y }) => (hash(x, y, 436) < .1 ? -1 : 0) });
    const hf0 = frame(hc[0], hc[1], tilt);
    F.add({ mat: 'hairSilver', prof: 'round', bw: 1.6, grp: 'tonsure', shapes: [hf0.poly([[-7.4, -2.6], [-5.4, -6.6], [-2, -8], [2, -8], [5.4, -6.6], [7.4, -2.6], [6.6, 1.6], [4.6, -3.6], [0, -5.4], [-4.6, -3.6], [-6.6, 1.6]])], tex: ({ x, y }) => ((x + y) % 2 === 0 ? { m: 'rime', dd: 0 } : 0) });
    F.add({ mat: 'rime', prof: 'round', bw: 1, grp: 'crownrime', shapes: [rell(hf0, 0, -8.6, 3.4, 1.4)] });
    icicles([[hf0.P(-6.6, 1.4), 3], [hf0.P(-7, -1), 2.4], [hf0.P(6.6, 1.4), 3.2], [hf0.P(7, -1), 2.2]], 'hairice');
    F.add({ mat: skinM, prof: 'round', bw: 1, grp: 'ears', shapes: [rell(hf0, -7.4, .6, 1.4, 2.4), rell(hf0, 7.4, .6, 1.4, 2.4)], tex: () => -1 });
  }
  // the face: blue-white, the brows heavy with frost, eyes of cold light, the mouth open when he sings
  const hf = frame(hc[0], hc[1], tilt);
  F.add({ mat: skinM, prof: 'round', bw: 2.4, grp: 'face', shapes: [rell(hf, 0, .4, 5.6, 6.6)], tex: ({ x, y }) => (hash(x, y, 437) < .12 ? -1 : 0) });
  F.add({ mat: 'rime', prof: 'round', bw: .8, grp: 'brows', shapes: [hf.cap(-4.6, -2.8, -1, -2, .9, .7), hf.cap(4.6, -2.8, 1, -2, .9, .7)] });
  F.add({ mat: 'dark', prof: 'flat', grp: 'sockets', noShadow: true, shapes: [rell(hf, -2.6, -.6, 1.6, 1.2, 10), rell(hf, 2.6, -.6, 1.6, 1.2, 10)] });
  if (eye !== 'shut') F.add({ mat: eyeM, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [hf.circ(-2.4, -.6, .8), hf.circ(2.4, -.6, .8)] });
  F.add({ mat: skinM, prof: 'round', bw: .8, grp: 'nose', shapes: [hf.cap(0, -1, 0, 2.4, .8, 1)], tex: () => -1 });
  F.add({ mat: 'dark', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [rell(hf, 0, 4.4, 1.4 + sing * .4, .5 + sing * 1.1, 12)] });
  // the beard: icicles hanging from his chin over the morse, longer as the ice climbs him
  const bl = P2 ? 1.25 : 1;
  icicles([[-3.6, 8], [-1.8, 12], [0, 15], [1.8, 11], [3.6, 7.6]].map(([dx, l]) => [hf.P(dx, 5.6 + Math.abs(dx) * .3), l * bl * (lie ? .5 : 1), .75]), 'beard');
  if (!lie) {
    const mo = L([46, 46.6]);
    F.add({ mat: 'silver', prof: 'round', bw: 1.6, grp: 'morse', shapes: [circ(mo, 3)] });
    F.add({ mat: 'sapphire', prof: 'round', bw: 1.4, grp: 'morsegem', noShadow: true, shapes: [circ(mo, 1.5)] });
  }
  if (sing) { // the office he sings, going out of him as rings of cold
    const m0 = hf.P(0, 6.4), n = pose === 'attack' ? 3 : 2;
    F.add({ mat: P3 ? 'hush' : 'frost', prof: 'flat', grp: 'note', noShadow: true, noOutline: true, shapes: Array.from({ length: n }, (_, i) => { const c = [m0[0] + 11 + i * 4.4, m0[1] - 2 - i * 1.4], r = 2 + i * 1.3; return poly([[c[0], c[1] - r], [c[0] + 1.1, c[1] - r * .5], [c[0] + 1.3, c[1]], [c[0] + 1.1, c[1] + r * .5], [c[0], c[1] + r], [c[0] + .3, c[1]]]); }), tex: () => -1 });
  }
  if (!lie) {
    // shards of ice grown up round the hem
    F.add({ mat: 'ice', prof: 'ridge', hs: .9, grp: 'hemshards', shapes: spikesC([[25, 91.6, -.3, -1, 7.6, 2], [30, 92, .1, -1, 5, 1.8], [37, 92.4, -.2, -1, 4, 1.6], [56, 92.4, .2, -1, 4.4, 1.6], [62.4, 92, -.1, -1, 5.6, 1.8], [67.6, 91.6, .3, -1, 8, 2.1]]), tex: iceT(438) });
  } else hnd([72, 88], [1, .1], 'handN', 1.2);
  A.head = hf.P(0, -1); A.mouth = hf.P(0, 4.4); A.center = L(lie ? [46, 78] : [46, 56]);
  A.relics = [A.crozier, A.cowl].filter(Boolean); A.relic = A.relics[0] || null;
}
// snow falling round him; the drowned choir's cold notes rising at Compline; violet motes up out of the ice at Hush
const abbotMotes = (t, a, gT, phase = 1) => {
  const out = [];
  for (let j = 0; j < 6; j++) { const ph = (t * (.12 + hash(j, 2, 439) * .1) + hash(j, 3, 439)) % 1; out.push({ x: 10 + hash(j, 1, 439) * 76 + Math.sin(t + j) * 2, y: ph * 90, c: [236, 244, 255], a: .7 }); }
  if (phase >= 2) for (let j = 0; j < 4; j++) { const ph = (t * .25 + hash(j, 5, 439)) % 1; out.push({ x: 18 + hash(j, 6, 439) * 60, y: 86 - ph * 70, c: [170, 220, 255], a: Math.sin(ph * Math.PI) * .8 }); }
  if (phase >= 3) for (let j = 0; j < 6; j++) { const ph = (t * .4 + hash(j, 7, 439)) % 1; out.push({ x: 20 + hash(j, 8, 439) * 56, y: 92 - ph * 40, c: [170, 160, 255], a: (1 - ph) * .9 }); }
  return out;
};

Object.assign(FOE_ART, {
  'rime-abbot': { name: 'The Rime-Abbot', kind: 'beast', w: 96, h: 96, foot: [46, 93], defaultTier: 'champion', relic: 'rime-crozier', relics: ['rime-crozier', 'hushweave-cowl'], phases: 3, build: rimeAbbot, motes: abbotMotes },
});

// any art key data/foes.js names that has no art of its own yet draws a stand-in of its kind, so a battle or a Ladder
// poster never meets "unknown foe" (test/art-keys.test.mjs lists every stand-in as a failure)
for (const f of Object.values(FOES)) for (const v of [f].concat(Object.values(f.variants || {}))) {
  if (v.art && !FOE_ART[v.art]) FOE_ART[v.art] = Object.assign({}, FOE_ART[f.humanoid ? 'bandit' : 'thornhound'], { name: v.name || f.name, standIn: true, relic: null });
}

// foeLooks(key, { gearTier, relic, variant }) -> { H, gear }: a humanoid foe's rig identity and gear
// looks, for the overworld walker rig (art/map-sprites.js). Beasts and unknown keys give { H: null, gear: {} }.
// `relic` (optional) overrides the relic carried; for Tamsin `variant` (the rival starter id) picks it.
// An M3 H may carry hints for parts the battle art adds over the rig (antlers: 1..5, headwrap, satchel,
// neckerchief, feather, pelt, lantern, bandolier, vials); the walker rig may draw or ignore them.
export function foeLooks(key, { gearTier = 0, relic, variant } = {}) {
  const def = FOE_ART[key];
  if (!def || def.kind !== 'humanoid') return { H: null, gear: {} };
  const o = { gearTier };
  if (relic !== undefined) o.relic = relic;
  else if (def.variantRelic && variant && relicArt(variant)) o.relic = variant;
  const { H, gear } = def.m3 ? humanoidM3(def, o) : humanoid(def, o);
  return { H, gear: gearLooks(gear) };
}

/* =====================================================================
   RENDER
   ===================================================================== */
const rasterCache = lru(200);
function frameKey(pose, t) { if (pose === 'attack') return t < .4 ? 'w' : 's'; if (!pose || pose === 'idle') return 'i' + (Math.floor(t * 1.6) % 2); return pose; }
function build(key, o) {
  const def = FOE_ART[key]; if (!def) throw new Error('unknown foe ' + key);
  const pose = o.pose || 'idle', t = o.t || 0, gT = clamp(o.gearTier ?? 0, 0, def.kind === 'humanoid' && def.gear ? def.gear.length - 1 : 3), tier = tierNum(o.tier ?? def.defaultTier);
  let relic = o.relic === undefined ? def.relic : o.relic;
  if (relic === undefined && def.variantRelic && o.variant && relicArt(o.variant)) relic = o.variant; // Tamsin: the rival starter
  const held = o.relicHeld !== false, phase = clamp(o.phase || 1, 1, 3);
  const broken = (o.broken || []).slice().sort().join(',');
  const rk = [key, pose, frameKey(pose, t), gT, tier, relic || '-', held ? 1 : 0, phase, broken, o.flip ? 'L' : 'R'].join('|');
  return rasterCache.get(rk, () => {
    if (def.kind === 'humanoid') {
      const m3 = !!def.m3, hu = m3 ? humanoidM3(def, Object.assign({}, o, { relic })) : humanoid(def, o), { H, gear } = hu;
      // an M3 relic drawn from its own recipe (Hollis's lantern) instead of the rig's look for that slot
      let drawn = null;
      if (m3 && def.drawSlot && hu.relicSlotName === def.drawSlot) { drawn = gear[def.drawSlot]; gear[def.drawSlot] = null; }
      const L = gearLooks(gear), b = BUILD[H.build] || BUILD.human;
      const P = posePreset(pose, pose === 'attack' ? (t < .4 ? .1 : .6) : t, L.weapon ? L.weapon.cls : null, b);
      if (m3 && def.pose) def.pose(P, { pose, b, L, gT, H });
      const r = heroForge(H, { gear: L, pose: P, frame: FRAME_BATTLE, aspectGlow: m3 && def.glow ? def.glow(gT) : H.shadeEyes === 'blight' ? 'blight' : 'arcane' });
      if (m3) m3Humanoid(def, r, { P, H, L, gear, gT, tier, pose, relic, held, slot: hu.relicSlotName, drawn });
      const R = r.F.raster({ mirror: !o.flip });
      const W = FRAME_BATTLE.w, mx = p => (p && !o.flip ? [W - p[0], p[1]] : p);
      const anchors = {}; for (const k in r.anchors) anchors[k] = k === 'relics' ? r.anchors[k].map(mx) : mx(r.anchors[k]);
      anchors.center = mx([r.j.cx + FRAME_BATTLE.ox, r.j.wa + FRAME_BATTLE.oy - 2]);
      if (relic && held) { const s = relicSlot(relic); anchors.relic = s === 'weapon' ? anchors.weaponMid : s === 'head' ? mx([r.j.hc[0] + FRAME_BATTLE.ox, r.j.hc[1] + FRAME_BATTLE.oy - 5]) : s === 'body' ? anchors.amulet || anchors.center : s === 'feet' ? mx([r.j.cx + FRAME_BATTLE.ox - 3, FRAME_BATTLE.oy + 44]) : anchors.relic || anchors.amulet; }
      if (m3 && anchors.relics) anchors.relic = anchors.relics[0];
      return { R, anchors, face: r.face ? { H, hc: r.j.hc, map: r.map, st: P.face } : null, def, gT, relicParts: R.parts.some(p => p.relic) };
    }
    const F = new Forge(def.w, def.h), anchors = { foot: def.foot.slice() };
    def.build(F, { pose, t, f: pose === 'idle' || !pose ? Math.floor(t * 1.6) % 2 : 0, gT, tier, phase, relic, held, broken: o.broken || [], anchors });
    const R = F.raster({ mirror: !!o.flip });
    // mirror every anchor; a list of points (relics) mirrors point by point
    const fx = p => [def.w - p[0], p[1]];
    if (o.flip) for (const k in anchors) if (anchors[k]) anchors[k] = k === 'relics' ? anchors[k].map(fx) : fx(anchors[k]);
    return { R, anchors, face: null, def, gT, relicParts: R.parts.some(p => p.relic) };
  });
}
export function renderFoe(key, o = {}) {
  const base = build(key, o), t = o.reduced ? 0 : (o.t || 0);
  const oo = { flicker: o.reduced ? 0 : Math.floor(t * 8), hue: (170 + t * 30) % 360 };
  if (base.relicParts && base.anchors.relic) {
    const pts = base.anchors.relics || [base.anchors.relic];
    oo.glints = [];
    pts.forEach((g, k) => { const gp = ((t + k * 1.2) % 2.4) / 2.4; if (o.reduced || gp < .14) oo.glints.push([Math.round(g[0]), Math.round(g[1]), o.reduced ? 1 : gp < .04 || gp > .1 ? 1 : 2]); });
    if (!o.reduced) { const cyc = (t % 2.4) / .9; if (cyc < 1) { oo.shine = [Math.round(-30 + cyc * 160), 3]; oo.shineMask = p => p.relic; } }
  }
  if (base.def.motes && !o.reduced) oo.particles = base.def.motes(t, base.anchors, base.gT, o.phase || 1);
  if (o.tint) oo.tint = o.tint;
  const img = compose(base.R, oo);
  if (base.def.aura) { const a = base.def.aura(base.gT, o.reduced ? 0 : t); if (a) halo(img, ...a); }
  if (base.face) { const fc = base.face, st = o.pose === 'idle' || !o.pose ? ((t % 3.7) < .14 ? 'blink' : 'open') : fc.st; paintFace(img, fc.H, fc.hc, FRAME_BATTLE.ox, FRAME_BATTLE.oy, st, !o.flip, fc.map); }
  img.anchors = base.anchors;
  return img;
}
// a soft halo round a sprite on a clear ground (compose's aura is for a painted ground): colour [r, g, b], radius, alpha
function halo(img, [r, g, b], rad, alpha) {
  const { width: w, height: h, data: d } = img, near = new Float32Array(w * h).fill(99);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 200) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h) { const j = Y * w + X, dd = Math.hypot(dx, dy); if (dd < near[j]) near[j] = dd; } }
  for (let i = 0; i < w * h; i++) { if (d[i * 4 + 3] || near[i] > rad) continue; const a = alpha * (1 - near[i] / (rad + .5)) * (hash(i % w, (i / w) | 0, 9) < .75 ? 1 : .5); if (a > .06) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = Math.min(255, a * 255); } }
}
export function foeAnchors(key, o = {}) { return build(key, o).anchors; }
export const FOE_KEYS = Object.keys(FOE_ART);
export const FOE_POSES = ['idle', 'attack', 'hurt', 'ko'];
// rasterise every pose frame once for these options (battle start), so later frames only compose
export function prewarmFoe(key, o = {}) {
  for (const [pose, t] of [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]]) renderFoe(key, Object.assign({}, o, { pose, t }));
}
