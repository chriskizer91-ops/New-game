# Aethermoor: Hearth & Heirloom · Art layer

Everything visual is pixel art drawn by code in `src/art/`: no image files. The look comes from the
approved Loot Forge prototype (`prototypes/item-card.html`): vector shapes are rasterised into lit,
palette-quantised pixels with a selective dark outline, rim light and emissive glows. This file is the
public API for the UI, the style rules, and how to extend the set.

Import from `src/art/index.js` (or the individual modules). Anything that returns `ImageData` needs a
browser. Pure data (`RARITY_LOOK`, `itemArt`, `FOE_ART` ...) also works in node.

## Drawing sprites in the UI

All sprites are returned as `ImageData` at 1 logical pixel per pixel. Put each one on a small offscreen
canvas and `drawImage` it at an **integer** scale with `imageSmoothingEnabled = false` (and CSS
`image-rendering: pixelated`). Never scale by fractions. Sprites and backdrops share one pixel grid, so
draw them at the same scale.

Every sprite carries `img.anchors` (canvas px): `foot` (ground contact, use it to place the sprite on the
floor), `head`, `center` (damage numbers), and when present `handL`, `handR`, `weaponTip`, `weaponMid`,
`weaponGrip` (slash trails), `orb` (cast glow), `mouth`, `relic` / `relics` (the glinting relic),
`amulet`.

Facing: **heroes face left** (they stand on the right of the field), **foes face right**. Pass
`flip: true` to mirror either; the light stays top-left because the geometry is mirrored, not the image.

Animation: pass `t` in seconds from a running clock. Renders are cached per pose frame, so a 12 fps loop
only pays for the compose (see timings below). Call `prewarmHero` / `prewarmFoe` at battle start so the
first hit or cast never hitches. `reduced: true` (prefers-reduced-motion) freezes flicker, glints and
particles. `tint: [r, g, b, a]` mixes a colour over the sprite (hit flash: `[255,255,255,.8]`).

## Heroes · `hero-looks.js`

```js
renderHero(heroKey, gear, { pose = 'idle', t = 0, flip, aspect, custom, reduced, tint }) -> ImageData 64x64
heroBust(heroKey, gear, { size = 24, custom }) -> ImageData (head and shoulders, transparent)
heroAnchors(heroKey, gear, opts) -> anchors      prewarmHero(heroKey, gear, opts)
HERO_KEYS = ['warden', 'pip', 'bryn', 'alondra']      HERO_POSES      HERO_SIZE = { w: 64, h: 64, foot: [32, 56] }
HERO_ART[key] = { name, aspect, H (identity layers), starter (art per slot), presets? }
WARDEN_PRESETS = { skin[], hairMat[], hair[], beard[], eye[] }   // for the Hearthwarden creator
```

- `gear` is `{ weapon, offhand, head, body, hands, feet, amulet, ring }`; each value may be an
  `ItemInstance`, a relic id string, an art object `{ r, p }`, or `null`. Pass `undefined` for the
  starter kit. Equipped items are drawn from the same item art as their cards: the weapon is the
  actual recipe in the hand, armour/helm/boots/gloves take the item's materials, trims, gems and
  glowing runes, the amulet hangs on the chest and a ring shows as a gem pixel on the hand.
- `pose`: `idle` (2-frame breath via `t`, blinks), `attack` (`t` in 0..1: wind-up before 0.4, strike
  after; per weapon class: swing, spear thrust, bow draw with nocked arrow, staff bolt), `cast` (hands
  raised, aspect orb in the free hand), `hurt` (knocked back, eyes squeezed), `ko` (fallen on the back,
  weapon dropped in front), `guard` (off-hand raised). An extra `kneel` pose exists in `posePreset`.
- `aspect` picks the cast glow; default is the weapon's aspect, else the hero's (`warden` ember, `pip`
  and `bryn` verdant, `alondra` radiant).
- `custom` (Hearthwarden): `{ skin, hairMat, hair, beard, eye }` using `WARDEN_PRESETS` values.
- The figure is about 30x46 px inside the 64x64 frame; the margin is reach for swings and raised
  weapons.

## Foes · `foes.js`

```js
renderFoe(key, { tier, gearTier = 0, relic, relicHeld = true, phase = 1, pose = 'idle', t = 0, broken = [], flip, reduced, tint }) -> ImageData
foeAnchors(key, opts) -> anchors      prewarmFoe(key, opts)      relicSlot(relicId) -> slot      tierNum(tier) -> 0..3
FOE_ART[key] = { name, kind: 'humanoid'|'beast', w, h, foot, defaultTier, relic?, relics?, phases? }
FOE_KEYS      FOE_POSES = ['idle', 'attack', 'hurt', 'ko']
```

