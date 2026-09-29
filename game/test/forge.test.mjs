// M4: Hilda's full forge (spec §4.2, §4.3, §4.5) and the Codex pages (§4.4). Owner: P1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/rules/gauntlet.js';
import { migrate } from '../src/rules/migrate.js';
import { generateItem, relicItem } from '../src/rules/loot.js';
import { createRng } from '../src/core/rng.js';
import { deepFreeze } from '../src/core/freeze.js';
import { deriveHero, heroStats, branchPowerId, POWERS } from '../src/rules/stats.js';
import { equip } from '../src/rules/party.js';
import * as F from '../src/rules/forge.js';
import { relicsOn, pageProgress, pagesDone, pageBonus, markPages, relicDeeds } from '../src/rules/codex.js';
import { enterDialogue } from '../src/rules/story.js';
import { AFFIXES } from '../src/data/affixes.js';
import { ITEMS } from '../src/data/items.js';
import { RELICS } from '../src/data/relics.js';
import { PAGES } from '../src/data/codex.js';
import { DEEDS } from '../src/data/deeds.js';
import { TUNING } from '../src/data/tuning.js';

const start = () => migrate(newGame({ name: 'Tess', seed: 9 }));
const give = (game, ...items) => ({ ...game, inventory: [...game.inventory, ...items] });
const gen = (seed, o) => generateItem(createRng(seed), { ilvl: 6, ...o });
const find = (game, uid) => game.inventory.find(i => i.uid === uid);
const rich = (game, materials = { scrap: 9, silver: 9, embers: 9 }) => ({ ...game, gold: 100000, materials });

test('temper costs: gold by ilvl and step, silver for +4 to +6, embers for +7 to +10; null at +10 or shattered', () => {
  const T = TUNING.temper;
  assert.equal(T.max, 10);
  const fang = relicItem('cinderfang', createRng(1)); // a relic's cost uses its data ilvl (14: x7)
  const half = Math.ceil(RELICS.cinderfang.ilvl / 2);
  const want = [
    [0, {}], [1, {}], [2, {}], [3, { silver: 1 }], [4, { silver: 2 }], [5, { silver: 3 }],
    [6, { embers: 1 }], [7, { embers: 2 }], [8, { embers: 3 }], [9, { embers: 4 }],
  ];
  for (const [t, materials] of want) assert.deepEqual(F.temperCost({ ...fang, temper: t }), { gold: T.base * half * T.mult[t], materials }, `+${t} -> +${t + 1}`);
  assert.equal(F.temperCost({ ...fang, temper: 10 }), null);
  assert.equal(F.temperCost({ ...fang, shattered: true }), null);
  assert.equal(F.temperCost(null), null);
});

test('temper: refusals say why, the purse pays, and the input is never touched', () => {
  const g0 = start();
  const fang = { ...relicItem('cinderfang', createRng(1)), temper: 3 };
  const game = deepFreeze({ ...give(g0, fang, { ...relicItem('dawnbell', createRng(2)), shattered: true }), gold: 5000 });
  assert.equal(F.temper(game, 'nope').reason, 'Nothing to temper');
  assert.match(F.temper(game, game.inventory.at(-1).uid).reason, /Shattered/);
  assert.equal(F.temper(game, fang.uid).reason, 'Needs 1 silver');
  assert.match(F.temper({ ...game, gold: 1, materials: { silver: 5 } }, fang.uid).reason, /^Needs \d+ gold$/);
  const r = F.temper({ ...game, materials: { scrap: 0, silver: 2, embers: 0 } }, fang.uid);
  assert.equal(r.ok, true, r.reason);
  assert.equal(find(r.game, fang.uid).temper, 4);
  assert.equal(r.game.materials.silver, 1);
  assert.equal(r.game.gold, 5000 - r.cost.gold);
  const at6 = { ...game, inventory: game.inventory.map(i => (i.uid === fang.uid ? { ...i, temper: 6 } : i)) };
  assert.equal(F.temper(at6, fang.uid).reason, 'Needs 1 ember');
  const at9 = { ...game, gold: 99999, materials: { embers: 3 }, inventory: game.inventory.map(i => (i.uid === fang.uid ? { ...i, temper: 9 } : i)) };
  assert.equal(F.temper(at9, fang.uid).reason, 'Needs 4 embers');
  assert.equal(find(game, fang.uid).temper, 3, 'untouched');
});

