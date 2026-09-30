import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, timeline, current, commands, targets, act, foeTurn, outcome, inspect } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { battleWith, playOut, toHeroTurn, party } from './helpers.mjs';
import { relicItem } from '../src/rules/loot.js';
import { createRng } from '../src/core/rng.js';

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

// ---- M5: the Ironspire's Champions and holders, and M4's moves made exact (spec §2.4, §3.2, §3.5; P4) ----------

// Keep every hero standing (the helpers' party is level 1): tests of what a foe does, not of who survives it.
const sturdy = s => { for (const id of s.order) if (s.units[id].side === 'hero') { s.units[id].hp = s.units[id].maxHp = 999; } return s; };
// Resolve one effect of a foe's move at a hero with a scripted RNG: `face` for the first d20, then every other roll `rest`.
async function strike(s, foeId, heroId, eff, face, rest) {
  const { applyEffect } = await import('../src/rules/combat.js');
  const { scriptedRng, B } = await import('./helpers.mjs');
  const b = B(s, scriptedRng([face], rest));
  applyEffect(b, s.units[foeId], s.units[heroId], eff);
  return b.ev;
}

test('Kharzul\'s Burrow is exact (spec §2.4): it goes under the floor where nothing can reach it, then erupts at its next turn', async () => {
  const { statusOf } = await import('../src/rules/combat.js');
  let s = sturdy(structuredClone(battleWith([{ family: 'kharzul', level: 14 }], { seed: 12 })));
  s.units.f1.intent = { ...s.units.f1.intent, move: 'burrow', name: 'Burrow', target: 'f1', charging: false };
  for (let i = 0; i < 40 && current(s) !== 'f1'; i++) s = act(s, autoCommand(s, current(s))).state;
  const r = foeTurn(s);
  s = r.state;
  assert.ok(statusOf(s.units.f1, 'burrowed'), 'under the floor');
  assert.equal(s.units.f1.intent.move, 'erupt', 'its next intent is forced: the eruption');
  assert.equal(s.units.f1.intent.charging, true);
  const hero = current(s);
  assert.equal(s.units[hero].side, 'hero');
  assert.deepEqual(targets(s, { actor: hero, targeting: 'enemy' }), [], 'nothing can target it');
  assert.equal(autoCommand(s, hero).type, 'defend', 'Auto braces for what comes up');
  const events = [];
  for (let i = 0; i < 40 && current(s); i++) {
    const id = current(s);
    const step = s.units[id].side === 'hero' ? act(s, autoCommand(s, id)) : foeTurn(s);
    events.push(...step.events);
    s = step.state;
    if (events.some(e => e.t === 'move' && e.actor === 'f1')) break;
  }
  const up = events.findIndex(e => e.t === 'status' && e.target === 'f1' && e.status === 'burrowed' && e.op === 'remove');
  const erupt = events.findIndex(e => e.t === 'move' && e.actor === 'f1' && e.move === 'erupt');
  assert.ok(up >= 0 && erupt > up, 'it surfaces as its turn starts, and the eruption lands');
  assert.ok(!events.slice(0, up).some(e => e.t === 'damage' && e.target === 'f1'), 'no blow landed while it was under');
});

test('the Sand Wyrm swallows you whole, the Thunder-Roc carries you off, and the Rime-Abbot holds you under the ice', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { statusOf } = await import('../src/rules/combat.js');
  const CASES = [['sand-wyrm', 'swallow', 'Swallowed'], ['thunder-roc', 'carry-off', 'Carried off'], ['rime-abbot', 'drown', 'Held under']];
  for (const [family, move, label] of CASES) {
    const s = sturdy(structuredClone(battleWith([{ family, level: 6 }], { seed: 7 })));
    const eff = FOES[family].moves[move].effects.find(e => e.riders?.some(x => x.status === 'swallowed'));
    assert.ok(eff, `${family}/${move} swallows`);
    await strike(s, 'f1', 'pip', eff, 19, 1); // a hit, the least damage
    const st = statusOf(s.units.pip, 'swallowed');
    assert.ok(st, `${family}: Pip is out of the line`);
    assert.equal(st.label, label, `${family}: the plate reads "${label}"`);
    assert.equal(st.source, 'f1');
  }
});

test('a mirage-wisp\'s Beguile and the Rime-Abbot\'s Hushing charm a hero who fails the WIS save (spec §2.4, §3.5)', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { statusOf } = await import('../src/rules/combat.js');
  for (const [family, variant, move] of [['mirage-wisp', null, 'beguile'], ['mirage-wisp', 'queen', 'beguile'], ['rime-abbot', null, 'hushing']]) {
    const spawn = { family, level: 6, ...(variant ? { variant, relic: 'mirage-glass' } : {}) };
    const fail = sturdy(structuredClone(battleWith([spawn], { seed: 5 })));
    const moves = variant ? FOES[family].variants[variant].moves : FOES[family].moves;
    for (const eff of moves[move].effects) await strike(fail, 'f1', 'bryn', eff, 1, 1); // a natural 1 always fails
    assert.ok(statusOf(fail.units.bryn, 'charmed'), `${family}${variant ? `/${variant}` : ''}: charmed`);
    const save = sturdy(structuredClone(battleWith([spawn], { seed: 5 })));
    for (const eff of moves[move].effects) await strike(save, 'f1', 'bryn', eff, 20, 20); // a natural 20 always saves
    assert.ok(!statusOf(save.units.bryn, 'charmed'), `${family}: saved`);
  }
});

