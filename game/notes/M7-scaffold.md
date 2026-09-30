# M7 scaffold: every id in the spec stubbed, every test green

The scaffold for `docs/M7-SPEC.md` (the Hearth Below, Act III). Every id the spec fixes exists, is wired up and is
valid; nothing is built for real. Every stand-in carries the comment `STUB from the M7 scaffold` (grep for it: 41
lines in 19 files of `src/`, and 2 in `test/`), and every stub family and stub `RELIC_ART` entry is `stub: true`. No git was run.

**Checks:** `npm test` 524 of 524 pass (507 before: +4 road tests, one per new map, +10 Act III map tests, +3 Act III
walks). `npm run lint` is clean. `node tools/build.mjs --out=<scaffold>/build` builds (the game 2619 KB, about 35 KB
more than before; the build's 2.5 MB warning was already there). `tools/map-shots.mjs --out` drew the four maps. A
short browser check of the build (not an e2e suite) passed on a phone and a laptop: the Atlas's Below view and its two
fires, the realm view without them, six view buttons within 360 px, the Codex's Page V (nine pockets, "No. 000/074"
first), the Hollow Hall in the world, the fifth council playing on entering the Great Hall, and no page errors. The
long e2e suites were not run (the lead runs them; see "For the lead" below).

## Files changed, and why

**New maps** (`src/data/maps/`), each `region: 'below'`, laid out roughly as §2.3 says from existing tiles, with the
spec's exits, anchors, gates, roads and entity ids. The tile layouts are first drafts (P2 lays them out and traces
them from the batch-4 paintings).
- `hollow-hall.js` (36x24): the stair in at the south-west (`hh-up` over `from-vault`), the 5-wide nave (rows 10-14)
  between pillars, four bays with the chair signs (`hh-chair-verdant` north, `-sunscorch` south, `-ironspire` north,
  `-gloomfen` south), the gates `hh-gate-1` to `hh-gate-4` across the nave (look `hollow-gate`, `open: { beaten }`,
  `guard`), each Council member a block beside their gate facing west (the stair), the round table (solid `o`), the
  stair down `hh-down` at the east wall (anchor `from-ash`), the chest `hh-alms` in a north alcove past the fourth
  chair. `hh-up` has the spec's gate and sealed words (text "The stair behind you has filled with ash.", hint "The
  Hollow Council sits until the last chair is empty.": the world shows them as one line). Travel off (`travel: false`).
- `ash-stair.js` (24x36): the switchback stair round a drop (`x`), the Under-Coal (cold) on the first landing (east),
  the narrows below it between two iron roots (`Y`) with `as-ash-gate` held by `as-thralls` (block), two wide landings
  (west middle, east lower) with the zone's roam rects and the pack `as-patrol`, the side ledge's chest `as-cache`,
  `as-up` and `as-down`. Zone `ash-stair`.
- `chained-deep.js` (42x28): the stair in at the north-west, the 4-wide walkway (`=`) along the north over the
  Sleeper's hollow, bending down to the forge door (`+`) mid-east; the narrows between a spur (`o`) and the rim (`^`)
  with `cd-chain-gate` held by `cd-unmade`; the Chain Fire on a platform past it; `sleeper-first` (a large solid prop,
  10x7); the three chain signs at the south-west, south and south-east tunnels; `cd-tamsin` (npc `tamsin`, talk
  `tamsin-return`, `if: { not: { flag: 'tamsin-returned' } }`) on the paving before the door.
- `worldforge.js` (36x24): the door in mid-west (`wf-out`, anchor `from-deep`), the 3-wide molten moat (`~`) a third
  of the way in, the bridge (`b`) with `wf-bridge-gate` at its near end held by `wf-warden`, the great anvil (solid),
  the furnace in the east wall with channels, the Unsmith's lair `unsmith` (3 by 2, his foot inside it) before the
  furnace, and the heart `wf-heart` (a sign) behind him. Music `boss`, travel off.

