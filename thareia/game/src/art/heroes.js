// Layered hero sprites, ported from prototypes/item-card.html and extended for battle:
// identity layers (skin, hair, ears, cloak, quiver, blindfold, scarf, mask ...), gear looks
// (weapon drawn from the real item recipe, helm/armour/boots/gloves/amulet/ring layers) and poses.
//
// heroForge(H, { gear, pose, frame }) -> { F, b, OX, OY, anchors, face }
//   H     identity: { build, skin, hairMat, hair, beard, eye, ears, cloak, mantle, tabard, robe, tunic,
//                     quiver, blindfold, scarf, mask, shade, shadeEyes, freckles, marks }
//   gear  layer looks (see item-looks.js lookFor): { weapon, offhand, head, body, hands, feet, amulet, ring }
//   pose  from posePreset(); omitted = the prototype's standing pose
//   frame canvas { w, h, ox, oy }; default is the prototype's 56x60 (12, 8)
import { MAT, hx, mix, hash, Xf, Forge } from './forge.js';
import { RECIPE, mailTex, scaleTex } from './recipes.js';

/* ==== HEROES: layered part lists ==== */
const BUILD = {
  human: { hc: [16, 10.8], hr: 6.6, sh: 19.4, wa: 28.6, sk: 35, legT: 32, legB: 41.3, bootT: 39.4, shW: 6.3, waW: 5.4, skW: 7.6, hL: [7.6, 30], hR: [24.4, 30], aL: [9.6, 20.3], aR: [22.4, 20.3] },
  dwarf: { hc: [16, 16.4], hr: 6.9, sh: 24.2, wa: 32.4, sk: 37.4, legT: 36, legB: 42.3, bootT: 40.6, shW: 8.4, waW: 7.8, skW: 8.8, hL: [5.4, 33.4], hR: [26.6, 33.4], aL: [8.4, 25], aR: [23.6, 25] },
  youth: { hc: [16, 13.4], hr: 6.5, sh: 21.6, wa: 30, sk: 35.6, legT: 33.2, legB: 41.4, bootT: 40.2, shW: 5.7, waW: 4.9, skW: 6.8, hL: [8.5, 31.2], hR: [23.5, 31.2], aL: [10.3, 22.4], aR: [21.7, 22.4] },
  brute: { hc: [16, 11.6], hr: 6.7, sh: 20.4, wa: 29.4, sk: 35.4, legT: 32.6, legB: 41.4, bootT: 39.6, shW: 7.6, waW: 6.6, skW: 8.4, hL: [6.2, 31], hR: [25.8, 31], aL: [8.4, 21.4], aR: [23.6, 21.4] },
};
const GROUND = 46.6;
export const FRAME_BATTLE = { w: 64, h: 64, ox: 16, oy: 10 };
const FRAME_PROTO = { w: 56, h: 60, ox: 12, oy: 8 };

/* ---- poses ---- */
// cls: weapon class from RECIPE (blade, blunt, spear, bow, staff) or null (unarmed)
export function posePreset(name, t = 0, cls = 'blade', b = BUILD.human) {
  const hl = b.hL, hr = b.hR, al = b.aL;
  switch (name) {
    case 'attack': {
      const wind = t < .4;
      if (cls === 'bow') return wind
        ? { hL: [hl[0] - 3, hl[1] - 5], hR: [hr[0] - 6, hr[1] - 7], wAxis: [.06, 1], draw: 1, face: 'fierce', legs: 'stride', stride: 1 }
        : { up: [-1, 0], hL: [hl[0] - 4, hl[1] - 5], hR: [hr[0] - 2, hr[1] - 4], wAxis: [.06, 1], draw: 0, face: 'fierce', legs: 'stride', stride: 1 };
      if (cls === 'spear') return wind
        ? { up: [1, 0], hL: [al[0] + 3, al[1] + 7], hR: [hr[0] + 1, hr[1] - 2], wAxis: [-1, -.12], face: 'fierce' }
        : { root: [-2, 0], up: [-1.5, 1], hL: [al[0] - 4.5, al[1] + 6.5], hR: [hr[0] - 3, hr[1] - 3], wAxis: [-1, -.02], face: 'fierce', legs: 'stride' };
      if (cls === 'staff') return wind
        ? { up: [.5, 0], hL: [al[0] - 2, al[1] - 7], hR: [hr[0] + 1, hr[1] - 12], wAxis: [-.08, -1], face: 'focus', orb: 1 }
        : { root: [-1, 0], up: [-1, 0], hL: [al[0] - 5, al[1] + 3], hR: [hr[0] - 2, hr[1] - 5], wAxis: [-1, -.55], face: 'fierce', legs: 'stride', orbTip: 1 };
      return wind
        ? { up: [1, 0], hL: [al[0] - 3.5, al[1] - 8.5], hR: [hr[0] + 1, hr[1] - 1], wAxis: [.32, -1], face: 'fierce' }
        : { root: [-2, 0], up: [-1.5, 1], head: [-.5, 0], hL: [al[0] - 5.5, al[1] + 6.5], hR: [hr[0] + 1, hr[1] - 1], wAxis: [-1, .45], face: 'fierce', legs: 'stride' };
    }
    case 'cast':
      return { up: [0, -.5], hL: [al[0] - 3.5, al[1] - 5.5], hR: [hr[0] + 2.5, hr[1] - 14], wAxis: cls === 'bow' ? [.3, 1] : [-.25, -1], face: 'focus', orb: 1 };
    case 'hurt':
      return { root: [1, 0], up: [3, 1], head: [1, 1], hL: [hl[0] - 1, hl[1] + 2], hR: [hr[0] + 3, hr[1] - 1], wAxis: cls === 'bow' ? [.5, 1] : cls === 'spear' || cls === 'staff' ? [-.6, -1] : [-1, -.55], face: 'hurt' };
    case 'guard':
      return { up: [-.5, 0], hL: [hl[0] + 1, hl[1] - 2], hR: [hr[0] - 5, hr[1] - 5], wAxis: cls === 'bow' ? [.22, 1] : cls === 'spear' || cls === 'staff' ? [-.55, -1] : [-1, -.3], face: 'fierce', legs: 'stride', stride: 1, guard: 1 };
    case 'ko': // fallen on the back, weapon dropped on the ground in front
      return { lie: 1, hL: [hl[0] - 1.5, hl[1] + 1.5], hR: [hr[0] + 1.5, hr[1] + 1.5], drop: 1, face: 'closed' };
    case 'kneel': { // wounded kneel, leaning on the planted weapon (optional extra pose)
      const dy = GROUND - 2 - b.legB + 5.5;
      return { root: [0, dy], head: [-.6, 2.2], hL: [hl[0] + 1, hl[1] + dy - 3], hR: [hr[0] - 1, Math.min(GROUND - 3, hr[1] + dy + 4)], wAxis: [-.1, 1], plant: 1, dropBow: cls === 'bow', face: 'closed', legs: 'kneel' };
    }
    default: { // idle, two-frame breath
      const f = Math.floor(t * 1.6) % 2;
      return { up: [0, f], face: (t % 4.3) < .14 ? 'blink' : 'open' };
    }
  }
}

function joints(b, P) {
  const R = P.root || [0, 0], U = P.up || [0, 0], Hd = P.head || [0, 0];
  const add = (p, ...ds) => ds.reduce((a, d) => [a[0] + d[0], a[1] + d[1]], [p[0], p[1]]);
  return {
    cx: 16 + R[0], lean: U[0], root: R,
    sh: b.sh + R[1] + U[1], wa: b.wa + R[1] + U[1] * .5, sk: b.sk + R[1], legT: b.legT + R[1],
    hc: add(b.hc, R, U, Hd), aL: add(b.aL, R, U), aR: add(b.aR, R, U),
    hL: P.hL ? add(P.hL, R) : add(b.hL, R, U), hR: P.hR ? add(P.hR, R) : add(b.hR, R, U),
    kneel: P.legs === 'kneel', stride: P.legs === 'stride' ? (P.stride ?? 2) : 0,
  };
}