test('Mother Anvil: the Hammer powers Anvil Strike and the Worldforge Blow, the Heart powers Temper and Heart Flare; her phases at 66% and 33%', async () => {
  const { resolveMoveId, foeTable } = await import('../src/rules/ai.js');
  const { dealDamage } = await import('../src/rules/combat.js');
  const { FOES } = await import('../src/data/foes.js');
  const { createRng } = await import('../src/core/rng.js');
  const { B } = await import('./helpers.mjs');
  const s = structuredClone(battleWith([{ family: 'mother-anvil', level: 20 }], { seed: 14 }));
  const a = s.units.f1;
  assert.equal(a.die, 20);
  assert.deepEqual(a.held.map(p => p.relic), ['worldforge-hammer', 'anvil-heart']);
  for (const m of ['anvil-strike', 'worldforge-blow', 'temper', 'heart-flare']) assert.equal(resolveMoveId(s, a, m), m);
  let ev = await pry(s, 'f1', 'worldforge-hammer');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Worldforge Hammer clatters loose!.*Anvil Strike.*Worldforge Blow/);
  assert.equal(resolveMoveId(s, a, 'anvil-strike'), 'hammerfall');
  assert.equal(resolveMoveId(s, a, 'worldforge-blow'), 'hammerfall');
  assert.equal(resolveMoveId(s, a, 'temper'), 'temper', 'the Heart still beats');
  ev = await pry(s, 'f1', 'anvil-heart');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Anvil Heart clatters loose!.*Temper.*Heart Flare/);
  assert.equal(resolveMoveId(s, a, 'temper'), 'hammerfall');
  assert.equal(resolveMoveId(s, a, 'heart-flare'), 'sparks');
  for (const m of ['hammerfall', 'sparks', 'steam-burst', 'bellows']) assert.equal(resolveMoveId(s, a, m), m, `${m} needs no piece`);
  assert.equal(a.die, 20, 'a Champion keeps its d20');
  // the phases
  const s2 = structuredClone(battleWith([{ family: 'mother-anvil', level: 20 }], { seed: 14 }));
  const m = s2.units.f1;
  const b = B(s2, createRng(3));
  const hitTo = (frac, round = Math.floor) => dealDamage(b, s2.units.warden, m, m.hp - round(m.maxHp * frac), { kind: 'slash' });
  hitTo(0.67, Math.ceil);
  assert.equal(m.phase, 1);
  hitTo(0.66);
  assert.equal(m.phase, 2);
  assert.deepEqual(foeTable(m), FOES['mother-anvil'].phases[1].table);
  hitTo(0.33);
  assert.equal(m.phase, 3);
  assert.deepEqual(b.ev.filter(e => e.t === 'phase').map(e => e.text), [FOES['mother-anvil'].phases[1].text, FOES['mother-anvil'].phases[2].text]);
});

test('Mother Anvil\'s Bellows and the Bellows blow at most two helpers each, and they are worth nothing', async () => {
  const { applyEffect } = await import('../src/rules/combat.js');
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { FOES } = await import('../src/data/foes.js');
  const { createRng } = await import('../src/core/rng.js');
  const { B } = await import('./helpers.mjs');
  const CASES = [[{ family: 'mother-anvil', level: 20 }, FOES['mother-anvil'].moves.bellows, 'bellows', 'forgeborn', 4], [{ family: 'forgeborn', variant: 'bellows', level: 20 }, FOES.forgeborn.variants.bellows.moves['blow-sparks'], 'blow-sparks', 'forge-spark', 2]];
  for (const [spawn, move, id, family, below] of CASES) {
    const s = structuredClone(battleWith([spawn], { seed: 2 }));
    const f = s.units.f1;
    const b = B(s, createRng(6));
    for (let i = 0; i < 3; i++) applyEffect(b, f, f, move.effects[0]);
    const called = Object.values(s.units).filter(u => u.summonedBy === 'f1');
    assert.equal(called.length, 2, `${id}: two at most`);
    assert.ok(called.every(u => u.family === family && u.level === f.level - below && u.xp === 0 && u.noLoot), `${id}: ${family}s, ${below} levels down, worth nothing`);
    assert.notEqual(resolveMoveId(s, f, id), id, `${id} falls back once two stand`);
  }
});

