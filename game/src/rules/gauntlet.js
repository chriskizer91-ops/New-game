// Game flow for the M2 Gauntlet (no DOM): new game, walking the nodes, Hearthfire rests,
// battles in and out, party wipes, Grudges, Brands and the Waking loop.

import { createRng } from '../core/rng.js';
import { HEROES, HERO_IDS, STARTERS, STARTING_BAG } from '../data/heroes.js';
import { RELICS } from '../data/relics.js';
import { ENCOUNTERS, GAUNTLET, PATROLS, BRANDS } from '../data/encounters.js';
import { FOES } from '../data/foes.js';
import { TUNING } from '../data/tuning.js';
import { SLOTS } from '../data/items.js';
import { createBattle, outcome } from './battle.js';
import { escalateSpawn, addOmens } from './foe.js';
import { deriveHero } from './stats.js';
import { grantXp } from './progression.js';
import { generateItem, relicItem } from './loot.js';
import { rngFrom } from './util.js';

const START = GAUNTLET[0];
const TIER_RANK = { rabble: 0, veteran: 1, 'relic-bearer': 2, champion: 3 };
const WIN_TITLES = ['the Party-Breaker', 'the Twice-Victor', 'the Thrice-Victor', 'the Unbeaten'];
const FLEE_TITLES = ['the Once-Fled', 'the Twice-Fled', 'the Thrice-Fled', 'the Ever-Fled'];

// ---- new game -----------------------------------------------------------------------------------

function startingHero(id, rng, inventory, { name, starter, base }) {
  const data = HEROES[id];
  const hero = {
    id, name: id === 'warden' ? name : data.name, level: 1, xp: 0, hp: null, mp: null, surge: 0,
    base: { ...(id === 'warden' && base ? base : data.base) },
    gear: Object.fromEntries(SLOTS.map(s => [s, null])),
    skills: data.skills.filter(s => s.level <= 1).map(s => s.id),
    domains: Object.fromEntries([data.domain, ...(data.secondary || [])].map(d => [d, { level: 1, path: null, opt7: null, opt13: null }])),
    hpRolls: [],
  };
  const spec = { ...data.gear };
  if (id === 'warden') { spec.weapon = 'starter'; spec.offhand = STARTERS[starter].offhand; }
  const prov = { from: id === 'warden' ? 'the Keep reliquary' : `${data.name}'s pack`, where: 'Hearthstone Keep', day: 1 };
  for (const [slot, g] of Object.entries(spec)) {
    if (!g) continue;
    const item = g === 'starter' ? relicItem(starter, rng, prov) : generateItem(rng, { base: g.base, rarity: g.rarity, ilvl: 1, provenance: prov });
    inventory.push(item);
    hero.gear[slot] = item.uid;
  }
  const d = deriveHero(hero, inventory);
  return { ...hero, hp: d.maxHp, mp: d.maxMp };
}

export function newGame({ name = 'Wren', starter = 'hearthbrand', seed = 1, base = null } = {}) {
  if (!STARTERS[starter]) throw new Error(`Unknown starter relic ${starter}`);
  const rng = createRng(seed);
  const inventory = [];
  const roster = {};
  for (const id of HERO_IDS) roster[id] = startingHero(id, rng, inventory, { name, starter, base });
  const codex = {};
  for (const r of Object.keys(STARTERS)) codex[r] = { sighted: true, claimed: r === starter, awakened: false };
  return {
    version: 1, seed, rngState: rng.getState(),
    party: { active: [...HERO_IDS], roster },
    inventory, gold: 50, codex,
    progress: { waking: 0, brands: [], lastHearthfire: START, node: START, flags: { cleared: {}, done: {}, grudges: {}, day: 1, runs: 0 } },
    settings: { sound: true, battleSpeed: 1, reducedMotion: false },
    bag: { ...STARTING_BAG },
  };
}

// ---- walking the route ----------------------------------------------------------------------------

export const currentNode = game => ENCOUNTERS[game.progress.node];

export function isCleared(game, nodeId) {
  const f = game.progress.flags;
  return ENCOUNTERS[nodeId].type === 'hearthfire' || !!f.cleared[nodeId] || !!f.done[nodeId];
}

const skipped = (game, id) => ENCOUNTERS[id].once && game.progress.flags.done[id];

