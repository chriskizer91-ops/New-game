# M6 P6: battle and item art (the Gloomfen Marsh)

Package P6 of `docs/M6-SPEC.md` §6.2. All procedural pixel art in code, in the M3-M5 battle style. No git is run.
Files I edit: `src/art/foes.js`, `src/art/scenes.js`, `src/art/recipes.js`, `src/art/item-looks.js`,
`src/art/item-art.js`, `src/art/icons.js`, `src/art/index.js`, `tools/gallery-foes.js` and `tools/gallery-items.js`
(the battle and item sections), and a new test of my own, `test/art-gloomfen.test.mjs`.
Private build folder: `scratchpad/m6-builds/p6`.

Status: **started.**

## Rules I hold to
- Add, don't change: every M2-M5 foe, backdrop, relic, item kind, icon and relic-dressed hero stays pixel-identical.
  A private script hashes 378 renders of them (`scratchpad/m6-builds/p6/hash-art.mjs`, baseline
  `baseline-m6-start.json`, taken before any edit): every foe in every pose, gear tier, phase and piece, every
  backdrop at three sizes with its dark pass, layers and ambient, every relic at every temper, gem and stage, every
  item kind, the heroes wearing every older relic, and every icon. The M6 scaffold drafts (the 14 stand-in relics,
  `rotting`, `hexed`, the four new lock icons and bog amber) are hashed apart: they are mine to redraw.
- New looks come only through new recipe styles and params, new builders and new listings, as in M3-M5.

## Needs from others
(none yet)

## Where I am
- Done so far (all looked at and refined): the 14 relics; the M6 materials; the fen weapons (mace styles `ladle`,
  `cane`, `hook`, `grapnel`; spear params `hook`, `sickle`); every M6 foe art key (the ten families, the variants,
  the humanoids with gear tiers 0-3, Hodge on his stool at 0 HP, `wears` for humanoids); the two Champions (3 phases,
  pieces from their recipes, the Leviathan's `dive` pose); the twelve backdrops, `mothers-hollow:dark`,
  `drowned-belfry:dark`, the mist layer (`mist: true`: lanternfen, misthollow) and the new ambient fx (midge, wisp,
  moth, bubble, spray). `npm test` 482/482, lint clean, hash check 0 unexpected changes.
- Next: the icons (rotting, hexed, bog amber, the new lock icons), my test, the gallery, a private build.
