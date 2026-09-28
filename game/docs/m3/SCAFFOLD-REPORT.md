# M3 Scaffold (A3 step 2): handoff to the Build work packages

Every new file that §6.1 and A4 assign is now in place, with the final export names and placeholder or first-cut behaviour. `npm test`, `npm run lint` and `npm run build` all pass, and M2 still plays end to end.

**Results:**
- **`npm test`:** 108/108 pass (it was 63; the new tests are listed at the end).
- **`npm run lint`:** clean.
- **`npm run build`:** passes. `dist/aethermoor.html` is 987 KB, up from 866 KB in M2. `dist/aethermoor-m2.html` was not touched.
- **`NODE_PATH=$(npm root -g) node tools/e2e-flow.mjs`:** passes, with 0 console errors on phone and laptop.
- **`node tools/e2e-world.mjs`:** passes at 360×740 and 1280×800.
- **`node tools/make-v1-fixtures.mjs --check`:** "All 38 files match a fresh run", after one small edit to the generator (A5 below).
- **Art:** a throwaway Chromium check rendered every foe art key × every relic × 4 poses (5,408 renders) with no errors. `tileAtlas`, `walkerSheet`, `npcSheet`, `mapFoeSheet`, `objectSprite`, `emote` and `foeLooks` also ran without error.
- **Import direction (A6):** holds. The chain is `world → story → cond → gauntlet`. `gauntlet` never imports world, story or cond. `migrate` imports data only, and `data/` imports nothing from `rules/`.
- **One rule broken:** I ran a single read-only `git status` by mistake. It changed nothing, and I ran no other git commands.

## Files and exports

### rules/ (WP1, WP2)

- **`rules/cond.js`** — real.
  - `check(game, cond) -> bool` covers every §4.3 form. `{domain, level}` is tested before `{level}`.
  - `{since:{flag, days}}` holds when `story[flag]` is not a number yet, or when `day − story[flag] ≥ days`.
  - Helpers: `questState(game, id)` returns `'hidden'|'active'|'ready'|'done'`. Also `condErrors(cond, at?) -> [string]` and `COND_KEYS`.
  - Also exported: `ownedRelics`, `wornRelics`, `bestDomain(game, d) -> {level, heroId}`, `isBeaten`, `flagsOf`, `storyOf`.
- **`rules/path.js`** — real.
  - `aStar({from, to, passable(x,y,dir), max=48, adjacent=false, w, h}) -> [[x,y]…] | null` (4-way).
  - Also `dirTo(a, b)`, `DIRS` and `DIR_KEYS`.
- **`rules/story.js`** — working first cut; exports exactly the §4.4 list.
  - Odds are exact from the d20: advantage is 1−(1−p)². Contests use a small probability table over the checks.
  - Rolls come from `rngState`, and every effect in §4.4 is applied.
  - Placeholder parts: the check bonus is IB(level) + ability mod, using the hero's base score; a hero without the Domain gets 0 IB.
  - Bounties are turned in with `claimQuest(game, 'bounty:<id>')`, which stores `flags.quests['bounty:<id>'] = 'claimed'`.
- **`rules/world.js`** — every §4.5 export, as a working first cut.
  - Works now: `enterMap` (counts visits, seeds `walk.rng`, fires 'enter' triggers), `move` (the §4.5 event order, ledges, step triggers, ichor `hazard` event), `interact`, `tick`, `commit` (returns the same object when nothing changed), `present` (memoised per game object), `canWalk`, `findPath`, `threat`, `keys`, `lockStatus`, `openLock`, `openChest` (items from `createRng('chest:'+seed+':'+id)` at map level + 6 × Waking), `sightEncounter`, `light`, `isWeak`.
  - Not built yet: roamers (`walk.roamers` stays `[]`), sighting while walking, and actual HP loss from ichor.
  - Extra exports: `registerMap(map)` (for test fixtures only), `mapOf` and `covers`.
- **`rules/migrate.js`** — the exact §4.9 code: `migrate` and `starterOf`.

### `rules/gauntlet.js` (WP2)

Every M2 export and its behaviour is unchanged. Added:
- `partyLevel(game)` and `uniqueBrands(game)` — real.
- `travel(game, hfId)` — real. It needs `kindled[hfId]` and sets `pos` to the Hearthfire's stand.
- `routPack(game, {nodeId}|{spawns}) -> {game, report:{result:'rout', xp, gold, drops:[], consumables:{}, levelUps}}`. Placeholder: no spoils roll yet.
- `rest(game, hfId?)`: with an `hfId` it also sets `kindled[hfId]`.
- `startBattle(game, {nodeId}|{patrol:{spawns, where, backdrop}}, {ambush, firstStrike})`. `firstStrike` is passed into `ctx`, but `battle.js` does not copy it yet (WP2).
- `spawnsFor` now resolves `level:'party'` (plus `partyDelta`), `'$rival'` for both variant and relic, `lend` (held becomes `[{relic, lend:true}]`) and `noWaking`.

