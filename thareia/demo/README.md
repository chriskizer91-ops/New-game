# Thareia walk and sprite test

A phone test for the new game, built before the game itself (design first). One file: `dist/thareia-walk-test.html`.

**What it tests**
- **Walking on a painted region** (the Gloomfen painting), at zoom levels from the whole map to 3×, to see how close the
  walking view can get before the painting looks soft.
- **Flying the skiff** over the same painting: the top-down view of the player's airship, rotated to its heading, with
  a ground shadow that moves off as it climbs, glowing crystals, golden motes and high clouds.
- **A more detailed walking sprite:** the current game's battle rig (64 × 64) used on the map, against its old 16 × 24
  walker.
- **A more detailed battle sprite:** the same rig drawn at 2× and 3×. Gear chosen in the menus shows on every sprite.
- **The player's battle song** ("Herbal Decay", AAC 96 kbps).

**Build**
```
npm install
node tools/prep-assets.mjs   # only when the source paintings change; its outputs are committed in assets/
node tools/build.mjs         # writes dist/thareia-walk-test.html
```
The hero and gear art is the finished Aethermoor game's own code, taken from commit `49195c1` (branch
`claude/cool-ptolemy-uc93gg`) into `.game/` and patched so the hero renderer takes a scale (see `tools/build.mjs`).