test('the Rime-Abbot: the Crozier powers Rime Ward, the Cowl powers Hushing; Call the Choir raises at most two of his drowned choir', async () => {
  const { resolveMoveId, foeTable } = await import('../src/rules/ai.js');
  const { applyEffect, dealDamage } = await import('../src/rules/combat.js');
  const { FOES } = await import('../src/data/foes.js');
  const { createRng } = await import('../src/core/rng.js');
  const { B } = await import('./helpers.mjs');
  const s = structuredClone(battleWith([{ family: 'rime-abbot', level: 20 }], { seed: 16 }));
  const r = s.units.f1;
  assert.deepEqual(r.held.map(p => p.relic), ['rime-crozier', 'hushweave-cowl']);
  let ev = await pry(s, 'f1', 'rime-crozier');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Rime Crozier clatters loose!.*Rime Ward/);
  assert.equal(resolveMoveId(s, r, 'rime-ward'), 'crozier-strike');
  assert.equal(resolveMoveId(s, r, 'hushing'), 'hushing', 'the Cowl still hushes');
  ev = await pry(s, 'f1', 'hushweave-cowl');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Hushweave Cowl clatters loose!.*Hushing/);
  assert.equal(resolveMoveId(s, r, 'hushing'), 'toll');
  for (const m of ['crozier-strike', 'toll', 'drown', 'call-the-choir', 'heartbeat', 'rime-nova']) assert.equal(resolveMoveId(s, r, m), m, `${m} needs no piece`);
  // the choir answers him, two at most, four levels down
  const b = B(s, createRng(4));
  for (let i = 0; i < 3; i++) applyEffect(b, r, r, FOES['rime-abbot'].moves['call-the-choir'].effects[0]);
  const choir = Object.values(s.units).filter(u => u.summonedBy === 'f1');
  assert.equal(choir.length, 2);
  assert.ok(choir.every(u => u.family === 'rime-wraith' && u.variant === 'choir' && u.name === 'Choir-Wraith' && u.level === r.level - 4 && u.xp === 0), 'his own choir');
  assert.equal(resolveMoveId(s, r, 'call-the-choir'), 'crozier-strike', 'no third');
  // Vespers, Compline, Hush
  const s2 = structuredClone(battleWith([{ family: 'rime-abbot', level: 20 }], { seed: 16 }));
  const x = s2.units.f1;
  const b2 = B(s2, createRng(3));
  dealDamage(b2, s2.units.warden, x, x.hp - Math.floor(x.maxHp * 0.66), { kind: 'slash' });
  assert.deepEqual([x.phase, foeTable(x)], [2, FOES['rime-abbot'].phases[1].table]);
  dealDamage(b2, s2.units.warden, x, x.hp - Math.floor(x.maxHp * 0.33), { kind: 'slash' });
  assert.deepEqual([x.phase, foeTable(x)], [3, FOES['rime-abbot'].phases[2].table]);
});

test('Ironspire holders: each Art needs its relic; pried loose, the Art falls back and the d12 drops to a d8', async () => {
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { FOES } = await import('../src/data/foes.js');
  const HOLDERS = [
    ['brigand', 'warden', 'windstep-boots'], ['iron-sentinel', 'captain', 'ironwall'], ['forgeborn', 'journeyman', 'runestaff'],
    ['peak-troll', 'old-horn', 'trollhide-mantle'], ['rime-wraith', 'abbess', 'drowned-censer'], ['tallyman', 'ice-cutter', 'cutters-pick'],
  ];
  for (const [family, variant, relic] of HOLDERS) {
    const s = structuredClone(battleWith([{ family, variant, relic, level: 20, gearTier: 3 }], { seed: 6 }));
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
  // the Thunder-Roc holds its cloak the same way (a family relic)
  const s = structuredClone(battleWith([{ family: 'thunder-roc', level: 20 }], { seed: 6 }));
  assert.equal(resolveMoveId(s, s.units.f1, 'storm-mantle'), 'storm-mantle');
  await pry(s, 'f1', 'roc-feather-cloak');
  assert.equal(resolveMoveId(s, s.units.f1, 'storm-mantle'), 'talons');
  assert.equal(s.units.f1.die, 8);
});

test('Iron Stance (Ironwall, M5): its bearer starts every fight Guarding until its own first turn; nobody else does (review)', () => {
  const { game, heroes } = party();
  const shield = relicItem('ironwall', createRng(41));
  const bearer = heroes[0].id;
  const withShield = heroes.map(h => (h.id === bearer ? { ...h, gear: { ...h.gear, offhand: shield.uid } } : h));
  const s = createBattle({ heroes: withShield, foes: [{ family: 'thornhound', level: 2 }], seed: 5, ctx: { inventory: [...game.inventory, shield] } });
  const guarding = u => u.statuses.some(st => st.id === 'guarding');
  assert.ok(guarding(s.units[bearer]), 'the bearer starts braced');
  for (const h of heroes.filter(h => h.id !== bearer)) assert.ok(!guarding(s.units[h.id]), `${h.id} does not`);
  assert.ok(s.openingEvents.some(e => e.t === 'text' && /braced behind Ironwall/.test(e.text)));
  // carried in the pack, not worn: no stance
  const packed = createBattle({ heroes, foes: [{ family: 'thornhound', level: 2 }], seed: 5, ctx: { inventory: [...game.inventory, shield] } });
  assert.ok(!guarding(packed.units[bearer]), 'only its bearer, and only while worn');
  // it lasts until the bearer's own first turn starts
  let t = s;
  for (let i = 0; i < 40 && current(t) !== bearer; i++) t = t.units[current(t)].side === 'hero' ? act(t, autoCommand(t, current(t))).state : foeTurn(t).state;
  assert.equal(current(t), bearer);
  assert.ok(!guarding(t.units[bearer]), 'gone once its turn comes');
});

// ---- M6: the Gloomfen's Champions, Hodge and the holders (spec §3.2, §3.5, §4.2, §4.4; P4) ----------------------

test('the Lantern Mother: the Lantern powers Lure and Lantern Nova, the Veil powers Mourning; her phases at 66% and 33%', async () => {
  const { resolveMoveId, foeTable } = await import('../src/rules/ai.js');
  const { dealDamage } = await import('../src/rules/combat.js');
  const { FOES } = await import('../src/data/foes.js');
  const { B } = await import('./helpers.mjs');
  const s = structuredClone(battleWith([{ family: 'lantern-mother', level: 30 }], { seed: 14 }));
  const m = s.units.f1;
  assert.equal(m.die, 20);
  assert.deepEqual(m.held.map(p => p.relic), ['lamplighters-lantern', 'mourning-veil']);
  for (const id of ['lure', 'lantern-nova', 'mourning']) assert.equal(resolveMoveId(s, m, id), id);
  let ev = await pry(s, 'f1', 'lamplighters-lantern');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Lamplighter's Lantern clatters loose!.*Lure.*Lantern Nova/);
  assert.equal(resolveMoveId(s, m, 'lure'), 'lamp-pole');
  assert.equal(resolveMoveId(s, m, 'lantern-nova'), 'lamp-pole');
  assert.equal(resolveMoveId(s, m, 'mourning'), 'mourning', 'the Veil still mourns');
  ev = await pry(s, 'f1', 'mourning-veil');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Mourning Veil clatters loose!.*Mourning/);
  assert.equal(resolveMoveId(s, m, 'mourning'), 'lamp-pole');
  for (const id of ['lamp-pole', 'lantern-flare', 'hush-now', 'lead-them-down', 'moths', 'snuff', 'drown-the-light']) assert.equal(resolveMoveId(s, m, id), id, `${id} needs no piece`);
  assert.equal(m.die, 20, 'a Champion keeps its d20');
  // Lamplight, the Children's Road, Lights Out
  const s2 = structuredClone(battleWith([{ family: 'lantern-mother', level: 30 }], { seed: 14 }));
  const x = s2.units.f1;
  const b = B(s2, createRng(3));
  const hitTo = (frac, round = Math.floor) => dealDamage(b, s2.units.warden, x, x.hp - round(x.maxHp * frac), { kind: 'slash' });
  hitTo(0.67, Math.ceil);
  assert.equal(x.phase, 1);
  hitTo(0.66);
  assert.deepEqual([x.phase, foeTable(x)], [2, FOES['lantern-mother'].phases[1].table]);
  hitTo(0.33);
  assert.deepEqual([x.phase, foeTable(x)], [3, FOES['lantern-mother'].phases[2].table]);
  assert.deepEqual(b.ev.filter(e => e.t === 'phase').map(e => e.text), [FOES['lantern-mother'].phases[1].text, FOES['lantern-mother'].phases[2].text]);
});

