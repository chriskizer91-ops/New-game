// Painted maps (M5 spec A10, the art pilot): fits the paintings the player made from a map's layout
// references (art-requests/, tools/map-shots.mjs, tools/paint-refs.mjs) back onto the map's tile grid and
// writes them as src/ui/assets/paint/<map>.js, which ui/world/view.js draws as the map's ground.
//
//   node tools/paint-import.mjs --map=keep --src=../art-in/pilot/map-keep.png
//   node tools/paint-import.mjs --map=thornhollow --src=../art-in/pilot/map-thornhollow.png --grid
//   node tools/paint-import.mjs --batch=../art-in/batch-2 --refs=../art-requests/batch-2/refs/refs.json --grid
//   node tools/paint-import.mjs --cut=hearth-blue --src=../art-in/pilot/cut-blue-hearth.png [--width=768]
//   node tools/paint-import.mjs --stamp=keep,mossfall
//
// One painting per map: the reference was the map padded to the painting's aspect (extra tiles split
// evenly, odd ones right and bottom), so the painting's own aspect gives the padding back and the crop
// is exact. --batch takes every map in refs.json whose paintings are all in the folder (named as
// refs.json says: map-<id>.png, or map-<id>-a.png, -b.png for a long road's overlapping panels); panels
// are joined across the middle of their overlap, blended over at most three tiles.
// Each crop is resampled to --density x 16 px per tile (default 2: 32 px per tile, the density the world
// view draws a painted map at, ui/world/view.js PAINT_DENSITY) by area averaging in linear light,
// sharpened a little (--sharpen, default 0.35) and stored as WebP (--quality, default 0.8). --grid also
// writes tools/shots/paint/<map>-grid.png: the fitted painting with the solid tiles tinted red and the
// overhang tiles blue, to check that the painting's walls, trees and water sit on the map's.
// --cut takes a cut-scene still instead: the whole picture, resampled the same way to --width px across
// (default 768), written as src/ui/assets/cuts/<name>.js for the screens that show it.
// Each painting keeps a stamp of the rows it was fitted to (rowsSha); test/paint.test.mjs fails when a
// painted map's rows change after it. --stamp takes the paintings already in the game whose maps changed:
// it writes each one's grid overlay (look at it: the walls must still sit on the painting's) and restamps
// it with the rows as they are now, keeping the picture byte for byte. A painting that no longer fits is
// imported again from its source instead.
// Playwright and Chromium as in tools/gallery.mjs.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const TILE = 16;
const USAGE = 'usage: node tools/paint-import.mjs (--map=<id> --src=<painting>[,<panel b>...] | --batch=<dir> --refs=<refs.json> | --cut=<name> --src=<still> | --stamp=<id>[,<id>...]) [--refs=<refs.json>] [--sharpen=0.6] [--quality=0.85] [--grid] [--width=768]';
const { MAPS } = await import(pathToFileURL(path.join(root, 'src/data/maps/index.js')).href);
const { tileOf } = await import(pathToFileURL(path.join(root, 'src/data/tiles.js')).href);
const sharpen = args.sharpen === undefined ? 0.35 : +args.sharpen;
const quality = args.quality === undefined ? 0.8 : +args.quality;
const density = args.density === undefined ? 2 : +args.density;
if (!(density >= 1 && density <= 4 && Number.isInteger(density))) { console.error('--density is 1 to 4'); process.exit(2); }
// the rows a painting was fitted to, as test/paint.test.mjs computes them
const rowsSha = map => createHash('sha256').update(map.rows.join('\n')).digest('hex').slice(0, 12);
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const dataUrl = async file => {
  const mime = MIME[path.extname(file).slice(1).toLowerCase()];
  if (!mime) throw new Error(`${file}: PNG, JPG or WebP only`);
  return `data:${mime};base64,` + (await readFile(file)).toString('base64');
};
// the source as the repo names it (art-in/...), wherever this checkout sits
const rel = p => { const s = p.split(path.sep).join('/'); const i = s.lastIndexOf('/art-in/'); return i >= 0 ? s.slice(i + 1) : path.basename(s); };
const refs = args.refs ? JSON.parse(await readFile(path.resolve(String(args.refs)), 'utf8')) : null;

