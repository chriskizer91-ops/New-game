# M3 "The Verdant Wilds" — build spec

This file is the contract for milestone 3. Part A, the integrator's amendments, overrides Part B wherever they differ.

## Part A. Integrator's amendments (these win)

- **A1. Delivery.**
  - The player keeps playing the published M2 page, and it is never republished.
  - M3 ships as a download: `dist/aethermoor-m3.html`.
  - `dist/aethermoor-m2.html` is a frozen copy of the M2 build. It is never overwritten.
  - `dist/aethermoor.html` and `dist/aethermoor.artifact.html` may be rebuilt, but they are not published.
- **A2. Geography (the player's illustrated map).**
  - Hearthstone Keep stands on an island in the central lake. A long stone causeway-bridge runs from the island toward the south-west shore.
  - The Keep's "north gate" opens onto that causeway. The southern ~8 rows of `hearth-road` are bridge tiles (`b`) over lake water (`~`), with reeds and shore at the far end. The road then climbs north-west into the forest.
  - Exit ids, anchors and coordinates in Part B stay as written. Only the tiles around them change.
  - The three sealed Keep exits (`keep-e`, `keep-se`, `keep-sw`) are piers and causeway ends on the island's edge. Their texts are unchanged.
- **A3. Process** (replaces the "hour 1 / hour 2" wording):
  1. **Prep** (Step 0 of §7)
  2. **Scaffold:** one agent creates every new file with its final export names and signatures, plus placeholder behaviour. Test, lint and build pass.
  3. **Build:** the work packages run in parallel.
  4. **Integrate:** gates 2–5.
  5. **Review and fix.**
- **A4. Work package split for Build** (replaces the WP3 and WP6 ownership in §6.1):
  - **WP3 World maps A.** Owns:
    - `data/maps/index.js`
    - `data/world.js`
    - `data/maps/{keep,keep-hall,hearth-road,thornhollow,thornway,briarmaw-den,mossfall}.js`
    - `test/maps.test.mjs`
    - `tools/map-draft.mjs`
  - **WP3B World maps B.** Owns `data/maps/{mosswatch-1,mosswatch-2,hindwood,fawnrest,eldergrove,heartroot-1,heartroot-2}.js`.
  - **WP3S Story data.** Owns:
    - `data/npcs.js`, `dialogue.js`, `quests.js`, `shops.js`, `ladder.js`, `letters.js`
    - `test/story-data.test.mjs`
  - **WP6A Foe art.** Owns `art/foes.js`.
  - **WP6B Item and scene art.** Owns `art/item-looks.js`, `item-art.js`, `recipes.js`, `scenes.js` and `icons.js`.
  - Until WP6B lands, `foes.js` must handle a missing `RELIC_ART` key without throwing.
- **A5. Shared working tree.**
  - Every agent works in the same checkout, `/home/user/New-game/game`.
  - Never run git.
  - Never edit a file you do not own. Put requests in `game/notes/<WP>.md`.
  - Expect other agents' files to be half-written. Run your own tests (`node --test test/<yours>.test.mjs`). Treat only failures in your own files as yours, and re-check later before assuming someone else is broken.
- **A6. Import direction in `rules/` (no cycles).**
  - The chain is `world.js → story.js → cond.js → gauntlet.js → {foe, battle, loot, party, progression, stats}`.
  - `gauntlet.js` never imports `world`, `story` or `cond`.
  - `migrate.js` imports data only (`encounters`, `heroes`, `world`, `maps/index`).
  - `data/` never imports `rules/`.
- **A7. Performance gate.**
  - The target stays at p95 16 ms and ≤ 40 `drawImage` calls per frame.
  - The hard fail in headless CI at 4× throttle is p95 > 33 ms or > 60 `drawImage` per frame.
  - Always print the measured numbers.
- **A8. Bundle size.** The build warns above 1.3 MB and fails above 1.6 MB.
- **A9. Atlas image.** A 960×640 WebP of at most 150 KB. The integrator measured q 0.6 at about 141 KB.
- **A10. Hygiene.**
  - Every user-visible string goes through `textContent` or `esc()`.
  - No `Math.random` or `Date` in `rules/` or `data/`.
  - No AI model names or identifiers anywhere in code, comments or docs.
  - Tamsin is "she".
- **A11. Keep what the player loves.**
  - Do not change the approved battle look.
  - `art/heroes.js`, `art/hero-looks.js`, the battle screen feel, and the card reveal are frozen except where Part B explicitly asks.

## Part B. Build spec (synthesized from the design panel)

# Aethermoor M3 "The Verdant Wilds": Final Build Spec

This spec starts from Design C, the phone-first player design and the top-scoring one. It swaps in Design A's pure tick-based world engine, A's save layering and A's fixture discipline. It adds the judges' grafts and fixes every fatal flaw they found. Every interface below was checked against the M2 code in `/home/user/New-game/game`. Ids, formats and signatures in this document are **frozen**. If a package needs a change, it writes a note (§6.0).

---

## 0. Decisions that settle the contradictions

| # | Topic | Decision |
|---|---|---|
| D1 | World engine | Design A's lockstep engine in `rules/world.js`. The world advances one tick per player step, plus one idle tick every 400 ms. Roamers use their own RNG stream (`roam:`+seed+`:`+map+`:`+visits) and never touch `rngState`. C's feel is layered on top: the "!" beat, a chase you can outrun, a flee you can catch, and packs that stay out of doors and 1-tile corridors. There is no script VM and no `progress.resume`. Quest state is derived from flags. |
| D2 | Act I shape | C's shape: the first hour is guided along the M2 route. When Briarmaw dies, the **crownwalls** fall and three leads open in any order. Crownwalls are **story seals**, drawn as Briarmaw's living crown-growth with a pulsing green heart-knot. Trying to cut one with the Thornsplitter or Physical 3 plays "The hatchet bounces. These grew from Briarmaw's crown." The Journal lists them as story seals, not locks. They and the sealed region roads are the only story gates. Every other obstacle has two keys. |
| D3 | Rabble scaling | `TUNING.waking.rabbleLevels = 2` (other tiers stay at +6). `escalateSpawn` reads `familyOf(spawn).tier`, so relic-bearer variants of rabble or veteran families escalate as relic-bearers. A spawn may override the rate with `wakeLevels`, and `noWaking` skips escalation. A pack that holds or wears any relic never flees and can never be Routed. |
| D4 | Instant win | A **Rout** gives full gold, 50% XP and the normal rabble drop roll, shown in a spoils strip. It never creates a Grudge. |
| D5 | Brands | `earnBrand` pushes only a Brand you don't hold yet. A rematch sets `report.rematch` and does not raise the Waking. There is no teleport. A Brand re-arms every non-`once` encounter in its own region, so Briarmaw returns as an Echo rematch. Wherever Brands are counted, count `new Set(brands).size`. The saved array is kept byte for byte, because M2 saves can hold `['brand-of-briars','brand-of-briars']`. |
| D6 | Walkers | A dedicated 16×24 rig in `art/walkers.js`, fed by `gearLooks(heroGear(game,id))`. `art/heroes.js` and `art/hero-looks.js` are **frozen**. All four heroes walk in a conga line. A "showoff" plays when a hero's gear changes. |
| D7 | Camera | C's integer scaling: `s = clamp(round(devicePxWidth/target), 2, 8)`, with `target` 192 on touch and 288 with a fine pointer. That gives about 11 tiles across and 32×48 CSS-px walkers on a 360 px phone. |
| D8 | Save | The live save goes to the new key `aethermoor.save.v2`. `aethermoor.save.v1` is **never written or deleted**. The marker `aethermoor.v1.migrated` stops the M2 save from resurrecting, and `aethermoor.save.v2.bak` holds a backup. The migration is injected (`loadGame(migrate)`, `importCode(code, migrate)`), so `core/` still imports nothing game-specific. Exports use `AETH2.` codes. A migrated save is not written until the player first moves. `progress.node` is kept verbatim and never read. The migration never touches `done`. |
| D9 | Tamsin | "She", matching `newgame.js:292`. The whole party fights Tamsin alone, so no one-hero layout is needed. She is relic-bearer tier at party level +1, with no Waking. She holds your counter-starter as a **lent** relic, which can be disarmed but never claimed, and wears the Vale Gauntlets (relic 24), which drop when you win. Losing is a **yield**: no gold loss, no Grudge, and the door opens anyway. |
| D10 | Temper | Hilda tempers from +1 to +3 in M3. Enchant becomes **+temper at 1:1** (`stats.js:60`, `ui/lib/items.js:31`). No M2 item has temper, so no save changes. |
| D11 | Relic-Bearer families | Exactly 4: `rotstag`, `oldsnag`, `gloamwing` and `mirelord` (Gorrow). Named humanoid holders are variants with `tier:'relic-bearer'`. |
| D12 | Performance gate | p95 frame time under 16 ms at 4× CPU throttle, at most 40 `drawImage` calls per frame, and a render loop that allocates nothing. |
| D13 | Atlas | Embed the player's illustrated map as a 960×640 WebP of at most 140 KB. If it fails to load, fall back to a procedural parchment. |
| D14 | Downloads | The build writes `dist/aethermoor-m3.html`. Step 0 copies the shipped M2 file to `dist/aethermoor-m2.html`, and nothing overwrites it after that. |

---

## 1. Scope

**In (M3):**
- **Maps:** 14 maps (§2): the Keep courtyard and hall, the Hearth Road, 3 wild routes (Thornway, Mossfall, Hindwood), Thornhollow, Eldergrove, Briarmaw's Den, Mosswatch (2 floors), Fawnrest, and the Heartroot (2 maps).
- **Hearthfires:** 10, of which 4 start cold.
- **Sealed exits:** 5.
- **Foes:** 18 families (8 existing, 10 new), the 6 Omens, 4 Relic-Bearer families, and 7 named humanoid holders.
- **Bosses:** Briarmaw, the Rotwarden and the Tamsin duel.
- **Relics:** 24 (12 new), each with a map power.
- **Locks:** 11 lock types, each with two keys.
- **Chests:** 18.
- **Quests:** 5 quests, 6 bounties, the Ladder (17 posters plus 3 Act II silhouettes), and 2 Unsmith letters.
- **Places and systems:**
  - The walkable reliquary (24 pedestals).
  - Hilda's Temper, and 2 consumable shops.
  - Visible roaming packs and zone patrols.
  - Flee and Rout, First Strike, and ambush by facing.
  - A pre-fight card (Easy / Fair / Hard / Deadly) and hold-to-inspect with the Sighted stamp.
- **Onboarding and story beats:** onboarding hints, the Brand banner, the crownwall sequence, the Council scene and a to-be-continued card.
- **Menus:** the Atlas (fast travel and "you are here") and the Journal (Quests, Bounties, Ladder, Keys).
- **Saves and delivery:** save v2 with migration from M2 codes and M2 local saves, plus the `dist/aethermoor-m3.html` download.

**Out (later milestones):**
- The regions: Sunscorch, Ironspire and Gloomfen (only their sealed exits and `REGIONS` rows are in M3).
- Loot and forge systems: awakening, gems, reroll, salvage, and the full Codex binder.
- Story systems: the script VM, dream fights, the Tally-Wagon schedule, and returning the First Seed.
- NPC wandering AI (NPCs only idle-bob).
- The Hearthteller and cloud saves.

**Stretch (only if every gate is green):**
- NPC busts in dialogue.
- A polished landscape layout.
- The white-deer homecoming animation.
- Dotted trails for tap-to-walk (tap-to-walk itself is in scope).

---

## 2. World

### 2.1 Maps

Tiles are 16 px and coordinates are in tiles. **Lore** gives positions on the illustrated map (viewBox 1200×800). A route stores its lore position as a projection line (§4.2). **Lv** is the map's Waking-0 loot level. **Zone** is the patrol zone.

| id | Name | Size | Biome · music · battle backdrop | Zone | travel | Lv | Lore |
|---|---|---|---|---|---|---|---|
| `keep` | Hearthstone Keep | 30×24 | keep · hearth · hearth-road | — | yes | 1 | 540,390 |
| `keep-hall` | The Great Hall | 24×14 | keep · hearth · hearth-road | — | yes | 1 | 540,385 |
| `hearth-road` | The Hearth Road North | 26×70 | wilds · road · hearth-road | hearth-road | yes | 2 | line 520,375→325,268 |
| `thornhollow` | Thornhollow | 24×22 | town · town · thornhollow | — | yes | 4 | 310,260 |
| `thornway` | The Thornway | 30×56 | wilds · wilds · verdant-wood | thornway | yes | 5 | line 305,250→262,205 |
| `briarmaw-den` | Briarmaw's Den | 16×18 | den · dungeon · briarmaw-den | — | no | 7 | 262,205 |
| `mossfall` | Mossfall | 52×22 | fen · wilds · **mossfall*** | mossfall | yes | 4 | line 298,262→150,280 |
| `mosswatch-1` | Mosswatch Tower | 14×16 | tower · dungeon · **mosswatch*** | — | no | 5 | 140,280 |
| `mosswatch-2` | The Lamp Room | 12×12 | tower · dungeon · mosswatch (dark) | — | no | 5 | 140,280 |
| `hindwood` | The Hindwood | 32×40 | wilds · wilds · verdant-wood | hindwood | yes | 4 | line 320,252→365,180 |
| `fawnrest` | Fawnrest Shrine | 22×20 | grove · hearth · **fawnrest*** | — | yes | 4 | 370,170 |
| `eldergrove` | Eldergrove | 30×26 | grove · town · **eldergrove*** | — | yes | 4 | 200,160 |
| `heartroot-1` | The Heartroot | 24×24 | roots · dungeon · **heartroot*** | heartroot | no | 6 | 192,152 |
| `heartroot-2` | The Heart Chamber | 18×16 | roots · dungeon · heartroot (dark) | — | no | 6 | 192,152 |

\* A new battle backdrop (5 in total).

### 2.2 Connections

`*` marks a crownwall (story seal) that opens on `{brand:'brand-of-briars'}`. `S!` marks a sealed exit toward a future region.

```
                 fawnrest ──E── S! Highfold Path (Ironspire)
                    │N
 eldergrove ─E(ledge↓)─ hindwood
  │S  │Eldest Tree        │SE*
  │  heartroot-1 ─N─ heartroot-2
 thornway*N ─door─ briarmaw-den
  │S                    │
 thornhollow ──NE*──────┘
  │W*        │S
 mossfall ─door─ mosswatch-1 ─stair─ mosswatch-2
  │S!Fen Stair (Gloomfen)
 hearth-road (N end = Thornhollow S gate)
  │S
 keep ─door─ keep-hall      keep: S! E (Ironspire), SE (Sunscorch), SW (Gloomfen)
```

### 2.3 Layout of each map

Exit `area`s and anchors are frozen. WP3 may move other entities by up to 2 tiles to fit the art, as long as the map tests still pass.

**`keep` (courtyard).**
- Walls ring a flagstone yard. The hall facade runs along the top.
- **Exits:**
  - Hall door `keep-hall-door` [15,4] leads to `keep-hall` at anchor `from-court`.
  - North gate exit `keep-n` [14..16,0] leads to `hearth-road` at anchor `from-keep`, behind the gate `keep-n-gate` [14..16,1]. The gate opens on `{done:'keep-vault'}`. Until then it reads: *Guard: "Not with the Seal still missing, Warden. Captain's orders."*
  - Sealed exits: `keep-e` [29,11..12] (Ironspire), `keep-se` [22..23,23] (Sunscorch) and `keep-sw` [6..7,23] (Gloomfen). A gate guard NPC stands at each.
- **NPCs:** Marta (shop) at (20,14), refugees at (8,12) and (11,17), and Hilda at (9,15) once `{brands:2}` is true.
- **Lock and chest:** `keep-armory-bar` (barred-gate) at (25,6) guards chest `keep-armory` at (26,6).
- **Anchors:** `from-hall` (15,6,s), `from-road` (15,2,s).

**`keep-hall`.**
- Eternal Hearth: hearthfire `hearthstone-keep` at (12,3), stand (12,5).
- Fenwick at (10,4), Isolde at (14,4).
- Sneck stands at the vault door: block `keep-vault` at (20,7), facing west.
- War-room corner: board `ladder-board` at (2,2) (opens the Ladder) and table `war-table` at (4,2) (opens the Atlas, view only).
- Reliquary gallery in the south half: 24 `pedestal-<relicId>` entities in rows y=10 and y=12, x=3..14, in codex order. The walkway is y=11.
- Exit `hall-s` [12,13] leads to `keep` at anchor `from-hall`.
- **Triggers:** `keep-intro` (the whole map, on enter, once, if `{not:{flag:'intro-done'}}`) runs dialogue `keep-intro`. `council` (the whole map, on enter, once, if `{flag:'act1-complete'}`) runs `council`.
- **Anchors:** `start` (12,6,n), `from-court` (12,12,n), `v1:hearthstone-keep` (12,6,n), `v1:keep-vault` (18,7,e).

**`hearth-road`.**
- A 3-wide road (x 12–14, meandering ±2) runs from y69 to y0.
- **Pack encounters** (their positions are homes):
  - `hearth-road` at (12,60), leash 4.
  - `waymarker-stones` at (9,50), among ring-stones.
  - `verdant-edge` at (13,22).
- **Hearthfire:** `milestone-fire` at (15,42), stand (15,44).
- **The toll:** the chain gate `bramble-toll-chain` [11..13,32] has `guard:'bramble-toll'` and `open:{unlocked:'bramble-toll-chain'}`. Skarn stands in the toll-house yard: block `bramble-toll` at (16,31), facing west.
- **The glade:** an open clearing at x16–24, y8–20, in view from the road, with lair `rotstag-glade` at (20,13).
- **The millrace:** a stream at x19–20, y40–60. Past it lies Poacher's Holm on an islet (x21–25, y44–56), with lair `poachers-holm` at (23,50). Its nameplate, "Haskett · Lv 10 · Deadly", can be read from the road. The ford is lock `hr-millrace-ford` (stream) [19..20,50].
- **Smugglers' Hollow:** a bush-walled pocket at x0–6, y24–36, behind lock `hr-hollow-bramble` (bramble) [7,30..31], with block `hr-smugglers` at (3,30), facing east.
- **Chests:** `hr-ditch` at (8,58), `hr-glade-chest` at (24,9) behind lock `hr-glade-wall` (thornwall) [23..24,10], and `hr-boulder-chest` at (2,46) behind lock `hr-boulder` (boulder) at (3,46).
- **Sign:** `hr-tenth-waymarker` at (8,48), with lore.
- **Exits:** `hr-s` [12..14,69] leads to `keep` at `from-road`. `hr-n` [11..13,0] leads to `thornhollow` at `from-road`.
- **Roam rects:** [2,38,24,66] and [8,14,18,28], max 3.
- **Anchors:** `from-keep` (13,67,n), `from-thornhollow` (12,2,s), `v1:hearth-road` (13,64,n), `v1:waymarker-stones` (12,54,n), `v1:milestone-fire` (15,44,n), `v1:bramble-toll` (12,35,n), `v1:verdant-edge` (13,26,n), `v1:rotstag-glade` (17,14,e).

**`thornhollow`.**
- A palisade ring. Hearthfire `thornhollow` at (12,11), stand (12,13).
- **NPCs:**
  - Dael at (7,6).
  - Nell (shop) at (16,8).
  - Hilda at (18,15) while `{not:{brand:'brand-of-briars'}}` is true.
  - Corra at (8,15) once `{flag:'rangers-home'}` is true.
- **Objects:** bounty board `bounty-board` at (9,5), lookout `th-lookout` at (3,3), and chest `th-cache` at (21,19) behind lock `th-stockade` (barred-gate) at (20,18).
- **Crownwall gates:** `th-crown-w` [1,10..11] and `th-crown-ne` [22,3..4].
- **Exits:**
  - `th-s` [11..12,21] leads to `hearth-road` at `from-thornhollow`.
  - `th-n` [11..12,0] leads to `thornway` at `from-thornhollow`.
  - `th-w` [0,10..11] leads to `mossfall` at `from-thornhollow`.
  - `th-ne` [23,3..4] leads to `hindwood` at `from-thornhollow`.
- **Anchors:** `from-road` (12,19,n), `from-thornway` (12,2,s), `from-mossfall` (2,10,e), `from-hindwood` (21,4,w), `v1:thornhollow` (12,13,n).

**`thornway`.**
- The path winds north from [13..14,55].
- **Tally camp:** a western clearing at x1–9, y40–48, with block `tally-camp` at (5,44), facing east. Its chest `tw-strongbox` at (2,42) has a tally-seal lock.
- **Wallow:** mud to the east at x20–28, y30–38, with lair `snag-wallow` at (24,34).
- **The first two-key lock:** `tw-thornwall` (thornwall) runs across the path at [12..16,26].
- **North of the wall:**
  - Block `bramble-deep` at (15,20), facing south.
  - Trigger `tw-boots` (step, once) over [14,19..18,22] runs dialogue `boots-clue`.
  - Hearthfire `den-mouth` at (22,8), stand (22,10).
  - Den door exit `tw-den` [26,4] leads to `briarmaw-den` at `from-thornway`.
- **Crownwall:** gate `tw-crown-n` [14..15,1] in front of exit `tw-n` [14..15,0], which leads to `eldergrove` at `from-thornway`.
- **Chests:** `tw-thorn-chest` at (27,28) (thornwall pocket), `tw-boulder-chest` at (3,14) (boulder) and `tw-bramble-cache` at (8,24) (bramble).
- **Other exit:** `tw-s` [13..14,55] leads to `thornhollow` at `from-thornway`.
- **Roam rects:** [4,28,26,52] and [4,6,26,24].
- **Anchors:** `from-thornhollow` (14,53,n), `from-den` (26,6,s), `from-eldergrove` (14,2,s), `v1:tally-camp` (8,46,w), `v1:snag-wallow` (21,36,e), `v1:bramble-deep` (15,23,n), `v1:den-mouth` (22,10,n).

**`briarmaw-den`.**
- Lair `briarmaw-den` at (8,5), area [6,3,10,6].
- Exit `den-s` [7..8,17] leads to `thornway` at `from-den`.
- **Anchors:** `from-thornway` (8,15,n), `v1:briarmaw-den` (8,13,n).

**`mossfall`.**
- A marsh with the Gloomfen border to the south.
- **Hearthfire:** cold `mossfall-cairn` at (30,6), stand (30,8).
- **Mire Shrine:** an islet at x38–45, y15–20, reached through ford lock `mf-islet-ford` (stream) at [41,14]. Lair `mire-shrine` sits at (42,18).
- **Tower:** door exit `mf-tower` [3,8] leads to `mosswatch-1` at `from-mossfall`.
- **Packs:** `mf-smugglers` home (14,6), `mf-bog` home (24,14).
- **Chests:** `mf-bramble-cache` at (46,3) (bramble) and a hidden `mf-reed-cache` at (9,18).
- **Sealed exit:** `mf-fen-stair` [20..21,21] (Gloomfen).
- **Other exit:** `mf-e` [51,10..11] leads to `thornhollow` at `from-mossfall`.
- **Roam rect:** [6,2,48,20].
- **Anchors:** `from-thornhollow` (49,10,w), `from-tower` (3,9,s).

**`mosswatch-1`.**
- Door `mw1-door` [6..7,15] leads to `mossfall` at `from-tower`.
- Garret stands at (4,11).
- Block `mw-stair` at (7,4) guards the stair `mw1-up` [7,2], which leads to `mosswatch-2` at `from-stair`.
- **Ledger room:** door lock `mw-ledger-door` (tally-seal) at [10,6] guards chest `mw-ledger` at (11,3).
- **Anchors:** `from-mossfall` (6,13,n), `from-lamp` (7,3,s).

**`mosswatch-2`** (`dark: true`).
- Lair `mw-lantern` at (6,5). Hollis's lantern is a light source with radius 3.
- **Signal fire:** cold hearthfire `mosswatch-fire` at (6,2), stand (6,3).
- Lookout `mw-lookout` at (10,2).
- Exit `mw2-down` [6,11] leads to `mosswatch-1` at `from-lamp`.
- **Anchor:** `from-stair` (6,9,n).

**`hindwood`.**
- **Gloamwing:** lair `gloamwing-hollow` at (22,12), in a hollow of pale trees.
- **Hearthfire:** cold `hindwood-cairn` at (10,24), stand (10,26).
- **Packs:** `hw-glowcaps` home (8,14), `hw-druids` home (18,28).
- **Chest:** `hw-thorn-chest` at (28,6) behind lock `hw-thornwall` [27..28,7].
- **Exits:**
  - `hw-se` [31,34..35] leads to `thornhollow` at `from-hindwood`.
  - `hw-n` [15..16,0] leads to `fawnrest` at `from-hindwood`.
  - `hw-w` [0,8..9] leads to `eldergrove` at `from-hindwood`, past lock `hw-rope` (rope-ledge) at [1,8..9].
- **Roam rect:** [2,4,30,38].
- **Anchors:** `from-thornhollow` (29,34,w), `from-fawnrest` (15,2,s), `from-eldergrove` (2,8,e).

**`fawnrest`.**
- **Dreaming Stone:** hearthfire `fawnrest-stone` at (11,5), stand (11,7).
- **Bell-frame:** `fr-bellframe` at (7,6).
- **NPCs:** Brother Ivo at (13,8), and pilgrims at (5,12) and (8,14).
- **Vesper:** encounter `vesper-stall` at (16,12) is a block with `talk:'vesper'`.
- **White-deer clearing:** x14–20, y2–8. Deer props appear once `{flag:'bell-rung'}` is set.
- **Chest:** `fr-offering` at (3,3) (boulder).
- **Sealed exit:** `fr-highfold` [21,9..10] (Ironspire).
- **Other exit:** `fr-s` [10..11,19] leads to `hindwood` at `from-fawnrest`.
- **Anchor:** `from-hindwood` (11,17,n).

**`eldergrove`.**
- Torches burn at midday and fungi glow.
- **Hearthfire:** `eldergrove-hearth` at (13,14), stand (13,16).
- **NPCs:** Miravel at (17,11) by the seed-vault door, Nan Aldercott at (8,16), and Hilda at (22,18) while `{all:[{brand:'brand-of-briars'},{not:{brands:2}}]}` is true.
- **Objects:** sign `eg-bryn-house` at (5,12), and chest `eg-brook-chest` at (26,12) behind lock `eg-brook` (stream) [24,12..13].
- **Grove circle:** a stone ring at x1–7, y3–9, with lair `grove-circle` at (4,6).
- **Tamsin:** encounter `tamsin-duel` at (17,3) is a block with `talk:'tamsin-door'` and `if:{brand:'brand-of-briars'}`.
- **Eldest Tree door:** gate `eldest-door` [15,2] (look `door`) opens on `{all:[{brand:'brand-of-briars'},{any:[{done:'tamsin-duel'},{flag:'tamsin-yielded'}]}]}`. Behind it, exit `eg-tree` [15,1] leads to `heartroot-1` at `from-tree`.
- **Other exits:**
  - `eg-s` [14..15,25] leads to `thornway` at `from-eldergrove`.
  - `eg-e` [29,8..9] leads to `hindwood` at `from-eldergrove`. This is a one-way ledge drop with `unlock:'hw-rope'`, so the rope is kicked down behind you.
- **Anchors:** `from-thornway` (14,23,n), `from-heartroot` (15,4,s), `from-hindwood` (27,8,w).

**`heartroot-1`.**
- **Ichor:** soft locks `h1-ichor-a` [8,12,15,14] and `h1-ichor-b` [16,6,19,8].
- **Hearthfire:** cold `last-green-coal` at (4,20), stand (4,21).
- **Packs:** `hr1-grubs` home (16,18), `hr1-sapwight` home (8,16).
- **Blocks:** `hollowed-patrol` at (19,11), facing west, and `hr1-tappers` at (5,6), facing east.
- **Side passage:** `h1-rot-knot` (rot-knot) at [2,12] opens it to chest `h1-cache` at (1,9). Chest `h1-ichor-chest` sits at (17,7), inside pool b.
- **Exits:** `h1-s` [12,23] leads to `eldergrove` at `from-heartroot`. `h1-n` [12,0] leads to `heartroot-2` at `from-roots`.
- **Roam rect:** [3,3,21,21].
- **Anchors:** `from-tree` (12,21,n), `from-chamber` (12,2,s).

**`heartroot-2`** (`dark: true`).
- Lair `rotwarden-heart` at (9,5), area [7,3,11,7].
- Sign `h2-rings` (the Eldest Rings) at (3,2), and a hidden chest `h2-roots` at (15,2).
- Exit `h2-s` [9,15] leads to `heartroot-1` at `from-chamber`.
- **Anchor:** `from-roots` (9,13,n).

### 2.4 The ten Hearthfires

All ten appear on the Atlas. `HEARTHS[id]` in `data/world.js` gives `{map, x, y, face, lore:[x,y], name}`.

| Hearthfire | Lore point |
|---|---|
| `hearthstone-keep` | 540,390 |
| `milestone-fire` | 430,330 |
| `thornhollow` | 310,260 |
| `den-mouth` | 262,208 |
| `mossfall-cairn` (cold) | 225,272 |
| `mosswatch-fire` (cold) | 140,280 |
| `hindwood-cairn` (cold) | 335,225 |
| `fawnrest-stone` | 370,170 |
| `eldergrove-hearth` | 200,160 |
| `last-green-coal` (cold) | 192,152 |

### 2.5 Guided start, then the Wilds open

1. **Prologue (0:00–0:10).**
   - New game now ends in `keep-hall` at `START_AT`.
   - The `keep-intro` trigger plays. Fenwick: *"The vault! Warden, the Seal!"*
   - Sneck glints at the vault door. You win the Seal (the gentle tutorial fight), and Isolde gives her commission.
   - The Keep's north gate opens.
2. **Hearth Road (0:10–0:25).**
   - Packs chase you, and the Milestone Fire teaches Rest and Travel.
   - Skarn's chain blocks the road until you beat him. After that it stays open for good (`opens`).
   - The Rot-Stag grazes in plain view.
   - Across the millrace, Haskett's plate reads "Lv 10 · Deadly": the optional hard area you can see early. Stillwater starters can ford the millrace at once.
   - The Smugglers' Hollow opens to bramble keys: Pip at L4, or the Thornwatch Jerkin.
3. **Thornhollow and the Thornway (0:25–1:00).**
   - Dael's board and the Tally camp.
   - Old Snag sits beside the thornwall. You cross with the Thornsplitter or Warden L5 (Physical 3).
   - Then the Bramble-Deep, the Last Coals, and **Briarmaw**.
4. **The Brand (about 1:00).**
   - The Brand of Briars raises the Waking to 1. There is no teleport.
   - On return to the world, the banner plays, then the **crownwall sequence**: the Atlas fills the screen and three seals crack over Mossfall, the Hindwood and the Thornway north (3 s, skippable).
   - Then **Unsmith letter #1**. Back on the old roads, rabble now flee.
5. **Three leads, in any order (1:00–1:45).** Each one arms you against the blight boss, since tide and radiant beat blight:
   - **Mossfall and Mosswatch:** Hollis and the Lantern (lights the dark), Garret's Kettle, and Gorrow's **Mire Pearl**.
   - **Hindwood and Fawnrest:** the Gloamwing's **Dawnbell**. Ringing it brings the deer home, and sleeping on the Dreaming Stone gives the dream of the four Sleepers, which grants *Forewarned*.
   - **Eldergrove's Grove circle:** Oda's **Rootsong**.
6. **The Heartroot and the finale (1:45–2:00).**
   - The Tamsin duel at the Eldest Tree, then the Heartroot, then the **Rotwarden**. This earns Brand 2, raises the Waking to 2, and sets `act1-complete`.
   - Unsmith letter #2 arrives.
   - Returning to the hall plays the Council scene. If you own the Ichor Mask, Hilda reads Harrow's mark.
   - A to-be-continued card follows, and free roam continues.

### 2.6 Sealed exits and the M4 plug point

Each sealed exit is `{id, area, sealed:{region, text}}`. After `act1-complete`, the UI appends: *"The way opens in the next chapter."*

| Exit | Region | Text |
|---|---|---|
| `keep-se` | sunscorch | "The Sandspire caravans stopped a month ago, and the dune-glass walls are still too hot to cross." |
| `keep-e` | ironspire | "Rockslide on the pass. Stormwatch hasn't sent a writ since spring." |
| `keep-sw` | gloomfen | "Blackwater's up over the causeway. Nobody's ferrying." |
| `mf-fen-stair` | gloomfen | "Fog breathes up the stair. Willowmurk's safe paths start somewhere below." |
| `fr-highfold` | ironspire | "Fallen scree, and somewhere past it, a bell." |

`data/world.js` exports the regions:

```js
REGIONS = {
  verdant:   { id, name:'The Verdant Wilds', act:1, lore:[270,220], brands:['brand-of-briars','brand-of-the-heartroot'], open:true },
  sunscorch: { id, name:'The Sunscorch Wastes', act:2, lore:[870,470], entries:['keep-se'], brands:[], open:false },
  ironspire: { id, name:'The Ironspire Peaks', act:2, lore:[870,160], entries:['keep-e','fr-highfold'], brands:[], open:false },
  gloomfen:  { id, name:'The Gloomfen Marsh', act:2, lore:[280,530], entries:['keep-sw','mf-fen-stair'], brands:[], open:false },
};
BRAND_TOTAL = 8
```

M4 opens a region with data only: add its maps and replace `sealed` with `to`/`anchor` plus `gate:{flag:'act1-complete'}`. No engine change is needed.

---

## 3. Content

### 3.1 NPCs

`{warden}` is replaced with the player's name. Every line is rendered with `textContent`.

| id | Where | Role | Lines |
|---|---|---|---|
| fenwick | keep-hall (10,4) | Hearthkeeper | "It burned blue, Warden. Nine hundred years and it never once burned blue." · after Brand 1: "One coal. Hear it? It's humming. I'd forgotten it could hum." · asked about the hearth: "It eats what it's given. Go on, the road's waiting." |
| isolde | keep-hall (14,4) | Warden-Commander | "The Seal first. A Keep that can't close its own vault can't ask anyone for anything." · "If Tamsin's taken something that isn't hers, bring her back. If she's taken something that is, bring it back anyway." |
| marta | keep (20,14) | Shop | "Half the Hearth Road is sleeping in my courtyard. Buy something so I can feed them." |
| gate-guard ×3 | keep sealed gates | Flavour | Speaks the §2.6 exit text. |
| hilda | Thornhollow, then Eldergrove, then the Keep | Temper | "Hold still. Not you. The blade." · "Heat, hammer, patience. Mostly gold." · with `{owns:'ichor-mask'}`: "A hammer in a broken ring. I've seen that mark once, on my brother's anvil. Put it away before I do something stupid." |
| dael | thornhollow (7,6) | Bounty-giver | "Thirty names on the Thornwatch roll when I took it. Nine now." · "My board can't put a name to it. Bring me a name. Or a head." · with `rangers-home`: "Three went out. Three came home. I'll take it." |
| nell | thornhollow (16,8) | Shop | "No credit. The last lad I gave credit to is on the board." |
| corra | thornhollow (8,15) | Rescued | "I remembered my own name halfway through a sentence. Pip had to finish it." |
| garret | mosswatch-1 (4,11) | Quest, contest | "Lights? There's moss, and there's me, and the moss is winning." (Alondra: "He's lying, and he's frightened of the lie.") · "Ghosts don't leave bootprints in the porridge." |
| miravel | eldergrove (17,11) | Main quest | "Keep folk come for timber and advice. They never take the advice." · "The eldest trees bleed black from the root. Something down there is drinking them." · after Brand 1: "Briarmaw's crown held the old roads shut. It's dead; the roads are yours." |
| nan | eldergrove (8,16) | Flavour | "Bitterroot for the Rot. Won't cure it. Makes it sulk." |
| ivo | fawnrest (13,8) | Bell quest | "The deer left the way deer do: all at once, and then not at all." · "The bell? Something with wings took it off the frame." |
| pilgrim ×2 | fawnrest | Flavour | "Vesper's sap cured my cough." (Alondra: "And gave you a new one.") |
| tamsin | eldergrove (17,3), via `talk` | Rival | "Isolde sent me in first. You can watch. Or try." · on a win: "Fine. Not luck. Don't let it go to your head." · on a yield: "That was a practice swing. The next one isn't. Door's open, by the way." |
| vesper | fawnrest (16,12), via `talk` | Tallyman con | "Miracle sap, a silver the thimble. Cures rot, rheum and regret." |

- **Party lines.** On first entry to their homes: Pip at Thornhollow ("Every path has a secret one next to it. The secret one's usually worse."), Bryn at Eldergrove and Alondra at Fawnrest.
- **"The world notices."** About 10 lines are gated on `{wears:relicId}`, for example Dael on the Thornwatch Hood: "That hood had a name in it once. Earn it."
- **The Rotwarden** speaks through encounter text. Masked: "GREEN WAS A MISTAKE. THE MASK SAYS SO." The post-fight trigger, when the mask was claimed: "…Warden. I held the root nine hundred years. Hold it now."
- **Unsmith letter #1:** "One coal. How touching. Ask your hearthkeeper what a hearth eats, little Warden, and watch his hands while he answers. — U."
- **Unsmith letter #2:** "Two. You are making it hungry. Keep going. — U."

### 3.2 Foe families (18; the Tamsin rival is extra)

The 8 existing families are unchanged: cutpurse, briarling and thornhound (rabble); bandit and tallyman (veteran); rotstag and oldsnag (relic-bearer); briarmaw (champion).

Stats in the table below are at level 1. "Base Lv" is the Waking-0 level stored in data. Every post-Brand foe is met at Waking 1: +6 levels for veterans and up, +2 for rabble.

| id | Tier | Base Lv (met at) | Aspect | Armour | HP/Guard/Spd | Moves (die faces) | Art |
|---|---|---|---|---|---|---|---|
| smuggler | rabble, humanoid | 6–9 (8–11) | — | hide | 17/14/12 | Cut (weapon 1d4) 1–3 · Caltrops (all, DEX save or Rooted) 4–5 · Bolt (under 50%: escape) 6 | cutpurse-class rig, kerchief, gear tiers 0–3 |
| boglurcher | rabble beast | 7–8 (9–10) | tide, resists crush | hide | 22/13/9 | Slam 1d8 crush 1–3 · Mire Grab (1d6, STR save or Rooted) 4–5 · Drag Under (charge 2d8 tide) 6 | 48×48 mound with eyes; map 24×16 |
| glowcap | rabble plant | 7 (9) | verdant | hide | 14/12/8 | Headbutt 1d6 1–3 · Spore Puff (all, CON save or Poisoned) 4–5 · Glow (self Warded 1d6) 6 | 48×48 cap with a glowing gill; map 16×16 |
| rotgrub | rabble beast | 8 (10) | blight | chitin | 15/13/11 | Latch (1d6 + Bleeding) 1–3 · Ichor Spit (1d4 + Poisoned ×2) 4–5 · Burrow (Guarding) 6 | 48×32; map 16×12 |
| feral-druid | veteran, humanoid | 4 (10) | verdant | hide | 26/14/10 | Thorn Lash (weapon staff) 1–4 · Barkskin (Warded 2d6) 5–6 · Call the Briars (summon a briarling, max 1, levelDelta −2) 7–8 | antler hood, robe, gear 0–3 |
| hollowed-ranger | veteran, humanoid | 5 (11) | blight | hide | 28/15/11 | Rot-Arrow (weapon bow + Poisoned) 1–4 · Knife 1d4 5–6 · Remember (under 30% HP: loses its turn, "It says a name. Its own.") 7–8 | Thornwatch rags, blight eyes |
| sapwight | veteran | 5 (11) | blight | plate | 32/14/9 | Sap Leech (1d8 blight, heals the same) 1–4 · Grasp (STR save or Rooted) 5–6 · Bark Hide (Guarding) 7–8 | 48×64 bark ghoul |
| gloamwing | relic-bearer, unique | 5 (11) | radiant, weak to ember | hide | 90/15/13 | Wing Buffet 2d6 1–4 · Dreamdust (all, WIS save or Frightened) 5–7 · Cocoon (under 50%: Regenerating) 8 · Bell-Hum (requires dawnbell; all 2d6 radiant + Staggered) 9–12 | 64×64 pale moth; the Dawnbell is silk-spun on its thorax |
| mirelord | relic-bearer, unique (Gorrow the Mire-King) | 5 (11) | tide, resists crush | hide | 110/15/9 | Belly-Flop (all 1d8 crush) 1–4 · Drag Under (charge 3d8 + Rooted) 5–7 · Wallow (Regenerating) 8 · Undertow (requires mire-pearl; all 2d6 tide + Chilled) 9–12 | 64×64 frog-king; the pearl sits in a crown of reeds |
| rotwarden | champion, unique | 7 (13) | blight | plate | 200/16/10 | §3.5 | 96×96 First-Age warden, bark through plate, smith's mask |

**Named holders.** These are `variants` with a `tier` override. Each variant defines `moves: {...BASE_MOVES, art}` and a table covering its die.

| Family / variant | Name | Tier | HP | Relic | Relic art (requires) |
|---|---|---|---|---|---|
| smuggler/queen | Mags Kestrel | relic-bearer | 58 | lightfingers | Sleight: 2d6 pierce + Marked, self Hasted |
| bandit/poacher | Haskett | relic-bearer | 64 | hartshorn | Longshot: charge 3d8 pierce storm |
| tallyman/signalmaster | Hollis Fairweight | relic-bearer | 60 | mosswatch-lantern | Signal Flare: all 2d6 ember + Marked |
| tallyman/counter | Dun the Counter | relic-bearer | 66 | isoldes-oath | Oath Cut: 2d8 frost + Chilled ×2 |
| tallyman/apothecary | Vesper | veteran | 30 | — | Miracle Sap: heals an ally 2d8 |
| feral-druid/thornmother | Oda the Thornmother | relic-bearer | 70 | rootsong | Rising Sap: allies heal 2d6 + Regenerating |
| hollowed-ranger/sergeant | Sgt Corra Thistle | relic-bearer | 72 | oathshield | Hold the Line: allies Warded 3d6 |

- Variants set `art` to `mags`, `haskett`, `hollis`, `dun`, `vesper`, `oda` or `corra`.
- **Tamsin** (`tamsin`, the rival and not counted among the 18) is a humanoid relic-bearer: HP 34, Guard 15, atk 5, dmg 2, speed 13, hide. She needs a `gear[0..3]` table so `wears` works, and she has variants keyed by the rival starter id.
- **Tamsin's d12:**
  - 1–3 Riposte (1d8 slash)
  - 4–5 Cheap Shot (1d6 + Frightened)
  - 6 Showboat (self Hasted)
  - 7 Parry (Guarding)
  - 8–11 her starter's Art, which requires `$rival`:
    - Hearthbrand: Kindled Cut, 2d8 ember + Burning
    - Stillwater: Still Point, 2d8 frost + Chilled ×2
    - Cairnmaul: Cairn Swing, charge 3d10 crush + Staggered
  - 12 Not Like This (under 35%: heals 2d8 and Warded; fallback Riposte)

### 3.3 New encounters

All new encounters have `region:'verdant'`. Levels are base (Waking 0). The M2 encounters are **byte-identical**: same ids, same spawn arrays.

| id | Map · mode | Spawns | Flags |
|---|---|---|---|
| hr-smugglers | hearth-road · block | smuggler/queen 6 (relic lightfingers), smuggler 4 ×2 | — |
| poachers-holm | hearth-road · lair | bandit/poacher 10 (hartshorn, `wakeLevels:3`), thornhound 8 ×2 | — |
| mf-smugglers | mossfall · pack | smuggler 7 ×3 | — |
| mf-bog | mossfall · pack | boglurcher 7 ×2, smuggler 6 | — |
| mire-shrine | mossfall · lair | mirelord 5 (mire-pearl), boglurcher 8 ×2 | — |
| mw-stair | mosswatch-1 · block | tallyman 4, smuggler 7 ×2 | — |
| mw-lantern | mosswatch-2 · lair | tallyman/signalmaster 5 (mosswatch-lantern), tallyman 4 | — |
| hw-glowcaps | hindwood · pack | glowcap 7 ×3 | — |
| hw-druids | hindwood · pack | feral-druid 4, thornhound 8 ×2 | — |
| gloamwing-hollow | hindwood · lair | gloamwing 5 (dawnbell) | — |
| vesper-stall | fawnrest · block | tallyman/apothecary 5, smuggler 8 ×2 | once, talk |
| grove-circle | eldergrove · lair | feral-druid/thornmother 5 (rootsong), feral-druid 4, briarling 8 | — |
| tamsin-duel | eldergrove · block | tamsin 'party' (+1), variant `$rival`, relic `$rival` lend, wears vale-gauntlets, noWaking | once, duel, talk |
| hr1-grubs | heartroot-1 · pack | rotgrub 8 ×3 | — |
| hr1-sapwight | heartroot-1 · pack | sapwight 5, rotgrub 8 ×2 | — |
| hollowed-patrol | heartroot-1 · block | hollowed-ranger/sergeant 6 (oathshield), hollowed-ranger 5 ×2 | once |
| hr1-tappers | heartroot-1 · block | tallyman/counter 6 (isoldes-oath), smuggler 9 ×2 | — |
| rotwarden-heart | heartroot-2 · lair | rotwarden 7 | brand `brand-of-the-heartroot`, forewarned |

**Patrols.**
- `ENCOUNTERS` also gains the 6 new hearthfires as `type:'hearthfire'`, with name, place and backdrop.
- `PATROLS` gains three sets:
  - `mossfall`: [smuggler ×2 + boglurcher], [boglurcher ×2]
  - `hindwood`: [glowcap ×2 + thornhound], [thornhound ×2 + briarling]
  - `heartroot`: [rotgrub ×3], [rotgrub ×2 + glowcap]
- `ZONES` (in `data/world.js`) sets each zone's base level, patrol set and backdrop:

  | Zone | Base Lv | PATROLS key | Backdrop |
  |---|---|---|---|
  | hearth-road | 2 | hearth-road | hearth-road |
  | thornway | 5 | verdant-wood | verdant-wood |
  | mossfall | 7 | mossfall | mossfall |
  | hindwood | 7 | hindwood | verdant-wood |
  | heartroot | 8 | heartroot | heartroot |

### 3.4 Relics (24)

Numbers 1–12 are unchanged, and their existing `mapPower` ids come into use. All 12 new relics are `heirloom` rarity with a `power` and a `mapPower`. That makes 3 starters, 18 non-set relics and 3 Regalia.

| No. | id | Kind · slot · aspect | Holder | Stats sketch | Surge power | Map power |
|---|---|---|---|---|---|---|
| 13 | lightfingers | gloves · hands · frost | Mags Kestrel (grip 20) | DEX+1, gripDmg+3, speed+1 | Sleight of Hand: grip 4d6 + 2d6 frost + Chilled | `lightfingers`: tally-seals |
| 14 | hartshorn | bow · weapon · storm | Haskett (grip 26) | 1d8 pierce ranged 2H + 1d6 storm, hit+2 | Thunder of the Hart: all 2d8 storm + Staggered | `harts-sight`: rope-ledges; hidden caches sparkle |
| 15 | mosswatch-lantern | focus · offhand · ember | Hollis (grip 22) | mp+6, healBonus 10, resist blight 15 | Signal Fire: all 2d8 ember + Burning | `lamplight`: darkness, cold hearths |
| 16 | watchkeepers-kettle | kettle · head · storm | Old Garret (contest or quest) | guard+1, hp+8, WIS+1 | Longwatch: allies Warded 2d6 and Hasted | `longwatch`: lookouts mark chests, locks and holders on the Atlas |
| 17 | mire-pearl | ring · ring · tide | Gorrow (grip 24) | hp+6, regen 1, resist tide 20 and blight 10 | Undertow: 3d8 tide + Staggered, cleanses one ally | `mirebreath`: ichor |
| 18 | dawnbell | mace · weapon · radiant | Gloamwing (grip 26) | 1d8 crush + 1d6 radiant, healBonus 10 | Matins: allies heal 2d8, cleanse 1 | `dawnbell`: flee gap −1; rings the Fawnrest bell |
| 19 | rootsong | staff · weapon · tide | Oda (grip 26) | 1d6 crush 2H + 1d6 tide, mp+8, INT+1 | Rising Sap: allies Regenerating 1d8 + heal 1d8 | `rootsong`: streams, rot-knots |
| 20 | oathshield | shield · offhand · stone | Corra (grip 28) | guard+2, hp+6, resist blight 15 | Hold the Line: allies Warded 3d6 | `hold-the-line`: ichor |
| 21 | isoldes-oath | sword · weapon · frost | Dun (grip 28) | 1d8 slash (versatile 1d10) + 1d6 frost, hit+2 | Oath of Winter: all 2d8 frost + Chilled ×2 | `stillness`: the alert pause lasts 6 ticks |
| 22 | ichor-mask | helm · head · blight | Rotwarden, breakable (grip 32) | INT+1, WIS+1, resist blight 30 | Blacksap: all 2d8 blight + Poisoned ×2 | `ichorsight`: rot-knots; shows sap-trails |
| 23 | first-seed | amulet · amulet · verdant | Rotwarden, breakable (grip 28) | hp+10, regenPct 3, resist blight 20 | Greenwake: allies heal 3d8, cleanse 1 | `greenwake`: bramble, ichor |
| 24 | vale-gauntlets | gauntlets · hands · storm | worn by Tamsin; drops on win | STR+1, hit+1, gripDmg+2 | Showing Off: a weapon strike that crits, self Hasted | `name-drop`: barred gates |

Map powers of relics 1–12:

| Map power | Relic | Effect |
|---|---|---|
| kindle | Hearthbrand | cold-hearth, darkness |
| still-the-water | Stillwater Lance | stream |
| break-the-cairn | Cairnmaul | boulder |
| wardens-writ | Warden's Seal | barred-gate |
| cut-the-tally | Tallyknife | tally-seal |
| cut-the-thornwall | Thornsplitter | thornwall |
| hear-the-rot | Rotwood Circlet | rot-knot |
| watchful | Thornwatch Hood | holders sighted at 9 tiles; hidden caches sparkle |
| thorn-thread | Thornwatch Jerkin | bramble |
| trackless | Thornwatch Boots | all-rabble packs never alert |
| briar-crown | Thornwreath | thornwall, bramble |
| bloodtrail | Briarfang | rope-ledge |

**Rules for keys and powers:**
- A relic counts as a key while it is **owned and not shattered**. It does not need to be equipped.
- Passive powers such as Watchful, Trackless, Dawnbell and Stillness also count only while owned.

### 3.5 Bosses and the rival

**Briarmaw** is unchanged. After Brand 1 it re-arms as an Echo rematch that grants no Brand.

**The Rotwarden** (`rotwarden-heart`) is Lv 7 base (13 at Waking 1).
- **Stats:** HP 200, Guard 16, atk 6, dmg 3, plate, blight aspect.
- **Relics:** `['ichor-mask','first-seed']`, with `noFlee`.
- **Forewarned:** if `story.forewarned` is set, the battle ctx has `warded:'2d6+4'` and every hero starts Warded.

| Phase (d20) | Faces |
|---|---|
| P1, 100% "The Warden Keeps" | 1–7 Rootlash (2d8 slash) · 8–11 Bark Hide (Warded 3d6) · 12–15 Graft (requires first-seed: summon sapwight, max 2, levelDelta −3; fallback Rootlash) · 16–20 Blacken the Sap (requires ichor-mask: all 2d8 blight, heals half; fallback Rootlash) |
| P2, 66% "The Roots Answer" | 1–5 Rootlash · 6–9 Grasping Roots (all, STR save or Rooted) · 10–12 Ichor Tide (all 1d8 + Poisoned ×2) · 13–15 Heartroot Bloom (requires first-seed: Regenerating 3d6; fallback Rootlash) · 16–20 Blacken |
| P3, 33% "The Mask Speaks" | 1–4 Rootlash · 5–9 Ichor Rain (requires mask: all 2d6 + Poisoned; fallback Grief) · 10–14 Devour (charge 3d10) · 15–20 Unmaking (requires mask: charge 4d8 blight on one hero; fallback Grief) |

- **Grief:** a self move, all heroes take 1d6 blight. Text: *"It weeps sap. Something under the wood says 'Thank you.'"*
- **Breaking pieces:** breaking the mask stops Blacken, Rain and Unmaking. Breaking the seed stops Graft and Bloom.

**The Tamsin duel.**
- The encounter has `duel:true` and `once:true`.
- A win gives the Vale Gauntlets (worn relic drop) and 120 gold via dialogue `tamsin-after-win`, and sets `done`.
- A defeat is a yield: no gold loss, no Grudge, heroes healed to the breather level, and `story['tamsin-yielded']=true`. She stays for a rematch.
- **Target:** the party wins 55–70% of first tries.

### 3.6 Quests, bounties, Ladder, letters

Quest state is derived from conditions. Only `flags.quests[id]='claimed'` is stored.

| id | Giver | Steps (each `done` condition) | Reward |
|---|---|---|---|
| `hearth-gutters` (main) | Isolde | Stop Sneck `{done:'keep-vault'}` → Reach Thornhollow `{flag:'met-dael'}` → Name the beast `{brand:'brand-of-briars'}` → Miravel's Rot `{flag:'met-miravel-rot'}` → The Heartroot `{brand:'brand-of-the-heartroot'}` → Come home `{flag:'council-done'}` | 300 g at the Brand (paid by Dael's dialogue) |
| `lights-at-midnight` | Garret | Stop the lights `{beaten:'mw-lantern'}` → Relight the signal fire `{kindled:'mosswatch-fire'}` → Tell Garret | watchkeepers-kettle, unless already won in the contest (then 150 g) |
| `silent-bell` | Ivo | Find the bell `{owns:'dawnbell'}` → Ring it `{flag:'bell-rung'}` → Sleep on the Dreaming Stone `{flag:'forewarned'}` | *Forewarned*, plus fr-offering hint |
| `missing-patrol` | Dael | Bootprints `{flag:'saw-boots'}` → Find them `{beaten:'hollowed-patrol'}` → Report to Dael | 150 g, sets `rangers-home` |
| `miracle-sap` | a pilgrim | Expose Vesper (Influence DC 14, advantage when `{active:'alondra'}`) or beat `vesper-stall` | 100 g, sets `vesper-exposed` |

