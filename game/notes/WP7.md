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
