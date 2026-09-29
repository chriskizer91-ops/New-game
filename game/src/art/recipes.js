// Ported from prototypes/item-card.html (the approved Loot Forge art pipeline).
// Item shape recipes. Each recipe(F, X, P) adds parts to a Forge in 64px item space.
import { hash, vnoise, Xf, Forge, MAT, ramp } from './forge.js';

/* ==== M4 materials (the Sunscorch), registered into MAT once and never over a name that exists, so
   recipes, looks and the hero rig can all name them ==== */
const M4_MAT = {
  glass: ['#101a1e #2a3c42 #4e6a70 #82a4a6 #bcd8d4 #f2fffa', { gem: 1 }],
  sandglass: ['#1a0e06 #3e2410 #704a20 #aa7a3e #e2ba76 #fff4d6', { gem: 1 }],
  smokeglass: ['#0c080a #221820 #3e2c34 #604652 #8c6c74 #c4a4a4', { gem: 1 }],
  sand: ['#241a10 #4a3620 #76583a #a4804e #cca868 #ecd49a', { ks: .15, shin: 6 }],
  sandstone: ['#2a1810 #573420 #83553a #ad7c52 #d2a574 #eecb9c', { ks: .2, shin: 6, dither: .3 }],
  ash: ['#141214 #2a2628 #4a4446 #726a68 #9e9690 #cac2b8', { ks: .1, shin: 6, dither: .35 }],
  char: ['#0a0606 #180e0c #281814 #3a241c #523426 #6c4a34', { ks: .5, shin: 10 }],
  skink: ['#2a1206 #5a2810 #92481c #c67434 #e6a454 #f8d48c', { ks: .5, shin: 12 }],
  wyrmHide: ['#1a120c #36281a #5a452c #806642 #a88a5a #d0b27a', { ks: .3, shin: 8 }],
  clothIndigo: ['#07081a #0f1434 #1a2254 #28347a #3c4c9e #5c6cbc', { ks: 0 }],
  clothSaffron: ['#1e1004 #42240a #6e4012 #9c601c #c8862c #eab452', { ks: 0 }],
  brass: ['#1e1406 #483010 #7c5a1c #b08a30 #d8b85a #f6e6a0', { ks: 1.5, shin: 18, metal: 1 }],
  haze: ['#0a2224 #174a4e #2a8084 #52bcb8 #a2eae2 #effffb', { emit: 1, eBase: 2.9 }],
  heartglow: ['#101428 #28366e #5a78c8 #a4c4f4 #eef4ff #ffffff', { emit: 1, eBase: 3.2 }],
};
for (const [k, [s, o]] of Object.entries(M4_MAT)) if (!MAT[k]) MAT[k] = Object.assign({ pal: ramp(s) }, o);
/* ==== M5 materials (the Ironspire Peaks), registered the same way ==== */
const M5_MAT = {
  ice: ['#0c1e30 #1c4466 #347ca2 #6ab8d6 #b2e2f0 #f2fdff', { gem: 1 }],
  snow: ['#262c3c #505c74 #8492aa #b6c4d6 #dce6f0 #fafcff', { ks: .25, shin: 6 }],
  slate: ['#0e1016 #1a1e26 #2a2f3a #3e4450 #5a616e #7e8692', { ks: .3, shin: 8, dither: .25 }],
  lichen: ['#16180a #2e3410 #4c5618 #6e7c26 #98a83e #c4d66a', { ks: .1, shin: 6, dither: .3 }],
  rimeFur: ['#12161e #283040 #465264 #6e7e8e #9eaeba #d0dce2', { ks: .25, shin: 6 }],
  trollHide: ['#0e120e #1e261e #344034 #4e5c48 #6c7a62 #909c82', { ks: .3, shin: 6 }],
  slag: ['#090607 #150f10 #211818 #2f2322 #43302c #5c443a', { ks: .9, shin: 18 }],
  rocFeather: ['#0a0c1a #181c32 #2a324e #404c6c #607094 #8c9ec0', { ks: .2, shin: 8 }],
  clothSlate: ['#0c1016 #18202c #263244 #36465c #4c6078 #6a8098', { ks: 0 }],
  hushweave: ['#14121c #2c283a #4a4660 #726e8a #a6a4c0 #dedef0', { ks: 0 }],
  drowned: ['#0e161a #1e2e34 #34484e #52686c #7c9694 #b0c8c4', { ks: .3, shin: 8, contrast: 3.6 }],
  mist: ['#1c2430 #36465a #587086 #86a0b4 #b6cad8 #e2eef6', { ks: 0, flat: 3 }],
  scree: ['#15171c #2a2e36 #444a54 #646c76 #8a929a #b6bec4', { ks: .3, shin: 8, dither: .25 }],
  hush: ['#08061c #18104a #342a90 #6660d4 #a4acff #eceeff', { emit: 1, eBase: 3.1 }],
  drownedSkin: ['#1a2230 #34465a #5a7086 #8ca2b4 #bccad6 #e6eef4', { ks: .2, shin: 8, contrast: 3.6 }],
  rocLeg: ['#2a1e06 #5a420e #927018 #c6a02a #e6c85a #f8e8a0', { ks: .5, shin: 12 }],
  temperBlue: ['#0c1024 #1c2448 #2e3c74 #4a5c9c #7888c4 #b4c0ea', { ks: 1.2, shin: 20, metal: 1 }],
};
for (const [k, [s, o]] of Object.entries(M5_MAT)) if (!MAT[k]) MAT[k] = Object.assign({ pal: ramp(s) }, o);

/* ==== RECIPES: items are parameter sets fed to a few shape recipes ==== */
const TX = {
  wrap: (per = 2.2) => ({ u, v }) => ((Math.floor((u + v * .9) / per) & 1) ? -1 : 0),
  grain: seed => ({ u, v }) => (vnoise(u * .12, v * 1.1, seed) > .62 ? -1 : 0),
  rust: seed => ({ x, y, u, d }) => { const n = vnoise(x * .34, y * .34, seed) * .8 + hash(x, y, seed + 9) * .2 + (u < 24 ? .12 : 0) + (d < 1.2 ? .08 : 0); if (n > .66) return { m: 'rust', dd: hash(x, y, seed) < .3 ? -1 : 0 }; if (n > .6) return { m: 'rust', dd: 1 }; return hash(x, y, seed + 3) < .05 ? -1 : 0; },
};
function swordR(F, X, P) {
  const g0 = P.gripEnd, t0 = g0 + P.guardT, bw = P.bladeW, tipS = t0 + P.bladeL - P.tipL, tipE = t0 + P.bladeL;
  const bt = P.bladeTex;
  if (P.shape === 'scimitar') scimitarBlade(F, X, P, t0);
  else {
    F.add({ X, mat: P.blade, prof: 'ridge', hs: .8, grp: 'blade', tex: q => { const a = Math.abs(q.v) * q.k; if (P.heat && a < 1.7 && q.u > t0 - 1) return { m: 'heat', dd: a < .6 ? 2 : 0 }; const r = bt ? bt(q) : 0; if (a < .6 && q.u > t0) return typeof r === 'object' ? Object.assign({}, r, { dd: (r.dd || 0) + 1 }) : r + 2; return r; }, shapes: [X.poly([[t0 - 2, -bw], [tipS, -bw * P.taper], [tipE, 0], [tipS, bw * P.taper], [t0 - 2, bw]])], cuts: (P.notches || []).map(([t, s, r]) => X.circ(t, s, r)) });
    if (P.fuller) F.add({ X, mat: P.fuller, prof: 'round', bw: 1, grp: 'blade', noShadow: true, shapes: [X.cap(t0 + 2.5, 0, tipS - 4, 0, P.fullerR || 1, (P.fullerR || 1) * .7)], tex: ({ u }) => (Math.sin(u * .7) > .6 ? 1 : 0) + (u > tipS - 12 ? -1 : 0) });
    if (P.teeth) sawTeeth(F, X, P, t0, tipS);
  }
  if (P.guard === 'hook') {
    // scimitar quillons swept toward the blade, knobbed, with a langet running up the blade
    const gc = g0 + P.guardT / 2, gw = P.guardW ?? 8, q = g => chain(X, [[gc, 0], [gc + .4, g * gw * .45], [gc + 2.6, g * gw * .86], [gc + 5.4, g * gw * .78]], [2, 1.7, 1.35, 1]);
    F.add({ X, mat: P.guardMat, prof: 'round', bw: 1.6, grp: 'guard', shapes: q(-1).concat(q(1), [X.circ(gc + 5.9, -gw * .74, 1.5), X.circ(gc + 5.9, gw * .74, 1.5)]) });
    F.add({ X, mat: P.guardMat, prof: 'bevel', bw: 1.2, grp: 'langet', shapes: [X.poly([[g0 - 1, -2.4], [t0 + 4.4, -1.4], [t0 + 6.2, 0], [t0 + 4.4, 1.4], [g0 - 1, 2.4]])] });
    if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.4, grp: 'langet', noShadow: true, shapes: [X.circ(gc + .6, 0, 1.6)] });
  } else if (P.guard === 'flame') {
    const o = [[-.2, -3], [.3, -7], [1.3, -10.5], [4, -13], [8, -13.8], [5.7, -11.2], [4.8, -8.2], [4.7, -4.5], [4.7, 4.5], [4.8, 8.2], [5.7, 11.2], [8, 13.8], [4, 13], [1.3, 10.5], [.3, 7], [-.2, 3]];
    F.add({ X, mat: P.guardMat, prof: 'round', bw: 1.7, grp: 'guard', shapes: [X.poly(o.map(([t, s]) => [g0 + t, s]))] });
    F.add({ X, mat: P.guardMat, prof: 'round', bw: 3.4, grp: 'boss', shapes: [X.circ(g0 + 2.3, 0, 3.7)] });
    F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'boss', noShadow: true, shapes: [X.circ(g0 + 2.3, 0, 2.2)] });
  } else if (P.guard === 'oath') {
    oathGuard(F, X, P, g0);
  } else {
    F.add({ X, mat: P.guardMat, prof: 'round', bw: P.guardR, grp: 'guard', shapes: [X.cap(g0 + P.guardT / 2, -P.guardW, g0 + P.guardT / 2, P.guardW, P.guardR)], tex: P.guardTex });
  }
  F.add({ X, mat: P.grip, prof: 'round', bw: P.gripR, grp: 'grip', shapes: [X.cap(P.pommelR * 1.4, 0, g0 + .5, 0, P.gripR)], tex: TX.wrap(2.4) });
  if (P.pommelShape === 'hook') F.add({ X, mat: P.pommel, prof: 'round', bw: P.pommelR * .8, grp: 'pommel', shapes: chain(X, [[P.pommelR * 1.6, 0], [P.pommelR * .7, P.pommelR * .5], [P.pommelR * .3, P.pommelR * 1.7], [P.pommelR * .9, P.pommelR * 2.6]], [P.pommelR * .9, P.pommelR, P.pommelR * .8, P.pommelR * .55]), tex: P.pommelTex });
  else F.add({ X, mat: P.pommel, prof: 'round', bw: P.pommelR, grp: 'pommel', shapes: [X.circ(P.pommelR, 0, P.pommelR)], tex: P.pommelTex });
  if (P.pommelGem) F.add({ X, mat: P.pommelGem, prof: 'round', bw: 1.5, grp: 'pommel', noShadow: true, detail: true, shapes: [X.circ(P.pommelR, 0, P.pommelR * .5)] });
  if (P.ribbon) swordRibbon(F, X, P, g0);
}
// sword shape 'scimitar': a blade curving back from the hilt and broadening toward a clipped point, the edge on
// the convex side; `edge` runs a glowing strip down the cutting edge, `fuller` a groove along the back
function scimitarBlade(F, X, P, t0) {
  const L = P.bladeL, bw = P.bladeW, C = P.curve ?? 6, n = 18, T = u => t0 - 2 + (L + 2) * u, sc = u => -C * Math.pow(u, 1.8);
  const back = u => sc(u) - bw * .8 * (1 - Math.pow(u, 4)), edge = u => sc(u) + bw * (.9 + .7 * Math.sin(u * Math.PI * .8)) * (1 - Math.pow(u, 5));
  const B = [], E = [];
  for (let k = 0; k <= n; k++) { const u = k / n; B.push([T(u), back(u)]); E.push([T(u), edge(u)]); }
  const bt = P.bladeTex;
  F.add({ X, mat: P.blade, prof: 'ridge', hs: .8, grp: 'blade', shapes: [X.poly(B.concat(E.reverse()))], tex: bt });
  if (P.fuller) F.add({ X, mat: P.fuller, prof: 'round', bw: .8, grp: 'blade', noShadow: true, shapes: chain(X, [.06, .2, .36, .52].map(u => [T(u), back(u) * .45 + sc(u) * .55]), [.9, .85, .7, .45]) });
  if (P.edge) {
    const S = []; for (let k = 1; k < n - 1; k++) { const a = k / n, b = (k + 1) / n; S.push(X.poly([[T(a), edge(a)], [T(b), edge(b)], [T(b), edge(b) - 1.3 * (1 - b * .5)], [T(a), edge(a) - 1.3 * (1 - a * .5)]])); }
    F.add({ X, mat: P.edge, prof: 'round', bw: .7, grp: 'blade', noShadow: true, shapes: S });
  }
}
function hammerR(F, X, P) {
  const hc = P.headT, ht = P.headH / 2, hw = P.headW, r = P.haftR;
  const ring = (t, m, extra = .5, grp) => F.add({ X, mat: m, prof: 'round', bw: .9, grp: grp || ('ring' + t), shapes: [X.poly([[t - .9, -(r + extra)], [t + .9, -(r + extra)], [t + .9, r + extra], [t - .9, r + extra]])] });
  F.add({ X, mat: P.haft, prof: 'round', bw: r, grp: 'haft', shapes: [X.cap(2, 0, hc - 2, 0, r)], tex: TX.grain(4) });
  F.add({ X, mat: P.wrap, prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(5.5, 0, P.wrapEnd, 0, r + .45)], tex: TX.wrap(2.2) });
  for (const t of P.bands || []) ring(t, P.bandMat);
  F.add({ X, mat: P.pommelMat || P.headMat, prof: 'round', bw: 2.6, grp: 'pommel', shapes: [X.circ(2.6, 0, P.pommelR)] });
  if (P.style === 'mace') {
    F.add({ X, mat: P.headMat, prof: 'ridge', hs: .8, grp: 'head', shapes: [0, 1, 2, 3].map(k => { const a = k * Math.PI / 4; const c = Math.cos(a), s = Math.sin(a); return X.poly([[hc - hw * c * 1.25, -hw * s * 1.25], [hc + 1.4 * s, -1.4 * c], [hc + hw * c * 1.25, hw * s * 1.25], [hc - 1.4 * s, 1.4 * c]]); }) });
    F.add({ X, mat: P.headMat, prof: 'round', bw: hw * .8, grp: 'head', shapes: [X.circ(hc, 0, hw * .8)] });
    if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.5, grp: 'head', noShadow: true, shapes: [X.circ(hc, 0, hw * .38)] });
    if (P.spike) F.add({ X, mat: P.trim, prof: 'ridge', hs: .9, grp: 'spike', shapes: [X.poly([[hc + hw * .5, -2.2], [hc + hw * .8 + P.spike, 0], [hc + hw * .5, 2.2]])] });
    return;
  }
  if (P.spike) F.add({ X, mat: P.headMat, prof: 'ridge', hs: .9, grp: 'spike', shapes: [X.poly([[hc + ht - 2, -3.8], [hc + ht + P.spike, 0], [hc + ht - 2, 3.8]])] });
  if (P.langets) {
    F.add({ X, mat: P.headMat, prof: 'round', bw: 1, grp: 'langet', shapes: [X.poly([[hc - ht - 9, -(r + .35)], [hc - ht + 1, -(r + .6)], [hc - ht + 1, r + .6], [hc - ht - 9, r + .35]])] });
    F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'rivet', noShadow: true, detail: true, shapes: [X.circ(hc - ht - 3.5, 0, .9), X.circ(hc - ht - 7, 0, .8)] });
  }
  const c = 2.2;
  F.add({ X, mat: P.headMat, prof: 'bevel', bw: 2.4, grp: 'head', shapes: [X.poly(P.peen ? peenHead(hc, ht, hw, c) : [[hc - ht, -hw + c], [hc - ht + c, -hw], [hc + ht - c, -hw], [hc + ht, -hw + c], [hc + ht, hw - c], [hc + ht - c, hw], [hc - ht + c, hw], [hc - ht, hw - c]])], tex: P.headTex });
  if (P.faces) for (const g of P.peen ? [-1] : [-1, 1]) F.add({ X, mat: P.headMat, prof: 'bevel', bw: 1.5, grp: 'face' + g, shapes: [X.poly([[hc - ht - 1.2, g * (hw - 3.6)], [hc + ht + 1.2, g * (hw - 3.6)], [hc + ht + 1.2, g * (hw - 1)], [hc + ht, g * (hw + 1)], [hc - ht, g * (hw + 1)], [hc - ht - 1.2, g * (hw - 1)]])], tex: P.headTex });
  if (P.trim) for (const g of P.peen ? [-1] : [-1, 1]) F.add({ X, mat: P.trim, prof: 'round', bw: 1, grp: 'trim' + g, shapes: [X.poly([[hc - ht - .5, g * (hw - 6.6)], [hc + ht + .5, g * (hw - 6.6)], [hc + ht + .5, g * (hw - 4.6)], [hc - ht - .5, g * (hw - 4.6)]])] });
  if (P.runes) {
    const S = [], L = (a, b, c2, d, rr = .6) => S.push(X.cap(a, b, c2, d, rr));
    L(hc - ht + 2.2, 0, hc + ht - 2.2, 0);
    L(hc + .6, 0, hc + ht - 2.4, -3.4); L(hc + .6, 0, hc + ht - 2.4, 3.4);
    L(hc - ht + 2.4, -3.2, hc - 1.6, 0); L(hc - ht + 2.4, 3.2, hc - 1.6, 0);
    for (const g of [-1, 1]) { L(hc - ht + 2.6, g * 6.4, hc + ht - 2.6, g * 6.4); L(hc - .6, g * 6.4, hc + 2.2, g * 8.2); }
    F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'head', noShadow: true, detail: true, shapes: S });
  }
  // M4: iron straps binding the head, and glass shards fused into it (Dunebreaker)
  if (P.straps) for (const t of [hc - ht * .52, hc + ht * .52]) F.add({ X, mat: P.straps, prof: 'round', bw: 1, grp: 'strap' + t, shapes: [X.poly([[t - 1.4, -hw - .7], [t + 1.4, -hw - .7], [t + 1.4, hw + .7], [t - 1.4, hw + .7]])], tex: ({ x, y }) => (hash(x, y, 9) < .2 ? { m: 'rust', dd: 0 } : 0) });
  if (P.shards) F.add({ X, mat: P.shards, prof: 'ridge', hs: .9, grp: 'shards', shapes: thornShapes(X, [[hc + ht - 1.5, -hw * .45, 1, -.4, 7, 2.3], [hc + ht - 1, hw * .1, 1, .05, 9, 2.7], [hc + ht - 2, hw * .62, .8, .6, 6, 2], [hc - 3, -hw + .6, -.2, -1, 5.5, 1.9], [hc + 2.6, -hw + .6, .35, -1, 6.5, 2.1]]) });
  if (P.seam || P.mark) hammerMarks(F, X, P, hc, ht, hw);
}
function bowR(F, X, P) {
  const L = P.len, b = P.bulge, h = 2 * b, R0 = (L * L / 4 + h * h) / (2 * h), al = Math.asin((L / 2) / R0), cS = -b + R0;
  const B = u => { const th = -al + 2 * al * u; return [L / 2 + R0 * Math.sin(th), cS - R0 * Math.cos(th)]; };
  const Tn = u => { const th = -al + 2 * al * u; return [Math.cos(th), Math.sin(th)]; };
  const A = B(0), C = B(1);
  const seg = (u0, u1, n, rf) => { const S = []; for (let k = 0; k < n; k++) { const a = u0 + (u1 - u0) * k / n, c = u0 + (u1 - u0) * (k + 1) / n; const p = B(a), q = B(c); S.push(X.cap(p[0], p[1], q[0], q[1], rf(a), rf(c))); } return S; };
  const rr = u => P.tipR + (P.limbR - P.tipR) * Math.pow(1 - Math.abs(2 * u - 1), .6);
  if (!P.noString) F.add({ X, mat: 'string', prof: 'flat', grp: 'string', noOutline: true, noShadow: true, shapes: [X.cap(A[0] + .6, A[1], C[0] - .6, C[1], .5)] });
  F.add({ X, mat: P.limb, prof: 'round', bw: 3, grp: 'limb', shapes: seg(0, 1, 28, rr), tex: P.limbTex });
  F.add({ X, mat: P.nock, prof: 'round', bw: 1.4, grp: 'nock', shapes: [X.cap(A[0] + 1.6, A[1] - .8, A[0] - 3, A[1] - 3.6, 1.5, 1), X.cap(C[0] - 1.6, C[1] - .8, C[0] + 3, C[1] - 3.6, 1.5, 1)] });
  if (P.antler) antlerTines(F, X, P, B, al, rr);
  if (P.spark && !P.noString) {
    const S = [], n = 11; let prev = null;
    for (let k = 0; k <= n; k++) { const u = k / n, p = [A[0] + 1 + (C[0] - A[0] - 2) * u, A[1] + (k > 0 && k < n ? (k & 1 ? 1 : -1) * (.7 + hash(k, 3, 7) * .8) : 0)]; if (prev) S.push(X.cap(prev[0], prev[1], p[0], p[1], .45)); prev = p; }
    F.add({ X, mat: P.spark, prof: 'flat', grp: 'spark', noOutline: true, noShadow: true, detail: true, shapes: S });
  }
  for (const u of P.bindings || []) { const p = B(u), t = Tn(u), n = [-t[1], t[0]], w = rr(u) + .5, d = 1; F.add({ X, mat: P.bindMat, prof: 'round', bw: 1, grp: 'bind' + u, detail: true, shapes: [X.poly([[p[0] - t[0] * d - n[0] * w, p[1] - t[1] * d - n[1] * w], [p[0] + t[0] * d - n[0] * w, p[1] + t[1] * d - n[1] * w], [p[0] + t[0] * d + n[0] * w, p[1] + t[1] * d + n[1] * w], [p[0] - t[0] * d + n[0] * w, p[1] - t[1] * d + n[1] * w]])] }); }
  F.add({ X, mat: P.grip, prof: 'round', bw: 3, grp: 'grip', shapes: seg(.43, .57, 3, () => P.limbR + .7), tex: TX.wrap(1.8) });
  if (P.gem) { const g = B(.5); F.add({ X, mat: P.gemMat || 'bronze', prof: 'round', bw: 2.4, grp: 'gem', detail: true, shapes: [X.circ(g[0], g[1] - 3.6, 3.1)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gem', noShadow: true, detail: true, shapes: [X.circ(g[0], g[1] - 3.6, 2.1)] }); }
  if (P.tassel && X.k > .6) {
    const g = X.P(...B(.5)), S = [], k = X.k;
    for (const [dx, len] of [[-1.6, 9.5], [1.2, 12]]) S.push({ k: 'c', a: [g[0] + dx * k * .3, g[1] + 2.5 * k], b: [g[0] + dx * k, g[1] + len * k], ra: .7 * k, rb: .5 * k });
    F.add({ mat: P.tassel, prof: 'round', bw: .8, grp: 'tassel', detail: true, shapes: S });
    F.add({ mat: 'bone', prof: 'round', bw: .8, grp: 'bead', detail: true, shapes: [{ k: 'o', c: [g[0] + 1.2 * k, g[1] + 11.5 * k], r: 1.1 * k }, { k: 'o', c: [g[0] - 1.6 * k, g[1] + 9.2 * k], r: 1 * k }] });
  }
  return B;
}
function crownR(F, X, P) {
  if (P.style === 'thorn') return thornCrownR(F, X, P);
  if (P.style === 'regal') return regalCrownR(F, X, P);
  const cy = u => 4 * (1 - Math.pow((u - 32) / 22, 2));
  F.add({ X, mat: 'bronze', prof: 'round', bw: 3, grp: 'inner', tex: () => -2, shapes: [X.ell(32, 36.5, 21, 6.2)] });
  const tines = [[12.5, 22, 7], [22, 14.5, 8], [32, 7, 9.5], [42, 14.5, 8], [51.5, 22, 7]];
  const verd = seed => ({ x, y, nx, ny, d }) => { const n = vnoise(x * .45, y * .45, seed); const rec = (nx + ny) > .08 || d < .9; if (rec && n > .42) return { m: 'verdigris', dd: n > .7 ? 1 : 0 }; if (n > .84) return { m: 'verdigris', dd: 1 }; return 0; };
  for (const [x, top, w] of tines) {
    const base = 40, yb = top + (base - top) * .5, ya = top + (base - top) * .2;
    const win = x === 32 ? null : X.poly([[x - w * .2, base - 2], [x - w * .2, yb + 1], [x, yb - 1.8], [x + w * .2, yb + 1], [x + w * .2, base - 2]]);
    F.add({ X, mat: 'bronze', prof: 'bevel', bw: 1.7, grp: 'tine' + x, shapes: [X.poly([[x - w / 2, base], [x - w / 2, yb], [x - w * .33, ya], [x, top], [x + w * .33, ya], [x + w / 2, yb], [x + w / 2, base]])], cuts: win && P.detail !== false ? [win] : null, tex: verd(x) });
    if (x !== 32) F.add({ X, mat: 'pearl', prof: 'round', bw: 1.6, grp: 'tine' + x, noShadow: true, detail: true, shapes: [X.circ(x, top - .4, 1.7)] });
  }
  F.add({ X, mat: 'bronze', prof: 'round', bw: 3, grp: 'bezel', shapes: [X.circ(32, 24, 5.6)] });
  F.add({ X, mat: P.gem, prof: 'round', bw: 3, grp: 'bezel', noShadow: true, shapes: [X.circ(32, 24, 4.1)] });
  const top = [], bot = [];
  for (let k = 0; k <= 12; k++) { const x = 10 + 44 * k / 12; top.push([x, 36 + cy(x)]); bot.push([x, 45 + cy(x)]); }
  F.add({ X, mat: 'bronze', prof: 'round', bw: 3.2, grp: 'band', shapes: [X.poly(top.concat(bot.reverse()))], tex: ({ x, y }) => { const mid = 40.5 + cy(x) + Math.sin(x * .55) * 1.3; if (Math.abs(y + .5 - mid) < .55) return -1.5; return verd(9)({ x, y }); } });
  for (const [x, g, r] of [[16, 'pearl', 1.5], [24, P.gem2, 1.7], [32, P.gem2, 2.2], [40, P.gem2, 1.7], [48, 'pearl', 1.5]]) F.add({ X, mat: g, prof: 'round', bw: 1.8, grp: 'bandgem' + x, noShadow: true, detail: true, shapes: [X.circ(x, 40.6 + cy(x), r)] });
  for (const x of [19, 32, 45]) {
    const by = 45 + cy(x);
    F.add({ X, mat: 'iron', prof: 'round', bw: .8, grp: 'chain' + x, detail: true, shapes: [X.cap(x, by - .4, x, by + 2.2, .6)] });
    const s = x === 32 ? 1.15 : 1;
    const t0 = by + 2;
    F.add({ X, mat: 'bronze', prof: 'round', bw: 2.6, grp: 'bell' + x, shapes: [X.poly([[x - 1.6 * s, t0], [x + 1.6 * s, t0], [x + 2.6 * s, t0 + 3.5 * s], [x + 3.1 * s, t0 + 6.5 * s], [x + 4 * s, t0 + 8 * s], [x - 4 * s, t0 + 8 * s], [x - 3.1 * s, t0 + 6.5 * s], [x - 2.6 * s, t0 + 3.5 * s]])], tex: verd(x + 50) });
    F.add({ X, mat: 'iron', prof: 'round', bw: 1, grp: 'clap' + x, detail: true, shapes: [X.circ(x, t0 + 9.2 * s, 1.1)] });
  }
  const weed = (pts, r) => { const S = []; for (let k = 0; k < pts.length - 1; k++) S.push(X.cap(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], r[k], r[k + 1])); return S; };
  F.add({ X, mat: 'seaweed', prof: 'round', bw: 1.4, grp: 'weedL', detail: true, shapes: weed([[16.5, 36.5], [13.5, 40], [12.2, 45], [13.6, 50], [12.4, 55]], [1.4, 1.3, 1.2, 1, .7]) });
  F.add({ X, mat: 'seaweed', prof: 'round', bw: 1.4, grp: 'weedR', detail: true, shapes: weed([[47, 37.5], [50.5, 41], [52, 46], [50.8, 50.5], [52.2, 54]], [1.4, 1.3, 1.1, .9, .6]) });
  if (P.drips) F.add({ X, mat: 'water', prof: 'round', bw: 1, grp: 'drip', noShadow: true, noOutline: true, detail: true, shapes: [X.cap(25.5, 51.5, 25.5, 53, .7, .9), X.circ(38.5, 55.5, .8), X.cap(27.8, 57, 27.8, 58.2, .5, .75), X.circ(45, 60.5, .7)] });
}
/* body armour, front view */
function mailR(F, X, P) {
  const sh = [[14, 13], [22, 10], [42, 10], [50, 13], [55, 20], [56.5, 31], [50.5, 33.5], [48, 26], [46.5, 40], [49, 54], [32, 57], [15, 54], [17.5, 40], [16, 26], [13.5, 33.5], [7.5, 31], [9, 20]];
  F.add({ X, mat: P.mat, prof: 'round', bw: 7, hs: .7, grp: 'body', shapes: [X.poly(sh)], cuts: [X.ell(32, 9.5, 7.5, 6.5)], tex: P.tex });
  if (P.trim) {
    F.add({ X, mat: P.trim, prof: 'round', bw: 1.6, grp: 'collar', shapes: [X.cap(22.5, 11, 27, 16.5, 1.7), X.cap(27, 16.5, 32, 18, 1.7), X.cap(32, 18, 37, 16.5, 1.7), X.cap(37, 16.5, 41.5, 11, 1.7)] });
    F.add({ X, mat: P.trim, prof: 'round', bw: 1.6, grp: 'hem', shapes: [X.cap(15.5, 53.5, 32, 56.5, 1.7), X.cap(32, 56.5, 48.5, 53.5, 1.7)] });
  }
  if (P.belt) { F.add({ X, mat: P.belt, prof: 'round', bw: 2, grp: 'belt', shapes: [X.cap(16.8, 41, 47.2, 41, 2.2)] }); F.add({ X, mat: 'gold', prof: 'bevel', bw: 1, grp: 'buckle', detail: true, shapes: [X.poly([[29, 38.2], [35, 38.2], [35, 43.8], [29, 43.8]])], cuts: [X.poly([[30.6, 39.8], [33.4, 39.8], [33.4, 42.2], [30.6, 42.2]])] }); }
  if (P.pauldrons) for (const g of [-1, 1]) F.add({ X, mat: P.pauldrons, prof: 'round', bw: 4, grp: 'pd' + g, shapes: [X.ell(32 + g * 18, 16.5, 8.5, 6.2)], tex: P.pdTex });
}
const scaleTex = (sz = 4, seed = 2) => ({ x, y }) => { const row = Math.floor(y / sz), xo = (x + (row & 1) * (sz / 2)) % sz, yo = y % sz; if (yo === sz - 1) return -1.5; if (yo === 0 && xo === 1) return 1; if (xo === 0 && yo > 0) return -.8; return hash(x, y, seed) < .06 ? 1 : 0; };
const mailTex = ({ x, y }) => ((x + y) & 1) ? -1 : (((x ^ y) & 3) === 0 ? 1 : 0);
function chestR(F, X, P) {
  const plank = ({ y, x }) => ((y - 13) % 4 === 0 ? -1.5 : 0) + (vnoise(x * .3, y * .9, 3) > .7 ? -1 : 0);
  if (P.open) {
    F.add({ X, mat: 'wood', prof: 'bevel', bw: 1, grp: 'lid', tex: ({ x, y }) => -1 + (vnoise(x * .3, y * .9, 5) > .7 ? -1 : 0), shapes: [X.poly([[3, 12.5], [29, 12.5], [27.5, 3.5], [4.5, 3.5]])] });
    F.add({ X, mat: 'iron', prof: 'round', bw: 1, grp: 'lidstrap', shapes: [X.cap(7.6, 4, 7.4, 12, 1.2), X.cap(24.4, 4, 24.6, 12, 1.2), X.cap(4.5, 3.8, 27.5, 3.8, 1)] });
    F.add({ X, mat: P.glowMat || 'ember', prof: 'flat', grp: 'glow', noShadow: true, shapes: [X.poly([[3, 11.5], [29, 11.5], [29, 15], [3, 15]])], tex: ({ y }) => ({ dd: y < 13 ? 2 : 1, e: 1 }) });
  } else {
    const arc = []; for (let k = 0; k <= 14; k++) { const a = Math.PI * k / 14; arc.push([16 - 14 * Math.cos(a), 13 - 9.2 * Math.sin(a)]); }
    F.add({ X, mat: 'wood', prof: 'round', bw: 6, hs: .8, grp: 'lid', shapes: [X.poly(arc)], tex: ({ x, y }) => ((x - 2) % 5 === 0 ? -1.2 : 0) + (vnoise(x * .9, y * .3, 7) > .72 ? -1 : 0) });
  }
  F.add({ X, mat: 'wood', prof: 'bevel', bw: 1.3, grp: 'body', shapes: [X.poly([[2, 13], [30, 13], [30, 26.5], [2, 26.5]])], tex: plank });
  for (const x of [7.4, 24.6]) F.add({ X, mat: 'iron', prof: 'round', bw: 1.2, grp: 'strap' + x, shapes: [X.cap(x, P.open ? 13 : 6.4, x, 26.2, 1.3)] });
  F.add({ X, mat: 'iron', prof: 'round', bw: 1.2, grp: 'rim', shapes: [X.cap(1.6, 13.2, 30.4, 13.2, 1.25), X.cap(1.6, 26, 30.4, 26, 1)] });
  F.add({ X, mat: 'gold', prof: 'bevel', bw: 1, grp: 'lock', shapes: [X.poly([[13, 11.5], [19, 11.5], [19, 17.5], [16, 19.3], [13, 17.5]])] });
  F.add({ X, mat: 'dark', prof: 'flat', grp: 'lock', noShadow: true, shapes: [X.circ(16, 14.4, 1), X.cap(16, 14.5, 16, 16.8, .55)] });
  for (const [x, y] of [[7.4, 13.2], [24.6, 13.2], [7.4, 26], [24.6, 26]]) F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'stud' + x + y, noShadow: true, shapes: [X.circ(x, y, 1.05)] });
}
/* small accessory recipes (authored in 64-space; used mostly at 16) */
const lerp = (a, b, t) => a + (b - a) * t;
/* closed outline around a centreline cl(u)->[t,s] with half-width hw(u) */
function ribbon(cl, hw, n = 14) {
  const L = [], R = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, [t, s] = cl(u), [t2, s2] = cl(Math.min(1, u + .01)), [t1, s1] = cl(Math.max(0, u - .01));
    let dt = t2 - t1, ds = s2 - s1; const l = Math.hypot(dt, ds) || 1; dt /= l; ds /= l; const w = hw(u);
    L.push([t - ds * w, s + dt * w]); R.push([t + ds * w, s - dt * w]);
  }
  return L.concat(R.reverse());
}
/* a chain of capsules through pts with radii rs (or one radius) */
function chain(X, pts, rs) { const S = []; for (let k = 0; k < pts.length - 1; k++) { const a = Array.isArray(rs) ? rs[k] : rs, b = Array.isArray(rs) ? rs[k + 1] : rs; S.push(X.cap(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], a, b)); } return S; }
/* small thorn triangles along a list of [t, s, dirT, dirS, len, w] */
function thornShapes(X, list) { return list.map(([t, s, dt, ds, len, w]) => { const l = Math.hypot(dt, ds) || 1, ux = dt / l, uy = ds / l; return X.poly([[t - uy * w, s + ux * w], [t + ux * len, s + uy * len], [t + uy * w, s - ux * w]]); }); }
const band = (F, X, t, r, m, grp, extra = .5) => F.add({ X, mat: m, prof: 'round', bw: .9, grp: grp || ('band' + t), shapes: [X.poly([[t - .9, -(r + extra)], [t + .9, -(r + extra)], [t + .9, r + extra], [t - .9, r + extra]])] });
/* tex helpers for procedural looks */
const TX2 = {
  granite: seed => ({ x, y }) => { const n = vnoise(x * .35, y * .35, seed); return n > .72 ? -1 : n < .18 ? 1 : (hash(x, y, seed) < .08 ? -1 : 0); },
  cracks: (seed, m, thr = .06) => ({ x, y }) => { const n = Math.abs(vnoise(x * .22, y * .22, seed) - .5); return n < thr ? { m, dd: n < thr * .5 ? 1 : 0 } : 0; },
  rings: (cx, cy, m2, k = 1) => ({ x, y }) => { const d = (Math.hypot(x + .5 - cx, y + .5 - cy) + vnoise(x * .3, y * .3, 3) * 1.6 * k) / Math.max(k, .45); const f = d % 3.2; return f < .9 ? -1 : (m2 && f > 2.6 && d < 9 ? { m: m2 } : 0); },
  folds: seed => ({ x, y }) => { const n = vnoise(x * .18, y * .05, seed); return n > .66 ? -1 : n < .22 ? 1 : 0; },
  stitch: per => ({ x, y }) => ((x % per === 0 && (y & 1)) ? -1.2 : 0),
  plates: per => ({ y }) => (y % per === 0 ? -1.5 : y % per === 1 ? .8 : 0),
  scale: (sz, seed) => scaleTex(sz, seed),
};

