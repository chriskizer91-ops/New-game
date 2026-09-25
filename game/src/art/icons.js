// Tiny pixel icons: polyhedral dice with numbers, status effects, aspect tokens, relic grip.
//
// diceIcon(sides, { value, size=20, mat='bone', ink, spin=0, state }) -> ImageData
//   sides 4|6|8|10|12|20; value shown on the main face (omit for blank); mat any MAT key
//   (bone, iron, bronze, gold, ruby, amethyst ...); spin 0..3 shifts facet shading (tumble frames);
//   state 'crit' (gold + glow) | 'fumble' (dark red) | 'dim' (greyed).
// statusIcon(key, { size=12 }) -> ImageData   keys: STATUS_KEYS
// aspectIcon(aspect, { size=12 }) -> ImageData   keys: the 8 aspects (a coloured token with a sigil)
// gripIcon({ size=12, broken }) -> ImageData   a chain link for relic grip meters
// digitsImage(text, { color, font='3x5'|'4x6', outline }) -> ImageData; drawDigits(img, text, x, y, color, font)
import { MAT, hx, mix } from './forge.js';
import { lru } from './cache.js';

/* ---------- digit fonts ---------- */
const F35 = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001011001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', '+': '000010111010000', '-': '000000111000000', x: '000101010101000' };
const F46 = { 0: '011010011001100110010110', 1: '010011000100010001001110', 2: '011010010010010010001111', 3: '111000010110000100011110', 4: '100110011111000100010001', 5: '111110001110000100011110', 6: '011010001110100110010110', 7: '111100010010010001000100', 8: '011010010110100110010110', 9: '011010011001011100010110', '+': '000000100111001000000000', '-': '000000001111000000000000' };
export const DIGIT_FONTS = { '3x5': { w: 3, h: 5, g: F35 }, '4x6': { w: 4, h: 6, g: F46 } };
export function textWidth(text, font = '3x5') { const f = DIGIT_FONTS[font]; return String(text).length * (f.w + 1) - 1; }
export function drawDigits(img, text, x, y, color, font = '3x5') {
  const f = DIGIT_FONTS[font], c = typeof color === 'string' ? hx(color) : color, d = img.data, W = img.width;
  let cx = Math.round(x);
  for (const ch of String(text)) {
    const g = f.g[ch];
    if (g) for (let yy = 0; yy < f.h; yy++) for (let xx = 0; xx < f.w; xx++) if (g[yy * f.w + xx] === '1') { const X = cx + xx, Y = Math.round(y) + yy; if (X < 0 || Y < 0 || X >= W || Y >= img.height) continue; const i = (Y * W + X) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    cx += f.w + 1;
  }
}
export function digitsImage(text, o = {}) {
  const font = o.font || '3x5', f = DIGIT_FONTS[font], pad = o.outline ? 1 : 0, w = textWidth(text, font) + pad * 2, h = f.h + pad * 2;
  const img = new ImageData(w, h);
  if (o.outline) { const oc = typeof o.outline === 'string' ? o.outline : '#0b0910'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) drawDigits(img, text, pad + dx, pad + dy, oc, font); }
  drawDigits(img, text, pad, pad, o.color || '#ffffff', font);
  return img;
}

