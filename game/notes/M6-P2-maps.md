# M6 P2 maps: the Gloomfen Marsh and the Gloomfen Gallery

Package P2 of `docs/M6-SPEC.md` (§2, the maps parts of §8). No git is run. Files I edit: the 12 Gloomfen maps,
`keep-gallery-3.js`, `data/maps/index.js`, `data/tiles.js`, `data/locks.js`, `data/world.js`, `test/maps.test.mjs`
(Gloomfen), `test/walk.test.mjs` (the Gloomfen walk), `test/road.test.mjs` (its map list), `tools/map-draft.mjs`.
Private build folder: `scratchpad/m6-builds/p2`.

Status: **done** (see "Where I am" at the bottom). The tile table below is final (P5 has drawn from it).

## Tile characters in the Gloomfen biomes (for P5, overworld art)

No new tile character: every Gloomfen map uses the legend in `data/tiles.js` as it is. Solidity comes from the legend
and never changes by biome:
- **walkable:** `.` `,` `"` (tops drawn over sprites) `=` `:` `_` `m` `r` `k` `f` (animated) `w` (animated water) `b`
  `+` and `s` (no roaming);
- **solid:** `T` (canopy over the row above) `t` `Y` `o` `#` `H` (drawn over sprites) `|` `*` (animated) `~` (animated
  water) `^` `x`.

The Murkway is M3's `fen` biome, drawn as it is (`.` marsh grass, `,` white and gold marsh flowers, `"` reeds, `=` the
safe path, `m` bog mud, `~` black pools, `w` fords, `b` planks, `T` willows, `t` bramble, `o` stones, `^` cliffs,
`s` the fen stair). The ten new biomes, character by character (a `-` means the biome does not use it):

