// Hilda's full forge (M4 spec §4.2, §4.3, §4.5): Temper +1 to +10, Reroll one trait, Salvage into
// materials, Gems in sockets, and the Awakening of relics. Pure: inputs are never mutated, and the
// reroll's dice come from game.rngState. A cost is { gold, materials: { scrap?, silver?, embers? } }.
//
//   temperCost(item) -> cost | null                  null at +10, for a shattered relic, or no item
//   temper(game, uid) -> { game, ok, cost, reason }
//   rerollCost(item) -> cost | null                  non-relics, wrought or better, with a trait
//   reroll(game, uid, affixIndex) -> { game, ok, cost, reason, before, after }
//   salvageYield(item) -> { materials, gems } | null  never a relic
//   salvage(game, uid) -> { game, ok, yield, reason } never an equipped piece
//   socketsOf(item) -> n                             socketCost(item) -> { gold }
//   socket(game, uid, index, gemId) -> { game, ok, cost, reason }   a gem already there goes back to the pouch
//   unsocket(game, uid, index) -> { game, ok, reason }
//   buyGem(game, gemId, n = 1) -> { game, ok, cost, reason }         Idris's prices (data/gems.js)
//   stageOf(item), deedsOf(item)                     (from rules/codex.js)
//   awakenCost(item) -> cost
//   awakenOptions(game, uid) -> { ready, why, cost, bearer, path, branches: [{ id, name, text, stats, path, enabled, why, note }] }
//     a branch opens for a bearer whose path it is; a branch that no hero able to carry the relic walks
//     (a sword only the Hand's heroes can hold has no Heart-path carrier) opens for its bearer too
//   awaken(game, uid, branchId) -> { game, ok, cost, reason }
//   bestDomainOf(hero) -> domainId                   pathOf(hero) -> 'a' (the Hand) | 'b' (the Heart)
// Owner: P1 (M4).

import { RELICS } from '../data/relics.js';
import { ITEMS } from '../data/items.js';
import { RARITY } from '../data/rarity.js';
import { GEMS, MATERIALS } from '../data/gems.js';
import { HAND_DOMAINS } from '../data/deeds.js';
import { HEROES } from '../data/heroes.js';
import { TUNING } from '../data/tuning.js';
import { deriveHero, gemsIn } from './stats.js';
import { pageBonus, stageOf, deedsOf } from './codex.js';
import { rerollAffix, affixedName, itemAspect } from './loot.js';
import { canUse } from './gear.js';
import { rngFrom, addCounts } from './util.js';

export { stageOf, deedsOf };

export const PATHS = Object.freeze({ a: 'the Hand', b: 'the Heart' });
const HAND = new Set(HAND_DOMAINS);
const NAMED = new Set(['wrought', 'tempered', 'runed']); // named for their traits (rules/loot.js affixedName)

// ---- helpers ------------------------------------------------------------------------------------------

// A relic's cost uses its data ilvl (as M3's temper did); generated gear its own.
const half = item => Math.ceil(Math.max(1, RELICS[item.base]?.ilvl ?? item.ilvl ?? 1) / 2);
const findItem = (game, uid) => game.inventory.find(i => i.uid === uid) || null;

function wearerOf(game, uid) {
  for (const h of Object.values(game.party.roster)) {
    for (const [slot, id] of Object.entries(h.gear || {})) if (id === uid) return { heroId: h.id, slot };
  }
  return null;
}

// The game with `item` put back in place of its old self, its wearer's HP and MP clamped to the new
// maximums (a gem or a temper can change them).
function replaceItem(game, item) {
  const g = { ...game, inventory: game.inventory.map(i => (i.uid === item.uid ? item : i)) };
  const who = wearerOf(g, item.uid);
  if (!who) return g;
  const h = g.party.roster[who.heroId];
  const d = deriveHero(h, g.inventory, pageBonus(g));
  const hero = { ...h, hp: Math.min(h.hp ?? d.maxHp, d.maxHp), mp: Math.min(h.mp ?? d.maxMp, d.maxMp) };
  return { ...g, party: { ...g.party, roster: { ...g.party.roster, [hero.id]: hero } } };
}

