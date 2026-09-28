# Handoff: Aethermoor: Hearth & Heirloom

This is for a fresh session with none of the earlier conversation. Read it top to bottom, then read `CLAUDE.md`, and you can start milestone 4 without re-exploring.

- **Branch:** `claude/cool-ptolemy-uc93gg`. It contains the whole history of the earlier branch `claude/dnd-game-prototype-bsv3xb`. If your session names a different branch, use that one and carry this history over. Never create a PR unless the player asks for one.
- **State at handoff:** **M3 is done and delivered** as the download `game/dist/aethermoor-m3.html`. Every gate is green: 160/160 tests, lint, build (1369 KB), `e2e-world`, `e2e-flow` and `e2e-battle` at both sizes, the balance sim on target. The full record is `game/docs/M3-STATUS.md`. **M4 has not started.**

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
  - The player moves their progress with a **save code**: M2 Settings → Make a save code (`AETH1.…`); M3 Settings → Load a code. M3's own codes start `AETH2.`. The next milestone must load both.
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
| M3 "The Verdant Wilds" | ✅ **done, delivered as a download** | 14 walkable maps, roaming packs, locks, quests, the Atlas and Journal, save v2. See `game/docs/M3-STATUS.md` |
| **M4** | ⬜ **next** | Sunscorch, the full Codex binder, Hilda's full forge, Grudges. Plugs in through `REGIONS` and the sealed exits |
| M5 | ⬜ | Ironspire and Hush |
| M6 | ⬜ | Gloomfen, Hodge, Tamsin's fall |
| M7 | ⬜ | The Hollow Council, the Unsmith, 3 endings, the Heat ladder |
| M8 | ⬜ | The optional Hearthteller (AI DM) and cloud saves |

## 3. Where things stand

**M3 in one breath** (details and numbers in `game/docs/M3-STATUS.md`):
- **Places:** 14 maps: the Keep (courtyard and Great Hall) on its lake island, the Hearth Road, Thornhollow, the Thornway, Briarmaw's Den, Mossfall, Mosswatch (2 floors), the Hindwood, Fawnrest, Eldergrove and the Heartroot (2 maps). 10 Hearthfires (4 start cold), 5 sealed exits.
- **World engine:** `rules/world.js` is a pure lockstep engine: one tick per step plus an idle tick every 400 ms. Roamers use their own RNG stream (`roam:seed:map:visits`), so `Walk` is plain JSON. Weak packs flee and walking into one is a Rout; First Strike or ambush by facing.
- **Content:** 19 foe families (18 plus the Tamsin rival), 24 relics each with a map power, 11 lock types with two keys each (a relic power OR a Domain level), 18 chests, 5 quests, 6 bounties, the Ladder, 2 Unsmith letters, Hilda's Temper (+1 to +3), 2 shops, the walkable reliquary.
- **Bosses:** Briarmaw, the Rotwarden (3 phases, the Ichor Mask, the First Seed), the Tamsin duel (losing is a yield).
- **Saves:** `aethermoor.save.v2` with `.bak`; the v1 key is only ever read. `AETH2.` codes; `AETH1.` codes migrate through `rules/migrate.js`.
- **Balance** (`tools/sim.mjs`, 200 seeds): every M3 target met, 0 stuck runs. Table in `docs/RULES.md`.
- **Known issues:** in `M3-STATUS.md` §3. The top two: the bundle is 1369 KB (over the 1.3 MB warning, under the 1.6 MB fail), and the direct path reaches the Rotwarden at level 9.7 (36% first-try wipe, inside the target).

**How M3 was built** (so M4 can reuse it):
1. A spec from a design panel (3 designs, 3 judges, a synthesis), with the integrator's amendments on top: `game/docs/M3-SPEC.md` (Part A wins over Part B). Raw designs in `game/docs/m3/`.
2. Prep: `tools/make-v1-fixtures.mjs` generated 18 real M2 saves (`test/fixtures/v1/`) and `test/fixtures/m2-spawns.json` from the unmodified M2 rules. Those files are now the frozen record; the generator refuses to run against v2 code.
3. A scaffold with every file and export name in place (`game/docs/m3/SCAFFOLD-REPORT.md`).
4. 11 work packages with disjoint file ownership (spec §6.1 plus A4). Builders use private build folders: `node tools/build.mjs --out <dir>` and `AETH_HTML=<dir>/aethermoor.html` for the e2e tools.
5. Integrate, tune (balance and performance), review, own checks, deliver.

**Next concrete steps (M4):**
1. **Ask the player how M3 plays** before building much: they may have feedback that changes M4's priorities. Their answer outranks this list.
2. **Write `game/docs/M4-SPEC.md`**, in the same shape as the M3 spec: scope in/out/stretch, maps and connections, content tables, data formats, work packages with file ownership, gates. Sources: `docs/DESIGN-BRIEF.md` (§3 foes, §4 loot, §9 world, §13 roadmap: "Sunscorch, full Codex binder, Hilda's full forge, Grudges") and the player's map (Sunscorch sits at lore `[870,470]` in the 1200×800 viewBox).
   - Only use the Workflow tool (a design panel or a parallel build) if the player opts in again in the new session. Otherwise write the spec and build the packages yourself, with individual subagents for independent packages if useful.