/* ---- sprite-scale textures by armour kind ---- */
const TEX = {
  mail: mailTex,
  scale: scaleTex(2, 3),
  plate: ({ x, y }) => (y % 3 === 0 ? -1 : 0) + (x % 16 === 0 ? 1 : 0),
  leather: ({ x, y }) => ((x % 5 === 0 && (y & 1)) ? -1 : 0),
  robe: ({ x, y }) => ((x * 2 + y) % 7 === 0 ? -1 : 0),
  tunic: ({ x, y }) => (((x + y) & 3) === 0 ? -1 : 0),
  rags: ({ x, y }) => (hash(x >> 1, y >> 1, 7) < .18 ? -1 : hash(x, y, 3) < .06 ? 1 : 0),
};
function bodyLook(H, g) {
  const L = g.body;
  if (!L) {
    if (H.robe) return { kind: 'robe', mat: H.robe, tex: TEX.robe, hem: 'gold' };
    const m = H.tunic || 'gambeson';
    return { kind: 'tunic', mat: m, tex: m === 'rags' ? TEX.rags : TEX.tunic };
  }
  const kind = L.kind || 'custom';
  const tex = L.tex || (kind === 'mail' ? (L.scale ? TEX.scale : TEX.mail) : kind === 'robe' ? TEX.robe : kind === 'plate' ? TEX.plate : kind === 'leather' ? TEX.leather : null);
  const studTex = L.studs ? (({ x, y }) => ((x % 3 === 1 && y % 3 === 1) ? { m: L.studs, dd: 1 } : tex ? tex({ x, y }) : 0)) : null;
  return Object.assign({}, L, { kind, tex: studTex || tex, hem: L.trim, pauldrons: L.pauldrons || (kind === 'plate' ? L.mat : null) });
}