- **Garret's contest:** win 2 of 3 checks (Knowledge DC 12, Survival DC 13, Influence DC 12). You can try once a day (`{since:{flag:'garret-tried', days:1}}`). A win gives the Kettle at once.
- **The dream:** resting at `fawnrest-stone` with `bell-rung` set runs the dialogue `dream-four-sleepers`, which sets `forewarned`.
- **Bounties** are posted on the Thornhollow board and turned in to Dael:
  - Skarn: 40 g
  - Old Snag: 120 g
  - the Rot-Stag: 100 g
  - Mags Kestrel: 100 g
  - Haskett: 250 g
  - Dun's tappers: 150 g

  Each is complete once `{beaten:encId}` is true.
- **Ladder** (`data/ladder.js`): 17 posters, one per villain, in this order: Sneck, Skarn, Ledger-Maud (the tally-camp Tallyman, named through the spawn `name`), Old Snag, the Rot-Stag, Briarmaw, Mags, Haskett, Hollis, Gorrow, the Gloamwing, Vesper, Oda, Tamsin, Corra, Dun and the Rotwarden. Three Act II silhouettes follow: "a glass scorpion", "the Lantern Mother" and "the missing smith".
  - A poster goes from silhouette to **scouted** (`flags.scouted[id]`, set when sighted or fought) to **settled** (`{beaten}`).
