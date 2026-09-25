# Aethermoor: Hearth & Heirloom · Rules as implemented

This is what `src/rules/` actually does, for future agents and curious players. Every number
below lives in a data table (`src/data/*.js`); balance knobs are in `src/data/tuning.js`.
All randomness comes from the seeded RNG in the battle or game state, so any battle can be
replayed exactly.

## 1. Rolls

**Attack.** d20 + attack bonus vs the target's **Guard**.

| Natural / total | Result | Effect |
|---|---|---|
| natural 1 | `fumble` | miss, and +25 ribbon delay for the fumbler |
| natural 20 (or ≥ crit range) | `crit`: a **Legend Strike** | auto-hit, every damage die doubled, +20 Surge, jars 25% of max grip loose |
| total ≥ Guard | `hit` | full damage, riders (statuses) apply |
| misses by 1-3 | `graze` | half damage, no riders |
| misses by 4+ | `miss` | nothing |

- **Advantage/disadvantage:** roll 2d20 and keep the higher/lower (both shown). Attacks get
  advantage against Marked, Rooted or Frozen targets; Frightened attackers have disadvantage.
  Both at once cancel.
- **Hero attack bonus:** weapon attacks = proficiency + best of the weapon's abilities + weapon
  enchant/relic hit + other gear hit. Spell/skill attacks = proficiency + skill stat + gear hit.
- **Foe attack bonus:** family base + 1 per 2 levels + 1 per humanoid gear tier.
- **Saves:** d20 + bonus vs the attacker's DC. Heroes: ability mod + proficiency. Foes: family
  save + 1 per 3 levels. Hero DC is the sheet's **Imprint DC = 8 + IB + Domain ability mod**;
  foe DC = 10 + level/2 + tier (rabble 0, veteran 1, relic-bearer 2, champion 3). Nat 20 always
  saves, nat 1 always fails.
- **Flee:** d20 + best party DEX mod + proficiency vs 10 (+3 veteran, +6 relic-bearer present).
  Never against a Champion. Logged as a `roll` with purpose `flee`, result `save`/`fail`.

Measured over 200 seeds of play, heroes land about **63-69% hits + 6-8% crits, 11-14% grazes**,
the rest misses and fumbles. (A 3-point graze window on a d20 is inherently ~15%, a little
above the ~10% target; the window is fixed by the contract.)

## 2. Damage

`damage = (dice + flat) × skill mult × (½ if graze) × armour × aspect × resist`, then
Guarding halves it, Frozen + crush multiplies by 1.5 and shatters the ice, and Warded soaks
the rest before HP. Minimum 1 unless immune.

- **Dice:** weapon dice (versatile weapons use the bigger die with an empty offhand) + the
  weapon's aspect dice (relics, `extraDice` affixes) + skill bonus dice + conditional dice
  (`vsHurt` at ≤50% HP, `vsUnaware` vs Marked/Rooted/Frozen/Staggered).
  Foe dice grow with level: **+1 die per 3 levels** (a L1 `1d6` bite is `3d6` at L7).
- **Flat:** heroes add the weapon's ability mod + enchant + gear damage; Marked targets take +2.
  Foes add family damage + 1 per 2 levels.

