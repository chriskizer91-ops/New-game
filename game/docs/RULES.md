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

**M3 foes** (the Verdant Wilds after the Brand; levels are Waking 0, met at Waking 1):
- Rabble: smuggler (humanoid, caltrops and a bolt), boglurcher (tide, resists crush), glowcap
  (spores, Glow ward), rotgrub (blight, Latch bleeds, Ichor Spit poisons).
- Veterans: feral-druid (Barkskin, calls a briarling), hollowed-ranger (Rot-Arrow; under 30% HP it
  says its own name and loses the turn), sapwight (Sap Leech heals what it drains).
- Relic-Bearers: the Gloamwing (Dawnbell: Bell-Hum), Gorrow the Mire-King (Mire Pearl: Undertow),
  and the named humanoid variants (Mags, Haskett, Hollis, Dun, Oda, Corra; Vesper is a veteran),
  whose relic Art is their d12's high faces.
- The Rotwarden (Champion, blight, plate): three phases on a d20 like Briarmaw. Its Ichor Mask
  powers Blacken the Sap, Ichor Rain and Unmaking; its First Seed powers Graft (summons
  sapwights) and Heartroot Bloom. Break a piece and those Arts fall back (Rain and Unmaking
  become Grief). Forewarned (the Fawnrest dream) starts every hero Warded 2d6+4.
- Tamsin (the rival duel; relic-bearer, party level + 5, no Waking): Riposte cuts twice, Cheap
  Shot frightens, Showboat hastes her, Parry guards, and her lent counter-starter's Art is 8-11
  on her d12 (Kindled Cut, Still Point or Cairn Swing). Not Like This heals her once she is low.

