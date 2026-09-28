// Conditions and the story runner (rules/cond.js, rules/story.js; M3 spec §4.3, §4.4), and the
// Sunscorch's story played through them (M4 spec §3.1, §3.6): each quest's happy path and its
// out-of-order path, the second council, Tamsin at Scorchgate and the lines after the Champions.
// Owner: WP1 (M3), P3 story (M4 tests).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { deepFreeze } from '../src/core/freeze.js';
import { check, condErrors, questState } from '../src/rules/cond.js';
import { relicItem } from '../src/rules/loot.js';
import { createRng } from '../src/core/rng.js';
import { talkTo, dialogueView, enterDialogue, choose, questLog, nextObjective, ladder, afterDialogue, restDialogue, bounties } from '../src/rules/story.js';
import { enterMap } from '../src/rules/world.js';

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
  assert.equal(lad.length, 27, '17 Act I posters, 8 Sunscorch posters (M4) and 2 rumours');
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

// ---- M4: the Sunscorch's story (P3) -----------------------------------------------------------------

// A save that has finished Act I, heard Isolde's commission and sat the first council: the Sunscorch is open.
const act1 = () => {
  const g = fresh();
  return deepFreeze(withProgress(g, {
    brands: ['brand-of-briars', 'brand-of-the-heartroot'], waking: 2,
    flags: { done: { 'keep-vault': true }, story: { ...g.progress.flags.story, 'intro-done': true, 'heard-commission': true, 'act1-complete': true, 'council-done': true } },
  }));
};
const story = (g, patch) => withProgress(g, { flags: { story: { ...g.progress.flags.story, ...patch } } });
const beat = (g, ...encs) => withProgress(g, { flags: { beaten: { ...g.progress.flags.beaten, ...Object.fromEntries(encs.map(e => [e, 1])) } } });
const brand = (g, ...ids) => withProgress(g, { brands: [...g.progress.brands, ...ids] });
const both = g => story(brand(g, 'brand-of-glass', 'brand-of-ash'), { 'sunscorch-complete': true });
let seedN = 100;
const own = (g, relic, patch = {}) => ({ ...g, inventory: [...g.inventory, { ...relicItem(relic, createRng(seedN++)), ...patch }] });
const wear = (g, relic, hero = 'warden') => {
  const it = relicItem(relic, createRng(seedN++));
  const h = g.party.roster[hero];
  return { ...g, inventory: [...g.inventory, it], party: { ...g.party, roster: { ...g.party.roster, [hero]: { ...h, gear: { ...h.gear, [it.slot]: it.uid } } } } };
};
const owns = (g, relic) => check(g, { owns: relic });
const flag = (g, f) => check(g, { flag: f });
// talk to someone: the line they pick, and the game once it has played
const talk = (g, npc) => { const id = talkTo(g, npc); return { id, game: enterDialogue(g, id).game }; };
const pick = (g, id, re) => {
  const c = dialogueView(g, id).choices.find(x => re.test(x.text));
  assert.ok(c, `${id}: a choice like ${re}`);
  return choose(g, id, c.i);
};
const stepAt = (g, q) => questLog(g).find(x => x.id === q).step.target.entity;

test('the Humming Crate: meet Zara, find the caravan, bring the crate home', () => {
  let g = act1();
  let t = talk(g, 'zara');
  assert.equal(t.id, 'zara');
  g = t.game;
  assert.equal(questState(g, 'humming-crate'), 'active');
  assert.equal(stepAt(g, 'humming-crate'), 'gf-caravan');
  assert.equal(talkTo(g, 'zara'), 'zara-again', 'no second first meeting');
  assert.equal(pick(g, 'zara-again', /crate/).next, 'zara-crate-ask');
  g = beat(g, 'gf-caravan');
  assert.equal(afterDialogue(g, 'gf-caravan', 'victory'), 'caravan-crate');
  g = enterDialogue(g, 'caravan-crate').game;
  assert.ok(flag(g, 'crate-found'));
  assert.equal(afterDialogue(g, 'gf-caravan', 'victory'), null, 'a re-armed caravan has no second crate');
  assert.equal(stepAt(g, 'humming-crate'), 'zara');
  t = talk(g, 'zara');
  assert.equal(t.id, 'zara-crate');
  g = t.game;
  assert.equal(questState(g, 'humming-crate'), 'done');
  assert.ok(owns(g, 'zaras-orrery'));
  assert.equal(g.codex['zaras-orrery'].claimed, true);
  assert.equal(talkTo(g, 'zara'), 'zara-home');
  assert.equal(talkTo(wear(g, 'zaras-orrery'), 'zara'), 'notice-zara-orrery', 'the world notices');
  // the Orrery hums at night, once
  assert.equal(restDialogue(g, 'spire-hearth'), 'orrery-night');
  assert.equal(restDialogue(enterDialogue(g, 'orrery-night').game, 'spire-hearth'), null);
});

