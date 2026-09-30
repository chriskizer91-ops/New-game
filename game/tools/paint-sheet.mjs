// Trace sheets (M6 batch 3): a map's painting at the map's size, with a tile grid to trace its rows from. Its
// pictures are placed as a panels file says (art-in/batch-3/panels.json: { <map>: { w, h, panels: [{ painting, rect,
// pad }] } }) and joined where they overlap, blended over three tiles like tools/paint-import.mjs. Faint lines mark
// every tile and yellow ones every 5, and each yellow crossing is labelled with its tile coordinates "x,y".
//
//   node tools/paint-sheet.mjs <map> --refs=../art-in/batch-3/panels.json            # the whole map, 24 px a tile
//   node tools/paint-sheet.mjs <map> --refs=... --crop=0,0,16,12 --px=48             # a part of it, closer
//   node tools/paint-sheet.mjs <map> --refs=... --out=/tmp/x/sheet.jpg               # default: tools/shots/paint/<map>-sheet[-crop].jpg
//
// Trace from the sheet, then check the rows with `paint-import.mjs --grid` (ARCHITECTURE.md "Painted maps").
// Playwright and Chromium as in tools/gallery.mjs. Owner: the lead (M6 batch 3).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
const args = Object.fromEntries(process.argv.slice(3).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
if (!id || !args.refs) { console.error('usage: node tools/paint-sheet.mjs <map> --refs=<panels.json> [--crop=x,y,w,h] [--px=24] [--out=<file.jpg>]'); process.exit(2); }
const refsFile = path.resolve(String(args.refs));
const P = JSON.parse(readFileSync(refsFile, 'utf8'))[id];
if (!P || !P.w || !P.h) { console.error(`${id}: not in ${refsFile}, or it has no w and h`); process.exit(2); }
const PX = +(args.px || (args.crop ? 48 : 24));
const crop = args.crop ? String(args.crop).split(',').map(Number) : [0, 0, P.w, P.h];
const panels = P.panels.map(q => ({ data: 'data:image/png;base64,' + readFileSync(path.join(path.dirname(refsFile), q.painting)).toString('base64'), rect: q.rect }));

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
const url = await page.evaluate(async ({ panels, W, H, PX, crop }) => {
  const [cx, cy, cw, ch] = crop;
  const c = document.createElement('canvas');
  c.width = cw * PX; c.height = ch * PX;
  const g = c.getContext('2d');
  g.translate(-cx * PX, -cy * PX);
  const imgs = [];
  for (const q of panels) { const im = new Image(); im.src = q.data; await im.decode(); imgs.push(im); }
  panels.forEach((q, i) => {
    const [x, y, w, h] = q.rect;
    const oc = document.createElement('canvas');
    oc.width = w * PX; oc.height = h * PX;
    const og = oc.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(imgs[i], 0, 0, oc.width, oc.height);
    const prev = panels[i - 1];
    if (prev && prev.rect[0] + prev.rect[2] > x) {
      // fade this panel in across the middle three tiles of its overlap with the one before
      const o1 = prev.rect[0] + prev.rect[2], seam = (x + o1) / 2, F = Math.min(3, o1 - x);
      og.globalCompositeOperation = 'destination-in';
      const gr = og.createLinearGradient((seam - F / 2 - x) * PX, 0, (seam + F / 2 - x) * PX, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,1)');
      og.fillStyle = gr;
      og.fillRect(0, 0, oc.width, oc.height);
    }
    g.drawImage(oc, x * PX, y * PX);
  });
  for (let t = 0; t <= W; t++) { g.fillStyle = t % 5 ? 'rgba(255,255,255,.22)' : 'rgba(255,230,0,.7)'; g.fillRect(t * PX, 0, 1, H * PX); }
  for (let t = 0; t <= H; t++) { g.fillStyle = t % 5 ? 'rgba(255,255,255,.22)' : 'rgba(255,230,0,.7)'; g.fillRect(0, t * PX, W * PX, 1); }
  g.font = `bold ${Math.max(9, Math.round(PX * 0.34))}px monospace`;
  for (let x = 0; x < W; x += 5) {
    for (let y = 0; y < H; y += 5) {
      const label = `${x},${y}`, tw = g.measureText(label).width;
      g.fillStyle = 'rgba(0,0,0,.65)';
      g.fillRect(x * PX + 1, y * PX + 1, tw + 4, PX * 0.42);
      g.fillStyle = '#ffe600';
      g.fillText(label, x * PX + 3, y * PX + PX * 0.36);
    }
  }
  return c.toDataURL('image/jpeg', 0.88);
}, { panels, W: P.w, H: P.h, PX, crop });
await browser.close();
const out = path.resolve(args.out ? String(args.out) : path.join(root, 'tools/shots/paint', `${id}-sheet${args.crop ? '-' + crop.join('_') : ''}.jpg`));
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log(`${id}: ${P.w}x${P.h} tiles; crop ${crop.join(',')} at ${PX} px a tile -> ${path.relative(process.cwd(), out)}`);
