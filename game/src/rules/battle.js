// The battle engine (see ARCHITECTURE.md "The battle engine contract").
//
//   createBattle({ heroes, foes, seed, waking, ctx }) -> BattleState
//   timeline(state, n) / current(state) / commands(state, heroId) / targets(state, command)
//   act(state, command) / foeTurn(state) -> { state, events }      (inputs are never mutated)
//   outcome(state) -> null | { result, xp, gold, drops, claimed, consumables, party, bag, beaten, kills, rounds }
//
// Flow: the ribbon always points at a combatant who is ready to act. Start-of-turn upkeep
// (burn/poison ticks, regen, frozen skips) happens when a turn begins, at the end of the
// previous act/foeTurn, so `current()` is a plain getter. A foe rolls its next intent at the
// end of its own turn and announces it with an `intent` event.

import { createRng } from '../core/rng.js';
import { rollD20 } from '../core/dice.js';
import { SKILLS } from '../data/skills.js';
import { STATUSES } from '../data/statuses.js';
import { CONSUMABLES } from '../data/items.js';
import { TUNING } from '../data/tuning.js';
import { deriveHero, heroSkills, POWERS } from './stats.js';
import { buildFoe } from './foe.js';
import { alive, unitsOf, familyData, rollIntent, refreshIntent, intentEvent } from './ai.js';
import { runEffects, dealDamage, applyHeal, addStatus, removeStatus, addSurge, damageMult, effLabel, statusOf } from './combat.js';
import { battleLoot } from './loot.js';
import { rngFrom, rollExpr, indexItems, clamp } from './util.js';
import { ASPECT_IDS, PHYSICAL_KINDS } from '../data/aspects.js';
import { OMENS } from '../data/omens.js';

const R = TUNING.ribbon;

// ---- creation ------------------------------------------------------------------------------

function heroUnit(hero, items, seq) {
  const d = deriveHero(hero, items);
  const byId = indexItems(items);
  const hp = hero.hp == null ? d.maxHp : clamp(hero.hp, 0, d.maxHp);
  return {
    id: hero.id, heroId: hero.id, seq, side: 'hero', name: hero.name || hero.id, level: d.level,
    hp, maxHp: d.maxHp, mp: hero.mp == null ? d.maxMp : clamp(hero.mp, 0, d.maxMp), maxMp: d.maxMp,
    surge: clamp(hero.surge || 0, 0, TUNING.surge.max), guard: d.guard, speed: d.speed, delay: d.delay,
    armor: d.armorType, aspect: null, mods: d.mods, statuses: [], next: 0, ko: hp <= 0, gone: false,
    skills: heroSkills(hero, d),
    powers: d.powers.map(p => ({ ...p, item: structuredClone(byId[p.uid]) })),
    weaponItem: d.weapon.uid ? structuredClone(byId[d.weapon.uid]) : null,
    stats: {
      prof: d.prof, dc: d.dc, ib: d.ib, weapon: d.weapon, critRange: d.critRange, hitOther: d.hitOther,
      dmgOther: d.dmgOther, resist: d.resist, immune: d.immune, regen: d.regen, regenPct: d.regenPct,
      mpRegen: d.mpRegen, healBonus: d.healBonus, surgeGain: d.surgeGain, gripDmg: d.gripDmg,
      vsHurt: d.vsHurt, vsUnaware: d.vsUnaware,
    },
  };
}

