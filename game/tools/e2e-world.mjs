// End-to-end test of the world screen (M3 spec §7 "e2e-world scenarios") in Chromium at phone
// (360x740, DPR 3, touch) and laptop (1280x800) sizes. Fails on any console error, page exception or
// [audio] warning, and prints the performance numbers (spec A7).
//
//   node tools/e2e-world.mjs                   # build into dist/, then run both viewports
//   node tools/e2e-world.mjs --no-build        # reuse dist/
//   node tools/e2e-world.mjs --only=phone      # one viewport (phone | laptop)
//   node tools/e2e-world.mjs --scenario=3,11   # some scenarios only
//   node tools/e2e-world.mjs --out=/tmp/shots  # where screenshots go (default: <tmp>/aeth-e2e-world)
//   AETH_HTML=/tmp/aeth-x/aethermoor.html node tools/e2e-world.mjs   # test a private build (A5)
//
// Scenarios:
//   1  new game: keep-intro plays, the d-pad (phone) or keys (laptop) walk, A talks to Fenwick, the Sneck
//      pre-fight card opens, a forced win, the card reveal, back in the world, the north gate open
//   2  walking: WASD / arrows, holding to run, no page scroll (the phone uses the d-pad and B)
//   3  a roaming pack contact starts a battle; fleeing stuns the roamer; a weak pack you catch is a full
//      battle (M4.5: no Routs): it starts with Auto off (even with an old Auto setting saved), the dice
//      tray shows, and after the win the pack is gone and the fight has paid
//   4  the thornwall lock prompt shows ✓/✗ and opens with a key
//   5  holding 450 ms on Old Snag opens the grey card (.ov .card.grey) and the codex is sighted
//   6  rest at the Milestone Fire; travel to Thornhollow from the fire (and through the Atlas when
//      the Atlas screen offers travel)
//   7  a forced Briarmaw win: the Brand banner, the crownwall sequence and the letter; th-crown-w opens
//   8  dialogue replaces the deck on the phone (docks over the canvas on the laptop); the Garret
//      contest odds chip is visible
//   9  temper at Hilda raises temper to 1 and the card number changes
//   10 no horizontal scroll at 360 px; reduced motion (instant dialogue text, the camera snaps)
//   11 performance: CDP 4x CPU throttle while walking the Hearth Road with 4 followers and roamers for
//      10 s. Prints p95 frame time and drawImage calls per frame (counted through a wrapped context).
//      Hard fail: p95 > 33 ms or > 60 drawImage per frame (A7); the target is 16 ms and 40. Then,
//      standing still with the packs in view stunned and those far off screen wandering, the loop
//      idles at 8-17 fps.
// M4 (spec §8, "e2e-world new scenarios"; P7b):
//   12 the Keep's south-east gate: sealed before Act I (the message, no map change); after Act I it
//      walks into the Sunward Road (the desert track plays), and the caravan wreck's forge loot toasts
//   13 Sandspire: rest at the Spire Hearth (kindled), Idris's shop opens from his "Buy gems.", the
//      board opens the Journal's bounties with Zara's Sandspire board, and the Atlas travels to the
//      Spire Hearth from the Keep through its Sunscorch view
//   14 a dune-glass wall: ✗ without a key, opened with Cinderfang's Melt Glass; the Glass Flats mirage
//      opened with the Knowledge key (Knowledge 5)
//   15 Kharzul's pre-fight card: the Champion, its pieces glinting (Cinderfang, the Glass Carapace),
//      and the Brand (blocked, not failed, while the card does not name it: P7a's sheet)
//   16 the Deep Shaft is dark without a light key (a Stillwater party), and lit by the Sunstone Lantern
//   17 performance on the Glass Flats (the biggest map), measured like 11
//   18 the Codex binder: Page I (24 pockets, 1 of 22 claimed, the reward greyed), the Page II tab (14),
//      the sealed Page III; after a forced full claim of Page I's relics its reward shows, in gold, and
//      an Awakened pocket glows
//   19 the Journal's Grudges tab (one active, one settled; a saved name stays text), its empty state;
//      a real Grudge pack seeded as a hunter shows a red "!" (emote '!hunt'); loot and Codex-page
//      toasts; the second council's title card, then the end-of-Act-II card naming Ironspire and Gloomfen
// Milestone 4.5 (docs/M45-SPEC.md §5):
//   20 a road gate: the first gate on the Hearth Road is shut; walking into it opens its guard's
//      pre-fight card; after the win it is open, no longer solid, and the party walks through
// M5 (docs/M5-SPEC.md §8, P7; counts come from the data):
//   21 the Keep's east postern: sealed until the second council (its text and what opens it; the Atlas
//      keeps a padlock on the Ironspire), then open onto the Rockslide Pass (its own track); the Atlas's
//      Ironspire view with every Ironspire Hearthfire and the Gloomfen's padlock alone
//   22 Peak's Veil: rest at the Cloister Fire (kindled); Mother Wynn opens the Highfold; with the Abbess at
//      rest the bell rings and the Veilbell is yours (its card)
//   23 a chasm (A reads Cross): ✗ without a key, crossed with the Windstep Boots; an ice wall (A reads Melt)
//      melted with the Anvil Heart
//   24 Mother Anvil's pre-fight card: the Champion, the Worldforge Hammer and the Anvil Heart glinting, and
//      the Brand of Iron
//   25 the Ironhold Deeps are dark without a light key (a Stillwater party), and lit by the Rime Crozier
//   26 performance on the Frost Road, measured like 11 (the M5 gate: p95 frame JS 16 ms, 40 drawImage)
//   27 the Stormwatch board in the Journal (Captain Ysolde's bounties); the third council's title card and end
//      card, "The Ironspire is yours", the Blackwater line, naming the Gloomfen Marsh (360 and 1280 wide)
// Screenshots use the real fonts when tools/e2e-flow.mjs has cached them (<tmp>/aethermoor-font-cache).
// Playwright is not a project dependency: it comes from the global npm root.
// Owner: WP7; M4 P7b (12-19); M5 P7 (21-27, and 18/19's Page III and Act II checks for M5).
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { MAPS } from '../src/data/maps/index.js';
import { tileOf } from '../src/data/tiles.js';
import { ENCOUNTERS, BRANDS } from '../src/data/encounters.js';
import { HEARTHS, REGIONS, LORE, BRAND_TOTAL } from '../src/data/world.js';
import { LOCKS } from '../src/data/locks.js';
import { RELICS } from '../src/data/relics.js';
import { PAGES } from '../src/data/codex.js';
import { BOUNTIES } from '../src/data/quests.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
const outDir = path.resolve(args.out && args.out !== true ? args.out : path.join(os.tmpdir(), 'aeth-e2e-world'));
mkdirSync(outDir, { recursive: true });
const only = args.scenario ? new Set(String(args.scenario).split(',').map(Number)) : null;
const want = n => !only || only.has(n);

// M4.5: where the road meets a gate: a tile next to it that the road's start reaches while it is shut
// (with its guard standing), and the way to face it. Terrain and fixed things are walls.
function approachOf(mapId, gateId) {
  const map = MAPS[mapId];
  const road = (map.roads || []).find(r => r.gates.includes(gateId));
  const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
  const gate = map.entities.find(e => e.id === gateId);
  const guard = gate.guard && map.entities.find(e => e.kind === 'encounter' && e.enc === gate.guard);
  const wall = new Uint8Array(map.w * map.h);
  const put = a => { for (let y = a[1]; y <= a[3]; y++) for (let x = a[0]; x <= a[2]; x++) wall[y * map.w + x] = 1; };
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (tileOf(map.rows[y][x]).solid) wall[y * map.w + x] = 1;
  for (const e of map.entities) if (!['trigger', 'light', 'encounter'].includes(e.kind) && !(e.kind === 'prop' && !e.solid)) put(areaOf(e));
  if (guard) put(areaOf(guard));
  const [fx, fy] = map.anchors[road.from];
  const seen = new Uint8Array(map.w * map.h), q = [[fx, fy]];
  seen[fy * map.w + fx] = 1;
  for (let i = 0; i < q.length; i++) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = q[i][0] + dx, ny = q[i][1] + dy, k = ny * map.w + nx;
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h || seen[k] || wall[k]) continue;
      seen[k] = 1; q.push([nx, ny]);
    }
  }
  const [x0, y0, x1, y1] = areaOf(gate);
  for (const [x, y, face] of [[Math.round((x0 + x1) / 2), y1 + 1, 'n'], [Math.round((x0 + x1) / 2), y0 - 1, 's'], [x0 - 1, Math.round((y0 + y1) / 2), 'e'], [x1 + 1, Math.round((y0 + y1) / 2), 'w']]) {
    if (x >= 0 && y >= 0 && x < map.w && y < map.h && seen[y * map.w + x]) return { x, y, face };
  }
  return null;
}

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

// Google Fonts from the cache tools/e2e-flow.mjs fills (read only here); without it the pages fall back
// to system fonts, which is fine for every check.
function cachedFonts() {
  const dir = path.join(os.tmpdir(), 'aethermoor-font-cache');
  try {
    let css = readFileSync(path.join(dir, 'fonts.css'), 'utf8');
    css = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter(b => /^\/\* latin(-ext)? \*\//.test(b)).join('');
    const files = {};
    for (const [, u] of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
      const f = path.join(dir, u.replace(/[^a-z0-9.]+/gi, '_'));
      if (existsSync(f)) files[u] = f;
    }
    return Object.keys(files).length ? { css, files } : null;
  } catch { return null; }
}
const fonts = cachedFonts();

const fails = [], blocked = [], perfLines = [];
function check(cond, msg) { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } else console.log('  ok', msg); return !!cond; }
function block(msg) { blocked.push(msg); console.log('  BLOCKED', msg); }

// ---- page setup: the app handle, forced battle results, and a drawImage counter on the world canvas ----
function initScript() {
  window.__aethTest = app => {
    window.__app = app;
    const go = app.go;
    app.go = (name, p = {}) => {
      const force = window.__forceResult;
      if (name === 'battle') window.__lastBattle = p.battle;
      if (name === 'battle' && force) {
        if (!force.sticky) window.__forceResult = null;
        const b = structuredClone(p.battle);
        if (force.result === 'defeat') for (const u of Object.values(b.units)) if (u.side === 'hero') { u.hp = 0; u.ko = true; }
        if (force.result === 'victory') for (const u of Object.values(b.units)) if (u.side === 'foe') { u.hp = 0; u.ko = true; }
        b.ended = { result: force.result, xp: force.xp || 0, gold: force.gold || 0, drops: force.drops || [], claimed: force.claimed || [], consumables: {} };
        return go('aftermath', { battle: b, returnTo: p.returnTo || 'world' });
      }
      return go(name, p);
    };
  };
  const C2D = window.CanvasRenderingContext2D;
  const orig = C2D.prototype.drawImage;
  window.__draws = 0;
  C2D.prototype.drawImage = function (...a) {
    if (this.canvas && this.canvas.classList && this.canvas.classList.contains('world-canvas')) window.__draws++;
    return orig.apply(this, a);
  };
  // sample the counter once per animation frame: the delta is one world frame's drawImage calls
  window.__drawSamples = [];
  let last = 0;
  const sample = () => { const d = window.__draws - last; last = window.__draws; if (window.__sampling && d) window.__drawSamples.push(d); requestAnimationFrame(sample); };
  requestAnimationFrame(sample);
}

