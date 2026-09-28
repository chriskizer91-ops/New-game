// Overworld walkers (M3 spec §5.1, D6): a dedicated 16x24 rig in the Forge style, fed by the same
// gear looks as the battle sprites, so the item a hero equips is visible on the walking hero.
// Browser-only: returns ImageData. art/heroes.js and art/hero-looks.js stay frozen (read only).
//
// walkerSheet(heroId, gear, { custom } = {}) -> { img, w: 16, h: 24, foot: [8, 23], head: [8, 3] }
//   img    3 frames (stand, stepA, stepB) across x 4 rows (s, n, e, w; w pre-mirrored) = 48 x 96
//   gear   by slot: gearLooks() output (what the spec feeds: gearLooks(heroGear(game, id))), or the raw
//          heroGear() map of ItemInstances / relic ids / art objects (preferred: then rarity and
//          temper are known, so heirloom and temper glints show). undefined = the hero's starter kit,
//          null = bare identity.
//   custom the Hearthwarden's look { skin, hairMat, hair, beard, eye } (WARDEN_PRESETS values)
// Cached in its own lru(96), keyed by hero, gear signature and look.
//
// rigSheet(H, looks, { meta, frames, rows, key }) -> ImageData   the same rig for any identity H
//   (heroes.js vocabulary) and gear looks; map-sprites.js uses it for NPCs and humanoid foes.
// resolveGear(gear) -> { L, M, sig }   looks + per-slot meta { heirloom, temper, relic, edge }
//   heirloom (relic or heirloom-and-up) -> a 1-px glint at the weapon tip / on one worn piece; temper >= 1 -> a
//   1-px glint mid-blade; temper 3 (look.edge) -> the weapon's outline takes the aspect colour. Tempered +2/+3
//   materials ('steel^', 'steel^frost') are registered in MAT by item-looks.js and draw like any other.
// Owner: WP5.

import { Forge, compose, MAT, hx } from './forge.js';
import { HERO_ART } from './hero-looks.js';
import { itemArt, lookFor, SLOTS, rarityTier } from './item-looks.js';
import { lru } from './cache.js';

export const WALKER_W = 16, WALKER_H = 24, WALKER_FRAMES = 3;
export const WALKER_ROWS = Object.freeze(['s', 'n', 'e', 'w']);
export const WALKER_FOOT = Object.freeze([8, 23]);

const has = m => !!(m && MAT[m]);
const mt = (m, fb) => (has(m) ? m : fb);
const P = pts => ({ k: 'p', pts });
const C = (a, b, ra, rb = ra) => ({ k: 'c', a, b, ra, rb });
const O = (c, r) => ({ k: 'o', c, r });
const E = (c, rx, ry) => ({ k: 'e', c, rx, ry });
const RECT = (x0, y0, x1, y1) => P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const along = (o, a, t, p = [0, 0], s = 0) => [o[0] + a[0] * t + p[0] * s, o[1] + a[1] * t + p[1] * s];

/* ---------- body proportions (art px, 16 x 24 frame, centre line x = 8) ---------- */
const BUILDS = {
  human: { hy: 7.7, hrx: 4.9, hry: 4.4, sh: 12, shW: 3.95, waY: 16.1, waW: 3.3, hipY: 18.2, hipW: 3.6, legX: 2, legR: 1, legT: 17.4, footY: 22.6, bootT: 20.2, armX: 5, armR: 1.02, handY: 16.9, handR: 1.16 },
  youth: { hy: 8.5, hrx: 4.8, hry: 4.3, sh: 12.8, shW: 3.6, waY: 16.6, waW: 3.05, hipY: 18.5, hipW: 3.3, legX: 1.9, legR: .98, legT: 18, footY: 22.6, bootT: 20.4, armX: 4.7, armR: 1, handY: 17.3, handR: 1.12 },
  brute: { hy: 7.6, hrx: 5, hry: 4.4, sh: 12, shW: 4.55, waY: 16.1, waW: 3.8, hipY: 18.2, hipW: 4, legX: 2.1, legR: 1.1, legT: 17.4, footY: 22.6, bootT: 20.2, armX: 5.55, armR: 1.1, handY: 16.9, handR: 1.24 },
  dwarf: { hy: 9, hrx: 5, hry: 4.3, sh: 13.3, shW: 4.55, waY: 17.3, waW: 4, hipY: 19.2, hipW: 4.2, legX: 2.1, legR: 1.1, legT: 18.9, footY: 22.6, bootT: 20.7, armX: 5.55, armR: 1.1, handY: 17.9, handR: 1.24 },
};

/* ---------- textures at walker scale (x, y are canvas px of the unmirrored geometry) ---------- */
const TEXW = {
  mail: ({ x, y }) => ((y & 1) && ((x + (y >> 1)) & 1) ? -1 : 0),
  scale: ({ x, y }) => ((y % 2 === 0) ? -1 : ((x + (y >> 1)) % 2 === 0 ? 0 : -1) * .5),
  plate: ({ y }) => (y % 3 === 0 ? -1 : 0),
  leather: () => 0,
  robe: ({ x, y }) => (y > 17 && x % 3 === 0 ? -1 : 0),
  rags: ({ x, y }) => ((x * 7 + y * 3) % 5 === 0 ? -1 : 0),
  hair: ({ x, y }) => ((x * 3 + y) % 5 === 0 ? -1 : 0),
};
const darker = (tex, n = 1) => q => { const r = tex ? tex(q) : 0; return typeof r === 'object' ? Object.assign({}, r, { dd: (r.dd || 0) - n }) : r - n; };

/* ---------- body look (mirrors heroes.js bodyLook, walker-scale textures) ---------- */
function bodyOf(H, g) {
  const L = g.body;
  if (!L) {
    if (H.robe) return { kind: 'robe', mat: mt(H.robe, 'robe'), hem: 'gold' };
    const m = mt(H.tunic, 'gambeson');
    return { kind: 'tunic', mat: m, tex: m === 'rags' ? TEXW.rags : null };
  }
  const kind = L.kind || 'mail';
  const tex = kind === 'mail' ? (L.scale ? TEXW.scale : TEXW.mail) : kind === 'robe' ? TEXW.robe : kind === 'plate' ? TEXW.plate : null;
  return Object.assign({}, L, { kind, mat: mt(L.mat, kind === 'robe' ? 'robe' : kind === 'leather' ? 'leather' : 'steel'), tex, hem: L.trim, pauldrons: L.pauldrons || (kind === 'plate' ? L.mat : null) });
}

/* ---------- joints for a direction and frame ---------- */
// dir 's' | 'n' | 'e' ('w' is 'e' rastered mirrored); f 0 stand, 1 stepA, 2 stepB
function joints(B, dir, f) {
  const bob = f ? 1 : 0, J = { dir, f, bob, B };
  J.sh = B.sh + bob; J.waY = B.waY + bob; J.hipY = B.hipY + bob; J.legT = B.legT + bob;
  if (dir === 'e') {
    const s = [0, 1, -1][f];
    J.hc = [8.4, B.hy + bob]; J.hrx = B.hrx - .25; J.hry = B.hry; J.cx = 8.2;
    J.legs = [
      { top: [7.7, J.legT], foot: [8.2 - 1.9 * s, B.footY], far: true },
      { top: [8.7, J.legT], foot: [8.4 + 1.9 * s, B.footY], far: false },
    ];
    J.arms = {
      far: { sh: [7.4, J.sh + .9], hand: [7.3 + 1.3 * s, B.handY + bob - .3] },
      near: { sh: [8.9, J.sh + .9], hand: [9 - 1.4 * s, B.handY + bob - .2] },
    };
    J.wHand = J.arms.near.hand; J.oHand = J.arms.far.hand;
    return J;
  }
  J.hc = [8, B.hy + bob]; J.hrx = B.hrx; J.hry = B.hry; J.cx = 8;
  const lift = [[0, 0], [0, 1.1], [1.1, 0]][f];
  J.legs = [
    { top: [8 - B.legX, J.legT], foot: [8 - B.legX, B.footY - lift[0]], side: -1 },
    { top: [8 + B.legX, J.legT], foot: [8 + B.legX, B.footY - lift[1]], side: 1 },
  ];
  const sw = [[0, 0], [.9, -.6], [-.6, .9]][f];
  J.arms = {
    l: { sh: [8 - B.armX + .15, J.sh + .9], hand: [8 - B.armX, B.handY + bob + sw[0]] },
    r: { sh: [8 + B.armX - .15, J.sh + .9], hand: [8 + B.armX, B.handY + bob + sw[1]] },
  };
  // the weapon hand is the hero's right hand: viewer-left from the front, viewer-right from the back
  J.wHand = dir === 's' ? J.arms.l.hand : J.arms.r.hand;
  J.oHand = dir === 's' ? J.arms.r.hand : J.arms.l.hand;
  return J;
}