const inset = (pts, cx, cy, f) => pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
function shapedShieldR(F, X, P) {
  const heater = P.shape === 'heater', cy = heater ? 28 : 32;
  const pts = heater ? [[9, 5], [55, 5], [55, 25], [49, 42], [32, 59], [15, 42], [9, 25]] : [[13, 3], [51, 3], [53, 8], [53, 54], [32, 62], [11, 54], [11, 8]];
  const face = P.paint ? ({ x, y }) => { const dx = x - 32, dy = y - cy; if (P.paint === 'chevron' && Math.abs(dy - Math.abs(dx) * .9 + 2) < 4.5) return { m: P.paint2 || 'paintRed' }; if (P.paint === 'quarter' && (dx > 0) !== (dy > 0)) return { m: P.paint2 || 'paintRed' }; if (P.paint === 'thorn' && Math.abs(dx + Math.sin(dy * .45) * 3) < 2.4) return { m: P.paint2 || 'bramble' }; return (x % 4 === 0 && P.planks ? -1 : 0); } : P.planks ? ({ x }) => (x % 4 === 0 ? -1 : 0) : null;
  F.add({ X, mat: P.face || 'wood', prof: 'round', bw: 12, hs: .5, grp: 'face', shapes: [X.poly(pts)], tex: face });
  F.add({ X, mat: P.rim || 'iron', prof: 'round', bw: 2.2, grp: 'rim', shapes: [X.poly(pts)], cuts: [X.poly(inset(pts, 32, cy, heater ? .86 : .88))] });
  if (!heater) F.add({ X, mat: P.rim || 'iron', prof: 'round', bw: 1.6, grp: 'band', shapes: [X.cap(13, 24, 51, 24, 2), X.cap(13, 42, 51, 42, 2)] });
  if (P.rivets) { const S = pts.map(([x, y]) => { const q = inset([[x, y]], 32, cy, .93)[0]; return X.circ(q[0], q[1], 1.2); }); F.add({ X, mat: P.rivets, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: S }); }
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(20, cy - 10, 26, cy - 14, .7), X.cap(38, cy - 14, 44, cy - 10, .7), X.cap(26, cy + 12, 38, cy + 12, .7)] });
  F.add({ X, mat: P.boss || 'iron', prof: 'round', bw: 6, grp: 'boss', shapes: [X.circ(32, cy, (P.bossR || 7) * .8)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 4, grp: 'boss', noShadow: true, shapes: [X.circ(32, cy, 3.6)] });
}
/* shield style 'scale': one great wyrm scale, growth ridges round a raised keel, a hide strap along the top */
function scaleShieldR(F, X, P) {
  const pts = [];
  for (let k = 0; k <= 14; k++) { const a = Math.PI + Math.PI * k / 14; pts.push([32 + Math.cos(a) * 25, 25 + Math.sin(a) * 21]); }
  pts.push([56, 34], [50, 47], [41, 56.5], [32, 62], [23, 56.5], [14, 47], [8, 34]);
  F.add({ X, mat: P.face || 'brass', prof: 'round', bw: 12, hs: .55, grp: 'face', shapes: [X.poly(pts)], tex: ({ x, y, d }) => { const r = (d + vnoise(x * .2, y * .2, 7) * 1.2) % 4.8; return r < .8 ? -1.2 : r > 4 ? 1 : hash(x, y, 5) < .05 ? -1 : 0; } });
  F.add({ X, mat: P.face || 'brass', prof: 'ridge', hs: .9, grp: 'keel', shapes: [X.poly([[32, 5.5], [34.6, 24], [33.6, 50], [32, 58], [30.4, 50], [29.4, 24]])] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'keelglow', noShadow: true, detail: true, shapes: [16, 24, 32, 40, 47].map(y => X.circ(32, y + 4, .8)) });
  F.add({ X, mat: P.rim || 'wyrmHide', prof: 'round', bw: 1.6, grp: 'strap', shapes: [X.poly(pts)], cuts: [X.ell(32, 29, 22.4, 22.6)], clip: X.poly([[0, 0], [64, 0], [64, 21], [0, 21]]), tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) });
  if (P.rivets) F.add({ X, mat: P.rivets, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: [[12, 16], [21, 8.4], [32, 5.6], [43, 8.4], [52, 16]].map(([x, y]) => X.circ(x, y, 1.2)) });
  if (P.gem) { F.add({ X, mat: P.rim || 'wyrmHide', prof: 'round', bw: 2, grp: 'gemset', shapes: [X.circ(32, 15, 3.6)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gemset', noShadow: true, shapes: [X.circ(32, 15, 2.4)] }); }
}
/* shield style 'aegis': a tower shield crusted with ash, cracked through with embers, the gate of Scorchgate
   in bronze on its face with the fire still behind the gate */
function aegisShieldR(F, X, P) {
  const pts = [[13, 3], [51, 3], [53, 8], [53, 54], [32, 62], [11, 54], [11, 8]], cr = TX2.cracks(47, P.cracks || 'ember', .028);
  F.add({ X, mat: P.face || 'ash', prof: 'round', bw: 12, hs: .5, grp: 'face', shapes: [X.poly(pts)], tex: q => cr(q) || (vnoise(q.x * .3, q.y * .3, 5) > .7 || q.y > 50 + hash(q.x, 1, 4) * 6 ? -1 : 0) });
  F.add({ X, mat: P.rim || 'char', prof: 'round', bw: 2.2, grp: 'rim', shapes: [X.poly(pts)], cuts: [X.poly(inset(pts, 32, 32, .88))] });
  const G = P.emblem || 'bronze';
  F.add({ X, mat: 'dark', prof: 'flat', grp: 'gatein', shapes: [X.poly([[27, 44], [27, 33], [29, 29.6], [32, 28.6], [35, 29.6], [37, 33], [37, 44]])] });
  F.add({ X, mat: P.fire || 'ember', prof: 'flat', grp: 'gatefire', noShadow: true, shapes: [X.poly([[28.6, 44], [29.4, 38], [31, 35], [32, 32.5], [33, 35], [34.6, 38], [35.4, 44]])], tex: ({ y }) => ({ dd: y > 40 ? 1 : 0 }) });
  const tower = x0 => [X.poly([[x0, 46], [x0, 24], [x0 + 7, 24], [x0 + 7, 46]]), X.poly([[x0 - .6, 24.6], [x0 - .6, 20], [x0 + 1.6, 20], [x0 + 1.6, 22], [x0 + 2.8, 22], [x0 + 2.8, 20], [x0 + 4.4, 20], [x0 + 4.4, 22], [x0 + 5.6, 22], [x0 + 5.6, 20], [x0 + 7.6, 20], [x0 + 7.6, 24.6]])];
  F.add({ X, mat: G, prof: 'bevel', bw: 1.2, grp: 'gate', shapes: tower(19.4).concat(tower(37.6), [X.poly([[26, 30], [38, 30], [38, 33], [36.4, 30.8], [32, 29.4], [27.6, 30.8], [26, 33]]), X.poly([[18, 45.4], [46, 45.4], [46, 48], [18, 48]])]) });
  if (P.rivets) F.add({ X, mat: P.rivets, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: pts.map(([x, y]) => { const q = inset([[x, y]], 32, 32, .93)[0]; return X.circ(q[0], q[1], 1.2); }) });
  if (P.gem) { F.add({ X, mat: G, prof: 'round', bw: 2, grp: 'gemset', shapes: [X.circ(32, 13.5, 3.6)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gemset', noShadow: true, shapes: [X.circ(32, 13.5, 2.4)] }); }
}
function shieldR(F, X, P) {
  if (P.style === 'door') return doorShieldR(F, X, P);
  if (P.style === 'scale') return scaleShieldR(F, X, P);
  if (P.style === 'aegis') return aegisShieldR(F, X, P);
  if (P.style === 'oath') return oathShieldR(F, X, P);
  if (P.shape === 'heater' || P.shape === 'tower') return shapedShieldR(F, X, P);
  const r = P.r || 26;
  const face = P.paint ? ({ x, y }) => { const dx = x - 32, dy = y - 32; if (P.paint === 'chevron' && Math.abs(dy - Math.abs(dx) * .9 + 4) < 4.5) return { m: P.paint2 || 'paintRed' }; if (P.paint === 'quarter' && (dx > 0) !== (dy > 0)) return { m: P.paint2 || 'paintRed' }; if (P.paint === 'thorn' && Math.abs(dx + Math.sin(dy * .45) * 3) < 2.4) return { m: P.paint2 || 'bramble', dd: 0 }; return (x % 4) === 0 && P.planks ? -1 : 0; } : P.planks ? ({ x }) => ((x % 4) === 0 ? -1 : 0) : P.faceTex || null;
  F.add({ X, mat: P.face || 'wood', prof: 'round', bw: r * .6, hs: .5, grp: 'face', shapes: [X.circ(32, 32, r)], tex: face });
  F.add({ X, mat: P.rim || 'iron', prof: 'round', bw: 2.5, grp: 'rim', shapes: [X.circ(32, 32, r)], cuts: [X.circ(32, 32, r - 4.5)] });
  if (P.rivets) { const S = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; S.push(X.circ(32 + Math.cos(a) * (r - 2.2), 32 + Math.sin(a) * (r - 2.2), 1.2)); } F.add({ X, mat: P.rivets, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: S }); }
  if (P.runes) { const S = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + .2; const rr = r - 8.5; S.push(X.cap(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr, 32 + Math.cos(a + .22) * (rr - 2), 32 + Math.sin(a + .22) * (rr - 2), .7)); } F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: S }); }
  F.add({ X, mat: P.boss || 'iron', prof: 'round', bw: 8, grp: 'boss', shapes: [X.circ(32, 32, P.bossR || 8)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 4, grp: 'boss', noShadow: true, shapes: [X.circ(32, 32, 4.5)] });
}
/* full helm (card view) used by helmR look 'helm' */
function fullHelm(F, X, P) {
  const m = P.mat || 'steel';
  F.add({ X, mat: 'dark', prof: 'flat', grp: 'in', shapes: [X.poly([[17, 28], [47, 28], [47, 54], [17, 54]])] });
  if (P.plume) F.add({ X, mat: P.plume, prof: 'round', bw: 3, grp: 'plume', shapes: [X.poly([[29, 11], [35, 4], [45, 2], [57, 7], [50, 10], [42, 9.5], [35, 14]])], tex: ({ x, y }) => ((x + y * 2) % 4 === 0 ? -1 : 0) });
  F.add({ X, mat: m, prof: 'round', bw: 12, hs: .8, grp: 'dome', shapes: [X.ell(32, 31, 19, 21.5)], clip: X.poly([[0, 0], [64, 0], [64, 31.5], [0, 31.5]]), tex: P.tex });
  const br = P.breaths === false ? [] : [X.circ(39.5, 42, .95), X.circ(42.3, 42, .95), X.circ(39.5, 45, .95), X.circ(42.3, 45, .95), X.circ(40.9, 48, .95)];
  F.add({ X, mat: m, prof: 'bevel', bw: 3, hs: .9, grp: 'face', shapes: [X.poly([[13.3, 30], [50.7, 30], [50.2, 43], [46.5, 52.5], [39.5, 59], [24.5, 59], [17.5, 52.5], [13.8, 43]])], cuts: [X.poly([[17.5, 32.6], [46.5, 32.6], [45.6, 36.2], [18.4, 36.2]]), X.poly([[30.6, 35.5], [33.4, 35.5], [33.4, 51], [30.6, 51]])].concat(br), tex: P.tex });
  if (P.crest !== false) F.add({ X, mat: P.crestMat || m, prof: 'round', bw: 2, grp: 'crest', shapes: [X.cap(32, 10, 32, 29.5, 2.4, 1.4)] });
  F.add({ X, mat: P.trim || 'iron', prof: 'round', bw: 2, grp: 'brow', shapes: [X.cap(13.4, 30.4, 50.6, 30.4, 2.1)] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, shapes: [X.cap(19, 30.4, 23, 30.4, .75), X.cap(25.5, 29.2, 25.5, 31.6, .75), X.cap(38.5, 29.2, 38.5, 31.6, .75), X.cap(41, 30.4, 45, 30.4, .75), X.cap(32, 14, 32, 25, .75)] });
  if (P.gem) { F.add({ X, mat: P.trim || 'iron', prof: 'round', bw: 2, grp: 'gemset', shapes: [X.circ(32, 30.4, 3.4)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gemset', noShadow: true, shapes: [X.circ(32, 30.4, 2.2)] }); }
  if (P.eyes) F.add({ X, mat: P.eyes, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [X.ell(25, 34.4, 3, 1.3), X.ell(39, 34.4, 3, 1.3)] });
  F.add({ X, mat: P.rivet || P.trim || 'iron', prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: [X.circ(16.5, 44, 1.1), X.circ(47.5, 44, 1.1), X.circ(21, 53.5, 1), X.circ(43, 53.5, 1)] });
}
function helmR(F, X, P) {
  if (P.style === 'mask') return maskR(F, X, P);
  if (P.look === 'kettle') {
    const m = P.mat || 'steel';
    if (P.vane) vaneR(F, X, P);
    F.add({ X, mat: m, prof: 'round', bw: 14, hs: .8, grp: 'dome', shapes: [X.ell(32, 36, 20, 22)], clip: X.poly([[0, 0], [64, 0], [64, 38], [0, 38]]), tex: P.tex });
    if (P.crest) F.add({ X, mat: P.crest, prof: 'round', bw: 2, grp: 'crest', shapes: [X.cap(32, 15, 32, 33, 2.2, 1.5)] });
    F.add({ X, mat: m, prof: 'round', bw: 4, grp: 'brim', shapes: [X.ell(32, 39, 30, 6.5)], tex: P.tex });
    F.add({ X, mat: P.trim || 'iron', prof: 'round', bw: 2, grp: 'band', shapes: [X.cap(12.5, 34, 51.5, 34, 2.4)] });
    if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, shapes: [X.cap(18, 34, 23, 34, .75), X.cap(27, 34, 30, 34, .75), X.cap(34, 34, 37, 34, .75), X.cap(41, 34, 46, 34, .75), X.cap(32, 20, 32, 29, .75)] });
    if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'band', noShadow: true, shapes: [X.circ(32, 34, 2.6)] });
    if (P.rivets) F.add({ X, mat: P.rivets, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: [15.2, 24.8, 39.2, 48.8].map(x => X.circ(x, 34, 1.15)) });
  } else if (P.look === 'hood') {
    const tip = P.tip ?? 1;
    F.add({ X, mat: P.mat, prof: 'round', bw: 12, grp: 'hood', shapes: [X.ell(32, 30, 22, 24), X.poly([[8, 38], [56, 38], [60, 58], [4, 58]])].concat(tip ? [X.poly([[22, 12], [38, 4], [46, 1], [42, 10], [40, 14]])] : []), cuts: [X.ell(32, 36, 13, 14)], tex: P.weave ? weaveTex(P.weave, P.tex) : P.tex });
    F.add({ X, mat: 'dark', prof: 'round', bw: 8, grp: 'in', shapes: [X.ell(32, 36, 13, 14)], tex: () => -1 });
    if (P.eyes) F.add({ X, mat: P.eyes, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [X.ell(26.5, 37, 2.2, 1.2), X.ell(37.5, 37, 2.2, 1.2)] });
    if (P.trim) F.add({ X, mat: P.trim, prof: 'round', bw: 1.6, grp: 'trim', shapes: [X.ell(32, 36, 15.2, 16.2)], cuts: [X.ell(32, 36, 13, 14)], tex: P.trimTex });
    if (P.clasp) { F.add({ X, mat: P.clasp, prof: 'round', bw: 3, grp: 'clasp', shapes: [P.leaf ? X.poly([[26, 56], [32, 50], [38, 56], [32, 62]]) : X.circ(32, 56, 4)] }); if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'clasp', noShadow: true, shapes: [X.circ(32, 56, 2)] }); }
    if (P.vine) F.add({ X, mat: P.vine, prof: 'round', bw: 1, grp: 'vine', detail: true, shapes: chain(X, [[12, 44], [15, 34], [14, 26], [19, 16], [27, 10], [35, 9]], .9).concat(thornShapes(X, [[14.6, 30, -1, -.3, 3.2, .8], [17, 20, -1, -1, 3, .8], [24, 12, -.2, -1, 3, .8], [13.4, 40, -1, .3, 3, .8]])) });
    if (P.spiral) hoodSpiral(F, X, P);
  } else if (P.look === 'circlet') {
    if (P.style === 'rotwood') {
      const S = []; for (let k = 0; k < 18; k++) { const a = Math.PI * 2 * k / 18, b = Math.PI * 2 * (k + 1) / 18; const w = Math.sin(a * 3) * 1.2; S.push(X.cap(32 + Math.cos(a) * 24, 34 + Math.sin(a) * 11 + w, 32 + Math.cos(b) * 24, 34 + Math.sin(b) * 11 + Math.sin(b * 3) * 1.2, 2.3)); }
      F.add({ X, mat: P.mat || 'rotwood', prof: 'round', bw: 2.4, grp: 'band', shapes: S, tex: ({ x, y }) => ((x * 2 + y) % 5 === 0 ? -1 : vnoise(x * .4, y * .4, 3) > .74 ? { m: 'moss' } : 0) });
      const S2 = []; for (let k = 0; k < 16; k++) { const a = Math.PI * 2 * (k + .5) / 16, b = a + .5; S2.push(X.cap(32 + Math.cos(a) * 23, 34 + Math.sin(a) * 11 - 1.5, 32 + Math.cos(b) * 25, 34 + Math.sin(b) * 12 + 1.5, 1.2)); }
      F.add({ X, mat: P.mat2 || 'bark', prof: 'round', bw: 1.2, grp: 'twist', detail: true, shapes: S2 });
      F.add({ X, mat: P.thorn || 'thorn', prof: 'ridge', hs: .9, grp: 'thorns', shapes: thornShapes(X, [[12, 30, -.6, -1, 7, 1.4], [20, 25, -.3, -1, 8, 1.4], [44, 25, .3, -1, 8, 1.4], [52, 30, .6, -1, 7, 1.4], [9, 38, -1, .1, 5, 1.2], [55, 38, 1, .1, 5, 1.2]]) });
      F.add({ X, mat: P.mat || 'rotwood', prof: 'round', bw: 3, grp: 'knot', shapes: [X.ell(32, 43, 7, 6.5)] });
      F.add({ X, mat: P.gem || 'blight', prof: 'round', bw: 3, grp: 'knot', noShadow: true, shapes: [X.poly([[32, 37], [36.5, 43], [32, 49.5], [27.5, 43]])] });
      if (P.leaves) F.add({ X, mat: P.leaves, prof: 'round', bw: 1.5, grp: 'leaves', detail: true, shapes: [X.poly([[20, 42], [14, 48], [13, 53], [18, 49]]), X.poly([[44, 42], [50, 48], [51, 53], [46, 49]])] });
      return;
    }
    const m = P.mat || 'gold';
    F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'band', shapes: [X.ell(32, 34, 26, 12)], cuts: [X.ell(32, 33, 21.5, 8)] });
    if (P.filigree) F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'fil', detail: true, shapes: [X.cap(20, 43, 26, 40, .9), X.cap(44, 43, 38, 40, .9), X.circ(18.5, 44, 1.4), X.circ(45.5, 44, 1.4)] });
    F.add({ X, mat: m, prof: 'round', bw: 5, grp: 'set', shapes: [X.poly([[26, 44], [32, 36], [38, 44], [32, 52]])] });
    F.add({ X, mat: P.gem, prof: 'round', bw: 3, grp: 'set', noShadow: true, shapes: [X.circ(32, 44, 4.2)] });
  } else if (P.look === 'coif') {
    F.add({ X, mat: P.mat, prof: 'round', bw: 14, grp: 'cap', shapes: [X.ell(32, 38, 22, 24)], clip: X.poly([[0, 0], [64, 0], [64, 40], [0, 40]]), tex: P.tex });
    if (P.flaps) F.add({ X, mat: P.mat, prof: 'round', bw: 4, grp: 'flaps', shapes: [X.poly([[10, 36], [18, 36], [19, 54], [12, 52]]), X.poly([[46, 36], [54, 36], [52, 52], [45, 54]])], tex: P.tex });
    F.add({ X, mat: P.band || 'leather', prof: 'round', bw: 3, grp: 'band', shapes: [X.cap(10, 38, 54, 38, 3.5)] });
    if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'band', noShadow: true, shapes: [X.circ(32, 38, 2.6)] });
  } else if (P.look === 'crown') {
    crownR(F, X, P);
  } else {
    fullHelm(F, X, P);
  }
}
function glovesR(F, X, P) {
  const plate = P.plate;
  F.add({ X, mat: P.cuffMat || P.mat, prof: 'round', bw: 8, grp: 'cuff', shapes: [P.flare ? X.poly([[9.5, 62], [50.5, 62], [46.5, 43], [13.5, 43]]) : plate ? X.poly([[16, 61], [44, 61], [47, 43], [13, 43]]) : X.poly([[18, 60], [42, 60], [44, 44], [16, 44]])], tex: P.cuffTex });
  // fingerless: bare fingertips under a glove cut short (P.tips = skin material, P.tipCut = fraction covered)
  if (P.tips) F.add({ X, mat: P.tips, prof: 'round', bw: 3, grp: 'tips', shapes: FINGERS.map(([a, b, c, d, r]) => X.cap(a, b, c, d, r * .9, r * .8)) });
  const cut = P.tipCut ?? .68;
  const fingers = P.tips ? FINGERS.map(([a, b, c, d, r]) => X.cap(a, b, a + (c - a) * cut, b + (d - b) * cut, r)) : [X.cap(20, 22, 18, 7, 4), X.cap(28, 22, 28, 4, 4), X.cap(36, 22, 38, 6, 4), X.cap(44, 25, 49, 13, 3.6), X.cap(15, 36, 7, 27, 4.2)];
  F.add({ X, mat: P.mat, prof: 'round', bw: 10, grp: 'palm', shapes: [X.poly([[15, 46], [45, 46], [46, 22], [14, 22]])].concat(fingers), tex: P.veins ? veinTex(P.veins, plate) : plate ? ({ x, y }) => (y < 22 && y % 5 === 0 ? -1.5 : (y > 26 && y < 44 && (y - 26) % 6 === 0 ? -1 : 0)) : P.tex });
  if (P.trim) F.add({ X, mat: P.trim, prof: 'round', bw: 1.6, grp: 'trim', shapes: [X.cap(plate ? 13.5 : 16.5, 45, plate ? 46.5 : 43.5, 45, 1.8)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gem', noShadow: true, shapes: [X.circ(30, 34, 3.2)] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(20, 52, 26, 52, .7), X.cap(30, 50, 30, 56, .7), X.cap(34, 52, 40, 52, .7)] });
  if (P.tips || P.knuckles || P.bolt || P.sigil || P.coin || P.cuffGem || P.cuffBand) glovesExtra(F, X, P, cut);
}
function bootsR(F, X, P) {
  if (P.wings) bootWing(F, X, P, [42.4, 18.4], 1, .8, 'wingF');
  F.add({ X, mat: P.mat, prof: 'round', bw: 8, grp: 'boot', shapes: [X.poly([[18, 6], [40, 6], [40, 38], [56, 46], [58, 58], [14, 58], [16, 36]])], tex: P.tex });
  if (P.greave) F.add({ X, mat: P.greave, prof: 'round', bw: 5, grp: 'greave', shapes: [X.poly([[20, 12], [38, 12], [39, 34], [29, 40], [19, 34]])], tex: TX2.plates(7) });
  F.add({ X, mat: P.trim || 'leather', prof: 'round', bw: 3, grp: 'cuff', shapes: [P.fold ? X.poly([[14, 3], [44, 3], [42, 15], [16, 15]]) : X.cap(16, 9, 42, 9, 4)], tex: P.cuffTex });
  if (P.wraps) F.add({ X, mat: P.wraps, prof: 'round', bw: 1.2, grp: 'wraps', shapes: [15, 21, 27, 33].map(y => X.poly([[16.4, y], [40.4, y - 3.4], [40.4, y - .6], [16.4, y + 2.8]])), tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) });
  F.add({ X, mat: P.sole || P.trim || 'leather', prof: 'round', bw: 2, grp: 'sole', shapes: [X.cap(14 - (P.soleW || 0), 57, 58 + (P.soleW || 0), 57, 2.8)] });
  if (P.straps) F.add({ X, mat: P.straps, prof: 'round', bw: 1.2, grp: 'straps', shapes: [X.cap(16.5, 24, 40, 20, 1.5), X.cap(16.8, 31, 40, 27, 1.5)] });
  if (P.buckle) F.add({ X, mat: P.buckle, prof: 'round', bw: 1.5, grp: 'buckle', noShadow: true, detail: true, shapes: P.leaf ? [X.poly([[34, 18], [38, 22], [34, 27], [30, 22]])] : [X.circ(36, 22, 2), X.circ(36, 29, 2)] });
  if (P.vine) F.add({ X, mat: P.vine, prof: 'round', bw: 1, grp: 'vine', detail: true, shapes: chain(X, [[17, 44], [22, 38], [30, 36], [36, 40], [44, 42], [52, 48]], 1).concat(thornShapes(X, [[25, 37, -.2, -1, 3, .8], [40, 41, .3, -1, 3, .8], [48, 45, .5, -1, 3, .8]])) });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gem', noShadow: true, shapes: [X.circ(29, 9, 2.4)] });
  if (P.wings || P.swirl) bootsExtra(F, X, P);
}
const amuChain = (F, X, P) => F.add({ X, mat: P.chain || 'gold', prof: 'round', bw: 2, grp: 'chain', shapes: [X.ell(32, 22, 20, 18)], cuts: [X.ell(32, 22, 16.5, 14.5)], clip: X.poly([[0, 0], [64, 0], [64, 32], [0, 32]]) });
const bail = (F, X, m, y = 26.5) => F.add({ X, mat: m, prof: 'round', bw: 1.6, grp: 'bail', shapes: [X.circ(32, y, 2.6)], cuts: [X.circ(32, y, 1.1)] });
/* amulet style 'orrery': a brass armillary: a meridian ring, a tilted ring of hours passing behind and in front
   of a storm-glass sphere, planets on the rings, an axis pin */
function orreryR(F, X, P) {
  const m = P.metal || 'brass', cy = 43, tilt = -.38;
  amuChain(F, X, P); bail(F, X, m);
  F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'axis', shapes: [X.cap(32, 28, 32, 60, .9)] });
  const ring = (clip, g) => F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: g, shapes: [rell(X, 32, cy, 20, 7, 30, tilt)], cuts: [rell(X, 32, cy, 17.6, 5, 30, tilt)], clip });
  const ax = [32 - 40 * Math.cos(tilt), cy - 40 * Math.sin(tilt)], bx = [32 + 40 * Math.cos(tilt), cy + 40 * Math.sin(tilt)];
  ring(X.poly([ax, bx, [bx[0], -20], [ax[0], -20]]), 'ringback');
  F.add({ X, mat: m, prof: 'round', bw: 1.6, grp: 'meridian', shapes: [X.circ(32, cy, 15.5)], cuts: [X.circ(32, cy, 13)], tex: ({ x, y }) => ((x + y) % 4 === 0 ? -1 : 0) });
  F.add({ X, mat: P.gem || 'stormglass', prof: 'round', bw: 5, grp: 'sphere', shapes: [X.circ(32, cy, 7.2)] });
  if (P.core) F.add({ X, mat: P.core, prof: 'round', bw: 2, grp: 'sphere', noShadow: true, shapes: [X.circ(30.6, cy - 1.4, 2.6)] });
  ring(X.poly([ax, bx, [bx[0], 90], [ax[0], 90]]), 'ringfront');
  F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'hand', shapes: [X.cap(32, cy, 36.5, cy - 4.2, .8, .5)] });
  const pl = (a, r2, ry, mat, rr) => { const c = Math.cos(a) * r2, s = Math.sin(a) * ry; return F.add({ X, mat, prof: 'round', bw: 1.4, grp: 'planet' + mat, noShadow: true, shapes: [X.circ(32 + c * Math.cos(tilt) - s * Math.sin(tilt), cy + c * Math.sin(tilt) + s * Math.cos(tilt), rr)] }); };
  pl(.5, 18.8, 6, P.planet || 'topaz', 2.2); pl(2.9, 18.8, 6, 'pearl', 1.8);
  F.add({ X, mat: 'sapphire', prof: 'round', bw: 1.2, grp: 'moon', noShadow: true, shapes: [X.circ(32 - 14.2, cy - 2, 1.7)] });
}
/* amulet style 'lens': a silver-framed lens holding well-water that never spilled */
function lensAmuletR(F, X, P) {
  const m = P.metal || 'silver', cy = 43;
  amuChain(F, X, P); bail(F, X, m);
  F.add({ X, mat: P.lens || 'glass', prof: 'round', bw: 8, grp: 'lens', shapes: [X.circ(32, cy, 13)], tex: ({ u, v }) => (Math.hypot(u - 28, v - cy + 4) < 4 ? 1 : 0) });
  const W = []; for (let k = 0; k <= 10; k++) { const x = 20 + k * 2.4; W.push([x, cy + 1 + Math.sin(k * 1.1) * 1.1]); }
  for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; W.push([32 + Math.cos(a) * 12.2, cy + Math.sin(a) * 12.2]); }
  F.add({ X, mat: P.water || 'water', prof: 'round', bw: 3, grp: 'water', noShadow: true, shapes: [X.poly(W)], tex: ({ v }) => ({ dd: v < cy + 3 ? 1 : v > cy + 9 ? -1 : 0 }) });
  F.add({ X, mat: 'pearl', prof: 'flat', grp: 'sheen', noShadow: true, noOutline: true, shapes: [X.cap(24.6, cy - 6.4, 28.6, cy - 9.2, .9, .6)] });
  F.add({ X, mat: m, prof: 'round', bw: 2, grp: 'frame', shapes: [X.circ(32, cy, 15.4)], cuts: [X.circ(32, cy, 12.8)] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [0, 1, 2, 3, 4, 5].map(k => { const a = k / 6 * Math.PI * 2 + .3; return X.circ(32 + Math.cos(a) * 14.1, cy + Math.sin(a) * 14.1, .8); }) });
}
/* amulet style 'heart': a sunstone cut as a heart and caged in gold, glowing from inside */
function heartAmuletR(F, X, P) {
  const m = P.metal || 'gold', cy = 43;
  amuChain(F, X, P); bail(F, X, m, 28);
  const H = [];
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (.8 + k / 10 * 1.2); H.push([26.4 + Math.cos(a) * 7.4, cy - 3 + Math.sin(a) * 7.4]); }
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 + k / 10 * 1.2); H.push([37.6 + Math.cos(a) * 7.4, cy - 3 + Math.sin(a) * 7.4]); }
  H.push([32, cy + 14]);
  F.add({ X, mat: P.stone || 'amber', prof: 'ridge', grp: 'heart', shapes: [X.poly(H)], tex: ({ u, v }) => ({ dd: (Math.floor((u - v * .6 + 40) / 3.2) & 1) ? 0 : 1 }) });
  if (P.core) F.add({ X, mat: P.core, prof: 'round', bw: 2, grp: 'heart', noShadow: true, shapes: [X.circ(29.6, cy - 3.4, 2.8)] });
  F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'cage', shapes: chain(X, [[32, 30.4], [32.6, cy + 2], [32, cy + 13.4]], [1, 1.1, .8]).concat(chain(X, [[19.6, cy - 1], [26, cy + 2.6], [32, cy + 2.4], [38, cy + 2.6], [44.4, cy - 1]], [.9, 1, 1, 1, .9])) });
  if (P.veins) F.add({ X, mat: P.veins, prof: 'flat', grp: 'veins', noShadow: true, detail: true, shapes: chain(X, [[24, cy - 6], [27, cy - 2], [26, cy + 2]], .55).concat(chain(X, [[40, cy - 6], [37.4, cy - 1], [38.4, cy + 3]], .55)) });
}
function amuletR(F, X, P) {
  if (P.style === 'bell') return bellAmuletR(F, X, P);
  if (P.style === 'ribs') return ribsAmuletR(F, X, P);
  if (P.style === 'seed') return seedAmuletR(F, X, P);
  if (P.style === 'orrery') return orreryR(F, X, P);
  if (P.style === 'lens') return lensAmuletR(F, X, P);
  if (P.style === 'heart') return heartAmuletR(F, X, P);
  F.add({ X, mat: P.chain || 'gold', prof: 'round', bw: 2, grp: 'chain', shapes: [X.ell(32, 22, 20, 18)], cuts: [X.ell(32, 22, 16.5, 14.5)], clip: X.poly([[0, 0], [64, 0], [64, 32], [0, 32]]) });
  if (P.style === 'sun') {
    const S = []; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + Math.PI / 12, l = k & 1 ? 20 : 23, w = k & 1 ? .19 : .16; S.push(X.poly([[32 + Math.cos(a - w) * 12, 42 + Math.sin(a - w) * 12], [32 + Math.cos(a) * l, 42 + Math.sin(a) * l], [32 + Math.cos(a + w) * 12, 42 + Math.sin(a + w) * 12]])); }
    F.add({ X, mat: P.rays || P.metal || 'gold', prof: 'ridge', hs: .8, grp: 'rays', shapes: S });
  }
  F.add({ X, mat: P.metal || 'gold', prof: 'round', bw: 10, grp: 'disc', shapes: [X.circ(32, 42, 15)], tex: P.style === 'seal' || P.style === 'sun' ? ({ x, y }) => { const d = Math.hypot(x - 32, y - 42); return d > 11 && d < 12.2 ? -1.5 : 0; } : P.tex });
  if (P.frame) F.add({ X, mat: P.frame, prof: 'round', bw: 2, grp: 'frame', shapes: [X.circ(32, 42, 10.4)], cuts: [X.circ(32, 42, 8.4)] });
  F.add({ X, mat: P.gem, prof: 'round', bw: 5, grp: 'disc', noShadow: true, shapes: [X.circ(32, 42, 8)] });
  if (P.core) F.add({ X, mat: P.core, prof: 'round', bw: 3, grp: 'core', noShadow: true, shapes: [X.circ(32, 42, 4.4)] });
  if (P.glyph) F.add({ X, mat: P.glyph, prof: 'round', bw: .8, grp: 'glyph', noShadow: true, detail: true, shapes: [X.cap(32, 37, 32, 47, .8), X.cap(27, 42, 37, 42, .8)] });
}
/* ring style 'signet': a heavy band and a broad oval seal, its face cut with the cistern's water-lines */
function signetR(F, X, P) {
  const m = P.metal || 'silver';
  F.add({ X, mat: m, prof: 'round', bw: 4, grp: 'ring', shapes: [X.ell(32, 41, 19.5, 16)], cuts: [X.ell(32, 42.4, 13, 10.4)], tex: P.tex });
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'shoulders', shapes: [X.poly([[19, 28], [45, 28], [41, 34], [23, 34]])] });
  F.add({ X, mat: m, prof: 'round', bw: 3.4, grp: 'bezel', shapes: [X.ell(32, 21.5, 14, 10)] });
  F.add({ X, mat: P.face || 'sapphire', prof: 'round', bw: 3, grp: 'face', shapes: [X.ell(32, 21.5, 10.4, 7)] });
  const S = []; for (const [y, a] of [[17.6, 1], [21.6, 1.2], [25.4, .9]]) { const P0 = []; for (let k = 0; k <= 8; k++) { const x = 24 + k * 2; P0.push([x, y + Math.sin(k * 1.4) * a]); } S.push(...chain(X, P0, .62)); }
  F.add({ X, mat: P.seal || m, prof: 'round', bw: .7, grp: 'seal', shapes: S });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(15.5, 44, 17.6, 49.4, .7), X.cap(46.4, 49.4, 48.5, 44, .7)] });
}
/* ring style 'keyring': a jailer's hoop of black iron with a hinged clasp, and a key-loop with no key on it */
function keyringR(F, X, P) {
  const m = P.metal || 'blackiron';
  F.add({ X, mat: m, prof: 'round', bw: 2.4, grp: 'loop', shapes: [X.circ(32, 56.4, 5.6)], cuts: [X.circ(32, 56.4, 3.6)] });
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'hoop', shapes: [X.ell(32, 32, 23, 21)], cuts: [X.ell(32, 32, 19.2, 17.4)], tex: ({ x, y }) => (hash(x, y, 13) < .1 ? { m: 'rust', dd: 0 } : 0) });
  F.add({ X, mat: P.clasp || m, prof: 'bevel', bw: 1.6, grp: 'clasp', shapes: [X.poly([[40, 9], [50, 13], [47.6, 19.4], [37.6, 15.2]])] });
  F.add({ X, mat: P.clasp || m, prof: 'round', bw: 1.2, grp: 'knuckles', shapes: [X.circ(41, 11, 2.4), X.circ(47.2, 13.8, 2.4)] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .8, grp: 'runes', noShadow: true, shapes: [0, 1, 2, 3, 4].map(k => { const a = Math.PI * (.62 + k * .19); return X.circ(32 + Math.cos(a) * 21.1, 32 + Math.sin(a) * 19.2, .95); }) });
  if (P.glow) F.add({ X, mat: P.glow, prof: 'flat', grp: 'hinge', noShadow: true, shapes: [X.cap(40.4, 13.6, 46.4, 16.2, .7)] });
}
function ringR(F, X, P) {
  if (P.style === 'key') return keyRingR(F, X, P);
  if (P.style === 'signet') return signetR(F, X, P);
  if (P.style === 'keyring') return keyringR(F, X, P);
  if (P.style === 'pearl') return pearlRingR(F, X, P);
  F.add({ X, mat: P.metal, prof: 'round', bw: 4, grp: 'ring', shapes: [X.ell(32, 38, 21, 17)], cuts: [X.ell(32, 39, 13.5, 10)], tex: P.tex });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(16, 44, 19, 49, .7), X.cap(23, 52, 27, 53.5, .7), X.cap(37, 53.5, 41, 52, .7), X.cap(45, 49, 48, 44, .7)] });
  if (P.gem) { F.add({ X, mat: P.metal, prof: 'round', bw: 4, grp: 'set', shapes: [X.circ(32, 20, 9)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 5, grp: 'set', noShadow: true, shapes: [X.circ(32, 20, 6)] }); }
}
function beadsR(F, X, P) {
  const S = []; for (let k = 0; k < 11; k++) { const a = Math.PI * (.1 + .8 * k / 10); S.push(X.circ(32 - Math.cos(a) * 22, 14 + Math.sin(a) * 26, 3.6)); }
  F.add({ X, mat: P.mat, prof: 'round', bw: 3.6, grp: 'beads', shapes: S });
  F.add({ X, mat: P.gem, prof: 'round', bw: 5, grp: 'charm', shapes: [X.poly([[32, 36], [40, 46], [32, 60], [24, 46]])] });
}

