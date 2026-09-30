# M7 P6: battle and item art (the Hearth Below)

This note covers package P6 of `docs/M7-SPEC.md` §6.2 (brief: `m7-briefs/P6-battle-art.md`). All the art is procedural pixel art in
code, in the M3-M6 battle style. No git was run.

- **Files I own and changed:** `src/art/foes.js`, `src/art/scenes.js`, `src/art/recipes.js`, `src/art/item-looks.js` and
  `src/art/icons.js`, plus one new test of my own, `test/art-below.test.mjs`.
- **Owned but unchanged:** `src/art/item-art.js` and `src/art/index.js` (the new keys go out through the existing
  exports).
- **Not touched:** the frozen art (`art/heroes.js`, `art/hero-looks.js`) and the card reveal. I also left
  `tools/gallery*`, which P5 owns in M7.
- **Private folder:** `scratchpad/m7-p6/build`.
  - The build is there.
  - The gallery shots are in `build/gallery`, and the card-reveal shots in `build/reveal`.
  - The check scripts are in `build/work`.

**Status: done.** Everything in §6.2 is drawn, and nothing in my files is a stand-in. The data still names borrowed
art until P4 and P2 switch it over; the exact changes are under "Requests to other packages".

## Rules I held to

- **Add, don't change.** Every M2-M6 foe, backdrop, relic, item kind, icon and relic-dressed hero is unchanged, byte
  for byte.
  - A private script (`build/work/hash-art.mjs`) hashes 2083 renders. Its baseline, `baseline.json`, was taken before
    any edit. It covers:
    - every foe in every pose, gear tier, tier, phase and piece, flipped, reduced and tinted;
    - every backdrop at three sizes, with its dark pass, layers and ambient;
    - every relic at every temper, gem and stage;
    - every item kind;
    - the heroes holding every relic;
    - every icon, die and map foe.
  - Final run: 0 of the 2074 older renders changed.
    - The 9 missing renders are the scaffold's stand-in relics, which are now drawn.
    - The 188 added renders are the new keys.
  - One detail of that check: its `foeLooks` JSON dump includes each gear look's object id (`cache.js objId`, a
    counter shared by the whole process).
    - Tamsin's new gear tier 5 adds renders ahead of the 21 humanoids after her, so their ids shift.
    - With Tamsin's loop capped at her five old tiers (`hash-art-cap.mjs`, `CAP_TAMSIN=5`), all 2074 match.
    - So the looks are unchanged; only the counter moved.
- **New looks come only through new recipe styles, params, builders and listings,** as in M3-M6. The new materials
  are all prefixed `m7.`, so they cannot collide with another package's.

## What I made

### Relics (`recipes.js`, `item-looks.js`)

The nine Page V `RELIC_ART` entries are drawn for real; no `stub` is left. Each one uses a new recipe style or param,
so no older item changes:

| Relic | How it is drawn |
|---|---|
| **No. 000 Fenwick's Poker** | mace style `poker`: an old iron hearth poker, worn smooth, with soot on it and an ember glow at the tip. |
| **The Hollow Wreath** | circlet style `hollow`: a crown of black thorns on dead wood, with voidglass and violet light. It has battle-only params `thornK` and `tips`. |
| **The Hollow Chalice** | focus style `chalice`: a void-iron cup with violet-black deep glow inside. |
| **The Hollow Gauntlet** | a void-iron plate glove with violet veins, blackthorn talons (gloves param `talons`) and a voidglass cuff gem. |
| **The Hollow Chain** | amulet style `office`: a mayor's chain of office in void iron, with a voidglass medallion and a violet tally. |
| **Tamsin's Bargain** | Hearthbrand's shape in void iron, with an ink bleed on the blade (sword param `bleed`, drawn in non-glowing `m7.ink`) and a violet fuller. |
| **The Unmaking Hammer** | a black-iron peen head with violet unmaking cracks, a violet seam and a silver mark, on a void-iron haft. |
| **The Ironvein Apron** | leather style `apron`: scorched smith's leather with a brass mark and an ember vein. |
| **The Worldforge Heart** | ring style `heartcage`: a heart of molten metal in a black iron cage (primal). |

