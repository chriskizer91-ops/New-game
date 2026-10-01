// Thareia T2 end-to-end: Chapter 1, "The Rot's Roots", in Chromium at phone size (390 x 844), with a screenshot of
// every step (design/09-t2-spec.md 7.2).
//   node tools/e2e-t2.mjs [--out=tools/shots/t2] [--laptop] [--early-only]
// Starts from the T1 end states (tools/fixtures/t2-start.json, the fight route, and t2-start-early.json, the ticket;
// both written by `node tools/e2e-t1.mjs [--ticket] --fixture=<path>`), loaded at the landing through the
// __aethTest hook. Walks the main path through the rules seam (window.__world: teleports between scenes, then the real
// interact, dialogue, battle and sky screens), fights on Auto (the party trained up to the spec's 5.5 levels and rested
// between scenes, since the e2e skips the side fights), rents the skiff and flies it (the 3D ship; the Fjords mark
// refused at 1x), and reaches the Chapter 2 card. Then steps 1-5 again from the early-route fixture.
// Fails on any page error or console error (the font host's certificate errors aside), or on a missed step.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = path.resolve(root, args.out || 'tools/shots/t2'); mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
const exe = ['/opt/pw-browsers/chromium'].find(p => existsSync(p));
const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
const vp = args.laptop ? { width: 1280, height: 800 } : { width: 390, height: 844 };
const fixture = name => {
  const f = path.join(root, 'tools/fixtures', name);
  if (!existsSync(f)) throw new Error(`${name} is missing: run node tools/e2e-t1.mjs${name.includes('early') ? ' --ticket' : ''} --fixture=tools/fixtures/${name}`);
  return JSON.parse(readFileSync(f, 'utf8'));
};
const errors = [];
const fail = msg => { errors.push(msg); console.log('  FAIL ' + msg); };

