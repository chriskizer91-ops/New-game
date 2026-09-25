// Ported from prototypes/item-card.html (the approved Loot Forge art pipeline).
// Vector-to-pixel renderer: shapes -> per-pixel height -> lit, palette-quantized,
// outlined, rim-lit pixel art. Browser-only at compose() (uses ImageData).
/* ==== PIXEL FORGE: vector-to-pixel renderer ==== */
const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const ramp = s => s.split(' ').map(hx);
const MAT = {
  steel:     { pal: ramp('#15142a #2c3050 #4d5878 #7d8da8 #b4c3d2 #eef4f2'), ks: .9, shin: 30, contrast: 3.4, metal: 1 },
  heat:      { pal: ramp('#1e1020 #4a2230 #8a4238 #c87a4c #f2b67a #fff0d0'), ks: .9, shin: 30, contrast: 3.4, metal: 1 },
  robeRed:   { pal: ramp('#1c0a0e #3a1218 #5e1e22 #84302a #a84a34 #c86c44'), ks: 0 },
  rust:      { pal: ramp('#24110e #4a2218 #7a3a20 #a55a2c #c7874c #e0b378'), ks: .3, shin: 6, dither: .5 },
  iron:      { pal: ramp('#100f1c #1f2134 #363b52 #566079 #8290a8 #bccad8'), ks: 1, shin: 24, contrast: 3.8, metal: 1 },
  gold:      { pal: ramp('#2a1208 #642a10 #a35616 #d99328 #f5cd58 #fff4c0'), ks: 1.6, shin: 22, metal: 1 },
  bronze:    { pal: ramp('#1c120e #452816 #744624 #a87034 #d4a256 #f2d894'), ks: 1.8, shin: 16, metal: 1 },
  verdigris: { pal: ramp('#0b201f #143b36 #1f5f52 #358c70 #6cbc96 #b8e6c6'), ks: .4, shin: 8 },
  wood:      { pal: ramp('#1c0f0b #3a1e12 #5e331b #865026 #ae773a #d6a562'), ks: .25, shin: 8 },
  bogwood:   { pal: ramp('#120c0a #261811 #402a1a #5e4428 #836638 #ab8e52'), ks: .5, shin: 10 },
  leather:   { pal: ramp('#1a0e0b #361a12 #57301d #7c4528 #a0643a #c48c58'), ks: .3, shin: 8 },
  leatherRed:{ pal: ramp('#1c070a #3e0e14 #691a1c #962a22 #c04a2e #de7a46'), ks: .4, shin: 8 },
  clothTeal: { pal: ramp('#081719 #0f2c2c #184640 #25665a #3f8c76 #74b89a'), ks: 0 },
  bone:      { pal: ramp('#1d1813 #463a2a #74664a #a4926c #d0c296 #f2ead0'), ks: .6, shin: 10 },
  string:    { pal: ramp('#3a3428 #6a604a #a89a78 #cfc4a0 #e8e0c4 #f8f4e4'), ks: 0, flat: 3 },
  ember:     { pal: ramp('#360a06 #761c08 #bf3e0c #ee7a1c #ffbe48 #fff4b4'), emit: 1, eBase: 3.3 },
  frost:     { pal: ramp('#0a1e34 #163f6c #2a74b4 #5cb0e4 #a8e0f8 #effcff'), emit: 1 },
  water:     { pal: ramp('#081c2c #123a56 #246a8c #48a4c6 #94daf0 #e6fbff'), emit: 1, eBase: 2.6 },
  rime:      { pal: ramp('#182640 #3a5676 #6a8cac #a4c4dc #d6eaf6 #ffffff'), ks: 1.2, shin: 12, base: 3.6 },
  ruby:      { pal: ramp('#22050d #530b1c #93162e #d22e3c #ff7866 #ffe2d2'), gem: 1 },
  sapphire:  { pal: ramp('#080c28 #122462 #1e4aa8 #3884e2 #88c4ff #eaf6ff'), gem: 1 },
  seaglass:  { pal: ramp('#04181c #0a3840 #146a72 #2aaaa8 #84e2d4 #eefff6'), gem: 1 },
  amethyst:  { pal: ramp('#140824 #341050 #5a1e88 #8c3cc4 #c47ee8 #f2dcff'), gem: 1 },
  emerald:   { pal: ramp('#041a10 #0a3a20 #146a34 #26a04c #74d67c #e0ffd8'), gem: 1 },
  pearl:     { pal: ramp('#26222c #534c62 #87839a #bcbacb #e2e2ec #ffffff'), ks: 1.6, shin: 10, base: 3.4 },
  seaweed:   { pal: ramp('#06110c #0d2216 #173820 #25542e #3b733e #5f9452'), ks: .3, shin: 6 },
  prism:     { pal: ramp('#04181c #0a3840 #146a72 #2aaaa8 #84e2d4 #eefff6'), gem: 1, prism: 1 },
  drake:     { pal: ramp('#06140f #0d2a1e #164230 #22603e #3a8450 #6aaa66'), ks: 1.1, shin: 14 },
  skin:      { pal: ramp('#3a1a14 #7a3a2a #b8664a #e29a72 #f6c69c #fff0d8'), ks: .15, shin: 6, contrast: 3.6 },
  skinTan:   { pal: ramp('#2e150e #633020 #9a5836 #c68454 #e2ae7a #f6d6a8'), ks: .15, shin: 6, contrast: 3.6 },
  skinDeep:  { pal: ramp('#1e0e0a #3e1c12 #643020 #8c4a2e #b06a44 #d49468'), ks: .2, shin: 6, contrast: 3.6 },
  hairAuburn:{ pal: ramp('#1a0a08 #3a140e #662616 #924020 #bc6430 #dc9050'), ks: .8, shin: 8 },
  hairBlack: { pal: ramp('#0c0a10 #1a1620 #2c2634 #443c4c #625a6a #8a8292'), ks: .8, shin: 8 },
  hairCopper:{ pal: ramp('#200c06 #4a1c0c #7c3414 #b0561c #d8802c #f2ae50'), ks: .8, shin: 8 },
  hairSilver:{ pal: ramp('#1a1a22 #3a3a48 #626274 #9090a2 #c0c0cc #ececf2'), ks: .8, shin: 8 },
  gambeson:  { pal: ramp('#1e1812 #3e3226 #62523e #8a7658 #b09c78 #d4c49c'), ks: 0 },
  cloakRed:  { pal: ramp('#1a0708 #3c0f12 #641a1a #8e2a22 #b44632 #d6704a'), ks: 0 },
  cloakGreen:{ pal: ramp('#0a140e #142a1c #1f422a #2e5e38 #467e4a #6ea064'), ks: 0 },
  robe:      { pal: ramp('#2a2420 #57493c #84725c #b09c7e #d6c6a4 #f2e8cc'), ks: 0 },
  pants:     { pal: ramp('#0f0d16 #1d1a28 #2e2a3e #443e56 #5e5670 #807896'), ks: 0 },
  wool:      { pal: ramp('#16140f #2e2a20 #4a4434 #6a624a #8c8464 #b0a886'), ks: 0 },
  dark:      { pal: ramp('#07060a #0e0c12 #16131b #1f1b25 #29242f #332d3a'), ks: 0 },
  // ---- added for the battle layer: aspect glows (emissive) ----
  storm:     { pal: ramp('#120c34 #2c2a8c #4a62e2 #7ab8ff #d4f2ff #fffce0'), emit: 1, eBase: 3.2 },
  amber:     { pal: ramp('#2a1404 #5e300a #a05e12 #da9426 #f8c85a #fff2c0'), emit: 1, eBase: 3.1 },
  verdant:   { pal: ramp('#041c0a #0c4214 #1c8024 #4ec436 #a6f066 #effcc8'), emit: 1, eBase: 3.1 },
  radiant:   { pal: ramp('#3a2408 #8a6418 #d4ae3a #f8e27e #fff8d4 #ffffff'), emit: 1, eBase: 3.2 },
  blight:    { pal: ramp('#140620 #3a0e50 #6a2682 #7e8a4c #b4d65a #eaffa8'), emit: 1, eBase: 3.3 },
  arcane:    { pal: ramp('#1a0830 #3e1470 #6e2ac0 #a45cf0 #d8a8ff #f8eaff'), emit: 1, eBase: 3.1 },
  primal:    { pal: ramp('#1c2030 #4a5680 #9aaad8 #dce8ff #f6faff #ffffff'), emit: 1, eBase: 3.4 },
  eyeRed:    { pal: ramp('#300406 #700a0c #b8141a #f03a2a #ff8a60 #ffe0c0'), emit: 1, eBase: 3.4 },
  // ---- metals / gems ----
  silver:    { pal: ramp('#15161e #30323e #585c6c #8e94a6 #c8cedc #f6f8fc'), ks: 1.2, shin: 26, contrast: 3.6, metal: 1 },
  blackiron: { pal: ramp('#08070c #121119 #1c1b26 #2c2c3a #464858 #707486'), ks: 1.1, shin: 22, contrast: 3.6, metal: 1 },
  topaz:     { pal: ramp('#2a1004 #6a300a #b46414 #ec9e2a #ffd66a #fff6d0'), gem: 1 },
  stormglass:{ pal: ramp('#0c0a2a #1e1c6a #3a3cb8 #6a78f0 #b0c4ff #f4f6ff'), gem: 1 },
  granite:   { pal: ramp('#18181c #32302e #504b46 #726a60 #988e80 #c2b8a6'), ks: .2, shin: 6, dither: .35 },
  // ---- cloth / leather / hair / skin ----
  rags:      { pal: ramp('#16110d #2e241a #4a3c2a #66543a #82704e #a08c66'), ks: 0, dither: .3 },
  clothWhite:{ pal: ramp('#24242e #4e4e60 #828296 #b6b6c6 #dcdce6 #fafaff'), ks: 0 },
  robeBark:  { pal: ramp('#120c09 #261a12 #3e2c1c #574028 #725836 #92744a'), ks: 0 },
  clothGrey: { pal: ramp('#0e0e12 #1c1c22 #2c2c34 #40404a #585862 #76767e'), ks: 0 },
  clothBlue: { pal: ramp('#080c1c #101a36 #1a2c56 #284478 #3c629c #5e88bc'), ks: 0 },
  hoodGreen: { pal: ramp('#07140a #10281a #183e22 #22582c #347838 #58a04c'), ks: 0 },
  leatherDark:{ pal: ramp('#0c0909 #1a1313 #2a1f1e #3c2c2a #54403a #6e5850'), ks: .35, shin: 8 },
  parchment: { pal: ramp('#2a2014 #5a4a30 #8a7652 #b8a47a #dccca0 #f6ecd0'), ks: 0 },
  paintGreen:{ pal: ramp('#08160c #10301a #1a4e26 #2a6e34 #46904a #6cb466'), ks: .2, shin: 6 },
  paintRed:  { pal: ramp('#1a0606 #3c0e0e #661814 #902a1e #b8462c #d8704a'), ks: .2, shin: 6 },
  hairBrown: { pal: ramp('#120b08 #2a1810 #45291a #633c24 #845634 #a8784c'), ks: .8, shin: 8 },
  hairBlond: { pal: ramp('#2a1a08 #58380e #8a6020 #bc9038 #e0bc62 #f6e4a4'), ks: .8, shin: 8 },
  hairMoss:  { pal: ramp('#0a0f08 #172212 #26361c #384e26 #506a32 #718a44'), ks: .7, shin: 8 },
  skinPale:  { pal: ramp('#3a2220 #74463c #a8705c #d49c84 #f0c6ae #fff0e2'), ks: .15, shin: 6, contrast: 3.6 },
  skinAsh:   { pal: ramp('#1e1a1c #3e3438 #62555a #86787a #a89c9a #cac0bc'), ks: .15, shin: 6, contrast: 3.6 },
  // ---- creatures ----
  wolfFur:   { pal: ramp('#100e10 #262024 #3e3538 #5c4f4c #847264 #ab9a84'), ks: .25, shin: 6 },
  wolfPale:  { pal: ramp('#221e1c #4a4038 #766a5a #a29680 #c8bea4 #e6dcc4'), ks: .2, shin: 6 },
  grizzle:   { pal: ramp('#16120f #2e2721 #4a4038 #6c6052 #928674 #b8ae9a'), ks: .25, shin: 6 },
  boarHide:  { pal: ramp('#0c0807 #1c1210 #2e1e18 #452e22 #604230 #7e5a40'), ks: .3, shin: 6 },
  snout:     { pal: ramp('#1e0e10 #42222a #6a3c42 #94605e #b88678 #d6ac98'), ks: .4, shin: 10 },
  stagWhite: { pal: ramp('#2a2830 #56525c #8a8690 #bcb8bc #e2ded8 #fffcf2'), ks: .2, shin: 6 },
  rot:       { pal: ramp('#060409 #100b14 #1b1320 #291c2e #3a2940 #4e3a54'), ks: .6, shin: 14 },
  sap:       { pal: ramp('#040306 #0a0610 #120a18 #1e1024 #2e1a36 #4a2e50'), ks: 2.2, shin: 30, contrast: 3 },
  bark:      { pal: ramp('#0e0907 #1e140e #322216 #4a331f #66482a #886238'), ks: .2, shin: 6 },
  rotwood:   { pal: ramp('#08060a #141016 #221a22 #32262e #46343a #5e4848'), ks: .3, shin: 8 },
  bramble:   { pal: ramp('#0a1008 #152014 #22341c #324a24 #4a662c #6e8a3a'), ks: .3, shin: 8 },
  thorn:     { pal: ramp('#1c120a #3e2616 #684226 #94683a #c0965a #e8c890'), ks: .7, shin: 12 },
  moss:      { pal: ramp('#081206 #10240c #1a3a12 #28541a #3e7224 #5e9234'), ks: .1, shin: 6, dither: .3 },
  flesh:     { pal: ramp('#160406 #34080e #5a1218 #842424 #a8443a #c86a58'), ks: .8, shin: 14 },
  claw:      { pal: ramp('#141010 #2e2622 #544638 #7e6c52 #aa9876 #d8caa6'), ks: 1, shin: 14 },
};
MAT.tide = MAT.water; // aspect alias
const OUTLINE = hx('#0b0910');
const L3 = (() => { const v = [-1, -1.15, 1.45], l = Math.hypot(...v); return v.map(a => a / l); })();
const HV = (() => { const v = [L3[0], L3[1], L3[2] + 1], l = Math.hypot(...v); return v.map(a => a / l); })();
const FLATD = L3[2];
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16 - .5);
const bayer = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
function hash(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

/* signed "inside distance": positive inside a shape */
function sdPoly(px, py, pts) {
  let dm = 1e9, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    const ex = xi - xj, ey = yi - yj, wx = px - xj, wy = py - yj;
    let t = (wx * ex + wy * ey) / (ex * ex + ey * ey || 1); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = wx - ex * t, dy = wy - ey * t, d = dx * dx + dy * dy; if (d < dm) dm = d;
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  const d = Math.sqrt(dm); return inside ? d : -d;
}
function sdShape(s, x, y) {
  switch (s.k) {
    case 'p': return sdPoly(x, y, s.pts);
    case 'c': { const ex = s.b[0] - s.a[0], ey = s.b[1] - s.a[1], wx = x - s.a[0], wy = y - s.a[1], L2 = ex * ex + ey * ey; let t = L2 ? (wx * ex + wy * ey) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return s.ra + (s.rb - s.ra) * t - Math.hypot(wx - ex * t, wy - ey * t); }
    case 'o': return s.r - Math.hypot(x - s.c[0], y - s.c[1]);
    case 'e': { const k = Math.hypot((x - s.c[0]) / s.rx, (y - s.c[1]) / s.ry); return (1 - k) * Math.min(s.rx, s.ry); }
  }
}
function shapeBB(s) {
  switch (s.k) {
    case 'p': { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of s.pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; }
    case 'c': { const r = Math.max(s.ra, s.rb); return [Math.min(s.a[0], s.b[0]) - r, Math.min(s.a[1], s.b[1]) - r, Math.max(s.a[0], s.b[0]) + r, Math.max(s.a[1], s.b[1]) + r]; }
    case 'o': return [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
    case 'e': return [s.c[0] - s.rx, s.c[1] - s.ry, s.c[0] + s.rx, s.c[1] + s.ry];
  }
}
/* transform: t = along axis, s = across (perp = axis rotated +90deg), k = scale */
function Xf(ox, oy, ax, ay, k, rm = 0) {
  const l = Math.hypot(ax, ay); ax /= l; ay /= l; const px = -ay, py = ax;
  const P = (t, s) => [ox + (ax * t + px * s) * k, oy + (ay * t + py * s) * k];
  return {
    k, ax, ay, px, py, ox, oy, P,
    poly: pts => ({ k: 'p', pts: pts.map(([t, s]) => P(t, s)) }),
    cap: (t1, s1, t2, s2, r1, r2 = r1) => ({ k: 'c', a: P(t1, s1), b: P(t2, s2), ra: Math.max(r1 * k, rm), rb: Math.max(r2 * k, rm) }),
    circ: (t, s, r) => ({ k: 'o', c: P(t, s), r: Math.max(r * k, rm) }),
    ell: (t, s, rx, ry) => ({ k: 'e', c: P(t, s), rx: rx * k, ry: ry * k }),
    uv: (x, y) => { const dx = (x - ox) / k, dy = (y - oy) / k; return [dx * ax + dy * ay, dx * px + dy * py]; },
  };
}

class Forge {
  constructor(w, h) { this.w = w; this.h = h; this.parts = []; }
  add(p) { // p: {mat, shapes, cuts, clip, prof, bw, hs, tex, grp, noOutline, noShadow, X, detail}
    p.prof = p.prof || 'bevel'; p.bw = p.bw ?? 1.5; p.hs = p.hs ?? 1; p.grp = p.grp ?? this.parts.length;
    if (p.X && p.bw) p.bw = Math.max(.7, p.bw * p.X.k);
    if (p.detail && p.X && p.X.k < .6) return null;
    let bb = [1e9, 1e9, -1e9, -1e9];
    for (const s of p.shapes) { const b = shapeBB(s); bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])]; }
    p.bb = bb; this.parts.push(p); return p;
  }
  D(p, x, y) {
    let d = -1e9; for (const s of p.shapes) { const v = sdShape(s, x, y); if (v > d) d = v; }
    if (p.cuts) for (const s of p.cuts) { const v = -sdShape(s, x, y); if (v < d) d = v; }
    if (p.clip) { const v = sdShape(p.clip, x, y); if (v < d) d = v; }
    return d;
  }
  Hh(p, x, y) {
    let d = this.D(p, x, y); if (d < 0) return d * p.hs * 1.5;
    if (p.prof === 'round') { const r = p.bw, q = Math.min(d, r); return Math.sqrt(Math.max(0, r * r - (r - q) * (r - q))) * p.hs; }
    if (p.prof === 'ridge') return d * p.hs;
    if (p.prof === 'flat') return 0;
    return Math.min(d, p.bw) * p.hs;
  }
  // raster({ mirror }) mirrors the geometry left-right while keeping the light top-left,
  // so a sprite authored facing one way can face the other with consistent shading.
  raster(ro = {}) {
    const { w, h, parts } = this, N = w * h, mir = !!ro.mirror;
    parts.forEach((p, i) => p.i = i);
    const own = new Int16Array(N).fill(-1), idx = new Int8Array(N), mat = new Array(N), emi = new Uint8Array(N), dist = new Float32Array(N);
    const val = new Float32Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = mir ? w - x - .5 : x + .5, cy = y + .5; let o = -1, d = 0;
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k], b = p.bb; if (cx < b[0] - .5 || cy < b[1] - .5 || cx > b[2] + .5 || cy > b[3] + .5) continue;
        const v = this.D(p, cx, cy); if (v > 0) { o = k; d = v; break; }
      }
      if (o < 0) continue;
      const p = parts[o], i = y * w + x; own[i] = o; dist[i] = d;
      const e = .5;
      const gx = (this.Hh(p, cx + e, cy) - this.Hh(p, cx - e, cy)) / (2 * e), gy = (this.Hh(p, cx, cy + e) - this.Hh(p, cx, cy - e)) / (2 * e);
      let nx = mir ? gx : -gx, ny = -gy, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      let mname = p.mat, dd = 0, em = MAT[p.mat].emit;
      if (p.tex) {
        const uv = p.X ? p.X.uv(cx, cy) : [cx, cy];
        const r = p.tex({ x: mir ? w - 1 - x : x, y, cx, cy, u: uv[0], v: uv[1], d, nx, ny, nz, k: p.X ? p.X.k : 1 });
        if (typeof r === 'number') dd = r; else if (r) { if (r.m) { mname = r.m; em = MAT[r.m].emit; } dd = r.dd || 0; if (r.e !== undefined) em = r.e; }
      }
      const m = MAT[mname]; let v;
      const diff = Math.max(0, nx * L3[0] + ny * L3[1] + nz * L3[2]);
      const sp = Math.pow(Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]), m.shin || 10);
      if (em) v = (m.eBase ?? 3) + Math.min(d, 2.4) * .55 + dd;
      else if (m.gem) {
        const refr = Math.max(0, nx * .55 + ny * .65 + nz * .5);
        v = 2.2 + (diff - FLATD) * 3 + sp * 3.2 + refr * 1.4 - (d < 1.1 ? .9 : 0) + dd;
      } else if (m.flat !== undefined) v = m.flat + dd;
      else { const c = m.contrast ?? 4.4; v = (m.base ?? 3) + (diff - FLATD) * (diff > FLATD ? c : c * (m.cs ?? .6)) + sp * (m.ks ?? 0) + dd; }
      if (m.dither) v += bayer(x, y) * m.dither;
      val[i] = v; mat[i] = mname; emi[i] = em ? 1 : 0;
    }
    // occlusion: parts in front cast a 1px shadow down-right and a contact line
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, o = own[i]; if (o < 0) continue;
      let v = Math.round(val[i]); v = v < 1 ? 1 : v > 5 ? 5 : v;
      if (!emi[i]) {
        const A = parts[o]; let occ = 0;
        if (MAT[mat[i]].metal && val[i] >= 3.3 && ((x > 0 && own[i - 1] !== o) || (y > 0 && own[i - w] !== o))) v = Math.min(5, v + 1);
        const front = (dx, dy) => { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) return false; const j = own[Y * w + X]; return j > o && parts[j].grp !== A.grp && !parts[j].noShadow; };
        if (front(-1, -1) || front(-1, 0) || front(0, -1)) occ++;
        if (front(1, 0) || front(0, 1) || front(-1, 0) || front(0, -1)) occ++;
        v -= occ; if (v < 0) v = 0;
      }
      idx[i] = v;
    }
    return { w, h, own, idx, mat, emi, dist, parts, mirror: mir };
  }
}

