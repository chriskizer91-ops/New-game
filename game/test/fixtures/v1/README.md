# M2 save fixtures (version 1)

These are 18 saves from the M2 Gauntlet build. They are the input to the v1 → v2 migration
tests (`test/migrate.test.mjs`, M3 spec §4.9) and to the migration checklist in §7. Each
`<name>.json` is the save object exactly as M2's `saveGame` would have stored it. Next to it,
`<name>.code.txt` holds the same save as the `AETH1.` export code from M2's `core/save.js`
`exportCode`. For all 18, `importCode(code)` deep-equals the JSON, and the generator checks
this every time it runs.

`../m2-spawns.json` is a snapshot of the M2 spawn tables:

- `gauntlet`: `ENCOUNTERS[id].spawns` for every `GAUNTLET` id (`null` for Hearthfires)
- `patrols`: `PATROLS`
- `spawnsFor[0|1|2][fightId]`: M2 `spawnsFor()` on a fresh `newGame({ seed: 101 })`
  (starter `hearthbrand`) with `progress.waking` set to 0, 1 or 2

## Regenerating

```
cd game
node tools/make-v1-fixtures.mjs           # rewrites the 36 fixture files, m2-spawns.json and the table below
node tools/make-v1-fixtures.mjs --check   # regenerates in memory and exits 1 if anything on disk differs
```

The generator imports the M2 rules from `src/` and changes nothing there. Once `src/` makes
version 2 saves (M3), it refuses to run. From then on these files are the frozen record of
M2, and only the M2 sources (the tree that built `dist/aethermoor-m2.html`) can regenerate
them. The output is deterministic, so two runs give byte-identical files.

## How they were made

Everything uses the exported M2 APIs: `newGame`, `startBattle`, `act`/`foeTurn` with
`autoCommand`, `resolveBattle`, `rest`, `advance`, `equip`/`bestHeroFor`, `exportCode` and
`importCode`.

- **Seed 101** for every fixture. The Warden is named "Wren".
- **Starters rotate** by fixture index: hearthbrand, stillwater-lance, cairnmaul, then
  again. The table shows which fixture got which.
- **Three full Waking-0 runs**, one per starter. Each node fixture is taken from the run of
  its starter.
- **New game as the M2 screen makes it.** `newGame({ name, starter, seed: 101, base })` is
  called with the screen's standard array: STR 15, CON 14, DEX 13, CHA 12, WIS 10, INT 8.
  Then a `look` is added to the Warden, just as `ui/screens/newgame.js` does. The look
  varies by starter and uses only `WARDEN_PRESETS` values.
- **Walking.** At each node the save is taken on arrival, which is what M2 autosaved after
  `advance`. The walk then rests if the node is a Hearthfire (the Keep too), fights if it is
  an uncleared fight, and advances.
- **Forced fights.** Before every turn, the battle state is adjusted and the turn is played
  by `autoCommand`/`act` or `foeTurn`:
  - `claim` (every win unless noted): heroes are at 500 HP with full MP. A relic holder
    keeps its HP, but every grip it has is set to 1, so the first grip hit (Pip's Disarm, a
    crush or a crit) pries the relic loose. Once it holds nothing, and for every other foe,
    HP is 1. This is how a careful player wins, and it claims every named relic. On later
    Wakings the holders carry Echoes, and the Echoes are claimed the same way.
  - `shatter`: every foe is at 1 HP, so a holder dies while still gripping its relic.
  - `wipe`: heroes are at 1 HP and foes are at full HP.
  - `flee`: heroes are at 500 HP and use Flee every turn until it works.
- **Results go through `resolveBattle`**, which handles XP, gold, loot, codex, Grudges,
  wipes and Brands. After a win, every claimed or dropped item that `bestHeroFor` calls an
  upgrade is equipped, which is the sim's rule. Hero HP and MP in the saves are therefore
  what M2 clamps them to after a forced fight: full, or full after the post-win breather.
- **No patrols and no reforging.**

## The fixtures

- `v1-node-<id>` (14): the save on arrival at `<id>`, with every earlier node played.
  - `v1-node-hearthstone-keep` is a fresh new game: day 1, no rest yet.
  - Hearthfire fixtures come before their rest, so `lastHearthfire` is still the previous
    fire.
  - `v1-node-briarmaw-den` stands in front of the boss.
- `v1-after-brand`: the save right after the first Briarmaw win. It has the Brand of
  Briars, Waking 1 and `runs` 1, and it is back at `hearthstone-keep` with `cleared`
  emptied. `done['keep-vault']` is still set.
- `v1-waking2-dupe`: its own starter's run earned the first Brand (the same point as
  `v1-after-brand`), then played the whole Waking-1 run. That run skips `keep-vault`, and
  its holders carry Echoes. Briarmaw was
  beaten a second time, which gives `brands: ['brand-of-briars', 'brand-of-briars']`
  (one unique Brand) and Waking 2. The party then walked the Waking-2 route and arrived at
  `tally-camp`.
  - The Warden wields a dropped rondel, not the starter, because `bestHeroFor` called it an
    upgrade. `starterOf` must read the codex here, not the weapon.
