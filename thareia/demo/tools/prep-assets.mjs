// Prepares the demo's images from the player's paintings (run once; the outputs are committed in assets/).
//   node tools/prep-assets.mjs
// - assets/gloomfen.webp   the Gloomfen region painting, WebP quality 85 (the walking map)
// - assets/skiff-top.webp  the airship's top-down view, cut out of the turnaround sheet's grey background
// Uses the machine's Playwright Chromium to encode (no other image tools needed).
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..'), art = path.resolve(root, '../art-in');
const b64 = async f => (await readFile(f)).toString('base64');
const browser = await pw.chromium.launch();
const page = await browser.newPage();

const map = await page.evaluate(async src => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/webp', .85).split(',')[1];
}, await b64(path.join(art, 'regions/04-Gloomfen-Marsh.png')));
await writeFile(path.join(root, 'assets/gloomfen.webp'), Buffer.from(map, 'base64'));

const ship = await page.evaluate(async src => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
  const W = 768, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, W, H), d = id.data;
  const bg = [d[(5 * W + 5) * 4], d[(5 * W + 5) * 4 + 1], d[(5 * W + 5) * 4 + 2]];
  const near = i => { const r = d[i], gg = d[i + 1], b = d[i + 2]; const sat = Math.max(r, gg, b) - Math.min(r, gg, b); return sat < 14 && Math.hypot(r - bg[0], gg - bg[1], b - bg[2]) < 22; };
  // flood fill the background from the border
  const bgm = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) { const p = st.pop(); if (bgm[p] || !near(p * 4)) continue; bgm[p] = 1; const x = p % W, y = (p / W) | 0;
    if (x > 0) st.push(p - 1); if (x < W - 1) st.push(p + 1); if (y > 0) st.push(p - W); if (y < H - 1) st.push(p + W); }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let p = 0; p < W * H; p++) {
    if (bgm[p]) { d[p * 4 + 3] = 0; continue; }
    const x = p % W, y = (p / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    // soften the one-pixel rim that touches the background
    const edge = (x > 0 && bgm[p - 1]) || (x < W - 1 && bgm[p + 1]) || (y > 0 && bgm[p - W]) || (y < H - 1 && bgm[p + W]);
    if (edge) d[p * 4 + 3] = 150;
  }
  g.putImageData(id, 0, 0);
  const pad = 4, o = document.createElement('canvas'); o.width = x1 - x0 + 1 + pad * 2; o.height = y1 - y0 + 1 + pad * 2;
  o.getContext('2d').drawImage(c, x0 - pad, y0 - pad, o.width, o.height, 0, 0, o.width, o.height);
  return { data: o.toDataURL('image/webp', .92).split(',')[1], w: o.width, h: o.height };
}, await b64(path.join(art, 'airship/airship-skiff-turnaround.png')));
await writeFile(path.join(root, 'assets/skiff-top.webp'), Buffer.from(ship.data, 'base64'));
await copyFile(path.resolve(root, '../audio-test/herbal-decay-battle-aac-96k.m4a'), path.join(root, 'assets/herbal-decay-battle.m4a'));
await browser.close();
console.log('map', Math.round(map.length * .75 / 1024), 'KB; ship', ship.w + 'x' + ship.h, Math.round(ship.data.length * .75 / 1024), 'KB');