test('the Humming Crate out of order: the caravan beaten before Zara is met, its lines lost to a reload', () => {
  let g = beat(act1(), 'gf-caravan');
  assert.equal(questState(g, 'humming-crate'), 'hidden');
  assert.equal(talkTo(wear(g, 'saltglass'), 'zara'), 'zara-crate', 'the thank-you comes before any notice');
  const t = talk(g, 'zara');
  assert.equal(t.id, 'zara-crate', 'the thank-you is also the first meeting');
  g = t.game;
  assert.equal(questState(g, 'humming-crate'), 'done');
  assert.ok(flag(g, 'met-zara'));
  assert.ok(owns(g, 'zaras-orrery'));
  assert.equal(talkTo(g, 'zara'), 'zara-home');
  assert.equal(talkTo(wear(act1(), 'saltglass'), 'zara'), 'zara', 'she notices nothing before you have met');
  // a claim still needs every step: thanks for a crate nobody found pays nothing
  const early = enterDialogue(story(act1(), { 'met-zara': true }), 'zara-crate').game;
  assert.notEqual(questState(early, 'humming-crate'), 'done');
  assert.ok(!owns(early, 'zaras-orrery'));
});

test('Water for Sandspire: meet Qasim, clear the aqueduct, tell him; and the aqueduct cleared first', () => {
  let g = act1();
  let t = talk(g, 'qasim');
  assert.equal(t.id, 'qasim');
  g = t.game;
  assert.equal(questState(g, 'cistern-water'), 'active');
  assert.equal(talkTo(g, 'qasim'), 'qasim-again');
  assert.equal(talkTo(g, 'water-seller'), 'water-seller');
  g = beat(g, 'dt-aqueduct');
  assert.equal(afterDialogue(g, 'dt-aqueduct', 'victory'), 'aqueduct-flows');
  assert.equal(talkTo(g, 'water-seller'), 'water-seller-flowing');
  const gold = g.gold;
  t = talk(g, 'qasim');
  assert.equal(t.id, 'qasim-water');
  g = t.game;
  assert.equal(questState(g, 'cistern-water'), 'done');
  assert.equal(g.gold, gold + 200);
  assert.ok(owns(g, 'qasims-signet'));
  assert.equal(talkTo(g, 'qasim'), 'qasim-home');
  assert.equal(talkTo(wear(g, 'qasims-signet'), 'qasim'), 'notice-qasim-signet');
  assert.equal(afterDialogue(g, 'dt-aqueduct', 'victory'), null);
  // out of order: the aqueduct cleared before Qasim was ever met
  let o = beat(act1(), 'dt-aqueduct');
  t = talk(o, 'qasim');
  assert.equal(t.id, 'qasim-water');
  o = t.game;
  assert.equal(questState(o, 'cistern-water'), 'done');
  assert.ok(flag(o, 'met-qasim'));
  assert.equal(talkTo(o, 'qasim'), 'qasim-home');
});

