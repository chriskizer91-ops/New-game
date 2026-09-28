// The migration checklist (M3 spec §7), automated: paste every real M2 code in test/fixtures/v1/ into
// the built game through the title's Settings → Load a code, in Chromium at phone (360x740, touch)
// and laptop (1280x800) sizes. For each code: the carry-over card opens, "Walk on" reaches the
// world, the party walks, Party, Codex, Journal and Atlas open, the v2 save is the migrated game,
// the v1 key is never written, nothing scrolls sideways, and there is no console error.
//
//   node tools/e2e-codes.mjs                  # build into dist/, then run
//   node tools/e2e-codes.mjs --no-build       # reuse dist/
//   node tools/e2e-codes.mjs --only=phone     # one viewport (phone | laptop)
//   node tools/e2e-codes.mjs --codes=grudges  # only the fixtures whose file name matches
//   AETH_HTML=/tmp/x/aethermoor.html node tools/e2e-codes.mjs   # a private build
// Playwright is not a project dependency: it comes from the global npm root.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
const fixtures = path.join(root, 'test/fixtures/v1');
const codes = readdirSync(fixtures).filter(f => f.endsWith('.code.txt') && (!args.codes || f.includes(String(args.codes))));

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
].filter(v => (args.only ? v.name === args.only : true));

const fails = [];
const screen = page => page.evaluate(() => document.getElementById('app').dataset.screen);
for (const V of VIEWPORTS) {
  console.log(`\n== ${V.name} ${V.viewport.width}x${V.viewport.height}`);
  for (const f of codes) {
    const id = f.replace('.code.txt', '');
    const code = readFileSync(path.join(fixtures, f), 'utf8').trim();
    const v1 = JSON.parse(readFileSync(path.join(fixtures, `${id}.json`), 'utf8'));
    const context = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, isMobile: !!V.isMobile, hasTouch: !!V.hasTouch });
    await context.addInitScript(() => { window.__aethTest = app => { window.__app = app; }; });
    const page = await context.newPage();
    const errors = [];
    // font requests fail in a sandbox without the network; they are not the game's errors
    page.on('console', m => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || /^\[(audio|world)\]/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    const problems = [];
    let where = '';
    try {
      await page.goto(pathToFileURL(file).href);
      await page.waitForSelector('.title-menu');
      await page.locator('.title-menu button:has-text("Settings")').first().click();
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'settings');
      // pasted the way a phone pastes: stray spaces and a line break inside
      await page.fill('.code-in textarea', `  ${code.slice(0, 40)}\n${code.slice(40)}  \n`);
      await page.locator('button:has-text("Load this save")').first().click();
      await page.waitForSelector('.carry-card', { timeout: 5000 });
      const card = (await page.locator('.carry-card').innerText()).replace(/\s+/g, ' ');
      where = (card.match(/You wake [^.]+/) || [''])[0];
      if (!where) problems.push('the card does not say where you wake');
      if (!new RegExp(`\\b${v1.gold}\\b`).test(card)) problems.push(`the card does not show ${v1.gold} gold`);
      await page.locator('.carry-go').first().click();
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 8000 });
      await page.waitForTimeout(600);
      for (let i = 0; i < 20; i++) {
        const b = await page.$('.ov .dlg-choice, .ov .dlg-next, .ov [data-primary]:not([disabled]), .ov .cont');
        if (!b) break;
        await b.click().catch(() => {});
        await page.waitForTimeout(180);
      }
      const st = await page.evaluate(() => ({ v1: localStorage.getItem('aethermoor.save.v1'), v2: localStorage.getItem('aethermoor.save.v2') }));
      const g = st.v2 ? JSON.parse(st.v2) : null;
      if (!g || g.version !== 2 || g.migratedFrom !== 1) problems.push('the v2 save is not the migrated game');
      if (g && g.gold !== v1.gold) problems.push(`gold ${g.gold} is not the code's ${v1.gold}`);
      // walk: every tile the party stands on counts
      const tiles = new Set();
      const here = async () => { const s = await page.evaluate(() => window.__world?.state()); if (s) tiles.add(`${s.map}:${s.x},${s.y}`); };
      await here();
      for (const [k, ms] of [['KeyS', 500], ['KeyD', 400], ['KeyW', 500], ['KeyA', 400]]) {
        await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(200);
        if ((await screen(page)) !== 'world') break;
        await here();
      }
      if (tiles.size < 2) problems.push('the party did not walk');
      if (await page.evaluate(() => localStorage.getItem('aethermoor.save.v1')) !== null) problems.push('the v1 key was written');
      for (const name of ['party', 'codex', 'journal', 'atlas']) {
        await page.evaluate(n => window.__app.go(n, { from: 'world' }), name);
        await page.waitForTimeout(400);
        if ((await screen(page)) !== name) problems.push(`${name} did not open`);
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) problems.push(`${name} scrolls sideways`);
      }
    } catch (e) { problems.push(e.message.split('\n')[0]); }
    if (errors.length) problems.push(`console: ${errors.slice(0, 3).join(' | ')}`);
    if (problems.length) fails.push(`${V.name} ${id}: ${problems.join('; ')}`);
    console.log(`  ${problems.length ? 'FAIL' : 'ok  '} ${id}: ${where || '?'}${problems.length ? ` -- ${problems.join('; ')}` : ''}`);
    await context.close();
  }
}
await browser.close();
console.log(fails.length ? `\nE2E-CODES FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : `\nE2E-CODES passed (${codes.length} codes x ${VIEWPORTS.length} sizes)`);
process.exit(fails.length ? 1 : 0);
