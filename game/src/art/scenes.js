// Battle backdrops: painted pixel layers in the prototype's dithered, moody palette.
//
// backdropLayers(key, { w=160, h=96, margin=0 }) -> { layers: [{ id, img, parallax }], horizon, floor: [top, bottom] }
//   Layers are ImageData (w + 2*margin wide), back to front: sky, far, mid, ground. Everything but the sky
//   is transparent where empty, so the UI can scroll them at different speeds (parallax) for a pan.
// renderBackdrop(key, { w=160, h=96, t=0, reduced }) -> ImageData: all layers composited, plus the
//   animated bits for time t (flickering hearth/torch light, pulsing fungi, ambient particles).
// ambient(key, t, { w, h }) -> [{ x, y, c:[r,g,b], a }] particles only (for drawing over sprites).
// BACKDROPS[key] = { name, horizon, floor } (horizon/floor as fractions of h).
import { hx, ramp, bayer, hash, vnoise, mix } from './forge.js';
import { lru } from './cache.js';

export const BACKDROPS = Object.freeze({
  'hearth-road': { name: 'The Hearth Road', horizon: .58, floor: [.66, 1], fx: 'ember' },
  'verdant-wood': { name: 'Eldergrove, under the canopy', horizon: .56, floor: [.64, 1], fx: 'spore' },
  thornhollow: { name: 'Thornhollow Outpost', horizon: .6, floor: [.68, 1], fx: 'leaf' },
  'briarmaw-den': { name: "Briarmaw's Den", horizon: .56, floor: [.64, 1], fx: 'blight' },
});
export const BACKDROP_KEYS = Object.keys(BACKDROPS);

/* ---------- a tiny pixel painter ---------- */
function layer(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  const L = {
    w, h, d,
    set(x, y, c, a = 1) {
      x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      const i = (y * w + x) * 4, ia = d[i + 3] / 255;
      if (a >= 1 || ia === 0) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.max(d[i + 3], a * 255); if (ia === 0 && a < 1) d[i + 3] = a * 255; return; }
      d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a; d[i + 3] = Math.max(d[i + 3], a * 255);
    },
    rect(x, y, rw, rh, c, a = 1) { for (let yy = Math.round(y); yy < Math.round(y + rh); yy++) for (let xx = Math.round(x); xx < Math.round(x + rw); xx++) L.set(xx, yy, c, a); },
    line(x0, y0, x1, y1, c, a = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1; for (let i = 0; i <= n; i++) L.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c, a); },
    thick(x0, y0, x1, y1, r0, r1, c, a = 1) { // tapered stroke
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 | 0 || 1;
      for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, r = r0 + (r1 - r0) * u; L.disc(x, y, r, c, a); }
    },
    disc(cx, cy, r, c, a = 1) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) L.set(x, y, c, a); },
    poly(pts, c, a = 1) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + .5, py = y + .5; let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; }
        if (ins) L.set(x, y, c, typeof a === 'function' ? a(x, y) : a);
      }
    },
    // soft dithered glow
    glow(cx, cy, r, c, a) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dd = Math.hypot(x + .5 - cx, y + .5 - cy) / r; if (dd >= 1) continue; const v = a * (1 - dd) * (1 - dd); if (v + bayer(x, y) * .12 > .04) L.set(x, y, c, Math.min(1, v)); } },
    img() { return new ImageData(d, w, h); },
  };
  return L;
}
const skyFill = (L, cols, y0, y1, dither = .95) => { const c = cols.map(hx); for (let y = y0; y < y1; y++) for (let x = 0; x < L.w; x++) { const l = Math.round((y - y0) / Math.max(1, y1 - y0 - 1) * (c.length - 1) + bayer(x, y) * dither); L.set(x, y, c[Math.max(0, Math.min(c.length - 1, l))]); } };
// silhouette whose top is yTop(x), filled to yBase; the top pixel gets a rim tint
function ridge(L, yTop, yBase, col, rim, rimA = .6) { const c = hx(col), r = rim ? hx(rim) : null; for (let x = 0; x < L.w; x++) { const t = Math.round(yTop(x)); for (let y = t; y < yBase; y++) L.set(x, y, c); if (r) L.set(x, t, r, rimA); } }
// branching dead tree / thorn branch
function branch(L, x0, y0, ang, len, w, depth, col, seed, thorns) {
  const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
  L.thick(x0, y0, x1, y1, w, Math.max(.5, w * .6), col);
  if (thorns) for (let k = 1; k < 4; k++) { const u = k / 4, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, s = hash(k, depth, seed) < .5 ? -1 : 1, a = ang + s * 1.2; L.line(x, y, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, col); }
  if (depth <= 0) return;
  branch(L, x1, y1, ang - .45 - hash(depth, seed, 1) * .35, len * .68, w * .62, depth - 1, col, seed + 3, thorns);
  branch(L, x1, y1, ang + .4 + hash(depth, seed, 2) * .35, len * .6, w * .58, depth - 1, col, seed + 7, thorns);
}

