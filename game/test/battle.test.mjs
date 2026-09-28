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

// ---- M3 battle hooks (spec §4.7) --------------------------------------------------------------------

test('a First Strike pushes every foe back on the ribbon; ctx.warded Wards every hero', () => {
  const plain = battleWith(RABBLE, { seed: 9 });
  const first = battleWith(RABBLE, { seed: 9, ctx: { firstStrike: true } });
  assert.equal(first.ctx.firstStrike, true);
  assert.ok(first.openingEvents.some(e => e.t === 'text' && /First strike/.test(e.text)));
  // the same seed rolls the same initiative, so each foe is exactly firstStrikeDelay later (or has acted already)
  for (const id of ['f1', 'f2']) {
    const a = plain.units[id], b = first.units[id];
    if (a.next > 0 && plain.actor !== id) assert.equal(b.next - a.next, 40, id);
  }
  const w = battleWith(RABBLE, { seed: 9, ctx: { warded: '2d6+4' } });
  for (const u of Object.values(w.units).filter(x => x.side === 'hero')) {
    const st = u.statuses.find(x => x.id === 'warded');
    assert.ok(st && st.value >= 6 && st.value <= 16, u.id);
  }
});

// ---- M4 Champions and holders (spec §3.2, §3.5; P4) -------------------------------------------------

// Pry one piece loose the way the engine does it (a grip roll that finishes a 1-grip meter).
async function pry(s, foeId, relic) {
  const { applyGrip } = await import('../src/rules/combat.js');
  const { createRng } = await import('../src/core/rng.js');
  const { B } = await import('./helpers.mjs');
  const piece = s.units[foeId].held.find(p => p.relic === relic);
  piece.grip = 1;
  const b = B(s, createRng(`pry:${relic}`));
  applyGrip(b, s.units.pip, s.units[foeId], { dice: '1d4', relic });
  return b.ev;
}

test('Kharzul: prying Cinderfang loose shuts Glasscutter and Molten Tail down; the Carapace keeps its Brace', async () => {
  const { resolveMoveId, refreshIntent } = await import('../src/rules/ai.js');
  const { createRng } = await import('../src/core/rng.js');
  const s = structuredClone(battleWith([{ family: 'kharzul', level: 14 }], { seed: 12 }));
  const k = s.units.f1;
  assert.equal(k.die, 20);
  assert.deepEqual(k.held.map(p => p.relic), ['cinderfang', 'glass-carapace']);
  assert.equal(resolveMoveId(s, k, 'glasscutter'), 'glasscutter');
  // its die shows Glasscutter, charging, when the blade comes loose
  k.intent = { ...k.intent, move: 'glasscutter', name: 'Glasscutter', charging: true, target: null };
  const ev = await pry(s, 'f1', 'cinderfang');
  assert.ok(ev.some(e => e.t === 'disarm' && e.target === 'f1' && e.relic === 'cinderfang'));
  const text = ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text;
  assert.match(text, /Cinderfang clatters loose!/);
  assert.match(text, /Glasscutter/);
  assert.match(text, /Molten Tail/);
  assert.notEqual(k.intent.move, 'glasscutter', 'the charged Glasscutter fizzles: the intent is re-rolled');
  assert.equal(resolveMoveId(s, k, 'glasscutter'), 'tail-lash');
  assert.equal(resolveMoveId(s, k, 'molten-tail'), 'glass-sting');
  assert.equal(resolveMoveId(s, k, 'carapace-brace'), 'carapace-brace', 'the Glass Carapace is still on');
  assert.equal(refreshIntent(s, k, { face: 20, move: 'glasscutter', target: null }, createRng(2)).move, 'tail-lash');
  assert.equal(k.die, 20, 'a Champion keeps its d20');
  // snap the Carapace too: the Brace falls back to Tail Lash
  await pry(s, 'f1', 'glass-carapace');
  assert.equal(resolveMoveId(s, k, 'carapace-brace'), 'tail-lash');
  assert.ok(k.held.every(p => !p.held));
});

test('Kharzul: its phases fire at 66% and 33% of its health, each with its own d20 table', async () => {
  const { dealDamage } = await import('../src/rules/combat.js');
  const { foeTable } = await import('../src/rules/ai.js');
  const { FOES } = await import('../src/data/foes.js');
  const { createRng } = await import('../src/core/rng.js');
  const { B } = await import('./helpers.mjs');
  const s = structuredClone(battleWith([{ family: 'kharzul', level: 14 }], { seed: 12 }));
  const k = s.units.f1;
  const b = B(s, createRng(3));
  // bring it to exactly (floor) or just above (ceil) a share of its health
  const hitTo = (frac, round = Math.floor) => dealDamage(b, s.units.warden, k, k.hp - round(k.maxHp * frac), { kind: 'pierce' });
  hitTo(0.67, Math.ceil);
  assert.equal(k.phase, 1, 'still whole above two-thirds');
  assert.deepEqual(foeTable(k), FOES.kharzul.phases[0].table);
  hitTo(0.66);
  assert.equal(k.phase, 2);
  assert.deepEqual(foeTable(k), FOES.kharzul.phases[1].table);
  assert.ok(foeTable(k).some(([, , m]) => m === 'burrow') && foeTable(k).some(([, , m]) => m === 'carapace-brace'), 'It Burrows');
  hitTo(0.34, Math.ceil);
  assert.equal(k.phase, 2);
  hitTo(0.33);
  assert.equal(k.phase, 3);
  assert.ok(foeTable(k).some(([, , m]) => m === 'glass-rain') && foeTable(k).some(([, , m]) => m === 'molten-tail'), 'Glass Storm');
  const phases = b.ev.filter(e => e.t === 'phase' && e.foe === 'f1');
  assert.deepEqual(phases.map(e => e.phase), [2, 3]);
  assert.deepEqual(phases.map(e => e.text), [FOES.kharzul.phases[1].text, FOES.kharzul.phases[2].text]);
});