**Armour chart** (physical kind vs armour type; heroes' type comes from body armour):

| | none | hide | mail | plate | chitin |
|---|---|---|---|---|---|
| slash | 1 | **1.25** | 0.75 | 0.75 | 1 |
| pierce | 1 | 1 | **1.25** | 1 | 0.75 |
| crush | 1 | 0.75 | 1 | **1.25** | **1.25** |

**Aspect wheel** (×1.5 when the attack beats the defender's aspect; ×0.5 when the defender
beats it or shares it). The whole hit takes the weapon's aspect.

| aspect | beats (×1.5) | beaten by (×0.5) | why |
|---|---|---|---|
| ember | frost, verdant | stone, tide | fire melts ice, eats the green |
| frost | stone, storm | ember, radiant | ice splits rock, stills the sky |
| storm | tide, radiant | stone, frost | lightning runs through water, cloud swallows sun |
| stone | ember, storm | frost, verdant | smothers flame, grounds lightning |
| verdant | stone, tide | ember, blight | roots split rock, drink the flood |
| tide | ember, blight | storm, verdant | quenches fire, washes rot clean |
| radiant | blight, frost | blight, storm | light sears rot, thaws ice |
| blight | verdant, radiant | radiant, tide | rot eats the green, gutters light |

Radiant and blight beat each other. The starter trio is the brief's triangle: Hearthbrand
(ember) > Stillwater Lance (frost) > Cairnmaul (stone) > Hearthbrand. Foes also carry explicit
`weak`/`resist`/`immune` lists (Old Snag's bristles resist pierce) and heroes resist aspects by
percentage from gear (capped at 60%). The `damage` event reports `eff`: weak / resist / immune /
normal from the combined multiplier.

## 3. The Initiative Ribbon

Conditional turn-based. Each combatant has a `next` time; the lowest acts (ties: heroes before
foes, in party order). After acting, `next += delay`.

- `delay = 100 + weapon weight − 4 × (speed − 10)`, min 45. One **round** = 100 ticks.
- `speed = 10 + DEX mod + gear speed`. Weights: knife −20, rondel −15, arming sword −5, hand axe/
  bow/staff 0, mace/spear/longsword +5, longbow/bearded axe +10, warhammer/boar spear +15,
  greatsword +20, Cairnmaul +20, maul +30.
- Skills scale the delay (Knife Work ×0.6 is quick, Revive ×1.2 is slow); Defend ×0.8.
- Statuses: Hasted ×0.7, Rooted ×1.2, Chilled +10% per stack; Staggered pushes +35 at once.
  Frenzied foes below 25% HP act at ×0.5. Fumbles add +25. Ambushes push heroes' first turns +40
  (the full Thornwatch set prevents it).
- First turns: `64 − 2 × (d20 + speed − 10)`.
- `timeline(state, 8)` previews the next 8 turns from current delays.

## 4. Statuses

Durations count the bearer's own turns and tick down at the end of each of its turns. Damage
over time ticks at the start of the bearer's turn.

| status | effect | default |
|---|---|---|
| burning | 1d6 ember per turn | 3 turns |
| chilled | slower (+10%/stack); at 3 stacks becomes **frozen** | 3 turns, 3 stacks |
| frozen | loses its next turn; attackers have advantage; crush ×1.5 and shatters it | 1 turn |
| poisoned | 1d4 blight per stack per turn | 4 turns, 3 stacks |
| bleeding | 1d4 per stack per turn | 3 turns, 3 stacks |
| staggered | pushed back 35 on the ribbon, −1 Guard, **cancels a charging move** | until its next turn |
| frightened | attacks with disadvantage | 2 turns |
| rooted | attackers have advantage, acts ×1.2 later | 2 turns |
| marked | attackers have advantage and deal +2 | 3 turns |
| exposed | −2 Guard (Analyze) | 3 turns |
| provoked | must target whoever provoked it (Challenge) | 2 turns |
| warded | absorbs its value in damage | 3 turns |
| hasted | acts ×0.7 sooner | 2 turns |
| regenerating | heals its value each turn | 3 turns |
| guarding | +2 Guard, half damage (Defend) | until its next turn |

## 5. Foes: intent dice, move tables, phases

- **Tiers:** rabble d6 · veteran d8 · relic-bearer d12 · champion d20. The die face picks a move
  from the family's table (e.g. cutpurse d6: 1-3 Stab, 4-5 Pocket Sand, 6 Bolt).
- The intent is rolled at the **end of the foe's previous turn** (and at battle start) and
  emitted as an `intent` event (`"9: Splitting Charge, charging at Pip"`). Moves marked `charge`
  are announced as charging and are cancelled if the foe is Staggered first.
- Moves can need a held relic (`requires`), an HP condition (`when.hpBelow`), or a summon cap;
  if unavailable they fall back (Old Snag without his hatchet tusks you instead).
- **Analyze** pre-rolls and reveals the next intent (`intent` event with `queued: true`), which
  the foe then really uses.
- **Targeting:** weighted random; the wounded (<35% HP ×2.5), the healer (×1.4) and Marked heroes
  (×3) draw fire, Guarding heroes less (×0.5); Provoked foes must hit their challenger.
- **Champions** (Briarmaw) switch move tables at 66% and 33% HP with a `phase` event (phase
  1 → 2 → 3). Breaking the Thornwreath ends Call the Briars (summons); breaking Briarfang ends
  Fang Rake (bleed). When a Champion falls its summons wither.

**Foe scaling:** `HP = base × (1 + 0.24(L−1)) × (1 + 0.12 × gear tier) × (1 + 0.1 × Omens)`,
Guard +1 per 3 levels (+1 per humanoid gear tier), attack +1 per 2 levels (+gear tier), damage
+1 per 2 levels and +1 die per 3 levels. XP per foe = tier rate × level (rabble 7, veteran 16,
relic-bearer 48, champion 110), gold likewise (3/8/25/60), each Omen +20%.

| foe (Gauntlet level) | HP | Guard | atk | XP | grip |
|---|---|---|---|---|---|
| cutpurse L1 | 16 | 14 | +3 | 7 | |
| briarling L3 | 19 | 13 | +4 | 21 | |
| thornhound L3 | 27 | 14 | +5 | 21 | |
| bandit L3 (gear 1) | 43 | 16 | +6 | 48 | |
| tallyman L5 (gear 1) | 53 | 17 | +7 | 80 | tallyknife 20 |
| the Rot-Stag L4 | 206 | 16 | +6 | 192 | rotwood-circlet 31 |
| Old Snag L6 | 167 | 16 | +7 | 288 | thornsplitter 39 |
| Briarmaw L7 | 444 | 18 | +9 | 770 | thornwreath 48, briarfang 42 |

**Omens** (stack on elites; the Waking and Grudges add them): emberblooded (hits Burn, resists
ember), thornskinned (reflects 25% of melee damage), twinned (splits in two at half HP; never on
Champions), frenzied (acts twice as often under 25%), ironclad (+2 Guard, grip ×1.5), swift
(+4 speed). Each Omen: +10% HP, +20% XP/gold, +0.5 loot luck.

## 6. Grip & Claim

A holder shows a grip meter per relic: `max = relic grip × (1 + 0.1(L−1))` (×1.5 ironclad).

- **Crush damage** wears grip by 60% of the damage dealt; **disarm skills** add dice
  (Disarm: 2d6 + DEX, Wrench Free: 2d6 + STR, Sunder: 1d8) plus gear `gripDmg`; a Legend Strike
  takes 25% of max; Cairnfall takes 4d6.
- At 0: `disarm` event, the holder loses every move that `requires` the relic (a pending intent
  using it is re-rolled), and a relic-bearer's intent die drops a size (d12 → d8).
- At victory, disarmed relics are **claimed**. A holder killed while still gripping its relic
  **shatters** it: it drops with `shattered: true`, cannot be equipped, and Hilda can reforge it
  (`reforge`, 12 gold × item level). The tutorial vault fight is `gentle`: the Warden's Seal never
  shatters.
- A relic you already own comes back on its holder as an **Echo** (a generated runed/storied
  item of the same kind), still with a grip meter.

## 7. Legend Surge

Per-hero gauge 0-100, kept between battles. +5 per hit, +2 per graze, +20 per Legend Strike,
+8 per kill, +3 per heal cast on an ally, +50 × (damage taken / max HP); gear `surgeGain`
multiplies it (the Warden is Hearthborn: +10%). When full, the `surge` command fires the
highest-rarity equipped item's power (`legend` event with the full ItemInstance) and empties the
gauge. Powers use the skill effect format and never miss: Hearthfall (3d8 ember + Burning to all),
Stillwater (4d8 frost + Frozen), Cairnfall (4d10 crush, 4d6 grip, Stagger), Cleave the Wildwood,
The Rot Remembers, Crown of Briars, Bleeding Thorn, and minor powers on Storied items (Seal of
the Keep, Final Tally, one per aspect for generated Storied gear). A hero with no powered item
fires **Heroic Strike** (an auto-crit weapon blow).

## 8. Heroes and growth

| | HP die | MP | Domain | key stat | notes |
|---|---|---|---|---|---|
| Hearthwarden | d10 | 6 + 2/lvl + 2×CHA | combat | STR 16 | moves come from the starter relic |
| Pip | d8 | 6 + 2/lvl + 2×WIS | survival | DEX 16 | bows; Disarm, Mark Prey, Knife Work, Volley |
| Bryn | d8 | 10 + 3/lvl + 2×INT | knowledge | INT 16 | Analyze, Rootbind, Read the Rings, Heartwood Splinters |
| Sister Alondra | d8 | 10 + 3/lvl + 2×WIS | attunement | WIS 16 | no blades; immune to Frightened; Mend, Radiant Lance, Ward, Revive, Dawnsong |

- **HP:** full hit die + CON at L1; each level rolls the die (never below half, stored in
  `hpRolls`) + CON.
- **Guard:** body armour base + DEX (capped by the armour) or 10 + DEX, + shield, + gear.
- **Proficiency / Imprint Bonus:** +2 at L1, +1 every 4 levels (the sheet's IB table). Domain
  levels rise with hero level (primary = level, secondaries = half), capped at 20.
- **Every 4 levels:** +1 to two ability scores (per hero list). New skills unlock by level.
- **XP to next level = 30 × L^1.55** (levels 1-50):

| level | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 15 | 20 | 30 | 50 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| total XP | 30 | 118 | 283 | 540 | 904 | 1386 | 1998 | 3655 | 10757 | 22908 | 65850 | 246489 |

The Gauntlet is worth about 1,840 XP per hero without grinding (1,066 before Briarmaw, 770 for
Briarmaw): level 1 to 6 at Briarmaw's door, 7 after it, 8 with a little grinding.

## 9. Loot

| rarity | colour | affixes | affix ×| enchant | base drop weight |
|---|---|---|---|---|---|
| worn | #8b8b8b grey | 0 | 1 | 0 | 100 |
| wrought | #f4f1e8 white | 1 | 1 | 0 | 55 |
| tempered | #4cbf56 green | 2 | 1.1 | +1 | 22 |
| runed | #4a8fe7 blue | 3 | 1.2 | +1 | 7 |
| storied | #a35ee8 violet | 3 + name, lore, minor power, unidentified | 1.35 | +2 | 1.5 |
| heirloom | #e8b83a gold | hand-made relics | | | never random |
| regalia | #2fb8a6 teal | set pieces | | | never random |
| primal | #fffaf0 white flame | endgame | | | never random |

Enchant is +hit/+damage on weapons, +Guard on body armour and shields, +3 HP per point elsewhere.
**Luck** bends the curve: weight of rank *i* × (1 + luck)^(0.7 *i*). Luck = tier (rabble 0,
veteran 1, relic-bearer 2, champion 3) + Waking + ½ per Omen + 1 for a Grudge.

| luck | worn | wrought | tempered | runed | storied |
|---|---|---|---|---|---|
| 0 | 54% | 30% | 12% | 4% | 1% |
| 2 | 24% | 28% | 24% | 17% | 8% |
| 4 | 12% | 21% | 26% | 25% | 17% |

- **Rabble:** humanoids drop the exact weapon they carry 35% of the time; otherwise 30% chance of
  random gear (capped at wrought + Waking).
- **Veterans:** always drop a piece they visibly wear (a Regalia piece if they wear one; else a
  random worn piece at its gear-tier rarity, 35% chance one tier higher).
- **Relic-bearers:** their relic if disarmed (else shattered) + 1 random item (min wrought).
- **Champions:** every broken piece + 2 random items (min tempered).
- **Consumables** (so the bag can refill): 6% per rabble, 15% per veteran, 50% per relic-bearer,
  always from a Champion (Hearth Tonic 5 : Frost Draught 2 : Bitterroot 2 : Ember Salts 1).
- **Grudges:** a settled Grudge always adds a bonus item, and all its gear drops are one rarity
  higher, stamped `grudge-settled`.
- **Generated items:** base type by slot (newer bases likelier at higher item level), rarity,
  affixes (≤2 prefixes named for regions, ≤2 suffixes named for Domains, no duplicates within a
  family), value = roll × rarity multiplier + item level × per-level. Names: "Patched Leather
  Jerkin" (worn), "Scorchgate Longsword of the Stalker" (wrought-runed), "Ashwick, the Quiet
  Oath" (storied, with a lore line naming who it was taken from). Every item gets a `seed` for
  its procedural art.

**Thornwatch Regalia** (hood, jerkin, boots, worn by three bandit veterans): 2 pieces regrow 5%
HP per turn; 3 pieces give +2 speed and the party can never be ambushed.

## 10. Game flow (the Gauntlet)

Fourteen nodes from Hearthstone Keep to Briarmaw's den: the Keep hearth, the tutorial vault
(Tallyman thief with the Warden's Seal), two rabble fights, the Milestone Fire (Hearthfire),
the Bramble Toll (Skarn wearing the Thornwatch Hood), the Verdant Edge, the Rot-Stag,
Thornhollow (Hearthfire), the Tallyman camp (Tallyknife + Thornwatch Jerkin), Old Snag, the
Bramble-Deep (Thornwatch Boots), the Last Coals (Hearthfire), Briarmaw.

- **Hearthfire rest:** full HP/MP, the fallen rise, save point set, a new day.
- **After a won fight:** the fallen rise at 1 HP, everyone recovers 20% HP and 25% MP.
- **Party wipe:** wake at the last Hearthfire at full health, keep all gear, lose 10% of gold,
  and learn 25% of the fight's XP anyway (so a loss is never a wall). The strongest elite
  standing becomes a **Grudge**: a title ("Skarn the Party-Breaker", "Skarn the Twice-Fled" after
  two escapes) and +1 Omen (at most 1 extra on a Champion, 2 on others). Fleeing an elite also
  makes a Grudge. Beating it pays one rarity tier higher.
- **Grinding (optional):** `startBattle(game, { patrol: true })` at any node spawns a rabble
  patrol at the strongest rabble level so far (25% ambush chance).
- **Brand and the Waking:** beating Briarmaw earns the Brand of Briars, raises the Waking by 1
  and resets the route (the tutorial is not replayed). Every spawn re-gears each Waking step:
  **+6 levels, +1 gear tier, +1 Omen on elites** (rabble get Omens from Waking 2), and loot luck
  +1. Relics already claimed return as Echoes. This loops forever.

## 11. API cheat-sheet for the UI

```js
// rules/gauntlet.js (game flow)
newGame({ name, starter, seed, base })          // starter: hearthbrand | stillwater-lance | cairnmaul
route(game) / currentNode(game) / canAdvance(game) / advance(game) / rest(game)
startBattle(game, { nodeId?, patrol? }) -> { game, battle }
resolveBattle(game, battle) -> { game, report }  // report: result xp gold drops claimed consumables
                                                 //   levelUps{heroId:[gain]} goldLost grudge grudgeSettled brand wokeAt rounds
spawnsFor(game, nodeId)                          // escalated spawns (Waking, Grudges, Echoes)
// rules/battle.js (contract) + inspect(state, id) for the Analyze panel
// rules/autoplay.js: autoCommand(state, heroId) -> a ready-to-act command ("Auto" button)
// rules/party.js: canUse(hero, item) equip(game, heroId, uid) unequip(game, heroId, slot)
//   compare(hero, item, inventory) bestHeroFor(game, item) reforge(game, uid)
// rules/stats.js: deriveHero(hero, inventory) itemProfile(item) POWERS
// rules/loot.js: generateItem relicItem identifyItem affixText affixQuality
// rules/progression.js: xpToNext xpForLevel levelForXp grantXp levelUp xpTable
```

Events beyond the contract's fields: `turn.time`; `damage.actor/graze/absorbed/hp` (dice carry
an `aspect` when they are aspect dice); `heal.hp/dice/actor`; `status.value`; `intent.name/
target/charging` and `queued:true` for Analyze's pre-rolled intents; `roll.purpose` is `attack`,
`save` (with `ability`) or `flee`; `legend.item` is the full ItemInstance plus `name/text`;
`move.skill/item/move/mp`; `phase.phase` is 1-based (the foe unit's `phase` too, matching the art);
`revive.hp`; `victory` also carries `consumables`. Two extra types: `spawn` {foe, family, from,
name, text} (summons, twins) and `escape` {foe, text} (a foe runs or withers).

## 12. Balance simulation

`node tools/sim.mjs --seeds 200` plays the whole Gauntlet with the scripted policy in
`src/rules/autoplay.js` (heal under 45%, revive the fallen, disarm relic holders before killing
them, Analyze/Mark/Rootbind elites, use relic arts and Surges). After a wipe the sim grinds one
level at the Hearthfire and retries. "wipe 1st" is the chance the first attempt at a node ends
in a party wipe; "hp left" is the party's HP at the end of a won first attempt.

**Targets vs results (200 seeds, starters rotated):**

| target | result |
|---|---|
| rabble fights 2-3 rounds | 2.2-2.7 |
| veteran fights 3-5 rounds | 2.9-4.8 with drops equipped (the Tallyman camp runs 6.2 on starting gear) |
| Rot-Stag / Old Snag 5-8 rounds, 15-25% wipe on starting gear | Rot-Stag 6.9 rounds, 21%; Old Snag 7.8 rounds, 13% |
| ...noticeably less with drops equipped | Rot-Stag 13%, Old Snag 1% (5.6 rounds) |
| Briarmaw 8-14 rounds, 30-40% wipe first try, no grinding | 12.8 rounds, 33% |
| Briarmaw ~10-15% after grinding 1-2 levels | +1 level 11%, +2 levels 3% |
| Gauntlet takes you from level 1 to 6-8 | level 6 at Briarmaw's door, 7.6 at the end |
| hero attacks ~65-70% hit + ~10% graze | 63-66% hit + 6-7% crit, 13-14% graze |
| Waking 1 and 2 harder but winnable | elites and Briarmaw run longer (Briarmaw 18-21 rounds); Briarmaw 28% first-try wipe at Waking 1, 10% at Waking 2; 200/200 runs clear; drops shift to tempered/runed/storied |

Starter check (100 seeds each, drops equipped, no grinding): Briarmaw first-try wipes are 26%
with Hearthbrand (10.7 rounds), 30% with Stillwater Lance (13.0) and 30% with Cairnmaul (13.9).
The verdant Champion is the ember starter's "first gym": fights are shorter, not much safer.

Aethermoor balance sim: 200 seeds, starter mix

### Waking 0, starting gear only, no grinding

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|
| keep-vault | tallyman+cutpurse | 1.0 | 100% | 1.7 | 89% | 0% | 0 | 179 |  |  |
| hearth-road | cutpurse+cutpurse+cutpurse | 1.0 | 100% | 2.7 | 84% | 0% | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 2.0 | 100% | 2.4 | 82% | 0% | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 2.0 | 100% | 3.0 | 82% | 0% | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 3.0 | 100% | 2.4 | 80% | 0% | 0 |  |  |  |
| rotstag-glade | rotstag | 3.0 | 79% | 6.9 | 45% | 21% | 56 | 200 |  |  |
| tally-camp | tallyman+bandit+cutpurse | 4.2 | 90% | 6.2 | 59% | 10% | 23 | 200 |  |  |
| snag-wallow | oldsnag | 5.1 | 87% | 7.8 | 52% | 13% | 27 | 200 |  |  |
| bramble-deep | bandit+briarling+briarling | 5.5 | 93% | 3.8 | 57% | 8% | 15 |  |  |  |
| briarmaw-den | briarmaw | 6.3 | 22% | 12.4 | 39% | 78% | 381 | 398 |  | 1 |

runs cleared 199/200; end level 9.2; grind fights/run 9.2
hero attack rolls: hit 63%, graze 13%, crit 6%, miss 14%, fumble 4%
random/worn-gear drops by rarity: worn 2182, wrought 1235, tempered 269, runed 313, storied 425; named relics dropped (regalia, gentle): 621

### Waking 0, equips drops, no grinding

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|
| keep-vault | tallyman+cutpurse | 1.0 | 100% | 1.7 | 89% | 0% | 0 | 179 |  |  |
| hearth-road | cutpurse+cutpurse+cutpurse | 1.0 | 100% | 2.7 | 78% | 0% | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 2.0 | 100% | 2.3 | 82% | 0% | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 2.0 | 100% | 2.9 | 84% | 0% | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 3.0 | 100% | 2.2 | 82% | 0% | 0 |  |  |  |
| rotstag-glade | rotstag | 3.0 | 88% | 6.5 | 49% | 13% | 30 | 200 |  |  |
| tally-camp | tallyman+bandit+cutpurse | 4.1 | 100% | 4.8 | 68% | 0% | 0 | 198 | 2 |  |
| snag-wallow | oldsnag | 5.0 | 99% | 5.6 | 62% | 1% | 2 | 200 |  |  |
| bramble-deep | bandit+briarling+briarling | 5.2 | 100% | 3.1 | 65% | 0% | 0 |  |  |  |
| briarmaw-den | briarmaw | 6.0 | 68% | 12.8 | 50% | 33% | 107 | 400 |  |  |

runs cleared 200/200; end level 7.6; grind fights/run 1.7
hero attack rolls: hit 64%, graze 13%, crit 7%, miss 13%, fumble 3%
random/worn-gear drops by rarity: worn 1258, wrought 753, tempered 331, runed 264, storied 250, shattered 2; named relics dropped (regalia, gentle): 621

### Waking 0, equips drops, grinds +1 level before Briarmaw

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|
| keep-vault | tallyman+cutpurse | 1.0 | 100% | 1.7 | 89% | 0% | 0 | 179 |  |  |
| hearth-road | cutpurse+cutpurse+cutpurse | 1.0 | 100% | 2.7 | 78% | 0% | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 2.0 | 100% | 2.3 | 82% | 0% | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 2.0 | 100% | 2.9 | 84% | 0% | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 3.0 | 100% | 2.2 | 82% | 0% | 0 |  |  |  |
| rotstag-glade | rotstag | 3.0 | 88% | 6.5 | 49% | 13% | 30 | 200 |  |  |
| tally-camp | tallyman+bandit+cutpurse | 4.1 | 100% | 4.8 | 68% | 0% | 0 | 198 | 2 |  |
| snag-wallow | oldsnag | 5.0 | 99% | 5.6 | 62% | 1% | 2 | 200 |  |  |
| bramble-deep | bandit+briarling+briarling | 5.2 | 100% | 3.1 | 65% | 0% | 0 |  |  |  |
| briarmaw-den | briarmaw | 7.0 | 89% | 11.8 | 60% | 11% | 24 | 400 |  |  |

runs cleared 200/200; end level 8.3; grind fights/run 5.5
hero attack rolls: hit 65%, graze 13%, crit 7%, miss 12%, fumble 4%
random/worn-gear drops by rarity: worn 1675, wrought 981, tempered 380, runed 246, storied 176, shattered 2; named relics dropped (regalia, gentle): 621

### Waking 0, equips drops, grinds +2 levels before Briarmaw

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|
| keep-vault | tallyman+cutpurse | 1.0 | 100% | 1.7 | 89% | 0% | 0 | 179 |  |  |
| hearth-road | cutpurse+cutpurse+cutpurse | 1.0 | 100% | 2.7 | 78% | 0% | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 2.0 | 100% | 2.3 | 82% | 0% | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 2.0 | 100% | 2.9 | 84% | 0% | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 3.0 | 100% | 2.2 | 82% | 0% | 0 |  |  |  |
| rotstag-glade | rotstag | 3.0 | 88% | 6.5 | 49% | 13% | 30 | 200 |  |  |
| tally-camp | tallyman+bandit+cutpurse | 4.1 | 100% | 4.8 | 68% | 0% | 0 | 198 | 2 |  |
| snag-wallow | oldsnag | 5.0 | 99% | 5.6 | 62% | 1% | 2 | 200 |  |  |
| bramble-deep | bandit+briarling+briarling | 5.2 | 100% | 3.1 | 65% | 0% | 0 |  |  |  |
| briarmaw-den | briarmaw | 8.0 | 97% | 10.4 | 65% | 3% | 6 | 400 |  |  |

runs cleared 200/200; end level 9.1; grind fights/run 10.0
hero attack rolls: hit 66%, graze 14%, crit 6%, miss 11%, fumble 4%
random/worn-gear drops by rarity: worn 2222, wrought 1260, tempered 373, runed 257, storied 156, shattered 2; named relics dropped (regalia, gentle): 621

### Waking 1 (continues from grind), equips drops, +1 level before Briarmaw

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|
| hearth-road | cutpurse+cutpurse+cutpurse | 9.1 | 100% | 2.2 | 91% | 0% | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 9.1 | 100% | 2.3 | 85% | 0% | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 9.1 | 100% | 3.6 | 80% | 0% | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 9.1 | 100% | 2.6 | 79% | 0% | 0 |  |  |  |
| rotstag-glade | rotstag | 10.0 | 96% | 8.9 | 64% | 5% | 10 |  |  |  |
| tally-camp | tallyman+bandit+cutpurse | 10.1 | 100% | 5.9 | 69% | 1% | 1 | 1 | 20 |  |
| snag-wallow | oldsnag | 10.9 | 99% | 8.4 | 64% | 2% | 3 |  |  |  |
| bramble-deep | bandit+briarling+briarling | 11.2 | 100% | 4.3 | 68% | 0% | 0 |  |  |  |
| briarmaw-den | briarmaw | 12.2 | 72% | 18.6 | 49% | 28% | 78 |  |  |  |

runs cleared 200/200; end level 13.9; grind fights/run 6.5
hero attack rolls: hit 69%, graze 11%, crit 8%, miss 8%, fumble 3%
random/worn-gear drops by rarity: worn 712, wrought 1210, tempered 1118, runed 600, storied 328, shattered 20; named relics dropped (regalia, gentle): 0

### Waking 2, equips drops, +1 level before Briarmaw

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|
| hearth-road | cutpurse+cutpurse+cutpurse | 13.9 | 100% | 3.5 | 83% | 0% | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 13.9 | 100% | 3.2 | 76% | 0% | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 13.9 | 100% | 4.7 | 73% | 0% | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 14.3 | 100% | 3.4 | 73% | 0% | 0 |  |  |  |
| rotstag-glade | rotstag | 14.6 | 93% | 10.4 | 53% | 8% | 22 |  |  |  |
| tally-camp | tallyman+bandit+cutpurse | 15.0 | 93% | 7.8 | 59% | 7% | 19 | 1 |  |  |
| snag-wallow | oldsnag | 15.7 | 92% | 11.0 | 56% | 9% | 19 |  |  |  |
| bramble-deep | bandit+briarling+briarling | 16.1 | 94% | 5.3 | 64% | 6% | 12 |  |  |  |
| briarmaw-den | briarmaw | 17.7 | 91% | 20.6 | 56% | 10% | 25 |  |  |  |

runs cleared 200/200; end level 18.9; grind fights/run 6.3
hero attack rolls: hit 67%, graze 12%, crit 8%, miss 10%, fumble 3%
random/worn-gear drops by rarity: worn 383, wrought 573, tempered 1162, runed 1203, storied 607; named relics dropped (regalia, gentle): 0

(194.5s)
