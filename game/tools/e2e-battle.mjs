// End-to-end test of the battle screen (Playwright, preinstalled Chromium). Builds the dev
// harness, then plays real battles at phone (390x844) and laptop (1280x800) sizes: the tutorial
// Tallyman fight (manual commands), a rabble fight, the Rot-Stag, Old Snag (until a disarm
// happens), Briarmaw (all three phases, plus a Legend Surge), for M3 a fight in the dark (the
// Lamp Room) and the Tamsin duel's intro ("Losing is a yield."), and for M4 the Sunscorch's two
// Champions: Kharzul through three phases with Cinderfang pried loose, and the Ashen Warden with
// both the Aegis and the Crown snapped off (each piece shuts its moves down). M5 (spec §8, P7): Mother
// Anvil through three phases with the Worldforge Hammer and the Anvil Heart snapped off (anvil); the
// Rime-Abbot holding a hero under the ice ("Held under", by him, the turns left, out of the line) and
// letting go early (abbot); Kharzul's exact Burrow: sunk into the floor, out of reach, up again at its
// turn with its forced blow (burrow); a charmed hero ("Charmed", then its turn played against a friend)
// (charm). M6 (spec §8, P7): the Lantern Mother through three phases with the Lamplighter's Lantern and the Mourning
// Veil snapped off (lantern); a hero led away under the water ("Led away", by her) and back in the line (led-away);
// the Blackwater Leviathan diving ("Dived · out of reach", drawn in its dive pose) and swallowing a hero whole
// (leviathan); Hodge's Toll Is Due at the strongest hero and his shove off the bridge ("In the river"), and his words
// when he sits down (hodge); a hexed hero and a rotting one, and a heal halved by rot (fen). M6's review: at 360x740 a
// hit of 9 dice or more keeps the tray's total inside the tray and the screen (tray). M7 (spec §8, P7), at 360x740 in
// the built game: a Hollow Council member's die reads "d20 +4" (the natural roll, the +4, the face), her gift snapped
// off takes the +4 away, and beaten she is freed in her own words (hollow); the Unsmith through three phases with his
// two dice (two intents, two moves a turn, each named by its die), his Stolen Arts (his plate, Analyze, the stolen
// event) and Tamsin fighting beside the party: her card with theirs, tappable for her details, her own move banner,
// no horizontal scroll (unsmith). A fight that needs a rare
// moment is found by the rules first (a starter, level and seed that has it; the harness plays the same fight).
// A scenario whose foes are still the scaffold's stand-ins reports BLOCKED, not a pass, and fails the run (M7: what
// the screen can show on a patched stand-in is checked, and only what needs the real family is BLOCKED).
// Asserts no console errors or uncaught exceptions, no horizontal scroll, 44px tap targets, and the
// aftermath hand-off. Screenshots of the key moments go to tools/shots/battle-*.png.
//
//   node tools/e2e-battle.mjs                 # everything
//   node tools/e2e-battle.mjs --only=snag,boss  # some scenarios (names below)
//   node tools/e2e-battle.mjs --out=/tmp/x    # private harness page and screenshots (parallel runs)
//   node tools/e2e-battle.mjs --no-build      # the M7 scenarios reuse dist/aethermoor.html
//   AETH_HTML=/tmp/x/aethermoor.html node tools/e2e-battle.mjs --only=hollow,unsmith   # M7 on a private build
// Owner: WP8; M5 P7 (the Ironspire scenarios); M6 P7 (the Gloomfen's); M7 P7 (the Hollow Council's and the Unsmith's).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDevBattle } from './dev-battle.mjs';
import { RELICS } from '../src/data/relics.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { FOES } from '../src/data/foes.js';
import { newGame, startBattle } from '../src/rules/gauntlet.js';
import { grantXp, xpForLevel } from '../src/rules/progression.js';
import { deriveHero } from '../src/rules/stats.js';
import { createRng } from '../src/core/rng.js';
import { current, act, foeTurn } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { rollIntent, intentEvent } from '../src/rules/ai.js';
import { stolenMoves } from '../src/rules/foe.js';
import { stolenFor } from '../src/rules/codex.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const shots = args.out ? path.resolve(String(args.out)) : path.join(root, 'tools/shots');
mkdirSync(shots, { recursive: true });
const only = args.only ? String(args.only).split(',') : null;

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));

// Google Fonts, fetched once with curl (which knows the sandbox proxy's CA) and served to the
// test browser from a local cache, so screenshots always have the real type and page loads
// never stall on font retries. Without curl or network the pages fall back to system fonts.
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
    // keep the latin subsets only
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

const page0 = await buildDevBattle(args.out ? path.join(shots, 'dev-battle.html') : undefined);
const url = hash => `${pathToFileURL(page0).href}#${hash}`;
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const PHONE = { width: 390, height: 844 };
const PHONE360 = { width: 360, height: 740 }; // M5: the narrowest phone the game is designed for
const LAPTOP = { width: 1280, height: 800 };
const results = [];
const failures = [];
const blockedList = [];

function check(cond, msg) { if (!cond) throw new Error(msg); }

// a browser page at this size, its fonts from the cache, its errors collected (M7: the built game's page uses it too)
async function newPage(viewport, init = null) {
  // fonts come from Google Fonts through the sandbox proxy, whose CA Chromium does not know
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 600 ? 2 : 1, ignoreHTTPSErrors: true });
  if (fonts) {
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fonts.css }));
    await context.route('https://fonts.gstatic.com/**', r => {
      const f = fonts.files[r.request().url()];
      return f ? r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(f) }) : r.abort();
    });
  }
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  const fontish = m => /fonts\.(googleapis|gstatic)/.test(`${m.text()} ${m.location()?.url || ''}`);
  page.on('console', m => { if (m.type() === 'error' && !fontish(m)) errors.push(`console: ${m.text()} ${m.location()?.url || ''}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  return { page, context, errors };
}

async function open(viewport, hash) {
  const { page, context, errors } = await newPage(viewport);
  await page.goto(url(`hooks=1&${hash}`));
  await page.waitForSelector('.bt-stage canvas');
  // every fight starts with Auto off (M4.5 A5): an &auto=1 run presses the button if the harness did not
  if (/(^|&)auto=1(&|$)/.test(hash)) {
    await page.waitForSelector('.bt-auto', { timeout: 10000 });
    if ((await page.getAttribute('.bt-auto', 'aria-pressed')) !== 'true') await page.click('.bt-auto');
  }
  // M5: pause on the next event a predicate picks (a status of one id and op, a charmed move...), not
  // only on the next of a type: the harness's peak pauses on __btPauseOn, so the predicate adds its type
  await page.evaluate(() => {
    const hooks = globalThis.__btHooks;
    if (!hooks || hooks.__when) return;
    const orig = hooks.peak.bind(hooks);
    hooks.__when = true;
    hooks.peak = ev => {
      if (window.__btPauseWhen && window.__btPauseWhen(ev)) { window.__btPauseWhen = null; window.__btPauseOn.add(ev.t); }
      return orig(ev);
    };
  });
  return { page, context, errors };
}

// M5: pause on the next event for which pred(ev, arg) holds (a function, run in the page); screenshot;
// resume. Returns { path, ev, info } (info: what probe(ev) read in the page while paused) or null at the
// end. armPause sets the predicate alone (the fight may reach it while the test does something else), and
// waitPaused waits for it.
async function armPause(page, pred, arg = null) {
  await page.evaluate(([src, a]) => { const fn = (0, eval)(`(${src})`); window.__btPauseWhen = ev => fn(ev, a); }, [pred.toString(), arg]);
}
async function pauseWhen(page, pred, name, opts = {}) {
  await armPause(page, pred, opts.arg ?? null);
  return waitPaused(page, name, opts);
}
async function waitPaused(page, name, { timeout = 300000, hurry = false, probe = null } = {}) {
  const stop = hurry ? await startHurry(page) : null;
  try {
    await page.waitForFunction(() => window.__btPaused || window.__aftermath, null, { timeout, polling: 50 });
  } finally { if (stop) await stop(); }
  if (!(await page.evaluate(() => window.__btPaused))) { await page.evaluate(() => { window.__btPauseWhen = null; }); return null; }
  await page.waitForTimeout(80);
  // the probe reads the page before the screenshot: a float (a number, "halved by rot") lives on its own clock while
  // the fight is paused, and a slow screenshot could outlast it
  const ev = await page.evaluate(() => window.__btPausedEvent);
  const info = probe ? await page.evaluate(probe, ev) : null;
  const p = name ? await shot(page, name) : null;
  await page.evaluate(() => window.__btResume());
  return { path: p, ev, info };
}

// M5: the harness's fights are deterministic (its newGame, its levelling, then Auto), so a scenario that
// needs a rare moment (a hold let go early) finds a starter, level and seed that has one by playing the
// same fight through the rules first. levelParty is tools/dev-battle-entry.js's own; keep the two alike.
function levelled(game, level, seed) {
  const rng = createRng(`dev-level:${seed}`);
  for (const id of game.party.active) {
    let h = game.party.roster[id];
    const need = xpForLevel(level) - (h.xp || 0);
    if (need > 0) h = grantXp(h, need, rng).hero;
    const d = deriveHero(h, game.inventory);
    game.party.roster[id] = { ...h, hp: d.maxHp, mp: d.maxMp };
  }
  return game;
}
function harnessFight(node, { starter, level, seed }) {
  const game = levelled(newGame({ name: 'Wren', starter, seed }), level, seed);
  let { battle: st } = startBattle(game, { nodeId: node });
  const events = [...(st.openingEvents || [])];
  for (let i = 0; i < 3000 && current(st); i++) {
    const id = current(st);
    const r = st.units[id].side === 'hero' ? act(st, autoCommand(st, id)) : foeTurn(st);
    events.push(...r.events);
    st = r.state;
  }
  return { state: st, events };
}
function findFight(node, want, { starters = ['hearthbrand', 'stillwater-lance', 'cairnmaul'], levels = [8, 10, 12], seeds = 30 } = {}) {
  for (const starter of starters) for (const level of levels) for (let seed = 1; seed <= seeds; seed++) {
    try { if (want(harnessFight(node, { starter, level, seed }).events)) return { starter, level, seed }; } catch { /* a broken fight is the browser run's to report */ }
  }
  return null;
}

// M5: a scenario whose foes are still the scaffold's stand-ins cannot test the real thing yet
function blocked(rec, msg) {
  rec.blocked = rec.blocked ? `${rec.blocked}; ${msg}` : msg; // M7: a scenario may run, and block only its parts
  blockedList.push(`${rec.name}: ${msg}`);
}
const stubbed = (...families) => families.filter(f => !FOES[f] || FOES[f].stub);
// a party that can take a Champion through all three phases at Waking 0 (M4 used 12 against level-6 Kharzul)
const levelFor = enc => Math.max(1, ...(ENCOUNTERS[enc]?.spawns || []).map(s => (typeof s.level === 'number' ? s.level : 6))) + 6;

async function shot(page, name) {
  const p = path.join(shots, `battle-${name}.png`);
  await page.screenshot({ path: p });
  return p;
}

// pause on the next event of this type (or the end of the battle); screenshot; resume
async function pauseOn(page, type, name, { timeout = 240000, hurry = false } = {}) {
  await page.evaluate(t => window.__btPauseOn.add(t), type);
  const stop = hurry ? await startHurry(page) : null;
  try {
    await page.waitForFunction(t => window.__btPaused === t || window.__aftermath, type, { timeout, polling: 50 });
  } finally { if (stop) await stop(); }
  const paused = await page.evaluate(() => window.__btPaused);
  if (paused !== type) { await page.evaluate(t => window.__btPauseOn.delete(t), type); return null; }
  await page.waitForTimeout(60);
  const p = name ? await shot(page, name) : null;
  const ev = await page.evaluate(() => window.__btPausedEvent);
  await page.evaluate(() => window.__btResume());
  return { path: p, ev };
}

// keep tapping an empty patch of sky to fast-forward animations (tests "tap to hurry")
async function startHurry(page) {
  await page.evaluate(() => {
    window.__hurry = setInterval(() => {
      const st = document.querySelector('.bt-stage');
      if (!st || !document.querySelector('.bt.playing')) return;
      const r = st.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + 6, r.top + 6);
      if (el && !el.closest('.bt-foe-hit, .bt-plate, .bt-grip')) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: r.left + 6, clientY: r.top + 6 }));
    }, 120);
  });
  return () => page.evaluate(() => clearInterval(window.__hurry));
}

async function toAftermath(page, { timeout = 300000, hurry = false } = {}) {
  const stop = hurry ? await startHurry(page) : null;
  try { await page.waitForFunction(() => window.__aftermath, null, { timeout, polling: 100 }); } finally { if (stop) await stop().catch(() => {}); }
  return page.evaluate(() => window.__aftermath);
}

async function logText(page) {
  return page.evaluate(() => window.__btLog || []);
}

// layout checks while the battle screen is up
async function layoutChecks(page, label) {
  const r = await page.evaluate(() => {
    const out = { scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, bt: null, small: [], overflow: [] };
    const bt = document.querySelector('.bt');
    if (bt) { const b = bt.getBoundingClientRect(); out.bt = { w: b.width, h: b.height, bottom: b.bottom, vh: window.innerHeight }; }
    for (const el of document.querySelectorAll('.bt-cmd, .bt-tool, .bt-hero, .bt-opt, .bt-back, .bt-foe-hit')) {
      if (!el.offsetParent) continue;
      const b = el.getBoundingClientRect();
      if (b.height < 40 || b.width < 40) out.small.push(`${el.className} ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    for (const el of document.querySelectorAll('.bt-plate, .bt-intent, .bt-hero-info, .bt-cmd')) {
      if (!el.offsetParent) continue;
      const b = el.getBoundingClientRect();
      if (b.left < -1 || b.right > window.innerWidth + 1) out.overflow.push(`${el.className} ${Math.round(b.left)}..${Math.round(b.right)}`);
    }
    return out;
  });
  check(r.scrollW <= r.innerW + 1, `${label}: horizontal scroll (${r.scrollW} > ${r.innerW})`);
  check(!r.bt || r.bt.bottom <= r.bt.vh + 1, `${label}: battle screen taller than the viewport (${r.bt && r.bt.bottom} > ${r.bt && r.bt.vh})`);
  check(!r.small.length, `${label}: tap targets under 40px: ${r.small.join(', ')}`);
  check(!r.overflow.length, `${label}: elements off screen: ${r.overflow.join(', ')}`);
  return r;
}

