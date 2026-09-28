# Handoff: Aethermoor: Hearth & Heirloom

This is for a fresh session with none of the earlier conversation. Read it top to bottom, then read `CLAUDE.md`, and you can start milestone 5 without re-exploring.

- **Branch:** `claude/cool-ptolemy-uc93gg`. It contains the whole history of the earlier branch `claude/dnd-game-prototype-bsv3xb`. If your session names a different branch, use that one and carry this history over. Never create a PR unless the player asks for one.
- **State at handoff:** **M4 is done; its delivery is the last step:** the download `game/dist/aethermoor-m4.html`, sent together with `aethermoor-m3.html` (the player asked for both). Every gate is green: 276/276 tests, lint, build (about 1.77 MB), `e2e-world` (19 scenarios), `e2e-flow`, `e2e-battle` (18) and `e2e-codes` (18 M2 + 3 M3 codes) at both sizes, the balance sim on target. A final review found 6 issues (one blocker: reforged relics were never Claimed); all are fixed with regression tests. The full record is `game/docs/M4-STATUS.md`. **M5 has not started.**

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
- **World structure:** a guided start, then as open-world as possible.
- **AI Dungeon Master:** "seems cool but I don't want to make it dependent on that". It is optional and never required.
- **Lore:** honour the player's own Aethermoor world. The repo root holds their files:
  - `aethermoor-interactive-image-map-polished.html`: an illustrated map, a 4.8 MB PNG with SVG markers in a 1200×800 viewBox. M3's Atlas uses it (shrunk to a WebP inside the build).
  - `aethermoor-character-sheet-4.html`: the character sheet.
- **Saves are sacred:** "let's not overwrite the saves we have, so after the next checkpoint deliver an HTML download link". So:
  - **Never republish the M2 page** at https://claude.ai/artifact/9i9bPrdG6ZY22xWnXgGUQa. The player's M2 saves live in its localStorage.
  - **Deliver each milestone as a file** (M3: `game/dist/aethermoor-m3.html`, sent as a download), or as a **new, separate** page if the player asks.
  - The player moves their progress with a **save code**: M2 Settings → Make a save code (`AETH1.…`); M3 and M4 Settings → Load a code. M3's own codes start `AETH2.`, M4's `AETH3.`. Opened in the same browser, M4 also offers the M3 or M2 save as a carry-over. The next milestone must load all three.
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
| **M5** | ⬜ **next** | Ironspire and Hush (the roadmap); Luma's recruitment was held back from M4 for "M5+" |
| M6 | ⬜ | Gloomfen, Hodge, Tamsin's fall |
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

**Next concrete steps (M5):**
1. **Ask the player how M4 plays** before building much. Their answer outranks this list.
2. **M5 step 0:** freeze `dist/aethermoor-m4.html` (pin its sha256 in `test/frozen.test.mjs`), move M5 to its own save key (`aethermoor.save.m5`, reading m4, v2 and v1 newest first) and delivery file, as M4's step 0 did (see `core/save.js`, `ui/app.js`, `ui/screens/settings.js`, `tools/build.mjs`).
3. **Write `game/docs/M5-SPEC.md`** in M4's shape. Roadmap row: "Ironspire and Hush" (`docs/DESIGN-BRIEF.md` §13). Ironspire opens through the Keep's east exit (`keep-e`, sealed today; give it a `gate` as `keep-se` has). Page III of the Codex is sealed until then (`data/codex.js`). Consider Luma joining (she hints at it in M4).
4. **Known issues worth fixing early:** new statuses (burrowed, swallowed, charmed) so M4's approximated Champion moves can become exact; a `$rival:<suffix>` for Tamsin's later duels.
5. **Deliver** `dist/aethermoor-m5.html` the same way (§6 "Delivery"), and send the M4 file alongside it if the player wants both.

## 4. Architecture and key decisions

- The code lives in `game/`: ES modules bundled by esbuild (IIFE, whitespace-minified with identifiers kept) into **one self-contained HTML file**.
- `tools/build.mjs` inlines the JS and CSS into `src/index.html` (split at `<!--BODY-->`). It writes, into `dist/` or `--out <dir>`:
  - `aethermoor.html`: a full document, for local play
  - `aethermoor.artifact.html`: a fragment with no doctype/html/head/body, for claude.ai pages
  - `aethermoor-m4.html`: the delivery copy (`dist/aethermoor-m2.html`, `-m3.html` and `-m4.html` are committed as delivered; the earlier ones are pinned by a test)
  - It warns above 1.8 MB and fails above 2.2 MB (M4 spec A3). M4 is about 1.77 MB; `--minify` saves about 10% if M5 needs room.
- The only outside request allowed is Google Fonts. All art, music and data are generated or embedded.
- `game/ARCHITECTURE.md` is the technical contract: the state shape (v2), the battle API, the world engine, the event table and the shared vocabulary.

**Layers** (dependencies point downward only: `ui → art/rules → data/core`; inside `rules/`: `world → story → cond → gauntlet`, and `gauntlet` never imports those three):

