import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, timeline, current, commands, targets, act, foeTurn, outcome, inspect } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { battleWith, playOut, toHeroTurn, party } from './helpers.mjs';

const RABBLE = [{ family: 'cutpurse', level: 1 }, { family: 'thornhound', level: 1 }];

test('createBattle is deterministic per seed and announces every foe intent', () => {
  const a = battleWith(RABBLE, { seed: 5 });
  const b = battleWith(RABBLE, { seed: 5 });
  assert.deepEqual(a, b);
  const intents = a.openingEvents.filter(e => e.t === 'intent');
  assert.deepEqual(intents.map(e => e.foe).sort(), ['f1', 'f2']);
  for (const e of intents) {
    assert.equal(e.die, 6);
    assert.ok(e.face >= 1 && e.face <= 6);
    assert.ok(e.text.startsWith(`${e.face}: `));
  }
  assert.equal(a.openingEvents.filter(e => e.t === 'turn').pop().actor, current(a));
});

test('intent dice grow with tier: d6 rabble, d8 veteran, d12 relic-bearer, d20 champion', () => {
  const s = battleWith([{ family: 'cutpurse', level: 1 }, { family: 'bandit', level: 3 }, { family: 'oldsnag', level: 6 }, { family: 'briarmaw', level: 7 }]);
  assert.deepEqual(['f1', 'f2', 'f3', 'f4'].map(id => s.units[id].intent.die), [6, 8, 12, 20]);
});

test('timeline previews n turns starting with the current actor; fast units appear more often', () => {
  const s = battleWith(RABBLE);
  const line = timeline(s);
  assert.equal(line.length, 8);
  assert.equal(line[0], current(s));
  const long = timeline(s, 40);
  const count = id => long.filter(x => x === id).length;
  // Pip (DEX 16, bow, boots, hood) is quicker than Sister Alondra (DEX 10, mace).
  assert.ok(s.units.pip.delay < s.units.alondra.delay);
  assert.ok(count('pip') > count('alondra'));
});

test('act and foeTurn never mutate their input state', () => {
  let s = battleWith([{ family: 'bandit', level: 2 }, ...RABBLE], { seed: 9 });
  for (let i = 0; i < 40 && current(s); i++) {
    const frozen = JSON.stringify(s);
    const id = current(s);
    const r = s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s);
    assert.equal(JSON.stringify(s), frozen, `step ${i} mutated its input`);
    assert.notEqual(r.state, s);
    s = r.state;
  }
});

test('act refuses the wrong actor and foeTurn refuses a hero turn', () => {
  const s = toHeroTurn(battleWith(RABBLE));
  const hero = current(s);
  const other = ['warden', 'pip', 'bryn', 'alondra'].find(h => h !== hero);
  assert.throws(() => act(s, { type: 'attack', actor: other, target: 'f1' }), /turn/);
  assert.throws(() => foeTurn(s), /foe/);
});

test('commands list attack, skills, items, defend, surge and flee with targets', () => {
  const s = toHeroTurn(battleWith(RABBLE));
  const id = current(s);
  const cmds = commands(s, id);
  const types = new Set(cmds.map(c => c.type));
  for (const t of ['attack', 'skill', 'item', 'defend', 'surge', 'flee']) assert.ok(types.has(t), t);
  const attack = cmds.find(c => c.type === 'attack');
  assert.equal(attack.enabled, true);
  assert.deepEqual(targets(s, attack).sort(), ['f1', 'f2']);
  assert.equal(cmds.find(c => c.type === 'surge').enabled, false);
  const tonic = cmds.find(c => c.id === 'hearth-tonic');
  assert.equal(tonic.count, 3);
  assert.ok(targets(s, tonic).includes('warden'));
});

