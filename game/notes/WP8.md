## 2026-09-28 from the lead (WP2): flow and save are final (spec §4.6, §4.8)
- `newGame()` now returns **version 2** games: `progress.pos = START_AT` (keep-hall 12,6 n), `lastHearthfire 'hearthstone-keep'`, `kindled {hearthstone-keep}`, `story.starter`, every v2 flag object present, and **no `progress.node`**. The M2 road helpers (`route`, `currentNode`, `canAdvance`, `advance`, `isCleared`, `rest(game)` without an id, `startBattle(game, {patrol:true})`) are deprecated and will be deleted once `road.js` is gone. Tell me in notes/WP2.md when you delete road.js.
- `core/save.js` has no transitional M2 behaviour any more:
  - `loadGame(migrate) -> { game, from: 'v2'|'v1' } | null` (no argument = identity migrate, still the `{game, from}` shape).
  - `saveGame(game)` writes `aethermoor.save.v2` only (and the marker when `game.migratedFrom === 1`). v1 is never written.
  - `clearGame()` removes v2 only. `hasSave()` = a v2 save exists. New: `isMigrated()`; also `hasV1()`, `readV1()`, `markMigrated()`, `backupGame()`, `hasBackup()`, `restoreBackup(migrate)`, `exportV1Code()`.
  - `exportCode(game)` always gives `AETH2.`; `importCode(code, migrate)` takes AETH1./AETH2., scrubs, then migrates.
- `resolveBattle` report adds `yield` (Tamsin duel lost: no gold lost, no Grudge, no waking elsewhere; `story['tamsin-yielded']` set), `rematch` (a Brand already held: `report.brand` is null), `wokeAt` (the Hearthfire id after a wipe; `progress.pos` is its stand), and `brand = { ...BRANDS[id], waking, first: true, count }` for a new Brand. No teleport after a Brand.
- `battle.ctx` now carries `firstStrike`, `warded`, `dark` (fight in a dark map: draw the backdrop dark; mw-lantern and rotwarden-heart) and `duel` (show "Losing is a yield."). Battle title: `ctx.where` is always set (patrols pass it too).
- `rules/party.js`: `temperCost(item)`, `temper(game, uid) -> {game, ok, cost, reason}`, `buy(game, consumableId, n) -> {game, ok, reason}`. Enchant is `+temper` at 1:1 in `rules/stats.js` (match it in `ui/lib/items.js`).

## 2026-09-28 · from WP7 (world screen)

1. **Aftermath → world:** I read `go('world', { result, brand, wokeAt })` exactly as in §5.5.
   - `result` is 'victory' | 'defeat' | 'fled'.
   - Until `result` arrives, a roamer battle with no `result` is treated as fled (the roamer is stunned). A changed `progress.pos` is treated as a wipe.
2. **Adoption:** I use `ctx.adopting`, `ctx.setGame` and `ctx.commitAdopted()` exactly as your app.js header describes. I call `ctx.commitAdopted?.()` right after the `setGame` on the first successful step.
3. **Audio names I call:**
   - Music (from `MAPS[id].music`): `hearth`, `road`, `town`, `wilds`, `dungeon`; also `battle` / `boss` at the hand-off.
   - Sfx: `bump`, `alert`, `rout`, `door`, `blip`, `unlock`, `chime`, plus the M2 `confirm`, `back`, `select`, `page`, `coin`, `chest`, `hearth`, `stamp`, `error`.
   - Please let `sfx('blip', { voice })` take `voice` 0–7 for the per-speaker pitch. I hash the speaker id to 0–7.
4. **Pause menu:** it calls `ctx.go(name, { from: 'world' })` for party, codex, journal (`{ tab }`), atlas (`{ mode: 'view' }`, or `{ mode: 'travel' }` from a Hearthfire) and settings. Please send each of these back with `go('world')`, and send the Journal's board links back the same way. Before leaving, I commit the Walk, so `progress.pos` is current when these screens read it.
5. **Temper on relic cards (D10):** `ui/lib/items.js mainStat()` ignores `item.temper` for relics (`hit = relic.stats.hit`). A tempered starter relic's card number never changes, which fails §7 scenario 9. Please add `item.temper` there for relics as well, to match `stats.js` (`enchant = (relic ? 0 : rarity.enchant) + temper`). My forge sheet shows its own before and after numbers from `rules/stats.js itemProfile`, so it is right either way.
6. **E2e allowlist:** tools/e2e-world.mjs fails on any `[audio]` warning, like your e2e scripts do.
## 2026-09-28 from the lead (WP3S): Journal and Atlas data
- `story.bounties(game)` states come from the new `cond.bountyState(game, id)` ('active'|'ready'|'done'); conditions can now test `{ bounty: id | 'any', state }`.
- `story.ladder(game)` entries now also carry `enc` and `spawn` (render the poster with `renderFoe` of `spawnsFor(game, enc)[spawn]`, silhouetted until scouted).
- Longwatch marks: `LOOKOUTS` in data/dialogue.js maps each lookout to `{ flag, maps }`. When `story[flag]` is set, the Atlas marks the chests, locks and holders on those maps.
