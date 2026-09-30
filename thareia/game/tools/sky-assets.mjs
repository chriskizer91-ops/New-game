// Thareia (T1): the sky's paintings, as WebP for the bundle (src/ui/assets/sky/): the continent (the world map) and
// the region paintings the airship flies over at 1x, and the skiff's top-down view (cut out of its turnaround sheet by
// ../demo/tools/prep-assets.mjs). Run when the paintings change:
//   node tools/sky-assets.mjs
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
  const b64 = (await readFile(path.join(art, src))).toString('base64');
  const data = await page.evaluate(async ([s, q]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, [b64, q]);
  await writeFile(path.join(out, name), Buffer.from(data, 'base64'));
  console.log(name, Math.round(data.length * 0.75 / 1024), 'KB');
}
await copyFile(path.resolve(root, '../demo/assets/skiff-top.webp'), path.join(out, 'skiff-top.webp'));
await browser.close();
