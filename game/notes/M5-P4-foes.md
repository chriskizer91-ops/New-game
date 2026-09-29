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
      (`swallowed`), the wisps' and the Wisp-Queen's Beguile (`charmed`). M4 retuned: Kharzul's Erupt (decision 4)
      and the caravan's plain smuggler (decision 9); every M4 target holds (see Balance).
- [x] `tools/sim.mjs`: modes `ironspire`, `ironspire-forged`, `iron-first-lead`; `--jobs N`; `--sun-cache`; the
      East Road and the Last Camp Fire first; the re-arm after an Ironspire wipe (decision 7); a gate table shows a
      half point as one (25.5%, not 26%).
- [x] Tests: `test/data.test.mjs`, `test/loot.test.mjs`, `test/battle.test.mjs` (M5 sections).
- [x] Balance (§8): every Gate 5 target met, zero stuck in every mode, M3 identical, M4 all passing (table below).
- [x] `docs/RULES.md` M5: the three statuses (§4), M5 foes and M4's exact stand-ins (§5), the Champions' pieces
      (§6), relics 39-52 (§7), forge spoils and Frost Opals (§9), and Gate 5 with its tables (§12).
- [x] Backdrops switched to the map ids (P6 painted them; `IRON_BD` is gone, the eleven ids are in `BACKDROPS`).
      A backdrop changes no rule, so the balance runs before the switch still hold.

## Decisions to know about

1. **Every Ironspire spawn keeps at most three Waking Omens** (`wakeOmenCap: 3` in the `IRON` and `IRON_R` helpers).
   At Waking 4-5 an elite would otherwise carry four or five of the six Omens: every foe looked alike, and a frost
   wraith or the Rime-Abbot came out Emberblooded (resisting the ember the spec makes it weak to).
2. **Champions and the named lair holders carry chosen Omens** (`omens: [...]`, `wakeOmenCap: 0`): a base level also
   picks a spawn's Omens, so a level change used to swing a lair by 20 points (Old Horn at Waking-0 level 8 drew
   Twinned and Frenzied, at 9 Swift). Chosen: Mother Anvil Thornskinned, Frenzied, Ironclad; the Rime-Abbot Frenzied,
   Swift (see 6); the Thunder-Roc Swift, Frenzied, Thornskinned; Old Horn Frenzied, Swift; Harrow's Journeyman
   Frenzied, Swift; the Drowned Abbess Thornskinned, Swift; Rhune Swift; the Cutter-Chief Ironclad. None of them is
   ever Twinned.
3. **Tamsin at Ironhold** keeps the spec's spawn line (party + 4, gear tier 4) with three Omens on top (Swift,
   Ironclad, Thornskinned), as M4 added Swift at Scorchgate. **Her Ironhold kit (`data/rivals.js`): Iron Grip is 2d8
   (was 1d8)**, the only change there (shape kept): the East Road's extra fights brought the party to her at 66.5%
   party wins, and 2d8 puts it at 61%. A fourth Omen was far too much (Frenzied: 19-29%).
4. **Kharzul's exact Burrow**: the Burrow turn goes under (`burrowed`), and the forced `erupt` is a 4d10 piercing
   strike that Staggers and Bleeds (two stacks), then Guarding. With M4's 3d8 the Burrow round became a free round for
   the party (nothing to hit: they brace and heal) and Kharzul fell to 27%.
5. **`forge-spark`** is an eleventh Ironspire family (rabble, ember): spec §2.6 names "forge-sparks" as the Deeps'
   patrols and §3.2 has the Bellows "summon sparks". It needs a battle sprite (P6) and a map sprite (P5).
6. **The Rime-Abbot is slow (speed 8) and Swift from the start (so 12).** A lost fight makes a Champion a Grudge with
   one more Omen it lacks (rules, capped at one). With Frenzied and Ironclad chosen, a Grudge could add Swift, and
   Swift on a Frenzied Abbot is +40-50 points of wipes: the retries after a wipe got harder than the first try and
   2-4 runs in 200 were stuck. With Swift already his, a Grudge adds only Emberblooded, Thornskinned or Ironclad.
   His difficulty was nearly all Frenzied's burst under 25% (without it: 2-4% wipes), which a forged party escapes
   only a little (forged 24% at 35% unforged). So his last phase rolls Rime Nova less (6 faces in 20, was 8; Crozier
   Strike 8, Heartbeat 6) and hits harder all fight (dmg 7), with Guard 21 (the forge's +6 to hit counts for more):
   35% unforged, 14% forged, zero stuck.
7. **The sim's party re-arms after an Ironspire wipe** (`rearm()` in `tools/sim.mjs`, Ironspire modes only, so M3/M4
   numbers are untouched): each hero takes the bag weapon that hits the foe that beat them hardest (hit chance x
   average x the damage multiplier), when it beats the one in hand by a fifth, and puts the old one back when the
   fight is done. A player reads Mother Anvil's card (crush-resistant plate, weak to frost); the sim did not, and a
   party whose four weapons were all ember or crush (0.31-0.63x on her) was stuck at eight tries while its bag held a
   Stillwater Lance and a frost spear. First tries never re-arm, so first-try numbers are the scripted policy's.