test('the Lantern Mother leads a hero away (WIS save, "Led away") who comes back when she takes a hard hit; Hush Now hexes, Mourning frightens and rots, Moths calls two at most', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { statusOf, dealDamage, applyEffect } = await import('../src/rules/combat.js');
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { B } = await import('./helpers.mjs');
  const moves = FOES['lantern-mother'].moves;
  const s = sturdy(structuredClone(battleWith([{ family: 'lantern-mother', level: 30 }], { seed: 5 })));
  for (const eff of moves['lead-them-down'].effects) await strike(s, 'f1', 'bryn', eff, 1, 1); // a natural 1 always fails
  const held = statusOf(s.units.bryn, 'swallowed');
  assert.ok(held, 'Bryn is led away');
  assert.deepEqual([held.label, held.source, held.turns], ['Led away', 'f1', 2]);
  const b = B(s, createRng(8));
  dealDamage(b, s.units.warden, s.units.f1, Math.ceil(s.units.f1.maxHp * 0.15), { kind: 'slash' });
  assert.ok(!statusOf(s.units.bryn, 'swallowed'), 'a hard hit makes her let go');
  assert.ok(b.ev.some(e => e.t === 'status' && e.target === 'bryn' && e.status === 'swallowed' && e.op === 'release'));
  const saved = sturdy(structuredClone(battleWith([{ family: 'lantern-mother', level: 30 }], { seed: 5 })));
  for (const eff of moves['lead-them-down'].effects) await strike(saved, 'f1', 'bryn', eff, 20, 20);
  assert.ok(!statusOf(saved.units.bryn, 'swallowed'), 'a made WIS save keeps you in the line');
  // Hush Now: WIS or Hexed; Mourning: Frightened and Rotting, no save
  for (const eff of moves['hush-now'].effects) await strike(s, 'f1', 'pip', eff, 1, 1);
  assert.ok(statusOf(s.units.pip, 'hexed'), 'hushed: Hexed');
  for (const eff of moves.mourning.effects) await strike(s, 'f1', 'warden', eff, 10, 3);
  assert.ok(statusOf(s.units.warden, 'frightened') && statusOf(s.units.warden, 'rotting'), 'mourning: Frightened and Rotting');
  // Moths: a lamp-moth out of the dark, two at most, four levels down and worth nothing
  const c = B(s, createRng(4));
  for (let i = 0; i < 3; i++) applyEffect(c, s.units.f1, s.units.f1, moves.moths.effects[0]);
  const moths = Object.values(s.units).filter(u => u.summonedBy === 'f1');
  assert.equal(moths.length, 2);
  assert.ok(moths.every(u => u.family === 'lamp-moth' && u.level === s.units.f1.level - 4 && u.xp === 0 && u.noLoot));
  assert.equal(resolveMoveId(s, s.units.f1, 'moths'), 'lamp-pole', 'no third');
});

