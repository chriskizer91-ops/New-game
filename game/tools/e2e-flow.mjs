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
//   A. title (no Continue, the M7 · Hearth Below tag) -> new game (name, look, 4d6, starter, prologue or
//      "Skip to the Keep") -> world; this milestone's own save (aethermoor.save.m7) is written, and the M2,
//      Milestone 3, 4, 4.5, 5 and 6 keys never are; every sound and track plays
//   B. the pause menu (WP7's, or go() until the world has one) to Party (equip from the bag), Codex
//      (cards, out of 24), Journal (all four tabs) and Settings, each back to the world
//   C. the first real fight (keep-vault) on Auto -> aftermath -> every chest -> back to the world
//   D. a forced wipe -> aftermath -> the party wakes at the Hearthfire stand; a Tamsin duel lost is a yield
//   E. the Atlas: both views, 44 px markers that do not overlap, travel to a kindled Hearthfire,
//      view only underground, the parchment when the painting fails
//   F. settings: export gives AETH6.; importing it round-trips through the card (.bak kept); the
//      new world settings; reduced motion
//   G. Briarmaw forced: the Brand, then an Echo rematch
//   K. (M4) Idris sells a gem (rules/forge.js buyGem); Hilda's forge from her dialogue: temper the
//      starter to +4 (the +4 step takes silver), reroll a trait on a seeded tempered sword, salvage a
//      seeded pair of boots (asked once), set the bought gem, awaken the starter (seeded with its three
//      deeds); the Party screen's card shows sockets, flames and pips, and its Chronicle side (foes
//      felled, the mightiest, every bearer, the ribbon, Grudge settled); a forced Sunscorch win with
//      every Page I relic claimed shows the page banner, the deeds, a relic Kindled and the forge
//      spoils; the Party screen's numbers are heroStats (the page's bonus included)
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
// And a Milestone 4 profile (the M2, M3 and M4 saves seeded; aethermoor.save.m4 is the newest):
//   L. "Continue from Milestone 4" (offered first) -> the Milestone 4 card -> Walk on (nothing written)
//      -> the first step writes this milestone's own save; Settings lists all three old saves; Export M4
//      backup is the M4 save byte for byte; Carry over my M4 save, "Not yet" changes nothing, then
//      carries it over again with a backup; after a reload the title continues it. All three old
//      saves stay byte-identical throughout.
// And a Milestone 4.5 profile (the M2, M3, M4 and M4.5 saves seeded, with M4.5's started marker;
// aethermoor.save.m4.5 is the newest):
//   M. "Continue from Milestone 4.5" (offered first) -> the Milestone 4.5 card -> Walk on (nothing written)
//      -> the first step writes this milestone's own save; Settings lists all four old saves; Export M4.5
//      backup is the M4.5 save byte for byte; Carry over my M4.5 save, "Not yet" changes nothing, then
//      carries it over again with a backup; after a reload the title continues it. All four old saves,
//      and M4.5's marker, stay byte-identical throughout; nothing of Milestone 4.5's is written.
// And a Milestone 5 profile (the M2, M3, M4, M4.5 and M5 saves seeded, with M4.5's and M5's started markers;
// aethermoor.save.m5 is the newest):
//   N. "Continue from Milestone 5" (offered first) -> the Milestone 5 card -> Walk on (nothing written)
//      -> the first step writes this milestone's own save; the Codex's Page IV (the Gloomfen) shows in the carried
//      journey (open, its pockets and reward, its road note: the fen stair); Settings lists all five old saves;
//      Export M5 backup is the M5 save byte for byte (AETH4); Carry over my M5 save, "Not yet" changes nothing,
//      then carries it over again with a backup; after a reload the title continues it. All five old saves,
//      and the M4.5 and M5 markers, stay byte-identical throughout; nothing of Milestone 5's is written.
// And a Milestone 6 profile (the M2, M3, M4, M4.5, M5 and M6 saves seeded, with the M4.5, M5 and M6 started
// markers; aethermoor.save.m6 is the newest):
//   O. "Continue from Milestone 6" (offered first) -> the Milestone 6 card -> Walk on (nothing written)
//      -> the first step writes this milestone's own save (version 6, the ending unchosen); Settings lists all six
//      old saves; Export M6 backup is the M6 save byte for byte (AETH5); Carry over my M6 save, "Not yet" changes
//      nothing, then carries it over again with a backup; after a reload the title continues it. All six old
//      saves, and the M4.5, M5 and M6 markers, stay byte-identical throughout; nothing of Milestone 6's is written.
// Fails on any console error, page exception or [audio] warning. The world screen is WP7's: this
// test drives it only through go() and the window.__world seam, and checks the shell's own screens.
// Playwright is not a project dependency: it comes from the global npm root.
// Owner: WP8 (M3); the M4 counts and section K: P7a; M5's keys and section M: the lead; M6's keys and section N: the lead;
// M7's keys and section O: the lead;
// M6 P7: Page IV in section N, the fen track among the tracks played, and B's Ladder is the rules' ladder() (an
// entry with an `if`, the man on the barge, shows only once it holds).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { HEARTHS } from '../src/data/world.js';
import { MAPS } from '../src/data/maps/index.js';
import { RELICS } from '../src/data/relics.js';
import { DEEDS } from '../src/data/deeds.js';
import { LOCK_IDS } from '../src/data/locks.js';
import { LADDER } from '../src/data/ladder.js';
import { SHOPS } from '../src/data/shops.js';
import { GEMS } from '../src/data/gems.js';
import { PAGES } from '../src/data/codex.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { SAVE_VERSION, toV2, toV3, toV4, toV5 } from '../src/rules/migrate.js';
import { ladder } from '../src/rules/story.js';
import { heroStats } from '../src/rules/stats.js';

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
// a Milestone 4 save (aethermoor.save.m4, version 3): the Milestone 3 one as M4 carried it over, then played
// on to Sandspire with the Spire Hearth kindled
const M4_SAVE = (() => {
  const g = toV3(JSON.parse(V2_SAVE)), h = HEARTHS['spire-hearth'];
  g.gold = 888;
  g.progress.pos = { map: h.map, x: h.x, y: h.y, face: h.face };
  g.progress.flags.kindled['spire-hearth'] = true;
  g.progress.flags.story = { ...g.progress.flags.story, 'act1-complete': true };
  return JSON.stringify(g);
})();
// a Milestone 4.5 save (aethermoor.save.m4.5, version 3 like M4's): the Milestone 4 one as Milestone 4.5
// carried it over, then played on to Dusthaven with the Pithead Hearthfire kindled
const M45_SAVE = (() => {
  const g = toV3(JSON.parse(M4_SAVE)), h = HEARTHS.pithead;
  g.gold = 999;
  g.progress.pos = { map: h.map, x: h.x, y: h.y, face: h.face };
  g.progress.flags.kindled.pithead = true;
  return JSON.stringify(g);
})();
// a Milestone 5 save (aethermoor.save.m5, version 4): the Milestone 4.5 one as M5 carried it over, then played on
// to Peak's Veil with the Cloister Fire kindled and the second council sat
const M5_SAVE = (() => {
  const g = toV4(JSON.parse(M45_SAVE)), h = HEARTHS['veil-hearth'];
  g.gold = 1111;
  g.progress.pos = { map: h.map, x: h.x, y: h.y, face: h.face };
  g.progress.flags.kindled['veil-hearth'] = true;
  g.progress.flags.story = { ...g.progress.flags.story, 'sunscorch-complete': true, 'council-2-done': true };
  return JSON.stringify(g);
})();
// a Milestone 6 save (aethermoor.save.m6, version 5): the Milestone 5 one as M6 carried it over, then played on to
// Willowmurk with the Willow Hearth kindled and the third council sat
const M6_SAVE = (() => {
  const g = toV5(JSON.parse(M5_SAVE)), h = HEARTHS['willow-hearth'];
  g.gold = 1212;
  g.progress.pos = { map: h.map, x: h.x, y: h.y, face: h.face };
  g.progress.flags.kindled['willow-hearth'] = true;
  g.progress.flags.story = { ...g.progress.flags.story, 'ironspire-complete': true, 'council-3-done': true };
  return JSON.stringify(g);
})();
const V1_CODE = readFileSync(path.join(root, 'test/fixtures/v1/v1-grudges.code.txt'), 'utf8').trim();
const V1_CODE_GAME = JSON.parse(readFileSync(path.join(root, 'test/fixtures/v1/v1-grudges.json'), 'utf8'));
const stand = id => { const h = HEARTHS[id]; return { map: h.map, x: h.x, y: h.y, face: h.face }; };
// M4 content counts, from the data (the Codex screen's and the Atlas's own checks are the lead's)
const RELIC_TOTAL = Object.keys(RELICS).length;
const RUMOURS = LADDER.filter(l => l.silhouette).length;

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

