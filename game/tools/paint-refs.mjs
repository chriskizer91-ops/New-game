// Layout references for a batch of painted maps (M5 spec A10): for every map it is asked for, the map's
// ground (tiles only, as tools/map-shots.mjs draws it) as one picture the image generator redraws, or,
// for a long road, as overlapping panels. Writes <out>/ref-<map>[-a|-b...].png and <out>/refs.json, which
// tools/paint-import.mjs reads to put the paintings back together.
//
//   node tools/paint-refs.mjs --out=../art-requests/batch-2/refs              # every map
//   node tools/paint-refs.mjs --out=/tmp/refs --maps=hearth-road,thornway     # some maps
//
// A map is one picture at the aspect (3:2, 1:1 or 2:3) that draws it largest, padded as map-shots pads
// (the extra tiles split evenly, odd ones right and bottom), when that gives at least MIN_PX painting px
// per tile. Otherwise (a long road) it is cut along its long side into panels the full width (or height)
// of the map at 2:3 (or 3:2), overlapping by at least OVERLAP tiles.
// Picture sizes are what image generators make: 1536x1024, 1024x1024 and 1024x1536.
// Playwright and Chromium as in tools/gallery.mjs.
import { build } from 'esbuild';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
if (!args.out) { console.error('usage: node tools/paint-refs.mjs --out=<dir> [--maps=a,b]'); process.exit(2); }
const outDir = path.resolve(String(args.out));
const TILE = 16, MIN_PX = 28, OVERLAP = 6;
const SIZE = { '3:2': [1536, 1024], '1:1': [1024, 1024], '2:3': [1024, 1536] };

// The plan for one map: [{ key, aspect, rect: [x, y, w, h] tiles of the map, pad: [t, r, b, l] }]
export function planMap(w, h) {
  const single = [];
  for (const aspect of Object.keys(SIZE)) {
    const [aw, ah] = aspect.split(':').map(Number), ratio = aw / ah;
    let W = w, H = h;
    if (W / H < ratio) W = Math.round(H * ratio); else H = Math.round(W / ratio);
    const px = SIZE[aspect][0] / W, waste = 1 - (w * h) / (W * H);
    const dx = W - w, dy = H - h;
    single.push({ aspect, px, waste, pad: dx || dy ? [dy >> 1, dx - (dx >> 1), dy - (dy >> 1), dx >> 1] : null });
  }
  const best = single.sort((a, b) => b.px - a.px || a.waste - b.waste)[0];
  if (best.px >= MIN_PX) return [{ key: '', aspect: best.aspect, rect: [0, 0, w, h], pad: best.pad }];
  // Panels the full width (cut across the rows) or the full height (cut across the columns) of the map, at
  // 3:2 or 2:3: the fewest panels that draw it at MIN_PX or more, then the largest. A long road is cut along
  // its long side; a big, nearly square map (M6's Murkway) the other way, since a panel along it would be
  // longer than the map.
  const plans = [];
  for (const aspect of ['2:3', '3:2']) {
    const [aw, ah] = aspect.split(':').map(Number);
    for (const fullWidth of [true, false]) {
      const span = fullWidth ? h : w;
      const len = Math.round(fullWidth ? (w * ah) / aw : (h * aw) / ah);
      if (len >= span || len <= OVERLAP) continue;
      const px = fullWidth ? SIZE[aspect][0] / w : SIZE[aspect][1] / h;
      if (px < MIN_PX) continue;
      plans.push({ aspect, fullWidth, span, len, px, n: Math.max(2, Math.ceil((span - OVERLAP) / (len - OVERLAP))) });
    }
  }
  const p = plans.sort((a, b) => a.n - b.n || b.px - a.px)[0];
  if (!p) throw new Error(`no way to paint a ${w}x${h} map in panels`);
  const out = [];
  for (let i = 0; i < p.n; i++) {
    const at = Math.round((i * (p.span - p.len)) / (p.n - 1));
    out.push({ key: '-' + 'abcdefgh'[i], aspect: p.aspect, rect: p.fullWidth ? [0, at, w, p.len] : [at, 0, p.len, h], pad: null });
  }
  return out;
}

const { MAPS } = await import(pathToFileURL(path.join(root, 'src/data/maps/index.js')).href);
const want = String(args.maps || '').split(',').filter(Boolean);
const ids = want.length ? want : Object.keys(MAPS);
for (const id of ids) if (!MAPS[id]) { console.error(`no map ${id}`); process.exit(2); }

const res = await build({
  entryPoints: [path.join(root, 'tools/map-shots-entry.js')],
  bundle: true, format: 'iife', target: 'es2020', write: false, minify: false, legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await mkdir(outDir, { recursive: true });
const pageFile = path.join(outDir, '.paint-refs.html');
await writeFile(pageFile, `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${js}</script></body></html>`);
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
page.on('pageerror', e => console.log('page exception:', e.message));
await page.goto(pathToFileURL(pageFile).href);
await page.waitForFunction(() => window.__done === true);

const manifest = {};
for (const id of ids) {
  const map = MAPS[id];
  const plan = planMap(map.w, map.h);
  manifest[id] = { name: map.name, region: map.region, biome: map.biome, tiles: [map.w, map.h], panels: [] };
  for (const p of plan) {
    const [iw, ih] = SIZE[p.aspect];
    const [, , w, h] = p.rect;
    const tw = p.pad ? w + p.pad[1] + p.pad[3] : w, th = p.pad ? h + p.pad[0] + p.pad[2] : h;
    const scale = Math.max(1, Math.ceil(Math.max(iw, ih) / (Math.max(tw, th) * TILE)));
    const url = await page.evaluate(async ([m, o, rect, pad, k]) => {
      const src = window.__shots.png(m, { pad, fill: '.', scale: 1 });
      const img = new Image();
      img.src = src;
      await img.decode();
      const [x0, y0, w0, h0] = pad ? [0, 0, img.width / 16, img.height / 16] : rect;
      const c = document.createElement('canvas');
      c.width = w0 * 16 * k; c.height = h0 * 16 * k;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(img, x0 * 16, y0 * 16, w0 * 16, h0 * 16, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    }, [id, null, p.rect, p.pad, scale]);
    const file = `ref-${id}${p.key}.png`;
    await writeFile(path.join(outDir, file), Buffer.from(url.split(',')[1], 'base64'));
    const painting = `map-${id}${p.key}.png`;
    manifest[id].panels.push({ ref: file, painting, aspect: p.aspect, size: [iw, ih], rect: p.rect, pad: p.pad || [0, 0, 0, 0], px: +(iw / tw).toFixed(1) });
    console.log(`${(id + p.key).padEnd(22)} ${map.w}x${map.h} tiles: ${p.aspect} ${p.pad ? `padded [${p.pad.join(',')}]` : `rows/cols ${p.rect.join(',')}`} -> ${(iw / tw).toFixed(1)} px per tile`);
  }
}
await writeFile(path.join(outDir, 'refs.json'), JSON.stringify(manifest, null, 2) + '\n');
await browser.close();
await rm(pageFile, { force: true }); // the drawing page is scaffolding, not a reference
const n = Object.values(manifest).reduce((s, m) => s + m.panels.length, 0);
console.log(`wrote ${n} references for ${ids.length} maps, and refs.json, to ${outDir}`);
