# 10 — T2: what was built

T2 is Chapter 1, "The Rot's Roots": the Verdant Wilds, levels 1 to 10, the rented skiff and the player's 3D ship. It
follows `09-t2-spec.md` and the T1 patterns in `07-t1-build.md`. The game is in `../game/`. The build writes
`game/dist/thareia.html` and the delivery copy `game/dist/thareia-t2.html`; `thareia-t1.html` stays frozen.

## What the player can do now
- **Start Chapter 1 from either end of the Prologue.** After the dock fights (level 2) or straight off the passage
  ticket (level 1, no Yara), the skiff lands on **Thornhollow Landing**, a new painted map outside the south gate.
- **Walk the main path** (spec section 1): the crate-thieves at the landing; Aldric's courier job; Ranger Dael and his
  notice board; the Thornway; Eldergrove and **Taela Greenmantle**, who joins as a guest when the shard lights the roots;
  the burners at the stone circle; under the Eldest Tree to the warm spring; **the pulse** at Eldergrove's hearth (after
  it, no day number shows anywhere); Aldric's sponsorship; the west road to Mossfall and Mosswatch Tower; Garret's Rot
  line; the Hindwood (the glowcaps, the burners talked down or fought); Fawnrest and the keeper; the stair under the
  court; **the node** under Fawnrest, the **Hart of Fawnrest** boss, the node cooling; Taela joins for good; the lens;
  Aldric's letter; and the **Chapter 1 card** ("Chapter 2: The Hearth's Tune").
- **Rent the skiff.** Aldric pays the deposit and one prepaid flight. The hire posts are at the landing, Eldergrove and
  Mossfall (for Mosswatch); a flight costs 10 gp after the first. The skiff flies at 1x over the Verdant Wilds painting
  in 3D (the player's ship, banking into turns), lands only at licensed docks, refuses the Fjords ("No licence for that
  dock.") and turns back at the edge of the Wilds. The world map flies to known docks.
- **Eight side quests** (S1-S4, S6-S9): the night run to the fjord cove and Skeet Marrow, Dael's missing patrol, the
  burners, the scholar's samples, the nameless bounty in the cliff den, the goblins, cargo runs, the white deer.
- **Read papers in chests**: a chest with a note (the runners' ledger, the manifest, the signal code) shows it.
- **Key items** in the Journal's Keys tab: the lens and the buyers' letter.

## What was built (by package)
- **F, foundation:** the story effects `join` (guest), `key`, `kindle`, `go`; the conditions `heroLevel` and `key`;
  cold and story-gated hearthfires; `partyLevel` without guests; `dayShown`; the Chapter 1 card; the merge points for
  every `c1-*` data file; the map stubs.
- **M, maps:** the ten walked copies of the old Verdant maps (`th-thornhollow` ... `th-briarmaw-den`, shown as "The
  Cliff Den"), the old rows kept, every spec entity, gate, chest and trigger placed.
- **P, people and scenes:** every NPC, scene, side quest, shop, key item and objective of spec section 3.
- **T, fights:** Taela; 26 fights; the Hart of Fawnrest (L9, 321 HP, two relics, three phases); the zones and patrols;
  the nine fires; the Fawnrest Heartstone and three text-only relic copies (Codex Nos. 75-78, on no Codex page);
  `node tools/sim.mjs --route=thareia-c1 [--early]`.
- **A, airship:** the docks, licences and levels; `src/rules/sky.js`; the hire flight; the 3D ship in `src/ui/sky3d/`
  (three.js, with a 2D fallback and `?sky=2d`); the build's 4 MB game limit.
- **G, art:** the three traced painted maps (`th-landing`, `th-fawnrest-node`, `th-fjords-cove`, each 48 x 32), five
  painted battle backdrops, five cut-scenes (the night `grove-pulse` copy is kept in `art-in/scenes/cut-grove-pulse.png`),
  the node, open-slab and deer looks, and the nine hearth looks.
- **I, integration:** the old game's tests now leave Thareia's quests, shops, rests and relics out (`test/old-world.mjs`);
  the relic totals count only Codex relics; a variant's own relics are held (the Hart now holds the heartstone, and the
  Atlas places it); relic art, Codex holder lines and riddles for the four new relics; Taela's standing look; chest
  notes shown; T2's tests in `test/thareia.test.mjs` (spec 7.1); `tools/e2e-t2.mjs` with the fixtures
  `tools/fixtures/t2-start.json` and `t2-start-early.json` (written by `node tools/e2e-t1.mjs [--ticket]
  --fixture=<path>`); design/01 and design/05 carry the 6.1 hire changes.

## Checks
- `npm test`, `npm run lint`, `npm run build`.
- `node tools/e2e-t1.mjs` and `node tools/e2e-t1.mjs --ticket --out=tools/shots/ticket`.
- `node tools/e2e-t2.mjs` (screenshots in `tools/shots/t2/`): the main path at phone size from the fight-route fixture,
  then steps 1-5 from the early-route one. It trains the party to the spec's 5.5 levels and rests it between scenes,
  since it skips the side fights.
- `node tools/e2e-sky3d.mjs`, and `node tools/sim.mjs --route=thareia-c1 [--early]` for balance.

## Waiting on art or decisions
- **Gear shops:** the engine's shops sell only consumables and gems, so the outfitter's leather, bows and longbow are
  not sold. Needs a decision: add gear shops, or drop them from the spec.
- **S9's reward:** no storied amulet relic exists; the keeper gives 60 gp and two hearth tonics.
- **S2's reward** is the old `thornwatch-hood`; its lore still says "Captain Dael" (Thareia's Dael is a ranger).
- **The Eldergrove brook barrier** (`th-eg-brook`) has no look in the spec and draws as a plain gate.
- **Fawnrest's sky dock** stays at the spec's [1075, 705], which is on a road west of the deer shrine in the painting
  (about [1270, 740]). Worth a look by eye.
- **The Journal** does not show the hired-flight count (`progress.flags.hired`).
- **Lookouts** at Thornhollow and Mosswatch do not mark the Atlas (no `LOOKOUTS` entries).
- **Pip as a guest** for the bramble fight (the spec's lever if the solo stretch walls) is not built.

## Known issues
- **Size:** the game code is about 3.9 MB, over the 3.6 MB warning line and close to the 4 MB limit (above it the build
  minifies fully, about 3.4 MB). The page is about 16.1 MB, just over the claude.ai 16 MB note. G can re-import the
  backdrops at a lower quality if room is needed.
- **Balance:** the solo fights are won 71-92% of the time on the first try, so "no fight wipes" is not met; a boss that
  wipes the party grows stronger, and 2-5% of sim runs never beat it in eight tries. The boss's first-try wipe rate is
  about 30% (target 30-40%).
- **The pulse rest:** the rest toast for the rest that plays the pulse still shows the day (the pulse comes after it);
  every later toast shows none.
- **Taela's look** shares the hero's default auburn hair and reads drab in battle; a stronger look would help.
- **The e2e** trains the party and rests it between scenes rather than playing the side fights.