8. **The East Road in the sim** (the lead's IRON_PATH): Keep, `er-wolves`, `er-toll`, a rest at `camp-fire`,
   `er-camp`, then the pass. The East Road maps have no zone, so no patrols; a wipe there grinds on the Rockslide
   Pass's.
9. **The caravan (`gf-caravan`, M4): its plain smuggler is level 6 (was 7)**, at the lead's request: Kharzul's exact
   Burrow moved this lead to 25.5% first-try wipes, outside M4's 15-25%; now 19%. It is a lead, so nothing after it
   moves. Tamsin at Scorchgate (69.5%, inside 55-70%) is left as it is.

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
4. **P2 (`data/world.js` ZONES): the zone levels are mine to tune (§2.6)**; the scaffold's (13, 14, 14, 15, 16, 16)
   hold: no change needed. (If you want the Deeps' patrol softer, see Balance: Deeps 15 -> 14.)
5. **Lead (the East Road):** your note says the party arrives from the Sunscorch at about level 15; in the sim it is
   level 21 (the `sunscorch` run ends at 21.1, Waking 4). The three fights are levelled for that party (rabble
   10-12 and the sergeant at 2: 18-20 at Waking 4; 0-2% wipes). The sim walks your `IRON_PATH`: Keep, `er-wolves`,
   `er-toll`, a rest at `camp-fire` (your entry in `data/encounters.js` is kept), `er-camp`.

## Balance (final; 200 seeds 1-200, starters rotated, `node tools/sim.mjs --seeds 200 --jobs 4`, 472 s)

One final run with everything in: the lead's review fixes (`freeLastHeld`, a Provoked foe's target through
`targetable`, a held healer not counted in `itemPlan`), Ironwall's Iron Stance, and the caravan's smuggler at 6. Against
the runs before them only the Wyrm (21% -> 20%), the forged Abbot (14% -> 13.5%), the Abbot (35% -> 35.5%), the Drowned
Abbess (21% -> 20%) and the caravan (25.5% -> 19%) moved.

M3/M4.5 baseline before any M5 change reproduced `docs/M45-STATUS.md` exactly (Kharzul 34%, the Warden 36%, Tamsin 65%,
forged 18%/13%, leads 22/19/21/19/19%; M3 modes unchanged).

Gate 5 (every run of every mode; the full tables are in `docs/RULES.md` §12, M5):

| mode | target | result |
|---|---|---|
| ironspire | Mother Anvil wipe 1st 30-40% | 32% (party L25.5, 29.5 rounds) |
| ironspire | the Rime-Abbot wipe 1st 30-40% | 35.5% (party L29.0, 19.3 rounds) |
| ironspire | Tamsin at Ironhold party win 55-70% | 61% (39% yield) |
| ironspire-forged | Mother Anvil <= 20% | 6% |
| ironspire-forged | the Rime-Abbot <= 20% | 13.5% |
| iron-first-lead | the Thunder-Roc 15-25% | 19% |
| iron-first-lead | Old Horn 15-25% | 19.5% |
| iron-first-lead | Harrow's Journeyman 15-25% | 22.5% |
| iron-first-lead | the Drowned Abbess 15-25% | 20% |
| every mode (M3, M4, M5) | stuck 0 | 0 |

M3: all 60 first-try results identical to M4.5 (m2 13/1/33%, direct Tamsin 66% win and Rotwarden 33%, leads2 4%,
looper-w2 10%, first-lead 20/28/23/20%). M4 (Gate 4, all ok): Kharzul 31.5%, the Warden 33.5%, Tamsin at Scorchgate
69.5% win, forged 16.5%/7%, the caravan 19% (decision 9), the Wyrm 20%, Gnash 22%, the Wisp-Queen 24%, the Aqueduct
18.5%. Tamsin at Scorchgate (139/200) moved from M4.5's 65% as a knock-on of Kharzul's exact Burrow and is inside.

Road fights of note: the Deeps' zone patrol 11% first-try wipes (met straight after Tamsin's duel with no rest, as
M4's Vault Guard, 16%; if you want it softer, the Deeps' zone level 15 -> 14 in P2's ZONES, not measured); the Bellows
10%; the Cutter-Chief 9%; the Choir 7%. Everything else on the road is 0-4%.

Tuning history (Ironspire, first tries): Mother Anvil 165 HP 29.5% -> 175 HP 36-37.5% -> 170 HP 32%; the Rime-Abbot
150 HP 25-27.5% -> 170 HP 35% but forged 24.5% and 4 stuck -> Swift at speed 8, Guard 21 -> the last phase and dmg 7:
35% / forged 14% / 0 stuck; the Roc 120 HP 13-15% -> 140 HP 19-21%; the Abbess level 7 25.5% -> 6 20-21.5%; Tamsin
66.5% -> Iron Grip 2d8 61%.

Tuning aids (private, not in the tree): a Sunscorch end-state cache (`--sun-cache`) and pre-fight state caches, so one
fight can be re-run 200 times in a minute.