test('the Blackwater Leviathan: the Harpoon powers Harpoon Rage (two Coils), the Pearl powers Pearl-Light; it sounds, then breaches; it swallows a hero whole', async () => {
  const { resolveMoveId, foeTable } = await import('../src/rules/ai.js');
  const { statusOf, dealDamage } = await import('../src/rules/combat.js');
  const { FOES } = await import('../src/data/foes.js');
  const { B } = await import('./helpers.mjs');
  const s = structuredClone(battleWith([{ family: 'blackwater-leviathan', level: 30 }], { seed: 12 }));
  const v = s.units.f1;
  assert.deepEqual(v.held.map(p => p.relic), ['corvus-harpoon', 'deep-pearl']);
  for (const id of ['harpoon-rage', 'pearl-light']) assert.equal(resolveMoveId(s, v, id), id);
  let ev = await pry(s, 'f1', 'corvus-harpoon');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /Corvus's Harpoon clatters loose!.*Harpoon Rage/);
  assert.equal(resolveMoveId(s, v, 'harpoon-rage'), 'coil');
  assert.equal(resolveMoveId(s, v, 'pearl-light'), 'pearl-light', 'the Pearl still glows');
  ev = await pry(s, 'f1', 'deep-pearl');
  assert.match(ev.find(e => e.t === 'text' && /clatters loose/.test(e.text)).text, /The Deep-Pearl clatters loose!.*Pearl-Light/);
  assert.equal(resolveMoveId(s, v, 'pearl-light'), FOES['blackwater-leviathan'].moves['pearl-light'].fallback);
  for (const id of ['coil', 'tail-slap', 'sound', 'breach', 'swallow', 'undertow', 'flood']) assert.equal(resolveMoveId(s, v, id), id, `${id} needs no piece`);
  // Sound: under the water where nothing can reach it, and its next intent is the Breach
  let t = sturdy(structuredClone(battleWith([{ family: 'blackwater-leviathan', level: 30 }], { seed: 12 })));
  t.units.f1.intent = { ...t.units.f1.intent, move: 'sound', name: 'Sound', target: 'f1', charging: false };
  for (let i = 0; i < 40 && current(t) !== 'f1'; i++) t = act(t, autoCommand(t, current(t))).state;
  t = foeTurn(t).state;
  assert.ok(statusOf(t.units.f1, 'burrowed'), 'it sounds');
  assert.deepEqual([t.units.f1.intent.move, t.units.f1.intent.charging], ['breach', true], 'then it breaches under someone');
  assert.deepEqual(targets(t, { actor: current(t), targeting: 'enemy' }), [], 'nothing can reach it');
  // Swallow: swallowed whole
  const w = sturdy(structuredClone(battleWith([{ family: 'blackwater-leviathan', level: 30 }], { seed: 7 })));
  const eff = FOES['blackwater-leviathan'].moves.swallow.effects.find(e => e.riders?.some(x => x.status === 'swallowed'));
  await strike(w, 'f1', 'pip', eff, 19, 1);
  assert.equal(statusOf(w.units.pip, 'swallowed')?.label, 'Swallowed whole');
  // Harpoon Rage coils twice in one turn, on the same hero
  const h = sturdy(structuredClone(battleWith([{ family: 'blackwater-leviathan', level: 30 }], { seed: 7 })));
  const hb = B(h, createRng(5));
  const { runEffects } = await import('../src/rules/combat.js');
  runEffects(hb, h.units.f1, FOES['blackwater-leviathan'].moves['harpoon-rage'].effects, ['warden']);
  assert.equal(hb.ev.filter(e => e.t === 'roll' && e.purpose === 'attack' && e.target === 'warden').length, 2);
  // the Wake, the Deep, Blackwater
  const p = structuredClone(battleWith([{ family: 'blackwater-leviathan', level: 30 }], { seed: 12 }));
  const x = p.units.f1;
  const pb = B(p, createRng(3));
  dealDamage(pb, p.units.warden, x, x.hp - Math.floor(x.maxHp * 0.66), { kind: 'slash' });
  assert.deepEqual([x.phase, foeTable(x)], [2, FOES['blackwater-leviathan'].phases[1].table]);
  dealDamage(pb, p.units.warden, x, x.hp - Math.floor(x.maxHp * 0.33), { kind: 'slash' });
  assert.deepEqual([x.phase, foeTable(x)], [3, FOES['blackwater-leviathan'].phases[2].table]);
});

test('Hodge opens with Toll Is Due at the strongest hero: a failed CHA save costs a whole turn, a made one nothing', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { applyEffect } = await import('../src/rules/combat.js');
  const { strongest, unitsOf } = await import('../src/rules/ai.js');
  const { scriptedRng, B } = await import('./helpers.mjs');
  const toll = FOES.hodge.moves['toll-is-due'].effects[0];
  for (const seed of [1, 2, 3, 4]) {
    const s = battleWith([{ family: 'hodge', level: 12, relic: 'unfair-toll', gearTier: 3 }], { seed });
    const top = strongest(unitsOf(s, 'hero'));
    assert.equal(s.units.f1.intent.move, 'toll-is-due', `seed ${seed}: his first move`);
    assert.equal(s.units.f1.intent.target, top.id, `seed ${seed}: at the strongest hero`);
  }
  // played out: the strongest hero rolls the CHA save against the toll's DC when his first turn comes
  let s = sturdy(structuredClone(battleWith([{ family: 'hodge', level: 12, relic: 'unfair-toll', gearTier: 3 }], { seed: 9 })));
  const top = s.units.f1.intent.target;
  for (let i = 0; i < 40 && current(s) !== 'f1'; i++) s = act(s, autoCommand(s, current(s))).state;
  const r = foeTurn(s);
  const save = r.events.find(e => e.t === 'roll' && e.purpose === 'save' && e.ability === 'CHA');
  assert.ok(save && save.actor === top && save.vs === toll.dc, 'a CHA save by the strongest hero');
  assert.ok(r.events.some(e => e.t === 'move' && e.actor === 'f1' && e.name === 'Toll Is Due'));
  assert.notEqual(r.state.units.f1.intent.move, 'toll-is-due', 'only once: then his table');
  // a failed save puts the hero a whole turn back, with Hodge's words; a made one does nothing
  const f = structuredClone(battleWith([{ family: 'hodge', level: 12, relic: 'unfair-toll' }], { seed: 3 }));
  const hero = f.units.warden;
  const before = hero.next;
  const x = B(f, scriptedRng([2], 10));
  applyEffect(x, f.units.f1, hero, toll);
  assert.equal(hero.next, before + hero.delay);
  assert.ok(x.ev.some(e => e.t === 'text' && e.text === toll.text.replace('{target}', hero.name)));
  const y = B(f, scriptedRng([20], 10));
  applyEffect(y, f.units.f1, hero, toll);
  assert.equal(hero.next, before + hero.delay, 'a natural 20 pays nothing');
});

