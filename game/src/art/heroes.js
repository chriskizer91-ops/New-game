// Ported from prototypes/item-card.html (the approved Loot Forge art pipeline).
// Layered hero sprites (56x60 canvas). Gear "looks" change the layers.
import { MAT, hx, mix, hash, Xf, Forge } from './forge.js';
import { RECIPE } from './recipes.js';

/* ==== HEROES: layered part lists ==== */
const BUILD = {
  human: { hc: [16, 10.8], hr: 6.6, sh: 19.4, wa: 28.6, sk: 35, legT: 32, legB: 41.3, bootT: 39.4, shW: 6.3, waW: 5.4, skW: 7.6, hL: [7.6, 30], hR: [24.4, 30], aL: [9.6, 20.3], aR: [22.4, 20.3] },
  dwarf: { hc: [16, 16.4], hr: 6.9, sh: 24.2, wa: 32.4, sk: 37.4, legT: 36, legB: 42.3, bootT: 40.6, shW: 8.4, waW: 7.8, skW: 8.8, hL: [5.4, 33.4], hR: [26.6, 33.4], aL: [8.4, 25], aR: [23.6, 25] },
};
function heroForge(H, opt = {}) {
  const W = 56, Hh = 60, OX = 12, OY = 8;
  const F = new Forge(W, Hh), X = Xf(OX, OY, 1, 0, 1), b = BUILD[H.build];
  const [cx, cy] = b.hc, r = b.hr;
  const g = opt.gear || {};
  const body = g.body || { mat: 'gambeson' };
  // cloak behind
  if (H.cloak) F.add({ X, mat: H.cloak, prof: 'round', bw: 3, grp: 'cloak', shapes: [X.poly([[16 - b.shW - .5, b.sh - 1], [16 + b.shW + .5, b.sh - 1], [16 + b.shW + 3, b.wa + 1], [16 + b.shW + 4.4, 44], [16 + 5, 45.2], [16, 44.2], [16 - 5, 45.2], [16 - b.shW - 4.4, 44], [16 - b.shW - 3, b.wa + 1]])] });
  if (H.hair === 'long') F.add({ X, mat: H.hairMat, prof: 'round', bw: 3, grp: 'hairback', shapes: [X.poly([[cx - 8, cy - 2], [cx - 8.8, cy + 6], [cx - 9.4, cy + 12.5], [cx - 5, cy + 13.4], [cx + 5, cy + 13.4], [cx + 9.4, cy + 12.5], [cx + 8.8, cy + 6], [cx + 8, cy - 2]])], tex: ({ x }) => (x % 3 === 0 ? -1 : 0) });
  if (H.hair === 'pony') F.add({ X, mat: H.hairMat, prof: 'round', bw: 2, grp: 'hairback', shapes: [X.cap(cx + 5.5, cy - 3, cx + 9.5, cy + 3, 2.4, 2), X.cap(cx + 9.5, cy + 3, cx + 9, cy + 10, 2, 1.1)] });
  const bootMat = (g.feet && g.feet.mat) || 'leather';
  const drawBoots = () => { for (const s of [-1, 1]) F.add({ X, mat: bootMat, prof: 'round', bw: 1.6, grp: 'boot' + s, shapes: [X.poly(s < 0 ? [[10.2, b.bootT], [15.4, b.bootT], [15.6, 45.2], [15.4, 46.6], [8.4, 46.6], [8.2, 45.2], [10, 43]] : [[16.6, b.bootT], [21.8, b.bootT], [22, 43], [23.8, 45.2], [23.6, 46.6], [16.6, 46.6], [16.4, 45.2]])] }); };
  if (H.robe) drawBoots();
  // legs / robe
  if (H.robe) F.add({ X, mat: H.robe, prof: 'round', bw: 4, grp: 'robe', shapes: [X.poly([[16 - b.waW, b.wa], [16 + b.waW, b.wa], [16 + b.skW + 1.5, 45.4], [16, 46.4], [16 - b.skW - 1.5, 45.4]])], tex: ({ x, y }) => (y - OY >= 44.6 ? { m: 'gold', dd: 0 } : ((x * 2 + y) % 7 === 0 ? -1 : 0)) });
  else {
    for (const s of [-1, 1]) F.add({ X, mat: 'pants', prof: 'round', bw: 2.4, grp: 'leg' + s, shapes: [X.cap(16 + s * 2.9, b.legT, 16 + s * 3.1, b.legB, 2.5)] });
  }
  if (!H.robe) drawBoots();
  // torso
  const tp = [[16 - b.shW + .3, b.sh - 1], [16 + b.shW - .3, b.sh - 1], [16 + b.shW + .7, b.sh + 2.5], [16 + b.waW + .6, b.wa], [16 + b.skW, b.sk], [16, b.sk + .8], [16 - b.skW, b.sk], [16 - b.waW - .6, b.wa], [16 - b.shW - .7, b.sh + 2.5]];
  F.add({ X, mat: body.mat, prof: 'round', bw: 4, grp: 'torso', shapes: [X.poly(tp)], tex: body.tex });
  if (body.apron) F.add({ X, mat: body.apron, prof: 'round', bw: 3, grp: 'apron', shapes: [X.poly([[16 - 4, b.sh + 2], [16 + 4, b.sh + 2], [16 + 5.5, b.sk + 1.5], [16 - 5.5, b.sk + 1.5]])] });
  const tabard = body.tabard || H.tabard;
  if (tabard) F.add({ X, mat: tabard, prof: 'round', bw: 2.5, grp: 'tabard', shapes: [X.poly([[13.4, b.sh - .5], [18.6, b.sh - .5], [19.2, b.sk + .5], [16, b.sk + 2.2], [12.8, b.sk + .5]])], tex: ({ x, y }) => { const Y = y - OY, X0 = x - OX; return ((Y === Math.round(b.sh + 4) && X0 >= 15 && X0 <= 16) || (Y === Math.round(b.sh + 3) && (X0 === 15 || X0 === 16) && ((x + y) & 1)) ? { m: 'gold', dd: 1 } : 0); } });
  if (body.trim) F.add({ X, mat: body.trim, prof: 'round', bw: 1, grp: 'trim', shapes: [X.cap(16 - b.skW + .5, b.sk - .3, 16, b.sk + .6, .9), X.cap(16, b.sk + .6, 16 + b.skW - .5, b.sk - .3, .9), X.cap(16, b.sh, 16, b.sk, .7)] });
  F.add({ X, mat: 'leather', prof: 'round', bw: 1, grp: 'belt', shapes: [X.cap(16 - b.waW - .6, b.wa, 16 + b.waW + .6, b.wa, 1.15)] });
  F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'buckle', shapes: [X.circ(16, b.wa, 1.3)] });
  // mantle
  if (H.mantle) F.add({ X, mat: H.mantle, prof: 'round', bw: 2, grp: 'mantle', shapes: [X.cap(16 - b.shW + .5, b.sh, 16 + b.shW - .5, b.sh, 2.3)] });
  if (body.pauldrons) for (const s of [-1, 1]) F.add({ X, mat: body.pauldrons, prof: 'round', bw: 2.4, grp: 'pd' + s, shapes: [X.ell(16 + s * (b.shW + .2), b.sh + .6, 3.2, 2.4)], tex: body.tex });
  const sleeve = body.sleeve || body.mat;
  // right arm (viewer right) + off-hand
  F.add({ X, mat: sleeve, prof: 'round', bw: 2.2, grp: 'armR', shapes: [X.cap(b.aR[0], b.aR[1], b.hR[0], b.hR[1] - 1.8, 2.3, 2)], tex: body.tex });
  const glove = (g.hands && g.hands.mat) || 'leather';
  F.add({ X, mat: glove, prof: 'round', bw: 2, grp: 'handR', shapes: [X.circ(b.hR[0], b.hR[1], 2.1)] });
  if (g.offhand) offhandParts(F, X, b, g.offhand);
  // left arm + weapon + hand
  F.add({ X, mat: sleeve, prof: 'round', bw: 2.2, grp: 'armL', shapes: [X.cap(b.aL[0], b.aL[1], b.hL[0], b.hL[1] - 1.8, 2.3, 2)], tex: body.tex });
  if (g.weapon) {
    const w = g.weapon, R = RECIPE[w.r], k = w.k || .36;
    const ax = w.axis || [-1, -1], l = Math.hypot(...ax), a = [ax[0] / l, ax[1] / l], p = [-a[1], a[0]];
    const [gt, gs] = R.grip; const hx0 = b.hL[0] + OX, hy0 = b.hL[1] + OY;
    const WX = Xf(hx0 - (a[0] * gt + p[0] * gs) * k, hy0 - (a[1] * gt + p[1] * gs) * k, a[0], a[1], k, .75);
    R.fn(F, WX, w.p);
  }
  F.add({ X, mat: glove, prof: 'round', bw: 2, grp: 'handL', shapes: [X.circ(b.hL[0], b.hL[1], 2.1)] });
  // neck, head, hair, beard, helm
  F.add({ X, mat: H.skin, prof: 'round', bw: 1.8, grp: 'neck', shapes: [X.cap(16, cy + 4, 16, b.sh - .5, 1.9)] });
  if (H.ears) for (const s of [-1, 1]) F.add({ X, mat: H.skin, prof: 'round', bw: 1, grp: 'ear' + s, shapes: [X.poly([[cx + s * 5.8, cy - .2], [cx + s * 9.2, cy - 2.6], [cx + s * 6.4, cy + 2.2]])] });
  F.add({ X, mat: H.skin, prof: 'round', bw: 6, grp: 'head', shapes: [X.ell(cx, cy, r + .1, r - .3)] });
  if (H.beard) F.add({ X, mat: H.hairMat, prof: 'round', bw: 3, grp: 'beard', shapes: [X.poly([[cx - 6.4, cy + .6], [cx - 7.2, cy + 5], [cx - 5.8, cy + 9.2], [cx - 3.2, cy + 12], [cx - 1.4, cy + 15.2], [cx, cy + 16.4], [cx + 1.4, cy + 15.2], [cx + 3.2, cy + 12], [cx + 5.8, cy + 9.2], [cx + 7.2, cy + 5], [cx + 6.4, cy + .6], [cx + 4.2, cy + 3.2], [cx + 2, cy + 2.4], [cx, cy + 3.4], [cx - 2, cy + 2.4], [cx - 4.2, cy + 3.2]])], tex: ({ x, y }) => (((x + (y >> 1)) % 3) === 0 ? -1 : 0) });
  if (H.beard) F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'beardring', shapes: [X.cap(cx - 1.3, cy + 11.6, cx + 1.3, cy + 11.6, .9)] });
  const hairPts = [[-7.7, 3.7], [-7.8, -1.8], [-6.5, -5.8], [-3.5, -8.2], [0, -8.8], [3.5, -8.2], [6.5, -5.8], [7.8, -1.8], [7.7, 3.7], [5.8, 2.2], [5.5, -1.3], [4, -.6], [3, -2.2], [1.5, -.8], [0, -2.2], [-1.5, -.8], [-3, -2.2], [-4, -.6], [-5.5, -1.3], [-5.8, 2.2]];
  if (H.hair !== 'none') F.add({ X, mat: H.hairMat, prof: 'round', bw: 3, grp: 'hair', shapes: [X.poly(hairPts.map(([x, y]) => [cx + x, cy + y]))], tex: ({ x, y }) => ((x * 3 + y) % 5 === 0 ? -1 : 0) });
  if (g.head) helmParts(F, X, b, g.head, H);
  return { F, b, OX, OY };
}
function offhandParts(F, X, b, o) {
  const [x, y] = b.hR;
  if (o.look === 'buckler' || o.look === 'round') {
    const r = o.look === 'round' ? 6.4 : 4.6, cx = x + .6, cy = y - 1.2;
    F.add({ X, mat: o.face || 'wood', prof: 'round', bw: r * .6, hs: .6, grp: 'shield', shapes: [X.circ(cx, cy, r)], tex: ({ x: px }) => (px % 3 === 0 ? -1 : 0) });
    F.add({ X, mat: o.rim || 'iron', prof: 'round', bw: 1, grp: 'shieldrim', shapes: [X.circ(cx, cy, r)], cuts: [X.circ(cx, cy, r - 1.3)] });
    F.add({ X, mat: o.rim || 'iron', prof: 'round', bw: 1.6, grp: 'shieldboss', shapes: [X.circ(cx, cy, o.look === 'round' ? 2 : 1.5)] });
  } else if (o.look === 'sigil') {
    F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'sigilchain', shapes: [X.cap(x, y + .5, x + .3, y + 3.5, .55)] });
    F.add({ X, mat: 'gold', prof: 'round', bw: 2.4, grp: 'sigil', shapes: [X.circ(x + .3, y + 5.2, 2.6)] });
    F.add({ X, mat: 'ember', prof: 'round', bw: 1, grp: 'sigil', noShadow: true, shapes: [X.circ(x + .3, y + 5.2, 1.2)] });
  }
}
function helmParts(F, X, b, h, H) {
  const [cx, cy] = b.hc;
  if (h.look === 'kettle') {
    F.add({ X, mat: 'steel', prof: 'round', bw: 5, grp: 'helm', shapes: [X.ell(cx, cy - 2.6, 7.7, 7)], clip: X.poly([[cx - 12, cy - 14], [cx + 12, cy - 14], [cx + 12, cy - 2], [cx - 12, cy - 2]]) });
    F.add({ X, mat: 'steel', prof: 'round', bw: 1.4, grp: 'brim', shapes: [X.cap(cx - 9.6, cy - 1.6, cx + 9.6, cy - 1.6, 1.3)] });
  } else if (h.look === 'hood') {
    F.add({ X, mat: h.mat, prof: 'round', bw: 3.5, grp: 'hood', shapes: [X.ell(cx, cy - .8, 8.4, 8.4), X.poly([[cx - 8.2, cy + 3], [cx + 8.2, cy + 3], [cx + 8.4, b.sh + 1.2], [cx - 8.4, b.sh + 1.2]]), X.poly([[cx - 3, cy - 8], [cx + 3.5, cy - 9.6], [cx + 1.5, cy - 6]])], cuts: [X.ell(cx, cy + 1.3, 5.7, 5.5)] });
  } else if (h.look === 'circlet') {
    F.add({ X, mat: 'gold', prof: 'round', bw: 1, grp: 'circlet', shapes: [X.cap(cx - 7, cy - 1.4, cx - 2.5, cy - 2.6, .85), X.cap(cx - 2.5, cy - 2.6, cx + 2.5, cy - 2.6, .85), X.cap(cx + 2.5, cy - 2.6, cx + 7, cy - 1.4, .85)] });
    F.add({ X, mat: h.gem || 'ember', prof: 'round', bw: 1, grp: 'circlet', noShadow: true, shapes: [X.circ(cx, cy - 2.7, 1.25)] });
  } else if (h.look === 'coif') {
    F.add({ X, mat: h.mat, prof: 'round', bw: 5, grp: 'coif', shapes: [X.ell(cx, cy - 2.2, 7.7, 7.2)], clip: X.poly([[cx - 12, cy - 14], [cx + 12, cy - 14], [cx + 12, cy - 1.2], [cx - 12, cy - 1.2]]) });
    F.add({ X, mat: 'leather', prof: 'round', bw: 1, grp: 'coifband', shapes: [X.cap(cx - 7.6, cy - 1.6, cx + 7.6, cy - 1.6, 1.1)] });
  } else if (h.look === 'crown') {
    const by = cy - 5.2;
    const tine = (x, hgt, w) => X.poly([[x - w, by], [x, by - hgt], [x + w, by]]);
    F.add({ X, mat: 'bronze', prof: 'bevel', bw: .8, grp: 'crown', shapes: [tine(cx - 5.6, 3.2, 1.5), tine(cx - 2.9, 4.4, 1.5), tine(cx, 6.6, 1.9), tine(cx + 2.9, 4.4, 1.5), tine(cx + 5.6, 3.2, 1.5)], tex: ({ x, y }) => (hash(x, y, 4) < .3 ? { m: 'verdigris' } : 0) });
    F.add({ X, mat: 'bronze', prof: 'round', bw: 1.2, grp: 'crownband', shapes: [X.cap(cx - 7.2, by + .6, cx + 7.2, by + .6, 1.35)] });
    F.add({ X, mat: 'prism', prof: 'round', bw: 1, grp: 'crownband', noShadow: true, shapes: [X.circ(cx, by + .4, 1.3)] });
    for (const s of [-1, 1]) F.add({ X, mat: 'bronze', prof: 'round', bw: 1, grp: 'bell' + s, shapes: [X.poly([[cx + s * 7.4 - 1, by + 2.2], [cx + s * 7.4 + 1, by + 2.2], [cx + s * 7.4 + 1.6, by + 4.6], [cx + s * 7.4 - 1.6, by + 4.6]])] });
  }
}
function heroFace(img, H, b, OX, OY, blink) {
  const w = img.width, d = img.data;
  const set = (x, y, c) => { const i = ((y + OY) * w + x + OX) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  const ey = Math.round(b.hc[1] + .1), eye = hx(H.eye || '#1c1f38'), wht = hx('#f4ecd8');
  for (const x of [12, 19]) { if (blink) { set(x, ey + 1, eye); } else { set(x, ey, eye); set(x, ey + 1, eye); } }
  if (!blink) { set(12, ey, mix(eye, wht, .55)); set(19, ey, mix(eye, wht, .55)); }
  if (!H.beard) { const m = MAT[H.skin].pal[1]; set(15, ey + 3, m); set(16, ey + 3, m); const bl = mix(MAT[H.skin].pal[3], [230, 110, 100], .45); set(11, ey + 2, bl); set(20, ey + 2, bl); }
}

export { BUILD, heroForge, offhandParts, helmParts, heroFace };