/* ---------- weapons: a class silhouette in the item's own materials ---------- */
const WEAPON_MATS = w => {
  const p = w.p || {};
  switch (w.r) {
    case 'sword': return { blade: mt(p.blade, 'steel'), guard: mt(p.guardMat, 'iron'), grip: mt(p.grip, 'leather'), pommel: mt(p.pommel, 'iron'), glow: mt(p.fuller || (p.heat ? 'ember' : null), null), gem: mt(p.gem || p.pommelGem, null) };
    case 'dagger': return { blade: mt(p.blade, 'steel'), guard: mt(p.guardMat, 'iron'), grip: mt(p.grip, 'leather'), pommel: mt(p.pommel, 'iron'), glow: mt(p.fuller || p.tally || p.vein, null), gem: mt(p.pommelGem, null) };
    case 'axe': return { blade: mt(p.blade, 'steel'), haft: mt(p.haft, 'wood'), socket: mt(p.socket, 'iron'), glow: mt(p.edge || p.runes, null), gem: mt(p.gem, null), vine: mt(p.vine, null) };
    case 'hammer': return { head: mt(p.headMat, 'iron'), haft: mt(p.haft, 'wood'), band: mt(p.bandMat || p.trim, 'iron'), glow: mt(p.runes, null), gem: mt(p.gem, null), mace: p.style === 'mace' };
    case 'mace': return { head: mt(p.headMat, 'iron'), haft: mt(p.haft, 'wood'), band: mt(p.bandMat || p.trim, 'iron'), glow: null, gem: mt(p.gem, null), mace: true };
    case 'spear': return { head: mt(p.head, 'steel'), haft: mt(p.haft, 'wood'), socket: mt(p.socket || p.bandMat, 'iron'), glow: mt(p.fuller, null), ribbon: mt(p.ribbon, null), gem: mt(p.gem, null), butt: mt(p.butt, null) };
    case 'staff': return { haft: mt(p.haft, 'wood'), metal: mt(p.metal || p.bandMat, 'bronze'), gem: mt(p.gem || p.orb || p.crystal, null), glow: mt(p.glow, null), leaves: mt(p.leaves, null), style: p.style || 'crook', wrap: mt(p.wrap, null) };
    case 'bow': return { limb: mt(p.limb, 'wood'), grip: mt(p.grip, 'leather'), nock: mt(p.nock, 'bone'), gem: mt(p.gem, null), tassel: mt(p.tassel, null) };
    case 'pick': return { haft: mt(p.haft, 'wood'), head: mt(p.headMat, 'iron') };
  }
  return { blade: 'steel', guard: 'iron', grip: 'leather', pommel: 'iron' };
};
// the axis from the fist toward the business end, by view: long arms (spear, staff, bow) stand
// upright beside the body; everything else is carried low, blade or head down at the side
function weaponAxis(w, dir) {
  const r = w.r, long = r === 'spear' || r === 'staff' || r === 'bow';
  if (dir === 'e') return long ? (r === 'bow' ? [0, -1] : norm(.13, -1)) : norm(.72, .74);
  if (long) return [0, -1];
  return norm((dir === 's' ? -1 : 1) * .3, 1);
}
function weaponParts(F, w, J, anchors) {
  const dir = J.dir, M = WEAPON_MATS(w), r = w.r, p = w.p || {};
  const a = weaponAxis(w, dir), q = [-a[1], a[0]];
  let h = J.wHand.slice();
  if (dir !== 'e' && (r === 'spear' || r === 'staff')) h = [h[0] + (dir === 's' ? -.9 : .9), h[1] - .4];
  else if (dir !== 'e' && r !== 'bow') h = [h[0] + (dir === 's' ? .35 : -.35), h[1] + .2];
  if (dir !== 'e' && r === 'bow') h = [h[0] + (dir === 's' ? -.9 : .9), h[1] - .6];
  if (dir === 'e' && (r === 'spear' || r === 'staff')) h = [h[0] + 3.1, h[1] - 1.4];
  if (dir === 'e' && r === 'bow') h = [h[0] + 3.4, h[1] - 1.8];
  const at = (t, s = 0) => along(h, a, t, q, s);
  const W = { grp: 'weapon', weapon: true, relic: !!w.relic };
  const part = o => { const pt = F.add(Object.assign({}, W, o)); return pt; };
  let tip = at(4), mid = at(2.5);
  if (r === 'sword' || r === 'dagger' || !r) {
    const Lb = r === 'dagger' ? Math.max(3, Math.min(4.6, (p.bladeL || 34) / 8.4)) : Math.max(4.6, Math.min(7.2, (p.bladeL || 44) / 7));
    part({ mat: M.pommel || 'iron', prof: 'round', bw: .8, shapes: [O(at(-1.7), .72)] });
    part({ mat: M.grip || 'leather', prof: 'round', bw: .6, shapes: [C(at(-1.2), at(.9), .55)] });
    const g0 = 1.3, fang = p.shape === 'fang';
    part({ mat: M.blade, prof: 'ridge', hs: .6, tex: () => 1, shapes: [fang ? P([at(g0, -.8), at(g0 + Lb * .6, -.9 - (p.curve ? .5 : 0)), at(g0 + Lb + .4, .6), at(g0 + Lb * .5, .5), at(g0, .6)]) : P([at(g0, -.72), at(g0 + Lb - 1.1, -.62), at(g0 + Lb + .5, 0), at(g0 + Lb - 1.1, .62), at(g0, .72)])] });
    if (M.glow) part({ mat: M.glow, prof: 'flat', noShadow: true, noOutline: true, shapes: [C(at(g0 + .8), at(g0 + Lb - 1.2), .42)] });
    part({ mat: M.guard || 'iron', prof: 'round', bw: .7, shapes: [C(at(g0, p.guard === 'flame' ? -2 : -1.65), at(g0, p.guard === 'flame' ? 2 : 1.65), .58)] });
    if (M.gem) part({ mat: M.gem, prof: 'flat', noShadow: true, shapes: [O(at(g0), .5)] });
    tip = at(g0 + Lb); mid = at(g0 + Lb * .55);
  } else if (r === 'axe') {
    const L = 3.3, sd = dir === 'e' ? -1 : 1; // the edge faces away from the body (forward in side view)
    part({ mat: M.haft, prof: 'round', bw: .6, shapes: [C(at(-1.2), at(L + 1.4), .5)] });
    part({ mat: M.blade, prof: 'ridge', hs: .6, tex: () => 1, shapes: [P([at(L - .5, sd * .3), at(L + 1.6, sd * .3), at(L + 2.3, sd * 2.8), at(L - 1.2, sd * 2.8)])] });
    if (p.back === 'spike' || p.back === 'double') part({ mat: M.blade, prof: 'ridge', shapes: [P([at(L + .2, -sd * .3), at(L + 1.2, -sd * .3), at(L + .7, -sd * 1.9)])] });
    if (M.glow) part({ mat: M.glow, prof: 'flat', noShadow: true, noOutline: true, shapes: [C(at(L + 2, sd * 2.6), at(L - 1, sd * 2.6), .45)] });
    part({ mat: M.socket, prof: 'round', bw: .6, shapes: [C(at(L - .1), at(L + 1.4), .66)] });
    if (M.vine) part({ mat: M.vine, prof: 'round', bw: .5, noShadow: true, shapes: [C(at(.4, -.5), at(2.2, .5), .42)] });
    tip = at(L + 2.2, sd * 2.8); mid = at(L + .6, sd * 1.6);
  } else if (r === 'hammer' || r === 'mace') {
    const L = 2.6;
    part({ mat: M.haft, prof: 'round', bw: .6, shapes: [C(at(-1.3), at(L + .4), .5)] });
    if (M.mace) {
      part({ mat: M.head, prof: 'round', bw: 1.1, shapes: [O(at(L + 1.5), 1.35), P([at(L + 1.5, -2.1), at(L + 1.9, 0), at(L + 1.5, 2.1), at(L + 1.1, 0)]), P([at(L, 0), at(L + 1.5, -.4), at(L + 3.1, 0), at(L + 1.5, .4)])] });
      if (M.gem) part({ mat: M.gem, prof: 'flat', noShadow: true, shapes: [O(at(L + 1.5), .5)] });
      tip = at(L + 2.8); mid = at(L + 1.5);
    } else {
      const big = (p.headW || 12) > 13.5 ? .45 : 0;
      part({ mat: M.head, prof: 'bevel', bw: .9, shapes: [P([at(L, -1.9 - big), at(L + 2.9 + big, -1.9 - big), at(L + 2.9 + big, 1.9 + big), at(L, 1.9 + big)])] });
      if (M.glow) part({ mat: M.glow, prof: 'flat', noShadow: true, noOutline: true, shapes: [C(at(L + 1.4, -1.1), at(L + 1.4, 1.1), .4)] });
      part({ mat: M.band, prof: 'round', bw: .5, noShadow: true, shapes: [C(at(L - .4, -.8), at(L - .4, .8), .48)] });
      tip = at(L + 2.7, -1.6); mid = at(L + 1.4);
    }
  } else if (r === 'spear') {
    const lo = -5.2, hi = 14.2;
    part({ mat: M.haft, prof: 'round', bw: .6, shapes: [C(at(lo), at(hi), .5)] });
    part({ mat: M.head, prof: 'ridge', hs: .6, tex: () => 1, shapes: [P([at(hi - .6, -.95 - (p.wings ? .5 : 0)), at(hi + 1.2, -.75), at(hi + 3.6, 0), at(hi + 1.2, .75), at(hi - .6, .95 + (p.wings ? .5 : 0))])] });
    if (M.glow) part({ mat: M.glow, prof: 'flat', noShadow: true, noOutline: true, shapes: [C(at(hi + .2), at(hi + 2.2), .4)] });
    part({ mat: M.socket, prof: 'round', bw: .5, shapes: [C(at(hi - 1.1), at(hi - .3), .62)] });
    if (M.ribbon) part({ mat: M.ribbon, prof: 'flat', noShadow: true, shapes: [C(at(hi - 1.4, .4), at(hi - 3.2, 1.3), .45)] });
    tip = at(hi + 3.2); mid = at(hi + 1.5);
  } else if (r === 'staff') {
    const lo = -5.4, hi = 13.2, st = M.style;
    part({ mat: M.haft, prof: 'round', bw: .6, shapes: [C(at(lo), at(hi + (st === 'crook' ? .8 : 0)), .52)] });
    if (M.wrap) part({ mat: M.wrap, prof: 'round', bw: .5, noShadow: true, shapes: [C(at(-.3), at(1.5), .58)] });
    const top = at(hi + 1.4);
    if (st === 'crook') {
      part({ mat: M.haft, prof: 'round', bw: .6, shapes: [C(at(hi + .8), at(hi + 2.4, -.8), .52), C(at(hi + 2.4, -.8), at(hi + 2.2, -2.4), .52), C(at(hi + 2.2, -2.4), at(hi + .9, -2.6), .5)] });
      if (M.gem) part({ mat: M.gem, prof: 'round', bw: .6, noShadow: true, shapes: [O(at(hi + .7, -2.5), .6)] });
      if (M.metal && M.metal !== M.haft) part({ mat: M.metal, prof: 'round', bw: .5, noShadow: true, shapes: [C(at(hi - .4), at(hi + .5), .6)] });
      tip = at(hi + 2.4, -1.4);
    } else if (st === 'rings') {
      part({ mat: M.metal === 'bark' ? 'bark' : M.haft, prof: 'round', bw: .7, shapes: [O(top, 2.05)], cuts: [O(top, 1.05)] });
      part({ mat: M.glow || M.gem || 'verdant', prof: 'flat', noShadow: true, noOutline: true, shapes: [O(top, .75)] });
      if (M.leaves) part({ mat: M.leaves, prof: 'round', bw: .5, noShadow: true, shapes: [O(at(hi - .4, 1.2), .6)] });
      tip = top;
    } else if (st === 'orb' || st === 'sun') {
      part({ mat: M.metal, prof: 'round', bw: .6, shapes: [C(at(hi - .3, -1), at(hi + .5, 0), .45), C(at(hi - .3, 1), at(hi + .5, 0), .45)] });
      part({ mat: M.glow || M.gem || 'sapphire', prof: 'round', bw: 1, noShadow: true, shapes: [O(top, 1.35)] });
      tip = top;
    } else { // gnarl
      part({ mat: M.haft, prof: 'round', bw: .7, shapes: [O(at(hi + .5, .4), 1.2), C(at(hi + .5), at(hi + 2.2, -1), .45)] });
      if (M.glow || M.gem) part({ mat: M.glow || M.gem, prof: 'flat', noShadow: true, shapes: [O(at(hi + .8, .5), .55)] });
      if (M.leaves) part({ mat: M.leaves, prof: 'round', bw: .5, noShadow: true, shapes: [O(at(hi + 1.8, 1.2), .65)] });
      tip = at(hi + 1.2);
    }
    mid = tip;
  } else if (r === 'pick') { // a pickaxe: a haft and a head pointed at both ends
    const L = 3.4;
    part({ mat: M.haft || 'wood', prof: 'round', bw: .6, shapes: [C(at(-1.2), at(L + 1), .5)] });
    part({ mat: M.head || 'iron', prof: 'ridge', hs: .6, shapes: [P([at(L + .2, -3), at(L + 1.3, -.5), at(L + 1.5, 0), at(L + 1.3, .5), at(L + .2, 3), at(L + .8, 0)])] });
    tip = at(L + .2, 3); mid = at(L + 1, 0);
  } else if (r === 'bow') {
    const out = dir === 'e' ? 1 : dir === 's' ? -1 : 1;
    const top = add(h, [0, -6.6]), bot = add(h, [0, 5.6]), bulge = out * 1.9;
    const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8, y = top[1] + (bot[1] - top[1]) * u, x = h[0] + bulge * Math.sin(Math.PI * u); pts.push([x, y]); }
    const shapes = []; for (let k = 0; k < pts.length - 1; k++) shapes.push(C(pts[k], pts[k + 1], .55));
    part({ mat: M.limb, prof: 'round', bw: .6, shapes });
    part({ mat: 'string', prof: 'flat', noShadow: true, noOutline: true, shapes: [C(top, bot, .32)] });
    part({ mat: M.grip, prof: 'round', bw: .5, noShadow: true, shapes: [C(add(pts[4], [0, -.9]), add(pts[4], [0, .9]), .62)] });
    if (M.gem) part({ mat: M.gem, prof: 'flat', noShadow: true, shapes: [O(pts[4], .45)] });
    tip = pts[1]; mid = pts[4];
  }
  anchors.weaponTip = tip; anchors.weaponMid = mid;
}

