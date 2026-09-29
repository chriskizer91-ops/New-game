# Milestone 5 status: the Ironspire Peaks

The Ironspire and Hush, the third region of the roadmap, built road-first. The contract is
`docs/M5-SPEC.md` (Part A overrides Part B). This page records what shipped, the gates with their
numbers, and the known issues.

- **Delivered as:** `dist/aethermoor-m5.html`, one self-contained file (download), alongside the frozen
  `dist/aethermoor-m4.5.html`, `-m4.html`, `-m3.html` and `-m2.html`. Milestone 5 writes only its own save
  (`aethermoor.save.m5`); it reads the M4.5, M4, M3 and M2 saves and offers the newest as a carry-over.
- **Branch:** `claude/cool-ptolemy-uc93gg`.

## 1. What shipped

| Item | Shipped |
|---|---|
| The way in | The Keep's east postern opens once the second council is sat, onto the East Road. The Highfold joins Peak's Veil to Fawnrest once Mother Wynn is met (a second way home). Stormwatch's north gate onto the Frost Road opens with the Brand of Iron (one order, A4). |
| The Ironspire | 11 maps built road-first (the Rockslide Pass, Peak's Veil, the Highfold, the Iron Stair, Ironhold, the Ironhold Deeps, Harrow's Forge, Stormwatch, the Frost Road, Frostmere, Beneath Frostmere) and the Ironspire Gallery (Codex Page III's pedestals, off the Sunscorch Gallery). The Deeps and Beneath Frostmere are dark. |
| The East Road (A11) | Six painted maps from the player's wilderness paintings, between the Keep and the pass: the Old Bridge, Drystone Lea, Plankford, Shrinewood, Silverfall and the Last Camp. Each is traced tile by tile from its painting and drawn from it at full detail. Three road fights hold it (wolves in the brambles, the deserters' toll chain, their sergeant at the palisade); the Last Camp's fire is a Hearthfire; the carved stone and the pool are things to look at. |
| Hearthfires | 8 new (3 cold), 25 in all. |
| Foes | 11 new families (39 in all), among them the `forge-spark` rabble; 22 encounters and 8 Hearthfire entries. The Champions Mother Anvil (Harrow's Forge, the Brand of Iron) and the Rime-Abbot (Beneath Frostmere, the Brand of Frost): three phases, two breakable pieces each. Tamsin's third duel at Ironhold with her own kit (`$rival:ironhold`). |
| Relics | 14 (Nos. 39-52, 52 in all), each with sockets, three deeds and two awakening branches; Codex Page III and its reward (the Ironspire Accord); the Frost Opal gem. Every map power works, Ironwall's Iron Stance and the Drowned Censer's Hymn of Rest included. |
| Exact statuses | `burrowed`, `swallowed` and `charmed` (spec §4.2). M4's approximations are exact now: Kharzul's Burrow, the Sand Wyrm's Swallow, the mirage-wisps' and the Wisp-Queen's charm. |
| Story | 10 people (Mother Wynn, Brother Kesh, the Novice, Thane Brundar, Durra Ironhand, the Hold Guard, Rook, Captain Ysolde, Quartermaster Quill, Brother Aurel); 5 quests (the Ironspire Waking, the Bell of Peak's Veil, Harrow's Hammer, Rook's Ledger, the Sentinel's Oath), 4 bounties, 8 Ladder posters, 2 Unsmith letters, 2 shops; Hush's scene; the third council. |
| Painted art (A10) | The player's paintings of Hearthstone Keep and Thornhollow draw as those maps' ground, and the prologue shows the Council hall gold, then blue. Painted maps draw at twice the canvas density (32 painting px a tile), so the paintings' detail shows. |
| Interface | Holds, burrows and charms in battle (the held hero leaves the line, a burrowed foe sinks, a charmed hero is ringed pink); the peaks track; Codex Page III; the Atlas's Ironspire view; the Journal's Ironspire; the chapter cards of the third council. |
| Saves | Save version 4 (`AETH4.` codes; `AETH1.` to `AETH3.` load; `AETH5.` and up are named as newer). Its own key, backup and started marker. |

## 2. Gates

| Gate | Result |
|---|---|
| Units | **395/395** node tests pass (`npm test`), lint clean. |
| e2e-world | **372** checks, 0 failed, 0 blocked, at 360×740 and 1280×800: scenarios 1-27. Scenario 21 walks through the east postern onto the painted Old Bridge (drawn from its painting, the road track) and up to the pass (the peaks track); 22-27 cover Peak's Veil, the chasm and ice locks, Mother Anvil's card, the Deeps' dark, the Frost Road's performance and the third council. |
| e2e-battle | **22/22** scenarios, among them Mother Anvil through three phases with both pieces snapped, the Rime-Abbot with a hero held under and freed early, Kharzul's exact Burrow and a charmed hero. |
| e2e-flow | Passes at both sizes (**296** checks), with the Milestone 4.5 carry-over profile. |
| e2e-codes | **48/48** (24 codes at both sizes): every real M2 code, plus M3, M4 and Milestone 4.5 codes; the earlier milestones' keys are never written. |
| Balance | Every M5 target met, every M3 and M4 target still met, 0 stuck runs; see §2.1. |
| Performance | At 4× CPU throttle: the Frost Road p95 frame JS 4.9-8.2 ms with at most 20 `drawImage` per frame; the painted Old Bridge p95 2.4-3.1 ms with at most 10 (targets 16 ms and 40). |
| Size | The game **2168 KB** (warns above 2.5 MB, fails above 3.2 MB); the paintings **5926 KB** (fails above 8 MB); the file **8094 KB**. |

### 2.1 Balance (`node tools/sim.mjs --seeds 200`, starters rotated)

The party comes up from the Sunscorch at level 21.1 (the `sunscorch` run's end state, Waking 4). The full
tables are in `docs/RULES.md` §12.

| Target | Reached |
|---|---|
| Mother Anvil first-try wipe 30-40% | 32% |
| The Rime-Abbot first-try wipe 30-40% | 35.5% |
| Tamsin at Ironhold, party win 55-70% | 61% (39% yield) |
| Forged party: each Champion ≤ 20% | Mother Anvil 6%, the Rime-Abbot 13.5% |
| Each Ironspire lead's lair taken first, 15-25% | the Thunder-Roc 19%, Old Horn 19.5%, Harrow's Journeyman 22.5%, the Drowned Abbess 20% |
| M4 targets (still met) | Kharzul 31.5%, the Ashen Warden 33.5%, Tamsin at Scorchgate 69.5% win, forged 16.5% / 7%; the caravan 19%, the Sand Wyrm 20%, Gnash 22%, the Wisp-Queen 24%, the Aqueduct 18.5% |
| M3 modes | all 60 first-try results identical to Milestone 4.5 |
| Stuck runs | 0 in every mode |

The East Road's three fights cost 0-2% first-try wipes; the hardest road fights are the Deeps' zone patrol (11%,
met straight after Tamsin's duel with no rest, as M4's Vault Guard is), the Bellows (10%) and the Cutter-Chief (9%).

- **Chosen Omens.** Every Ironspire spawn keeps at most three Waking Omens. The Champions and the named lair
  holders carry chosen Omens, so a level change no longer swings a lair by 20 points.
- **The Rime-Abbot** is slow (speed 8) but starts Swift and Frenzied. A lost fight's extra Omen can then no
  longer be the Swift that made retries unwinnable (2-4 stuck runs in 200 before).
- **Kharzul's exact Burrow** goes under for a turn, then erupts under someone (4d10, Stagger, two Bleeds).
  M4's caravan lead moved to 25.5% as a knock-on, and is back to 19% with its plain smuggler at level 6.

### 2.2 Saves

- Milestone 5 writes only `aethermoor.save.m5`, its `.bak` and `aethermoor.m5.started`; it never writes the
  M4.5 (`aethermoor.save.m4.5`), M4 (`m4`), M3 (`v2`) or M2 (`v1`) keys or their markers. `test/frozen.test.mjs`
  pins the bytes of `dist/aethermoor-m2.html`, `-m3.html`, `-m4.html` and `-m4.5.html`.
- `toV4` marks the version and nothing else: an M4.5 save carries over whole. Every earlier save shape and
  every M2 fixture migrates (56 shapes checked in the review).

### 2.3 Review

Two independent reviews read the whole M5 diff against the delivered Milestone 4.5, with proof scripts:
one on the rules, saves, security and the phone UX (including a stress run of 1,152 real fights with the
new holds, burrows and charms), one on the story, maps and data, and on whether any test was weakened.
No must-fix issue in the game. They found:

| # | Severity | Finding | Fix |
|---|---|---|---|
| R1 | Should-fix | A hero held under was not let go when the other heroes fell, so a lone held hero kept losing turns to the holder's tick. | A side left with only held units standing lets them go at once (spec §4.2). |
| R2 | Should-fix | A Provoked foe aimed its single-target move at a held provoker and wasted its turn. | Its forced target goes through `targetable`. |
| R3 | Minor | Auto counted a held healer or reviver as able to heal. | It does not. |
| T1 | Must-fix (tests) | Three of the M4.5 review's own tests were lost when the maps package copied its files from an older tree: the one-order test for the Glass Flats, the full re-arm check after each Sunscorch Brand, and road.test's pin that a road guard has no condition of its own. | Restored verbatim; each passes. |
| T2 | Minor (tests) | The save test set the earlier milestones' started markers first, so a stray write to one would go unseen. | A test from an empty store checks that exactly the M5 keys are written. |
| C1 | Should-fix | Ironwall's Iron Stance and the Drowned Censer's Hymn of Rest did nothing. | They work: the bearer of Ironwall starts every fight Guarding until its first turn; roaming undead never notice you while you own the Censer. |
| C2 | Should-fix | Brother Kesh's and Thane Brundar's relic notices replaced their menus, hiding Frostmere's history and the Thane's talk of Harrow while the relic was worn. | The notices keep the menus, as Brother Cinder's do. |
| C3 | Minor | Text: Wynn said she rang a bell that had not rung (Abbot before Abbess); the Iron Stair's gate was "at the head" in three places but at the foot on the map; the Veilbell's riddle contradicted its lore; Tamsin's win line sent you for a Rune-Key you might already hold. | Rewritten to hold in every order. |
| C4 | Minor | A blocked e2e check (a stand-in's fallback) exited 0. | A blocked check fails the run: M5 has no stand-ins left. |

Each rules fix has a test that fails without it.

## 3. Known issues

1. **The paintings' budget.** The eight painted maps and two stills take 5.9 MB of the 8 MB limit (A6).
   Batch 2 (26 paintings of the Verdant and Sunscorch maps) will not fit at this density and quality: it
   needs a smaller density for the large maps, a lower quality, or a second file.
2. **The East Road's fights are levelled for the sim's arrival** (the party comes up from the Sunscorch at
   about level 21). A party that arrives far lower sees them as Deadly; the road is optional to grind on.
3. **M4's numbers moved a little** with Kharzul's exact Burrow: Tamsin at Scorchgate is 69.5% (target 55-70%).
4. **Hilda's portrait** did not come back with the art pilot, so there is no portrait frame yet.
5. **The e2e "reload" note** from Milestone 4.5 still applies (a headless `file://` quirk; players are not
   affected).