async function run(tag, start, { full }) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: args.laptop ? 1 : 2, hasTouch: !args.laptop });
  page.on('pageerror', e => errors.push(`${tag} pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|fonts.g/.test(m.text())) errors.push(`${tag} console: ${m.text()}`); });
  await page.addInitScript(() => { globalThis.__aethTest = app => { window.__app = app; }; });
  await page.goto(pathToFileURL(path.join(root, 'dist/thareia.html')).href);
  await page.waitForTimeout(800);
  let n = 0;
  const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, `${tag}-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const wait = ms => page.waitForTimeout(ms);
  const ovOpen = () => page.evaluate(() => !!document.querySelector('.ov'));
  const W = (fn, ...a) => page.evaluate(([f, a]) => window.__world[f](...a), [fn, a]);
  const T = (fn, ...a) => page.evaluate(([f, a]) => window.__worldTools[f](...a), [fn, a]);
  const game = () => page.evaluate(() => window.__world.game());
  const flags = async () => (await game()).progress.flags;
  const story = async () => (await flags()).story || {};
  const hud = () => page.evaluate(() => document.querySelector('.screen-world')?.innerText || '');
  const shotIf = { cut: null };
  // talk through an open dialogue: pick the first of `picks` offered, else advance; a cut-scene or a card is shot once
  async function talk(picks = [], { max = 60, stopAt = null } = {}) {
    for (let i = 0; i < max; i++) {
      await wait(260);
      if (await page.locator('.screen-battle').count()) return;
      if (!await ovOpen()) return;
      if (stopAt && await page.locator(stopAt).count()) return;
      if (shotIf.cut && await page.locator('.ov .cut, .ov.cut, .ov .story-cut, .ov canvas').count()) { const c = shotIf.cut; shotIf.cut = null; await shot(c); }
      const choices = await page.locator('.ov .dlg-choice:not([disabled])').allInnerTexts();
      const want = picks.find(p => choices.some(c => c.includes(p)));
      if (want) { await page.locator('.ov .dlg-choice:not([disabled])', { hasText: want }).first().click(); picks = picks.filter(p => p !== want); continue; }
      const go = page.locator('.ov .story-go, .ov .btn.primary');
      if (await go.count()) { await go.first().click().catch(() => {}); continue; }
      await page.keyboard.press('Enter');
    }
  }
  async function idle() { for (let i = 0; i < 40 && await page.evaluate(() => window.__world?.busy?.()); i++) await wait(150); }
  // stand next to an entity facing it, and press A
  async function use(map, id, picks = [], prefer, { noTalk = false, stopAt = null } = {}) {
    const at = await T('standBy', map, id, prefer);
    if (!at) { fail(`${tag}: ${map}/${id} is not on the map`); return; }
    await W('teleport', map, at.x, at.y, at.face); await wait(500); await idle();
    await W('face', at.face); await W('interact'); await wait(450);
    if (!noTalk) await talk(picks, { stopAt });
  }
  // step into a trigger (or an exit) from the tile beside it
  async function stepInto(map, x, y, dir) {
    const back = { n: [0, 1], s: [0, -1], e: [-1, 0], w: [1, 0] }[dir];
    await W('teleport', map, x + back[0], y + back[1], dir); await wait(500); await idle();
    await W('press', dir); await wait(900); await idle();
  }
  async function fightOnAuto(name) {
    await page.waitForSelector('.screen-battle', { timeout: 15000 });
    await wait(600); await shot(name);
    const auto = page.getByRole('button', { name: /auto/i });
    if (await auto.count()) await auto.first().click();
    for (let i = 0; i < 400 && await page.locator('.screen-battle').count(); i++) {
      await wait(500);
      if (await page.locator('.screen-aftermath .btn.primary, .screen-battle .bt-end .btn.primary').count()) break;
    }
    await page.waitForSelector('.screen-aftermath', { timeout: 60000 }).catch(() => {});
    await shot(name + '-after');
    for (let i = 0; i < 80 && !(await page.locator('.screen-world').count()); i++) {
      const ov = page.locator('.ov button', { hasText: /Keep it|Onward|Walk on|Continue|Done|Close|Wake/ });
      const b = page.locator('.screen-aftermath .btn.primary');
      if (await page.locator('.ov').count()) { if (await ov.count()) await ov.first().click({ timeout: 2000 }).catch(() => {}); else await page.keyboard.press('Escape'); }
      else if (await b.count()) await b.first().click({ timeout: 2000 }).catch(() => {});
      else await page.keyboard.press('Enter');
      await wait(500);
    }
    await page.waitForSelector('.screen-world', { timeout: 15000 });
    await wait(700);
  }
  // a story fight: start it (`begin` walks into it or talks to it), win it on Auto (up to 3 tries, resting between)
  async function fight(enc, begin, { picks = [] } = {}) {
    for (let t = 1; t <= 3; t++) {
      await begin();
      for (let i = 0; i < 8 && !(await page.locator('.screen-battle').count()); i++) {
        await talk(picks);
        const f = page.getByRole('button', { name: /^Fight/ }); if (await f.count()) await f.first().click();
        await wait(300);
      }
      if (!(await page.locator('.screen-battle').count())) { fail(`${tag}: ${enc} did not start`); return false; }
      await fightOnAuto(`fight-${enc}${t > 1 ? '-try' + t : ''}`);
      await talk();
      if ((await flags()).beaten?.[enc]) { console.log(`  ${tag}: won ${enc}${t > 1 ? ` on try ${t}` : ''}`); return true; }
      console.log(`  ${tag}: lost ${enc} (try ${t}); resting`);
      await W('train', 1);
    }
    fail(`${tag}: ${enc} not won in 3 tries`);
    return false;
  }
  const train = async lv => { const l = await W('train', lv); console.log(`  ${tag}: party ${l.join('/')} (trained to ${lv})`); };
  const want = async (flag, step) => { if (!(await story())[flag]) fail(`${tag}: ${step}: ${flag} is not set`); };
  const objective = async (text, step) => { const h = await hud(); if (!h.includes(text)) fail(`${tag}: ${step}: the objective is not "${text}"`); };

  // ---- load the T1 end state at the landing ----
  await page.evaluate(g => { window.__app.replaceGame(g, { backup: false }); window.__app.go('world', { arrive: 'load' }); }, start);
  await page.waitForSelector('.screen-world', { timeout: 15000 }); await wait(1200);
  await talk();
  await objective('Stop the thieves at the crate.', 'the landing');
  await shot('landing');

  // 1. the crate-thieves on Auto
  await fight('c1-landing', () => stepInto('th-landing', 29, 16, 'n'));
  await shot('landing-after');
  await objective('Find Aldric Fernshaw on the square.', 'step 1');

  // 2. Aldric: 10 gp and the courier job; the north gate opens
  await W('teleport', 'th-thornhollow', 12, 19, 'n'); await wait(900); await talk(); await shot('thornhollow');
  const gold0 = (await game()).gold;
  await use('th-thornhollow', 'th-aldric', [], ['w', 's', 'e', 'n']);
  const gold1 = (await game()).gold;
  if (gold1 !== gold0 + 10) fail(`${tag}: step 2: Aldric paid ${gold1 - gold0}, not 10`);
  await want('c1-courier', 'step 2'); await shot('aldric');
  await use('th-thornhollow', 'th-dael', [], ['s', 'e', 'w', 'n']); await want('c1-dael', 'step 2');

  // 3. the hire post at the landing refuses (no sponsor)
  await use('th-landing', 'th-skyhire', [], ['w', 's', 'e', 'n']); await shot('hire-refused');
  await want('c1-saw-hire', 'step 3');

  // 4. out the north gate: the Thornway trigger fight, the runner camp, the bramble
  await train(2);
  await fight('c1-verdant-edge', () => stepInto('th-thornway', 14, 52, 'n'));
  await shot('thornway');
  await train(3);
  await fight('c1-runner-camp', () => use('th-thornway', 'c1-runner-camp', [], ['s', 'e', 'w', 'n']));
  await fight('c1-bramble-deep', () => use('th-thornway', 'c1-bramble-deep', [], ['s', 'e', 'w', 'n']));
  await stepInto('th-thornway', 16, 21, 'n'); await talk();
  await stepInto('th-thornway', 21, 17, 'n'); await talk();

  // 5. Eldergrove: Taela, the shard cut, Taela a guest
  await train(4);
  await W('teleport', 'th-eldergrove', 14, 23, 'n'); await wait(900); await talk(); await shot('eldergrove');
  await use('th-eldergrove', 'th-taela', [], ['s', 'w', 'e', 'n']); await want('c1-met-taela', 'step 5');
  shotIf.cut = 'shard-glows';
  await stepInto('th-eldergrove', 14, 4, 'n'); await talk();
  const g5 = await game();
  if (!g5.party.active.includes('taela') || !g5.party.roster.taela?.guest) fail(`${tag}: step 5: Taela is not in the party as a guest`);
  await idle(); await shot('taela-guest');
  if (!full) { await page.close(); return; }

  // 6. the stone circle; under the tree; the grub knot; the warm spring
  await train(5);
  await fight('c1-grove-circle', () => use('th-eldergrove', 'c1-grove-circle', [], ['e', 's', 'n', 'w']));
  await want('c1-circle-saved', 'step 6');
  await stepInto('th-heartroot-1', 12, 21, 'n'); await talk(); await shot('heartroot');
  await fight('c1-roots-grubs', () => use('th-heartroot-1', 'c1-roots-grubs', [], ['e', 's', 'n', 'w']));
  await use('th-heartroot-1', 'th-hr-coal', ['Ask Taela to light it.'], ['e', 'n', 's', 'w']);
  await fight('c1-roots-sapwight', () => use('th-heartroot-1', 'c1-roots-sapwight', [], ['s', 'e', 'w', 'n']));
  await stepInto('th-heartroot-1', 12, 2, 'n'); await talk(); await shot('warm-spring');
  await want('c1-warm-water', 'step 6');

  // 7. rest at the hearth: the pulse (the cut, then the note); the next rest's toast has no day
  await train(6);
  shotIf.cut = 'pulse';
  await use('th-eldergrove', 'th-eg-hearth', [], ['s', 'e', 'w', 'n'], { noTalk: true });
  const rest = page.locator('.ov-hearth button', { hasText: /^Rest/ });
  if (await rest.count()) { await rest.first().click(); await wait(600); await talk(); } else fail(`${tag}: step 7: no Rest at Eldergrove's hearth`);
  await want('c1-pulse', 'step 7');
  await use('th-eldergrove', 'th-eg-hearth', [], ['s', 'e', 'w', 'n'], { noTalk: true });
  if (await rest.count()) {
    await rest.first().click(); await wait(400);
    const toast = await page.locator('.toast').innerText().catch(() => '');
    await shot('rest-no-day');
    if (!/Rested at/.test(toast) || /Day/.test(toast)) fail(`${tag}: step 7: the rest toast reads "${toast}"`);
    await talk();
  }

  // 8. Thornhollow: Aldric sponsors the skiff and the prepaid flight; Dael opens the west road
  await use('th-thornhollow', 'th-aldric', [], ['w', 's', 'e', 'n']); await want('c1-hire-ticket', 'step 8');
  await use('th-thornhollow', 'th-dael', [], ['s', 'e', 'w', 'n']); await want('c1-west-open', 'step 8');
  await shot('west-open');

  // 9. hire at the landing with the prepaid ticket (gold unchanged); the 3D ship; the Fjords refused at 1x; land at Mosswatch
  const gold9 = (await game()).gold;
  await use('th-landing', 'th-skyhire', ['Use Aldric\'s prepaid flight.'], ['w', 's', 'e', 'n']);
  await page.waitForSelector('.screen-sky', { timeout: 10000, state: 'attached' }); await wait(2500);
  const SK = () => page.evaluate(() => window.__sky.state());
  let sk = await SK();
  await shot('sky-takeoff');
  if (sk.view !== '3d') fail(`${tag}: step 9: the sky view is ${sk.view}, not 3d`);
  if ((await page.evaluate(() => window.__app.game.gold)) !== gold9) fail(`${tag}: step 9: the prepaid flight cost gold`);
  await page.keyboard.down('ArrowUp'); await wait(900); await page.keyboard.down('ArrowLeft'); await wait(700);
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowUp');
  await shot('sky-turn');
  await page.evaluate(() => window.__sky.place(430, 260, Math.PI)); await wait(1500);
  const fj = await page.evaluate(() => window.__sky.screenOf(365, 205));
  await page.mouse.click(fj[0], fj[1]); await wait(500);
  sk = await SK(); await shot('fjords-refused');
  if (!/licence/i.test(sk.say)) fail(`${tag}: step 9: the Fjords were not refused for the licence ("${sk.say}")`);
  await page.evaluate(() => window.__sky.place(715, 480, -Math.PI / 2)); await wait(1800);
  const land = page.getByRole('button', { name: /Land at/ });
  if (await land.count()) { await shot('over-mosswatch'); await land.first().click(); } else fail(`${tag}: step 9: no Land button over Mosswatch`);
  await page.waitForSelector('.screen-world', { timeout: 20000 }); await wait(1200); await talk();
  if ((await game()).progress.pos.map !== 'th-mossfall') fail(`${tag}: step 9: landed on ${(await game()).progress.pos.map}`);
  await shot('mossfall');

  // 10. the tower: the stair, the lantern, the Rot line; the Hindwood road opens
  await train(7);
  await W('teleport', 'th-mosswatch-1', 6, 13, 'n'); await wait(900); await talk();
  await use('th-mosswatch-1', 'th-garret', [], ['e', 's', 'n', 'w']); await want('c1-mw-arrived', 'step 10');
  await fight('c1-mw-stair', () => use('th-mosswatch-1', 'c1-mw-stair', [], ['s', 'e', 'w', 'n']));
  await W('teleport', 'th-mosswatch-2', 6, 9, 'n'); await wait(900); await talk();
  await fight('c1-mw-lantern', () => use('th-mosswatch-2', 'c1-mw-lantern', [], ['s', 'e', 'w', 'n']));
  await use('th-mosswatch-2', 'th-garret-up', [], ['e', 's', 'w', 'n']); await shot('rot-line');
  await want('c1-to-fawnrest', 'step 10');

  // 11. hire back to Thornhollow (10 gp, once); the Hindwood; the glowcaps; the burners talked down
  await train(8);
  const gold11 = (await game()).gold;
  await use('th-mossfall', 'th-mw-hire', ['Hire a flight: 10 gp.'], ['e', 's', 'n', 'w']);
  await page.waitForSelector('.screen-sky', { timeout: 10000, state: 'attached' }); await wait(2000);
  const paid = gold11 - await page.evaluate(() => window.__app.game.gold);
  if (paid !== 10) fail(`${tag}: step 11: the hire cost ${paid}, not 10`);
  await page.evaluate(() => window.__sky.place(1232, 580, -Math.PI / 2)); await wait(1800);
  if (await land.count()) { await shot('over-thornhollow'); await land.first().click(); } else fail(`${tag}: step 11: no Land button over Thornhollow`);
  await page.waitForSelector('.screen-world', { timeout: 20000 }); await wait(1200); await talk();
  await shot('landed-thornhollow');
  await W('teleport', 'th-hindwood', 29, 34, 'w'); await wait(900); await talk(); await shot('hindwood');
  await fight('c1-glowcaps', () => use('th-hindwood', 'c1-glowcaps', [], ['s', 'e', 'w', 'n']));
  await use('th-hindwood', 'c1-feral-druid', ['Let Taela talk.'], ['e', 's', 'w', 'n']);
  await want('c1-hindwood', 'step 11'); await shot('burners');

  // 12. Fawnrest: the keeper, the court, the stair
  await W('teleport', 'th-fawnrest', 11, 17, 'n'); await wait(900); await talk(); await shot('fawnrest');
  await use('th-fawnrest', 'th-keeper', [], ['s', 'e', 'w', 'n']); await want('c1-fawnrest', 'step 12');
  await stepInto('th-fawnrest', 11, 8, 'n'); await talk(); await want('c1-stair-found', 'step 12');
  await shot('stair');

  // 13. the node: the stair, the hall and the roots, the node cut, the boss on Auto, the cooling cut; Taela for good
  await train(9);
  await W('teleport', 'th-fawnrest-node', 23, 30, 'n'); await wait(900); await talk(); await shot('node');
  await fight('c1-node-stair', () => use('th-fawnrest-node', 'c1-node-stair', [], ['e', 's', 'n', 'w']));
  await fight('c1-node-hall', () => stepInto('th-fawnrest-node', 23, 21, 'n'));
  shotIf.cut = 'node-overheats';
  await fight('c1-node-roots', () => use('th-fawnrest-node', 'c1-node-roots', [], ['e', 's', 'n', 'w']));
  await want('c1-node-found', 'step 13');
  await shot('node-found');
  shotIf.cut = 'node-cools';
  await fight('c1-guardian', () => use('th-fawnrest-node', 'c1-guardian', [], ['s', 'e', 'w', 'n']));
  await talk();
  const g13 = await game();
  if (!g13.party.roster.taela || g13.party.roster.taela.guest) fail(`${tag}: step 13: Taela is still a guest`);
  await want('c1-node-cooled', 'step 13'); await shot('node-cooled');

  // 14. Aldric's letter; Dael; the Chapter 2 card
  await use('th-thornhollow', 'th-aldric', [], ['w', 's', 'e', 'n']); await want('c1-aldric-letter', 'step 14');
  await use('th-thornhollow', 'th-dael', [], ['s', 'e', 'w', 'n'], { stopAt: '.tbc' });
  await talk([], { stopAt: '.tbc' }); await wait(600);
  const card = await page.locator('.tbc').count();
  await shot('chapter-end');
  if (!card) fail(`${tag}: step 14: the Chapter 1 card did not show`);
  else { const txt = await page.locator('.tbc').innerText(); if (!/Chapter 2/.test(txt) || /\bDay\b/.test(txt)) fail(`${tag}: step 14: the card reads "${txt.replace(/\s+/g, ' ')}"`); }
  await talk();
  await want('c1-done', 'step 14');
  await objective('Chapter 1 is done. Chapter 2 comes next.', 'the end');
  const g = await game();
  console.log(`  ${tag}: at ${g.progress.pos.map}, party ${g.party.active.join('/')}, levels ${g.party.active.map(id => g.party.roster[id].level).join('/')}, gold ${g.gold}`);
  await page.close();
}

if (!args['early-only']) await run('fight', fixture('t2-start.json'), { full: true });
await run('early', fixture('t2-start-early.json'), { full: false });
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
if (errors.length) process.exit(1);
