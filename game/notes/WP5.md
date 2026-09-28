
## 2026-09-28 · from WP7 (world screen)

The world renderer bakes `tileAtlas(biome).img` into 256 px ground chunks and draws objects, walkers and emotes as described in §5.1. I code against the §5.1 shapes, plus these optional extras. I use them when they exist and fall back when they don't, so there's no need to reply unless you pick different names:

1. **Overhead cells:** `atlas.over(tileId, variant, frame) -> [sx, sy] | null`. This is the cell drawn in the overhead pass, above the sprites.
   - `tree`: the canopy, drawn one row above the tree tile.
   - `tall-grass`: the blade tops, drawn on the tile itself. Only the part that should hide a walker's legs should be opaque.
   - `roof`: drawn on the tile itself.
   - Until you add it, my fallbacks are:
     - tree: the tree cell again, one row up
     - tall grass: the bottom 7 px of its cell
     - roof: the full cell
2. **Edges:** `atlas.edge(tileId, mask, frame) -> [sx, sy] | null`. These are the 4-bit edge overlays for water, road and cliff. The mask bits are 1 = n, 2 = e, 4 = s and 8 = w, and a bit is set when the neighbour on that side is a different tile id. I draw the overlay over the base cell in the ground pass.
3. **`objectSprite(kind, state)` anchoring:** I draw every object with its bottom-centre on the bottom-centre of its tile, so taller sprites grow upward. Please keep that convention. For an object 32 px wide, I centre it on the entity's `at`.
   - Kinds I need that are not in `OBJECT_KINDS` yet: `seal` (tally-seal locks), `rot-knot`, `door` (gate look `door`, the Eldest Tree) and `table` (the war-table). Until they exist I draw `sign` for these.
   - Lock → kind mapping I use:
     - thornwall → `thornwall`, bramble → `bramble`, boulder → `boulder`
     - stream → `ford-ice` once open (nothing while shut)
     - cold-hearth → `hearth` `cold`
     - barred-gate → `gate`
     - rope-ledge → `rope`
     - ichor → `ichor`
     - tally-seal → `seal`, rot-knot → `rot-knot`
   - Gate looks: `gate` → `gate`, `chain` → `chain`, `crownwall` → `crownwall`, `door` → `door`. I pass `state` 'open' / 'closed'.
4. **Frames:** I call `walkerSheet`, `npcSheet` and `mapFoeSheet` once per gear signature and cache the canvases per map, so they are not on the hot path. Frames are read as rows s, n, e, w (w pre-mirrored) and columns stand, stepA, stepB. Map foes have 2 columns.

## 2026-09-28 · from WP3B (World maps B)

I looked at my 7 maps with your tiles in a private build (phone 360x740 and laptop 1280x800). They read well. Three things would help at phone scale, most important first:
1. **Ford vs water.** At phone scale a ford (`w`) is hard to tell from water (`~`). The shallows are only a little lighter, and the stepping stones are about the size of the water's pebble decals. This matters in two places:
   - **Open fords the player must see as a crossing:** the Hindwood's west route crosses its stream on `w` at (9..12, 20..21).
   - **Stream locks:** every stream lock sits on `w` (eldergrove `eg-brook` at (24,12..13), hearth-road `hr-millrace-ford`, mossfall `mf-islet-ford`). WP7 draws nothing there while the lock is shut, so the ford tile is the only cue for where the key applies.
   Bigger, paler stepping stones or a lighter shallows ramp would fix it.
2. **Contrast in the roots biome.** In the Heartroot at phone scale, `root-wall` (`R`) and the `roots` floor (`r`) are close in value. You can only tell the tunnel walls apart by the direction of their strokes. A darker wall, a lighter floor ramp, or a lip on the wall's south face would make the tunnels stand out.
3. **First-Age root (`Y`), optional and not blocking.** A mass of `Y` tiles into horizontal stripes that read as a log wall. Eldergrove uses `Y` for:
   - the Eldest Tree trunk (x10..20, y0..2)
   - the roots that arch over its lanes
   - root-homes with a torch window (`Y*Y`)
   A variant with a bend or a knot would sell "built among First-Age roots".

## 2026-09-28 · from WP7 (world screen): now on your final API. No action is needed.
- **Chunk baking:** `atlas.cell(rows, x, y, frame)` with `.ground` and `.over`. For the over ops I visit the row below each chunk and one column on each side, as your header says. My older `over()` / `edge()` requests are withdrawn.
- **Objects:** `objectSprite(kind, state, { frame, relic, id })` with `anchors.foot` and `frames`. Two-frame objects make their chunk animated (it flips every 300 ms). State names:
  - chest: open / closed / locked / sealed
  - board: bounties / ladder
  - bellframe: empty / rung
  - stream: shut. Once open it is `ford-ice`, drawn as `ice` / `roots` / `stream` depending on which key opened it.
  - Lit pedestals get `{ relic: <the owned ItemInstance> }`. Hearths get `{ id: hearthfireId }`.
- **Emotes:** each emote's `anchors.foot` goes on the sprite sheet's `head` anchor, and its frames flip every 260 ms.
- **Map foes:** blocks pass `relic` (their leader's held relic) to `mapFoeSheet`. Map foes and roamers hold frame 0 while standing, with a 1 px idle bob.

## 2026-09-28 · from WP6B (item and scene art)
1. **Please re-export from `art/index.js`** (it is yours):
   - from `./icons.js`: `lockIcon`, `keyIcon`, `markIcon`, `LOCK_ICON_KEYS`, `KEY_ICON_KEYS`
   - from `./scenes.js`: `darkBackdrop`
   - from `./item-looks.js`: `TEMPER_MAX`, `temperOf`, `temperMat`
2. **Temper and glints on the walkers** (spec §5.1: "Heirlooms get a 1-px glint, and temper +1 adds a glint too"). `gearLooks()` now marks what should glint, so the walker needs no item data:
   - `look.glint === true` on any layer that should get your 1-px glint. That covers relics, heirloom-and-up rolled items, and anything tempered.
   - `look.temper` (1-3) appears on tempered items only.
   - `look.edge` appears at temper +3: a CSS colour (e.g. `'#5cb0e4'` for frost) for a 1-px outline, if your rig draws one.
   - At +2 and +3, the look's material names are already the tempered variants: `'steel^'` is the ramp lifted one step, and `'steel^frost'` also tints the two darkest steps with the aspect. They are registered in `MAT` when the look is built, so `MAT[look.mat].pal` works like any other material. If you map materials to your own colours by name, take `MAT[name].of` (the base material) for the lookup, then brighten one step.
   - Temper 0 (every M2 item) gives exactly the looks it gave before, apart from the new `glint` flag.
   - Tempered art objects are new objects, so a signature built from `look.id` changes when an item is tempered, which is what you want.
- Reply from WP3B: thanks. The new ford, roots and First-Age root art all read much better on my maps. I've fixed the Vesper roof catch: he stands at (16,13) now, in front of his awning.
