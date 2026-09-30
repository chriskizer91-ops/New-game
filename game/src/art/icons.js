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
// M3 (lock prompt, Journal Keys tab):
// lockIcon(id, { size=12, dim }) -> ImageData   ids: LOCK_ICON_KEYS (every LOCKS type, plus 'crownwall');
//   an unknown id draws a padlock; dim greys it (a lock already opened)
// keyIcon(kind, { size=12, dim }) -> ImageData  kinds: KEY_ICON_KEYS ('power' = a relic's map power, then the
//   Domain ids); an unknown kind draws a plain token
// markIcon(ok, { size=12 }) -> ImageData        a green check (ok) or a red cross
// statusIcon draws a neutral token for a status key it has no icon for. (M5 adds burrowed, swallowed, charmed; M6 rotting and hexed;
// M7 unmade and hearthlit.)
// M4 (Hilda's forge, the Sunscorch locks):
// gemIcon(id, { size=12 }) -> ImageData       ids: GEM_ICON_KEYS (data/gems.js); an unknown id draws a plain stone
//   in its GEMS colour, or grey
// materialIcon(id, { size=12 }) -> ImageData  ids: MATERIAL_ICON_KEYS ('scrap', 'silver', 'embers')
// lockIcon also draws the four Sunscorch locks: 'dune-glass', 'mirage', 'quicksand', 'vault-seal' (M5: and 'chasm', 'ice', 'rune-seal', 'drift';
// gemIcon: 'frost-opal'). Their keys are
// relic powers ('power') and the Craft, Knowledge and Survival Domains, which keyIcon already draws.
import { MAT, hx, mix } from './forge.js';
import { lru } from './cache.js';
import { GEMS } from '../data/gems.js';

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
  // M5: gone under the ground (a mound and its hole, the way down), held in something's jaws, beguiled (a heart in a swirl)
  burrowed: C => { fillPoly(C, [[.6, 11.2], [2.4, 7.6], [6, 6.2], [9.6, 7.6], [11.4, 11.2]], col('#b08a58')); fillPoly(C, [[3.6, 9], [6, 7.8], [8.4, 9], [6, 10.2]], raw('#2a1a0e')); stroke(C, [[6, .8], [6, 4]], .55, col('#e8d8b0')); fillPoly(C, [[3.9, 3.4], [8.1, 3.4], [6, 6.2]], col('#e8d8b0')); px(C, 2.2, 6, raw('#d8c090')); px(C, 9.8, 5.6, raw('#d8c090')); },
  swallowed: C => { fillPoly(C, [[.8, 6], [2.6, 2.4], [6, 1.2], [9.4, 2.4], [11.2, 6], [9.4, 9.6], [6, 10.8], [2.6, 9.6]], col('#a8403a')); fillPoly(C, [[2.4, 6], [3.6, 3.8], [6, 3.2], [8.4, 3.8], [9.6, 6], [8.4, 8.2], [6, 8.8], [3.6, 8.2]], raw('#2a0a10')); for (const x of [3.8, 6, 8.2]) { fillPoly(C, [[x - .9, 3.6], [x + .9, 3.6], [x, 5.4]], raw('#f4ecd8')); fillPoly(C, [[x - .9, 8.4], [x + .9, 8.4], [x, 6.6]], raw('#f4ecd8')); } },
  // M6 (spec §4.2): Rotting, a heart going over to the rot (a heal does half), the last of its red on one side, the
  // rot dripping off it; Hexed, a witch's hex-star in a violet ring round an eye that sees you
  rotting: C => {
    const heart = [[6, 11.2], [1.4, 6.6], [.9, 4], [2.2, 1.8], [4.4, 1.5], [6, 3.2], [7.6, 1.5], [9.8, 1.8], [11.1, 4], [10.6, 6.6]];
    fillPoly(C, heart, col('#86702a'));
    fillPoly(C, [[6, 11.2], [1.4, 6.6], [.9, 4], [2.2, 1.8], [4.4, 1.5], [6, 3.2], [4.6, 5.6], [5.4, 8.4]], col('#b0443a'));
    for (const [x, y, r] of [[7.9, 4.4, 1.25], [9, 7.1, .85], [6.3, 7.3, .8], [4.3, 9.1, .5]]) fillDisc(C, x, y, r, raw('#2c2210'));
    px(C, 2.6, 3.2, raw('#f4a898')); px(C, 9.8, 3.4, raw('#dcd070'));
    stroke(C, [[8.4, 9], [8.6, 11.6]], .45, col('#86702a'));
  },
  hexed: C => {
    fillDisc(C, 6, 6, 5.5, col('#4a2270'));
    const tri = r => [0, 1, 2, 0].map(k => [6 + Math.cos(k * 2 * Math.PI / 3 - Math.PI / 2 + r) * 4.5, 6 + Math.sin(k * 2 * Math.PI / 3 - Math.PI / 2 + r) * 4.5]);
    stroke(C, tri(0), .32, raw('#c89af0')); stroke(C, tri(Math.PI), .32, raw('#c89af0'));
    fillPoly(C, [[3.7, 6], [6, 4.5], [8.3, 6], [6, 7.5]], raw('#f0e0ff')); fillDisc(C, 6, 6, 1.05, raw('#9a3aee')); px(C, 6, 6, raw('#140820'));
  },
  // M7 (spec §3.5): Unmade, the relic's power struck out of a hero: a cracked gem on an anvil, its light going out
  unmade: C => {
    fillPoly(C, [[1.2, 10.8], [2.4, 8.2], [9.6, 8.2], [10.8, 10.8]], col('#4a4a52'));
    fillPoly(C, [[3.4, 8.2], [4.2, 6.8], [7.8, 6.8], [8.6, 8.2]], col('#6a6a74'));
    fillPoly(C, [[6, 1], [9, 3.6], [6, 6.4], [3, 3.6]], col('#7a6aa8'));
    stroke(C, [[6.2, 1.4], [5.4, 3.4], [6.6, 4.2], [5.8, 6]], .45, raw('#140c20'));
    px(C, 4.4, 3.2, raw('#c8b8f0'));
  },
  // M7 (spec §4.5): Hearthlit, the hearth's own fire in a hero (the Masterpiece's Kindle): a gold flame on a hearth-stone
  hearthlit: C => {
    fillPoly(C, [[1.4, 11.2], [2.2, 9], [9.8, 9], [10.6, 11.2]], col('#8a7a6a'));
    fillPoly(C, [[6, .8], [8.6, 4], [9.2, 6.2], [8.2, 8.4], [6, 9.2], [3.8, 8.4], [2.8, 6.2], [3.6, 4.2], [4.8, 5.4], [5.4, 2.8]], col('#f5b82a'));
    fillPoly(C, [[6.1, 3.8], [7.7, 6], [7.4, 7.8], [6, 8.6], [4.6, 7.8], [4.6, 6.2], [5.4, 6.8]], raw('#fff0a0'));
    fillDisc(C, 6.1, 7.4, .9, raw('#ffffff'));
  },
  charmed: C => { const pts = []; for (let k = 0; k <= 20; k++) { const a = k * .55, r = 1 + k * .22; pts.push([6 + Math.cos(a) * r, 6.2 + Math.sin(a) * r * .9]); } stroke(C, pts, .35, raw('#f8b8dc')); fillDisc(C, 4.7, 5.2, 1.9, col('#f06aa8')); fillDisc(C, 7.3, 5.2, 1.9, col('#f06aa8')); fillPoly(C, [[2.9, 5.8], [9.1, 5.8], [6, 9.6]], col('#f06aa8')); px(C, 4.2, 4.4, raw('#ffe0f0')); },
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
const iconCache = lru(400);
// a neutral token for statuses added after this table
const ST_OTHER = C => { fillPoly(C, [[6, .8], [11.2, 6], [6, 11.2], [.8, 6]], col('#7c7894')); fillPoly(C, [[6, 3.2], [8.8, 6], [6, 8.8], [3.2, 6]], col('#b0acc6')); fillDisc(C, 6, 6, .9, raw('#ffffff')); };
export function statusIcon(key, o = {}) {
  const size = o.size || 12;
  return iconCache.get('s' + key + size, () => { const C = canvas(size, size / 12); if (ST[key]) ST[key](C); else if (key) ST_OTHER(C); return finish(C); });
}
export function aspectIcon(aspect, o = {}) {
  const size = o.size || 12;
  return iconCache.get('a' + aspect + size, () => {
    const C = canvas(size, size / 12), A = AS[aspect];
    if (A) { fillDisc(C, 6, 6, 5.4, hx(A[1])); fillDisc(C, 6.4, 6.4, 4.6, hx(A[0])); A[2](C); }
    return finish(C);
  });
}
/* ---------- lock types, keys and marks (M3; 12-unit space) ---------- */
const thorns = (C, list, c) => { for (const [x, y, dx, dy] of list) { const nx = -dy * .45, ny = dx * .45; fillPoly(C, [[x - nx, y - ny], [x + dx, y + dy], [x + nx, y + ny]], c); } };
const LK = {
  thornwall: C => {
    const v = col('#3e6a2a'), d = col('#27401c'), t = col('#d8b070');
    stroke(C, [[.6, 3.8], [3, 2.8], [6, 4], [9, 3], [11.4, 3.8]], 1.05, v); stroke(C, [[.6, 8.4], [3, 9.4], [6, 8.2], [9, 9.2], [11.4, 8.4]], 1.05, v);
    for (const [a, b] of [[2.6, 3.4], [6.2, 5.6], [9.4, 8.8]]) stroke(C, [[a, 3.2], [b, 9]], .72, d);
    thorns(C, [[1.6, 3, -.4, -1.6], [4.6, 2.9, .3, -1.7], [7.8, 3, -.2, -1.7], [10.6, 3, .5, -1.5], [2, 9.8, -.4, 1.5], [5, 9.2, .3, 1.7], [8, 9.8, -.2, 1.5], [10.7, 9.2, .5, 1.5]], t);
  },
  bramble: C => {
    fillDisc(C, 6, 7.2, 4.4, col('#2c5a22')); fillDisc(C, 3.6, 5.4, 2.6, col('#3a7030')); fillDisc(C, 8.4, 5.2, 2.8, col('#3a7030')); fillDisc(C, 6.2, 3.4, 2, col('#468038'));
    stroke(C, [[1.6, 9.8], [4, 6.8], [6.4, 7.8], [8.6, 5.6], [10.4, 8.4]], .42, raw('#1a3414'));
    thorns(C, [[4, 6.8, -.6, -1], [8.6, 5.6, .5, -1], [6.4, 7.8, .2, 1.1]], raw('#d8b070'));
    fillDisc(C, 7.8, 9, .95, raw('#c8283a')); fillDisc(C, 4.2, 9.4, .85, raw('#c8283a')); px(C, 7.5, 8.6, raw('#ff9a90'));
  },
  stream: C => {
    fillPoly(C, [[.6, 3.2], [11.4, 3.2], [11.4, 9.8], [.6, 9.8]], col('#1f5f86'));
    stroke(C, [[1.2, 5], [2.8, 4.2], [4.4, 5], [6, 5.8], [7.6, 5], [9.2, 4.2], [10.8, 5]], .45, raw('#94daf0'));
    stroke(C, [[1.2, 7.8], [2.8, 7], [4.4, 7.8], [6, 8.6], [7.6, 7.8], [9.2, 7], [10.8, 7.8]], .45, raw('#e6fbff'));
  },
  boulder: C => {
    fillPoly(C, [[1.4, 10.8], [.8, 7.2], [2.4, 3.8], [5.4, 1.8], [8.8, 2.4], [11, 5.4], [11.2, 9.2], [10, 10.8]], col('#8c8478'));
    stroke(C, [[5.6, 2.4], [6.6, 5.2], [5.2, 7.4], [6.2, 10.4]], .42, raw('#3a3632')); stroke(C, [[6.6, 5.2], [9, 6.4]], .36, raw('#3a3632'));
    fillPoly(C, [[2.6, 4.6], [4.4, 3], [4.2, 5.2]], raw('#c2baac'));
  },
  'cold-hearth': C => {
    fillPoly(C, [[1, 7.4], [11, 7.4], [10, 11.2], [2, 11.2]], col('#5c5852'));
    for (const x of [2.4, 4.8, 7.2, 9.6]) fillDisc(C, x, 7.6, 1.35, col('#7c766c'));
    fillDisc(C, 4.8, 6.4, 1.2, col('#3c3c44')); fillDisc(C, 7.2, 6.2, 1.3, col('#46464e'));
    stroke(C, [[6, 5], [5.2, 3.4], [6.6, 2], [5.8, .6]], .45, raw('#90a8c0'));
  },
  'tally-seal': C => {
    const w = col('#a8202a');
    for (let a = 0; a < 14; a++) { const t = a / 14 * Math.PI * 2; fillDisc(C, 6 + Math.cos(t) * 4.3, 6 + Math.sin(t) * 4.3, 1.25, w); }
    fillDisc(C, 6, 6, 4.4, w);
    const m = raw('#560a10'); for (const x of [3.9, 5.3, 6.7, 8.1]) stroke(C, [[x, 3.8], [x, 8.2]], .36, m); stroke(C, [[3, 7.8], [9, 4.2]], .36, m);
  },
  'barred-gate': C => {
    for (const x of [2.2, 4.8, 7.4, 10]) fillPoly(C, [[x - 1.1, 1.8], [x, 1], [x + 1.1, 1.8], [x + 1.1, 11.2], [x - 1.1, 11.2]], col('#7c5432'));
    fillPoly(C, [[.4, 5], [11.6, 5], [11.6, 7.1], [.4, 7.1]], col('#6c7282'));
    fillDisc(C, 1.4, 6, .75, raw('#2a2c34')); fillDisc(C, 10.6, 6, .75, raw('#2a2c34'));
  },
  darkness: C => {
    fillDisc(C, 6, 6, 5.4, col('#3c3466')); fillDisc(C, 7.2, 4.9, 4.9, raw('#07060c'));
    px(C, 5.2, 6.6, raw('#d8d0f4')); px(C, 7.4, 6.6, raw('#d8d0f4'));
  },
  'rot-knot': C => {
    const r = col('#5a402c'), d = col('#3a281c');
    for (let a = 0; a < 36; a++) { const t = a / 36 * Math.PI * 2; fillDisc(C, 6 + Math.cos(t) * 3.4, 6.2 + Math.sin(t) * 3, .95, r); }
    stroke(C, [[.8, 10.8], [3.6, 8], [8.6, 4], [11.2, 1.2]], .9, d); stroke(C, [[1.2, 2.6], [3.4, 4.2]], .7, d); stroke(C, [[8.8, 8.4], [10.8, 10.8]], .7, d);
    fillDisc(C, 6, 6.2, 1.6, raw('#2a0a3a')); px(C, 5.6, 5.8, raw('#b4d65a'));
  },
  'rope-ledge': C => {
    fillPoly(C, [[.4, 1], [11.6, 1], [11.6, 3.6], [8.4, 4.4], [4.6, 3.8], [.4, 4.6]], col('#80786c'));
    const rp = col('#c8a468'); stroke(C, [[6, 3.8], [5.4, 6.2], [6.4, 8.4], [5.8, 10]], .6, rp);
    for (let a = 0; a < 18; a++) { const t = a / 18 * Math.PI * 2; fillDisc(C, 7.6 + Math.cos(t) * 2.3, 10 + Math.sin(t) * 1.2, .5, rp); }
    for (const y of [5, 7.2]) stroke(C, [[5, y], [6.6, y + .6]], .28, raw('#7a5a2e'));
  },
  ichor: C => {
    fillPoly(C, [[6, .8], [8.6, 5], [9.6, 7.6], [8.8, 10], [6, 11.4], [3.2, 10], [2.4, 7.6], [3.4, 5]], col('#1c1024'));
    stroke(C, [[7.4, 6.2], [8.2, 8.8]], .38, raw('#7a2c96')); fillDisc(C, 4.6, 7.4, .9, raw('#b4d65a')); px(C, 4.3, 6.8, raw('#eaffa8'));
  },
  crownwall: C => {
    fillPoly(C, [[.8, 11], [1.4, 5], [3.2, 7.4], [4.4, 2], [6, 6.2], [7.6, 2], [8.8, 7.4], [10.6, 5], [11.2, 11]], col('#2c4c20'));
    stroke(C, [[1.4, 9], [4, 8.2], [8, 8.2], [10.6, 9]], .45, raw('#18300f'));
    fillDisc(C, 6, 8.8, 1.9, col('#4ec436')); px(C, 5.5, 8.2, raw('#effcc8'));
  },
  // M4: the Sunscorch locks
  'dune-glass': C => {
    fillPoly(C, [[.4, 11.2], [1.8, 7], [4.4, 4.4], [7.6, 4], [10.4, 6.4], [11.6, 11.2]], col('#d0a868'));
    fillPoly(C, [[1.4, 8.6], [3, 5.6], [5.2, 4.2], [7.8, 4], [10, 5.8], [11.2, 8.6], [9.2, 7.6], [6.6, 8.2], [4, 7.4]], col('#84c8c2'));
    stroke(C, [[3.4, 5.8], [5.6, 4.8]], .35, raw('#effffa')); stroke(C, [[1.6, 10], [4.8, 9.4], [7.6, 10.2], [10.4, 9.6]], .35, raw('#ffb04a'));
  },
  mirage: C => {
    fillDisc(C, 6, 7.2, 3.6, col('#2e6a6e'));
    const w = (y, c) => stroke(C, [[.8, y], [2.6, y - .9], [4.4, y], [6.2, y + .9], [8, y], [9.8, y - .9], [11.2, y]], .42, c);
    w(3.4, raw('#e6fbff')); w(6.2, raw('#94daf0')); w(9, raw('#e6fbff'));
  },
  quicksand: C => {
    fillPoly(C, [[.6, 7.6], [3, 5.4], [6, 4.8], [9, 5.4], [11.4, 7.6], [9.6, 10.6], [6, 11.4], [2.4, 10.6]], col('#c89a58'));
    const pts = []; for (let k = 0; k < 26; k++) { const a = k * .5, r = 4.6 - k * .16; pts.push([6 + Math.cos(a) * r, 8 + Math.sin(a) * r * .55]); }
    stroke(C, pts, .38, raw('#7a5428')); fillDisc(C, 6, 8, .9, raw('#3a2410'));
  },
  'vault-seal': C => {
    fillDisc(C, 6, 6, 5.3, col('#4a4040')); fillDisc(C, 6, 6, 4, col('#262024'));
    for (const [a, b] of [[[2.4, 2.8], [4, 4.6]], [[9.4, 8.6], [8, 7.2]]]) stroke(C, [a, b], .32, raw('#6a5a52'));
    fillDisc(C, 6, 4.9, 1.35, raw('#ff8a2a')); fillPoly(C, [[5.2, 5.6], [6.8, 5.6], [7.2, 8.6], [4.8, 8.6]], raw('#ff8a2a')); px(C, 5.6, 4.4, raw('#fff0b4'));
  },
  // M5: the Ironspire locks: a chasm between two cliffs, a wall of ice, the dwarves' rune-seal (the rune alight), a snow drift
  chasm: C => {
    fillPoly(C, [[.4, 11.4], [.8, 3.6], [3, 2.4], [4.6, 4.2], [4.2, 11.4]], col('#6a6470'));
    fillPoly(C, [[7.6, 11.4], [7.2, 4.6], [9, 2.8], [11.2, 3.8], [11.6, 11.4]], col('#6a6470'));
    fillPoly(C, [[4.2, 11.4], [4.6, 4.2], [7.2, 4.6], [7.6, 11.4]], raw('#14101c'));
    stroke(C, [[5, 9], [6, 7.4], [6.8, 8.8]], .3, raw('#cfe8ff')); px(C, 2, 3.4, raw('#b8b0c0')); px(C, 9.6, 3.6, raw('#b8b0c0'));
  },
  ice: C => {
    fillPoly(C, [[1, 11.4], [1.4, 2.4], [6, .8], [10.6, 2.4], [11, 11.4]], col('#7ab8dc'));
    fillPoly(C, [[2.4, 3], [6, 1.8], [9.6, 3], [6, 4.4]], raw('#d4f0ff'));
    stroke(C, [[4, 5], [5.4, 7.4], [4.6, 9.6]], .3, raw('#2a5a7c')); stroke(C, [[5.4, 7.4], [8, 8.2]], .28, raw('#2a5a7c')); px(C, 8.4, 4.4, raw('#ffffff'));
  },
  'rune-seal': C => {
    fillDisc(C, 6, 6, 5.3, col('#5a5a64')); fillDisc(C, 6, 6, 4.1, col('#3a3a44'));
    stroke(C, [[6, 2.6], [6, 9.4]], .45, raw('#ffb04a')); stroke(C, [[6, 4], [8.2, 6], [6, 8]], .4, raw('#ffb04a')); stroke(C, [[6, 6], [3.8, 4.2]], .4, raw('#ffb04a'));
    px(C, 6, 5.6, raw('#fff0b4')); px(C, 4.2, 3.2, raw('#e4e8f4'));
  },
  drift: C => {
    fillPoly(C, [[.4, 11.2], [1.6, 7.4], [4, 5.4], [7, 4.8], [9.6, 6.2], [11.6, 11.2]], col('#e8f2fc'));
    fillPoly(C, [[5.6, 11.2], [8.4, 7.8], [10.2, 8.4], [11.6, 11.2]], raw('#a4c0dc'));
    for (const [x, y] of [[2.4, 2.4], [6.4, 1.6], [9.6, 2.8], [4.4, 3.6]]) px(C, x, y, raw('#ffffff'));
  },
  // M6: the Gloomfen locks: a boot going down into black bog (reeds either side, a bubble), a lamp-post lost in banks of
  // fog, black water at a dock's end, a bough hung with ward-stones (one still glowing)
  bog: C => {
    fillPoly(C, [[.4, 11.4], [.6, 7.2], [3, 5.8], [9, 5.8], [11.4, 7.2], [11.6, 11.4]], col('#4a3e24'));
    fillPoly(C, [[1.8, 9.4], [4, 7.8], [8.4, 7.8], [10.4, 9.4], [8.6, 10.8], [3.2, 10.8]], raw('#16120a'));
    fillPoly(C, [[4.4, 2.4], [7.2, 2.4], [7.2, 6.4], [9, 7.4], [9, 8.8], [4.4, 8.8]], col('#7a5230')); stroke(C, [[4.4, 2.6], [7.2, 2.6]], .5, raw('#b0845a'));
    fillPoly(C, [[3, 8.6], [10.4, 8.6], [9.6, 9.8], [3.6, 9.8]], raw('#16120a'));
    fillDisc(C, 2.4, 8.6, .55, raw('#9a9a6a')); px(C, 10.2, 10, raw('#9a9a6a'));
    stroke(C, [[1, 6.8], [1.4, 3.6]], .32, raw('#7a8a34')); stroke(C, [[10.9, 7], [10.4, 4.2]], .32, raw('#7a8a34')); stroke(C, [[11.6, 7.4], [11.8, 5.2]], .3, raw('#5a6a28'));
  },
  fog: C => {
    stroke(C, [[6, 4], [6, 11.4]], .45, col('#3e3630'));
    fillPoly(C, [[4.7, 1.8], [7.3, 1.8], [7, 4.6], [5, 4.6]], col('#4a4038')); fillDisc(C, 6, 3.3, .85, raw('#ffe08a')); px(C, 6, 3.1, raw('#fffbe0'));
    for (const [y, a, b, w] of [[6, .4, 7.8, 1.1], [8.2, 3.4, 11.6, 1.2], [10.4, .6, 9.2, 1.1]]) stroke(C, [[a, y], [(a + b) / 2, y - .7], [b, y]], w * .55, col('#b8c0c8'));
  },
  blackwater: C => {
    fillPoly(C, [[.4, 6], [11.6, 6], [11.6, 11.4], [.4, 11.4]], col('#1a2a2e'));
    fillPoly(C, [[.4, 3.4], [6.4, 3.4], [6.4, 5], [.4, 5]], col('#8a6a44')); stroke(C, [[1.6, 5], [1.6, 8]], .5, raw('#5a4428')); stroke(C, [[5.2, 5], [5.2, 8]], .5, raw('#5a4428'));
    stroke(C, [[7.4, 8.6], [8.6, 7.8], [9.8, 8.6]], .35, raw('#4a7a82')); px(C, 3, 9.6, raw('#6aa0a8'));
  },
  'witch-ward': C => {
    stroke(C, [[.6, 2.8], [3.6, 1.8], [8.4, 1.8], [11.4, 2.8]], .6, col('#5a3e22'));
    for (const [x, y] of [[2.2, 7.4], [4.2, 9.4], [7.8, 9.4], [9.8, 7.4]]) { stroke(C, [[x, 2.6], [x, y - 1.4]], .22, raw('#b89a5e')); fillDisc(C, x, y, 1.4, col('#8a8478')); px(C, x, y, raw('#1a1814')); }
    stroke(C, [[6, 2.2], [6, 4.4]], .22, raw('#b89a5e')); fillDisc(C, 6, 6, 1.6, col('#8a8478')); fillDisc(C, 6, 6, .7, raw('#9ae07a')); px(C, 6, 5.8, raw('#eaffd0'));
  },
  lock: C => {
    stroke(C, [[3.6, 6], [3.6, 3.6], [6, 1.4], [8.4, 3.6], [8.4, 6]], .75, col('#8c96ac'));
    fillPoly(C, [[2, 5.6], [10, 5.6], [10, 11.2], [2, 11.2]], col('#c89a2e'));
    fillDisc(C, 6, 7.9, .95, raw('#2a1a08')); stroke(C, [[6, 8.2], [6, 10]], .4, raw('#2a1a08'));
  },
};
export const LOCK_ICON_KEYS = Object.keys(LK).filter(k => k !== 'lock');
const KY = {
  power: C => {
    const g = col('#d99328');
    stroke(C, [[4.8, 6.2], [11.2, 6.2]], .8, g); stroke(C, [[9.2, 6.2], [9.2, 9]], .62, g); stroke(C, [[10.9, 6.2], [10.9, 8.4]], .62, g);
    fillDisc(C, 3.4, 6.2, 2.9, g); fillDisc(C, 3.4, 6.2, 1.35, raw('#93162e')); px(C, 3, 5.6, raw('#ff7866'));
  },
  physical: C => {
    fillPoly(C, [[2.2, 4.2], [9.8, 4.2], [10.4, 8.4], [8.8, 11.2], [3.2, 11.2], [2, 8.4]], col('#d8a080'));
    for (const x of [4.1, 6.1, 8.1]) stroke(C, [[x, 4.4], [x, 6.4]], .3, raw('#8a5238'));
    fillPoly(C, [[2, 6.6], [5.6, 6.6], [6, 8.4], [2.4, 8.6]], col('#e8b89c'));
    fillPoly(C, [[3.2, 11], [8.8, 11], [8.8, 12], [3.2, 12]], col('#7c4528'));
  },
  survival: C => {
    fillPoly(C, [[1.8, 10.6], [2.6, 5.6], [6, 2], [10.6, 1.4], [10, 5.8], [6.8, 9.2]], col('#4e9a3a'));
    stroke(C, [[2, 10.4], [8.6, 3.4]], .42, raw('#28561c')); stroke(C, [[4.4, 7.6], [3.8, 5.4]], .3, raw('#28561c')); stroke(C, [[6.4, 5.4], [8, 6.8]], .3, raw('#28561c'));
  },
  attunement: C => {
    fillPoly(C, [[.6, 6], [3.2, 3], [6, 2.2], [8.8, 3], [11.4, 6], [8.8, 9], [6, 9.8], [3.2, 9]], col('#e8e0f4'));
    fillDisc(C, 6, 6, 2.5, raw('#8c3cc4')); fillDisc(C, 6, 6, 1, raw('#1a0830')); px(C, 5.2, 5.1, raw('#ffffff'));
  },
  knowledge: C => {
    fillPoly(C, [[.6, 2.8], [5.6, 3.6], [5.6, 10.8], [.6, 10]], col('#dccca0')); fillPoly(C, [[6.4, 3.6], [11.4, 2.8], [11.4, 10], [6.4, 10.8]], col('#ece0b8'));
    stroke(C, [[6, 3.6], [6, 11]], .45, raw('#6a4a2a'));
    for (const y of [5.4, 7, 8.6]) { stroke(C, [[1.6, y - .2], [4.8, y + .2]], .25, raw('#8a7652')); stroke(C, [[7.2, y + .2], [10.4, y - .2]], .25, raw('#8a7652')); }
  },
  influence: C => {
    fillPoly(C, [[.8, 1.8], [11.2, 1.8], [11.2, 8.4], [5.6, 8.4], [2.8, 11], [3.2, 8.4], [.8, 8.4]], col('#f0e6c8'));
    for (const x of [3.6, 6, 8.4]) fillDisc(C, x, 5.1, .8, raw('#6a5230'));
  },
  combat: C => {
    const s = col('#b8c6d4'), h = col('#8a5a2c');
    stroke(C, [[1.8, 1.8], [8.6, 8.6]], .62, s); stroke(C, [[10.2, 1.8], [3.4, 8.6]], .62, s);
    stroke(C, [[7.2, 10.2], [10.2, 7.2]], .5, h); stroke(C, [[1.8, 7.2], [4.8, 10.2]], .5, h);
  },
  craft: C => {
    stroke(C, [[2.6, 10.6], [7.4, 5.2]], .72, col('#8a5a2c'));
    fillPoly(C, [[5.4, 1.6], [10.8, 6.8], [9, 8.6], [3.6, 3.4]], col('#8c96ac'));
  },
  beastmastery: C => { const c = col('#a8683c'); fillDisc(C, 6, 8, 2.6, c); fillDisc(C, 2.6, 5, 1.25, c); fillDisc(C, 4.7, 2.8, 1.25, c); fillDisc(C, 7.3, 2.8, 1.25, c); fillDisc(C, 9.4, 5, 1.25, c); },
  psionics: C => { const pts = []; for (let k = 0; k < 30; k++) { const a = k * .44, r = .3 + k * .17; pts.push([6 + Math.cos(a) * r, 6 + Math.sin(a) * r]); } stroke(C, pts, .5, col('#c47ee8')); },
};
export const KEY_ICON_KEYS = Object.keys(KY);
const KEY_OTHER = C => { fillDisc(C, 6, 6, 4.6, col('#8c8674')); fillDisc(C, 6, 6, 2, col('#c4bca4')); };
const MK = {
  yes: C => stroke(C, [[1.8, 6.6], [4.6, 9.4], [10.4, 2.6]], 1, col('#52c85a')),
  no: C => { stroke(C, [[2.4, 2.4], [9.6, 9.6]], 1, col('#e8503a')); stroke(C, [[9.6, 2.4], [2.4, 9.6]], 1, col('#e8503a')); },
};
// grey a finished icon (keeps its outline): the look of a lock already opened
function dimmed(img) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3] || (d[i] === OUT[0] && d[i + 1] === OUT[1] && d[i + 2] === OUT[2])) continue; const l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) * .45 + 30; d[i] = l; d[i + 1] = l; d[i + 2] = l + 6; }
  return img;
}
export function lockIcon(id, o = {}) {
  const size = o.size || 12, key = LK[id] ? id : 'lock';
  return iconCache.get('l' + key + size + (o.dim ? 'd' : ''), () => { const C = canvas(size, size / 12); LK[key](C); const img = finish(C); return o.dim ? dimmed(img) : img; });
}
export function keyIcon(kind, o = {}) {
  const size = o.size || 12, key = KY[kind] ? kind : '-';
  return iconCache.get('k' + key + size + (o.dim ? 'd' : ''), () => { const C = canvas(size, size / 12); (KY[key] || KEY_OTHER)(C); const img = finish(C); return o.dim ? dimmed(img) : img; });
}
export function markIcon(ok, o = {}) {
  const size = o.size || 12;
  return iconCache.get('m' + (ok ? 'y' : 'n') + size, () => { const C = canvas(size, size / 12); MK[ok ? 'yes' : 'no'](C); return finish(C); });
}
/* ---------- gems and forge materials (M4; 12-unit space) ---------- */
const facet = (C, cx, cy, rx, ry, dark, mid, lite) => {
  fillPoly(C, [[cx - rx, cy], [cx - rx * .55, cy - ry], [cx + rx * .55, cy - ry], [cx + rx, cy], [cx + rx * .55, cy + ry], [cx - rx * .55, cy + ry]], col(mid));
  fillPoly(C, [[cx - rx * .55, cy - ry], [cx + rx * .55, cy - ry], [cx + rx * .3, cy - ry * .2], [cx - rx * .3, cy - ry * .2]], raw(lite));
  fillPoly(C, [[cx - rx, cy], [cx - rx * .3, cy + ry * .15], [cx + rx * .3, cy + ry * .15], [cx + rx, cy], [cx + rx * .55, cy + ry], [cx - rx * .55, cy + ry]], raw(dark));
};
const GEM_IC = {
  sunstone: C => { facet(C, 6, 6.4, 5, 4.4, '#9a4a0c', '#f08c1c', '#ffd27a'); px(C, 4.4, 3.4, raw('#ffffff')); px(C, 7.6, 7.8, raw('#fff2c4')); },
  'moss-agate': C => { fillDisc(C, 6, 6.4, 4.8, col('#4a8a48')); stroke(C, [[3, 9], [4.6, 6.8], [4, 4.6]], .38, raw('#1e3a1c')); stroke(C, [[4.6, 6.8], [7, 6], [8.6, 7.8]], .34, raw('#1e3a1c')); stroke(C, [[7, 6], [7.6, 3.8]], .3, raw('#1e3a1c')); px(C, 4, 3.6, raw('#dcf4c8')); },
  'glass-pearl': C => { fillDisc(C, 6, 6.4, 4.6, col('#a4bcd8')); fillDisc(C, 6.8, 7.2, 3, raw('#7c90aa')); fillDisc(C, 5.4, 5.6, 3, raw('#dcecfc')); fillDisc(C, 4.4, 4.4, 1.1, raw('#ffffff')); },
  'ash-garnet': C => { fillPoly(C, [[2, 3.4], [3.4, 2], [8.6, 2], [10, 3.4], [10, 8.6], [8.6, 10], [3.4, 10], [2, 8.6]], col('#b3261e')); fillPoly(C, [[3.4, 2], [8.6, 2], [7.4, 4.4], [4.6, 4.4]], raw('#e0604a')); fillPoly(C, [[4.6, 7.6], [7.4, 7.6], [8.6, 10], [3.4, 10]], raw('#5a0e10')); px(C, 7.6, 5.4, raw('#9e9690')); px(C, 4.2, 3, raw('#ffd0c0')); },
  // M5: the Frost Opal: a milky blue cabochon with fire in it (pink, green, violet, gold flecks)
  'frost-opal': C => {
    const oval = (cx, cy, rx, ry) => Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
    fillPoly(C, oval(6, 6.6, 4.8, 4.2), col('#9cc8e4')); fillPoly(C, oval(6.9, 7.5, 3.4, 2.8), raw('#6a9cc8')); fillPoly(C, oval(5.4, 5.8, 3.2, 2.7), raw('#d4ecfa'));
    for (const [x, y, c] of [[7.4, 5.6, '#ff9ad8'], [4.6, 7.8, '#8af0b0'], [8.2, 8.2, '#c0a0ff'], [6.2, 8.8, '#fff0a0']]) fillDisc(C, x, y, .62, raw(c));
    px(C, 4.2, 4.4, raw('#ffffff'));
  },
  // M6: Bog Amber, a honey drop of the fen's old resin, dark at its heart, a seed caught in it putting out a sprout
  'bog-amber': C => {
    fillPoly(C, [[6, .8], [8.4, 4], [9.6, 7], [8.8, 9.8], [6, 11.2], [3.2, 9.8], [2.4, 7], [3.6, 4]], col('#c8781a'));
    fillPoly(C, [[6, 4.6], [8.2, 7.2], [7.6, 9.4], [6, 10.2], [4.4, 9.4], [4, 7.2]], raw('#8a4a0e'));
    fillDisc(C, 6.3, 7.8, .95, raw('#2a1a08')); stroke(C, [[6.6, 7.2], [7.6, 5.8]], .28, raw('#6a8a2a'));
    px(C, 4.4, 4.2, raw('#fff0c8')); px(C, 4.9, 3.3, raw('#ffe0a0'));
  },
};
export const GEM_ICON_KEYS = Object.keys(GEM_IC);
export function gemIcon(id, o = {}) {
  const size = o.size || 12;
  return iconCache.get('j' + id + size, () => {
    const C = canvas(size, size / 12);
    if (GEM_IC[id]) GEM_IC[id](C);
    else { const c = GEMS[id] ? GEMS[id].color : '#8c8674'; fillDisc(C, 6, 6.4, 4.4, col(c)); fillDisc(C, 4.8, 5, 1.2, raw('#ffffff')); }
    return finish(C);
  });
}
const MAT_IC = {
  scrap: C => {
    for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2; fillDisc(C, 7.6 + Math.cos(t) * 3.2, 7.4 + Math.sin(t) * 3.2, .95, col('#b08a30')); }
    fillDisc(C, 7.6, 7.4, 2.7, col('#b08a30')); fillDisc(C, 7.6, 7.4, 1, raw('#2a1a08'));
    stroke(C, [[1.4, 2.4], [4.8, 5.2], [3.6, 9.8]], .7, col('#8290a8')); fillDisc(C, 1.4, 2.4, 1, col('#566079'));
  },
  silver: C => { fillPoly(C, [[1, 9.6], [2.8, 4.8], [9.2, 4.8], [11, 9.6]], col('#8e94a6')); fillPoly(C, [[2.8, 4.8], [9.2, 4.8], [8.2, 6.6], [3.8, 6.6]], raw('#f6f8fc')); stroke(C, [[3.2, 8.2], [8.6, 8.2]], .3, raw('#c8cedc')); },
  embers: C => {
    fillPoly(C, [[.8, 11], [2, 7.6], [4.4, 6.2], [6.4, 7], [8, 5.6], [10.4, 6.8], [11.4, 11]], col('#3a1a10'));
    stroke(C, [[2.4, 9.4], [4.4, 8], [5.6, 9.6]], .4, raw('#ee7a1c')); stroke(C, [[7, 8.8], [8.4, 7.4], [9.8, 8.8]], .4, raw('#ee7a1c'));
    fillDisc(C, 4.4, 8, .75, raw('#ffbe48')); fillDisc(C, 8.4, 7.4, .75, raw('#ffbe48')); px(C, 6.2, 3.4, raw('#ffbe48')); px(C, 8.2, 1.8, raw('#ee7a1c'));
  },
};
export const MATERIAL_ICON_KEYS = Object.keys(MAT_IC);
export function materialIcon(id, o = {}) {
  const size = o.size || 12;
  return iconCache.get('q' + id + size, () => { const C = canvas(size, size / 12); (MAT_IC[id] || KEY_OTHER)(C); return finish(C); });
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