**Changed:**
- `src/data/maps/index.js`: the four maps registered (after `keep-gallery-3`).
- `src/data/maps/keep-hall.js` (painted; no row changed): the trigger `council-5` (flag-guarded, never `once`), the
  props `vault-boxes` / `vault-boxes-open` (solid, on (21-22, 6), the spec's `if`s) and `vault-stair` (not solid, on
  the exit's tiles, `if: { flag: 'council-5-done' }`), the exit `hall-down` on (21-22, 8) (gated, sealed, region
  `below`) and the anchor `from-below` (21,7,'w'). (20,7) to (21,7) to (21,8) stays walkable before and after (tested).
  The keep-hall painting's stamp test still passes.
- `src/data/maps/eldergrove.js`, `sandspire.js`, `ironhold.js`, `bogmire.js`: Miravel, Qasim, Brundar and Gretch's
  town entities gain `if: { not: { flag: 'council-5-done' } }`; each has a freed twin beside the old spot
  (`miravel-freed` (17,12), `qasim-freed` (25,7), `brundar-freed` (20,6), `gretch-freed` (10,7), `if: { beaten:
  'hollow-<name>' }`, the same npc id). These are final entities, so they carry no STUB comment.
- `src/data/world.js`: `REGIONS.below` exactly as the brief gives it; `ZONES['ash-stair']`; `HEARTHS['under-coal']`
  (ash-stair, stand (21,7,'n'), cold) and `HEARTHS['chain-fire']` (chained-deep, stand (26,2,'n')), both at the Keep's
  Atlas point [540, 390]; `ACT3_PATH` exactly as §2.2; `ACT3_LEADS = {}`.
- `src/data/foes.js`: the eight stub families (below) in a `HEARTH_BELOW` block, spread into `FOES` last.
- `src/data/encounters.js`: the nine fights of §3.3 and the two Hearthfire entries, region `below`; `PATROLS['ash-stair']`;
  the header documents `finale` and `allies`.
- `src/data/relics.js`: the nine Page V relics (below).
- `src/data/codex.js`: Page V, `{ id: 'below', no: 'V', region: 'below', name: 'The Hearth Below', nos: [0, 67, ..., 74],
  reward }`, the reward `stats: { saves: 1, resist: { every aspect: 5 } }`.
- `src/rules/codex.js`: `ON_PAGE` reads `nos` (a page lists its numbers, or gives its range; numbers compared as
  numbers). Nothing else in the rules changed.