/* ---------- off-hand: shields on the arm, foci in the hand ---------- */
function offhandParts(F, o, J, anchors) {
  const dir = J.dir, hd = J.oHand;
  if (o.look === 'buckler' || o.look === 'round' || o.look === 'heater' || o.look === 'tower') {
    const side = dir === 's' ? 1 : dir === 'n' ? -1 : 1;
    const c = dir === 'e' ? [11.6, J.sh + 3.5] : [hd[0] + side * .55, hd[1] - 2.1];
    const face = mt(o.face, 'wood'), rim = mt(o.rim, 'iron');
    let shapes;
    if (o.look === 'heater') shapes = [P([[c[0] - 2.3, c[1] - 2.6], [c[0] + 2.3, c[1] - 2.6], [c[0] + 2.3, c[1] + .4], [c[0], c[1] + 3.1], [c[0] - 2.3, c[1] + .4]])];
    else if (o.look === 'tower') shapes = [RECT(c[0] - 2.2, c[1] - 3.3, c[0] + 2.2, c[1] + 3.3)];
    else shapes = [dir === 'e' ? E(c, 1.7, o.look === 'round' ? 2.9 : 2.5) : O(c, o.look === 'round' ? 2.9 : 2.45)];
    F.add({ mat: face, prof: 'round', bw: 1.4, hs: .7, grp: 'shield', shapes });
    F.add({ mat: rim, prof: 'round', bw: .6, grp: 'shieldrim', noShadow: true, shapes, cuts: [o.look === 'heater' || o.look === 'tower' ? P(shapes[0].pts.map(([x, y]) => [c[0] + (x - c[0]) * .6, c[1] + (y - c[1]) * .62])) : dir === 'e' ? E(c, .9, 2) : O(c, o.look === 'round' ? 2 : 1.5)] });
    F.add({ mat: mt(o.gem, mt(o.boss, rim)), prof: 'round', bw: .6, grp: 'shieldboss', noShadow: true, shapes: [O(c, .62)] });
    anchors.shield = c;
    return;
  }
  // foci in the off hand
  const h = dir === 'e' ? [hd[0] + 3.3, hd[1] - 1] : hd;
  const glow = mt(o.glow, null), gem = mt(o.gem, glow || 'sapphire');
  if (o.look === 'orb') {
    F.add({ mat: mt(o.metal, 'gold'), prof: 'round', bw: .5, grp: 'focus', shapes: [C(add(h, [0, -.6]), add(h, [0, -1.5]), .6)] });
    F.add({ mat: gem, prof: 'round', bw: 1, grp: 'focus', noShadow: true, shapes: [O(add(h, [0, -2.6]), 1.3)] });
  } else if (o.look === 'tome') {
    F.add({ mat: mt(o.cover, 'leatherRed'), prof: 'round', bw: .8, grp: 'focus', shapes: [RECT(h[0] - 1.4, h[1] - 1.8, h[0] + 1.4, h[1] + 1.4)] });
    F.add({ mat: 'parchment', prof: 'flat', grp: 'focus', noShadow: true, noOutline: true, shapes: [RECT(h[0] - 1.4, h[1] + .4, h[0] + 1.4, h[1] + 1.4)] });
  } else if (o.look === 'rings') {
    F.add({ mat: 'wood', prof: 'round', bw: .7, grp: 'focus', shapes: [O(add(h, [0, 2.2]), 1.6)], cuts: [O(add(h, [0, 2.2]), .7)] });
    if (glow) F.add({ mat: glow, prof: 'flat', grp: 'focus', noShadow: true, noOutline: true, shapes: [O(add(h, [0, 2.2]), .5)] });
  } else if (o.look === 'lantern') {
    F.add({ mat: mt(o.metal, 'iron'), prof: 'round', bw: .6, grp: 'focus', shapes: [C(add(h, [0, .4]), add(h, [0, 1.3]), .4), RECT(h[0] - 1.3, h[1] + 1.3, h[0] + 1.3, h[1] + 4)] });
    F.add({ mat: glow || 'ember', prof: 'flat', grp: 'focus', noShadow: true, shapes: [RECT(h[0] - .6, h[1] + 2, h[0] + .6, h[1] + 3.4)] });
    anchors.g_offhand = [h[0] - .9, h[1] + 1.6];
  } else if (o.look === 'jar') { // a clay water jar held at the hip
    const c = [h[0] + (dir === 'e' ? -.6 : 0), h[1] + .6], m = mt(o.mat, 'rust');
    F.add({ mat: m, prof: 'round', bw: 1.4, grp: 'jar', shapes: [E(c, 2, 2.3), RECT(c[0] - .8, c[1] - 3.4, c[0] + .8, c[1] - 1.6)], tex: ({ y }) => (Math.abs(y - c[1]) < .6 ? { m: mt(o.band, 'clothWhite'), dd: -1 } : 0) });
    F.add({ mat: 'dark', prof: 'flat', grp: 'jarmouth', noShadow: true, shapes: [E([c[0], c[1] - 3.3], .8, .4)] });
    anchors.g_offhand = [c[0] - .8, c[1] - 1];
  } else { // sigil on a chain
    F.add({ mat: mt(o.metal, 'gold'), prof: 'round', bw: .5, grp: 'focus', shapes: [C(add(h, [0, .5]), add(h, [0, 1.8]), .35), O(add(h, [0, 2.8]), 1.25)] });
    F.add({ mat: gem, prof: 'flat', grp: 'focus', noShadow: true, shapes: [O(add(h, [0, 2.8]), .5)] });
  }
}

