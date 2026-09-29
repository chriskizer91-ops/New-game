# M6 spec: the Gloomfen Marsh, Hodge, and Tamsin's fall

The roadmap's M6 row: "Gloomfen, Hodge, Tamsin's fall" (`docs/DESIGN-BRIEF.md` §9, §13). After the third council,
Willowmurk's elders send for the Warden, the first outsider they have summoned in decades, and the fen stair below
Mossfall opens onto Willowmurk's safe paths. The Gloomfen is the player's own country (`aethermoor-interactive-image-map-polished.html`,
`art-in/extra/region-gloomfen.jpg`): Bogmire on its stilts, where children follow a lantern into the fen at night;
Rotbridge, the one crossing of the Blackwater Channel, kept by Hodge, who is not actually a troll; Willowmurk, where
the wards are failing; the Misthollow Ruins, a city the marsh swallowed, whose bells still ring under the water. The
Blackwater has held the causeway since spring: the Tallymen have chained the thing that lives in it. Tamsin answered
a soot-sealed letter, and on Rotbridge she pays for it. Two Brands make eight coals, and the fourth council ends Act II.
M6 is built **road-first** on the Milestone 4.5 contract (`docs/M45-SPEC.md`), as M5 was. Part A overrides Part B.

## Part A. Decisions (these win)

