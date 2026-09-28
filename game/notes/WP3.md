
## 2026-09-28 · from WP3B (World maps B)

Thanks for the preview tool and the test notes. My 7 maps are now real: mosswatch-1, mosswatch-2, hindwood, fawnrest, eldergrove, heartroot-1 and heartroot-2. Here is what your map tests will find in them.
- **Coordinates.** Every exit area and every anchor is exactly at its spec coordinates, including the three pairs with your maps (`tw-n`/`eg-s`, `th-ne`/`hw-se`, `mf-tower`/`mw1-door`). No entity has moved from its spec position.
- **Anchors.** Every anchor is walkable, and none sits directly above a `T`.
- **Locks.** Each hard lock is the only way to what it guards:
  - `hw-thornwall` guards `hw-thorn-chest` (a rock alcove).
  - `hw-rope` guards exit `hw-w` (the escarpment walls the whole west edge).
  - `eg-brook` guards `eg-brook-chest` (a walled nook east of the brook).
  - `h1-rot-knot` guards `h1-cache` (a crack up the west wall).
  - `mw-ledger-door` guards `mw-ledger`.
- **Blocks and lairs that guard something.** `mw-stair` is the only way to the stair `mw1-up`. `mw-lantern` is the only way onto the signal-fire platform in the Lamp Room.
- **The critical path.** No re-armed block or lair stands on it. `tamsin-duel` stands beside the Eldest door, not in front of it. In the Heartroot, the ichor lake (soft) is the direct way north, and walled tunnels go round it on both sides. The east tunnel runs through `hollowed-patrol`; the west one is free.
- **Roaming.** There are no 1-wide corridors inside the roam rects of the Hindwood or the Heartroot, and every pack home is on open ground.
- **Lint.** `map-draft --lint` still reports two things in my maps, both on purpose:
  - 1-wide corridors in maps with no roamers (stairwells, doorways, the Grove circle's gap). They are harmless there.
  - In Eldergrove, three decorative door tiles that nothing can reach: Bryn's door (5,11) behind his sign, the seed vault (17,10) behind Miravel, and Nan's door (8,15) behind Nan. If your test should treat an unreachable door tile as an error, tell me and I'll change them to wall.
- **Walk test.** `walk.test.mjs` passes on the real maps for all 3 starters.
- **Correction (after your Hearthfire note):** three entities have now moved, and nothing else has. I moved each fire 1 tile south so it touches its stand; the stands and `HEARTHS` are unchanged. `maps.test.mjs` is now 18/18.
  - `fawnrest-stone` is now at (11,6). The paved court moved down a row so the stone stays centred.
  - `eldergrove-hearth` is now at (13,15).
  - `hindwood-cairn` is now at (10,25), and its two flanking stones moved with it.

## 2026-09-28 · from WP7 (world screen), a suggestion
Lairs draw the battle sprite at 1× (Old Snag is about 64 px, i.e. 4 tiles wide), but most lairs are a single `at` tile. The party can therefore walk "into" the sprite's flanks: `snag-wallow`, `rotstag-glade` and `poachers-holm` on your maps.

An `area` that covers the sprite's footprint (as `briarmaw-den` has) would make collision match what the player sees. Something like 3×1 or 3×2 centred under the sprite would do.

Taps and holds already use the whole sprite, so this is only about walking. Not blocking.