test('reroll: one trait, fresh and eligible, never a group already on the item; the cost climbs; seeded', () => {
  const runed = gen(3, { base: 'longsword', rarity: 'runed', ilvl: 8 });
  assert.equal(runed.affixes.length, 3);
  const g0 = deepFreeze(rich(give(start(), runed)));
  assert.deepEqual(F.rerollCost(runed), { gold: 40 * 4, materials: { silver: 1 } });
  const again = F.reroll(g0, runed.uid, 1);
  const r = F.reroll(g0, runed.uid, 1);
  assert.deepEqual(r, again, 'the same game gives the same reroll');
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(r.before, runed.affixes[1]);
  assert.notEqual(r.after.id, r.before.id, 'a different trait');
  assert.notEqual(r.game.rngState, g0.rngState, 'the dice came from game.rngState');
  assert.equal(r.game.materials.silver, 8);
  assert.equal(r.game.gold, 100000 - 160);
  let g = r.game;
  for (let k = 0; k < 40; k++) {
    const it = find(g, runed.uid);
    const i = k % 3;
    const step = F.reroll(g, runed.uid, i);
    assert.equal(step.ok, true, step.reason);
    assert.equal(step.cost.gold, 40 * 4 * (1 + it.rerolls), 'x (1 + rerolls so far)');
    const now = find(step.game, runed.uid);
    const defs = now.affixes.map(a => AFFIXES[a.id]);
    assert.equal(now.affixes.length, 3);
    assert.equal(new Set(now.affixes.map(a => a.id)).size, 3, 'no trait twice');
    const groups = defs.map(a => a.group).filter(Boolean);
    assert.equal(new Set(groups).size, groups.length, 'no group twice');
    for (const a of defs) assert.ok(a.slots.includes('weapon') && a.minTier <= 3, `${a.id} fits a runed weapon`);
    assert.ok(defs.filter(a => a.type === 'prefix').length <= 2 && defs.filter(a => a.type === 'suffix').length <= 2);
    const pre = defs.find(a => a.type === 'prefix'), suf = defs.find(a => a.type === 'suffix');
    assert.equal(now.name, [pre?.name, ITEMS.longsword.name, suf?.name].filter(Boolean).join(' '), 'renamed for its traits');
    g = { ...step.game, gold: 100000, materials: { scrap: 9, silver: 9, embers: 9 } };
  }
  const wrought = gen(4, { base: 'ring', rarity: 'wrought', ilvl: 3 });
  assert.deepEqual(F.rerollCost(wrought), { gold: 40 * 2, materials: { scrap: 1 } });
  const poor = give(start(), wrought);
  assert.equal(F.reroll({ ...poor, gold: 999 }, wrought.uid, 0).reason, 'Needs 1 scrap');
  assert.equal(F.reroll(poor, wrought.uid, 5).reason, 'Pick a trait to reroll.');
  const worn = gen(5, { base: 'ring', rarity: 'worn' });
  assert.equal(F.rerollCost(worn), null);
  assert.equal(F.reroll(rich(give(start(), worn)), worn.uid, 0).reason, 'It has no trait to reroll.');
  const warden = start();
  assert.match(F.reroll(rich(warden), warden.party.roster.warden.gear.weapon, 0).reason, /relic/);
  const storied = gen(6, { base: 'ring', rarity: 'storied' });
  assert.equal(F.reroll(rich(give(start(), storied)), storied.uid, 0).reason, 'Identify it first.');
});

test('salvage: yields by rarity, set gems come back; never a relic, never what someone wears', () => {
  const want = { worn: { scrap: 1 }, wrought: { scrap: 2 }, tempered: { silver: 1, scrap: 1 }, runed: { silver: 2 }, storied: { embers: 1, silver: 1 } };
  for (const [rarity, materials] of Object.entries(want)) {
    assert.deepEqual(F.salvageYield(gen(7, { base: 'amulet', rarity })), { materials, gems: {} }, rarity);
  }
  const set = { ...gen(8, { base: 'amulet', rarity: 'runed' }), gems: ['ash-garnet'] };
  const g0 = deepFreeze({ ...give(start(), set), materials: { scrap: 0, silver: 1, embers: 0 }, gems: { 'ash-garnet': 1 } });
  const r = F.salvage(g0, set.uid);
  assert.equal(r.ok, true, r.reason);
  assert.equal(find(r.game, set.uid), undefined);
  assert.deepEqual(r.yield, { materials: { silver: 2 }, gems: { 'ash-garnet': 1 } });
  assert.deepEqual(r.game.materials, { scrap: 0, silver: 3, embers: 0 });
  assert.deepEqual(r.game.gems, { 'ash-garnet': 2 });
  const w = start();
  assert.equal(F.salvageYield(find(w, w.party.roster.warden.gear.weapon)), null);
  assert.match(F.salvage(w, w.party.roster.warden.gear.weapon).reason, /relic/);
  assert.equal(F.salvage(w, w.party.roster.pip.gear.weapon).reason, 'Take it off first.');
  assert.equal(F.salvage(w, 'nope').reason, 'Nothing to salvage');
});