// the jobs: { id, cut?, panels: [{ file, rect: [x, y, w, h] tiles, pad: [t, r, b, l] | null (from the aspect) }] }
const jobs = [];
if (args.cut) {
  const name = String(args.cut);
  if (!/^[a-z0-9-]+$/.test(name) || !args.src) { console.error(USAGE); process.exit(2); }
  jobs.push({ id: name, cut: true, panels: [{ file: path.resolve(String(args.src)) }] });
} else if (args.batch) {
  if (!refs) { console.error(USAGE); process.exit(2); }
  const dir = path.resolve(String(args.batch));
  for (const [id, r] of Object.entries(refs)) {
    const files = r.panels.map(p => path.join(dir, p.painting));
    const have = files.filter(f => existsSync(f));
    if (!have.length) continue;
    if (have.length < files.length) { console.log(`${id}: waiting for ${files.filter(f => !existsSync(f)).map(f => path.basename(f)).join(', ')}`); continue; }
    jobs.push({ id, panels: r.panels.map((p, i) => ({ file: files[i], rect: p.rect, pad: p.pad })) });
  }
} else if (args.stamp) {
  for (const id of String(args.stamp).split(',')) jobs.push({ id, stamp: true, panels: [] });
} else if (args.map && args.src) {
  const id = String(args.map), files = String(args.src).split(',').map(f => path.resolve(f));
  const r = refs?.[id];
  if (files.length > 1 && (!r || r.panels.length !== files.length)) { console.error(`${id}: ${files.length} panels need --refs naming as many`); process.exit(2); }
  jobs.push({ id, panels: files.map((file, i) => ({ file, rect: r ? r.panels[i].rect : null, pad: r ? r.panels[i].pad : null })) });
} else { console.error(USAGE); process.exit(2); }
for (const j of jobs) if (!j.cut && !MAPS[j.id]) { console.error(`no map ${j.id}`); process.exit(2); }
if (!jobs.length) { console.log('nothing to import'); process.exit(0); }

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
page.on('pageerror', e => console.log('page exception:', e.message));
await page.setContent('<!doctype html><html><body></body></html>');

