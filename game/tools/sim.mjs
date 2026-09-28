// Headless balance sim for M3 (spec §7 "Balance sim") and M4 (M4 spec §8 "Balance"): plays routes of
// encounters with the scripted policy in src/rules/autoplay.js across many seeds, teleporting between
// fights (no walking, no roaming packs), and prints balance tables.
//
//   node tools/sim.mjs [--seeds 200] [--starter hearthbrand|stillwater-lance|cairnmaul|mix] [--md]
//                      [--modes m2,direct,leads2,leads-all,looper-w2,first-lead,sunscorch,sunscorch-forged,sun-first-lead]
//
// Modes (targets from the spec):
//   m2          Waking 0, the M2 road in order, equips drops; a wipe grinds a level and retries.
//               Waking-0 first-try results within +-3 points of the M2 table in docs/RULES.md.
//   direct      m2, then straight down the critical path after the Brand: Eldergrove, the Tamsin
//               duel, the Heartroot, the Rotwarden. Party L10-12 at the Rotwarden; Rotwarden
//               first-try wipe 30-40%; Tamsin first-try party win 55-70%.
//   leads2      m2, then the Mosswatch and Bell leads (the Dawnbell's dream: Forewarned), then the
//               critical path. Rotwarden first-try wipe <= 20%.
//   leads-all   m2, then every lead, then the critical path.
//   looper-w2   the migrated v1-waking2-dupe fixture (Waking 2) down the critical path.
//               Rotwarden first-try wipe <= 45%.
//   first-lead  m2, then each lead's lair as the first thing done at Waking 1: 15-25% first-try wipe.
// M4 (Gate 4), each from the end state of a `direct` run (the party that just beat the Rotwarden, at
// Waking 2, Act I done):
//   sunscorch        home to the Keep, then SUN_PATH (data/world.js) with one zone patrol per zone map
//                    crossed; after Kharzul (the Brand of Glass: Waking 3) back up the shaft and through
//                    Sandspire to the Glass Flats. Kharzul and the Ashen Warden first-try wipe 30-40%;
//                    Tamsin at Scorchgate first-try party win 55-70%.
//   sunscorch-forged the same, with every hero's weapon tempered to +4 and one gem each (a Sunstone in
//                    the weapon, or in the first socketed piece they wear): both Champions <= 20%.
//   sun-first-lead   each Sunscorch lead's lair (SUN_LEADS) as the first thing done after Sandspire, at
//                    Waking 2: 15-25% first-try wipe.
// Every mode: zero stuck runs. A duel lost is a yield (not retried); the door opens anyway.
// Crossing a zone map costs a fight with one of its roaming patrols ('patrol:<zone>' in a route);
// a weak one is Routed instead. The m2 mode has none, to compare with M2.

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { newGame, startBattle, resolveBattle, rest, spawnsFor, partyLevel, routPack } from '../src/rules/gauntlet.js';
import { isWeak } from '../src/rules/world.js';
import { ZONES, SUN_PATH } from '../src/data/world.js';
import { migrate } from '../src/rules/migrate.js';
import { escalateSpawn, familyOf } from '../src/rules/foe.js';
import { current, act, foeTurn, outcome } from '../src/rules/battle.js';
import { autoCommand } from '../src/rules/autoplay.js';
import { equip, bestHeroFor } from '../src/rules/party.js';
import { socketsOf } from '../src/rules/forge.js';
import { createRng } from '../src/core/rng.js';
import { ENCOUNTERS, GAUNTLET, PATROLS } from '../src/data/encounters.js';
import { RARITY_ORDER } from '../src/data/rarity.js';
import { RELICS } from '../src/data/relics.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const SEEDS = +arg('seeds', 200);
const STARTER = arg('starter', 'mix');
const MD = args.includes('--md');
const ALL_MODES = ['m2', 'direct', 'leads2', 'leads-all', 'looper-w2', 'first-lead', 'sunscorch', 'sunscorch-forged', 'sun-first-lead'];
const SUN_MODES = ['sunscorch', 'sunscorch-forged', 'sun-first-lead'];
const ONLY = arg('modes', ALL_MODES.join(',')).split(',');
const ONE_SEED = arg('seed', null) ? +arg('seed') : null; // --seed N: replay one seed
const TRACE = args.includes('--trace');                    // print every fight
const STARTERS = ['hearthbrand', 'stillwater-lance', 'cairnmaul'];
const MAX_TRIES = 8; // a player who keeps wiping grinds a level each time; eight tries is 'stuck'

