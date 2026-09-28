# M4 spec: the Sunscorch Wastes, the Hearth Codex binder, and Hilda's forge

The contract for milestone 4. Part A holds the integrator's decisions and wins over Part B. The
roadmap row (`docs/DESIGN-BRIEF.md` §13) reads: *Sunscorch, full Codex binder, Hilda's full forge,
Grudges.* M3's contract (`docs/M3-SPEC.md`) still holds wherever this spec is silent.

---

## Part A. Decisions (these win)

| # | Decision |
|---|---|
| A1 | **Every milestone keeps its own file and its own save.** The player's rule: "make new saves instead of overwriting". Shipped in step 0: M4 writes only `aethermoor.save.m4` (+ `.bak`, `aethermoor.m4.started`). The Milestone 3 save (`aethermoor.save.v2`) and the M2 save (`v1`) are read only, offered newest first as carry-overs, and exportable as their own codes. The download is `dist/aethermoor-m4.html`; `dist/aethermoor-m2.html` and `dist/aethermoor-m3.html` are frozen and a test pins their bytes. |
| A2 | **Save version 3.** `rules/migrate.js`: `toV2` (M3's exact §4.9 step), then `toV3` (this spec §4.1), chained by `migrate`. Codes are `AETH3.`; `AETH1.` and `AETH2.` still load. `toV3` only fills what is missing, so it stays idempotent; until M4 ships, packages may add fills to it (no v3 save exists in the wild yet). |
| A3 | **Size limit** (M3 A8 raised for a second region): the build warns above **1.8 MB** and fails above **2.2 MB**. Offline, one file, and still well under what a phone opens instantly. |
| A4 | **Building.** The player has not opted into multi-agent workflows this session, so no Workflow tool: the lead builds P1 and integrates, and individual subagents build P2–P7 with disjoint file ownership (§7). Agents never run git. Each builds into a private folder (`node tools/build.mjs --out /tmp/aeth-<pkg>`) and runs e2e with `AETH_HTML`. |
| A5 | **Ids are fixed by this spec** (§2–§3). A package may add ids only inside its own files; a missing id is asked for in `game/notes/<pkg>.md`, never invented in someone else's file. |
| A6 | **Frozen, as before:** `art/heroes.js`, `art/hero-looks.js`, the card reveal, the M2 encounter and spawn arrays (`test/fixtures/m2-spawns.json`). M3 content changes only where this spec says (§2.4). |
| A7 | **Hilda's full forge is wherever Hilda is** (Thornhollow, then Eldergrove, then the Keep courtyard after two Brands), with every service. The higher tempers need materials that Sunscorch loot provides, which paces them. |

---

## Part B. Build spec

## 1. Scope

**In:**
- **The Sunscorch Wastes:** 10 maps (§2.1), 7 Hearthfires (3 cold), 4 new lock types plus new keys for four M3 locks, 9 foe families (2 of them Champions), 19 encounters, the second Tamsin duel, 14 relics (Codex Nos. 25–38), 5 quests, 4 bounties, 6 Ladder posters, 2 Unsmith letters, 2 shops (one of them gems), the second council scene. The region opens through the Keep's south-east gate after Act I.
- **The Hearth Codex binder:** pages by region (I Verdant, II Sunscorch, III–IV sealed), a permanent party bonus for each finished page, the Awakened stamp, and each relic's Chronicle on the back of its card.
- **Hilda's full forge:** Temper +1 to +10, Reroll one trait, Salvage into materials, Gems in sockets (4 gems), and Awakening (Dormant, Kindled, Awakened through three deeds, branching by the bearer's Domain path).
- **Grudges, fully:** a grudged pack hunts you across its map; beating a Grudge stamps its loot *Grudge settled*; a Journal tab lists Grudges, active and settled.

**Out (later milestones):** Ironspire and Gloomfen (their sealed exits stay), companion recruitment (Luma appears, but joining is M5+), the Signature Masterpiece, sets beyond the Thornwatch Regalia, Table Mode, card PNG export, the Hearthteller.

**Stretch (only if every gate is green):** a Miragewell night variant (lanterns), a desert sandstorm weather pass over the Glass Flats, Hilda's lines naming the gem you set.

## 2. World

### 2.1 Maps

| id | Name | Biome | Size | Zone | Music | Role |
|---|---|---|---|---|---|---|
| `sun-road` | The Sunward Road | desert | 26×64 | `sun-road` | desert | Keep SE gate → Sandspire; the Waystone Fire |
| `sandspire` | Sandspire | desert-town | 30×26 | — | town | the trade city; hub of the region |
| `dust-trail` | The Dust Trail | canyon | 46×24 | `dust-trail` | desert | Sandspire W → Dusthaven; the Wyrm's lair; the aqueduct |
| `dusthaven` | Dusthaven | mine-camp | 24×22 | — | town | the mining camp; the shaft head |
| `deep-shaft-1` | The Deep Shaft | mine (dark) | 24×24 | `deep-shaft` | dungeon | Foreman Brask's crew; stairs down |
| `deep-shaft-2` | The Glass Heart | crystal | 18×18 | — | dungeon | Kharzul the Glass Scorpion |
| `glass-flats` | The Glass Flats | dunes | 52×30 | `glass-flats` | desert | Sandspire E → Miragewell (E) and Scorchgate (S) |
| `miragewell` | Miragewell | oasis | 22×20 | — | town | a side area; the Wisp-Queen |
| `scorchgate` | Scorchgate Ruins | ash | 32×32 | `scorchgate` | wilds | the burned fortress; Tamsin; the Vault door |
| `scorchgate-vaults` | The Scorchgate Vaults | vault (dark) | 24×24 | — | dungeon | the Ashen Warden |

Every map uses the M3 map format (`src/data/maps/index.js`), is registered in `MAPS`, has `region: 'sunscorch'`, and sets `lore` so the Atlas can place "you are here" (§5.4).

