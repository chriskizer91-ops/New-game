// Derived combat stats for heroes: base scores + level + gear (rarity enchant, affixes,
// temper, set bonuses, relic stats). Pure; used by battle, party.compare and the UI sheet.

import { HEROES } from '../data/heroes.js';
import { ITEMS } from '../data/items.js';
import { RELICS, SETS, STORIED_POWERS, HEROIC_SURGE } from '../data/relics.js';
import { AFFIXES } from '../data/affixes.js';
import { RARITY } from '../data/rarity.js';
import { DOMAINS } from '../data/domains.js';
import { TUNING } from '../data/tuning.js';
import { mod, clamp, profFor, ibFor, indexItems, avgExpr } from './util.js';

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const UNARMED = Object.freeze({ dice: '1d4', dmg: 'crush', hands: 1, weight: 0, ability: ['STR'], extra: [] });

// Every power a Surge can fire, by id.
export const POWERS = Object.freeze(Object.fromEntries([
  ...Object.values(RELICS).filter(r => r.power).map(r => [r.power.id, r.power]),
  ...Object.values(STORIED_POWERS).map(p => [p.id, p]),
  [HEROIC_SURGE.id, HEROIC_SURGE],
]));

function emptyAcc() {
  return {
    hp: 0, mp: 0, guard: 0, hit: 0, dmg: 0, speed: 0, crit: 0, regen: 0, regenPct: 0, mpRegen: 0,
    healBonus: 0, surgeGain: 0, gripDmg: 0, ambushImmune: 0,
    abilities: {}, resist: {}, extra: [], vsHurt: [], vsUnaware: [],
  };
}

// Merge a stats block (item/affix/set/trait) into the accumulator.
function addStats(acc, stats = {}) {
  for (const [k, v] of Object.entries(stats)) {
    if (k === 'resist') for (const [a, p] of Object.entries(v)) acc.resist[a] = (acc.resist[a] || 0) + p;
    else if (ABILITIES.includes(k)) acc.abilities[k] = (acc.abilities[k] || 0) + v;
    else if (typeof v === 'number' && k in acc) acc[k] += v;
  }
}

function addAffix(acc, { id, value }) {
  const a = AFFIXES[id];
  if (!a) return;
  if (a.stat === 'resist') acc.resist[a.aspect] = (acc.resist[a.aspect] || 0) + value;
  else if (a.stat === 'extraDice') acc.extra.push({ dice: `1d${value * 2}`, aspect: a.aspect });
  else if (a.stat === 'vsHurt' || a.stat === 'vsUnaware') acc[a.stat].push(`1d${value * 2}`);
  else addStats(acc, { [a.stat]: value });
}

// What an ItemInstance contributes: stats, weapon/armor profile, set, power and granted skills.
export function itemProfile(item) {
  if (!item) return null;
  const relic = RELICS[item.base];
  const base = relic || ITEMS[item.base];
  if (!base) return null;
  const rarity = RARITY[item.rarity] || RARITY.worn;
  const own = emptyAcc();
  addStats(own, base.stats);
  for (const a of item.affixes || []) addAffix(own, a);
  // Hand-made relics carry their own numbers; generated gear gets the rarity enchant.
  const enchant = (relic ? 0 : rarity.enchant) + Math.floor((item.temper || 0) / 2);
  const slot = item.slot || base.slot;
  if (slot === 'weapon') { own.hit += enchant; own.dmg += enchant; }
  else if (slot === 'body' || (slot === 'offhand' && base.kind === 'shield')) own.guard += enchant;
  else own.hp += enchant * 3;
  const w = relic ? relic.weapon : (slot === 'weapon' ? base : null);
  const weapon = w && {
    dice: w.dice, dmg: w.dmg, hands: w.hands || 1, versatile: w.versatile || null, weight: w.weight || 0,
    ability: w.ability || ['STR'], ranged: !!w.ranged, extra: [...(w.extra || [])],
    aspect: item.aspect || (relic && relic.aspect) || null,
  };
  const power = relic?.power?.id || (item.power && POWERS[item.power] ? item.power : null);
  return {
    item, base, relic: relic || null, slot, stats: own, weapon, armor: base.armor || null,
    set: relic?.set || null, power, grants: relic?.grants || [], rank: rarity.rank, needs: base.needs || null,
  };
}

export function equippedProfiles(hero, items) {
  const byId = indexItems(items);
  const out = {};
  for (const [slot, uid] of Object.entries(hero.gear || {})) {
    const it = uid && byId[uid];
    if (it && !it.shattered) out[slot] = itemProfile(it);
  }
  return out;
}

function domainLevel(hero, domainId) {
  return hero.domains?.[domainId]?.level ?? Math.min(20, hero.level || 1);
}

// Max HP: full hit die at level 1, then the stored level-up rolls; CON counts every level.
function maxHpFor(hero, data, conMod, bonus) {
  const level = hero.level || 1;
  const avg = Math.floor(data.hpDie / 2) + 1;
  let hp = data.hpDie + conMod;
  for (let l = 2; l <= level; l++) hp += Math.max(1, (hero.hpRolls?.[l - 2] ?? avg) + conMod);
  return Math.max(1, hp + bonus);
}