| # | Decision |
|---|---|
| A1 | **Its own file and save** (the player's rule). M6 writes only `aethermoor.save.m6` (+ `.bak`, `aethermoor.m6.started`) and reads, newest first, the M5 save (`aethermoor.save.m5`), then Milestone 4.5's, M4's, M3's and M2's, never writing them. The download is `dist/aethermoor-m6.html`; step 0 freezes `dist/aethermoor-m5.html` (its sha256 pinned beside the others). |
| A2 | **Save version 5.** `rules/migrate.js` chains `toV2`, `toV3`, `toV4` and a new `toV5`, which fills what M6 adds (§4.1) and only that. Codes are `AETH5.`; AETH1 to AETH4 still load. The version bump keeps the M5 file, whose code check stops at AETH4, from loading an M6 save it cannot read (it names an `AETH5.` code as newer). |
| A3 | **Road-first.** Every M6 map declares its `roads`; every fight on `GLOOM_PATH` holds a gate (or a Brand); lead fights guard their side roads; no route or lead fight is a roaming pack. `test/road.test.mjs` covers the new maps with no new code (its map list grows). Zone patrols roam as before, and a caught weak pack is a full battle. Every fight is a full battle with the dice, and Auto starts off, as in M4.5 and M5. |
| A4 | **One order.** The Brand of Lanterns (the Lantern Mother, in the eastern bogs) comes first; the long boardwalk's east end, onto the Misthollow Ruins, opens with it. Then the Brand of the Deep (the Blackwater Leviathan, on the Tidal Flats). |
| A5 | **The ways in.** Mossfall's fen stair (`mf-fen-stair`) opens once the third council is sat (`council-3-done`), onto the Murkway: Willowmurk's safe paths. The Keep's south-west gate (`keep-sw`) opens onto the Blackwater Causeway once the Blackwater falls (`{ brand: 'brand-of-the-deep' }`): the way home, as the Highfold was M5's. Nothing past the fourth council opens: Act III is the next chapter. |
| A6 | **Size.** The game keeps M5's limits (warns above 2.5 MB, fails above 3.2 MB; `--minify` in reserve). The player's paintings have their own limit, set by the player's answer on batch 2 (§6.3): it is not raised or lowered by any package. |
| A7 | **Building** as in M5: the lead builds the rules (P1) and integrates; agents build maps, story, foes and relics, art and UI in parallel with disjoint files (§7), never run git, build into private folders and write `game/notes/M6-<pkg>.md`. Before a package is committed, the lead lists the assertions its test files lost against the base (the M5 lesson). |
| A8 | **Ids are fixed by this spec.** A package may add ids only inside its own files; a missing id is asked for in its notes. |
| A9 | **Frozen, as before:** `art/heroes.js`, `art/hero-looks.js`, the card reveal, the M2 encounter and spawn arrays, and every delivered file (M2, M3, M4, M4.5, M5). Earlier content changes only where §2.4 says. |
| A10 | **The player's own art, at full detail.** Batch 2 (`art-requests/batch-2.md`, 26 paintings of the Verdant and Sunscorch maps) lands as it comes back, under the budget the player chooses (§6.3). The player's world painting (`art-in/extra/world-aethermoor.jpg`) becomes the title screen's backdrop, and the regional painting (`art-in/extra/region-gloomfen.jpg`) is the still on the card that opens the Gloomfen (the first time the fen stair is taken). Both are `CUTS` stills; a screen draws its own scene when one is missing. |
| A11 | **Hodge's toll** (the brief's No. 077, the player's "Bridge Troll"). Hodge keeps a toll-bar across Rotbridge. Talking to him offers three ways past: pay today's price (it changes daily, §4.4; it is always something a party can come by), play his best-of-three toll game (a contest: Persuasion, Deception and Intimidation; once a day; winning gives passage for good and Hodge's Unfair Toll), or fight him ("a terrible idea": `hodge` is a full battle tuned to go badly, §8). The bar opens on `{ any: [{ flag: 'toll-paid' }, { beaten: 'hodge' }] }`. |
| A12 | **Tamsin's fall.** Her fourth duel waits on Rotbridge past Hodge's bar (`tamsin-rotbridge`, road block; a yield opens the way too). She fights with her starter one last time, with a Gloomfen kit (§4.3), wearing the Bogstriders (they drop when you win). Win or yield, the scene after it is her fall: a black barge comes out of the fog, and she trades her starter to the Unsmith for a relic that bleeds violet-black, and goes with him (`tamsin-fallen`). That relic is not in M6's data: it enters the Codex with Act III. |
| A13 | **The end of Act II.** The Brand of the Deep is the eighth coal. With both Gloomfen Brands `earnBrand` sets `gloomfen-complete`; the fourth council (Mayor Gretch takes the Gloomfen's chair; four soot-sealed boxes on the table) ends on the end-of-Act-II card, which names Act III and opens nothing. |

## Part B. Build spec

## 1. Scope

**In:**
- **The Gloomfen Marsh:** 12 maps (§2.1) and a fourth reliquary room; 8 Hearthfires (3 cold); 4 new lock types and new keys for five older locks; 10 new foe families (2 of them Champions); 25 encounters; Tamsin's fourth duel and her fall; 14 relics (Codex Nos. 53–66) and Codex Page IV's reward; 5 quests, 4 bounties, 8 Ladder posters, 2 Unsmith letters, 2 shops and a new gem; the Sleeper's scene; the fourth council and the end of Act II.
- **Hodge** (A11): the toll game, the daily price, the terrible fight, and the ferry his relic calls.
- **Two statuses from the brief** (§4.2): `rotting` and `hexed`, used by the fen's hags and drowned and by the Lantern Mother.
- **The fog** (§4.4): a soft lock that closes in the sight on a foggy map, as darkness does on a dark one.
- **The player's paintings** (A10): batch 2 as it lands; the title backdrop; the Gloomfen's opening still.

**Out (later milestones):** Act III (the Hollow Council, the Unsmith, the endings: M7); Tamsin's corrupted relic as an item; companion recruitment (Nettie, like Luma and Kesh, stays a hint); the Signature Masterpiece; Table Mode; card PNG export; the Hearthteller; new Omens (the six stay: a bigger pool would change every earlier region's balance).

**Stretch (only if every gate is green):** fireflies and drifting mist over the Lanternfen; the choir's hum under Misthollow as a quiet layer of the `fen` track; Hodge's daily prices from three to five.

## 2. World

### 2.1 Maps

| id | Name | Biome | Size | Zone | Music | Role |
|---|---|---|---|---|---|---|
| `murkway` | The Murkway | fen | 44×40 | `murkway` | fen | Mossfall's fen stair → Willowmurk: the safe paths through the bog |
| `willowmurk` | Willowmurk | willow-village | 30×26 | — | town | the hidden village; Elder Moss; the failing wards; hub 1 |
| `rotbridge` | Rotbridge | channel | 40×28 | — | fen | the one crossing of the Blackwater Channel: Hodge's toll-bar, Tamsin's duel, the fall |
| `bogmire` | Bogmire | stilt-town | 34×28 | — | town | the stilt town; Mayor Gretch, Nettie; the Bogmire board; hub 2 |
| `lanternfen` | The Lanternfen | bog (fog) | 40×32 | `lanternfen` | fen | Bogmire's eastern bogs, where the children follow the lights; Mother Grue |
| `mothers-hollow` | The Mother's Hollow | drowned-grove (dark) | 22×20 | — | dungeon | the Lantern Mother (Champion); the sleeping children |
| `long-boardwalk` | The Long Boardwalk | boardwalk | 56×18 | `boardwalk` | fen | Bogmire → the Misthollow Ruins, on stilts over open water (east end: the Brand of Lanterns, A4) |
| `misthollow` | The Misthollow Ruins | sunken-city (fog) | 36×32 | `misthollow` | fen | the sunken city; the salvage camp; Corvus; the stair down to the belfry |
| `drowned-belfry` | The Drowned Belfry | belfry (dark) | 22×24 | — | dungeon | beneath Misthollow: the drowned choir, the Drowned Cantor; the Sleeper under the floor |
| `blackwater-reach` | The Blackwater Reach | channel | 48×26 | `blackwater` | fen | Misthollow → the Tidal Flats, down the lower channel among sunk boats; Old Jaws |
| `tidal-flats` | The Tidal Flats | mudflat | 40×30 | `tidal-flats` | fen | the channel mouth: the Tallymen's barge-camp and the Leviathan's deep (Champion) |
| `causeway` | The Blackwater Causeway | causeway | 48×16 | `causeway` | road | Bogmire ↔ the Keep's south-west gate, once the Blackwater falls (A5) |

Every map uses the M3 map format, is registered in `MAPS`, has `region: 'gloomfen'`, sets `lore` (the Atlas's
"you are here", §2.5) and declares `roads` (A3). The Lanternfen and the Misthollow Ruins set `fog: true` (§4.4); the
Mother's Hollow and the Drowned Belfry set `dark: true`. A fourth reliquary room joins the Keep:
**`keep-gallery-3`, the Gloomfen Gallery** (18×8), through a door on the east wall of the Ironspire Gallery; Codex
Page IV's 14 pedestals stand on its rows 2 and 5 in codex order.

Geography follows the player's regional painting in spirit (the long boardwalk from Bogmire to Misthollow, the
channel down to the Tidal Flats and the Aethersea) and the Atlas's markers for "you are here". Where the two
pictures disagree about compass points, the walking order below wins.

### 2.2 Connections

```
mossfall (mf-fen-stair, gated on council-3-done) ── murkway ── willowmurk ── rotbridge ── bogmire ─┬─ lanternfen ── mothers-hollow
                                                                                                   ├─ long-boardwalk (east end: brand-of-lanterns) ── misthollow ─┬─ drowned-belfry
                                                                                                   │                                                              └─ blackwater-reach ── tidal-flats
                                                                                                   └─ causeway (bm-causeway: brand-of-the-deep) ── keep (keep-sw: brand-of-the-deep)
keep-gallery-2 (east door) ── keep-gallery-3
```

**The critical path** (`GLOOM_PATH` in `data/world.js`; the sim and the walk test follow it):
`mk-leeches`, `reed-shrine`, `mk-reedcutters`, `willow-hearth`, `wm-wights`, `toll-lamp`, `tamsin-rotbridge`,
`stilt-hearth`, `lf-moths`, `fen-cairn`, `lf-hags`, `lantern-mother`, `lb-drowned`, `bell-hearth`, `mh-salvage`,
`mh-ringers`, `wreck-fire`, `br-barge`, `flats-beacon`, `tf-bargemaster`, `blackwater-leviathan`.
Hodge's toll-bar stands between `toll-lamp` and `tamsin-rotbridge`; it is a gate, not a fight: the walk bot pays
the day's price (the sim skips it: nothing is fought).
**Leads** (`GLOOM_LEADS`): `willow: ['wm-willow']`, `grue: ['grue-hollow']`, `cantor: ['db-choir', 'cantor']`,
`jaws: ['old-jaws']`, `hodge: ['hodge']`.

No hard lock stands on the critical path: its locks are the soft `bog` and `fog` (§2.7), and its gates open on its
own fights, Hodge's price and the Brand of Lanterns.

**Roads** (A3; the gates the map package places, in order):

| Map | Road | Gates (guard) |
|---|---|---|
| `murkway` | `from-mossfall` → the exit to Willowmurk | `mk-leeches` (leeches in the ford of the safe path), `mk-reedcutters` (the Tallymen's cut through the reeds) |
| `willowmurk` | the east gate → the west road to Rotbridge | `wm-wights` (willow-wights at the broken ward-gate) |
| `willowmurk` | the west road → `wm-willow` (a side road out past the wards) | — (the lair is the lead; the side road is behind a `witch-ward`, §2.7) |
| `rotbridge` | `from-willowmurk` → the exit to Bogmire | `rb-toll-bar` (Hodge's bar: `open: { any: [{ flag: 'toll-paid' }, { beaten: 'hodge' }] }`, no guard; Hodge stands beside it), `rb-far-gate` (`tamsin-rotbridge`: `open: { any: [{ beaten: 'tamsin-rotbridge' }, { flag: 'tamsin-yielded-4' }] }`) |
| `lanternfen` | `from-bogmire` → the way into the Mother's Hollow | `lf-moths`, `lf-hags` |
| `long-boardwalk` | `from-bogmire` → the east end (A4) | `lb-drowned` (the drowned at the boardwalk's broken middle) |
| `misthollow` | `from-boardwalk` → the exit to the Blackwater Reach | `mh-salvage` (the salvage camp's chain across the old street), `mh-ringers` (the drowned bell-ringers at the water-gate) |
| `drowned-belfry` | from Misthollow's stair → `cantor` | `db-choir` |
| `blackwater-reach` | `from-misthollow` → the exit to the Tidal Flats | `br-barge` (a Tallyman barge moored across the channel path) |
| `tidal-flats` | `from-reach` → `blackwater-leviathan` | `tf-bargemaster` (the barge-camp's chain-post) |

Also: the long boardwalk's east exit (`lb-e`) gets `gate: { brand: 'brand-of-lanterns' }` with a `sealed` text and
`hint`; Bogmire's causeway exit (`bm-causeway`) gets `gate: { brand: 'brand-of-the-deep' }` with a `sealed` text and
`hint`.

### 2.3 Layout of each map (what must be there; P2 draws the tiles)

- **murkway:** the foot of the fen stair (a cliff stair down from Mossfall's cliffs, north edge) and the safe path
  south-east through reed-beds, black pools and tussock: the path is the road; the bog either side is `bog` (soft,
  §2.7). `mk-leeches` in a ford of the path; `reed-shrine` (a reed shrine on a hummock, a lamp in it) midway;
  `mk-reedcutters` (Tallymen cutting a way through the reeds with a chain across it); `mk-bogfolk` (pack) in a side
  pool; a chest out in the bog. A sign: "Willowmurk. Keep to the path. The path keeps to you."
- **willowmurk:** a village of reed-thatched huts under great weeping willows, on islets joined by plank walks,
  inside a ring of ward-stones (three are dark: the wards are failing). `willow-hearth` in the moot-circle. NPCs:
  Elder Moss (`moss`) under the oldest willow, Sedge the herb-seller (`sedge`, shop), a villager (`wm-villager`).
  The east gate (from the Murkway) and the west road (to Rotbridge) with its broken ward-gate (`wm-wights`); a side
  road out past the wards to Grandfather Willow (`wm-willow`, lair), behind a `witch-ward`.
- **rotbridge:** the Blackwater Channel, wide, slow and black, crossed by one ancient timber-and-stone bridge whose
  carvings seem to shift. East bank: `toll-lamp` (a lamp-post Hearthfire by the road), Hodge's toll-house and his
  toll-bar (`rb-toll-bar`), Hodge (`hodge`, npc) on a stool beside it. On the bridge's far half: Tamsin
  (`tamsin-rotbridge`) and her gate (`rb-far-gate`). West bank: the road to Bogmire; a ferry dock (a `blackwater`
  lock) out to a reed islet with a chest; `rb-gars` (pack) in the shallows below the bridge. The fall's barge comes
  out of the fog downstream (a prop the scene uses).
- **bogmire:** a ramshackle stilt town over black water: plank streets on piles, rope bridges, lanterns on poles,
  the eastern quarter's stilts rotting (a closed street, a sign). `stilt-hearth` in the market square. NPCs: Mayor
  Gretch (`gretch`) at the moot-hall, Nettie the Swamp Witch (`nettie`, shop) in her hut of bottles and drying
  herbs, Widow Pell (`pell`), the Stilt-Watch (`bm-watch`), the Bogmire board (`bm-board`, bounties). Exits:
  Rotbridge (east road), the Lanternfen (north-east, the eastern bogs), the long boardwalk (east), the causeway
  (north, `bm-causeway`, A5).
- **lanternfen:** open bog and dead trees, foggy (`fog: true`): small lights hang over the water. `lf-moths`,
  `fen-cairn` (cold), `lf-hags` along the road; `lf-lights` (pack); Mother Grue's hollow (`grue-hollow`, lair) in a
  sunken hut behind a `witch-ward`; a chest behind a `bog` stretch; the way into the Mother's Hollow (a drowned
  grove) at the far end. Small boots in the mud (a sign: "Small bootprints, all going one way.").
- **mothers-hollow:** a drowned grove of black willows around a sunken house whose lamps are all lit; dark
  (`dark: true`). `lantern-mother` (champion lair, 3×2). The children asleep in the lamplight (props the scene
  uses). The Brand scene plays here.
- **long-boardwalk:** the long boardwalk from the painting: planks on stilts over open water, lamp-posts, a broken
  middle patched with barge-planks. `lb-drowned` (block) at the broken middle, `lb-lights` (pack) on a side jetty, a
  moored skiff with a chest behind a `blackwater` dock. The east end: `lb-e`, sealed until the Brand of Lanterns
  ("The lights on the boardwalk won't let anyone past."; hint: "The lights will go out when the Lantern Mother
  rests.").
- **misthollow:** the sunken city: towers leaning out of the water, arches, half-drowned streets, belltowers,
  foggy (`fog: true`). `bell-hearth` (cold: a fire-bowl in a dry belfry), the Tallymen's salvage camp across the
  old street (`mh-salvage`: cranes, a diving bell, the sealed chest (a prop) on the jetty), Corvus (`corvus`) on a
  broken pier, `mh-ringers` at the water-gate on the way south, the stair down to the Drowned Belfry, a chest in a
  flooded tower behind a `blackwater` dock.
- **drowned-belfry:** a drowned bell-hall under the city: bells hanging in green water-light, air pockets, the
  choir-stalls; dark (`dark: true`). `db-choir` (block), `cantor` (lair, behind the choir). Under the floor, the
  Sleeper (a prop: a shape, and a slow light that comes and goes).
- **blackwater-reach:** the lower channel between reed-banks: sunk boats (the Leviathan's work), a towpath, a
  drowned mill. `wreck-fire` (cold) in a beached hull, `br-barge` (block) across the towpath, `br-gars` (pack),
  Old Jaws's pool (`old-jaws`, lair) behind a `blackwater` dock.
- **tidal-flats:** mudflats and tide-pools where the channel meets the Aethersea; wrecks; the Tallymen's
  barge-camp with the great chain running out into the deep (`tf-bargemaster`: the chain-post); `flats-beacon`
  (the camp's beacon, a Hearthfire); the Leviathan's deep (`blackwater-leviathan`, lair, 3×2) at the chain's end.
- **causeway:** a raised stone causeway across Mirrordeep's shallows, drowned since spring: open (and dry) only
  once the Blackwater falls (A5). `cw-lights` (pack) on the reeds; a sign where the water-mark still shows.

### 2.4 The earlier maps and data this spec changes

- `mossfall.js`: `mf-fen-stair` becomes `{ id: 'mf-fen-stair', area, to: 'murkway', anchor: 'from-mossfall', gate: { flag: 'council-3-done' }, sealed: { region: 'gloomfen', text, hint } }` (its text stays; hint: "The stair opens once the Council has sat a third time.").
- `keep.js`: `keep-sw` becomes `{ id: 'keep-sw', area, to: 'causeway', anchor: 'from-keep', gate: { brand: 'brand-of-the-deep' }, sealed: { region: 'gloomfen', text, hint } }` (its text stays; hint: "The causeway clears once the Blackwater falls."), with the anchor `from-causeway`.
- `keep-gallery-2.js`: a door on its east wall to `keep-gallery-3`.
- `world.js`: `REGIONS.gloomfen` gets `brands: ['brand-of-lanterns', 'brand-of-the-deep']`, `open: true`; `HEARTHS`, `ZONES`, `LORE.bogmire|rotbridge|willowmurk|misthollow` get their `map`; `GLOOM_PATH`, `GLOOM_LEADS`.
- `locks.js`: the new locks (§2.7) and new keys for five older ones.
- `codex.js`: Page IV gets `from: 53, to: 66` and its reward (§3.4).
- `encounters.js`: `BRANDS` gains `brand-of-lanterns` { from: 'lantern-mother', region: 'gloomfen' } and `brand-of-the-deep` { from: 'blackwater-leviathan', region: 'gloomfen' }. After both, `earnBrand` sets `gloomfen-complete`.
- `dialogue.js`, `npcs.js`: Isolde's word after the third council (`isolde-gloomfen`) now sends the Warden to the fen stair ("Willowmurk's elders have sent a reed-token..."); the Keep's south-west gate guard (`gate-guard-sw`) has lines for the open causeway; the third council's closing lines may be retold to match (P3).
- `ui/world/story-fx.js`: the third council's card names the fen stair as open (not "the next chapter"); a new `end: 'gloomfen'` card closes Act II (§5).

### 2.5 Hearthfires (8 new; 33 in all)

The Atlas points are spread so that all 33 fires stay 43 px apart in the realm view on a phone (`test/shell.test.mjs`).

| id | Map | Name | Cold | Lore (1200×800) |
|---|---|---|---|---|
| `reed-shrine` | murkway | The Reed Shrine | no | [288, 487] |
| `willow-hearth` | willowmurk | The Willow Hearth | no | [457, 610] |
| `toll-lamp` | rotbridge | The Toll-Lamp | no | [226, 620] |
| `stilt-hearth` | bogmire | The Stilt Hearth | no | [295, 480] |
| `fen-cairn` | lanternfen | The Fen Cairn | yes | [259, 526] |
| `bell-hearth` | misthollow | The Belltower Fire | yes | [340, 689] |
| `wreck-fire` | blackwater-reach | The Wreck Fire | yes | [245, 727] |
| `flats-beacon` | tidal-flats | The Flats Beacon | no | [124, 754] |

### 2.6 Patrol zones

| Zone | Base level | PATROLS set | Backdrop |
|---|---|---|---|
| `murkway` | 15 | `murkway` (mire leeches, boglurchers) | `murkway` |
| `lanternfen` | 16 | `lanternfen` (lamp-moths, marsh-lights) | `lanternfen` |
| `boardwalk` | 17 | `boardwalk` (marsh-lights, mire leeches) | `long-boardwalk` |
| `misthollow` | 17 | `misthollow` (marsh-lights, lamp-moths) | `misthollow` |
| `blackwater` | 18 | `blackwater` (blackwater gars, mire leeches) | `blackwater-reach` |
| `tidal-flats` | 18 | `tidal-flats` (blackwater gars, mire leeches) | `tidal-flats` |
| `causeway` | 16 | `causeway` (marsh-lights, mire leeches) | `causeway` |

Levels are Waking-0 levels; P4 owns the numbers. A player arrives at Waking 6 (every earlier Brand is held) and meets
the Deep half at Waking 7. Gloomfen spawns that are not rabble climb `GLOOM_WAKE` (4) levels a Waking and keep at most
three Waking Omens (`GLOOM`, as `IRON` does); rabble climb the usual 2 (`GLOOM_R`).

### 2.7 Locks

| Lock | Relic keys (map power ← relic) | Domain key | Soft |
|---|---|---|---|
| `bog` | `bogstride` ← the Bogstriders, `mourners-path` ← the Mourning Veil | Survival 7 (the brief: "Pip in the party, or the Survival Pathfinder skill") | yes: without a key every step in the bog costs 3% of each hero's max HP (as the drift) |
| `fog` | `mothers-light` ← the Lamplighter's Lantern, `hag-sight` ← the Hag-Stone, `still-song` ← the Cantor's Staff | Attunement 7 | yes: on a `fog: true` map, without a key you see `TUNING.world.fogRadius` (3) tiles (as darkness: §4.4) |
| `blackwater` | `hodges-ferry` ← Hodge's Unfair Toll, `harpoon-line` ← Corvus's Harpoon, `deep-breath` ← the Salvager's Helm | Survival 8 (the brief: "Survival swimming") | no |
| `witch-ward` | `ward-song` ← the Willow-Ward, `hag-sight` ← the Hag-Stone, `hexbane` ← Nettie's Hexbane Shawl | Knowledge 7 | no |

New keys for older locks: `darkness` ← `mothers-light` (the Lamplighter's Lantern) and `pearl-light` (the Deep-Pearl);
`mirage` ← `hag-sight` (the Hag-Stone); `stream` ← `gar-current` (the Gar's Tooth); `boulder` ← `haul` (the Barge-Chain
Gauntlets); `bramble` ← `willow-weep` (the Weeping Bow). Texts in the M5 manner: bog "Black mud that takes a boot and
keeps it." / "You find the tussocks that hold."; fog "Fog so thick the lamps are only rumours." / "The fog opens a
little way ahead of you, and closes behind."; blackwater "Deep black water, and something moving under it." / "A
boat is waiting at the dock. You do not ask how."; witch-ward "A ring of stones hung with charms. The air in it
hums." / "The charms go quiet, and let you by."

## 3. Content

### 3.1 NPCs

| id | Name | Where | Role |
|---|---|---|---|
| `moss` | Elder Moss | willowmurk | the elder who sent for you; speaks in riddles, every one true; the wards (quest); reads the dead tongue (quest) |
| `sedge` | Sedge | willowmurk | herb-seller (shop) |
| `wm-villager` | Villager | willowmurk | flavour |
| `hodge` | Hodge | rotbridge | the toll-keeper of Rotbridge, not actually a troll; the toll game (A11) |
| `gretch` | Mayor Gretch | bogmire | keeps order through fear and favours; the main quest; a soot-sealed box; a future Council member |
| `nettie` | Nettie the Swamp Witch | bogmire | healer and herbalist (shop: gems); not someone you cross; her remedy (quest); a companion hint |
| `pell` | Widow Pell | bogmire | her boy went into the fen after a light; the children's homecoming |
| `bm-watch` | Stilt-Watch | bogmire | flavour |
| `corvus` | Corvus | misthollow | a treasure diver who has gone down more times than anyone; lost his harpoon on his last dive (quest); the sealed chest (quest) |

The player's own lore names these people and places (`aethermoor-interactive-image-map-polished.html`); keep their
voices: Hodge "an extremely unpleasant old man", Gretch "fear and favours", Nettie "not someone you cross", Moss
"riddles, but every riddle holds a truth", Corvus "lost something valuable on his last trip".

### 3.2 Foe families (10 new)

| id | Tier | Kind | Aspect | Notes |
|---|---|---|---|---|
| `mire-leech` | rabble | beast | blight | latches on: Bleeding, and it drinks (heals itself) |
| `marsh-light` | rabble | spirit | radiant | the lights over the water: Lure (a hero `charmed`, WIS save), Flicker (Guarding) |
| `lamp-moth` | rabble | beast | radiant | the Lantern Mother's moths: dust in the eyes (Frightened, DEX save); she calls them |
| `blackwater-gar` | rabble | beast | tide | leaps from the channel; variant `old-jaws` (Old Jaws, relic-bearer) |
| `bog-hag` | veteran | humanoid | blight | Hex (`hexed`), Rot (`rotting`), Stir the Pot (heals a friend); variant `grue` (Mother Grue, relic-bearer) |
| `willow-wight` | veteran | plant | verdant | a willow walking: Lash (Rooted), Weep (Regenerating); variant `grandfather` (Grandfather Willow, relic-bearer) |
| `drowned` | veteran | undead | tide | Misthollow's drowned: Drag Down (Rooted and Chilled), Toll (Frightened); variants `bell-ringer`, `choir`, `cantor` (the Drowned Cantor, relic-bearer) |
| `hodge` | relic-bearer | humanoid | — | unique; the terrible fight (§3.5); never flees; drops his toll only by grip |
| `lantern-mother` | champion | undead | radiant | the Lantern Mother, 3 phases (§3.5) |
| `blackwater-leviathan` | champion | beast | tide | the Blackwater Leviathan, 3 phases (§3.5) |

The Tallymen reuse `tallyman`/`smuggler` with new variants: `tallyman` `salvage-master` (the Salvage-Master) and
`bargemaster` (the Bargemaster); `smuggler` `reedcutter`, `diver` and `bargehand`. The Murkway's pack reuses M3's
`boglurcher`. Tamsin reuses `tamsin` (§3.5, §4.3).

**Art keys** (fixed here, so P4's data and P6's drawings meet without waiting on each other): each new family draws
as its own id (`art: '<family id>'`); the variants draw as `old-jaws`, `mother-grue`, `grandfather-willow`,
`bell-ringer`, `drowned-choir`, `drowned-cantor`, `salvage-master`, `bargemaster`, `reedcutter`, `salvage-diver` and
`bargehand`. Humanoid families (`bog-hag`, `hodge`, the Tallyman variants) show gear tiers 0–3 on the sprite.

### 3.3 Encounters (25 new; region `gloomfen`)

| id | Map | Mode | Spawns (lead first) | Holds |
|---|---|---|---|---|
| `mk-leeches` | murkway | block (road) | mire-leech ×3 | — |
| `mk-reedcutters` | murkway | block (road) | smuggler `reedcutter` ×2, tallyman | — |
| `mk-bogfolk` | murkway | pack | boglurcher ×3 | — |
| `wm-wights` | willowmurk | block (road) | willow-wight ×2 | — |
| `wm-willow` | willowmurk | lair | willow-wight `grandfather` "Grandfather Willow", willow-wight | `weeping-bow` |
| `hodge` | rotbridge | block, `once`: fought only from his toll dialogue ("Refuse, and make him move.") | hodge "Hodge" | `unfair-toll` |
| `tamsin-rotbridge` | rotbridge | block (road), `duel`, `once`, `yields: 'tamsin-yielded-4'`, `talk: 'tamsin-rotbridge'` | tamsin (§3.5) | her rival relic, lent; wears `bogstriders` |
| `rb-gars` | rotbridge | pack | blackwater-gar ×3 | — |
| `lf-moths` | lanternfen | block (road) | lamp-moth ×4 | — |
| `lf-hags` | lanternfen | block (road) | bog-hag ×2, mire-leech | — |
| `lf-lights` | lanternfen | pack | marsh-light ×3 | — |
| `grue-hollow` | lanternfen | lair | bog-hag `grue` "Mother Grue", bog-hag | `hag-stone` |
| `lantern-mother` | mothers-hollow | lair, `brand: 'brand-of-lanterns'` | lantern-mother | `lamplighters-lantern` (held), `mourning-veil` (worn piece) |
| `lb-drowned` | long-boardwalk | block (road) | drowned ×3 | — |
| `lb-lights` | long-boardwalk | pack | marsh-light ×2, lamp-moth ×2 | — |
| `mh-salvage` | misthollow | block (road) | tallyman `salvage-master` "the Salvage-Master", smuggler `diver` ×2 | `salvagers-helm` |
| `mh-ringers` | misthollow | block (road) | drowned `bell-ringer` ×3 | — |
| `db-choir` | drowned-belfry | block (road) | drowned `choir` ×3 | — |
| `cantor` | drowned-belfry | lair | drowned `cantor` "the Drowned Cantor", drowned `choir` ×2 | `cantors-staff` |
| `br-barge` | blackwater-reach | block (road) | smuggler `bargehand` ×3 | — |
| `br-gars` | blackwater-reach | pack | blackwater-gar ×3 | — |
| `old-jaws` | blackwater-reach | lair | blackwater-gar `old-jaws` "Old Jaws", blackwater-gar ×2 | `gar-tooth` |
| `tf-bargemaster` | tidal-flats | block (road) | tallyman `bargemaster` "the Bargemaster", smuggler `bargehand` ×2 | `barge-gauntlets` |
| `blackwater-leviathan` | tidal-flats | lair, `brand: 'brand-of-the-deep'` | blackwater-leviathan | `corvus-harpoon` (held: lodged in its side), `deep-pearl` (worn piece) |
| `cw-lights` | causeway | pack | marsh-light ×2, mire-leech | — |

Encounter `backdrop` = the map's backdrop (§6.2); the Mother's Hollow and the Drowned Belfry set `dark: true`.

### 3.4 Relics: Codex Page IV (Nos. 53–66)

| No. | id | Name | Slot/kind | Aspect | Holder / source | Map power |
|---|---|---|---|---|---|---|
| 53 | `unfair-toll` | Hodge's Unfair Toll | amulet | tide | Hodge: his toll game (A11), or pried loose in the terrible fight | `hodges-ferry` (blackwater); in battle, Toll Is Due (§4.4) |
| 54 | `bogstriders` | The Bogstriders | feet (boots) | verdant | Tamsin (worn; drops when you win) | `bogstride` (bog) |
| 55 | `weeping-bow` | The Weeping Bow | bow | verdant | Grandfather Willow (`wm-willow`) | `willow-weep` (bramble) |
| 56 | `willow-ward` | The Willow-Ward | offhand (shield) | verdant | quest *The Failing Wards* | `ward-song` (witch-ward) |
| 57 | `hag-stone` | The Hag-Stone | ring | blight | Mother Grue (`grue-hollow`) | `hag-sight` (fog, witch-ward, mirage) |
| 58 | `lamplighters-lantern` | The Lamplighter's Lantern | offhand (focus) | radiant | the Lantern Mother (held) | `mothers-light` (fog, darkness) |
| 59 | `mourning-veil` | The Mourning Veil | head (hood) | tide | the Lantern Mother (worn piece) | `mourners-path` (bog) |
| 60 | `salvagers-helm` | The Salvager's Helm | head (helm) | tide | the Salvage-Master (`mh-salvage`) | `deep-breath` (blackwater) |
| 61 | `cantors-staff` | The Cantor's Staff | staff | tide | the Drowned Cantor (`cantor`) | `still-song` (fog) |
| 62 | `gar-tooth` | The Gar's Tooth | dagger | tide | Old Jaws (`old-jaws`) | `gar-current` (stream) |
| 63 | `barge-gauntlets` | The Barge-Chain Gauntlets | hands (gauntlets) | stone | the Bargemaster (`tf-bargemaster`) | `haul` (boulder) |
| 64 | `corvus-harpoon` | Corvus's Harpoon | spear | tide | lodged in the Blackwater Leviathan (held) | `harpoon-line` (blackwater) |
| 65 | `deep-pearl` | The Deep-Pearl | amulet | tide | the Blackwater Leviathan (worn piece) | `pearl-light` (darkness) |
| 66 | `hexbane-shawl` | Nettie's Hexbane Shawl | body (robe) | blight | quest *Nettie's Remedy* | `hexbane` (witch-ward) |

**Page IV's reward**, *The Gloomfen Covenant*: +10% healing and 10% blight resist for every hero.
Every new relic has `sockets`, `deeds` (three) and `awaken` (two branches), as M4's and M5's do; the Champions'
four pieces have hand-named branches and two sockets. Hodge's Unfair Toll: "+2 CHA", its Legend Surge is P4's
("Heads I Win": a clipped coin always comes up Hodge), and its lore line is the brief's: "Hodge charges what he
likes. Now so do you." Corvus knows his harpoon on sight (§3.6).

### 3.5 Champions, Hodge and the rival

**The Lantern Mother** (`lantern-mother`, champion, undead, radiant): the last lamplighter of Misthollow, who led
its children out along the boardwalk with her lantern the night the city sank, and went back for the last of them.
The Tallymen's dredging woke her, and she is leading children out again, to the drowned city, where she thinks they
are safe. The Lamplighter's Lantern (held) and the Mourning Veil (a breakable piece). Weak to tide.
- Phase 1 (100%), *Lamplight*: Lure (needs `lamplighters-lantern`: one hero `charmed`, WIS save), Lantern Flare
  (2d8 radiant to every hero, DEX save for half), Hush Now (every hero: WIS save or `hexed`).
- Phase 2 (66%), *The Children's Road*: Lead Them Down (charging: one hero is led under the water, `swallowed` for
  up to 2 turns, label "Led away"), Moths (calls a `lamp-moth`, up to 2), Mourning (needs `mourning-veil`: every
  hero Frightened and `rotting`).
- Phase 3 (33%), *Lights Out*: Snuff (the lamps go out: every hero is Exposed), Lantern Nova (needs
  `lamplighters-lantern`: 3d8 radiant to every hero, Burning), Drown the Light (charging: 3d10 tide to one hero).
Snapping a piece off shuts its moves down. Brand of Lanterns. After it, the children wake in the lamplight and
follow the Warden home (`children-home`; Bogmire's lines change; Widow Pell's boy is among them).

**The Blackwater Leviathan** (`blackwater-leviathan`, champion, beast, tide): the thing that lives in the Blackwater,
as long as the channel is wide. The Tallymen hooked it with a stolen harpoon and chained it by an iron collar
(Harrow's broken ring on the lock) to tow their salvage barges up from the sea; chained and maddened, it sinks every
other boat, and its thrashing holds the water up over the causeway. Corvus's Harpoon (lodged in its side: held, with
a grip meter) and the Deep-Pearl in its brow (a breakable piece). Weak to storm.
- Phase 1 (100%), *The Wake*: Coil (2d10 crush, Rooted), Tail Slap (2d6 tide to every hero, DEX save for half),
  Sound (it dives: `burrowed`, then `then: 'breach'`: it comes up under one hero, 3d10 tide and Staggered).
- Phase 2 (66%), *The Deep*: Swallow (charging: one hero `swallowed` for up to 2 turns, label "Swallowed whole"),
  Undertow (every hero: STR save or Rooted and Chilled), Harpoon Rage (needs `corvus-harpoon`: the harpoon in its
  side drives it mad: two Coils in one turn).
- Phase 3 (33%), *Blackwater*: Pearl-Light (needs `deep-pearl`: it heals 2d8 and is Warded), Flood (3d8 tide to
  every hero, DEX save for half), Swallow.
Brand of the Deep. After it, the collar breaks, the Leviathan sinks back into the deep it came from, and the
Blackwater falls: the causeway comes up out of the water (A5). Then **the Sleeper's scene**: in the quiet, the song
under Misthollow stops for the first time in a thousand years; Elder Moss (if met) or the narrator names what the
drowned choir sang to sleep: **Lull**; Alondra counts three Sleepers now; the Unsmith's last Act II letter follows.

**Hodge** (`hodge`, relic-bearer, humanoid, unique): an extremely unpleasant old man with a cudgel, a lantern and a
toll-book, and much harder than he looks. Level party + 6, three Omens, Frenzied among them; his moves: Toll Is Due
(on his first turn: your strongest hero makes a CHA save or loses its next turn, §4.4), Bridge Troll (charging: one
hero is shoved off the bridge, `swallowed` for up to 2 turns, label "In the river"), Old Man's Cane (2d10 crush,
Staggered), Clipped Coin (needs `unfair-toll`: heads, he hits twice; it is always heads). Losing to him is an
ordinary loss (a Grudge: "Hodge the Paid-in-Full" and the like). A win lifts the bar (`beaten: hodge`); his toll is
yours only if it was pried loose first. He never dies: at 0 HP he sits down on his stool and says so.

**Tamsin at Rotbridge** (`tamsin-rotbridge`, the fourth of the seven duels): `S('tamsin', 'party', { partyDelta: 4,
gearTier: 4, variant: '$rival:rotbridge', relic: '$rival', lend: true, noWaking: true, name: 'Tamsin', wears:
'bogstriders' })`. A month in the fen following the letters. Losing is a yield (`tamsin-yielded-4`); winning, the
Bogstriders drop. **Her fall** (A12) plays after either: the black barge; a tall man in a boatman's cloak with a
smith's apron under it and a hammer in a broken ring on the clasp; the trade; "Tell Isolde I was the better Warden.
Tell her I had to prove it somewhere." Hodge, after: "She paid her toll. Heavier than yours." (`tamsin-fallen`).

### 3.6 Quests, bounties, the Ladder, letters

| id | Kind | Giver | Start | Steps | Reward |
|---|---|---|---|---|---|
| `gloomfen-waking` | main | isolde | `{ flag: 'ironspire-complete' }` | Sit the third council (`council-3-done`); go down the fen stair below Mossfall and find Elder Moss in Willowmurk (`met-moss`); get past Hodge's bar at Rotbridge (`toll-paid` or `beaten: hodge`); face Tamsin on Rotbridge; reach Bogmire and speak with Mayor Gretch (`met-gretch`); take the Brand of Lanterns; follow the long boardwalk to Misthollow and find Corvus (`met-corvus`); take the Brand of the Deep; come home (`council-4-done`) | — (the fourth council claims it) |
| `failing-wards` | side | moss | `met-moss` | Quiet Grandfather Willow (`beaten: wm-willow`); tell Elder Moss (`wards-mended`) | `willow-ward` |
| `nettie-remedy` | side | nettie | `met-nettie` | Take Mother Grue's Hag-Stone (`beaten: grue-hollow`); bring Nettie word (`grue-told`) | `hexbane-shawl`, 1 bog amber |
| `corvus-harpoon` | side | corvus | `met-corvus` | Get Corvus's harpoon out of the Leviathan (`{ owns: 'corvus-harpoon' }`); show him (`harpoon-shown`) | 300 gold, 2 silver |
| `dead-tongue` | side | corvus | `met-corvus` | Take the salvage crew's sealed chest (`beaten: mh-salvage`); have Elder Moss read its warnings (`chest-read`); tell Corvus (`chest-told`) | 250 gold, 1 bog amber, the chest's secret (a page of the Worldforge plans, in a First-Age hand) |

As in M4 and M5, a talk step also counts once the Brand it leads to is earned.
**Bounties** (the Bogmire board, turned in to Mayor Gretch): `b-bogfolk` → `mk-bogfolk` (100 gold), `b-lights` →
`lf-lights` (110), `b-gars` → `br-gars` (130), `b-jaws` → `old-jaws` (170).
**Ladder:** eight Gloomfen posters: Hodge, Grandfather Willow, Mother Grue, the Lantern Mother (M5's rumour becomes
her poster), the Salvage-Master, the Drowned Cantor, Old Jaws, the Blackwater Leviathan. Harrow stays a rumour ("the
missing smith"); a new rumour, "the man on the barge", appears once Tamsin has fallen.
**Letters:** two Unsmith letters, after the Brand of Lanterns ("Seven.") and after the Brand of the Deep ("Eight.").
**Scenes:** `ARRIVALS` for willowmurk, rotbridge, bogmire and misthollow; `AFTER` lines for both Champions, Hodge and
the duel (the duel's lead into the fall); the children's homecoming at Bogmire; the Sleeper's scene (§3.5); a
Gloomfen `RESTS` scene or two; the **fourth council**: a trigger in `keep-hall` guarded by `{ all: [{ flag:
'gloomfen-complete' }, { not: { flag: 'council-4-done' } }] }` (never `once`); Mayor Gretch takes the Gloomfen's
chair, and the four soot-sealed boxes (Qasim's, Brundar's, Gretch's and Miravel's) sit on the table unopened; it
ends on the end-of-Act-II card (`end: 'gloomfen'`).

### 3.7 Shops and gems

- **Nettie the Swamp Witch** (`nettie`, Bogmire): the consumables and three gems: moss agate, glass pearl and the new
  **bog amber** (`bog-amber`: blight resist and +1 regeneration in armour, +1d4 blight in a weapon).
- **Sedge** (`sedge`, Willowmurk): the consumables.
- Won Gloomfen fights pay forge spoils like the Ironspire's (`TUNING.forge.spoils`); bog amber drops only in the
  Gloomfen (`TUNING.forge.ambers`) and chests.

## 4. Systems (rules, pure; P1)

### 4.1 Save version 5

`toV5(save)` runs `toV4`, then sets `version: 5`. M6 adds no new top-level state: its quests, flags, relics and maps
live in the shapes version 4 already has, so `toV5` fills nothing else (and stays idempotent). `saveProblems`
accepts version 5 only. `importCode` accepts `AETH1.` to `AETH5.` and names a newer code as newer.

### 4.2 New statuses (`data/statuses.js`, `rules/battle.js`, `rules/combat.js`)

- `rotting` (bog-hags, the Lantern Mother's Mourning): blight rot. At each of the unit's turn starts it takes 1d6
  blight per stack (up to 3 stacks), and while it rots every heal it receives is halved. It lasts 3 turns; a
  `cleanse` of harmful statuses clears it.
- `hexed` (bog-hags, the Lantern Mother's Hush Now): the unit rolls its d20s (attacks and saves) at disadvantage
  for 2 of its turns. Advantage and a hex cancel out, as in D&D. The hero's plate shows "Hexed".

### 4.3 Tamsin's Rotbridge kit

`RIVAL_KITS[rival].rotbridge` (`data/rivals.js`), the same for each starter: a month in the fen following the letters.
Its moves are hers (P4 names and tunes them: something fen-footed from the Bogstriders, something desperate); her
starter's Art keeps faces 8–11, as in her earlier duels. `$rival:rotbridge` resolves as `$rival:ironhold` does.

### 4.4 World engine and conditions

- **Fog** (`rules/world.js light`): a map with `fog: true` limits the party's sight to `TUNING.world.fogRadius` (3)
  unless the `fog` lock is open for the party (a key power owned, or Attunement 7), exactly as `dark: true` does with
  the darkness lock. A map is never both. Roamers notice you within their dark range on a fog map, as on a dark one.
- **The bog** burns like the drift (3% a step) and is keyed like any lock.
- **Hodge's daily price** needs two small additions: a condition `{ day: { every: n, at: k } }` (holds when
  `flags.day % n === k`) and a dialogue effect `{ pay: { gold?, bag?: { id: n }, materials?: {...} } }` with its
  condition `{ afford: { gold?, bag?, materials? } }` (a choice you cannot afford is shown disabled). Prices rotate
  over three days (P3 sets them: e.g. 120 gold; one silver; two Hearth Tonics).
- **Contests** may name an `ability` as well as a `domain` for a check (Hodge's Deception is CHA).
- **Toll Is Due**: when the bearer of Hodge's Unfair Toll is in the active party, at the start of every fight the
  strongest foe (highest level, then max HP) makes a CHA save against DC 13 or its first turn comes a full turn later
  (as a First Strike, doubled, for that foe alone). Hodge's own move of the same name does it to your strongest hero.
- **`gloomfen-complete`**: `earnBrand` sets it once both Gloomfen Brands are held (as `ironspire-complete`).

## 5. UI

- **Title:** `M6 · Gloomfen` (step 0), over the player's world painting (A10). **Music:** a `fen` track (the
  `core/audio.js` synth): a slow, low reed drone with a lullaby turn in it, and frogs.
- **The Gloomfen card:** the first time the fen stair is taken, a card shows the player's regional painting under
  the region's name ("Act II · The Gloomfen Marsh").
- **Codex:** Page IV unsealed (its tab, progress and reward).
- **Atlas:** a `gloomfen` view framing the four places; the region's padlock comes off with the third council.
- **Journal:** the new quests and bounties.
- **Battle:** Rotting and Hexed on the plates; the Leviathan's dive (burrowed) and swallow; "Led away" and "In the
  river" holds; the foggy backdrops draw a mist layer.
- **World:** a mist overlay on fog maps (thinner once the fog lock is open), in place of the dark vignette.
- **Chapter cards:** the third council's card names the fen stair as open; `end: 'gloomfen'` closes Act II ("All
  eight coals are lit. The Hollow Council waits.") and opens nothing.

## 6. Art

### 6.1 Overworld (P5)
- Tile atlases for `willow-village`, `channel`, `stilt-town`, `bog`, `drowned-grove`, `boardwalk`, `sunken-city`,
  `belfry`, `mudflat`, `causeway` (the Murkway uses M3's `fen`). Lock looks for `bog`, `fog`, `blackwater` (a
  dock), `witch-ward` (a ring of hung stones). Hodge's toll-bar and the Lantern-Mother's lamps as gate and prop looks.
- Walkers for §3.1's NPCs; map sprites for the rabble and veterans; lairs for Grandfather Willow, Mother Grue, the
  Drowned Cantor, Old Jaws, Hodge, the Lantern Mother and the Leviathan.

### 6.2 Battle (P6)
- Foe art for the new families with their variants and gear tiers; the Lantern Mother with her lantern and veil
  (each gone when snapped off); the Leviathan with the harpoon in its side and the pearl in its brow, and its dive;
  Hodge with cudgel, lantern and toll-book.
- Backdrops: `murkway`, `willowmurk`, `rotbridge`, `bogmire`, `lanternfen`, `mothers-hollow`, `long-boardwalk`,
  `misthollow`, `drowned-belfry`, `blackwater-reach`, `tidal-flats`, `causeway`.
- Card and sprite art for the 14 relics; the bog amber's icon.

### 6.3 The player's paintings (P8, the lead)
- **Batch 2** (26 paintings, 23 maps): imported with `tools/paint-import.mjs --batch` as they land, each checked on
  its grid overlay. The budget is the player's choice: at M5's density and quality batch 2 needs about 9.3 MB more
  paint than the 2.1 MB left under the 8 MB limit. Measured on the eight paintings in the game: WebP quality 0.7 is
  18% smaller and looks the same at the game's zoom; 0.6 is 25% smaller and a little softer; half density is 71%
  smaller and visibly blocky (ruled out by the player's "full detail"). The player's choice sets the paint limit in
  `tools/build.mjs` and the import settings; this spec is updated with it.
- The title backdrop and the Gloomfen card's still (A10), as `CUTS`.

## 7. Work packages

| Pkg | Owner | Files (owns) |
|---|---|---|
| P1 rules | lead | `rules/*` (statuses in `battle.js`/`combat.js`, `migrate.js` toV5, fog in `world.js light`, `cond.js` day/afford, `story.js` pay and contest abilities, Toll Is Due), `data/statuses.js`, `data/rivals.js`, `data/codex.js`, `data/tuning.js`, `data/gems.js`, `data/encounters.js` (BRANDS only), `core/save.js`, their tests |
| P2 maps | agent | `data/maps/{12 new}.js`, `data/maps/keep-gallery-3.js`, `data/maps/index.js`, `data/maps/{keep,mossfall,keep-gallery-2}.js` (§2.4 only), `data/tiles.js`, `data/locks.js`, `data/world.js`, `test/maps.test.mjs` (Gloomfen), `test/walk.test.mjs` (GLOOM_PATH), `test/road.test.mjs` (its map list), `tools/map-draft.mjs` |
| P3 story | agent | `data/npcs.js`, `data/dialogue.js`, `data/quests.js`, `data/ladder.js`, `data/letters.js`, `data/shops.js`, `data/maps/keep-hall.js` (the council-4 trigger only), `test/story*.test.mjs` |
| P4 foes and relics | agent | `data/foes.js`, `data/encounters.js` (not BRANDS), `data/relics.js`, `data/rivals.js` (the Rotbridge kit's moves and table, with P1), `data/items.js` (if needed), `tools/sim.mjs`, `docs/RULES.md`, `test/data.test.mjs`, `test/loot.test.mjs`, `test/battle.test.mjs` (new cases) |
| P5 overworld art | agent | `art/tiles.js`, `art/walkers.js`, `art/map-sprites.js`, `tools/gallery*.{mjs,js}` |
| P6 battle and item art | agent | `art/foes.js`, `art/scenes.js`, `art/recipes.js`, `art/item-looks.js`, `art/item-art.js`, `art/icons.js`, `art/index.js` |
| P7 UI | agent | `ui/screens/{codex,atlas,journal,battle,title}.js`, `ui/battle/*`, `ui/world/{sheets,story-fx,view}.js` (the fog overlay and the cards), `ui/lib/atlas-geo.js`, `core/audio.js` (the fen track), `ui/*.css`, `tools/e2e-world.mjs` (Gloomfen scenarios), `tools/e2e-battle.mjs` (Champions, Hodge) |
| P8 painted art | lead | `tools/paint-import.mjs`, `tools/build.mjs` (the paint limit), `ui/assets/{paint,cuts}/*`, `test/paint.test.mjs` |

Order: spec and scaffold (every id stubbed, every test green), then step 0 (the lead); P1 with P2–P5 in parallel; P6–P7
when the foe and relic data land; then integrate, tune, two independent reviews, and deliver. Batch 2 lands whenever
it comes, after the player's budget answer.

**Stand-ins in the scaffold** (so every test is green before the art exists): a stub foe family borrows its source
family's numbers, moves and `art`; stub encounters, maps and zones use Ironspire backdrops; stub relics have stand-in
`RELIC_ART` entries marked `stub: true`; the fen maps play `wilds`. As the packages land, P4 gives each family `art:
'<its id>'`, P2 and P4 set `backdrop: '<the map id>'` and P2 sets `music: 'fen'`, while P6 draws the foes, backdrops
and relics and P7 writes the track. `test/art-keys.test.mjs` fails for a new key until both halves have landed; that
is expected in a package's private tree, and nothing else may fail.

## 8. Verification

- **Unit:** the statuses (`rotting` halves healing and stacks to 3; `hexed` gives disadvantage and cancels with
  advantage); the Rotbridge kit; `toV5` on every fixture and every earlier milestone's save shape; fog sight;
  `{ day }`, `{ afford }` and `{ pay }`; a contest with an ability check; Toll Is Due (the strongest foe, the save,
  the delay; Hodge's own version on your strongest hero); the maps (reachable from `mf-fen-stair` once the third
  council is sat; every entity reachable or behind a lock with two keys; `road.test` for every new map); the walk
  bot down `GLOOM_PATH` from an Ironspire-complete save, paying Hodge; story data (conditions parse, every flag read
  is set, the council-4 trigger is flag-guarded); relics (holders, powers, deeds, awakenings).
- **e2e-world** new scenarios: Mossfall's fen stair (sealed until the third council, then open onto the Murkway, the
  Gloomfen card, the fen track); a bog step burning without a key; Willowmurk (the fire, Elder Moss); Hodge's bar
  (pay the price; the game; the bar lifts); Tamsin's duel card and her fall scene; the Lanternfen's fog (the sight,
  then a key); the Lantern Mother's pre-fight card; the long boardwalk sealed, then open after the Brand; the
  Belfry's dark; the causeway open after the Brand of the Deep and walked home through the Keep's south-west gate;
  the fourth council's end-of-Act-II card.
- **e2e-battle:** the Lantern Mother through three phases with both pieces snapped (a hero led away and freed); the
  Leviathan's dive and swallow; Hodge's Toll Is Due and his bridge-shove; a hexed hero and a rotting one.
- **e2e-flow:** the M5 profile carries over; Page IV shows.
- **e2e-codes:** every earlier code still carries over (AETH1 to AETH4), and M5 codes load.
- **Balance** (`tools/sim.mjs`, from the `ironspire` run's end state, Waking 6): the Lantern Mother first-try wipe
  30–40%; the Blackwater Leviathan 30–40%; Tamsin at Rotbridge party win 55–70%; each lead's lair taken first
  15–25%; Hodge fought on arrival: first-try wipe 60–80% ("a terrible idea", never 100%: a forged party at the end of
  the region beats him); a forged party ≤ 20% against each Champion; every M3, M4, M4.5 and M5 target unchanged; zero
  stuck.
- **Performance:** the Lanternfen (fog) and the long boardwalk at 4× throttle: p95 frame JS ≤ 16 ms, ≤ 40
  `drawImage` per frame; a painted batch-2 map the same.
- **Size:** the game under 3.2 MB and the paintings under the player's limit (A6, §6.3).
- **No stand-in is left:** no `stub: true` in `data/foes.js` or `art/item-looks.js`, no "STUB from the M6 scaffold"
  comment in `src/`, every M6 backdrop in `BACKDROPS`, and every fen map on the `fen` track.

## 9. Risks and cut order

| Risk | Plan |
|---|---|
| New statuses change earlier balance | Only Gloomfen foes use them; re-run every mode; tune the moves, not the statuses |
| The paintings' size (batch 2) | The player's budget choice (§6.3); nothing is imported before it |
| Hodge's fight too easy or a wall | Tuned by the sim to 60–80% on arrival; the toll and the game always open the bar |
| Agents run out of usage mid-package | Small packages, notes files, stubs that keep the tests green |

**Cut order** (last first): the stretch goals; the Gloomfen card's still; Old Jaws's lead; the Drowned Cantor's lead
(keep the Belfry and its choir as a dead end with a chest); `hexed` (use Frightened); the causeway (keep `keep-sw`
sealed; travel home instead).
