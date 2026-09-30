# Thareia demo 2: the town square and a real battle

The finished Aethermoor game (commit `49195c1`, branch `claude/cool-ptolemy-uc93gg`) with:
- **the 16 × 24 party walking the player's town-square painting** (`../art-in/scenes/town-square.png`), traced into a
  45 × 34 tile map (`src/town-square.js`) and imported with the game's own `tools/paint-import.mjs`;
- **Rhune the Pass-Warden** standing in the square, wearing the Windstep Boots: walk into him to fight;
- **the real battle screen** in front of the player's forest-ruins painting, stored small (480 px, WebP 70) and drawn
  into the battle's own pixel canvas so it pixelates like the sprites;
- **the player's song** ("Herbal Decay", AAC 96 kbps) for battles and boss fights; the old synth music elsewhere;
- its own save slot, and a start straight into the square with a level 12 party.

Build: `node tools/build.mjs` writes `dist/thareia-demo-2.html` (a full page) and `dist/thareia-demo-2.page.html` (for a
claude.ai page). All the changes to the game are made by that script, with a check that each patch lands.
