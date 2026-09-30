// The effect interpreter: attacks, damage, healing, statuses, grip, surge, summons.
// Every function takes B = { s, rng, ev, touched } where `s` is a battle state the caller
// has already cloned, `rng` the seeded RNG and `ev` the event list being built.

import { rollD20 } from '../core/dice.js';
import { STATUSES } from '../data/statuses.js';
import { ASPECTS, ASPECT_MULT, ARMOR_CHART, PHYSICAL_KINDS } from '../data/aspects.js';
import { OMENS } from '../data/omens.js';
import { RELICS } from '../data/relics.js';
import { TUNING } from '../data/tuning.js';
import { tierRow } from '../data/foes.js';
import { scaledTerms, rollTerms, rollExpr, clamp } from './util.js';
import { alive, targetable, unitsOf, familyData, rollIntent, refreshIntent, intentEvent, stepDownDie, dropBonus } from './ai.js';
import { buildFoe, stolenMoves } from './foe.js';

const T = TUNING;
const TIER_DC = { rabble: 0, veteran: 1, 'relic-bearer': 2, champion: 3 };

// ---- small queries -----------------------------------------------------------------------

export const statusOf = (u, id) => u.statuses.find(st => st.id === id);
const anyStatus = (u, key) => u.statuses.some(st => STATUSES[st.id]?.[key]);
const levelOf = u => u.level || 1;
const modOf = (u, stat) => (stat && u.mods ? u.mods[stat] || 0 : 0);

export function effGuard(u) {
  return u.guard + u.statuses.reduce((a, st) => a + (STATUSES[st.id]?.guard || 0), 0);
}

export function saveDC(u) {
  return u.side === 'hero' ? u.stats.dc : 10 + Math.floor(u.level / 2) + (tierRow(TIER_DC, u.tier) || 0);
}

function saveBonus(u, ability) {
  return u.side === 'hero' ? modOf(u, ability) + u.stats.prof + (u.stats.saveBonus || 0) : (u.saves?.[ability] || 0);
}

// Aspect wheel: x1.5 if the attack beats the defender's aspect, x0.5 if the defender beats it
// or shares it.
export function aspectMult(attack, defend) {
  if (!attack || !defend || !ASPECTS[attack] || !ASPECTS[defend]) return 1;
  if (ASPECTS[attack].beats.includes(defend)) return ASPECT_MULT.strong;
  if (ASPECTS[defend].beats.includes(attack) || attack === defend) return ASPECT_MULT.weak;
  return 1;
}

// Combined multiplier: physical kind vs armour type, aspect wheel, the foe's own weak/resist
// lists, and a hero's gear resistances.
export function damageMult(t, kind, aspect) {
  let m = 1;
  if (PHYSICAL_KINDS.includes(kind)) m *= ARMOR_CHART[kind][t.armor || 'none'] ?? 1;
  // M5 (spec §3.5): a foe named weak to an aspect is weak to it even where the wheel would halve it
  // (Mother Anvil, an ember construct, is weak to frost); no earlier foe is named so
  const wheel = aspectMult(aspect, t.aspect);
  m *= wheel < 1 && t.weak?.includes(aspect) ? 1 : wheel;
  for (const k of new Set([kind, aspect].filter(Boolean))) {
    if (t.immune?.includes(k)) return 0;
    if (t.weak?.includes(k)) m *= 1.5;
    if (t.resist?.includes(k)) m *= 0.5;
  }
  const pct = t.side === 'hero' ? (t.stats.resist[aspect] || 0) + (aspect !== kind ? t.stats.resist[kind] || 0 : 0) : 0;
  return m * (1 - clamp(pct, 0, 60) / 100);
}

export const effLabel = m => (m === 0 ? 'immune' : m > 1.05 ? 'weak' : m < 0.95 ? 'resist' : 'normal');

// ---- surge ---------------------------------------------------------------------------------

export function addSurge(B, u, amount) {
  if (!u || u.side !== 'hero' || !amount) return;
  const gain = amount * (1 + (u.stats.surgeGain || 0) / 100);
  u.surge = clamp(Math.round(u.surge + gain), 0, T.surge.max);
  B.touched.add(u.id);
}

// ---- statuses --------------------------------------------------------------------------------

