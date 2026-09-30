# Milestone 6 status: the Gloomfen Marsh

The Gloomfen, the fourth region of the roadmap, with Hodge, Tamsin's fall and the end of Act II, built road-first.
The contract is `docs/M6-SPEC.md` (Part A overrides Part B). This page records what shipped, the gates with their
numbers, and the known issues.

- **Delivered as:** `dist/aethermoor-m6.html`, one self-contained file (download), alongside the frozen
  `dist/aethermoor-m5.html`, `-m4.5.html`, `-m4.html`, `-m3.html` and `-m2.html`. Milestone 6 writes only its own save
  (`aethermoor.save.m6`); it reads the M5, M4.5, M4, M3 and M2 saves and offers the newest as a carry-over.
- **Branch:** `claude/cool-ptolemy-uc93gg`.

## 1. What shipped

| Item | Shipped |
|---|---|
| The ways in | Mossfall's fen stair opens once the third council is sat, onto the Murkway, Willowmurk's safe paths. The Keep's south-west gate opens onto the Blackwater Causeway once the Blackwater falls (the Brand of the Deep): the way home. |
| The Gloomfen | 12 maps (the Murkway, Willowmurk, Rotbridge, Bogmire, the Lanternfen, the Mother's Hollow, the Long Boardwalk, the Misthollow Ruins, the Drowned Belfry, the Blackwater Reach, the Tidal Flats, the Blackwater Causeway) and the Gloomfen Gallery (Codex Page IV's pedestals, off the Ironspire Gallery). The Lanternfen and Misthollow are foggy; the Mother's Hollow and the Drowned Belfry are dark. |
| Painted, every one | Batch 3: the player's 16 pictures of the Gloomfen (the Murkway in two halves, the Long Boardwalk in three thirds). They came in layouts of their own, so every Gloomfen map and the Gloomfen Gallery is traced from its painting, as the East Road was: each takes its painting's shape, its tiles only say what is solid, and every id, road and gate order stands where the painting puts it. With batch 2 (below), every one of the game's 56 maps draws from the player's paintings. |
| Hearthfires | 8 new (3 cold), 33 in all. |
| Foes | 10 new families (49 in all); 25 encounters and 8 Hearthfire entries. The Champions: the Lantern Mother (the Mother's Hollow, the Brand of Lanterns) and the Blackwater Leviathan (the Tidal Flats, the Brand of the Deep), three phases and two breakable pieces each. |
| Hodge | His toll-bar across Rotbridge, three ways past: pay today's price (three prices, turning daily, each something a party can come by before the bar), win his best-of-three toll game (Persuasion, Deception, Intimidation; once a day) for passage and his Unfair Toll, or fight him, a terrible idea. Wearing the Unfair Toll, the party makes the strongest foe pay at the start of every fight (Toll Is Due, a DC 13 CHA save). |
| Tamsin's fall | Her fourth duel on Rotbridge, past Hodge's bar, with a Gloomfen kit and the Bogstriders. Win or yield, a black barge comes out of the fog and she trades her starter to the Unsmith and goes with him. |
| Relics | 14 (Nos. 53-66, 66 in all), each with sockets, three deeds and two awakening branches; Codex Page IV and its reward, the Gloomfen Covenant (+10% healing and 10% blight resist for every hero); the Bog Amber gem. |
| Statuses | `rotting` (1d6 blight a stack each turn, every heal halved; 3 stacks, 3 turns) and `hexed` (attack and save d20s at a disadvantage; 2 turns). |
| The fog | A soft lock: on a foggy map the sight closes to 3 tiles without a light key. |
| Story | 9 people (Elder Moss, Sedge, a villager, Hodge, Mayor Gretch, Nettie the Swamp Witch, Widow Pell, the Stilt-Watch, Corvus); 5 quests (the Gloomfen Waking, the Failing Wards, Nettie's Remedy, Corvus's Harpoon, the Dead Tongue), 4 bounties, 8 Ladder posters and the rumour of the man on the barge, 2 Unsmith letters, 2 shops; the children's homecoming; the Sleeper under the Belfry; the fourth council, which ends Act II. |
| Painted art | Batch 2: 35 paintings, so every map up to the Ironspire draws from the player's paintings (43 maps). The title's backdrop is the player's world painting, and the card that opens the Gloomfen is their regional painting. |
| Interface | The fen in battle: Hexed and Rotting tags on the hero cards, heals halved by rot, the holds by their labels ("In the river, put there by Hodge"), a dived foe under the water; a price on a dialogue choice (disabled when the party can't pay); the fog; the fen track; Codex Page IV; the Atlas's Gloomfen view; the Journal's Gloomfen; the Gloomfen's card; the fourth council's cards and the end of Act II. |
| Saves | Save version 5 (`AETH5.` codes; `AETH1.` to `AETH4.` load; `AETH6.` and up are named as newer). Its own key, backup and started marker. |

## 2. Gates

| Gate | Result |
|---|---|
| Units | **506/506** node tests pass (`npm test`), lint clean. |
| e2e-world | **557** checks, 0 failed, 0 blocked, at 360×740 and 1280×800: scenarios 1-39. 28-39 cover the fen stair, a bog step, Willowmurk, Hodge's bar and his toll game, Tamsin's duel and fall, the Lanternfen's fog, the Lantern Mother's card, the boardwalk's east end, the Belfry's dark, the causeway home, the fourth council and the end of Act II, and the performance of the Lanternfen in fog and the Long Boardwalk. |
| e2e-battle | **28/28** scenarios, among them the Lantern Mother through three phases, a hero led away and back, the Leviathan diving and swallowing, Hodge's toll and his shove into the river, the hexed and rotting heroes, and the dice tray's total at 360×740. |
| e2e-flow | Passes at both sizes (**330** checks), with the Milestone 5 carry-over profile (Page IV in the carried journey). |
| e2e-codes | **27 codes at both sizes**: every real M2 code, plus M3, M4, Milestone 4.5 and M5 codes; the earlier milestones' keys are never written. |
| Balance | Every M6 target met, every earlier target unchanged, 0 stuck runs; see §2.1. |
| Performance | At 4× CPU throttle: p95 frame JS 2.0-4.0 ms with at most 20 `drawImage` per frame, the Lanternfen in thick fog 3.7-3.9 ms and the Long Boardwalk 2.4-2.6 ms (targets 16 ms and 40). |
| Size | The game **2583 KB** (warns above 2.5 MB, fails above 3.2 MB); the paintings **28,217 KB** (fails above 32 MB); the file **30,800 KB**. The download is the fully minified build (`build.mjs --minify`: the game 2349 KB, the file 29.85 MiB), because a file sent in the chat must be under 30 MiB; world, flow and codes passed again on that exact file. |

### 2.1 Balance (`node tools/sim.mjs --seeds 200`, starters rotated)

The party comes down the fen stair at level 30.1 (the `ironspire` run's end state, Waking 6). The full tables are in
`docs/RULES.md` §12.

| Target | Reached |
|---|---|
| The Lantern Mother first-try wipe 30-40% | 35% (party level 31.9) |
| The Blackwater Leviathan first-try wipe 30-40% | 36% (party level 35.7) |
| Tamsin at Rotbridge, party win 55-70% | 64% (36% yield) |
| Forged party: each Champion ≤ 20% | the Lantern Mother 8.5%, the Leviathan 15.5% |
| Forged party at the region's end beats Hodge, but not always | 61.5% first-try win |
| Each Gloomfen lead's lair taken first, past its road fight (or its zone's patrol) and a rest, 15-25% | Grandfather Willow 23%, Mother Grue 24%, the Drowned Cantor 19.5%, Old Jaws 17.5% |
| Hodge on arrival, 60-80% first-try wipe | 73.5% |
| M3, M4, M4.5 and M5 targets | unchanged: every earlier table matches the M5 release's, number for number |
| Stuck runs | 0 in every mode |

- **Chosen Omens** again: at most three Waking Omens on a Gloomfen spawn, and chosen ones on the Champions, Hodge and
  the named lair holders. A Champion carries Frenzied, so a Grudge can never add it: with the Leviathan unchosen, a
  lost fight's Frenzied made 1 run in 200 stuck.
- The sim follows the roads by their fights, not their tiles, so batch 3's traces moved one route: Mother Grue's hut now
  stands before the Lanternfen's first gate, so her lead is taken past the zone's patrol from the Stilt Hearth (22% before).

### 2.2 Saves

- Milestone 6 writes only `aethermoor.save.m6`, its `.bak` and `aethermoor.m6.started`. It never writes the M5
  (`aethermoor.save.m5`), M4.5, M4, M3 (`v2`) or M2 (`v1`) keys or their markers. `test/frozen.test.mjs` pins the
  bytes of `dist/aethermoor-m2.html` to `-m5.html`.
- `toV5` fills what M6 adds and nothing else, so an M5 save carries over whole. It is idempotent and pure on every
  fixture and save shape (the review checked 19 fixtures in 5 shapes). The carry-over tries M5, then M4.5, M4, M3
  and M2, newest first; a broken save falls through to the next, and looking writes nothing.
- Batch 3 re-traced the Gloomfen maps before any Milestone 6 file went out, so no save holds a place on the old ones.

### 2.3 Review

Two independent reviews read the whole M6 diff against the delivered Milestone 5, with proof scripts. Review A took
the rules, saves, security and the phone UX, and replayed all 69 fights from before M6 on both engines (828 replays,
every event identical). Review B took the story, maps, data and balance, and whether any test was weakened (95
removed test lines, each replaced by an equal or stricter check). They found one must-fix, both in content:

| # | Severity | Finding | Fix |
|---|---|---|---|
| B1 | Must-fix | A yield to Tamsin whose after-fight scene was lost (the page closed on the aftermath, after the autosave) left her boots ungiven, and Hodge's next word sent her off for good: the Bogstriders, and so Page IV, were lost. | Hodge hands over the boots she left on his bridge; a second yield after a scene that gave them gives no second pair. |
| B2 | Should-fix | The Deep-Pearl asked for the Branded deed, which its only fight (the last Brand) can never give. | It asks for Untouched; a test keeps the last Brand's relics off that deed. |
| B3 | Should-fix | The sim took three lairs before the road fights that guard them on the map. | Each lair is taken past its road fight after a rest; Old Jaws is a level lower (25% had sat on the band's edge). |
| B4 | Minor | Text: Elder Moss's bed was "her" bed; stale DC examples; test titles that promised more than they checked. | Fixed, with a test that each of Hodge's prices can be come by before his bar. |
| A1 | Should-fix | At 360×740 a Gloomfen foe's hit (11 to 14 dice) pushed the dice tray's total off the bottom of the screen. | The damage row stays on one line: a phone shows five dice, then "+N". A 360×740 check. |
| A2 | Should-fix | e2e-flow's reload check failed at random: the headless browser now and then drops the whole `file://` origin's storage. | The check writes a key of its own first; a wipe that takes it too is the browser's, so the keys go back and the page reloads once more (a second wipe fails). |
| A3 | Minor | Hodge's opener showed a die face that was never rolled; the engine's "is in the river by Hodge"; a status float over the new tags; screen-reader labels naming statuses twice; "Worn" for "Worn by"; the toolbar and grip bars under 44 px taps; a caption cut mid-number. | Each fixed: the opener has no face, the place labels read "put there by", the tags pop in, the labels name each status once, and the taps and caption fit. |

Each rules fix has a test that fails without it.

### 2.4 Batch 3

The player's Gloomfen paintings arrived after the reviews, painted in layouts of their own. Seven builders traced the
13 maps in parallel, each in a private copy, and the lead merged them, re-imported every painting and checked every
grid overlay. What the traces changed besides the tiles:
- Things the paintings show became painted signs: the salvage crane, the sunk boats and wrecks, the always-lit
  ward-stones, the lamp-post by the Hollow, and a second, older stair on the Murkway's cliff. The Wreck Fire and the
  Flats Beacon draw only their flames, and the Belfry's two screen candles give light.
- Texts that named places the paintings moved were rewritten: the barge chain, the mill, the chain-post and the
  salvage crew's chain, with its quest step.
- The Gloomfen Gallery is 18×12, with Page IV on rows 4 and 7 either side of the runner. The reliquary test names
  those rows.
- Mother Grue's hut now stands before the Lanternfen's first gate (§2.1).

## 3. Known issues

1. **The game is 2583 KB**, over the 2.5 MB warning line (under the 3.2 MB limit). `--minify` is in reserve.
2. **The download is 29.85 MiB** with every map painted at full detail (the player's choice, A6), fully minified to
   fit the 30 MiB a file sent in the chat may be. Milestone 7's paintings will not fit that way: it needs another way
   to deliver (a zip, lighter paintings, or the paintings in a second file). A claude.ai page holds 16 MB, so a page
   for the phone would be a separate build with lighter paintings.
3. **The domain keys open every Gloomfen lock at the party's levels**, so the fog and the bog rarely bite a party that
   has them (as in M5).
4. **The witch-wards' relic keys lie behind witch-wards** (spec §2.7's table): only Knowledge 7 opens the first. Nobody
   is stuck (Bryn's Knowledge is his level).
5. **Balance margins are thin** on 40-seed slices (the review: the Lantern Mother 42.5% and the Leviathan 45% on seeds
   1-40); the 200-seed numbers are in their bands.
6. **A relic that asks for the Branded deed** cannot awaken once all eight Brands are taken, if it was not taken to a
   Brand fight before.
7. **The e2e "reload" note** (a headless `file://` quirk; players are not affected) is now handled by the checks.
8. **A few traced places are compromises** with the paintings: the Misthollow camp is joined to the city by ten
   tiles of shallows the painting shows as water, the Murkway's two halves meet through a blended strip of reeds, and
   the Reach's painted south bank is out of reach (nothing painted crosses the channel).
