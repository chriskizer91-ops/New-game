// M5 statuses (spec §4.2): burrowed, swallowed and charmed, as rules/battle.js and rules/combat.js give
// them their effect. Owner: P1 (M5). The Champions and holders that use them are tested with their data
// (test/battle.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, current, commands, targets, act, foeTurn } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { addStatus, dealDamage, statusOf } from '../src/rules/combat.js';
import { unitsOf, chooseTarget, targetable, intentFor, familyData } from '../src/rules/ai.js';
import { createRng } from '../src/core/rng.js';
import { TUNING } from '../src/data/tuning.js';
import { battleWith, toHeroTurn, party, B } from './helpers.mjs';

const put = (u, id, o = {}) => u.statuses.push({ id, stacks: 1, turns: null, value: null, source: null, ...o });

// Play on with the autoplay policy until `stop(state, events)` holds (or the battle ends).
function playUntil(state, stop, max = 400) {
  let s = state;
  const events = [];
  for (let i = 0; current(s) && i < max; i++) {
    const id = current(s);
    const r = s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s);
    s = r.state;
    events.push(...r.events);
    if (stop(s, events)) break;
  }
  return { state: s, events };
}

test('burrowed: nothing can target it, area moves pass over it, and it comes up at its next turn', () => {
  const s = structuredClone(toHeroTurn(battleWith([{ family: 'thornhound', level: 3 }, { family: 'thornhound', level: 3 }], { seed: 21 })));
  const hero = current(s);
  put(s.units.f1, 'burrowed', { source: 'f1' });
  assert.equal(targetable(s.units.f1), false);
  assert.deepEqual(targets(s, { actor: hero, targeting: 'enemy' }), ['f2']);
  assert.deepEqual(targets(s, { actor: hero, targeting: 'all-enemies' }), ['f2'], 'an area move passes over it');
  assert.throws(() => act(s, { type: 'attack', target: 'f1' }), /Invalid target/);
  assert.equal(autoCommand(s, hero).target, 'f2');
  // with every foe under the floor there is nothing to hit: Auto braces instead
  const both = structuredClone(s);
  put(both.units.f2, 'burrowed', { source: 'f2' });
  assert.equal(commands(both, hero).find(c => c.id === 'attack').enabled, false);
  assert.equal(autoCommand(both, hero).type, 'defend');
  // it surfaces as its own turn starts, and nobody hit it before then
  const { state, events } = playUntil(s, (st, ev) => ev.some(e => e.t === 'move' && e.actor === 'f1'));
  const surfaced = events.findIndex(e => e.t === 'status' && e.target === 'f1' && e.status === 'burrowed' && e.op === 'remove');
  assert.ok(surfaced >= 0, 'burrowed ends at its turn start');
  assert.ok(!events.slice(0, surfaced).some(e => e.t === 'damage' && e.target === 'f1'), 'no blow landed while it was under');
  assert.ok(!statusOf(state.units.f1, 'burrowed'));
});

test('a forced intent (a move\'s `then`) names the move, keeps the die face and aims at someone who can be hit', () => {
  const s = structuredClone(battleWith([{ family: 'bandit', level: 3 }], { seed: 5 }));
  const f = s.units.f1;
  const heroes = unitsOf(s, 'hero');
  for (const h of heroes.slice(1)) put(h, 'swallowed', { source: 'f1' });
  const it = intentFor(s, f, 'heavy-swing', createRng(3), 7);
  assert.equal(it.move, 'heavy-swing');
  assert.equal(it.face, 7);
  assert.equal(it.forced, true);
  assert.equal(it.charging, true);
  assert.equal(it.target, heroes[0].id, 'only the hero still in the line');
  assert.ok(familyData(f).moves[it.move]);
});

test('swallowed: out of the line, loses its turns to the swallower\'s tick, and comes back when the turns run out', () => {
  const s0 = structuredClone(battleWith([{ family: 'oldsnag', level: 8 }], { seed: 9 }));
  const heroes = unitsOf(s0, 'hero');
  const h = heroes[2];
  const b = B(s0, createRng(4));
  assert.ok(addStatus(b, h, 'swallowed', { source: 'f1', label: 'Held under' }));
  assert.equal(statusOf(h, 'swallowed').label, 'Held under');
  assert.equal(statusOf(h, 'swallowed').turns, 2);
  // nobody can reach it: not its friends' heals, not the foe's claws
  const other = heroes[0];
  assert.ok(!targets(s0, { actor: other.id, targeting: 'ally' }).includes(h.id));
  const rng = createRng(8);
  for (let i = 0; i < 60; i++) assert.notEqual(chooseTarget(s0, s0.units.f1, { target: 'enemy' }, rng), h.id);
  // two of its own turns: each one a tick from the swallower and a lost turn, then it is back
  let s = s0;
  const events = [];
  for (let i = 0; i < 400 && current(s); i++) {
    const id = current(s);
    assert.notEqual(id, h.id, 'a swallowed hero is never asked to act');
    const r = s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s);
    s = r.state;
    events.push(...r.events);
    if (!statusOf(s.units[h.id], 'swallowed') || !s.units[h.id].hp) break;
  }
  const lost = events.filter(e => e.t === 'text' && e.text.startsWith(`${h.name} is held under by`));
  const ticks = events.filter(e => e.t === 'damage' && e.target === h.id && e.actor === 'f1' && e.kind === (s0.units.f1.aspect || 'crush'));
  assert.ok(s.units[h.id].hp > 0, 'it lives through the hold (this seed)');
  assert.equal(lost.length, 2, 'two turns lost');
  assert.equal(ticks.length, 2, 'a tick at each');
  assert.ok(events.some(e => e.t === 'status' && e.target === h.id && e.status === 'swallowed' && e.op === 'remove'));
  assert.ok(targetable(s.units[h.id]), 'back in the line');
});

