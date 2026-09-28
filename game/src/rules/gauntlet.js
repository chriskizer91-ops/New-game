// Game flow (no DOM): new game, Hearthfire rests and travel, battles in and out, Routs, party
// wipes and the duel yield, Grudges, Brands and the Waking.
//
// M3 (spec §4.6; owner WP2) keeps this file name for import stability. newGame makes version 3
// games that start in the Great Hall (START_AT); where you are is progress.pos, and the world
// (rules/world.js) decides what you can reach. progress.node is only kept on migrated M2 saves,
// verbatim, and never read.
//   newGame, spawnsFor, startBattle(game, { nodeId } | { patrol: { spawns, where, backdrop, dark } },
//   { ambush, firstStrike }), resolveBattle, routPack, rest(game, hfId), travel, partyLevel, uniqueBrands
// M4 (spec §4.3-§4.6): resolveBattle also marks relic deeds (report.deeds, .kindled, .ready), writes
// the Chronicle, settles Grudges for good (flags.settled, provenance.grudge), pays Sunscorch spoils
// (report.materials, .gems) and records finished Codex pages (report.pages); a Rout marks `rout`.
// The M2 road helpers (route, currentNode, canAdvance, advance, isCleared, road patrols) are gone
// with the road screen (spec §4.6).
// Import direction (A6): never import rules/world.js, story.js or cond.js here.

import { createRng } from '../core/rng.js';
import { HEROES, HERO_IDS, STARTERS, STARTING_BAG } from '../data/heroes.js';
import { RELICS } from '../data/relics.js';
import { ENCOUNTERS, GAUNTLET, BRANDS } from '../data/encounters.js';
import { HEARTHS, START_AT, REGIONS } from '../data/world.js';
import { FOES } from '../data/foes.js';
import { TUNING } from '../data/tuning.js';
import { SLOTS } from '../data/items.js';
import { createBattle, outcome } from './battle.js';
import { escalateSpawn, addOmens, buildFoe, familyOf } from './foe.js';
import { deriveHero } from './stats.js';
import { grantXp } from './progression.js';
import { generateItem, relicItem, routSpoils } from './loot.js';
import { pageBonus, markPages, relicDeeds, deedsOf, stageOf } from './codex.js';
import { rngFrom, indexItems, addCounts } from './util.js';

const START = GAUNTLET[0]; // 'hearthstone-keep', the Eternal Hearth
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
    item.chronicle = { ...item.chronicle, bearers: [id] };
    inventory.push(item);
    hero.gear[slot] = item.uid;
  }
  const d = deriveHero(hero, inventory);
  return { ...hero, hp: d.maxHp, mp: d.maxMp };
}

// A version 2 game (spec §4.8): the party stands in the Great Hall (START_AT), the Eternal Hearth is
// kindled and is the last Hearthfire, and story.starter remembers the starter relic.
export function newGame({ name = 'Wren', starter = 'hearthbrand', seed = 1, base = null } = {}) {
  if (!STARTERS[starter]) throw new Error(`Unknown starter relic ${starter}`);
  const rng = createRng(seed);
  const inventory = [];
  const roster = {};
  for (const id of HERO_IDS) roster[id] = startingHero(id, rng, inventory, { name, starter, base });
  const codex = {};
  for (const r of Object.keys(STARTERS)) codex[r] = { sighted: true, claimed: r === starter, awakened: false };
  return {
    version: 3, seed, rngState: rng.getState(),
    party: { active: [...HERO_IDS], roster },
    inventory, gold: 50, codex, materials: { scrap: 0, silver: 0, embers: 0 }, gems: {},
    progress: {
      waking: 0, brands: [], lastHearthfire: START, pos: { ...START_AT }, act: 1,
      flags: {
        cleared: {}, done: {}, grudges: {}, day: 1, runs: 0,
        story: { starter }, unlocked: {}, opened: {}, kindled: { [START]: true }, visits: {}, quests: {}, scouted: {}, seen: {}, worn: {}, beaten: {},
        pages: {}, settled: {},
      },
    },
    settings: { sound: true, battleSpeed: 1, reducedMotion: false },
    bag: { ...STARTING_BAG },
  };
}

