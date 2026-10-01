// Thareia T2: the airship's 3D ship in Chromium at phone size (390 x 844), with screenshots in tools/shots/sky3d/.
//   node tools/e2e-sky3d.mjs [--out=tools/shots/sky3d] [--laptop]
// Builds nothing: run `npm run build` first (it reads dist/thareia.html).
// Two runs (design/09-t2-spec.md 6.7, A's own checks):
//   3d:  a new game, then a hire flight from Thornhollow (c1-skiff-rented set, Eldergrove known). The 3D view draws;
//        the ship shows (the pixels round it differ from the same frame with the ship hidden); a right turn banks it
//        right (the lean the screen reports, over 5 degrees) and the banked frame differs from the level one; flying
//        south into the Gloomfen turns it back with the edge line (the region is closed to hire below level 36); on the
//        world map the Fjords mark is refused ("no licence"), and tapping Eldergrove flies there and lands on
//        th-eldergrove.
//   2d:  the same flight with ?sky=2d draws the 2D sprite (the view reports '2d', and the sprite shows).
// Fails on any page error or console error.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = path.resolve(root, args.out || 'tools/shots/sky3d'); mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const vp = args.laptop ? { width: 1280, height: 800 } : { width: 390, height: 844 };
const errors = [];
const fail = m => { errors.push(m); console.log('FAIL', m); };
const url = pathToFileURL(path.join(root, 'dist/thareia.html')).href;

// a scratch page that compares two PNG screenshots: the mean difference per channel (0..255)
const cmp = await browser.newPage();
async function diff(a, b) {
  return cmp.evaluate(async ([a, b]) => {
    const load = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const A = await load(a), B = await load(b); let s = 0;
    for (let k = 0; k < Math.min(A.length, B.length); k += 4) s += Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]);
    return s / (Math.min(A.length, B.length) / 4) / 3;
  }, [a.toString('base64'), b.toString('base64')]);
}