test('Hodge shoves a hero off the bridge ("In the river"), his Cane Staggers, his Clipped Coin hits twice while he holds the toll, and at 0 HP he sits down on his stool', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { statusOf, dealDamage, runEffects } = await import('../src/rules/combat.js');
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { B } = await import('./helpers.mjs');
  const moves = FOES.hodge.moves;
  const s = sturdy(structuredClone(battleWith([{ family: 'hodge', level: 12, relic: 'unfair-toll', gearTier: 3 }], { seed: 6 })));
  const shove = moves['bridge-troll'].effects.find(e => e.riders?.some(x => x.status === 'swallowed'));
  await strike(s, 'f1', 'pip', shove, 19, 1);
  const river = statusOf(s.units.pip, 'swallowed');
  assert.deepEqual([river?.label, river?.source], ['In the river', 'f1'], 'Pip is in the river');
  const cane = await strike(s, 'f1', 'bryn', moves['old-mans-cane'].effects[0], 19, 1); // a hit
  assert.ok(cane.some(e => e.t === 'damage' && e.target === 'bryn' && e.kind === 'crush'), 'the Cane: crushing');
  assert.ok(statusOf(s.units.bryn, 'staggered'), 'the Cane Staggers');
  // the Clipped Coin: two blows while he holds the toll; pried loose, it is only the Cane, and his d12 drops to a d8
  const coin = B(s, createRng(4));
  runEffects(coin, s.units.f1, moves['clipped-coin'].effects, ['warden']);
  assert.equal(coin.ev.filter(e => e.t === 'roll' && e.purpose === 'attack').length, 2, 'heads: he hits twice');
  assert.equal(resolveMoveId(s, s.units.f1, 'clipped-coin'), 'clipped-coin');
  assert.equal(s.units.f1.die, 12);
  await pry(s, 'f1', 'unfair-toll');
  assert.equal(resolveMoveId(s, s.units.f1, 'clipped-coin'), 'old-mans-cane');
  assert.equal(s.units.f1.die, 8);
  // at 0 HP he says so: the ko event carries his words
  const k = B(s, createRng(5));
  dealDamage(k, s.units.warden, s.units.f1, s.units.f1.hp, { kind: 'slash' });
  const ko = k.ev.find(e => e.t === 'ko' && e.target === 'f1');
  assert.equal(ko?.text, FOES.hodge.koText);
  // nobody else speaks on falling
  const g = structuredClone(battleWith([{ family: 'mire-leech', level: 3 }], { seed: 2 }));
  const rr = B(g, createRng(6));
  dealDamage(rr, g.units.warden, g.units.f1, g.units.f1.hp, { kind: 'slash' });
  assert.equal(rr.ev.find(e => e.t === 'ko' && e.target === 'f1').text, undefined);
});