// Routes: hearthfire ids rest; fight ids are fought until cleared (duels once).
const AFTER_BRAND = ['patrol:thornway', 'eldergrove-hearth', 'tamsin-duel', 'patrol:heartroot', 'hr1-grubs', 'patrol:heartroot', 'hr1-sapwight', 'last-green-coal', 'rotwarden-heart'];
const LEAD_ROUTES = {
  mosswatch: ['thornhollow', 'patrol:mossfall', 'mossfall-cairn', 'mw-stair', 'mw-lantern', 'mosswatch-fire'],
  mire: ['thornhollow', 'patrol:mossfall', 'mossfall-cairn', 'mf-smugglers', 'mire-shrine', 'mossfall-cairn'],
  bell: ['thornhollow', 'patrol:hindwood', 'hindwood-cairn', 'hw-glowcaps', 'gloamwing-hollow', 'fawnrest-stone', 'dream'],
  grove: ['patrol:thornway', 'eldergrove-hearth', 'grove-circle', 'eldergrove-hearth'],
  roots: ['last-green-coal', 'hollowed-patrol', 'hr1-tappers', 'last-green-coal'],
};
const LEAD_LAIRS = { mosswatch: 'mw-lantern', mire: 'mire-shrine', bell: 'gloamwing-hollow', grove: 'grove-circle' };

// M4: the Sunscorch. Home to the Keep's Eternal Hearth first, then the Sunward Road. Every SUN_PATH id
// appears in order (checked below); the rest are the zone patrols of the maps walked through and the
// Hearthfires passed on the way. After the Brand of Glass (Waking 3) the party walks back up the Deep
// Shaft and the Dust Trail and rests at the Spire Hearth before the Glass Flats.
const SUN_START = ['hearthstone-keep', 'patrol:sun-road', 'waystone', 'sr-toll', 'spire-hearth'];
const SUN_ROUTE = [...SUN_START,
  'patrol:dust-trail', 'dt-scorpions', 'dust-cairn', 'pithead',
  'patrol:deep-shaft', 'ds-crew', 'shaft-lamp', 'kharzul-heart',
  'patrol:deep-shaft@back', 'patrol:dust-trail@back', 'spire-hearth',
  'patrol:glass-flats', 'gf-raiders',
  'patrol:scorchgate', 'last-watchfire', 'sg-captain', 'tamsin-scorchgate', 'vault-guard', 'ashen-warden'];
{
  const onPath = SUN_ROUTE.filter(id => SUN_PATH.includes(id));
  const firsts = onPath.filter((id, i) => onPath.indexOf(id) === i);
  if (firsts.join() !== SUN_PATH.join()) throw new Error(`SUN_ROUTE must walk SUN_PATH in order: ${firsts.join(', ')}`);
}
// Each lead's lair taken first, right after Sandspire (the dust-trail ones kindle the Dust Cairn first).
const SUN_LEAD_ROUTES = {
  caravan: ['patrol:glass-flats', 'gf-caravan'],
  wyrm: ['patrol:dust-trail', 'dust-cairn', 'wyrm-lair'],
  gnash: ['patrol:glass-flats', 'gnash-camp'],
  well: ['patrol:glass-flats', 'well-fire', 'wisp-queen'],
  aqueduct: ['patrol:dust-trail', 'dust-cairn', 'dt-aqueduct'],
};
// The zone a Sunscorch fight's backdrop grinds in (a wipe grinds a level on that zone's patrols).
const SUN_GRIND = {
  'sun-road': 'sun-road', sandspire: 'sun-road', 'dust-trail': 'dust-trail', 'deep-shaft': 'deep-shaft', 'glass-heart': 'deep-shaft',
  'glass-flats': 'glass-flats', miragewell: 'glass-flats', scorchgate: 'scorchgate', 'scorchgate-vaults': 'scorchgate',
};