test('Luma\'s Secret: the lantern, the promise (or "not now"), the heart; and the lantern taken before meeting her', () => {
  let g = act1();
  let t = talk(g, 'luma');
  assert.equal(t.id, 'luma');
  g = t.game;
  assert.equal(questState(g, 'sunstone-heart'), 'active');
  assert.equal(stepAt(g, 'sunstone-heart'), 'ds-crew');
  assert.equal(talkTo(g, 'luma'), 'luma-again');
  g = beat(own(g, 'sunstone-lantern'), 'ds-crew');
  assert.equal(afterDialogue(g, 'ds-crew', 'victory'), 'brask-lantern', 'the lantern points the way to her');
  assert.equal(stepAt(g, 'sunstone-heart'), 'luma');
  t = talk(g, 'luma');
  assert.equal(t.id, 'luma-secret');
  g = t.game;
  const later = pick(g, 'luma-secret', /Not now/);
  assert.equal(questState(later.game, 'sunstone-heart'), 'active', 'no promise, no heart');
  assert.equal(talkTo(later.game, 'luma'), 'luma-secret', 'she asks again');
  const kept = pick(g, 'luma-secret', /keep your secret/);
  assert.equal(kept.next, 'luma-heart-given');
  assert.ok(kept.events.some(e => e.t === 'item' && e.item.base === 'sunstone-heart'));
  g = kept.game;
  assert.equal(questState(g, 'sunstone-heart'), 'done');
  assert.ok(owns(g, 'sunstone-heart'));
  assert.equal(talkTo(g, 'luma'), 'luma-after');
  assert.equal(talkTo(brand(g, 'brand-of-glass'), 'luma'), 'luma-someday', 'one day she will travel');
  assert.equal(talkTo(wear(g, 'sunstone-heart'), 'luma'), 'notice-luma-heart');
  assert.equal(afterDialogue(g, 'ds-crew', 'victory'), null);
  assert.equal(restDialogue(g, 'pithead'), 'luma-fireside');
  assert.equal(restDialogue(enterDialogue(g, 'luma-fireside').game, 'pithead'), null, 'once');
  // out of order: Brask's lantern taken before Luma was ever met
  const o = talk(own(act1(), 'sunstone-lantern'), 'luma');
  assert.equal(o.id, 'luma-secret');
  assert.ok(flag(o.game, 'met-luma'), 'the secret is also a first meeting');
  assert.equal(questState(o.game, 'sunstone-heart'), 'active');
  const done = pick(o.game, 'luma-secret', /keep your secret/).game;
  assert.equal(questState(done, 'sunstone-heart'), 'done');
  assert.ok(owns(done, 'sunstone-heart'));
  // a shattered lantern is not a lantern
  assert.equal(talkTo(story(own(act1(), 'sunstone-lantern', { shattered: true }), { 'met-luma': true }), 'luma'), 'luma-again');
});

test('the Well of Mirages: Sabah pays gold and two glass pearls, whoever quiets the Queen first', () => {
  let g = act1();
  let t = talk(g, 'sabah');
  assert.equal(t.id, 'sabah');
  g = beat(t.game, 'wisp-queen');
  assert.equal(questState(g, 'well-of-mirages'), 'active');
  assert.equal(afterDialogue(g, 'wisp-queen', 'victory'), 'queen-quiet');
  assert.equal(talkTo(g, 'pilgrim-mw'), 'pilgrim-mw-well');
  const gold = g.gold;
  t = talk(g, 'sabah');
  assert.equal(t.id, 'sabah-well');
  g = t.game;
  assert.equal(questState(g, 'well-of-mirages'), 'done');
  assert.equal(g.gold, gold + 150);
  assert.equal(g.gems['glass-pearl'], 2);
  assert.equal(talkTo(g, 'sabah'), 'sabah-after');
  assert.equal(talkTo(wear(g, 'mirage-glass'), 'sabah'), 'notice-sabah-glass');
  // out of order: the Queen quieted before Sabah was ever met
  t = talk(beat(act1(), 'wisp-queen'), 'sabah');
  assert.equal(t.id, 'sabah-well');
  assert.equal(questState(t.game, 'well-of-mirages'), 'done');
  assert.ok(flag(t.game, 'met-sabah'));
});

