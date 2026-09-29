// Layout references for painted maps: renders each map's ground (tiles only, no characters or
// objects) as a PNG the image generator gets with its prompt, padded to a standard aspect ratio and
// scaled up with hard pixel edges, plus a 1x copy (16 px per tile) for fitting the painting later.
// refs.json records each map's size, padding and scale, so a painting can be cropped back to the map.
//
//   node tools/map-shots.mjs --maps=keep:3:2,thornhollow:1:1        # map:aspect (default 1:1)
//   node tools/map-shots.mjs --maps=keep --ents                     # objects too (for review)
//   node tools/map-shots.mjs --maps=thornhollow --fill=T --long=1536 --out=/tmp/refs
//
// --fill: the tile that pads beyond walls and palisades (default '.', grass); ground, water and roads
// at the edge carry on outward. --long: the long side of the big copy in px (default 1536).
// Playwright and Chromium as in tools/gallery.mjs.
import { build } from 'esbuild';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const outDir = args.out ? path.resolve(String(args.out)) : path.join(root, 'tools/shots/refs');
const LONG = +(args.long || 1536);
const TILE = 16;

const res = await build({
  entryPoints: [path.join(root, 'tools/map-shots-entry.js')],
  bundle: true, format: 'iife', target: 'es2020', write: false, minify: false, legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await mkdir(outDir, { recursive: true });
const page0 = path.join(outDir, 'map-shots.html');
await writeFile(page0, `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${js}</script></body></html>`);

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
page.on('pageerror', e => console.log('page exception:', e.message));
await page.goto(pathToFileURL(page0).href);
await page.waitForFunction(() => window.__done === true);

const want = String(args.maps || '').split(',').filter(Boolean);
const list = want.length ? want : (await page.evaluate(() => window.__shots.maps())).map(id => `${id}:1:1`);
const manifestFile = path.join(outDir, 'refs.json');
const manifest = existsSync(manifestFile) ? JSON.parse(await readFile(manifestFile, 'utf8')) : {};
const save = async (file, url) => writeFile(path.join(outDir, file), Buffer.from(url.split(',')[1], 'base64'));

for (const spec of list) {
  const [id, aw = '1', ah = '1'] = spec.split(':');
  const size = await page.evaluate(i => window.__shots.size(i), id);
  if (!size) { console.log(`no map ${id}`); continue; }
  // pad (in tiles) to the aspect aw:ah, splitting the extra evenly (odd tiles go right and bottom)
  const ratio = +aw / +ah;
  let W = size.w, H = size.h;
  if (W / H < ratio) W = Math.round(H * ratio); else H = Math.round(W / ratio);
  const dx = W - size.w, dy = H - size.h;
  const pad = [dy >> 1, dx - (dx >> 1), dy - (dy >> 1), dx >> 1];
  const scale = Math.max(1, Math.ceil(LONG / (Math.max(W, H) * TILE)));
  const opts = { pad: dx || dy ? pad : null, fill: String(args.fill || '.'), ents: !!args.ents };
  await save(`ref-${id}.png`, await page.evaluate(([i, o]) => window.__shots.png(i, o), [id, { ...opts, scale }]));
  await save(`ref-${id}-1x.png`, await page.evaluate(([i, o]) => window.__shots.png(i, o), [id, { ...opts, scale: 1 }]));
  manifest[id] = { name: size.name, biome: size.biome, tiles: [size.w, size.h], aspect: `${aw}:${ah}`, padded: [W, H], pad, scale, px: [W * TILE * scale, H * TILE * scale] };
  console.log(`${id.padEnd(20)} ${size.w}x${size.h} tiles -> ${W}x${H} (${aw}:${ah}, pad ${pad.join(',')}) at ${W * TILE * scale}x${H * TILE * scale} px`);
}
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
await browser.close();
console.log(`wrote ${path.relative(root, outDir)}/ (refs.json and ${list.length * 2} PNGs)`);