/* compose a raster into RGBA with background, halos, outline, rim light, particles */
function compose(R, o = {}) {
  const { w, h, own, idx, mat, emi, parts } = R, N = w * h;
  const out = new Uint8ClampedArray(N * 4);
  const put = (i, c, a = 1) => { const j = i * 4; if (a >= 1) { out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2]; out[j + 3] = 255; } else { const ia = out[j + 3] / 255; out[j] = out[j] * (1 - a) + c[0] * a; out[j + 1] = out[j + 1] * (1 - a) + c[1] * a; out[j + 2] = out[j + 2] * (1 - a) + c[2] * a; out[j + 3] = Math.max(out[j + 3], a * 255, ia * 255); } };
  if (o.bg) o.bg(out, w, h, put);
  const solid = i => own[i] >= 0 && !parts[own[i]].noOutline;
  const isItem = (x, y) => x >= 0 && y >= 0 && x < w && y < h && solid(y * w + x);
  const isAny = (x, y) => x >= 0 && y >= 0 && x < w && y < h && own[y * w + x] >= 0;
  const outl = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (own[i] >= 0) continue; if (isItem(x - 1, y) || isItem(x + 1, y) || isItem(x, y - 1) || isItem(x, y + 1)) outl[i] = 1; }
  // distance to silhouette (for aura) up to 4
  if (o.shadow) { const [sx, sy, c, a] = o.shadow; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (own[i] >= 0 || outl[i]) continue; const X = x - sx, Y = y - sy; if (X >= 0 && Y >= 0 && X < w && Y < h && (own[Y * w + X] >= 0 || outl[Y * w + X])) put(i, c, a); } }
  if (o.aura) {
    const [col, rad, alpha] = o.aura; const seen = new Float32Array(N).fill(99);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!outl[i]) continue; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const d = Math.hypot(dx, dy); const j = Y * w + X; if (d < seen[j]) seen[j] = d; } }
    for (let i = 0; i < N; i++) { if (own[i] >= 0 || outl[i] || seen[i] > rad) continue; const x = i % w, y = (i / w) | 0; const f = 1 - seen[i] / (rad + .5); const a = alpha * f + bayer(x, y) * .25 * alpha; if (a > .08) put(i, col, Math.min(1, a)); }
  }
  // emissive halos
  if (o.glow !== false) {
    for (let i = 0; i < N; i++) {
      if (!emi[i]) continue; const x = i % w, y = (i / w) | 0; const pal = palOf(mat[i], o);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (own[j] >= 0) continue; const d = Math.abs(dx) + Math.abs(dy); if (d > 3) continue; if (outl[j] && d <= 1) { outl[j] = 2 + 0; continue; } if (!outl[j] && (d <= 2 || ((X + Y) & 1))) put(j, pal[d <= 1 ? 3 : 2], d <= 1 ? .55 : .3); }
    }
  }
  // outline
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!outl[i]) continue;
    // selective outline: pick the neighbour's darkest ramp colour mixed with the base outline
    let nb = -1; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const X = x + dx, Y = y + dy; if (isItem(X, Y)) { nb = Y * w + X; break; } }
    let c = OUTLINE;
    if (nb >= 0) { const pal = palOf(mat[nb], o); if (emi[nb]) c = pal[1]; else c = mix(OUTLINE, pal[0], .45); }
    if (outl[i] === 2 && nb >= 0) c = palOf(mat[nb], o)[emi[nb] ? 2 : 1];
    put(i, c, 1);
  }
  // item pixels
  const shine = o.shine; // [pos, width]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (own[i] < 0) continue; const p = parts[own[i]]; const pal = palOf(mat[i], o); let v = idx[i];
    if (emi[i] && o.flicker) { const f = hash(x, y, o.flicker | 0); v += f > .82 ? 1 : f < .12 ? -1 : 0; }
    if (shine && !emi[i] && (o.shineMask ? o.shineMask(p) : MAT[mat[i]].metal)) { const q = x + y - shine[0]; if (q >= 0 && q < shine[1]) v += 2; else if (q >= -2 && q < shine[1] + 2) v += 1; }
    v = v < 0 ? 0 : v > 5 ? 5 : v; let c = pal[v];
    if (o.develop !== undefined && hash(x, y, 77) >= o.develop) { put(i, o.silhouette || OUTLINE, 1); continue; }
    // rim light on the shadow side
    if (o.rim && !emi[i] && !p.noOutline && v <= 2 && (!isAny(x + 1, y) || !isAny(x, y + 1)) && isAny(x - 1, y) && isAny(x, y - 1)) c = mix(c, o.rim, .5);
    if (o.tint) c = mix(c, o.tint, o.tint[3] ?? .5);
    put(i, c, 1);
  }
  if (o.glints) for (const [gx, gy, s] of o.glints) glint(out, w, h, gx, gy, s, put);
  if (o.particles) for (const pt of o.particles) { if (pt.x < 0 || pt.y < 0 || pt.x >= w || pt.y >= h) continue; put((pt.y | 0) * w + (pt.x | 0), pt.c, pt.a ?? 1); }
  return new ImageData(out, w, h);
}
function glint(out, w, h, x, y, s, put) {
  const W = [255, 255, 255], Y = [255, 246, 214];
  const p = (X, Y2, c, a = 1) => { if (X >= 0 && Y2 >= 0 && X < w && Y2 < h) put(Y2 * w + X, c, a); };
  p(x, y, W); for (let k = 1; k <= s; k++) { const a = k === s ? .55 : .9; p(x + k, y, Y, a); p(x - k, y, Y, a); p(x, y + k, Y, a); p(x, y - k, Y, a); }
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function hsl(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
function prismPal(hue) { return [[.07, 240], [.17, 225], [.32, 205], [.5, 185], [.72, 165], [.93, 150]].map(([l, sh], k) => hsl(hue + (k - 3) * 14, .78, l)); }
function palOf(m, o) { if (m === 'prism' && o.hue !== undefined) return o.prismPal || (o.prismPal = prismPal(o.hue)); return MAT[m].pal; }

export { hx, ramp, MAT, OUTLINE, L3, HV, FLATD, bayer, hash, vnoise, sdPoly, sdShape, shapeBB, Xf, Forge, compose, glint, mix, hsl, prismPal, palOf };