// Rest at a Hearthfire: full heal, the fallen get up, save point set, a new day, and the fire is
// kindled (so the Atlas can travel to it).
export function rest(game, hfId) {
  const node = ENCOUNTERS[hfId];
  if (!node || node.type !== 'hearthfire') throw new Error('You can only rest at a Hearthfire');
  const g = healAll(game);
  const flags = { ...g.progress.flags, day: g.progress.flags.day + 1 };
  flags.kindled = { ...(flags.kindled || {}), [hfId]: true };
  return { ...g, progress: { ...g.progress, lastHearthfire: node.id, flags } };
}

// ---- M3 flow helpers (spec §4.6) ------------------------------------------------------------------

// round(mean level of the active heroes)
export function partyLevel(game) {
  const ids = game?.party?.active || [];
  if (!ids.length) return 1;
  return Math.round(ids.reduce((a, id) => a + (game.party.roster[id]?.level || 1), 0) / ids.length);
}

// Brands held, counting duplicates once (M2 saves can hold ['brand-of-briars', 'brand-of-briars']).
export const uniqueBrands = game => new Set(game?.progress?.brands || []).size;

// Fast travel to a kindled Hearthfire: pos = its stand. Returns the game unchanged if not kindled.
export function travel(game, hfId) {
  const h = HEARTHS[hfId];
  if (!h || !game.progress.flags.kindled?.[hfId]) return game;
  return { ...game, progress: { ...game.progress, pos: { map: h.map, x: h.x, y: h.y, face: h.face } } };
}

// A Rout (spec D4): a weak pack scatters when you walk into it. Full gold, TUNING.rout.xp of the XP,
// the normal rabble drop roll (loot.routSpoils), and never a Grudge.
// report: { result: 'rout', xp, gold, drops, consumables, levelUps }.
export function routPack(game, { nodeId = null, spawns = null, where = null } = {}) {
  const list = spawns || (nodeId ? spawnsFor(game, nodeId) : []);
  const foes = list.map((sp, i) => buildFoe(sp, { id: `r${i}`, seq: i }));
  const g = structuredClone(game);
  const rng = rngFrom(g.rngState);
  const gold = foes.reduce((a, f) => a + f.gold, 0);
  const xp = Math.round(foes.reduce((a, f) => a + f.xp, 0) * TUNING.rout.xp);
  const place = where || (nodeId && ENCOUNTERS[nodeId]?.place) || null;
  const { drops, consumables } = routSpoils(rng, foes, g.progress.waking, { where: place, day: g.progress.flags.day });
  const report = { result: 'rout', xp, gold, drops, consumables, levelUps: {}, deeds: [], kindled: [], ready: [] };
  g.gold += gold;
  g.inventory.push(...drops);
  for (const [id, n] of Object.entries(consumables)) g.bag[id] = (g.bag[id] || 0) + n;
  awardXp(g, xp, rng, report);
  for (const { item } of wornBy(g, g.party.active)) markDeed(g, item, 'rout', report); // M4: the Rout deed
  if (nodeId) {
    const f = g.progress.flags;
    f.beaten = { ...(f.beaten || {}), [nodeId]: (f.beaten?.[nodeId] || 0) + 1 };
    f.cleared[nodeId] = true;
    if (ENCOUNTERS[nodeId]?.once) f.done[nodeId] = true;
  }
  g.rngState = rng.getState();
  return { game: g, report };
}

