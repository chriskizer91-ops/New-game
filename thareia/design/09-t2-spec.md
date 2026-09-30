# 09 — T2 spec: Chapter 1, "The Rot's Roots"

T2 builds Chapter 1 in the Verdant Wilds, levels 1 to 10, with the rented skiff and the player's 3D ship. It follows
the T1 patterns in `07-t1-build.md`: Thareia content lives in `src/data/thareia/*`, and each old map Thareia walks gets
a `th-<id>` copy in `src/data/maps/` that keeps the old rows and draws the old painting through `paint`. Story effects
are `join`, `leave`, `cut`, `note`, `set`, `gold`, `pay`, `open`, `fight`, `end`, plus the new `kindle`, `key`, `go`
and `unlock` (section 3.4).

Canon source: `lore/thareia-aethermoor-lore-compendium.md`. Where the reports disagreed, this spec has already chosen.
The choices are marked **Decided**. This revision folds in all 34 fixes from `design/09-t2-spec-critique.md` (each is
tagged `[C<n>]` where it lands) and the player's answers to the open questions (section 9).

Paths are relative to `thareia/game/` unless they start with `design/` or `art-in/`.

## 0. Build plan: one foundation, then five content packages

**Rule:** a file has one owner. A content package never edits a file another package owns. The foundation runs first
and creates every shared registration point and every stub file, so the content packages only fill files they own.
Every package runs `npm test`, `npm run lint`, `node tools/e2e-t1.mjs` and `npm run build` before it hands over.
Every package may add its own test file `test/c1-<package>.test.mjs`. Nobody runs `git commit` or `git push`.

| Pkg | What | Owns (creates or edits) | Spec |
|---|---|---|---|
| F | Foundation: engine, merge points, stubs | see 0.1 | 3.4, 3.5, 4.3 (rules), 6.5 (world.js parse), 7.3 |
| M | Walked maps: the nine `th-*` copies | `src/data/maps/th-thornhollow.js`, `th-thornway.js`, `th-eldergrove.js`, `th-heartroot-1.js`, `th-mossfall.js`, `th-mosswatch-1.js`, `th-mosswatch-2.js`, `th-hindwood.js`, `th-fawnrest.js`, `th-briarmaw-den.js` | 2.1-2.9, 2.12 |
| P | People and scenes | `src/data/thareia/c1-dialogue.js`, `c1-npcs.js`, `c1-objectives.js`, `c1-quests.js`, `c1-shops.js`, `c1-keys.js` | 1, 3 |
| T | Taela, the fights and the relics | `src/data/heroes.js`, `src/data/skills.js`, hero art (`src/art/hero-looks.js`, `src/art/heroes.js`, `src/art/walkers.js`), `src/data/thareia/c1-encounters.js`, `src/data/thareia/c1-world.js`, `src/data/foes.js`, `src/data/relics.js`, `tools/sim.mjs` | 4, 5 |
| A | The airship and the 3D ship | `src/data/thareia/sky.js`, new `src/rules/sky.js`, `src/ui/screens/sky.js`, `src/ui/sky.css`, new `src/ui/sky3d/*`, `src/ui/assets/sky/*`, `tools/sky-assets.mjs`, `package.json`, `package-lock.json`, **`tools/build.mjs`** | 6 |
| G | Art imports and the new painted maps | `src/data/maps/th-landing.js`, `th-fawnrest-node.js`, `th-fjords-cove.js`, `src/ui/assets/paint/*`, `src/ui/assets/cuts/*`, `src/art/painted-backdrops.js`, `src/art/map-sprites.js`, `src/ui/world/view.js`, `tools/paint-import.mjs`, `tools/backdrop-import.mjs` | 2.10, 2.11, 8 |
| I | Integrator | `test/thareia.test.mjs`, new `tools/e2e-t2.mjs`, `tools/fixtures/t2-*.json`, `design/*` wording | 7 |

**`tools/build.mjs` [C33]:** the airship package A owns it after the foundation's one change (F moves the paint list to
skip missing files, 0.1). A raises the game-code limit and switches the delivery name (6.7). Nobody else edits it; G's
new paintings get into the file through F's list without touching `build.mjs`.

**`test/thareia.test.mjs` [C34]:** only I edits it. M keeps `th-thornhollow`'s rows unchanged (so line 72 stays
green). F moves the Thornhollow landing to `th-landing` (2.11) and runs the T1 test and e2e itself.

### 0.1 Foundation (F) owns

Engine: `src/rules/story.js`, `src/rules/cond.js`, `src/rules/world.js` [C30], `src/rules/gauntlet.js` (partyLevel),
`src/ui/world/story-fx.js` [C7], `src/ui/screens/world.js`, `src/ui/screens/journal.js`, `src/ui/screens/aftermath.js`,
`src/ui/lib/carry-facts.js`, `src/ui/lib/items.js`, `src/ui/card.js` (the day displays, [C18]).

