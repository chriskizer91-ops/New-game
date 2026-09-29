# M5 P2 maps: the Ironspire Peaks and the Ironspire Gallery

Package P2 of `docs/M5-SPEC.md` (§2, the maps parts of §8). No git is run. Files I edit: the 11 Ironspire
maps, `keep-gallery-2.js`, `data/maps/index.js`, the §2.4 lines of `keep.js`/`fawnrest.js`/`keep-gallery.js`,
`data/tiles.js`, `data/locks.js`, `data/world.js`, `test/maps.test.mjs` (Ironspire), `test/walk.test.mjs`
(the Ironspire walk), `test/road.test.mjs` (its map list), `tools/map-draft.mjs`, `tools/map-shots*`.

Status: DONE (see "Where I am" at the bottom).

## Tile characters in the Ironspire biomes (for P5, overworld art)

No new tile character. Each map's header comment repeats what its characters mean. In short:

| char | mountain (pass, stair) | monastery (Veil) | scree (Highfold) | dwarf-hall (Ironhold) | forge (Deeps, Harrow's Forge) | outpost (Stormwatch) | tundra (Frost Road) | frozen-lake (Frostmere) | ice-cave (Beneath Frostmere) |
|---|---|---|---|---|---|---|---|---|---|
| `.` | alpine turf with snow patches | snowy ground | grey scree ground | - | - | trodden snow | wind-packed snow | snow (shore and snowed-over ice) | - |
| `,` | gravel and alpine flowers | herb-garden beds | loose stones | - | - | gravel | snow ripples | cracks in the snow | - |
| `"` | tussock grass | herbs | tussock | - | - | - | frozen reeds | frozen reeds | - |
| `=` | the road (gravel) | - | the path | - | - | the road | the snow-packed road | the path over the ice | - |
| `:` | old paving, dwarf-cut steps | cloister flagstones | - | hall flagstones | worked stone floor | yard flagstones | cairn paving | clear black lake ice (walkable) | the drowned chapel's flagstones |
| `_` | - | refectory / cell planks | - | the Thane's runner | - | barracks planks | - | - | - |
| `m` | snowdrift | snowdrift | snowdrift (the `drift` lock sits on these) | - | cooled slag | snowdrift | snowdrift (the `drift` lock sits on these) | snowdrift | - |
| `T` | pines | pines | pines | - | - | pines | frost-dead trees | snowy pines | - |
| `t` | juniper | herb bushes | juniper | barrels | - | crates and barrels | frozen shrubs | frozen shrubs | - |
| `o` | boulders (the slide) | rocks | boulders | rubble | slag heaps, ore | rocks | boulders | heaved ice blocks | ice boulders |
| `^` | cliffs and crags | cliffs | crags | - | - | the ridge's cliffs | ice-crusted crags | the rocky shore | - |
| `#` | drystone, the shrine | whitewashed walls | - | carved granite | furnace brick | stone walls | cairn stones | the shrine's walls | the drowned chapel's walls |
| `H` | - | slate roofs | - | - | furnace hoods | plank roofs | - | the shrine roof | - |
| `\|` | iron chain rails (the Iron Stair) | - | - | - | - | the timber stockade | - | - | - |
| `*` | - | wall lamps | - | wall torches | wall braziers | wall torches | - | - | - |
| `Y` | - | cloister columns | - | carved columns | iron pillars / anvils | - | - | - | ice columns |
| `R` | - | - | - | raw mountain rock | the rock of the Deeps | - | - | - | walls of blue ice |
| `k` | - | - | - | - | soot-black floor | - | - | - | the ice floor |
| `r` | - | - | - | - | mine rails (as M4's mine) | - | - | - | - |
| `f` | - | - | - | rune-stones glowing | embers, warm coals | - | - | - | glowing air pockets in the ice |
| `~` | tarn / stream | the font | tarn | - | the quench channels | - | open water | open water (the hole) | black water |
| `w` | ford | - | - | - | - | - | - | thin ice / broken floes (walkable) | - |
| `b` | bridge | - | plank bridge | - | - | - | - | boardwalk | - |
| `x` | the drop (chasms) | - | the drop | - | the pit | - | - | - | the dark below |
| `s`, `+`, `v` | stairs, doors and ledges as everywhere | | | | | | | | |

## Needs from others

Landed already (thanks): the lead's `LOCK_KIND` (chasm, ice, rune-seal), the bell rope's look and prompt, floes on
a frozen-lake chasm, big sprites baked by their real bounds (Hush); P5's tiles, lock looks, sign looks and props.
Still open:
- **P5 (overworld art), optional:** in the `mountain` biome `,` draws as alpine flowers. On the Rockslide Pass it
  is meant as grey gravel and scree (the scree field at rows 9-19 especially, where the rocklings nest); greyer
  stones would read better there. I have made the field rockier with more boulders meanwhile.
- **P5 + lead, optional:** Ironspire gate looks, if drawn: an `ice-blocks` barricade for the Frost Road's
  `fr-saw-barricade` (now `barred-gate`) and a frozen door for `fb-chapel-door` (now `door`). Tell me the look
  names and I set them on the entities; the lead adds them to `GATE_KIND`.
- **P3 (story):** `pv-bell-rope` is a `bellframe` at (3,6) (the view draws your `bell-rope` sign look), so your
  node rings the bell at the rope. After the bell is rung the node still opens with "knotted up out of reach";
  a line for afterwards would fit. `pv-lookout` is at (24,20).
- **P4 / P6:** every Ironspire map's `backdrop` and each zone's backdrop is its map id (spec §6.2; the Deeps'
  zone fights on `ironhold-deeps`). P6 has painted them all (`art-keys` is green); nothing open.
- **P7 (e2e-world scenarios), ids:** the postern `keep-e`; the pass's chasm `rp-crevasse` and its cache
  `rp-crevasse-cache` (Windstep Boots from `rp-brigands`); Peak's Veil `veil-hearth`, `pv-bell-rope`; an ice
  wall for the Anvil Heart: `is-ice-wall` (Iron Stair, Old Horn's cave) or `fr-ice-wall` (Frost Road);
  Mother Anvil on `harrows-forge`; the Deeps (`ironhold-deeps`, dark, with lights); the Frost Road for
  performance (48x26, roam max 3, the pack `fr-wolves`).

## Progress (in road order)

| Map | State |
|---|---|
| all 11 Ironspire maps | laid out, road test green, drafts looked at |
| `keep-gallery-2` | the scaffold's room, header written (no change needed) |
| `world.js` | HEARTHS stands, ZONES backdrops; IRON_PATH/IRON_LEADS as the spec |
| `test/maps.test.mjs` | 28 -> 37 tests (9 Ironspire), all pass |
| `test/road.test.mjs` | the Ironspire maps in its list; IRON_PATH and IRON_LEADS in the no-roaming test |
| `test/walk.test.mjs` | 6 -> 9 tests: the Ironspire walk x3 (987 steps, the road held before all 9 road fights) |
| art pass | every map drawn with P5's real tiles and looked at; Frostmere's surface redone (broad black-ice patches, trodden paths), the pass's scree field rockier, the Veil's yard trodden snow |

Helpers (scratchpad, not in the repo): `scratchpad/gen/mapgen.py` composes rows from stamped blocks;
`scratchpad/gen/<map>.py <path>` rewrites a map's rows. Drafts: `scratchpad/p2-draft/*.png`.

`tools/map-draft.mjs` already knows the Ironspire: the 'all' state holds all six Brands and the M5 flags,
the four locks have short names (Ch, Iw, Rs, Dr), the Ironspire biomes draw as snow, rock or ice.

HEARTHS stands: `pass-shrine` (19,41), `veil-hearth` (14,12), `stair-cairn` (7,25), `thanes-hearth` (15,6),
`deeps-forge` (6,14), `stormwatch-fire` (13,14), `frost-cairn` (28,12); every fire faces north.

## For the lead's East Road (keep-e -> rockslide-pass today)

Left as the spec has it (the lead wires the six-map East Road in after this package). What names the link:
- Data: `keep.js` exit `keep-e` (`to: 'rockslide-pass', anchor: 'from-keep'`) and anchor `from-rockslide`
  (28,11,'w'); `rockslide-pass.js` exit `rp-keep` (to `keep`/`from-rockslide`), anchor `from-keep` (1,55,'e'),
  `roads[0].from: 'from-keep'`, first lore point `[560, 382, 0, 55]`, and the header's first sentence;
  `world.js` `REGIONS.ironspire.entries` (`keep-e`, `fr-highfold`); the keep.js header (east postern).
- `test/maps.test.mjs`, "the Ironspire opens through the Keep's east postern ...": `east.to === 'rockslide-pass'`,
  `IRON.length === 11`, the flood uses `keep-e`, "leaves the Ironspire only for the Keep or Fawnrest"
  (`rockslide-pass -> keep`), and anchor `keep/from-rockslide` beside `keep-e`.
- `test/maps.test.mjs`, the M3 exits test: `gated` lists `keep-e` (still right if keep-e keeps its gate).
- `test/maps.test.mjs`, "world tables: IRON_PATH ...": IRON_PATH pinned exactly; every `region: 'ironspire'`
  encounter must sit on an Ironspire map (so `er-wolves`, `er-toll`, `er-camp` fail it until their maps land).
- `test/maps.test.mjs`, "the Ironspire maps hold what spec §2.3 puts on them": `IRON_SPEC` keys must equal every
  `region: 'ironspire'` map, each with `backdrop === id` and `roads`; the music, dark, travel and zone lists
  are exact over the region. The chests test runs over the region too (frost opals only on the two Frostmere
  maps, embers behind a key, no relic).
- `test/maps.test.mjs`, the way-home test: road gates on the region whose guard is on IRON_PATH before a Brand
  must stay open after the re-arm (so open on `beaten`/`done`, not `cleared`).
- `test/road.test.mjs`: the explicit list of road maps (add the East Road's).
- `test/walk.test.mjs`: no pin; the walk follows IRON_PATH (plus Brundar) from the Great Hall, `held >= 9`.
- `tools/e2e-world.mjs` scenario 21 (P7): walks through `keep-e`, expects `music: 'peaks'` there and shoots it
  as `rockslide-pass`.

## Mutation checks

Each made in a scratch copy of the tree (never in the working copy), the tests run, the copy thrown away:

| Mutation | Tests failing |
|---|---|
| `keep-e` opens with Act I | the east postern test |
| `keep-e` opens at the intro | 8 (the postern, reachability x3, no-hard-lock, leads, hard-lock, story gates) |
| Tamsin sits in the hall, not the arch | the Ironhold road test |
| the Bellows' doors two wide, a hole beside them | the Deeps road test |
| an ice wall on the Iron Stair's first stair | the no-hard-lock-on-IRON_PATH test |
| the Bellows' doors open on `cleared` (re-close when re-armed) | the way-home test |
| the pass's crevasse has a way round it | the hard-lock test |
| the rocklings roam (`pack`) | 4 (pack homes, spec §2.3 map, the pass road, no-roaming) |
| a frost opal on the Frost Road; embers in an open chest | the Ironspire chests test |

## Where I am

Done. Maps, tests and mutation checks are finished; `tools/map-shots.mjs` renders all 12 maps (written to
the scratchpad, never the repo); the private build (`scratchpad/m5-p2`) runs at 360 px with no console errors
on the Ironspire maps. Last polish: the §2.4 header comments of `keep.js` and `fawnrest.js` now say how the
east postern and the Highfold way open, and Frostmere lost a lone black-ice tile at (10,19).
Final runs in GAME: `npm test` 381/381 pass before the lead's East Road encounters arrived; with them (not
placed yet) 379/381: "every ENCOUNTERS fight ... placed exactly once" and "world tables: IRON_PATH ..." fail on
`er-wolves` until the East Road maps land. `npm run lint` clean (no errors, no warnings).
