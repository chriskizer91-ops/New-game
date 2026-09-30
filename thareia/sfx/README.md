# Thareia sound effects

`sounds.js` is the game's sound library: 100 sound effects made entirely in code (Web Audio), no sound files, about 30 KB.
`tools/level.mjs` renders every sound offline in Chromium and writes its playback level, so all sounds peak at a
consistent volume (louder for big moments). `tools/build.mjs` makes `dist/sound-board.html`, a page to play each sound
and answer yes or no; answers are saved with the published page for review.