export function addStatus(B, t, id, { stacks = 1, turns, value, source, label } = {}) {
  const def = STATUSES[id];
  if (!def || !alive(t)) return false;
  if (t.stats?.immune?.includes(id) || t.immune?.includes(id)) {
    B.ev.push({ t: 'text', text: `${t.name} shrugs off ${def.name}.` });
    return false;
  }
  // M5: a side with nobody else left to fight is never swallowed whole: the last one is spat straight back out
  if (def.held && !unitsOf(B.s, t.side).some(u => u.id !== t.id && targetable(u))) {
    B.ev.push({ t: 'text', text: `${t.name} is caught, and spat straight back out.` });
    return false;
  }
  const dur = turns ?? def.turns ?? null;
  let st = statusOf(t, id);
  if (st) {
    st.stacks = Math.min(def.maxStacks || 1, st.stacks + stacks);
    st.turns = dur == null ? null : Math.max(st.turns ?? 0, dur);
    if (value != null) st.value = Math.max(st.value || 0, value);
    if (source) st.source = source;
  } else {
    st = { id, stacks: Math.min(def.maxStacks || 1, stacks), turns: dur, value: value ?? null, source: source || null };
    if (label) st.label = label; // M5: how a hold reads on the hero's plate ("Held under", "Carried off")
    t.statuses.push(st);
  }
  B.ev.push({ t: 'status', target: t.id, status: id, op: 'add', stacks: st.stacks, turns: st.turns, value: st.value,
    ...(st.source ? { source: st.source } : {}), ...(st.label ? { label: st.label } : {}) });
  if (def.atMax && st.stacks >= def.maxStacks) {
    removeStatus(B, t, id);
    addStatus(B, t, def.atMax, { source });
  }
  if (def.push) t.next += def.push;
  if (def.breaksCharge && t.dice > 1) {
    // M7 (spec §4.2): a two-dice foe loses the next of its two moves that is still coming, charging or not
    const it = [t.intent, t.intent2].find(i => i && !i.cancelled);
    if (it) {
      it.cancelled = true;
      B.ev.push({ t: 'text', text: `${t.name}'s ${it.name} is broken off!`, ...(it.slot != null ? { slot: it.slot } : {}) });
    }
  } else if (def.breaksCharge && t.intent?.charging && !t.intent.cancelled) {
    t.intent.cancelled = true;
    B.ev.push({ t: 'text', text: `${t.name}'s ${t.intent.name} is broken off!` });
  }
  return true;
}

export function removeStatus(B, t, id, op = 'remove') {
  const i = t.statuses.findIndex(st => st.id === id);
  if (i < 0) return;
  const [st] = t.statuses.splice(i, 1);
  B.ev.push({ t: 'status', target: t.id, status: id, op, stacks: 0, turns: 0, was: st.stacks });
}

// ---- HP ----------------------------------------------------------------------------------------

export function applyHeal(B, t, amount, extra = {}) {
  if (!alive(t) || amount <= 0) return 0;
  // M6: a rotting unit gets half of every heal, rounded down (a 1 HP trickle is eaten whole)
  const mult = t.statuses.reduce((m, st) => m * (STATUSES[st.id]?.healMult ?? 1), 1);
  const got = mult === 1 ? amount : Math.floor(amount * mult);
  if (got <= 0) return 0;
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + got);
  B.ev.push({ t: 'heal', target: t.id, amount: t.hp - before, hp: t.hp, ...(mult !== 1 ? { rot: true } : {}), ...extra });
  return t.hp - before;
}

// M5: whoever `holder` has swallowed comes back into the line.
export function release(B, holder, why) {
  for (const u of Object.values(B.s.units)) {
    const st = alive(u) && u.statuses.find(x => STATUSES[x.id]?.held && x.source === holder.id);
    if (!st) continue;
    removeStatus(B, u, st.id, 'release');
    B.ev.push({ t: 'text', text: `${u.name} ${why}` });
  }
}

// M5 (spec §4.2): a side is never left with only the held standing. When the last one who could fight
// beside them falls, whoever is held is let go at once (the swallow itself is refused in addStatus).
function freeLastHeld(B, side) {
  const us = unitsOf(B.s, side);
  if (us.some(targetable)) return;
  for (const u of us) {
    const st = alive(u) && u.statuses.find(x => STATUSES[x.id]?.held);
    if (!st) continue;
    removeStatus(B, u, st.id, 'release');
    B.ev.push({ t: 'text', text: `${u.name} is spat back out: nobody else is left standing.` });
  }
}