/* ---------- headgear by look ---------- */
const headInfo = h => ({ hood: h.look === 'hood' || h.look === 'coif', helm: h.look === 'helm' && h.style !== 'mask', hideFace: h.look === 'helm', wrap: h.look === 'wrap' });
function headgear(F, h, J) {
  const [cx, cy] = J.hc, rx = J.hrx, ry = J.hry, dir = J.dir, e = dir === 'e', n = dir === 'n';
  const look = h.look;
  if (look === 'kettle') {
    const m = mt(h.mat, 'steel');
    F.add({ mat: m, prof: 'round', bw: 2.2, grp: 'helm', shapes: [E([cx + (e ? -.3 : 0), cy - 1.7], rx - .1, ry - .2)], clip: RECT(-2, -2, 18, cy - 1.45) });
    F.add({ mat: m, prof: 'round', bw: .7, grp: 'brim', shapes: [C([cx - rx - (e ? 1.4 : 1.7), cy - 1.25], [cx + rx + (e ? 1.9 : 1.7), cy - 1.25], .72)] });
    if (h.trim) F.add({ mat: mt(h.trim, 'iron'), prof: 'round', bw: .5, grp: 'helmband', noShadow: true, shapes: [C([cx - rx + 1.2, cy - 2.4], [cx + rx - 1.2, cy - 2.4], .45)] });
    if (h.crest) F.add({ mat: mt(h.crest, m), prof: 'round', bw: .5, grp: 'crest', shapes: [C([cx, cy - ry - .4], [cx, cy - 2.6], .5)] });
    if (h.runes) F.add({ mat: mt(h.runes, 'frost'), prof: 'flat', grp: 'runes', noShadow: true, noOutline: true, shapes: [O([cx - 2, cy - 2.4], .4), O([cx + 1, cy - 2.4], .4)] });
    return { shade: 1 };
  }
  if (look === 'helm' && h.style === 'mask') {
    if (n) { F.add({ mat: mt(h.trim, 'leatherDark'), prof: 'round', bw: .5, grp: 'strap', noShadow: true, shapes: [C([cx - rx, cy + .6], [cx + rx, cy + .6], .5)] }); return {}; }
    const m = mt(h.mat, 'iron');
    F.add({ mat: m, prof: 'round', bw: 1.4, grp: 'mask', shapes: [e ? E([cx + 1.9, cy + 1.3], 2.7, 3.1) : E([cx, cy + 1.2], rx - .9, ry - 1)] });
    if (h.eyes) F.add({ mat: mt(h.eyes, 'blight'), prof: 'flat', grp: 'maskeyes', noShadow: true, noOutline: true, shapes: e ? [RECT(cx + 2, cy + .6, cx + 3, cy + 1.6)] : [RECT(cx - 2.5, cy + .6, cx - 1.5, cy + 1.6), RECT(cx + 1.5, cy + .6, cx + 2.5, cy + 1.6)] });
    if (h.trim) F.add({ mat: mt(h.trim, 'bronze'), prof: 'round', bw: .4, grp: 'maskband', noShadow: true, shapes: [e ? C([cx + .4, cy - 1.3], [cx + rx - .2, cy - 1.3], .42) : C([cx - rx + 1.2, cy - 1.4], [cx + rx - 1.2, cy - 1.4], .42)] });
    return { hideFace: true, mask: true };
  }
  if (look === 'helm') {
    const m = mt(h.mat, 'steel');
    F.add({ mat: m, prof: 'round', bw: 2.4, grp: 'helm', shapes: [E([cx + (e ? -.2 : 0), cy - .3], rx + .3, ry + .15)] });
    if (!n) F.add({ mat: 'dark', prof: 'flat', grp: 'visor', noShadow: true, shapes: [e ? RECT(cx + .6, cy + .9, cx + rx + .3, cy + 1.9) : RECT(cx - rx + 1.4, cy + .9, cx + rx - 1.4, cy + 1.9)] });
    if (h.eyes && !n) F.add({ mat: mt(h.eyes, 'frost'), prof: 'flat', grp: 'visoreyes', noShadow: true, noOutline: true, shapes: e ? [RECT(cx + 2, cy + .9, cx + 3, cy + 1.9)] : [RECT(cx - 2.5, cy + .9, cx - 1.5, cy + 1.9), RECT(cx + 1.5, cy + .9, cx + 2.5, cy + 1.9)] });
    if (h.crest !== null && h.crest !== false) F.add({ mat: mt(h.crest, m), prof: 'round', bw: .5, grp: 'crest', shapes: [e ? C([cx - 2.8, cy - ry - .1], [cx + 1.2, cy - ry - .6], .55) : C([cx, cy - ry - .9], [cx, cy - 2], .55)] });
    if (h.plume) F.add({ mat: mt(h.plume, 'cloakRed'), prof: 'round', bw: .6, grp: 'plume', shapes: [C([cx + (e ? -1 : 0), cy - ry - .6], [cx + (e ? -4.2 : 2.6), cy - ry - 1.2], .7, .45)] });
    if (h.trim) F.add({ mat: mt(h.trim, 'iron'), prof: 'round', bw: .5, grp: 'helmband', noShadow: true, shapes: [C([cx - rx - .1 + (e ? 1.5 : 0), cy - .3], [cx + rx + .1, cy - .3], .45)] });
    if (h.gem && !n) F.add({ mat: mt(h.gem, 'ruby'), prof: 'flat', grp: 'helmgem', noShadow: true, shapes: [O([cx + (e ? 2.4 : 0), cy - .4], .55)] });
    return { hideFace: true, helm: true };
  }
  if (look === 'hood' || look === 'coif') {
    const coif = look === 'coif', m = mt(h.mat, coif ? 'wool' : 'cloakGreen');
    const tex = coif && MAT[m].metal ? TEXW.mail : m === 'rags' ? TEXW.rags : null;
    const body = [E([cx + (e ? -.5 : 0), cy - .1], rx + .75, ry + .55), P([[cx - rx - .3 + (e ? 1.2 : 0), cy + 1.5], [cx + rx + .3, cy + 1.5], [cx + rx + 1.1 - (e ? 1.6 : 0), J.sh + 1.6], [cx - rx - 1.1 + (e ? .6 : 0), J.sh + 1.6]])];
    if (!coif && (h.tip ?? 1)) body.push(e ? P([[cx - 1.4, cy - ry], [cx - 5.2, cy - ry + .9], [cx - 3.2, cy - ry + 2.4]]) : P([[cx - 1.4, cy - ry + .2], [cx + 2.4, cy - ry - 1.8], [cx + 1.6, cy - ry + 1.2]]));
    const cuts = n ? [] : [e ? E([cx + 2.2, cy + 1.25], 2.6, 2.9) : E([cx, cy + 1.3], rx - 1.25, ry - 1.35)];
    F.add({ mat: m, prof: 'round', bw: 2, grp: 'hood', shapes: body, cuts, tex });
    if (h.trim && !n) F.add({ mat: mt(h.trim, 'leather'), prof: 'round', bw: .5, grp: 'hoodtrim', noShadow: true, shapes: [e ? E([cx + 2.2, cy + 1.25], 3.25, 3.55) : E([cx, cy + 1.3], rx - .6, ry - .7)], cuts });
    if ((h.clasp || h.gem) && !n) F.add({ mat: mt(h.gem, mt(h.clasp, 'bronze')), prof: 'round', bw: .5, grp: 'hoodclasp', noShadow: true, shapes: [O([cx + (e ? 1.6 : 0), J.sh + .7], .62)] });
    if (h.vine && !n) F.add({ mat: mt(h.vine, 'bramble'), prof: 'round', bw: .4, grp: 'hoodvine', noShadow: true, shapes: [C([cx - rx + .1, cy + 1.6], [cx - rx + 1, cy - 2.6], .42)] });
    return { hood: true, opening: !n };
  }
  if (look === 'circlet') {
    if (n) { F.add({ mat: mt(h.mat, 'gold'), prof: 'round', bw: .5, grp: 'circlet', shapes: [C([cx - rx + .2, cy - 1.1], [cx + rx - .2, cy - 1.1], .5)] }); return {}; }
    if (h.style === 'rotwood') {
      F.add({ mat: mt(h.mat, 'rotwood'), prof: 'round', bw: .5, grp: 'circlet', shapes: [C([cx - rx + (e ? 1.6 : .2), cy - 1.6], [cx + rx - .2, cy - 1.6], .55)] });
      F.add({ mat: 'thorn', prof: 'ridge', grp: 'circletthorn', shapes: [P([[cx - 3.6, cy - 1.8], [cx - 4.4, cy - 4.3], [cx - 2.6, cy - 1.9]]), P([[cx + 2.8, cy - 1.8], [cx + 4.2, cy - 4.2], [cx + 3.8, cy - 1.6]])] });
      F.add({ mat: mt(h.gem, 'blight'), prof: 'flat', grp: 'circletgem', noShadow: true, shapes: [O([cx + (e ? 2.6 : .5), cy - 1.7], .62)] });
    } else {
      F.add({ mat: mt(h.mat, 'gold'), prof: 'round', bw: .5, grp: 'circlet', shapes: [C([cx - rx + (e ? 1.6 : .2), cy - 1.6], [cx + rx - .2, cy - 1.6], .52)] });
      F.add({ mat: mt(h.gem, 'ember'), prof: 'flat', grp: 'circletgem', noShadow: true, shapes: [O([cx + (e ? 2.6 : 0), cy - 1.7], .62)] });
    }
    return {};
  }
  if (look === 'wrap') { // a turban: wound cloth over the crown down to the brow, a loose tail, a brooch; style 'helm' sets a pointed steel cap on it
    const m = mt(h.mat, 'clothWhite'), tall = h.tall ? 1 : 0, helm = h.style === 'helm', brow = cy - 1.1, top = cy - ry - .5 - tall * 1.3, ox = e ? -.6 : 0;
    if (h.tail !== false) F.add({ mat: mt(h.tail, m), prof: 'round', bw: .7, grp: 'wraptail', shapes: [e ? C([cx - 3, cy - 1.6], [cx - 4.6, cy + 4.4], 1.1, .8) : n ? C([cx + .6, cy - 1], [cx + .4, J.sh + 2.6], 1.2, .9) : C([cx + rx - .6, cy - 1.2], [cx + rx + .6, J.sh + 2.2], 1, .75)] });
    const dome = P([[cx - rx - .15 + ox + (e ? 1 : 0), brow + .4], [cx - rx + .2 + ox, cy - 2.6], [cx - 2.6 + ox, top + 1], [cx - .6 + ox, top], [cx + 1.6 + ox, top + .3], [cx + rx - .5, cy - 2.8], [cx + rx + .15, brow + .4]]);
    F.add({ mat: m, prof: 'round', bw: 2, grp: 'wrap', shapes: [dome], tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : (x + y * 2) % 5 === 1 ? .3 : 0) });
    F.add({ mat: mt(h.band, m), prof: 'round', bw: .6, grp: 'wrapband', noShadow: true, shapes: [C([cx - rx + (e ? 1.2 : 0) + ox, brow - .1], [cx + rx, brow - .1], .7)], tex: () => -.5 });
    if (helm) {
      const c = mt(h.metal, 'steel');
      F.add({ mat: c, prof: 'round', bw: 1.6, grp: 'cap', shapes: [P([[cx - rx + 1 + ox + (e ? .4 : 0), cy - 2.4], [cx - 1.4 + ox, cy - ry - 1], [cx + ox, cy - ry - 3.2], [cx + 1.4 + ox, cy - ry - 1], [cx + rx - .9, cy - 2.4]])] });
      if (h.trim) F.add({ mat: mt(h.trim, 'gold'), prof: 'round', bw: .5, grp: 'caprim', noShadow: true, shapes: [C([cx - rx + 1.3 + ox + (e ? .4 : 0), cy - 2.5], [cx + rx - 1.2, cy - 2.5], .45)] });
    } else if ((h.gem || h.clasp) && !n) F.add({ mat: mt(h.gem, mt(h.clasp, 'gold')), prof: 'round', bw: .5, grp: 'wrapgem', noShadow: true, shapes: [O([cx + (e ? 2.8 : 0), brow - .4], .75)] });
    return { wrap: true };
  }
  if (look === 'fez') {
    const m = mt(h.mat, 'robeRed'), top = cy - ry - 1.6;
    F.add({ mat: m, prof: 'round', bw: 1.2, grp: 'fez', shapes: [P([[cx - 2.8 + (e ? -.2 : 0), cy - 2.4], [cx - 2.3, top], [cx + 2.3, top], [cx + 2.8, cy - 2.4]])], tex: ({ y }) => (y > cy - 3.4 ? -.6 : 0) });
    F.add({ mat: mt(h.trim, 'gold'), prof: 'round', bw: .4, grp: 'tassel', noShadow: true, shapes: [e ? C([cx, top + .3], [cx - 2.6, top + 2.4], .42) : C([cx, top + .3], [cx + 2.6, top + 2.2], .42)] });
    return {};
  }
  if (look === 'cap') { // a miner's hard cap with a lamp on the brow
    const m = mt(h.mat, 'leather');
    F.add({ mat: m, prof: 'round', bw: 2, grp: 'cap', shapes: [E([cx + (e ? -.2 : 0), cy - 1.8], rx + .2, ry - .5)], clip: RECT(-2, -3, 18, cy - .9) });
    F.add({ mat: m, prof: 'round', bw: .6, grp: 'capbrim', shapes: [e ? C([cx - 1, cy - 1.1], [cx + rx + 1.4, cy - 1.1], .6) : C([cx - rx - .4, cy - 1.1], [cx + rx + .4, cy - 1.1], .55)] });
    if (!n) {
      const at = e ? [cx + 3.1, cy - 2.8] : [cx, cy - 3.2];
      F.add({ mat: mt(h.metal, 'bronze'), prof: 'round', bw: .6, grp: 'lampcup', shapes: [O(at, 1.25)] });
      F.add({ mat: mt(h.glow, 'amber'), prof: 'flat', grp: 'lamp', noShadow: true, shapes: [O(at, .7)] });
    }
    return {};
  }
  if (look === 'crown') {
    const by = cy - ry + 1.1;
    if (h.style === 'thorn') {
      const xs = e ? [-3.4, -1.2, 1, 3] : [-3.8, -1.6, .6, 2.8, 4.4];
      F.add({ mat: 'thorn', prof: 'ridge', grp: 'crownthorns', shapes: xs.map((dx, k) => P([[cx + dx - .75, by + .4], [cx + dx + (dx < 0 ? -.4 : .4), by - 2.2 - (k % 2) * .8], [cx + dx + .75, by + .4]])) });
      F.add({ mat: mt(h.mat, 'bramble'), prof: 'round', bw: .7, grp: 'crownband', shapes: [C([cx - rx + .3 + (e ? 1 : 0), by + .6], [cx + rx - .3, by + .6], .75)] });
      if (h.buds) F.add({ mat: mt(h.buds, 'verdant'), prof: 'flat', grp: 'crownbuds', noShadow: true, shapes: [O([cx - 1.6, by + .7], .5), O([cx + 2, by + .6], .5)] });
      return {};
    }
    const m = h.style === 'regal' ? mt(h.metal, 'gold') : 'bronze';
    const tines = (e ? [-2.8, 0, 2.6] : [-3.4, -1.1, 1.1, 3.4]).map((dx, k) => P([[cx + dx - .9, by + .5], [cx + dx, by - 2 - ((k === 1 || k === 2) && !e ? .7 : 0)], [cx + dx + .9, by + .5]]));
    F.add({ mat: m, prof: 'bevel', bw: .5, grp: 'crown', shapes: tines });
    F.add({ mat: m, prof: 'round', bw: .6, grp: 'crownband', shapes: [C([cx - rx + .6 + (e ? 1 : 0), by + .7], [cx + rx - .6, by + .7], .7)] });
    if (!n) F.add({ mat: mt(h.gem, 'ruby'), prof: 'flat', grp: 'crowngem', noShadow: true, shapes: [O([cx + (e ? 2 : 0), by + .6], .55)] });
    return {};
  }
  return {};
}