/* ==== weapons added for the battle layer ==== */
function daggerR(F, X, P) {
  const g0 = P.gripEnd ?? 11, t0 = g0 + (P.guardT ?? 3), L = P.bladeL ?? 34, bw = P.bladeW ?? 4, cur = P.curve || 0, shape = P.shape || 'straight';
  const cs = u => cur * u * u;
  let pts;
  if (shape === 'knife') { const sp = bw * .55; pts = [[t0 - 1, -sp], [t0 + L * .7, -sp], [t0 + L, -sp * .1], [t0 + L * .86, bw * .55], [t0 + L * .55, bw * .98], [t0 + L * .18, bw], [t0 - 1, bw * .85]]; }
  else {
    const hw = shape === 'fang' ? u => bw * Math.pow(1 - u, .8) * (1 + .25 * Math.sin(u * Math.PI))
      : shape === 'leaf' ? u => bw * (u < .5 ? .8 + .4 * Math.sin(u / .5 * Math.PI / 2) : 1.2 * Math.pow((1 - u) / .5, .85))
        : u => bw * (u < .76 ? 1 - u * .14 : .893 * (1 - u) / .24);
    pts = ribbon(u => [t0 - 1 + L * u, cs(u)], hw, 18);
  }
  const bt = P.bladeTex, ridge = shape === 'straight' || shape === 'leaf';
  F.add({
    X, mat: P.blade || 'steel', prof: P.bladeProf || (shape === 'fang' ? 'round' : 'ridge'), bw: shape === 'fang' ? bw * .9 : 1.5, hs: .8, grp: 'blade', shapes: [X.poly(pts)], cuts: (P.notches || []).map(([t, s, r]) => X.circ(t, s, r)),
    tex: q => {
      const r = bt ? bt(q) : 0, u = (q.u - t0 + 1) / L;
      if (ridge && u > 0 && u < .92 && Math.abs(q.v - cs(u)) * q.k < .6) return typeof r === 'object' ? Object.assign({}, r, { dd: (r.dd || 0) + 1 }) : r + 1.5;
      if (shape === 'knife' && q.v > bw * .45 && q.v < bw * .62 && u < .85) return typeof r === 'object' ? r : r - 1;
      if (shape === 'fang' && ((q.u * .9 + q.v * .4) % 3.2) < .8 && u < .8) return typeof r === 'object' ? r : r - 1;
      return r;
    },
  });
  if (P.fuller) F.add({ X, mat: P.fuller, prof: 'round', bw: 1, grp: 'blade', noShadow: true, shapes: [X.cap(t0 + 2, cs(.05), t0 + L * .62, cs(.62), .95, .6)] });
  if (P.vein) F.add({ X, mat: P.vein, prof: 'round', bw: .8, grp: 'blade', noShadow: true, detail: true, shapes: chain(X, [0, .2, .4, .6, .78].map(u => [t0 + L * u, cs(u) + Math.sin(u * 9) * .8]), [.8, .75, .65, .55, .45]) });
  if (P.tally) {
    const S = [], sp = bw * .55;
    for (let k = 0; k < 4; k++) S.push(X.cap(t0 + 3.5 + k * 2.6, -sp * .5, t0 + 3.5 + k * 2.6, bw * .5, .75));
    S.push(X.cap(t0 + 2.2, bw * .45, t0 + 13.2, -sp * .45, .7));
    if (L > 30) for (let k = 0; k < 2; k++) S.push(X.cap(t0 + 18 + k * 2.6, -sp * .4, t0 + 18 + k * 2.6, bw * .4, .75));
    F.add({ X, mat: P.tally, prof: 'round', bw: .6, grp: 'tally', noShadow: true, detail: true, shapes: S });
  }
  const gw = P.guardW ?? 6.5, gt = P.guardT ?? 3, gm = P.guardMat || 'iron';
  if (P.guard === 'thorn') {
    F.add({ X, mat: gm, prof: 'round', bw: 1.6, grp: 'guard', shapes: [X.cap(g0 + gt / 2, -2.8, g0 + gt / 2, 2.8, 2.3)] });
    F.add({ X, mat: P.thornMat || 'thorn', prof: 'ridge', hs: .9, grp: 'guardthorn', shapes: thornShapes(X, [[g0 + 1, -2.5, -.3, -1, gw, 1.3], [g0 + 1, 2.5, -.3, 1, gw, 1.3], [g0 + 2.4, -3, .8, -1, gw * .8, 1.1], [g0 + 2.4, 3, .8, 1, gw * .8, 1.1]]) });
  } else if (P.guard === 'quillon') {
    F.add({ X, mat: gm, prof: 'round', bw: 1.6, grp: 'guard', shapes: [X.cap(g0 + gt / 2, 0, g0 + gt / 2 + 2.5, -gw, 1.5, 1), X.cap(g0 + gt / 2, 0, g0 + gt / 2 + 2.5, gw, 1.5, 1), X.circ(g0 + gt / 2 + 2.6, -gw - .3, 1.6), X.circ(g0 + gt / 2 + 2.6, gw + .3, 1.6), X.circ(g0 + gt / 2, 0, 2.4)] });
  } else if (P.guard === 'coin') {
    F.add({ X, mat: gm, prof: 'bevel', bw: 1.4, grp: 'guard', shapes: [X.ell(g0 + gt / 2, 0, 1.8, gw * .75)] });
  } else if (P.guard !== 'none') {
    F.add({ X, mat: gm, prof: 'round', bw: P.guardR ?? 1.5, grp: 'guard', shapes: [X.cap(g0 + gt / 2, -gw, g0 + gt / 2, gw, P.guardR ?? 1.6)], tex: P.guardTex });
  }
  if (P.guardGem) F.add({ X, mat: P.guardGem, prof: 'round', bw: 1.5, grp: 'guardgem', noShadow: true, shapes: [X.circ(g0 + gt / 2, 0, 1.6)] });
  const pr = P.pommelR ?? 2.6;
  F.add({ X, mat: P.grip || 'leather', prof: 'round', bw: P.gripR ?? 1.9, grp: 'grip', shapes: [X.cap(pr * 1.3, 0, g0 + .5, 0, P.gripR ?? 1.9)], tex: P.gripTex || TX.wrap(2.2) });
  if (P.pommelShape === 'coin') F.add({ X, mat: P.pommel || 'gold', prof: 'bevel', bw: 1.2, grp: 'pommel', shapes: [X.ell(pr * .9, 0, pr * .9, pr * 1.6)], tex: ({ x, y }) => (hash(x, y, 5) < .15 ? -1 : 0) });
  else if (P.pommelShape === 'knot') F.add({ X, mat: P.pommel || 'bark', prof: 'round', bw: pr, grp: 'pommel', shapes: [X.circ(pr, 0, pr), X.circ(pr * 1.6, -pr * .6, pr * .6), X.circ(pr * .5, pr * .7, pr * .55)] });
  else if (P.pommel !== 'none') F.add({ X, mat: P.pommel || 'iron', prof: 'round', bw: pr, grp: 'pommel', shapes: [X.circ(pr, 0, pr)], tex: P.pommelTex });
  if (P.pommelGem) F.add({ X, mat: P.pommelGem, prof: 'round', bw: 1.5, grp: 'pommel', noShadow: true, detail: true, shapes: [X.circ(pr, 0, pr * .55)] });
}
function axeR(F, X, P) {
  if (P.pick) return pickAxeR(F, X, P);
  const hc = P.headT ?? 48, r = P.haftR ?? 2.2, bl = P.bladeLo ?? 13, bh = P.bladeHi ?? 9, bw = P.bladeW ?? 18, bul = P.bulge ?? 3.2, top = P.haftTop ?? hc + 4.5;
  F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'haft', shapes: [X.cap(2.5, 0, top, 0, r, r * .85)], tex: P.haftTex || TX.grain(5) });
  if (P.wrap) F.add({ X, mat: P.wrap, prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(5.5, 0, P.wrapEnd ?? 17, 0, r + .45)], tex: TX.wrap(2.2) });
  for (const t of P.bands || []) band(F, X, t, r, P.bandMat || 'iron');
  F.add({ X, mat: P.pommel || P.bandMat || 'iron', prof: 'round', bw: 2, grp: 'pommel', shapes: [X.cap(1.2, 0, 4.2, 0, r + .7)] });
  if (P.vine) {
    const pts = []; for (let t = 7; t <= hc - 5; t += 2.2) pts.push([t, Math.sin(t * .55) * (r + .6)]);
    const th = []; for (let k = 2; k < pts.length - 1; k += 3) th.push([pts[k][0], pts[k][1], .4, Math.sign(pts[k][1]) || 1, 3.4, .8]);
    F.add({ X, mat: P.vine, prof: 'round', bw: .9, grp: 'vine', shapes: chain(X, pts, .95) });
    F.add({ X, mat: P.thorn || 'thorn', prof: 'ridge', hs: .9, grp: 'vinethorn', detail: true, shapes: thornShapes(X, th) });
  }
  const edge = []; for (let k = 0; k <= 12; k++) { const u = k / 12; edge.push([hc + bh - (bh + bl) * u, -bw - bul * Math.sin(Math.PI * u)]); }
  const bld = [[hc - 4.2, -2.4], [hc + 4.2, -2.4], [hc + 3.4, -5.4], [hc + bh * .42, -bw * .6], [hc + bh * .82, -bw * .86]].concat(edge, [[hc - bl * .8, -bw * .8], [hc - bl * .5, -bw * .55], [hc - bl * .28, -bw * .42], [hc - 3.6, -5.6]]);
  const bt = P.bladeTex;
  F.add({
    X, mat: P.blade || 'steel', prof: 'bevel', bw: 2.2, grp: 'head', shapes: [X.poly(bld)], cuts: P.hole ? [X.circ(hc + .5, -bw * .55, P.hole)] : null,
    tex: q => {
      const uu = (hc + bh - q.u) / (bh + bl), r0 = bt ? bt(q) : 0;
      if (uu > -.05 && uu < 1.05) { const es = -bw - bul * Math.sin(Math.PI * Math.min(1, Math.max(0, uu))); const dd = (q.v - es) * q.k; if (dd < 2) return P.edge ? { m: P.edge, dd: dd < 1 ? 1 : 0 } : (typeof r0 === 'object' ? r0 : r0 + 1.5); }
      return r0;
    },
  });
  if (P.back === 'spike') F.add({ X, mat: P.blade || 'steel', prof: 'ridge', hs: .9, grp: 'back', shapes: [X.poly([[hc - 3.2, 2.4], [hc + 3.2, 2.4], [hc + 1, 2.4 + (P.spikeL ?? 9)]])] });
  else if (P.back === 'poll') F.add({ X, mat: P.blade || 'steel', prof: 'bevel', bw: 1.5, grp: 'back', shapes: [X.poly([[hc - 3.6, 2], [hc + 3.6, 2], [hc + 3.9, 6.6], [hc - 3.9, 6.6]])] });
  else if (P.back === 'double') { const e2 = edge.map(([t, s]) => [t, -s * .8]); F.add({ X, mat: P.blade || 'steel', prof: 'bevel', bw: 2.2, grp: 'back', shapes: [X.poly([[hc - 4.4, 2.6], [hc + 4.4, 2.6], [hc + 5, 5]].concat(e2, [[hc - 5, 5]]))] }); }
  F.add({ X, mat: P.socket || P.blade || 'steel', prof: 'round', bw: 2.4, grp: 'socket', shapes: [X.cap(hc - 5, 0, hc + 5, 0, 3.4)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'socket', noShadow: true, shapes: [X.circ(hc, 0, 2)] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(hc - 2.5, -bw * .5, hc + 2.5, -bw * .5, .7), X.cap(hc, -bw * .62, hc, -bw * .36, .7), X.cap(hc - 3.5, -bw * .74, hc + 2, -bw * .78, .7)] });
  if (P.leaves) F.add({ X, mat: P.leaves, prof: 'round', bw: 1.4, grp: 'leaves', detail: true, shapes: [X.poly([[hc - 6, 2.5], [hc - 10, 7.5], [hc - 9, 11], [hc - 6.5, 6]]), X.poly([[hc - 8, -2.5], [hc - 13, -4], [hc - 15.5, -2], [hc - 11, -1]]), X.poly([[top - 1, 1.5], [top + 3, 5], [top + 5.5, 4], [top + 1.5, 1]])] });
}
function maceR(F, X, P) {
  const style = P.style || 'flanged';
  if (style === 'flanged' || style === 'mace') { hammerR(F, X, Object.assign({ headT: 52, headW: 7.5, haft: 'wood', haftR: 2.1, wrap: 'leather', wrapEnd: 16, bands: [], bandMat: 'iron', headMat: 'iron', pommelR: 2.8 }, P, { style: 'mace' })); return; }
  if (style === 'bell') return bellMaceR(F, X, P);
  const hc = P.headT ?? 52, r = P.haftR ?? 2.1, hw = P.headW ?? 7.5;
  F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'haft', shapes: [X.cap(2, 0, hc - 2, 0, r)], tex: TX.grain(4) });
  F.add({ X, mat: P.wrap || 'leather', prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(5.5, 0, P.wrapEnd ?? 16, 0, r + .45)], tex: TX.wrap(2.2) });
  for (const t of P.bands || []) band(F, X, t, r, P.bandMat || 'iron');
  F.add({ X, mat: P.pommelMat || P.headMat || 'iron', prof: 'round', bw: 2.6, grp: 'pommel', shapes: [X.circ(2.6, 0, P.pommelR ?? 2.8)] });
  if (style === 'star') {
    const sp = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; sp.push([hc + Math.cos(a) * hw * .8, Math.sin(a) * hw * .8, Math.cos(a), Math.sin(a), hw * .75, 1.6]); }
    F.add({ X, mat: P.spikeMat || P.headMat || 'iron', prof: 'ridge', hs: .9, grp: 'spikes', shapes: thornShapes(X, sp) });
    F.add({ X, mat: P.headMat || 'iron', prof: 'round', bw: hw, grp: 'head', shapes: [X.circ(hc, 0, hw * .9)], tex: P.headTex });
  } else {
    const kn = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3; kn.push(X.circ(hc + Math.cos(a) * hw * .75, Math.sin(a) * hw * .75, hw * .42)); }
    F.add({ X, mat: P.headMat || 'bronze', prof: 'round', bw: hw * .5, grp: 'knobs', shapes: kn });
    F.add({ X, mat: P.headMat || 'bronze', prof: 'round', bw: hw, grp: 'head', shapes: [X.circ(hc, 0, hw * .82)], tex: P.headTex });
  }
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.5, grp: 'head', noShadow: true, shapes: [X.circ(hc, 0, hw * .36)] });
}
function spearR(F, X, P) {
  const hT = P.headT ?? 62, hL = P.headL ?? 18, hw = P.headW ?? 4.6, r = P.haftR ?? 1.7;
  F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'haft', shapes: [X.cap(3, 0, hT - 3, 0, r)], tex: P.haftTex || TX.grain(7) });
  F.add({ X, mat: P.butt || 'iron', prof: 'round', bw: 1.4, grp: 'butt', shapes: [X.cap(.8, 0, 5, 0, r * .8, r + .5)] });
  if (P.wrap) F.add({ X, mat: P.wrap, prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(P.wrapA ?? 24, 0, P.wrapB ?? 36, 0, r + .45)], tex: TX.wrap(2) });
  for (const t of P.bands || []) band(F, X, t, r, P.bandMat || 'iron', null, .4);
  if (P.ribbon && X.k > .55) {
    const g = X.P(hT - 5.5, 0), k = X.k, S = [];
    for (const [dx, len] of [[-2, 11], [1.5, 14]]) S.push({ k: 'c', a: [g[0], g[1] + 1.5 * k], b: [g[0] + dx * k, g[1] + len * k], ra: 1.1 * k, rb: .7 * k });
    F.add({ mat: P.ribbon, prof: 'round', bw: .8, grp: 'ribbon', detail: true, shapes: S, tex: ({ y }) => (y % 3 === 0 ? -1 : 0) });
  }
  F.add({ X, mat: P.socket || 'iron', prof: 'round', bw: 1.6, grp: 'socket', shapes: [X.poly([[hT - 8, -(r + .3)], [hT, -2.4], [hT + .5, 0], [hT, 2.4], [hT - 8, r + .3]])] });
  if (P.wings) F.add({ X, mat: P.socket || 'iron', prof: 'ridge', hs: .8, grp: 'wings', shapes: [X.poly([[hT - 2.5, -1.5], [hT - 5, -(hw + P.wings)], [hT + 1.2, -2.2]]), X.poly([[hT - 2.5, 1.5], [hT - 5, hw + P.wings], [hT + 1.2, 2.2]])] });
  const hd = [[hT - .5, -1.8], [hT + hL * .28, -hw], [hT + hL * .62, -hw * .72], [hT + hL, 0], [hT + hL * .62, hw * .72], [hT + hL * .28, hw], [hT - .5, 1.8]];
  const bt = P.headTex;
  F.add({ X, mat: P.head || 'steel', prof: 'ridge', hs: .8, grp: 'head', shapes: [X.poly(hd)], tex: q => { const r0 = bt ? bt(q) : 0; if (Math.abs(q.v) * q.k < .6 && q.u < hT + hL * .9) return typeof r0 === 'object' ? Object.assign({}, r0, { dd: (r0.dd || 0) + 1 }) : r0 + 1.5; return r0; } });
  if (P.fuller) F.add({ X, mat: P.fuller, prof: 'round', bw: 1, grp: 'head', noShadow: true, shapes: [X.cap(hT + 1.5, 0, hT + hL * .66, 0, 1, .55)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.5, grp: 'socket', noShadow: true, shapes: [X.circ(hT - 4, 0, 1.9)] });
}
function staffR(F, X, P) {
  const hT = P.headT ?? 64, r = P.haftR ?? 2, style = P.style || 'crook', wob = P.wobble ?? (style === 'gnarl' ? 1 : 0);
  const pts = []; for (let t = 2; t <= hT; t += 4) pts.push([t, wob * Math.sin(t * .23 + 1)]);
  F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'haft', shapes: chain(X, pts, pts.map((_, k) => r * (1 - k / pts.length * .15))), tex: P.haftTex || TX.grain(9) });
  F.add({ X, mat: P.foot || 'bronze', prof: 'round', bw: 1.4, grp: 'foot', shapes: [X.cap(.8, 0, 4.2, 0, r * .8, r + .4)] });
  if (P.wrap) F.add({ X, mat: P.wrap, prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(P.wrapA ?? 30, wob * Math.sin(30 * .23 + 1), P.wrapB ?? 40, wob * Math.sin(40 * .23 + 1), r + .45)], tex: TX.wrap(2) });
  for (const t of P.bands || []) band(F, X, t, r, P.bandMat || 'bronze', null, .4);
  const hs = wob * Math.sin(hT * .23 + 1);
  if (style === 'crook') {
    const cl = u => { const a = Math.PI * 1.25 * u; return [hT + Math.sin(a) * 7, hs - 7 + Math.cos(a) * 7]; };
    F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'crook', shapes: chain(X, Array.from({ length: 11 }, (_, k) => cl(k / 10)), Array.from({ length: 11 }, (_, k) => r * (1 - k / 10 * .3))), tex: TX.grain(3) });
    if (P.gem) { const [t, s] = cl(.55); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'crookgem', noShadow: true, shapes: [X.circ(t - 6.5, s + 1.5, 2.6)] }); F.add({ X, mat: P.chainMat || 'gold', prof: 'round', bw: .8, grp: 'crookgem2', shapes: [X.cap(t - 1, s + .4, t - 5, s + 1.4, .6)] }); }
  } else if (style === 'orb' || style === 'sun') {
    const oc = hT + 8;
    if (style === 'sun') { const S = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; S.push(X.poly([[oc + Math.cos(a - .2) * 6.5, hs + Math.sin(a - .2) * 6.5], [oc + Math.cos(a) * (k & 1 ? 10 : 12.5), hs + Math.sin(a) * (k & 1 ? 10 : 12.5)], [oc + Math.cos(a + .2) * 6.5, hs + Math.sin(a + .2) * 6.5]])); } F.add({ X, mat: P.metal || 'gold', prof: 'ridge', hs: .8, grp: 'rays', shapes: S }); }
    F.add({ X, mat: P.orb || P.gem || 'sapphire', prof: 'round', bw: 4, grp: 'orb', shapes: [X.circ(oc, hs, 5.6)] });
    F.add({ X, mat: P.metal || 'bronze', prof: 'round', bw: 1.2, grp: 'prongs', shapes: [X.cap(hT - 1, hs, oc - 1, hs - 6.4, 1.3, .9), X.cap(hT - 1, hs, oc - 1, hs + 6.4, 1.3, .9), X.cap(oc - 1, hs - 6.4, oc + 4, hs - 4.5, .9, .6), X.cap(oc - 1, hs + 6.4, oc + 4, hs + 4.5, .9, .6), X.cap(hT - 3, hs, hT + 1.5, hs, 2.6, 2)] });
  } else if (style === 'rings') {
    const rr = P.ringR || 7.8, oc = hT + rr - .3;
    F.add({ X, mat: P.metal || 'bark', prof: 'round', bw: 2, grp: 'fork', shapes: [X.cap(hT - 2, hs, oc - 3, hs - rr, 1.6, 1), X.cap(hT - 2, hs, oc - 3, hs + rr, 1.6, 1)] });
    const c = X.P(oc, hs);
    F.add({ X, mat: 'wood', prof: 'round', bw: 3, hs: .5, grp: 'slice', shapes: [X.circ(oc, hs, rr)], tex: TX2.rings(c[0], c[1], P.glow, X.k) });
    F.add({ X, mat: 'bark', prof: 'round', bw: 1.2, grp: 'slicerim', shapes: [X.circ(oc, hs, rr)], cuts: [X.circ(oc, hs, rr - 1.4)] });
    if (P.glow) F.add({ X, mat: P.glow, prof: 'round', bw: 1, grp: 'slicecore', noShadow: true, shapes: [X.circ(oc, hs, 1.6)] });
    if (P.leaves) F.add({ X, mat: P.leaves, prof: 'round', bw: 1.3, grp: 'leaves', detail: true, shapes: [X.poly([[hT - 4, hs - 1.5], [hT - 7, hs - 7], [hT - 4.5, hs - 9], [hT - 2.6, hs - 4]]), X.poly([[hT - 6, hs + 1.5], [hT - 11, hs + 5], [hT - 12, hs + 2.5], [hT - 8, hs + .8]])] });
  } else if (style === 'song') {
    songHeadR(F, X, P, hT, hs, r, wob);
  } else if (style === 'rune') {
    runeHeadR(F, X, P, hT, hs, r);
  } else if (style === 'crozier') {
    crozierHeadR(F, X, P, hT, hs, r);
  } else { // gnarl: twisted root cradle with a crystal
    const oc = hT + 8;
    F.add({ X, mat: P.crystal || P.gem || 'emerald', prof: 'ridge', hs: .9, grp: 'crystal', shapes: [X.poly([[oc - 5, hs], [oc, hs - 3.6], [oc + 7, hs], [oc, hs + 3.6]])] });
    F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: 1.4, grp: 'roots', shapes: chain(X, [[hT - 2, hs], [hT + 2, hs - 4], [oc + 1, hs - 5.5], [oc + 5, hs - 3]], [1.8, 1.5, 1.1, .7]).concat(chain(X, [[hT - 2, hs], [hT + 3, hs + 4.5], [oc + 2, hs + 5], [oc + 5.5, hs + 2]], [1.8, 1.5, 1.1, .7]), chain(X, [[hT - 1, hs], [hT + 3.5, hs + .5], [oc - 3, hs]], [1.6, 1.2, .8])), tex: TX.grain(2) });
    if (P.leaves) F.add({ X, mat: P.leaves, prof: 'round', bw: 1.3, grp: 'leaves', detail: true, shapes: [X.poly([[hT + 1, hs - 4], [hT - 2, hs - 9.5], [hT + 1.5, hs - 11], [hT + 3, hs - 6]])] });
  }
}
/* off-hand focus (card view), centred in the 64 box */
function focusR(F, X, P) {
  const style = P.style || 'sigil', m = P.metal || 'gold';
  if (style === 'orb') {
    F.add({ X, mat: P.metal2 || 'wood', prof: 'round', bw: 3, grp: 'handle', shapes: [X.cap(32, 60, 32, 44, 3.2, 3.8)], tex: TX.wrap(2.4) });
    F.add({ X, mat: P.gem || 'sapphire', prof: 'round', bw: 10, grp: 'orb', shapes: [X.circ(32, 26, 15)] });
    const S = []; for (const s of [-1, 1]) { S.push(X.cap(32, 44, 32 + s * 11, 38, 2.4, 2), X.cap(32 + s * 11, 38, 32 + s * 15.5, 26, 2, 1.5), X.cap(32 + s * 15.5, 26, 32 + s * 12, 16, 1.5, .9)); }
    S.push(X.cap(32, 44, 32, 40, 3.4, 3));
    F.add({ X, mat: m, prof: 'round', bw: 2, grp: 'cradle', shapes: S });
    if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(25, 26, 29, 22, .8), X.cap(35, 30, 39, 26, .8), X.cap(28, 33, 34, 34, .8)] });
  } else if (style === 'tome') {
    F.add({ X, mat: 'parchment', prof: 'bevel', bw: 2, grp: 'pages', shapes: [X.poly([[15, 15], [51, 11], [53, 51], [17, 55]])], tex: ({ x, y }) => ((x + y) % 2 === 0 && x > 47 ? -1 : 0) });
    F.add({ X, mat: P.cover || 'leatherRed', prof: 'round', bw: 5, hs: .6, grp: 'cover', shapes: [X.poly([[11, 13], [47, 9], [49, 50], [13, 54]])] });
    F.add({ X, mat: m, prof: 'round', bw: 1.5, grp: 'corners', shapes: [X.poly([[11, 13], [18, 12.2], [11.6, 20]]), X.poly([[47, 9], [40, 9.8], [47.4, 16.5]]), X.poly([[49, 50], [42, 50.8], [48.6, 43]]), X.poly([[13, 54], [20, 53.2], [12.6, 47]])] });
    F.add({ X, mat: m, prof: 'round', bw: 2, grp: 'medal', shapes: [X.circ(30, 31.5, 8)] });
    F.add({ X, mat: P.gem || 'ruby', prof: 'round', bw: 3, grp: 'medal', noShadow: true, shapes: [X.circ(30, 31.5, 5)] });
    F.add({ X, mat: m, prof: 'round', bw: 1.2, grp: 'clasp', shapes: [X.poly([[47.5, 27], [55, 26.2], [55.3, 33], [47.8, 33.8]])] });
  } else if (style === 'rings') {
    F.add({ X, mat: P.cord || 'string', prof: 'flat', grp: 'cord', shapes: [X.cap(32, 4, 25, 14, .9), X.cap(32, 4, 39, 14, .9)] });
    F.add({ X, mat: P.wood || 'wood', prof: 'round', bw: 6, hs: .45, grp: 'slice', shapes: [X.ell(32, 36, 22, 21)], tex: TX2.rings(32, 36, P.glow) });
    F.add({ X, mat: 'bark', prof: 'round', bw: 2.4, grp: 'rim', shapes: [X.ell(32, 36, 22, 21)], cuts: [X.ell(32, 36, 19, 18)], tex: ({ x, y }) => ((x * 3 + y) % 4 === 0 ? -1 : 0) });
    if (P.glow) F.add({ X, mat: P.glow, prof: 'round', bw: .8, grp: 'crack', noShadow: true, detail: true, shapes: chain(X, [[32, 36], [36, 31], [38, 25], [43, 21]], [1, .9, .7, .5]) });
    if (P.moss) F.add({ X, mat: P.moss, prof: 'round', bw: 2, grp: 'moss', detail: true, shapes: [X.ell(15, 44, 5, 3.5), X.ell(20, 52, 4, 3), X.ell(46, 51, 3.5, 2.6)] });
  } else if (style === 'lantern') {
    lanternR(F, X, P);
  } else if (style === 'censer') {
    censerR(F, X, P);
  } else { // sigil / seal on a chain
    F.add({ X, mat: P.chain || m, prof: 'round', bw: 1.4, grp: 'chain', shapes: chain(X, [[32, 3], [30.5, 7], [32, 11]], 1.1) });
    const S = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; S.push(X.poly([[32 + Math.cos(a - .28) * 16, 36 + Math.sin(a - .28) * 16], [32 + Math.cos(a) * 24, 36 + Math.sin(a) * 24], [32 + Math.cos(a + .28) * 16, 36 + Math.sin(a + .28) * 16]])); }
    F.add({ X, mat: m, prof: 'ridge', hs: .8, grp: 'points', shapes: S });
    F.add({ X, mat: m, prof: 'round', bw: 8, grp: 'disc', shapes: [X.circ(32, 36, 17)], tex: ({ x, y }) => { const d = Math.hypot(x - 32, y - 36); return d > 12.5 && d < 13.8 ? -1.5 : 0; } });
    F.add({ X, mat: m, prof: 'round', bw: 2, grp: 'loop', shapes: [X.circ(32, 16.5, 3.2)], cuts: [X.circ(32, 16.5, 1.6)] });
    F.add({ X, mat: P.gem || 'ember', prof: 'round', bw: 5, grp: 'disc', noShadow: true, shapes: [X.circ(32, 36, 9)] });
    if (P.runes) { const R = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; R.push(X.cap(32 + Math.cos(a) * 11.2, 36 + Math.sin(a) * 11.2, 32 + Math.cos(a + .3) * 11.2, 36 + Math.sin(a + .3) * 11.2, .7)); } F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: R }); }
  }
}
/* ==== body armour variants (front view, 64 box) ==== */
function robeR(F, X, P) {
  if (P.cowl) F.add({ X, mat: P.cowl, prof: 'round', bw: 5, grp: 'cowl', shapes: [X.ell(32, 10, 15, 7.5)] });
  const sh = [[20, 8], [44, 8], [51, 12], [56, 26], [59, 40], [51.5, 42.5], [48, 30], [47.5, 38], [52, 61], [32, 63], [12, 61], [16.5, 38], [16, 30], [12.5, 42.5], [5, 40], [8, 26], [13, 12]];
  F.add({ X, mat: P.mat, prof: 'round', bw: 7, hs: .7, grp: 'body', shapes: [X.poly(sh)], cuts: [X.ell(32, 7, 7.5, 6)], tex: P.tex || TX2.folds(4) });
  if (P.sleeve) F.add({ X, mat: P.sleeve, prof: 'round', bw: 3, grp: 'sleeves', shapes: [X.poly([[5, 40], [12.5, 42.5], [13.5, 36], [7, 34]]), X.poly([[59, 40], [51.5, 42.5], [50.5, 36], [57, 34]])] });
  if (P.trim) {
    F.add({ X, mat: P.trim, prof: 'round', bw: 1.5, grp: 'collar', shapes: [X.cap(24.5, 8.5, 32, 17, 1.6), X.cap(32, 17, 39.5, 8.5, 1.6), X.cap(32, 17, 32, 62, 1.5)] });
    F.add({ X, mat: P.trim, prof: 'round', bw: 1.5, grp: 'hem', shapes: [X.cap(12.5, 60.4, 32, 62.2, 1.6), X.cap(32, 62.2, 51.5, 60.4, 1.6), X.cap(5.5, 39.8, 12.5, 42, 1.4), X.cap(51.5, 42, 58.5, 39.8, 1.4)] });
  }
  if (P.sash) { F.add({ X, mat: P.sash, prof: 'round', bw: 2, grp: 'sash', shapes: [X.cap(17, 33.5, 47, 33.5, 2.3), X.cap(36.5, 34.5, 39.5, 46, 1.6, 1.2), X.cap(39, 34.5, 43.5, 44, 1.5, 1.1)] }); }
  if (P.glyph) F.add({ X, mat: P.glyph, prof: 'round', bw: .8, grp: 'glyph', noShadow: true, detail: true, shapes: P.glyphShape === 'tree' ? chain(X, [[26, 52], [26, 42], [23, 38]], .8).concat(chain(X, [[26, 44], [29.5, 39]], .8), chain(X, [[26, 52], [23, 55]], .7), chain(X, [[26, 52], [29, 55]], .7)) : [X.circ(25, 24, 2.6), X.cap(25, 19.5, 25, 17.5, .7), X.cap(25, 28.5, 25, 30.5, .7), X.cap(20.5, 24, 18.5, 24, .7), X.cap(29.5, 24, 31, 24, .7)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'clasp', noShadow: true, shapes: [X.circ(32, 17.5, 2.6)] });
}
function leatherR(F, X, P) {
  if (P.style === 'feathers') return featherCloakR(F, X, P);
  if (P.style === 'mantle') return hideMantleR(F, X, P);
  if (P.shirt) F.add({ X, mat: P.shirt, prof: 'round', bw: 4, grp: 'shirt', shapes: [X.cap(16, 16, 9, 35, 5, 4.2), X.cap(48, 16, 55, 35, 5, 4.2)], tex: TX2.folds(6) });
  const sh = [[21, 9.5], [43, 9.5], [49, 12.5], [51, 21], [47, 26], [46.5, 40], [49, 53], [32, 56.5], [15, 53], [17.5, 40], [17, 26], [13, 21], [15, 12.5]];
  F.add({ X, mat: P.mat, prof: 'round', bw: 7, hs: .7, grp: 'body', shapes: [X.poly(sh)], cuts: [X.ell(32, 8.5, 7, 6.5)], tex: P.tex || (({ x, y }) => (x === 32 || x === 31 ? -1.5 : ((x === 23 || x === 41) && (y & 1) ? -1 : 0))) });
  if (P.laces !== false) F.add({ X, mat: P.laceMat || 'string', prof: 'round', bw: .7, grp: 'laces', detail: true, shapes: [16, 20, 24, 28].map(y => X.cap(29.4, y, 34.6, y + 3, .6)).concat([16, 20, 24, 28].map(y => X.cap(34.6, y, 29.4, y + 3, .6))) });
  if (P.studs) { const S = []; for (let y = 16; y < 38; y += 5) for (const x of [21, 25, 39, 43]) S.push(X.circ(x + ((y / 5) & 1), y, 1.1)); F.add({ X, mat: P.studs, prof: 'round', bw: 1, grp: 'studs', noShadow: true, detail: true, shapes: S }); }
  if (P.pauldrons) for (const g of [-1, 1]) F.add({ X, mat: P.pauldrons, prof: 'round', bw: 3, grp: 'pd' + g, shapes: [X.ell(32 + g * 16.5, 15, 6.5, 5), X.ell(32 + g * 17.5, 19.5, 5.2, 3.6)], tex: P.pdTex });
  if (P.trim) F.add({ X, mat: P.trim, prof: 'round', bw: 1.4, grp: 'trim', shapes: [X.cap(24.5, 10, 29, 15, 1.5), X.cap(39.5, 10, 35, 15, 1.5), X.cap(15.5, 52.5, 32, 56, 1.5), X.cap(32, 56, 48.5, 52.5, 1.5)], tex: P.trimTex });
  if (P.vine) F.add({ X, mat: P.vine, prof: 'round', bw: 1, grp: 'vine', detail: true, shapes: chain(X, [[18, 50], [22, 44], [20, 36], [23, 28], [21, 20]], .9).concat(thornShapes(X, [[21.5, 44, -1, -.2, 3, .8], [21, 33, 1, -.4, 3, .8], [22.5, 25, -1, -.4, 3, .8]])) });
  F.add({ X, mat: P.belt || 'leather', prof: 'round', bw: 2, grp: 'belt', shapes: [X.cap(17.3, 40, 46.7, 40, 2.3)] });
  F.add({ X, mat: P.buckle || 'bronze', prof: 'bevel', bw: 1, grp: 'buckle', detail: true, shapes: [P.leaf ? X.poly([[32, 36.5], [35.5, 40], [32, 43.5], [28.5, 40]]) : X.poly([[29.4, 37.6], [34.6, 37.6], [34.6, 42.4], [29.4, 42.4]])] });
  if (P.pouch) F.add({ X, mat: P.pouch, prof: 'round', bw: 2.5, grp: 'pouch', shapes: [X.poly([[37.5, 41.5], [45, 41.5], [44.5, 49], [38, 49]])] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.5, grp: 'buckle', noShadow: true, shapes: [X.circ(32, 40, 1.9)] });
}
/* plate style 'carapace': a cuirass of overlapping glass lames like a scorpion's back, light glowing in the seams,
   pincer-curved pauldrons, over sleeves of charred hide */
function carapaceR(F, X, P) {
  const m = P.mat || 'sandglass', seam = P.seam || 'amber', un = P.under || 'char';
  F.add({ X, mat: un, prof: 'round', bw: 3, grp: 'arms', shapes: [X.cap(13, 22, 9.5, 42, 4.2, 3.6), X.cap(51, 22, 54.5, 42, 4.2, 3.6)], tex: scaleTex(3, 6) });
  for (const g of [-1, 1]) F.add({ X, mat: m, prof: 'round', bw: 2.5, grp: 'vam' + g, shapes: [X.cap(32 + g * 22.8, 34, 32 + g * 23.2, 45, 3.8, 3.4)] });
  const lame = k => { const y = 13 + k * 6.6, w = 16 - k * .9, w2 = 15.2 - k * 1.1, sag = 2.2 + k * .3; return [[32 - w, y], [32 - w * .5, y - 1.2], [32 + w * .5, y - 1.2], [32 + w, y], [32 + w2, y + 6.4], [32 + w2 * .5, y + 6.4 + sag * .7], [32, y + 6.4 + sag], [32 - w2 * .5, y + 6.4 + sag * .7], [32 - w2, y + 6.4]]; };
  F.add({ X, mat: seam, prof: 'flat', grp: 'seams', noShadow: true, shapes: [X.poly([[17, 14], [47, 14], [45, 50], [19, 50]])] });
  for (let k = 4; k >= 0; k--) F.add({ X, mat: m, prof: 'round', bw: 3.2, hs: .8, grp: 'lame' + k, shapes: [X.poly(lame(k))], tex: ({ x, y }) => (vnoise(x * .3, y * .3, 11 + k) > .7 ? -1 : hash(x, y, k) < .04 ? 1 : 0) });
  F.add({ X, mat: m, prof: 'ridge', hs: .9, grp: 'keel', shapes: [X.poly([[31, 12], [33, 12], [33.4, 46], [32, 49], [30.6, 46]])] });
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'gorget', shapes: [X.ell(32, 10.5, 11, 5)], cuts: [X.ell(32, 7.6, 6.5, 4)] });
  for (const g of [-1, 1]) {
    F.add({ X, mat: m, prof: 'round', bw: 4, grp: 'pd' + g, shapes: [X.poly([[32 + g * 9, 13], [32 + g * 17, 9], [32 + g * 25, 12], [32 + g * 28, 19], [32 + g * 25, 24], [32 + g * 16, 22]])] });
    F.add({ X, mat: m, prof: 'ridge', hs: .9, grp: 'pdspike' + g, shapes: thornShapes(X, [[32 + g * 22, 10.5, g * .5, -1, 5, 1.6], [32 + g * 26.5, 15, g, -.5, 4.2, 1.4]]) });
    if (P.trim) F.add({ X, mat: P.trim, prof: 'round', bw: 1, grp: 'pdt' + g, shapes: [X.cap(32 + g * 11, 21, 32 + g * 24.5, 23.2, 1.1)] });
  }
  F.add({ X, mat: seam, prof: 'round', bw: .8, grp: 'glow', noShadow: true, detail: true, shapes: [X.circ(32, 30, 1), X.circ(32, 36.6, .9), X.circ(32, 43.2, .8)] });
  if (P.gem) { F.add({ X, mat: P.trim || 'brass', prof: 'round', bw: 2, grp: 'gemset', shapes: [X.circ(32, 22, 3.8)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gemset', noShadow: true, shapes: [X.circ(32, 22, 2.5)] }); }
}
function plateR(F, X, P) {
  if (P.style === 'carapace') return carapaceR(F, X, P);
  const m = P.mat || 'steel', tr = P.trim;
  F.add({ X, mat: P.under || 'iron', prof: 'round', bw: 3, grp: 'arms', shapes: [X.cap(13, 22, 9.5, 42, 4.2, 3.6), X.cap(51, 22, 54.5, 42, 4.2, 3.6)], tex: mailTex });
  for (const g of [-1, 1]) F.add({ X, mat: m, prof: 'round', bw: 2.5, grp: 'vam' + g, shapes: [X.cap(32 + g * 22.8, 34, 32 + g * 23.2, 45, 3.8, 3.4)] });
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'gorget', shapes: [X.ell(32, 11, 11, 5.5)], cuts: [X.ell(32, 8, 6.5, 4)] });
  const faulds = []; for (let k = 0; k < 3; k++) { const y = 43 + k * 4.6, w = 13.5 + k * 1.8; faulds.push(X.poly([[32 - w, y], [32 + w, y], [32 + w + .8, y + 5], [32 - w - .8, y + 5]])); }
  faulds.forEach((f, k) => F.add({ X, mat: m, prof: 'round', bw: 2, grp: 'fauld' + k, shapes: [f] }));
  F.add({ X, mat: m, prof: 'round', bw: 10, hs: .8, grp: 'cuirass', shapes: [X.poly([[19, 12.5], [45, 12.5], [49.5, 21], [47.5, 36], [44, 45], [20, 45], [16.5, 36], [14.5, 21]])], tex: ({ x, y }) => (x === 32 && y < 42 ? 1.5 : x === 33 && y < 42 ? -1 : 0) });
  if (tr) F.add({ X, mat: tr, prof: 'round', bw: 1.4, grp: 'ptrim', shapes: [X.cap(19.5, 13, 44.5, 13, 1.4), X.cap(20, 44.2, 44, 44.2, 1.4)] });
  for (const g of [-1, 1]) {
    F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'lame' + g, shapes: [X.ell(32 + g * 18.5, 24.5, 7, 3.6)] });
    F.add({ X, mat: m, prof: 'round', bw: 4.5, grp: 'pd' + g, shapes: [X.ell(32 + g * 17.5, 17.5, 9.5, 7)], tex: P.pdTex });
    if (tr) F.add({ X, mat: tr, prof: 'round', bw: 1.2, grp: 'pdt' + g, shapes: [X.cap(32 + g * 9.5, 22.5, 32 + g * 26, 20, 1.3)] });
  }
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(24, 22, 28, 30, .7), X.cap(40, 22, 36, 30, .7), X.cap(26, 36, 38, 36, .7)] });
  if (P.gem) { F.add({ X, mat: tr || 'gold', prof: 'round', bw: 2, grp: 'gemset', shapes: [X.circ(32, 26, 4)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gemset', noShadow: true, shapes: [X.circ(32, 26, 2.7)] }); }
}
/* crown styles: 'bells' (the prototype crown), 'thorn' (woven bramble), 'regal' (procedural) */
function thornCrownR(F, X, P) {
  const bm = P.mat || 'bramble', tm = P.thorn || 'thorn';
  const ring = (y0, amp, ph, r, seed) => { const S = []; for (let k = 0; k < 16; k++) { const a = k / 16, b = (k + 1) / 16; const x1 = 8 + 48 * a, x2 = 8 + 48 * b; const c1 = 4 * (1 - Math.pow((x1 - 32) / 26, 2)), c2 = 4 * (1 - Math.pow((x2 - 32) / 26, 2)); S.push(X.cap(x1, y0 + c1 + Math.sin(a * 14 + ph) * amp, x2, y0 + c2 + Math.sin(b * 14 + ph) * amp, r, r)); } return S; };
  F.add({ X, mat: 'dark', prof: 'round', bw: 3, grp: 'inner', tex: () => -1, shapes: [X.ell(32, 38, 22, 6)] });
  const spikes = [[12, 36, -.5, -1, 11, 2.3], [20, 32, -.2, -1, 15, 2.6], [32, 31, 0, -1, 21, 3.2], [44, 32, .2, -1, 15, 2.6], [52, 36, .5, -1, 11, 2.3], [16, 39, -1, -.5, 8, 1.8], [48, 39, 1, -.5, 8, 1.8], [26, 34, -.35, -1, 9, 1.7], [38, 34, .35, -1, 9, 1.7]];
  F.add({ X, mat: tm, prof: 'ridge', hs: .9, grp: 'spikes', shapes: thornShapes(X, spikes), tex: ({ x, y }) => (vnoise(x * .4, y * .4, 6) > .7 ? { m: bm } : 0) });
  F.add({ X, mat: bm, prof: 'round', bw: 2.6, grp: 'vineA', shapes: ring(38, 1.8, 0, 2.6), tex: ({ x, y }) => ((x * 2 + y) % 5 === 0 ? -1 : 0) });
  F.add({ X, mat: P.mat2 || 'bark', prof: 'round', bw: 2, grp: 'vineB', shapes: ring(40, 2.2, 2.2, 2) });
  const small = []; for (let k = 0; k < 11; k++) { const x = 10 + k * 4.4, y = 42 + 4 * (1 - Math.pow((x - 32) / 26, 2)); small.push([x, y + 1.5, (k & 1 ? .6 : -.6), .8, 4.2, 1]); }
  F.add({ X, mat: tm, prof: 'ridge', hs: .9, grp: 'small', detail: true, shapes: thornShapes(X, small) });
  if (P.buds) F.add({ X, mat: P.buds, prof: 'round', bw: 2, grp: 'buds', noShadow: true, shapes: [X.circ(22, 41.5, 2.4), X.circ(32, 43.5, 3.1), X.circ(42, 41.5, 2.4)] });
  if (P.berries) F.add({ X, mat: P.berries, prof: 'round', bw: 1.4, grp: 'berries', noShadow: true, detail: true, shapes: [X.circ(15, 45, 1.6), X.circ(17.5, 46.5, 1.3), X.circ(49, 45.5, 1.6)] });
  if (P.leaves) F.add({ X, mat: P.leaves, prof: 'round', bw: 1.5, grp: 'leaves', detail: true, shapes: [X.poly([[26, 42], [21, 49], [23, 53], [27, 47]]), X.poly([[38, 42], [44, 48], [43, 52], [37, 46]])] });
}
function regalCrownR(F, X, P) {
  const m = P.metal || 'gold', n = P.tines ?? 5;
  const cy = u => 4 * (1 - Math.pow((u - 32) / 22, 2));
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'inner', tex: () => -2, shapes: [X.ell(32, 36.5, 21, 6.2)] });
  const S = []; for (let k = 0; k < n; k++) { const x = 12 + 40 * k / (n - 1), mid = Math.abs(k - (n - 1) / 2), top = 10 + mid * 6 + (P.tall ? -3 : 0), w = 7 - mid * .6; S.push(X.poly([[x - w / 2, 40], [x - w / 2, top + 8], [x, top], [x + w / 2, top + 8], [x + w / 2, 40]])); }
  F.add({ X, mat: m, prof: 'bevel', bw: 1.7, grp: 'tines', shapes: S, tex: P.tex });
  if (P.pearls) { const G = []; for (let k = 0; k < n; k++) { const x = 12 + 40 * k / (n - 1), mid = Math.abs(k - (n - 1) / 2), top = 10 + mid * 6 + (P.tall ? -3 : 0); G.push(X.circ(x, top - .5, 1.8)); } F.add({ X, mat: P.pearls, prof: 'round', bw: 1.6, grp: 'pearls', noShadow: true, detail: true, shapes: G }); }
  const top = [], bot = []; for (let k = 0; k <= 12; k++) { const x = 10 + 44 * k / 12; top.push([x, 36 + cy(x)]); bot.push([x, 45 + cy(x)]); }
  F.add({ X, mat: m, prof: 'round', bw: 3.2, grp: 'band', shapes: [X.poly(top.concat(bot.reverse()))], tex: P.tex });
  for (const [x, r] of [[20, 1.8], [32, 2.6], [44, 1.8]]) F.add({ X, mat: x === 32 ? (P.gem || 'ruby') : (P.gem2 || P.gem || 'ruby'), prof: 'round', bw: 1.8, grp: 'bg' + x, noShadow: true, shapes: [X.circ(x, 40.6 + cy(x), r)] });
  if (P.glow) F.add({ X, mat: P.glow, prof: 'round', bw: .7, grp: 'glowline', noShadow: true, detail: true, shapes: [X.cap(24, 40.6 + cy(24), 28, 40.6 + cy(28), .6), X.cap(36, 40.6 + cy(36), 40, 40.6 + cy(40), .6)] });
  // M4 (the Cinder Crown): a live coal on every tine and coals set in the band
  if (P.embers) {
    const E = []; for (let k = 0; k < n; k++) { const x = 12 + 40 * k / (n - 1), mid = Math.abs(k - (n - 1) / 2), top = 10 + mid * 6 + (P.tall ? -3 : 0); E.push(X.circ(x, top + 2.2, 1.9 - mid * .12)); }
    for (const x of [15, 26, 38, 49]) E.push(X.circ(x, 40.6 + cy(x), 1.3));
    F.add({ X, mat: P.embers, prof: 'round', bw: 1.4, grp: 'embers', noShadow: true, shapes: E });
  }
}

/* ==== M3 relic parts: new styles and details inside the existing recipes ====
   Each part is reached only through a new param or style, so older art renders exactly as before. */
// an ellipse that follows the recipe axis (X.ell stays aligned to the canvas); rot tilts it in recipe space
const rell = (X, t, s, rt, rs, n = 24, rot = 0) => X.poly(Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2, c = Math.cos(a) * rt, d = Math.sin(a) * rs; return [t + c * Math.cos(rot) - d * Math.sin(rot), s + c * Math.sin(rot) + d * Math.cos(rot)]; }));
const FINGERS = [[20, 22, 18, 7, 4], [28, 22, 28, 4, 4], [36, 22, 38, 6, 4], [44, 25, 49, 13, 3.6], [15, 36, 7, 27, 4.2]];
const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/* sword guard 'oath': forward-swept quillons with knobbed ends, and a diamond ecusson holding the gem */
function oathGuard(F, X, P, g0) {
  const gt = P.guardT, gw = P.guardW ?? 10, m = P.guardMat, gc = g0 + gt / 2;
  const q = g => chain(X, [[gc, 0], [gc - .3, g * gw * .36], [gc + .3, g * gw * .7], [gc + 2, g * gw * .93], [gc + 4.2, g * gw * 1.02]], [2.1, 1.85, 1.55, 1.3, 1.05]);
  F.add({ X, mat: m, prof: 'round', bw: 1.7, grp: 'guard', shapes: q(-1).concat(q(1)), tex: P.guardTex });
  F.add({ X, mat: m, prof: 'round', bw: 1.6, grp: 'guardends', shapes: [X.circ(gc + 4.9, -gw * 1.04, 1.8), X.circ(gc + 4.9, gw * 1.04, 1.8)] });
  F.add({ X, mat: m, prof: 'bevel', bw: 1.3, grp: 'ecusson', shapes: [X.poly([[g0 - 1.8, 0], [gc, -3.4], [g0 + gt + 5, 0], [gc, 3.4]])] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'ecusson', noShadow: true, shapes: [X.circ(gc + .5, 0, 1.9)] });
}
/* a cloth ribbon knotted on the guard, hanging toward the ground (canvas space) */
function swordRibbon(F, X, P, g0) {
  if (X.k <= .55) return;
  const k = X.k, g = X.P(g0 + P.guardT / 2 + .4, (P.guardW ?? 10) * .28), S = [];
  // each tail: a wavy band blown toward the lower right, ending in a swallowtail notch
  for (const [ex, ey, w, ph] of [[8.5, 9.5, 1.5, 0], [12.5, 3.6, 1.3, 1.7]]) {
    const pts = []; for (let j = 0; j <= 5; j++) { const u = j / 5; pts.push([g[0] + ex * u * k + Math.sin(u * 5 + ph) * .9 * k, g[1] + ey * u * k + Math.cos(u * 4 + ph) * .7 * k]); }
    for (let j = 0; j < 5; j++) S.push({ k: 'c', a: pts[j], b: pts[j + 1], ra: w * (1 - j * .06) * k, rb: w * (1 - (j + 1) * .06) * k });
    const e = pts[5], d = [pts[5][0] - pts[4][0], pts[5][1] - pts[4][1]], l = Math.hypot(d[0], d[1]) || 1, nx = -d[1] / l, ny = d[0] / l;
    S.push({ k: 'p', pts: [[e[0] + nx * w * k, e[1] + ny * w * k], [e[0] + d[0] / l * 2.2 * k + nx * w * 1.2 * k, e[1] + d[1] / l * 2.2 * k + ny * w * 1.2 * k], [e[0] + d[0] / l * .6 * k, e[1] + d[1] / l * .6 * k], [e[0] + d[0] / l * 2.2 * k - nx * w * 1.2 * k, e[1] + d[1] / l * 2.2 * k - ny * w * 1.2 * k], [e[0] - nx * w * k, e[1] - ny * w * k]] });
  }
  F.add({ mat: P.ribbon, prof: 'round', bw: .9, grp: 'ribbon', shapes: S, tex: ({ x, y }) => ((x + y * 2) % 5 === 0 ? -1 : 0) });
  F.add({ mat: P.ribbon, prof: 'round', bw: 1.2, grp: 'ribbonknot', shapes: [{ k: 'e', c: [g[0], g[1]], rx: 2.2 * k, ry: 1.7 * k }] });
}
/* bow limbs of antler: curved tines on the back of each limb, and a knobbed burr by the grip */
function antlerTines(F, X, P, B, al, rr) {
  const S = [];
  for (const [u, len] of P.tines || [[.09, 6], [.21, 8.5], [.79, 8.5], [.91, 6]]) {
    const th = -al + 2 * al * u, o = [Math.sin(th), -Math.cos(th)], g = u < .5 ? -1 : 1, tg = [g * Math.cos(th), g * Math.sin(th)];
    const d1 = unit([o[0] + tg[0] * .5, o[1] + tg[1] * .5]), d2 = unit([o[0] * .35 + tg[0], o[1] * .35 + tg[1]]);
    const p = B(u), a = [p[0] + o[0] * rr(u) * .5, p[1] + o[1] * rr(u) * .5], b = [a[0] + d1[0] * len * .55, a[1] + d1[1] * len * .55], c = [b[0] + d2[0] * len * .5, b[1] + d2[1] * len * .5];
    S.push(...chain(X, [a, b, c], [1.6, 1.1, .45]));
  }
  F.add({ X, mat: P.antler, prof: 'round', bw: 1.3, grp: 'tines', shapes: S, tex: P.limbTex });
  const K = [];
  for (const u of [.36, .64]) { const p = B(u), th = -al + 2 * al * u, o = [Math.sin(th), -Math.cos(th)], w = rr(u); K.push(X.circ(p[0] + o[0] * (w + .3), p[1] + o[1] * (w + .3), 1.25), X.circ(p[0] - o[0] * (w + .1), p[1] - o[1] * (w + .1), 1.05), X.circ(p[0], p[1], w + .7)); }
  F.add({ X, mat: P.antler, prof: 'round', bw: 1, grp: 'burr', shapes: K, tex: ({ x, y }) => (hash(x, y, 13) < .35 ? -1 : 0) });
}
/* kettle-hat weathervane: a rod with an arrow, sparking when weather comes */
function vaneR(F, X, P) {
  const v = P.vane;
  F.add({ X, mat: v, prof: 'round', bw: 1, grp: 'vanerod', shapes: [X.cap(32, 16, 32, 3.8, 1.2, .8), X.circ(32, 3, 1.6)] });
  F.add({ X, mat: v, prof: 'round', bw: .9, grp: 'vane', shapes: [X.cap(21.5, 8.5, 41, 8.5, .8), X.poly([[40, 5.6], [46.8, 8.5], [40, 11.4]]), X.poly([[19.6, 5.8], [24.6, 8.5], [19.6, 11.2], [17.2, 11.2], [21, 8.5], [17.2, 5.8]])] });
  if (P.spark) F.add({ X, mat: P.spark, prof: 'flat', grp: 'vanespark', noShadow: true, noOutline: true, detail: true, shapes: chain(X, [[48.5, 2.5], [50.6, 5.2], [48.9, 6.4], [51.6, 10]], .5).concat(chain(X, [[35.5, 1], [37.2, 2.6], [36.2, 3.4], [37.8, 5]], .42)) });
}
/* helm style 'mask': a smith's face-mask with eye holes, a breathing grille, the maker's stamp,
   ichor weeping from the eyes and bark growing through its edges */