test('using a Hearth Tonic heals and spends one from the bag', () => {
  let s = toHeroTurn(battleWith(RABBLE));
  const id = current(s);
  s = structuredClone(s);
  s.units.warden.hp = 1;
  const r = act(s, { type: 'item', item: 'hearth-tonic', target: 'warden' });
  const heal = r.events.find(e => e.t === 'heal');
  assert.equal(heal.target, 'warden');
  assert.ok(heal.amount >= 2);
  assert.equal(r.state.bag['hearth-tonic'], 2);
  assert.equal(r.events[0].t, 'move');
  assert.equal(r.events[0].actor, id);
});

test('Legend Surge: a full gauge fires the best relic power with a legend event', () => {
  let s = structuredClone(battleWith([{ family: 'bandit', level: 3 }, { family: 'cutpurse', level: 1 }]));
  for (let i = 0; i < 20 && current(s) !== 'warden'; i++) {
    const id = current(s);
    s = (s.units[id].side === 'hero' ? act(s, { type: 'defend' }) : foeTurn(s)).state;
  }
  assert.equal(current(s), 'warden');
  s = structuredClone(s);
  s.units.warden.surge = 100;
  const surge = commands(s, 'warden').find(c => c.type === 'surge');
  assert.equal(surge.enabled, true);
  assert.equal(surge.power, 'hearthfall');
  const r = act(s, surge);
  const legend = r.events.find(e => e.t === 'legend');
  assert.equal(legend.actor, 'warden');
  assert.equal(legend.power, 'hearthfall');
  assert.equal(legend.item.base, 'hearthbrand');
  assert.ok(r.events.some(e => e.t === 'surge' && e.actor === 'warden' && e.from === 100));
  assert.ok(r.events.filter(e => e.t === 'damage').length >= 2, 'hits every foe');
});

test('surge fills from dealing and taking damage', () => {
  const { events, state } = playOut(battleWith([{ family: 'bandit', level: 2 }, ...RABBLE], { seed: 4 }));
  const surges = events.filter(e => e.t === 'surge');
  assert.ok(surges.length > 0);
  for (const e of surges) assert.ok(e.to >= 0 && e.to <= 100);
  assert.ok(outcome(state).party.some(p => p.surge > 0));
});

test('a battle plays to victory with xp, gold and an outcome that matches the event', () => {
  const { state, events } = playOut(battleWith(RABBLE, { seed: 3 }));
  const out = outcome(state);
  assert.equal(out.result, 'victory');
  assert.ok(out.xp > 0 && out.gold > 0);
  const v = events.find(e => e.t === 'victory');
  assert.equal(v.xp, out.xp);
  assert.equal(typeof out.consumables, 'object');
  assert.equal(Object.values(out.kills).reduce((a, n) => a + n, 0), 2, 'both foes felled by heroes');
  assert.equal(current(state), null);
  assert.deepEqual(timeline(state), []);
});

test('Grip & Claim: a disarmed relic is claimed at victory; killing the holder first shatters it', () => {
  // Disarmed: grip already at 1, one disarm finishes it.
  let s = structuredClone(battleWith([{ family: 'oldsnag', level: 1 }], { seed: 21 }));
  s.units.f1.held[0].grip = 0;
  s.units.f1.held[0].held = false;
  s.units.f1.hp = 1;
  let out = outcome(playOut(s).state);
  assert.equal(out.result, 'victory');
  assert.deepEqual(out.claimed.map(i => i.base), ['thornsplitter']);
  assert.ok(!out.drops.some(i => i.base === 'thornsplitter'));
  // Not disarmed: the holder dies gripping it.
  s = structuredClone(battleWith([{ family: 'oldsnag', level: 1 }], { seed: 21 }));
  s.units.f1.hp = 1;
  out = outcome(playOut(s).state);
  assert.equal(out.claimed.length, 0);
  const shard = out.drops.find(i => i.base === 'thornsplitter');
  assert.equal(shard.shattered, true);
  assert.equal(shard.rarity, 'heirloom');
});

