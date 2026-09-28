# Aethermoor: Hearth & Heirloom

This is a browser JRPG built into **one self-contained HTML file** that plays on phone and laptop. The code is in `game/`.
- Current status and next steps: `HANDOFF.md`.
- Technical contract: `game/ARCHITECTURE.md`.
- Milestone 3 contract: `game/docs/M3-SPEC.md` (its Part A overrides Part B); what shipped: `game/docs/M3-STATUS.md`.
- Design intent: `docs/DESIGN-BRIEF.md`.

## Commands (run in `game/`)

- `npm run build` writes `dist/aethermoor.html` and `dist/aethermoor.artifact.html`.
- `npm test`, `npm run lint`.
- E2E tests: set `NODE_PATH=$(npm root -g)`, then run `node tools/e2e-flow.mjs`, `e2e-battle.mjs`, `e2e-world.mjs` or `e2e-codes.mjs` (every real M2 save code). Playwright is global, and Chromium is at `/opt/pw-browsers`.

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
