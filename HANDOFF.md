# Handoff: Aethermoor: Hearth & Heirloom

This is for a fresh session with none of the earlier conversation. Read it top to bottom, then read `CLAUDE.md`, and you can continue milestone 3 without re-exploring.

- **Branch:** `claude/dnd-game-prototype-bsv3xb`. All work happens here. Never create a PR unless the player asks for one.
- **State at handoff:** M3 has its spec, fixtures and scaffold, all committed. Tests (108/108), lint, build, e2e-flow and e2e-world are green. **The M3 Build phase has not started.**

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
  - `aethermoor-interactive-image-map-polished.html`: an illustrated map, a 4.8 MB PNG with SVG markers in a 1200×800 viewBox.
  - `aethermoor-character-sheet-4.html`: the character sheet.
- **Latest instruction:** "the game is so much fun... let's not overwrite the saves we have, so after the next checkpoint deliver an HTML download link". So:
  - **Never republish the M2 page** at https://claude.ai/artifact/9i9bPrdG6ZY22xWnXgGUQa. The player's saves live in its localStorage.
  - **Deliver M3 as a file**: `game/dist/aethermoor-m3.html`, sent as a download.
  - The player moves their progress over with a **save code**: in M2, Settings → Make a save code (`AETH1.…`); in M3, Settings → Load a code. M3 must migrate it.
  - Caveat to tell the player: iPhone's Files preview does not run JavaScript. If they want it on the phone, offer to publish a **new, separate** page that doesn't touch the M2 URL.
- **Design brief:** `docs/DESIGN-BRIEF.md` is the synthesized game design. Sections 2, 3, 9, 12 ("Open world rules") and 13 (roadmap, "What's in the M3 slice") matter most.

**Other links:** the Loot Forge prototype (M1) is at https://claude.ai/artifact/7VLRxPNbLLjf6etdK87FW4, source `prototypes/item-card.html`.

## 2. Milestone plan

The roadmap is in `docs/DESIGN-BRIEF.md` §13. Status:

| Milestone | Status | Notes |
|---|---|---|
| M0 Engine | ✅ done | Build pipeline, seeded RNG and dice, saves and export codes, input, audio synth, app shell |
| M1 "The Card" (Loot Forge) | ✅ done | Prototype approved by the player; its art pipeline was ported into `game/src/art/` |
| M2 "Gauntlet" | ✅ done, **published** | Full battle system plus a fixed 14-node road. See the list below. Frozen copy at `game/dist/aethermoor-m2.html` |
| **M3 "The Verdant Wilds" walkable slice** | 🟡 **in progress** | Spec ✅, prep fixtures ✅, scaffold ✅, **Build ⬜**, Integrate ⬜, Review ⬜, Deliver ⬜ |
| M4 | ⬜ not started | Sunscorch opens (plus the full Codex binder, Hilda's full forge). Plugs in through `REGIONS` and the sealed exits |
| M5 | ⬜ not started | Ironspire and Hush |
| M6 | ⬜ not started | Gloomfen, Hodge, Tamsin's fall |
| M7 | ⬜ not started | The Hollow Council, the Unsmith, 3 endings, the Heat ladder |
| M8 | ⬜ not started | The optional Hearthteller (AI DM) and cloud saves |

**What M2 contains:**
- **New game:** name, look, 4d6-drop-lowest or the standard array, and a choice of 3 starter heirlooms, then the prologue.
- **Battles:**
  - A d20 against Guard, with a graze window of 3 for half damage and a nat 20 Legend Strike.
  - Foe intent dice, with tiers d6/d8/d12/d20.
  - The Initiative Ribbon, Legend Surge and the Grip & Claim meter.
  - Auto battle and 1×/2×/4× speed.
- **Loot:**
  - 12 named relics held by named foes, with a chest-by-chest card reveal.
  - The Waking loop: beat Briarmaw, earn a Brand, and every foe re-arms.
  - Grudges.
- **Screens:** party and equipment, the Codex and settings.

**Known M2 weak spots:**
- The briarling art is simple.
- The thornhound (wolf) animation is stiff.
- Briarmaw's nameplate overlaps at 360 px.
- The identify roll is flavour only.
- Codex page rewards and the Awakened stamp are not implemented.

## 3. Where M3 stands (exactly)

**The contract is `game/docs/M3-SPEC.md`.**
- Part A holds my integrator amendments, and they win over Part B.
- Part B is the full spec (about 15k words).
- The spec came from a design workflow: three independent designs (engine, world and player lenses), three judges, then a synthesis. Design C (player/phone-first) won 73.5 to 70 (A) to 63.5 (B). Design A's pure lockstep world engine and save layering were grafted onto it.
- The raw designs and verdicts are in `game/docs/m3/`.

**Scope in one breath:**
- **Places:** 14 maps. There are 10 Hearthfires (4 start cold) and 5 sealed exits toward Sunscorch, Ironspire and Gloomfen. The Keep sits on its lake island with a causeway bridge, as in the player's map.
- **Enemies:** visible roaming packs. Weak packs flee, and walking into one is a "Rout" (an instant win). You get First Strike or are ambushed depending on facing.
- **Foes and relics:** 18 foe families (10 new), 7 named holders, and 24 relics (12 new), each with a map power.
- **Locks:** every lock has two keys, a relic map power OR a Domain level.
- **Bosses:** Briarmaw, the Rotwarden (3 phases, a breakable mask and seed) and a Tamsin duel. She lends a counter-starter; losing is a yield.
- **Quests:** 5 quests, 6 bounties, the Ladder board, 2 Unsmith letters, and Hilda's Temper (+1 to +3, 1:1 enchant).
- **Menus:** an Atlas that uses the player's illustrated map (WebP ≤ 150 KB) for fast travel, and a Journal.
- **Saves:** save v2 with a v1 → v2 migration. The v1 key is never written, and there is a `.bak` backup.

**Done:**
1. `docs/M3-SPEC.md`, committed.
2. **Prep** (`docs/m3/PREP-REPORT.md`):
   - `tools/make-v1-fixtures.mjs` generated **18 real M2 saves** from the unmodified M2 rules into `test/fixtures/v1/`, each with an `AETH1` code. That is one per node, plus after-brand, waking2-dupe, grudges and shattered.
   - It also wrote `test/fixtures/m2-spawns.json`.
   - `node tools/make-v1-fixtures.mjs --check` verifies determinism.
   - The generator refuses to run once `src/` makes v2 games, so the files are now the frozen record.
3. **Scaffold** (`docs/m3/SCAFFOLD-REPORT.md`, **read it**): every new file exists with its final export names.
   - **Already real:**
     - `rules/cond.js`, `rules/path.js`, `rules/migrate.js` (the exact spec §4.9 code)
     - `data/tiles.js`, `locks.js`, `world.js`, `maps/index.js`
     - the story data (19 NPCs, about 40 dialogue nodes, quests, bounties, shops, ladder, letters)
     - the new foe and relic data entries
     - the TUNING keys
     - the §4.8 save functions (with transitional M2 behaviour)
   - **First cut:**
     - `rules/world.js`: everything except the roamers, which are still `[]`
     - `rules/story.js`
     - the 14 maps: all entities are at spec coordinates, but the tiles are a simple draft and the locks are not walled in yet
   - **Placeholder:**
     - all overworld art (flat colours)
     - the new foe art (aliased to M2 art)
     - `ui/screens/world.js` (arrow keys walk; nothing is saved)
     - `ui/world/*`, `atlas`, `journal`
     - `atlas-image.js` (1×1)
     - `routPack` spoils
   - M2 still plays end to end: title → new game → road → battle → aftermath.
4. Gates at handoff:
   - `npm test`: 108/108
   - lint: clean
   - build: 987 KB
   - `e2e-flow`: passes at both sizes
   - `e2e-world` (scaffold version): passes

**Open items the scaffold listed** (also in `SCAFFOLD-REPORT.md` → "Open items"):
- **WP2:**
  - `battle.js` must copy `ctx.firstStrike` and `ctx.warded`.
  - `escalateSpawn` must use `familyOf(spawn).tier`, `rabbleLevels`, `wakeLevels` and `noWaking`.
  - `lend` must never be claimed or shattered.
  - Drop the transitional M2 behaviour from `save.js` once `newGame` makes v2 games.
- **WP4:**
  - `opens:'bramble-toll-chain'` on the bramble-toll encounter.
  - `region:'verdant'` on the M2 encounters, or `earnBrand` treats a missing region as verdant.
  - Nothing sets `bell-rung` or `act1-complete` yet.
- **WP6B:** `RELIC_ART` for relics 13–24 does not exist yet. Fallbacks keep everything from throwing.

**Next concrete steps:**
1. **Tool prerequisite.** `game/docs/m3/m3-build.workflow.js` tells builders to use private build folders, so add these first:
   - `tools/build.mjs --out <dir>`: today it always writes `game/dist/`.
   - An `AETH_HTML=<path>` env override in `tools/e2e-flow.mjs`, `e2e-battle.mjs` and `e2e-world.mjs`.
   - Why: parallel agents building into the same `dist/` clobber each other.
2. **Run the Build.**
   - The previous session ran with ultracode on and the player opted into multi-agent workflows. In a new session, only run workflows if the player opts in again (see the Workflow tool rules). Otherwise implement the packages sequentially.
   - The drafted script is `game/docs/m3/m3-build.workflow.js`. Run it via the Workflow tool with `scriptPath` and `args: { scaffold: <text of docs/m3/SCAFFOLD-REPORT.md>, prep: <text of docs/m3/PREP-REPORT.md> }`.
   - It runs 11 work packages in parallel, in two rounds: WP1, WP2, WP3, WP3B, WP3S, WP4, WP5, WP6A, WP6B, WP7 and WP8. File ownership is in spec §6.1 plus A4.
   - Then Integrate (Gates 2–3), then Tune (balance Gate 4 and performance/migration Gate 5 in parallel), then Final. The last step writes `docs/M3-STATUS.md`.
   - Commit and push after each workflow. Agents never run git.
3. **Review workflow.**
   - Dimensions: correctness, save migration, security (`esc`/`textContent`, pasted codes), phone UX at 360 px, performance, art quality.
   - Verify each finding adversarially, then fix.
4. **Your own checks.** Play through at 360×740 and 1280×800. Paste real fixture codes (`test/fixtures/v1/*.code.txt`) into the built `dist/aethermoor-m3.html`. Run the balance sim.
5. **Deliver.**
   - Read the whole `dist/aethermoor-m3.html` before sending it; that is required for any file you didn't write. Commit and push.
   - Send the file with SendUserFile (`display: 'attach'`) as the download.
   - Tell the player how to move their save (M2 Settings → Make a save code, then M3 Settings → Load a code).
   - Mention the iPhone caveat, and offer a **new, separate** page for phone play. **Do not republish the M2 URL.**
6. **Then M4:** Sunscorch, as data plus maps through the `REGIONS` and sealed-exit plug point (spec §2.6).

## 4. Architecture and key decisions

- The code lives in `game/`: ES modules bundled by esbuild (IIFE, not minified) into **one self-contained HTML file**.
- `tools/build.mjs` inlines the JS and CSS into `src/index.html` (split at `<!--BODY-->`). It writes:
  - `dist/aethermoor.html`: a full document, for local play
  - `dist/aethermoor.artifact.html`: a fragment with no doctype/html/head/body, for claude.ai pages
- The only outside request allowed is Google Fonts. All art, music and data are generated or embedded.
- `game/ARCHITECTURE.md` is the technical contract: the state shape, the battle API, the event table and the shared vocabulary.

**Layers** (dependencies point downward only: `ui → art/rules → data/core`):

| Folder | What it holds |
|---|---|
| `src/core/` | `rng.js` (a serializable mulberry32), `dice.js`, `save.js` (localStorage guarded by try/catch, `AETH1.`/`AETH2.` base64 codes, `scrub()` of pasted codes), `input.js`, `audio.js` (a WebAudio synth that starts only after a gesture) |
| `src/data/` | Frozen tables: heroes, foes, items, affixes, rarity, aspects, skills, statuses, relics, encounters, omens, tuning. New in M3: tiles, locks, world, `maps/*`, npcs, dialogue, quests, shops, ladder, letters |
| `src/rules/` | **Pure, deterministic** logic with no DOM, `Math.random` or `Date`; randomness comes from a seeded RNG passed in. Modules: stats, foe (`buildFoe`, `escalateSpawn`), ai, combat, battle (`createBattle`, `act`/`foeTurn` return `{state, events}`), loot, progression, party (equip/reforge), autoplay, and gauntlet (the flow: `newGame`, `spawnsFor`, `startBattle`, `resolveBattle`, `rest`; the name was kept for import stability). New in M3: world, cond, path, story, migrate |
| `src/art/` | The procedural "Forge" renderer (shapes → heights → lighting → palette ramps → outline, rim and aura), returning ImageData. Files: `recipes.js` (items), `heroes.js` and `hero-looks.js` (battle heroes; **frozen**, the player approved them), `foes.js`, `scenes.js` (backdrops), `icons.js`, `cache.js`. New in M3: `tiles.js`, `walkers.js` (a separate 16×24 rig), `map-sprites.js`. Documented in `game/docs/ART.md` |
| `src/ui/` | `app.js` (the shell: ctx with `game`, `setGame` (autosaves), `settings`, `audio`, `input`, `toast`, `go(name, params)`, `services`, `reduced()`), screens (`mount(root, ctx, params)` returning `{unmount, onAction}`), `card.js` (services `cardReveal`, `cardSlam`, `cardPreview`, `cardInspect`), `battle/*`, `lib/*` |
| `src/main.js` | Registers the screens, installs the card services, and exposes a test seam: `globalThis.__aethTest(app)` if defined |

**Why the main decisions were made:**
- **Rules are pure and seeded.** Any battle or walk can be replayed and tested in Node. Balance is simulated in `tools/sim.mjs` with 200 seeds. The M3 world engine is a lockstep tick function, and roamers use their own RNG stream (`roam:seed:map:visits`), so `Walk` is plain JSON that tests can compare deep-equal.
- **Art is procedural code.** The whole game stays one small file (M2 was 866 KB) that works offline, and one art seed draws an item at every size, so the item on the card is visibly the item on the sprite. That is the player's core hook.
- **Every relic is held by a named foe.** You pry it loose with the Grip meter, and killing the holder first shatters it. Loot is visible before the fight, so every fight has a point; this is the "Hearth & Heirloom" design.
- **The Waking escalation.** Each Brand re-arms every foe, giving "stronger and stronger bad guys". In M3, rabble get only +2 levels per Waking (other tiers +6), so weak packs still flee.
- **Save migration is injected.** It is passed as `loadGame(migrate)` / `importCode(code, migrate)`, so `core/` never imports `rules/`. The v1 key is never written, so the M2 page keeps working.
- **Map foe sprites are drawn fresh, not shrunk.** Downscaling battle art for the map turns to mud, so walkers and map foes get dedicated rigs. `heroes.js` and `hero-looks.js` stay frozen so the approved battle look can't regress.
- **Parallel agents get disjoint file ownership** and no git access. They coordinate through `game/notes/<WP>.md`, the spec and stub-first scaffolding. This is how M1–M3 were built quickly.

## 5. Build, run, test

```bash
cd game
npm install                      # esbuild only
npm run build                    # dist/aethermoor.html (open on a laptop) + dist/aethermoor.artifact.html
npm test                         # node --test test/*.test.mjs  (108 tests at handoff)
npm run lint                     # eslint src test tools; no-undef is an error
export NODE_PATH=$(npm root -g)  # Playwright is global, not a project dependency; Chromium is at /opt/pw-browsers
node tools/e2e-flow.mjs          # whole-game flow at phone and laptop sizes
node tools/e2e-battle.mjs        # 14 battle scenarios
node tools/e2e-world.mjs         # world screen (scaffold version now)
node tools/sim.mjs --seeds 200   # balance tables (M2 Gauntlet; M3 modes are to be added by WP4)
node tools/make-v1-fixtures.mjs --check   # M2 fixtures still deterministic
node tools/gallery.mjs           # art gallery screenshots into tools/shots/
node tools/dev-battle.mjs        # tools/shots/dev-battle.html#node=oldsnag&level=5
node tools/map-draft.mjs --all   # ASCII preview of every M3 map with entities
```

Screenshots go to `game/tools/shots/`. To look at one, read the PNG.

## 6. Gotchas, known bugs and approaches that failed

**Testing and tooling:**
- `node --test test/` fails with "Cannot find module". Use the glob `test/*.test.mjs`, which the npm script already does.
- ESM ignores `NODE_PATH`. In `.mjs` tools, load Playwright with `createRequire(<global npm root>/)('playwright')`, as `tools/e2e-flow.mjs` does.
- In the sandbox, headless Chromium can't reach Google Fonts, so font requests fail. The e2e tools ignore those; don't treat them as bugs.
- Python PIL is not installed. To process images, draw them on a canvas in Chromium and use `toDataURL('image/webp', q)`. See `game/docs/m3/atlas-shrink-example.mjs`. The illustrated map measured about 141 KB at 960×640 and q 0.6.
- **Parallel agents sharing `dist/`** will read each other's half-written builds. Add `--out` and `AETH_HTML` first (§3, step 1).
- **Performance gates** at 16 ms under 4× CPU throttle fail at random in headless CI. The hard fail is p95 33 ms and 60 `drawImage` calls per frame (A7). Always print the measured numbers.

**Security:**
- `ui/lib/dom.js` `el()` sets **innerHTML when given a string**. Every user-provided or saved string must go through `esc()` or `textContent`.
- Pasted save codes are untrusted. `save.js` `scrub()` strips `<` and `>` from every string and key.

**Save-data quirks:**
- M2's `earnBrand` pushes the Brand on every Briarmaw win, so an M2 save can hold `['brand-of-briars','brand-of-briars']`. Count Brands with `new Set(brands).size` and keep the array byte for byte.
- In `v1-waking2-dupe`, the Warden wields a dropped rondel, not the starter. To work out the starter, read the codex (`migrate.starterOf`).
- The scaffold's `save.js` is **transitional**:
  - `loadGame()` with no argument returns the raw v1 game.
  - Version-1 games still write the v1 key.
  - `clearGame` still removes v1.
  WP2 must finish the switch; spec §4.8 is the target.

**Content consistency:**
- **Tamsin is "she"**, to match the shipped prologue (`newgame.js`). The design brief says "he"; ignore that.
- The M2 encounters, spawn arrays and PATROLS must stay **byte-identical**. A test checks them against `m2-spawns.json`. The name "Ledger-Maud" therefore lives only in the Ladder.

**Process:**
- The first concept workflow was thrown away when the player redirected toward "stronger bad guys + epic items + the item card". Lead with that hook.
- The stop hook requires every change to be committed **and pushed** before a turn ends.
- A few agents ran a read-only `git status` despite instructions. It was harmless, but keep telling them not to.