### `core/save.js` (WP2)

All §4.8 functions are working: `loadGame(migrate) -> {game, from}|null`, `saveGame`, `clearGame`, `hasSave`, `backupGame`, `restoreBackup(migrate)`, `hasBackup`, `hasV1`, `readV1`, `markMigrated`, `exportCode`, `exportV1Code`, `importCode(code, migrate?)`.

It still uses M2 behaviour in three places until WP2 and WP8 switch the game to v2:
- `loadGame()` with no argument returns the raw v1 game, as in M2.
- `saveGame` and `exportCode` choose by `game.version`: a version-1 game still writes the v1 key and exports `AETH1.`; a v2 game writes the v2 key and exports `AETH2.`.
- `clearGame` removes the v2 key and also the v1 key (M2 behaviour).
- `importCode` accepts both prefixes. Its error message now reads "Codes start with AETH1. or AETH2."

### data/

- **`tiles.js`** — real: `LEGEND`, `TILES` (by id), `TILE_IDS`, `TILE_CHARS`, `TILE_FRAMES = 2`, `tileOf(ch)`. An unknown character reads as solid void.
- **`locks.js`** — real: `LOCKS[id] = {id, name, powers, domain:{id, level}, soft: false | {vision:2} | {hpPct:0.04}, text, useText}`, `LOCK_IDS`, and `CROWNWALL` (with `cutText`).
- **`world.js`** — real: `REGIONS`, `REGION_IDS`, `BRAND_TOTAL = 8`, `ZONES[id] = {id, level, sets, backdrop}`, `HEARTHS[id] = {map, x, y, face, lore, name, cold}`, `HEARTH_IDS`, `START_AT`, `LORE` (the 17 places), `CRITICAL_PATH`, `LEADS`.
- **`maps/index.js`** — real: `MAPS`, `MAP_IDS`, `ENTITY_OF`, `anchor(map, name)`, `v1Anchor(nodeId)`.
- **The 14 map files** have every exit, anchor (all 14 `v1:` anchors), encounter and Hearthfire at their spec coordinates. So are the gates, crownwalls, locks, chests (with loot), NPCs, signs, boards, the 24 pedestals, triggers, the light, lookouts, the bell-frame and the deer props.
  - The tiles are a simple draft: border, fill, a road spine, bridge rows (A2), the millrace, the Mossfall islet, the Smugglers' Hollow, the ledger room, ichor pools and the grove ring.
  - Locks are placed but not walled in, so you can walk round them. WP3 and WP3B enforce the gating and reachability.
  - Files are default exports wrapped in `deepFreeze`, with row numbers in comments.
- **`npcs.js`** (`NPCS`, `NPC_IDS`; 19 NPCs), **`dialogue.js`** (`DIALOGUE`, `DIALOGUE_IDS`; about 40 nodes, all §3.1 lines), **`quests.js`** (`QUESTS` ×5, `BOUNTIES` ×6, `QUEST_IDS`, `BOUNTY_IDS`), **`shops.js`** (`SHOPS`: marta, nell), **`ladder.js`** (`LADDER`: 17 posters plus 3 silhouettes) and **`letters.js`** (`LETTERS` ×2). These are real content in the §4.4 shapes.
- **`foes.js`** — adds the 10 new families, `tamsin` (variants keyed by the starter she carries), and variants `bandit/poacher`, `tallyman/{signalmaster, counter, apothecary}`, `smuggler/queen`, `feral-druid/thornmother` and `hollowed-ranger/sergeant`. Stats follow the §3.2 table. The M2 bandit and tallyman moves were moved into shared constants with their values unchanged.
- **`relics.js`** — relics 13–24 are heirlooms with `power`, `mapPower`, grip and my chosen ilvl (6–13).
- **`encounters.js`**:
  - Adds the 18 §3.3 fights and 6 Hearthfires, all with `region: 'verdant'`.
  - Adds the PATROLS sets `mossfall`, `hindwood` and `heartroot`.
  - `BRANDS` gains `region` and the new `brand-of-the-heartroot`.
  - `BACKDROPS` gains the 5 new ids.
  - The M2 entries and spawns are byte-identical; a test checks this against `m2-spawns.json`.
- **`heroes.js`** — `STARTERS[x].rival` is the starter whose aspect beats yours: hearthbrand → cairnmaul, stillwater-lance → hearthbrand, cairnmaul → stillwater-lance.
- **`tuning.js`** — the new keys are listed under "TUNING keys added" below.

### art/ (WP5, WP6A)