// FoeSpawn = { family, level, gearTier, omens, variant, relic | held:[{relic}|{item}], wears, name, title, grudge }
// Spawns are used as given: apply rules/foe.js escalateSpawn for the Waking beforehand
// (rules/gauntlet.js does). `waking` here only raises loot luck.
// ctx = { inventory, bag, nodeId, where, day, gentle, noFlee, backdrop, patrol, ambush }
export function createBattle({ heroes = [], foes = [], seed = 1, waking = 0, ctx = {} } = {}) {
  const rng = createRng(seed);
  const items = ctx.inventory || ctx.items || [];
  const s = {
    v: 1, seed, waking, time: 0, turn: 0, seq: 0, nextId: 0, actor: null, ended: null, kills: {},
    units: {}, order: [], bag: { ...(ctx.bag || {}) }, rngState: 0, openingEvents: [],
    ctx: {
      nodeId: ctx.nodeId || null, where: ctx.where || null, day: ctx.day || 1, gentle: !!ctx.gentle,
      noFlee: !!ctx.noFlee || foes.some(f => familyData(f).noFlee), backdrop: ctx.backdrop || null, patrol: !!ctx.patrol,
      ambush: false,
    },
  };
  for (const h of heroes) {
    const u = heroUnit(h, items, s.seq++);
    s.units[u.id] = u;
    s.order.push(u.id);
  }
  foes.forEach((spawn, i) => {
    const id = `f${++s.nextId}`;
    const u = buildFoe({ spawnIndex: i, ...spawn }, { id, seq: s.seq++ });
    s.units[id] = u;
    s.order.push(id);
  });
  const B = { s, rng, ev: [], touched: new Set() };
  rollInitiative(B);
  if (ctx.ambush) ambush(B, items, heroes);
  for (const f of unitsOf(s, 'foe')) {
    f.intent = rollIntent(s, f, rng);
    B.ev.push(intentEvent(f));
  }
  advance(B);
  s.openingEvents = B.ev;
  s.rngState = rng.getState();
  return s;
}

// Initiative: d20 + speed bonus places each combatant's first turn on the ribbon.
function rollInitiative(B) {
  for (const id of B.s.order) {
    const u = B.s.units[id];
    const init = rollD20(B.rng).kept + (u.speed - 10);
    u.next = Math.max(0, R.initBase - R.initPerPoint * init);
  }
}

// An ambush pushes every hero's first turn back, unless someone wears the full Thornwatch set.
function ambush(B, items, heroes) {
  if (heroes.some(h => deriveHero(h, items).ambushImmune)) {
    B.ev.push({ t: 'text', text: 'Something stirs in the bramble, but the Thornwatch are never caught napping.' });
    return;
  }
  B.s.ctx.ambush = true;
  for (const u of unitsOf(B.s, 'hero')) u.next += R.ambushDelay;
  B.ev.push({ t: 'text', text: 'Ambush! They were waiting in the bramble.' });
}

// ---- ribbon ----------------------------------------------------------------------------------

function statusDelayMult(u) {
  let m = 1;
  for (const st of u.statuses) {
    const def = STATUSES[st.id];
    if (def?.delayMult) m *= def.delayMult;
    if (def?.delayPerStack) m *= 1 + def.delayPerStack * st.stacks;
  }
  return m;
}

// Frenzied foes act twice as often once they are nearly dead.
const frenzyMult = u => (u.side === 'foe' && u.omens.includes('frenzied') && u.hp < u.maxHp * OMENS.frenzied.frenzyBelow ? 0.5 : 1);

function moveDelay(u) {
  if (u.side !== 'foe' || !u.intent) return 1;
  return familyData(u).moves[u.intent.move]?.delay || 1;
}

export function unitDelay(u, actionMult = 1) {
  return Math.max(R.minDelay * 0.5, Math.round(u.delay * actionMult * statusDelayMult(u) * frenzyMult(u)));
}

const byTurnOrder = (a, b) => a.next - b.next || a.seq - b.seq;

function nextUnit(s) {
  return s.order.map(id => s.units[id]).filter(alive).sort(byTurnOrder)[0] || null;
}

export function timeline(state, n = R.preview) {
  if (state.ended) return [];
  const sim = state.order.map(id => state.units[id]).filter(alive).map(u => ({ id: u.id, seq: u.seq, next: u.next, step: unitDelay(u, moveDelay(u)) }));
  const out = [];
  for (let i = 0; i < n && sim.length; i++) {
    sim.sort(byTurnOrder);
    out.push(sim[0].id);
    sim[0].next += sim[0].step;
  }
  return out;
}

export const current = state => (state.ended ? null : state.actor);

// ---- turn upkeep --------------------------------------------------------------------------------

