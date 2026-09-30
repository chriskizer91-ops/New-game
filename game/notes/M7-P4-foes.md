# M7 P4: the foes, the relics and the balance (the Hearth Below)

Package P4 of `docs/M7-SPEC.md` (§3.2-§3.5, §4.2-§4.4's data, §8's balance). No git was run. Private copy
`scratchpad/m7-p4`; my work folder (tuning aids, caches, logs) is `scratchpad/m7-p4-work`.

Status: **done.** Every Gate 7 target is met with zero stuck runs; the M3-M6 tables are unchanged (see "Balance");
`npm run lint` is clean; the private build succeeds. `npm test`: 554 tests, 547 pass in my copy, and the 7 that fail
are all waiting on another package's half (listed under "Tests in my copy"). In scratch overlays of my files with P2's
and P3's landed files (579 tests, 573 pass) and with P6's (the art tests and my four files, 138 of 138), all of them
pass but P5's walker test (P5 has not landed) and one line of P2's walk harness (Request 1); the P2-P3 overlay's only
other failure is the frozen-files check, because that scratch copy has no `dist/` (it passes in my copy).

## The asks from the lead, the coordinator and the landed packages (all done)

- **`wakeAt`** (the coordinator): `wakeAt: 'hearthstone-keep'` on the four Council fights, `wakeAt: 'chain-fire'` on
  `unsmith`, documented in the encounters header beside `finale` and `allies`; `test/data.test.mjs` checks that every
  `wakeAt` names a real `HEARTHS` id that is a Hearthfire entry. The sim keeps its own wake (a wipe rests at the last
  fire rested at, which is the same fire on this route).
- **Backdrops** (P2, P6): every Act III fight and both Hearthfire entries on their maps' backdrops, the four ids in
  `BACKDROPS`. `ZONES['ash-stair'].level` (22) suits the sim: its patrol wipes 0% and runs from the party 25% of the time.
- **P3**: `talk: 'unsmith'` on the encounter; P3's four `koText` lines adopted as written; the Unsmith's own (on one knee
  before his forge, as P3's after-scene has him; no piece named, since it may have been pried); "stole" for "drew" (the
  family's `text`); the relic lore follows P3's lines (see "The relics"). `TUNING.masterpiece` is unchanged, so P3's
  quests and story-data need nothing.
- **P6**: each family's `art` is its own key and the overseer names `thrall-overseer`; the finale kit's `gearTier: 5`;
  Tamsin's ally spawn has no `relic`; no relic's aspect changed, so `RELIC_ART` stands. With P6's art in the overlay,
  art-keys, art-gloomfen, P6's art-below and my four test files pass 138 of 138.

## Files I changed (and nothing else)

`src/data/foes.js` (the Hearth Below block, not `FOE_TIERS`), `src/data/encounters.js`, `src/data/relics.js` (Page V),
`src/data/rivals.js` (the finale kit), `tools/sim.mjs`, `docs/RULES.md`, `test/data.test.mjs`, `test/battle.test.mjs`,
`test/rivals.test.mjs`, `test/loot.test.mjs`, and this file. `src/data/codex.js` needed no change: Page V's reward
already is the Hearthkeeper's Oath with `save: 1` and 5% resist to every aspect, and the sim gave no reason to tune it
(no sim party completes Page V before the Unsmith). `src/data/items.js` was not needed. No "STUB from the M7 scaffold"
mark and no `stub: true` is left in my files.

## What I built

**The eight families** (`data/foes.js`, spec §3.2), the scaffold's stubs replaced, each drawing as its own art key (P6's):
- `cinder-thrall` (rabble, construct, ember; 17 HP): Cinder Fist (Burns), Ash in the Eyes (DEX or Frightened), Reform
  (hurt: Regenerating). Its veteran variant **`thrall-overseer`** (30 HP, `art: 'thrall-overseer'`, P6's look): Hot
  Chain (Burns), Drive Them (every thrall Hasted), and the thralls' moves.
- `unmade` (veteran, undead, blight; 28 HP): Empty Grip, Phantom Art (2d6 blight, CON for half), Grey Touch (Rotting),
  Husk (Guarding).
- `forge-warden` (veteran, construct, ember, plate; 40 HP, Guard 17): Hammer Arm, Bellows Breath (1d8 ember to every
  hero, CON for half), Hold the Bridge (charging 2d10, Staggered), Stoke (Hasted and Warded). Its texts follow P6's look
  (a firebrick kiln with an anvil head, a hammer arm and a bellows).
- **The Hollow Council** (`hollow-miravel` verdant, `hollow-qasim` ember, `hollow-brundar` stone, `hollow-gretch` blight;
  all human): tier `hollow` with `bonusWhile: <their gift>` and `relics: [gift]` (Nos. 67-70, breakable pieces, not
  `keepsRelics`); every gift Art `requires` the gift, falls back to a plain move, and sits on the d20's 15-20 (a
  natural 11+ reaches them while the +4 holds: half the rolls, three in ten once it is pried); two phases at 1 and
  0.5, the second answering their story (Every Tree That Fell / The Drought / Iron / Fear and Favours); `unique`,
  `noFlee`, `koText`, and Grudge titles of their own (the Unheeded, the Unquenched, the Unforgiving, the Owed ...).
  Details are in `docs/RULES.md` §5.
