// Building foe combatants from spawns, and escalating spawns for the Waking and Grudges.

import { FOES, FOE_TIERS } from '../data/foes.js';
import { ITEMS } from '../data/items.js';
import { RELICS } from '../data/relics.js';
import { OMENS, OMEN_IDS } from '../data/omens.js';
import { TUNING } from '../data/tuning.js';
import { RARITY_ORDER } from '../data/rarity.js';
import { createRng } from '../core/rng.js';

// Visible gear rarity by gear tier: rags, then wrought, tempered, runed.
export const GEAR_RARITY = Object.freeze(['worn', 'wrought', 'tempered', 'runed']);

export function familyOf(spawn) {
  const fam = FOES[spawn.family];
  if (!fam) throw new Error(`Unknown foe family: ${spawn.family}`);
  const v = spawn.variant && fam.variants?.[spawn.variant];
  return v ? { ...fam, ...v } : fam;
}

// Deterministically add `n` Omens the spawn does not already have (some Omens are not
// allowed on some tiers: a twinned Champion would be two Champions).
export function addOmens(omens, n, seed, tier = null) {
  const out = [...(omens || [])];
  const rng = createRng(seed);
  for (let i = 0; i < n; i++) {
    const free = OMEN_IDS.filter(o => !out.includes(o) && !(tier && OMENS[o].notFor?.includes(tier)));
    if (!free.length) break;
    out.push(rng.pick(free));
  }
  return out;
}

// "Stronger and stronger": each Waking step adds levels, a gear tier and Omens to every spawn.
export function escalateSpawn(spawn, waking = 0, salt = '') {
  if (!waking) return { ...spawn, omens: [...(spawn.omens || [])] };
  const fam = FOES[spawn.family];
  const W = TUNING.waking;
  const omenCount = fam.tier === 'rabble' ? Math.max(0, waking - 1) : waking * W.omens;
  return {
    ...spawn,
    level: spawn.level + waking * W.levels,
    gearTier: Math.min(3, (spawn.gearTier || 0) + waking * W.gearTier),
    omens: addOmens(spawn.omens, omenCount, `${spawn.family}:${spawn.level}:${waking}:${salt}`, fam.tier),
  };
}

const scale = (base, every, level) => base + Math.floor((level - 1) / every);

function visibleGear(fam, spawn) {
  if (!fam.gear) return [];
  const tier = Math.min(3, spawn.gearTier || 0);
  const rarity = GEAR_RARITY[tier];
  const gear = fam.gear[tier].map(g => ({ base: g.base, kind: ITEMS[g.base].kind, slot: ITEMS[g.base].slot, rarity }));
  const worn = spawn.wears && RELICS[spawn.wears];
  if (worn) {
    const i = gear.findIndex(g => g.slot === worn.slot);
    const piece = { base: worn.id, kind: worn.kind, slot: worn.slot, rarity: worn.rarity, relic: worn.id };
    if (i >= 0) gear[i] = piece; else gear.push(piece);
  }
  return gear;
}

function heldPieces(fam, spawn) {
  const L = spawn.level;
  const ironclad = (spawn.omens || []).reduce((m, o) => m * (OMENS[o]?.gripMult || 1), 1);
  const gripFor = base => Math.round(base * (1 + 0.1 * (L - 1)) * ironclad);
  // spawn.held: [{ relic } | { item }] (items are Echoes of relics already claimed)
  const list = spawn.held || (spawn.relic ? [spawn.relic] : (fam.relics || [])).map(relic => ({ relic }));
  return list.map(h => {
    const max = gripFor(h.relic ? RELICS[h.relic].grip || 20 : 20);
    return { relic: h.relic || null, item: h.item || null, grip: max, max, held: true };
  });
}

// A foe combatant. `id` and `seq` come from the battle.
export function buildFoe(spawn, { id, seq = 0, name } = {}) {
  const fam = familyOf(spawn);
  const L = Math.max(1, spawn.level || 1);
  const F = TUNING.foe;
  const omens = [...(spawn.omens || [])];
  const gt = fam.humanoid ? Math.min(3, spawn.gearTier || 0) : 0;
  const om = omens.map(o => OMENS[o]).filter(Boolean);
  const gear = visibleGear(fam, spawn);
  const weaponBase = gear.find(g => g.slot === 'weapon' && ITEMS[g.base]);
  const bodyBase = gear.find(g => g.slot === 'body');
  const bodyArmor = bodyBase && (ITEMS[bodyBase.base]?.armor || RELICS[bodyBase.base]?.armor);
  const hp = Math.round(fam.hp * (1 + F.hpPerLevel * (L - 1)) * (1 + F.gearHp * gt) * (1 + F.omenHp * om.length));
  const rewards = 1 + F.omenReward * om.length;
  const saves = {};
  for (const [k, v] of Object.entries(fam.saves || {})) saves[k] = scale(v, F.saveEvery, L);
  const speed = fam.speed + om.reduce((a, o) => a + (o.speed || 0), 0);
  const R = TUNING.ribbon;
  const displayName = [name || spawn.name || fam.name, spawn.title].filter(Boolean).join(' ');
  return {
    id, seq, side: 'foe', family: fam.id, variant: spawn.variant || null, art: fam.art, name: displayName,
    tier: fam.tier, level: L, gearTier: gt, omens,
    hp, maxHp: hp,
    guard: scale(fam.guard, F.guardEvery, L) + gt + om.reduce((a, o) => a + (o.guard || 0), 0),
    atk: scale(fam.atk, F.atkEvery, L) + gt,
    dmg: scale(fam.dmg, F.dmgEvery, L),
    speed, delay: Math.max(R.minDelay, R.baseDelay - (speed - 10) * R.speedDelay),
    armor: bodyArmor?.type || fam.armor || 'none', aspect: fam.aspect || null,
    weak: [...(fam.weak || [])], resist: [...(fam.resist || []), ...om.flatMap(o => o.resist || [])], immune: [...(fam.immune || [])],
    saves, statuses: [], next: 0, ko: false, gone: false,
    die: FOE_TIERS[fam.tier].die, intent: null, queue: [],
    held: heldPieces(fam, spawn), phase: 1, gear,
    weapon: weaponBase ? { dice: ITEMS[weaponBase.base].dice, dmg: ITEMS[weaponBase.base].dmg } : null,
    xp: Math.round(TUNING.xp.tier[fam.tier] * L * rewards),
    gold: Math.round(TUNING.gold.tier[fam.tier] * L * rewards),
    grudge: spawn.grudge || null, wears: spawn.wears || null,
    summonedBy: spawn.summonedBy || null, noLoot: !!spawn.noLoot, spawnIndex: spawn.spawnIndex ?? null,
  };
}

// Rarity of the visible weapon/armour a humanoid carries (for loot and art).
export function gearRarityIndex(foe) {
  return RARITY_ORDER.indexOf(GEAR_RARITY[foe.gearTier || 0]);
}