Merge points (each imports a `src/data/thareia/c1-*.js` stub that F creates empty and a content package fills):
`src/data/dialogue.js` (DIALOGUE, AFTER, RESTS from `c1-dialogue.js`), `src/data/npcs.js` (`c1-npcs.js`),
`src/data/encounters.js` (ENCOUNTERS and PATROLS from `c1-encounters.js`; BACKDROPS gets `'fawnrest-node'`),
`src/data/world.js` (ZONES and HEARTHS from `c1-world.js`), `src/data/quests.js` (QUESTS from `c1-quests.js`) [C31],
`src/data/shops.js` (`c1-shops.js`), `src/data/thareia/objectives.js` (Chapter 1 entries from `c1-objectives.js`, put
above the Prologue's), `src/data/thareia/encounters.js` (TH_HEARTH_IDS also lists `C1_HEARTH_IDS`).

T1 data edits: `src/data/thareia/dialogue.js`: `th-landing` also sets `c1-start` [C13]; `th-yara-hired` joins Yara as
`{ join: 'yara', guest: true }`. `src/data/maps/th-thornhollow.js`: the `th-landing` trigger moves to `th-landing.js`;
F then hands `th-thornhollow.js` to M. `src/data/thareia/sky.js`: `DOCKS.thornhollow` moves to `th-landing /
from-skiff`; F then hands `sky.js` to A.

Map registration: `src/data/maps/index.js` imports and lists every new map, and `TH_MAP_IDS` lists them. F creates
each stub map file so the game runs before M and G fill them:
- the nine copies: `{ id, name, region: 'verdant', paint: '<old id>', rows: <old rows>, w, h, level, zone, backdrop,
  anchors: <every anchor in section 2>, entities: [], exits: [] }` (rows equal to the old map);
- `th-landing`: a small drawn clearing (about 24 × 16) with the anchors `from-skiff` and `from-town`, the T1 `th-landing`
  trigger (whole map, `if not th-landed`) and an exit `tl-n` to `th-thornhollow / from-landing`;
- `th-fawnrest-node`: the drawn tile map in 2.10, rows only, with its anchors and the `fn-up` exit;
- `th-fjords-cove`: a small drawn cove with the anchor `from-boat` and the exit `cove-boat`.

Build: `tools/build.mjs` `TH_PAINTINGS` becomes the full T2 list (`bogmire-docks`, `bogmire`, `thornhollow`, `thornway`,
`eldergrove`, `heartroot-1`, `mossfall`, `mosswatch-1`, `mosswatch-2`, `hindwood`, `fawnrest`, `briarmaw-den`,
`th-landing`, `th-fawnrest-node`, `th-fjords-cove`), and the plugin skips any id with no file in
`src/ui/assets/paint/`. After this change A owns the file.

---

## 1. Overview

**Two ways in.** A new game starts with a passage ticket (`th-ticket`). The player may board the skiff at once
(`th-board-early` sets `th-shard` and `th-early` and skips the dock fights), or take Yara's deckhand job and fight on the
docks first. Chapter 1 works for both:

| | Early route (`th-early`) | Fight route |
|---|---|---|
| Hero at the landing | level 1, 0 XP | level 2, 63 XP |
| Gold at the landing | 62 gp (50 start + 12) | 62 gp plus the dock fights' gold |
| Yara | never joined (`leave` is a no-op) | joined as a guest, left at the landing |
| Skeet Marrow | never met | beaten on the docks |
| The shard ring (runed, ilvl 2) | not given | given by `th-shard` |

**Decided:** no Chapter 1 line may assume the dock fights or Yara's hire. A line that refers to them has a twin for the
early route, picked with `{ beaten: 'pr-smugglers' }` or `{ flag: 'th-hired' }` (e.g. Skeet's "You again." in S1).
Every level target in section 5.5 is checked for both routes.

Chapter 1 flags use the prefix `c1-`. Side quest flags use `s1-` to `s9-`. The hero starts T2 alone at the Thornhollow
landing (`th-landing`), which is now its own painted map (painting 5 has arrived; 2.11).

**Decided:** the main path is the landing, Thornhollow, the Thornway, Eldergrove, the Heartroot, Thornhollow, Mossfall,
Mosswatch Tower (both floors), the Hindwood (the glowcaps and the burners' camp), Fawnrest, the node.

| # | Beat | Where | Party level (fight / early) | Flags set (in order) |
|---|---|---|---|---|
| 1 | The Prologue card closes (`th-landing` sets `c1-start`). Two road-rats cut the straps on the half-ruined crate by the skiff. Then, in town, Aldric pays 10 gp "for the half that did not sing", asks for quiet, and gives the courier job to Eldergrove. The north gate opens. | th-landing, th-thornhollow | 2 / 1 | `c1-start`, beaten `c1-landing`, `c1-aldric-met`, `c1-courier` |
| 2 | Ranger Dael: the Rot is worse, and the Mossfall road is shut by his order. His board posts the side quests. Hob Dustwind at the landing hire post will not rent to a stranger with no sponsor. | th-thornhollow, th-landing | 2 / 2 | `c1-dael`, `c1-saw-hire` |
| 3 | The Thornway on foot. Rot-bramble, road-rats, a bandit in ranger boots. The first grey trees whisper when the wind is still. | th-thornway | 3-4 / 2-3 | `c1-whisper`, `s2-lead` (boots) |
| 4 | Eldergrove. Taela reads Aldric's letter (it says nothing) and laughs once. The shard flares over the grey roots (cut `shard-glows`). "Do that again." She joins as a guest. Oda's burners are at the stone circle with torches, and the two stop them. | th-eldergrove | 4-5 / 3-4 | `c1-thornway`, `c1-met-taela`, `c1-shard-roots`, `c1-taela-guest`, `c1-circle-saved` |
| 5 | Under the Eldest Tree. Rotgrubs and a sapwight. The deepest root-spring runs warm. | th-heartroot-1 | 5-6 / 5-6 | `c1-warm-water` |
| 6 | That night, resting at Eldergrove's hearth (canon Day 4): the pulse. Every root glows gold for one breath. The grove is answering something far away. Never explained. | th-eldergrove (rest) | 6 / 6 | `c1-pulse` |
| 7 | Aldric hears "warm water" and admits his buyers asked for a map of where the crystal hums loudest. He sponsors the skiff hire (the deposit, and one prepaid flight). Dael opens the west road. | th-thornhollow | 6 / 6 | `c1-aldric-maps`, `c1-skiff-rented`, `c1-hire-ticket`, `c1-west-open` |
| 8 | Mossfall, then Mosswatch Tower. Crates on Garret's stair, and a signalman in the Lamp Room. Garret's map shows the Rot line bending inland toward Fawnrest; his tide logs say the ground water is warm. | th-mossfall, th-mosswatch-1, th-mosswatch-2 | 6-7 / 6-7 | `c1-mw-arrived`, `c1-mosswatch`, `c1-rot-line` |
| 9 | The line points at Fawnrest: the pilgrims stopped coming, because the pool runs hot enough to scald. The Hindwood road opens. | th-mosswatch-2 (Garret) | 7 / 7 | `c1-to-fawnrest`, `s1-open` |
| 10 | The Hindwood. The first Rot-twisted beasts; glowcaps choke both crossings of the stream. Oda's burners at their camp: talk them down with Taela, or fight. | th-hindwood | 7-8 / 7-8 | `c1-hindwood` |
| 11 | Fawnrest. No white deer. Sick pilgrims, a steaming pool. The keeper shows the stonework and the script round the Dreaming Stone. The shard drags the hero's hand to the court; the stones are warm. A stair under the court has been opened recently. | th-fawnrest | 8 / 8 | `c1-fawnrest`, `c1-stair-found` |
| 12 | The node. Fitted floors, straight channels, veins that meet at a round dais. The node glows white-hot (cut `node-overheats`). A silver ring holds a clear lens clamped to it, stamped with a small mark. | th-fawnrest-node | 8-9 / 8-9 | `c1-node-found`, `c1-lens-seen` |
| 13 | Boss: the Hart of Fawnrest (cut `guardian-wakes`). | th-fawnrest-node | 9 / 9 | beaten `c1-guardian` |
| 14 | The hart goes out in a silent amber flare and leaves crystals. The hero pries off the lens; the node drops to a steady gold. Taela sings the roots cool (cut `node-cools`). She joins for good and names Fen Rootwalker. | th-fawnrest-node | 10 / 10 | `c1-hart-beaten`, `c1-node-cooled`, `c1-taela-joined`, `c1-lens`, `s9-open` |
| 15 | Aldric sees the lens mark and goes white. He hands over one unsigned letter, paid in Sandspire silver, with the same seal. Dael: the Rot on the west road has stopped spreading. The Chapter 2 card. | th-thornhollow | 10 / 10 | `c1-aldric-letter`, `c1-done` |

[C22] Beat 6: canon has the pulse start far away (not named in Chapter 1) and go outward; the grove is the one answering.

**Timing rules [C18].** Beat 6 is canon Day 4, but nothing in the code ties it to `flags.day`: it happens at the first
rest at `th-eg-hearth` after `c1-warm-water` (a RESTS entry, [C17]). Once `c1-pulse` is set, a Thareia game shows no day
number anywhere (3.5). Sedrin never appears in Chapter 1, and never at Thornhollow. The hero never learns about the
egg-stone, Misthollow or Lira.

**Names Chapter 1 must not use:** Dustveil, the Cistern Lords, the Unwaning, Tallymen (or "Tallyman", "tally-seal"),
the Brand, the Sleepers, the Hollow Council, the Rotwarden, the First Seed. The lens and its mark stay unexplained. This
covers dialogue, NPC names and roles, encounter and foe names, relic names and text, lock and sign text, quest steps and
key items [C28].

**Tone rules.** No line assumes the hero is human or names a gender. Every night scene shows Auros in the sky. Nothing
says the Approach is close. Cooling one node must not read as the network settling (that is the Warming, Chapter 5).

**Writing rules.** Plain, short sentences. Every player-facing line is at most 140 characters.

---

## 2. Maps (M; G for 2.10 and 2.11)

Every copy follows `src/data/maps/th-thornhollow.js`: the same `rows`, `paint: '<old id>'`, region `verdant`, Thareia
entities only. F has registered each one and put its painting on the build list (0.1). Entity ids for locks, gates,
chests and triggers must be unique across all maps (old maps included), so every one here has a new id.
Hearthfire ids are new too (the old ones stay with the old world).

Gated exits use the existing form: `{ id, area, to, anchor, gate: <cond>, sealed: { region, text, hint } }`
(see `mossfall.js` `mf-fen-stair`).

**How things open [C1, C2, C3].** The engine has no "lock opens on a flag". So:
- a barrier that opens on story is a `gate` with `open: <cond>` (drawn shut, walkable when the condition holds);
- a lock that keeps its lock type (a soft `ichor` pool, the `stream` ford) also opens by the effect `{ unlock: '<id>' }`
  in the dialogue that sets the story flag;
- a chest that must wait for a fight or a flag has an `if:` (it is not on the map until the condition holds);
- a hearthfire that must stay cold until a story point has `coldUntil: <cond>` (it cannot be kindled before, not even
  by Attunement 3); one that a person lights has `cold: true, coldTalk: '<dialogue>'`, and that dialogue uses
  `{ kindle: '<id>' }` (3.4).

**Looks [C8].** Gate looks are the existing `GATE_KIND` keys (`bramble`, `rot-knot`, `barred-gate`, `door`, `chain`,
`thornwall`). There is no `rot-bramble`. New looks drawn by G: prop `node` (the large node) and prop `open-slab`, and a
`sign` with `prop: 'deer'` drawn as the deer prop instead of a signpost.

All coordinates below were checked walkable with node against the map rows (`tileOf` not solid), and the critic checked
reachability by flood fill from the arrival anchor. The ones this revision added or moved were checked again.

### 2.1 th-thornhollow (edit the existing file; M)

Rows: unchanged (`thornhollow` rows). Level 3. No roam. **Decided:** leave the rows as they are in T2 (the T1 test line
72 checks they equal the old map).

The skiff no longer lands in the town: the landing is `th-landing` (2.11), through the south gate.

Entities:

| id | kind | at / area | notes |
|---|---|---|---|
| th-hearth | hearthfire | [12,12], stand [12,13,'n'] | keep |
| th-aldric | npc `aldric` | [16,8] face s | keep; new talk order (3.1) |
| th-dael | npc `th-ranger` | [7,6] face s | keep; new talk order |
| th-notices | sign | [9,5] | Dael's bounty board: `talk: 'c1-board'`, `talkIf: { flag: 'c1-dael' }`, text "RANGERS' NOTICES." [C5] |
| th-outfitter | npc `th-outfitter` | [18,15] face s | shop `th-outfitter` (leather, bows, the Thornhollow longbow) |
| th-trader | npc `th-trader` | [8,17] face n | shop `th-trader` (general goods, tonics) |
| th-tt-lookout | lookout | [2,3] | id is also a dialogue id (view over the Wilds); not `th-lookout`, which the old map uses |
| th-tt-stockade | gate | [20,18] look barred-gate | `open: { flag: 's2-done' }` (Dael's thanks) [C1]; not `th-stockade` (old id) |
| th-tt-cache | chest | [21,19] | behind the stockade; low-tier loot for level 5-7; not `th-cache` (old id) |

The T1 `th-landing` trigger is gone from this map (F moved it to `th-landing`).

Exits:

| id | area | to / anchor | gate | sealed text |
|---|---|---|---|---|
| tt-n | [11,0,12,0] | th-thornway / from-thornhollow | `{ flag: 'c1-courier' }` | "The Thornway. Aldric has not given you a reason to take it yet." |
| tt-w | [0,10,0,11] | th-mossfall / from-thornhollow | `{ flag: 'c1-west-open' }` | "The Mossfall road. Shut by the rangers' order." |
| tt-ne | [23,3,23,4] | th-hindwood / from-thornhollow | `{ flag: 'c1-to-fawnrest' }` | "The Hindwood road, toward Fawnrest. Nobody goes that way now." |
| tt-s | [11,21,12,21] | th-landing / from-town | none | — |

Anchors: `from-skiff` [12,19,'n'] (keep, for old saves), `from-landing` [12,19,'n'], `from-thornway` [12,2,'s'],
`from-mossfall` [2,10,'e'], `from-hindwood` [21,4,'w'].

### 2.2 th-thornway (new copy of `thornway`, 30×56)

`paint: 'thornway'`, level 3, zone `th-thornway`, roam `{ max: 2, rects: as thornway }`.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-tw-enter | trigger | [12,50,16,54] | on enter, once: dialogue `c1-tw-enter` (the Rot smell, the shard hums), then fight `c1-verdant-edge` |
| c1-runner-camp | encounter block | [11,40] face s | story fight; guards the barricade |
| th-tw-barricade | gate | [12,40,14,40] look barred-gate | `open: { beaten: 'c1-runner-camp' }`; text "A smugglers' barricade of carts and rope." |
| th-tw-strongbox | chest | [2,42] | `if: { beaten: 'c1-runner-camp' }` [C2]; gold, a runed item, and the runners' ledger note: "Fernshaw, Thornhollow: sunstone, paid in full." |
| th-tw-goblins | npc `th-goblin` | [22,43] face w | S7 giver, in the east clearing; `if: { not: { flag: 's7-chased' } }` |
| c1-snag-wallow | encounter lair | [22,34], area [21,33,23,34] | optional; return anchor `v1:c1-snag-wallow` [21,36,'e'] |
| th-tw-boulder-chest | chest | [3,14] | `if: { beaten: 'c1-snag-wallow' }` ("the boar shifted it") [C2] |
| th-tw-bramble-cache | chest | [8,24] | no lock; healing herbs |
| th-tw-thorn-chest | chest | [27,28] | `if: { flag: 'c1-taela-guest' }` (Taela parts the thorns) [C2] |
| c1-tw-whisper | trigger | [19,15,24,17] | once: grey trees whisper when the wind drops; dialogue `c1-tw-whisper` sets `c1-whisper` (2 tree tiles in the area are harmless) |
| c1-bramble-deep | encounter block | [15,20] face s | story fight; return anchor [15,23,'n'] |
| th-tw-bramble | gate | [16,18,20,20] look bramble | `open: { beaten: 'c1-bramble-deep' }`; "Thorns gone black and wet with Rot." [C8] |
| c1-tw-boots | trigger | [14,19,18,22] | `if: { beaten: 'c1-bramble-deep' }`, once: dialogue `c1-tw-boots` (the bandit wore ranger boots); sets `s2-lead` |
| th-tw-hearth | hearthfire | [22,9], stand [22,10,'n'] | "The Thornway Stone", lit |

Dropped: `tw-thornwall` (row 26, an old relic power), `tw-crown-n`, `tw-snag-boulder` (**Decided:** an optional lair
must not gate the main road), `tw-boots`, the old fights.

Exits: `tw-s` [13,55,14,55] to th-thornhollow / from-thornway. `tw-n` [14,0,15,0] to th-eldergrove / from-thornway.
`tw-den` [26,4]: to th-briarmaw-den / from-thornway, gate `{ flag: 's6-open' }`, sealed "A den mouth in the cliff.
Something big sleeps in there. Not alone, and not yet."
Anchors: `from-thornhollow` [14,53,'n'], `from-eldergrove` [14,2,'s'], `from-den` [26,6,'s'].

### 2.3 th-eldergrove (new copy of `eldergrove`, 30×26)

`paint: 'eldergrove'`, backdrop `eldergrove`, level 4, no roam.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-eg-arrive | trigger | [0,0,29,25] | on enter, `if: { not: { flag: 'c1-thornway' } }`: dialogue `c1-eg-arrive` (grey roots weep black sap; the courier drop pays 12 gp; sets `c1-thornway`) |
| th-taela | npc `taela` | [16,4] face s | at the Eldest Tree's dying roots; `if: { not: { flag: 'c1-taela-guest' } }` |
| c1-eg-shard | trigger | [13,3,18,4] | on step, `if: { all: [{ flag: 'c1-met-taela' }, { not: { flag: 'c1-shard-roots' } }] }`: dialogue `c1-shard-glows` |
| c1-grove-circle | encounter lair | [4,6], area [4,5,4,6] face e | `if: { flag: 'c1-taela-guest' }`; story, once; talk `c1-grove-circle-before` |
| th-eg-acolyte | npc `th-acolyte` | [3,7] face e | a sick druid; `if: { not: { beaten: 'c1-grove-circle' } }` |
| th-miravel | npc `th-miravel` | [17,11] face s | Elder Miravel, seed-vault keeper: the oldest seeds rot first |
| th-scholar | npc `th-scholar` | [12,19] face e | S4 giver (talk order in 3.1) |
| th-eg-supplier | npc `th-eg-supplier` | [20,18] face n | shop `th-eldergrove` (herbal goods, no metal) |
| th-eg-bryn-house | sign | [5,12] | new text: rings cut from a dead root, black from the inside out |
| th-eg-hearth | hearthfire | [13,15], stand [13,16,'n'] | rest point; the pulse plays after a rest here (RESTS, 3.2) [C17] |
| th-eldest-door | gate | [15,2] look door | `open: { beaten: 'c1-grove-circle' }` |
| th-eg-brook | gate | [24,12,24,13] | `open: { flag: 'c1-taela-guest' }` ("Taela shows you the stepping stones") |
| th-eg-brook-chest | chest | [26,12] | uncommon druid staff or a herbal item, level 4-6 |
| th-eg-hire | npc `th-hire-eg` | [16,23] face w | the Eldergrove hire post [C9] |
| th-eg-skiff-post | sign | [13,22] | "DUSTWIND SKIFF HIRE. Licensed docks only. No night flying." |

Dropped: Nan, Hilda, miravel-freed, tamsin-duel, the old grove-circle foes, and the `c1-eg-pulse` trigger [C17].

Exits: `eg-s` [14,25,15,25] to th-thornway / from-eldergrove. `eg-tree` [15,1] to th-heartroot-1 / from-tree (behind
th-eldest-door). `eg-e` [29,8,29,9] to th-hindwood / from-eldergrove: a rope ledge, two-way, gate
`{ flag: 'c1-fawnrest' }`, sealed "The ledge drops into the Hindwood. Too steep without a rope." [C19]
Anchors: `from-thornway` [14,23,'n'], `from-heartroot` [15,4,'s'], `from-hindwood` [27,8,'w'], `from-skiff` [15,22,'n'].
**Decided:** leave the tracing (the `Y` lane at x20-21) as is in T2.

### 2.4 th-heartroot-1 (new copy of `heartroot-1`, 24×24)

`paint: 'heartroot-1'`, backdrop `heartroot`, level 6, zone `th-roots`, roam `{ max: 2, rects: [[3,3,21,21]] }`.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-hr-descent | trigger | [11,21,13,22] | once: dialogue `c1-hr-descent` (the shard warms; Taela on the black sap; she sings the sap back: `unlock` th-hr-ichor-a and th-hr-ichor-b) [C1] |
| th-hr-grub-knot | gate | [11,20,12,20] look rot-knot | `open: { beaten: 'c1-roots-grubs' }` |
| c1-roots-grubs | encounter block | [13,20] | story |
| th-hr-coal | hearthfire | [4,20], stand [4,21,'n'] | `cold: true, coldTalk: 'c1-hr-coal'` (Taela lights it) [C3] |
| th-hr-ichor-a | lock `ichor` | [8,12,15,14] | the soft lock stays; unlocked by `c1-hr-descent` |
| th-hr-ichor-b | lock `ichor` | [16,6,19,8] | same |
| c1-hr-hot-lake | trigger | [11,15,12,15] | once: dialogue `c1-hr-hot-lake` (the ichor is warm from below; Taela: "It is not the tree.") |
| c1-missing-patrol | encounter block | [19,11] | optional, `if: { flag: 's2-open' }`, once |
| th-hr-sick-rangers | npc `th-sick-ranger` | [20,14] | `if: { all: [{ beaten: 'c1-missing-patrol' }, { not: { flag: 's2-healed' } }] }` |
| th-hr-rot-knot | gate | [2,12] look rot-knot | `open: { flag: 'c1-shard-roots' }` (the shard hears it) [C1] |
| th-hr-cache | chest | [1,9] | runed at most, level 5-6 |
| th-hr-ichor-chest | chest | [17,7] | gold and a runed offhand |
| c1-roots-sapwight | encounter block | [13,1] | story; it stands on the warm spring |
| c1-hr-spring | trigger | [11,2,13,2] | on step, `if: { beaten: 'c1-roots-sapwight' }`, once: dialogue `c1-warm-water` |
| th-hr-spring-sample | sign | [10,2] | S4: `talk: 'c1-sample-spring'`, `talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-spring' } }] }`, text "Warm water wells up between the roots." [C15] |

[C20] **Decided:** the sap-knot `th-hr-sap-knot` is dropped. The sapwight is the guard: the spring trigger only fires
once it is beaten. Dropped also: `hr1-tappers` (**Decided:** no lens clue here), `hollowed-patrol` (replaced), the lore
plaque text (rewrite: the eldest trees' sap turned black).

Exits: `h1-s` [12,23] to th-eldergrove / from-heartroot. `h1-n` [12,0]: sealed, no `to`, "The roots below are too hot
to walk." `heartroot-2` is not in Chapter 1.
Anchors: `from-tree` [12,21,'n'], `from-chamber` [12,2,'s'].

### 2.5 th-mossfall (new copy of `mossfall`, 52×22)

`paint: 'mossfall'`, backdrop `mossfall`, level 6, zone `th-mossfall`, roam as mossfall with max 2.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-mf-arrive | trigger | [46,9,50,11] | once: dialogue `c1-mf-arrive` (marsh water warm in autumn, moss grey at the roots) |
| th-mf-cairn | hearthfire | [30,7], stand [30,8,'n'] | lit |
| c1-mire-bog | encounter pack | [24,14] | optional |
| th-mf-runner-crate | chest | [16,4] | small loot; note "Fernshaw's mark. Fjord run. Sandspire buyer." |
| th-mf-ford-chain | gate | [41,13] look chain | `open: { beaten: 'c1-mf-runners' }` |
| c1-mf-runners | encounter block | [42,13] | optional |
| th-mf-islet-ford | lock `stream` | [41,14] | keeps its lock type; also unlocked by `c1-node-cools` (`{ unlock: 'th-mf-islet-ford' }`) [C1] |
| c1-mf-islet | trigger | [38,15,45,15] | once: dialogue `c1-mf-islet` (the lagoon is warmer than the marsh) |
| c1-mire-shrine | encounter lair | [42,18], area [41,17,43,18] | optional, hard; Gorrow |
| th-mf-bramble-cache | chest | [46,3] | keep the bramble lock |
| th-mf-reed-cache | chest | [9,18] | hidden, 120 gold |
| th-mf-shore-sample | sign | [36,14] | S4: `talk: 'c1-sample-coast'`, `talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-coast' } }] }`, text "The lagoon shore steams a little in the cold." (on the mainland, no lock on the way) [C15] |
| th-mw-hire | npc `th-hire-mw` | [6,9] face e | the Mosswatch hire post, by the tower door [C9] |

Exits: `mf-e` [51,10,51,11] to th-thornhollow / from-mossfall. `mf-tower` [3,8] to th-mosswatch-1 / from-mossfall.
`mf-fen-stair` [20,21,21,21]: sealed, no `to`, "Fog breathes up the stair. The Gloomfen is not for walking, not yet."
Anchors: `from-thornhollow` [49,10,'w'], `from-tower` [3,9,'s'], `from-skiff` [7,9,'w'].
**Decided:** leave the tracing as is in T2.

### 2.6 th-mosswatch-1 (new copy, 14×16)

`paint: 'mosswatch-1'`, backdrop `mosswatch`, level 6, no roam.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-mw-arrive | trigger | [5,13,8,14] | once: dialogue `c1-mw-arrive` (Garret shouting from the kitchen) |
| th-garret | npc `th-garret` | [4,11] face e | Old Garret; `if: { not: { beaten: 'c1-mw-lantern' } }` [C21] |
| c1-mw-stair | encounter block | [7,4] face s | main path; the only way to the stair |
| th-mw-ledger-door | gate | [10,6] look door | `open: { flag: 'c1-mosswatch' }` (Garret's key). Not a `tally-seal` lock [C1, C28] |
| th-mw-manifest | chest | [11,3] | 60-100 gold, one item; note: Fernshaw crates "per the map", fjord run |
| th-mw-hearth | hearthfire | [1,11], stand [2,11,'w'] | Garret's kitchen hearth |
| th-mw-alcove | chest | [1,3] | gold and a potion |
| th-mw-crate | chest | [12,12] | an empty crate that still hums faintly |
| th-wenna | npc `th-wenna` | [11,9] face w | `if: { flag: 's1-open' }`; S1 guide |

Exits: `mw1-door` [6,15,7,15] to th-mossfall / from-tower. `mw1-up` [7,2] to th-mosswatch-2 / from-stair.
Anchors: `from-mossfall` [6,13,'n'], `from-lamp` [7,3,'s'], `from-cove` [6,13,'n'] (S1 comes back here).

### 2.7 th-mosswatch-2 (new copy, 12×12)

`paint: 'mosswatch-2'`, `dark: true`, backdrop `mosswatch`, level 7.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-mw2-arrive | trigger | [5,8,7,8] | once: dialogue `c1-mw2-arrive` (the Lantern's light through the parapet gap, a back turned to you) |
| c1-mw-lantern | encounter lair | [6,5], area [6,4,6,5] face s | main path; Hollis; talk `c1-mw-lantern-before` |
| th-mw-signal-light | light | [6,5], radius 3 | `if: { not: { beaten: 'c1-mw-lantern' } }` |
| th-mw-fire | hearthfire | [6,2], stand [6,3,'n'] | `cold: true, coldUntil: { beaten: 'c1-mw-lantern' }` [C3] |
| th-garret-up | npc `th-garret` | [4,3] face e | `if: { beaten: 'c1-mw-lantern' }` |
| th-mw-lookout | lookout | [10,2] | id is also a dialogue id: the fjord coast, low lamps on the water at night |
| th-mw-cache | chest | [1,3] | gold, lamp oil, a signal code |
| th-mw-oil | chest | [3,10] | a tonic |

Exits: `mw2-down` [6,11] to th-mosswatch-1 / from-lamp. Anchor `from-stair` [6,9,'n'].

### 2.8 th-hindwood (new copy, 32×40)

`paint: 'hindwood'`, backdrop `verdant-wood`, level 7, zone `th-hindwood`, roam `{ max: 2, rects: [[2,4,30,38]] }`.

The stream (rows 20-21) splits the wood. Its two crossings are the ford (`wwww`, x9-12) and the bridge (`bb`, x26-27).
**Decided [C25]:** both crossings are gated on the glowcaps, so `c1-glowcaps` is on the main path; checked by flood
fill: with both gates shut, `hw-n` cannot be reached from `from-thornhollow`.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-hw-roots | trigger | [20,29,23,31] | once: dialogue `c1-hw-roots` (black-sap trees; a Rot-twisted hound watches and runs) |
| c1-hw-ford | trigger | [8,22,12,22] | once: dialogue `c1-hw-ford` (the shard warms at the stream; the roots are black along the water) |
| th-hw-cairn | hearthfire | [10,25], stand [10,26,'n'] | lit |
| c1-feral-druid | encounter **block** | [18,28] | `talk: 'c1-burners'`; `if: { not: { flag: 's3-talked' } }` [C4] |
| c1-glowcaps | encounter block | [25,22] | story |
| th-hw-bridge-knot | gate | [26,21,27,21] look rot-knot | `open: { beaten: 'c1-glowcaps' }` |
| th-hw-ford-knot | gate | [9,20,12,20] look rot-knot | `open: { beaten: 'c1-glowcaps' }`: "Black roots choke the ford. Spores drift off them." (new) |
| c1-gloamwing | encounter lair | [22,12], area [21,11,23,12] | `if: { flag: 'c1-node-cooled' }`; optional |
| th-hw-thornwall | gate | [27,7,28,7] look thornwall | `open: { flag: 'c1-taela-joined' }` |
| th-hw-thorn-chest | chest | [28,6] | storied item |
| th-hw-pond-chest | chest | [2,33] | herbs, coin |
| th-hw-glade-chest | chest | [3,14] | a potion |
| th-hw-sign | sign | [27,33] | "Hindwood road. Ford west, bridge east. Fawnrest ahead." |
| th-deer-1 | sign, `prop: 'deer'` | [5,7] (NW glade) | `if: { all: [{ flag: 's9-open' }, { not: { flag: 's9-deer-1' } }] }`, `talk: 'c1-deer-1'` [C5] |
| th-deer-2 | sign, `prop: 'deer'` | [28,25] (south bank) | same with `s9-deer-2`, `talk: 'c1-deer-2'` |

Exits: `hw-se` [31,34,31,35] to th-thornhollow / from-hindwood. `hw-n` [15,0,16,0] to th-fawnrest / from-hindwood, gate
`{ flag: 'c1-hindwood' }`, sealed "Taela stops you. 'The burners' camp first, or they follow us north.'" `hw-w`
[0,8,0,9] to th-eldergrove / from-hindwood: the rope ledge, two-way, gate `{ flag: 'c1-fawnrest' }`, sealed "A cliff
up to Eldergrove. Too steep without a rope." [C19]
Anchors: `from-thornhollow` [29,34,'w'], `from-fawnrest` [15,2,'s'], `from-eldergrove` [2,8,'e'].
Dropped: `hw-rope`, the bell quest, the old gloamwing story.

### 2.9 th-fawnrest (new copy, 22×20)

`paint: 'fawnrest'`, backdrop `fawnrest`, level 8, no roam.

| id | kind | at / area | notes |
|---|---|---|---|
| c1-fr-arrive | trigger | [9,15,12,18] | once: dialogue `c1-fr-arrive` (the shard warms; no deer; steam off the pool) |
| th-fr-camp | hearthfire | [7,12], stand [7,13,'n'] | the pilgrims' fire; the rest before the node |
| th-fr-stone | hearthfire | [11,6], stand [11,7,'n'] | the Dreaming Stone; `cold: true, coldUntil: { flag: 'c1-node-cooled' }` [C3] |
| th-keeper | npc `th-keeper` | [13,8] face s | Keeper Maren |
| th-pilgrim-1, th-pilgrim-2 | npc `th-pilgrim` | [5,12], [8,14] face s | sick pilgrims |
| th-burner-fr | npc `th-burner-fr` | [9,12] face w | `if: { all: [{ flag: 's3-talked' }, { not: { flag: 's3-done' } }] }`; a burner at the pilgrims' fire (S3) |
| c1-fr-court | trigger | [9,5,13,8] | on step, `if: { all: [{ flag: 'c1-fawnrest' }, { not: { flag: 'c1-stair-found' } }] }`: dialogue `c1-stair` |
| th-fr-slab | prop `open-slab` | [11,4] | `if: { flag: 'c1-stair-found' }` (drawn by G) |
| c1-vesper | encounter block | [16,13] face w | `talk: 'c1-vesper'`; optional; `if: { not: { flag: 'c1-vesper-gone' } }` |
| th-fr-offering | chest | [3,3] | no lock in T2; storied amulet |
| th-fr-pilgrim-cache | chest | [1,12] | potions |
| th-fr-meadow | chest | [20,3] | gold |
| th-fr-pool-sample | sign | [4,15] | S4: `talk: 'c1-sample-pool'`, `talkIf: { all: [{ flag: 's4-open' }, { not: { flag: 's4-pool' } }] }`, text "The pool steams. It is too hot to touch." [C15] |
| th-fr-deer-1, th-fr-deer-2 | prop deer | [16,4], [18,6] | `if: { flag: 's9-done' }` |

Exits: `fr-s` [10,19,11,19] to th-hindwood / from-fawnrest. `fr-node` [11,4] to th-fawnrest-node / from-fawnrest, gate
`{ flag: 'c1-stair-found' }`, sealed "Paving stones, warm under your feet." `fr-highfold` [21,9,21,10]: sealed, no `to`,
"Fallen scree, and somewhere past it, a bell."
Anchors: `from-hindwood` [11,17,'n'], `from-node` [11,5,'s'], `from-skiff` [14,10,'w'].
Dropped: Ivo's old lines, the silent-bell and miracle-sap quests. The bellframe stays as scenery with new text.
**Decided:** leave the tracing as is in T2.

### 2.10 th-fawnrest-node (NEW map, traced from painting 6; G)

Painting 6 (`art-in/scenes/walk-fawnrest-node.png`) has arrived. G traces it tile by tile (the same way T1 traced
`walk-bogmire.webp`), imports it with `node tools/paint-import.mjs --map=th-fawnrest-node --src=...`, keeps every id
below and moves coordinates to match the painting. Until G is done, F's stub is the drawn map below.

`id: 'th-fawnrest-node'`, name "Under Fawnrest", region verdant, biome `ruin`, music `dungeon`, backdrop
`fawnrest-node`, level 9, `travel: false`, `dark: true`, no roam. Stub: 18×22, checked by flood fill from [9,21].

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

| id | kind | at / area (stub) | notes |
|---|---|---|---|
| c1-fn-hot | trigger | [7,18,9,19] | once: dialogue `c1-fn-hot` (the water down here is hot; Taela goes quiet) |
| th-fn-stair-gate | gate | [7,16,8,16] look rot-knot | `open: { beaten: 'c1-node-stair' }` |
| c1-node-stair | encounter block | [9,16] | story |
| c1-fn-hall | trigger | [3,9,14,9] | once: dialogue `c1-fn-hall` (fitted floors, channels "too straight, too even", veins that all run one way), then fight `c1-node-hall` |
| th-fn-root-gate | gate | [7,7,8,7] look rot-knot | `open: { beaten: 'c1-node-roots' }` |
| c1-node-roots | encounter block | [9,7] | story; after it, dialogue `c1-node-found` (AFTER) |
| th-fn-node | prop `node` (large) | at [8,2], solid area [8,1,9,2] | glows white until `c1-node-cooled`, then gold (drawn by G) |
| c1-guardian | encounter lair | at [8,4], area [7,3,10,4] | story, once, noFlee; talk `c1-guardian-wakes` |
| th-fn-sign | sign | [3,5] | the script round the dais, "a script no one here can read" |

Exits: `fn-up` [9,21] to th-fawnrest / from-node. Anchor `from-fawnrest` [9,20,'n'].
G's traced map must pass the 2.12 checks, with the node on a dais the boss stands in front of.

### 2.11 th-landing and th-fjords-cove (NEW maps, traced from paintings 5 and 7; G)

**th-landing** (painting 5, `walk-thornhollow-landing.png`, has arrived): the landing field outside Thornhollow's south
gate. `region: 'verdant'`, level 2, zone `th-landing`, roam `{ max: 1, rects: <the field> }`, backdrop `verdant-wood`,
music `town`. G traces it and imports it (`paint-import --map=th-landing`). Fixed ids (G places them on the traced
tiles):

| id | kind | notes |
|---|---|---|
| th-landing | trigger | the T1 trigger, moved here by F: whole map, on enter, `if: { not: { flag: 'th-landed' } }`, dialogue `th-landing` |
| c1-crate-thieves | trigger | on step, an area round the skiff's platform, `if: { all: [{ flag: 'c1-start' }, { not: { beaten: 'c1-landing' } }] }`: dialogue `c1-crate-thieves` [C13] |
| th-landing-crate | sign | the half-ruined crate by the skiff: "FERNSHAW, THORNHOLLOW. One seam split. It still hums, faintly." |
| th-skyhire | npc `th-hire-landing` | Hob Dustwind's hire post by the mooring mast |
| th-skyhire-post | sign | "DUSTWIND SKIFF HIRE. Licensed docks only. No night flying." |

Exits: `tl-n` (the road to the gate) to th-thornhollow / from-landing. The Hearth Road leaves at the field's far edge:
`tl-s`, sealed, no `to`, "The Hearth Road, to the Keep. Not yet: the Wilds first."
Anchors: `from-skiff` (on the platform, facing the gate), `from-town` (just inside the field from the gate).
F points `DOCKS.thornhollow` at `th-landing / from-skiff` (the dock's painting point [1232,566] stays).

**th-fjords-cove** (painting 7, `walk-drowned-fjords-cove.png`, has arrived): the S1 cove, walked. `region: 'verdant'`,
`dark: true`, level 7, no roam, backdrop `mosswatch`, music `dungeon`. The party gets there by boat: dialogue `c1-wenna`
uses `{ go: { map: 'th-fjords-cove', anchor: 'from-boat' } }` (3.4). Fixed ids:

| id | kind | notes |
|---|---|---|
| c1-cove-arrive | trigger | on enter, once: dialogue `c1-cove-arrive` (night, Auros overhead, lamps hung low) |
| c1-fjord-crew | encounter block | on the cliff path down to the dock |
| c1-fjord-inlet | encounter lair | optional, in the water by the rowing boats ("Wenna says keep clear of the inlet") |
| c1-fjord-cove | encounter lair | on the dock by the cave mouth; talk `c1-cove-skeet` |
| th-cove-receipts | chest | in the cave mouth, `if: { beaten: 'c1-fjord-cove' }`; gold; `loot.story: 's1-lens-receipt'` |
| th-cove-crates | chest | gold and a tonic |

Exits: `cove-boat` (Wenna's boat, at the dock) to th-mosswatch-1 / from-cove. Anchor `from-boat` (at the boat).

**th-briarmaw-den** (copy of `briarmaw-den`, no new art; M): the S6 lair after the node. `paint: 'briarmaw-den'`.
Entities: `c1-dael-bounty` lair [8,5] area [6,3,10,6]; trigger `c1-den-enter` [7,14,8,14]; chests
`th-den-chest-w` [3,4] and `th-den-chest-e` [12,4]; trigger `c1-den-pool` [4,9] (black warm water). Exit `den-s`
[7,17,8,17] to th-thornway / from-den. Anchor `from-thornway` [8,15,'n'].

The other `walk-top-*`, `walk-stream-and-ruins` and `walk-graveyard-path-night` paintings are not used in T2.

### 2.12 Map checks (the owner of each map runs them; I adds them to `test/thareia.test.mjs`)

Each th-* map: rows from the legend; anchors walkable; every entity and exit in bounds; `paint` set for copies; rows
equal to the old map for copies; lock, gate, chest and trigger ids unique across all maps (old maps included); every
story target reachable from the arrival anchor with the gates the story opens before it (section 7).

---

## 3. People and scenes (P)

NPCs go in `src/data/thareia/c1-npcs.js` using `N(id, name, role, talk, art)` (the T1 helper). The talk list is checked
top to bottom; the first entry whose `if` holds picks the dialogue. Art keys with no look fall back to a villager drawn
from the key. Dialogue nodes go in `src/data/thareia/c1-dialogue.js` (`C1_DIALOGUE`, `C1_AFTER`, `C1_RESTS`), one
comment line per node naming its purpose.

### 3.1 NPCs

| npc id | Name | Role | art key | Talk order (first match wins) |
|---|---|---|---|---|
| aldric | Aldric Fernshaw | Merchant | aldric | `c1-aldric-letter` → c1-aldric-after; `c1-lens` → c1-aldric-lens; `c1-aldric-maps` → c1-aldric-waiting; `c1-pulse` → c1-aldric-maps; `c1-courier` → c1-aldric-courier-wait; `c1-start` → c1-aldric-start; else th-aldric (T1) [C11] |
| th-ranger | Ranger Dael | Ranger of Thornhollow | dael | `c1-done` → c1-dael-after; `c1-aldric-letter` → c1-dael-end; `c1-lens` → c1-dael-wait; `c1-aldric-maps` and not `c1-west-open` → c1-dael-west; `s2-healed` and not `s2-done` → c1-dael-patrol-done; `s2-lead` and not `s2-open` → c1-dael-patrol; `c1-dael` → c1-dael-again; `c1-start` → c1-dael; else th-ranger [C10] |
| th-hire-landing | Hob Dustwind | Skiff hire, Thornhollow | skyhire | `c1-skiff-rented` → c1-hire-thornhollow; else c1-hire-closed [C9] |
| th-hire-eg | Nell Dustwind | Skiff hire, Eldergrove | skyhire | `c1-skiff-rented` → c1-hire-eldergrove; else c1-hire-closed |
| th-hire-mw | Tam Dustwind | Skiff hire, Mosswatch | skyhire | `c1-skiff-rented` → c1-hire-mosswatch; else c1-hire-closed |
| th-outfitter | Dunna Reeve | Leatherworker | outfitter | c1-outfitter (opens shop th-outfitter) |
| th-trader | Col Ashby | Trader | trader | c1-trader (opens shop th-trader) |
| taela | Taela Greenmantle | Druid of Eldergrove | taela | `c1-met-taela` → c1-taela-roots; else c1-taela-first |
| th-acolyte | Linnet | Grove acolyte | acolyte | c1-acolyte |
| th-miravel | Elder Miravel | Seed-vault keeper | miravel | c1-miravel |
| th-scholar | Illeth Sarovan | Scholar of the Rot | scholar | `s4-done` → c1-scholar-after; `s4-spring` and `s4-coast` and `s4-pool` → c1-scholar-done; `s4-open` → c1-scholar-wait; `c1-warm-water` → c1-scholar-offer; else c1-scholar-busy |
| th-eg-supplier | Moss-Hand Tolly | Druid supplies | supplier | c1-supplier (opens shop th-eldergrove) |
| th-sick-ranger | Ranger Ilse and Ranger Cade | Rot-sick rangers | ranger | c1-sick-rangers |
| th-garret | Old Garret | Watchkeeper of Mosswatch | garret | `s1-done` → c1-garret-thanks; `c1-to-fawnrest` → c1-garret-after; beaten `c1-mw-lantern` → c1-rot-line; `c1-mw-arrived` → c1-garret-wait; else c1-garret-first |
| th-wenna | Wenna Reedcask | Fjord-runner | wenna | `s1-done` → c1-wenna-after; `s1-lens-receipt` → c1-wenna-home; else c1-wenna |
| th-keeper | Keeper Maren | Keeper of Fawnrest | keeper | `s9-done` → c1-keeper-after; `s9-deer-1` and `s9-deer-2` → c1-keeper-home; `c1-node-cooled` → c1-keeper-deer; `c1-fawnrest` → c1-keeper-again; else c1-keeper [C12] |
| th-pilgrim | A sick pilgrim | Pilgrim | pilgrim | `c1-node-cooled` → c1-pilgrim-better; else c1-pilgrim |
| th-burner-fr | A burner | Oda's burner | burner | c1-burner-at-fawnrest |
| th-goblin | Snib | Goblin forager | goblin | `s7-helped` or `s7-chased` → c1-goblin-after; else c1-goblin |
| th-burner | Oda the Thornmother | Burner | oda | speaker only (the `c1-burners` and `c1-grove-circle-before` talks); no map npc |
| th-skeet | Skeet Marrow | Smuggler | smuggler | (T1 entry; speaker in S1) |

Names new in this spec: Hob, Nell and Tam Dustwind, Dunna Reeve, Col Ashby, Linnet, Illeth Sarovan, Moss-Hand Tolly,
Ilse, Cade, Keeper Maren, Snib. The acolyte is Linnet, not "Wren" (the new-game hero's default name).

**Decided (the skiff hire):** Dustwind Skiff Hire is Captain Yara Dustwind's side business. Her cousins keep a hire post
at each licensed dock: Hob at the Thornhollow landing, Nell at Eldergrove, Tam at Mosswatch. Their lines work whether or
not the hero ever flew with Yara ("My cousin flies the long runs. We rent the short ones.").

**Decided (the Rot scholar):** a new person, Illeth Sarovan, not Vaelis of Luminara.

Speakers used in lines but not placed on maps: `narrator`, `warden`, `taela` (a hero while she is in the party),
`th-burner`, `th-skeet`.

### 3.2 Dialogue nodes

Every node below exists in `C1_DIALOGUE` [C14]. "Purpose" is what the lines say; "effects" is the node's `do` (or its
choices where marked). Lines follow the tone and writing rules in section 1.

Main path, in order:

| node | purpose | effects |
|---|---|---|
| c1-crate-thieves | two road-rats at the half-ruined crate by the skiff | fight `c1-landing` |
| c1-landing-after (AFTER c1-landing, victory) | the rats run; the crate is safe; "Fernshaw's shop is up the road, on the square." | none |
| c1-aldric-start | Aldric straightens a shelf, pays 10 gp for "the half that did not sing", asks for quiet, offers the courier job | `set c1-aldric-met`, `gold 10`, `set c1-courier` |
| c1-aldric-courier-wait | "Eldergrove is up the Thornway. She is expecting oil, not company." | none |
| c1-dael | the Rot is worse; Mossfall shut by his order; the board; the druids want anyone who knows water under the ground | `set c1-dael` |
| c1-dael-again | "The board has work, if you want it. The west road stays shut." | none |
| c1-hire-closed | Dustwind hire: licensed routes only, docks only, no night flying; "No sponsor, no skiff. Get a Thornhollow name to vouch for you." | `set c1-saw-hire` |
| c1-board | the rangers' notices; one choice per open job: S7 hint (goblins) always; "The bounty nobody can name" if `c1-node-cooled` and not `s6-open`; S5 as "Caravan to the Keep: leaves when the Hearth Road opens" if `c1-done` (no quest) | choice: `set s6-open` |
| c1-tw-enter | the Rot smell; the shard hums | fight `c1-verdant-edge` |
| c1-tw-whisper | grey trees whisper when the wind drops | `set c1-whisper` |
| c1-tw-boots | the bandit wore ranger boots | `set s2-lead` |
| c1-eg-arrive | grey roots, black sap; the courier drop | `set c1-thornway`, `gold 12` |
| c1-taela-first | Taela cutting root; reads the letter; laughs once; "It follows the water table. It kills from the roots up."; asks the hero to hold the shard near the roots | `set c1-met-taela` |
| c1-taela-roots | while `c1-shard-roots` is not set: "Hold it near the roots. Go on." | none |
| c1-shard-glows | the shard blazes; gold threads run down; "Do that again."; she comes along "until I understand that stone"; she sees torches at the stone circle | `cut shard-glows`, `set c1-shard-roots`, `{ join: 'taela', guest: true }`, `set c1-taela-guest` |
| c1-acolyte | Linnet: the burners came at dawn; "They say fire cleans it. Fire only moves it." | none |
| c1-miravel | the oldest seeds in the vault rot first, from the inside | none |
| c1-grove-circle-before (talk on c1-grove-circle) | Oda: "You cut. We burn." | fight `c1-grove-circle` |
| c1-grove-circle-after (AFTER c1-grove-circle, victory) | Oda runs for the Hindwood; the Eldest door can open | `set c1-circle-saved` |
| c1-hr-descent | the shard warms; Taela on the black sap; she sings it back from the path | `unlock th-hr-ichor-a`, `unlock th-hr-ichor-b` |
| c1-hr-coal (coldTalk of th-hr-coal) | a cold coal under the roots; choice "Ask Taela to light it" if `{ active: 'taela' }` | choice: `{ kindle: 'th-hr-coal' }` |
| c1-hr-hot-lake | the ichor is warm from below; Taela: "It is not the tree." | none |
| c1-warm-water | the spring runs warm; nothing that deep should be warm | `set c1-warm-water` |
| c1-pulse (RESTS: at `th-eg-hearth`, if `c1-warm-water` and not `c1-pulse`) | night at the hearth, Auros overhead; the shard jolts; every root shines for one breath; "The grove just heard something. So did your stone." | `cut grove-pulse`, `note 'Far away, something woke. The grove answered.'`, `set c1-pulse` |
| c1-aldric-maps | told of the warm water, Aldric admits the "map of where it hums"; he vouches for the hero at the hire post and pays the deposit and one flight; "Go and look at the coast for me." | `set c1-aldric-maps`, `set c1-skiff-rented`, `set c1-hire-ticket`, `note 'Aldric paid your first skiff flight. Show the ticket at any hire post.'` |
| c1-aldric-waiting | "Go and look at the coast. Then come back and tell me I am wrong." | none |
| c1-dael-west | Dael opens the Mossfall road on Aldric's news | `set c1-west-open` |
| c1-hire-thornhollow, c1-hire-eldergrove, c1-hire-mosswatch | one node per dock [C9]: choices "Use Aldric's prepaid flight." (if `c1-hire-ticket`) → `unset c1-hire-ticket`, `open sky:hire@<dock>`; "Hire a flight: 10 gp." (if not `c1-hire-ticket`) → `pay { gold: 10 }`, `open sky:hire@<dock>`; S8 cargo choices (below); Leave | as listed |
| c1-mf-arrive, c1-mf-islet | Mossfall warm-water notes | none |
| c1-mw-arrive | Garret shouting from the kitchen | none |
| c1-garret-first | Garret: crates went up his stair last night; lights in his lamp room he did not light | `set c1-mw-arrived` |
| c1-garret-wait | "Up the stair. Mind the crates. Mind whoever is minding them." | none |
| c1-mw-stair-before (talk on c1-mw-stair) | a runner on the stair: "Wrong tower, friend." | fight `c1-mw-stair` |
| c1-mw2-arrive | the Lantern's light through the parapet gap, a back turned to you | none |
| c1-mw-lantern-before (talk on c1-mw-lantern) | Hollis Fairweight signalling out to sea | fight `c1-mw-lantern` |
| c1-rot-line | in the Lamp Room: the rangers' Rot map, the line bending inland; the tide logs say warm ground water; boats with no lamps; the pilgrims stopped coming, the pool scalds; Garret gives the ledger-room key | `set c1-mosswatch`, `set c1-rot-line`, `set c1-to-fawnrest`, `set s1-open` |
| c1-garret-after | "Fawnrest. Through the Hindwood. The keeper there is a friend." | none |
| c1-hw-roots, c1-hw-ford | Hindwood notes: black-sap trees, a Rot-twisted hound; the shard warms at the stream | none |
| c1-burners (talk on c1-feral-druid) | Oda's camp; Taela's lines. Choices: "Let Taela talk." (if `{ active: 'taela' }`) → `set s3-talked`, `set c1-hindwood`; "Fight." → `fight c1-feral-druid` | as listed |
| c1-burners-after (AFTER c1-feral-druid, victory) | the camp scatters | `set c1-hindwood` |
| c1-fr-arrive | the shard warms; no deer; steam off the pool | none |
| c1-keeper | the white deer are gone; no mason in Aethermoor cut these stones; the stones are warm under the broom | `set c1-fawnrest` |
| c1-keeper-again | "The court. Walk it with that stone of yours." | none |
| c1-pilgrim | a sick pilgrim: came to be healed, the pool scalded | none |
| c1-stair | the shard drags the hero's hand to the court; a stair under the paving, opened recently, not by the keeper; Taela ties a rope at the Eldergrove ledge on the way (the shortcut) | `set c1-stair-found` |
| c1-fn-hot | the water down here is hot; Taela goes quiet | none |
| c1-fn-hall | the hall's stonework (canon: fitted floors, straight channels, converging veins); something moves in the channels | `fight c1-node-hall` |
| c1-node-found (AFTER c1-node-roots, victory) | the node white-hot; the lens clamped to it, a small cold glint and a stamped mark | `cut node-overheats`, `set c1-node-found`, `set c1-lens-seen` |
| c1-guardian-wakes (talk on c1-guardian) | "It was white once. The pilgrims followed it here to be healed." | `cut guardian-wakes`, `fight c1-guardian` |
| c1-node-cools (AFTER c1-guardian, victory) | the hart curls and goes out in a silent amber flare, leaving crystals; the hero pries off the lens; the glow drops to gold; Taela sings the roots cool; she joins for good; "Someone should tell the Keep."; she names Fen Rootwalker | `set c1-hart-beaten`, `cut node-cools`, `{ join: 'taela' }`, `set c1-taela-joined`, `set c1-node-cooled`, `{ key: 'th-lens' }`, `set c1-lens`, `set s9-open`, `unlock th-mf-islet-ford` |
| c1-pilgrim-better | the pool cools; the pilgrim can stand | none |
| c1-vesper (talk on c1-vesper) | Vesper sells "miracle sap" to the sick pilgrims. Choices: "Tell the pilgrims what it is." (a CHA check DC 13, best hero; pass: Vesper's men leave, `set c1-vesper-gone`, and the encounter's `if` hides it; fail: fight) or "Fight." → `fight c1-vesper` | as listed |
| c1-keeper-deer | Maren: two white deer were seen in the Hindwood; lead them home | none |
| c1-deer-1, c1-deer-2 (sign talks on th-deer-1, th-deer-2) | a white deer, thin and wary; it follows you toward Fawnrest | `set s9-deer-1` / `set s9-deer-2` |
| c1-aldric-lens | Aldric sees the mark and goes white; hands over one letter: unsigned, Sandspire silver, the same seal | `{ key: 'th-buyers-letter' }`, `set c1-aldric-letter` |
| c1-aldric-after | "I sell stone. I do not ask. I am asking now. Who are they?" | none |
| c1-dael-wait | "Aldric wants you. He looked sick." | none |
| c1-dael-end | the Rot on the west road has stopped spreading | `set c1-done`, `end: 'chapter-1'` |
| c1-dael-after | "The west road is quiet. Go on, when you are ready." | none |

**Decided:** `c1-done` is set by Dael after Aldric's letter, so both epilogue talks happen, in that order.

Other scenes:
- `th-tt-lookout` (view over the Wilds from Thornhollow), `th-mw-lookout` (the fjord coast at night, Auros overhead):
  lookout ids that are dialogue ids.
- `c1-outfitter`, `c1-trader`, `c1-supplier`: one line each, then `open shop:<id>`.
- `c1-scholar-busy`: "Not now. I am measuring." (before `c1-warm-water`).

Side quests (quest data in `c1-quests.js`, 3.3):

| quest | nodes (purpose; effects) | flags |
|---|---|---|
| S1 Lanterns Hung Low (Garret, level 7-8) | c1-wenna (at dusk she poles you to the cove; `set s1-fjords-night`, `{ go: { map: 'th-fjords-cove', anchor: 'from-boat' } }`); c1-cove-arrive (night, Auros; the inlet warning); c1-cove-skeet (talk on c1-fjord-cove: "You again." if `{ beaten: 'pr-smugglers' }`, else "Who let you down here?"; fight `c1-fjord-cove`); c1-cove-skeet-after (AFTER c1-fjord-cove, victory: Skeet dives and swims; `set s1-skeet-beaten`); the receipts chest sets `s1-lens-receipt` (payments in Sandspire silver; receipts with a wax lens mark); c1-wenna-home (at the tower: `set s1-done`); c1-wenna-after; c1-garret-thanks (gold 150) | `s1-open`, `s1-fjords-night`, `s1-skeet-beaten`, `s1-lens-receipt`, `s1-done` |
| S2 The Missing Patrol (Dael, level 6-7) | c1-dael-patrol (`set s2-open`); c1-sick-rangers (Taela heals two; the third was hollowed; `set s2-healed`); c1-dael-patrol-done (ranger gear, `set s2-done`; the stockade opens) | `s2-lead`, `s2-open`, `s2-healed`, `s2-done` |
| S3 The Burners (Taela, Hindwood, level 8) | c1-burners (above); c1-burner-at-fawnrest (a burner at the pilgrims' fire gives a salve: `bag { bitterroot: 2 }`, `set s3-done`) | `s3-talked`, `s3-done` [C15] |
| S4 Stop Measuring (scholar, any level after beat 5) | c1-scholar-offer (`set s4-open`); c1-scholar-wait; c1-sample-spring (`set s4-spring`); c1-sample-coast (`set s4-coast`); c1-sample-pool (`set s4-pool`); c1-scholar-done (Luminara's reply: "Stop measuring."; `set s4-done`, gold 80); c1-scholar-after | `s4-open`, `s4-spring`, `s4-coast`, `s4-pool`, `s4-done` [C15] |
| S6 The Bounty Nobody Can Name (board, after the node, level 10) | c1-board (`set s6-open`); c1-den-enter; c1-den-pool; c1-bounty-relic (AFTER c1-dael-bounty, victory: the purse came from Aldric's buyers; choices "Hand it over for the purse." → gold 200, `set s6-sold`, `set s6-done`; "Keep it." → `set s6-kept`, `set s6-done`) | `s6-open`, `s6-kept` or `s6-sold`, `s6-done` |
| S7 At the Edge of the Wood (Thornway, level 3-4) | c1-goblin (the Rot kills their forage; the town blames them; `set s7-open`; choices "Share your rations." → `pay { gold: 5 }`, `set s7-helped`; "Tell them to go." → `set s7-chased`); c1-goblin-after (helped: a bundle of clean herbs, `bag { 'hearth-tonic': 2 }`; both: `set s7-done`) | `s7-open`, `s7-helped` or `s7-chased`, `s7-done` [C15] |
| S8 Cargo, Hire Rates (hire posts, level 6+) | choices in each c1-hire-<dock> node: "Take a cargo run to <other dock>." (if no cargo flag is set) → `set c1-cargo-<other>`; "Hand over the cargo." (if `c1-cargo-<this dock>`) → `unset c1-cargo-<this dock>`, `gold 15` | `c1-cargo-thornhollow`, `c1-cargo-eldergrove`, `c1-cargo-mosswatch` |
| S9 The White Deer Come Home (keeper, after the node) | c1-keeper-deer; c1-deer-1 (`set s9-deer-1`); c1-deer-2 (`set s9-deer-2`); c1-keeper-home (`set s9-done`, a storied amulet via `give`); c1-keeper-after | `s9-open`, `s9-deer-1`, `s9-deer-2`, `s9-done` [C5, C12] |

**Deferred to T3:** S5 Caravan to the Keep (the board only mentions it after `c1-done`).
**S8** is last in priority. Cut it if P runs late. It needs no airship code.

Key items (`src/data/thareia/c1-keys.js`, `C1_KEYS[id] = { name, text }`): `th-lens` ("A clear lens in a silver ring,
stamped with a small mark."), `th-buyers-letter` ("One letter, unsigned. Sandspire silver. The same small mark.").

### 3.3 Objectives (`src/data/thareia/c1-objectives.js`) [C16]

F puts these above the Prologue's in `TH_OBJECTIVES`. First match wins. Each names its map and entity for the mini
map's star.

| if | text | map / entity |
|---|---|---|
| `c1-done` | "Chapter 1 is done. Chapter 2 comes next." | th-thornhollow / th-dael |
| `c1-aldric-letter` | "Tell Ranger Dael." | th-thornhollow / th-dael |
| `c1-lens` | "Show Aldric the lens." | th-thornhollow / th-aldric |
| `c1-node-found` | "Face what guards the node." | th-fawnrest-node / c1-guardian |
| `c1-stair-found` | "Go down the stair under the court." | th-fawnrest / th-fr-slab |
| `c1-fawnrest` | "Walk the shrine court with the shard." | th-fawnrest / c1-fr-court |
| `c1-hindwood` | "Go on to Fawnrest and find the keeper." | th-fawnrest / th-keeper |
| `c1-to-fawnrest` | "Go through the Hindwood to Fawnrest." | th-hindwood / c1-feral-druid |
| beaten `c1-mw-lantern` | "Talk to Garret in the Lamp Room." | th-mosswatch-2 / th-garret-up |
| `c1-mw-arrived` | "Climb Mosswatch Tower to the Lamp Room." | th-mosswatch-2 / c1-mw-lantern |
| `c1-west-open` | "Take the west road to Mosswatch Tower." | th-mossfall / th-mw-hire |
| `c1-aldric-maps` | "Ask Ranger Dael to open the west road." | th-thornhollow / th-dael |
| `c1-pulse` | "Tell Aldric about the warm water." | th-thornhollow / th-aldric |
| `c1-warm-water` | "Rest at Eldergrove's hearth." | th-eldergrove / th-eg-hearth |
| `c1-circle-saved` | "Go down under the Eldest Tree." | th-eldergrove / th-eldest-door |
| `c1-taela-guest` | "Stop the burners at the stone circle." | th-eldergrove / c1-grove-circle |
| `c1-met-taela` | "Hold the shard near the roots." | th-eldergrove / c1-eg-shard |
| `c1-thornway` | "Find Taela Greenmantle at the Eldest Tree." | th-eldergrove / th-taela |
| `c1-courier` | "Take the Thornway to Eldergrove." | th-thornway / c1-runner-camp |
| `c1-start` and beaten `c1-landing` | "Find Aldric Fernshaw on the square." | th-thornhollow / th-aldric |
| `c1-start` | "Stop the thieves at the crate." | th-landing / c1-crate-thieves |

**How objectives and quests combine:** in a Thareia game `nextObjective` takes the first matching `TH_OBJECTIVES`
entry. Only when none matches does it fall back to the first active quest. Side quests show in the Journal and never
hide the main line (F, 3.5).

### 3.4 Rules changes (F: `src/rules/story.js`, `src/rules/cond.js`, `src/rules/world.js`)

- `{ join: id, guest: true }`: the hero joins with `roster[id].guest = true` at the party's top level plus
  `HEROES[id].guestLevel`. `{ join: id }` on a hero already present as a guest clears `guest` and sets the level to
  `max(her level, the hero's level)` (XP raised to match). Yara's T1 join becomes `{ join: 'yara', guest: true }`.
- `{ end: 'chapter-1' }`: `chapterEnd` in `src/ui/world/story-fx.js` gets an `act === 'chapter-1'` card, like the
  Prologue's: label "End of Chapter 1", kick "The Rot's Roots", title "To be continued", sub "Chapter 2: The Hearth's
  Tune", stats Level and Gold (no Day), lines "The node under Fawnrest glows a steady gold." and "Someone should tell the
  Keep." [C7]
- `{ key: id }` [C6]: a key item. Stored in `progress.flags.keys[id] = true`, event `{ t: 'key', id }` (a toast with
  `C1_KEYS[id].name`). The existing `item` effect is untouched. The Journal lists held key items. New condition
  `{ key: id }` in cond.js.
- `{ kindle: hearthfireId }` [C3]: sets `flags.kindled[id]`, event `{ t: 'note', text: '<name> is lit.' }`.
- `{ go: { map, anchor } }`: event `{ t: 'go', map, anchor }`; the world screen moves the party there after the
  dialogue (the same transition an exit uses).
- `{ unlock: id }` already exists (it writes `flags.unlocked[id]`); used for `ichor` and `stream` locks [C1].
- `src/rules/world.js` `entityState` for hearthfires [C3]: `cold` when `e.cold && !kindled[e.id]` and, when
  `e.coldUntil` is set, while `check(e.coldUntil)` fails. A hearthfire with `coldUntil` cannot be kindled by a lock key
  (Attunement 3 does not light it); `interact` on it shows its text. A cold hearthfire with `coldTalk` opens that
  dialogue on `interact` instead of the cold-hearth lock.
- New condition `{ heroLevel: n }`: `game.party.roster.warden.level >= n` [C26].

### 3.5 The day, and the objective line (F) [C16, C18]

- `dayShown(game)` (exported from `src/rules/story.js`): false in a Thareia game once `c1-pulse` is set. Every day
  display checks it: the rest toast (`src/ui/screens/world.js`, "Rested at ... Saved." with no day), the aftermath
  headers (`aftermath.js`), `carry-facts.js`, item provenance (`lib/items.js`), deed rows (`card.js`), and the chapter
  cards (`story-fx.js`, the Chapter 1 card never shows Day).
- `nextObjective` as in 3.3.

---

## 4. Party: Taela Greenmantle (T)

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

`refuses` is checked in `rules/gear.js` against `item.kind`; confirm the armor kinds are `mail` and `plate`, else use
the right kinds. If `quarterstaff` or `hood` bases do not exist, use the nearest (`staff`, `cowl`).
**Decided:** secondary is `['knowledge']` (beastmastery has no skills yet). **Decided:** her elven parent stays vague;
no line names or places them.

### 4.2 New skills (`src/data/skills.js`)

| id | target | effect | mp |
|---|---|---|---|
| root-snare | enemy | a copy of `rootbind` that scales off WIS | 3 |
| draw-the-rot | ally | cleanse `['rotting', 'poisoned']`, heal 1d6+WIS | 3 |
| greenmantle | ally | apply `regenerating` | 4 |
| cool-the-roots | all allies | cleanse `['burning']`, apply `warded` | 7 |

### 4.3 When she joins

- **Decided:** a guest from beat 4 at Eldergrove (`c1-shard-glows`), a level above the party. A guest counts in fights
  and gets full XP (awardXp gives every active hero the full amount).
- For good at beat 14 (`c1-node-cools`), at `max(her level, the hero's level)`.
- **Change in `src/rules/gauntlet.js` (F):** `partyLevel()` averages non-guest heroes only, so a guest one level up does
  not push `{ level }` checks and weak-pack checks up.
- **One level source for gates [C26]:** docks and regions use the hero's own level (`{ heroLevel: n }`), never
  `partyLevel()`.

### 4.4 Look

16×24 walker and 64×64 battle rig. Slight but not Aurosi-light ("carved from heavier wood"). Ears half-pointed. Dark
auburn hair tied back with leaves and twine. A long moss-green hooded mantle, patched, its hem stained black from the
Rot. Bark-stained hands and forearms. Tired eyes with shadows under them. Soft wrapped boots. A living-wood staff with a
twig still sprouting. Add her to the hero art the same way `yara` was added in T1, with a portrait for the party screen.

---

## 5. Fights (T)

All in `src/data/thareia/c1-encounters.js` (`C1_ENCOUNTERS`, `C1_PATROLS`, `C1_HEARTH_IDS`) with the T1 helper
`S(family, level, o)` (`noWaking: true`, `gearTier: 0` unless set). Zones and hearthfires go in
`src/data/thareia/c1-world.js` (`C1_ZONES`, `C1_HEARTHS` in the `H(...)` form of `data/world.js`). Story fights are
`once`.

**The solo rule [C23].** Before `c1-taela-guest`, a fight on the main path has at most 2 foes, no foe above level 4, and
no foe more than one level above the early-route hero's expected level at that point (the table in 5.5). Optional lairs
are exempt; each one's text warns the player off ("Come back with someone at your back."). The only such lair is
`c1-snag-wallow`.

**Decided on names [C28].** The `tallyman` family is reused for stats only. Every spawn sets `name`, so the family's name
never shows: "Crate-Runner", "Lamp-Runner", "Hollis Fairweight", "Vesper". Relics whose text names an old faction get a
Thareia copy in `src/data/relics.js` with the same numbers and new text (5.1). No Thareia lock uses the `tally-seal` type.

### 5.1 Encounters

XP is `tier XP × level` summed over the spawns (rabble 7, veteran 16, relic-bearer 48, champion 110 per level), checked
with `buildFoe`.

| id | map / at | spawns | mode | backdrop | XP | notes |
|---|---|---|---|---|---|---|
| c1-landing | th-landing (trigger) | cutpurse 1 ×2 `{ name: 'Road-Rat' }` | story, once, gentle | verdant-wood | 14 | a level-1 hero alone must win it |
| c1-verdant-edge | th-thornway (trigger) | briarling 2, thornhound 3 | story, once | verdant-wood | 35 | teaches Rooted |
| c1-runner-camp | th-thornway [11,40] | tallyman 3 `{ name: 'Crate-Runner', relics: ['th-crateknife'] }`, cutpurse 3 | block, once | verdant-wood | 69 | the solo hero's first relic |
| c1-bramble-deep | th-thornway [15,20] | bandit 4 `{ gearTier: 1, wears: ['thornwatch-boots'] }`, briarling 3 | block, once | verdant-wood | 85 | starts S2 |
| c1-snag-wallow | th-thornway [22,34] | oldsnag 6 (thornsplitter) | lair, once, optional | verdant-wood | 288 | "Come back with someone at your back." |
| c1-grove-circle | th-eldergrove [4,6] | feral-druid `thornmother` 5 `{ name: 'Oda the Thornmother' }`, briarling 4 | lair, once, story | eldergrove | 268 | Oda flees (text); she is not killed. If the sim's early-route win rate is under 80%, drop Oda to level 4 |
| c1-roots-grubs | th-heartroot-1 [13,20] | rotgrub 7 ×3 | block, once | heartroot | 147 | |
| c1-roots-sapwight | th-heartroot-1 [13,1] | sapwight 7, rotgrub 7 ×2 | block, once | heartroot | 210 | |
| c1-missing-patrol | th-heartroot-1 [19,11] | hollowed-ranger `sergeant` 7 `{ name: 'Sergeant Edda Vane' }`, hollowed-ranger 5 ×2 | block, once, optional | heartroot | 496 | the rangers wear a Thornhollow longbow and brigandine at gearTier 1 |
| c1-mire-bog | th-mossfall [24,14] | boglurcher 5 ×2, smuggler `reedcutter` 5 | pack, optional | mossfall | 105 | |
| c1-mf-runners | th-mossfall [42,13] | smuggler 5 ×2 | block, once, optional | mossfall | 70 | opens the ford chain |
| c1-mire-shrine | th-mossfall [42,18] | mirelord 6 `{ name: 'Gorrow' }` (mire-pearl), boglurcher 5 | lair, once, optional, hard | mossfall | 323 | |
| c1-mw-stair | th-mosswatch-1 [7,4] | tallyman 7 `{ name: 'Lamp-Runner' }`, smuggler 7, smuggler 6 | block, once, main | mosswatch | 203 | talk `c1-mw-stair-before` |
| c1-mw-lantern | th-mosswatch-2 [6,5] | tallyman `signalmaster` 8 `{ name: 'Hollis Fairweight' }` (mosswatch-lantern), smuggler 7 | lair, once, main, dark | mosswatch | 433 | |
| c1-fjord-crew | th-fjords-cove | smuggler `diver` 7, smuggler `bargehand` 7, smuggler 7 | block, once, dark | mosswatch | 147 | |
| c1-fjord-cove | th-fjords-cove | smuggler `queen` 8 `{ name: 'Skeet Marrow' }` (th-lightfingers), smuggler 7 | lair, once, dark | mosswatch | 433 | Skeet as the relic-bearer |
| c1-fjord-inlet | th-fjords-cove, optional | blackwater-gar 7 ×2 | lair, once, dark | mosswatch | 98 | |
| c1-glowcaps | th-hindwood [25,22] | glowcap 8 ×3 | block, once, main | verdant-wood | 168 | opens both stream crossings |
| c1-feral-druid | th-hindwood [18,28] | feral-druid 7, thornhound 7 ×2 `{ name: 'Rot-Twisted Hound' }` | **block**, once, `talk: 'c1-burners'` | verdant-wood | 210 | skipped if talked down [C4] |
| c1-vesper | th-fawnrest [16,13] | tallyman `apothecary` 7 `{ name: 'Vesper' }`, smuggler 7 ×2 | block, once, optional, talk | fawnrest | 210 | "miracle sap"; the check uses the best hero |
| c1-node-stair | th-fawnrest-node | rotgrub 9 ×2, mire-leech 9 | block, once | fawnrest-node | 189 | |
| c1-node-hall | th-fawnrest-node (the `c1-fn-hall` trigger) | glowcap 9 ×2, mire-leech 9 ×2 | story, once | fawnrest-node | 252 | new |
| c1-node-roots | th-fawnrest-node | sapwight 9 ×2, rotgrub 9 | block, once | fawnrest-node | 351 | |
| c1-guardian | th-fawnrest-node | rotstag `guardian` 9 | lair, once, noFlee, boss | fawnrest-node | 990 | 5.2 |
| c1-gloamwing | th-hindwood [22,12] | gloamwing 10 (dawnbell) | lair, once, optional, after node | verdant-wood | 480 | |
| c1-dael-bounty | th-briarmaw-den [8,5] | briarmaw 10 `{ name: 'The Nameless Beast', relics: ['th-thornwreath'] }` | lair, once, optional, after node | briarmaw-den | 1100 | S6 |

Hearthfires (`C1_HEARTH_IDS`, and `C1_HEARTHS` entries): `th-tw-hearth` (The Thornway Stone), `th-eg-hearth`
(Eldergrove Hearth), `th-hr-coal` (The Last Green Coal, cold), `th-mf-cairn` (Mossfall Cairn), `th-mw-hearth` (Garret's
Kitchen), `th-mw-fire` (The Mosswatch Fire, cold until the Lantern), `th-hw-cairn` (Hindwood Cairn), `th-fr-camp` (The
Pilgrims' Fire), `th-fr-stone` (The Dreaming Stone, cold until the node).

**Relics [C28, C29].** **Decided:** the old high-level relics (rootsong, oathshield, mosswatch-lantern, mire-pearl,
lightfingers, thornwreath, dawnbell) keep their numbers. A Thareia copy only renames text that names an old-game faction
or place story:
- `th-crateknife`: a copy of `tallyknife` (same stats and moves), named "Crateknife", with new text (a runner's knife
  for cutting crate straps). Its map power keeps its id but never opens a Thareia lock (none uses `tally-seal`).
- `th-lightfingers`: a copy of `lightfingers` whose text drops "Tallyman ledger-seals".
- `th-thornwreath`: a copy of `thornwreath` whose text drops "Briarmaw" (S6's beast has no name).
- `dawnbell` stays as it is ("Rings the Fawnrest bell"); the boss drops no bell (5.2).

### 5.2 The boss: the Hart of Fawnrest

Add `rotstag.variants.guardian` in `src/data/foes.js` (familyOf spreads variant fields over the family, like the bandit
`poacher` and tallyman variants). New relic `fawnrest-heartstone` in `src/data/relics.js` (amulet, ember, grip about 28,
ilvl 9: "the node's sunstone, grown through its chest").

- Name "The Hart of Fawnrest". Tier `champion`. `unique`, `noFlee`. Level 9.
- Base hp 110 (321 at L9). Guard 15 (17). atk 5 (9). dmg 1 (5). `weak: ['frost']`.
- Relics: `rotwood-circlet` (grip 24), `fawnrest-heartstone` (grip 28). Other loot: crystals (ember-salts). No bell
  [C29].
- Moves: gore (2d8 pierce), trample (1d8 crush, all), rot-bellow (CON save or Poisoned), antler-charge (charge, 3d8 +
  Staggered), rotwood-crown (needs circlet; 2d6 blight all, CON half, heals it; applies Rotting), node-flare (needs
  heartstone, else gore; 2d6 ember all, DEX half, Burning), root-call (summon rotgrub, max 2, levelDelta -3), overheat
  (needs heartstone; charge, 3d8 ember + Burning on one hero; Stagger cancels it).
- Phases (d20): at 1.0 "The guardian wakes": 1-7 gore, 8-11 trample, 12-15 rot-bellow, 16-20 rotwood-crown.
  At 0.66 "The node answers": 1-5 gore, 6-8 antler-charge, 9-12 node-flare, 13-15 root-call, 16-20 rotwood-crown.
  At 0.33 "The last white stag": 1-4 gore, 5-9 overheat, 10-14 node-flare, 15-17 antler-charge, 18-20 rot-bellow.
  With both relics pried loose, only gore, trample, antler-charge and bellow remain.
- Dies with a mournful tone and a silent amber flare. It has no lines. It is never called one of Sedrin's amber-veined
  creatures.

### 5.3 Zones and patrols (`C1_ZONES` in `c1-world.js`, `C1_PATROLS` in `c1-encounters.js`)

Pack level is `ZONES[id].level + rng.int(0,1)`. Each zone sits one below the expected arrival level on the fight route.

| zone | level | patrol sets | backdrop | map |
|---|---|---|---|---|
| th-landing | 1 | [cutpurse, cutpurse], [thornhound], [briarling, briarling] | verdant-wood | th-landing |
| th-thornway | 1 | [briarling, thornhound], [cutpurse, briarling], [thornhound, thornhound] | verdant-wood | th-thornway |
| th-roots | 6 | [rotgrub ×3], [rotgrub, rotgrub, mire-leech], [mire-leech, mire-leech] | heartroot | th-heartroot-1 |
| th-mossfall | 6 | [smuggler, boglurcher], [boglurcher, boglurcher], [smuggler reedcutter, smuggler, mire-leech] | mossfall | th-mossfall |
| th-hindwood | 7 | [glowcap, glowcap, thornhound], [thornhound, thornhound, briarling], [glowcap, mire-leech] | verdant-wood | th-hindwood |

**Decided:** the solo zones (th-landing, th-thornway) have 2-foe sets at level 1-2, so an early-route hero at level 1 is
never met by a pack above level 2. No roaming in th-thornhollow, th-eldergrove, th-mosswatch-*, th-fawnrest,
th-fawnrest-node or th-fjords-cove.

### 5.4 Backdrops

| key | fights | art |
|---|---|---|
| verdant-wood | landing, Thornway, Hindwood, gloamwing | painting 8 |
| eldergrove | c1-grove-circle | painting 9 |
| heartroot | Heartroot fights | stays drawn |
| mossfall | Mossfall fights | stays drawn |
| mosswatch | tower and S1 fights (dark ones drawn darker) | painting 11 |
| fawnrest | c1-vesper | `art-in/scenes/battle-forest-ruins.png` |
| fawnrest-node | NEW key (F adds it to BACKDROPS): node fights and the boss | painting 10; drawn fallback: the heartroot drawing tinted amber |
| briarmaw-den | c1-dael-bounty | stays drawn |

### 5.5 Balance targets [C24]

XP curve: `xpToNext(L) = round(30·L^1.55)`. Totals: L2 30, L3 118, L4 283, L5 540, L6 904, L7 1386, L8 1998, L9 2751,
L10 3655, L11 4719, L12 5953, L13 7365.

**Decided (the fix):** story spawn levels are raised (Heartroot, Mosswatch, the node), a third node fight is added
(`c1-node-hall`), the glowcaps are on the main path (5.1, 2.8), and the main path counts exactly one roaming pack on each
roaming map it crosses (Thornway, Heartroot, Mossfall, Hindwood). The sim route enforces that count. The burners are
counted at 0 XP (talked down), the worst case. A pack's XP is the average of its zone's sets: Thornway 2 foes × 7 × 1.5
= 21; Heartroot 2.67 × 7 × 6.5 = 121; Mossfall 2.33 × 7 × 6.5 = 106; Hindwood 2.67 × 7 × 7.5 = 140.

Main path, running total (fight route starts at 63 XP, early route at 0):

| Step | XP | Fight route | Early route |
|---|---|---|---|
| c1-landing | 14 | 77 (L2) | 14 (L1) |
| 1 Thornway pack | 21 | 98 (L2) | 35 (L2) |
| c1-verdant-edge | 35 | 133 (L3) | 70 (L2) |
| c1-runner-camp | 69 | 202 (L3) | 139 (L3) |
| c1-bramble-deep | 85 | **287 (L4)** | **224 (L3)** |
| c1-grove-circle | 268 | 555 (L5) | 492 (L4) |
| c1-roots-grubs | 147 | 702 (L5) | 639 (L5) |
| 1 Heartroot pack | 121 | 823 (L5) | 760 (L5) |
| c1-roots-sapwight | 210 | **1033 (L6)** | **970 (L6)** |
| 1 Mossfall pack | 106 | 1139 (L6) | 1076 (L6) |
| c1-mw-stair | 203 | 1342 (L6) | 1279 (L6) |
| c1-mw-lantern | 433 | **1775 (L7)** | **1712 (L7)** |
| 1 Hindwood pack | 140 | 1915 (L7) | 1852 (L7) |
| c1-glowcaps | 168 | 2083 (L8) | 2020 (L8) |
| c1-burners (talked down) | 0 | 2083 (L8) | 2020 (L8) |
| c1-node-stair | 189 | 2272 (L8) | 2209 (L8) |
| c1-node-hall | 252 | 2524 (L8) | 2461 (L8) |
| c1-node-roots | 351 | **2875 (L9)** | **2812 (L9)** |
| c1-guardian | 990 | **3865 (L10)** | **3802 (L10)** |

| Point | Target | Fight route | Early route |
|---|---|---|---|
| Arrive at Eldergrove | L4 (L3 on the early route) | 287, L4 | 224, L3 |
| After the Heartroot | L6 | 1033, L6 | 970, L6 |
| After Mosswatch | L7 | 1775, L7 | 1712, L7 |
| Before the boss | L9 | 2875, L9 | 2812, L9 (61 to spare) |
| After the boss | L10 (the Keep dock in T3 needs 10) | 3865 (210 to spare) | 3802 (147 to spare) |
| Everything optional before the node | L12 | 3865 + 2380 = 6245, L12 | 6182, L12 |
| Everything, with the two after-node lairs | L13 | 6245 + 1580 = 7825, L13 | 7762, L13 |

(Optional XP before the node: snag-wallow 288, missing patrol 496, mire-bog 105, mf-runners 70, mire-shrine 323, fjord
crew 147, fjord cove 433, fjord inlet 98, the burners if fought 210, Vesper 210 = 2380. After the node: gloamwing 480,
the Nameless Beast 1100 = 1580.)

The old line "Mosswatch keeps the hero from meeting the boss at L8" is withdrawn: without the changes above, the main
path reached the boss at L8 even with Mosswatch. With them it reaches the boss at L9 on both routes.

- Solo stretch (levels 1-4): no fight wipes a hero who rests at each hearth.
- Boss: 30-40% first-try wipe for hero plus Taela at level 9; about 20% if the heartstone's grip is broken early.
- `tools/sim.mjs --route=thareia-c1 [--early]` plays the main path on Auto from a T1-end state (fight route, or early
  route with `--early`), fights exactly one roaming pack per roaming map, and prints the level at each point of the
  table and the boss wipe rate over 200 runs. It fails when a target level is missed. Tune spawn levels, not the XP
  curve.
- If the solo stretch walls, the lever is a ranger guest for the bramble fight (Pip, already a hero id, as a guest). Do
  not change the party list.

---

## 6. Airship (A)

### 6.1 The rented skiff

- **Decided:** Dustwind Skiff Hire (Yara's side business, her cousins at each post, 3.1). Before `c1-skiff-rented`
  every hire post says no ("No sponsor, no skiff"). At beat 7 Aldric vouches for the hero, pays the deposit and one
  flight: the hero holds a **prepaid ticket** (`c1-hire-ticket`), so the first hired flight costs nothing and starts
  from any hire post with one tap. After that each flight costs 10 gp, paid in dialogue before take-off. The fee covers
  the sunstone; no fuel system.
- **Decided [C27]:** this changes design/05 ("hire at any dock, levels 1-10"): hire opens with Aldric's sponsorship at
  beat 7; the hire posts are Thornhollow (the landing), Eldergrove and Mosswatch; Fawnrest is land-only once walked to;
  Mirrordeep routes come in T3. It also changes design/01 ("a rented skiff to level 10"): the main path ends at level 10;
  a player who does everything reaches 12-13 before T3. I carries both into 01 and 05.
- The hero flies it (pilot `warden`). Take-off line is a narrator line: "Licensed docks only, and bring her back in one
  piece."
- At 1× it steers freely over the Verdant Wilds only. It lands only at a dock where `dockState` is ok (licensed, level
  and story pass, within LAND_R). It may land at a licensed dock never visited. It may land back where it took off (the
  fee or the ticket is spent), so the hero is never stuck.
- On the world map, only known docks (`progress.flags.docks[id]`) that pass `dockState` can be tapped; the skiff then
  flies itself there.
- Not allowed: the Fjords harbour (no licence), the Gloomfen and Bogmire (level 36, own skiff), the Heartland and the
  Keep (T3).

### 6.2 Docks (`src/data/thareia/sky.js` DOCKS)

New fields: `license: [...]`, `level`, `if` (a cond.js condition), `hire: true` (has a hire post), `world: [x,y]`
(optional override for toWorld).

| id | region | at (region painting) | map / anchor | license | level | if | hire |
|---|---|---|---|---|---|---|---|
| thornhollow | verdant | [1232,566] (keep) | th-landing / from-skiff | ticket, hire, own | 1 | — | yes |
| eldergrove | verdant | [1278,300] | th-eldergrove / from-skiff | hire, own | 1 | — | yes |
| mosswatch | verdant | [715,462] | th-mossfall / from-skiff | hire, own | 1 | `{ flag: 'c1-west-open' }` | yes |
| fawnrest | verdant | [1075,705] | th-fawnrest / from-skiff | hire, own | 1 | `{ flag: 'c1-fawnrest' }` [C25] | no (land only) |
| bogmire | gloomfen | [405,470] (keep) | bogmire-docks / from-skiff | ticket | 36 for hire/own | — | no |

The Fjords harbour is not a dock (it has no map in T2): it is `SKY_MARKS.fjords = { name, region: 'verdant', at:
[365,205], why: 'licence' }`, drawn grey with "no licence". Keeping it out of DOCKS keeps T1's dock test (every dock
lands on a walkable anchor) true.

**Decided:** the Keep dock and the Heartland region are T3. In T2 the skiff turns back at every edge of the Verdant
painting with the hire flight's `edge` line ("The licence stops at the edge of the Wilds."). T3 adds `heartland`
({col:1,row:0}, `heartland.webp`), the Keep dock at [1035,745] with `world: [815,415]`, level 10 and
`if: { all: [{ heroLevel: 10 }, { flag: 'c1-node-cooled' }] }`.

Place the world-map markers by eye; add `world` overrides where toWorld misses the continent feature (Mosswatch lands
about (238,232) but the continent's tower is near (280,185): use `world: [280,185]` after checking).

### 6.3 Flights

- `FLIGHTS` keeps only story flights (each with a `from` and a `to`, as T1's test checks). The hire flight is its own
  export `HIRE_FLIGHT = { ship: 'rented', license: 'hire', free: true, pilot: 'warden', fee: 10, lines, says: {
  mapHint, locked, unlicensed, unknown, edge } }`. `from` comes from the open string; `to` is null.
- Move the hardcoded strings in `src/ui/screens/sky.js` (the `'yara'` speaker, "The fare is to...", "We just came from
  there") into `FLIGHTS['first-flight'].says`. Both flights read their lines from data.

### 6.4 Rules (new `src/rules/sky.js`, pure)

- `dockState(game, dock, flight)` → `{ ok, why }` with `why` in `'licence' | 'level' | 'story' | 'unknown'`.
  Licence: `dock.license` includes `flight.license`. Level: `{ heroLevel: dock.level }` [C26]. Story:
  `check(dock.if)`. Unknown: world-map taps only, dock not in `flags.docks`.
- `regionOpen(game, region, flight)` → the same shape, from `SKY_REGIONS[id].level`, `license`, `if`.
- Region data: `verdant` level 1, license [ticket, hire, own]. `gloomfen` level 36 for hire/own; the ticket may still
  cross it (the Prologue flight).

### 6.5 Screen changes

- `src/ui/screens/world.js` (F, around line 782): parse `'sky:hire@<dock>'` into `leave('sky', { flight: 'hire', from:
  '<dock>' })`. Keep `'sky:first-flight'` working.
- `src/ui/screens/sky.js` (A) mount takes `{ flight, from }`. For hire flights `to` is null until the player picks a
  dock.
- Guard every use of `to`: the route line (about line 268), the off-screen arrow (about 297) and the bearing in `hud()`
  (about 312). With no `to`, draw no route line; point the arrow at the picked dock, else the nearest landable one. Aim
  text: "Rented skiff: licensed docks only" or "To <dock>: <bearing>".
- Replace `allowed(d)` (about line 84) with `dockState`. At 1×, draw every dock in the region: lit when ok; grey with a
  padlock and "Lv N" for level; grey with "no licence" (and the Fjords mark); not drawn when `if` hides it. `dockNear()`
  offers Land only for ok docks. For hire flights the origin dock is ok.
- World map `pickDock` (about lines 155-164): for hire flights only known, ok docks are tappable. Otherwise play
  `ui-error` and show the flight's `says` line for the reason. Draw unknown docks faintly. No fixed route line.
- Region edge (about lines 217-223): also check `regionOpen`; a closed region turns the skiff back with `says.edge`.
- `arrive()`: keep writing `flags.docks[id]`. Also count `progress.flags.hired` for the Journal. No gold in sky.js.
- **Fee and saves.** **Decided:** the fee (or the ticket) is spent in dialogue and the game is saved before the sky
  opens, so a reload keeps it spent and puts the hero back at the origin dock. Refusing to land farms nothing.

### 6.6 The rented skiff's look

The 2D fallback (6.7) uses painting 16 (`art-in/airship/airship-rental-skiff.png`, the top-down view of the sheet),
cut out and imported by `tools/sky-assets.mjs` into `src/ui/assets/sky/skiff-rented.webp`, with its crystal glow mask
built the same way as `skiff-top.webp`'s. The 3D ship gets the same livery in materials (6.7).

### 6.7 The player's 3D ship (A)

The player's page `art-in/airship/the-magpie-3d.html` builds a toon airship in three.js r186 (a bundled, minified page):
procedural hull, sails and crystals, ink outlines by an inverted hull (a back-face copy pushed out along its normals by a
`thickness` uniform, drawn in one flat ink colour), toon shading with a stepped gradient map, additive glow sprites on
the crystals, a soft round shadow texture on the ground, and a spring (`k` 60, `d` 8) for smooth motion, over a tilted
painted map. The flight screen draws that ship in 3D.

**What to build**
- **Where:** new `src/ui/sky3d/` (A owns it): `ship.js` (build the ship: a port of the page's ship builder into readable
  code, with named parts `hull`, `sails`, `crystals` (4), `rudder`, `pennant`; **no people**: leave out the page's crew,
  captain and any figure), `scene.js` (renderer, camera, the painting planes, the shadow, `project(x, y)` from painting
  px to screen px, `resize`, `dispose`), `motion.js` (pure: bank and pitch from turn rate and speed through the spring;
  node-testable), `webgl.js` (`hasWebGL()`).
- **The ground:** in region mode the region painting is a textured plane in 3D, 1 world unit = 1 painting px, at 1×:
  a perspective camera (fov about 30°) tilted about 15° from straight down, at the distance where 1 painting px = 1 CSS
  px at the ship's ground point. The camera follows the ship as the 2D camera does now (same clamping). The next region's
  painting is a second plane beside the first when the ship is near a shared edge, so crossing looks seamless. Textures:
  the same imported WebP files, sRGB, mipmaps, max anisotropy.
- **The ship:** about the size the 2D sprite is drawn now, floating about 60 painting px above the plane. Yaw follows
  the heading. It **banks into turns** (roll from the turn rate through the spring, at most 25°, the nose dips a little
  when it speeds up), with a slow bob in level flight. Take-off and landing animate the height as the 2D `alt` does.
- **Crystals glowing:** emissive amber material pulsing over about 2 s, plus additive glow sprites (as the page does),
  brighter on take-off.
- **Shadow on the painting:** the page's soft round shadow sprite on the ground plane under the ship, offset away from
  the light by the height and fading a little as it climbs. No shadow maps.
- **Liveries:** `first-flight` in Yara's colours as on the page; the rented skiff in the hire livery (a blue-and-white
  hull band, a striped pennant, the painting 16 colours).
- **What stays 2D:** the world map (the continent) mode is unchanged. Dock markers, the route line, the off-screen arrow
  and the HUD stay 2D, drawn on a transparent canvas over the WebGL one, placed with `project()`.
- **Fallback:** if `hasWebGL()` is false, the renderer throws, or the context is lost, the screen uses today's 2D region
  drawing (the skiff sprite, or the rented one). `?sky=2d` forces the 2D path (for tests and weak phones).
- **Cost:** pixel ratio at most 2; render only inside the existing animation loop; dispose every geometry, material,
  texture and the renderer on unmount. Aim for under 3 ms a frame at phone size. `prefers-reduced-motion`: bank at most
  8°, no bob.
- **three.js:** the npm package `three`, pinned exactly to `0.186.0` (the page's r186) in `package.json`
  dependencies, bundled by esbuild with named imports so unused parts drop out. The build must not fetch anything at run
  time.
- **`tools/build.mjs` (A):** the game-code limit goes from 3.2 MB to 4 MB (warn at 3.6 MB). If the game is still over,
  the delivery uses full minification (`--minify`), and the file is checked the same way. The delivery name becomes
  `thareia-t2.html`. The game is 2964 KB today; expect three.js to add about 500-700 KB.

**A's own checks:** a node test for `motion.js` (turning right banks right, the bank is capped, the spring settles);
`node tools/e2e-t1.mjs` green with the 3D ship (it steers with the keys and taps the world map); a small
`tools/e2e-sky3d.mjs` that opens a hire flight at phone size, steers into a turn, and checks the screenshot shows the
ship (pixels round the centre differ from the painting) and a banked frame differs from a level one; the same with
`?sky=2d` showing the sprite.

---

## 7. Tests (I; each package also runs the checks for its part)

### 7.1 `test/thareia.test.mjs` (add)

1. Every th-* map (2.12): rows from the legend; anchors walkable; entities and exits in bounds; copies keep the old rows
   and set `paint`; lock, gate, chest and trigger ids unique across all maps, old maps included; hearthfires touch their
   stand.
2. Reachability: from each arrival anchor, every main-path entity is reachable once the gates the story has opened by
   then are open (th-thornway with `c1-runner-camp` and `c1-bramble-deep` beaten reaches `tw-n`; th-heartroot-1 with the
   grub knot open reaches `c1-hr-spring`; th-hindwood: `hw-n` is not reachable from `from-thornhollow` before
   `c1-glowcaps` is beaten, and is after; th-fawnrest-node reaches `c1-guardian` with both gates open).
3. Every th-* exit's `to` and `anchor` exist; every gated exit has `sealed` text.
4. Every NPC's talk dialogues exist; every dialogue speaker is an NPC, a hero or `narrator`; every `fight` names an
   encounter; every `cut` names a CUTS key or has a drawn fallback; every `key` names a `C1_KEYS` entry; every `kindle`
   and `unlock` names a map entity; every `coldTalk` and sign `talk` names a dialogue; every flag read somewhere is set
   somewhere (dialogue effects, `loot.story`, T1's nodes).
5. The chapter played through the rules, twice: from the fight-route T1 end state and from the early-route one
   (`th-board-early`, no Yara, level 1). Walk the flags of section 1 by entering dialogues and marking fights won, and
   check at each step: the objective text (3.3), `talkTo` for Aldric, Dael, Taela, Garret and the keeper (no node loops:
   entering the node a talk picks must change what the next talk picks, or be a "wait" line), `c1-taela-guest` puts
   Taela in the party with `guest: true`, `c1-node-cools` clears `guest`, and `end: 'chapter-1'` fires once.
6. `partyLevel()` ignores guests (hero L4 alone plus guest Taela L5 gives 4); `{ heroLevel }` reads the hero only.
7. `dockState`: before `c1-skiff-rented` no hire; Eldergrove ok for hire; Fawnrest hidden before `c1-fawnrest`; bogmire
   `licence` for hire; unknown dock refused on the world map but allowed at 1×.
8. `regionOpen`: hire refused over the Gloomfen; the ticket allowed.
9. The hire choice: with `c1-hire-ticket` the first flight costs 0 and clears the ticket; then it costs exactly 10 once,
   and is disabled when gold < 10.
10. Encounters: every Thareia fight's families exist; no spawn, relic, lock or encounter text shows "Tallym", "tally",
    "Brand" or "Briarmaw"; solo main-path fights (before `c1-taela-guest`, optional lairs excepted) have at most 2 foes
    and no foe above level 4; the guardian variant builds at L9 with 321 hp.
11. Language guard over every Chapter 1 string (dialogue, NPC names and roles, encounter names and text, relic text,
    lock and sign text, quest steps, key items, objectives): no "Dustveil", "Cistern", "Unwaning", "Tallym", "Brand",
    "Sleeper", "Hollow Council", "Rotwarden", "First Seed"; no line over 140 characters; `dayShown` is false after
    `c1-pulse`.
12. T1 stays as it is: the T1 dock test still holds with the dock moved to `th-landing` (the Fjords mark is not a dock;
    the hire flight is not in `FLIGHTS`).

### 7.2 `tools/e2e-t2.mjs` (new; same frame as `tools/e2e-t1.mjs`)

Two fixtures, built by a small script from the T1 end states: `tools/fixtures/t2-start.json` (fight route) and
`tools/fixtures/t2-start-early.json` (early route), loaded through the `__aethTest` hook at the landing. Steps, one
screenshot each, into `tools/shots/t2/`:

1. Load at the landing; the crate-thieves fight on Auto; win.
2. Aldric: 10 gp, courier job; the north gate opens.
3. The hire post refuses (no sponsor).
4. Walk out the north gate; the Thornway trigger fight; the runner camp; the bramble fight (Auto).
5. Eldergrove: Taela; the shard cut; Taela in the party as a guest.
6. The grove circle fight; under the tree; the grub knot; the warm spring.
7. Rest at the hearth: the pulse (the cut, then the note toast); the rest toast shows no day.
8. Back at Thornhollow: Aldric pays the deposit and the prepaid flight; Dael opens the west road.
9. Hire at the landing with the prepaid ticket (gold unchanged); the 3D ship takes off; at 1× tap the Fjords mark
   (refused, "no licence"); land at Mosswatch.
10. The tower: stair fight, lantern fight, the Rot line; the Hindwood road opens.
11. Hire back to Thornhollow (gold drops by 10 once); walk the Hindwood; the glowcaps; talk the burners down.
12. Fawnrest: the keeper, the court, the stair.
13. The node: the stair, the hall and the roots fights, the node cut, the boss on Auto (retry up to 3 times), the
    cooling cut; Taela no longer a guest.
14. Aldric's letter; Dael; the Chapter 2 card.

Then steps 1-5 again from the early-route fixture. Fail on any page or console error. Also run at `--laptop`.

Keep `npm test`, `npm run lint`, `node tools/e2e-t1.mjs` green.

---

## 8. Art (G; the rented skiff sprite is A's)

Numbers are from `design/08-image-prompts.md`. **Every painting has arrived** (`art-in/scenes/t1-t2-manifest.csv`). Each
piece still keeps its drawn fallback.

| # | File | Used by | Import |
|---|---|---|---|
| 5 | walk-thornhollow-landing.png | th-landing (2.11) | trace, then `paint-import --map=th-landing` |
| 6 | walk-fawnrest-node.png | th-fawnrest-node (2.10) | trace, then `--map=th-fawnrest-node` |
| 7 | walk-drowned-fjords-cove.png | th-fjords-cove (2.11) | trace, then `--map=th-fjords-cove` |
| 8 | battle-verdant-road.png | backdrop `verdant-wood` | `backdrop-import --key=verdant-wood` |
| 9 | battle-eldergrove.png | backdrop `eldergrove` | `--key=eldergrove` |
| 10 | battle-fawnrest-node.png | backdrop `fawnrest-node` | `--key=fawnrest-node` |
| 11 | battle-mosswatch-coast.png | backdrop `mosswatch` | `--key=mosswatch` |
| 12 | cut-shard-glows.png | cut `shard-glows` (beat 4); a night-tinted copy with Auros drawn in is cut `grove-pulse` (beat 6) | `paint-import --cut=shard-glows`; G makes the tinted copy and imports it as `--cut=grove-pulse` |
| 13 | cut-node-overheats.png | cut `node-overheats` | `--cut=node-overheats` |
| 14 | cut-guardian-wakes.png | cut `guardian-wakes` | `--cut=guardian-wakes` |
| 15 | cut-node-cools.png | cut `node-cools` | `--cut=node-cools` |
| 16 | airship-rental-skiff.png | the rented skiff (6.6) | A: `tools/sky-assets.mjs` |
| — | battle-forest-ruins.png | backdrop `fawnrest` | `backdrop-import --key=fawnrest` |

G also draws the new looks: prop `node` (large; white-hot until `c1-node-cooled`, then gold), prop `open-slab`, a sign
with `prop: 'deer'`, and the hearth looks of the C1 hearthfires in `map-sprites.js`.

Tracing: each walked painting is traced tile by tile into rows from `src/data/tiles.js` LEGEND, as T1 did for
`walk-bogmire.webp`; paths, decks and floors must be unbroken; `paint-import --grid` writes the overlay into
`tools/shots/paint/` to check walls sit on the painting's; G looks at it before handing over.

Budget: the build was 7.96 MB (the game 2.96 MB, paintings 4.99 MB). The copies reuse paintings already in the old
game; the new paintings and backdrops add about 2-3 MB. The paintings limit (32 MB) is far off; the claude.ai page note
at 16 MB applies to the fragment only.

---

## 9. The player's answers (all **Decided**)

1. **Taela early.** She joins as a guest at Eldergrove (beat 4) and for good after the boss (beat 14).
2. **Old relics.** The old high-level relics keep their numbers. Thareia copies only rename text that names an old-game
   faction (5.1).
3. **The Rot scholar.** A new person, Illeth Sarovan, not Vaelis.
4. **The skiff-hire office.** Yara Dustwind's side business, run by her cousins at each licensed dock (3.1, 6.1).
5. **Taela's elven parent.** Left vague.
6. **The ticket.** A new game starts with a passage ticket and may board at once (T1). Chapter 1 works for both routes
   (section 1), and Aldric's sponsorship comes with a prepaid first flight so the first hire is one tap (6.1).
