// Headless auto-battler: plays the whole Gauntlet with the scripted policy in
// src/rules/autoplay.js across many seeds and prints balance tables.
//
//   node tools/sim.mjs [--seeds 200] [--starter hearthbrand|stillwater-lance|cairnmaul|mix] [--md]
//
// Modes (each seed plays all of them):
//   bare    Waking 0, starting gear only, no grinding
//   equip   Waking 0, equips drops when they are upgrades, no grinding
//   grind1  Waking 0, equips drops, grinds patrols for +1 level before Briarmaw
//   grind   Waking 0, equips drops, grinds patrols for +2 levels before Briarmaw
//   wake1   continues `grind` into Waking 1 (equips drops, grinds +1 level before Briarmaw)
//   wake2   continues into Waking 2

import { newGame, startBattle, resolveBattle, advance, rest, currentNode, canAdvance } from '../src/rules/gauntlet.js';
import { current, act, foeTurn, outcome } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { ENCOUNTERS, GAUNTLET } from '../src/data/encounters.js';
import { RARITY_ORDER } from '../src/data/rarity.js';
import { RELICS } from '../src/data/relics.js';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg('seeds', 200);
const STARTER = arg('starter', 'mix');
const MD = args.includes('--md');
const ONLY = arg('modes', 'bare,equip,grind1,grind,wake1,wake2').split(',');
const STARTERS = ['hearthbrand', 'stillwater-lance', 'cairnmaul'];
const MAX_TRIES = 6;

function fight(battle, stats) {
  let b = battle;
  for (let n = 0; current(b) && n < 2000; n++) {
    const id = current(b);
    const r = b.units[id].side === 'hero' ? act(b, autoCommand(b, id)) : foeTurn(b);
    for (const e of r.events) {
      if (e.t === 'roll' && e.purpose === 'attack' && b.units[e.actor]?.side === 'hero') {
        stats.rolls[e.result] = (stats.rolls[e.result] || 0) + 1;
        stats.rolls.n += 1;
      }
    }
    b = r.state;
  }
  return b;
}

function equipDrops(g, items) {
  let game = g;
  for (const it of items) {
    if (it.shattered) continue;
    const who = bestHeroFor(game, it);
    if (who) game = equip(game, who, it.uid).game;
  }
  return game;
}

// Party HP left at the end of a battle, as a fraction of max HP.
const hpLeft = b => {
  const p = outcome(b).party;
  return p.reduce((a, h) => a + h.hp, 0) / p.reduce((a, h) => a + h.maxHp, 0);
};

function newNodeStats() {
  return Object.fromEntries(GAUNTLET.filter(id => ENCOUNTERS[id].type === 'fight').map(id => [id, { tries: 0, first: 0, firstWins: 0, wins: 0, wipes: 0, rounds: [], hpLeft: [], level: [], stuck: 0, claims: 0, shatters: 0 }]));
}

// Random and worn-gear drops by rarity (named relics are counted in the claimed column).
function recordDrops(stats, items) {
  for (const it of items) {
    if (RELICS[it.base] && !it.shattered) { stats.relics++; continue; }
    const k = it.shattered ? 'shattered' : it.rarity;
    stats.drops[k] = (stats.drops[k] || 0) + 1;
  }
}

// Play one Gauntlet run from wherever `g` stands (the start of a Waking) through the Brand.
function playRun(g, mode, stats) {
  const grindTo = mode.grind ? mode.grind : 0;
  const tries = {};
  for (let step = 0; step < 400; step++) {
    const node = currentNode(g);
    if (node.type === 'hearthfire') {
      g = rest(g);
      if (grindTo && GAUNTLET[GAUNTLET.indexOf(node.id) + 1] === 'briarmaw-den') g = grind(g, grindTo, stats, mode);
      g = advance(g);
      continue;
    }
    if (canAdvance(g)) { g = advance(g); continue; }
    const ns = stats.nodes[node.id];
    tries[node.id] = (tries[node.id] || 0) + 1;
    if (tries[node.id] > MAX_TRIES) { ns.stuck++; return { g, done: false }; }
    const level = g.party.roster.warden.level;
    const started = startBattle(g);
    const b = fight(started.battle, stats);
    const res = resolveBattle(started.game, b);
    g = res.game;
    const rep = res.report;
    const first = tries[node.id] === 1;
    ns.tries++;
    if (first) { ns.first++; ns.level.push(level); ns.rounds.push(rep.rounds); }
    if (rep.result === 'victory') {
      ns.wins++;
      if (first) { ns.firstWins++; ns.hpLeft.push(hpLeft(b)); }
      recordDrops(stats, rep.drops);
      ns.claims += rep.claimed.filter(i => RELICS[i.base]).length;
      ns.shatters += rep.drops.filter(i => i.shattered).length;
      if (mode.equip) g = equipDrops(g, [...rep.claimed, ...rep.drops]);
      if (rep.brand) return { g, done: true };
    } else if (rep.result === 'defeat') {
      ns.wipes++;
      // A real player who just wiped grinds a level at the Hearthfire before trying again.
      g = grind(g, 1, stats, mode);
    }
  }
  return { g, done: false };
}

