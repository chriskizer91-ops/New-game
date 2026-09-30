# M7 P2 maps: the Hearth Below

Package P2 of `docs/M7-SPEC.md` (§2, and the maps parts of §8). No git was run. Private copy `scratchpad/m7-p2`, work
folder (generators, checks, shots; not in the repo) `scratchpad/m7-p2-work`, private build `scratchpad/m7-p2/build`.

Status: **done.** `npm test` 545 tests: 544 pass, and 1 fails as spec §7 allows (art-keys: the four new backdrop ids,
which P6 paints). `npm run lint` is clean. The private build succeeds. The Act III walk passes for all three
starters, and the frame times are within the target. The details are below.

## What I built

- **The four maps**, replacing the scaffold's stubs, at the spec's sizes and laid out as batch 4 describes them
  (`art-requests/batch-4/places.md`), so the tiles and the paintings agree on where the ways in, the road and the ways
  on go. Each module's header says where everything is and what each tile character means there.
  - **hollow-hall** (36x24): the stair from the vault comes down at the south-west (`hh-up` is the whole flight,
    2-4 x 18-23, so a step onto it meets the ash at once; `from-vault` is its foot, 3,17). The nave (rows 10-14, five
    wide) runs east the whole hall between two rows of pillars (rows 9 and 15). Four bays behind the pillars hold the
    chairs on their daises, alternating sides: the tree (8,4, N), the sun (13,20, S), the anvil (18,4, N) and the
    lantern (23,20, S). A bay opens onto the nave only through the gap in front of its chair. Before each chair a soot
    line crosses the nave (`hh-gate-1` to `-4`, look `hollow-gate`; 4 tiles), and its owner stands at the line's end
    on the chair's side, facing the stair: Miravel (8,10), Qasim (13,14), Brundar (18,10), Gretch (23,14). The line
    and its keeper close the nave together, and the one gap into each bay is the keeper's tile, so no bay is a way
    round. At the east end the nave opens into a round apse (x 26-34, rows 7-17). The First-Age table stands in it
    (28-30 x 11-13; `R`), and the nave passes round it. Beyond it, by the east wall, the stair goes down (`hh-down`,
    32-34 x 11-13), with `from-ash` at its head (31,12). The alms chest is in an alcove in the north wall past the
    fourth chair (28,5).
  - **ash-stair** (24x36): the stair is 4 wide, made of `s` steps. It comes in at the top edge, left of centre
    (`as-up`, 7-10 x 0; `from-hall` 8,1), and runs east along the north wall to the first landing (x 12-21, rows
    5-10). There the Under-Coal lies cold in its niche in the east wall (22,7; stand 21,7 facing east). Below the
    landing is the narrows: three wide between two iron roots (17-19 x 11-13). The thralls stand in it (18,11,
    facing north) and hold `as-ash-gate` behind them (row 12). The stair then goes down the east wall and west across
    the shaft to the middle landing (x 1-10, rows 15-22). From there a one-wide ledge runs north up the west wall
    (x 1, rows 9-14) to a flat spot with the cache (1,6). The stair goes on down the west wall, then east to the lower
    landing (x 12-21, rows 25-31), and out at the bottom edge (`as-down`, 14-17 x 35; `from-deep` 15,34). The open
    drop (`x`) lies in the middle, in two pieces between the runs. The zone's roam rects are the two landings, and
    the pack `as-patrol` is at home on the middle one (6,19). Patrols never roam stair tiles, so each landing is an
    island: no patrol reaches the stair, the narrows or an exit (tested).
  - **chained-deep** (42x28): the stair comes in at the north-west corner (`cd-up`, 1-4 x 0; `from-stair` 2,3). The
    walkway of iron plates (`=`, rows 3-6, four wide) runs east along the top over the hollow, with the chain rail
    (`|`, row 7) on its lower side. Halfway along, a spur of rock and the hollow's rim squeeze it to three (16-19 x
    4-6). The unmade stand there (17,5, facing west) and hold `cd-chain-gate` (x 18). Past it, the Chain Fire burns
    on a round platform in a nook on the north side (25,1; stand 25,2). The walkway then bends down (x 32-35) to the
    paving before the forge door in the middle of the east edge (`cd-forge`, 41 x 12-15; `from-forge` 40,13). Tamsin
    waits on the paving (37,13). The hollow (x 13-28, rows 9-18, with its rim) holds `sleeper-first`: one large solid
    prop at its foot (20,15). Three great chains (`Y`) run from the hollow to tunnels at the south-west corner, the
    middle of the south edge and the south-east corner. The heaped slag between them (`o`) is solid, as batch 4 says.
    The cavern floor west of the hollow is reached by steps down from the walkway before the narrows (8-10 x 7). The
    floor east of it opens off the paving. The two floors never meet (tested).
  - **worldforge** (36x24): the iron door is in the middle of the west edge (`wf-out`, 0 x 10-12; `from-deep` 1,11).
    A walkway leads from it to the bridge. The molten moat (`~`, x 11-13) runs from the north edge to the south, and
    the bridge (`b`, 3 wide) crosses it in line with the door. The forge-warden stands at the bridge's near end
    (10,11) and holds `wf-bridge-gate` (x 11). The forge floor lies beyond, with molten channels along its north and
    south edges from the furnace to the moat. The Worldforge stands against the east wall: one large solid prop,
    `worldforge`, at its foot (32,18); the firebrick mass round it is x 29-35, rows 4-19, with its mouth to the west
    at rows 11-12. Before it is the smith's place (x 23-28, rows 9-14), with the great anvil to its north (prop
    `great-anvil` at 25,7, on heaped slag, 24-26 x 6-7). The Unsmith's lair is 26-28 x 11-12, his foot at 27,12, and
    it is the finale. The heart's step (`wf-heart`, 30,11, look `altar`) is in the recess before the furnace's
    mouth, directly behind him: nobody reaches it while he stands (tested).