async function run(V) {
  console.log(`\n== ${V.name} ${V.viewport.width}x${V.viewport.height}`);
  const context = await browser.newContext({ viewport: V.viewport, deviceScaleFactor: V.deviceScaleFactor, isMobile: !!V.isMobile, hasTouch: !!V.hasTouch, ignoreHTTPSErrors: true });
  if (fonts) {
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fonts.css }));
    await context.route('https://fonts.gstatic.com/**', r => { const f = fonts.files[r.request().url()]; return f ? r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(f) }) : r.abort(); });
  }
  await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [], failed = [];
  page.on('console', m => { if (m.type() === 'error' || /^\[audio\]/.test(m.text()) || /^\[world\]/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => failed.push(r.url()));
  const P = V.name;
  const phone = V.name === 'phone';
  let n = 0;
  const shot = async name => { await page.waitForTimeout(120); await page.screenshot({ path: path.join(outDir, `${P}-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const screen = () => page.evaluate(() => document.getElementById('app').dataset.screen);
  const state = () => page.evaluate(() => window.__world && window.__world.state());
  const W = (fn, arg) => page.evaluate(fn, arg);
  const teleport = async (map, x, y, face) => { await W(([m, a, b, f]) => window.__world.teleport(m, a, b, f), [map, x, y, face]); await page.waitForTimeout(80); };
  // stand next to a map entity and face it (positions come from the map data, which WP3 may nudge)
  const standBy = async (map, id, prefer) => {
    const spot = await W(([m, i, p]) => window.__worldTools.standBy(m, i, p || undefined), [map, id, prefer || null]);
    if (!spot) throw new Error(`no entity ${id} on ${map}`);
    await teleport(map, spot.x, spot.y, spot.face);
    return spot;
  };
  const pressA = async () => {
    if (phone) { const b = await page.$eval('.w-a', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await page.mouse.move(b[0], b[1]); await page.mouse.down(); await page.mouse.up(); }
    else await page.keyboard.press('z');
  };
  // walk: hold the d-pad arm (phone) or a key (laptop) for ms
  const hold = async (dir, ms, { run = false } = {}) => {
    if (phone) {
      const r = await page.$eval('.w-dpad', e => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width]; });
      const off = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[dir];
      let bb = null;
      if (run) {
        bb = await page.$eval('.w-b', e => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
        await W(([x, y]) => { const b = document.querySelector('.w-b'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 77, pointerType: 'touch', clientX: x, clientY: y, isPrimary: false })); }, bb);
      }
      await page.mouse.move(r[0], r[1]); await page.mouse.down();
      await page.mouse.move(r[0] + off[0] * r[2] * 0.36, r[1] + off[1] * r[2] * 0.36, { steps: 3 });
      await page.waitForTimeout(ms);
      await page.mouse.up();
      if (run) await W(([x, y]) => { const b = document.querySelector('.w-b'); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 77, pointerType: 'touch', clientX: x, clientY: y, isPrimary: false })); }, bb);
    } else {
      const key = { n: 'KeyW', s: 'KeyS', e: 'KeyD', w: 'KeyA' }[dir];
      if (run) await page.keyboard.down('Shift');
      await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
      if (run) await page.keyboard.up('Shift');
    }
    await page.waitForTimeout(220);
  };
  // play the open dialogue to its end, choosing a choice whose text matches `pick` (or the last one)
  const playDialogue = async (pick = /Leave|Not yet/i, max = 30) => {
    for (let i = 0; i < max; i++) {
      if (!(await page.$('.ov-dialogue'))) return true;
      const choices = await page.$$('.dlg-choice');
      if (choices.length) {
        let chosen = null;
        for (const c of choices) if (pick.test(await c.innerText())) { chosen = c; break; }
        await (chosen || choices[choices.length - 1]).click();
      } else await page.click('.dlg-next').catch(() => {});
      await page.waitForTimeout(160);
    }
    return !(await page.$('.ov-dialogue'));
  };
  const closeOverlays = async () => {
    for (let i = 0; i < 12; i++) {
      if (await page.$('.ov-dialogue')) { await playDialogue(); continue; }
      const btn = await page.$('.ov [data-primary]:not([disabled]), .ov .cont');
      if (!btn) break;
      await btn.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  };
  // a fresh game in the world: patch(game) runs in the page to set it up
  const setup = async ({ starter = 'hearthbrand', seed = 11, patch = null, arrive = 'new' } = {}) => {
    await page.goto(pathToFileURL(file).href);
    await page.waitForSelector('.title-menu');
    await W(([s, sd, p, arr]) => {
      let g = window.__worldTools.newGame({ name: 'Wren', starter: s, seed: sd });
      if (p) g = (0, eval)(`(${p})`)(g, window.__worldTools) || g;
      (window.__app.replaceGame || window.__app.setGame)(g);
      window.__app.go('world', arr ? { arrive: arr } : {});
    }, [starter, seed, patch ? patch.toString() : null, arrive]);
    await page.waitForSelector('.screen-world .world-canvas');
    await page.waitForTimeout(250);
  };
  const levelUp = `(g, T) => { for (const id of g.party.active) { const h = g.party.roster[id]; h.level = LVL; for (const d of Object.values(h.domains || {})) d.level = Math.max(d.level, LVL); } return g; }`;
  const noIntro = `(g) => { g.progress.flags.story['intro-done'] = true; g.progress.flags.done['keep-vault'] = true; g.progress.flags.cleared['keep-vault'] = true; return g; }`;
  const combine = (...fns) => `(g, T) => { ${fns.map((f, i) => `g = (${f})(g, T) || g;`).join(' ')} return g; }`;
  // M4.5: every fight holding a road on these maps already won (beaten and cleared, so the gates stand
  // open and the guards are gone), for the scenarios about walking rather than fighting
  const roadsWon = (...maps) => {
    const ids = maps.flatMap(m => (MAPS[m].roads || []).flatMap(r => r.gates)).map(id => Object.values(MAPS).flatMap(m => m.entities).find(e => e.id === id))
      .flatMap(g => [g.guard, ...Object.values(g.open || {}).filter(v => typeof v === 'string')]).filter(id => id && ENCOUNTERS[id]);
    const won = JSON.stringify(Object.fromEntries(ids.map(id => [id, 1]))), cleared = JSON.stringify(Object.fromEntries(ids.map(id => [id, true])));
    return `(g) => { Object.assign(g.progress.flags.beaten, ${won}); Object.assign(g.progress.flags.cleared, ${cleared}); return g; }`;
  };

  // ================= 1. new game ===================================================================
  if (want(1)) {
    console.log(' -- 1 new game');
    try {
      await setup({ starter: 'hearthbrand', seed: 11 });
      await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 4000 });
      await page.waitForTimeout(400);
      check(/vault/i.test(await page.innerText('.ov-dialogue')), `${P} 1: keep-intro plays on a new game`);
      await shot('intro');
      await playDialogue();
      const s0 = await state();
      await hold('s', 520);
      const s1 = await state();
      check(s1.y > s0.y, `${P} 1: the ${phone ? 'd-pad' : 'keyboard'} walks (${s0.y} -> ${s1.y})`);
      await standBy('keep-hall', 'fenwick', ['s']);
      await pressA();
      await page.waitForSelector('.ov-dialogue .dlg-name', { timeout: 3000 });
      check(/fenwick/i.test(await page.innerText('.ov-dialogue .dlg-name')), `${P} 1: A talks to Fenwick`);
      await shot('fenwick');
      await playDialogue(/Leave/);
      const sneck = await standBy('keep-hall', 'keep-vault', ['w']);
      await pressA();
      await page.waitForSelector('.ov-prefight', { timeout: 3000 });
      const pf = await page.innerText('.ov-prefight');
      check(/Sneck/i.test(pf) && /Fight/.test(pf), `${P} 1: the Sneck pre-fight card opens`);
      check(/easy|fair|hard|deadly/i.test(pf), `${P} 1: the threat is a word, not only a colour`);
      await shot('prefight');
      await W(() => { window.__forceResult = { result: 'victory', xp: 30, gold: 12, claimed: [window.__worldTools.relicItem('wardens-seal', 'Sneck the Tallyman')] }; });
      await page.click('.pf-fight');
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath');
      const chest = await page.$('.af-loot .chest');
      if (chest) {
        await chest.click();
        await page.waitForSelector('.ov-reveal .card', { timeout: 8000 });
        check(true, `${P} 1: the card reveal plays`);
        await shot('reveal');
        await page.click('.ov-reveal .cont');
        await page.waitForTimeout(300);
      } else check(false, `${P} 1: the forced win has a chest to open`);
      for (let i = 0; i < 4 && (await screen()) === 'aftermath'; i++) { await page.click('.af-foot .btn.primary'); await page.waitForTimeout(300); await closeOverlays(); }
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 4000 });
      check(true, `${P} 1: back in the world after the battle`);
      await closeOverlays();
      const gate = await W(() => window.__world.entity('keep', 'keep-n-gate'));
      check(gate && gate.state === 'open', `${P} 1: the Keep's north gate is open (${gate && gate.state})`);
      const ss = await state();
      check(ss.map === 'keep-hall' && ss.x === sneck.x && ss.y === sneck.y, `${P} 1: the party is where it stood (${ss.map} ${ss.x},${ss.y})`);
    } catch (e) { check(false, `${P} 1: ${e.message.split('\n')[0]}`); }
  }

  // ================= 2. walking and running ===========================================================
  if (want(2)) {
    console.log(' -- 2 walking');
    try {
      await setup({ patch: combine(noIntro, roadsWon('hearth-road')) });
      await teleport('hearth-road', 13, 66, 'n');
      await W(() => window.__world.roam([]));
      const a = await state();
      await hold('n', 800);
      const b = await state();
      const walked = a.y - b.y;
      await hold('s', 800, { run: true });
      const c = await state();
      const ran = c.y - b.y;
      // the step length is exact (distances vary with how long a loaded machine really holds the key)
      check(walked >= 3 && b.stepMs === 160, `${P} 2: walking: ${walked} tiles in 0.8 s, ${b.stepMs} ms a step`);
      check(ran >= 3 && c.stepMs === 110, `${P} 2: running: ${ran} tiles in 0.8 s, ${c.stepMs} ms a step`);
      if (!phone) {
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
        await page.keyboard.down('ArrowLeft'); await page.keyboard.up('ArrowLeft');
        await page.waitForTimeout(300);
        const scroll = await W(() => [window.scrollX, window.scrollY, document.scrollingElement.scrollTop]);
        check(scroll.every(v => v === 0), `${P} 2: arrow keys never scroll the page (${scroll})`);
        const d = await state();
        check(d.y < c.y && d.face === 'w', `${P} 2: arrows walk, and a tap turns in place (${d.x},${d.y} ${d.face})`);
        // blur clears the held set
        await page.keyboard.down('KeyW'); await page.waitForTimeout(250);
        await W(() => window.dispatchEvent(new Event('blur')));
        const e1 = await state(); await page.waitForTimeout(500); const e2 = await state();
        await page.keyboard.up('KeyW');
        check(e2.y >= e1.y - 1, `${P} 2: blur clears the held keys`);
      } else {
        const scroll = await W(() => [window.scrollX, window.scrollY]);
        check(scroll.every(v => v === 0), `${P} 2: the page never scrolls while walking`);
      }
      // tap (click) a tile: the party walks there by findPath
      await teleport('hearth-road', 13, 64, 'n');
      await W(() => window.__world.roam([]));
      const to = await W(() => window.__world.screenOf(13, 61));
      await page.mouse.click(to[0], to[1]);
      await page.waitForFunction(() => { const s = window.__world.state(); return s.y === 61 && !s.moving; }, null, { timeout: 4000 }).catch(() => {});
      const tw = await state();
      check(tw.x === 13 && tw.y === 61, `${P} 2: tapping the map walks there (${tw.x},${tw.y})`);
      await shot('walking');
    } catch (e) { check(false, `${P} 2: ${e.message.split('\n')[0]}`); }
  }

  // ================= 3. packs: contact, flee, stun; a weak pack caught is a full battle ====================
  if (want(3)) {
    console.log(' -- 3 packs');
    try {
      await setup({ patch: noIntro });
      await teleport('hearth-road', 13, 66, 'n');
      let st = await state();
      const real = st.roamers.length > 0;
      if (!real) block(`${P} 3: no roamers on the Hearth Road (rules/world.js roamers, WP1): using a synthetic pack`);
      // put one pack right in front of the party
      await W(real => {
        const s = window.__world.state();
        const cur = window.__world.walkRoamers();
        const r = real ? { ...cur[0] } : { id: 'e2e-pack', enc: null, zone: 'hearth-road', spawns: [{ family: 'cutpurse', level: 2, gearTier: 0, omens: [] }, { family: 'thornhound', level: 2, gearTier: 0, omens: [] }], lead: { family: 'cutpurse', variant: null, art: 'cutpurse', gearTier: 0, count: 2 }, home: [13, 62], leash: 4, mood: 'wander', wait: 0, weak: false, trackless: true };
        r.x = s.x; r.y = s.y - 1; r.face = 's'; r.mood = 'wander'; r.weak = false;
        window.__world.roam([r]);
      }, real);
      st = await state();
      const target = st.roamers[0];
      await W(() => { window.__forceResult = { result: 'fled' }; });
      await W(() => window.__world.press('n'));
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath', null, { timeout: 5000 });
      check(true, `${P} 3: walking into a pack starts a battle (${target.id})`);
      const lb = await W(() => window.__lastBattle && window.__lastBattle.ctx);
      check(lb && lb.patrol !== undefined, `${P} 3: the battle carries the patrol ctx (${lb && lb.where})`);
      for (let i = 0; i < 4 && (await screen()) === 'aftermath'; i++) { await page.click('.af-foot .btn.primary'); await page.waitForTimeout(300); }
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 4000 });
      const back = await state();
      const r2 = back.roamers.find(r => r.id === target.id);
      check(r2 && r2.mood === 'stunned', `${P} 3: after fleeing, the pack is stunned (${r2 && r2.mood})`);
      check(back.grace > 0, `${P} 3: grace after the battle (${back.grace})`);
      await shot('stunned');
      // a weak pack (M4.5: no Routs): the party is far above it, and catching it is a full battle
      await W(lvl => {
        const g = window.__world.game();
        const g2 = structuredClone(g);
        for (const id of g2.party.active) g2.party.roster[id].level = lvl;
        window.__app.setGame(g2);
        window.__app.go('world');
      }, 12);
      await page.waitForSelector('.screen-world .world-canvas');
      await W(() => {
        const s = window.__world.state();
        window.__world.roam([{ id: 'e2e-weak', enc: null, zone: 'hearth-road', spawns: [{ family: 'cutpurse', level: 1, gearTier: 0, omens: [] }, { family: 'cutpurse', level: 1, gearTier: 0, omens: [] }], lead: { family: 'cutpurse', variant: null, art: 'cutpurse', gearTier: 0, count: 2 }, x: s.x, y: s.y - 1, home: [s.x, s.y - 1], leash: 4, face: 's', mood: 'flee', wait: 0, weak: true, trackless: true }]);
      });
      const gold0 = await W(() => window.__world.game().gold);
      // a tester who switched Auto on in an earlier milestone (every file shares the settings key)
      await W(() => window.__app.setSettings({ battleAuto: true }));
      await W(() => window.__world.face('n'));
      await W(() => window.__world.press('n'));
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'battle', null, { timeout: 5000 });
      check(!(await page.$('.ov-spoils')), `${P} 3: walking into a weak pack starts a full battle, not a Rout`);
      const lb2 = await W(() => window.__lastBattle && window.__lastBattle.ctx);
      check(lb2 && lb2.caught === true, `${P} 3: the battle knows the pack was run down (ctx.caught, for the Rout deed)`);
      check((await page.getAttribute('.bt-auto', 'aria-pressed')) === 'false', `${P} 3: the fight starts with Auto off, even with an old Auto setting saved`);
      await shot('caught-battle');
      await page.click('.bt-auto');
      await page.waitForFunction(() => { const t = document.querySelector('.bt-tray'); return (t && !t.hidden) || document.getElementById('app').dataset.screen !== 'battle'; }, null, { timeout: 20000 });
      check(await page.evaluate(() => { const t = document.querySelector('.bt-tray'); return !!t && !t.hidden; }), `${P} 3: the dice tray shows the rolls`);
      await shot('caught-dice');
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath', null, { timeout: 90000 });
      for (let i = 0; i < 12 && (await screen()) !== 'world'; i++) {
        // a chest's reveal plays first; its Continue arrives with the card
        if (await page.$('.ov-reveal')) { await page.waitForSelector('.ov-reveal .cont', { timeout: 8000 }); await page.click('.ov-reveal .cont'); }
        else if (await page.$('.af-foot .btn.primary')) await page.click('.af-foot .btn.primary');
        await page.waitForTimeout(350);
      }
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 8000 });
      const after = await state();
      const gold1 = await W(() => window.__world.game().gold);
      check(!after.roamers.some(r => r.id === 'e2e-weak'), `${P} 3: the beaten pack is gone`);
      check(gold1 > gold0, `${P} 3: the fight paid gold (${gold0} -> ${gold1})`);
    } catch (e) { check(false, `${P} 3: ${e.message.split('\n')[0]}`); }
  }

  // ================= 4. the thornwall lock ============================================================
  if (want(4)) {
    console.log(' -- 4 thornwall');
    try {
      await setup({ patch: noIntro });
      await standBy('thornway', 'tw-thornwall', ['s']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-lock', { timeout: 3000 });
      const t1 = await page.innerText('.ov-lock');
      check(/Thornwall/.test(t1) && /✗/.test(t1), `${P} 4: the thornwall prompt lists the keys with ✗`);
      check(/Physical 3/.test(t1), `${P} 4: the Domain key is named (Physical 3)`);
      await shot('lock-shut');
      await page.click('.ov-lock [data-primary]');
      await page.waitForTimeout(200);
      // give the party the Thornsplitter
      await W(() => {
        const g = structuredClone(window.__world.game());
        g.inventory.push(window.__worldTools.relicItem('thornsplitter', 'Old Snag'));
        g.codex.thornsplitter = { sighted: true, claimed: true, awakened: false };
        window.__app.setGame(g); window.__app.go('world');
      });
      await page.waitForSelector('.screen-world .world-canvas');
      await page.waitForTimeout(200);
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-lock', { timeout: 3000 });
      const t2 = await page.innerText('.ov-lock');
      check(/✓/.test(t2) && /Thornsplitter/.test(t2), `${P} 4: with the Thornsplitter the prompt shows ✓`);
      await shot('lock-key');
      const use = await page.$('.ov-lock .lock-use');
      check(!!use && /Thornsplitter/.test(await use.innerText()), `${P} 4: "Use (Thornsplitter)"`);
      if (use) await use.click();
      await page.waitForTimeout(300);
      const unlocked = await W(() => !!window.__world.game().progress.flags.unlocked?.['tw-thornwall']);
      check(unlocked, `${P} 4: the thornwall opens`);
      const s0 = await state();
      await hold('n', 380);
      const s1 = await state();
      check(s1.y < s0.y, `${P} 4: the way north is open (${s0.y} -> ${s1.y})`);
    } catch (e) { check(false, `${P} 4: ${e.message.split('\n')[0]}`); }
  }

  // ================= 5. hold to inspect Old Snag =========================================================
  if (want(5)) {
    console.log(' -- 5 hold to inspect');
    try {
      await setup({ patch: noIntro });
      const snag = await W(() => window.__worldTools.entityOf('thornway', 'snag-wallow'));
      await teleport('thornway', snag.at[0] - 3, snag.at[1], 'e');
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(200);
      const pt = await W(([x, y]) => window.__world.screenOf(x, y), snag.at);
      await page.mouse.move(pt[0], pt[1]);
      await page.mouse.down();
      await page.waitForTimeout(650);
      await page.mouse.up();
      await page.waitForSelector('.ov .card.grey', { timeout: 3000 });
      check(true, `${P} 5: holding on Old Snag opens the grey card`);
      await shot('grey-card');
      const sighted = await W(() => !!window.__world.game().codex?.thornsplitter?.sighted);
      check(sighted, `${P} 5: the codex has the Thornsplitter sighted`);
      await closeOverlays();
      const plate = await page.$('.w-plate');
      check(!!plate && /Old Snag/.test(await plate.innerText()) && /Lv \d+/.test(await plate.innerText()), `${P} 5: Old Snag's nameplate shows within 5 tiles`);
    } catch (e) { check(false, `${P} 5: ${e.message.split('\n')[0]}`); }
  }

  // ================= 6. rest and travel =============================================================
  if (want(6)) {
    console.log(' -- 6 rest and travel');
    try {
      await setup({ patch: combine(noIntro, `(g) => { g.progress.flags.kindled.thornhollow = true; for (const id of g.party.active) g.party.roster[id].hp = 1; return g; }`) });
      const hf = await W(() => window.__worldTools.hearth('milestone-fire'));
      await teleport(hf.map, hf.x, hf.y, hf.face);
      await W(() => window.__world.roam([]));
      const day0 = await W(() => window.__world.game().progress.flags.day);
      if (phone) await pressA();
      else {
        // the keyboard and screen-reader path: the Nearby list walks there and uses it
        const near = await page.$$eval('.w-near-btn', bs => bs.map(b => b.innerText));
        check(near.some(t => /Rest at/.test(t)), `${P} 6: the Nearby list offers the fire (${near.join(' | ').replace(/\n/g, ' ')})`);
        for (const x of await page.$$('.w-near-btn')) if (/Rest at/.test(await x.innerText())) { await x.focus(); await page.keyboard.press('Enter'); break; }
      }
      await page.waitForSelector('.ov-hearth', { timeout: 3000 });
      await shot('hearth');
      await page.click('.ov-hearth [data-primary]');
      await page.waitForTimeout(300);
      const g = await W(() => { const g = window.__world.game(); return { day: g.progress.flags.day, hp: g.party.active.map(id => g.party.roster[id].hp), last: g.progress.lastHearthfire, kindled: !!g.progress.flags.kindled['milestone-fire'] }; });
      check(g.day === day0 + 1 && g.hp.every(h => h > 1), `${P} 6: resting heals and starts a new day (day ${day0} -> ${g.day})`);
      check(g.last === 'milestone-fire' && g.kindled, `${P} 6: the Milestone Fire is the last Hearthfire and kindled`);
      await pressA();
      await page.waitForSelector('.ov-hearth', { timeout: 3000 });
      await page.click('.ov-hearth .hearth-acts .btn:nth-child(2)');
      await page.waitForSelector('.hearth-to[data-hearth="thornhollow"]', { timeout: 2000 });
      await page.click('.hearth-to[data-hearth="thornhollow"]');
      await page.waitForFunction(() => window.__world.state().map === 'thornhollow' && !window.__world.state().transition, null, { timeout: 4000 });
      check(true, `${P} 6: travel from the fire lands at Thornhollow`);
      await shot('travelled');
      // the Atlas screen (WP8): travel mode, if it offers the kindled fire
      await teleport(hf.map, hf.x, hf.y, hf.face);
      await W(() => window.__app.go('atlas', { mode: 'travel', from: 'world' }));
      await page.waitForTimeout(400);
      const marker = await page.$('[data-hearth="thornhollow"], [data-hf="thornhollow"], [data-travel="thornhollow"]');
      if (marker) {
        await marker.click();
        await page.waitForTimeout(300);
        const confirm = await page.$('.ov [data-primary]');
        if (confirm) await confirm.click();
        await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 4000 });
        await page.waitForTimeout(500);
        const s = await state();
        check(s.map === 'thornhollow', `${P} 6: Atlas travel to Thornhollow (${s.map})`);
      } else block(`${P} 6: the Atlas screen has no travel marker for Thornhollow yet (WP8)`);
    } catch (e) { check(false, `${P} 6: ${e.message.split('\n')[0]}`); }
  }

  // ================= 7. Briarmaw falls: Brand, crownwalls, letter ======================================
  if (want(7)) {
    console.log(' -- 7 the Brand');
    try {
      await setup({ patch: combine(noIntro, levelUp.replace(/LVL/g, '8')) });
      await standBy('briarmaw-den', 'briarmaw-den', ['s']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-prefight', { timeout: 3000 });
      check(/Briarmaw/i.test(await page.innerText('.ov-prefight')), `${P} 7: Briarmaw's pre-fight card`);
      await W(() => { window.__forceResult = { result: 'victory', xp: 400, gold: 80 }; });
      await page.click('.pf-fight');
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath');
      for (let i = 0; i < 6 && (await screen()) === 'aftermath'; i++) {
        if (await page.$('.ov-reveal .cont')) await page.click('.ov-reveal .cont'); else await page.click('.af-foot .btn.primary');
        await page.waitForTimeout(300);
      }
      await page.waitForSelector('.ov-story.brand', { timeout: 5000 });
      check(/Brand/i.test(await page.innerText('.ov-story.brand')), `${P} 7: the Brand banner`);
      await shot('brand');
      await page.click('.ov-story.brand .story-go');
      await page.waitForSelector('.ov-story.crown', { timeout: 3000 });
      const seals = await page.$$eval('.cw-seal', s => s.length);
      check(seals === 3, `${P} 7: the crownwall sequence cracks 3 seals (${seals})`);
      await page.waitForTimeout(1600);
      await shot('crownwalls');
      await page.click('.ov-story.crown .story-go');
      await page.waitForSelector('.ov-story.letter', { timeout: 3000 });
      check(/U\./.test(await page.innerText('.ov-story.letter')), `${P} 7: the Unsmith's letter`);
      await shot('letter');
      await page.click('.ov-story.letter .story-go');
      await page.waitForTimeout(300);
      const letter = await W(() => !!window.__world.game().progress.flags.story['letter:brand-of-briars']);
      check(letter, `${P} 7: the letter is shown once (story flag set)`);
      await standBy('thornhollow', 'th-crown-w', ['e']);
      await W(() => window.__world.roam([]));
      const cw = await W(() => window.__world.entity('thornhollow', 'th-crown-w'));
      check(cw && cw.state === 'open', `${P} 7: th-crown-w is open (${cw && cw.state})`);
      await hold('w', 420);
      await page.waitForFunction(() => window.__world.state().map === 'mossfall' || window.__world.state().x < 2, null, { timeout: 4000 }).catch(() => {});
      const s = await state();
      check(s.map === 'mossfall' || s.x < 2, `${P} 7: th-crown-w is passable (${s.map} ${s.x},${s.y})`);
    } catch (e) { check(false, `${P} 7: ${e.message.split('\n')[0]}`); }
  }

  // ================= 8. dialogue layout; the Garret contest odds ===================================
  if (want(8)) {
    console.log(' -- 8 dialogue');
    try {
      await setup({ patch: noIntro });
      await standBy('mosswatch-1', 'garret', ['s', 'e', 'w']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-dialogue .dlg', { timeout: 3000 });
      await page.waitForTimeout(250);
      const geo = await W(() => {
        const d = document.querySelector('.ov-dialogue .dlg').getBoundingClientRect();
        const deck = document.querySelector('.w-deck').getBoundingClientRect();
        const c = document.querySelector('.world-canvas').getBoundingClientRect();
        const next = document.querySelector('.dlg-next').getBoundingClientRect();
        const a = document.querySelector('.w-deck .w-a').getBoundingClientRect();
        return { d: [d.left, d.top, d.right, d.bottom], deck: [deck.left, deck.top, deck.right, deck.bottom, deck.height], c: [c.left, c.top, c.right, c.bottom], next: [next.left + next.width / 2, next.top + next.height / 2], a: [a.left + a.width / 2, a.top + a.height / 2], vh: innerHeight };
      });
      if (phone) {
        check(geo.d[3] >= geo.vh - 1 && geo.d[1] <= geo.deck[1] + 1 && geo.d[0] <= 1, `${P} 8: the dialogue replaces the deck in place (${geo.d.map(Math.round)})`);
        check(Math.abs(geo.next[0] - geo.a[0]) < 40, `${P} 8: the ▸ button sits where A was (${Math.round(geo.next[0])} vs ${Math.round(geo.a[0])})`);
      } else {
        check(geo.d[0] >= geo.c[0] - 1 && geo.d[2] <= geo.c[2] + 1 && geo.d[3] <= geo.c[3] + 1, `${P} 8: the dialogue docks over the bottom of the canvas`);
      }
      await shot('dialogue');
      // reach the choices
      for (let i = 0; i < 8 && !(await page.$('.dlg-choice')); i++) { await page.click('.dlg-next').catch(() => {}); await page.waitForTimeout(150); }
      const chip = await page.$('.dlg-odds');
      const chipText = chip ? await chip.innerText() : '';
      check(/Contest/.test(chipText) && /\d+%/.test(chipText), `${P} 8: the Garret contest odds chip ("${chipText}")`);
      await shot('odds');
      await playDialogue(/Leave/);
      // the Lamp Room is dark: a Stillwater party (no kindle, no lamplight) sees two tiles
      await setup({ starter: 'stillwater-lance', patch: noIntro });
      await teleport('mosswatch-2', 6, 9, 'n');
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const dk = await state();
      check(dk.dark, `${P} 8: the Lamp Room is dark without a light key`);
      await shot('dark');
    } catch (e) { check(false, `${P} 8: ${e.message.split('\n')[0]}`); }
  }

  // ================= 9. Hilda's temper ==============================================================
  if (want(9)) {
    console.log(' -- 9 temper');
    try {
      await setup({ patch: combine(noIntro, `(g) => { g.gold = 999; return g; }`) });
      await standBy('thornhollow', 'hilda', ['s', 'w', 'e']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
      await playDialogue(/Temper/);
      await page.waitForSelector('.ov-forge', { timeout: 3000 });
      const uid = await W(() => { const g = window.__world.game(); return g.party.roster.warden.gear.weapon; });
      await page.click(`.forge-item[data-uid="${uid}"]`);
      await page.waitForSelector('.forge-card .num', { timeout: 2000 });
      const before = await page.innerText('.forge-card');
      await shot('forge');
      await page.click('.forge-go');
      await page.waitForTimeout(300);
      const after = await page.innerText('.forge-card');
      await page.click('.ov-forge [data-primary]');
      await page.waitForTimeout(300);
      await page.waitForTimeout(250);
      const show = await W(() => window.__world.state().prompt);
      check(/wears/.test(show), `${P} 9: the showoff plays for the tempered blade ("${show}")`);
      const tv = await W(u => window.__world.game().inventory.find(i => i.uid === u)?.temper || 0, uid);
      check(tv === 1, `${P} 9: tempering raises temper to 1 (${tv})`);
      check(before !== after && /\+\d/.test(after), `${P} 9: the card number changes (${before.replace(/\s+/g, ' ')} -> ${after.replace(/\s+/g, ' ')})`);
      await closeOverlays();
    } catch (e) { check(false, `${P} 9: ${e.message.split('\n')[0]}`); }
  }

  // ================= 10. no horizontal scroll; reduced motion ===========================================
  if (want(10)) {
    console.log(' -- 10 scroll and reduced motion');
    try {
      await setup({ patch: noIntro });
      const w = await W(() => [document.documentElement.scrollWidth, window.innerWidth]);
      check(w[0] <= w[1], `${P} 10: no horizontal scroll (${w[0]} <= ${w[1]})`);
      const small = await W(() => [...document.querySelectorAll('.screen-world button')].filter(b => b.offsetParent && (b.getBoundingClientRect().width < 43.5 || b.getBoundingClientRect().height < 25.5)).map(b => b.className));
      check(small.filter(c => !/w-bust/.test(c)).length === 0, `${P} 10: tap targets are 44 px (${small.join(', ') || 'all'})`);
      // the pause menu, and back
      if (phone) await page.click('.w-pill'); else await page.keyboard.press('Escape');
      await page.waitForSelector('.ov-pause', { timeout: 3000 });
      const items = await page.$$eval('.ov-pause .pause-grid .btn', bs => bs.map(b => b.dataset.go));
      check(['party', 'codex', 'journal', 'atlas', 'settings', 'title'].every(k => items.includes(k)), `${P} 10: the pause menu lists ${items.join(', ')}`);
      await page.click('.ov-pause .pause-party');
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'party', null, { timeout: 3000 });
      await W(() => window.__app.go('world'));
      await page.waitForSelector('.screen-world .world-canvas');
      check(true, `${P} 10: Party from the pause menu, and back to the world`);
      if (!phone) {
        await page.keyboard.press('KeyJ');
        await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'journal', null, { timeout: 3000 }).catch(() => {});
        check((await screen()) === 'journal', `${P} 10: J opens the Journal`);
        await W(() => window.__app.go('world'));
        await page.waitForSelector('.screen-world .world-canvas');
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await setup({ patch: noIntro });
      await standBy('keep-hall', 'fenwick', ['s']);
      await pressA();
      await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
      const txt = await page.innerText('.ov-dialogue .dlg-text');
      check(txt.length > 20, `${P} 10: with reduced motion the dialogue text appears at once ("${txt.slice(0, 30)}…")`);
      await playDialogue(/Leave/);
      const cam0 = (await state()).camera;
      await teleport('hearth-road', 13, 60, 'n');
      await hold('n', 330);
      const s = await state();
      const cam1 = s.camera;
      check(cam1[1] !== cam0[1], `${P} 10: the camera follows (snaps) with reduced motion`);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    } catch (e) { check(false, `${P} 10: ${e.message.split('\n')[0]}`); }
  }

  // ================= 11. performance =============================================================
  if (want(11)) {
    console.log(' -- 11 performance');
    try {
      await setup({ patch: combine(noIntro, levelUp.replace(/LVL/g, '10'), roadsWon('hearth-road')) });
      await teleport('hearth-road', 13, 66, 'n');
      await W(() => window.__world.grace(100000));
      // walk up the road and back past the packs for 10 s at 4x CPU throttle
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(400);
      await W(() => { window.__world.resetPerf(); window.__drawSamples = []; window.__sampling = true; });
      const t0 = Date.now();
      let dir = 'n', legs = 0, battles = 0, maxRoamers = 0, maxParty = 0;
      while (Date.now() - t0 < 10000) {
        await hold(dir, 1150);
        legs++;
        dir = legs % 4 === 1 || legs % 4 === 2 ? 's' : 'n';
        const s = await state();
        maxRoamers = Math.max(maxRoamers, s.roamers.length);
        maxParty = Math.max(maxParty, await W(() => window.__world.partyShown()));
        if ((await screen()) !== 'world') { battles++; await W(() => { window.__forceResult = { result: 'fled' }; }); for (let i = 0; i < 5 && (await screen()) !== 'world'; i++) { await page.click('.af-foot .btn.primary').catch(() => {}); await page.waitForTimeout(300); } }
        if (await page.$('.ov')) await closeOverlays();
      }
      await W(() => { window.__sampling = false; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const perf = await W(() => window.__world.perf());
      const samples = await W(() => window.__drawSamples);
      const pct = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
      const work = perf.work.filter(v => v > 0);
      const p95 = pct(work, 0.95), p50 = pct(work, 0.5), max = Math.max(...work);
      const dMax = Math.max(0, ...perf.draws), dP95 = pct(perf.draws, 0.95);
      const sMax = Math.max(0, ...samples), sP95 = pct(samples, 0.95);
      const line = `${P} 11: 4x throttle, ${(perf.frames)} frames in 10 s, ${maxRoamers} roamers, ${maxParty} walkers shown: frame JS p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, max ${max.toFixed(1)} ms; drawImage per frame (view) p95 ${dP95}, max ${dMax}; (wrapped context) p95 ${sP95}, max ${sMax}${battles ? `; ${battles} battles interrupted the walk` : ''}`;
      perfLines.push(line);
      console.log('  PERF', line);
      check(p95 <= 33, `${P} 11: p95 frame time ${p95.toFixed(2)} ms <= 33 ms (hard gate; target 16)`);
      check(Math.max(dMax, sMax) <= 60, `${P} 11: drawImage per frame ${Math.max(dMax, sMax)} <= 60 (hard gate; target 40)`);
      if (p95 > 16) console.log(`  note: p95 ${p95.toFixed(2)} ms is over the 16 ms target`);
      if (Math.max(dMax, sMax) > 40) console.log(`  note: ${Math.max(dMax, sMax)} drawImage calls is over the 40 target`);
      check(maxParty >= 4, `${P} 11: 4 walkers in the conga line (${maxParty})`);
      if (maxRoamers < 3) block(`${P} 11: only ${maxRoamers} roamers on the Hearth Road (WP1 seeds them)`);
      // idle: the loop drops to 10-15 fps while nothing on screen changes (spec A: "Frame rate while
      // nothing changes"). A pack stepping in view is a change and runs at full rate, so the packs in
      // or near the view (8 tiles of margin) are stunned and stand still, showing their "?"; the packs
      // far off screen keep wandering, and that must not keep the loop at full rate either.
      const far = await W(() => {
        const s = window.__world.state(), [cx, cy] = s.camera, [vw, vh] = s.view, m = 8 * 16;
        const near = r => r.x * 16 > cx - m && r.x * 16 < cx + vw + m && r.y * 16 > cy - m && r.y * 16 < cy + vh + m;
        const list = window.__world.walkRoamers();
        window.__world.roam(list.map(r => (near(r) ? { ...r, mood: 'stunned', wait: 1e6 } : r)));
        return list.filter(r => !near(r)).map(r => r.id);
      });
      await page.waitForTimeout(300);
      const before = await state();
      await W(() => window.__world.resetPerf());
      await page.waitForTimeout(2000);
      const idleFrames = (await W(() => window.__world.perf())).frames;
      const after = await state();
      const wandered = after.roamers.filter(r => far.includes(r.id) && before.roamers.some(q => q.id === r.id && (q.x !== r.x || q.y !== r.y))).length;
      console.log(`  note: ${far.length} packs far off screen, ${wandered} of them moved while standing still`);
      check(idleFrames >= 16 && idleFrames <= 34, `${P} 11: standing still, the loop idles at ~${(idleFrames / 2).toFixed(1)} fps`);
    } catch (e) { check(false, `${P} 11: ${e.message.split('\n')[0]}`); }
  }

  // ================= M4 (P7b): the Sunscorch, the Codex binder, the Journal's Grudges ==================
  // Act I done, and its council held (else the Great Hall, where a new game starts, plays it on entry)
  const act1 = `(g) => { Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true }); return g; }`;
  // change the game in the page and re-enter the world (it stays where it stood)
  const regame = async fn => {
    await W(f => { const g = structuredClone(window.__world.game()); const g2 = (0, eval)(`(${f})`)(g, window.__worldTools) || g; window.__app.setGame(g2); window.__app.go('world'); }, fn.toString());
    await page.waitForSelector('.screen-world .world-canvas');
    await page.waitForTimeout(250);
    await closeOverlays();
  };
  const noScroll = async label => { const w = await W(() => [document.documentElement.scrollWidth, window.innerWidth]); check(w[0] <= w[1], `${P} ${label}: no horizontal scroll (${w[0]} <= ${w[1]})`); };
  const toastNow = () => W(() => { const t = document.querySelector('.toast'); return t && !t.hidden ? t.textContent : ''; });

  // ================= 12. the Keep's south-east gate ==================================================
  if (want(12)) {
    console.log(' -- 12 the south-east gate');
    try {
      await setup({ patch: noIntro });
      await teleport('keep', 22, 22, 's');
      await W(() => window.__world.roam([]));
      await W(() => window.__world.press('s'));
      await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
      await page.waitForTimeout(600);
      const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
      check(/caravans/i.test(msg) && /Brands of the Wilds/.test(msg), `${P} 12: before Act I the south-east gate is sealed ("${msg.slice(0, 100)}…")`);
      await shot('se-gate-sealed');
      await playDialogue();
      const s0 = await state();
      check(s0.map === 'keep', `${P} 12: the party stays in the Keep (${s0.map} ${s0.x},${s0.y})`);
      // Act I done: the gate stands open onto the Sunward Road
      await regame(act1);
      await teleport('keep', 22, 22, 's');
      await W(() => window.__world.roam([]));
      await W(() => window.__world.press('s'));
      await page.waitForFunction(() => window.__world && window.__world.state().map === 'sun-road' && !window.__world.state().transition, null, { timeout: 6000 });
      await closeOverlays();
      const s1 = await state();
      check(s1.map === 'sun-road' && s1.y <= 2, `${P} 12: after Act I the gate opens into the Sunward Road (${s1.map} ${s1.x},${s1.y})`);
      const track = await W(() => window.__app.audio.track);
      check(track === 'desert', `${P} 12: the Sunward Road plays the desert track (${track})`);
      await shot('sun-road');
      // the caravan wreck: gold, Frost Draughts and forge materials, in one toast by their names
      await standBy('sun-road', 'sr-wreck', ['e', 'n', 's', 'w']);
      await W(() => window.__world.roam([]));
      const m0 = await W(() => ({ ...(window.__world.game().materials || {}) }));
      await pressA();
      await page.waitForFunction(() => { const t = document.querySelector('.toast'); return t && !t.hidden && /gold/.test(t.textContent); }, null, { timeout: 3000 });
      const toast = await toastNow();
      const m1 = await W(() => ({ ...(window.__world.game().materials || {}) }));
      check(/scrap/i.test(toast) && /silver/i.test(toast), `${P} 12: the wreck's forge materials toast by name ("${toast}")`);
      check((m1.scrap || 0) > (m0.scrap || 0) && (m1.silver || 0) > (m0.silver || 0), `${P} 12: the materials reach the purse (${JSON.stringify(m0)} -> ${JSON.stringify(m1)})`);
      await shot('wreck-toast');
    } catch (e) { check(false, `${P} 12: ${e.message.split('\n')[0]}`); }
  }

  // ================= 13. Sandspire: the Spire Hearth, Idris, the board, Atlas travel ===================
  if (want(13)) {
    console.log(' -- 13 Sandspire');
    try {
      await setup({ patch: combine(noIntro, act1, `(g) => { g.gold = 600; return g; }`) });
      const hf = await W(() => window.__worldTools.hearth('spire-hearth'));
      await teleport(hf.map, hf.x, hf.y, hf.face);
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-hearth', { timeout: 3000 });
      check(/Spire Hearth/.test(await page.innerText('.ov-hearth')), `${P} 13: the Spire Hearth's menu opens`);
      await shot('spire-hearth');
      await page.click('.ov-hearth [data-primary]');
      await page.waitForTimeout(400);
      await closeOverlays();
      const g1 = await W(() => { const g = window.__world.game(); return { kindled: !!g.progress.flags.kindled['spire-hearth'], last: g.progress.lastHearthfire }; });
      check(g1.kindled && g1.last === 'spire-hearth', `${P} 13: resting kindles the Spire Hearth (${JSON.stringify(g1)})`);
      // Idris the Gemwright
      await standBy('sandspire', 'idris', ['n', 'e', 'w', 's']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
      check(/Idris/i.test(await page.innerText('.ov-dialogue')), `${P} 13: A talks to Idris`);
      await playDialogue(/Buy gems/);
      await page.waitForSelector('.ov-shop', { timeout: 3000 });
      const shopText = await page.innerText('.ov-shop');
      check(/Idris/.test(shopText), `${P} 13: Idris's shop opens ("${shopText.split('\n').slice(0, 2).join(' · ')}")`);
      if (/Sunstone|Moss Agate|Glass Pearl/.test(shopText)) check(true, `${P} 13: Idris sells his gems`);
      else block(`${P} 13: Idris's shop lists no gems yet (P7a: the shop sheet's gem rows)`);
      await shot('idris-shop');
      await page.click('.ov-shop [data-primary]');
      await page.waitForTimeout(300);
      await closeOverlays();
      // the Sandspire board opens the Journal on the bounties, with Zara's board
      await standBy('sandspire', 'ss-board', ['s', 'e', 'w', 'n']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'journal', null, { timeout: 4000 });
      await page.waitForTimeout(200);
      const tab = await W(() => document.querySelector('.jr-panel')?.dataset.tab);
      const zara = await page.$('.jr-board[data-giver="zara"]');
      check(tab === 'bounties' && !!zara, `${P} 13: the Sandspire board opens the Journal's bounties with Zara's board (${tab})`);
      check(/Skink Nest/.test(zara ? await zara.innerText() : ''), `${P} 13: the Sandspire bounties are listed`);
      await shot('sandspire-board');
      await noScroll('13 bounties');
      // the Atlas: from the Keep, through the Sunscorch view, travel to the Spire Hearth
      await W(() => window.__app.go('world'));
      await page.waitForSelector('.screen-world .world-canvas');
      await closeOverlays();
      await teleport('keep', 15, 12, 's');
      await W(() => window.__app.go('atlas', { mode: 'travel', from: 'world' }));
      await page.waitForSelector('.atlas-mk');
      const views = await page.$$eval('.atlas-view', bs => bs.map(b => b.dataset.view));
      check(views.includes('sunscorch'), `${P} 13: the Atlas has a Sunscorch view once Act I is done (${views.join(', ')})`);
      await page.click('.atlas-view[data-view="sunscorch"]');
      await page.waitForTimeout(400);
      const mk = await W(() => ({ fires: document.querySelectorAll('.atlas-mk.mk-hearth').length, lit: document.querySelectorAll('.atlas-mk.mk-hearth.is-kindled').length, sealed: document.querySelectorAll('.atlas-mk.mk-sealed').length, small: [...document.querySelectorAll('.atlas-mk')].filter(e => e.getBoundingClientRect().width < 44).length, view: document.querySelector('.atlas-frame').dataset.view }));
      check(mk.view === 'sunscorch' && mk.fires === 7 && mk.lit === 1 && mk.sealed === 2 && mk.small === 0, `${P} 13: the Sunscorch view shows its 7 Hearthfires (the Spire Hearth lit) and 2 padlocks, all 44 px (${JSON.stringify(mk)})`);
      await shot('atlas-sunscorch');
      await noScroll('13 atlas');
      await page.click('.atlas-mk[data-hearth="spire-hearth"]');
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 4000 });
      await page.waitForFunction(() => window.__world && !window.__world.state().transition, null, { timeout: 4000 });
      await page.waitForTimeout(300);
      const s = await state();
      check(s.map === 'sandspire' && s.x === hf.x && s.y === hf.y, `${P} 13: Atlas travel lands on the Spire Hearth's stand (${s.map} ${s.x},${s.y})`);
    } catch (e) { check(false, `${P} 13: ${e.message.split('\n')[0]}`); }
  }

  // ================= 14. dune-glass with Cinderfang; the mirage with the Knowledge key ================
  if (want(14)) {
    console.log(' -- 14 dune-glass and the mirage');
    try {
      await setup({ patch: combine(noIntro, act1) });
      await standBy('sun-road', 'sr-glass-wall', ['e']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-lock', { timeout: 3000 });
      const t1 = await page.innerText('.ov-lock');
      check(/Dune-Glass/.test(t1) && /✗/.test(t1) && /Craft 5/.test(t1), `${P} 14: the dune-glass prompt lists its keys with ✗ (Craft 5)`);
      await shot('dune-glass-shut');
      await page.click('.ov-lock [data-primary]');
      await page.waitForTimeout(200);
      await regame(`(g, T) => { g.inventory.push(T.relicItem('cinderfang', 'Kharzul the Glass Scorpion')); g.codex.cinderfang = { sighted: true, claimed: true, awakened: false }; return g; }`);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-lock', { timeout: 3000 });
      const t2 = await page.innerText('.ov-lock');
      check(/✓/.test(t2) && /Cinderfang/.test(t2), `${P} 14: with Cinderfang the prompt shows ✓`);
      const use = await page.$('.ov-lock .lock-use');
      check(!!use && /Cinderfang/.test(await use.innerText()), `${P} 14: "Use (Cinderfang)"`);
      await shot('dune-glass-key');
      if (use) await use.click();
      await page.waitForTimeout(300);
      check(await W(() => !!window.__world.game().progress.flags.unlocked?.['sr-glass-wall']), `${P} 14: the dune-glass wall melts`);
      const s0 = await state();
      await hold('w', 380);
      const s1 = await state();
      check(s1.x < s0.x, `${P} 14: the way into the hollow is open (${s0.x} -> ${s1.x})`);
      // the Glass Flats mirage, with Knowledge 5
      await regame(`(g) => { for (const id of g.party.active) { const h = g.party.roster[id]; h.domains = { ...(h.domains || {}), knowledge: { ...(h.domains?.knowledge || {}), level: 5 } }; } return g; }`);
      await standBy('glass-flats', 'gf-mirage', ['n', 's']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-lock', { timeout: 3000 });
      const t3 = await page.innerText('.ov-lock');
      check(/Mirage/.test(t3) && /Knowledge 5/.test(t3) && /✓/.test(t3), `${P} 14: the mirage prompt shows the Knowledge key ✓`);
      await shot('mirage');
      const use2 = await page.$('.ov-lock .lock-use');
      if (use2) await use2.click();
      await page.waitForTimeout(300);
      check(await W(() => !!window.__world.game().progress.flags.unlocked?.['gf-mirage']), `${P} 14: the mirage opens with Knowledge 5`);
    } catch (e) { check(false, `${P} 14: ${e.message.split('\n')[0]}`); }
  }

  // ================= 15. Kharzul's pre-fight card =====================================================
  if (want(15)) {
    console.log(' -- 15 Kharzul');
    try {
      await setup({ patch: combine(noIntro, act1) });
      await standBy('deep-shaft-2', 'kharzul-heart', ['s', 'n', 'w', 'e']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-prefight', { timeout: 3000 });
      await page.waitForTimeout(300);
      const pf = (await page.innerText('.ov-prefight')).replace(/\s+/g, ' ');
      check(/Kharzul/.test(pf) && /Champion/.test(pf), `${P} 15: Kharzul's pre-fight card: the Champion ("${pf.slice(0, 80)}…")`);
      check(/Cinderfang/.test(pf) && /Glass Carapace/.test(pf) && /Glinting/i.test(pf), `${P} 15: its pieces glint on the card: Cinderfang and the Glass Carapace`);
      if (/Brand of Glass/.test(pf)) check(true, `${P} 15: the card names the Brand of Glass`);
      else block(`${P} 15: the pre-fight card does not name the Brand of Glass yet (P7a: ui/world/sheets.js openPrefight)`);
      await shot('kharzul-prefight');
      await page.click('.ov-prefight .pf-not-yet');
      await page.waitForTimeout(200);
    } catch (e) { check(false, `${P} 15: ${e.message.split('\n')[0]}`); }
  }

  // ================= 16. the Deep Shaft's darkness, lit by the Sunstone Lantern ========================
  if (want(16)) {
    console.log(' -- 16 the Deep Shaft');
    try {
      // a Stillwater party carries no flame (no Kindle, no Lamplight)
      await setup({ starter: 'stillwater-lance', patch: combine(noIntro, act1) });
      await teleport('deep-shaft-1', 11, 2, 's');
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const d0 = await state();
      check(d0.map === 'deep-shaft-1' && d0.dark, `${P} 16: the Deep Shaft is dark without a light key (${d0.dark})`);
      await shot('shaft-dark');
      await regame(`(g, T) => { g.inventory.push(T.relicItem('sunstone-lantern', 'Foreman Brask')); g.codex['sunstone-lantern'] = { sighted: true, claimed: true, awakened: false }; return g; }`);
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const d1 = await state();
      check(d1.map === 'deep-shaft-1' && !d1.dark, `${P} 16: the Sunstone Lantern lights the Deep Shaft (${d1.dark})`);
      await shot('shaft-lit');
    } catch (e) { check(false, `${P} 16: ${e.message.split('\n')[0]}`); }
  }

  // ================= 17. performance on the Glass Flats ==============================================
  if (want(17)) {
    console.log(' -- 17 the Glass Flats performance');
    try {
      await setup({ patch: combine(noIntro, act1, levelUp.replace(/LVL/g, '12')) });
      await teleport('glass-flats', 1, 14, 'e');
      await closeOverlays();
      await W(() => window.__world.grace(100000));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(400);
      await W(() => { window.__world.resetPerf(); window.__drawSamples = []; window.__sampling = true; });
      // walking into a pack on the track is a fight: it ends at once as fled (counted), and the walk goes on
      await W(() => { window.__forceResult = { result: 'fled', sticky: true }; });
      const work = [], draws = [];
      let frames = 0, battles = 0, maxRoamers = 0, farthest = 0;
      const collect = async () => {
        const p = await W(() => (window.__world ? window.__world.perf() : null));
        if (!p) return;
        work.push(...p.work.filter(v => v > 0)); draws.push(...p.draws); frames += p.frames;
        await W(() => window.__world.resetPerf());
      };
      const t0 = Date.now();
      let legs = 0;
      while (Date.now() - t0 < 10000) {
        await hold(legs % 6 < 3 ? 'e' : 'w', 1150);
        legs++;
        if ((await screen()) !== 'world') {
          battles++;
          for (let i = 0; i < 6 && (await screen()) !== 'world'; i++) { await page.click('.af-foot .btn.primary').catch(() => {}); await page.waitForTimeout(300); }
          await page.waitForSelector('.screen-world .world-canvas', { timeout: 4000 }).catch(() => {});
          await W(() => window.__world && window.__world.grace(100000));
          continue;
        }
        if (await page.$('.ov')) await closeOverlays();
        await collect();
        const s = await state();
        if (s) { maxRoamers = Math.max(maxRoamers, s.roamers.length); farthest = Math.max(farthest, s.x); }
      }
      await W(() => { window.__sampling = false; window.__forceResult = null; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const samples = await W(() => window.__drawSamples);
      const pct = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
      const p95 = pct(work, 0.95), p50 = pct(work, 0.5);
      const dMax = Math.max(0, ...draws), sMax = Math.max(0, ...samples), dP95 = pct(draws, 0.95);
      const line = `${P} 17: Glass Flats, 4x throttle, ${frames} frames in 10 s, ${maxRoamers} roamers, walked out to x=${farthest}: frame JS p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms; drawImage per frame p95 ${dP95}, max ${Math.max(dMax, sMax)}${battles ? `; ${battles} fights interrupted the walk` : ''}`;
      check(frames >= 100 && farthest >= 12, `${P} 17: the walk crossed the Flats (${frames} frames measured, out to x=${farthest})`);
      perfLines.push(line);
      console.log('  PERF', line);
      check(p95 <= 33, `${P} 17: p95 frame time ${p95.toFixed(2)} ms <= 33 ms (hard gate; target 16)`);
      check(Math.max(dMax, sMax) <= 60, `${P} 17: drawImage per frame ${Math.max(dMax, sMax)} <= 60 (hard gate; target 40)`);
      if (p95 > 16) console.log(`  note: p95 ${p95.toFixed(2)} ms is over the 16 ms target`);
      // idle: the packs near the view stunned, the loop drops to its idle rate
      await W(() => {
        const s = window.__world.state(), [cx, cy] = s.camera, [vw, vh] = s.view, m = 8 * 16;
        const near = r => r.x * 16 > cx - m && r.x * 16 < cx + vw + m && r.y * 16 > cy - m && r.y * 16 < cy + vh + m;
        window.__world.roam(window.__world.walkRoamers().map(r => (near(r) ? { ...r, mood: 'stunned', wait: 1e6 } : r)));
      });
      await page.waitForTimeout(300);
      await W(() => window.__world.resetPerf());
      await page.waitForTimeout(2000);
      const idleFrames = (await W(() => window.__world.perf())).frames;
      check(idleFrames >= 16 && idleFrames <= 34, `${P} 17: standing still on the Glass Flats, the loop idles at ~${(idleFrames / 2).toFixed(1)} fps`);
    } catch (e) { check(false, `${P} 17: ${e.message.split('\n')[0]}`); }
  }

  // ================= 18. the Codex binder =============================================================
  if (want(18)) {
    console.log(' -- 18 the Codex binder');
    try {
      await setup({ patch: noIntro });
      await W(() => window.__app.go('codex', { from: 'world' }));
      await page.waitForSelector('.cx-tab');
      await page.waitForTimeout(300);
      const cx = () => W(() => ({
        tabs: [...document.querySelectorAll('.cx-tab')].map(b => `${b.dataset.page}:${b.getAttribute('aria-selected')}`),
        pockets: document.querySelectorAll('.pocket').length, spare: document.querySelectorAll('.pocket.is-spare').length,
        name: document.querySelector('.cx-head h2')?.textContent || '', prog: document.querySelector('.cx-prog')?.textContent || '',
        earned: document.querySelector('.cx-reward')?.dataset.earned ?? null, reward: document.querySelector('.cx-reward')?.textContent || '',
        sealed: !!document.querySelector('.cx-sealed'), sealedText: document.querySelector('.cx-sealed')?.textContent || '',
        awake: document.querySelectorAll('.pocket.is-awakened').length,
      }));
      let c = await cx();
      check(c.tabs.join(' ') === 'verdant:true sunscorch:false ironspire:false gloomfen:false', `${P} 18: page tabs I · II · III · IV, Page I open (${c.tabs.join(' ')})`);
      check(c.pockets === 24 && c.spare === 2 && /1 of 22 claimed/.test(c.prog), `${P} 18: Page I: 24 pockets, the two starters you passed over not counted ("${c.prog}")`);
      check(c.earned === '0' && /Verdant Oath/.test(c.reward), `${P} 18: Page I's reward is greyed until earned ("${c.reward}")`);
      const tabs = await page.$$eval('.cx-tab', bs => bs.map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }));
      check(tabs.every(([w, h]) => w >= 44 && h >= 44), `${P} 18: the page tabs are 44 px (${tabs.map(t => t.map(Math.round).join('x')).join(', ')})`);
      await shot('codex-I');
      await noScroll('18 codex');
      await page.click('.cx-tab[data-page="sunscorch"]');
      await page.waitForTimeout(300);
      c = await cx();
      check(c.pockets === 14 && /Sunscorch Wastes/.test(c.name) && /0 of 14 claimed/.test(c.prog) && /Sunscorch Compact/.test(c.reward), `${P} 18: the Page II tab: 14 pockets, "${c.prog}", ${c.reward.replace(/\s+/g, ' ').slice(0, 40)}…`);
      await shot('codex-II');
      await page.click('.pocket[data-relic="cinderfang"]');
      await page.waitForSelector('.ov .card', { timeout: 5000 });
      check(true, `${P} 18: an unsighted Page II pocket opens its silhouette card`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.ov', { state: 'detached', timeout: 3000 });
      // M5: Page III is open (its pockets, progress and reward), and says what opens its road; Page IV is the
      // sealed one now
      const III = PAGES.find(p => p.id === 'ironspire'), nIII = Object.values(RELICS).filter(r => r.codex >= III.from && r.codex <= III.to).length;
      await page.click('.cx-tab[data-page="ironspire"]');
      await page.waitForTimeout(200);
      c = await cx();
      const road = await W(() => document.querySelector('.cx-road')?.textContent || '');
      check(!c.sealed && c.pockets === nIII && new RegExp(`0 of ${nIII} claimed`).test(c.prog) && c.earned === '0' && c.reward.includes(III.reward.name), `${P} 18: Page III is open: ${nIII} pockets, "${c.prog}", ${c.reward.replace(/\s+/g, ' ').slice(0, 44)}…`);
      check(/east postern/.test(road), `${P} 18: before the second council Page III says what opens its road ("${road}")`);
      await shot('codex-III');
      await page.click('.pocket[data-relic="worldforge-hammer"]');
      await page.waitForSelector('.ov .card', { timeout: 5000 });
      check(true, `${P} 18: an unsighted Page III pocket opens its silhouette card`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.ov', { state: 'detached', timeout: 3000 });
      await page.click('.cx-tab[data-page="gloomfen"]');
      await page.waitForTimeout(200);
      c = await cx();
      check(c.sealed && c.pockets === 0 && /Sealed/i.test(c.sealedText), `${P} 18: Page IV is sealed, with a padlock and its region's road ("${c.sealedText.replace(/\s+/g, ' ').slice(0, 60)}…")`);
      await shot('codex-IV');
      // a forced full claim of every relic Page I needs: its reward shows, in gold; an Awakened pocket glows
      await page.click('.cx-tab[data-page="verdant"]');
      const need = await page.$$eval('.pocket[data-relic]:not(.is-spare)', ps => ps.map(p => p.dataset.relic));
      await W(ids => {
        const g = structuredClone(window.__app.game);
        for (const id of ids) {
          g.codex[id] = { sighted: true, claimed: true, awakened: id === 'thornsplitter' };
          if (!g.inventory.some(i => i.base === id)) g.inventory.push(window.__worldTools.relicItem(id));
        }
        window.__app.setGame(g);
        window.__app.go('codex', { from: 'world' });
      }, need);
      await page.waitForSelector('.cx-tab');
      await page.waitForTimeout(300);
      c = await cx();
      const gold = await W(() => { const r = document.querySelector('.cx-reward.is-earned .cx-rn'); return r ? getComputedStyle(r).color : ''; });
      check(need.length === 22 && c.earned === '1' && /Earned/.test(c.reward) && /Verdant Oath/.test(c.reward) && /22 of 22 claimed/.test(c.prog), `${P} 18: after a forced full claim Page I's reward shows ("${c.reward.replace(/\s+/g, ' ').slice(0, 60)}", ${gold})`);
      const glow = await W(() => { const p = document.querySelector('.pocket.is-awakened'); return p ? getComputedStyle(p).animationName : ''; });
      check(c.awake >= 1 && /cxGlow/.test(glow), `${P} 18: an Awakened pocket glows (${c.awake}, ${glow})`);
      const done = await W(() => document.querySelector('.cx-tab[data-page="verdant"]').classList.contains('is-done'));
      check(done, `${P} 18: the Page I tab is ticked`);
      await shot('codex-I-earned');
      await page.evaluate(() => document.querySelector('.pocket.is-awakened')?.scrollIntoView({ block: 'center' }));
      await shot('codex-awakened');
    } catch (e) { check(false, `${P} 18: ${e.message.split('\n')[0]}`); }
  }

  // ================= 19. the Journal's Grudges; the hunter's "!"; toasts; the end of Act II ===========
  if (want(19)) {
    console.log(' -- 19 Grudges, the hunter, the Act II card');
    try {
      await setup({ patch: combine(noIntro, `(g) => {
        g.progress.flags.grudges = { 'snag-wallow#0': { key: 'snag-wallow#0', nodeId: 'snag-wallow', wins: 2, flees: 0, omens: ['ironclad', 'frenzied'], title: 'the Twice-Victor', name: '<b>Old Snag</b> the Twice-Victor' } };
        g.progress.flags.settled = { 'tally-camp#1': { day: 4, name: 'Bandit the Once-Fled' } };
        return g; }`) });
      await W(() => window.__app.go('journal', { tab: 'grudges', from: 'world' }));
      await page.waitForSelector('.jr-tab');
      await page.waitForTimeout(200);
      const jr = await W(() => ({
        tabs: [...document.querySelectorAll('.jr-tab')].map(b => b.dataset.tab), on: document.querySelector('.jr-tab[aria-selected="true"]')?.dataset.tab,
        active: [...document.querySelectorAll('.jr-grudge[data-state="active"]')].map(e => e.innerText.replace(/\s+/g, ' ')),
        settled: [...document.querySelectorAll('.jr-grudge[data-state="settled"]')].map(e => e.innerText.replace(/\s+/g, ' ')),
        tags: document.querySelectorAll('.jr-grudge .jg-name *').length,
        small: [...document.querySelectorAll('.jr-tab')].filter(b => b.getBoundingClientRect().height < 44 || b.scrollWidth > b.clientWidth).length,
      }));
      check(jr.tabs.join(' ') === 'quests bounties ladder keys grudges' && jr.on === 'grudges', `${P} 19: the Journal's fifth tab is Grudges (${jr.tabs.join(' ')})`);
      check(jr.active.length === 1 && /Old Snag/.test(jr.active[0]) && /ironclad/i.test(jr.active[0]) && /frenzied/i.test(jr.active[0]) && /thornway/i.test(jr.active[0]), `${P} 19: the unsettled Grudge: name, where, its Omens ("${(jr.active[0] || '').slice(0, 90)}…")`);
      check(jr.settled.length === 1 && /Bandit the Once-Fled/.test(jr.settled[0]) && /Day 4/.test(jr.settled[0]), `${P} 19: the settled Grudge with its day ("${jr.settled[0] || ''}")`);
      check(jr.tags === 0 && /<b>Old Snag<\/b>/.test(jr.active[0] || ''), `${P} 19: a saved Grudge name stays text`);
      check(jr.small === 0, `${P} 19: the five tabs fit, 44 px tall`);
      await shot('journal-grudges');
      await noScroll('19 journal');
      await W(() => { const g = structuredClone(window.__app.game); g.progress.flags.grudges = {}; g.progress.flags.settled = {}; window.__app.setGame(g); window.__app.go('journal', { tab: 'grudges', from: 'world' }); });
      await page.waitForSelector('.jr-grudge-none', { timeout: 3000 });
      check(/No Grudges yet/.test(await page.innerText('.jr-grudge-none')), `${P} 19: the empty Grudges tab reads well`);
      // a real Grudge pack on the Sunward Road is seeded as a hunter; its "!" is red
      await W(() => { const g = structuredClone(window.__app.game); Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true }); g.progress.flags.grudges = { 'sr-skinks#0': { key: 'sr-skinks#0', nodeId: 'sr-skinks', wins: 1, flees: 0, omens: ['swift'], title: 'the Party-Breaker', name: 'Sand-Skink the Party-Breaker' } }; window.__app.setGame(g); window.__app.go('world'); });
      await page.waitForSelector('.screen-world .world-canvas');
      await closeOverlays();
      await teleport('sun-road', 12, 50, 's');
      await W(() => window.__world.grace(100000));
      const hunter = await W(() => window.__world.walkRoamers().find(r => r.enc === 'sr-skinks'));
      check(!!hunter && hunter.hunter === true && hunter.weak === false, `${P} 19: the Grudge pack is seeded as a hunter (${hunter ? JSON.stringify({ hunter: hunter.hunter, weak: hunter.weak }) : 'none'})`);
      if (hunter) {
        // bring it into view, across open sand, and let it notice the party
        await W(h => { const s = window.__world.state(); window.__world.roam(window.__world.walkRoamers().map(r => (r.id === h ? { ...r, x: s.x + 4, y: s.y, mood: 'wander', wait: 0 } : r)).filter(r => r.id === h)); }, hunter.id);
        await W(() => { window.__huntSeen = null; });
        await page.waitForFunction(() => { const e = window.__world.emotes().find(x => x.kind === '!hunt'); if (e) window.__huntSeen = e; return !!e; }, null, { timeout: 6000 }).catch(() => {});
        const em = await W(() => window.__huntSeen);
        check(!!em && em.target === hunter.id, `${P} 19: the hunter notices the party, and its "!" is the red one (${JSON.stringify(em)})`);
        await W(h => window.__world.event({ t: 'alert', id: h, hunter: true }), hunter.id); // show it again for the screenshot
        await shot('hunter');
      }
      // loot and Codex-page toasts
      await W(() => window.__world.story([{ t: 'gold', n: 150 }, { t: 'gems', gems: { 'glass-pearl': 2 } }, { t: 'materials', materials: { silver: 1 } }]));
      await page.waitForTimeout(150);
      const t1 = await toastNow();
      check(/\+150 gold/.test(t1) && /Glass Pearl ×2/.test(t1) && /1 silver/.test(t1), `${P} 19: story gems and materials toast by name ("${t1}")`);
      await W(() => window.__world.story([{ t: 'page', id: 'sunscorch' }]));
      await page.waitForTimeout(150);
      const t2 = await toastNow();
      check(/Codex Page II complete/.test(t2) && /Sunscorch Compact/.test(t2), `${P} 19: a finished page toasts its reward ("${t2}")`);
      await shot('toast');
      // the second council: its title card, the scene, then the end of Act II
      await W(() => {
        const g = structuredClone(window.__world.game());
        const st = g.progress.flags.story;
        Object.assign(st, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true });
        g.progress.brands = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash'];
        for (const b of g.progress.brands) st[`letter:${b}`] = true;
        g.progress.flags.grudges = {};
        window.__app.setGame(g); window.__app.go('world');
      });
      await page.waitForSelector('.screen-world .world-canvas');
      await closeOverlays();
      await teleport('keep', 15, 5, 'n');
      await W(() => window.__world.roam([]));
      await W(() => window.__world.press('n'));
      await page.waitForSelector('.ov-story.council-2', { timeout: 6000 });
      check(/Council sits again/.test(await page.innerText('.ov-story')) && /Four coals/.test(await page.innerText('.ov-story')), `${P} 19: the second council's title card`);
      await shot('council-2');
      await page.click('.ov-story .story-go');
      await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
      await playDialogue(/Let the Council talk/);
      await page.waitForSelector('.ov-story.tbc-act2', { timeout: 4000 });
      await page.waitForTimeout(300);
      const card = (await page.innerText('.ov-story')).replace(/\s+/g, ' ');
      // M5: the second council opens the Keep's east postern, so the card says so, and names the chapter after
      check(/End of Act II/i.test(card) && /east postern stands open/.test(card) && /Gloomfen opens in the next chapter/.test(card), `${P} 19: the end-of-Act-II card opens the Ironspire and names the next chapter ("${card.slice(0, 160)}…")`);
      await noScroll('19 act II card');
      await shot('act2');
      await page.click('.ov-story .story-go');
      await page.waitForTimeout(300);
      check(await W(() => !!window.__world.game().progress.flags.story['council-2-done']), `${P} 19: the second council is done (council-2-done)`);
    } catch (e) { check(false, `${P} 19: ${e.message.split('\n')[0]}`); }
  }

  // ================= 20. a road gate (M4.5): its guard's card, the win, and the way stays open ==========
  if (want(20)) {
    console.log(' -- 20 a road gate');
    try {
      const road = MAPS['hearth-road'].roads?.[0];
      const gateId = road?.gates?.[0];
      const gateE = gateId && MAPS['hearth-road'].entities.find(e => e.id === gateId);
      const ap = gateE && approachOf('hearth-road', gateId);
      if (!ap || !gateE.guard) throw new Error(`no guarded road gate on the Hearth Road (${gateId})`);
      await setup({ patch: noIntro });
      await teleport('hearth-road', ap.x, ap.y, ap.face);
      await W(() => window.__world.roam([]));
      const g0 = await W(id => window.__world.entity('hearth-road', id), gateId);
      check(g0 && g0.state === 'closed' && g0.solid, `${P} 20: the road gate ${gateId} is shut before its fight`);
      await page.waitForTimeout(250);
      const facing = await W(() => window.__world.state().prompt);
      check(/^A · .+ · Lv \d+ · \S/.test(facing) && !/The way is shut/.test(facing), `${P} 20: facing the gate, the prompt is its guard's fight: name, level and threat ("${facing}")`);
      await shot('road-gate');
      await W(d => window.__world.press(d), ap.face);
      await page.waitForSelector('.ov-prefight', { timeout: 3000 });
      const pf = await page.innerText('.ov-prefight');
      check(pf.includes(ENCOUNTERS[gateE.guard].name) && /Fight/.test(pf), `${P} 20: walking into the gate opens its guard's card (${ENCOUNTERS[gateE.guard].name})`);
      await shot('road-gate-card');
      await W(() => { window.__forceResult = { result: 'victory', xp: 10, gold: 5 }; });
      await page.click('.pf-fight');
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath');
      for (let i = 0; i < 8 && (await screen()) !== 'world'; i++) {
        // a chest's reveal plays first; its Continue arrives with the card
        if (await page.$('.ov-reveal')) { await page.waitForSelector('.ov-reveal .cont', { timeout: 8000 }); await page.click('.ov-reveal .cont'); }
        else if (await page.$('.af-foot .btn.primary')) await page.click('.af-foot .btn.primary');
        await page.waitForTimeout(300);
      }
      await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 4000 });
      await closeOverlays();
      const g1 = await W(id => window.__world.entity('hearth-road', id), gateId);
      check(g1 && g1.state === 'open' && !g1.solid, `${P} 20: after the win the gate is open for good (${g1 && g1.state})`);
      const s0 = await state();
      await W(d => window.__world.step(d, 2), ap.face);
      const s1 = await state();
      check(Math.abs(s1.x - s0.x) + Math.abs(s1.y - s0.y) === 2, `${P} 20: the party walks through the open gate (${s0.x},${s0.y} -> ${s1.x},${s1.y})`);
      await shot('road-gate-open');
    } catch (e) { check(false, `${P} 20: ${e.message.split('\n')[0]}`); }
  }


  // ================= M5 (P7): the Ironspire Peaks =====================================================
  // the second council sat (the Keep's east postern open), with Act I's and the Sunscorch's flags before it
  const council2 = `(g) => { Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true, 'council-2-done': true }); return g; }`;
  const ironFires = Object.keys(HEARTHS).filter(id => MAPS[HEARTHS[id].map]?.region === 'ironspire');
  // a tile next to an entity that its map's road (or first anchor) reaches with the entity shut, and the way
  // to face it: so a chasm is approached from the road's side, not from the ledge it leads to
  const reachBy = (mapId, entityId) => {
    const map = MAPS[mapId];
    const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
    const target = map?.entities.find(e => e.id === entityId);
    if (!target) return null;
    const wall = new Uint8Array(map.w * map.h);
    const put = a => { for (let y = Math.max(0, a[1]); y <= Math.min(map.h - 1, a[3]); y++) for (let x = Math.max(0, a[0]); x <= Math.min(map.w - 1, a[2]); x++) wall[y * map.w + x] = 1; };
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (tileOf(map.rows[y][x]).solid) wall[y * map.w + x] = 1;
    // fixed things are walls; gates stand open (their fights won) and fights are fought where they stand
    for (const e of map.entities) if (!['trigger', 'light', 'encounter', 'gate'].includes(e.kind) && !(e.kind === 'prop' && !e.solid)) put(areaOf(e));
    put(areaOf(target));
    const road = (map.roads || [])[0];
    const start = (road && map.anchors[road.from]) || Object.values(map.anchors)[0];
    const seen = new Uint8Array(map.w * map.h), q = [start];
    seen[start[1] * map.w + start[0]] = 1;
    for (let i = 0; i < q.length; i++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = q[i][0] + dx, ny = q[i][1] + dy, k = ny * map.w + nx;
        if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h || seen[k] || wall[k]) continue;
        seen[k] = 1; q.push([nx, ny]);
      }
    }
    const [x0, y0, x1, y1] = areaOf(target);
    const mx = Math.round((x0 + x1) / 2), my = Math.round((y0 + y1) / 2);
    for (const [x, y, face] of [[mx, y1 + 1, 'n'], [mx, y0 - 1, 's'], [x0 - 1, my, 'e'], [x1 + 1, my, 'w']]) {
      if (x >= 0 && y >= 0 && x < map.w && y < map.h && seen[y * map.w + x]) return { x, y, face };
    }
    return null;
  };
  const toWorld = async () => {
    if ((await screen()) === 'world') return;
    await W(() => window.__app.go('world'));
    await page.waitForSelector('.screen-world .world-canvas');
    await page.waitForTimeout(250);
    await closeOverlays();
  };

  // ================= 21. the Keep's east postern; the Ironspire on the Atlas ===========================
  if (want(21)) {
    console.log(' -- 21 the Keep\'s east postern');
    try {
      const X = MAPS.keep.exits.find(x => x.id === 'keep-e');
      const inside = { x: X.area[0] - 1, y: X.area[1], face: 'e' };
      await setup({ patch: combine(noIntro, act1) });
      await teleport('keep', inside.x, inside.y, inside.face);
      await W(() => window.__world.roam([]));
      await W(() => window.__world.press('e'));
      await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
      await page.waitForTimeout(700);
      const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
      check(msg.includes(X.sealed.text.slice(0, 24)) && (!X.sealed.hint || msg.includes(X.sealed.hint.slice(0, 24))), `${P} 21: before the second council the east postern is sealed and says what opens it ("${msg.slice(0, 120)}…")`);
      await shot('east-postern-sealed');
      await playDialogue();
      check((await state()).map === 'keep', `${P} 21: the party stays in the Keep`);
      // the Atlas keeps a padlock on the Ironspire, and no view of it; the padlock says what opens the road
      await W(() => window.__app.go('atlas', { mode: 'view', from: 'world', view: 'realm' }));
      await page.waitForSelector('.atlas-mk');
      await page.waitForTimeout(300);
      const a0 = await W(() => ({ views: [...document.querySelectorAll('.atlas-view')].map(b => b.dataset.view), lock: !!document.querySelector('.atlas-mk[data-key="sealed:ironspire"]') }));
      check(!a0.views.includes('ironspire') && a0.lock, `${P} 21: the Atlas keeps the Ironspire sealed (views ${a0.views.join(', ')}; padlock ${a0.lock})`);
      if (a0.lock) {
        await page.click('.atlas-mk[data-key="sealed:ironspire"]');
        await page.waitForTimeout(150);
        const note = (await page.innerText('.atlas-info')).replace(/\s+/g, ' ');
        check(/east postern/i.test(note) && /Council/.test(note), `${P} 21: the Ironspire's padlock says what opens its road ("${note.slice(0, 140)}")`);
      }
      await shot('atlas-ironspire-sealed');
      await toWorld();
      // the second council sat: the postern opens onto the East Road (the Old Bridge, a painted map), which plays
      // the road; the Rockslide Pass at its end plays the peaks
      await regame(council2);
      await teleport('keep', inside.x, inside.y, inside.face);
      await W(() => window.__world.roam([]));
      await W(() => window.__world.press('e'));
      await page.waitForFunction(to => window.__world && window.__world.state().map === to && !window.__world.state().transition, X.to, { timeout: 6000 });
      await closeOverlays();
      const s1 = await state();
      const an = MAPS[X.to].anchors[X.anchor];
      check(s1.map === X.to && Math.abs(s1.x - an[0]) + Math.abs(s1.y - an[1]) <= 1, `${P} 21: after the second council the postern opens onto ${MAPS[X.to].name} (${s1.map} ${s1.x},${s1.y})`);
      const track = await W(() => window.__app.audio.track);
      check(track === MAPS[X.to].music && track === 'road', `${P} 21: ${MAPS[X.to].name} plays the road (${track})`);
      const painted = await page.waitForFunction(() => window.__world.state().painted, null, { timeout: 8000 }).then(() => true, () => false);
      check(painted, `${P} 21: ${MAPS[X.to].name} is drawn from its painting`);
      await shot('east-road');
      const rp = MAPS['rockslide-pass'].anchors['from-camp'];
      await teleport('rockslide-pass', rp[0], rp[1], rp[2]);
      await page.waitForTimeout(400);
      const track2 = await W(() => window.__app.audio.track);
      check(track2 === 'peaks', `${P} 21: up the East Road, the Rockslide Pass plays the peaks track (${track2})`);
      await shot('rockslide-pass');
      // the Atlas: the padlock is off, and the Ironspire view has every Ironspire Hearthfire
      await W(() => window.__app.go('atlas', { mode: 'view', from: 'world' }));
      await page.waitForSelector('.atlas-mk');
      const views = await page.$$eval('.atlas-view', bs => bs.map(b => b.dataset.view));
      check(views.includes('ironspire'), `${P} 21: the Atlas has an Ironspire view once the postern is open (${views.join(', ')})`);
      await page.click('.atlas-view[data-view="ironspire"]');
      await page.waitForTimeout(400);
      const stillSealed = Object.values(REGIONS).filter(r => !r.open).map(r => `sealed:${r.id}`);
      const mk = await W(() => ({
        fires: document.querySelectorAll('.atlas-mk.mk-hearth').length, sealed: [...document.querySelectorAll('.atlas-mk.mk-sealed')].map(e => e.dataset.key),
        small: [...document.querySelectorAll('.atlas-mk')].filter(e => e.getBoundingClientRect().width < 44).length, view: document.querySelector('.atlas-frame').dataset.view,
        labels: [...document.querySelectorAll('.atlas-frame.labels .mk-lbl:not(.crowded)')].map(e => e.textContent), title: document.querySelector('.topbar h1')?.textContent || '',
      }));
      check(mk.view === 'ironspire' && /Ironspire/.test(mk.title) && mk.fires === ironFires.length && mk.small === 0, `${P} 21: the Ironspire view shows its ${ironFires.length} Hearthfires, all 44 px (${JSON.stringify({ view: mk.view, title: mk.title, fires: mk.fires, small: mk.small })})`);
      check(!mk.sealed.includes('sealed:ironspire') && mk.sealed.join() === stillSealed.join(), `${P} 21: the Ironspire's padlock is off; the regions still to come keep theirs (${mk.sealed.join(', ') || 'none'})`);
      if (!phone) {
        const places = Object.values(LORE).filter(p => p.region === 'ironspire' && p.map).map(p => p.name);
        check(mk.labels.some(l => places.some(n => l.startsWith(n))), `${P} 21: the laptop's markers name the Ironspire's places (${mk.labels.join(' · ')})`);
      }
      const bar = await W(() => { const b = document.querySelector('.atlas-views'); const r = b.getBoundingClientRect(); return { right: Math.round(r.right), w: innerWidth, rows: new Set([...b.children].map(c => Math.round(c.getBoundingClientRect().top))).size, min: Math.min(...[...b.children].map(c => c.getBoundingClientRect().height)) }; });
      check(bar.right <= bar.w && bar.min >= 44, `${P} 21: the ${views.length} view buttons fit the screen, 44 px tall (${JSON.stringify(bar)})`);
      await shot('atlas-ironspire');
      await noScroll('21 atlas');
    } catch (e) { check(false, `${P} 21: ${e.message.split('\n')[0]}`); }
  }

  // ================= 22. Peak's Veil: the Cloister Fire, Mother Wynn, the bell ==========================
  if (want(22)) {
    console.log(' -- 22 Peak\'s Veil');
    try {
      await setup({ patch: combine(noIntro, council2) });
      const hf = await W(() => window.__worldTools.hearth('veil-hearth'));
      await teleport(hf.map, hf.x, hf.y, hf.face);
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-hearth', { timeout: 3000 });
      check((await page.innerText('.ov-hearth')).includes(HEARTHS['veil-hearth'].name), `${P} 22: ${HEARTHS['veil-hearth'].name}'s menu opens`);
      await shot('veil-hearth');
      await page.click('.ov-hearth [data-primary]');
      await page.waitForTimeout(500);
      await closeOverlays();
      const k = await W(() => { const g = window.__world.game(); return { kindled: !!g.progress.flags.kindled['veil-hearth'], last: g.progress.lastHearthfire }; });
      check(k.kindled && k.last === 'veil-hearth', `${P} 22: resting kindles the Cloister Fire (${JSON.stringify(k)})`);
      // Mother Wynn: the first meeting gives the Highfold gate's key (a night's scene after the rest may
      // still be on its way: it is played out first)
      let who = '';
      for (let i = 0; i < 3 && !/Wynn/i.test(who); i++) {
        await page.waitForTimeout(400);
        await closeOverlays();
        await standBy('peaks-veil', 'wynn', ['s', 'w', 'e', 'n']);
        await W(() => window.__world.roam([]));
        await pressA();
        await page.waitForSelector('.ov-dialogue .dlg-name', { timeout: 3000 });
        await page.waitForTimeout(150);
        who = await page.innerText('.ov-dialogue .dlg-name');
        if (!/Wynn/i.test(who)) await playDialogue();
      }
      check(/Wynn/i.test(who), `${P} 22: A talks to Mother Wynn (${who})`);
      await shot('wynn');
      await playDialogue();
      const st1 = await W(() => window.__world.game().progress.flags.story);
      check(!!st1['met-wynn'] && !!st1['highfold-open'], `${P} 22: meeting Wynn opens the Highfold gate (met-wynn, highfold-open)`);
      // her Abbess at rest (the Drowned Abbess's fight won): the bell rings, and the Veilbell is yours
      await regame(`(g) => { g.progress.flags.beaten['fm-shrine'] = 1; g.progress.flags.cleared['fm-shrine'] = true; return g; }`);
      await standBy('peaks-veil', 'wynn', ['s', 'w', 'e', 'n']);
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
      let revealed = false;
      for (let i = 0; i < 10; i++) {
        if (await page.$('.ov-dialogue')) { await playDialogue(/Ring the bell/); continue; }
        if (await page.$('.ov-reveal')) {
          await page.waitForSelector('.ov-reveal .cont', { timeout: 8000 });
          if (!revealed) await shot('veilbell');
          revealed = true;
          await page.click('.ov-reveal .cont');
          await page.waitForTimeout(300);
          continue;
        }
        if (await page.$('.ov')) { await closeOverlays(); continue; }
        break;
      }
      const g2 = await W(() => { const g = window.__world.game(); return { rung: !!g.progress.flags.story['bell-rung-veil'], bell: g.inventory.some(i => i.base === 'veilbell'), claimed: !!g.codex.veilbell?.claimed, quest: g.progress.flags.quests?.['bell-of-veil'] || null }; });
      check(g2.rung && g2.bell && g2.claimed && g2.quest === 'claimed', `${P} 22: the bell rings and the Veilbell is yours (${JSON.stringify(g2)})`);
      check(revealed, `${P} 22: the Veilbell's card is revealed`);
      // the Journal: the Bell of Peak's Veil reads as done
      await W(() => window.__app.go('journal', { tab: 'quests', from: 'world' }));
      await page.waitForSelector('.jr-quest', { timeout: 3000 });
      const q = await W(() => document.querySelector('.jr-quest[data-id="bell-of-veil"]')?.className || '');
      check(/is-done/.test(q), `${P} 22: the Journal has the Bell of Peak's Veil done (${q})`);
      await noScroll('22 journal');
      await toWorld();
    } catch (e) { check(false, `${P} 22: ${e.message.split('\n')[0]}`); }
  }

  // ================= 23. a chasm crossed with the Windstep Boots; an ice wall with the Anvil Heart ============
  if (want(23)) {
    console.log(' -- 23 a chasm and an ice wall');
    try {
      const lockOn = type => {
        for (const m of Object.values(MAPS)) {
          if (m.region !== 'ironspire') continue;
          const e = m.entities.find(x => x.kind === 'lock' && x.lock === type);
          if (e) return { map: m.id, e };
        }
        return null;
      };
      await setup({ patch: combine(noIntro, council2) });
      for (const [type, relic, from] of [['chasm', 'windstep-boots', 'Rhune the Pass-Warden'], ['ice', 'anvil-heart', 'Mother Anvil']]) {
        const L = lockOn(type);
        if (!L) { block(`${P} 23: no ${type} lock on an Ironspire map yet (P2)`); continue; }
        const spot = reachBy(L.map, L.e.id);
        if (!spot) throw new Error(`no way up to the ${type} lock ${L.e.id} on ${L.map}`);
        await regame(roadsWon(L.map));
        await teleport(L.map, spot.x, spot.y, spot.face);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await W(d => window.__world.face(d), spot.face);
        const power = RELICS[relic].mapPower;
        // the A button says what the lock asks of you (ui/screens/world.js LOCK_VERB)
        const verb = { chasm: 'Cross', ice: 'Melt' }[type];
        const aNow = await page.$eval('.w-a-label', e => e.textContent).catch(() => '');
        check(aNow === verb, `${P} 23: facing the ${LOCKS[type].name}, A reads "${verb}" ("${aNow}")`);
        await pressA();
        await page.waitForSelector('.ov-lock', { timeout: 3000 });
        const t1 = (await page.innerText('.ov-lock')).replace(/\s+/g, ' ');
        check(t1.includes(LOCKS[type].name) && /✗/.test(t1) && !/✓/.test(t1) && t1.includes(RELICS[relic].name), `${P} 23: the ${LOCKS[type].name} (${L.e.id}) lists its keys, none held ("${t1.slice(0, 120)}…")`);
        await shot(`${type}-shut`);
        await page.click('.ov-lock [data-primary]');
        await page.waitForTimeout(200);
        await regame(`(g, T) => { g.inventory.push(T.relicItem('${relic}', '${from}')); g.codex['${relic}'] = { sighted: true, claimed: true, awakened: false }; return g; }`);
        await W(() => window.__world.roam([]));
        await W(d => window.__world.face(d), spot.face);
        await pressA();
        await page.waitForSelector('.ov-lock', { timeout: 3000 });
        const t2 = (await page.innerText('.ov-lock')).replace(/\s+/g, ' ');
        const use = await page.$('.ov-lock .lock-use');
        check(/✓/.test(t2) && !!use && (await use.innerText()).includes(RELICS[relic].name), `${P} 23: with ${RELICS[relic].name} (${power.name}) the ${LOCKS[type].name} opens ("${use ? await use.innerText() : 'no Use button'}")`);
        await shot(`${type}-key`);
        if (use) await use.click();
        await page.waitForTimeout(350);
        await closeOverlays();
        check(await W(id => !!window.__world.game().progress.flags.unlocked?.[id], L.e.id), `${P} 23: the ${LOCKS[type].name} is open for good (${L.e.id})`);
        const e1 = await W(([m, id]) => window.__world.entity(m, id), [L.map, L.e.id]);
        check(e1 && !e1.solid, `${P} 23: the ${LOCKS[type].name} no longer blocks the way (${JSON.stringify(e1)})`);
        const s0 = await state();
        await W(d => window.__world.step(d, 1), spot.face);
        const s1 = await state();
        check(Math.abs(s1.x - s0.x) + Math.abs(s1.y - s0.y) === 1, `${P} 23: the party steps onto the ${LOCKS[type].name} (${s0.x},${s0.y} -> ${s1.x},${s1.y})`);
      }
    } catch (e) { check(false, `${P} 23: ${e.message.split('\n')[0]}`); }
  }

  // ================= 24. Mother Anvil's pre-fight card =============================================
  if (want(24)) {
    console.log(' -- 24 Mother Anvil');
    try {
      const E = ENCOUNTERS['mother-anvil'];
      const where = Object.values(MAPS).find(m => m.entities.some(e => e.kind === 'encounter' && e.enc === 'mother-anvil'));
      const ent = where.entities.find(e => e.kind === 'encounter' && e.enc === 'mother-anvil');
      await setup({ patch: combine(noIntro, council2) });
      await standBy(where.id, ent.id, ['s', 'n', 'w', 'e']);
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-prefight', { timeout: 3000 });
      await page.waitForTimeout(300);
      const pf = (await page.innerText('.ov-prefight')).replace(/\s+/g, ' ');
      check(pf.includes(E.name) && /Champion/.test(pf), `${P} 24: Mother Anvil's pre-fight card: the Champion ("${pf.slice(0, 90)}…")`);
      const pieces = ['worldforge-hammer', 'anvil-heart'].map(id => RELICS[id].name.replace(/^The /, ''));
      check(pieces.every(n => pf.includes(n)) && /Glinting/i.test(pf), `${P} 24: its pieces glint on the card: ${pieces.join(' and ')}`);
      check(pf.includes(BRANDS[E.brand].name.replace(/^The /, '')), `${P} 24: the card names ${BRANDS[E.brand].name}`);
      const worn = await W(() => [...document.querySelectorAll('.pf-relic')].map(b => b.innerText.replace(/\s+/g, ' ')));
      check(worn.some(t => /Anvil Heart/.test(t) && /Worn/.test(t)) && worn.some(t => /Worldforge Hammer/.test(t) && /Held by/.test(t)), `${P} 24: the hammer is held and the heart worn (${worn.join(' | ')})`);
      await shot('mother-anvil-prefight');
      await noScroll('24 prefight');
      await page.click('.ov-prefight .pf-not-yet');
      await page.waitForTimeout(200);
    } catch (e) { check(false, `${P} 24: ${e.message.split('\n')[0]}`); }
  }

  // ================= 25. the Ironhold Deeps' darkness, lit by the Rime Crozier ==========================
  if (want(25)) {
    console.log(' -- 25 the Ironhold Deeps');
    try {
      // a Stillwater party carries no flame (no Kindle, no Lamplight), and nobody has Attunement 5
      await setup({ starter: 'stillwater-lance', patch: combine(noIntro, council2) });
      const D = MAPS['ironhold-deeps'];
      const hf = await W(() => window.__worldTools.hearth('deeps-forge'));
      const at = hf && hf.map === D.id ? [hf.x, hf.y] : Object.values(D.anchors)[0];
      await teleport(D.id, at[0], at[1], 's');
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const d0 = await state();
      check(d0.map === D.id && d0.dark, `${P} 25: the Deeps are dark without a light key (${d0.map}, dark ${d0.dark})`);
      await shot('deeps-dark');
      await regame(`(g, T) => { g.inventory.push(T.relicItem('rime-crozier', 'the Rime-Abbot')); g.codex['rime-crozier'] = { sighted: true, claimed: true, awakened: false }; return g; }`);
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const d1 = await state();
      check(d1.map === D.id && !d1.dark, `${P} 25: the Rime Crozier's light lifts the dark (${d1.dark})`);
      await shot('deeps-lit');
    } catch (e) { check(false, `${P} 25: ${e.message.split('\n')[0]}`); }
  }

  // ================= 26. performance on the Frost Road ===============================================
  if (want(26)) {
    console.log(' -- 26 the Frost Road performance');
    try {
      const FR = MAPS['frost-road'];
      // the longest open east-west stretch of the map (the road across the plain): walkable tiles, no fixed
      // thing in the way (its gates stand open, its fights won), so the walk crosses the view back and forth
      const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
      const fixed = new Set();
      for (const e of FR.entities) {
        if (['trigger', 'light', 'encounter', 'gate'].includes(e.kind) || (e.kind === 'prop' && !e.solid) || (e.kind === 'lock' && LOCKS[e.lock]?.soft)) continue;
        const [x0, y0, x1, y1] = areaOf(e);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fixed.add(`${x},${y}`);
      }
      let best = { y: 0, x0: 0, len: 0 };
      for (let y = 0; y < FR.h; y++) {
        let run = 0;
        for (let x = 0; x <= FR.w; x++) {
          const open = x < FR.w && !tileOf(FR.rows[y][x]).solid && !fixed.has(`${x},${y}`);
          if (open) { run++; continue; }
          if (run > best.len) best = { y, x0: x - run, len: run };
          run = 0;
        }
      }
      const start = [best.x0 + 1, best.y];
      await setup({ patch: combine(noIntro, council2, levelUp.replace(/LVL/g, '16'), roadsWon('frost-road')) });
      await teleport(FR.id, start[0], start[1], 'e');
      await closeOverlays();
      await W(() => window.__world.grace(100000));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(400);
      await W(() => { window.__world.resetPerf(); window.__drawSamples = []; window.__sampling = true; });
      await W(() => { window.__forceResult = { result: 'fled', sticky: true }; });
      const work = [], draws = [];
      let frames = 0, battles = 0, maxRoamers = 0, farthest = 0;
      const collect = async () => {
        const p = await W(() => (window.__world ? window.__world.perf() : null));
        if (!p) return;
        work.push(...p.work.filter(v => v > 0)); draws.push(...p.draws); frames += p.frames;
        await W(() => window.__world.resetPerf());
      };
      const t0 = Date.now();
      let legs = 0;
      while (Date.now() - t0 < 10000) {
        await hold(legs % 6 < 3 ? 'e' : 'w', 1150);
        legs++;
        if ((await screen()) !== 'world') {
          battles++;
          for (let i = 0; i < 6 && (await screen()) !== 'world'; i++) { await page.click('.af-foot .btn.primary').catch(() => {}); await page.waitForTimeout(300); }
          await page.waitForSelector('.screen-world .world-canvas', { timeout: 4000 }).catch(() => {});
          await W(() => window.__world && window.__world.grace(100000));
          continue;
        }
        if (await page.$('.ov')) await closeOverlays();
        await collect();
        const s = await state();
        if (s) { maxRoamers = Math.max(maxRoamers, s.roamers.length); farthest = Math.max(farthest, s.x); }
      }
      await W(() => { window.__sampling = false; window.__forceResult = null; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const samples = await W(() => window.__drawSamples);
      const pct = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
      const p95 = pct(work, 0.95), p50 = pct(work, 0.5);
      const dMax = Math.max(0, ...draws), sMax = Math.max(0, ...samples), dP95 = pct(draws, 0.95);
      const line = `${P} 26: Frost Road, 4x throttle, ${frames} frames in 10 s, ${maxRoamers} roamers, walked out to x=${farthest}: frame JS p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms; drawImage per frame p95 ${dP95}, max ${Math.max(dMax, sMax)}${battles ? `; ${battles} fights interrupted the walk` : ''}`;
      check(frames >= 100 && farthest >= start[0] + 8, `${P} 26: the walk crossed the Frost Road (${frames} frames measured, out to x=${farthest})`);
      perfLines.push(line);
      console.log('  PERF', line);
      // the M5 gate (spec §8): p95 frame JS 16 ms and 40 drawImage a frame at 4x throttle
      check(p95 <= 16, `${P} 26: p95 frame time ${p95.toFixed(2)} ms <= 16 ms`);
      check(Math.max(dMax, sMax) <= 40, `${P} 26: drawImage per frame ${Math.max(dMax, sMax)} <= 40`);
      await shot('frost-road');
    } catch (e) { check(false, `${P} 26: ${e.message.split('\n')[0]}`); }
  }

  // ================= 27. the Stormwatch board; the third council's card ===========================
  if (want(27)) {
    console.log(' -- 27 the Stormwatch board, the third council');
    try {
      // the Stormwatch board (walked up to in Stormwatch): Captain Ysolde's bounties, her board first
      const mine = Object.values(BOUNTIES).filter(b => b.giver === 'ysolde');
      const swBoard = MAPS.stormwatch.entities.find(e => e.kind === 'board');
      await setup({ patch: combine(noIntro, council2) });
      if (swBoard) {
        await standBy('stormwatch', swBoard.id, ['s', 'e', 'w', 'n']);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await pressA();
        await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'journal', null, { timeout: 4000 });
      } else {
        block(`${P} 27: no board on the Stormwatch map yet (P2)`);
        await W(() => window.__app.go('journal', { tab: 'bounties', from: 'world' }));
      }
      await page.waitForSelector('.jr-board', { timeout: 3000 });
      await page.waitForTimeout(200);
      const board = await W(() => { const b = document.querySelector('.jr-board[data-giver="ysolde"]'); return b ? { lede: b.querySelector('.jr-lede').textContent, rows: [...b.querySelectorAll('.jr-bounty')].map(r => r.dataset.id), text: b.innerText, first: document.querySelector('.jr-board').dataset.giver, tab: document.querySelector('.jr-panel')?.dataset.tab } : null; });
      check(board && board.tab === 'bounties' && board.rows.length === mine.length && mine.every(b => board.rows.includes(b.id)) && /Stormwatch/.test(board.lede), `${P} 27: the Stormwatch board opens the Journal on Captain Ysolde's ${mine.length} bounties (${board ? board.rows.join(', ') : 'none'})`);
      check(board?.first === 'ysolde', `${P} 27: in the Ironspire, the Stormwatch board comes first (${board?.first})`);
      check(!board || mine.every(b => board.text.includes(b.name)), `${P} 27: each Stormwatch bounty reads by name`);
      await shot('stormwatch-board');
      await noScroll('27 bounties');
      await W(() => window.__app.go('journal', { tab: 'keys', from: 'world' }));
      await page.waitForSelector('.jr-seals', { timeout: 3000 });
      const seals = (await page.innerText('.jr-seals')).replace(/\s+/g, ' ');
      check(/road to the Ironspire Peaks/.test(seals) && /east postern stands open/.test(seals), `${P} 27: the Keys tab opens the Ironspire's road ("${seals.slice(0, 160)}…")`);
      await toWorld();
      // the third council: its scene, then "The Ironspire is yours", naming the next chapter
      await W(() => {
        const g = structuredClone(window.__world.game());
        const st = g.progress.flags.story;
        Object.assign(st, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true, 'council-2-done': true, 'ironspire-complete': true });
        g.progress.brands = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash', 'brand-of-iron', 'brand-of-frost'];
        for (const b of g.progress.brands) st[`letter:${b}`] = true;
        window.__app.setGame(g); window.__app.go('world');
      });
      await page.waitForSelector('.screen-world .world-canvas');
      await closeOverlays();
      await teleport('keep', 15, 5, 'n');
      await W(() => window.__world.roam([]));
      await W(() => window.__world.press('n'));
      await page.waitForSelector('.ov-story.council-3, .ov-dialogue', { timeout: 6000 });
      if (await page.$('.ov-story.council-3')) {
        check(/Council sits a third time/.test(await page.innerText('.ov-story')), `${P} 27: the third council's title card`);
        await shot('council-3');
        await page.click('.ov-story .story-go');
        await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
      } else block(`${P} 27: the third council plays no title card yet (ui/screens/world.js: playCouncil(ctx, { third: true }) for council-3)`);
      await playDialogue(/Let the Council talk/);
      await page.waitForSelector('.ov-story.tbc-ironspire', { timeout: 4000 });
      await page.waitForTimeout(300);
      const card = (await page.innerText('.ov-story')).replace(/\s+/g, ' ');
      const next = Object.values(REGIONS).filter(r => r.act >= 2 && !['sunscorch', 'ironspire'].includes(r.id)).map(r => r.name);
      check(/The Ironspire is yours/i.test(card) && /To be continued/i.test(card) && next.every(n => card.includes(n)) && /opens in the next chapter/.test(card), `${P} 27: the third council ends on "The Ironspire is yours", naming ${next.join(', ')} ("${card.slice(0, 160)}…")`);
      check(card.includes(`6/${BRAND_TOTAL}`), `${P} 27: the card counts six Brands of ${BRAND_TOTAL}`);
      const bw = card.indexOf('The Blackwater still holds the causeway.');
      check(bw >= 0 && bw < card.lastIndexOf('opens in the next chapter'), `${P} 27: "The Blackwater still holds the causeway." comes just before the next chapter's line`);
      const fit = await W(() => { const c = document.querySelector('.ov-story .story-card'); const r = c.getBoundingClientRect(); const go = document.querySelector('.ov-story .story-go').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, goH: Math.round(go.height), goW: Math.round(go.width) }; });
      check(fit.left >= 0 && fit.right <= fit.w && fit.goH >= 44, `${P} 27: the card fits the screen, its button 44 px (${JSON.stringify(fit)})`);
      await noScroll('27 ironspire card');
      await shot('ironspire-card');
      await page.click('.ov-story .story-go');
      await page.waitForTimeout(300);
      check(await W(() => !!window.__world.game().progress.flags.story['council-3-done']), `${P} 27: the third council is done (council-3-done)`);
    } catch (e) { check(false, `${P} 27: ${e.message.split('\n')[0]}`); }
  }

  const fontOnly = failed.length && failed.every(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  const real = errors.filter(e => !/favicon/i.test(e) && !(/Failed to load resource/.test(e) && (fontOnly || /ERR_CERT|ERR_TUNNEL|ERR_NAME|ERR_PROXY/.test(e))));
  check(real.length === 0, `${P}: no console errors (${real.slice(0, 5).join(' | ')})`);
  await context.close();
}

for (const V of VIEWPORTS) {
  try { await run(V); } catch (e) { fails.push(`${V.name}: ${e.message.split('\n')[0]}`); console.log('  ERROR', e.message); }
}
await browser.close();
console.log(`\nScreenshots: ${outDir}`);
if (perfLines.length) console.log(`Performance:\n - ${perfLines.join('\n - ')}`);
if (blocked.length) console.log(`Blocked on other packages (${blocked.length}):\n - ${blocked.join('\n - ')}`);
console.log(fails.length ? `\nE2E-WORLD FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nE2E-WORLD passed');
process.exit(fails.length ? 1 : 0);