function grind(g, levels, stats, mode) {
  const target = g.party.roster.warden.level + levels;
  for (let i = 0; i < 60 && g.party.roster.warden.level < target; i++) {
    const started = startBattle(g, { patrol: true });
    const b = fight(started.battle, stats);
    const res = resolveBattle(started.game, b);
    g = res.game;
    stats.grindFights++;
    if (res.report.result === 'victory') {
      recordDrops(stats, res.report.drops);
      if (mode.equip) g = equipDrops(g, res.report.drops);
    }
    g = rest(g); // grinding happens from a Hearthfire: rest between patrols
  }
  return g;
}

const MODES = {
  bare: { equip: false, grind: 0, label: 'Waking 0, starting gear only, no grinding' },
  equip: { equip: true, grind: 0, label: 'Waking 0, equips drops, no grinding' },
  grind1: { equip: true, grind: 1, label: 'Waking 0, equips drops, grinds +1 level before Briarmaw' },
  grind: { equip: true, grind: 2, label: 'Waking 0, equips drops, grinds +2 levels before Briarmaw' },
  wake1: { equip: true, grind: 1, label: 'Waking 1 (continues from grind), equips drops, +1 level before Briarmaw' },
  wake2: { equip: true, grind: 1, label: 'Waking 2, equips drops, +1 level before Briarmaw' },
};

function newStats() {
  return { nodes: newNodeStats(), rolls: { n: 0 }, drops: {}, relics: 0, grindFights: 0, runs: 0, cleared: 0, endLevel: [] };
}

const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (a, b) => (b ? `${Math.round(100 * a / b)}%` : '-');
const f1 = x => (Number.isFinite(x) ? x.toFixed(1) : '-');

function simulate() {
  const all = Object.fromEntries(Object.keys(MODES).map(k => [k, newStats()]));
  for (let seed = 1; seed <= SEEDS; seed++) {
    const starter = STARTER === 'mix' ? STARTERS[seed % 3] : STARTER;
    for (const k of ['bare', 'equip', 'grind1'].filter(m => ONLY.includes(m))) {
      const st = all[k];
      const r = playRun(newGame({ name: 'Sim', starter, seed }), MODES[k], st);
      st.runs++; if (r.done) st.cleared++;
      st.endLevel.push(r.g.party.roster.warden.level);
    }
    let g = newGame({ name: 'Sim', starter, seed });
    for (const k of ['grind', 'wake1', 'wake2']) {
      if (!ONLY.includes(k) && !ONLY.some(m => ['wake1', 'wake2'].includes(m) && m > k)) break;
      const st = all[k];
      const r = playRun(g, MODES[k], st);
      st.runs++; if (r.done) st.cleared++;
      st.endLevel.push(r.g.party.roster.warden.level);
      if (!r.done) break;
      g = r.g;
    }
  }
  return all;
}

function table(rows, head) {
  if (MD) return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
  const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  const line = r => r.map((c, i) => String(c).padEnd(w[i])).join('  ');
  return [line(head), w.map(n => '-'.repeat(n)).join('  '), ...rows.map(line)].join('\n');
}

function report(all) {
  const out = [];
  out.push(`Aethermoor balance sim: ${SEEDS} seeds, starter ${STARTER}`);
  for (const [k, st] of Object.entries(all)) {
    if (!ONLY.includes(k)) continue;
    out.push('', `## ${MODES[k].label}`, '');
    const rows = Object.entries(st.nodes).filter(([, n]) => n.first).map(([id, n]) => [
      id, ENCOUNTERS[id].spawns.map(s => s.family).join('+'), f1(avg(n.level)), pct(n.firstWins, n.first), f1(avg(n.rounds)),
      pct(avg(n.hpLeft), 1), pct(n.first - n.firstWins, n.first), n.wipes, n.claims || '', n.shatters || '', n.stuck || '',
    ]);
    out.push(table(rows, ['node', 'foes', 'lvl', 'win 1st', 'rounds', 'hp left', 'wipe 1st', 'wipes', 'claimed', 'shattered', 'stuck']));
    const r = st.rolls;
    const drops = [...RARITY_ORDER, 'shattered'].filter(x => st.drops[x]).map(x => `${x} ${st.drops[x]}`).join(', ');
    out.push('', `runs cleared ${st.cleared}/${st.runs}; end level ${f1(avg(st.endLevel))}; grind fights/run ${f1(st.grindFights / Math.max(1, st.runs))}`);
    out.push(`hero attack rolls: hit ${pct((r.hit || 0), r.n)}, graze ${pct(r.graze || 0, r.n)}, crit ${pct(r.crit || 0, r.n)}, miss ${pct(r.miss || 0, r.n)}, fumble ${pct(r.fumble || 0, r.n)}`);
    out.push(`random/worn-gear drops by rarity: ${drops}; named relics dropped (regalia, gentle): ${st.relics}`);
  }
  return out.join('\n');
}

const t0 = performance.now();
const all = simulate();
console.log(report(all));
console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)}s)`);
