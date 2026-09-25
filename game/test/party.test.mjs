import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { canUse, equip, unequip, compare, bestHeroFor, reforge } from '../src/rules/party.js';
import { deriveHero } from '../src/rules/stats.js';
import { generateItem, relicItem } from '../src/rules/loot.js';
import { party } from './helpers.mjs';

const item = (base, rarity = 'worn', seed = 1) => generateItem(createRng(seed), { base, rarity, ilvl: 1 });
const withItem = (game, it) => ({ ...game, inventory: [...game.inventory, it] });

test('derived stats: level-1 HP is the full hit die plus CON; Guard from armour and shield', () => {
  const { game } = party();
  const w = deriveHero(game.party.roster.warden, game.inventory);
  assert.equal(w.maxHp, 10 + 2);
  assert.equal(w.guard, 13 + 1 + 2); // chain shirt 13 + DEX 1, heater shield +2
  assert.equal(w.weapon.dice, '1d8'); // Hearthbrand with a shield: one-handed
  assert.equal(w.weapon.hit, 2 + 3 + 1); // prof + STR + relic
  assert.equal(w.ib, 2);
  assert.equal(w.dc, 8 + 2 + 3);
  assert.deepEqual(w.grants, ['kindle-strike']);
  const b = deriveHero(game.party.roster.bryn, game.inventory);
  assert.equal(b.weapon.dice, '1d8'); // versatile staff, empty offhand
  assert.ok(b.maxMp > w.maxMp);
});

test('canUse: Alondra refuses blades, bows need training, shattered relics wait for Hilda', () => {
  const { game } = party();
  const r = game.party.roster;
  assert.equal(canUse(r.alondra, item('longsword')).ok, false);
  assert.match(canUse(r.alondra, item('longsword')).reason, /blade/);
  assert.equal(canUse(r.alondra, item('warhammer')).ok, true);
  assert.equal(canUse(r.bryn, item('shortbow')).ok, false);
  assert.match(canUse(r.bryn, item('shortbow')).reason, /Bows need training/);
  assert.equal(canUse(r.pip, item('longbow')).ok, true);
  assert.equal(canUse(r.pip, item('chain-shirt')).ok, false);
  assert.equal(canUse(r.warden, { ...relicItem('thornsplitter', createRng(1)), shattered: true }).ok, false);
  assert.equal(canUse(r.warden, item('full-plate')).ok, true);
  const weakling = { ...r.warden, base: { ...r.warden.base, STR: 12 } };
  assert.match(canUse(weakling, item('full-plate')).reason, /STR 15/);
});

test('two-handed weapons displace the offhand; an offhand is refused under a two-hander', () => {
  const { game } = party();
  const maul = item('maul');
  const g = withItem(game, maul);
  const shield = g.party.roster.warden.gear.offhand;
  const r = equip(g, 'warden', maul.uid);
  assert.equal(r.ok, true);
  assert.equal(r.game.party.roster.warden.gear.weapon, maul.uid);
  assert.equal(r.game.party.roster.warden.gear.offhand, null);
  assert.ok(r.displaced.includes(shield));
  const back = equip(r.game, 'warden', shield);
  assert.equal(back.ok, false);
  assert.match(back.reason, /both hands/);
  assert.equal(g.party.roster.warden.gear.weapon !== maul.uid, true, 'input not mutated');
});

test('equip moves an item between heroes; unequip clears the slot', () => {
  const { game } = party();
  const ring = item('ring', 'wrought', 3);
  let g = equip(withItem(game, ring), 'pip', ring.uid).game;
  assert.equal(g.party.roster.pip.gear.ring, ring.uid);
  g = equip(g, 'bryn', ring.uid).game;
  assert.equal(g.party.roster.bryn.gear.ring, ring.uid);
  assert.equal(g.party.roster.pip.gear.ring, null);
  g = unequip(g, 'bryn', 'ring');
  assert.equal(g.party.roster.bryn.gear.ring, null);
});

test('compare gives green/red deltas and bestHeroFor picks who gains most', () => {
  const { game } = party();
  const bow = generateItem(createRng(8), { base: 'longbow', rarity: 'tempered', ilvl: 5 });
  const cmp = compare(game.party.roster.pip, bow, game.inventory);
  assert.equal(cmp.ok, true);
  assert.ok(cmp.deltas.dmg > 0);
  assert.ok(cmp.deltas.delay > 0, 'a longbow is slower');
  const nope = compare(game.party.roster.bryn, bow, game.inventory);
  assert.equal(nope.ok, false);
  assert.equal(bestHeroFor(withItem(game, bow), bow), 'pip');
  const plate = item('half-plate', 'wrought', 2);
  assert.ok(compare(game.party.roster.warden, plate, game.inventory).deltas.guard > 0);
});

test('reforge restores a shattered relic for gold', () => {
  const { game } = party();
  const shard = { ...relicItem('thornsplitter', createRng(2)), shattered: true };
  const g = { ...withItem(game, shard), gold: 500 };
  const r = reforge(g, shard.uid);
  assert.equal(r.ok, true);
  assert.ok(r.game.gold < 500);
  assert.equal(r.game.inventory.find(i => i.uid === shard.uid).shattered, undefined);
  assert.equal(reforge({ ...g, gold: 0 }, shard.uid).ok, false);
});
