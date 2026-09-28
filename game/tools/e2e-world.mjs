// End-to-end test of the world screen (M3 spec §7 "e2e-world scenarios") in Chromium at phone and
// laptop sizes. Fails on any console error or page exception.
//
//   node tools/e2e-world.mjs              # build, then run both viewports
//   node tools/e2e-world.mjs --no-build   # reuse dist/
//   node tools/e2e-world.mjs --only=phone # one viewport (phone | laptop)
//
// SCAFFOLD: boots dist/aethermoor.html with an M2 save (test/fixtures/v1/v1-node-thornhollow.json)
// in localStorage, opens the placeholder world, Atlas and Journal screens through the test seam,
// takes a few steps with window.__world, and checks there are no console errors. WP7 grows it into
// the eleven §7 scenarios, including the performance gate.
// Playwright is not a project dependency: it comes from the global npm root.
// Owner: WP7.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build']) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = path.join(root, 'dist/aethermoor.html');
const save = readFileSync(path.join(root, 'test/fixtures/v1/v1-node-thornhollow.json'), 'utf8');

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), ...(proxy ? { proxy: { server: proxy } } : {}) });

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
].filter(v => (args.only ? v.name === args.only : true));

const fails = [];
function check(cond, msg) { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } else console.log('  ok', msg); }

async function run(V) {
  console.log(`\n== ${V.name} ${V.viewport.width}x${V.viewport.height}`);
  const context = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, isMobile: !!V.isMobile, hasTouch: !!V.hasTouch, ignoreHTTPSErrors: true });
  await context.addInitScript(raw => {
    window.__aethTest = app => { window.__app = app; };
    try { if (!localStorage.getItem('aethermoor.save.v1')) localStorage.setItem('aethermoor.save.v1', raw); } catch { /* storage blocked */ }
  }, save);
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('console', m => { if (m.type() === 'error' || /^\[audio\]/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => failed.push(r.url()));
  const screen = () => page.evaluate(() => document.getElementById('app').dataset.screen);
  const go = (name, params = {}) => page.evaluate(([n, p]) => window.__app.go(n, p), [name, params]);

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  check(await screen() === 'title', `${V.name}: boots to the title`);

  await go('world');
  await page.waitForSelector('.screen-world .world-place');
  check(await screen() === 'world', `${V.name}: the world screen mounts`);
  check(/Thornhollow/.test(await page.locator('.world-place').innerText()), `${V.name}: an M2 save at Thornhollow wakes in Thornhollow`);
  const before = await page.evaluate(() => window.__world.state());
  await page.evaluate(() => window.__world.step('s', 2));
  const after = await page.evaluate(() => window.__world.state());
  check(after.y === before.y + 2, `${V.name}: two steps south (${before.y} -> ${after.y})`);

  for (const name of ['atlas', 'journal']) {
    await go(name);
    await page.waitForFunction(s => document.getElementById('app').dataset.screen === s, name);
    check(await screen() === name, `${V.name}: ${name} mounts`);
  }
  await go('road');
  await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'road');
  check(true, `${V.name}: the old road still mounts`);

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors (${real.join(' | ')})`);
  await context.close();
}

for (const V of VIEWPORTS) {
  try { await run(V); } catch (e) { fails.push(`${V.name}: ${e.message.split('\n')[0]}`); console.log('  ERROR', e.message); }
}
await browser.close();
console.log(fails.length ? `\nE2E-WORLD FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nE2E-WORLD passed');
process.exit(fails.length ? 1 : 0);