test('sockets: runed and storied have one, relics their data (1 if unsaid); setting, swapping and taking gems out', () => {
  for (const rarity of ['worn', 'wrought', 'tempered']) assert.equal(F.socketsOf(gen(9, { base: 'ring', rarity })), 0, rarity);
  for (const rarity of ['runed', 'storied']) assert.equal(F.socketsOf(gen(9, { base: 'ring', rarity })), 1, rarity);
  for (const r of Object.values(RELICS)) assert.equal(F.socketsOf(relicItem(r.id, createRng(1))), r.sockets ?? 1, r.id);
  const ring = gen(10, { base: 'ring', rarity: 'runed', ilvl: 7 });
  assert.deepEqual(F.socketCost(ring), { gold: 20 * 4, materials: {} });
  const g0 = deepFreeze({ ...give(start(), ring), gold: 1000, gems: { sunstone: 1, 'glass-pearl': 2 } });
  assert.equal(F.socket(g0, ring.uid, 1, 'sunstone').reason, 'No such socket.');
  assert.equal(F.socket(g0, ring.uid, 0, 'ruby').reason, 'No such gem.');
  assert.match(F.socket(g0, ring.uid, 0, 'ash-garnet').reason, /You have no Ash Garnet/);
  assert.equal(F.socket({ ...g0, gold: 3 }, ring.uid, 0, 'sunstone').reason, 'Needs 80 gold');
  assert.equal(F.socket(g0, gen(11, { base: 'ring', rarity: 'worn' }).uid, 0, 'sunstone').reason, 'Nothing to set a gem in');
  const plain = gen(11, { base: 'ring', rarity: 'wrought' });
  assert.equal(F.socket(give(g0, plain), plain.uid, 0, 'sunstone').reason, 'It has no socket.');
  let r = F.socket(g0, ring.uid, 0, 'sunstone');
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(find(r.game, ring.uid).gems, ['sunstone']);
  assert.deepEqual(r.game.gems, { sunstone: 0, 'glass-pearl': 2 });
  assert.equal(r.game.gold, 920);
  assert.equal(F.socket(r.game, ring.uid, 0, 'sunstone').reason, 'That gem is already set there.');
  r = F.socket(r.game, ring.uid, 0, 'glass-pearl');
  assert.equal(r.ok, true, 'a gem already there goes back to the pouch');
  assert.deepEqual(find(r.game, ring.uid).gems, ['glass-pearl']);
  assert.deepEqual(r.game.gems, { sunstone: 1, 'glass-pearl': 1 });
  const out = F.unsocket(r.game, ring.uid, 0);
  assert.equal(out.ok, true);
  assert.deepEqual(find(out.game, ring.uid).gems, [null]);
  assert.deepEqual(out.game.gems, { sunstone: 1, 'glass-pearl': 2 });
  assert.equal(F.unsocket(out.game, ring.uid, 0).reason, 'No gem in that socket.');
  assert.deepEqual(find(g0, ring.uid).gems, [], 'untouched');
});

