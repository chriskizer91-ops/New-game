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
//      Page III (M5) and Page IV (M6: open, its 14 pockets and reward, its road note; no page sealed); after a
//      forced full claim of Page I's relics its reward shows, in gold, and an Awakened pocket glows
//   19 the Journal's Grudges tab (one active, one settled; a saved name stays text), its empty state;
//      a real Grudge pack seeded as a hunter shows a red "!" (emote '!hunt'); loot and Codex-page
//      toasts; the second council's title card, then the end-of-Act-II card naming Ironspire and Gloomfen
// Milestone 4.5 (docs/M45-SPEC.md §5):
//   20 a road gate: the first gate on the Hearth Road is shut; walking into it opens its guard's
//      pre-fight card; after the win it is open, no longer solid, and the party walks through
// M5 (docs/M5-SPEC.md §8, P7; counts come from the data):
//   21 the Keep's east postern: sealed until the second council (its text and what opens it; the Atlas
//      keeps a padlock on the Ironspire), then open onto the Rockslide Pass (its own track); the Atlas's
//      Ironspire view with every Ironspire Hearthfire, and the Gloomfen's padlock kept (M6: its road, the fen
//      stair, opens only with the third council, though its maps exist)
//   22 Peak's Veil: rest at the Cloister Fire (kindled); Mother Wynn opens the Highfold; with the Abbess at
//      rest the bell rings and the Veilbell is yours (its card)
//   23 a chasm (A reads Cross): ✗ without a key, crossed with the Windstep Boots; an ice wall (A reads Melt)
//      melted with the Anvil Heart
//   24 Mother Anvil's pre-fight card: the Champion, the Worldforge Hammer and the Anvil Heart glinting, and
//      the Brand of Iron
//   25 the Ironhold Deeps are dark without a light key (a Stillwater party), and lit by the Rime Crozier
//   26 performance on the Frost Road, measured like 11 (the M5 gate: p95 frame JS 16 ms, 40 drawImage), and the same
//      gate on a painted map (the Old Bridge, drawn at twice the canvas density)
//   27 the Stormwatch board in the Journal (Captain Ysolde's bounties); the third council's title card and end
//      card, "The Ironspire is yours", the Blackwater line, then (M6) the Gloomfen Marsh's road open: the fen stair
//      below Mossfall (360 and 1280 wide)
// M6 (docs/M6-SPEC.md §8, P7; counts come from the data):
//   28 Mossfall's fen stair: sealed until the third council (its text and what opens it; the Atlas keeps the Gloomfen's
//      padlock), then open onto the Murkway with the Gloomfen card (the player's painting under "Act II · The Gloomfen
//      Marsh", once a save) and the fen track; the Atlas's Gloomfen view with every Gloomfen Hearthfire
//   29 a bog step costs every hero HP without a key (the prompt says what), and nothing with the Bogstriders
//   30 Willowmurk: rest at the Willow Hearth (kindled); Elder Moss (met-moss); the Journal's Gloomfen quests, and Mayor
//      Gretch's Bogmire board (its bounties from the data, first in the Gloomfen)
//   31 Hodge's bar: shut across the road; today's price on his choice, paid (a toast of what it cost), and the bar
//      lifts; a party that cannot pay sees the price shut; his game: its three checks, once a day
//   32 Tamsin's duel on Rotbridge: her card ("Losing is a yield", the Bogstriders worn); a forced win, then her fall;
//      then she is gone from the bridge (won, or yielded: the encounter's `leaves`), and the Ladder has the rumour of
//      the man on the barge, which it did not have before
//   33 the Lanternfen's fog: the sight closes in to the fog radius without a key, the mist thins with the Lamplighter's
//      Lantern; the Keys tab's fog
//   34 the Lantern Mother's pre-fight card: the Champion, the lantern held and the veil worn, the Brand of Lanterns
//   35 the long boardwalk's east end: sealed until the Brand of Lanterns, then open onto the Misthollow Ruins
//   36 the Drowned Belfry is dark without a light key, and lit by the Deep-Pearl
//   37 the causeway: under water until the Brand of the Deep, then walked from Bogmire home through the Keep's
//      south-west gate, and out again
//   38 the fourth council: its title card, its scene and the end-of-Act-II card (all eight Brands, the Hollow Council
//      named; M7: "Act III begins.", its Act III chip open, no road opened; 360 and 1280 wide)
//   39 performance on the Lanternfen (in its thick fog) and the long boardwalk, measured like 26 (p95 frame JS 16 ms,
//      40 drawImage)
// M7 (docs/M7-SPEC.md §8, P7; counts come from the data; a check that needs a package's content still standing in for it
// is driven through the test seams where it can be, and reported BLOCKED where it cannot):
//   40 the Opening: the vault stair sealed (its words) before the fifth council; the council's scene and its title card,
//      "Act III: The Hollow Council" (P3's council-5 ends with { end: 'act3-open' }; driven through the story seam until
//      it does); the stair open after (its prop), down to the Hollow Hall with the Hearth Below's card (the still, or its
//      drawn scene; once a save) and the dungeon track
//   41 the Hollow Hall: its stair back up open before the first fight; the first Council member's card (the hollow d20
//      +4 once P4's family is on the tier); a forced win; then the stair sealed behind ("filled with ash"); the fourth
//      beaten, open again
//   42 the Chained Deep: Tamsin waits before the forge door; she joins (tamsin-return) and leaves the map; the
//      Worldforge's boss track; the Unsmith's card: him, his pieces, Tamsin fighting beside you, and (P4's family)
//      his two dice and what he will take (rules/codex.js stolenFor)
//   43 the Worldforge's heart: words only before the Unsmith falls; after, its choice, with Kindle Anew shown shut and
//      its reasons (P3's the-heart; BLOCKED while it has no choices)
//   44 an ending: its card (the still, or its drawn scene; Kindle Anew names the Masterpiece as text), the credits (a
//      hostile Warden's name shown as text), the last card ("The post-game opens in the next chapter"), then back in the
//      Great Hall with the ending remembered (a real choice at the heart once P3's scenes land; else the story seam)
//   45 the Masterpiece at Hilda's forge ({ open: 'masterpiece' }): the reasons while it is not offered; then the bases,
//      the price, a hostile name refused (never run, never markup), a good one forged, the reveal with its primal
//      frame, the name shown as text; one per save
//   46 the Journal's Act III (the road below from the fourth council, sealed then open; the five Act III posters) and
//      the Atlas's "Below the Keep" marker, opening the Below view with its four maps listed (and from below, where you
//      are)
//   47 performance in each of the Hearth Below's four maps, measured like 39 (p95 frame JS 16 ms, 40 drawImage)
// Every place is found from the map data (entities, exits, anchors, roads), never by fixed coordinates.
// Screenshots use the real fonts when tools/e2e-flow.mjs has cached them (<tmp>/aethermoor-font-cache).
// Playwright is not a project dependency: it comes from the global npm root.
// Owner: WP7; M4 P7b (12-19); M5 P7 (21-27, and 18/19's Page III and Act II checks for M5); M6 P7 (28-39, and
// 18/21/27 moved to M6's truth: Page IV open, the Gloomfen's padlock kept until the third council, the fen stair open);
// M7 P7 (40-47, and 18/38 moved to M7's truth: five Codex pages, Page V; "Act III begins.", its chip open; 39's walk
// is perfWalk, which 47 shares).
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
import { LADDER } from '../src/data/ladder.js';
import { TUNING } from '../src/data/tuning.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { FOES } from '../src/data/foes.js';
import { ENDINGS } from '../src/data/endings.js';
import { START_AT } from '../src/data/world.js';
import { dialogueView } from '../src/rules/story.js';
import { stolenFor } from '../src/rules/codex.js';
import { regionOpen } from '../src/ui/lib/atlas-geo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
const outDir = path.resolve(args.out && args.out !== true ? args.out : path.join(os.tmpdir(), 'aeth-e2e-world'));
mkdirSync(outDir, { recursive: true });
const only = args.scenario ? new Set(String(args.scenario).split(',').map(Number)) : null;
const want = n => !only || only.has(n);

