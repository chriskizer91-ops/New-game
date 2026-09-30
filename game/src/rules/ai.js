// Foe intent selection from move tables, and foe targeting. Deterministic via the battle RNG.
// M7 (spec §4.2, §4.3, §4.4): the hollow tier's +4 while the gift is held (dieBonus); the Unsmith's two dice (an
// intent's `slot`, 0 or 1); his Stolen Arts (a table row whose move is 'stolen'); and the guest, a unit on the heroes'
// side (`side: 'ally'`, `guest: true`) that the engine plays: it aims at the foes, and the foes aim at it as at any
// hero (teamOf, opponentsOf).

import { FOES, FOE_TIERS, DIE_STEPS } from '../data/foes.js';
import { HEROES } from '../data/heroes.js';
import { STATUSES } from '../data/statuses.js';
import { withKit } from '../data/rivals.js';
import { weightedPick } from './util.js';

export const alive = u => u && !u.ko && !u.gone;
export const unitsOf = (s, side) => s.order.map(id => s.units[id]).filter(u => u.side === side);
// M7: the heroes' side is the party and its guest; a foe's side is the foes
export const teamOf = (s, side) => s.order.map(id => s.units[id]).filter(u => (side === 'foe' ? u.side === 'foe' : u.side === 'hero' || u.side === 'ally'));
export const opponentsOf = (s, u) => teamOf(s, u.side === 'foe' ? 'hero' : 'foe');
export const hasStatus = (u, id) => u.statuses.some(st => st.id === id);
// M5: a burrowed or swallowed unit is still in the fight but cannot be targeted, and area moves pass over it
export const targetable = u => alive(u) && !u.statuses.some(st => STATUSES[st.id]?.untargetable);

export function familyData(foe) {
  const fam = FOES[foe.family];
  const v = foe.variant && fam.variants?.[foe.variant];
  const f = withKit(v ? { ...fam, ...v } : fam, foe.variant, foe.kit); // M5: Tamsin's kit for the duel
  return foe.stolen ? { ...f, moves: { ...f.moves, ...foe.stolen.moves } } : f; // M7: the Unsmith's Stolen Arts
}

// Champions read the table of their current phase (phase is 1-based, like the art).
export function foeTable(foe) {
  const fam = familyData(foe);
  return fam.phases ? fam.phases[(foe.phase || 1) - 1].table : fam.table;
}

export const holds = (foe, relicId) => foe.held.some(p => p.held && (p.relic === relicId || p.item?.base === relicId));

// M7 (spec §4.2): what the tier adds to the intent die: the hollow tier's +4, while the family's gift (`bonusWhile`)
// is still held. Pried loose, the gift takes the +4 with it.
export function dieBonus(foe) {
  const bonus = FOE_TIERS[foe.tier]?.bonus || 0;
  if (!bonus) return 0;
  const gift = familyData(foe).bonusWhile;
  return !gift || holds(foe, gift) ? bonus : 0;
}

// M7 (spec §4.4): a table row whose move is 'stolen' is one of the Unsmith's Stolen Arts, picked by the face; with
// none taken yet, the family's `stolenFallback`.
function tableMove(foe, id, face) {
  if (id !== 'stolen') return id;
  const ids = foe.stolen?.ids || [];
  return ids.length ? `stolen:${ids[(face - 1) % ids.length]}` : (familyData(foe).stolenFallback || id);
}

// Is this move usable right now? Unavailable moves fall back (Old Snag without his hatchet
// simply tusks you).
function usable(s, foe, move) {
  if (!move) return false;
  if (move.requires && !holds(foe, move.requires)) return false;
  if (move.when?.hpBelow && foe.hp / foe.maxHp >= move.when.hpBelow) return false;
  const summon = move.effects.find(e => e.type === 'summon');
  if (summon) {
    const up = Object.values(s.units).filter(u => alive(u) && u.summonedBy === foe.id).length;
    if (up >= summon.max) return false;
  }
  return true;
}

export function resolveMoveId(s, foe, moveId) {
  const moves = familyData(foe).moves;
  let id = moveId;
  for (let i = 0; i < 4 && !usable(s, foe, moves[id]); i++) id = moves[id]?.fallback || Object.keys(moves)[0];
  return id;
}

export function stepDownDie(die) {
  const i = DIE_STEPS.indexOf(die);
  return i > 0 ? DIE_STEPS[i - 1] : die;
}

// M6 (spec §4.4, Toll Is Due): the strongest of some units: the highest level, then the most max HP, then
// the first in the line.
export const strongest = units => units.reduce((b, u) => (!b || u.level > b.level || (u.level === b.level && u.maxHp > b.maxHp) ? u : b), null);

