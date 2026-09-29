# M5 P5: overworld art (the Ironspire Peaks)

Package P5 of `docs/M5-SPEC.md` §6.1. All procedural pixel art in code, in the M3/M4 overworld style. No git is run.
Files I edit: `src/art/tiles.js`, `src/art/walkers.js`, `src/art/map-sprites.js`, `tools/gallery-entry.js` (the
overworld sections). Private build folder: `scratchpad/m5-p5`.

Status: **DONE.** Two things wait on others (see "Needs from others").

## Rules I hold to
- Add, don't change: every M3/M4 atlas, map render, walker, NPC, map foe, object and emote stays pixel-identical.
  A private script hashes 641 of them (`scratchpad/p5/hash-art.mjs`, baseline taken before any edit). Last run:
  0 differ.
- Walkable ground keeps to ramp steps 1-3, scenery to 4, only lights reach the top.
- The tile characters mean what P2's table in `notes/M5-P2-maps.md` says, biome by biome.

## What is drawn
- **Tiles:** the nine biomes (`mountain`, `monastery`, `scree`, `dwarf-hall`, `forge`, `outpost`, `tundra`,
  `frozen-lake`, `ice-cave`) on P2's character table. The road always reads as road: ruts or a trodden line that
  follow the way round bends.
- **Lock looks:** `chasm`, `ice`, `rune-seal`, `drift` (closed and open), as `objectSprite` kinds of the same
  names.
- **Gate looks (new, for P2's two asks):** `ice-blocks` and `frozen-door`, both 16x24 with `closed` and `open`.
  They need wiring in (see "Needs from others").
- **Hearth looks** for the seven new Hearthfires (by id). **Props:** `hush` and `prayer-flags`. **Sign looks:** the
  three P2's maps use (`bell-rope`, `throne`, `frozen-monk`) and one more (`altar`).
- **NPC walkers:** wynn, kesh, novice, brundar, durra, ih-guard, rook, ysolde, quill, and `rime-abbot`.
  - The Rime-Abbot is Brother Aurel's face for 'abbot-after' (P3's request): a blue-white face, a beard of
    icicles, a rimed habit.
  - Every speaker in `data/dialogue.js` and every NPC on an Ironspire map resolves to a drawn look. None falls
    back to a random villager.
  - New walker options, all additive (no old look uses them):
    - on the body: `H.apron`, `H.beard: 'braid'` (plaits with clasps `H.clasp`), `H.icicles`, `H.spectacles` (a
      hex colour), `H.song` (an open mouth), `H.pack` (a bellows on the back), `H.slungChain`, `H.shadeEyes: 'frost'`;
    - in the hands: the offhand look `clipboard`, the staff style `quarter`, the weapon `saw`.
- **Map foes:** every art key and variant that the Ironspire's encounters and zone tables put on the map (checked
  against `data/encounters.js`).
  - Beasts: `rime-wolf` 24x16, `rockling` 16x16, `forge-spark` 16x16, `peak-troll` 24x24 and `old-horn` 32x32.
    Old Horn wears the Trollhide Mantle.
  - Lairs:
    - `thunder-roc` 48x40: a storm-dark eagle mantling over its eyrie, lightning along its wings, the cloak
      snagged on the nest.
    - `mother-anvil` 48x40: black iron, the Anvil Heart glowing in a barred window, the Worldforge Hammer raised.
    - `rime-abbot` 32x48: hooded, the Rime Crozier, ice spreading at his feet.

    In game a lair draws P6's battle sprite, so these are the fallback and the gallery's.
  - Walker-rig kits by gear tier: `iron-sentinel`, `sentinel-captain`, `forgeborn`, `bellows`, `journeyman`,
    `rime-wraith`, `drowned-abbess` and `choir-wraith`. The drowned monks have blue-white faces, as P4's looks and
    P6's battle art have.
  - The brigands, Rhune, the Cutter-Chief and the sawyers come through P6's `foeLooks` (the M3 path), so the map
    and the battle look agree. The East Road's `brigand/sergeant` draws as a brigand, as P4 says.
- **Gallery** (`tools/gallery-entry.js`): the nine biomes' scenes, the M5 walker-rig foes, the new beast and lair
  sheets, the new objects (automatically from `OBJECT_KINDS`), and a lair timing in world-perf.

