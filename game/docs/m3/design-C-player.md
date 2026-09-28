# M3 "The Verdant Wilds": a walkable map (player experience, phone first)

## 1. Vision

The fixed road becomes 14 hand-built maps. All four heroes walk them in a line, and each one wears what you equipped: Pip's hood, the kettle helm, the Thornsplitter on your back.

- **Every fight is visible.** Packs wander and chase. Relic-Bearers wait with the prize glinting, and press-and-hold shows its grey card. Rabble you have outgrown run away, and catching them is an instant Rout.
- **The first hour is the M2 route, as real places.**
- **Briarmaw's death drops the crownwalls.** Three leads then open in any order, and each one arms you against the Rotwarden.
- **Every other obstacle has two keys.** The Keep's other gates are visibly barred toward Sunscorch, Ironspire and Gloomfen.
- **The illustrated lore map is fast travel.**
- **Every 15–30 minute session ends at a Hearthfire**, and a pasted M2 save wakes where it left off.

## 2. World layout

Tiles are 16 px, and coordinates are in tiles. The atlas column uses the lore map's viewBox (1200×800).

| id | size | atlas | contents |
|---|---|---|---|
| `keep` (town) | 30×24 | 540,390 | Hall door (15,5); N gate (15,0); sealed gates E (29,12) Ironspire, SE (24,23) Sunscorch, SW (5,23) Gloomfen; Marta (20,14) |
| `keep-hall` | 22×14 | 540,385 | Eternal Hearth (11,3); Fenwick, Isolde; reliquary wing with 24 pedestals (lit when claimed) and the vault door (17,7); War Room with the Ladder (2,2) and a war table that opens the Atlas |
| `hearth-road` (route) | 26×70 | line 520,375→325,268 | Road (13,69)→(12,0); millrace x19–20; Poacher's Holm islet x21–25 y44–56; Smugglers' Hollow x0–6 y24–36; Rot-Stag glade x16–24 y8–20 |
| `thornhollow` (town) | 24×22 | 310,260 | Hearthfire (12,11); Dael (7,6); bounty board (9,5); Hilda's wagon (18,15); lookout (3,3); gates S, N, W\*, NE\* |
| `thornway` (route) | 30×56 | line 305,250→215,172 | Tally camp (5,44); Snag's wallow (24,34); thornwall at y26; Bramble-Deep (15,20); Last Coals (22,8); den door (26,4); N exit\* |
| `briarmaw-den` | 16×18 | 262,205 | Briarmaw's lair (8,5) |
| `mossfall` (route) | 52×22 | line 298,262→150,280 | Marsh edge; cold `mossfall-cairn` (30,6); Mire Shrine islet (40,17); tower door (3,8); sealed S exit (20,21), the Blackwater crossing |
| `mosswatch-1` / `-2` | 14×16, 12×12 | 140,280 | Garret; stair fight; Tally-sealed ledger room; top floor with Hollis's lair, cold `mosswatch-fire` and a lookout |
| `hindwood` (route) | 32×40 | line 320,252→365,180 | Gloamwing's hollow (22,12); cold `hindwood-cairn` (10,24); N exit to Fawnrest; W exit (0,8) past a rope-ledge |
| `fawnrest` (side) | 22×20 | 370,170 | Dreaming Stone Hearthfire (11,5); empty bell-frame (7,6); Brother Ivo; Vesper's stall |
| `eldergrove` (town) | 30×26 | 200,160 | Hearthfire (13,14); Miravel; Nan Aldercott; Hilda after Brand 1; Grove circle (3,6); Eldest Tree door (15,2), guarded by Tamsin |
| `heartroot-1` / `-2` | 24×24, 18×16 | 192,152 | Ichor pools; cold `last-green-coal` (4,20); the dark Heart Chamber with the Rotwarden's lair (9,5) and the Eldest Rings wall |

\* A crownwall. It disappears once `brands` includes `brand-of-briars`.

**Scale.** The maps total about 10,000 tiles. Each route is a 10–20 s straight walk, so they are dense rather than long. The Hearth Road runs vertically because a portrait phone scrolls best north to south.

**Music.** Towns play `town`, routes `wilds`, dungeons `dungeon`, the Hearth Road `road`, and the Hall and Fawnrest `hearth`.

**Connections:**
- keep-hall ⇄ keep, then N to hearth-road, then N to thornhollow.
- From Thornhollow:
  - N to thornway, then through the den door to briarmaw-den;
  - W\* to mossfall, then mosswatch 1 → 2;
  - NE\* to hindwood, then fawnrest.
- thornway N\* leads to eldergrove.
- eldergrove E ⇄ hindwood W is the rope-ledge loop.
- The Eldest Tree in eldergrove leads to heartroot 1 → 2.

**M2 encounters keep their ids and spawn order**, so grudges, echo salts and `cleared` still work. "Arrive" is where a v1 save lands.