All flat-colour placeholders at the right sizes:
- **`tiles.js`** — `tileAtlas(biome)` returns `{img, at(tileId, variant, frame), variants, frames}`. Also `TILE_PX` and `BIOMES`.
- **`walkers.js`** — `walkerSheet(heroId, gear, {custom})` returns `{img 48×96, w:16, h:24, foot:[8,23]}`. Also `boxSheet` and the `WALKER_*` constants.
- **`map-sprites.js`** — `npcSheet(artKey)`, `mapFoeSheet(artKey, {gearTier, variant})` (returns `frames:2, rows:4`), `objectSprite(kind, state)`, `emote(kind)`, plus `NPC_LOOKS`, `OBJECT_KINDS` and `EMOTES`.
- **`index.js`** — re-exports all of these plus `foeLooks`.
- **`foes.js`**:
  - `foeLooks(key, {gearTier}) -> {H, gear}` is real for humanoids and returns `{H:null, gear:{}}` for beasts.
  - `FOE_ART` aliases cover every new key, following the §5.1 list.
  - Two families were not on that list: feral-druid now uses bandit art, and hollowed-ranger uses cutpurse art.
  - The named holders (mags, haskett, hollis, dun, vesper, oda, corra) use their family's art. Tamsin uses bandit art.

### ui/ (WP7, WP8)

- **`screens/world.js`** — placeholder `mount`. It shows the map name and position, walks with the arrow keys through `rules/world.js`, and has buttons for Party, Atlas, Journal and the old road.
  - It keeps its game in memory only (never calls `setGame`), so the M2 save is not written.
  - It installs the `window.__world` test seam (`state`, `teleport`, `press`, `step`, `interact`) and imports `world.css`.
- **`ui/world/*.js`** — named exports, each documented in its file header:
  - `constants.js`: `TILE`, `STEP_MS`, `RUN_MS`, `IDLE_TICK_MS`, `HOLD_MS`, `ANIM_FLIP_MS`, `FADE_MS`, `CHUNK`, `MAX_PATH`, `SAVE_EVERY_STEPS`, `NEAR_TILES`, `SCALE_MIN`, `SCALE_MAX`, `TARGET_PX`, `MAP_ZOOM`, `HUD_H`, `BUST_H`, `DECK_H`, `DPAD_PX`, `DPAD_DEAD`, `TYPE_CPS`, `DEAD_ZONE`, `DRAW_BUDGET`.
  - `session.js`: `session`, `getWalk`, `setWalk`, `setPending`, `takePending`, `clearSession`.
  - `camera.js`: `scaleFor`, `backingSize`, `createCamera` (the scaling formulas are real).
  - `loop.js`: `createLoop`.
  - `view.js`: `createView`.
  - `controls.js`: `keyDir`, `createControls`.
  - `actors.js`: `createActors`.
  - `dialogue.js`: `openDialogue`.
  - `hud.js`: `createHud`.
  - `sheets.js`: `openPrefight`, `openLockPrompt`, `openHearthMenu`, `openPauseMenu`, `openShop`, `openForge`, `showSpoils`. Each currently resolves at once with its cancel answer.
  - `story-fx.js`: `playBrandBanner`, `playCrownwalls`, `showLetter`, `showToBeContinued`, `ATLAS_SRC`.
- **`screens/atlas.js`** and **`screens/journal.js`** — placeholder lists with a Back button.
- **`ui/assets/atlas-image.js`** — a 1×1 WebP as the default export, plus `ATLAS_PLACEHOLDER = true`.
- **`main.js`** — registers `world`, `atlas` and `journal`; `road` stays.

### Tests, tools and notes

- **Tests:**
  - `world.test.mjs`: collision, ledge, exits, gate, lock, block, soft ichor, talk, `commit`, `findPath`, chest.
  - `story.test.mjs`: conditions, talk, dialogue views and effects, quests, the Ladder.
  - `walk.test.mjs`: the prologue walk for all 3 starters.
  - `migrate.test.mjs`: all 18 fixtures, idempotence, crownwall and gate state, the Waking-2 and shattered fixtures, junk input, the M2 spawn snapshot, and the save module against an in-memory `localStorage`.
  - `maps.test.mjs`: sizes, legend, bounds, exits pairing both ways, anchors, the `v1:` anchors, placed-exactly-once, locks, 5 sealed exits.
  - `story-data.test.mjs`: ids, speakers, lines ≤ 140 characters, every condition parses.
  - `test/fixtures/map-mini.mjs` exports `MINI`, a 12×9 map.
- **Tools:**
  - `tools/e2e-world.mjs`: boots with an M2 save and checks the world, Atlas, Journal and road screens.
  - `tools/map-draft.mjs`: an ASCII preview with entities, exits and anchors drawn over the rows.
  - `tools/make-atlas.mjs`: a stub that prints and leaves the placeholder alone.