- New materials: `M7_MAT`, registered with the `if (!MAT[k])` guard.
  - `m7.violet`, `m7.voidiron`, `m7.voidglass`, `m7.deadwood`, `m7.blackthorn`
  - `m7.hollowskin`, `m7.ashskin`, `m7.cinder`, `m7.molten`, `m7.husk`
  - `m7.firebrick`, `m7.boatcloak`, `m7.scorched`, `m7.ink`
- Each new style has its sockets.
- The two primal relics (the Poker and the Heart) get the primal frame.
- The `RELIC_ART` aspects copy the data's: ember, verdant, ember, stone, blight, blight, ember, stone, ember.

### Foes (`foes.js`)

Every art key of spec §3.2, each looked at in every pose, gear tier and phase.

**The Hollow Council** (`hollow-miravel`, `hollow-qasim`, `hollow-brundar`, `hollow-gretch`):
- Each is drawn on the rig at 64×64, as their own NPC look corrupted:
  - their skin mixed toward grey (`m7.hollow.<skin>`);
  - violet light in the eyes and around them;
  - the gift drawn from its relic's own recipe, glowing violet-black.
- The gifts:
  - Miravel wears the Hollow Wreath (drawn as her head piece);
  - Qasim holds the Hollow Chalice in his front hand (he fights without a weapon);
  - Brundar is in the Hollow Gauntlet;
  - Gretch wears the Hollow Chain.
- Phase 2 (at half HP): the grey goes to ash and cracks (`m7.ash.<skin>`), and each one's own story shows.
- The gift snapped off (`broken: [gift]`) is gone, and the violet light goes with it.
- `relicHeld: false` draws exactly the same as snapped.
- `def.relics = [gift]` and `phases: 2`.

**The Unsmith** (`unsmith`, 96×96, foot [48, 93]): Harrow Ironvein, drawn as a tall, broad smith.
- His look: copper hair going grey, a copper beard, and soot on him. He wears a tarred boatman's cloak over a smith's
  apron, with a hammer-in-a-broken-ring clasp.
- His three pieces are drawn from their relics' own art, and each is gone once snapped off:
  - the Unmaking Hammer, after which his fist is empty;
  - the Ironvein Apron, after which the scorched shirt under it shows;
  - the Worldforge Heart, after which his chest is a cold, burnt hole.
- His phases:
  - **The Smith (1):** the hammer, with the heart's light leaking at a burnt crack in the bib.
  - **The Thief (2):** hung with what he took, each piece on a chain and glinting (`anchors.glints`).
    - `renderFoe('unsmith', { stolen: [ids] })` draws those relics' own art, at most six.
    - Without ids he draws six generic stolen things.
  - **The Worldforge (3):** the heart burning in his chest through the bib, fire in his veins, molten eyes and a
    smouldering hem.
- The strike brings the hammer down in front of him.
- Beaten, he goes down on one knee, with the hammer dropped.
- `def.relics` holds the three pieces, with `phases: 3` and `stolen: true`.
- **As a face and shoulders** (the lead's note: he is a dialogue speaker, and his portrait may come from his battle
  look), the Smith reads cropped round his head at 24, 32 and 40 px:
  - Hilda's copper hair and a copper beard, going grey only at the temple, where the beard meets the sideburn (the
    grey had been a speckle all through them, which read as noise);
  - a clean face (the random soot had read as pox; the soot stays on his hands and arms);
  - the broad cloaked shoulders, with the apron's brass anvil mark below;
  - at his throat, a larger bronze clasp with the mark struck in it: a dark ring broken at the top right, a hammer
    upright inside it.

  The same head, beard and clasp carry through all three phases.

**The families:**
- **`cinder-thrall`** (64×64, foot [32, 61]): gaunt grey ash-men with ember seams, ember eyes and a coal in the
  chest.
  - The Waking: a shackle (1); slag and both wrists shackled (2); the Unsmith's violet in the seams and horns of
    slag (3).
  - Beaten, it falls into a heap of ash.
- **`thrall-overseer`** (80×80, foot [40, 77]): its veteran, a head taller, with an iron smith's mask, a collar
  bearing the broken-ring mark, and a chain whip.
- **`unmade`** (64×64, foot [32, 61]): a split grey-brown husk with violet eye-holes, holding the violet outline of
  the relic it carried.
  - The Waking grows the outline: a knife, a sword, sword and shield, then a great blade, the shield and a crown.
  - Beaten, it folds up where it stood.