**M4 foes** (the Sunscorch Wastes; a player arrives at Waking 2, both Verdant Brands having opened the
Keep's south-east gate):
- **The Sunscorch Waking.** Every Sunscorch spawn that is not rabble climbs **4 levels per Waking**
  (`wakeLevels: 4`, the `SUN` spawns in `data/encounters.js`), not 6: +8 on arrival, +12 once the
  region's first Brand is taken. The party gains about four levels between the two Brands, so the second
  Champion is as fair as the first in either order; at +6 the second half of the region would have needed
  Waking-0 levels below 1. Rabble climb the usual 2, and Omens and gear tiers still come with every Waking.
- Rabble: sand-skink (ember, fast, Sun-Spit Burns, skitters off under half HP), scavenger (humanoid,
  Salvage Net Roots, scarpers). Zone patrols are rabble only, as in M3.
- Veterans: dune-raider (storm; *Sand in the Eyes* is the blinding: DEX save or Frightened, which
  Alondra's Blind Sight shrugs off; Dune Charge Staggers; War-Cry Hastes the pack), glass-scorpion (stone;
  *Glass Sting* pierces and Bleeds; *Carapace* Guards), mirage-wisp (frost; Cold Touch Chills, *Blink*
  evades as Guarding, *Beguile* charms as a WIS save or Rooted), ash-wight (ember undead in old
  Scorchgate kit, weak to radiant; *Cinder Grasp* drains and heals, *Ember Breath* Burns).
- Relic-Bearers: the Sand Wyrm (stone, chitin; *Swallow* charges, then spits you out Staggered and
  Rooted; *Scale-Grind* needs Wyrmscale), and the named holders, each with its Art on the d12's 9-12:
  Rasa (Dune-Step, Sandwalkers), Gnash (Dunefall, Dunebreaker), the Wisp-Queen (Hall of Mirrors, the
  Mirage Glass), the Ash-Captain (the Keyless Turn, the Scorchgate Key), Foreman Brask (Noon Flare, the
  Sunstone Lantern) and Vell Saltglass (Singing Shot, Saltglass). The Glass Matriarch is a Relic-Bearer
  with no relic (Shell Rain, Moult); the Quartermaster is a veteran who Wards the caravan.
- **Kharzul the Glass Scorpion** (Champion, stone, chitin): *The Glass Wakes* (Tail Lash, Glass Sting,
  **Glasscutter**: charging, a cut at every hero that Burns, needs Cinderfang, else Tail Lash); at 66%
  *It Burrows* (Burrow: a charging strike from under the floor for 3d8 that Staggers, after which it lies
  half-buried, Guarding; **Carapace Brace** needs the Glass Carapace: Guarding and Warded); at 33% *Glass
  Storm* (Glass Rain: 2d6 piercing to all, DEX save for half, Bleeding; **Molten Tail** needs Cinderfang,
  else Glass Sting). Cinderfang is held in the tail and the Carapace worn, each with its own grip meter.
- **The Ashen Warden** (Champion, ember undead, plate, weak to radiant): *The Warden Stands* (Ash Blade,
  Ember Sweep, **Ward of Ash** needs the Aegis: it Wards itself against the next blows); at 66% *The Ash
  Rises* (Call the Watch: an ash-wight out of the ash, at most two; **Command of Cinders** needs the Cinder
  Crown: every foe Hasted); at 33% *The Last Watch* (Scorch the Vault: charging, 3d8 ember to all, DEX for
  half, Burning; **the Watch Unbroken** needs the Crown: 1d6 ember to all and the Warden heals).
- **Tamsin at Scorchgate**: the M3 kit (her lent counter-starter's Art on 8-11) at party level + 4, the
  art's kindled gear tier, and the Swift Omen.
- What the engine has no status for is built from the nearest one: blinding is Frightened, a charm is
  Rooted, being swallowed is Staggered and Rooted, burrowing is a charge followed by Guarding, "every foe
  acts twice this round" is Hasted, and "the party's first hit each round is absorbed" is Warded.

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
- A **lent** relic (M3: Tamsin's counter-starter) can be disarmed like any other, but it is never
  claimed and never shatters: it goes home with its owner.
- **M4 Champions** hold two pieces each (Kharzul: Cinderfang 44 and the Glass Carapace 40; the Ashen
  Warden: the Ashen Aegis 30 and the Cinder Crown 28, base grip before the level scaling). A disarm names
  the Arts it ends ("Cinderfang clatters loose! Kharzul loses Glasscutter and Molten Tail."), a charging
  Art whose piece comes loose fizzles (the intent is re-rolled), and a Champion keeps its d20. The
  autoplay pries both pieces loose in every fight it wins (sim: Cinderfang by round 2-3, the Carapace
  by round 5).

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

**M4 relics (Codex Nos. 25-38)** each carry a signature Surge: Sandstride (Sandwalkers: every ally
Hasted, Rooted shaken off), The Hour Turns (the Orrery: every ally Hasted, every foe's next two moves
shown), Wyrm's Shoulder (Wyrmscale: 3d8 crushing, 3d6 grip, Stagger), High Noon (the Sunstone Lantern:
2d6 ember to all foes and Exposed), Mirror-Shell (the Glass Carapace: every ally Warded 2d8, Burning and
Bleeding washed off), Break the Dune (Dunebreaker: 2d10 crushing and 2d6 grip to every foe, Stagger),
**Glasscutter** (Cinderfang, the design brief's No. 031: a weapon attack against every foe, each hit
Burns), A Thousand Mirrors (the Mirage Glass: 2d6 frost to all, WIS save, Frightened), The Cistern
Opens (Qasim's Signet: every ally heals 2d8, Burning washed away), Sunbeat (the Sunstone Heart: every
ally heals 2d8 and Regenerates), The Last Door (the Scorchgate Key: every foe Staggers and is Exposed),
Ward of Ash (the Ashen Aegis: every ally Warded 3d8), Command of Cinders (the Cinder Crown: every ally
Hasted and +15 Surge) and The Glass Sings (Saltglass: an auto-crit shot that Staggers).

**Deeds, sockets and awakening (M4 data; rules in `rules/forge.js` and `rules/codex.js`).** Every relic
names three deeds (`data/deeds.js`), gem `sockets` (0-2: the starters and the Champions' pieces 2, the
Scorchgate Key 0, the rest 1) and two awakened branches: **a, the Hand** (a physical, combat, survival or
beastmastery bearer) and **b, the Heart** (the other Domains). A branch adds its `stats` on top of the
relic's and may lay a new `power` over its Surge (the id becomes `<relic>:<branch>`). The starters,
Cinderfang (Sunmarrow: the fire spreads to every foe, hit or miss / Glassline: +4 speed, +1 to hit and a
Glasscutter at +5) and the Champions' pieces have their own names; the rest read "the Quick Hand", "the
Counting Heart". The relics of the M2 road and the first Brand (Nos. 1-12) wake in Act II: their deeds
come from Untouched (Waking 2+), Fifty Felled, Grudge Settled and Rout, so their Kindled bonus (+1 hit,
+1 Guard or +5 HP) does not soften the Verdant it was tuned without (§12).

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
Hilda's temper (M3) adds +1 enchant per step, up to +3, on any item including relics.
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
- **Worn relics** (M3): a relic a relic-bearer or champion visibly wears drops when it falls, as
  a veteran's does (Tamsin's Vale Gauntlets).
- **Routs** (M3): each routed foe leaves the normal rabble drop roll and consumable chance.
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

## 10. Game flow (M3: the Verdant Wilds)

The M2 road became a walkable land: 14 maps, 10 Hearthfires (4 start cold), visible roaming packs,
and 5 sealed exits toward the regions of Act II. `docs/M3-SPEC.md` is the contract.

- **Hearthfire rest:** full HP/MP, the fallen rise, save point set, a new day, and the fire is
  kindled (fast travel from the Atlas goes to kindled fires only). A cold Hearthfire is a lock
  (Kindle or Lamplight, or Attunement 3).
- **After a won fight:** the fallen rise at 1 HP, everyone recovers 20% HP and 25% MP.
- **Party wipe:** wake on the last Hearthfire's stand at full health, keep all gear, lose 10% of
  gold, and learn 25% of the fight's XP anyway. The strongest elite standing becomes a **Grudge**
  (a title and +1 Omen; at most 1 extra on a Champion, 2 on others). Fleeing an elite also makes a
  Grudge. Beating it pays one rarity tier higher.
- **The duel:** losing to Tamsin is a **yield**: no gold lost, no Grudge, a breather heal where you
  stand, the lesson XP, and the Eldest Tree door opens anyway. She stays for a rematch.
- **Roaming packs:** authored packs and zone patrols walk the maps. They notice you within 5 tiles
  (with line of sight), pause for 2 ticks (the "!"), chase on 2 of every 3 ticks and give up 6
  tiles past their leash. Walking into a pack's back is a **First Strike** (every foe's first turn
  comes 40 later); a pack walking into your back is an **ambush** (the Thornwatch set still
  cancels it). After any fight you get 6 ticks of grace; a pack you fled from is stunned 12 ticks.
