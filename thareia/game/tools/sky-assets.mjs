// Thareia (T1): the sky's paintings, as WebP for the bundle (src/ui/assets/sky/): the continent (the world map) and
// the region paintings the airship flies over at 1x, and the skiff's top-down view (cut out of its turnaround sheet by
// ../demo/tools/prep-assets.mjs). Run when the paintings change:
//   node tools/sky-assets.mjs                      # everything
//   node tools/sky-assets.mjs --only=skiff-rented  # one file (its name without .webp)
// T2: the rented skiff's top-down view (skiff-rented.webp) is cut out of painting 16 (art-in/airship/
// airship-rental-skiff.png, the top-left view of the sheet): the flat grey sheet behind it is flood-filled away from
// the border, and the edge is softened. Its crystal glow is built at run time by ui/screens/sky.js the same way as
// skiff-top.webp's (the amber colour rule), limited to the crystals' box (SHIP_ART.rented.glowBox there).
// Uses the machine's Playwright Chromium to encode (as tools/paint-import.mjs).
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), art = path.resolve(root, '../art-in');
const out = path.join(root, 'src/ui/assets/sky');
const only = process.argv.slice(2).find(a => a.startsWith('--only='))?.slice(7);
const want = name => !only || only === name.replace(/\.webp$/, '');
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
const JOBS = [
  ['continent.webp', 'continent/Aethermoor-Complete-Map.png', 0.8],
  ['gloomfen.webp', 'regions/04-Gloomfen-Marsh.png', 0.8],
  ['verdant.webp', 'regions/01-Verdant-Wilds.png', 0.8],
];
for (const [name, src, q] of JOBS) {
  if (!want(name)) continue;
  const b64 = (await readFile(path.join(art, src))).toString('base64');
  const data = await page.evaluate(async ([s, q]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, [b64, q]);
  await writeFile(path.join(out, name), Buffer.from(data, 'base64'));
  console.log(name, Math.round(data.length * 0.75 / 1024), 'KB');
}

// the rented skiff: the top-down view of painting 16, cut out of the grey sheet
const RENTED = { src: 'airship/airship-rental-skiff.png', crop: [110, 0, 545, 505], size: 480, bgTol: 34, edge: 70, q: 0.86 };
if (want('skiff-rented')) {
  const b64 = (await readFile(path.join(art, RENTED.src))).toString('base64');
  const data = await page.evaluate(async ([s, R]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode();
    const [x0, y0, w, h] = R.crop, side = Math.max(w, h);
    const c = document.createElement('canvas'); c.width = side; c.height = side;
    const g = c.getContext('2d');
    g.drawImage(img, x0, y0, w, h, (side - w) / 2, (side - h) / 2, w, h);
    const d = g.getImageData(0, 0, side, side), px = d.data;
    // the sheet's grey, read from the corners of the crop (inside the letterbox)
    const top = Math.ceil((side - h) / 2) * side, bot = (Math.floor((side + h) / 2) - 1) * side;
    const bg = [0, 1, 2].map(k => (px[top * 4 + k] + px[(top + side - 1) * 4 + k] + px[bot * 4 + k] + px[(bot + side - 1) * 4 + k]) / 4);
    const dist = i => Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]);
    // flood the grey from every border pixel (the sheet between the sails and the hull is grey too, and joins the edge)
    const seen = new Uint8Array(side * side), q = [];
    for (let k = 0; k < side; k++) q.push(k, (side - 1) * side + k, k * side, k * side + side - 1);
    // the letterbox rows added above and below the crop are empty (alpha 0): treat them as sheet
    const isBg = p => px[p * 4 + 3] === 0 || dist(p * 4) < R.bgTol;
    while (q.length) {
      const p = q.pop();
      if (seen[p] || !isBg(p)) continue;
      seen[p] = 1;
      const x = p % side, y = (p / side) | 0;
      if (x > 0) q.push(p - 1); if (x < side - 1) q.push(p + 1); if (y > 0) q.push(p - side); if (y < side - 1) q.push(p + side);
    }
    for (let p = 0; p < side * side; p++) {
      if (seen[p]) { px[p * 4 + 3] = 0; continue; }
      // soften the rim: a pixel next to the sheet and close to its grey is partly see-through
      const x = p % side, y = (p / side) | 0;
      const nearBg = (x > 0 && seen[p - 1]) || (x < side - 1 && seen[p + 1]) || (y > 0 && seen[p - side]) || (y < side - 1 && seen[p + side]);
      if (nearBg) px[p * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0.25, (dist(p * 4) - R.bgTol) / (R.edge - R.bgTol))));
    }
    g.putImageData(d, 0, 0);
    const o = document.createElement('canvas'); o.width = R.size; o.height = R.size;
    const og = o.getContext('2d'); og.imageSmoothingQuality = 'high'; og.drawImage(c, 0, 0, R.size, R.size);
    return o.toDataURL('image/webp', R.q).split(',')[1];
  }, [b64, RENTED]);
  await writeFile(path.join(out, 'skiff-rented.webp'), Buffer.from(data, 'base64'));
  console.log('skiff-rented.webp', Math.round(data.length * 0.75 / 1024), 'KB');
}
if (want('skiff-top')) await copyFile(path.resolve(root, '../demo/assets/skiff-top.webp'), path.join(out, 'skiff-top.webp'));
await browser.close();
