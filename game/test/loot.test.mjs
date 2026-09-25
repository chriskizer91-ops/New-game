import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateItem, relicItem, rollRarity, rarityWeights, bumpRarity, battleLoot, affixQuality, identifyItem } from '../src/rules/loot.js';
import { RARITY } from '../src/data/rarity.js';
import { AFFIXES } from '../src/data/affixes.js';
import { battleWith } from './helpers.mjs';

const SHAPE = ['uid', 'base', 'kind', 'slot', 'rarity', 'ilvl', 'name', 'aspect', 'affixes', 'gems', 'temper', 'seed', 'provenance', 'chronicle'];

test('same seed, same drop', () => {
  const a = generateItem(createRng('drop-1'), { ilvl: 5, luck: 2, provenance: { from: 'Skarn', where: 'Thornhollow', day: 3 } });
  const b = generateItem(createRng('drop-1'), { ilvl: 5, luck: 2, provenance: { from: 'Skarn', where: 'Thornhollow', day: 3 } });
  assert.deepEqual(a, b);
  const c = generateItem(createRng('drop-2'), { ilvl: 5, luck: 2 });
  assert.notDeepEqual(a, c);
});

test('ItemInstance has the contract shape and a seed for procedural art', () => {
  const it = generateItem(createRng(3), { base: 'longsword', rarity: 'runed', ilvl: 6, provenance: { from: 'a bandit', where: 'Hearth Road', day: 2 } });
  for (const k of SHAPE) assert.ok(k in it, k);
  assert.equal(it.kind, 'sword');
  assert.equal(it.slot, 'weapon');
  assert.equal(it.affixes.length, RARITY.runed.affixes);
  assert.ok(Number.isInteger(it.seed) && it.seed > 0);
  assert.deepEqual(it.provenance, { from: 'a bandit', where: 'Hearth Road', day: 2 });
  assert.deepEqual(it.chronicle, { kills: 0 });
  for (const a of it.affixes) assert.ok(AFFIXES[a.id].slots.includes('weapon'));
});

test('affix counts follow rarity; storied items arrive unidentified with lore and a power', () => {
  const rng = createRng(12);
  for (const r of ['worn', 'wrought', 'tempered', 'runed']) {
    assert.equal(generateItem(rng, { base: 'jerkin', rarity: r, ilvl: 3 }).affixes.length, RARITY[r].affixes);
  }
  const s = generateItem(rng, { base: 'arming-sword', rarity: 'storied', ilvl: 7, provenance: { from: 'Briarmaw' } });
  assert.equal(s.unidentified, true);
  assert.match(s.lore, /Briarmaw/);
  assert.ok(s.power);
  assert.match(s.name, /, /);
  assert.equal(identifyItem(s).unidentified, undefined);
});

test('luck bends the rarity curve toward rarer tiers', () => {
  const share = luck => {
    const w = rarityWeights(luck);
    const total = w.reduce((a, e) => a + e.w, 0);
    return w.filter(e => ['runed', 'storied'].includes(e.v)).reduce((a, e) => a + e.w, 0) / total;
  };
  assert.ok(share(3) > share(1) && share(1) > share(0));
  const rng = createRng(1);
  for (let i = 0; i < 50; i++) assert.ok(['worn', 'wrought'].includes(rollRarity(rng, 0, { max: 'wrought' })));
  assert.equal(bumpRarity('tempered'), 'runed');
  assert.equal(bumpRarity('storied'), 'storied');
});

test('affix quality stars run 1-5', () => {
  assert.equal(affixQuality({ id: 'eldergrown', value: 4 }, 'wrought', 0), 1);
  assert.equal(affixQuality({ id: 'eldergrown', value: 8 }, 'wrought', 0), 5);
});

test('named relic instances carry the relic id as base', () => {
  const it = relicItem('thornwreath', createRng(4), { from: 'Briarmaw' });
  assert.equal(it.base, 'thornwreath');
  assert.equal(it.kind, 'crown');
  assert.equal(it.rarity, 'heirloom');
  assert.equal(it.aspect, 'verdant');
});

test('battle loot: veterans drop what they wear; loot is deterministic per seed', () => {
  const s = structuredClone(battleWith([{ family: 'bandit', level: 3, gearTier: 1, wears: 'thornwatch-hood' }, { family: 'cutpurse', level: 1 }]));
  for (const id of ['f1', 'f2']) { s.units[id].ko = true; s.units[id].hp = 0; }
  const a = battleLoot(s, createRng(99));
  const b = battleLoot(s, createRng(99));
  assert.deepEqual(a, b);
  assert.ok(a.drops.some(i => i.base === 'thornwatch-hood' && i.rarity === 'regalia'));
  // Grudge foes pay one rarity tier higher, stamped.
  const g = structuredClone(s);
  g.units.f1.wears = null;
  g.units.f1.gear = g.units.f1.gear.filter(x => !x.relic);
  g.units.f1.grudge = 'bramble-toll#0';
  const settled = battleLoot(g, createRng(5)).drops.find(i => i.stamp === 'grudge-settled');
  assert.ok(settled);
  assert.ok(RARITY[settled.rarity].rank >= RARITY.wrought.rank);
});
