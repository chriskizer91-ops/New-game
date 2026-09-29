# M5 P4: foes, relics and balance (the Ironspire Peaks)

Built against `docs/M5-SPEC.md` §2.6 (levels), §3.2-§3.5, §3.7 (spoils), §8 (balance). This file is kept current
as I go, so a stop never loses the state.

## Status (where I am)

- [x] Foe families (§3.2): all ten written, no stubs left; the Tallymen's `ice-cutter` and `sawyer`; a `forge-spark`
      rabble (the Bellows' sparks and the Deeps' patrols, §2.6 "forge-sparks"); a no-relic `brigand/sergeant` veteran
      for the lead's East Road camp.
- [x] Encounters (§3.3): the nineteen with the spec's spawns, plus the lead's three East Road fights (`er-wolves`,
      `er-toll`, `er-camp`, landed, on `hearth-road`); Tamsin on `$rival:ironhold`; every Ironspire fight on its map's
      backdrop (§6.2; the Deeps' fights on `ironhold-deeps`).
- [x] Relics 39-52 (§3.4): real stats, Surges, lore, deeds, sockets, awakening branches (hand-named for the four
      Champion pieces).
- [x] M4's approximations made exact (§2.4): Kharzul's Burrow (`burrowed`, then `erupt`), the Sand Wyrm's Swallow
      (`swallowed`), the wisps' and the Wisp-Queen's Beguile (`charmed`). M4 retune: in progress (see Balance).
- [x] `tools/sim.mjs`: modes `ironspire`, `ironspire-forged`, `iron-first-lead`; `--jobs N`; `--sun-cache`.
- [x] Tests: `test/data.test.mjs`, `test/loot.test.mjs`, `test/battle.test.mjs` (M5 sections).
- [ ] Balance (§8): tuning in progress (numbers below are the latest run).
- [ ] `docs/RULES.md` M5 section.
- [x] Backdrops switched to the map ids (P6 painted them; `IRON_BD` is gone, the eleven ids are in `BACKDROPS`).
      A backdrop changes no rule, so the balance runs before the switch still hold.

## Decisions to know about

1. **Every Ironspire spawn keeps at most three Waking Omens** (`wakeOmenCap: 3` in the `IRON` and `IRON_R` helpers).
   At Waking 4-5 an elite would otherwise carry four or five of the six Omens: every foe looked alike, and a frost
   wraith or the Rime-Abbot came out Emberblooded (resisting the ember the spec makes it weak to).
2. **Champions and the named lair holders carry chosen Omens** (`omens: [...]`, `wakeOmenCap: 0`): a base level also
   picks a spawn's Omens, so a level change used to swing a lair by 20 points (Old Horn at Waking-0 level 8 drew
   Twinned and Frenzied, at 9 Swift). Chosen: Mother Anvil Thornskinned, Frenzied, Ironclad; the Rime-Abbot Frenzied,
   Ironclad; the Thunder-Roc Swift, Frenzied, Thornskinned; Old Horn Frenzied, Swift; Harrow's Journeyman Frenzied,
   Swift; the Drowned Abbess Thornskinned, Swift; Rhune Swift; the Cutter-Chief Ironclad. None of them is ever Twinned.
3. **Tamsin at Ironhold** keeps the spec's spawn line (party + 4, gear tier 4) with three Omens on top (Swift,
   Ironclad, Thornskinned), as M4 added Swift at Scorchgate. Her Ironhold kit in `data/rivals.js` is unchanged.
4. **Kharzul's exact Burrow**: the Burrow turn goes under (`burrowed`), and the forced `erupt` is a 4d10 piercing
   strike that Staggers and Bleeds (two stacks), then Guarding. With M4's 3d8 the Burrow round became a free round for
   the party (nothing to hit: they brace and heal) and Kharzul fell to 27%.
5. **`forge-spark`** is an eleventh Ironspire family (rabble, ember): spec §2.6 names "forge-sparks" as the Deeps'
   patrols and §3.2 has the Bellows "summon sparks". It needs a battle sprite (P6) and a map sprite (P5).

## Art keys for the battle-art package (P6) and the overworld package (P5)

Every key below is named by `data/foes.js` (`art:`). `test/art-keys.test.mjs` fails for each until it is drawn.
Families (the tier and look):

| key | family | tier | look |
|---|---|---|---|
| `rime-wolf` | rime-wolf | rabble, beast, frost | a lean grey-white wolf, frost in its ruff and on its muzzle, pale blue eyes; breath steaming |
| `brigand` | brigand | rabble, humanoid (gear tiers 0-3) | a Stormwatch deserter: a torn army surcoat (slate blue with a storm badge picked off), fur collar; hand axe or sword, crossbow on the back at higher tiers |
| `rockling` | rockling | rabble, construct, stone | a knee-high heap of grey scree that stood up: boulder body, pebble limbs, two chips of mica for eyes; rolls |
| `forge-spark` | forge-spark | rabble, construct, ember | a fist-sized living cinder: a bright ember core in a cage of slag, trailing sparks |
| `iron-sentinel` | iron-sentinel | veteran, construct, stone | a dwarven automaton of riveted iron plate, broad and squat, a rune-lit visor slit, a round dwarf shield and a fist like an anvil |
| `forgeborn` | forgeborn | veteran, construct, ember | Harrow's molten servant: a hunched man-shape of black slag with orange heat showing in the cracks, a furnace glow in the chest |
| `peak-troll` | peak-troll | veteran, beast, stone | a big grey-green mountain troll, mossy stone warts, long arms, a tree-limb club; wounds that visibly knit |
| `rime-wraith` | rime-wraith | veteran, undead, frost | a drowned monk of Frostmere: sodden grey habit rimed with frost, hood, blue-white face, water dripping and freezing |
| `thunder-roc` | thunder-roc | relic-bearer, beast, storm (lair) | a barn-sized storm-grey eagle, lightning along its pinions, great talons; a shepherd's cloak of its own feathers snagged on one talon (the Roc-Feather Cloak) |
| `mother-anvil` | mother-anvil | champion, construct, ember (3 phases) | Harrow's first forge-golem: an anvil the size of a cart on four iron legs, the Worldforge Hammer in one arm, the Anvil Heart glowing through its ribs; each piece gone when snapped off |
| `rime-abbot` | rime-abbot | champion, undead, frost (3 phases) | Brother Aurel: a tall frozen abbot, beard of icicles, the Rime Crozier (blue-lit) in his hand, the Hushweave Cowl (grey, faintly moving) on his head; each gone when snapped off |

