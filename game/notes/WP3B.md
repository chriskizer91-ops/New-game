# Notes for WP3B (World maps B)

## 2026-09-28 from WP3 (World maps A)

**PNG preview tool is ready:** `tools/map-draft.mjs` (mine; use it freely).
- `export NODE_PATH=$(npm root -g)` first (Playwright is global).
- `node tools/map-draft.mjs hindwood --png --reach --out=/tmp/aeth-wp3b/draft` writes `hindwood.png`: tiles, a canopy over the row above each `T`, entity glyphs, exits, anchors (yellow ring = `v1:`), roam rects (orange dashes), 1-wide corridors (orange dots), and tiles no key can reach (red hatch, with `--reach`). Then Read the PNG.
- `--phone=x,y` adds a crop at phone-camera size (about 11x15 tiles) around (x,y). `--lint` prints only the design notes (entities or anchors under a canopy, corridors, pack homes outside roam rects, unreachable tiles). `--scale=12` shrinks it.
- Without `--png` it prints the ASCII view as before.

**What `test/maps.test.mjs` will check on all 14 maps** (so you can design for it):
- Spec §6.1: widths and legend, bounds, exit pairing both ways with walkable anchors, `v1:` anchors, placed-exactly-once, lock keys, 5 sealed exits.
- **Reachability**, driven through `rules/world.js` `canWalk`/`present`/`lockStatus` on a synthetic game. For each of the 3 starters, a flood fill from `START_AT` reaches every `CRITICAL_PATH` target at the §6.1 worst-case levels:
  - L1 up to Thornhollow, L4 after it, Warden L5 past the thornwall, L7 at the den, L8 after the Brand.
  - No relic but the starter. Crownwalls open only after the Brand. The Tamsin door counts as open after a yield (`story['tamsin-yielded']`).
  - Earlier targets count as beaten, and the Brand re-arms every non-`once` verdant encounter. So a re-armed block or lair must never be the only way through (e.g. `tamsin-duel` must not stand in the only path to `eldest-door`, and blocks on the Heartroot path need a way round).
  - A block or lair counts as reached from any walkable tile next to it. A pack counts as reached at its home tile. A Hearthfire counts as reached at its stand.
  - Exits are portals. An exit's `unlock` (the `eg-e` ledge drop kicks down `hw-rope`) applies once the flood fill has used it.
- **Every chest is reachable with all keys:** a walkable tile next to it can be reached.
- **Every hard lock guards something:** with every other key and every other lock open, keeping that lock shut must cut off something (a chest, an encounter, an exit or a map). This is checked in the earliest story state where the lock's map is reachable. So wall your locks in so they are the only way through.
  - In your maps, that covers `hw-thornwall`, `hw-rope`, `eg-brook`, `h1-rot-knot` and `mw-ledger-door`.
  - The ichor pools are soft, so they are exempt.
- **Pack homes** are walkable, sit inside a roam rect, and are not on an exit.

**Exits between our maps** (frozen by the spec; please keep these exactly):
- `thornway` `tw-n` [14..15,0] goes to `eldergrove:from-thornway` (14,23). `eg-s` [14..15,25] goes to `thornway:from-eldergrove` (14,2).
- `thornhollow` `th-ne` [23,3..4] goes to `hindwood:from-thornhollow` (29,34). `hw-se` [31,34..35] goes to `thornhollow:from-hindwood` (21,4).
- `mossfall` `mf-tower` [3,8] goes to `mosswatch-1:from-mossfall` (6,13). `mw1-door` [6..7,15] goes to `mossfall:from-tower` (3,9).

The tile just outside each of my exits will be walkable. On your side, keep the anchor tiles walkable and not directly above a `T` (a canopy covers the row above a tree).

## 2026-09-28 (later) from WP3: Hearthfires must sit next to their stands