## Checks
- **641 old-art hashes:** 0 differ.
- **The lead's new chunk bounds in `view.js`:** on all 26 maps from before M5, it bakes exactly the pixels the old
  +-1-tile filter did (`scratchpad/p5/bounds.mjs`).
  - 114 chunks, both animation frames: 0 pixels differ.
  - Every entity in every state its kind draws (568 looks): no chunk is drawn by the new filter and missed by the
    old one.
  - Two chunks (sun-road 2, glass-flats 1) now bake one frame instead of two, and look the same.
- **Atlas build time in the browser** (the gallery's guide is 150 ms per biome):
  - On a quiet machine: 44-60 ms per M5 biome; scree was the outlier at about 105 ms median.
  - Scree's stone field is now worked out once instead of for every pixel, and the atlas is proved
    pixel-identical. Its fastest node build went from about 106 ms to 77 ms.
  - Last run, on a busy machine (load 4.7): every M5 biome 67-102 ms (scree 70, mountain 81). On the same run the
    old `keep` and `desert` took 98 and 103 ms.
- **Frost Road at 4x CPU throttle:** frame JS p95 3.5-5.3 ms, 14-20 drawImage a frame. The M5 gate is 16 ms and 40.
- **e2e-world M5 scenarios 21-26** on my private build (phone): all pass, no console errors.
- **Size:** the game is 2151 KB, under the 2.5 MB warning. My three files add about 83 KB (whitespace-minified)
  over M4.5.
- **`npm run lint`:** clean.
- **`npm test`:** 380/382. The two that fail are the lead's East Road encounters (`er-wolves` and the others),
  which have no map yet ("every ENCOUNTERS fight ... placed exactly once", "world tables: IRON_PATH ..."). P2's
  notes say the same. Nothing of mine fails.

## Notes for P2 (maps)
The tiles follow your table in `notes/M5-P2-maps.md`. A few things the art does that you can use:
- **`=` knows its way.** Wheel ruts run along the road and curve round a bend (a tile with road on two sides at a
  right angle). On the Highfold and the Frostmere path it is a trodden line instead. A tile with road on three or
  four sides is a plain junction.
- **`,` in the mountain biome is now grey scree and gravel over the turf** (your ask), with an alpine flower in
  one variant in three. It thins into the turf round it in a ragged edge, so a scree field has a soft outline. It
  meets roads, drifts, voids, cliffs and walls without an edge of its own.
- **`m` snowdrifts** have soft, wind-cut edges with a lit crest on their north and west, so a drift reads as deep
  snow on turf and on snow alike. Lay the `drift` lock over `m` as your table says. `i` draws the same drift, with
  spindrift blowing (2 frames), if you ever want it.
- **`:` on Frostmere is black ice**, and it meets the snow (`.`) with the same soft edge. A lone `:` tile comes out
  as a round dot, because every side gets the edge. `w` there is thin ice with a white crack web, and `~` open water
  has a snow rim with floes drifting in it.
- **`x` is a drop.** Where it meets walkable ground:
  - its far (north) wall shows as a lit rock face: brick in the forge's pit, blue ice under Frostmere;
  - it has thin side walls, and the ground's lip on its near side.

  It draws no face against walls, cliffs, water or a bridge, so a bridge over a drop reads as a bridge.
- **Columns (`Y`)** in the monastery, Ironhold and under Frostmere rise into the tile above as an overhead part
  (capital and upper shaft, drawn over anyone standing behind). In the forge `Y` is an anvil on an iron plinth.
- **`_` in Ironhold is the Thane's runner:** a red carpet with a straight gold border wherever it meets
  something that is not runner. Keep it a clean strip (two or three wide) and it reads as one runner.
- **`|`** is a chain rail on iron posts in the mountain biome and a snow-capped timber stockade at Stormwatch. The
  chain swags east-west, or runs north-south in a vertical run.

### Objects (`map-sprites.js`)
- **Locks** (each has `closed` and `open`):
  - `chasm`: a gap that the way crosses east-west. All three of yours lie like this: a ground row across a
    north-south column of void `x`, or of water on Frostmere.
    - Closed, the void runs on through the crossing, wind rising out of it (2 frames). Open, planks are lashed
      across with a rope along the side.
    - The rock look is 16x25, its foot 8 px above the bottom. It reaches 2 px into the tile above and 7 px into
      the one below, over the void's lip and far face, so the column reads unbroken. It wants void or water above
      and below it.
    - With `{ look: 'floes' }` (16x16) it is black water with broken floes drifting. Open, the floes have jammed
      into a crossing.
    - Each piece fills its tile, so a two- or three-wide area joins up.
  - `ice` 16x24: a wall of old blue ice. Open, a pool and two shards.
  - `rune-seal` 16x24: a granite door-slab with iron-filled runes that glow as they read you (2 frames). Open, the
    slab has sunk into the floor and the way is dark. Two side by side read as a double door.
  - `drift` 16x16: a wind-cut cornice with glitter (2 frames); open, a trench of firm boot prints. It is drawn to lie
    on the `m` drift tiles, which already read as deep snow by themselves.
- **Gates** (new looks, 16x24, `closed` and `open`):
  - `ice-blocks`: sledges lashed across the way, stacked with blocks of lake-ice, snow on top. It stacks cleanly
    in a two-tile area like `fr-saw-barricade`'s. Open, the sledges are dragged aside: one runner and loose
    blocks at the edge.
  - `frozen-door`: black oak under a skin of old ice, iron bands, icicles from the lintel. Its leaves join
    east-west into one door, as `fb-chapel-door`'s three tiles need. Open, the ice has shattered and the doorway
    stands dark.
- **Hearthfires**, by id:
  - `pass-shrine`: a way-shrine with a coal in its niche.
  - `veil-hearth`: a bronze fire-bowl on a pale plinth.
  - `stair-cairn` and `frost-cairn`: a snowy cairn.
  - `thanes-hearth`: a granite mantel banded with iron.
  - `deeps-forge`: a brick furnace, dark and full of ash until lit.
  - `stormwatch-fire`: an iron fire-basket on a post.
- **Signs** (P2's looks):
  - `bell-rope`: the sally striped red and white, the tail coiled.
  - `throne`: black granite, a red cushion, a rune.
  - `frozen-monk` (16x24): a monk in a block of ice.
  - New: `altar`, a stone altar under a rime-white cloth, if you want it for `fb-altar` (it uses `plaque` now).
- **Props:**
  - `prayer-flags` 16x24: a pole with a line of five flags run down to a stake, snapping in the wind (2 frames).
  - `hush` 112x64, its foot at the bottom-centre of its `at` tile: a vast body curled under the floor, an eye shut,
    the heart glowing and beating (2 frames). Its dark is dithered toward the edge so the floor shows through. It
    draws whole wherever it stands (the chunk baker uses real bounds).
  - Both draw their default state for `state: null`, as props arrive.
- Every object's foot is `[w/2, h-1]` (the same `[8, h-1]` as before for every 16-wide sprite), except the rock
  `chasm`'s `[8, 17]`.

## Needs from others
- **Lead (`ui/world/view.js`, `GATE_KIND`), for the new gate looks:** add
  `'ice-blocks': 'ice-blocks', 'frozen-door': 'frozen-door'`. Until then these two looks draw as the plain gate.
- **P2 (or the lead, as P2 is done), in the map data:** set `look: 'ice-blocks'` on the Frost Road's
  `fr-saw-barricade` (now `barred-gate`) and `look: 'frozen-door'` on Frostmere-below's `fb-chapel-door` (now
  `door`). Optional: `look: 'altar'` on `fb-altar`.
- **Already done by the lead, thanks:**
  - `LOCK_KIND` has chasm, ice and rune-seal.
  - A frozen-lake chasm passes `look: 'floes'`.
  - The bell rope draws `sign:bell-rope`.
  - Chunks bake by each sprite's real bounds.
  - The drift lock stays undrawn (its `m` tiles read as drifts).

## Left as it is
- A boulder (`o`) in the mountain's scree field sits on its own square of turf. The rock tile draws the biome's
  ground, and the scree around it thins into that turf with its soft edge.
- The chasm's rock look darkens 2 px of the tile above and 7 px of the tile below. That suits every chasm laid
  today (void above and below). A future chasm laid between ground tiles would want a look of its own.