// Start of a turn: drop "until turn-start" statuses, tick damage/regen, then frozen skips.
// Returns true if the unit may act.
function startTurn(B, u) {
  for (const st of [...u.statuses]) if (STATUSES[st.id]?.until === 'turn-start') removeStatus(B, u, st.id);
  for (const st of [...u.statuses]) {
    const tick = STATUSES[st.id]?.tick;
    if (!tick || !alive(u)) continue;
    const r = rollExpr(B.rng, tick.dice);
    const raw = r.total * (tick.perStack ? st.stacks : 1);
    const m = damageMult(u, tick.kind, tick.aspect);
    B.ev.push({ t: 'status', target: u.id, status: st.id, op: 'tick', stacks: st.stacks, turns: st.turns });
    dealDamage(B, null, u, m === 0 ? 0 : Math.max(1, Math.round(raw * m)), { dice: r.dice, kind: tick.kind, aspect: tick.aspect, eff: effLabel(m) });
  }
  if (!alive(u)) return false;
  upkeepHeal(B, u);
  const skip = u.statuses.find(st => STATUSES[st.id]?.skipTurn);
  if (skip) {
    B.ev.push({ t: 'status', target: u.id, status: skip.id, op: 'trigger', stacks: skip.stacks, turns: skip.turns });
    B.ev.push({ t: 'text', text: `${u.name} is frozen solid and loses the turn.` });
    return false;
  }
  return true;
}

function upkeepHeal(B, u) {
  let heal = 0;
  if (u.side === 'hero') heal += u.stats.regen + Math.round(u.maxHp * (u.stats.regenPct || 0) / 100);
  const regen = statusOf(u, 'regenerating');
  if (regen) {
    heal += regen.value || 0;
    B.ev.push({ t: 'status', target: u.id, status: 'regenerating', op: 'tick', stacks: 1, turns: regen.turns });
  }
  if (heal > 0 && u.hp < u.maxHp) applyHeal(B, u, heal);
  if (u.side === 'hero' && u.stats.mpRegen) u.mp = Math.min(u.maxMp, u.mp + u.stats.mpRegen);
}

// End of a turn: count down statuses, schedule the next turn, and (for foes) roll the next intent.
function finishTurn(B, u, actionMult = 1) {
  if (!alive(u)) return;
  for (const st of [...u.statuses]) {
    if (st.turns == null || STATUSES[st.id]?.until) continue;
    st.turns -= 1;
    if (st.turns <= 0) removeStatus(B, u, st.id);
  }
  let delay = unitDelay(u, actionMult);
  if (u.fumbled) { delay += TUNING.attack.fumbleDelay; u.fumbled = false; }
  u.next = B.s.time + delay;
  if (u.side === 'foe') {
    u.intent = u.queue.length ? refreshIntent(B.s, u, u.queue.shift(), B.rng) : rollIntent(B.s, u, B.rng);
    B.ev.push(intentEvent(u));
  }
}

function advance(B) {
  for (let guard = 0; guard < 200; guard++) {
    if (checkEnd(B)) return;
    const u = nextUnit(B.s);
    B.s.time = u.next;
    B.s.actor = u.id;
    B.s.turn += 1;
    B.ev.push({ t: 'turn', actor: u.id, time: u.next });
    if (startTurn(B, u)) return;
    if (alive(u)) finishTurn(B, u, 1);
  }
}

// ---- ending -----------------------------------------------------------------------------------

function checkEnd(B) {
  const s = B.s;
  if (s.ended) return true;
  const foes = unitsOf(s, 'foe');
  if (foes.filter(alive).every(f => f.summonedBy)) {
    for (const f of foes.filter(alive)) { f.gone = true; B.ev.push({ t: 'escape', foe: f.id, text: `${f.name} withers back into the ground.` }); }
    const { drops, claimed, consumables } = battleLoot(s, B.rng);
    const beaten = foes.filter(f => f.ko);
    s.ended = {
      result: 'victory', drops, claimed, consumables,
      xp: beaten.reduce((a, f) => a + f.xp, 0), gold: beaten.reduce((a, f) => a + f.gold, 0),
    };
    B.ev.push({ t: 'victory', ...s.ended });
    return true;
  }
  if (unitsOf(s, 'hero').every(h => !alive(h))) {
    s.ended = { result: 'defeat', xp: 0, gold: 0, drops: [], claimed: [], consumables: {} };
    B.ev.push({ t: 'defeat', ...s.ended });
    return true;
  }
  return false;
}