function maskR(F, X, P) {
  const m = P.mat || 'blackiron', tr = P.trim || 'bronze';
  if (P.strap) F.add({ X, mat: P.strap, prof: 'round', bw: 1.6, grp: 'strap', shapes: [X.cap(12.5, 25, 4, 21.5, 2.2, 1.8), X.cap(51.5, 25, 60, 21.5, 2.2, 1.8), X.cap(14, 45, 5.5, 49, 2, 1.6), X.cap(50, 45, 58.5, 49, 2, 1.6)] });
  F.add({ X, mat: 'dark', prof: 'flat', grp: 'in', shapes: [X.poly([[16, 25.5], [48, 25.5], [47, 35], [17, 35]]), X.poly([[24, 43.5], [40, 43.5], [39, 53.5], [25, 53.5]])] });
  const face = [[19, 8], [45, 8], [51.5, 15], [53.5, 27], [52, 38], [47.5, 48], [40.5, 56], [32, 59.5], [23.5, 56], [16.5, 48], [12, 38], [10.5, 27], [12.5, 15]];
  const eye = g => X.poly([[32 + g * 3.8, 30], [32 + g * 6.5, 27.2], [32 + g * 11.5, 27], [32 + g * 14.4, 29.6], [32 + g * 11.2, 32.6], [32 + g * 6.4, 32.6]]);
  const slots = [45.2, 48.4, 51.6].map((y, k) => X.poly([[26 + k * 1.2, y - .75], [38 - k * 1.2, y - .75], [38 - k * 1.2, y + .75], [26 + k * 1.2, y + .75]]));
  F.add({ X, mat: m, prof: 'round', bw: 10, hs: .75, grp: 'face', shapes: [X.poly(face)], cuts: [eye(-1), eye(1)].concat(slots), tex: P.tex });
  F.add({ X, mat: m, prof: 'round', bw: 1.8, grp: 'brow', shapes: [X.cap(14.5, 24.6, 29, 26.2, 2.1, 1.6), X.cap(35, 26.2, 49.5, 24.6, 1.6, 2.1)], tex: P.tex });
  F.add({ X, mat: m, prof: 'ridge', hs: .9, grp: 'nose', shapes: [X.poly([[30.3, 24.2], [33.7, 24.2], [35.5, 39.5], [32, 42.2], [28.5, 39.5]])] });
  F.add({ X, mat: tr, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: [[17, 14.5], [47, 14.5], [12.6, 30.5], [51.4, 30.5], [15.8, 44], [48.2, 44], [26.5, 55.5], [37.5, 55.5]].map(([x, y]) => X.circ(x, y, 1.15)) });
  if (P.stamp) {
    const S = [], cx = 32, cy = 16.4, R = 3.6;
    for (let k = 0; k < 9; k++) { const a = -.35 + k / 9 * Math.PI * 1.62, b = -.35 + (k + 1) / 9 * Math.PI * 1.62; S.push(X.cap(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(b) * R, cy + Math.sin(b) * R, .55)); }
    S.push(X.cap(cx - 1.4, cy + 1.8, cx + 1.1, cy - 1.2, .45), X.cap(cx - .2, cy - 2.4, cx + 2.4, cy, .75));
    F.add({ X, mat: P.stamp, prof: 'round', bw: .6, grp: 'stamp', noShadow: true, detail: true, shapes: S });
  }
  if (P.eyes) F.add({ X, mat: P.eyes, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [X.ell(22.8, 29.9, 2.3, 1.3), X.ell(41.2, 29.9, 2.3, 1.3)] });
  if (P.ichor) F.add({ X, mat: P.ichor, prof: 'round', bw: 1, grp: 'ichor', shapes: [X.cap(21.2, 32.4, 20.6, 40.5, .85, 1.15), X.circ(20.5, 42, 1.5), X.cap(42.9, 32.4, 43.4, 37, .75, 1), X.circ(43.5, 38.4, 1.25), X.cap(19.8, 44, 19.9, 45.6, .5, .7)] });
  if (P.bark) {
    F.add({ X, mat: P.bark, prof: 'round', bw: 2, grp: 'barkpatch', shapes: [X.poly([[10.8, 33], [15, 31], [18.5, 36.5], [18.4, 43], [15.6, 47.5], [12.4, 42]]), X.poly([[46.5, 49], [51.5, 42.5], [52.8, 47]])], tex: TX2.cracks(21, 'rotwood', .09) });
    F.add({ X, mat: P.bark, prof: 'round', bw: 1.4, grp: 'roots', shapes: chain(X, [[13.2, 21], [9.6, 16.4], [9.4, 11.2], [12.4, 7.6], [16.6, 6.8], [19.6, 8.6]], [1.7, 1.45, 1.2, .95, .7, .45]).concat(chain(X, [[49.4, 46.6], [53.8, 49.6], [55.4, 54.4], [52.6, 57.8], [48.6, 57.6]], [1.6, 1.3, 1, .7, .45]), chain(X, [[9.6, 16.4], [5.6, 16.8], [3.6, 20.4]], [1, .75, .45]), chain(X, [[53.8, 49.6], [58, 47.8], [60.2, 44.4]], [.9, .65, .4])), tex: TX.grain(6) });
  }
}
function glovesExtra(F, X, P, cut) {
  if (P.tips && P.fray) {
    const S = [];
    for (const [a, b, c, d, r] of FINGERS) { const ex = a + (c - a) * cut, ey = b + (d - b) * cut, l = Math.hypot(c - a, d - b), nx = -(d - b) / l, ny = (c - a) / l; S.push(X.cap(ex - nx * r * .9, ey - ny * r * .9, ex + nx * r * .9, ey + ny * r * .9, .95)); }
    F.add({ X, mat: P.fray, prof: 'round', bw: .9, grp: 'fray', detail: true, shapes: S });
  }
  if (P.knuckles) {
    const K = [[20.2, 23.8, 4.3], [28.1, 23, 4.3], [36.1, 23.4, 4.3], [43.7, 26, 3.7]];
    F.add({ X, mat: P.knuckles, prof: 'round', bw: 2.2, grp: 'knuckles', shapes: K.map(([x, y, r]) => X.ell(x, y, r, r * .74)) });
    if (P.engrave) {
      const S = [];
      K.forEach(([x, y], i) => { const n = 2 + (i % 3); for (let j = 0; j < n; j++) S.push(X.cap(x - 1.7 + j * 1.15, y - 1.4, x - 1.7 + j * 1.15, y + 1.2, .42)); if (n >= 4 || i === 1) S.push(X.cap(x - 2.3, y + 1, x + 1.9, y - 1.2, .4)); });
      F.add({ X, mat: P.engrave, prof: 'flat', grp: 'engrave', noShadow: true, noOutline: true, detail: true, shapes: S });
    }
  }
  if (P.bolt) F.add({ X, mat: P.bolt, prof: 'round', bw: 1, grp: 'bolt', noShadow: true, shapes: [X.poly([[34.5, 27.5], [26.2, 36.6], [30.8, 36.8], [27, 45], [36.6, 33.6], [31.8, 33.4], [37.4, 27.5]])] });
  if (P.sigil) {
    const S = [];
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3 + Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      S.push(X.cap(30 - c * 6, 34 - s * 6, 30 + c * 6, 34 + s * 6, .55));
      for (const f of [-1, 1]) { const px0 = 30 + c * 3.8 * f, py0 = 34 + s * 3.8 * f; for (const g of [-1, 1]) { const b = a + (f < 0 ? Math.PI : 0) + g * .85; S.push(X.cap(px0, py0, px0 + Math.cos(b) * 1.9, py0 + Math.sin(b) * 1.9, .4)); } }
    }
    F.add({ X, mat: P.sigil, prof: 'flat', grp: 'sigil', noShadow: true, detail: true, shapes: S });
  }
  if (P.cuffBand) F.add({ X, mat: P.cuffBand, prof: 'round', bw: 1.4, grp: 'cuffband', shapes: [P.flare ? X.cap(10.4, 60, 49.6, 60, 1.9) : X.cap(18.6, 58.6, 41.4, 58.6, 1.7)] });
  if (P.cuffGem) { F.add({ X, mat: P.cuffSet || P.trim || 'gold', prof: 'round', bw: 2, grp: 'cuffgem', shapes: [X.circ(30, 52, 3.7)] }); F.add({ X, mat: P.cuffGem, prof: 'round', bw: 2, grp: 'cuffgem', noShadow: true, shapes: [X.circ(30, 52, 2.4)] }); }
  if (P.coin) {
    const [cx, cy] = P.coinAt || [24, 15], [rt, rs, rot] = P.coinR || [3.3, 4.3, -.3];
    F.add({ X, mat: P.coin, prof: 'bevel', bw: 1.1, grp: 'coin', shapes: [rell(X, cx, cy, rt, rs, 20, rot)], tex: ({ u, v }) => { const d = Math.hypot((u - cx) / rt, (v - cy) / rs); return d > .58 && d < .76 ? -1 : d < .22 ? 1 : 0; } });
  }
}
/* amulet style 'seed': a living seed hanging point-down in a gold filigree cage, split by a green seam,
   a sprout curling from its tip */