test('the Ashen Warden: snapping the Aegis ends Ward of Ash; snapping the Crown ends Command of Cinders and the Watch Unbroken', async () => {
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const s = structuredClone(battleWith([{ family: 'ashen-warden', level: 16 }], { seed: 14 }));
  const w = s.units.f1;
  assert.equal(w.die, 20);
  assert.deepEqual(w.held.map(p => p.relic), ['ashen-aegis', 'cinder-crown']);
  for (const m of ['ward-of-ash', 'command-of-cinders', 'watch-unbroken']) assert.equal(resolveMoveId(s, w, m), m);
  let ev = await pry(s, 'f1', 'ashen-aegis');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Ashen Aegis clatters loose!.*Ward of Ash/);
  assert.equal(resolveMoveId(s, w, 'ward-of-ash'), 'ash-blade');
  assert.equal(resolveMoveId(s, w, 'command-of-cinders'), 'command-of-cinders', 'the Crown still commands');
  ev = await pry(s, 'f1', 'cinder-crown');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Cinder Crown clatters loose!.*Command of Cinders.*The Watch Unbroken/);
  assert.equal(resolveMoveId(s, w, 'command-of-cinders'), 'ash-blade');
  assert.equal(resolveMoveId(s, w, 'watch-unbroken'), 'ash-blade');
  // what needs no piece keeps working: its blade, the fire, and the watch it calls out of the ash
  for (const m of ['ash-blade', 'ember-sweep', 'scorch-the-vault', 'call-the-watch']) assert.equal(resolveMoveId(s, w, m), m);
});

test('the Ashen Warden calls at most two ash-wights out of the ash, four levels below it and worth no XP', async () => {
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { applyEffect } = await import('../src/rules/combat.js');
  const { FOES } = await import('../src/data/foes.js');
  const { createRng } = await import('../src/core/rng.js');
  const { B } = await import('./helpers.mjs');
  const s = structuredClone(battleWith([{ family: 'ashen-warden', level: 16 }], { seed: 14 }));
  const w = s.units.f1;
  const b = B(s, createRng(5));
  const call = FOES['ashen-warden'].moves['call-the-watch'].effects[0];
  for (let i = 0; i < 3; i++) applyEffect(b, w, w, call);
  const watch = Object.values(s.units).filter(u => u.summonedBy === 'f1');
  assert.equal(watch.length, 2);
  assert.ok(watch.every(u => u.family === 'ash-wight' && u.level === w.level - 4 && u.xp === 0));
  assert.equal(resolveMoveId(s, w, 'call-the-watch'), 'ash-blade', 'no third wight');
});

test('Sunscorch holders: each Art needs its relic; pried loose, the Art falls back and the d12 drops to a d8', async () => {
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { FOES } = await import('../src/data/foes.js');
  const HOLDERS = [
    ['dune-raider', 'rider', 'sandwalkers'], ['dune-raider', 'raider-king', 'dunebreaker'], ['mirage-wisp', 'queen', 'mirage-glass'],
    ['ash-wight', 'captain', 'scorchgate-key'], ['tallyman', 'foreman', 'sunstone-lantern'], ['smuggler', 'sharpshooter', 'saltglass'],
  ];
  for (const [family, variant, relic] of HOLDERS) {
    const s = structuredClone(battleWith([{ family, variant, relic, level: 12, gearTier: 2 }], { seed: 6 }));
    const f = s.units.f1;
    const moves = FOES[family].variants[variant].moves;
    const arts = Object.entries(moves).filter(([, m]) => m.requires === relic).map(([id]) => id);
    assert.ok(arts.length, `${variant} has an Art`);
    assert.equal(f.die, 12, `${variant} rolls a d12`);
    for (const id of arts) assert.equal(resolveMoveId(s, f, id), id);
    await pry(s, 'f1', relic);
    assert.equal(f.die, 8, `${variant}: the disarmed die`);
    for (const id of arts) assert.equal(resolveMoveId(s, f, id), moves[id].fallback, `${variant}: ${id} falls back`);
  }
});
