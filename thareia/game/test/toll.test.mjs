// M6 (spec §4.4; P1): Hodge's daily price. The `{ day }` and `{ afford }` conditions, the `{ pay }` effect (a
// choice that pays shows its price, disabled while the party cannot afford it), and checks that name an ability
// and a label (the toll game). Toll Is Due in battle is tested with the statuses (test/statuses.test.mjs).
// Owner: P1 (M6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { check, canAfford, condErrors, priceErrors } from '../src/rules/cond.js';
import { talkTo, dialogueView, choose, enterDialogue, ladder } from '../src/rules/story.js';
import { DIALOGUE } from '../src/data/dialogue.js';
import { DOMAINS } from '../src/data/domains.js';
import { CONSUMABLES } from '../src/data/items.js';
import { SHOPS } from '../src/data/shops.js';
import { MAPS } from '../src/data/maps/index.js';

const fresh = () => migrate(newGame({ name: 'Tess', seed: 12 }));
const onDay = (game, day) => ({ ...game, progress: { ...game.progress, flags: { ...game.progress.flags, day } } });
// a party with the means: plenty of gold, of every consumable and of every forge material
const rich = game => ({ ...game, gold: 5000, bag: Object.fromEntries(Object.keys(CONSUMABLES).map(id => [id, 9])), materials: { scrap: 9, silver: 9, embers: 9 } });
const poor = game => ({ ...game, gold: 0, bag: {}, materials: {} });

test('{ day: { every, at } } holds on every n-th day from `at` (day 1 when the day is unset)', () => {
  const g = fresh();
  const days = n => [1, 2, 3, 4, 5, 6].filter(d => check(onDay(g, d), n));
  assert.deepEqual(days({ day: { every: 3, at: 1 } }), [1, 4]);
  assert.deepEqual(days({ day: { every: 3, at: 2 } }), [2, 5]);
  assert.deepEqual(days({ day: { every: 3, at: 0 } }), [3, 6]);
  assert.deepEqual(days({ day: { every: 2 } }), [2, 4, 6], '`at` defaults to 0');
  const unset = { ...g, progress: { ...g.progress, flags: { ...g.progress.flags, day: undefined } } };
  assert.equal(check(unset, { day: { every: 3, at: 1 } }), true);
  assert.deepEqual(condErrors({ day: { every: 3, at: 1 } }), []);
  for (const bad of [{ day: { every: 0 } }, { day: { every: 3, at: 3 } }, { day: { every: 2.5 } }, { day: null }]) assert.equal(condErrors(bad).length, 1, JSON.stringify(bad));
});

test('{ afford } holds when the party has every part of the price', () => {
  const g = { ...fresh(), gold: 100, bag: { 'hearth-tonic': 2 }, materials: { silver: 1, scrap: 0 } };
  assert.equal(check(g, { afford: { gold: 100 } }), true);
  assert.equal(check(g, { afford: { gold: 101 } }), false);
  assert.equal(check(g, { afford: { bag: { 'hearth-tonic': 2 } } }), true);
  assert.equal(check(g, { afford: { bag: { 'hearth-tonic': 3 } } }), false);
  assert.equal(check(g, { afford: { bag: { 'ember-salts': 1 } } }), false);
  assert.equal(check(g, { afford: { materials: { silver: 1 } } }), true);
  assert.equal(check(g, { afford: { materials: { scrap: 1 } } }), false);
  assert.equal(check(g, { afford: { gold: 50, bag: { 'hearth-tonic': 1 }, materials: { silver: 1 } } }), true);
  assert.equal(canAfford({ ...g, materials: undefined }, { materials: { silver: 1 } }), false, 'no purse yet');
  assert.deepEqual(condErrors({ afford: { gold: 5 } }), []);
  assert.deepEqual(priceErrors({ gold: 120 }), []);
  for (const bad of [{}, { gold: 0 }, { gold: 1.5 }, { bag: { 'hearth-tonic': -1 } }, { materials: 3 }, { coins: 4 }]) assert.ok(priceErrors(bad).length, JSON.stringify(bad));
});

// Hodge's toll: the choices whose `do` pays, as the dialogue view shows them on a given day
function tollChoices(game) {
  const id = talkTo(game, 'hodge');
  assert.ok(DIALOGUE[id], 'Hodge talks');
  const view = dialogueView(game, id);
  return { id, pays: view.choices.filter(c => c.price) };
}

