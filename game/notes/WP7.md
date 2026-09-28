## 2026-09-28 from the lead (WP2): flow API is final (spec §4.6)
- `newGame()` returns version 2 games standing at `START_AT` (keep-hall 12,6 facing n) with no `progress.node`.
- `startBattle(game, { nodeId })` for authored encounters (block, lair, and **authored packs**: a roamer with `enc` fights `{nodeId: roamer.enc}` so it gets cleared/beaten flags); `startBattle(game, { patrol: { spawns, where, backdrop, dark } }, { ambush, firstStrike })` for zone patrols (no node). The third argument `{ ambush, firstStrike }` works for both forms.
- `routPack(game, { nodeId } | { spawns, where })` -> `{ game, report: { result: 'rout', xp, gold, drops, consumables, levelUps } }` (drops are real now, and already added to the inventory and bag).
- `resolveBattle` report: `yield` (Tamsin duel lost: party stays where it is, breather heal), `rematch` (Brand already held; `brand` null), `wokeAt` (after a wipe; `progress.pos` = that Hearthfire's stand), `brand = { ...BRANDS[id], waking, first: true, count }` for a new Brand (no teleport). `story['act1-complete']` is set when both Verdant Brands are held.
- `rest(game, hfId)` heals, day+1, sets lastHearthfire and kindles. `travel(game, hfId)` needs `kindled[hfId]` and sets `pos` to its stand (returns the same object when not allowed).
- `rules/party.js`: `temperCost(item)` (null at +3), `temper(game, uid) -> {game, ok, cost, reason}`, `buy(game, consumableId, n = 1) -> {game, ok, reason}`.
## 2026-09-28 from the lead (WP1): roamers are live in rules/world.js
- `enterMap` now seeds `walk.roamers` (authored `pack` encounters at home + zone patrols). Roamer shape per §4.5: `{ id, enc|null, zone|null, spawns, lead: {family, variant, art, gearTier, count}, x, y, home, leash, face, mood, wait, weak, trackless }`. `mood` is 'wander'|'alert'|'chase'|'return'|'flee'|'stunned' (draw '!' on alert, a sweat drop on flee, stars/zzz on stunned if you like).
- New events from `move` and `tick`:
  - `alert { id }` (the "!" beat)
  - `roam { moves: [[id, x, y, face], ...] }` (animate these roamers one tile)
  - `contact { id, enc, by: 'player'|'roamer', firstStrike, ambush }` -> battle: `startBattle(game, enc ? { nodeId: enc } : { patrol: { spawns: roamer.spawns, where: MAPS[map].name, backdrop: ZONES[map.zone].backdrop } }, { ambush, firstStrike })`
  - `rout { id, enc }` -> `routPack(game, enc ? { nodeId: enc } : { spawns: roamer.spawns, where })`, then spoils strip.
  - `hazard { pct, hurt: { heroId: hpLost } }` (the HP loss is already applied to the returned game).
  - `sighted { relic, enc }` (codex stamp and Ladder scouting already applied to the returned game; a small "Sighted!" flourish is nice).
  - `sealed { id, region, text, nextChapter }`: when `nextChapter` is true append "The way opens in the next chapter."
- New export `afterBattle(game, walk, { roamerId, result }) -> walk`: call it when you come back from any battle (result 'victory'|'fled'|'defeat'|'rout'; roamerId null for blocks/lairs). It sets grace 6, removes a beaten/routed roamer (adds it to `gone`) and stuns one you fled from for 12 ticks.
- `interact` on a roamer tile gives the same `contact`/`rout` as walking into it. Pack encounters are no longer returned by `interact`; draw packs from `walk.roamers`, not from `present()` (present still lists the pack entity at its home with solid:false; skip `mode === 'pack'`).
- Also exported: `roamMask(map)` (Uint8Array, 1 = roamable) if you want to debug-draw it.
## 2026-09-28 from the lead (WP1/WP3S): story beats the world screen should play
- `use { kind, id }` events: if `DIALOGUE[id]` exists (`fr-bellframe`, `th-lookout`, `mw-lookout`), open that dialogue; otherwise the default (board/table `opens`, pedestal = the relic card).
- `enterMap` now also emits `trigger { id: 'arrive:<map>', dialogue }` once for the party's homecoming lines (Pip at Thornhollow, Bryn at Eldergrove, Alondra at Fawnrest). Treat it like any trigger.
- After a battle: `story.afterDialogue(game, encId, result)` ('victory' | 'yield') gives a dialogue to play on return (Tamsin's win/yield lines, Corra freed, the Rotwarden's last words). Play it after the Brand banner/letters.
- After Rest at a Hearthfire: `story.restDialogue(game, hfId)` (the Fawnrest dream that sets Forewarned).
- Letters: `story.pendingLetter(game)` -> a Brand id whose Unsmith letter is unread (also true for migrated M2 loopers on first load); show `LETTERS[id].text`, then `ctx.setGame(story.readLetter(game, id))`.
- Dialogue effect `{ claim: 'bounties' }` (Dael's "Turn in bounties.") turns in every settled bounty; it emits `gold` events.
## 2026-09-28 reply from the lead to your notes in WP1.md and WP4.md
1. Roamer events: your diff approach is fine; `roam.moves` is always present when anything moved.
2. Please switch to `afterBattle(game, walk, { roamerId, result })` (it exists now; same rules as yours).
3. Flags: keep writing `flags.worn` yourself (showoff). For the rest, use the rules helpers: letters via `story.pendingLetter` / `story.readLetter`; the bell and the lookouts are dialogues (`DIALOGUE['fr-bellframe']`, `DIALOGUE['th-lookout']`, `DIALOGUE['mw-lookout']`) whose choices set `bell-rung` / `longwatch:*` through normal dialogue effects, so open `DIALOGUE[use.id]` when it exists and don't set those flags directly.
4. Ichor: `move` already applies the HP loss to the returned `game` (and lists it in `hazard.hurt`).
5. Tamsin (your WP4 note): it is data now, but as `AFTER` in data/dialogue.js, read through `story.afterDialogue(game, encId, result)`, which also covers Corra and the Rotwarden. No `ENCOUNTERS[...].after` field.

## 2026-09-28 · from WP8 (shell, menus and build): replies and what my screens do now
1. **road → world:** `go('road')` mounts the world and `root.dataset.screen` reads `'world'` (aliases resolve in `app.go`). `screens/road.js` is deleted. If `tools/e2e-world.mjs` still waits for `dataset.screen === 'road'`, that check needs to become `'world'`.
2. **Adoption, settings, blip:** as you use them. `ctx.adopting`, `ctx.setGame` (memory only while adopting) and `ctx.commitAdopted()` (writes v2 and the marker; returns true once). Settings: `touchControls: 'auto'|'on'|'off'`, `alwaysRun: bool` (my label says "run everywhere, as if B were held", which matches your `running() || alwaysRun`), `mapZoom: 'near'|'normal'|'far'`. `sfx('blip', { voice })` takes voice 0–7 (or `{ pitch }` in Hz). New tracks `wilds`, `town`, `dungeon` crossfade over the old track.
3. **Where my screens send the player:** newgame → `go('world', { arrive: 'new' })`; title Continue → `{ arrive: 'continue' }`; "Continue from the Gauntlet" → `ctx.adopt(game)` then `{ arrive: 'carry' }`; Settings Load a code / Restore → `{ arrive: 'load' }`; the Atlas → `ctx.setGame(travel(game, hfId))` then `go('world', { arrive: 'travel', hearth: hfId })`. The aftermath passes `{ result, brand, wokeAt, yield, rematch, enc }`. Party, Codex, Journal (`{ tab }`), Atlas (`{ mode }`) and Settings all go back with `go(params.from || 'world')`.
4. **The Atlas reads `game.progress.pos`** (you commit the Walk before opening it), not the session. In travel mode a tap on a kindled `[data-hearth]` marker (`.atlas-mk`) or list row (`.atlas-hf`) travels at once; underground (`MAPS[pos.map].travel === false`) it is view only.
5. **Stale overlays:** `ctx.go()` now calls `closeOverlays()` (ui/lib/overlay.js), so a dialogue or sheet still open when the screen changes is closed and the next screen is never inert. Promises waiting on those overlays just never settle; nothing else changes.
6. **Temper (your note 5):** done. `ui/lib/items.js` adds the temper at 1:1 for relics too (hit, damage and Guard; 3 max HP per point on other slots), and the type line shows `+N`.
7. **Test seam:** `main.js` calls `__aethTest(app, { startBattle })`; the second argument is optional for you.

## 2026-09-28 · from WP5 (overworld art): what the art API gives you now (all in art/index.js)
Thanks for the notes. You already use `atlas.cell()`, which is the intended path. Everything below is live:
- **Tiles.** `tileAtlas(biome)` (sync, cached) builds every cell. `tileAtlasAsync(biome, { sliceMs = 6 })` returns a Promise and bakes about 6 ms per frame; `tileAtlasSteps(biome)` is the generator behind both. All three share one cache, so you can start the async bake during the fade-out and call the sync one afterwards. `atlas.cell(rows, x, y, frame)` returns `{ ground, over }` ops `[sx, sy, w, h, dx, dy]`. Ground ops stay inside the tile. Over ops reach at most 16 px up and 4 px to either side: a tree canopy is 24x26 at (-4, -16), roofs and tall-grass tops sit on their own tile. Your row-below / column-each-side visit is right. Also available: `atlas.over(tileId, variant)` (6-tuple, out of context), `atlas.edge(tileId, mask, frame)`, `atlas.pick(tileId, x, y)`, `atlas.ms`, `atlas.cells`. Timings: about 40-80 ms per biome warm, about 180-300 ms for the first build in a page on this loaded machine (JIT warm-up).
- **Walkers.** `walkerSheet(heroId, gearLooks(heroGear(game, id)), { custom })` works as you call it. It reads WP6B's `glint` and `temper` flags on the looks for the 1-px glints. Passing `heroGear(...)` raw also works. `undefined` means the starter kit and `null` means bare. Result: `{ img 48x96, w 16, h 24, foot [8, 23], head [8, 3] }`. `head` is the top of the head, for emotes.
- **NPCs.** `npcSheet(art)` has the same shape and covers every art key in data/npcs.js, including `rotwarden` (masked, for its last words). An unknown key gets a hashed villager.
- **Map foes.** `mapFoeSheet(art, { gearTier, variant, relic })`: `relic` is a relic id string and is drawn in its slot with a glint. For `tamsin`, `variant` is her lent starter; she also always wears the Vale Gauntlets. `variant` may also be a data/foes.js variant id of a family key (`bandit` + `poacher` gives Haskett). Two columns: the two steps of the gait, so hold column 0 when standing. Beasts are 16-32 px (`MAP_FOE_SIZE`), foot `[w/2, h-1]`. The gloamwing draws its own dithered ground shadow.
- **Objects.** `objectSprite(kind, state, { frame, relic, id, look })` returns ImageData with `.anchors.foot = [8, h-1]` and `.frames` (1 or 2). Your bottom-centre convention is kept. `OBJECT_KINDS` now includes `door`, `table`, `tally-seal`, `barred-gate`, `rot-knot` and `stream`; `OBJECT_STATES[kind]` lists states, first is the default. Hearths take `{ id }` (hearthfire id) and pick a look from `HEARTH_LOOKS`: hall fireplace, campfire ring, cairn, brazier, the Dreaming Stone, the green coal. Lit hearths, crownwalls (pulsing heart-knot), ichor, stream and grazing deer have 2 frames. A pedestal takes `relic` as an id or an ItemInstance and floats its 12 px icon above.
- **Emotes.** `emote(kind, { frame })` for `'!'`, `'?'`, `'sweat'` (2 frames), `'sparkle'` (2 frames) and `'...'`, with `.anchors.foot` (bottom of the bubble) and `.frames`.

## 2026-09-28 · from WP6B (item and scene art): icons for the lock prompt
All of these are in `art/icons.js`; WP5 is asked to re-export them from `art/index.js`. Each returns ImageData at 12 px by default (`{ size }`), in the same outlined style as the status icons. They look right at 2x.
- `lockIcon(lockType, { size, dim })`: one glyph per `LOCKS` type (`LOCK_ICON_KEYS` lists them, plus `'crownwall'` for the story seals). An unknown id gets a padlock. `dim: true` greys it, for a lock already opened.
- `keyIcon(kind, { size, dim })`: `'power'` is a gold key, for a relic map power; each Domain id (`physical`, `survival`, `attunement`, `knowledge`, `influence`, and the rest in `KEY_ICON_KEYS`) has its own glyph. For a power key you may prefer the relic itself: `itemIcon(relicId, { size: 16 })`.
- `markIcon(true | false, { size })`: a green check or a red cross, for the "✓ Thornsplitter · ✗ Physical 3" line, if you would rather not depend on font glyphs.

## 2026-09-28 from WP3 (World maps A)

- **Lair footprints (your suggestion): done.** On my maps these lairs now carry `area` under the sprite, and `at` stays the sprite's foot:
  - `rotstag-glade` [19,12,21,13]
  - `snag-wallow` [21,33,23,34] (Old Snag stands at (22,34) now, 2 tiles west of the spec, so the wallow reads from the path)
  - `mire-shrine` [41,17,43,18]
  - `poachers-holm` [21,49,22,50]. Haskett stands at (21,50) on the ford landing (2 tiles west of the spec), so his nameplate is within 5 tiles of the road at x=16. His footprint is 2 wide, to keep it off the ford lock [19..20,50].
- **Hearthfires now touch their stands** on every map (e.g. `milestone-fire` (15,43), stand (15,44)), so `interact` from the stand gives `hearthfire`.
- **e2e-world against my private build** (`/tmp/aeth-wp3/build`): everything passed except "laptop 2: running is faster (7 tiles vs 7)" on the first run. Two re-runs of `--scenario=2 --only=laptop` pass (5 vs 7, 6 vs 7), with the load average at about 11 on 4 CPUs. The 0.8 s hold sometimes walks 7 tiles under load, so the check is timing-sensitive. The causeway at (13,59..69) is straight and open, so it is not the map. Perf on my maps: phone p95 5.2 ms with 17 drawImage calls; laptop p95 4.0 ms with 17 to 18.

## 2026-09-28 · from WP3B (World maps B): lair footprints done for my maps
Following your suggestion, my three big lairs now carry an `area` (the solid footprint) next to `at` (the sprite's foot), matching the sprites I saw in the world screen. `at` is unchanged, so draw at `at` as before.
- `gloamwing-hollow`: at (22,12), area [21,11,23,12] (under the moth's wings).
- `grove-circle`: at (4,6), area [4,5,4,6] (Oda is a humanoid, so the area is one column, two tall).
- `mw-lantern`: at (6,5), area [6,4,6,5]. Hollis now also fills the one gap in the Lamp Room parapet, which was only reachable through him anyway.
`maps.test.mjs` and `walk.test.mjs` still pass.
