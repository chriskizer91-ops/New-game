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
| burrowed (M5) | under the floor: nothing can target it, and area moves pass over it | until its next turn starts |
| swallowed (M5) | out of the line: loses its turns, cannot be targeted, takes 1d6 of the swallower's aspect at the start of each; spat out when the swallower takes a hit of 15% of its max HP, falls or runs, or the turns run out (the last hero standing is caught and spat straight back out). The Roc's is "Carried off", the Abbot's "Held under"; in M6 the Lantern Mother's is "Led away" (a WIS save), the Leviathan's "Swallowed whole" and Hodge's Bridge Troll "In the river" | 2 turns |
| charmed (M5) | its next turn is played for it: a plain attack on a random ally (never itself); a hit from its own side wakes it | until that turn |
| rotting (M6) | 1d6 blight per stack at the start of each turn, and every heal it gets is halved (rounded down: potions, moves and regeneration alike); a cleanse clears it | 3 turns, 3 stacks |
| hexed (M6) | its attack and save d20s roll with disadvantage; advantage cancels it (one die), as in D&D | 2 turns |
| unmade (M7) | the Unsmith's Unmake: the hero's relic powers are struck out of it, so its Legend Surge is only a Heroic Strike | 2 turns |
| hearthlit (M7) | +1 to its attack rolls (the Masterpiece's Kindle, Fenwick's Poker and the Worldforge Heart) | 3 turns |

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
  M5 made the burrow, the swallow and the charm exact (below).

**M5 foes** (the Ironspire Peaks; a player arrives at Waking 4, every earlier Brand held, and meets the Frost
half at Waking 5, after the Brand of Iron):
- **The Ironspire Waking.** Every Ironspire spawn that is not rabble climbs 4 levels per Waking (the `IRON`
  spawns in `data/encounters.js`): +16 on arrival, +20 after the Brand of Iron. Rabble climb the usual 2.
  **At most three Waking Omens** on any Ironspire spawn (`wakeOmenCap: 3`): at Waking 4 and 5 an elite would
  otherwise carry four or five of the six, every foe looked alike, and a frost wraith came out Emberblooded
  (resisting the ember it is weak to). Champions and the named lair holders carry **chosen Omens** instead
  (`omens`, `wakeOmenCap: 0`), because a base level also picks a spawn's Omens and a one-level change swung a
  lair by 20 points.
- Rabble: rime-wolf (frost; Rime Bite Chills, Lunge charges, Circle Hastes it), brigand (Stormwatch deserters,
  humanoid; Hack, Crossbow, Desert runs), rockling (stone construct, weak to crush; Roll In Staggers, Hunker
  Guards), forge-spark (ember construct; Singe Burns, Flare hits every hero, Gutter goes out: the Deeps'
  patrols and the Bellows' sparks), and the sawyer (a smuggler with one end of an ice saw).
- Veterans: iron-sentinel (stone construct, plate; Gate Slam charges and Staggers, Lock Shields Guards the
  line), forgeborn (ember construct; Molten Fist Burns, Slag Spit, Stoke Hastes it; the Bellows blows sparks),
  peak-troll (stone beast; Pummel hits twice, Hurl Boulder charges and Staggers, Regrow Regenerates),
  rime-wraith (frost undead; Drowned Grasp Chills, Dirge frightens (WIS), Pull Under charges; a choir-wraith's
  Note Chills the line), and the East Road's deserter sergeant.
- Relic-Bearers: the Thunder-Roc (storm beast; **Carry Off** charges and carries a hero off the crag,
  `swallowed` as "Carried off"; **Storm Mantle** needs the Roc-Feather Cloak), and the named holders, each
  with its Art on the d12's high faces: Rhune the Pass-Warden (Gale Step, the Windstep Boots; Toll Chain
  Staggers), the Sentinel-Captain (Ironwall and Shield Rush, Ironwall), Old Horn (Mantle of Trolls, the
  Trollhide Mantle; Horn Toss), Harrow's Journeyman (Rune-Fire, Harrow's Runestaff; White Heat charges; Temper
  the Kin Wards his forgeborn), the Drowned Abbess (Censer Swing, the Drowned Censer; Last Rites heals her
  choir) and the Cutter-Chief (Split the Ice, the Cutter's Pick). The Bellows (a forgeborn veteran) blows
  forge-sparks out of its bellows.
- **Mother Anvil** (Champion, ember construct, plate, crush-resistant, weak to frost; a foe named weak to an
  aspect is weak to it even where the wheel would halve it, so frost is ×1.5 on her and crush ×0.625):
  *The Anvil Wakes* (Hammerfall 2d10 crushing; Sparks, 1d6 ember to every hero and Burning; **Temper** needs
  the Anvil Heart: Guarding and Warded); at 66% *Quench* (Steam Burst, 2d6 ember to every hero, DEX for half;
  **Anvil Strike** needs the Worldforge Hammer: 3d8 crushing and Staggered; Bellows calls a forgeborn, at most
  two); at 33% *The Last Strike* (**Heart Flare** needs the Heart: 3d6 ember to every hero and Burning;
  **Worldforge Blow** needs the Hammer: charging, 4d10 crushing on one hero). 170 HP, Guard 18, atk 9, dmg 6,
  speed 10; Thornskinned, Frenzied and Ironclad.
- **The Rime-Abbot** (Champion, frost undead; ember beats frost on the wheel): *Vespers* (Crozier Strike, 2d8
  frost and Chilled; Toll, every hero WIS or Frightened; **Rime Ward** needs the Rime Crozier: Warded); at 66%
  *Compline* (**Drown**: charging, 1d8 frost and the hero is held under the ice, `swallowed` as "Held under",
  for up to two turns; Call the Choir: a choir-wraith, at most two; **Hushing** needs the Hushweave Cowl: WIS
  or `charmed`, else Toll); at 33% *Hush* (on the d20: Crozier Strike 1-8; Heartbeat 9-14, he heals 2d8 and
  every hero is Chilled; Rime Nova 15-20, 3d8 frost to every hero, DEX for half, Chilled). 160 HP, Guard 21, atk 8,
  dmg 7, speed 8 with the Swift Omen (so 12) and Frenzied.
- **Tamsin at Ironhold** (`variant: '$rival:ironhold'`): her Ironhold kit (`data/rivals.js`) on the d12:
  Riposte 1-3, Iron Grip 4 (2d8 crushing, Staggered), Cheap Shot 5, Hunter's Mark 6 (Marked), Bracer Block 7
  (Guarding and Warded 1d8), her lent counter-starter's Art 8-11, Not Like This 12. Party level + 4, gear
  tier 4, and the Swift, Ironclad and Thornskinned Omens; she wears the Ironvein Bracers, which drop when you
  win.
- **M4's stand-ins are exact now** (the three statuses in §4): Kharzul's Burrow goes under the floor
  (`burrowed`) and forces its next intent (`then`) to **Erupt**, a charging 4d10 piercing strike that
  Staggers and Bleeds (two stacks), after which it Guards; the Sand Wyrm's Swallow is `swallowed`; the
  mirage-wisps' and the Wisp-Queen's Beguile is `charmed` (WIS save). With M4's 3d8 the exact Burrow round was
  a free round for the party (nothing to hit, so it braced and healed) and Kharzul fell to 27% wipes: the
  Erupt's 4d10 and its riders put him back at 32%.

**M6 foes** (the Gloomfen Marsh; a player arrives at Waking 6, every earlier Brand held, and meets the Deep half past the
long boardwalk at Waking 7, after the Brand of Lanterns):
- **The Gloomfen Waking.** Every Gloomfen spawn that is not rabble climbs 4 levels per Waking (the `GLOOM` spawns in
  `data/encounters.js`): +24 on arrival, +28 after the Brand of Lanterns. Rabble climb the usual 2. At most three Waking
  Omens on any Gloomfen spawn; the Champions and the named lair holders carry chosen Omens, never Twinned (M5's rule).
  Hodge and Tamsin are levelled on the party instead (`level: 'party'`, `noWaking`).
- **Two statuses** (§4): *rotting* (the bog-hags' Rot, the drowned's Black Water, the Lantern Mother's Mourning) and
  *hexed* (the bog-hags' Hex, Mother Grue's Evil Eye, the drowned choir's Hymn, the Cantor's Downbeat, the Lantern
  Mother's Hush Now).
- Rabble: mire-leech (blight; Latch On Bleeds, Drink hurts you and heals it, Sink: it lets go and sinks away when hurt),
  marsh-light (radiant spirit; Cold Fire; **Lure**: WIS save or Charmed; Flicker: Guarding), lamp-moth (radiant; Batter;
  Dust in the Eyes: DEX save or Frightened; Circle the Light: Hasted), blackwater-gar (tide; Bite; Leap: charging, and
  you Stagger; Dive: Guarding), and the Tallymen's reed-cutters, salvage divers (Grapnel: Exposed) and bargehands
  (Punt-Pole: Staggered).
- Veterans: bog-hag (humanoid, blight; Ladle; **Hex**: WIS or Hexed; **Rot**: 2d6 blight, CON for half, and a failed save
  Rots; Stir the Pot heals her worst-hurt friend), willow-wight (verdant plant; Lash Roots; Bough-Fall charges and
  Staggers; Weep Regenerates), the drowned (tide undead; Cold Hands; **Drag Down** Roots and Chills; Toll: WIS or
  Frightened; **Black Water**: CON or Rotting), with the bell-ringers (Peal: 1d4 tide to every hero, CON or Staggered)
  and the choir (the Hymn: every hero WIS or Hexed).
- Relic-Bearers, each with its Art on the d12's 9-12: Old Jaws (The Tooth, the Gar's Tooth; Death Roll charges and
  Roots), Mother Grue (The Evil Eye, the Hag-Stone), Grandfather Willow (Weeping Volley, the Weeping Bow), the Drowned
  Cantor (Downbeat, the Cantor's Staff; Beat Time hastes his choir), the Salvage-Master (The Diving Bell, the Salvager's
  Helm), the Bargemaster (Haul Away, the Barge-Chain Gauntlets).
- **Hodge** (relic-bearer, humanoid, unique; party level + 6, gear tier 3, Frenzied, Swift and Ironclad; 72 HP, Guard 19,
  atk 6, dmg 4): his family's `opener` is **Toll Is Due**, so it is always his first move: the strongest hero (the
  highest level, then the most max HP, past a Challenge) makes a CHA save against DC 20 or its next turn comes a whole
  turn later. Then Old Man's Cane (2d10 crushing, Staggered), **Bridge Troll** (charging: one hero is shoved off the
  bridge, `swallowed` as "In the river") and **Clipped Coin** (needs the Unfair Toll: two blows; it is always heads). He
  never flees; at 0 HP he sits down on his stool and says so (his `koText` rides on the `ko` event). Fought once, from his
  toll dialogue; losing is an ordinary loss.
- **The Lantern Mother** (Champion, radiant undead, weak to tide; 215 HP, Guard 19, atk 9, dmg 7, speed 11; Frenzied,
  Swift and Ironclad): *Lamplight* (Lamp-Pole 2d10 crushing; Lantern Flare, 3d8 radiant to every hero, DEX for half;
  **Lure** needs the Lamplighter's Lantern: WIS or Charmed; Hush Now: every hero WIS or Hexed); at 66% *The Children's
  Road* (**Lead Them Down**: charging, WIS or led under the water, `swallowed` as "Led away" for up to two turns;
  Moths: a lamp-moth four levels down, at most two; **Mourning** needs the Mourning Veil: every hero Frightened and
  Rotting); at 33% *Lights Out* (Snuff: every hero Exposed; **Lantern Nova** needs the Lantern: 3d8 radiant to every hero
  and Burning; Drown the Light: charging, 4d10 tide). Snapped off, a piece's moves become the Lamp-Pole.
- **The Blackwater Leviathan** (Champion, tide beast, hide; storm beats tide on the wheel; 160 HP, Guard 22, atk 8, dmg 6,
  speed 7 with Swift, and Frenzied): *The Wake* (Coil, 2d10 crushing and Rooted; Tail Slap, 2d6 tide to every hero, DEX
  for half; **Sound**: it dives, `burrowed`, and its next intent is forced to **Breach**: charging, 4d10 tide under one
  hero, Staggered); at 66% *The Deep* (**Swallow**: charging, `swallowed` as "Swallowed whole"; Undertow: 1d6 tide to
  every hero, STR or Rooted and Chilled; **Harpoon Rage** needs Corvus's Harpoon: two Coils in one turn); at 33%
  *Blackwater* (**Pearl-Light** needs the Deep-Pearl: it heals 2d8 and is Warded, else a Tail Slap; Flood, 3d8 tide to
  every hero, DEX for half; Swallow).
- **Tamsin at Rotbridge** (`variant: '$rival:rotbridge'`): her Rotbridge kit (`data/rivals.js`, the same for each starter)
  on the d12: Riposte 1-3, Fen-Step 4 (2d10 slashing, and the Bogstriders Haste her), Cheap Shot 5, Mire-Footing 6 (DEX or
  Rooted), All In 7 (charging, 4d10 slashing, then she is Exposed), her lent counter-starter's Art 8-11, Not Like This 12.
  Party level + 4, gear tier 4, and the Swift, Ironclad and Thornskinned Omens; she wears the Bogstriders, which drop
  when you win (and which she leaves behind when she goes, after a yield).

**M7 tiers, the guest and the Stolen Arts** (M7 spec §4.2-§4.4; P1's rules in `rules/ai.js`, `battle.js`, `combat.js`,
`foe.js` and `codex.js`):
- **hollow** (the Hollow Council): a d20 that adds **+4** to the natural roll while the family's `bonusWhile` relic (the
  gift sent to their chair) is still held; the face is `min(20, d20 + 4)` and the intent carries `natural` and `bonus`
  ("d20 +4"). Pried loose, the gift takes the +4 with it, from the rolls already made too: her readied intent (a gift
  Art is rolled again) and any Analyze foresaw drop back to their natural roll and read the table again
  (`rules/ai.js dropBonus`). The die itself never steps down.
- **unsmith** (the Unsmith): **two d20s**. He shows two intents (`slot` 0 and 1) at the end of his turn and makes both
  moves on his next, in that order; a Stagger breaks the next of the two still coming. He never steps down.
- Both read the Champion's rows in every table keyed by tier (XP, gold, loot, flee, spoils, Grudges, the Champion Felled
  deed, the save DC): `FOE_TIERS[tier].as`.
- **The guest** (`allies` on an encounter): a unit on the heroes' side (`side: 'ally'`, `guest: true`), built like a foe
  and played by the engine (`foeTurn` plays her turn too). She takes no command and earns no XP; the heroes' heals and
  revives reach her and the foes aim at her like any hero; she is not in the party, and the fight is lost when every hero
  is down, whether or not she stands.
- **Stolen Arts**: a phase with `steals` takes up the relics the Warden never claimed (Pages I-IV, the highest Codex
  number first, at most six: `rules/codex.js stolenFor`, decided by the game, so the card, the fight and the sim agree).
  Each is one move, "Stolen: <name>" (a weapon an attack of its aspect, armour a ward, a radiant or verdant ring or amulet
  a heal, any other a Hex), and +1 Guard. A table row whose move is `'stolen'` plays one of them, picked by the face; a
  Warden who left him none gets the family's `stolenFallback`.

**M7 foes** (the Hearth Below; a party arrives at Waking 8 with every Brand held, at about level 36.5):
- **The Hearth Below's Waking.** Every spawn that is not rabble climbs 4 levels per Waking (the `BELOW` spawns): +32. Rabble
  climb the usual 2 (+16). At most three Waking Omens; the five uniques carry chosen Omens, Frenzied among them (so a Grudge
  cannot add it), never Twinned.
- The road: **cinder-thralls** (rabble, ember constructs, 17 HP: Cinder Fist burns; Ash in the Eyes, DEX or Frightened;
  Reform, hurt, Regenerates) and their **Thrall-Overseer** at the Ash Stair's narrows (a veteran: Hot Chain burns; Drive
  Them hastes every thrall); **the Unmade** (veteran blight undead, 28 HP: Empty Grip; Phantom Art, 2d6 blight, CON for
  half; Grey Touch Rots; Husk Guards); the **Forge-Warden** at the Worldforge's bridge (veteran ember construct in plate,
  40 HP, Guard 17: Hammer Arm; Bellows Breath, 1d8 ember to every hero, CON for half; Hold the Bridge, charging, 2d10 and
  Staggered; Stoke: Hasted and Warded). All at level 38 at Waking 8.