// Pick who a foe's move is aimed at. Foes focus the wounded, sometimes go for the healer,
// love a Marked target, and must answer a Challenge (provoked). M6: a move aimed at the `strongest`
// takes the strongest hero, a Challenge or not. M7: the guest is a hero to the foes; her own moves are aimed the
// other way round, at the foes (the wounded first) and at her own side's worst hurt.
export function chooseTarget(s, foe, move, rng) {
  if (move.target === 'self') return foe.id;
  if (move.target === 'all-enemies' || move.target === 'all-allies') return null;
  if (move.target === 'strongest') return strongest(opponentsOf(s, foe).filter(targetable))?.id ?? null;
  if (move.target === 'ally') {
    const allies = teamOf(s, foe.side).filter(targetable);
    return allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]?.id || foe.id;
  }
  if (foe.side !== 'foe') {
    const foes = opponentsOf(s, foe).filter(targetable);
    if (!foes.length) return null;
    return weightedPick(rng, foes.map(f => ({ v: f.id, w: (f.hp / f.maxHp < 0.35 ? 2.5 : f.hp / f.maxHp < 0.6 ? 1.4 : 1) * (hasStatus(f, 'marked') ? 3 : 1) })));
  }
  const heroes = opponentsOf(s, foe).filter(targetable);
  if (!heroes.length) return null;
  const prov = foe.statuses.find(st => st.id === 'provoked');
  if (prov && heroes.some(h => h.id === prov.source)) return prov.source;
  const entries = heroes.map(h => {
    let w = 1;
    const frac = h.hp / h.maxHp;
    if (frac < 0.35) w *= 2.5; else if (frac < 0.6) w *= 1.4;
    if (HEROES[h.heroId]?.skills.some(sk => sk.id === 'mend')) w *= 1.4;
    if (hasStatus(h, 'marked')) w *= 3;
    if (hasStatus(h, 'guarding')) w *= 0.5;
    return { v: h.id, w };
  });
  return weightedPick(rng, entries);
}

// "7: Bite at Wren"; an intent with no face (an opener, which is not rolled) is just "Toll Is Due at Wren"
function intentText(face, move, target) {
  return `${face == null ? '' : `${face}: `}${move.name}${move.charge ? ', charging' : ''}${target ? ` at ${target}` : ''}`;
}

// Roll the foe's intent die and read its move table. M7: the hollow tier adds its bonus to the natural roll (the face
// is capped at the die; the intent keeps `natural` and `bonus`), and a two-dice foe's second intent has `slot` 1.
export function rollIntent(s, foe, rng, slot = null) {
  const natural = rng.int(1, foe.die), bonus = dieBonus(foe);
  const face = Math.min(foe.die, natural + bonus);
  const row = foeTable(foe).find(([lo, hi]) => face >= lo && face <= hi) || foeTable(foe)[0];
  const moveId = resolveMoveId(s, foe, tableMove(foe, row[2], face));
  const move = familyData(foe).moves[moveId];
  const target = chooseTarget(s, foe, move, rng);
  const targetName = target && target !== foe.id ? s.units[target]?.name : null;
  return {
    die: foe.die, face, ...(bonus ? { natural, bonus } : {}), ...(slot != null ? { slot } : {}), move: moveId, name: move.name, target, charging: !!move.charge,
    text: intentText(face, move, targetName),
  };
}

// M7 (spec §4.2): a roll made while the gift held, read again once the gift is pried loose: the +4 goes with it, so
// the face drops back to the natural roll and the move is the table's for that face (her readied intent and the ones
// Analyze foresaw). A roll without the bonus is returned as it is.
export function dropBonus(s, foe, it, rng) {
  if (!it?.bonus) return it;
  const face = it.natural;
  const row = foeTable(foe).find(([lo, hi]) => face >= lo && face <= hi) || foeTable(foe)[0];
  const moveId = resolveMoveId(s, foe, tableMove(foe, row[2], face));
  const move = familyData(foe).moves[moveId];
  const target = chooseTarget(s, foe, move, rng);
  const targetName = target && target !== foe.id ? s.units[target]?.name : null;
  return {
    die: it.die, face, ...(it.slot != null ? { slot: it.slot } : {}), move: moveId, name: move.name, target, charging: !!move.charge,
    text: intentText(face, move, targetName),
  };
}

// M5: a move's `then` forces the foe's next intent (a Burrow's eruption): the same die face, the named move.
// M6: a family's `opener` passes face null: its first move is not rolled, so it shows no face.
export function intentFor(s, foe, moveId, rng, face = foe.die) {
  const id = resolveMoveId(s, foe, moveId);
  const move = familyData(foe).moves[id];
  const target = chooseTarget(s, foe, move, rng);
  const targetName = target && target !== foe.id ? s.units[target]?.name : null;
  return { die: foe.die, face, move: id, name: move.name, target, charging: !!move.charge, forced: true, text: intentText(face, move, targetName) };
}

export function intentEvent(foe, it = foe.intent) {
  return {
    t: 'intent', foe: foe.id, die: it.die, face: it.face, move: it.move, name: it.name, text: it.text, target: it.target, charging: it.charging,
    ...(it.bonus ? { natural: it.natural, bonus: it.bonus } : {}), ...(it.slot != null ? { slot: it.slot } : {}), ...(foe.side === 'ally' ? { side: 'ally' } : {}),
  };
}

// Re-aim a queued or stale intent whose target has fallen, and re-check availability.
export function refreshIntent(s, foe, intent, rng) {
  const moveId = resolveMoveId(s, foe, intent.move);
  const move = familyData(foe).moves[moveId];
  let target = intent.target;
  const needsTarget = move.target === 'enemy' || move.target === 'strongest';
  if (moveId !== intent.move || (needsTarget && !targetable(s.units[target]))) target = chooseTarget(s, foe, move, rng);
  const targetName = target && target !== foe.id ? s.units[target]?.name : null;
  return { ...intent, move: moveId, name: move.name, target, charging: !!move.charge, text: intentText(intent.face, move, targetName) };
}
