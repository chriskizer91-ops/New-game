// End-to-end flow test: plays every non-battle screen of dist/aethermoor.html at phone and laptop
// sizes and screenshots each step into tools/shots/e2e/.
//
//   node tools/e2e-flow.mjs              # build, then run both viewports
//   node tools/e2e-flow.mjs --no-build   # reuse dist/
//   node tools/e2e-flow.mjs --only=phone # one viewport (phone | laptop | small = 360x740, opt-in)
//   node tools/e2e-flow.mjs --out=/tmp/x  # write screenshots somewhere else
//
// Flow: title -> new game (name, look, 4d6 rolls, starter, prologue) -> road (rest at the Keep,
// advance, HELD BY preview) -> battle (whatever battle screen exists, on Auto) -> aftermath (every
// chest, card reveal, equip) -> patrol -> party (equip from the bag) -> codex -> settings
// (export/import round trip) -> reload -> Continue. Fails on any console error or page exception.
// Playwright is not a project dependency: it comes from the global npm root.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build']) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = path.join(root, 'dist/aethermoor.html');
const outDir = args.out ? path.resolve(args.out) : path.join(root, 'tools/shots/e2e');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), ...(proxy ? { proxy: { server: proxy } } : {}) });

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  { name: 'small', viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, optIn: true },
].filter(v => (args.only ? v.name === args.only : !v.optIn));

const fails = [];
function check(cond, msg) { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } }

