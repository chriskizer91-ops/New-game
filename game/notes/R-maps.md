# R maps (M4.5): road gates on the maps

Package R of `docs/M45-SPEC.md` (§4). No git was run. Files edited: only the maps under
`src/data/maps/` named in the brief, and this notes file.

Status: done (see "Checks" and "For the lead" at the bottom).

## Baseline (before any edit)

`npm test` (after the lead's Rout changes to the tests): 279 tests, 277 pass, 2 fail. Both failures are
in `test/road.test.mjs` (the package's acceptance test):
- "the road maps of the spec each have a road" (`hearth-road has no roads`)
- "no fight on the route or a lead roams, and every route fight holds a gate or a Brand"
  (`hearth-road (hearth-road) is not a roaming pack`)

The walk tests (`test/walk.test.mjs`) pass at baseline.

## Maps

Coordinates are `(x,y)` tiles; areas are `[x0,y0,x1,y1]`. "Guard" is the encounter (same id as its
`enc`); every guard that was a roaming pack is now `mode: 'block'` with one `at` and no `leash`.

### hearth-road

Road: `from-keep` → `hr-n`, gates `['hr-rope', 'hr-stones-bramble', 'bramble-toll-chain', 'hr-edge-bramble', 'hr-rot-knot']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `hr-rope` | [13,62,14,62] (the causeway-bridge's north end) | `chain` | `hearth-road` block at (12,62), in the gap on the bridge (was a pack at (12,60), leash 4) |
| `hr-stones-bramble` | [13,45,15,45] | `bramble` | `waymarker-stones` block at (16,45), in the gap (was a pack at (9,50)) |
| `bramble-toll-chain` | [11,32,13,32] (unchanged) | `chain` | `bramble-toll` (Skarn) **moved** from (16,31) (inside the toll yard, behind the chain, which the road test cannot reach) to (14,33), beside the chain on the south side |
| `hr-edge-bramble` | [12,21,14,21] | `bramble` | `verdant-edge` block at (15,21), in the gap (was a pack at (13,22)) |
| `hr-rot-knot` | [12,7,14,7] | `rot-knot` | none: `open: { beaten: 'rotstag-glade' }`; the text points back east to the glade |

Terrain added:
- Row 45: a bramble hedge across the meadow from the west trees to the millrace (x=5-7 and 11-12 bush and
  tree, x=17-18 bush), with a notch at x=8-10 backed by bushes on row 44 (x=8-10), so it reads ragged and
  leaves no 1-wide corridor. The boulder cache (2-3,46), the tenth waymarker and the ring of stones stay
  south of it; the Milestone Fire is just north.
- Row 20 x=9-11 and row 21 x=16: bushes close the Verdant Edge beside the road.
- Row 7 x=11 and x=15: bushes (joining the old ones at x=10 and x=16) narrow the north road to the
  3-tile rot-knot.
- The rope needs no terrain: the bridge is 3 tiles wide between water.

Anchors: none moved. Every v1 anchor sits between the right gates (road test passes). Lint: only the
3 pre-existing corridor tiles (the boulder lock, the ford).

### thornway

Road: `from-thornhollow` → `tw-den`, gates `['tw-tally-gate', 'tw-snag-boulder', 'tw-deep-bramble']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `tw-tally-gate` | [12,40,14,40] (north end of the camp) | `barred-gate` | `tally-camp` block **moved** from (5,44) (camp centre) to (11,40), the camp's north-east corner beside its gate |
| `tw-snag-boulder` | [13,28,15,28] (just south of the thorn band) | `boulder` | none: `open: { beaten: 'snag-wallow' }`; the text says Old Snag wallows in the black mud back down the road to the east |
| `tw-deep-bramble` | [16,20,18,20] | `bramble` | `bramble-deep` block, unchanged at (15,20): it already stood in the gap beside the path |

Terrain added: row 40 x=15-16 and row 41 x=16 bushes (close the east side of the tally gate); row 28
x=12 and x=16 bushes (narrow the road to the 3-tile boulder). The thornwall lock (row 26) is unchanged
and still the only way through the thorn band. Anchors: none moved. Lint: clean.

### heartroot-1

Road: `from-tree` → `h1-n`, gates `['h1-grub-knot', 'h1-sap-knot']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `h1-grub-knot` | [11,20,12,20] (the tunnel mouth from the tree door) | `rot-knot` | `hr1-grubs` block at (13,20), in the gap (was a pack at (16,18) in the mulch) |
| `h1-sap-knot` | [11,1,12,1] (the neck up to the Heart Chamber) | `rot-knot` | `hr1-sapwight` block at (13,1), in the gap (was a pack at (8,16)) |

No terrain: the corridor from the tree door and the 3-wide neck under the exit are natural chokepoints.
The whole cavern (the Last Green Coal, the patrol, the tappers, both ichor pools, the rot-knot cache)
lies between the two gates. `from-chamber` (12,2) is south of the sap-knot, so a save coming back from
the Heart Chamber can always fight the sapwight or walk back down. Lint: only the pre-existing crack to
the cache.

### dust-trail

Road: `from-sandspire` → `dt-w`, gates `['dt-rockfall']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `dt-rockfall` | [38,11,38,12] (the trail and the rails) | `boulder` | `dt-scorpions` block at (38,10), in the gap (was a pack at (24,16) mid-canyon) |

Terrain added: a rockfall across the canyon neck east of the Dust Cairn, where the north outcrop
(37-38,6-7) and the sinkhole ring come closest: boulders at (38,4) (in the dry aqueduct bed), (38,5),
(38,8), (39,8), (38,9), (38,13), (39,13), (38,14) and (37,15), joining the existing rock. The Cairn, the
aqueduct nest, the Sand Wyrm, the skinks and the boulder ledge are all west of it (past the gate). No new
1-wide corridor.

### deep-shaft-1

Road: `from-dusthaven` → `ds-down`, gates `['ds-crew-bar']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `ds-crew-bar` | [10,7,12,7] (the main shaft, rails and all) | `barred-gate` | `ds-crew` block **moved** from (19,9) (deep in the east dig gallery) to (15,7), the mouth of the gallery beside the shaft |

The landing reaches the lamp chamber two ways: the main shaft and the east dig gallery. The gate closes
the shaft; Brask's crew stands in the gallery's one gap, so gate and guard seal both together (the Sun
Road toll pattern), and the re-armed crew never shuts the shaft. Terrain: a timber prop `|` at (13,7)
narrows the shaft to 3 tiles; a spoil heap `o` at (16-17,7) and (19-21,7) closes the rest of the
gallery top (the old ore lump at (18,7) is part of it). The lantern light `ds-crew-lantern` moved with
Brask to (15,7). The Shaft Lamp, the scorpions' cave and the stair down are all past the gate. Lint:
(15,7) is a 1-wide tile, but it is Brask's own gap (entity tiles are never roamed).

### glass-flats

Road: `from-sandspire` → `gf-s`, gates `['gf-raider-chain']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `gf-raider-chain` | [25,27,26,27] | `chain` | `gf-raiders` block at (27,27), beside the chain (was a pack at (14,18)) |

The long way round the Glass Mesa and the mirage's short cut through it only meet again in the south
strip, so the chain goes where the road drops through the crests to the Scorchgate exit. Terrain: dune
crests `^` at (24,28), (27,28) and (28,28) make that gap a 2-tile mouth. `from-scorchgate` (25,28) sits
between the chain and the exit, so a save coming back from Scorchgate can always walk into the chain
(and its guard's card) or go back south. No new 1-wide corridor.

### scorchgate

Road: `from-glass-flats` → `sg-vault`, gates `['sg-wall-gate', 'sg-keep-gate']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `sg-wall-gate` | [14,15,16,15] (the last wall's gap, between its braziers) | `gate` | `sg-captain` block **moved** from (15,29) (the Vault door) to (17,15), in the gap beside the gate |
| `sg-keep-gate` | [13,28,17,28] (the keep's steps) | `gate` | `tamsin-scorchgate` block **moved** from (16,23) (mid parade ground) to (18,28), on the steps beside the portcullis; still `if: { beaten: 'sg-captain' }` and `talk` |

`sg-keep-gate` has `open: { any: [{ done: 'tamsin-scorchgate' }, { flag: 'tamsin-yielded-2' }] }`. No
terrain: the last wall's gap and the keep's steps are the map's own chokepoints. The Last Watchfire
(20,14) stays north of the wall (it comes first on SUN_PATH). `from-vaults` (16,29) is on the Vault
side of both gates, walkable and under no entity, so a save that went down without the duel comes up
and can walk into the portcullis (or Tamsin) from the south.

### mossfall

Road: `from-thornhollow` → `mire-shrine`, gates `['mf-ford-chain']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `mf-ford-chain` | [41,13,41,13] (the head of the ford to the shrine's islet) | `chain` | `mf-smugglers` block at (42,13), beside the chain (was a pack at (14,6) by their tarp) |

No terrain: the ford is the islet's only way in. `mf-bog` stays a roaming pack.

### hindwood

Road: `from-thornhollow` → `gloamwing-hollow`, gates `['hw-bridge-knot']`.

| Gate | Area | Look | Guard (where) |
|---|---|---|---|
| `hw-bridge-knot` | [26,21,27,21] (the east bridge's south end) | `rot-knot` | `hw-glowcaps` block at (25,22), at the bridge foot (was a pack at (8,14) in the ring) |

The Gloamwing's glade was open at both ends (north to the Fawnrest trail, south over the bridge), a
loop no single gate can hold. Terrain: a rim of trees and bushes on row 10 (x=20-28) closes the glade
to the north, so it is now a real hollow whose one way in is the bridge; one more bush at (21,9) joins
an existing bush to the rim (it would otherwise leave a 1-wide tile). The ford and the west trail to
Fawnrest and the rope-ledge are untouched. **Design cost:** the Hindwood's chase loop (ford, north
wood, glade, bridge) is gone; the west and east halves still join south of the stream. `hw-druids`
stays a roaming pack.

### keep, scorchgate-vaults, sandspire

- `keep`: `roads: [{ from: 'from-hall', to: 'keep-n', gates: ['keep-n-gate'] }]` (the gate waits on
  `keep-vault`, placed in the Great Hall).
- `scorchgate-vaults`: `roads: [{ from: 'from-scorchgate', to: 'ashen-warden', gates: ['sv-inner-door'] }]`.
- `sandspire`: exit `ss-e` now has `gate: { brand: 'brand-of-glass' }` and `sealed: { region:
  'sunscorch', text, hint }` (text: the Flats are still fusing into glass and the Spire Guard lets
  nobody through; hint: it opens once the Glass Heart under the Deep Shaft goes quiet).
- `keep`: exit `keep-se` also got `sealed.hint: 'The gate opens once both Brands of the Wilds are
  yours.'`, the sentence the UI appends today (spec §3: "the Keep's south-east gate gets its current
  sentence as its hint"). The message is unchanged; the UI's `gated` fallback can go if you like.

Every changed map's header comment now describes its M4.5 gates, and the stale lines are fixed
(Brask's lantern, Tamsin's spot, the Ash-Captain, "every entity at its spec coordinates", the
Hindwood loop).

## Checks

- `node --test test/road.test.mjs`: **16/16 pass** (12 roads, the 2 M2-anchor tests, the spec-maps
  test and the no-roaming test).
- `node --test test/walk.test.mjs`: **6/6 pass**. With the live pacing check, each Verdant walk holds
  the road before 10 fights and each Sunscorch walk before 7 (minimums 8 and 5).
- A stricter pacing check of my own (scratch script, not in the repo): at every stage of
  CRITICAL_PATH and SUN_PATH, each road fight can be stood beside, and the next target cannot be stood
  beside until that fight is won. This held for all 13 Verdant and 8 Sunscorch fights, including A3's
  order: the Glass Flats wait on Kharzul.
- `npm run lint`: clean. `node tools/map-draft.mjs --lint`: no new notes except the one explained
  below (the east side reads as unreachable). Every new gate and terrain line was checked in a
  `tools/map-shots.mjs --ents` render.
- I did not run `npm run build` (it rewrites `dist/`).

### `npm test`: 295 tests, 286 pass, 9 fail

Baseline was 279 tests, 277 pass. The 2 old road-test failures are fixed. The 9 failures below all
pin the M4 design that spec §4 and A3 change (none is the Expected-failure Rout test: the lead already
replaced it, and it passes). With the test edits suggested here applied to scratch copies of
`maps.test.mjs` and `shell.test.mjs` (the repo tests are untouched), all 28 map tests and all 10 shell
tests pass on these maps.

| # | Test (file) | Message | Why, and the suggested test fix |
|---|---|---|---|
| 1 | exits pair up both ways ... 5 sealed exits (maps) | `6 !== 5` | `ss-e` is now a sealed, gated exit (A3). Expect 6, or count only exits without a `gate`. |
| 2 | world tables agree with the maps ... sealed entries (maps) | `ss-e is listed in REGIONS.sunscorch.entries` | `entries` are the ways *into* a region (`regionOpen`, the Journal's seals), and `ss-e` is inside the Sunscorch. Suggest the test skip a gated exit whose `to` is in its own `sealed.region`, rather than adding `ss-e` to `data/world.js`. |
| 3 | every chest is reachable with all keys (maps) | `glass-flats/gf-glass-cache-nw can be reached` | `allKeys({ brand: true })` holds only the two Verdant Brands, so it no longer passes Sandspire's east gate. Give it all four Brands (waking 4) **and** the second duel's yield `tamsin-yielded-2` (Tamsin now holds the keep's steps; `allKeys` skips duels). |
| 4 | every hard lock is the only way through ... (maps) | 7 × `...: its map is never reachable` (Glass Flats, Miragewell, Scorchgate) | Same fix as 3. |
| 5 | the Sunscorch opens through the Keep's south-east gate ... (maps) | `glass-flats is reachable once Act I is done` | Same fix as 3; its loop `assert.ok(x.to && !x.sealed)` must also accept a gated exit (`!x.sealed \|\| x.gate`). |
| 6 | after each Sunscorch Brand, the re-armed fights never shut the way home (maps) | `after kharzul-heart, last-watchfire is still reachable from the lair` | At that stage `gf-raiders` is not beaten yet, so the raiders' chain holds the road to Scorchgate. That is the pacing working; no re-armed fight blocks anything. Suggest checking only the fires already kindled at that stage. With that, both Brands pass: every re-armed guard stands beside its open gate. |
| 7 | world tables: SUN_PATH ... SUN_LEADS reachable (maps) | `the lead gf-caravan is reachable with every key` | Same fix as 3. |
| 8 | the Sunscorch maps hold what spec §2.3 puts on them (maps) | `dust-trail fights`: `dt-scorpions` is `block` | `SUN_SPEC`: `dt-scorpions` and `gf-raiders` are `block` now. |
| 9 | the Journal's Grudges ... (shell) | `a pack with a Grudge hunts` | It uses `gf-raiders#0` as its hunting pack; the raiders are a block now. Use a pack that still roams, e.g. `gf-wisps#0` (verified: the test then passes). |

## For the lead

1. **The 9 test updates above** (maps.test.mjs x8, shell.test.mjs x1).
2. **`tools/e2e-world.mjs` scenario 2** taps from (13,64) to (13,61) on the Hearth Road, straight
   through the new rope at the bridge end (row 62). It will fail. Tap within the bridge instead (e.g.
   from (13,67) to (13,64)), or mark `hearth-road` beaten in its setup. Scenarios 3 and 10 are
   unaffected. The new scenario 20 works with this layout: `approachOf` finds (14,63), and after the win
   the party walks through the open rope to (14,61). Scenario 11 (performance) now bumps the rope after 3
   steps north before it turns south. Also, the road-rats are a block now, so only zone patrols roam
   the Hearth Road; expect its non-fatal "only N roamers" note more often.
3. **`tools/map-draft.mjs`** `reachGame('all')` holds only the Verdant Brands, so `--lint` and
   `--reach=all` now report the Glass Flats, Miragewell, Scorchgate and the Vaults as unreachable. Add
   `'brand-of-glass', 'brand-of-ash'` to its brands.
4. **Moved entities** (tools or sims that assume old spots): Skarn `bramble-toll` (16,31)→(14,33);
   `tally-camp` (5,44)→(11,40); `ds-crew` and its lantern (19,9)→(15,7); `sg-captain` (15,29)→(17,15);
   `tamsin-scorchgate` (16,23)→(18,28). The former packs now stand as blocks: `hearth-road` (12,62),
   `waymarker-stones` (16,45), `verdant-edge` (15,21), `hr1-grubs` (13,20), `hr1-sapwight` (13,1),
   `dt-scorpions` (38,10), `gf-raiders` (27,27), `mf-smugglers` (42,13), `hw-glowcaps` (25,22).
   `tools/sim.mjs` crosses these maps (§5 retune).
5. **Design calls to confirm:**
   - The Hindwood loses its chase loop: the Gloamwing's glade is now a hollow reached only over the
     east bridge.
   - The Ash-Captain now holds the last wall rather than the Vault door. Tamsin's portcullis is the
     gate "before the vault door", and the Captain's Scorchgate Key still opens the seal.
   - `gf-raiders` hold the Scorchgate road at the crest gap, not the dunes south-west of the junction.
6. **Saves inside new terrain or gates** rely on the `enterMap` nearest-free-tile rule (spec §2), for
   example an M3/M4 position on a new hedge, rockfall, rim tree, spoil heap, crest, the timber prop or
   a gate tile. From either side of every gate the guard's card is one bump away (walking into a
   guarded gate from the far side still raises its `gate` event). For the two lair gates (the
   rot-knot and Snag's boulder) a save north of them can go on or travel by Hearthfire.
7. Optional (UI): the Journal's story seals could list Sandspire's east gate alongside the Keep's.

## Where I am

Done. Every map in the §4 table, plus keep, vaults and sandspire.
