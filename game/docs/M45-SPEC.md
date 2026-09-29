# Milestone 4.5 spec: the Road

The M4 playtest, in the player's words: "the way the game progressed at m2 was enjoyed much more by
the play testers so walking around the overworld is amazing very fun but the way interactions happen
if the map only let you slowly progress down the road and every encounter was a full fight with dice
rolls." Milestone 4.5 keeps the walkable maps and brings back M2's pacing: the road goes on only
through its fights, and every fight is a full battle. Part A overrides Part B.

## Part A. Decisions (these win)

| # | Decision |
|---|---|
| A1 | **Its own file and save** (the player's rule). Milestone 4.5 writes only `aethermoor.save.m4.5` (+ `.bak`, `aethermoor.m4.5.started`). It reads the Milestone 4 save (`aethermoor.save.m4`), the Milestone 3 save (`v2`) and the M2 save (`v1`), newest first, as carry-overs, and never writes them. The download is `dist/aethermoor-m4.5.html`; `dist/aethermoor-m4.html` is frozen from step 0 (its sha256 pinned next to M2's and M3's). The save shape does not change: version 3, `AETH3.` codes, and `AETH1.`/`AETH2.` still load. |
| A2 | **Road gates.** Every fight on the route holds the road: a gate across the road at a chokepoint, with the fight's foes standing beside it (in the pass or next to it) as its guard (`open: { beaten: <guard> }`, `guard: <guard>`), the pattern of the Sun Road toll. The gate and its guard hold the road together: the guard is only ever gone once beaten, and then its gate is open. Walking into the gate or the guard opens the guard's pre-fight card. Once the guard is beaten the gate stays open for good; when a Brand re-arms the guard it stands beside the open gate as an optional rematch. A lair on the route holds a gate further along the road (`open: { beaten: <lair> }`, no guard), whose text says where the lair is. |
| A3 | **One order.** The route is fought in `CRITICAL_PATH` and `SUN_PATH` order. The Sunscorch has one order too: Sandspire's east gate (to the Glass Flats) opens with the Brand of Glass, so Kharzul comes before the Ashen Warden. The Verdant side roads (Mossfall, the Hindwood) still open with the Brand of Briars; each is fought through in order, like the road. |
| A4 | **Every contact is a full fight.** There are no Routs. A weak pack still runs from you when it sees you; catch it and it is a full battle, with First Strike when you catch it from behind. The Rout deed keeps its id (`rout`: saves hold it, `saveProblems` checks deed ids) and now means "beat a pack that ran from you". |
| A5 | **Every fight starts with Auto off.** The Auto button still works inside a fight; the choice is no longer remembered between fights. |
| A6 | **Frozen, as before:** `art/heroes.js`, `art/hero-looks.js`, the card reveal, the M2 encounter and spawn arrays (`test/fixtures/m2-spawns.json`), and the delivered M2, M3 and M4 files. Map entities may move and maps may gain terrain, but every `v1:*` anchor, Hearthfire stand and arrival anchor stays walkable and on the side of the gates its save expects. |
| A7 | **No save is stranded.** A gate whose guard a save has already beaten is open (`toV3` fills `beaten` from `cleared` and `done` where a save lacks it). A carried-over position inside something now solid moves to the nearest free tile. A save that walked past a pack in M3 or M4 can always fight the guard, go on, or travel. |
| A8 | **Tests that pinned the old design** (Routs, `routPack`, `routSpoils`, the rout event) are replaced, one for one, with tests of the new rule; none is simply deleted. |

## Part B. Build spec

### 1. Step 0 (lead)

As M4's step 0 did: `core/save.js` keys (A1); `loadGame` returns `from: 'live' | 'm4' | 'v2' | 'v1'`;
`hasM4`, `readM4`, `exportM4Code` (the stored M4 save as `AETH3.`, byte for byte). The title offers
"Continue from Milestone 4"; Settings lists "Your Milestone 4 save" above the M3 and M2 ones; the
carry-over card has an `m4` kind. `tools/build.mjs` writes `aethermoor-m4.5.html`. `test/frozen.test.mjs`
pins `aethermoor-m4.html` (`a324d1ca4fb1eeb248092caeb8a4caff312fbaed8595a37d65af884e22999c4f`).
e2e-flow gains a Milestone 4 profile (an M4 save on this device carries over; the M4 key is never written).

### 2. Rules (lead)

- `rules/world.js`: `touch()` never returns a `rout` event: a weak pack is a `contact` with `weak: true`
  (and First Strike when you come at its back). Weak packs still flee. The sealed-exit event carries the
  exit's own `hint` (`sealed.hint`), so a gated exit says what opens it.
- `rules/gauntlet.js`: `routPack` goes. `startBattle(game, target, { ambush, firstStrike, caught })`:
  `caught` (a weak pack you ran down) is kept on the battle, and a win marks the `rout` deed on the relics
  the active heroes wear. `loot.routSpoils` and `TUNING.rout` go with it.
- `data/deeds.js`: `rout` reads "Beat a pack that ran from you while it is equipped."
- `rules/migrate.js` `toV3`: `flags.beaten[id] = 1` for every fight in `cleared` or `done` without a
  `beaten` entry (idempotent; M2 saves already get it from `toV2`).
- `rules/world.js` `enterMap`: a target position (`at`) inside something solid moves to the nearest
  walkable tile (breadth-first, the map's own order); an anchor is used as is.

### 3. UI (lead)

- `ui/screens/world.js`: bumping a gate whose guard is present goes straight to the guard's pre-fight
  card (no "the way is shut" message first); the Rout flow goes; a caught weak pack is a battle.
- `ui/screens/battle.js`: Auto starts off every fight (A5).
- `ui/world/view.js` `GATE_KIND`: the looks `bramble`, `rot-knot`, `thornwall`, `boulder`,
  `barred-gate` and `dune-glass` draw those objects' closed and open sprites.
- The sealed-exit message appends the exit's `hint` when it has one (the Keep's south-east gate gets
  its current sentence as its `hint`).

### 4. Maps (package R, one agent)

Each map listed gets a `roads` field, `[{ from: <anchor>, to: <exit id or encounter id>, gates: [<gate
ids in the order you meet them>] }]`, and its gates. `test/road.test.mjs` checks every road:

1. With every gate and lock open, `to` is reachable from `from`.
2. Each gate on the road, closed alone (with its guard standing), cuts `from` off from `to`.
3. You can walk up to each gate, and to its guard or the lair it waits on, from `from` with that gate
   and the later ones closed and the earlier ones open.
4. Each gate's `open` names its guard (`beaten`), or the lair it waits on.
5. No fight in `CRITICAL_PATH`, `SUN_PATH`, `LEADS` or `SUN_LEADS` is a roaming pack, and every fight in
   `CRITICAL_PATH` and `SUN_PATH` holds a gate (a gate's `open` names it) or holds a Brand.

The road gates (guard = the encounter; the look and text are suggestions the package may improve):

| Map | Road | Gates, in order |
|---|---|---|
| `hearth-road` | `from-keep` → `hr-n` | `hearth-road` (look `chain`: a rope across the road; the cutpurses stand by it), `waymarker-stones` (`bramble`), `bramble-toll-chain` (exists), `verdant-edge` (`bramble`), a rot-thorn gate on the north road that opens when `rotstag-glade` is beaten (`rot-knot`, no guard; its text points east to the glade) |
| `thornway` | `from-thornhollow` → `tw-den` | `tally-camp` (`barred-gate`), a gate that opens when `snag-wallow` is beaten (no guard; its text points to the wallow), `bramble-deep` (`bramble`) |
| `heartroot-1` | `from-tree` → `h1-n` | `hr1-grubs` (`rot-knot`), `hr1-sapwight` (`rot-knot`) |
| `dust-trail` | `from-sandspire` → `dt-w` | `dt-scorpions` (`boulder`) |
| `deep-shaft-1` | `from-dusthaven` → `ds-down` | `ds-crew` (`barred-gate`) |
| `glass-flats` | `from-sandspire` → `gf-s` | `gf-raiders` (`chain`) |
| `scorchgate` | `from-glass-flats` → `sg-vault` | `sg-captain` (`gate`), then a gate before the vault door that opens when the Tamsin duel is done or yielded (`{ any: [{ done: 'tamsin-scorchgate' }, { flag: 'tamsin-yielded-2' }] }`, guard `tamsin-scorchgate`) |
| `mossfall` | `from-thornhollow` → `mire-shrine` | `mf-smugglers` (`chain`) |
| `hindwood` | `from-thornhollow` → `gloamwing-hollow` | `hw-glowcaps` (`rot-knot`) |
| `keep` | `from-hall` → `keep-n` | `keep-n-gate` (exists; waits on `keep-vault` in the Great Hall) |
| `sun-road` | `from-keep` → `sr-s` | `sr-toll-chain` (exists) |
| `scorchgate-vaults` | `from-scorchgate` → `ashen-warden` | `sv-inner-door` (exists) |

Also: `sandspire` exit `ss-e` gets `gate: { brand: 'brand-of-glass' }` and `sealed: { region:
'sunscorch', text, hint }` (A3). The packs that become guards change `mode` to `block` and stand
beside their gate on the side you arrive from. Side packs that hold no road (`mf-bog`, `hw-druids`,
`sr-skinks`, `dt-skinks`, `ds-scorpions`, `gf-wisps`, `sg-wights`) stay roaming packs. Chokepoints are
made with the map's own terrain (trees, bushes, rock, water, walls), never by leaving a hole in a wall.
Every chest, lock, NPC, sign and side area stays reachable (the existing map tests), and the ASCII
preview (`node tools/map-draft.mjs <map>`) should read as a road with fights on it.

### 5. Sim, walk test and e2e

- `tools/sim.mjs`: crossing a zone map with a weak patrol costs nothing (it runs); a strong one is a
  fight, as before. Every M3 and M4 target is re-checked and retuned if needed.
- `test/walk.test.mjs` plays both routes through the gates (a gate's guard is fought when the bot bumps
  it). It also checks the pacing: on a road map, before each road fight is won, the next target on the
  route is not reachable.
- `e2e-world` scenario 3 checks that a caught weak pack is a full battle; a new scenario walks into a
  road gate (the guard's card opens), wins, and walks through.

### 6. Verification

Units, lint, build, `e2e-world`, `e2e-flow`, `e2e-battle` and `e2e-codes` at both sizes, the sim on
target, an independent review, then delivery as `dist/aethermoor-m4.5.html`.