const matWord = (k, n) => (k === 'embers' && n === 1 ? 'ember' : (MATERIALS[k]?.name || k).toLowerCase());

// Why the party cannot pay `cost`, or null when it can.
function shortOf(game, cost) {
  if ((game.gold || 0) < cost.gold) return `Needs ${cost.gold} gold`;
  for (const [k, n] of Object.entries(cost.materials || {})) {
    if ((game.materials?.[k] || 0) < n) return `Needs ${n} ${matWord(k, n)}`;
  }
  return null;
}

function pay(game, cost) {
  const less = Object.fromEntries(Object.entries(cost.materials || {}).map(([k, n]) => [k, -n]));
  return { ...game, gold: game.gold - cost.gold, materials: addCounts(game.materials, less) };
}

// ---- Temper (+1 to +10) ---------------------------------------------------------------------------------

const count = v => (Number.isInteger(v) && v > 0 ? v : 0);

export function temperCost(item) {
  const T = TUNING.temper, t = count(item?.temper);
  if (!item || item.shattered || t >= T.max) return null;
  const materials = {};
  if (T.silver[t]) materials.silver = T.silver[t];
  if (T.embers[t]) materials.embers = T.embers[t];
  return { gold: T.base * half(item) * T.mult[t], materials };
}

export function temper(game, uid) {
  const item = findItem(game, uid);
  if (!item) return { game, ok: false, cost: null, reason: 'Nothing to temper' };
  if (item.shattered) return { game, ok: false, cost: null, reason: 'Shattered. Reforge it first.' };
  const cost = temperCost(item);
  if (!cost) return { game, ok: false, cost: null, reason: `Tempered as far as it goes (+${TUNING.temper.max}).` };
  const short = shortOf(game, cost);
  if (short) return { game, ok: false, cost, reason: short };
  return { game: replaceItem(pay(game, cost), { ...item, temper: count(item.temper) + 1 }), ok: true, cost, reason: null };
}

// ---- Reroll one trait -----------------------------------------------------------------------------------

export function rerollCost(item) {
  const R = TUNING.forge.reroll;
  const mat = item && R.material[item.rarity];
  if (!mat || RELICS[item.base] || !ITEMS[item.base] || !item.affixes?.length) return null;
  return { gold: R.base * half(item) * (1 + count(item.rerolls)), materials: { [mat]: 1 } };
}

export function reroll(game, uid, affixIndex) {
  const no = (reason, cost = null) => ({ game, ok: false, cost, reason, before: null, after: null });
  const item = findItem(game, uid);
  if (!item) return no('Nothing to reroll');
  if (RELICS[item.base]) return no('A relic keeps the traits it was made with.');
  if (item.unidentified) return no('Identify it first.');
  const cost = rerollCost(item);
  if (!cost) return no('It has no trait to reroll.');
  const before = item.affixes[affixIndex];
  if (!Number.isInteger(affixIndex) || !before) return no('Pick a trait to reroll.', cost);
  const short = shortOf(game, cost);
  if (short) return no(short, cost);
  const rng = rngFrom(game.rngState);
  const after = rerollAffix(rng, item, affixIndex);
  if (!after) return no('No other trait fits it.', cost);
  const affixes = item.affixes.map((a, i) => (i === affixIndex ? after : a));
  const base = ITEMS[item.base];
  const next = { ...item, affixes, rerolls: count(item.rerolls) + 1, aspect: itemAspect(base, affixes) };
  if (NAMED.has(item.rarity)) next.name = affixedName(base, affixes);
  const g = replaceItem(pay(game, cost), next);
  return { game: { ...g, rngState: rng.getState() }, ok: true, cost, reason: null, before, after };
}

// ---- Salvage ----------------------------------------------------------------------------------------------

