# M5 P3 story: the Ironspire's people, quests and scenes

Package P3 of `docs/M5-SPEC.md` (§3.1, §3.5's scenes, §3.6, §3.7's shops). No git was run. Files touched:
`src/data/npcs.js`, `dialogue.js`, `quests.js`, `ladder.js` (comments only), `letters.js`, `shops.js`,
`test/story.test.mjs`, `test/story-data.test.mjs`. `src/data/maps/keep-hall.js` is unchanged: the scaffold's
`council-3` trigger already has the spec's guard (a test now pins it). Private build: the `m5-p3` folder in
this session's scratchpad (next to `m5/`).

**Status: done.** Every "STUBS from the M5 scaffold" marker in my files is gone.

## What I built

**People (§3.1).** Every Ironspire person has a talk table, and the givers keep M4's order: the thank-you
first (it sets the met flag too), then the first meeting while the met flag is unset, then story beats, then
"the world notices" (Page III relics), then the lines that repeat. Everyone always answers.
- **Mother Wynn** (Peak's Veil): the bell (`bell-of-veil`). Any line that meets her also sets `highfold-open`
  (the Highfold gate; the map's hint says "once you have spoken with Mother Wynn"). The Abbess at rest:
  `wynn-ring` ("Ring the bell." / "Not yet.") rings it with her and thanks you (the Veilbell). A bell rung from
  its rope gets `wynn-thanks` instead. Either can be the first meeting. After the Brand of Frost she rings for
  Aurel. Notices: the Veilbell, the Drowned Censer, the Rime Crozier.
- **Brother Kesh**: Frostmere's history in three nodes (the lake and Hush; Aurel; this spring), like Brother
  Cinder's, and advice that changes with the Brands (frost and the hammer for Mother Anvil; fire and "the gaps
  in the hymn" for the Abbot). After the Brand of Frost he hints he could leave with you one day (no
  recruitment). Notices: the Windstep Boots, the Hushweave Cowl.
- **The Novice**: flavour that changes with the bell and the Brand of Frost; notices the Veilbell.
- **Thane Brundar** (Ironhold): `brundar-rune` gives the Rune-Key (`{ give: 'thanes-rune' }`, sets
  `rune-given`) once Tamsin's duel is won (`beaten`) or yielded (`tamsin-yielded-3`); it doubles as a first
  meeting. The Sentinel's Oath: Harrow's journeyman is his sister's boy; his thank-you promises to tell the
  Council what Harrow took. Beats: "shift the girl off my stair", the north gate after the Brand of Iron, his
  summons, his line after the council. Notices: his Rune-Key, the Worldforge Hammer, Ironwall.
- **Durra Ironhand**: "Buy." opens `shop:durra`; Harrow's rival ("He was better. I was nicer."). Notices: the
  Worldforge Hammer, the Ironvein Bracers ("I know whose hand made them"), Harrow's Runestaff.
- **Hold Guard**: flavour through the rune and the Brand of Iron; notices Ironwall.
- **Rook** (the stockade): his first meeting lays out the Tallymen's plan (every relic counted for one buyer,
  "the Smith", orders signed with a U; this spring, "stop stealing, start cutting"); the ledger's thank-you
  reads it ("One heart, cut out whole. Deliver on the thaw.": the Smith wants Hush's heart) and pays 250 gold
  and a frost opal. Notices: the Cutter's Pick, a Tallyknife. A hint he could travel one day.
- **Captain Ysolde**: the Stormwatch board ("Turn in bounties." / "Read the bounty board.", like Zara); sets
  `met-ysolde` (the Journal reads it); the north gate before and after the Brand of Iron. Notices: the Windstep
  Boots (Rhune was her sergeant), the Roc-Feather Cloak.
- **Quartermaster Quill**: "Buy." opens `shop:quill`; notices the Trollhide Mantle.
- **Brother Aurel** (`rime-abbot`, a new NPC entry for the name only, like the Ashen Warden): speaks after
  his fight.
- **At the Keep**: Isolde's `isolde-next` and Hilda's `hilda-ironspire` now point east (the postern is open),
  and the second council's last line says "the east postern opens at dawn. Ironspire first." (M4 said "choose
  in the morning", and in M5 there is nothing to choose). Isolde's `isolde-gloomfen` after the third council;
  her notice of the Rune-Key. The east gate guard: shut, then open after the second council ("Wrap up warm.
  Then warmer."), then a writ from Stormwatch once the Ironspire is won. Fenwick: five coals, six coals (after
  the council he "stopped sleeping in the hall"), and he flinches at the Hushweave Cowl.
- **Hilda**, a giver now: her thank-you comes first, whatever you wear (M4 had her notices first). `hilda-hammer`
  has the spec's line exactly and pays 300 gold and 2 embers. Her news of her brother: `hilda-harrow` ("he's
  somewhere wet"), then after the third council a letter, once: "Don't wait up, Hild." Notices: the hammer, the
  Anvil Heart, the Runestaff, the Ironvein Bracers ("Why is my brother making Tamsin gifts?").
- **Brother Ivo** (Fawnrest): a line once the Highfold path is open (only after his own first meeting, so
  `silent-bell` still starts).

**Scenes.**
- `ARRIVALS`: peaks-veil, ironhold, stormwatch, frostmere: party lines only (no effects, no choices). At
  Frostmere Alondra hears the heartbeat she "thought was mine" since Fawnrest (the brief's Listener).
- `tamsin-ironhold` (the duel's talk): the soot letters carry Harrow's mark and she means to ask him why he
  writes to her. "Try again." starts the fight (the walk bot's `/^Try/`), "Not yet." leaves.
- `AFTER`:
  - Tamsin: the win (`tamsin-ih-win`) leaves the bracers on the stair and has the spec's line, "He was here. He
    left the fire burning so we'd think he'd be back." ("I've a letter to answer."); the yield (`tamsin-ih-yield`)
    sets `tamsin-yielded-3` ("If a letter comes for you with soot on the seal, don't answer it. I did.").
  - Mother Anvil: first win with the hammer claimed, or shattered; a rematch line.
  - The Rime-Abbot: Brother Aurel's last words ("Tell little Wynn I kept it."), then one choice, "Look down.",
    into **Hush's scene**: the Sleeper under the ice, lit from within, its heart slowing. Brother Kesh (if met)
    follows you down and names it; otherwise the narrator does. "Going back to sleep." "...Or tired." A rematch
    line.
  - The Drowned Abbess ("Ring for us."), the Cutter-Chief's ledger, the journeyman at rest: each points at its
    quest's giver and plays only until that quest's last step.
- `RESTS`: `veil-night` at the Cloister Fire once the bell has rung (once).
- `LOOKOUTS['pv-lookout']` (P2 placed `pv-lookout`): Peak's Veil, the Rockslide Pass, the Highfold, the Iron Stair.
- **The third council** (`council-3`): sets `council-3-done`, claims `ironspire-waking`. Brundar takes
  Ironspire's chair and confesses: Harrow robbed Ironhold of the plans for the Worldforge, kept under the hall
  a thousand years, and he sealed the Deeps to hide it. Qasim guesses the soot-sealed box (it sits on Brundar's
  table, unopened: the Hollow Council's gifts). "Ask about the Worldforge." (Fenwick: "I knew the smith who drew
  those plans"; Hilda: only her brother could build it; Alondra: the Sleeper's heart beats slower since the
  sixth coal) or "Let the Council talk." Both end with `{ end: 'ironspire' }`, and the scene names the Gloomfen.
- **Letters** (they count coals: one order): Iron: "Five coals, and my hammer off my first daughter. Keep it,
  little Warden. I have a bigger one now. Give Hild my love. — U." Frost: "Six. Did you feel it slow, down on the
  ice? Every coal you light, it beats a little slower. Keep going, little Warden. — U."

**Quests (§3.6).** Ids, givers, starts and rewards are the spec's.
- `ironspire-waking` starts on `sunscorch-complete`, first step the second council. "Win the Thane's leave" is
  split in two, "Face Tamsin on the Deeps stair." (target `tamsin-ironhold`) and the rune-key (target `brundar`),
  so the Journal points at her first. Every step between the councils also closes with a Brand (M3/M4's rule).
  Reward `{}`: the Rune-Key comes from Brundar's scene, and the council claims it.
- `bell-of-veil`, `harrows-hammer` (start `{ owns: 'worldforge-hammer' }`), `rooks-ledger`, `sentinel-oath`.
- The Stormwatch bounties (giver `ysolde`): The Rime Wolves of the Pass (90), The Switchback Trolls (120), The
  Frost Road Pack (120), The Thunder-Roc of the Highfold (160).

**Shops (§3.7).** `durra`: the consumables (Frost Draught first: the Deeps burn) and the Frost Opal, Moss Agate,
Glass Pearl. `quill`: the consumables (tonics first, for the ice road).

**Ladder.** The eight posters were right; the `missing-smith` rumour stays (Harrow is still missing).

**Lore I settled** (so the other packages stay consistent): Aurel was the abbot; thirty winters ago he took the
choir down the island shrine's listening-well to sing Hush to sleep. The old Abbess would not toll the bell for
men who might come up, so it has been silent thirty years (the map's bell-rope sign says so too), and she censed
the drowned every night (P4's lore). This spring the Tallymen's ice-saws cut round the island; the ice broke and
she drowned with her own choir; Kesh came up alone. Wynn has been abbess since spring. The Windstep Boots were
Brother Oswin's (he crossed the slide and was never seen again). The journeyman is Brundar's sister's boy.
Harrow calls Mother Anvil his "first daughter", and his sister "Hild".

**Voice.** 103 new nodes, 199 lines, mean 97 characters, max 112 (one line, 119, repeats the map's bell-rope
sign word for word; M3's max was 117, the cap 140). I tightened 44 lines after measuring the box at 360 px (its
text column is 196 px, so a 108-character line takes five rows; it fits).

### New story flags (all set in my data; nothing added to `RULE_FLAGS`)
- Met: `met-wynn`, `met-kesh`, `met-brundar`, `met-rook`, `met-ysolde`.
- Steps and gates: `highfold-open`, `bell-rung-veil`, `veil-thanked`, `rune-given`, `smith-told`, `ledger-given`,
  `hammer-shown`, `council-3-done`; also `tamsin-yielded-3` (the rules set it too, through `yields`).
- Once-only: `heard-gloomfen`, `heard-hild`, `anvil-fell`, `abbot-fell`, `veil-night`. Lookout: `longwatch:peaks-veil`.

## Tests (mine)
- `test/story-data.test.mjs`: 15 -> 20. `'ironspire'` joins the allowed `end` values. New: the Ironspire's
  people (always answer, met before they notice, each notices a Page III relic, Durra's three gems, Quill's
  stores, the Stormwatch board's four bounties); the quests (ids, givers, starts, rewards, every step between the
  councils closes with a Brand, the spec's fixed flags are set, meeting Wynn always unbars the Highfold, the
  Rune-Key only from `brundar-rune` under the duel's guard); the beats (arrivals, the Champions' unconditional
  first wins, Tamsin's line and yield flag, Hush named by Kesh or the narrator with the heartbeat slowing, Hilda's
  line and her thank-you first, the bell only after the Abbess rests); the third council (exact guard, never
  `once`, the claim, Brundar at the table, `{ end: 'ironspire' }` on every path, names Gloomfen, Harrow, the
  Worldforge); the letters count coals.
- `test/story.test.mjs`: 16 -> 25, in M4's manner: the bell (with Wynn, from the rope, out of order); the ledger
  (happy path, out of order, a claim needs every step); the oath and the Rune-Key (a win, a yield, the key as a
  first meeting, the key before the thanks); the hammer (first even when wearing Cinderfang, a shattered hammer,
  the letter once); Tamsin at Ironhold; the main quest step by step, straight down, the third council through
  `enterMap`, replay until done, both councils in order for a Warden who skipped the second; the Champions and
  Hush; Kesh; Ysolde's bounties, the shops, 20 notices, the Brands' lines, Ivo.
- **Mutation check:** 16 mutations, one at a time, each file restored byte for byte after. **16 of 16 caught**
  (no fight choice for Tamsin, a thank-you without its met flag, a notice before a first meeting, a council path
  without its card, an arrival with an effect, a first meeting that keeps the Highfold shut, the council trigger
  `once`, the Rune-Key before the duel, a misquoted hammer line, an uncounted letter, a ledger never taken, Isolde
  pointing east after the third council, Hush unnamed, the bell before the Abbess rests, Hilda's notices before her
  thank-you, Ysolde without her board). The run found one real bug, now fixed and tested: a Warden who never spoke
  to Isolde between the councils heard her stale "east postern" line after the third council.

## Results
- My two files: **45 / 45 pass**. My files lint clean.
- `npm test`, the whole tree with everyone's work in progress (final run): **373 / 376**. The three failures are
  not in my files: `art-keys` (the M5 foe art keys and backdrops, expected until P6 lands) and `data.test` "M5
  encounters: the nineteen Ironspire fights..." (P4, mid-edit). Earlier runs also showed P1's save version 4 and
  P2's `iron-stair/is-wall-plaque` on a tree tile; both pass now.
- `npm run lint`: my files clean; the tree's problems are in `test/paint.test.mjs` (`Buffer` not defined, an error)
  and `tools/paint-refs.mjs` (two unused variables), the painted-art files, not mine.
- **Build size (for the lead):** the tree's plain build now **fails** the A6 gate: 3282 KB at 07:17, up from 2585 KB
  at 07:14; the jump is `src/ui/assets/paint`. My text is a few KB of it. My private build is therefore the
  `--minify` one (3087 KB, which only warns), made for checking only.
- **UI check on the private build at 360x740** (my own Playwright driver, `p3-work/ui-check.mjs` in the scratchpad):
  walking through the Great Hall's door with both Ironspire Brands plays the title card "The Council sits a third
  time", then the council (Isolde, Thane Brundar, Qasim, Fenwick, Hilda, Alondra), then P7's end card "The
  Ironspire is yours · To be continued · Six coals in the Eternal Hearth · The Gloomfen Marsh opens in the next
  chapter."; it sets `council-3-done` and claims the main quest. Mother Wynn's first meeting unbars the Highfold.
  Tamsin's talk offers "Try again." / "Not yet.". Aurel's last words lead into Kesh naming Hush. Every line fits on
  screen (tallest box 190 px), no horizontal scroll, no page errors.

## Needs from others (I did not touch their files)
- **P7 UI / lead: the end card.** P7 has drawn it already, and its words are the ones I want: kicker "The
  Ironspire is yours", title "To be continued", line "Six coals in the Eternal Hearth", the Day / Relics / Brands /
  Pages row, the chip "The Gloomfen Marsh", and "The Gloomfen Marsh opens in the next chapter." Optional, to echo
  the council's last lines: add "The Blackwater still holds the causeway." before that last sentence.
- **Lead / P7 (`ui/screens/world.js` `afterReturn`):** it plays the Brand banner, then the pending Unsmith letter,
  then the after-fight lines. The spec (§3.5) has the second letter *follow* Hush's scene, so play the after-fight
  lines before the letter. My letters read either way, but "my first daughter" and "Did you feel it slow" land
  better after their scenes. This also reorders M3's and M4's Champions (last words, then the letter), which I
  think reads better, but it is your call.
- **P5 overworld art:** a dialogue bust for the new speaker `rime-abbot` (named Brother Aurel: a very old abbot,
  frost-rimed, grey cowl) in `NPC_LOOKS`; without it he gets a hashed villager face. The nine §3.1 NPCs use their
  ids as art keys (already on P5's list).
- **P2 maps (optional):** `pv-bell-rope` is a `sign`, so the bell rings with Wynn (tested). If you make it
  `kind: 'bellframe'` (same id, same `if`), it opens `DIALOGUE['pv-bell-rope']`, which shows your sign's exact text
  and offers "Ring the bell." once the Drowned Abbess rests; Wynn thanks you after (also tested). For the walk bot:
  the Deeps' rune-seal needs the Thane's Rune-Key, so talk to `brundar` once Tamsin's duel is done or yielded (his
  talk plays `brundar-rune`, no choice needed; its effect gives the key). Tamsin's fight choice starts with "Try",
  and the council's exit with "Let".
- **P7 e2e (for Ironspire scenarios):** first entries to peaks-veil, ironhold, stormwatch and frostmere play
  arrival lines. Choice texts: "Try again." / "Not yet." (Tamsin); "Ask why the ice broke.", then "Ring the bell." /
  "Not yet." once the Abbess rests (Wynn); "Ask about Harrow." (Brundar); "Buy." (Durra, Quill); "Turn in bounties."
  / "Read the bounty board." (Ysolde); "Ask about Frostmere." / "Ask for advice." (Kesh); "Ask why he left the
  Tallymen." (Rook); "Look down." (after the Rime-Abbot); "Ask about the Worldforge." / "Let the Council talk."
  (the third council). The second council's last line changed (see above).
- **P4:** my lines follow your current relic lore (the boots' lost monk, the bracers as a "gift" Durra knows the
  maker of, the Abbess censing the drowned for thirty years, Aurel's crozier). Tell the lead if any of that changes.

## Left undone
- No Hilda line naming the gem you set (a spec stretch item).
- The review's optional nit about Sandspire's east gate (a Spire Guard line) is M4.5's, outside this package.