function heroForge(H, opt = {}) {
  const fr = opt.frame || FRAME_PROTO, W = fr.w, Hh = fr.h, OX = fr.ox, OY = fr.oy;
  const P = opt.pose || {}, b = BUILD[H.build] || BUILD.human;
  // lying (ko): the whole rig is rotated so the feet point left and the back rests on the ground
  const F = new Forge(W, Hh), X = P.lie ? Xf(OX + 41, OY + 22.5, 0, 1, 1) : Xf(OX, OY, 1, 0, 1);
  const C = (x, y) => X.P(x, y), CD = (vx, vy) => [X.ax * vx + X.px * vy, X.ay * vx + X.py * vy];
  const j = joints(b, P), g = opt.gear || {};
  const cx = j.cx, [hcx, hcy] = j.hc, r = b.hr, lean = j.lean;
  const body = bodyLook(H, g), robe = body.kind === 'robe';
  const anchors = { head: C(hcx, hcy), foot: [16 + OX, GROUND + OY] };
  const skirtB = j.kneel ? GROUND - .2 : 45.4;

  // weapon placement helper (shared by the three places a weapon can be drawn)
  const drawWeapon = (w, hand, axis, extra = {}) => {
    const R = RECIPE[w.r] || RECIPE.sword, k = w.k || .36;
    const ax0 = axis || w.axis || [-1, -1], ax = extra.canvas ? ax0 : CD(ax0[0], ax0[1]), l = Math.hypot(ax[0], ax[1]), a = [ax[0] / l, ax[1] / l], p = [-a[1], a[0]];
    const [gt, gs] = R.grip; const [hx0, hy0] = extra.canvas ? hand : C(hand[0], hand[1]);
    const WX = Xf(hx0 - (a[0] * gt + p[0] * gs) * k, hy0 - (a[1] * gt + p[1] * gs) * k, a[0], a[1], k, .75);
    const n0 = F.parts.length;
    R.fn(F, WX, extra.p || w.p);
    for (let i = n0; i < F.parts.length; i++) { const pt = F.parts[i]; pt.weapon = true; if (w.relic) pt.relic = true; if (extra.cut) pt.cuts = (pt.cuts || []).concat([extra.cut]); }
    const tip = weaponTip(w.r, w.p);
    anchors.weaponTip = WX.P(tip[0], tip[1]); anchors.weaponMid = WX.P(tip[0] * .72, tip[1] * .5); anchors.weaponGrip = [hx0, hy0];
    return WX;
  };
  const groundCut = X.poly([[-40, GROUND + .3], [80, GROUND + .3], [80, 90], [-40, 90]]);

  // behind everything: cloak, quiver, long hair, a weapon raised behind the head, a dropped bow
  if (H.cloak) {
    const top = j.sh - 1, bot = j.kneel ? GROUND + .2 : 44;
    F.add({ X, mat: H.cloak, prof: 'round', bw: 3, grp: 'cloak', shapes: [X.poly([[cx - b.shW - .5 + lean, top], [cx + b.shW + .5 + lean, top], [cx + b.shW + 3, j.wa + 1], [cx + b.shW + 4.4, bot], [cx + 5, bot + 1.2], [cx, bot + .2], [cx - 5, bot + 1.2], [cx - b.shW - 4.4, bot], [cx - b.shW - 3, j.wa + 1]])], tex: H.cloakTex || (H.cloak === 'rags' ? TEX.rags : null) });
  }
  if (H.quiver) {
    const qx = cx + b.shW - 1 + lean, qy = j.sh - 3.5;
    F.add({ X, mat: H.quiver, prof: 'round', bw: 1.6, grp: 'quiver', shapes: [X.cap(qx + 2.2, qy, qx - 2.6, qy + 11, 1.9, 1.7)], tex: TEX.leather });
    F.add({ X, mat: H.fletch || 'clothWhite', prof: 'round', bw: .8, grp: 'fletch', shapes: [X.cap(qx + 2.4, qy - .4, qx + 3.6, qy - 3.4, .75), X.cap(qx + 1.3, qy - .2, qx + 1.6, qy - 3.8, .75), X.cap(qx + 3.2, qy + .3, qx + 5.2, qy - 2, .7)] });
  }
  if (H.hair === 'long') F.add({ X, mat: H.hairMat, prof: 'round', bw: 3, grp: 'hairback', shapes: [X.poly([[hcx - 8, hcy - 2], [hcx - 8.8, hcy + 6], [hcx - 9.4, hcy + 12.5], [hcx - 5, hcy + 13.4], [hcx + 5, hcy + 13.4], [hcx + 9.4, hcy + 12.5], [hcx + 8.8, hcy + 6], [hcx + 8, hcy - 2]])], tex: ({ x }) => (x % 3 === 0 ? -1 : 0) });
  if (H.hair === 'pony') F.add({ X, mat: H.hairMat, prof: 'round', bw: 2, grp: 'hairback', shapes: [X.cap(hcx + 5.5, hcy - 3, hcx + 9.5, hcy + 3, 2.4, 2), X.cap(hcx + 9.5, hcy + 3, hcx + 9, hcy + 10, 2, 1.1)] });
  if (H.hair === 'braid') F.add({ X, mat: H.hairMat, prof: 'round', bw: 1.6, grp: 'hairback', shapes: [X.circ(hcx + 6.8, hcy + 2, 2.2), X.circ(hcx + 7.6, hcy + 5.6, 1.9), X.circ(hcx + 8, hcy + 9, 1.7), X.circ(hcx + 8.2, hcy + 12.2, 1.4)] });
  if (g.weapon && P.wBack) drawWeapon(g.weapon, j.hL, P.wAxis);
  if (g.weapon && P.dropBow) drawWeapon(g.weapon, [cx - 3, GROUND - .5], [1, .02]);
  const dropWeapon = () => { const w = g.weapon, R = RECIPE[w.r] || RECIPE.sword; const bow = w.r === 'bow'; drawWeapon(w, [OX + 26 + (bow ? 0 : (R.grip[0] * (w.k || .36))), GROUND + OY + 3.2], bow ? [-1, -.03] : [-1, -.07], { canvas: 1 }); };

  // legs, boots, skirts
  const feet = g.feet || {}, bootMat = feet.mat || H.boots || 'leather';
  const drawBoots = () => {
    const sL = j.stride, bt = b.bootT;
    if (j.kneel) {
      F.add({ X, mat: bootMat, prof: 'round', bw: 1.6, grp: 'bootL', shapes: [X.poly([[cx - 6.4, GROUND - 5.2], [cx - 1.6, GROUND - 5.2], [cx - 1.5, GROUND - 1.2], [cx - 1.8, GROUND], [cx - 8.2, GROUND], [cx - 8.4, GROUND - 1.4]])] });
      F.add({ X, mat: bootMat, prof: 'round', bw: 1.2, grp: 'bootR', shapes: [X.poly([[cx + 3, GROUND - 1.6], [cx + 8.4, GROUND - 1.6], [cx + 8.6, GROUND], [cx + 2.8, GROUND]])] });
      return;
    }
    for (const s of [-1, 1]) {
      const d = s < 0 ? -sL : sL * .5;
      F.add({ X, mat: bootMat, prof: 'round', bw: 1.6, grp: 'boot' + s, shapes: [X.poly(s < 0 ? [[cx - 5.8 + d, bt], [cx - .6 + d, bt], [cx - .4 + d, 45.2], [cx - .6 + d, 46.6], [cx - 7.6 + d, 46.6], [cx - 7.8 + d, 45.2], [cx - 6 + d, 43]] : [[cx + .6 + d, bt], [cx + 5.8 + d, bt], [cx + 6 + d, 43], [cx + 7.8 + d, 45.2], [cx + 7.6 + d, 46.6], [cx + .6 + d, 46.6], [cx + .4 + d, 45.2]])] });
      if (feet.greave) F.add({ X, mat: feet.greave, prof: 'round', bw: 1.2, grp: 'greave' + s, shapes: [X.cap(cx + s * 3 + d, bt - .6, cx + s * 3 + d, bt + 3.2, 1.9)] });
      if (feet.trim) F.add({ X, mat: feet.trim, prof: 'round', bw: .8, grp: 'bootcuff' + s, shapes: [feet.fold ? X.poly([[cx + s * 3 - 3 + d, bt - 1.2], [cx + s * 3 + 3 + d, bt - 1.2], [cx + s * 3 + 2.6 + d, bt + 1.6], [cx + s * 3 - 2.6 + d, bt + 1.6]]) : X.cap(cx + s * 3 - 2.2 + d, bt + .2, cx + s * 3 + 2.2 + d, bt + .2, .8)] });
      if (feet.gem) F.add({ X, mat: feet.gem, prof: 'flat', grp: 'bootgem' + s, noShadow: true, shapes: [X.circ(cx + s * 3 + d, bt + .2, .6)] });
    }
  };
  if (robe) drawBoots();
  if (robe) {
    const sw = b.skW + (j.kneel ? 3 : 1.5);
    F.add({ X, mat: body.skirt || body.mat, prof: 'round', bw: 4, grp: 'robe', shapes: [X.poly([[cx - b.waW, j.wa], [cx + b.waW, j.wa], [cx + sw, skirtB], [cx, skirtB + 1], [cx - sw, skirtB]])], tex: ({ x, y }) => (y - OY >= skirtB - .8 && body.hem ? { m: body.hem, dd: 0 } : body.tex ? body.tex({ x, y }) : 0) });
  } else if (j.kneel) {
    F.add({ X, mat: H.pants || 'pants', prof: 'round', bw: 2.2, grp: 'legL', shapes: [X.cap(cx - 2.9, j.legT, cx - 5.2, GROUND - 6.4, 2.4, 2.3), X.cap(cx - 5.2, GROUND - 6.4, cx - 4.4, GROUND - 3.5, 2.3, 2.1)] });
    F.add({ X, mat: H.pants || 'pants', prof: 'round', bw: 2.2, grp: 'legR', shapes: [X.cap(cx + 2.9, j.legT, cx + 4.6, GROUND - 1.8, 2.5, 2.2)] });
  } else {
    for (const s of [-1, 1]) { const d = s < 0 ? -j.stride : j.stride * .5; F.add({ X, mat: H.pants || 'pants', prof: 'round', bw: 2.4, grp: 'leg' + s, shapes: [X.cap(cx + s * 2.9, j.legT, cx + s * 3.1 + d, b.legB, 2.5)] }); }
  }
  if (!robe) drawBoots();

  // torso
  const tp = [[cx - b.shW + .3 + lean, j.sh - 1], [cx + b.shW - .3 + lean, j.sh - 1], [cx + b.shW + .7 + lean * .8, j.sh + 2.5], [cx + b.waW + .6 + lean * .4, j.wa], [cx + b.skW, j.sk], [cx, j.sk + .8], [cx - b.skW, j.sk], [cx - b.waW - .6 + lean * .4, j.wa], [cx - b.shW - .7 + lean * .8, j.sh + 2.5]];
  F.add({ X, mat: body.mat, prof: 'round', bw: 4, grp: 'torso', shapes: [X.poly(tp)], tex: body.tex });
  if (body.kind === 'plate') F.add({ X, mat: body.mat, prof: 'round', bw: 2, grp: 'faulds', shapes: [X.poly([[cx - b.waW - .4, j.wa + 1.2], [cx + b.waW + .4, j.wa + 1.2], [cx + b.skW + .6, j.sk + .6], [cx - b.skW - .6, j.sk + .6]])], tex: ({ y }) => (y % 2 === 0 ? -1 : 0) });
  if (body.apron) F.add({ X, mat: body.apron, prof: 'round', bw: 3, grp: 'apron', shapes: [X.poly([[cx - 4, j.sh + 2], [cx + 4, j.sh + 2], [cx + 5.5, j.sk + 1.5], [cx - 5.5, j.sk + 1.5]])] });
  const tabard = body.tabard || (body.kind !== 'robe' && body.kind !== 'plate' ? H.tabard : null);
  if (tabard) F.add({ X, mat: tabard, prof: 'round', bw: 2.5, grp: 'tabard', shapes: [X.poly([[cx - 2.6 + lean, j.sh - .5], [cx + 2.6 + lean, j.sh - .5], [cx + 3.2, j.sk + .5], [cx, j.sk + 2.2], [cx - 3.2, j.sk + .5]])], tex: ({ x, y }) => { const Y = y - OY, X0 = x - OX - cx + 16 - lean; return ((Y === Math.round(j.sh + 4) && X0 >= 15 && X0 <= 16) || (Y === Math.round(j.sh + 3) && (X0 === 15 || X0 === 16) && ((x + y) & 1)) ? { m: H.emblem || 'gold', dd: 1 } : 0); } });
  if (body.hem && body.kind !== 'robe') F.add({ X, mat: body.hem, prof: 'round', bw: 1, grp: 'trim', shapes: [X.cap(cx - b.skW + .5, j.sk - .3, cx, j.sk + .6, .9), X.cap(cx, j.sk + .6, cx + b.skW - .5, j.sk - .3, .9), X.cap(cx + lean, j.sh, cx, j.sk, .7)] });
  if (robe && body.hem) F.add({ X, mat: body.hem, prof: 'round', bw: 1, grp: 'trim', shapes: [X.cap(cx - 2.2 + lean, j.sh - .6, cx, j.sh + 3, .75), X.cap(cx, j.sh + 3, cx + 2.2 + lean, j.sh - .6, .75), X.cap(cx, j.sh + 3, cx, j.wa, .7)] });
  if (body.vine) F.add({ X, mat: body.vine, prof: 'round', bw: .8, grp: 'vine', shapes: [X.cap(cx - 4, j.sk - 1, cx - 2.5, j.wa + 2, .75), X.cap(cx - 2.5, j.wa + 2, cx - 4, j.sh + 4, .75)] });
  if (body.glyph) F.add({ X, mat: body.glyph, prof: 'round', bw: .8, grp: 'glyph', noShadow: true, shapes: [X.circ(cx - 2.6 + lean, j.sh + 4.2, .9)] });
  const belt = body.sash || (robe ? null : body.belt || 'leather');
  if (belt || robe) F.add({ X, mat: belt || 'leather', prof: 'round', bw: 1, grp: 'belt', shapes: [X.cap(cx - b.waW - .6, j.wa, cx + b.waW + .6, j.wa, 1.15)].concat(robe && body.sash ? [X.cap(cx + 1.8, j.wa + .8, cx + 2.4, j.wa + 5, .8, .6)] : []) });
  if (!robe || !body.sash) F.add({ X, mat: body.gem && body.kind === 'leather' ? body.gem : H.buckle || 'gold', prof: 'round', bw: 1, grp: 'buckle', shapes: [X.circ(cx, j.wa, 1.3)] });
  if (H.beltCharm) { const c0 = [cx + b.waW - .6, j.wa + .8]; H.beltCharm(F, X, c0, anchors); }
  if (H.ledger) {
    const lx = cx - b.waW - .2, ly = j.wa + .8;
    F.add({ X, mat: 'iron', prof: 'round', bw: .6, grp: 'ledgerchain', shapes: [X.cap(lx, ly, lx - 1.2, ly + 3, .5)] });
    F.add({ X, mat: H.ledger, prof: 'round', bw: 1.2, grp: 'ledger', shapes: [X.poly([[lx - 4, ly + 2.8], [lx + .6, ly + 2.4], [lx + 1, ly + 8], [lx - 3.6, ly + 8.4]])] });
    F.add({ X, mat: 'parchment', prof: 'flat', grp: 'ledgerpg', noShadow: true, shapes: [X.poly([[lx - 3.4, ly + 8.1], [lx + .6, ly + 7.8], [lx + .6, ly + 8.6], [lx - 3.4, ly + 8.9]])] });
  }
  if (H.coins) F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'coins', noShadow: true, shapes: [X.circ(cx + 2.8, j.wa + 2.2, .9), X.circ(cx + 4.2, j.wa + 1.8, .8)] });
  // amulet pendant
  if (g.amulet) {
    const ax = cx + lean * .6, ay = j.sh + 3.4;
    F.add({ X, mat: g.amulet.chain || 'gold', prof: 'round', bw: .5, grp: 'amuchain', noShadow: true, shapes: [X.cap(ax - 2.2, j.sh - .6, ax, ay - 1, .45), X.cap(ax + 2.2, j.sh - .6, ax, ay - 1, .45)] });
    F.add({ X, mat: g.amulet.metal || 'gold', prof: 'round', bw: 1, grp: 'amulet', shapes: [X.circ(ax, ay, g.amulet.style === 'sun' ? 1.9 : 1.5)] });
    F.add({ X, mat: g.amulet.gem || 'ruby', prof: 'round', bw: 1, grp: 'amulet', noShadow: true, shapes: [X.circ(ax, ay, .85)] });
    anchors.amulet = C(ax, ay);
  }
  if (H.mantle) F.add({ X, mat: H.mantle, prof: 'round', bw: 2, grp: 'mantle', shapes: [X.cap(cx - b.shW + .5 + lean, j.sh, cx + b.shW - .5 + lean, j.sh, 2.3)], tex: H.mantleTex });
  if (body.pauldrons) for (const s of [-1, 1]) F.add({ X, mat: body.pauldrons, prof: 'round', bw: 2.4, grp: 'pd' + s, shapes: [X.ell(cx + lean + s * (b.shW + .2), j.sh + .6, body.kind === 'plate' ? 3.6 : 3.2, body.kind === 'plate' ? 2.8 : 2.4)], tex: body.kind === 'plate' ? ({ y }) => (y % 2 ? -1 : 0) : body.kind === 'mail' ? body.tex : null });
  if (body.kind === 'plate' && body.trim) for (const s of [-1, 1]) F.add({ X, mat: body.trim, prof: 'round', bw: .8, grp: 'pdt' + s, shapes: [X.cap(cx + lean + s * (b.shW - 2), j.sh + 2.8, cx + lean + s * (b.shW + 2.8), j.sh + 2.2, .7)] });
  const sleeve = body.sleeve || body.shirt || (body.kind === 'leather' ? H.tunic || 'gambeson' : body.mat);
  const sleeveTex = body.sleeve || body.shirt ? null : body.tex;
  const hands = g.hands || {}, glove = hands.mat || H.gloves || 'leather', gR = hands.plate ? 2.35 : 2.1;
  const handPart = (h, grp) => {
    F.add({ X, mat: glove, prof: 'round', bw: 2, grp, shapes: [X.circ(h[0], h[1], gR)] });
    if (hands.trim) F.add({ X, mat: hands.trim, prof: 'round', bw: .6, grp: grp + 't', noShadow: true, shapes: [X.circ(h[0], h[1] - 1.8, .75)] });
  };
  // right arm (viewer right) + off-hand + ring
  F.add({ X, mat: sleeve, prof: 'round', bw: 2.2, grp: 'armR', shapes: [X.cap(j.aR[0], j.aR[1], j.hR[0], j.hR[1] - 1.4, 2.3, 2)], tex: sleeveTex });
  if (hands.plate) F.add({ X, mat: glove, prof: 'round', bw: 1.4, grp: 'vamR', shapes: [X.cap(j.hR[0] + (j.aR[0] - j.hR[0]) * .35, j.hR[1] + (j.aR[1] - j.hR[1]) * .35, j.hR[0], j.hR[1] - 1, 2.2, 2.1)] });
  handPart(j.hR, 'handR');
  if (g.ring && g.ring.gem) F.add({ X, mat: g.ring.gem, prof: 'round', bw: .5, grp: 'ring', noShadow: true, shapes: [X.circ(j.hR[0] + .9, j.hR[1] + .7, .7)] });
  anchors.handR = C(j.hR[0], j.hR[1]);
  if (g.offhand) offhandParts(F, X, b, g.offhand, j.hR, P.guard);
  // left arm + weapon + hand
  F.add({ X, mat: sleeve, prof: 'round', bw: 2.2, grp: 'armL', shapes: [X.cap(j.aL[0], j.aL[1], j.hL[0], j.hL[1] - 1.4, 2.3, 2)], tex: sleeveTex });
  if (hands.plate) F.add({ X, mat: glove, prof: 'round', bw: 1.4, grp: 'vamL', shapes: [X.cap(j.hL[0] + (j.aL[0] - j.hL[0]) * .35, j.hL[1] + (j.aL[1] - j.hL[1]) * .35, j.hL[0], j.hL[1] - 1, 2.2, 2.1)] });
  anchors.handL = C(j.hL[0], j.hL[1]);
  if (g.weapon && !P.wBack && !P.dropBow && !P.drop) {
    const w = g.weapon;
    const extra = {};
    if (P.plant) extra.cut = groundCut;
    if (w.r === 'bow' && P.draw !== undefined) extra.p = Object.assign({}, w.p, { noString: P.draw ? 1 : 0 });
    const WX = drawWeapon(w, j.hL, P.wAxis, extra);
    if (w.r === 'bow' && P.draw) { // pulled string + nocked arrow
      const pb = w.p, L = pb.len, bb = pb.bulge, A = WX.P(.8, bb), B2 = WX.P(L - .8, bb), hh = C(j.hR[0], j.hR[1]);
      F.add({ mat: 'string', prof: 'flat', grp: 'pull', noOutline: true, noShadow: true, shapes: [{ k: 'c', a: A, b: hh, ra: .5, rb: .5 }, { k: 'c', a: B2, b: hh, ra: .5, rb: .5 }] });
      const tipX = Math.min(A[0], B2[0]) - 5;
      F.add({ mat: 'wood', prof: 'round', bw: .6, grp: 'arrow', shapes: [{ k: 'c', a: hh, b: [tipX, hh[1] - .5], ra: .55, rb: .55 }] });
      F.add({ mat: 'steel', prof: 'ridge', bw: .6, grp: 'arrowhead', shapes: [{ k: 'p', pts: [[tipX + 1.5, hh[1] - 2], [tipX - 2.2, hh[1] - .5], [tipX + 1.5, hh[1] + 1]] }] });
      anchors.weaponTip = [tipX - 2, hh[1] - .5];
    }
  }
  handPart(j.hL, 'handL');
  // neck, head, hair, beard, headgear
  F.add({ X, mat: H.skin, prof: 'round', bw: 1.8, grp: 'neck', shapes: [X.cap(hcx - (hcx - cx - lean) * .5, hcy + 4, cx + lean, j.sh - .5, 1.9)] });
  if (H.ears) for (const s of [-1, 1]) F.add({ X, mat: H.skin, prof: 'round', bw: 1, grp: 'ear' + s, shapes: [H.ears === 'long' ? X.poly([[hcx + s * 5.6, hcy - 1], [hcx + s * 11.4, hcy - 3.2], [hcx + s * 6.2, hcy + 2.2]]) : X.poly([[hcx + s * 5.8, hcy - .2], [hcx + s * 9.2, hcy - 2.6], [hcx + s * 6.4, hcy + 2.2]])] });
  F.add({ X, mat: H.skin, prof: 'round', bw: 6, grp: 'head', shapes: [X.ell(hcx, hcy, r + .1, r - .3)] });
  if (H.marks) F.add({ X, mat: H.marks, prof: 'flat', grp: 'marks', noShadow: true, noOutline: true, shapes: [X.cap(hcx - 5.2, hcy + 1.6, hcx - 3.6, hcy + 3.4, .45), X.cap(hcx + 5.2, hcy + 1.6, hcx + 3.6, hcy + 3.4, .45)] });
  if (H.beard) F.add({ X, mat: H.hairMat, prof: 'round', bw: 3, grp: 'beard', shapes: [X.poly([[hcx - 6.4, hcy + .6], [hcx - 7.2, hcy + 5], [hcx - 5.8, hcy + 9.2], [hcx - 3.2, hcy + 12], [hcx - 1.4, hcy + 15.2], [hcx, hcy + 16.4], [hcx + 1.4, hcy + 15.2], [hcx + 3.2, hcy + 12], [hcx + 5.8, hcy + 9.2], [hcx + 7.2, hcy + 5], [hcx + 6.4, hcy + .6], [hcx + 4.2, hcy + 3.2], [hcx + 2, hcy + 2.4], [hcx, hcy + 3.4], [hcx - 2, hcy + 2.4], [hcx - 4.2, hcy + 3.2]])], tex: ({ x, y }) => (((x + (y >> 1)) % 3) === 0 ? -1 : 0) });
  if (H.beard === 'ring') F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'beardring', shapes: [X.cap(hcx - 1.3, hcy + 11.6, hcx + 1.3, hcy + 11.6, .9)] });
  if (H.stubble) F.add({ X, mat: H.hairMat, prof: 'flat', grp: 'stubble', noOutline: true, noShadow: true, shapes: [X.poly([[hcx - 5.6, hcy + 2.4], [hcx + 5.6, hcy + 2.4], [hcx + 3.4, hcy + 5.8], [hcx - 3.4, hcy + 5.8]])], tex: ({ x, y }) => ((x + y) & 1 ? -1 : -2) });
  const hairPts = H.hair === 'crop'
    ? [[-7.4, 1.6], [-7.6, -2.4], [-6.3, -6], [-3.4, -8], [0, -8.5], [3.4, -8], [6.3, -6], [7.6, -2.4], [7.4, 1.6], [6.2, -1.6], [4.5, -3.2], [0, -3.8], [-4.5, -3.2], [-6.2, -1.6]]
    : [[-7.7, 3.7], [-7.8, -1.8], [-6.5, -5.8], [-3.5, -8.2], [0, -8.8], [3.5, -8.2], [6.5, -5.8], [7.8, -1.8], [7.7, 3.7], [5.8, 2.2], [5.5, -1.3], [4, -.6], [3, -2.2], [1.5, -.8], [0, -2.2], [-1.5, -.8], [-3, -2.2], [-4, -.6], [-5.5, -1.3], [-5.8, 2.2]];
  if (H.hair && H.hair !== 'none') F.add({ X, mat: H.hairMat, prof: 'round', bw: 3, grp: 'hair', shapes: [X.poly(hairPts.map(([x, y]) => [hcx + x, hcy + y]))], tex: ({ x, y }) => ((x * 3 + y) % 5 === 0 ? -1 : 0) });
  if (H.hair === 'bun') F.add({ X, mat: H.hairMat, prof: 'round', bw: 2, grp: 'bun', shapes: [X.circ(hcx + 1, hcy - 9.2, 2.6)] });
  if (H.scarf) F.add({ X, mat: H.scarf, prof: 'round', bw: 2, grp: 'scarf', shapes: [X.poly([[hcx - 6.6, hcy + 1.5], [hcx + 6.6, hcy + 1.5], [hcx + 5.4, hcy + 5.4], [hcx, hcy + 7], [hcx - 5.4, hcy + 5.4]]), X.poly([[hcx + 4, hcy + 4], [hcx + 7.5, hcy + 8.5], [hcx + 5, hcy + 9], [hcx + 2.6, hcy + 5.6]])], tex: H.scarfTex });
  if (H.mask) {
    F.add({ X, mat: H.maskEyes || 'dark', prof: 'flat', grp: 'maskeyes', noShadow: true, shapes: [X.ell(hcx - 2.6, hcy + .2, 1.4, .9), X.ell(hcx + 2.6, hcy + .2, 1.4, .9)] });
    F.add({ X, mat: H.mask, prof: 'round', bw: 2.5, grp: 'mask', shapes: [X.ell(hcx, hcy + 1, 5.6, 5.4)], cuts: [X.ell(hcx - 2.6, hcy + .2, 1.3, .8), X.ell(hcx + 2.6, hcy + .2, 1.3, .8)], tex: H.maskTex });
  }
  if (H.blindfold) {
    F.add({ X, mat: H.blindfold, prof: 'round', bw: 1.2, grp: 'blindfold', shapes: [X.cap(hcx - 6.9, hcy - .1, hcx + 6.9, hcy - .1, 1.35), X.circ(hcx + 6.6, hcy - .2, 1.3)] });
    F.add({ X, mat: H.blindfold, prof: 'round', bw: .8, grp: 'blindtail', shapes: [X.cap(hcx + 7, hcy + .4, hcx + 8.8, hcy + 4.6, .8, .6), X.cap(hcx + 7.2, hcy, hcx + 9.8, hcy + 2.6, .7, .5)] });
  }
  const head = g.head;
  if (head) helmParts(F, X, b, head, H, j);
  if (H.shade && (!head || head.look !== 'helm')) { // deep hood: face in shadow, eyes glinting
    F.add({ X, mat: 'dark', prof: 'round', bw: 3, grp: 'shade', noShadow: true, shapes: [X.ell(hcx, hcy + .8, 5.6, 5.4)] });
    if (H.shadeEyes) F.add({ X, mat: H.shadeEyes, prof: 'flat', grp: 'shadeeyes', noShadow: true, noOutline: true, shapes: [X.ell(hcx - 2.4, hcy + .6, 1, .6), X.ell(hcx + 2.4, hcy + .6, 1, .6)] });
  }
  // cast orb / staff-tip glow
  if (P.orb || P.orbTip) {
    const m = opt.aspectGlow || 'ember';
    const at = P.orbTip && anchors.weaponTip ? anchors.weaponTip : C(j.hR[0] + .3, j.hR[1] - 3.4);
    F.add({ mat: m, prof: 'round', bw: 2, grp: 'orb', noShadow: true, noOutline: true, shapes: [{ k: 'o', c: at, r: P.orbTip ? 1.9 : 2.5 }] });
    anchors.orb = at;
  }
  if (g.weapon && P.drop) dropWeapon();
  const face = !(head && head.look === 'helm') && !H.shade && !H.mask;
  return { F, b, OX, OY, anchors, face, j, map: (x, y) => C(x, y) };
}
// tip of a weapon in its recipe space (t, s), used for anchors (slash trails, glints)
export function weaponTip(r, p) {
  switch (r) {
    case 'sword': return [(p.gripEnd || 13) + (p.guardT || 3) + (p.bladeL || 44), 0];
    case 'dagger': return [(p.gripEnd || 11) + (p.guardT || 3) + (p.bladeL || 34), (p.curve || 0)];
    case 'hammer': case 'mace': return [(p.headT || 52) + (p.headH ? p.headH / 2 : p.headW || 7), 0];
    case 'axe': return [(p.headT || 48) + (p.bladeHi || 9) * .3, -(p.bladeW || 18) - (p.bulge || 3)];
    case 'spear': return [(p.headT || 62) + (p.headL || 18), 0];
    case 'staff': return [(p.headT || 64) + 8, 0];
    case 'bow': return [(p.len || 60) / 2, -(p.bulge || 9)];
  }
  return [40, 0];
}
function offhandParts(F, X, b, o, hand, raised) {
  const [x, y] = hand || b.hR;
  if (o.look === 'buckler' || o.look === 'round') {
    const r = (o.look === 'round' ? 6.4 : 4.6) + (raised ? .4 : 0), cx = x + .6, cy = y - 1.2;
    const paint = o.paint ? ({ x: px, y: py }) => { const dx = px - X.ox - cx, dy = py - X.oy - cy; if (o.paint === 'chevron' && Math.abs(dy - Math.abs(dx) * .9 + 1) < 1.2) return { m: o.paint2 || 'paintRed' }; if (o.paint === 'quarter' && (dx > 0) !== (dy > 0)) return { m: o.paint2 || 'paintRed' }; if (o.paint === 'thorn' && Math.abs(dx + Math.sin(dy * 1.2)) < .9) return { m: o.paint2 || 'bramble' }; return 0; } : ({ x: px }) => (px % 3 === 0 ? -1 : 0);
    F.add({ X, mat: o.face || 'wood', prof: 'round', bw: r * .6, hs: .6, grp: 'shield', shapes: [X.circ(cx, cy, r)], tex: paint });
    F.add({ X, mat: o.rim || 'iron', prof: 'round', bw: 1, grp: 'shieldrim', shapes: [X.circ(cx, cy, r)], cuts: [X.circ(cx, cy, r - 1.3)] });
    F.add({ X, mat: o.boss || o.rim || 'iron', prof: 'round', bw: 1.6, grp: 'shieldboss', shapes: [X.circ(cx, cy, o.look === 'round' ? 2 : 1.5)] });
    if (o.gem) F.add({ X, mat: o.gem, prof: 'round', bw: .8, grp: 'shieldboss', noShadow: true, shapes: [X.circ(cx, cy, .9)] });
  } else if (o.look === 'heater' || o.look === 'tower') {
    const cx = x + .6, cy = y - 1.4, t = o.look === 'tower', w = t ? 5 : 5.2 + (raised ? .3 : 0);
    const pts = t ? [[cx - w, cy - 7.5], [cx + w, cy - 7.5], [cx + w, cy + 5.5], [cx, cy + 7.5], [cx - w, cy + 5.5]] : [[cx - w, cy - 5], [cx + w, cy - 5], [cx + w, cy], [cx + w * .6, cy + 3.6], [cx, cy + 6.2], [cx - w * .6, cy + 3.6], [cx - w, cy]];
    const paint = o.paint ? ({ x: px2, y: py }) => { const dx = px2 - X.ox - cx, dy = py - X.oy - cy; if (o.paint === 'chevron' && Math.abs(dy - Math.abs(dx) * .9) < 1.2) return { m: o.paint2 || 'paintRed' }; if (o.paint === 'quarter' && (dx > 0) !== (dy > 0)) return { m: o.paint2 || 'paintRed' }; if (o.paint === 'thorn' && Math.abs(dx + Math.sin(dy * 1.2)) < .9) return { m: o.paint2 || 'bramble' }; return 0; } : null;
    F.add({ X, mat: o.face || 'wood', prof: 'round', bw: 2.5, hs: .6, grp: 'shield', shapes: [X.poly(pts)], tex: paint });
    F.add({ X, mat: o.rim || 'iron', prof: 'round', bw: .8, grp: 'shieldrim', shapes: [X.poly(pts)], cuts: [X.poly(pts.map(([px2, py]) => [cx + (px2 - cx) * .78, cy + (py - cy) * .8]))] });
    F.add({ X, mat: o.boss || o.rim || 'iron', prof: 'round', bw: 1.2, grp: 'shieldboss', shapes: [X.circ(cx, cy - (t ? 1 : .6), 1.4)] });
    if (o.gem) F.add({ X, mat: o.gem, prof: 'round', bw: .8, grp: 'shieldboss', noShadow: true, shapes: [X.circ(cx, cy - (t ? 1 : .6), .8)] });
  } else if (o.look === 'sigil') {
    F.add({ X, mat: o.metal || 'gold', prof: 'round', bw: 1, grp: 'sigilchain', shapes: [X.cap(x, y + .5, x + .3, y + 3.5, .55)] });
    F.add({ X, mat: o.metal || 'gold', prof: 'round', bw: 2.4, grp: 'sigil', shapes: [X.circ(x + .3, y + 5.2, 2.6)] });
    F.add({ X, mat: o.gem || 'ember', prof: 'round', bw: 1, grp: 'sigil', noShadow: true, shapes: [X.circ(x + .3, y + 5.2, 1.2)] });
  } else if (o.look === 'orb') {
    F.add({ X, mat: o.metal || 'gold', prof: 'round', bw: 1, grp: 'orbcradle', shapes: [X.cap(x + .2, y - 1, x + .2, y - 2.6, 1.3, 1.6)] });
    F.add({ X, mat: o.gem || 'sapphire', prof: 'round', bw: 2, grp: 'orb', shapes: [X.circ(x + .2, y - 4.6, 2.5)] });
  } else if (o.look === 'tome') {
    F.add({ X, mat: 'parchment', prof: 'bevel', bw: .8, grp: 'tomepg', shapes: [X.poly([[x - 2.2, y - 3.6], [x + 3.4, y - 4], [x + 3.6, y + 2.6], [x - 2, y + 3]])] });
    F.add({ X, mat: o.cover || 'leatherRed', prof: 'round', bw: 1.4, grp: 'tome', shapes: [X.poly([[x - 3, y - 3.4], [x + 2.6, y - 3.8], [x + 2.8, y + 2.8], [x - 2.8, y + 3.2]])] });
    F.add({ X, mat: o.gem || 'ruby', prof: 'round', bw: .8, grp: 'tome', noShadow: true, shapes: [X.circ(x, y - .4, .9)] });
  } else if (o.look === 'rings') {
    F.add({ X, mat: 'string', prof: 'flat', grp: 'ringscord', noShadow: true, shapes: [X.cap(x, y, x + .2, y + 2.2, .4)] });
    F.add({ X, mat: 'wood', prof: 'round', bw: 1.5, hs: .5, grp: 'rings', shapes: [X.circ(x + .2, y + 4.6, 2.7)], tex: ({ x: px, y: py }) => { const d = Math.hypot(px - X.ox - x - .2, py - X.oy - y - 4.6); return d % 1.6 < .6 ? -1 : 0; } });
    if (o.glow) F.add({ X, mat: o.glow, prof: 'flat', grp: 'ringsglow', noShadow: true, shapes: [X.circ(x + .2, y + 4.6, .6)] });
  }
}
function helmParts(F, X, b, h, H, j) {
  const [cx, cy] = j ? j.hc : b.hc;
  if (h.look === 'kettle') {
    const m = h.mat || 'steel';
    F.add({ X, mat: m, prof: 'round', bw: 5, grp: 'helm', shapes: [X.ell(cx, cy - 2.6, 7.7, 7)], clip: X.poly([[cx - 12, cy - 14], [cx + 12, cy - 14], [cx + 12, cy - 2], [cx - 12, cy - 2]]) });
    if (h.crest) F.add({ X, mat: h.crest, prof: 'round', bw: 1, grp: 'helmcrest', shapes: [X.cap(cx, cy - 9.6, cx, cy - 3.6, .9, .7)] });
    F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: 'brim', shapes: [X.cap(cx - 9.6, cy - 1.6, cx + 9.6, cy - 1.6, 1.3)] });
    if (h.trim) F.add({ X, mat: h.trim, prof: 'round', bw: .7, grp: 'helmband', shapes: [X.cap(cx - 7.2, cy - 3.2, cx + 7.2, cy - 3.2, .75)] });
    if (h.runes) F.add({ X, mat: h.runes, prof: 'flat', grp: 'helmrunes', noShadow: true, shapes: [X.circ(cx - 3.6, cy - 3.2, .6), X.circ(cx, cy - 3.2, .6), X.circ(cx + 3.6, cy - 3.2, .6), X.circ(cx, cy - 6.6, .6)] });
  } else if (h.look === 'helm') {
    const m = h.mat || 'steel';
    F.add({ X, mat: 'dark', prof: 'flat', grp: 'helmin', shapes: [X.ell(cx, cy + 1.6, 6, 5)] });
    if (h.plume) F.add({ X, mat: h.plume, prof: 'round', bw: 1.2, grp: 'plume', shapes: [X.cap(cx, cy - 8.6, cx + 4, cy - 11, 1.4, 1), X.cap(cx + 4, cy - 11, cx + 8.5, cy - 9.5, 1, .6)] });
    F.add({ X, mat: m, prof: 'round', bw: 5, grp: 'helm', shapes: [X.ell(cx, cy - 1.4, 7.8, 7.6)], clip: X.poly([[cx - 12, cy - 14], [cx + 12, cy - 14], [cx + 12, cy - .4], [cx - 12, cy - .4]]) });
    F.add({ X, mat: m, prof: 'bevel', bw: 1.2, grp: 'helmface', shapes: [X.poly([[cx - 7.7, cy - 1], [cx + 7.7, cy - 1], [cx + 7.2, cy + 4.4], [cx + 4, cy + 7.2], [cx - 4, cy + 7.2], [cx - 7.2, cy + 4.4]])], cuts: [X.poly([[cx - 6, cy - .2], [cx + 6, cy - .2], [cx + 5.6, cy + 1.2], [cx - 5.6, cy + 1.2]]), X.poly([[cx - .55, cy + 1], [cx + .55, cy + 1], [cx + .55, cy + 5.4], [cx - .55, cy + 5.4]])] });
    if (h.crest !== null && h.crest !== false) F.add({ X, mat: h.crest || m, prof: 'round', bw: .9, grp: 'helmcrest', shapes: [X.cap(cx, cy - 9.2, cx, cy - 2.6, 1.1, .7)] });
    F.add({ X, mat: h.trim || 'iron', prof: 'round', bw: .7, grp: 'helmband', shapes: [X.cap(cx - 7.8, cy - 1.1, cx + 7.8, cy - 1.1, .8)] });
    if (h.runes) F.add({ X, mat: h.runes, prof: 'flat', grp: 'helmrunes', noShadow: true, shapes: [X.circ(cx - 4.6, cy - 1.1, .6), X.circ(cx - 1.6, cy - 1.1, .55), X.circ(cx + 1.6, cy - 1.1, .55), X.circ(cx + 4.6, cy - 1.1, .6), X.cap(cx, cy - 7.4, cx, cy - 4.4, .5)] });
    if (h.gem) F.add({ X, mat: h.gem, prof: 'round', bw: .8, grp: 'helmgem', noShadow: true, shapes: [X.circ(cx, cy - 1.1, 1)] });
    if (h.eyes) F.add({ X, mat: h.eyes, prof: 'flat', grp: 'helmeyes', noShadow: true, noOutline: true, shapes: [X.ell(cx - 3, cy + .5, 1.3, .55), X.ell(cx + 2.8, cy + .5, 1.3, .55)] });
  } else if (h.look === 'hood') {
    const tip = h.tip ?? 1;
    F.add({ X, mat: h.mat || 'cloakGreen', prof: 'round', bw: 3.5, grp: 'hood', shapes: [X.ell(cx, cy - .8, 8.4, 8.4), X.poly([[cx - 8.2, cy + 3], [cx + 8.2, cy + 3], [cx + 8.4, cy + 9.8], [cx - 8.4, cy + 9.8]])].concat(tip ? [X.poly([[cx - 3, cy - 8], [cx + 3.5, cy - 9.6], [cx + 1.5, cy - 6]])] : []), cuts: [X.ell(cx, cy + 1.3, 5.7, 5.5)], tex: h.tex || (h.mat === 'rags' ? TEX.rags : null) });
    if (h.trim) F.add({ X, mat: h.trim, prof: 'round', bw: .7, grp: 'hoodtrim', shapes: [X.ell(cx, cy + 1.3, 6.5, 6.3)], cuts: [X.ell(cx, cy + 1.3, 5.7, 5.5)] });
    if (h.vine) F.add({ X, mat: h.vine, prof: 'round', bw: .6, grp: 'hoodvine', noShadow: true, shapes: [X.cap(cx - 7.2, cy + 4, cx - 6.6, cy - 3, .6), X.cap(cx - 6.6, cy - 3, cx - 3, cy - 7, .6)] });
    if (h.clasp) F.add({ X, mat: h.clasp, prof: 'round', bw: 1, grp: 'hoodclasp', shapes: [X.circ(cx, cy + 8.6, 1.3)] });
    if (h.gem) F.add({ X, mat: h.gem, prof: 'round', bw: .6, grp: 'hoodclasp', noShadow: true, shapes: [X.circ(cx, cy + 8.6, .7)] });
  } else if (h.look === 'circlet') {
    if (h.style === 'rotwood') {
      F.add({ X, mat: h.mat || 'rotwood', prof: 'round', bw: 1, grp: 'circlet', shapes: [X.cap(cx - 7.4, cy - 1, cx - 2.5, cy - 2.9, 1.1), X.cap(cx - 2.5, cy - 2.9, cx + 2.5, cy - 2.4, 1.1), X.cap(cx + 2.5, cy - 2.4, cx + 7.4, cy - 1.2, 1.1)] });
      F.add({ X, mat: 'thorn', prof: 'ridge', grp: 'circletthorn', shapes: [X.poly([[cx - 6, cy - 2], [cx - 7.6, cy - 5.4], [cx - 4.8, cy - 2.6]]), X.poly([[cx + 5, cy - 2.2], [cx + 7.2, cy - 5.6], [cx + 6.2, cy - 1.8]]), X.poly([[cx - 1.6, cy - 3], [cx - .8, cy - 6], [cx + .2, cy - 3]])] });
      F.add({ X, mat: h.gem || 'blight', prof: 'round', bw: 1, grp: 'circlet', noShadow: true, shapes: [X.circ(cx + .5, cy - 2.4, 1.3)] });
    } else {
      F.add({ X, mat: h.mat || 'gold', prof: 'round', bw: 1, grp: 'circlet', shapes: [X.cap(cx - 7, cy - 1.4, cx - 2.5, cy - 2.6, .85), X.cap(cx - 2.5, cy - 2.6, cx + 2.5, cy - 2.6, .85), X.cap(cx + 2.5, cy - 2.6, cx + 7, cy - 1.4, .85)] });
      F.add({ X, mat: h.gem || 'ember', prof: 'round', bw: 1, grp: 'circlet', noShadow: true, shapes: [X.circ(cx, cy - 2.7, 1.25)] });
    }
  } else if (h.look === 'coif') {
    F.add({ X, mat: h.mat || 'wool', prof: 'round', bw: 5, grp: 'coif', shapes: [X.ell(cx, cy - 2.2, 7.7, 7.2)].concat(h.flaps ? [X.poly([[cx - 7.8, cy - 2], [cx - 5.6, cy - 2], [cx - 5.4, cy + 4.6], [cx - 7.4, cy + 4]]), X.poly([[cx + 7.8, cy - 2], [cx + 5.6, cy - 2], [cx + 5.4, cy + 4.6], [cx + 7.4, cy + 4]])] : []), clip: h.flaps ? null : X.poly([[cx - 12, cy - 14], [cx + 12, cy - 14], [cx + 12, cy - 1.2], [cx - 12, cy - 1.2]]), cuts: h.flaps ? [X.poly([[cx - 5.6, cy - 1.4], [cx + 5.6, cy - 1.4], [cx + 5.6, cy + 8], [cx - 5.6, cy + 8]])] : null, tex: MAT[h.mat || 'wool'].metal ? mailTex : null });
    F.add({ X, mat: h.band || 'leather', prof: 'round', bw: 1, grp: 'coifband', shapes: [X.cap(cx - 7.6, cy - 1.6, cx + 7.6, cy - 1.6, 1.1)] });
    if (h.gem) F.add({ X, mat: h.gem, prof: 'round', bw: .6, grp: 'coifband', noShadow: true, shapes: [X.circ(cx, cy - 1.6, .8)] });
  } else if (h.look === 'crown') {
    const by = cy - 5.2;
    if (h.style === 'thorn') {
      const spikes = [[-6.4, 3.4, -.6], [-3.6, 5, -.3], [0, 7, 0], [3.6, 5, .3], [6.4, 3.4, .6]].map(([dx, hh, sx]) => X.poly([[cx + dx - 1.1, by + .8], [cx + dx + sx * hh * .6, by - hh], [cx + dx + 1.1, by + .8]]));
      F.add({ X, mat: 'thorn', prof: 'ridge', grp: 'crownthorns', shapes: spikes });
      F.add({ X, mat: h.mat || 'bramble', prof: 'round', bw: 1.2, grp: 'crownband', shapes: [X.cap(cx - 7.4, by + 1, cx, by + 1.8, 1.4), X.cap(cx, by + 1.8, cx + 7.4, by + .8, 1.4)], tex: ({ x, y }) => ((x + y) % 3 === 0 ? -1 : 0) });
      if (h.buds) F.add({ X, mat: h.buds, prof: 'round', bw: .8, grp: 'crownbuds', noShadow: true, shapes: [X.circ(cx - 3.4, by + 1.6, .8), X.circ(cx + 1, by + 2, 1), X.circ(cx + 4.8, by + 1.4, .8)] });
      return;
    }
    const m = h.style === 'regal' ? (h.metal || 'gold') : 'bronze';
    const tine = (x, hgt, w) => X.poly([[x - w, by], [x, by - hgt], [x + w, by]]);
    F.add({ X, mat: m, prof: 'bevel', bw: .8, grp: 'crown', shapes: [tine(cx - 5.6, 3.2, 1.5), tine(cx - 2.9, 4.4, 1.5), tine(cx, 6.6, 1.9), tine(cx + 2.9, 4.4, 1.5), tine(cx + 5.6, 3.2, 1.5)], tex: h.style === 'regal' ? null : ({ x, y }) => (hash(x, y, 4) < .3 ? { m: 'verdigris' } : 0) });
    F.add({ X, mat: m, prof: 'round', bw: 1.2, grp: 'crownband', shapes: [X.cap(cx - 7.2, by + .6, cx + 7.2, by + .6, 1.35)] });
    F.add({ X, mat: h.style === 'regal' ? (h.gem || 'ruby') : 'prism', prof: 'round', bw: 1, grp: 'crownband', noShadow: true, shapes: [X.circ(cx, by + .4, 1.3)] });
    if (h.style !== 'regal') for (const s of [-1, 1]) F.add({ X, mat: 'bronze', prof: 'round', bw: 1, grp: 'bell' + s, shapes: [X.poly([[cx + s * 7.4 - 1, by + 2.2], [cx + s * 7.4 + 1, by + 2.2], [cx + s * 7.4 + 1.6, by + 4.6], [cx + s * 7.4 - 1.6, by + 4.6]])] });
  }
}
// face pixels painted after compose. st: 'open'|'blink'|'hurt'|'closed'|'focus'|'fierce'
// map(lx, ly) -> canvas [x, y] (defaults to a plain OX/OY offset); mirror flips the canvas x
function paintFace(img, H, hc, OX, OY, st = 'open', mirror = false, map = null) {
  const w = img.width, d = img.data;
  const set = (x, y, c) => { const q = map ? map(Math.round(x) + .5, Math.round(y) + .5) : [Math.round(x) + OX + .5, Math.round(y) + OY + .5]; let X0 = Math.floor(q[0]); const Y0 = Math.floor(q[1]); if (mirror) X0 = w - 1 - X0; if (X0 < 0 || X0 >= w || Y0 < 0 || Y0 >= img.height) return; const i = (Y0 * w + X0) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const [cx, cy] = hc, ey = Math.round(cy + .1), eye = hx(H.eye || '#1c1f38'), wht = hx('#f4ecd8');
  const skin = MAT[H.skin] || MAT.skin, xl = Math.round(cx - 4), xr = Math.round(cx + 3);
  if (!H.blindfold) {
    if (st === 'blink' || st === 'closed' || st === 'focus') { for (const x of [xl, xr]) { set(x, ey + 1, eye); if (st !== 'blink') set(x + (x === xl ? -1 : 1), ey + 1, mix(eye, skin.pal[2], .4)); } }
    else if (st === 'hurt') { set(xl - 1, ey, eye); set(xl, ey + 1, eye); set(xl - 1, ey + 2, eye); set(xr + 1, ey, eye); set(xr, ey + 1, eye); set(xr + 1, ey + 2, eye); }
    else {
      for (const x of [xl, xr]) { set(x, ey, eye); set(x, ey + 1, eye); set(x, ey, mix(eye, wht, .55)); }
      if (st === 'fierce') { const br = MAT[H.hairMat] ? MAT[H.hairMat].pal[1] : eye; set(xl + 1, ey - 1, br); set(xr - 1, ey - 1, br); }
    }
  }
  if (H.freckles && !H.scarf) { const f = skin.pal[2]; set(xl - 1, ey + 2, f); set(xl + 1, ey + 3, f); set(xr - 1, ey + 3, f); set(xr + 1, ey + 2, f); }
  if (!H.beard && !H.scarf) {
    const m = skin.pal[1];
    if (st === 'hurt' || st === 'fierce') { set(cx - 1, ey + 3, m); set(cx, ey + 3, m); set(cx - 1, ey + 4, skin.pal[0]); set(cx, ey + 4, skin.pal[0]); }
    else { set(cx - 1, ey + 3, m); set(cx, ey + 3, m); }
    if (!H.blindfold && st !== 'hurt') { const bl = mix(skin.pal[3], [230, 110, 100], .45); set(xl - 1, ey + 2, bl); set(xr + 1, ey + 2, bl); }
  }
}
// prototype-compatible face painter
function heroFace(img, H, b, OX, OY, blink) { paintFace(img, H, b.hc, OX, OY, blink ? 'blink' : 'open'); }

export { BUILD, GROUND, heroForge, offhandParts, helmParts, heroFace, paintFace };
