// Conditions and the story runner (rules/cond.js, rules/story.js; M3 spec §4.3, §4.4). Owner: WP1.
// SCAFFOLD: a first set of real assertions; WP1 adds the odds-vs-distribution test and the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { deepFreeze } from '../src/core/freeze.js';
import { check, condErrors, questState } from '../src/rules/cond.js';
import { relicItem } from '../src/rules/loot.js';
import { createRng } from '../src/core/rng.js';
import { talkTo, dialogueView, enterDialogue, choose, questLog, nextObjective, ladder } from '../src/rules/story.js';

import { readFileSync } from 'node:fs';

const fresh = () => deepFreeze(newGame({ name: 'Tess', seed: 5 }));
const fixture = name => deepFreeze(migrate(JSON.parse(readFileSync(new URL(`./fixtures/v1/${name}.json`, import.meta.url), 'utf8'))));
const withProgress = (g, patch) => ({ ...g, progress: { ...g.progress, ...patch, flags: { ...g.progress.flags, ...(patch.flags || {}) } } });

test('conditions: flags, Brands counted once, combinators, owned relics', () => {
  const g = fresh();
  assert.equal(check(g, undefined), true);
  assert.equal(check(g, { flag: 'intro-done' }), false, 'a new game plays the intro');
  assert.equal(check(fixture('v1-node-hearth-road'), { flag: 'intro-done' }), true, 'migrated saves skip the intro');
  assert.equal(check(g, { flag: 'starter' }), true, 'story.starter is set by newGame');
  assert.equal(check(g, { flag: 'nope' }), false);
  const w2 = withProgress(g, { brands: ['brand-of-briars', 'brand-of-briars'], waking: 2 });
  assert.equal(check(w2, { brand: 'brand-of-briars' }), true);
  assert.equal(check(w2, { brands: 1 }), true);
  assert.equal(check(w2, { brands: 2 }), false, 'duplicate Brands count once');
  assert.equal(check(w2, { all: [{ waking: 2 }, { not: { flag: 'nope' } }] }), true);
  assert.equal(check(w2, { any: [{ flag: 'nope' }, { brands: 2 }] }), false);
  assert.equal(check(g, { owns: 'hearthbrand' }), true);
  assert.equal(check(g, { power: 'kindle' }), true, 'Hearthbrand grants Kindle');
  assert.equal(check(g, { wears: 'hearthbrand' }), true);
  assert.equal(check(g, { domain: 'combat', level: 1 }), true);
  assert.equal(check(g, { domain: 'combat', level: 2 }), false);
  assert.deepEqual(condErrors({ all: [{ flag: 'x' }, { brands: 2 }] }), []);
  assert.equal(condErrors({ bogus: 1 }).length, 1);
});

test('talk, dialogue views and effects', () => {
  const g = fresh();
  assert.equal(talkTo(g, 'fenwick'), 'fenwick');
  assert.equal(talkTo(withProgress(g, { brands: ['brand-of-briars'] }), 'fenwick'), 'fenwick-brand');
  const v = dialogueView(g, 'garret');
  assert.equal(v.lines[0].name, 'Old Garret');
  assert.equal(v.lines[1].name, 'Sister Alondra');
  assert.ok(v.choices[0].odds.pct > 0 && v.choices[0].odds.pct < 100);
  const r = enterDialogue(g, 'dael');
  assert.equal(r.game.progress.flags.story['met-dael'], true);
  assert.equal(g.progress.flags.story['met-dael'], undefined, 'the input is not mutated');
  const c = choose(g, 'fenwick', 0);
  assert.equal(c.next, 'fenwick-hearth');
  const v2 = choose(g, 'vesper', 0);
  assert.ok(['vesper-exposed', 'vesper-angry'].includes(v2.next));
  assert.equal(typeof v2.roll.total, 'number');
});