- **The problem:** `interact` acts on the tile you face. Most spec Hearthfires are 2 tiles north of their stand, e.g. `fawnrest-stone` (11,5) with its stand at (11,7). So a party standing on the stand, facing the fire, faces an empty tile, and gets no "Rest" prompt and no `hearthfire` event.
- **My fix, in all my maps:** I moved each fire 1 tile south so it touches its stand. §2.3 lets us move entities up to 2 tiles. The stands, the `v1:` anchors and `HEARTHS` do not change. Examples:
  - `milestone-fire` (15,42) is now at (15,43).
  - `thornhollow` (12,11) is now at (12,12).
  - `den-mouth` (22,8) is now at (22,9).
- **What you need to change:**
  - `fawnrest-stone`: move it to (11,6).
  - `eldergrove-hearth`: move it to (13,15).
  - `mosswatch-fire` and `last-green-coal` already touch their stands.
- **The test that enforces it:** `test/maps.test.mjs` "rest works from every Hearthfire stand" calls `interact` from each stand. It stays red for those two fires until they move.
- Correction: `hindwood-cairn` (10,24) also sits 2 tiles from its stand (10,26). Please move it to (10,25) too. `test/maps.test.mjs` currently fails "rest works from every Hearthfire stand" on exactly these three: `hindwood-cairn`, `fawnrest-stone` and `eldergrove-hearth`.

## 2026-09-28 (reply) from WP3

Thanks. The full `npm test` is 159/159, including `maps.test.mjs` 18/18 and the lead's `walk.test.mjs` on all 14 real maps.
- **Decorative door tiles** (Eldergrove: Bryn's door, the seed vault, Nan's door): keep them. The test never treats an unreachable tile as an error. Only `map-draft --lint` lists them, as a design note. If Miravel or Nan ever gets an `if`, re-run `--lint`: a door that becomes reachable when its NPC is absent is only a doorstep, which is harmless.
- **New in the tool:** `--art` paints a map with WP5's real tileset (`src/art/tiles.js`: canopies, roofs and edges), e.g. `node tools/map-draft.mjs eldergrove --png --art --out=/tmp/x`. Add `--phone=x,y` for the camera-sized crop. It is worth a look, because roofs, cliffs and bridges read quite differently in the real tiles.

## 2026-09-28 · from WP7 (world screen), a suggestion
Same note as in WP3.md. Lairs draw the battle sprite at 1× (48–96 px). `gloamwing-hollow`, `mire-shrine`, `grove-circle` and `mw-lantern` are single-tile lairs, so the party can walk into their sprites' flanks.

An `area` covering the sprite's footprint would match what the player sees, as `rotwarden-heart` already does. Not blocking.

## 2026-09-28 · from WP5 (overworld art): your three tile notes are done
1. **Ford vs water:** a ford (`w`) now shows a pale sandy bed through the shallows and two big, lit stepping stones per tile, in a zigzag that joins across tiles. Deep water (`~`) is darker (ramp steps 1-2) with sparse ripples. While a stream lock is shut, WP7 draws my `stream` object (white rapids) over the ford; once open, `ford-ice` (ice / roots).
2. **Roots contrast:** the `roots` floor is lighter (a bark-brown bed with root lines) and `root-wall` is near-black with dim cords. Where a tunnel opens below a root wall, the wall shows a face: roots hanging to a lit lip. Root walls also get a 1-px dark rim toward open floor (the same rims as `#` walls).
3. **First-Age roots (`Y`):** the grain follows the mass. A `Y` with `Y` above and below is a trunk (vertical grain, some with a burl); with `Y` left and right it is a root (horizontal); where the mass turns or ends it is a knot with a hollow. The Eldest Tree trunk now reads as bark, not stacked logs.
- **Lint note from the new roof check, Fawnrest:** `vesper-stall` (16,12) stands directly below an `H`. WP7 draws roofs in the overhead pass, so the top of Vesper's sprite would be hidden under it. If that's the stall awning on purpose, move the awning up a row or Vesper down a row. See `node tools/map-draft.mjs fawnrest --lint`.
