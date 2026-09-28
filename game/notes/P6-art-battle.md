# P6: battle and item art (M4)

Files: `src/art/foes.js`, `src/art/scenes.js`, `src/art/recipes.js`, `src/art/item-looks.js`, `src/art/icons.js`,
`src/art/index.js`, `tools/gallery-foes.js` (the `sun-*` sections only), new `test/art-keys.test.mjs`.
`src/art/item-art.js` is unchanged. Nothing frozen was touched: `art/heroes.js`, `art/hero-looks.js`, the card reveal,
every M2 and M3 foe, backdrop and item render exactly as before (pinned hashes in `test/art-keys.test.mjs`).

## What was drawn

**Foes (spec §6.2).** Every family and variant art key in `data/foes.js` resolves in `FOE_ART` with its own art, no
stand-ins (17 keys):
- **Humanoids** on the M3 rig, each with four gear tiers: `scavenger` (hood, hook knife, salvage sack), `dune-raider`
  (indigo wraps and scimitars; a brass kettle hat at 2, steel and a storm heater at 3), `ash-wight` (ash-grey dead
  face, blackened mail, ember seams), and the named ones: `rasa` (Sandwalkers), `gnash` (brass crown, sandstone maul,
  Dunebreaker), `ash-captain` (plume, the Scorchgate Key), `brask` (Tallyman foreman, the Sunstone Lantern),
  `quartermaster` (tally crate on his back), `vell` (Saltglass).
- **Beasts**: `sand-skink` (48x32), `glass-scorpion` (64x48), `glass-matriarch` (moulting seam, shed plates),
  `mirage-wisp` (48x64, a shimmer with a mask), `wisp-queen` (64x80, glass crown, the Mirage Glass at her heart, a
  mirage double), `sand-wyrm` (96x64, ringed body rising from a sand mound, Wyrmscale grown into its shoulder, a raw
  patch once pried loose).
- **Kharzul** (96x96): a scorpion of living glass, Cinderfang lodged in its tail, the Glass Carapace as clear plates
  over its back. Each piece disappears when snapped off (`broken`), in every phase and pose (KO too): the tail ends in
  a molten socket, the back shows fire-veined glass. Phase 2 is crusted with sand, phase 3 is smoke glass with
  ember seams and a storm of glass needles; Cinderfang burns white along the edge.
- **The Ashen Warden** (96x96): charred plate with fire in the cracks (more each phase), the Ashen Aegis on its arm
  and the Cinder Crown on its brow, each breakable; the Crown burns white in phase 3; ash motes.
- **Tamsin, gear tier 4 (kindled)**: the M3 tier-3 kit, every piece at the Kindled stage (ember rim), an ember halo
  round her and ember motes. Tiers 0-3 are unchanged.

**Backdrops (spec §6.2)**, in the M3 layered style (sky, far, mid, ground for parallax, lights, ambient):
- `sun-road`: afternoon, the last scrub and cacti giving out to dunes, the Waystone's lit fire-bowl, Sandspire's mesa
  and Spire in the haze, the old road half buried. Ambient: blown sand.
- `sandspire`: sundown, the red Spire over domes and towers with lit windows, market stalls under striped awnings,
  palms, lantern string, the Spire Hearth in the paved square. Ambient: embers.
- `dust-trail`: a red canyon, Sandspire's aqueduct on arches broken in the middle, Dusthaven's headframe far down the
  canyon, the sand-choked Dust Cairn, mine rails. Ambient: blown sand.
- `deep-shaft`: a timbered gallery, sunstone veins glowing in the rock, the shaft running on into the dark, an ore
  cart, the miners' lamps and the Shaft Lamp. Ambient: warm dust.
- `glass-heart`: a cavern of faceted smoke glass round a burning crystal heart, glass columns rim-lit, hot cracks in a
  glossy floor, a still bright pool. Ambient: glints.
- `glass-flats`: noon, dunes, the Glass Mesa floating on its mirage, a floor of glassed sand cracked into plates with
  the sun's glare in it, a raider's banner. Ambient: glints.
- `miragewell`: night, stars and moon, palms, the well-court wall with corner torches, the Well of Mirages breathing a
  shimmer under its windlass, the pool holding the moon, the Well Fire. Ambient: rising mirage motes.
- `scorchgate`: a smoke-red sky over burned towers and the keep, the last wall broken, the Last Watchfire cold on its
  tripod, charred trees, the fallen gate leaf in the ash, embers in the cracks. Ambient: falling ash, a few embers.