/* ---------- hair ---------- */
function hairParts(F, H, J, stage, hg) {
  const style = H.hair || 'short', m = mt(H.hairMat, 'hairBrown');
  if (style === 'none') return;
  const [cx, cy] = J.hc, rx = J.hrx, ry = J.hry, dir = J.dir;
  if (hg && (hg.hood || hg.helm) && stage === 'back') return;
  if (stage === 'back') { // behind the head and body
    if (style === 'long') {
      if (dir === 'e') F.add({ mat: m, prof: 'round', bw: 1.4, grp: 'hairback', shapes: [P([[cx - 1, cy - 2], [cx - rx - .3, cy - 1], [cx - rx - .7, cy + 5], [cx - 1.6, cy + 6.3], [cx + .4, cy + 3]])], tex: TEXW.hair });
      else F.add({ mat: m, prof: 'round', bw: 1.6, grp: 'hairback', shapes: [P([[cx - rx - .2, cy - 1.2], [cx + rx + .2, cy - 1.2], [cx + rx + .6, cy + 5.6], [cx + 2, cy + 6.3], [cx - 2, cy + 6.3], [cx - rx - .6, cy + 5.6]])], tex: TEXW.hair });
    }
    if (style === 'pony') F.add({ mat: m, prof: 'round', bw: .8, grp: 'hairback', shapes: dir === 'e' ? [C([cx - 3, cy - 2], [cx - 5.4, cy + 2.6], 1.1, .7)] : dir === 'n' ? [C([cx, cy - 1], [cx, cy + 5.4], 1.1, .7)] : [C([cx + 3.2, cy - 2], [cx + 5, cy + 2.4], 1, .6)] });
    if (style === 'braid' && dir !== 's') F.add({ mat: m, prof: 'round', bw: .7, grp: 'hairback', shapes: dir === 'e' ? [C([cx - 3, cy], [cx - 3.6, cy + 6], .9, .6)] : [C([cx + .6, cy + 1], [cx + .8, cy + 7], .9, .6)] });
    return;
  }
  if (hg && (hg.helm || hg.wrap)) return;
  if (hg && hg.hood) { // bangs in the face opening
    if (dir === 'n') return;
    F.add({ mat: m, prof: 'round', bw: .8, grp: 'hair', shapes: [dir === 'e' ? E([cx + 1.6, cy - 1.6], 2.3, 1.3) : E([cx, cy - 1.7], rx - 1.3, 1.5)], tex: TEXW.hair });
    return;
  }
  if (dir === 'n') { // the whole back of the head
    F.add({ mat: m, prof: 'round', bw: 2.2, grp: 'hair', shapes: [E([cx, cy - .6], rx + .45, ry + .2)], clip: RECT(-2, -2, 18, cy + (style === 'crop' ? 1.4 : 3)), tex: TEXW.hair });
    if (style === 'bun') F.add({ mat: m, prof: 'round', bw: 1, grp: 'bun', shapes: [O([cx, cy - ry - .2], 1.5)] });
    return;
  }
  const crop = style === 'crop';
  if (dir === 'e') {
    const clip = P([[-2, -2], [18, -2], [18, cy - 1.35], [cx + 2.6, cy - 1.45], [cx + 1, cy - .9], [cx + .45, cy + (crop ? .2 : 1.4)], [cx - .4, cy + 3.2], [-2, cy + 4.2]]);
    F.add({ mat: m, prof: 'round', bw: 2, grp: 'hair', shapes: [E([cx - .3, cy - .9], rx + .45, ry + .1)], clip, tex: TEXW.hair });
  } else {
    const side = crop ? .4 : 1.4;
    const clip = P([[-2, -2], [18, -2], [18, cy + side], [cx + rx - 1.25, cy + side], [cx + rx - 1.35, cy - .8], [cx + 1.6, cy - 1.3], [cx, cy - .7], [cx - 1.6, cy - 1.3], [cx - rx + 1.35, cy - .8], [cx - rx + 1.25, cy + side], [-2, cy + side]]);
    F.add({ mat: m, prof: 'round', bw: 2, grp: 'hair', shapes: [E([cx, cy - 1], rx + .45, ry + .05)], clip, tex: TEXW.hair });
  }
  if (style === 'bun') F.add({ mat: m, prof: 'round', bw: 1, grp: 'bun', shapes: [O([cx + (dir === 'e' ? -1.4 : 0), cy - ry - .2], 1.5)] });
  if (style === 'braid' && dir === 's') F.add({ mat: m, prof: 'round', bw: .7, grp: 'braid', shapes: [O([cx + 3.6, cy + 2.6], .9), O([cx + 3.9, cy + 4.2], .85), O([cx + 4.1, cy + 5.8], .75)] });
}

