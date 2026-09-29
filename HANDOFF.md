# Handoff: Aethermoor: Hearth & Heirloom

This is for a fresh session with none of the earlier conversation. Read it top to bottom, then read `CLAUDE.md`, and you can start the next step without re-exploring (§3.3).

- **Branch:** `claude/cool-ptolemy-uc93gg`. It contains the whole history of the earlier branch `claude/dnd-game-prototype-bsv3xb`. If your session names a different branch, use that one and carry this history over. Never create a PR unless the player asks for one.
- **State at handoff:** **Milestone 5, the Ironspire Peaks, is done and delivered** as the download `game/dist/aethermoor-m5.html` (Milestone 4.5 was delivered before it as `game/dist/aethermoor-m4.5.html`). The Keep's east postern opens after the second council onto the East Road, six maps painted from the player's own pictures, and on up into eleven Ironspire maps: two Champions, Codex Page III, three exact battle statuses and Tamsin's third duel. Every gate is green: 395/395 tests, lint, build (the game 2.2 MB and the player's paintings 5.9 MB: 8.1 MB in all), `e2e-world` (27 scenarios), `e2e-flow`, `e2e-battle` (22) and `e2e-codes` at both sizes, the balance sim on target. Two independent reviews found no must-fix issue in the game; every finding is fixed. The full record is `game/docs/M5-STATUS.md`.
- **Waiting on the player:** the second batch of paintings (`art-requests/batch-2.md`; mind their size budget before importing them, §3.3), and an answer to one offer: a new, separate claude.ai page of `dist/aethermoor-m5.html` for phone play (an iPhone's Files preview does not run the game). Never republish the M2 page.

---

## 1. The game and the player's requirements

**What the player asked for (their words, condensed):**
- A game that plays on **both phone and laptop**. HTML is fine but not required. They want to "see the limit of what we can build".
- Tastes: Final Fantasy-style leveling, "impressive items that buff and weapons", "basically a digital dnd".
- Genre: a **JRPG** "as complex as the original Pokemon game but not feel like a knock off".
- Core hook: "stronger and stronger bad guys and finding epic items and... a still image stat card of the item in higher pixel detail and knowing you have it equipped."
- **A party of 3–4** "to make it more dynamic". It shipped as 4 in battle: warden, pip, bryn, alondra.
- They loved the Loot Forge art demo and the card reveal.

**Settled decisions:**
- **Party wipe:** you wake at the last Hearthfire with all your gear and lose 10% of your gold.
- **Grinding:** optional but beneficial.
- **Tone:** warm epic with an edge.
- **World structure:** a guided start, then as open-world as possible. **Revised by the M4 playtest:** keep the walkable maps, but progress down the road one stretch at a time, with every encounter a full fight. Milestone 4.5 built that (§3.1), and every later map is built road-first.
- **AI Dungeon Master:** "seems cool but I don't want to make it dependent on that". It is optional and never required.
- **Lore:** honour the player's own Aethermoor world. The repo root holds their files:
  - `aethermoor-interactive-image-map-polished.html`: an illustrated map, a 4.8 MB PNG with SVG markers in a 1200×800 viewBox. M3's Atlas uses it (shrunk to a WebP inside the build).
  - `aethermoor-character-sheet-4.html`: the character sheet.
- **Saves are sacred:** "let's not overwrite the saves we have, so after the next checkpoint deliver an HTML download link". So:
  - **Never republish the M2 page** at https://claude.ai/artifact/9i9bPrdG6ZY22xWnXgGUQa. The player's M2 saves live in its localStorage.
  - **Deliver each milestone as a file** (M3: `game/dist/aethermoor-m3.html`, sent as a download), or as a **new, separate** page if the player asks.
  - The player moves their progress with a **save code**: M2 Settings → Make a save code (`AETH1.…`); M3, M4 and M4.5 Settings → Load a code. M3's own codes start `AETH2.`, M4's and M4.5's `AETH3.`. Opened in the same browser, each milestone also offers the newest older save as a carry-over. The next milestone must load them all.
  - **Every milestone keeps its own save and its own file** (the player: "make new saves instead of overwriting"). Never write an earlier milestone's key; never change an earlier milestone's delivered file.
  - Tell the player: iPhone's Files preview does not run JavaScript. For phone play, offer a new, separate page that doesn't touch the M2 URL.
- **Design brief:** `docs/DESIGN-BRIEF.md` is the synthesized game design. Sections 2, 3, 9, 12 ("Open world rules") and 13 (the roadmap) matter most.

**Other links:** the Loot Forge prototype (M1) is at https://claude.ai/artifact/7VLRxPNbLLjf6etdK87FW4, source `prototypes/item-card.html`.

## 2. Milestone plan

The roadmap is in `docs/DESIGN-BRIEF.md` §13. Status:

| Milestone | Status | Notes |
|---|---|---|
| M0 Engine | ✅ done | Build pipeline, seeded RNG and dice, saves and export codes, input, audio synth, app shell |
| M1 "The Card" (Loot Forge) | ✅ done | Prototype approved by the player; its art pipeline was ported into `game/src/art/` |
| M2 "Gauntlet" | ✅ done, **published** | Full battle system plus a fixed 14-node road. Frozen copy at `game/dist/aethermoor-m2.html` |
| M3 "The Verdant Wilds" | ✅ done, delivered as a download | 14 walkable maps, roaming packs, locks, quests, the Atlas and Journal, save v2. Frozen at `game/dist/aethermoor-m3.html`. See `game/docs/M3-STATUS.md` |
| M4 "The Sunscorch Wastes" | ✅ **done, delivered as a download** | 10 desert maps, 2 Champions, the Codex binder with page rewards, Hilda's full forge (temper +10, reroll, salvage, gems, awakening), hunting Grudges, save v3. See `game/docs/M4-STATUS.md` |
| Milestone 4.5 "The Road" | ✅ **done, delivered as a download** | The M4 playtest: M2's pacing on the walkable maps. Road gates held by every route fight, no Routs, Auto off. Its own file and save. See `game/docs/M45-STATUS.md` |
| M5 "The Ironspire Peaks" | ✅ **done, delivered as a download** | 11 mountain maps and the painted East Road, Mother Anvil and the Rime-Abbot, Codex Page III, the burrowed, swallowed and charmed statuses, Tamsin's kits, save v4, the player's paintings as map ground. See `game/docs/M5-STATUS.md` |
| **M6** | ⬜ **next** | Gloomfen, Hodge, Tamsin's fall |
| M7 | ⬜ | The Hollow Council, the Unsmith, 3 endings, the Heat ladder |
| M8 | ⬜ | The optional Hearthteller (AI DM) and cloud saves |

## 3. Where things stand

**M4 in one breath** (details and numbers in `game/docs/M4-STATUS.md`; the contract is `game/docs/M4-SPEC.md`):
- **Places:** the Keep's south-east gate opens once Act I is done onto 10 Sunscorch maps (the Sunward Road, Sandspire, the Dust Trail, Dusthaven, the Deep Shaft and the Glass Heart, the Glass Flats, Miragewell, Scorchgate and its Vaults) and the Sunscorch Gallery (Codex Page II's pedestals, off the Great Hall). 17 Hearthfires in all.
- **Content:** 9 new foe families (28 in all), 19 encounters, the Champions Kharzul and the Ashen Warden (three phases, two breakable pieces each), Tamsin's second duel, 14 relics (38 in all), 4 new lock types, 5 quests, 4 bounties, 8 Act II Ladder posters, 2 letters, Idris's gem shop, the second council ending Act II.
- **Systems:** `rules/forge.js` (temper to +10 with silver and embers, reroll, salvage, sockets and 4 gems, awakening: three deeds, then the rite, the Hand or the Heart by the bearer's path); `rules/codex.js` (pages, their permanent bonus through `heroStats`, deeds and stages); the Chronicle on each item; Grudge packs that hunt; spoils of Sunscorch fights (scrap, silver, embers, Ash Garnets).
- **Saves (the player's rule: every milestone keeps its own save and file):** M4 writes only `aethermoor.save.m4` (+ `.bak`, `aethermoor.m4.started`), reads the M3 (`v2`) and M2 (`v1`) saves as carry-overs, newest first; codes are `AETH3.`, and `AETH1.`/`AETH2.` still load. `rules/migrate.js` chains `toV2` (M3 exact) and `toV3`. `test/frozen.test.mjs` pins the bytes of `dist/aethermoor-m2.html` and `-m3.html`.
- **Balance** (`tools/sim.mjs`, 200 seeds, nine modes): every M4 target met, every M3 mode on its M3 target, 0 stuck runs. Tables in `docs/RULES.md`.
- **Known issues:** `M4-STATUS.md` §3. The top ones: a few Champion moves use the nearest existing status (no burrow, swallow or charm status yet); Tamsin's Scorchgate duel reuses her M3 moves; the sim's autoplay never swaps weapons.

**How M4 was built** (reuse it):
1. The lead wrote `game/docs/M4-SPEC.md` directly (no design panel; the player had not opted into the Workflow tool) and a scaffold with every id stubbed so all tests stayed green from the start.
2. Step 0 before any content: M4's own save key and delivery file, with the earlier milestones' files pinned.
3. The lead built the rules package (P1) while agents built maps (P2), story (P3), foes, relics and balance (P4), overworld art (P5), battle art (P6) and the UI in two halves (P7a forge and card, P7b Codex, Journal, Atlas, world), each owning disjoint files, never running git, building into private folders, and writing `game/notes/P<n>-*.md`.
4. Integration per package: check each package on a clean snapshot of HEAD plus its files, look at its screenshots, commit it separately. Needs from one package's notes were relayed to the owners.
5. A final review agent read the whole diff with proof scripts; every finding was fixed with a test that fails without it.

### 3.1 Done: the playtest edits (Milestone 4.5)

**Milestone 4.5 in one breath** (details and numbers in `game/docs/M45-STATUS.md`; the contract is `game/docs/M45-SPEC.md`):
- **Road gates:** 20 gates on 12 road maps (each map's `roads` field). 17 are held by a guard standing beside them (`open: { beaten: guard }`, `guard`); 3 wait on a fight further on. Walking into a guarded gate opens its guard's pre-fight card; a win opens it for good; a Brand's rematch stands beside the open gate. `test/road.test.mjs` proves every road holds; the walk bot checks the pacing.
- **One order:** Sandspire's east gate opens with the Brand of Glass.
- **No Routs:** a weak pack still runs, and catching it is a full battle (`caught`), which is what the Rout deed now counts.
- **Auto off** at the start of every fight (the dev battle harness asks for Auto with its own flag).
- **Saves:** its own key `aethermoor.save.m4.5`; the M4 save joins the carry-overs; `toV3` counts every won fight as beaten; a carried-over position inside something now solid moves to the nearest free tile of its own stretch of road.

What the M4 lead wrote before it was built (kept for the reasoning):

The player, after their testers played M4: "the way the game progressed at m2 was enjoyed much more by the play testers so walking around the overworld is amazing very fun but the way interactions happen if the map only let you slowly progress down the road and every encounter was a full fight with dice rolls." They want those edits first, then M5.

**What it means** (the M4 lead's reading; settle the open points below with the player before building):
- **Keep** walking the maps. The testers call it "amazing, very fun".
- **Bring back M2's pacing.** M2 was one fixed road of 14 nodes: you moved on only once the node in front of you was beaten, and every node was a full battle with the dice tray. M3 and M4 opened the land instead: three leads at once after Briarmaw (M3 spec D2) and five in the Sunscorch; roaming packs you can walk around (they never enter gate areas or 1-wide corridors, so they never block the road); weak packs that flee from you and, when touched, scatter with no battle at all (a Rout).
- **So:** the map lets you go down the road one stretch at a time, and every encounter is a full fight with dice rolls.

**Open points for the player** (each changes what gets built):
1. Which fights must be fought? Suggested: every encounter on the road becomes a guard you must beat to pass, as M2's nodes were; packs off the road stay optional, but none flee and none Rout.
2. Do the leads become one fixed order, like M2's single road, or does each lead open once the road to it is fought through?
3. Does this ship as its own build first? Suggested: yes, so the testers judge the new pacing before M5's maps are built on it. By the player's rule it gets its own labeled file and save key, and reads the M4, M3 and M2 saves as carry-overs. `core/save.js` matches keys exactly, so any new key name is safe.
4. Auto battle. M2 had it too, and the choice is remembered: every milestone's file keeps `battleAuto` under the same settings key (`aethermoor.settings.v1`), so files opened from the same origin (downloads opened in one browser) share it. A tester who switched Auto on once has had every fight since play itself. Should the new build start with Auto off?

**What exists to build it with:**
- A gate with a guard: `{ kind: 'gate', open: { beaten: '<encounter>' }, guard: '<encounter>' }`, as on the Sun Road (`sr-toll-chain`) and in the Vaults (`sv-inner-door`). The map tests already check that a gate is the only way through to what it guards.
- Weak packs and Routs: `rules/world.js` (`isWeak`, the roamers' flee, contact returning `rout`), `rules/gauntlet.js` (`routPack`), `TUNING.world.fleeGap`, `TUNING.rout`, and the rout handler in `ui/screens/world.js`. M4's Grudge hunters already never flee or Rout.
- M2's road as it shipped: `git show ce12713:game/src/rules/gauntlet.js` (`route`, `canAdvance`, `advance`) and `git show ce12713:game/src/ui/screens/road.js`.

**Mind:**
- **The Rout deed.** 12 relics (Nos. 2, 4, 5, 6, 8, 10, 13, 15, 18, 25, 28, 33) need a Rout as one of their three deeds, and awakening needs all three. If Routs go, give the `rout` deed a new trigger (for example: win a fight against a pack that once would have fled) and keep its id, because saves already hold it and `saveProblems` checks deed ids.
- **Saves.** A carried-over M4 save can stand anywhere on any map. A gate whose encounter it already beat must stay open (`flags.beaten`, `flags.cleared`), and no save may be stranded behind a new gate: test from every Hearthfire and with every M2 and M3 fixture.
- **Tests that pin the old design.** Routs and fleeing are asserted in `test/` (battle, data, gauntlet, loot, migrate, walk, world) and in `tools/e2e-*.mjs` and `tools/sim.mjs`. Replace each such check with one for the new rule, and say so in the commit; never just delete it.
- **Frozen:** the M2 encounter and spawn arrays (new guards are new encounters), the battle look, the card reveal, and the delivered M2, M3 and M4 files.
- **Balance:** fights you cannot skip and a fixed order change the XP curve. Re-run `node tools/sim.mjs --seeds 200` and retune.
- **Size:** 1.77 MB against the 1.8 MB warning; `--minify` saves about 10%.

### 3.2 Done: Milestone 5, the Ironspire Peaks

**M5 in one breath** (details and numbers in `game/docs/M5-STATUS.md`; the contract is `game/docs/M5-SPEC.md`):
- **Places:** after the second council the Keep's east postern opens onto the East Road, six maps traced from the player's paintings (the Old Bridge, Drystone Lea, Plankford, Shrinewood, Silverfall, the Last Camp; spec A11), then the Rockslide Pass, Peak's Veil, the Iron Stair, Ironhold, the Ironhold Deeps, Harrow's Forge, Stormwatch, the Frost Road, Frostmere and Beneath Frostmere. The Highfold joins Peak's Veil to Fawnrest once Mother Wynn is met. The Ironspire Gallery holds Codex Page III. 25 Hearthfires in all.
- **Content:** 11 foe families (39 in all), 22 fights, the Champions Mother Anvil and the Rime-Abbot, Tamsin's third duel with her own kit (`$rival:ironhold`), 14 relics (52 in all) and the Frost Opal, 5 quests, 4 bounties, 8 posters, 2 letters, 2 shops, Hush's scene, the third council.
- **Systems:** the statuses `burrowed`, `swallowed` and `charmed` (spec §4.2; M4's Kharzul, Sand Wyrm and wisps use them now); per-duel rival kits; save version 4 (`AETH4.`).
- **Painted art:** `PAINTINGS` (`ui/assets/paint/`) draws a map's painting as its ground at twice the canvas density; `CUTS` (`ui/assets/cuts/`) holds the prologue's stills. A map traced from a painting sets `overTiles: false`, and a thing its painting shows is a sign with `look: 'painted'`. The tools are `paint-refs.mjs`, `paint-prompts.mjs` and `paint-import.mjs` (ARCHITECTURE.md "Painted maps").
- **Saves:** its own key `aethermoor.save.m5` (+ `.bak`, `aethermoor.m5.started`); the M4.5, M4, M3 and M2 saves are carry-overs, newest first; `toV4` marks the version only.
- **Known issues:** `M5-STATUS.md` §3. The top one: the paintings' budget (5.9 of 8 MB) will not hold batch 2 as it is.

**How M5 was built** (as M4, with three changes):
1. The spec and a scaffold came first (every id stubbed, all tests green), then step 0 (its own key and file; the M4.5 file frozen).
2. The lead built the rules while agents built maps (P2), story (P3), foes, relics and balance (P4), overworld art (P5), battle art (P6) and the UI (P7) in parallel, each on its own files, never running git. The lead also built the painted maps (P8 and the East Road).
3. **New:** the work lived on a local branch (`m5-scaffold`, in a git worktree in the scratchpad) and was merged into this branch at delivery. Three files conflicted (the spec, `core/save.js`'s code check and its test); the M5 side was right for all three.
4. **New:** two independent reviews ran in parallel (rules, saves, security and UX; content and tests), read the diff against the delivered Milestone 4.5 and proved each finding with a script.
5. **New lesson:** a package that copies files back from an older private tree can silently drop another package's fixes. Three M4.5 review tests were lost that way and restored. Before committing a package, list the assertions its test files lost against the base.

### 3.3 Next

1. **Batch 2 of the paintings** (`art-requests/batch-2.md`; the references are in `art-requests/batch-2/refs/`: 26 pictures of the Verdant and Sunscorch maps, long roads as panels `-a`/`-b`). The player may send them in chat, where the file names are lost (pictures attached in chat land in `/root/.claude/uploads/<session id>/` as `<hash>-image.png`): match each picture to its reference by its layout, copy it into `art-in/batch-2/` under the name `refs.json` gives it, then run `node tools/paint-import.mjs --batch=<dir> --refs=../art-requests/batch-2/refs/refs.json --grid` and check each grid overlay. **Settle the budget first.** The eight paintings in the game take 5.9 MB of the 8 MB paint limit (A6), and a claude.ai page holds 16 MB. 26 more at the same density and quality (about 600 KB for a 48×32 map) will not fit. Choose before importing, and ask the player (they were told they would be asked): a lower `--density` for the big maps, a lower `--quality`, or a second file.
2. **Milestone 6, Gloomfen** (the roadmap: Gloomfen, Hodge, Tamsin's fall). The player's regional map `art-in/extra/region-gloomfen.jpg` names its places: Mirrordeep Lake, Bogmire, the Misthollow Ruins, Rotbridge, Willowmurk, the Tidal Flats. Step 0 as before: freeze `dist/aethermoor-m5.html` (pin its sha256 in `test/frozen.test.mjs`), give M6 its own key (`aethermoor.save.m6`, reading M5, M4.5, M4, M3 and M2 newest first), save version 5 (`AETH5.` codes) and `dist/aethermoor-m6.html`. Gloomfen's sealed entry already exists (`REGIONS.gloomfen`, the Atlas's padlock).
3. **Deliver** the same way (§6 "Delivery").

## 4. Architecture and key decisions

- The code lives in `game/`: ES modules bundled by esbuild (IIFE, whitespace-minified with identifiers kept) into **one self-contained HTML file**.
- `tools/build.mjs` inlines the JS and CSS into `src/index.html` (split at `<!--BODY-->`). It writes, into `dist/` or `--out <dir>`:
  - `aethermoor.html`: a full document, for local play
  - `aethermoor.artifact.html`: a fragment with no doctype/html/head/body, for claude.ai pages
  - `aethermoor-m5.html`: the delivery copy (`dist/aethermoor-m2.html`, `-m3.html`, `-m4.html`, `-m4.5.html` and `-m5.html` are committed as delivered; all but the newest are pinned by a test)
  - For the game it warns above 2.5 MB and fails above 3.2 MB (M5 spec A6), counting the player's paintings apart: they fail above 8 MB. M5's game is about 2.2 MB and its paintings 5.9 MB; `--minify` saves about 10% of the game if it needs room.
- The only outside request allowed is Google Fonts. All art, music and data are generated or embedded.
- `game/ARCHITECTURE.md` is the technical contract: the state shape (v4), the battle API, the world engine, the event table and the shared vocabulary.

**Layers** (dependencies point downward only: `ui → art/rules → data/core`; inside `rules/`: `world → story → cond → gauntlet`, and `gauntlet` never imports those three):

| Folder | What it holds |
|---|---|
| `src/core/` | `rng.js` (a serializable mulberry32), `dice.js`, `save.js` (this milestone's key plus `.bak`, the earlier milestones' saves read as carry-overs, `AETH1.` to `AETH4.` codes, `scrub()` of pasted codes, migration injected as a function), `input.js`, `audio.js` (a WebAudio synth that starts only after a gesture) |
| `src/data/` | Frozen tables: heroes, foes, items, affixes, rarity, aspects, skills, statuses, relics, encounters, omens, tuning, domains, names. M3: tiles, locks, world (`REGIONS`, `HEARTHS`, `ZONES`, `START_AT`), `maps/*` (14 maps), npcs, dialogue, quests, shops, ladder, letters |
| `src/rules/` | **Pure, deterministic** logic with no DOM, `Math.random` or `Date`. stats, foe (`buildFoe`, `escalateSpawn`, `addOmens`), ai, combat, battle, loot, progression, party (equip, reforge, `temper`, `buy`), autoplay, gauntlet (the flow: `newGame`, `startBattle` (M4.5: `caught`), `resolveBattle`, `earnBrand`, wipe, `yieldDuel`, `rest`). M3: world (`enterMap`, `move`, `tick`, `interact`, `present`, `threat`, `commit`, roamers), story (dialogue, quests, bounties, letters), cond (conditions), path (A*), migrate (v1 → v2 → v3 → v4). M4: forge (temper, reroll, salvage, sockets, `buyGem`, awakening), codex (pages, `pageBonus`, deeds, stages), gear (`canUse`); `stats.heroStats(game, id)` is `deriveHero` with the pages' bonus: use it wherever a hero's numbers are shown. M5: the `burrowed`, `swallowed` and `charmed` statuses in battle and combat; rival kits (`data/rivals.js`, `$rival:<duel>`) |
| `src/art/` | The procedural "Forge" renderer returning ImageData. `heroes.js` and `hero-looks.js` are **frozen** (the player approved them). M3: `tiles.js` (biome atlases), `walkers.js` (a separate 16×24 rig), `map-sprites.js`, item looks with Temper. Documented in `game/docs/ART.md` |
| `src/ui/` | `app.js` (the shell: ctx with `game`, `setGame`, `replaceGame`, `adopt`, `settings`, `audio`, `go(name, params)`, `services`), screens (title, newgame, world, battle, aftermath, party, codex, journal, atlas, settings), `card.js`, `battle/*`, `world/*` (view, camera, actors, controls, dialogue, sheets, story-fx, hud, loop, session), `lib/*`, `assets/` (M5: `paint/` the player's map paintings, `cuts/` the prologue's stills, written by `tools/paint-import.mjs`) |
| `src/main.js` | Registers the screens, installs the card services, and exposes a test seam: `globalThis.__aethTest(app)` if defined. The world screen then installs `window.__world` and `window.__worldTools` |

**Why the main decisions were made:**
- **Rules are pure and seeded.** Any battle or walk can be replayed and tested in Node, and balance is simulated in `tools/sim.mjs`.
- **Art is procedural code.** The whole game stays one file that works offline, and one art seed draws an item at every size, so the item on the card is visibly the item on the sprite. That is the player's core hook.
- **Every relic is held by a named foe.** You pry it loose with the Grip meter, and killing the holder first shatters it. Loot is visible before the fight (the pre-fight card and nameplates).
- **The Waking escalation.** Each Brand re-arms every foe ("stronger and stronger bad guys"). Rabble get only +2 levels per Waking (other tiers +6), so weak packs still flee.
- **Save migration is injected** (`loadGame(migrate)`, `importCode(code, migrate)`), so `core/` never imports `rules/`. The v1 key is never written, so the M2 page keeps working.
- **Map sprites are drawn fresh, not shrunk** from battle art.
- **Parallel agents get disjoint file ownership** and no git access; they coordinate through notes, the spec and stub-first scaffolding.

## 5. Build, run, test

```bash
cd game
npm install                      # esbuild only; eslint is installed globally in this environment
npm run atlas                    # rebuilds the Atlas WebP from the player's map (only if the map changes)
npm run build                    # dist/aethermoor.html, .artifact.html and the milestone's delivery copy
npm test                         # node --test test/*.test.mjs  (395 tests at Milestone 5)
npm run lint                     # eslint src test tools; no-undef is an error
export NODE_PATH=$(npm root -g)  # Playwright is global; Chromium is at /opt/pw-browsers
node tools/e2e-world.mjs         # 27 world scenarios at 360x740 and 1280x800 (~8 min), prints PERF lines
node tools/e2e-flow.mjs          # the shell, the forge, the Codex, plus the carry-over profiles (~5 min)
node tools/e2e-battle.mjs        # 22 battle scenarios, the four Champions included (~6 min)
node tools/e2e-codes.mjs         # pastes 24 codes (every real M2 code; M3, M4 and M4.5 codes) at both sizes (~6 min)
node tools/sim.mjs --seeds 200 --jobs 4   # balance, all twelve modes (~8 min); --modes, --seed N, --trace
node tools/paint-import.mjs --map=<id> --src=<picture> --grid   # a painting as a map's ground; check tools/shots/paint/<id>-grid.png
node tools/gallery.mjs           # art gallery screenshots into tools/shots/
node tools/dev-battle.mjs        # tools/shots/dev-battle.html#node=oldsnag&level=5
node tools/map-draft.mjs --all   # ASCII preview of every map with entities
```

- Private builds for parallel work: `node tools/build.mjs --out /tmp/x`, then `AETH_HTML=/tmp/x/aethermoor.html node tools/e2e-world.mjs` (same for `e2e-flow` and `e2e-codes`); `node tools/e2e-battle.mjs --out /tmp/x`.
- `e2e-world --scenario=3,11` and `--only=phone|laptop` run a subset. `--only` picks a size, not a scenario: `--only=21` runs nothing and passes.
- Screenshots go to the OS temp folder (or `--out`). To look at one, read the PNG.

## 6. Gotchas, known bugs and approaches that failed

**Testing and tooling:**
- `node --test test/` fails with "Cannot find module". Use the glob `test/*.test.mjs`, which the npm script already does.
- ESM ignores `NODE_PATH`. In `.mjs` tools, load Playwright with `createRequire(<global npm root>/)('playwright')`, as the e2e tools do.
- In the sandbox, headless Chromium often can't reach Google Fonts (`ERR_CERT_AUTHORITY_INVALID`), so screenshots sometimes show the fallback fonts. The e2e tools ignore those requests; they are not bugs.
- Python is not reliably available; use node for scripts. To process images, draw them on a canvas in Chromium (`game/docs/m3/atlas-shrink-example.mjs`).
- `pkill -f <name>` also kills the shell running it when the command line contains `<name>`. Kill by PID instead.
- **Headless `file://` storage:** in a throwaway Chromium context, a second `page.goto` to the same `file://` page can start with localStorage wiped. Use `page.reload()` in e2e checks that must keep storage (real browsers keep it).
- **A chest's card reveal** shows its Continue button only when the card lands (about a second): wait for `.ov-reveal .cont` before clicking it.
- **Frame-rate checks:** the world loop idles at 12 fps only while nothing on screen changes. A pack stepping in view legitimately runs at full rate, so the e2e idle check stuns the packs near the view first.
- **Entering a map is a visit:** `enterMap` counts `visits[map]` (it seeds the roamers) and marks the map's arrival lines seen. So loading a save and walking in always changes the save a little; compare saves before the world mounts.
- Performance gates are noisy in headless runs; the hard fail is p95 33 ms and 60 `drawImage` calls per frame (A7). M3 measured about 2 ms and 17 calls. Always print the numbers.

**Security:**
- `ui/lib/dom.js` `el()` sets **innerHTML when given a string**. Every user-provided or saved string must go through `esc()` or `textContent` (`el(tag, { text })`, or the `text()` helper in `ui/world/sheets.js`).
- Pasted save codes are untrusted. `save.js` `scrub()` strips `<` and `>` from every string and key; that is not enough inside an HTML attribute, so never interpolate saved strings into attribute values.

**Save-data quirks:**
- M2's `earnBrand` pushes the Brand on every Briarmaw win, so an M2 save can hold `['brand-of-briars','brand-of-briars']`. Count Brands with `new Set(brands).size` and keep the array byte for byte.
- In `v1-waking2-dupe`, the Warden wields a dropped rondel, not the starter. To work out the starter, read the codex (`migrate.starterOf`).
- A Grudge has `wins` (they beat you) and `flees` (you ran); its title comes from whichever happened last.

**Content consistency:**
- **Tamsin is "she"**, to match the shipped prologue (`newgame.js`). The design brief says "he"; ignore that.
- The M2 encounters, spawn arrays and PATROLS must stay **byte-identical**. A test checks them against `m2-spawns.json`. The name "Ledger-Maud" therefore lives only in the Ladder.
- A unique foe never draws the Twinned Omen (a twinned, frenzied Gorrow was a wipe spiral).

**Process:**
- Lead with the player's hook: stronger bad guys, epic items, the item card.
- **Parallel builders and the stop hook:** while agents work, their files are always uncommitted and the stop hook fires at every turn end. Push a checkpoint commit when the whole tree tests and builds (say so in the message), and commit each package on its own once it is done; check each package on a clean snapshot of HEAD plus its files first.
- **Usage limits stop every agent at once.** They keep their context: resume each with SendMessage ("the limit has reset; re-read files before editing"). Their notes files say where they were.
- **e2e counts must come from the data** (relics, locks, posters, hearths), not M3's numbers; M4 broke five hardcoded checks.
- **Test fixtures and seeds:** `relicItem(id, createRng(9))` in a game made with `newGame({ seed: 9 })` gives the same uid as the starter. Use a distinct seed for test items.
- The stop hook requires every change to be committed **and pushed** before a turn ends.
- Subagents never run git; tell them so in every prompt. Background agents can die on the account's usage limit, so keep each package small enough to finish, and check their notes before relaunching.
- **A container restart** stops background jobs (a long e2e run is simply lost; start it again) but keeps the disk: the repo, local branches, worktrees and the scratchpad survive.
- **Killing a run:** `pgrep -f <pattern>` also matches your own shell's command line (the kill ends your shell). Look up the node processes' PIDs and kill those.
- **Packages that work in private copies** and copy files back can overwrite another package's fixes. Before committing a package, list the assertions its test files lost against the base (M5 lost three M4.5 review tests this way).

**Delivery** (how M3 to M5 went out; repeat it for M6):
1. `npm run build`, then audit the delivery file before sending it: the only URLs are Google Fonts (and the SVG namespace); no `fetch`/XHR/WebSocket/`eval`, no local paths, no AI model names (scan with the base64 image data stripped: a long base64 run can spell anything); look at its HTML shell. Publishing it as a claude.ai page is different: the Artifact rules require reading the whole file first.
2. Commit it (`dist/` is tracked; check nothing in `game/.gitignore` hides it), push.
3. Send it with SendUserFile, `display: 'attach'`.
4. Tell the player how to move their save (old version: Settings → Make a save code; new version: Settings → Load a code), the iPhone caveat, and offer a new, separate page for phone play. Never republish the M2 URL.