| char | willow-village (Willowmurk) | channel (Rotbridge, the Blackwater Reach) | stilt-town (Bogmire) | bog (the Lanternfen) | drowned-grove (the Mother's Hollow) |
|---|---|---|---|---|---|
| `.` | islet turf: moss and clover under the willows | sedge grass on the banks | the town islet's trodden grass and mud | sphagnum moss, the bog-top | leaf litter on the raised ground |
| `,` | marsh marigolds and herb beds | shingle and bank gravel | herb pots and moss on the planks (Nettie's) | bog cotton, white tufts | fallen willow leaves |
| `"` | reeds at the water's edge | reeds | reeds | rushes | rushes |
| `=` | the village paths, trodden earth | the road; on the Reach, the towpath | the east road's earth where it reaches the town | the old path, trodden peat | - |
| `:` | the moot-circle's flat old stones | the old bridge's stone: its piers, abutments and paved approaches | the market deck and the moot-hall's boards (heavier, tarred) | - | - |
| `_` | plank floors: drying platforms, porches | the toll-house floor | the plank streets and platforms on piles | - | the sunken house's floorboards and porch |
| `b` | plank walks between the islets | timber decking: the bridge's span, docks, jetties | rope bridges and narrow gangways | duckboards over the pools | loose planks over the water |
| `m` | mud at the water's edge | mud banks | slumped mud under the east quarter | black bog mud (the `bog` lock lies on these) | mud |
| `r` | willow roots over the ground | tree roots on the banks | - | bog-oak roots | willow roots |
| `w` | shallows | shallows (the gars' shallows; under the blackwater docks) | shallows under the piles | shallow pools | flooded ground, black and shallow |
| `~` | black water between the islets | the Blackwater: wide, slow and black | black water under the town | black pools (small lights hang over them) | deep black water |
| `T` | great weeping willows | alders and willows on the banks | dead trees | dead trees, black and bare | black willows, weeping into the water |
| `t` | drying racks, eel-traps, woodpiles | scrub and nets on poles | crates, barrels, nets and bottle racks | gorse and dead brush | dead brush |
| `o` | mossy boulders | snags, stumps and the timbers of sunk boats | piles and posts standing out of the water | stones and stumps | stones and stumps |
| `#` | hut walls: wattle and daub on bog-oak | stone: the toll-house, the drowned mill | hut walls: weathered boards | the sunken hut's walls (Mother Grue's) | the sunken house's walls |
| `H` | reed thatch | slate and mossy roofs | tarred shingles and patched thatch | the hut's sagging thatch | the house's roof |
| `+` | hut doors | doors | doors | the hut's door | the house's door |
| `\|` | wattle fences | the bridge's parapet and fences | rails and fences on the platforms | - | - |
| `*` | lanterns on posts along the plank walks | lamps on posts | lanterns on poles | - | the house's lit lamps, in its windows |
| `^` | - | cut earth banks | - | peat banks | - |
| `x` | - | - | holes in the rotten planks (the east quarter), black water below | - | - |

| char | boardwalk (the Long Boardwalk) | sunken-city (the Misthollow Ruins) | belfry (the Drowned Belfry) | mudflat (the Tidal Flats) | causeway (the Blackwater Causeway) |
|---|---|---|---|---|---|
| `.` | reed islets | moss and grass on raised ground | - | firm wet sand and mud | reedy banks |
| `,` | - | rubble scree and weeds | - | shells and wrack | weed and wrack left on the stones by the flood |
| `"` | reeds | reeds | - | salt-marsh grass | reeds |
| `=` | - | - | - | the barge-camp's trodden track | the causeway's crown: the stone road |
| `:` | the stone quay at the Misthollow end | old paving: dry streets and squares | dry flagstones | - | the causeway's edge stones, its landings |
| `_` | barge-planks (the patched middle, the side jetty's deck) | the salvage camp's decks | the choir's floorboards | barge decks | - |
| `b` | the boardwalk: planks on stilts, with rails | the salvagers' plank bridges and piers | - | jetties and gangplanks | - |
| `m` | mud | silt | - | soft mud | mud the falling water left |
| `r` | - | - | - | the great chain, lying across the mud | - |
| `k` | - | - | the bell-hall's floor (dark flagstones) | - | - |
| `f` | - | - | air pockets, glowing (as Beneath Frostmere's) | - | - |
| `w` | shallows | flooded streets: shallow water over paving | flooded floor: green shallow water | tide-pools and runnels | shallows |
| `~` | open water | deep water: the drowned districts, the canals | deep water: the sunken nave | the channel and the open sea | Mirrordeep's water |
| `T` | dead trees | drowned trees growing out of the ruins | - | - | willows on the banks |
| `t` | nets and crates | salvage crates and barrels | the choir-stalls, carved | crates, barrels, coils of chain | scrub |
| `o` | stilts and piles standing out of the water | fallen masonry and rubble | fallen masonry | wreck timbers, ribs and rocks | fallen blocks and marker stones |
| `#` | a shelter hut's walls | ruined masonry: walls, leaning towers | walls | barge cabins and hulls | - |
| `H` | the shelter's roof | tower tops and belfry roofs | - | tents and barge-cabin roofs | - |
| `Y` | - | columns and arches | pillars | - | - |
| `+` | - | doors and archways | doors | - | - |
| `s` | - | the stair down to the Belfry | the stair up | - | - |
| `\|` | - | the salvage camp's timber scaffolding | - | the barge-camp's stockade of stakes | - |
| `*` | lamp-posts along the rails | braziers | drowned lamps, green | - | - |
| `^` | - | - | - | - | the causeway's retaining walls |
| `x` | the broken gap in the boardwalk | - | the dark under the floor | - | - |

## Looks the maps use (for P5; the view's `GATE_KIND` and `LOCK_KIND` entries for P7)

The names are fixed; each is used on the maps as listed (ids in the per-map list below).
- **Gate looks** (`kind: 'gate'`, `look`; closed and open, 16x24 as the M5 ones). New ones (each needs an entry in
  `ui/world/view.js` `GATE_KIND`, and P5's object sprite; until both land the view draws the plain `gate`):
  - `toll-bar`: Hodge's striped bar across the bridge (spec §6.1); open = the bar swung up.
  - `leech-ford`: the Murkway's ford, black and moving with leeches; open = clear shallow water.
  - `ward-gate`: Willowmurk's broken wicker-and-bone gate between two dark ward-stones, willow-roots through it.
  - `hung-lanterns`: a dead bough bent low over the path, hung with little lanterns, moths thick round them; open =
    the bough lifted aside, lanterns out.
  - `hag-fence`: stakes across the path hung with bones, bottles and knotted hair; open = pulled down.
  - `barge-planks`: the long boardwalk's gap (planks gone into the water); open = barge-planks laid across it.
  - `water-gate`: Misthollow's portcullis down to the flood in an arch; open = raised.
  - `choir-screen`: the Drowned Belfry's carved screen gate; open = standing open.
  Existing looks reused: `chain` (the reedcutters' chain, the salvage chain, the Reach's barge chain, the Flats'
  chain-post), `gate` (Tamsin's bridge-gate on Rotbridge).
- **Lock looks** (`LOCK_KIND` in `view.js`, P5's sprites): `blackwater` (a dock: one tile of black water between a
  jetty's end and the far side, closed; a flat-bottomed boat moored across it, open) and `witch-ward` (stones hung
  with charms on cords across the way; open = the cords down). `bog` is soft and draws no sprite (its `m` tiles
  carry the look, as the drift's do); the fog is a map flag, no entity.
- **Props** (`kind: 'prop'`, `prop`; each on a walkable tile, `solid` as listed):
  `wreck` (a sunk or beached boat's hull, often half in the water beside its tile; solid on the Reach and the Flats,
  not on the Murkway), `marsh-lights` (small lights hanging over the water, animated, never solid; the long
  boardwalk's east end has three until the Brand of Lanterns), `black-barge` (the Unsmith's barge, black, lamps
  dark, big like Hush; solid; Rotbridge until `tamsin-fallen`), `lantern` (the Lantern Mother's lamps, a tall iron
  lamp lit; solid; the Lanternfen's grove edge and the Mother's Hollow), `sleeping-child` (a child asleep, curled on
  the ground in the lamplight; solid; four in the Hollow until the Brand of Lanterns), `crane` (the salvage camp's
  timber crane; solid), `diving-bell` (their diving bell hanging over the canal; solid), `sealed-chest` (the sealed
  chest they pulled up, on their jetty; solid; until `mh-salvage` is beaten), `barge` (a Tallyman barge moored at the
  creek mouth; solid), `bell` (a bell hanging low over the Belfry's flooded aisles; solid), `sleeper` (under the
  Belfry's floor: a shape, and a slow light that comes and goes; not solid, like Hush).
- **Sign looks** (`kind: 'sign'`, `look`): new `ward-stone` (lit, humming), `ward-stone-dark` (dark, the charms
  still; the three dark ones in Willowmurk light up once `wards-mended`), `bootprints` (small bootprints in the mud;
  flat; the Lanternfen, and a lost shoe in the Hollow). Existing: `post`, `stone`, `plaque`.
- **Hearth looks** by id (P5's `HEARTH_LOOKS`): `reed-shrine` (a shrine of bound reeds on a hummock, a lamp in it),
  `willow-hearth` (a fire in the moot-circle's ring of flat stones), `toll-lamp` (a lamp-post by the road),
  `stilt-hearth` (an iron fire-basket on the market deck), `fen-cairn` (a cairn in the bog, cold), `bell-hearth` (a
  fire-bowl at the foot of a dry belfry, cold), `wreck-fire` (a fire-pit in a beached hull, cold), `flats-beacon` (the
  camp's tall iron beacon).

## Per map: ids and places (for P3, P5, P7)

Coordinates are tiles (x,y). Every id below is final; a place may still move by a tile or two in the polish pass (the
module's header comment always names it).
- **murkway**: exits `mk-n` (fen stair, N) and `mk-s` (to Willowmurk, S-E); anchors `from-mossfall` (20,2),
  `from-willowmurk` (38,38). Signs `mk-sign` (23,3; the spec's words), `mk-boundary` (22,8), `mk-tally-post` (33,21),
  `mk-ward-stone` (37,37). Bog: `mk-bog-west` [16,4,18,8] and `mk-bog-east` [23,4,25,7] either side of the path at the
  stair's foot (the e2e bog step: walk off the path at (18,5)), `mk-mire`, `mk-bog-shrine`, `mk-bog-camp`,
  `mk-bog-south`, `mk-bog-end`. Gates `mk-leech-ford` (guard `mk-leeches`), `mk-reed-chain` (guard `mk-reedcutters`).
  Fire `reed-shrine` (25,13). Pack `mk-bogfolk`. Chest `mk-pedlar-cart` (behind the Sucking Mire). Props `mk-wreck`,
  `mk-lights-1`, `mk-lights-2`.
- **willowmurk**: exits `wm-e` (from the Murkway, E), `wm-w` (to Rotbridge, W); anchors `from-murkway` (28,13),
  `from-rotbridge` (1,13). Fire `willow-hearth` (15,10). NPCs `moss` (13,4, at the oldest willow's roots), `sedge`
  (24,6), `wm-villager` (14,20). Gate `wm-ward-gate` (guard `wm-wights` at 4,12). Lock `wm-witch-ward` [1,17,2,17]
  on the side road to `wm-willow` (lair [1,21,3,22]) and its chest `wm-willow-hoard`. Ward-stones `wm-stone-*`
  (eight lit; `wm-stone-sw`, `wm-stone-gate-n`, `wm-stone-gate-s` dark until `wards-mended`, then their `-lit` twins).
  Sign `wm-sign` (28,11).
- **rotbridge**: exits `rb-e` (from Willowmurk), `rb-w` (to Bogmire); anchors `from-willowmurk` (38,13),
  `from-bogmire` (1,13). Fire `toll-lamp` (35,12). Hodge: the NPC `rb-hodge` (`npc: 'hodge'`, 29,12) on his stool
  beside the bar `rb-toll-bar` [28,13,28,14] (no guard; `open` as spec §2.2); his fight `hodge` is placed on his tile
  but never stands on the map by itself (`if: { any: [] }`). Tamsin `tamsin-rotbridge` (11,12, talk
  `tamsin-rotbridge`) beside `rb-far-gate` [11,13,11,14]. Signs `rb-toll-board` (30,15), `rb-carvings` (20,12, in a
  refuge on the bridge), `rb-signpost` (6,12). Pack `rb-gars` (the shallows below the bridge). Prop `rb-black-barge`
  (24,24, until `tamsin-fallen`). Lock `rb-ferry-dock` (13,20) to the islet's chest `rb-islet-cache`.
- **bogmire**: exits `bm-rotbridge` (E road, S-E), `bm-boardwalk` (E), `bm-lanternfen` (N-E), `bm-causeway` (N, gated
  on the Brand of the Deep); anchors `from-rotbridge` (32,22), `from-boardwalk` (32,11), `from-lanternfen` (26,1),
  `from-causeway` (10,1). Fire `stilt-hearth` (17,15), board `bm-board` (14,13). NPCs `gretch` (19,9, the moot-hall
  porch), `nettie` (5,17, her hut of bottles), `pell` (7,25), `bm-watch` (31,10, the boardwalk's head). Signs
  `bm-causeway-sign` (13,3), `bm-boardwalk-sign` (30,9), `bm-closed` (24,16, the closed street into the rotten quarter).
- **lanternfen** (`fog: true`): exits `lf-s` (from Bogmire, S), `lf-n` (to the Hollow, N); anchors `from-bogmire`
  (6,30), `from-hollow` (32,1). Sign `lf-boots` (8,27; the spec's words). Gates `lf-lantern-bough` (guard `lf-moths`),
  `lf-hag-hedge` (guard `lf-hags`). Fire `fen-cairn` (20,16, cold). Lock `lf-witch-ward` [8,15,8,16] to Mother Grue's
  hollow: `grue-hollow` (lair [5,16,6,16]) and `lf-grue-pantry`. Pack `lf-lights`. Bog `lf-bog` to the chest
  `lf-pedlar-pack`. Props `lf-light-1..4` (marsh-lights), `lf-lamp-1`, `lf-lamp-2` (the Lantern Mother's lamps at the
  grove's edge).
- **mothers-hollow** (`dark: true`): exit `hollow-s`; anchor `from-lanternfen` (10,18). Lair `lantern-mother`
  [9,6,11,7]. Props `hollow-lamp-w`, `hollow-lamp-e` (lanterns), `hollow-child-1..4` (sleeping children, until the Brand
  of Lanterns). Lights `hollow-windows-w/e`, `hollow-lamp-*-glow`. Sign `hollow-shoe` (9,13).
- **long-boardwalk**: exits `lb-w` (from Bogmire), `lb-e` (to Misthollow; sealed until the Brand of Lanterns, the
  spec's words and hint); anchors `from-bogmire` (1,8), `from-misthollow` (54,9). Gate `lb-broken-middle` [27,8,27,9]
  (guard `lb-drowned` on the pier at 26,7). Pack `lb-lights` (the fishers' platform). Lock `lb-skiff-dock` (39,3) to
  the skiff's chest `lb-skiff`. Sign `lb-shelter-chalk`. Props `lb-lights-1..3` (the lights at the east end).
- **misthollow** (`fog: true`): exits `mh-w` (from the boardwalk, W), `mh-belfry` (the belltower's stair down, 27-28,5),
  `mh-s` (to the Reach, S); anchors `from-boardwalk` (1,15), `from-belfry` (27,6), `from-reach` (24,30). Fire
  `bell-hearth` (3,10, cold). NPC `corvus` (8,5, the end of his broken pier). Gates `mh-salvage-chain` (guard
  `mh-salvage` at 12,17), `mh-water-gate` (guard `mh-ringers` at 26,26). Props `mh-crane`, `mh-diving-bell`,
  `mh-sealed-chest` (until `mh-salvage` is beaten). Lock `mh-tower-dock` (3,20) to `mh-tower-cache`. Signs
  `mh-lintel`, `mh-salvage-notice`.
- **drowned-belfry** (`dark: true`): exit `db-up` (the stair, S); anchor `from-misthollow` (10,22). Gate
  `db-choir-screen` [9,11,11,11] (guard `db-choir` at 12,11); lair `cantor` [9,4,11,5]. Prop `sleeper` (10,15). Props
  `db-bell-1..4`. Sign `db-plaque` (10,18). Chest `db-alms` (behind the screen). Lights `db-air-1..4`, `db-apse-light`.
- **blackwater-reach**: exits `br-n` (from Misthollow, N-E), `br-w` (to the Flats, W); anchors `from-misthollow`
  (40,1), `from-flats` (1,5). Fire `wreck-fire` (34,4, cold, in a beached hull). Gate `br-barge-chain` (guard
  `br-barge` at 23,4) with the barge `br-barge-hull` (prop). Pack `br-gars`. Lock `br-pond-dock` (12,3) to `old-jaws`
  (lair [11,1,12,2]). Signs `br-milestone`, `br-mill`. Props `br-sunk-boat`, `br-drowned-punt`.
- **tidal-flats**: exit `tf-e` (from the Reach, E); anchor `from-reach` (38,13). Fire `flats-beacon` (25,12). Gate
  `tf-chain-post` [15,13,15,14] (guard `tf-bargemaster` at 15,12); lair `blackwater-leviathan` [1,13,3,14] at the
  chain's end. Bog `tf-soft-mud` to the chest `tf-wreck-hold`. Sign `tf-post-plaque`. Props `tf-wreck-1`, `tf-wreck-2`.
- **causeway**: exits `cw-s` (from Bogmire, S-W), `cw-n` (to the Keep's south-west gate, N-E); anchors
  `from-bogmire` (4,14), `from-keep` (42,1). Signs `cw-mark` (30,6; the spec's words), `cw-milestone` (6,12). Pack
  `cw-lights`. Chest `cw-bundle`.
- **keep-gallery-3**: exit `gal3-w`; anchor `from-gallery-2` (1,4); pedestals `pedestal-<relic>`; plaque `gal3-plaque`.

## Needs from others

All answered (kept for the record):
- **P7 (`ui/world/view.js`):** `GATE_KIND` entries for the eight new gate looks (`toll-bar`, `leech-ford`,
  `ward-gate`, `hung-lanterns`, `hag-fence`, `barge-planks`, `water-gate`, `choir-screen`) and `LOCK_KIND` entries for
  `blackwater` and `witch-ward`. **Landed** (P7), each mapping to P5's sprite of the same name.
- **P5:** the looks, props, sign looks and hearth looks above. **Landed** (every name above has its sprite in
  `art/map-sprites.js`; every biome its tiles in `art/tiles.js`).
- **P7 (e2e-world ids, spec §8):** the fen stair `mf-fen-stair` (Mossfall) onto `murkway`/`from-mossfall` (20,2); a bog
  step: from (20,4) walk west onto `mk-bog-west` (18,5), soft; Willowmurk's `willow-hearth` and `moss`; Hodge's bar
  `rb-toll-bar` with Hodge `rb-hodge` at (29,12) (face him from (30,12) or (29,11)); Tamsin `tamsin-rotbridge` (11,12)
  at `rb-far-gate`; the Lanternfen (fog) from `from-bogmire`; the Lantern Mother `lantern-mother` in `mothers-hollow`;
  the boardwalk's sealed east end `lb-e` (55,8-9, from `from-bogmire` walk the boardwalk east); the Belfry (dark)
  `drowned-belfry`/`from-misthollow`; the causeway `bm-causeway` (Bogmire, 10-11,0) and `cw-n` to the Keep's
  `keep-sw`; performance: the Lanternfen (40x32, roam max 3, the pack `lf-lights`) and the long boardwalk (56x18,
  roam max 3). **Used**: e2e-world 28-39 pass on my private build (below).
- **P3:** every entity id your quest steps target is placed (`willowmurk/moss`, `willowmurk/wm-willow`,
  `rotbridge/hodge`, `rotbridge/tamsin-rotbridge`, `bogmire/gretch`, `bogmire/nettie`, `lanternfen/grue-hollow`,
  `mothers-hollow/lantern-mother`, `misthollow/corvus`, `misthollow/mh-salvage`, `tidal-flats/blackwater-leviathan`).
  Hodge is the NPC `rb-hodge`; the `hodge` encounter never stands on the map by itself, so his talk table always
  plays through the NPC. The walk bot pays through the choice that carries a `price` (not its words). The sleeping
  children leave the Hollow with the Brand of Lanterns (`{ not: { brand } }`, not `children-home`), and the black barge
  leaves Rotbridge with `tamsin-fallen`.
- **Lead:** (1) Tamsin after her fall: **answered** by the encounter-level `leaves` (P4 gave her encounter
  `leaves: { flag: 'tamsin-fallen' }`); `maps.test` now checks that after her fall she and the barge are gone from
  Rotbridge and her gate stands open. (2) Hodge's poster: **answered** by the `{ scout }` effect (P3 put
  `{ scout: 'hodge' }` in his first meeting).

## Where I am
- Read the spec, the M5 P2 notes, the stubs, the rules around gates, locks, talk and fights, and the tests.
- Baseline in the shared tree: `npm test` 397/397 (410 after the lead's rules landed).
- Helpers (scratchpad, not in the repo): `scratchpad/p2/paint.py` (a seeded row painter), `scratchpad/p2/<map>.py`
  (writes `scratchpad/p2/rows/<map>.txt`), `node scratchpad/p2/inject.mjs <map>` (puts the rows into the map
  module), `node scratchpad/p2/check.mjs <map>` (the road test's rules, pockets, placements) .
- All 12 Gloomfen maps drawn (first pass; road test and map tests green). `world.js`: zone backdrops are their
  maps (§2.6); every Gloomfen Hearthfire stand moved to its map. `maps.test.mjs`: `allKeys({ brand: true })` now holds
  the third council and the Gloomfen pair; the story-gates test takes the Gloomfen Brands away before the Act's end
  (the causeway is a back way into the Wilds). The Gloomfen Gallery's header written (no STUB left in my files).
- Tests written: `maps.test.mjs` 38 -> 49 (eleven Gloomfen tests: the ways in and home, reachability x3, no hard lock,
  Hodge's bar and Tamsin's gate, the way home after each Brand, GLOOM_PATH/GLOOM_LEADS, every entity reachable and the
  locks' keys, what spec §2.3 puts on each map, spec §2.2's roads gate by gate, the chests); `road.test.mjs` lists the twelve Gloomfen maps and
  GLOOM_PATH/GLOOM_LEADS (52 pass); `walk.test.mjs` 9 -> 12 (the Gloomfen walk x3: 976 steps, the road held 13
  times, Hodge paid through the choice with a price, home across the causeway, council-4-done).
  `tools/map-draft.mjs` knows the Gloomfen ('all' state, lock short names, biome colours).
- Full suite after that: 441 run, 439 pass; the 2 failures are art-keys (backdrops and foe art keys P6 has not
  drawn yet: expected).
- Polish pass (after the restart): wavy water lines on the Murkway and the Lanternfen; the Misthollow's old city
  redrawn (the old street between the old square's arcades, Bell Street north to the sunken belltower, Gate Street
  south over the Little Canal's bridge to the water-gate, leaning towers, roofless houses, a second belltower, the
  drowned south-east quarter; every id, gate and road as before); five more willows in Willowmurk, and its west exit
  no longer under a canopy; every Gloomfen map's edge closed (only exits open on an edge; before, Rotbridge had 94
  open edge tiles, the Lanternfen 108, the Reach 41, the Flats 37), with each biome's own growth (woods, gorse, a
  tidal creek, the lagoon); more sunk boats down the Reach; mud banks on Rotbridge. The rows are painted by seeded
  scripts (`scratchpad/p2/*.py`, `close_edges()` in `paint.py`).
- `tools/map-draft.mjs`: the Gloomfen biomes draw black water, dark mud and green reeds (they drew sand before).
- Looked at every Gloomfen map in P5's real tiles (`map-draft --png --art`, `scratchpad/p2/art/*-art.png`): the tile
  table reads as meant in every biome.
- After the lead's `leaves` and `{ scout }`: Rotbridge's layout notes say so; `maps.test.mjs` checks that after her
  fall Tamsin and the black barge are gone from Rotbridge and her gate stands open.
- Mutation checks (`scratchpad/p2/mutate.py`, on a scratch copy of the tree, each file restored and sha256-checked):
  29 mutations of my maps, `world.js` and one of P4's `leaves`; all 29 caught. Two needed work: taking a gate off
  its road's list went unseen (the gate still held a guard), so `maps.test.mjs` gained a test: the Gloomfen roads are
  spec §2.2's table gate by gate, and every Gloomfen gate stands on one of its map's roads (49 tests now); and a
  gated exit without `sealed` words is no wall in the rules (only sealed exits hold), so that mutation was rewritten.
- Final numbers (23:20): `npm test` 498/498; `npm run lint` clean; the Gloomfen walk 975 steps, the road held 13
  times (each starter). Private build `scratchpad/m6-builds/p2/aethermoor.html` (the game 2575 KB, paintings
  20303 KB): e2e-world 28-39 on the phone, 81 checks ok, 0 failed, no console errors; PERF phone 39: the Lanternfen
  in thick fog p95 3.20 ms, 11 drawImage; the long boardwalk p95 2.30 ms, 12 drawImage. Shots in
  `scratchpad/m6-builds/p2/shots/`.
- Decided: travel is false only on the Mother's Hollow and the Drowned Belfry (the dungeons), as in M5.
- Decided (Hodge): an NPC entity `rb-hodge` (`npc: 'hodge'`) sits on his stool beside the bar; the `hodge`
  encounter is placed on his tile but never stands on the map on its own (`if: { any: [] }`), because his fight
  starts only from his toll dialogue (`{ fight: 'hodge' }`; the UI's encounterFlow needs no entity).