/* ---------- the rig ---------- */
// One frame: H identity (heroes.js vocabulary), L gear looks, M per-slot meta, dir s|n|e, f 0..2.
function rigFrame(H, L, M, dir, f) {
  const B = BUILDS[H.build] || BUILDS.human, J = joints(B, dir, f), F = new Forge(WALKER_W, WALKER_H);
  const g = L || {}, body = bodyOf(H, g), robe = body.kind === 'robe', e = dir === 'e', n = dir === 'n';
  const anchors = { foot: WALKER_FOOT.slice(), head: [8, Math.round(J.hc[1] - J.hry - 1)] };
  const skin = mt(H.skin, 'skin');
  const [cx, cy] = J.hc;
  const hgLook = g.head || null;

  // --- behind everything: cloak (front and side views), long hair, quiver on the back
  const cloak = mt(H.cloak, null);
  if (cloak && !n) {
    if (e) F.add({ mat: cloak, prof: 'round', bw: 1.6, grp: 'cloak', shapes: [P([[6.4, J.sh - .2], [9.2, J.sh - .2], [8.4, J.hipY - 1], [7.4, 21.2 + (f ? .3 : 0)], [3.2 - (f === 1 ? .6 : f === 2 ? -.4 : 0), 21.4], [3.8, J.sh + 3.4]])], tex: darker(H.cloak === 'rags' ? TEXW.rags : null) });
    else F.add({ mat: cloak, prof: 'round', bw: 1.6, grp: 'cloak', shapes: [P([[8 - B.shW + .3, J.sh], [8 + B.shW - .3, J.sh], [8 + B.shW + 1.5, J.hipY - .4], [8 + B.shW + 2, 21.1], [10.2, 21.5], [8, 20.9], [5.8, 21.5], [8 - B.shW - 2, 21.1], [8 - B.shW - 1.5, J.hipY - .4]])], tex: darker(H.cloak === 'rags' ? TEXW.rags : null) });
  }
  if (H.quiver && dir === 's') F.add({ mat: mt(H.fletch, 'clothWhite'), prof: 'round', bw: .5, grp: 'fletch', shapes: [C([cx + 4.2, J.sh - .6], [cx + 5.4, J.sh - 2.8], .55)] });
  if (H.quiver && e) {
    F.add({ mat: mt(H.quiver, 'leather'), prof: 'round', bw: .8, grp: 'quiver', shapes: [C([5.2, J.sh - .6], [6.4, J.sh + 5.6], 1.05, .9)] });
    F.add({ mat: mt(H.fletch, 'clothWhite'), prof: 'round', bw: .5, grp: 'fletch', shapes: [C([5, J.sh - .8], [4.4, J.sh - 2.8], .6)] });
  }
  hairParts(F, H, J, 'back', hgLook ? headInfo(hgLook) : null);

  // --- far limbs (side view)
  const glove = mt(g.hands && g.hands.mat, mt(H.gloves, 'leather'));
  const sleeve = mt(body.sleeve || body.shirt || (body.kind === 'leather' ? H.tunic || 'gambeson' : body.mat), body.mat);
  const bootMat = mt(g.feet && g.feet.mat, mt(H.boots, 'leather'));
  const pants = mt(H.pants, 'pants');
  const drawLeg = (leg, tex) => {
    const [x0, y0] = leg.top, [x1, y1] = leg.foot;
    if (!robe) F.add({ mat: pants, prof: 'round', bw: 1, grp: 'leg' + (leg.side || (leg.far ? 'f' : 'n')), shapes: [C([x0, y0], [x1, y1 - 1.6], B.legR)], tex });
    const bt = Math.min(y1 - 2.2, B.bootT + (B.footY - y1) * .5 + (J.bob && !e ? .4 : 0));
    const toe = e ? 1 : 0;
    F.add({ mat: bootMat, prof: 'round', bw: .9, grp: 'boot' + (leg.side || (leg.far ? 'f' : 'n')), shapes: [P([[x1 - 1.05, bt], [x1 + 1.05, bt], [x1 + 1.15 + toe, y1], [x1 - 1.15, y1]])], tex });
    if (leg.side === 1 || leg.far === false) anchors.g_feet = [x1 + (e ? .6 : 0), bt + .8];
    if (g.feet && g.feet.greave) F.add({ mat: mt(g.feet.greave, 'iron'), prof: 'round', bw: .6, grp: 'greave' + (leg.side || leg.far), noShadow: true, shapes: [RECT(x1 - 1.05, bt - .2, x1 + 1.05, bt + 1.2)], tex });
    else if (g.feet && g.feet.trim) F.add({ mat: mt(g.feet.trim, 'leatherDark'), prof: 'round', bw: .5, grp: 'bootcuff' + (leg.side || leg.far), noShadow: true, shapes: [RECT(x1 - 1.1, bt - .1, x1 + 1.1, bt + .85)], tex });
  };
  const arm = (a, grp, tex) => {
    F.add({ mat: sleeve, prof: 'round', bw: 1, grp, shapes: [C(a.sh, [a.hand[0], a.hand[1] - .9], B.armR)], tex: tex || (body.sleeve || body.shirt ? null : body.tex) });
    if (g.hands && g.hands.plate) F.add({ mat: glove, prof: 'round', bw: .7, grp: grp + 'v', shapes: [C([a.hand[0], a.hand[1] - 1.6], [a.hand[0], a.hand[1] - .6], B.armR + .08)], tex });
  };
  const hand = (a, grp, tex) => F.add({ mat: glove, prof: 'round', bw: .9, grp, shapes: [O(a.hand, B.handR)], tex });
  if (e) {
    const far = J.legs[0];
    drawLeg(far, darker(null));
    arm(J.arms.far, 'armF', darker(body.sleeve || body.shirt ? null : body.tex));
    hand(J.arms.far, 'handF', darker(null));
    if (g.offhand && (g.offhand.look === 'buckler' || g.offhand.look === 'round' || g.offhand.look === 'heater' || g.offhand.look === 'tower')) offhandParts(F, g.offhand, J, anchors);
  }

  // --- legs and boots
  if (e) drawLeg(J.legs[1]); else for (const leg of J.legs) drawLeg(leg);

  // --- torso
  const sw = e ? 2.5 : B.shW, ww = e ? 2.35 : B.waW, hw = e ? 2.6 : B.hipW, tx = J.cx;
  const tp = [[tx - sw + .3, J.sh - .1], [tx + sw - .3, J.sh - .1], [tx + sw + .35, J.sh + 1.6], [tx + ww + .15, J.waY], [tx + hw, J.hipY], [tx, J.hipY + .5], [tx - hw, J.hipY], [tx - ww - .15, J.waY], [tx - sw - .35, J.sh + 1.6]];
  if (robe) {
    const sk = e ? 3.1 : B.hipW + 1.2, bot = B.footY - .9;
    F.add({ mat: mt(body.skirt, body.mat), prof: 'round', bw: 1.2, grp: 'robe', shapes: [P(e ? [[tx - 2.4, J.waY], [tx + 2.4, J.waY], [tx + 3.2 + (f === 1 ? .5 : 0), bot], [tx - 3.3 - (f === 2 ? .5 : 0), bot]] : [[tx - ww, J.waY], [tx + ww, J.waY], [tx + sk, bot], [tx, bot + .4], [tx - sk, bot]])], tex: ({ x, y }) => (y >= bot - 1.2 && body.hem ? { m: mt(body.hem, 'gold'), dd: 0 } : (x % 3 === 0 && y > J.waY + 1 ? -1 : 0)) });
  }
  F.add({ mat: body.mat, prof: 'round', bw: 1.4, grp: 'torso', shapes: [P(tp)], tex: body.tex });
  if (body.kind === 'plate') F.add({ mat: body.mat, prof: 'round', bw: 1, grp: 'faulds', noShadow: true, shapes: [RECT(tx - hw - .2, J.waY + .5, tx + hw + .2, J.hipY + .6)], tex: ({ y }) => (y % 2 === 0 ? -1 : 0) });
  const tabard = body.tabard || (body.kind !== 'robe' && body.kind !== 'plate' ? H.tabard : null);
  if (tabard && !n) F.add({ mat: mt(tabard, 'cloakRed'), prof: 'round', bw: 1, grp: 'tabard', noShadow: true, shapes: [e ? P([[tx + .4, J.sh], [tx + 2.4, J.sh], [tx + 2.8, J.hipY + 1.2], [tx + .2, J.hipY + 1.2]]) : P([[tx - 1.7, J.sh], [tx + 1.7, J.sh], [tx + 1.9, J.hipY + 1], [tx, J.hipY + 1.8], [tx - 1.9, J.hipY + 1]])] });
  if (body.hem && body.kind !== 'robe' && !n) F.add({ mat: mt(body.hem, 'gold'), prof: 'round', bw: .5, grp: 'trim', noShadow: true, shapes: [C([tx - hw + .4, J.hipY - .1], [tx + hw - .4, J.hipY - .1], .45)] });
  if (body.vine && !n) F.add({ mat: mt(body.vine, 'bramble'), prof: 'round', bw: .4, grp: 'vine', noShadow: true, shapes: [C([tx - 2.2, J.hipY - .6], [tx - 1.4, J.sh + 1.4], .42)] });
  const belt = body.sash || (robe ? null : body.belt || 'leather');
  if (belt || robe) F.add({ mat: mt(belt, 'leather'), prof: 'round', bw: .5, grp: 'belt', noShadow: true, shapes: [C([tx - ww - .4, J.waY], [tx + ww + .4, J.waY], .55)] });
  if (H.trinket && !n) { // hanging at the hip, on the side away from the weapon hand
    const T = H.trinket, m = mt(T.mat, 'iron'), c = e ? [tx - 1.2, J.waY + 2] : [tx + ww + .2, J.waY + 1.8];
    const sh = T.kind === 'key' ? [O([c[0], c[1] - .6], .95), C([c[0], c[1]], [c[0], c[1] + 2.6], .42), C([c[0], c[1] + 2.4], [c[0] + .9, c[1] + 2.4], .38)]
      : T.kind === 'ledger' ? [RECT(c[0] - 1.1, c[1] - .6, c[0] + 1.1, c[1] + 2.2)] : T.kind === 'gourd' ? [O([c[0], c[1] + 1.4], 1.3), O([c[0], c[1] - .2], .75)] : [E([c[0], c[1] + 1], 1.2, 1.4)];
    F.add({ mat: m, prof: 'round', bw: .6, grp: 'trinket', shapes: sh, cuts: T.kind === 'key' ? [O([c[0], c[1] - .6], .4)] : undefined });
    if (T.gem) F.add({ mat: mt(T.gem, 'ember'), prof: 'flat', grp: 'trinketgem', noShadow: true, shapes: [O([c[0], c[1] + (T.kind === 'key' ? -.6 : 1)], .5)] });
    anchors.g_trinket = [c[0] - .5, c[1] - .5];
  }

  // --- cloak over the back (north view), quiver on it
  if (cloak && n) F.add({ mat: cloak, prof: 'round', bw: 2, grp: 'cloakb', shapes: [P([[8 - B.shW - .2, J.sh - .1], [8 + B.shW + .2, J.sh - .1], [8 + B.shW + 1.4, J.hipY], [8 + B.shW + 1.6, 21 + (f ? .3 : 0)], [8, 21.5], [8 - B.shW - 1.6, 21 + (f ? .3 : 0)], [8 - B.shW - 1.4, J.hipY]])], tex: ({ x, y }) => (y > J.waY && (x + 1) % 3 === 0 ? -1 : 0) });
  if (H.quiver && n) {
    F.add({ mat: mt(H.quiver, 'leather'), prof: 'round', bw: .8, grp: 'quiver', shapes: [C([10.2, J.sh + .2], [6.6, J.sh + 5.4], 1.05, .95)] });
    F.add({ mat: mt(H.fletch, 'clothWhite'), prof: 'round', bw: .5, grp: 'fletch', shapes: [C([10.6, J.sh - .2], [11.6, J.sh - 1.8], .6)] });
  }
  if (H.quiver && dir === 's') F.add({ mat: mt(H.quiver, 'leather'), prof: 'round', bw: .4, grp: 'strap', noShadow: true, shapes: [C([tx - B.shW + 1.2, J.sh + .2], [tx + B.shW - .6, J.waY - .6], .45)] });

  // --- amulet chain (the pendant pixel is painted after compose)
  const amu = g.amulet && !n ? g.amulet : null;
  // --- mantle, pauldrons
  if (H.mantle && !robe) F.add({ mat: mt(H.mantle, 'cloakRed'), prof: 'round', bw: 1, grp: 'mantle', noShadow: true, shapes: [e ? C([tx - 1.6, J.sh + .4], [tx + 1.8, J.sh + .5], 1.2) : C([tx - sw + .6, J.sh + .5], [tx + sw - .6, J.sh + .5], 1.2)] });
  if (H.mantle && robe && !e) F.add({ mat: mt(H.mantle, 'cloakRed'), prof: 'round', bw: 1, grp: 'mantle', noShadow: true, shapes: [C([tx - sw + .9, J.sh + .3], [tx + sw - .9, J.sh + .3], 1.05)] });
  if (body.pauldrons) {
    const pm = mt(body.pauldrons, body.mat);
    if (e) F.add({ mat: pm, prof: 'round', bw: 1, grp: 'pdN', noShadow: true, shapes: [E([tx + .6, J.sh + .7], 1.9, 1.35)] });
    else for (const s of [-1, 1]) F.add({ mat: pm, prof: 'round', bw: 1, grp: 'pd' + s, noShadow: true, shapes: [E([tx + s * (sw - .1), J.sh + .7], 1.75, 1.3)] });
  }

  // --- arms, off-hand, weapon
  const shieldLook = g.offhand && (g.offhand.look === 'buckler' || g.offhand.look === 'round' || g.offhand.look === 'heater' || g.offhand.look === 'tower');
  if (e) {
    if (g.offhand && !shieldLook) offhandParts(F, g.offhand, J, anchors);
    arm(J.arms.near, 'armN');
    if (g.weapon) weaponParts(F, g.weapon, J, anchors);
    hand(J.arms.near, 'handN');
  } else {
    const wa = dir === 's' ? J.arms.l : J.arms.r, oa = dir === 's' ? J.arms.r : J.arms.l;
    arm(oa, 'armO'); hand(oa, 'handO');
    if (g.offhand) offhandParts(F, g.offhand, J, anchors);
    arm(wa, 'armW');
    if (g.weapon) weaponParts(F, g.weapon, J, anchors);
    hand(wa, 'handW');
  }

  // --- head, ears, beard, hair, headgear, face cloths
  F.add({ mat: skin, prof: 'round', bw: 3, grp: 'head', shapes: [E(J.hc, J.hrx, J.hry)] });
  if (H.beard && !n) F.add({ mat: mt(H.hairMat, 'hairBrown'), prof: 'round', bw: 1.2, grp: 'beard', shapes: [e ? E([cx + 1.4, cy + 2.8], 2.9, 2.1) : E([cx, cy + 2.7], J.hrx - .9, 2.2)], clip: RECT(-2, cy + 1.95, 18, 30), tex: TEXW.hair });
  const hg = hgLook ? headInfo(hgLook) : null;
  hairParts(F, H, J, 'front', hg);
  if (hgLook) headgear(F, hgLook, J, H);
  if (H.goggles) { // brass goggles pushed up on the brow
    const gy = cy - 2.5, fr = mt(H.goggles, 'bronze'), lens = mt(H.lens, 'seaglass');
    F.add({ mat: mt(H.strap, 'leatherDark'), prof: 'round', bw: .4, grp: 'gogstrap', noShadow: true, shapes: [e ? C([cx - J.hrx + .4, gy + .6], [cx + 2, gy], .45) : C([cx - J.hrx - .1, gy + .2], [cx + J.hrx + .1, gy + .2], .45)] });
    if (!n) {
      const L = e ? [[cx + 2.5, gy]] : [[cx - 1.8, gy], [cx + 1.8, gy]];
      F.add({ mat: fr, prof: 'round', bw: .6, grp: 'gogframe', shapes: L.map(c => O(c, 1.2)) });
      F.add({ mat: lens, prof: 'flat', grp: 'goglens', noShadow: true, shapes: L.map(c => O(c, .62)) });
    }
  }
  if (!n && !(hg && (hg.hood || hg.helm || hg.wrap))) { // ears over the hair: long ones poke out sideways, short ones are a skin pixel in side view
    const long = H.ears === 'long';
    if (e && (long || H.hair !== 'long')) F.add({ mat: skin, prof: 'round', bw: .6, grp: 'ear', noShadow: true, shapes: [long ? P([[cx - .4, cy + .4], [cx - 4.6, cy - 1.6], [cx - .2, cy + 1.9]]) : O([cx - .4, cy + 1], .72)] });
    else if (!e && H.ears) for (const s of [-1, 1]) F.add({ mat: skin, prof: 'round', bw: .6, grp: 'ear' + s, noShadow: true, shapes: [long ? P([[cx + s * (J.hrx - .5), cy + .3], [cx + s * (J.hrx + 2.4), cy - .9], [cx + s * (J.hrx - .3), cy + 2.1]]) : P([[cx + s * (J.hrx - .5), cy + .5], [cx + s * (J.hrx + 1), cy], [cx + s * (J.hrx - .3), cy + 1.8]])] });
  }
  if (H.blindfold && !n) F.add({ mat: mt(H.blindfold, 'clothWhite'), prof: 'round', bw: .5, grp: 'blindfold', shapes: e ? [C([cx - 1.4, cy + 1.1], [cx + J.hrx + .1, cy + 1.1], .62), C([cx - 1.6, cy + 1.2], [cx - 3.8, cy + 3.4], .5, .35)] : [C([cx - J.hrx - .2, cy + 1.1], [cx + J.hrx + .2, cy + 1.1], .62), C([cx + J.hrx, cy + 1.2], [cx + J.hrx + 1.6, cy + 3.3], .5, .35)] });
  if (H.blindfold && n) F.add({ mat: mt(H.blindfold, 'clothWhite'), prof: 'round', bw: .5, grp: 'blindfold', shapes: [C([cx - J.hrx - .2, cy + 1.1], [cx + J.hrx + .2, cy + 1.1], .62), C([cx + .4, cy + 1.2], [cx + 1.2, cy + 4], .5, .35)] });
  if (H.scarf && !n) F.add({ mat: mt(H.scarf, 'rags'), prof: 'round', bw: .8, grp: 'scarf', shapes: [e ? E([cx + 1.4, cy + 2.7], 3, 1.7) : E([cx, cy + 2.8], J.hrx - .5, 1.8)], clip: RECT(-2, cy + 1.75, 18, 30) });
  if (H.mask && !n) F.add({ mat: mt(H.mask, 'iron'), prof: 'round', bw: 1.4, grp: 'mask', shapes: [e ? E([cx + 1.6, cy + 1.2], 2.8, 3) : E([cx, cy + 1.3], J.hrx - 1.1, J.hry - 1.3)] });

  // face info for paint(): eyes, shade
  const face = { hideFace: !!(hg && hg.hideFace), shade: !!(H.shade && !(hg && hg.helm)), mask: !!H.mask, blind: !!H.blindfold, helmEyes: hgLook && hgLook.look === 'helm' && hgLook.glowEyes ? mt(hgLook.eyes, 'ember') : null };
  anchors.amulet = amu ? [Math.round(e ? tx + 1.2 : tx) - (e ? 0 : 1), Math.round(J.sh + 2.2)] : null;
  return { F, J, anchors, face, amu };
}