- **The Unsmith** (tier `unsmith`, two d20s; human, ember; Harrow Ironvein): his three pieces Nos. 72-74 in `relics`
  (hammer, apron, heart, in Codex order); three phases, *The Smith* (Hammer Blow; Ring the Anvil, every hero, Staggered;
  Forge-Apron, the Apron's ward; **Unmake**, the Hammer's: a hit that leaves the hero `unmade` for 2 turns), *The Thief*
  at 0.66 (`steals: true`; `'stolen'` on faces 7-14; his `stolenFallback` **Nothing Left** leaves him Exposed, so a full
  Codex makes him weaker), *The Worldforge* at 0.33 (**Worldfire**, 3d8 ember to every hero, no piece needed; **The
  Heart's Pull**, the Heart's: charging, a hero held "In the furnace" for 2 turns; **Heart Flare**, the Heart's). Every
  move that needs a piece names one of his three. `unique`, `noFlee`, `koText`. His blows add a die every 5 levels
  (a foe's add one every 3), because he makes two a turn.

**Tamsin's `finale` kit** (`data/rivals.js`, `RIVAL_KITS[<rival>].finale` for each rival starter): `gearTier: 5` (P6's
finale look), the same moves for each starter but her Art: the Bargain's Edge 1-3, **Pry It Loose** 4-5 (a crushing
blow plus `{ type: 'grip', dice: '4d6' }`), Inside His Swing 6-7 (a Stagger: the next of his two moves is lost), her Art
8-10 (the Bargain swung in her old starter's manner: Black Kindling burns, Black Stillness Chills, Black Weight charges and
Staggers), On Your Feet 11 (target `ally`: a ward over the worst hurt of the party), Not This Time 12 (her last stand).
Every move but the ward and the last stand is `target: 'enemy'` (the guest's aim is the foes: the Unsmith, or whatever
stands beside him). None needs a relic: she sold her starter, so her old starter Art is off her table. Her attacks carry
`mult: 0.5` and `diceEvery: 12` (see Decisions 3). Her ally spawn is the spec's plus `wears: 'tamsins-bargain'` and
`name: 'Tamsin'`, and no `relic` (P6: a held starter would replace the Bargain in her hand).

**The encounters** (`data/encounters.js`, §3.3): the nine fights with the spec's spawns and real levels, and the two
Hearthfire entries, all on their maps' own backdrops (`hollow-hall`, `ash-stair`, `chained-deep`, `worldforge`, added to
`BACKDROPS`); the four Council fights (level 6: 38 at Waking 8; chosen Omens: Miravel Frenzied and Thornskinned, Qasim
Frenzied and Swift, Brundar Frenzied and Ironclad, Gretch Frenzied and Swift; `wakeAt: 'hearthstone-keep'`), the road
(thralls 22 and the overseer, the unmade and the forge-warden 6: all 38 at Waking 8), and `unsmith` (level 9: 41 at Waking
8; Frenzied and Ironclad; `finale: true`, `wakeAt: 'chain-fire'`, `talk: 'unsmith'`, the ally spawn above).
`PATROLS['ash-stair']` is the scaffold's (thrall packs of 3 and 2). The header documents `finale`, `allies` and `wakeAt`.