function fight(battle, stats) {
  let b = battle;
  for (let n = 0; current(b) && n < 3000; n++) {
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

const hpLeft = b => {
  const p = outcome(b).party;
  return p.reduce((a, h) => a + h.hp, 0) / p.reduce((a, h) => a + h.maxHp, 0);
};

function nodeStats(stats, id) {
  stats.nodes[id] ||= { tries: 0, first: 0, firstWins: 0, wins: 0, wipes: 0, rounds: [], hpLeft: [], level: [], stuck: 0, claims: 0, shatters: 0, yields: 0 };
  return stats.nodes[id];
}

function recordDrops(stats, items) {
  for (const it of items) {
    if (RELICS[it.base] && !it.shattered) { stats.relics++; continue; }
    const k = it.shattered ? 'shattered' : it.rarity;
    stats.drops[k] = (stats.drops[k] || 0) + 1;
  }
}

// Grinding as in M2: rabble patrols at the level of the strongest rabble already beaten, from the
// patrol set of the last fight's backdrop, rest between patrols.
// M4: in the Sunscorch (ctx.sun) a wipe grinds on the zone patrols of the fight's map, as the world
// seeds them: the zone's level plus 0-1, escalated by the Waking.
function grind(g, levels, stats, ctx) {
  const target = partyLevel(g) + levels;
  const rng = ctx.rng;
  for (let i = 0; i < 60 && partyLevel(g) < target; i++) {
    const zone = ctx.sun ? ZONES[SUN_GRIND[ctx.backdrop] || 'sun-road'] : null;
    const set = rng.pick(zone ? PATROLS[zone.sets] : PATROLS[ctx.backdrop] || PATROLS['verdant-wood']);
    const lvl = zone ? zone.level + rng.int(0, 1) : Math.max(1, ctx.rabble);
    const spawns = set.map((sp, k) => ({ ...escalateSpawn({ ...sp, level: lvl }, g.progress.waking, `patrol#${k}`), spawnIndex: k }));
    const started = startBattle(g, { patrol: { spawns, where: 'The Wilds', backdrop: ctx.backdrop } }, { ambush: rng.chance(0.25) });
    const b = fight(started.battle, stats);
    const res = resolveBattle(started.game, b);
    g = res.game;
    stats.grindFights++;
    if (res.report.result === 'victory') { recordDrops(stats, res.report.drops); g = equipDrops(g, res.report.drops); }
    g = rest(g, g.progress.lastHearthfire);
  }
  return g;
}

// Play a route from `g`. Returns { g, done } (done: the route's last fight was won or yielded).
// One roaming zone patrol, as the world seeds them (rules/world.js seedRoamers): a weak one is Routed.
function patrolFight(g, key, stats, ctx) {
  const zoneId = key.split('@')[0];
  const zone = ZONES[zoneId];
  const set = ctx.rng.pick(PATROLS[zone.sets]);
  const level = zone.level + ctx.rng.int(0, 1);
  const spawns = set.map((sp, i) => ({ ...escalateSpawn({ ...sp, level }, g.progress.waking, `sim:${zoneId}:${i}`), spawnIndex: i }));
  const ns = nodeStats(stats, `patrol:${key}`);
  ns.first++;
  ns.level.push(partyLevel(g));
  if (isWeak(g, spawns)) { ns.routs = (ns.routs || 0) + 1; ns.firstWins++; ns.wins++; return routPack(g, { spawns }).game; }
  const started = startBattle(g, { patrol: { spawns, where: zoneId, backdrop: zone.backdrop } });
  const b = fight(started.battle, stats);
  const res = resolveBattle(started.game, b);
  if (ctx.sun) ctx.backdrop = zone.backdrop; // a Sunscorch wipe grinds on this zone's patrols
  ns.tries++;
  ns.rounds.push(res.report.rounds);
  if (res.report.result === 'victory') { ns.wins++; ns.firstWins++; ns.hpLeft.push(hpLeft(b)); recordDrops(stats, res.report.drops); return equipDrops(res.game, res.report.drops); }
  if (res.report.result === 'defeat') { ns.wipes++; return grind(rest(res.game, res.game.progress.lastHearthfire), 1, stats, ctx); }
  return res.game;
}

function playRoute(g, route, stats, ctx) {
  for (const id of route) {
    if (id === 'dream') { g = { ...g, progress: { ...g.progress, flags: { ...g.progress.flags, story: { ...g.progress.flags.story, 'bell-rung': true, forewarned: true } } } }; continue; }
    if (id.startsWith('patrol:')) { g = patrolFight(g, id.slice(7), stats, ctx); continue; } // 'patrol:<zone>[@tag]'
    const node = ENCOUNTERS[id];
    if (node.type === 'hearthfire') { g = rest(g, id); continue; }
    const f = g.progress.flags;
    if (f.done[id] || (f.cleared[id] && !node.brand)) continue;
    const ns = nodeStats(stats, id);
    for (let tries = 1; ; tries++) {
      if (tries > MAX_TRIES) { ns.stuck++; return { g, done: false, at: `${id} (seed ${ctx.seed}, party L${partyLevel(g)})` }; }
      const level = partyLevel(g);
      const spawns = spawnsFor(g, id);
      const started = startBattle(g, { nodeId: id });
      const b = fight(started.battle, stats);
      const res = resolveBattle(started.game, b);
      g = res.game;
      const rep = res.report;
      ns.tries++;
      if (TRACE) console.log(`  ${id} try ${tries}: ${rep.result}${rep.yield ? ' (yield)' : ''} at party L${level}, ${rep.rounds} rounds`);
      if (tries === 1) { ns.first++; ns.level.push(level); ns.rounds.push(rep.rounds); }
      ctx.backdrop = node.backdrop;
      if (rep.result === 'victory') {
        ns.wins++;
        if (tries === 1) { ns.firstWins++; ns.hpLeft.push(hpLeft(b)); }
        for (const s of spawns) if (familyOf(s).tier === 'rabble') ctx.rabble = Math.max(ctx.rabble, s.level);
        recordDrops(stats, rep.drops);
        ns.claims += rep.claimed.filter(i => RELICS[i.base]).length;
        ns.shatters += rep.drops.filter(i => i.shattered).length;
        g = equipDrops(g, [...rep.claimed, ...rep.drops]);
        break;
      }
      if (rep.yield) { ns.yields++; break; }
      if (rep.result === 'defeat') { ns.wipes++; g = grind(rest(g, g.progress.lastHearthfire), 1, stats, ctx); }
    }
  }
  return { g, done: true };
}

function newStats() {
  return { nodes: {}, rolls: { n: 0 }, drops: {}, relics: 0, grindFights: 0, runs: 0, cleared: 0, endLevel: [], entryLevel: [], stuck: 0 };
}

const avg = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (a, b) => (b ? `${Math.round(100 * a / b)}%` : '-');
const f1 = x => (Number.isFinite(x) ? x.toFixed(1) : '-');

const LOOPER = JSON.parse(readFileSync(path.join(root, 'test/fixtures/v1/v1-waking2-dupe.json'), 'utf8'));

// The forged party (sunscorch-forged): every hero's weapon tempered to +4, and one gem each: a
// Dusthaven Sunstone in the weapon if it has a socket, else in the first socketed piece they wear.
function forgeParty(game, stats) {
  const g = structuredClone(game);
  for (const id of g.party.active) {
    const gear = g.party.roster[id].gear;
    const weapon = gear.weapon && g.inventory.find(i => i.uid === gear.weapon);
    if (weapon) weapon.temper = Math.max(weapon.temper || 0, 4);
    const socketed = [weapon, ...Object.values(gear).map(uid => uid && g.inventory.find(i => i.uid === uid))]
      .find(it => it && !it.shattered && socketsOf(it) > 0 && !(it.gems || []).some(Boolean));
    if (socketed) { socketed.gems = ['sunstone', ...(socketed.gems || []).slice(1)]; stats.gemmed = (stats.gemmed || 0) + 1; stats.gemInWeapon = (stats.gemInWeapon || 0) + (socketed === weapon ? 1 : 0); }
    stats.forgedHeroes = (stats.forgedHeroes || 0) + 1;
  }
  return g;
}

function simulate() {
  const all = Object.fromEntries(ALL_MODES.map(k => [k, newStats()]));
  const run = (k, g, route, ctx) => {
    const st = all[k];
    const r = playRoute(g, route, st, ctx);
    st.runs++;
    if (r.done) st.cleared++; else { st.stuck++; st.stuckSeeds = [...(st.stuckSeeds || []), r.at ? `${r.at}` : '?']; }
    st.endLevel.push(partyLevel(r.g));
    return r;
  };
  for (let seed = ONE_SEED ?? 1; seed <= (ONE_SEED ?? SEEDS); seed++) {
    const starter = STARTER === 'mix' ? STARTERS[seed % 3] : STARTER;
    const ctx0 = () => ({ rng: createRng(`sim:${seed}`), rabble: 1, backdrop: 'hearth-road', seed });
    const need = ONLY.filter(m => m !== 'looper-w2');
    let base = null;
    if (need.length) {
      const ctx = ctx0();
      const r = run('m2', newGame({ name: 'Sim', starter, seed }), GAUNTLET, ctx);
      if (r.done) base = { g: r.g, ctx };
    }
    if (base) {
      const fork = () => ({ g: base.g, ctx: { ...base.ctx, rng: createRng(`sim:${seed}:fork`) } });
      let sunBase = null; // M4: the end state of the direct run, the party that just beat the Rotwarden
      if (ONLY.includes('direct') || ONLY.some(m => SUN_MODES.includes(m))) {
        const f = fork();
        const r = run('direct', f.g, AFTER_BRAND, f.ctx);
        if (r.done) sunBase = { g: r.g, ctx: f.ctx };
      }
      if (sunBase) {
        const sunFork = salt => ({ g: sunBase.g, ctx: { ...sunBase.ctx, sun: true, rng: createRng(`sim:${seed}:sun:${salt}`) } });
        const entry = st => st.entryLevel.push(partyLevel(sunBase.g));
        if (ONLY.includes('sunscorch')) { const f = sunFork('path'); entry(all.sunscorch); run('sunscorch', f.g, SUN_ROUTE, f.ctx); }
        if (ONLY.includes('sunscorch-forged')) { const f = sunFork('path'); entry(all['sunscorch-forged']); run('sunscorch-forged', forgeParty(f.g, all['sunscorch-forged']), SUN_ROUTE, f.ctx); }
        if (ONLY.includes('sun-first-lead')) {
          for (const lead of Object.keys(SUN_LEAD_ROUTES)) { const f = sunFork(lead); entry(all['sun-first-lead']); run('sun-first-lead', f.g, [...SUN_START, ...SUN_LEAD_ROUTES[lead]], f.ctx); }
        }
      }
      if (ONLY.includes('leads2')) { const f = fork(); run('leads2', f.g, [...LEAD_ROUTES.mosswatch, ...LEAD_ROUTES.bell, 'thornhollow', ...AFTER_BRAND], f.ctx); }
      if (ONLY.includes('leads-all')) {
        const f = fork();
        const leads = [...LEAD_ROUTES.mosswatch, ...LEAD_ROUTES.mire, ...LEAD_ROUTES.bell, ...LEAD_ROUTES.grove];
        const r = run('leads-all', f.g, [...leads, 'eldergrove-hearth', 'tamsin-duel', ...LEAD_ROUTES.roots, 'hr1-grubs', 'hr1-sapwight', 'last-green-coal', 'rotwarden-heart'], f.ctx);
        void r;
      }
      if (ONLY.includes('first-lead')) {
        for (const lead of Object.keys(LEAD_LAIRS)) { const f = fork(); run('first-lead', f.g, LEAD_ROUTES[lead], f.ctx); }
      }
    }
    if (ONLY.includes('looper-w2')) {
      const g = migrate(LOOPER);
      run('looper-w2', { ...g, seed: g.seed + seed, rngState: (g.rngState + seed * 7919) | 0 }, AFTER_BRAND, { rng: createRng(`sim:${seed}:looper`), rabble: 12, backdrop: 'verdant-wood' });
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

const LABELS = {
  m2: 'm2: Waking 0, the M2 road, equips drops (a wipe grinds a level)',
  direct: 'direct: the critical path after the Brand (Waking 1)',
  leads2: 'leads2: Mosswatch and Bell leads (Forewarned), then the critical path',
  'leads-all': 'leads-all: every lead, then the critical path',
  'looper-w2': 'looper-w2: the migrated Waking-2 M2 save down the critical path',
  'first-lead': 'first-lead: each lead taken first at Waking 1',
  sunscorch: 'sunscorch: from the direct run\'s end (Waking 2), home to the Keep, then SUN_PATH',
  'sunscorch-forged': 'sunscorch-forged: the same party with weapons tempered to +4 and one gem each',
  'sun-first-lead': 'sun-first-lead: each Sunscorch lead\'s lair taken first, right after Sandspire (Waking 2)',
};

// Gate 4 (M4 spec §8): the targets the Sunscorch modes are tuned to.
const SUN_TARGETS = [
  ['sunscorch', 'kharzul-heart', 'wipe', 30, 40], ['sunscorch', 'ashen-warden', 'wipe', 30, 40], ['sunscorch', 'tamsin-scorchgate', 'win', 55, 70],
  ['sunscorch-forged', 'kharzul-heart', 'wipe', 0, 20], ['sunscorch-forged', 'ashen-warden', 'wipe', 0, 20],
  ...['gf-caravan', 'wyrm-lair', 'gnash-camp', 'wisp-queen', 'dt-aqueduct'].map(id => ['sun-first-lead', id, 'wipe', 15, 25]),
];

function report(all) {
  const out = [];
  out.push(`Aethermoor balance sim (M3 and M4): ${SEEDS} seeds, starter ${STARTER}`);
  for (const k of ALL_MODES) {
    if (!ONLY.includes(k)) continue;
    const st = all[k];
    out.push('', `### ${LABELS[k]}`, '');
    const rows = Object.entries(st.nodes).filter(([, n]) => n.first).map(([id, n]) => [
      id, id.startsWith('patrol:') ? `(zone patrol${n.routs ? `, ${pct(n.routs, n.first)} routed` : ''})` : ENCOUNTERS[id].spawns.map(s => s.family).join('+'), f1(avg(n.level)), pct(n.firstWins, n.first), f1(avg(n.rounds)),
      pct(avg(n.hpLeft), 1), pct(n.first - n.firstWins - n.yields, n.first), n.yields ? pct(n.yields, n.first) : '', n.wipes, n.claims || '', n.shatters || '', n.stuck || '',
    ]);
    out.push(table(rows, ['node', 'foes', 'lvl', 'win 1st', 'rounds', 'hp left', 'wipe 1st', 'yield', 'wipes', 'claimed', 'shattered', 'stuck']));
    const r = st.rolls;
    const drops = [...RARITY_ORDER, 'shattered'].filter(x => st.drops[x]).map(x => `${x} ${st.drops[x]}`).join(', ');
    out.push('', `runs cleared ${st.cleared}/${st.runs} (stuck ${st.stuck}${st.stuckSeeds ? `: ${st.stuckSeeds.join(', ')}` : ''}); end party level ${f1(avg(st.endLevel))}; grind fights/run ${f1(st.grindFights / Math.max(1, st.runs))}`);
    out.push(`hero attack rolls: hit ${pct((r.hit || 0), r.n)}, graze ${pct(r.graze || 0, r.n)}, crit ${pct(r.crit || 0, r.n)}, miss ${pct(r.miss || 0, r.n)}, fumble ${pct(r.fumble || 0, r.n)}`);
    out.push(`random/worn-gear drops by rarity: ${drops}; named relics dropped: ${st.relics}`);
    if (st.entryLevel.length) out.push(`party level entering the Sunscorch: ${f1(avg(st.entryLevel))}`);
    if (st.forgedHeroes) out.push(`forged: ${st.forgedHeroes} heroes' weapons at +4; ${st.gemmed || 0} gems set (${st.gemInWeapon || 0} in the weapon)`);
  }
  const checks = SUN_TARGETS.filter(([k]) => ONLY.includes(k)).map(([k, id, what, lo, hi]) => {
    const n = all[k].nodes[id];
    if (!n || !n.first) return [k, id, `${what} ${lo}-${hi}%`, '-', 'no data'];
    const v = 100 * (what === 'win' ? n.firstWins : n.first - n.firstWins - n.yields) / n.first;
    return [k, id, `${what} 1st ${lo}-${hi}%`, `${v.toFixed(0)}%`, v >= lo - 0.5 && v <= hi + 0.5 ? 'ok' : 'MISS'];
  });
  for (const k of SUN_MODES.filter(m => ONLY.includes(m))) checks.push([k, '(every run)', 'stuck 0', String(all[k].stuck), all[k].stuck ? 'MISS' : 'ok']);
  if (checks.length) out.push('', '### Gate 4 targets (M4 spec §8)', '', table(checks, ['mode', 'node', 'target', 'result', '']));
  return out.join('\n');
}

// Run as a script; imported (a tuning harness), it only exposes the routes and the players.
export { playRoute, fight, newStats, forgeParty, AFTER_BRAND, SUN_START, SUN_ROUTE, SUN_LEAD_ROUTES, STARTERS, GAUNTLET };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const t0 = performance.now();
  const all = simulate();
  console.log(report(all));
  console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)}s)`);
}