// In the page: fit one job's panels to the map (or a still to its width) and encode it.
async function fit({ panels, mw, mh, sharpen, quality, TILE, solid, over, grid, width }) {
  const toLin = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const v = i / 255; toLin[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  const toS = v => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
  // area averaging: each output pixel is the exact mean of the painting pixels it covers
  const weights = (n0, len, n, max) => {
    const out = [], step = len / n;
    for (let o = 0; o < n; o++) {
      const a = n0 + o * step, b = a + step, list = [];
      for (let p = Math.floor(a); p < Math.ceil(b); p++) { const w = Math.min(b, p + 1) - Math.max(a, p); if (w > 0) list.push([Math.min(max - 1, p), w / step]); }
      out.push(list);
    }
    return out;
  };
  const resample = (S, IW, IH, X0, Y0, CW, CH, OW, OH) => {
    const wx = weights(X0, CW, OW, IW), wy = weights(Y0, CH, OH, IH);
    const y0 = Math.floor(Y0), y1 = Math.min(IH, Math.ceil(Y0 + CH));
    const band = new Float32Array((y1 - y0) * OW * 3);
    for (let y = y0; y < y1; y++) {
      for (let o = 0; o < OW; o++) {
        let r = 0, g = 0, b = 0;
        for (const [p, w] of wx[o]) { const k = (y * IW + p) * 4; r += toLin[S[k]] * w; g += toLin[S[k + 1]] * w; b += toLin[S[k + 2]] * w; }
        const t = ((y - y0) * OW + o) * 3;
        band[t] = r; band[t + 1] = g; band[t + 2] = b;
      }
    }
    const L = new Float32Array(OW * OH * 3);
    for (let o = 0; o < OH; o++) {
      for (let x = 0; x < OW; x++) {
        let r = 0, g = 0, b = 0;
        for (const [p, w] of wy[o]) { const t = ((Math.min(y1 - 1, p) - y0) * OW + x) * 3; r += band[t] * w; g += band[t + 1] * w; b += band[t + 2] * w; }
        const k = (o * OW + x) * 3;
        L[k] = r; L[k + 1] = g; L[k + 2] = b;
      }
    }
    return L;
  };
  const decode = async data => {
    const img = new Image();
    img.src = data;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return { S: g.getImageData(0, 0, c.width, c.height).data, IW: c.width, IH: c.height };
  };
  let OW, OH, L;
  const info = [];
  if (width) {
    // a cut scene: the whole picture
    const { S, IW, IH } = await decode(panels[0].data);
    OW = Math.min(IW, width); OH = Math.round(OW * IH / IW);
    L = resample(S, IW, IH, 0, 0, IW, IH, OW, OH);
    info.push({ IW, IH, px: IW / OW });
  } else {
    OW = mw * TILE; OH = mh * TILE;
    L = new Float32Array(OW * OH * 3);
    const parts = [];
    for (const p of panels) {
      const { S, IW, IH } = await decode(p.data);
      const [rx, ry, rw, rh] = p.rect || [0, 0, mw, mh];
      let pad = p.pad;
      if (!pad) {
        // the padding the reference had: the map grown to the painting's aspect
        const ratio = IW / IH;
        let W = rw, H = rh;
        if (W / H < ratio) W = Math.round(H * ratio); else H = Math.round(W / ratio);
        const dx = W - rw, dy = H - rh;
        pad = [dy >> 1, dx - (dx >> 1), dy - (dy >> 1), dx >> 1];
      }
      const tw = rw + pad[1] + pad[3], th = rh + pad[0] + pad[2];
      const sx = IW / tw, sy = IH / th;
      parts.push({ rect: [rx, ry, rw, rh], L: resample(S, IW, IH, pad[3] * sx, pad[0] * sy, rw * sx, rh * sy, rw * TILE, rh * TILE) });
      info.push({ IW, IH, pad, px: sx, rect: [rx, ry, rw, rh] });
    }
    // join: each pixel from the panel whose rect holds it; where two overlap, the seam runs across the
    // middle of the overlap, blended over at most three tiles
    const tall = parts.length > 1 && parts[0].rect[0] === parts[1].rect[0];
    const at = q => (tall ? q.rect[1] : q.rect[0]) * TILE, len = q => (tall ? q.rect[3] : q.rect[2]) * TILE;
    parts.sort((a, b) => at(a) - at(b));
    for (let y = 0; y < OH; y++) {
      for (let x = 0; x < OW; x++) {
        const t = tall ? y : x;
        let a = 0, bi = -1, wa = 1;
        for (let i = 0; i < parts.length; i++) if (t >= at(parts[i]) && t < at(parts[i]) + len(parts[i])) { a = i; break; }
        if (a + 1 < parts.length && t >= at(parts[a + 1])) {
          const o0 = at(parts[a + 1]), o1 = at(parts[a]) + len(parts[a]), seam = (o0 + o1) / 2, F = Math.min(3 * TILE, o1 - o0);
          wa = Math.max(0, Math.min(1, 0.5 + (seam - t) / F));
          bi = a + 1;
        }
        const k = (y * OW + x) * 3;
        const P = parts[a], pk = ((y - P.rect[1] * TILE) * P.rect[2] * TILE + (x - P.rect[0] * TILE)) * 3;
        for (let ch = 0; ch < 3; ch++) L[k + ch] = P.L[pk + ch] * wa;
        if (bi >= 0 && wa < 1) {
          const Q = parts[bi], qk = ((y - Q.rect[1] * TILE) * Q.rect[2] * TILE + (x - Q.rect[0] * TILE)) * 3;
          for (let ch = 0; ch < 3; ch++) L[k + ch] += Q.L[qk + ch] * (1 - wa);
        }
      }
    }
  }
  if (sharpen > 0) {
    // unsharp mask against a 3x3 box blur
    const out = new Float32Array(L.length);
    for (let y = 0; y < OH; y++) {
      for (let x = 0; x < OW; x++) {
        for (let ch = 0; ch < 3; ch++) {
          let s = 0, n = 0;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
            const xx = x + i, yy = y + j;
            if (xx < 0 || yy < 0 || xx >= OW || yy >= OH) continue;
            s += L[(yy * OW + xx) * 3 + ch]; n++;
          }
          const k = (y * OW + x) * 3 + ch;
          out[k] = L[k] + sharpen * (L[k] - s / n);
        }
      }
    }
    L = out;
  }
  const im = new ImageData(OW, OH);
  for (let i = 0; i < OW * OH; i++) { im.data[i * 4] = toS(L[i * 3]); im.data[i * 4 + 1] = toS(L[i * 3 + 1]); im.data[i * 4 + 2] = toS(L[i * 3 + 2]); im.data[i * 4 + 3] = 255; }
  const oc = document.createElement('canvas');
  oc.width = OW; oc.height = OH;
  oc.getContext('2d').putImageData(im, 0, 0);
  const webp = oc.toDataURL('image/webp', quality);
  let gridPng = null;
  if (grid) {
    const k = Math.max(1, Math.round(48 / TILE)), gc = document.createElement('canvas');
    gc.width = OW * k; gc.height = OH * k;
    const gg = gc.getContext('2d');
    gg.imageSmoothingEnabled = false;
    gg.drawImage(oc, 0, 0, OW * k, OH * k);
    gg.fillStyle = 'rgba(255, 30, 30, 0.33)';
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (solid[y][x]) gg.fillRect(x * TILE * k, y * TILE * k, TILE * k, TILE * k);
    gg.fillStyle = 'rgba(40, 90, 255, 0.35)';
    for (const [x0, y0, x1, y1] of over) gg.fillRect(x0 * TILE * k, y0 * TILE * k, (x1 - x0 + 1) * TILE * k, (y1 - y0 + 1) * TILE * k);
    gg.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    gg.lineWidth = 1;
    for (let x = 0; x <= mw; x++) { gg.beginPath(); gg.moveTo(x * TILE * k + 0.5, 0); gg.lineTo(x * TILE * k + 0.5, OH * k); gg.stroke(); }
    for (let y = 0; y <= mh; y++) { gg.beginPath(); gg.moveTo(0, y * TILE * k + 0.5); gg.lineTo(OW * k, y * TILE * k + 0.5); gg.stroke(); }
    gridPng = gc.toDataURL('image/png');
  }
  return { webp, gridPng, OW, OH, info };
}

