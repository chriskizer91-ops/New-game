// Ported from prototypes/item-card.html (the approved Loot Forge art pipeline).
// Item shape recipes. Each recipe(F, X, P) adds parts to a Forge in 64px item space.
import { hash, vnoise, Xf, Forge } from './forge.js';

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
  if (!P.noString) F.add({ X, mat: 'string', prof: 'flat', grp: 'string', noOutline: true, noShadow: true, shapes: [X.cap(A[0] + .6, A[1], C[0] - .6, C[1], .5)] });
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

function shieldR(F, X, P) {
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
  if (P.look === 'kettle') {
    const m = P.mat || 'steel';
    F.add({ X, mat: m, prof: 'round', bw: 14, hs: .8, grp: 'dome', shapes: [X.ell(32, 36, 20, 22)], clip: X.poly([[0, 0], [64, 0], [64, 38], [0, 38]]), tex: P.tex });
    if (P.crest) F.add({ X, mat: P.crest, prof: 'round', bw: 2, grp: 'crest', shapes: [X.cap(32, 15, 32, 33, 2.2, 1.5)] });
    F.add({ X, mat: m, prof: 'round', bw: 4, grp: 'brim', shapes: [X.ell(32, 39, 30, 6.5)], tex: P.tex });
    F.add({ X, mat: P.trim || 'iron', prof: 'round', bw: 2, grp: 'band', shapes: [X.cap(12.5, 34, 51.5, 34, 2.4)] });
    if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, shapes: [X.cap(18, 34, 23, 34, .75), X.cap(27, 34, 30, 34, .75), X.cap(34, 34, 37, 34, .75), X.cap(41, 34, 46, 34, .75), X.cap(32, 20, 32, 29, .75)] });
    if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'band', noShadow: true, shapes: [X.circ(32, 34, 2.6)] });
  } else if (P.look === 'hood') {
    const tip = P.tip ?? 1;
    F.add({ X, mat: P.mat, prof: 'round', bw: 12, grp: 'hood', shapes: [X.ell(32, 30, 22, 24), X.poly([[8, 38], [56, 38], [60, 58], [4, 58]])].concat(tip ? [X.poly([[22, 12], [38, 4], [46, 1], [42, 10], [40, 14]])] : []), cuts: [X.ell(32, 36, 13, 14)], tex: P.tex });
    F.add({ X, mat: 'dark', prof: 'round', bw: 8, grp: 'in', shapes: [X.ell(32, 36, 13, 14)], tex: () => -1 });
    if (P.eyes) F.add({ X, mat: P.eyes, prof: 'flat', grp: 'eyes', noShadow: true, noOutline: true, shapes: [X.ell(26.5, 37, 2.2, 1.2), X.ell(37.5, 37, 2.2, 1.2)] });
    if (P.trim) F.add({ X, mat: P.trim, prof: 'round', bw: 1.6, grp: 'trim', shapes: [X.ell(32, 36, 15.2, 16.2)], cuts: [X.ell(32, 36, 13, 14)], tex: P.trimTex });
    if (P.clasp) { F.add({ X, mat: P.clasp, prof: 'round', bw: 3, grp: 'clasp', shapes: [P.leaf ? X.poly([[26, 56], [32, 50], [38, 56], [32, 62]]) : X.circ(32, 56, 4)] }); if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'clasp', noShadow: true, shapes: [X.circ(32, 56, 2)] }); }
    if (P.vine) F.add({ X, mat: P.vine, prof: 'round', bw: 1, grp: 'vine', detail: true, shapes: chain(X, [[12, 44], [15, 34], [14, 26], [19, 16], [27, 10], [35, 9]], .9).concat(thornShapes(X, [[14.6, 30, -1, -.3, 3.2, .8], [17, 20, -1, -1, 3, .8], [24, 12, -.2, -1, 3, .8], [13.4, 40, -1, .3, 3, .8]])) });
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
  F.add({ X, mat: P.cuffMat || P.mat, prof: 'round', bw: 8, grp: 'cuff', shapes: [plate ? X.poly([[16, 61], [44, 61], [47, 43], [13, 43]]) : X.poly([[18, 60], [42, 60], [44, 44], [16, 44]])], tex: P.cuffTex });
  const fingers = [X.cap(20, 22, 18, 7, 4), X.cap(28, 22, 28, 4, 4), X.cap(36, 22, 38, 6, 4), X.cap(44, 25, 49, 13, 3.6), X.cap(15, 36, 7, 27, 4.2)];
  F.add({ X, mat: P.mat, prof: 'round', bw: 10, grp: 'palm', shapes: [X.poly([[15, 46], [45, 46], [46, 22], [14, 22]])].concat(fingers), tex: plate ? ({ x, y }) => (y < 22 && y % 5 === 0 ? -1.5 : (y > 26 && y < 44 && (y - 26) % 6 === 0 ? -1 : 0)) : P.tex });
  if (P.trim) F.add({ X, mat: P.trim, prof: 'round', bw: 1.6, grp: 'trim', shapes: [X.cap(plate ? 13.5 : 16.5, 45, plate ? 46.5 : 43.5, 45, 1.8)] });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gem', noShadow: true, shapes: [X.circ(30, 34, 3.2)] });
  if (P.runes) F.add({ X, mat: P.runes, prof: 'round', bw: .7, grp: 'runes', noShadow: true, detail: true, shapes: [X.cap(20, 52, 26, 52, .7), X.cap(30, 50, 30, 56, .7), X.cap(34, 52, 40, 52, .7)] });
}
function bootsR(F, X, P) {
  F.add({ X, mat: P.mat, prof: 'round', bw: 8, grp: 'boot', shapes: [X.poly([[18, 6], [40, 6], [40, 38], [56, 46], [58, 58], [14, 58], [16, 36]])], tex: P.tex });
  if (P.greave) F.add({ X, mat: P.greave, prof: 'round', bw: 5, grp: 'greave', shapes: [X.poly([[20, 12], [38, 12], [39, 34], [29, 40], [19, 34]])], tex: TX2.plates(7) });
  F.add({ X, mat: P.trim || 'leather', prof: 'round', bw: 3, grp: 'cuff', shapes: [P.fold ? X.poly([[14, 3], [44, 3], [42, 15], [16, 15]]) : X.cap(16, 9, 42, 9, 4)], tex: P.cuffTex });
  F.add({ X, mat: P.sole || P.trim || 'leather', prof: 'round', bw: 2, grp: 'sole', shapes: [X.cap(14, 57, 58, 57, 2.8)] });
  if (P.straps) F.add({ X, mat: P.straps, prof: 'round', bw: 1.2, grp: 'straps', shapes: [X.cap(16.5, 24, 40, 20, 1.5), X.cap(16.8, 31, 40, 27, 1.5)] });
  if (P.buckle) F.add({ X, mat: P.buckle, prof: 'round', bw: 1.5, grp: 'buckle', noShadow: true, detail: true, shapes: P.leaf ? [X.poly([[34, 18], [38, 22], [34, 27], [30, 22]])] : [X.circ(36, 22, 2), X.circ(36, 29, 2)] });
  if (P.vine) F.add({ X, mat: P.vine, prof: 'round', bw: 1, grp: 'vine', detail: true, shapes: chain(X, [[17, 44], [22, 38], [30, 36], [36, 40], [44, 42], [52, 48]], 1).concat(thornShapes(X, [[25, 37, -.2, -1, 3, .8], [40, 41, .3, -1, 3, .8], [48, 45, .5, -1, 3, .8]])) });
  if (P.gem) F.add({ X, mat: P.gem, prof: 'round', bw: 2, grp: 'gem', noShadow: true, shapes: [X.circ(29, 9, 2.4)] });
}
function amuletR(F, X, P) {
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
function ringR(F, X, P) {
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
function plateR(F, X, P) {
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
}

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
