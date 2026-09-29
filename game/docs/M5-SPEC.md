# M5 spec: the Ironspire Peaks, and Hush

The roadmap's M5 row: "Ironspire and Hush" (`docs/DESIGN-BRIEF.md` §9, §13). After the second council,
the Keep's east postern opens onto the mountains: Harrow Ironvein's cold forge under Ironhold, the
Tallymen's road over the ice, and under Frostmere, the Sleeper called Hush. M5 is built **road-first**
from the start, on the Milestone 4.5 contract (`docs/M45-SPEC.md`): every fight on the road holds it,
and every fight is fought in full. Part A overrides Part B.

## Part A. Decisions (these win)

| # | Decision |
|---|---|
| A1 | **Its own file and save** (the player's rule). M5 writes only `aethermoor.save.m5` (+ `.bak`, `aethermoor.m5.started`) and reads, newest first, the Milestone 4.5 save (`aethermoor.save.m4.5`), then M4's, M3's and M2's, never writing them. The download is `dist/aethermoor-m5.html`; step 0 freezes `dist/aethermoor-m4.5.html` (its sha256 pinned beside the others). |
| A2 | **Save version 4.** `rules/migrate.js` chains `toV2`, `toV3` and a new `toV4`, which fills what M5 adds (§4.1) and only that. Codes are `AETH4.`; AETH1 to AETH3 still load. The version bump keeps the older files, whose code check stops at AETH3, from loading an M5 save they cannot read. |
| A3 | **Road-first.** Every M5 map declares its `roads`; every fight on `IRON_PATH` holds a gate (or a Brand); lead fights guard their side roads; no route or lead fight is a roaming pack. `test/road.test.mjs` covers the new maps with no new code (its map list grows). Zone patrols roam as before, and a caught weak pack is a full battle. |
| A4 | **One order.** The Brand of Iron (Ironhold) comes first; Stormwatch's north gate, onto the Frost Road, opens with it. Then the Brand of Frost under Frostmere. |
| A5 | **The way in.** The Keep's east postern (`keep-e`) opens once the second council is sat (`council-2-done`), onto the East Road (A11), which climbs to the Rockslide Pass. Fawnrest's scree path (`fr-highfold`) opens from Peak's Veil's side once you reach it (`flag: 'highfold-open'`, set by the monks), as a second way home. Gloomfen stays sealed ("the way opens in the next chapter"). |
| A6 | **Size.** A third region needs room: the build warns above **2.5 MB** and fails above **3.2 MB** (M4's 1.8/2.2 were set for two regions). `--minify` stays in reserve. These limits count the game without the player's paintings (A10), which have their own limit of **8 MB**, so the file stays well under the 16 MB a page holds. |
| A7 | **Building** as in M4: the lead builds the rules (P1) and integrates; agents build maps, story, foes and relics, art and UI in parallel with disjoint files (§7), never run git, build into private folders and write `game/notes/M5-<pkg>.md`. |
| A8 | **Ids are fixed by this spec.** A package may add ids only inside its own files; a missing id is asked for in its notes. |
| A9 | **Frozen, as before:** `art/heroes.js`, `art/hero-looks.js`, the card reveal, the M2 encounter and spawn arrays, and every delivered file (M2, M3, M4, M4.5). Earlier content changes only where §2.4 says. |
| A10 | **Painted art.** The player's art pilot (`art-requests/pilot.md`) came back and looks right in the game, so package P8 (§7) is in: the paintings of Hearthstone Keep and Thornhollow draw as those maps' ground, and the prologue shows the Council hall gold, then blue. Each is its own data entry (`ui/assets/paint/`, `ui/assets/cuts/`), so a map with no painting draws its tiles as before. Hilda's portrait did not come; there is no portrait frame yet. The next batch (`art-requests/batch-2/`, every Verdant and Sunscorch map, long roads in two overlapping panels) lands as it comes back. |
| A11 | **The East Road** (from the player's six wilderness paintings, `art-in/extra/path-*.png`). Six painted maps lie between the Keep's east postern and the Rockslide Pass, in this order: `old-bridge`, `drystone-lea`, `plankford`, `shrinewood`, `silverfall`, `last-camp`. Each is 48×32 tiles, biome `wilds`, music `road`, level 12, backdrop `hearth-road`, region `ironspire`. Its tiles are traced from its painting (`overTiles: false`), and it draws from the painting at `PAINT_DENSITY` 2 (32 painting px a tile). `keep-e` leads to `old-bridge` (the Keep's anchor is `from-east-road`); the pass's west end (`rp-camp`) leads to `last-camp`. Three road-gate fights hold the road (A3): `er-wolves` (Drystone Lea's brambles), `er-toll` (the deserters' chain at the Plankford bridge) and `er-camp` (their sergeant at the Last Camp's palisade). The Last Camp's fire is an eighth Ironspire Hearthfire, `camp-fire`. `IRON_PATH` begins `er-wolves`, `er-toll`, `camp-fire`, `er-camp`. A thing the painting shows (Shrinewood's carved stone, Silverfall's pool) is a `sign` with `look: 'painted'` and a `name`: it draws no sprite, and A reads "A · <name>". The Last Camp's fire draws only its flame (hearth look `painted`) in the painted ring. |

## Part B. Build spec

## 1. Scope

**In:**
- **The Ironspire Peaks:** 11 maps (§2.1), the six painted maps of the East Road (A11) and a third reliquary room; 8 Hearthfires (3 cold); 4 new lock types and new keys for four older locks; 9 foe families (2 of them Champions); 22 encounters (with the East Road's three); Tamsin's third duel; 14 relics (Codex Nos. 39–52) and Codex Page III's reward; 5 quests, 4 bounties, 8 Ladder posters, 2 Unsmith letters, 2 shops and a new gem; Hush's scene; the third council.
- **Exact Champion moves:** three new statuses (`burrowed`, `swallowed`, `charmed`, §4.2). M4's approximations become exact (Kharzul's Burrow, the Sand Wyrm's Swallow, the mirage-wisps' Charm), and the new Champions use them.
- **Tamsin's own kits:** `$rival:<duel>` resolves a per-duel kit (§4.3), so each duel is her own fight.
- **Hilda and Harrow:** bring Hilda Harrow's hammer (a quest and her scene).

**Out (later milestones):** Gloomfen (M6); companion recruitment (Luma stays a hint); the Signature Masterpiece; Table Mode; card PNG export; the Hearthteller.

**Stretch (only if every gate is green):** a blizzard pass over the Frost Road (drifting snow over the view); Hilda's lines naming the gem you set.

## 2. World

### 2.1 Maps

| id | Name | Biome | Size | Zone | Music | Role |
|---|---|---|---|---|---|---|
| `old-bridge` … `last-camp` | The East Road (A11) | wilds | 48×32 each | — | road | six painted maps: Keep east postern → the Rockslide Pass |
| `rockslide-pass` | The Rockslide Pass | mountain | 26×60 | `rockslide-pass` | peaks | the Last Camp → Peak's Veil; the slide the monks dug out |
| `peaks-veil` | Peak's Veil | monastery | 28×24 | — | town | the monastery; the bell tower; hub 1 |
| `highfold` | The Highfold | scree | 30×40 | `highfold` | peaks | Peak's Veil ↔ Fawnrest (a side road); the Thunder-Roc's eyrie |
| `iron-stair` | The Iron Stair | mountain | 24×56 | `iron-stair` | peaks | Peak's Veil → Ironhold; switchbacks cut by dwarves |
| `ironhold` | Ironhold | dwarf-hall | 32×28 | — | town | Thane Brundar's hall; the rune-sealed door to the Deeps; hub 2 |
| `ironhold-deeps` | The Ironhold Deeps | forge (dark) | 28×28 | `deeps` | dungeon | Harrow's abandoned works |
| `harrows-forge` | Harrow's Forge | forge | 20×18 | — | dungeon | Mother Anvil (Champion) |
| `stormwatch` | Stormwatch | outpost | 26×24 | — | town | the army post; Rook; hub 3; the north gate (Brand of Iron) |
| `frost-road` | The Frost Road | tundra | 48×26 | `frost-road` | peaks | Stormwatch → Frostmere, over the ice |
| `frostmere` | Frostmere | frozen lake | 36×30 | `frostmere` | peaks | the lake, the drowned shrine, the hole in the ice |
| `frostmere-below` | Beneath Frostmere | ice cave (dark) | 22×22 | — | dungeon | the Rime-Abbot (Champion); Hush asleep |

Every map uses the M3 map format, is registered in `MAPS`, has `region: 'ironspire'`, sets `lore`
(the Atlas's "you are here") and declares `roads` (A3). A third reliquary room joins the Keep:
**`keep-gallery-2`, the Ironspire Gallery** (18×8), through a door on the east wall of the Sunscorch
Gallery; Codex Page III's 14 pedestals stand on its rows 2 and 5 in codex order.

### 2.2 Connections

```
keep (keep-e, gated on council-2-done) ── the East Road (old-bridge ── drystone-lea ── plankford ── shrinewood ── silverfall ── last-camp)
                                          ── rockslide-pass ── peaks-veil ─┬─ iron-stair ── ironhold ─┬─ ironhold-deeps ── harrows-forge
                                                                         │                         └─ stormwatch (east; its north gate on the Brand of Iron) ── frost-road ── frostmere ── frostmere-below
                                                                         └─ highfold ── fawnrest (fr-highfold, opens from above: highfold-open)
```

**The critical path** (`IRON_PATH` in `data/world.js`; the sim and the walk test follow it):
`er-wolves`, `er-toll`, `camp-fire`, `er-camp`, `pass-shrine`, `rp-brigands`, `rp-rocklings`, `veil-hearth`, `is-sentinels`, `stair-cairn`, `thanes-hearth`,
`tamsin-ironhold`, `id-forgeborn`, `deeps-forge`, `id-bellows`, `mother-anvil`, `stormwatch-fire`,
`fr-cutters`, `frost-cairn`, `fm-wraiths`, `fb-choir`, `rime-abbot`.
**Leads** (`IRON_LEADS`): `roc: ['hf-trolls', 'roc-eyrie']`, `horn: ['troll-cave']`, `smith: ['id-smith']`,
`shrine: ['fm-shrine']`.

No hard lock stands on the critical path without a key the path itself provides: the Deeps' `rune-seal`
opens with the Thane's Rune-Key, which Thane Brundar gives once Tamsin's duel is done or yielded (a main
quest step); the Deeps and Beneath Frostmere are dark but soft.

**Roads** (A3; the gates the map package places, in order):

| Map | Road | Gates (guard) |
|---|---|---|
| `drystone-lea` | `from-bridge` → the exit to Plankford | `er-wolves` (brambles across the gap in the pines) |
| `plankford` | `from-lea` → the exit to Shrinewood | `er-toll` (the deserters' chain at the foot of the plank bridge) |
| `last-camp` | `from-falls` → the exit to the pass | `er-camp` (the palisade gate, barred) |
| `rockslide-pass` | `from-camp` → the exit to Peak's Veil | `rp-brigands` (Rhune's toll chain across the cleared slide), `rp-rocklings` (a scree field where the rocklings nest) |
| `iron-stair` | from Peak's Veil → the exit to Ironhold | `is-sentinels` (the dwarf gate at the stair's head) |
| `ironhold` | from the Iron Stair → the Deeps door | `tamsin-ironhold` (she waits on the Deeps stair; a yield opens it too) |
| `ironhold-deeps` | from Ironhold → the stair to Harrow's Forge | `id-forgeborn`, `id-bellows` |
| `frost-road` | from Stormwatch → the exit to Frostmere | `fr-cutters` (the Tallymen's ice-saw camp across the road) |
| `frostmere` | from the Frost Road → the hole in the ice | `fm-wraiths` (the drowned at the ice-hole) |
| `frostmere-below` | from the hole → `rime-abbot` | `fb-choir` |
| `highfold` | from Peak's Veil → `roc-eyrie` | `hf-trolls` |

Also: Peak's Veil's east road toward Stormwatch runs through Ironhold (Ironhold's east exit); Stormwatch's
north exit (`sw-n`) gets `gate: { brand: 'brand-of-iron' }` with a `sealed` text and `hint`.

### 2.3 Layout of each map (what must be there; P2 draws the tiles)

- **The East Road (A11):** traced from the paintings, so the paintings are the layout. The Old Bridge (a stone
  bridge off the Keep's lake, a willow, a signpost); Drystone Lea (meadow, an old oak on a side path, a fallen
  drystone wall; the wolves in the brambles); Plankford (a plank bridge over a stream, a fork to a gravel
  beach; the deserters' toll); Shrinewood (a broken arch and a carved standing stone in a clearing); Silverfall
  (a waterfall and its clear pool); the Last Camp (a fire ring and a log bench before a palisade gate).
- **rockslide-pass:** a mountain road climbing east from the Last Camp (a causeway over a tarn at its foot), past the great slide
  the monks dug out (boulders heaped both sides). `pass-shrine` (a way-shrine with a coal) a third of the
  way up. `rp-brigands`: Rhune the Pass-Warden's toll (Stormwatch deserters) with a chain; `rp-rocklings`
  a scree field higher up; `rp-wolves` (pack) in a side hollow. A `chasm` with a chest across it. A sign:
  "Peak's Veil. The bell will tell you when you are close."
- **peaks-veil:** a walled monastery on a shelf of rock: the bell tower (the bell rope is an entity: the
  quest), the refectory, cells, the herb garden. `veil-hearth` in the cloister. NPCs: Mother Wynn (the
  abbess, `wynn`), Brother Kesh (a monk who fights, flavour and hints, `kesh`), a novice (`novice`). The
  Highfold gate: the west exit `pv-w`, `gate: { flag: 'highfold-open' }` with a `sealed` text and hint
  (Wynn sets the flag when you meet her). The road north to the Iron Stair. A lookout.
- **highfold:** a scree path down to Fawnrest. `hf-trolls` (block, the path's guard), `roc-eyrie` (lair on
  a crag, behind a `chasm`), a `drift` field with a chest. Exits: Peak's Veil (east) and Fawnrest (south,
  onto `fr-highfold`).
- **iron-stair:** dwarf-cut switchbacks up a cliff face, iron chains for rails. `is-sentinels` (block at
  the stair-head gate), `stair-cairn` (cold), `is-trolls` (pack), `troll-cave` (lair behind an `ice` wall:
  Old Horn the Peak-Troll).
- **ironhold:** a fortress hall carved into the mountain: the Thane's throne (`brundar`), the great hearth
  (`thanes-hearth`), the armorer (NPC `durra`, shop `durra`), the Ironhold board (`ih-board`, bounties),
  the rune-sealed door down to the Deeps (lock `rune-seal`), Tamsin on the Deeps stair (`tamsin-ironhold`).
  Exits: the Iron Stair (south), the Deeps (down), Stormwatch (east).
- **ironhold-deeps:** abandoned forge halls, cold furnaces, rails and slag. Dark (soft). `deeps-forge`
  (cold Hearthfire: a furnace you relight), `id-forgeborn`, `id-bellows` (blocks, road guards),
  `id-smith` (block, the lead: Harrow's journeyman in a side works behind a `rune-seal`), a `drift`-free
  slag field with a chest. Stairs down to `harrows-forge`.
- **harrows-forge:** Harrow's own forge: a ring of anvils around a pit of cold fire. `mother-anvil`
  (champion lair, 3×2). Harrow's broken-ring mark on the wall (a sign). The Brand scene plays here.
- **stormwatch:** a timber-and-stone army post on a ridge; the watch tower, barracks, the quartermaster
  (NPC `quill`, shop `quill`), Rook in the stockade (`rook`), Captain Ysolde (`ysolde`), the Stormwatch
  board (`sw-board`). Exits: Ironhold (west), the Frost Road (north, the Brand of Iron gate).
- **frost-road:** a windswept tundra road with cairns. `fr-cutters` (block: the Tallyman ice-saw camp
  across the road), `frost-cairn` (cold), `fr-wolves` (pack), a `drift` field and an `ice` wall with
  chests.
- **frostmere:** a vast frozen lake; the drowned shrine on an island (`fm-shrine`, the lead: the Drowned
  Abbess, reached over thin ice through a `chasm` of broken floes), the hole in the ice the Tallymen cut
  (the way down), `fm-wraiths` guarding it. Monks' prayer-flags (props).
- **frostmere-below:** caves of blue ice, air pockets, frozen monks. Dark (soft). `fb-choir` (block),
  `rime-abbot` (lair, 3×2). Hush is a shape under the ice floor, lit from within (a prop the scene uses).

### 2.4 The earlier maps and data this spec changes

- `keep.js`: `keep-e` becomes `{ id: 'keep-e', area, to: 'old-bridge', anchor: 'from-keep', gate: { flag: 'council-2-done' }, sealed: { region: 'ironspire', text, hint } }` (A11: first to `rockslide-pass`; the East Road came between).
- `fawnrest.js`: `fr-highfold` becomes `{ ..., to: 'highfold', anchor: 'from-fawnrest', gate: { flag: 'highfold-open' }, sealed: { region: 'ironspire', text, hint } }`.
- `keep-gallery.js`: a door on its east wall to `keep-gallery-2`.
- `world.js`: `REGIONS.ironspire` gets `brands: ['brand-of-iron', 'brand-of-frost']`, `open: true`; `HEARTHS`, `ZONES`, `LORE.ironhold|peaksveil|stormwatch|frostmere` get their `map`; `IRON_PATH`, `IRON_LEADS`.
- `locks.js`: the new locks (§2.7) and new keys for four older ones (§2.7).
- `codex.js`: Page III gets `from: 39, to: 52` and its reward (§3.4).
- `encounters.js`: `BRANDS` gains `brand-of-iron` { from: 'mother-anvil', region: 'ironspire' } and `brand-of-frost` { from: 'rime-abbot', region: 'ironspire' }. After both, `earnBrand` sets `ironspire-complete`.
- M4's approximated moves become exact with §4.2's statuses: Kharzul's Burrow, the Sand Wyrm's Swallow, the mirage-wisps' and the Wisp-Queen's Charm. The M4 balance targets must still hold (§8).

### 2.5 Hearthfires (8 new; 25 in all)

| id | Map | Name | Cold | Lore (1200×800) |
|---|---|---|---|---|
| `camp-fire` | last-camp | The Last Camp Fire | no | [616, 338] |
| `pass-shrine` | rockslide-pass | The Pass Shrine | no | [650, 330] |
| `veil-hearth` | peaks-veil | The Cloister Fire | no | [750, 240] |
| `stair-cairn` | iron-stair | The Stair Cairn | yes | [800, 200] |
| `thanes-hearth` | ironhold | The Thane's Hearth | no | [870, 160] |
| `deeps-forge` | ironhold-deeps | The Deeps Furnace | yes | [875, 175] |
| `stormwatch-fire` | stormwatch | The Watch Fire | no | [1020, 240] |
| `frost-cairn` | frost-road | The Frost Cairn | yes | [1000, 180] |

### 2.6 Patrol zones

| Zone | Base level | PATROLS set | Backdrop |
|---|---|---|---|
| `rockslide-pass` | 13 | `rockslide-pass` (rime wolves, pass brigands) | `rockslide-pass` |
| `highfold` | 14 | `highfold` (rime wolves, rocklings) | `highfold` |
| `iron-stair` | 14 | `iron-stair` (rocklings, pass brigands) | `iron-stair` |
| `deeps` | 15 | `deeps` (rocklings, forge-sparks) | `ironhold-deeps` |
| `frost-road` | 16 | `frost-road` (rime wolves, pass brigands) | `frost-road` |
| `frostmere` | 16 | `frostmere` (rime wolves, rocklings) | `frostmere` |

Levels are Waking-0 levels; P4 owns the numbers. Ironspire spawns that are not rabble climb `IRON_WAKE`
(4) levels a Waking, as the Sunscorch's do.

### 2.7 Locks

| Lock | Relic keys (map power ← relic) | Domain key | Soft |
|---|---|---|---|
| `chasm` | `windstep` ← Windstep Boots, `roc-glide` ← the Roc-Feather Cloak | Physical 7 | no |
| `ice` | `forge-heat` ← the Anvil Heart, `crack-the-ice` ← the Veilbell, `melt-glass` ← Cinderfang | Attunement 7 | no |
| `rune-seal` | `thanes-rune` ← the Thane's Rune-Key, `rune-reading` ← the Runestaff | Knowledge 7 | no |
| `drift` | `snowshoe` ← the Trollhide Mantle, `hushwalk` ← the Hushweave Cowl | Survival 7 | yes: without a key every step in the drift costs 3% of each hero's max HP (as ichor does) |

New keys for older locks: `boulder` ← `anvil-strike` (the Worldforge Hammer); `darkness` ← `rime-light`
(the Rime Crozier); `cold-hearth` ← `forge-heat` (the Anvil Heart); `stream` ← `ice-bridge` (the Cutter's
Pick). Texts in the M4 manner: chasm "A gap in the rock, and the wind coming up it." / "You are across
before you think about it."; ice "A wall of old blue ice." / "The ice gives."; rune-seal "Dwarf runes,
cut deep and filled with iron." / "The runes read you, and let you pass."; drift "Snow to the thigh, and
colder underneath." / "You find the crust that holds."

## 3. Content

### 3.1 NPCs

| id | Name | Where | Role |
|---|---|---|---|
| `wynn` | Mother Wynn | peaks-veil | the abbess; the bell (quest); opens the Highfold |
| `kesh` | Brother Kesh | peaks-veil | a fighting monk; hints; Frostmere's history |
| `novice` | Novice | peaks-veil | flavour |
| `brundar` | Thane Brundar | ironhold | the Thane; sealed the Deeps; gives the Rune-Key; a future Council member |
| `durra` | Durra Ironhand | ironhold | armorer (shop); Harrow's old rival |
| `ih-guard` | Hold Guard | ironhold | flavour |
| `rook` | Rook | stormwatch | a former Tallyman; the Tallymen's plan; the ledger (quest) |
| `ysolde` | Captain Ysolde | stormwatch | Stormwatch's captain; the north gate |
| `quill` | Quartermaster Quill | stormwatch | consumables (shop) |

### 3.2 Foe families (9 new)

| id | Tier | Kind | Aspect | Notes |
|---|---|---|---|---|
| `rime-wolf` | rabble | beast | frost | fast; its bite Chills |
| `brigand` | rabble | humanoid | — | Stormwatch deserters; variant `warden` (Rhune the Pass-Warden, relic-bearer) |
| `rockling` | rabble | construct | stone | rolls into you (Staggered); crush-weak |
| `iron-sentinel` | veteran | construct | stone | dwarven automaton; high Guard; crush-weak; variant `captain` |
| `forgeborn` | veteran | construct | ember | Harrow's molten servants; sets Burning; variants `bellows` (summons sparks), `journeyman` (Harrow's journeyman, relic-bearer) |
| `peak-troll` | veteran | beast | stone | regenerates; variant `old-horn` (Old Horn, relic-bearer) |
| `rime-wraith` | veteran | undead | frost | the drowned monks; Chills; variants `abbess` (the Drowned Abbess, relic-bearer), `choir` |
| `thunder-roc` | relic-bearer | beast | storm | carries a hero off (`swallowed`); lair only |
| `mother-anvil` | champion | construct | ember | Mother Anvil, 3 phases (§3.5) |
| `rime-abbot` | champion | undead | frost | the Rime-Abbot, 3 phases (§3.5) |

(`thunder-roc` and the two Champions make ten ids; `brigand` and `rockling` are the zone rabble.) The
Tallymen reuse `tallyman`/`smuggler` with new variants `ice-cutter` (the Cutter-Chief) and `sawyer`.
Tamsin reuses `tamsin` (§3.5, §4.3).

### 3.3 Encounters (22 new; region `ironspire`)

| id | Map | Mode | Spawns (lead first) | Holds |
|---|---|---|---|---|
| `er-wolves` | drystone-lea | block (road) | rime-wolf ×3 | — |
| `er-toll` | plankford | block (road) | brigand ×3 | — |
| `er-camp` | last-camp | block (road) | brigand `sergeant` "The Deserter Sergeant", brigand ×2 | — |
| `rp-brigands` | rockslide-pass | block (road) | brigand `warden` "Rhune the Pass-Warden", brigand ×2 | `windstep-boots` |
| `rp-rocklings` | rockslide-pass | block (road) | rockling ×4 | — |
| `rp-wolves` | rockslide-pass | pack | rime-wolf ×3 | — |
| `hf-trolls` | highfold | block (road) | peak-troll ×2 | — |
| `roc-eyrie` | highfold | lair | thunder-roc "the Thunder-Roc" | `roc-feather-cloak` |
| `is-sentinels` | iron-stair | block (road) | iron-sentinel `captain`, iron-sentinel ×2 | `ironwall` |
| `is-trolls` | iron-stair | pack | peak-troll, rockling ×2 | — |
| `troll-cave` | iron-stair | lair | peak-troll `old-horn` "Old Horn", peak-troll | `trollhide-mantle` |
| `tamsin-ironhold` | ironhold | block (road), `duel`, `once`, `yields: 'tamsin-yielded-3'`, `talk: 'tamsin-ironhold'` | tamsin (§3.5) | her rival relic, lent; wears `ironvein-bracers` |
| `id-forgeborn` | ironhold-deeps | block (road) | forgeborn ×3 | — |
| `id-bellows` | ironhold-deeps | block (road) | forgeborn `bellows`, forgeborn ×2 | — |
| `id-smith` | ironhold-deeps | block | forgeborn `journeyman` "Harrow's Journeyman", forgeborn | `runestaff` |
| `mother-anvil` | harrows-forge | lair, `brand: 'brand-of-iron'` | mother-anvil | `worldforge-hammer` (held), `anvil-heart` (worn piece) |
| `fr-cutters` | frost-road | block (road) | tallyman `ice-cutter` "the Cutter-Chief", smuggler `sawyer` ×2 | `cutters-pick` |
| `fr-wolves` | frost-road | pack | rime-wolf ×4 | — |
| `fm-wraiths` | frostmere | block (road) | rime-wraith ×3 | — |
| `fm-shrine` | frostmere | lair | rime-wraith `abbess` "the Drowned Abbess", rime-wraith `choir` ×2 | `drowned-censer` |
| `fb-choir` | frostmere-below | block (road) | rime-wraith `choir` ×3 | — |
| `rime-abbot` | frostmere-below | lair, `brand: 'brand-of-frost'` | rime-abbot | `rime-crozier` (held), `hushweave-cowl` (worn piece) |

Encounter `backdrop` = the map's backdrop (§6.2); the Deeps and Beneath Frostmere set `dark: true`.

### 3.4 Relics: Codex Page III (Nos. 39–52)

| No. | id | Name | Slot/kind | Aspect | Holder / source | Map power |
|---|---|---|---|---|---|---|
| 39 | `windstep-boots` | Windstep Boots | feet | storm | Rhune the Pass-Warden (`rp-brigands`) | `windstep` (chasm) |
| 40 | `veilbell` | The Veilbell | amulet | frost | quest *The Bell of Peak's Veil* | `crack-the-ice` (ice) |
| 41 | `ironwall` | Ironwall | offhand (shield) | stone | the Sentinel-Captain (`is-sentinels`) | `iron-stance`: Guarding at the start of every fight's first round (stated use) |
| 42 | `drowned-censer` | The Drowned Censer | offhand (charm) | frost | the Drowned Abbess (`fm-shrine`) | `hymn-of-rest`: roaming undead never notice you (stated use) |
| 43 | `ironvein-bracers` | Ironvein Bracers | hands | ember | Tamsin (worn; drops when you win) | `iron-grip`: `boulder` |
| 44 | `roc-feather-cloak` | The Roc-Feather Cloak | body (light) | storm | the Thunder-Roc (`roc-eyrie`) | `roc-glide` (chasm) |
| 45 | `thanes-rune` | The Thane's Rune-Key | ring | stone | quest step: Thane Brundar (main quest) | `thanes-rune` (rune-seal) |
| 46 | `trollhide-mantle` | The Trollhide Mantle | body (heavy) | stone | Old Horn (`troll-cave`) | `snowshoe` (drift) |
| 47 | `runestaff` | Harrow's Runestaff | staff | ember | Harrow's Journeyman (`id-smith`) | `rune-reading` (rune-seal) |
| 48 | `anvil-heart` | The Anvil Heart | amulet | ember | Mother Anvil (worn piece) | `forge-heat` (ice, cold hearths) |
| 49 | `worldforge-hammer` | The Worldforge Hammer | maul | ember | Mother Anvil (held) | `anvil-strike` (boulder) |
| 50 | `cutters-pick` | The Cutter's Pick | axe | frost | the Cutter-Chief (`fr-cutters`) | `ice-bridge` (stream) |
| 51 | `rime-crozier` | The Rime Crozier | staff | frost | the Rime-Abbot (held) | `rime-light` (darkness) |
| 52 | `hushweave-cowl` | The Hushweave Cowl | head | frost | the Rime-Abbot (worn piece) | `hushwalk` (drift) |

**Page III's reward**, *The Ironspire Accord*: +1 Guard and 10% frost resist for every hero.
Every new relic has `sockets`, `deeds` (three) and `awaken` (two branches), as M4's do. The Worldforge
Hammer is Harrow's: Hilda knows it on sight (§3.6).

### 3.5 Champions and the rival

**Mother Anvil** (`mother-anvil`, champion, construct, ember): Harrow's first forge-golem, an anvil the
size of a cart on four iron legs; the Worldforge Hammer in one arm, the Anvil Heart glowing through its
ribs (a breakable piece). Crush-resistant plate, weak to frost.
- Phase 1 (100%), *The Anvil Wakes*: Hammerfall (2d10 crush), Sparks (1d6 ember to every hero, Burning),
  Temper (needs `anvil-heart`: Guarding and Warded).
- Phase 2 (66%), *Quench*: Steam Burst (2d6 ember to every hero, DEX save for half), Anvil Strike (needs
  `worldforge-hammer`: 3d8 crush and Staggered), Bellows (calls a `forgeborn`, up to 2).
- Phase 3 (33%), *The Last Strike*: Heart Flare (needs `anvil-heart`: 3d6 ember to every hero, Burning),
  Worldforge Blow (charging; needs `worldforge-hammer`: 4d10 crush to one hero).
Snapping a piece off shuts its moves down. Brand of Iron.

**The Rime-Abbot** (`rime-abbot`, champion, undead, frost): Brother Aurel of Peak's Veil, who went down to
listen to Hush and did not come up. The Hushweave Cowl (breakable) and the Rime Crozier (held). Weak to
ember.
- Phase 1, *Vespers*: Crozier Strike (2d8 frost, Chilled), Toll (every hero: WIS save or Frightened),
  Rime Ward (needs `rime-crozier`: Warded).
- Phase 2, *Compline*: Drown (charging: a hero is held under the ice, `swallowed` for up to 2 turns),
  Call the Choir (a `rime-wraith` `choir`, up to 2), Hushing (needs `hushweave-cowl`: one hero `charmed`).
- Phase 3, *Hush*: Heartbeat (Hush stirs: the Abbot heals 2d8 and every hero is Chilled), Rime Nova (3d8
  frost to every hero, DEX save for half, Chilled), Crozier Strike.
Brand of Frost. After it, **Hush's scene**: the party stands over the Sleeper under the ice; its
heartbeat slows; Brother Kesh (if met) or the narrator names it; the Unsmith's second letter follows.

**Tamsin at Ironhold** (`tamsin-ironhold`, the third of the seven duels): `S('tamsin', 'party', { partyDelta: 4,
gearTier: 4, variant: '$rival:ironhold', relic: '$rival', lend: true, noWaking: true, name: 'Tamsin',
wears: 'ironvein-bracers' })`. She is hunting Harrow too. Losing is a yield (`tamsin-yielded-3`); winning,
the bracers drop and she says "He was here. He left the fire burning so we'd think he'd be back."

### 3.6 Quests, bounties, the Ladder, letters

| id | Kind | Giver | Start | Steps | Reward |
|---|---|---|---|---|---|
| `ironspire-waking` | main | isolde | `{ flag: 'sunscorch-complete' }` (a rule flag, so the quest shows the moment the Sunscorch is won) | Sit the second council (`council-2-done`); reach Peak's Veil (`met-wynn`); climb to Ironhold and speak with the Thane (`met-brundar`); win the Thane's leave (Tamsin's duel done or yielded: `rune-given`); take the Brand of Iron; reach Stormwatch and hear Rook (`met-rook`); take the Brand of Frost; come home (`council-3-done`) | the Rune-Key, given by Brundar's scene at `rune-given` |
| `bell-of-veil` | side | wynn | `met-wynn` | Quiet the Drowned Abbess (`beaten: fm-shrine`); ring the bell (`bell-rung-veil`) | `veilbell` |
| `harrows-hammer` | side | hilda | `{ owns: 'worldforge-hammer' }` | Show Hilda the Worldforge Hammer (`hammer-shown`) | 300 gold, 2 embers, her scene |
| `rooks-ledger` | side | rook | `met-rook` | Take the Cutter-Chief's ledger (`beaten: fr-cutters`); bring it to Rook (`ledger-given`) | 250 gold, 1 frost opal |
| `sentinel-oath` | side | brundar | `met-brundar` | Quiet Harrow's journeyman in the Deeps (`beaten: id-smith`); tell the Thane (`smith-told`) | 200 gold, 2 silver |

**Bounties** (the Stormwatch board, turned in to Captain Ysolde): `b-wolves` → `rp-wolves` (90 gold), `b-trolls` →
`is-trolls` (120), `b-frostwolves` → `fr-wolves` (120), `b-roc` → `roc-eyrie` (160).
**Ladder:** eight Ironspire posters: Rhune, the Thunder-Roc, Old Horn, the Sentinel-Captain, Harrow's
Journeyman, Mother Anvil, the Drowned Abbess, the Rime-Abbot (Gloomfen keeps its silhouettes).
**Letters:** two Unsmith letters, after the Brand of Iron and after the Brand of Frost.
**Scenes:** `ARRIVALS` for peaks-veil, ironhold, stormwatch and frostmere; `AFTER` lines for both
Champions and the duel; Hilda's scene when she sees the hammer ("That's my brother's hammer. He never
put it down in his life. Where is he?"); Hush's scene (§3.5); the **third council**: a trigger in
`keep-hall` guarded by `{ all: [{ flag: 'ironspire-complete' }, { not: { flag: 'council-3-done' } }] }`
(never `once`); Thane Brundar takes Ironspire's chair; it ends on a to-be-continued card naming Gloomfen.

### 3.7 Shops and gems

- **Durra Ironhand** (`durra`, Ironhold): the consumables and three gems: moss agate, glass pearl and the
  new **frost opal** (`frost-opal`: frost resist and Guard in armour, +1d4 frost in a weapon).
- **Quartermaster Quill** (`quill`, Stormwatch): the consumables.
- Won Ironspire fights pay forge spoils like the Sunscorch's (`TUNING.forge.spoils`); frost opals drop only
  in the Frostmere maps (`TUNING.forge.opals`) and chests.

## 4. Systems (rules, pure; P1)

### 4.1 Save version 4

`toV4(save)` runs `toV3`, then sets `version: 4`. M5 adds no new top-level state: its quests, flags,
relics and maps live in the shapes version 3 already has, so `toV4` fills nothing else (and stays
idempotent). `saveProblems` accepts version 4 only. `importCode` accepts `AETH1.` to `AETH4.` and names
a newer code as newer (Milestone 4.5 already does: it answers an `AETH4.` code with "That code comes from
a newer Aethermoor").

### 4.2 New statuses (`data/statuses.js`, `rules/battle.js`)

- `burrowed` (Kharzul, a Sand Wyrm's dive): the unit cannot be targeted until its next turn starts; then
  its charged move lands. Area moves pass over it.
- `swallowed` (the Sand Wyrm, the Thunder-Roc, the Rime-Abbot's Drown): a hero is taken out of the line
  for up to `turns` (2) of its own turns: it cannot act or be targeted, takes the swallower's `tick`
  (1d6 of the swallower's aspect) at each turn start, and comes back when the turns run out, when the
  swallower is downed, or when the swallower takes a hit of 15% of its max HP or more. A party with
  every standing hero swallowed is not wiped: the last one is spat out at once.
- `charmed` (mirage-wisps, the Wisp-Queen, the Rime-Abbot's Hushing): the hero's next turn is a plain
  weapon attack on a random ally (never itself), then it clears. A charmed hero hit by an ally wakes.

### 4.3 Tamsin's kits

`$rival:<duel>` in a spawn's `variant` resolves to `STARTERS[starter].rival` plus the duel's kit from
`data/rivals.js` (`RIVAL_KITS[rivalStarter][duel]`: her moves, gear tier and look for that duel). `$rival`
alone keeps M3's and M4's meaning. The Eldest Tree and Scorchgate duels keep their current kits; Ironhold
gets a new one (she fights like someone who has been to the Ironspire before).

### 4.4 World engine

- Gated exits with a `hint` (M4.5) for `keep-e`, `fr-highfold` and `sw-n`.
- The `drift` soft lock burns like ichor (3% a step) and is keyed like any lock.
- `harrows-hammer` needs a quest start condition on owning a relic (`{ owns: id }`, already in `cond.js`).

## 5. UI

- **Title:** `M5 · Ironspire` (step 0). **Music:** a `peaks` track (the `core/audio.js` synth): a slow
  horn call over a low drone and wind.
- **Codex:** Page III unsealed (its tab, progress and reward).
- **Atlas:** the Ironspire fires and places; the region's padlock comes off with the second council.
- **Journal:** the new quests and bounties.
- **Battle:** the swallowed hero's plate shows "Held under" (or "Carried off") with the turns left, the
  charmed hero's shows "Charmed"; a burrowed foe's sprite sinks, and its target ring is off.

## 6. Art

### 6.1 Overworld (P5)
- Tile atlases for `mountain`, `monastery`, `scree`, `dwarf-hall`, `forge`, `outpost`, `tundra`,
  `frozen-lake`, `ice-cave`. Lock looks for `chasm`, `ice`, `rune-seal`, `drift`.
- Walkers for §3.1's NPCs; map sprites for the rabble and veterans; lairs for the Thunder-Roc, Old Horn,
  Harrow's Journeyman, the Drowned Abbess, Mother Anvil and the Rime-Abbot.

### 6.2 Battle (P6)
- Foe art for the new families with their variants and gear tiers; Mother Anvil with the hammer and the
  glowing heart (each gone when snapped off); the Rime-Abbot with the crozier and the cowl.
- Backdrops (the East Road fights on the Hearth Road's, A11): `rockslide-pass`, `peaks-veil`, `highfold`, `iron-stair`, `ironhold`, `ironhold-deeps`,
  `harrows-forge`, `stormwatch`, `frost-road`, `frostmere`, `frostmere-below`.
- Card and sprite art for the 14 relics; the frost opal's icon.

## 7. Work packages

| Pkg | Owner | Files (owns) |
|---|---|---|
| P1 rules | lead | `rules/*` (statuses in `battle.js`, `migrate.js` toV4, `foe.js`), `data/statuses.js`, `data/rivals.js` (new), `data/codex.js`, `data/tuning.js`, `data/gems.js`, `data/encounters.js` (BRANDS only), `core/save.js`, their tests |
| P2 maps | agent | `data/maps/{11 new}.js`, `data/maps/keep-gallery-2.js`, `data/maps/index.js`, `data/maps/{keep,fawnrest,keep-gallery}.js` (§2.4 only), `data/tiles.js`, `data/locks.js`, `data/world.js`, `test/maps.test.mjs` (Ironspire), `test/walk.test.mjs` (IRON_PATH), `test/road.test.mjs` (its map list), `tools/map-draft.mjs` |
| P3 story | agent | `data/npcs.js`, `data/dialogue.js`, `data/quests.js`, `data/ladder.js`, `data/letters.js`, `data/shops.js`, `data/maps/keep-hall.js` (the council-3 trigger only), `test/story*.test.mjs` |
| P4 foes and relics | agent | `data/foes.js`, `data/encounters.js` (not BRANDS), `data/relics.js`, `data/omens.js`, `data/items.js` (if needed), `tools/sim.mjs`, `docs/RULES.md`, `test/data.test.mjs`, `test/loot.test.mjs`, `test/battle.test.mjs` (new cases) |
| P5 overworld art | agent | `art/tiles.js`, `art/walkers.js`, `art/map-sprites.js`, `tools/gallery*.{mjs,js}` |
| P6 battle and item art | agent | `art/foes.js`, `art/scenes.js`, `art/recipes.js`, `art/item-looks.js`, `art/item-art.js`, `art/icons.js`, `art/index.js` |
| P7 UI | agent | `ui/screens/{codex,atlas,journal,battle}.js`, `ui/battle/*`, `ui/world/sheets.js`, `core/audio.js` (the peaks track), `ui/*.css`, `tools/e2e-world.mjs` (Ironspire scenarios), `tools/e2e-battle.mjs` (Champions) |
| P8 painted art (A10) | lead | `tools/paint-import.mjs`, `tools/paint-refs.mjs` (new), `ui/world/view.js` (a painted ground layer), `ui/screens/newgame.js` (the prologue's stills), `ui/assets/{paint,cuts}/*`, `test/paint.test.mjs` |

Order: step 0 (the lead), then P1 with a scaffold that stubs every id so the tests stay green; P2–P5 in
parallel; P6–P7 when the foe and relic data land; then integrate, tune, review and deliver.

**Stand-ins in the scaffold** (so every test is green before the art exists): a stub foe family borrows its
source family's numbers, moves and `art`; stub encounters, maps and zones use Sunscorch backdrops; stub relics
have stand-in `RELIC_ART` entries marked `stub: true`; the mountain maps play `wilds`. As the packages land,
P4 gives each family `art: '<its id>'`, P2 and P4 set `backdrop: '<the map id>'` and P2 sets `music: 'peaks'`,
while P6 draws the foes, backdrops and relics and P7 writes the track. `test/art-keys.test.mjs` fails for a
new key until both halves have landed; that is expected in a package's private tree, and nothing else may fail.

## 8. Verification

- **Unit:** the statuses (each rule above, including the all-swallowed guard); `$rival:` kits; `toV4` on
  every fixture and every earlier milestone's save shape; the maps (reachable from `keep-e` once the second
  council is sat; every entity reachable or behind a lock with two keys; `road.test` for every new map);
  the walk bot down `IRON_PATH` from a Sunscorch-complete save; story data (conditions parse, every flag
  read is set, the council-3 trigger is flag-guarded); relics (holders, powers, deeds, awakenings).
- **e2e-world** new scenarios: the Keep's east postern (sealed until the second council, then open onto
  the East Road, drawn from its painting and playing the road; the pass beyond it plays the peaks); Peak's Veil (the fire, the bell); a chasm crossed with the Windstep Boots and an ice wall
  with the Anvil Heart; Mother Anvil's pre-fight card; the Deeps' darkness; the Frost Road's performance.
- **e2e-battle:** Mother Anvil through three phases with both pieces snapped; the Rime-Abbot with a hero
  held under and freed early; Kharzul's exact Burrow; a charmed hero.
- **e2e-flow:** the M4.5 profile carries over; Page III shows.
- **e2e-codes:** every earlier code still carries over.
- **Balance** (`tools/sim.mjs`, from the `sunscorch` run's end state, Waking 4): Mother Anvil first-try
  wipe 30–40%; the Rime-Abbot 30–40%; Tamsin at Ironhold party win 55–70%; each lead's lair taken first
  15–25%; a forged party ≤ 20% against each Champion; every M3, M4 and M4.5 target unchanged; zero stuck.
- **Performance:** the Frost Road at 4× throttle: p95 frame JS ≤ 16 ms, ≤ 40 `drawImage` per frame; a
  painted East Road map the same.
- **Size:** the game under 3.2 MB and the paintings under 8 MB (A6).
- **No stand-in is left:** no `stub: true` in `data/foes.js` or `art/item-looks.js`, no "STUB from the M5
  scaffold" comment in `src/`, every M5 backdrop in `BACKDROPS`, and every mountain map on the `peaks` track.

## 9. Risks and cut order

| Risk | Plan |
|---|---|
| The exact statuses change M4's balance | Re-run every Sunscorch mode; tune the moves' numbers, not the statuses |
| Three regions in one file | A6's new limit; share palettes and rigs; `--minify` |
| Agents run out of usage mid-package | Small packages, notes files, stubs that keep the tests green |

**Cut order** (last first): the batch 2 paintings; the blizzard; the Highfold lead (keep the map as the way home); the
Drowned Abbess's lead; `charmed` (keep the approximation).
