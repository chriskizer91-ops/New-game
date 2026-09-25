// Loot: rarity rolls, random item generation, named-relic instances, and battle drops.
// Everything is driven by the RNG passed in, so the same seed always yields the same drop.

import { ITEMS } from '../data/items.js';
import { AFFIXES } from '../data/affixes.js';
import { RARITY, RARITY_ORDER, RANDOM_RARITIES } from '../data/rarity.js';
import { RELICS, STORIED_POWERS } from '../data/relics.js';
import { NAMES } from '../data/names.js';
import { TUNING } from '../data/tuning.js';
import { weightedPick, clamp } from './util.js';

const T = TUNING.drops;
const rankOf = id => RARITY_ORDER.indexOf(id);
const SLOT_WEIGHT = { weapon: 3, body: 2, head: 2, offhand: 1.5, hands: 1, feet: 1, amulet: 0.8, ring: 0.8 };

export function newUid(rng) {
  return `i${rng.int(0, 2 ** 31 - 1).toString(36)}${rng.int(0, 2 ** 31 - 1).toString(36)}`;
}

// Luck bends the drop-weight curve toward the rarer tiers: rank i is scaled by
// (1 + luck)^(i * luckCurve). Luck 0 is mostly worn/wrought; luck 3 (champions) is mostly
// tempered-and-up.
export function rarityWeights(luck = 0) {
  return RANDOM_RARITIES.map((id, i) => ({ v: id, w: RARITY[id].dropWeight * Math.pow(1 + Math.max(0, luck), i * T.luckCurve) }));
}

export function rollRarity(rng, luck = 0, { min = 'worn', max = 'storied' } = {}) {
  const lo = rankOf(min), hi = Math.min(rankOf(max), rankOf('storied'));
  const entries = rarityWeights(luck).filter(e => rankOf(e.v) >= lo && rankOf(e.v) <= hi);
  return weightedPick(rng, entries.length ? entries : [{ v: min, w: 1 }]);
}

// One tier up (used by Grudges), never past storied for generated gear.
export function bumpRarity(id, n = 1) {
  const r = rankOf(id);
  if (r >= rankOf('storied')) return id;
  return RARITY_ORDER[Math.min(rankOf('storied'), r + n)];
}

export function pickBase(rng, { slot, kind, ilvl = 1 } = {}) {
  const chosenSlot = slot || (kind ? null : weightedPick(rng, Object.entries(SLOT_WEIGHT).map(([v, w]) => ({ v, w }))));
  const pool = Object.values(ITEMS).filter(b =>
    (!chosenSlot || b.slot === chosenSlot) && (!kind || b.kind === kind) && b.minIlvl <= Math.max(1, ilvl));
  // Newer bases are likelier as item level climbs.
  return weightedPick(rng, pool.map(b => ({ v: b.id, w: 1 + b.minIlvl / 3 }))) || 'belt-knife';
}

function affixValue(rng, a, rarityId, ilvl) {
  const roll = rng.int(a.range[0], a.range[1]);
  let v = Math.round(roll * RARITY[rarityId].statMult) + Math.floor(ilvl * (a.perLevel || 0));
  if (['extraDice', 'vsHurt', 'vsUnaware'].includes(a.stat)) v = Math.min(v, 6); // 1d12 at most
  return v;
}

export function rollAffixes(rng, base, rarityId, ilvl) {
  const rank = rankOf(rarityId);
  const want = RARITY[rarityId].affixes;
  const out = [];
  const groups = new Set();
  const count = { prefix: 0, suffix: 0 };
  for (let k = 0; k < want; k++) {
    const pool = Object.values(AFFIXES).filter(a =>
      a.slots.includes(base.slot) && a.minTier <= rank && !out.some(o => o.id === a.id) &&
      !(a.group && groups.has(a.group)) && count[a.type] < 2);
    if (!pool.length) break;
    const a = rng.pick(pool);
    out.push({ id: a.id, value: affixValue(rng, a, rarityId, ilvl) });
    if (a.group) groups.add(a.group);
    count[a.type]++;
  }
  return out;
}

// 1-5 quality stars: how close the roll came to the top of its range.
export function affixQuality(affix, rarityId = 'wrought', ilvl = 1) {
  const a = AFFIXES[affix.id];
  if (!a) return 1;
  const raw = (affix.value - Math.floor(ilvl * (a.perLevel || 0))) / RARITY[rarityId].statMult;
  const span = a.range[1] - a.range[0];
  return span <= 0 ? 5 : clamp(1 + Math.round(4 * (raw - a.range[0]) / span), 1, 5);
}

export function affixText(affix) {
  const a = AFFIXES[affix.id];
  return a ? a.text.replace('{v}', affix.value).replace('{d}', affix.value * 2) : '';
}

function itemAspect(base, affixes) {
  for (const { id } of affixes) {
    const a = AFFIXES[id];
    if (a.aspect && (a.stat === 'extraDice' || (a.stat === 'resist' && base.slot !== 'weapon'))) return a.aspect;
  }
  return null;
}

function itemName(rng, base, rarityId, affixes) {
  if (rarityId === 'worn') return `${rng.pick(NAMES.worn)} ${base.name}`;
  if (rarityId === 'storied') return `${rng.pick(NAMES.first)}${rng.pick(NAMES.second)}, ${rng.pick(NAMES.epithet)}`;
  const pre = affixes.map(x => AFFIXES[x.id]).find(a => a.type === 'prefix');
  const suf = affixes.map(x => AFFIXES[x.id]).find(a => a.type === 'suffix');
  return [pre?.name, base.name, suf?.name].filter(Boolean).join(' ');
}

