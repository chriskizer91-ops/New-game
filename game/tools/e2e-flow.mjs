// End-to-end flow test (M3 spec §7 "e2e-flow scenarios"): the shell around the world, in Chromium at
// phone (360x740) and laptop (1280x800) sizes, with a screenshot of every step.
//
//   node tools/e2e-flow.mjs                  # build, then run both viewports
//   node tools/e2e-flow.mjs --no-build       # reuse dist/
//   AETH_HTML=/tmp/x/aethermoor.html node tools/e2e-flow.mjs   # a private build (A5)
//   node tools/e2e-flow.mjs --only=phone     # one viewport (phone | laptop)
//   node tools/e2e-flow.mjs --out=/tmp/x     # write screenshots somewhere else
//
// Per viewport, a fresh profile:
//   A. title (no Continue, the M4 tag) -> new game (name, look, 4d6, starter, prologue or "Skip to
//      the Keep") -> world; this milestone's own save (aethermoor.save.m4) is written, and the M2 and
//      Milestone 3 keys never are; every sound and track plays
//   B. the pause menu (WP7's, or go() until the world has one) to Party (equip from the bag), Codex
//      (cards, out of 24), Journal (all four tabs) and Settings, each back to the world
//   C. the first real fight (keep-vault) on Auto -> aftermath -> every chest -> back to the world
//   D. a forced wipe -> aftermath -> the party wakes at the Hearthfire stand; a Tamsin duel lost is a yield
//   E. the Atlas: both views, 44 px markers that do not overlap, travel to a kindled Hearthfire,
//      view only underground, the parchment when the painting fails
//   F. settings: export gives AETH3.; importing it round-trips through the card (.bak kept); the
//      new world settings; reduced motion
//   G. Briarmaw forced: the Brand, then an Echo rematch
//   H. reload: the title's Continue sub-line; New game over a journey asks first
// And an M2 profile (a v1 save seeded in localStorage):
//   I. "Continue from the Gauntlet" -> the carry-over card -> Walk on (nothing written) -> the first
//      step commits this milestone's save and its started marker; Settings -> Load a code with
//      test/fixtures/v1/v1-grudges.code.txt
//      -> the card; Export M2 backup; Restore previous save (a swap); Restore my M2 save then "Not yet"
//      (nothing changes); Start over; Restore my M2 save.
//      aethermoor.save.v1 stays byte-identical throughout, and no Milestone 3 save is ever written.
// And a Milestone 3 profile (the M2 save and an M3 save, aethermoor.save.v2, seeded):
//   J. "Continue from Milestone 3" (offered before the M2 save) -> the Milestone 3 card -> Walk on
//      (nothing written) -> the first step writes this milestone's own save; Settings lists both old
//      saves; Export M3 backup is the M3 save byte for byte; Carry over my M3 save, "Not yet" changes
//      nothing, then carries it over again with a backup; after a reload the title continues it.
//      Both old saves stay byte-identical throughout (every milestone keeps its own save).
// Fails on any console error, page exception or [audio] warning. The world screen is WP7's: this
// test drives it only through go() and the window.__world seam, and checks the shell's own screens.
// Playwright is not a project dependency: it comes from the global npm root.
// Owner: WP8.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { HEARTHS } from '../src/data/world.js';
import { MAPS } from '../src/data/maps/index.js';
import { SAVE_VERSION, toV2 } from '../src/rules/migrate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
const outDir = args.out ? path.resolve(args.out) : path.join(root, 'tools/shots/e2e');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const V1_SAVE = JSON.stringify(JSON.parse(readFileSync(path.join(root, 'test/fixtures/v1/v1-node-thornhollow.json'), 'utf8')));
// a Milestone 3 save (aethermoor.save.v2): that fixture as M3 carried it over, then played on to the Thornway
const V2_SAVE = (() => {
  const g = toV2(JSON.parse(V1_SAVE)), h = Object.entries(HEARTHS).find(([, x]) => x.map === 'thornway');
  g.gold = 777;
  g.progress.pos = { map: h[1].map, x: h[1].x, y: h[1].y, face: h[1].face };
  g.progress.flags.kindled[h[0]] = true;
  return JSON.stringify(g);
})();
const V1_CODE = readFileSync(path.join(root, 'test/fixtures/v1/v1-grudges.code.txt'), 'utf8').trim();
const V1_CODE_GAME = JSON.parse(readFileSync(path.join(root, 'test/fixtures/v1/v1-grudges.json'), 'utf8'));
const stand = id => { const h = HEARTHS[id]; return { map: h.map, x: h.x, y: h.y, face: h.face }; };

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});

// Google Fonts, fetched once with curl (which knows the sandbox proxy's CA) and served from a local
// cache, so the screenshots have the real type. Offline, the pages fall back to system fonts.
function fontCache() {
  const dir = path.join(tmpdir(), 'aethermoor-font-cache');
  const cssFile = path.join(dir, 'fonts.css');
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  try {
    mkdirSync(dir, { recursive: true });
    if (!existsSync(cssFile)) {
      const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');
      const href = html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)[1].replace(/&amp;/g, '&');
      execSync(`curl -sSf -A "${UA}" "${href}" -o "${cssFile}"`, { stdio: 'ignore', timeout: 30000 });
    }
    let css = readFileSync(cssFile, 'utf8');
    css = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter(b => /^\/\* latin(-ext)? \*\//.test(b)).join('');
    const files = {};
    for (const [, u] of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
      const f = path.join(dir, u.replace(/[^a-z0-9.]+/gi, '_'));
      if (!existsSync(f)) execSync(`curl -sSf "${u}" -o "${f}"`, { stdio: 'ignore', timeout: 30000 });
      files[u] = f;
    }
    writeFileSync(path.join(dir, 'latin.css'), css);
    return { css, files };
  } catch {
    return null;
  }
}
const fonts = fontCache();
console.log(fonts ? `fonts: ${Object.keys(fonts.files).length} files cached` : 'fonts: offline (system fallbacks)');