test('swallowed: spat out when the swallower falls or takes a hard hit; the last one standing is never swallowed', () => {
  const s = structuredClone(battleWith([{ family: 'oldsnag', level: 8 }], { seed: 9 }));
  const [a, b2, c, d] = unitsOf(s, 'hero');
  const f = s.units.f1;
  // a hit under the threshold keeps its grip; one at it lets go
  const x = B(structuredClone(s), createRng(1));
  const fx = x.s.units.f1, cx = x.s.units[c.id];
  addStatus(x, cx, 'swallowed', { source: 'f1' });
  dealDamage(x, x.s.units[a.id], fx, Math.floor(fx.maxHp * TUNING.swallow.releasePct) - 1, { kind: 'slash' });
  assert.ok(statusOf(cx, 'swallowed'), 'a small hit does not free it');
  dealDamage(x, x.s.units[a.id], fx, Math.ceil(fx.maxHp * TUNING.swallow.releasePct), { kind: 'slash' });
  assert.ok(!statusOf(cx, 'swallowed'), 'a hard hit does');
  assert.ok(x.ev.some(e => e.t === 'text' && e.text.startsWith(`${c.name} is spat out`)));
  // the swallower falls: everyone it held is free
  const y = B(structuredClone(s), createRng(1));
  addStatus(y, y.s.units[c.id], 'swallowed', { source: 'f1' });
  dealDamage(y, y.s.units[a.id], y.s.units.f1, y.s.units.f1.hp, { kind: 'slash' });
  assert.ok(y.s.units.f1.ko && !statusOf(y.s.units[c.id], 'swallowed'));
  // three held, the fourth is spat straight back out: a party is never wiped by being swallowed
  const z = B(structuredClone(s), createRng(1));
  for (const h of [a, b2, c]) assert.ok(addStatus(z, z.s.units[h.id], 'swallowed', { source: 'f1' }));
  assert.equal(addStatus(z, z.s.units[d.id], 'swallowed', { source: 'f1' }), false);
  assert.ok(z.ev.some(e => e.t === 'text' && /spat straight back out/.test(e.text)));
  assert.ok(targetable(z.s.units[d.id]));
  assert.ok(f.hp > 0);
});

test('a party left with only the held standing: they are let go at once (spec §4.2; review)', () => {
  const s = structuredClone(battleWith([{ family: 'oldsnag', level: 8 }], { seed: 9 }));
  const [a, b2, c, d] = unitsOf(s, 'hero');
  const x = B(s, createRng(1));
  assert.ok(addStatus(x, x.s.units[c.id], 'swallowed', { source: 'f1' }));
  // the others fall one by one; while anyone else stands, the held one stays held
  for (const h of [a, b2]) dealDamage(x, x.s.units.f1, x.s.units[h.id], 9999, { kind: 'slash' });
  assert.ok(x.s.units[a.id].ko && x.s.units[b2.id].ko);
  assert.ok(statusOf(x.s.units[c.id], 'swallowed'), 'still held while one other stands');
  dealDamage(x, x.s.units.f1, x.s.units[d.id], 9999, { kind: 'slash' });
  assert.ok(x.s.units[d.id].ko && !x.s.units.f1.ko, 'the last free hero falls; the swallower stands');
  assert.ok(!statusOf(x.s.units[c.id], 'swallowed') && targetable(x.s.units[c.id]), 'let go once nobody else stands');
  assert.ok(x.ev.some(e => e.t === 'status' && e.target === c.id && e.status === 'swallowed' && e.op === 'release'));
  assert.ok(x.ev.some(e => e.t === 'text' && e.text.startsWith(`${x.s.units[c.id].name} is spat back out`)));
});