| key | size | foot | notes |
|---|---|---|---|
| `cutpurse` | 64x64 | 32,56 | humanoid; rags and rusty knife → leather, iron knife → studs, tempered knife → black hood, runed glowing knife, mail |
| `bandit` | 64x64 | 32,56 | humanoid; leather cap + rags + rusty sword → leather + buckler → iron kettle helm + mail + tempered knife → runed full helm (blue glowing runes and eye slit) + runed sword. `tier: 'veteran'` adds a painted Thornhollow shield and a green cloak |
| `tallyman` | 64x64 | 32,56 | humanoid; grey hooded coat, shadowed face with glinting eyes, ledger on a chain, coins; iron mask at gearTier 2, bone mask and violet-green blight trims at 3. An amulet relic (`wardens-seal`) hangs on its belt; a weapon relic (`tallyknife`) goes in its hand |
| `briarling` | 48x48 | 24,45 | walking bramble knot |
| `thornhound` | 64x48 | 30,45 | wolf with a bramble-thorn spine |
| `rotstag` | 64x64 | 30,62 | white stag rotting from the hooves up; `rotwood-circlet` threaded on its antler |
| `oldsnag` | 64x64 | 30,61 | huge old boar; `thornsplitter` bitten into its hump |
| `briarmaw` | 96x96 | 46,93 | Champion; `thornwreath` crown and `briarfang` sabre fang, 3 phases |