export function outcome(state) {
  if (!state.ended) return null;
  const party = unitsOf(state, 'hero').map(h => ({ id: h.id, hp: h.hp, maxHp: h.maxHp, mp: h.mp, maxMp: h.maxMp, surge: h.surge, ko: h.ko }));
  const beaten = unitsOf(state, 'foe').filter(f => f.ko && !f.summonedBy).map(f => ({ id: f.id, family: f.family, name: f.name, tier: f.tier, spawnIndex: f.spawnIndex, grudge: f.grudge }));
  return { ...state.ended, party, bag: { ...state.bag }, beaten, kills: { ...state.kills }, rounds: Math.round(state.time / R.baseDelay * 10) / 10, turns: state.turn };
}

// ---- inspection (Analyze panel, tooltips) ----------------------------------------------------------

// What the party knows about a combatant. Weaknesses are always computable from the aspect
// wheel and armour chart; `analyzed` says whether Bryn has revealed the queued intents.
export function inspect(state, id) {
  const u = state.units[id];
  if (!u) return null;
  const kinds = [...PHYSICAL_KINDS, ...ASPECT_IDS];
  const mults = Object.fromEntries(kinds.map(k => [k, damageMult(u, k, ASPECT_IDS.includes(k) ? k : null)]));
  return {
    id, name: u.name, side: u.side, level: u.level, hp: u.hp, maxHp: u.maxHp, guard: u.guard, armor: u.armor, aspect: u.aspect,
    weakTo: kinds.filter(k => mults[k] > 1.05), resists: kinds.filter(k => mults[k] > 0 && mults[k] < 0.95), immune: kinds.filter(k => mults[k] === 0),
    mults, statuses: u.statuses.map(st => ({ ...st })), omens: u.omens || [], tier: u.tier || null, die: u.die || null,
    grip: (u.held || []).map(p => ({ relic: p.relic || p.item?.base, name: p.item?.name || null, grip: p.grip, max: p.max, held: p.held })),
    intent: u.intent || null, queue: u.analyzed ? u.queue : [], analyzed: !!u.analyzed, gear: u.gear || [],
  };
}

// ---- commands -------------------------------------------------------------------------------------

function enemiesOf(s, u) { return unitsOf(s, u.side === 'hero' ? 'foe' : 'hero').filter(alive); }
function alliesOf(s, u) { return unitsOf(s, u.side).filter(alive); }

export function targets(state, command) {
  const u = state.units[command.actor ?? state.actor];
  if (!u) return [];
  switch (command.targeting || targetingOf(command)) {
    case 'enemy': case 'all-enemies': return enemiesOf(state, u).map(t => t.id);
    case 'ally': case 'all-allies': return alliesOf(state, u).map(t => t.id);
    case 'ally-ko': return unitsOf(state, u.side).filter(t => t.ko && !t.gone).map(t => t.id);
    case 'self': return [u.id];
    default: return [];
  }
}

function targetingOf(cmd) {
  if (cmd.type === 'attack') return 'enemy';
  if (cmd.type === 'skill') return SKILLS[cmd.skill]?.target;
  if (cmd.type === 'item') return CONSUMABLES[cmd.item]?.target;
  if (cmd.type === 'defend') return 'self';
  if (cmd.type === 'surge') return POWERS[cmd.power]?.target;
  return 'none';
}

function surgePower(u) {
  return u.powers[0] || { uid: u.weaponItem?.uid || null, power: 'heroic-strike', item: u.weaponItem, relic: null };
}

