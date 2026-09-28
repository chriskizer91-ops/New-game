// Conditions and the story runner (rules/cond.js, rules/story.js; M3 spec §4.3, §4.4). Owner: WP1.
// SCAFFOLD: a first set of real assertions; WP1 adds the odds-vs-distribution test and the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { deepFreeze } from '../src/core/freeze.js';
import { check, condErrors } from '../src/rules/cond.js';
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