- `scorchgate-vaults`: a pillared hall, the ash-black seal on the far door, shields, braziers, grey light down the
  stair, ash drifts, embers in the floor. Ambient: ash.
- Dark: `deep-shaft:dark` and `scorchgate-vaults:dark` are listed (like M3's); the lamps and braziers go out, the
  sunstone veins, the seal and the floor embers stay lit. Every Sunscorch `dark: true` encounter reads under 40 mean
  luminance (test).

**Items (spec §6.3).**
- `RELIC_ART` for all 14 Codex Page II relics (Nos. 25-38), each its own look: Sandwalkers, the Orrery of Hours,
  Wyrmscale, the Sunstone Lantern, the Glass Carapace, Dunebreaker, Cinderfang, the Mirage Glass, Qasim's Signet, the
  Sunstone Heart, the Scorchgate Key, the Ashen Aegis, the Cinder Crown, Saltglass. New recipe styles are opt-in
  parameters, so older items draw as before (scimitar, hook guard, strapped maul, scale and aegis shields, lantern
  with a stone, carapace, orrery, lens and heart amulets, signet, key ring, regal crown with embers, wrapped boots).
- **Temper to +10**: +1 to +3 exactly as M3; the metal brightens each step from +4, glows from +7 (an emissive rim on
  the card and in the hand), and wears a white flame at +10.
- **Gems in sockets**: set gems show in bezels on the card portrait and on the sprite (hilts, shields, crowns,
  amulets, rings, boots, body pieces).
- **Kindled**: a faint ember rim. **Awakened**: a repaint in the branch's palette (the Hand warm and ember, the Heart
  cool and radiant) and ember motes on the card; `awakenMotes()` gives the same motes for a sprite.
- Caches: `itemArt(item)` returns one art object per base, temper, gems, stage and branch (so every cache keyed on the
  art object stays fresh); `itemLookKey(item)` gives the same as a string for UI caches.
- **Icons**: lock icons `dune-glass`, `mirage`, `quicksand`, `vault-seal` (with dim versions) and their keys;
  `gemIcon(id, { size })` for the four gems and `materialIcon(id, { size })` for scrap, silver and embers, crisp at
  any size the UI asks for (checked at 12-28 px). All exported from `art/index.js`, with `GEM_MAT`, `BRANCH_LOOK`,
  `itemLookKey`, `artStage`, `stageMat`, `awakenMotes`.

## Bundle size