| Folder | What it holds |
|---|---|
| `src/core/` | `rng.js` (a serializable mulberry32), `dice.js`, `save.js` (v2 key plus `.bak`, `AETH1.`/`AETH2.` codes, `scrub()` of pasted codes, migration injected as a function), `input.js`, `audio.js` (a WebAudio synth that starts only after a gesture) |
| `src/data/` | Frozen tables: heroes, foes, items, affixes, rarity, aspects, skills, statuses, relics, encounters, omens, tuning, domains, names. M3: tiles, locks, world (`REGIONS`, `HEARTHS`, `ZONES`, `START_AT`), `maps/*` (14 maps), npcs, dialogue, quests, shops, ladder, letters |
| `src/rules/` | **Pure, deterministic** logic with no DOM, `Math.random` or `Date`. stats, foe (`buildFoe`, `escalateSpawn`, `addOmens`), ai, combat, battle, loot (`routSpoils`), progression, party (equip, reforge, `temper`, `buy`), autoplay, gauntlet (the flow: `newGame`, `startBattle`, `resolveBattle`, `earnBrand`, wipe, `yieldDuel`, `routPack`, `rest`). M3: world (`enterMap`, `move`, `tick`, `interact`, `present`, `threat`, `commit`, roamers), story (dialogue, quests, bounties, letters), cond (conditions), path (A*), migrate (v1 → v2 → v3). M4: forge (temper, reroll, salvage, sockets, `buyGem`, awakening), codex (pages, `pageBonus`, deeds, stages), gear (`canUse`); `stats.heroStats(game, id)` is `deriveHero` with the pages' bonus: use it wherever a hero's numbers are shown |
| `src/art/` | The procedural "Forge" renderer returning ImageData. `heroes.js` and `hero-looks.js` are **frozen** (the player approved them). M3: `tiles.js` (biome atlases), `walkers.js` (a separate 16×24 rig), `map-sprites.js`, item looks with Temper. Documented in `game/docs/ART.md` |
| `src/ui/` | `app.js` (the shell: ctx with `game`, `setGame`, `replaceGame`, `adopt`, `settings`, `audio`, `go(name, params)`, `services`), screens (title, newgame, world, battle, aftermath, party, codex, journal, atlas, settings), `card.js`, `battle/*`, `world/*` (view, camera, actors, controls, dialogue, sheets, story-fx, hud, loop, session), `lib/*` |
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
npm run build                    # dist/aethermoor.html, .artifact.html, aethermoor-m3.html
npm test                         # node --test test/*.test.mjs  (276 tests)
npm run lint                     # eslint src test tools; no-undef is an error
export NODE_PATH=$(npm root -g)  # Playwright is global; Chromium is at /opt/pw-browsers
node tools/e2e-world.mjs         # 19 world scenarios at 360x740 and 1280x800 (~25 min), prints PERF lines
node tools/e2e-flow.mjs          # the shell, the forge, the Codex, plus M2 and M3 carry-over profiles (~15 min)
node tools/e2e-battle.mjs        # 18 battle scenarios, both Sunscorch Champions included (~5 min)
node tools/e2e-codes.mjs         # pastes all 18 real M2 codes and 3 M3 codes at both sizes (~10 min)
node tools/sim.mjs --seeds 200   # balance, all nine modes (~7 min); --modes, --seed N, --trace
node tools/gallery.mjs           # art gallery screenshots into tools/shots/
node tools/dev-battle.mjs        # tools/shots/dev-battle.html#node=oldsnag&level=5
node tools/map-draft.mjs --all   # ASCII preview of every map with entities
```

- Private builds for parallel work: `node tools/build.mjs --out /tmp/x`, then `AETH_HTML=/tmp/x/aethermoor.html node tools/e2e-world.mjs` (same for `e2e-flow` and `e2e-codes`); `node tools/e2e-battle.mjs --out /tmp/x`.
- `e2e-world --scenario=3,11` and `--only=phone|laptop` run a subset.
- Screenshots go to the OS temp folder (or `--out`). To look at one, read the PNG.

## 6. Gotchas, known bugs and approaches that failed

**Testing and tooling:**
- `node --test test/` fails with "Cannot find module". Use the glob `test/*.test.mjs`, which the npm script already does.
- ESM ignores `NODE_PATH`. In `.mjs` tools, load Playwright with `createRequire(<global npm root>/)('playwright')`, as the e2e tools do.
- In the sandbox, headless Chromium often can't reach Google Fonts (`ERR_CERT_AUTHORITY_INVALID`), so screenshots sometimes show the fallback fonts. The e2e tools ignore those requests; they are not bugs.
- Python is not reliably available; use node for scripts. To process images, draw them on a canvas in Chromium (`game/docs/m3/atlas-shrink-example.mjs`).
- `pkill -f <name>` also kills the shell running it when the command line contains `<name>`. Kill by PID instead.
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

**Delivery** (how M3 and M4 went out; repeat it for M5):
1. `npm run build`, then audit the delivery file before sending it: the only URLs are Google Fonts (and the SVG namespace); no `fetch`/XHR/WebSocket/`eval`, no local paths, no AI model names; look at its HTML shell. Publishing it as a claude.ai page is different: the Artifact rules require reading the whole file first.
2. Commit it (un-ignore it in `game/.gitignore`), push.
3. Send it with SendUserFile, `display: 'attach'`.
4. Tell the player how to move their save (old version: Settings → Make a save code; new version: Settings → Load a code), the iPhone caveat, and offer a new, separate page for phone play. Never republish the M2 URL.