function seedAmuletR(F, X, P) {
  const cord = g => chain(X, [[32 - g * 20, .5], [32 - g * 17.4, 7.5], [32 - g * 12.4, 13.6], [32 - g * 6.6, 17.6], [32 - g * 1.6, 19.2]], [1.15, 1.15, 1.1, 1.05, 1]);
  F.add({ X, mat: P.chain || 'bark', prof: 'round', bw: 1.1, grp: 'chain', shapes: cord(1).concat(cord(-1)), tex: ({ x, y }) => ((x + y * 2) % 4 === 0 ? -1 : (x + y * 2) % 4 === 2 ? 1 : 0) });
  // the pendant is authored around (32, 44) and drawn P.scale times larger
  const S = P.scale || 1, Y = S === 1 ? X : Xf(X.ox + 32 * (1 - S) * X.k, X.oy + 44 * (1 - S) * X.k, 1, 0, X.k * S, X.cap(0, 0, 0, 0, 0).ra);
  const m = P.metal || 'gold', gl = P.glow || 'verdant';
  const sd = [[32, 28.5], [37.6, 30], [41.6, 34.6], [42.8, 41.2], [40.8, 48.4], [36.6, 54.2], [32, 58.8], [27.4, 54.2], [23.2, 48.4], [21.2, 41.2], [22.4, 34.6], [26.4, 30]];
  F.add({ X: Y, mat: P.seed || 'thorn', prof: 'round', bw: 9, hs: .8, grp: 'seed', shapes: [Y.poly(sd)], tex: P.seedTex });
  F.add({ X: Y, mat: gl, prof: 'flat', grp: 'seam', noShadow: true, shapes: chain(Y, [[32.4, 33], [31.2, 38.5], [32.8, 44], [31.6, 49.5], [32.2, 54]], [.5, .8, .85, .7, .45]) });
  if (P.veins) F.add({ X: Y, mat: gl, prof: 'flat', grp: 'veins', noShadow: true, detail: true, shapes: chain(Y, [[31.4, 38], [28.4, 40.5], [26.6, 44]], [.5, .42, .35]).concat(chain(Y, [[32.6, 44.5], [35.8, 46.5], [37.2, 50]], [.5, .42, .35])) });
  F.add({ X: Y, mat: m, prof: 'round', bw: 2, grp: 'bail', shapes: [Y.poly([[27.8, 30.4], [36.2, 30.4], [34.8, 26.4], [29.2, 26.4]]), Y.circ(32, 25.2, 2.7)], cuts: [Y.circ(32, 25.2, 1.1)] });
  const cage = [[[29.4, 30.4], [25, 34.8], [23.2, 41.6], [25, 48.8], [29.4, 55]], [[34.6, 30.4], [39, 34.8], [40.8, 41.6], [39, 48.8], [34.6, 55]], [[21.8, 40.2], [26.4, 42.6], [32, 43.4], [37.6, 42.6], [42.2, 40.2]]];
  F.add({ X: Y, mat: m, prof: 'round', bw: 1, grp: 'cage', shapes: cage.flatMap(c => chain(Y, c, .95)) });
  F.add({ X: Y, mat: m, prof: 'round', bw: 1, grp: 'cageleaf', detail: true, shapes: [rell(Y, 22.6, 38.4, 1.1, 2.1, 12, .5), rell(Y, 41.4, 38.4, 1.1, 2.1, 12, -.5), rell(Y, 25.8, 51.8, 1, 1.9, 12, -.6), rell(Y, 38.2, 51.8, 1, 1.9, 12, .6)] });
  if (P.gem) F.add({ X: Y, mat: P.gem, prof: 'round', bw: 1.2, grp: 'cagegem', noShadow: true, shapes: [Y.circ(32, 43.4, 1.7)] });
  F.add({ X: Y, mat: P.stem || 'moss', prof: 'round', bw: .9, grp: 'stem', shapes: chain(Y, [[32, 57], [34.6, 58.7], [38.4, 58.3], [41.4, 55.7], [42.6, 52.4]], [.9, .85, .75, .6, .45]) });
  F.add({ X: Y, mat: P.leaf || gl, prof: 'round', bw: 1, grp: 'leaves', shapes: [rell(Y, 44.2, 50.4, 1.25, 2.9, 14, .75), rell(Y, 41.1, 49.8, 1, 2.3, 14, -.3)], tex: P.leafTex });
  if (P.bud) F.add({ X: Y, mat: P.bud, prof: 'round', bw: 1, grp: 'bud', noShadow: true, shapes: [Y.circ(42.9, 52.3, 1.05)] });
}
/* ring style 'pearl': a great pearl held in four webbed toes, on a band wrapped with reeds, dripping */
function pearlRingR(F, X, P) {
  const m = P.metal || 'bronze', [pcx, pcy] = [32, 21.5], pr = P.pearlR || 10.5;
  F.add({ X, mat: m, prof: 'round', bw: 4, grp: 'ring', shapes: [X.ell(32, 43.5, 19.5, 14.5)], cuts: [X.ell(32, 44.6, 12.8, 9.2)], tex: P.tex });
  if (P.reeds) {
    const S = [];
    for (let k = 0; k < 8; k++) { const a = Math.PI * (.12 + .76 * k / 7), x = 32 - Math.cos(a) * 16.2, y = 43.5 + Math.sin(a) * 11.9; S.push(X.cap(x - 1.5, y - 2.7, x + 1.5, y + 2.7, .7)); }
    F.add({ X, mat: P.reeds, prof: 'round', bw: .8, grp: 'reeds', detail: true, shapes: S });
  }
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'seat', shapes: [X.poly([[23.5, 32.6], [40.5, 32.6], [37, 27.5], [27, 27.5]])], tex: P.tex });
  const sheen = P.sheen ? ({ u, v }) => { const dx = (u - pcx) / pr, dy = (v - pcy) / pr, r2 = dx * dx + dy * dy; return dx * .6 + dy * .8 > .5 && r2 > .45 ? { m: P.sheen, dd: 0 } : dx * .6 + dy * .8 < -.62 && r2 > .5 ? { m: P.blush || 'pearl', dd: 0 } : 0; } : null;
  F.add({ X, mat: P.gem || 'pearl', prof: 'round', bw: pr * .95, grp: 'pearl', shapes: [X.circ(pcx, pcy, pr)], tex: sheen });
  if (P.toes) {
    const toe = (a0, a1, rad) => { const pts = []; for (let k = 0; k <= 4; k++) { const a = a0 + (a1 - a0) * k / 4; pts.push([pcx + Math.cos(a) * rad, pcy + Math.sin(a) * rad]); } return pts; };
    const T = [toe(2.05, 3.05, pr + .3), toe(1.09, .09, pr + .3), toe(1.8, 2.45, pr * .78), toe(1.34, .69, pr * .78)];
    F.add({ X, mat: P.toes, prof: 'round', bw: 1, grp: 'toes', shapes: T.flatMap(pts => chain(X, pts, [1.45, 1.25, 1.05, .9, .8])) });
    F.add({ X, mat: P.pads || P.toes, prof: 'round', bw: 1.3, grp: 'pads', shapes: T.map(pts => { const e = pts[pts.length - 1]; return X.circ(e[0], e[1], 1.85); }) });
  }
  if (P.drips) F.add({ X, mat: P.drips, prof: 'round', bw: 1, grp: 'drips', noShadow: true, noOutline: true, detail: true, shapes: [X.cap(24.5, 56, 24.5, 57.8, .7, .95), X.circ(40.2, 58.8, .9), X.cap(33, 58.6, 33, 59.8, .5, .75), X.circ(20.6, 61, .75)] });
}
/* mace style 'bell': the haft ends in a handbell whose mouth glows, with a clapper, gold bands and a sun medallion */
function bellMaceR(F, X, P) {
  const bc = P.headT ?? 33, bl = P.bellL ?? 24, br = P.bellR ?? 10.5, r = P.haftR ?? 2.1, bm = P.bell || 'bronze', tr = P.trim || 'gold';
  F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'haft', shapes: [X.cap(2, 0, bc + 1.5, 0, r)], tex: TX.grain(4) });
  if (P.wrap) F.add({ X, mat: P.wrap, prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(5.5, 0, P.wrapEnd ?? 16, 0, r + .45)], tex: TX.wrap(2.2) });
  for (const t of P.bands || []) band(F, X, t, r, P.bandMat || tr);
  F.add({ X, mat: P.pommelMat || tr, prof: 'round', bw: 2.6, grp: 'pommel', shapes: [X.circ(2.6, 0, P.pommelR ?? 2.9)] });
  F.add({ X, mat: bm, prof: 'round', bw: 1.6, grp: 'canon', shapes: [X.cap(bc - 1.5, 0, bc + 2.5, 0, 2.6, 3.1)] });
  const prof = P.bellProf || [[0, 6.4], [.08, 7.8], [.22, 8.1], [.46, 7.9], [.7, 8.7], [.87, 10.5], [1, br]];
  const hw = u => { for (let k = 1; k < prof.length; k++) if (u <= prof[k][0]) { const f = (u - prof[k - 1][0]) / (prof[k][0] - prof[k - 1][0]), e = f * f * (3 - 2 * f); return prof[k - 1][1] + (prof[k][1] - prof[k - 1][1]) * e; } return br; };
  const tAt = u => bc + 2 + (bl - 2) * u, top = [], bot = [];
  for (let k = 0; k <= 18; k++) { const u = k / 18; top.push([tAt(u), -hw(u)]); bot.push([tAt(u), hw(u)]); }
  F.add({ X, mat: bm, prof: 'round', bw: 5, hs: .7, grp: 'bell', shapes: [X.poly(top.concat(bot.reverse())), rell(X, bc + 3, 0, 3.4, hw(0) + .2)], tex: P.bellTex });
  for (const u of P.bellBands || [.2, .8]) { const t = tAt(u), w = hw(u) + .5; F.add({ X, mat: tr, prof: 'round', bw: .9, grp: 'bband' + u, shapes: [X.poly([[t - .9, -w], [t + .9, -w], [t + .9, w], [t - .9, w]])] }); }
  const tm = bc + bl;
  F.add({ X, mat: bm, prof: 'round', bw: 1.6, grp: 'lip', shapes: [rell(X, tm, 0, 2.8, br + .5)], cuts: [rell(X, tm + .6, 0, 1.9, br - 1.4)] });
  F.add({ X, mat: P.glow || 'radiant', prof: 'flat', grp: 'mouth', noShadow: true, shapes: [rell(X, tm + .6, 0, 1.9, br - 1.4)], tex: ({ u, v }) => ({ dd: Math.abs(v) < 3.5 ? 1 : 0 }) });
  F.add({ X, mat: P.clapper || tr, prof: 'round', bw: 2, grp: 'clapper', shapes: [X.cap(tm - 3, .6, tm + .8, 2.4, .6, .6), X.circ(tm + 1.6, 2.8, 2.4)] });
  if (P.sun) {
    const t = tAt(.47), S = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; S.push(X.poly([[t + Math.cos(a - .32) * 2.4, Math.sin(a - .32) * 2.4], [t + Math.cos(a) * 4.8, Math.sin(a) * 4.8], [t + Math.cos(a + .32) * 2.4, Math.sin(a + .32) * 2.4]])); }
    F.add({ X, mat: tr, prof: 'ridge', hs: .8, grp: 'sunrays', detail: true, shapes: S });
    F.add({ X, mat: tr, prof: 'round', bw: 1.6, grp: 'sun', shapes: [X.circ(t, 0, 2.6)] });
    F.add({ X, mat: P.sun, prof: 'round', bw: 1, grp: 'sun', noShadow: true, shapes: [X.circ(t, 0, 1.4)] });
  }
  if (P.silk) F.add({ X, mat: P.silk, prof: 'round', bw: .6, grp: 'silk', noShadow: true, detail: true, shapes: [X.cap(bc - 5.5, -2.8, bc + 1.5, 3.4, .42), X.cap(bc - 3.5, 3, bc + 3, -3.6, .38)] });
}
/* staff style 'song': living rowan with a vine twining up it, flute holes along the haft, and a root
   cradle holding an orb of water; rowan leaves, red berries, and a few black thorns */