Variants with their own look (the East Road's `brigand/sergeant` has none: it draws as a `brigand`):

| key | variant | look |
|---|---|---|
| `rhune` | brigand `warden` (Rhune the Pass-Warden, relic-bearer) | the deserters' captain: an officer's coat, a toll-chain over one shoulder, the Windstep Boots (storm-blue, feathered at the heel) |
| `sentinel-captain` | iron-sentinel `captain` (relic-bearer) | a taller sentinel with a crested helm and a gold rune-band, holding Ironwall (a dwarf door-shield) |
| `bellows` | forgeborn `bellows` (veteran) | a forgeborn built around a great leather bellows on its back, spark-plume from the nozzle |
| `journeyman` | forgeborn `journeyman` (Harrow's Journeyman, relic-bearer) | half man, half forge: a smith's apron over slag skin, one hand still flesh, carrying Harrow's Runestaff |
| `old-horn` | peak-troll `old-horn` (Old Horn, relic-bearer) | an ancient one-horned troll, grey muzzle, wearing the Trollhide Mantle (patchwork of other trolls' hides) |
| `drowned-abbess` | rime-wraith `abbess` (the Drowned Abbess, relic-bearer) | an abbess's wimple and veil, frozen stiff, swinging the Drowned Censer (wet smoke) |
| `choir-wraith` | rime-wraith `choir` (veteran) | a hooded rime-wraith with its mouth open in one long note; a hymnal frozen to its hands |
| `cutter-chief` | tallyman `ice-cutter` (the Cutter-Chief, relic-bearer) | a Tallyman in a fur-lined ledger-coat with snow goggles, carrying the Cutter's Pick (an ice-pick axe, frost-blue) |
| `sawyer` | smuggler `sawyer` (rabble) | a smuggler in furs and ice-cleats, one end of a long two-man ice saw |

## Backdrops

Done: each M5 encounter's `backdrop` is its map id (§6.2): `rockslide-pass`, `peaks-veil`, `highfold`, `iron-stair`,
`ironhold`, `ironhold-deeps` (the Deeps' fights: `id-forgeborn`, `id-bellows`, `id-smith`), `harrows-forge`,
`stormwatch`, `frost-road`, `frostmere`, `frostmere-below`; all eleven are in `BACKDROPS`. The East Road's three
fights use `hearth-road` (the lead's choice: green roads). `test/data.test.mjs` and `test/art-keys.test.mjs` pass.

## Needs from others

1. ~~Lead: a summon's `variant`~~ (landed: the Rime-Abbot calls his `choir`).
2. ~~Lead: an explicit `weak` beats the wheel's x0.5~~ (landed: frost is x1.5 on Mother Anvil).
3. ~~Lead: Ironspire spoils and Frost Opals in `spoils()`~~ (landed). My table: `TUNING.forge.opals` = `fm-wraiths` 1,
   `fm-shrine` 1, `fb-choir` 1, `rime-abbot` 2.
4. **P2 (`data/world.js` ZONES): the zone levels are mine to tune (§2.6)**; so far the scaffold's (13, 14, 14, 15, 16,
   16) hold. I will say here if one should move.
5. **Lead (the East Road):** your note says the party arrives from the Sunscorch at about level 15; in the sim it is
   level 21 (the `sunscorch` run ends at 21.1-21.3, Waking 4). The three fights are levelled for that party.
   If `IRON_PATH` gains them, the sim already walks them first (`IRON_START`).

## Balance (in progress; 200 seeds, starters rotated, `node tools/sim.mjs --seeds 200 --jobs 4`)

M3/M4.5 baseline before any M5 change reproduced `docs/M45-STATUS.md` exactly (Kharzul 34%, the Warden 36%, Tamsin 65%,
forged 18%/13%, leads 22/19/21/19/19%; M3 modes unchanged).

Latest Ironspire run (with the East Road): Mother Anvil 30%, the Rime-Abbot 25%, Tamsin at Ironhold 61% win; forged
4% / 15%; leads: the Roc 13%, Old Horn 17%, the Journeyman 18%, the Drowned Abbess 24%; one stuck run at Mother Anvil
(a party whose four weapons are all ember or crush). Next: the stuck tail at Mother Anvil, the Abbot up to ~35%, the Roc
up to ~20%.

Tuning aids (private, not in the tree): a Sunscorch end-state cache (`--sun-cache`) and pre-fight state caches, so one
fight can be re-run 200 times in a minute.