// A reload that tells the browser's storage quirk from a game bug. In a throwaway headless context, Chromium now
// and then drops the whole file:// origin's storage across a reload (docs/M45-STATUS.md §3; M6's review saw it in
// about one reload in fifteen, and not once in twenty over http://): the game's keys go, and so does a key that only this test
// writes. So the test writes that key first. If it is gone after the reload, the browser wiped the origin, not the
// game: every key is put back as it was and the page reloads once more. A second wipe fails the run. A game that
// dropped its own save keeps the test's key, so its check still fails.
async function reloadKept(page, V, label, wait = 400) {
  const before = await page.evaluate(() => {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); all[k] = localStorage.getItem(k); }
    localStorage.setItem('e2e.kept', '1');
    return all;
  });
  for (let n = 0; n < 2; n++) {
    await page.reload();
    await page.waitForSelector('.title-menu');
    await page.waitForTimeout(wait);
    if (await page.evaluate(() => localStorage.getItem('e2e.kept') === '1')) return;
    note(`${V.name}: the browser wiped the file:// origin's storage on a reload (${label}; the test's own key went too)${n ? '' : ': it is put back and the page reloaded once more'}`);
    if (n) break;
    await page.evaluate(all => {
      localStorage.clear();
      for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
      localStorage.setItem('e2e.kept', '1');
    }, before);
  }
  check(false, `${V.name}: the browser kept the page's storage across a reload (${label}): it wiped the file:// origin twice`);
}

const SFX = ['select', 'confirm', 'back', 'dice', 'hit', 'graze', 'miss', 'crit', 'heal', 'status', 'disarm', 'ko', 'surge', 'legend', 'victory', 'defeat', 'phase', 'chest', 'reveal', 'equip', 'levelup', 'hearth', 'beam', 'tick', 'stamp', 'coin', 'page', 'identify', 'slam', 'error',
  'bump', 'alert', 'door', 'blip', 'unlock', 'chime'];
const TRACKS = ['road', 'wilds', 'town', 'dungeon', 'battle', 'boss', 'hearth', 'victory', 'title', 'desert', 'peaks', 'fen'];