**The relics** (`data/relics.js`, §3.4): the nine written for real, stats a notch above Page IV (ilvl 38-40), each with a
Legend Surge (Stir the Coals, Hollow Thorns, The Given Cup, Let Go, Called In, Bought Dear, Unmake, Nothing Burns
Through, Heart of the World), a map power (the scaffold's ids, kept), two sockets, three deeds and two hand-named
branches. Rarities: No. 000 and the Worldforge Heart `primal`, the rest `regalia`. Aspects and kinds are the scaffold's,
so P6's `RELIC_ART` aspects stand (no aspect changed). Deeds: none asks for the Branded deed, and the four won at or after
the finale (Tamsin's Bargain and the Unsmith's three) ask only for deeds the world still offers once every road fight is
done (First Blood, Untouched, Rout, Fifty Felled, Surge, Legend Strike); the four gifts may ask for Champion Felled and
Pried Loose (the later Council members and the Unsmith count, and the re-armed Gloomfen Champions and holders too). The
gifts' grips: 64, 64, 56 (Brundar is Ironclad), 64; the Unsmith's pieces 44, 40 and 72. Lore follows P3's scenes (the
gifts stamped with the broken ring, a wreath of black thorn, Harrow's rivets, the Ironvein mark on the apron's pocket,
the bigger hammer) and the lead's lore (Harrow stole the plans; he did not draw them).

**`tools/sim.mjs`**: modes `below` and `below-forged` (the Gate 7 targets), `--gloom-cache <file>` (each seed's Gloomfen
end state, as `--iron-cache` does for the Ironspire), a group metric (`GROUPS.council`: the share of runs that wipe
anywhere in the four), the Unsmith's lines (Stolen Arts taken, the guest's falls), the Masterpiece step for the forged
party (`forgeTheMasterpiece`), `BELOW_ROUTE` checked against `ACT3_PATH`, and the Gate 7 table. See `docs/RULES.md` §12.

**`docs/RULES.md`**: the M7 statuses (§4), the M7 tiers, the guest, the Stolen Arts and the Hearth Below's foes (§5), the
gifts' and pieces' grips (§6), Page V's Surges, the Masterpiece's Kindle and the Oath (§7), the Hearth Below's spoils
(none; §9), and §12's M7 part (how to run it, targets vs results, what the tuning settled, the two mode tables).

## Balance (Gate 7: 200 seeds, starters rotated; the same numbers in the full run of every mode)

| mode | target | result |
|---|---|---|
| below | the Hollow Council back to back: 35-45% of runs wipe somewhere in the four | 37.5% (75 of 200) |
| below | no single Council member above 25% (first try) | Miravel 2.5%, Qasim 11%, Brundar 14%, Gretch 13.5% |
| below | the Unsmith with Tamsin, first try 30-40% | 36% (party level 41.1; 38.2 rounds; Tamsin falls in 25% of first tries) |
| below-forged | a forged party with the Masterpiece: the Unsmith <= 20% | 9% |
| below | road fights <= 10% | the thralls 0%, their pack 2%, the zone patrol 0%, the unmade 2.5%, the forge-warden 5.5% |
| below, below-forged | 0 stuck | 0 and 0 |
| every M3-M6 mode | every target unchanged | unchanged: in the full run (every mode, 200 seeds, 1097 s, exit 0) every table from `m2` to `gloom-first-lead` and the Gate 4, 5 and 6 checks are byte for byte those of a run of the untouched copy, and those are the M6 release's (the Ironspire and Gloomfen tables equal `docs/RULES.md`'s; M3 is the M5 section's record: m2 13% / 1% / 33%, direct Tamsin 66% win and Rotwarden 33%, leads2 4%, looper-w2 10%, first-lead 20% / 28% / 23% / 20%). 0 stuck in every mode. |