/* ---------- a tiny painter with automatic edge light, shadow and outline ---------- */
const OUT = hx('#0b0910');
function canvas(n, s = 1) { return { n, s, c: new Array(n * n).fill(null) }; }
function fillPoly(C, pts, col, s = C.s) {
  const P = pts.map(([x, y]) => [x * s, y * s]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(C.n - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(C.n - 1, Math.ceil(x1)); x++) {
    const px = x + .5, py = y + .5; let ins = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; }
    if (ins) C.c[y * C.n + x] = col;
  }
}
function fillDisc(C, cx, cy, r, col, s = C.s) { cx *= s; cy *= s; r *= s; for (let y = 0; y < C.n; y++) for (let x = 0; x < C.n; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) C.c[y * C.n + x] = col; }
function stroke(C, pts, r, col, s = C.s) { for (let k = 0; k < pts.length - 1; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * s * 2) + 1; for (let i = 0; i <= n; i++) { const u = i / n; fillDisc(C, ax + (bx - ax) * u, ay + (by - ay) * u, r, col, s); } } }
function px(C, x, y, col, s = C.s) { const X = Math.floor(x * s), Y = Math.floor(y * s); if (X >= 0 && Y >= 0 && X < C.n && Y < C.n) C.c[Y * C.n + X] = col; }
function finish(C, o = {}) {
  const n = C.n, img = new ImageData(n, n), d = img.data, filled = i => C.c[i] !== null;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x; let c = C.c[i];
    if (c === null) { if (o.outline !== false && ((x > 0 && filled(i - 1)) || (x < n - 1 && filled(i + 1)) || (y > 0 && filled(i - n)) || (y < n - 1 && filled(i + n)))) { const j = i * 4; d[j] = OUT[0]; d[j + 1] = OUT[1]; d[j + 2] = OUT[2]; d[j + 3] = 255; } continue; }
    if (c.raw) c = c.raw;
    else if (o.shade !== false) {
      const tl = (x === 0 || !filled(i - 1)) || (y === 0 || !filled(i - n)), br = (x === n - 1 || !filled(i + 1)) || (y === n - 1 || !filled(i + n));
      if (tl && !br) c = mix(c, [255, 255, 255], .3); else if (br && !tl) c = mix(c, [0, 0, 0], .35);
    }
    const j = i * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
  }
  return img;
}
const raw = c => ({ raw: hx(c) }); // a pixel colour exempt from auto shading