- **Rout:** a **weak** pack (all rabble, no relic held or worn, top level at least 3 below the
  party, 2 with the Dawnbell) flees on 4 of every 5 ticks. Walking into one Routs it: full gold,
  half XP, the rabble drop roll, never a Grudge.
- **Locks:** every lock has two keys: a relic's map power (owned and not shattered) or a Domain
  level of the best active hero (a primary Domain equals the hero's level, a secondary one is half,
  rounded up). Darkness and ichor are soft: without a key you see 2 tiles, and ichor burns 4% of
  max HP a step (never below 1). Crownwalls are story seals that fall with Briarmaw.
- **The Waking:** every Brand raises the Waking by 1 and re-arms every non-`once` encounter of its
  region (there is no teleport). Veterans and up gain **+6 levels**, rabble only **+2** (so the
  old roads' rabble start to flee); spawns may override this (`wakeLevels`) or skip it (`noWaking`).
  Each step adds +1 gear tier, +1 Omen on elites (rabble get Omens from Waking 2) and loot luck
  +1. A Brand you already hold is an **Echo rematch**: no Waking, no Brand. Both Verdant Brands
  complete Act I.
- **Temper (Hilda):** +1 to +3, each step +1 enchant; cost `30 x ceil(ilvl/2) x [1, 2, 4][step]` gold.
- **Shops (Marta, Nell):** Hearth Tonic 20, Bitterroot 15, Frost Draught 15, Ember Salts 60 gold.
- **Chests:** contents roll from `chest:<seed>:<id>` at the map level + 6 per Waking, once each.

## 11. API cheat-sheet for the UI

```js
// rules/gauntlet.js (game flow)
newGame({ name, starter, seed, base })          // starter: hearthbrand | stillwater-lance | cairnmaul
startBattle(game, { nodeId } | { patrol: { spawns, where, backdrop, dark } }, { ambush, firstStrike }) -> { game, battle }
resolveBattle(game, battle) -> { game, report }  // report: result xp gold drops claimed consumables levelUps
                                                 //   goldLost grudge grudgeSettled brand rematch yield wokeAt rounds
routPack(game, { nodeId } | { spawns, where }) -> { game, report }
rest(game, hfId) / travel(game, hfId) / spawnsFor(game, encId) / partyLevel(game) / uniqueBrands(game)
// rules/world.js (the overworld; see ARCHITECTURE.md "World")
enterMap move interact tick afterBattle commit present canWalk findPath threat keys lockStatus openLock openChest
// rules/story.js: talkTo dialogueView enterDialogue choose questLog nextObjective claimQuest bounties ladder
//   afterDialogue restDialogue pendingLetter readLetter
// rules/battle.js (contract) + inspect(state, id) for the Analyze panel
// rules/autoplay.js: autoCommand(state, heroId) -> a ready-to-act command ("Auto" button)
// rules/party.js: canUse equip unequip compare bestHeroFor reforge temperCost temper buy
// rules/stats.js: deriveHero(hero, inventory) itemProfile(item) POWERS
// rules/loot.js: generateItem relicItem identifyItem affixText affixQuality routSpoils
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

`node tools/sim.mjs --seeds 200` plays routes of encounters with the scripted policy in
`src/rules/autoplay.js` (heal under 45%, revive the fallen, disarm relic holders before killing
them, Analyze/Mark/Rootbind elites, use relic Arts and Surges), teleporting between fights through
the flow API. After a wipe it rests, grinds one level on rabble patrols and retries (8 tries is
"stuck"). Crossing a zone map costs one fight with a roaming patrol (Routed when weak). A lost duel
is a yield and is not retried. `--modes`, `--seed N` (replay one seed) and `--trace` (every fight)
help when tuning. "wipe 1st" is the chance the first attempt ends in a party wipe; "hp left" is the
party's HP after a won first attempt.

**M3 targets vs results (200 seeds, starters rotated; spec §7, §3.5):** the tables below are the M3 release. Under M4's rules (Kindled
relics) the same modes still meet these targets; their current numbers are in the M4 part at the end.

| target | result |
|---|---|
| `m2`: Waking 0 within ±3 points of the M2 table | identical: Rot-Stag 13%, Old Snag 1%, Briarmaw 33% first-try wipes |
| `direct`: Tamsin first-try party win 55-70% | 58% (42% yield) |
| `direct`: Rotwarden first-try wipe 30-40% | 36% (party level 9.7 at its door: the spec hoped for 10-12; the direct path is short on XP by design) |
| `leads2` (Mosswatch + Bell, Forewarned): Rotwarden ≤ 20% | 2% |
| `looper-w2` (the migrated Waking-2 M2 save): Rotwarden ≤ 45% | 7% |
| each lead's lair taken first at Waking 1: 15-25% | the Lamp Room 22%, the Mire Shrine 27%, the Gloamwing 24%, the Grove Circle 22% |
| zero stuck runs | 0 in every mode |

**What the tuning changed** (levels are Waking 0; every post-Brand fight is met at Waking 1):
- Tamsin: 90 HP (was 34), speed 15, gear tier 3, a two-cut Riposte, party level + 5.
- The Rotwarden: level 4 (11 at Waking 1). The Heartroot sapwight: level 4.
- Hollis's Lamp Room: Hollis 5, a Tallyman 5 and a smuggler 7 (a third foe instead of a higher level,
  so the card reads Hard, not Deadly). The Gloamwing: level 5, 180 HP, atk 6, dmg 4, and the Swift
  Omen. Gorrow 4 with level-5 boglurchers. Oda 4, a feral druid 3, a briarling 6.
- A unique foe never draws the Twinned Omen (a twinned Gorrow with Frenzied was a wipe spiral).

Aethermoor balance sim (M3 release tables): 200 seeds, starter mix

### m2: Waking 0, the M2 road, equips drops (a wipe grinds a level)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| keep-vault | tallyman+cutpurse | 1.0 | 100% | 1.7 | 89% | 0% |  | 0 | 179 |  |  |
| hearth-road | cutpurse+cutpurse+cutpurse | 1.0 | 100% | 2.7 | 78% | 0% |  | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 2.0 | 100% | 2.3 | 82% | 0% |  | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 2.0 | 100% | 2.9 | 84% | 0% |  | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 3.0 | 100% | 2.2 | 82% | 0% |  | 0 |  |  |  |
| rotstag-glade | rotstag | 3.0 | 88% | 6.5 | 49% | 13% |  | 26 | 200 |  |  |
| tally-camp | tallyman+bandit+cutpurse | 4.1 | 100% | 4.8 | 68% | 0% |  | 0 | 197 | 3 |  |
| snag-wallow | oldsnag | 5.0 | 99% | 5.6 | 63% | 2% |  | 3 | 200 |  |  |
| bramble-deep | bandit+briarling+briarling | 5.1 | 100% | 3.2 | 65% | 0% |  | 0 |  |  |  |
| briarmaw-den | briarmaw | 6.0 | 68% | 12.8 | 48% | 33% |  | 122 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 7.7; grind fights/run 2.0
hero attack rolls: hit 65%, graze 13%, crit 7%, miss 13%, fumble 3%
random/worn-gear drops by rarity: worn 1298, wrought 782, tempered 330, runed 258, storied 253, shattered 3; named relics dropped: 621

### direct: the critical path after the Brand (Waking 1)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:thornway | (zone patrol, 3% routed) | 7.7 | 100% | 2.5 | 65% | 1% |  | 1 |  |  |  |
| tamsin-duel | tamsin | 8.0 | 58% | 11.1 | 52% | 0% | 42% | 0 |  |  |  |
| patrol:heartroot | (zone patrol) | 8.8 | 92% | 4.1 | 59% | 8% |  | 33 |  |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 9.0 | 94% | 3.8 | 64% | 6% |  | 12 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 9.4 | 93% | 5.7 | 61% | 7% |  | 14 |  |  |  |
| rotwarden-heart | rotwarden | 9.7 | 64% | 17.4 | 41% | 36% |  | 159 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 11.8; grind fights/run 3.6
hero attack rolls: hit 67%, graze 13%, crit 8%, miss 9%, fumble 4%
random/worn-gear drops by rarity: worn 640, wrought 642, tempered 505, runed 221, storied 269; named relics dropped: 116

### leads2: Mosswatch and Bell leads (Forewarned), then the critical path

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:mossfall | (zone patrol) | 7.7 | 100% | 3.1 | 83% | 0% |  | 0 |  |  |  |
| mw-stair | tallyman+smuggler+smuggler | 8.0 | 100% | 4.0 | 74% | 0% |  | 0 |  |  |  |
| mw-lantern | tallyman+tallyman+smuggler | 8.4 | 78% | 8.4 | 57% | 22% |  | 52 | 200 |  |  |
| patrol:hindwood | (zone patrol, 2% routed) | 9.7 | 100% | 2.6 | 86% | 0% |  | 0 |  |  |  |
| hw-glowcaps | glowcap+glowcap+glowcap | 9.8 | 100% | 2.8 | 91% | 0% |  | 0 |  |  |  |
| gloamwing-hollow | gloamwing | 10.3 | 97% | 14.5 | 63% | 4% |  | 9 | 200 |  |  |
| patrol:thornway | (zone patrol, 100% routed) | 10.7 | 100% | - | NaN% | 0% |  | 0 |  |  |  |
| tamsin-duel | tamsin | 10.7 | 74% | 12.0 | 57% | 0% | 26% | 0 |  |  |  |
| patrol:heartroot | (zone patrol, 25% routed) | 11.5 | 98% | 3.6 | 69% | 2% |  | 7 |  |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 11.6 | 100% | 3.4 | 71% | 1% |  | 1 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 11.7 | 99% | 4.8 | 74% | 1% |  | 2 |  |  |  |
| rotwarden-heart | rotwarden | 12.1 | 98% | 14.2 | 63% | 2% |  | 4 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 13.1; grind fights/run 0.9
hero attack rolls: hit 67%, graze 12%, crit 8%, miss 10%, fumble 3%
random/worn-gear drops by rarity: worn 582, wrought 1234, tempered 805, runed 368, storied 262; named relics dropped: 148

### leads-all: every lead, then the critical path

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:mossfall | (zone patrol, 1% routed) | 8.7 | 100% | 3.0 | 84% | 0% |  | 0 |  |  |  |
| mw-stair | tallyman+smuggler+smuggler | 8.0 | 100% | 4.0 | 74% | 0% |  | 0 |  |  |  |
| mw-lantern | tallyman+tallyman+smuggler | 8.4 | 78% | 8.4 | 57% | 22% |  | 52 | 200 |  |  |
| mf-smugglers | smuggler+smuggler+smuggler | 9.7 | 100% | 2.6 | 88% | 0% |  | 0 |  |  |  |
| mire-shrine | mirelord+boglurcher+boglurcher | 10.2 | 95% | 8.3 | 55% | 6% |  | 18 | 200 |  |  |
| patrol:hindwood | (zone patrol, 7% routed) | 10.7 | 100% | 2.5 | 87% | 0% |  | 0 |  |  |  |
| hw-glowcaps | glowcap+glowcap+glowcap | 10.8 | 100% | 2.6 | 93% | 0% |  | 0 |  |  |  |
| gloamwing-hollow | gloamwing | 11.0 | 100% | 13.6 | 65% | 1% |  | 1 | 200 |  |  |
| patrol:thornway | (zone patrol, 100% routed) | 11.7 | 100% | - | NaN% | 0% |  | 0 |  |  |  |
| grove-circle | feral-druid+feral-druid+briarling | 11.7 | 100% | 12.3 | 81% | 0% |  | 0 | 200 |  |  |
| tamsin-duel | tamsin | 12.4 | 86% | 12.6 | 66% | 0% | 15% | 0 |  |  |  |
| hollowed-patrol | hollowed-ranger+hollowed-ranger+hollowed-ranger | 12.7 | 88% | 11.9 | 70% | 13% |  | 28 | 200 |  |  |
| hr1-tappers | tallyman+smuggler+smuggler | 13.5 | 100% | 7.0 | 83% | 0% |  | 0 | 200 |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 14.2 | 100% | 2.4 | 92% | 0% |  | 0 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 14.3 | 100% | 3.6 | 89% | 0% |  | 0 |  |  |  |
| rotwarden-heart | rotwarden | 14.4 | 100% | 11.7 | 78% | 0% |  | 0 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 15.2; grind fights/run 1.8
hero attack rolls: hit 68%, graze 12%, crit 8%, miss 9%, fumble 3%
random/worn-gear drops by rarity: worn 717, wrought 2381, tempered 1401, runed 607, storied 363; named relics dropped: 171

### looper-w2: the migrated Waking-2 M2 save down the critical path

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:thornway | (zone patrol, 100% routed) | 14.0 | 100% | - | NaN% | 0% |  | 0 |  |  |  |
| tamsin-duel | tamsin | 14.0 | 95% | 13.3 | 57% | 0% | 6% | 0 |  |  |  |
| patrol:heartroot | (zone patrol, 26% routed) | 14.5 | 100% | 3.7 | 71% | 0% |  | 0 |  |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 14.0 | 100% | 3.1 | 73% | 0% |  | 0 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 14.9 | 100% | 5.5 | 71% | 0% |  | 0 |  |  |  |
| rotwarden-heart | rotwarden | 15.0 | 94% | 19.3 | 46% | 7% |  | 36 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 16.2; grind fights/run 0.6
hero attack rolls: hit 63%, graze 13%, crit 11%, miss 11%, fumble 3%
random/worn-gear drops by rarity: worn 180, wrought 274, tempered 408, runed 432, storied 219; named relics dropped: 189

### first-lead: each lead taken first at Waking 1

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:mossfall | (zone patrol) | 7.7 | 100% | 3.1 | 83% | 0% |  | 0 |  |  |  |
| mw-stair | tallyman+smuggler+smuggler | 8.0 | 100% | 4.0 | 74% | 0% |  | 0 |  |  |  |
| mw-lantern | tallyman+tallyman+smuggler | 8.4 | 78% | 8.4 | 57% | 22% |  | 52 | 200 |  |  |
| mf-smugglers | smuggler+smuggler+smuggler | 8.0 | 100% | 2.8 | 84% | 0% |  | 0 |  |  |  |
| mire-shrine | mirelord+boglurcher+boglurcher | 8.4 | 74% | 8.4 | 48% | 27% |  | 87 | 200 |  |  |
| patrol:hindwood | (zone patrol) | 7.7 | 100% | 2.9 | 80% | 0% |  | 0 |  |  |  |
| hw-glowcaps | glowcap+glowcap+glowcap | 8.3 | 100% | 2.8 | 88% | 0% |  | 0 |  |  |  |
| gloamwing-hollow | gloamwing | 8.4 | 76% | 15.6 | 58% | 24% |  | 86 | 200 |  |  |
| patrol:thornway | (zone patrol, 3% routed) | 7.7 | 100% | 2.5 | 65% | 1% |  | 1 |  |  |  |
| grove-circle | feral-druid+feral-druid+briarling | 8.0 | 78% | 15.4 | 64% | 22% |  | 59 | 200 |  |  |

runs cleared 800/800 (stuck 0); end party level 9.6; grind fights/run 1.1
hero attack rolls: hit 63%, graze 13%, crit 7%, miss 13%, fumble 4%
random/worn-gear drops by rarity: worn 769, wrought 1988, tempered 896, runed 280, storied 304; named relics dropped: 0


### M4: the Sunscorch Wastes (Gate 4, M4 spec §8)

`node tools/sim.mjs --seeds 200 --modes sunscorch,sunscorch-forged,sun-first-lead` (add `--leads wyrm,aqueduct`
to run only some leads). Each mode starts from the end state of a `direct` run: the party that has just beaten
the Rotwarden, at Waking 2 with Act I done (party level 11.8 on average).
- `sunscorch`: home to the Eternal Hearth, then `SUN_PATH` in order with one zone patrol per zone map walked
  through and a rest at each Hearthfire passed. After the Brand of Glass (Waking 3) the party walks back up
  the Deep Shaft and the Dust Trail (a patrol each) and rests at the Spire Hearth before the Glass Flats, and
  it climbs back out to the Last Watchfire before the Ashen Warden, as M3's route rests at the Last Green
  Coal before the Rotwarden.
- `sunscorch-forged`: the same party with every hero's weapon tempered to +4 and one gem each (a Dusthaven
  Sunstone in the weapon when it has a socket, else in the first socketed piece they wear: 784 of 800).
- `sun-first-lead`: each lead's lair (`SUN_LEADS`) as the first thing after Sandspire, at Waking 2.

**M4 targets vs results (200 seeds, starters rotated):**

| target | result |
|---|---|
| `sunscorch`: Kharzul first-try wipe 30-40% | 36% (party level 14.5; 18.8 rounds) |
| `sunscorch`: the Ashen Warden first-try wipe 30-40% | 35% (party level 19.5; 19.4 rounds) |
| `sunscorch`: Tamsin at Scorchgate first-try party win 55-70% | 65% (36% yield) |
| `sunscorch-forged`: both Champions <= 20% | Kharzul 18%, the Ashen Warden 13% |
| `sun-first-lead`: each lead's lair taken first 15-25% | the caravan 20%, the Sand Wyrm 19%, Gnash 16%, the Wisp-Queen 18%, the Aqueduct 19% |
| zero stuck runs | 0 in every mode (M3's and M4's) |
| the M3 modes stay on their M3 targets | m2 13% / 1% / 33% (identical to M3); direct Tamsin 65% win, Rotwarden 33%; leads2 1%; looper-w2 8%; first-lead 20% / 28% / 23% / 20% (the Mire Shrine was 27% in M3) |

**What the tuning settled:**
- The Sunscorch's non-rabble spawns climb 4 levels per Waking (§5); Waking-0 levels are 3-7 (Kharzul 6: level
  14 on arrival; the Ashen Warden 7: level 19 after the Brand of Glass). A base level also picks the spawn's
  Omens, so each lair's level was chosen with its Omens in view (Kharzul: Swift and Thornskinned; the Warden
  after the first Brand: Frenzied, Ironclad and Swift; the Aqueduct's scorpions carry no Twinned).
- Champions: Kharzul 200 HP, Guard 19, atk 7, Tail Lash 2d10, Cinderfang grip 44 and the Carapace 40; the
  Ashen Warden 152 HP, Guard 17, atk 8, dmg 5, Ash Blade 2d10 (a shorter, harder-hitting fight: at 22 rounds
  a party whose weapons its aspect halves could not win it even eight levels up). Higher Guard makes the
  forge's +4 to hit count, which is what separates the forged party.
- W3 humanoid packs (gear tier 3, three Omens) proved the heaviest: dune-raiders are 22 HP / atk 3, ash-wights
  18 HP / atk 2 with 1d6 weapons at every gear tier, and Stand Watch left their table.
- The glass scorpions wear no armour type (their defence is Guard 16 and the Carapace): with chitin, a party
  whose weapons were storm or ember and piercing did 0.375x and spiralled into stuck runs at the Aqueduct.
- Tamsin at Scorchgate carries the Swift Omen on top of the spec's spawn line (party + 4): without it the
  party won 90% of the time.
- **Kindled relics and the Verdant.** With every deed reachable at once (a relic Kindles on its first won
  fight), the M3 modes drifted out of their targets (m2 Briarmaw 15%, direct Rotwarden 23%, three first-lead
  lairs at 12-14%). With no deeds at all they reproduce M3 exactly; so the relics of the M2 road and the
  first Brand (Nos. 1-12) take their deeds from Untouched, Fifty Felled, Grudge Settled and Rout, and wake
  in Act II.
- A player who takes Scorchgate first meets the Ashen Warden at Waking 2 (level 15) and Kharzul at Waking 3
  (level 18): the +4 Waking keeps both orders within a couple of levels of the party.

### sunscorch: from the direct run's end (Waking 2), home to the Keep, then SUN_PATH

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:sun-road | (zone patrol) | 11.8 | 100% | 4.1 | 78% | 1% |  | 1 |  |  |  |
| sr-toll | dune-raider+dune-raider+dune-raider | 11.9 | 97% | 9.2 | 68% | 3% |  | 7 | 200 |  |  |
| patrol:dust-trail | (zone patrol) | 12.8 | 100% | 3.6 | 79% | 0% |  | 0 |  |  |  |
| dt-scorpions | glass-scorpion+glass-scorpion | 13.0 | 100% | 5.5 | 78% | 1% |  | 1 |  |  |  |
| patrol:deep-shaft | (zone patrol) | 13.4 | 100% | 4.2 | 81% | 0% |  | 0 |  |  |  |
| ds-crew | tallyman+smuggler+smuggler | 13.6 | 100% | 10.6 | 67% | 1% |  | 2 | 200 |  |  |
| kharzul-heart | kharzul | 14.5 | 65% | 18.8 | 52% | 36% |  | 178 | 400 |  |  |
| patrol:deep-shaft@back | (zone patrol, 2% routed) | 16.4 | 99% | 5.6 | 64% | 2% |  | 3 |  |  |  |
| patrol:dust-trail@back | (zone patrol, 11% routed) | 16.6 | 97% | 4.6 | 64% | 4% |  | 7 |  |  |  |
| patrol:glass-flats | (zone patrol, 4% routed) | 16.8 | 100% | 4.2 | 73% | 0% |  | 0 |  |  |  |
| gf-raiders | dune-raider+dune-raider+dune-raider | 16.9 | 90% | 6.7 | 58% | 10% |  | 21 |  |  |  |
| patrol:scorchgate | (zone patrol, 1% routed) | 17.6 | 99% | 5.4 | 69% | 2% |  | 3 |  |  |  |
| sg-captain | ash-wight+ash-wight+ash-wight | 17.7 | 99% | 9.8 | 68% | 2% |  | 4 | 200 |  |  |
| tamsin-scorchgate | tamsin | 18.6 | 65% | 13.8 | 55% | 0% | 36% | 0 |  |  |  |
| vault-guard | ash-wight+ash-wight+ash-wight | 19.0 | 84% | 7.6 | 65% | 16% |  | 32 |  |  |  |
| ashen-warden | ashen-warden | 19.5 | 66% | 19.4 | 47% | 35% |  | 143 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 21.3; grind fights/run 8.6

hero attack rolls: hit 61%, graze 13%, crit 10%, miss 13%, fumble 3%

random/worn-gear drops by rarity: worn 364, wrought 641, tempered 2116, runed 3104, storied 1474; named relics dropped: 0

party level entering the Sunscorch: 11.8

### sunscorch-forged: the same party with weapons tempered to +4 and one gem each

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:sun-road | (zone patrol) | 11.8 | 100% | 3.0 | 82% | 0% |  | 0 |  |  |  |
| sr-toll | dune-raider+dune-raider+dune-raider | 11.9 | 100% | 7.4 | 69% | 0% |  | 0 | 200 |  |  |
| patrol:dust-trail | (zone patrol) | 12.8 | 100% | 2.7 | 83% | 0% |  | 0 |  |  |  |
| dt-scorpions | glass-scorpion+glass-scorpion | 13.0 | 100% | 4.5 | 80% | 0% |  | 0 |  |  |  |
| patrol:deep-shaft | (zone patrol) | 13.4 | 100% | 3.3 | 84% | 0% |  | 0 |  |  |  |
| ds-crew | tallyman+smuggler+smuggler | 13.6 | 100% | 8.8 | 68% | 0% |  | 0 | 200 |  |  |
| kharzul-heart | kharzul | 14.5 | 83% | 15.1 | 52% | 18% |  | 56 | 400 |  |  |
| patrol:deep-shaft@back | (zone patrol) | 15.8 | 99% | 4.4 | 65% | 2% |  | 3 |  |  |  |
| patrol:dust-trail@back | (zone patrol, 1% routed) | 16.0 | 99% | 3.7 | 65% | 2% |  | 3 |  |  |  |
| patrol:glass-flats | (zone patrol) | 16.2 | 100% | 3.7 | 75% | 0% |  | 0 |  |  |  |
| gf-raiders | dune-raider+dune-raider+dune-raider | 16.4 | 98% | 5.3 | 63% | 2% |  | 4 |  |  |  |
| patrol:scorchgate | (zone patrol) | 17.0 | 100% | 4.6 | 72% | 1% |  | 1 |  |  |  |
| sg-captain | ash-wight+ash-wight+ash-wight | 17.2 | 100% | 9.2 | 68% | 0% |  | 0 | 200 |  |  |
| tamsin-scorchgate | tamsin | 18.0 | 87% | 11.7 | 61% | 0% | 14% | 0 |  |  |  |
| vault-guard | ash-wight+ash-wight+ash-wight | 18.5 | 96% | 6.5 | 67% | 5% |  | 9 |  |  |  |
| ashen-warden | ashen-warden | 19.0 | 88% | 17.0 | 56% | 13% |  | 41 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 20.4; grind fights/run 2.4

hero attack rolls: hit 75%, graze 9%, crit 8%, miss 5%, fumble 3%

random/worn-gear drops by rarity: worn 248, wrought 524, tempered 1627, runed 2625, storied 1294; named relics dropped: 0

party level entering the Sunscorch: 11.8

forged: 800 heroes' weapons at +4; 784 gems set (485 in the weapon)

### sun-first-lead: each Sunscorch lead's lair taken first, right after Sandspire (Waking 2)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:sun-road | (zone patrol) | 11.8 | 100% | 4.1 | 78% | 0% |  | 2 |  |  |  |
| sr-toll | dune-raider+dune-raider+dune-raider | 11.9 | 98% | 9.2 | 68% | 2% |  | 27 | 1000 |  |  |
| patrol:glass-flats | (zone patrol) | 12.8 | 100% | 3.9 | 72% | 0% |  | 2 |  |  |  |
| gf-caravan | tallyman+smuggler+smuggler | 13.0 | 80% | 13.7 | 65% | 20% |  | 52 | 200 |  |  |
| patrol:dust-trail | (zone patrol) | 12.8 | 100% | 3.6 | 78% | 0% |  | 0 |  |  |  |
| wyrm-lair | sand-wyrm | 13.0 | 82% | 14.6 | 55% | 19% |  | 84 | 200 |  |  |
| gnash-camp | dune-raider+dune-raider+dune-raider | 13.0 | 84% | 12.4 | 67% | 16% |  | 38 | 200 |  |  |
| wisp-queen | mirage-wisp+mirage-wisp+mirage-wisp | 13.0 | 82% | 11.6 | 63% | 18% |  | 54 | 200 |  |  |
| dt-aqueduct | glass-scorpion+glass-scorpion+glass-scorpion | 13.0 | 81% | 8.9 | 53% | 19% |  | 79 |  |  |  |

runs cleared 1000/1000 (stuck 0); end party level 14.1; grind fights/run 1.1

hero attack rolls: hit 63%, graze 13%, crit 7%, miss 13%, fumble 4%

random/worn-gear drops by rarity: worn 536, wrought 1056, tempered 4072, runed 2202, storied 806; named relics dropped: 0

party level entering the Sunscorch: 11.8