test('a Provoked foe whose provoker is held aims at someone it can hit, not at the held one (review)', () => {
  let checked = 0;
  for (let seed = 1; seed <= 40 && checked < 5; seed++) {
    let s = battleWith([{ family: 'thornhound', level: 3 }], { seed });
    for (let i = 0; i < 40 && current(s) && s.units[current(s)].side === 'hero'; i++) s = act(s, autoCommand(s, current(s))).state;
    if (!current(s)) continue;
    s = structuredClone(s);
    const f = s.units[current(s)];
    if (familyData(f).moves[f.intent?.move]?.target !== 'enemy') continue;
    const provoker = unitsOf(s, 'hero').find(targetable);
    put(f, 'provoked', { source: provoker.id, turns: 2 });
    put(provoker, 'swallowed', { source: f.id });
    const r = foeTurn(s);
    // the foe's own move (after it, the held one's turn starts with its holder's tick, which is right)
    const end = r.events.findIndex(e => e.t === 'turn');
    const landed = (end < 0 ? r.events : r.events.slice(0, end)).filter(e => (e.t === 'roll' || e.t === 'damage') && e.actor === f.id);
    assert.ok(landed.length, `seed ${seed}: the move is rolled at someone`);
    assert.ok(!landed.some(e => e.target === provoker.id), `seed ${seed}: not at the held provoker`);
    checked++;
  }
  assert.ok(checked >= 3, `${checked} single-target turns checked`);
});

test('Auto does not count on a held reviver: a downed friend gets Ember Salts while she is held (review)', () => {
  const { game, heroes } = party();
  let s = toHeroTurn(createBattle({ heroes, foes: [{ family: 'thornhound', level: 2 }], seed: 3, ctx: { inventory: game.inventory, bag: { 'ember-salts': 2 } } }));
  s = structuredClone(s);
  const me = current(s);
  const [reviver, down] = unitsOf(s, 'hero').filter(h => h.id !== me);
  reviver.skills = [...reviver.skills, 'revive'];
  reviver.mp = 99;
  down.hp = 0; down.ko = true; down.statuses = [];
  for (const h of unitsOf(s, 'hero')) if (!h.ko) h.hp = h.maxHp;
  s.units[me].surge = 0;
  const salts = c => c.id === 'ember-salts';
  assert.ok(!salts(autoCommand(s, me)), 'a free reviver will raise them herself');
  put(reviver, 'swallowed', { source: 'f1' });
  const cmd = autoCommand(s, me);
  assert.ok(salts(cmd) && cmd.target === down.id, `a held one cannot: ${JSON.stringify({ id: cmd.id, target: cmd.target })}`);
});

test('charmed: the turn plays itself as a plain attack on a friend, then the charm is gone', () => {
  const { game, heroes } = party();
  const s0 = createBattle({ heroes, foes: [{ family: 'thornhound', level: 2 }], seed: 31, ctx: { inventory: game.inventory, bag: game.bag } });
  let s = structuredClone(toHeroTurn(s0));
  // charm the hero who acts after the current one
  const order = unitsOf(s, 'hero').filter(h => h.id !== current(s)).sort((p, q) => p.next - q.next);
  const c = order[0];
  put(s.units[c.id], 'charmed', { source: 'f1' });
  const { state, events } = playUntil(s, (st, ev) => ev.some(e => e.t === 'move' && e.actor === c.id && e.charm));
  const mv = events.find(e => e.t === 'move' && e.actor === c.id && e.charm);
  assert.ok(mv, 'the charmed turn is played');
  assert.ok(unitsOf(state, 'hero').some(h => h.id === mv.target && h.id !== c.id), 'it turns on a friend, never itself');
  const roll = events.find(e => e.t === 'roll' && e.actor === c.id && e.purpose === 'attack');
  assert.equal(roll.target, mv.target);
  assert.ok(!statusOf(state.units[c.id], 'charmed'), 'then the charm clears');
});

test('charmed: alone, it shakes the charm off; hit by a friend, it wakes', () => {
  const s = structuredClone(battleWith([{ family: 'thornhound', level: 2 }], { seed: 3 }));
  const [a, b2] = unitsOf(s, 'hero');
  const x = B(s, createRng(2));
  put(x.s.units[b2.id], 'charmed');
  dealDamage(x, x.s.units[a.id], x.s.units[b2.id], 1, { kind: 'crush' });
  assert.ok(!statusOf(x.s.units[b2.id], 'charmed'));
  assert.ok(x.ev.some(e => e.t === 'text' && e.text === `${b2.name} snaps out of the charm.`));
  // with every friend down (and nothing in the bag to raise them), its next turn is a shake of the head
  const lone = structuredClone(toHeroTurn(battleWith([{ family: 'thornhound', level: 2 }], { seed: 3 })));
  const p = lone.units[current(lone)];
  for (const h of unitsOf(lone, 'hero')) if (h.id !== p.id) { h.ko = true; h.hp = 0; }
  lone.bag = {};
  put(p, 'charmed', { turns: null }); // charmed mid-turn: it is the NEXT turn that plays itself
  const { events } = playUntil(lone, (st, ev) => ev.some(e => e.t === 'text' && /shakes off the charm/.test(e.text)), 60);
  assert.ok(events.some(e => e.t === 'text' && e.text === `${p.name} shakes off the charm.`));
  assert.ok(!events.some(e => e.t === 'move' && e.charm), 'no friend to turn on');
});