- **`forge-warden`** (80×80, foot [40, 77]): a firebrick kiln construct with a grated fire-door, an anvil head, a
  breathing bellows, chimneys, a hammer arm and tongs.
  - The Waking: bands (1); studs and a second chimney (2); a white-hot fire with violet in it (3).

**Tamsin as the guest (gear tier 5):**
- Her finale look: mail, her red cloak sooty from the Ash Stair, and the Bargain in her hand, with violet motes and
  aura.
- `renderFoe('tamsin', { gearTier: 5, relic: 'tamsins-bargain', flip: true })` draws her facing left on the party's
  side.
  - The light stays top-left and the anchors are mirrored.
  - `flip` already existed in the renderer; the frozen hero art is untouched.
- At gear tier 5 she holds the Bargain whether it is passed as her relic or no relic is passed. A different held
  relic (such as her starter) replaces it in her hand.

**Renderer hooks** (new, and used only by M7 keys):
- `def.phased(H, gear, { phase, held, gT })` on the M3 humanoid path.
- A snapped piece in `broken` counts as not held, for humanoid defs with `relics`.
- `def.pose(P, { …, phase })`.
- `stolen` is passed to beast builds and M3 extras. It joins the cache key only for defs with `stolen: true`, when ids
  are given.
- Stolen glints join the relic points for the glint animation, and `def.aura` receives the render options.
- `TIERS` maps `hollow` and `unsmith` to 3, so the two new tiers the battle passes draw as a Champion's. Tier only
  switches a family's `veteran` gear, which no M7 foe has, so this changes no pixel.

### Backdrops (`scenes.js`)

| Listing | What it shows | Ambient fx |
|---|---|---|
| `hollow-hall` | the Council's First-Age nave, the pillars with the four regions' marks, and the stone chair glowing violet-black on its dais | `hollow` |
| `ash-stair` | the shaft, the black-iron roots, ember veins, the stair down the wall, ash like snow, and the drop red from below, its heat fading up in a dithered, uneven haze | `ashfall` |
| `chained-deep` | the First Sleeper curled like a plated hill, its shut eye and red heart, chain links the size of carts, the roots in its back, the walkway | `deep` |
| `worldforge` | the heart-shaped furnace of black iron and firebrick with its white-gold mouth, molten channels across the floor, and chains hung with broken relics, cages and tongs | `forge` |

- Each has a dark pass, parallax layers and lights (pulse, flicker, cracks).
- `ash-stair` is also the zone's backdrop.

### Icons (`icons.js`)

- `INTENT_DIE` gains two entries:
  - `hollow`: a d20 in `m7.hollowdie`, a smoky ash-grey violet. It is set apart from a Champion's bright amethyst,
    and its pale face keeps the number legible.
  - `unsmith`: a d20 in `m7.forgedie`, forge iron with an ember face.
- Without these, the HUD's `INTENT_DIE[u.tier] || rabble` would have shown a d6.
- `unmade` and `hearthlit` (drawn by P1) are left as drawn. At 12 px they read (a cracked violet gem on an anvil; a
  gold flame on a hearth-stone, apart from Burning), so I did not refine them.

### The Masterpiece and rarity primal

- The item renderer draws a generated `primal` weapon of every base in `MASTERPIECE_BASES`:
  - the card portrait at 64 and 96 px, with the primal starry frame, silver corners and prism gems;
  - the 16 px bag icon;
  - tempered to +10 with gems;
  - in a hero's hand.
- **The card reveal draws primal**, checked in the private build with Playwright, at 360 px and 1280 px:
  - `.card[data-r="primal"]` shows the living-flame conic border spinning, the "Primal" rarity line, and the primal
    corners;
  - it fits at 360 px (the card is 330 px wide) with no horizontal scroll;
  - this holds for the Masterpiece and for the Worldforge Heart (claimed).
- **One gap, not changed: the Legend Surge slam.**
  - `card.css` has no `.ov-slam[data-r="primal"]` rule.
  - A primal item's slam draws the primal corners, but its border and rays fall back to the default gold
    (`rgb(244, 173, 63)`).
  - It sits beside the frozen reveal (`ui/card.js`, `ui/card.css`), so I left it; see "For the lead to decide".

## Tests

