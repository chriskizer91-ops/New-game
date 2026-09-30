# Milestone 7 status: the Hearth Below

Act III: the Hollow Council, the Unsmith and the three endings, built road-first. The contract is `docs/M7-SPEC.md`
(Part A overrides Part B). This page records what shipped, the gates with their numbers, and the known issues.

- **Delivered as:** `dist/aethermoor-m7.html`, one self-contained file, sent **zipped** (`aethermoor-m7.zip`, 21.7 MiB):
  the HTML is 30.4 MiB, past the 30 MiB a file sent in the chat may be (spec A6). The player unzips it (a phone's
  Files app does it with a tap) and opens the HTML as before. It sits alongside the frozen `dist/aethermoor-m6.html`,
  `-m5.html`, `-m4.5.html`, `-m4.html`, `-m3.html` and `-m2.html`. Milestone 7 writes only its own save
  (`aethermoor.save.m7`); it reads the M6, M5, M4.5, M4, M3 and M2 saves and offers the newest as a carry-over.
- **Branch:** `claude/cool-ptolemy-uc93gg`.

## 1. What shipped

| Item | Shipped |
|---|---|
| The Opening | Once the fourth council has sat, the Great Hall plays the fifth: the four gifts the Unsmith sent are opened together, each takes its chair, and the Council walks down a stair that was never in the vault floor. The Act III card. |
| The Hearth Below | 4 maps in a new region, `below`, each with its roads and gates: the Hollow Hall (36×24), the Ash Stair (24×36), the Chained Deep (42×28) and the Worldforge (36×24). They draw from their tiles until batch 4's paintings come (requested in `art-requests/batch-4.md`; each map is then traced from its painting, as batch 3's were). 2 new Hearthfires, the Under-Coal and the Chain Fire (35 in all). |
| The Hollow Council | Elder Miravel, Cistern Lord Qasim, Thane Brundar and Mayor Gretch, each in the gift sent to their chair (Nos. 67-70, breakable pieces), on the new `hollow` tier: a d20 that adds +4 while the gift is held. Two phases each, the second answering their story. Fought back to back: the stair behind seals after the first and opens after the fourth; a wipe wakes the party at the Eternal Hearth and keeps who is beaten. Beaten or pried loose, each comes back to themselves in their own words, and goes home. |
| The road down | 3 new families (the cinder-thralls and their overseer, the unmade, the forge-warden): 57 in all. 9 new encounters and 2 Hearthfire entries (138 in all). |
| Tamsin | She waits in the Chained Deep, sorry, and rejoins (her scene also plays as the party steps onto the paving before the forge door, should it have been lost). In the finale she fights beside the party as a **guest**: her own finale kit, Tamsin's Bargain (No. 71), no command. After it she gives the Bargain to the Warden and goes up to Isolde. |
| The Unsmith | Harrow Ironvein, Hilda's twin, on the new `unsmith` tier: two d20s, two intents and two moves a turn; a Stagger breaks the next of the two. Three phases (the Smith, the Thief, the Worldforge) and three breakable pieces (Nos. 72-74). At the Thief he takes up to six relics the Warden never claimed on Pages I-IV, the highest Codex number first, one Stolen Art and +1 Guard each; a full Codex leaves him nothing. The pre-fight card lists what he will take. |
| Relics | 9 (No. 000, Fenwick's Poker, and Nos. 67-74): 75 in all, each with sockets, three deeds and two awakening branches. Codex Page V, "The Hearth Below" (the label reads "No. 000 / 074"), and its reward, the Hearthkeeper's Oath (+1 to every save and 5% resist to every aspect for every hero). |
| The Masterpiece | At Hilda's forge once the Council is freed and the party holds the Worldforge page: the Warden picks one of ten weapon bases and names it (1 to 24 plain characters, scrubbed, shown only as text), and Hilda forges one Primal weapon with the best traits of its base, three sockets, and Kindle, a Legend Surge (Hearthlit, +1 to hit, and Warded 20 for every hero). One per save; it can never be melted down. |
| The endings | Chosen at the Worldforge's heart any time after the Unsmith falls: **Rekindle** (the Sleepers chained again), **Release** (the chains broken, the hearth out) and **Kindle Anew** (the true ending: it needs No. 000, the Masterpiece and every page of the Codex, and the choice shows which are missing). The choice is final for the save. Each plays its scene and its ending card, then the credits (they roll themselves down to the journey's numbers) and a last card naming the post-game as the next chapter; the game goes on at the Keep with the ending remembered. |
| Statuses | `unmade` (a hero's relic power struck out, their Surge the Heroic one, for 2 turns) and `hearthlit` (+1 to hit); the `save` stat. |
| Story | 74 new dialogue nodes (449 in all); 3 quests (the Hollow Council, the Masterpiece, Fenwick's Truth); 5 Ladder posters (the two old rumours settle into the Unsmith's); the Unsmith's last letter; the freed Council at home. |
| Interface | Tamsin's guest card with the party's four (her move under her own banner); the Unsmith's two dice on his plate, in Analyze and in the log; a hollow foe's "+4 = 17" beside its move; the stolen relics on his plate and the banner as he takes them; the pre-fight card's two dice, "What he will take" and "Tamsin fights beside you"; the forge's Masterpiece tab; the heart's choice; the ending cards, the credits and the last card; Codex Page V; the Atlas below the Keep; the found rumour's poster in the Journal. |
| Saves | Save version 6 (`AETH6.` codes; `AETH1.` to `AETH5.` load; `AETH7.` and up are named as newer). Its own key, backup and started marker; a pasted code's ending and Masterpiece are checked. |
| Delivery | `tools/zip.mjs`: the one HTML file in a zip, checked byte for byte (`--check`). |

## 2. Gates

| Gate | Result |
|---|---|
| Units | **623/623** node tests pass (`npm test`), lint clean. |
| e2e-world | **741** checks, 0 failed, 0 blocked, at 360×740 and 1280×800: scenarios 1-47. 40-47 cover the Opening and the vault stair, the Hollow Council back to back (the stair sealed and open again), Tamsin below and the Unsmith's card, the heart's choice with Kindle Anew shut and its reasons, an ending with its card, the credits and the last card, the Masterpiece at Hilda's (every forge tab on a phone's screen; a hostile name refused), the Journal's and the Atlas's Act III, and the performance of the four Act III maps. |
| e2e-battle | **30/30** scenarios, among them a Hollow Council member's d20 +4 (and the +4 gone with her gift, rolls already made too), the Unsmith through three phases with his two dice, his Stolen Arts and his three pieces' grips named, Tamsin beside the party at 360×740 (her card, her banner, no command), and the dice tray at 360×740. |
| e2e-flow | Passes at both sizes (**368** checks), with the Milestone 6 carry-over first and only `aethermoor.save.m7` written. |
| e2e-codes | **30 codes at both sizes**: every real M2 code, plus M3, M4, Milestone 4.5, M5 and M6 codes; the earlier milestones' keys are never written. |
| Balance | Every M7 target met; every earlier mode re-run, every target holding (three lead lairs and the Unsmith retuned); 0 stuck runs. See §2.1. |
| Performance | At 4× CPU throttle: the Act III maps' p95 frame JS 2.2-3.3 ms with at most 12 `drawImage` per frame (targets 16 ms and 40); every map the gate measures, 4.8 ms at worst. The First Sleeper is built while the screen is black on the way in (at most 317 ms, then 17 ms frames). |
| Size | The game **2,878 KB** (warns above 2.5 MB, fails above 3.2 MB); the paintings **28,217 KB** (fails above 32 MB); the file **31,841,097 bytes** (30.4 MiB); the zip **21.67 MiB**, checked byte for byte against the file (`tools/zip.mjs --check`, `unzip -t`). Every gate above ran on that exact file. |