/* ---------- dice ---------- */
// each die: facets [pts, tone 0..5] in a 20-unit box, the face that shows the number, and its centre
const DIE = {
  4: { faces: [[[[10, .8], [19.2, 18.2], [.8, 18.2]], 1], [[[10, .8], [19.2, 18.2], [17, 15.6]], 2]], m: [[10, 1.8], [17, 15.6], [3, 15.6]], mc: [10, 10.8] },
  6: { faces: [[[[2.5, 6.5], [6.8, 2.2], [17.6, 2.2], [13.3, 6.5]], 5], [[[13.3, 6.5], [17.6, 2.2], [17.6, 13], [13.3, 17.3]], 1]], m: [[2.5, 6.5], [13.3, 6.5], [13.3, 17.3], [2.5, 17.3]], mc: [7.9, 11.9] },
  8: { faces: [[[[10, .8], [19.2, 10], [10, 19.2], [.8, 10]], 1], [[[10, 19.2], [2.4, 12.8], [17.6, 12.8]], 0], [[[17.6, 12.8], [19.2, 10], [10, .8]], 2]], m: [[10, 1.6], [17.2, 12.8], [2.8, 12.8]], mc: [10, 9.2] },
  10: { faces: [[[[10, .8], [18.8, 8.4], [18.4, 11.8], [10, 19.2], [1.6, 11.8], [1.2, 8.4]], 1], [[[1.2, 8.4], [4, 11.2], [10, 15.2], [10, 19.2], [1.6, 11.8]], 2], [[[18.8, 8.4], [16, 11.2], [10, 15.2], [10, 19.2], [18.4, 11.8]], 0]], m: [[10, 1.4], [16, 11.2], [10, 15.2], [4, 11.2]], mc: [10, 9.4] },
  12: { faces: [[[[10, .8], [17.6, 4.2], [19.2, 11.4], [14.6, 18], [5.4, 18], [.8, 11.4], [2.4, 4.2]], 1], [[[.8, 11.4], [4.6, 8.4], [6.8, 14.8], [5.4, 18]], 2], [[[10, .8], [10, 3.8], [4.6, 8.4], [2.4, 4.2]], 3]], m: [[10, 3.8], [15.4, 8.4], [13.2, 14.8], [6.8, 14.8], [4.6, 8.4]], mc: [10, 9.6] },
  20: { faces: [[[[10, .6], [18.6, 5.4], [18.6, 14.6], [10, 19.4], [1.4, 14.6], [1.4, 5.4]], 1], [[[1.4, 5.4], [10, 2.4], [2.4, 15.2], [1.4, 14.6]], 3], [[[1.4, 5.4], [10, .6], [18.6, 5.4], [10, 2.4]], 2], [[[2.4, 15.2], [17.6, 15.2], [18.6, 14.6], [10, 19.4], [1.4, 14.6]], 0]], m: [[10, 2.4], [17.6, 15.2], [2.4, 15.2]], mc: [10, 11], mTri: 1 },
};
export const DICE = [4, 6, 8, 10, 12, 20];
// suggested intent-die look per foe tier (the die grows with the foe's rank)
export const INTENT_DIE = Object.freeze({ rabble: { sides: 6, mat: 'iron' }, veteran: { sides: 8, mat: 'bronze' }, 'relic-bearer': { sides: 12, mat: 'gold' }, champion: { sides: 20, mat: 'amethyst' } });
const diceCache = lru(400);
export function diceIcon(sides, o = {}) {
  const size = o.size || 20, spin = (o.spin || 0) & 3, state = o.state || '', v = o.value;
  const key = [sides, v ?? '-', size, o.mat || '', o.ink || '', spin, state].join('|');
  return diceCache.get(key, () => {
    const D = DIE[sides] || DIE[20], s = size / 20, C = canvas(size, 1);
    const matKey = state === 'crit' ? 'gold' : state === 'fumble' ? 'ruby' : o.mat || 'bone';
    const pal = (MAT[matKey] || MAT.bone).pal.map(c => (state === 'dim' ? mix(c, [60, 58, 64], .6) : c));
    const shift = [0, 1, 0, -1][spin], tone = t => pal[Math.max(0, Math.min(5, t + shift))];
    for (const [pts, t] of D.faces) fillPoly(C, pts, tone(t), s);
    fillPoly(C, D.m, tone(4), s);
    // edges between facets
    const edge = mix(pal[0], pal[1], .5);
    const drawEdges = pts => { for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * s) * 2; for (let i = 0; i <= n; i++) { const u = i / n; const X = Math.floor((a[0] + (b[0] - a[0]) * u) * s), Y = Math.floor((a[1] + (b[1] - a[1]) * u) * s); if (X >= 0 && Y >= 0 && X < size && Y < size && C.c[Y * size + X]) C.c[Y * size + X] = { raw: edge }; } } };
    drawEdges(D.m);
    // highlight glint on the main face's top-left corner
    const img = finish(C, { shade: true });
    if (v !== undefined && v !== null && v !== '') {
      const txt = String(v), big = txt.length === 1 && size >= 18, font = big ? '4x6' : '3x5', F = DIGIT_FONTS[font];
      const ink = o.ink ? hx(o.ink) : state === 'crit' ? hx('#5a1a08') : state === 'fumble' ? hx('#fff0d8') : pal[0];
      const tx = Math.round(D.mc[0] * s - textWidth(txt, font) / 2), ty = Math.round(D.mc[1] * s - F.h / 2);
      if (txt.length > 1 || size < 18) { const halo = pal[4]; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawDigits(img, txt, tx + dx, ty + dy, halo, font); }
      drawDigits(img, txt, tx, ty, ink, font);
    }
    if (state === 'crit') { const d = img.data, g = hx('#fff4c0'); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = (y * size + x) * 4; if (d[i + 3]) continue; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < size && Y < size && d[(Y * size + X) * 4 + 3] && d[(Y * size + X) * 4] === OUT[0] && d[(Y * size + X) * 4 + 1] === OUT[1]; }); if (nb && ((x + y) & 1)) { d[i] = g[0]; d[i + 1] = g[1]; d[i + 2] = g[2]; d[i + 3] = 150; } } }
    return img;
  });
}