`node tools/build.mjs --out /tmp/aeth-p6`: `aethermoor.html` is **1,815,110 bytes** (1773 KB), under 2.2 MB; it was
1,583,661 bytes when P6 started (that growth includes every package). P6's share is **about 115 KB** of the
whitespace-minified bundle (raw source +164 KB: foes +64 KB, scenes +55 KB, recipes +24 KB, item-looks +15 KB,
icons +5 KB; each file's delta scaled by its own minify ratio). Palettes, rigs and helpers are shared: the humanoids
use the M3 rig and kits, the scorpion builder draws all three scorpions, the wisp builder both wisps, and the new
backdrops share one set of desert helpers (dunes, sand, rock, glass, palms, masonry, paving, fire-bowls, rails).

Render cost (gallery `sun-perf`, shared machine): foes 1.2-11.5 ms cold, 0.1-0.9 ms warm (the Rotwarden is 24.9 / 1.1);
backdrops 6.6-28 ms for the first paint of a size, 0.04-0.21 ms a frame after that (M3's hearth-road 19.7 / 0.12);
relic portraits 5-17 ms cold, 0.8-2.4 ms warm.

## Needs from others

- **Lead / P1 (`rules/foe.js`)**: `buildFoe` clamps a humanoid's `gearTier` to 3 and sets every beast's to 0, so
  (a) Tamsin's kindled look at Scorchgate (P4 set `gearTier: 4` on the `tamsin-scorchgate` spawn) never reaches the
  art, and (b) the beasts' gear-tier looks (thicker hides, glassed spines, ember seams at the last Waking) never show.
  Suggest a separate `artTier` on the combatant (`Math.min(4, spawn.gearTier || 0)` for humanoids, `Math.min(3, …)`
  for beasts), leaving the stat `gearTier` as it is, and `ui/battle/sprites.js` passing `gearTier: u.artTier ??
  u.gearTier` to `renderFoe`. The art clamps per foe (Tamsin to 4, others to 3), so a larger value is safe.
- **P7 (UI: `ui/lib/art.js` `gearOf`, `ui/battle/sprites.js`)**: pass `itemArt(item)` (exported from `art/index.js`)
  instead of the raw item in the gear given to `renderHero` and `heroBust`. The frozen `hero-looks.js` caches a worn
  look by base, kind, rarity, aspect and seed, so with raw items a tempered, socketed, Kindled or Awakened piece keeps
  its old look until the cache evicts it. `itemArt` returns one object per temper, gems, stage and branch, so the
  cache key changes when the item does. For UI caches keyed on items use `itemLookKey(item)`.
- **P7 (battle sprites)**: an Awakened relic's ember motes on the hero sprite are the UI's to draw (the frozen rig has
  no particles): `awakenMotes(t, { x, y, w, h }, { branch, n })` returns `[{ x, y, c, a }]` in sprite pixels, as
  `renderFoe` uses them for kindled Tamsin.
- **P5 (walkers, map sprites)**: gear looks (`gearLooks`/`lookFor`) now carry `stage`, `branch`, `gem`, `gems`,
  `glow7`, and `temper` up to 10; the walker rig can read them or ignore them. The Ash-Wight's `foeLooks` H now wears an ash-grey mask (was char).
- **Docs (lead)**: `docs/ART.md` could list the M4 additions above (the new exports, `darkBackdrop` keys, `awakenMotes`,
  `itemLookKey`, the `aura` hook on a `FOE_ART` def).
- **P7a**: no need for a separate temper flame icon from the art; the pixel flame in `lib/items.js` is fine.

## What's left

- The beast gear-tier looks and Tamsin's tier 4 wait on the `artTier` change above; the art is done.
- Hero-sprite motes for Awakened relics wait on the UI (above).
- Pre-existing, not P6's: the default `tools/gallery.mjs` phone full-page screenshot fails with "Unable to capture
  screenshot" on the tallest pages (the section screenshots are fine).

## Test results (final run)

- `npm test`: **267 tests, 267 pass, 0 fail** (includes `test/art-keys.test.mjs`).
- `test/art-keys.test.mjs`: **9 pass**: every foe family and variant key renders every pose at tiers 0 and 3 with
  finite anchors and no stand-in; the Champions draw each piece until snapped off in every phase; every encounter,
  map and patrol-zone backdrop and every listed id has a painter, each Sunscorch dark treatment is darker and every
  dark Sunscorch encounter reads dark; all 14 relics render with gems, temper +7 and +10, Kindled and both branches,
  and no two share a look; look keys and art objects change with temper, gems, stage and branch; every lock type,
  gem and material has an icon and the index exports them; and 91 pinned hashes of the M2/M3 art are unchanged
  (26 foes in every pose, tier, phase and piece; 11 backdrops at two sizes; 24 relics and 25 item kinds, temper +0 to
  +3, on the card and as bag icons; 5 hero kits).
- `npm run lint`: **clean** (no errors, no warnings).
- `AETH_HTML=/tmp/aeth-p6/aethermoor.html node tools/e2e-battle.mjs`: **18/18 scenarios pass** (includes the
  Kharzul and Ashen Warden phase-2 shots).
- Gallery `sun-check`: **986 renders, 0 failures** (every M4 key, pose, gear tier and phase, flipped, reduced and
  tinted, relic held, disarmed and absent; one glint per piece still held).

## Gallery

`NODE_PATH=$(npm root -g) node tools/gallery.mjs --entry=tools/gallery-foes.js --only=sun --out=/tmp/aeth-p6-gallery/m4`
(`--only=sun-<name>` for one section). PNGs in `/tmp/aeth-p6-gallery/m4/`:
`sec-sun-lineup.png`, `sec-sun-humanoids.png`, `sec-sun-named.png`, `sec-sun-tamsin.png`, `sec-sun-beasts.png`,
`sec-sun-bearers.png`, `sec-sun-kharzul.png`, `sec-sun-warden.png`, `sec-sun-scene-sun-road.png`,
`sec-sun-scene-sandspire.png`, `sec-sun-scene-dust-trail.png`, `sec-sun-scene-deep-shaft.png`,
`sec-sun-scene-glass-heart.png`, `sec-sun-scene-glass-flats.png`, `sec-sun-scene-miragewell.png`,
`sec-sun-scene-scorchgate.png`, `sec-sun-scene-scorchgate-vaults.png`, `sec-sun-relics.png`, `sec-sun-forge.png`,
`sec-sun-icons.png`, `sec-sun-perf.png`, `sec-sun-check.png`, and `gallery-wide-sun.png` (all sections).
