import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAttack, dealDamage, addStatus, applyGrip, damageMult, aspectMult, statusOf } from '../src/rules/combat.js';
import { resolveMoveId } from '../src/rules/ai.js';
import { unitDelay } from '../src/rules/battle.js';
import { battleWith, scriptedRng, B } from './helpers.mjs';

const WEAPON = { type: 'attack', weapon: true };

function duel(foe = { family: 'cutpurse', level: 1 }) {
  const s = structuredClone(battleWith([foe]));
  return { s, hero: s.units.warden, foe: s.units.f1 };
}

test('attack: a roll that meets Guard hits for dice + flat, times the armour chart', () => {
  const { s, hero, foe } = duel();
  const need = foe.guard - hero.stats.weapon.hit; // d20 face that exactly meets Guard
  const b = B(s, scriptedRng([need, 5, 2]));
  const r = resolveAttack(b, hero, foe, WEAPON);
  assert.equal(r, 'hit');
  const roll = b.ev.find(e => e.t === 'roll');
  assert.equal(roll.total, foe.guard);
  assert.equal(roll.vs, foe.guard);
  const dmg = b.ev.find(e => e.t === 'damage');
  // Hearthbrand: 1d8 slash + 1d4 ember + flat; slash vs a cutpurse's hide is x1.25.
  assert.equal(dmg.amount, Math.round((5 + 2 + hero.stats.weapon.flat) * 1.25));
  assert.equal(dmg.dice.length, 2);
  assert.equal(dmg.eff, 'weak');
});

test('attack: natural 20 is a Legend Strike with doubled dice', () => {
  const { s, hero, foe } = duel();
  foe.hp = foe.maxHp = 999;
  const b = B(s, scriptedRng([20, 5, 5, 2, 2]));
  assert.equal(resolveAttack(b, hero, foe, WEAPON), 'crit');
  const dmg = b.ev.find(e => e.t === 'damage');
  assert.equal(dmg.crit, true);
  assert.equal(dmg.dice.length, 4);
  assert.equal(dmg.amount, Math.round((5 + 5 + 2 + 2 + hero.stats.weapon.flat) * 1.25));
});

test('attack: missing by 3 or less is a graze for half damage; by 4 is a miss', () => {
  const { s, hero, foe } = duel();
  foe.hp = foe.maxHp = 999;
  const grazeFace = foe.guard - hero.stats.weapon.hit - 2;
  const b = B(s, scriptedRng([grazeFace, 5, 2]));
  assert.equal(resolveAttack(b, hero, foe, WEAPON), 'graze');
  const dmg = b.ev.find(e => e.t === 'damage');
  assert.equal(dmg.graze, true);
  assert.equal(dmg.amount, Math.round((5 + 2 + hero.stats.weapon.flat) * 0.5 * 1.25));
  const b2 = B(s, scriptedRng([grazeFace - 2]));
  assert.equal(resolveAttack(b2, hero, foe, WEAPON), 'miss');
  assert.equal(b2.ev.filter(e => e.t === 'damage').length, 0);
});

test('attack: natural 1 fumbles and costs ribbon time', () => {
  const { s, hero, foe } = duel();
  const b = B(s, scriptedRng([1]));
  assert.equal(resolveAttack(b, hero, foe, WEAPON), 'fumble');
  assert.equal(hero.fumbled, true);
  assert.equal(b.ev.find(e => e.t === 'roll').result, 'fumble');
});

test('advantage vs a Marked foe keeps the higher die; Frightened attackers keep the lower', () => {
  const { s, hero, foe } = duel();
  foe.hp = foe.maxHp = 999;
  foe.statuses.push({ id: 'marked', stacks: 1, turns: 3 });
  const b = B(s, scriptedRng([3, 15, 1, 1]));
  resolveAttack(b, hero, foe, WEAPON);
  const roll = b.ev.find(e => e.t === 'roll');
  assert.deepEqual(roll.rolls, [3, 15]);
  assert.equal(roll.kept, 15);
  assert.equal(roll.adv, true);
  // Marked also adds +2 damage.
  assert.equal(b.ev.find(e => e.t === 'damage').flat, hero.stats.weapon.flat + 2);
  foe.statuses = [];
  hero.statuses.push({ id: 'frightened', stacks: 1, turns: 2 });
  const b2 = B(s, scriptedRng([3, 15]));
  resolveAttack(b2, hero, foe, WEAPON);
  assert.equal(b2.ev.find(e => e.t === 'roll').kept, 3);
});

test('aspect wheel and armour chart multiply together', () => {
  const s = battleWith([{ family: 'briarling', level: 1 }, { family: 'rotstag', level: 4 }]);
  const briar = s.units.f1, stag = s.units.f2;
  assert.equal(aspectMult('ember', 'verdant'), 1.5);
  assert.equal(aspectMult('verdant', 'ember'), 0.5);
  assert.equal(aspectMult('verdant', 'verdant'), 0.5);
  assert.equal(aspectMult('storm', null), 1);
  assert.equal(damageMult(briar, 'slash', 'ember'), 1.25 * 1.5);
  assert.equal(damageMult(stag, 'radiant', 'radiant'), 1.5);
  assert.equal(damageMult(stag, 'blight', 'blight'), 0.5);
  // Hearthbrand gives its bearer 20% ember resistance.
  assert.equal(damageMult(s.units.warden, 'ember', 'ember'), 0.8);
});