| M2 id | placement · mode | arrive |
|---|---|---|
| hearthstone-keep | keep-hall (11,3) · hearth | keep-hall (11,5) ↑ |
| keep-vault | keep-hall (17,7), Sneck · block, once | (15,7) → |
| hearth-road / waymarker-stones | hearth-road (12,60) / (9,50) · packs | (13,64) / (12,54) ↑ |
| milestone-fire | (15,42) · hearth | (15,43) ↑ |
| bramble-toll | (11–13,32), a chain across the road · block | (12,35) ↑ |
| verdant-edge | (13,22) · pack | (13,26) ↑ |
| rotstag-glade | (20,13) · lair, optional | (18,17) → |
| thornhollow | thornhollow (12,11) · hearth | (12,12) ↑ |
| tally-camp | thornway (5,44) · block, optional | (8,46) ← |
| snag-wallow | (24,34) · lair | (21,36) → |
| bramble-deep | (15,20) · block | (15,23) ↑ |
| den-mouth | (22,8) · hearth | (22,9) ↑ |
| briarmaw-den | den (8,5) · lair | (8,14) ↑ |

**Guided start, then open.** Each step is about one phone session.

1. **0:00–0:25.**
   - The prologue ends inside the Hall: Sneck at the vault door, the Seal reveal, then Isolde's commission.
   - The Hearth Road teaches packs, the Milestone Fire and Skarn's chain.
   - The Rot-Stag grazes in view. Across the millrace, Haskett reads "Lv 10 · Deadly": an optional hard area you can see early. Stillwater starters can cross at once.
2. **0:25–1:00.**
   - Dael's board sends you up the Thornway.
   - The first two-key lock is the thornwall: beat Old Snag beside it, or reach Warden L5 (Physical 3).
   - Then Bramble-Deep, the Last Coals, and **Briarmaw**.
   - The Brand plays with **no teleport**. Then the crownwall sequence plays: the illustrated map fills the screen and three thorn seals crack over Mossfall, the Hindwood and Eldergrove (3 s, skippable).
3. **1:00–1:40.** Three leads, in any order. Each pays a counter to the blight boss, because tide and radiant beat blight:
   - **Mossfall/Mosswatch:** Hollis, the Mire Pearl.
   - **Hindwood/Fawnrest:** the Gloamwing, the Dawnbell, the *Forewarned* dream.
   - **The Grove:** Oda, Rootsong.

   Back on the old roads, rabble now **flee**.
4. **1:40–2:00.**
   - Tamsin's duel at the Eldest Tree, then the Heartroot, then the **Rotwarden**: Brand 2 and Waking 2.
   - "Come home" plays the Council scene and the Unsmith's letter.
   - A to-be-continued card shows playtime, relics x/24 and Brands 2/8. Free roam continues after it.

**Sealed exits** are `exit{sealed:{region,text}}` entities: a barred gate, a region banner and a guard. The guards say:
- "Rockslide on the Stormwatch pass."
- "The dune-glass walls are still too hot to cross."
- "Blackwater's over the causeway."

M4 adds its maps and swaps `sealed` for `gate:'<cond>'`, with no engine change.

## 3. Content

### NPCs

| NPC | where | line |
|---|---|---|
| Fenwick | Hall | "It burned blue. Find out why, and don't tell the Council I asked." |
| Tamsin Vale | Hall, Eldest Tree | "Isolde sent me in first. You can watch. Or try." |
| Captain Dael | Thornhollow | "Thirty names on the Thornwatch roll when I took it. Nine now." |
| Hilda Ironvein | wagon | "Hold still. Not you. The blade." |
| Old Garret | Mosswatch | "Ghosts don't leave bootprints in the porridge." |
| Hollis, Signal-Master | Mosswatch top | "Three short, one long. The Fen always answers." |
| Elder Miravel | Eldergrove | "Keep folk come for timber and advice. They never take the advice." |
| Oda the Thornmother | Grove | "The Rot is the forest forgetting. I'm teaching it faster." |
| Vesper (a Tallyman) | Fawnrest | "Miracle sap. Cures rot, rheum and regret." |
| Haskett | Poacher's Holm | "Last white hart in the Wilds, and I shot it." |
| Mags Kestrel | Smugglers' Hollow | "Everything's for sale, love. Including the trail." |
| The Rotwarden | Heartroot | Masked: "GREEN WAS A MISTAKE." Unmasked: "I held the root nine hundred years. Hold it now." |

Isolde, Marta, Nan Aldercott, Brother Ivo and Corra also appear.
- Companions speak the first time they enter their home.
- About 10 lines react to your gear through `if:'wears:<relic>'` ("Is that Snag's hatchet?").
- Tamsin is "her", matching `newgame.js:292`.

### Foe families (18)

The 8 existing families:
- rabble: cutpurse, briarling, thornhound
- veteran: bandit, tallyman
- relic-bearer: rotstag, oldsnag
- champion: briarmaw

The 10 new ones are below. "@W1" is the level you meet them at. Data stores the base level: @W1 − 6 for most tiers, or @W1 − `rabbleLevels` for rabble.

| new | tier | aspect | @W1 | map token | signature move |
|---|---|---|---|---|---|
| smuggler | rabble | — | 9 | walker | Caltrops (all foes, DEX save or Rooted) |
| boglurcher | rabble | tide | 9 | 24×16 | Drag Under |
| glowcap | rabble | verdant | 9 | 16×16 | Spore Puff (CON save or Poisoned) |
| rotgrub | rabble | blight | 10 | 16×12 | Ichor Spit |
| mossback | veteran | stone | 10 | 24×20 | Shell Up |
| feral-druid | veteran | verdant | 10 | walker | Call the Briars |
| hollowed-ranger | veteran | blight | 11 | walker | Rot-Arrow; below 30% HP it may *Remember* and lose a turn |
| sapwight | veteran | blight | 11 | 24×28 | Sap Leech |
| gloamwing | relic-bearer | radiant | 11 | lair, 64 px | Dreamdust (WIS save or Frightened) |
| rotwarden | champion | blight | 13 | lair, 96 px | Blacken the Sap |

