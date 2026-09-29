# P6: battle and item art (M5, the Ironspire Peaks)

Status: **done** (all M5 battle and item art drawn, tested and in the galleries). This file is kept current.

Files (P6 owns): `src/art/foes.js`, `src/art/scenes.js`, `src/art/recipes.js`, `src/art/item-looks.js`,
`src/art/item-art.js`, `src/art/icons.js`, `src/art/index.js`, `tools/gallery-foes.js`, `tools/gallery-items.js`,
`test/art-keys.test.mjs`.

## Done so far

- **Materials** (`recipes.js`, `M5_MAT`, registered once, never over an existing name): `ice`, `snow`, `slate`,
  `lichen`, `rimeFur`, `trollHide`, `slag`, `rocFeather`, `clothSlate`, `hushweave`, `drowned`, `mist`, `scree`,
  `drownedSkin`, `rocLeg`, `temperBlue`, and the emissive `hush` (Hush's glow under the ice).
- **Relics 39-52** (`RELIC_ART`, no stand-ins left): each its own look, with new recipe styles reached only through new
  params, so every older item renders as before: Windstep Boots (boots `wings`, `swirl`), the Veilbell (amulet
  `bell`), Ironwall (shield `door`), the Drowned Censer (focus `censer`), Ironvein Bracers (gloves `veins`), the
  Roc-Feather Cloak (leather `feathers`), the Thane's Rune-Key (ring `key`), the Trollhide Mantle (leather `mantle`),
  Harrow's Runestaff (staff `rune`), the Anvil Heart (amulet `ribs`), the Worldforge Hammer (hammer `peen`, `seam`,
  `mark`), the Cutter's Pick (axe `pick`, `tally`), the Rime Crozier (staff `crozier`), the Hushweave Cowl (hood
  `weave`, `spiral`). Sockets placed for the new styles. The censer and the feather cloak follow a rotated frame, so a
  foe can swing or snag them. The Frost Opal has its own gem ramp (`gem.frost-opal`) and icon (a milky cabochon
  with fire in it).
- **Every M5 foe key is drawn** (gear tiers 0-3 are the Waking; attack frames kept inside the canvas):
  - humanoids on the rig: `brigand`, `rhune` (the Windstep Boots), `cutter-chief` (the Cutter's Pick), `sawyer`;
  - beasts: `rime-wolf`, `rockling`, `forge-spark`, `iron-sentinel`, `forgeborn`, `bellows`, `peak-troll`,
    `rime-wraith`, `choir-wraith` (mouth open in its note, a hymnal frozen to its hands);
  - relic-bearers, each carrying the relic drawn from its own recipe (flagged relic parts that glint and go when it
    is taken): `sentinel-captain` (Ironwall on his arm), `journeyman` (Harrow's Runestaff), `old-horn` (the
    Trollhide Mantle as a stitched patchwork of hides), `drowned-abbess` (80x80; wimple and frozen veil, swinging
    the Drowned Censer, wet smoke), `thunder-roc` (96x96; wings up, lightning on the pinions, the Roc-Feather Cloak
    snagged under its talons);
  - Champions, 96x96, three phases, each piece drawn from its relic's recipe and gone when snapped off:
    `mother-anvil` (the Worldforge Hammer in her arm; the Anvil Heart burning in the cage at her waist; Quench:
    steam and blue temper; the Last Strike: the Heart white, her cracks alight) and `rime-abbot` (facing you: the
    Hushweave Cowl over his face, the Rime Crozier frozen to his hand, a beard of icicles; Compline: he sings;
    Hush: violet light up through the ice, in his eyes and cracks; his bare tonsured head once the Cowl is taken, a
    jag of ice in his fist once the Crozier is).
- **Backdrops** (`scenes.js`), all eleven in `BACKDROPS`, with new ambient fx `snow`, `sparks` and `rime`:
  `rockslide-pass`, `peaks-veil`, `highfold` (the eyrie), `iron-stair`, `ironhold`, `ironhold-deeps`,
  `harrows-forge`, `stormwatch`, `frost-road`, `frostmere`, `frostmere-below`. Dark listings:
  `ironhold-deeps:dark` (the lamps go out; the slag and the embers stay lit) and `frostmere-below:dark` (the ice's own
  light goes out; Hush's violet light under the floor stays).
- **Icons**: the Frost Opal redrawn, the rune-seal's rune lit amber (the other Ironspire locks keep the scaffold's
  drafts, which read well); `statusIcon` for P7's three new statuses: `burrowed` (a mound and its hole, the way
  down), `swallowed` (a toothed maw) and `charmed` (a pink heart in a swirl). Every status in `data/statuses.js` now
  has its own icon.
- **Tests** (`test/art-keys.test.mjs`): the Ironspire Champions' pieces in every phase and pose, the relic-bearers'
  relics until taken, the eleven backdrops (dark treatments darker, the two dark listings under 40 mean, every dark
  Ironspire encounter dark, Hush lit under the ice in the dark), every status's own icon, and the M4 art pinned pixel
  for pixel (hashes taken before any M5 change; M2/M3 pins untouched).
- **Galleries** (`tools/gallery-foes.js`, on demand): `--only=iron` or any of `iron-lineup`, `iron-humanoids`,
  `iron-named`, `iron-beasts`, `iron-bearers`, `iron-anvil`, `iron-abbot`, `iron-scenes` (each backdrop at two times,
  dark, a mock-up with a foe and the party, phone and wide frames, the parallax layers), `iron-relics` (cards, icons,
  heroes wearing them, the forge's looks), `iron-icons`, `iron-perf`, `iron-check` (1106 renders, 0 failures: every
  pose, gear tier, phase and piece, glints on the canvas, beasts inside their canvas). The rime wolf moved to a 72x48
  canvas (the builder drawn through `shifted()`), so its tail and lunge are no longer cut.

## Results

- `npm run lint`: clean. `node --test test/art-keys.test.mjs`: 14/14.
- `npm test`: 380/382. The two failures are in `test/maps.test.mjs` ("every ENCOUNTERS fight and Hearthfire is
  placed exactly once": `er-wolves placed once`; and the IRON_PATH/IRON_LEADS world-tables test): P4's new
  `er-wolves` encounter (Drystone Lea) is not on any map yet. Not art; P2/P4 to settle.
- The build runs into `scratchpad/m5-p6` (`node tools/build.mjs --out ...`): the game 2148 KB, the paintings
  1023 KB. In the battle harness (built to the scratch folder) Mother Anvil, the Rime-Abbot, the Thunder-Roc, the
  Choir, the Bellows and Rhune's toll all read at 1280 and at phone width, grip meters and the ribbon's crops
  included.

## Needs from others

- **P4 (`data/encounters.js`)**: every Ironspire backdrop is painted and listed, so `IRON_BD` can become the identity
  map (each place's own backdrop). The Deeps and Beneath Frostmere fights with `dark: true` get
  `ironhold-deeps:dark` and `frostmere-below:dark` (both read dark; the art test checks every dark Ironspire
  encounter).