- **gearTier 0..3** is the Waking re-gear and must read at a glance. Humanoids swap visible gear
  (silhouette and colour change each step, tier 3 glows). Beasts grow more and bigger thorns, then rot
  (buds, red eyes at 2, black thorns and blight glow at 3; the stag's rot climbs higher).
- **Relics**: `relic` (defaults to `FOE_ART[key].relic`, set only for the unique bearers `rotstag`, `oldsnag`, `briarmaw`; pass `relic: null` to draw them bare) is drawn through `RELIC_ART`, the same recipe as
  its card, and glints every 2.4 s with a shine sweep. Weapons go in the hand, wearables replace that
  slot (e.g. `bandit` + `thornwatch-hood`), the Tallyman hangs an amulet on its belt. `relicHeld: false`
  removes it (a disarmed weapon leaves the hand empty; a worn piece falls back to the tier gear; Snag
  keeps a wound, the stag a torn vine). For Briarmaw use `broken: ['thornwreath', 'briarfang']`
  (stubs and a snapped stump remain); `relicHeld: false` there means both are gone.
- **Briarmaw phases**: 1 bark and bramble, amber eyes; 2 red eyes, blight veins, black sap and drool,
  bigger thorns; 3 rot-black with glowing blight cracks, violet-tipped thorns, hunched lower.
- `tier` accepts `'rabble'|'veteran'|'relic-bearer'|'champion'` or 0..3 (only humanoids change with it).

## Items · `item-looks.js` and `recipes.js`

```js
itemArt(itemOrRelicIdOrArt) -> { r, p, kind?, rarity?, aspect?, relic?, fx? }   // deterministic recipe params
itemPortrait(item, { size = 64, t = 0, rarity, reduced, hue, develop, silhouette }) -> ImageData (card portrait)
itemIcon(item, { size = 16 }) -> ImageData (bag icon, no halos)
cardCorner(rarity) -> ImageData 16x16 (top-left rarity frame ornament; mirror it for the other corners)
renderItem({ r, p }, size) -> raster (low level; compose() it yourself)
RELIC_ART[relicId]   RELIC_IDS   ITEM_KINDS   RARITY_ORDER   RARITY_LOOK[rarity]   ASPECTS   ASPECT_LOOK[aspect]
lookFor(slot, art) / gearLooks(gear) -> hero layer looks (renderHero calls these for you)
```

- `itemArt` resolves named relics first (`item.base`, `item.relic` or `item.id` in `RELIC_ART`), else
  builds params from `{ kind, rarity, aspect, seed }` with the seeded RNG (`core/rng.js`), memoised.
  `item.base` (ids from `data/items.js`) nudges the look: greatsword longer, maul bigger, heater and
  tower shields, rondel disc guard, brigandine studs, ironshod greaves and so on. Rarer tiers get
  richer metals (iron → steel → silver → gold; regalia verdigris bronze; primal silver), gems, trims,
  and glowing rune channels in the aspect's glow material.
- `itemPortrait` is the prototype card treatment: rarity background (rays from heirloom up, white
  flame for primal), drop shadow, rim light, aura from runed up, a periodic shine sweep, flicker, a glint
  on the business end, and aspect motes for relics and runed+ items. `develop` 0..1 paints only that
  fraction of the item (the Storied identify ritual); the rest is `silhouette`. Size 96 matches the
  brief's card portrait.
- `RARITY_LOOK[r]`: `{ tier, name, color (css, same as data/rarity.js), ramp[5] (beam/sparks, dark →
  light), bg[4] (portrait background), rim, aura, frame (MAT for card corners), gem (MAT for the corner
  gem), beam (reveal beam width px), rays, flame? }`.
- `ASPECT_LOOK[a]`: `{ glow (emissive MAT), gem (MAT), cloth (MAT), color (css, same as
  data/aspects.js), light (css), mote ('rise'|'fall'|'spark'|'dust'|'spore'|'bubble'|'sparkle') }`.
  Glow materials: ember `ember`, frost `frost`, storm `storm`, stone `amber`, verdant `verdant`, tide
  `water` (alias `MAT.tide`), radiant `radiant`, blight `blight`; plus `arcane` (storied runes with no
  aspect), `primal` (white flame) and `eyeRed`.

Item kinds with recipes: weapons `sword dagger axe hammer mace spear bow staff`, off-hand `shield focus`,
head `hood coif kettle helm circlet crown`, body `robe leather mail plate`, `gloves gauntlets boots amulet
ring` (plus the prototype's `beads` and `chest`). Weapon `RECIPE` entries carry `grip` (where the hand
holds it), `hold: { k, axis }` (scale and angle in a hero's hand) and `cls` (animation class).

## Backdrops · `scenes.js`

```js
renderBackdrop(key, { w = 160, h = 96, t = 0, reduced }) -> ImageData (composited, with animated lights and particles)
backdropLayers(key, { w, h, margin = 0 }) -> { layers: [{ id: 'sky'|'far'|'mid'|'ground', img, parallax }], horizon, floor: [top, bottom] }
ambient(key, t, { w, h, count }) -> [{ x, y, c: [r,g,b], a }]      // particles only, e.g. to draw over sprites
BACKDROPS[key] = { name, horizon, floor, fx }      BACKDROP_KEYS
```

Keys: `hearth-road` (dusk road, the Keep on its hill with a flickering hearth window, embers),
`verdant-wood` (Eldergrove trunks with a carved home, torches at midday, glowing fungi along the
winding path, spores and fireflies), `thornhollow` (the woven thorn wall, gate lantern, bounty board,
watch platform, drifting leaves), `briarmaw-den` (thorn canopy and arches, rot-black sap pools, pulsing
blight cracks, dripping sap, violet and green motes). Stand sprites with their `foot` inside the `floor`
band. The painters scale with `w`/`h`; for 4 heroes and 3 foes at 1:1 something like 240x144 fits.
Layers other than `sky` are transparent where empty; `margin` renders them wider for parallax pans.

## Icons · `icons.js`

```js
diceIcon(sides, { value, size = 20, mat = 'bone', ink, spin = 0, state }) -> ImageData   // sides 4 6 8 10 12 20
INTENT_DIE = { rabble: { sides: 6, mat: 'iron' }, veteran: d8 bronze, 'relic-bearer': d12 gold, champion: d20 amethyst }
statusIcon(key, { size = 12 }) -> ImageData   STATUS_KEYS
aspectIcon(aspect, { size = 12 }) -> ImageData   // coloured token with the aspect's sigil
gripIcon({ size = 12, broken }) -> ImageData     // chain link for grip meters
drawDigits(img, text, x, y, color, font = '3x5'|'4x6')   digitsImage(text, { color, font, outline })   textWidth(text, font)
```

- Dice are shaded polyhedra (the numbered face is lit, side facets darker). `state`: `'crit'` (gold with a
  dithered glow), `'fumble'` (red), `'dim'` (the discarded die of an advantage roll). `spin` 0..3 shifts
  facet shading for tumble frames while the UI shakes/rotates the die.
- Status keys match `data/statuses.js`: `burning chilled frozen poisoned bleeding staggered frightened
  rooted marked exposed provoked warded hasted regenerating guarding`.

## Style rules

- **Palette**: every material in `MAT` is a 6-step ramp, dark → light (`forge.js`). Shading picks a ramp
  index from the lit normal, so colour stays in-palette. Metals get a specular spike and a highlight on
  their top-left edges; gems refract; emissive materials ignore light and get a 1-2 px halo outside the
  silhouette; `dither` materials add ordered 4x4 Bayer noise.
- **Light** comes from the top-left (`L3 = [-1, -1.15, 1.45]`). Parts in front cast a 1 px shadow down-right
  onto parts behind (different `grp`). Mirrored renders keep this light.
- **Outline**: a selective dark outline (`#0b0910` mixed with the neighbour's darkest ramp colour), and a
  cooler rim light on the shadow side for portraits. Parts with `noOutline` (strings, drips) skip it.
- **Scale**: sprites are authored at game scale (heroes 64x64 frame, rabble 48-64, relic-bearers 64,
  champion 96) and must only be shown at integer multiples. Items are authored in a 64-unit space and
  render cleanly at 16 (bag), 64 (card) and 96. `detail` parts drop out below 0.6 scale so 16 px icons
  stay readable.
- **Readability rules we hold to**: silhouettes first (a foe's gear tier should read from its outline
  and one accent colour), one glowing accent per sprite at low tiers, glow only for runed/relic/aspect
  things, dark backdrops with low-contrast detail so sprites pop.
- **Determinism**: renderers never call `Math.random` or `Date`. Procedural variety comes from the
  item seed (`core/rng.js`) and `hash()`/`vnoise()`; animation comes only from `t`.

## Performance (Chromium on the build machine; phones are roughly 3-5x slower)

| sprite | cold (first raster of a pose) | warm (per frame) |
|---|---|---|
| hero 64x64 | 9-18 ms | 0.4-0.8 ms |
| humanoid foe 64x64 | 11 ms | 0.4 ms |
| briarling 48x48 / thornhound 64x48 | 6 / 6 ms | 0.3-0.4 ms |
| rotstag / oldsnag 64x64 | 23 / 15 ms | 0.3-0.7 ms |
| briarmaw 96x96 | 27 ms | 1.3 ms |
| backdrop 160x96 | 12 ms | 0.3 ms |
| item portrait 64 | 7 ms | 2.1 ms |
| dice icon 20 | 1-3 ms | cached |

Rasters are cached per (key, options, pose frame) in small LRU caches (`cache.js`); composes are cheap.
Re-run `node tools/gallery.mjs --only=perf` for current numbers (also written to
`tools/shots/timings.json`).

## Review gallery

```
cd game
node tools/gallery.mjs                          # builds tools/shots/gallery.html + screenshots (wide, phone, one per section)
node tools/gallery.mjs --only=foes-boss,icons   # just some sections; --zoom=2 for bigger pixels
node tools/gallery.mjs --only=focus --fk=briarmaw,rotstag --ph=3   # 4x close-ups of foes
```

Sections: `relics`, `kinds-weapons`, `kinds-head`, `kinds-body`, `loot`, `bases`, `heroes`, `heroes-gear`,
`foes-humanoid`, `foes-relic`, `foes-beasts`, `foes-bearers`, `foes-boss`, `scenes`, `icons`, `perf`.
Playwright is loaded from the global npm root and the preinstalled Chromium is used when present.

## Adding a foe

1. **Humanoid**: add an entry to `FOE_ART` in `foes.js` with `kind: 'humanoid'`, `w: 64, h: 64,
   foot: [32, 56]`, identity layers `H` (build `human|youth|brute|dwarf`, skin, hair, `scarf`, `mask`,
   `shade` + `shadeEyes`, `cloak`, `tunic`, `ledger`, `coins` ...) and `gear[0..3]`: one gear kit per
   gearTier, each slot an art object `{ r, p }` (reuse recipes; any `H` overrides go in `gear[n].H`).
   Optional `veteran: { gear, gear3, H }`, `relic`, `beltRelic`.
2. **Beast**: write `build(F, st)` next to the others. Work in canvas pixels with the helpers
   (`ell`, `cap`, `circ`, `poly`, `chainC`, `spikesC`, `spineThorns`, `legOf`, `eyeOf`, and `frame(x, y,
   angle)` for a rotated head). `st` is `{ pose, f (breath frame), gT, tier, phase, relic, held, broken,
   anchors }`. Draw far limbs first with `farTex` (one shade darker), then body, near limbs, head. Set
   `st.anchors.head/mouth/center` and `relic`. Put a relic in with `drawItem(F, RELIC_ART[id], at,
   angle, k, { center, cut, drop })` so it is the same art as the card (it returns a card-space → canvas
   mapper for anchors). Register it in `FOE_ART` with `kind: 'beast', w, h, foot, build`.
3. Add it to a gallery section and look at it at 2x and 4x before calling it done.

## Adding an item kind

1. Write a recipe `fooR(F, X, P)` in `recipes.js` in the 64-unit card space (`X.poly/cap/circ/ell`;
   profiles `round|bevel|ridge|flat`; `tex` for patterns; `detail: true` for bits that vanish at 16 px).
2. Register it in `RECIPE` with its origin `o` and axis `a` (weapons lie on the diagonal `[1, -1]`) and,
   for weapons, `grip`, `hold: { k, axis }` and `cls` (`blade|blunt|spear|bow|staff`), then teach
   `weaponTip()` in `heroes.js` where its business end is.
3. Add a generator to `GEN` in `item-looks.js` (use `ctxFor` helpers: `fit()`, `blade()`, `grip()`,
   `cloth()`, `gem()`, `glow`, `surf()` so rarity and aspect escalate the same way as everything else),
   and optional `BASE_HINT` entries for data base ids.
4. If it is worn, map it in `lookFor()` and draw its layer in `heroes.js` (`helmParts`, `offhandParts`,
   the body/boots/gloves code).