**Named holders** are `variants`:
- tallyman: Sneck, Hollis (relic-bearer tier), Dun, Vesper
- bandit: Haskett
- smuggler: Mags
- feral-druid: Oda
- hollowed-ranger: Corra

Tamsin is a unique rival entry, not one of the 18. The 6 Omens are unchanged.

**New encounters** (levels at W1 unless noted):

| map | encounters |
|---|---|
| Hearth Road | `hr-smugglers`: Mags + 2 smugglers, block behind bramble, L5 at W0. `poachers-holm`: Haskett L10 + 2 thornhounds, lair |
| Mossfall | `mf-bog`, `mf-smugglers` (packs); `mf-mossback` (block); `mire-shrine`: 2 boglurchers |
| Mosswatch | `mw-stair`: tallyman + 2 smugglers. `mw-lantern`: Hollis 11 + tallyman |
| Hindwood / Fawnrest | `hw-glowcaps`, `hw-druid` (packs); `gloamwing-hollow` 11; `vesper-stall` |
| Eldergrove | `grove-circle`: Oda 11 + 2 briarlings; `tamsin-duel` |
| Heartroot | `hr1-grubs`, `hr1-sapwight` (packs); `hollowed-patrol`: Corra 12 + 2 rangers; `hr1-tappers`: Dun + 2 smugglers; `rotwarden-heart` 13, awarding `brand-of-the-heartroot` |

`ZONES` base levels for rabble patrols (each Waking adds `rabbleLevels`): `hearth-road` 2, `thornway` 5, `mossfall` 7, `hindwood` 7, `heartroot` 8.

### Relics (24)

Nos. 1–12 are M2's. Their existing `mapPower` ids come into use: kindle, still-the-water, break-the-cairn, wardens-writ, cut-the-tally, cut-the-thornwall, hear-the-rot, watchful, thorn-thread, trackless, briar-crown, bloodtrail.

| No. | id | kind · aspect | source | map power |
|---|---|---|---|---|
| 13 | `lightfingers` | gloves · frost | Mags (`hr-smugglers`) | lightfingers |
| 14 | `hartshorn` | bow · storm | Haskett (`poachers-holm`); Pip's weapon | harts-sight |
| 15 | `mosswatch-lantern` | focus · ember | Hollis (`mw-lantern`) | lamplight |
| 16 | `watchkeepers-kettle` | kettle · storm | Garret: win 2 of 3 checks (Knowledge 12, Survival 13, Influence 12), or relight his fire | longwatch |
| 17 | `mire-pearl` | ring · tide | Mire Shrine chest, guarded by `mire-shrine` | mirebreath |
| 18 | `dawnbell` | mace · radiant | Gloamwing's cocoon; Alondra's weapon | dawnbell |
| 19 | `rootsong` | staff · tide | Oda (`grove-circle`); Bryn's weapon | rootsong |
| 20 | `oathshield` | shield · stone | Corra (`hollowed-patrol`) | hold-the-line |
| 21 | `isoldes-oath` | sword · frost | Dun at the ichor-tappers' camp (`hr1-tappers`) | stillness (freezes a pack for 8 s) |
| 22 | `ichor-mask` | helm · blight | Rotwarden, breakable | ichorsight |
| 23 | `first-seed` | amulet · verdant | Rotwarden, breakable | greenwake |
| 24 | `vale-signet` | ring · storm | Tamsin, won in the duel | name-drop |

### Bosses

**Briarmaw** is unchanged from M2.

**The Rotwarden** is level 7 at W0 (13 at W1), with about 212 HP and Guard 16. It is weak to tide and radiant. It has two breakable pieces:
- **Ichor Mask** (grip 32): breaking it ends *Blacken the Sap* (2d8 drain to all) and *Ichor Rain*.
- **First Seed** (grip 28): breaking it ends *Graft* (summons up to 2 sapwights) and *Heartroot Bloom*.

| phase | moves |
|---|---|
| P1 | Rootlash, Blacken, Graft, Bark Hide |
| P2 (at 66%) | Grasping Roots (Rooted), Ichor Tide, Bloom |
| P3 (at 33%) | Ichor Rain, Devour (3d10 charge); switches to *Grief* if the mask is broken |

- **Forewarned** (from the Fawnrest dream): the party starts Warded, and the boss's first intent is shown.
- **Afterwards:** return the Seed to Miravel (+5% max HP and a Storied gift), or keep it.

**Tamsin** (`duel:true`) fights **your Warden alone**. She is at the Warden's level and gets no Waking bonus.
- She wields your counter-starter as a `lend` relic. Disarming it stops her Art, but you never claim it.
- Her d12 table: Riposte, Cheap Shot, Showboat, Parry, the relic's Art, and *Not Like This* (a heal under 35% HP).
- The target is a 60–65% win rate for the Warden.
- **Losing is a yield:** no gold loss and no Grudge. She goes in first, and you later cut her free of the roots in Heartroot 1.
- Winning gives the Vale Signet.

### Quests