test('gems reach the stats: a weapon takes the gem\'s weapon side, anything else its other side', () => {
  const g0 = start();
  const uid = g0.party.roster.warden.gear.weapon;
  const seal = relicItem('wardens-seal', createRng(3));
  const base = equip(give(g0, seal), 'warden', seal.uid).game;
  const d0 = deriveHero(base.party.roster.warden, base.inventory);
  const setGem = (g, id, gem) => ({ ...g, inventory: g.inventory.map(i => (i.uid === id ? { ...i, gems: [gem] } : i)) });
  const d = (id, gem) => { const g = setGem(base, id, gem); return deriveHero(g.party.roster.warden, g.inventory); };
  assert.deepEqual(d(uid, 'sunstone').weapon.extra.slice(-1)[0], { dice: '1d4', aspect: 'ember' }, 'Sunstone: +1d4 ember on a hit');
  assert.equal(d(uid, 'glass-pearl').weapon.hit, d0.weapon.hit + 1);
  assert.equal(d(uid, 'ash-garnet').critRange, d0.critRange - 1);
  assert.equal(d(uid, 'moss-agate').vsHurt.length, d0.vsHurt.length + 1);
  assert.equal(d(seal.uid, 'sunstone').resist.ember, (d0.resist.ember || 0) + 10);
  assert.equal(d(seal.uid, 'moss-agate').regen, d0.regen + 1);
  assert.equal(d(seal.uid, 'glass-pearl').maxMp, d0.maxMp + 4);
  assert.equal(d(seal.uid, 'ash-garnet').maxHp, d0.maxHp + 6);
  assert.equal(d(seal.uid, 'no-such-gem').maxHp, d0.maxHp, 'unknown gems count for nothing');
});

test('Idris sells gems at their price; the Ash Garnet is never for sale', () => {
  const g = deepFreeze({ ...start(), gold: 300 });
  const r = F.buyGem(g, 'sunstone', 2);
  assert.equal(r.ok, true);
  assert.equal(r.game.gold, 120);
  assert.equal(r.game.gems.sunstone, 2);
  assert.equal(F.buyGem(g, 'ash-garnet').reason, 'Not for sale');
  assert.equal(F.buyGem(g, 'glass-pearl', 3).reason, 'Needs 330 gold');
});

test('stages: a relic is Dormant, one deed Kindles it (+1 hit, +1 Guard or +5 HP), non-relics have none', () => {
  const g0 = start();
  const uid = g0.party.roster.warden.gear.weapon;
  const blade = find(g0, uid);
  assert.equal(F.stageOf(blade), 'dormant');
  const deeds = F.deedsOf(blade);
  assert.equal(deeds.length, 3);
  assert.deepEqual(deeds.map(x => x.id), relicDeeds('hearthbrand'));
  for (const x of deeds) { assert.ok(DEEDS[x.id]); assert.equal(x.done, false); assert.ok(x.name && x.text); }
  const kindle = (g, id) => ({ ...g, inventory: g.inventory.map(i => (i.uid === id ? { ...i, deeds: { [relicDeeds(i.base)[0]]: 3 } } : i)) });
  const k = kindle(g0, uid);
  assert.equal(F.stageOf(find(k, uid)), 'kindled');
  assert.equal(F.deedsOf(find(k, uid)).filter(x => x.done).length, 1);
  const K = TUNING.forge.kindled;
  assert.equal(deriveHero(k.party.roster.warden, k.inventory).weapon.hit, deriveHero(g0.party.roster.warden, g0.inventory).weapon.hit + K.hit);
  const shield = relicItem('oathshield', createRng(5)), seal = relicItem('wardens-seal', createRng(6));
  let g = equip(equip(give(g0, shield, seal), 'warden', shield.uid).game, 'warden', seal.uid).game;
  const before = deriveHero(g.party.roster.warden, g.inventory);
  g = kindle(kindle(g, shield.uid), seal.uid);
  const after = deriveHero(g.party.roster.warden, g.inventory);
  assert.equal(after.guard, before.guard + K.guard, 'a shield: +1 Guard');
  assert.equal(after.maxHp, before.maxHp + K.hp, 'a jewel: +5 max HP');
  const ring = gen(12, { base: 'ring', rarity: 'runed' });
  assert.equal(F.stageOf(ring), null);
  assert.deepEqual(F.deedsOf(ring), []);
});

