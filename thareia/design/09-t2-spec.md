# 09 — T2 spec: Chapter 1, "The Rot's Roots"

T2 builds Chapter 1 in the Verdant Wilds, levels 2 to 10, with the rented skiff. It follows the T1 patterns in
`07-t1-build.md`: Thareia content lives in `src/data/thareia/*`, and each old map Thareia walks gets a `th-<id>` copy in
`src/data/maps/` that keeps the old rows and draws the old painting through `paint`. Story effects are `join`, `leave`,
`cut`, `note`, `set`, `gold`, `pay`, `open`, `fight`, `end`.

Canon source: `lore/thareia-aethermoor-lore-compendium.md`. Where the reports disagreed, this spec has already chosen.
The choices are marked **Decided**.

Paths below are relative to `thareia/game/` unless they start with `design/` or `art-in/`.

## Work packages at a glance

| WP | What | Files (new or changed) | Depends on |
|---|---|---|---|
| A | Story: flags, dialogue, NPCs, objectives, quests | `src/data/thareia/dialogue.js`, `npcs.js`, `objectives.js`, new `src/data/thareia/quests.js`, `src/rules/story.js` (join guest, `end: 'chapter-1'`) | nothing (ids from this spec) |
| B | Maps: nine `th-*` copies and one new map | `src/data/maps/th-*.js`, `src/data/maps/index.js`, `tools/build.mjs` (paint list) | nothing |
| C | Party: Taela | `src/data/heroes.js`, `src/data/skills.js`, `src/rules/gauntlet.js` (partyLevel skips guests), hero art | nothing |
| D | Fights | `src/data/thareia/encounters.js`, `src/data/foes.js` (rotstag variant), `src/data/relics.js` (heartstone), `src/data/encounters.js` (BACKDROPS, ZONES, PATROLS), `src/rules/world.js` if zones are listed there | C for sims only |
| E | Airship | `src/data/thareia/sky.js`, new `src/rules/sky.js`, `src/ui/screens/sky.js`, `src/ui/screens/world.js` | A (flag names) |
| F | Tests | `test/thareia.test.mjs`, new `tools/e2e-t2.mjs` | all |
| G | Art | `art-in/`, `tools/paint-import.mjs`, `tools/backdrop-import.mjs`, `src/ui/assets/cuts/index.js` | none; everything has a drawn fallback |

All ids in this spec are final. A package that needs an id from another package uses it as written here.

---

## 1. Overview

The hero starts T2 in Thornhollow at level 2 (the Prologue pays 63 XP), alone. Yara has left.
Chapter 1 flags use the prefix `c1-`. Side quest flags use `s1-` to `s9-`.

**Decided:** the main path is Thornhollow, the Thornway, Eldergrove, the Heartroot, Thornhollow, Mossfall, Mosswatch
Tower (both floors), the Hindwood, Fawnrest, the node. Mosswatch is on the main path, because without it the hero meets
the boss at level 8.

| # | Beat | Where | Party level | Flags set (in order) |
|---|---|---|---|---|
| 1 | The Prologue card closes. Road-rats are cutting the straps on Aldric's crate at the landing. Aldric pays 10 gp "for the half that did not sing", asks for quiet, and gives the courier job to Eldergrove. The north gate opens. | th-thornhollow | 2 | `c1-start`, `c1-aldric-met`, `c1-courier` |
| 2 | Ranger Dael: the Rot is worse, the Mossfall road is shut by his order. His board posts the side quests. The skiff-hire clerk wants a 30 gp deposit, which the hero cannot pay yet. | th-thornhollow | 2-3 | `c1-dael`, `c1-saw-hire` |
| 3 | The Thornway on foot. Rot-bramble, road-rats, a bandit in ranger boots. The first grey trees whisper when the wind is still. | th-thornway | 3-4 | `c1-whisper`, `s2-lead` (boots) |
| 4 | Eldergrove. Taela reads Aldric's letter (it says nothing) and laughs once. The shard flares over the grey roots (cut `shard-glows`). "Do that again." She joins as a guest. Oda's burners are at the stone circle with torches, and the two stop them. | th-eldergrove | 4-5 | `c1-thornway`, `c1-met-taela`, `c1-shard-roots`, `c1-taela-guest`, `c1-circle-saved` |
| 5 | Under the Eldest Tree. Rotgrubs and a sapwight. The deepest root-spring runs warm. | th-heartroot-1 | 5-6 | `c1-warm-water` |
| 6 | That night (canon Day 4): the pulse. Every root glows gold for one breath, and something far to the south answers. Never explained. | th-eldergrove | 6 | `c1-pulse` |
| 7 | Aldric hears "warm water" and admits his buyers asked for a map of where the crystal hums loudest. He pays the skiff deposit. Dael opens the west gate. | th-thornhollow | 6 | `c1-aldric-maps`, `c1-skiff-rented`, `c1-west-open` |
| 8 | Mossfall, then Mosswatch Tower. Crates on Garret's stair, and a signalman in the Lamp Room. Garret's map shows the Rot line bending inland toward Fawnrest; his tide logs say the ground water is warm. | th-mossfall, th-mosswatch-1, th-mosswatch-2 | 6-8 | `c1-mosswatch`, `c1-rot-line` |
| 9 | The line points at Fawnrest: the pilgrims stopped coming, because the pool runs hot enough to scald. The Hindwood gate opens. | th-mosswatch-2 (Garret) | 8 | `c1-to-fawnrest` |
| 10 | The Hindwood. The first Rot-corrupted beasts. Oda's burners at their camp: talk them down with Taela, or fight. | th-hindwood | 8 | `c1-hindwood` |
| 11 | Fawnrest. No white deer. Sick pilgrims, a steaming pool. The keeper shows the stonework and the script round the Dreaming Stone. The shard drags the hero's hand to the court; the stones are warm. A stair under the court has been opened recently. | th-fawnrest | 8-9 | `c1-fawnrest`, `c1-stair-found` |
| 12 | The node. Fitted floors, straight channels, veins that meet at a round dais. The node glows white-hot (cut `node-overheats`). A silver ring holds a clear lens clamped to it, stamped with a small mark. | th-fawnrest-node | 9 | `c1-node-found`, `c1-lens-seen` |
| 13 | Boss: the Hart of Fawnrest (cut `guardian-wakes`). | th-fawnrest-node | 9 | `c1-hart-beaten` |
| 14 | The hart goes out in a silent amber flare and leaves crystals. The hero pries off the lens; the node drops to a steady gold. Taela sings the roots cool (cut `node-cools`). She joins for good and names Fen Rootwalker. | th-fawnrest-node | 10 | `c1-node-cooled`, `c1-taela-joined`, `c1-lens` |
| 15 | Aldric sees the lens mark and goes white. He hands over one unsigned letter, paid in Sandspire silver, with the same seal. Dael: the Rot on the west road has stopped spreading. The Chapter 2 card. | th-thornhollow | 10 | `c1-aldric-letter`, `c1-done` |

**Timing rules.** Beat 6 is canon Day 4. Show no date or day count after it. Sedrin never appears in Chapter 1, and never
at Thornhollow. The hero never learns about the egg-stone, Misthollow or Lira.

**Names Chapter 1 must not use:** Dustveil, the Cistern Lords, the Unwaning, Tallymen, the Brand, the Sleepers, the
Hollow Council, the Rotwarden, the First Seed. The lens and its mark stay unexplained.

**Tone rules.** No line assumes the hero is human or names a gender. Every night scene shows Auros in the sky. Nothing
says the Approach is close. Cooling one node must not read as the network settling (that is the Warming, Chapter 5).

---

## 2. Maps (WP B)

Every copy follows `src/data/maps/th-thornhollow.js`: the same `rows`, `paint: '<old id>'`, region `verdant`, Thareia
entities only. Register each in `src/data/maps/index.js` and add its painting to the build list in `tools/build.mjs`.
Entity ids for locks, gates, chests and triggers must be unique across all maps, so every one here has a new id.
Hearthfire ids are new too (the old ones stay with the old world).

Gated exits use the existing form: `{ id, area, to, anchor, gate: <cond>, sealed: { region, text, hint } }`
(see `mossfall.js` `mf-fen-stair`).

All coordinates below were checked walkable in the map reports (tileOf not solid, and reachable by flood fill from the
arrival anchor). Coordinates marked **(check)** were placed by this spec and must be checked with
`node tools/map-draft.mjs` before commit.

### 2.1 th-thornhollow (edit the existing file)

Rows: unchanged (`thornhollow` rows). Level 3. No roam.

Tracing fixes (optional, cosmetic): `[1,1]`, `[2,1]`, `[3,3]`, `[3,4]` to `#`; row 17 `[19,17]` from `|` to `.`.
Do not change rows unless `test/thareia.test.mjs` line 72 (rows equal to the old map) is updated in the same commit.
**Decided:** leave the rows as they are in T2.

Entities:

| id | kind | at / area | notes |
|---|---|---|---|
| th-hearth | hearthfire | [12,12], stand [12,13,'n'] | keep |
| th-landing | trigger | whole map | keep (T1) |
| c1-crate-thieves | trigger | area [10,18,14,20] (check) | on enter, if `c1-start` and not beaten `c1-landing`: dialogue `c1-crate-thieves`, then fight `c1-landing` |
| th-aldric | npc `aldric` | [16,8] face s | keep; new talk order (section 3) |
| th-dael | npc `th-ranger` | [7,6] face s | keep; new talk order |
| th-skyhire | npc `th-skyhire` | [13,20] face w | hire post, next to the `from-skiff` anchor |
| th-skyhire-post | sign | [10,20] | "SKIFF HIRE. Licensed docks only. No night flying." |
| th-notices | board | [9,5] | Dael's bounty board: dialogue `c1-board` |
| th-outfitter | npc `th-outfitter` | [18,15] face s | shop `th-outfitter` (leather, bows, the Thornhollow longbow) |
| th-trader | npc `th-trader` | [8,17] face n | shop `th-trader` (general goods, tonics) |
| th-lookout | lookout | [2,3] | view text over the Wilds |
| th-stockade | lock | [20,18] | opens on flag `s2-done` (Dael's thanks) |
| th-cache | chest | [21,19] | behind th-stockade; low-tier loot for level 5-7 |

Exits:

| id | area | to / anchor | gate | sealed text |
|---|---|---|---|---|
| tt-n | [11,0,12,0] | th-thornway / from-thornhollow | `{ flag: 'c1-courier' }` | "The Thornway. Aldric has not given you a reason to take it yet." |
| tt-w | [0,10,0,11] | th-mossfall / from-thornhollow | `{ flag: 'c1-west-open' }` | "The Mossfall road. Shut by the Thornwatch's order." |
| tt-ne | [23,3,23,4] | th-hindwood / from-thornhollow | `{ flag: 'c1-to-fawnrest' }` | "The Hindwood road, toward Fawnrest. Nobody goes that way now." |
| tt-s | [11,21,12,21] | sealed, no `to` | none in T2 | "The Hearth Road, to the Keep. Not yet: the Wilds first." |

Anchors: `from-skiff` [12,19,'n'] (keep), `from-thornway` [12,2,'s'], `from-mossfall` [2,10,'e'],
`from-hindwood` [21,4,'w'].

When painting 5 (`walk-thornhollow-landing`) arrives, see 2.11.

### 2.2 th-thornway (new copy of `thornway`, 30×56)

`paint: 'thornway'`, level 3, zone `th-thornway`, roam `{ max: 2, rects: as thornway }`.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-tw-enter | trigger | [12,50,16,54] | on enter, once: dialogue `c1-tw-enter` (the Rot smell, the shard hums), then fight `c1-verdant-edge` |
| c1-runner-camp | encounter block | [11,40] face s | story fight; guards the barricade |
| th-tw-barricade | gate | [12,40,14,40] look barred-gate | opens on beaten `c1-runner-camp`; text "A smugglers' barricade of carts and rope." |
| th-tw-strongbox | chest | [2,42] | opens on beaten `c1-runner-camp`; gold, a runed item, and the runners' ledger note: "Fernshaw, Thornhollow: sunstone, paid in full." |
| th-tw-goblins | npc `th-goblin` | [22,43] face w (check) | S7 giver, in the east clearing |
| c1-snag-wallow | encounter lair | [22,34], area [21,33,23,34] | optional; return anchor `v1:c1-snag-wallow` [21,36,'e'] |
| th-tw-boulder-chest | chest | [3,14] | opens on beaten `c1-snag-wallow` ("the boar shifted it") |
| th-tw-bramble-cache | chest | [8,24] | no lock; healing herbs |
| th-tw-thorn-chest | chest | [27,28] | lock opens on flag `c1-taela-guest` (Taela parts the thorns) |
| c1-tw-whisper | trigger | [19,15,24,17] | once: grey trees whisper when the wind drops; sets `c1-whisper` |
| c1-bramble-deep | encounter block | [15,20] face s | story fight; return anchor [15,23,'n'] |
| th-tw-bramble | gate | [16,18,20,20] look rot-bramble | opens on beaten `c1-bramble-deep`; "Thorns gone black and wet with Rot." |
| c1-tw-boots | trigger | [14,19,18,22] | if beaten `c1-bramble-deep`, once: the bandit wore Thornwatch boots; sets `s2-lead` |
| th-tw-hearth | hearthfire | [22,9], stand [22,10,'n'] | "The Thornway Stone", lit |

Dropped: `tw-thornwall` (row 26, a Brand power), `tw-crown-n`, `tw-snag-boulder` (**Decided:** an optional lair must not
gate the main road), `tw-boots`, the old fights.

Exits: `tw-s` [13,55,14,55] to th-thornhollow / from-thornway. `tw-n` [14,0,15,0] to th-eldergrove / from-thornway.
`tw-den` [26,4]: to th-briarmaw-den / from-thornway, gate `{ flag: 'c1-node-cooled' }`, sealed "A den mouth in the
cliff. Something big sleeps in there. Not alone, and not yet."
Anchors: `from-thornhollow` [14,53,'n'], `from-eldergrove` [14,2,'s'], `from-den` [26,6,'s'].
Tracing fixes: none needed.

### 2.3 th-eldergrove (new copy of `eldergrove`, 30×26)

`paint: 'eldergrove'`, backdrop `eldergrove`, level 4, no roam.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-eg-arrive | trigger | [0,0,29,25] | on enter, if not `c1-thornway`: grey roots weep black sap; sets `c1-thornway`; courier pays 12 gp here via dialogue `c1-eg-arrive` |
| th-taela | npc `taela` | [16,4] face s | at the Eldest Tree's dying roots; hidden once `c1-taela-guest` |
| c1-eg-shard | trigger | [13,3,18,4] | if `c1-met-taela` and not `c1-shard-roots`: dialogue `c1-shard-glows` (cut, guest join) |
| c1-grove-circle | encounter lair | [4,6], area [4,5,4,6] face e | if `c1-taela-guest`; story, once |
| th-eg-acolyte | npc `th-acolyte` | [3,7] face e | a sick druid; hidden once beaten `c1-grove-circle` |
| th-miravel | npc `th-miravel` | [17,11] face s | Elder Miravel, seed-vault keeper: the oldest seeds rot first |
| th-scholar | npc `th-scholar` | [12,19] face e | S4 giver, after `c1-warm-water` |
| th-eg-supplier | npc `th-eg-supplier` | [20,18] face n | shop `th-eldergrove` (herbal goods, no metal) |
| th-eg-bryn-house | sign | [5,12] | new text: rings cut from a dead root, black from the inside out |
| th-eg-hearth | hearthfire | [13,15], stand [13,16,'n'] | rest point |
| th-eldest-door | gate | [15,2] look door | opens on beaten `c1-grove-circle` |
| th-eg-brook | gate | [24,12,24,13] | opens on `c1-taela-guest` ("Taela shows you the stepping stones") |
| th-eg-brook-chest | chest | [26,12] | uncommon druid staff or a herbal item, level 4-6 |
| th-eg-skiffhand | npc `th-skiffhand` | [16,23] face w | hire post |
| th-eg-skiff-post | sign | [13,22] | hire sign |
| c1-eg-pulse | trigger | [12,14,14,17] (check) | on enter, if `c1-warm-water` and not `c1-pulse`: dialogue `c1-pulse` |

Dropped: Nan, Hilda, miravel-freed, tamsin-duel, the old grove-circle foes.

Exits: `eg-s` [14,25,15,25] to th-thornway / from-eldergrove. `eg-tree` [15,1] to th-heartroot-1 / from-tree (behind
th-eldest-door). `eg-e` [29,8,29,9] to th-hindwood / from-eldergrove, one-way ledge, gate `{ flag: 'c1-to-fawnrest' }`,
sealed "The ledge drops into the Hindwood. Nothing down there for you yet." (no `unlock`).
Anchors: `from-thornway` [14,23,'n'], `from-heartroot` [15,4,'s'], `from-hindwood` [27,8,'w'], new `from-skiff`
[15,22,'n'].
Tracing fixes (optional): `[20,6]`–`[20,8]` and `[21,6]`–`[21,10]` are a painted lane marked `Y`; could be `r`.
**Decided:** leave as is in T2.

### 2.4 th-heartroot-1 (new copy of `heartroot-1`, 24×24)

`paint: 'heartroot-1'`, backdrop `heartroot`, level 6, zone `th-roots`, roam `{ max: 2, rects: [[3,3,21,21]] }`.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-hr-descent | trigger | [11,21,13,22] | once: the shard warms; Taela on the black sap |
| th-hr-grub-knot | gate | [11,20,12,20] look rot-knot | opens on beaten `c1-roots-grubs` |
| c1-roots-grubs | encounter block | [13,20] | story |
| th-hr-coal | hearthfire | [4,20], stand [4,21,'n'] | cold; dialogue `c1-hr-coal` lets Taela light it when she is in the party |
| th-hr-ichor-a | lock `ichor` | [8,12,15,14] | keep the soft lock; add `c1-taela-guest` as an opener (check `locks.js`) |
| th-hr-ichor-b | lock `ichor` | [16,6,19,8] | same |
| c1-hr-hot-lake | trigger | [11,15,12,15] | once: the ichor is warm from below; Taela: "It is not the tree." |
| c1-missing-patrol | encounter block | [19,11] | optional, if `s2-open`, once |
| th-hr-sick-rangers | npc `th-sick-ranger` | [20,14] | if beaten `c1-missing-patrol` and not `s2-healed`; dialogue `c1-sick-rangers` |
| th-hr-rot-knot | lock | [2,12] | opens on flag `c1-shard-roots` (the shard hears it) |
| th-hr-cache | chest | [1,9] | runed at most, level 5-6 |
| th-hr-ichor-chest | chest | [17,7] | gold and a runed offhand |
| th-hr-sap-knot | gate | [11,1,12,1] look rot-knot | opens on beaten `c1-roots-sapwight` |
| c1-roots-sapwight | encounter block | [13,1] | story |
| c1-hr-spring | trigger | [11,2,13,2] (check) | if beaten `c1-roots-sapwight`, once: dialogue `c1-warm-water`; sets `c1-warm-water` |

Dropped: `hr1-tappers` (**Decided:** no lens clue here; the first lens is at the node or in S1), `hollowed-patrol`
(replaced), the lore plaque text (rewrite: the eldest trees' sap turned black).

Exits: `h1-s` [12,23] to th-eldergrove / from-heartroot. `h1-n` [12,0]: sealed, no `to`, "The roots below are too hot
to walk." `heartroot-2` is not in Chapter 1.
Anchors: `from-tree` [12,21,'n'], `from-chamber` [12,2,'s'].

### 2.5 th-mossfall (new copy of `mossfall`, 52×22)

`paint: 'mossfall'`, backdrop `mossfall`, level 6, zone `th-mossfall`, roam as mossfall with max 2.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-mf-arrive | trigger | [46,9,50,11] | once: marsh water warm in autumn, moss grey at the roots |
| th-mf-cairn | hearthfire | [30,7], stand [30,8,'n'] | lit (no `cold`) |
| c1-mire-bog | encounter pack | [24,14] | optional |
| th-mf-runner-crate | chest | [16,4] | small loot; note "Fernshaw's mark. Fjord run. Sandspire buyer." |
| th-mf-ford-chain | gate | [41,13] look chain | opens on beaten `c1-mf-runners` |
| c1-mf-runners | encounter block | [42,13] | optional |
| th-mf-islet-ford | lock `stream` | [41,14] | keep; also opens on `c1-taela-joined` |
| c1-mf-islet | trigger | [38,15,45,15] | once: the lagoon is warmer than the marsh |
| c1-mire-shrine | encounter lair | [42,18], area [41,17,43,18] | optional, hard; Gorrow |
| th-mf-bramble-cache | chest | [46,3] | keep the bramble lock |
| th-mf-reed-cache | chest | [9,18] | hidden, 120 gold |
| th-mw-hire | npc `th-skiffhand` | [6,9] face e | the Mosswatch hire post, by the tower door |

Exits: `mf-e` [51,10,51,11] to th-thornhollow / from-mossfall. `mf-tower` [3,8] to th-mosswatch-1 / from-mossfall.
`mf-fen-stair` [20,21,21,21]: sealed, no `to`, "Fog breathes up the stair. The Gloomfen is not for walking, not yet."
Anchors: `from-thornhollow` [49,10,'w'], `from-tower` [3,9,'s'], new `from-skiff` [7,9,'w'].
Tracing fixes (optional): row 20 walkable tiles under the painted tree line; `[46,13]`/`[49,13]` off by one.
**Decided:** leave as is in T2.

### 2.6 th-mosswatch-1 (new copy, 14×16)

`paint: 'mosswatch-1'`, backdrop `mosswatch`, level 6, no roam.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-mw-arrive | trigger | [5,13,8,14] | once: Garret shouting from the kitchen |
| th-garret | npc `th-garret` | [4,11] face e | Old Garret |
| c1-mw-stair | encounter block | [7,4] face s | main path; the only way to the stair |
| th-mw-ledger-door | lock | [10,6] | opens on flag `c1-mosswatch` (Garret's key) |
| th-mw-manifest | chest | [11,3] | 60-100 gold, one item; note: Fernshaw crates "per the map", fjord run |
| th-mw-hearth | hearthfire | [1,11], stand [2,11,'w'] | Garret's kitchen hearth |
| th-mw-alcove | chest | [1,3] | gold and a potion |
| th-mw-crate | chest | [12,12] | an empty crate that still hums faintly |
| th-wenna | npc `th-wenna` | [11,9] face w | if `s1-open`; S1 guide |

Exits: `mw1-door` [6,15,7,15] to th-mossfall / from-tower. `mw1-up` [7,2] to th-mosswatch-2 / from-stair.
Anchors: `from-mossfall` [6,13,'n'], `from-lamp` [7,3,'s'].

### 2.7 th-mosswatch-2 (new copy, 12×12)

`paint: 'mosswatch-2'`, `dark: true`, backdrop `mosswatch`, level 7.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-mw2-arrive | trigger | [5,8,7,8] | once: the Lantern's light through the parapet gap, a back turned to you |
| c1-mw-lantern | encounter lair | [6,5], area [6,4,6,5] face s | main path; Hollis |
| th-mw-signal-light | light | [6,5], radius 3 | if not beaten `c1-mw-lantern` |
| th-mw-fire | hearthfire | [6,2], stand [6,3,'n'] | cold until beaten `c1-mw-lantern` |
| th-garret-up | npc `th-garret` | [4,3] face e | if beaten `c1-mw-lantern`; dialogue `c1-rot-line` |
| th-mw-lookout | lookout | [10,2] | new text: the fjord coast, low lamps on the water at night |
| th-mw-cache | chest | [1,3] | gold, lamp oil, a signal code |
| th-mw-oil | chest | [3,10] | a tonic |

Exits: `mw2-down` [6,11] to th-mosswatch-1 / from-lamp. Anchor `from-stair` [6,9,'n'].

### 2.8 th-hindwood (new copy, 32×40)

`paint: 'hindwood'`, backdrop `verdant-wood`, level 7, zone `th-hindwood`, roam `{ max: 2, rects: [[2,4,30,38]] }`.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-hw-roots | trigger | [20,29,23,31] | once: black-sap trees; a Rot-twisted hound watches and runs |
| c1-hw-ford | trigger | [8,22,12,22] | once: the shard warms at the stream; the roots are black along the water |
| th-hw-cairn | hearthfire | [10,25], stand [10,26,'n'] | lit |
| c1-feral-druid | encounter pack | [18,28] | talk `c1-burners`; hidden if `s3-talked` |
| c1-glowcaps | encounter block | [25,22] | story |
| th-hw-bridge-knot | gate | [26,21,27,21] look rot-knot | opens on beaten `c1-glowcaps` |
| c1-gloamwing | encounter lair | [22,12], area [21,11,23,12] | if `c1-node-cooled`; optional |
| th-hw-thornwall | gate | [27,7,28,7] look thornwall (drawn in code) | opens on `c1-taela-joined` |
| th-hw-thorn-chest | chest | [28,6] | storied item |
| th-hw-pond-chest | chest | [2,33] | herbs, coin |
| th-hw-glade-chest | chest | [3,14] | a potion |
| th-hw-sign | sign | [27,33] | "Hindwood road. Ford west, bridge east. Fawnrest ahead." (no compass words) |
| th-deer-1, th-deer-2 | prop deer | [5,7] (NW glade), [28,25] (south bank) | S9 strays; each shows if `s9-open` and not its own `s9-deer-N`; interact: dialogue `c1-deer` |

Exits: `hw-se` [31,34,31,35] to th-thornhollow / from-hindwood. `hw-n` [15,0,16,0] to th-fawnrest / from-hindwood.
`hw-w` [0,8,0,9] to th-eldergrove / from-hindwood, gate `{ flag: 'c1-to-fawnrest' }` (Taela lowered the rope), no lock.
Anchors: `from-thornhollow` [29,34,'w'], `from-fawnrest` [15,2,'s'], `from-eldergrove` [2,8,'e'].
Dropped: `hw-rope`, the bell quest, the old gloamwing story.

### 2.9 th-fawnrest (new copy, 22×20)

`paint: 'fawnrest'`, backdrop `fawnrest`, level 8, no roam.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-fr-arrive | trigger | [9,15,12,18] | once: the shard warms; no deer; steam off the pool |
| th-fr-camp | hearthfire | [7,12], stand [7,13,'n'] | the pilgrims' fire; the rest before the node |
| th-fr-stone | hearthfire | [11,6], stand [11,7,'n'] | the Dreaming Stone; cold until `c1-node-cooled` |
| th-keeper | npc `th-keeper` | [13,8] face s | Keeper Maren |
| th-pilgrim-1, th-pilgrim-2 | npc `th-pilgrim` | [5,12], [8,14] face s | sick pilgrims |
| c1-fr-court | trigger | [9,5,13,8] | if `c1-fawnrest` and not `c1-stair-found`: dialogue `c1-stair` |
| th-fr-slab | prop | [11,4] look open-slab (drawn in code) | if `c1-stair-found` |
| c1-vesper | encounter block | [16,13] face w | talk `c1-vesper`; optional |
| th-fr-offering | chest | [3,3] | no lock in T2; storied amulet |
| th-fr-pilgrim-cache | chest | [1,12] | potions |
| th-fr-meadow | chest | [20,3] | gold |
| th-fr-deer-1, th-fr-deer-2 | prop deer | [16,4], [18,6] | if `s9-done` |

Exits: `fr-s` [10,19,11,19] to th-hindwood / from-fawnrest. `fr-node` [11,4] to th-fawnrest-node / from-fawnrest, gate
`{ flag: 'c1-stair-found' }`, sealed "Paving stones, warm under your feet." `fr-highfold` [21,9,21,10]: sealed, no `to`,
"Fallen scree, and somewhere past it, a bell."
Anchors: `from-hindwood` [11,17,'n'], `from-node` [11,5,'s'], `from-skiff` [14,10,'w'].
Dropped: Ivo's old lines, the bellframe (keep as scenery with new text or drop), the silent-bell and miracle-sap quests.
Tracing fixes (optional): walkable tiles under canopy on rows 14-18. **Decided:** leave as is in T2.

### 2.10 th-fawnrest-node (NEW map, painting 6)

Until `walk-fawnrest-node` arrives, the map is drawn from tiles (no `paint`). When it arrives, trace the painting tile
by tile, keep every id below, and move coordinates to match.

`id: 'th-fawnrest-node'`, name "Under Fawnrest", region verdant, biome `ruin`, music `dungeon`, backdrop
`fawnrest-node`, level 9, `travel: false`, `dark: true`, no roam. 18×22. Checked by flood fill from [9,21].

```
'##################', //  0
'#####::::::::#####', //  1
'###::::::::::::###', //  2  dais chamber
'##::::::::::::::##', //  3
'##::::::::::::::##', //  4
'##::::::::::::::##', //  5
'###::::::::::::###', //  6
'#######:::########', //  7  root gate
'#######:::########', //  8
'##::::::::::::::##', //  9  channel hall
'##::~::::::::~::##', // 10  straight channels at x4 and x13
'##::~::::::::~::##', // 11
'##::~::::::::~::##', // 12
'##::~::::::::~::##', // 13
'##::~::::::::~::##', // 14
'##::::::::::::::##', // 15
'#######kkk########', // 16  stair gate
'#######kkk########', // 17
'#######kkk########', // 18
'#######kkk########', // 19
'########kk########', // 20
'#########s########', // 21  stair up
```

| id | kind | at / area | notes |
|---|---|---|---|
| c1-fn-hot | trigger | [7,18,9,19] | once: the water down here is hot; Taela goes quiet |
| th-fn-stair-gate | gate | [7,16,8,16] look rot-knot | opens on beaten `c1-node-stair` |
| c1-node-stair | encounter block | [9,16] | story |
| c1-fn-hall | trigger | [3,9,14,9] | once: dialogue `c1-fn-hall` (fitted floors, channels "too straight, too even", veins that all run one way) |
| th-fn-root-gate | gate | [7,7,8,7] look rot-knot | opens on beaten `c1-node-roots` |
| c1-node-roots | encounter block | [9,7] | story; after it, dialogue `c1-node-found` (cut `node-overheats`) |
| th-fn-node | prop node (large, drawn) | at [8,2], solid area [8,1,9,2] | glows white until `c1-node-cooled`, then gold |
| c1-guardian | encounter lair | at [8,4], area [7,3,10,4] | story, once, noFlee; the talk-before is dialogue `c1-guardian-wakes` |
| th-fn-sign | sign | [3,5] | the script round the dais, "a script no one here can read" |

Exits: `fn-up` [9,21] to th-fawnrest / from-node. Anchor `from-fawnrest` [9,20,'n'].

### 2.11 Later maps (only when their painting arrives)

- **th-landing** (painting 5, Must): the landing field outside the south gate. When it lands: trace it, move the
  Thornhollow dock (`DOCKS.thornhollow.map/anchor`) to `th-landing` / `from-skiff`, move `c1-crate-thieves`,
  `th-skyhire` and the sign there, point `tt-s` to th-landing, and seal the Hearth Road at the landing's far edge.
  Zone `th-landing` (section 5.3) goes live with it. Until then, everything stays on th-thornhollow as above.
- **th-fjords-cove** (painting 7, Nice): the S1 cove, `dark: true`, walked. Until then, S1's cove is a scene
  (dialogue then fights, no walking map; section 3).
- **th-briarmaw-den** (copy of `briarmaw-den`, no new art): the S6 lair after the node. `paint: 'briarmaw-den'`.
  Entities: `c1-dael-bounty` lair [8,5] area [6,3,10,6]; trigger `c1-den-enter` [7,14,8,14]; chests
  `th-den-chest-w` [3,4] and `th-den-chest-e` [12,4]; trigger `c1-den-pool` [4,9] (black warm water). Exit `den-s`
  [7,17,8,17] to th-thornway / from-den. Anchor `from-thornway` [8,15,'n']. Build it in T2 (it is cheap).

### 2.12 Map tests (WP F uses these)

Each th-* map: rows from the legend; anchors walkable; every entity and exit in bounds; `paint` set for copies; rows
equal to the old map for copies; every story target reachable from the arrival anchor with the gates the story opens
before it (see section 7).

---

## 3. People and scenes (WP A)

NPCs go in `src/data/thareia/npcs.js` using `N(id, name, role, talk, art)`. The talk list is checked top to bottom; the
first entry whose `if` holds picks the dialogue. Art keys with no look fall back to a villager drawn from the key.
Dialogue nodes go in `src/data/thareia/dialogue.js`, one comment line per node naming its purpose.

Voice notes are in the STORY report and summarized here only when they change a line.

### 3.1 NPCs

| npc id | Name | Role | art key | Talk order (first match wins) |
|---|---|---|---|---|
| aldric | Aldric Fernshaw | Merchant | aldric | `c1-done` → c1-aldric-after; `c1-lens` → c1-aldric-lens; `c1-aldric-maps` → c1-aldric-waiting; `c1-pulse` → c1-aldric-maps; `c1-courier` → c1-aldric-courier-wait; `c1-start` and beaten `c1-landing` → c1-aldric-start; else th-aldric (T1) |
| th-ranger | Ranger Dael | Thornwatch ranger | dael | `c1-done` → c1-dael-end; `c1-aldric-maps` and not `c1-west-open` → c1-dael-west; `s2-lead` and not `s2-open` → c1-dael-patrol; `s2-healed` and not `s2-done` → c1-dael-patrol-done; `c1-start` → c1-dael; else th-ranger |
| th-skyhire | Hob Pellow | Skiff-hire clerk | skyhire | `c1-skiff-rented` → c1-hire; else c1-hire-closed |
| th-skiffhand | the dockhand | Skiff-hire dockhand | skyhire | `c1-skiff-rented` → c1-hire; else c1-hire-closed |
| th-outfitter | Dunna Reeve | Leatherworker | outfitter | c1-outfitter (opens shop th-outfitter) |
| th-trader | Col Ashby | Trader | trader | c1-trader (opens shop th-trader) |
| taela | Taela Greenmantle | Druid of Eldergrove | taela | `c1-met-taela` → c1-taela-roots; else c1-taela-first |
| th-acolyte | Wren | Grove acolyte | acolyte | c1-acolyte |
| th-miravel | Elder Miravel | Seed-vault keeper | miravel | c1-miravel |
| th-scholar | Illeth Sarovan | Aurosi scholar of the Rot | scholar | `s4-done` → c1-scholar-after; `s4-samples` → c1-scholar-done; `s4-open` → c1-scholar-wait; `c1-warm-water` → c1-scholar-offer; else c1-scholar-busy |
| th-eg-supplier | Moss-Hand Tolly | Druid supplies | supplier | c1-supplier (opens shop th-eldergrove) |
| th-sick-ranger | Ranger Ilse and Ranger Cade | Rot-sick rangers | ranger | c1-sick-rangers |
| th-garret | Old Garret | Watchkeeper of Mosswatch | garret | `c1-to-fawnrest` → c1-garret-after; beaten `c1-mw-lantern` → c1-rot-line; `c1-mw-arrived` → c1-garret-wait; else c1-garret-first |
| th-wenna | Wenna Reedcask | Fjord-runner | wenna | `s1-done` → c1-wenna-after; else c1-wenna |
| th-keeper | Keeper Maren | Keeper of Fawnrest | keeper | `s9-done` → c1-keeper-home; `c1-node-cooled` → c1-keeper-deer; `c1-fawnrest` → c1-keeper-again; else c1-keeper |
| th-pilgrim | A sick pilgrim | Pilgrim | pilgrim | `c1-node-cooled` → c1-pilgrim-better; else c1-pilgrim |
| th-goblin | Snib | Goblin forager | goblin | `s7-done` → c1-goblin-after; else c1-goblin |
| th-burner | Oda the Thornmother | Burner | oda | used by the `c1-burners` talk on the encounter; no map npc |
| th-skeet | Skeet Marrow | Smuggler | smuggler | (T1 entry; S1 fight name only) |

Names marked [NEW] in this spec: Hob Pellow, Dunna Reeve, Col Ashby, Wren, Illeth Sarovan, Moss-Hand Tolly, Ilse,
Cade, Keeper Maren, Snib. **Decided:** the Rot scholar is a new person, not Vaelis of Luminara (see question 3).

Speakers used in lines but not placed on maps: `narrator`, `taela` (as party member), `th-burner`, `yara` (optional
hire-office cameo line in c1-hire-closed, spoken only if the player has not seen it).

### 3.2 Dialogue nodes

Main path, in order:

| node | purpose | effects |
|---|---|---|
| c1-crate-thieves | two road-rats at Aldric's crate by the skiff | fight `c1-landing` |
| c1-aldric-start | Aldric straightens a shelf, pays 10 gp for "the half that did not sing", asks for quiet, offers the courier job | `set c1-aldric-met`, `gold 10`, `set c1-courier` |
| c1-aldric-courier-wait | "Eldergrove is up the Thornway. She is expecting oil, not company." | none |
| c1-dael | the Rot is worse; Mossfall shut by his order; the board; the druids want anyone who knows water under the ground | `set c1-dael` |
| c1-hire-closed | deposit 30 gp, licensed routes only, docks only, no night flying; you cannot pay | `set c1-saw-hire` |
| c1-board | the bounty board; lists open side quests by flag | `set s6-open` after `c1-node-cooled`; S7 hint |
| c1-tw-enter | the Rot smell; the shard hums | fight `c1-verdant-edge` |
| c1-eg-arrive | grey roots, black sap; the courier drop | `set c1-thornway`, `gold 12` |
| c1-taela-first | Taela cutting root; reads the letter; laughs once; "it follows the water table, it kills from the roots up"; asks the hero to hold the shard near the roots | `set c1-met-taela` |
| c1-shard-glows | the shard blazes; gold threads run down; "Do that again."; she comes along "until I understand that stone" | `cut shard-glows`, `set c1-shard-roots`, `join taela (guest)`, `set c1-taela-guest` |
| c1-taela-circle | (after the guest join, same scene) Oda's burners at the stone circle with torches | objective only |
| c1-grove-circle-before | Oda: "You cut. We burn." | fight `c1-grove-circle` (use the encounter's `talk`) |
| c1-grove-circle-after | Oda runs for the Hindwood; the Eldest door can open | `set c1-circle-saved` |
| c1-hr-coal | Taela coaxes the cold coal alight | lights th-hr-coal (existing hearthfire kindle effect, or a flag the hearthfire reads) |
| c1-warm-water | the spring runs warm; nothing that deep should be warm | `set c1-warm-water` |
| c1-pulse | night at the hearth; the shard jolts; every root shines for one breath; "The grove just heard something. So did your stone." | `cut grove-pulse`, `note 'Somewhere far to the south, something woke.'`, `set c1-pulse` |
| c1-aldric-maps | told of the warm water, Aldric admits the "map of where it hums"; pays the skiff deposit; "go and look at the coast for me" | `set c1-aldric-maps`, `set c1-skiff-rented` |
| c1-dael-west | Dael opens the Mossfall road on Aldric's news | `set c1-west-open` |
| c1-hire | hire a flight: 10 gp | choice `[{ pay: { gold: 10 } }, { open: 'sky:hire@<dock>' }]`, one node per dock or a `<dock>` template |
| c1-mf-arrive, c1-mf-islet | Mossfall warm-water notes | notes |
| c1-garret-first | Garret: crates went up his stair last night; lights in his lamp room he did not light | `set c1-mw-arrived` |
| c1-mw-stair-before, c1-mw-lantern-before | short lines before each tower fight | fights |
| c1-rot-line | in the Lamp Room: the rangers' Rot map, the line bending inland; the tide logs say warm ground water; boats with no lamps; the pilgrims stopped coming, the pool scalds | `set c1-mosswatch`, `set c1-rot-line`, `set c1-to-fawnrest`, `set s1-open`, `set s2-open` if `s2-lead` |
| c1-burners | Oda's camp: Taela's lines. Choice: talk them down (if Taela is in the party) or fight | talk: `set s3-talked`, `set c1-hindwood`; fight: `fight c1-feral-druid` then `set c1-hindwood` |
| c1-keeper | the white deer are gone; no mason in Aethermoor cut these stones; the stones are warm under the broom | `set c1-fawnrest` |
| c1-stair | the shard drags the hero's hand to the court; a stair under the paving, opened recently, not by the keeper | `set c1-stair-found` |
| c1-fn-hall | the hall's stonework (canon: fitted floors, straight channels, converging veins) | note |
| c1-node-found | the node white-hot; the lens clamped to it, a small cold glint and a stamped mark | `cut node-overheats`, `set c1-node-found`, `set c1-lens-seen` |
| c1-guardian-wakes | "It was white once. The pilgrims followed it here to be healed." | `cut guardian-wakes`, fight `c1-guardian` |
| c1-node-cools | the hart curls and goes out in a silent amber flare, leaving crystals; the hero pries off the lens; the glow drops to gold; Taela sings the roots cool; she joins for good; "Someone should tell the Keep."; she names Fen Rootwalker | `set c1-hart-beaten`, `cut node-cools`, `join taela`, `set c1-taela-joined`, `set c1-node-cooled`, `item lens (key item)`, `set c1-lens`, `set s9-open` |
| c1-aldric-lens | Aldric sees the mark, goes white; hands over one letter: unsigned, Sandspire silver, the same seal | `item buyers-letter (key)`, `set c1-aldric-letter` |
| c1-dael-end | the Rot on the west road has stopped spreading | `set c1-done`, `end: 'chapter-1'` (the Chapter 2 card) |

**Decided:** `c1-done` is set by Dael after Aldric's letter, so both epilogue talks happen. If the player talks to Dael
first, his line is c1-dael-wait ("Aldric wants you. He looked sick.").

Side quest nodes:

| quest | nodes | flags |
|---|---|---|
| S1 Lanterns Hung Low (Garret, level 7-8) | c1-wenna (at dusk she poles you to the cove), c1-cove-arrive, c1-cove-skeet ("You again."), c1-cove-receipts (payments in Sandspire silver; receipts with a wax lens mark), c1-wenna-after | `s1-open`, `s1-fjords-night`, `s1-skeet-beaten`, `s1-lens-receipt`, `s1-done` |
| S2 The Missing Patrol (Dael, level 6-7) | c1-dael-patrol, c1-sick-rangers (Taela heals two; the third was hollowed), c1-dael-patrol-done (Thornwatch gear) | `s2-lead`, `s2-open`, `s2-healed`, `s2-done` |
| S3 The Burners (Taela, Hindwood, level 8) | c1-burners (above); c1-burner-at-fawnrest (if talked down, a burner is at the pilgrims' fire and gives a salve) | `s3-talked`, `s3-done` |
| S4 Stop Measuring (scholar, any level after beat 5) | c1-scholar-offer, c1-scholar-wait, c1-sample-spring (heartroot spring), c1-sample-coast (Mossfall islet), c1-sample-pool (Fawnrest pool), c1-scholar-done (shows Luminara's reply: "Stop measuring."), c1-scholar-after | `s4-open`, `s4-spring`, `s4-coast`, `s4-pool`, `s4-samples`, `s4-done` |
| S6 The Bounty Nobody Can Name (board, after the node, level 10) | c1-board entry, c1-den-enter, c1-bounty-relic (the purse came from Aldric's buyers; hand over the relic for gold, or keep it) | `s6-open`, `s6-kept` or `s6-sold`, `s6-done` |
| S7 At the Edge of the Wood (Thornway, level 4) | c1-goblin (the Rot kills their forage; the town blames them), c1-goblin-after | `s7-open`, `s7-helped` or `s7-chased`, `s7-done` |
| S8 Cargo, Hire Rates (hire posts, level 6+) | c1-cargo (take a cargo job at a hire post), c1-cargo-paid | `progress.flags.cargo = { to, pay }`; paid on landing at `to` |
| S9 The White Deer Come Home (keeper, after the node) | c1-keeper-deer, c1-deer (x2, lead one home), c1-keeper-home | `s9-open`, `s9-deer-1`, `s9-deer-2`, `s9-done` |

**Deferred to T3:** S5 Caravan to the Keep. The board lists it after `c1-done` as "leaves when the Hearth Road opens"
with no quest yet.

**S1 without painting 7.** The cove is a scene: c1-wenna → c1-cove-arrive (night, Auros overhead) → fight
`c1-fjord-crew` → c1-cove-skeet → fight `c1-fjord-cove` → c1-cove-receipts → back at th-mosswatch-1 `from-mossfall`.
The optional gar fight `c1-fjord-inlet` is a choice in c1-cove-arrive ("Wenna says keep clear of the inlet").

**S8** is last in priority. Cut it if WP E runs late.

### 3.3 Objectives (`src/data/thareia/objectives.js`)

Add Chapter 1 entries above the Prologue ones, first match wins:
`c1-done` → none (the card). `c1-lens` → "Show Aldric the lens." `c1-stair-found` → "Go down the stair under the
court." `c1-to-fawnrest` → "Go through the Hindwood to Fawnrest." `c1-west-open` → "Take the west road to Mosswatch
Tower." `c1-pulse` → "Tell Aldric about the warm water." `c1-warm-water` → "Rest at Eldergrove's hearth."
`c1-circle-saved` → "Go under the Eldest Tree." `c1-taela-guest` → "Stop the burners at the stone circle."
`c1-thornway` → "Find Taela Greenmantle at the Eldest Tree." `c1-courier` → "Take the Thornway to Eldergrove."
`c1-start` → "Find Aldric Fernshaw." Each names its map and entity for the mini map star.

### 3.4 Rules changes for WP A (`src/rules/story.js`)

- `{ join: id, guest: true }`: the hero joins with `roster[id].guest = true` and level `party + HEROES[id].guestLevel`.
  `{ join: id }` on a hero already present as a guest clears `guest` and sets the level to
  `max(her level, the hero's level)`. Change Yara's T1 join to `{ join: 'yara', guest: true }` so her behaviour stays.
- `{ end: 'chapter-1' }`: shows the card "Chapter 2: The Hearth's Tune", like `end: 'prologue'`.
- `{ item: id }` for key items (`th-lens`, `th-buyers-letter`) if no such effect exists yet.

---

## 4. Party: Taela Greenmantle (WP C)

### 4.1 Hero entry (`src/data/heroes.js`, after `yara`)

```js
taela: {
  id: 'taela', name: 'Taela Greenmantle', title: 'druid of Eldergrove', race: 'half-elf', role: 'Healer and Verdant magic',
  base: { STR: 10, DEX: 13, CON: 13, INT: 12, WIS: 16, CHA: 11 },
  hpDie: 8, mp: { base: 10, perLevel: 3, stat: 'WIS' },
  domain: 'attunement', secondary: ['knowledge'],
  prof: { weapons: ['staff', 'spear', 'dagger'], armor: ['robe', 'leather'], offhand: ['focus'] },
  asi: [['WIS', 'CON'], ['WIS', 'DEX']],
  skills: [{ level: 1, id: 'mend' }, { level: 1, id: 'root-snare' }, { level: 2, id: 'ward' },
    { level: 3, id: 'draw-the-rot' }, { level: 4, id: 'heartwood-splinters' }, { level: 5, id: 'greenmantle' },
    { level: 6, id: 'dawnsong' }, { level: 8, id: 'revive' }, { level: 9, id: 'cool-the-roots' }],
  gear: { weapon: { base: 'quarterstaff', rarity: 'wrought' }, body: { base: 'robe', rarity: 'worn' },
    head: { base: 'hood', rarity: 'worn' } },
  traits: [{ id: 'rootbound', name: 'Rootbound', text: 'Years in the Rot: cannot be Rotting.', immune: ['rotting'] }],
  refuses: { kinds: ['mail', 'plate'], text: 'Taela will not wear metal. Eldergrove does not make it.' },
  guestLevel: 1,
  blurb: 'Fierce and exhausted. She has cut dead root out of Eldergrove for years, and she is done believing it is a disease.',
},
```

Check that `refuses` works for armor kinds; if it only covers weapon kinds, leave `prof.armor` as the guard and drop
`refuses`. If `quarterstaff` or `hood` bases do not exist, use the nearest (`staff`, `cowl`). Add a wooden focus base
only if one exists.

**Decided:** secondary is `['knowledge']` (beastmastery has no skills yet).

### 4.2 New skills (`src/data/skills.js`)

| id | target | effect | mp |
|---|---|---|---|
| root-snare | enemy | a copy of `rootbind` that scales off WIS | 3 |
| draw-the-rot | ally | cleanse `['rotting', 'poisoned']`, heal 1d6+WIS | 3 |
| greenmantle | ally | apply `regenerating` | 4 |
| cool-the-roots | all allies | cleanse `['burning']`, apply `warded` | 7 |

### 4.3 When she joins

- Guest at beat 4 (`c1-shard-glows`), one level above the party. A guest counts in fights and gets full XP (awardXp
  gives every active hero the full amount). A guest does not count in `partyLevel()`.
- For good at beat 14 (`c1-node-cools`), at `max(her level, the hero's level)`.
- **Change in `src/rules/gauntlet.js`:** `partyLevel()` averages non-guest heroes only. This stops a low guest dragging
  zone levels and the level-10 gates down.

### 4.4 Look

16×24 walker and 64×64 battle rig. Slight but not Aurosi-light ("carved from heavier wood"). Ears half-pointed. Dark
auburn hair tied back with leaves and twine. A long moss-green hooded mantle, patched, its hem stained black from the
Rot. Bark-stained hands and forearms. Tired eyes with shadows under them. Soft wrapped boots. A living-wood staff with a
twig still sprouting. Add her to the hero art the same way `yara` was added in T1, with a portrait for the party screen.

---

## 5. Fights (WP D)

All in `src/data/thareia/encounters.js` with the T1 helper `S(family, level, o)` (`noWaking: true`, `gearTier: 0`
unless set). Story fights are `once`. Until Taela joins, a fight has at most 2 foes and none above the hero's level.

**Decided on names.** The `tallyman` family is reused for stats only. Every spawn sets `name` so the word "Tallyman"
never shows: "Crate-Runner", "Lamp-Runner", "Hollis Fairweight", "Vesper". Relic text that mentions tallies or the
Brand gets a Thareia copy of the relic or is rewritten in place for Thareia.

### 5.1 Encounters

| id | map / at | spawns | mode | backdrop | XP | notes |
|---|---|---|---|---|---|---|
| c1-landing | th-thornhollow (trigger) | cutpurse 2, cutpurse 1 | story, once, gentle | verdant-wood | 21 | worn belt-knife/hood drop 35% |
| c1-verdant-edge | th-thornway (trigger) | briarling 3, thornhound 3 | story, once | verdant-wood | 42 | teaches Rooted |
| c1-runner-camp | th-thornway [11,40] | tallyman 4 `{ name: 'Crate-Runner', relics: ['tallyknife'] }`, cutpurse 3 | block, once | verdant-wood | 85 | the solo hero's first relic |
| c1-bramble-deep | th-thornway [15,20] | bandit 4 `{ gearTier: 1, wears: ['thornwatch-boots'] }`, briarling 4 | block, once | verdant-wood | 92 | starts S2 |
| c1-snag-wallow | th-thornway [22,34] | oldsnag 6 (thornsplitter) | lair, once, optional | verdant-wood | 288 | text: "Come back with someone at your back." |
| c1-grove-circle | th-eldergrove [4,6] | feral-druid `thornmother` 5 `{ name: 'Oda the Thornmother' }`, briarling 4 | lair, once, story | eldergrove | 268 | Oda flees (text), she is not killed |
| c1-roots-grubs | th-heartroot-1 [13,20] | rotgrub 6 ×3 | block, once | heartroot | 126 | |
| c1-roots-sapwight | th-heartroot-1 [13,1] | sapwight 6, rotgrub 5 ×2 | block, once | heartroot | 166 | |
| c1-missing-patrol | th-heartroot-1 [19,11] | hollowed-ranger `sergeant` 7 `{ name: 'Sergeant Edda Vane' }`, hollowed-ranger 5 ×2 | block, once, optional | heartroot | 496 | the rangers wear Thornwatch longbow and brigandine at gearTier 1 |
| c1-mire-bog | th-mossfall [24,14] | boglurcher 5 ×2, smuggler `reedcutter` 5 | pack, optional | mossfall | 105 | |
| c1-mf-runners | th-mossfall [42,13] | smuggler 5 ×2 | block, once, optional | mossfall | 70 | opens the ford chain |
| c1-mire-shrine | th-mossfall [42,18] | mirelord 6 `{ name: 'Gorrow' }` (mire-pearl), boglurcher 5 | lair, once, optional, hard | mossfall | 323 | |
| c1-mw-stair | th-mosswatch-1 [7,4] | tallyman 6 `{ name: 'Lamp-Runner' }`, smuggler 6 | block, once, main | mosswatch | 138 | |
| c1-mw-lantern | th-mosswatch-2 [6,5] | tallyman `signalmaster` 7 `{ name: 'Hollis Fairweight' }` (mosswatch-lantern), smuggler 6 | lair, once, main, dark | mosswatch | 378 | |
| c1-fjord-crew | S1 scene / th-fjords-cove | smuggler `diver` 7, smuggler `bargehand` 7, smuggler 7 | once, dark | mosswatch | 147 | |
| c1-fjord-cove | S1 scene / th-fjords-cove | smuggler `queen` 8 `{ name: 'Skeet Marrow' }` (lightfingers), smuggler 7 | once, dark | mosswatch | 433 | Skeet as the relic-bearer |
| c1-fjord-inlet | S1 scene, optional | blackwater-gar 7 ×2 | once, dark | mosswatch | 98 | |
| c1-glowcaps | th-hindwood [25,22] | glowcap 7 ×3 | block, once | verdant-wood | 147 | |
| c1-feral-druid | th-hindwood [18,28] | feral-druid 7, thornhound 7 ×2 `{ name: 'Rot-Twisted Hound' }` | pack, once | verdant-wood | 210 | skipped if `s3-talked` |
| c1-vesper | th-fawnrest [16,13] | tallyman `apothecary` 7 `{ name: 'Vesper' }`, smuggler 7 ×2 | block, once, optional, talk | fawnrest | 210 | "miracle sap"; the check uses the hero, not Alondra |
| c1-node-stair | th-fawnrest-node [9,16] | rotgrub 8 ×2, mire-leech 8 | block, once | fawnrest-node | 168 | |
| c1-node-roots | th-fawnrest-node [9,7] | sapwight 8 ×2 | block, once | fawnrest-node | 256 | |
| c1-guardian | th-fawnrest-node [8,4] | rotstag `guardian` 9 | lair, once, noFlee, boss | fawnrest-node | 990 | section 5.2 |
| c1-gloamwing | th-hindwood [22,12] | gloamwing 10 (dawnbell) | lair, once, optional, after node | verdant-wood | ~480 | size with sim |
| c1-dael-bounty | th-briarmaw-den [8,5] | briarmaw 10 `{ name: 'The Nameless Beast' }` | lair, once, optional, after node | briarmaw-den | ~480 | S6 |

Hearthfires (type `hearthfire`, add ids to `TH_HEARTH_IDS`): `th-tw-hearth` (The Thornway Stone), `th-eg-hearth`
(Eldergrove Hearth), `th-hr-coal` (The Last Green Coal, cold), `th-mf-cairn` (Mossfall Cairn), `th-mw-hearth` (Garret's
Kitchen), `th-mw-fire` (The Mosswatch Fire, cold), `th-hw-cairn` (Hindwood Cairn), `th-fr-camp` (The Pilgrims' Fire),
`th-fr-stone` (The Dreaming Stone, cold).

**Relic power (Decided for T2, see question 2):** rootsong, oathshield, mosswatch-lantern, mire-pearl and lightfingers
keep their stats. If sims show a level spike past the targets below, add Thareia copies at ilvl 6-8.

### 5.2 The boss: the Hart of Fawnrest

Add `rotstag.variants.guardian` in `src/data/foes.js` (familyOf spreads variant fields over the family, like the bandit
`poacher` and tallyman variants). New relic `fawnrest-heartstone` in `src/data/relics.js` (amulet, ember, grip about 28,
ilvl 9: "the node's sunstone, grown through its chest").

- Name "The Hart of Fawnrest". Tier `champion`. `unique`, `noFlee`. Level 9.
- Base hp 110 (321 at L9). Guard 15 (17). atk 5 (9). dmg 1 (5). `weak: ['frost']`.
- Relics: `rotwood-circlet` (grip 24), `fawnrest-heartstone` (grip 28). Loot also: the shrine's lost bell (a key item or
  a trinket; not the old dawnbell relic).
- Moves: gore (2d8 pierce), trample (1d8 crush, all), rot-bellow (CON save or Poisoned), antler-charge (charge, 3d8 +
  Staggered), rotwood-crown (needs circlet; 2d6 blight all, CON half, heals it; applies Rotting), node-flare (needs
  heartstone, else gore; 2d6 ember all, DEX half, Burning), root-call (summon rotgrub, max 2, levelDelta -3), overheat
  (needs heartstone; charge, 3d8 ember + Burning on one hero; Stagger cancels it).
- Phases (d20): at 1.0 "The guardian wakes": 1-7 gore, 8-11 trample, 12-15 rot-bellow, 16-20 rotwood-crown.
  At 0.66 "The node answers": 1-5 gore, 6-8 antler-charge, 9-12 node-flare, 13-15 root-call, 16-20 rotwood-crown.
  At 0.33 "The last white stag": 1-4 gore, 5-9 overheat, 10-14 node-flare, 15-17 antler-charge, 18-20 rot-bellow.
  With both relics pried loose, only gore, trample, antler-charge and bellow remain.
- Dies with a mournful tone and a silent amber flare; drops crystals (flavour loot, e.g. ember-salts). It has no lines.
  It is never called one of Sedrin's amber-veined creatures.

### 5.3 Zones and patrols (`src/data/encounters.js` ZONES and PATROLS, Thareia section)

Pack level is `ZONES[id].level + rng.int(0,1)`. Each zone sits one below the expected arrival level.

| zone | level | patrol sets | backdrop | map |
|---|---|---|---|---|
| th-landing | 2 | [cutpurse, cutpurse], [thornhound], [briarling, briarling] | verdant-wood | th-landing (when it exists) |
| th-thornway | 3 | [briarling, thornhound], [cutpurse, briarling], [thornhound, thornhound] | verdant-wood | th-thornway |
| th-roots | 6 | [rotgrub ×3], [rotgrub, rotgrub, mire-leech], [mire-leech, mire-leech] | heartroot | th-heartroot-1 |
| th-mossfall | 6 | [smuggler, boglurcher], [boglurcher, boglurcher], [smuggler reedcutter, smuggler, mire-leech] | mossfall | th-mossfall |
| th-hindwood | 7 | [glowcap, glowcap, thornhound], [thornhound, thornhound, briarling], [glowcap, mire-leech] | verdant-wood | th-hindwood |

**Decided:** th-thornway's 3-foe set from the report is cut to 2 foes (the hero is alone there). No roaming in
th-thornhollow, th-eldergrove, th-mosswatch-*, th-fawnrest or th-fawnrest-node.

### 5.4 Backdrops

| key | fights | art |
|---|---|---|
| verdant-wood | landing, Thornway, Hindwood, gloamwing | painting 8 replaces the drawn one |
| eldergrove | c1-grove-circle | painting 9 |
| heartroot | Heartroot fights | stays drawn |
| mossfall | Mossfall fights | stays drawn |
| mosswatch | tower and S1 fights (dark ones drawn darker) | painting 11 (Nice) |
| fawnrest | c1-vesper | `art-in/scenes/battle-forest-ruins.png` now, `--key=fawnrest` |
| fawnrest-node | NEW key: node fights and the boss | painting 10; drawn fallback: the heartroot drawing tinted amber |
| briarmaw-den | c1-dael-bounty | stays drawn |

### 5.5 Balance targets

XP curve: `xpToNext(L) = round(30·L^1.55)`. Totals: L3 118, L4 283, L5 540, L6 904, L7 1386, L8 1998, L9 2751,
L10 3655, L11 4719.

| Point | Target party level | Checked total XP (report) |
|---|---|---|
| Arrive at Eldergrove | 4 | about 508 |
| After the Heartroot | 6 | about 1285 |
| After Mosswatch (main path) | 7-8 | about 1800-2000 without S1 |
| Enter the node | 9 | about 2800-3100 |
| After the boss | 10 | about 3800-4000 |
| Everything optional done | 11-12 | about 5400 |

- Solo stretch (levels 2-4): no fight wipes a hero who rests at each hearth. The veteran foe per fight is at most
  level 4.
- Boss: 30-40% first-try wipe for hero plus Taela at level 9; about 20% if the heartstone's grip is broken early.
- Add a `tools/sim.mjs` mode `--route=thareia-c1` that plays the main path on Auto and prints level at each point and
  the boss wipe rate over 200 runs. Tune spawn levels, not the XP curve.
- If the solo stretch walls, the lever is a Thornwatch guest for the bramble fight (Pip, already a hero id). Do not
  change the party list.

---

## 6. Airship (WP E)

### 6.1 The rented skiff

- **Decided:** Aldric's 30 gp deposit (beat 7) is the licence. Before `c1-skiff-rented`, every hire post says no. After
  it, each flight costs 10 gp, paid in dialogue before take-off. The fee covers the sunstone; no fuel system.
- It is the same `skiff-top.webp`, tinted in code in `buildShip()`: a striped pennant and a blue-and-white sail band
  (through a colour mask like the crystal glow mask). Painting 16 replaces this when it arrives.
- The hero flies it (pilot `warden`). Take-off line is a narrator line: "Licensed docks only, and bring her back in one
  piece."
- At 1× it steers freely over the Verdant Wilds only. It lands only at a dock where `dockState` is ok (licensed, level
  and story pass, within LAND_R). It may land at a licensed dock never visited. It may land back where it took off (the
  fee is lost), so the hero is never stuck.
- On the world map, only known docks (`progress.flags.docks[id]`) that pass `dockState` can be tapped; the skiff then
  flies itself there.
- Not allowed: the Fjords harbour (no licence), the Gloomfen and Bogmire (level 36, own skiff), the Heartland and the
  Keep (Chapter 2, T3).

### 6.2 Docks (`src/data/thareia/sky.js` DOCKS)

New fields: `license: [...]`, `level`, `if` (a cond.js condition), `hire: true` (has a hire post), `world: [x,y]`
(optional override for toWorld).

| id | region | at (region painting) | map / anchor | license | level | if | hire |
|---|---|---|---|---|---|---|---|
| thornhollow | verdant | [1232,566] (keep) | th-thornhollow / from-skiff | ticket, hire, own | 1 | — | yes |
| eldergrove | verdant | [1278,300] | th-eldergrove / from-skiff | hire, own | 1 | — | yes |
| mosswatch | verdant | [715,462] | th-mossfall / from-skiff | hire, own | 1 | `{ flag: 'c1-west-open' }` | yes |
| fawnrest | verdant | [1075,705] | th-fawnrest / from-skiff | hire, own | 1 | `{ flag: 'c1-to-fawnrest' }` | no (land only) |
| fjords | verdant | [365,205] | none in T2 | [] | 1 | — | no; drawn grey, "no licence" |
| bogmire | gloomfen | [405,470] (keep) | bogmire-docks / from-skiff | ticket | 36 for hire/own | — | no |

**Decided:** the Keep dock and the Heartland region are T3. In T2 the skiff turns back at every edge of the Verdant
painting with the hire flight's `edge` line ("The licence stops at the edge of the Wilds."). T3 adds `heartland`
({col:1,row:0}, `heartland.webp`), the Keep dock at [1035,745] with `world: [815,415]`, level 10 and
`if: { all: [{ level: 10 }, { flag: 'c1-node-cooled' }] }`.

Place the world-map markers by eye; add `world` overrides where toWorld misses the continent feature (Mosswatch lands
about (238,232) but the continent's tower is near (280,185): use `world: [280,185]` after checking).

### 6.3 Flights (`FLIGHTS`)

- `hire`: `{ ship: 'rented', license: 'hire', free: true, pilot: 'warden', fee: 10, lines, says: { mapHint, locked,
  unlicensed, unknown, edge } }`. `from` comes from the open string; `to` is null.
- Move the hardcoded strings in `src/ui/screens/sky.js` (the `'yara'` speaker, "The fare is to...", "We just came from
  there") into `first-flight.says`. Both flights read their lines from data.

### 6.4 Rules (new `src/rules/sky.js`, pure)

- `dockState(game, dock, flight)` → `{ ok, why }` with `why` in `'licence' | 'level' | 'story' | 'unknown'`.
  Licence: `dock.license` includes `flight.license`. Level: the hero's own level (not partyLevel) ≥ `dock.level`.
  Story: `cond.check(dock.if)`. Unknown: world-map taps only, dock not in `flags.docks`.
- `regionOpen(game, region, flight)` → the same shape, from `SKY_REGIONS[id].level`, `license`, `if`.
- Region data: `verdant` level 1, license [ticket, hire, own]. `gloomfen` level 36 for hire/own; the ticket may still
  cross it (the Prologue flight).

### 6.5 Screen changes

- `src/ui/screens/world.js` (around line 782): parse `'sky:hire@<dock>'` into `leave('sky', { flight: 'hire', from:
  '<dock>' })`. Keep `'sky:first-flight'` working.
- `src/ui/screens/sky.js` mount takes `{ flight, from }`. For hire flights `to` is null until the player picks a dock.
- Guard every use of `to`: the route line (about line 268), the off-screen arrow (about 297) and the bearing in `hud()`
  (about 312). With no `to`, draw no route line; point the arrow at the picked dock, else the nearest landable one. Aim
  text: "Rented skiff: licensed docks only" or "To <dock>: <bearing>".
- Replace `allowed(d)` (about line 84) with `dockState`. At 1×, draw every dock in the region: lit when ok; grey with a
  padlock and "Lv N" for level; grey with "no licence"; not drawn when `if` hides it. `dockNear()` offers Land only for
  ok docks. For hire flights the origin dock is ok.
- World map `pickDock` (about lines 155-164): for hire flights only known, ok docks are tappable. Otherwise play
  `ui-error` and show the flight's `says` line for the reason. Draw unknown docks faintly. No fixed route line.
- Region edge (about lines 217-223): also check `regionOpen`; a closed region turns the skiff back with `says.edge`.
- `arrive()`: keep writing `flags.docks[id]`. Also count `progress.flags.hired` for the Journal. No gold in sky.js.
- **Fee and saves.** The save is written on arrive. Check what a reload mid-flight does. **Decided:** write the save
  right after the fee is paid (before the sky opens), so a reload keeps the fee spent and puts the hero back at the
  origin dock. Refusing to land farms nothing.

---

## 7. Tests (WP F)

### 7.1 `test/thareia.test.mjs` (add)

1. Every th-* map: rows from the legend; anchors walkable; entities and exits in bounds; copies keep the old rows and
   set `paint`; lock/gate/chest/trigger ids unique across all maps; hearthfires touch their stand.
2. Reachability: from each arrival anchor, every main-path entity is reachable once the gates the story has opened by
   then are open (th-thornway with `c1-runner-camp` and `c1-bramble-deep` beaten reaches `tw-n`; th-heartroot-1 with
   both knots open reaches `c1-hr-spring`; th-fawnrest-node reaches `c1-guardian` with both gates open).
3. Every th-* exit's `to` and `anchor` exist; every gated exit has `sealed` text.
4. Every NPC's talk dialogues exist; every dialogue speaker is an NPC, a hero or `narrator`; every `fight` names an
   encounter; every `cut` names a CUTS key or has a drawn fallback; every flag read somewhere is set somewhere.
5. The chapter played through the rules (like the Prologue test): from a T1-end state, walk the flags of section 1 by
   entering dialogues and marking fights won, and check at each step: the objective text, `talkTo` for Aldric, Dael,
   Taela, Garret and the keeper, `c1-taela-guest` puts Taela in the party with `guest: true`, `c1-node-cools` clears
   `guest`, and `end: 'chapter-1'` fires once.
6. `partyLevel()` ignores guests (hero L4 alone plus guest Taela L5 gives 4).
7. `dockState`: before `c1-skiff-rented` no hire; Eldergrove ok for hire; Fawnrest hidden before `c1-to-fawnrest`;
   fjords `licence`; bogmire `licence` for hire; unknown dock refused on the world map but allowed at 1×.
8. `regionOpen`: hire refused over the Gloomfen; the ticket allowed.
9. The hire choice is disabled when gold < 10 and costs exactly 10 once.
10. Encounters: every Thareia fight's families exist; no spawn shows the word "Tallyman"; solo fights (before
    `c1-taela-guest`) have at most 2 foes and no foe above level 4; the guardian variant builds at L9 with 321 hp.
11. Language guard: no Chapter 1 line contains "Dustveil", "Cistern", "Unwaning", "Tallym", "Brand", "Sleeper",
    "Rotwarden", or a day count after beat 6.

### 7.2 `tools/e2e-t2.mjs` (new; same frame as `tools/e2e-t1.mjs`)

Start from a fixture save at `c1-start` (add `tools/fixtures/t2-start.json` built by a small script from the T1 end
state), loaded through the `__aethTest` hook. Steps, one screenshot each, into `tools/shots/t2/`:

1. Load at Thornhollow; the crate-thieves fight on Auto; win.
2. Aldric: 10 gp, courier job; the north gate opens.
3. The hire clerk refuses (deposit).
4. Walk out the north gate; the Thornway trigger fight; the runner camp; the bramble fight (Auto).
5. Eldergrove: Taela; the shard cut (painted or drawn); Taela in the party as a guest.
6. The grove circle fight; under the tree; both knots; the warm spring.
7. The pulse at the hearth (the cut, then the note toast).
8. Back at Thornhollow: Aldric pays the deposit; Dael opens the west gate.
9. Hire a flight at Thornhollow (gold drops by 10 once); at 1× tap the fjords dock (refused, "no licence"); land at
   Mosswatch.
10. The tower: stair fight, lantern fight, the Rot line; the Hindwood gate opens.
11. Hire back to Thornhollow; walk the Hindwood; talk the burners down.
12. Fawnrest: the keeper, the court, the stair.
13. The node: two fights, the node cut, the boss on Auto (retry up to 3 times), the cooling cut; Taela no longer a guest.
14. Aldric's letter; Dael; the Chapter 2 card.

Fail on any page or console error. Also run at `--laptop`.

Keep `npm test`, `npm run lint`, `node tools/e2e-t1.mjs` green.

---

## 8. Art (WP G)

Numbers are from `design/08-image-prompts.md`. Nothing waits on art: each piece has a drawn fallback.

| # | File | Used by | Import | Fallback until it arrives |
|---|---|---|---|---|
| 5 | walk-thornhollow-landing.png (Must) | th-landing map (2.11) | trace, then `paint-import --map=th-landing` | the landing stays inside th-thornhollow at `from-skiff` |
| 6 | walk-fawnrest-node.png (Must) | th-fawnrest-node | trace, then `--map=th-fawnrest-node` | the drawn tile map in 2.10 |
| 7 | walk-drowned-fjords-cove.png (Nice) | S1 cove | trace, then `--map=th-fjords-cove` | S1 as a scene (dialogue plus fights) |
| 8 | battle-verdant-road.png (Must) | backdrop `verdant-wood` | `backdrop-import --key=verdant-wood` | the drawn verdant-wood |
| 9 | battle-eldergrove.png (Must) | backdrop `eldergrove` | `--key=eldergrove` | drawn |
| 10 | battle-fawnrest-node.png (Must) | backdrop `fawnrest-node` | `--key=fawnrest-node` | the heartroot drawing tinted amber |
| 11 | battle-mosswatch-coast.png (Nice) | backdrop `mosswatch`; also the Rot-line scene | `--key=mosswatch` | drawn |
| 12 | cut-shard-glows.png (Must) | cut `shard-glows` (beat 4); night-tinted as `grove-pulse` (beat 6) | `paint-import --cut=shard-glows` | the drawn backdrop, as T1 does |
| 13 | cut-node-overheats.png (Must) | cut `node-overheats` | `--cut=node-overheats` | drawn |
| 14 | cut-guardian-wakes.png (Must) | cut `guardian-wakes` | `--cut=guardian-wakes` | drawn |
| 15 | cut-node-cools.png (Nice) | cut `node-cools` | `--cut=node-cools` | drawn |
| 16 | airship-rental-skiff.png (Nice) | the rented skiff sprite | `tools/sky-assets.mjs` | the tinted skiff (6.1) |
| — | art-in/scenes/battle-forest-ruins.png (have it) | backdrop `fawnrest` | `backdrop-import --key=fawnrest` now | — |

Cut `grove-pulse` reuses painting 12 with a night tint and Auros drawn in; no new painting. Register every cut id in
`src/ui/assets/cuts/index.js` (CUTS). The Chapter 2 card reuses the end-card frame from T1.

Most wanted first: 6, 10, 12, 13, 14, then 8, 9, 5.

Budget: the build is about 7.5 MB. The new maps reuse paintings already in the old game; add each to the build list.
Expect about +1.5 MB for paintings 6, 8, 9, 10, 12-14.

---

## 9. Open questions for the player

1. **Taela early.** The design says "Taela joins" at the chapter's end. This spec has her fight beside you as a guest
   from Eldergrove (a lone hero from level 4 to 9 needs a healer) and join for good at the end. Is that all right?
2. **Old relics.** Rootsong, the Mosswatch Lantern, the Mire Pearl, the Oathshield and Lightfingers were tuned for
   level 11-12 in the old game. Keep them strong as Chapter 1's big rewards, or tone them down to fit levels 5-8?
3. **The Rot scholar.** Canon mentions an unnamed elven scholar thirty years into studying the Rot. This spec names a
   new one (Illeth Sarovan). Would you rather he be Vaelis of Luminara, who is canon but would change his story?
4. **The skiff-hire office.** A separate hire company (this spec), or Yara's side business?
5. **Taela's elven parent.** Canon elves are Aurosi. Leave her parentage vague (this spec), or decide it now: a parent
   from the Aurosi who came 30-40 years ago, or one who stayed after an earlier Approach?