The Journal shows one "Next:" line per quest, and the title recap reuses it.

| quest | stages → reward |
|---|---|
| **The Hearth Gutters** (main) | Sneck → Thornhollow → the unnamed beast → Brand of Briars → Miravel's Rot → the Heartroot → Brand 2 → come home |
| Lights at Midnight | Hollis → relight `mosswatch-fire` → the Kettle. The ledger reads "ichor, south, to the Fen buyer" |
| The Silent Bell (Alondra) | Gloamwing → ring the bell → the deer return → the dream of four Sleepers → *Forewarned* |
| The Missing Patrol (Dael) | boots at Bramble-Deep → Corra → report back: 150 g |
| Miracle Sap | expose Vesper (Influence DC 14, with advantage when Alondra is along) or fight her |
| Bounty board | Skarn 40 g, Snag 120 g, Mags 100 g, Haskett 250 g, Tappers 150 g |

### Locks: two keys each

- A **power key** counts if the relic is owned and not shattered. It does not have to be equipped, so nobody swaps gear to open a door.
- A **Domain key** uses the best active hero's Domain level. A primary Domain equals the hero's level; a secondary Domain is ⌈L/2⌉.

| lock | power keys | Domain key |
|---|---|---|
| thornwall | cut-the-thornwall, briar-crown | Physical 3 (Warden L5) |
| bramble | thorn-thread, briar-crown, greenwake | Survival 4 (Pip L4) |
| stream | still-the-water, mirebreath | Survival 6 |
| boulder | break-the-cairn | Physical 4 |
| cold-hearth | kindle, lamplight | Attunement 3 (Alondra L3) |
| tally-seal | cut-the-tally, lightfingers | Knowledge 4 (Bryn L4) |
| barred-gate | wardens-writ, name-drop | Influence 3 |
| darkness (soft: 2-tile light without a key) | lamplight, kindle | Attunement 5 (Alondra: "Hold my sleeve.") |
| rot-knot | hear-the-rot, rootsong, ichorsight | Knowledge 6 |
| rope-ledge | harts-sight, bloodtrail | Survival 5 |
| ichor pool (hazard: 4% HP per step, never below 1) | hold-the-line, greenwake | Attunement 6 |

- There are about 22 locks placed.
- Each starter opens its own shortcuts from minute one.
- The crownwalls are the only story gate, matching the brief's guided Act I. The Journal says so.

**Chests.** There are 18, 1–4 per map.
- Loot is seeded from `chest:${seed}:${id}`, at item level = zone level + 6 × Waking. Each opens once, tracked in `flags.looted`.
- Hidden chests sparkle within 3 tiles if you have Watchful or Survival 3.
- Using a lookout with Longwatch marks the region's chests, locks and holders on the Atlas.

**Shops and the forge:**
- **Marta** sells Tonic 20 g, Bitterroot 25 g, Frost Draught 30 g and Salts 40 g.
- **Hilda's wagon** moves Thornhollow → Eldergrove → Keep, one step per Brand.
- **Temper** runs +1 to +3 and costs 30 × ⌈ilvl/2⌉ × (1, 2, 4) gold.
  - Enchant becomes `+temper` at 1:1 (`stats.js:60`, `ui/lib/items.js:31`), so every step changes a number on the card.
  - The metal visibly brightens: +1 adds a glint, +2 lightens the colour ramp, +3 adds an aspect-coloured edge.

## 4. Systems

### World data (pure, in `src/data/world/`)

```js
export default { id, name, region, kind, size:[w,h], music, backdrop, zone,
  atlas:[x,y]|[[x0,y0],[x1,y1]], travel:bool, dark:bool, rows:['…'×h], entities:[…] };
// entities: exit{to:{map,x,y,dir},lock?,sealed?} hearth{id} foe{mode:'pack'|'block'|'lair',enc,w,h,leash}
// patrol{zone,leash} npc{npc,dir,script,wander} sign|board|lookout|bellframe|pedestal|shop|forge
// chest{loot,lock?,hidden?} lock{lock,w,h} trigger{w,h,script,once}  — all with id,x,y and optional `if`
```

**Tiles and index:**
- `tiles.js` defines about 26 characters: `TILES[c]={id,walk,over?,water?,light?,anim?}`.
- `index.js` exports `MAPS`, `HEARTHS[id]={map,x,y,stand,cold,name}`, `ZONES[id]={level,backdrop,patrols}`, `LOCKS`, `START_AT`, `M2_POSITION`, `M2_ROUTE` (the old GAUNTLET list), `CRITICAL_PATH` and `LEADS`.

**Encounter data changes:**
- ENCOUNTERS gains `respawn:'brand'|'never'`, `region` and `duel`. A held relic can be marked `lend`.
- BRANDS gains `brand-of-the-heartroot`.

**Scripts** are arrays of commands:
- Dialogue and flow: `say{who,text≤140}`, `choice`, `check{domain|ability,dc,pass,fail}`, `if`.
- State: `set`, `give`, `take`, `quest`.
- Hand-offs: `battle{enc}`, `shop`, `forge`, `rest`, `fx`, `music`, `end`.

**Conditions** are strings: `flag:`, `brand:`, `claimed:`, `wears:`, `cleared:`, `kindled:`, `quest:id>=n`, `waking>=n`, `power:`, `domain:x>=n`, and `and()`/`or()`.