// A random ItemInstance. `seed` drives the procedural art in src/art.
export function generateItem(rng, { base, slot, kind, rarity, ilvl = 1, luck = 0, provenance = {}, stamp } = {}) {
  const b = ITEMS[base] || ITEMS[pickBase(rng, { slot, kind, ilvl })];
  const r = rarity || rollRarity(rng, luck);
  const affixes = rollAffixes(rng, b, r, ilvl);
  const aspect = itemAspect(b, affixes);
  const item = {
    uid: newUid(rng), base: b.id, kind: b.kind, slot: b.slot, rarity: r, ilvl, name: itemName(rng, b, r, affixes),
    aspect, affixes, gems: [], temper: 0, seed: rng.int(1, 2 ** 31 - 1),
    provenance: { from: provenance.from || null, where: provenance.where || null, day: provenance.day || 1 },
    chronicle: { kills: 0 },
  };
  if (r === 'storied') {
    item.unidentified = true;
    item.lore = `Taken from ${provenance.from || 'a stranger'} at ${provenance.where || rng.pick(NAMES.places)}. ${rng.pick(NAMES.lore)}`;
    item.power = STORIED_POWERS[aspect || 'none'].id;
  }
  if (stamp) item.stamp = stamp;
  return item;
}

export function relicItem(relicId, rng, provenance = {}) {
  const r = RELICS[relicId];
  return {
    uid: newUid(rng), base: r.id, kind: r.kind, slot: r.slot, rarity: r.rarity, ilvl: r.ilvl, name: r.name,
    aspect: r.aspect || null, affixes: [], gems: [], temper: 0, seed: rng.int(1, 2 ** 31 - 1),
    provenance: { from: provenance.from || null, where: provenance.where || null, day: provenance.day || 1 },
    chronicle: { kills: 0 },
  };
}

export function identifyItem(item) {
  const rest = { ...item };
  delete rest.unidentified;
  return rest;
}

// A piece a foe visibly wears, at the rarity it is drawn with.
function gearDrop(rng, g, ilvl, prov, bumpChance = 0) {
  if (g.relic) return relicItem(g.relic, rng, prov);
  const rarity = rng.chance(bumpChance) ? bumpRarity(g.rarity) : g.rarity;
  return generateItem(rng, { base: g.base, rarity, ilvl, provenance: prov });
}

function randomDrop(rng, foe, luck, prov, min = 'worn', max = 'storied') {
  const rarity = rollRarity(rng, luck, { min, max });
  return generateItem(rng, { rarity, ilvl: foe.level, provenance: prov });
}

function foeLuck(foe, waking) {
  return T.luck[foe.tier] + waking * TUNING.waking.luck + 0.5 * foe.omens.length + (foe.grudge ? 1 : 0);
}

// What a defeated foe leaves behind (excluding its held relics).
function foeDrops(rng, foe, waking, prov) {
  const out = [];
  const luck = foeLuck(foe, waking);
  const weapon = foe.gear.find(g => g.slot === 'weapon');
  if (foe.tier === 'rabble') {
    if (weapon && rng.chance(T.rabbleWornChance)) out.push(gearDrop(rng, weapon, foe.level, prov));
    else if (rng.chance(T.rabbleChance)) out.push(randomDrop(rng, foe, luck, prov, 'worn', RARITY_ORDER[Math.min(4, 1 + waking)]));
  } else if (foe.tier === 'veteran') {
    const worn = foe.gear.find(g => g.relic) || (foe.gear.length ? rng.pick(foe.gear) : null);
    out.push(worn ? gearDrop(rng, worn, foe.level, prov, 0.35) : randomDrop(rng, foe, luck, prov));
  }
  const min = foe.tier === 'champion' ? 'tempered' : foe.tier === 'relic-bearer' ? 'wrought' : 'worn';
  const extra = (T.extra[foe.tier] || 0) + (foe.grudge ? 1 : 0); // a settled Grudge always pays out
  for (let i = 0; i < extra; i++) out.push(randomDrop(rng, foe, luck, prov, min));
  if (foe.grudge) return out.map(it => (RELICS[it.base] ? it : { ...it, rarity: bumpRarity(it.rarity), stamp: 'grudge-settled' }));
  return out;
}

// Drops and claims at victory. Disarmed relics are claimed; a holder killed while still
// gripping its relic shatters it (drops with shattered:true, reforgeable later) unless the
// battle is `gentle` (the tutorial).
export function battleLoot(s, rng) {
  const drops = [], claimed = [], consumables = {};
  for (const id of s.order) {
    const f = s.units[id];
    if (f.side !== 'foe' || f.summonedBy) continue;
    const prov = { from: f.name, where: s.ctx.where || null, day: s.ctx.day || 1 };
    for (const piece of f.held) {
      const item = piece.item ? { ...piece.item, provenance: prov } : relicItem(piece.relic, rng, prov);
      if (!piece.held) claimed.push(item);
      else if (f.ko) drops.push(s.ctx.gentle ? item : { ...item, shattered: true });
    }
    if (f.ko && !f.noLoot) {
      drops.push(...foeDrops(rng, f, s.waking || 0, prov));
      if (rng.chance(T.consumable[f.tier] || 0)) {
        const id = weightedPick(rng, Object.entries(T.consumableWeights).map(([v, w]) => ({ v, w })));
        consumables[id] = (consumables[id] || 0) + 1;
      }
    }
  }
  return { drops, claimed, consumables };
}