The party enters at level 36.7 (the spec's "about 36.5"). The sim's party has claimed 34 relics on average, so the
Unsmith always takes six Stolen Arts (the six Gloomfen side relics the sim never collects: the Hexbane Shawl, the Gar's
Tooth, the Cantor's Staff, the Hag-Stone, the Willow-Ward, the Weeping Bow).

**Tuning history** (first tries, 200 seeds; every number is the run's own):
- First guess (the Council at 110-130 HP, the Unsmith at 200 HP with Tamsin's blows at full foe scale): Council 24.5%
  (Brundar 20.5%, the others 0.5-3%), the Unsmith 40% with **Tamsin dealing 56% of the damage** and the heroes 39%, and
  one run stuck (seed 31: a level-35 party lost eight close fights).
- Tamsin brought down to one more strong hero (blows at half weight, a die every 12 levels): her share 34%, and the
  Unsmith jumped to 81.5%: his two moves a turn were each a full Champion's. His blows now add a die every 5 levels:
  44.5%, then HP 200 -> 170 -> 185 settled near the band.
- The gifts came loose by round 3: grips 40 -> 56-64 hold them to round 4.4-5.5 (the +4 on 18-24% of a member's
  intents). A Legend Strike jars 25% of any piece loose, so bigger grips barely help; the Worldforge Heart (72) still
  usually comes loose before his last phase (round 14.6 of 38), and phase 3 keeps its fire (Worldfire needs no piece).
- The Council redistributed: Miravel 120 -> 150 HP, atk 10, dmg 7 (the first one, fought fresh: she drains the party
  for the next three); Qasim 110 -> 125; Brundar 130 -> 110, Guard 19 -> 18 (Ironclad); Gretch 110 -> 140, Guard 19:
  from 1/3/21/2% (group 24.5%) to 2.5/11/14/13.5% (group 37.5%).
- The Unsmith's Hammer Blow settled the band: 2d10 (29-30%), 2d12 (42%), 2d10 with a die every 4 levels (41%), 2d10 and
  1d6 more (32%), **2d10 and 1d8 more (36%)**.

## Tests (541 in the base; 554 now: data +5, battle +4, rivals +2, loot +2)

**Changed** (old -> new), each an extension or a strengthening the brief asks for; no assertion was removed or loosened:
1. `test/data.test.mjs`, "every move table covers every face of its intent die":
   `assert.ok(row && moves[row[2]], ...)` -> `assert.ok(row && (moves[row[2]] || stolen), ...)`, where `stolen` holds only
   for a row whose move is `'stolen'` in a phase with `steals`, and the family names a real `stolenFallback` that needs no
   relic (P1's contract, spec §4.4). The tables now also carry each phase's `steals`.
2. `test/data.test.mjs`, "all 75 carry sockets ... two awakening branches": `HAND_NAMED` gained the nine Page V relics
   (so each must be hand-named and carry two sockets: stronger).
3. `test/data.test.mjs`, "M5 foes ... (no scaffold stubs left)": `every(f => !f.stub || M7_STUBS.includes(f.id))` ->
   `every(f => !f.stub)` (the scaffold's exception list is gone: back to full strength, as the brief says).

**Added:**
- `data.test`: "M7 foes" (the eight families: tiers, kinds, aspects, own art, what §3.2 says; the overseer's own look;
  the uniques unique, never fleeing, with a `koText`); "M7 the Hollow Council" (tier, `bonusWhile`, the gift as a
  breakable piece with a grip, not kept; two phases; every gift Art needs the gift, falls back, and sits exactly on
  15-20; the second phase answers the story; their own words and titles, none shared); "M7 the Unsmith" (two d20s, the
  three pieces and what needs them, the three named phases, Unmake's `unmade`, the Thief's `steals` with at least six
  stolen faces and a real fallback that Exposes him, the fire on every hero with no piece, the heart's pull);
  "M7 relics" (the Page V table, Surges the engine fires, two sockets, how each comes, post-finale deeds, the Bargain's
  darker twin, the Oath's `save: 1` and 5% for every aspect); "M7 encounters" (the nine fights' spawns and backdrops,
  levels at Waking 8, chosen Omens with Frenzied, **every `wakeAt` names a real Hearthfire** (the coordinator's ask), the
  Council's at the Eternal Hearth and the Unsmith's at the Chain Fire, the finale with Tamsin's spawn and `talk`, the
  ash-stair zone).
- `battle.test`: the Hollow Council's +4 while the gift holds and its loss when pried, driven with each real family;
  the Unsmith's two intents and two moves a turn, the Thief taking six never-claimed relics highest first (+1 Guard each,
  each coming up on his table) and the Worldforge phase; a full Codex (nothing taken, no Guard, the fallback plays and
  Exposes him); Unmake (Unmade 2 turns, the Surge struck to Heroic Strike), the heart's pull ("In the furnace"), and each
  piece's Arts falling back when pried.
- `rivals.test`: every rival starter's finale kit (every d12 face, the same moves but her Art, her Art on 8-10, no move
  needing a relic, aimed at the foes but her ward and her last stand, one pry with a crushing blow, blows at half weight);
  the Unsmith's guest for each starter through `startBattle` (ally, guest, the rival variant, the kit, party + 2, the
  Bargain worn, nothing held, not among the foes) and her pry landing on one of his pieces.
- `loot.test`: the gifts and the Unsmith's pieces come off as a Champion's (pried: claimed whole, and `outcome().pried`
  says who; still gripped: shattered; a Champion's two items); nothing of the guest is loot.

**Mutation check** (a scratch copy, `m7-p4-work/mutate.py`): 34 of 34 mutants caught (a Council member without its
`bonusWhile` or on the champion tier, a gift Art on the low faces, the Thief without `steals`, no fallback, `keepsRelics`
on a gift, Unmake without `unmade`, the furnace label, the heart's pull without `requires`, the pieces reordered, a
missing `koText`, shared titles, the thrall's tier, the unmade's aspect, a stub back, a missing or wrong `wakeAt`, a
Twinned Council member, Tamsin at party + 1, no finale, no `talk`, a wrong backdrop, a road foe too high, a Branded deed,
Champion Felled on the Bargain, the Heart as regalia, a gripped Bargain, one socket, the Oath's save, no pry, Tamsin at
full weight, her gear tier, a starter with no finale kit).

**Tests in my copy** (554: 547 pass). The 7 that fail each wait on another package's half:
- `art-keys` (2: the eight families' own art keys and the overseer's, and the four backdrops), `art-gloomfen` (1: a
  family must be drawn) and `world-art` (1: every family walks as its own sprite): P6's foe art and backdrops and P5's
  walkers. The spec allows exactly this ("fails for a new key until both halves have landed").
- `story-data` (2: an encounter's `talk` names a real dialogue, and it can start its fight): `talk: 'unsmith'` (the
  lead's ask) needs P3's `unsmith` dialogue, which has landed but is not in my copy. In the overlay with P3's files both
  pass.
- `walk` (1: the Act III walk, stillwater-lance): see Request 1. In the overlay with P2's `walk.test.mjs` it fails the
  same way, and passes with that one line.

## Requests to other packages

1. **P2 / the lead (`test/walk.test.mjs`, `forceWin`): make a forced win independent of the heroes' to-hit.** The walk's
   party is level 11 and my Hollow Council stands at level 38 (Guard 31): only a natural 19-20 lands, and Hollow Qasim's
   first intent is often Hollow Draught (he heals from 1 HP to about 68 and is Hasted), so the stillwater-lance walk
   loses to him ("a forced win was not a win (defeat) at hollow-qasim: Hollow Qasim L38 353/1482; heroes L11"). The
   exact change, in `forceWin`:
   `for (const u of Object.values(b.units)) if (u.side === 'foe') u.hp = 1;` ->
   `for (const u of Object.values(b.units)) if (u.side === 'foe') { u.hp = 1; u.guard = 0; }`
   Checked twice: with it the walk file passes 15 of 15 in my copy and in an overlay with P2's landed `walk.test.mjs`.
2. **P5 (`art/walkers.js`, `art/map-sprites.js`)**: walkers for the eight families' own keys and for the overseer's
   `thrall-overseer` (P6 asked the variant to name its own key; `world-art` walks every variant's key).
3. **Lead (`rules/gauntlet.js` `SPOILS`, optional)**: the Hearth Below pays no forge materials (the set lists the Act II
   regions). Nothing needs them: the sim's party arrives with 12 embers, 20-23 silver and 3 Bog Amber, more than the
   Masterpiece asks. Add `'below'` only if the Council and the Unsmith should pay a Champion's spoils.
4. **Lead (`rules/autoplay.js`, optional)**: the autoplay never heals or revives the guest (`healPlan` reads
   `unitsOf(s, 'hero')`), so in the sim Tamsin falls in 25% of the Unsmith's first tries. A player can heal her. If the
   autoplay (the UI's Auto) should, the Unsmith gets easier and needs retuning; I tuned to the policy as it is.
5. **P7 (e2e-battle facts)**: a Council member's first intent carries `bonus: 4` (and `natural`); its gift Arts are on
   15-20 of both phases (Hollow Bloom / Hollow Harvest, Hollow Draught / Drink Them Dry, Iron Grip / Ironfall, Too Tight
   / Every Favour Owed); the gift comes loose around round 4. The Unsmith shows two intents (`slot` 0 and 1); his Thief
   phase is at 66% (the `stolen` event, Stolen Arts on faces 7-14), the Worldforge at 33% (the heart's pull holds a hero
   "In the furnace"); Unmake is on the Smith's 17-20 and the Thief's 15-17. Tamsin is `a1`, gear tier 5, and her kit's
   Pry It Loose is on her d12's 4-5. From a new game every save leaves him six to take.

## For the lead to decide

1. **A gift still gripped when its wearer falls shatters** (the Champion's rule; `rules/loot.js` unchanged). The spec
   says the gift "comes off and is claimed, like a Champion's piece (not keepsRelics)": I read "like a Champion's piece"
   literally (pried: claimed whole; beaten gripping it: shattered, and Hilda's reforge makes it whole and Claimed). In the
   sim the autoplay pries every gift and every piece (claimed 200 of 200, 600 of 600). If a knockout should give the gift
   whole, the rule change is in `battleLoot` (e.g. a family flag read where `keepsRelics` is), and the loot test's
   "still gripped, shattered" line would change with it.
2. **Tamsin's weight.** At a foe's full scale she dealt 56% of the damage and carried the finale; she now fights at half
   weight with a die every 12 levels (`mult: 0.5`, `diceEvery: 12`: 33% of the damage, the heroes 61%). Her level is the spec's
   party + 2. A stronger Tamsin needs a stronger Unsmith; the numbers are in `data/rivals.js` and `data/foes.js`.
3. **The Worldforge Heart usually comes loose before the Unsmith's last phase** (any Legend Strike jars a quarter of a
   piece's grip loose), so the heart's pull is a threat for a party that leaves the Heart for last; Worldfire keeps the
   phase dangerous either way. Say if the heart's Arts should outlast the prying (e.g. a phase-3-only grip).
4. **No price change for the Masterpiece** (`TUNING.masterpiece` stays the spec's: 5 embers, 5 silver, 2 Bog Amber, 2000
   gold), so P3's quests and the story-data test need nothing. The sim's party carries 29,000-46,000 gold (it never
   tempers); a real player spends gold on tempering, so 2000 gold is a fair last price.
5. **`TUNING.unsmith.stolen` unchanged.** A Stolen Art's strike (3d8, a die every 6 levels) is lighter than his own
   blows; the Thief's weight is the +1 Guard each (+6 in every sim run), which is what makes a full Codex count.
6. The seven failing tests in my copy (above), and Request 1.

## Where things are

- Tuning aids (not in the tree): `m7-p4-work/tune.mjs` (one fight from each seed's state, damage by side and by move,
  when pieces come loose), `inspect.mjs` (the party at the Gloomfen's end), `mutate.py`, `gloom-cache.json`
  (`--gloom-cache`), `iron-cache.json` (the lead's), the run logs `t1.txt`-`t14.txt`, `sim-base-full.md` (every M3-M6
  mode on the untouched base) and `sim-final-full.md` (every mode, final).
- The overlay used to check my data against P2's and P3's landed files: `m7-p4-work/overlay` (a scratch copy; nothing
  written in their copies).
- Private build: `m7-p4/build/aethermoor.html` (the game 2650 KB; the build's 2.5 MB warning was already there).
