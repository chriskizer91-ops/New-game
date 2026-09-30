# 07 — T1: what was built

T1 is the foundation and the Prologue. The game lives in `../game/` (forked from the finished Aethermoor game, commit
`49195c1`), builds to `game/dist/thareia.html` (about 7.5 MB), and keeps its own save (`thareia.save.m7`).

## What is in it
- **The engine, moved over:** the same turn-based battles, loot worn by foes and heroes, the 16 × 24 walker on painted
  maps, the 64 × 64 battle rig. The old game's content stays in the code for the chapters that reuse it (Chapter 1 walks
  the old Verdant Wilds maps); Thareia's own content lives in `src/data/thareia/` and `src/data/maps/` (`bogmire-docks`,
  `th-bogmire`, `th-thornhollow`). Only the paintings of maps Thareia reaches go into the file (`tools/build.mjs`).
- **The new sounds and music:** `core/audio.js` plays `../sfx/` (182 sounds, 9 pieces, all code).
- **The Prologue:** a new game (name, look, abilities, what you carry, the opening lines over the docks painting) starts
  on the **Bogmire docks** (traced tile by tile from `art-in/scenes/walk-bogmire.webp`). Up the stair in Bogmire town, the
  hero watches Sedrin take Merryn Copperpot's parcel (crossing 1), reads Yara Dustwind's notice, is hired (Yara joins as
  a guest), loads Aldric Fernshaw's crate, which cracks (the cut-scene); boglurchers come up out of the warm water, then
  Skeet Marrow's crate-thieves; the hero keeps the humming shard; an optional leech fight guards a cache on the reed
  island.
- **The airship:** from the skiff, the first flight. At 1× over the region paintings (Gloomfen, Verdant Wilds) you steer
  by tap or keys, cross from one painting to the next, and land at a dock; or open the **world map** (the continent) and
  tap Thornhollow to watch the auto-flight. The ticket keeps you on the one route.
- **Thornhollow:** Yara says goodbye, and the Prologue's card ("Chapter 1: The Rot's Roots") shows.
- **Painted battle backdrops:** a painting given to `tools/backdrop-import.mjs --key=<backdrop> --src=<png>` fills the
  battle screen for every fight on that backdrop. The Gloomfen one (key `bogmire`) is waiting on the player's painting.

## Checks
`npm test` (628 tests: the old game's, which check only the old world via `test/old-world.mjs`, and
`test/thareia.test.mjs`), `npm run lint`, and `node tools/e2e-t1.mjs` (the whole Prologue in Chromium at phone size, with
screenshots in `tools/shots/t1/`).

## Waiting on art
- The Gloomfen battle backdrop (the Prologue's fights use the drawn one until then).
- The crate cracking open (the cut-scene shows the drawn backdrop until then): `node tools/paint-import.mjs
  --cut=crate-cracks --src=<png>`.