**Checks** show their odds before you commit ("Influence DC 14 · 65% · Alondra"). They roll from `rngState`, and a failure always branches instead of blocking. A battle inside a script parks `progress.resume`, so the script survives the aftermath screen and a reload.

### Movement and encounters (numbers in `TUNING.map`)

**Walking:**
- 4-way grid movement with tweening. Walk speed is 6.5 tiles/s. Holding B, X or Shift runs at 10; a setting makes running the default.
- A tap under 90 ms turns in place.
- Held directions never stutter at tile edges, and turns are buffered.
- Walls play `bump`. Followers step into the leader's old tiles.

**Packs:**
- A pack is one token with ×N pips.
- It idles inside its leash. When it spots you it shows "!" and freezes for 400 ms, which gives you a beat to react. Then it chases at 5 tiles/s and gives up 8 tiles from home.
- Pack AI randomness is `hash(packId, tick)`.
- Packs never enter exits, doors, locks or 1-tile-wide corridors.

**Blocks and lairs never move.** Pressing A or tapping one opens a **pre-fight card**:
- the level against the party, rated Easy / Fair / Hard / Deadly;
- Omens and any Grudge title;
- the held relic's grey card;
- **Fight / Not yet**.

You never blunder into a boss.

**Flee when weak:**
- An all-rabble pack flees when `partyLevel − packLevel ≥ 3`. With Trackless, a gap of 1 is enough. After the Dawnbell rings, rabble always flee until your next rest.
- A fleeing pack desaturates, shows a sweat drop and runs at 5.5 tiles/s, so you can catch it at a walk.
- **Touching a fleeing pack is a Rout.** There is no battle. You get full gold, 50% XP and the normal rabble drop roll, shown in a spoils strip whose items open their cards.

**Other contact:**
- Reaching a pack from behind gives **First Strike**: `ctx.firstStrike` delays each foe's first ribbon slot by 40.
- A pack that catches you from behind ambushes you. The full Thornwatch set prevents this.
- After fleeing a battle, you get a 2 s grace blink.

**Proposed rabble change:** set `TUNING.waking.rabbleLevels = 2`, while other tiers keep +6. This matches the brief's "rabble never level up". After Brand 1, the Hearth Road rabble are L3–4 against a party of about L8, so they visibly scatter. WP3 re-runs the Waking-1 sim to confirm it.

**Respawn:**
- Authored fights stay cleared until a *new* Brand. That Brand re-arms its own region's `respawn:'brand'` fights, re-geared and holding Echoes.
- `patrol` packs re-roll on every map entry. This is the optional grind: `patrolSpawns(game, zone, rng)` at `ZONES[zone].level`.

**Sighting:** coming within 5 tiles of a lair (9 with Watchful), or holding your finger on it, stamps the Codex.

### Hearthfires, travel and wipes

- **There are 10 Hearthfires.** Four start cold behind a cold-hearth lock: Mossfall, Mosswatch, Hindwood and the Last Green Coal. Visiting a lit one kindles it.
- **At a fire,** A offers Rest / Travel / Party. `restAt` heals, advances the day, sets `lastHearthfire` and re-rolls patrols.
- **Travel** goes from a fire, or from the menu on any map with `travel:true` (towns and routes, not dungeons), to any kindled fire.
- **Wipes** keep the M2 rule, and `at` becomes `HEARTHS[lastHearthfire].stand`.
- **`earnBrand`** only pushes Brands you don't already hold; a rematch sets `report.rematch`. It re-arms only its own region and **never teleports**.
- **Grudges** keep their `enc#i` keys and show a red title plate on the map.

### Save v2 and migration

```js
{ version:2, migratedFrom?:1, seed, rngState, party, inventory, bag, gold, codex, settings,
  progress:{ waking, brands, lastHearthfire, at:{map,x,y,dir}, resume:null, m2?:{node,lastHearthfire},
    flags:{ cleared, done, grudges, day, runs,                // v1, untouched
            story:{}, kindled:{}, opened:{}, looted:{}, seen:{}, bounties:{}, quests:{} } } }
```

`migrate(save)` is pure and idempotent. In order:
1. If there is no `version`, throw. If `version ≥ 2`, return the save unchanged.
2. `g = structuredClone(save)`. Every v1 field is kept byte for byte.
3. Set `m2 = {node, lastHearthfire}`.
4. Set `at = waking > 0 ? M2_POSITION['hearthstone-keep'] : M2_POSITION[node] ?? START_AT`.
5. If `lastHearthfire` is not in `HEARTHS`, set it to `'hearthstone-keep'`.
6. With `i = M2_ROUTE.indexOf(node)`:
   - kindle each M2 hearth with index ≤ i (all of them if waking > 0);
   - set `story.prologue = i ≥ 1 || done['keep-vault'] || waking > 0`;
   - set `story['met-dael'] = i ≥ 8 || waking > 0`;
   - mark all non-world hints as seen.
7. Add the empty new flag maps, delete `node`, and set `version = 2`.

The crownwalls check `brand:brand-of-briars`. M2 players who looped to Waking 1 or higher therefore wake in the Hall with the Wilds open and the fights re-armed as Echoes, which is exactly what M2 last showed them.