function songHeadR(F, X, P, hT, hs, r, wob) {
  const W = t => wob * Math.sin(t * .23 + 1);
  if (P.spiral) {
    const S = [];
    for (let t = 9; t < 30; t += 1) { const a = t * .62, b = (t + 1) * .62; if (Math.cos(a) > -.15) S.push(X.cap(t, W(t) + Math.sin(a) * (r + .15), t + 1, W(t + 1) + Math.sin(b) * (r + .15), .75)); }
    F.add({ X, mat: P.spiral, prof: 'round', bw: .8, grp: 'spiral', shapes: S });
  }
  if (P.holes) {
    if (P.holeRim) F.add({ X, mat: P.holeRim, prof: 'round', bw: .8, grp: 'holerim', noShadow: true, detail: true, shapes: [34, 38.5, 43].map(t => X.circ(t, W(t) - .2, 1.45)) });
    F.add({ X, mat: P.holes, prof: 'flat', grp: 'holes', noShadow: true, noOutline: true, detail: true, shapes: [34, 38.5, 43].map(t => X.circ(t, W(t) - .2, .95)) });
  }
  const oc = hT + 8.6, orR = P.orbR ?? 5.3, rm = P.roots || P.haft || 'wood';
  F.add({ X, mat: P.orb || 'water', prof: 'round', bw: 4, grp: 'orb', shapes: [X.circ(oc, hs, orR)] });
  F.add({ X, mat: rm, prof: 'round', bw: 1.4, grp: 'cradle', tex: TX.grain(2), shapes: chain(X, [[hT - 2.5, hs], [hT + 1.8, hs - 4.2], [oc - 1.8, hs - orR - 1.3], [oc + 3.2, hs - orR - .5], [oc + 6.2, hs - 2.4], [oc + 6.4, hs + .8]], [2.1, 1.8, 1.4, 1.1, .8, .5]).concat(chain(X, [[hT - 2.5, hs], [hT + 2, hs + 4.4], [oc - .8, hs + orR + 1.2], [oc + 3.6, hs + orR - .4], [oc + 5.6, hs + 2.6]], [2.1, 1.7, 1.3, .9, .5]), chain(X, [[hT - 1, hs], [hT + 1.8, hs + .3]], [2, 1.6])) });
  if (P.thorns) F.add({ X, mat: P.thorns, prof: 'ridge', hs: .9, grp: 'thorns', detail: true, shapes: thornShapes(X, [[hT + 1.6, hs - 4.4, -.6, -1, 2.6, .7], [oc + 3.4, hs - orR - .6, .2, -1, 2.4, .6], [hT + 2.2, hs + 4.6, -.5, 1, 2.4, .6], [oc + 3.8, hs + orR - .3, .3, 1, 2.2, .6]]) });
  if (P.leaves) {
    const sprig = (t0, s0, dt, ds, n) => { const S = [], d = unit([dt, ds]), nrm = [-d[1], d[0]]; S.push(X.cap(t0, s0, t0 + d[0] * n * 2.6, s0 + d[1] * n * 2.6, .45)); for (let k = 0; k < n; k++) { const bt = t0 + d[0] * (k + .8) * 2.6, bs = s0 + d[1] * (k + .8) * 2.6; for (const g of [-1, 1]) S.push(rell(X, bt + nrm[0] * g * 2.1 + d[0] * .7, bs + nrm[1] * g * 2.1 + d[1] * .7, 2.4, 1.05, 10, Math.atan2(d[1] + nrm[1] * g * .8, d[0] + nrm[0] * g * .8))); } S.push(rell(X, t0 + d[0] * (n * 2.6 + 1.4), s0 + d[1] * (n * 2.6 + 1.4), 2.3, 1.05, 10, Math.atan2(d[1], d[0]))); return S; };
    F.add({ X, mat: P.leaves, prof: 'round', bw: 1, grp: 'leaves', detail: true, shapes: sprig(hT - 1, hs - 1.4, -.55, -1, 3).concat(sprig(hT + .5, hs + 1.8, -.2, 1, 2)) });
  }
  if (P.berries) F.add({ X, mat: P.berries, prof: 'round', bw: 1, grp: 'berries', noShadow: true, detail: true, shapes: [[hT - 2.6, hs + 5.2], [hT - 1, hs + 6.6], [hT - 3.6, hs + 7], [hT - 2, hs + 8.4], [hT - .2, hs + 8.8], [hT - 4.4, hs + 9]].map(([t, s]) => X.circ(t, s, 1.15)) });
}
/* focus style 'lantern': a hanging iron lantern, glowing panes around a flame, a bronze cap grown with moss */
function lanternR(F, X, P) {
  const m = P.metal || 'bronze', fr = P.frame || 'blackiron', gl = P.glow || 'ember';
  if (P.rays) F.add({ X, mat: P.rays, prof: 'flat', grp: 'rays', noShadow: true, noOutline: true, detail: true, shapes: [-2.5, -1.5, -.5, .5, 1.5, 2.5].map(k => { const a = k * .5, c = Math.sin(a), s = -Math.cos(a) * .35; return X.poly([[32 + c * 12, 33 - s * 12], [32 + c * 25 - s * 1.4, 33 - s * 25 - c * 1.4], [32 + c * 25 + s * 1.4, 33 - s * 25 + c * 1.4]]); }) });
  F.add({ X, mat: m, prof: 'round', bw: 1.6, grp: 'handle', shapes: [X.circ(32, 6.4, 4.6)], cuts: [X.circ(32, 6.4, 2.6)] });
  if (P.stone) { // a caged stone for a flame: dark behind the bars, the stone cut in facets, a white-hot heart
    F.add({ X, mat: 'dark', prof: 'flat', grp: 'glass', shapes: [X.poly([[20.5, 20], [43.5, 20], [45.2, 44.5], [18.8, 44.5]])] });
    const S = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; S.push([32 + Math.cos(a) * 9, 32.8 + Math.sin(a) * 10]); }
    F.add({ X, mat: P.stone, prof: 'ridge', grp: 'flame', noShadow: true, shapes: [X.poly(S)], tex: ({ u, v }) => ({ dd: (Math.floor((Math.atan2(v - 32.8, u - 32) + 4) * 1.27) & 1) + (Math.hypot(u - 32, v - 32.8) < 4 ? 1 : 0) }) });
    if (P.core) F.add({ X, mat: P.core, prof: 'round', bw: 2, grp: 'flame', noShadow: true, shapes: [X.circ(30.8, 31, 2.6)] });
  } else {
    F.add({ X, mat: P.glass || 'amber', prof: 'round', bw: 5, hs: .4, grp: 'glass', noShadow: true, shapes: [X.poly([[20.5, 20], [43.5, 20], [45.2, 44.5], [18.8, 44.5]])], tex: ({ u, v }) => { const d = Math.hypot(u - 32, (v - 34) * .8); return { dd: d < 6.5 ? 1 : d > 11 ? -1.2 : 0 }; } });
    F.add({ X, mat: gl, prof: 'round', bw: 3, grp: 'flame', noShadow: true, shapes: [X.poly([[32, 22.5], [35.8, 30.5], [36, 36], [34.2, 39.6], [32, 40.6], [29.8, 39.6], [28, 36], [28.2, 30.5]])], tex: ({ v }) => ({ dd: v > 33 ? 1 : 0 }) });
    if (P.core) F.add({ X, mat: P.core, prof: 'round', bw: 2, grp: 'flame', noShadow: true, shapes: [X.poly([[32, 29], [33.8, 34], [33.2, 37.6], [32, 38.4], [30.8, 37.6], [30.2, 34]])] });
  }
  F.add({ X, mat: fr, prof: 'round', bw: 1.5, grp: 'posts', shapes: [X.cap(20.4, 19.5, 18.6, 45, 1.8), X.cap(43.6, 19.5, 45.4, 45, 1.8), X.cap(26.4, 19.5, 25.8, 45, 1), X.cap(37.6, 19.5, 38.2, 45, 1)] });
  if (!P.stone) F.add({ X, mat: fr, prof: 'round', bw: 1.1, grp: 'crossbar', shapes: [X.cap(19.6, 32.4, 44.4, 32.4, 1.1)] });
  F.add({ X, mat: m, prof: 'round', bw: 3, grp: 'cap', shapes: [X.poly([[16.4, 21.6], [47.6, 21.6], [43, 15.4], [36, 11.8], [28, 11.8], [21, 15.4]])], tex: P.capTex });
  F.add({ X, mat: m, prof: 'round', bw: 2, grp: 'finial', shapes: [X.cap(32, 12.4, 32, 10, 2.4, 1.7)] });
  F.add({ X, mat: m, prof: 'round', bw: 2.4, grp: 'base', shapes: [X.poly([[16.6, 44.2], [47.4, 44.2], [45, 50.4], [19, 50.4]])], tex: P.capTex });
  F.add({ X, mat: fr, prof: 'round', bw: 1.4, grp: 'foot', shapes: [X.cap(23.5, 52.2, 40.5, 52.2, 1.8), X.cap(28, 52.2, 30, 55.6, 1.2), X.cap(36, 52.2, 34, 55.6, 1.2)] });
  if (P.capGem) F.add({ X, mat: P.capGem, prof: 'round', bw: 1.4, grp: 'capgem', noShadow: true, shapes: [X.circ(32, 17.2, 2)] });
  if (P.moss) F.add({ X, mat: P.moss, prof: 'round', bw: 1.6, grp: 'moss', detail: true, shapes: [X.ell(21, 18.6, 4.2, 2.3), X.ell(42.6, 18.2, 3.2, 1.9), X.ell(19.6, 49.2, 3.2, 1.8), X.ell(45.2, 47.6, 2.2, 1.5)] });
}
/* shield style 'oath': a heater of granite in a bronze rim; the oath carved into a bronze chief, a wreath of
   thorn around the oath-stone, and the sworn names notched down the field */