// M4.5: where the road meets a gate: a tile next to it that the road's start reaches while it is shut
// (with its guard standing), and the way to face it. Terrain and fixed things are walls. M6: `pastGates`, the
// road's other gates stand open (Tamsin's gate is past Hodge's bar).
function approachOf(mapId, gateId, { pastGates = false } = {}) {
  const map = MAPS[mapId];
  const road = (map.roads || []).find(r => r.gates.includes(gateId));
  const areaOf = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
  const gate = map.entities.find(e => e.id === gateId);
  const guard = gate.guard && map.entities.find(e => e.kind === 'encounter' && e.enc === gate.guard);
  const wall = new Uint8Array(map.w * map.h);
  const put = a => { for (let y = a[1]; y <= a[3]; y++) for (let x = a[0]; x <= a[2]; x++) wall[y * map.w + x] = 1; };
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (tileOf(map.rows[y][x]).solid) wall[y * map.w + x] = 1;
  for (const e of map.entities) if (!['trigger', 'light', 'encounter'].includes(e.kind) && !(e.kind === 'prop' && !e.solid) && !(pastGates && e.kind === 'gate' && e.id !== gateId)) put(areaOf(e));
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
      // M7: five pages, Page V (the Hearth Below) the fifth
      check(c.tabs.join(' ') === 'verdant:true sunscorch:false ironspire:false gloomfen:false below:false', `${P} 18: page tabs I · II · III · IV · V, Page I open (${c.tabs.join(' ')})`);
      const row = await page.$$eval('.cx-tab', bs => new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size);
      check(row === 1, `${P} 18: the five page tabs stand in one row (${row} rows)`);
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
      // M6: Page IV is open too (its pockets from the data, its progress and reward), and until the third council
      // says what opens its road: the fen stair. No page is sealed any more.
      const IV = PAGES.find(p => p.id === 'gloomfen'), nIV = Object.values(RELICS).filter(r => r.codex >= IV.from && r.codex <= IV.to).length;
      await page.click('.cx-tab[data-page="gloomfen"]');
      await page.waitForTimeout(200);
      c = await cx();
      const road4 = await W(() => document.querySelector('.cx-road')?.textContent || '');
      check(!c.sealed && nIV === IV.to - IV.from + 1 && c.pockets === nIV && new RegExp(`0 of ${nIV} claimed`).test(c.prog) && c.earned === '0' && c.reward.includes(IV.reward.name) && /Gloomfen Marsh/.test(c.name), `${P} 18: Page IV is open: ${nIV} pockets, "${c.prog}", ${c.reward.replace(/\s+/g, ' ').slice(0, 48)}…`);
      check(/fen stair/.test(road4) && /third/.test(road4), `${P} 18: before the third council Page IV says what opens its road ("${road4}")`);
      const sealedTabs = await W(() => document.querySelectorAll('.cx-tab.is-sealed').length);
      check(sealedTabs === 0, `${P} 18: no page tab is sealed (${sealedTabs})`);
      await shot('codex-IV');
      await page.click('.pocket[data-relic="lamplighters-lantern"]');
      await page.waitForSelector('.ov .card', { timeout: 5000 });
      check(true, `${P} 18: an unsighted Page IV pocket opens its silhouette card`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.ov', { state: 'detached', timeout: 3000 });
      // M7: Page V, the Hearth Below: its nine from the data (it lists its numbers), No. 000 first and labelled
      // "No. 000/074", every one needed, its reward, and until the fifth council what opens its road
      const V = PAGES.find(p => p.id === 'below'), nV = Object.values(RELICS).filter(r => V.nos.includes(r.codex)).length;
      await page.click('.cx-tab[data-page="below"]');
      await page.waitForTimeout(200);
      c = await cx();
      const pv = await W(() => ({ first: document.querySelector('.pocket')?.dataset.relic || '', no: document.querySelector('.pocket .no')?.textContent || '', road: document.querySelector('.cx-road')?.textContent || '' }));
      check(!c.sealed && nV === 9 && c.pockets === nV && new RegExp(`0 of ${nV} claimed`).test(c.prog) && c.reward.includes(V.reward.name) && /Hearth Below/.test(c.name),
        `${P} 18: Page V is open: ${nV} pockets, "${c.prog}", ${c.reward.replace(/\s+/g, ' ').slice(0, 48)}…`);
      check(pv.first === 'fenwicks-poker' && pv.no === 'No. 000/074', `${P} 18: Page V starts with No. 000 (${pv.first}, "${pv.no}")`);
      check(/vault/.test(pv.road) && /fifth/.test(pv.road), `${P} 18: before the fifth council Page V says what opens its road ("${pv.road}")`);
      await shot('codex-V');
      await noScroll('18 codex page V');
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
      // M6: every region's maps exist now, so the padlocks still to come are those of the regions whose roads are
      // still shut in this game (the Gloomfen's: the fen stair opens with the third council). M7: Act III's region
      // has no padlock (it has no place of its own on the painting; its marker stands on the Keep once its stair opens)
      const gNow = await W(() => window.__app.game);
      const stillSealed = Object.keys(REGIONS).filter(r => REGIONS[r].act < 3 && !regionOpen(gNow, r)).map(r => `sealed:${r}`);
      check(stillSealed.includes('sealed:gloomfen') && !gNow.progress.flags.story['council-3-done'], `${P} 21: after the second council the Gloomfen's road is still shut (${stillSealed.join(', ')})`);
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
      check(worn.some(t => /Anvil Heart/.test(t) && /Worn by /.test(t)) && worn.some(t => /Worldforge Hammer/.test(t) && /Held by/.test(t)), `${P} 24: the hammer is held and the heart worn (${worn.join(' | ')})`);
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
    // a painted map (M5 spec A11) draws its chunks at twice the canvas density: the same gate, walking the Old
    // Bridge's road north and south across the view
    try {
      const OB = MAPS['old-bridge'], from = OB.anchors['from-keep'];
      await setup({ patch: combine(noIntro, council2, levelUp.replace(/LVL/g, '16')) });
      await teleport(OB.id, from[0], from[1], 'n');
      await closeOverlays();
      await page.waitForFunction(() => window.__world.state().painted, null, { timeout: 8000 });
      await W(() => window.__world.grace(100000));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(400);
      await W(() => { window.__world.resetPerf(); window.__drawSamples = []; window.__sampling = true; });
      const work = [], draws = [];
      let frames = 0, nearest = from[1], legs = 0;
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        await hold(legs % 6 < 3 ? 'n' : 's', 1150);
        legs++;
        if (await page.$('.ov')) await closeOverlays();
        const p = await W(() => (window.__world ? window.__world.perf() : null));
        if (p) { work.push(...p.work.filter(v => v > 0)); draws.push(...p.draws); frames += p.frames; await W(() => window.__world.resetPerf()); }
        const s = await state();
        if (s) nearest = Math.min(nearest, s.y);
      }
      await W(() => { window.__sampling = false; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const samples = await W(() => window.__drawSamples);
      const pct = (arr, q) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * q))]; };
      const p95 = pct(work, 0.95), p50 = pct(work, 0.5), dMax = Math.max(0, ...draws, ...samples);
      const line = `${P} 26: the Old Bridge (painted), 4x throttle, ${frames} frames in 10 s, walked up to y=${nearest}: frame JS p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms; drawImage per frame p95 ${pct(draws, 0.95)}, max ${dMax}`;
      check(frames >= 100 && nearest <= from[1] - 8, `${P} 26: the walk crossed the Old Bridge (${frames} frames measured, up to y=${nearest})`);
      perfLines.push(line);
      console.log('  PERF', line);
      check(p95 <= 16, `${P} 26: painted map p95 frame time ${p95.toFixed(2)} ms <= 16 ms`);
      check(dMax <= 40, `${P} 26: painted map drawImage per frame ${dMax} <= 40`);
    } catch (e) { check(false, `${P} 26 (painted): ${e.message.split('\n')[0]}`); }
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
      // (M7: Act II's regions still ahead; the Hearth Below is Act III's, and the fourth council's card names it)
      const next = Object.values(REGIONS).filter(r => r.act === 2 && !['sunscorch', 'ironspire'].includes(r.id)).map(r => r.name);
      // M6: the council itself opens the fen stair below Mossfall, so the card says the Gloomfen's road stands open
      // (its chip lit) instead of naming it for the next chapter
      const stair = MAPS.mossfall.exits.find(x => x.id === 'mf-fen-stair');
      check(/The Ironspire is yours/i.test(card) && /To be continued/i.test(card) && next.every(n => card.includes(n)) && /fen stair below Mossfall stands open/.test(card) && !/opens in the next chapter/.test(card), `${P} 27: the third council ends on "The Ironspire is yours", with ${next.join(', ')}'s road open ("${card.slice(0, 200)}…")`);
      check(stair?.gate?.flag === 'council-3-done', `${P} 27: the fen stair's gate is the council's flag (${JSON.stringify(stair?.gate)})`);
      const chips = await W(() => [...document.querySelectorAll('.ov-story .tbc-rg')].map(e => `${e.textContent}:${e.classList.contains('is-open')}`));
      check(chips.some(c => c.startsWith(REGIONS.gloomfen.name) && c.endsWith(':true')), `${P} 27: the Gloomfen's chip is lit, open (${chips.join(', ')})`);
      check(card.includes(`6/${BRAND_TOTAL}`), `${P} 27: the card counts six Brands of ${BRAND_TOTAL}`);
      const bw = card.indexOf('The Blackwater still holds the causeway.');
      check(bw >= 0 && bw < card.indexOf('The fen stair below Mossfall stands open'), `${P} 27: "The Blackwater still holds the causeway." comes just before the fen stair's line`);
      const fit = await W(() => { const c = document.querySelector('.ov-story .story-card'); const r = c.getBoundingClientRect(); const go = document.querySelector('.ov-story .story-go').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, goH: Math.round(go.height), goW: Math.round(go.width) }; });
      check(fit.left >= 0 && fit.right <= fit.w && fit.goH >= 44, `${P} 27: the card fits the screen, its button 44 px (${JSON.stringify(fit)})`);
      await noScroll('27 ironspire card');
      await shot('ironspire-card');
      await page.click('.ov-story .story-go');
      await page.waitForTimeout(300);
      check(await W(() => !!window.__world.game().progress.flags.story['council-3-done']), `${P} 27: the third council is done (council-3-done)`);
    } catch (e) { check(false, `${P} 27: ${e.message.split('\n')[0]}`); }
  }

  // ================= M6 (P7): the Gloomfen Marsh ======================================================
  // the third council sat (the fen stair open), with every earlier chapter's flags and the six Brands before it (their
  // letters read), at the Waking the Gloomfen is met at
  const BRANDS6 = ['brand-of-briars', 'brand-of-the-heartroot', 'brand-of-glass', 'brand-of-ash', 'brand-of-iron', 'brand-of-frost'];
  const council3 = `(g) => { Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true, 'council-2-done': true, 'ironspire-complete': true, 'council-3-done': true }); g.progress.brands = ${JSON.stringify(BRANDS6)}; for (const b of g.progress.brands) g.progress.flags.story['letter:' + b] = true; g.progress.waking = 6; return g; }`;
  // a Brand held (its letter read), and a relic owned (claimed in the Codex)
  const brand = id => `(g) => { if (!g.progress.brands.includes('${id}')) g.progress.brands.push('${id}'); g.progress.flags.story['letter:${id}'] = true; return g; }`;
  const give = (relic, from = 'the e2e') => `(g, T) => { g.inventory.push(T.relicItem('${relic}', '${from}')); g.codex['${relic}'] = { sighted: true, claimed: true, awakened: false }; return g; }`;
  const gloomFires = Object.keys(HEARTHS).filter(id => MAPS[HEARTHS[id].map]?.region === 'gloomfen');
  // the first entity on a Gloomfen map that pred picks: { map, e }
  const gloomEntity = pred => {
    for (const m of Object.values(MAPS)) { if (m.region !== 'gloomfen') continue; const e = m.entities.find(pred); if (e) return { map: m.id, e }; }
    return null;
  };
  // a free tile beside an area (an exit, a soft lock), outside it, next to a walkable tile of it, and the way to face
  // into it: { x, y, face, into: [x, y] }. Terrain and fixed things are walls; gates stand open, fights are where
  // they stand, soft locks are ground.
  const besideArea = (mapId, [x0, y0, x1, y1]) => {
    const map = MAPS[mapId];
    const fixed = new Set();
    for (const q of map.entities) {
      if (['trigger', 'light', 'encounter', 'gate'].includes(q.kind) || (q.kind === 'prop' && !q.solid) || (q.kind === 'lock' && LOCKS[q.lock]?.soft)) continue;
      const [a, b, c, d] = q.area || [q.at[0], q.at[1], q.at[0], q.at[1]];
      for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) fixed.add(`${x},${y}`);
    }
    const free = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !tileOf(map.rows[y][x]).solid && !fixed.has(`${x},${y}`);
    const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!free(x, y)) continue;
        for (const [dx, dy, face] of [[0, -1, 's'], [0, 1, 'n'], [-1, 0, 'e'], [1, 0, 'w']]) {
          const nx = x + dx, ny = y + dy;
          if (!inside(nx, ny) && free(nx, ny)) return { x: nx, y: ny, face, into: [x, y] };
        }
      }
    }
    return null;
  };
  const areaOfE = e => e.area || [e.at[0], e.at[1], e.at[0], e.at[1]];
  const BACK = { n: 's', s: 'n', e: 'w', w: 'e' };
  // walk through an exit from beside it; resolves once the next map has faded in (or after a sealed message)
  const throughExit = async (mapId, exitId) => {
    const X = MAPS[mapId].exits.find(x => x.id === exitId);
    const at = X && besideArea(mapId, X.area);
    if (!at) throw new Error(`no tile beside ${exitId} on ${mapId}`);
    await teleport(mapId, at.x, at.y, at.face);
    await closeOverlays();
    await W(() => window.__world.roam([]));
    await W(d => window.__world.press(d), at.face);
    return { X, at };
  };
  const arrived = to => page.waitForFunction(m => window.__world && window.__world.state().map === m && !window.__world.state().transition, to, { timeout: 8000 });
  // play a dialogue's lines until its choices show (or it ends)
  const toChoices = async () => { for (let i = 0; i < 30 && (await page.$('.ov-dialogue')) && !(await page.$('.dlg-choice')); i++) { await page.click('.dlg-next').catch(() => {}); await page.waitForTimeout(140); } };

  // ================= 28. Mossfall's fen stair, the Gloomfen card, the fen track; the Gloomfen on the Atlas =========
  if (want(28)) {
    console.log(' -- 28 the fen stair');
    try {
      const X = MAPS.mossfall.exits.find(x => x.id === 'mf-fen-stair');
      await setup({ patch: combine(noIntro, council2) });
      const { at } = await throughExit('mossfall', 'mf-fen-stair');
      await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
      await page.waitForTimeout(700);
      const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
      check(msg.includes(X.sealed.text.slice(0, 24)) && msg.includes(X.sealed.hint.slice(0, 24)), `${P} 28: before the third council the fen stair is sealed and says what opens it ("${msg.slice(0, 130)}…")`);
      await shot('fen-stair-sealed');
      await playDialogue();
      check((await state()).map === 'mossfall', `${P} 28: the party stays in Mossfall`);
      // the Atlas keeps the Gloomfen's padlock (its maps exist; its road does not open yet), and says what opens it
      await W(() => window.__app.go('atlas', { mode: 'view', from: 'world', view: 'realm' }));
      await page.waitForSelector('.atlas-mk');
      await page.waitForTimeout(300);
      const a0 = await W(() => ({ views: [...document.querySelectorAll('.atlas-view')].map(b => b.dataset.view), lock: !!document.querySelector('.atlas-mk[data-key="sealed:gloomfen"]') }));
      check(!a0.views.includes('gloomfen') && a0.lock, `${P} 28: the Atlas keeps the Gloomfen sealed (views ${a0.views.join(', ')}; padlock ${a0.lock})`);
      if (a0.lock) {
        await page.click('.atlas-mk[data-key="sealed:gloomfen"]');
        await page.waitForTimeout(150);
        const note = (await page.innerText('.atlas-info')).replace(/\s+/g, ' ');
        check(/fen stair/i.test(note) && /third/.test(note), `${P} 28: the Gloomfen's padlock says what opens its road ("${note.slice(0, 160)}")`);
      }
      await toWorld();
      // the third council sat: the stair opens onto the Murkway, and the Gloomfen card shows the player's painting
      await regame(council3);
      await teleport('mossfall', at.x, at.y, at.face);
      await W(() => window.__world.roam([]));
      await W(d => window.__world.press(d), at.face);
      await page.waitForSelector('.ov-story.region', { timeout: 8000 });
      await page.waitForFunction(() => { const i = document.querySelector('.ov-story.region .region-still'); return !i || (i.complete && i.naturalWidth > 0); }, null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
      const rc = await W(() => {
        const o = document.querySelector('.ov-story.region'), img = o.querySelector('.region-still');
        const c = o.querySelector('.story-card').getBoundingClientRect(), go = o.querySelector('.story-go').getBoundingClientRect(), v = o.querySelector('.region-view').getBoundingClientRect();
        return { text: o.textContent.replace(/\s+/g, ' '), img: img ? img.naturalWidth : 0, drawn: !!o.querySelector('.region-drawn'), goH: Math.round(go.height), left: Math.round(c.left), right: Math.round(c.right), vw: Math.round(v.width), vh: Math.round(v.height), w: innerWidth, map: window.__world.state().map };
      });
      check(/Act II/.test(rc.text) && rc.text.includes(REGIONS.gloomfen.name) && rc.text.indexOf('Act II') < rc.text.indexOf(REGIONS.gloomfen.name), `${P} 28: the Gloomfen card reads "Act II · ${REGIONS.gloomfen.name}" over the painting ("${rc.text.slice(0, 90)}…")`);
      check(rc.img > 0 && !rc.drawn && Math.abs(rc.vw / rc.vh - 1.5) < 0.03, `${P} 28: the card shows the player's regional painting (${rc.img} px wide, framed ${rc.vw}x${rc.vh})`);
      check(rc.left >= 0 && rc.right <= rc.w && rc.goH >= 44, `${P} 28: the card fits the screen, its button 44 px (${JSON.stringify({ left: rc.left, right: rc.right, goH: rc.goH })})`);
      check(rc.map === X.to, `${P} 28: the card plays on the way into ${MAPS[X.to].name} (${rc.map})`);
      await noScroll('28 gloomfen card');
      await shot('gloomfen-card');
      await page.click('.ov-story .story-go');
      await page.waitForTimeout(300);
      await closeOverlays();
      const s1 = await state();
      const an = MAPS[X.to].anchors[X.anchor];
      check(s1.map === X.to && Math.abs(s1.x - an[0]) + Math.abs(s1.y - an[1]) <= 1, `${P} 28: after the third council the fen stair opens onto ${MAPS[X.to].name} (${s1.map} ${s1.x},${s1.y})`);
      const track = await W(() => window.__app.audio.track);
      check(track === 'fen' && MAPS[X.to].music === 'fen', `${P} 28: ${MAPS[X.to].name} plays the fen track (${track})`);
      check(await W(() => !!window.__world.game().progress.flags.seen?.['card:gloomfen']), `${P} 28: the card is kept once a save (seen card:gloomfen)`);
      await shot('murkway');
      // once a save: back up the stair and down again, and no card
      const up = MAPS[X.to].exits.find(x => x.to === 'mossfall');
      if (up) {
        await throughExit(X.to, up.id);
        await arrived('mossfall');
        await closeOverlays();
        await throughExit('mossfall', 'mf-fen-stair');
        await arrived(X.to);
        await page.waitForTimeout(700);
        check(!(await page.$('.ov-story.region')), `${P} 28: going down the stair again shows no card`);
        await closeOverlays();
      } else block(`${P} 28: no way back up to Mossfall from ${MAPS[X.to].name} yet (P2)`);
      // the Atlas: the Gloomfen's padlock is off, and its view has every Gloomfen Hearthfire
      await W(() => window.__app.go('atlas', { mode: 'view', from: 'world' }));
      await page.waitForSelector('.atlas-mk');
      const views = await page.$$eval('.atlas-view', bs => bs.map(b => b.dataset.view));
      check(views.includes('gloomfen'), `${P} 28: the Atlas has a Gloomfen view once the fen stair is open (${views.join(', ')})`);
      if (views.includes('gloomfen')) {
        await page.click('.atlas-view[data-view="gloomfen"]');
        await page.waitForTimeout(400);
        const mk = await W(() => ({
          fires: document.querySelectorAll('.atlas-mk.mk-hearth').length, sealed: [...document.querySelectorAll('.atlas-mk.mk-sealed')].map(e => e.dataset.key),
          small: [...document.querySelectorAll('.atlas-mk')].filter(e => e.getBoundingClientRect().width < 44).length, view: document.querySelector('.atlas-frame').dataset.view,
          labels: [...document.querySelectorAll('.atlas-frame.labels .mk-lbl:not(.crowded)')].map(e => e.textContent), title: document.querySelector('.topbar h1')?.textContent || '',
          here: !!document.querySelector('.atlas-mk.mk-here'),
        }));
        check(mk.view === 'gloomfen' && mk.title === REGIONS.gloomfen.name && mk.fires === gloomFires.length && mk.small === 0 && mk.here, `${P} 28: the Gloomfen view shows its ${gloomFires.length} Hearthfires and where you are, all 44 px (${JSON.stringify({ view: mk.view, title: mk.title, fires: mk.fires, small: mk.small, here: mk.here })})`);
        check(!mk.sealed.length, `${P} 28: no padlock is left (${mk.sealed.join(', ') || 'none'})`);
        if (!phone) {
          const places = Object.values(LORE).filter(p => p.region === 'gloomfen' && p.map).map(p => p.name);
          check(mk.labels.some(l => places.some(n => l.startsWith(n))), `${P} 28: the laptop's markers name the Gloomfen's places (${mk.labels.join(' · ')})`);
        }
        const bar = await W(() => { const b = document.querySelector('.atlas-views'); const r = b.getBoundingClientRect(); return { right: Math.round(r.right), w: innerWidth, min: Math.round(Math.min(...[...b.children].map(c => c.getBoundingClientRect().height))), clipped: [...b.children].filter(c => c.scrollWidth > c.clientWidth + 1).length }; });
        check(bar.right <= bar.w && bar.min >= 44 && !bar.clipped, `${P} 28: the ${views.length} view buttons fit the screen, 44 px tall (${JSON.stringify(bar)})`);
        await shot('atlas-gloomfen');
        await noScroll('28 atlas');
      }
      await toWorld();
    } catch (e) { check(false, `${P} 28: ${e.message.split('\n')[0]}`); }
  }

  // ================= 29. a bog step burns without a key; the Bogstriders cross it =========================
  if (want(29)) {
    console.log(' -- 29 a bog step');
    try {
      const B = gloomEntity(e => e.kind === 'lock' && e.lock === 'bog');
      if (!B) block(`${P} 29: no bog on a Gloomfen map yet (P2)`);
      else {
        const spot = besideArea(B.map, areaOfE(B.e));
        if (!spot) throw new Error(`no way into the bog ${B.e.id} on ${B.map}`);
        await setup({ patch: combine(noIntro, council3, roadsWon(B.map)) });
        await teleport(B.map, spot.x, spot.y, spot.face);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        const hp = () => W(() => { const g = window.__world.game(); return g.party.active.map(id => g.party.roster[id].hp); });
        const h0 = await hp();
        await W(d => window.__world.press(d), spot.face);
        await page.waitForTimeout(500);
        const s1 = await state(), h1 = await hp();
        check(s1.x === spot.into[0] && s1.y === spot.into[1], `${P} 29: the party steps into the bog on ${MAPS[B.map].name} (${s1.x},${s1.y})`);
        check(h1.every((v, i) => v < h0[i] || h0[i] <= 1), `${P} 29: without a key the bog costs everyone HP (${h0.join('/')} -> ${h1.join('/')})`);
        check(/bog/i.test(s1.prompt) && new RegExp(`${Math.round(LOCKS.bog.soft.hpPct * 100)}%`).test(s1.prompt), `${P} 29: the prompt says what it cost ("${s1.prompt}")`);
        await shot('bog-burn');
        // with the Bogstriders (the bog's key: Bogstride) a step in it costs nothing
        await regame(give('bogstriders', 'Tamsin'));
        await W(() => window.__world.roam([]));
        await W(d => window.__world.press(d), BACK[spot.face]);
        await page.waitForTimeout(400);
        const h2 = await hp();
        await W(d => window.__world.press(d), spot.face);
        await page.waitForTimeout(400);
        const s3 = await state(), h3 = await hp();
        check(s3.x === spot.into[0] && s3.y === spot.into[1] && h3.every((v, i) => v === h2[i]), `${P} 29: with the Bogstriders the bog costs nothing (${h2.join('/')} -> ${h3.join('/')})`);
      }
    } catch (e) { check(false, `${P} 29: ${e.message.split('\n')[0]}`); }
  }

  // ================= 30. Willowmurk: the Willow Hearth, Elder Moss =========================================
  if (want(30)) {
    console.log(' -- 30 Willowmurk');
    try {
      await setup({ patch: combine(noIntro, council3) });
      const hf = await W(() => window.__worldTools.hearth('willow-hearth'));
      await teleport(hf.map, hf.x, hf.y, hf.face);
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await pressA();
      await page.waitForSelector('.ov-hearth', { timeout: 3000 });
      check((await page.innerText('.ov-hearth')).includes(HEARTHS['willow-hearth'].name), `${P} 30: ${HEARTHS['willow-hearth'].name}'s menu opens`);
      await shot('willow-hearth');
      await page.click('.ov-hearth [data-primary]');
      await page.waitForTimeout(500);
      await closeOverlays();
      const k = await W(() => { const g = window.__world.game(); return { kindled: !!g.progress.flags.kindled['willow-hearth'], last: g.progress.lastHearthfire }; });
      check(k.kindled && k.last === 'willow-hearth', `${P} 30: resting kindles the Willow Hearth (${JSON.stringify(k)})`);
      const moss = MAPS.willowmurk.entities.find(e => e.kind === 'npc' && e.npc === 'moss');
      if (!moss) block(`${P} 30: Elder Moss is not in Willowmurk yet (P2)`);
      else {
        let who = '';
        for (let i = 0; i < 3 && !/Moss/i.test(who); i++) {
          await page.waitForTimeout(300);
          await closeOverlays();
          await standBy('willowmurk', moss.id, ['s', 'w', 'e', 'n']);
          await W(() => window.__world.roam([]));
          await pressA();
          await page.waitForSelector('.ov-dialogue .dlg-name', { timeout: 3000 });
          await page.waitForTimeout(150);
          who = await page.innerText('.ov-dialogue .dlg-name');
          if (!/Moss/i.test(who)) await playDialogue();
        }
        check(/Moss/i.test(who), `${P} 30: A talks to Elder Moss (${who})`);
        await shot('elder-moss');
        await playDialogue();
        check(await W(() => !!window.__world.game().progress.flags.story['met-moss']), `${P} 30: meeting Elder Moss is marked (met-moss)`);
      }
      // the Journal: the Gloomfen's main quest and the leads it has given; Mayor Gretch's Bogmire board (not read yet)
      await W(() => window.__app.go('journal', { tab: 'quests', from: 'world' }));
      await page.waitForSelector('.jr-quest', { timeout: 3000 });
      const quests = await W(() => [...document.querySelectorAll('.jr-quest')].map(q => q.dataset.id));
      const leads = ['gloomfen-waking', ...(moss ? ['failing-wards'] : [])];
      check(leads.every(id => quests.includes(id)), `${P} 30: the Journal has ${leads.join(' and ')} (${quests.join(', ')})`);
      await shot('journal-gloomfen');
      await W(() => window.__app.go('journal', { tab: 'bounties', from: 'world' }));
      await page.waitForSelector('.jr-board', { timeout: 3000 });
      const mine = Object.values(BOUNTIES).filter(b => b.giver === 'gretch');
      const board = await W(() => { const b = document.querySelector('.jr-board[data-giver="gretch"]'); return b ? { lede: b.querySelector('.jr-lede').textContent, rows: [...b.querySelectorAll('.jr-bounty')].map(r => r.dataset.id), text: b.innerText, first: document.querySelector('.jr-board').dataset.giver } : null; });
      check(board && mine.length === 4 && board.rows.length === mine.length && mine.every(b => board.rows.includes(b.id) && board.text.includes(b.name)) && /Bogmire/.test(board.lede), `${P} 30: the Bogmire board lists Mayor Gretch's ${mine.length} bounties by name (${board ? board.rows.join(', ') : 'none'})`);
      check(board?.first === 'gretch', `${P} 30: in the Gloomfen, the Bogmire board comes first (${board?.first})`);
      await shot('bogmire-board');
      await noScroll('30 bounties');
      await toWorld();
    } catch (e) { check(false, `${P} 30: ${e.message.split('\n')[0]}`); }
  }

  // ================= 31. Hodge's bar: the price of the day, paid; a party that cannot pay; the game ==============
  if (want(31)) {
    console.log(' -- 31 Hodge\'s toll-bar');
    try {
      const RB = MAPS.rotbridge;
      const bar = RB.entities.find(e => e.id === 'rb-toll-bar');
      const hodge = RB.entities.find(e => e.kind === 'npc' && e.npc === 'hodge');
      if (!bar || !hodge || !(RB.roads || []).some(r => r.gates.includes('rb-toll-bar'))) block(`${P} 31: Rotbridge's toll-bar and Hodge are not placed yet (P2)`);
      else {
        const rich = `(g) => { g.gold = 2000; g.materials = { ...g.materials, silver: 9 }; g.bag = { ...g.bag, 'hearth-tonic': 9 }; return g; }`;
        const talkHodge = async () => {
          await standBy('rotbridge', hodge.id, ['s', 'w', 'e', 'n']);
          await W(() => window.__world.roam([]));
          await pressA();
          await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
          await toChoices();
        };
        const choice = sel => W(s => { const b = [...document.querySelectorAll('.dlg-choice')].find(x => x.querySelector(s)); return b ? { text: b.innerText.replace(/\s+/g, ' '), chip: b.querySelector(s).textContent, disabled: b.disabled, aria: b.getAttribute('aria-label') || '', pick: b.dataset.pick } : null; }, sel);
        await setup({ patch: combine(noIntro, council3, rich) });
        const ap = approachOf('rotbridge', 'rb-toll-bar');
        if (!ap) throw new Error('no way up to the toll-bar from the road');
        await teleport('rotbridge', ap.x, ap.y, ap.face);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        const e0 = await W(() => window.__world.entity('rotbridge', 'rb-toll-bar'));
        check(e0 && e0.state === 'closed' && e0.solid, `${P} 31: Hodge's bar is down across the road (${JSON.stringify(e0)})`);
        await shot('toll-bar-shut');
        // today's price is on its choice, and a party with the means can pay it
        await talkHodge();
        const pay = await choice('.dlg-price');
        check(pay && pay.chip && !pay.disabled, `${P} 31: Hodge's toll shows today's price on its choice ("${pay?.text}")`);
        await shot('hodge-price');
        const purse = () => W(() => { const g = window.__world.game(); return { gold: g.gold, silver: g.materials.silver || 0, tonic: g.bag['hearth-tonic'] || 0, paid: !!g.progress.flags.story['toll-paid'] }; });
        const g0 = await purse();
        if (pay) await page.click(`.dlg-choice[data-pick="${pay.pick}"]`);
        await page.waitForTimeout(150);
        await playDialogue();
        await page.waitForTimeout(150);
        const t = await toastNow();
        const g1 = await purse();
        check(g1.paid && (g1.gold < g0.gold || g1.silver < g0.silver || g1.tonic < g0.tonic), `${P} 31: the price is paid (${JSON.stringify(g0)} -> ${JSON.stringify(g1)})`);
        check(/^Paid /.test(t) && t.includes(pay?.chip || '?'), `${P} 31: paying toasts what it cost ("${t}")`);
        const e1 = await W(() => window.__world.entity('rotbridge', 'rb-toll-bar'));
        check(e1 && e1.state === 'open' && !e1.solid, `${P} 31: the bar lifts (${JSON.stringify(e1)})`);
        await teleport('rotbridge', ap.x, ap.y, ap.face);
        await W(() => window.__world.roam([]));
        const s0 = await state();
        await W(d => window.__world.step(d, 2), ap.face);
        const s1 = await state();
        check(Math.abs(s1.x - s0.x) + Math.abs(s1.y - s0.y) === 2, `${P} 31: the party walks under the lifted bar (${s0.x},${s0.y} -> ${s1.x},${s1.y})`);
        await shot('toll-bar-open');
        // a party with nothing: the price's choice is there, shut, and says why
        await setup({ patch: combine(noIntro, council3, `(g) => { g.gold = 0; g.materials = { ...g.materials, silver: 0 }; g.bag = {}; return g; }`) });
        await talkHodge();
        const poor = await choice('.dlg-price');
        check(poor && poor.disabled && /cannot afford/.test(poor.aria), `${P} 31: a party that cannot pay sees the price, shut ("${poor?.aria}")`);
        await shot('hodge-poor');
        await playDialogue();
        // the game: best of three, once a day; its roll shows, and a lost game waits for tomorrow
        await setup({ patch: combine(noIntro, council3) });
        await talkHodge();
        const game = await choice('.dlg-odds:not(.dlg-price)');
        check(!!game, `${P} 31: Hodge offers his game, with its odds ("${game?.text}")`);
        if (game) {
          await page.click(`.dlg-choice[data-pick="${game.pick}"]`);
          await page.waitForSelector('.dlg-roll:not([hidden])', { timeout: 4000 });
          const roll = await page.innerText('.dlg-roll');
          check(/Won|Lost/.test(roll) && /✓|✗/.test(roll), `${P} 31: the game's three checks show ("${roll}")`);
          await shot('hodge-game');
          await playDialogue();
          await page.waitForTimeout(300);
          await closeOverlays();
          const g3 = await W(() => { const g = window.__world.game(); return { tried: !!g.progress.flags.story['hodge-tried'], toll: g.inventory.some(i => i.base === 'unfair-toll'), paid: !!g.progress.flags.story['toll-paid'] }; });
          check(g3.tried, `${P} 31: the game is marked played today (hodge-tried)`);
          if (g3.toll) check(g3.paid && (await W(() => window.__world.entity('rotbridge', 'rb-toll-bar')))?.state === 'open', `${P} 31: won: the Unfair Toll is yours and the bar lifts`);
          else {
            await talkHodge();
            check(!(await choice('.dlg-odds:not(.dlg-price)')), `${P} 31: lost: no second game today`);
            await playDialogue();
          }
        }
      }
    } catch (e) { check(false, `${P} 31: ${e.message.split('\n')[0]}`); }
  }

  // ================= 32. Tamsin's duel on Rotbridge, and her fall ===========================================
  if (want(32)) {
    console.log(' -- 32 Tamsin at Rotbridge');
    try {
      const E = ENCOUNTERS['tamsin-rotbridge'];
      const gate = MAPS.rotbridge.entities.find(e => e.kind === 'gate' && e.guard === 'tamsin-rotbridge');
      if (!gate || !MAPS.rotbridge.entities.some(e => e.kind === 'encounter' && e.enc === 'tamsin-rotbridge')) block(`${P} 32: Tamsin's gate on Rotbridge is not placed yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council3, `(g) => { g.progress.flags.story['toll-paid'] = true; return g; }`) });
        // the Ladder's rumour of the man on the barge shows only once she has fallen (an entry with an `if`)
        const barge = LADDER.find(l => l.id === 'man-on-the-barge');
        const posterOf = async id => {
          await W(() => window.__app.go('journal', { tab: 'ladder', from: 'world' }));
          await page.waitForSelector('.poster', { timeout: 4000 });
          return W(pid => { const n = document.querySelector(`.poster[data-id="${pid}"]`); return n ? { state: n.dataset.state, text: n.innerText.replace(/\s+/g, ' ') } : null; }, id);
        };
        if (!barge) block(`${P} 32: the man on the barge is not on the Ladder yet (P3)`);
        else {
          const before = await posterOf(barge.id);
          check(!before, `${P} 32: before her fall the Ladder has no poster for ${barge.name} (${before ? before.text : 'none'})`);
          await toWorld();
        }
        const ap = approachOf('rotbridge', gate.id, { pastGates: true });
        if (!ap) throw new Error('no way up to Tamsin from the road');
        await teleport('rotbridge', ap.x, ap.y, ap.face);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await W(d => window.__world.face(d), ap.face);
        await pressA();
        // her words first (the encounter's talk), then the duel's card
        for (let i = 0; i < 12 && !(await page.$('.ov-prefight')); i++) {
          if (await page.$('.dlg-choice')) {
            const pick = await W(() => { const b = [...document.querySelectorAll('.dlg-choice')].find(x => !/not yet|leave|walk away/i.test(x.innerText)); return b ? b.dataset.pick : null; });
            if (pick) await page.click(`.dlg-choice[data-pick="${pick}"]`); else break;
          } else await page.click('.dlg-next').catch(() => {});
          await page.waitForTimeout(200);
        }
        await page.waitForSelector('.ov-prefight', { timeout: 3000 });
        await page.waitForTimeout(250);
        const pf = (await page.innerText('.ov-prefight')).replace(/\s+/g, ' ');
        const boots = RELICS[E.spawns[0]?.wears || 'bogstriders']?.name || 'Bogstriders';
        check(pf.includes(E.name) && /Losing is a yield/.test(pf), `${P} 32: Tamsin's duel card says losing is a yield ("${pf.slice(0, 120)}…")`);
        check(pf.includes(boots.replace(/^The /, '')) && /Worn/.test(pf), `${P} 32: the card shows the ${boots} she wears`);
        await shot('tamsin-duel-card');
        await noScroll('32 duel card');
        await W(() => { window.__forceResult = { result: 'victory', xp: 60, gold: 40, claimed: [window.__worldTools.relicItem('bogstriders', 'Tamsin')] }; });
        await page.click('.pf-fight');
        await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath', null, { timeout: 8000 });
        for (let i = 0; i < 10 && (await screen()) === 'aftermath'; i++) {
          // a chest's reveal plays first; its Continue arrives with the card (an opened chest is left shut)
          if (await page.$('.ov-reveal')) { await page.waitForSelector('.ov-reveal .cont', { timeout: 8000 }); await page.click('.ov-reveal .cont'); }
          else if (await page.$('.af-loot .chest:not(.opened)')) await page.click('.af-loot .chest:not(.opened)');
          else if (await page.$('.af-foot .btn.primary')) await page.click('.af-foot .btn.primary');
          await page.waitForTimeout(400);
        }
        const after = await screen();
        if (after !== 'world') throw new Error(`the duel's aftermath did not lead back to the world (on ${after}: ${(await page.innerText('#app')).replace(/\s+/g, ' ').slice(0, 160)})`);
        // the lines after the duel lead into her fall: the barge, the Unsmith, the trade
        const said = [];
        for (let i = 0; i < 60; i++) {
          if (await page.$('.ov-dialogue')) {
            const t = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
            if (!said.includes(t)) said.push(t);
            if (said.length === 1) await shot('tamsin-fall');
            if (await page.$('.dlg-choice')) await page.click('.dlg-choice').catch(() => {}); else await page.click('.dlg-next').catch(() => {});
          } else if (await page.$('.ov')) await closeOverlays();
          else if (i > 8) break;
          await page.waitForTimeout(200);
        }
        const st = await W(() => window.__world.game().progress.flags.story);
        check(said.length > 0 && !!st['tamsin-fallen'], `${P} 32: after the duel her fall plays (${said.length} lines; tamsin-fallen ${!!st['tamsin-fallen']})`);
        // she goes with the barge: her place on the bridge is empty, won or yielded (the encounter's `leaves`)
        const tEnt = MAPS.rotbridge.entities.find(e => e.kind === 'encounter' && e.enc === 'tamsin-rotbridge');
        const left = await W(id => window.__world.entity('rotbridge', id), tEnt.id);
        check(!left, `${P} 32: after her fall Tamsin is gone from the bridge (${left ? left.state : 'gone'})`);
        if (barge) {
          const rumour = await posterOf(barge.id);
          check(rumour && rumour.state === 'silhouette' && rumour.text.includes(barge.name) && /rumour/i.test(rumour.text), `${P} 32: her fall puts a rumour on the Ladder: ${barge.name} (${rumour ? `${rumour.state}: "${rumour.text}"` : 'none'})`);
          await W(pid => document.querySelector(`.poster[data-id="${pid}"]`)?.scrollIntoView({ block: 'center' }), barge.id);
          await page.waitForTimeout(300);
          await shot('ladder-barge');
          await noScroll('32 ladder');
          await toWorld();
        }
        if (!ENCOUNTERS['tamsin-rotbridge'].leaves) block(`${P} 32: Tamsin's encounter has no \`leaves\` yet (P4): after a yield she would stay on the bridge`);
        else {
          await setup({ patch: combine(noIntro, council3, `(g) => { Object.assign(g.progress.flags.story, { 'toll-paid': true, 'tamsin-yielded-4': true, 'tamsin-fallen': true }); return g; }`) });
          await teleport('rotbridge', ap.x, ap.y, ap.face);
          await closeOverlays();
          const yielded = await W(id => window.__world.entity('rotbridge', id), tEnt.id);
          check(!yielded, `${P} 32: after a yield and her fall she is gone from the bridge too (${yielded ? yielded.state : 'gone'})`);
        }
      }
    } catch (e) { check(false, `${P} 32: ${e.message.split('\n')[0]}`); }
  }

  // ================= 33. the Lanternfen's fog: the sight closes in; a key thins it ==========================
  if (want(33)) {
    console.log(' -- 33 the Lanternfen\'s fog');
    try {
      const LF = MAPS.lanternfen;
      // a Stillwater party carries none of the fog's keys, and nobody has Attunement 7
      await setup({ starter: 'stillwater-lance', patch: combine(noIntro, council3, roadsWon('lanternfen')) });
      const at = LF.anchors['from-bogmire'] || Object.values(LF.anchors)[0];
      await teleport(LF.id, at[0], at[1], at[2] || 's');
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const f0 = await state();
      check(LF.fog === true && f0.fog === 'thick' && f0.sight === TUNING.world.fogRadius && !f0.dark, `${P} 33: the Lanternfen's fog closes the sight in to ${TUNING.world.fogRadius} tiles without a key (fog ${f0.fog}, sight ${f0.sight}, dark ${f0.dark})`);
      await shot('lanternfen-fog');
      // the Lamplighter's Lantern (Mother's Light) is one of the fog's keys: the mist thins to a haze
      const key = RELICS['lamplighters-lantern']?.mapPower?.id;
      if (!LOCKS.fog.powers.includes(key)) block(`${P} 33: the Lamplighter's Lantern does not carry a fog key yet (P4: ${key})`);
      else {
        await regame(give('lamplighters-lantern', 'the Lantern Mother'));
        await W(() => window.__world.roam([]));
        await page.waitForTimeout(300);
        const f1 = await state();
        check(f1.fog === 'thin' && f1.sight === null, `${P} 33: with the Lamplighter's Lantern the fog thins, and the sight is whole (fog ${f1.fog}, sight ${f1.sight})`);
        await shot('lanternfen-thin');
      }
      // the Keys tab says what the fog costs, and lists its keys
      await W(() => window.__app.go('journal', { tab: 'keys', from: 'world' }));
      await page.waitForSelector('.jr-lock[data-lock="fog"]', { timeout: 3000 });
      const row = (await page.innerText('.jr-lock[data-lock="fog"]')).replace(/\s+/g, ' ');
      check(/three tiles through the fog/.test(row) && LOCKS.fog.powers.length >= 2, `${P} 33: the Keys tab has the fog: its keys and its cost ("${row.slice(0, 140)}…")`);
      await noScroll('33 keys');
      await toWorld();
    } catch (e) { check(false, `${P} 33: ${e.message.split('\n')[0]}`); }
  }

  // ================= 34. the Lantern Mother's pre-fight card ================================================
  if (want(34)) {
    console.log(' -- 34 the Lantern Mother');
    try {
      const E = ENCOUNTERS['lantern-mother'];
      const where = Object.values(MAPS).find(m => m.entities.some(e => e.kind === 'encounter' && e.enc === 'lantern-mother'));
      const ent = where?.entities.find(e => e.kind === 'encounter' && e.enc === 'lantern-mother');
      if (!ent) block(`${P} 34: the Lantern Mother is not placed yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council3) });
        await standBy(where.id, ent.id, ['s', 'n', 'w', 'e']);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await pressA();
        await page.waitForSelector('.ov-prefight', { timeout: 3000 });
        await page.waitForTimeout(300);
        const pf = (await page.innerText('.ov-prefight')).replace(/\s+/g, ' ');
        check(pf.includes(E.name) && /Champion/.test(pf), `${P} 34: the Lantern Mother's pre-fight card: the Champion ("${pf.slice(0, 90)}…")`);
        const pieces = ['lamplighters-lantern', 'mourning-veil'].map(id => RELICS[id].name.replace(/^The /, ''));
        check(pieces.every(n => pf.includes(n)) && /Glinting/i.test(pf), `${P} 34: its pieces glint on the card: ${pieces.join(' and ')}`);
        check(pf.includes(BRANDS[E.brand].name.replace(/^The /, '')), `${P} 34: the card names ${BRANDS[E.brand].name}`);
        const worn = await W(() => [...document.querySelectorAll('.pf-relic')].map(b => b.innerText.replace(/\s+/g, ' ')));
        check(worn.some(t => /Mourning Veil/.test(t) && /Worn by /.test(t)) && worn.some(t => /Lantern/.test(t) && /Held by/.test(t)), `${P} 34: the lantern is held and the veil worn (${worn.join(' | ')})`);
        await shot('lantern-mother-prefight');
        await noScroll('34 prefight');
        await page.click('.ov-prefight .pf-not-yet');
        await page.waitForTimeout(200);
      }
    } catch (e) { check(false, `${P} 34: ${e.message.split('\n')[0]}`); }
  }

  // ================= 35. the long boardwalk's east end: sealed until the Brand of Lanterns ====================
  if (want(35)) {
    console.log(' -- 35 the long boardwalk');
    try {
      const X = MAPS['long-boardwalk'].exits.find(x => x.id === 'lb-e');
      if (!X?.gate) block(`${P} 35: the long boardwalk's east end has no gate yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council3, roadsWon('long-boardwalk')) });
        await throughExit('long-boardwalk', 'lb-e');
        await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
        await page.waitForTimeout(700);
        const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
        check(msg.includes(X.sealed.text.slice(0, 24)) && (!X.sealed.hint || msg.includes(X.sealed.hint.slice(0, 24))), `${P} 35: before the Brand of Lanterns the east end is sealed and says what opens it ("${msg.slice(0, 130)}…")`);
        await shot('boardwalk-sealed');
        await playDialogue();
        check((await state()).map === 'long-boardwalk', `${P} 35: the party stays on the boardwalk`);
        await regame(brand('brand-of-lanterns'));
        await throughExit('long-boardwalk', 'lb-e');
        await arrived(X.to);
        await closeOverlays();
        const s1 = await state(), an = MAPS[X.to].anchors[X.anchor];
        check(s1.map === X.to && Math.abs(s1.x - an[0]) + Math.abs(s1.y - an[1]) <= 1, `${P} 35: after the Brand the east end opens onto ${MAPS[X.to].name} (${s1.map} ${s1.x},${s1.y})`);
        await shot('misthollow');
      }
    } catch (e) { check(false, `${P} 35: ${e.message.split('\n')[0]}`); }
  }

  // ================= 36. the Drowned Belfry is dark without a light; the Deep-Pearl lights it ==================
  if (want(36)) {
    console.log(' -- 36 the Drowned Belfry');
    try {
      const D = MAPS['drowned-belfry'];
      await setup({ starter: 'stillwater-lance', patch: combine(noIntro, council3) });
      const at = Object.values(D.anchors)[0];
      await teleport(D.id, at[0], at[1], at[2] || 's');
      await closeOverlays();
      await W(() => window.__world.roam([]));
      await page.waitForTimeout(300);
      const d0 = await state();
      check(D.dark === true && d0.map === D.id && d0.dark && !d0.fog, `${P} 36: the Belfry is dark without a light key (dark ${d0.dark})`);
      await shot('belfry-dark');
      const key = RELICS['deep-pearl']?.mapPower?.id;
      if (!LOCKS.darkness.powers.includes(key)) block(`${P} 36: the Deep-Pearl does not carry a light key yet (P4: ${key})`);
      else {
        await regame(give('deep-pearl', 'the Blackwater Leviathan'));
        await W(() => window.__world.roam([]));
        await page.waitForTimeout(300);
        const d1 = await state();
        check(!d1.dark, `${P} 36: the Deep-Pearl's light lifts the dark (${d1.dark})`);
        await shot('belfry-lit');
      }
    } catch (e) { check(false, `${P} 36: ${e.message.split('\n')[0]}`); }
  }

  // ================= 37. the causeway: dry once the Blackwater falls, and walked home through the Keep ==========
  if (want(37)) {
    console.log(' -- 37 the causeway');
    try {
      const BX = MAPS.bogmire.exits.find(x => x.id === 'bm-causeway');
      const KX = MAPS.keep.exits.find(x => x.id === 'keep-sw');
      const CW = MAPS.causeway;
      const home = CW.exits.find(x => x.to === 'keep');
      if (!BX?.gate || !home) block(`${P} 37: the causeway's ways in are not laid yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council3, brand('brand-of-lanterns')) });
        await throughExit('bogmire', 'bm-causeway');
        await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
        await page.waitForTimeout(700);
        const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
        check(msg.includes(BX.sealed.text.slice(0, 24)) && (!BX.sealed.hint || msg.includes(BX.sealed.hint.slice(0, 24))), `${P} 37: before the Brand of the Deep Bogmire's causeway is under water, and says what opens it ("${msg.slice(0, 130)}…")`);
        await shot('causeway-sealed');
        await playDialogue();
        // the Blackwater falls: the causeway is dry from Bogmire, and walks home to the Keep's south-west gate
        await regame(brand('brand-of-the-deep'));
        await throughExit('bogmire', 'bm-causeway');
        await arrived(CW.id);
        await closeOverlays();
        check((await state()).map === CW.id, `${P} 37: after the Brand of the Deep the causeway opens from Bogmire`);
        const track = await W(() => window.__app.audio.track);
        check(track === CW.music, `${P} 37: the causeway plays its own track (${track})`);
        await shot('causeway');
        await throughExit(CW.id, home.id);
        await arrived('keep');
        await closeOverlays();
        const s2 = await state(), an = MAPS.keep.anchors[home.anchor];
        check(s2.map === 'keep' && an && Math.abs(s2.x - an[0]) + Math.abs(s2.y - an[1]) <= 1 && home.anchor === 'from-causeway', `${P} 37: the causeway walks home through the Keep's south-west gate (${s2.map} ${s2.x},${s2.y})`);
        await shot('keep-from-causeway');
        // and out again from the Keep's side
        await throughExit('keep', 'keep-sw');
        await arrived(KX.to);
        await closeOverlays();
        check((await state()).map === CW.id, `${P} 37: the Keep's south-west gate opens onto the causeway`);
      }
    } catch (e) { check(false, `${P} 37: ${e.message.split('\n')[0]}`); }
  }

  // ================= 38. the fourth council: its title card, its scene, the end of Act II =====================
  if (want(38)) {
    console.log(' -- 38 the fourth council');
    try {
      if (!MAPS['keep-hall'].entities.some(e => e.kind === 'trigger' && e.dialogue === 'council-4')) block(`${P} 38: the fourth council's trigger is not in the Great Hall yet (P3)`);
      else {
        // (a new game starts in the Great Hall: the Gloomfen is won out in the Keep's yard, so the council waits for
        // the party to walk in)
        await setup({ patch: combine(noIntro, council3, brand('brand-of-lanterns'), brand('brand-of-the-deep')) });
        await teleport('keep', 15, 5, 'n');
        await regame(`(g) => { g.progress.flags.story['gloomfen-complete'] = true; return g; }`);
        await W(() => window.__world.roam([]));
        await W(() => window.__world.press('n'));
        await page.waitForSelector('.ov-story.council-4', { timeout: 6000 });
        const t0 = (await page.innerText('.ov-story')).replace(/\s+/g, ' ');
        check(/Council sits a fourth time/.test(t0) && /Eight coals/.test(t0) && /every chair/.test(t0), `${P} 38: the fourth council's title card: eight coals, every chair filled ("${t0.slice(0, 140)}…")`);
        await shot('council-4');
        await page.click('.ov-story .story-go');
        await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
        await playDialogue(/Let the Council talk|Leave/);
        await page.waitForSelector('.ov-story.tbc-gloomfen', { timeout: 5000 });
        await page.waitForTimeout(300);
        const card = (await page.innerText('.ov-story')).replace(/\s+/g, ' ');
        check(/End of Act II/i.test(card) && card.includes('All eight coals are lit. The Hollow Council waits.') && /Act III/.test(card), `${P} 38: the fourth council ends Act II and names Act III ("${card.slice(0, 200)}…")`);
        check(card.includes(`${BRAND_TOTAL}/${BRAND_TOTAL}`), `${P} 38: the card counts all ${BRAND_TOTAL} Brands`);
        // M7 (spec §2.4): its line is "Act III begins." and its Act III chip opens; no road opens on the card itself
        const opens = await W(() => [...document.querySelectorAll('.ov-story .tbc-rg.is-open')].map(c => c.textContent));
        check(opens.length === 1 && /Act III/.test(opens[0]) && card.includes('Act III begins.') && !/stands open|opens in the next chapter/.test(card), `${P} 38: Act III begins, its chip open, and no road opens on the card (${opens.join(', ')})`);
        const fit = await W(() => { const c = document.querySelector('.ov-story .story-card'); const r = c.getBoundingClientRect(); const go = document.querySelector('.ov-story .story-go').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, goH: Math.round(go.height) }; });
        check(fit.left >= 0 && fit.right <= fit.w && fit.goH >= 44, `${P} 38: the card fits the screen, its button 44 px (${JSON.stringify(fit)})`);
        await noScroll('38 act II card');
        await shot('end-of-act-2');
        await page.click('.ov-story .story-go');
        await page.waitForTimeout(300);
        check(await W(() => !!window.__world.game().progress.flags.story['council-4-done']), `${P} 38: the fourth council is done (council-4-done)`);
      }
    } catch (e) { check(false, `${P} 38: ${e.message.split('\n')[0]}`); }
  }

  // ================= 39. performance on the Lanternfen (fog) and the long boardwalk ============================
  // the M5 gate (spec §8): p95 frame JS 16 ms and 40 drawImage a frame at 4x throttle, walking the map's longest open
  // east-west stretch back and forth for 10 s (its gates open, its fights won; a pack walked into is a fight that ends
  // at once, fled). M7: one map's walk, measured the same way for 39 and for 47 (the Hearth Below)
  const perfWalk = async (tag, mapId, patch, what) => {
    try {
      const M = MAPS[mapId];
      const fixed = new Set();
      for (const e of M.entities) {
        if (['trigger', 'light', 'encounter', 'gate'].includes(e.kind) || (e.kind === 'prop' && !e.solid) || (e.kind === 'lock' && LOCKS[e.lock]?.soft)) continue;
        const [x0, y0, x1, y1] = areaOfE(e);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fixed.add(`${x},${y}`);
      }
      // the walk stays on the map: an exit, and the tile before it, end a stretch
      for (const x of M.exits) {
        const [x0, y0, x1, y1] = x.area;
        for (let y = y0 - 1; y <= y1 + 1; y++) for (let xx = x0 - 1; xx <= x1 + 1; xx++) fixed.add(`${xx},${y}`);
      }
      let best = { y: 0, x0: 0, len: 0 };
      for (let y = 0; y < M.h; y++) {
        let run = 0;
        for (let x = 0; x <= M.w; x++) {
          const open = x < M.w && !tileOf(M.rows[y][x]).solid && !fixed.has(`${x},${y}`);
          if (open) { run++; continue; }
          if (run > best.len) best = { y, x0: x - run, len: run };
          run = 0;
        }
      }
      const start = [best.x0 + 1, best.y];
      await setup({ patch });
      await teleport(M.id, start[0], start[1], 'e');
      await closeOverlays();
      await W(() => window.__world.grace(100000));
      const fog = (await state()).fog;
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.waitForTimeout(400);
      await W(() => { window.__world.resetPerf(); window.__drawSamples = []; window.__sampling = true; });
      await W(() => { window.__forceResult = { result: 'fled', sticky: true }; });
      const work = [], draws = [];
      let frames = 0, battles = 0, maxRoamers = 0, farthest = 0, strayed = '';
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
        const p = await W(() => (window.__world ? window.__world.perf() : null));
        if (p) { work.push(...p.work.filter(v => v > 0)); draws.push(...p.draws); frames += p.frames; await W(() => window.__world.resetPerf()); }
        const s = await state();
        if (s) { maxRoamers = Math.max(maxRoamers, s.roamers.length); farthest = Math.max(farthest, s.x); if (s.map !== M.id) strayed = s.map; }
        if (strayed) break;
      }
      await W(() => { window.__sampling = false; window.__forceResult = null; });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const samples = await W(() => window.__drawSamples);
      const pct = (arr, q) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * q))]; };
      const p95 = pct(work, 0.95), p50 = pct(work, 0.5);
      const dMax = Math.max(0, ...draws, ...samples), dP95 = pct(draws, 0.95);
      const line = `${P} ${tag}: ${what}${fog ? ` (fog ${fog})` : ''}, 4x throttle, ${frames} frames in 10 s, ${maxRoamers} roamers, walked out to x=${farthest}: frame JS p50 ${p50.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms; drawImage per frame p95 ${dP95}, max ${dMax}${battles ? `; ${battles} fights interrupted the walk` : ''}`;
      check(frames >= 100 && farthest >= start[0] + 8 && !strayed, `${P} ${tag}: the walk crossed ${what} and stayed on it (${frames} frames measured, out to x=${farthest}${strayed ? `; strayed into ${strayed}` : ''})`);
      if (mapId === 'lanternfen') check(fog === 'thick', `${P} ${tag}: the Lanternfen was measured in its thick fog (${fog})`);
      perfLines.push(line);
      console.log('  PERF', line);
      check(p95 <= 16, `${P} ${tag}: ${what}: p95 frame time ${p95.toFixed(2)} ms <= 16 ms`);
      check(dMax <= 40, `${P} ${tag}: ${what}: drawImage per frame ${dMax} <= 40`);
      await shot(`perf-${mapId}`);
    } catch (e) { check(false, `${P} ${tag} (${mapId}): ${e.message.split('\n')[0]}`); }
  };
  if (want(39)) {
    console.log(' -- 39 the Gloomfen performance');
    for (const [mapId, patch, what] of [['lanternfen', combine(noIntro, council3, roadsWon('lanternfen')), 'the Lanternfen, in its fog'], ['long-boardwalk', combine(noIntro, council3, levelUp.replace(/LVL/g, '18'), roadsWon('long-boardwalk')), 'the long boardwalk']]) {
      await perfWalk(39, mapId, patch, what);
    }
  }

  // ================= M7 (P7): Act III, the Hollow Council and the Unsmith ===========================================
  // the fourth council sat (Act II over: all eight Brands, their letters read), at the Waking the Hearth Below is met at
  const BRANDS8 = [...BRANDS6, 'brand-of-lanterns', 'brand-of-the-deep'];
  const council4 = `(g) => { Object.assign(g.progress.flags.story, { 'act1-complete': true, 'council-done': true, 'sunscorch-complete': true, 'council-2-done': true, 'ironspire-complete': true, 'council-3-done': true, 'gloomfen-complete': true, 'council-4-done': true }); g.progress.brands = ${JSON.stringify(BRANDS8)}; for (const b of g.progress.brands) g.progress.flags.story['letter:' + b] = true; g.progress.waking = 8; return g; }`;
  const council5 = `(g) => { g.progress.flags.story['council-5-done'] = true; return g; }`;
  const won = (...ids) => `(g) => { for (const id of ${JSON.stringify(ids)}) { g.progress.flags.beaten[id] = 1; g.progress.flags.cleared[id] = true; } return g; }`;
  const lv38 = levelUp.replace(/LVL/g, '38');
  const COUNCIL4 = ['hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch'];
  // a scene and every node its choices lead to; does any of them carry an effect? (P3's scenes: the Opening's end)
  const reachable = id => {
    const out = new Set(), q = [id];
    while (q.length) {
      const n = q.shift();
      if (!n || out.has(n) || !DIALOGUE[n]) continue;
      out.add(n);
      for (const c of DIALOGUE[n].choices || []) q.push(c.next, c.check?.pass, c.check?.fail, c.contest?.pass, c.contest?.fail);
    }
    return out;
  };
  const sceneDoes = (id, pred) => [...reachable(id)].some(n => [...(DIALOGUE[n].do || []), ...(DIALOGUE[n].choices || []).flatMap(c => c.do || [])].some(pred));
  const track = () => W(() => window.__app.audio.track || null);
  const storyCard = async cls => {
    await page.waitForSelector(`.ov-story.${cls}`, { timeout: 6000 });
    await page.waitForTimeout(250);
    return W(c => {
      const ov = document.querySelector(`.ov-story.${c}`), card = ov.querySelector('.story-card'), r = card.getBoundingClientRect(), go = ov.querySelector('.story-go').getBoundingClientRect();
      // its words as written (textContent: the kicks are upper-cased by CSS only)
      const text = [...card.querySelectorAll('p, h2, dt, dd')].map(n => n.textContent).join(' ').replace(/\s+/g, ' ');
      return { text, left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, goH: Math.round(go.height), goW: Math.round(go.width) };
    }, cls);
  };
  const fits = (label, c) => check(c.left >= 0 && c.right <= c.w && c.goH >= 44 && c.goW >= 44, `${P} ${label}: the card fits the screen, its button 44 px (${c.left}..${c.right} of ${c.w}, ${c.goW}x${c.goH})`);
  // the Keep's yard, before the Great Hall's door (from the map data): a council flag set out here does not play its
  // scene until the party walks in
  const hallDoor = MAPS.keep.exits.find(x => x.to === 'keep-hall');
  const toYard = async () => {
    const at = hallDoor && besideArea('keep', hallDoor.area);
    if (!at) throw new Error('no tile before the Great Hall\'s door in the Keep\'s yard');
    await teleport('keep', at.x, at.y, at.face);
  };
  // no dialog (alert, confirm) ever opens: a hostile string that ran would open one
  const alerts = [];
  page.on('dialog', d => { alerts.push(d.message()); d.dismiss().catch(() => {}); });

  // ================= 40. the Opening: the vault stair, the fifth council, Act III's card, the Hearth Below's card =====
  if (want(40)) {
    console.log(' -- 40 the Opening');
    try {
      const X = MAPS['keep-hall'].exits.find(x => x.id === 'hall-down');
      if (!X || !MAPS['keep-hall'].entities.some(e => e.kind === 'trigger' && e.dialogue === 'council-5')) block(`${P} 40: the vault stair or the fifth council's trigger is not in the Great Hall yet (P2, P3)`);
      else {
        // (a new game starts in the Great Hall, where the fifth council would play at once: the fourth council is sat
        // with the party out in the Keep's yard)
        await setup({ patch: combine(noIntro, council3, lv38) });
        await toYard();
        await regame(council4);
        // before the fifth council the vault floor is shut, and says so
        await throughExit('keep-hall', 'hall-down');
        await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
        await page.waitForTimeout(700);
        const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
        check(msg.includes(X.sealed.text.slice(0, 24)) && (!X.sealed.hint || msg.includes(X.sealed.hint.slice(0, 20))), `${P} 40: before the fifth council the vault stair is sealed, and says what opens it ("${msg.slice(0, 140)}…")`);
        await shot('vault-stair-sealed');
        await playDialogue();
        check((await state()).map === 'keep-hall' && !(await W(() => window.__world.entity('keep-hall', 'vault-stair'))), `${P} 40: the party stays in the Great Hall, and no stair shows in the vault floor`);
        // the fifth council plays on walking into the Great Hall with the fourth sat
        await throughExit('keep', hallDoor.id);
        await page.waitForSelector('.ov-dialogue', { timeout: 6000 });
        await playDialogue(/./, 150); // (a long scene: every line may take two taps)
        // the Opening's title card: P3's council-5 ends with { end: 'act3-open' }; until it does, the story seam plays it
        const ends = sceneDoes('council-5', e => e.end === 'act3-open');
        let seen = await page.waitForSelector('.ov-story.act3-open', { timeout: ends ? 6000 : 1200 }).catch(() => null);
        if (!seen && !ends) {
          console.log(`  note ${P} 40: council-5 does not end with { end: 'act3-open' } yet (P3): the card is played through the story seam`);
          await W(() => { window.__world.story([{ t: 'end', act: 'act3-open' }]); });
          seen = await page.waitForSelector('.ov-story.act3-open', { timeout: 4000 }).catch(() => null);
        }
        const c = seen ? await storyCard('act3-open') : null;
        check(!!c && /Act III/.test(c.text) && /The Hollow Council/.test(c.text), `${P} 40: the Opening's title card: "Act III: The Hollow Council" ("${c ? c.text.slice(0, 160) : 'none'}…")`);
        if (c) {
          const lit = await W(() => document.querySelectorAll('.ov-story.act3-open .coal.lit').length);
          check(lit === BRAND_TOTAL, `${P} 40: all ${BRAND_TOTAL} coals burn on the card (${lit})`);
          fits('40 the Opening', c);
          await noScroll('40 the Opening');
          await shot('act3-opening');
          await page.click('.ov-story .story-go');
          await page.waitForTimeout(300);
        }
        await closeOverlays();
        check(await W(() => !!window.__world.game().progress.flags.story['council-5-done']), `${P} 40: the fifth council has sat (council-5-done)`);
        // the stair stands open in the vault floor, and goes down to the Hollow Hall
        check(!!(await W(() => window.__world.entity('keep-hall', 'vault-stair'))), `${P} 40: after the fifth council the vault stair shows in the floor`);
        await throughExit('keep-hall', 'hall-down');
        await arrived(X.to);
        // the Hearth Below's card, the first time down: the player's still, or its own drawn scene
        const rc = await storyCard('region-below');
        const art = await W(() => ({ still: !!document.querySelector('.ov-story .region-still'), drawn: !!document.querySelector('.ov-story .region-drawn') }));
        check(/The Hearth Below/.test(rc.text) && /Act III/.test(rc.text) && (art.still || art.drawn), `${P} 40: the Hearth Below's card, the first time down (${art.still ? 'the still' : art.drawn ? 'its drawn scene' : 'no picture'}: "${rc.text.slice(0, 120)}…")`);
        fits('40 the Hearth Below\'s card', rc);
        await shot('hearth-below-card');
        await page.click('.ov-story .story-go');
        await page.waitForTimeout(300);
        await closeOverlays();
        check((await state()).map === X.to && (await track()) === MAPS[X.to].music && MAPS[X.to].music === 'dungeon', `${P} 40: down in ${MAPS[X.to].name}, playing its track (${await track()})`);
        // once a save: up the stair and down again, no card
        await throughExit(X.to, 'hh-up');
        await arrived('keep-hall');
        await closeOverlays();
        await throughExit('keep-hall', 'hall-down');
        await arrived(X.to);
        await page.waitForTimeout(700);
        check(!(await page.$('.ov-story.region-below')), `${P} 40: the second time down, no card`);
      }
    } catch (e) { check(false, `${P} 40: ${e.message.split('\n')[0]}`); }
  }

  // ================= 41. the Hollow Hall: the stair behind sealed after the first fight ===============================
  if (want(41)) {
    console.log(' -- 41 the Hollow Hall\'s stair');
    try {
      const HH = MAPS['hollow-hall'];
      const up = HH?.exits.find(x => x.id === 'hh-up');
      const gate1 = HH?.entities.find(e => e.kind === 'gate' && e.guard === 'hollow-miravel');
      if (!up || !gate1) block(`${P} 41: the Hollow Hall's stair or its first gate is not placed yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council4, council5, lv38, `(g) => { g.progress.flags.seen = { ...(g.progress.flags.seen || {}), 'card:below': true }; return g; }`) });
        // before the first fight the way back up is open
        await throughExit('hollow-hall', 'hh-up');
        await arrived('keep-hall');
        check(true, `${P} 41: before the first fight the stair back up is open`);
        await closeOverlays();
        // the first Council member's card, then a forced win
        const ap = approachOf('hollow-hall', gate1.id);
        if (!ap) throw new Error('no way up to Miravel from the stair');
        await teleport('hollow-hall', ap.x, ap.y, ap.face);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await W(d => window.__world.face(d), ap.face);
        await pressA();
        for (let i = 0; i < 12 && !(await page.$('.ov-prefight')); i++) {
          if (await page.$('.dlg-choice')) await page.click('.dlg-choice').catch(() => {}); else await page.click('.dlg-next').catch(() => {});
          await page.waitForTimeout(200);
        }
        await page.waitForSelector('.ov-prefight', { timeout: 3000 });
        await page.waitForTimeout(250);
        const pf = (await page.innerText('.ov-prefight')).replace(/\s+/g, ' ');
        check(pf.includes(ENCOUNTERS['hollow-miravel'].name) && /Face Hollow Miravel|Face the Champion|Fight/.test(pf), `${P} 41: Hollow Miravel's card ("${pf.slice(0, 120)}…")`);
        if (FOES['hollow-miravel'].tier === 'hollow') check(/Hollow Council/.test(pf) && /d20 \+4/.test(pf) && await W(() => !!document.querySelector('.ov-prefight .pf-bonus')), `${P} 41: her card reads her die as a d20 +4 while the gift holds`);
        else block(`${P} 41: Hollow Miravel is still the scaffold's stand-in on the Champion's tier: her card's d20 +4 waits for P4's family`);
        await shot('hollow-miravel-card');
        await noScroll('41 the Council\'s card');
        await W(() => { window.__forceResult = { result: 'victory', xp: 80, gold: 40, claimed: [window.__worldTools.relicItem('hollow-wreath', 'Hollow Miravel')] }; });
        await page.click('.pf-fight');
        await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'aftermath', null, { timeout: 8000 });
        for (let i = 0; i < 10 && (await screen()) === 'aftermath'; i++) {
          if (await page.$('.ov-reveal')) { await page.waitForSelector('.ov-reveal .cont', { timeout: 8000 }); await page.click('.ov-reveal .cont'); }
          else if (await page.$('.af-loot .chest:not(.opened)')) await page.click('.af-loot .chest:not(.opened)');
          else if (await page.$('.af-foot .btn.primary')) await page.click('.af-foot .btn.primary');
          await page.waitForTimeout(400);
        }
        await page.waitForFunction(() => document.getElementById('app').dataset.screen === 'world', null, { timeout: 6000 });
        for (let i = 0; i < 30 && (await page.$('.ov')); i++) { await closeOverlays(); await page.waitForTimeout(150); }
        check(await W(() => (window.__world.game().progress.flags.beaten['hollow-miravel'] || 0) > 0), `${P} 41: Hollow Miravel is beaten`);
        // now the stair behind is sealed until the last chair is empty
        await throughExit('hollow-hall', 'hh-up');
        await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
        await page.waitForTimeout(700);
        const msg = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
        check(msg.includes(up.sealed.text.slice(0, 24)) && (!up.sealed.hint || msg.includes(up.sealed.hint.slice(0, 20))) && /ash/i.test(msg), `${P} 41: after the first fight the stair behind is sealed ("${msg.slice(0, 140)}…")`);
        await shot('hollow-hall-sealed');
        await playDialogue();
        check((await state()).map === 'hollow-hall', `${P} 41: the party stays in the Hollow Hall`);
        // the fourth beaten: open again
        await regame(won(...COUNCIL4));
        await throughExit('hollow-hall', 'hh-up');
        await arrived('keep-hall');
        check(true, `${P} 41: with the fourth Council member beaten the stair back up is open again`);
        await closeOverlays();
      }
    } catch (e) { check(false, `${P} 41: ${e.message.split('\n')[0]}`); }
  }

  // ================= 42. the Chained Deep: Tamsin joins; the Worldforge; the Unsmith's card =========================
  if (want(42)) {
    console.log(' -- 42 Tamsin below, the Unsmith\'s card');
    try {
      const T = MAPS['chained-deep']?.entities.find(e => e.id === 'cd-tamsin');
      const lair = MAPS.worldforge?.entities.find(e => e.kind === 'encounter' && e.enc === 'unsmith');
      if (!T || !lair) block(`${P} 42: Tamsin or the Unsmith is not placed yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council4, council5, lv38, won(...COUNCIL4, 'as-thralls', 'cd-unmade', 'wf-warden'), `(g) => { g.progress.flags.seen = { ...(g.progress.flags.seen || {}), 'card:below': true }; return g; }`) });
        await standBy('chained-deep', 'cd-tamsin', ['w', 's', 'n', 'e']);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        check(!!(await W(() => window.__world.entity('chained-deep', 'cd-tamsin'))), `${P} 42: Tamsin waits in the Chained Deep, before the forge door`);
        await pressA();
        await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
        const said = (await page.innerText('.ov-dialogue')).replace(/\s+/g, ' ');
        check(/Tamsin/i.test(said), `${P} 42: she speaks ("${said.slice(0, 100)}…")`);
        await shot('tamsin-below');
        await playDialogue(/./, 150); // (a long scene: every line may take two taps)
        await closeOverlays();
        const st = await W(() => window.__world.game().progress.flags.story);
        const gone = !(await W(() => window.__world.entity('chained-deep', 'cd-tamsin')));
        check(!!st['tamsin-returned'] && !!st['met-tamsin-below'] && gone, `${P} 42: she joins (tamsin-returned, met-tamsin-below) and leaves the map (${gone ? 'gone' : 'still there'})`);
        // the Worldforge plays the boss track; the Unsmith's card
        await standBy('worldforge', lair.id, ['w', 's', 'n', 'e']);
        await closeOverlays();
        check((await track()) === 'boss', `${P} 42: the Worldforge plays the boss track (${await track()})`);
        await W(() => window.__world.roam([]));
        await pressA();
        // his word before the fight (data/dialogue.js 'unsmith'): every line may take two taps, and the first choice,
        // "Ask him why.", is a longer scene; "Face him." opens the card
        for (let i = 0; i < 40 && !(await page.$('.ov-prefight')); i++) {
          const face = await W(() => { const b = [...document.querySelectorAll('.dlg-choice:not([disabled])')].find(x => /Face him/i.test(x.innerText)); return b ? b.dataset.pick : null; });
          if (face) await page.click(`.dlg-choice[data-pick="${face}"]`).catch(() => {});
          else if (await page.$('.dlg-choice')) await page.click('.dlg-choice').catch(() => {}); else await page.click('.dlg-next').catch(() => {});
          await page.waitForTimeout(200);
        }
        await page.waitForSelector('.ov-prefight', { timeout: 3000 });
        await page.waitForTimeout(300);
        const pf = (await page.innerText('.ov-prefight')).replace(/\s+/g, ' ');
        const pieces = (FOES.unsmith.relics || []).map(id => RELICS[id].name.replace(/^The /, ''));
        check(pf.includes('The Unsmith') && pieces.length === 3 && pieces.every(n => pf.includes(n)), `${P} 42: the Unsmith's card names him and his three pieces (${pieces.join(', ')})`);
        check(/Tamsin fights beside you/.test(pf) && await W(() => !!document.querySelector('.ov-prefight .pf-ally canvas')), `${P} 42: the card says Tamsin fights beside you, with her figure`);
        if (FOES.unsmith.tier === 'unsmith') check(/2 d20s/.test(pf) && await W(() => document.querySelectorAll('.ov-prefight .pf-dice canvas').length >= 2), `${P} 42: the card shows his two dice`);
        else block(`${P} 42: the Unsmith is still the scaffold's stand-in on the Champion's tier: his two dice on the card wait for P4's family`);
        if ((FOES.unsmith.phases || []).some(p => p.steals)) {
          const want2 = stolenFor(await W(() => window.__world.game())).map(id => RELICS[id].name);
          const got = await W(() => [...document.querySelectorAll('.ov-prefight .pf-stolen-list li')].map(l => l.innerText.trim()));
          // (innerText reads the label as drawn: capitals)
          check(/What he will take/i.test(pf) && got.join('|') === want2.join('|'), `${P} 42: the card lists what he will take (${got.length}: ${got.join(', ')})`);
        } else block(`${P} 42: the Unsmith's phases do not steal yet: what he will take waits for P4's family`);
        await shot('unsmith-card');
        await noScroll('42 the Unsmith\'s card');
        await page.click('.pf-not-yet');
        await page.waitForTimeout(300);
      }
    } catch (e) { check(false, `${P} 42: ${e.message.split('\n')[0]}`); }
  }

  // ================= 43. the Worldforge's heart: the choice, Kindle Anew shut with its reasons ======================
  if (want(43)) {
    console.log(' -- 43 the heart\'s choice');
    try {
      const heart = MAPS.worldforge?.entities.find(e => e.id === 'wf-heart');
      if (!heart) block(`${P} 43: the Worldforge's heart is not placed yet (P2)`);
      else {
        await setup({ patch: combine(noIntro, council4, council5, lv38, won(...COUNCIL4, 'as-thralls', 'cd-unmade', 'wf-warden'), `(g) => { g.progress.flags.seen = { ...(g.progress.flags.seen || {}), 'card:below': true }; g.progress.flags.story['tamsin-returned'] = true; return g; }`) });
        // before the Unsmith falls the heart has only its words
        await standBy('worldforge', heart.id, ['w', 's', 'n', 'e']);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await pressA();
        await page.waitForSelector('.ov-dialogue .dlg-text', { timeout: 3000 });
        await page.waitForTimeout(500);
        check(!(await page.$('.dlg-choice')), `${P} 43: before the Unsmith falls the heart offers no choice`);
        await playDialogue();
        const view = g => dialogueView(g, 'the-heart');
        const hasChoice = (DIALOGUE['the-heart']?.choices || []).length > 0;
        if (!hasChoice) block(`${P} 43: the heart's choice is not written yet (P3: the-heart has no choices)`);
        else {
          await regame(won('unsmith'));
          await standBy('worldforge', heart.id, ['w', 's', 'n', 'e']);
          await closeOverlays();
          await W(() => window.__world.roam([]));
          await pressA();
          await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
          await toChoices();
          const V = view(await W(() => window.__world.game()));
          const shut = V.choices.filter(c => c.disabled && c.reasons?.length);
          const shown = await W(() => [...document.querySelectorAll('.dlg-choice')].map(b => ({ text: b.querySelector('.dlg-choice-t')?.textContent || '', off: b.disabled, why: [...b.querySelectorAll('.dlg-why-r')].map(r => r.textContent) })));
          const anew = shown.find(b => /Kindle Anew|anew/i.test(b.text)) || shown.find(b => b.off);
          check(shut.length >= 1 && !!anew && anew.off && anew.why.length === shut[0].reasons.length && anew.why.every((w, i) => w === shut[0].reasons[i]), `${P} 43: Kindle Anew is shown shut, with its reasons (${anew ? anew.why.join(' / ') : 'no such choice'})`);
          check(shown.filter(b => !b.off).length >= 2, `${P} 43: Rekindle and Release can be chosen (${shown.filter(b => !b.off).map(b => b.text).join(', ')})`);
          const tall = await W(() => [...document.querySelectorAll('.dlg-choice')].every(b => b.getBoundingClientRect().height >= 44));
          check(tall, `${P} 43: every choice is 44 px`);
          await noScroll('43 the heart');
          await shot('the-heart');
          await page.keyboard.press('Escape').catch(() => {});
          await closeOverlays();
        }
      }
    } catch (e) { check(false, `${P} 43: ${e.message.split('\n')[0]}`); }
  }

  // ================= 44. an ending: its card, the credits, the last card, the Great Hall ============================
  if (want(44)) {
    console.log(' -- 44 an ending');
    try {
      // a hostile Warden's name (a saved string) and a Masterpiece: both are only ever shown as text
      const hostile = '<img src=x onerror=alert(1)>';
      const mpItem = `(g, T) => { const it = T.relicItem('fenwicks-poker'); g.inventory.push({ ...it, uid: 'mp-e2e', base: 'longsword', kind: 'sword', slot: 'weapon', rarity: 'primal', name: "Wren's Answer", masterpiece: true, power: 'masterpiece-kindle', affixes: [] }); g.party.roster.warden.name = ${JSON.stringify(hostile)}; return g; }`;
      await setup({ patch: combine(noIntro, council4, council5, lv38, won(...COUNCIL4, 'as-thralls', 'cd-unmade', 'wf-warden', 'unsmith'), mpItem, `(g) => { g.progress.flags.seen = { ...(g.progress.flags.seen || {}), 'card:below': true }; g.ending = 'anew'; return g; }`) });
      const heart = MAPS.worldforge?.entities.find(e => e.id === 'wf-heart');
      const real = (DIALOGUE['the-heart']?.choices || []).length > 0 && sceneDoes('the-heart', e => e.end === 'act3');
      if (heart) await standBy('worldforge', heart.id, ['w', 's', 'n', 'e']);
      await closeOverlays();
      if (real) {
        // P3's scenes: choose an ending the party can take at the heart; its scene ends with { end: 'act3' }
        await regame(`(g) => { g.ending = null; return g; }`);
        await standBy('worldforge', heart.id, ['w', 's', 'n', 'e']);
        await closeOverlays();
        await W(() => window.__world.roam([]));
        await pressA();
        await page.waitForSelector('.ov-dialogue', { timeout: 3000 });
        await toChoices();
        const pick = await W(() => { const b = [...document.querySelectorAll('.dlg-choice:not([disabled])')].find(x => /Rekindle/i.test(x.innerText)) || document.querySelector('.dlg-choice:not([disabled])'); return b ? b.dataset.pick : null; });
        if (!pick) throw new Error('no ending can be chosen at the heart');
        await page.click(`.dlg-choice[data-pick="${pick}"]`);
        for (let i = 0; i < 150 && !(await page.$('.ov-story.ending')); i++) { if (await page.$('.dlg-choice')) await page.click('.dlg-choice:not([disabled])').catch(() => {}); else await page.click('.dlg-next').catch(() => {}); await page.waitForTimeout(200); }
      } else {
        console.log(`  note ${P} 44: the heart's scenes are not written yet (P3): the ending is played through the story seam`);
        await W(() => { window.__world.story([{ t: 'ending', id: 'anew' }, { t: 'end', act: 'act3' }]); });
      }
      const ending = await W(() => window.__world.game().ending);
      const E = ENDINGS[ending];
      const c1 = await storyCard('ending');
      const art = await W(() => ({ still: !!document.querySelector('.ov-story .region-still'), drawn: !!document.querySelector('.ov-story .region-drawn') }));
      check(!!E && c1.text.includes(E.name) && c1.text.includes(E.text) && (art.still || art.drawn), `${P} 44: the ending's card: ${E?.name}, ${art.still ? 'the still' : art.drawn ? 'its drawn scene' : 'no picture'} ("${c1.text.slice(0, 120)}…")`);
      if (ending === 'anew') check(c1.text.includes("Wren's Answer burns in the Eternal Hearth"), `${P} 44: Kindle Anew names the Masterpiece`);
      fits('44 the ending\'s card', c1);
      await noScroll('44 the ending');
      await shot(`ending-${ending}`);
      await page.click('.ov-story .story-go');
      const c2 = await storyCard('credits');
      const credits = await W(() => { const ov = document.querySelector('.ov-story.credits'); return { imgs: ov.querySelectorAll('img').length, warden: [...ov.querySelectorAll('dd')].map(d => d.textContent) }; });
      check(/Aethermoor/.test(c2.text) && /Thank you for playing/.test(c2.text) && c2.text.includes(E.name), `${P} 44: the credits roll, with the ending chosen ("${c2.text.slice(0, 100)}…")`);
      check(credits.warden.includes(hostile) && credits.imgs === 0 && !alerts.length, `${P} 44: the Warden's name is shown as text, never as markup (${credits.imgs} images, ${alerts.length} alerts)`);
      fits('44 the credits', c2);
      await noScroll('44 the credits');
      await shot('credits');
      await page.click('.ov-story .story-go');
      const c3 = await storyCard('last-card');
      check(/The post-game opens in the next chapter/.test(c3.text), `${P} 44: the last card: "The post-game opens in the next chapter"`);
      fits('44 the last card', c3);
      await shot('last-card');
      await page.click('.ov-story .story-go');
      await page.waitForFunction(m => window.__world && window.__world.state().map === m && !window.__world.state().transition, START_AT.map, { timeout: 8000 });
      await page.waitForTimeout(300);
      await closeOverlays();
      const s = await state();
      check(s.map === START_AT.map && (await W(() => window.__world.game().ending)) === ending, `${P} 44: back in the Great Hall (${s.map} ${s.x},${s.y}), the ending remembered (${ending})`);
    } catch (e) { check(false, `${P} 44: ${e.message.split('\n')[0]}`); }
  }

  // ================= 45. the Masterpiece at Hilda's forge ==========================================================
  if (want(45)) {
    console.log(' -- 45 the Masterpiece');
    try {
      const M = TUNING.masterpiece;
      const rich = `(g) => { g.gold = ${M.gold + 500}; g.materials = { ...(g.materials || {}), embers: ${M.embers + 1}, silver: ${M.silver + 1} }; g.gems = { ...(g.gems || {}), 'bog-amber': ${M.amber} }; return g; }`;
      await setup({ patch: combine(noIntro, council4, council5, lv38, won(...COUNCIL4), rich) });
      const openTab = async () => {
        await W(() => { window.__world.story([{ t: 'open', screen: 'masterpiece' }]); });
        await page.waitForSelector('.ov-forge .forge-tab[data-tab="masterpiece"][aria-selected="true"]', { timeout: 4000 });
        await page.waitForTimeout(250);
      };
      // without the Worldforge page Hilda says what she needs, and will not forge
      await openTab();
      const why0 = await W(() => [...document.querySelectorAll('.ov-forge .mp-why li')].map(l => l.textContent));
      const off0 = await W(() => document.querySelector('.ov-forge .mp-go')?.disabled);
      check(why0.some(w => /Worldforge page/.test(w)) && off0 === true, `${P} 45: without the page the Masterpiece is not offered, and the tab says why (${why0.join(' / ')})`);
      await shot('masterpiece-not-yet');
      await page.click('.ov-forge .forge-done');
      await page.waitForTimeout(300);
      // with it: the bases, the name field, the price
      await regame(`(g) => { g.progress.flags.story['worldforge-page'] = true; return g; }`);
      await openTab();
      const tab = await W(() => ({ bases: document.querySelectorAll('.ov-forge .mp-base').length, input: !!document.querySelector('.ov-forge input.mp-name'), cost: document.querySelector('.ov-forge .forge-cost')?.innerText.replace(/\s+/g, ' ') || '', why: document.querySelectorAll('.ov-forge .mp-why li').length }));
      check(tab.bases === 10 && tab.input && tab.why === 0 && new RegExp(`${M.gold} gold`).test(tab.cost) && /Bog Amber/.test(tab.cost), `${P} 45: the tab shows the ten bases, a name field and the price ("${tab.cost.slice(0, 90)}")`);
      const baseH = await W(() => [...document.querySelectorAll('.ov-forge .mp-base')].every(b => b.getBoundingClientRect().height >= 44));
      check(baseH, `${P} 45: every base is 44 px`);
      await page.click('.ov-forge .mp-base[data-base="longsword"]');
      await page.waitForTimeout(200);
      // a hostile name: refused, shown as text, never run
      const hostile = '<img src=x onerror=alert(1)>';
      await page.fill('.ov-forge input.mp-name', hostile);
      await page.waitForTimeout(250);
      const bad = await W(() => ({ say: document.querySelector('.ov-forge .mp-say')?.textContent || '', off: document.querySelector('.ov-forge .mp-go')?.disabled, imgs: document.querySelectorAll('.ov-forge img').length, why: document.querySelector('.ov-forge .mp-why-now')?.textContent || '' }));
      check(bad.off === true && /will not take/.test(bad.say) && /1 to 24 letters/.test(bad.why) && bad.imgs === 0 && !alerts.length, `${P} 45: a hostile name is refused, never run and never markup ("${bad.say}", ${bad.imgs} images, ${alerts.length} alerts)`);
      await shot('masterpiece-hostile');
      await noScroll('45 the Masterpiece tab');
      // angle brackets are scrubbed, as a pasted code's are: the name that will read is shown back as text
      await page.fill('.ov-forge input.mp-name', '<Ember-Heart>');
      await page.waitForTimeout(200);
      const scrub = await W(() => document.querySelector('.ov-forge .mp-say')?.textContent || '');
      check(scrub === 'It will read: Ember-Heart', `${P} 45: angle brackets are scrubbed ("${scrub}")`);
      const name = "Wren's Answer";
      await page.fill('.ov-forge input.mp-name', name);
      await page.waitForTimeout(200);
      check(await W(() => document.querySelector('.ov-forge .mp-go')?.disabled === false), `${P} 45: a good name, and the forge is ready`);
      await page.click('.ov-forge .mp-go');
      // the reveal, as it is: the chest, then the card in its primal frame, named as typed
      await page.waitForSelector('.ov-reveal .card', { timeout: 12000 });
      await page.waitForTimeout(500);
      const rv = await W(() => ({ r: document.querySelector('.ov-reveal .card')?.dataset.r || '', name: document.querySelector('.ov-reveal .card .item-name')?.textContent || '', banner: document.querySelector('.ov-reveal .banner h2')?.textContent || '' }));
      check(rv.r === 'primal' && rv.name.includes(name) && rv.banner === name, `${P} 45: the reveal shows the Masterpiece in its primal frame, named "${rv.name}"`);
      await shot('masterpiece-reveal');
      await page.waitForSelector('.ov-reveal .cont', { timeout: 8000 });
      await page.click('.ov-reveal .cont');
      await page.waitForTimeout(300);
      const after = await W(() => ({ fc: document.querySelector('.ov-forge .forge-card-name')?.textContent || '', go: !!document.querySelector('.ov-forge .mp-go') }));
      check(after.fc.includes(name) && !after.go, `${P} 45: one per save: the tab now shows the Masterpiece, with nothing more to forge`);
      await page.click('.ov-forge .forge-done');
      await page.waitForTimeout(300);
      const g = await W(() => window.__world.game());
      const mp = g.inventory.filter(i => i.masterpiece);
      check(mp.length === 1 && mp[0].name === name && mp[0].rarity === 'primal', `${P} 45: the party owns one Masterpiece, "${mp[0]?.name}"`);
    } catch (e) { check(false, `${P} 45: ${e.message.split('\n')[0]}`); }
  }

  // ================= 46. the Journal's Act III and the Atlas's "Below the Keep" =====================================
  if (want(46)) {
    console.log(' -- 46 the Journal and the Atlas below');
    try {
      const keysRow = async () => {
        await W(() => window.__app.go('journal', { tab: 'keys', from: 'world' }));
        await page.waitForSelector('.jr-seals', { timeout: 4000 });
        return W(() => [...document.querySelectorAll('.jr-seals li')].map(l => ({ text: l.innerText.replace(/\s+/g, ' '), have: l.classList.contains('have') })).find(r => /Hearth Below/.test(r.text)) || null);
      };
      // before the fourth council the Journal does not name the road below (the party out in the Keep's yard, so the
      // fifth council does not play when the fourth is sat)
      await setup({ patch: combine(noIntro, council3) });
      await toYard();
      check(!(await keysRow()), `${P} 46: before the fourth council the Journal does not name the road to the Hearth Below`);
      await toWorld();
      await regame(council4);
      const shut = await keysRow();
      check(!!shut && !shut.have && /fifth/.test(shut.text), `${P} 46: after the fourth council the road below is listed, sealed ("${shut?.text}")`);
      await toWorld();
      await regame(council5);
      const open = await keysRow();
      check(!!open && open.have && /stands open/.test(open.text), `${P} 46: after the fifth council the road below stands open ("${open?.text}")`);
      await noScroll('46 the Journal\'s keys');
      // the Ladder: the Hollow Council and the Unsmith, Act III's five posters
      await page.click('.jr-tab[data-tab="ladder"]');
      await page.waitForTimeout(700);
      const act3 = LADDER.filter(l => l.act === 3).map(l => l.id);
      const posters = await W(ids => ids.map(id => document.querySelector(`.poster[data-id="${id}"]`)?.dataset.state || null), act3);
      check(act3.length === 5 && posters.every(Boolean), `${P} 46: the Ladder has Act III's five posters (${act3.map((id, i) => `${id}:${posters[i]}`).join(' ')})`);
      const found = LADDER.filter(l => l.found);
      if (found.length) {
        // (a rumour shows once its own `if` holds: the man on the barge only after the fen)
        const shown = await W(() => [...document.querySelectorAll('.poster.rumour')].map(p => p.dataset.id));
        const wantF = shown.filter(id => found.some(l => l.id === id));
        const f = await W(() => [...document.querySelectorAll('.poster.is-found .poster-found')].map(b => b.textContent));
        check(wantF.length >= 1 && f.length === wantF.length && f.every(t => /Found: the Unsmith/.test(t)), `${P} 46: the rumours shown settle into the Unsmith's poster (${f.join(', ')}: ${wantF.join(', ')})`);
        // its button goes to his poster, and flashes it
        await page.click('.poster.is-found .poster-found');
        await page.waitForFunction(() => { const p = document.querySelector('.poster[data-id="unsmith"]'); const r = p?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= innerHeight + 1; }, null, { timeout: 3000 }).catch(() => {});
        const went = await W(() => { const p = document.querySelector('.poster[data-id="unsmith"]'); const r = p?.getBoundingClientRect(); return { flash: !!p?.classList.contains('flash-to'), seen: !!r && r.top >= 0 && r.bottom <= innerHeight + 1 }; });
        check(went.flash && went.seen, `${P} 46: "Found: the Unsmith" goes to his poster (${JSON.stringify(went)})`);
      } else block(`${P} 46: the rumours do not settle into the Unsmith's poster yet (P3: a LADDER rumour's found: { if, poster })`);
      await shot('journal-ladder-act3');
      await toWorld();
      // the Atlas: "Below the Keep" on the Keep opens the Below view, with its four maps listed
      await W(() => window.__app.go('atlas', { mode: 'view', from: 'world', view: 'realm' }));
      await page.waitForSelector('.atlas-mk');
      await page.waitForTimeout(400);
      const mk = await W(() => { const b = document.querySelector('.atlas-mk[data-key="below"], .atlas-mk[data-key="region:below"]'); if (!b) return null; const r = b.getBoundingClientRect(); return { key: b.dataset.key, w: Math.round(r.width), h: Math.round(r.height), label: b.getAttribute('aria-label') }; });
      check(!!mk && mk.w >= 44 && mk.h >= 44 && /Below the Keep/.test(mk.label), `${P} 46: the Realm view marks the Keep "Below the Keep" (${mk ? `${mk.key}, ${mk.w}x${mk.h}` : 'none'})`);
      const views = await W(() => [...document.querySelectorAll('.atlas-view')].map(b => b.dataset.view));
      check(views.includes('below'), `${P} 46: the Atlas has a Below view (${views.join(' ')})`);
      if (mk) await page.click(`.atlas-mk[data-key="${mk.key}"]`);
      await page.waitForTimeout(400);
      const bv = await W(() => ({ view: document.querySelector('.atlas-frame')?.dataset.view, maps: [...document.querySelectorAll('.atlas-below li')].map(l => l.dataset.map), fires: [...document.querySelectorAll('.atlas-mk[data-hearth]')].map(b => b.dataset.hearth) }));
      const belowIds = Object.keys(MAPS).filter(id => MAPS[id].region === 'below');
      const belowFires = Object.keys(HEARTHS).filter(id => MAPS[HEARTHS[id].map]?.region === 'below');
      check(bv.view === 'below' && bv.maps.join(' ') === belowIds.join(' ') && belowFires.every(id => bv.fires.includes(id)), `${P} 46: "Below the Keep" opens the Below view: its ${bv.maps.length} maps listed and its fires (${bv.fires.join(', ')})`);
      await noScroll('46 the Atlas below');
      await shot('atlas-below');
      // from below, the Atlas opens on the Below view, and says where you are
      await toWorld();
      await standBy('chained-deep', 'cd-tamsin', ['w', 's', 'n', 'e']);
      await closeOverlays();
      await W(() => window.__app.go('atlas', { mode: 'view', from: 'world' }));
      await page.waitForSelector('.atlas-mk');
      await page.waitForTimeout(400);
      const here = await W(() => ({ view: document.querySelector('.atlas-frame')?.dataset.view, here: document.querySelector('.atlas-below li.ab-here')?.dataset.map || null }));
      check(here.view === 'below' && here.here === 'chained-deep', `${P} 46: from the Chained Deep the Atlas opens below, and marks where you are (${here.view}, ${here.here})`);
      await toWorld();
    } catch (e) { check(false, `${P} 46: ${e.message.split('\n')[0]}`); }
  }

  // ================= 47. performance in the Hearth Below, measured like 39 ==========================================
  if (want(47)) {
    console.log(' -- 47 the Hearth Below performance');
    // spec §8: each Act III map at 4x throttle, p95 frame JS 16 ms and 40 drawImage (its gates open and its fights won,
    // the Unsmith's too, so the walk is the map's own; the Hearth Below's card already seen)
    const seenBelow = `(g) => { g.progress.flags.seen = { ...(g.progress.flags.seen || {}), 'card:below': true }; return g; }`;
    const below = Object.keys(MAPS).filter(m => MAPS[m].region === 'below');
    for (const id of below) {
      await perfWalk(47, id, combine(noIntro, council4, council5, lv38, roadsWon(id), won(...COUNCIL4, 'unsmith'), seenBelow), MAPS[id].name);
    }
    // walking in: the map is baked (its big props built) while the screen is black, so the fade in and the first second
    // on the map draw with no long frame (the way in: an exit into the map from the map before it on the road down)
    try {
      // (each map walked before, its arrival lines heard: nothing but the map itself on the way in)
      const walked = `(g) => { const f = g.progress.flags; f.visits = { ...(f.visits || {}), ${below.map(id => `'${id}': 1`).join(', ')} }; f.seen = { ...(f.seen || {}), ${below.map(id => `'arrive:${id}': true`).join(', ')} }; return g; }`;
      await setup({ patch: combine(noIntro, council4, council5, lv38, won(...COUNCIL4, 'as-thralls', 'cd-unmade', 'wf-warden', 'unsmith'), seenBelow, walked) });
      for (const id of below) {
        const from = Object.values(MAPS).find(m => m.id !== id && m.exits.some(x => x.to === id && !x.gate));
        const X = from?.exits.find(x => x.to === id && !x.gate);
        if (!X) { check(false, `${P} 47: no open way into ${MAPS[id].name}`); continue; }
        await W(() => { window.__entry = []; window.__entryOn = true; const tick = t => { if (!window.__entryOn) return; const s = window.__world && window.__world.state(); window.__entry.push([t, s ? s.fade : 0, s ? s.map : '', s && s.transition ? 1 : 0, s ? s.objBuilds : 0]); requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
        await throughExit(from.id, X.id);
        await arrived(id);
        await page.waitForTimeout(1000);
        const fr = await W(() => { window.__entryOn = false; return window.__entry; });
        await closeOverlays();
        // the frames once the new map shows (its fade in, then the first second), and the longest while it was black;
        // and the object sprites built on the way in (the view's count): every one before the map shows, none after
        const at = fr.findIndex(f => f[2] === id && f[1] < 1);
        let shown = 0, dark = 0;
        for (let i = 1; i < fr.length; i++) { const d = fr[i][0] - fr[i - 1][0]; if (at >= 0 && i > at) shown = Math.max(shown, d); else if (fr[i - 1][3]) dark = Math.max(dark, d); }
        const went = fr.findIndex(f => f[3]);
        const builtIn = at >= 0 && went >= 0 ? fr[at][4] - fr[went][4] : 0, builtAfter = at >= 0 ? fr[fr.length - 1][4] - fr[at][4] : 0;
        const line = `${P} 47: walking into ${MAPS[id].name} (from ${from.name}): ${builtIn} object sprites built while black, ${builtAfter} after; the longest frame while black ${Math.round(dark)} ms, once it shows ${Math.round(shown)} ms`;
        perfLines.push(line);
        console.log('  PERF', line);
        check(at >= 0 && builtAfter === 0, `${P} 47: walking into ${MAPS[id].name}, every object sprite is built while the screen is black (${builtIn}), none once the map shows (${builtAfter})`);
        // (a sanity bound on the frames once it shows: a big prop's first build takes 100 to 300 ms)
        check(shown <= 150, `${P} 47: walking into ${MAPS[id].name}, no long stall once it shows (${Math.round(shown)} ms; ${Math.round(dark)} ms while black)`);
      }
    } catch (e) { check(false, `${P} 47 (walking in): ${e.message.split('\n')[0]}`); }
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
// M5 is whole (no stand-ins are left), so a blocked check is a check that did not run: it fails the run
for (const b of blocked) fails.push(`blocked: ${b}`);
console.log(fails.length ? `\nE2E-WORLD FAILED (${fails.length}):\n - ${fails.join('\n - ')}` : '\nE2E-WORLD passed');
process.exit(fails.length ? 1 : 0);