// The command menu for a hero. Disabled entries carry a `reason` for the UI to show.
export function commands(state, heroId) {
  const u = state.units[heroId];
  if (!u || u.side !== 'hero') return [];
  const ready = !state.ended && state.actor === heroId && alive(u);
  const withTargets = c => {
    const n = targets(state, { ...c, actor: heroId }).length;
    const noTarget = c.targeting !== 'none' && n === 0;
    const enabled = ready && !c.reason && !noTarget;
    return { ...c, actor: heroId, enabled, reason: c.reason || (noTarget ? 'No valid target' : ready ? null : 'Not your turn') };
  };
  const list = [{ type: 'attack', id: 'attack', name: 'Attack', targeting: 'enemy', text: `${u.stats.weapon.name}: ${u.stats.weapon.dice} ${u.stats.weapon.dmg}` }];
  for (const id of u.skills) {
    const sk = SKILLS[id];
    if (!sk) continue;
    list.push({ type: 'skill', id, skill: id, name: sk.name, mp: sk.mp, targeting: sk.target, domain: sk.domain, text: sk.text, reason: u.mp < sk.mp ? 'Not enough MP' : null });
  }
  for (const [id, count] of Object.entries(state.bag)) {
    const c = CONSUMABLES[id];
    if (c && count > 0) list.push({ type: 'item', id, item: id, name: c.name, count, targeting: c.target, text: c.text });
  }
  list.push({ type: 'defend', id: 'defend', name: 'Defend', targeting: 'self', text: 'Guard (+2 Guard, half damage) until your next turn and recover 2 MP.' });
  const sp = surgePower(u);
  const power = POWERS[sp.power];
  list.push({
    type: 'surge', id: 'surge', name: `Legend Surge: ${power.name}`, power: sp.power, uid: sp.uid, relic: sp.relic,
    targeting: power.target, text: power.text, surge: u.surge, reason: u.surge < TUNING.surge.max ? 'The Legend Surge gauge is not full' : null,
  });
  list.push({ type: 'flee', id: 'flee', name: 'Flee', targeting: 'none', text: 'Try to break away (DEX check).', reason: state.ctx.noFlee ? 'There is no running from this one' : null });
  return list.map(withTargets);
}

// ---- resolving a hero command -------------------------------------------------------------------

function snapshotSurge(s) {
  return Object.fromEntries(unitsOf(s, 'hero').map(h => [h.id, h.surge]));
}

function flushSurge(B, before) {
  for (const id of B.touched) {
    const u = B.s.units[id];
    if (before[id] !== u.surge) B.ev.push({ t: 'surge', actor: id, from: before[id], to: u.surge });
  }
  B.touched.clear();
}

function pickTargets(s, u, targeting, chosen) {
  const valid = targets(s, { actor: u.id, targeting });
  if (targeting.startsWith('all-')) return valid;
  if (targeting === 'self') return [u.id];
  if (chosen && valid.includes(chosen)) return [chosen];
  throw new Error(`Invalid target ${chosen} for ${targeting}`);
}

function doFlee(B, u) {
  const s = B.s;
  const heroes = unitsOf(s, 'hero').filter(alive);
  const bonus = Math.max(...heroes.map(h => h.mods.DEX)) + u.stats.prof;
  const dc = TUNING.flee.dc + Math.max(0, ...unitsOf(s, 'foe').filter(alive).map(f => TUNING.flee.tierDc[f.tier] || 0));
  const r = rollD20(B.rng);
  const ok = r.kept !== 1 && r.kept + bonus >= dc;
  B.ev.push({ t: 'roll', actor: u.id, target: null, purpose: 'flee', die: 20, rolls: r.rolls, kept: r.kept, bonus, total: r.kept + bonus, vs: dc, result: ok ? 'save' : 'fail', adv: false, dis: false });
  if (!ok) { B.ev.push({ t: 'text', text: 'No way through. The foes close in.' }); return; }
  const beaten = unitsOf(s, 'foe').filter(f => f.ko && !f.summonedBy);
  s.ended = { result: 'fled', xp: beaten.reduce((a, f) => a + f.xp, 0), gold: beaten.reduce((a, f) => a + f.gold, 0), drops: [], claimed: [], consumables: {} };
  B.ev.push({ t: 'fled', ...s.ended });
}

