# M7 spec: Act III, the Hollow Council and the Unsmith

The roadmap's M7 row: "The Hollow Council, the Unsmith, 3 endings" (`docs/DESIGN-BRIEF.md` §9, §13; the player moved the
post-game to the milestone after, A15). All eight coals are lit, and the Unsmith's eighth letter said: "I sent your
Council four gifts. Tell them to open them together." They do. The four soot-sealed boxes open in the vault under the
Seal, and each gift takes the chair it was sent to. Elder Miravel, Cistern Lord Qasim, Thane Brundar and Mayor Gretch
walk down a stair that was never there into the Council's First-Age chamber beneath the Keep. There they wait, hollowed,
to be fought back to back. Below them the hearth's roots go down through the ash to the Chained Deep, where the
Sleepers the hearth was built on lie in their chains, and Tamsin is waiting, sorry. At the bottom stands the Worldforge,
built to plans a First-Age smith drew and Harrow stole from under Ironhold, and the smith who built it: Harrow
Ironvein, Hilda's twin, the Unsmith. After him the Warden chooses what the
hearth burns now: the Sleepers again (Rekindle), nothing at all (Release), or a legend the Warden forged themself
(Kindle Anew, the true ending). M7 is built road-first on the Milestone 4.5 contract (`docs/M45-SPEC.md`), as M5 and M6
were. Part A overrides Part B.

## Part A. Decisions (these win)