/* ---------- status icons (12-unit space) ---------- */
const col = hx;
const ST = {
  burning: C => { fillPoly(C, [[6, .6], [8.4, 3.4], [10, 6.4], [9.8, 9], [8.2, 10.8], [6, 11.4], [3.8, 10.8], [2.2, 9], [2.3, 6.4], [3.6, 4.4], [4.6, 5.8], [5.2, 3.2]], col('#e0601c')); fillPoly(C, [[6.2, 4.2], [7.9, 6.8], [8.2, 8.8], [7, 10.2], [5.2, 10.2], [4.2, 8.8], [4.6, 7], [5.5, 7.6]], col('#ffb040')); fillDisc(C, 6.2, 9, 1.2, raw('#fff4b4')); },
  chilled: C => { const c = col('#8ccff2'); for (const a of [0, 1, 2]) { const t = a * Math.PI / 3; stroke(C, [[6 - Math.sin(t) * 4.8, 6 - Math.cos(t) * 4.8], [6 + Math.sin(t) * 4.8, 6 + Math.cos(t) * 4.8]], .55, c); } for (const a of [0, 1, 2, 3, 4, 5]) { const t = a * Math.PI / 3, x = 6 + Math.sin(t) * 3.2, y = 6 - Math.cos(t) * 3.2; stroke(C, [[x, y], [x + Math.sin(t + 1) * 1.4, y - Math.cos(t + 1) * 1.4]], .4, c); stroke(C, [[x, y], [x + Math.sin(t - 1) * 1.4, y - Math.cos(t - 1) * 1.4]], .4, c); } px(C, 6, 6, raw('#ffffff')); },
  frozen: C => { fillPoly(C, [[3.2, 11], [2.2, 6], [4.2, 1.4], [6.2, 6], [5.4, 11]], col('#5cb0e4')); fillPoly(C, [[5.6, 11], [5.2, 4.6], [7.6, .8], [9.8, 4.6], [9.2, 11]], col('#8ad4f6')); fillPoly(C, [[8.6, 11], [8.6, 7.8], [10.2, 5.8], [11.4, 7.8], [11, 11]], col('#4a94d0')); stroke(C, [[7.4, 2.6], [6.6, 6]], .3, raw('#effcff')); stroke(C, [[3.6, 3.4], [3.2, 5.6]], .3, raw('#effcff')); },
  poisoned: C => { fillPoly(C, [[6, .8], [8.6, 5], [9.6, 7.6], [8.8, 10], [6, 11.4], [3.2, 10], [2.4, 7.6], [3.4, 5]], col('#5aa83a')); fillDisc(C, 4.6, 7.2, .9, raw('#c8f0a0')); fillDisc(C, 7.2, 8.8, .7, raw('#1e4a14')); fillDisc(C, 6.2, 6.2, .6, raw('#1e4a14')); fillDisc(C, 10.3, 2.4, .9, col('#8ad872')); fillDisc(C, 9.2, .9, .5, col('#8ad872')); },
  staggered: C => { const star = (x, y, r, c) => { fillPoly(C, [[x, y - r], [x + r * .3, y - r * .3], [x + r, y], [x + r * .3, y + r * .3], [x, y + r], [x - r * .3, y + r * .3], [x - r, y], [x - r * .3, y - r * .3]], c); }; star(2.6, 7.4, 2.4, col('#ffd84a')); star(6.2, 3.2, 2.4, col('#ffe680')); star(9.6, 7.2, 2.2, col('#ffc830')); stroke(C, [[2, 11], [6, 10], [10, 11]], .45, col('#c89830')); },
  warded: C => { fillPoly(C, [[6, .8], [10.6, 2.6], [10.2, 7], [6, 11.4], [1.8, 7], [1.4, 2.6]], col('#6a9ae0')); fillPoly(C, [[6, 2.6], [9, 3.8], [8.7, 6.8], [6, 9.6], [3.3, 6.8], [3, 3.8]], col('#a8d0ff')); stroke(C, [[6, 3.6], [6, 8.4]], .45, raw('#ffffff')); stroke(C, [[4.4, 5.6], [7.6, 5.6]], .45, raw('#ffffff')); },
  hasted: C => { const c = col('#ffe066'); fillPoly(C, [[2.2, 2], [5.4, 6], [2.2, 10], [3.8, 10], [7, 6], [3.8, 2]], c); fillPoly(C, [[6.2, 2], [9.4, 6], [6.2, 10], [7.8, 10], [11, 6], [7.8, 2]], col('#ffc830')); stroke(C, [[.6, 4.4], [1.6, 4.4]], .35, col('#fff4c0')); stroke(C, [[.6, 7.6], [1.6, 7.6]], .35, col('#fff4c0')); },
  regenerating: C => { fillPoly(C, [[4.4, 1.2], [7.6, 1.2], [7.6, 4.4], [10.8, 4.4], [10.8, 7.6], [7.6, 7.6], [7.6, 10.8], [4.4, 10.8], [4.4, 7.6], [1.2, 7.6], [1.2, 4.4], [4.4, 4.4]], col('#52c85a')); fillPoly(C, [[6, 3], [8, 5.2], [6, 7.8], [4.4, 5.4]], raw('#b8f0a4')); },
  frightened: C => { fillPoly(C, [[6, .8], [9.4, 2.2], [10.4, 5.6], [10.4, 10.6], [9, 9.6], [7.6, 11], [6, 9.8], [4.4, 11], [3, 9.6], [1.6, 10.6], [1.6, 5.6], [2.6, 2.2]], col('#c8b8f0')); fillDisc(C, 4.4, 5, 1.2, raw('#1a1030')); fillDisc(C, 7.6, 5, 1.2, raw('#1a1030')); px(C, 4.1, 4.5, raw('#ffffff')); px(C, 7.3, 4.5, raw('#ffffff')); fillPoly(C, [[5.2, 7], [6.8, 7], [6.4, 8.6], [5.6, 8.6]], raw('#1a1030')); },
  guarding: C => { fillPoly(C, [[1.6, 1.4], [10.4, 1.4], [10.2, 6], [6, 11.2], [1.8, 6]], col('#8290a8')); fillPoly(C, [[3, 2.6], [9, 2.6], [8.8, 5.8], [6, 9.4], [3.2, 5.8]], col('#566079')); fillDisc(C, 6, 4.8, 1.3, col('#f5cd58')); },
  marked: C => { const c = col('#e8503a'); for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; fillDisc(C, 6 + Math.cos(t) * 4.2, 6 + Math.sin(t) * 4.2, .5, c); } stroke(C, [[6, .6], [6, 3]], .45, c); stroke(C, [[6, 9], [6, 11.4]], .45, c); stroke(C, [[.6, 6], [3, 6]], .45, c); stroke(C, [[9, 6], [11.4, 6]], .45, c); fillDisc(C, 6, 6, 1.1, raw('#ffd0b0')); },
  bleeding: C => { const drop = (x, y, s) => fillPoly(C, [[x, y - 2.6 * s], [x + 1.5 * s, y], [x + 1.2 * s, y + 1.4 * s], [x, y + 2 * s], [x - 1.2 * s, y + 1.4 * s], [x - 1.5 * s, y]], col('#c8283a')); drop(3.6, 4.4, 1.3); drop(8.2, 3.8, 1.1); drop(6.4, 8.6, 1.35); px(C, 3, 4.4, raw('#ff8a80')); px(C, 5.8, 8.4, raw('#ff8a80')); },
  exposed: C => { fillPoly(C, [[1.6, 1.4], [10.4, 1.4], [10.2, 6], [6, 11.2], [1.8, 6]], col('#8290a8')); fillPoly(C, [[6.6, 1.4], [8.8, 1.4], [7.2, 4], [8.4, 6.2], [6.4, 8.4], [5.6, 6.2], [6.6, 4.4], [5.4, 2.8]], raw('#0b0910')); fillPoly(C, [[9.4, 7.4], [11.4, 7], [11, 9.4]], col('#8290a8')); },
  provoked: C => { const c = col('#e8503a'); stroke(C, [[2.2, 4.6], [4.2, 4], [4.6, 2]], .6, c); stroke(C, [[7.4, 2], [7.8, 4], [9.8, 4.6]], .6, c); stroke(C, [[2.2, 7.4], [4.2, 8], [4.6, 10]], .6, c); stroke(C, [[9.8, 7.4], [7.8, 8], [7.4, 10]], .6, c); },
  rooted: C => { const c = col('#8a5428'); stroke(C, [[6, 1.4], [6, 6.6]], .8, c); stroke(C, [[6, 6], [3, 8.4], [1.4, 11]], .55, c); stroke(C, [[6, 6], [9, 8.4], [10.6, 11]], .55, c); stroke(C, [[6, 6.4], [6, 11.2]], .55, c); stroke(C, [[4.2, 8.6], [4, 11]], .4, c); stroke(C, [[7.8, 8.6], [8.2, 11]], .4, c); fillPoly(C, [[6, 2.6], [9.2, .8], [8.6, 3.2]], col('#5aa83a')); fillPoly(C, [[6, 3.2], [2.8, 1.6], [3.6, 3.8]], col('#46903a')); },
};
export const STATUS_KEYS = Object.keys(ST);

