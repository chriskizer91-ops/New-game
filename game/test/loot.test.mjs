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

// ---- M3 loot rules (spec §4.7) ------------------------------------------------------------------------

test('a lent relic is never claimed and never shatters; a worn relic drops from a relic-bearer', () => {
  const tamsin = { family: 'tamsin', variant: 'cairnmaul', level: 3, held: [{ relic: 'cairnmaul', lend: true }], wears: 'vale-gauntlets' };
  const s = battleWith([tamsin], { seed: 4 });
  const f = s.units.f1;
  assert.equal(f.held[0].lend, true);
  // disarmed and beaten: still not claimed
  const loose = structuredClone(s);
  loose.units.f1.held[0].held = false;
  loose.units.f1.ko = true;
  let r = battleLoot(loose, createRng(1));
  assert.ok(!r.claimed.some(i => i.base === 'cairnmaul'), 'disarmed, but it goes home with her');
  assert.ok(r.drops.some(i => i.base === 'vale-gauntlets' && !i.shattered), 'the worn gauntlets drop');
  // beaten while still gripping it: never shattered either
  const gripping = structuredClone(s);
  gripping.units.f1.ko = true;
  r = battleLoot(gripping, createRng(1));
  assert.ok(!r.drops.some(i => i.base === 'cairnmaul'));
});

// Milestone 4.5 (no Routs): a pack you run down is a real fight, so its rabble drop comes from the
// battle loot, per foe and deterministically, like any other win.
test('a caught pack\'s rabble drop is the battle loot: rolled per foe, deterministically', () => {
  const s = structuredClone(battleWith([0, 1, 2].map(() => ({ family: 'cutpurse', level: 4 })), { ctx: { caught: true } }));
  for (const id of ['f1', 'f2', 'f3']) { s.units[id].ko = true; s.units[id].hp = 0; }
  const a = battleLoot(s, createRng('caught'));
  assert.deepEqual(battleLoot(s, createRng('caught')), a);
  for (const it of a.drops) assert.ok(['worn', 'wrought', 'tempered'].includes(it.rarity), it.rarity);
  let total = 0;
  for (let k = 0; k < 40; k++) total += battleLoot(s, createRng(`c${k}`)).drops.length;
  assert.ok(total > 0, 'rabble drop something now and then');
});

// ---- M4 (spec §3.3-§3.5; P4) ---------------------------------------------------------------------------

test('Kharzul: a piece pried loose is claimed, a piece it still grips shatters, and a Champion pays two tempered-or-better items', async () => {
  const { RELICS } = await import('../src/data/relics.js');
  const s = structuredClone(battleWith([{ family: 'kharzul', level: 14 }], { seed: 9 }));
  const k = s.units.f1;
  k.held.find(p => p.relic === 'cinderfang').held = false; // pried loose in the fight
  k.ko = true;
  k.hp = 0;
  const { drops, claimed, consumables } = battleLoot(s, createRng(31));
  assert.deepEqual(claimed.map(i => i.base), ['cinderfang']);
  assert.ok(!claimed[0].shattered);
  assert.equal(claimed[0].rarity, 'heirloom');
  const shard = drops.find(i => i.base === 'glass-carapace');
  assert.ok(shard && shard.shattered, 'the Carapace it still wore shatters');
  const random = drops.filter(i => !RELICS[i.base]);
  assert.equal(random.length, 2);
  for (const it of random) assert.ok(RARITY[it.rarity].rank >= RARITY.tempered.rank, it.rarity);
  assert.ok(Object.values(consumables).reduce((a, n) => a + n, 0) >= 1, 'a Champion always leaves a consumable');
});

test('Sunscorch holders drop their relic when pried loose; veterans drop the gear they visibly wear', async () => {
  const s = structuredClone(battleWith([
    { family: 'dune-raider', variant: 'rider', relic: 'sandwalkers', level: 12, gearTier: 2 },
    { family: 'ash-wight', level: 12, gearTier: 2 },
  ], { seed: 3 }));
  s.units.f1.held[0].held = false;
  for (const id of ['f1', 'f2']) { s.units[id].ko = true; s.units[id].hp = 0; }
  const a = battleLoot(s, createRng(8));
  assert.deepEqual(a, battleLoot(s, createRng(8)), 'deterministic per seed');
  assert.deepEqual(a.claimed.map(i => i.base), ['sandwalkers']);
  const worn = new Set(s.units.f2.gear.map(g => g.base));
  assert.ok(a.drops.some(i => worn.has(i.base) && i.provenance.from === s.units.f2.name), 'the wight drops a piece it wears');
});