/* ---------- pixels painted after compose: eyes, amulet, glints ---------- */
function setPx(img, x, y, c, a = 1) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const d = img.data, i = (y * img.width + x) * 4;
  if (a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
  d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a; d[i + 3] = Math.max(d[i + 3], a * 255);
}
const alphaAt = (img, x, y) => (x < 0 || y < 0 || x >= img.width || y >= img.height ? 0 : img.data[(y * img.width + x) * 4 + 3]);
const GLINT = [255, 250, 226];
// temper +3: the weapon's outline pixels take the aspect colour (look.edge, a CSS colour from lookFor)
function edgeWeapon(img, R, c) {
  const { w, h, own, parts } = R, d = img.data;
  const wpn = (x, y) => x >= 0 && y >= 0 && x < w && y < h && own[y * w + x] >= 0 && parts[own[y * w + x]].weapon;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (own[i] >= 0 || !d[i * 4 + 3]) continue;
    if (wpn(x - 1, y) || wpn(x + 1, y) || wpn(x, y - 1) || wpn(x, y + 1)) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
  }
}
function paintFrame(img, r, H, M, mirror) {
  const { J, face, anchors } = r, mx = x => (mirror ? WALKER_W - 1 - x : x);
  const [cx, cy] = J.hc, eyeY = Math.round(cy + 1.3), dir = J.dir;
  const eye = hx(H.eye || '#1c1f38');
  if (dir !== 'n' && !face.hideFace && !face.blind) {
    let c = eye;
    if (face.shade || face.mask) c = hx(H.shadeEyes === 'blight' || H.maskEyes === 'blight' ? '#b4d65a' : '#f8c85a');
    if (face.shade) { // hood shadow over the face, eyes glinting in it
      const sh = MAT.dark.pal[2];
      for (let y = Math.round(cy - 1); y <= Math.round(cy + 3); y++) for (let x = Math.round(cx - 3); x <= Math.round(cx + 2); x++) if (alphaAt(img, mx(x), y)) setPx(img, mx(x), y, sh, .85);
    }
    if (dir === 'e') setPx(img, mx(Math.round(cx + 2.2)), eyeY, c);
    else { setPx(img, Math.round(cx - 2), eyeY, c); setPx(img, Math.round(cx + 1), eyeY, c); }
  }
  if (face.helmEyes && dir !== 'n') { const c = MAT[face.helmEyes].pal[4]; if (dir === 'e') setPx(img, mx(Math.round(cx + 2.2)), eyeY, c); else { setPx(img, Math.round(cx - 2), eyeY, c); setPx(img, Math.round(cx + 1), eyeY, c); } }
  // amulet: one bright pixel of its gem at the chest, the chain as a darker pixel above
  if (r.amu && anchors.amulet) {
    const gm = MAT[mt(r.amu.gem, 'ruby')].pal, [ax, ay] = anchors.amulet;
    setPx(img, mx(ax), ay, gm[4]);
    if (r.amu.relic || (M.amulet && M.amulet.heirloom)) setPx(img, mx(ax), ay - 1, MAT[mt(r.amu.metal, 'gold')].pal[4]);
  }
  // heirloom and temper glints, 1 px each: on the weapon (tip for an heirloom, blade for temper),
  // plus at most one worn piece, in that piece's brightest tone
  const wm = M.weapon || {}, pts = [];
  if (anchors.weaponTip && (wm.heirloom || wm.relic)) pts.push([anchors.weaponTip, GLINT]);
  if (anchors.weaponMid && wm.temper >= 1) pts.push([anchors.weaponMid, GLINT]);
  const worn = [['offhand', anchors.shield && [anchors.shield[0] - .8, anchors.shield[1] - .8]], ['head', anchors.head && [cx + (dir === 'e' ? 1.6 : 2.2), anchors.head[1] + 2]], ['body', [J.cx + (dir === 'e' ? 1.5 : -2), J.sh + 1.6]]];
  for (const [slot, at] of worn) {
    const m = M[slot];
    if (!at || !m || !(m.heirloom || m.temper >= 1)) continue;
    pts.push([at, [255, 244, 200]]);
    break;
  }
  for (const k of M.glintAt || []) { const at = k === 'amulet' ? anchors.amulet : anchors['g_' + k]; if (at) pts.push([at, [255, 244, 200]]); }
  for (const [[gx, gy], c] of pts) {
    const x = mx(Math.round(gx)), y = Math.round(gy);
    if (alphaAt(img, x, y)) setPx(img, x, y, c);
  }
}