function knockOut(B, t, src) {
  t.hp = 0;
  t.ko = true;
  t.statuses = [];
  const said = t.side === 'foe' ? familyData(t).koText : null; // M6: Hodge never dies: he sits down on his stool
  B.ev.push({ t: 'ko', target: t.id, ...(said ? { text: said } : {}) });
  release(B, t, 'is free: what held them has fallen.');
  freeLastHeld(B, t.side);
  if (src && src.side === 'hero' && t.side === 'foe') {
    addSurge(B, src, T.surge.kill);
    B.s.kills[src.id] = (B.s.kills[src.id] || 0) + 1; // for the weapon's Chronicle
    B.s.log?.felled.push({ by: src.id, name: t.name, level: t.level || 1, tier: t.tier || null }); // M4: the Chronicle
  }
  if (t.side === 'hero' && B.s.log) B.s.log.downs += 1; // M4: the Untouched deed
}

// Guarding halves, frozen shatters under crush, warded soaks, then HP.
export function dealDamage(B, src, t, raw, info) {
  let amount = Math.max(0, Math.round(raw));
  const guarding = statusOf(t, 'guarding');
  if (guarding && amount) amount = Math.ceil(amount * STATUSES.guarding.damageMult);
  const frozen = statusOf(t, 'frozen');
  if (frozen && info.kind === 'crush' && amount) {
    amount = Math.round(amount * STATUSES.frozen.crushMult);
    removeStatus(B, t, 'frozen', 'trigger');
  }
  let absorbed = 0;
  const ward = statusOf(t, 'warded');
  if (ward && amount) {
    absorbed = Math.min(ward.value || 0, amount);
    ward.value -= absorbed;
    amount -= absorbed;
    if (ward.value <= 0) removeStatus(B, t, 'warded');
  }
  t.hp = Math.max(0, t.hp - amount);
  B.ev.push({
    t: 'damage', target: t.id, actor: src?.id || null, amount, dice: info.dice || [], flat: info.flat || 0,
    aspect: info.aspect || null, kind: info.kind || 'crush', eff: info.eff || 'normal', crit: !!info.crit,
    graze: !!info.graze, absorbed, hp: t.hp,
  });
  if (t.side === 'hero' && amount) addSurge(B, t, T.surge.takenPct * amount / t.maxHp);
  if (t.hp === 0) knockOut(B, t, src);
  else {
    if (t.side === 'foe') afterFoeHurt(B, t);
    // M5: a hard enough hit makes a swallower let go; a charmed unit hit by its own side wakes
    if (amount >= t.maxHp * T.swallow.releasePct) release(B, t, `is spat out as ${t.name} reels.`);
    if (src && src !== t && src.side === t.side && statusOf(t, 'charmed')) {
      removeStatus(B, t, 'charmed', 'release');
      B.ev.push({ t: 'text', text: `${t.name} snaps out of the charm.` });
    }
  }
  return amount;
}

// ---- boss phases and Omens that trigger on damage --------------------------------------------

function afterFoeHurt(B, t) {
  const phases = familyData(t).phases;
  if (phases) {
    const frac = t.hp / t.maxHp;
    let p = (t.phase || 1) - 1;
    while (p + 1 < phases.length && frac <= phases[p + 1].at) p++;
    if (p + 1 > (t.phase || 1)) {
      const from = t.phase || 1;
      t.phase = p + 1;
      B.ev.push({ t: 'phase', foe: t.id, phase: t.phase, text: phases[p].text });
      if (!t.stolen && phases.slice(from, p + 1).some(ph => ph.steals)) takeStolen(B, t); // M7: the Thief
    }
  }
  if (t.omens.includes('twinned') && !t.split && t.hp <= t.maxHp * OMENS.twinned.split) splitTwin(B, t);
}

// M7 (spec §4.4): the Unsmith hangs the relics the Warden never claimed on himself (the spawn's `stolen`, at most
// TUNING.unsmith.stolen.max, chosen by rules/codex.js stolenFor): one Stolen Art and +1 Guard each.
function takeStolen(B, t) {
  const ids = (t.stealable || []).slice(0, T.unsmith.stolen.max);
  t.stolen = { ids, moves: stolenMoves(ids) };
  t.guard += ids.length * T.unsmith.stolen.guard;
  const names = ids.map(id => RELICS[id].name);
  B.ev.push({ t: 'stolen', foe: t.id, relics: ids, names, guard: t.guard,
    text: names.length ? `${t.name} takes up what you never claimed: ${names.join(', ')}.` : `${t.name} reaches for the relics you left behind, and finds you left none.` });
}