// ---- M5 (spec §3.4, §3.5, §3.7; P4) ---------------------------------------------------------------------

test('the Ironspire Champions: a piece pried loose is claimed, a piece still held shatters, and each pays two tempered-or-better items', async () => {
  const { RELICS } = await import('../src/data/relics.js');
  for (const [family, loose, held] of [['mother-anvil', 'worldforge-hammer', 'anvil-heart'], ['rime-abbot', 'hushweave-cowl', 'rime-crozier']]) {
    const s = structuredClone(battleWith([{ family, level: 23 }], { seed: 9 }));
    const f = s.units.f1;
    f.held.find(p => p.relic === loose).held = false; // pried loose in the fight
    f.ko = true;
    f.hp = 0;
    const { drops, claimed, consumables } = battleLoot(s, createRng(31));
    assert.deepEqual(claimed.map(i => i.base), [loose], family);
    assert.ok(!claimed[0].shattered && claimed[0].rarity === 'heirloom', family);
    assert.ok(drops.find(i => i.base === held)?.shattered, `${family}: the piece it still held shatters`);
    const random = drops.filter(i => !RELICS[i.base]);
    assert.equal(random.length, 2, family);
    for (const it of random) assert.ok(RARITY[it.rarity].rank >= RARITY.tempered.rank, it.rarity);
    assert.ok(Object.values(consumables).reduce((a, n) => a + n, 0) >= 1, 'a Champion always leaves a consumable');
  }
});

test('Ironspire holders drop their relic when pried loose; Tamsin\'s Ironvein Bracers drop when she falls, while her lent relic goes home', async () => {
  const s = structuredClone(battleWith([
    { family: 'thunder-roc', level: 22 },
    { family: 'tallyman', variant: 'ice-cutter', relic: 'cutters-pick', level: 26, gearTier: 3 },
    { family: 'rime-wraith', variant: 'choir', level: 25 },
  ], { seed: 3 }));
  s.units.f1.held[0].held = false;
  s.units.f2.held[0].held = false;
  for (const id of ['f1', 'f2', 'f3']) { s.units[id].ko = true; s.units[id].hp = 0; }
  const a = battleLoot(s, createRng(8));
  assert.deepEqual(a, battleLoot(s, createRng(8)), 'deterministic per seed');
  assert.deepEqual(a.claimed.map(i => i.base).sort(), ['cutters-pick', 'roc-feather-cloak']);
  // Tamsin at Ironhold: her lent starter is never claimed, the bracers she wears are yours
  const t = structuredClone(battleWith([{ family: 'tamsin', variant: 'cairnmaul', level: 26, gearTier: 4, held: [{ relic: 'cairnmaul', lend: true }], wears: 'ironvein-bracers' }], { seed: 4 }));
  t.units.f1.held[0].held = false;
  t.units.f1.ko = true;
  const r = battleLoot(t, createRng(1));
  assert.ok(!r.claimed.some(i => i.base === 'cairnmaul'), 'her relic goes home with her');
  assert.ok(r.drops.some(i => i.base === 'ironvein-bracers' && !i.shattered && i.rarity === 'heirloom'), 'the Ironvein Bracers drop');
});