test('the tutorial is gentle: the Warden\'s Seal never shatters', () => {
  const s = structuredClone(battleWith([{ family: 'tallyman', variant: 'thief', level: 1, relic: 'wardens-seal' }], { ctx: { gentle: true } }));
  s.units.f1.hp = 1;
  const out = outcome(playOut(s).state);
  const seal = [...out.claimed, ...out.drops].find(i => i.base === 'wardens-seal');
  assert.ok(seal);
  assert.ok(!seal.shattered);
});

test('no fleeing from a Champion; inspect reveals weaknesses and grip', () => {
  const s = toHeroTurn(battleWith([{ family: 'briarmaw', level: 7 }]));
  const flee = commands(s, current(s)).find(c => c.type === 'flee');
  assert.equal(flee.enabled, false);
  assert.match(flee.reason, /no running/i);
  const info = inspect(s, 'f1');
  assert.ok(info.weakTo.includes('ember') && info.weakTo.includes('crush'));
  assert.ok(info.resists.includes('verdant'));
  assert.deepEqual(info.grip.map(g => g.relic), ['thornwreath', 'briarfang']);
});

test('Analyze queues and reveals the next intent, which the foe then uses', () => {
  let s = structuredClone(battleWith([{ family: 'bandit', level: 3 }], { seed: 2 }));
  for (const h of ['warden', 'pip', 'bryn', 'alondra']) s.units[h].hp = s.units[h].maxHp = 999;
  for (let i = 0; i < 20 && current(s) !== 'bryn'; i++) {
    const id = current(s);
    s = (s.units[id].side === 'hero' ? act(s, { type: 'defend' }) : foeTurn(s)).state;
  }
  const r = act(s, { type: 'skill', skill: 'analyze', target: 'f1' });
  const queued = r.events.find(e => e.t === 'intent' && e.queued);
  assert.ok(queued);
  assert.equal(r.state.units.f1.analyzed, true);
  let t = r.state;
  for (let i = 0; i < 20 && current(t) !== 'f1'; i++) t = act(t, { type: 'defend' }).state;
  const after = foeTurn(t);
  const next = after.events.filter(e => e.t === 'intent' && e.foe === 'f1' && !e.queued).pop();
  assert.equal(next.face, queued.face);
});

test('defeat when every hero falls', () => {
  const { game, heroes } = party();
  const weak = heroes.map(h => ({ ...h, hp: 1 }));
  const s = createBattle({ heroes: weak, foes: [{ family: 'briarmaw', level: 12 }], seed: 3, ctx: { inventory: game.inventory } });
  const out = outcome(playOut(s).state);
  assert.equal(out.result, 'defeat');
  assert.equal(out.xp, 0);
});

test('an ambush delays the party unless someone wears the full Thornwatch set', () => {
  const plain = battleWith(RABBLE, { seed: 8 });
  const hit = battleWith(RABBLE, { seed: 8, ctx: { ambush: true } });
  assert.equal(hit.ctx.ambush, true);
  assert.ok(hit.units.pip.next > plain.units.pip.next || current(hit) !== current(plain));
  const { game } = party();
  const g = structuredClone(game);
  const set = ['thornwatch-hood', 'thornwatch-jerkin', 'thornwatch-boots'].map((base, i) => ({
    uid: `tw${i}`, base, kind: ['hood', 'leather', 'boots'][i], slot: ['head', 'body', 'feet'][i], rarity: 'regalia', ilvl: 3,
    name: base, aspect: 'verdant', affixes: [], gems: [], temper: 0, seed: i + 1, provenance: {}, chronicle: { kills: 0 },
  }));
  g.inventory.push(...set);
  Object.assign(g.party.roster.pip.gear, { head: 'tw0', body: 'tw1', feet: 'tw2' });
  const safe = createBattle({ heroes: g.party.active.map(id => g.party.roster[id]), foes: RABBLE, seed: 8, ctx: { inventory: g.inventory, ambush: true } });
  assert.equal(safe.ctx.ambush, false);
});