- **`data/world.js`:**
  - The two Hearthfire stands: `under-coal` at (21,7), facing east into its niche, and `chain-fire` at (25,2).
  - `ZONES['ash-stair']` now fights on its own backdrop, `ash-stair` (spec §2.6).
  - The scaffold's stub marks are gone. `REGIONS.below`, `ACT3_PATH` and `ACT3_LEADS` are as the scaffold wrote
    them, which is the spec.
- **`data/maps/keep-hall.js`** (§2.4, A5; no row changed, so the painting's stamp still holds):
  - The exit `hall-down`, the anchor `from-below` and the props `vault-stair`, `vault-boxes` and `vault-boxes-open`
    were checked against §2.4 and A5, and all match.
  - `hall-down` now has its final sealed words, replacing the scaffold's draft: "The vault floor is old stone, and
    cold air comes up between the slabs. It smells of ash." Its hint is "The floor opens once the Council has sat a
    fifth time." (the same form as the other councils' gates).
  - P3's `council-5` trigger is untouched, and it is a separate hunk from mine.
- **`data/tiles.js`:** no new tile character (see "Decisions"). Its header now says why, and points here for the four
  biomes' looks.
- **`data/maps/index.js`:** the format note now states the one-draw rule for large props. The four maps were already
  registered.
- **`tools/map-draft.mjs`:**
  - The PNG draft no longer crashes on a prop that has only an `area`. The Great Hall's vault props broke it.
  - The four Act III biomes get draft colours: the Council's violet-grey, grey ash, black slag with a red glow under
    `x`, and molten orange for the Worldforge's `~`.
  - New option `--biome=<id>` draws a map as if it were another biome, to preview a stand-in or the real biome once
    P5's tiles land (`node tools/map-draft.mjs worldforge --png --art --biome=worldforge`).

## Tile characters in the four Act III biomes (for P5, overworld art)

**There is no new tile character.** Every Act III map uses the legend in `data/tiles.js` as it is, as M5 and M6 did.
Solidity comes from the legend and never changes by biome:
- **Walkable:** `.` `,` `"` `=` `:` `_` `m` `r` `k` `f` (animated) `w` (animated) `b` `i` (animated), and `+` and `s`
  (never roamed).
- **Solid:** `T` `t` `Y` `R` `o` `#` `H` `|` `*` (animated) `~` (animated) `^` `x`.

The brief's "pillar, chair, drop, molten metal, chain, slag, iron plate" are these characters in these biomes (a `-`
means the biome does not use the character):