async function run(tag, query) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: args.laptop ? 1 : 2, hasTouch: !args.laptop });
  page.on('pageerror', e => errors.push(`${tag} pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts.g/.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  await page.addInitScript(() => { globalThis.__aethTest = app => { window.__app = app; }; });
  await page.goto(url + query);
  let n = 0;
  const shot = async (name, clip) => {
    const buf = await page.screenshot(clip ? { clip } : {});
    if (!clip) writeFileSync(path.join(out, `${tag}-${String(++n).padStart(2, '0')}-${name}.png`), buf);
    return buf;
  };
  const clickText = async t => { await page.getByRole('button', { name: t }).first().click(); await page.waitForTimeout(250); };
  // a new game, to the docks
  await clickText(/New game/);
  await page.fill('#wname', 'Wren'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  await clickText(/Next/); await clickText(/standard array/); await clickText(/Next: what you carry/);
  await page.locator('.starter .take').first().click(); await clickText(/Begin/);
  for (let i = 0; i < 4; i++) { await page.locator('.prologue .btn.primary').first().click(); await page.waitForTimeout(250); }
  await page.waitForSelector('.screen-world', { timeout: 15000 });
  await page.waitForTimeout(600);
  // the skiff rented, Eldergrove known: a hire flight from the Thornhollow landing
  await page.evaluate(() => {
    const a = window.__app, g = structuredClone(a.game), f = g.progress.flags;
    f.story = { ...f.story, 'c1-skiff-rented': true };
    f.docks = { ...(f.docks || {}), thornhollow: true, eldergrove: true };
    a.replaceGame(g, { backup: false });
    a.go('sky', { flight: 'hire', from: 'thornhollow' });
  });
  await page.waitForSelector('.screen-sky', { state: 'attached' });
  await page.waitForTimeout(3000);
  const S = () => page.evaluate(() => window.__sky.state());
  let st = await S();
  const want = query.includes('sky=2d') ? '2d' : '3d';
  if (st.view !== want) fail(`${tag}: the view is ${st.view}, not ${want}`);
  if (!/Rented skiff: licensed docks only|To /.test(st.aim)) fail(`${tag}: the aim line reads "${st.aim}"`);
  // the ship shows: the frame round it differs from the same frame with the ship hidden
  const box = s => ({ x: Math.max(0, s.screen[0] - 70), y: Math.max(0, s.screen[1] - 70), width: 140, height: 140 });
  await page.waitForTimeout(800);
  st = await S();
  const level = await shot('level');
  const withShip = await shot('', box(st));
  await page.evaluate(() => window.__sky.showShip(false)); await page.waitForTimeout(120);
  const noShip = await shot('', box(st));
  await shot('no-ship');
  await page.evaluate(() => window.__sky.showShip(true));
  const seen = await diff(withShip, noShip);
  console.log(`${tag}: the ship changes the pixels round it by ${seen.toFixed(1)} a channel (view ${st.view}, bank ${st.bank.toFixed(1)})`);
  if (seen < 8) fail(`${tag}: the ship does not show over the painting (${seen.toFixed(1)})`);
  if (want === '2d') { await page.close(); return; }
  // a right turn banks right
  const levelBox = await shot('', box(st));
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(900);
  await page.keyboard.down('ArrowRight'); await page.keyboard.up('ArrowUp');
  // into the turn: until the lean passes 10 degrees (or 0.8 s)
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(50); st = await S(); if (st.bank > 10) break; }
  const banked = await shot('banked');
  const bankedBox = await shot('', box(st));
  await page.keyboard.up('ArrowRight');
  console.log(`${tag}: banked ${st.bank.toFixed(1)} degrees in the right turn`);
  if (!(st.bank > 5)) fail(`${tag}: a right turn did not bank right (${st.bank.toFixed(1)})`);
  if (st.bank > 25.01) fail(`${tag}: the bank passed 25 degrees (${st.bank.toFixed(1)})`);
  const d = await diff(levelBox, bankedBox), whole = await diff(level, banked);
  console.log(`${tag}: the banked frame differs from the level one by ${d.toFixed(1)} round the ship, ${whole.toFixed(1)} over all`);
  if (d < 2) fail(`${tag}: the banked frame looks like the level one`);
  await page.waitForTimeout(1500);
  st = await S();
  if (Math.abs(st.bank) > 3) fail(`${tag}: the bank did not settle (${st.bank.toFixed(1)})`);
  // the Gloomfen is closed to a hired skiff: flying south off the Wilds turns it back with the licence line
  await page.evaluate(() => window.__sky.place(900, 990, Math.PI / 2));
  await page.keyboard.down('ArrowDown');
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(100); st = await S(); if (st.say.includes('edge of the Wilds')) break; }
  await page.keyboard.up('ArrowDown');
  await shot('edge');
  console.log(`${tag}: at the Gloomfen edge the ship is at ${st.ship.x.toFixed(0)},${st.ship.y.toFixed(0)} over ${st.region}`);
  if (st.region !== 'verdant') fail(`${tag}: the hired skiff crossed into ${st.region}`);
  if (!st.say.includes('The licence stops at the edge of the Wilds.')) fail(`${tag}: no edge line at the Gloomfen ("${st.say}")`);
  // the world map: the Fjords are refused; Eldergrove flies and lands
  await clickText(/World map/); await page.waitForTimeout(500); await shot('map');
  const at = ([x, y]) => page.evaluate(([x, y]) => {
    const cv = document.querySelectorAll('.sky-canvas')[1] || document.querySelector('.sky-canvas'), r = cv.getBoundingClientRect(), z = Math.min(r.width / 1536, r.height / 1024);
    return [r.left + (r.width - 1536 * z) / 2 + x * z, r.top + (r.height - 1024 * z) / 2 + y * z];
  }, [x, y]);
  const fj = await at([205, 128]);
  await page.mouse.click(fj[0], fj[1]); await page.waitForTimeout(400);
  st = await S(); await shot('fjords-refused');
  if (!/licence/i.test(st.say)) fail(`${tag}: the Fjords were not refused for the licence ("${st.say}")`);
  const eg = await at([1278 / 3, 300 / 2]);
  await page.mouse.click(eg[0], eg[1]); await page.waitForTimeout(1200); await shot('to-eldergrove');
  await page.waitForSelector('.screen-world', { timeout: 20000 }); await page.waitForTimeout(800);
  await shot('landed');
  const g = await page.evaluate(() => window.__app.game.progress);
  if (g.pos.map !== 'th-eldergrove') fail(`${tag}: landed on ${g.pos.map}, not th-eldergrove`);
  if (g.flags.hired !== 1) fail(`${tag}: the hired flight was not counted (${g.flags.hired})`);
  if (!g.flags.docks?.eldergrove) fail(`${tag}: Eldergrove is not a known dock`);
  await page.close();
}

await run('3d', '');
await run('2d', '?sky=2d');
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
if (errors.length) process.exit(1);