**Storage and codes:**
- **Keys.** The live save is `aethermoor.save.v2`. `aethermoor.save.v1` is read-only: never written or deleted. `.v2.bak` holds the previous save before a New Game or an import.
- **Codes.** Exports start `AETH2.`. `importCode` accepts `AETH1.` or `AETH2.`, then scrubs, then migrates.
- **Build output.** The build also writes `dist/aethermoor-m3.html`, so the M2 file stays intact.

## 5. Rendering

**Scale.** `s = clamp(round(devicePx / target), 2, 8)` device pixels per art pixel.
- `target` is 192 on a phone (160 for Near zoom, 224 for Far) and 288 on a laptop.
- A 360 px phone at DPR 3 gives s = 6 and an 11-tile view. The 16×24 walker shows at 32×48 CSS px, enough to read a kettle helm and a cloak.
- Everything draws to one logical canvas of about 55k pixels, scaled with CSS `image-rendering:pixelated`.

**Tiles:**
- Built with Forge, `Xf` and the `MAT` colour ramps, `compose({glow:false})` and `noShadow`, with 2–4 `hash` variants each.
- Water, torches, glowcaps and ichor animate in 2–4 frames.
- `bakeRegion` builds an atlas of about 130 tiles in roughly 250 ms on a phone. It is cached for the session and hidden behind the map fade.
- The ground is baked into 256×256 chunk canvases. The current and previous maps stay cached, so stepping back through a door is instant.

**Each frame** draws, in order:
1. up to 4 chunk blits;
2. up to 60 animated tiles;
3. props, NPCs, packs and the party, sorted by y;
4. the `over` layer (tree crowns, tall grass over feet);
5. darkness, with pixel-stepped light holes.

**Readability:**
- Ground uses ramp steps 1–3 only. Sprites get the full ramps and the outline. The road is the lightest ground.
- Every interactable has a tell:
  - NPCs bob.
  - Chests glint.
  - A lock shows its key icon within 3 tiles, green if you hold a key.
  - A lair pulses a rarity-coloured glint on its relic every 2 s, with a nameplate within 5 tiles ("Old Snag · Lv 6 · Hard").

**Walkers.** `renderWalker(heroId, gear, {dir:'down'|'up'|'side', frame:0|1|2, custom})` returns a 16×24 sprite with the foot at (8,23).
- heroForge gains two options:
  - a real `scale:.5`, which also scales weapon k, the bowstring, the orb and GROUND;
  - `back:true`, which draws the hair or hood, the cloak, and the weapon slung on the back.
- The eyes are 2 hand-placed pixels.
- Each hero has 9 rasters, held in their own `lru(96)` keyed by gear signature. They build lazily: the current direction first, then one per frame.
- Gear comes from `heroGear` and `heroCustom`, the same as the battle sprite.

**The showoff.** If a hero's gear changed since the last visit to the map, that hero steps out of line, faces the camera and sparkles on the new slot ("Pip wears Hartshorn", 1.2 s, once per item). Heirlooms twinkle every 3 s.

**Map foes.** `renderMapFoe(family,{gearTier,dir,frame,flee})` runs the battle builders at k = 0.5 (at a third of full size they turn to mud). Lairs use `renderFoe` idle at 1×, so the glint is the real relic.

**Camera:**
- a 16×12 px deadzone with `1−e^(−12dt)` easing;
- snapped to whole art pixels and clamped to the map edges;
- small maps are centred, and entering a map cuts instead of panning.

**Budget on a mid-range phone:**
- at most 4 ms of JS per frame, dropping to 15 fps when nothing moves;
- map load within 500 ms, inside a 200 + 200 ms fade;
- chunks under 8 MB;
- bundle at most 1.2 MB: about +70 KB code, +35 KB data, and up to +240 KB for the atlas image.

## 6. UI and controls

**Portrait phone** (`position:fixed`, `overscroll-behavior:none`), in three bands from top to bottom:
1. **HUD (40 px):** place, day, gold, and the Hearth Clock (Brand coals ●○ and the Waking). Below it, a strip of 4 busts with HP/MP bars. A bust pulses under 30% HP, and tapping it opens Party.
2. **The map canvas.**
3. **A solid control deck (168 px plus safe area)**, so nothing is hidden under your thumbs:
   - A **prompt line**, such as "A · Talk to Captain Dael" or "Thornwall · ✓ Thornsplitter · ✗ Physical 3 (Wren 2)".
   - A **144 px d-pad**: one pointer-captured element. It reads the dominant axis past a 14 px dead zone, with 20% hysteresis, so you can slide your thumb to turn.
   - **A (64 px)** and **B (52 px)** on a GBA-style diagonal, with a Menu pill between the pad and the buttons.
   - The deck uses `touch-action:none`. It appears on `pointer:coarse` or after the first touch (setting: Auto/On/Off).

In landscape (under 500 px tall), the controls float at 70% opacity.

**Taps:**
- Tapping a tile walks there (BFS, up to 48 steps, with a dotted trail).
- Tapping an NPC, chest, lock or fire walks next to it and interacts.
- Tapping a block or lair opens its pre-fight card.
- **Holding 450 ms on a lair or block** opens `cardPreview(item,{heldBy})`, the brief's greyed card, and marks it Sighted.
- Any pad input cancels a tap path.

**Laptop:**
- The screen keeps its own held set of keydown/keyup. The latest direction wins. The set clears on `blur`, is removed on `unmount`, and ignores keys while `overlayOpen()`.
- Keys:
  - arrows or WASD walk; Z, Enter or Space is A; X or Shift runs;
  - Esc or M opens the menu, J the Journal, and 1–4 pick dialogue choices;
  - a click walks there, and a right-click inspects.