3. **Open Sunscorch with data**, as spec §2.6 planned: add its maps, then replace `keep-se`'s `sealed` with `to`/`anchor` plus `gate:{flag:'act1-complete'}`. `REGIONS.sunscorch` gets `open:true` and its Brands. No engine change should be needed; if one is, keep `rules/world.js` pure.
4. **The full Codex binder and Hilda's full forge:** these are the loot systems M3 left out (awakening, gems, reroll, salvage). Awakening fills the Codex's Awakened stamp, which exists but nothing sets it.
5. **Saves:** keep loading v1 codes and saves, and v2. If the state shape changes, add a v2 → v3 step as a pure function in `rules/migrate.js`, with fixtures made from real M3 saves first (write a generator like `make-v1-fixtures.mjs` before changing any rules).
6. **Deliver** `dist/aethermoor-m4.html` the same way as M3 (§6 "Delivery" below).

## 4. Architecture and key decisions

- The code lives in `game/`: ES modules bundled by esbuild (IIFE, whitespace-minified with identifiers kept) into **one self-contained HTML file**.
- `tools/build.mjs` inlines the JS and CSS into `src/index.html` (split at `<!--BODY-->`). It writes, into `dist/` or `--out <dir>`:
  - `aethermoor.html`: a full document, for local play
  - `aethermoor.artifact.html`: a fragment with no doctype/html/head/body, for claude.ai pages
  - `aethermoor-m3.html`: the delivery copy (rename for M4; `dist/aethermoor-m3.html` is committed as delivered)
  - It warns above 1.3 MB and fails above 1.6 MB (spec A8).
- The only outside request allowed is Google Fonts. All art, music and data are generated or embedded.
- `game/ARCHITECTURE.md` is the technical contract: the state shape (v2), the battle API, the world engine, the event table and the shared vocabulary.

**Layers** (dependencies point downward only: `ui → art/rules → data/core`; inside `rules/`: `world → story → cond → gauntlet`, and `gauntlet` never imports those three):

| Folder | What it holds |
|---|---|
| `src/core/` | `rng.js` (a serializable mulberry32), `dice.js`, `save.js` (v2 key plus `.bak`, `AETH1.`/`AETH2.` codes, `scrub()` of pasted codes, migration injected as a function), `input.js`, `audio.js` (a WebAudio synth that starts only after a gesture) |
| `src/data/` | Frozen tables: heroes, foes, items, affixes, rarity, aspects, skills, statuses, relics, encounters, omens, tuning, domains, names. M3: tiles, locks, world (`REGIONS`, `HEARTHS`, `ZONES`, `START_AT`), `maps/*` (14 maps), npcs, dialogue, quests, shops, ladder, letters |
| `src/rules/` | **Pure, deterministic** logic with no DOM, `Math.random` or `Date`. stats, foe (`buildFoe`, `escalateSpawn`, `addOmens`), ai, combat, battle, loot (`routSpoils`), progression, party (equip, reforge, `temper`, `buy`), autoplay, gauntlet (the flow: `newGame`, `startBattle`, `resolveBattle`, `earnBrand`, wipe, `yieldDuel`, `routPack`, `rest`). M3: world (`enterMap`, `move`, `tick`, `interact`, `present`, `threat`, `commit`, roamers), story (dialogue, quests, bounties, letters), cond (conditions), path (A*), migrate (v1 → v2) |
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
npm test                         # node --test test/*.test.mjs  (160 tests)
npm run lint                     # eslint src test tools; no-undef is an error
export NODE_PATH=$(npm root -g)  # Playwright is global; Chromium is at /opt/pw-browsers
node tools/e2e-world.mjs         # 11 world scenarios at 360x740 and 1280x800 (~20 min), prints PERF lines
node tools/e2e-flow.mjs          # the shell around the world, plus an M2 profile (~15 min)
node tools/e2e-battle.mjs        # 16 battle scenarios (~5 min)
node tools/e2e-codes.mjs         # pastes all 18 real M2 codes at both sizes (~10 min)
node tools/sim.mjs --seeds 200   # balance, all modes (~5 min); --modes, --seed N, --trace
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
- The stop hook requires every change to be committed **and pushed** before a turn ends.
- Subagents never run git; tell them so in every prompt. Background agents can die on the account's usage limit, so keep each package small enough to finish, and check their notes before relaunching.

**Delivery** (how M3 went out, repeat it for M4):
1. `npm run build`, then audit the delivery file before sending it: the only URLs are Google Fonts (and the SVG namespace); no `fetch`/XHR/WebSocket/`eval`, no local paths, no AI model names; look at its HTML shell. Publishing it as a claude.ai page is different: the Artifact rules require reading the whole file first.
2. Commit it (un-ignore it in `game/.gitignore`), push.
3. Send it with SendUserFile, `display: 'attach'`.
4. Tell the player how to move their save (old version: Settings → Make a save code; new version: Settings → Load a code), the iPhone caveat, and offer a new, separate page for phone play. Never republish the M2 URL.
