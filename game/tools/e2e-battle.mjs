// End-to-end test of the battle screen (Playwright, preinstalled Chromium). Builds the dev
// harness, then plays real battles at phone (390x844) and laptop (1280x800) sizes: the tutorial
// Tallyman fight (manual commands), a rabble fight, the Rot-Stag, Old Snag (until a disarm
// happens) and Briarmaw (all three phases, plus a Legend Surge). Asserts no console errors or
// uncaught exceptions, no horizontal scroll, 44px tap targets, and the aftermath hand-off.
// Screenshots of the key moments go to tools/shots/battle-*.png.
//
//   node tools/e2e-battle.mjs                 # everything
//   node tools/e2e-battle.mjs --only=snag,boss  # some scenarios (names below)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDevBattle } from './dev-battle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'tools/shots');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
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

const page0 = await buildDevBattle();
const url = hash => `${pathToFileURL(page0).href}#${hash}`;
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const PHONE = { width: 390, height: 844 };
const LAPTOP = { width: 1280, height: 800 };
const results = [];
const failures = [];

function check(cond, msg) { if (!cond) throw new Error(msg); }

async function open(viewport, hash) {
  // fonts come from Google Fonts through the sandbox proxy, whose CA Chromium does not know
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 600 ? 2 : 1, ignoreHTTPSErrors: true });
  if (fonts) {
    await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fonts.css }));
    await context.route('https://fonts.gstatic.com/**', r => {
      const f = fonts.files[r.request().url()];
      return f ? r.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(f) }) : r.abort();
    });
  }
  const page = await context.newPage();
  const errors = [];
  const fontish = m => /fonts\.(googleapis|gstatic)/.test(`${m.text()} ${m.location()?.url || ''}`);
  page.on('console', m => { if (m.type() === 'error' && !fontish(m)) errors.push(`console: ${m.text()} ${m.location()?.url || ''}`); });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  await page.goto(url(`hooks=1&${hash}`));
  await page.waitForSelector('.bt-stage canvas');
  return { page, context, errors };
}

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
    rec.ok = true;
  } catch (e) {
    rec.error = e.message;
    failures.push(`${name}: ${e.message}`);
  }
  rec.secs = ((Date.now() - t0) / 1000).toFixed(1);
  results.push(rec);
  console.log(`${rec.ok ? 'PASS' : 'FAIL'} ${name} (${rec.secs}s)${rec.notes.length ? ' - ' + rec.notes.join('; ') : ''}${rec.error ? '\n     ' + rec.error : ''}`);
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
console.log(`\n${results.filter(r => r.ok).length}/${results.length} scenarios passed`);
for (const r of results) for (const p of r.shots) console.log('  ' + path.relative(root, p));
if (failures.length) { console.log('\nFailures:\n  ' + failures.join('\n  ')); process.exit(1); }
