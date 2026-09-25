// Ported from prototypes/item-card.html (the approved Loot Forge art pipeline).
// Item shape recipes. Each recipe(F, X, P) adds parts to a Forge in 64px item space.
import { MAT, hash, vnoise, bayer, Xf, Forge } from './forge.js';

/* ==== RECIPES: items are parameter sets fed to a few shape recipes ==== */
const TX = {
  wrap: (per = 2.2) => ({ u, v }) => ((Math.floor((u + v * .9) / per) & 1) ? -1 : 0),
  grain: seed => ({ u, v }) => (vnoise(u * .12, v * 1.1, seed) > .62 ? -1 : 0),
  rust: seed => ({ x, y, u, d }) => { const n = vnoise(x * .34, y * .34, seed) * .8 + hash(x, y, seed + 9) * .2 + (u < 24 ? .12 : 0) + (d < 1.2 ? .08 : 0); if (n > .66) return { m: 'rust', dd: hash(x, y, seed) < .3 ? -1 : 0 }; if (n > .6) return { m: 'rust', dd: 1 }; return hash(x, y, seed + 3) < .05 ? -1 : 0; },
};
function swordR(F, X, P) {
  const g0 = P.gripEnd, t0 = g0 + P.guardT, bw = P.bladeW, tipS = t0 + P.bladeL - P.tipL, tipE = t0 + P.bladeL;
  const bt = P.bladeTex; F.add({ X, mat: P.blade, prof: 'ridge', hs: .8, grp: 'blade', tex: q => { const a = Math.abs(q.v) * q.k; if (P.heat && a < 1.7 && q.u > t0 - 1) return { m: 'heat', dd: a < .6 ? 2 : 0 }; const r = bt ? bt(q) : 0; if (a < .6 && q.u > t0) return typeof r === 'object' ? Object.assign({}, r, { dd: (r.dd || 0) + 1 }) : r + 2; return r; }, shapes: [X.poly([[t0 - 2, -bw], [tipS, -bw * P.taper], [tipE, 0], [tipS, bw * P.taper], [t0 - 2, bw]])], cuts: (P.notches || []).map(([t, s, r]) => X.circ(t, s, r)) });
  if (P.fuller) F.add({ X, mat: P.fuller, prof: 'round', bw: 1, grp: 'blade', noShadow: true, shapes: [X.cap(t0 + 2.5, 0, tipS - 4, 0, P.fullerR || 1, (P.fullerR || 1) * .7)], tex: ({ u }) => (Math.sin(u * .7) > .6 ? 1 : 0) + (u > tipS - 12 ? -1 : 0) });
  if (P.guard === 'flame') {
    const o = [[-.2, -3], [.3, -7], [1.3, -10.5], [4, -13], [8, -13.8], [5.7, -11.2], [4.8, -8.2], [4.7, -4.5], [4.7, 4.5], [4.8, 8.2], [5.7, 11.2], [8, 13.8], [4, 13], [1.3, 10.5], [.3, 7], [-.2, 3]];
    F.add({ X, mat: P.guardMat, prof: 'round', bw: 1.7, grp: 'guard', shapes: [X.poly(o.map(([t, s]) => [g0 + t, s]))] });
    F.add({ X, mat: P.guardMat, prof: 'round', bw: 3.4, grp: 'boss', shapes: [X.circ(g0 + 2.3, 0, 3.7)] });
    F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'boss', noShadow: true, shapes: [X.circ(g0 + 2.3, 0, 2.2)] });
  } else {
    F.add({ X, mat: P.guardMat, prof: 'round', bw: P.guardR, grp: 'guard', shapes: [X.cap(g0 + P.guardT / 2, -P.guardW, g0 + P.guardT / 2, P.guardW, P.guardR)], tex: P.guardTex });
  }
  F.add({ X, mat: P.grip, prof: 'round', bw: P.gripR, grp: 'grip', shapes: [X.cap(P.pommelR * 1.4, 0, g0 + .5, 0, P.gripR)], tex: TX.wrap(2.4) });
  F.add({ X, mat: P.pommel, prof: 'round', bw: P.pommelR, grp: 'pommel', shapes: [X.circ(P.pommelR, 0, P.pommelR)], tex: P.pommelTex });
  if (P.pommelGem) F.add({ X, mat: P.pommelGem, prof: 'round', bw: 1.5, grp: 'pommel', noShadow: true, detail: true, shapes: [X.circ(P.pommelR, 0, P.pommelR * .5)] });
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
  F.add({ X, mat: P.headMat, prof: 'bevel', bw: 2.4, grp: 'head', shapes: [X.poly([[hc - ht, -hw + c], [hc - ht + c, -hw], [hc + ht - c, -hw], [hc + ht, -hw + c], [hc + ht, hw - c], [hc + ht - c, hw], [hc - ht + c, hw], [hc - ht, hw - c]])], tex: P.headTex });
  if (P.faces) for (const g of [-1, 1]) F.add({ X, mat: P.headMat, prof: 'bevel', bw: 1.5, grp: 'face' + g, shapes: [X.poly([[hc - ht - 1.2, g * (hw - 3.6)], [hc + ht + 1.2, g * (hw - 3.6)], [hc + ht + 1.2, g * (hw - 1)], [hc + ht, g * (hw + 1)], [hc - ht, g * (hw + 1)], [hc - ht - 1.2, g * (hw - 1)]])], tex: P.headTex });
  if (P.trim) for (const g of [-1, 1]) F.add({ X, mat: P.trim, prof: 'round', bw: 1, grp: 'trim' + g, shapes: [X.poly([[hc - ht - .5, g * (hw - 6.6)], [hc + ht + .5, g * (hw - 6.6)], [hc + ht + .5, g * (hw - 4.6)], [hc - ht - .5, g * (hw - 4.6)]])] });
  if (P.runes) {
    const S = [], L = (a, b, c2, d, rr = .6) => S.push(X.cap(a, b, c2, d, rr));
    L(hc - ht + 2.2, 0, hc + ht - 2.2, 0);
    L(hc + .6, 0, hc + ht - 2.4, -3.4); L(hc + .6, 0, hc + ht - 2.4, 3.4);
    L(hc - ht + 2.4, -3.2, hc - 1.6, 0); L(hc - ht + 2.4, 3.2, hc - 1.6, 0);
    for (const g of [-1, 1]) { L(hc - ht + 2.6, g * 6.4, hc + ht - 2.6, g * 6.4); L(hc - .6, g * 6.4, hc + 2.2, g * 8.2); }
    F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'head', noShadow: true, detail: true, shapes: S });
  }
}
function bowR(F, X, P) {
  const L = P.len, b = P.bulge, h = 2 * b, R0 = (L * L / 4 + h * h) / (2 * h), al = Math.asin((L / 2) / R0), cS = -b + R0;
  const B = u => { const th = -al + 2 * al * u; return [L / 2 + R0 * Math.sin(th), cS - R0 * Math.cos(th)]; };
  const Tn = u => { const th = -al + 2 * al * u; return [Math.cos(th), Math.sin(th)]; };
  const A = B(0), C = B(1);
  const seg = (u0, u1, n, rf) => { const S = []; for (let k = 0; k < n; k++) { const a = u0 + (u1 - u0) * k / n, c = u0 + (u1 - u0) * (k + 1) / n; const p = B(a), q = B(c); S.push(X.cap(p[0], p[1], q[0], q[1], rf(a), rf(c))); } return S; };
  const rr = u => P.tipR + (P.limbR - P.tipR) * Math.pow(1 - Math.abs(2 * u - 1), .6);
  F.add({ X, mat: 'string', prof: 'flat', grp: 'string', noOutline: true, noShadow: true, shapes: [X.cap(A[0] + .6, A[1], C[0] - .6, C[1], .5)] });
  F.add({ X, mat: P.limb, prof: 'round', bw: 3, grp: 'limb', shapes: seg(0, 1, 28, rr), tex: P.limbTex });
  F.add({ X, mat: P.nock, prof: 'round', bw: 1.4, grp: 'nock', shapes: [X.cap(A[0] + 1.6, A[1] - .8, A[0] - 3, A[1] - 3.6, 1.5, 1), X.cap(C[0] - 1.6, C[1] - .8, C[0] + 3, C[1] - 3.6, 1.5, 1)] });
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
function shieldR(F, X, P) {
  const r = P.r || 26;
  F.add({ X, mat: P.face || 'wood', prof: 'round', bw: r * .6, hs: .5, grp: 'face', shapes: [X.circ(32, 32, r)], tex: P.planks ? ({ x }) => ((x % 4) === 0 ? -1 : 0) : null });
  F.add({ X, mat: P.rim || 'iron', prof: 'round', bw: 2.5, grp: 'rim', shapes: [X.circ(32, 32, r)], cuts: [X.circ(32, 32, r - 4.5)] });
  F.add({ X, mat: P.boss || 'iron', prof: 'round', bw: 8, grp: 'boss', shapes: [X.circ(32, 32, P.bossR || 8)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 4, grp: 'boss', noShadow: true, shapes: [X.circ(32, 32, 4.5)] });
}
function helmR(F, X, P) {
  if (P.look === 'kettle') {
    F.add({ X, mat: 'steel', prof: 'round', bw: 14, hs: .8, grp: 'dome', shapes: [X.ell(32, 36, 20, 22)], clip: X.poly([[0, 0], [64, 0], [64, 38], [0, 38]]) });
    F.add({ X, mat: 'steel', prof: 'round', bw: 4, grp: 'brim', shapes: [X.ell(32, 39, 30, 6.5)] });
    F.add({ X, mat: 'iron', prof: 'round', bw: 2, grp: 'band', shapes: [X.cap(12.5, 34, 51.5, 34, 2.4)] });
  } else if (P.look === 'hood') {
    F.add({ X, mat: P.mat, prof: 'round', bw: 12, grp: 'hood', shapes: [X.ell(32, 30, 22, 24), X.poly([[8, 38], [56, 38], [60, 58], [4, 58]])], cuts: [X.ell(32, 36, 13, 14)] });
    F.add({ X, mat: 'dark', prof: 'round', bw: 8, grp: 'in', shapes: [X.ell(32, 36, 13, 14)], tex: () => -1 });
  } else if (P.look === 'circlet') {
    F.add({ X, mat: 'gold', prof: 'round', bw: 3, grp: 'band', shapes: [X.ell(32, 34, 26, 12)], cuts: [X.ell(32, 33, 21.5, 8)] });
    F.add({ X, mat: 'gold', prof: 'round', bw: 5, grp: 'set', shapes: [X.poly([[26, 44], [32, 36], [38, 44], [32, 52]])] });
    F.add({ X, mat: P.gem, prof: 'round', bw: 3, grp: 'set', noShadow: true, shapes: [X.circ(32, 44, 4.2)] });
  } else if (P.look === 'coif') {
    F.add({ X, mat: P.mat, prof: 'round', bw: 14, grp: 'cap', shapes: [X.ell(32, 38, 22, 24)], clip: X.poly([[0, 0], [64, 0], [64, 40], [0, 40]]) });
    F.add({ X, mat: 'leather', prof: 'round', bw: 3, grp: 'band', shapes: [X.cap(10, 38, 54, 38, 3.5)] });
  }
}
function glovesR(F, X, P) {
  F.add({ X, mat: P.mat, prof: 'round', bw: 8, grp: 'cuff', shapes: [X.poly([[18, 60], [42, 60], [44, 44], [16, 44]])], tex: P.cuffTex });
  F.add({ X, mat: P.mat, prof: 'round', bw: 10, grp: 'palm', shapes: [X.poly([[15, 46], [45, 46], [46, 22], [14, 22]]), X.cap(20, 22, 18, 7, 4), X.cap(28, 22, 28, 4, 4), X.cap(36, 22, 38, 6, 4), X.cap(44, 25, 49, 13, 3.6), X.cap(15, 36, 7, 27, 4.2)] });
}
function bootsR(F, X, P) {
  F.add({ X, mat: P.mat, prof: 'round', bw: 8, grp: 'boot', shapes: [X.poly([[18, 6], [40, 6], [40, 38], [56, 46], [58, 58], [14, 58], [16, 36]])] });
  F.add({ X, mat: P.trim || 'leather', prof: 'round', bw: 3, grp: 'cuff', shapes: [X.cap(16, 9, 42, 9, 4)] });
  F.add({ X, mat: P.trim || 'leather', prof: 'round', bw: 2, grp: 'sole', shapes: [X.cap(14, 57, 58, 57, 2.8)] });
}
function amuletR(F, X, P) {
  F.add({ X, mat: P.chain || 'gold', prof: 'round', bw: 2, grp: 'chain', shapes: [X.ell(32, 22, 20, 18)], cuts: [X.ell(32, 22, 16.5, 14.5)], clip: X.poly([[0, 0], [64, 0], [64, 32], [0, 32]]) });
  F.add({ X, mat: P.metal || 'gold', prof: 'round', bw: 10, grp: 'disc', shapes: [X.circ(32, 42, 15)] });
  F.add({ X, mat: P.gem, prof: 'round', bw: 5, grp: 'disc', noShadow: true, shapes: [X.circ(32, 42, 8)] });
}
function ringR(F, X, P) {
  F.add({ X, mat: P.metal, prof: 'round', bw: 4, grp: 'ring', shapes: [X.ell(32, 38, 21, 17)], cuts: [X.ell(32, 39, 13.5, 10)] });
  if (P.gem) { F.add({ X, mat: P.metal, prof: 'round', bw: 4, grp: 'set', shapes: [X.circ(32, 20, 9)] }); F.add({ X, mat: P.gem, prof: 'round', bw: 5, grp: 'set', noShadow: true, shapes: [X.circ(32, 20, 6)] }); }
}
function beadsR(F, X, P) {
  const S = []; for (let k = 0; k < 11; k++) { const a = Math.PI * (.1 + .8 * k / 10); S.push(X.circ(32 - Math.cos(a) * 22, 14 + Math.sin(a) * 26, 3.6)); }
  F.add({ X, mat: P.mat, prof: 'round', bw: 3.6, grp: 'beads', shapes: S });
  F.add({ X, mat: P.gem, prof: 'round', bw: 5, grp: 'charm', shapes: [X.poly([[32, 36], [40, 46], [32, 60], [24, 46]])] });
}

/* placements: recipe fn, 64-space origin + axis, and the grip point used to put it in a hero's hand */
const RECIPE = {
  sword: { fn: swordR, o: [5.5, 58.5], a: [1, -1], grip: [11, 0] },
  hammer: { fn: hammerR, o: [6.5, 57.5], a: [1, -1], grip: [11, 0] },
  bow: { fn: bowR, o: [7.9, 53.1], a: [1, -1], grip: [32, -10] },
  crown: { fn: crownR, o: [0, 0], a: [1, 0] },
  mail: { fn: mailR, o: [0, 0], a: [1, 0] },
  chest: { fn: chestR, o: [0, 0], a: [1, 0] },
  shield: { fn: shieldR, o: [0, 0], a: [1, 0] },
  helm: { fn: helmR, o: [0, 0], a: [1, 0] },
  gloves: { fn: glovesR, o: [0, 0], a: [1, 0] },
  boots: { fn: bootsR, o: [0, 0], a: [1, 0] },
  amulet: { fn: amuletR, o: [0, 0], a: [1, 0] },
  ring: { fn: ringR, o: [0, 0], a: [1, 0] },
  beads: { fn: beadsR, o: [0, 0], a: [1, 0] },
};
function renderItem(art, size, opts = {}) {
  const R = RECIPE[art.r], k = size / 64, F = new Forge(size, size);
  const X = Xf(R.o[0] * k, R.o[1] * k, R.a[0], R.a[1], k, opts.rm || 0);
  R.fn(F, X, art.p);
  return F.raster();
}

export { TX, swordR, hammerR, bowR, crownR, mailR, scaleTex, mailTex, chestR, shieldR, helmR, glovesR, bootsR, amuletR, ringR, beadsR, RECIPE, renderItem };
