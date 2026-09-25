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
// The ImageData carries .anchors (canvas px): foot, head, center, relic (glint point), mouth, weaponTip.
import { Forge, Xf, compose, vnoise, hash } from './forge.js';
import { RECIPE, TX } from './recipes.js';
import { ART } from './item-art.js';
import { heroForge, posePreset, paintFace, BUILD, FRAME_BATTLE } from './heroes.js';
import { RELIC_ART, gearLooks } from './item-looks.js';
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
    pt.relic = true; if (opt.cut) pt.cuts = (pt.cuts || []).concat(opt.cut);
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
    name: 'Tallyman', kind: 'humanoid', w: 64, h: 64, foot: [32, 56], defaultTier: 'rabble', beltRelic: true, relic: 'wardens-seal',
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
export const relicSlot = id => (RELIC_ART[id] ? RELIC_SLOT[RELIC_ART[id].r] : null);

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
   RENDER
   ===================================================================== */
const rasterCache = lru(200);
function frameKey(pose, t) { if (pose === 'attack') return t < .4 ? 'w' : 's'; if (!pose || pose === 'idle') return 'i' + (Math.floor(t * 1.6) % 2); return pose; }
function build(key, o) {
  const def = FOE_ART[key]; if (!def) throw new Error('unknown foe ' + key);
  const pose = o.pose || 'idle', t = o.t || 0, gT = clamp(o.gearTier ?? 0, 0, 3), tier = tierNum(o.tier ?? def.defaultTier);
  const relic = o.relic === undefined ? def.relic : o.relic, held = o.relicHeld !== false, phase = clamp(o.phase || 1, 1, 3);
  const broken = (o.broken || []).slice().sort().join(',');
  const rk = [key, pose, frameKey(pose, t), gT, tier, relic || '-', held ? 1 : 0, phase, broken, o.flip ? 'L' : 'R'].join('|');
  return rasterCache.get(rk, () => {
    if (def.kind === 'humanoid') {
      const { H, gear } = humanoid(def, o), L = gearLooks(gear), b = BUILD[H.build] || BUILD.human;
      const P = posePreset(pose, pose === 'attack' ? (t < .4 ? .1 : .6) : t, L.weapon ? L.weapon.cls : null, b);
      const r = heroForge(H, { gear: L, pose: P, frame: FRAME_BATTLE, aspectGlow: H.shadeEyes === 'blight' ? 'blight' : 'arcane' });
      const R = r.F.raster({ mirror: !o.flip });
      const W = FRAME_BATTLE.w, mx = p => (p && !o.flip ? [W - p[0], p[1]] : p);
      const anchors = {}; for (const k in r.anchors) anchors[k] = mx(r.anchors[k]);
      anchors.center = mx([r.j.cx + FRAME_BATTLE.ox, r.j.wa + FRAME_BATTLE.oy - 2]);
      if (relic && held) { const s = relicSlot(relic); anchors.relic = s === 'weapon' ? anchors.weaponMid : s === 'head' ? mx([r.j.hc[0] + FRAME_BATTLE.ox, r.j.hc[1] + FRAME_BATTLE.oy - 5]) : s === 'body' ? anchors.amulet || anchors.center : s === 'feet' ? mx([r.j.cx + FRAME_BATTLE.ox - 3, FRAME_BATTLE.oy + 44]) : anchors.relic || anchors.amulet; }
      return { R, anchors, face: r.face ? { H, hc: r.j.hc, map: r.map, st: P.face } : null, def, relicParts: R.parts.some(p => p.relic) };
    }
    const F = new Forge(def.w, def.h), anchors = { foot: def.foot.slice() };
    def.build(F, { pose, t, f: pose === 'idle' || !pose ? Math.floor(t * 1.6) % 2 : 0, gT, tier, phase, relic, held, broken: o.broken || [], anchors });
    const R = F.raster({ mirror: !!o.flip });
    if (o.flip) for (const k in anchors) if (anchors[k]) anchors[k] = [def.w - anchors[k][0], anchors[k][1]];
    return { R, anchors, face: null, def, relicParts: R.parts.some(p => p.relic) };
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
  if (o.tint) oo.tint = o.tint;
  const img = compose(base.R, oo);
  if (base.face) { const fc = base.face, st = o.pose === 'idle' || !o.pose ? ((t % 3.7) < .14 ? 'blink' : 'open') : fc.st; paintFace(img, fc.H, fc.hc, FRAME_BATTLE.ox, FRAME_BATTLE.oy, st, !o.flip, fc.map); }
  img.anchors = base.anchors;
  return img;
}
export function foeAnchors(key, o = {}) { return build(key, o).anchors; }
export const FOE_KEYS = () => Object.keys(FOE_ART);
export const FOE_POSES = ['idle', 'attack', 'hurt', 'ko'];
// rasterise every pose frame once for these options (battle start), so later frames only compose
export function prewarmFoe(key, o = {}) {
  for (const [pose, t] of [['idle', 0], ['idle', .7], ['attack', .1], ['attack', .6], ['hurt', 0], ['ko', 0]]) renderFoe(key, Object.assign({}, o, { pose, t }));
}