function splitTwin(B, t) {
  t.split = true;
  t.omens = t.omens.filter(o => o !== 'twinned');
  const s = B.s;
  const id = `f${++s.nextId}`;
  const twin = { ...structuredClone(t), id, seq: s.seq++, held: [], gear: [], noLoot: true, xp: Math.round(t.xp / 2), gold: 0 };
  twin.name = `${t.name} (twin)`;
  twin.next = s.time + Math.round(twin.delay * 0.5);
  twin.queue = [];
  s.units[id] = twin;
  s.order.push(id);
  twin.intent = rollIntent(s, twin, B.rng);
  B.ev.push({ t: 'spawn', foe: id, family: twin.family, from: t.id, name: twin.name, text: `${t.name} splits in two!` });
  B.ev.push(intentEvent(twin));
}

// ---- grip & claim --------------------------------------------------------------------------------

function pickPiece(t, relic) {
  const held = (t.held || []).filter(p => p.held);
  return held.find(p => relic && (p.relic === relic || p.item?.base === relic)) || held[0] || null;
}

const pieceName = p => (p.relic ? RELICS[p.relic].name : p.item?.name || 'relic');

export function applyGrip(B, src, t, { crush = 0, dice = null, stat = null, crit = false, relic = null }) {
  const piece = alive(t) ? pickPiece(t, relic) : null;
  if (!piece) return;
  let g = Math.floor(crush * T.grip.crushMult);
  if (dice) g += rollExpr(B.rng, dice).total + modOf(src, stat);
  if (crit) g += Math.ceil(piece.max * T.grip.critPct);
  if (g <= 0) return;
  g += src?.stats?.gripDmg || 0;
  const from = piece.grip;
  piece.grip = Math.max(0, from - g);
  B.ev.push({ t: 'grip', target: t.id, relic: piece.relic || piece.item?.base, from, to: piece.grip, max: piece.max });
  if (piece.grip === 0) disarm(B, src, t, piece);
}

function disarm(B, src, t, piece) {
  piece.held = false;
  piece.by = src?.id || null;
  const relic = piece.relic || piece.item?.base;
  B.ev.push({ t: 'disarm', target: t.id, relic });
  const moves = familyData(t).moves;
  const arts = Object.values(moves).filter(m => m.requires === relic).map(m => m.name);
  B.ev.push({ t: 'text', text: `${pieceName(piece)} clatters loose!${arts.length ? ` ${t.name} loses ${arts.join(' and ')}.` : ''}` });
  if (t.tier === 'relic-bearer') t.die = stepDownDie(t.die);
  // M7: a hollow foe's gift takes its +4 with it, from the rolls she has already made too
  const gift = familyData(t).bonusWhile === relic;
  if (t.intent && moves[t.intent.move]?.requires === relic) {
    t.intent = rollIntent(B.s, t, B.rng, t.dice > 1 ? 0 : null);
    B.ev.push(intentEvent(t));
  } else if (gift && t.intent?.bonus) {
    t.intent = dropBonus(B.s, t, t.intent, B.rng);
    B.ev.push(intentEvent(t));
  }
  if (t.intent2 && moves[t.intent2.move]?.requires === relic) { // M7: the Unsmith's second die
    t.intent2 = rollIntent(B.s, t, B.rng, 1);
    B.ev.push(intentEvent(t, t.intent2));
  }
  t.queue = t.queue.map(q => refreshIntent(B.s, t, gift ? dropBonus(B.s, t, q, B.rng) : q, B.rng));
}

// ---- attacks ---------------------------------------------------------------------------------------

function attackBonus(a, eff) {
  const lit = a.statuses.reduce((n, st) => n + (STATUSES[st.id]?.hit || 0), 0); // M7: Hearthlit
  if (a.side !== 'hero') return a.atk + (eff.hit || 0) + lit; // a foe, or a guest built like one (M7)
  if (eff.weapon) return a.stats.weapon.hit + (eff.hit || 0) + lit;
  return a.stats.prof + modOf(a, eff.stat) + a.stats.hitOther + (eff.hit || 0) + lit;
}

function foeWeaponDice(a) {
  const relicWeapon = a.held.find(p => p.held && p.relic && RELICS[p.relic].weapon);
  return relicWeapon ? RELICS[relicWeapon.relic].weapon.dice : a.weapon?.dice;
}

