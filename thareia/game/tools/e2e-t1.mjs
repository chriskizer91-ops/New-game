// Thareia T1 end-to-end: the Prologue in Chromium at phone size (390 x 844), with a screenshot of every step.
//   node tools/e2e-t1.mjs [--out=tools/shots/t1] [--laptop]
// Title -> new game -> the docks -> the town (the Sedrin crossing, the board) -> hired by Yara -> the crate -> both
// fights on Auto -> the shard -> the skiff -> the flight (steered, then the world map's auto-flight) -> Thornhollow and
// the Prologue's card. Fails on any page error or console error.
// --ticket: the early route (board with the passage ticket at once, no town and no fights), to the same landing and card.
// T2: the skiff lands on th-landing (the field outside Thornhollow's south gate); the card must show, and the HUD's
// objective must be Chapter 1's first ("Stop the thieves at the crate.").
// --fixture=<path>: write the game at the end (on the landing, the card closed) as JSON: the T2 e2e starts from it
// (tools/fixtures/t2-start.json from the fight route, t2-start-early.json from --ticket).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = path.resolve(root, args.out || 'tools/shots/t1'); mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const vp = args.laptop ? { width: 1280, height: 800 } : { width: 390, height: 844 };
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: args.laptop ? 1 : 2, hasTouch: !args.laptop });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts.g/.test(m.text())) errors.push('console: ' + m.text()); });
await page.addInitScript(() => { globalThis.__aethTest = app => { window.__app = app; }; });
await page.goto(pathToFileURL(path.join(root, 'dist/thareia.html')).href);
let n = 0;
const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, `${String(++n).padStart(2, '0')}-${name}.png`) }); };
const click = async (sel, o = {}) => { await page.locator(sel).first().click(o); await page.waitForTimeout(250); };
const clickText = async (text) => { await page.getByRole('button', { name: text }).first().click(); await page.waitForTimeout(250); };
const ovOpen = () => page.evaluate(() => !!document.querySelector('.ov'));
// talk through an open dialogue: pick the first of `picks` offered, else advance
async function talk(picks = [], { max = 40, stopAt = null } = {}) {
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(260);
    if (!await ovOpen()) return;
    if (stopAt && await page.locator(stopAt).count()) return;
    const choices = await page.locator('.ov .dlg-choice:not([disabled])').allInnerTexts();
    const want = picks.find(p => choices.some(c => c.includes(p)));
    if (want) { await page.locator('.ov .dlg-choice', { hasText: want }).first().click(); picks = picks.filter(p => p !== want); continue; }
    const go = page.locator('.ov .story-go, .ov .btn.primary');
    if (await go.count()) { await go.first().click(); continue; }
    await page.keyboard.press('Enter');
  }
}
const W = (fn, ...a) => page.evaluate(([f, a]) => window.__world[f](...a), [fn, a]);
async function fightOnAuto(name) {
  await page.waitForSelector('.screen-battle', { timeout: 15000 });
  await shot(name);
  const auto = page.getByRole('button', { name: /auto/i });
  if (await auto.count()) await auto.first().click();
  for (let i = 0; i < 240 && await page.locator('.screen-battle').count(); i++) {
    await page.waitForTimeout(500);
    const cont = page.locator('.screen-aftermath .btn.primary, .screen-battle .bt-end .btn.primary');
    if (await cont.count()) break;
  }
  await page.waitForSelector('.screen-aftermath', { timeout: 60000 }).catch(() => {});
  await shot(name + '-after');
  for (let i = 0; i < 80 && !(await page.locator('.screen-world').count()); i++) {
    const ov = page.locator('.ov button', { hasText: /Keep it|Onward|Walk on|Continue|Done|Close/ });
    const b = page.locator('.screen-aftermath .btn.primary');
    if (await page.locator('.ov').count()) { if (await ov.count()) await ov.first().click({ timeout: 2000 }).catch(() => {}); else await page.keyboard.press('Escape'); }
    else if (await b.count()) await b.first().click({ timeout: 2000 }).catch(() => {});
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    if (i === 10) await shot('chests');
  }
  await page.waitForSelector('.screen-world', { timeout: 15000 });
}