- At 1000 px and wider, a side column shows the party, the "Next:" line, and a **Nearby** list of DOM buttons for everything within 5 tiles. It works with Tab and screen readers.

**Dialogue replaces the deck in place**, so your thumb never moves:
- a 48 px bust and 3 lines of 15 px text, typed at 45 chars/s with a per-speaker `blip`;
- the ▸ button sits exactly where A was, and B skips;
- choices are 44 px buttons with odds chips.

On a laptop, dialogue docks over the bottom of the canvas.

**Menu:** Party, Codex, Journal, Atlas, Ladder, Save code, Settings and Title, each opened with `from:'world'`.
- `road` becomes an alias of `world`, and every `returnTo` default becomes `'world'`.
- Battle and aftermath fall back to `ctx.where` / `ctx.backdrop` when `ENCOUNTERS[nodeId]` is missing.

**Atlas (fast travel):**
- `tools/atlas-image.mjs` uses Chromium to pull the PNG out of the lore file and write a 1152×768 WebP at quality 0.6 to `src/data/atlas-image.js`. If that is over 180 KB, it drops to 960 px wide.
- Two views: "Wilds" (the NW quadrant fills the width) and "Realm".
- Markers are 44 px buttons:
  - kindled fires (tap to travel);
  - known places (dimmed);
  - **you are here**, interpolated along the map's `atlas` line by your y, so the pin slides as you walk;
  - sighted holders and claimed relics;
  - padlocks on Sandspire (870,470), Ironhold (870,160) and Bogmire (280,530).
- Phones also get a travel list below the map.
- In dungeons the Atlas is view-only.

**Other screens:**
- **Ladder:** 18 posters, black silhouettes until sighted.
- **Journal:** Quests, Bounties, Keys (✓/✗ per key, and whose Domain counts), Hearthfires.
- **Forge:** Temper, with a before/after card.

**Onboarding** is one-time hints (`flags.seen`), each shown beside its control:
- walk (until 4 steps taken);
- A to talk;
- "Foes are real, walk into them";
- hold B to run;
- hold a glint to see its card;
- two keys (at the first lock);
- Rout (at the first fleeing pack);
- rest and travel;
- "Menu → Party to equip; you'll see it on the map".

**Saving:**
- `setGame` runs on every map change, interaction, battle, menu open and `pagehide`, and every 10 s of walking. A tiny ember flickers when it does.
- The title's Continue reads, for example, "Wren · Thornhollow · Day 4 · Lv 5 · 9/24 relics. Next: track the unnamed beast".
- **With a v1 save and no v2 save,** the button reads "Continue from the Gauntlet".
  - It migrates in memory and shows a one-time card, "The road has become a land": heroes and levels, relics, gold, Waking, and "you wake at the Milestone Fire".
  - Nothing is written until you move.
- Load code shows the same card.
- New Game asks for confirmation and backs up to `.bak` first.
- The title shows an "M3 · Verdant Wilds" tag.

**Sound:**
- New music tracks `wilds`, `town` and `dungeon`, added to `TRACKS` and the e2e allowlist. They crossfade on map change.
- New sound effects:
  - `step` (only while running), `bump`, `alert`, `rout`, `door`, `blip`;
  - `unlock`, the map-power chime, played over a visual for each power: ice spreading, embers, a crack, an axe bite.

**Accessibility:**
- Reduced motion drops the typewriter, shake and slides, uses cuts instead of fades, keeps water and glints still, and snaps the camera. Walking still tweens.
- `aria-live` announces places, prompts and dialogue.
- Danger always comes as a word as well as a colour.
- New settings: `mapZoom`, `alwaysRun`, `touchControls`, `showFollowers`, `textSpeed`, `haptics`.

## 7. Implementation plan