/* ---------- the four places ---------- */
const PAINT = {
  'hearth-road'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    const S = ramp('#140c12 #2a1418 #4e2020 #86381e #c8662a #e89a48');
    skyFill(sky, ['#140c12', '#2a1418', '#4e2020', '#86381e', '#c8662a', '#e89a48'], 0, gy + 2);
    sky.glow(W * .3, gy - 2, 34, hx('#ffcf7a'), .35);
    for (let k = 0; k < 4; k++) { const cy = 8 + k * 7 + hash(k, 1, 3) * 4, cx = hash(k, 2, 3) * W, len = 30 + hash(k, 3, 3) * 40; for (let x = cx - len / 2; x < cx + len / 2; x++) { const th = 1 + Math.round(Math.sin((x - cx + len / 2) / len * Math.PI) * 2); for (let y = 0; y < th; y++) sky.set(x, cy + y, S[1], .55 + ((x + y) & 1) * .2); sky.set(x, cy + th, S[3], .35); } }
    // far hills and the Keep
    ridge(far, x => gy - 7 - vnoise(x * .045, 0, 7) * 11 - vnoise(x * .16, 1, 3) * 3, gy + 2, '#2c1616', '#a8502a', .55);
    const kx = Math.round(W * .74), base = gy - 12, K = hx('#1a0c0e'), win = hx('#ffb04a');
    far.poly([[kx - 26, gy], [kx - 10, base + 2], [kx + 14, base], [kx + 30, gy]], K);
    far.rect(kx - 12, base - 18, 26, 18, K); far.rect(kx - 16, base - 27, 7, 27, K); far.rect(kx + 11, base - 24, 6, 24, K); far.rect(kx - 3, base - 34, 8, 34, K);
    for (let k = 0; k < 4; k++) { far.set(kx - 16 + k * 2, base - 28, K); far.set(kx + 11 + k * 2 - 1, base - 25, K); far.set(kx - 12 + k * 3, base - 19, K); }
    for (let k = 0; k < 5; k++) far.line(kx - 3 + k, base - 34, kx + 1, base - 41, K);
    for (const [x, y, a] of [[kx - 13, base - 20, .8], [kx + 13, base - 16, .8], [kx + 4, base - 10, .7], [kx - 6, base - 8, .6]]) far.set(x, y, win, a);
    lights.push({ x: kx + .5, y: base - 30, r: 9, c: '#ffb04a', a: .5, core: [[kx, base - 30], [kx + 1, base - 30], [kx, base - 29], [kx + 1, base - 29]], flick: 1.6 });
    // mid: dead tree, signpost, fence
    const M = hx('#120809');
    branch(mid, W * .08, gy + 6, -Math.PI / 2 - .12, 17, 2.2, 3, M, 5);
    mid.thick(W * .08, gy + 7, W * .08 - 3, gy + 10, 2.2, 1.2, M);
    const sx = W * .24; mid.rect(sx, gy - 10, 1.5, 18, M); mid.poly([[sx - 7, gy - 9], [sx + 1, gy - 10], [sx + 1, gy - 6.5], [sx - 7, gy - 5.5], [sx - 9, gy - 7.2]], M); mid.poly([[sx + 1, gy - 4.5], [sx + 8, gy - 5], [sx + 10, gy - 3.4], [sx + 8, gy - 1.8], [sx + 1, gy - 1.4]], M);
    for (let k = 0; k < 7; k++) { const x = W * .52 + k * 9 + hash(k, 1, 9) * 3, y = gy + 3 + k * .5; mid.rect(x, y - 6, 1.5, 7, M); if (k < 6) mid.line(x + 1, y - 4, x + 9, y - 3.6, M); }
    for (let x = 0; x < W; x++) if (hash(x, 4, 4) < .35) { const hgt = 2 + hash(x, 5, 4) * 4; mid.line(x, gy + 3, x + (hash(x, 6, 4) < .3 ? 1 : 0), gy + 3 - hgt, M); }
    // ground and the road
    const G = ['#1e130e', '#2a1a12', '#362216'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    const road = y => { const u = (y - gy) / (H - gy); return [W * (.66 - .24 * u * u) - (3 + u * W * .3), W * (.66 - .24 * u * u) + (3 + u * W * .3)]; };
    const R = ['#3a2618', '#4a3020', '#5a3c26'].map(hx);
    for (let y = gy; y < H; y++) { const [a, b] = road(y); for (let x = Math.floor(a); x <= b; x++) { const u = (x - a) / (b - a), rut = Math.abs(u - .3) < .04 || Math.abs(u - .7) < .04; const l = rut ? 0 : Math.round(1 + (y - gy) / (H - gy) + bayer(x, y) * .8 - (u < .08 || u > .92 ? 1 : 0)); gnd.set(x, y, R[Math.max(0, Math.min(2, l))]); } }
    for (let k = 0; k < 40; k++) { const x = hash(k, 1, 12) * W, y = gy + 2 + hash(k, 2, 12) * (H - gy - 2); const [a, b] = road(y); if (x > a - 1 && x < b + 1) continue; gnd.line(x, y, x + (hash(k, 3, 12) < .5 ? -1 : 1), y - 2 - hash(k, 4, 12) * 2, hx('#4a3418'), .8); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'ember' };
  },
  'verdant-wood'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#030806', '#06100b', '#0a1812', '#0f2219', '#152c20'], 0, gy + 2);
    for (let k = 0; k < 3; k++) { const x0 = W * (.25 + k * .27), wd = 6 + k * 2; for (let y = 0; y < gy; y++) for (let x = 0; x < wd; x++) { const X = x0 + x + y * .35; if (((X + y) & 1) && hash(X | 0, y, 5) < .5) sky.set(X, y, hx('#4a7a52'), .12 * (1 - y / gy)); } }
    // giant trunks with a home carved into one: bark ridges, a lit left edge, root flares
    const T1 = '#10201a', rim = hx('#2e4a34');
    const trunk = (L, x, w, col, rimc, seed) => {
      const c = hx(col), dk = mix(c, [0, 0, 0], .45), lt = mix(c, [120, 160, 110], .12);
      for (let y = 0; y < gy + 5; y++) {
        const flare = y > gy - 14 ? ((y - gy + 14) / 14) ** 2 * w * .7 : 0, wob = Math.sin(y * .11 + seed) * 1.4, x0 = x - w / 2 - flare + wob, x1 = x + w / 2 + flare + wob;
        const fade = Math.min(1, y / 16);
        for (let xx = Math.floor(x0); xx < x1; xx++) { const u = (xx - x0) / (x1 - x0), ridge = Math.abs(Math.sin((xx - wob) * .9 + vnoise(xx * .2, y * .08, seed) * 3)) < .25; L.set(xx, y, ridge ? dk : u < .22 ? lt : c, fade); }
        if (rimc) L.set(x0, y, rimc, .8 * fade);
      }
    };
    trunk(far, W * .2, 16, T1, rim, 1); trunk(far, W * .5, 22, T1, rim, 2); trunk(far, W * .82, 18, T1, rim, 3);
    // a fringe of leaves under the canopy
    for (let x = 0; x < W; x++) { const d = 2 + vnoise(x * .15, 0, 9) * 6; for (let y = 0; y < d; y++) far.set(x, y, hx('#081410')); if (hash(x, 1, 9) < .25) far.set(x, d, hx('#1a3a22'), .8); }
    const dx = W * .5, dy = gy - 3; far.poly([[dx - 4.5, dy], [dx - 4.5, dy - 7], [dx - 2.5, dy - 10], [dx + 2.5, dy - 10], [dx + 4.5, dy - 7], [dx + 4.5, dy]], hx('#1c1208'));
    far.rect(dx - 3.5, dy - 8, 7, 8, hx('#3a2412')); far.set(dx + 2, dy - 4, hx('#ffb04a'));
    far.rect(dx + 7, dy - 14, 3, 3, hx('#ffb04a'), .9); lights.push({ x: dx + 8.5, y: dy - 12.5, r: 6, c: '#ffb04a', a: .35, flick: 2.3 });
    for (let k = 0; k < 9; k++) { const x = hash(k, 1, 21) * W, len = 8 + hash(k, 2, 21) * 18; far.line(x, 0, x + Math.sin(k) * 2, len, hx('#12281a')); far.set(x + Math.sin(k) * 2, len + 1, hx('#2a5a2e')); }
    // near trunks framing the scene, with torches
    trunk(mid, -2, 18, '#060d09', hx('#1a2e20'), 4); trunk(mid, W + 3, 20, '#060d09', null, 5);
    for (const [x, y] of [[W * .06 + 6, gy - 16], [W * .94 - 7, gy - 18]]) {
      mid.rect(x - .5, y, 1.5, 6, hx('#2a1a10')); mid.set(x - 1, y - 1, hx('#3a2412')); mid.set(x + 1, y - 1, hx('#3a2412'));
      lights.push({ x: x + .2, y: y - 3, r: 13, c: '#ff9a3a', a: .45, torch: 1, flick: 3.1 + x * .01 });
    }
    // floor, winding path, fungi
    const G = ['#07120c', '#0b1a12', '#102419'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); if (vnoise(x * .2, y * .5, 4) > .74 && ((x + y) & 1)) gnd.set(x, y, hx('#16301a'), .7); }
    for (let k = 0; k < 4; k++) { const y0 = gy + 3 + k * 7, x0 = hash(k, 1, 33) * W; for (let x = 0; x < 26; x++) gnd.set(x0 + x, y0 + Math.sin(x * .3 + k) * 1.2, hx('#1c140c'), .9); }
    const pathX = y => { const u = (y - gy) / (H - gy); return W * .5 + Math.sin(u * 3.2 + .6) * W * .16 * (1 - u * .3); }, pathW = y => 2 + (y - gy) / (H - gy) * W * .16;
    const P = ['#1a2216', '#222c1c', '#2c3622'].map(hx);
    for (let y = gy; y < H; y++) { const c = pathX(y), hw = pathW(y); for (let x = Math.floor(c - hw); x <= c + hw; x++) { const e = Math.abs(x - c) / hw; gnd.set(x, y, P[Math.max(0, Math.min(2, Math.round(2 - e * 2 + bayer(x, y) * .8)))]); } }
    const fungi = [];
    for (let k = 0; k < 16; k++) { const y = gy + 3 + hash(k, 1, 31) * (H - gy - 6), side = k & 1 ? 1 : -1, x = pathX(y) + side * (pathW(y) + 2 + hash(k, 2, 31) * 4); fungi.push([x, y, 1 + (hash(k, 3, 31) < .4 ? 1 : 0)]); }
    for (const [x, y, s] of fungi) { gnd.set(x, y + 1, hx('#1c3a34')); gnd.rect(x - s, y - s, s * 2 + 1, s, hx('#5ae8d0')); gnd.set(x - s, y - s, hx('#c8fff4')); lights.push({ x: x + .5, y: y - s * .5, r: 4 + s * 2, c: '#5ae8d0', a: .28, pulse: 1, flick: .8 + (x % 3) * .3 }); }
    return { layers: [sky, far, mid, gnd], lights, fx: 'spore' };
  },
  thornhollow(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#0c1216', '#141e24', '#1e2c30', '#2e3e3c', '#465448', '#626a52'], 0, gy);
    sky.glow(W * .62, gy - 18, 30, hx('#a8b078'), .18);
    // conifer treeline
    const FC = hx('#101a16'), FR = hx('#2e443a');
    for (let x = 0; x < W; x += 1) { const tree = hash(Math.floor(x / 7), 1, 41), cx = Math.floor(x / 7) * 7 + 3.5, hgt = 14 + tree * 12, top = gy - 22 - hgt * .5; const slope = Math.abs(x - cx) * 1.9; const t = Math.round(top + slope); for (let y = t; y < gy; y++) far.set(x, y, FC); far.set(x, t, FR, .6); }
    // the woven thorn wall
    const wallTop = x => gy - 22 - Math.sin(x * .09) * 1.5 - hash(Math.floor(x / 5), 2, 7) * 3;
    const WB = hx('#1a130d'), WS = hx('#342618'), WR = hx('#4e3a24'), TH = hx('#7a6242');
    for (let x = 0; x < W; x++) { const t = Math.round(wallTop(x)); for (let y = t; y < gy + 2; y++) mid.set(x, y, WB); }
    for (let k = 0; k < W / 5 + 2; k++) { const x = k * 5 + hash(k, 3, 7) * 2 - 2, t = wallTop(x) - 3 - hash(k, 4, 7) * 4; mid.thick(x, gy + 2, x + (hash(k, 5, 7) - .5) * 3, t, 1.6, 1, WS); mid.set(x - 1, t + 2, WR); mid.line(x + .5, t, x + .5, t - 2, TH); }
    for (let r = 0; r < 3; r++) { const yb = gy - 6 - r * 6; for (let x = 0; x < W; x++) { const y = yb + Math.sin(x * .32 + r * 1.7) * 1.6; mid.set(x, y, WR); mid.set(x, y + 1, WS); if (hash(x, r, 9) < .08) { const s = hash(x, r, 10) < .5 ? -1 : 1; mid.line(x, y, x + s * 2, y - 2, TH); } } }
    // gate with lantern, watch platform, bounty board
    const gx = Math.round(W * .66);
    mid.rect(gx - 9, gy - 30, 3, 32, hx('#241a12')); mid.rect(gx + 7, gy - 30, 3, 32, hx('#241a12')); mid.rect(gx - 10, gy - 31, 21, 2.5, hx('#2e2216'));
    mid.rect(gx - 6, gy - 20, 13, 22, hx('#0a0806'));
    mid.line(gx + 1, gy - 28.5, gx + 1, gy - 25, hx('#3a3a3a')); mid.rect(gx, gy - 25, 3, 3, hx('#2a2018')); mid.set(gx + 1, gy - 24, hx('#ffd27a'));
    lights.push({ x: gx + 1.5, y: gy - 23.5, r: 12, c: '#ffb04a', a: .45, flick: 2.7 });
    const bx = gx + 16; mid.rect(bx, gy - 13, 1.5, 15, hx('#241a12')); mid.rect(bx - 5, gy - 16, 12, 8, hx('#3a2a18')); for (const [x, y] of [[bx - 4, gy - 15], [bx + 1, gy - 14], [bx - 2, gy - 12]]) mid.rect(x, y, 3, 3, hx('#b8a47a'));
    const tx = Math.round(W * .16); mid.rect(tx - 7, gy - 38, 2, 40, hx('#241a12')); mid.rect(tx + 6, gy - 38, 2, 40, hx('#241a12')); mid.rect(tx - 9, gy - 39, 19, 3, hx('#2e2216')); mid.line(tx - 7, gy - 30, tx + 7, gy - 22, hx('#241a12')); mid.line(tx + 7, gy - 30, tx - 7, gy - 22, hx('#241a12'));
    mid.line(tx + 8, gy - 39, tx + 8, gy - 47, hx('#241a12')); mid.poly([[tx + 8.5, gy - 47], [tx + 15, gy - 45.5], [tx + 8.5, gy - 43.5]], hx('#2e6a34'));
    // packed earth, straw, crates
    const G = ['#17120d', '#201811', '#2a2017'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    for (let k = 0; k < 50; k++) { const x = hash(k, 1, 52) * W, y = gy + 2 + hash(k, 2, 52) * (H - gy - 2); gnd.line(x, y, x + 2, y + (hash(k, 3, 52) < .5 ? -1 : 0), hx('#4a3e26'), .7); }
    const cx0 = W * .86; gnd.rect(cx0, gy - 4, 9, 7, hx('#3a2616')); gnd.rect(cx0, gy - 4, 9, 1, hx('#5a3c22')); gnd.line(cx0, gy - 4, cx0 + 8, gy + 2, hx('#24160c')); gnd.rect(cx0 + 10, gy - 6, 6, 9, hx('#2e1e12')); gnd.rect(cx0 + 10, gy - 3, 6, 1, hx('#4a4a4a'));
    return { layers: [sky, far, mid, gnd], lights, fx: 'leaf' };
  },
  'briarmaw-den'(W, H, gy) {
    const sky = layer(W, H), far = layer(W, H), mid = layer(W, H), gnd = layer(W, H), lights = [];
    skyFill(sky, ['#040306', '#07050b', '#0c0812', '#140c1c', '#1e122a'], 0, gy + 2);
    sky.glow(W * .5, gy - 4, 46, hx('#5a3470'), .42); sky.glow(W * .5, gy - 1, 22, hx('#7aa048'), .22);
    // the far heart of the hollow: a knot of thorns silhouetted against the glow
    for (let k = 0; k < 14; k++) { const a = -Math.PI * (.1 + .8 * hash(k, 1, 51)), l = 8 + hash(k, 2, 51) * 12; sky.thick(W * .5, gy + 2, W * .5 + Math.cos(a) * l * 1.4, gy + 2 + Math.sin(a) * l, 1.4, .3, hx('#1a1024')); }
    // overhead thorn canopy, rim-lit from below
    const C = hx('#150d1d'), CR = hx('#3a2650');
    for (let k = 0; k < 7; k++) { const x0 = (k + .5) / 7 * W + (hash(k, 1, 61) - .5) * 12; branch(sky, x0, -2, Math.PI / 2 + (hash(k, 2, 61) - .5) * 1.2, 9 + hash(k, 3, 61) * 9, 2.6, 3, C, 60 + k, true); }
    for (let y = 1; y < gy; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = ((y + 1) * W + x) * 4; if (sky.d[i] === C[0] && sky.d[i + 1] === C[1] && !(sky.d[j] === C[0] && sky.d[j + 1] === C[1])) sky.set(x, y, CR, .8); }
    for (let k = 0; k < 10; k++) { const x = hash(k, 5, 62) * W, len = 6 + hash(k, 6, 62) * 16; for (let y = 0; y < len; y++) sky.set(x + Math.sin(y * .4 + k) * .8, y, hx('#120a18')); sky.set(x, len, hx('#4a2e5a')); }
    // tangled thorn masses on the horizon
    ridge(far, x => gy - 6 - vnoise(x * .08, 0, 17) * 12, gy + 2, '#100a16', '#5a3a70', .75);
    for (let k = 0; k < 34; k++) { const x = hash(k, 1, 71) * W, y = gy - 6 - vnoise(x * .08, 0, 17) * 12, a = -Math.PI / 2 + (hash(k, 2, 71) - .5) * 1.6; far.thick(x, y + 1, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 1, .3, hx('#100a16')); far.set(x + Math.cos(a) * 5, y + Math.sin(a) * 5, hx('#5a3a70'), .6); }
    // great thorn arches framing the hollow, dripping sap
    const A = hx('#0c0712'), AR = hx('#4a3060');
    const arch = (x0, dir) => { const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([x0 + dir * (Math.sin(u * 2.2) * W * .22), gy + 6 - Math.sin(u * Math.PI * .9) * (gy - 2)]); } for (let k = 0; k < pts.length - 1; k++) { const r = 5 - k * .24; mid.thick(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], r, r - .2, A); if (k % 2 === 0) { const a = -Math.PI / 2 - dir * .9 + (hash(k, 3, 81) - .5) * .6; mid.thick(pts[k][0], pts[k][1], pts[k][0] + Math.cos(a) * 8, pts[k][1] + Math.sin(a) * 8, 1.3, .3, A); } } for (let k = 0; k < pts.length - 1; k++) { const r = 5 - k * .24; mid.line(pts[k][0] + dir * r * .75, pts[k][1] + r * .2, pts[k + 1][0] + dir * (r - .2) * .75, pts[k + 1][1] + r * .2, AR, .7); } return pts; };
    const la = arch(-2, 1), ra = arch(W + 2, -1);
    const drips = [];
    for (const [pts, k0] of [[la, 3], [la, 7], [ra, 5], [ra, 9]]) { const [x, y] = pts[k0], len = 5 + (k0 % 3) * 3; mid.line(x, y + 3, x, y + 3 + len, hx('#1a0e22')); mid.set(x, y + 4 + len, hx('#5a3a6e')); drips.push([x, y + 4 + len]); }
    // bones among the roots
    const B = hx('#8a8070'), BD = hx('#4a4438');
    const skull = (x, y) => { mid.rect(x, y, 4, 3, B); mid.set(x + 1, y + 1, BD); mid.set(x + 3, y + 1, BD); mid.rect(x + 1, y + 3, 2, 1, BD); };
    skull(W * .22, gy + 1); skull(W * .7, gy + 3);
    for (let k = 0; k < 4; k++) mid.line(W * .74 + k * 2, gy + 2, W * .74 + k * 2 + 1, gy - 2, B);
    mid.line(W * .3, gy + 3, W * .3 + 6, gy + 2, B);
    // black sap ground with glossy pools and blight cracks
    const G = ['#0c0810', '#130d19', '#1b1222'].map(hx);
    for (let y = gy; y < H; y++) for (let x = 0; x < W; x++) { const l = Math.round((y - gy) / (H - gy) * 2 + bayer(x, y) * .9); gnd.set(x, y, G[Math.max(0, Math.min(2, l))]); }
    const pools = [[W * .3, gy + 16, 18, 4], [W * .72, gy + 26, 22, 5], [W * .52, gy + 36, 16, 3.4]];
    for (const [px, py, rx, ry] of pools) { for (let y = Math.floor(py - ry); y <= py + ry; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) { const e = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (e < 1) gnd.set(x, y, hx('#040208')); if (e < 1 && e > .7 && y < py) gnd.set(x, y, hx('#2a1a34'), .8); } gnd.rect(px - rx * .4, py - ry * .4, 3, 1, hx('#5a3e66')); gnd.set(px + rx * .3, py, hx('#4a3456')); }
    const cracks = [];
    for (let k = 0; k < 6; k++) { let x = hash(k, 1, 91) * W, y = gy + 4 + hash(k, 2, 91) * (H - gy - 8); const pts = [[x, y]]; for (let s = 0; s < 6; s++) { x += 1.5 + hash(k, s, 92) * 3; y += (hash(k, s, 93) - .5) * 5; pts.push([x, y]); } cracks.push(pts); for (let s = 0; s < pts.length - 1; s++) gnd.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx('#2e3a18')); }
    lights.push({ cracks, c: '#b4d65a' });
    lights.push({ drips, c: '#3a2448' });
    return { layers: [sky, far, mid, gnd], lights, fx: 'blight' };
  },
};

