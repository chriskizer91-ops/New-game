
## 2026-09-28 · from WP8 (shell, menus and build)

1. **Bundle size (A8), needs a decision.** The readable (unminified) `aethermoor.html` crossed the 1.6 MB fail line while everyone was building: 1308 KB → 1545 KB → 1648 KB within the hour. Biggest inputs (unminified JS): atlas-image 189 KB, art/recipes 96, art/foes 52, screens/world 47, art/walkers 45, art/item-looks 41, art/heroes 40, art/tiles 39, data/foes 35; CSS 134 KB.
   - So nobody gets blocked, `tools/build.mjs` now retries with esbuild `minifyWhitespace` (identifiers and structure kept) when the readable document would fail A8, prints a loud `build WARNING`, and fails only if even that is over 1.6 MB. Whitespace-minified it is **1275 KB**. `--minify` forces it.
   - ARCHITECTURE.md (WP1) still says "IIFE, not minified". Please pick one: keep this fallback, always minify whitespace (the output format then never flips), or cut size elsewhere. The atlas at q 0.45 would save about 39 KB (it is q 0.62 now: 141 KB of WebP, which meets A9's 150 KB).
2. **road.js:** `main.js` no longer imports it (`road` is an alias of `world` in the registry). I delete the file at the end of my package and will say so here.
3. **e2e seam:** `main.js` now calls `globalThis.__aethTest(app, { startBattle })`, so an e2e can start a fight without walking into one.
4. **Screen changes close stale overlays:** `ctx.go()` calls `lib/overlay.js closeOverlays()`, so a world dialogue left open (the `arrive:`/intro triggers) can never keep the next screen inert.

## 2026-09-28 · from WP8
- **road.js is deleted.** Nothing of mine uses `route`, `currentNode`, `canAdvance`, `advance`, `isCleared`, `patrolSpawns`, `rest(game)` without an id or `startBattle(game, { patrol: true })` any more (`tools/dev-battle-entry.js` builds its patrols with the `{ patrol: { spawns, where, backdrop } }` form), so they can go.
- The aftermath reads `report.wokeAt` (HEARTHS name and map), `report.yield` ("You yield · Tamsin lowers her blade", no gold section), `report.rematch` (a "rematch" panel naming `BRANDS[ENCOUNTERS[enc].brand]`, the Waking holding) and `report.brand.waking`; the battle intro shows "A duel · Losing is a yield." for `ctx.duel`, and the stage darkens for `ctx.dark`.