function oathShieldR(F, X, P) {
  const pts = [[9, 5], [55, 5], [55, 25], [49, 42], [32, 59], [15, 42], [9, 25]], cy = 30;
  F.add({ X, mat: P.face || 'granite', prof: 'round', bw: 12, hs: .5, grp: 'face', shapes: [X.poly(pts)], tex: P.faceTex });
  F.add({ X, mat: P.rim || 'bronze', prof: 'round', bw: 2.2, grp: 'rim', shapes: [X.poly(pts)], cuts: [X.poly(inset(pts, 32, 28, .86))] });
  if (P.chief) F.add({ X, mat: P.chief, prof: 'round', bw: 2, grp: 'chief', shapes: [X.poly([[12.4, 9.2], [51.6, 9.2], [51.6, 16.8], [12.4, 16.8]])] });
  if (P.inscribe) {
    const S = []; let x = 15.2;
    for (let k = 0; x < 49; k++) { const h = hash(k, 1, 5), w = 1.4 + h * 1.6; S.push(X.cap(x, 11.1, x, 14.9, .45)); if (h > .35) S.push(X.cap(x, h > .7 ? 11.1 : 14.9, x + w, 13, .42)); x += w + 1.5; }
    F.add({ X, mat: P.inscribe, prof: 'flat', grp: 'inscribe', noShadow: true, detail: true, shapes: S });
  }
  if (P.notches) {
    const S = [], tally = (x0, y0, n) => { for (let j = 0; j < n; j++) S.push(X.cap(x0 + j * 1.25, y0, x0 + j * 1.25, y0 + 3.4, .38)); if (n === 4) S.push(X.cap(x0 - .7, y0 + 3, x0 + 4.4, y0 + .4, .36)); };
    tally(14.6, 21.6, 4); tally(15.6, 28.2, 4); tally(17.8, 34.8, 3); tally(45.4, 21.6, 4); tally(44.4, 28.2, 4); tally(43.4, 34.8, 2);
    F.add({ X, mat: P.notches, prof: 'flat', grp: 'notches', noShadow: true, noOutline: true, detail: true, shapes: S });
  }
  if (P.wreath) {
    const S = [], T = [];
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, b = (k + 1) / 14 * Math.PI * 2, w = .6 * Math.sin(k * 2.1); S.push(X.cap(32 + Math.cos(a) * (9 + w), cy + Math.sin(a) * (9 + w), 32 + Math.cos(b) * (9 - w), cy + Math.sin(b) * (9 - w), 1.25)); if (k % 2 === 0) T.push([32 + Math.cos(a) * 10, cy + Math.sin(a) * 10, Math.cos(a + .5), Math.sin(a + .5), 3.2, .8]); }
    F.add({ X, mat: P.wreath, prof: 'round', bw: 1.2, grp: 'wreath', shapes: S });
    F.add({ X, mat: P.wreath, prof: 'ridge', hs: .9, grp: 'wreaththorns', detail: true, shapes: thornShapes(X, T) });
  }
  F.add({ X, mat: P.boss || 'bronze', prof: 'round', bw: 3.5, grp: 'boss', shapes: [X.circ(32, cy, 5.2)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 3, grp: 'boss', noShadow: true, shapes: [X.circ(32, cy, 3.4)] });
  if (P.rivets) { const S = pts.map(([x, y]) => { const q = inset([[x, y]], 32, 28, .93)[0]; return X.circ(q[0], q[1], 1.2); }); F.add({ X, mat: P.rivets, prof: 'round', bw: 1, grp: 'rivets', noShadow: true, detail: true, shapes: S }); }
}

/* ==== M5 relic parts (the Ironspire, Codex Page III): new styles and params inside the existing recipes ====
   As in M3 and M4, each part is reached only through a new param or style, so every older item renders as before. */