/* ---------- sheets ---------- */
// rigSheet(H, looks, { meta, frames = 3, rows = WALKER_ROWS, pick }) -> ImageData (frames*16 x rows*24)
//   pick(frameIndex) maps a sheet column to a rig frame (0 stand, 1 stepA, 2 stepB)
export function rigSheet(H, L = {}, { meta = {}, frames = WALKER_FRAMES, rows = WALKER_ROWS, pick = k => k } = {}) {
  const W = WALKER_W, Hh = WALKER_H, out = new ImageData(W * frames, Hh * rows.length), d = out.data;
  rows.forEach((row, ri) => {
    const mirror = row === 'w', dir = mirror ? 'e' : row;
    for (let k = 0; k < frames; k++) {
      const r = rigFrame(H, L, meta, dir, pick(k));
      const R = r.F.raster({ mirror });
      // at 16x24 the Forge's 1-px contact shadows would sink small parts to the darkest step
      for (let i = 0; i < R.idx.length; i++) if (R.own[i] >= 0 && R.idx[i] < 1) R.idx[i] = 1;
      const img = compose(R, { glow: false });
      if (meta.weapon && meta.weapon.edge) edgeWeapon(img, R, hx(meta.weapon.edge));
      paintFrame(img, r, H, meta, mirror);
      const s = img.data, ox = k * W, oy = ri * Hh;
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, j = ((oy + y) * out.width + ox + x) * 4;
        d[j] = s[i]; d[j + 1] = s[i + 1]; d[j + 2] = s[i + 2]; d[j + 3] = s[i + 3];
      }
    }
  });
  return out;
}

/* ---------- gear resolution ---------- */
// a look (lookFor output) vs an item (ItemInstance, relic id, art {r,p}): looks carry no rarity/seed/uid
const isItem = v => typeof v === 'string' || v.uid !== undefined || v.seed !== undefined || v.rarity !== undefined || v.base !== undefined || (v.r && v.p && !v.cls);
export function resolveGear(gear) {
  const L = {}, M = {};
  if (!gear) return { L, M, sig: '-' };
  for (const s of SLOTS) {
    const v = gear[s];
    if (!v || (typeof v !== 'object' && typeof v !== 'string')) continue;
    let look = null, art = null;
    if (isItem(v)) { art = itemArt(v); look = art ? lookFor(s, art) : null; } else look = v;
    if (!look) continue;
    // a lantern focus reads as a sigil in lookFor; the walker can draw the lantern itself
    if (s === 'offhand' && art && art.p && art.p.style === 'lantern' && look.look === 'sigil') look = Object.assign({}, look, { look: 'lantern' });
    const rarity = typeof v === 'object' && v.rarity ? v.rarity : art && art.rarity;
    const temper = look.temper || (typeof v === 'object' && v.temper) || 0;
    // lookFor marks a tempered weapon relic and every tempered piece glint, so from a bare look only an
    // untempered glint says heirloom; with the item (or look.heirloom, when given) it is exact
    const relic = art ? !!art.relic : !!look.relic && !(s === 'weapon' && temper);
    const heirloom = look.heirloom !== undefined ? !!look.heirloom
      : !!(relic || typeof v === 'string' || rarityTier(rarity) >= 5 || (!art && look.glint && !temper));
    L[s] = look; M[s] = { relic, temper, heirloom, edge: temper >= 3 && look.edge ? look.edge : null };
  }
  const sig = SLOTS.map(s => (L[s] ? `${L[s].id || '?'}${M[s].temper ? '+' + M[s].temper : ''}${M[s].heirloom ? '*' : ''}` : '-')).join('|');
  return { L, M, sig };
}

function identity(heroId, custom) {
  const A = HERO_ART[heroId] || HERO_ART.warden;
  if (!custom) return A.H;
  const H = Object.assign({}, A.H);
  for (const k of ['skin', 'hairMat', 'hair', 'beard', 'eye']) if (custom[k] !== undefined) H[k] = custom[k];
  return H;
}
const idSig = H => ['skin', 'hairMat', 'hair', 'beard', 'eye'].map(k => H[k]).join(',');

const cache = lru(96);
export function walkerSheet(heroId, gear, { custom } = {}) {
  const A = HERO_ART[heroId] || HERO_ART.warden;
  const H = identity(heroId, custom);
  const { L, M, sig } = resolveGear(gear === undefined ? A.starter : gear);
  const img = cache.get(`${heroId}|${idSig(H)}|${sig}`, () => rigSheet(H, L, { meta: M }));
  return { img, w: WALKER_W, h: WALKER_H, foot: WALKER_FOOT.slice(), head: [8, 3] };
}

// Flat placeholder sheet (kept for callers that want a quick stand-in; not used by the real art).
export function boxSheet(key, body, { w = WALKER_W, h = WALKER_H, frames = WALKER_FRAMES, rows = 4 } = {}) {
  return cache.get('box|' + key + '|' + w + 'x' + h + '|' + frames + 'x' + rows, () => {
    const img = new ImageData(w * frames, h * rows), d = img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = body[0]; d[i + 1] = body[1]; d[i + 2] = body[2]; d[i + 3] = 255; }
    return img;
  });
}