- **Added `test/art-below.test.mjs`, 10 tests:**
  1. Every Hearth Below art key draws in every pose, gear tier and phase, flipped.
     - The Waking gives four distinct looks per family.
     - The overseer is taller.
     - The new tiers `hollow` and `unsmith` draw as a Champion.
  2. The Hollow Council:
     - each member is on the rig and holds its data's gift;
     - the gift glints while held and is gone when snapped;
     - `relicHeld: false` is the same as snapped;
     - the violet goes out with the gift;
     - phase 2 has its own look;
     - `foeLooks` gives the grey skin.
  3. The Unsmith:
     - three phases, 96×96;
     - his pieces are his data's relics, and there is one glint per held piece;
     - the phases differ;
     - the Thief glints six generic things without ids, or the named ones;
     - only phase 2 wears them;
     - the heart's light, and the kneel.
  4. The Smith reads as a face and shoulders, measured round the head anchor in palette colours:
     - copper hair and beard far outnumber the grey, and some grey is there (the temple);
     - the face carries no soot;
     - the clasp is bronze with its dark mark inside.
  5. Tamsin at gear tier 5 holds the Bargain, and her flipped render mirrors her.
  6. The four backdrops:
     - each is listed and painted, with its ambient and motion;
     - each is darker in the dark;
     - the chair's violet shows, and the Worldforge burns;
     - every Act III encounter and zone backdrop is listed.
  7. The nine Page V relics:
     - no stand-in is left, and each has its own look;
     - each draws on the card, in the bag and on a hero;
     - the primal ones burn.
  8. The Masterpiece: every base draws as a primal item on the card, in the bag and in the hand.
  9. The two dice: they differ from a Champion's, from bone and from each other.
  10. **The M6 pins:** 54 hashes, taken from the M6 art before any M7 change.
     - They cover 21 foes plus Tamsin on Rotbridge, 14 backdrops, 14 relics and 4 relic-dressed heroes.
     - `AETH_PIN=1` prints them instead of checking.
- **No existing test, assertion or pinned hash was changed.**
- **Counts:**
  - before my work: 541/541;
  - now: **551/551** (541 + 10), confirmed by a full run after the last change;
  - `npm run lint` is clean.

## Checks run