// the sawyer's ice-saw (sword param `teeth`): raker teeth down the edge of a long straight blade
function sawTeeth(F, X, P, t0, tipS) {
  const bw = P.bladeW, S = [];
  for (let t = t0 + 1.5; t < tipS - 1; t += 3.2) S.push(X.poly([[t, bw * .82], [t + 1.8, bw + 3.1], [t + 2.8, bw * .82]]));
  F.add({ X, mat: P.teethMat || P.blade, prof: 'ridge', hs: .9, grp: 'teeth', shapes: S });
}
// hammer `peen`: the back of the head drawn down to a smith's cross-peen wedge
function peenHead(hc, ht, hw, c) { return [[hc - ht, -hw + c], [hc - ht + c, -hw], [hc + ht - c, -hw], [hc + ht, -hw + c], [hc + ht, hw * .42], [hc + ht * .34, hw + 2.2], [hc - ht * .34, hw + 2.2], [hc - ht, hw * .42]]; }
// hammer `seam` (a line of forge-heat that never cools) and `mark` (the maker's broken ring on the cheek)
function hammerMarks(F, X, P, hc, ht, hw) {
  if (P.seam) F.add({ X, mat: P.seam, prof: 'round', bw: .8, grp: 'seam', noShadow: true, shapes: [X.cap(hc, -hw + 2.6, hc, hw * (P.peen ? .6 : 1) - 2.6, .75, .55)], tex: ({ u, v }) => (Math.sin(v * 1.3 + u) > .6 ? 1 : 0) });
  if (P.mark) {
    const S = [], mc = [hc + .2, -hw * .42], R = Math.min(ht, hw) * .34;
    for (let k = 0; k < 10; k++) { const a = .5 + k / 10 * Math.PI * 1.7, b = .5 + (k + 1) / 10 * Math.PI * 1.7; S.push(X.cap(mc[0] + Math.cos(a) * R, mc[1] + Math.sin(a) * R, mc[0] + Math.cos(b) * R, mc[1] + Math.sin(b) * R, .5)); }
    S.push(X.cap(mc[0] + Math.cos(.2) * (R + 1.3), mc[1] + Math.sin(.2) * (R + 1.3), mc[0] + Math.cos(.25) * (R - 1.1), mc[1] + Math.sin(.25) * (R - 1.1), .45));
    F.add({ X, mat: P.mark, prof: 'flat', grp: 'mark', noShadow: true, detail: true, shapes: S });
  }
}
// shield style 'door': a dwarf door-shield, cut down to carry: iron planks under two strap hinges, runes cut round
// the arch, and the door-ring for a boss
function doorShieldR(F, X, P) {
  const pts = [[12, 61], [12, 14.6], [13.8, 9.4], [18, 5.4], [24.4, 3], [32, 2.2], [39.6, 3], [46, 5.4], [50.2, 9.4], [52, 14.6], [52, 61]];
  const planks = ({ u, v, x, y }) => { const f = (u - 12) % 6.67; if (f < .9) return -1.6; if (f > 5.9) return .8; if (Math.abs(f - 3.4) < .75 && (Math.abs(v - 9.6) < .75 || Math.abs(v - 34) < .75 || Math.abs(v - 57.4) < .75)) return 1.6; return hash(x, y, 7) < .05 ? -1 : vnoise(u * .3, v * .1, 41) > .8 ? -.7 : 0; };
  F.add({ X, mat: P.face || 'blackiron', prof: 'round', bw: 10, hs: .5, grp: 'face', shapes: [X.poly(pts)], tex: P.faceTex || planks });
  F.add({ X, mat: P.rim || 'iron', prof: 'round', bw: 2.2, grp: 'rim', shapes: [X.poly(pts)], cuts: [X.poly(inset(pts, 32, 33, .87))] });
  // strap hinges: a band from the hinge side, splitting into two curled ends; nail-heads along them
  for (const y of [19, 49]) {
    F.add({ X, mat: P.hinge || 'bronze', prof: 'round', bw: 1.2, grp: 'hinge' + y, shapes: [X.poly([[11, y - 2.2], [36, y - 2.2], [39.5, y - 4.4], [42.4, y - 3.6], [40, y], [42.4, y + 3.6], [39.5, y + 4.4], [36, y + 2.2], [11, y + 2.2]])] });
    F.add({ X, mat: P.hinge || 'bronze', prof: 'round', bw: 1.4, grp: 'knuckle' + y, shapes: [X.cap(10.6, y - 3.2, 10.6, y + 3.2, 1.7)] });
    F.add({ X, mat: P.rivets || 'iron', prof: 'round', bw: 1, grp: 'nails' + y, noShadow: true, detail: true, shapes: [16, 22.5, 29].map(x => X.circ(x, y, 1)) });
  }
  if (P.runes) {
    const S = [], rune = (x, y, k) => { S.push(X.cap(x, y - 2, x, y + 2, .6)); if (k & 1) S.push(X.cap(x, y - 2, x + 1.6, y - .4, .55)); else S.push(X.cap(x - 1.5, y + .4, x, y - 1.2, .55)); if (k % 3 === 0) S.push(X.cap(x - 1.3, y + 1.4, x + 1.3, y + 1.4, .5)); };
    [[19.4, 11.2], [24.6, 8], [32, 6.8], [39.4, 8], [44.6, 11.2]].forEach(([x, y], k) => rune(x, y, k));
    F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: S });
  }
  // the door-ring: a round plate and a heavy ring hanging from it
  F.add({ X, mat: P.boss || 'bronze', prof: 'round', bw: 3, grp: 'boss', shapes: [X.circ(32, 33, 5.6)] });
  F.add({ X, mat: P.ringMat || P.boss || 'bronze', prof: 'round', bw: 1.6, grp: 'doorring', shapes: [X.circ(32, 38.6, 5)], cuts: [X.circ(32, 38.6, 3.3)], clip: X.poly([[20, 36.4], [44, 36.4], [44, 50], [20, 50]]) });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2.4, grp: 'boss', noShadow: true, shapes: [X.circ(32, 33, 3)] });
}
// hood `weave`: threads of something that is not wool, a few of them faintly alight
const weaveTex = (m, t0) => q => { const { u, v } = q, a = (u + v * .55) % 4.2, b = (u - v * .55 + 99) % 4.2; if ((a < .45 || b < .45) && vnoise(u * .2, v * .2, 61) > .62) return { m, dd: vnoise(u * .5, v * .5, 62) > .6 ? 0 : -1 }; const r = t0 ? t0(q) : 0; return typeof r === 'object' ? r : r + (a < .9 || b < .9 ? -.6 : 0); };
// hood `spiral`: a listening spiral stitched on the brow
function hoodSpiral(F, X, P) {
  const S = []; let prev = null;
  for (let k = 0; k <= 26; k++) { const a = k * .42, r = .4 + k * .17, p = [32 + Math.cos(a) * r, 15.6 + Math.sin(a) * r * .8]; if (prev) S.push(X.cap(prev[0], prev[1], p[0], p[1], .5)); prev = p; }
  F.add({ X, mat: P.spiral, prof: 'flat', grp: 'spiral', noShadow: true, detail: true, shapes: S });
}
// gloves `veins`: live fire running through the black iron like ore in rock
const veinTex = (m, plate) => ({ x, y, u, v }) => { const n = Math.abs(vnoise(u * .2, v * .2, 57) - .5); if (n < .021) return { m, dd: n < .009 ? 1 : 0 }; return plate && (v < 22 && Math.floor(v) % 5 === 0) ? -1.5 : hash(x, y, 58) < .05 ? -1 : 0; };
// boots `wings` (little wings of feather at the ankle, one sweeping back off the heel, the far one peeking past the
// shin) and `swirl` (a stitched swirl of wind up the shaft)
function bootWing(F, X, P, root, sd, k, g) {
  const S = [], R = [];
  [[.92, 15], [.66, 14.2], [.4, 12.4], [.14, 10.2]].forEach(([a, L], i) => {
    const r0 = [root[0] + sd * i * .3, root[1] + i * 2], d = [sd * Math.cos(a), -Math.sin(a)], n = [-d[1], d[0]], w = (2.8 - i * .25) * k, Lk = L * k, tip = [r0[0] + d[0] * Lk, r0[1] + d[1] * Lk];
    S.push(X.poly([[r0[0] + n[0] * w * .5, r0[1] + n[1] * w * .5], [r0[0] + d[0] * Lk * .55 + n[0] * w * .62, r0[1] + d[1] * Lk * .55 + n[1] * w * .62], tip, [r0[0] + d[0] * Lk * .5 - n[0] * w * .5, r0[1] + d[1] * Lk * .5 - n[1] * w * .5], [r0[0] - n[0] * w * .5, r0[1] - n[1] * w * .5]]));
    R.push(X.cap(r0[0], r0[1], r0[0] + d[0] * Lk * .8, r0[1] + d[1] * Lk * .8, .45, .3));
  });
  F.add({ X, mat: P.wings, prof: 'round', bw: 1.2, grp: g, shapes: S, tex: ({ u, v }) => ((u * sd * .7 + v + 40) % 2.6 < .6 ? -1 : 0) });
  F.add({ X, mat: P.wingRoot || 'silver', prof: 'round', bw: .6, grp: g + 'q', detail: true, shapes: R });
  F.add({ X, mat: P.wingRoot || 'silver', prof: 'round', bw: 1.2, grp: g + 'root', shapes: [X.circ(root[0], root[1] + 2.6, 2.3 * k)] });
}
function bootsExtra(F, X, P) {
  if (P.wings) bootWing(F, X, P, [16.2, 18], -1, 1, 'wingN');
  if (P.swirl) {
    const S = []; let prev = null;
    for (let k = 0; k <= 22; k++) { const a = k * .5, r = 1 + k * .26, p = [29 + Math.cos(a) * r, 27 + Math.sin(a) * r * .85]; if (prev) S.push(X.cap(prev[0], prev[1], p[0], p[1], .55)); prev = p; }
    S.push(X.cap(prev[0], prev[1], 40, 38, .5));
    F.add({ X, mat: P.swirl, prof: 'round', bw: .7, grp: 'swirl', noShadow: true, detail: true, shapes: S });
  }
}
// amulet style 'bell': a hand-bell cast from the metal of the great bell's first crack: raised bands, the crack
// running up from the lip, the clapper under it, a cold light in its mouth
function bellAmuletR(F, X, P) {
  const m = P.metal || 'bronze', tr = P.trim || m, top = 30, lip = 55.5;
  amuChain(F, X, P);
  F.add({ X, mat: tr, prof: 'round', bw: 1.6, grp: 'bail', shapes: [X.circ(32, 25.4, 2.8)], cuts: [X.circ(32, 25.4, 1.2)] });
  const hw = u => 6.2 + 1.8 * Math.sin(u * Math.PI * .5) + Math.pow(u, 3) * 8.6, L = [], R = [];
  for (let k = 0; k <= 16; k++) { const u = k / 16, y = top + (lip - top) * u; L.push([32 - hw(u), y]); R.push([32 + hw(u), y]); }
  const crown = []; for (let k = 0; k <= 8; k++) { const a = Math.PI + k / 8 * Math.PI; crown.push([32 + Math.cos(a) * hw(0), top + Math.sin(a) * 3]); }
  if (P.glow) F.add({ X, mat: P.glow, prof: 'flat', grp: 'mouthglow', noShadow: true, shapes: [X.ell(32, lip + 1.2, hw(1) - 1.6, 2.6)] });
  F.add({ X, mat: P.clapper || tr, prof: 'round', bw: 1.6, grp: 'clapper', shapes: [X.cap(32, lip - 3, 32, lip + 2.6, .8), X.circ(32, lip + 3.2, 2.1)] });
  F.add({ X, mat: m, prof: 'round', bw: 6, hs: .75, grp: 'bell', shapes: [X.poly(crown.concat(R, L.slice().reverse()))], cuts: [X.ell(32, lip + 1.2, hw(1) - 1.6, 2.6)], tex: P.tex });
  F.add({ X, mat: m, prof: 'round', bw: 1.6, grp: 'lip', shapes: [X.ell(32, lip, hw(1) + .5, 2.2)], cuts: [X.ell(32, lip + 1.2, hw(1) - 1.6, 2.6)] });
  for (const u of [.22, .74]) { const y = top + (lip - top) * u, w = hw(u) + .4; F.add({ X, mat: tr, prof: 'round', bw: .9, grp: 'band' + u, shapes: [X.poly([[32 - w, y - .9], [32 + w, y - .9], [32 + w + .2, y + .9], [32 - w - .2, y + .9]])] }); }
  if (P.crack) F.add({ X, mat: P.crack, prof: 'flat', grp: 'crack', noShadow: true, shapes: chain(X, [[37.4, lip - .6], [36.2, 51], [38, 47.2], [35.6, 42.6], [36.8, 38.8], [35.2, 35.4]], [.8, .75, .7, .6, .5, .35]) });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'crowngem', noShadow: true, shapes: [X.circ(32, 36.4, 2)] });
}
// amulet style 'ribs': a heart of forge-coal burning inside a cage of black iron ribs, a tiny anvil for its bail
function ribsAmuletR(F, X, P) {
  const m = P.metal || 'blackiron', cy = 45;
  amuChain(F, X, P);
  F.add({ X, mat: m, prof: 'bevel', bw: 1.2, grp: 'bail', shapes: [X.poly([[21, 22.8], [42.4, 22.8], [42.4, 26.2], [37.8, 26.8], [36, 29.4], [38.6, 31.8], [25.4, 31.8], [28, 29.4], [26.2, 26.8], [23.4, 25.8], [18, 24.4]])] });
  const H = [];
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (.8 + k / 10 * 1.2); H.push([26.4 + Math.cos(a) * 7.4, cy - 4 + Math.sin(a) * 7.4]); }
  for (let k = 0; k <= 10; k++) { const a = Math.PI * (1 + k / 10 * 1.2); H.push([37.6 + Math.cos(a) * 7.4, cy - 4 + Math.sin(a) * 7.4]); }
  H.push([32, cy + 14]);
  const cr = TX2.cracks(71, P.core || 'ember', .05);
  F.add({ X, mat: P.stone || 'ruby', prof: 'ridge', grp: 'heart', shapes: [X.poly(H)], tex: q => cr(q) || ((Math.floor((q.u - q.v * .6 + 40) / 3.4) & 1) ? 0 : 1) });
  if (P.core) F.add({ X, mat: P.core, prof: 'round', bw: 2, grp: 'core', noShadow: true, shapes: [X.circ(32.2, cy - 1.6, 3.4)] });
  // ribs: curving out from a short sternum and round the heart, wide gaps between for the light
  const S = [X.cap(32, 32.4, 32, 37, 1.5, 1.1)];
  for (let k = 0; k < 3; k++) { const y0 = 36.6 + k * 6.6, w = 14.6 - k * 2; for (const g of [-1, 1]) S.push(...chain(X, [[32 + g * 1.4, y0], [32 + g * w * .55, y0 - 1.4], [32 + g * w, y0 + 2.4], [32 + g * w * .92, y0 + 5.8]], [1, .95, .85, .6])); }
  F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'ribs', shapes: S, tex: P.tex });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.2, grp: 'sternum', noShadow: true, shapes: [X.circ(32, 33.4, 1.5)] });
}
// ring style 'key': the Thane's ring-key: a heavy band, the key's bit standing out from its bezel, the Thane's rune
// cut into the bezel and glowing
function keyRingR(F, X, P) {
  const m = P.metal || 'blackiron';
  F.add({ X, mat: m, prof: 'round', bw: 4, grp: 'ring', shapes: [X.ell(32, 43, 18.5, 14.5)], cuts: [X.ell(32, 44.4, 11.6, 8.8)], tex: P.tex });
  // the bit: a flat plate on a stem, notched for the wards
  F.add({ X, mat: m, prof: 'bevel', bw: 1.4, grp: 'stem', shapes: [X.poly([[35.6, 23], [45, 16.4], [47.2, 19.2], [37.8, 25.6]])] });
  F.add({ X, mat: P.bit || m, prof: 'bevel', bw: 1.4, grp: 'bit', shapes: [X.poly([[42.4, 10.2], [51.8, 10.2], [51.8, 21.8], [42.4, 21.8]])], cuts: [X.poly([[45.2, 10], [46.8, 10], [46.8, 14.2], [45.2, 14.2]]), X.poly([[48.8, 17.8], [52.2, 17.8], [52.2, 19.4], [48.8, 19.4]]), X.circ(44.8, 18.6, 1)] });
  // the bezel: a square plate on the band, the rune on it
  F.add({ X, mat: m, prof: 'bevel', bw: 2, grp: 'bezel', shapes: [X.poly([[22.6, 20.4], [41.4, 20.4], [41.4, 33.4], [22.6, 33.4]])], tex: P.tex });
  F.add({ X, mat: P.face || 'granite', prof: 'round', bw: 1.6, grp: 'face', shapes: [X.poly([[25, 22.8], [39, 22.8], [39, 31], [25, 31]])], tex: TX2.granite(13) });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'rune', noShadow: true, shapes: [X.cap(32, 23.8, 32, 30, .75), X.cap(32, 24.8, 36, 27, .7), X.cap(32, 27.4, 28, 25.2, .7), X.cap(29.4, 29.8, 34.6, 29.8, .6)] });
  if (P.gem) { F.add({ X, mat: m, prof: 'round', bw: 1.6, grp: 'gemset', shapes: [X.circ(32, 57.4, 2.8)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'gemset', noShadow: true, shapes: [X.circ(32, 57.4, 1.8)] }); }
}
// axe `pick`: the Cutter's ice-pick: a long pick curving forward off the socket, a chisel-adze behind, and the
// haft cut with a tally for every block of lake it took
function pickAxeR(F, X, P) {
  const hc = P.headT ?? 47, r = P.haftR ?? 2.2, top = hc + 4;
  F.add({ X, mat: P.haft || 'wood', prof: 'round', bw: r, grp: 'haft', shapes: [X.cap(2.5, 0, top, 0, r, r * .85)], tex: P.haftTex || TX.grain(5) });
  if (P.wrap) F.add({ X, mat: P.wrap, prof: 'round', bw: r + .4, grp: 'wrap', shapes: [X.cap(5.5, 0, P.wrapEnd ?? 15, 0, r + .45)], tex: TX.wrap(2.2) });
  for (const t of P.bands || []) band(F, X, t, r, P.bandMat || 'iron');
  F.add({ X, mat: P.pommel || P.bandMat || 'iron', prof: 'round', bw: 2, grp: 'pommel', shapes: [X.cap(1.2, 0, 4.2, 0, r + .7)] });
  if (P.tally) {
    const S = []; let t = 18.5;
    for (let g = 0; g < 4 && t < hc - 7; g++) { for (let k = 0; k < 4; k++) { S.push(X.cap(t, -r * .8, t, r * .8, .42)); t += 1.5; } S.push(X.cap(t - 6.6, r * .7, t - .9, -r * .7, .38)); t += 2.2; }
    F.add({ X, mat: P.tally, prof: 'flat', grp: 'tally', noShadow: true, detail: true, shapes: S });
  }
  // the pick: from the socket out to -s, curving back toward the haft end, drawn to a four-sided point
  const L = P.pickL ?? 22, cl = u => [hc + 2 - u * u * 7.5, -2.6 - u * L], hw = u => (1 - u) * 3.3 + .35;
  const bt = P.bladeTex;
  F.add({ X, mat: P.blade || 'steel', prof: 'ridge', hs: .85, grp: 'pick', shapes: [X.poly(ribbon(cl, hw, 16))], tex: q => { const r0 = bt ? bt(q) : 0; if (P.edge && q.v < -2.6 - L * .62) return { m: P.edge, dd: q.v < -2.6 - L * .86 ? 1 : 0 }; return r0; } });
  // the adze: a flared chisel blade on the back
  F.add({ X, mat: P.blade || 'steel', prof: 'bevel', bw: 1.6, grp: 'adze', shapes: [X.poly([[hc - 3, 2.2], [hc + 3, 2.2], [hc + 4.4, 9.2], [hc + 1.6, 10.6], [hc - 1.6, 10.6], [hc - 4.4, 9.2]])], tex: P.edge ? ({ v }) => (v > 9 ? { m: P.edge, dd: 0 } : 0) : null });
  F.add({ X, mat: P.socket || 'iron', prof: 'round', bw: 2.4, grp: 'socket', shapes: [X.cap(hc - 5, 0, hc + 5, 0, 3.4)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'socket', noShadow: true, shapes: [X.circ(hc, 0, 2)] });
  if (P.rime) F.add({ X, mat: P.rime, prof: 'round', bw: 1, grp: 'rime', detail: true, shapes: [X.ell(hc - 2, -8, 2, 1.1), X.ell(hc - 5.5, -15.5, 1.6, .9), X.ell(hc + 1, 7.4, 1.4, .8)] });
}
// staff style 'rune': a haft of black iron cut with runes that glow, capped by a rune-stone in a forged cradle
function runeHeadR(F, X, P, hT, hs, r) {
  const gl = P.glow || 'ember';
  if (P.runes) {
    const S = [];
    for (let k = 0; k < 6; k++) { const t = 12 + k * 7.6; S.push(X.cap(t, -r * .5, t + 1.6, r * .5, .45)); if (k & 1) S.push(X.cap(t + 1.6, -r * .5, t + 3, 0, .4)); else S.push(X.cap(t - .4, r * .3, t + 1.8, r * .3, .4)); }
    F.add({ X, mat: P.runes, prof: 'flat', grp: 'haftrunes', noShadow: true, detail: true, shapes: S });
  }
  const oc = hT + 8.4, m = P.metal || 'blackiron';
  // the cradle: two forged prongs from a collar, round the stone
  F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: 'cradle', shapes: chain(X, [[hT - 3, hs], [hT + 1.6, hs - 5.6], [oc + 3, hs - 6.8], [oc + 7.4, hs - 4.6]], [1.8, 1.5, 1.2, .8]).concat(chain(X, [[hT - 3, hs], [hT + 1.6, hs + 5.6], [oc + 3, hs + 6.8], [oc + 7.4, hs + 4.6]], [1.8, 1.5, 1.2, .8]), [X.cap(hT - 4, hs, hT + 1, hs, 2.8, 2.4)]) });
  // the rune-stone: a squared slab, the rune in it burning
  F.add({ X, mat: P.stone || 'granite', prof: 'bevel', bw: 2, grp: 'stone', shapes: [X.poly([[oc - 5.4, hs - 4.2], [oc + 5.8, hs - 5], [oc + 6.4, hs + 4.4], [oc - 4.8, hs + 5]])], tex: TX2.granite(29) });
  F.add({ X, mat: gl, prof: 'round', bw: .7, grp: 'rune', noShadow: true, shapes: [X.cap(oc - 3, hs, oc + 3.6, hs, .7), X.cap(oc + .2, hs, oc + 2.6, hs - 2.8, .6), X.cap(oc + .2, hs, oc + 2.6, hs + 2.8, .6), X.cap(oc - 2.8, hs - 2, oc - 2.8, hs + 2, .55)] });
  F.add({ X, mat: m, prof: 'round', bw: 1, grp: 'straps', shapes: [X.cap(oc - 2.2, hs - 5.4, oc - 1.8, hs + 5.4, .9), X.cap(oc + 3.4, hs - 5.4, oc + 3.8, hs + 5.2, .9)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.4, grp: 'collargem', noShadow: true, shapes: [X.circ(hT - 1.4, hs, 1.6)] });
}
// staff style 'crozier': a crook that curls into a volute, silver sheathed in old ice; a cold light hangs in the curl,
// icicles hang off the curve, and the haft is cased in knuckles of ice
function crozierHeadR(F, X, P, hT, hs, r) {
  const m = P.metal || 'silver', ice = P.ice || 'ice';
  for (const t of [18, 31, 44]) F.add({ X, mat: ice, prof: 'round', bw: 1.6, grp: 'iceknuckle' + t, shapes: [X.cap(t - 2.2, hs, t + 2.2, hs, r + 1.1, r + .8)] });
  const cl = u => { const a = Math.PI * 1.75 * u, rr = 8.4 - u * 4.4; return [hT + 1.5 + Math.sin(a) * rr, hs - 8.4 + Math.cos(a) * rr]; };
  const pts = Array.from({ length: 15 }, (_, k) => cl(k / 14)), rs = pts.map((_, k) => r * (1 - k / 14 * .42));
  F.add({ X, mat: m, prof: 'round', bw: r, grp: 'crook', shapes: chain(X, [[hT - 3, hs], [hT + 1.5, hs]].concat(pts), [r, r].concat(rs)), tex: P.tex });
  F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: 'knop', shapes: [X.cap(hT - 5, hs, hT - 1, hs, r + 1.6, r + 1.2)] });
  // ice caked over the outside of the curl
  const out = [.08, .2, .34, .5].map(u => { const p = cl(u), q = cl(Math.min(1, u + .03)), d = unit([q[0] - p[0], q[1] - p[1]]); return [p[0] - d[1] * 1.2, p[1] + d[0] * 1.2]; });
  F.add({ X, mat: ice, prof: 'round', bw: 1.2, grp: 'icecake', shapes: out.map(([t, s], k) => X.circ(t, s, 1.9 - k * .2)) });
  // icicles off the outer curve
  const I = [.14, .27, .4].map(u => { const p = cl(u), q = cl(u + .02), d = unit([q[0] - p[0], q[1] - p[1]]), o = [d[1], -d[0]]; return [p[0] + o[0] * 1.6, p[1] + o[1] * 1.6, o[0] * .4 - .6, o[1] * .4 + .2, 4.2 - u * 4, .9]; });
  F.add({ X, mat: ice, prof: 'ridge', hs: .9, grp: 'icicles', shapes: thornShapes(X, I) });
  // the cold light in the curl, on a short chain
  const c0 = [hT + 1.5, hs - 8.4];
  F.add({ X, mat: m, prof: 'round', bw: .6, grp: 'lampchain', detail: true, shapes: [X.cap(c0[0] + 4, c0[1], c0[0] + 1.8, c0[1], .45)] });
  F.add({ X, mat: P.orb || 'frost', prof: 'round', bw: 2, grp: 'lamp', noShadow: true, shapes: [X.circ(c0[0] + .2, c0[1], 2.6)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.4, grp: 'knopgem', noShadow: true, shapes: [X.circ(hT - 3, hs, 1.6)] });
}
// focus style 'censer': a thurible on three chains: a pierced lid over a bowl on a foot, a cold light showing through
// the piercings, wet smoke curling up out of it and water dripping from the foot
function censerR(F, X0, P) {
  const m = P.metal || 'silver', gl = P.glow || 'frost', S0 = 1.1, o = X0.P(32 * (1 - S0), 31 * (1 - S0)), X = Xf(o[0], o[1], X0.ax, X0.ay, X0.k * S0, X0.cap(0, 0, 0, 0, 0).ra);
  if (P.smoke) F.add({ X, mat: P.smoke, prof: 'flat', grp: 'smoke', noShadow: true, noOutline: true, shapes: chain(X, [[30, 26], [27.4, 21], [29.8, 16], [26.6, 11], [28.4, 6.4]], [1.5, 1.8, 1.6, 1.3, .8]).concat(chain(X, [[35, 27], [38.4, 21.6], [36, 17], [39.6, 12.4]], [1.3, 1.6, 1.4, .8])), tex: ({ x, y }) => ((x + y) & 1 ? -1 : 0) });
  F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: 'topring', shapes: [X.circ(32, 5, 2.8)], cuts: [X.circ(32, 5, 1.3)] });
  const link = (a, b) => { const S = [], n = 7; for (let k = 0; k < n; k++) { const u = (k + .5) / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u; S.push(k & 1 ? X.ell(x, y, .75, 1.35) : X.ell(x, y, 1.1, .8)); } return S; };
  F.add({ X, mat: m, prof: 'round', bw: .8, grp: 'chains', shapes: link([32, 7.4], [21.8, 34]).concat(link([32, 7.4], [42.2, 34]), link([32, 7.4], [32, 25])) });
  F.add({ X, mat: gl, prof: 'flat', grp: 'fire', noShadow: true, shapes: [X.ell(32, 33.6, 9.6, 5.4)] });
  const dome = []; for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; dome.push([32 + Math.cos(a) * 11, 35.6 + Math.sin(a) * 9]); }
  const holes = []; for (const [y, n, w] of [[30.4, 4, 7.6], [33.6, 5, 9.2]]) for (let k = 0; k < n; k++) holes.push(X.ell(32 - w + (2 * w) * (k + .5) / n, y, .95, 1.15));
  F.add({ X, mat: m, prof: 'round', bw: 3.4, hs: .8, grp: 'lid', shapes: [X.poly(dome)], cuts: holes, tex: P.tex });
  F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: 'finial', shapes: [X.cap(32, 26.8, 32, 23.4, 1.4, 1), X.circ(32, 23, 1.5)] });
  F.add({ X, mat: m, prof: 'round', bw: 5, hs: .8, grp: 'bowl', shapes: [X.poly([[20.2, 36], [43.8, 36], [42.6, 41.4], [39.4, 46], [35, 48.4], [29, 48.4], [24.6, 46], [21.4, 41.4]])], tex: P.tex });
  F.add({ X, mat: P.trim || m, prof: 'round', bw: 1.2, grp: 'rim', shapes: [X.cap(20, 36.4, 44, 36.4, 1.4)] });
  F.add({ X, mat: m, prof: 'round', bw: 1.4, grp: 'foot', shapes: [X.cap(32, 48, 32, 51.4, 2.2, 1.6), X.poly([[25.4, 51.2], [38.6, 51.2], [39.8, 53.6], [24.2, 53.6]])], tex: P.tex });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'bowlgem', noShadow: true, shapes: [X.circ(32, 41.6, 2)] });
  if (P.drips) F.add({ X, mat: P.drips, prof: 'round', bw: 1, grp: 'drips', noShadow: true, noOutline: true, detail: true, shapes: [X.cap(27, 55, 27, 56.8, .6, .85), X.circ(36.4, 58.2, .8), X.cap(31.6, 57.8, 31.6, 59, .45, .7)] });
}
// leather style 'feathers': a cloak of three great feathers from the Thunder-Roc, fanned from a clasp at the throat and
// hanging to the hem: barbed vanes notched at the edge, a pale quill down each, the outer edges lit with storm
function featherCloakR(F, X, P) {
  const fm = P.feather || 'rocFeather', q = P.quill || 'bone', rm = X.cap(0, 0, 0, 0, 0).ra;
  const feather = (root, tip, W, g, edgeSide) => {
    const L = Math.hypot(tip[0] - root[0], tip[1] - root[1]), r0 = X.P(root[0], root[1]), r1 = X.P(tip[0], tip[1]), Y = Xf(r0[0], r0[1], r1[0] - r0[0], r1[1] - r0[1], X.k, rm);
    const hw = (u, sd) => W * (sd < 0 ? .86 : 1) * Math.pow(Math.sin(Math.PI * Math.min(1, .05 + u * .97)), .45) * (u > .78 ? 1 - (u - .78) * 1.5 : 1);
    const A = [], B = []; for (let k = 0; k <= 18; k++) { const u = k / 18; A.push([u * L, -hw(u, -1)]); B.push([u * L, hw(u, 1)]); }
    const notch = (u, sd) => Y.poly([[u * L - 1.2, sd * (hw(u, sd) + 1)], [u * L + 3, sd * hw(u, sd) * .5], [u * L + 1.6, sd * (hw(u, sd) + 1)]]);
    F.add({ X: Y, mat: fm, prof: 'round', bw: 3, hs: .8, grp: g, shapes: [Y.poly(A.concat(B.reverse()))], cuts: [notch(.46, -1), notch(.64, 1), notch(.3, 1)], tex: ({ u, v }) => { const f = ((u - Math.abs(v) * 1.25) % 3.2 + 3.2) % 3.2; const bar = u > L * .7 && u < L * .77 ? 1.6 : 0; return (f < .7 ? -1 : 0) + (Math.abs(v) < 1.6 ? .6 : 0) + (u > L * .82 ? -.5 : 0) + bar; } });
    if (P.edge) { const S = []; for (let k = 6; k < 16; k++) { const a = k / 18, b = (k + 1) / 18; S.push(Y.cap(a * L, edgeSide * hw(a, edgeSide) * .86, b * L, edgeSide * hw(b, edgeSide) * .86, .55)); } F.add({ X: Y, mat: P.edge, prof: 'flat', grp: g + 'edge', noShadow: true, detail: true, shapes: S }); }
    F.add({ X: Y, mat: q, prof: 'round', bw: .8, grp: g + 'quill', shapes: [Y.cap(-2.6, 0, L * .9, 0, 1.15, .3)] });
  };
  feather([29.4, 9.4], [12.4, 59.6], 9.4, 'left', -1);
  feather([34.6, 9.4], [51.6, 59.6], 9.4, 'right', 1);
  feather([32, 9], [32, 62.2], 10, 'mid', 1);
  F.add({ X, mat: P.clasp || 'silver', prof: 'round', bw: 1, grp: 'cord', shapes: [X.cap(20.6, 11.8, 43.4, 11.8, 1)] });
  F.add({ X, mat: P.clasp || 'silver', prof: 'round', bw: 2, grp: 'clasp', shapes: [X.circ(32, 10.6, 3.4)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'clasp', noShadow: true, shapes: [X.circ(32, 10.6, 2.1)] });
}
// leather style 'mantle': the hides of the trolls who argued with Old Horn, stitched into a mantle: a cape open at the
// front over a jerkin, patched in three greys with stitched seams, a shaggy ruff at the neck and a fringe at the hem,
// lichen still growing on it, and a troll's horn through two loops for a clasp
function hideMantleR(F, X, P) {
  const hide = P.mat || 'trollHide', ruff = P.mat2 || 'grizzle';
  if (P.shirt) F.add({ X, mat: P.shirt, prof: 'round', bw: 5, hs: .7, grp: 'under', shapes: [X.poly([[22, 12], [42, 12], [44, 50], [32, 54], [20, 50]])], tex: ({ x }) => (x === 32 ? -1.5 : 0) });
  if (P.belt) F.add({ X, mat: P.belt, prof: 'round', bw: 1.8, grp: 'belt', shapes: [X.cap(20.6, 42, 43.4, 42, 2)] });
  const patch = seed => ({ u, v, x, y }) => {
    const n = vnoise(u * .1, v * .08, seed), sm = Math.abs(n - .52);
    if (sm < .018) return (Math.floor(u + v) % 3 === 0) ? { m: P.stitch || 'leatherDark', dd: 1 } : -1.8;
    if (P.moss && vnoise(u * .32, v * .32, seed + 2) > .8 && v < 30) return { m: P.moss, dd: 0 };
    const fur = ((u * 1.6 + v * 1.1) % 3.4 < .7 ? -1 : 0) + (hash(x, y, seed) < .05 ? 1 : 0);
    return n > .52 ? { m: ruff, dd: fur - 1 } : fur;
  };
  for (const sd of [-1, 1]) {
    const M = [[32 + sd * 5, 8], [32 + sd * 13, 8.6], [32 + sd * 22, 12.6], [32 + sd * 27.4, 21], [32 + sd * 28.4, 33], [32 + sd * 27, 45], [32 + sd * 20, 49], [32 + sd * 12.4, 47], [32 + sd * 9, 38], [32 + sd * 7, 24], [32 + sd * 4.6, 14]];
    F.add({ X, mat: hide, prof: 'round', bw: 6, hs: .75, grp: 'cape' + sd, shapes: [X.poly(M)], tex: patch(91 + sd) });
    const fr = []; for (let k = 0; k < 7; k++) { const u = k / 6, x = 32 + sd * (12.6 + u * 14.6), y = 47.6 - u * u * 3.6 + Math.sin(k * 1.9) * 1.2; fr.push([x, y, sd * (u - .3) * .5 + (hash(k, sd + 3, 95) - .5) * .4, 1, 3.6 + hash(k, sd + 5, 95) * 3, 1.5]); }
    F.add({ X, mat: hide, prof: 'ridge', hs: .8, grp: 'fringe' + sd, shapes: thornShapes(X, fr), tex: DARKTEX });
  }
  // the ruff: shaggy fur standing up round the neck
  const R = []; for (let k = 0; k < 13; k++) { const a = Math.PI * (1.05 + k / 12 * .9), x = 32 + Math.cos(a) * 15, y = 12 + Math.sin(a) * 5.4; R.push([x, y + 2, Math.cos(a) * .6, Math.sin(a) - .4, 3.4 + hash(k, 1, 96) * 2.4, 1.6]); }
  F.add({ X, mat: ruff, prof: 'ridge', hs: .8, grp: 'ruffspikes', shapes: thornShapes(X, R) });
  F.add({ X, mat: ruff, prof: 'round', bw: 3, grp: 'ruff', shapes: [X.ell(32, 11.4, 15.4, 5.4)], cuts: [X.ell(32, 10.6, 8.2, 3.6)], tex: ({ u, v }) => ((u * 1.4 + v) % 2.8 < .7 ? -1 : 0) });
  if (P.stitch) F.add({ X, mat: P.stitch, prof: 'round', bw: .6, grp: 'stitches', detail: true, shapes: [[12.6, 24], [14, 31], [51.4, 24], [50, 31.4]].flatMap(([x, y]) => [X.cap(x - 1.4, y - 1.4, x + 1.4, y + 1.4, .45), X.cap(x - 1.4, y + 1.4, x + 1.4, y - 1.4, .45)]) });
  // the clasp: a troll's horn toggle through two loops across the opening
  F.add({ X, mat: P.clasp || 'iron', prof: 'round', bw: .8, grp: 'loops', shapes: [X.circ(26.4, 20.4, 1.8), X.circ(37.6, 20.4, 1.8)], cuts: [X.circ(26.4, 20.4, .8), X.circ(37.6, 20.4, .8)] });
  F.add({ X, mat: P.horn || 'bone', prof: 'round', bw: 1.4, grp: 'horn', shapes: chain(X, [[23.4, 18.6], [27.6, 20.8], [32.4, 21.4], [37, 20.2], [40.6, 17.6], [41.6, 14.4]], [1.2, 1.7, 1.8, 1.5, 1, .45]), tex: ({ u }) => ((u * 2) % 2.4 < .5 ? -1 : 0) });
  if (P.gem) { F.add({ X, mat: P.clasp || 'iron', prof: 'round', bw: 1.6, grp: 'claspset', shapes: [X.circ(32.2, 21.2, 2.6)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 1.6, grp: 'claspset', noShadow: true, shapes: [X.circ(32.2, 21.2, 1.7)] }); }
}
const DARKTEX = () => -1;

/* placements: recipe fn, 64-space origin + axis, the grip point used to put it in a hero's hand,
   and hold: the default scale/axis when held (axis points from the hand toward the business end) */
const kindOf = (fn, defaults) => (F, X, P) => fn(F, X, Object.assign({}, defaults, P));
const RECIPE = {
  sword: { fn: swordR, o: [5.5, 58.5], a: [1, -1], grip: [11, 0], hold: { k: .36 }, cls: 'blade' },
  hammer: { fn: hammerR, o: [6.5, 57.5], a: [1, -1], grip: [11, 0], hold: { k: .36 }, cls: 'blunt' },
  bow: { fn: bowR, o: [7.9, 53.1], a: [1, -1], grip: [32, -10], hold: { k: .5, axis: [.22, 1] }, cls: 'bow' },
  dagger: { fn: daggerR, o: [11, 53], a: [1, -1], grip: [8, 0], hold: { k: .3 }, cls: 'blade' },
  axe: { fn: axeR, o: [8, 57], a: [1, -1], grip: [11, 0], hold: { k: .36 }, cls: 'blade' },
  mace: { fn: maceR, o: [6.5, 57.5], a: [1, -1], grip: [11, 0], hold: { k: .36 }, cls: 'blunt' },
  spear: { fn: spearR, o: [4, 60], a: [1, -1], grip: [30, 0], hold: { k: .42, axis: [-.3, -1] }, cls: 'spear' },
  staff: { fn: staffR, o: [5, 61], a: [1, -1], grip: [36, 0], hold: { k: .42, axis: [-.12, -1] }, cls: 'staff' },
  crown: { fn: crownR, o: [0, 0], a: [1, 0] },
  mail: { fn: mailR, o: [0, 0], a: [1, 0] },
  robe: { fn: robeR, o: [0, 0], a: [1, 0] },
  leather: { fn: leatherR, o: [0, 0], a: [1, 0] },
  plate: { fn: plateR, o: [0, 0], a: [1, 0] },
  chest: { fn: chestR, o: [0, 0], a: [1, 0] },
  shield: { fn: shieldR, o: [0, 0], a: [1, 0] },
  focus: { fn: focusR, o: [0, 0], a: [1, 0] },
  helm: { fn: helmR, o: [0, 0], a: [1, 0] },
  hood: { fn: kindOf(helmR, { look: 'hood', mat: 'cloakGreen' }), o: [0, 0], a: [1, 0] },
  coif: { fn: kindOf(helmR, { look: 'coif', mat: 'wool' }), o: [0, 0], a: [1, 0] },
  kettle: { fn: kindOf(helmR, { look: 'kettle' }), o: [0, 0], a: [1, 0] },
  circlet: { fn: kindOf(helmR, { look: 'circlet', gem: 'ember' }), o: [0, 0], a: [1, 0] },
  gloves: { fn: glovesR, o: [0, 0], a: [1, 0] },
  gauntlets: { fn: kindOf(glovesR, { mat: 'steel', plate: 1 }), o: [0, 0], a: [1, 0] },
  boots: { fn: bootsR, o: [0, 0], a: [1, 0] },
  amulet: { fn: amuletR, o: [0, 0], a: [1, 0] },
  ring: { fn: ringR, o: [0, 0], a: [1, 0] },
  beads: { fn: beadsR, o: [0, 0], a: [1, 0] },
};
/* ==== M4: gems in sockets and the high-temper glow, laid over any recipe (card, bag icon, hero hand, foe) ====
   P.sockets = [gemMat | null, ...]: each gem in its socket, in index order; an empty socket draws nothing, so an
   item with no gems set renders exactly as before. P.socketMat is the setting's metal. P.tglow (temper +7 and up)
   turns the outer rim of every metal part (of every part that does not glow, with P.tglowAll) into that glow. */
const bowPt = (P, u) => { const L = P.len, b = P.bulge, h = 2 * b, R0 = (L * L / 4 + h * h) / (2 * h), al = Math.asin((L / 2) / R0), th = -al + 2 * al * u; return [L / 2 + R0 * Math.sin(th), -b + R0 - R0 * Math.cos(th) + .8]; };
const headSock = P => (P.style === 'mask' ? [[20, 18], [44, 18]] : P.look === 'kettle' ? [[21, 34], [43, 34]] : P.look === 'hood' ? [[25, 51], [39, 51]] : P.look === 'coif' ? [[21, 38], [43, 38]] : P.look === 'circlet' ? [[19, 41], [45, 41]] : P.look === 'crown' ? [[26, 42], [38, 42]] : [[20, 30.4], [44, 30.4]]);
const SOCKETS = {
  sword: P => { const t = P.gripEnd + P.guardT; return [[t + 3.4, 0], [t + 7.8, 0]]; },
  dagger: P => { const t = (P.gripEnd ?? 11) + (P.guardT ?? 3); return [[t + 3, 0], [t + 6.6, 0]]; },
  axe: P => [[(P.headT ?? 48) - 8, 0], [(P.headT ?? 48) - 12.5, 0]],
  hammer: P => (P.style === 'mace' ? [[P.headT - P.headW - 3, 0], [P.headT - P.headW - 7, 0]] : [[P.headT, -P.headW * .45], [P.headT, P.headW * .45]]),
  mace: P => (P.style === 'bell' ? [[(P.headT ?? 33) + 7, 0], [(P.headT ?? 33) + 17, 0]] : [[(P.headT ?? 52) - (P.headW ?? 7.5) - 3, 0], [(P.headT ?? 52) - (P.headW ?? 7.5) - 7, 0]]),
  spear: P => [[(P.headT ?? 62) - 9, 0], [(P.headT ?? 62) - 13, 0]],
  staff: P => [[(P.headT ?? 64) - 5, 0], [(P.headT ?? 64) - 10, 0]],
  bow: P => [bowPt(P, .36), bowPt(P, .64)],
  shield: P => (P.style === 'door' ? [[22, 50], [42, 50]] : P.style === 'scale' ? [[24, 26], [40, 26]] : P.shape === 'heater' || P.style === 'oath' ? [[22, 40], [42, 40]] : P.shape === 'tower' || P.style === 'aegis' ? [[21.5, 52], [42.5, 52]] : [[32 - (P.r || 26) * .52, 32 + (P.r || 26) * .45], [32 + (P.r || 26) * .52, 32 + (P.r || 26) * .45]]),
  focus: P => (P.style === 'censer' ? [[25.5, 42], [38.5, 42]] : P.style === 'lantern' ? [[25, 47.4], [39, 47.4]] : P.style === 'orb' ? [[24, 40], [40, 40]] : P.style === 'tome' ? [[19, 22], [42, 19]] : [[20, 47], [44, 47]]),
  helm: headSock, hood: P => headSock(Object.assign({ look: 'hood' }, P)), coif: P => headSock(Object.assign({ look: 'coif' }, P)),
  kettle: P => headSock(Object.assign({ look: 'kettle' }, P)), circlet: P => headSock(Object.assign({ look: 'circlet' }, P)), crown: () => [[26, 42], [38, 42]],
  robe: () => [[25, 24], [39, 24]], leather: () => [[24, 30], [40, 30]], mail: () => [[24, 28], [40, 28]], plate: () => [[24, 31], [40, 31]],
  gloves: () => [[23, 52], [37, 52]], gauntlets: () => [[23, 52], [37, 52]], boots: () => [[23, 9.5], [35, 9.5]],
  amulet: P => (P.style === 'bell' ? [[25.4, 46], [38.6, 46]] : [[21, 44], [43, 44]]), ring: () => [[23.5, 50], [40.5, 50]], beads: () => [[22, 30], [42, 30]],
};
function forged(F, X, P, r, n0) {
  if (P.tglow) {
    const g = P.tglow, rim = Math.max(.7, 1.3 * X.k);
    for (let i = n0; i < F.parts.length; i++) {
      const p = F.parts[i], m = MAT[p.mat];
      if (!m || m.emit || !(m.metal || P.tglowAll)) continue;
      const t0 = p.tex; p.tex = q => (q.d < rim ? { m: g, dd: q.d < rim * .5 ? 1 : 0, e: 1 } : t0 ? t0(q) : 0);
    }
  }
  if (P.sockets && X.k >= .3 && SOCKETS[r]) {
    const at = SOCKETS[r](P);
    P.sockets.forEach((gem, i) => {
      if (!gem || !at[i]) return;
      const [t, s] = at[i];
      F.add({ X, mat: P.socketMat || 'gold', prof: 'round', bw: 1.4, grp: 'socket' + i, shapes: [X.circ(t, s, 3.2)] });
      F.add({ X, mat: gem, prof: 'round', bw: 1.8, grp: 'socket' + i, noShadow: true, shapes: [X.circ(t, s, 2.2)] });
    });
  }
}
for (const [r, R] of Object.entries(RECIPE)) { const fn = R.fn; R.fn = (F, X, P) => { const n0 = F.parts.length; fn(F, X, P); if (P && (P.sockets || P.tglow)) forged(F, X, P, r, n0); }; }
function renderItem(art, size, opts = {}) {
  const R = RECIPE[art.r], k = size / 64, F = new Forge(size, size);
  const X = Xf(R.o[0] * k, R.o[1] * k, R.a[0], R.a[1], k, opts.rm || 0);
  R.fn(F, X, art.p);
  return F.raster();
}

export {
  TX, TX2, swordR, hammerR, bowR, crownR, mailR, scaleTex, mailTex, chestR, shieldR, helmR, glovesR, bootsR, amuletR, ringR, beadsR,
  daggerR, axeR, maceR, spearR, staffR, focusR, robeR, leatherR, plateR, thornCrownR, regalCrownR, fullHelm, ribbon, chain, thornShapes, lerp,
  RECIPE, renderItem,
};