test('statuses: guarding halves, warded absorbs, chilled x3 freezes, stagger breaks a charge', () => {
  const { s, hero, foe } = duel({ family: 'thornhound', level: 1 });
  const b = B(s, scriptedRng());
  hero.hp = hero.maxHp = 100;
  addStatus(b, hero, 'guarding');
  assert.equal(dealDamage(b, foe, hero, 10, { kind: 'pierce' }), 5);
  hero.statuses = [];
  addStatus(b, hero, 'warded', { value: 6 });
  const dealt = dealDamage(b, foe, hero, 10, { kind: 'pierce' });
  assert.equal(dealt, 4);
  assert.equal(b.ev.filter(e => e.t === 'damage').pop().absorbed, 6);
  assert.equal(statusOf(hero, 'warded'), undefined);
  addStatus(b, foe, 'chilled', { stacks: 2 });
  addStatus(b, foe, 'chilled');
  assert.ok(statusOf(foe, 'frozen'));
  assert.equal(statusOf(foe, 'chilled'), undefined);
  foe.intent = { ...foe.intent, name: 'Lunge', charging: true };
  const before = foe.next;
  addStatus(b, foe, 'staggered');
  assert.equal(foe.intent.cancelled, true);
  assert.equal(foe.next, before + 35);
});

test('statuses change ribbon delay: hasted is sooner, chilled is later', () => {
  const { hero } = duel();
  const base = unitDelay(hero);
  assert.ok(unitDelay({ ...hero, statuses: [{ id: 'hasted', stacks: 1, turns: 2 }] }) < base);
  assert.ok(unitDelay({ ...hero, statuses: [{ id: 'chilled', stacks: 2, turns: 2 }] }) > base);
});

test('grip: wearing Old Snag down disarms him, drops his die and removes his Art', () => {
  const { s, hero, foe } = duel({ family: 'oldsnag', level: 6 });
  assert.equal(foe.die, 12);
  assert.equal(resolveMoveId(s, foe, 'splitting-charge'), 'splitting-charge');
  const b = B(s, scriptedRng([], 6));
  const max = foe.held[0].max;
  applyGrip(b, hero, foe, { dice: `${max}d1` });
  const grip = b.ev.find(e => e.t === 'grip');
  assert.equal(grip.from, max);
  assert.equal(grip.to, 0);
  assert.deepEqual(b.ev.find(e => e.t === 'disarm'), { t: 'disarm', target: 'f1', relic: 'thornsplitter' });
  assert.equal(foe.die, 8);
  assert.equal(resolveMoveId(s, foe, 'splitting-charge'), 'tusk');
});

test('grip: crush damage wears the grip; slash does not', () => {
  const { s, hero, foe } = duel({ family: 'oldsnag', level: 6 });
  foe.hp = foe.maxHp = 999;
  const b = B(s, scriptedRng([10, 4, 2], 3));
  resolveAttack(b, hero, foe, { type: 'attack', weapon: true, kind: 'crush' });
  assert.equal(b.ev.filter(e => e.t === 'grip').length, 1);
  const b2 = B(s, scriptedRng([10, 4, 2], 3));
  resolveAttack(b2, hero, foe, WEAPON);
  assert.equal(b2.ev.filter(e => e.t === 'grip').length, 0);
});

test('Briarmaw changes phase at 66% and 33%, and loses powers as pieces break', () => {
  const { s, hero, foe } = duel({ family: 'briarmaw', level: 7 });
  const b = B(s, scriptedRng([], 1));
  dealDamage(b, hero, foe, Math.ceil(foe.maxHp * 0.36), { kind: 'slash' });
  assert.deepEqual(b.ev.filter(e => e.t === 'phase').map(e => e.phase), [2]);
  dealDamage(b, hero, foe, Math.ceil(foe.maxHp * 0.34), { kind: 'slash' });
  assert.deepEqual(b.ev.filter(e => e.t === 'phase').map(e => e.phase), [2, 3]);
  assert.equal(foe.phase, 3);
  assert.equal(resolveMoveId(s, foe, 'call-the-briars'), 'call-the-briars');
  applyGrip(b, hero, foe, { dice: '99d1', relic: 'thornwreath' });
  assert.equal(resolveMoveId(s, foe, 'call-the-briars'), 'maul');
  assert.equal(resolveMoveId(s, foe, 'fang-rake'), 'fang-rake');
  applyGrip(b, hero, foe, { dice: '99d1', relic: 'briarfang' });
  assert.equal(resolveMoveId(s, foe, 'fang-rake'), 'maul');
  assert.equal(foe.die, 20);
});

test('Omens: thornskinned reflects melee, emberblooded hits burn, twinned splits', () => {
  const { s, hero, foe } = duel({ family: 'bandit', level: 3, omens: ['thornskinned', 'emberblooded', 'twinned'] });
  const b = B(s, scriptedRng([15, 6, 3], 3));
  const hpBefore = hero.hp;
  resolveAttack(b, hero, foe, WEAPON);
  assert.ok(hero.hp < hpBefore, 'thorns bounce back');
  const b2 = B(s, scriptedRng([19, 4], 3));
  resolveAttack(b2, foe, hero, { type: 'attack', dice: '1d6', kind: 'slash' });
  assert.ok(statusOf(hero, 'burning'));
  dealDamage(b2, hero, foe, Math.ceil(foe.hp - foe.maxHp * 0.4), { kind: 'slash' });
  assert.ok(b2.ev.some(e => e.t === 'spawn' && e.from === 'f1'));
  assert.equal(Object.values(s.units).filter(u => u.side === 'foe').length, 2);
});
