// A reasonable scripted hero policy: used by tools/sim.mjs and available to the UI as an
// "Auto" battle option. Deterministic (no RNG): same state, same choice.

import { SKILLS } from '../data/skills.js';
import { commands } from './battle.js';
import { alive, unitsOf, hasStatus } from './ai.js';
import { damageMult } from './combat.js';

const frac = u => u.hp / u.maxHp;
const holding = f => f.held?.some(p => p.held);
const gripLeft = f => f.held.filter(p => p.held).reduce((a, p) => a + p.grip, 0);
const elite = f => f.tier !== 'rabble';

function usable(cmds, id) {
  return cmds.find(c => c.id === id && c.enabled) || null;
}

// Hit the foe we can hurt most, finishing the wounded first; leave relic holders for last
// (a dead holder shatters its relic) unless nothing else is standing.
function priorityTarget(s, hero) {
  const foes = unitsOf(s, 'foe').filter(alive);
  const others = foes.filter(f => !holding(f));
  const pool = others.length ? others : foes;
  const w = hero.stats.weapon;
  const score = f => (1 - frac(f)) * 2 + damageMult(f, w.dmg, w.aspect) + (f.summonedBy ? 0.6 : 0) - (elite(f) ? 0 : 0.2) + (f.maxHp < 20 ? 0.3 : 0);
  return pool.sort((a, b) => score(b) - score(a) || a.hp - b.hp)[0];
}

function bossOf(s) {
  return unitsOf(s, 'foe').filter(alive).sort((a, b) => b.maxHp - a.maxHp)[0];
}

function healPlan(s, cmds, opts) {
  const heroes = unitsOf(s, 'hero');
  const down = heroes.filter(h => h.ko && !h.gone);
  const hurt = heroes.filter(alive).sort((a, b) => frac(a) - frac(b));
  const revive = usable(cmds, 'revive');
  if (down.length && revive) return { ...revive, target: down[0].id };
  const dawn = usable(cmds, 'dawnsong');
  if (dawn && hurt.filter(h => frac(h) < 0.6).length >= 3) return dawn;
  const mend = usable(cmds, 'mend');
  if (mend && hurt[0] && frac(hurt[0]) < opts.healAt) return { ...mend, target: hurt[0].id };
  return null;
}

function itemPlan(s, hero, cmds) {
  const heroes = unitsOf(s, 'hero');
  const healerUp = heroes.some(h => alive(h) && h.skills.includes('mend') && h.mp >= SKILLS.mend.mp);
  const down = heroes.filter(h => h.ko && !h.gone);
  const reviverUp = heroes.some(h => alive(h) && h.skills.includes('revive') && h.mp >= SKILLS.revive.mp);
  const salts = usable(cmds, 'ember-salts');
  if (down.length && salts && !reviverUp) return { ...salts, target: down[0].id };
  const tonic = usable(cmds, 'hearth-tonic');
  const worst = heroes.filter(alive).sort((a, b) => frac(a) - frac(b))[0];
  if (tonic && worst && frac(worst) < (healerUp ? 0.2 : 0.35)) return { ...tonic, target: worst.id };
  return null;
}

function gripPlan(s, cmds) {
  const holder = unitsOf(s, 'foe').filter(f => alive(f) && holding(f)).sort((a, b) => gripLeft(a) - gripLeft(b))[0];
  if (!holder) return null;
  for (const id of ['disarm', 'sunder', 'wrench']) {
    const c = usable(cmds, id);
    if (c) return { ...c, target: holder.id };
  }
  return null;
}

function controlPlan(s, hero, cmds) {
  const boss = bossOf(s);
  const foes = unitsOf(s, 'foe').filter(alive);
  if (!boss) return null;
  const splinters = usable(cmds, 'heartwood-splinters');
  if (splinters && foes.length >= 3) return splinters;
  const volley = usable(cmds, 'volley');
  if (volley && foes.length >= 3) return volley;
  const analyze = usable(cmds, 'analyze');
  if (analyze && elite(boss) && !hasStatus(boss, 'exposed')) return { ...analyze, target: boss.id };
  const mark = usable(cmds, 'mark-prey');
  if (mark && elite(boss) && !hasStatus(boss, 'marked') && boss.hp > 30) return { ...mark, target: boss.id };
  const rings = usable(cmds, 'read-the-rings');
  if (rings && elite(boss) && !unitsOf(s, 'hero').some(h => hasStatus(h, 'hasted'))) return rings;
  const root = usable(cmds, 'rootbind');
  if (root && elite(boss) && !hasStatus(boss, 'rooted')) return { ...root, target: boss.id };
  return null;
}

function artPlan(s, hero, cmds) {
  const t = priorityTarget(s, hero);
  if (!t) return null;
  for (const id of ['kindle-strike', 'stillwater-thrust', 'sunder', 'tally-cut', 'knife-work']) {
    const c = usable(cmds, id);
    if (c && hero.mp >= c.mp + 2 && (elite(t) || t.hp > 12)) return { ...c, target: t.id };
  }
  const hew = usable(cmds, 'hew');
  if (hew && unitsOf(s, 'foe').filter(alive).length >= 2) return hew;
  const lance = usable(cmds, 'radiant-lance');
  if (lance && damageMult(t, 'radiant', 'radiant') > 1 && hero.mp >= 8) return { ...lance, target: t.id };
  return null;
}

function surgePlan(s, hero, cmds) {
  const c = usable(cmds, 'surge');
  if (!c) return null;
  if (c.targeting === 'enemy') return { ...c, target: (bossOf(s) || priorityTarget(s, hero)).id };
  if (c.targeting === 'ally') return { ...c, target: hero.id };
  return c;
}

export function autoCommand(state, heroId, opts = {}) {
  const o = { healAt: 0.45, ...opts };
  const hero = state.units[heroId];
  const cmds = commands(state, heroId);
  const plan = surgePlan(state, hero, cmds)
    || healPlan(state, cmds, o)
    || itemPlan(state, hero, cmds)
    || gripPlan(state, cmds)
    || controlPlan(state, hero, cmds)
    || artPlan(state, hero, cmds);
  if (plan) return plan;
  const t = priorityTarget(state, hero);
  return { ...usable(cmds, 'attack'), target: t?.id };
}