- `src/data/dialogue.js`, `npcs.js`, `quests.js`, `ladder.js`, `letters.js`: the story stubs (below).
- `src/art/item-looks.js`: nine stand-in `RELIC_ART` entries, `stub: true`, each its own look from existing parts.
- `src/art/map-sprites.js`: `HEARTH_LOOKS['under-coal'] = 'coal'` (the Last Green Coal's) and `['chain-fire'] = 'brazier'`
  (the Signal Fire's), until P5 draws `undercoal` and `chainfire`.
- `src/ui/lib/atlas-geo.js`: `VIEWS.below` (the Keep's island, 300x200 at (390, 290)) and `REGION_VIEW.below`.
- `src/ui/screens/atlas.js`: the view's name and button ("The Hearth Below", "Below"); an Act III region gets no
  padlock (it has no place of its own on the painting); the realm view leaves the Hearth Below's fires to the Below
  view (see "Spec misfits").
- `src/ui/screens.css`: six Atlas views go three by three on a phone (the rule M6 wrote for five). Without it the
  sixth button, which appears once the vault stair opens, widened the phone page to 507 px.
- `src/ui/screens/codex.js`: a page with `nos` is not sealed; `RIDDLES` and `HOLDER` for the nine.
- `src/ui/lib/items.js` and `src/ui/lib/carry-facts.js`: `RELIC_TOTAL` is the highest Codex number (74), so the label
  reads "No. 000 / 074" and the title's line "1/74 relics".
- `src/ui/world/story-fx.js`: `ahead()` lists only the Act II regions (`act === 2`, was `act >= 2`), as §2.1 says.
- `tools/map-draft.mjs`: its `all` state sets `gloomfen-complete`, `council-4-done` and `council-5-done`, so the four
  new maps draw open.
- Tests: `data`, `forge`, `maps`, `road`, `shell`, `story-data`, `story`, `walk` (listed below).

## The stubs, and what each borrows

**Foe families** (`data/foes.js`; a stub is `{ ...source, id, name, stub: true, variants: {} }` plus the spec's kind
and aspect, so it keeps its source's numbers, moves and `art`):

| id | borrows | tier | kind / aspect | notes |
|---|---|---|---|---|
| `cinder-thrall` | Ironspire `forge-spark` | rabble | construct / ember | variant `thrall-overseer` (veteran, 26 HP, the table stretched from d6 to d8) |
| `unmade` | Sunscorch `ash-wight` | veteran | undead / blight | |
| `forge-warden` | Ironspire `forgeborn` | veteran | construct / ember | |
| `hollow-miravel` | Verdant `feral-druid` | champion | human / verdant | relics `['hollow-wreath']` |
| `hollow-qasim` | Sunscorch `dune-raider` | champion | human / ember | relics `['hollow-chalice']` |
| `hollow-brundar` | Verdant `bandit` | champion | human / stone | relics `['hollow-gauntlet']` |
| `hollow-gretch` | Gloomfen `bog-hag` | champion | human / blight | relics `['hollow-chain']` |
| `unsmith` | Sunscorch `ashen-warden` (three phases) | champion | human / ember | relics `['unmaking-hammer', 'ironvein-apron', 'worldforge-heart']` |

The five uniques are `unique: true`, `noFlee: true`, with a `koText` and a placeholder `text`. Their borrowed move
tables are stretched onto the d20 (`stretch(table, 8, 20)`) so the data test's "every face of the intent die" holds on
the `champion` tier. A `// STUB` comment says P1 moves the Council to `hollow` and the Unsmith to `unsmith`. The
Unsmith borrows the Ashen Warden, not Mother Anvil: borrowing Mother Anvil's moves would break the combat test that
pins which families use her moved moves.

**Encounters** (`data/encounters.js`): `BELOW` (4 levels a Waking, at most 3 Waking Omens) and `BELOW_R` (rabble, 2 a
Waking), like the Gloomfen's. At Waking 8 the road stands at level 38-40: the Council 7 -> 39, the Unsmith 8 -> 40,
the thralls 22 -> 38, the unmade, the forge-warden and the overseer 6 -> 38. The uniques carry two chosen Omens each
(`wakeOmenCap: 0`, never Twinned): Miravel frenzied and swift, Qasim ironclad and swift, Brundar ironclad and
thornskinned, Gretch frenzied and thornskinned, the Unsmith frenzied and ironclad. `unsmith` has `finale: true` and
`allies: [{ family: 'tamsin', kit: 'finale' }]`. Backdrops are stand-ins: the Hollow Hall `scorchgate-vaults`, the
Ash Stair `scorchgate`, the Chained Deep `frostmere-below`, the Worldforge `harrows-forge`. `PATROLS['ash-stair']` is
two cinder-thrall packs (3 and 2).

**Relics** (`data/relics.js`, all `// STUB`): the spec's number, id, name, slot and rarity (`primal` for No. 000 and
the Worldforge Heart, `regalia` for the rest); stand-in aspect, stats, power, map power, deeds (none `brand`), sockets
and awakenings (the `hand()` / `heart()` templates). The four gifts and the Unsmith's three pieces have grip meters
(40, and 48/44/52) and are held through their family's `relics`, so the Atlas's `RELIC_SITE` finds them; the Poker
and Tamsin's Bargain are gifts (`give` in `fenwick-truth` and `tamsin-after`).

| No. | id | kind / slot | aspect | power / map power |
|---|---|---|---|---|
| 000 | `fenwicks-poker` | mace / weapon | ember | `stir-the-coals` / `stir` |
| 067 | `hollow-wreath` | circlet / head | verdant | `hollow-thorns` / `hollow-bloom` |
| 068 | `hollow-chalice` | focus / offhand | ember | `hollow-drought` / `hollow-draught` |
| 069 | `hollow-gauntlet` | gauntlets / hands | stone | `hollow-grip` / `hollow-heave` |
| 070 | `hollow-chain` | amulet / amulet | blight | `hollow-favour` / `hollow-links` |
| 071 | `tamsins-bargain` | sword / weapon | blight | `bought-dear` / `bargain` |
| 072 | `unmaking-hammer` | hammer / weapon | ember | `unmake` / `unmaking` |
| 073 | `ironvein-apron` | leather / body | stone | `forge-apron` / `forge-proof` |
| 074 | `worldforge-heart` | ring / ring | ember | `heart-of-the-world` / `worldfire` |

No map power is a key to any lock (none is in `LOCKS`).

**RELIC_ART** (`art/item-looks.js`, `stub: true`, as the M6 scaffold did): a knobbed black-iron mace; a rotwood and
bark circlet with an amethyst; a black-iron censer; black-iron gauntlets with an amethyst; a black-iron coin amulet; a
black-iron sword with a blight fuller; a black-iron hammer with a blight seam; a dark leather jerkin; a black-iron
signet with a ruby. All nine render; `art-keys.test.mjs` passes.

**Story** (`data/dialogue.js`, `npcs.js`, `quests.js`, `ladder.js`, `letters.js`):
- `council-5`: two lines; `do: set council-5-done`, and `scout` the four Council fights (their posters leave
  silhouette).
- `freed-miravel`, `freed-qasim`, `freed-brundar`, `freed-gretch`: one line each, first in each one's talk once
  `{ beaten: 'hollow-<name>' }`.
- `fenwick-truth`: two lines; `give: 'fenwicks-poker'`, `claim: 'fenwicks-truth'`. Fenwick's talk, first, once
  `{ all: [{ beaten: 'hollow-gretch' }, { not: { quest: 'fenwicks-truth' } }] }`.
- `hilda-masterpiece`: a line and Hilda's usual forge choices. Her talk once
  `{ all: [{ beaten: 'hollow-gretch' }, { flag: 'worldforge-page' }] }`.
- `tamsin-return`: a line; `set tamsin-returned`, `set met-tamsin-below`, `scout unsmith`. Tamsin's talk once
  `council-5-done`.
- `tamsin-after`: a line; `give tamsins-bargain`, `set tamsin-gave`. `AFTER.unsmith`: on victory, while not `tamsin-gave`.
- `the-heart`: a line only (the choice comes later). `wf-heart` carries `talk: 'the-heart'`.
- `isolde-boxes` gains a choice to `council-5` while it has not played ("the thank-you rule", below).
- Quests: `hollow-council` (main, isolde, start `council-5-done`; steps `beaten hollow-gretch`, `flag
  met-tamsin-below`, `beaten unsmith`), `masterpiece` (side, hilda, the spec's start; one step,
  `afford: { gold: 2000, materials: { embers: 5, silver: 5 } }`), `fenwicks-truth` (side, fenwick, start
  `beaten hollow-gretch`; step `owns fenwicks-poker`). Rewards `{}`.
- The Ladder: five `act: 3` posters (the four Council members, the Unsmith), before the rumours.
- `LETTERS.hollow`: the spec's text.

## Tests changed (old -> new)

The one weakening the brief allows is the "no stub family" exception list. Everything else is a pinned value replaced
one for one, a check extended to the new data at the same strength, or a new check.

`test/data.test.mjs`
- Relic vocabulary: `Object.keys(RELICS).length` 66 -> 75; codex numbers `1..66` -> `0..74`; "every relic past No. 24
  is an heirloom with both powers" `codex > 24` -> `codex > 24 && codex <= 66`, and new: Page V is exactly
  `[0, 67..74]`, No. 000 and the Worldforge Heart `primal`, the rest `regalia`, each with a power and a map power.
- Encounter regions: the whitelist gains `'below'`.
- Relic shapes: `names.size` 132 -> 150 (two named branches for each of 75); new: no Page V relic asks for `brand`.
- No stub family: `every(f => !f.stub)` -> `every(f => !f.stub || M7_STUBS.includes(f.id))`, with
  `M7_STUBS` the eight families and a `STUB from the M7 scaffold` comment (P4 removes the list). The one exception.

`test/forge.test.mjs` (Codex pages)
- New: `relicsOn('below')` is `[0, 67..74]`; `pagesDone(claimAll(g, relicsOn('below')))` is `['below']`; Page V's
  reward is the Hearthkeeper's Oath; 73 of the 75 are needed.
- `PAGES.every(x => x.from != null && x.reward)` -> `PAGES.every(x => (x.from != null || x.nos?.length) &&
  relicsOn(x.id).length && x.reward)` (a page lists its numbers or gives a range, and holds relics).

`test/maps.test.mjs`
- Map count 56 -> 60, and new: 4 in `below`.
- Gated exits: the list gains `'hall-down'` and `'hh-up'`.
- "No solid entity stands on an exit tile": a prop that is not solid is let through
  (`!(e.kind === 'prop' && !e.solid)`), as `rules/world.js` treats it; the spec puts the non-solid `vault-stair` on
  `hall-down`. No other prop stood on an exit before.
- World tables: fires 33 -> 35, and new: 2 in `below`. The sealed-exit rule "a sealed exit inside its own region is a
  gate within it" -> "... or its way back out": `hh-up` (sealed region `below`) climbs to keep-hall, whose `hall-down`
  is the region's entry and leads back to it. (`sealed` entries now carry `map: m.id` for this.)
- Reliquary: `byCodex.length` 66 -> 75, and new: the relics with no pedestal are exactly Page V's nine.
- `allKeys({ brand: true })` also sets `gloomfen-complete`, `council-4-done` and `council-5-done`; `LATER` gains
  the same three (the story-gates test clears them for its early states).
- New section (the Gloomfen's, at the same strength): the Hearth Below opens down the vault stair once the fifth
  council is sat, and not before (with every key), `hall-down`'s fields, the vault's props, the trigger's guard and the
  walkable way from the door; the stair back is open before Miravel, shut from Miravel until Gretch, open after; every
  `ACT3_PATH` target reachable per starter from a Gloomfen-complete party at level 8 with only the starter relic; no
  lock on the road or below; `ACT3_PATH` / `ACT3_LEADS` pinned, each target placed once below, the one finale; every
  entity below reachable with every key; the maps hold what §2.3 puts on them (`ACT3_SPEC`: sizes, music, zone and
  packs, gates and guards, chairs, Tamsin's leaving, the lair's footprint, the heart behind him, chests); the roads,
  gate by gate (`ACT3_ROADS`, the spec's table).

`test/road.test.mjs`
- The map list gains the four maps. The route gains `ACT3_PATH` and the leads `ACT3_LEADS`. "Every route fight holds a
  gate or a Brand" -> "holds a gate, wins a Brand or is the finale", and new: the finale is `['unsmith']`, at the end
  of `ACT3_PATH`.

`test/walk.test.mjs`
- New: the Act III walk, three starters, from a Gloomfen-complete save (`gloomfenSave`, built on `ironspireSave`)
  down `ACT3_PATH` (talking to Tamsin after the Chain Fire), then home up `hh-up`; the fifth council plays on entering
  the Great Hall; the road held before at least 7 fights.

`test/shell.test.mjs`
- Carry-over card: `RELIC_TOTAL` 66 -> 74 and `F.total` 66 -> 74. Title line: `1/66 relics` -> `1/74 relics` (both
  regexes).
- Atlas markers: `VIEW_FIRES.realm` was every Hearthfire; it is now every fire of an Act I or II region (33), and
  a new `below` view (its 2 fires) is checked at both sizes with the same 43 px and inside-the-frame rules. New counts:
  2 below, 33 in the realm. (Why: "Spec misfits".)
- Codex binder: new Page V checks (not sealed, `[0, 67..74]`, 0 of 9 needed, its reward), the labels
  `codexNo(...)` "No. 000 / 074", "No. 067 / 074", "No. 001 / 074", and `defaultPage` on a Hollow Hall position is
  `'below'`.

`test/story-data.test.mjs`
- New: `ACT3_POSTERS` (the five, in order, with their encounters) and `LETTERS.hollow`'s text.

`test/story.test.mjs`
- `ladder(g).length` 42 -> 47 (plus 5 Hearth Below posters).

## Codex No. 000: the truthiness sweep

I grepped every `.codex` use in `src/`, `tools/` and `test/` for a truthiness test (`if (r.codex)`, `r.codex ||`,
`!r.codex`, `filter(r => r.codex)`, `r.codex ? :`, `r.codex &&`). **None exists**: every use of a relic's Codex number
is a comparison, a sort or a format. The two `codex ||` hits are the save's codex object (`game?.codex || {}`).
Changed so that No. 000 works:
- `src/rules/codex.js` `ON_PAGE`: a page's relics were `from == null ? [] : range`; now a page with `nos` lists its
  numbers (`p.nos.includes(r.codex)`, so 0 matches), else the range as before.
- `src/ui/screens/codex.js` `isSealed`: `P.from == null` -> `P.from == null && !P.nos?.length` (Page V would have
  shown as sealed).
- `RELIC_TOTAL` (`ui/lib/items.js`, `ui/lib/carry-facts.js`): the count (75) -> the highest number (74), as the spec's
  label says.

Left as they are, and worth knowing:
- `ui/battle/model.js` `ofPageIV` is already numeric (`codex ?? 0`), so No. 000 counts as older than Page IV: its grip
  word is "Fenwick's" (a possessive, as the older relics keep) and `sprites.js` does not draw it worn. Nos. 67-74 get
  the M6 rules ("Tamsin's Bargain" grips as "Bargain"). `test/ui-m6.test.mjs` pins exactly this (`older = r.codex <
  IV.from`). P6/P7 decide whether No. 000 follows the M6 rule.
- `ui/world/story-fx.js` `pages()` (the chapter cards' Pages stat) and `tools/e2e-flow.mjs` (the Codex check on the
  opening page) count pages with `from != null`, so Page V is left out of the Act II cards' "0/4" (the shell test
  computes the same). P7 decides what the Act III cards count.

## Spec misfits, and what I did instead

- **The realm view has no room for 35 fires on a phone.** The brief asks for the realm view's markers 43 px apart
  (`test/shell.test.mjs`), with the two new fires on one "below the Keep" point or spread just enough. Neither fits:
  the 33 fires already stood 43.5 px apart at 318 px, and a search over the whole painting (10 px grid, every pair of
  single spots that pass; then a 4 px grid round the Keep) found no pair of points for the two that keeps 43 px (the
  best, 41.9 px). The phone realm frame (274x168 px inside the margins) holds about 33 at 43 px. So both fires share
  the Keep's point [540, 390]; the realm view leaves the Hearth Below's fires out (`atlas.js` markerList, marked for P7,
  who draws §5's "Below the Keep" marker there), the Below view shows them, and the test checks exactly that. The phone
  realm (region markers) shows a `below` region marker on the Keep once the stair opens. **The lead should confirm.**
- **`RELIC_TOTAL` in `carry-facts.js`:** the brief puts it under "the label", so the title line reads "1/74 relics"
  and the carry-over card's total is 74, though there are 75 relics and 73 to claim. P7 may prefer 75 or 73 there.
- **`ZONES['ash-stair'].level`:** 22, not 38. A zone's level is its Waking-0 base like every other zone's (the M6
  zones are 15-18); at Waking 8 its rabble stand at 38, as the brief's "about 38" means.
- **`hh-up`'s words** are split into `text` and `hint` as every gated exit's are; the world shows them as one line,
  exactly the spec's.
- **The thank-you rule** (`story-data`: every giver can start their quest) needs a line of Isolde's that sets
  `council-5-done`; the trigger alone does not count. `isolde-boxes` gains "Open them together, as the letter said."
  -> `council-5` while it has not played (a real path too: the fourth council leaves you in the hall, and the trigger
  plays only on entering it). Marked for P3.
- **The exit-tile test and `hh-up`'s sealed region** needed the two small test extensions listed above.
- **Biomes and backdrops:** stand-ins from existing ones (`vault`, `ash`, `ice-cave`, `forge`; the backdrops above), not
  the Keep's everywhere (§7 says the Keep's; the brief allows "one that fits"). `ACT3_SPEC` pins the stand-ins with a
  STUB comment. Note that the spec's biome names `ash` and `forge` are already Scorchgate's and Harrow's Forge's
  biomes: P2/P5 should name the new ones apart (or reuse them on purpose).
- **`allies`** is in the data: no data test rejects an unknown encounter field. Nothing reads it yet (P1 adds the guest
  and its check).
- **`the-heart`** is wired as `wf-heart`'s `talk`, but `rules/world.js interact` gives a sign only its text; P1 makes a
  sign's `talk` open its dialogue (the stub's comment says so).
- **`hollow-council`** has no ending step (no `{ ending }` condition yet; P1 adds it, P3 the step). **`masterpiece`**'s
  step is an `afford` of the gold, embers and silver (no condition says "2 bog amber" or "the page"; no
  `{ masterpiece: true }` yet).
- **`saves`** in the Hearthkeeper's Oath is a stat key nothing reads yet (P1).
- **The posters** leave silhouette by scouting: `council-5` scouts the four, `tamsin-return` the Unsmith (the Ladder
  has no `if` for "silhouette until"). The two rumours are not yet folded into the Unsmith's poster (P3).
- **The forge spoils** (`rules/gauntlet.js` `SPOILS`): `below` not added; leaving it out breaks nothing (the Hearth
  Below's fights simply pay no materials spoils). P1/P4 add it with the new tiers' spoils if wanted.
- **No stub needs to be winnable for a checker:** no test or tool in `npm test` fights them for balance. If one does
  (the sim), the stubs are their borrowed families at the levels above.

## For the packages

- **P1 (rules):** the `hollow` and `unsmith` tiers (then move the five uniques off `champion`, and drop the
  stretched tables if P4 writes d20 ones); the guest (`allies`) and its data check; `{ masterpiece }`, `{ pages }`,
  `{ ending }` and the `ending` effect; a sign's `talk` in `interact` (the heart); `saves` in the page reward; the
  spoils list.
- **P2 (maps):** all four layouts are first drafts; the `ACT3_SPEC` biomes and backdrops in `test/maps.test.mjs` are
  stand-ins to replace; `chained-deep`'s hollow (`k`) is walkable (the chain signs are reached through it, east of the
  chain gate); `hollow-hall` and `worldforge` have `travel: false`, `ash-stair` and `chained-deep` `travel: true`
  (they hold the fires); the realm view and the Atlas points (above).
- **P3 (story):** every scene is a stub. `council-5` must keep `set: council-5-done` (the trigger's guard, the vault
  stair, the town entities) and the `scout`s (or another way off silhouette). `tamsin-return` must keep
  `tamsin-returned` and `met-tamsin-below`. `isolde-boxes`' choice is yours to keep or drop (the thank-you rule needs
  some Isolde line that sets `council-5-done`). The rumours' "Found: the Unsmith". The `hollow` letter needs a
  `{ letter: 'hollow' }` in the Council's last after-scene.
- **P4 (foes and relics):** replace the eight families (remove `M7_STUBS` in `test/data.test.mjs` when the last is
  real), the nine relics' numbers, and the encounter levels (tools/sim.mjs); the Unsmith's three phases and stolen Arts.
- **P5 / P6 (art):** `HEARTH_LOOKS` stand-ins (`coal`, `brazier`); the props `vault-stair`, `vault-boxes`,
  `vault-boxes-open` and `sleeper-first` draw as the unknown-prop fallback today; the sign look `throne` stands in for
  the chairs; the gate look `hollow-gate` is only a name so far; the nine `RELIC_ART` stubs; the four backdrops.
- **P7 (UI):** the Atlas: the Below view, the realm's "Below the Keep" marker (the phone realm already shows a `below`
  region marker at the Keep), the six-button bar (fixed for phones in `screens.css`); the Codex: Page V's tab wraps to
  a second row on a phone, and Page V has no `ROAD_NOTE`; the reliquary's line in `ui/screens/world.js` counts
  `Object.keys(RELICS).length` (75) "home" but Page V has no pedestals (none in the spec); the Journal's "Story seals"
  now lists "The road to the Hearth Below" (open region with an entry) from the start of the game, sealed until the
  fifth council; the chapter cards' Pages stat (above); No. 000's grip word (above).

## For the lead

- The realm-view decision above, and `RELIC_TOTAL` 74 on the title line.
- **e2e implications** (not run):
  - `tools/e2e-world.mjs` step 18 pins the Codex's tabs as exactly
    `verdant:true sunscorch:false ironspire:false gloomfen:false`; with Page V there are five, so that check fails
    until P7 updates it (P7 owns the e2e tools).
  - Any e2e that re-enters the Great Hall with `council-4-done` set meets the stub fifth council (its trigger plays on
    every entry until `council-5-done`).
  - After the fifth council the Atlas has six view buttons and the Journal lists the Hearth Below's road.
- Browser smoke scripts used (scratchpad, not in the repo): `m7-smoke.mjs`, `m7-smoke2.mjs`; screenshots in
  `m7-smoke/`, map shots in `m7-shots/`.