### 2.1 Balance (`node tools/sim.mjs --seeds 200`, starters rotated)

The party comes down the vault stair at level 36.7 (the `gloomfen` run's end state, Waking 8). The full tables are in
`docs/RULES.md` §12.

| Target | Reached |
|---|---|
| The Hollow Council back to back: 35-45% of runs wipe somewhere in the four | 41.5% (83 of 200) |
| No Council member above 25% on its first try | Miravel 5.5%, Qasim 14.5%, Brundar 15%, Gretch 12% |
| The Unsmith with Tamsin, first try 30-40% | 35.5% (party level 41.1; Tamsin falls in 23% of first tries) |
| A forged party (weapons +10, a gem each, the Masterpiece): the Unsmith 20% or less | 7.5% |
| The road fights, 10% or less each | the thralls 0%, their pack 1%, the zone patrol 0%, the unmade 2.5%, the forge-warden 6% |
| M3 to M6 targets | every mode re-run from scratch after the review's Stagger fix (A3): every target holds, three lead lairs retuned by a level |
| Stuck runs | 0 in every mode |

- **The Unsmith is 190 HP** (P4 tuned him at 185, 36%). The Stagger fix helped the party most against him: Tamsin's
  Inside His Swing breaks one of his two moves and her Pry It Loose pries his pieces, and before the fix the pry brought
  the broken move back. At 185 HP he fell to 27.5%; 205 HP gave 45% and a run that never beat him; 195 HP 38%; 190 HP
  35.5%.
- **The fix touches every fight with a piece since M3**, so every table moved a little. Three lead lairs on their bands'
  edges crossed them and were retuned by a level (each is a lead, so nothing after it moves): the Mire Shrine's
  boglurchers to level 4 (30% to 19%; it had sat over its band, at 27-28%, since M3), the Wisp-Queen's wisps to 3 (27.5%
  to 17.5%) and Mother Grue's hag to 5 (27% to 24.5%). The M3 targets: the M2 road 13% / 1% / 32%, the direct path's
  Tamsin 67% party win and the Rotwarden 33%, `leads2` 4%, `looper-w2` 10%. `docs/RULES.md` keeps each milestone's
  tables as they shipped, and its last section holds every mode's current ones.