// The route for a map screen: every node with its state.
export function route(game) {
  return GAUNTLET.map((id, index) => {
    const n = ENCOUNTERS[id];
    const spawns = n.spawns ? spawnsFor(game, id) : [];
    return {
      id, index, name: n.name, type: n.type, place: n.place, backdrop: n.backdrop, text: n.text,
      current: game.progress.node === id, cleared: isCleared(game, id), skipped: !!skipped(game, id),
      level: spawns.length ? Math.max(...spawns.map(s => s.level)) : null,
      boss: spawns.find(s => FOES[s.family].tier !== 'rabble')?.family || null,
      grudges: spawns.filter(s => s.grudge).map(s => s.name),
    };
  });
}

export const canAdvance = game => isCleared(game, game.progress.node);

export function advance(game) {
  if (!canAdvance(game)) return game;
  let i = GAUNTLET.indexOf(game.progress.node) + 1;
  while (i < GAUNTLET.length && skipped(game, GAUNTLET[i])) i++;
  if (i >= GAUNTLET.length) return game;
  return { ...game, progress: { ...game.progress, node: GAUNTLET[i] } };
}

// Rest at a Hearthfire: full heal, the fallen get up, save point set, a new day.
export function rest(game) {
  const node = currentNode(game);
  if (node.type !== 'hearthfire') throw new Error('You can only rest at a Hearthfire');
  const g = healAll(game);
  const flags = { ...g.progress.flags, day: g.progress.flags.day + 1 };
  return { ...g, progress: { ...g.progress, lastHearthfire: node.id, flags } };
}

function healAll(game) {
  const roster = {};
  for (const [id, h] of Object.entries(game.party.roster)) {
    const d = deriveHero(h, game.inventory);
    roster[id] = { ...h, hp: d.maxHp, mp: d.maxMp };
  }
  return { ...game, party: { ...game.party, roster } };
}

// ---- spawns: the Waking, Grudges, and Echoes of relics already claimed ----------------------------

const owns = (game, relicId) => !!game.codex[relicId]?.claimed || game.inventory.some(i => i.base === relicId && !i.shattered);

// A relic you already carry cannot be claimed twice: its holder carries an Echo instead,
// a generated piece of the same kind that gets better with the Waking.
function echoItem(game, relicId, level, salt) {
  const rng = createRng(`echo:${game.seed}:${salt}:${game.progress.waking}`);
  const r = RELICS[relicId];
  const rarity = game.progress.waking >= 2 ? 'storied' : 'runed';
  const item = generateItem(rng, { slot: r.slot, kind: r.kind, rarity, ilvl: level, provenance: { from: r.holder } });
  return { ...item, lore: `An echo of ${r.name}. ${item.lore || ''}`.trim() };
}

function heldFor(game, spawn, key) {
  const ids = spawn.relic ? [spawn.relic] : (FOES[spawn.family].relics || []);
  if (!ids.length) return null;
  return ids.map((id, j) => (owns(game, id) ? { item: echoItem(game, id, spawn.level, `${key}:${j}`) } : { relic: id }));
}

export function spawnsFor(game, nodeId) {
  const node = ENCOUNTERS[nodeId];
  const w = game.progress.waking;
  return (node.spawns || []).map((sp, i) => {
    const key = `${nodeId}#${i}`;
    let s = escalateSpawn(sp, w, key);
    const held = heldFor(game, s, key);
    if (held) s = { ...s, relic: undefined, held };
    if (s.wears && owns(game, s.wears)) s = { ...s, wears: undefined };
    const g = game.progress.flags.grudges[key];
    if (g) s = { ...s, omens: [...new Set([...s.omens, ...g.omens])], title: g.title, grudge: key };
    return { ...s, spawnIndex: i };
  });
}

// Grinding: a rabble patrol at the level of the strongest rabble you have already beaten.
export function patrolSpawns(game, rng) {
  const node = currentNode(game);
  const upTo = GAUNTLET.indexOf(node.id);
  const levels = GAUNTLET.slice(0, upTo + 1).flatMap(id => (ENCOUNTERS[id].spawns || []).filter(s => FOES[s.family].tier === 'rabble').map(s => s.level));
  const level = Math.max(1, ...levels);
  const set = rng.pick(PATROLS[node.backdrop] || PATROLS['hearth-road']);
  return set.map((sp, i) => escalateSpawn({ ...sp, level }, game.progress.waking, `patrol#${i}`));
}