One more map joins the Keep: **`keep-gallery`, the Sunscorch Gallery** (18×8), the reliquary's second room, through a door on the Great Hall's east wall (`hall-e`). Codex Page II's 14 pedestals stand in codex order on its rows 2 and 5. (The Great Hall keeps Page I; a new room keeps saved positions in the Hall valid.)

### 2.2 Connections

```
keep (keep-se, gated on act1-complete) ── sun-road ── sandspire ─┬─ dust-trail ── dusthaven ── deep-shaft-1 ── deep-shaft-2
                                                                  └─ glass-flats ─┬─ miragewell
                                                                                  └─ scorchgate ── (vault door) ── scorchgate-vaults
```

Exit ids follow M3's `<map-prefix>-<dir>` habit (`sr-n`, `sr-s`, `ss-w`, …); anchors are `from-<map>`. Stairs and doors inside dungeons are exits with `noRoam` tiles.

**The critical path** (the sim and the walk test follow it; `SUN_PATH` in `data/world.js`):
`waystone`, `sr-toll`, `spire-hearth`, `dt-scorpions`, `dust-cairn`, `pithead`, `ds-crew`, `shaft-lamp`, `kharzul-heart`, `gf-raiders`, `last-watchfire`, `sg-captain`, `tamsin-scorchgate`, `vault-guard`, `ashen-warden`.
**Leads** (`SUN_LEADS`): `caravan: ['gf-caravan']`, `wyrm: ['wyrm-lair']`, `gnash: ['gnash-camp']`, `well: ['wisp-queen']`, `aqueduct: ['dt-aqueduct']`.

No lock stands on the critical path without a key that path itself provides: the Deep Shaft's darkness is soft (M3: you see 2 tiles), and the Vault door's `vault-seal` opens with the Scorchgate Key that `sg-captain` holds (or Knowledge 7).

### 2.3 Layout of each map (what must be there; WP-maps draws the tiles)