async function scenario(name, fn) {
  if (only && !only.includes(name)) return;
  const t0 = Date.now();
  const rec = { name, ok: false, notes: [], shots: [] };
  try {
    await fn(rec);
    rec.ok = !rec.blocked;
  } catch (e) {
    rec.error = e.message;
    failures.push(`${name}: ${e.message}`);
  }
  rec.secs = ((Date.now() - t0) / 1000).toFixed(1);
  results.push(rec);
  console.log(`${rec.blocked && !rec.error ? 'BLOCKED' : rec.ok ? 'PASS' : 'FAIL'} ${name} (${rec.secs}s)${rec.notes.length ? ' - ' + rec.notes.join('; ') : ''}${rec.blocked ? `\n     blocked: ${rec.blocked}` : ''}${rec.error ? '\n     ' + rec.error : ''}`);
}

async function finishCommon(rec, s, { expect = null } = {}) {
  const am = s.aftermath;
  check(am && am.result && am.result.result, 'no aftermath hand-off');
  check(am.ended, 'the handed-off battle state is not ended');
  if (expect) check(expect.includes(am.result.result), `unexpected result ${am.result.result}`);
  rec.notes.push(`${am.result.result} in ${am.result.rounds} rounds / ${am.result.turns} turns`);
  check(!s.errors.length, `errors: ${s.errors.slice(0, 5).join(' | ')}`);
}

// ---- phone -------------------------------------------------------------------------------------------

await scenario('tutorial', async rec => {
  const s = await open(PHONE, 'node=tallyman&level=1&speed=2');
  const { page } = s;
  await page.waitForSelector('.bt-cmds:not([hidden]) .bt-cmd', { timeout: 30000 });
  await layoutChecks(page, 'tutorial/commands');
  rec.shots.push(await shot(page, 'phone-commands'));
  // Skills submenu
  await page.click('.bt-cmd[data-cmd="skills"]');
  await page.waitForSelector('.bt-sub:not([hidden]) .bt-opt');
  await layoutChecks(page, 'tutorial/skills');
  rec.shots.push(await shot(page, 'phone-skills'));
  await page.click('.bt-sub .bt-back');
  // Attack: targeting
  await page.click('.bt-cmd[data-cmd="attack"]');
  await page.waitForSelector('.bt-aim:not([hidden])');
  await page.waitForTimeout(250);
  rec.shots.push(await shot(page, 'phone-target'));
  // attack until a blow lands: screenshot the dice, then the damage
  let landed = false;
  for (let tries = 0; tries < 6 && !landed; tries++) {
    if (tries) {
      await page.waitForSelector('.bt-cmds:not([hidden]) .bt-cmd', { timeout: 30000 });
      await page.click('.bt-cmd[data-cmd="attack"]');
      await page.waitForSelector('.bt-aim:not([hidden])');
    }
    await page.evaluate(() => { window.__btPauseOn.add('roll'); window.__btPauseOn.add('damage'); });
    await page.click('.bt-foe.focus .bt-foe-hit');
    await page.waitForFunction(() => window.__btPaused === 'roll', null, { timeout: 20000 });
    if (!tries) rec.shots.push(await shot(page, 'phone-roll'));
    const ev = await page.evaluate(() => window.__btPausedEvent);
    await page.evaluate(() => window.__btResume());
    if (['hit', 'crit', 'graze'].includes(ev.result)) {
      await page.waitForFunction(() => window.__btPaused === 'damage', null, { timeout: 20000 });
      rec.shots.push(await shot(page, 'phone-damage'));
      landed = true;
    }
    await page.evaluate(() => { window.__btPauseOn.clear(); window.__btResume(); });
  }
  if (!landed) rec.notes.push('every attack missed');
  // the grip meter on the Tallyman opens the HELD BY preview
  const s2 = await page.$('.bt-grip');
  // M6: an older relic's grip bar keeps the word it shipped with (the Warden's Seal: "Warden's")
  const word = await page.evaluate(() => document.querySelector('.bt-grip .bt-grip-nm')?.textContent || '');
  check(!s2 || word === RELICS['wardens-seal'].name.replace(/^The /, '').split(' ')[0], `the Tallyman's grip bar reads "${word}", not the Warden's Seal's own word`);
  if (s2) {
    await page.waitForSelector('.bt-cmds:not([hidden])', { timeout: 30000 });
    await page.click('.bt-grip');
    await page.waitForSelector('.bt-preview', { timeout: 5000 });
    await page.waitForTimeout(450);
    rec.shots.push(await shot(page, 'phone-heldby'));
    await page.click('.bt-preview .btn');
  }
  // Analyze sheet
  await page.waitForSelector('.bt-cmds:not([hidden])', { timeout: 30000 });
  await page.click('.bt-analyze');
  await page.waitForSelector('.bt-inspect.in', { timeout: 5000 });
  await page.waitForTimeout(350);
  rec.shots.push(await shot(page, 'phone-analyze'));
  await page.click('.bt-inspect .btn');
  // open the log, then let Auto finish at 4x
  await page.click('.bt-top .bt-tool[aria-controls="bt-log"]');
  await page.waitForTimeout(200);
  rec.shots.push(await shot(page, 'phone-log'));
  await page.click('.bt-log-head .bt-tool');
  await page.click('.bt-auto');
  await page.click('.bt-speed'); // 2x -> 4x
  s.aftermath = await toAftermath(page, { timeout: 120000 });
  await finishCommon(rec, s, { expect: ['victory'] });
  check(s.aftermath.result.claimed.some(i => i.base === 'wardens-seal'), 'the Warden\'s Seal was not claimed');
  await s.context.close();
});

