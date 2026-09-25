// Equipment rules: who can use what, equip/unequip, and stat comparisons for the UI's
// green/red arrows. All functions return new game objects; inputs are never mutated.

import { HEROES } from '../data/heroes.js';
import { ITEMS } from '../data/items.js';
import { RELICS } from '../data/relics.js';
import { TUNING } from '../data/tuning.js';
import { deriveHero } from './stats.js';
import { indexItems } from './util.js';

const HERO_WORD = h => HEROES[h.id]?.name || h.id;

function baseOf(item) {
  return RELICS[item.base] || ITEMS[item.base] || null;
}

const handsOf = item => (RELICS[item.base]?.weapon?.hands || ITEMS[item.base]?.hands || 1);

// Can this hero use this item? Returns { ok, reason }.
export function canUse(hero, item) {
  const data = HEROES[hero.id];
  const base = item && baseOf(item);
  if (!data || !base) return { ok: false, reason: 'Unknown item' };
  if (item.shattered) return { ok: false, reason: 'Shattered. Hilda can reforge it.' };
  if (data.refuses?.kinds.includes(item.kind)) return { ok: false, reason: data.refuses.text };
  const slot = item.slot;
  if (slot === 'weapon' && !data.prof.weapons.includes(item.kind)) {
    return { ok: false, reason: item.kind === 'bow' ? `Bows need training. ${HERO_WORD(hero)} never learned.` : `${HERO_WORD(hero)} is not trained with ${item.kind}s.` };
  }
  if (slot === 'offhand' && !data.prof.offhand.includes(item.kind)) return { ok: false, reason: `${HERO_WORD(hero)} cannot use a ${item.kind}.` };
  if (slot === 'body' && !data.prof.armor.includes(item.kind)) return { ok: false, reason: `${HERO_WORD(hero)} cannot move in ${item.kind} armour.` };
  for (const [ab, need] of Object.entries(base.needs || {})) {
    if ((hero.base?.[ab] ?? 10) < need) return { ok: false, reason: `Needs ${ab} ${need}.` };
  }
  return { ok: true, reason: null };
}

function setHero(game, hero) {
  return { ...game, party: { ...game.party, roster: { ...game.party.roster, [hero.id]: hero } } };
}

// Who is wearing this uid right now?
export function wearerOf(game, uid) {
  for (const h of Object.values(game.party.roster)) {
    for (const [slot, id] of Object.entries(h.gear)) if (id === uid) return { heroId: h.id, slot };
  }
  return null;
}

// The gear map a hero would have after equipping `item` (two-handers clear the offhand).
function gearAfter(hero, item, byId) {
  const gear = { ...hero.gear, [item.slot]: item.uid };
  const displaced = [];
  if (hero.gear[item.slot] && hero.gear[item.slot] !== item.uid) displaced.push(hero.gear[item.slot]);
  if (item.slot === 'weapon' && handsOf(item) === 2 && gear.offhand) { displaced.push(gear.offhand); gear.offhand = null; }
  if (item.slot === 'offhand') {
    const w = gear.weapon && byId[gear.weapon];
    if (w && handsOf(w) === 2) return { gear: null, displaced, reason: `${w.name} needs both hands.` };
  }
  return { gear, displaced, reason: null };
}

export function equip(game, heroId, uid) {
  const byId = indexItems(game.inventory);
  const item = byId[uid];
  const hero = game.party.roster[heroId];
  if (!item || !hero) return { game, ok: false, reason: 'Nothing to equip', displaced: [] };
  const can = canUse(hero, item);
  if (!can.ok) return { game, ok: false, reason: can.reason, displaced: [] };
  const plan = gearAfter(hero, item, byId);
  if (!plan.gear) return { game, ok: false, reason: plan.reason, displaced: [] };
  let g = game;
  const prev = wearerOf(game, uid);
  if (prev && prev.heroId !== heroId) {
    const other = g.party.roster[prev.heroId];
    g = setHero(g, { ...other, gear: { ...other.gear, [prev.slot]: null } });
  }
  g = setHero(g, clampVitals({ ...g.party.roster[heroId], gear: plan.gear }, g.inventory));
  return { game: g, ok: true, reason: null, displaced: plan.displaced };
}