test('quests are derived from conditions; the Ladder starts in silhouette', () => {
  assert.deepEqual(questLog(fresh()), [], 'no quest before the intro');
  const g = withProgress(fresh(), { flags: { story: { ...fresh().progress.flags.story, 'intro-done': true } } });
  const log = questLog(g);
  assert.deepEqual(log.map(q => q.id), ['hearth-gutters']);
  assert.equal(nextObjective(g).entity, 'keep-vault');
  const done = withProgress(g, { flags: { done: { 'keep-vault': true } } });
  assert.equal(nextObjective(done).entity, 'dael');
  const lad = ladder(g);
  assert.equal(lad.length, 20);
  assert.ok(lad.every(p => p.state === 'silhouette'));
  assert.equal(ladder(done)[0].state, 'settled');
});

test('dialogue check odds match the rolled distribution (a check with advantage, and a contest)', () => {
  const g = fresh();
  const rate = (id, i, n = 4000) => {
    let pass = 0;
    for (let k = 0; k < n; k++) if (choose({ ...g, rngState: (k * 2654435761) | 0 }, id, i).roll.pass) pass++;
    return (100 * pass) / n;
  };
  const vesper = dialogueView(g, 'vesper').choices.find(c => c.odds);
  assert.ok(Math.abs(rate('vesper', vesper.i) - vesper.odds.pct) < 3, `Vesper: ${vesper.odds.pct}%`);
  const garret = dialogueView(g, 'garret').choices.find(c => c.odds);
  assert.ok(Math.abs(rate('garret', garret.i) - garret.odds.pct) < 3, `Garret's contest: ${garret.odds.pct}%`);
});

test('a thank-you is never lost, whoever you meet first (quests used to stick at "ready")', () => {
  const g0 = fresh();
  const base = withProgress(g0, { flags: { story: { ...g0.progress.flags.story, 'intro-done': true } } });
  // Captain Dael, first met after the Brand: the patrol report still pays and sends Corra home
  let d = withProgress(base, { brands: ['brand-of-briars'], flags: { beaten: { 'hollowed-patrol': 1 } } });
  assert.equal(talkTo(d, 'dael'), 'dael-brand');
  d = enterDialogue(d, 'dael-brand').game;
  assert.equal(talkTo(d, 'dael'), 'dael-report');
  const gold = d.gold;
  d = enterDialogue(d, 'dael-report').game;
  assert.equal(questState(d, 'missing-patrol'), 'done');
  assert.equal(d.gold, gold + 150);
  assert.equal(d.progress.flags.story['rangers-home'], true);
  // Old Garret, first met with the lantern beaten and the signal fire lit
  let h = withProgress(base, { flags: { beaten: { 'mw-lantern': 1 }, kindled: { ...base.progress.flags.kindled, 'mosswatch-fire': true } } });
  assert.equal(talkTo(h, 'garret'), 'garret-thanks');
  h = enterDialogue(h, 'garret-thanks').game;
  assert.equal(questState(h, 'lights-at-midnight'), 'done');
  // the council, reached without ever talking to Dael or Miravel, still closes the main quest
  let c = withProgress(base, { brands: ['brand-of-briars', 'brand-of-the-heartroot'], flags: { done: { 'keep-vault': true }, story: { ...base.progress.flags.story, 'act1-complete': true } } });
  assert.equal(questState(c, 'hearth-gutters'), 'active');
  assert.equal(nextObjective(c).entity, 'isolde', 'the talk steps are moot once their Brands are earned');
  c = enterDialogue(c, 'council').game;
  assert.equal(questState(c, 'hearth-gutters'), 'done');
  // a claim still needs every step: telling Dael about a patrol you never found pays nothing
  const early = enterDialogue(withProgress(base, { flags: { story: { ...base.progress.flags.story, 'met-dael': true } } }), 'dael-report').game;
  assert.notEqual(questState(early, 'missing-patrol'), 'done');
});

test('Garret\'s contest is for a Kettle you do not have yet', () => {
  const g = fresh();
  assert.ok(dialogueView(g, 'garret').choices.some(ch => /Challenge/.test(ch.text)));
  const owner = { ...g, inventory: [...g.inventory, relicItem('watchkeepers-kettle', createRng(3))] };
  assert.ok(!dialogueView(owner, 'garret').choices.some(ch => /Challenge/.test(ch.text)), 'no second Kettle a day later');
});