| WP | owns (exclusive) | delivers and tests |
|---|---|---|
| **1 Geography** | `src/data/world/{tiles,index}.js`, `src/data/world/maps/*.js`, `test/world-data.test.mjs` | Publishes `tiles.js`, `keep-hall` and `hearth-road` first. Tests: rows rectangular; legend valid; exits reciprocal; ids resolve; every lock has a power key and a Domain key; a flood fill reaches `CRITICAL_PATH` with the guided keys and every chest with all keys; 4 sealed exits |
| **2 Story** | `src/data/world/{npcs,scripts,quests,ladder,shops}.js`, `test/story-data.test.mjs` | Tests: conditions parse; speakers exist; every `say` ≤ 140 chars; every stage has a `next`; no flag is read that is never set |
| **3 Foes, relics, balance** | `src/data/{foes,relics,skills,encounters,tuning,omens}.js`, `test/data.test.mjs`, `tools/sim.mjs`, `docs/RULES.md` | 10 families, variants, Tamsin, 12 relics, encounters, tuning. The sim walks `CRITICAL_PATH` plus `LEADS`. Targets: Rotwarden first-try wipe 30–40% going direct, ≤ 20% with 2 leads; party L10–12 at the Rotwarden |
| **4 World rules** | `src/rules/{world,roam,script,migrate}.js` (new), `src/rules/{gauntlet,battle,stats,party}.js`, `test/{world,roam,script,migrate,gauntlet}.test.mjs`, `test/fixtures/m2-*.json` | The API below; firstStrike, `lend` and `duel` in battle; temper. Migration fixtures cover every M2 node, Waking 1–2 loops and live grudges, with a deep-equal on kept fields and an idempotence check |
| **5 Overworld art** | `src/art/{tiles,walkers,mapfoes,props,npcs}.js`, `src/art/heroes.js` (the scale and back options only), `src/art/index.js`, `tools/gallery*` | `tileArt`, `bakeRegion(region)→{image,at}`, `renderWalker`, `renderNpc`, `npcBust`, `renderMapFoe`, `renderProp(key,{region,frame})`, `emoteIcon`. Tests: a `world` gallery section; determinism |
| **6 Battle art** | `src/art/{foes,item-looks,recipes,scenes}.js` | `FOE_ART` for the 10 new families plus Tamsin; 12 `RELIC_ART`; temper brightening; 5 new backdrops |
| **7 World screen** | `src/ui/screens/world.js`, `src/ui/world/{loop,view,camera,controls,actors,dialogue,hud,transition,session,path}.js`, `src/ui/world.css`, `tools/e2e-world.mjs` | Everything in §5–6, with a test seam `window.__world={state,teleport,press,interact}`. e2e at 360×740 and on a laptop: pad walking, talking, Sneck, a lock prompt, holding a lair gives `.ov .card.grey`, a Rout, no horizontal scroll, reduced motion, p95 frame under 8 ms |
| **8 Shell, save, menus, audio** | `src/core/{save,audio}.js`, `src/ui/app.js`, `src/main.js`, `src/ui/screens/{title,newgame,settings,aftermath,party,codex,battle,atlas,journal,ladder,forge}.js`, `src/ui/screens.css`, `src/data/atlas-image.js`, `tools/{atlas-image,build,e2e-flow}.mjs`, `tools/dev-battle-entry.js`; deletes `road.js` | e2e: pasting an M2 AETH1 fixture shows the card and lands on the right tile, with the `.v1` key byte-identical afterwards; exports start `AETH2.`; Atlas travel works; aftermath returns to the world |

**WP4 API.** All functions are pure. The UI holds the live position and commits it with `setAt`.

```js
setAt(g, at); partyLevel(g); keys(g) -> {powers:{id:relicId}, domains:{id:{level,heroId}}}
mapState(g, mapId) -> {map, entities:[{...e, state, present}]}; canWalk(g, mapId, x, y)
arrive(g, mapId, x, y) -> {game, event}; interact(g, mapId, entId) -> {game, action}
lockInfo(g, type) -> {open, keys:[{kind, id, label, have, by}]}; openLock(g, mapId, entId) -> {game, ok, via}
lootChest; sight(g, enc); kindle; restAt(g, hearthId); travelTargets(g); travel(g, hearthId)
packsFor(g, mapId, entry) -> [{id, enc, zone, home, leash, family, count, level, flees, grudge}]
stepPack(pack, {player, canWalk, tick}, dt); contact(pack, player) -> 'rout'|'battle'|'first-strike'|'ambush'
startBattle(g, {enc?, patrol?, firstStrike?, ambush?}); resolveBattle(g, b); routPack(g, pack)
startScript(g, id, {self}); stepScript(g, run, input) -> {game, run, show}; evalCond; checkOdds; migrate(save)
```

**Order of work.** All 8 packages start at once from this document.
- WP4 publishes JSDoc stubs in its first hour. WP1 publishes two real maps early.
- Stand-ins until the art lands:
  - WP7 uses flat-colour tiles and `renderFoe` lairs until WP5 is in.
  - WP3 points the new families at existing art keys until WP6 is in: smuggler → cutpurse; small beasts → briarling or thornhound; sapwight → rotstag; gloamwing → thornhound; rotwarden → briarmaw.
- Integration order: WP3 → WP1/WP2 → WP4 → WP8 → WP7. WP5 and WP6 can merge at any time.

## 8. Risks and cuts

**Cut first, in this order:**
1. Tap-to-walk (keep hold-to-inspect).
2. The landscape layout.
3. The rope-ledge loop.
4. The solo Tamsin duel: make it Tamsin plus 2 cadets against the full party.
5. The showoff: fall back to a toast.
6. NPC busts.
7. Ladder art.
8. Mosswatch's second floor.
9. Four families, which become re-tinted variants.
10. Back-facing walkers.

**Never cut:** the pad feel, fleeing packs and the Rout, gear on walkers, the migration, Atlas travel, and both bosses.

**Risks:**
- **Phone frame time.** Chunk baking and a single logical canvas are mandatory, and WP7's frame-timing test gates it.
- **Walker readability.** Review the gallery on a real 360 px phone before WP7's polish pass.
- **iOS touch quirks:** pointer capture, double-tap zoom and rubber-banding.
- **Migrating real saves.** Covered by the fixture tests and the e2e paste.
- **Waking-1 balance and the rabble change.** The sim gates both.
- **The Brand-loop behaviour changes from M2.** The carry-over card says "The Wilds remember your Wakings."
- **Id drift across 8 agents.** The WP1 and WP2 tests fail on any unknown id.
- **A one-hero battle UI.** It needs an e2e test; if it breaks, fall back to cut 4.
- **Atlas image size.** Capped at 180 KB.