test('Hodge\'s price changes daily over three days, always one price a day, and something a party can come by', () => {
  const prices = new Set();
  // before the bar: Sedge's shop in Willowmurk, and the chests of the Murkway and Willowmurk
  const chests = ['murkway', 'willowmurk'].flatMap(m => MAPS[m].entities.filter(e => e.kind === 'chest'));
  for (const day of [1, 2, 3, 4]) {
    const { pays } = tollChoices(rich(onDay(fresh(), day)));
    assert.equal(pays.length, 1, `day ${day}: one price`);
    assert.ok(!pays[0].disabled, `day ${day}: a party with the means can pay`);
    const p = pays[0].price;
    for (const id of Object.keys(p.bag || {})) assert.ok(SHOPS.sedge.items.includes(id), `day ${day}: ${id} is sold in Willowmurk, before the bar`);
    for (const [id, n] of Object.entries(p.materials || {})) {
      assert.ok(chests.reduce((a, c) => a + (c.loot?.materials?.[id] || 0), 0) >= n, `day ${day}: ${n} ${id} lie in a chest before the bar`);
    }
    prices.add(JSON.stringify(p));
  }
  assert.equal(prices.size, 3, 'three prices, round again on the fourth day');
});

test('paying takes the price and lifts the bar; a price you cannot meet is shown disabled and refused', () => {
  for (const day of [1, 2, 3]) {
    const game = rich(onDay(fresh(), day));
    const { id, pays: [pay] } = tollChoices(game);
    const r = choose(game, id, pay.i);
    const p = pay.price;
    assert.equal(r.game.gold, game.gold - (p.gold || 0), `day ${day}: gold`);
    for (const [k, n] of Object.entries(p.bag || {})) assert.equal(r.game.bag[k], game.bag[k] - n, `day ${day}: ${k}`);
    for (const [k, n] of Object.entries(p.materials || {})) assert.equal(r.game.materials[k], game.materials[k] - n, `day ${day}: ${k}`);
    assert.ok(r.events.some(e => e.t === 'paid'), 'a paid event');
    assert.equal(check(r.game, { flag: 'toll-paid' }), true, 'the bar lifts');
    // broke: the same choice is disabled, and choosing it does nothing
    const broke = poor(onDay(fresh(), day));
    const { pays: [none] } = tollChoices(broke);
    assert.equal(none.disabled, true, `day ${day}: disabled`);
    const refused = choose(broke, id, none.i);
    assert.equal(refused.game, broke, 'nothing changes');
    assert.deepEqual([refused.next, refused.events.length], [null, 0]);
  }
});

test('a check names an ability and a label: the toll game reads "Deception DC n", not a bare ability', () => {
  const game = fresh();
  const { id } = tollChoices(game);
  const idx = DIALOGUE[id].choices.findIndex(c => c.contest);
  assert.ok(idx >= 0, 'the toll game is a contest');
  const contest = DIALOGUE[id].choices[idx].contest;
  assert.ok(contest.checks.some(c => c.ability), 'one of its checks is a raw ability (spec §4.4)');
  const r = choose(game, id, idx);
  assert.equal(r.roll.parts.length, contest.checks.length);
  contest.checks.forEach((c, k) => {
    const name = c.name || (c.domain ? DOMAINS[c.domain].name.split(' ')[0] : c.ability);
    assert.equal(r.roll.parts[k].label, `${name} DC ${c.dc}`);
  });
  // an ability check adds that ability's modifier (the best active hero's), with no Domain level
  const cha = contest.checks.find(c => c.ability && !c.domain);
  const k = contest.checks.indexOf(cha);
  const best = Math.max(...game.party.active.map(h => Math.floor((game.party.roster[h].base.CHA - 10) / 2)));
  assert.equal(r.roll.parts[k].total - r.roll.parts[k].nat, best);
});

test('meeting Hodge scouts his Ladder poster and sights his toll (his fight never stands on the map)', () => {
  const game = fresh();
  const id = talkTo(game, 'hodge');
  assert.ok(!ladder(game).find(p => p.enc === 'hodge' && p.state !== 'silhouette'), 'a silhouette before');
  const met = enterDialogue(game, id).game;
  assert.equal(met.progress.flags.scouted?.hodge, true);
  assert.equal(met.codex['unfair-toll']?.sighted, true, 'his clipped coin is Sighted');
  assert.equal(met.codex['unfair-toll']?.claimed, false, 'not claimed');
  const poster = ladder(met).find(p => p.enc === 'hodge');
  assert.ok(poster, 'Hodge has a poster');
  assert.equal(poster.state, 'scouted');
  assert.equal(enterDialogue(met, id).game.progress.flags.scouted.hodge, true, 'and again is the same');
});