| char | `council` (the Hollow Hall) | `hearth-roots` (the Ash Stair) | `chains` (the Chained Deep) | `worldforge` (the Worldforge) |
|---|---|---|---|---|
| `.` | - | the landings, the ledge and the flat spot: flat rock with grey ash drifted on it like snow | - | - |
| `,` | cold ash and dust drifted on the flagstones | ash drifts | - | cinders and scale on the floor |
| `m` | - | deep drifted ash | - | - |
| `:` | the nave: big old flagstones, dark grey granite with a violet cast | - | the paving before the forge door; the Chain Fire's round platform | hammered stone: the smith's place, the heart's step |
| `_` | the daises the chairs stand on; the floor at the foot of the stair in | - | - | the forge floor: black iron plates, riveted |
| `k` | the bays behind the pillars: darker flagstones in shadow | the Under-Coal's niche floor | the cavern floor: fused black slag | the near floor, before the moat: soot-black stone |
| `i` | - | ember veins glowing through the rock floor (animated) | - | - |
| `f` | - | - | red cracks glowing in the slag (animated) | - |
| `s` | the stairs: worn steps up to the vault; broad steps down into a red glow | **the stair itself**: broad rough-cut steps with ash on every step, in long runs both north-south and east-west (the treads should follow the run: a run 4 tall going east has its treads upright) | the stair in from the Ash Stair; the steps down from the walkway to the floor | - |
| `=` | - | - | the walkway: old iron plates riveted into the slag | the walkway in from the door: iron plates |
| `b` | - | - | - | the iron bridge over the moat |
| `+` | - | - | the forge door: a great iron door standing open, red-gold light spilling out | the iron door in from the Chained Deep |
| `#` | the hall's walls: dark granite carved with worn hearth-flames and the four regions' marks | the shaft's grey rock | the cavern's rock walls | rock plated with black iron; firebrick round the furnace |
| `*` | braziers burning low along the walls (animated) | seams of glowing ember in the rock (animated) | - | fire-vents in the walls (animated) |
| `Y` | the two rows of massive pillars along the nave | the hearth's black iron roots, thick as towers | the great chains (links the size of carts), from the hollow to the tunnels; their grain should follow the run, as the Gloomfen's chain `r` does | chains and hooks hung with broken relics |
| `R` | the round First-Age council table: one slab of carved stone, a hearth-flame cut in its top (3x3) | - | the Eternal Hearth's black iron roots coming down the walls | - |
| `o` | - | fallen rock | heaped slag between the chains; the web's stakes | heaps of slag (and the great anvil's footing) |
| `t` | - | - | - | racks of giant tongs and hammers |
| `\|` | - | - | the low chain rail on the walkway's lower side | - |
| `^` | - | the drop's broken lip | the rim of the Sleeper's hollow | - |
| `x` | - | the open drop, glowing red from far below | the hollow round the Sleeper, and the tunnels' mouths (dark, a red glow from the Sleeper's heart) | - |
| `~` | - | - | - | molten metal: the moat and the channels (animated, glowing) |

**Until P5's tiles land, each map draws in a stand-in biome** (see "Decisions"). The stand-ins:
- the Hollow Hall uses `dwarf-hall` (Ironhold: its `Y` pillars read as columns, `*` braziers, and `_` a red runner on
  the daises);
- the Ash Stair uses `ash` (Scorchgate: `.` is grey ash ground, and `s` stairs);
- the Chained Deep and the Worldforge use `forge` (Harrow's Forge: soot, slag, brick and iron rails; its `~` is still
  water and its `Y` still anvils, until the real biomes land).

If P5 leaves a character undrawn in a new biome, it falls back to the base look, as the M6 biomes did (`specOf`).

## Looks the maps use (for P5, P7 and P6)

- **Props** (`kind: 'prop'`, `prop`):
  - A large prop is one entity at its sprite's foot (`at`) and is drawn once (M6's rule: the view draws a prop on
    every tile of an `area`). The tiles beside and above its foot are solid (tested).
  - `sleeper-first` (chained-deep): the First Sleeper curled in its hollow under the web of chains, the Eternal
    Hearth's roots in its back. Foot (20,15). The hollow round it is x 13-28, rows 9-18 (256x160 px), so a sprite of
    about 240x150 with its foot near its bottom middle fills it.
  - `worldforge` (worldforge): the heart-shaped furnace of black iron and firebrick. Foot (32,18). Its mass is x
    29-35, rows 4-19, with its mouth at rows 11-12 facing west.
  - `great-anvil` (worldforge): the great anvil, the size of a cart. Foot (25,7). Its footing is x 24-26, rows 6-7.
  - `vault-stair`, `vault-boxes`, `vault-boxes-open` (keep-hall): each is drawn on every tile of its two-tile area, as
    the scaffold placed them.
  - Until P5 draws them, all six draw the view's fallback for an unknown kind (a signpost).
