# M5 P7: the UI (the Ironspire Peaks, and Hush)

Package P7 of M5 (spec §5, the battle parts of §4.2, the e2e parts of §8). Only P7's files are edited.
Private build: the scratchpad folder `m5-p7` next to this working copy (`../../m5-p7` from `game/`).

## Status

Done. The battle UI for the three statuses (with node tests), the peaks track, Codex Page III, the chapter
cards, the Atlas and Journal updates, the soft-lock text, and the e2e scenarios (battle: anvil, abbot,
burrow, charm; world: 21-27, and 18/19 moved to M5's truth). Full runs are below.

## What I built

**Battle (spec §4.2, §5), built from the engine state the lead's rules produce:**
- `ui/battle/model.js`: `applyStatus` handles `op: 'release'` (and keeps an add's `source` and `label`);
  pure helpers `heldStatus`, `untargetable`, `isCharmed`, `isSunk`, `holdInfo(u, nameOf)` (label, by whom,
  turns left) and `withStatusSource(ev, state)`. The engine's `add` event now carries `source` and `label`
  itself; `withStatusSource` stays as a fallback that fills them from the state the events lead to.
- `ui/battle/party.js`: a held hero leaves the line (its figure sinks and fades; a hole marks where it
  stood: ice-rimmed for "Held under", feathers drifting for "Carried off") and its card shows a badge
  `.bt-hero-hold`: the label, "by <swallower>", "N turns left" (`.bt-hero.held`, `data-hold`). A charmed
  hero's card is ringed pink with a "Charmed" tag (`.bt-hero.charmed`). Both are in the card's aria-label.
- `ui/battle/stage.js`: `sink(id, down)`: a burrowed foe goes down into the floor (all but its top fifth
  shows, over a mound of rubble with trickling grains) and comes back up at its turn; `geom()` follows it
  down so its intent bubble sits on it. It never gets a target marker (the rules never list it).
- `ui/battle/hud.js`: the burrowed foe's plate says "Burrowed · out of reach" (`.bt-foe.sunk`); on the
  Initiative Ribbon a held hero's turn is iced over (`.held`) and a charmed one's ringed pink (`.charmed`).
  `float`: a floating label stays inside its row (a long "Carried off" over the edge hero no longer runs
  off the stage).
- `ui/battle/player.js`: holds, releases, dives and surfacing animate (floats "Held under", "Free!",
  dust); a charmed hero's played turn (`move` with `charm`) gets a pink banner "Charmed · turns on X".
- `ui/battle/log.js`: "Pip is held under by the Rime-Abbot"; the lost turn, the release and the charm's
  trigger are left to the engine's own text lines (no doubles); a charmed move logs its own text.
- `ui/battle/menu.js`: the Analyze sheet names a hold by its label and holder.
- `ui/screens/battle.js`: a tap on a held hero or a burrowed foe while aiming says why it cannot be
  targeted; refreshing a foe keeps its sink state. (It also takes the harness's `auto` mount flag, the same
  lines as Milestone 4.5's final fix.)
- `ui/battle.css`: the M5 block at the end (and its laptop sizes after it).

**Music:** `core/audio.js` `peaks`: a slow horn call in D minor (a new `horn` voice: a sawtooth that scoops
up into the note through a blooming lowpass, over a sine), its echo a bar later off the peaks, a low drone
(pad and a triangle pedal), a far bell in the quiet bar, and wind (a new drum token `w`: a looped noise
gust) on a 38-step part that drifts against the 128-step call. `badNotes()` is empty. The mountain maps
play it (e2e-world 21 hears it on the Rockslide Pass).

**Codex:** Page III is open (tab, progress, reward "The Ironspire Accord"); new riddles for Nos. 39-52 in
the M4 manner (a line, then where to look); an open page whose road is still shut says what opens it
(`ROAD_NOTE`: the Ironspire's "once the Council has sat a second time: the Keep's east postern").

**Chapter cards (`ui/world/story-fx.js`):** `chapterEnd(game, act)` (pure view model) and
`showToBeContinued`. `act2`: with the east postern open (council-2-done) it says "The Keep's east postern
stands open. The Rockslide Pass climbs to Peak's Veil." and "Gloomfen opens in the next chapter.", with the
Ironspire chip lit "open". New `ironspire` (the third council's `{ end: 'ironspire' }`): "The Ironspire is
yours · To be continued · Six coals in the Eternal Hearth", Day/Relics/Brands/Pages, the Gloomfen chip,
then P3's line "The Blackwater still holds the causeway." (while the Gloomfen is sealed) and "The Gloomfen
Marsh opens in the next chapter." `playCouncil(ctx, { third: true })` is the third council's title card
("The Council sits a third time"); the world screen now plays it.

**Atlas:** the Ironspire view (button "Ironspire", title "The Ironspire Peaks", a two-peaks icon for its
region marker); a sealed region's note says what opens its road (the Ironspire: "The Keep's east postern
opens once the Council has sat a second time."), and its quoted road texts are the roads into it only (not
Stormwatch's inner gate). Four view buttons go two by two on a phone. The padlock comes off with the
second council through `regionOpen` (the postern's gate). A region's own view names its fireless places
(Frostmere Lake). Labels: at the same state a place's name outranks a plain fire's, and a label that would
overlap tries the other side of its marker (inside the frame) before it hides, so Ironhold Fortress reads
above its fire, clear of the Deeps Furnace below it.

**Journal:** Captain Ysolde's Stormwatch board (read once `met-ysolde` or Stormwatch visited; it stays out
until the Ironspire opens); the board of the region you stand in comes first (from the Stormwatch board,
hers leads); "any board pays for any bounty"; the story seal "The road to the Ironspire Peaks" (shut:
"Sealed until the Council has sat a second time.", open: the postern line); rewards read "the Veilbell",
"a Frost Opal".

**Sheets:** a soft lock's cost comes from its data (the drift: "Without a key the cold bites: 3% ...").

**Gate looks (`ui/world/view.js` GATE_KIND):** no change. P2 used only existing looks; its nice-to-haves
(an `ice-blocks` look for `fr-saw-barricade`, a frozen door for `fb-chapel-door`) need P5's sprites first.

**Tests (`test/shell.test.mjs`):** new: holds/charms/burrows from the display model; status events
(release, trigger, source and label); the log lines; a real hold played through the display model; the
peaks track in the list; the second and third councils' Atlas, Codex road note and chapter cards
(`chapterEnd`, with the Blackwater line).

**e2e-battle (`tools/e2e-battle.mjs`), new scenarios** (`--only=anvil,abbot,burrow,charm`):
- `anvil`: Mother Anvil through three phases with the Worldforge Hammer and the Anvil Heart snapped off
  (M4's `championFight`, now with a level from the encounter's data).
- `abbot`: the Rime-Abbot holds a hero under (360 wide): the card reads "Held under / by Rime-Abbot / 2
  turns left", the aria-label says "out of the line"; then the hold is let go early (a `release`, not the
  turns running out) and the card drops it; the log names the holder and why the hero is free. The
  harness's fights are deterministic, so the scenario first finds a starter, level and seed with such a
  release by playing the same fight through the rules (`harnessFight`, `findFight`), then plays it.
- `burrow`: Kharzul's exact Burrow (360 wide): the plate "Burrowed · out of reach", the hit box "cannot be
  targeted"; with Auto off on a hero's turn while it is under, Attack has no target (or, with other foes,
  aiming skips it and a tap on it says why); it comes up at its turn and its forced blow (`then`) follows.
- `charm`: the Wisp-Queen's Beguile (1280 wide): the card's "Charmed" tag and label; its turn played as
  "Charmed · turns on X" (or a friend's blow wakes it); the log tells the charm's end.
- Helpers: `pauseWhen(page, pred, name, { arg, probe, hurry })`, `armPause`, `waitPaused` (pause on the
  next event a predicate picks, and read the page while paused); `blocked()` for a scenario whose foes are
  still stand-ins; `open()` presses Auto for `&auto=1` if the harness did not.

**e2e-world (`tools/e2e-world.mjs`)**: first brought in Milestone 4.5's final test fixes verbatim (the file
matched the main copy's before my scenarios). Then:
- 18 (replaced one for one, as M5 changes the truth): Page III is open (pockets from the data, "0 of 14",
  the Accord greyed, the road note), an unsighted Page III pocket opens; Page IV is the sealed page.
- 19 (replaced one for one): the Act II card now opens the east postern and names Gloomfen next.
- 21: the east postern sealed (its text and hint), the Atlas's Ironspire padlock and its note; after the
  second council it opens onto the Rockslide Pass with the peaks track; the Atlas's Ironspire view (every
  Ironspire fire, the padlock off, place names on a laptop, the view bar fitting at 360).
- 22: rest at the Cloister Fire; Mother Wynn (Highfold open); with the Abbess at rest the bell rings, the
  Veilbell's card, the quest claimed and done in the Journal.
- 23: the chasm (`rp-crevasse`, A reads "Cross") ✗ then crossed with the Windstep Boots; the ice wall
  (`is-ice-wall`, A reads "Melt") melted with the Anvil Heart; each approached from its road's side
  (`reachBy`), open for good, stepped on.
- 24: Mother Anvil's pre-fight card: Champion, both pieces glinting (the hammer held, the heart worn), the
  Brand of Iron.
- 25: the Ironhold Deeps dark for a Stillwater party, lit by the Rime Crozier.
- 26: the Frost Road at 4x throttle along its longest open stretch: p95 frame JS <= 16 ms and <= 40
  drawImage (the M5 gate).
- 27: the Stormwatch board opens the Journal with Ysolde's bounties first; the Keys tab's Ironspire road;
  the third council's title card, its scene and its card ("The Ironspire is yours", the Blackwater line
  before the Gloomfen's, 6/8 Brands, fits 360 and 1280, 44 px button); `council-3-done`.

## Test results

All on a build of the current tree (07:27, after the world screen's after-fight order and the lock verbs),
into the private folder above:
- `npm test`: 376 tests, 375 pass. The one failure is `test/art-keys.test.mjs` "no backdrop
  rockslide-pass" (P6's new backdrops). `test/shell.test.mjs`: 15/15.
- `npm run lint`: clean (exit 0); two unused-variable warnings in `art/map-sprites.js` and `art/scenes.js`
  (not mine).
- `tools/e2e-world.mjs`: **passed**, all 27 scenarios at 360 and 1280, 370 checks, nothing blocked (the
  third council's title card and the Cross/Melt verbs now land). Performance at 4x throttle, frame JS p95
  and drawImage max: Hearth Road 2.1/14 (phone), 2.8/15 (laptop); Glass Flats 1.9/9, 3.2/12; **Frost Road
  3.4/15, 2.6/20** (the M5 gate is 16 ms and 40).
- `tools/e2e-battle.mjs`: **22/22 passed**, with anvil (phases 2+3, both pieces snapped), abbot (hearthbrand,
  level 9, seed 1: one hold, freed early), burrow (seed 5: burrowed, a hero turn while under) and charm
  (seed 3: turned on a friend).
- Screenshots: `m5-p7/world-final/`, `m5-p7/battle-final/`.

## What is left

Nothing of P7's. Open items are other packages' (below).

## Notes for the lead

- **Painted ground (P8):** e2e-world and e2e-battle read no pixels anywhere (no `getImageData`), so the
  painted Keep and Thornhollow and the prologue stills change none of their checks. The drawImage gates
  are on the Hearth Road (11), the Glass Flats (17) and the Frost Road (26), none of them painted.
- **After-fight lines before the letter:** e2e-world's forced wins are Sneck (1), Briarmaw (7) and a road
  gate's guard (20); none has an after-fight scene, so no scenario waits on a letter across the new order
  (7's letter still follows the crownwalls). The full run on the new tree passes.
- **e2e-flow and e2e-codes:** yours; I did not run them.
- One build (07:23) caught `art/map-sprites.js` mid-edit (`IRON_BEASTS` used before it was written), which
  showed as console errors in e2e-world; a rebuild after the edit is clean.

## Needs from others

- **P6 (icons):** `statusIcon` for `burrowed`, `swallowed`, `charmed` (they draw the neutral token now).
- **P6 (backdrops):** `test/art-keys.test.mjs` fails on "no backdrop rockslide-pass" (the new map
  backdrops).
- **The lead, for review:** `tools/e2e-battle.mjs` `harnessFight` repeats `tools/dev-battle-entry.js`'s
  levelling (newGame, `dev-level:<seed>` XP, full HP/MP) so it can find a fight by the rules; keep the two
  alike if the harness changes.
- Landed, thank you: the third council's title card and `LOCK_VERB` for the new locks (`ui/screens/world.js`;
  e2e-world 23 and 27 check them), and `source`/`label` on the status `add` event (`rules/combat.js`).