- **The Hollow Council** (tier hollow; level 38 at Waking 8; fought back to back in the Hollow Hall): each wears the gift
  sent to their chair (a breakable piece: Nos. 67-70) and its Arts need it and sit on the d20's 15-20, so a natural 11 or
  better reaches them while the +4 holds. Two phases each (at 1 and 0.5); the second answers their story.
  - **Hollow Miravel** (verdant; 150 HP, Guard 19, atk 10, dmg 7; Frenzied, Thornskinned): *The Elder* (Rowan Staff;
    Unheeded Advice, WIS or Hexed; Grey Bark wards her; **Hollow Bloom**, the Wreath's: 2d8 piercing (verdant) to every hero, STR for
    half, Rooted), *Every Tree That Fell* (Thornwall: every hero Bleeds; Every Fallen Tree, charging 3d8 and two Bleeds;
    **Hollow Harvest**, the Wreath's: 2d6 to every hero and she Regenerates).
  - **Hollow Qasim** (ember; 125 HP, Guard 19, atk 8, dmg 6, speed 11; Frenzied, Swift): *The Cistern Lord* (Scimitar;
    Sand in the Eyes; What You Owe, a CHA save at DC 20 or a turn lost counting it; **Hollow Draught**, the Chalice's: he
    heals 3d8 and is Hasted), *The Drought* (Drought: 2d8 ember to every hero, CON for half, Burning; Mirage, WIS or
    Charmed; **Drink Them Dry**, the Chalice's: 2d6 ember to every hero, and he heals 2d8).
  - **Hollow Brundar** (stone; 110 HP, Guard 18, atk 8, dmg 6, speed 8, mail; Frenzied, Ironclad): *The Thane* (Thane's
    Axe; Debts Paid Staggers; Sentinel's Stance, Guarding and Warded; **Iron Grip**, the Gauntlet's: 3d8 and Rooted),
    *Iron* (Seal the Deeps: 2d6 to every hero, STR for half, Staggered; **Ironfall**, the Gauntlet's: charging, 4d10).
  - **Hollow Gretch** (blight; 140 HP, Guard 19, atk 8, dmg 6; Frenzied, Swift): *The Mayor* (Gavel; The Mayor's Word,
    every hero WIS or Frightened; Counted Twice Marks; **Too Tight**, the Chain's: 2d8 blight and Rotting), *Fear and
    Favours* (Call In a Favour: a mire leech four levels down, at most two; Fear: every hero WIS or Frightened and WIS or
    Hexed; **Every Favour Owed**, the Chain's: 3d8 blight to every hero, WIS for half, Frightened).
  - Each says their own words at 0 HP (`koText`) and has Grudge titles of their own (Miravel the Unheeded, Qasim the
    Unquenched, Brundar the Unforgiving, Gretch the Owed, and so on).
- **The Unsmith** (tier unsmith; Harrow Ironvein; level 41 at Waking 8; 190 HP, Guard 19, atk 9, dmg 6, speed 9; Frenzied
  and Ironclad; his moves add a die every 5 levels, not every 3, as he makes two a turn): *The Smith* (Hammer Blow, 2d10
  and 1d8 more; Ring the Anvil, 1d8 to every hero, CON for half, Staggered; **Forge-Apron**, the Apron's: Guarding and
  Warded; **Unmake**, the Hammer's: 2d8 and Unmade), at 66% *The Thief* (`steals`: his Stolen Arts on 7-14; Unmake; Ring
  the Anvil; his fallback **Nothing Left** leaves him Exposed), at 33% *The Worldforge* (**Worldfire**: 3d8 ember to every
  hero, DEX for half, Burning; **The Heart's Pull**, the Heart's: charging, a hero held "In the furnace" for two turns;
  **Heart Flare**, the Heart's: 2d6 ember to every hero and he heals 2d8). His pieces: Nos. 72-74.
- **Tamsin beside the party** (the Unsmith's guest, `variant: '$rival:finale'`, party level + 2, gear tier 5, wearing her
  Bargain): her finale kit (`data/rivals.js`, the same for each starter but her Art) on the d12: the Bargain's Edge 1-3,
  **Pry It Loose** 4-5 (a crushing blow and 4d6 grip damage to one of his pieces), Inside His Swing 6-7 (a Stagger: the
  next of his moves comes to nothing), her Art 8-10 (the Bargain swung the way she swung the starter she sold: Black
  Kindling burns, Black Stillness Chills, Black Weight charges and Staggers), On Your Feet 11 (a ward over the worst hurt of
  the party), Not This Time 12 (her last stand). Her blows land at half weight (`mult: 0.5`) and add a die every 12 levels:
  she fights like one more strong hero: a third of the damage in the sim (the heroes 61%, ticks 7%).

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
- **M5 Champions** hold two pieces each (base grip before the level scaling): Mother Anvil the Worldforge Hammer
  44 (held) and the Anvil Heart 36 (worn), the Rime-Abbot the Rime Crozier 44 (held) and the Hushweave Cowl 30
  (worn). Snapping a piece off shuts its moves down: without the Heart Mother Anvil cannot Temper and her Heart
  Flare is Sparks; without the Hammer, Anvil Strike and Worldforge Blow are Hammerfall; without the Crozier the
  Abbot's Rime Ward is a Crozier Strike, and without the Cowl his Hushing is a Toll. Mother Anvil is Ironclad,
  so her grips are half again as strong. The M5 holders' relics: the Windstep Boots 26, Ironwall 30, the
  Drowned Censer 28, the Roc-Feather Cloak 30, the Trollhide Mantle 32, Harrow's Runestaff 28, the Cutter's
  Pick 28.

- **M6 Champions** hold two pieces each (base grip before the level scaling): the Lantern Mother the Lamplighter's
  Lantern 44 (held) and the Mourning Veil 30 (worn), the Leviathan Corvus's Harpoon 44 (lodged in its side) and the
  Deep-Pearl 34 (in its brow). Without the Lantern her Lure and Lantern Nova are a Lamp-Pole, without the Veil her
  Mourning; without the Harpoon the Leviathan's Harpoon Rage is a Coil, without the Pearl its Pearl-Light a Tail Slap.
  The Lantern Mother is Ironclad, so her grips are half again as strong. The M6 holders' relics: the Unfair Toll 30
  (Hodge is Ironclad too), the Weeping Bow 30, the Hag-Stone 28, the Salvager's Helm 30, the Cantor's Staff 30, the Gar's
  Tooth 28, the Barge-Chain Gauntlets 32.
- **Hodge's toll comes loose only by grip** (M6 spec §3.2, §3.5): `FOES.hodge.keepsRelics`. Pried loose, the Unfair Toll
  is claimed as any held relic; beaten with it still in his hand, he keeps it (he never dies: he sits down on his stool).
- **M7: the Hollow Council's gifts and the Unsmith's pieces** come off as a Champion's pieces do (not `keepsRelics`): pried
  loose, claimed whole; still gripped when the wearer falls, shattered (Hilda reforges it, and then it counts). Base grip:
  the Hollow Wreath 64, the Hollow Chalice 64, the Hollow Gauntlet 56 (Brundar is Ironclad, so half again as strong), the
  Hollow Chain 64; the Unmaking Hammer 44, the Ironvein Apron 40, the Worldforge Heart 72 (the Unsmith is Ironclad). A
  gift pried loose takes the hollow tier's +4 with it, and its Arts fall back to plain moves; so does each of the
  Unsmith's pieces (without the Hammer, Unmake is a Hammer Blow; without the Apron, Forge-Apron; without the Heart, the
  Heart's Pull and Heart Flare). A Legend Strike still jars 25% of a piece's grip loose whatever its size, so the autoplay
  pries a gift by round 4-5 (the +4 is on a fifth of a member's intents) and the Unsmith's three by rounds 4.5, 8.6 and
  14.6 of 38 (the Heart usually before his last phase). Tamsin's Pry It Loose adds 4d6 grip damage and a crushing blow. Her Bargain is only worn: nothing of hers is ever
  loot.

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

**M5 relics (Codex Nos. 39-52)** each carry a signature Surge: Windstride (the Windstep Boots: every ally
Hasted and Warded 2d6), The Bell Tolls (the Veilbell: every ally heals 2d6 and shakes off Frightened, Chilled
and Charmed), Hold the Stair (Ironwall: every ally Guarding and Warded 2d8), Requiem (the Drowned Censer: 2d8
frost to every foe and two stacks of Chilled), Vein of Iron (the Ironvein Bracers: 4d6 grip damage and a
weapon strike that Staggers), Thunder-Stoop (the Roc-Feather Cloak: 4d8 storm on one foe, and it Staggers),
Rune-Ward (the Thane's Rune-Key: every ally Warded 3d6 and one harmful status shed), Troll Blood (the
Trollhide Mantle: every ally heals 2d6 and Regenerates 1d8), Harrow's Rune (Harrow's Runestaff: 4d6 grip
damage, 3d8 ember and Exposed), **Heart of the Forge** (the Anvil Heart: every ally heals 2d8, is Hasted and
thaws), **Worldfall** (the Worldforge Hammer: 3d10 crushing and 2d6 grip damage to every foe, and they
Stagger), Split the Lake (the Cutter's Pick: a weapon strike against every foe, each hit two stacks of
Chilled), **The Last Office** (the Rime Crozier: every ally heals 3d8 and is Warded 2d6) and **Hush** (the
Hushweave Cowl: every foe Staggers, losing a charging move, and is Frightened). Each has three deeds, one
socket (the four Champions' pieces two) and two awakened branches; the Champions' pieces have their own
names (the Anvil Heart: The Forge-Heart / The Banked Fire; the Worldforge Hammer: The Worldbreaker / The
Maker's Hammer; the Rime Crozier: The Bell-Clapper / The Abbot's Light; the Hushweave Cowl: The Silent Step /
The Listener's Hood), the rest read "the Gale-Footed Hand", "the Wandering Heart".

**M6 relics (Codex Nos. 53-66)** each carry a signature Surge: **Heads I Win** (Hodge's Unfair Toll: every foe stops to pay
the toll, and its next turn comes a whole turn later, with no save: a clipped coin always comes up Hodge), Fen-Footed (the
Bogstriders: every ally Hasted and free of Rooted and Chilled), Willow Rain (the Weeping Bow: a shot at every foe, each hit
Roots), The Wards Hold (the Willow-Ward: every ally Warded 3d6 and free of Hexed and Charmed), Through the Hole (the
Hag-Stone: every foe Exposed and Hexed), **Every Lamp Lit** (the Lamplighter's Lantern: every ally Warded 3d8 and free of
Frightened, Hexed and Charmed), **Veil of Tears** (the Mourning Veil: every foe Frightened and two stacks of Rotting), Air
for Everyone (the Salvager's Helm: every ally Warded 2d8 and free of Rooted, Chilled and Frozen), The Downbeat (the
Cantor's Staff: every foe Staggers and is Hexed), Snap (the Gar's Tooth: an auto-crit strike and three stacks of
Bleeding), Haul Away (the Barge-Chain Gauntlets: 3d6 grip damage to every foe, and Rooted), **Harpoon and Line** (Corvus's
Harpoon: 4d10 piercing, 3d6 grip damage, Rooted) and **Pearl-Glow** (the Deep-Pearl: every ally heals 3d8 and Regenerates
1d8), and Undo the Knot (Nettie's Hexbane Shawl: every ally sheds up to three harmful statuses and heals 2d6). The
Champions' pieces are hand-named (the Lamplighter's Lantern: The Lamp-Bearer / The Window-Lamp; the Mourning Veil: The
Widow's Step / The Last Lament; Corvus's Harpoon: The Leviathan-Hook / The Diver's Line; the Deep-Pearl: The Deep-Eye /
The Drowned Moon), with two sockets.

**M7 relics (Codex Page V: No. 000 and Nos. 67-74)**, the last and best, each carry a signature Surge: **Stir the Coals**
(Fenwick's Poker, primal: every ally heals 3d8 and is Hearthlit), **Hollow Thorns** (the Hollow Wreath: 3d8 piercing to
every foe, and Rooted), **The Given Cup** (the Hollow Chalice: every ally heals 3d8 and gets back 6 MP), **Let Go** (the
Hollow Gauntlet: 2d10 crushing and 4d6 grip damage to every foe, and they Stagger), **Called In** (the Hollow Chain: every
foe Frightened and Hexed), **Bought Dear** (Tamsin's Bargain: an auto-crit strike, and the foe is Exposed and Hexed),
**Unmake** (the Unmaking Hammer: 5d10 crushing, 4d6 grip damage, Staggered), **Nothing Burns Through** (the Ironvein Apron:
every ally Warded 3d8 and free of Burning) and **Heart of the World** (the Worldforge Heart, primal: every ally heals 4d8,
Regenerates 1d8 and is Hearthlit). Every one has two sockets and hand-named branches (Fenwick's Poker: The Night Watch /
The Banked Hearth; the Wreath: The Thorn-Crown / The Greening; the Chalice: The Raider's Cup / The Open Cistern; the
Gauntlet: The Closed Fist / The Open Hand; the Chain: The Mayor's Word / The Loosened Chain; the Bargain: The Better Warden
/ The Bargain Kept; the Hammer: The Unmaker / The Remaker; the Apron: The Smith's Stance / The Twin's Apron; the Heart: The
Beating Heart / The Hearth Itself). None asks for the Branded deed, and the four won at or after the finale (the Bargain
and the Unsmith's three) ask only for deeds the world still offers when every road fight is done (First Blood, Untouched,
Rout, Fifty Felled, Surge, Legend Strike). Page V's reward, **the Hearthkeeper's Oath**: +1 to every save and 5% resist to
every aspect for every hero. The Warden's **Masterpiece** (Hilda's, `rules/forge.js`) is a primal weapon whose Surge is
**Kindle**: every hero Hearthlit (+1 to hit) and Warded for 20.

**Toll Is Due** (M6 spec §4.4; `rules/battle.js`): while a standing hero wears Hodge's Unfair Toll, the strongest foe (the
highest level, then the most max HP) makes a CHA save against DC 13 at the start of every fight, or its first turn comes two
First Strikes (80) later. A family with no CHA save rolls a bare d20 (so about 40% save). Hodge's own move of the same
name does it to your strongest hero instead (DC 20, a whole turn).

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
- **Consumables** (so the bag can refill): 6% per rabble, 15% per veteran, 50% per relic-bearer,
  always from a Champion (Hearth Tonic 5 : Frost Draught 2 : Bitterroot 2 : Ember Salts 1).
- **Grudges:** a settled Grudge always adds a bonus item, and all its gear drops are one rarity
  higher, stamped `grudge-settled`.
- **Forge spoils** (M4, and the Ironspire in M5): a won Sunscorch or Ironspire fight pays materials by the
  tier of each foe beaten (veteran 1 scrap, relic-bearer 1 silver, Champion 2 silver and 2 embers; a
  Twinned foe's twin pays nothing). Scorchgate's fights pay Ash Garnets (the Captain's and the Vault Guard's
  1, the Ashen Warden 2) and Frostmere's pay **Frost Opals** (`TUNING.forge.opals`: the Drowned 1, the Drowned
  Shrine 1, the Choir 1, the Rime-Abbot 2); three Frostmere chests, Rook's Ledger and Durra's armoury in
  Ironhold have them too.
- **Gloomfen spoils** (M6): a won Gloomfen fight pays the same materials by tier, and the bogs' fights pay **Bog Amber**
  (`TUNING.forge.ambers`: the hags' pot 1, Mother Grue 1, Grandfather Willow 1, the Lantern Mother 2); bog amber is
  otherwise found only in chests (and sold by Nettie).
- **The Hearth Below** (M7) pays no forge spoils (`rules/gauntlet.js SPOILS` lists the Act II regions only): its fights pay
  XP, gold, drops and the Council's and the Unsmith's pieces. The sim's party reaches it with 12 embers, 20-23 silver,
  3 Bog Amber and 29,000-46,000 gold (it never tempers), so the Masterpiece's price (5 embers, 5 silver, 2 Bog Amber and
  2000 gold) is always in reach; none of its 200 parties holds the Worldforge page (the Dead Tongue's reward).
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
- **Weak packs:** a **weak** pack (all rabble, no relic held or worn, top level at least 3 below the
  party, 2 with the Dawnbell) flees on 4 of every 5 ticks. Catching one is a full battle, like any
  other (Milestone 4.5: there are no Routs), and winning it is the relics' Rout deed.
- **Road gates** (Milestone 4.5): every fight on the route holds a gate across the road; the gate
  opens for good once its guard (or the lair it waits on) is beaten, and a Waking brings the guard
  back beside the open gate as an optional rematch. The Glass Flats open with the Brand of Glass.
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
startBattle(game, { nodeId } | { patrol: { spawns, where, backdrop, dark } }, { ambush, firstStrike, caught }) -> { game, battle }
resolveBattle(game, battle) -> { game, report }  // report: result xp gold drops claimed consumables levelUps
                                                 //   goldLost grudge grudgeSettled brand rematch yield wokeAt rounds
rest(game, hfId) / travel(game, hfId) / spawnsFor(game, encId) / partyLevel(game) / uniqueBrands(game)
// rules/world.js (the overworld; see ARCHITECTURE.md "World")
enterMap move interact tick afterBattle commit present canWalk findPath threat keys lockStatus openLock openChest
// rules/story.js: talkTo dialogueView enterDialogue choose questLog nextObjective claimQuest bounties ladder
//   afterDialogue restDialogue pendingLetter readLetter
// rules/battle.js (contract) + inspect(state, id) for the Analyze panel
// rules/autoplay.js: autoCommand(state, heroId) -> a ready-to-act command ("Auto" button)
// rules/party.js: canUse equip unequip compare bestHeroFor reforge temperCost temper buy
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

`node tools/sim.mjs --seeds 200` plays routes of encounters with the scripted policy in
`src/rules/autoplay.js` (heal under 45%, revive the fallen, disarm relic holders before killing
them, Analyze/Mark/Rootbind elites, use relic Arts and Surges), teleporting between fights through
the flow API. After a wipe it rests, grinds one level on rabble patrols and retries (8 tries is
"stuck"). Crossing a zone map costs one fight with a roaming patrol (nothing when it is weak: it runs). A lost duel
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

### M5: the Ironspire Peaks (Gate 5, M5 spec §8)

`node tools/sim.mjs --seeds 200 --modes ironspire,ironspire-forged,iron-first-lead` (add `--iron-leads roc,shrine`
to run only some leads, `--jobs 4` to split the seeds over four processes, and `--sun-cache <file>` to keep each
seed's Sunscorch end state between tuning runs). Each mode starts from the end state of a `sunscorch` run: the
party that has just beaten the Ashen Warden, at Waking 4 with both Sunscorch Brands (party level 21.1 on average).
The tables are the M5 release's, with every M5 rule in (the exact statuses, Ironwall's Iron Stance, the held hero let
go when the last one standing falls).
- `ironspire`: home to the Eternal Hearth, out through the east postern and along the East Road (the Lea's
  wolves, the Plankford toll, a rest at the Last Camp Fire, the deserters' camp; the East Road's maps have no
  roaming zone), then `IRON_PATH` in order with one zone patrol per zone map walked through and a rest at each
  Hearthfire passed. The party rests at the Deeps Furnace before Mother Anvil (on the same map) and, after the
  Brand of Iron (Waking 5), walks back across the lake to the Frost Cairn before the Rime-Abbot (a patrol each
  way), as the Sunscorch route rests before its Champions.
- `ironspire-forged`: the same party with every hero's weapon tempered to +6 and one gem each (a Frost Opal in
  the weapon when it has a socket, else in the first socketed piece they wear: 799 of 800).
- `iron-first-lead`: each lead's lair (`IRON_LEADS`) as the first thing done once the road reaches it: the
  Thunder-Roc (past the Highfold's trolls) and Old Horn from Peak's Veil, Harrow's Journeyman from the Deeps
  Furnace (Waking 4), and the Drowned Abbess from the Frost Cairn once the Brand of Iron opens Stormwatch's north
  gate (Waking 5).
- **After an Ironspire wipe the sim's party re-arms** against the foe that beat it, as a player does who has read
  its card: each hero takes the bag weapon that hits it hardest (hit chance × average × the damage multiplier)
  when that beats the one in hand by a fifth, and the old weapon goes back when the fight is done. First tries
  never re-arm, and the M3 and M4 modes never do.

**M5 targets vs results (200 seeds, starters rotated):**

| target | result |
|---|---|
| `ironspire`: Mother Anvil first-try wipe 30-40% | 32% (party level 25.5; 29.5 rounds) |
| `ironspire`: the Rime-Abbot first-try wipe 30-40% | 35.5% (party level 29.0; 19.3 rounds) |
| `ironspire`: Tamsin at Ironhold first-try party win 55-70% | 61% (39% yield) |
| `ironspire-forged`: a forged party <= 20% against each Champion | Mother Anvil 6%, the Rime-Abbot 13.5% |
| `iron-first-lead`: each lead's lair taken first 15-25% | the Thunder-Roc 19%, Old Horn 19.5%, Harrow's Journeyman 22.5%, the Drowned Abbess 20% |
| zero stuck runs | 0 in every mode (M3's, M4's and M5's) |
| every M3 and M4 target unchanged | M3: every first-try result is M4.5's (m2 13% / 1% / 33%; direct Tamsin 66% win, Rotwarden 33%; leads2 4%; looper-w2 10%; first-lead 20% / 28% / 23% / 20%). M4, after Kharzul's exact Burrow: Kharzul 31.5%, the Ashen Warden 33.5%, Tamsin at Scorchgate 69.5% win, forged 16.5% / 7%, the leads 19% / 20% / 22% / 24% / 18.5% (the caravan with its plain smuggler at 6, below) |

**What the tuning settled:**
- Ironspire spawns that are not rabble climb 4 levels per Waking (§5); Waking-0 levels are 2-11: Mother Anvil 7
  (level 23 on arrival), the Rime-Abbot 7 (27 after the Brand of Iron), the Thunder-Roc 5, Old Horn 10, Harrow's
  Journeyman 11, the Drowned Abbess 6 (26 at Waking 5); the zone levels stay the scaffold's (the Rockslide Pass
  13, the Highfold and the Iron Stair 14, the Deeps 15, the Frost Road and Frostmere 16). The East Road's fights
  are rabble at 10-12 and a veteran sergeant at 2 (18-20 at Waking 4): a warm-up, 0-2% wipes.
- At most three Waking Omens on an Ironspire spawn, and chosen Omens on the Champions and the named lair holders
  (§5): Mother Anvil Thornskinned, Frenzied and Ironclad; the Rime-Abbot Frenzied and Swift; the Thunder-Roc
  Swift, Frenzied and Thornskinned; Old Horn and Harrow's Journeyman Frenzied and Swift; the Drowned Abbess
  Thornskinned and Swift; Rhune Swift; the Cutter-Chief Ironclad. None is ever Twinned.
- Mother Anvil: 170 HP, Guard 18, atk 9, dmg 6. Her plate and her crush resistance put a party whose four weapons
  were all ember or crush at 0.31-0.63x; before the re-arm such a party was stuck at eight tries with a Stillwater
  Lance in its bag.
- The Rime-Abbot: 160 HP, Guard 21, atk 8, dmg 7, speed 8 with Swift from the start. A lost fight makes a Champion
  a Grudge with one Omen it lacks; with Frenzied and Ironclad chosen, a Grudge could add Swift, which on a Frenzied
  Abbot is 40-50 more points of wipes, and 2-4 runs in 200 stuck on the retries. With Swift his already, a Grudge
  adds Emberblooded, Thornskinned or Ironclad. His difficulty was almost all Frenzied's burst under a quarter of
  his health (without it: 2-4% wipes), which the forged party escaped only in part (24% forged at 35%); so his
  last phase rolls Rime Nova on 6 faces in 20 (was 8), his blows hit harder all fight and his Guard is 21, so the
  forge's +6 to hit counts.
- Tamsin at Ironhold: the spec's spawn (party + 4, gear tier 4) with the Swift, Ironclad and Thornskinned Omens,
  and her Ironhold kit's Iron Grip at 2d8. A fourth Omen was far too much (Frenzied: 19-29% party wins).
- The Thunder-Roc 140 HP (at 120 it cost 13-15% first-try wipes).
- Kharzul's exact Burrow (§5): Erupt 4d10 with Stagger and two Bleeds keeps him on target (31.5%); it moved the M4
  run's later numbers a little: Tamsin at Scorchgate 65% to 69.5% (inside), and with the wisps' Beguile now a real
  charm the Wisp-Queen 19% to 24%; the caravan went from 22% to 25.5%, outside M4's 15-25%, so its plain smuggler is
  level 6 now (was 7): 19%. It is a lead, so nothing after it moves.
- The Deeps' zone patrol costs 11% first-try wipes on the route: it is met straight after Tamsin's duel with no
  rest between (as M4's Vault Guard after Scorchgate's duel, 16%).

### ironspire: from the sunscorch run's end (Waking 4), home to the Keep, then IRON_PATH

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| er-wolves | rime-wolf+rime-wolf+rime-wolf | 21.1 | 100% | 3.1 | 78% | 0% |  | 0 |  |  |  |
| er-toll | brigand+brigand+brigand | 21.4 | 100% | 5.2 | 68% | 0% |  | 0 |  |  |  |
| er-camp | brigand+brigand+brigand | 21.5 | 99% | 6.7 | 66% | 2% |  | 3 |  |  |  |
| patrol:rockslide-pass | (zone patrol, 6% ran) | 21.8 | 99% | 6.2 | 63% | 1% |  | 2 |  |  |  |
| rp-brigands | brigand+brigand+brigand | 22.0 | 98% | 8.0 | 67% | 3% |  | 5 | 200 |  |  |
| rp-rocklings | rockling+rockling+rockling+rockling | 22.4 | 100% | 4.5 | 67% | 1% |  | 1 |  |  |  |
| patrol:iron-stair | (zone patrol, 7% ran) | 22.7 | 99% | 5.6 | 73% | 1% |  | 2 |  |  |  |
| is-sentinels | iron-sentinel+iron-sentinel+iron-sentinel | 22.9 | 97% | 14.1 | 69% | 3% |  | 6 | 200 |  |  |
| tamsin-ironhold | tamsin | 23.7 | 61% | 19.2 | 54% | 0% | 39% | 0 |  |  |  |
| patrol:deeps | (zone patrol, 6% ran) | 24.1 | 89% | 4.3 | 52% | 11% |  | 22 |  |  |  |
| id-forgeborn | forgeborn+forgeborn+forgeborn | 24.4 | 96% | 11.0 | 68% | 4% |  | 8 |  |  |  |
| id-bellows | forgeborn+forgeborn+forgeborn | 24.9 | 90% | 12.9 | 54% | 10% |  | 20 |  |  |  |
| mother-anvil | mother-anvil | 25.5 | 68% | 29.5 | 45% | 32% |  | 87 | 400 |  |  |
| patrol:deeps@back | (zone patrol, 14% ran) | 26.7 | 99% | 4.5 | 61% | 1% |  | 2 |  |  |  |
| patrol:frost-road | (zone patrol, 7% ran) | 26.9 | 100% | 4.4 | 69% | 0% |  | 0 |  |  |  |
| fr-cutters | tallyman+smuggler+smuggler | 27.1 | 92% | 11.6 | 69% | 9% |  | 20 | 200 |  |  |
| patrol:frostmere | (zone patrol, 11% ran) | 27.5 | 100% | 3.6 | 78% | 0% |  | 0 |  |  |  |
| fm-wraiths | rime-wraith+rime-wraith+rime-wraith | 27.7 | 98% | 6.4 | 70% | 3% |  | 5 |  |  |  |
| fb-choir | rime-wraith+rime-wraith+rime-wraith | 28.3 | 94% | 5.1 | 57% | 7% |  | 13 |  |  |  |
| patrol:frostmere@back | (zone patrol, 36% ran) | 28.6 | 99% | 4.1 | 66% | 1% |  | 2 |  |  |  |
| patrol:frostmere@again | (zone patrol, 39% ran) | 28.8 | 100% | 3.8 | 80% | 0% |  | 0 |  |  |  |
| rime-abbot | rime-abbot | 29.0 | 65% | 19.3 | 47% | 36% |  | 121 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 30.1; grind fights/run 5.7
hero attack rolls: hit 60%, graze 13%, crit 11%, miss 12%, fumble 4%
random/worn-gear drops by rarity: worn 366, wrought 899, tempered 1488, runed 2889, storied 2286; named relics dropped: 122
party level entering the Ironspire: 21.1
### ironspire-forged: the same party with weapons tempered to +6 and one gem each

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| er-wolves | rime-wolf+rime-wolf+rime-wolf | 21.1 | 100% | 2.3 | 82% | 0% |  | 0 |  |  |  |
| er-toll | brigand+brigand+brigand | 21.4 | 100% | 4.1 | 73% | 0% |  | 0 |  |  |  |
| er-camp | brigand+brigand+brigand | 21.5 | 100% | 5.3 | 70% | 0% |  | 0 |  |  |  |
| patrol:rockslide-pass | (zone patrol, 6% ran) | 21.8 | 100% | 4.4 | 67% | 0% |  | 0 |  |  |  |
| rp-brigands | brigand+brigand+brigand | 22.1 | 100% | 6.0 | 69% | 0% |  | 0 | 200 |  |  |
| rp-rocklings | rockling+rockling+rockling+rockling | 22.5 | 100% | 3.9 | 70% | 1% |  | 1 |  |  |  |
| patrol:iron-stair | (zone patrol, 7% ran) | 22.7 | 100% | 4.2 | 78% | 0% |  | 0 |  |  |  |
| is-sentinels | iron-sentinel+iron-sentinel+iron-sentinel | 23.0 | 100% | 10.8 | 73% | 0% |  | 0 | 200 |  |  |
| tamsin-ironhold | tamsin | 23.7 | 79% | 14.9 | 55% | 0% | 22% | 0 |  |  |  |
| patrol:deeps | (zone patrol, 7% ran) | 24.2 | 96% | 3.4 | 57% | 4% |  | 8 |  |  |  |
| id-forgeborn | forgeborn+forgeborn+forgeborn | 24.4 | 100% | 7.6 | 69% | 0% |  | 0 |  |  |  |
| id-bellows | forgeborn+forgeborn+forgeborn | 24.9 | 99% | 9.6 | 60% | 1% |  | 2 |  |  |  |
| mother-anvil | mother-anvil | 25.4 | 94% | 21.1 | 50% | 6% |  | 15 | 400 |  |  |
| patrol:deeps@back | (zone patrol, 9% ran) | 26.4 | 100% | 3.4 | 62% | 0% |  | 0 |  |  |  |
| patrol:frost-road | (zone patrol, 2% ran) | 26.5 | 100% | 3.3 | 72% | 0% |  | 0 |  |  |  |
| fr-cutters | tallyman+smuggler+smuggler | 26.8 | 99% | 8.6 | 67% | 1% |  | 2 | 200 |  |  |
| patrol:frostmere | (zone patrol, 5% ran) | 27.2 | 100% | 3.1 | 81% | 0% |  | 0 |  |  |  |
| fm-wraiths | rime-wraith+rime-wraith+rime-wraith | 27.4 | 100% | 5.1 | 73% | 1% |  | 1 |  |  |  |
| fb-choir | rime-wraith+rime-wraith+rime-wraith | 27.9 | 98% | 4.0 | 64% | 2% |  | 4 |  |  |  |
| patrol:frostmere@back | (zone patrol, 24% ran) | 28.3 | 100% | 3.2 | 70% | 0% |  | 0 |  |  |  |
| patrol:frostmere@again | (zone patrol, 28% ran) | 28.4 | 100% | 2.9 | 83% | 0% |  | 0 |  |  |  |
| rime-abbot | rime-abbot | 28.6 | 87% | 14.9 | 52% | 14% |  | 50 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 29.5; grind fights/run 1.5
hero attack rolls: hit 77%, graze 5%, crit 11%, miss 3%, fumble 4%
random/worn-gear drops by rarity: worn 304, wrought 796, tempered 1484, runed 2755, storied 1957; named relics dropped: 157
party level entering the Ironspire: 21.1
forged: 800 heroes' weapons at +6; 799 gems set (583 in the weapon)
### iron-first-lead: each Ironspire lead's lair taken first: the Roc's and Old Horn's from Peak's Veil and the Journeyman's from the Deeps (Waking 4), the Drowned Abbess's once the Brand of Iron opens the Frost Road (Waking 5)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| er-wolves | rime-wolf+rime-wolf+rime-wolf | 21.1 | 100% | 3.1 | 78% | 0% |  | 0 |  |  |  |
| er-toll | brigand+brigand+brigand | 21.4 | 100% | 5.2 | 68% | 0% |  | 0 |  |  |  |
| er-camp | brigand+brigand+brigand | 21.5 | 99% | 6.7 | 66% | 2% |  | 14 |  |  |  |
| patrol:rockslide-pass | (zone patrol, 6% ran) | 21.8 | 98% | 6.2 | 62% | 2% |  | 19 |  |  |  |
| rp-brigands | brigand+brigand+brigand | 22.0 | 98% | 8.0 | 67% | 2% |  | 18 | 800 |  |  |
| rp-rocklings | rockling+rockling+rockling+rockling | 22.5 | 99% | 4.6 | 66% | 1% |  | 7 |  |  |  |
| patrol:highfold | (zone patrol, 6% ran) | 22.7 | 100% | 3.5 | 81% | 0% |  | 0 |  |  |  |
| hf-trolls | peak-troll+peak-troll | 22.9 | 100% | 6.3 | 74% | 0% |  | 0 |  |  |  |
| roc-eyrie | thunder-roc | 23.3 | 81% | 14.6 | 39% | 19% |  | 54 | 200 |  |  |
| patrol:iron-stair | (zone patrol, 7% ran) | 22.7 | 100% | 5.5 | 74% | 0% |  | 1 |  |  |  |
| troll-cave | peak-troll+peak-troll | 22.9 | 81% | 16.2 | 57% | 20% |  | 39 | 200 |  |  |
| is-sentinels | iron-sentinel+iron-sentinel+iron-sentinel | 23.0 | 97% | 13.7 | 69% | 3% |  | 11 | 400 |  |  |
| tamsin-ironhold | tamsin | 23.7 | 61% | 19.1 | 54% | 0% | 39% | 0 |  |  |  |
| patrol:deeps | (zone patrol, 7% ran) | 24.2 | 87% | 4.4 | 53% | 14% |  | 54 |  |  |  |
| id-forgeborn | forgeborn+forgeborn+forgeborn | 24.4 | 97% | 11.1 | 69% | 3% |  | 12 |  |  |  |
| id-smith | forgeborn+forgeborn | 24.8 | 78% | 24.3 | 61% | 23% |  | 51 | 200 |  |  |
| id-bellows | forgeborn+forgeborn+forgeborn | 24.8 | 92% | 12.6 | 51% | 8% |  | 16 |  |  |  |
| mother-anvil | mother-anvil | 25.4 | 67% | 29.2 | 46% | 34% |  | 94 | 400 |  |  |
| patrol:deeps@back | (zone patrol, 14% ran) | 26.7 | 100% | 4.5 | 59% | 0% |  | 0 |  |  |  |
| patrol:frost-road | (zone patrol, 4% ran) | 26.9 | 99% | 4.3 | 68% | 1% |  | 2 |  |  |  |
| fr-cutters | tallyman+smuggler+smuggler | 27.1 | 92% | 11.7 | 66% | 8% |  | 16 | 200 |  |  |
| patrol:frostmere | (zone patrol, 10% ran) | 27.5 | 100% | 3.8 | 78% | 0% |  | 0 |  |  |  |
| fm-shrine | rime-wraith+rime-wraith+rime-wraith | 27.7 | 80% | 10.3 | 62% | 20% |  | 47 | 200 |  |  |

runs cleared 800/800 (stuck 0); end party level 25.4; grind fights/run 1.7
hero attack rolls: hit 62%, graze 12%, crit 11%, miss 11%, fumble 4%
random/worn-gear drops by rarity: worn 652, wrought 1779, tempered 2798, runed 6347, storied 3673; named relics dropped: 245
party level entering the Ironspire: 21.1

### M6: the Gloomfen Marsh (Gate 6, M6 spec §8)

`node tools/sim.mjs --seeds 200 --modes gloomfen,gloomfen-forged,gloom-first-lead` (add `--gloom-leads willow,hodge`
to run only some leads, `--jobs 4` to split the seeds over four processes, and `--iron-cache <file>` to keep each
seed's Ironspire end state between tuning runs: valid only while nothing before the Gloomfen changes). Each mode starts
from the end state of an `ironspire` run: the party that has just beaten the Rime-Abbot, at Waking 6 with every earlier
Brand held (party level 30.1 on average). The tables are M6's, with every M6 foe, encounter and relic in.
- `gloomfen`: home to the Eternal Hearth, down Mossfall's fen stair, then `GLOOM_PATH` in order with one zone patrol per
  zone map crossed and a rest at each Hearthfire passed: the Murkway (the leeches, the reed-cutters), Willowmurk's
  broken ward-gate, Rotbridge (a rest at the Toll-Lamp; Hodge's bar is paid, so he is not fought) and Tamsin on the
  bridge, Bogmire, and the Lanternfen (the moths, the hags' pot; the party rests at the Fen Cairn before the Mother's
  Hollow). With the Brand of Lanterns (Waking 7) it walks back through the Lanternfen to Bogmire, along the long
  boardwalk (the drowned) to Misthollow (the salvage camp, then the bell-ringers), down the Blackwater Reach (the barge
  on the towpath) to the Tidal Flats (the barge-camp), and rests at the Flats Beacon before the Leviathan. Willowmurk,
  Rotbridge and Bogmire have no roaming zone.
- `gloomfen-forged`: the same party with every hero's weapon tempered to +8 and one gem each (a Bog Amber in the weapon
  when it has a socket, else in the first socketed piece they wear: 800 of 800, 701 in the weapon). At the end of the
  region it walks back to the Toll-Lamp and fights Hodge.
- `gloom-first-lead`: each lead's lair (`GLOOM_LEADS`) as the first thing done once the road reaches it, after the road
  fight that guards its way in (or the zone's patrol, where no road fight does) and a rest at the nearest fire (the
  review's finding: a lair behind a road gate is taken past its fight): Grandfather Willow past the wights at the
  ward-gate, from the Willow Hearth; Hodge on arrival at Rotbridge (his toll refused); Mother Grue past the Lanternfen's
  patrol, from the Stilt Hearth (Waking 6: batch 3's painting puts her hut before the Lanternfen's first gate, behind
  only its witch-ward, a few steps from Bogmire); the Drowned Cantor (his choir first) past the salvage chain, from the
  Belltower Fire, and Old Jaws past the barge, from the Wreck Fire, once the Brand of Lanterns opens the long boardwalk
  (Waking 7). A party that walks on to Old Jaws's dock straight from the barge, with no rest, is harder pressed (the
  review measured 52.5% at his old level).
- **Hodge is fought once** (`ONE_TRY`): a party that loses to him pays the day's price instead, and the bar opens either
  way (M6 spec A11), so his rows count one try per run, and nothing grinds or re-arms after it.
- After a Gloomfen wipe the sim's party re-arms against the foe that beat it, as after an Ironspire wipe.

**M6 targets vs results (200 seeds, starters rotated):**

| target | result |
|---|---|
| `gloomfen`: the Lantern Mother first-try wipe 30-40% | 35% (party level 31.9; 32.5 rounds) |
| `gloomfen`: the Blackwater Leviathan first-try wipe 30-40% | 36% (party level 35.7; 27.8 rounds) |
| `gloomfen`: Tamsin at Rotbridge first-try party win 55-70% | 64% (36% yield) |
| `gloomfen-forged`: a forged party <= 20% against each Champion | the Lantern Mother 8.5%, the Leviathan 15.5% |
| `gloomfen-forged`: a forged party at the region's end beats Hodge, but not always | 61.5% first-try win (party level 36.3) |
| `gloom-first-lead`: each lead's lair taken first 15-25% | Grandfather Willow 23%, Mother Grue 24%, the Drowned Cantor 19.5%, Old Jaws 17.5% |
| `gloom-first-lead`: Hodge on arrival 60-80% | 73.5% first-try wipe (party level 31.0) |
| zero stuck runs | 0 in every mode (M3's, M4's, M5's and M6's) |
| every M3, M4, M4.5 and M5 target unchanged | unchanged: every table from `m2` to `iron-first-lead`, and the Gate 4 and Gate 5 checks, are the M5 release's number for number (the tables above stand) |

**What the tuning settled:**
- Gloomfen spawns that are not rabble climb 4 levels per Waking (§5); their Waking-0 levels are 3-12: the Lantern
  Mother 9 (33 on arrival), the Blackwater Leviathan 7 (35 after the Brand of Lanterns), Grandfather Willow 8, Mother
  Grue 12, the Drowned Cantor 10 (38 at Waking 7), Old Jaws 5 (33 at Waking 7). Hodge is party level + 6 at gear tier
  3, Tamsin party + 4 at gear tier 4. The rabble climb the usual 2 and meet the party 2-4 levels under it, as M5's do.
- At most three Waking Omens on a Gloomfen spawn, and chosen Omens on the Champions, Hodge and the named lair holders:
  the Lantern Mother Frenzied, Swift and Ironclad; the Leviathan Frenzied and Swift; Hodge Frenzied, Swift and Ironclad;
  Grandfather Willow, Mother Grue and the Drowned Cantor Frenzied and Swift; Old Jaws Frenzied and Thornskinned; the
  Salvage-Master and the Bargemaster Ironclad; Tamsin Swift, Ironclad and Thornskinned. None is ever Twinned.
- **A Champion carries Frenzied, so a Grudge cannot add it** (the Rime-Abbot's lesson, §12 M5). The Leviathan with
  Swift, Ironclad and Thornskinned was 32% first try, but a lost fight's Grudge added Frenzied half the time, and a
  Frenzied retry is far harder than the first try: 1 run in 200 was stuck in two modes. With Frenzied and Swift chosen,
  a Grudge adds Emberblooded, Thornskinned or Ironclad: zero stuck since.
- The Lantern Mother: 215 HP, Guard 19, atk 9, dmg 7, speed 11. Level 7 to 9, 160 to 215 HP, Guard 18 to 19, Lantern
  Flare 2d8 to 3d8, Drown the Light 3d10 to 4d10, and the Swift Omen took her from 0.5% first-try wipes to 35%.
- The Blackwater Leviathan: 160 HP, Guard 22, atk 8, dmg 6, speed 7. At 190 HP it was 15-20% without Swift and 64% with
  it; 140-160 HP gave 30-36%. Its Guard is what makes the forge count (M5's lesson): 36% unforged, 15.5% forged.
- Hodge: 72 HP, Guard 19 (+2 Ironclad), atk 6, dmg 4, speed 10. At 110 HP, Guard 16 and Thornskinned he wiped 86% of
  the parties that met him on arrival, and a forged party at the region's end won only 30%: fewer HP and more Guard
  (which a +8 weapon answers) give 73.5% and 61.5%. Toll Is Due uses DC 20: his own save DC at party level + 6 would be
  30 or more, which no hero could make.
- The lairs: Mother Grue from 0% to 22% (level 12, 140 HP, atk 6, dmg 5, and the hags' Rot at 2d6: at 1d6 her hollow
  was 0-10%; 24% once batch 3 put her hut before the first gate, taken from the Stilt Hearth); the Drowned Cantor from
  3% to 15.5% (level 10, 180 HP, atk 7, dmg 6); Grandfather Willow from 15% to 21% (170 HP, atk 6, dmg 4); Old Jaws
  from 63% at level 8 to 24.5% at 6. The review moved every lair behind the road fight that guards it (a rest
  between): Grandfather Willow 23%, the Drowned Cantor 19.5%, and Old Jaws 25%, on the band's edge, so he is level 5
  with his two gars at 17 (was 18): 17.5% (5 with gars at 18: 22.5%; 6 with gars at 17: 23.5%).
- Tamsin at Rotbridge: the spec's spawn with the Swift, Ironclad and Thornskinned Omens; her kit's All In at 4d10 and
  Fen-Step at 2d10 took the party's first-try wins from 69.5% to 64%.
- The road: a spawn's base level also picks its Omens (seeded), and on rabble Twinned and Emberblooded double a fight's
  danger (the salvage divers at 17: 13% wipes; at 16: 3%), so the levels were chosen with the Omens in view. The salvage
  camp, the bell-ringers and the Blackwater's zone patrol are met back to back, with no Hearthfire between: the party
  reaches the ringers hurt and short of tonics, so they are light (22 HP, level 3, Peal on one face at 1d4; at first
  more than half the runs wiped there): 11%, and the patrol after them 7%. The salvage camp (22-25% at first) has the
  Diving Bell at 2d6, a Grapnel that Exposes instead of Rooting, a Salvage Hook that Staggers, the Salvage-Master at
  level 4 and divers at 16: 6%. The barge-camp (12-29% at first) has the Boat-Hook at 1d8, Make Fast! on one face, the
  Bargemaster at 5 and bargehands at 17: 8%.

### gloomfen: from the ironspire run's end (Waking 6), home to the Keep, then GLOOM_PATH

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:murkway | (zone patrol, 51% ran) | 30.1 | 100% | 6.6 | 75% | 0% |  | 0 |  |  |  |
| mk-leeches | mire-leech+mire-leech+mire-leech | 30.3 | 100% | 5.4 | 69% | 0% |  | 0 |  |  |  |
| mk-reedcutters | smuggler+smuggler+tallyman | 30.6 | 100% | 6.7 | 68% | 0% |  | 0 |  |  |  |
| wm-wights | willow-wight+willow-wight | 30.8 | 100% | 9.7 | 73% | 1% |  | 1 |  |  |  |
| tamsin-rotbridge | tamsin | 30.9 | 64% | 18.2 | 52% | 0% | 36% | 0 |  |  |  |
| patrol:lanternfen | (zone patrol, 63% ran) | 31.3 | 100% | 3.7 | 89% | 0% |  | 0 |  |  |  |
| lf-moths | lamp-moth+lamp-moth+lamp-moth+lamp-moth | 31.4 | 100% | 3.0 | 82% | 0% |  | 0 |  |  |  |
| lf-hags | bog-hag+bog-hag+mire-leech | 31.7 | 99% | 10.3 | 71% | 2% |  | 3 |  |  |  |
| lantern-mother | lantern-mother | 31.9 | 65% | 32.5 | 49% | 35% |  | 131 | 400 |  |  |
| patrol:lanternfen@back | (zone patrol, 54% ran) | 33.4 | 100% | 3.6 | 69% | 0% |  | 0 |  |  |  |
| patrol:boardwalk | (zone patrol, 36% ran) | 33.5 | 100% | 4.1 | 83% | 0% |  | 0 |  |  |  |
| lb-drowned | drowned+drowned+drowned | 33.6 | 99% | 6.7 | 61% | 1% |  | 2 |  |  |  |
| patrol:misthollow | (zone patrol, 48% ran) | 34.1 | 100% | 4.0 | 73% | 0% |  | 0 |  |  |  |
| mh-salvage | tallyman+smuggler+smuggler | 34.2 | 95% | 13.6 | 65% | 6% |  | 12 | 200 |  |  |
| mh-ringers | drowned+drowned+drowned | 34.5 | 89% | 5.6 | 53% | 11% |  | 22 |  |  |  |
| patrol:blackwater | (zone patrol, 46% ran) | 35.0 | 93% | 7.0 | 60% | 7% |  | 14 |  |  |  |
| br-barge | smuggler+smuggler+smuggler | 35.1 | 100% | 8.6 | 61% | 0% |  | 0 |  |  |  |
| patrol:tidal-flats | (zone patrol, 55% ran) | 35.2 | 97% | 6.4 | 55% | 4% |  | 7 |  |  |  |
| tf-bargemaster | tallyman+smuggler+smuggler | 35.3 | 93% | 16.1 | 60% | 8% |  | 16 | 200 |  |  |
| blackwater-leviathan | blackwater-leviathan | 35.7 | 64% | 27.8 | 28% | 36% |  | 92 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 36.7; grind fights/run 5.7
hero attack rolls: hit 60%, graze 13%, crit 11%, miss 13%, fumble 4%
random/worn-gear drops by rarity: worn 146, wrought 439, tempered 1004, runed 2351, storied 2158; named relics dropped: 128
party level entering the Gloomfen: 30.1

### gloomfen-forged: the same party with weapons tempered to +8 and one gem each; Hodge at the end of the region

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:murkway | (zone patrol, 51% ran) | 30.1 | 100% | 5.4 | 77% | 0% |  | 0 |  |  |  |
| mk-leeches | mire-leech+mire-leech+mire-leech | 30.3 | 100% | 3.8 | 72% | 0% |  | 0 |  |  |  |
| mk-reedcutters | smuggler+smuggler+tallyman | 30.6 | 100% | 4.6 | 74% | 0% |  | 0 |  |  |  |
| wm-wights | willow-wight+willow-wight | 30.8 | 100% | 7.1 | 75% | 1% |  | 1 |  |  |  |
| tamsin-rotbridge | tamsin | 31.0 | 80% | 14.3 | 53% | 0% | 21% | 0 |  |  |  |
| patrol:lanternfen | (zone patrol, 68% ran) | 31.4 | 100% | 2.7 | 91% | 0% |  | 0 |  |  |  |
| lf-moths | lamp-moth+lamp-moth+lamp-moth+lamp-moth | 31.5 | 100% | 2.4 | 85% | 0% |  | 0 |  |  |  |
| lf-hags | bog-hag+bog-hag+mire-leech | 31.8 | 100% | 7.5 | 76% | 0% |  | 0 |  |  |  |
| lantern-mother | lantern-mother | 32.0 | 92% | 21.9 | 51% | 9% |  | 21 | 400 |  |  |
| patrol:lanternfen@back | (zone patrol, 46% ran) | 33.0 | 100% | 2.8 | 71% | 0% |  | 0 |  |  |  |
| patrol:boardwalk | (zone patrol, 20% ran) | 33.1 | 100% | 3.2 | 85% | 0% |  | 0 |  |  |  |
| lb-drowned | drowned+drowned+drowned | 33.3 | 100% | 5.9 | 66% | 1% |  | 1 |  |  |  |
| patrol:misthollow | (zone patrol, 38% ran) | 33.7 | 100% | 3.0 | 76% | 0% |  | 0 |  |  |  |
| mh-salvage | tallyman+smuggler+smuggler | 33.8 | 100% | 9.5 | 68% | 0% |  | 0 | 200 |  |  |
| mh-ringers | drowned+drowned+drowned | 34.2 | 97% | 5.2 | 57% | 3% |  | 6 |  |  |  |
| patrol:blackwater | (zone patrol, 29% ran) | 34.5 | 96% | 5.3 | 60% | 4% |  | 8 |  |  |  |
| br-barge | smuggler+smuggler+smuggler | 34.7 | 100% | 6.6 | 66% | 0% |  | 0 |  |  |  |
| patrol:tidal-flats | (zone patrol, 37% ran) | 34.8 | 99% | 5.0 | 60% | 2% |  | 3 |  |  |  |
| tf-bargemaster | tallyman+smuggler+smuggler | 35.0 | 99% | 11.4 | 64% | 1% |  | 2 | 200 |  |  |
| blackwater-leviathan | blackwater-leviathan | 35.2 | 85% | 21.8 | 29% | 16% |  | 61 | 400 |  |  |
| hodge | hodge | 36.3 | 62% | 18.1 | 37% | 39% |  | 77 | 123 |  |  |

runs cleared 200/200 (stuck 0); end party level 36.5; grind fights/run 1.8
hero attack rolls: hit 75%, graze 5%, crit 12%, miss 4%, fumble 4%
random/worn-gear drops by rarity: worn 123, wrought 391, tempered 996, runed 2353, storied 1952; named relics dropped: 159
party level entering the Gloomfen: 30.1
forged: 800 heroes' weapons at +8; 800 gems set (701 in the weapon)

### gloom-first-lead: each Gloomfen lead's lair taken first: Grandfather Willow's, Hodge's (on arrival) and Mother Grue's (Waking 6), the Drowned Cantor's and Old Jaws's once the Brand of Lanterns opens the boardwalk (Waking 7)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:murkway | (zone patrol, 47% ran) | 30.1 | 100% | 6.7 | 75% | 0% |  | 0 |  |  |  |
| mk-leeches | mire-leech+mire-leech+mire-leech | 30.3 | 100% | 5.4 | 68% | 0% |  | 1 |  |  |  |
| mk-reedcutters | smuggler+smuggler+tallyman | 30.6 | 100% | 6.6 | 67% | 0% |  | 0 |  |  |  |
| wm-wights | willow-wight+willow-wight | 30.8 | 100% | 9.7 | 73% | 0% |  | 3 |  |  |  |
| wm-willow | willow-wight+willow-wight | 31.0 | 77% | 25.1 | 65% | 23% |  | 70 | 200 |  |  |
| hodge | hodge | 31.0 | 27% | 23.6 | 33% | 74% |  | 147 | 53 |  |  |
| tamsin-rotbridge | tamsin | 31.0 | 68% | 18.2 | 51% | 0% | 32% | 0 |  |  |  |
| patrol:lanternfen | (zone patrol, 58% ran) | 31.3 | 100% | 3.7 | 88% | 0% |  | 0 |  |  |  |
| grue-hollow | bog-hag+bog-hag | 31.4 | 76% | 32.1 | 58% | 24% |  | 81 | 200 |  |  |
| lf-moths | lamp-moth+lamp-moth+lamp-moth+lamp-moth | 31.4 | 100% | 3.0 | 82% | 0% |  | 0 |  |  |  |
| lf-hags | bog-hag+bog-hag+mire-leech | 31.7 | 100% | 10.4 | 71% | 0% |  | 1 |  |  |  |
| lantern-mother | lantern-mother | 31.9 | 63% | 32.2 | 49% | 37% |  | 258 | 800 |  |  |
| patrol:lanternfen@back | (zone patrol, 58% ran) | 33.4 | 100% | 3.8 | 71% | 0% |  | 0 |  |  |  |
| patrol:boardwalk | (zone patrol, 33% ran) | 33.5 | 100% | 4.4 | 82% | 0% |  | 0 |  |  |  |
| lb-drowned | drowned+drowned+drowned | 33.6 | 100% | 6.9 | 60% | 0% |  | 0 |  |  |  |
| patrol:misthollow | (zone patrol, 43% ran) | 34.1 | 100% | 4.1 | 72% | 0% |  | 0 |  |  |  |
| mh-salvage | tallyman+smuggler+smuggler | 34.2 | 96% | 13.6 | 67% | 5% |  | 19 | 400 |  |  |
| db-choir | drowned+drowned+drowned | 34.5 | 100% | 5.6 | 73% | 0% |  | 0 |  |  |  |
| cantor | drowned+drowned+drowned | 35.0 | 81% | 25.3 | 63% | 20% |  | 41 | 200 |  |  |
| mh-ringers | drowned+drowned+drowned | 34.5 | 88% | 5.9 | 51% | 12% |  | 24 |  |  |  |
| patrol:blackwater | (zone patrol, 42% ran) | 35.0 | 93% | 7.2 | 59% | 7% |  | 14 |  |  |  |
| br-barge | smuggler+smuggler+smuggler | 35.1 | 99% | 8.6 | 60% | 1% |  | 2 |  |  |  |
| old-jaws | blackwater-gar+blackwater-gar+blackwater-gar | 35.2 | 83% | 15.3 | 56% | 18% |  | 40 | 200 |  |  |

runs cleared 1000/1000 (stuck 0); end party level 33.3; grind fights/run 2.4
hero attack rolls: hit 63%, graze 11%, crit 12%, miss 10%, fumble 4%
random/worn-gear drops by rarity: worn 390, wrought 1228, tempered 2453, runed 5929, storied 5217; named relics dropped: 408
party level entering the Gloomfen: 30.1

### M7: the Hearth Below (Gate 7, M7 spec §8)

`node tools/sim.mjs --seeds 200 --modes below,below-forged` (add `--jobs 3` to split the seeds, and `--gloom-cache
<file>` to keep each seed's Gloomfen end state between tuning runs: valid only while nothing before the Hearth Below
changes; `--iron-cache` still works under it). Each mode starts from the end state of a `gloomfen` run: the party that has
just beaten the Blackwater Leviathan, at Waking 8 with every Brand held (party level 36.7 on average, the spec's "about
36.5"). The tables are M7's, with every M7 foe, encounter and relic in.
- `below`: home to the Eternal Hearth (the fourth and fifth councils: nothing is fought) and a rest there, then
  `ACT3_PATH`: the Hollow Council **back to back** in the Hollow Hall (Miravel, Qasim, Brundar, Gretch; no rest between
  them; a wipe wakes the party at the Eternal Hearth, `wakeAt`, and keeps who is beaten, and the retry is from there);
  the Ash Stair (a rest at the Under-Coal, the thralls and their overseer at the narrows, the thralls' pack on the middle
  landing and one zone patrol); the Chained Deep (the unmade at the narrows, a rest at the Chain Fire); the forge-warden
  at the Worldforge's bridge, back through the forge door to rest at the Chain Fire, and **the Unsmith with Tamsin
  beside the party** (the encounter's guest in her finale kit), his Stolen Arts decided by what the run's own party has
  claimed (`stolenFor`: every sim party leaves him six, the Gloomfen side relics it never collects).
- `below-forged`: the same party with every hero's weapon tempered to +10 and one gem each (a Bog Amber: 800 set, 752 in
  the weapon), and once the Council is freed Hilda forges **the Warden's Masterpiece** (the finest base of the kind the
  Warden carries, tempered to +10 too, `forgeMasterpiece` with the page and the price given), which the Warden takes up.
- **The Hollow Council is measured together**: "the Hollow Council" is the share of runs that wipe anywhere in the four
  (its first pass fails at its first wipe); each member's row is its own first-try wipe rate, met by a party that may be
  hurt from the one before.
- After an Act III wipe the sim's party re-arms against the foe that beat it, as after an Ironspire or Gloomfen wipe. A
  Council wipe grinds on the Tidal Flats (the Ash Stair lies past the four); everything past them grinds on the Ash Stair.
- The autoplay heals and revives only the heroes, never the guest; a player can heal Tamsin, so the finale is a little
  harder in the sim than in hand.

**M7 targets vs results (200 seeds, starters rotated):**

(Re-run after the browser gate's and the reviews' rules fixes: a pried gift takes its +4 from the rolls already made,
and a move a Stagger broke off stays broken off through a pry. The second helped the party most against the Unsmith,
who is 190 HP now; see "What the tuning settled".)

| target | result |
|---|---|
| `below`: the Hollow Council back to back, 35-45% of runs wipe somewhere in the four | 41.5% (83 of 200) |
| `below`: no Council member above 25% (first try) | Miravel 5.5%, Qasim 14.5%, Brundar 15%, Gretch 12% |
| `below`: the Unsmith with Tamsin, first try 30-40% | 35.5% (party level 41.1; 38.4 rounds; Tamsin falls in 23% of first tries) |
| `below-forged`: a forged party with the Masterpiece, the Unsmith <= 20% | 7.5% |
| `below`: the road fights <= 10% each | the thralls 0%, their pack 1%, the zone patrol 0%, the unmade 2.5%, the forge-warden 6% |
| zero stuck runs | 0 in every mode (M3's to M7's) |
| every M3, M4, M4.5, M5 and M6 target | every mode re-run from scratch after the review's Stagger fix, which touches every fight with a piece since M3: every table moved a little and every target holds, three lead lairs retuned by a level (the Mire Shrine 19%, the Wisp-Queen 17.5%, Mother Grue 24.5%); the tables are in the last section, "M7: every earlier mode, re-run" |

**What the tuning settled:**
- The Hearth Below's spawns that are not rabble climb 4 levels per Waking (+32 at Waking 8; §5), and every road foe and
  every Council member stands at level 38, the Unsmith at 41. Rabble climb the usual 2 (the thralls at 22: 38). The
  party gains about three levels across the Council (36.7 -> 39.8) and meets the Unsmith at 41.1.
- **Tamsin is one more strong hero, not a Champion.** At a foe's full scale (a die every 3 levels, and a foe's flat
  damage) she dealt 56% of the damage to the Unsmith and the heroes 39%: she carried the finale. Her kit's blows land at
  half weight (`mult: 0.5`) and add a die every 12 levels: about a third of the damage, with Pry It Loose, a Stagger that
  breaks one of his two moves and a ward for the worst hurt of the party.
- **The Unsmith's blows add a die every 5 levels** (a foe's every 3): he makes two moves a turn, and at a Champion's
  scale each (with Tamsin brought down) he wiped 81.5% of first tries. His Hammer Blow set the band: 2d10 (29-30%), 2d12
  (42%), 2d10 with a die every 4 levels (41%), 2d10 and 1d6 more (32%), 2d10 and 1d8 more (36%), all at 185 HP. Guard
  19, atk 9, dmg 6, Frenzied and Ironclad (a Grudge adds Swift, Thornskinned or Emberblooded, never Frenzied): a retry is
  about as hard as the first try, and no run sticks.
- **The review's Stagger fix made him easier, so he is 190 HP.** Tamsin's Inside His Swing breaks one of his two moves
  and her Pry It Loose pries a piece; before the fix, the pry brought the broken move back. At 185 HP he fell to 27.5%;
  205 HP gave 45% and one run that never beat him (party level 48); 195 HP 38%; 190 HP 35.5%.
- **The gifts and the pieces come loose early.** A Legend Strike jars a quarter of a piece's grip loose, whatever its size,
  so the autoplay pries each gift by round 4.4-5.5 (grips 40 -> 56-64 held them from round 3 to 4-5) and the Unsmith's
  three by rounds 4.5, 8.6 and 14.6 of 38; the Worldforge Heart (72) usually comes loose before his last phase, which keeps
  its Worldfire. The +4 is on 18-24% of a member's intents over a fight, and the gift's Arts are 8-10% of its moves.
- **The Council**, from first guesses (110-130 HP) at 0.5-3% each but Brundar's 20.5% (group 24.5%): Miravel 150 HP, atk
  10, dmg 7 (the first, fought fresh: she wears the party down for the next three); Qasim 125 HP, speed 11; Brundar 110
  HP, Guard 18 (Ironclad makes it 20, and his gauntlet half again as hard to pry); Gretch 140 HP, Guard 19. Each carries
  Frenzied and one more chosen Omen (Miravel Thornskinned, Qasim Swift, Brundar Ironclad, Gretch Swift).
- The road: the thralls' Reform (Regenerating when hurt), the unmade's Grey Touch (Rotting) and the forge-warden's Bellows
  Breath (every hero) keep the road honest at 0-6% wipes; the forge-warden's fight, straight after the Chain Fire's rest,
  is the hardest of them.

### below: from the gloomfen run's end (Waking 8), home to the Keep, then ACT3_PATH: the Hollow Council back to back, the road down, and the Unsmith with Tamsin beside the party

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hollow-miravel | hollow-miravel | 36.6 | 95% | 19.8 | 49% | 6% |  | 14 | 200 |  |  |
| hollow-qasim | hollow-qasim | 37.4 | 86% | 23.7 | 47% | 15% |  | 29 | 200 |  |  |
| hollow-brundar | hollow-brundar | 38.3 | 85% | 23.0 | 49% | 15% |  | 30 | 200 |  |  |
| hollow-gretch | hollow-gretch | 39.1 | 88% | 19.4 | 53% | 12% |  | 24 | 200 |  |  |
| as-thralls | cinder-thrall+cinder-thrall+cinder-thrall+cinder-thrall | 39.8 | 100% | 11.0 | 71% | 0% |  | 0 |  |  |  |
| as-patrol | cinder-thrall+cinder-thrall+cinder-thrall | 40.1 | 99% | 11.0 | 71% | 1% |  | 2 |  |  |  |
| patrol:ash-stair | (zone patrol, 27% ran) | 40.4 | 100% | 8.1 | 76% | 0% |  | 0 |  |  |  |
| cd-unmade | unmade+unmade+cinder-thrall | 40.5 | 98% | 10.4 | 63% | 3% |  | 5 |  |  |  |
| wf-warden | forge-warden+cinder-thrall+cinder-thrall | 40.8 | 94% | 15.1 | 62% | 6% |  | 12 |  |  |  |
| unsmith | unsmith | 41.1 | 65% | 38.4 | 43% | 36% |  | 106 | 600 |  |  |

runs cleared 200/200 (stuck 0); end party level 42.1; grind fights/run 4.8
hero attack rolls: hit 56%, graze 13%, crit 12%, miss 15%, fumble 4%
random/worn-gear drops by rarity: worn 79, wrought 224, tempered 716, runed 1406, storied 2006; named relics dropped: 0
party level entering the Hearth Below: 36.6
the Hollow Council: 42% of runs wipe somewhere in the group (83 of 200)
unsmith: Stolen Arts taken 6.0 on average (of 6.0 he could take; the Thief reached in 100% of first tries)
unsmith: the guest falls in 23% of first tries

### below-forged: the same party with weapons tempered to +10, one gem each, and the Warden's Masterpiece once the Council is freed

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hollow-miravel | hollow-miravel | 36.6 | 99% | 13.6 | 52% | 2% |  | 4 | 200 |  |  |
| hollow-qasim | hollow-qasim | 37.4 | 99% | 15.9 | 54% | 1% |  | 3 | 200 |  |  |
| hollow-brundar | hollow-brundar | 38.2 | 98% | 13.9 | 57% | 3% |  | 5 | 200 |  |  |
| hollow-gretch | hollow-gretch | 38.8 | 100% | 12.7 | 63% | 0% |  | 0 | 200 |  |  |
| as-thralls | cinder-thrall+cinder-thrall+cinder-thrall+cinder-thrall | 39.5 | 100% | 7.9 | 73% | 0% |  | 0 |  |  |  |
| as-patrol | cinder-thrall+cinder-thrall+cinder-thrall | 39.7 | 100% | 7.4 | 74% | 0% |  | 0 |  |  |  |
| patrol:ash-stair | (zone patrol, 14% ran) | 40.0 | 100% | 5.2 | 80% | 0% |  | 0 |  |  |  |
| cd-unmade | unmade+unmade+cinder-thrall | 40.1 | 100% | 7.5 | 67% | 0% |  | 0 |  |  |  |
| wf-warden | forge-warden+cinder-thrall+cinder-thrall | 40.4 | 98% | 12.0 | 64% | 2% |  | 4 |  |  |  |
| unsmith | unsmith | 40.7 | 93% | 27.6 | 49% | 8% |  | 19 | 600 |  |  |

runs cleared 200/200 (stuck 0); end party level 41.4; grind fights/run 0.7
hero attack rolls: hit 75%, graze 4%, crit 13%, miss 4%, fumble 3%
random/worn-gear drops by rarity: worn 53, wrought 137, tempered 663, runed 1198, storied 1563; named relics dropped: 0
party level entering the Hearth Below: 36.6
forged: 800 heroes' weapons at +10; 800 gems set (757 in the weapon); the Warden's Masterpiece forged in 200 runs
the Hollow Council: 5% of runs wipe somewhere in the group (9 of 200)
unsmith: Stolen Arts taken 6.0 on average (of 6.0 he could take; the Thief reached in 100% of first tries)
unsmith: the guest falls in 4% of first tries

### M7: every earlier mode, re-run (the review's Stagger fix)

The review found that a move a Stagger had broken off came back to life when a pry rolled it again (M7-STATUS §2.3,
A3). The fix touches every fight with a breakable piece since M3, so every mode was re-run from scratch (200 seeds,
starters rotated): every table moved a little, and every target holds, but for three lead lairs on their bands' edges.
Each was retuned by a level; each is a lead, so nothing after it moves:
- the Mire Shrine's two boglurchers level 4 (were 5, a level above their mirelord): 19% (30% before; it had sat at
  27-28%, over its band, since M3);
- the Wisp-Queen's two wisps level 3 (were 4): 17.5% (27.5% before);
- Mother Grue's hag level 5 (was 6): 24.5% (27% before).

M3's targets (the sim prints no gate for them): the M2 road's first tries 13% / 1% / 32% (M2's table: 13 / 1 / 33);
`direct`, Tamsin 67% party win (55-70%) and the Rotwarden 33% (30-40%); `leads2`, the Rotwarden 4% (<= 20%);
`looper-w2`, 10% (<= 45%); `first-lead`, the Lamp Room 19%, the Mire Shrine 19%, the Gloamwing 25% and the Grove
Circle 20% (15-25%). Zero stuck runs in every mode. These tables are the current ones; the milestones' own sections
above keep the numbers they shipped with.

#### m2: Waking 0, the M2 road, equips drops (a wipe grinds a level)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| keep-vault | tallyman+cutpurse | 1.0 | 100% | 1.7 | 89% | 0% |  | 0 | 179 |  |  |
| hearth-road | cutpurse+cutpurse+cutpurse | 1.0 | 100% | 2.7 | 78% | 0% |  | 0 |  |  |  |
| waymarker-stones | thornhound+thornhound+briarling | 2.0 | 100% | 2.3 | 82% | 0% |  | 0 |  |  |  |
| bramble-toll | bandit+cutpurse+cutpurse | 2.0 | 100% | 2.9 | 84% | 0% |  | 0 |  |  |  |
| verdant-edge | briarling+briarling+thornhound | 3.0 | 100% | 2.2 | 82% | 0% |  | 0 |  |  |  |
| rotstag-glade | rotstag | 3.0 | 88% | 6.5 | 49% | 13% |  | 26 | 200 |  |  |
| tally-camp | tallyman+bandit+cutpurse | 4.1 | 100% | 4.8 | 69% | 0% |  | 0 | 197 | 3 |  |
| snag-wallow | oldsnag | 5.0 | 99% | 5.5 | 64% | 1% |  | 2 | 200 |  |  |
| bramble-deep | bandit+briarling+briarling | 5.1 | 100% | 3.2 | 65% | 0% |  | 0 |  |  |  |
| briarmaw-den | briarmaw | 6.0 | 68% | 12.7 | 49% | 32% |  | 122 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 7.7; grind fights/run 2.0
hero attack rolls: hit 65%, graze 13%, crit 7%, miss 13%, fumble 3%
random/worn-gear drops by rarity: worn 1291, wrought 777, tempered 325, runed 267, storied 252, shattered 3; named relics dropped: 621

#### direct: the critical path after the Brand (Waking 1)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:thornway | (zone patrol, 4% ran) | 7.7 | 100% | 2.5 | 65% | 1% |  | 1 |  |  |  |
| tamsin-duel | tamsin | 8.0 | 67% | 11.1 | 51% | 0% | 34% | 0 |  |  |  |
| patrol:heartroot | (zone patrol) | 8.9 | 93% | 4.0 | 60% | 7% |  | 28 |  |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 9.1 | 96% | 3.6 | 64% | 5% |  | 9 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 9.4 | 94% | 5.5 | 62% | 7% |  | 13 |  |  |  |
| rotwarden-heart | rotwarden | 9.7 | 68% | 17.0 | 43% | 33% |  | 144 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 11.7; grind fights/run 3.1
hero attack rolls: hit 67%, graze 13%, crit 8%, miss 9%, fumble 3%
random/worn-gear drops by rarity: worn 577, wrought 636, tempered 506, runed 231, storied 247; named relics dropped: 133

#### leads2: Mosswatch and Bell leads (Forewarned), then the critical path

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:mossfall | (zone patrol) | 7.7 | 100% | 3.1 | 83% | 0% |  | 0 |  |  |  |
| mw-stair | tallyman+smuggler+smuggler | 8.0 | 100% | 4.0 | 74% | 0% |  | 0 |  |  |  |
| mw-lantern | tallyman+tallyman+smuggler | 8.4 | 81% | 8.4 | 57% | 19% |  | 45 | 200 |  |  |
| patrol:hindwood | (zone patrol, 1% ran) | 9.6 | 100% | 2.5 | 86% | 0% |  | 0 |  |  |  |
| hw-glowcaps | glowcap+glowcap+glowcap | 9.7 | 100% | 2.6 | 92% | 0% |  | 0 |  |  |  |
| gloamwing-hollow | gloamwing | 10.3 | 95% | 14.2 | 64% | 6% |  | 12 | 200 |  |  |
| patrol:thornway | (zone patrol, 100% ran) | 10.7 | 100% | - | NaN% | 0% |  | 0 |  |  |  |
| tamsin-duel | tamsin | 10.7 | 78% | 12.2 | 59% | 0% | 22% | 0 |  |  |  |
| patrol:heartroot | (zone patrol, 23% ran) | 11.4 | 98% | 3.4 | 72% | 2% |  | 7 |  |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 11.5 | 100% | 3.3 | 74% | 0% |  | 0 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 11.6 | 100% | 4.5 | 76% | 1% |  | 1 |  |  |  |
| rotwarden-heart | rotwarden | 12.1 | 97% | 14.3 | 64% | 4% |  | 9 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 13.1; grind fights/run 0.8
hero attack rolls: hit 68%, graze 12%, crit 8%, miss 9%, fumble 3%
random/worn-gear drops by rarity: worn 602, wrought 1200, tempered 846, runed 326, storied 277; named relics dropped: 156

#### leads-all: every lead, then the critical path

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:mossfall | (zone patrol, 1% ran) | 8.6 | 100% | 3.0 | 85% | 0% |  | 0 |  |  |  |
| mw-stair | tallyman+smuggler+smuggler | 8.0 | 100% | 4.0 | 74% | 0% |  | 0 |  |  |  |
| mw-lantern | tallyman+tallyman+smuggler | 8.4 | 81% | 8.4 | 57% | 19% |  | 45 | 200 |  |  |
| mf-smugglers | smuggler+smuggler+smuggler | 9.7 | 100% | 2.5 | 89% | 0% |  | 0 |  |  |  |
| mire-shrine | mirelord+boglurcher+boglurcher | 10.1 | 95% | 8.4 | 53% | 5% |  | 13 | 200 |  |  |
| patrol:hindwood | (zone patrol, 5% ran) | 10.7 | 100% | 2.5 | 88% | 0% |  | 0 |  |  |  |
| hw-glowcaps | glowcap+glowcap+glowcap | 10.7 | 100% | 2.6 | 94% | 0% |  | 0 |  |  |  |
| gloamwing-hollow | gloamwing | 11.0 | 100% | 13.5 | 66% | 1% |  | 1 | 200 |  |  |
| patrol:thornway | (zone patrol, 100% ran) | 11.6 | 100% | - | NaN% | 0% |  | 0 |  |  |  |
| grove-circle | feral-druid+feral-druid+briarling | 11.6 | 100% | 11.5 | 81% | 0% |  | 0 | 200 |  |  |
| tamsin-duel | tamsin | 12.3 | 85% | 12.5 | 66% | 0% | 15% | 0 |  |  |  |
| hollowed-patrol | hollowed-ranger+hollowed-ranger+hollowed-ranger | 12.6 | 89% | 11.7 | 71% | 11% |  | 23 | 200 |  |  |
| hr1-tappers | tallyman+smuggler+smuggler | 13.4 | 100% | 6.7 | 82% | 0% |  | 0 | 200 |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 14.1 | 100% | 2.4 | 93% | 0% |  | 0 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 14.1 | 100% | 3.7 | 90% | 0% |  | 0 |  |  |  |
| rotwarden-heart | rotwarden | 14.3 | 100% | 11.8 | 78% | 0% |  | 0 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 15.1; grind fights/run 1.2
hero attack rolls: hit 69%, graze 11%, crit 8%, miss 9%, fumble 3%
random/worn-gear drops by rarity: worn 677, wrought 2296, tempered 1330, runed 562, storied 409; named relics dropped: 170

#### looper-w2: the migrated Waking-2 M2 save down the critical path

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:thornway | (zone patrol, 100% ran) | 14.0 | 100% | - | NaN% | 0% |  | 0 |  |  |  |
| tamsin-duel | tamsin | 14.0 | 96% | 13.0 | 57% | 0% | 5% | 0 |  |  |  |
| patrol:heartroot | (zone patrol, 14% ran) | 14.2 | 100% | 3.7 | 71% | 0% |  | 0 |  |  |  |
| hr1-grubs | rotgrub+rotgrub+rotgrub | 14.0 | 100% | 3.2 | 72% | 0% |  | 0 |  |  |  |
| hr1-sapwight | sapwight+rotgrub+rotgrub | 15.0 | 100% | 5.4 | 72% | 0% |  | 0 |  |  |  |
| rotwarden-heart | rotwarden | 15.0 | 91% | 19.4 | 45% | 10% |  | 32 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 16.2; grind fights/run 0.4
hero attack rolls: hit 64%, graze 12%, crit 11%, miss 10%, fumble 3%
random/worn-gear drops by rarity: worn 215, wrought 264, tempered 408, runed 409, storied 221; named relics dropped: 191

#### first-lead: each lead taken first at Waking 1

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:mossfall | (zone patrol) | 7.7 | 100% | 3.1 | 83% | 0% |  | 0 |  |  |  |
| mw-stair | tallyman+smuggler+smuggler | 8.0 | 100% | 4.0 | 74% | 0% |  | 0 |  |  |  |
| mw-lantern | tallyman+tallyman+smuggler | 8.4 | 81% | 8.4 | 57% | 19% |  | 45 | 200 |  |  |
| mf-smugglers | smuggler+smuggler+smuggler | 8.0 | 100% | 2.8 | 84% | 0% |  | 0 |  |  |  |
| mire-shrine | mirelord+boglurcher+boglurcher | 8.4 | 81% | 8.5 | 48% | 19% |  | 66 | 200 |  |  |
| patrol:hindwood | (zone patrol) | 7.7 | 100% | 2.8 | 80% | 0% |  | 0 |  |  |  |
| hw-glowcaps | glowcap+glowcap+glowcap | 8.3 | 100% | 2.7 | 89% | 0% |  | 0 |  |  |  |
| gloamwing-hollow | gloamwing | 8.4 | 75% | 15.4 | 58% | 25% |  | 85 | 200 |  |  |
| patrol:thornway | (zone patrol, 4% ran) | 7.7 | 100% | 2.5 | 65% | 1% |  | 1 |  |  |  |
| grove-circle | feral-druid+feral-druid+briarling | 8.0 | 80% | 14.4 | 66% | 20% |  | 52 | 200 |  |  |

runs cleared 800/800 (stuck 0); end party level 9.5; grind fights/run 0.9
hero attack rolls: hit 63%, graze 13%, crit 7%, miss 13%, fumble 4%
random/worn-gear drops by rarity: worn 704, wrought 1952, tempered 885, runed 263, storied 288; named relics dropped: 0

#### sunscorch: from the direct run's end (Waking 2), home to the Keep, then SUN_PATH

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:sun-road | (zone patrol) | 11.7 | 100% | 4.0 | 77% | 1% |  | 1 |  |  |  |
| sr-toll | dune-raider+dune-raider+dune-raider | 11.9 | 97% | 9.1 | 69% | 3% |  | 7 | 200 |  |  |
| patrol:dust-trail | (zone patrol) | 12.8 | 100% | 3.5 | 80% | 0% |  | 0 |  |  |  |
| dt-scorpions | glass-scorpion+glass-scorpion | 12.9 | 100% | 5.4 | 78% | 0% |  | 0 |  |  |  |
| patrol:deep-shaft | (zone patrol) | 13.4 | 100% | 4.2 | 81% | 0% |  | 0 |  |  |  |
| ds-crew | tallyman+smuggler+smuggler | 13.6 | 99% | 10.6 | 67% | 1% |  | 3 | 200 |  |  |
| kharzul-heart | kharzul | 14.5 | 68% | 20.3 | 53% | 33% |  | 157 | 400 |  |  |
| patrol:deep-shaft@back | (zone patrol, 2% ran) | 16.3 | 99% | 5.5 | 65% | 2% |  | 3 |  |  |  |
| patrol:dust-trail@back | (zone patrol, 7% ran) | 16.5 | 98% | 4.6 | 64% | 2% |  | 4 |  |  |  |
| patrol:glass-flats | (zone patrol, 3% ran) | 16.6 | 100% | 4.3 | 74% | 0% |  | 0 |  |  |  |
| gf-raiders | dune-raider+dune-raider+dune-raider | 16.8 | 94% | 6.9 | 59% | 7% |  | 15 |  |  |  |
| patrol:scorchgate | (zone patrol, 1% ran) | 17.5 | 99% | 5.4 | 69% | 1% |  | 2 |  |  |  |
| sg-captain | ash-wight+ash-wight+ash-wight | 17.6 | 96% | 9.9 | 69% | 4% |  | 8 | 200 |  |  |
| tamsin-scorchgate | tamsin | 18.4 | 68% | 13.5 | 58% | 0% | 32% | 0 |  |  |  |
| vault-guard | ash-wight+ash-wight+ash-wight | 18.9 | 90% | 7.8 | 66% | 11% |  | 21 |  |  |  |
| ashen-warden | ashen-warden | 19.3 | 70% | 19.5 | 46% | 31% |  | 133 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 21.1; grind fights/run 7.7
hero attack rolls: hit 61%, graze 13%, crit 10%, miss 13%, fumble 3%
random/worn-gear drops by rarity: worn 343, wrought 594, tempered 2080, runed 3057, storied 1472; named relics dropped: 0
party level entering the Sunscorch: 11.7

#### sunscorch-forged: the same party with weapons tempered to +4 and one gem each

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:sun-road | (zone patrol) | 11.7 | 100% | 3.0 | 82% | 0% |  | 0 |  |  |  |
| sr-toll | dune-raider+dune-raider+dune-raider | 11.9 | 100% | 7.3 | 68% | 0% |  | 0 | 200 |  |  |
| patrol:dust-trail | (zone patrol) | 12.8 | 100% | 2.7 | 83% | 0% |  | 0 |  |  |  |
| dt-scorpions | glass-scorpion+glass-scorpion | 12.9 | 100% | 4.5 | 80% | 0% |  | 0 |  |  |  |
| patrol:deep-shaft | (zone patrol) | 13.4 | 100% | 3.3 | 84% | 0% |  | 0 |  |  |  |
| ds-crew | tallyman+smuggler+smuggler | 13.6 | 100% | 8.8 | 68% | 0% |  | 0 | 200 |  |  |
| kharzul-heart | kharzul | 14.4 | 86% | 16.5 | 53% | 15% |  | 64 | 400 |  |  |
| patrol:deep-shaft@back | (zone patrol, 1% ran) | 15.8 | 99% | 4.4 | 64% | 1% |  | 2 |  |  |  |
| patrol:dust-trail@back | (zone patrol, 2% ran) | 16.0 | 98% | 3.8 | 64% | 3% |  | 5 |  |  |  |
| patrol:glass-flats | (zone patrol, 1% ran) | 16.2 | 100% | 3.6 | 76% | 0% |  | 0 |  |  |  |
| gf-raiders | dune-raider+dune-raider+dune-raider | 16.5 | 99% | 5.1 | 65% | 1% |  | 2 |  |  |  |
| patrol:scorchgate | (zone patrol, 1% ran) | 17.0 | 100% | 4.6 | 72% | 0% |  | 0 |  |  |  |
| sg-captain | ash-wight+ash-wight+ash-wight | 17.2 | 100% | 9.1 | 69% | 0% |  | 0 | 200 |  |  |
| tamsin-scorchgate | tamsin | 18.0 | 92% | 11.8 | 59% | 0% | 9% | 0 |  |  |  |
| vault-guard | ash-wight+ash-wight+ash-wight | 18.6 | 94% | 6.3 | 68% | 6% |  | 12 |  |  |  |
| ashen-warden | ashen-warden | 18.9 | 94% | 16.7 | 54% | 6% |  | 22 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 20.2; grind fights/run 2.3
hero attack rolls: hit 75%, graze 9%, crit 8%, miss 5%, fumble 3%
random/worn-gear drops by rarity: worn 246, wrought 523, tempered 1646, runed 2589, storied 1233; named relics dropped: 0
party level entering the Sunscorch: 11.7
forged: 800 heroes' weapons at +4; 783 gems set (480 in the weapon)

#### sun-first-lead: each Sunscorch lead's lair taken first: the Dust Trail's right after Sandspire (Waking 2), the Glass Flats' once Kharzul opens them (Waking 3)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:sun-road | (zone patrol) | 11.7 | 100% | 4.1 | 78% | 0% |  | 2 |  |  |  |
| sr-toll | dune-raider+dune-raider+dune-raider | 11.9 | 98% | 9.1 | 69% | 3% |  | 27 | 1000 |  |  |
| patrol:dust-trail | (zone patrol) | 12.8 | 100% | 3.5 | 78% | 0% |  | 0 |  |  |  |
| dt-scorpions | glass-scorpion+glass-scorpion | 13.0 | 100% | 5.4 | 77% | 0% |  | 2 |  |  |  |
| patrol:deep-shaft | (zone patrol) | 13.4 | 100% | 4.2 | 80% | 0% |  | 0 |  |  |  |
| ds-crew | tallyman+smuggler+smuggler | 13.6 | 98% | 10.7 | 66% | 2% |  | 12 | 600 |  |  |
| kharzul-heart | kharzul | 14.5 | 66% | 20.2 | 49% | 34% |  | 452 | 1200 |  |  |
| patrol:deep-shaft@back | (zone patrol, 1% ran) | 16.3 | 98% | 5.6 | 63% | 2% |  | 14 |  |  |  |
| patrol:dust-trail@back | (zone patrol, 6% ran) | 16.5 | 96% | 4.6 | 63% | 4% |  | 24 |  |  |  |
| patrol:glass-flats | (zone patrol, 2% ran) | 16.6 | 100% | 4.3 | 72% | 0% |  | 0 |  |  |  |
| gf-caravan | tallyman+smuggler+smuggler | 16.7 | 82% | 15.7 | 60% | 19% |  | 44 | 200 |  |  |
| wyrm-lair | sand-wyrm | 12.9 | 79% | 14.8 | 56% | 21% |  | 128 | 200 |  |  |
| gnash-camp | dune-raider+dune-raider+dune-raider | 16.8 | 81% | 11.9 | 63% | 20% |  | 46 | 200 |  |  |
| wisp-queen | mirage-wisp+mirage-wisp+mirage-wisp | 16.8 | 83% | 9.5 | 61% | 18% |  | 42 | 200 |  |  |
| dt-aqueduct | glass-scorpion+glass-scorpion+glass-scorpion | 12.9 | 83% | 8.9 | 53% | 18% |  | 70 |  |  |  |

runs cleared 1000/1000 (stuck 0); end party level 16.3; grind fights/run 3.6
hero attack rolls: hit 62%, graze 13%, crit 8%, miss 13%, fumble 4%
random/worn-gear drops by rarity: worn 1167, wrought 2177, tempered 7071, runed 4897, storied 2304; named relics dropped: 0
party level entering the Sunscorch: 11.7

#### Gate 4 targets (M4 spec §8)

| mode | node | target | result |  |
|---|---|---|---|---|
| sunscorch | kharzul-heart | wipe 1st 30-40% | 32.5% | ok |
| sunscorch | ashen-warden | wipe 1st 30-40% | 30.5% | ok |
| sunscorch | tamsin-scorchgate | win 1st 55-70% | 68% | ok |
| sunscorch-forged | kharzul-heart | wipe 1st 0-20% | 14.5% | ok |
| sunscorch-forged | ashen-warden | wipe 1st 0-20% | 6% | ok |
| sun-first-lead | gf-caravan | wipe 1st 15-25% | 18.5% | ok |
| sun-first-lead | wyrm-lair | wipe 1st 15-25% | 21% | ok |
| sun-first-lead | gnash-camp | wipe 1st 15-25% | 19.5% | ok |
| sun-first-lead | wisp-queen | wipe 1st 15-25% | 17.5% | ok |
| sun-first-lead | dt-aqueduct | wipe 1st 15-25% | 17.5% | ok |
| sunscorch | (every run) | stuck 0 | 0 | ok |
| sunscorch-forged | (every run) | stuck 0 | 0 | ok |
| sun-first-lead | (every run) | stuck 0 | 0 | ok |

#### ironspire: from the sunscorch run's end (Waking 4), home to the Keep, then IRON_PATH

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| er-wolves | rime-wolf+rime-wolf+rime-wolf | 21.1 | 100% | 3.1 | 78% | 0% |  | 0 |  |  |  |
| er-toll | brigand+brigand+brigand | 21.4 | 100% | 5.2 | 69% | 0% |  | 0 |  |  |  |
| er-camp | brigand+brigand+brigand | 21.5 | 99% | 6.7 | 66% | 2% |  | 3 |  |  |  |
| patrol:rockslide-pass | (zone patrol, 7% ran) | 21.8 | 99% | 6.2 | 63% | 1% |  | 2 |  |  |  |
| rp-brigands | brigand+brigand+brigand | 22.0 | 97% | 8.1 | 67% | 4% |  | 8 | 200 |  |  |
| rp-rocklings | rockling+rockling+rockling+rockling | 22.4 | 99% | 4.5 | 67% | 1% |  | 2 |  |  |  |
| patrol:iron-stair | (zone patrol, 7% ran) | 22.7 | 99% | 5.7 | 73% | 1% |  | 2 |  |  |  |
| is-sentinels | iron-sentinel+iron-sentinel+iron-sentinel | 22.9 | 98% | 14.2 | 69% | 3% |  | 5 | 200 |  |  |
| tamsin-ironhold | tamsin | 23.7 | 61% | 19.4 | 53% | 0% | 40% | 0 |  |  |  |
| patrol:deeps | (zone patrol, 6% ran) | 24.1 | 90% | 4.3 | 52% | 11% |  | 21 |  |  |  |
| id-forgeborn | forgeborn+forgeborn+forgeborn | 24.4 | 96% | 10.9 | 68% | 5% |  | 9 |  |  |  |
| id-bellows | forgeborn+forgeborn+forgeborn | 24.8 | 91% | 12.9 | 55% | 10% |  | 19 |  |  |  |
| mother-anvil | mother-anvil | 25.4 | 69% | 29.6 | 45% | 32% |  | 87 | 400 |  |  |
| patrol:deeps@back | (zone patrol, 13% ran) | 26.7 | 99% | 4.6 | 61% | 1% |  | 2 |  |  |  |
| patrol:frost-road | (zone patrol, 7% ran) | 26.9 | 100% | 4.4 | 69% | 1% |  | 1 |  |  |  |
| fr-cutters | tallyman+smuggler+smuggler | 27.1 | 93% | 11.5 | 69% | 7% |  | 17 | 200 |  |  |
| patrol:frostmere | (zone patrol, 11% ran) | 27.5 | 100% | 3.6 | 78% | 0% |  | 0 |  |  |  |
| fm-wraiths | rime-wraith+rime-wraith+rime-wraith | 27.7 | 98% | 6.4 | 70% | 3% |  | 5 |  |  |  |
| fb-choir | rime-wraith+rime-wraith+rime-wraith | 28.2 | 95% | 5.1 | 56% | 6% |  | 11 |  |  |  |
| patrol:frostmere@back | (zone patrol, 35% ran) | 28.6 | 99% | 4.0 | 65% | 2% |  | 3 |  |  |  |
| patrol:frostmere@again | (zone patrol, 36% ran) | 28.8 | 100% | 3.8 | 80% | 0% |  | 0 |  |  |  |
| rime-abbot | rime-abbot | 29.0 | 67% | 19.0 | 47% | 33% |  | 114 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 30.0; grind fights/run 5.4
hero attack rolls: hit 60%, graze 13%, crit 11%, miss 12%, fumble 4%
random/worn-gear drops by rarity: worn 366, wrought 900, tempered 1485, runed 2888, storied 2234; named relics dropped: 121
party level entering the Ironspire: 21.1

#### ironspire-forged: the same party with weapons tempered to +6 and one gem each

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| er-wolves | rime-wolf+rime-wolf+rime-wolf | 21.1 | 100% | 2.3 | 82% | 0% |  | 0 |  |  |  |
| er-toll | brigand+brigand+brigand | 21.4 | 100% | 4.1 | 73% | 0% |  | 0 |  |  |  |
| er-camp | brigand+brigand+brigand | 21.5 | 100% | 5.3 | 69% | 0% |  | 0 |  |  |  |
| patrol:rockslide-pass | (zone patrol, 7% ran) | 21.7 | 100% | 4.4 | 67% | 0% |  | 0 |  |  |  |
| rp-brigands | brigand+brigand+brigand | 22.1 | 100% | 6.1 | 69% | 1% |  | 1 | 200 |  |  |
| rp-rocklings | rockling+rockling+rockling+rockling | 22.5 | 100% | 3.9 | 70% | 1% |  | 1 |  |  |  |
| patrol:iron-stair | (zone patrol, 7% ran) | 22.7 | 100% | 4.2 | 78% | 0% |  | 0 |  |  |  |
| is-sentinels | iron-sentinel+iron-sentinel+iron-sentinel | 23.0 | 100% | 10.9 | 73% | 0% |  | 0 | 200 |  |  |
| tamsin-ironhold | tamsin | 23.7 | 77% | 14.9 | 55% | 0% | 24% | 0 |  |  |  |
| patrol:deeps | (zone patrol, 7% ran) | 24.1 | 97% | 3.4 | 57% | 4% |  | 7 |  |  |  |
| id-forgeborn | forgeborn+forgeborn+forgeborn | 24.4 | 100% | 7.7 | 69% | 1% |  | 1 |  |  |  |
| id-bellows | forgeborn+forgeborn+forgeborn | 24.9 | 99% | 9.6 | 60% | 1% |  | 2 |  |  |  |
| mother-anvil | mother-anvil | 25.4 | 94% | 21.1 | 49% | 7% |  | 17 | 400 |  |  |
| patrol:deeps@back | (zone patrol, 9% ran) | 26.4 | 100% | 3.5 | 61% | 0% |  | 0 |  |  |  |
| patrol:frost-road | (zone patrol, 3% ran) | 26.5 | 100% | 3.3 | 72% | 0% |  | 0 |  |  |  |
| fr-cutters | tallyman+smuggler+smuggler | 26.8 | 99% | 8.5 | 67% | 1% |  | 2 | 200 |  |  |
| patrol:frostmere | (zone patrol, 5% ran) | 27.2 | 100% | 3.1 | 81% | 0% |  | 0 |  |  |  |
| fm-wraiths | rime-wraith+rime-wraith+rime-wraith | 27.3 | 100% | 5.1 | 72% | 1% |  | 1 |  |  |  |
| fb-choir | rime-wraith+rime-wraith+rime-wraith | 27.9 | 98% | 4.0 | 64% | 2% |  | 4 |  |  |  |
| patrol:frostmere@back | (zone patrol, 23% ran) | 28.3 | 100% | 3.1 | 69% | 0% |  | 0 |  |  |  |
| patrol:frostmere@again | (zone patrol, 26% ran) | 28.4 | 100% | 3.0 | 82% | 0% |  | 0 |  |  |  |
| rime-abbot | rime-abbot | 28.6 | 85% | 15.1 | 52% | 15% |  | 53 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 29.5; grind fights/run 1.6
hero attack rolls: hit 77%, graze 5%, crit 11%, miss 3%, fumble 4%
random/worn-gear drops by rarity: worn 299, wrought 791, tempered 1474, runed 2813, storied 1974; named relics dropped: 153
party level entering the Ironspire: 21.1
forged: 800 heroes' weapons at +6; 799 gems set (585 in the weapon)

#### iron-first-lead: each Ironspire lead's lair taken first: the Roc's and Old Horn's from Peak's Veil and the Journeyman's from the Deeps (Waking 4), the Drowned Abbess's once the Brand of Iron opens the Frost Road (Waking 5)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| er-wolves | rime-wolf+rime-wolf+rime-wolf | 21.1 | 100% | 3.1 | 78% | 0% |  | 0 |  |  |  |
| er-toll | brigand+brigand+brigand | 21.4 | 100% | 5.2 | 69% | 0% |  | 0 |  |  |  |
| er-camp | brigand+brigand+brigand | 21.5 | 99% | 6.7 | 66% | 2% |  | 14 |  |  |  |
| patrol:rockslide-pass | (zone patrol, 6% ran) | 21.8 | 98% | 6.2 | 62% | 2% |  | 18 |  |  |  |
| rp-brigands | brigand+brigand+brigand | 22.0 | 98% | 8.0 | 66% | 2% |  | 18 | 800 |  |  |
| rp-rocklings | rockling+rockling+rockling+rockling | 22.4 | 99% | 4.6 | 66% | 1% |  | 11 |  |  |  |
| patrol:highfold | (zone patrol, 6% ran) | 22.7 | 100% | 3.5 | 80% | 0% |  | 0 |  |  |  |
| hf-trolls | peak-troll+peak-troll | 22.9 | 100% | 6.2 | 75% | 0% |  | 0 |  |  |  |
| roc-eyrie | thunder-roc | 23.3 | 81% | 14.7 | 39% | 20% |  | 59 | 200 |  |  |
| patrol:iron-stair | (zone patrol, 7% ran) | 22.7 | 100% | 5.5 | 74% | 0% |  | 2 |  |  |  |
| troll-cave | peak-troll+peak-troll | 22.9 | 80% | 16.2 | 57% | 20% |  | 41 | 200 |  |  |
| is-sentinels | iron-sentinel+iron-sentinel+iron-sentinel | 22.9 | 97% | 13.8 | 69% | 3% |  | 13 | 400 |  |  |
| tamsin-ironhold | tamsin | 23.7 | 61% | 19.1 | 54% | 0% | 40% | 0 |  |  |  |
| patrol:deeps | (zone patrol, 8% ran) | 24.1 | 87% | 4.4 | 53% | 14% |  | 54 |  |  |  |
| id-forgeborn | forgeborn+forgeborn+forgeborn | 24.4 | 97% | 11.0 | 69% | 3% |  | 12 |  |  |  |
| id-smith | forgeborn+forgeborn | 24.8 | 78% | 24.0 | 61% | 22% |  | 51 | 200 |  |  |
| id-bellows | forgeborn+forgeborn+forgeborn | 24.8 | 92% | 12.7 | 51% | 9% |  | 17 |  |  |  |
| mother-anvil | mother-anvil | 25.4 | 65% | 29.3 | 47% | 35% |  | 103 | 400 |  |  |
| patrol:deeps@back | (zone patrol, 15% ran) | 26.7 | 100% | 4.5 | 60% | 0% |  | 0 |  |  |  |
| patrol:frost-road | (zone patrol, 5% ran) | 26.9 | 99% | 4.3 | 67% | 1% |  | 2 |  |  |  |
| fr-cutters | tallyman+smuggler+smuggler | 27.1 | 91% | 11.7 | 66% | 10% |  | 19 | 200 |  |  |
| patrol:frostmere | (zone patrol, 11% ran) | 27.5 | 100% | 3.8 | 78% | 0% |  | 0 |  |  |  |
| fm-shrine | rime-wraith+rime-wraith+rime-wraith | 27.7 | 78% | 10.2 | 62% | 22% |  | 51 | 200 |  |  |

runs cleared 800/800 (stuck 0); end party level 25.4; grind fights/run 1.9
hero attack rolls: hit 62%, graze 12%, crit 11%, miss 11%, fumble 4%
random/worn-gear drops by rarity: worn 664, wrought 1777, tempered 2831, runed 6410, storied 3641; named relics dropped: 242
party level entering the Ironspire: 21.1

#### Gate 5 targets (M5 spec §8)

| mode | node | target | result |  |
|---|---|---|---|---|
| ironspire | mother-anvil | wipe 1st 30-40% | 31.5% | ok |
| ironspire | rime-abbot | wipe 1st 30-40% | 33% | ok |
| ironspire | tamsin-ironhold | win 1st 55-70% | 60.5% | ok |
| ironspire-forged | mother-anvil | wipe 1st 0-20% | 6.5% | ok |
| ironspire-forged | rime-abbot | wipe 1st 0-20% | 15% | ok |
| iron-first-lead | roc-eyrie | wipe 1st 15-25% | 19.5% | ok |
| iron-first-lead | troll-cave | wipe 1st 15-25% | 20% | ok |
| iron-first-lead | id-smith | wipe 1st 15-25% | 22% | ok |
| iron-first-lead | fm-shrine | wipe 1st 15-25% | 22% | ok |
| ironspire | (every run) | stuck 0 | 0 | ok |
| ironspire-forged | (every run) | stuck 0 | 0 | ok |
| iron-first-lead | (every run) | stuck 0 | 0 | ok |

#### gloomfen: from the ironspire run's end (Waking 6), home to the Keep, then GLOOM_PATH

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:murkway | (zone patrol, 49% ran) | 30.0 | 100% | 6.6 | 75% | 0% |  | 0 |  |  |  |
| mk-leeches | mire-leech+mire-leech+mire-leech | 30.2 | 100% | 5.4 | 69% | 0% |  | 0 |  |  |  |
| mk-reedcutters | smuggler+smuggler+tallyman | 30.5 | 100% | 6.7 | 68% | 0% |  | 0 |  |  |  |
| wm-wights | willow-wight+willow-wight | 30.7 | 100% | 9.9 | 72% | 1% |  | 1 |  |  |  |
| tamsin-rotbridge | tamsin | 30.9 | 64% | 18.1 | 53% | 0% | 36% | 0 |  |  |  |
| patrol:lanternfen | (zone patrol, 62% ran) | 31.3 | 100% | 3.8 | 88% | 0% |  | 0 |  |  |  |
| lf-moths | lamp-moth+lamp-moth+lamp-moth+lamp-moth | 31.4 | 100% | 3.0 | 82% | 0% |  | 0 |  |  |  |
| lf-hags | bog-hag+bog-hag+mire-leech | 31.6 | 99% | 10.4 | 71% | 2% |  | 3 |  |  |  |
| lantern-mother | lantern-mother | 31.9 | 66% | 32.2 | 49% | 34% |  | 126 | 400 |  |  |
| patrol:lanternfen@back | (zone patrol, 52% ran) | 33.3 | 100% | 3.6 | 68% | 0% |  | 0 |  |  |  |
| patrol:boardwalk | (zone patrol, 32% ran) | 33.4 | 100% | 4.3 | 82% | 0% |  | 0 |  |  |  |
| lb-drowned | drowned+drowned+drowned | 33.6 | 99% | 6.8 | 60% | 1% |  | 2 |  |  |  |
| patrol:misthollow | (zone patrol, 45% ran) | 34.0 | 100% | 4.0 | 73% | 0% |  | 0 |  |  |  |
| mh-salvage | tallyman+smuggler+smuggler | 34.1 | 95% | 13.6 | 65% | 6% |  | 12 | 200 |  |  |
| mh-ringers | drowned+drowned+drowned | 34.4 | 89% | 5.6 | 53% | 12% |  | 23 |  |  |  |
| patrol:blackwater | (zone patrol, 43% ran) | 34.9 | 93% | 7.0 | 60% | 8% |  | 15 |  |  |  |
| br-barge | smuggler+smuggler+smuggler | 35.1 | 100% | 8.4 | 62% | 1% |  | 1 |  |  |  |
| patrol:tidal-flats | (zone patrol, 52% ran) | 35.2 | 97% | 6.3 | 55% | 3% |  | 6 |  |  |  |
| tf-bargemaster | tallyman+smuggler+smuggler | 35.3 | 92% | 16.0 | 59% | 8% |  | 18 | 200 |  |  |
| blackwater-leviathan | blackwater-leviathan | 35.6 | 64% | 27.8 | 28% | 36% |  | 93 | 400 |  |  |

runs cleared 200/200 (stuck 0); end party level 36.6; grind fights/run 5.7
hero attack rolls: hit 60%, graze 13%, crit 11%, miss 12%, fumble 4%
random/worn-gear drops by rarity: worn 147, wrought 447, tempered 1005, runed 2368, storied 2160; named relics dropped: 128
party level entering the Gloomfen: 30.0

#### gloomfen-forged: the same party with weapons tempered to +8 and one gem each; Hodge at the end of the region

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:murkway | (zone patrol, 49% ran) | 30.0 | 100% | 5.4 | 77% | 0% |  | 0 |  |  |  |
| mk-leeches | mire-leech+mire-leech+mire-leech | 30.2 | 100% | 3.8 | 72% | 0% |  | 0 |  |  |  |
| mk-reedcutters | smuggler+smuggler+tallyman | 30.6 | 100% | 4.6 | 74% | 0% |  | 0 |  |  |  |
| wm-wights | willow-wight+willow-wight | 30.7 | 100% | 7.2 | 75% | 1% |  | 1 |  |  |  |
| tamsin-rotbridge | tamsin | 30.9 | 82% | 14.4 | 53% | 0% | 18% | 0 |  |  |  |
| patrol:lanternfen | (zone patrol, 67% ran) | 31.4 | 100% | 2.6 | 90% | 0% |  | 0 |  |  |  |
| lf-moths | lamp-moth+lamp-moth+lamp-moth+lamp-moth | 31.4 | 100% | 2.4 | 85% | 0% |  | 0 |  |  |  |
| lf-hags | bog-hag+bog-hag+mire-leech | 31.7 | 100% | 7.6 | 76% | 0% |  | 0 |  |  |  |
| lantern-mother | lantern-mother | 31.9 | 91% | 21.7 | 50% | 9% |  | 22 | 400 |  |  |
| patrol:lanternfen@back | (zone patrol, 43% ran) | 33.0 | 100% | 2.8 | 71% | 0% |  | 0 |  |  |  |
| patrol:boardwalk | (zone patrol, 18% ran) | 33.1 | 100% | 3.2 | 84% | 0% |  | 0 |  |  |  |
| lb-drowned | drowned+drowned+drowned | 33.2 | 100% | 5.9 | 65% | 1% |  | 1 |  |  |  |
| patrol:misthollow | (zone patrol, 36% ran) | 33.6 | 100% | 3.0 | 76% | 0% |  | 0 |  |  |  |
| mh-salvage | tallyman+smuggler+smuggler | 33.8 | 100% | 9.5 | 68% | 0% |  | 0 | 200 |  |  |
| mh-ringers | drowned+drowned+drowned | 34.1 | 97% | 5.2 | 57% | 3% |  | 6 |  |  |  |
| patrol:blackwater | (zone patrol, 25% ran) | 34.5 | 97% | 5.3 | 60% | 4% |  | 7 |  |  |  |
| br-barge | smuggler+smuggler+smuggler | 34.7 | 100% | 6.6 | 66% | 0% |  | 0 |  |  |  |
| patrol:tidal-flats | (zone patrol, 35% ran) | 34.8 | 99% | 5.0 | 60% | 2% |  | 3 |  |  |  |
| tf-bargemaster | tallyman+smuggler+smuggler | 35.0 | 99% | 11.4 | 63% | 1% |  | 2 | 200 |  |  |
| blackwater-leviathan | blackwater-leviathan | 35.2 | 84% | 21.8 | 30% | 17% |  | 66 | 400 |  |  |
| hodge | hodge | 36.3 | 58% | 18.2 | 38% | 42% |  | 84 | 116 |  |  |

runs cleared 200/200 (stuck 0); end party level 36.5; grind fights/run 2.0
hero attack rolls: hit 75%, graze 5%, crit 12%, miss 4%, fumble 4%
random/worn-gear drops by rarity: worn 128, wrought 400, tempered 985, runed 2375, storied 1943; named relics dropped: 164
party level entering the Gloomfen: 30.0
forged: 800 heroes' weapons at +8; 800 gems set (708 in the weapon)

#### gloom-first-lead: each Gloomfen lead's lair taken first: Grandfather Willow's, Hodge's (on arrival) and Mother Grue's (Waking 6), the Drowned Cantor's and Old Jaws's once the Brand of Lanterns opens the boardwalk (Waking 7)

| node | foes | lvl | win 1st | rounds | hp left | wipe 1st | yield | wipes | claimed | shattered | stuck |
|---|---|---|---|---|---|---|---|---|---|---|---|
| patrol:murkway | (zone patrol, 45% ran) | 30.0 | 100% | 6.8 | 75% | 0% |  | 0 |  |  |  |
| mk-leeches | mire-leech+mire-leech+mire-leech | 30.2 | 100% | 5.5 | 68% | 0% |  | 1 |  |  |  |
| mk-reedcutters | smuggler+smuggler+tallyman | 30.5 | 100% | 6.7 | 67% | 0% |  | 0 |  |  |  |
| wm-wights | willow-wight+willow-wight | 30.7 | 100% | 9.8 | 72% | 0% |  | 4 |  |  |  |
| wm-willow | willow-wight+willow-wight | 30.9 | 76% | 25.7 | 64% | 24% |  | 77 | 200 |  |  |
| hodge | hodge | 30.9 | 28% | 23.6 | 35% | 72% |  | 144 | 56 |  |  |
| tamsin-rotbridge | tamsin | 30.9 | 68% | 18.1 | 52% | 0% | 32% | 0 |  |  |  |
| patrol:lanternfen | (zone patrol, 56% ran) | 31.3 | 100% | 3.7 | 88% | 0% |  | 0 |  |  |  |
| grue-hollow | bog-hag+bog-hag | 31.4 | 76% | 31.4 | 59% | 25% |  | 71 | 200 |  |  |
| lf-moths | lamp-moth+lamp-moth+lamp-moth+lamp-moth | 31.4 | 100% | 3.1 | 82% | 0% |  | 0 |  |  |  |
| lf-hags | bog-hag+bog-hag+mire-leech | 31.6 | 100% | 10.5 | 70% | 1% |  | 2 |  |  |  |
| lantern-mother | lantern-mother | 31.9 | 62% | 32.1 | 49% | 38% |  | 272 | 800 |  |  |
| patrol:lanternfen@back | (zone patrol, 57% ran) | 33.4 | 100% | 3.8 | 71% | 0% |  | 0 |  |  |  |
| patrol:boardwalk | (zone patrol, 33% ran) | 33.5 | 100% | 4.4 | 81% | 0% |  | 0 |  |  |  |
| lb-drowned | drowned+drowned+drowned | 33.6 | 100% | 6.8 | 61% | 0% |  | 0 |  |  |  |
| patrol:misthollow | (zone patrol, 44% ran) | 34.0 | 100% | 4.1 | 72% | 0% |  | 0 |  |  |  |
| mh-salvage | tallyman+smuggler+smuggler | 34.1 | 95% | 13.6 | 66% | 5% |  | 21 | 400 |  |  |
| db-choir | drowned+drowned+drowned | 34.5 | 100% | 5.7 | 73% | 0% |  | 0 |  |  |  |
| cantor | drowned+drowned+drowned | 35.0 | 80% | 25.0 | 63% | 20% |  | 42 | 200 |  |  |
| mh-ringers | drowned+drowned+drowned | 34.5 | 89% | 5.9 | 50% | 12% |  | 23 |  |  |  |
| patrol:blackwater | (zone patrol, 42% ran) | 34.9 | 91% | 7.2 | 59% | 9% |  | 18 |  |  |  |
| br-barge | smuggler+smuggler+smuggler | 35.1 | 99% | 8.6 | 60% | 1% |  | 2 |  |  |  |
| old-jaws | blackwater-gar+blackwater-gar+blackwater-gar | 35.2 | 80% | 15.2 | 57% | 21% |  | 46 | 200 |  |  |

runs cleared 1000/1000 (stuck 0); end party level 33.3; grind fights/run 2.5
hero attack rolls: hit 63%, graze 11%, crit 12%, miss 10%, fumble 4%
random/worn-gear drops by rarity: worn 404, wrought 1233, tempered 2483, runed 5934, storied 5253; named relics dropped: 406
party level entering the Gloomfen: 30.0

#### Gate 6 targets (M6 spec §8)

| mode | node | target | result |  |
|---|---|---|---|---|
| gloomfen | lantern-mother | wipe 1st 30-40% | 34% | ok |
| gloomfen | blackwater-leviathan | wipe 1st 30-40% | 36% | ok |
| gloomfen | tamsin-rotbridge | win 1st 55-70% | 64% | ok |
| gloomfen-forged | lantern-mother | wipe 1st 0-20% | 9% | ok |
| gloomfen-forged | blackwater-leviathan | wipe 1st 0-20% | 16.5% | ok |
| gloomfen-forged | hodge | win 1st 50-100% | 58% | ok |
| gloom-first-lead | wm-willow | wipe 1st 15-25% | 24% | ok |
| gloom-first-lead | grue-hollow | wipe 1st 15-25% | 24.5% | ok |
| gloom-first-lead | cantor | wipe 1st 15-25% | 20% | ok |
| gloom-first-lead | old-jaws | wipe 1st 15-25% | 20.5% | ok |
| gloom-first-lead | hodge | wipe 1st 60-80% | 72% | ok |
| gloomfen | (every run) | stuck 0 | 0 | ok |
| gloomfen-forged | (every run) | stuck 0 | 0 | ok |
| gloom-first-lead | (every run) | stuck 0 | 0 | ok |