/* ---------- aspect tokens ---------- */
const AS = {
  ember: ['#6a1a08', '#c83c14', C => { fillPoly(C, [[6, 2], [8.2, 5], [8.6, 7.6], [7.4, 9.4], [6, 9.9], [4.6, 9.4], [3.4, 7.6], [4, 5.4], [5, 6.4]], raw('#ffbe48')); fillDisc(C, 6.1, 8, 1, raw('#fff4b4')); }],
  frost: ['#0e2f5a', '#2a74b4', C => { const c = raw('#e6f8ff'); for (const a of [0, 1, 2]) { const t = a * Math.PI / 3; stroke(C, [[6 - Math.sin(t) * 3.6, 6 - Math.cos(t) * 3.6], [6 + Math.sin(t) * 3.6, 6 + Math.cos(t) * 3.6]], .45, c); } }],
  storm: ['#1c1850', '#4a52c8', C => { fillPoly(C, [[7, 1.8], [3.6, 6.6], [6, 6.6], [4.8, 10.4], [8.6, 5.2], [6.2, 5.2]], raw('#fffce0')); }],
  stone: ['#4a2e0e', '#9a6a28', C => { fillPoly(C, [[2.2, 9.4], [4.4, 4.2], [6.2, 5.8], [7.4, 3.2], [9.8, 9.4]], raw('#f8c85a')); fillPoly(C, [[4.4, 4.2], [5.2, 6.6], [3.4, 9.4], [2.2, 9.4]], raw('#c08a34')); }],
  verdant: ['#0e3a14', '#2a8a2e', C => { fillPoly(C, [[2.4, 9.6], [3.4, 5.4], [6.4, 2.6], [9.8, 2.2], [9.2, 5.8], [6.6, 8.8]], raw('#a6f066')); stroke(C, [[2.6, 9.4], [7.6, 4.4]], .4, raw('#2a6a1e')); }],
  tide: ['#0a2a44', '#246a8c', C => { const c = raw('#94daf0'); stroke(C, [[1.8, 5.6], [3.4, 4.2], [5, 5.6], [6.6, 7], [8.2, 5.6], [9.8, 4.2], [10.4, 4.8]], .55, c); stroke(C, [[1.8, 8.4], [3.4, 7], [5, 8.4], [6.6, 9.8], [8.2, 8.4], [9.8, 7]], .5, raw('#e6fbff')); }],
  radiant: ['#6a4e10', '#c89a2e', C => { fillDisc(C, 6, 6, 2.2, raw('#fff8d4')); for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; stroke(C, [[6 + Math.cos(t) * 3.2, 6 + Math.sin(t) * 3.2], [6 + Math.cos(t) * 4.4, 6 + Math.sin(t) * 4.4]], .4, raw('#ffe8a0')); } }],
  blight: ['#2a0e3a', '#5e2272', C => { fillDisc(C, 6, 5.4, 3.2, raw('#b4d65a')); fillPoly(C, [[4, 7], [8, 7], [7.6, 9.6], [4.4, 9.6]], raw('#b4d65a')); fillDisc(C, 4.7, 5.4, .9, raw('#1a0826')); fillDisc(C, 7.3, 5.4, .9, raw('#1a0826')); px(C, 5.4, 8.4, raw('#1a0826')); px(C, 6.6, 8.4, raw('#1a0826')); }],
};
const iconCache = lru(200);
export function statusIcon(key, o = {}) {
  const size = o.size || 12;
  return iconCache.get('s' + key + size, () => { const C = canvas(size, size / 12); if (ST[key]) ST[key](C); return finish(C); });
}
export function aspectIcon(aspect, o = {}) {
  const size = o.size || 12;
  return iconCache.get('a' + aspect + size, () => {
    const C = canvas(size, size / 12), A = AS[aspect];
    if (A) { fillDisc(C, 6, 6, 5.4, hx(A[1])); fillDisc(C, 6.4, 6.4, 4.6, hx(A[0])); A[2](C); }
    return finish(C);
  });
}
export function gripIcon(o = {}) {
  const size = o.size || 12;
  return iconCache.get('g' + size + (o.broken ? 'b' : ''), () => {
    const C = canvas(size, size / 12), c = hx('#8290a8'), c2 = hx('#b4c3d2');
    const link = (cx, cy, rx, ry, cc, gap) => { for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2; if (gap && t > 2.5 && t < 3.8) continue; fillDisc(C, cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, .75, cc); } };
    link(4.2, 4.4, 2.9, 2.1, c, false); link(7.8, 7.6, 2.9, 2.1, c2, !!o.broken);
    return finish(C);
  });
}
