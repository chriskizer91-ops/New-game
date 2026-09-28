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
//   3  a roaming pack contact starts a battle; fleeing stuns the roamer; a weak pack is Routed
//      with the spoils strip
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
// Playwright is not a project dependency: it comes from the global npm root.
// Owner: WP7.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
const file = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
const outDir = path.resolve(args.out && args.out !== true ? args.out : path.join(os.tmpdir(), 'aeth-e2e-world'));
mkdirSync(outDir, { recursive: true });
const only = args.scenario ? new Set(String(args.scenario).split(',').map(Number)) : null;
const want = n => !only || only.has(n);

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
      if (name === 'battle' && force) {
        if (!force.sticky) window.__forceResult = null;
        window.__lastBattle = p.battle;
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
      await setup({ patch: noIntro });
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

  // ================= 3. packs: contact, flee, stun; the Rout ============================================
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
      // a weak pack: the party is far above it, so walking into it Routs it
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
      await W(() => window.__world.face('n'));
      await W(() => window.__world.press('n'));
      await page.waitForSelector('.ov-spoils', { timeout: 4000 });
      const sp = await page.innerText('.ov-spoils');
      check(/Routed/i.test(sp) && /gold/.test(sp), `${P} 3: a weak pack is Routed, with the spoils strip ("${sp.split('\n').slice(0, 2).join(' · ')}")`);
      await shot('spoils');
      const chip = await page.$('.spoils-chip');
      if (chip) {
        await chip.click();
        await page.waitForSelector('.ov-reveal .card', { timeout: 8000 });
        check(true, `${P} 3: a spoils chip opens the card reveal`);
        await page.click('.ov-reveal .cont');
        await page.waitForTimeout(200);
      } else block(`${P} 3: the Rout dropped no item, so no chip to open (loot.routSpoils, WP2)`);
      await page.click('.ov-spoils [data-primary]');
      await page.waitForTimeout(200);
      const after = await state();
      const gold1 = await W(() => window.__world.game().gold);
      check(!after.roamers.some(r => r.id === 'e2e-weak'), `${P} 3: the routed pack is gone`);
      check(gold1 > gold0, `${P} 3: the Rout paid gold (${gold0} -> ${gold1})`);
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
      await setup({ patch: combine(noIntro, levelUp.replace(/LVL/g, '10')) });
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