test('awakening: the three deeds first, then Hilda\'s rite; the path follows the bearer\'s best Domain', () => {
  const g0 = start();
  const uid = g0.party.roster.warden.gear.weapon;
  assert.equal(F.awakenOptions(g0, g0.party.roster.pip.gear.weapon).why, 'Only relics awaken.');
  const o = F.awakenOptions(g0, uid);
  assert.equal(o.ready, false);
  assert.equal(o.why, '0 of 3 deeds done.');
  assert.deepEqual(o.cost, { gold: 150 * Math.ceil(RELICS.hearthbrand.ilvl / 2), materials: { embers: 2 } });
  for (const b of o.branches) assert.equal(b.enabled, false);
  // paths: the Hand for physical, combat, survival and beastmastery; the Heart for the rest; the primary
  // Domain wins a tie
  const H = g0.party.roster;
  assert.equal(F.bestDomainOf(H.warden), 'combat');
  assert.deepEqual(['warden', 'pip', 'bryn', 'alondra'].map(id => F.pathOf(H[id])), ['a', 'a', 'b', 'b']);
  const scholar = { ...H.warden, domains: { ...H.warden.domains, influence: { level: 9 } } };
  assert.equal(F.bestDomainOf(scholar), 'influence');
  assert.equal(F.pathOf(scholar), 'b');
  assert.equal(F.awaken(g0, 'nope', 'a').reason, 'Only relics awaken.');
});

test('the rite: the path is the bearer\'s, and advice names only heroes who can carry the relic', () => {
  const g0 = start();
  // an amulet anyone can wear: on the Warden (the Hand) its Heart branch waits for Bryn or Alondra
  const glass = relicItem('mirage-glass', createRng(1234));
  const ready = it => ({ ...it, deeds: Object.fromEntries(relicDeeds(it.base).map(d => [d, 2])) });
  let g = equip(give(g0, ready(glass)), 'warden', glass.uid).game;
  const o = F.awakenOptions(g, glass.uid);
  assert.equal(o.ready, true);
  const [a, b] = ['a', 'b'].map(id => o.branches.find(x => x.id === id));
  assert.deepEqual([a.enabled, a.path, a.note], [true, 'the Hand', null]);
  assert.equal(b.enabled, false);
  assert.match(b.why, /the Heart \(Bryn, Sister Alondra\)/);
  assert.equal(F.awaken({ ...g, gold: 5000, materials: { embers: 2 } }, glass.uid, 'b').reason, b.why);
  // on Bryn (the Heart) it is the other way round
  g = equip(g, 'bryn', glass.uid).game;
  const ob = F.awakenOptions(g, glass.uid);
  assert.deepEqual(ob.branches.map(x => x.enabled), [false, true]);
  assert.match(ob.branches[0].why, /the Hand \(Tess, Pip\)/);
});

test('the rite: a branch no carrier\'s path reaches opens for the bearer (Hearthbrand, a sword only the Hand holds)', () => {
  const g0 = start();
  const uid = g0.party.roster.warden.gear.weapon;
  const A = RELICS.hearthbrand.awaken;
  assert.ok(A?.a?.name && A?.b?.name, 'Hearthbrand has both branches');
  const ready = { ...g0, gold: 1000, materials: { scrap: 0, silver: 0, embers: 1 },
    inventory: g0.inventory.map(i => (i.uid === uid ? { ...i, deeds: Object.fromEntries(relicDeeds('hearthbrand').map(d => [d, 2])) } : i)) };
  const o = F.awakenOptions(deepFreeze(ready), uid);
  assert.equal(o.ready, true);
  assert.equal(o.why, null);
  const [a, b] = ['a', 'b'].map(id => o.branches.find(x => x.id === id));
  assert.deepEqual([a.enabled, a.name, a.path, a.note], [true, A.a.name, 'the Hand', null]);
  assert.deepEqual([b.enabled, b.why], [true, null], 'neither Bryn nor Alondra can hold a sword');
  assert.match(b.note, /Nobody who can carry it walks the Heart/);
  assert.equal(F.awaken(ready, uid, 'a').reason, 'Needs 2 embers');
  const before = deriveHero(ready.party.roster.warden, ready.inventory);
  const r = F.awaken({ ...ready, materials: { embers: 2 } }, uid, 'a');
  assert.equal(r.ok, true, r.reason);
  const blade = find(r.game, uid);
  assert.equal(blade.awakened, 'a');
  assert.equal(F.stageOf(blade), 'awakened');
  assert.equal(r.game.codex.hearthbrand.awakened, true);
  assert.equal(r.game.codex.hearthbrand.claimed, true);
  assert.equal(r.game.materials.embers, 0);
  assert.equal(r.game.gold, 1000 - 150 * Math.ceil(RELICS.hearthbrand.ilvl / 2));
  const after = deriveHero(r.game.party.roster.warden, r.game.inventory);
  const S = A.a.stats || {};
  if (S.hp) assert.equal(after.maxHp, before.maxHp + S.hp);
  if (S.guard) assert.equal(after.guard, before.guard + S.guard);
  if (S.speed) assert.equal(after.speed, before.speed + S.speed);
  if (S.hit) assert.equal(after.weapon.hit, before.weapon.hit + S.hit);
  if (S.dmg) assert.equal(after.weapon.flat, before.weapon.flat + S.dmg);
  if (A.a.power) assert.equal(after.powers.find(p => p.uid === uid).power, branchPowerId('hearthbrand', 'a'));
  assert.equal(F.awakenOptions(r.game, uid).why, 'It is already awake.');
  // off the Warden, nobody carries it: both paths say to equip it
  const bag = { ...ready, party: { ...ready.party, roster: { ...ready.party.roster, warden: { ...ready.party.roster.warden, gear: { ...ready.party.roster.warden.gear, weapon: null } } } } };
  for (const x of F.awakenOptions(bag, uid).branches) assert.match(x.why, /^Equip it on the one who will carry it/);
});