- **sun-road:** green scrub at the north end fading to sand. The Waystone Fire (`waystone`) a third of the way down, by a standing stone. `sr-toll`: Rasa the Dune-Rider's toll across the road (block, two tiles wide, with raiders). A side hollow behind a `dune-glass` wall with a chest (`sr-glass-cache`). Zone patrols: sand-skinks and dune raiders. Sign at the gate: "Sandspire, three days by caravan."
- **sandspire:** a mesa city of sandstone and awnings. `spire-hearth` in the market square. Zara al-Khem's caravanserai (NPC `zara`, the empty crate cradle `crate-cradle`, a `sign`). Qasim's Cistern Palace (NPC `qasim` at its door; the cistern is a barred gate `ss-cistern` whose inside holds a chest). Idris the Gemwright's stall (NPC `idris`, shop `idris`). The Sandspire bounty board (`ss-board`, `opens: 'bounties'`). Flavour NPCs `spire-guard`, `water-seller`. A lookout on the mesa edge (`ss-lookout`). Exits north (sun-road), west (dust-trail), east (glass-flats).
- **dust-trail:** a canyon with mine-cart rails. `dust-cairn` (cold). `dt-scorpions` (pack) mid-canyon, `dt-skinks` (pack), `wyrm-lair` (lair: the Sand Wyrm in a sinkhole off the trail, behind `quicksand`), `dt-aqueduct` (block: a glass-scorpion nest choking Sandspire's aqueduct channel; the cistern quest). A `boulder` (M3 lock) on a side ledge with a chest.
- **dusthaven:** tents and timber around a pithead. `pithead` fire. Luma (NPC `luma`) at her assay shed. `miner` flavour NPCs. The Pithead store (NPC `ode`, shop `pithead`). The shaft head is an exit down to `deep-shaft-1`.
- **deep-shaft-1:** timbered tunnels, rails, glowing sunstone veins. `darkness` covers the lower half (soft). `shaft-lamp` (cold Hearthfire). `ds-crew` (block: Foreman Brask's Tallyman diggers). `ds-scorpions` (pack). A `dune-glass` seam with a chest. Stairs down to `deep-shaft-2`.
- **deep-shaft-2:** a cavern of glass. `kharzul-heart` (champion lair, 3×2 area) at the far end. Pedestal-like glass formations as props. The Brand scene plays here.
- **glass-flats:** dune sea. The road east (Miragewell) and south (Scorchgate) must be open; locks guard the rest: `dune-glass` walls (2), a `mirage` wall hiding a shortcut and a chest, a `quicksand` field with a chest. `gf-raiders`, `gf-wisps` (packs), `gf-caravan` (block: the Tallyman caravan with Zara's humming crate), `gnash-camp` (lair: Gnash the Raider-King). No Hearthfire (the waystones either side are enough).
- **miragewell:** a palm oasis, a well in a courtyard. `well-fire`. Sabah the Well-Keeper (NPC `sabah`). `wisp-queen` (lair at the well). A `mirage` wall around the grove's chest. Pilgrim flavour NPC `pilgrim-mw`.
- **scorchgate:** a burned fortress city, ash and fallen gates. `last-watchfire` (cold). Brother Cinder (NPC `cinder`) in a shrine. `sg-wights` (pack), `sg-captain` (block before the Vault door), `tamsin-scorchgate` (duel, in the old parade ground), the Vault door (`sg-vault-door`, lock `vault-seal`) which is the exit down.
- **scorchgate-vaults:** vault halls, dark (soft), ash drifts. `vault-guard` (block), the `ashen-warden` lair in the Vault of Ash. A reliquary alcove chest behind `darkness`.

### 2.4 The M3 maps and data this spec changes

- `keep.js`: the `keep-se` exit becomes `{ id: 'keep-se', area, to: 'sun-road', anchor: 'from-keep', gate: { flag: 'act1-complete' }, sealed: { region: 'sunscorch', text } }`. The engine (P1) walks through it when `gate` holds and falls back to the `sealed` event when it does not.
- `locks.js`: `darkness` gains powers `sunlight`, `crown-of-embers`; `cold-hearth` gains `sunlight`, `heartglow`; `barred-gate` gains `cistern-writ`; `ichor` gains `ash-ward`.
- `world.js`: `REGIONS.sunscorch` gets `brands: ['brand-of-glass', 'brand-of-ash']`, `open: true`; `HEARTHS` gains §2.5; `ZONES` gains §2.6; `LORE.sandspire|dusthaven|miragewell|scorchgate` get their `map`; `SUN_PATH`, `SUN_LEADS` (§2.2).

### 2.5 Hearthfires (7 new; 17 in all)

| id | Map | Name | Cold | Lore (1200×800) |
|---|---|---|---|---|
| `waystone` | sun-road | The Waystone Fire | no | [700, 420] |
| `spire-hearth` | sandspire | The Spire Hearth | no | [870, 470] |
| `dust-cairn` | dust-trail | The Dust Cairn | yes | [830, 520] |
| `pithead` | dusthaven | The Pithead Fire | no | [780, 560] |
| `shaft-lamp` | deep-shaft-1 | The Shaft Lamp | yes | [770, 575] |
| `well-fire` | miragewell | The Well Fire | no | [1010, 540] |
| `last-watchfire` | scorchgate | The Last Watchfire | yes | [930, 660] |

### 2.6 Patrol zones

| Zone | Base level | PATROLS set | Backdrop |
|---|---|---|---|
| `sun-road` | 9 | `sun-road` (skinks, scavengers) | `sun-road` |
| `dust-trail` | 10 | `dust-trail` (skinks, scavengers) | `dust-trail` |
| `deep-shaft` | 11 | `deep-shaft` (smugglers, skinks) | `deep-shaft` |
| `glass-flats` | 11 | `glass-flats` (scavengers, skinks) | `glass-flats` |
| `scorchgate` | 12 | `scorchgate` (scavengers, smugglers) | `scorchgate` |

Levels are Waking-0 levels; the Waking adds the rest (M3 §4.6). WP-foes owns the numbers in Gate 4.

### 2.7 Locks

| Lock | Relic keys (map power ← relic) | Domain key | Soft |
|---|---|---|---|
| `dune-glass` | `melt-glass` ← Cinderfang, `shatter-glass` ← Dunebreaker | Craft 5 | no |
| `mirage` | `see-true` ← the Mirage Glass, `star-reckoning` ← the Orrery of Hours, `mirror-skin` ← the Glass Carapace | Knowledge 5 | no |
| `quicksand` | `sandwalk` ← Sandwalkers, `burrow-sense` ← Wyrmscale | Survival 6 | no |
| `vault-seal` | `ashen-key` ← the Scorchgate Key | Knowledge 7 | no |

Texts: dune-glass "A dune fused to glass by some old fire, still warm to the touch." / "The glass runs like honey and sets again behind you." Mirage: "The road bends away from something that shimmers." / "You walk through the shimmer. It was never there." Quicksand: "The sand here is breathing." / "You find the firm way across." Vault seal: "An ash-black seal across the vault door, older than Scorchgate." / "The seal crumbles. The vault breathes out."

## 3. Content

### 3.1 NPCs

| id | Name | Where | Role |
|---|---|---|---|
| `zara` | Zara al-Khem | sandspire | caravan-mistress; the humming crate (quest) |
| `qasim` | Cistern Lord Qasim | sandspire | lord of the cistern; water quest; a future Council member |
| `idris` | Idris the Gemwright | sandspire | gem shop |
| `spire-guard` | Spire Guard | sandspire | flavour |
| `water-seller` | Water-Seller | sandspire | flavour |
| `luma` | Luma of Dusthaven | dusthaven | assayer, Craft; the sunstone heart (quest); joins in a later milestone |
| `ode` | Old Ode | dusthaven | pithead store |
| `miner` | Miner | dusthaven | flavour |
| `sabah` | Sabah the Well-Keeper | miragewell | the Well of Mirages (quest) |
| `pilgrim-mw` | Pilgrim | miragewell | flavour |
| `cinder` | Brother Cinder | scorchgate | ash-hermit; Scorchgate's history; after the Brand, the Sleeper hint |

Walkers for every NPC are drawn fresh (WP-art-world); `NPCS[id].art` names the look.

### 3.2 Foe families (9 new)

| id | Tier | Kind | Aspect | Notes |
|---|---|---|---|---|
| `sand-skink` | rabble | beast | ember | fast, weak; flees |
| `scavenger` | rabble | humanoid | — | Dune Scavengers: wreck-pickers of the caravan roads; flee (zone patrols are rabble only, as in M3) |
| `dune-raider` | veteran | humanoid | storm | scimitars; *Sand in the Eyes* (blinds); variants `rider` (Rasa), `raider-king` (Gnash) |
| `glass-scorpion` | veteran | beast | stone | *Glass Sting* (pierce + bleed); a carapace that raises Guard; variant `matriarch` |
| `mirage-wisp` | veteran | spirit | frost | blinks (evades), charms; variant `queen` (the Wisp-Queen) |
| `ash-wight` | veteran | undead | ember | drains, sets Burning; variant `captain` |
| `sand-wyrm` | relic-bearer | beast | stone | swallows a hero for a turn; lair only |
| `kharzul` | champion | beast | stone + ember | Kharzul the Glass Scorpion, 3 phases (§3.5) |
| `ashen-warden` | champion | undead | ember | the Ashen Warden, 3 phases (§3.5) |

The Tallymen reuse `tallyman`/`smuggler` with new variants: `foreman` (Brask), `quartermaster` and `sharpshooter` (the caravan). Tamsin reuses `tamsin` (§3.5).

### 3.3 Encounters (19 new; region `sunscorch`)

| id | Map | Mode | Spawns (lead first) | Holds |
|---|---|---|---|---|
| `sr-skinks` | sun-road | pack | sand-skink ×3 | — |
| `sr-toll` | sun-road | block | dune-raider `rider` "Rasa the Dune-Rider", dune-raider ×2 | `sandwalkers` |
| `dt-skinks` | dust-trail | pack | sand-skink ×4 | — |
| `dt-scorpions` | dust-trail | pack | glass-scorpion ×2 | — |
| `dt-aqueduct` | dust-trail | block | glass-scorpion `matriarch`, glass-scorpion ×2 | — (the cistern quest) |
| `wyrm-lair` | dust-trail | lair | sand-wyrm "the Sand Wyrm" | `wyrmscale` |
| `ds-crew` | deep-shaft-1 | block | tallyman `foreman` "Foreman Brask", smuggler ×2 | `sunstone-lantern` |
| `ds-scorpions` | deep-shaft-1 | pack | glass-scorpion ×2, sand-skink | — |
| `kharzul-heart` | deep-shaft-2 | lair, `brand: 'brand-of-glass'` | kharzul | `cinderfang` (held), `glass-carapace` (worn piece) |
| `gf-raiders` | glass-flats | pack | dune-raider ×3 | — |
| `gf-wisps` | glass-flats | pack | mirage-wisp ×2 | — |
| `gf-caravan` | glass-flats | block | tallyman `quartermaster`, smuggler `sharpshooter` "Vell Saltglass", smuggler | `saltglass`; a win sets `crate-found` |
| `gnash-camp` | glass-flats | lair | dune-raider `raider-king` "Gnash the Raider-King", dune-raider ×2 | `dunebreaker` |
| `wisp-queen` | miragewell | lair | mirage-wisp `queen` "the Wisp-Queen", mirage-wisp ×2 | `mirage-glass` |
| `sg-wights` | scorchgate | pack | ash-wight ×3 | — |
| `sg-captain` | scorchgate | block | ash-wight `captain` "the Ash-Captain", ash-wight ×2 | `scorchgate-key` |
| `tamsin-scorchgate` | scorchgate | block, `duel`, `once`, `yields: 'tamsin-yielded-2'`, `talk: 'tamsin-scorchgate'` | tamsin (§3.5) | her starter, lent |
| `vault-guard` | scorchgate-vaults | block | ash-wight ×3 | — |
| `ashen-warden` | scorchgate-vaults | lair, `brand: 'brand-of-ash'` | ashen-warden | `ashen-aegis`, `cinder-crown` (worn pieces) |

Encounter `backdrop` = the map's backdrop (§6.4); the Deep Shaft and the Vaults set `dark: true`.
`BRANDS` gains `brand-of-glass` { from: 'kharzul', region: 'sunscorch', name: 'The Brand of Glass' } and `brand-of-ash` { from: 'ashen-warden', region: 'sunscorch', name: 'The Brand of Ash' }. After both, `earnBrand` sets story flag `sunscorch-complete`.

### 3.4 Relics: Codex Page II (Nos. 25–38)

| No. | id | Name | Slot/kind | Aspect | Holder / source | Map power |
|---|---|---|---|---|---|---|
| 25 | `sandwalkers` | Sandwalkers | feet | storm | Rasa the Dune-Rider (`sr-toll`) | `sandwalk` (quicksand) |
| 26 | `zaras-orrery` | The Orrery of Hours | amulet | storm | quest *The Humming Crate* | `star-reckoning` (mirage) |
| 27 | `wyrmscale` | Wyrmscale | offhand (shield) | stone | the Sand Wyrm (`wyrm-lair`) | `burrow-sense` (quicksand) |
| 28 | `sunstone-lantern` | Sunstone Lantern | offhand (lantern) | ember | Foreman Brask (`ds-crew`) | `sunlight` (darkness, cold hearths) |
| 29 | `glass-carapace` | The Glass Carapace | body (heavy) | stone | Kharzul (worn piece) | `mirror-skin` (mirage) |
| 30 | `dunebreaker` | Dunebreaker | maul | stone | Gnash the Raider-King (`gnash-camp`) | `shatter-glass` (dune-glass) |
| 31 | `cinderfang` | Cinderfang | scimitar (sword) | ember | Kharzul (held in its tail) | `melt-glass` (dune-glass) |
| 32 | `mirage-glass` | The Mirage Glass | amulet | frost | the Wisp-Queen (`wisp-queen`) | `see-true` (mirage) |
| 33 | `qasims-signet` | Qasim's Signet | ring | frost | quest *Water for Sandspire* | `cistern-writ` (barred gates) |
| 34 | `sunstone-heart` | The Sunstone Heart | amulet | ember | quest *Luma's Secret* | `heartglow` (cold hearths) |
| 35 | `scorchgate-key` | The Scorchgate Key | ring | ember | the Ash-Captain (`sg-captain`) | `ashen-key` (vault seals) |
| 36 | `ashen-aegis` | The Ashen Aegis | offhand (shield) | ember | the Ashen Warden (worn piece) | `ash-ward` (ichor) |
| 37 | `cinder-crown` | The Cinder Crown | head | ember | the Ashen Warden (worn piece) | `crown-of-embers` (darkness) |
| 38 | `saltglass` | Saltglass | bow | storm | Vell Saltglass (`gf-caravan`) | `longsight` (holders are Sighted from 4 tiles further) |

Cinderfang follows the design brief's item No. 031: 2d8 slashing + 1d6 ember, +2 DEX, crits on 19–20, acts sooner, 2 sockets; *Glasscutter* (a weapon attack against every foe, each hit sets Burning 1d6); awakens into **Sunmarrow** (the fire spreads) or **Glassline** (always strikes first); lore "Forged in Scorchgate to kill the dragon that burned it. It failed. It has been warm ever since." The rest follow the M3 relic format with a signature power each (heirloom) and a `lore` line; WP-foes writes them and tunes them in Gate 4.

Every relic, old and new, also gets (§4.3, §4.4): `sockets` (0–2; default 1 for heirlooms), `deeds` (three deed ids), and `awaken` (two branches).

### 3.5 Champions and the rival

**Kharzul the Glass Scorpion** (`kharzul`, champion, d20 intents). Holds Cinderfang in its tail (grip), wears the Glass Carapace (a breakable piece with its own grip meter).
- Phase 1 (100%), *The Glass Wakes*: Tail Lash, Glass Sting, **Glasscutter** (charging; needs `cinderfang`; falls back to Tail Lash once it is pried loose).
- Phase 2 (66%), *It Burrows*: burrows for a turn (untargetable, then erupts under a hero for 3d8), Carapace Brace (needs `glass-carapace`; +4 Guard until the next phase).
- Phase 3 (33%), *Glass Storm*: Glass Rain (2d6 pierce to all, Bleeding), Molten Tail (needs `cinderfang`).
Snapping each piece off shuts its moves down, as M3's Rotwarden mask does. Brand of Glass.

**The Ashen Warden** (`ashen-warden`, champion, undead). Wears the Ashen Aegis and the Cinder Crown (both breakable).
- Phase 1, *The Warden Stands*: Ash Blade, **Ward of Ash** (needs `ashen-aegis`: the party's first hit each round is absorbed).
- Phase 2, *The Ash Rises*: calls ash-wights (up to 2), **Command of Cinders** (needs `cinder-crown`: every foe acts twice this round).
- Phase 3, *The Last Watch*: Scorch the Vault (3d8 ember to all), the Watch Unbroken (heals from Burning heroes).
Brand of Ash.

**Tamsin at Scorchgate** (`tamsin-scorchgate`, the second of the seven duels): `S('tamsin', 'party', { partyDelta: 4, gearTier: 4, variant: '$rival', relic: '$rival', lend: true, noWaking: true, name: 'Tamsin' })` with a kindled look (WP-art-battle: the `kindled` gear tier of her sprite). Losing is a yield (`tamsin-yielded-2`). Winning: 150 gold and her line "Scorchgate burned for a sword. Don't let yours make you careless." The duel's intro is `talk: 'tamsin-scorchgate'`.

### 3.6 Quests, bounties, the Ladder, letters

**Quests** (`data/quests.js`, M3 format; the thank-you rule from the M3 review holds: any line that claims a quest also sets its start flag, and a claim needs every step):

| id | Kind | Giver | Start | Steps | Reward |
|---|---|---|---|---|---|
| `sunscorch-waking` | main | isolde | `{ flag: 'act1-complete' }` | Reach Sandspire and speak with Qasim (`met-qasim`); find Luma at Dusthaven (`met-luma`, or the Brand of Glass); take the Brand of Glass; find a way into the Scorchgate Vaults (`unlocked` the vault door, or the Brand of Ash); take the Brand of Ash; come home to the Keep (`council-2-done`) | — |
| `humming-crate` | side | zara | `met-zara` | Find the Tallyman caravan (`crate-found`); bring the crate home (`crate-returned`) | `zaras-orrery` |
| `cistern-water` | side | qasim | `met-qasim` | Clear the aqueduct (`beaten: dt-aqueduct`); tell Qasim (`cistern-told`) | `qasims-signet`, 200 gold |
| `sunstone-heart` | side | luma | `met-luma` | Bring Luma a lantern's worth of sunstone (`owns: sunstone-lantern`); keep her secret (`luma-trusted`) | `sunstone-heart` |
| `well-of-mirages` | side | sabah | `met-sabah` | Quiet the Wisp-Queen (`beaten: wisp-queen`); tell Sabah (`well-told`) | 150 gold, 2 glass pearls |

**Bounties** (Sandspire board; M3 format): `b-skinks` → `dt-skinks` (60 gold), `b-raiders` → `gf-raiders` (90), `b-scorpions` → `ds-scorpions` (90), `b-wights` → `sg-wights` (120).
**Ladder:** eight Act II posters filled in: Rasa, the Sand Wyrm, Foreman Brask, Kharzul, Gnash, the Wisp-Queen, the Ash-Captain, the Ashen Warden (keep the Ladder's silhouettes for Ironspire and Gloomfen).
**Letters:** two Unsmith letters, after the Brand of Glass and the Brand of Ash (`data/letters.js` format).
**Scenes:** arrival lines (`ARRIVALS`) for sandspire, dusthaven, miragewell and scorchgate; `AFTER` lines for both Champions and the Tamsin duel; the **second council** at the Keep: a trigger in `keep-hall` guarded by `{ all: [{ flag: 'sunscorch-complete' }, { not: { flag: 'council-2-done' } }] }` (never `once`: the M3 review rule), whose scene sets `council-2-done`, claims `sunscorch-waking` and ends on a to-be-continued card naming Ironspire and Gloomfen.

### 3.7 Shops, gems and materials

- **Idris the Gemwright** (`idris`): the Dusthaven Sunstone, Moss Agate and Glass Pearl (never the Ash Garnet, which only drops in Scorchgate).
- **The Pithead store** (`ode`): the M3 consumables.
- **Gems** (`data/gems.js`, §4.5): `sunstone`, `moss-agate`, `glass-pearl`, `ash-garnet`.
- **Materials** (`data/tuning.js` `forge`): `scrap`, `silver`, `embers`, from Salvage and from Sunscorch chests and Relic-Bearer spoils.

## 4. Systems (rules, pure; P1)

### 4.1 Save version 3

```js
game.materials = { scrap: 0, silver: 0, embers: 0 }     // salvage and loot
game.gems = { [gemId]: count }                           // the pouch
game.progress.flags.pages = { [pageId]: day }            // finished Codex pages (their bonus is permanent)
game.progress.flags.settled = { [grudgeKey]: day }       // Grudges settled
item.gems = [gemId | null, ...]                          // one entry per socket (M2 items already carry gems: [])
item.chronicle = { felled, mightiest: { name, level } | null, bearers: [heroId] }   // optional
item.deeds = { [deedId]: day }                           // optional; relics only
item.awakened = branchId                                 // optional; relics only
item.rerolls = n                                         // optional
item.provenance.grudge = title                           // optional; "Grudge settled"
```
`toV3` fills the four game fields; item fields stay optional (absent means none).

### 4.2 The forge (`rules/forge.js`)

```
temperCost(item)                 -> { gold, materials } | null   (null at +10, or a shattered relic)
temper(game, uid)                -> { game, ok, cost, reason }
rerollCost(item)                 -> { gold, materials } | null   (non-relic, wrought or better)
reroll(game, uid, affixIndex)    -> { game, ok, cost, reason, before, after }   (seeded by game.rngState)
salvageYield(item)               -> { materials, gems }           (never a relic, never an equipped item)
salvage(game, uid)               -> { game, ok, yield, reason }
socketsOf(item)                  -> n
socketCost(item)                 -> { gold }
socket(game, uid, index, gemId)  -> { game, ok, cost, reason }    (a gem already there goes back to the pouch)
unsocket(game, uid, index)       -> { game, ok, reason }
stageOf(item)                    -> 'dormant' | 'kindled' | 'awakened' | null (null for non-relics)
deedsOf(item)                    -> [{ id, name, text, done }]
awakenOptions(game, uid)         -> { ready, cost, branches: [{ id, name, text, enabled, why }] }
awaken(game, uid, branchId)      -> { game, ok, cost, reason }
```
- **Temper** +1…+10: gold = `base × ceil(ilvl/2) × mult[t]`, `mult = [1, 2, 4, 6, 8, 11, 14, 18, 23, 30]`; +4…+6 also cost 1/2/3 silver, +7…+10 cost 1/2/3/4 embers. Each step is +1 enchant (M3 D10). M3's `rules/party.js` `temper`/`temperCost` become thin wrappers over `forge.js`.
- **Reroll**: one affix, replaced by a new affix eligible for the slot and rarity, never one whose `group` is already on the item, rolled fresh (quality stars included). Gold `40 × ceil(ilvl/2) × (1 + rerolls)`, plus 1 scrap (wrought, tempered) or 1 silver (runed, storied).
- **Salvage**: worn → 1 scrap; wrought → 2 scrap; tempered → 1 silver + 1 scrap; runed → 2 silver; storied → 1 embers + 1 silver; socketed gems come back.
- **Sockets**: runed 1, storied 1, heirloom and regalia relics from their data (`sockets`, default 1), everything else 0. Socket cost `20 × ceil(ilvl/2)` gold.

### 4.3 Deeds and Awakening

`data/deeds.js` `DEEDS[id] = { id, name, text }` with exactly these ids:

| id | Done when (checked in `resolveBattle`, the relic equipped on an active hero, unless it says otherwise) |
|---|---|
| `first-blood` | a won fight |
| `fell-holder` | a won fight against a Relic-Bearer or a named holder |
| `fell-champion` | a won fight against a Champion |
| `legend-strike` | its bearer rolls a natural 20 |
| `surge` | its Legend Surge fires |
| `claim` | a relic is pried loose in a fight it is in |
| `rout` | a pack is Routed while it is equipped (the Rout path, not a battle) |
| `settle` | a Grudge is settled |
| `brand` | a Brand is earned |
| `hundred` | its Chronicle reaches 50 foes felled |
| `untouched` | a won fight at Waking 2+ in which no hero was knocked out |

- **Stages:** Dormant (no deed), **Kindled** (1–2 deeds: +1 to hit on weapons, +1 Guard on armour and shields, +5 max HP on jewels), **Awakened** (all 3 deeds, then Hilda's rite: 2 embers + `150 × ceil(ilvl/2)` gold).
- **Branches:** `awaken: { a: { name, text, stats, power? }, b: { … } }`. Branch **a** (the Hand) is open when the bearer's best Domain is physical, combat, survival or beastmastery; branch **b** (the Heart) when it is craft, knowledge, influence, attunement or psionics. The forge shows both; the one the bearer's path does not lead to says whose path would ("Equip it on someone whose path is the Heart"). An awakened relic: its branch stats apply on top, its Legend Surge gains `power` changes if given, `codex[id].awakened = true`, and its card is repainted (§6.3).
- Hand-named branches for the three starters, Cinderfang (Sunmarrow / Glassline) and the Champions' pieces; templated names are fine for the rest ("Tallyknife, Awakened: the Quick Hand").

### 4.4 The Codex binder

`data/codex.js` `PAGES`:

| Page | Region | Relics | Reward when every relic on it is Claimed |
|---|---|---|---|
| I | verdant | Nos. 1–24 | *The Verdant Oath*: +5% max HP for every hero |
| II | sunscorch | Nos. 25–38 | *The Sunscorch Compact*: +1 to hit and 10% ember resist for every hero |
| III | ironspire | sealed | — |
| IV | gloomfen | sealed | — |

`pagesDone(game)`, `pageBonus(game)` in `rules/codex.js`; `resolveBattle` and the claim paths set `flags.pages[id] = day` the moment a page completes (the aftermath shows a banner). `pageBonus` stats reach every hero through the stats pipeline (`deriveHero(hero, inventory, extra)`; P1 threads `extra` through battle setup and the Party screen).

**The Chronicle:** `resolveBattle` credits each foe knocked out to the hero who struck it: that hero's weapon (and every relic they wear) gets `felled += 1` and `mightiest` when the foe's level beats the record. Equipping adds the hero to `bearers`.

### 4.5 Gems (`data/gems.js`)

| id | Name | Region | In a weapon | In anything else |
|---|---|---|---|---|
| `sunstone` | Dusthaven Sunstone | sunscorch | `extraDice` 2, ember (+1d4 ember on a hit) | `resist` ember 10 |
| `moss-agate` | Moss Agate | verdant | `vsHurt` 1 | `regen` 1 |
| `glass-pearl` | Glass Pearl | sunscorch | `hit` 1 | `mp` 4 |
| `ash-garnet` | Ash Garnet | sunscorch | `crit` 1 | `hp` 6 |

Prices at Idris: 90 / 70 / 110 gold. Gem stats join the item's stats in `rules/stats.js`.

### 4.6 Grudges

- **Hunters:** a `pack` encounter with an unsettled Grudge seeds as a hunter: `sight + 3`, never weak (it never flees), its chase ignores the leash until you leave the map, and its "!" is red. Lairs and blocks keep M3's title plate and one-tile pace.
- **Settled:** winning a fight against a Grudge sets `flags.settled[key] = day`, stamps every item from that fight with `provenance.grudge` (the card shows **Grudge settled**), and counts as the `settle` deed.
- The Journal's **Grudges** tab lists the unsettled ones (name, title, where, Omens) and the settled ones (day).

### 4.7 World engine additions (`rules/world.js`)

- Exit `gate`: an exit with `gate` walks through when `check(game, gate)` holds; otherwise it raises its `sealed` event, whose `nextChapter` is true for the Sunscorch gate once Act I is done.
- Hunters (§4.6) in `seedRoamers` / `tickRoamers`.
- Map powers from §3.4 feed `keys(game)` like M3's. `longsight` widens the Sighted range by 4.

## 5. UI

### 5.1 Hilda's forge sheet (`openForge`)

Tabs **Temper · Reroll · Salvage · Gems · Awaken** across the top (44 px each, scrolling on a phone). A strip under them shows the purse and the pouch (gold, scrap, silver, embers, gems). Each tab lists the eligible items (card thumbnails with name, rarity and bearer), and the selected item's card preview shows the before and after with the cost. Rules:
- Temper shows the flames (+1…+10) and says which materials the next step needs.
- Reroll lets you tap one trait row; the new trait slides in with its quality stars.
- Salvage asks once per item and lists what comes back.
- Gems shows each socket; tap a socket, then a gem from the pouch.
- Awaken shows the three deed pips, then both branches (name, text, enabled or whose path would open it), then the rite.

### 5.2 The Codex binder (`ui/screens/codex.js`)

Page tabs **I · II · III · IV** (sealed pages show a padlock and the region's name). Each page shows its progress ("9 of 14 claimed, 12 sighted"), its reward line (greyed until earned, then gold), and its pockets with the three stamps. Awakened pockets glow. The footer keeps M3's stamp legend.

### 5.3 The card (`ui/card.js`)

- A **socket row** (gem icons in their colours, empty sockets as dark rings).
- **Temper flames** up to 10 (two rows of five on a phone).
- **Deed pips** (three) and the stage line ("Kindled · 2 of 3 deeds", "Awakened · Sunmarrow").
- A **Chronicle** button flips the card: foes felled, the mightiest kill, everyone who has carried it, the provenance ribbon ("Pried from Kharzul the Glass Scorpion · the Glass Heart · Day 19"), and the **Grudge settled** stamp when there is one.
- The card reveal itself stays frozen (A6); the additions live below the portrait.

### 5.4 Journal, Atlas, title, music

- Journal: a fifth tab, **Grudges** (§4.6).
- Atlas: the Sunscorch Hearthfires (§2.5) and places on the Wilds view; "you are here" for the new maps (their `lore`); travel to kindled Sunscorch fires; the region's padlock comes off once `act1-complete`.
- Title: `M4 · Sunscorch` (done in step 0).
- Music: a `desert` track (`core/audio.js` synth, like M3's tracks): a slow modal melody over a drone and hand-drum pattern.

## 6. Art

### 6.1 Overworld (WP-art-world)
- **Tiles:** atlases for the new biomes (`desert`, `desert-town`, `canyon`, `mine`, `crystal`, `dunes`, `oasis`, `ash`, `vault`); the same map characters, redrawn per biome (sand, dunes, scrub, palms for `T`, sandstone for `#`, awnings for `H`, oasis and cistern water for `~`, rails and timber in the mine, glass in the crystal cave, ash and embers in Scorchgate). Lock looks for `dune-glass`, `mirage`, `quicksand`, `vault-seal`.
- **Walkers** for the §3.1 NPCs.
- **Map sprites:** roamers for sand-skink, scavenger, dune-raider, glass-scorpion, mirage-wisp, ash-wight; lairs for the Sand Wyrm, Gnash, the Wisp-Queen, Kharzul and the Ashen Warden.

### 6.2 Battle (WP-art-battle)
- Foe art for the 9 families with their variants and two gear tiers; Kharzul with Cinderfang in its tail and the carapace plates (each piece disappears when snapped off); the Ashen Warden with the aegis and the crown.
- Backdrops: `sun-road`, `sandspire`, `dust-trail`, `deep-shaft`, `glass-heart`, `glass-flats`, `miragewell`, `scorchgate`, `scorchgate-vaults`.

### 6.3 Items and icons (WP-art-battle)
- Card and sprite art for the 14 new relics (`RELIC_ART`).
- **Awakened looks:** a Kindled relic gets a faint ember rim; an Awakened one a repaint (its branch's palette) and ember motes, on the card and the sprite.
- **Gems in sockets**, visible on the card portrait and the sprite.
- **Temper to +10:** the metal brightens each step, glows from +7, and wears a white flame at +10.
- **Icons:** the four lock types, the four gems, the three materials.

## 7. Work packages

| Pkg | Owner | Files (owns) |
|---|---|---|
| P1 rules | lead | `rules/migrate.js`, `rules/forge.js` (new), `rules/codex.js` (new), `rules/gauntlet.js`, `rules/stats.js`, `rules/party.js`, `rules/world.js`, `data/deeds.js` (new), `data/codex.js` (new), `data/gems.js` (new), `data/tuning.js`, `data/encounters.js` (BRANDS only), their tests |
| P2 maps | agent | `data/maps/{10 new}.js`, `data/maps/index.js`, `data/maps/keep.js` (the `keep-se` exit only), `data/tiles.js`, `data/locks.js`, `data/world.js`, `test/maps.test.mjs`, `test/walk.test.mjs` (Sunscorch path), `tools/map-draft.mjs` |
| P3 story | agent | `data/npcs.js`, `data/dialogue.js`, `data/quests.js`, `data/ladder.js`, `data/letters.js`, `data/shops.js`, `data/maps/keep-hall.js` (the council-2 trigger only), `test/story*.test.mjs` |
| P4 foes and relics | agent | `data/foes.js`, `data/encounters.js` (not BRANDS), `data/relics.js`, `data/omens.js`, `data/items.js` (if needed), `tools/sim.mjs`, `docs/RULES.md`, `test/data.test.mjs`, `test/loot.test.mjs`, `test/battle.test.mjs` (new cases) |
| P5 overworld art | agent | `art/tiles.js`, `art/walkers.js`, `art/map-sprites.js`, `tools/gallery*.{mjs,js}` |
| P6 battle and item art | agent | `art/foes.js`, `art/scenes.js`, `art/recipes.js`, `art/item-looks.js`, `art/item-art.js`, `art/icons.js`, `art/index.js` |
| P7 UI | agent | `ui/world/sheets.js` (forge), `ui/screens/codex.js`, `ui/card.js`, `ui/lib/items.js`, `ui/screens/journal.js`, `ui/screens/atlas.js`, `ui/screens/party.js`, `core/audio.js` (the desert track), `ui/*.css`, `tools/e2e-flow.mjs` (forge and codex steps), `tools/e2e-world.mjs` (Sunscorch scenarios) |

Order: P1–P5 in parallel from the scaffold, P6–P7 next (they need the relic and foe data), then integrate, tune, review and deliver. Each package writes `game/notes/<pkg>.md` (what it did, what it needs, what it could not do).

## 8. Verification

- **Unit** (node): forge (every cost, each error, reroll determinism, salvage yields, sockets, stages, branches), deeds and the Chronicle through `resolveBattle`, page completion and `pageBonus`, `toV3` on every fixture, hunters, the exit gate, maps (every Sunscorch map reachable from `keep-se` once Act I is done; every entity reachable or behind a lock with two keys), the walk bot through `SUN_PATH` from an Act-I-complete save, story data (conditions parse; every flag read is set; the council-2 trigger is flag-guarded), relics (Nos. 25–38 each with a holder or quest and a map power that keys a lock or has a stated use; every relic has `deeds` and `awaken`), locks (every power resolves to a relic).
- **e2e-world** new scenarios: 12 the Keep's south-east gate (sealed before Act I; open after, into the Sunward Road); 13 Sandspire (the Spire Hearth, Idris's shop, the board); 14 a dune-glass wall opened with Cinderfang, and a mirage with the Knowledge key; 15 Kharzul's pre-fight card (the Brand, the pieces, Cinderfang glinting); 16 the Deep Shaft's darkness lit by the Sunstone Lantern; 17 performance on the Glass Flats (the biggest map).
- **e2e-flow** new steps: the forge (temper to +4 with silver, reroll a trait, salvage, set a gem, awaken a ready relic), the Codex pages (Page I reward shows after a forced full claim), the Grudges tab.
- **e2e-battle** new scenarios: Kharzul through three phases with Cinderfang pried loose; the Ashen Warden with both pieces snapped.
- **e2e-codes**: every M2 code, plus an M3 (AETH2) code, carries over.
- **Balance** (`tools/sim.mjs --modes sunscorch,sunscorch-forged`): from the M3 `direct` run's end state (the party that just beat the Rotwarden): Kharzul first-try wipe 30–40%; the Ashen Warden 30–40%; Tamsin at Scorchgate party win 55–70%; each lead's lair taken first 15–25%; zero stuck runs. `sunscorch-forged` (weapons tempered to +4, one gem each): both Champions ≤ 20%.
- **Performance:** the Glass Flats walk at 4× throttle: p95 frame JS ≤ 16 ms, ≤ 40 `drawImage` per frame, idle 10–15 fps.
- **Size:** under 2.2 MB (A3).

## 9. Risks and cut order

| Risk | Plan |
|---|---|
| The bundle grows past the limit | Art tables first (share palettes and rigs across the new foes); then full minification (`--minify` saved about 10% in M3) |
| Balance at Waking 2–3 (the Waking adds 12–18 levels) | Tune base levels low; the sim finds them; `TUNING.waking.champCap` is the fallback (M3) |
| Awakening content for 38 relics is a lot of writing | Templated branches for the non-Champion relics (A6-style: data, not art) |
| Agents run out of usage mid-package | Small packages, notes files, and stubs that keep every test green |

**Cut order** if time runs short (last first): the Miragewell stretch; `saltglass`'s `longsight`; the Grudge hunters (keep the settled stamp and the tab); Reroll; the Chronicle's `mightiest` (keep `felled` and `bearers`).