async function run(V) {
  console.log(`\n== ${V.name} ${V.viewport.width}x${V.viewport.height}`);
  const context = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, isMobile: !!V.isMobile, hasTouch: !!V.hasTouch, ignoreHTTPSErrors: true });
  // The test seam (src/main.js calls window.__aethTest(app)): keeps a handle on the app, and can turn
  // the next battle into a forced result so defeat, fled and the Brand of Briars get screens too.
  await context.addInitScript(() => {
    window.__aethTest = app => {
      window.__app = app;
      const go = app.go;
      app.go = (name, p = {}) => {
        const force = window.__forceResult;
        if (name === 'battle' && force) {
          window.__forceResult = null;
          const b = structuredClone(p.battle);
          if (force.result === 'defeat') for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = 0; u.ko = true; }
          b.ended = { result: force.result, xp: force.xp || 0, gold: force.gold || 0, drops: [], claimed: [], consumables: {} };
          return go('aftermath', { battle: b, returnTo: p.returnTo || 'road' });
        }
        return go(name, p);
      };
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || /^\[audio\]/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  // Google Fonts is the page's one external resource; a flaky proxy fetch of it is not a game bug
  const failed = [];
  page.on('requestfailed', r => failed.push(r.url()));
  let n = 0;
  const shot = async (name, full = true) => {
    await page.waitForTimeout(250);
    const p = path.join(outDir, `${V.name}-${String(++n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: p, fullPage: full });
    console.log('  shot', path.relative(root, p));
  };
  const screen = () => page.evaluate(() => document.getElementById('app').dataset.screen);
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(s => document.getElementById('app').dataset.screen === s, name, { timeout }); await page.waitForTimeout(200); };
  const click = async (sel, opts = {}) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(opts); };
  const noHScroll = async label => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(w[0] <= w[1] + 1, `${V.name} ${label}: horizontal scroll (${w[0]} > ${w[1]})`);
  };

  // playing a battle: whatever battle screen exists, switched to Auto and the fastest speed
  const playBattle = async label => {
    await waitScreen('battle');
    await page.waitForTimeout(600);
    await shot(`battle-${label}`, false);
    const auto = page.locator('.bt-auto');
    if (await auto.count()) { if ((await auto.getAttribute('aria-pressed')) !== 'true') await auto.click(); }
    const speed = page.locator('.bt-speed');
    for (let i = 0; i < 3 && await speed.count(); i++) { const t = await speed.innerText(); if (/4x/.test(t)) break; await speed.click(); }
    const t0 = Date.now();
    while (await screen() === 'battle' && Date.now() - t0 < 240000) {
      // if a battle screen asks for input without an Auto button, confirm whatever is offered
      if (!(await auto.count())) await page.keyboard.press('Enter').catch(() => {});
      await page.waitForTimeout(500);
    }
    await waitScreen('aftermath', 20000);
  };

  // opening every chest in the aftermath: each plays the reveal; equip the first usable card
  const openChests = async (label, equipFirst) => {
    const chests = page.locator('.chest');
    const count = await chests.count();
    console.log(`  ${count} chest(s)`);
    let equipped = false;
    for (let i = 0; i < count; i++) {
      await chests.nth(i).scrollIntoViewIfNeeded();
      await chests.nth(i).click();
      if (i === 0) { await page.waitForTimeout(1250); await shot(`reveal-beam-${label}`, false); }
      await page.waitForSelector('.ov .card', { timeout: 15000 });
      await page.waitForTimeout(900);
      if (i === 0) await shot(`reveal-${label}`, false);
      const id = page.locator('.ov .identify-btn');
      if (await id.count()) { await id.click(); await page.waitForTimeout(2200); await shot(`identified-${label}`, false); }
      const eq = page.locator('.ov .equip:not([disabled])');
      if (equipFirst && !equipped && await eq.count()) {
        await eq.scrollIntoViewIfNeeded(); await eq.click(); equipped = true;
        await page.waitForTimeout(900);
        await page.locator('.ov .card').first().scrollIntoViewIfNeeded();
        await shot(`equipped-${label}`, false);
      }
      await click('.ov .cont');
      await page.waitForSelector('.ov', { state: 'detached' });
    }
    return equipped;
  };

  // ---- title ----
  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  // the screenshots are for review, so give the Google Fonts fetch (via a flaky proxy) a few tries
  const fontsOk = () => page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some(f => /Silkscreen/.test(f.family) && f.status === 'loaded'); });
  for (let i = 0; i < 3 && !(await fontsOk()); i++) { await page.reload(); await page.waitForSelector('.title-menu'); await page.waitForTimeout(1200); }
  console.log(`  fonts: ${(await fontsOk()) ? 'loaded' : 'fallback'}`);
  await page.waitForTimeout(500);
  await shot('title', false);
  await noHScroll('title');
  check(await page.locator('text=Continue').count() === 0, `${V.name}: no Continue without a save`);

  // ---- new game ----
  await click('.title-menu >> text=New game');
  await waitScreen('newgame');
  // the tap unlocked audio: every sound effect, every tier, and every track must play without error
  const audio = await page.evaluate(async () => {
    const a = window.__app.audio;
    const names = ['select', 'confirm', 'back', 'dice', 'hit', 'graze', 'miss', 'crit', 'heal', 'status', 'disarm', 'ko', 'surge', 'legend', 'victory', 'defeat', 'phase', 'chest', 'reveal', 'equip', 'levelup', 'hearth', 'beam', 'tick', 'stamp', 'coin', 'page', 'identify', 'slam', 'error'];
    for (const n of names) for (let tier = 0; tier < 8; tier++) a.sfx(n, { tier, lead: .5 });
    for (const t of ['road', 'battle', 'boss', 'hearth', 'victory', 'title']) { a.music(t); await new Promise(r => setTimeout(r, 350)); }
    return { unlocked: a.unlocked, track: a.track };
  });
  check(audio.unlocked && audio.track === 'title', `${V.name}: audio unlocked by the tap and back on the title track (${JSON.stringify(audio)})`);
  await page.fill('#wname', V.name === 'phone' ? 'Tess' : 'Bram');
  await shot('ng-name', false);
  await click('button:has-text("Next: how they look")');
  await click('.opt-group:nth-of-type(3) .opt >> nth=2');
  await shot('ng-look');
  await click('button:has-text("Next: ability scores")');
  await click('button:has-text("Roll 4d6")');
  await page.waitForTimeout(1400);
  await shot('ng-abilities');
  await click('.abil-row[data-a="STR"]'); await click('.abil-row[data-a="CHA"]');
  await click('button:has-text("Reroll all")');
  await page.waitForTimeout(1400);
  await click('button:has-text("Next: your heirloom")');
  await shot('ng-heirloom');
  await click(V.name === 'phone' ? 'button:has-text("Take Hearthbrand")' : 'button:has-text("Take Cairnmaul")');
  await page.waitForTimeout(500);
  await shot('ng-tamsin');
  await click('button:has-text("Begin with")');
  await page.waitForSelector('.prologue');
  for (let i = 0; i < 4; i++) { await click('.prologue button:has-text("Continue")'); await page.waitForTimeout(150); }
  await shot('ng-prologue', false);
  await click('button:has-text("Take the road")');
  await waitScreen('road');
  await page.waitForTimeout(400);
  await shot('road-keep');
  await noHScroll('road');

  // ---- road: rest at the Keep's hearth, then advance to the vault ----
  await click('.node-acts .rest');
  await page.waitForTimeout(300);
  check(await page.locator('.rest-line').count() === 1, `${V.name}: rest shows its line`);
  await shot('road-rested', false);
  await click('.node-acts .advance');
  await page.waitForTimeout(300);
  check(await page.locator('h1:has-text("The Vault Door")').count() === 1, `${V.name}: advanced to the vault`);
  await shot('road-vault');
  await click('.glint-btn');
  await page.waitForSelector('.ov .card.grey');
  await page.waitForTimeout(400);
  await shot('held-by', false);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check(await page.locator('.ov').count() === 0, `${V.name}: Esc closes a card overlay`);

  // ---- a forced wipe at the vault: wake at the Hearthfire, a Grudge is born ----
  await page.evaluate(() => { window.__forceResult = { result: 'defeat' }; });
  await click('.node-acts .fight');
  await waitScreen('aftermath');
  await page.waitForTimeout(1200);
  check(await page.locator('text=You wake at the Hearthfire.').count() === 1, `${V.name}: defeat wakes you at the Hearthfire`);
  check(await page.locator('.af-grudge').count() === 1, `${V.name}: defeat makes a Grudge`);
  await shot('aftermath-defeat');
  await click('.af-foot .btn.primary');
  await waitScreen('road');
  check(await page.locator('h1:has-text("The Eternal Hearth")').count() === 1, `${V.name}: woke at the Keep`);
  await click('.node-acts .advance');
  await page.waitForTimeout(300);
  check(await page.locator('.grudge-note').count() === 1, `${V.name}: the vault shows the Grudge`);
  await shot('road-grudge');

  // ---- the first real fight ----
  await click('.node-acts .fight');
  await playBattle('vault');
  await page.waitForTimeout(1600);
  await shot('aftermath-vault');
  await noHScroll('aftermath');
  await openChests('vault', true);
  await shot('aftermath-looted');
  await click('.af-foot .btn.primary');
  await waitScreen('road');

  // ---- advance and a patrol ----
  await click('.node-acts .advance');
  await page.waitForTimeout(300);
  await shot('road-hearth-road');
  await click('.node-acts .patrol');
  await playBattle('patrol');
  await page.waitForTimeout(1200);
  await openChests('patrol', false);
  await click('.af-foot .btn.primary');
  await waitScreen('road');
  await page.evaluate(() => { window.__forceResult = { result: 'fled' }; });
  await click('.node-acts .patrol');
  await waitScreen('aftermath');
  check(await page.locator('text=You got away.').count() === 1, `${V.name}: fled screen`);
  await shot('aftermath-fled', false);
  await click('.af-foot .btn.primary');
  await waitScreen('road');

  // ---- party: equip something from the bag ----
  await click('.road-menu >> text=Party');
  await waitScreen('party');
  await page.waitForTimeout(400);
  await shot('party');
  await noHScroll('party');
  let equippedFromBag = false;
  const tabs = page.locator('.tab');
  // look for an upgrade first (a green ▲ in the bag); any usable piece will do on the second pass
  for (const want of ['.inv.up', '.inv:not(.cant)']) {
    for (let t = 0; t < await tabs.count() && !equippedFromBag; t++) {
      await tabs.nth(t).click(); await page.waitForTimeout(150);
      for (const s of ['weapon', 'offhand', 'head', 'body', 'hands', 'feet', 'amulet', 'ring']) {
        await click(`.slot[data-s="${s}"]`);
        if (!(await page.locator(`${want} .eq-quick`).count())) continue;
        await page.locator(`${want} .inv-open`).first().click();
        await page.waitForSelector('.ov .card');
        await page.waitForTimeout(500);
        await shot('party-card', false);
        const eq = page.locator('.ov .equip:not([disabled])');
        if (await eq.count()) { await eq.scrollIntoViewIfNeeded(); await eq.click(); await page.waitForTimeout(700); await shot('party-card-equipped', false); equippedFromBag = true; }
        await click('.ov .cont');
        await page.waitForSelector('.ov', { state: 'detached' });
        if (!equippedFromBag) { await click(`${want} .eq-quick`); equippedFromBag = true; }
        break;
      }
    }
    if (equippedFromBag) break;
  }
  check(equippedFromBag, `${V.name}: equipped an item from the bag on the party screen`);
  await page.waitForTimeout(700);
  await shot('party-after');
  await click('.topbar .back');
  await waitScreen('road');

  // ---- codex ----
  await click('.road-menu >> text=Codex');
  await waitScreen('codex');
  await page.waitForTimeout(400);
  await shot('codex');
  await noHScroll('codex');
  await click('.pocket.is-claimed');
  await page.waitForSelector('.ov .card');
  await page.waitForTimeout(500);
  await shot('codex-card', false);
  await click('.ov .cont');
  await click('.pocket.is-unsighted');
  await page.waitForSelector('.ov .card');
  await page.waitForTimeout(300);
  await shot('codex-unsighted', false);
  await click('.ov .cont');
  // the Legend Surge slam the battle screen calls
  await page.evaluate(() => { const g = window.__app.game; const it = g.inventory.find(i => i.uid === g.party.roster.warden.gear.weapon); window.__slam = window.__app.services.cardSlam(it, {}); });
  await page.waitForTimeout(550);
  await shot('card-slam', false);
  await page.evaluate(() => window.__slam);
  await click('.topbar .back');
  await waitScreen('road');

  // ---- settings: export / import round trip ----
  await click('.road-menu >> text=Settings');
  await waitScreen('settings');
  await click('button:has-text("Make a save code")');
  const code = await page.locator('.code-out textarea').inputValue();
  check(/^AETH1\./.test(code), `${V.name}: export code starts with AETH1.`);
  await click('button:has-text("Copy code")').catch(() => {});
  await page.fill('.code-in textarea', 'not a code');
  await click('button:has-text("Load this save")');
  check((await page.locator('.err').innerText()).length > 10, `${V.name}: a bad code shows clear error text`);
  await shot('settings');
  await noHScroll('settings');
  const before = await page.evaluate(() => localStorage.getItem('aethermoor.save.v1'));
  await page.fill('.code-in textarea', code);
  await click('button:has-text("Load this save")');
  await waitScreen('road');
  const after = await page.evaluate(() => localStorage.getItem('aethermoor.save.v1'));
  check(before === after, `${V.name}: the save survives an export/import round trip`);
  await click('.road-menu >> text=Settings');
  await waitScreen('settings');
  await click('.set-danger button:has-text("Start over")');
  await page.waitForTimeout(200);
  await shot('settings-confirm', false);
  await click('.confirm-box button:has-text("Keep playing")');
  await click('.topbar .back');
  await waitScreen('road');

  // ---- reload and Continue ----
  await page.reload();
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(500);
  check(await page.locator('.title-menu >> text=Continue').count() === 1, `${V.name}: Continue after reload`);
  await click('.title-menu >> text=New game');
  check(await page.locator('.title-confirm:visible').count() === 1, `${V.name}: New game over a save asks first`);
  await shot('title-continue', false);
  await click('.title-confirm >> text=Keep my journey');
  await click('.title-menu >> text=Continue');
  await waitScreen('road');
  await shot('road-continued', false);

  // keyboard: arrows move focus, Esc goes back from the party screen
  await click('.road-menu >> text=Party');
  await waitScreen('party');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await waitScreen('road');

  // ---- reduced motion: the codex card still opens and renders still ----
  await click('.road-menu >> text=Settings');
  await waitScreen('settings');
  await click('.switch:has-text("Reduced motion")');
  check(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), `${V.name}: reduced motion applies`);
  await click('.topbar .back');
  await waitScreen('road');
  await click('.road-menu >> text=Codex');
  await waitScreen('codex');
  await click('.pocket.is-claimed');
  await page.waitForSelector('.ov .card');
  await page.waitForTimeout(200);
  await shot('codex-card-reduced', false);
  await page.keyboard.press('Escape');
  await click('.topbar .back');
  await waitScreen('road');
  await click('.road-menu >> text=Settings');
  await waitScreen('settings');
  await click('.switch:has-text("Reduced motion")');
  await click('.topbar .back');
  await waitScreen('road');

  // ---- Briarmaw falls (forced): the Brand, the Waking rises, the road starts again ----
  await page.evaluate(() => {
    const g = window.__app.game;
    const cleared = {}; for (const id of ['hearth-road', 'waymarker-stones', 'bramble-toll', 'verdant-edge', 'rotstag-glade', 'tally-camp', 'snag-wallow', 'bramble-deep']) cleared[id] = true;
    window.__app.setGame({ ...g, progress: { ...g.progress, node: 'briarmaw-den', lastHearthfire: 'den-mouth', flags: { ...g.progress.flags, cleared } } });
    window.__app.go('road');
  });
  await waitScreen('road');
  await page.waitForTimeout(500);
  await shot('road-briarmaw');
  await page.evaluate(() => { window.__forceResult = { result: 'victory', xp: 770, gold: 60 }; });
  await click('.node-acts .fight');
  await waitScreen('aftermath');
  await page.waitForTimeout(2200);
  check(await page.locator('.af-brand').count() === 1, `${V.name}: Briarmaw pays out a Brand`);
  await shot('aftermath-brand');
  await click('.af-foot .btn.primary');
  await waitScreen('road');
  await page.waitForTimeout(400);
  check(await page.locator('.brand-banner').count() === 1, `${V.name}: the road shows the Waking banner`);
  await shot('road-waking', false);
  await click('.brand-banner .btn');
  check(await page.locator('.realm:has-text("Waking 1")').count() === 1, `${V.name}: the Waking is 1`);

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  if (failed.length) console.log(`  failed requests: ${failed.join(', ')}`);
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors (${real.join(' | ')})`);
  console.log(`  ${V.name}: ${real.length} console errors`);
  await context.close();
}

for (const V of VIEWPORTS) {
  try { await run(V); } catch (e) { fails.push(`${V.name}: ${e.message.split('\n')[0]}`); console.log('  ERROR', e.message); }
}
await browser.close();
console.log(fails.length ? `\nE2E FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nE2E passed');
process.exit(fails.length ? 1 : 0);