test('the Sunscorch Waking: Isolde sends you south, and the second council closes it even for a Warden who met nobody', () => {
  let g = act1();
  assert.equal(questState(g, 'sunscorch-waking'), 'active');
  assert.equal(nextObjective(g).entity, 'qasim');
  assert.equal(talkTo(g, 'gate-guard-se'), 'guard-se-open');
  assert.equal(talkTo(fresh(), 'gate-guard-se'), 'guard-se', 'before Act I the gate stays shut');
  const t = talk(g, 'isolde');
  assert.equal(t.id, 'isolde-south');
  assert.equal(talkTo(wear(t.game, 'wardens-seal'), 'isolde'), 'notice-isolde-seal', 'once heard, the notices come back');
  assert.equal(talkTo(t.game, 'isolde'), 'isolde-south');
  // met Qasim: the first step is done, Luma is next
  assert.equal(nextObjective(story(g, { 'met-qasim': true })).entity, 'luma');
  // straight down: both Brands, and not a word to Qasim or Luma
  g = both(g);
  assert.equal(questState(g, 'sunscorch-waking'), 'active');
  assert.equal(nextObjective(g).entity, 'isolde', 'the talk steps close with their Brands');
  const hall = enterMap(g, { map: 'keep-hall', at: [12, 6], face: 'n' });
  assert.deepEqual(hall.events.filter(e => e.t === 'trigger').map(e => e.id), ['council-2']);
  const c = enterDialogue(hall.game, 'council-2').game;
  assert.equal(questState(c, 'sunscorch-waking'), 'done');
  assert.deepEqual(pick(c, 'council-2', /Let the Council/).events.filter(e => e.t === 'end'), [{ t: 'end', act: 'act2' }]);
  const chairs = pick(c, 'council-2', /empty chairs/);
  assert.equal(chairs.next, 'council-2-chairs');
  assert.deepEqual(enterDialogue(chairs.game, 'council-2-chairs').events.filter(e => e.t === 'end'), [{ t: 'end', act: 'act2' }]);
  // guarded by the flag its scene sets: a reload mid-scene plays it again; once it has played, never
  assert.ok(enterMap(hall.game, { map: 'keep-hall', at: [12, 6], face: 'n' }).events.some(e => e.id === 'council-2'));
  assert.ok(!enterMap(c, { map: 'keep-hall', at: [12, 6], face: 'n' }).events.some(e => e.id === 'council-2'));
  assert.equal(talkTo(c, 'isolde'), 'isolde-next');
  assert.equal(talkTo(c, 'fenwick'), 'fenwick-four');
  assert.equal(talkTo(c, 'hilda'), 'hilda-ironspire');
  assert.equal(talkTo(c, 'qasim'), 'qasim', 'Qasim still gets his first meeting in Sandspire');
  assert.equal(talkTo(story(c, { 'met-qasim': true }), 'qasim'), 'qasim-council');
  assert.equal(talkTo(story(g, { 'met-qasim': true }), 'qasim'), 'qasim-summons', 'before the council he rides for the Keep');
  // a Warden who skipped the first council hears both, the first one first
  const skipped = story(g, { 'council-done': false });
  assert.deepEqual(enterMap(skipped, { map: 'keep-hall', at: [12, 6], face: 'n' }).events.filter(e => e.t === 'trigger').map(e => e.id), ['council', 'council-2']);
});

test('Tamsin at Scorchgate: her talk starts the duel; a win pays 150 gold, a yield sets tamsin-yielded-2', () => {
  const g = act1();
  assert.deepEqual(pick(g, 'tamsin-scorchgate', /^Try/).events, [{ t: 'fight', enc: 'tamsin-scorchgate' }]);
  assert.deepEqual(pick(g, 'tamsin-scorchgate', /Not yet/).events, []);
  const won = beat(g, 'tamsin-scorchgate');
  assert.equal(afterDialogue(won, 'tamsin-scorchgate', 'victory'), 'tamsin-sg-win');
  assert.equal(enterDialogue(won, 'tamsin-sg-win').game.gold, won.gold + 150);
  assert.equal(afterDialogue(g, 'tamsin-scorchgate', 'yield'), 'tamsin-sg-yield');
  assert.ok(flag(enterDialogue(g, 'tamsin-sg-yield').game, 'tamsin-yielded-2'));
});

test('after the Champions: first-win lines (Cinderfang claimed or shattered), the turn for home after both, rematches', () => {
  const g = brand(act1(), 'brand-of-glass');
  assert.equal(afterDialogue(own(g, 'cinderfang'), 'kharzul-heart', 'victory'), 'kharzul-after-fang');
  assert.equal(afterDialogue(own(g, 'cinderfang', { shattered: true }), 'kharzul-heart', 'victory'), 'kharzul-after', 'a shattered Cinderfang');
  const k = enterDialogue(own(g, 'cinderfang'), 'kharzul-after-fang').game;
  assert.deepEqual(dialogueView(k, 'kharzul-after-fang').choices, [], 'one Sunscorch Brand: no turn for home yet');
  assert.equal(afterDialogue(k, 'kharzul-heart', 'victory'), 'kharzul-again', 'a rematch is not a first win');
  // the Brand of Ash second: both are held, and the party turns for home
  let a = story(brand(k, 'brand-of-ash'), { 'sunscorch-complete': true });
  assert.equal(afterDialogue(a, 'ashen-warden', 'victory'), 'warden-after');
  a = enterDialogue(a, 'warden-after').game;
  assert.equal(pick(a, 'warden-after', /Home/).next, 'sunscorch-home');
  assert.equal(afterDialogue(a, 'ashen-warden', 'victory'), 'warden-again');
  // the Ladder: Kharzul's poster fills in when sighted and is settled once beaten
  const poster = (x, id) => ladder(x).find(p => p.id === id).state;
  assert.equal(poster(act1(), 'kharzul'), 'silhouette');
  assert.equal(poster(withProgress(act1(), { flags: { scouted: { 'kharzul-heart': true } } }), 'kharzul'), 'scouted');
  assert.equal(poster(beat(act1(), 'kharzul-heart'), 'kharzul'), 'settled');
  assert.equal(poster(both(act1()), 'missing-smith'), 'silhouette', 'Ironspire stays a rumour');
});