test('Ironspire spoils: the Sunscorch\'s tiers, and Frost Opals only from the fights of Frostmere and the caves beneath it', async () => {
  const { TUNING } = await import('../src/data/tuning.js');
  const { ENCOUNTERS } = await import('../src/data/encounters.js');
  const { GEMS } = await import('../src/data/gems.js');
  const F = TUNING.forge;
  assert.ok(GEMS['frost-opal'], 'the Frost Opal is a gem');
  const opals = Object.entries(F.opals);
  assert.ok(opals.length >= 3, 'several Frostmere fights pay one');
  for (const [id, n] of opals) {
    const e = ENCOUNTERS[id];
    assert.ok(e && e.type === 'fight' && e.region === 'ironspire', id);
    assert.ok(['Frostmere', 'Beneath Frostmere'].includes(e.place), `${id}: Frost Opals come only from Frostmere (${e.place})`);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 2, `${id}: ${n}`);
  }
  assert.equal(F.opals['rime-abbot'], 2, 'the Rime-Abbot pays the most');
  // nothing outside Frostmere pays opals, and the Ash Garnets stay Scorchgate's
  for (const e of Object.values(ENCOUNTERS)) if (e.type === 'fight' && !['Frostmere', 'Beneath Frostmere'].includes(e.place)) assert.equal(F.opals[e.id], undefined, e.id);
  for (const id of Object.keys(F.garnets)) assert.equal(ENCOUNTERS[id].region, 'sunscorch');
  assert.deepEqual(F.spoils.champion, { silver: 2, embers: 2 }, 'the tiers the Sunscorch pays');
});

// ---- M6 (spec §3.4, §3.5, §3.7; P4) ---------------------------------------------------------------------

test('the Gloomfen Champions: a piece pried loose is claimed, a piece still held shatters, and each pays two tempered-or-better items', async () => {
  const { RELICS } = await import('../src/data/relics.js');
  for (const [family, loose, held] of [['lantern-mother', 'lamplighters-lantern', 'mourning-veil'], ['blackwater-leviathan', 'deep-pearl', 'corvus-harpoon']]) {
    const s = structuredClone(battleWith([{ family, level: 33 }], { seed: 9 }));
    const f = s.units.f1;
    f.held.find(p => p.relic === loose).held = false; // pried loose in the fight
    f.ko = true;
    f.hp = 0;
    const { drops, claimed, consumables } = battleLoot(s, createRng(31));
    assert.deepEqual(claimed.map(i => i.base), [loose], family);
    assert.ok(!claimed[0].shattered && claimed[0].rarity === 'heirloom', family);
    assert.ok(drops.find(i => i.base === held)?.shattered, `${family}: the piece it still held shatters`);
    const random = drops.filter(i => !RELICS[i.base]);
    assert.equal(random.length, 2, family);
    for (const it of random) assert.ok(RARITY[it.rarity].rank >= RARITY.tempered.rank, it.rarity);
    assert.ok(Object.values(consumables).reduce((a, n) => a + n, 0) >= 1, 'a Champion always leaves a consumable');
  }
});

test('Gloomfen holders drop their relic when pried loose (Hodge\'s toll too); Tamsin\'s Bogstriders drop when she falls, while her lent relic goes home', async () => {
  const s = structuredClone(battleWith([
    { family: 'blackwater-gar', variant: 'old-jaws', relic: 'gar-tooth', level: 34 },
    { family: 'tallyman', variant: 'bargemaster', relic: 'barge-gauntlets', level: 33, gearTier: 3 },
    { family: 'drowned', variant: 'choir', level: 33 },
  ], { seed: 3 }));
  s.units.f1.held[0].held = false;
  s.units.f2.held[0].held = false;
  for (const id of ['f1', 'f2', 'f3']) { s.units[id].ko = true; s.units[id].hp = 0; }
  const a = battleLoot(s, createRng(8));
  assert.deepEqual(a, battleLoot(s, createRng(8)), 'deterministic per seed');
  assert.deepEqual(a.claimed.map(i => i.base).sort(), ['barge-gauntlets', 'gar-tooth']);
  // the choir, a veteran, drops a piece it wears (it wears nothing: a random piece)
  assert.ok(a.drops.some(i => i.provenance.from === s.units.f3.name), 'the chorister leaves something');
  // Hodge's Unfair Toll, pried loose in the terrible fight, is yours
  const h = structuredClone(battleWith([{ family: 'hodge', level: 37, relic: 'unfair-toll', gearTier: 3, omens: ['frenzied', 'swift', 'ironclad'] }], { seed: 5 }));
  h.units.f1.held[0].held = false;
  h.units.f1.ko = true;
  const hl = battleLoot(h, createRng(2));
  assert.deepEqual(hl.claimed.map(i => i.base), ['unfair-toll']);
  assert.ok(!hl.claimed[0].shattered);
  // Tamsin on Rotbridge: her lent starter is never claimed, the Bogstriders she wears are yours
  const t = structuredClone(battleWith([{ family: 'tamsin', variant: 'cairnmaul', kit: 'rotbridge', level: 35, gearTier: 4, held: [{ relic: 'cairnmaul', lend: true }], wears: 'bogstriders' }], { seed: 4 }));
  t.units.f1.held[0].held = false;
  t.units.f1.ko = true;
  const r = battleLoot(t, createRng(1));
  assert.ok(!r.claimed.some(i => i.base === 'cairnmaul'), 'her relic goes home with her');
  assert.ok(r.drops.some(i => i.base === 'bogstriders' && !i.shattered && i.rarity === 'heirloom'), 'the Bogstriders drop');
});