export function deriveHero(hero, items) {
  const data = HEROES[hero.id];
  const level = hero.level || 1;
  const gear = equippedProfiles(hero, items);
  const acc = emptyAcc();
  const immune = [];
  for (const tr of data.traits || []) { addStats(acc, tr.stats); immune.push(...(tr.immune || [])); }
  // Weapon-only numbers (enchant, relic hit/dmg) must not leak into spells, so split them out.
  const wp = gear.weapon;
  const weaponHit = wp ? wp.stats.hit : 0;
  const weaponDmg = wp ? wp.stats.dmg : 0;
  const sets = {};
  for (const p of Object.values(gear)) {
    addStats(acc, { ...statsOf(p.stats), hit: p === wp ? 0 : p.stats.hit, dmg: p === wp ? 0 : p.stats.dmg });
    for (const [a, v] of Object.entries(p.stats.abilities)) acc.abilities[a] = (acc.abilities[a] || 0) + v;
    for (const [a, v] of Object.entries(p.stats.resist)) acc.resist[a] = (acc.resist[a] || 0) + v;
    acc.extra.push(...(p === wp ? p.stats.extra : []));
    acc.vsHurt.push(...p.stats.vsHurt);
    acc.vsUnaware.push(...p.stats.vsUnaware);
    if (p.set) sets[p.set] = (sets[p.set] || 0) + 1;
  }
  const setBonuses = [];
  for (const [sid, n] of Object.entries(sets)) {
    for (const b of SETS[sid]?.bonuses || []) if (n >= b.n) { addStats(acc, b.stats); setBonuses.push({ set: sid, n: b.n, text: b.text }); }
  }
  const abilities = {};
  for (const a of ABILITIES) abilities[a] = (hero.base?.[a] ?? 10) + (acc.abilities[a] || 0);
  const mods = Object.fromEntries(ABILITIES.map(a => [a, mod(abilities[a])]));
  const prof = profFor(level);
  const dom = data.domain;
  const ib = ibFor(domainLevel(hero, dom));
  const dc = 8 + ib + mods[DOMAINS[dom].ability];

  const w = wp?.weapon || UNARMED;
  const abilityMod = Math.max(...w.ability.map(a => mods[a]));
  const twoHanded = w.hands === 2;
  const dice = w.versatile && !gear.offhand ? w.versatile : w.dice;
  const weapon = {
    name: wp ? wp.item.name : 'Fists', uid: wp ? wp.item.uid : null, kind: wp ? (wp.base.kind) : 'unarmed',
    dice, dmg: w.dmg, aspect: w.aspect || null, extra: [...w.extra, ...acc.extra], ranged: !!w.ranged,
    weight: w.weight || 0, hands: w.hands || 1, twoHanded, versatile: !!(w.versatile && !gear.offhand),
    hit: prof + abilityMod + weaponHit + acc.hit, flat: abilityMod + weaponDmg + acc.dmg,
  };
  weapon.avg = avgExpr(weapon.dice) + weapon.extra.reduce((a, e) => a + avgExpr(e.dice), 0) + weapon.flat;

  const armor = gear.body?.armor;
  const guard = (armor ? armor.base + Math.min(mods.DEX, armor.maxDex) : 10 + mods.DEX) + acc.guard;
  const speed = 10 + mods.DEX + acc.speed;
  const R = TUNING.ribbon;
  const delay = Math.max(R.minDelay, R.baseDelay + weapon.weight - (speed - 10) * R.speedDelay);
  const resist = Object.fromEntries(Object.entries(acc.resist).map(([a, p]) => [a, clamp(p, 0, 60)]));
  const powers = Object.values(gear)
    .filter(p => p.power)
    .sort((a, b) => b.rank - a.rank)
    .map(p => ({ uid: p.item.uid, power: p.power, rank: p.rank, relic: p.relic?.id || null }));
  const grants = [...new Set(Object.values(gear).flatMap(p => p.grants))];

  return {
    id: hero.id, level, prof, ib, dc, domain: dom, abilities, mods,
    maxHp: maxHpFor(hero, data, mods.CON, acc.hp),
    maxMp: Math.max(0, data.mp.base + data.mp.perLevel * (level - 1) + 2 * mods[data.mp.stat] + acc.mp),
    guard, speed, delay, critRange: Math.max(TUNING.attack.minCritRange, 20 - acc.crit),
    armorType: armor?.type || 'none', weapon,
    hitOther: acc.hit, dmgOther: acc.dmg,
    resist, immune, regen: acc.regen, regenPct: acc.regenPct, mpRegen: acc.mpRegen,
    healBonus: acc.healBonus, surgeGain: acc.surgeGain, gripDmg: acc.gripDmg,
    vsHurt: acc.vsHurt, vsUnaware: acc.vsUnaware, ambushImmune: acc.ambushImmune > 0,
    sets, setBonuses, powers, grants,
  };
}

// Numeric fields of an item's own accumulator (arrays and maps are merged separately).
function statsOf(own) {
  const out = {};
  for (const [k, v] of Object.entries(own)) if (typeof v === 'number') out[k] = v;
  return out;
}

// The hero's usable skills: level unlocks plus arts granted by equipped relics.
export function heroSkills(hero, derived) {
  const data = HEROES[hero.id];
  const learned = new Set(hero.skills || data.skills.filter(s => s.level <= (hero.level || 1)).map(s => s.id));
  for (const g of derived?.grants || []) learned.add(g);
  return [...learned];
}