- `v1-grudges`: in order:
  1. A wipe at `bramble-toll`. The party wakes at the Milestone Fire.
  2. A rest there, then a flee at `bramble-toll`.
  3. The win at `bramble-toll`.
  4. On to `tally-camp` and a flee there.

  It ends at `tally-camp`, not cleared, with one live Grudge (`tally-camp#1`, the bandit, the
  Once-Fled).
  - Skarn's `bramble-toll#0` Grudge (Party-Breaker, then Once-Fled) is settled by the win
    in step 3, and the save still carries the `stamp: 'grudge-settled'` drop from it.
  - M2 cannot get past `bramble-toll` without beating Skarn: fights cannot be re-fought
    once cleared, and bandits never bolt. So no M2 save can hold a live `bramble-toll` Grudge
    at `tally-camp`.
  - The wipe also cost 10% of the gold and used up the tonics and salts.
- `v1-shattered`: the same start as `v1-node-bramble-deep` (cairnmaul), but Old Snag was
  killed while still gripping the Thornsplitter.
  - M2's `battleLoot` dropped it with `shattered: true`, and `claimToCodex` left
    `codex.thornsplitter` at `{ sighted: true, claimed: false, awakened: false }`.
  - This came from the real rules. Nothing was edited by hand.
  - It is at `bramble-deep`, not cleared.

<!-- fixtures:start -->
| fixture | starter | node | waking | brands | gold | levels w/p/b/a | grudges | day | relics claimed | shattered |
|---|---|---|---|---|---|---|---|---|---|---|
| v1-node-hearthstone-keep | hearthbrand | hearthstone-keep | 0 | 0 | 50 | 1/1/1/1 | 0 | 1 | hearthbrand | - |
| v1-node-keep-vault | stillwater-lance | keep-vault | 0 | 0 | 50 | 1/1/1/1 | 0 | 2 | stillwater-lance | - |
| v1-node-hearth-road | cairnmaul | hearth-road | 0 | 0 | 61 | 1/1/1/1 | 0 | 2 | cairnmaul, wardens-seal | - |
| v1-node-waymarker-stones | hearthbrand | waymarker-stones | 0 | 0 | 73 | 2/2/2/2 | 0 | 2 | hearthbrand, wardens-seal | - |
| v1-node-milestone-fire | stillwater-lance | milestone-fire | 0 | 0 | 91 | 2/2/2/2 | 0 | 2 | stillwater-lance, wardens-seal | - |
| v1-node-bramble-toll | cairnmaul | bramble-toll | 0 | 0 | 91 | 2/2/2/2 | 0 | 3 | cairnmaul, wardens-seal | - |
| v1-node-verdant-edge | hearthbrand | verdant-edge | 0 | 0 | 127 | 3/3/3/3 | 0 | 3 | hearthbrand, wardens-seal, thornwatch-hood | - |
| v1-node-rotstag-glade | stillwater-lance | rotstag-glade | 0 | 0 | 154 | 3/3/3/3 | 0 | 3 | stillwater-lance, wardens-seal, thornwatch-hood | - |
| v1-node-thornhollow | cairnmaul | thornhollow | 0 | 0 | 254 | 4/4/4/4 | 0 | 3 | cairnmaul, wardens-seal, thornwatch-hood, rotwood-circlet | - |
| v1-node-tally-camp | hearthbrand | tally-camp | 0 | 0 | 254 | 4/4/4/4 | 0 | 4 | hearthbrand, wardens-seal, thornwatch-hood, rotwood-circlet | - |
| v1-node-snag-wallow | stillwater-lance | snag-wallow | 0 | 0 | 346 | 5/5/5/5 | 0 | 4 | stillwater-lance, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin | - |
| v1-node-bramble-deep | cairnmaul | bramble-deep | 0 | 0 | 496 | 5/5/5/5 | 0 | 4 | cairnmaul, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin, thornsplitter | - |
| v1-node-den-mouth | hearthbrand | den-mouth | 0 | 0 | 574 | 6/6/6/6 | 0 | 4 | hearthbrand, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin, thornsplitter, thornwatch-boots | - |
| v1-node-briarmaw-den | stillwater-lance | briarmaw-den | 0 | 0 | 574 | 6/6/6/6 | 0 | 5 | stillwater-lance, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin, thornsplitter, thornwatch-boots | - |
| v1-after-brand | cairnmaul | hearthstone-keep | 1 | 1 | 994 | 7/7/7/7 | 0 | 5 | cairnmaul, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin, thornsplitter, thornwatch-boots, thornwreath, briarfang | - |
| v1-waking2-dupe | hearthbrand | tally-camp | 2 | 2 | 4650 | 14/14/14/14 | 0 | 12 | hearthbrand, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin, thornsplitter, thornwatch-boots, thornwreath, briarfang | - |
| v1-grudges | stillwater-lance | tally-camp | 0 | 0 | 255 | 4/4/4/4 | 1 | 5 | stillwater-lance, wardens-seal, thornwatch-hood, rotwood-circlet | - |
| v1-shattered | cairnmaul | bramble-deep | 0 | 0 | 496 | 5/5/5/5 | 0 | 4 | cairnmaul, wardens-seal, thornwatch-hood, rotwood-circlet, tallyknife, thornwatch-jerkin | thornsplitter |
<!-- fixtures:end -->