function healAll(game) {
  const roster = {};
  const bonus = pageBonus(game);
  for (const [id, h] of Object.entries(game.party.roster)) {
    const d = deriveHero(h, game.inventory, bonus);
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

// M3 spawn fields resolved before escalation: level 'party' (party level + partyDelta, default +1),
// variant/relic '$rival' (the rival starter of story.starter, else of the claimed starter).
function rivalOf(game) {
  const starter = game.progress.flags.story?.starter || Object.keys(STARTERS).find(id => game.codex?.[id]?.claimed) || 'hearthbrand';
  return STARTERS[starter]?.rival || 'cairnmaul';
}
function resolveSpawn(game, sp) {
  if (sp.level !== 'party' && sp.variant !== '$rival' && sp.relic !== '$rival') return sp;
  const s = { ...sp };
  if (s.level === 'party') s.level = partyLevel(game) + (s.partyDelta ?? 1);
  if (s.variant === '$rival') s.variant = rivalOf(game);
  if (s.relic === '$rival') s.relic = rivalOf(game);
  return s;
}

export function spawnsFor(game, nodeId) {
  const node = ENCOUNTERS[nodeId];
  const w = game.progress.waking;
  return (node.spawns || []).map((sp0, i) => {
    const key = `${nodeId}#${i}`;
    const sp = resolveSpawn(game, sp0);
    let s = sp.noWaking ? { ...sp, omens: [...(sp.omens || [])] } : escalateSpawn(sp, w, key);
    let held = heldFor(game, s, key);
    if (held && s.lend) held = [{ relic: s.relic, lend: true }]; // a lent relic is never an Echo
    if (held) s = { ...s, relic: undefined, held };
    if (s.wears && owns(game, s.wears)) s = { ...s, wears: undefined };
    const g = game.progress.flags.grudges[key];
    if (g) s = { ...s, omens: [...new Set([...s.omens, ...g.omens])], title: g.title, grudge: key };
    return { ...s, spawnIndex: i };
  });
}

// ---- battles in and out --------------------------------------------------------------------------

// startBattle(game, { nodeId }) fights an authored encounter; startBattle(game, { patrol: { spawns,
// where, backdrop, dark } }) fights a roaming zone pack (no node: no cleared flags, no Grudges). The
// third argument comes from the world: { ambush } when a pack walked into your back, { firstStrike }
// when you walked into its back. A Forewarned party (story.forewarned) starts a `forewarned`
// encounter Warded.
export function startBattle(game, { nodeId = null, patrol = null } = {}, { ambush = false, firstStrike = false } = {}) {
  if (patrol) return startPatrol(game, patrol, { ambush, firstStrike });
  const node = ENCOUNTERS[nodeId];
  if (!node) throw new Error(`Unknown encounter ${nodeId}`);
  const rng = rngFrom(game.rngState);
  if (node.type !== 'fight') throw new Error(`${node.name} is not a battle`);
  const foes = spawnsFor(game, nodeId);
  const seed = rng.int(1, 2 ** 31 - 1);
  const codex = { ...game.codex };
  for (const f of foes) {
    for (const h of f.held || []) if (h.relic) codex[h.relic] = { sighted: true, claimed: false, awakened: false, ...codex[h.relic] };
    if (f.wears) codex[f.wears] = { sighted: true, claimed: false, awakened: false, ...codex[f.wears] };
  }
  const flags = game.progress.flags;
  const story = flags.story || {};
  const battle = createBattle({
    heroes: game.party.active.map(id => game.party.roster[id]),
    foes, seed, waking: game.progress.waking,
    ctx: {
      inventory: game.inventory, bag: game.bag, nodeId, where: node.place, day: flags.day, bonus: pageBonus(game),
      gentle: !!node.gentle, backdrop: node.backdrop, patrol: false, ambush,
      ...(firstStrike ? { firstStrike } : {}),
      ...(node.forewarned && story.forewarned ? { warded: TUNING.forewarned.ward } : {}),
      ...(node.dark ? { dark: true } : {}), ...(node.duel ? { duel: true } : {}),
    },
  });
  // fought counts as scouted for the Ladder (spec §3.6)
  const progress = !flags.scouted ? game.progress
    : { ...game.progress, flags: { ...flags, scouted: { ...flags.scouted, [nodeId]: true } } };
  return { game: { ...game, rngState: rng.getState(), codex, progress }, battle };
}

// A roaming zone pack's battle (M3): nodeId is null, so resolveBattle sets no cleared flags and
// records no Grudges.
function startPatrol(game, { spawns, where = 'The Wilds', backdrop = 'verdant-wood', dark = false }, { ambush = false, firstStrike = false } = {}) {
  const rng = rngFrom(game.rngState);
  const seed = rng.int(1, 2 ** 31 - 1);
  const battle = createBattle({
    heroes: game.party.active.map(id => game.party.roster[id]),
    foes: spawns.map((s, i) => ({ ...s, spawnIndex: s.spawnIndex ?? i })), seed, waking: game.progress.waking,
    ctx: {
      inventory: game.inventory, bag: game.bag, nodeId: null, where, day: game.progress.flags.day, bonus: pageBonus(game),
      gentle: false, backdrop, patrol: true, ambush, ...(firstStrike ? { firstStrike } : {}), ...(dark ? { dark: true } : {}),
    },
  });
  return { game: { ...game, rngState: rng.getState() }, battle };
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
  // a unique foe, or a named holder with a relic in hand (Rasa, Gnash, Mags...), is never Twinned by a
  // Grudge: two of them would be two holders, and a loss would snowball (M4; the Waking's picks are unchanged)
  const unique = !!familyOf(foe).unique || (foe.held || []).length > 0;
  const omens = prev.omens.length >= cap ? prev.omens : [...prev.omens, ...addOmens(pool, 1, `${key}:${wins + flees}:${g.seed}`, foe.tier, { unique }).slice(pool.length)];
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
  const bonus = pageBonus(g);
  for (const id of g.party.active) {
    const h = g.party.roster[id];
    const d = deriveHero(h, g.inventory, bonus);
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
  const f0 = g.progress.flags;
  awardXp(g, out.xp, rng, report);
  g.gold += out.gold;
  // A Grudge settled (M4, spec §4.6): gone from the hunt for good, and every piece from the fight says so
  for (const b of battle.ctx.patrol ? [] : out.beaten) {
    const key = `${battle.ctx.nodeId}#${b.spawnIndex}`;
    if (b.grudge && f0.grudges[key]) {
      report.grudgeSettled = f0.grudges[key].name;
      f0.settled = { ...(f0.settled || {}), [key]: { day: f0.day, name: f0.grudges[key].name } };
      delete f0.grudges[key];
    }
  }
  const stamp = it => (report.grudgeSettled ? { ...it, provenance: { ...it.provenance, grudge: report.grudgeSettled } } : it);
  report.claimed = out.claimed.map(stamp);
  report.drops = out.drops.map(stamp);
  g.inventory.push(...report.claimed, ...report.drops);
  claimToCodex(g, [...report.claimed, ...report.drops]);
  for (const [id, n] of Object.entries(out.consumables || {})) g.bag[id] = (g.bag[id] || 0) + n;
  if (out.log) chronicle(g, out.log.felled, out.party.map(p => p.id));
  else recordKills(g, out.kills);
  breather(g);
  if (battle.ctx.patrol) return;
  const f = g.progress.flags;
  f.cleared[node.id] = true;
  f.beaten = { ...(f.beaten || {}), [node.id]: (f.beaten?.[node.id] || 0) + 1 };
  if (node.once) f.done[node.id] = true;
  if (node.opens) f.unlocked = { ...(f.unlocked || {}), [node.opens]: true };
  if (node.brand) earnBrand(g, node, report);
}

// Each kill goes on the Chronicle of the weapon that made it (a battle state from before M4's log).
function recordKills(g, kills = {}) {
  for (const [heroId, n] of Object.entries(kills)) {
    const uid = g.party.roster[heroId]?.gear.weapon;
    const it = uid && g.inventory.find(i => i.uid === uid);
    if (it) it.chronicle = { ...it.chronicle, kills: (it.chronicle?.kills || 0) + n };
  }
}

// ---- M4: the Chronicle, deeds and spoils (spec §4.3, §4.4, §3.7) ---------------------------------

// What the given heroes wear: [{ heroId, item }] (the live inventory objects of a cloned game; a
// shattered relic carries nothing).
function wornBy(g, heroIds) {
  const byId = indexItems(g.inventory);
  const out = [];
  for (const id of heroIds) {
    for (const uid of Object.values(g.party.roster[id]?.gear || {})) {
      const it = uid && byId[uid];
      if (it && !it.shattered) out.push({ heroId: id, item: it });
    }
  }
  return out;
}

// Each foe knocked out goes on the Chronicle of the hero who struck it: their weapon and every relic
// they wear count it, and remember the mightiest. Everyone who fought is on their gear's bearers.
function chronicle(g, felled = [], heroIds) {
  const worn = wornBy(g, heroIds);
  for (const { heroId, item } of worn) {
    const c = item.chronicle || {};
    if (!(c.bearers || []).includes(heroId)) item.chronicle = { ...c, bearers: [...(c.bearers || []), heroId] };
  }
  for (const k of felled) {
    const gear = g.party.roster[k.by]?.gear || {};
    for (const { heroId, item } of worn) {
      if (heroId !== k.by || !(item.uid === gear.weapon || RELICS[item.base])) continue;
      const c = item.chronicle || {};
      const best = c.mightiest && c.mightiest.level >= k.level ? c.mightiest : { name: k.name, level: k.level };
      item.chronicle = { ...c, kills: (c.kills || 0) + 1, mightiest: best };
    }
  }
}

// Mark one deed done on a relic (if it is one of its three), with what it changed on the report.
function markDeed(g, item, deed, report) {
  if (!RELICS[item.base] || item.deeds?.[deed] || !relicDeeds(item.base).includes(deed)) return;
  const was = stageOf(item);
  item.deeds = { ...(item.deeds || {}), [deed]: g.progress.flags.day };
  report.deeds.push({ uid: item.uid, relic: item.base, deed });
  if (was === 'dormant') report.kindled.push(item.uid);
  if (was !== 'awakened' && deedsOf(item).every(d => d.done)) report.ready.push(item.uid);
}

// The deeds a finished fight did for `item`, worn by `heroId` (spec §4.3), whether or not they are
// among the item's own three: markDeed keeps only those. Exported for the tests.
export function fightDeedIds(battle, out, report, heroId, item) {
  const log = out.log || {};
  const won = out.result === 'victory';
  const foes = battle.order.map(id => battle.units[id]).filter(u => u.side === 'foe' && !u.summonedBy);
  const done = [];
  if (won) done.push('first-blood');
  if (won && foes.some(f => f.tier === 'relic-bearer' || (f.held || []).length || (f.gear || []).some(x => x.relic))) done.push('fell-holder');
  if (won && foes.some(f => f.tier === 'champion')) done.push('fell-champion');
  if (log.nat20?.[heroId]) done.push('legend-strike');
  if ((log.surged || []).some(x => x.uid === item.uid)) done.push('surge');
  if ((out.pried || []).length) done.push('claim');
  if (report.grudgeSettled) done.push('settle');
  if (report.brand) done.push('brand');
  if (won && (battle.waking || 0) >= 2 && log.downs === 0) done.push('untouched');
  if ((item.chronicle?.kills || 0) >= 50) done.push('hundred');
  return done;
}

// Every relic worn by a hero who fought gets the deeds the fight did.
function fightDeeds(g, battle, out, report) {
  for (const { heroId, item } of wornBy(g, out.party.map(p => p.id))) {
    if (!RELICS[item.base]) continue;
    for (const deed of fightDeedIds(battle, out, report, heroId, item)) markDeed(g, item, deed, report);
  }
}

// Won Sunscorch fights pay forge materials by the tier of each foe beaten; Scorchgate's pay Ash Garnets.
function spoils(g, node, out, report) {
  if (!node || (node.region || 'verdant') !== 'sunscorch') return;
  const F = TUNING.forge;
  let materials = {};
  for (const b of out.beaten) materials = addCounts(materials, F.spoils[b.tier] || {});
  const gems = F.garnets[node.id] ? { 'ash-garnet': F.garnets[node.id] } : {};
  g.materials = addCounts(g.materials, materials);
  g.gems = addCounts(g.gems, gems);
  report.materials = materials;
  report.gems = gems;
}

// Beating a Brand-holder (spec D5, §4.6). A Brand you already hold is a rematch: no Brand, no
// Waking (report.rematch). A new Brand raises the Waking and re-arms every non-`once` encounter of
// its region (an M2 encounter without a region is Verdant); there is no teleport. Holding every
// Verdant Brand completes Act I. Brands are counted unique (M2 saves can hold a duplicate), and the
// saved array is only ever appended to.
function earnBrand(g, node, report) {
  const p = g.progress, f = p.flags;
  const brand = BRANDS[node.brand];
  if (p.brands.includes(node.brand)) { report.rematch = true; return; }
  p.brands.push(node.brand);
  p.waking += 1;
  f.runs += 1;
  for (const [id, e] of Object.entries(ENCOUNTERS)) if ((e.region || 'verdant') === brand.region && !e.once) delete f.cleared[id];
  if (REGIONS.verdant.brands.every(b => p.brands.includes(b))) f.story = { ...(f.story || {}), 'act1-complete': true };
  // M4: both Sunscorch Brands call the second council (data/maps/keep-hall.js council-2)
  if (REGIONS.sunscorch.brands.every(b => p.brands.includes(b))) f.story = { ...(f.story || {}), 'sunscorch-complete': true };
  report.brand = { ...brand, waking: p.waking, first: true, count: new Set(p.brands).size };
}

// Wake at the last Hearthfire's stand with all gear, 10% lighter in gold, and a little wiser.
function wipe(g, battle, rng, report) {
  const lost = Math.floor(g.gold * TUNING.wipe.goldLoss);
  g.gold -= lost;
  report.goldLost = lost;
  report.xp = lessonXp(battle);
  awardXp(g, report.xp, rng, report);
  report.grudge = recordGrudge(g, battle, false);
  if (!HEARTHS[g.progress.lastHearthfire]) g.progress.lastHearthfire = START;
  const h = HEARTHS[g.progress.lastHearthfire];
  g.progress.pos = { map: h.map, x: h.x, y: h.y, face: h.face };
  Object.assign(g, healAll(g));
  report.wokeAt = g.progress.lastHearthfire;
}

const lessonXp = battle => Math.round(battle.order.map(id => battle.units[id])
  .filter(u => u.side === 'foe' && !u.summonedBy).reduce((a, f) => a + f.xp, 0) * TUNING.wipe.lessonXp);

// Losing a duel is a yield (spec D9, §3.5): no gold lost, no Grudge, the party gets its breath back
// where it stands, the lesson XP still counts, and the encounter's `yields` flag is set (the Eldest
// Tree door opens anyway). The duellist stays for a rematch.
function yieldDuel(g, battle, node, rng, report) {
  report.yield = true;
  report.xp = lessonXp(battle);
  awardXp(g, report.xp, rng, report);
  breather(g);
  g.progress.flags.story = { ...(g.progress.flags.story || {}), [node.yields || 'tamsin-yielded']: true };
}

function clampParty(g) {
  const bonus = pageBonus(g);
  for (const [id, h] of Object.entries(g.party.roster)) {
    const d = deriveHero(h, g.inventory, bonus);
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
    levelUps: {}, goldLost: 0, grudge: null, grudgeSettled: null, brand: null, wokeAt: null, yield: false, rematch: false,
    deeds: [], kindled: [], ready: [], pages: [], materials: {}, gems: {},
  };
  setRosterVitals(g, out.party);
  g.bag = { ...out.bag };
  const node = battle.ctx.nodeId ? ENCOUNTERS[battle.ctx.nodeId] : null;
  if (out.result === 'victory') {
    winBattle(g, battle, out, rng, report);
    if (!battle.ctx.patrol) spoils(g, node, out, report);
  }
  else if (out.result === 'defeat' && node?.duel && !battle.ctx.patrol) yieldDuel(g, battle, node, rng, report);
  else if (out.result === 'defeat') wipe(g, battle, rng, report);
  else {
    awardXp(g, out.xp, rng, report); // fled: keep what the fallen were worth
    g.gold += out.gold;
    report.grudge = recordGrudge(g, battle, true);
  }
  fightDeeds(g, battle, out, report);
  report.pages = markPages(g);
  clampParty(g);
  g.rngState = rng.getState();
  return { game: g, report };
}