const kb = n => (n / 1024).toFixed(1) + ' KB';
const name = s => s.replace(/[^a-z0-9]+(.)/gi, (_, c) => c.toUpperCase());
const listed = async (dir, head, exp) => {
  const ids = (await readdir(dir)).filter(f => f.endsWith('.js') && f !== 'index.js').map(f => f.slice(0, -3)).sort();
  await writeFile(path.join(dir, 'index.js'), [
    ...head,
    ...ids.map(i => `import ${name(i)} from './${i}.js';`),
    '',
    `export const ${exp} = Object.freeze({ ${ids.map(i => (name(i) === i ? i : `'${i}': ${name(i)}`)).join(', ')} });`,
    '',
  ].join('\n'));
};

const paintDir = path.join(root, 'src/ui/assets/paint'), cutDir = path.join(root, 'src/ui/assets/cuts');
for (const job of jobs) {
  const map = job.cut ? null : MAPS[job.id];
  if (job.stamp) {
    // the painting as it is, over the map's rows as they are now, then the new stamp
    const file = path.join(paintDir, `${job.id}.js`);
    if (!existsSync(file)) { console.error(`${job.id}: no painting to restamp (import it with --map)`); process.exitCode = 2; continue; }
    const text = await readFile(file, 'utf8');
    const m = /export default Object\.freeze\(\{ w: (\d+), h: (\d+), (?:rowsSha: '([0-9a-f]+)', )?src: '(data:image\/webp;base64,[A-Za-z0-9+/=]+)' \}\);/.exec(text);
    if (!m || +m[1] !== map.w * TILE * density || +m[2] !== map.h * TILE * density) { console.error(`${job.id}: its painting is not ${map.w}x${map.h} tiles at ${TILE * density} px per tile (import it again with --map)`); process.exitCode = 2; continue; }
    const solid = map.rows.map(r => [...r].map(ch => (tileOf(ch).solid ? 1 : 0)));
    const res = await page.evaluate(fit, { panels: [{ data: m[4], rect: [0, 0, map.w, map.h], pad: [0, 0, 0, 0] }], mw: map.w, mh: map.h, sharpen: 0, quality, TILE: TILE * density, solid, over: map.overhang || [], grid: true, width: 0 });
    const shots = path.join(root, 'tools/shots/paint');
    await mkdir(shots, { recursive: true });
    await writeFile(path.join(shots, `${job.id}-grid.png`), Buffer.from(res.gridPng.split(',')[1], 'base64'));
    const now = rowsSha(map);
    await writeFile(file, text.slice(0, m.index) + `export default Object.freeze({ w: ${m[1]}, h: ${m[2]}, rowsSha: '${now}', src: '${m[4]}' });` + text.slice(m.index + m[0].length));
    console.log(`${job.id}: ${m[3] ? (m[3] === now ? `already stamped ${now}` : `restamped ${m[3]} -> ${now}`) : `stamped ${now}`}; grid: tools/shots/paint/${job.id}-grid.png`);
    continue;
  }
  const panels = [];
  for (const p of job.panels) panels.push({ data: await dataUrl(p.file), rect: p.rect || null, pad: p.pad || null });
  const solid = map ? map.rows.map(r => [...r].map(ch => (tileOf(ch).solid ? 1 : 0))) : [];
  const res = await page.evaluate(fit, { panels, mw: map?.w || 0, mh: map?.h || 0, sharpen, quality, TILE: TILE * density, solid, over: map?.overhang || [],
    grid: !!args.grid && !job.cut, width: job.cut ? +(args.width || 768) : 0 });
  const bytes = Buffer.from(res.webp.split(',')[1], 'base64').length;
  const from = job.panels.map(p => rel(p.file)).join(' + ');
  if (job.cut) {
    await mkdir(cutDir, { recursive: true });
    await writeFile(path.join(cutDir, `${job.id}.js`), [
      `// A cut-scene still (M5 spec A10). GENERATED by tools/paint-import.mjs from ${from} (${res.info[0].IW}x${res.info[0].IH}),`,
      `// resampled to ${res.OW}x${res.OH}: ${kb(bytes)} of WebP at quality ${quality}, sharpen ${sharpen}. Do not edit.`,
      `export default Object.freeze({ w: ${res.OW}, h: ${res.OH}, src: '${res.webp}' });`,
      '',
    ].join('\n'));
    console.log(`${job.id}: ${from} -> ${res.OW}x${res.OH} -> src/ui/assets/cuts/${job.id}.js, ${kb(bytes)}`);
    continue;
  }
  await mkdir(paintDir, { recursive: true });
  const how = res.info.map(i => `${i.IW}x${i.IH}, ${i.rect[2]}x${i.rect[3]} tiles from ${i.rect[0]},${i.rect[1]} padded [${i.pad.join(', ')}]`).join('; ');
  await writeFile(path.join(paintDir, `${job.id}.js`), [
    `// ${map.name}, painted (M5 spec A10). GENERATED by tools/paint-import.mjs from ${from}`,
    `// (${how}), fitted to ${map.w}x${map.h} tiles at ${TILE * density} px per tile: ${kb(bytes)} of WebP at quality ${quality},`,
    `// sharpen ${sharpen}. Do not edit.`,
    `export default Object.freeze({ w: ${res.OW}, h: ${res.OH}, rowsSha: '${rowsSha(map)}', src: '${res.webp}' });`,
    '',
  ].join('\n'));
  if (res.gridPng) {
    const shots = path.join(root, 'tools/shots/paint');
    await mkdir(shots, { recursive: true });
    await writeFile(path.join(shots, `${job.id}-grid.png`), Buffer.from(res.gridPng.split(',')[1], 'base64'));
  }
  console.log(`${job.id}: ${from} -> ${res.OW}x${res.OH} (${res.info.map(i => i.px.toFixed(1)).join(' + ')} painting px per tile) -> src/ui/assets/paint/${job.id}.js, ${kb(bytes)}${res.gridPng ? `; grid: tools/shots/paint/${job.id}-grid.png` : ''}`);
}
await browser.close();
// each index lists every file in its folder
if (existsSync(paintDir)) {
  await listed(paintDir, [
    '// The painted maps (M5 spec A10): map id -> { w, h, rowsSha, src }, where src is a WebP data URL covering',
    '// the map at a whole number of px per art px (32 per tile) and rowsSha stamps the rows it was fitted to.',
    '// GENERATED by tools/paint-import.mjs (it rewrites this list); ui/world/view.js draws a map listed here',
    '// from its painting and every other map from its tiles.',
  ], 'PAINTINGS');
}
if (existsSync(cutDir)) {
  await listed(cutDir, [
    '// The cut-scene stills (M5 spec A10): name -> { w, h, src }, a WebP data URL. GENERATED by',
    '// tools/paint-import.mjs --cut (it rewrites this list). A screen shows a still listed here and draws',
    '// its own scene when the still is missing.',
  ], 'CUTS');
}
