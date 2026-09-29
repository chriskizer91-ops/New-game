# Painted art for Aethermoor: how it works

The walkable maps, the towns, the cut scenes and the dialogue portraits can use paintings from an
image generator. The game keeps its own invisible map on top of each painting: where you can walk,
the doors, the chests, the people and the foes. The heroes, the townsfolk and the foes stay the
game's own pixel sprites, because the heroes wear the gear you equip and the sprites walk the same
way in all four directions. The battles stay exactly as they are.

## The loop

1. Pick a batch: `pilot.md` (four images, done), then `batch-2.md` (every map of the Verdant Wilds and
   the Sunscorch that was not painted yet; done in Milestone 6, with the Ironspire's maps too), then
   `batch-3.md` (the Gloomfen's maps and the Gloomfen Gallery, in the style of your whole-map paintings:
   each prompt takes its layout reference and one of your paintings as the style).
2. For each image, open your image generator, attach the reference picture it names (maps only),
   paste the prompt, and generate. Make two to four tries and keep the best, or keep them all.
3. Name each file exactly as the batch says (`map-keep.png`, and `map-keep-2.png` for a second try).
4. Send them back (below). The game fits each painting to its map, turns it into the game's pixel
   grid and palette, and packs it into the one HTML file.

**A map must keep its layout.** Walls, roofs, trees, water and roads have to stay where the
reference picture has them, or you would walk through a painted wall. Use a generator that can
redraw a picture you attach. If a try moves things around, answer it with: *"Keep the layout of the
image I attached exactly: every wall, roof, tree, road and shore in the same place. Only change how
it looks."* Small slips are fine; the game's map gets fitted to the painting afterwards.

## The style (every prompt already includes it)

- 16-bit, SNES-era JRPG pixel art: crisp hard-edged pixels, no blur, a rich but limited palette.
- Maps: a top-down three-quarter view. You see the ground from above and the south face of walls and
  buildings. Never isometric, never a tilted perspective.
- Soft warm afternoon light from the upper left; short shadows fall to the lower right.
- Warm epic with an edge: welcoming places that have seen hard years.
- Never in a painting: people, animals or monsters on a map (the game draws them), any text or
  lettering, UI, borders, frames, grid lines, watermarks, a vignette.

## Sending them back

The easiest way: attach them in the chat, as you did with the pilot, and say which is which if the
file names got lost (the chat renames uploads). Send them in as many rounds as you like; every map
whose pictures have arrived goes into the game.

Or upload the PNGs (or one zip of them) to GitHub:

1. Open https://github.com/chriskizer91-ops/New-game and switch the branch to
   `claude/cool-ptolemy-uc93gg`.
2. Open the batch's folder: `art-in/pilot/`, `art-in/batch-2/`.
3. **Add file → Upload files**, drag the images in, then **Commit changes**.
4. Tell me in the chat, and I'll take it from there.

If the generator gives JPG or WebP instead of PNG, send those; don't resize or crop anything.
