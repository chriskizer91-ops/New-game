// Thareia: the player's painted battle backdrops into src/art/painted-backdrops.js (see there).
//   node tools/backdrop-import.mjs --key=bogmire --src=../art-in/scenes/battle-gloomfen.png [--width=960] [--quality=0.72]
//   node tools/backdrop-import.mjs --key=bogmire --remove
// The key is a battle backdrop key (data/encounters.js BACKDROPS): every fight with that backdrop shows the painting.
// Playwright and Chromium as in tools/paint-import.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const file = path.join(root, 'src/art/painted-backdrops.js');
const { PAINTED_BACKDROPS } = await import(pathToFileURL(file).href);
const { BACKDROPS } = await import(pathToFileURL(path.join(root, 'src/data/encounters.js')).href);
const key = String(args.key || '');
if (!key || (!args.remove && !args.src)) { console.error('usage: node tools/backdrop-import.mjs --key=<backdrop> --src=<painting> [--width=960] [--quality=0.72] | --key=<backdrop> --remove'); process.exit(2); }
if (!BACKDROPS.includes(key)) { console.error(`${key} is not a battle backdrop (data/encounters.js BACKDROPS)`); process.exit(2); }
const all = { ...PAINTED_BACKDROPS };
if (args.remove) delete all[key];
else {
  const require = createRequire(import.meta.url);
  let pw; try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
  const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
  const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  const src = path.resolve(String(args.src)), mime = /\.webp$/i.test(src) ? 'image/webp' : /\.jpe?g$/i.test(src) ? 'image/jpeg' : 'image/png';
  const b64 = (await readFile(src)).toString('base64');
  const r = await page.evaluate(async ({ b64, mime, W, q }) => {
    const img = new Image(); img.src = `data:${mime};base64,` + b64; await img.decode();
    const w = Math.min(W, img.width), h = Math.round(w * img.height / img.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
    return { src: c.toDataURL('image/webp', q), w, h };
  }, { b64, mime, W: +(args.width || 960), q: +(args.quality || 0.72) });
  await browser.close();
  all[key] = r;
  console.log(`${key}: ${path.basename(src)} -> ${r.w}x${r.h}, ${Math.round(r.src.length * 0.75 / 1024)} KB`);
}
const body = Object.keys(all).sort().map(k => `  '${k}': { w: ${all[k].w}, h: ${all[k].h}, src: '${all[k].src}' },`).join('\n');
const head = (await readFile(file, 'utf8')).split('export const PAINTED_BACKDROPS')[0];
await writeFile(file, `${head}export const PAINTED_BACKDROPS = Object.freeze({\n${body}${body ? '\n' : ''}});\n`);