- **Gate look** `hollow-gate` (the four soot lines across the nave; each is a vertical line of 4 tiles): P5 draws it,
  and P7 must map it in `ui/world/view.js` `GATE_KIND`. Until then the view draws the plain `gate`.
- **Sign looks:**
  - `chain`: the three chain signs. P5 draws it; until then a signpost.
  - `throne`: the four chairs. It exists already, and they keep it until batch 4's painting lands (then `painted`,
    spec §2.3).
  - `altar`: the Worldforge's heart. It exists already, and the heart keeps it until painted (then `painted`).
- **Hearth looks** by id: `under-coal` is `undercoal` and `chain-fire` is `chainfire` (P5's `HEARTH_LOOKS`).
- **Backdrops** (P6): each map fights on its own. The maps name `hollow-hall`, `ash-stair`, `chained-deep` and
  `worldforge`, and the zone `ash-stair` names `ash-stair`.

## Per map: ids and places (for P3, P4 and P7)

Coordinates are tiles (x,y). Every id is the spec's; the batch-4 tracing may move places, but not ids or roles.
- **hollow-hall:** `hh-up` [2,18,4,23] (gated, sealed; the spec's words), `hh-down` [32,11,34,13]; anchors
  `from-vault` (3,17,n), `from-ash` (31,12,w). Gates `hh-gate-1` [8,11,8,14], `hh-gate-2` [13,10,13,13], `hh-gate-3`
  [18,11,18,14], `hh-gate-4` [23,10,23,13]; blocks `hollow-miravel` (8,10), `hollow-qasim` (13,14), `hollow-brundar`
  (18,10), `hollow-gretch` (23,14), all facing west. Chairs `hh-chair-verdant` (8,4), `hh-chair-sunscorch` (13,20),
  `hh-chair-ironspire` (18,4), `hh-chair-gloomfen` (23,20). Chest `hh-alms` (28,5). `travel: false`, so the Atlas
  cannot lift the party out mid-Council.
- **ash-stair:** `as-up` [7,0,10,0], `as-down` [14,35,17,35]; anchors `from-hall` (8,1,s), `from-deep` (15,34,n).
  Fire `under-coal` (22,7; stand 21,7,e; cold). Gate `as-ash-gate` [17,12,19,12]; block `as-thralls` (18,11,n). Pack
  `as-patrol` (6,19). Chest `as-cache` (1,6). Roam rects [1,15,10,22] and [12,25,21,31], max 3. `travel: true`.
- **chained-deep:** `cd-up` [1,0,4,0], `cd-forge` [41,12,41,15]; anchors `from-stair` (2,3,s), `from-forge`
  (40,13,w). Gate `cd-chain-gate` [18,4,18,6]; block `cd-unmade` (17,5,w). Fire `chain-fire` (25,1; stand 25,2,n).
  Prop `sleeper-first` (20,15). Signs `cd-chain-lull` (9,21), `cd-chain-ash` (21,7), `cd-chain-hush` (34,22). NPC
  `cd-tamsin` (37,13,w; `if: { not: { flag: 'tamsin-returned' } }`). `travel: true`.
- **worldforge:** `wf-out` [0,10,0,12]; anchor `from-deep` (1,11,e). Gate `wf-bridge-gate` [11,10,11,12]; block
  `wf-warden` (10,11,w). Lair `unsmith` (27,12) [26,11,28,12], the finale. Sign `wf-heart` (30,11; `talk:
  'the-heart'`, `talkIf: { beaten: 'unsmith' }`). Props `wf-furnace` (32,18), `wf-anvil` (25,7). `travel: false`.
- **keep-hall:** `hall-down` [21,8,22,8] (gated on `council-5-done`, sealed; words above), anchor `from-below`
  (21,7,w), props `vault-boxes` / `vault-boxes-open` [21,6,22,6] (solid) and `vault-stair` [21,8,22,8] (not solid).

**What moved from the scaffold** (for P7's e2e steps, which were written against the stubs). Prefer the map data
(`__worldTools.standBy`, anchors) to coordinates. Written as scaffold -> now; ids and roles are unchanged.
- **hollow-hall:**
  - gates: `hh-gate-1` [6,11,6,14] -> [8,11,8,14], `hh-gate-3` [20,11,20,14] -> [18,11,18,14], `hh-gate-4`
    [27,10,27,13] -> [23,10,23,13];
  - keepers: Miravel (6,10) -> (8,10), Brundar (20,10) -> (18,10), Gretch (27,14) -> (23,14);
  - chairs: (9,5) -> (8,4), (17,19) -> (13,20), (24,5) -> (18,4), (31,19) -> (23,20);
  - `hh-alms` (33,7) -> (28,5);
  - exits: `hh-up` [2,23,3,23] -> [2,18,4,23], `hh-down` [35,11,35,13] -> [32,11,34,13];
  - anchors: `from-vault` (2,22) -> (3,17), `from-ash` (34,12) -> (31,12).
- **ash-stair:**
  - `under-coal` (21,6) with stand (21,7,n) -> (22,7) with stand (21,7,e);
  - `as-ash-gate` [19,12,21,12] -> [17,12,19,12], `as-thralls` (20,11) -> (18,11), `as-patrol` (5,19) -> (6,19),
    `as-cache` (1,14) -> (1,6);
  - exits: `as-up` [8,0,9,0] -> [7,0,10,0], `as-down` [19,35,20,35] -> [14,35,17,35];
  - anchor `from-deep` (19,34) -> (15,34);
  - roam rects -> [1,15,10,22] and [12,25,21,31].
- **chained-deep:**
  - `cd-chain-gate` [19,4,19,6] -> [18,4,18,6], `cd-unmade` (18,5) -> (17,5);
  - `chain-fire` (26,1) with stand (26,2) -> (25,1) with stand (25,2);
  - `sleeper-first` [14,12,23,18] (an area) -> `at` (20,15);
  - chain signs: (4,25) -> (9,21), (21,25) -> (21,7), (31,25) -> (34,22);
  - `cd-tamsin` (38,15) -> (37,13);
  - exits: `cd-up` [2,0,3,0] -> [1,0,4,0], `cd-forge` [41,13,41,14] -> [41,12,41,15];
  - anchor `from-stair` (2,1) -> (2,3).
- **worldforge:** `wf-out` [0,11,0,12] -> [0,10,0,12], and the props `wf-furnace` and `wf-anvil` are new. Everything
  else is where the scaffold put it: the bridge gate, the warden, the lair, the heart and `from-deep`.

## Tests I added or changed

`test/maps.test.mjs` (Act III):
- **Changed, one for one (`ACT3_SPEC`, the pinned biomes and backdrops):**
  - hollow-hall: biome `'vault'` became `'dwarf-hall'` (a stand-in, marked `STUB (M7 P2)`); backdrop
    `'scorchgate-vaults'` became `'hollow-hall'`.
  - ash-stair: biome `'ash'` is unchanged (a stand-in, marked); backdrop `'scorchgate'` became `'ash-stair'`.
  - chained-deep: biome `'ice-cave'` became `'forge'` (a stand-in, marked); backdrop `'frostmere-below'` became
    `'chained-deep'`.
  - worldforge: biome `'forge'` is unchanged (a stand-in, marked); backdrop `'harrows-forge'` became `'worldforge'`.
- **Changed (the First Sleeper):**
  - Old: `assert.ok(sleeper.kind === 'prop' && sleeper.solid && cellsOf(sleeper).length >= 9, 'the First Sleeper,
    large and solid')`.
  - New: two assertions. (1) It is one solid prop named `sleeper-first`, with `at` and no `area`. (2) All 48 tiles
    within 3 of its foot are solid.
  - Why: a prop with an `area` is drawn on every tile of it (70 draws in the scaffold). The new check is at least as
    strong: 48 solid tiles round the Sleeper, where the old one asked for 9 covered tiles.
- **New:** "the Hearth Below is laid out as batch 4 describes it" checks, place by place:
  - The Hollow Hall: the stair in (3 wide, bottom edge, west third) and the stair down (3 wide, the east end). Each
    soot line and its keeper fill the same 5 nave rows. The chairs alternate N/S, west to east, each behind its line,
    with its keeper at the line's end on the chair's side. The alms chest is in the north wall past the fourth chair.
  - The Ash Stair: in at the top edge left of centre, on at the bottom edge. The Under-Coal is in the top third,
    east. The narrows are 3 wide between two `Y` roots. There are two landings of 8 or more across, west in the
    middle third and east in the lower third. With the ash gate shut, the way on reaches the cache and the way in
    does not.
  - The Chained Deep: the stair at the north-west corner, the door in the middle of the east edge, the narrows 3
    wide, the Sleeper in the middle third, the chains' signs where their chains run (all with the look `chain`), and
    Tamsin by the door. With the chain gate shut, the way in reaches only the west chain, the way back from the door
    reaches only the east chain and Tamsin, and the middle chain is read from the walkway past the narrows.
  - The Worldforge: the door in the middle of the west edge. The moat is exactly 3 whole columns of `~`/`b`, about a
    third of the way in. The bridge is 3 wide, in line with the door, with its gate at its near end. The heart cannot
    be reached while the Unsmith stands, and can once he is beaten.
- **New:** "the large props are drawn once, at their foot, and stand in solid ground" checks `sleeper-first`,
  `worldforge` and `great-anvil`.
- **New:** "every Hearth Below map is closed at its edges but for its exits, and the Ash Stair's patrols keep to its
  landings" checks the roam mask flooded from each rect, and that the pack's home is on a landing.

`test/road.test.mjs`:
- **New:** "the Act III road runs unbroken from the vault stair to the finale". It starts at `hall-down`'s anchor.
  Each below map has one road, starting where the previous exit lands, and the last ends at the finale. The maps are
  exactly `hollow-hall`, `ash-stair`, `chained-deep` and `worldforge`, in that order.

`test/walk.test.mjs`:
- **Changed, strengthened; no assertion removed:** the Act III walk now runs in legs.
  - Before the Council, the stair back is a way home (a step onto it is an `exit`).
  - Once Miravel falls, it is `sealed`, with the spec's exact words.
  - It is still sealed while Gretch holds the last chair, and it opens again once she falls.
  - Then the walk goes on as before, and every earlier assertion still holds.
  - `makeBot` gained `more(ids)` (walk on from where the bot stands). `run()` now calls the same loop, so the older
    walks are unchanged, and they still pass.

Counts: 541 tests before (the lead's base) and 545 now: +3 in maps and +1 in road. The walk's three Act III tests are
the same three, now stronger.

## What is left as a stand-in, and why

- **The four biomes** (`STUB (M7 P2)` in each map module and in `ACT3_SPEC`).
  - Why: `test/world-art.test.mjs` requires every map's biome to be in `art/tiles.js` `BIOMES`, which is P5's file,
    and spec §7 lets only art-keys fail for a missing half.
  - The maps therefore draw in drawn stand-ins until P5's four biomes land.
  - **The switch, once P5's biomes are in:**
    - in `src/data/maps/hollow-hall.js`, `biome: 'dwarf-hall'` becomes `biome: 'council'`;
    - in `ash-stair.js`, `biome: 'ash'` becomes `biome: 'hearth-roots'`;
    - in `chained-deep.js`, `biome: 'forge'` becomes `biome: 'chains'`;
    - in `worldforge.js`, `biome: 'forge'` becomes `biome: 'worldforge'`;
    - the same four values change in `test/maps.test.mjs` `ACT3_SPEC`;
    - and the five `STUB (M7 P2)` comments are removed: the two lines above `ACT3_SPEC`, and the one above `id:` in
      each map.
- **The backdrops are the final ids, not stand-ins**, so `test/art-keys.test.mjs` "every encounter, map and
  patrol-zone backdrop ... has a painter" fails until P6's `hollow-hall`, `ash-stair`, `chained-deep` and `worldforge`
  land. This is the case spec §7 allows ("art-keys fails for a new key until both halves have landed"), and it is the
  only failing test in my copy.
- **The chairs' `throne` and the heart's `altar`** stay until batch 4's paintings land. They then become `painted`
  (the lead's tracing, P8).

## Requests to other packages

- **P5:**
  - Add `council`, `hearth-roots`, `chains` and `worldforge` to `BIOMES`, drawn to the table above.
  - Draw the props `sleeper-first`, `worldforge` and `great-anvil` (large, one draw each, sized to the footprints
    above), and `vault-stair`, `vault-boxes` and `vault-boxes-open` (a sprite per tile).
  - Draw the sign look `chain`, the gate look `hollow-gate`, and the hearth looks `undercoal` and `chainfire`.
  - The prop names `worldforge` and `great-anvil` are mine (the spec names the Worldforge and the anvil, not their
    keys). If you chose others, tell the lead, who can rename them in `worldforge.js` (two lines).
- **P7:** `ui/world/view.js` `GATE_KIND['hollow-gate'] = 'hollow-gate'`, once P5's sprite exists.
- **P6:** the four backdrops above (the maps and the zone already name them).
- **P4:**
  - The Act III encounters (and the two Hearthfire entries) still name the scaffold's stand-in backdrops. Point each
    at its map's own: `hollow-hall` for the four Council fights, `ash-stair` for `as-thralls`, `as-patrol` and
    `under-coal`, `chained-deep` for `cd-unmade` and `chain-fire`, and `worldforge` for `wf-warden` and `unsmith`.
  - `ZONES['ash-stair'].level` (22, a Waking-0 base, so about 38 at Waking 8) is in `data/world.js`, which is mine.
    Send me or the lead a new number if the sim wants one.
- **P3:**
  - The chairs', chains', gates' and heart's words are in the map modules, which are mine. I wrote them short and
    plain. Change any freely through the lead.
  - `cd-tamsin` keeps `talk: 'tamsin-return'` as documentation. An NPC's talk comes from her talk table in
    `data/npcs.js`.

## Checks (the brief's)

- **The walk bot down `ACT3_PATH`** from a Gloomfen-complete save passes for all three starters. It steps: the fifth
  council, down the vault stair, the Council back to back (with the stair checks above), the Under-Coal, the thralls,
  the unmade, the Chain Fire, Tamsin, the warden and the Unsmith, then home up `hh-up`. The road held before 7 fights.
- **`tools/map-shots.mjs`** (`--out` takes a folder; `--maps=id:aspect,...`, `--ents`): I rendered the four maps and
  the Great Hall in the real view. The shots are in `scratchpad/m7-p2-work/shots/`.
  - I looked at every one, and at `map-draft --png` and `--art` drafts of each (`m7-p2-work/draft/`, `.../art/`).
  - The stand-in choices came from those renders. `ice-cave` made the Deep icy-blue, so it is `forge` now. In
    `vault` the Hall's pillars read as wall, so it is `dwarf-hall`. Two tile choices changed after looking: the Ash
    Stair's landings became `.` (in `ash`, `_` is wooden planks), and the Deep's cracks became `f` (in `forge`, `i`
    is a snow drift).
- **Frame time**, measured as e2e-world scenario 39 measures the Gloomfen: 4x CPU throttle, the map's longest open
  east-west stretch walked back and forth for 10 s, with its fights won.
  - I used a private script, `m7-p2-work/m7-perf.mjs`, because scenario 39's map list is P7's file.
  - Every map is within the target (p95 16 ms, 40 `drawImage`), with no page errors:

| map | phone p95 JS | phone drawImage max | laptop p95 JS | laptop drawImage max |
|---|---|---|---|---|
| hollow-hall | 2.50 ms | 10 | 3.80 ms | 12 |
| ash-stair (1 patrol) | 3.00 ms | 9 | 3.10 ms | 9 |
| chained-deep | 2.10 ms | 6 | 3.90 ms | 7 |
| worldforge | 2.30 ms | 10 | 2.30 ms | 12 |

  These are the final build's numbers (the shots are in `m7-p2-work/perf-shots2/`). A first run, before the last
  two tile changes, gave the same picture.

  These were measured in the stand-in biomes. P5's big props draw once each, so the counts should hold. The lead
  should re-measure after the art lands.
- **Mutation checks** (`m7-p2-work/mutate.py`): each mutation ran on a scratch copy of the game, and each file was
  restored and sha256-checked. The map and road tests must fail on every one.
  - The earlier regions' long flood fills cannot see a change below the Keep, so the harness leaves them out. The
    final full `npm test` runs them.
  - **All 32 are caught:**
    - the Hollow Hall: a bay open on both sides of its soot line (two ways), a keeper off its line, a six-wide nave,
      the chairs swapped, the stair back never shut, the alms chest before Gretch, the stair in two wide;
    - the Ash Stair: the narrows four wide, the side ledge joined to the top run, the drop bridged, the Under-Coal
      below the narrows, a landing spilling onto the stair, a root gone, the way on off the bottom edge;
    - the Chained Deep: the west and east floors joined along the south, the rim walked past the narrows, the narrows
      four wide, Tamsin away from the door, the Sleeper as an area prop, the Sleeper on open floor, the middle chain's
      sign off the walkway, the Chain Fire before the narrows;
    - the Worldforge: the moat two wide, the bridge out of line with the door, the heart's recess open, the bridge
      gate at the far end, the anvil on open floor, an edge left open;
    - the world tables: the Under-Coal's stand facing north;
    - the Great Hall: the vault stair opening with the fourth council, and the vault stair made solid.
  - One mutation first went unseen. It opened the heaps between the chains, but the outer chains still walled that
    ground off, so it made no real defect. Rewritten to cross all three chains, it is caught by both the road test and
    the layout test.

## Decisions for the lead

1. **No new tile ids.** The brief asked for new tiles (pillar, chair, drop, molten metal, chain, slag, iron plate) in
   `data/tiles.js`. A new tile id adds a cell to every biome's atlas (`art/tiles.js` builds one per `TILE_IDS`
   entry), so every M3-M5 atlas digest in `test/world-art.test.mjs` would change. So, as M5 and M6 did, the four
   biomes give the existing characters their looks (the table above), and `data/tiles.js` documents this.
2. **Stand-in biomes until P5 lands**, with the exact switch above.
3. **Final backdrop ids now**, so art-keys fails in my copy until P6 lands (spec §7).
4. **The Chained Deep's chains and signs.**
   - Three solid chains from the hollow to the south edge always leave the floor between them cut off. The two
     middle pockets can never touch the walkway.
   - So the heaped slag there is solid, and the chain to the south edge runs between the two heaps, away from any
     floor.
   - `cd-chain-lull` and `cd-chain-hush` stand in their chains' lines beside the west and east floors.
     `cd-chain-ash` stands on a plate out over the rim, below the rail, where that chain runs straight away south
     under the walkway. Its words say you are looking along it.
   - When the Deep is traced from its painting, the same problem returns, and the same answer works.
5. **`hh-up` is the whole flight** (6 steps), so a step onto the stair meets the ash (the sealed words) at once.
6. **The heart is reached only past the Unsmith** (a recess in the furnace). The spec only says "behind him"; I made
   it strict so the endings open only past him, and it is tested.
7. **`travel`** is kept as the scaffold set it: the Hollow Hall and the Worldforge are `false`, the Ash Stair and the
   Deep `true`. The Hollow Hall must stay `false`: the Atlas would otherwise lift a party out mid-Council, round the
   sealed stair.

## Where I am

- Done. All four maps are drawn. `world.js`, `keep-hall.js`, `tiles.js`, `index.js` and `map-draft.mjs` are updated,
  and the tests are written.
- Final run on my copy: `npm test` 545 tests, 544 pass. The 1 failure is art-keys' backdrop check, which names only
  `hollow-hall`, `ash-stair`, `chained-deep` and `worldforge` (P6's). `npm run lint` is clean. The private build
  succeeds: the game is 2628 KB (the build's 2.5 MB warning was already there) and the paintings 28217 KB.
- My files, and nothing else: the four Act III map modules, `data/maps/index.js`, `data/maps/keep-hall.js`,
  `data/tiles.js`, `data/world.js`, `test/maps.test.mjs`, `test/road.test.mjs`, `test/walk.test.mjs`,
  `tools/map-draft.mjs`, and this file.
- The helpers are in `scratchpad/m7-p2-work`: `gen.py` (the seeded row painter for the four maps), `inject.mjs`
  (puts rows into a module), `m7-perf.mjs` (the frame-time script) and `mutate.py` (the mutation checks).
