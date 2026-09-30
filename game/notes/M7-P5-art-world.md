# M7 P5: the overworld art of the Hearth Below

Package P5 of `docs/M7-SPEC.md` (§6.1). Private copy `scratchpad/m7-p5`, private build `scratchpad/m7-p5/build`. No git
was run. Every look is drawn to P2's tile table and footprints (`notes/M7-P2-maps.md`), and was checked on P2's four maps
as P2 has them now (read from P2's copy; see "Checks").

## Files changed

- `src/art/tiles.js`: the four biomes, and one additive hook in `cell()`.
- `src/art/map-sprites.js`: the gate, props, signs, Hearthfires, map foes and the Unsmith's face.
- `src/art/walkers.js`: two additive rig options.
- `tools/gallery-entry.js`: scenes and keys.
- `test/world-art.test.mjs`: six tests added.

## Tiles: `council`, `hearth-roots`, `chains`, `worldforge`

All four are in `BIOMES`. Each is a `BELOW_PAL` row over the shared bases, with its own spec (`BELOW_SPECS`). No new tile
character; `ash` and `forge` stay Scorchgate's and Harrow's Forge's.

| char | `council` (Hollow Hall) | `hearth-roots` (Ash Stair) | `chains` (Chained Deep) | `worldforge` |
|---|---|---|---|---|
| `.` | worn First-Age stone | flat grey rock, ash drifted on it in ripples, bare rock showing | fused black slag (one facet field, no grid) | iron plates |
| `,` | soot heaps on the flagstones | little drifts of ash, a cinder in one | slag chips, a broken link | iron scale and a spark |
| `:` | the nave's big old flagstones, soot in the joints | - | dark basalt paving bound with iron straps | hammered stone: slabs pocked with the hammer's marks |
| `_` | inlaid dressed stone (the daises, the stair's foot) | - | - | the forge floor: riveted black iron plates |
| `k` | the bays: the same flagstones, darker | soot-black floor, an ember in it | the cavern floor, dark slag | soot-black stone (one field, no grid) |
| `m` | - | deep drifted ash (drift edges) | - | - |
| `i` | - | ember veins glowing (2 frames) | - | - |
| `f` | - | - | red cracks glowing in the slag (2 frames) | - |
| `s` | worn steps, a dim red glow under each nose | rough-cut grey steps, ash on every tread | fused steps | - |
| `=` | - | - | the walkway: riveted iron plates | the walkway: iron plates |
| `b` | - | - | - | iron plates across the moat |
| `+` | - | - | the great door standing open, red-gold light spilling from the east | the iron door, leaves folded back |
| `#` | dark granite ashlar, a frieze, carved hearth-flames on some blocks | raw grey rock, ember in its cracks | raw fused rock, red in its cracks | rock plated with riveted iron, firebrick courses at its foot |
| `*` | bronze braziers burning low (2 frames) | ember seams (2 frames) | - | fire-vents (2 frames) |
| `Y` | massive fluted pillars, capitals overhead | the hearth's iron roots: twisted cables along the mass | the great chains (below) | a chain from the dark on a hook, a broken blade or a split shield on it |
| `R` | the round council table (below) | - | the hearth's iron roots coming down the rock | - |
| `o` | - | fallen grey rock | heaped slag; a stake at the rim; a lone lump | heaps of slag |
| `t` | - | - | - | racks of giant tongs and hammers |
| `\|` | - | - | the low chain rail | - |
| `^` | - | the drop's broken lip | the hollow's rim, red in its cracks | - |
| `x` | - | the drop: black, a red glow breathing up through it | the hollow and the tunnels: black, a fainter red | - |
| `~` | - | - | - | molten metal: orange, brighter streaks, crust rafts (2 frames) |

Characters P2 does not use in a place are still drawn (fallbacks in the same style).

### The tiles that read their neighbours

`cell()` now passes a spec that asks for it a context `{ x, y, at(dx, dy) }` as `pickV`'s fourth argument. A spec's
`runs` may give its own cap: `true` is 6, as before. No older spec asks, so older atlases are unchanged (pinned).

- **Steps (`s`), all four places:**
  - The treads lie east-west when the flight goes north-south, and stand upright when it goes east-west.
  - A long flight (more than 4 more step tiles through the tile) follows its longer run.
  - A short one goes the way its ends open onto walkable ground or off the map. The Deep's 3x1 steps down off the
    walkway, between the rail, lie across.
- **The Deep's great chains (`Y`):**
  - Each tile finds its band's principal axis within two tiles, in one of 4 directions (east-west, NW-SE, north-south,
    NE-SW).
  - It also finds how far off that line it lies, in 5 steps of 4 px, and which link is its own (ring, then bar, in turn).
    That makes 40 cells.
  - So each band carries one continuous chain of cart-sized links over the heaped slag. A 2-wide band carries it down
    the line between its columns.
  - On P2's map the three chains run unbroken from the Sleeper's sprite to the tunnels.
- **The council table (`R`):**
  - The table is drawn a ninth to a tile, 16 cells keyed by which sides the table goes on.
  - P2's 3x3 block is one round slab on the flagstones: rings cut in its top, a hearth-flame at its heart with the
    hollow light faint in the groove, its carved edge and shadow.
  - The Hall's `R` draws no rock rim.
- **Heaps (`o`) in the Deep:**
  - Next to another `o`: one lumpy slag field.
  - Alone at the hollow's rim: an iron stake with the web's chain made fast to it.
  - Alone elsewhere: a lump.
- **Doors (`+`) in the Deep and the forge:** the tiles stack north-south in an east or west edge. The leaves stand
  folded at the stack's ends.

New material: `w.greyrock` (the Ash Stair's rock).

My own M7 ramps were recoloured:
- `w.ironroot` is now a cooler black iron.
- `w.sleeperhide` is dark stone.

## Props, gate, signs, Hearthfires (`art/map-sprites.js`)

**Big props.** Each is one sprite, drawn once at its `at` (placement for P2 below).

| key | size | foot | drawn |
|---|---|---|---|
| `sleeper-first` | 240x152 | [120, 107], **44 px above its bottom edge** (`FOOT_UP`) | the First Sleeper, 2 frames (below) |
| `worldforge` | 112x240 | [56, 239] | the Worldforge, 2 frames (below) |
| `great-anvil` | 48x40 | [24, 39] | black iron on a firebrick plinth, a bar glowing on its face, sparks (2 frames) |

- **The First Sleeper:**
  - A vast beast of dark stone and old ember, curled, its great head laid low on a forelimb. One long eye is shut under
    a heavy brow.
  - Its heart glows through its flank and pulses between the two frames. Faint ember seams run across its back.
  - The hearth's three black iron roots come down into its back, with embers where they go in.
  - A web of seven great chains is made fast at the rim. The long one down its back runs out of its bottom edge into
    the middle chain band; two leave by its lower corners into the south-west and south-east bands.
- **The Worldforge:**
  - A heart of riveted black iron over firebrick, its point set in a firebrick pedestal, a flue up out of its cleft,
    vents glowing.
  - Its mouth is low on the west side, a firebrick arch blazing white-gold, with fire licking out west over the step.
  - Molten channels run out of the pedestal to the south, and from the west lobe north into P2's channel.
- **The small props and the gate:**
  - `vault-stair`: steps down through the vault floor, the hollow light far down.
  - `vault-boxes` and `vault-boxes-open`: two soot-sealed boxes per tile; opened, the lids stand back and the soot lies
    broken.
  - The gate look `hollow-gate` (16x24):
    - Shut, it is a line of soot with a violet-black curtain of light standing out of it, shimmering (2 frames).
    - Open, only the soot is left, scuffed.
- **Sign looks:**
  - `chain`: a great chain made fast in a block of slag.
  - `chair-tree`, `chair-sun`, `chair-anvil`, `chair-lantern` (24x32): great stone chairs on their daises. Each back
    is carved with its region's mark, and violet-black light clings to the seat.
  - `heart-step`: a firebrick step with an iron nosing.
- **Hearthfires:** `HEARTH_LOOKS['under-coal'] = 'undercoal'` and `['chain-fire'] = 'chainfire'`.
  - `undercoal` (28x28): a faceted lump of coal, glossy like anthracite, the hearth's iron roots gripping it from
    behind. Lit, fire lives in its cracks and licks up out of them. Cold, the cracks are dead and ash lies on its
    shoulders.
  - `chainfire` (16x32): an iron brazier hung crooked from a chain, its other chain broken.
- **Dropped:** the `council-table` prop, since P2 draws the table with `R` tiles.

## Walkers (`art/map-sprites.js`, `art/walkers.js`)

**Kits (walker rig), one per gear tier:**
- `cinder-thrall`:
  - Ash made to walk: a coal for a heart (the ember at the chest) and amber eyes in a dark face.
  - By tier: fire in its cracks (1), a slag maul (2), a slag helm with ember eyes (3).
- `thrall-overseer`:
  - A bigger thrall with a coil of hot wire slung over it and a goad of hot iron.
  - P4's variant carries `art: 'thrall-overseer'`, and `BELOW_VARIANT` also maps `cinder-thrall:thrall-overseer`.
- `unmade`: grey hooded husks, pale eyes, each holding the glowing ghost of its relic (a blade, a spear, a blade and a
  shield, a staff, by tier).
- The Hollow Council (`hollow-miravel`, `hollow-qasim`, `hollow-brundar`, `hollow-gretch`):
  - The same folk as their town looks, gone grey, with violet eyes.
  - Each wears their gift, glowing violet-black: the Hollow Wreath (a thorned circlet), the Hollow Chalice (held up,
    light over its rim), the Hollow Gauntlet, the Hollow Chain (at the chest and slung across).
  - With `relic: null` the gift is gone.
  - They use `own: true`, so the map shows these 16 px looks whatever item art P6 gives the relics.

**Drawn whole (like the Rime Abbot):**
- `forge-warden` (24x32): a bellows-and-anvil construct. An anvil body on iron legs, coal eyes under the anvil's face,
  a fire behind a chest grate, chain arms with anvil-block fists, and a bellows on its back that breathes and blows
  sparks.
- `unsmith` (32x48):
  - Harrow Ironvein: tall, a tarred boatman's cloak over the Ironvein Apron (leather veined with iron).
  - Copper hair and beard, grey at the temples; the clasp at his throat, a hammer in a broken ring.
  - The Worldforge Heart glows on his left hand. The Unmaking Hammer, its head edged violet-black, is in his right;
    it is gone with `relic: null`.
  - His lair plays P6's battle art in the game, so this sprite serves any non-lair use and the gallery.

**`NPC_LOOKS.unsmith` (the lead's request):**
- His face for his lines, as the Lantern Mother got in M6.
- The same man as his map sprite and Hilda's twin: copper hair cropped and grey at the temples, copper beard,
  boatman's cloak (`w.boatcloak`), leather apron, a bronze clasp at the throat, the hammer with its violet-black band.
- It differs from the entry in P6's notes in two ways, so it renders the same with or without P6's `m7.` materials and
  item art:
  - my `w.boatcloak` in place of `m7.boatcloak`;
  - rig looks in place of the relic ids `ironvein-apron` and `unmaking-hammer`.
- Tested: his own look, his sister's hair, a 48x96 sheet.

**`walkers.js`, two additive rig options:**
- the off-hand focus `{ look: 'chalice', metal, glow }`;
- `H.temples` (grey at the temples).

Neither changes any existing look.

## Gallery (`tools/gallery-entry.js`)

- The four M7 scenes are now cut from P2's own maps, so they show the real character mixes.
- `MAP_FOE_KEYS` gains the seven kits. The whole sprites come in through `MAP_FOE_SIZE`; objects, signs and hearths
  through `OBJECT_KINDS`, `OBJECT_STATES` and `HEARTH_LOOKS`.
- `world-perf` gains three lines:
  - M7 kit sheets;
  - the two whole walkers;
  - the two big props, cold.

I looked at `world-tiles` (the four biomes), `world-foes`, `world-objects` and `world-npcs`.

## Tests: 541 before, 547 now (all pass); `npm run lint` clean

**Added, in `test/world-art.test.mjs`:**
1. **The Hearth Below's four biomes draw every tile id, still and animated.** `ash` and `forge` stay their own places.
2. **Every cell of every Act III map composes in its Hearth Below biome, in both frames.** Each map is composed in its
   M7 biome whatever its `biome` field says now.
3. **The steps follow their flight, the great chains their band, and the council table is drawn a ninth to a tile.**
   - A long east flight is upright, a south one is across.
   - The Deep's 3x1 steps lie across.
   - A south-west band's chain is diagonal.
   - A 2-wide north-south band carries one chain on the line between its columns.
   - The 3x3 table is nine different cells with no rim.
4. **The gate, props, signs and Hearthfires are drawn, to their footprints.**
   - The gate is 16x24 and shimmers, and open it is only soot.
   - Each big prop's size and foot, 2 frames, and it fills its footprint.
   - The vault props, and the boxes open.
   - The six sign looks are each drawn, and each is its own.
   - The two Hearthfire looks.
   - Every gate, prop, sign and Hearthfire the Act III maps and the keep hall name is drawn.
5. **The foes walk as their own sprites; the Council and the Unsmith carry their gifts until taken.**
   - Each of the eight keys is a kit or a whole sprite at every gear tier.
   - The sizes 24x32 and 32x48.
   - The thralls change by tier, and the overseer is drawn apart.
   - Each gift is worn by default and when named, and gone with `relic: null`.
   - The Unsmith has his own face.
   - The Council differ from their town looks.
6. **The M6 overworld art is pixel for pixel as it shipped.**
   - It pins the Gloomfen's ten atlases (with the M3-M5 test's grid), the M6 NPCs, the M6 foes at every gear tier and
     without their relics, the M6 props and gate looks in both frames, the three M6 signs and the eight M6 Hearthfires.
   - The digests were taken from the lead's base art (`/home/user/New-game/game/src`, untouched by M7), and my tree
     gives the same.

**Changed:** no assertion. The file's header comment gained two lines naming the M7 checks.

## Checks

- **The M3-M6 art is unchanged.**
  - The pinned M3-M5 test passes, and so does the new M6 test.
  - A private hash of the 517 looks the base draws finds no change, except `variant cinder-thrall/thrall-overseer`.
    That is an M7 key: the scaffold drew it as the forge-spark.
- **P2's maps in my art:**
  - My copy's Act III maps are still the scaffold's stubs, and `tools/map-shots.mjs` needs P2's maps in my copy, so it
    could not show them.
  - Instead, a private review page composed P2's four maps as they are now, read from P2's copy. It uses the same
    `atlas.cell()` and `objectSprite()` foot placement the view uses, in my biomes, with every prop, gate, sign,
    Hearthfire and chest at P2's positions and the Council at their gates.
  - I looked at all four, whole and zoomed. What I fixed from that review:
    - stairs that ran the wrong way;
    - a row of stakes;
    - the forge floor's grating;
    - the hot void;
    - the chains' posts.
  - The view reads a prop's `anchors.foot` (`ui/world/view.js objSprite`), so the Sleeper's raised foot places it as
    drawn.
- **Performance:**
  - The atlas medians (gallery `world-perf`) are all under the 150 ms budget. The slowest is `chains` at 142 ms, with
    its 40 chain cells; `hearth-roots` is 88 ms, and `council` and `worldforge` are under 81 ms.
  - The M7 kit sheets build in about 4 ms cold, and the two whole walkers in about 11 ms.
  - The big props are one `drawImage` each, placed with `at`. Their cold build is the costly part. In the browser the
    Sleeper and the Worldforge took a median of about 110 ms a frame across their four frames (in node the Sleeper is
    150-600 ms a frame).
  - Each frame is built once, when the map is baked, and then cached.
- **Build:**
  - `node tools/build.mjs --out=scratchpad/m7-p5/build` succeeds.
  - It warns: the game is 2714 KB, over the 2.5 MB warning line; the build fails above 3.2 MB.
  - P5 adds about 140 KB of source; the build strips whitespace and comments, so less goes into the file.

## Stand-ins

None. I added no `STUB (M7 P5)`, and no scaffold stub is left in my files.

## Requests to other packages

- **P2, or the lead at the merge:**
  - Switch the four maps' `biome`s as P2's notes list: `council`, `hearth-roots`, `chains`, `worldforge`. They are now
    in `BIOMES`.
  - **Placements.** They are drawn to the footprints P2 gave, so no change is needed:
    - `sleeper-first` at (20,15) fills the hollow (x 13-28, rows 9-18): tiles x 13-27, rows 9.25-18.75.
    - `worldforge` at (32,18) fills tiles x 29-35, rows 4-18. Its mouth, rows 10.3-13.4, faces west at the recess
      and the heart's step (30,11). Its north channel meets the `~` at (30-31,3).
    - `great-anvil` at (25,7) stands over tiles x 24-26, rows 5.5-7.9 (P2's footing is x 24-26, rows 6-7).
  - Optional: the furnace's south channel ends at the sprite's foot (row 18). Making (31,19) and (32,19) `~` would join
    it to the channel at row 20.
  - Optional: until batch 4 is painted, the chairs could take `chair-tree`, `chair-sun`, `chair-anvil` and
    `chair-lantern` in place of `throne`. Those are great stone chairs with their marks and the violet-black light on
    the seat; `throne` is the Thane's black chair with a red cushion. The heart could take `heart-step` in place of
    `altar`.
  - Optional: `cd-chain-gate` ("a length of great chain hangs across it") could take the existing gate look `chain`.
- **P7:** in `ui/world/view.js`, add `GATE_KIND['hollow-gate'] = 'hollow-gate'`. Until then the Hollow Hall's four soot
  lines draw as plain gates.

## For the lead to decide

1. **The Sleeper's foot is 44 px above its bottom edge** (`FOOT_UP`, the only one), so that P2's `at` (20,15) centres it
   in its hollow. The alternative is a bottom foot and `at` (20,17).
2. **The big props' cold build.** Entering the Chained Deep builds the Sleeper's two frames, about 0.2-0.3 s in the
   browser. If that shows as a hitch, they could be built during the map's fade.
3. **The size warning.** The game is 2714 KB, over 2.5 MB. The other packages will add to it before the 3.2 MB limit.
4. **The chairs and the heart:** `throne` and `altar` (as P2 left them), or my looks (above).
