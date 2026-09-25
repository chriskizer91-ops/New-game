// Art review gallery: bundles tools/gallery-entry.js with esbuild into tools/shots/gallery.html,
// then screenshots it with Playwright (phone width and wide, plus one image per section).
//
//   node tools/gallery.mjs                  # build + screenshots
//   node tools/gallery.mjs --only=foes,icons  # only these sections (faster iteration)
//   node tools/gallery.mjs --no-shots       # build the HTML only
//
// Playwright is not a project dependency: it is loaded from the global npm root, and the
// preinstalled Chromium is used when present.
import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'tools/shots');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));

const res = await build({
  entryPoints: [path.join(root, 'tools/gallery-entry.js')],
  bundle: true, format: 'iife', target: 'es2020', write: false, minify: false, legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aethermoor art gallery</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; background: #120e0c; color: #ecdfc3; font: 13px/1.35 system-ui, sans-serif; }
main { padding: 12px 16px 40px; max-width: 1600px; margin: 0 auto; }
h1 { font: 700 22px Georgia, serif; margin: 6px 0 10px; }
section { margin: 0 0 18px; padding: 10px; background: #19130f; box-shadow: 0 0 0 2px #0b0910, 0 0 0 4px #3f3229; }
h2 { font: 700 16px Georgia, serif; margin: 0 0 8px; color: #ffcb66; }
h3 { font: 600 12px system-ui; margin: 10px 0 4px; color: #c4b294; letter-spacing: .04em; text-transform: uppercase; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; }
figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
figcaption { font: 10px/1.2 ui-monospace, monospace; color: #948470; text-align: center; max-width: 220px; }
canvas { image-rendering: pixelated; image-rendering: crisp-edges; display: block; }
.note { color: #948470; font-size: 12px; margin: 4px 0 8px; }
pre { font: 11px/1.4 ui-monospace, monospace; color: #c4b294; white-space: pre-wrap; }
</style></head><body><main id="app"><h1>Aethermoor art gallery</h1></main>
<script>${js}</script></body></html>`;
await mkdir(outDir, { recursive: true });
const file = path.join(outDir, 'gallery.html');
await writeFile(file, html);
console.log(`wrote ${path.relative(root, file)} (${(html.length / 1024).toFixed(0)} KB)`);
if (args['no-shots']) process.exit(0);

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch {
  const g = execSync('npm root -g').toString().trim();
  pw = require(path.join(g, 'playwright'));
}
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const url = pathToFileURL(file).href + '#' + [args.only ? `only=${args.only}` : '', args.zoom ? `zoom=${args.zoom}` : '', args.fk ? `fk=${args.fk}` : '', args.ph ? `ph=${args.ph}` : ''].filter(Boolean).join('&');
const shots = [];
for (const [name, width, scale] of [['wide', 1500, 1], ['phone', 390, 2]]) {
  if (args.only && name === 'phone' && !args.phone) continue;
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
  page.on('console', m => { if (m.type() === 'error') console.log('page error:', m.text()); });
  page.on('pageerror', e => console.log('page exception:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
  const suffix = args.only ? '-' + String(args.only).replace(/,/g, '+') : '';
  const full = path.join(outDir, `gallery-${name}${suffix}.png`);
  await page.screenshot({ path: full, fullPage: true });
  shots.push(full);
  if (name === 'wide') {
    for (const id of await page.$$eval('section[id]', els => els.map(e => e.id))) {
      const el = await page.$(`section#${id}`);
      const p = path.join(outDir, `sec-${id}.png`);
      await el.screenshot({ path: p });
      shots.push(p);
    }
    const t = await page.evaluate(() => window.__timings);
    if (t) {
      console.log('render timings (ms):');
      for (const [k, v] of Object.entries(t)) console.log(`  ${k.padEnd(34)} ${typeof v === 'number' ? v.toFixed(2) : v}`);
      await writeFile(path.join(outDir, 'timings.json'), JSON.stringify(t, null, 2));
    }
  }
  await page.close();
}
await browser.close();
console.log('screenshots:\n  ' + shots.map(s => path.relative(root, s)).join('\n  '));
