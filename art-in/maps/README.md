# Whole-map paintings (Milestone 6)

The player's paintings of every map the game had at Milestone 5 that was not painted yet: 35 maps, the
whole map in each picture, at the map's own shape (no padding, unlike the batch references in
`art-requests/batch-2/refs/`). They came in two zips in September 2026:

- `aethermoor-remaining-map-art` (three parts): 14 PNGs painted from the Milestone 4 file's maps,
  copied here unchanged (`map-<id>.png`).
- `Aethermoor-43-Game-Images-Under-20MB`: all 43 maps at 32 px per tile as WebP (quality 90), cut to
  the Milestone 5 file's maps. The 21 not painted anywhere else are copied here unchanged
  (`map-<id>.webp`, from its `backgrounds/<id>.webp`).

Left out as duplicates: the pack's copies of the eight maps already painted (`art-in/pilot/`,
`art-in/extra/`) and of the 14 maps above that have a PNG (the PNG has more detail).

Each picture was checked on its grid overlay (`tools/shots/paint/<id>-grid.png`): the walls, trees and
water sit on the map's solid tiles. Imported with the defaults (32 px per tile, WebP quality 0.8,
sharpen 0.35), except Fawnrest at quality 0.75 (its foliage is the densest; `test/paint.test.mjs`
holds each painting to half a byte a pixel):

```
cd game
node tools/paint-import.mjs --map=<id> --src=../art-in/maps/map-<id>.png --grid     # the 14 PNGs
node tools/paint-import.mjs --map=<id> --src=../art-in/maps/map-<id>.webp --grid    # the 21 WebPs
node tools/paint-import.mjs --map=fawnrest --src=../art-in/maps/map-fawnrest.webp --quality=0.75 --grid
node tools/paint-import.mjs --map=keep-gallery-2 --src=../art-in/maps/map-keep-gallery-2-door.png --grid
```

`map-keep-gallery-2-door.png` is `map-keep-gallery-2.webp` with its west door mirrored onto the east
wall (tile 17,4), where Milestone 6 opens the door to the Gloomfen Gallery: the strip 30 px wide by
rows 108 to 161, flipped, feathered 3 px into the wall. Nothing else changed.

| Map | Picture | From |
|---|---|---|
| briarmaw-den | `map-briarmaw-den.webp` | the 43-image pack |
| deep-shaft-1 | `map-deep-shaft-1.png` | remaining map art |
| deep-shaft-2 | `map-deep-shaft-2.png` | remaining map art |
| dust-trail | `map-dust-trail.png` | remaining map art |
| dusthaven | `map-dusthaven.png` | remaining map art |
| eldergrove | `map-eldergrove.png` | remaining map art |
| fawnrest | `map-fawnrest.webp` | the 43-image pack |
| frost-road | `map-frost-road.webp` | the 43-image pack |
| frostmere | `map-frostmere.webp` | the 43-image pack |
| frostmere-below | `map-frostmere-below.webp` | the 43-image pack |
| glass-flats | `map-glass-flats.png` | remaining map art |
| harrows-forge | `map-harrows-forge.webp` | the 43-image pack |
| hearth-road | `map-hearth-road.webp` | the 43-image pack |
| heartroot-1 | `map-heartroot-1.png` | remaining map art |
| heartroot-2 | `map-heartroot-2.png` | remaining map art |
| highfold | `map-highfold.webp` | the 43-image pack |
| hindwood | `map-hindwood.webp` | the 43-image pack |
| iron-stair | `map-iron-stair.webp` | the 43-image pack |
| ironhold | `map-ironhold.webp` | the 43-image pack |
| ironhold-deeps | `map-ironhold-deeps.webp` | the 43-image pack |
| keep-gallery | `map-keep-gallery.png` | remaining map art |
| keep-gallery-2 | `map-keep-gallery-2-door.png` (from `map-keep-gallery-2.webp`) | the 43-image pack |
| keep-hall | `map-keep-hall.webp` | the 43-image pack |
| miragewell | `map-miragewell.png` | remaining map art |
| mossfall | `map-mossfall.webp` | the 43-image pack |
| mosswatch-1 | `map-mosswatch-1.webp` | the 43-image pack |
| mosswatch-2 | `map-mosswatch-2.webp` | the 43-image pack |
| peaks-veil | `map-peaks-veil.webp` | the 43-image pack |
| rockslide-pass | `map-rockslide-pass.webp` | the 43-image pack |
| sandspire | `map-sandspire.png` | remaining map art |
| scorchgate | `map-scorchgate.png` | remaining map art |
| scorchgate-vaults | `map-scorchgate-vaults.png` | remaining map art |
| stormwatch | `map-stormwatch.webp` | the 43-image pack |
| sun-road | `map-sun-road.png` | remaining map art |
| thornway | `map-thornway.webp` | the 43-image pack |

Not for `--batch`: that reads `art-in/batch-2/` with the references' padding, which these pictures
don't have.
