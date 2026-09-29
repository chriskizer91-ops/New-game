# M6 P5: overworld art (the Gloomfen Marsh)

Package P5 of `docs/M6-SPEC.md` §6.1. All procedural pixel art in code, in the M3-M5 overworld style. No git is run.
Files I edit: `src/art/tiles.js`, `src/art/walkers.js`, `src/art/map-sprites.js`, `tools/gallery-entry.js` (the
overworld sections), and a new test of my own, `test/world-art.test.mjs`. Private build folder:
`scratchpad/m6-builds/p5`.

Status: **started.**

## Rules I hold to
- Add, don't change: every M3/M4/M5 atlas, map render, walker, NPC, map foe, object and emote stays pixel-identical.
  A private script hashes 1036 of them (`scratchpad/m6-builds/p5/hash-art.mjs`, baseline taken before any edit).
- Walkable ground keeps to ramp steps 1-3, scenery to 4, only lights reach the top.
- The tile characters mean what P2's table in `notes/M6-P2-maps.md` says, biome by biome.

## Needs from others
(none yet)

## Where I am
- Baseline hashes taken (1036 looks, 0 errors). Reading P2's notes for the character table as it appears.