export function salvageYield(item) {
  if (!item || RELICS[item.base]) return null;
  const gems = {};
  for (const id of gemsIn(item)) gems[id] = (gems[id] || 0) + 1;
  return { materials: { ...(TUNING.forge.salvage[item.rarity] || {}) }, gems };
}

export function salvage(game, uid) {
  const item = findItem(game, uid);
  if (!item) return { game, ok: false, yield: null, reason: 'Nothing to salvage' };
  if (RELICS[item.base]) return { game, ok: false, yield: null, reason: 'Hilda will not melt down a relic.' };
  if (wearerOf(game, uid)) return { game, ok: false, yield: null, reason: 'Take it off first.' };
  const y = salvageYield(item);
  const g = {
    ...game, inventory: game.inventory.filter(i => i.uid !== uid),
    materials: addCounts(game.materials, y.materials), gems: addCounts(game.gems, y.gems),
  };
  return { game: g, ok: true, yield: y, reason: null };
}

// ---- Gems -------------------------------------------------------------------------------------------------

// Runed and storied pieces have one socket; a relic has its data's `sockets` (1 if unsaid); the rest none.
export function socketsOf(item) {
  if (!item) return 0;
  const relic = RELICS[item.base];
  if (relic) return Math.max(0, relic.sockets ?? 1);
  return ['runed', 'storied'].includes(item.rarity) ? RARITY[item.rarity].gemSlots : 0;
}

export const socketCost = item => ({ gold: TUNING.forge.socket * half(item), materials: {} });

// The item's sockets as a list of gem ids or null, and any stray gems past its sockets.
function slotsOf(item) {
  const n = socketsOf(item);
  const list = Array.isArray(item.gems) ? item.gems : [];
  return {
    slots: Array.from({ length: n }, (_, i) => (GEMS[list[i]] ? list[i] : null)),
    stray: list.slice(n).filter(id => GEMS[id]),
  };
}

const oneOf = ids => { const out = {}; for (const id of ids) if (id) out[id] = (out[id] || 0) + 1; return out; };

export function socket(game, uid, index, gemId) {
  const no = (reason, cost = null) => ({ game, ok: false, cost, reason });
  const item = findItem(game, uid);
  if (!item) return no('Nothing to set a gem in');
  if (item.shattered) return no('Shattered. Reforge it first.');
  if (!socketsOf(item)) return no('It has no socket.');
  const { slots, stray } = slotsOf(item);
  if (!Number.isInteger(index) || index < 0 || index >= slots.length) return no('No such socket.');
  if (!GEMS[gemId]) return no('No such gem.');
  if (slots[index] === gemId) return no('That gem is already set there.');
  if (!((game.gems?.[gemId] || 0) > 0)) return no(`You have no ${GEMS[gemId].name}.`);
  const cost = socketCost(item);
  const short = shortOf(game, cost);
  if (short) return no(short, cost);
  const back = oneOf([slots[index], ...stray]);
  const gems = slots.map((id, i) => (i === index ? gemId : id));
  const paid = pay(game, cost);
  const g = { ...paid, gems: addCounts(addCounts(paid.gems, back), { [gemId]: -1 }) };
  return { game: replaceItem(g, { ...item, gems }), ok: true, cost, reason: null };
}

export function unsocket(game, uid, index) {
  const item = findItem(game, uid);
  if (!item) return { game, ok: false, reason: 'Nothing there' };
  const { slots, stray } = slotsOf(item);
  if (!Number.isInteger(index) || index < 0 || index >= slots.length || !slots[index]) return { game, ok: false, reason: 'No gem in that socket.' };
  const g = { ...game, gems: addCounts(game.gems, oneOf([slots[index], ...stray])) };
  return { game: replaceItem(g, { ...item, gems: slots.map((id, i) => (i === index ? null : id)) }), ok: true, reason: null };
}