// Dice groups for an attack: base dice, bonus dice, weapon riders and conditional bonuses.
function attackParts(a, t, eff) {
  const hero = a.side === 'hero';
  const w = hero ? a.stats.weapon : null;
  const parts = [];
  const base = eff.weapon ? (hero ? w.dice : foeWeaponDice(a) || eff.dice) : eff.dice;
  parts.push({ expr: base || '1d4', every: eff.diceEvery || (hero ? 0 : T.foe.diceEvery) });
  for (const b of eff.bonusDice || []) parts.push({ expr: b.dice, aspect: b.aspect });
  if (hero && eff.weapon) for (const x of w.extra) parts.push({ expr: x.dice, aspect: x.aspect });
  if (hero && t.hp <= t.maxHp / 2) for (const d of a.stats.vsHurt) parts.push({ expr: d });
  if (hero && ['marked', 'rooted', 'frozen', 'staggered'].some(id => statusOf(t, id))) for (const d of a.stats.vsUnaware) parts.push({ expr: d });
  return parts;
}

function attackFlat(a, eff) {
  if (a.side !== 'hero') return a.dmg; // a foe, or a guest built like one (M7)
  if (eff.weapon) return a.stats.weapon.flat;
  return (eff.noMod ? 0 : modOf(a, eff.stat)) + a.stats.dmgOther;
}

function attackKindAspect(a, eff) {
  const w = a.side === 'hero' ? a.stats.weapon : null;
  const kind = eff.kind || (eff.weapon && w ? w.dmg : null) || 'crush';
  const aspect = eff.aspect || eff.bonusDice?.find(b => b.aspect)?.aspect || (eff.weapon && w ? w.aspect : null) || null;
  return { kind, aspect };
}

function rollAttack(B, a, t, eff) {
  const adv = !!eff.adv || anyStatus(t, 'attackersAdv');
  const dis = anyStatus(a, 'attackDis') || anyStatus(a, 'hex'); // M6: a hexed attacker; advantage cancels it
  const r = rollD20(B.rng, { adv, dis });
  const bonus = attackBonus(a, eff);
  const vs = effGuard(t);
  const total = r.kept + bonus;
  const critAt = a.side === 'hero' ? a.stats.critRange : 20;
  let result;
  if (r.kept === 1) result = 'fumble';
  else if (r.kept >= critAt) result = 'crit';
  else if (total >= vs) result = 'hit';
  else if (vs - total <= T.attack.grazeWindow) result = 'graze';
  else result = 'miss';
  B.ev.push({ t: 'roll', actor: a.id, target: t.id, purpose: 'attack', die: 20, rolls: r.rolls, kept: r.kept, bonus, total, vs, result, adv, dis });
  if (a.side === 'hero' && r.kept === 20 && B.s.log) B.s.log.nat20[a.id] = (B.s.log.nat20[a.id] || 0) + 1; // M4: the Legend Strike deed
  return result;
}

export function resolveAttack(B, a, t, eff) {
  const result = eff.autoCrit ? 'crit' : rollAttack(B, a, t, eff);
  if (result === 'fumble') {
    a.fumbled = true;
    B.ev.push({ t: 'text', text: `${a.name} fumbles and loses their footing.` });
  }
  if (result === 'miss' || result === 'fumble') return result;
  const crit = result === 'crit';
  const graze = result === 'graze';
  const { kind, aspect } = attackKindAspect(a, eff);
  const dice = [];
  let sum = 0;
  for (const p of attackParts(a, t, eff)) {
    const r = rollTerms(B.rng, scaledTerms(p.expr, levelOf(a), p.every).terms, crit ? T.attack.critDiceMult : 1);
    for (const d of r.dice) dice.push(p.aspect ? { ...d, aspect: p.aspect } : d);
    sum += r.total;
  }
  const flat = attackFlat(a, eff) + (statusOf(t, 'marked') ? STATUSES.marked.bonusDmg : 0);
  let raw = Math.max(1, sum + flat) * (eff.mult || 1);
  if (graze) raw *= T.attack.grazeMult;
  const m = damageMult(t, kind, aspect);
  const final = m === 0 ? 0 : Math.max(1, Math.round(raw * m));
  const dealt = dealDamage(B, a, t, final, { dice, flat, kind, aspect, eff: effLabel(m), crit, graze });
  if (a.side === 'hero') addSurge(B, a, crit ? T.surge.crit : graze ? T.surge.graze : T.surge.hit);
  if (kind === 'crush' || eff.grip || crit) applyGrip(B, a, t, { crush: kind === 'crush' ? dealt : 0, dice: eff.grip, stat: eff.gripStat, crit, relic: B.relic });
  if (!graze && alive(t)) {
    for (const rider of eff.riders || []) applyEffect(B, a, t, rider);
    if (a.side === 'foe') for (const o of a.omens) for (const rider of OMENS[o]?.riders || []) applyEffect(B, a, t, rider);
  }
  reflectThorns(B, a, t, eff, dealt);
  return result;
}

