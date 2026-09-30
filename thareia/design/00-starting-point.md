# 00 — Starting point

*Written 2026-09-30, from a read-only audit of the current game (branch `claude/cool-ptolemy-uc93gg` at commit 65cc209,
while Milestone 7 was still in progress) against `../lore/thareia-aethermoor-lore-compendium.md`.*

## 1. The headline

The current game, *Aethermoor: Hearth & Heirloom*, was built from the **original interactive map**
(`aethermoor-interactive-image-map-polished.html`) and the character sheet. The compendium files that map under
**Appendix A.2, [LEGACY]**. None of the locked canon reached the game. A search of the game's data finds no mention of
Auros, Thareia, airships, the Great Tide, the Approach, the Ember Line, the Cartographer's Guild, lizardfolk, gnomes or
elves. The word "aether" appears only in the name "Aethermoor".

So the current game is best read as a **legacy-map spin-off**. A new version built on the canon would be a different
game in the same place, not a sequel to that plot.

## 2. How closely the current game follows the legacy map

Audited place by place: about 111 details (place descriptions, plot hooks, characters).

| Region | As written | Reshaped | Built out | Contradicted | Missing |
|---|---|---|---|---|---|
| Keep & Verdant Wilds | 5 | 8 | 15 | 1 | 1 |
| Sunscorch Wastes | 2 | 11 | 6 | 2 | 8 |
| Ironspire Peaks | 4 | 9 | 3 | 8 | 4 |
| Gloomfen Marsh | 8 | 5 | 10 | 0 | 1 |
| **Total** | **19** | **33** | **34** | **11** | **14** |

- Almost 9 in 10 details appear in some form, but only about 1 in 6 as written.
- The map's open hooks were each given one fixed answer inside an invented plot: 160 relics carried by named foes, four
  "Sleepers" chained under the land as the hearth's fuel, Harrow Ironvein the Unsmith, the rival Tamsin Vale and the
  Tallymen thieves' guild. None of that is in the canon.
- Missing: Theron Duskwalker, Drake, Captain Mara, the Listener. Replaced: Krell (by Brask), Naima (by Sabah), Tenzin
  (by Mother Wynn), Vex (by Captain Ysolde).

## 3. Where the current game contradicts the canon

| Canon (compendium) | Current game |
|---|---|
| Auros hangs over the Keep, "always overhead"; the title art is the Keep at night under Auros | No moon, no sky lore |
| The Eternal Hearth is a sunstone resonance node on the Ember Line ([REFERENCE] mystery) | The hearth burns four chained Sleepers |
| Sunstone lifts airships; Sandspire is the airship capital with an Aurosi Workshop District | No airships; sunstone is a gem and a lantern |
| Fen Rootwalker, halfling Hearth scholar (descended from the legacy Fenwick) | Fenwick, a 900-year-old First-Age hearthkeeper |
| Elder Moss is a halfling woman ([PLAYED]) | Elder Moss is "he" |
| Rotbridge's toll is Dock Bramble's 1 gp ([PLAYED]) | Hodge's toll game (legacy map) |
| Peak's Veil studies the Aether and hears Auros's hum; Stormwatch tracks Aether weather | A drowned choir; an army post facing north |
| Humans, halflings, lizardfolk, dwarves, goblinoids, the Aurosi elves and gnomes | Dwarves and one halfling |

Places where the current game happens to rhyme with the canon, which is worth knowing:
- "The hearth never burned wood" fits the canon's fuel-less Hearth.
- Things sleeping under the land, and old First-Age machinery below, echo the Ember Line, the Warm Roads and the
  amber-veined creatures.
- Sealed lower halls at Ironhold, a warm Scorchgate, a sunken Misthollow, the Whispering Rot: all canon too.

## 4. What the current game can lend the new one

Worth carrying over (to be confirmed per item during design):
- **The engine:** one self-contained HTML file for phone and laptop; save codes; the strict data/rules/UI layering and
  its test suite.
- **Battle:** visible d20 rolls against Guard, the graze rule, the initiative ribbon, intent dice, statuses.
- **The Accretion domains**, already implemented from the character sheet (the compendium keeps the sheet's names).
- **The painted-map pipeline:** the player's paintings traced into walkable maps.
- **The item card and its reveal**, code-drawn pixel art and the gallery tools.
- **Assets:** the Aethermoor, Gloomfen and path paintings, and the painted maps of the places both versions share
  (Bogmire, Rotbridge, Willowmurk, Misthollow, the Tidal Flats, Sandspire, Dusthaven, Ironhold and others). Some will
  need repainting where the canon differs (Sandspire's airship docks, the Aurosi Quarter, Auros in the sky).

Not carried over by default: the relic plot, the Sleepers, the Unsmith, Tamsin and the Tallymen.

## 5. Questions to settle before anything is built

1. **What is the game?** A retelling of the live campaign (Sedrin and Joe in the Gloomfen, the Ember Line, the Warming);
   a new hero in the same months; or an Auros-bound story with airships and the crossing as its spine?
2. **Who does the player play?** Sedrin and the mount (a rider-and-mount game), a party, or a custom hero?
3. **How far does it reach?** Aethermoor only (canon: "Aethermoor gets the density"), Aethermoor plus a trip to Auros, or
   the other landmasses as lures and late destinations?
4. **Where are airships in play?** Fast travel between towns (the canon's "bush planes"), a ship the player owns and
   upgrades, or the setting for whole chapters (the Brightway, the Veil, the Silver Road)?
5. **What is the answer to the mystery?** The compendium leaves the Ember Line's builders and purpose open. The game has
   to commit to an answer, or to one step of it, and it must fit the [PLAYED] facts (the six-pillar chamber, Lira, the
   egg-stone, "not yet").
6. **What stays from the current game's feel?** The loot-card hook, the JRPG battles and the painted maps, or a
   different core loop (the Outrider's Trail's jobs, gold economy and mount care)?
7. **Canon hygiene:** which [LEGACY] characters come back (Hilda, Brundar, Zara, Hodge, Tenzin), and which continuity
   notes (Part XIV) get resolved now?