test('every relic\'s two branches can be taken by someone in the party (no dead branch)', () => {
  const g0 = start();
  for (const r of Object.values(RELICS)) {
    const it = { ...relicItem(r.id, createRng(1)), deeds: Object.fromEntries(relicDeeds(r.id).map(d => [d, 1])) };
    const open = new Set();
    for (const id of g0.party.active) {
      const g = equip(give(g0, it), id, it.uid);
      if (!g.ok) continue;
      for (const b of F.awakenOptions(g.game, it.uid).branches) if (b.enabled) open.add(b.id);
    }
    assert.deepEqual([...open].sort(), ['a', 'b'], `${r.id}: branches someone can take`);
  }
});

test('every relic has three deeds and both branches, and an awakened Surge resolves to a real power', () => {
  for (const r of Object.values(RELICS)) {
    const deeds = relicDeeds(r.id);
    assert.equal(deeds.length, 3, `${r.id} deeds`);
    for (const d of deeds) assert.ok(DEEDS[d], `${r.id}: ${d}`);
    for (const k of ['a', 'b']) {
      assert.ok(r.awaken?.[k]?.name && r.awaken[k].text, `${r.id} branch ${k}`);
      if (r.awaken[k].power) assert.ok(POWERS[branchPowerId(r.id, k)], `${r.id} branch ${k}: its power resolves`);
    }
  }
});

// ---- the Codex binder (spec §4.4) ---------------------------------------------------------------------

const claimAll = (game, ids) => ({ ...game, codex: { ...game.codex, ...Object.fromEntries(ids.map(id => [id, { sighted: true, claimed: true, awakened: false }])) } });