export function unequip(game, heroId, slot) {
  const hero = game.party.roster[heroId];
  if (!hero || !hero.gear[slot]) return game;
  return setHero(game, clampVitals({ ...hero, gear: { ...hero.gear, [slot]: null } }, game.inventory));
}

function clampVitals(hero, inventory) {
  const d = deriveHero(hero, inventory);
  return { ...hero, hp: Math.min(hero.hp ?? d.maxHp, d.maxHp), mp: Math.min(hero.mp ?? d.maxMp, d.maxMp) };
}

function summary(d) {
  return {
    hp: d.maxHp, mp: d.maxMp, guard: d.guard, hit: d.weapon.hit, dmg: Math.round(d.weapon.avg * 10) / 10,
    speed: d.speed, delay: d.delay, crit: 21 - d.critRange,
  };
}

// Stat deltas if `hero` equipped `item`: positive = green arrow, negative = red.
export function compare(hero, item, inventory) {
  const byId = { ...indexItems(inventory), [item.uid]: item };
  const can = canUse(hero, item);
  const before = summary(deriveHero(hero, byId));
  if (!can.ok) return { ok: false, reason: can.reason, slot: item.slot, current: hero.gear[item.slot] || null, before, after: before, deltas: {} };
  const plan = gearAfter(hero, item, byId);
  if (!plan.gear) return { ok: false, reason: plan.reason, slot: item.slot, current: hero.gear[item.slot] || null, before, after: before, deltas: {} };
  const after = summary(deriveHero({ ...hero, gear: plan.gear }, byId));
  const deltas = {};
  for (const k of Object.keys(before)) if (after[k] !== before[k]) deltas[k] = Math.round((after[k] - before[k]) * 10) / 10;
  return { ok: true, reason: null, slot: item.slot, current: hero.gear[item.slot] || null, displaced: plan.displaced, before, after, deltas };
}

// A single number for "is this an upgrade?" used by the auto-equip helper and the sim.
export function upgradeScore(cmp) {
  if (!cmp.ok) return -Infinity;
  const d = cmp.deltas;
  // Delay is inverted: lower is faster. Damage and Guard dominate, as in the prototype.
  return (d.dmg || 0) * 2 + (d.guard || 0) * 3 + (d.hit || 0) * 1.5 + (d.hp || 0) * 0.2 + (d.mp || 0) * 0.1 + (d.speed || 0) * 0.8 - (d.delay || 0) * 0.05 + (d.crit || 0) * 1.5;
}

// Which active hero gains the most from this item (null if nobody can use it).
export function bestHeroFor(game, item) {
  let best = null, score = 0;
  for (const id of game.party.active) {
    const s = upgradeScore(compare(game.party.roster[id], item, game.inventory));
    if (s > score) { best = id; score = s; }
  }
  return best;
}

// Hilda's reforge: restores a shattered relic for gold.
export function reforgeCost(item) {
  return Math.round(TUNING.shop.reforgePerIlvl * Math.max(1, item.ilvl || 1));
}

export function reforge(game, uid) {
  const item = game.inventory.find(i => i.uid === uid);
  if (!item?.shattered) return { game, ok: false, reason: 'Not shattered' };
  const cost = reforgeCost(item);
  if (game.gold < cost) return { game, ok: false, reason: `Needs ${cost} gold` };
  const fixed = { ...item };
  delete fixed.shattered;
  return { game: { ...game, gold: game.gold - cost, inventory: game.inventory.map(i => (i.uid === uid ? fixed : i)) }, ok: true, cost };
}
