# M6 P6: battle and item art (the Gloomfen Marsh)

Package P6 of `docs/M6-SPEC.md` §6.2. All procedural pixel art in code, in the M3-M5 battle style. No git is run.
Files I edit: `src/art/foes.js`, `src/art/scenes.js`, `src/art/recipes.js`, `src/art/item-looks.js`,
`src/art/item-art.js`, `src/art/icons.js`, `src/art/index.js`, `tools/gallery-foes.js` and `tools/gallery-items.js`
(the battle and item sections), and a new test of my own, `test/art-gloomfen.test.mjs`.
Private build folder: `scratchpad/m6-builds/p6`.

Status: **done** (all of §6.2; see "Needs from others" for the three small hooks the UI has to take up).

## Rules I hold to
- Add, don't change: every M2-M5 foe, backdrop, relic, item kind, icon and relic-dressed hero stays pixel-identical.
  A private script hashes 378 renders of them (`scratchpad/m6-builds/p6/hash-art.mjs`, baseline
  `baseline-m6-start.json`, taken before any edit): every foe in every pose, gear tier, phase and piece, every
  backdrop at three sizes with its dark pass, layers and ambient, every relic at every temper, gem and stage, every
  item kind, the heroes wearing every older relic, and every icon. The M6 scaffold drafts (the 14 stand-in relics,
  `rotting`, `hexed`, the four new lock icons and bog amber) are hashed apart: they are mine to redraw.
- New looks come only through new recipe styles and params, new builders and new listings, as in M3-M5.