test('Brother Cinder: Scorchgate\'s history, then the Sleeper under the ash and an ember after the Brand of Ash', () => {
  let g = act1();
  let t = talk(g, 'cinder');
  assert.equal(t.id, 'cinder');
  g = t.game;
  assert.equal(talkTo(g, 'cinder'), 'cinder-again');
  assert.equal(pick(g, 'cinder-again', /Scorchgate burned/).next, 'cinder-history');
  const told = ['cinder-history', 'cinder-sword', 'cinder-vault'].flatMap(id => dialogueView(g, id).lines.map(l => l.text)).join(' ');
  assert.match(told, /burned for a sword/);
  assert.match(told, /Cinderfang/);
  assert.equal(talkTo(wear(g, 'cinderfang'), 'cinder'), 'notice-cinder-fang');
  g = brand(g, 'brand-of-ash');
  t = talk(g, 'cinder');
  assert.equal(t.id, 'cinder-ash');
  assert.equal(t.game.materials.embers, g.materials.embers + 1);
  assert.match(dialogueView(g, 'cinder-ash').lines.map(l => l.text).join(' '), /Sleepers/);
  assert.equal(talkTo(t.game, 'cinder'), 'cinder-after', 'the hint (and the ember) come once');
  assert.equal(restDialogue(t.game, 'last-watchfire'), 'last-watch');
  // straight down to the Warden without ever stopping at the shrine: the hint is also a first meeting
  const straight = talk(brand(act1(), 'brand-of-ash'), 'cinder');
  assert.equal(straight.id, 'cinder-ash');
  assert.ok(flag(straight.game, 'met-cinder'));
});

test('Zara takes the Sandspire bounties in, and the people of the Sunscorch notice what you wear', () => {
  const g = story(beat(act1(), 'dt-skinks', 'sg-wights'), { 'met-zara': true });
  assert.deepEqual(bounties(g).filter(b => b.giver === 'zara').map(b => b.state), ['ready', 'active', 'active', 'ready']);
  const r = pick(g, talkTo(g, 'zara'), /Turn in bounties/);
  assert.equal(r.next, 'zara-paid');
  assert.equal(r.game.gold, g.gold + 60 + 120);
  assert.deepEqual(bounties(r.game).filter(b => b.state === 'done').map(b => b.id), ['b-skinks', 'b-wights']);
  assert.ok(!dialogueView(r.game, 'zara-again').choices.some(c => /Turn in/.test(c.text)), 'nothing left to turn in');
  const a = act1();
  for (const [npc, d] of [['idris', 'idris'], ['ode', 'ode'], ['miner', 'miner'], ['spire-guard', 'spire-guard'], ['water-seller', 'water-seller'], ['pilgrim-mw', 'pilgrim-mw']]) assert.equal(talkTo(a, npc), d, npc);
  assert.ok(dialogueView(a, 'idris').choices.some(c => /Buy/.test(c.text)));
  assert.deepEqual(pick(a, 'idris', /Buy/).events, [{ t: 'open', screen: 'shop:idris' }]);
  assert.deepEqual(pick(a, 'ode', /Buy/).events, [{ t: 'open', screen: 'shop:pithead' }]);
  for (const [npc, relic, d] of [
    ['spire-guard', 'cinderfang', 'notice-guard-cinderfang'], ['hilda', 'cinderfang', 'notice-hilda-cinderfang'], ['hilda', 'dunebreaker', 'notice-hilda-dunebreaker'],
    ['fenwick', 'sunstone-heart', 'notice-fenwick-heart'], ['idris', 'sunstone-heart', 'notice-idris-heart'], ['idris', 'mirage-glass', 'notice-idris-glass'],
    ['ode', 'sunstone-lantern', 'notice-ode-lantern'], ['water-seller', 'qasims-signet', 'notice-water-signet'], ['isolde', 'cinder-crown', 'notice-isolde-crown'],
  ]) assert.equal(talkTo(story(wear(a, relic), { 'heard-south': true }), npc), d, `${npc} notices ${relic}`);
  assert.equal(talkTo(brand(a, 'brand-of-glass'), 'fenwick'), 'fenwick-three');
  assert.equal(talkTo(brand(a, 'brand-of-glass'), 'miner'), 'miner-glass');
});