- **Letters** (`data/letters.js`): one per Brand id (§3.1), shown once (`story['letter:<brand>']`).

### 3.7 Locks (two keys each)

- A Domain key uses the best active hero's `domains[d].level`. A primary Domain equals the hero's level. A secondary Domain is ⌈L/2⌉ (`progression.js:52`).
- "Soft" locks never block the way. They only cost you something without a key.

| Lock | Relic map powers | Domain key | Soft? | Placed at |
|---|---|---|---|---|
| thornwall | cut-the-thornwall, briar-crown | physical 3 (Warden L5) | no | tw-thornwall (critical), hr-glade-wall, tw-thorn-chest, hw-thornwall |
| bramble | thorn-thread, briar-crown, greenwake | survival 4 (Pip L4) | no | hr-hollow-bramble, tw-bramble-cache, mf-bramble-cache |
| stream | still-the-water, rootsong | survival 6 (Pip L6) | no | hr-millrace-ford, mf-islet-ford, eg-brook |
| boulder | break-the-cairn | physical 4 | no | hr-boulder, tw-boulder-chest, fr-offering |
| cold-hearth | kindle, lamplight | attunement 3 (Alondra L3) | no | mossfall-cairn, mosswatch-fire, hindwood-cairn, last-green-coal |
| tally-seal | cut-the-tally, lightfingers | knowledge 4 (Bryn L4) | no | tw-strongbox, mw-ledger-door |
| barred-gate | wardens-writ, name-drop | influence 3 | no | th-stockade, keep-armory-bar |
| darkness | lamplight, kindle | attunement 5 ("Hold my sleeve.") | yes: vision radius 2 | mosswatch-2, heartroot-2 |
| rot-knot | hear-the-rot, rootsong, ichorsight | knowledge 6 | no | h1-rot-knot |
| rope-ledge | harts-sight, bloodtrail | survival 5 | no (kicked down from the Eldergrove side) | hw-rope |
| ichor | mirebreath, hold-the-line, greenwake | attunement 6 | yes: 4% max HP per step, never below 1 | h1-ichor-a, h1-ichor-b |