const layerCache = lru(24), baseCache = lru(24);
function painted(key, w, h) {
  return layerCache.get(`${key}|${w}|${h}`, () => {
    const B = BACKDROPS[key] || BACKDROPS['hearth-road'], gy = Math.round(h * B.horizon);
    const r = (PAINT[key] || PAINT['hearth-road'])(w, h, gy);
    return { ...r, gy, B };
  });
}
export function backdropLayers(key, o = {}) {
  const w = o.w || 160, h = o.h || 96, m = o.margin || 0, P = painted(key, w + 2 * m, h);
  const ids = ['sky', 'far', 'mid', 'ground'], par = [0, .2, .5, 1];
  return { layers: P.layers.map((L, i) => ({ id: ids[i], img: L.img(), parallax: par[i] })), horizon: P.gy, floor: [Math.round(h * P.B.floor[0]), h] };
}
function composite(key, w, h) {
  return baseCache.get(`${key}|${w}|${h}`, () => {
    const P = painted(key, w, h), out = new Uint8ClampedArray(w * h * 4);
    for (const L of P.layers) { const d = L.d; for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (!a) continue; out[i] = out[i] * (1 - a) + d[i] * a; out[i + 1] = out[i + 1] * (1 - a) + d[i + 1] * a; out[i + 2] = out[i + 2] * (1 - a) + d[i + 2] * a; out[i + 3] = 255; } }
    return out;
  });
}
// deterministic ambient particles for time t
export function ambient(key, t, o = {}) {
  const w = o.w || 160, h = o.h || 96, B = BACKDROPS[key] || BACKDROPS['hearth-road'], gy = Math.round(h * B.horizon), out = [];
  const n = o.count || 18;
  for (let k = 0; k < n; k++) {
    const r1 = hash(k, 1, 7), r2 = hash(k, 2, 7), r3 = hash(k, 3, 7), sp = .5 + r2;
    switch (B.fx) {
      case 'ember': { const ph = (t * .06 * sp + r3) % 1; out.push({ x: (r1 * w + Math.sin(t * 1.3 + k) * 4 + t * 3) % w, y: h - ph * h * 1.1, c: r2 > .5 ? [255, 176, 74] : [224, 98, 42], a: Math.min(1, (1 - ph) * 2) * .85 }); break; }
      case 'spore': { const ph = (t * .025 * sp + r3) % 1; const fire = k % 4 === 0; out.push(fire ? { x: r1 * w + Math.sin(t * .7 + k) * 6, y: gy - 10 + r3 * (h - gy) + Math.cos(t * .9 + k) * 4, c: [216, 240, 122], a: Math.sin(t * 3 + k * 2.1) > .2 ? .9 : 0 } : { x: r1 * w + Math.sin(t * .6 + k * 1.7) * 5, y: h - ph * h, c: [184, 240, 160], a: .55 * Math.min(1, (1 - ph) * 3) }); break; }
      case 'leaf': { const ph = (t * .05 * sp + r3) % 1; out.push({ x: (r1 * w + ph * 40 + Math.sin(t * 2 + k) * 3) % w, y: ph * h, c: r2 > .6 ? [168, 110, 52] : [106, 122, 64], a: .8 }); break; }
      case 'blight': { const ph = (t * .03 * sp + r3) % 1; out.push({ x: r1 * w + Math.sin(t * .8 + k * 1.3) * 3, y: h - ph * (h - 10), c: k % 3 ? [164, 92, 240] : [180, 214, 90], a: Math.min(1, (1 - ph) * 2, ph * 4) * .8 }); break; }
    }
  }
  return out;
}
// renderBackdrop(key, { w, h, t, reduced }) -> ImageData
export function renderBackdrop(key, o = {}) {
  const w = o.w || 160, h = o.h || 96, t = o.reduced ? 0 : (o.t || 0), P = painted(key, w, h);
  const L = layer(w, h); L.d.set(composite(key, w, h));
  for (const g of P.lights) {
    if (g.cracks) { const pulse = .35 + .25 * Math.sin(t * 1.7); for (const pts of g.cracks) for (let s = 0; s < pts.length - 1; s++) L.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], hx(g.c), pulse); continue; }
    if (g.drips) { for (const [x, y] of g.drips) { const ph = ((t * .45 + x * .07) % 1); if (ph < .6) L.set(x, y + ph * 18, hx(g.c), .9); } continue; }
    const fl = o.reduced ? 1 : .8 + .2 * Math.sin(t * g.flick * 3.1) * Math.sin(t * g.flick * 1.7 + 1) + (hash(Math.floor(t * 10), g.x | 0, 3) - .5) * .12;
    L.glow(g.x, g.y, g.r * (g.pulse ? .9 + .1 * Math.sin(t * 2 + g.x) : 1), hx(g.c), g.a * fl);
    if (g.core) for (const [x, y] of g.core) L.set(x, y, hx('#fff0c0'), .7 + .3 * fl);
    if (g.torch) { const fx = Math.round(g.x), fy = Math.round(g.y), f2 = Math.floor(t * 9) % 3; L.set(fx, fy + 1, hx('#ff8a2a')); L.set(fx, fy, hx('#ffd27a')); L.set(fx + (f2 === 1 ? 1 : f2 === 2 ? -1 : 0), fy - 1, hx('#ffb04a')); if (f2 !== 2) L.set(fx, fy - 2, hx('#ff8a2a'), .7); }
  }
  if (!o.reduced) for (const p of ambient(key, t, { w, h })) if (p.a > .05) L.set(p.x, p.y, p.c, p.a);
  return L.img();
}