function resolveCommand(B, u, cmd) {
  const s = B.s;
  B.relic = cmd.relic || null;
  switch (cmd.type) {
    case 'attack':
      runEffects(B, u, [{ type: 'attack', weapon: true }], pickTargets(s, u, 'enemy', cmd.target));
      return 1;
    case 'skill': {
      const sk = SKILLS[cmd.skill];
      if (!sk || !u.skills.includes(cmd.skill)) throw new Error(`${u.name} does not know ${cmd.skill}`);
      if (u.mp < sk.mp) throw new Error(`${u.name} lacks MP for ${sk.name}`);
      const tg = pickTargets(s, u, sk.target, cmd.target);
      u.mp -= sk.mp;
      B.ev.push({ t: 'move', actor: u.id, name: sk.name, text: sk.text, skill: sk.id, mp: sk.mp });
      runEffects(B, u, sk.effects, tg);
      return sk.delay || 1;
    }
    case 'item': {
      const c = CONSUMABLES[cmd.item];
      if (!c || !(s.bag[cmd.item] > 0)) throw new Error(`No ${cmd.item} in the bag`);
      const tg = pickTargets(s, u, c.target, cmd.target);
      s.bag[cmd.item] -= 1;
      B.ev.push({ t: 'move', actor: u.id, name: c.name, text: c.text, item: c.id });
      runEffects(B, u, c.effects, tg);
      return c.delay || 1;
    }
    case 'defend':
      addStatus(B, u, 'guarding', { source: u.id });
      u.mp = Math.min(u.maxMp, u.mp + 2);
      return 0.8;
    case 'surge': {
      if (u.surge < TUNING.surge.max) throw new Error('Legend Surge is not full');
      const sp = surgePower(u);
      const power = POWERS[sp.power];
      const tg = pickTargets(s, u, power.target, cmd.target);
      addSurge(B, u, -u.surge);
      B.ev.push({ t: 'legend', actor: u.id, item: sp.item || null, power: power.id, name: power.name, text: power.text });
      runEffects(B, u, power.effects, tg);
      return 1;
    }
    case 'flee':
      if (s.ctx.noFlee) throw new Error('Cannot flee this battle');
      doFlee(B, u);
      return 1;
    default:
      throw new Error(`Unknown command type ${cmd.type}`);
  }
}

function begin(state) {
  const s = structuredClone(state);
  return { s, rng: rngFrom(s.rngState), ev: [], touched: new Set(), before: snapshotSurge(s) };
}

function finish(B) {
  flushSurge(B, B.before);
  B.s.rngState = B.rng.getState();
  return { state: B.s, events: B.ev };
}

export function act(state, command) {
  if (state.ended) throw new Error('The battle is over');
  const actorId = command.actor ?? state.actor;
  if (actorId !== state.actor) throw new Error(`It is ${state.actor}'s turn, not ${actorId}'s`);
  const B = begin(state);
  const u = B.s.units[actorId];
  if (!u || u.side !== 'hero') throw new Error('act() resolves hero commands; use foeTurn() for foes');
  const mult = resolveCommand(B, u, command);
  if (!checkEnd(B)) {
    finishTurn(B, u, mult);
    flushSurge(B, B.before);
    B.before = snapshotSurge(B.s);
    advance(B);
  }
  return finish(B);
}

// ---- resolving a foe's intent ---------------------------------------------------------------------

function foeTargets(s, f, move) {
  switch (move.target) {
    case 'self': return [f.id];
    case 'all-enemies': return unitsOf(s, 'hero').filter(alive).map(h => h.id);
    case 'all-allies': return unitsOf(s, 'foe').filter(alive).map(x => x.id);
    default: return [f.intent.target].filter(id => alive(s.units[id]));
  }
}

export function foeTurn(state) {
  if (state.ended) throw new Error('The battle is over');
  const B = begin(state);
  const f = B.s.units[B.s.actor];
  if (!f || f.side !== 'foe') throw new Error('foeTurn() needs a foe to be current');
  let mult = 1;
  if (f.intent?.cancelled) {
    B.ev.push({ t: 'text', text: `${f.name} staggers and the ${f.intent.name} comes to nothing.` });
  } else {
    f.intent = refreshIntent(B.s, f, f.intent || rollIntent(B.s, f, B.rng), B.rng);
    const move = familyData(f).moves[f.intent.move];
    const prov = f.statuses.find(st => st.id === 'provoked');
    if (prov && move.target === 'enemy' && alive(B.s.units[prov.source])) f.intent.target = prov.source;
    B.ev.push({ t: 'move', actor: f.id, name: move.name, text: move.text, move: f.intent.move });
    runEffects(B, f, move.effects, foeTargets(B.s, f, move));
    mult = move.delay || 1;
  }
  if (!checkEnd(B)) {
    finishTurn(B, f, mult);
    flushSurge(B, B.before);
    B.before = snapshotSurge(B.s);
    advance(B);
  }
  return finish(B);
}