Each starter opens something from minute one: Hearthbrand opens cold hearths and darkness, Stillwater opens streams, and Cairnmaul opens boulders.

### 3.8 Chests and secrets

- **Contents** are rolled with `createRng('chest:'+seed+':'+id)`. The item level is the map `level` plus 6 × Waking.
- **Opening** is recorded in `flags.opened`.
- **Hidden chests** show when you are within 3 tiles and hold `watchful` or `harts-sight`, or have Survival 3.

| Chest | Lock | Contents |
|---|---|---|
| hr-ditch | — | 30 g, 2 hearth-tonic |
| hr-glade-chest | thornwall | tempered weapon |
| hr-boulder-chest | boulder | 60 g, 2 frost-draught |
| keep-armory | barred-gate | tempered head |
| th-cache | barred-gate | tempered ring |
| tw-strongbox | tally-seal | runed item, 80 g |
| tw-thorn-chest | thornwall | tempered body |
| tw-boulder-chest | boulder | runed ring |
| tw-bramble-cache | bramble | 2 bitterroot, 1 ember-salts |
| mf-bramble-cache | bramble | tempered bow |
| mf-reed-cache | hidden | 120 g |
| mw-ledger | tally-seal | 100 g, runed item; sets `read-ledger` ("ichor, south, to the Fen buyer": the Gloomfen hook) |
| hw-thorn-chest | thornwall | storied (unidentified) |
| fr-offering | boulder | storied amulet |
| eg-brook-chest | stream | runed staff |
| h1-cache | rot-knot | storied item |
| h1-ichor-chest | inside ichor | runed offhand, 100 g |
| h2-roots | hidden | 150 g, 1 ember-salts |

