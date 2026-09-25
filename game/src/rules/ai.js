// Foe intent selection from move tables, and foe targeting. Deterministic via the battle RNG.

import { FOES, DIE_STEPS } from '../data/foes.js';
import { HEROES } from '../data/heroes.js';
import { weightedPick } from './util.js';

export const alive = u => u && !u.ko && !u.gone;
export const unitsOf = (s, side) => s.order.map(id => s.units[id]).filter(u => u.side === side);
export const hasStatus = (u, id) => u.statuses.some(st => st.id === id);

export function familyData(foe) {
  const fam = FOES[foe.family];
  const v = foe.variant && fam.variants?.[foe.variant];
  return v ? { ...fam, ...v } : fam;
}

// Champions read the table of their current phase (phase is 1-based, like the art).
export function foeTable(foe) {
  const fam = familyData(foe);
  return fam.phases ? fam.phases[(foe.phase || 1) - 1].table : fam.table;
}

export const holds = (foe, relicId) => foe.held.some(p => p.held && (p.relic === relicId || p.item?.base === relicId));

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

// Pick who a foe's move is aimed at. Foes focus the wounded, sometimes go for the healer,
// love a Marked target, and must answer a Challenge (provoked).
export function chooseTarget(s, foe, move, rng) {
  if (move.target === 'self') return foe.id;
  if (move.target === 'all-enemies' || move.target === 'all-allies') return null;
  if (move.target === 'ally') {
    const allies = unitsOf(s, 'foe').filter(alive);
    return allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]?.id || foe.id;
  }
  const heroes = unitsOf(s, 'hero').filter(alive);
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

function intentText(face, move, target) {
  return `${face}: ${move.name}${move.charge ? ', charging' : ''}${target ? ` at ${target}` : ''}`;
}

// Roll the foe's intent die and read its move table.
export function rollIntent(s, foe, rng) {
  const face = rng.int(1, foe.die);
  const row = foeTable(foe).find(([lo, hi]) => face >= lo && face <= hi) || foeTable(foe)[0];
  const moveId = resolveMoveId(s, foe, row[2]);
  const move = familyData(foe).moves[moveId];
  const target = chooseTarget(s, foe, move, rng);
  const targetName = target && target !== foe.id ? s.units[target]?.name : null;
  return {
    die: foe.die, face, move: moveId, name: move.name, target, charging: !!move.charge,
    text: intentText(face, move, targetName),
  };
}

export function intentEvent(foe) {
  const it = foe.intent;
  return { t: 'intent', foe: foe.id, die: it.die, face: it.face, move: it.move, name: it.name, text: it.text, target: it.target, charging: it.charging };
}

// Re-aim a queued or stale intent whose target has fallen, and re-check availability.
export function refreshIntent(s, foe, intent, rng) {
  const moveId = resolveMoveId(s, foe, intent.move);
  const move = familyData(foe).moves[moveId];
  let target = intent.target;
  const needsTarget = move.target === 'enemy';
  if (moveId !== intent.move || (needsTarget && !alive(s.units[target]))) target = chooseTarget(s, foe, move, rng);
  const targetName = target && target !== foe.id ? s.units[target]?.name : null;
  return { ...intent, move: moveId, name: move.name, target, charging: !!move.charge, text: intentText(intent.face, move, targetName) };
}