// Thornskinned foes bounce melee damage back at the attacker.
function reflectThorns(B, a, t, eff, dealt) {
  if (!dealt || !t.omens?.includes('thornskinned') || !alive(a)) return;
  const ranged = eff.ranged || (a.side === 'hero' && eff.weapon && a.stats.weapon.ranged);
  if (ranged) return;
  const back = Math.max(1, Math.floor(dealt * OMENS.thornskinned.reflect));
  dealDamage(B, t, a, back, { kind: 'pierce', aspect: 'verdant', eff: 'normal' });
}

// ---- non-roll effects ------------------------------------------------------------------------------

export function savingThrow(B, t, ability, dc, src) {
  const dis = anyStatus(t, 'hex'); // M6: a hexed unit saves with disadvantage
  const r = rollD20(B.rng, { dis });
  const bonus = saveBonus(t, ability);
  const total = r.kept + bonus;
  const ok = r.kept === 20 || (r.kept !== 1 && total >= dc);
  B.ev.push({ t: 'roll', actor: t.id, target: src?.id || null, purpose: 'save', ability, die: 20, rolls: r.rolls, kept: r.kept, bonus, total, vs: dc, result: ok ? 'save' : 'fail', adv: false, dis });
  return ok;
}

function resolveDamage(B, a, t, eff) {
  const saved = eff.save ? savingThrow(B, t, eff.save, saveDC(a), a) : false;
  const r = rollExpr(B.rng, eff.dice, levelOf(a), eff.diceEvery || (a.side === 'hero' ? 0 : T.foe.diceEvery));
  const flat = a.side === 'hero' ? modOf(a, eff.stat) : Math.floor((a.dmg || 0) / 2);
  let raw = Math.max(1, r.total + flat);
  if (saved) raw = Math.floor(raw / 2);
  const kind = eff.kind || eff.aspect || 'crush';
  const m = damageMult(t, kind, eff.aspect);
  const final = m === 0 ? 0 : Math.max(1, Math.round(raw * m));
  const dealt = dealDamage(B, a, t, final, { dice: r.dice.map(d => ({ ...d, aspect: eff.aspect || undefined })), flat, kind, aspect: eff.aspect, eff: effLabel(m) });
  if (a.side === 'hero') addSurge(B, a, T.surge.graze);
  if (kind === 'crush') applyGrip(B, a, t, { crush: dealt, relic: B.relic });
  if (!saved && alive(t)) for (const rider of eff.riders || []) applyEffect(B, a, t, rider);
}

function resolveHeal(B, a, t, eff) {
  const r = eff.dice ? rollExpr(B.rng, eff.dice, levelOf(a), eff.diceEvery) : { total: 0, dice: [] };
  let amt = r.total + modOf(a, eff.stat) + (eff.pct ? Math.round(t.maxHp * eff.pct) : 0);
  if (a.side === 'hero') amt = Math.round(amt * (1 + (a.stats.healBonus || 0) / 100));
  const healed = applyHeal(B, t, Math.max(1, amt), { dice: r.dice, actor: a.id });
  if (a.side === 'hero' && a !== t && healed) addSurge(B, a, T.surge.healGiven);
}

function resolveStatus(B, a, t, eff) {
  if (eff.save && savingThrow(B, t, eff.save, saveDC(a), a)) return;
  let value;
  if (eff.value) value = rollExpr(B.rng, eff.value.dice, levelOf(a), eff.value.diceEvery).total + modOf(a, eff.value.stat);
  addStatus(B, t, eff.status, { stacks: eff.stacks || 1, turns: eff.turns, value, source: a.id, label: eff.label });
}