test('Gloomfen holders: each Art needs its relic; pried loose, the Art falls back and the d12 drops to a d8', async () => {
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const { FOES } = await import('../src/data/foes.js');
  const HOLDERS = [
    ['blackwater-gar', 'old-jaws', 'gar-tooth'], ['bog-hag', 'grue', 'hag-stone'], ['willow-wight', 'grandfather', 'weeping-bow'],
    ['drowned', 'cantor', 'cantors-staff'], ['tallyman', 'salvage-master', 'salvagers-helm'], ['tallyman', 'bargemaster', 'barge-gauntlets'],
  ];
  for (const [family, variant, relic] of HOLDERS) {
    const s = structuredClone(battleWith([{ family, variant, relic, level: 30, gearTier: 3 }], { seed: 6 }));
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

test('the fen\'s statuses in the foes\' hands: a bog-hag\'s Hex (WIS) and Rot (CON), and the drowned\'s black water, which Rots', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { statusOf } = await import('../src/rules/combat.js');
  const CASES = [['bog-hag', 'hex', 'hexed'], ['bog-hag', 'rot', 'rotting'], ['drowned', 'black-water', 'rotting'], ['drowned', 'drag-down', 'rooted']];
  for (const [family, move, st] of CASES) {
    const fail = sturdy(structuredClone(battleWith([{ family, level: 30, gearTier: 3 }], { seed: 4 })));
    for (const eff of FOES[family].moves[move].effects) await strike(fail, 'f1', 'pip', eff, eff.type === 'attack' ? 19 : 1, 1);
    assert.ok(statusOf(fail.units.pip, st), `${family}/${move}: ${st}`);
    if (!FOES[family].moves[move].effects.some(e => e.save)) continue;
    const save = sturdy(structuredClone(battleWith([{ family, level: 30, gearTier: 3 }], { seed: 4 }))); // a natural 20 always saves
    for (const eff of FOES[family].moves[move].effects) await strike(save, 'f1', 'pip', eff, 20, 20);
    assert.ok(!statusOf(save.units.pip, st), `${family}/${move}: saved`);
  }
});

// ---- M7: the Hearth Below's Hollow Council and the Unsmith, driven with their own families (spec §3.5, §4.2, §4.4; P4)

const GIFTS = { 'hollow-miravel': 'hollow-wreath', 'hollow-qasim': 'hollow-chalice', 'hollow-brundar': 'hollow-gauntlet', 'hollow-gretch': 'hollow-chain' };

test('the Hollow Council: each rolls a d20 +4 while the gift is held, with its Arts coming up more often; pried loose, the gift takes the +4 and its Arts with it', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { rollIntent, dieBonus, resolveMoveId } = await import('../src/rules/ai.js');
  for (const [family, gift] of Object.entries(GIFTS)) {
    const s = sturdy(structuredClone(battleWith([{ family, level: 38, omens: ['frenzied'] }], { seed: 5 })));
    const f = s.units.f1;
    assert.deepEqual([f.tier, f.die, f.held.map(p => p.relic)], ['hollow', 20, [gift]], family);
    assert.equal(dieBonus(f), 4, `${family}: +4 while the gift is held`);
    assert.equal(s.openingEvents.find(e => e.t === 'intent' && e.foe === 'f1')?.bonus, 4, `${family}: its first intent says d20 +4`);
    const moves = FOES[family].moves;
    const arts = Object.keys(moves).filter(k => moves[k].requires === gift);
    const rng = createRng(`hollow:${family}`);
    const held = Array.from({ length: 400 }, () => rollIntent(s, f, rng));
    assert.ok(held.every(it => it.bonus === 4 && it.face === Math.min(20, it.natural + 4) && it.face >= 5), `${family}: every face is the natural roll +4, capped at 20`);
    const share = xs => xs.filter(it => arts.includes(it.move)).length / xs.length;
    const withGift = share(held);
    assert.ok(withGift > 0.4, `${family}: with the +4 the gift's Arts come up on about half the rolls (${withGift})`);
    await pry(s, 'f1', gift);
    assert.equal(dieBonus(f), 0, `${family}: pried loose, the +4 goes`);
    assert.equal(f.die, 20, `${family}: the die stays a d20 (only a relic-bearer's steps down)`);
    const loose = Array.from({ length: 400 }, () => rollIntent(s, f, rng));
    assert.ok(loose.every(it => !('bonus' in it)) && loose.some(it => it.face < 5), `${family}: a plain d20 now`);
    assert.equal(share(loose), 0, `${family}: the gift's Arts are gone`);
    for (const a of arts) assert.equal(resolveMoveId(s, f, a), moves[a].fallback, `${family}: ${a} falls back`);
  }
});

test('the Unsmith: two d20s and two moves a turn; at 66% the Thief takes up at most six relics the Warden never claimed, the highest first, with +1 Guard each; at 33% the Worldforge', async () => {
  const { RELICS } = await import('../src/data/relics.js');
  const { TUNING } = await import('../src/data/tuning.js');
  const { stolenFor } = await import('../src/rules/codex.js');
  const { dealDamage } = await import('../src/rules/combat.js');
  const { rollIntent } = await import('../src/rules/ai.js');
  const { B } = await import('./helpers.mjs');
  const { game } = party();
  const stolen = stolenFor(game);
  assert.equal(stolen.length, TUNING.unsmith.stolen.max, 'a Warden who has claimed only a starter leaves him six to take');
  const nos = stolen.map(id => RELICS[id].codex);
  assert.deepEqual(nos, [...nos].sort((a, b) => b - a), 'the highest Codex number first');
  const spawn = { family: 'unsmith', level: 40, omens: ['frenzied', 'ironclad'], stolen };
  let s = sturdy(structuredClone(battleWith([spawn], { seed: 8 })));
  const u0 = s.units.f1;
  assert.deepEqual([u0.tier, u0.die, u0.dice], ['unsmith', 20, 2]);
  assert.deepEqual(u0.held.map(p => p.relic), ['unmaking-hammer', 'ironvein-apron', 'worldforge-heart'], 'his three pieces');
  assert.deepEqual(s.openingEvents.filter(e => e.t === 'intent' && e.foe === 'f1').map(e => e.slot), [0, 1], 'two intents shown');
  // on his turn he makes both moves, in the order rolled
  for (let i = 0; i < 60 && current(s) !== 'f1'; i++) s = act(s, autoCommand(s, current(s))).state;
  const turn = foeTurn(s);
  assert.deepEqual(turn.events.filter(e => e.t === 'move' && e.actor === 'f1').map(e => e.slot), [0, 1], 'two moves on his turn');
  s = turn.state;
  const u = s.units.f1;
  const guard0 = u.guard;
  // the Thief: at 66% he takes them up
  const b = B(s, createRng(3));
  dealDamage(b, s.units.warden, u, u.hp - Math.floor(u.maxHp * 0.6), { kind: 'slash' });
  assert.equal(u.phase, 2);
  assert.ok(b.ev.some(e => e.t === 'phase' && e.phase === 2 && /Thief/.test(e.text)));
  const ev = b.ev.find(e => e.t === 'stolen');
  assert.deepEqual([ev?.relics, u.stolen.ids], [stolen, stolen], 'what he took, in order');
  assert.deepEqual(ev.names, stolen.map(id => RELICS[id].name));
  assert.equal(u.guard, guard0 + stolen.length * TUNING.unsmith.stolen.guard, '+1 Guard for each');
  const rng = createRng(11);
  const seen = new Set(Array.from({ length: 600 }, () => rollIntent(s, u, rng).move));
  for (const id of stolen) assert.ok(seen.has(`stolen:${id}`), `Stolen: ${RELICS[id].name} comes up on his table`);
  // at 33%: the Worldforge
  const c = B(s, createRng(4));
  dealDamage(c, s.units.warden, u, u.hp - Math.floor(u.maxHp * 0.3), { kind: 'slash' });
  assert.equal(u.phase, 3);
  assert.ok(c.ev.some(e => e.t === 'phase' && e.phase === 3 && /Worldforge/.test(e.text)));
  assert.ok(!c.ev.some(e => e.t === 'stolen'), 'he takes them up once');
});

test('the Unsmith and a full Codex: nothing is left for him to take, no Guard is added, and his fallback plays on the Thief\'s stolen faces (it leaves him Exposed)', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { RELICS } = await import('../src/data/relics.js');
  const { stolenFor } = await import('../src/rules/codex.js');
  const { dealDamage, statusOf, runEffects } = await import('../src/rules/combat.js');
  const { rollIntent } = await import('../src/rules/ai.js');
  const { B } = await import('./helpers.mjs');
  const full = structuredClone(party().game);
  for (const id of Object.keys(RELICS)) full.codex[id] = { sighted: true, claimed: true, awakened: false };
  const stolen = stolenFor(full);
  assert.deepEqual(stolen, [], 'a full Codex leaves him nothing');
  const s = sturdy(structuredClone(battleWith([{ family: 'unsmith', level: 40, omens: ['frenzied', 'ironclad'], stolen }], { seed: 8 })));
  const u = s.units.f1;
  const guard0 = u.guard;
  const b = B(s, createRng(3));
  dealDamage(b, s.units.warden, u, u.hp - Math.floor(u.maxHp * 0.6), { kind: 'slash' });
  assert.equal(u.phase, 2);
  assert.deepEqual(u.stolen.ids, []);
  assert.equal(u.guard, guard0, 'no Guard added');
  assert.match(b.ev.find(e => e.t === 'stolen').text, /left none/);
  const fb = FOES.unsmith.stolenFallback;
  const rng = createRng(12);
  const seen = Array.from({ length: 600 }, () => rollIntent(s, u, rng).move);
  assert.ok(seen.includes(fb), 'the fallback plays');
  assert.ok(!seen.some(m => m.startsWith('stolen')), 'and nothing stolen does');
  const x = B(s, createRng(13));
  runEffects(x, u, FOES.unsmith.moves[fb].effects, ['f1']);
  assert.ok(statusOf(u, 'exposed'), 'reaching for nothing leaves him Exposed');
});