// ---- battles in and out --------------------------------------------------------------------------

export function startBattle(game, { nodeId = game.progress.node, patrol = false } = {}) {
  const node = ENCOUNTERS[nodeId];
  const rng = rngFrom(game.rngState);
  if (!patrol && node.type !== 'fight') throw new Error(`${node.name} is not a battle`);
  const foes = patrol ? patrolSpawns(game, rng) : spawnsFor(game, nodeId);
  const ambush = patrol && rng.chance(TUNING.ribbon.ambushChance);
  const seed = rng.int(1, 2 ** 31 - 1);
  const codex = { ...game.codex };
  for (const f of foes) {
    for (const h of f.held || []) if (h.relic) codex[h.relic] = { sighted: true, claimed: false, awakened: false, ...codex[h.relic] };
    if (f.wears) codex[f.wears] = { sighted: true, claimed: false, awakened: false, ...codex[f.wears] };
  }
  const battle = createBattle({
    heroes: game.party.active.map(id => game.party.roster[id]),
    foes, seed, waking: game.progress.waking,
    ctx: {
      inventory: game.inventory, bag: game.bag, nodeId, where: node.place, day: game.progress.flags.day,
      gentle: !!node.gentle && !patrol, backdrop: node.backdrop, patrol, ambush,
    },
  });
  return { game: { ...game, rngState: rng.getState(), codex }, battle };
}

function setRosterVitals(g, party) {
  for (const p of party) {
    const h = g.party.roster[p.id];
    if (h) g.party.roster[p.id] = { ...h, hp: p.hp, mp: p.mp, surge: p.surge };
  }
}

// The foe that beat you (or made you run) becomes a Grudge: +1 Omen and a title.
function recordGrudge(g, battle, fled) {
  if (battle.ctx.patrol) return null;
  const elites = battle.order.map(id => battle.units[id])
    .filter(f => f.side === 'foe' && !f.ko && !f.gone && !f.summonedBy && f.tier !== 'rabble' && f.spawnIndex != null)
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.maxHp - a.maxHp);
  const foe = elites[0];
  if (!foe) return null;
  const key = `${battle.ctx.nodeId}#${foe.spawnIndex}`;
  const prev = g.progress.flags.grudges[key] || { key, nodeId: battle.ctx.nodeId, wins: 0, flees: 0, omens: [] };
  const wins = prev.wins + (fled ? 0 : 1);
  const flees = prev.flees + (fled ? 1 : 0);
  const title = fled ? FLEE_TITLES[Math.min(3, flees - 1)] : WIN_TITLES[Math.min(3, wins - 1)];
  // A capped number of Grudge Omens (so a loss is never a wall), never one it already had.
  const cap = TUNING.wipe.grudgeOmens[foe.tier === 'champion' ? 'champion' : 'other'];
  const pool = [...new Set([...foe.omens, ...prev.omens])];
  const omens = prev.omens.length >= cap ? prev.omens : [...prev.omens, ...addOmens(pool, 1, `${key}:${wins + flees}:${g.seed}`, foe.tier).slice(pool.length)];
  const baseName = foe.name.replace(/ the (Party-Breaker|Twice-Victor|Thrice-Victor|Unbeaten|Once-Fled|Twice-Fled|Thrice-Fled|Ever-Fled)$/, '');
  const grudge = { ...prev, wins, flees, title, omens, name: `${baseName} ${title}` };
  g.progress.flags.grudges[key] = grudge;
  return grudge;
}

function claimToCodex(g, items) {
  for (const it of items) {
    if (!RELICS[it.base]) continue;
    const c = g.codex[it.base] || { sighted: true, claimed: false, awakened: false };
    g.codex[it.base] = { ...c, sighted: true, claimed: c.claimed || !it.shattered };
  }
}

function breather(g) {
  const R = TUNING.rest;
  for (const id of g.party.active) {
    const h = g.party.roster[id];
    const d = deriveHero(h, g.inventory);
    const hp = Math.max(1, h.hp) + Math.round(d.maxHp * R.breatherHp);
    g.party.roster[id] = { ...h, hp: Math.min(d.maxHp, hp), mp: Math.min(d.maxMp, h.mp + Math.round(d.maxMp * R.breatherMp)) };
  }
}

