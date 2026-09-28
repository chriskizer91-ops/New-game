import { createRequire } from 'node:module'; const { chromium } = createRequire(process.env.GLOBAL_ROOT + '/')('playwright');
import fs from 'node:fs';
const png = fs.readFileSync('map.png').toString('base64');
const browser = await chromium.launch({ });
const page = await browser.newPage();
const out = await page.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const res = [];
  for (const [w, q, type] of [[1200, 0.72, 'image/webp'], [960, 0.72, 'image/webp'], [960, 0.6, 'image/webp'], [1200, 0.62, 'image/webp'], [960, 0.72, 'image/jpeg']]) {
    const h = Math.round(w * img.height / img.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
    const url = c.toDataURL(type, q);
    res.push({ w, h, q, type, len: url.length, url });
  }
  return res;
}, png);
for (const r of out) { console.log(r.type, r.w, r.h, r.q, Math.round(r.len / 1024) + 'KB'); fs.writeFileSync(`map-${r.w}-${r.q}.${r.type.split('/')[1]}`, Buffer.from(r.url.split(',')[1], 'base64')); }
await browser.close();