- The autoplay never heals Tamsin (a player can), so the finale is a little easier by hand than in the sim.

### 2.2 Saves

- Milestone 7 writes only `aethermoor.save.m7`, its `.bak` and `aethermoor.m7.started`. It never writes the M6
  (`aethermoor.save.m6`), M5, M4.5, M4, M3 (`v2`) or M2 (`v1`) keys or their markers. `test/frozen.test.mjs` pins the
  bytes of `dist/aethermoor-m2.html` to `-m6.html`.
- `toV6` fills what M7 adds (the ending, `null`) and nothing else, so an M6 save carries over whole; `saveProblems`
  refuses a code with an unknown ending, a second Masterpiece or a badly named one. The carry-over tries M6, then M5,
  M4.5, M4, M3 and M2, newest first.

### 2.3 Review

Two independent reviews read the merged Act III against the delivered Milestone 6, with proof scripts: review A the
rules, saves, security and the phone UX (60 real Unsmith fights with Tamsin, 3,423 of her moves; every saved or typed
string checked as text); review B the content, maps, data, balance and tests (every M3 to M6 sim mode re-run from
scratch; nothing weakened). The merged build's own browser gates found the first three (G1-G3) before them.

| # | Severity | Finding | Fix |
|---|---|---|---|
| G1 | Should-fix | A Hollow Council member's rolls made before her gift was pried (her readied move, and the ones Analyze foresaw) kept the +4. | They drop back to the natural roll and read her table again (`ai.js dropBonus`); the sim was re-run. |
| G2 | Minor | A foe's screen-reader label, and the guest's, named the old roll until the next refresh. | They follow each new roll. |
| G3 | Minor (tests) | The battle gate missed what comes in the same breath as a pause (the Stolen Arts after his phase); the tray was measured mid slide-in; the world gate gave up before "Face him." | Each fixed in the test; no check was loosened. |
| A1 | **Must-fix** | The Masterpiece could be melted down at Hilda's, which shut Kindle Anew for the save. | Salvage refuses it, and it is off the Salvage list. |
| A2/B1 | Should-fix | The Unsmith took the two starters the Warden passed over, which no Warden can claim, so a full Codex still fed him two Stolen Arts. | `stolenFor` skips starters, as a page does; the test's full Codex is one a player can have. |
| A3 | Should-fix | A move a Stagger broke off came back to life when a pry rolled it again (every foe with pieces, and either of the Unsmith's dice). | It stays broken off. Every earlier sim table was re-run (§2.1). |
| A4 | Should-fix | The credits hid "Your journey" below the fold. | The roll moves on its own (not under reduced motion), with a cue while there is more. |
| B2 | Should-fix | The scene past the forge-warden led straight into the finale, without the rest at the Chain Fire the story and the balance assume (the sim without it: 50.5% first-try wipe). | Tamsin sends the party back to the Chain Fire to sleep first. |
| A, B | Nits | The credits counted relics "of 75" (73 can be claimed); the forge's tabs ran off a phone's screen; the Unsmith's grip chips showed no names; a party-wide MP gift made the guest's MP NaN; the Masterpiece took no gem; the Thief's phase text; the paste message's "AETH3"; Tamsin's rejoining scene could be walked past; Brundar's moves named a hammer for the axe he carries; two moves' damage words; stale comments and biome names. | Each fixed. The Worldforge page stays with Hilda (the spec now says so: her talk and the quest read its flag). `tools/gallery-below.js` is Act III's battle-art review page. |

Each rules fix has a test that fails without it.

## 3. Known issues

1. **The game is 2,878 KB**, over the 2.5 MB warning line (under the 3.2 MB limit). `--minify` would bring it to about
   2.6 MB.
2. **The download is a zip** (21.7 MiB, holding the 30.4 MiB HTML). A claude.ai page holds 16 MB, so a page for the
   phone would be a separate build with lighter paintings, made only if the player asks.
3. **Batch 4 is not painted yet:** the four Act III maps draw from their tiles, and the optional stills (the Hearth
   Below's card, the three endings) are drawn scenes. On the tile-drawn Worldforge the furnace's flames overlap the
   walkable tile beside the heart; its painting replaces all of it.
4. **Balance margins are thin** in places: Grandfather Willow (24%) and Mother Grue (24.5%) sit at the top of their
   15-25% band, the Gloamwing at 25%, and the Unsmith's first-try rate moves fast with his HP (about a point per HP).
   Every number is a 200-seed run.
5. **A few battle poses touch their canvas edge** by a few pixels (Hollow Miravel's fall, the overseer's and the
   forge-warden's blows; `tools/gallery-below.js`'s edge report lists them). Nothing looks cut off.
6. **On a phone, the forge's purse shows gems by colour only**, as since M5 (the name is in each chip's title, and the
   Masterpiece's price names its bog amber).
7. **The e2e battle suite's `charm` scenario can fail under heavy machine load** and passes on its own (a headless
   timing quirk; players are not affected).
