// Every balance knob in one place. The sim (tools/sim.mjs) was used to settle these numbers;
// change them here rather than inside rules code.

import { deepFreeze } from '../core/freeze.js';

export const TUNING = deepFreeze({
  attack: {
    grazeWindow: 3,      // missing Guard by this much or less still lands
    grazeMult: 0.5,      // ...for half damage (riders do not apply)
    critDiceMult: 2,     // Legend Strike doubles the number of damage dice
    fumbleDelay: 25,     // a natural 1 costs extra ribbon time
    minCritRange: 17,    // gear can widen crits to 17-20 at most
  },
  ribbon: {
    baseDelay: 100,      // one "round" of ribbon time
    speedDelay: 4,       // each point of speed above 10 shaves this much delay
    minDelay: 45,
    initBase: 64,        // first turn lands at initBase - initPerPoint * (d20 + DEX mod)
    initPerPoint: 2,
    staggerPush: 35,     // staggered: pushed back on the ribbon
    ambushDelay: 40,     // an ambushed party's first turns come this much later
    ambushChance: 0.25,  // patrols (grinding) sometimes ambush
    preview: 8,
    firstStrikeDelay: 40, // M3: a First Strike pushes every foe's first turn back this much
  },
  surge: {               // Legend Surge gauge 0-100
    max: 100, hit: 5, graze: 2, crit: 20, kill: 8,
    takenPct: 50,        // taking 100% of max HP in damage would add this much
    healGiven: 3,
  },
  grip: {
    crushMult: 0.6,      // crush damage wears grip by 60% of the damage dealt
    critPct: 0.25,       // a Legend Strike on a holder jars 25% of max grip loose
  },
  foe: {
    hpPerLevel: 0.24,    // +24% of base HP per level above 1
    atkEvery: 2,         // +1 attack per 2 levels
    guardEvery: 3,       // +1 Guard per 3 levels
    dmgEvery: 2,         // +1 flat damage per 2 levels
    diceEvery: 3,        // foe attack/damage dice: +1 die per 3 levels (1d6 at L1, 3d6 at L7)
    saveEvery: 3,
    gearHp: 0.12,        // humanoid gear tiers: +12% HP, +1 Guard, +1 attack per tier
    omenHp: 0.10,        // each Omen adds 10% HP and 20% rewards
    omenReward: 0.2,
  },
  waking: {              // "stronger and stronger": per Waking step
    levels: 6,
    gearTier: 1,
    omens: 1,            // extra Omens on veterans and above (rabble get waking-1)
    luck: 1,             // loot luck
    rabbleLevels: 2,     // M3: rabble rise this many levels per Waking (read by rules/foe.js from M3 on)
  },
  rest: {
    breatherHp: 0.2,     // after a won fight each hero catches their breath
    breatherMp: 0.25,
  },
  wipe: {
    goldLoss: 0.10,      // settled decision: wake at the last Hearthfire, keep gear, lose 10% gold
    lessonXp: 0.25,      // "never a wall": a wipe still teaches 25% of the fight's XP
    grudgeOmens: { champion: 1, other: 2 }, // cap on Omens a Grudge can add
  },
  xp: {
    base: 30, exp: 1.55, // xp to go from level L to L+1 = base * L^exp
    tier: { rabble: 7, veteran: 16, 'relic-bearer': 48, champion: 110 }, // per foe level
  },
  gold: { tier: { rabble: 3, veteran: 8, 'relic-bearer': 25, champion: 60 } }, // per foe level
  drops: {
    rabbleChance: 0.3,        // rabble sometimes drop random worn/wrought gear
    rabbleWornChance: 0.35,   // humanoid rabble drop the exact weapon they carry
    luck: { rabble: 0, veteran: 1, 'relic-bearer': 2, champion: 3 },
    extra: { rabble: 0, veteran: 0, 'relic-bearer': 1, champion: 2 }, // bonus random items
    luckCurve: 0.7,           // weight of rank i is scaled by (1 + luck)^(i * luckCurve)
    consumable: { rabble: 0.06, veteran: 0.15, 'relic-bearer': 0.5, champion: 1 }, // chance per foe
    consumableWeights: { 'hearth-tonic': 5, 'frost-draught': 2, bitterroot: 2, 'ember-salts': 1 },
  },
  flee: { dc: 10, tierDc: { rabble: 0, veteran: 3, 'relic-bearer': 6, champion: 99 } },
  shop: { reforgePerIlvl: 12 },
  // ---- M3 overworld (read by rules/world.js; spec §4.5) ----
  world: {
    sight: 5, sightDark: 2,              // a pack notices you within this many tiles (line of sight)
    sightRelic: 5, sightRelicWatchful: 9, // holders are Sighted (codex) within this range
    alertWait: 2, alertWaitStill: 6,     // ticks between the "!" and the chase (Stillness: 6)
    leash: 4,                            // wander radius around home; chase gives up at leash + 6
    fleeGap: 3,                          // weak = all rabble and top level <= party level - fleeGap (Dawnbell: 2)
    grace: 6, fleeStun: 12,              // ticks of no contact after a battle; stun after you flee
    spawnDistance: 8,                    // roamers spawn at least this far (Chebyshev) from you
    hazardPct: 0.04,                     // soft ichor: max HP lost per step without a key
    darkRadius: 2,                       // soft darkness: sight radius without a key
    hunterSight: 3,                      // M4: a Grudge pack hunts you: it sees this much farther (spec §4.6)
    longsight: 4,                        // M4: Saltglass's Longsight widens the Sighted range by this much
  },
  rout: { xp: 0.5 },                     // a Rout pays full gold and this share of XP
  forewarned: { ward: '2d6+4' },         // the dream of the four Sleepers: every hero starts the Rotwarden fight Warded
  // ---- M4: Hilda's full forge (read by rules/forge.js; spec §4.2, §4.3, §3.7) ----
  // The step from +t to +t+1 costs base * ceil(ilvl / 2) * mult[t] gold, plus silver[t] silver and
  // embers[t] embers (the higher tempers are paced by Sunscorch loot). Each step is +1 enchant.
  temper: {
    max: 10, base: 30,
    mult: [1, 2, 4, 6, 8, 11, 14, 18, 23, 30],
    silver: [0, 0, 0, 1, 2, 3, 0, 0, 0, 0],
    embers: [0, 0, 0, 0, 0, 0, 1, 2, 3, 4],
  },
  forge: {
    // Reroll one trait: base * ceil(ilvl / 2) * (1 + rerolls so far) gold, plus one of the material
    reroll: { base: 40, material: { wrought: 'scrap', tempered: 'scrap', runed: 'silver', storied: 'silver' } },
    salvage: { worn: { scrap: 1 }, wrought: { scrap: 2 }, tempered: { silver: 1, scrap: 1 }, runed: { silver: 2 }, storied: { embers: 1, silver: 1 } },
    socket: 20,                            // gold per ceil(ilvl / 2) to set a gem
    awaken: { embers: 2, gold: 150 },      // Hilda's rite: the embers plus gold * ceil(ilvl / 2)
    kindled: { hit: 1, guard: 1, hp: 5 },  // a Kindled relic: +1 hit (weapons), +1 Guard (armour, shields), +5 max HP (the rest)
    // Won Sunscorch fights pay materials per foe beaten, by tier; Ash Garnets only come from Scorchgate
    spoils: { veteran: { scrap: 1 }, 'relic-bearer': { silver: 1 }, champion: { silver: 2, embers: 2 } },
    garnets: { 'sg-captain': 1, 'vault-guard': 1, 'ashen-warden': 2 },
  },
});
