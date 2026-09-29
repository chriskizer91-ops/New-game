# Milestone 4.5 status: the Road

The M4 playtest asked for M2's pacing on the walkable maps: "the map only let you slowly progress down
the road and every encounter was a full fight with dice rolls." The contract is `docs/M45-SPEC.md`
(Part A overrides Part B). This page records what shipped, the gates with their numbers, and the known
issues.

- **Delivered as:** `dist/aethermoor-m4.5.html`, one self-contained file (download), alongside the frozen
  `dist/aethermoor-m4.html`, `-m3.html` and `-m2.html`. Milestone 4.5 writes only its own save
  (`aethermoor.save.m4.5`); it reads the M4, M3 and M2 saves and offers the newest as a carry-over.
- **Branch:** `claude/cool-ptolemy-uc93gg`.

## 1. What shipped

| Item | Shipped |
|---|---|
| Road gates | 20 gates on the 12 road maps (`roads` in each map): 17 held by a guard standing beside them (the Hearth Road's rope, stones, toll chain and edge, the Thornway's Tally camp and bramble, Mossfall's ford, the Hindwood's bridge, the Heartroot's two rot-knots, the Sun Road's toll, the Dust Trail's rockfall, the Deep Shaft's bar, the Glass Flats' chain, Scorchgate's wall and keep gates, the Vaults' inner door) and 3 that wait on a fight further on (the Keep's north gate on the vault fight, the Hearth Road's rot-knot on the Rot-Stag, the Thornway's boulder on Old Snag). Walking into a guarded gate opens its guard's pre-fight card; a win opens it for good; a Brand's rematch stands beside the open gate. |
| One order | The Glass Flats open with the Brand of Glass (Sandspire's east gate says so); the sim's east leads come after Kharzul. |
| No Routs | A weak pack still runs from you; catch it and it is a full battle (First Strike from behind). The Rout deed now means "beat a pack that ran from you". |
| Auto off | Every fight starts with Auto off; the button works for that fight only. |
| Saves | Its own key, file and started marker; the M4 save joins the carry-overs (title, Settings, AETH3 export byte for byte). `toV3` counts every won fight as beaten; a carried-over position inside something now solid moves to the near side of the road. |

## 2. Gates

| Gate | Result |
|---|---|
| Units | **299/299** node tests pass (`npm test`), lint clean. New: `test/road.test.mjs` (every road: its end reachable with all gates open, each gate closed alone cuts it, each gate and its guard reachable in order, every route fight holds a gate or a Brand); the walk bot's pacing check (before each road fight is won, the rest of that road is out of reach: at least 8 held stretches on the Verdant walk, 5 on the Sunscorch walk, every starter). |
| e2e-world | **255** checks, 0 failed, 0 blocked, at 360×740 and 1280×800: scenarios 1-20 on the final build (scenario 20's prompt check was re-run after its expectation was corrected). Scenario 3 now runs down a weak pack into a full battle (Auto off even with an old Auto setting saved, the dice tray, gold and the pack gone); the new scenario 20 faces the Hearth Road's first gate (the prompt names its guard's fight), walks into it, gets the guard's card, wins and walks through. |
| e2e-flow | Passes at both sizes (**268** checks), with the new Milestone 4 carry-over profile (an M4 save on this device carries over; the M4 key is never written). |
| e2e-battle | **18/18** scenarios. |
| e2e-codes | **42/42**: every real M2 code and three M3 codes, at both sizes; the M4 key is never written. |
| Balance | Every M3 and M4 target still met; see §2.1. |
| Performance | p95 frame JS 1.5-2.0 ms at 4× CPU throttle (target ≤ 16 ms), 9-14 `drawImage` per frame (≤ 40), the Glass Flats included. |
| Size | **1778 KB** (warns above 1.8 MB, fails above 2.2 MB). |

### 2.1 Balance (`node tools/sim.mjs --seeds 200`, starters rotated)

A weak zone patrol costs nothing in the sim (it runs, as it does in the game); a strong one is a fight.

| Target | Reached |
|---|---|
| Kharzul first-try wipe 30-40% | 34% |
| The Ashen Warden first-try wipe 30-40% | 36% |
| Tamsin at Scorchgate, party win 55-70% | 65% |
| Forged party: each Champion ≤ 20% | Kharzul 18%, the Warden 13% |
| Each Sunscorch lead's lair taken first, 15-25% | the caravan 22%, the Sand Wyrm 19%, Gnash 21%, the Wisp-Queen 19%, the Aqueduct 19% |
| M3 modes | m2 13% / 1% / 33% (unchanged); direct: Tamsin 66% win, the Rotwarden 33%; leads2 4%; looper-w2 10%; first-lead 20% / 28% / 23% / 20% (as in M4) |
| Stuck runs | 0 in all nine modes |

With one order (A3), the Glass Flats' lairs are met at Waking 3, after Kharzul. They carry `wakeOmenCap: 2`
(a spawn's Waking Omens stop at two) and retuned levels, which brought them back inside 15-25% (19-22%).

### 2.2 Saves

- Milestone 4.5 writes only `aethermoor.save.m4.5`, its `.bak` and `aethermoor.m4.5.started`; it never writes
  the M4 (`aethermoor.save.m4`), M3 (`v2`) or M2 (`v1`) keys. `test/frozen.test.mjs` pins the bytes of
  `dist/aethermoor-m2.html`, `-m3.html` and `-m4.html`.
- The save shape is M4's (version 3, `AETH3.` codes); `AETH1.` to `AETH3.` load, and a code from a newer
  milestone (`AETH4.` and up) is named as such.
- `toV3` counts every fight a save has won as beaten, so the road gates of fights won before Milestone 4.5
  are open. A carried-over position inside something now solid moves to the nearest free tile of its own
  stretch of road (never behind a fight it had already walked past, never beyond a gate it had not); a
  position off the map enters at the map's first anchor.

### 2.3 Review

An independent review read the whole diff with proof scripts, against the M4 source rebuilt from the diff
(it builds to the frozen `dist/aethermoor-m4.html` byte for byte, so "what M4 allowed" is M4's real engine
on M4's real maps): every tile an M4 party could stand on, at every road stage, with guards re-armed; every
M2 fixture; every save path of the title, Settings and the shell; ways round every road fight through every
map. The save rule held throughout: no forbidden key written, no save stranded, nothing M4 reached lost. It
found:

| # | Severity | Finding | Fix |
|---|---|---|---|
| S1 | Should-fix | Scorchgate's portcullis had a hole beside it until the Ash-Captain fell: Tamsin, its guard, only stood there after him, so an M4 save on the parade ground could walk round both fights to the Vault door. | Tamsin always stands by the portcullis (the wall gate keeps her out of reach until the Captain falls). `road.test` now asserts a road gate's guard has no condition of its own. |
| S2 | Should-fix | A carried-over save on a tile that became solid was moved behind the first unbeaten road fight, up to 56 tiles back, even when it had walked past that fight in M4. | The nudge is judged from the save's own stretch of road: it moves 1-2 tiles and never beyond a gate it had not passed. A two-gate test lane covers it. |
| M1 | Minor | `enterMap` threw on a position off the map (a damaged local save would crash the world screen). | An off-map position enters at the map's first anchor; tested. |
| M2 | Minor | Facing a guarded gate prompted "Look · The way is shut", though A opens the guard's fight. | The prompt names the guard's fight; e2e-world scenario 20 checks it. |
| M3 | Minor | No test pinned the one order (A3) on the real maps. | A test: before the Brand of Glass, a party holding every relic reaches none of the east side; after it, the Glass Flats and Miragewell. |
| M4 | Minor | The Sunscorch re-arm test had narrowed (its fire list dropped the Well Fire; only the Sun Road's gates were checked). | Every Sunscorch fire is checked (only the Last Watchfire is out of reach after Kharzul, behind the raiders' chain), and every beaten road gate on every Sunscorch map. |
| M5 | Minor | Stale Rout text for developers (ARCHITECTURE.md, a comment, the e2e header, HANDOFF.md). | Updated. |
| M6 | Nit | Zara's line, quest and bounty point to the Glass Flats before their gate opens. | Left as is: the gate's own hint says when it opens (known issue 2). |

Each fix has a test that fails without it; the suite is **299/299**.

## 3. Known issues

1. **The e2e "reload" flake is explained.** In a throwaway headless Chromium context, a second
   `page.goto` to the same `file://` page sometimes starts with that origin's localStorage wiped (every
   key, the started marker included); `page.reload()` and an `http://` origin never did (0 of 11). A
   real browser keeps `file://` storage on disk, so players are not affected. e2e-flow's reload checks
   now reload.
2. **The Sunscorch talks about the east before its gate opens.** Zara's lines, the Humming Crate and the
   raiders' bounty go live in Sandspire, before the Brand of Glass opens the east gate. The gate's own
   message says when it opens.
3. **A save far down the road carried over from M4** meets the road's rules from where it stands: the fights
   it walked past in M4 hold the road behind it. It can go on, travel from a lit fire, or walk back into a
   gate, which opens that gate's fight from either side.