| # | Decision |
|---|---|
| A1 | **Its own file and save** (the player's rule). M7 writes only `aethermoor.save.m7` (+ `.bak`, `aethermoor.m7.started`). It reads, newest first, the M6 save (`aethermoor.save.m6`), then M5's, Milestone 4.5's, M4's, M3's and M2's, and never writes them. The download is `dist/aethermoor-m7.html`. Step 0 freezes `dist/aethermoor-m6.html` (its sha256 pinned beside the others). |
| A2 | **Save version 6.** `rules/migrate.js` chains `toV2` to `toV5` and a new `toV6`, which fills what M7 adds (§4.1) and only that. Codes are `AETH6.`; AETH1 to AETH5 still load, and AETH7 and up are named as newer. The M6 file already names an `AETH6.` code as newer, so it never loads an M7 save. |
| A3 | **Road-first, with one addition.** Every M7 map declares its `roads`, and every fight on `ACT3_PATH` holds a gate, as in M5 and M6. The one addition is the road's end: the Unsmith is the **finale** (`finale: true` on his encounter), and `test/road.test.mjs` counts the finale as it counts a Brand (a route fight may hold a gate, a Brand or the finale). Every fight is a full battle with the dice, and Auto starts off. |
| A4 | **One order.** The Opening (the fifth council, in the Great Hall), then the stair under the Seal. Next comes the Hollow Hall, with the four fought back to back in the order their regions were first opened: Miravel, Qasim, Brundar, Gretch. Then the Ash Stair, the Chained Deep (Tamsin), the Worldforge (the Unsmith), and the ending, chosen at the Worldforge's heart whenever the player is ready (A14). |
| A5 | **The way in** (§2.4). A keep-hall trigger, `council-5`, plays the Opening once the fourth council is sat. It is guarded by `{ all: [{ flag: 'council-4-done' }, { not: { flag: 'council-5-done' } }] }` and is never `once`. The vault's floor opens: exit `hall-down` on the vault's two floor tiles (21-22, 8) leads to `hollow-hall`. It is gated on `{ flag: 'council-5-done' }` and sealed with words until then. Its stair is a non-solid prop, so no row of the painted Great Hall changes and nothing needs restamping. |
| A6 | **Size and delivery.** The game keeps M5's limits (warns above 2.5 MB, fails above 3.2 MB); the download is fully minified when that is what fits (M6 was). The paintings keep their 32 MB limit, and batch 4 adds about 2.5 MB. The download will pass the 30 MiB a file sent in the chat may be, so it goes out as a **zip holding the one self-contained HTML file**. The player unzips it and opens the HTML as before. A claude.ai page for the phone is a separate, lighter build, and only if the player asks. |
| A7 | **Building** as in M6. The lead builds the rules (P1) and integrates. Agents build the maps, story, foes and relics, art and UI in parallel with disjoint files (§7). They never run git, build into private folders, and write `game/notes/M7-<pkg>.md`. Before a package is committed, the lead lists the assertions its test files lost against the base. |
| A8 | **Ids are fixed by this spec.** A package may add ids only inside its own files; a missing id is asked for in its notes. |
| A9 | **Frozen, as before:** `art/heroes.js`, `art/hero-looks.js`, the card reveal, the M2 encounter and spawn arrays, and every delivered file (M2 to M6). So Tamsin fights beside the party in her own foe art, turned to face the Unsmith (§4.3, §6.2), and no hero art is touched. |
| A10 | **The player's own art** (the player's answer). Batch 4 (§6.3) is the four Act III maps, painted from written descriptions (`art-requests/batch-4.md`). Each map is then traced from its painting, as batch 3's were, at the painting's own shape. Until the pictures come, the maps draw from their tiles. The same batch asks, optionally, for three ending stills and the Hearth Below's card still (`CUTS`). |
| A11 | **The Hollow Council** (brief §9). Each of the four wears the gift sent to their chair: a Page V relic and a breakable piece. The tier is new: `hollow`, a d20 that adds +4 while the gift is held (§4.2). Snapping the gift off, or beating its wearer, frees them. Their `koText` is their own words, coming back to themselves. Back to back: after the first of them is beaten, the stair back up is sealed until the fourth falls. A wipe wakes the party at the Eternal Hearth, just above, and keeps who is already beaten ("never a wall"). |
| A12 | **Tamsin fights beside you** (the player's answer). She waits in the Chained Deep, where her return scene plays (`tamsin-return`). In the Unsmith's fight she is a **guest** on the party's side (§4.3): she acts on her own with her own moves (her `finale` kit) and wears the violet-black relic she bought with her starter (No. 71). The party does not command her. After the fight she gives that relic to the Warden, and it enters the Codex. |
| A13 | **Page V and the true ending** (the player's answer). Page V, "The Hearth Below", holds **No. 000, Fenwick's Poker**, and Nos. 67-74: the four gifts, Tamsin's relic and the Unsmith's three pieces. Every one comes on the main path (§3.4). Its reward is the Hearthkeeper's Oath. **Kindle Anew** needs No. 000, the Warden's **Masterpiece** (forged at Hilda's, §4.5) and **every page complete**, I to V (the two starters you passed over are not counted, as now). The Codex label reads "No. 000 / 074". |
| A14 | **The endings** (brief §9): Rekindle (the Sleepers chained again, the hearth as it was), Release (the chains broken, the hearth out) and Kindle Anew (the Sleepers freed and the hearth fed the Masterpiece, stirred with Fenwick's Poker). They are chosen at the Worldforge's heart, any time after the Unsmith falls; the player may walk away and come back. The choice is final for the save. Each ending plays its scene and its ending card, then the credits. The game goes on at the Keep afterwards, with the ending remembered (`game.ending`), and a last card names the post-game as the next chapter. |
| A15 | **The post-game is the next milestone** (the player's answer): the Heat ladder, the Awakened Champions' rematches, the Emberless Reach, the absorbed relics' return, the Sleepers at full power and the First Smith. M7 opens none of it, and names it only on the last card. |
| A16 | **The Unsmith is Harrow Ironvein, Hilda's twin.** The game has pointed at it since M4, and Act III says it. His tier is new: `unsmith`, **two d20s**, two intents and two moves every turn (§4.2). He fights in three phases with three breakable pieces. In phase 2 he wears relics you never claimed, **at most six** (§4.4), so a light collector still gets a fair fight and a full Codex makes him weaker. |

## Part B. Build spec

## 1. Scope

**In:**
- **The Opening:** the fifth council, the four boxes opened together, the Act III card.
- **Act III's four maps** (§2.1): the Hollow Hall, the Ash Stair, the Chained Deep and the Worldforge, in a new region, `below` (the Hearth Below). The Great Hall gains the vault stair (A5).
- **Hearthfires and zones:** 2 new Hearthfires (35 in all) and 1 zone.
- **Foes:** 3 new foe families and 5 uniques: the Hollow Council and the Unsmith.
- **Encounters:** 9 new ones, plus 2 Hearthfire entries.
- **Relics:** 9 (Page V with No. 000) and Page V's reward.
- **The finale:** Tamsin as a guest; the Unsmith in three phases, with two d20s and his stolen Arts.
- **The Masterpiece** at Hilda's.
- **The three endings** and their cards, and the credits.
- **Quests and the Ladder:** 3 quests, 5 Ladder posters (the two old rumours settle into the Unsmith's), 1 letter.
- **Save version 6.**
- **Batch 4 of the player's paintings** (§6.3).

**Out (the next milestone or later):**
- The post-game (A15).
- Companion recruitment (Luma, Kesh, Rook and Nettie stay hints; Tamsin is a guest in one fight, not a party member).
- New Omens (the six stay).
- Tamsin's duels 5 to 7 (the brief's seven are four; she comes back as an ally instead).
- The Hearthteller and cloud saves (M8).

**Stretch (only if every gate is green):**
- A `below` music track, and the Unsmith's own battle theme.
- The ending stills drawn by the player (A10).

## 2. World

### 2.1 Maps

| id | Name | Biome | Size | Zone | Music | Role |
|---|---|---|---|---|---|---|
| `hollow-hall` | The Hollow Hall | council | 36×24 | — | dungeon | beneath the vault: the Council's First-Age chamber, four great chairs; the Hollow Council, back to back |
| `ash-stair` | The Ash Stair | hearth-roots | 24×36 | `ash-stair` | dungeon | the hearth's roots: a stair down through drifted ash and glowing ember veins; the Under-Coal |
| `chained-deep` | The Chained Deep | chains | 42×28 | — | dungeon | the cavern of the chains: the First Sleeper under the hearth, the chains out to the other three; Tamsin; the Chain Fire |
| `worldforge` | The Worldforge | worldforge | 36×24 | — | boss | Harrow's forge at the bottom of the world: the Unsmith; the ending, at the forge's heart |

Every map uses the M3 map format and is registered in `MAPS` with `region: 'below'`. Each sets `lore` (the Atlas's
"you are here": the Keep's point, §5) and declares `roads` (A3). None is dark or foggy: the Act III road needs no light
key. The sizes are the painting shapes batch 4 asks for (3:2 or 2:3); when the pictures come, each map is traced from
its own at the painting's exact shape (A10), which may move every place on it. The ids and roles below stay.

`REGIONS.below`: "The Hearth Below", `act: 3`, `lore` at the Keep, `entries: ['hall-down']`, `brands: []`, `open: true`.
Everything that lists regions (the chapter cards' `ahead()`, the Journal's regions, the Atlas's views, the forge's
spoils, the encounter-region whitelists) learns that an Act III region has no Brands. The older chapter cards keep
listing only the Act II regions.

### 2.2 Connections and roads

- The Great Hall `hall-down` (the vault floor, gated and sealed, A5) leads to `hollow-hall`/`from-vault`, the foot of
  the stair in at the hall's south-west. The way back is `hh-up` to keep-hall `from-below` (the vault, (21,7), facing
  west). It is gated `{ any: [{ not: { beaten: 'hollow-miravel' } }, { beaten: 'hollow-gretch' }] }` and sealed with
  words while that does not hold: "The stair behind you has filled with ash. The Hollow Council sits until the last
  chair is empty."
- `hollow-hall` `hh-down` (the stair down at the east end) leads to `ash-stair`/`from-hall` (the top). The way back is
  `as-up` to `hollow-hall`/`from-ash`.
- `ash-stair` `as-down` (the bottom) leads to `chained-deep`/`from-stair`. The way back is `cd-up` to
  `ash-stair`/`from-deep`.
- `chained-deep` `cd-forge` (the forge door) leads to `worldforge`/`from-deep`. The way back is `wf-out` to
  `chained-deep`/`from-forge`.

The roads (the table `test/maps.test.mjs` pins), each from its anchor to its exit or fight, gates in the order you meet
them, named by their guards:

| map | from | to | gates |
|---|---|---|---|
| hollow-hall | from-vault | hh-down | hollow-miravel, hollow-qasim, hollow-brundar, hollow-gretch |
| ash-stair | from-hall | as-down | as-thralls |
| chained-deep | from-stair | cd-forge | cd-unmade |
| worldforge | from-deep | unsmith | wf-warden |

`ACT3_PATH = ['hearthstone-keep', 'hollow-miravel', 'hollow-qasim', 'hollow-brundar', 'hollow-gretch', 'under-coal',
'as-thralls', 'cd-unmade', 'chain-fire', 'wf-warden', 'unsmith']`. There are no leads in Act III (`ACT3_LEADS = {}`).

### 2.3 Layout of each map (what must be there; P2 draws the tiles, the paintings will move it)

Each map is laid out as batch 4 describes it (`art-requests/batch-4/places.md`), so the tiles and the paintings agree
on where the way in, the road and the way on go. Directions are the picture's: north is up.

- **hollow-hall** (36×24, landscape):
  - **The way in:** the stair up to the vault, at the south edge near the west end (`from-vault`, exit `hh-up`).
  - **The nave:** 5 tiles wide, from the stair's foot east along the hall's whole length, between two rows of pillars.
  - **The four chairs:** great stone chairs on daises in four bays behind the pillars, spaced evenly and alternating
    sides, each carved with its region's mark: the tree (north, sign `hh-chair-verdant`), the sun (south,
    `hh-chair-sunscorch`), the anvil under a mountain (north, `hh-chair-ironspire`) and the lantern among reeds
    (south, `hh-chair-gloomfen`). The signs take the look `painted` once painted.
  - **The gates:** across the nave before each chair, `hh-gate-1` to `hh-gate-4` (look `hollow-gate`: a line of soot
    across the floor that the gift's light will not let you cross). Each is held by its Council member, who stands
    beside it facing the stair (block): Miravel at the first, then Qasim, Brundar and Gretch.
  - **The far end:** the round First-Age council table (solid), with the nave passing round it, and past it, by the
    east wall, the stair down (`hh-down`; anchor `from-ash` at its head).
  - **The chest:** `hh-alms`, in an alcove in the north wall past the fourth chair.
- **ash-stair** (24×36, portrait):
  - **The way in:** the top edge, left of centre (`from-hall`, exit `as-up`).
  - **The stair:** 4 tiles wide, winding down in switchbacks along the shaft's walls, round an open drop (solid).
  - **The first landing** (the top third, east): the Under-Coal in its niche in the rock (Hearthfire `under-coal`,
    cold; a coal the size of a cart).
  - **The narrows** just below it, 3 tiles between two iron roots: gate `as-ash-gate`, held by the cinder-thralls
    (`as-thralls`).
  - **Two wide landings** (the middle, west; the lower third, east), where the zone's patrols roam (`ash-stair`).
  - **The side ledge** off the middle landing: the chest `as-cache`.
  - **The way on:** the bottom edge (`as-down`; anchor `from-deep` above it).
- **chained-deep** (42×28, landscape):
  - **The way in:** the stair at the north-west corner (`from-stair`, exit `cd-up`).
  - **The road:** a walkway of iron plates, 4 tiles wide, along the north part of the cavern above the Sleeper's hollow,
    bending down to the forge door in the middle of the east edge.
  - **The First Sleeper:** in the middle, curled asleep in its hollow under a web of great chains, with the hearth's
    iron roots sunk in its back (prop `sleeper-first`, large, solid; the painting carries it once painted).
  - **The chains:** three run from the web to tunnels at the south-west corner, the middle of the south edge and the
    south-east corner. They are signs, `cd-chain-lull`, `cd-chain-ash` and `cd-chain-hush`, and their words name where
    each goes (Misthollow's Lull, the Sleeper under the Sunscorch's ash, Frostmere's Hush). The fourth chain is the
    web over the Sleeper.
  - **The narrows:** halfway along, 3 tiles between a spur of rock and the hollow's rim: gate `cd-chain-gate`, held by
    the unmade (`cd-unmade`).
  - **The Chain Fire:** past the narrows, on a platform beside the walkway (Hearthfire `chain-fire`, lit).
  - **Tamsin:** on the paving before the forge door (`cd-tamsin`, `npc: 'tamsin'`, talk `tamsin-return`). She leaves
    the map once she has joined (`if: { not: { flag: 'tamsin-returned' } }`).
  - **The way on:** the forge door (`cd-forge`; anchor `from-forge` before it).
- **worldforge** (36×24, landscape):
  - **The way in:** the iron door in the middle of the west edge (`from-deep`, exit `wf-out`).
  - **The moat:** a molten channel, 3 tiles wide, from the north edge to the south edge a third of the way in (solid).
  - **The bridge:** across the moat in line with the way in, 3 tiles wide. Gate `wf-bridge-gate` stands at its near end,
    held by the forge-warden (`wf-warden`).
  - **The forge floor:** beyond the bridge, with the great anvil (solid) and the Worldforge in the east wall (solid,
    large), a heart-shaped furnace with molten channels running from it.
  - **The Unsmith:** on the open space before the furnace, his lair `unsmith` (3 by 2, his sprite's foot inside it;
    `finale: true`).
  - **The heart:** the step before the furnace's mouth, behind him (sign `wf-heart`, look `painted` once painted). Its
    talk opens the endings (§4.7) once `{ beaten: 'unsmith' }`.

### 2.4 The earlier maps and data this spec changes

- **keep-hall** (painted; no row changes):
  - the trigger `council-5` (A5), the exit `hall-down`, the anchor `from-below`, the prop `vault-stair` (not solid,
    `if: { flag: 'council-5-done' }`) on the exit's tiles, and the sealed words.
  - The four boxes on the vault's back row, (21-22, 6), solid: `vault-boxes` (soot-sealed,
    `if: { all: [{ flag: 'council-4-done' }, { not: { flag: 'council-5-done' } }] }`), then `vault-boxes-open` (opened,
    `if: { flag: 'council-5-done' }`). The way from the vault door to the stair, (20,7) to (21,7) to (21,8), stays
    open.
  - The fifth council's scene takes the four Council members out of their towns (their NPC `if`s, §3.1).
- **world.js:** REGIONS gains `below`. HEARTHS gains `under-coal` and `chain-fire`. ZONES gains `ash-stair`, with its
  backdrop. `ACT3_PATH` and `ACT3_LEADS` are new.
- **The fourth council's end-of-Act-II card** (FX): its line becomes "Act III begins." and its closed Act III chip
  opens. The pinned tests (`story-data`, `ui-m6`) are replaced one for one with checks of the new line, never deleted.
- **The Ladder:** the rumours "the man on the barge" and "the missing smith" become the Unsmith's poster once
  `council-5-done` (§3.6).

### 2.5 Hearthfires (2 new; 35 in all)

| id | map | Name | cold | look |
|---|---|---|---|---|
| `under-coal` | ash-stair | The Under-Coal | yes | `undercoal` (a coal the size of a cart, cracked and glowing) |
| `chain-fire` | chained-deep | The Chain Fire | no | `chainfire` (a fire in an iron brazier hung from a broken chain) |

### 2.6 Zones

`ash-stair`: its backdrop is `ash-stair`; `PATROLS['ash-stair']` holds cinder-thrall packs, rabble, 2 to 3 a pack.

### 2.7 Locks

None new. The Act III road has no lock: every door on it is a fight or a story flag.

## 3. Content

### 3.1 NPCs

- **The Council members** (`miravel`, `qasim`, `brundar`, `gretch`):
  - Once `council-5-done` they leave their towns (`if: { not: { flag: 'council-5-done' } }` on their map
    entities), and each returns once freed (`if: { beaten: 'hollow-<name>' }` on a new entity beside the old one).
  - Freed, each has a new talk line about the gift, what it showed them, and the Warden.
  - In the Hollow Hall they are fights only.
- **Fenwick:** after the Hollow Council, `fenwick-truth` (his talk, `if: { beaten: 'hollow-gretch' }`). He tells the
  truth: the hearth never burned wood. He has kept it for nine hundred years on the Sleepers' warmth, and his poker
  has kept him. He gives the Warden **Fenwick's Poker** (No. 000, `give`) "to stir what comes next". Without it he
  ages, and the scene says so (his later lines are an old man's).
- **Hilda:** after the Hollow Council, and holding the Worldforge page (`{ flag: 'worldforge-page' }`), she offers the
  **Masterpiece** (§4.5, quest `masterpiece`). Her brother is named at last.
- **Isolde:** Act III lines at the Keep; she holds the hall while the Warden goes down.
- **Tamsin** (`cd-tamsin`, `npc: 'tamsin'`): `tamsin-return`. She followed the barge to the bottom of the world, saw
  what the Unsmith is making, and is sorry. She joins the party for the one fight (`{ set: 'tamsin-returned' }`), and
  after it she gives up her relic (`tamsin-after`, `give: 'tamsins-bargain'`).

### 3.2 Foe families (3 new) and the five uniques

| id | Name | Tier | Kind | Aspect | Role |
|---|---|---|---|---|---|
| `cinder-thrall` | Cinder-Thrall | rabble (d6) | construct | ember | the Unsmith's ash-men, shaped from the hearth's own ash; the Ash Stair's packs and fights |
| `unmade` | The Unmade | veteran (d8) | undead | blight | relic-bearers the Worldforge unmade: husks still carrying the shape of what they held |
| `forge-warden` | Forge-Warden | veteran (d8) | construct | ember | a bellows-and-anvil construct that holds the Worldforge's bridge |
| `hollow-miravel` | Hollow Miravel | hollow (d20 +4) | human | verdant | the Elder of Eldergrove, wearing the Hollow Wreath |
| `hollow-qasim` | Hollow Qasim | hollow (d20 +4) | human | ember | the Cistern Lord, holding the Hollow Chalice |
| `hollow-brundar` | Hollow Brundar | hollow (d20 +4) | human | stone | the Thane, in the Hollow Gauntlet |
| `hollow-gretch` | Hollow Gretch | hollow (d20 +4) | human | blight | the Mayor, wearing the Hollow Chain |
| `unsmith` | The Unsmith | unsmith (two d20s) | human | ember | Harrow Ironvein, in three phases (§3.5) |

Each unique is `unique: true`, `noFlee: true`, never Twinned, with chosen Omens (§8). Each has a `koText`. The Council
members' `grudgeTitles` are their own.

### 3.3 Encounters (9 new, region `below`, plus 2 Hearthfire entries)

| id | Map | Mode | Foes | Holds |
|---|---|---|---|---|
| `hollow-miravel` | hollow-hall | block | hollow-miravel | `hh-gate-1` |
| `hollow-qasim` | hollow-hall | block | hollow-qasim | `hh-gate-2` |
| `hollow-brundar` | hollow-hall | block | hollow-brundar | `hh-gate-3` |
| `hollow-gretch` | hollow-hall | block | hollow-gretch | `hh-gate-4` |
| `as-thralls` | ash-stair | block | cinder-thrall ×3 + a thrall-overseer (cinder-thrall variant, veteran) | `as-ash-gate` |
| `as-patrol` | ash-stair | pack | cinder-thrall ×2-3 | (zone) |
| `cd-unmade` | chained-deep | block | unmade ×2 + cinder-thrall | `cd-chain-gate` |
| `wf-warden` | worldforge | block | forge-warden + cinder-thrall ×2 | `wf-bridge-gate` |
| `unsmith` | worldforge | lair, `finale: true`, `allies: [{ family: 'tamsin', kit: 'finale' }]` | unsmith | the finale |

The Hearthfire entries `under-coal` and `chain-fire` follow M6's pattern.

### 3.4 Relics: Codex Page V (No. 000 and Nos. 67–74)

| No. | id | Name | Slot | How it comes |
|---|---|---|---|---|
| 000 | `fenwicks-poker` | Fenwick's Poker | weapon (mace) | Fenwick gives it (`fenwick-truth`) |
| 067 | `hollow-wreath` | The Hollow Wreath | head (circlet) | Hollow Miravel (her piece) |
| 068 | `hollow-chalice` | The Hollow Chalice | offhand (focus) | Hollow Qasim (his piece) |
| 069 | `hollow-gauntlet` | The Hollow Gauntlet | hands | Hollow Brundar (his piece) |
| 070 | `hollow-chain` | The Hollow Chain | amulet | Hollow Gretch (her piece) |
| 071 | `tamsins-bargain` | Tamsin's Bargain | weapon (sword) | Tamsin gives it after the Unsmith (`tamsin-after`) |
| 072 | `unmaking-hammer` | The Unmaking Hammer | weapon (hammer) | the Unsmith (piece, phase 1) |
| 073 | `ironvein-apron` | The Ironvein Apron | body | the Unsmith (piece, phase 2) |
| 074 | `worldforge-heart` | The Worldforge Heart | ring | the Unsmith (piece, phase 3) |

- **What they are:** each has sockets, three deeds and two awakening branches, like every relic since M4.
- **Deeds:** none asks for the Branded deed (no Brand is left to win, M6 review B2); `test/data.test.mjs` checks this.
- **Rarities:** No. 000 and the Worldforge Heart are `primal` (the rarity exists and was never used); the rest are
  `regalia`.
- **Page V's reward:** the Hearthkeeper's Oath, `{ id: 'hearthkeepers-oath', name: "The Hearthkeeper's Oath", text: '+1 to every save and 5% resist to every aspect for every hero.' }`.

### 3.5 The Hollow Council, Tamsin and the Unsmith

- **The Hollow Council:**
  - **Tier:** `hollow`, a d20 plus 4 while the gift is held, capped at 20, so their gift Arts on the high faces come up
    more often. Pried loose, the gift drops the +4.
  - **Phases:** two each (at 1 and at 0.5).
  - **Their Arts:** each needs the gift (`requires`), with the usual fallbacks. Each one's second phase answers their
    own story: Miravel's thorns, Qasim's drought, Brundar's iron, Gretch's fear and favours.
  - **Beaten:** the gift comes off and is claimed, like a Champion's piece (not `keepsRelics`).
  - **Back to back:** no rest between the fights (A11). They are tuned together (§8).
- **Tamsin** (guest):
  - **Kit:** the `tamsin` family with a `finale` kit (`RIVAL_KITS`, P1 with P4), at party level + 2.
  - **Gear:** she wears Tamsin's Bargain.
  - **Her aim:** her moves go at the Unsmith (or his summons), and one of them pries at his pieces
    (a `pry` effect that adds grip damage).
  - **If she falls:** she stays down unless revived; the fight goes on, and she is up again afterwards.
- **The Unsmith:**
  - **Tier:** `unsmith`, two d20s: two intents shown and two moves every turn (§4.2).
  - **Pieces:** the Unmaking Hammer, the Ironvein Apron and the Worldforge Heart.
  - **Phases:**
    - **The Smith** (at 1): hammer blows, and Unmake (strips one hero's awakened power for 2 turns).
    - **The Thief** (at 0.66): he wears the relics you never claimed, at most six (§4.4); each gives him one Stolen Art.
    - **The Worldforge** (at 0.33): the forge's fire on every hero, and the heart's pull.
  - **The fight card** names him, his two dice, his pieces and, in phase 2, what he took.
  - **Losing:** a wipe wakes the party at the Chain Fire, and he waits (Grudges as for any unique).

### 3.6 Quests, the Ladder, letters

| id | Kind | Giver | Start | Steps | Reward |
|---|---|---|---|---|---|
| `hollow-council` | main | isolde | `council-5-done` | Beat the Hollow Council, all four (`beaten: hollow-gretch`); go down the Ash Stair to the Chained Deep (`met-tamsin-below`); beat the Unsmith; choose at the Worldforge's heart (`ending`) | — (the ending) |
| `masterpiece` | side | hilda | `{ all: [{ beaten: 'hollow-gretch' }, { flag: 'worldforge-page' }] }` | Bring Hilda what she asks (§4.5); forge the Masterpiece (`{ masterpiece: true }`) | the Masterpiece |
| `fenwicks-truth` | side | fenwick | `{ beaten: 'hollow-gretch' }` | Hear Fenwick out at the Eternal Hearth (`fenwick-truth`) | No. 000 |

- **The Ladder:** five posters.
  - **The Hollow Council:** four posters, silhouettes until `council-5-done`.
  - **The Unsmith:** his poster, silhouette until Tamsin's return.
  - **The two rumours** ("the man on the barge", "the missing smith") settle into it: they show "Found: the
    Unsmith" and point at his poster.
- **Letters:** one, `hollow`, shown by the Hollow Council's last after-scene: "Four chairs empty. You are very
  thorough, little Warden. Come down. I have kept the fire in for you. — H." (signed with his own initial at last).

## 4. Systems (rules, pure; P1)

### 4.1 Save version 6

`toV6` marks the version and adds `ending: null` at the top level of the game. Nothing else changes, so an M6 save
carries over whole. `saveProblems` accepts `ending` as null or one of `rekindle`, `release` and `anew`, and accepts a
Masterpiece (§4.5).

### 4.2 The new tiers

- **`FOE_TIERS.hollow`:** `{ die: 20, bonus: 4 }`. The bonus applies while the family's `bonusWhile` relic is held.
  The rolled face is `min(20, d20 + bonus)`, and the intent event carries the natural roll and the bonus (the UI
  shows "d20 +4").
- **`FOE_TIERS.unsmith`:** `{ die: 20, dice: 2 }`.
  - He rolls two intents at the end of his turn and acts twice on his next, one move per die, in the order rolled.
  - A Stagger breaks the next of the two.
  - The intent events carry `slot: 0 | 1`.
- **`DIE_STEPS`** is unchanged. A disarmed hollow member loses its bonus; the Unsmith never steps down.

### 4.3 The guest ally

- **Who:** an encounter's `allies: [{ family, kit, level? }]` makes units on the heroes' side with `guest: true`.
- **Their turns:** the engine plays them itself (`allyTurn`, like `foeTurn` but aimed at the foes; its target rules
  are `chooseTarget` turned round). They take no command, earn no XP, hold no relic claims, and are not in the party.
- **What counts:** they count for area moves, healing, revival and `strongest`. The fight is lost when every party
  hero is down, whether or not the guest still stands.
- **Afterwards:** nothing of the guest is saved; the encounter makes them again for a rematch.
- **In the UI:** the battle shows the guest on the party's side in her foe art (A9, §5).

### 4.4 The Unsmith's stolen Arts

- **What he takes:** at his phase 2 he takes up to six relics of Pages I-IV that the party has **never claimed**
  (`codex[id].claimed` false), highest codex number first.
- **What each gives:** one **Stolen Art**, a move built from the relic's aspect and slot. A weapon is a strike of its
  aspect; armour is a ward; a ring or amulet is a hex or a heal. Its name is "Stolen: <relic name>". Each also gives
  +1 Guard.
- **Seeded:** the choice is deterministic from the game, so the pre-fight card, the fight and the sim agree.
- **Shown:** the fight card and the foe plate list them.
- **Later:** they are the relics the post-game returns to the world (A15; not in M7).

### 4.5 The Masterpiece

- **Where and when:** at Hilda's forge, once `hollow-gretch` is beaten and the party holds the Worldforge page
  (`flag: 'worldforge-page'`, from M6's `dead-tongue` quest).
- **The price:** the page (spent), 5 embers, 5 silver, 2 bog amber and 2000 gold (P4 tunes the numbers).
- **What she forges:** the Warden chooses a weapon base and names it: 1 to 24 characters of letters, digits, spaces,
  `'` and `-`, scrubbed as a pasted code is, and shown only through `textContent`. Hilda forges one **primal** item at
  the party's level, with the best affix set of its base.
- **Its power:** a unique power, Kindle (a Legend Surge that lights every hero's fire: +1 to hit and 20 temporary HP
  for every hero).
- **Marked:** it is marked `masterpiece: true`, one per save, and is not a Codex entry.
- **Conditions and the card:** the condition `{ masterpiece: true }` holds while the party owns it. The card reveal
  shows it (the frozen reveal, with its primal frame).

### 4.6 Codex Page V and No. 000

- **Page V:** `PAGES` gains `{ id: 'below', no: 'V', name: 'The Hearth Below', nos: [0, 67, ..., 74], reward }`. A page
  may list its numbers (`nos`) where earlier pages give a range.
- **The label:** `codexNo` shows three digits, and its total is the highest number (`074`).
- **Claimable:** 73 of 75 (the two starters you passed over, as now).
- **`{ pages: 'all' }`:** holds when every page is complete as the Codex screen counts it.

### 4.7 The endings

- **The choice:** the Worldforge's heart (`wf-heart`, once `{ beaten: 'unsmith' }`) opens `the-heart`, with three
  choices:
  - **Rekindle** and **Release** are always there.
  - **Kindle Anew** needs
    `{ all: [{ owns: 'fenwicks-poker' }, { masterpiece: true }, { pages: 'all' }] }`. It is shown disabled with the
    reason while it doesn't hold, as a price you can't pay is.
- **What a choice does:** it sets `game.ending` (a new `{ ending }` effect) and plays its scene, which ends with
  `{ end: 'act3' }`. The UI then shows that ending's card, the credits and the last card (A14, A15), and returns the
  party to the Great Hall.
- **The heart afterwards:** it says what was chosen, and does nothing more.
- **Conditions:** `{ ending: 'rekindle' | 'release' | 'anew' | true }` is a condition, so the world can change after
  (the Keep's lines, the Sleepers' props).

### 4.8 Conditions and effects

- **New conditions:** `{ masterpiece: true }`, `{ pages: 'all' }` and `{ ending }`.
- **New effect:** `{ ending: id }`.
- **The encounter fields** `finale` and `allies`.
- **The rules they follow:** `condErrors` and the story-data tests learn all of them, and `road.test` learns `finale`
  (A3).

## 5. UI

- **Battle:**
  - **The guest:** she shows on the party's side at 360 px. Her card stands beside the party's four without horizontal
    scroll; it can be tapped for her details (44 px) but takes no command. Her turn plays like a foe's, with her own
    move banner (`data-side="guest"`).
  - **The dice:** two intent dice over the Unsmith, and "d20 +4" on a Council member while their gift holds.
  - **What he took:** the stolen Arts on his plate and card.
- **The Masterpiece:** Hilda's forge gets a Masterpiece tab (base, name field, price, the reveal). The name is typed
  into an `<input>`, scrubbed, and shown only through `textContent`.
- **Cards:**
  - The Opening's title card: "Act III: The Hollow Council".
  - The Hearth Below's card, the first time down the vault stair, with the player's still if painted.
  - The fourth council's end card, updated (§2.4).
- **The endings:**
  - The choice, with Kindle Anew's reasons when locked.
  - Three ending cards, each with the player's still if painted, else a drawn scene.
  - The credits.
  - The last card ("The post-game opens in the next chapter").
- **Codex:** Page V (No. 000 first) and the label "No. 000 / 074".
- **Journal and Atlas:**
  - The Journal's Act III.
  - The Atlas's "you are here" under the Keep: a "Below the Keep" marker on the Keep, with the four maps listed.
- **Music:** the Act III maps play `dungeon` and the Worldforge `boss`. A `below` track is a stretch.

## 6. Art

### 6.1 Overworld (P5)

- **Tiles:** the four biomes (`council`, `hearth-roots`, `chains`, `worldforge`; `ash` and `forge` are already Scorchgate's
  and Harrow's Forge's), drawn until the paintings land.
- **Props:**
  - `vault-stair` (a stair going down through the vault floor), `vault-boxes` and `vault-boxes-open` (the four
    soot-sealed boxes, then opened);
  - `sleeper-first` (large), the chains (`chain` sign look), the Worldforge (large);
  - the gate look `hollow-gate`;
  - the Hearthfire looks `undercoal` and `chainfire`.
- **Walkers:** `cinder-thrall`, `unmade` and `forge-warden`; the four Hollow Council members (hollowed: the same folk,
  grey, their gifts glowing violet-black); and the Unsmith (big).

### 6.2 Battle and item art (P6)

- **Foes:** the four Hollow Council members (each a corrupted version of their own look, the gift glowing
  violet-black); the Unsmith in three phases (the Smith with his hammer, the Thief hung with glinting stolen relics,
  the Worldforge with the heart burning in his chest); `cinder-thrall`, `unmade` and `forge-warden`.
- **Tamsin as the guest:** her foe art, drawn facing the foes on the party's side.
- **Backdrops:** the four maps.
- **Item art:** the nine Page V relics, and the Masterpiece's primal frame.

### 6.3 The player's paintings (batch 4)

- **Maps:** four, painted from written descriptions (`art-requests/batch-4.md`, the places in
  `art-requests/batch-4/places.md`). Each description says the picture's shape (3:2 or 2:3), what must be there (the
  road, the doors and stairs, the plain spots where the game draws a fire, a fight or a person), and the mood.
- **Stills:** optionally, the three ending stills and the Hearth Below's card still: `cut-ending-rekindle.png`,
  `cut-ending-release.png`, `cut-ending-anew.png` and `cut-hearth-below.png`, imported as the `CUTS` stills
  `ending-rekindle`, `ending-release`, `ending-anew` and `hearth-below`. A screen shows the still when it is listed
  and draws its own scene when it is missing, as the other cards do.
- **When they come:** each map is traced from its painting, as batch 3's were (`tools/paint-sheet.mjs`,
  `paint-import.mjs --grid`, `art-in/batch-4/panels.json`), and the maps' places move to where the painting puts them.

## 7. Work packages

| Pkg | Owner | Files (owns) |
|---|---|---|
| P1 rules | lead | `rules/*` (the tiers in `ai.js` and `battle.js`, the guest in `battle.js`, stolen Arts in `foe.js`/`battle.js`, the Masterpiece in `forge.js`, Page V and `{ pages }` in `codex.js`, `cond.js`, `story.js` `{ ending }`, `migrate.js` toV6), `data/foes.js` (FOE_TIERS only), `data/rivals.js` (the finale kit, with P4), `data/codex.js`, `data/tuning.js`, `core/save.js`, their tests |
| P2 maps | agent | `data/maps/{hollow-hall,ash-stair,chained-deep,worldforge}.js`, `data/maps/index.js`, `data/maps/keep-hall.js` (§2.4: the exit, anchor and prop; not the trigger), `data/tiles.js`, `data/world.js`, `test/maps.test.mjs` (Act III), `test/walk.test.mjs` (ACT3_PATH), `test/road.test.mjs` (its map list and the finale), `tools/map-draft.mjs` |
| P3 story | agent | `data/npcs.js`, `data/dialogue.js`, `data/quests.js`, `data/ladder.js`, `data/letters.js`, `data/maps/keep-hall.js` (the council-5 trigger only), `test/story*.test.mjs` |
| P4 foes and relics | agent | `data/foes.js` (not FOE_TIERS), `data/encounters.js`, `data/relics.js`, `data/rivals.js` (the finale kit's moves, with P1), `data/items.js` (if needed), `tools/sim.mjs`, `docs/RULES.md`, `test/data.test.mjs`, `test/loot.test.mjs`, `test/battle.test.mjs` (new cases) |
| P5 overworld art | agent | `art/tiles.js`, `art/walkers.js`, `art/map-sprites.js`, `tools/gallery*.{mjs,js}` |
| P6 battle and item art | agent | `art/foes.js`, `art/scenes.js`, `art/recipes.js`, `art/item-looks.js`, `art/item-art.js`, `art/icons.js`, `art/index.js` |
| P7 UI | agent | `ui/screens/*`, `ui/battle/*`, `ui/world/*`, `ui/lib/*`, `core/audio.js`, `ui/*.css`, `tools/e2e-world.mjs`, `tools/e2e-battle.mjs`, `tools/e2e-flow.mjs` |
| P8 painted art | lead | the batch-4 request, `tools/paint-*.mjs`, `ui/assets/{paint,cuts}/*`, `test/paint.test.mjs` |

**Order:**
1. The spec and scaffold (every id stubbed, every test green), then step 0 (the lead).
2. The batch-4 request goes to the player at once, so they can paint while the rest is built.
3. P1 with P2 to P5 in parallel; P6 and P7 when the foe and relic data land.
4. Integrate and tune, two independent reviews, and deliver (A6). The paintings are traced whenever they arrive.

**Stand-ins in the scaffold** (as in M6):
- A stub foe family borrows its source family's numbers, moves and `art`.
- Stub encounters and maps use the Keep's backdrop.
- Stub relics have stand-in `RELIC_ART` entries marked `stub: true`.
- `test/art-keys.test.mjs` fails for a new key until both halves have landed; nothing else may fail.

## 8. Verification

- **Unit:**
  - **Rules:** the hollow tier (the +4 while the gift holds, lost when it is pried); the Unsmith's two dice (two moves
    a turn, a Stagger breaks the next); the guest (acts on her own, doesn't count for defeat, no XP); the stolen Arts
    (at most six, never-claimed, highest first, deterministic).
  - **The Masterpiece:** its conditions, its price, one per save, and the name scrubbed, including a hostile string.
  - **The Codex:** Page V with No. 000, the label, `{ pages: 'all' }`.
  - **The endings:** each one's condition and effect, and Kindle Anew locked with its reasons.
  - **Saves:** `toV6` on every fixture and every earlier milestone's save shape.
  - **Maps:** reachable from the vault once the fifth council is sat; the stair back sealed after the first
    Council fight and open after the fourth; `road.test` for every new map, with the finale; the walk bot down
    `ACT3_PATH` from a Gloomfen-complete save.
  - **Story data and relics:** every flag read is set, and the council-5 trigger is flag-guarded; no Page V relic asks
    for the Branded deed.
- **e2e-world:**
  - the Opening's title card, and the vault stair sealed before it and open after;
  - the Hearth Below's card;
  - the Hollow Hall's stair sealed behind after the first fight;
  - Tamsin in the Chained Deep, joining;
  - the heart's choice, with Kindle Anew locked and its reasons shown;
  - an ending card, the credits and the last card;
  - the Masterpiece named with a hostile string, which shows as text.
- **e2e-battle:**
  - a Hollow Council member (d20 +4, the gift snapped, the +4 gone, freed);
  - the Unsmith through three phases with two dice, his stolen Arts, and Tamsin fighting beside the party at 360 px.
- **e2e-flow:** the M6 profile carries over, and Page V shows.
- **e2e-codes:** AETH1 to AETH5 still load, and M6 codes carry over.
- **Balance** (`tools/sim.mjs`, from the `gloomfen` run's end state, Waking 8, party level about 36.5):
  - **The Hollow Council**, back to back from a rest at the Eternal Hearth, first try: 35–45% of runs wipe somewhere
    in the four, and no single Council member above 25%.
  - **The Unsmith** with Tamsin, first try: wipe 30–40%, with the sim's own claimed set deciding his stolen Arts.
  - **A forged party** against the Unsmith: ≤ 20%.
  - **The road fights:** ≤ 10% each.
  - **Earlier targets:** every M3 to M6 target unchanged.
  - **Stuck runs:** 0.
- **Performance:** each Act III map at 4× throttle, p95 frame JS ≤ 16 ms and ≤ 40 `drawImage`.
- **Size:** the game under 3.2 MB and the paintings under 32 MB. The delivery zip is under 30 MiB, with the one HTML
  inside.
- **No stand-in is left:** no `stub: true`, no "STUB from the M7 scaffold" comment, and every Act III backdrop in
  `BACKDROPS`.

## 9. Risks and cut order

| Risk | Plan |
|---|---|
| The guest in the battle UI at 360 px | Her card is narrower than a hero's; she can sit on the stage's near side instead if five cards will not fit |
| Two d20s make the Unsmith swingy | Tune with the sim; a Stagger breaks the second move; his phase tables keep the worst moves apart |
| Back to back is a wall | A wipe keeps who is beaten; the sim targets the four together, not one at a time |
| The download past 30 MiB | A zip (A6), tested by unzipping and opening it in e2e-flow |
| The paintings arrive late | The maps play from tiles; tracing is a later, separate commit |
| Agents run out of usage mid-package | Small packages, notes files, stubs that keep the tests green |

**Cut order** (last first):
1. The stretch goals.
2. The ending stills.
3. The Masterpiece's Kindle power (keep the item and the condition).
4. The stolen Arts (the Unsmith's phase 2 gets fixed Arts instead).
5. Tamsin as a guest (she fights in the story's words only).
