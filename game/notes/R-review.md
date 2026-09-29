# Review: Milestone 4.5, the Road

Independent review of `docs/M45-SPEC.md` as built. No git was run and no repo file was changed except
this one. Every repro is a node script in `review/`, the review folder in this session's scratchpad
(the scratchpad path given in the review brief), next to its saved output (`.out`). The scripts import
the game's modules directly.

`review/m4/` is the Milestone 4 source, rebuilt by reversing the diff. It builds to the frozen
`dist/aethermoor-m4.html` byte for byte (sha256 `a324d1ca…`), so "what M4 allowed" below is the real M4
engine on the real M4 maps, not a guess.

**What was reviewed:** the diff snapshot (01:31), plus the edits made since: `core/save.js` (the
newer-code message), `ui/screens/battle.js` (the dev harness's `auto`), `tools/e2e-world.mjs` and
`test/core.test.mjs`. `npm test` passes 296/296 and lint is clean. No browser was run, as asked, so the
e2e numbers are the lead's.

**Verdict:** no Blocker. There are two Should-fix findings, both about carried-over saves; the save rule
itself holds. Then six Minor ones.

## Should-fix

### S1. Scorchgate's portcullis has a hole beside it until the Ash-Captain falls

**What.** `sg-keep-gate` covers the keep's steps at x=13..17 on row 28. The steps are x=13..18 wide, and
Tamsin (its guard) stands on (18,28). But she carries `if: { beaten: 'sg-captain' }`, so before the
Captain falls:
- she is not there;
- the gate is shut;
- (18,28) is open ground.

This is the only place where A2's rule ("the guard is only ever gone once beaten, and then its gate is
open") breaks. Every other gate holds it, over all 18 real fixtures and every route stage.

A fresh M4.5 party never sees the hole, because the Captain's wall gate comes first. A Milestone 4 save
can, though. In M4 the Captain stood at the Vault door, so the parade ground was open, and a save on it
that has not fought him yet can walk round the portcullis to the Vault door. The seal opens with the
Scorchgate Key or Knowledge 7, and every party of level 7 or more has Knowledge 7. So that save skips both
the Ash-Captain and Tamsin, two SUN_PATH fights.

Meanwhile, bumping the portcullis shows its text, "Tamsin is leaning on the winch, and she is not letting
you past without a fight.", while she is not there.

**Where.**
- `src/data/maps/scorchgate.js:72-73`.
- `test/road.test.mjs:19-31`: `walls()` stands a closed gate's guard whatever its `if`, so check 2 cannot
  see the hole.

**Repro.** `node review/p4-guard-invariant.mjs`:
```
BROKEN  route stage 30 (next: sg-captain): scorchgate/sg-keep-gate is shut but its guard tamsin-scorchgate is not there
A2 invariant over 53 states: 49 breaks            (all 49 at sg-keep-gate; no other gate breaks)
Scorchgate, the Ash-Captain not beaten, party on the parade ground at 15 25
  sg-keep-gate: closed | Tamsin present: false
  (18,28), beside the portcullis, walkable: true
  from (18,27): s:step+roam s:step+roam w:turn+step w:step+roam -> party at 16 29 (south of the portcullis, at the Vault door)
  vault-seal opens for this party: true (best Knowledge 14; the seal takes the Scorchgate Key or Knowledge 7)
  bumping the portcullis gives: {"t":"gate","id":"sg-keep-gate","text":"The keep's portcullis is down. Tamsin is leaning on the winch, ..."}
```

**Fix.** Either of these:
- Drop Tamsin's `if`. The wall gate already keeps her out of reach until the Captain falls, and her lines
  never mention him.
- Or widen the portcullis to x=13..18 and stand her on the parade-ground side, at (18,27).

Then make `road.test` stand a guard only when its `if` holds for the scenario, or assert that guards carry
no `if`.

### S2. `freeSpot` can send a carried-over save back to the start of its road

**What.** A save standing on a tile that is now solid moves to the nearest free tile *that the road's
start reaches as things stand*. When an earlier road fight is still unbeaten, that region ends at the
first shut gate. So a save that legitimately walked past fights in M4 is sent back behind them. Those
fights include packs, the Tallyman camp (off the road in M4), and the Captain (at the Vault door in M4).

The tile right next to it, beyond the same shut gates, stays put. That is by design (A7), but it makes
the two cases inconsistent.

Nothing is stranded (see "Checked and sound"). But this contradicts A7 and §2 ("moves to the nearest free
tile"), and it undoes an M4 player's progress on their first load, with no message.

**How far.** Measured over every tile that M4's own engine let a party stand on, at every road stage
(`review/p3b-nudges-m4engine.mjs`, output in `review/p3b.out`):
- up to 56 tiles back on the Hearth Road;
- 23 on the Thornway;
- 20 in the Heartroot;
- 15 at Scorchgate.

When the earlier fights are beaten, every nudge is 1-3 tiles.

**Where.** `src/rules/world.js:180-215`: `near` is flooded from `road.from` at lines 186-200 and used at
line 201.

**Repro.** `node review/p7-rollback.mjs` runs four M4 states that M4's engine allows, each with the real
M4.5 `enterMap`:
```
Hearth Road: walked past the road-rats, the hounds and the Verdant Edge (packs in M4), beat Skarn; saved on the north road
  M4.5 enterMap: (13,7) -> (13,63)  56 tiles | its neighbour (13,8) -> (13,8)
Thornway: never fought the Tallyman camp, Old Snag or the Bramble-Deep (all off the path in M4), cut the thornwall
  M4.5 enterMap: (17,20) -> (18,42)  23 tiles | its neighbour (17,21) -> (17,21)
Heartroot: walked past the grubs and the sapwight (packs in M4); saved in the neck up to the Heart Chamber
  M4.5 enterMap: (12,1) -> (12,21)  20 tiles | its neighbour (12,2) -> (12,2)
Scorchgate: on the keep's steps, the Ash-Captain (at the Vault door in M4) not yet fought
  M4.5 enterMap: (15,28) -> (15,14)  14 tiles | its neighbour (15,27) -> (15,27)
```
Each tile is walkable in M4 with those flags and solid in M4.5.

**Fix.** Judge "beyond a shut gate" from the save's own place on the road, not from the road's start:
1. Find the save's segment: with every road gate shut and its guard standing, how many of the road's
   gates, in order, lie between `from` and a free neighbour of the saved tile.
2. Flood `near` from `from` with those first gates treated as open.

The nudge then steps back over only the gate or hedge the save stands in, and it still never lands beyond
a gate the save had not passed.

A prototype of this rule (`review/p13-fix-proto.mjs`, outside the repo) was run over the same sweep:
- the four cases above move 1 tile each ((13,8), (17,21), (12,2), (15,27));
- the farthest nudge on any road map, at any stage, is 2 tiles;
- none lands in anything solid.

Also add a test with two gates and an unbeaten first guard. The `LANE` fixture in `world.test.mjs` has one
gate, so the current test cannot see this.

## Minor

**M1. `enterMap` now throws on a position outside the map.**
- **What.** `freeSpot` reads `map.rows[y][x]` with no bounds check; M4's `enterMap` never read the tile.
  The world screen enters at the saved position on Continue (`src/ui/screens/world.js:151-152`). So a
  damaged live or carried-over save would now crash the world screen as it mounts. `saveProblems` checks
  imported codes, but not local saves.
- **Repro.** `node review/p11-bounds.mjs`:
  ```
  at [5,999] M4    walk at (5,999)
  at [5,999] M4.5  THROWS TypeError: Cannot read properties of undefined (reading '5')
  ```
  `[5,-1]` and a position with no x or y behave the same way.
- **Fix.** Validate `at` in `enterMap` before `freeSpot`: outside the map or not integers, use the map's
  first anchor.

**M2. The prompt at a guarded gate says "Look · The way is shut".**
- **What.** `src/ui/screens/world.js:385-388`. But A, or walking into the gate, opens the guard's pre-fight
  card (`gateFlow`, line 704).
- **Fix.** While the guard stands, describe the gate as its guard, the way an encounter is described:
  "Fight · A · <name> · Lv n · rating".

**M3. The one order (A3) has no test on the real maps.**
- **What.** `test/maps.test.mjs:77` only checks that `ss-e` has *some* gate. Setting its gate to any other
  condition passes every test.
- **Repro.** It holds today (`node review/p10b-a3.mjs`):
  ```
  A3: before kharzul-heart (every relic, level 20): the east side reached: none
  A3: before gf-raiders (every relic, level 20): the east side reached: glass-flats, miragewell
  ```
- **Fix.** Pin that as a test.

**M4. One maps test got narrower than the new design needs.**
- **What.** "After each Sunscorch Brand, the re-armed fights never shut the way home"
  (`test/maps.test.mjs:550-556`):
  - Its fire list now drops the Well Fire at both stages, but the Well Fire stays reachable at both. Only
    the Last Watchfire is out of reach after Kharzul, behind the raiders' chain.
  - Its "re-armed road guards stand beside open gates" line checks the Sun Road only.
- **Repro.** `node review/p12-brandtest.mjs` shows the stronger version passes:
  ```
  after kharzul-heart: fires not reachable from the lair (the M4 test's full list): last-watchfire
  after ashen-warden: fires not reachable from the lair (the M4 test's full list): none
    every Sunscorch road gate whose guard is beaten: sr-toll-chain:open(guard back) dt-rockfall:open(guard back) ds-crew-bar:open(guard back) gf-raider-chain:open(guard back) sg-wall-gate:open(guard back) sv-inner-door:open(guard back)
  ```
- **Fix.** Check every Sunscorch fire except those behind a gate whose fight is still ahead, and check
  every road gate whose guard is beaten.

**M5. Stale Rout text for developers.**
- `ARCHITECTURE.md`:
  - line 209 says `afterBattle` handles "won, routed";
  - lines 215 and 220 still list a `rout` event, and `contact` without `weak`.
- `src/ui/lib/items.js:402-403` mentions "routPack's report" and "the Rout strip".
- `tools/e2e-world.mjs:17-18` says scenario 3 ends "with the spoils strip".
- `HANDOFF.md`'s module table still lists `routSpoils` and `routPack`.

None of this reaches the player.

**M6. (nit) The game points east before the east gate opens.**
- **What.** Zara ("Tallymen took it east over the Glass Flats"), her Humming Crate quest and her raiders
  bounty all go live on arrival in Sandspire, before the Brand of Glass.
- The gate's own hint says when it opens, so this reads acceptably.
- **Optional.** List Sandspire's east gate in the Journal's Story seals (R-maps note 7), or give the Spire
  Guard a line about it.

## Checked and sound

### Saves (the player's rule)
- **Only `core/save.js` touches storage.** It writes only `aethermoor.save.m4.5`, `.m4.5.bak`,
  `aethermoor.m4.5.started` and the shared settings key.
- **The old keys are never touched.** `review/p1-saves.mjs` seeds the v1, v2, m4 and m4.bak saves and the
  m4 started marker. It then drives every path the app shell, the title and Settings use:
  - load and adopt, then commit;
  - export each old save and carry each over;
  - load AETH1, AETH2 and AETH3 codes (M4's export and the live save's);
  - restore, Start over, and settings.

  No forbidden key was written or removed, and all five stay byte-identical.
- **Offers and exports.** `loadGame` offers the M4 save first, even with M4's own started marker set.
  The M4 export decodes to the stored save byte for byte, a unicode name included.
- **Codes.** Every code loads to a sound version-3 save (`saveProblems` finds nothing). The new
  "newer Aethermoor" message for AETH4+ is fine.
- **The shipped file.** `dist/aethermoor-m4.5.html` (the lead's 01:47 build) contains exactly these keys,
  and it matches, byte for byte, a fresh build of the current source made into the scratchpad.
- **Frozen files.** The M2, M3 and M4 hashes match. The build writes only `aethermoor.html`,
  `aethermoor.artifact.html` and `aethermoor-m4.5.html`.
- **Safe strings.** The title, Settings and the carry card pass every save string through `esc()` or
  `textContent`. The new M4 strings hold no markup.

### Migration
- **`toV3`'s `beaten` fill.** It covers fights only and is idempotent. `isBeaten` already counts
  `cleared` and `done`, so the fill only matters once a Brand clears `cleared`.
- **Nothing un-beats a gate.** Nothing deletes `beaten`. Every gate opens on `beaten`, `unlocked`, a
  Brand, or `done` of a once-only fight, so no gate re-shuts after a Brand.
- **The real fixtures.** All 18 migrate to sound, idempotent saves (`p1`). Each lands in front of its own
  node's gate, unmoved, and can walk back or fight on (`review/p9-fixtures.mjs`).

### No save stranded
- **The sweep.** It covers every tile M4 let a party stand on, on every road map, and each of these
  states:
  - every road stage;
  - all guards re-armed;
  - starter-only keys and every key, with the map's locks open (as they are for any save standing past
    them).

  Across all of them: 0 positions stranded (no exit or lit fire even after fighting), 0 in a wall, 0 on
  an exit, and 0 nudged beyond a shut gate. See `review/p2c.mjs`, with its output in
  `review/p2-all-unlocked.out`.
  - That sweep picks its tiles without regard to state. Its FAR-NUDGE lines therefore include tiles that
    M4 would not have let a party stand on in that state, so S2's distances come from `p3b` and `p7`
    instead, which ask M4's own engine.
  - The first run (`p2-sun.out`) flagged tiles inside dune-glass pockets whose lock the synthetic state
    left shut. No real save stands there without the lock open; with it open, those maps show 0 problems
    (`p2-sun-unlocked.out`).
- **`freeSpot`'s own flood is exact.** It reaches exactly what the engine's walk reaches, on every road
  map: interior exits and doors lead nowhere else, and road maps have no ledges (`review/p8-exitflood.mjs`).
- **Roamers never hold a pass.** A roamer can never stand on a gate or guard tile: `roamMask` leaves out
  every gate area and every tile of an entity that is not a pack, whatever its state. A roamer can stand
  next to a gate, but it moves, and walking into it is a fight.
- **Re-armed guards never block** a road, an exit, a chest, an NPC or a sign (`review/p5-rearmed.mjs`).
  The only tiles lost to them are the lairs' own ground as in M4, plus an empty 2-tile pocket behind the
  Hindwood glowcaps.
- **Nothing became unreachable.** Everything a party holding every key reached in M4 it still reaches
  (`review/p6-content.mjs`):
  - with every fight won: 277 things in M4, 293 in M4.5;
  - with every fight re-armed: 272 and 288.

### No fight skipped (fresh play)
- **No bypass.** None of the 18 road-holding fights can be walked round through any map, even with every
  relic, at the stage just before it (`review/p10-bypass.mjs`).
- **One order.** A3 holds across all maps (M3 above), and travel needs a lit fire.

### Rules and UI
- **`caught` reaches the deed.** It goes from `touch()` (`weak`) through `contactFlow`, `startBattle` and
  `createBattle` into `state.ctx.caught`. That state flows through `act`/`foeTurn` to the aftermath's
  `resolveBattle`, where `fightDeedIds` marks `rout` on a win only.
- **No Rout leftovers.** Nothing still expects a `rout` event or report result in the world screen,
  sheets, aftermath, Journal, sim or tests. The sfx, CSS and `showSpoils` went cleanly.
- **Gates.**
  - Walking into or facing a guarded gate opens the guard's card, Tamsin's dialogue included.
  - A gate with no guard shows its text.
  - The sealed hint shows, and the Keep's south-east message is word for word what M4 showed.
- **Auto off.** Every game fight starts with Auto off; only the dev harness passes `auto`.
- **Sprites.** The new gate looks all have `closed` and `open` sprite states.
- **Map lint.** Against M4, the only new note is Brask's own gap at (15,7), which is an entity tile, so
  roamers never enter it.
- **Gate texts.** No typos. The two lair gates point the right way (the glade and the wallow are both back
  down the road, to the east).

### Tests changed in the diff
Each is at least as strong as before, given the design, apart from M4.
- **`gauntlet.test`**
  - The Rout test became the "caught" test, with an exact rout-deed check. It drops `routPack`'s
    determinism check, which `battle.test` and `loot.test` cover.
  - The relic-deed `some()` check is equivalent to the old exact list: the Hearthbrand has no `rout` deed,
    and the positive case is now pinned on the Stillwater Lance.
- **`loot.test`** rolls the same drops through the battle loot.
- **`world.test`**'s weak-pack and hunter tests are stronger.
- **`walk.test`**'s pacing check is sound. The bot is on the target's map when it runs, and `findPath`'s
  800-step limit covers every map.
- **`maps.test`**'s exit test now runs its pairing checks on the gated exits too, which makes it stronger.
- **`migrate.test`** now covers all four older keys.
- **`shell.test`**: the Journal takes `hunts` from the entity's mode, so a road guard with a Grudge waits.
- **`road.test`** (new) and **`frozen.test`** are sound for what they check. `road.test`'s blind spots are
  covered above:
  - a guard's `if` (S1);
  - the one order (M3);
  - re-armed guards (`p5`, no problem);
  - ways round through other maps (`p10`, none).