**Secrets:**
- The Tenth Waymarker sign.
- Lookouts (`th-lookout`, `mw-lookout`) with Longwatch set `story['longwatch:<map>']`, which marks that area's chests, locks and holders on the Atlas.

### 3.9 Shops and Temper

- **Shops:** Marta (Keep) and Nell (Thornhollow) sell hearth-tonic, bitterroot, frost-draught and ember-salts at `CONSUMABLES[id].price` (20, 15, 15 and 60).
- **Hilda** moves with the Brands: Thornhollow (0 Brands), then Eldergrove (1), then the Keep (2).
- **Temper:**
  - Cost is `TUNING.temper.base (30) × ceil(ilvl/2) × [1,2,4][temper]` gold. For a relic, use `RELICS[id].ilvl`.
  - The maximum is `TUNING.temper.max = 3`, and each step adds +1 enchant.
  - The metal brightens visibly: +1 adds a glint, +2 lifts the ramp one step, and +3 adds an aspect-coloured edge.

---

## 4. Data formats and APIs

### 4.1 Tiles (`src/data/tiles.js`, WP1)

`LEGEND[char] = { id, solid, over?, anim?, oneWay?, noRoam? }`. Animated tiles have exactly 2 frames.

| Char | Tile |
|---|---|
| `.` | grass |
| `,` | flowers |
| `"` | tall grass (over) |
| `=` | road |
| `:` | flagstone |
| `_` | floor |
| `m` | mud |
| `f` | glow fungus (anim) |
| `r` | roots |
| `k` | dark floor |
| `T` | tree (solid; canopy drawn over the row above) |
| `t` | bush (solid) |
| `Y` | First-Age root (solid) |
| `R` | root wall (solid) |
| `o` | rock (solid) |
| `#` | wall (solid) |
| `H` | roof (solid, over) |
| `\|` | palisade (solid) |
| `*` | torch wall (solid, anim) |
| `~` | water (solid, anim) |
| `w` | ford (anim) |
| `b` | bridge |
| `^` | cliff (solid) |
| `v` | ledge (walkable only when moving south, or in the exit's direction) |
| `+` | door (noRoam) |
| `s` | stair (noRoam) |
| `i` | ichor (anim; its hazard comes from the lock area) |
| `x` | void (solid) |

Locks, gates, crownwalls, darkness and ichor are **entities**, not tiles.

### 4.2 Maps (`src/data/maps/<id>.js`, default export, frozen; WP3)

```js
export default {
  id: 'hearth-road', name: 'The Hearth Road North', region: 'verdant', biome: 'wilds', music: 'road',
  backdrop: 'hearth-road', zone: 'hearth-road', level: 2, travel: true, dark: false,
  lore: [[520, 375, 13, 69], [325, 268, 12, 0]],   // [loreX, loreY, tileX, tileY] pairs; one pair = a point
  w: 26, h: 70, rows: [/* h strings, each exactly w chars */],
  entities: [/* below */],
  exits: [
    { id: 'hr-s', area: [12, 69, 14, 69], to: 'keep', anchor: 'from-road' },
    { id: 'eg-e', area: [29, 8, 29, 9], to: 'hindwood', anchor: 'from-eldergrove', unlock: 'hw-rope' },
    { id: 'keep-se', area: [22, 23, 23, 23], sealed: { region: 'sunscorch', text: '…' } },
  ],
  anchors: { 'from-keep': [13, 67, 'n'], 'v1:hearth-road': [13, 64, 'n'] },
  roam: { max: 3, rects: [[2, 38, 24, 66]] },
};
```

**Entity kinds.** Every entity has an `id`, either `at:[x,y]` or `area:[x0,y0,x1,y1]`, and an optional `if` (presence condition).

| kind | Extra fields | Solid |
|---|---|---|
| `encounter` | `enc` (the id equals `enc`), `mode:'pack'\|'block'\|'lair'`, `face`, `leash?`, `talk?` (dialogue first) | block and lair: yes (while present) |
| `hearthfire` | the id is the hearthfire id; `stand:[x,y,face]`, `cold?` | yes |
| `npc` | `npc`, `face` | yes |
| `gate` | `open` (condition), `look:'gate'\|'chain'\|'door'\|'crownwall'`, `guard?` (encId), `text` | while closed |
| `lock` | `lock` (a LOCKS id) | while locked, unless soft |
| `chest` | `loot:{gold?, bag?, items?:[{rarity, slot?, kind?, ilvl?}], story?}`, `lock?`, `hidden?` | yes |
| `sign` | `text` | yes |
| `board` · `table` | `opens:'bounties'\|'ladder'\|'atlas'` | yes |
| `pedestal` | `relic` | yes |
| `lookout` · `bellframe` | — | yes |
| `prop` | `prop` | optional |
| `trigger` | `on:'enter'\|'step'`, `once?`, `dialogue` | no |
| `light` | `radius` | no |

**Index modules:**
- `data/maps/index.js` exports:
  - `MAPS`, `MAP_IDS`
  - `ENTITY_OF[id] -> {map, entity}` for every encounter and hearthfire
  - `anchor(mapId, name) -> {map, x, y, face} | null`
  - `v1Anchor(nodeId) -> {map, x, y, face} | null`
- `data/world.js` exports: `REGIONS`, `BRAND_TOTAL`, `ZONES`, `HEARTHS`, `START_AT = {map:'keep-hall', x:12, y:6, face:'n'}`, `LORE` (the 17 illustrated-map locations), `CRITICAL_PATH` and `LEADS`.

```js
CRITICAL_PATH = ['hearthstone-keep','keep-vault','hearth-road','waymarker-stones','milestone-fire','bramble-toll','verdant-edge',
  'rotstag-glade','thornhollow','tally-camp','snag-wallow','bramble-deep','den-mouth','briarmaw-den',
  'eldergrove-hearth','tamsin-duel','hr1-grubs','hr1-sapwight','rotwarden-heart'];
LEADS = { mosswatch:['mw-stair','mw-lantern'], mire:['mf-smugglers','mire-shrine'], bell:['hw-glowcaps','gloamwing-hollow'],
  grove:['grove-circle'], roots:['hollowed-patrol','hr1-tappers'], early:['hr-smugglers','poachers-holm'] };
```

### 4.3 Conditions (`rules/cond.js`, WP1)

`check(game, cond) -> boolean`, where `cond` is one of:

- **Flags and encounters:** `{flag}` (`story[flag]` is truthy), `{cleared}`, `{done}`, `{beaten}` (`flags.beaten[id]>0 || cleared || done`)
- **Brands and progress:** `{brand}`, `{brands:n}` (unique count ≥ n), `{waking:n}`, `{level:n}` (party level)
- **Relics and party:** `{owns}` (owned and unshattered), `{power}`, `{wears}` (equipped by an active hero), `{active:heroId}`, `{domain, level}`
- **World state:** `{unlocked}`, `{opened}`, `{kindled}`, `{quest, state}`, `{since:{flag, days}}`
- **Combinators:** `{all:[…]}`, `{any:[…]}`, `{not:c}`

A missing `if` means true. One evaluator drives entity presence, gates, locks, dialogue, quests and shops.

### 4.4 NPCs, dialogue and quests (WP3 data, WP1 runner)

```js
NPCS[id] = { id, name, art, talk: [{ if?, d: dialogueId }] }            // first match wins
DIALOGUE[id] = {
  lines: [[speaker, text]],            // speaker: npc id | 'warden'|'pip'|'bryn'|'alondra' | 'narrator'; text ≤ 140 chars
  do?: [effect],                       // applied once when the node is shown
  choices?: [{ text, if?, next?, do?: [effect],
               check?: { domain|ability, dc, adv?: cond, pass: dialogueId, fail: dialogueId },
               contest?: { checks: [{ domain, dc }], need, pass, fail } }],
};
// effects: {set:flag, value?} {unset} {give:relicId} {item:{rarity, slot?, kind?, ilvl?}} {gold:n} {bag:{id:n}}
//          {unlock:entityId} {heal:true} {fight:encId} {claim:questId} {open:'shop:<id>'|'forge'|'atlas'|'journal'|'ladder'}
//          {letter:brandId} {end:'act1'}
QUESTS[id] = { id, name, kind:'main'|'side', giver, start: cond, steps: [{ text, done: cond, target: { map, entity } }], reward: { gold?, relic?, item?, set? } }
BOUNTIES[id] = { id, enc, name, gold }      SHOPS[id] = { id, name, items: [consumableId] }
LADDER = [{ id, enc?, spawn?, name, silhouette?, act }]      LETTERS[brandId] = { text }
```

**`rules/story.js` (pure):**

```js
talkTo(game, npcId) -> dialogueId | null
dialogueView(game, id) -> { id, lines: [{ speaker, name, text }], choices: [{ i, text, odds: null | { pct, label, hero } }] }
enterDialogue(game, id) -> { game, events }                  // applies node.do once
choose(game, id, i) -> { game, next: dialogueId | null, events, roll: null | { label, dc, total, nat, pass, parts? } }
questLog(game) -> [{ id, name, kind, state: 'active'|'ready'|'done', step: { text, target } }]  // hidden quests omitted
nextObjective(game) -> { text, map, entity } | null
claimQuest(game, id) -> { game, events };  bounties(game) -> [...];  ladder(game) -> [{ id, name, state: 'silhouette'|'scouted'|'settled' }]
```

- A check rolls `d20 + ibFor(domainLevel) + mod(DOMAINS[d].ability score)` for the best active hero, using advantage when `adv` holds.
- The roll comes from `game.rngState`.
- `odds.pct` is computed exactly from the d20 distribution.
- Events are `{t:'fight', enc}`, `{t:'open', screen}`, `{t:'item', item}`, `{t:'gold', n}`, `{t:'letter', id}`, `{t:'end', act}`.

### 4.5 The world engine (`rules/world.js`, WP1: pure, never mutates its inputs)

```js
Walk   = { map, visit, x, y, face, tick, rng /* roam RNG state */, grace, gone: {}, roamers: [Roamer] }
Roamer = { id, enc|null, zone|null, spawns, lead: { family, variant, art, gearTier, count }, x, y, home: [x,y], leash,
           face, mood: 'wander'|'alert'|'chase'|'return'|'flee'|'stunned', wait, weak, trackless }

enterMap(game, { map, anchor } | { map, at: [x,y], face }) -> { game, walk, events }  // visits[map]++, seeds roamers, 'enter' triggers
move(game, walk, dir, { run = false } = {}) -> { game, walk, events }                   // dir 'n'|'e'|'s'|'w'
interact(game, walk) -> { game, walk, events }        // acts on the tile you face
tick(game, walk) -> { game, walk, events }            // idle tick (UI calls it every 400 ms standing still)
commit(game, walk) -> game                            // writes progress.pos; returns the same object if unchanged
present(game, mapId) -> [Entity & { solid, state, glint, grudge, name, lead }]   // WeakMap memo keyed on the game object
canWalk(game, mapId, x, y, { dir, roamer = false } = {}) -> boolean
findPath(game, walk, [x, y], { max = 48, adjacent = false }) -> [[x,y]…] | null     // A*, 4-way
threat(game, encId) -> { level, party, rating: 'easy'|'fair'|'hard'|'deadly', tier, spawns, held: [{ relic?, item? }], wears, grudge }
keys(game) -> { powers: { [powerId]: relicId }, domains: { [domainId]: { level, heroId } } }
lockStatus(game, lockType) -> { open, soft, by, keys: [{ kind: 'power'|'domain', id, label, have, detail }] }
openLock(game, entityId) -> { game, ok, by };  openChest(game, entityId) -> { game, ok, items, gold, bag }
sightEncounter(game, encId) -> game;  light(game, walk) -> 2 | Infinity;  isWeak(game, spawns) -> boolean
```

**What `move` does, in order:**
1. Turns to face `dir`. A turn alone emits `turn` and costs no tick.
2. Checks the target tile against these cases. The first one that matches emits its event, and the steps after it don't run:
   - an exit: `exit` or `sealed`
   - a roamer: `rout` if it is weak, otherwise `contact{by:'player', firstStrike}`
   - a block or lair: `encounter{id}`
   - a closed gate: `gate{id, text, guard}`
   - a hard lock: `lock{id, lock, status}`
   - a chest, NPC or other solid entity: `bump`
   - a solid tile: `bump`
3. If none of those matched, the player steps (`step`).
4. Runs step triggers (`trigger{id, dialogue}`).
5. Sights holders (`sighted{relic, enc}`, which sets codex `sighted` and `scouted`).
6. Applies a soft-ichor hazard (`hazard{pct}`).
7. Ticks the roamers (`alert`, `roam{moves}`, `contact{by:'roamer', ambush}`, `rout`).

**What `interact` emits, depending on what you face:**
- NPC: `talk{npc, dialogue}`
- Sign: `sign{text}`
- Board, table, pedestal, lookout or bellframe: `use{kind, id}`
- Chest: `chest{id, lock?}`
- Lock: `lock`
- Hearthfire: `hearthfire{id}`, or `lock` if it is still cold
- Block or lair: `encounter{id}`
- Encounter with `talk`: `talk`

The UI processes events in order and stops at the first battle-starting event.

**Roamer rules** (numbers live in `TUNING.world`):

| Rule | Behaviour |
|---|---|
| Seeding | On `enterMap`: `createRng('roam:'+seed+':'+map+':'+visits[map])`. <ul><li>Authored `pack` encounters that are not cleared use `spawnsFor`.</li><li>Zone patrols: `rng.int(1, roam.max)` of them. Each draws its set from `PATROLS[zone.sets]` at level `zone.level + rng.int(0,1)` and runs through `escalateSpawn(sp, waking, 'roam:'+map+':'+visit+':'+k+':'+i)`.</li><li>Roamers are placed on a walkable, roamable tile in a roam rect, at least 8 tiles (Chebyshev) from the player and not within 2 of an exit.</li></ul> |
| Roamable | Everywhere except exits, doors and stairs, lock and gate areas, hearth stands, entity tiles, and 1-wide corridors (a walkable tile whose only walkable neighbours are two opposite ones). |
| Weak | `isWeak` requires all of: every spawn is `familyOf(sp).tier==='rabble'`; no spawn has `relic`, `held` or `wears`; and the highest level is ≤ `partyLevel − fleeGap`. `fleeGap` is 3, or 2 with Dawnbell. Weak roamers **flee**: on 4 of every 5 ticks they step to the neighbour farthest from the player, showing a sweat drop. |
| Alert and chase | A non-weak roamer notices you within `sight` 5 (2 in darkness, with line of sight), unless it is all-rabble and you are Trackless. It emits `alert`, then waits `alertWait` 2 ticks (6 with Stillness). It then chases on 2 of every 3 ticks and returns home once it is more than `leash+6` from home. |
| Wander | Moves 1 in 3 ticks, within `leash` (default 4). |
| Contact | <ul><li>A roamer that walks into the player causes an **ambush** if the player's `face` points away from it. The Thornwatch set still cancels this inside `createBattle`.</li><li>A player who walks into a roamer's back gets **First Strike**.</li></ul> |
| Grace and stun | After returning from a battle, `grace = 6` ticks with no contact. A roamer you fled from is `stunned` for 12 ticks. A beaten roamer is added to `gone`. |

Every roamer decision comes from `walk.rng` alone, so a `Walk` is plain JSON and the tests can deep-equal it.

**Threat rating:** `d = maxLevel − partyLevel (+1 if champion)`. `d ≤ −3` is Easy, `≤ 0` Fair, `≤ 3` Hard, otherwise Deadly. The card always shows the word, never colour alone.

### 4.6 Flow (`rules/gauntlet.js`, WP2; the file name is kept for import stability)

Removed: `route`, `currentNode`, `canAdvance`, `advance` and `isCleared`. Everything else:

```js
newGame({ name, starter, seed, base }) -> v2 game   // pos = START_AT, lastHearthfire 'hearthstone-keep', kindled {hearthstone-keep},
                                                    // story.starter = starter; the other v2 flags empty; no progress.node
spawnsFor(game, encId)            // M2 logic plus: level:'party' -> partyLevel+(partyDelta||1); variant/relic '$rival' -> STARTERS[story.starter].rival;
                                  // spawn.lend carried into held; noWaking skips escalation
startBattle(game, { nodeId } | { patrol: { spawns, where, backdrop } }, { ambush = false, firstStrike = false } = {}) -> { game, battle }
resolveBattle(game, battle) -> { game, report }  // report adds: yield, rematch, wokeAt (hfId), brand {…, waking, first}
routPack(game, { nodeId } | { spawns }) -> { game, report: { result: 'rout', xp, gold, drops, consumables, levelUps } }
rest(game, hfId) -> game          // heal, day+1, lastHearthfire, kindled[hfId]
travel(game, hfId) -> game        // needs kindled[hfId]; pos = HEARTHS[hfId] stand
partyLevel(game) -> round(mean level of active heroes);  uniqueBrands(game) -> number
```

**On a win (not a patrol):**
- `cleared[id]=true`, `beaten[id]+=1`, and `done[id]=true` if `once`.
- If the encounter has `opens`, sets `unlocked[opens]=true`.
- Earns the Brand if `brand` is set.

**`earnBrand`:**
- If the Brand is already held, sets `report.rematch=true` and stops.
- Otherwise pushes the Brand and adds 1 to both Waking and `runs`.
- Deletes `cleared[id]` for every `ENCOUNTERS[id].region===BRANDS[b].region && !once`.
- Sets `story['act1-complete']` once every Verdant Brand is held.

**On a wipe:**
- 10% gold loss, 25% lesson XP and a Grudge, as in M2.
- Everyone is healed, `pos = HEARTHS[lastHearthfire]` stand, and `report.wokeAt = lastHearthfire`.
- **Duel defeat:** a yield instead (§3.5). The party is healed to the breather level, and there is no gold loss and no Grudge.

**`routPack`:**
- Builds the foes with `buildFoe`, then pays `gold` in full and `round(xp × TUNING.rout.xp)`.
- Rolls `routSpoils` from `loot.js` using `rngState`.
- Increments `beaten`, and sets `cleared` for an authored `nodeId`.

The battle ctx gets `where`, `backdrop` and `patrol` from the zone, plus `firstStrike` and `warded`.

### 4.7 Engine edits (WP2)

| File | Change |
|---|---|
| `foe.js` | <ul><li>`escalateSpawn` reads `familyOf(spawn).tier`.</li><li>Levels per Waking: `spawn.wakeLevels ?? (tier==='rabble' ? W.rabbleLevels : W.levels)`.</li><li>`spawn.noWaking` returns the spawn unescalated.</li><li>`heldPieces` carries `lend`.</li></ul> |
| `battle.js` | <ul><li>`ctx.firstStrike` adds `TUNING.ribbon.firstStrikeDelay` (40) to every foe's first turn and emits the text "First strike!".</li><li>`ctx.warded` Wards every hero.</li><li>The ctx copies `firstStrike` and `warded`.</li></ul> |
| `loot.js` | <ul><li>A `lend` piece is never claimed and never shatters.</li><li>A worn relic piece drops for any non-rabble tier, not just veterans.</li><li>Export `routSpoils(rng, foeUnits, waking)`.</li></ul> |
| `stats.js` | Enchant `+ (item.temper‖0)`. |
| `party.js` | `temperCost(item)`, `temper(game, uid) -> {game, ok, cost, reason}`, `buy(game, consumableId, n=1) -> {game, ok, reason}` |

### 4.8 Save v2 (WP2)

```js
{ version: 2, migratedFrom?: 1, seed, rngState, party, inventory, bag, gold, codex, settings,     // kept verbatim from v1
  progress: { waking, brands, lastHearthfire, node? /* v1 only: kept verbatim, never read */,
    pos: { map, x, y, face }, act: 1,
    flags: { cleared, done, grudges, day, runs,                                                     // kept verbatim
             story: {}, unlocked: {}, opened: {}, kindled: {}, visits: {}, quests: {}, scouted: {}, seen: {}, worn: {}, beaten: {} } } }
```

**`core/save.js`** (still imports nothing from the game):

| Key | Use |
|---|---|
| `aethermoor.save.v2` | the live save |
| `aethermoor.save.v1` | read only; never written, never removed |
| `aethermoor.save.v2.bak` | backup of the previous v2 save |
| `aethermoor.v1.migrated` | `'1'` once v1 has been carried over or declined |

```js
loadGame(migrate) -> { game, from: 'v2' | 'v1' } | null   // v2 if present; else v1 if present and no marker, migrated in memory (nothing written)
saveGame(game) -> bool          // writes v2 only; if game.migratedFrom === 1, also sets the marker
clearGame()                     // removes v2 only
backupGame() / restoreBackup(migrate) -> game | null;  hasBackup()
hasV1() / readV1() -> object | null;  markMigrated()
exportCode(game) -> 'AETH2.' + b64;  exportV1Code() -> 'AETH1.' + b64 of the untouched v1 | null
importCode(code, migrate) -> game   // accepts AETH1. and AETH2.; scrub(), then migrate(); errors as in M2
```

The M2 build's `importCode` regex (`/^AETH1\./`) already rejects `AETH2.` codes cleanly (verified).

### 4.9 The v1 → v2 migration (`rules/migrate.js`, WP2: exact)

```js
import { GAUNTLET, ENCOUNTERS } from '../data/encounters.js';
import { STARTERS } from '../data/heroes.js';
import { HEARTHS } from '../data/world.js';
import { v1Anchor } from '../data/maps/index.js';

const NEW_FLAGS = ['story', 'unlocked', 'opened', 'kindled', 'visits', 'quests', 'scouted', 'seen', 'worn', 'beaten'];
const V1_STORY = [['met-dael', 'thornhollow'], ['bounty-briarmaw', 'thornhollow']];
const V1_UNLOCKS = [['bramble-toll-chain', 'verdant-edge'], ['tw-thornwall', 'bramble-deep']];

export function starterOf(g) {
  const claimed = Object.keys(STARTERS).filter(id => g.codex?.[id]?.claimed);
  if (claimed.length === 1) return claimed[0];
  const w = g.party.roster.warden, it = g.inventory.find(i => i.uid === w.gear.weapon);
  return STARTERS[it?.base] ? it.base : (claimed[0] || 'hearthbrand');
}

export function migrate(save) {
  if (!save || typeof save !== 'object' || !save.version) throw new Error('Not an Aethermoor save');
  if (!save.party?.roster?.warden || !save.progress?.flags) throw new Error('The save is missing its party or progress');
  const v = structuredClone(save), p = v.progress, f = p.flags;
  for (const k of NEW_FLAGS) if (!f[k] || typeof f[k] !== 'object') f[k] = {};
  if (v.version >= 2) {                                        // v2: only fill what is missing
    if (!p.pos) { const h = HEARTHS[p.lastHearthfire] || HEARTHS['hearthstone-keep']; p.pos = { map: h.map, x: h.x, y: h.y, face: h.face }; }
    p.act ??= 1; f.story.starter ??= starterOf(v); return v;
  }
  const at = Math.max(0, GAUNTLET.indexOf(p.node));
  const looped = (f.runs || 0) > 0 || (p.brands || []).length > 0;
  const reached = id => looped || at >= GAUNTLET.indexOf(id);
  Object.assign(f.story, { starter: starterOf(v), 'm2-save': true, 'intro-done': true });
  for (const [flag, id] of V1_STORY) if (reached(id)) f.story[flag] = true;
  for (const [ent, id] of V1_UNLOCKS) if (reached(id)) f.unlocked[ent] = true;
  for (const id of GAUNTLET) {
    const e = ENCOUNTERS[id];
    if (e.type === 'hearthfire' && reached(id)) f.kindled[id] = true;
    if (e.type === 'fight' && (f.cleared[id] || f.done[id] || (looped && id !== 'keep-vault') || (looped && f.done[id]))) f.beaten[id] = 1;
  }
  if (!HEARTHS[p.lastHearthfire]) p.lastHearthfire = 'hearthstone-keep';
  f.kindled[p.lastHearthfire] = true;
  const a = v1Anchor(p.node) || v1Anchor('hearthstone-keep');
  p.pos = { map: a.map, x: a.x, y: a.y, face: a.face };
  p.act = 1; v.version = 2; v.migratedFrom = 1;
  return v;                         // cleared, done, grudges, day, runs, waking, brands and node are untouched
}
```

**Migration tests** (`test/migrate.test.mjs`, run on every fixture in `test/fixtures/v1/`):
1. These stay deep-equal: `seed`, `rngState`, `party`, `inventory`, `bag`, `gold`, `codex`, `settings`, `waking`, `brands`, `node`, `cleared`, `done`, `grudges`, `day` and `runs`. `lastHearthfire` also stays equal, since all M2 hearthfires exist.
2. `version===2`, `migratedFrom===1`, and `pos` equals `v1Anchor(node)` and `canWalk` is true there.
3. Migrating twice gives a deep-equal result, and the input is not mutated (it is deep-frozen before the call).
4. The Waking-2 fixture keeps `brands.length===2` and `uniqueBrands===1`.
5. The crownwalls are open for loopers and closed for Waking-0 saves. `keep-n-gate` is open exactly when `done['keep-vault']` is set.
6. For every map, `present()` runs without throwing and `spawnsFor` runs for every `ENCOUNTERS` fight.
7. The shattered-Thornsplitter fixture at `bramble-deep` has `tw-thornwall` unlocked.
8. Missing or junk input throws.
9. Save module (with an in-memory `localStorage` shim):
   - `saveGame` never writes the v1 key.
   - `clearGame` keeps v1.
   - `loadGame` ignores v1 once the marker is set.
   - `exportCode` starts with `AETH2.`.
   - `importCode` accepts both prefixes.
   - `exportV1Code` round-trips byte for byte.

---

## 5. Rendering and UI

### 5.1 Art APIs

Art returns `ImageData`, per the art contract. The UI converts each result to a canvas once.

**WP5 (overworld art):**

```js
tileAtlas(biome) -> { img: ImageData, at(tileId, variant, frame) -> [sx, sy], variants(tileId), frames(tileId) }
//   biomes: keep wilds town grove fen tower roots den. Forge + Xf + MAT ramps, compose({ glow: false }), noShadow,
//   ramp steps 1–3 only for ground (sprites keep the full ramp). 2–4 hash variants; 4-bit edge overlays for water/road/cliff.
//   ≤ 150 ms per biome, baked across frames by a generator; cached for the session.
walkerSheet(heroId, gear, { custom }) -> { img, w: 16, h: 24, foot: [8, 23] }   // 3 frames (stand, stepA, stepB) × 4 rows (s, n, e, w; w pre-mirrored)
npcSheet(artKey) -> same shape;  mapFoeSheet(artKey, { gearTier, variant }) -> { img, w, h, foot, frames: 2, rows: 4 }
objectSprite(kind, state) -> ImageData   // chest, hearth lit/cold, gate, chain, crownwall, thornwall, bramble, boulder, ford-ice,
                                         // pedestal lit/unlit, board, sign, bellframe, lookout, rope, deer, ichor
emote(kind) -> ImageData                 // '!', sweat, '?', sparkle
```

- **The walker rig** has its own body parts at 16×24. It maps each gear look to layers:
  - `look.body` and its material onto the torso
  - the cloak
  - headgear by look (hood, kettle, helm, circlet, crown) in its material
  - gloves, boots, an amulet pixel, and the shield on the arm
  - the weapon class silhouette on the back or in hand, in the item's own materials
- Eyes are 2 hand-placed pixels.
- Heirlooms get a 1-px glint, and temper +1 adds a glint too.
- Walkers are cached in their own `lru(96)`, keyed by hero, gear signature and look. They are built lazily, starting with the current direction.
- Humanoid foes and NPCs reuse the rig through `foeLooks` (WP6) and `NPC_LOOKS`.
- Beasts get dedicated sprites with exaggerated silhouettes (16–32 px). Downscaling battle art turns to mud.

**WP6 (battle art):**
- `FOE_ART` for the 10 new families, 7 named identities and `tamsin`, which uses `heroForge` inside `foes.js` as the humanoids already do.
- `foeLooks(key, { gearTier }) -> { H, gear }`.
- `RELIC_ART` for relics 13–24.
- Backdrops: `mossfall`, `mosswatch`, `fawnrest`, `eldergrove`, `heartroot`.
- Temper brightening in `itemArt` / `itemPortrait`.
- **Hour-1 stub:** alias every new key to existing art (smuggler→cutpurse; boglurcher, rotgrub, glowcap→briarling; sapwight, gloamwing, mirelord→rotstag; rotwarden→briarmaw; named variants→their family; tamsin→bandit), so `renderFoe` never throws.

### 5.2 Camera and scale

- One logical canvas in art pixels.
- `s = clamp(round(cssW × DPR / target), 2, 8)`, with `target = (pointer:coarse) ? 192 : 288`. The `mapZoom` setting multiplies it by 0.83 (Near) or 1.17 (Far).
- The backing size is `floor(cssW·DPR/s) × floor(cssH·DPR/s)`. The CSS size is `backing·s/DPR`, centred, with `image-rendering: pixelated`.
- **Results:**
  - A 360 px phone at DPR 3 gets s=6: 180 art px, about 11 tiles across, with walkers at 32×48 CSS px.
  - A 1280×800 laptop (canvas about 880 px wide) gets s=3: about 18×14 tiles.
- The camera eases with a 16×12 px dead zone using `1−e^(−12dt)`. It snaps to whole art pixels and clamps to the map. Small maps are centred on black. Entering a map cuts; it never pans across.

### 5.3 Renderer and budget (WP7)

**Map entry, behind a 200 + 200 ms fade:**
- Bake ground chunks at 256×256 art px. Chunks that contain animated tiles get 2 frame variants.
- Bake a separate overhead chunk set for canopies, roofs and tall-grass tops.
- Precompute the roam and collision masks. Keep the current and previous maps cached.

**Each frame, in order:**
1. At most 6 ground chunks, using the current anim frame, which flips every 300 ms.
2. Y-sorted sprites: props, NPCs, roamers, lairs, and the party of 4.
3. At most 6 overhead chunks.
4. A darkness layer: one cached canvas, redrawn only when the party moves, with pixel-stepped light holes of radius 2 or around light entities.
5. Emotes.

**Budgets:**

| Measure | Budget |
|---|---|
| JS per frame on a mid phone | ≤ 3 ms |
| `drawImage` calls per frame | ≤ 40 |
| Allocations in the steady-state loop | none |
| Frame rate while nothing changes | idle at 10–15 fps (dirty-flag loop) |
| Map entry | ≤ 400 ms |
| Canvas memory | ≤ 24 MB |
| Bundle (today 866 KB) | ≤ 1.25 MB, with the Atlas image ≤ 140 KB; the build fails above 1.3 MB |

- **Movement:** walking is 160 ms per step and running (hold B, X or Shift) is 110 ms. Held directions never stutter at tile edges, and turns are buffered.
- **Lairs** draw `renderFoe` idle at 1× through the battle `foeLook(buildFoe(spawn))`. The relic glint pulses every 2 s. A nameplate shows within 5 tiles ("Old Snag · Lv 6 · Hard"), and a Grudge adds a red title plate and a 1-tile pace.
- **Followers** step into the leader's previous tiles. Only the leader collides.
- **Showoff:** if a hero's gear signature differs from `flags.worn[heroId]`, that hero steps out of line, faces the camera and sparkles for 1.2 s ("Pip wears Hartshorn"). It plays once per change. A missing entry is recorded silently.

### 5.4 Screen and controls (WP7, screen `world`)

**Phone (portrait, 360–430 px), top to bottom:**
1. **HUD, 44 px:**
   - a Menu button (44 px)
   - the place name, with the "Next:" line under it
   - gold
   - the Hearth Clock (8 Brand coals, `uniqueBrands` of them filled, plus the Waking number)
2. **Bust strip, 26 px:** 4 heads with HP and MP bars. A bar pulses under 30%, and tapping it opens Party.
3. **The canvas.**
4. **Control deck, 168 px plus the safe area:**
   - a 20 px prompt line ("A · Talk to Captain Dael", "Thornwall · ✓ Thornsplitter · ✗ Physical 3 (Wren 2)")
   - a 144 px d-pad: one pointer-captured element, dominant axis past a 14 px dead zone with 20% hysteresis, so the thumb can slide to turn
   - A (64 px) and B (52 px) on a GBA diagonal, with a Menu pill

**Deck behaviour:**
- It uses `touch-action:none` and `overscroll-behavior:none`, with no callout or text selection.
- It shows on `(pointer:coarse)` or after the first touch. The `touchControls` setting is Auto, On or Off.
- The A label follows what you face: Talk, Open, Fight, Rest, Cut, Read.

**Taps and holds:**
- Tapping a tile walks there by `findPath` (up to 48 steps). Any pad input cancels the path.
- Tapping an entity walks next to it and interacts.
- Tapping a block or lair opens its pre-fight card.
- **Holding 450 ms** on a lair or block opens `cardPreview(item, {heldBy})` for its relic and calls `sightEncounter`, which stamps Sighted.

**Laptop:**
- The screen keeps its own `keydown`/`keyup` held-set (the latest direction wins). The set clears on `blur`, is removed on unmount, and ignores keys while `overlayOpen()`.
- **Keys:**

  | Keys | Action |
  |---|---|
  | Arrows / WASD | walk |
  | Z / Enter / Space | A |
  | X / Shift | run |
  | Esc / M | menu |
  | J | Journal |
  | 1–4 | dialogue choices |

- `onAction` swallows the arrows, so the page doesn't scroll.
- **Side panel (≥1000 px):** the party, the "Next:" line, and a **Nearby** list of DOM buttons for everything within 5 tiles. This is the keyboard and screen-reader path.

### 5.5 Overlays

All overlays use `openOverlay`, so the M2 focus trap is kept.

**Dialogue:**
- On phones it **replaces the control deck in place**. The ▸ button sits where A was, and B skips.
- On laptops it docks over the bottom of the canvas.
- It shows the speaker's name in the pixel font and 3 lines of 15 px text, typed at 45 chars/s with a per-speaker `blip`. With reduced motion the text appears instantly.
- Choices are 44 px buttons with odds chips ("Influence DC 14 · 65% · Alondra").
- The box has `role="dialog"` and `aria-live="polite"`.

**Pre-fight card:**
- The lead sprite; the foe list (name, level, tier die icon, Omen chips, Grudge title); the threat word and bar ("Hard · Lv 12 vs your 10").
- A button showing the held relic's grey card.
- Buttons: **Fight** (the one `[data-primary]`) and **Not yet**. A duel adds "Losing is a yield."

**Lock prompt:** the lock's name, the keys with ✓/✗ and whose they are, and "Use (Thornsplitter)" or "Not yet". Crownwalls show the story-seal text instead.

**Other overlays:**
- **Hearth menu:** Rest, Travel (the kindled list), Party, Leave.
- **Pause menu:** Party, Codex, Journal, Atlas, Settings, Title.
- **Shop sheet.**
- **Hilda's forge:** pick an item (equipped items first), with a before/after of the card numbers, the cost and a **Temper +1** button.
- **Spoils strip:** "Routed! +34 gold · +21 XP", with item chips that open `cardReveal`.
- **Story overlays:** the Brand banner, then the crownwall sequence (the Atlas image with 3 seals cracking), then the letter. Also the to-be-continued card (Day n, relics x/24, Brands y/8, "The way opens in the next chapter").

**Battle hand-off:**
1. `startBattle`.
2. `ctx.setGame(commit(game, walk))`.
3. `session.pending = {roamerId}`.
4. `music(boss ? 'boss' : 'battle')`.
5. `go('battle', {battle, returnTo:'world'})`.

The aftermath then calls `go('world', {result, brand, wokeAt})`. The world keeps its `Walk` in `ui/world/session.js`:
- **victory:** the roamer is marked `gone`.
- **fled:** the roamer is stunned and grace applies.
- **pos changed** (a wipe or travel): the map is entered fresh.

**Saving:** `setGame` runs on map change, before a battle, after any event that changes the game, every 20 steps, and on `pagehide` / `visibilitychange`. A small ember flickers when it saves.

**Test seam:** when `globalThis.__aethTest` exists, the screen installs `window.__world = { state(), teleport(map,x,y,face), press(key), step(dir,n), interact() }`.

### 5.6 Atlas and Journal (WP8)

**Atlas** (screen `atlas`, params `{mode:'travel'|'view'}`):
- `tools/make-atlas.mjs` launches Chromium (`/opt/pw-browsers`) and pulls the embedded PNG out of `/home/user/New-game/aethermoor-interactive-image-map-polished.html`. It draws it at 960×640 and writes `toDataURL('image/webp', q)` with q stepping from 0.62 down to 0.45 until the result is ≤ 140 KB. The output is `src/ui/assets/atlas-image.js` (`export default 'data:image/webp;base64,…'`), committed to the repo.
- **Views:** "Wilds" (the NW quadrant fills the width, the default on phones) and "Realm".
- **Markers** are 44 px buttons at viewBox coordinates:
  - kindled Hearthfires, which you tap to travel in travel mode
  - known places (dimmed)
  - sighted holders and claimed relics
  - Longwatch marks
  - padlocks on Sandspire (870,470), Ironhold (870,160) and Bogmire (280,530), plus the Hearth Clock
- **"You are here"** projects `pos` onto the map's `lore` pair line, so the pin slides as you walk.
- Phones get a travel list below the map. In dungeons the Atlas is view only.
- If the image fails to load, a procedural parchment with the same markers is shown.

**Journal** (screen `journal`, params `{tab}`): tabs for Quests, Bounties, Ladder and Keys. Ladder posters are `renderFoe` silhouettes tinted black until scouted. The Keys tab shows ✓/✗ for every key and whose Domain counts.

### 5.7 Save UX (WP8)

**Title screen:**
- **With a v2 save:** "Continue", with the sub-line "Wren · Thornhollow · Day 4 · Lv 5 · 9/24 relics".
- **With only a v1 save:** "**Continue from the Gauntlet**". This migrates in memory and shows the carry-over card "The road has become a land":
  - heroes and levels, relics claimed, gold and Waking
  - "You wake at <MAPS[pos.map].name>."
  - for loopers: "The Wilds remember your Wakings. Beating Briarmaw again is a rematch."
  - a "Walk on" button

  Choosing it calls `ctx.adopt(game)`, which holds the game in memory only. The world screen calls `ctx.commitAdopted()` on the **first successful step**, which writes v2 and the marker. If the player closes before moving, nothing is written.
- **New Game** asks for confirmation and writes the `.bak` first. If a v1 save exists, it also sets the marker.
- The title shows an "M3 · Verdant Wilds" tag.

**Settings:**
- **Save code** exports `AETH2.`.
- **Load a code** accepts `AETH1.` or `AETH2.`. It shows the same card, then writes `.bak`, saves and goes to `world`.
- **"Export M2 backup (AETH1)"** and **"Restore my M2 save"** appear while v1 exists. Restore backs up first and shows the card.
- **"Restore previous save"** appears while a `.bak` exists.
- New settings: `touchControls`, `alwaysRun` and `mapZoom`.

### 5.8 Reduced motion, accessibility and audio

- **Reduced motion:** no typewriter, shake, particles or fades; tiles hold on frame 0 and the camera snaps. Walking tweens stay.
- **Accessibility:**
  - The canvas has `role="img"` and is labelled with the place name.
  - An `aria-live` region announces places, the prompt line and dialogue.
  - Danger always comes as a word as well as a colour.
- **Audio** (WP8, `core/audio.js`):
  - New tracks `wilds`, `town` and `dungeon`, which crossfade on map change.
  - New sound effects: `bump`, `alert`, `rout`, `door`, `blip`, `unlock` and `chime`.
  - Add all of these to `TRACKS`/`SFX` and to the e2e allowlist.

---

## 6. Work packages

### 6.0 Ownership rules

- **One owner per file.** A file with no owner is **frozen**: `core/rng.js`, `core/dice.js`, `core/freeze.js`, `rules/ai.js`, `rules/combat.js`, `rules/progression.js`, `rules/util.js`, `art/forge.js`, `art/cache.js`, `art/heroes.js`, `art/hero-looks.js`, and `data/affixes.js`, `aspects.js`, `domains.js`, `names.js`, `rarity.js`, `omens.js`.
- **Change requests** go into your own `game/notes/WPn.md`. Owners read every notes file at each gate. The integrator settles frozen-file needs.
- **Stub first (hour 1):** every package creates its new files with the **final export names and signatures** from this document, returning simple placeholder values. `npm test`, `npm run lint` and `npm run build` must pass with the stubs before real work starts. Consumers code against the shapes in §4 and §5, never against internals.
- **Shared registries:** `main.js`, `app.js`, `package.json` and `build.mjs` belong to WP8. `ARCHITECTURE.md` belongs to WP1. `art/index.js` belongs to WP5, which re-exports WP6's new exports (`foeLooks`) from day one. `data/tuning.js` and `data/encounters.js` belong to WP4. WP4 adds, within the first hour, the `TUNING` keys that other packages read:
  - `waking.rabbleLevels: 2`
  - `ribbon.firstStrikeDelay: 40`
  - `world: { sight: 5, sightDark: 2, sightRelic: 5, sightRelicWatchful: 9, alertWait: 2, alertWaitStill: 6, leash: 4, fleeGap: 3, grace: 6, fleeStun: 12, spawnDistance: 8, hazardPct: 0.04, darkRadius: 2 }`
  - `rout: { xp: 0.5 }`
  - `temper: { max: 3, base: 30, mult: [1, 2, 4] }`

### 6.1 The packages

**WP1 World engine**
- **Owns (new):** `src/rules/world.js`, `src/rules/cond.js`, `src/rules/path.js`, `src/rules/story.js`, `src/data/tiles.js`, `src/data/locks.js`, `test/world.test.mjs`, `test/story.test.mjs`, `test/walk.test.mjs`, `test/fixtures/map-mini.mjs`.
- **Owns (edit):** `ARCHITECTURE.md` (new World, Save v2 and Flow sections).
- **Provides:** §4.1, §4.3, §4.4 (runner), §4.5.
- **Consumes:** `data/maps`, `data/world.js`, `gauntlet.spawnsFor`, `foe.escalateSpawn`, `foe.familyOf`, `foe.buildFoe`.
- **Tests:**
  - collision and one-way ledges
  - exits, and sealed exits with the post-Act text flag
  - two-key locks, with each key alone opening the lock
  - soft darkness and ichor
  - roamer determinism: the same inputs give a deep-equal `Walk`
  - chase you can outrun, flee you can catch, the weak gap, `familyOf` variants never weak, relic-holding packs never Routed
  - ambush and First Strike by facing
  - grace and stun
  - `findPath`; `commit` returns the same object when nothing changed
  - frozen inputs are never mutated
  - the dialogue check odds match the rolled distribution
- **Done when:**
  - All tests pass on `map-mini`, and on the real maps once WP3 lands.
  - `walk.test.mjs` plays from `newGame` to `act1-complete` for all 3 starters using `findPath`, `move`, `interact` and forced wins, and is never stuck.

**WP2 Flow, battle hooks and save**
- **Owns:** `src/rules/gauntlet.js`, `src/rules/migrate.js` (new), `src/rules/foe.js`, `battle.js`, `loot.js`, `stats.js`, `party.js`, `src/core/save.js`, `tools/make-v1-fixtures.mjs` (written in Step 0), `test/gauntlet.test.mjs`, `test/migrate.test.mjs` (new), `test/core.test.mjs`, `test/battle.test.mjs`, `test/loot.test.mjs`, `test/party.test.mjs`, `test/helpers.mjs`, `test/fixtures/v1/*`.
- **Provides:** §4.6–4.9.
- **Tests:**
  - migration (§4.9)
  - rest, travel, wipe to the hearth stand, the duel yield
  - Brand rules: unique Brands only, region re-arm, `act1-complete`, rematch
  - Rout payouts
  - `firstStrike`, `warded`, `lend` never claimed or shattered
  - worn relics dropping for relic-bearers
  - temper cost and effect, and `buy`
  - rabble at +2 and variants at their own tier
  - the M2 spawn arrays deep-equal `test/fixtures/m2-spawns.json`
- **Done when:** the M2 tests that still apply pass unchanged, and every new test passes.

**WP3 World content**
- **Owns:** `src/data/maps/*.js` (14 maps plus `index.js`), `src/data/world.js`, `src/data/npcs.js`, `dialogue.js`, `quests.js`, `shops.js`, `ladder.js`, `letters.js`, `test/maps.test.mjs`, `test/story-data.test.mjs`, `tools/map-draft.mjs` (optional).
- **Delivery order:** `keep-hall` and `hearth-road` first (hour 2), then the rest.
- **Map tests:**
  - every row is `w` characters and every character is in the legend; entities are in bounds
  - exits pair up both ways and land on walkable anchors
  - every `v1:` anchor exists and is walkable
  - every `ENCOUNTERS` fight and hearthfire is placed exactly once
  - every lock type has a power key and a Domain key
  - 5 sealed exits
  - **reachability:** a flood fill reaches each `CRITICAL_PATH` target with only the guaranteed keys, for each of the 3 starters. Guaranteed means Domain levels at the sim's worst-case levels (L1 at the start, L4 at Thornhollow, Warden L5 at the thornwall, L7 at the den, L8 after the Brand), no relics except the starter, crownwalls open only after the Brand, and the Tamsin gate treated as open after a yield. Every chest must be reachable with all keys.
- **Story-data tests:**
  - all conditions parse
  - speakers and encounter, relic and entity ids exist
  - `say` ≤ 140 characters
  - no flag is read that is never set
  - every quest step has a target

**WP4 Foes, relics and balance**
- **Owns:** `src/data/foes.js`, `relics.js`, `encounters.js`, `skills.js`, `heroes.js` (`STARTERS[x].rival`), `tuning.js`, `items.js`, `statuses.js`, `src/rules/autoplay.js`, `test/data.test.mjs`, `tools/sim.mjs`, `docs/RULES.md`.
- **Provides:** §3.2–3.5 as data. New families point at existing art keys until WP6 lands.
- **Tests:**
  - 24 relics, codex numbers 1–24, and every heirloom has a `power` and a `mapPower`
  - each die covers `v.tier || f.tier`
  - the M2 GAUNTLET, spawns and PATROLS are unchanged
  - `BRANDS` carry a region
  - backdrops are valid
- **Owns Gate 4 (balance).**

**WP5 Overworld art**
- **Owns:** `src/art/tiles.js`, `src/art/walkers.js`, `src/art/map-sprites.js`, `src/art/index.js`, `tools/gallery.mjs`, `tools/gallery-entry.js`, `docs/ART.md` (world section).
- **Provides:** §5.1 (WP5 part). The hour-1 stub is flat-colour tiles and box walkers.
- **Done when:**
  - a gallery sheet shows the tilesets, every hero's walker in 3 gear states, NPCs and map foes
  - a node timing script stays within budget
  - a phone art review of `walkers.png` is signed off before the WP7 polish pass

**WP6 Battle art**
- **Owns:** `src/art/foes.js`, `item-looks.js`, `item-art.js`, `recipes.js`, `scenes.js`, `icons.js`.
- **Provides:** §5.1 (WP6 part).
- **Done when:** `renderFoe` works for every key, pose and phase without throwing; Tamsin renders with each of the 3 lent starters; and a gallery snapshot of the M2 heroes and foes is unchanged.

**WP7 World screen**
- **Owns:** `src/ui/screens/world.js`, `src/ui/world/{loop,view,camera,controls,actors,dialogue,hud,sheets,story-fx,session,constants}.js`, `src/ui/world.css` (imported by `world.js`), `tools/e2e-world.mjs`.
- **Provides:** §5.2–5.5.
- **Consumes:** WP1, WP2, WP3, WP5 and card services. It imports `ui/assets/atlas-image.js` (WP8) for the crownwall sequence.
- **Done when:** the e2e-world scenarios (§7) pass at 360×740 and 1280×800, including the performance gate.

**WP8 Shell, menus and build**
- **Owns:** `src/main.js`, `src/ui/app.js`, `src/ui/screens/{title,newgame,aftermath,party,codex,settings,battle,atlas,journal}.js` (`atlas` and `journal` are new; this package deletes `road.js`), `src/ui/screens.css`, `theme.css`, `card.js`, `card.css`, `battle.css`, `src/ui/battle/*`, `src/ui/lib/*`, `src/ui/assets/atlas-image.js`, `src/core/audio.js`, `src/core/input.js`, `tools/make-atlas.mjs`, `tools/build.mjs`, `tools/e2e-flow.mjs`, `tools/e2e-battle.mjs`, `tools/dev-battle*.{mjs,js}`, `package.json`.
- **Delivers:**
  - The registry, with `road` as an alias of `world`.
  - `ctx.adopt` and `ctx.commitAdopted`; `loadGame(migrate)` and `importCode(code, migrate)` injected.
  - Every `go('road')` and every `returnTo` default changed to `'world'`.
  - Aftermath reads `ENCOUNTERS[report.wokeAt]` and passes `{result, brand, wokeAt}`.
  - The battle screen's title uses `ctx.where` before `node.place`.
  - The title from §5.7; `newgame` ends with `go('world', {arrive:'new'})` and "Skip to the Keep".
  - `items.js` enchant at 1:1.
  - Atlas and Journal (§5.6); settings (§5.7); audio (§5.8).
  - The build writes `dist/aethermoor.html`, `dist/aethermoor.artifact.html` and **`dist/aethermoor-m3.html`**, never touches `aethermoor-m2.html`, and fails above 1.3 MB.
- **Done when:** e2e-flow and e2e-battle pass against the world.

---

## 7. Integration and verification

**Step 0: the integrator, before any agent starts.**
1. Copy `dist/aethermoor.html` to `dist/aethermoor-m2.html`.
2. Write and run `tools/make-v1-fixtures.mjs` against the **unmodified** M2 rules, with seed 101 and the starters rotated.
   - **Method:** forced wins (foes at 1 HP, heroes at 500 HP, then `playOut`), resting at each hearthfire, and a JSON save written on arrival at each node.
   - **Output: 18 saves**, each with a `.code.txt` holding its `AETH1.` code:
     - one at each of the 14 nodes (`v1-node-<id>.json`)
     - `v1-after-brand` (W1, at START)
     - `v1-waking2-dupe` (a second Briarmaw win, brands ×2, advanced to `tally-camp`)
     - `v1-grudges` (a wipe and a flee at `bramble-toll`, a flee at `tally-camp`)
     - `v1-shattered` (at `bramble-deep`, with the Thornsplitter item `shattered:true` and codex `claimed:false`, as M2's `claimToCodex` produces)
3. Snapshot `test/fixtures/m2-spawns.json` (the GAUNTLET spawn arrays and PATROLS).

**The gates:**

| Gate | When | What must pass |
|---|---|---|
| 1 | hour 1 | Stubs: `npm test`, `npm run lint` and `npm run build` pass. |
| 2 | — | Units: every node test, including `walk.test.mjs` on the real maps. |
| 3 | — | Build and e2e: `e2e-flow`, `e2e-battle` and `e2e-world` in Chromium at 360×740 and 1280×800, with no console errors and no `[audio]` warnings. |
| 4 | — | Balance (WP4 may edit only `level` fields and TUNING numbers). See below. |
| 5 | — | Performance, bundle size and the migration checklist, then build `dist/aethermoor-m3.html` for delivery. |

A fix pass follows Gate 5.

**e2e-world scenarios:**
1. New game: `keep-intro` plays, the d-pad walks, A talks to Fenwick, the Sneck pre-fight card opens, the fight is forced to a win, the card reveal plays, you return to the world, and the north gate is open.
2. Keyboard walking with WASD, holding to run, and no page scroll.
3. A roaming pack contact starts a battle; after fleeing, the roamer is stunned. A weak pack gives a Rout and the spoils strip.
4. The thornwall lock prompt shows ✓/✗ and opens with a key.
5. Holding 450 ms on Old Snag gives `.ov .card.grey`, and the codex is `sighted`.
6. Rest at the Milestone Fire; Atlas travel to Thornhollow.
7. A forced Briarmaw win, then the Brand banner, the crownwall sequence and the letter; `th-crown-w` is passable.
8. Dialogue replaces the deck on the phone; the Garret contest odds chip is visible.
9. Temper at Hilda raises `temper` to 1 and the card number changes.
10. No horizontal scroll at 360 px; reduced motion works.
11. **Performance:** CDP `Emulation.setCPUThrottlingRate(4)` while walking the Hearth Road with 4 followers and 3 roamers for 10 s. p95 frame time must be under 16 ms, with `drawImage` calls at most 40 per frame (counted through a wrapped context).

**e2e-flow scenarios:**
- title, new game, world
- pause menu to Party, Codex, Journal and Settings, and back to `world`
- wipe, then aftermath, then waking at the hearth stand
- export gives an `AETH2.` code; importing it round-trips
- the title's Continue sub-line

**Balance sim** (`tools/sim.mjs`, driven by `CRITICAL_PATH`, `LEADS` and the flow API, teleporting between fights):

| Mode | Targets |
|---|---|
| `m2` | Waking-0 results within ±3 percentage points of the M2 table in `docs/RULES.md` |
| `direct` | Party L10–12 at the Rotwarden; Rotwarden first-try wipe 30–40%; Tamsin first-try party win 55–70% |
| `leads2` (mosswatch + bell) | Rotwarden first-try wipe ≤ 20% |
| `leads-all` | — |
| `looper-w2` (from the migrated `v1-waking2-dupe`) | Rotwarden first-try wipe ≤ 45% |

Also in every mode:
- Each lead's lair, when taken as the first lead at Waking 1, has a 15–25% first-try wipe.
- Zero runs get stuck.
- **Fallback if `looper-w2` misses:** `TUNING.waking.champCap` clamps authored champion and relic-bearer levels to `partyLevel + 4`.

**Checklist for migrating the player's M2 code:**
1. Open `dist/aethermoor-m3.html` in a fresh profile, go to Settings → Load a code, and paste the `AETH1` code. The carry-over card lists the right heroes, levels, gold, relics and Waking, and names the right waking place.
2. "Walk on" puts you at `v1:<node>` on a walkable tile facing the right way. Equipped gear shows on the walkers.
3. The Codex shows the same Claimed stamps, now out of 24.
4. Existing Grudge titles show on their lairs.
5. The `aethermoor.save.v1` key is byte-identical before and after (the e2e checks this with the `v1-grudges` fixture code).
6. After "Start over", no Gauntlet save comes back, and Settings → Restore my M2 save works.
7. The old `dist/aethermoor-m2.html` still loads its own v1 save untouched.

---

## 8. Risks and cut order

| Risk | Mitigation |
|---|---|
| Walker gear unreadable at 16×24 | A dedicated rig; the WP5 gallery and a phone review before polish; the scale rule gives 32×48 CSS px |
| Phone frame time | Chunk baking with anim variants, a dirty-flag loop with no allocations, and the throttled e2e gate |
| Migrating real saves | Fixtures frozen from M2 code, deep-equal tests, v1 never written, the marker, `.bak`, and a paste e2e |
| Balance after the Brand and for loopers | Crownwalls fix the encounter order; `rabbleLevels` 2; the sim modes, including `looper-w2`, plus the `champCap` fallback |
| Id drift across 8 agents | Frozen ids in this spec; the WP3 and WP4 tests fail on unknown ids; stubs first |
| Breaking M2 battle art | `heroes.js` and `hero-looks.js` frozen; the WP6 snapshot diff |
| iOS touch quirks | `touch-action`, `overscroll-behavior`, pointer capture, and an e2e run at 360 px |
| The bottleneck around the WP2 and WP1 APIs | Hour-1 stubs; `map-mini` so WP1 and WP7 never wait on WP3 |

**Cut first, in this order:**
1. Tap-to-walk (hold-to-inspect stays).
2. The landscape layout and the `mapZoom` setting.
3. The rope-ledge loop: make `hw-w` a plain exit.
4. The showoff: fall back to a toast.
5. The typewriter and blips.
6. Ladder art (use a plain list with names).
7. The second Mosswatch floor: merge Hollis into `mosswatch-1`.
8. Shops (consumables come from drops only, as in M2).
9. Four families become re-tinted variants: glowcap, rotgrub, sapwight and boglurcher.
10. Back-facing walkers (reuse the front view).

**Never cut:**
- the d-pad feel
- visible fleeing packs and the Rout
- gear on the walkers and followers
- the pre-fight card
- the save migration and the v1 key never being written
- Atlas travel
- both bosses and the Tamsin duel
- the sealed exits and the `REGIONS` table (the M4 plug point)