// M6 (spec §4.4, Hodge's Toll Is Due): the target's next turn comes a whole turn later (`turns` of its own
// delay), unless it makes the save (`dc`, else the user's save DC).
function resolveDelay(B, a, t, eff) {
  if (eff.save && savingThrow(B, t, eff.save, eff.dc ?? saveDC(a), a)) return;
  t.next += Math.round(t.delay * (eff.turns || 1));
  B.ev.push({ t: 'text', text: eff.text ? eff.text.replaceAll('{target}', t.name) : `${t.name} loses a turn.` });
}

function resolveCleanse(B, t, eff) {
  const ids = eff.statuses || t.statuses.filter(st => STATUSES[st.id]?.harmful).slice(0, eff.harmful || 1).map(st => st.id);
  for (const id of ids) if (statusOf(t, id)) removeStatus(B, t, id);
}

function resolveRevive(B, t, eff) {
  if (!t.ko || t.gone) return;
  t.ko = false;
  t.hp = Math.max(1, Math.round(t.maxHp * (eff.pct || 0.25)));
  t.statuses = [];
  t.next = B.s.time + Math.round(t.delay * 0.5);
  B.ev.push({ t: 'revive', target: t.id, hp: t.hp });
  B.ev.push({ t: 'heal', target: t.id, amount: t.hp, hp: t.hp });
}

function resolveReveal(B, t, eff) {
  const foes = eff.all ? B.s.order.map(id => B.s.units[id]).filter(u => u.side === 'foe' && alive(u)) : [t];
  for (const f of foes) {
    if (f.side !== 'foe') continue;
    f.analyzed = true;
    while (f.queue.length < (eff.ahead || 1)) {
      f.queue.push(rollIntent(B.s, f, B.rng));
      B.ev.push({ ...intentEvent({ ...f, intent: f.queue[f.queue.length - 1] }), queued: true, index: f.queue.length });
    }
  }
}

function resolveSummon(B, a, eff) {
  const s = B.s;
  for (let i = 0; i < (eff.count || 1); i++) {
    const up = Object.values(s.units).filter(u => alive(u) && u.summonedBy === a.id).length;
    if (up >= (eff.max || 2)) return;
    const id = `f${++s.nextId}`;
    const u = buildFoe({ family: eff.family, variant: eff.variant, level: Math.max(1, a.level + (eff.levelDelta || 0)), gearTier: 0, omens: [], summonedBy: a.id, noLoot: true }, { id, seq: s.seq++ });
    u.xp = 0;
    u.gold = 0;
    u.next = s.time + Math.round(u.delay * 0.6);
    s.units[id] = u;
    s.order.push(id);
    u.intent = rollIntent(s, u, B.rng);
    B.ev.push({ t: 'spawn', foe: id, family: u.family, from: a.id, name: u.name, text: `A ${u.name} tears up out of the floor.` });
    B.ev.push(intentEvent(u));
  }
}

export function applyEffect(B, a, t, eff) {
  switch (eff.type) {
    case 'attack': return resolveAttack(B, a, t, eff);
    case 'damage': return resolveDamage(B, a, t, eff);
    case 'heal': return resolveHeal(B, a, t, eff);
    case 'status': return resolveStatus(B, a, t, eff);
    case 'cleanse': return resolveCleanse(B, t, eff);
    case 'delay': return resolveDelay(B, a, t, eff);
    case 'revive': return resolveRevive(B, t, eff);
    case 'grip': return applyGrip(B, a, t, { dice: eff.dice, stat: eff.stat, relic: B.relic });
    case 'reveal': return resolveReveal(B, t, eff);
    case 'surge': return addSurge(B, t, eff.amount);
    case 'mp': t.mp = Math.min(t.maxMp, t.mp + eff.amount); return undefined;
    case 'summon': return resolveSummon(B, a, eff);
    case 'escape':
      a.gone = true;
      B.ev.push({ t: 'escape', foe: a.id, text: `${a.name} breaks and runs.` });
      release(B, a, 'is dropped as it runs.');
      return undefined;
    default: return undefined;
  }
}

// Run an effect list against a target list. `self` effects land on the user; revive only
// touches the fallen; everything else skips the fallen.
export function runEffects(B, a, effects, targets) {
  for (const eff of effects) {
    const list = eff.self || eff.type === 'summon' || eff.type === 'escape' ? [a.id] : targets;
    for (const id of list) {
      const t = B.s.units[id];
      if (!t || t.gone) continue;
      if (eff.type === 'revive' ? !t.ko : t.ko) continue;
      applyEffect(B, a, t, eff);
    }
  }
}