- **The gallery.**
  - P5 owns `tools/gallery*`, so my review entry is private, at `build/work/gallery-below.js`. It is bundled by the
    repo's `tools/gallery.mjs --entry=… --out=build/gallery`.
  - It has shots of:
    - the lineup;
    - each Council member in both phases, snapped, flipped and tinted;
    - the Unsmith in three phases, every piece snapped, the stolen things (none, 2 or 6 ids), the kneel and flipped;
    - each family at gear tiers 0-3 and every pose;
    - Tamsin as the guest in the party line;
    - each backdrop at two times, dark, a mock-up with a foe and the party, and at phone, wide and layer sizes;
    - the relics (card, bag, 96 px, silhouette, on heroes, and the forge's looks);
    - the Masterpiece;
    - the dice and statuses;
    - render cost.
  - I looked at all of them. That review found four things, now fixed (and the lead's note on the Unsmith's portrait
    added a fifth: his face and shoulders, checked in crops at 24, 32 and 40 px):
    - four attack poses ran off their canvas at the right edge (the Unsmith's hammer, the warden's fist, and the
      overseer's and the unmade's reach). Every M7 key now stays inside its canvas;
    - the Ash Stair's drop had a hard, pasted-in top edge; it is now a dithered haze;
    - the hollow die read like a Champion's;
    - the tier names were missing from `TIERS`.
  - Its render check: 948 renders, 0 failures.
  - Render cost (a shared machine, noisy):

    | Item | Cold | Warm |
    |---|---|---|
    | Unsmith | 19 ms | 1.4 ms (the Lantern Mother is 25 ms cold) |
    | Council | 5-10 ms | 1-3 ms |
    | Families | 2-6 ms | 0.2-0.3 ms |
    | Backdrops | 12-23 ms | under 1 ms |
    | Relic portraits | 3-10 ms | 1-4 ms |

- **The private build:** `node tools/build.mjs --out=scratchpad/m7-p6/build` succeeds.
  - The game is **2695 KB** and the paintings 28,217 KB, 30,912 KB in all.
  - M6 shipped the game at 2583 KB. P6 adds about 110 KB of unminified source: foes.js +59 KB, scenes.js +29 KB,
    recipes.js +18 KB, item-looks.js +2 KB, icons.js +2 KB.
  - The game is over the 2.5 MB warning, as M6's already was, and under the 3.2 MB limit. `--minify` is the reserve.
- **The card reveal and slam** in the private build: `build/work/reveal-check.mjs`, shots in `build/reveal`.
  - No page error besides the Google Fonts request, which this sandbox cannot reach.

## What is left as a stand-in, and why

**Nothing in my files.** No `stub` `RELIC_ART` entry and no stand-in `FOE_ART` for any M7 key is left. Two
fallbacks are there by design:

- **The Unsmith without `stolen` ids** draws six generic stolen things (heirloom items of six kinds), until the
  battle screen passes his stolen Arts' relic ids (P7).
- **The Masterpiece** has no bespoke art: it is the generated `primal` look of the base the Warden picks, as the spec
  says.

The data still points at borrowed art and backdrops, in files I do not own. The exact changes are listed next.

## Requests to other packages (exact changes)

**P4 (`data/foes.js`, `data/encounters.js`):**
- Switch each family's `art` to its own key:

  | Family | `art` now | Change to |
  |---|---|---|
  | `cinder-thrall` | `forge-spark` | `cinder-thrall` |
  | its variant `thrall-overseer` | none | add `art: 'thrall-overseer'` (80×80) |
  | `unmade` | `ash-wight` | `unmade` |
  | `forge-warden` | `forgeborn` | `forge-warden` |
  | `hollow-miravel` | `feral-druid` | `hollow-miravel` |
  | `hollow-qasim` | `dune-raider` | `hollow-qasim` |
  | `hollow-brundar` | `bandit` | `hollow-brundar` |
  | `hollow-gretch` | `bog-hag` | `hollow-gretch` |
  | `unsmith` | `ashen-warden` | `unsmith` |

  - The art's pieces already match the data's `relics`: each Council member's gift, and the Unsmith's
    `unmaking-hammer`, `ironvein-apron` and `worldforge-heart`.
  - Tiers `hollow` and `unsmith` (per P1's `FOE_TIERS`) draw as a Champion's, with their own dice.
- Encounter backdrops:

  | Encounter | Backdrop now | Change to |
  |---|---|---|
  | `hollow-miravel`, `hollow-qasim`, `hollow-brundar`, `hollow-gretch` | `scorchgate-vaults` | `hollow-hall` |
  | `as-thralls`, `as-patrol` (and any other Ash Stair fight) | `scorchgate` | `ash-stair` |
  | `cd-unmade` (and any other Chained Deep fight) | `frostmere-below` | `chained-deep` |
  | `wf-warden`, `unsmith` | `harrows-forge` | `worldforge` |

- If a relic's aspect changes in `data/relics.js`, tell the lead, so `RELIC_ART[id].aspect` in `item-looks.js` is
  changed to match. It is one word.

**P2 (`data/world.js`, `data/maps/*.js`):**
- `ZONES['ash-stair'].backdrop`: `'scorchgate'` → `'ash-stair'`, and remove its `STUB from the M7 scaffold` line
  ("until P6 paints `ash-stair`").
- Map backdrops:

  | Map | Backdrop now | Change to |
  |---|---|---|
  | `data/maps/ash-stair.js` | `'scorchgate'` | `'ash-stair'` |
  | `data/maps/hollow-hall.js` | `'scorchgate-vaults'` | `'hollow-hall'` |
  | `data/maps/chained-deep.js` | `'frostmere-below'` | `'chained-deep'` |
  | `data/maps/worldforge.js` | `'harrows-forge'` | `'worldforge'` |

  - Also drop "until P6 …" from those headers.

**P1 with P4 (`data/rivals.js`, the finale kit):**
- Give each starter's finale kit `gearTier: 5`. A spawn's `gearTier` becomes the unit's `artTier`, which draws her
  finale look.
- In the finale, she should hold `tamsins-bargain` or nothing, not her starter. A held starter would replace the
  Bargain in her hand.

**P7 (the battle screen):**
- Draw the guest with `renderFoe(…, { flip: true })` on the party's side. Her anchors come back mirrored.
- Pass the Unsmith's stolen Arts to the art:
  - in `foeLook(u)` (`ui/battle/sprites.js`), set `o.stolen` to their relic ids (at most six);
  - add them to the sprite cache key.
  - Without them he draws six generic stolen things.
- The dice: `INTENT_DIE.hollow` and `INTENT_DIE.unsmith` exist, and the HUD already reads `INTENT_DIE[u.tier]`. The
  "d20 +4" label and the Unsmith's second die are P7's.
- An observation on grip words: `gripWord` in `ui/battle/model.js` returns "Fenwick's" for No. 000, because codex 0
  is below Page IV, while "Tamsin's Bargain" gives "Bargain". It returns "Hollow" for all four gifts.

**P5:**
- **The Unsmith's dialogue face** (`art/map-sprites.js`). The dialogue draws a non-hero speaker with
  `npcSheet(NPCS[speaker]?.art || speaker)`, which looks in this order:
  1. `NPC_LOOKS[key]`;
  2. the battle look, but only when `FOE_ART[key].kind === 'humanoid'` (line 132);
  3. otherwise `villager(key)`, a random villager.

  The Unsmith's battle art is a 96×96 Champion build (kind `beast`, like the Lantern Mother). It cannot be on the
  64×64 rig: `test/art-keys.test.mjs` requires every humanoid art key to render 64×64. So speaker `unsmith` would
  come out as a random villager. The fix is the one the Lantern Mother got in M6, an `NPC_LOOKS` entry. This one is
  tested: it renders on the walker rig, beside Hilda's, as her twin.

  ```js
  // Harrow Ironvein, the Unsmith, as he speaks (M7): Hilda's twin, a tall, broad smith, copper hair cut short and a
  // copper beard, a tarred boatman's cloak over the Ironvein Apron, the Unmaking Hammer in his hand
  unsmith: { H: { build: 'brute', skin: 'skin', hairMat: 'hairCopper', hair: 'crop', beard: true, eye: '#3a1a10', cloak: 'm7.boatcloak', tunic: 'clothGrey', gloves: 'skin', pants: 'leatherDark', boots: 'leatherDark' }, gear: { body: 'ironvein-apron', weapon: 'unmaking-hammer' } },
  ```

  `m7.boatcloak` is registered by `art/recipes.js`, which the walkers already load through `art/item-looks.js`.
- `foeLooks(key)` gives the Council's hollowed looks for walkers or portraits: their `H` with the `m7.hollow.<skin>`
  skin, and their gear looks.
- The `m7.` materials are registered when `art/recipes.js` and `art/foes.js` load, so the walkers can use them.
- My gallery entry (`scratchpad/m7-p6/build/work/gallery-below.js`) can be folded into `tools/gallery-foes.js` as a
  `below` group, if wanted.

## For the lead to decide

1. **The Unsmith's dialogue portrait** (your note). I made his Smith read well as a face and shoulders; see "Foes".
   The existing fallback to "his battle look when that look is humanoid" will not reach him, though. His battle look
   is a 96×96 Champion build, not the 64×64 rig, and an older test pins every humanoid at 64×64. So speaker
   `unsmith` would draw as a random villager, unless one of these lands:
   - P5 adds the tested `NPC_LOOKS.unsmith` above (the Lantern Mother's way);
   - or the portrait crops his battle render round `anchors.head`. That crop is what I checked at 24, 32 and 40 px.

   Which one is your call.
2. **The primal Legend Surge slam** draws gold rays and border, because `card.css` has no `.ov-slam[data-r="primal"]`
   rule. It sits next to the frozen reveal. If it may change, two rules would make it primal:
   - `.ov-slam[data-r="primal"] .slam-rays { background: repeating-conic-gradient(from 0deg, rgba(220, 232, 255, .2) 0 8deg, rgba(0, 0, 0, 0) 8deg 20deg); }`
   - `.ov-slam[data-r="primal"] .slam-card { border-color: var(--r-primal); box-shadow: 0 0 0 3px var(--ink), inset 0 0 0 3px var(--ink), 0 0 60px rgba(220, 232, 255, .45); }`

   The owner would be P7, or the lead if the slam counts as part of the frozen reveal.
3. **The Council is drawn at rig scale** (64×64, as tall as the heroes, like Tamsin and Hodge), not as 96×96
   Champions. They are people, and a lone foe is scaled up on the stage.
4. **The Masterpiece is its base's generated primal look**, with no bespoke art.
5. **`RELIC_ART` aspects copy the scaffold's data aspects.** If P4 retunes an aspect, the art's word should follow.