// Every active hero gets the full XP (JRPG style); level-ups go on the report.
function awardXp(g, xp, rng, report) {
  for (const id of g.party.active) {
    const r = grantXp(g.party.roster[id], xp, rng);
    g.party.roster[id] = r.hero;
    if (r.gains.length) report.levelUps[id] = r.gains;
  }
}

function winBattle(g, battle, out, rng, report) {
  const node = ENCOUNTERS[battle.ctx.nodeId];
  awardXp(g, out.xp, rng, report);
  g.gold += out.gold;
  g.inventory.push(...out.claimed, ...out.drops);
  claimToCodex(g, [...out.claimed, ...out.drops]);
  for (const [id, n] of Object.entries(out.consumables || {})) g.bag[id] = (g.bag[id] || 0) + n;
  recordKills(g, out.kills);
  breather(g);
  for (const b of out.beaten) {
    const key = `${battle.ctx.nodeId}#${b.spawnIndex}`;
    if (b.grudge && g.progress.flags.grudges[key]) {
      report.grudgeSettled = g.progress.flags.grudges[key].name;
      delete g.progress.flags.grudges[key];
    }
  }
  if (battle.ctx.patrol) return;
  g.progress.flags.cleared[node.id] = true;
  if (node.once) g.progress.flags.done[node.id] = true;
  if (node.brand) earnBrand(g, node, report);
}

// Each kill goes on the Chronicle of the weapon that made it.
function recordKills(g, kills = {}) {
  for (const [heroId, n] of Object.entries(kills)) {
    const uid = g.party.roster[heroId]?.gear.weapon;
    const it = uid && g.inventory.find(i => i.uid === uid);
    if (it) it.chronicle = { ...it.chronicle, kills: (it.chronicle?.kills || 0) + n };
  }
}

// Beating the Champion: a Brand, the Waking rises, and the Gauntlet resets re-geared.
function earnBrand(g, node, report) {
  g.progress.brands.push(node.brand);
  g.progress.waking += 1;
  g.progress.flags.cleared = {};
  g.progress.flags.runs += 1;
  g.progress.node = START;
  g.progress.lastHearthfire = START;
  report.brand = { ...BRANDS[node.brand], waking: g.progress.waking };
}

// Wake at the last Hearthfire with all gear, 10% lighter in gold, and a little wiser.
function wipe(g, battle, rng, report) {
  const lost = Math.floor(g.gold * TUNING.wipe.goldLoss);
  g.gold -= lost;
  report.goldLost = lost;
  const worth = battle.order.map(id => battle.units[id]).filter(u => u.side === 'foe' && !u.summonedBy).reduce((a, f) => a + f.xp, 0);
  report.xp = Math.round(worth * TUNING.wipe.lessonXp);
  awardXp(g, report.xp, rng, report);
  report.grudge = recordGrudge(g, battle, false);
  g.progress.node = g.progress.lastHearthfire;
  Object.assign(g, healAll(g));
  report.wokeAt = g.progress.node;
}

function clampParty(g) {
  for (const [id, h] of Object.entries(g.party.roster)) {
    const d = deriveHero(h, g.inventory);
    g.party.roster[id] = { ...h, hp: Math.min(d.maxHp, Math.max(0, h.hp)), mp: Math.min(d.maxMp, Math.max(0, h.mp)) };
  }
}

// Apply a finished battle to the game: vitals, XP and level-ups, gold, loot, codex, grudges,
// wipes and Brands. Returns { game, report } for the result screen.
export function resolveBattle(game, battle) {
  const out = outcome(battle);
  if (!out) throw new Error('The battle is not over');
  const g = structuredClone(game);
  const rng = rngFrom(g.rngState);
  const report = {
    result: out.result, xp: out.xp, gold: out.gold, drops: out.drops, claimed: out.claimed, rounds: out.rounds,
    consumables: out.consumables || {},
    levelUps: {}, goldLost: 0, grudge: null, grudgeSettled: null, brand: null, wokeAt: null,
  };
  setRosterVitals(g, out.party);
  g.bag = { ...out.bag };
  if (out.result === 'victory') winBattle(g, battle, out, rng, report);
  else if (out.result === 'defeat') wipe(g, battle, rng, report);
  else {
    awardXp(g, out.xp, rng, report); // fled: keep what the fallen were worth
    g.gold += out.gold;
    report.grudge = recordGrudge(g, battle, true);
  }
  clampParty(g);
  g.rngState = rng.getState();
  return { game: g, report };
}