test('Gloomfen spoils: a won fight in the fen pays the Sunscorch\'s tiers, and Bog Amber comes only from the bogs\' fights', async () => {
  const { TUNING } = await import('../src/data/tuning.js');
  const { ENCOUNTERS } = await import('../src/data/encounters.js');
  const { GEMS } = await import('../src/data/gems.js');
  const { newGame, startBattle, resolveBattle } = await import('../src/rules/gauntlet.js');
  const F = TUNING.forge;
  assert.ok(GEMS['bog-amber'], 'the Bog Amber is a gem');
  const ambers = Object.entries(F.ambers);
  assert.ok(ambers.length >= 3, 'several bog fights pay one');
  const BOGS = ['The Lanternfen', 'The Mother\'s Hollow', 'Willowmurk'];
  for (const [id, n] of ambers) {
    const e = ENCOUNTERS[id];
    assert.ok(e && e.type === 'fight' && e.region === 'gloomfen', id);
    assert.ok(BOGS.includes(e.place), `${id}: Bog Amber comes from the bogs (${e.place})`);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 2, `${id}: ${n}`);
  }
  assert.equal(F.ambers['lantern-mother'], 2, 'the Lantern Mother pays the most');
  for (const e of Object.values(ENCOUNTERS)) if (e.type === 'fight' && e.region !== 'gloomfen') assert.equal(F.ambers[e.id], undefined, e.id);
  for (const id of Object.keys(F.opals)) assert.equal(ENCOUNTERS[id].region, 'ironspire');
  // a won fight at the hags' pot: two veterans' scrap, and one Bog Amber
  const game = newGame({ name: 'Tess', seed: 3 });
  const { game: g, battle } = startBattle(game, { nodeId: 'lf-hags' });
  const won = structuredClone(battle);
  for (const u of Object.values(won.units)) if (u.side === 'foe') { u.ko = true; u.hp = 0; }
  won.ended = { result: 'victory', xp: 0, gold: 0, drops: [], claimed: [], consumables: {} };
  const { report } = resolveBattle(g, won);
  assert.deepEqual(report.materials, { scrap: 2 }, 'the hags pay scrap; the leech (rabble) nothing');
  assert.deepEqual(report.gems, { 'bog-amber': 1 });
});

test('M6: Hodge keeps his toll when knocked out still gripping it: it comes loose only by grip', () => {
  const h = structuredClone(battleWith([{ family: 'hodge', level: 37, relic: 'unfair-toll', gearTier: 3, omens: ['frenzied', 'swift', 'ironclad'] }], { seed: 5 }));
  assert.equal(h.units.f1.held[0].held, true, 'still in his grip');
  h.units.f1.ko = true;
  h.units.f1.hp = 0;
  const l = battleLoot(h, createRng(2));
  assert.ok(![...l.claimed, ...l.drops].some(i => i.base === 'unfair-toll'), 'no toll, whole or shattered');
  // any other holder knocked out still gripping drops its relic shattered, as before
  const o = structuredClone(battleWith([{ family: 'blackwater-gar', variant: 'old-jaws', relic: 'gar-tooth', level: 34 }], { seed: 3 }));
  o.units.f1.ko = true;
  o.units.f1.hp = 0;
  assert.ok(battleLoot(o, createRng(8)).drops.some(i => i.base === 'gar-tooth' && i.shattered));
});