test('the Unsmith\'s Unmake leaves a hero Unmade for two turns (the relic\'s Surge struck out); the heart\'s pull holds a hero in the furnace\'s mouth; pried loose, each piece takes its Arts with it', async () => {
  const { FOES } = await import('../src/data/foes.js');
  const { statusOf } = await import('../src/rules/combat.js');
  const { resolveMoveId } = await import('../src/rules/ai.js');
  const moves = FOES.unsmith.moves;
  const s = sturdy(structuredClone(battleWith([{ family: 'unsmith', level: 40 }], { seed: 5 })));
  assert.notEqual(commands(s, 'warden').find(c => c.type === 'surge').power, 'heroic-strike', 'the Warden\'s starter relic has a Surge of its own');
  await strike(s, 'f1', 'warden', moves.unmake.effects[0], 19, 1);
  const um = statusOf(s.units.warden, 'unmade');
  assert.ok(um && um.turns === 2 && um.source === 'f1', 'Unmade, for two turns');
  assert.equal(commands(s, 'warden').find(c => c.type === 'surge').power, 'heroic-strike', 'its Surge is only a Heroic Strike now');
  await strike(s, 'f1', 'bryn', moves['hearts-pull'].effects[0], 19, 1);
  const held = statusOf(s.units.bryn, 'swallowed');
  assert.deepEqual([held?.label, held?.source], ['In the furnace', 'f1'], 'held in the furnace\'s mouth');
  for (const [piece, arts] of [['unmaking-hammer', ['unmake']], ['ironvein-apron', ['forge-apron']], ['worldforge-heart', ['hearts-pull', 'heart-flare']]]) {
    for (const a of arts) assert.equal(resolveMoveId(s, s.units.f1, a), a, `${a} while he has the ${piece}`);
    await pry(s, 'f1', piece);
    for (const a of arts) assert.equal(resolveMoveId(s, s.units.f1, a), moves[a].fallback, `${a} falls back once the ${piece} is pried`);
  }
  assert.equal(s.units.f1.die, 20, 'the Unsmith never steps down');
});