export function buyGem(game, gemId, n = 1) {
  const gem = GEMS[gemId];
  const count = Math.max(1, Math.floor(n) || 1);
  if (!gem?.price) return { game, ok: false, cost: null, reason: 'Not for sale' };
  const cost = { gold: gem.price * count, materials: {} };
  if (game.gold < cost.gold) return { game, ok: false, cost, reason: `Needs ${cost.gold} gold` };
  return { game: { ...game, gold: game.gold - cost.gold, gems: addCounts(game.gems, { [gemId]: count }) }, ok: true, cost, reason: null };
}

// ---- Awakening --------------------------------------------------------------------------------------------

// The bearer's best Domain (their primary Domain wins a tie); it decides the path their relic can take.
export function bestDomainOf(hero) {
  const primary = HEROES[hero?.id]?.domain || null;
  let best = primary, level = hero?.domains?.[primary]?.level ?? -1;
  for (const [id, d] of Object.entries(hero?.domains || {})) if ((d?.level ?? 0) > level) { best = id; level = d.level; }
  return best;
}

export const pathOf = hero => (HAND.has(bestDomainOf(hero)) ? 'a' : 'b');

export function awakenCost(item) {
  const A = TUNING.forge.awaken;
  return { gold: A.gold * half(item), materials: { embers: A.embers } };
}

export function awakenOptions(game, uid) {
  const item = findItem(game, uid);
  const relic = item && RELICS[item.base];
  if (!relic) return { ready: false, why: 'Only relics awaken.', cost: null, bearer: null, path: null, branches: [] };
  const deeds = deedsOf(item);
  const done = deeds.filter(d => d.done).length;
  const cost = awakenCost(item);
  const who = wearerOf(game, uid);
  const bearer = who ? game.party.roster[who.heroId] : null;
  const path = bearer ? pathOf(bearer) : null;
  const why = item.shattered ? 'Shattered. Reforge it first.'
    : stageOf(item) === 'awakened' ? 'It is already awake.'
      : done < deeds.length ? `${done} of ${deeds.length} deeds done.` : null;
  const ready = !why;
  // who could carry it at all (a whole copy of it: the shattered flag is the forge's business, not the path's)
  const carriers = game.party.active.map(h => game.party.roster[h]).filter(h => h && canUse(h, { ...item, shattered: false }).ok);
  const branches = Object.entries(relic.awaken || {}).map(([id, b]) => {
    const names = carriers.filter(h => pathOf(h) === id).map(h => h.name);
    const open = !!bearer && (path === id || !names.length);
    const wrong = !bearer ? `Equip it on the one who will carry it${names.length ? ` (${PATHS[id]}: ${names.join(', ')})` : ''}.`
      : open ? null : `Equip it on someone whose path is ${PATHS[id]} (${names.join(', ')}).`;
    const note = open && path !== id ? `Nobody who can carry it walks ${PATHS[id]}, so its bearer may choose it.` : null;
    return { id, name: b.name, text: b.text, stats: b.stats || {}, path: PATHS[id] || id, enabled: ready && !wrong, why: why || wrong, note };
  });
  return { ready, why, cost, bearer: bearer?.id || null, path, branches };
}

export function awaken(game, uid, branchId) {
  const opt = awakenOptions(game, uid);
  const b = opt.branches.find(x => x.id === branchId);
  if (!b) return { game, ok: false, cost: opt.cost, reason: opt.why || 'No such path.' };
  if (!b.enabled) return { game, ok: false, cost: opt.cost, reason: b.why };
  const short = shortOf(game, opt.cost);
  if (short) return { game, ok: false, cost: opt.cost, reason: short };
  const item = findItem(game, uid);
  const paid = pay(game, opt.cost);
  const g = { ...paid, codex: { ...paid.codex, [item.base]: { sighted: true, ...paid.codex?.[item.base], claimed: true, awakened: true } } };
  return { game: replaceItem(g, { ...item, awakened: branchId }), ok: true, cost: opt.cost, reason: null };
}
