# Aethermoor: Hearth & Heirloom

This is a browser JRPG built into **one self-contained HTML file** that plays on phone and laptop. The code is in `game/`.
- Current status and next steps: `HANDOFF.md`.
- Technical contract: `game/ARCHITECTURE.md`.
- Milestone 3 contract: `game/docs/M3-SPEC.md` (its Part A overrides Part B); what shipped: `game/docs/M3-STATUS.md`.
- Milestone 4 contract: `game/docs/M4-SPEC.md` (its Part A overrides Part B); what shipped: `game/docs/M4-STATUS.md`.
- Milestone 4.5 ("the Road") contract: `game/docs/M45-SPEC.md` (its Part A overrides Part B); what shipped: `game/docs/M45-STATUS.md`.
- Milestone 5 ("the Ironspire Peaks") contract: `game/docs/M5-SPEC.md` (its Part A overrides Part B); what shipped: `game/docs/M5-STATUS.md`.
- Design intent: `docs/DESIGN-BRIEF.md`.

## Commands (run in `game/`)

- `npm run build` writes `dist/aethermoor.html` and `dist/aethermoor.artifact.html`.
- `npm test`, `npm run lint`.
- E2E tests: set `NODE_PATH=$(npm root -g)`, then run `node tools/e2e-flow.mjs`, `e2e-battle.mjs`, `e2e-world.mjs` or `e2e-codes.mjs` (every real M2 save code, and M3, M4 and Milestone 4.5 codes). Playwright is global, and Chromium is at `/opt/pw-browsers`.
- Every map on the route is built road-first (`game/docs/M45-SPEC.md`): its fights hold gates across the road, and `test/road.test.mjs` checks each map's `roads`.
- The player's paintings become map ground with `node tools/paint-import.mjs` (`game/docs/M5-SPEC.md` A10, A11; `game/ARCHITECTURE.md` "Painted maps"). The build counts them apart from the game and fails above 8 MB of paintings.

## Rules

- **Layers:** `ui → art/rules → data/core`. Nothing may import upward.
  - `rules/` and `data/` stay pure: no DOM, `Math.random` or `Date`. Randomness comes from `core/rng.js`, seeded.
  - Inside `rules/`, imports run `world → story → cond → gauntlet`; `gauntlet` never imports those three.
- **Output:**
  - The only external request allowed is Google Fonts; everything else is embedded or generated.
  - Tap targets are at least 44 px, the layout is designed at 360 px wide first, and there is no horizontal scroll.
- **Safe strings:** `ui/lib/dom.js` `el()` sets innerHTML for string content. Pass every user-provided or saved string through `esc()` or `textContent`.
- **Saves:**
  - Existing saves must keep working.
  - Never write or delete the `aethermoor.save.v1` key.
  - Every milestone keeps its own save and file (the player's rule): Milestone 5 writes only `aethermoor.save.m5`, never the earlier keys (M4.5's `aethermoor.save.m4.5`, M4's `aethermoor.save.m4`, M3's `aethermoor.save.v2`); `dist/aethermoor-m2.html`, `-m3.html`, `-m4.html` and `-m4.5.html` are frozen (a test pins their bytes).
  - Migrations are pure functions in `rules/migrate.js`, injected into `core/save.js`.
  - Pasted codes are scrubbed.
- **Frozen:**
  - The approved battle look (`art/heroes.js`, `art/hero-looks.js`) and the card reveal.
  - The M2 encounter and spawn arrays, which are checked against `test/fixtures/m2-spawns.json`.
- **Tests:** never weaken, skip or delete a test to get green.
- **Publishing:**
  - Never republish the player's M2 page (https://claude.ai/artifact/9i9bPrdG6ZY22xWnXgGUQa); their saves live there.
  - Deliver new builds as a downloadable HTML file, or as a new, separate page.
- **Git:**
  - Work on branch `claude/cool-ptolemy-uc93gg` (it carries the history of `claude/dnd-game-prototype-bsv3xb`), unless the session names another; commit and push when a step is done.
  - Subagents never run git.
  - No AI model names or identifiers in code, comments, docs or commit messages.
