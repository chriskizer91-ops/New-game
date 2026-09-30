// The migration checklist (M3 spec §7), automated: paste every real M2 code in test/fixtures/v1/ into
// the built game through the title's Settings → Load a code, plus (M4 spec §8) Milestone 3 codes
// (AETH2., the M3 game each of three fixtures becomes), (M5) Milestone 4 and 4.5 codes (AETH3., the
// same three as those files would export them), (M6) Milestone 5 codes (AETH4., the same three again) and (M7)
// Milestone 6 codes (AETH5., the same three once more), in Chromium at phone (360x740, touch) and laptop
// (1280x800) sizes. For each code: the carry-over card opens, "Walk on" reaches the world, the party
// walks, Party, Codex, Journal and Atlas open, this milestone's own save (aethermoor.save.m7) is the
// migrated game, the M2, Milestone 3, 4, 4.5, 5 and 6 keys are never written, nothing scrolls sideways, and
// there is no console error.
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
import { SAVE_VERSION, toV2, toV3, toV4, toV5 } from '../src/rules/migrate.js';
import { exportCode } from '../src/core/save.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
const fixtures = path.join(root, 'test/fixtures/v1');
const load = id => JSON.parse(readFileSync(path.join(fixtures, `${id}.json`), 'utf8'));
// every real M2 code, then Milestone 3 codes: the version 2 game an M3 player would have exported, then
// the version 3 game an M4 or Milestone 4.5 player would have, then (M6) the version 4 game an M5 player would have
const M3_FROM = ['v1-node-thornhollow', 'v1-after-brand', 'v1-grudges'];
const entries = [
  ...readdirSync(fixtures).filter(f => f.endsWith('.code.txt')).map(f => {
    const id = f.replace('.code.txt', '');
    return { id, code: readFileSync(path.join(fixtures, f), 'utf8').trim(), gold: load(id).gold };
  }),
  ...M3_FROM.map(id => { const m3 = toV2(load(id)); return { id: `m3-${id}`, code: exportCode(m3), gold: m3.gold }; }),
  ...M3_FROM.map(id => { const m45 = toV3(load(id)); return { id: `m45-${id}`, code: exportCode(m45), gold: m45.gold }; }),
  ...M3_FROM.map(id => { const m5 = toV4(load(id)); return { id: `m5-${id}`, code: exportCode(m5), gold: m5.gold }; }),
  ...M3_FROM.map(id => { const m6 = toV5(load(id)); return { id: `m6-${id}`, code: exportCode(m6), gold: m6.gold }; }),
].filter(e => !args.codes || e.id.includes(String(args.codes)));
for (const e of entries) if (e.id.startsWith('m3-') && !e.code.startsWith('AETH2.')) throw new Error(`${e.id} is not an AETH2 code`);
for (const e of entries) if (e.id.startsWith('m45-') && !e.code.startsWith('AETH3.')) throw new Error(`${e.id} is not an AETH3 code`);
for (const e of entries) if (e.id.startsWith('m5-') && !e.code.startsWith('AETH4.')) throw new Error(`${e.id} is not an AETH4 code`);
for (const e of entries) if (e.id.startsWith('m6-') && !e.code.startsWith('AETH5.')) throw new Error(`${e.id} is not an AETH5 code`);

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
  for (const { id, code, gold } of entries) {
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
      if (!new RegExp(`\\b${gold}\\b`).test(card)) problems.push(`the card does not show ${gold} gold`);
      await page.locator('.carry-go').first().click();
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 8000 });
      await page.waitForTimeout(600);
      for (let i = 0; i < 20; i++) {
        const b = await page.$('.ov .dlg-choice, .ov .dlg-next, .ov [data-primary]:not([disabled]), .ov .cont');
        if (!b) break;
        await b.click().catch(() => {});
        await page.waitForTimeout(180);
      }
      const st = await page.evaluate(() => ({ live: localStorage.getItem('aethermoor.save.m7') }));
      const g = st.live ? JSON.parse(st.live) : null;
      if (!g || g.version !== SAVE_VERSION || g.migratedFrom !== 1) problems.push('the live save is not the migrated game');
      if (g && g.gold !== gold) problems.push(`gold ${g.gold} is not the code's ${gold}`);
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
      const old = await page.evaluate(() => [localStorage.getItem('aethermoor.save.v1'), localStorage.getItem('aethermoor.save.v2'), localStorage.getItem('aethermoor.save.m4'),
        localStorage.getItem('aethermoor.save.m4.5'), localStorage.getItem('aethermoor.m4.5.started'), localStorage.getItem('aethermoor.save.m5'), localStorage.getItem('aethermoor.m5.started'),
        localStorage.getItem('aethermoor.save.m6'), localStorage.getItem('aethermoor.m6.started')]);
      if (old[0] !== null) problems.push('the M2 key was written');
      if (old[1] !== null) problems.push('a Milestone 3 key was written');
      if (old[2] !== null) problems.push('a Milestone 4 key was written');
      if (old[3] !== null || old[4] !== null) problems.push('a Milestone 4.5 key was written');
      if (old[5] !== null || old[6] !== null) problems.push('a Milestone 5 key was written');
      if (old[7] !== null || old[8] !== null) problems.push('a Milestone 6 key was written');
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
console.log(fails.length ? `\nE2E-CODES FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : `\nE2E-CODES passed (${entries.length} codes x ${VIEWPORTS.length} sizes)`);
process.exit(fails.length ? 1 : 0);