async function openPage(V, { seedV1 = null, seedV2 = null, seedM4 = null, seedM45 = null, seedM5 = null, seedM6 = null } = {}) {
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
    // an M4.5, M5 or M6 save comes with its own started marker (its file set it): it must not stop M7 offering it
    for (const [key, raw] of [['aethermoor.save.v1', seed?.v1], ['aethermoor.save.v2', seed?.v2], ['aethermoor.save.m4', seed?.m4],
      ['aethermoor.save.m4.5', seed?.m45], ['aethermoor.m4.5.started', seed?.m45 ? '1' : null],
      ['aethermoor.save.m5', seed?.m5], ['aethermoor.m5.started', seed?.m5 ? '1' : null],
      ['aethermoor.save.m6', seed?.m6], ['aethermoor.m6.started', seed?.m6 ? '1' : null]]) {
      if (raw) { try { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); } catch { /* storage blocked */ } }
    }
  }, { v1: seedV1, v2: seedV2, m4: seedM4, m45: seedM45, m5: seedM5, m6: seedM6 });
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
    m4: localStorage.getItem('aethermoor.save.m4'), m45: localStorage.getItem('aethermoor.save.m4.5'), m5: localStorage.getItem('aethermoor.save.m5'), m6: localStorage.getItem('aethermoor.save.m6'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
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
  check(/M7/.test(await page.locator('.title-ver').innerText()) && /Hearth Below/i.test(await page.locator('.title-ver').innerText()), `${V.name}: the title shows the M7 · Hearth Below tag`);
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
  check(!!s0.live && JSON.parse(s0.live).version === SAVE_VERSION && s0.v1 === null && s0.m3 === null && s0.m4 === null && s0.m45 === null && s0.m5 === null && s0.m6 === null, `${V.name}: Begin writes this milestone's own save at version ${SAVE_VERSION} (and no M2, Milestone 3, 4, 4.5, 5 or 6 key)`);
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
  // M4: the binder opens on a page; its pockets are that page's relics, and it counts only what the page
  // needs (the starters you passed over stay in the Keep)
  const cx = await page.evaluate(() => ({
    tabs: document.querySelectorAll('.cx-tab').length, page: document.querySelector('.cx-tab[aria-selected="true"]')?.dataset.page,
    pockets: document.querySelectorAll('.pocket').length, prog: document.querySelector('.cx-prog')?.textContent || '',
  }));
  const cxPage = PAGES.find(P => P.id === cx.page);
  const cxOn = cxPage && cxPage.from != null ? Object.values(RELICS).filter(r => r.codex >= cxPage.from && r.codex <= cxPage.to) : [];
  const cxNeed = cxOn.filter(r => !r.starter).length + (cxOn.some(r => r.starter) ? 1 : 0);
  check(cx.tabs === PAGES.length && cxOn.length > 0 && cx.pockets === cxOn.length && new RegExp(`of ${cxNeed} claimed`).test(cx.prog),
    `${V.name}: the Codex binder opens on Page ${cxPage?.no} with ${cx.pockets} pockets, "${cx.prog}" (needs ${cxNeed})`);
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
      // M6: an entry with an `if` shows once it holds (the man on the barge, after Tamsin's fall), so the Ladder is
      // the rules' ladder() for this game, in its order: every entry without an `if`, the rumours as silhouettes
      const posters = await page.evaluate(() => [...document.querySelectorAll('.poster')].map(p => ({ id: p.dataset.id, state: p.dataset.state })));
      const want = ladder(await game());
      const rumours = want.filter(p => LADDER.find(l => l.id === p.id)?.silhouette);
      const waiting = LADDER.filter(l => !want.some(p => p.id === l.id)).map(l => l.id);
      check(posters.length === want.length && want.every((p, i) => posters[i].id === p.id && posters[i].state === p.state)
        && LADDER.filter(l => !l.if).every(l => posters.some(p => p.id === l.id)) && rumours.every(r => posters.find(p => p.id === r.id)?.state === 'silhouette') && rumours.length <= RUMOURS,
      `${V.name}: the Ladder has ${want.length - rumours.length} posters and ${rumours.length} rumours${waiting.length ? `, ${waiting.join(', ')} not yet` : ''} (${posters.map(p => p.state).join(' ')})`);
    }
  }
  await click('.jr-tab[data-tab="keys"]');
  const keyRows = await page.evaluate(() => [...document.querySelectorAll('.jr-lock')].map(l => [l.dataset.lock, l.querySelectorAll('.jl-keys li .mk').length]));
  check(keyRows.length === LOCK_IDS.length && LOCK_IDS.every(id => keyRows.some(([k, n]) => k === id && n >= 2)), `${V.name}: Keys lists all ${LOCK_IDS.length} lock types with a tick or cross per key (${keyRows.map(([k, n]) => `${k}:${n}`).join(' ')})`);
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

  // ======== K. (M4) Idris's gems, Hilda's forge, the card's Chronicle, a finished Codex page ========
  {
    const idle = () => page.waitForFunction(() => window.__world && !window.__world.busy() && !document.querySelector('.ov'), null, { timeout: 10000 });
    // talk to someone through the world's own dialogue flow, and pick the choice that matches `pick`
    const talk = async (npc, dialogue, pick) => {
      for (let i = 0; i < 4 && await page.locator('.ov').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
      await idle();
      await page.evaluate(([n, d]) => { window.__world.event({ t: 'talk', npc: n, dialogue: d }); }, [npc, dialogue]);
      await page.waitForSelector('.ov-dialogue', { timeout: 5000 });
      for (let i = 0; i < 40; i++) {
        const c = page.locator('.dlg-choice', { hasText: pick });
        if (await c.count()) { await c.first().click(); return true; }
        if (!(await page.locator('.ov-dialogue').count())) return false;
        await page.locator('.dlg-next').click().catch(() => {});
        await page.waitForTimeout(160);
      }
      return false;
    };
    const item = uid => page.evaluate(u => window.__app.game.inventory.find(i => i.uid === u) || null, uid);
    const inForge = async (tab, uid) => {
      await click(`.ov-forge .forge-tab[data-tab="${tab}"]`);
      if (uid) await click(`.ov-forge .forge-item[data-uid="${uid}"]`);
      await page.waitForTimeout(150);
    };
    const DEEDS_OF = Object.fromEntries(Object.values(RELICS).filter(r => r.starter).map(r => [r.id, r.deeds || []]));
    const prov = { from: 'Skarn', where: 'The Bramble Toll', day: 3 };
    const RR = { uid: 'e2e-reroll', base: 'longsword', kind: 'sword', slot: 'weapon', rarity: 'tempered', ilvl: 4, name: 'Hearthstone Longsword of the Smith', aspect: null, affixes: [{ id: 'hearthstone', value: 15 }, { id: 'smith', value: 3 }], gems: [], temper: 0, seed: 4242, provenance: prov, chronicle: { kills: 0 } };
    const SV = { uid: 'e2e-salvage', base: 'boots', kind: 'boots', slot: 'feet', rarity: 'wrought', ilvl: 2, name: 'Boots of the Pathfinder', aspect: null, affixes: [{ id: 'pathfinder', value: 1 }], gems: [], temper: 0, seed: 777, provenance: prov, chronicle: { kills: 0 } };
    // the starter back in the Warden's hands, with its three deeds done and a Chronicle to read
    await setGame(`g => {
      const DEEDS_OF = ${JSON.stringify(DEEDS_OF)};
      const starter = g.progress.flags.story.starter;
      const w = g.inventory.find(i => i.base === starter);
      for (const h of Object.values(g.party.roster)) for (const [s, u] of Object.entries(h.gear)) if (u === w.uid) h.gear[s] = null;
      g.party.roster.warden.gear.weapon = w.uid;
      if (starter === 'cairnmaul') g.party.roster.warden.gear.offhand = null;
      Object.assign(w, { temper: 0, gems: [], deeds: Object.fromEntries(DEEDS_OF[starter].map((d, i) => [d, i + 2])) });
      delete w.awakened;
      w.chronicle = { ...(w.chronicle || {}), kills: 7, mightiest: { name: 'Briarmaw', level: 6 }, bearers: ['warden', 'pip'] };
      w.provenance = { ...w.provenance, grudge: 'Skarn the Party-Breaker' };
      g.inventory.push(${JSON.stringify(RR)}, ${JSON.stringify(SV)});
      g.gold = 6000; g.materials = { scrap: 4, silver: 5, embers: 3 }; g.gems = {};
    }`);
    await page.evaluate(() => window.__app.go('world', {}));
    await waitScreen('world');
    const starterUid = (await game()).party.roster.warden.gear.weapon;
    const starter = (await item(starterUid)).base;

    // Idris sells gems (SHOPS.idris.gems) through rules/forge.js buyGem
    check(await talk('idris', 'idris', /gem/i), `${V.name}: Idris's dialogue offers his gems`);
    await page.waitForSelector('.ov-shop', { timeout: 5000 });
    await page.waitForTimeout(300);
    const gemRows = await page.locator('.ov-shop .shop-buy[data-gem]').count();
    check(gemRows === SHOPS.idris.gems.length, `${V.name}: Idris's shop lists his ${SHOPS.idris.gems.length} gems (${gemRows})`);
    await shot('idris', false);
    await noHScroll('Idris\'s shop');
    const gold0 = (await game()).gold;
    await click('.ov-shop .shop-buy[data-gem="sunstone"]');
    await page.waitForTimeout(200);
    check(/In your pouch: 1/.test(await page.locator('.ov-shop .gem-row[data-gem="sunstone"]').innerText()), `${V.name}: a Dusthaven Sunstone goes in the pouch`);
    await click('.ov-shop [data-primary]');
    await page.waitForSelector('.ov-shop', { state: 'detached' });
    g = await game();
    check(g.gems?.sunstone === 1 && g.gold === gold0 - GEMS.sunstone.price, `${V.name}: the gem is bought at Idris's price (${gold0} -> ${g.gold}, ${JSON.stringify(g.gems)})`);

    // Hilda's forge, from her own dialogue
    check(await talk('hilda', 'hilda', /Temper/), `${V.name}: Hilda's dialogue opens the forge`);
    await page.waitForSelector('.ov-forge', { timeout: 5000 });
    await page.waitForTimeout(300);
    const purseKeys = await page.evaluate(() => [...document.querySelectorAll('.ov-forge .forge-purse .fp-chip[data-k]')].map(c => c.dataset.k));
    check(await page.locator('.ov-forge .forge-tab').count() === 5 && ['gold', 'scrap', 'silver', 'embers', 'gem:sunstone'].every(k => purseKeys.includes(k)), `${V.name}: the forge has five tabs and the purse and pouch strip (${purseKeys.join(' ')})`);
    const tabH = await page.evaluate(() => [...document.querySelectorAll('.ov-forge .forge-tab')].map(b => b.getBoundingClientRect().height));
    check(tabH.every(h => h >= 44), `${V.name}: every forge tab is 44 px tall (${tabH.join(', ')})`);
    await noHScroll('the forge');
    // Temper to +4: the fourth step takes silver
    await click(`.ov-forge .forge-item[data-uid="${starterUid}"]`);
    for (let t = 0; t < 4; t++) {
      if (t === 3) {
        const need = await page.locator('.ov-forge .forge-need').innerText();
        check(/silver/.test(need), `${V.name}: the forge says the step to +4 needs silver ("${need}")`);
        await shot('forge-temper', false);
      }
      await click('.ov-forge .forge-go');
      await page.waitForTimeout(220);
    }
    const lit = await page.locator('.ov-forge .forge-flames canvas.fl-on').count();
    check(/\+4/.test(await page.locator('.ov-forge .forge-card-name').innerText()) && lit === 4, `${V.name}: the starter is +4 in the forge, four flames lit (${lit})`);
    // Reroll one trait
    await inForge('reroll', RR.uid);
    await click('.ov-forge .rr-trait[data-i="0"]');
    const trait0 = await page.locator('.ov-forge .rr-trait[data-i="0"] .rr-text').innerText();
    await click('.ov-forge .forge-go');
    await page.waitForTimeout(600);
    const rolled = await page.locator('.ov-forge .rr-trait.rolled').count();
    const trait1 = await page.locator('.ov-forge .rr-trait[data-i="0"] .rr-text').innerText();
    check(rolled === 1 && trait1 !== trait0 && /★/.test(await page.locator('.ov-forge .rr-trait[data-i="0"] .rr-q').innerText()), `${V.name}: a rerolled trait slides in with its stars ("${trait0}" -> "${trait1}")`);
    await shot('forge-reroll', false);
    // Salvage: it asks once, and lists what comes back
    await inForge('salvage', SV.uid);
    check(/\+2 scrap/.test(await page.locator('.ov-forge .sv-yield').innerText()), `${V.name}: salvage lists what comes back (+2 scrap)`);
    await click('.ov-forge .forge-go');
    await page.waitForSelector('.ov-forge .sv-confirm');
    await shot('forge-salvage', false);
    await click('.ov-forge .forge-confirm');
    await page.waitForTimeout(250);
    check(await page.locator(`.ov-forge .forge-item[data-uid="${SV.uid}"]`).count() === 0 && /Boots of the Pathfinder/.test(await page.locator('.ov-forge .forge-gone').innerText()), `${V.name}: the boots go in the crucible`);
    // Set the gem
    await inForge('gems', starterUid);
    await click('.ov-forge .gem-sock[data-i="0"]');
    await click('.ov-forge .gem-pick[data-gem="sunstone"]');
    await page.waitForTimeout(200);
    check(await page.locator('.ov-forge .gem-sock[data-i="0"].set').count() === 1, `${V.name}: the Sunstone sits in the first socket`);
    await shot('forge-gems', false);
    // Awaken the ready relic
    await inForge('awaken');
    check(await page.locator('.ov-forge .forge-tab[data-tab="awaken"].has-dot').count() === 1 && await page.locator(`.ov-forge .forge-item.on[data-uid="${starterUid}"]`).count() === 1, `${V.name}: the Awaken tab flags the ready relic and picks it`);
    const branches = await page.evaluate(() => [...document.querySelectorAll('.ov-forge .aw-branch')].map(b => [b.dataset.branch, b.getAttribute('aria-disabled'), b.innerText.replace(/\s+/g, ' ')]));
    // the Warden walks the Hand; the Heart branch is closed and names who would open it, unless nobody who can
    // carry this starter walks the Heart (a sword), when it opens for its bearer and says so
    const hand = branches.find(b => b[0] === 'a'), heart = branches.find(b => b[0] === 'b');
    check(branches.length === 2 && hand?.[1] === 'false' && ((heart?.[1] === 'true' && /path is the Heart \(/.test(heart[2])) || (heart?.[1] === 'false' && /Nobody who can carry it walks the Heart/.test(heart[2]))),
      `${V.name}: both branches show, the Heart one closed with whose path would open it, or open for its bearer (${JSON.stringify(heart)})`);
    await shot('forge-awaken');
    await noHScroll('the forge (Awaken)');
    await click('.ov-forge .aw-branch[data-branch="a"]');
    await page.waitForTimeout(150);
    await click('.ov-forge .aw-go');
    await page.waitForSelector('.ov-card .card', { timeout: 5000 });
    await page.waitForTimeout(1100);
    check(/Awakened/i.test(await page.locator('.ov-card .stamp.b').innerText()), `${V.name}: the awakened card is stamped Awakened`);
    await shot('forge-awakened-card', false);
    await click('.ov-card .cont');
    await page.waitForSelector('.ov-card', { state: 'detached' });
    await click('.ov-forge .forge-done');
    await page.waitForSelector('.ov-forge', { state: 'detached' });
    await page.waitForTimeout(400);
    g = await game();
    const w = g.inventory.find(i => i.uid === starterUid);
    const rr = g.inventory.find(i => i.uid === RR.uid);
    check(w.temper === 4 && w.gems[0] === 'sunstone' && w.awakened === 'a' && g.codex[starter].awakened === true, `${V.name}: the forge's game comes back to the world (+${w.temper}, ${JSON.stringify(w.gems)}, awakened ${w.awakened})`);
    check(rr.rerolls === 1 && rr.affixes[0].id !== RR.affixes[0].id && !g.inventory.some(i => i.uid === SV.uid), `${V.name}: the reroll and the salvage are saved`);
    check(g.materials.silver === 4 && g.materials.embers === 1 && g.materials.scrap === 5 && !g.gems.sunstone, `${V.name}: silver, embers, scrap and the gem were spent and won (${JSON.stringify(g.materials)} ${JSON.stringify(g.gems)})`);

    // The card: sockets, flames, deed pips and the stage line; then its Chronicle side
    await page.evaluate(() => window.__app.go('party', { from: 'world' }));
    await waitScreen('party');
    await click('.slot[data-s="weapon"]');
    await click('.ci-acts .btn:has-text("See card")');
    await page.waitForSelector('.ov-card .card');
    await page.waitForTimeout(500);
    const face = await page.evaluate(() => ({
      socks: document.querySelectorAll('.ov-card .fb-sockets .sock.set').length, lit: document.querySelectorAll('.ov-card .fb-temper canvas.fl-on').length,
      pips: document.querySelectorAll('.ov-card .fb-deeds .pips i.on').length, stage: document.querySelector('.ov-card .fb-stage')?.textContent || '',
    }));
    check(face.socks === 1 && face.lit === 4 && face.pips === 3 && /^Awakened · /.test(face.stage), `${V.name}: the card shows the gem, four flames, three deed pips and "${face.stage}"`);
    await page.locator('.ov-card .forgebits').scrollIntoViewIfNeeded();
    await shot('card-forgebits', false);
    await click('.ov-card .chron-btn');
    await page.waitForSelector('.ov-card .card-back:not([hidden])');
    await page.waitForTimeout(500);
    const back = await page.locator('.ov-card .card-back').innerText();
    check(/Foes felled\s*7/i.test(back) && /Briarmaw/.test(back) && back.includes(NAME) && /Pip/.test(back) && /Grudge settled/i.test(back) && /Keep reliquary/.test(back), `${V.name}: the Chronicle side lists the felled, the mightiest, every bearer, the ribbon and Grudge settled (${back.replace(/\s+/g, ' ').slice(0, 200)})`);
    await shot('card-chronicle', false);
    await noHScroll('the Chronicle');
    await click('.ov-card .chron-back');
    await page.waitForTimeout(400);
    check(await page.locator('.ov-card .card-back').isHidden(), `${V.name}: the card turns back to its face`);
    await click('.ov-card .cont');
    await page.waitForSelector('.ov', { state: 'detached' });
    await backToWorld();

    // A finished Codex page: every Page I relic claimed, a Sunscorch fight won
    const pageOne = PAGES[0];
    const need = Object.values(RELICS).filter(r => r.codex >= pageOne.from && r.codex <= pageOne.to && !r.starter).map(r => r.id);
    // a relic whose deeds include First Blood (a won fight does it), on Pip, away from the weapon slot
    const kindling = Object.values(RELICS).find(r => r.slot !== 'weapon' && (r.deeds || []).includes('first-blood'));
    await setGame(`g => {
      for (const id of ${JSON.stringify(need)}) g.codex[id] = { sighted: true, claimed: true, awakened: false, ...(g.codex[id] || {}), claimed: true };
      g.progress.flags.pages = {};
      const it = window.__worldTools.relicItem(${JSON.stringify(kindling.id)}, 'Sneck the Tallyman');
      it.uid = 'e2e-kindling';
      g.inventory.push(it);
      g.party.roster.pip.gear[${JSON.stringify(kindling.slot)}] = it.uid;
    }`);
    const fightId = ['vault-guard', 'sg-captain', 'gf-raiders'].find(id => ENCOUNTERS[id]) || 'keep-vault';
    const mats0 = { ...(await game()).materials };
    await startFight(fightId, { result: 'victory', xp: 120, gold: 40 });
    await waitScreen('aftermath');
    await page.waitForTimeout(1500);
    const banner = await page.locator('.af-page').first().innerText().catch(() => '');
    check(new RegExp(`Page ${pageOne.no} complete: ${pageOne.reward.name}`, 'i').test(banner), `${V.name}: a finished page shows its banner ("${banner.replace(/\s+/g, ' ').slice(0, 90)}")`);
    const deeds = await page.locator('.af-deeds').innerText().catch(() => '');
    check(deeds.replace(/\s+/g, ' ').includes(`${kindling.name}: ${DEEDS['first-blood'].name}`) && /is Kindled/.test(deeds), `${V.name}: the aftermath lists ${kindling.name}'s deed done and the relic Kindled (${deeds.replace(/\s+/g, ' ').slice(0, 120)})`);
    g = await game();
    if (ENCOUNTERS[fightId].region === 'sunscorch') {
      const mats = await page.locator('.af-mats').innerText().catch(() => '');
      check(/scrap/.test(mats) && g.materials.scrap > mats0.scrap, `${V.name}: the forge spoils of a Sunscorch win show and are kept (${mats.replace(/\s+/g, ' ')})`);
    }
    check(!!g.progress.flags.pages?.[pageOne.id], `${V.name}: the finished page is recorded (flags.pages.${pageOne.id})`);
    await shot('aftermath-page');
    await noHScroll('the aftermath with a page banner');
    await click('.af-foot .btn.primary');
    await waitScreen('world');
    // the Party screen's numbers are heroStats, the page's bonus included
    await page.evaluate(() => window.__app.go('party', { from: 'world' }));
    await waitScreen('party');
    await page.waitForTimeout(300);
    g = await game();
    const hpTile = Number(await page.locator('.derived .stat[data-k="hp"] .v').innerText());
    check(hpTile === heroStats(g, 'warden').maxHp && /The Verdant Oath/.test(await page.locator('.page-box').innerText()), `${V.name}: the Party screen shows heroStats with the page's bonus (HP ${hpTile} = ${heroStats(g, 'warden').maxHp})`);
    await shot('party-page-bonus');
    await noHScroll('party with the page bonus');
    await backToWorld();
  }

  // ======== H. reload: the title's Continue ========
  await reloadKept(page, V, "the title's Continue", 600);
  g = await game();
  const sub = (await page.locator('.title-continue small').innerText()).trim();
  const want = `${NAME} · ${MAPS[g.progress.pos.map].name} · Day ${g.progress.flags.day} · Lv `;
  check(sub.startsWith(want) && new RegExp(`· Lv \\d+ · \\d+/${RELIC_TOTAL} relics$`).test(sub), `${V.name}: the Continue sub-line reads "${sub}"`);
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
    m4: localStorage.getItem('aethermoor.save.m4'), m45: localStorage.getItem('aethermoor.save.m4.5'), m5: localStorage.getItem('aethermoor.save.m5'), m6: localStorage.getItem('aethermoor.save.m6'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
  }));
  const settings = async () => { await page.evaluate(() => window.__app.go('settings', { from: 'world' })); await waitScreen('settings'); };
  const v1Same = async label => { const st = await store(); check(st.v1 === V1_SAVE && st.m3 === null && st.m4 === null && st.m45 === null && st.m5 === null && st.m6 === null, `${V.name}: aethermoor.save.v1 is byte-identical and no Milestone 3, 4, 4.5, 5 or 6 save is written (${label})`); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from the Gauntlet/.test(await page.locator('.title-carry').innerText()), `${V.name}: an M2 save offers "Continue from the Gauntlet"`);
  await shot('title-m2');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  await page.waitForTimeout(300);
  const card = await page.locator('.carry-card').innerText();
  check(/The road has become a land/.test(card) && (await page.locator('.carry-hero').count()) === 4 && /You wake at Thornhollow/.test(card) && new RegExp(`of ${RELIC_TOTAL}\\b`).test(card) && /254/.test(card), `${V.name}: the carry-over card lists the party, relics, gold and where you wake`);
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
  check(!!s.live && JSON.parse(s.live).migratedFrom === 1 && s.mark === '1' && s.m3 === null && s.m4 === null && !(await page.evaluate(() => window.__app.adopting)), `${V.name}: commitAdopted writes this milestone's save and its started marker (never a Milestone 3 or 4 key)`);
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
    m4: localStorage.getItem('aethermoor.save.m4'), m45: localStorage.getItem('aethermoor.save.m4.5'), m5: localStorage.getItem('aethermoor.save.m5'), m6: localStorage.getItem('aethermoor.save.m6'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
  }));
  const untouched = async label => { const st = await store(); check(st.v1 === V1_SAVE && st.m3 === V2_SAVE && st.m4 === null && st.m45 === null && st.m5 === null && st.m6 === null, `${V.name}: the M2 and Milestone 3 saves are byte-identical, and no Milestone 4, 4.5, 5 or 6 save is written (${label})`); };
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
  // reload: this milestone's own save is the one that continues. A reload, not a second goto: in a
  // throwaway headless context, a new navigation to a file:// page sometimes starts with the origin's
  // storage wiped (Chromium drops an in-memory file:// storage area it briefly holds no page for);
  // a real browser keeps it on disk. That was M4's unreproduced "reload" flake (docs/M45-STATUS.md).
  // A reload does it too, more rarely, so reloadKept() tells that wipe from the game's own.
  await reloadKept(page, V, 'the Milestone 3 profile');
  const seen = await page.evaluate(() => ({
    cont: document.querySelectorAll('.title-continue').length, carry: document.querySelectorAll('.title-carry').length,
    live: !!localStorage.getItem('aethermoor.save.m7'), mark: localStorage.getItem('aethermoor.m7.started'), screen: document.getElementById('app').dataset.screen,
  }));
  check(seen.cont === 1 && seen.carry === 0, `${V.name}: after a reload the title continues this milestone's save (${JSON.stringify(seen)})`);

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the Milestone 3 profile (${real.join(' | ')})`);
  await context.close();
}

// ======== L. a Milestone 4 profile: the M4 save (and the M3 and M2 saves before it) on the device ========
async function runM4(V) {
  console.log(`\n== ${V.name} Milestone 4 profile`);
  const { context, page, errors, failed } = await openPage(V, { seedV1: V1_SAVE, seedV2: V2_SAVE, seedM4: M4_SAVE });
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(x => document.getElementById('app').dataset.screen === x, name, { timeout }); await page.waitForTimeout(200); };
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); };
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'), m4: localStorage.getItem('aethermoor.save.m4'),
    m4mark: localStorage.getItem('aethermoor.m4.started'), m4bak: localStorage.getItem('aethermoor.save.m4.bak'),
    m45: localStorage.getItem('aethermoor.save.m4.5'), m45mark: localStorage.getItem('aethermoor.m4.5.started'), m45bak: localStorage.getItem('aethermoor.save.m4.5.bak'),
    m5: localStorage.getItem('aethermoor.save.m5'), m5mark: localStorage.getItem('aethermoor.m5.started'), m5bak: localStorage.getItem('aethermoor.save.m5.bak'),
    m6: localStorage.getItem('aethermoor.save.m6'), m6mark: localStorage.getItem('aethermoor.m6.started'), m6bak: localStorage.getItem('aethermoor.save.m6.bak'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
  }));
  const untouched = async label => {
    const st = await store();
    check(st.v1 === V1_SAVE && st.m3 === V2_SAVE && st.m4 === M4_SAVE && st.m4mark === null && st.m4bak === null && st.m45 === null && st.m45mark === null && st.m45bak === null && st.m5 === null && st.m5mark === null && st.m5bak === null && st.m6 === null && st.m6mark === null && st.m6bak === null,
      `${V.name}: the M2, Milestone 3 and Milestone 4 saves are byte-identical, and nothing of Milestone 4's, 4.5's, 5's or 6's is written (${label})`);
  };
  const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(outDir, `${V.name}-m4-${name}.png`) }); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from Milestone 4/.test(await page.locator('.title-carry').innerText()), `${V.name}: the Milestone 4 save is offered first ("Continue from Milestone 4")`);
  check(/M7/.test(await page.locator('.title-ver').innerText()), `${V.name}: the title carries the M7 tag`);
  await shot('title');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  const card = await page.locator('.carry-card').innerText();
  check(/Milestone 4 journey carries over/i.test(card) && /Back on the road/.test(card) && /\b888\b/.test(card) && /Sandspire/.test(card), `${V.name}: the card is the Milestone 4 one, with its gold and where you wake`);
  await shot('carry-card');
  await click('.carry-go');
  await waitScreen('world');
  let s = await store();
  check(s.live === null && s.mark === null && await page.evaluate(() => window.__app.adopting), `${V.name}: "Walk on" holds the carried game in memory (nothing written)`);
  await page.evaluate(() => { for (const d of ['s', 'n', 'e', 'w']) { const ev = window.__world.step(d, 1); if (ev.some(e => e.t === 'step')) break; } });
  await page.waitForTimeout(400);
  s = await store();
  const live = s.live && JSON.parse(s.live);
  check(!!live && live.version === SAVE_VERSION && live.gold === 888 && s.mark === '1', `${V.name}: the first step writes this milestone's own save from the Milestone 4 one`);
  await untouched('after the carry-over');

  await page.evaluate(() => window.__app.go('settings', { from: 'world' }));
  await waitScreen('settings');
  check(await page.locator('.set-m4').count() === 1 && await page.locator('.set-m3').count() === 1 && await page.locator('.set-m2').count() === 1, `${V.name}: Settings lists the Milestone 4, Milestone 3 and M2 saves`);
  await click('.set-m4 button:has-text("Export M4 backup (AETH3)")');
  const m4code = await page.locator('.code-m4 textarea').inputValue();
  const decoded = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0))), m4code);
  check(/^AETH3\./.test(m4code) && decoded === M4_SAVE, `${V.name}: "Export M4 backup" gives the Milestone 4 save byte for byte`);
  const kept = await store();
  await click('.set-m4 button:has-text("Carry over my M4 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-no');
  await page.waitForTimeout(300);
  const still = await store();
  check(still.live === kept.live && still.bak === kept.bak, `${V.name}: "Not yet" on "Carry over my M4 save" changes nothing`);
  await click('.set-m4 button:has-text("Carry over my M4 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  check(s.bak === kept.live && JSON.parse(s.live).gold === 888, `${V.name}: carrying it over again backs the live save up first`);
  await untouched('after carrying it over again');
  await reloadKept(page, V, 'the Milestone 4 profile'); // a reload, not a second goto (see the Milestone 3 profile)
  const seen = await page.evaluate(() => ({
    cont: document.querySelectorAll('.title-continue').length, carry: document.querySelectorAll('.title-carry').length,
    live: !!localStorage.getItem('aethermoor.save.m7'), mark: localStorage.getItem('aethermoor.m7.started'), screen: document.getElementById('app').dataset.screen,
  }));
  check(seen.cont === 1 && seen.carry === 0, `${V.name}: after a reload the title continues this milestone's save (${JSON.stringify(seen)})`);
  await untouched('after a reload');

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the Milestone 4 profile (${real.join(' | ')})`);
  await context.close();
}

// ======== M. a Milestone 4.5 profile: the M4.5 save (and the M4, M3 and M2 saves before it) on the device ========
async function runM45(V) {
  console.log(`\n== ${V.name} Milestone 4.5 profile`);
  const { context, page, errors, failed } = await openPage(V, { seedV1: V1_SAVE, seedV2: V2_SAVE, seedM4: M4_SAVE, seedM45: M45_SAVE });
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(x => document.getElementById('app').dataset.screen === x, name, { timeout }); await page.waitForTimeout(200); };
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); };
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'), m4: localStorage.getItem('aethermoor.save.m4'),
    m4mark: localStorage.getItem('aethermoor.m4.started'), m4bak: localStorage.getItem('aethermoor.save.m4.bak'),
    m45: localStorage.getItem('aethermoor.save.m4.5'), m45mark: localStorage.getItem('aethermoor.m4.5.started'), m45bak: localStorage.getItem('aethermoor.save.m4.5.bak'),
    m5: localStorage.getItem('aethermoor.save.m5'), m5mark: localStorage.getItem('aethermoor.m5.started'), m5bak: localStorage.getItem('aethermoor.save.m5.bak'),
    m6: localStorage.getItem('aethermoor.save.m6'), m6mark: localStorage.getItem('aethermoor.m6.started'), m6bak: localStorage.getItem('aethermoor.save.m6.bak'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
  }));
  const untouched = async label => {
    const st = await store();
    check(st.v1 === V1_SAVE && st.m3 === V2_SAVE && st.m4 === M4_SAVE && st.m4mark === null && st.m4bak === null && st.m45 === M45_SAVE && st.m45mark === '1' && st.m45bak === null && st.m5 === null && st.m5mark === null && st.m5bak === null && st.m6 === null && st.m6mark === null && st.m6bak === null,
      `${V.name}: the M2, Milestone 3, 4 and 4.5 saves (and M4.5's marker) are byte-identical, and nothing of Milestone 4's, 4.5's, 5's or 6's is written (${label})`);
  };
  const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(outDir, `${V.name}-m45-${name}.png`) }); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from Milestone 4\.5/.test(await page.locator('.title-carry').innerText()), `${V.name}: the Milestone 4.5 save is offered first ("Continue from Milestone 4.5"), though the M4.5 file marked it started`);
  check(/M7/.test(await page.locator('.title-ver').innerText()), `${V.name}: the title carries the M7 tag`);
  await shot('title');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  const card = await page.locator('.carry-card').innerText();
  check(/Milestone 4\.5 journey carries over/i.test(card) && /East, to the mountains/.test(card) && /\b999\b/.test(card) && /Dusthaven/.test(card), `${V.name}: the card is the Milestone 4.5 one, with its gold and where you wake`);
  await shot('carry-card');
  await click('.carry-go');
  await waitScreen('world');
  let s = await store();
  check(s.live === null && s.mark === null && await page.evaluate(() => window.__app.adopting), `${V.name}: "Walk on" holds the carried game in memory (nothing written)`);
  await page.evaluate(() => { for (const d of ['s', 'n', 'e', 'w']) { const ev = window.__world.step(d, 1); if (ev.some(e => e.t === 'step')) break; } });
  await page.waitForTimeout(400);
  s = await store();
  const live = s.live && JSON.parse(s.live);
  check(!!live && live.version === SAVE_VERSION && live.gold === 999 && s.mark === '1', `${V.name}: the first step writes this milestone's own save from the Milestone 4.5 one`);
  await untouched('after the carry-over');

  await page.evaluate(() => window.__app.go('settings', { from: 'world' }));
  await waitScreen('settings');
  check(await page.locator('.set-m45').count() === 1 && await page.locator('.set-m4').count() === 1 && await page.locator('.set-m3').count() === 1 && await page.locator('.set-m2').count() === 1, `${V.name}: Settings lists the Milestone 4.5, Milestone 4, Milestone 3 and M2 saves`);
  await click('.set-m45 button:has-text("Export M4.5 backup (AETH3)")');
  const m45code = await page.locator('.code-m45 textarea').inputValue();
  const decoded = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0))), m45code);
  check(/^AETH3\./.test(m45code) && decoded === M45_SAVE, `${V.name}: "Export M4.5 backup" gives the Milestone 4.5 save byte for byte`);
  const kept = await store();
  await click('.set-m45 button:has-text("Carry over my M4.5 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-no');
  await page.waitForTimeout(300);
  const still = await store();
  check(still.live === kept.live && still.bak === kept.bak, `${V.name}: "Not yet" on "Carry over my M4.5 save" changes nothing`);
  await click('.set-m45 button:has-text("Carry over my M4.5 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  check(s.bak === kept.live && JSON.parse(s.live).gold === 999, `${V.name}: carrying it over again backs the live save up first`);
  await untouched('after carrying it over again');
  await reloadKept(page, V, 'the Milestone 4.5 profile'); // a reload, not a second goto (see the Milestone 3 profile)
  const seen = await page.evaluate(() => ({
    cont: document.querySelectorAll('.title-continue').length, carry: document.querySelectorAll('.title-carry').length,
    live: !!localStorage.getItem('aethermoor.save.m7'), mark: localStorage.getItem('aethermoor.m7.started'), screen: document.getElementById('app').dataset.screen,
  }));
  check(seen.cont === 1 && seen.carry === 0, `${V.name}: after a reload the title continues this milestone's save (${JSON.stringify(seen)})`);
  await untouched('after a reload');

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the Milestone 4.5 profile (${real.join(' | ')})`);
  await context.close();
}

// ======== N. a Milestone 5 profile: the M5 save (and the M4.5, M4, M3 and M2 saves before it) on the device ========
async function runM5(V) {
  console.log(`\n== ${V.name} Milestone 5 profile`);
  const { context, page, errors, failed } = await openPage(V, { seedV1: V1_SAVE, seedV2: V2_SAVE, seedM4: M4_SAVE, seedM45: M45_SAVE, seedM5: M5_SAVE });
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(x => document.getElementById('app').dataset.screen === x, name, { timeout }); await page.waitForTimeout(200); };
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); };
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'), m4: localStorage.getItem('aethermoor.save.m4'),
    m4mark: localStorage.getItem('aethermoor.m4.started'), m4bak: localStorage.getItem('aethermoor.save.m4.bak'),
    m45: localStorage.getItem('aethermoor.save.m4.5'), m45mark: localStorage.getItem('aethermoor.m4.5.started'), m45bak: localStorage.getItem('aethermoor.save.m4.5.bak'),
    m5: localStorage.getItem('aethermoor.save.m5'), m5mark: localStorage.getItem('aethermoor.m5.started'), m5bak: localStorage.getItem('aethermoor.save.m5.bak'),
    m6: localStorage.getItem('aethermoor.save.m6'), m6mark: localStorage.getItem('aethermoor.m6.started'), m6bak: localStorage.getItem('aethermoor.save.m6.bak'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
  }));
  const untouched = async label => {
    const st = await store();
    check(st.v1 === V1_SAVE && st.m3 === V2_SAVE && st.m4 === M4_SAVE && st.m4mark === null && st.m4bak === null && st.m45 === M45_SAVE && st.m45mark === '1' && st.m45bak === null && st.m5 === M5_SAVE && st.m5mark === '1' && st.m5bak === null && st.m6 === null && st.m6mark === null && st.m6bak === null,
      `${V.name}: the M2, Milestone 3, 4, 4.5 and 5 saves (and the M4.5 and M5 markers) are byte-identical, and nothing of Milestone 4's, 4.5's, 5's or 6's is written (${label})`);
  };
  const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(outDir, `${V.name}-m5-${name}.png`) }); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from Milestone 5/.test(await page.locator('.title-carry').innerText()), `${V.name}: the Milestone 5 save is offered first ("Continue from Milestone 5"), though the M5 file marked it started`);
  check(/M7/.test(await page.locator('.title-ver').innerText()), `${V.name}: the title carries the M7 tag`);
  await shot('title');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  const card = await page.locator('.carry-card').innerText();
  check(/Milestone 5 journey carries over/i.test(card) && /Down into the fen/.test(card) && /\b1,?111\b/.test(card) && /Peak/.test(card), `${V.name}: the card is the Milestone 5 one, with its gold and where you wake`);
  await shot('carry-card');
  await click('.carry-go');
  await waitScreen('world');
  let s = await store();
  check(s.live === null && s.mark === null && await page.evaluate(() => window.__app.adopting), `${V.name}: "Walk on" holds the carried game in memory (nothing written)`);
  await page.evaluate(() => { for (const d of ['s', 'n', 'e', 'w']) { const ev = window.__world.step(d, 1); if (ev.some(e => e.t === 'step')) break; } });
  await page.waitForTimeout(400);
  s = await store();
  const live = s.live && JSON.parse(s.live);
  check(!!live && live.version === SAVE_VERSION && live.gold === 1111 && s.mark === '1', `${V.name}: the first step writes this milestone's own save from the Milestone 5 one`);
  await untouched('after the carry-over');

  // M6: the Codex's Page IV (the Gloomfen) is open in the carried-over journey: its pockets and reward from the data,
  // and, the third council not yet sat, what opens its road (the fen stair)
  await page.evaluate(() => window.__app.go('codex', { from: 'world', page: 'gloomfen' }));
  await waitScreen('codex');
  const IV = PAGES.find(P => P.id === 'gloomfen');
  const nIV = Object.values(RELICS).filter(r => r.codex >= IV.from && r.codex <= IV.to).length;
  const cx = await page.evaluate(() => ({
    tab: document.querySelector('.cx-tab[aria-selected="true"]')?.dataset.page, tabs: document.querySelectorAll('.cx-tab').length, sealed: document.querySelectorAll('.cx-tab.is-sealed, .cx-sealed').length,
    pockets: document.querySelectorAll('.pocket').length, prog: document.querySelector('.cx-prog')?.textContent || '', reward: document.querySelector('.cx-reward')?.textContent || '', road: document.querySelector('.cx-road')?.textContent || '',
  }));
  check(cx.tab === 'gloomfen' && cx.tabs === PAGES.length && !cx.sealed && nIV === 14 && cx.pockets === nIV && new RegExp(`0 of ${nIV} claimed`).test(cx.prog) && cx.reward.includes(IV.reward.name),
    `${V.name}: the Codex's Page IV shows in the carried-over journey: ${cx.pockets} pockets, "${cx.prog}", ${IV.reward.name}`);
  check(/fen stair/.test(cx.road), `${V.name}: Page IV says what opens the Gloomfen's road ("${cx.road}")`);
  await shot('codex-IV');
  await page.evaluate(() => window.__app.go('world'));
  await waitScreen('world');
  await untouched('after the Codex');

  await page.evaluate(() => window.__app.go('settings', { from: 'world' }));
  await waitScreen('settings');
  check(await page.locator('.set-m5').count() === 1 && await page.locator('.set-m45').count() === 1 && await page.locator('.set-m4').count() === 1 && await page.locator('.set-m3').count() === 1 && await page.locator('.set-m2').count() === 1, `${V.name}: Settings lists the Milestone 5, Milestone 4.5, Milestone 4, Milestone 3 and M2 saves`);
  await click('.set-m5 button:has-text("Export M5 backup (AETH4)")');
  const m5code = await page.locator('.code-m5 textarea').inputValue();
  const decoded = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0))), m5code);
  check(/^AETH4\./.test(m5code) && decoded === M5_SAVE, `${V.name}: "Export M5 backup" gives the Milestone 5 save byte for byte`);
  const kept = await store();
  await click('.set-m5 button:has-text("Carry over my M5 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-no');
  await page.waitForTimeout(300);
  const still = await store();
  check(still.live === kept.live && still.bak === kept.bak, `${V.name}: "Not yet" on "Carry over my M5 save" changes nothing`);
  await click('.set-m5 button:has-text("Carry over my M5 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  check(s.bak === kept.live && JSON.parse(s.live).gold === 1111, `${V.name}: carrying it over again backs the live save up first`);
  await untouched('after carrying it over again');
  await reloadKept(page, V, 'the Milestone 5 profile'); // a reload, not a second goto (see the Milestone 3 profile)
  const seen = await page.evaluate(() => ({
    cont: document.querySelectorAll('.title-continue').length, carry: document.querySelectorAll('.title-carry').length,
    live: !!localStorage.getItem('aethermoor.save.m7'), mark: localStorage.getItem('aethermoor.m7.started'), screen: document.getElementById('app').dataset.screen,
  }));
  check(seen.cont === 1 && seen.carry === 0, `${V.name}: after a reload the title continues this milestone's save (${JSON.stringify(seen)})`);
  await untouched('after a reload');

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the Milestone 5 profile (${real.join(' | ')})`);
  await context.close();
}

// ======== O. a Milestone 6 profile: the M6 save (and the M5, M4.5, M4, M3 and M2 saves before it) on the device ========
async function runM6(V) {
  console.log(`\n== ${V.name} Milestone 6 profile`);
  const { context, page, errors, failed } = await openPage(V, { seedV1: V1_SAVE, seedV2: V2_SAVE, seedM4: M4_SAVE, seedM45: M45_SAVE, seedM5: M5_SAVE, seedM6: M6_SAVE });
  const waitScreen = async (name, timeout = 15000) => { await page.waitForFunction(x => document.getElementById('app').dataset.screen === x, name, { timeout }); await page.waitForTimeout(200); };
  const click = async sel => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); };
  const store = () => page.evaluate(() => ({
    v1: localStorage.getItem('aethermoor.save.v1'), m3: localStorage.getItem('aethermoor.save.v2'), m4: localStorage.getItem('aethermoor.save.m4'),
    m4mark: localStorage.getItem('aethermoor.m4.started'), m4bak: localStorage.getItem('aethermoor.save.m4.bak'),
    m45: localStorage.getItem('aethermoor.save.m4.5'), m45mark: localStorage.getItem('aethermoor.m4.5.started'), m45bak: localStorage.getItem('aethermoor.save.m4.5.bak'),
    m5: localStorage.getItem('aethermoor.save.m5'), m5mark: localStorage.getItem('aethermoor.m5.started'), m5bak: localStorage.getItem('aethermoor.save.m5.bak'),
    m6: localStorage.getItem('aethermoor.save.m6'), m6mark: localStorage.getItem('aethermoor.m6.started'), m6bak: localStorage.getItem('aethermoor.save.m6.bak'),
    live: localStorage.getItem('aethermoor.save.m7'), bak: localStorage.getItem('aethermoor.save.m7.bak'),
    mark: localStorage.getItem('aethermoor.m7.started'),
  }));
  const untouched = async label => {
    const st = await store();
    check(st.v1 === V1_SAVE && st.m3 === V2_SAVE && st.m4 === M4_SAVE && st.m4mark === null && st.m4bak === null && st.m45 === M45_SAVE && st.m45mark === '1' && st.m45bak === null
      && st.m5 === M5_SAVE && st.m5mark === '1' && st.m5bak === null && st.m6 === M6_SAVE && st.m6mark === '1' && st.m6bak === null,
      `${V.name}: the M2, Milestone 3, 4, 4.5, 5 and 6 saves (and the M4.5, M5 and M6 markers) are byte-identical, and nothing of Milestone 4's, 4.5's, 5's or 6's is written (${label})`);
  };
  const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(outDir, `${V.name}-m6-${name}.png`) }); };

  await page.goto(pathToFileURL(file).href);
  await page.waitForSelector('.title-menu');
  await page.waitForTimeout(600);
  check(await page.locator('.title-carry').count() === 1 && /Continue from Milestone 6/.test(await page.locator('.title-carry').innerText()), `${V.name}: the Milestone 6 save is offered first ("Continue from Milestone 6"), though the M6 file marked it started`);
  check(/M7/.test(await page.locator('.title-ver').innerText()), `${V.name}: the title carries the M7 tag`);
  await shot('title');
  await click('.title-carry');
  await page.waitForSelector('.carry-card');
  const card = await page.locator('.carry-card').innerText();
  check(/Milestone 6 journey carries over/i.test(card) && /Under the Keep/.test(card) && /\b1,?212\b/.test(card) && /Willowmurk/.test(card), `${V.name}: the card is the Milestone 6 one, with its gold and where you wake`);
  await shot('carry-card');
  await click('.carry-go');
  await waitScreen('world');
  let s = await store();
  check(s.live === null && s.mark === null && await page.evaluate(() => window.__app.adopting), `${V.name}: "Walk on" holds the carried game in memory (nothing written)`);
  await page.evaluate(() => { for (const d of ['s', 'n', 'e', 'w']) { const ev = window.__world.step(d, 1); if (ev.some(e => e.t === 'step')) break; } });
  await page.waitForTimeout(400);
  s = await store();
  const live = s.live && JSON.parse(s.live);
  check(!!live && live.version === SAVE_VERSION && live.gold === 1212 && live.ending === null && s.mark === '1', `${V.name}: the first step writes this milestone's own save from the Milestone 6 one, with the ending unchosen`);
  await untouched('after the carry-over');

  await page.evaluate(() => window.__app.go('settings', { from: 'world' }));
  await waitScreen('settings');
  check(await page.locator('.set-m6').count() === 1 && await page.locator('.set-m5').count() === 1 && await page.locator('.set-m45').count() === 1 && await page.locator('.set-m4').count() === 1
    && await page.locator('.set-m3').count() === 1 && await page.locator('.set-m2').count() === 1, `${V.name}: Settings lists the Milestone 6, 5, 4.5, 4, 3 and M2 saves`);
  await click('.set-m6 button:has-text("Export M6 backup (AETH5)")');
  const m6code = await page.locator('.code-m6 textarea').inputValue();
  const decoded = await page.evaluate(c => new TextDecoder().decode(Uint8Array.from(atob(c.slice(6)), ch => ch.charCodeAt(0))), m6code);
  check(/^AETH5\./.test(m6code) && decoded === M6_SAVE, `${V.name}: "Export M6 backup" gives the Milestone 6 save byte for byte`);
  const kept = await store();
  await click('.set-m6 button:has-text("Carry over my M6 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-no');
  await page.waitForTimeout(300);
  const still = await store();
  check(still.live === kept.live && still.bak === kept.bak, `${V.name}: "Not yet" on "Carry over my M6 save" changes nothing`);
  await click('.set-m6 button:has-text("Carry over my M6 save")');
  await page.waitForSelector('.carry-card');
  await click('.carry-go');
  await waitScreen('world');
  s = await store();
  check(s.bak === kept.live && JSON.parse(s.live).gold === 1212, `${V.name}: carrying it over again backs the live save up first`);
  await untouched('after carrying it over again');
  await reloadKept(page, V, 'the Milestone 6 profile'); // a reload, not a second goto (see the Milestone 3 profile)
  const seen = await page.evaluate(() => ({
    cont: document.querySelectorAll('.title-continue').length, carry: document.querySelectorAll('.title-carry').length,
    live: !!localStorage.getItem('aethermoor.save.m7'), mark: localStorage.getItem('aethermoor.m7.started'), screen: document.getElementById('app').dataset.screen,
  }));
  check(seen.cont === 1 && seen.carry === 0, `${V.name}: after a reload the title continues this milestone's save (${JSON.stringify(seen)})`);
  await untouched('after a reload');

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(fontOnly && /Failed to load resource/.test(e)));
  check(real.length === 0, `${V.name}: no console errors in the Milestone 6 profile (${real.join(' | ')})`);
  await context.close();
}

for (const V of VIEWPORTS) {
  for (const fn of [run, runM2, runM3, runM4, runM45, runM5, runM6]) {
    try { await fn(V); } catch (e) { fails.push(`${V.name}: ${e.message.split('\n')[0]}`); console.log('  ERROR', e.message.split('\n').slice(0, 6).join('\n')); }
  }
}
await browser.close();
console.log(fails.length ? `\nE2E FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nE2E passed');
process.exit(fails.length ? 1 : 0);