## What I made
- **Relics** (`src/art/recipes.js`, `src/art/item-looks.js`): the fourteen Gloomfen relics drawn for real, no stand-in
  left, each through a new recipe style or param (so no older item changes): amulet `coin` (the Unfair Toll: a clipped
  coin with Hodge's profile) and `deep` (the Deep-Pearl), ring `holed` (the Hag-Stone, an eye in its hole), shield
  `wicker` (the Willow-Ward), focus `lamplighter` (the Lamplighter's Lantern), helm `diving` (the Salvager's Helm) and
  hood `veil` (the Mourning Veil, a face behind the lace), staff `cantor` (the Cantor's Staff), dagger `tooth` with
  guard `scale` and pommel `hook` (the Gar's Tooth), gauntlet `link`/`chainCuff` (the Barge-Chain Gauntlets), spear
  `barbs`/`line`/`crow` (Corvus's Harpoon), robe `shawl` (the Hexbane Shawl), boots `splay`/`lacing` (the
  Bogstriders), bow `fronds`/`tears` (the Weeping Bow). New materials in `M6_MAT` (copper, bog iron, deepglow,
  mire-light, willow wood/leaf/bark, lace, bog cotton, reed, hag/fen/old skin, leech, gar scale, moth wing, leviathan,
  barnacle, blackwater, weed, fen mud, sodden). Sockets for each new style.
- **Fen weapons** (recipes.js, for the foes only): mace styles `ladle` (the hags' pot ladle), `cane` (Hodge's
  walking stick with lead in the knob), `hook` (a crane-hook on a short chain), `grapnel`; spear params `hook` (a
  boat-hook) and `sickle` (a reed-hook).
- **Foes** (`src/art/foes.js`), every art key of spec §3.2, each looked at in every pose and gear tier:
  - beasts: `mire-leech`, `marsh-light`, `lamp-moth`, `blackwater-gar` and `old-jaws` (the Gar's Tooth is one of his
    front teeth, drawn from the relic without its hilt), `willow-wight` and `grandfather-willow` (the Weeping Bow
    tangled in his fronds), `drowned`, `bell-ringer`, `drowned-choir`, `drowned-cantor` (the Cantor's Staff in hand);
  - humanoids on the rig with gear tiers 0-3: `bog-hag` (hooked nose, pot on the boil, ladle), `mother-grue` (holds
    the Hag-Stone out to look at you through it), `hodge` (an unpleasant old man: bald, a white fringe, a nose like a
    turnip, the cane, the lantern held up, the toll-book at his belt, the clipped coin on his chest; **at 0 HP he sits
    down on his stool with the lantern on his knee** instead of falling), `salvage-master` (the Salvager's Helm drawn
    over his head from its recipe, a crane-hook), `bargemaster` (the Barge-Chain Gauntlets, a boat-hook, a length of
    chain over his shoulder), `reedcutter` (straw hat, reed-hook, a bundle of reeds), `salvage-diver` (goggles, wet
    line, grapnel), `bargehand` (punt-pole, a coil of rope);
  - the Champions, 96x96, three phases, each piece drawn from its relic's recipe and gone when snapped off:
    `lantern-mother` (the Lamplighter's Lantern held up, the Mourning Veil over her head; her lamp-pole; Lamplight /
    the Children's Road: the lantern held out low and lamps lit along the drowned path / Lights Out: the lamps gone to
    smoke, hers burning white) and `blackwater-leviathan` (Corvus's harpoon in its side, the Deep-Pearl in its brow,
    the iron collar with Harrow's broken ring on the lock, the great chain; the Wake / the Deep: more coils, the chain
    taut to its post / Blackwater: the pearl burning green, the water up), with a `dive` pose and `dive: true`.
  - `renderFoe` takes `wears` (a relic id or a list) for humanoids: a piece worn besides the one held (Tamsin's
    Bogstriders on Rotbridge), flagged as a relic, a glint on it, cached apart.
- **Backdrops** (`src/art/scenes.js`): the twelve (murkway, willowmurk, rotbridge, bogmire, lanternfen, mothers-hollow,
  long-boardwalk, misthollow, drowned-belfry, blackwater-reach, tidal-flats, causeway), the dark listings
  `mothers-hollow:dark` (the Mother's lamps stay lit) and `drowned-belfry:dark` (the Sleeper's light under the floor
  stays), a drifting **mist layer** for listings with `mist: true` (lanternfen, misthollow; still when reduced), and
  new ambient fx `midge`, `wisp`, `moth`, `bubble`, `spray`.
- **Icons** (`src/art/icons.js`): Rotting (a heart going over to the rot, dripping) and Hexed (a hex-star in a violet
  ring round an eye), apart from Poisoned; the locks `bog`, `fog`, `witch-ward` redrawn (`blackwater` kept); Bog Amber
  as a honey drop with a sprouting seed.
- **Test** `test/art-gloomfen.test.mjs` (8 tests): the Champions' pieces in every phase and pose and the dive; the
  relic-bearers carry their relics until taken; Hodge sits; the humanoids' four gear tiers and Tamsin's `wears`; the
  fourteen relics drawn and distinct; the twelve backdrops painted, the dark ones dark with their lights kept, the
  mist drifting; the status icons apart; and the **M5 art pinned** (52 hashes of every M5 foe, backdrop, relic and
  relic-dressed hero, taken before any M6 change).
- **Gallery** (`tools/gallery-foes.js`): `--only=gloom` or any `gloom-*` section (lineup, humanoids, named, beasts,
  bearers, mother, leviathan, tamsin, scenes, relics, icons, perf, check). The render check: 1156 renders, 0 failures
  (frames stay inside their canvases).

## Needs from others
1. **P7 (`src/ui/battle/sprites.js` `foeLook`)**: Tamsin holds her lent starter, so `u.wears` never reaches the art
   today and the Bogstriders do not show on Rotbridge. After the held-piece branch, add
   `if (u.wears && RELIC_ART[u.wears] && o.relic !== u.wears) o.wears = u.wears;` and put `o.wears || ''` into
   `lookKey`. (`renderFoe` already takes `wears` and caches it apart.)
2. **P7 (battle)**: while the Leviathan is `burrowed`, draw it with `renderFoe('blackwater-leviathan', { pose: 'dive',
   phase, t })` (`FOE_ART['blackwater-leviathan'].dive === true`): a fluke going under, a whirlpool, the chain running
   into it, the pearl's light under the water, and no glints.
3. **P7**: nothing to do for the foggy backdrops: `renderBackdrop` draws the mist itself (listing `mist: true`).
4. **P4**: every art key is drawn; the holders carry the data's relics (old-jaws gar-tooth, grandfather-willow
   weeping-bow, drowned-cantor cantors-staff, mother-grue hag-stone, hodge unfair-toll, salvage-master salvagers-helm,
   bargemaster barge-gauntlets) and the Champions' pieces are the data's `relics`.
5. **P5**: the eight Gloomfen humanoids are `kind: 'humanoid'`, so `foeLooks()` gives their walker looks (their pots,
   Grue's stone, Hodge's lantern and stool and the diving helm are battle-only extras); the fen beasts and the drowned
   are `beast`s, drawn on the map from your own sprites.
6. **Lead**: the private build warns the game is 2576 KB (the 2.5 MB warning line; it fails at 3.2 MB). My art is
   about 190 KB of source (foes ~106 KB, scenes ~47 KB, recipes ~37 KB).

## Where I am
- Done. `npm test` 501/501, lint clean; my private hash check of every M2-M5 render: 0 changes outside the M6 scaffold
  drafts (its "icons status/aspect/dice/misc" bundle holds rotting and hexed; with the old drafts put back it hashes
  as the baseline). Private build `scratchpad/m6-builds/p6/aethermoor.html`; the dev battle harness shows the Lantern
  Mother, the Leviathan, Hodge, Mother Grue, the Cantor and the Salvage-Master in their fights at 1280 and 360 wide,
  no page errors (only the Google Fonts request, blocked in this sandbox).