// ---- title and a new game ----
await shot('title');
await clickText(/New game/);
await page.fill('#wname', 'Wren'); await shot('name'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
await shot('look'); await clickText(/Next/);
await clickText(/standard array/); await shot('abilities'); await clickText(/Next: what you carry/);
await shot('carry'); await click('.starter .take'); await shot('carry-chosen'); await clickText(/Begin/);
for (let i = 0; i < 4; i++) { await shot('prologue-' + i); await click('.prologue .btn.primary'); }
await page.waitForSelector('.screen-world', { timeout: 15000 });
await page.waitForTimeout(800);
await shot('docks-intro');
await talk();
await shot('docks');

if (!args.ticket) {
// ---- the town: the Sedrin crossing, the board ----
await W('teleport', 'bogmire-docks', 24, 1, 'n'); await page.waitForTimeout(300);
await W('step', 'n', 1); await page.waitForTimeout(1200); await talk();
await shot('town');
await W('teleport', 'th-bogmire', 21, 13, 'n'); await page.waitForTimeout(600);
await W('step', 'n', 1); await page.waitForTimeout(600); await shot('sedrin'); await talk();
await W('teleport', 'th-bogmire', 21, 9, 'e'); await page.waitForTimeout(400); await W('interact'); await page.waitForTimeout(400); await shot('board'); await talk();

// ---- hired, the crate, both fights ----
await W('teleport', 'bogmire-docks', 26, 13, 'n'); await page.waitForTimeout(500);
await W('face', 'n'); await W('interact'); await page.waitForTimeout(400); await shot('yara'); await talk(['I can lift.']);
await page.waitForTimeout(500); await shot('yara-joined');
await W('teleport', 'bogmire-docks', 27, 13, 'e'); await page.waitForTimeout(400); await W('interact'); await page.waitForTimeout(400);
await shot('crate'); await talk(['Lift it']);
await page.waitForTimeout(400); await shot('cut'); await talk();
for (let i = 0; i < 6 && !(await page.locator('.screen-battle').count()); i++) { await talk(); const f = page.getByRole('button', { name: /^Fight/ }); if (await f.count()) await f.first().click(); await page.waitForTimeout(400); }
await fightOnAuto('fight-lurkers');
await page.waitForTimeout(800); await shot('after-lurkers'); await talk();
for (let i = 0; i < 6 && !(await page.locator('.screen-battle').count()); i++) { await talk(); const f = page.getByRole('button', { name: /^Fight/ }); if (await f.count()) await f.first().click(); await page.waitForTimeout(400); }
await fightOnAuto('fight-smugglers');
await page.waitForTimeout(800); await shot('shard'); await talk();
const st = await page.evaluate(() => window.__world.game().progress.flags.story);
console.log('story flags', Object.keys(st).filter(k => k.startsWith('th-')).join(' '));

}

// ---- the skiff and the flight (--ticket: straight from the docks, showing the passage ticket) ----
await W('teleport', 'bogmire-docks', 28, 12, 'n'); await page.waitForTimeout(400); await W('interact'); await page.waitForTimeout(400);
await shot('skiff'); await talk([args.ticket ? 'Show your ticket' : 'Climb aboard']);
await page.waitForSelector('.screen-sky', { timeout: 10000, state: 'attached' }); await page.waitForTimeout(1500);
await shot('sky-takeoff');
// steer north for a while with the keyboard
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(3500); await page.keyboard.up('ArrowUp');
await shot('sky-steer');
await clickText(/World map/); await page.waitForTimeout(600); await shot('sky-map');
const pt = await page.evaluate(() => {
  const cv = document.querySelector('.sky-canvas'), r = cv.getBoundingClientRect(), z = Math.min(r.width / 1536, r.height / 1024);
  const ox = (r.width - 1536 * z) / 2, oy = (r.height - 1024 * z) / 2;
  const [cx, cy] = [0 * 512 + 1232 / 3, 0 * 512 + 566 / 2];
  return [r.left + ox + cx * z, r.top + oy + cy * z];
});
await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(1200); await shot('sky-auto');
await page.waitForSelector('.screen-world', { timeout: 20000 }); await page.waitForTimeout(1200);
// T2: the skiff sets down on the landing field outside the south gate (th-landing); Yara's goodbye, then the card
await shot('landing'); await talk([], { stopAt: '.tbc' }); await page.waitForTimeout(600);
const card = await page.locator('.tbc').count();
await shot('the-end');
if (!card) errors.push('the Prologue\'s card did not show');
await talk();
const obj = await page.evaluate(() => document.body.innerText);
if (!obj.includes('Stop the thieves at the crate.')) errors.push('the objective line is not Chapter 1\'s first');
const g = await page.evaluate(() => window.__world.game());
console.log('at', g.progress.pos, 'party', g.party.active, 'gold', g.gold, 'levels', g.party.active.map(id => g.party.roster[id].level));
if (args.fixture && !errors.length) { const f = path.resolve(root, args.fixture); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(g, null, 1) + '\n'); console.log('wrote', path.relative(root, f)); }
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
if (errors.length) process.exit(1);
