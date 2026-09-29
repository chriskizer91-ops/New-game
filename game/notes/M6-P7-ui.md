# M6 P7: the UI (the Gloomfen Marsh) and the browser tests

Package P7 of `docs/M6-SPEC.md` (§5, §8's e2e-world, e2e-battle and e2e-flow lists, A10). No git is run. Files I
edit: `src/ui/screens/{codex,atlas,journal,battle,title,world}.js`, `src/ui/battle/*`,
`src/ui/world/{sheets,story-fx,view,dialogue}.js`, `src/ui/lib/atlas-geo.js`, `src/core/audio.js` (the fen track),
`src/ui/*.css`, `tools/e2e-world.mjs`, `tools/e2e-battle.mjs`, `tools/e2e-flow.mjs` (Page IV); one new test file,
`test/ui-m6.test.mjs` (see "Needs from others"). Private build folder: `scratchpad/m6-builds/p7`.

Status: **done**, but for what waits on other packages (listed under "Needs from others").

## What I made

- `core/audio.js` `fen`: a slow lullaby in A minor on a new `reed` voice (a square through a low band, a breath of
  air as each note speaks, a late vibrato), over a reed drone on A and E that breathes every two bars (leaning to F
  and G under the tune's second half) and a low A pedal; a drowned bell once a pass; frogs on two odd-length drum
  parts: `f` (a croak: a chopped sawtooth, twice, "rib-bit") and `p` (a peeper's rising whistle). 16 bars of 3/4.
  `badNotes()` is empty.
- `ui/screens/title.js`, `screens.css`: the player's world painting (`CUTS['title-world']`) behind the title,
  scaled so its own lettering goes off the top; the party stands on a dark rise drawn on the canvas in front of
  it; without the still (or when it fails to load) the drawn scene plays as before.
- `ui/world/story-fx.js`: the Gloomfen card (`showRegionCard`, `hasRegionCard`: the region still under "Act II ·
  The Gloomfen Marsh", a drawn Murkway backdrop when the still is missing, a line, "Walk on"); the fourth council's
  title card (eight coals, every chair filled, four soot-sealed boxes); the third council's card names the fen stair
  open (and the Blackwater's line sits before it); `chapterEnd(game, 'gloomfen')`: "End of Act II", all eight Brands,
  Act III named (not open), "All eight coals are lit. The Hollow Council waits.", nothing opened.
- `ui/screens/world.js`: the Gloomfen card hook (`transition` → `regionCard`: the first walk into a Gloomfen map from
  outside, kept in `flags.seen['card:gloomfen']`, so once a save); the fog (`updateDark` → `view.setFog`: thick to
  the light radius of 3 without a fog key, thin once the fog lock is open; the dark vignette stays for dark maps);
  the council-4 title card; the `paid` toast ("Paid 120 gold", from `dialogue.priceText`); the bog's hazard line
  ("The bog sucks at your boots: 3% HP each", held 1.4 s so the facing prompt does not wipe it; short enough for a
  360 px prompt line, the drift's and ichor's too); `LOCK_VERB` for bog, fog, blackwater, witch-ward; the test
  seam's `state()` has `fog` ('thick' | 'thin' | '') and `sight`.
- `ui/world/view.js`: the fog overlay (a 128 px dithered mist texture, soft dithered holes round the party and the
  lights; laid once, then mended in two small patches a step); `GATE_KIND` for the eight new gate looks
  (`toll-bar`, `leech-ford`, `ward-gate`, `hung-lanterns`, `hag-fence`, `barge-planks`, `water-gate`,
  `choir-screen`) and `LOCK_KIND` for `blackwater`, `witch-ward`, each by P5's sprite name; until P5's sprites land
  each borrows the nearest look there is (`FALLBACK_KIND`: gate, bramble, thornwall, barred-gate, chasm, rune-seal).
- `ui/world/sheets.js`: the bog's and the fog's soft costs in words. `ui/world/dialogue.js`: `priceText` exported
  (gold, silver, tonics, materials by name).
- `ui/screens/codex.js`: the riddles of Page IV's fourteen relics. `ui/lib/atlas-geo.js`: `framed(region)` (a 3:2
  view round a region's map lore and hearths) and the `gloomfen` view. `ui/screens/atlas.js`: its button, icon,
  sealed note ("opens once the Council has sat a third time"); five views sit three and two on a phone.
  `ui/screens/journal.js`: Gretch's Bogmire board, the Gloomfen road (the causeway dry after the Brand of the Deep),
  the fog in the soft-lock text.
- Battle (`ui/battle/*`, `ui/screens/battle.js`, `battle.css`): Hexed and Rotting as words and tints on the hero
  plate; the hold looks "Led away" (a lamp drifting), "In the river" (ripples) and "Swallowed whole" (bubbles), the
  captions naming who holds ("in the river, put there by Hodge"); the Leviathan's dive under water ("Dived · out of
  reach", a wake of foam and rings, its tap box kept 44 px); a heal halved by rot (float and log); a hexed roll's
  "disadvantage: hexed" in the tray; a `ko` text as a caption; the fog maps' backdrops get a drifting mist layer on
  the stage.
- `tools/e2e-world.mjs`: 18 (Page IV open: 14 pockets from the data, its reward, the fen-stair road note, no sealed
  tab), 21 (the Gloomfen keeps its padlock until the third council) and 27 (the third council's card names the fen
  stair) moved to M6's truth; new 28-39: the fen stair (sealed, then open, the Gloomfen card once, the fen track, the
  Atlas view), a bog step (the cost, then none with the Bogstriders), Willowmurk (the fire, Elder Moss, the Journal's
  quests, Gretch's board), Hodge's bar (the price chip, pay and the toast, the bar lifts, a poor party sees it shut,
  the game with its odds and checks, once a day), Tamsin's duel card and her fall (then gone from the bridge, won or
  yielded; the Ladder's rumour of the man on the barge absent before, there after), the Lanternfen's fog (thick, then thin with a key; the Keys tab), the Lantern Mother's card, the long
  boardwalk (sealed, open after the Brand), the Drowned Belfry's dark, the causeway home through `keep-sw`, the
  fourth council (its card, the end of Act II, opens nothing), and the performance of the Lanternfen in thick fog and
  the long boardwalk.
- `tools/e2e-battle.mjs`: lantern (three phases, both pieces snapped), led-away (by her, then back in the line),
  leviathan (the dive, out of reach, the swallow), hodge (Toll Is Due at the strongest hero, the shove "In the river",
  his words when he sits), fen (a hexed and a rotting hero, a heal halved by rot).
- `tools/e2e-flow.mjs`: Page IV in the carried-over M5 profile (tab, 14 pockets, "0 of 14 claimed", reward, the
  road note), and `fen` among the tracks played. B's Ladder check moved to M6's truth: an entry with an `if` shows
  once it holds (the man on the barge, after Tamsin's fall), so the Ladder must be the rules' `ladder()` for the game,
  id for id and state for state, every entry without an `if` on it, the rumours shown as silhouettes (it was "every
  LADDER entry"; it now also names what waits: "man-on-the-barge not yet").
- `test/ui-m6.test.mjs`: 9 unit tests of the pure UI helpers (the fen track's notes, the third and fourth councils'
  cards, the region card table, the Atlas view's framing and spacing, Page IV, the battle model's Hexed/Rotting/hold
  phrases, the log lines, `priceText`).

## Needs from others

- **Lead:** `test/ui-m6.test.mjs` is a new file outside my list (the pure helpers' tests); keep it, or fold it into
  `test/shell.test.mjs`. Not in my list either, not touched: `tools/e2e-codes.mjs` (I only ran it).
- **P4:** (landed) `ENCOUNTERS['tamsin-rotbridge'].leaves`: e2e-world 32 checks she is gone after a yield and her fall.
- **P5:** the sprites named in `view.js` (`GATE_KIND`, `LOCK_KIND`): until they land the view draws the fallback looks.
  The Gloomfen props (`wreck`, `marsh-lights`, `black-barge`, `lantern`, `sleeping-child`, `crane`, `diving-bell`,
  `sealed-chest`, `bell`, `sleeper`, `barge`) and sign looks (`ward-stone`, `ward-stone-dark`, `bootprints`) draw
  as a sign post until they are in `OBJECT_KINDS`/`OBJECT_STATES`.
- **P6:** the battle stage draws its own mist over the fog maps' backdrops (`lanternfen`, `misthollow` and any map
  with `fog: true`), so the backdrops need not paint low mist. (`art-keys.test` is green now.)
- **Lead (e2e-flow's harness, not mine to change):** under load, the documented headless `file://` storage quirk
  (docs/M45-STATUS.md §3.1) now shows on `page.reload()` too: in one run of the flow, "after a reload the title
  continues this milestone's save" failed in one profile per size (phone M4.5, laptop M5; the other six passed), with
  only the M6 keys gone after the reload (the older saves are re-seeded by the init script on every navigation, so the
  whole origin's storage was dropped). The same checks passed in the run before and the run after. Serving the page
  over `http://` (the M4.5 note: an http origin never showed it) would end it; a player's browser keeps `file://`
  storage on disk.

## Where I am

(results below are the private build of 22:52, the shared tree as it stood)