- **Notes:** `notes/{WP1,WP2,WP3,WP3B,WP3S,WP4,WP5,WP6A,WP6B,WP7,WP8}.md` are created empty.
- **`test/data.test.mjs`** was updated: it now expects 24 relics with codex numbers 1–24, and checks each variant's table against its own tier's die and its own moves.

## TUNING keys added

None of these change M2 behaviour yet.
- `waking.rabbleLevels: 2`
- `ribbon.firstStrikeDelay: 40`
- `world: {sight 5, sightDark 2, sightRelic 5, sightRelicWatchful 9, alertWait 2, alertWaitStill 6, leash 4, fleeGap 3, grace 6, fleeStun 12, spawnDistance 8, hazardPct 0.04, darkRadius 2}`
- `rout: {xp: 0.5}`
- `temper: {max 3, base 30, mult [1, 2, 4]}`

## Spec gaps and how I settled them

### Maps and world data

1. **Keep-hall pedestals.** The second pedestal row at y=12 would cover anchor `from-court` (12,12). Codex 13–21 sit at x=3–11 and codex 22–24 at x=13–15 (each moved ≤ 1 tile).
2. **Large lairs** (`briarmaw-den`, `rotwarden-heart`) carry both `at` (the sprite's foot) and `area` (the solid footprint).
3. **`HEARTHS` x, y is the stand, facing 'n'**, not the fire. I added `cold`.
4. **`ZONES` fields** are named `{level, sets, backdrop}`.
5. **`LORE` is keyed by the 17 location ids in the illustrated-map HTML.** Each entry is `{name, kind, region, at, map}`.
6. **The Keep facade** is a roof (`H`) on row 3 and wall on row 4 at x=9–21, with the hall door at (15,4). `from-road` (15,2) walks round it.
7. **Hearth Road meander.** The road runs at x=11–13 for rows 0–40, so the chain gate [11..13, 32] spans it, and at x=12–14 below that.
8. **Chests.** A chest's `lock` is a `LOCKS` type when the chest itself is locked. Chests behind a separate lock entity have no `lock` field. Crownwalls are `gate` entities with look `crownwall`.
9. **Gate guards** are three NPC ids, `gate-guard-e`, `-se` and `-sw`, sharing art 'gate-guard'. The two refugees and two pilgrims share one NPC id each.

### Engine rules

10. **Trigger `once`** is stored in `flags.seen[triggerId]`.
11. **`flags.scouted` is keyed by encounter id.** `ladder()` accepts either the encounter id or the poster id.
12. **`{set, value:'day'}`** stores `flags.day`, which `{since}` reads.
13. **Turning.** `move` turns and then tries the step in the same call; a turn that bumps costs no tick. WP1 may change this.

### Encounters, foes and dialogue

14. **Tamsin's spawn** is `level:'party'`, `partyDelta: 1`, variant `'$rival'`, relic `'$rival'`, `lend: true`, `wears: 'vale-gauntlets'`, `noWaking: true`. Encounters also carry `talk` (`vesper`, `tamsin-door`), and `tamsin-duel` has `duel: true`.
15. **I left the M2 encounters exactly as they were.** Three things are still needed there:
    - `opens:'bramble-toll-chain'` on bramble-toll (the migration already unlocks the chain for M2 saves).
    - `region:'verdant'` on the M2 entries, or else `earnBrand` must treat a missing region as verdant.
    - The name "Ledger-Maud" on the tally-camp spawn would change an M2 spawn array, so it lives only in `LADDER`.
16. **Dialogue flags.** A new `garret-thanks` node sets `garret-told`, and `dael-brand` pays the 300 gold and sets `paid-briarmaw`. Nothing sets `bell-rung` or `act1-complete` yet; they are expected from rules or UI.

### Tools and existing screens

17. **`make-v1-fixtures.mjs` edit.** Its spawn snapshot now covers only the four M2 PATROLS sets. M3 adds three sets by design, and without this `--check` would fail on them.
18. **The Codex now counts to 24.** `RELIC_TOTAL` is derived from `RELICS`, so the M2 codex screen shows "/ 024".

## Open items for other packages

- **WP2:**
  - Have `battle.js` copy `ctx.firstStrike` and `ctx.warded`.
  - Make `escalateSpawn` read `familyOf(spawn).tier`, and use `rabbleLevels`, `wakeLevels` and `noWaking` there.
  - Make lent relics (`lend`) never claimed and never shattered in `loot.js`.
  - Remove the M2 behaviours from `save.js` once `newGame` returns v2 games.
- **WP4:** see item 15.
- **WP6B:** there is no `RELIC_ART` for relics 13–24 yet. `foes.js` skips drawing a missing relic, and `itemArt` falls back to the generic art for that item kind.