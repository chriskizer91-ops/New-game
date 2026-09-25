// Experience, levels 1-50, and what each level gives.
//
// XP to go from level L to L+1 = base * L^exp (TUNING.xp). hero.xp is the running total.
// Level-up: roll the hit die (never below half, shown as a die), +1 to two ability scores
// every 4 levels, new skills from the hero table, and +1 to the hero's Domain levels.

import { HEROES } from '../data/heroes.js';
import { TUNING } from '../data/tuning.js';
import { mod } from './util.js';

export const MAX_LEVEL = 50;

export function xpToNext(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(TUNING.xp.base * Math.pow(level, TUNING.xp.exp));
}

// Total XP needed to stand at `level`.
export function xpForLevel(level) {
  let total = 0;
  for (let l = 1; l < Math.min(level, MAX_LEVEL); l++) total += xpToNext(l);
  return total;
}

export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpTable(maxLevel = MAX_LEVEL) {
  return Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, total: xpForLevel(i + 1), next: xpToNext(i + 1) }));
}

// One level: returns the new hero and a description of the gains for the level-up screen.
export function levelUp(hero, rng) {
  const data = HEROES[hero.id];
  const level = (hero.level || 1) + 1;
  const die = data.hpDie;
  const rolled = rng.int(1, die);
  const value = Math.max(rolled, Math.ceil(die / 2)); // a bad roll never ruins a level
  const base = { ...hero.base };
  const stats = {};
  if (level % 4 === 0) {
    const pair = data.asi[(level / 4 - 1) % data.asi.length];
    for (const a of pair) { base[a] = Math.min(20, base[a] + 1); stats[a] = (stats[a] || 0) + 1; }
  }
  const newSkills = data.skills.filter(sk => sk.level === level && !(hero.skills || []).includes(sk.id)).map(sk => sk.id);
  const domains = { ...(hero.domains || {}) };
  for (const d of [data.domain, ...(data.secondary || [])]) {
    const cur = domains[d] || { level: 0, path: null, opt7: null, opt13: null };
    const cap = d === data.domain ? level : Math.ceil(level / 2);
    domains[d] = { ...cur, level: Math.min(20, Math.max(cur.level, cap)) };
  }
  const hpGain = Math.max(1, value + mod(base.CON));
  const next = {
    ...hero, level, base, domains,
    hpRolls: [...(hero.hpRolls || []), value],
    skills: [...(hero.skills || []), ...newSkills],
  };
  return { hero: next, gain: { level, hpRoll: { sides: die, rolled, value }, hp: hpGain, stats, skills: newSkills } };
}

// Add XP and apply every level it buys. Current HP/MP rise by the same amount as the max.
export function grantXp(hero, amount, rng) {
  let h = { ...hero, xp: (hero.xp || 0) + Math.max(0, Math.round(amount)) };
  const gains = [];
  while (h.level < MAX_LEVEL && h.xp >= xpForLevel(h.level + 1)) {
    const r = levelUp(h, rng);
    const mpGain = HEROES[h.id].mp.perLevel;
    h = { ...r.hero, hp: h.hp == null ? h.hp : h.hp + r.gain.hp, mp: h.mp == null ? h.mp : h.mp + mpGain };
    gains.push({ ...r.gain, mp: mpGain });
  }
  return { hero: h, gains };
}
