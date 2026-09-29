# M6 P5: overworld art (the Gloomfen Marsh)

Package P5 of `docs/M6-SPEC.md` §6.1. All procedural pixel art in code, in the M3-M5 overworld style. No git is run.
Files I edit: `src/art/tiles.js`, `src/art/walkers.js`, `src/art/map-sprites.js`, `tools/gallery-entry.js` (the
overworld sections), and a new test of my own, `test/world-art.test.mjs`. Private build folder:
`scratchpad/m6-builds/p5`.

Status: **done** (ready for the lead's review).

## Rules I hold to
- Add, don't change: every M3/M4/M5 atlas, map render, walker, NPC, map foe, object and emote stays pixel-identical.
  A private script hashes 1036 of them (`scratchpad/m6-builds/p5/hash-art.mjs`, baseline taken before any edit):
  0 differ. `test/world-art.test.mjs` now pins the same art in the repo (33 digests, `AETH_PIN=1` prints them).
- Walkable ground keeps to ramp steps 1-3, scenery to 4, only lights reach the top.
- The tile characters mean what P2's table in `notes/M6-P2-maps.md` says, biome by biome.

## What I made
- **Tile atlases** (`tiles.js`, the "Gloomfen" block): `willow-village`, `channel`, `stilt-town`, `bog`,
  `drowned-grove`, `boardwalk`, `sunken-city`, `belfry`, `mudflat`, `causeway` (the Murkway keeps M3's `fen`). A
  `GLOOM_PAL` row per biome over `GLOOM_BASE`, one style key per character (P2's table), `GLOOM_SPEC` over the
  Ironspire's; new `w.` materials (sedge, fen moss, sphagnum, peat, silt, reeds, willow, thatch, daub, boards, tarred
  boards, fen and ruin stone, the causeway's stone, wreck timber, five waters, marsh-light and water-light).
  - The road reads as road: `=` is a trodden line or ruts (the Ironspire's `pickV`), the causeway's crown a bond of
    setts with a worn line (the edge stones `:` are long kerb blocks); on the flats the ruts are softer (`rutDD`).
  - Things stand on what is round them (`standOn`): a crate on a plank street stands on planks, a snag in the channel
    in the water, a stump on the bank on the bank. Plank ways over the water (`decks`, duckboards) stop at it with a
    dark joint and a side-beam (`deck` edges), and the water draws no bank toward them or toward anything in it.
  - The bog's `m` is black peat with tussocks (its soft `bog` lock draws no sprite); elsewhere wet mud, silt, or the
    flats' soft mud (smooth, dark, streaks of sky, worm casts). The Gloomfen's shallows (`w`) are lighter water with
    stones showing through; the Belfry's flooded floor shows its slabs; the flats' `w` are tide-pools and runnels.
    The Belfry's bell-hall floor (`k`) is big dark flagstones in a running bond, black joints, wet glints.
  - Every atlas builds in 53-84 ms in Chromium (median of 3; budget 150), 301-316 cells.
- **Gate looks** (`map-sprites.js`, 16x24, closed/open): `toll-bar` (a length of Hodge's banded pole on a trestle, his
  lantern on a hook; open, swung up), `leech-ford` (black water heaving with leeches; open, the ford shows),
  `ward-gate` (a wicker hurdle with bones tied on and a willow root over it; open, a stub), `hung-lanterns` (a dead
  bough with little lanterns and moths; open, one dark lantern dropped in the path), `hag-fence` (stakes, a cord,
  bones, a bottle, a skull, hair; open, pulled down), `barge-planks` (black water between broken plank ends, a plank
  adrift; open, lashings: the tile's barge-planks show), `water-gate` (a portcullis under a lintel into the flood;
  open, raised), `choir-screen` (carved tracery and a panelled base; open, the leaves back). The toll-bar and the
  ward-gate are drawn for a bar or hurdle across an east-west way (Rotbridge's and Willowmurk's areas run north-south,
  so each tile shows a length of it running down the screen); the others join east-west, as M5's do.
- **Lock looks**: `blackwater` (16x20: deep black water with rings and a pale back under it; open, a punt moored
  across), `witch-ward` (a ward-stone with cords out to both sides, holed stones, a feather, twigs, a hum; open, the
  cords down). Both animate while shut.
- **Props**: `wreck` (32x20), `marsh-lights` (animated), `black-barge` (64x36, the Unsmith's mark on the prow),
  `lantern` (16x32, lit, moths), `sleeping-child`, `crane` (32x40), `diving-bell` (16x32), `sealed-chest`, `barge`
  (48x28, the Tallymen's mark), `bell` (16x32, swaying), `sleeper` (96x56, Lull under the Belfry's floor, thinned into
  it like Hush, a slow light in its breast).
- **Sign looks**: `ward-stone` (lit, humming, 2 frames), `ward-stone-dark` (dark, cracked), `bootprints` (small prints
  going north, water standing in them). The Hollow's lost shoe uses `bootprints` too (its words say shoe).
- **Hearthfires** by id: `reed-shrine` (a reed shrine on a hummock, a lamp in it), `willow-hearth` (the moot-circle's
  ring of flat stones), `toll-lamp` (a lamp on a crooked post, a toll-bell), `stilt-hearth` (an iron fire-basket on a
  stone slab), `fen-cairn` (cold), `bell-hearth` (a bronze bowl on a column drum, a cracked bell; cold), `wreck-fire`
  (24x20, a fire-pit in a beached hull; cold), `flats-beacon` (16x32, a fire-basket on a braced iron mast).
- **NPC looks** (P3's descriptions): Elder Moss, Sedge, the Willowmurk villager, Hodge, Mayor Gretch, Nettie, Widow
  Pell, the Stilt-Watch, Corvus, and the Lantern Mother's bust (black lace, her veil open at the face, her lantern).
  Hodge is P6's Hodge at gear tier 0 (short, bald, ruddy, grizzled, a cudgel, a jerkin) with his lantern and toll-book.
- **Map foes**: dedicated sprites for `mire-leech`, `marsh-light`, `lamp-moth`, `blackwater-gar`, `willow-wight` and
  the lairs `old-jaws` (the Gar's Tooth glints in his jaw), `grandfather-willow` (the Weeping Bow in his boughs),
  `lantern-mother` (lantern held, veil worn, moths), `blackwater-leviathan` (collar and chain, harpoon in its side,
  pearl in its brow); walker-rig kits, one per gear tier, for `drowned`, `bell-ringer`, `drowned-choir`,
  `drowned-cantor` (the Cantor's Staff), `bog-hag`, `mother-grue` (the Hag-Stone, shown at her throat: the walker has
  no rings), `hodge` (the Unfair Toll on a cord), `reedcutter`, `salvage-diver`, `bargehand`, `salvage-master` (the
  copper diving helm), `bargemaster` (the gauntlets). `GLOOM_VARIANT` maps family + variant to these keys.
  - Decided: as the M4 and M5 kits do, these kits take precedence over `foeLooks()` for their keys. P6's rigs are made
    for 64 px (a cane's hook, a ledger, helm trims are drawn over the rig in battle) and read poorly at 16 px; the kits
    follow the same descriptions and colours (P4's "looks, settled" and P6's Hodge).
  - `mapFoeLook(artKey, variant)` (exported) says which drawing a foe gets; every family and variant is a kit, a
    beast or its battle rig (none a stand-in or a hashed villager).
- **Walker vocabulary** (`walkers.js`, new values only): head looks `hat` (`wide` or `witch`) and `veil`; weapons
  `club` and `hook`, a spear's `hook` (boat-hook), a staff's `lamp` style (a lantern on a crook); an off-hand `bell`;
  trinkets `bottle` and `basket` (with `herbs`); `H.bottleRow` (bottles along the belt; M3's `vials` stays a hint).
- **Gallery** (`tools/gallery-entry.js`): the ten biome scenes, the M6 map foes in `MAP_FOE_KEYS`, review filters
  (`#ok=kind,..`, `#hid=id,..`), the M6 lair and kit timings in `world-perf`, and `window.__art` for review scripts.
- **Test** (`test/world-art.test.mjs`, 7 tests): every map's biome has an atlas and the ten draw every tile id (the
  animated ones in two frames); every cell of every Gloomfen map composes to ops inside the atlas, both frames; every
  gate, lock, prop, sign and Hearthfire the Gloomfen maps name has its look, shut and open (gates 16x24); every
  Hearthfire has a look, lit (2 frames) and cold; every speaker's look (the Gloomfen's ten their own); every foe family
  and variant walks as a kit, beast or rig at every gear tier, and the lairs carry their relics; and the M3-M5
  overworld art pinned pixel for pixel.

## Needs from others
- **P7:** nothing more: `view.js` names my sprites in `GATE_KIND` and `LOCK_KIND`, and they are all in
  `OBJECT_KINDS` now, so the `FALLBACK_KIND` entries for the ten Gloomfen looks are no longer reached (they can go).
- **Lead:** the game is 2575 KB in my private build (over the 2.5 MB warning, under 3.2 MB); my share is about
  75 KB of `map-sprites.js` and about 80 KB of `tiles.js` source.

## Where I am
- Checks (private build `scratchpad/m6-builds/p5`): `npm test` 498/498, `npm run lint` clean, the private hash
  0 differ of 1036; e2e-world scenarios 28-39 on the phone all pass, and 30, 31, 33, 35, 36, 39 on the laptop (no
  console errors). PERF 39 (4x throttle): the Lanternfen in thick fog p95 frame JS 2.1 ms, 11 drawImage (laptop 2.8 ms,
  12); the long boardwalk p95 1.5 ms, 12 drawImage (laptop 1.3 ms, 15).
- Looked at: every biome's gallery scene at 3x and 6x, every Gloomfen map with the real tiles
  (`map-draft --png --art`), the objects, NPCs and foes at 4-6x, and the game's own shots of Rotbridge's bar shut
  and open.