test('Codex pages: I holds Nos. 1-24, II Nos. 25-38, III Nos. 39-52, IV Nos. 53-66; the starters you did not choose are not needed', () => {
  assert.deepEqual(relicsOn('verdant').map(id => RELICS[id].codex), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(relicsOn('sunscorch').map(id => RELICS[id].codex), Array.from({ length: 14 }, (_, i) => i + 25));
  assert.deepEqual(relicsOn('ironspire').map(id => RELICS[id].codex), Array.from({ length: 14 }, (_, i) => i + 39));
  assert.deepEqual(relicsOn('gloomfen').map(id => RELICS[id].codex), Array.from({ length: 14 }, (_, i) => i + 53));
  const g = start();
  const p = pageProgress(g, 'verdant');
  assert.deepEqual([p.total, p.needed, p.claimed, p.done], [24, 22, 1, false], 'your starter and the other 21');
  const others = relicsOn('verdant').filter(id => !RELICS[id].starter);
  const done = claimAll(g, others);
  assert.equal(pageProgress(done, 'verdant').done, true);
  assert.deepEqual(pagesDone(done), ['verdant']);
  assert.equal(pageProgress(claimAll(g, others.slice(1)), 'verdant').done, false, 'one missing');
  assert.deepEqual(pagesDone(claimAll(g, relicsOn('sunscorch'))), ['sunscorch']);
  assert.deepEqual(pagesDone(claimAll(g, relicsOn('ironspire'))), ['ironspire']);
  assert.deepEqual(pagesDone(claimAll(g, relicsOn('gloomfen'))), ['gloomfen']);
  // M6: Page IV is open, with its reward (M6 spec §3.4); no page is sealed any more
  assert.equal(PAGES.find(x => x.id === 'gloomfen').reward.name, 'The Gloomfen Covenant');
  assert.ok(PAGES.every(x => x.from != null && x.reward), 'every page holds relics and pays a reward');
});

test('a finished page pays every hero for good: +5% max HP (I), +1 hit and 10% ember resist (II)', () => {
  const g = start();
  const all = claimAll(g, [...relicsOn('verdant').filter(id => !RELICS[id].starter), ...relicsOn('sunscorch')]);
  assert.deepEqual(pageBonus(g), {});
  assert.deepEqual(pageBonus(all), { hpPct: 5, hit: 1, resist: { ember: 10 } });
  for (const id of all.party.active) {
    const plain = deriveHero(all.party.roster[id], all.inventory);
    const paid = heroStats(all, id);
    assert.equal(paid.maxHp, Math.round(plain.maxHp * 1.05), `${id}: +5% max HP`);
    assert.equal(paid.weapon.hit, plain.weapon.hit + 1);
    assert.equal(paid.hitOther, plain.hitOther + 1, 'spells too');
    assert.equal(paid.resist.ember, (plain.resist.ember || 0) + 10);
  }
  // recorded pages keep paying (the reward is permanent)
  const kept = { ...g, progress: { ...g.progress, flags: { ...g.progress.flags, pages: { sunscorch: 12 } } } };
  assert.deepEqual(pageBonus(kept), { hit: 1, resist: { ember: 10 } });
  // markPages records a page once, on the day it finished
  const m = structuredClone(all);
  m.progress.flags.day = 7;
  assert.deepEqual(markPages(m), ['verdant', 'sunscorch']);
  assert.deepEqual(m.progress.flags.pages, { verdant: 7, sunscorch: 7 });
  assert.deepEqual(markPages(m), [], 'only once');
});

test('a gift that finishes a page says so (story event) and records it', () => {
  const g = start();
  const need = relicsOn('verdant').filter(id => !RELICS[id].starter && id !== 'watchkeepers-kettle');
  const r = enterDialogue(claimAll(g, need), 'garret-won');
  assert.ok(r.events.some(e => e.t === 'item' && e.item.base === 'watchkeepers-kettle'));
  assert.ok(r.events.some(e => e.t === 'page' && e.id === 'verdant'));
  assert.equal(r.game.progress.flags.pages.verdant, r.game.progress.flags.day);
  assert.equal(enterDialogue(g, 'garret-won').events.some(e => e.t === 'page'), false);
});

test('reforging a shattered relic Claims it: its page can finish, and its holder carries an Echo from then on', async () => {
  const { reforge } = await import('../src/rules/party.js');
  const { spawnsFor } = await import('../src/rules/gauntlet.js');
  const g0 = start();
  const others = relicsOn('verdant').filter(id => !RELICS[id].starter && id !== 'thornsplitter');
  const shard = { ...relicItem('thornsplitter', createRng(4321)), shattered: true };
  const g = deepFreeze({ ...claimAll(give(g0, shard), others), gold: 9999, codex: { ...claimAll(g0, others).codex, thornsplitter: { sighted: true, claimed: false, awakened: false } } });
  assert.equal(pageProgress(g, 'verdant').done, false, 'one short while it is in pieces');
  const r = reforge(g, shard.uid);
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.game.codex.thornsplitter.claimed, true);
  assert.deepEqual(r.pages, ['verdant']);
  assert.equal(r.game.progress.flags.pages.verdant, r.game.progress.flags.day);
  assert.equal(g.progress.flags.pages?.verdant, undefined, 'the input is untouched');
  const snag = spawnsFor(r.game, 'snag-wallow').find(s => s.family === 'oldsnag');
  assert.ok(snag.held.every(h => h.item && !h.relic), 'Old Snag carries an Echo now');
});

test('the rite Claims the relic even where the Codex says otherwise', () => {
  const g0 = start();
  const uid = g0.party.roster.warden.gear.weapon;
  const g = { ...g0, gold: 5000, materials: { embers: 2 }, codex: { ...g0.codex, hearthbrand: { sighted: true, claimed: false, awakened: false } },
    inventory: g0.inventory.map(i => (i.uid === uid ? { ...i, deeds: Object.fromEntries(relicDeeds('hearthbrand').map(d => [d, 2])) } : i)) };
  const r = F.awaken(g, uid, 'a');
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual([r.game.codex.hearthbrand.claimed, r.game.codex.hearthbrand.awakened], [true, true]);
});