await scenario('menus', async rec => {
  // a full gauge, the bag, ally targeting, and the intro card
  const s = await open(PHONE, 'node=edge&level=5&speed=2&surge=100');
  const { page } = s;
  await page.waitForSelector('.bt-intro', { timeout: 10000 });
  rec.shots.push(await shot(page, 'phone-intro'));
  await page.waitForSelector('.bt-cmds:not([hidden]) .bt-cmd.ready', { timeout: 30000 });
  await page.waitForTimeout(300);
  rec.shots.push(await shot(page, 'phone-surge-ready'));
  await page.click('.bt-cmd[data-cmd="items"]');
  await page.waitForSelector('.bt-sub:not([hidden]) .bt-opt');
  await page.waitForTimeout(300);
  await layoutChecks(page, 'menus/items');
  rec.shots.push(await shot(page, 'phone-items'));
  await page.click('.bt-opt[data-id="hearth-tonic"]');
  await page.waitForSelector('.bt-hero.valid', { timeout: 5000 });
  await page.waitForTimeout(250);
  rec.shots.push(await shot(page, 'phone-ally-target'));
  await page.click('.bt-aim .bt-back');
  await page.click('.bt-sub .bt-back');
  // Surge through the menu (the relic's own card slams across the screen)
  await page.click('.bt-cmd[data-cmd="surge"]');
  if (await page.$('.bt-aim:not([hidden]) .bt-aim-go')) await page.click('.bt-aim-go');
  else if (await page.$('.bt-aim:not([hidden])')) await page.click('.bt-foe.focus .bt-foe-hit');
  await page.waitForSelector('.bt-slam', { timeout: 10000 });
  await page.click('.bt-auto');
  s.aftermath = await toAftermath(page, { timeout: 180000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('rabble', async rec => {
  const s = await open(PHONE, 'node=rabble&level=1&speed=4&auto=1');
  await s.page.waitForSelector('.bt-foe:not([hidden])', { timeout: 20000 });
  await s.page.waitForTimeout(1600);
  await layoutChecks(s.page, 'rabble');
  rec.shots.push(await shot(s.page, 'phone-rabble'));
  s.aftermath = await toAftermath(s.page, { timeout: 180000 });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('patrol', async rec => {
  const s = await open(PHONE, 'node=deep&patrol=1&level=5&speed=4&auto=1&reduced=1');
  s.aftermath = await toAftermath(s.page, { timeout: 180000 });
  await finishCommon(rec, s);
  rec.notes.push('reduced motion');
  await s.context.close();
});

await scenario('rare', async rec => {
  // a cutpurse bolting for the trees, and Briarmaw calling a Briarling up out of the floor
  const a = await open(PHONE, 'node=rabble&level=1&speed=2&auto=1&seed=6&pause=escape');
  const esc = await pauseOn(a.page, 'escape', 'phone-escape', { timeout: 120000 });
  check(esc, 'no escape event in the rabble fight (seed 6)');
  a.aftermath = await toAftermath(a.page, { timeout: 120000, hurry: true });
  await finishCommon(rec, a);
  await a.context.close();
  const b = await open(PHONE, 'node=briarmaw&level=9&speed=4&auto=1&seed=2&pause=spawn');
  const sp = await pauseOn(b.page, 'spawn', 'phone-spawn', { timeout: 300000, hurry: false });
  check(sp, 'no spawn in the Briarmaw fight (seed 2)');
  await layoutChecks(b.page, 'rare/spawn');
  b.aftermath = await toAftermath(b.page, { timeout: 300000, hurry: true });
  await finishCommon(rec, b);
  await b.context.close();
});

await scenario('defeat', async rec => {
  // an under-levelled party walks into Briarmaw: KO'd heroes, then the DEFEAT banner
  const s = await open(PHONE, 'node=briarmaw&level=2&speed=4&auto=1&pause=end');
  const end = await pauseOn(s.page, 'end', 'phone-defeat', { timeout: 300000, hurry: true });
  check(end && end.ev.result === 'defeat', `expected a defeat, got ${end && end.ev.result}`);
  s.aftermath = await toAftermath(s.page, { timeout: 60000 });
  await finishCommon(rec, s, { expect: ['defeat'] });
  await s.context.close();
});

await scenario('flee', async rec => {
  // Flee from a patrol through the menu until the DEX check succeeds
  const s = await open(PHONE, 'node=road&patrol=1&level=2&speed=4&pause=end');
  const { page } = s;
  for (let i = 0; i < 12; i++) {
    await page.waitForSelector('.bt-cmds:not([hidden]) .bt-cmd[data-cmd="flee"], .bt-end', { timeout: 60000 });
    if (await page.$('.bt-end')) break;
    await page.click('.bt-cmd[data-cmd="flee"]');
    await page.waitForFunction(() => document.querySelector('.bt.playing') || document.querySelector('.bt-end') || window.__btPaused, null, { timeout: 10000 });
    if (await page.evaluate(() => window.__btPaused === 'end')) break;
  }
  const end = await pauseOn(s.page, 'end', 'phone-fled', { timeout: 60000 });
  check(end && end.ev.result === 'fled', `expected to flee, got ${end && end.ev.result}`);
  s.aftermath = await toAftermath(s.page, { timeout: 60000 });
  await finishCommon(rec, s, { expect: ['fled'] });
  await s.context.close();
});

await scenario('rotstag', async rec => {
  const s = await open(PHONE, 'node=rotstag&level=4&speed=4&auto=1&pause=damage');
  await s.page.waitForSelector('.bt-foe:not([hidden])', { timeout: 20000 });
  const d = await pauseOn(s.page, 'damage', 'phone-rotstag', { timeout: 60000 });
  check(d, 'no damage in the Rot-Stag fight');
  await layoutChecks(s.page, 'rotstag');
  s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('snag', async rec => {
  let disarmed = false;
  for (const seed of [7, 8, 9, 10, 11, 12]) {
    const s = await open(PHONE, `node=oldsnag&level=6&speed=4&auto=1&seed=${seed}&pause=disarm`);
    const d = await pauseOn(s.page, 'disarm', 'phone-disarm', { timeout: 300000 });
    if (d) {
      disarmed = true;
      rec.notes.push(`disarm on seed ${seed}`);
      await s.page.waitForTimeout(100);
      const loose = await s.page.evaluate(() => [...document.querySelectorAll('.bt-grip.loose')].length);
      check(loose >= 1, 'the grip chip does not show the relic as loose');
      s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
      const log = await logText(s.page);
      check(log.some(l => /clatters loose/.test(l)), 'the log has no disarm line');
      await finishCommon(rec, s);
      if (s.aftermath.result.result === 'victory') check(s.aftermath.result.claimed.some(i => i.base === 'thornsplitter'), 'Thornsplitter was not claimed');
      await s.context.close();
      break;
    }
    s.aftermath = await s.page.evaluate(() => window.__aftermath);
    await finishCommon(rec, s);
    await s.context.close();
  }
  check(disarmed, 'no disarm happened in any seed');
});

await scenario('boss', async rec => {
  const s = await open(PHONE, 'node=briarmaw&level=9&speed=4&auto=1&surge=100&pause=legend');
  const lg = await pauseOn(s.page, 'legend', 'phone-legend', { timeout: 60000 });
  check(lg, 'no Legend Surge fired');
  const p2 = await pauseOn(s.page, 'phase', 'phone-phase2', { timeout: 400000, hurry: true });
  check(p2 && p2.ev.phase === 2, 'Briarmaw never reached phase 2');
  await layoutChecks(s.page, 'boss/phase2');
  const p3 = await pauseOn(s.page, 'phase', 'phone-phase3', { timeout: 400000, hurry: true });
  check(p3 && p3.ev.phase === 3, 'Briarmaw never reached phase 3');
  const end = await pauseOn(s.page, 'end', 'phone-victory', { timeout: 400000, hurry: true });
  check(end, 'no end banner');
  s.aftermath = await toAftermath(s.page, { timeout: 400000, hurry: true });
  const log = await logText(s.page);
  check(log.some(l => /phase 2/.test(l)) && log.some(l => /phase 3/.test(l)), 'the log misses a phase');
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('services', async rec => {
  // the shared card component, when registered, gets the Legend Surge and the HELD BY preview
  const s = await open(PHONE, 'node=oldsnag&level=6&speed=4&surge=100&svc=1');
  await s.page.waitForSelector('.bt-cmds:not([hidden])', { timeout: 30000 });
  await s.page.click('.bt-grip');
  await s.page.click('.bt-cmd[data-cmd="surge"]');
  await s.page.waitForSelector('.bt-aim:not([hidden]), .bt.playing', { timeout: 5000 });
  if (await s.page.$('.bt-aim:not([hidden])')) await s.page.click('.bt-foe.focus .bt-foe-hit, .bt-aim-go');
  await s.page.waitForFunction(() => (window.__svcCalls || []).some(c => c[0] === 'cardSlam'), null, { timeout: 30000 });
  const calls = await s.page.evaluate(() => window.__svcCalls);
  check(calls.some(c => c[0] === 'cardPreview' && c[2] === 'Old Snag'), 'cardPreview was not called with heldBy');
  rec.notes.push(calls.map(c => c.join(':')).join(', '));
  await s.page.click('.bt-auto');
  s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('dark', async rec => {
  // M3: the Lamp Room fight is in the dark (battle.ctx.dark): the backdrop's dark treatment
  const s = await open(PHONE, 'node=lantern&level=11&speed=4&auto=1&pause=damage');
  await s.page.waitForSelector('.bt-foe:not([hidden])', { timeout: 20000 });
  const d = await pauseOn(s.page, 'damage', 'phone-dark', { timeout: 120000 });
  check(d, 'no damage in the Lamp Room fight');
  await layoutChecks(s.page, 'dark');
  s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('duel', async rec => {
  // M3: the Tamsin duel says what losing costs before it starts
  const s = await open(PHONE, 'node=duel&level=8&speed=4&auto=1');
  await s.page.waitForSelector('.bt-intro', { timeout: 10000 });
  const intro = await s.page.evaluate(() => document.querySelector('.bt-intro')?.textContent || '');
  check(/A duel/.test(intro) && /Losing is a yield/.test(intro), `the duel intro reads "${intro}"`);
  rec.shots.push(await shot(s.page, 'phone-duel-intro'));
  s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

// M4 (spec §8): a Champion taken through all three phases with every breakable piece snapped off, and
// each piece's loss shutting its moves down ("... clatters loose! Kharzul loses Glasscutter."). The
// Cairnmaul starter breaks grips; seeds are tried until one does it all (the fight is dice).
async function championFight(rec, node, pieces, shotName, { level = 12 } = {}) {
  const names = pieces.map(id => RELICS[id].name);
  for (const seed of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const s = await open(PHONE, `node=${node}&level=${level}&speed=4&auto=1&starter=cairnmaul&seed=${seed}`);
    if (seed === 3) {
      const p2 = await pauseOn(s.page, 'phase', `phone-${shotName}-phase2`, { timeout: 400000, hurry: true });
      if (p2) { rec.shots.push(p2.path); await layoutChecks(s.page, `${node}/phase2`); }
    }
    s.aftermath = await toAftermath(s.page, { timeout: 400000, hurry: true });
    const log = await logText(s.page);
    check(!s.errors.length, `seed ${seed}: errors: ${s.errors.slice(0, 5).join(' | ')}`);
    check(s.aftermath?.ended, `seed ${seed}: no aftermath hand-off`);
    await s.context.close();
    const phases = [2, 3].filter(n => log.some(l => new RegExp(`phase ${n}`).test(l)));
    const loose = names.filter(n => log.some(l => l.includes(`${n} clatters loose!`)));
    const shut = names.filter(n => log.some(l => l.includes(`${n} clatters loose!`) && / loses /.test(l)));
    rec.notes.push(`seed ${seed}: ${s.aftermath.result.result}, phases ${phases.join('+') || '-'}, loose ${loose.join(' + ') || '-'}`);
    if (phases.length === 2 && loose.length === names.length) {
      check(shut.length === names.length, `seed ${seed}: a piece came loose without shutting its moves down (${names.filter(n => !shut.includes(n)).join(', ')})`);
      if (s.aftermath.result.result === 'victory') {
        const got = s.aftermath.result.claimed.map(i => i.base);
        check(pieces.every(id => got.includes(id)), `seed ${seed}: won, but not every piece was claimed (${got.join(', ')})`);
      }
      return;
    }
  }
  throw new Error(`no seed took ${node} through three phases with ${names.join(' and ')} loose`);
}

await scenario('kharzul', async rec => {
  await championFight(rec, 'kharzul-heart', ['cinderfang', 'glass-carapace'], 'kharzul');
});

await scenario('warden', async rec => {
  await championFight(rec, 'ashen-warden', ['ashen-aegis', 'cinder-crown'], 'warden');
});

// ---- M5 (spec §8): the Ironspire's Champions, and the exact statuses ---------------------------------------

await scenario('anvil', async rec => {
  // Mother Anvil through three phases with the Worldforge Hammer and the Anvil Heart snapped off
  if (stubbed('mother-anvil').length) { blocked(rec, 'Mother Anvil is still the scaffold stand-in (P4: data/foes.js)'); return; }
  await championFight(rec, 'mother-anvil', ['worldforge-hammer', 'anvil-heart'], 'anvil', { level: levelFor('mother-anvil') });
});

// what a hero's card says while paused on an event about it (the M5 holds and charms)
const heroProbe = ev => {
  const id = ev.target || ev.actor;
  const card = document.querySelector(`.bt-hero[data-id="${id}"]`);
  const q = sel => card?.querySelector(sel)?.textContent || '';
  return {
    id, held: !!card?.classList.contains('held'), charmed: !!card?.classList.contains('charmed'),
    k: q('.bt-hold-k'), by: q('.bt-hold-by'), t: q('.bt-hold-t'), tag: q('.bt-hero-tag'), aria: card?.getAttribute('aria-label') || '',
    ribbonHeld: document.querySelectorAll('.bt-rib.held').length, ban: document.querySelector('.bt-move-ban:not([hidden])')?.textContent || '',
    side: document.querySelector('.bt-move-ban')?.dataset.side || '', caption: document.querySelector('.bt-caption')?.textContent || '',
    floats: [...document.querySelectorAll('.bt-float b')].map(b => b.textContent), pops: [...(card?.querySelectorAll('.bt-tag-w.pop') || [])].map(w => w.dataset.k),
  };
};

await scenario('abbot', async rec => {
  // M5: the Rime-Abbot's Drown holds a hero under the ice: its card says "Held under", by him, with the turns
  // left, and it is out of the line; a hard enough blow (or his fall) lets it go before the turns run out
  if (stubbed('rime-abbot').length) { blocked(rec, 'the Rime-Abbot is still the scaffold stand-in (P4: data/foes.js)'); return; }
  const base = Math.max(...ENCOUNTERS['rime-abbot'].spawns.map(sp => sp.level));
  const pick = findFight('rime-abbot', ev => ev.some(e => e.t === 'status' && e.status === 'swallowed' && e.op === 'release'), { levels: [base + 2, base + 3, base + 4, base + 5, base + 6] });
  check(pick, 'by the rules, no starter, level or seed has the Rime-Abbot hold a hero under and let go early');
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}`);
  const s = await open(PHONE360, `node=rime-abbot&level=${pick.level}&speed=4&auto=1&starter=${pick.starter}&seed=${pick.seed}`);
  let first = null, freed = null, holds = 0;
  for (let n = 0; n < 8 && !freed; n++) {
    const h = await pauseWhen(s.page, ev => ev.t === 'status' && ev.status === 'swallowed' && ev.op === 'add', first ? null : 'phone360-abbot-held', { hurry: true, probe: heroProbe });
    if (!h) break;
    holds++;
    if (!first) {
      first = h;
      rec.shots.push(h.path);
      check(h.info.held && /^held under$/i.test(h.info.k) && /Rime-Abbot/.test(h.info.by) && /^\d turns? left$/.test(h.info.t), `the held hero's card reads "${h.info.k} ${h.info.by} ${h.info.t}"`);
      check(/out of the line/.test(h.info.aria) && h.info.ribbonHeld >= 0, `the card's label says the hero is out of the line ("${h.info.aria}")`);
      await layoutChecks(s.page, 'abbot/held');
    }
    const out = await pauseWhen(s.page, (ev, id) => ev.t === 'status' && ev.target === id && ev.status === 'swallowed' && ['release', 'remove'].includes(ev.op), 'phone360-abbot-back', { hurry: true, arg: h.ev.target, probe: heroProbe });
    if (!out) break;
    check(!out.info.held, `back in the line, the card drops its hold (${out.ev.op})`);
    if (out.ev.op === 'release') {
      freed = out;
      rec.shots.push(out.path);
    }
  }
  s.aftermath = await toAftermath(s.page, { timeout: 400000, hurry: true });
  const log = await logText(s.page);
  await finishCommon(rec, s);
  await s.context.close();
  rec.notes.push(`${holds} hold${holds === 1 ? '' : 's'}${freed ? ', freed early' : ''}`);
  check(first, 'the Rime-Abbot held nobody under (the rules said he would)');
  check(log.some(l => /is held under by The Rime-Abbot/.test(l)), 'the log says who holds the hero');
  check(freed, 'the held hero was not let go early (the rules said it would be)');
  check(log.some(l => /is spat out as|is free: what held them has fallen/.test(l)), 'the log says why the hero is free');
});

await scenario('burrow', async rec => {
  // M5: Kharzul's exact Burrow: it goes under the floor (sunk, "Burrowed · out of reach", no target),
  // nothing can be aimed at it until it comes up at its own turn, and its forced blow follows
  const dive = FOES.kharzul?.moves?.burrow;
  if (!dive?.effects?.some(e => e.status === 'burrowed')) { blocked(rec, 'Kharzul\'s Burrow is still M4\'s approximation (P4: data/foes.js)'); return; }
  const thenName = dive.then ? FOES.kharzul.moves[dive.then]?.name : null;
  const foeProbe = ev => {
    const box = document.querySelector(`.bt-foe[data-id="${ev.target || ev.actor}"]`);
    return { sunk: !!box?.classList.contains('sunk'), state: box?.querySelector('.bt-foe-state')?.hidden ? '' : box?.querySelector('.bt-foe-state')?.textContent || '', aria: box?.querySelector('.bt-foe-hit')?.getAttribute('aria-label') || '' };
  };
  let done = false;
  for (const seed of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    const s = await open(PHONE360, `node=kharzul-heart&level=12&speed=4&auto=1&starter=cairnmaul&seed=${seed}`);
    const { page } = s;
    const down = await pauseWhen(page, ev => ev.t === 'status' && ev.status === 'burrowed' && ev.op === 'add', 'phone360-burrowed', { hurry: true, probe: foeProbe });
    if (!down) {
      s.aftermath = await page.evaluate(() => window.__aftermath);
      await finishCommon(rec, s);
      rec.notes.push(`seed ${seed}: no Burrow`);
      await s.context.close();
      continue;
    }
    rec.shots.push(down.path);
    const kid = down.ev.target;
    check(down.info.sunk && /^Burrowed · out of reach$/.test(down.info.state) && /cannot be targeted/.test(down.info.aria), `seed ${seed}: the burrowed plate reads "${down.info.state}" (${down.info.aria})`);
    await layoutChecks(page, 'burrow/sunk');
    // Auto off: a hero's turn while it is under has nothing to aim at (if Kharzul's own turn comes first,
    // the pause armed here catches it surfacing)
    await armPause(page, (ev, id) => ev.t === 'status' && ev.target === id && ev.status === 'burrowed' && ev.op === 'remove', kid);
    if ((await page.getAttribute('.bt-auto', 'aria-pressed')) === 'true') await page.click('.bt-auto');
    await page.waitForFunction(() => document.querySelector('.bt-cmds:not([hidden]) .bt-cmd') || window.__btPaused || window.__aftermath, null, { timeout: 120000, polling: 50 });
    const menu = await page.evaluate(() => !window.__btPaused && !!document.querySelector('.bt-cmds:not([hidden]) .bt-cmd'));
    if (menu && (await page.$('.bt-foe.sunk'))) {
      const others = await page.$$eval('.bt-foe:not(.down):not(.sunk)', xs => xs.length);
      const attackOff = await page.$eval('.bt-cmd[data-cmd="attack"]', btn => btn.classList.contains('off'));
      if (!others) check(attackOff, `seed ${seed}: with Kharzul under the floor and nobody else, Attack has no target`);
      else {
        await page.click('.bt-cmd[data-cmd="attack"]');
        await page.waitForSelector('.bt-aim:not([hidden])', { timeout: 5000 });
        const t = await page.evaluate(id => ({ valid: document.querySelector(`.bt-foe[data-id="${id}"]`).classList.contains('valid'), others: document.querySelectorAll('.bt-foe.valid').length }), kid);
        check(!t.valid && t.others >= 1, `seed ${seed}: aiming, the burrowed foe is no target (${JSON.stringify(t)})`);
        await page.click(`.bt-foe[data-id="${kid}"] .bt-plate`);
        await page.waitForTimeout(120);
        const cap = await page.textContent('.bt-caption');
        check(/under the floor/.test(cap), `seed ${seed}: tapping it says why ("${cap}")`);
        rec.shots.push(await shot(page, 'phone360-burrow-aim'));
        await page.click('.bt-aim .bt-back');
      }
      rec.shots.push(await shot(page, 'phone360-burrow-menu'));
      await layoutChecks(page, 'burrow/menu');
    }
    if ((await page.getAttribute('.bt-auto', 'aria-pressed')) !== 'true') await page.click('.bt-auto');
    // it surfaces at its own turn: the plate and the sprite come back, and its forced blow follows
    const up = await waitPaused(page, 'phone360-surfaced', { hurry: true, probe: foeProbe });
    if (up) {
      rec.shots.push(up.path);
      check(!up.info.sunk && !up.info.state, `seed ${seed}: up again, the plate drops "Burrowed" (${JSON.stringify(up.info)})`);
      if (thenName) {
        const blow = await pauseWhen(page, (ev, id) => ev.t === 'move' && ev.actor === id, 'phone360-erupt', { hurry: true, arg: kid });
        if (blow) check(blow.ev.name === thenName, `seed ${seed}: its forced blow follows (${blow.ev.name}, expected ${thenName})`);
      }
    }
    s.aftermath = await toAftermath(page, { timeout: 400000, hurry: true });
    const log = await logText(page);
    await finishCommon(rec, s);
    check(log.some(l => /Kharzul the Glass Scorpion: Burrow/.test(l)), `seed ${seed}: the log has the Burrow`);
    await s.context.close();
    rec.notes.push(`seed ${seed}: burrowed${menu ? ', a hero turn while under' : ''}`);
    done = true;
    break;
  }
  check(done, 'Kharzul never burrowed in any seed');
});

await scenario('charm', async rec => {
  // M5: a mirage-wisp's Beguile charms a hero: its card says "Charmed", and its next turn is played for it,
  // a plain attack on a friend (or a friend's blow wakes it first)
  const charms = Object.values(FOES['mirage-wisp']?.moves || {}).some(m => (m.effects || []).some(e => e.status === 'charmed'));
  if (!charms) { blocked(rec, 'the mirage-wisps\' charm is still M4\'s approximation (P4: data/foes.js)'); return; }
  const level = Math.max(...ENCOUNTERS['wisp-queen'].spawns.map(sp => sp.level)) + 3;
  let done = false;
  for (const seed of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    const s = await open(LAPTOP, `node=wisp-queen&level=${level}&speed=4&auto=1&seed=${seed}`);
    const c = await pauseWhen(s.page, ev => ev.t === 'status' && ev.status === 'charmed' && ev.op === 'add', 'laptop-charmed', { hurry: true, probe: heroProbe });
    if (!c) {
      s.aftermath = await s.page.evaluate(() => window.__aftermath);
      await finishCommon(rec, s);
      rec.notes.push(`seed ${seed}: nobody charmed`);
      await s.context.close();
      continue;
    }
    rec.shots.push(c.path);
    check(c.info.charmed && c.info.tag === 'Charmed' && /charmed/.test(c.info.aria), `seed ${seed}: the charmed hero's card says so (${c.info.tag}; ${c.info.aria})`);
    await layoutChecks(s.page, 'charm');
    const t = await pauseWhen(s.page, (ev, id) => (ev.t === 'move' && ev.charm && ev.actor === id) || (ev.t === 'status' && ev.target === id && ev.status === 'charmed' && ev.op === 'release'), 'laptop-charm-turn', { hurry: true, arg: c.ev.target, probe: heroProbe });
    if (t?.ev.t === 'move') {
      check(t.info.side === 'charm' && /Charmed/i.test(t.info.ban) && /turns on/.test(t.info.caption), `seed ${seed}: its turn turns on a friend ("${t.info.ban}" / "${t.info.caption}")`);
      rec.shots.push(t.path);
    }
    s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
    const log = await logText(s.page);
    await finishCommon(rec, s);
    check(log.some(l => /is charmed and turns on|snaps out of the charm|shakes off the charm/.test(l)), `seed ${seed}: the log tells the charm's end`);
    await s.context.close();
    rec.notes.push(`seed ${seed}: charmed, ${t?.ev.t === 'move' ? 'turned on a friend' : t ? 'woken by a friend' : 'the fight ended first'}`);
    done = true;
    break;
  }
  check(done, 'no seed had a wisp charm a hero');
});

// ---- M6 (spec §8): the Gloomfen's Champions, Hodge, and the fen's two statuses -----------------------------

// M6: a fight (starter, level, seed) the rules play with want(events, endState), and its events in order
function pickFight(node, want, opts) {
  const pick = findFight(node, ev => want(ev), opts);
  return pick ? { ...pick, events: harnessFight(node, pick).events } : null;
}
const isHeroId = id => ['warden', 'pip', 'bryn', 'alondra'].includes(id);
const holdAdd = label => ev => ev.t === 'status' && ev.status === 'swallowed' && ev.op === 'add' && ev.label === label;
const dived = ev => ev.t === 'status' && ev.status === 'burrowed' && ev.op === 'add';
// what a foe's plate says while paused on an event about it (M5's burrow, M6's dive)
const foeProbe = ev => {
  const id = ev.t === 'intent' ? ev.foe : ev.target || ev.actor || ev.foe;
  const box = document.querySelector(`.bt-foe[data-id="${id}"]`);
  return {
    pose: globalThis.__btHooks?.stage?.posed?.(id) || '', // the pose the stage last drew it in
    sunk: !!box?.classList.contains('sunk'), water: !!box?.classList.contains('water'), aria: box?.querySelector('.bt-foe-hit')?.getAttribute('aria-label') || '',
    state: box?.querySelector('.bt-foe-state')?.hidden ? '' : box?.querySelector('.bt-foe-state')?.textContent || '',
    intent: box?.querySelector('.bt-int-name')?.textContent || '', target: box?.querySelector('.bt-int-tgt')?.textContent || '',
  };
};

await scenario('lantern', async rec => {
  // the Lantern Mother through three phases with the Lamplighter's Lantern and the Mourning Veil snapped off (each
  // piece shuts its moves down)
  if (stubbed('lantern-mother').length) { blocked(rec, 'the Lantern Mother is still the scaffold stand-in (P4: data/foes.js)'); return; }
  await championFight(rec, 'lantern-mother', ['lamplighters-lantern', 'mourning-veil'], 'lantern', { level: levelFor('lantern-mother') });
});

await scenario('led-away', async rec => {
  // M6: her Lead Them Down takes a hero under the water: its card says "Led away", by her, with the turns left, and it
  // is out of the line; then it comes back (let go early, or the turns run out)
  if (stubbed('lantern-mother').length) { blocked(rec, 'the Lantern Mother is still the scaffold stand-in (P4: data/foes.js)'); return; }
  const lvl = levelFor('lantern-mother');
  const led = holdAdd('Led away');
  const pick = pickFight('lantern-mother', ev => { const i = ev.findIndex(led); return i >= 0 && ev.slice(i).some(e => e.t === 'status' && e.status === 'swallowed' && e.target === ev[i].target && ['release', 'remove'].includes(e.op)); }, { levels: [lvl, lvl + 2, lvl - 2], seeds: 20 });
  check(pick, 'by the rules, no starter, level or seed has the Lantern Mother lead a hero away and let it come back');
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}`);
  const s = await open(PHONE360, `node=lantern-mother&level=${pick.level}&speed=4&auto=1&starter=${pick.starter}&seed=${pick.seed}`);
  const h = await pauseWhen(s.page, ev => ev.t === 'status' && ev.status === 'swallowed' && ev.op === 'add' && ev.label === 'Led away', 'phone360-led-away', { hurry: true, probe: heroProbe });
  check(h, 'nobody was led away (the rules said someone would be)');
  rec.shots.push(h.path);
  check(h.info.held && /^led away$/i.test(h.info.k) && /Lantern Mother/.test(h.info.by) && /^\d turns? left$/.test(h.info.t), `the led-away hero's card reads "${h.info.k} ${h.info.by} ${h.info.t}"`);
  check(/Led away/.test(h.info.aria) && /out of the line/.test(h.info.aria), `the card's label says the hero is out of the line ("${h.info.aria}")`);
  await layoutChecks(s.page, 'led-away/held');
  const back = await pauseWhen(s.page, (ev, id) => ev.t === 'status' && ev.target === id && ev.status === 'swallowed' && ['release', 'remove'].includes(ev.op), 'phone360-led-back', { hurry: true, arg: h.ev.target, probe: heroProbe });
  check(back && !back.info.held, `back in the line, the card drops "Led away" (${back?.ev.op})`);
  rec.shots.push(back.path);
  s.aftermath = await toAftermath(s.page, { timeout: 400000, hurry: true });
  const log = await logText(s.page);
  await finishCommon(rec, s);
  await s.context.close();
  check(log.some(l => /is led away by The Lantern Mother/.test(l)), 'the log says who led the hero away');
});

await scenario('leviathan', async rec => {
  // M6: the Blackwater Leviathan's Sound takes it down into the water (its plate "Dived · out of reach", its hit box no
  // target, the stage drawing its dive pose), and it breaches at its own turn; its Swallow takes a hero whole
  // ("Swallowed whole", by it)
  if (stubbed('blackwater-leviathan').length) { blocked(rec, 'the Blackwater Leviathan is still the scaffold stand-in (P4: data/foes.js)'); return; }
  const lvl = levelFor('blackwater-leviathan');
  const whole = holdAdd('Swallowed whole');
  const pick = pickFight('blackwater-leviathan', ev => ev.some(dived) && ev.some(whole), { levels: [lvl, lvl + 2, lvl + 4], seeds: 20 });
  check(pick, 'by the rules, no starter, level or seed has the Leviathan both dive and swallow a hero');
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}`);
  const diveFirst = pick.events.findIndex(dived) < pick.events.findIndex(whole);
  const s = await open(PHONE360, `node=blackwater-leviathan&level=${pick.level}&speed=4&auto=1&starter=${pick.starter}&seed=${pick.seed}`);
  const { page } = s;
  const seeDive = async () => {
    const down = await pauseWhen(page, ev => ev.t === 'status' && ev.status === 'burrowed' && ev.op === 'add', 'phone360-leviathan-dive', { hurry: true, probe: foeProbe });
    check(down, 'the Leviathan never dived (the rules said it would)');
    rec.shots.push(down.path);
    check(down.info.sunk && down.info.water && /^Dived · out of reach$/.test(down.info.state) && /\bdived, cannot be targeted/.test(down.info.aria) && !/burrowed/.test(down.info.aria), `the dived plate reads "${down.info.state}" (${down.info.aria})`);
    check(down.info.pose === 'dive', `under the water the stage draws it in its dive pose (${down.info.pose || 'none'})`);
    await layoutChecks(page, 'leviathan/dived');
    const up = await pauseWhen(page, (ev, id) => ev.t === 'status' && ev.target === id && ev.status === 'burrowed' && ev.op === 'remove', 'phone360-leviathan-up', { hurry: true, arg: down.ev.target, probe: foeProbe });
    check(up && !up.info.sunk && !up.info.state, `up again, the plate drops "Dived" (${JSON.stringify(up?.info)})`);
    check(up && up.info.pose && up.info.pose !== 'dive', `up again, it is drawn out of the water (${up?.info.pose || 'none'})`);
    if (up) rec.shots.push(up.path);
  };
  const seeSwallow = async () => {
    const sw = await pauseWhen(page, ev => ev.t === 'status' && ev.status === 'swallowed' && ev.op === 'add' && ev.label === 'Swallowed whole', 'phone360-swallowed-whole', { hurry: true, probe: heroProbe });
    check(sw, 'nobody was swallowed (the rules said someone would be)');
    rec.shots.push(sw.path);
    check(sw.info.held && /^swallowed whole$/i.test(sw.info.k) && /Blackwater Leviathan/.test(sw.info.by) && /out of the line/.test(sw.info.aria), `the swallowed hero's card reads "${sw.info.k} ${sw.info.by} ${sw.info.t}"`);
    await layoutChecks(page, 'leviathan/swallowed');
  };
  if (diveFirst) { await seeDive(); await seeSwallow(); } else { await seeSwallow(); await seeDive(); }
  s.aftermath = await toAftermath(page, { timeout: 400000, hurry: true });
  const log = await logText(page);
  await finishCommon(rec, s);
  await s.context.close();
  check(log.some(l => /The Blackwater Leviathan: Sound/.test(l)) && log.some(l => /is swallowed whole by The Blackwater Leviathan/.test(l)), 'the log has the dive and the swallow');
});

await scenario('hodge', async rec => {
  // M6: Hodge opens with Toll Is Due at the strongest hero (a CHA save, or it loses a turn); his Bridge Troll shoves a
  // hero off the bridge ("In the river", by him); at 0 HP he sits down on his stool and says so
  if (stubbed('hodge').length) { blocked(rec, 'Hodge is still the scaffold stand-in (P4: data/foes.js)'); return; }
  const river = holdAdd('In the river');
  const pick = pickFight('hodge', ev => ev.some(river) && ev.some(e => e.t === 'ko' && !isHeroId(e.target) && e.text), { levels: [16, 18, 20, 14], seeds: 20 })
    || pickFight('hodge', ev => ev.some(river), { levels: [16, 18, 20, 14, 12], seeds: 20 });
  check(pick, 'by the rules, no starter, level or seed has Hodge shove a hero off the bridge');
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}`);
  // (paused on the fight's first intent from the very start: the opening's intents roll before a test could arm a pause)
  const s = await open(PHONE360, `node=hodge&level=${pick.level}&speed=4&auto=1&starter=${pick.starter}&seed=${pick.seed}&pause=intent`);
  const { page } = s;
  // his first intent is the toll, aimed at the strongest hero
  const first = await waitPaused(page, 'phone360-hodge-toll', { probe: foeProbe });
  check(first && first.ev.move === 'toll-is-due' && /Toll Is Due/.test(first.info.intent) && /^at /.test(first.info.target), `Hodge opens with Toll Is Due at a hero ("${first?.info.intent} ${first?.info.target}")`);
  // his grip bar names the thing, not whose it is ("Toll", not "Hodge's")
  const toll = await page.evaluate(id => document.querySelector(`.bt-foe[data-id="${id}"] .bt-grip-nm`)?.textContent || '', first.ev.foe);
  check(toll === RELICS['unfair-toll'].name.split(' ').at(-1), `Hodge's grip bar reads "${toll}"`);
  rec.shots.push(first.path);
  const shove = await pauseWhen(page, ev => ev.t === 'status' && ev.status === 'swallowed' && ev.op === 'add' && ev.label === 'In the river', 'phone360-in-the-river', { hurry: true, probe: heroProbe });
  check(shove, 'nobody went into the river (the rules said someone would)');
  rec.shots.push(shove.path);
  check(shove.info.held && /^in the river$/i.test(shove.info.k) && /Hodge/.test(shove.info.by) && /out of the line/.test(shove.info.aria), `the shoved hero's card reads "${shove.info.k} ${shove.info.by} ${shove.info.t}"`);
  await layoutChecks(page, 'hodge/river');
  s.aftermath = await toAftermath(page, { timeout: 400000, hurry: true });
  const log = await logText(page);
  await finishCommon(rec, s);
  await s.context.close();
  check(log.some(l => /Hodge: Toll Is Due/.test(l)) && log.some(l => /CHA save/.test(l)), 'the log has the toll and its CHA save');
  // his opener is not rolled: the log gives it no die face (M6 review: "12: Toll Is Due" named a face never rolled)
  check(log.some(l => /Hodge readies Toll Is Due .*\(always the first move\)/.test(l)) && !log.some(l => /readies Toll Is Due .*\(d\d+ \d+\)/.test(l)), 'the log names no die face for his opener');
  check(log.some(l => /stops to count out the toll|pays it no mind|loses a turn/.test(l)) || log.some(l => /CHA save: .* saved/.test(l)), 'the log says how the toll went');
  if (s.aftermath.result.result === 'victory') check(log.some(l => /sits down on his stool/.test(l)), 'beaten, Hodge sits down on his stool (his own words on his fall)');
});

await scenario('tray', async rec => {
  // M6 review: at 360x740, a foe's hit at the Gloomfen's levels rolls 11 to 14 dice. The tray's damage row stays on
  // one line (the dice give way to "+N"), and its total ends inside the tray and inside the screen.
  if (stubbed('hodge').length) { blocked(rec, 'Hodge is still the scaffold stand-in (P4: data/foes.js)'); return; }
  const s = await open(PHONE360, 'node=hodge&level=30&speed=4&auto=1&starter=hearthbrand&seed=2');
  const { page } = s;
  const trayProbe = () => {
    const t = document.querySelector('.bt-tray'), d = document.querySelector('.bt-tray-dmg'), tot = d?.querySelector('.total');
    if (!t || t.hidden || !tot) return null;
    const tr = t.getBoundingClientRect(), dr = d.getBoundingClientRect(), br = tot.getBoundingClientRect(), line = parseFloat(getComputedStyle(d).lineHeight) || 26;
    return { chips: d.querySelectorAll('.bt-dchip').length, more: d.querySelector('.more')?.textContent || '', total: tot.textContent, trayBottom: Math.round(tr.bottom), totalBottom: Math.round(br.bottom), totalRight: Math.round(br.right), vw: innerWidth, vh: innerHeight, rowH: Math.round(dr.height), line: Math.round(line) };
  };
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const p = await pauseWhen(page, ev => ev.t === 'damage' && (ev.dice?.length || 0) >= 9, i ? null : 'phone360-tray-many-dice', { hurry: true, probe: trayProbe });
    if (!p) break;
    if (p.path) rec.shots.push(p.path);
    if (p.info) rows.push({ dice: p.ev.dice.length, ...p.info });
  }
  check(rows.length >= 2, `Hodge's side rolled too few big hits to check the tray (${rows.length})`);
  for (const r of rows) check(r.totalBottom <= Math.min(r.trayBottom, r.vh) + 1 && r.totalRight <= r.vw + 1, `${r.dice} dice: the total "${r.total}" ends inside the tray and the screen (${JSON.stringify(r)})`);
  rec.notes.push(`hits of ${rows.map(r => `${r.dice} dice (${r.chips} shown${r.more ? `, ${r.more}` : ''})`).join(', ')}`);
  check(!s.errors.length, `errors: ${s.errors.slice(0, 5).join(' | ')}`);
  await s.context.close();
});

await scenario('fen', async rec => {
  // M6: the Lanternfen's hags: a hexed hero's card says "Hexed", a rotting one's "Rotting"; a heal a rotting unit gets
  // half of says so
  if (stubbed('bog-hag').length) { blocked(rec, 'the bog-hags are still the scaffold stand-in (P4: data/foes.js)'); return; }
  const on = (st, ev) => ev.t === 'status' && ev.status === st && ev.op === 'add' && isHeroId(ev.target);
  // (a party near the hags' own level, so the fight lasts long enough for both)
  const lvl = Math.max(...ENCOUNTERS['lf-hags'].spawns.filter(sp => sp.family === 'bog-hag').map(sp => sp.level)) + 6;
  const pick = pickFight('lf-hags', ev => ev.some(e => on('hexed', e)) && ev.some(e => on('rotting', e)) && ev.some(e => e.t === 'heal' && e.rot), { levels: [lvl, lvl + 2, lvl + 4, lvl + 6], seeds: 20 })
    || pickFight('lf-hags', ev => ev.some(e => on('hexed', e)) && ev.some(e => on('rotting', e)), { levels: [lvl, lvl + 2, lvl + 4, lvl + 6], seeds: 20 });
  check(pick, 'by the rules, no starter, level or seed has the hags hex one hero and rot one');
  const rotHeal = pick.events.some(e => e.t === 'heal' && e.rot);
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}${rotHeal ? ', a heal halved by rot' : ''}`);
  const order = ['hexed', 'rotting'].sort((a, b) => pick.events.findIndex(e => on(a, e)) - pick.events.findIndex(e => on(b, e)));
  const s = await open(LAPTOP, `node=lf-hags&level=${pick.level}&speed=4&auto=1&starter=${pick.starter}&seed=${pick.seed}`);
  const { page } = s;
  for (const st of order) {
    const p = await pauseWhen(page, (ev, x) => ev.t === 'status' && ev.status === x && ev.op === 'add' && ['warden', 'pip', 'bryn', 'alondra'].includes(ev.target), `laptop-${st}`, { hurry: true, arg: st, probe: heroProbe });
    check(p, `nobody was ${st} (the rules said someone would be)`);
    rec.shots.push(p.path);
    const word = st === 'hexed' ? 'Hexed' : 'Rotting';
    const cls = await page.evaluate(([id, c]) => document.querySelector(`.bt-hero[data-id="${id}"]`)?.classList.contains(c), [p.ev.target, st]);
    check(p.info.tag.includes(word) && cls && new RegExp(st === 'hexed' ? 'hexed: its rolls at a disadvantage' : 'rotting.*heals halved').test(p.info.aria), `the ${st} hero's card says "${word}" (${p.info.tag}; ${p.info.aria})`);
    // M6 review: the word pops in over the figure, and no float covers it; the label names it once
    check(p.info.pops.includes(st) && !p.info.floats.some(t => t.toLowerCase() === st), `"${word}" pops in, with no float over it (pops ${JSON.stringify(p.info.pops)}; floats ${JSON.stringify(p.info.floats)})`);
    check((p.info.aria.match(new RegExp(`\\b${st}\\b`, 'g')) || []).length === 1, `the card's label names ${st} once ("${p.info.aria}")`);
    await layoutChecks(page, `fen/${st}`);
  }
  if (rotHeal) {
    const hl = await pauseWhen(page, ev => ev.t === 'heal' && ev.rot, 'laptop-rot-heal', { hurry: true, probe: () => [...document.querySelectorAll('.bt-float.heal.rot small')].map(e => e.textContent) });
    check(hl && hl.info.some(t => /halved by rot/i.test(t)), `a heal a rotting unit gets says it was halved (${JSON.stringify(hl?.info)})`);
    if (hl) rec.shots.push(hl.path);
  }
  s.aftermath = await toAftermath(page, { timeout: 400000, hurry: true });
  const log = await logText(page);
  await finishCommon(rec, s);
  await s.context.close();
  check(log.some(l => / is Hexed/.test(l)) && log.some(l => / is Rotting/.test(l)), 'the log has the hex and the rot');
  if (rotHeal) check(log.some(l => /\(halved by rot\)/.test(l)), 'the log says a heal was halved by rot');
});

// ---- M7 (spec §8): the Hollow Council and the Unsmith, in the game itself ------------------------------------------
// The Act III fights run in the built game (AETH_HTML, else dist/aethermoor.html, built first unless --no-build),
// started through its test seam (window.__aethTest: app.setGame, then app.go('battle')) with a battle the rules make
// here from a levelled party, and paused with the harness's hooks (globalThis.__btHooks). A family that is still the
// scaffold's stand-in (FOES[f].stub) is patched to the tier the real family has: a hollow foe's +4; the Unsmith's two
// dice and the relics he takes (from the start, as the stand-in's phases do not steal). The page plays the same fight
// the rules played here (the same state, and Auto's commands), so a moment the check needs is found here first. What
// only the real family can show (the gift snapped and its +4 gone; the stolen event) reports BLOCKED.
let gameFile = null;
function builtGame() {
  if (gameFile) return gameFile;
  if (!args['no-build'] && !process.env.AETH_HTML) execSync('npm run build', { cwd: root, stdio: 'inherit' });
  gameFile = process.env.AETH_HTML ? path.resolve(process.env.AETH_HTML) : path.join(root, 'dist/aethermoor.html');
  check(existsSync(gameFile), `no built game at ${gameFile}`);
  return gameFile;
}

// (in the page, before the game boots) the app handle, the aftermath hand-off, the pause hooks, 4x speed, no sound
function builtInit() {
  try { localStorage.setItem('aethermoor.settings.v1', JSON.stringify({ sound: false, music: false, battleSpeed: 4, reducedMotion: false })); } catch { /* storage blocked */ }
  window.__aethTest = app => {
    window.__app = app;
    const go = app.go;
    app.go = (name, p = {}) => {
      if (name === 'aftermath') window.__aftermath = { result: p.result, returnTo: p.returnTo, ended: !!p.battle?.ended };
      return go(name, p);
    };
  };
  window.__btPauseOn = new Set();
  window.__btPaused = null;
  window.__btLog = [];
  let release = null;
  window.__btResume = () => { window.__btPaused = null; if (release) { const r = release; release = null; r(); } };
  globalThis.__btHooks = {
    log(line) { window.__btLog.push(line.text); },
    peak(ev) {
      if (window.__btPauseWhen && window.__btPauseWhen(ev)) { window.__btPauseWhen = null; window.__btPauseOn.add(ev.t); }
      if (!window.__btPauseOn.has(ev.t)) return null;
      window.__btPauseOn.delete(ev.t);
      window.__btPaused = ev.t;
      window.__btPausedEvent = ev;
      return new Promise(r => { release = r; });
    },
  };
}
async function openGame(viewport) {
  const s = await newPage(viewport, builtInit);
  await s.page.goto(pathToFileURL(builtGame()).href);
  await s.page.waitForFunction(() => !!window.__app, null, { timeout: 60000 });
  return s;
}
// the fight, handed to the game's battle screen (Auto on, unless the check has something to do at a hero's turn first)
async function fightIn(s, game, battle, { auto = true } = {}) {
  await s.page.evaluate(([g, b]) => { window.__app.setGame(g); window.__app.go('battle', { battle: b, returnTo: 'world' }); }, [game, battle]);
  await s.page.waitForSelector('.bt-stage canvas', { timeout: 30000 });
  await s.page.waitForSelector('.bt-auto', { timeout: 10000 });
  if (auto && (await s.page.getAttribute('.bt-auto', 'aria-pressed')) !== 'true') await s.page.click('.bt-auto');
}
// pause on the next event pred picks and read the page, leaving it paused (the caller names its shot, then resumes)
async function catchNext(page, pred, { arg = null, probe = null, timeout = 400000 } = {}) {
  await armPause(page, pred, arg);
  const stop = await startHurry(page);
  try { await page.waitForFunction(() => window.__btPaused || window.__aftermath, null, { timeout, polling: 50 }); } finally { await stop(); }
  if (!(await page.evaluate(() => window.__btPaused))) { await page.evaluate(() => { window.__btPauseWhen = null; }); return null; }
  await page.waitForTimeout(80);
  const ev = await page.evaluate(() => window.__btPausedEvent);
  return { ev, info: probe ? await page.evaluate(probe, ev) : null };
}
const resume = page => page.evaluate(() => window.__btResume());

// the fight's lead foe (the Council member, the Unsmith: the family named, else the first foe), and its guest
const bossOf = (b, fam = null) => { const foes = b.order.map(id => b.units[id]).filter(u => u.side === 'foe'); return foes.find(u => u.family === fam) || foes[0]; };
const guestOf = b => b.order.map(id => b.units[id]).find(u => u.side === 'ally') || null;
// the scaffold's stand-in, patched to the hollow tier: its opening intent rolled again as the tier rolls it
function asHollow(b, game, fam) {
  const f = bossOf(b, fam);
  f.tier = 'hollow';
  if (f.intent?.face == null) return; // an opener is not rolled
  f.intent = rollIntent(b, f, createRng(`m7-hollow:${f.id}`));
  const at = b.openingEvents.findIndex(e => e.t === 'intent' && e.foe === f.id);
  if (at >= 0) b.openingEvents[at] = intentEvent(f);
}
// ... and to the Unsmith's: two dice (the second rolled as the tier rolls it), and the relics this game never claimed
function asUnsmith(b, game, fam) {
  const f = bossOf(b, fam);
  f.tier = 'unsmith';
  f.dice = 2;
  if (f.intent) f.intent = { ...f.intent, slot: 0 };
  f.intent2 = rollIntent(b, f, createRng(`m7-unsmith:${f.id}`), 1);
  const at = b.openingEvents.findIndex(e => e.t === 'intent' && e.foe === f.id);
  if (at >= 0) b.openingEvents.splice(at, 1, intentEvent(f), intentEvent(f, f.intent2));
  const ids = stolenFor(game);
  f.stolen = { ids, moves: stolenMoves(ids) };
}
// a fight the rules play here: a party levelled as the harness levels it, the encounter, the stand-in patched
function m7Fight(node, { starter, level, seed }, patch) {
  const { game, battle } = startBattle(levelled(newGame({ name: 'Wren', starter, seed }), level, seed), { nodeId: node });
  if (patch) patch(battle, game);
  let st = structuredClone(battle);
  const events = [...(st.openingEvents || [])];
  for (let i = 0; i < 3000 && current(st); i++) {
    const id = current(st);
    const r = st.units[id].side === 'hero' ? act(st, autoCommand(st, id)) : foeTurn(st);
    events.push(...r.events);
    st = r.state;
  }
  return { game, battle, events, end: st };
}
function m7Pick(node, want, patch, { starters = ['cairnmaul', 'hearthbrand', 'stillwater-lance'], levels, seeds = 12 } = {}) {
  for (const starter of starters) for (const level of levels) for (let seed = 1; seed <= seeds; seed++) {
    let f;
    try { f = m7Fight(node, { starter, level, seed }, patch); } catch { continue; }
    if (want(f.events, f.end, f.battle)) return { starter, level, seed, ...f };
  }
  return null;
}
// what the page shows of the lead foe (window.__m7boss) and the guest (window.__m7guest) while paused
const m7Probe = () => {
  const box = document.querySelector(`.bt-foe[data-id="${window.__m7boss}"]`);
  const q = sel => box?.querySelector(sel) || null;
  const shown = sel => !!q(sel) && !q(sel).hidden;
  const rect = e => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
  const gcard = window.__m7guest ? document.querySelector(`.bt-hero.bt-guest[data-id="${window.__m7guest}"]`) : null;
  const ban = document.querySelector('.bt-move-ban'), big = document.querySelector('.bt-big-ban');
  return {
    bonus1: shown('.bt-intent > .bt-int-txt .bt-int-bonus') ? q('.bt-intent > .bt-int-txt .bt-int-bonus').textContent : '',
    name1: q('.bt-intent > .bt-int-txt .bt-int-name')?.textContent || '',
    two: shown('.bt-int-two') && !!q('.bt-intent')?.classList.contains('two-dice'),
    name2: shown('.bt-int-two') ? q('.bt-int-two .bt-int-name')?.textContent || '' : '',
    played1: !!q('.bt-intent')?.classList.contains('played'), played2: !!q('.bt-int-two')?.classList.contains('played'),
    aria: q('.bt-foe-hit')?.getAttribute('aria-label') || '',
    stolen: shown('.bt-stolen') ? [...box.querySelectorAll('.bt-stolen-i')].map(i => i.dataset.relic) : [],
    guest: gcard ? { ...rect(gcard), aria: gcard.getAttribute('aria-label') || '', tag: gcard.querySelector('.bt-hero-tag')?.textContent || '', move: gcard.querySelector('.bt-guest-mv')?.textContent || '' } : null,
    cards: [...document.querySelectorAll('.bt-party .bt-hero')].map(rect),
    hasGuest: !!document.querySelector('.bt.has-guest'),
    ban: ban && !ban.hidden ? { side: ban.dataset.side || '', text: ban.textContent } : null,
    big: big && !big.hidden ? big.textContent : '',
    cmdsHidden: !!document.querySelector('.bt-cmds')?.hidden,
    vw: innerWidth, scrollW: document.documentElement.scrollWidth,
  };
};

await scenario('hollow', async rec => {
  // a Hollow Council member at 360x740: her die reads "d20 +4" (the natural roll, the +4, the face that picks the move)
  // while the gift holds; the gift snapped off, the +4 is gone; beaten, she is freed (her own words on her fall)
  const node = 'hollow-miravel', fam = ENCOUNTERS[node].spawns[0].family;
  const stand = stubbed(fam).length > 0 || FOES[fam].tier !== 'hollow';
  const gift = stand ? null : FOES[fam].bonusWhile || null;
  const lvl = levelFor(node);
  const pick = m7Pick(node, (ev, end) => {
    const id = bossOf(end, fam).id;
    if (end.ended?.result !== 'victory' || !ev.some(e => e.t === 'ko' && e.target === id && e.text) || !ev.some(e => e.t === 'intent' && e.foe === id && e.bonus)) return false;
    if (!gift) return true;
    const snap = ev.findIndex(e => e.t === 'disarm' && e.target === id && e.relic === gift);
    return snap >= 0 && ev.slice(snap).some(e => e.t === 'intent' && e.foe === id && e.face != null && !e.bonus);
  }, stand ? (b, g) => asHollow(b, g, fam) : null, { levels: [lvl, lvl + 2, lvl + 4] });
  check(pick, `by the rules, no starter, level or seed has ${FOES[fam].name} beaten${gift ? ', her gift snapped off first' : ''}`);
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}${stand ? '; the stand-in patched to the hollow tier' : ''}`);
  const id = bossOf(pick.battle, fam).id;
  const s = await openGame(PHONE360);
  const { page } = s;
  await page.evaluate(i => { window.__m7boss = i; window.__m7guest = null; }, id);
  await armPause(page, (ev, i) => ev.t === 'intent' && ev.foe === i && !!ev.bonus, id);
  await fightIn(s, pick.game, pick.battle);
  const first = await waitPaused(page, 'phone360-hollow-d20-plus4', { probe: m7Probe });
  check(first, 'her die never showed its +4 (the rules said it would)');
  rec.shots.push(first.path);
  const it = first.ev;
  check(it.die === 20 && it.bonus === 4 && it.face === Math.min(20, it.natural + 4), `her intent is a d20 +4 (${it.natural} +${it.bonus} = ${it.face})`);
  check(first.info.bonus1 === `+4 = ${it.face}`, `beside her move the bubble reads "+4 = ${it.face}" ("${first.info.bonus1}")`);
  check(first.info.aria.includes(`(d20 ${it.natural} +4 = ${it.face})`), `her label reads the roll ("${first.info.aria}")`);
  await layoutChecks(page, 'hollow/d20 +4');
  if (gift) {
    const snap = await pauseWhen(page, (ev, [i, g]) => ev.t === 'disarm' && ev.target === i && ev.relic === g, 'phone360-hollow-gift-snapped', { hurry: true, arg: [id, gift] });
    check(snap, `her gift (${RELICS[gift]?.name || gift}) never came loose (the rules said it would)`);
    rec.shots.push(snap.path);
    const after = await pauseWhen(page, (ev, i) => ev.t === 'intent' && ev.foe === i && ev.face != null, 'phone360-hollow-plus4-gone', { hurry: true, arg: id, probe: m7Probe });
    check(after && !after.ev.bonus && !after.info.bonus1 && !/\+4/.test(after.info.aria), `with the gift gone her die rolls without the +4 (${after ? `d${after.ev.die} ${after.ev.face}, "${after.info.bonus1}"` : 'no intent'})`);
    rec.shots.push(after.path);
  } else blocked(rec, `${FOES[fam].name} is still the scaffold's stand-in (no gift named, bonusWhile): the gift snapped and the +4 gone wait for P4's family`);
  s.aftermath = await toAftermath(page, { timeout: 400000, hurry: true });
  const log = await logText(page);
  await finishCommon(rec, s, { expect: ['victory'] });
  await s.context.close();
  check(log.some(l => /readies .* \(d20 \d+ \+4 = \d+\)$/.test(l)), 'the log names her natural roll and the +4');
  check(!!FOES[fam].koText && log.includes(FOES[fam].koText), `beaten, she is freed, in her own words ("${FOES[fam].koText || ''}")`);
});

await scenario('unsmith', async rec => {
  // the Unsmith at 360x740, through three phases: his two dice (two intents on his plate and in Analyze, two moves a
  // turn, each named by its die), his Stolen Arts (his plate, Analyze, the stolen event as his phase takes them), and
  // Tamsin beside the party: her card with theirs (no horizontal scroll), tappable for her details, taking no command,
  // with a move banner of her own
  const node = 'unsmith', fam = ENCOUNTERS[node].spawns.find(sp => sp.family === 'unsmith')?.family || ENCOUNTERS[node].spawns[0].family;
  const stand = stubbed(fam).length > 0 || FOES[fam].tier !== 'unsmith';
  const steals = !stand && (FOES[fam].phases || []).some(p => p.steals);
  const lvl = levelFor(node);
  const pick = m7Pick(node, (ev, end, start) => {
    const id = bossOf(end, fam).id, g = guestOf(start)?.id;
    const firstHero = ev.findIndex(e => e.t === 'turn' && isHeroId(e.actor));
    const ph = n => ev.findIndex(e => e.t === 'phase' && e.foe === id && e.phase === n);
    return end.ended?.result === 'victory' && !!g && firstHero >= 0 && ph(2) > firstHero && ph(3) > ph(2)
      && ev.some(e => e.t === 'move' && e.actor === id && e.slot === 1) && ev.slice(firstHero).some(e => e.t === 'move' && e.actor === g)
      && (!steals || ev.some(e => e.t === 'stolen' && e.foe === id));
  }, stand ? (b, g) => asUnsmith(b, g, fam) : null, { levels: [lvl, lvl + 2, lvl + 4, lvl + 6] });
  check(pick, 'by the rules, no starter, level or seed takes the Unsmith through three phases, with Tamsin beside the party, to a win');
  rec.notes.push(`${pick.starter}, level ${pick.level}, seed ${pick.seed}${stand ? '; the stand-in patched to two dice and the relics he takes' : ''}`);
  const b = pick.battle, id = bossOf(b, fam).id, guest = guestOf(b);
  const took = stand ? b.units[id].stolen.ids : [];
  const s = await openGame(PHONE360);
  const { page } = s;
  await page.evaluate(([i, g]) => { window.__m7boss = i; window.__m7guest = g; }, [id, guest.id]);
  // the opening rolls both of his dice
  await armPause(page, (ev, i) => ev.t === 'intent' && ev.foe === i && ev.slot === 1, id);
  await fightIn(s, pick.game, b, { auto: false });
  const two = await waitPaused(page, 'phone360-unsmith-two-dice', { probe: m7Probe });
  check(two, 'his second die never rolled');
  rec.shots.push(two.path);
  const I = two.info;
  check(I.two && I.name1 && I.name2, `his plate shows two intents ("${I.name1}", then "${I.name2}")`);
  check(/, then /.test(I.aria), `his label reads both ("${I.aria}")`);
  check(JSON.stringify(I.stolen) === JSON.stringify(took), `his plate shows ${took.length ? `the ${took.length} relics he took` : 'nothing stolen before his phase takes it'} (${I.stolen.join(', ') || 'none'})`);
  // Tamsin: her card with the party's four, all on the screen, 44 px, saying she fights beside you
  check(I.hasGuest && I.guest && I.cards.length === 5, `her card stands with the party's four (${I.cards.length} cards)`);
  check(I.cards.every(c => c.l >= -1 && c.r <= I.vw + 1) && I.scrollW <= I.vw, `every card is on the screen at ${I.vw} px, no horizontal scroll (${I.cards.map(c => `${c.l}..${c.r}`).join(' ')}; ${I.scrollW})`);
  check(I.guest.w >= 44 && I.guest.h >= 44, `her card is a 44 px target (${I.guest.w}x${I.guest.h})`);
  check(/fighting beside you/.test(I.guest.aria) && /takes no command/.test(I.guest.aria) && /Guest/.test(I.guest.tag), `her card says who she is ("${I.guest.aria}"; "${I.guest.tag}")`);
  await layoutChecks(page, 'unsmith/opening');
  // at the first hero's turn (Auto still off): Analyze him, then tap her card for her details
  await page.waitForSelector('.bt-cmds:not([hidden]) .bt-cmd', { timeout: 60000 });
  await page.click(`.bt-foe[data-id="${id}"] .bt-foe-hit`);
  await page.waitForSelector('.bt-inspect', { timeout: 10000 });
  await page.waitForTimeout(250);
  const ana = await page.evaluate(() => ({ intents: [...document.querySelectorAll('.bt-inspect .bt-ins-intent')].map(p => p.textContent), second: !!document.querySelector('.bt-inspect .bt-ins-intent.second'), stolen: [...document.querySelectorAll('.bt-inspect .bt-ins-stolen')].map(p => p.dataset.relic), text: document.querySelector('.bt-inspect')?.textContent || '' }));
  rec.shots.push(await shot(page, 'phone360-unsmith-analyze'));
  check(ana.second && ana.intents.length >= 2 && /Two dice/.test(ana.text), `Analyze gives both of his intents (${ana.intents.join(' | ')})`);
  check(JSON.stringify(ana.stolen) === JSON.stringify(took) && (!took.length || ana.text.includes(`Stolen Arts · ${took.length}`)), `Analyze lists his Stolen Arts (${ana.stolen.length})`);
  await page.click('.bt-inspect .bt-ins-foot .btn');
  await page.waitForSelector('.bt-inspect', { state: 'detached', timeout: 10000 });
  await page.click(`.bt-hero.bt-guest[data-id="${guest.id}"]`);
  await page.waitForSelector('.bt-inspect', { timeout: 10000 });
  await page.waitForTimeout(250);
  const her = await page.evaluate(() => ({ label: document.querySelector('.bt-inspect')?.getAttribute('aria-label') || '', text: document.querySelector('.bt-inspect')?.textContent || '', scrollW: document.documentElement.scrollWidth, vw: innerWidth }));
  rec.shots.push(await shot(page, 'phone360-tamsin-details'));
  check(new RegExp(guest.name.split(' ')[0]).test(her.label) && /She fights beside you/.test(her.text) && /takes no command/.test(her.text), `tapping her card opens her details ("${her.label}")`);
  check(her.scrollW <= her.vw, `her details fit the screen (${her.scrollW} <= ${her.vw})`);
  await page.click('.bt-inspect .bt-ins-foot .btn');
  await page.waitForSelector('.bt-inspect', { state: 'detached', timeout: 10000 });
  await page.click('.bt-auto');
  // then, as they come: her move, his second die's move, his second and third phases, and what he takes
  const seen = { guest: false, slot1: false, p2: false, p3: false, stolen: !steals };
  for (let n = 0; n < 12 && Object.values(seen).some(v => !v); n++) {
    const c = await catchNext(page, (ev, [i, g, sn]) => (!sn.guest && ev.t === 'move' && ev.actor === g) || (!sn.slot1 && ev.t === 'move' && ev.actor === i && ev.slot === 1)
      || (ev.t === 'phase' && ev.foe === i && ((ev.phase === 2 && !sn.p2) || (ev.phase === 3 && !sn.p3))) || (!sn.stolen && ev.t === 'stolen' && ev.foe === i), { arg: [id, guest.id, seen], probe: m7Probe });
    if (!c) break;
    const { ev, info } = c;
    if (ev.t === 'move' && ev.actor === guest.id) {
      seen.guest = true;
      rec.shots.push(await shot(page, 'phone360-tamsin-move'));
      check(info.ban?.side === 'guest' && info.ban.text.includes(ev.name) && /beside you/.test(info.ban.text), `her move has a banner of her own (data-side "${info.ban?.side}": "${info.ban?.text}")`);
      check(info.cmdsHidden, 'she takes no command: no command menu on her turn');
    } else if (ev.t === 'move') {
      seen.slot1 = true;
      rec.shots.push(await shot(page, 'phone360-unsmith-die2'));
      check(info.ban?.side === 'foe' && /die 2 of 2/.test(info.ban.text), `his second move names its die ("${info.ban?.text}")`);
      check(info.played1 && info.played2, `both of his dice read as played (${info.played1}, ${info.played2})`);
    } else if (ev.t === 'phase') {
      seen[`p${ev.phase}`] = true;
      rec.shots.push(await shot(page, `phone360-unsmith-phase${ev.phase}`));
      await layoutChecks(page, `unsmith/phase ${ev.phase}`);
    } else {
      seen.stolen = true;
      rec.shots.push(await shot(page, 'phone360-unsmith-stolen'));
      const k = (ev.relics || []).length;
      check(info.big.includes(k ? 'He takes what you never claimed' : 'Nothing left to take'), `his banner says what he took ("${info.big}")`);
      check(JSON.stringify(info.stolen) === JSON.stringify(ev.relics || []), `his plate shows the ${k} relics he took (${info.stolen.length})`);
    }
    await resume(page);
  }
  check(seen.guest, 'Tamsin never moved on her own (the rules said she would)');
  check(seen.slot1, 'his second die never played (the rules said it would)');
  check(seen.p2 && seen.p3, `the fight never reached his third phase (phases seen: ${[2, 3].filter(p => seen[`p${p}`]).join(', ') || 'none'})`);
  if (steals) check(seen.stolen, 'he never took up his Stolen Arts (the rules said he would)');
  else blocked(rec, 'the Unsmith is still the scaffold\'s stand-in, whose phases do not steal: the stolen event (his banner as he takes them) waits for P4\'s family (his Stolen Arts on his plate and in Analyze are checked on the patched state)');
  s.aftermath = await toAftermath(page, { timeout: 400000, hurry: true });
  const log = await logText(page);
  await finishCommon(rec, s, { expect: ['victory'] });
  await s.context.close();
  check(log.some(l => /, die 1 of 2\)$/.test(l)) && log.some(l => /, die 2 of 2\)$/.test(l)), 'the log names each of his two dice');
  check(log.some(l => l.startsWith(`${guest.name}: `)), `the log has her moves ("${guest.name}: ...")`);
  if (steals) check(log.some(l => /takes up what you never claimed|reaches for the relics you left behind/.test(l)), 'the log says what he took');
});

// ---- laptop ------------------------------------------------------------------------------------------

await scenario('laptop-keys', async rec => {
  const s = await open(LAPTOP, 'node=camp&level=4&speed=2');
  const { page } = s;
  await page.waitForSelector('.bt-cmds:not([hidden]) .bt-cmd', { timeout: 30000 });
  await layoutChecks(page, 'laptop/commands');
  rec.shots.push(await shot(page, 'laptop-commands'));
  await page.keyboard.press('Digit2');
  await page.waitForSelector('.bt-sub:not([hidden])');
  rec.shots.push(await shot(page, 'laptop-skills'));
  await page.keyboard.press('Escape');
  await page.waitForSelector('.bt-cmds:not([hidden])');
  await page.keyboard.press('Digit1');
  await page.waitForSelector('.bt-aim:not([hidden])');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  rec.shots.push(await shot(page, 'laptop-target'));
  await page.evaluate(() => window.__btPauseOn.add('roll'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__btPaused === 'roll', null, { timeout: 20000 });
  rec.shots.push(await shot(page, 'laptop-roll'));
  await page.evaluate(() => window.__btResume());
  await page.keyboard.press('KeyF'); // 2x -> 4x
  await page.click('.bt-auto');
  const d = await pauseOn(page, 'damage', 'laptop-damage', { timeout: 60000 });
  if (!d) rec.notes.push('no damage captured');
  s.aftermath = await toAftermath(page, { timeout: 300000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('laptop-boss', async rec => {
  const s = await open(LAPTOP, 'node=briarmaw&level=9&speed=4&auto=1&surge=100&seed=3&pause=legend');
  const lg = await pauseOn(s.page, 'legend', 'laptop-legend', { timeout: 60000 });
  check(lg, 'no Legend Surge fired');
  await layoutChecks(s.page, 'laptop/boss');
  const p2 = await pauseOn(s.page, 'phase', 'laptop-phase2', { timeout: 400000, hurry: true });
  check(p2, 'no phase 2');
  const dz = await pauseOn(s.page, 'disarm', 'laptop-disarm', { timeout: 400000, hurry: true });
  if (dz) rec.notes.push(`disarmed ${dz.ev.relic}`);
  s.aftermath = await toAftermath(s.page, { timeout: 400000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await scenario('laptop-snag', async rec => {
  const s = await open(LAPTOP, 'node=oldsnag&level=6&speed=4&auto=1&seed=8&pause=intent');
  await s.page.waitForSelector('.bt-foe:not([hidden])', { timeout: 20000 });
  await pauseOn(s.page, 'intent', 'laptop-snag', { timeout: 60000 });
  s.aftermath = await toAftermath(s.page, { timeout: 300000, hurry: true });
  await finishCommon(rec, s);
  await s.context.close();
});

await browser.close();
console.log(`\n${results.filter(r => r.ok).length}/${results.length} scenarios passed${blockedList.length ? `, ${blockedList.length} blocked` : ''}`);
for (const r of results) for (const p of r.shots) console.log('  ' + path.relative(root, p));
if (blockedList.length) console.log('\nBlocked on other packages:\n  ' + blockedList.join('\n  '));
if (failures.length) { console.log('\nFailures:\n  ' + failures.join('\n  ')); process.exit(1); }
// M5 is whole (no stand-ins are left), so a blocked scenario is one that did not run: it fails the run
if (blockedList.length) process.exit(1);