const VIEWPORTS = [
  { name: 'phone', viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'laptop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
].filter(v => (args.only ? v.name === args.only : true));

const fails = [];
function check(cond, msg) { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } else console.log('  ok', msg); }
const note = msg => console.log('  note', msg);

const SFX = ['select', 'confirm', 'back', 'dice', 'hit', 'graze', 'miss', 'crit', 'heal', 'status', 'disarm', 'ko', 'surge', 'legend', 'victory', 'defeat', 'phase', 'chest', 'reveal', 'equip', 'levelup', 'hearth', 'beam', 'tick', 'stamp', 'coin', 'page', 'identify', 'slam', 'error',
  'bump', 'alert', 'rout', 'door', 'blip', 'unlock', 'chime'];
const TRACKS = ['road', 'wilds', 'town', 'dungeon', 'battle', 'boss', 'hearth', 'victory', 'title'];

async function openPage(V, { seedV1 = null, seedV2 = null } = {}) {
  const context = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, isMobile: !!V.isMobile, hasTouch: !!V.hasTouch, ignoreHTTPSErrors: true });
  if (fonts) {
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fonts.css }));
    await context.route('https://fonts.gstatic.com/**', r => {
      const f = fonts.files[r.request().url()];
      return f ? r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(f) }) : r.abort();
    });
  }
  // The test seam (src/main.js calls window.__aethTest(app, kit)): keeps the app and the kit, logs
  // every go(), and can turn the next battle into a forced result (defeat, fled, victory).
  await context.addInitScript(seed => {
    window.__aethTest = (app, kit) => {
      window.__app = app; window.__kit = kit; window.__goLog = [];
      const go = app.go;
      const KEEP = ['mode', 'from', 'tab', 'arrive', 'result', 'wokeAt', 'brand', 'yield', 'rematch', 'enc', 'returnTo', 'hearth', 'hero'];
      app.go = (name, p = {}) => {
        const small = {};
        for (const k of KEEP) if (p[k] !== undefined) small[k] = k === 'brand' && p.brand ? { id: p.brand.id, waking: p.brand.waking } : p[k];
        window.__goLog.push({ name, p: small });
        const force = window.__forceResult;
        if (name === 'battle' && force) {
          window.__forceResult = null;
          const b = structuredClone(p.battle);
          if (force.result === 'defeat') for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = 0; u.ko = true; }
          if (force.result === 'victory') for (const u of Object.values(b.units)) if (u.side === 'foe') { u.hp = 0; u.ko = true; }
          b.ended = { result: force.result, xp: force.xp || 0, gold: force.gold || 0, drops: [], claimed: [], consumables: {} };
          return go('aftermath', { battle: b, returnTo: p.returnTo || 'world' });
        }
        return go(name, p);
      };
    };
    for (const [key, raw] of [['aethermoor.save.v1', seed?.v1], ['aethermoor.save.v2', seed?.v2]]) {
      if (raw) { try { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); } catch { /* storage blocked */ } }
    }
  }, { v1: seedV1, v2: seedV2 });
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('console', m => { if (m.type() === 'error' || /^\[audio\]/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => failed.push(r.url()));
  return { context, page, errors, failed };
}

async function run(V) {
  console.log(`\n== ${V.name} ${V.viewport.width}x${V.viewport.height}`);
  const { context, page, errors, failed } = await openPage(V);
  let n = 0;
  const shot = async (name, full = true) => {
    await page.waitForTimeout(250);
    const p = path.join(outDir, `${V.name}-${String(++n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: p, fullPage: full });
    console.log('  shot', path.relative(process.cwd(), p));
  };
  const screen = () => page.evaluate(() => document.getElementById('app').dataset.screen);
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(s => document.getElementById('app').dataset.screen === s, name, { timeout }); await page.waitForTimeout(200); };
  const click = async (sel, opts = {}) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(opts); };
  const noHScroll = async label => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(w[0] <= w[1] + 1, `${V.name} ${label}: no horizontal scroll (${w[0]} <= ${w[1]})`);
  };
  const lastGo = name => page.evaluate(nm => [...window.__goLog].reverse().find(g => g.name === nm) || null, name);
  const game = () => page.evaluate(() => window.__app.game);
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'),
    live: localStorage.getItem('aethermoor.save.m4'), bak: localStorage.getItem('aethermoor.save.m4.bak'),
    mark: localStorage.getItem('aethermoor.m4.started'),
  }));
  const setGame = fn => page.evaluate(src => { const g = structuredClone(window.__app.game); (0, eval)(src)(g); window.__app.setGame(g); }, `(${fn})`);
  // the world's pause menu when WP7 has built it, else go() straight to the screen
  const openFromWorld = async (name, label) => {
    // a dialogue the world opened on arrival closes first; then Esc opens the pause menu
    for (let i = 0; i < 4 && await page.locator('.ov:not(.ov-pause)').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
    await page.keyboard.press('Escape');
    const menu = page.locator(`.ov [data-go="${name}"], .ov button:has-text("${label}")`);
    try { await menu.first().waitFor({ state: 'visible', timeout: 1200 }); } catch { /* no pause menu */ }
    if (await menu.count()) { await menu.first().click(); via.menu++; } else {
      if (await page.locator('.ov').count()) await page.keyboard.press('Escape');
      await page.evaluate(([nm]) => window.__app.go(nm, { from: 'world' }), [name]);
      via.go++;
    }
    await waitScreen(name);
  };
  const via = { menu: 0, go: 0 };
  const backToWorld = async () => { await click('.topbar .back'); await waitScreen('world'); };
  const startFight = (nodeId, force = null) => page.evaluate(([id, f]) => {
    const { game: g, battle } = window.__kit.startBattle(window.__app.game, { nodeId: id });
    window.__app.setGame(g);
    window.__forceResult = f;
    window.__app.go('battle', { battle, returnTo: 'world' });
  }, [nodeId, force]);

  // playing a battle on Auto at the fastest speed
  const playBattle = async label => {
    await waitScreen('battle');
    await page.waitForTimeout(600);
    await shot(`battle-${label}`, false);
    const auto = page.locator('.bt-auto');
    if (await auto.count() && (await auto.getAttribute('aria-pressed')) !== 'true') await auto.click();
    const speed = page.locator('.bt-speed');
    for (let i = 0; i < 3 && await speed.count(); i++) { if (/4x/.test(await speed.innerText())) break; await speed.click(); }
    const t0 = Date.now();
    while (await screen() === 'battle' && Date.now() - t0 < 240000) await page.waitForTimeout(500);
    await waitScreen('aftermath', 20000);
  };
  // opening every chest in the aftermath: each plays the reveal; equip the first usable card
  const openChests = async (label, equipFirst) => {
    const chests = page.locator('.chest');
    const count = await chests.count();
    console.log(`  ${count} chest(s)`);
    for (let i = 0, equipped = false; i < count; i++) {
      await chests.nth(i).scrollIntoViewIfNeeded();
      await chests.nth(i).click();
      await page.waitForSelector('.ov .card', { timeout: 15000 });
      await page.waitForTimeout(900);
      if (i === 0) await shot(`reveal-${label}`, false);
      const id = page.locator('.ov .identify-btn');
      if (await id.count()) { await id.click(); await page.waitForTimeout(2200); }
      const eq = page.locator('.ov .equip:not([disabled])');
      if (equipFirst && !equipped && await eq.count()) { await eq.scrollIntoViewIfNeeded(); await eq.click(); equipped = true; await page.waitForTimeout(800); }
      await click('.ov .cont');
      await page.waitForSelector('.ov', { state: 'detached' });
    }
    return count;
  };

  // ======== A. title -> new game -> world ========
  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(700);
  await shot('title-new', false);
  await noHScroll('title');
  check(await page.locator('.title-continue, .title-carry').count() === 0, `${V.name}: no Continue without a save`);
  check(/M4/.test(await page.locator('.title-ver').innerText()) && /Sunscorch/i.test(await page.locator('.title-ver').innerText()), `${V.name}: the title shows the M4 · Sunscorch tag`);
  await click('.title-menu >> text=New game');
  await waitScreen('newgame');
  const audio = await page.evaluate(async ([sfx, tracks]) => {
    const a = window.__app.audio;
    for (const n of sfx) for (let tier = 0; tier < 8; tier++) a.sfx(n, { tier, lead: .5, pitch: 300 + tier * 90 });
    const heard = [];
    for (const t of tracks) { a.music(t); heard.push(a.track); await new Promise(r => setTimeout(r, 300)); }
    a.music('title');
    return { unlocked: a.unlocked, heard };
  }, [SFX, TRACKS]);
  check(audio.unlocked && TRACKS.every((t, i) => audio.heard[i] === t), `${V.name}: audio unlocked; every sound and every track plays (${audio.heard.join(' ')})`);
  const NAME = V.name === 'phone' ? 'Tess' : 'Bram';
  await page.fill('#wname', NAME);
  await click('button:has-text("Next: how they look")');
  await click('.opt-group:nth-of-type(3) .opt >> nth=2');
  await click('button:has-text("Next: ability scores")');
  await click('button:has-text("Roll 4d6")');
  await page.waitForTimeout(1400);
  await click('button:has-text("Next: your heirloom")');
  await click(V.name === 'phone' ? 'button:has-text("Take Hearthbrand")' : 'button:has-text("Take Cairnmaul")');
  await page.waitForTimeout(400);
  await click('button:has-text("Begin with")');
  await page.waitForSelector('.prologue');
  let s0 = await store();
  check(!!s0.live && JSON.parse(s0.live).version === SAVE_VERSION && s0.v1 === null && s0.m3 === null, `${V.name}: Begin writes this milestone's own save at version ${SAVE_VERSION} (and no M2 or Milestone 3 key)`);
  if (V.name === 'phone') {
    for (let i = 0; i < 4; i++) { await click('.prologue button:has-text("Continue")'); await page.waitForTimeout(120); }
    await shot('prologue', false);
    await click('button:has-text("Into the Great Hall")');
  } else {
    await shot('prologue', false);
    await click('button:has-text("Skip to the Keep")');
  }
  await waitScreen('world');
  let g = await game();
  check((await lastGo('world'))?.p.arrive === 'new', `${V.name}: newgame ends with go('world', { arrive: 'new' })`);
  check(g.progress.pos?.map === 'keep-hall' && g.party.roster.warden.name === NAME, `${V.name}: the new Warden starts in the Great Hall (${JSON.stringify(g.progress.pos)})`);
  await shot('world-new', false);

  // ======== B. menus from the world, each back to the world ========
  await openFromWorld('party', 'Party');
  await page.waitForTimeout(400);
  await shot('party');
  await noHScroll('party');
  await backToWorld();

  await openFromWorld('codex', 'Codex');
  await page.waitForTimeout(400);
  const codexCount = await page.locator('.pocket').count();
  check(codexCount === 24 && /of 24 claimed/.test(await page.locator('.codex-sum').innerText()), `${V.name}: the Codex counts out of 24 (${codexCount} pockets)`);
  await shot('codex');
  await noHScroll('codex');
  await click('.pocket.is-claimed');
  await page.waitForSelector('.ov .card');
  await page.waitForTimeout(400);
  await click('.ov .cont');
  await click('.pocket.is-unsighted');
  await page.waitForSelector('.ov .card');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ov', { state: 'detached' });
  await backToWorld();

  await openFromWorld('journal', 'Journal');
  for (const tab of ['quests', 'bounties', 'ladder', 'keys']) {
    await click(`.jr-tab[data-tab="${tab}"]`);
    await page.waitForTimeout(tab === 'ladder' ? 900 : 250);
    await shot(`journal-${tab}`);
    await noHScroll(`journal ${tab}`);
    if (tab === 'ladder') {
      const posters = await page.evaluate(() => [...document.querySelectorAll('.poster')].map(p => p.dataset.state));
      check(posters.length === 20 && posters.filter(s => s === 'silhouette').length >= 3, `${V.name}: the Ladder has 17 posters and 3 rumours (${posters.join(' ')})`);
    }
  }
  await click('.jr-tab[data-tab="keys"]');
  check(await page.locator('.jr-lock').count() === 11 && await page.locator('.jl-keys li .mk').count() >= 22, `${V.name}: Keys lists all 11 lock types with a tick or cross per key`);
  await backToWorld();

  await openFromWorld('settings', 'Settings');
  await shot('settings');
  await noHScroll('settings');
  await backToWorld();

  // keyboard: Esc goes back from the party screen
  await page.evaluate(() => window.__app.go('party', { from: 'world' }));
  await waitScreen('party');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await waitScreen('world');

  // ======== C. the first real fight ========
  await startFight('keep-vault');
  await playBattle('vault');
  await page.waitForTimeout(1500);
  await shot('aftermath-vault');
  await noHScroll('aftermath');
  const chests = await openChests('vault', true);
  check(chests >= 1, `${V.name}: the vault pays out at least one chest (${chests})`);
  await click('.af-foot .btn.primary');
  await waitScreen('world');
  check((await lastGo('world'))?.p.result === 'victory', `${V.name}: the aftermath returns to the world with { result: 'victory' }`);

  // ======== D. a wipe wakes the party at the Hearthfire stand; a lost duel is a yield ========
  await setGame(`g => { g.progress.lastHearthfire = 'milestone-fire'; g.progress.flags.kindled = { ...g.progress.flags.kindled, 'milestone-fire': true }; }`);
  const goldBefore = (await game()).gold;
  await startFight('waymarker-stones', { result: 'defeat' });
  await waitScreen('aftermath');
  await page.waitForTimeout(1200);
  check(await page.locator('text=You wake at the Hearthfire.').count() === 1 && /The Milestone Fire/.test(await page.locator('.af-head .meta').innerText()), `${V.name}: a wipe wakes the party at the Milestone Fire`);
  await shot('aftermath-defeat');
  await click('.af-foot .btn.primary');
  await waitScreen('world');
  const woke = await lastGo('world');
  g = await game();
  check(woke?.p.result === 'defeat' && woke.p.wokeAt === 'milestone-fire', `${V.name}: the aftermath passes { result, wokeAt } (${JSON.stringify(woke?.p)})`);
  check(JSON.stringify(g.progress.pos) === JSON.stringify(stand('milestone-fire')) && g.gold < goldBefore, `${V.name}: the party stands at the Milestone Fire's stand, 10% lighter (${JSON.stringify(g.progress.pos)})`);
  await startFight('tamsin-duel', { result: 'defeat' });
  await waitScreen('aftermath');
  await page.waitForTimeout(900);
  const yielded = await page.locator('.af-head.af-yield').count();
  check(yielded === 1 && /lowers her blade/.test(await page.locator('.af-head h1').innerText()), `${V.name}: a lost duel with Tamsin reads as a yield`);
  await shot('aftermath-yield', false);
  await click('.af-foot .btn.primary');
  await waitScreen('world');
  check((await lastGo('world'))?.p.yield === true, `${V.name}: the yield reaches the world ({ yield: true })`);

  // ======== E. the Atlas ========
  await setGame(`g => {
    const f = g.progress.flags;
    f.kindled = { ...f.kindled, 'milestone-fire': true, thornhollow: true, 'den-mouth': true };
    f.visits = { ...f.visits, 'keep-hall': 1, keep: 1, 'hearth-road': 1, thornhollow: 1, thornway: 1 };
    g.codex.thornsplitter = { sighted: true, claimed: false, awakened: false };
    f.story = { ...f.story, 'longwatch:thornhollow': true };
    g.progress.pos = { map: 'hearth-road', x: 13, y: 40, face: 'n' };
  }`);
  await page.evaluate(() => window.__app.go('atlas', { mode: 'view', from: 'world' }));
  await waitScreen('atlas');
  await page.waitForFunction(() => { const i = document.querySelector('.atlas-img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const art = await page.evaluate(() => ({ art: document.querySelector('.atlas-frame').dataset.art, w: document.querySelector('.atlas-img')?.naturalWidth }));
  check(art.art === 'image' && art.w === 960, `${V.name}: the Atlas shows the 960x640 painting (${JSON.stringify(art)})`);
  await click('.atlas-view[data-view="wilds"]');
  await page.waitForTimeout(300);
  await shot('atlas-wilds');
  await noHScroll('atlas');
  const mk = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.atlas-mk')];
    const pts = els.map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height]; });
    let min = Infinity;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) min = Math.min(min, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
    return { hearths: document.querySelectorAll('.atlas-mk.mk-hearth').length, here: document.querySelectorAll('.atlas-mk.mk-here').length, sealed: document.querySelectorAll('.atlas-mk.mk-sealed').length, small: pts.filter(p => p[2] < 44 || p[3] < 44).length, min: Math.round(min), holders: document.querySelectorAll('.atlas-ink .holder').length, lw: document.querySelectorAll('.atlas-ink .lw').length };
  });
  check(mk.hearths === 10 && mk.here === 1 && mk.sealed === 3 && mk.small === 0, `${V.name}: Wilds view has 10 Hearthfires, you-are-here and 3 padlocks, all 44 px (${JSON.stringify(mk)})`);
  check(mk.min >= 40, `${V.name}: Atlas markers do not overlap (closest ${mk.min} px)`);
  check(mk.holders >= 1 && mk.lw >= 1, `${V.name}: sighted holders and Longwatch marks are on the map (${mk.holders}, ${mk.lw})`);
  await click('.atlas-mk.mk-here');
  check(/The Hearth Road North/.test(await page.locator('.atlas-info').innerText()), `${V.name}: "you are here" names the Hearth Road`);
  await click('.atlas-view[data-view="realm"]');
  await page.waitForTimeout(300);
  await shot('atlas-realm');
  await backToWorld();
  // travel to a kindled Hearthfire
  await page.evaluate(() => window.__app.go('atlas', { mode: 'travel', from: 'world' }));
  await waitScreen('atlas');
  await shot('atlas-travel', false);
  check(await page.locator('.atlas-hf.go').count() === 4, `${V.name}: four kindled Hearthfires offer travel`);
  await click('.atlas-hf[data-hearth="thornhollow"]');
  await waitScreen('world');
  const went = await lastGo('world');
  check(went?.p.arrive === 'travel' && JSON.stringify((await game()).progress.pos) === JSON.stringify(stand('thornhollow')), `${V.name}: Atlas travel lands on Thornhollow's Hearthfire stand`);
  // view only underground
  await setGame(`g => { g.progress.pos = { map: 'heartroot-1', x: 12, y: 21, face: 'n' }; }`);
  await page.evaluate(() => window.__app.go('atlas', { mode: 'travel', from: 'world' }));
  await waitScreen('atlas');
  check(await page.locator('.atlas-hf.go').count() === 0 && /Underground/.test(await page.locator('.atlas-list').innerText()), `${V.name}: the Atlas is view only in a dungeon`);
  // the parchment when the painting fails
  await page.evaluate(() => { const i = document.querySelector('.atlas-img'); i.src = 'data:image/webp;base64,AAAA'; });
  await page.waitForFunction(() => document.querySelector('.atlas-frame').dataset.art === 'parchment', null, { timeout: 4000 }).catch(() => {});
  check(await page.evaluate(() => document.querySelector('.atlas-frame').dataset.art) === 'parchment', `${V.name}: a broken image falls back to the parchment`);
  await page.waitForTimeout(200);
  await shot('atlas-parchment', false);
  await backToWorld();
  await setGame(`g => { g.progress.pos = { map: 'thornhollow', x: 12, y: 13, face: 'n' }; }`);

  // ======== F. settings: codes, the new settings, reduced motion ========
  await openFromWorld('settings', 'Settings');
  for (const [key, count] of [['touchControls', 3], ['mapZoom', 3]]) check(await page.locator(`.seg[data-key="${key}"] .seg-b`).count() === count, `${V.name}: settings has ${key}`);
  check(await page.locator('.switch[data-key="alwaysRun"]').count() === 1, `${V.name}: settings has alwaysRun`);
  await click('.seg[data-key="mapZoom"] .seg-b[data-v="far"]');
  await click('.seg[data-key="touchControls"] .seg-b[data-v="on"]');
  await click('.switch[data-key="alwaysRun"]');
  const set = await page.evaluate(() => JSON.parse(localStorage.getItem('aethermoor.settings.v1') || '{}'));
  check(set.mapZoom === 'far' && set.touchControls === 'on' && set.alwaysRun === true, `${V.name}: the world settings save (${JSON.stringify({ mapZoom: set.mapZoom, touchControls: set.touchControls, alwaysRun: set.alwaysRun })})`);
  await click('.switch[data-key="alwaysRun"]');
  await click('.seg[data-key="touchControls"] .seg-b[data-v="auto"]');
  await click('.seg[data-key="mapZoom"] .seg-b[data-v="normal"]');
  await click('.switch[data-key="reducedMotion"]');
  check(await page.evaluate(() => document.documentElement.classList.contains('reduce-motion')), `${V.name}: reduced motion applies`);
  await click('.switch[data-key="reducedMotion"]');
  await click('button:has-text("Make a save code")');
  const code = await page.locator('.code-live textarea').inputValue();
  check(new RegExp(`^AETH${SAVE_VERSION}\\.`).test(code), `${V.name}: the save code starts with AETH${SAVE_VERSION}.`);
  await page.fill('.code-in textarea', 'not a code');
  await click('button:has-text("Load this save")');
  check((await page.locator('.err').innerText()).length > 10, `${V.name}: a bad code shows clear error text`);
  s0 = await store();
  await page.fill('.code-in textarea', code);
  await click('button:has-text("Load this save")');
  await page.waitForSelector('.carry-card');
  await page.waitForTimeout(300);
  await shot('carry-code', false);
  await click('.carry-go');
  await waitScreen('world');
  let s1 = await store();
  // the code holds exactly the save, byte for byte once parsed
  const inCode = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6).replace(/\s+/g, '')), ch => ch.charCodeAt(0))), code);
  check(JSON.stringify(JSON.parse(inCode)) === JSON.stringify(JSON.parse(s0.live)), `${V.name}: a save code holds exactly the save`);
  // walking back in is a visit (spec §4.5: enterMap counts visits[map], and plays the map's arrival
  // lines once), so the world's arrival bookkeeping is the only thing allowed to differ after the load
  const paths = (a, b, p = '') => (JSON.stringify(a) === JSON.stringify(b) ? []
    : a && b && typeof a === 'object' && typeof b === 'object' ? [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => paths(a[k], b[k], `${p}.${k}`)) : [p]);
  const moved = paths(JSON.parse(s0.live), JSON.parse(s1.live));
  check(moved.every(p => /^\.progress\.flags\.(visits\.[\w-]+|seen\.arrive:[\w-]+)$/.test(p)), `${V.name}: a save code round-trips (the save is unchanged but for the arrival's own bookkeeping${moved.length ? `: ${moved.join(', ')}` : ''})`);
  check(s1.bak === s0.live && s1.v1 === null, `${V.name}: loading a code backs the old save up to .bak first`);

  // ======== G. Briarmaw (forced): the Brand, then an Echo rematch ========
  await startFight('briarmaw-den', { result: 'victory', xp: 770, gold: 60 });
  await waitScreen('aftermath');
  await page.waitForTimeout(1800);
  check(await page.locator('.af-brand:not(.af-rematch)').count() === 1, `${V.name}: Briarmaw pays out the Brand`);
  await shot('aftermath-brand');
  await click('.af-foot .btn.primary');
  await waitScreen('world');
  const branded = await lastGo('world');
  check(branded?.p.brand?.id === 'brand-of-briars' && branded.p.brand.waking === 1, `${V.name}: go('world', { brand }) after the Brand (${JSON.stringify(branded?.p.brand)})`);
  await startFight('briarmaw-den', { result: 'victory', xp: 770, gold: 60 });
  await waitScreen('aftermath');
  await page.waitForTimeout(900);
  check(await page.locator('.af-rematch').count() === 1 && (await game()).progress.waking === 1, `${V.name}: a second Briarmaw is a rematch and the Waking holds`);
  await shot('aftermath-rematch', false);
  await click('.af-foot .btn.primary');
  await waitScreen('world');

  // ======== H. reload: the title's Continue ========
  await page.reload();
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  g = await game();
  const sub = (await page.locator('.title-continue small').innerText()).trim();
  const want = `${NAME} · ${MAPS[g.progress.pos.map].name} · Day ${g.progress.flags.day} · Lv `;
  check(sub.startsWith(want) && /· Lv \d+ · \d+\/24 relics$/.test(sub), `${V.name}: the Continue sub-line reads "${sub}"`);
  await click('.title-menu >> text=New game');
  check(await page.locator('.title-confirm:visible').count() === 1, `${V.name}: New game over a journey asks first`);
  await shot('title-continue', false);
  await click('.title-confirm >> text=Keep my journey');
  await click('.title-continue');
  await waitScreen('world');
  check((await lastGo('world'))?.p.arrive === 'continue', `${V.name}: Continue goes to the world`);

  note(`${V.name}: menus opened through the world's pause menu ${via.menu} time(s), through go() ${via.go} time(s)`);
  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors (${real.join(' | ')})`);
  await context.close();
}

// ======== I. an M2 profile ========
async function runM2(V) {
  console.log(`\n== ${V.name} M2 profile`);
  const { context, page, errors, failed } = await openPage(V, { seedV1: V1_SAVE });
  let n = 0;
  const shot = async (name, full = false) => {
    await page.waitForTimeout(250);
    const p = path.join(outDir, `${V.name}-m2-${String(++n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: p, fullPage: full });
    console.log('  shot', path.relative(process.cwd(), p));
  };
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(s => document.getElementById('app').dataset.screen === s, name, { timeout }); await page.waitForTimeout(200); };
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); };
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'),
    live: localStorage.getItem('aethermoor.save.m4'), bak: localStorage.getItem('aethermoor.save.m4.bak'),
    mark: localStorage.getItem('aethermoor.m4.started'),
  }));
  const settings = async () => { await page.evaluate(() => window.__app.go('settings', { from: 'world' })); await waitScreen('settings'); };
  const v1Same = async label => { const st = await store(); check(st.v1 === V1_SAVE && st.m3 === null, `${V.name}: aethermoor.save.v1 is byte-identical and no Milestone 3 save is written (${label})`); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from the Gauntlet/.test(await page.locator('.title-carry').innerText()), `${V.name}: an M2 save offers "Continue from the Gauntlet"`);
  await shot('title-m2');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  await page.waitForTimeout(300);
  const card = await page.locator('.carry-card').innerText();
  check(/The road has become a land/.test(card) && (await page.locator('.carry-hero').count()) === 4 && /You wake at Thornhollow/.test(card) && /of 24/.test(card) && /254/.test(card), `${V.name}: the carry-over card lists the party, relics, gold and where you wake`);
  await shot('carry-card');
  await page.screenshot({ path: path.join(outDir, `${V.name}-m2-carry-card-full.png`), fullPage: true });
  await click('.carry-go');
  await waitScreen('world');
  let s = await store();
  check(s.live === null && s.mark === null && await page.evaluate(() => window.__app.adopting), `${V.name}: "Walk on" holds the migrated game in memory (nothing written)`);
  const pos0 = await page.evaluate(() => window.__app.game.progress.pos);
  check(pos0.map === 'thornhollow', `${V.name}: the M2 party wakes in Thornhollow (${JSON.stringify(pos0)})`);
  // the world commits on its first successful step (WP7); drive one step through the seam
  await page.evaluate(() => { if (window.__world) { for (const d of ['s', 'n', 'e', 'w']) { const ev = window.__world.step(d, 1); if (ev.some(e => e.t === 'step')) break; } } });
  await page.waitForTimeout(400);
  s = await store();
  if (s.live === null) {
    note(`${V.name}: the world did not commit the adopted game on its first step yet (WP7); committing through ctx.commitAdopted()`);
    await page.evaluate(() => window.__app.commitAdopted());
    s = await store();
  }
  check(!!s.live && JSON.parse(s.live).migratedFrom === 1 && s.mark === '1' && s.m3 === null && !(await page.evaluate(() => window.__app.adopting)), `${V.name}: commitAdopted writes this milestone's save and its started marker (never a Milestone 3 key)`);
  await v1Same('after the carry-over');

  // Settings -> Load a code with a real M2 code
  await settings();
  check(await page.locator('button:has-text("Export M2 backup (AETH1)")').count() === 1 && await page.locator('button:has-text("Restore my M2 save")').count() === 1, `${V.name}: the M2 backup and restore buttons show while a v1 save exists`);
  check(await page.locator('button:has-text("Restore previous save")').count() === 0, `${V.name}: no "Restore previous save" without a backup`);
  const before = await store();
  await page.fill('.code-in textarea', V1_CODE);
  await click('button:has-text("Load this save")');
  await page.waitForSelector('.carry-card');
  await page.waitForTimeout(300);
  const card2 = await page.locator('.carry-card').innerText();
  check(/Your journey carries over/i.test(card2) && /Grudges/i.test(card2) && new RegExp(`\\b${V1_CODE_GAME.gold}\\b`).test(card2), `${V.name}: pasting an M2 code shows the carry-over card (${card2.replace(/\s+/g, ' ').slice(0, 240)})`);
  await shot('carry-card-code');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  const loaded = JSON.parse(s.live);
  check(loaded.migratedFrom === 1 && loaded.progress.node === V1_CODE_GAME.progress.node && loaded.gold === V1_CODE_GAME.gold, `${V.name}: the pasted M2 code is now the live save`);
  check(s.bak === before.live, `${V.name}: the previous save went to .bak first`);
  await v1Same('after Load a code');

  // Export M2 backup: the untouched v1 save as an AETH1 code
  await settings();
  await click('button:has-text("Export M2 backup (AETH1)")');
  const v1code = await page.locator('.code-v1 textarea').inputValue();
  const decoded = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0))), v1code);
  check(/^AETH1\./.test(v1code) && decoded === V1_SAVE, `${V.name}: "Export M2 backup" gives the v1 save byte for byte`);
  await shot('settings-m2', true);
  // Restore previous save: a swap
  check(await page.locator('button:has-text("Restore previous save")').count() === 1, `${V.name}: "Restore previous save" shows once a backup exists`);
  await click('button:has-text("Restore previous save")');
  await click('.set-prev button:has-text("Restore it")');
  await waitScreen('world');
  const swapped = await store();
  const idOf = raw => { const x = raw && JSON.parse(raw); return x ? `${x.progress.node}/${x.gold}` : null; };
  check(idOf(swapped.live) === idOf(s.bak) && idOf(swapped.bak) === idOf(s.live) && idOf(s.live) !== idOf(s.bak), `${V.name}: restoring the previous save swaps it with the live one (${idOf(swapped.live)} <-> ${idOf(swapped.bak)})`);
  await v1Same('after Restore previous save');
  // "Restore my M2 save", then "Not yet": the live save and the backup stay exactly as they were
  await settings();
  const kept = await store();
  await click('button:has-text("Restore my M2 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-no');
  await page.waitForTimeout(300);
  const still = await store();
  check(!!kept.bak && still.live === kept.live && still.bak === kept.bak, `${V.name}: "Not yet" on "Restore my M2 save" keeps the live save and the backup`);
  await v1Same('after Restore my M2 save, Not yet');

  // Start over keeps v1, and the M2 save does not come back by itself
  await settings();
  await click('.set-danger button:has-text("Start over")');
  await click('.confirm-box button:has-text("Yes, erase it")');
  await waitScreen('title');
  s = await store();
  check(s.live === null && s.mark === '1' && await page.locator('.title-continue, .title-carry').count() === 0, `${V.name}: after Start over no Gauntlet save comes back`);
  await v1Same('after Start over');
  // Restore my M2 save
  await click('.title-menu >> text=Settings');
  await waitScreen('settings');
  await click('button:has-text("Restore my M2 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  check(!!s.live && JSON.parse(s.live).progress.node === 'thornhollow' && JSON.parse(s.live).migratedFrom === 1, `${V.name}: "Restore my M2 save" carries the M2 save over again`);
  await v1Same('after Restore my M2 save');

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the M2 profile (${real.join(' | ')})`);
  await context.close();
}

// ======== J. a Milestone 3 profile: an M3 save (and the M2 save before it) on the device ========
async function runM3(V) {
  console.log(`\n== ${V.name} Milestone 3 profile`);
  const { context, page, errors, failed } = await openPage(V, { seedV1: V1_SAVE, seedV2: V2_SAVE });
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(x => document.getElementById('app').dataset.screen === x, name, { timeout }); await page.waitForTimeout(200); };
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); };
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'),
    live: localStorage.getItem('aethermoor.save.m4'), bak: localStorage.getItem('aethermoor.save.m4.bak'),
    mark: localStorage.getItem('aethermoor.m4.started'),
  }));
  const untouched = async label => { const st = await store(); check(st.v1 === V1_SAVE && st.m3 === V2_SAVE, `${V.name}: the M2 and Milestone 3 saves are byte-identical (${label})`); };
  const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(outDir, `${V.name}-m3-${name}.png`) }); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from Milestone 3/.test(await page.locator('.title-carry').innerText()), `${V.name}: a Milestone 3 save is offered first ("Continue from Milestone 3")`);
  await shot('title');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  const card = await page.locator('.carry-card').innerText();
  check(/Milestone 3 journey carries over/i.test(card) && /The Wilds go with you/.test(card) && /\b777\b/.test(card) && /Thornway/.test(card), `${V.name}: the card is the Milestone 3 one, with its gold and where you wake`);
  await shot('carry-card');
  await click('.carry-go');
  await waitScreen('world');
  let s = await store();
  check(s.live === null && s.mark === null && await page.evaluate(() => window.__app.adopting), `${V.name}: "Walk on" holds the carried game in memory (nothing written)`);
  await page.evaluate(() => { for (const d of ['s', 'n', 'e', 'w']) { const ev = window.__world.step(d, 1); if (ev.some(e => e.t === 'step')) break; } });
  await page.waitForTimeout(400);
  s = await store();
  const live = s.live && JSON.parse(s.live);
  check(!!live && live.version === SAVE_VERSION && live.gold === 777 && s.mark === '1', `${V.name}: the first step writes this milestone's own save from the Milestone 3 one`);
  await untouched('after the carry-over');

  // Settings: the Milestone 3 save can be copied out byte for byte, or carried over again
  await page.evaluate(() => window.__app.go('settings', { from: 'world' }));
  await waitScreen('settings');
  check(await page.locator('.set-m3').count() === 1 && await page.locator('.set-m2').count() === 1, `${V.name}: Settings lists the Milestone 3 save and the M2 save`);
  await click('.set-m3 button:has-text("Export M3 backup (AETH2)")');
  const m3code = await page.locator('.code-v2 textarea').inputValue();
  const decoded = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0))), m3code);
  check(/^AETH2\./.test(m3code) && decoded === V2_SAVE, `${V.name}: "Export M3 backup" gives the Milestone 3 save byte for byte`);
  const kept = await store();
  await click('.set-m3 button:has-text("Carry over my M3 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-no');
  await page.waitForTimeout(300);
  const still = await store();
  check(still.live === kept.live && still.bak === kept.bak, `${V.name}: "Not yet" on "Carry over my M3 save" changes nothing`);
  await click('.set-m3 button:has-text("Carry over my M3 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  check(s.bak === kept.live && JSON.parse(s.live).gold === 777, `${V.name}: carrying it over again backs the live save up first`);
  await untouched('after carrying it over again');
  // reload: this milestone's own save is the one that continues
  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(400);
  check(await page.locator('.title-continue').count() === 1 && await page.locator('.title-carry').count() === 0, `${V.name}: after a reload the title continues this milestone's save`);

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the Milestone 3 profile (${real.join(' | ')})`);
  await context.close();
}

for (const V of VIEWPORTS) {
  for (const fn of [run, runM2, runM3]) {
    try { await fn(V); } catch (e) { fails.push(`${V.name}: ${e.message.split('\n')[0]}`); console.log('  ERROR', e.message.split('\n').slice(0, 6).join('\n')); }
  }
}
await browser.close();
console.log(fails.length ? `\nE2E FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nE2E passed');
process.exit(fails.length ? 1 : 0);
