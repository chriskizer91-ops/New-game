# P5 overworld art (M4): the Sunscorch on the map

Package P5 of `docs/M4-SPEC.md` (§6.1). All of it is procedural pixel art in code, in the M3 overworld
style (the same forge, ramps, outlines and light). No git was run. I edited only P5 files:
- `src/art/tiles.js`
- `src/art/walkers.js`
- `src/art/map-sprites.js`
- `tools/gallery-entry.js`, for the overworld sections only.

I did not touch `art/heroes.js` or `art/hero-looks.js`.

## What is drawn

### Tiles (`tiles.js`)
There are ten new biomes: `desert`, `desert-town`, `canyon`, `mine-camp`, `mine`, `crystal`, `dunes`, `oasis`, `ash` and `vault`. They use the same map characters as M3, redrawn for each place.

- **How they are built.**
  - `SUN_PAL` sets the roles and looks for each place.
  - `SUN_SPEC` holds the painters, and `specOf()` routes the Sunscorch biomes to them.
  - The M3 biomes still use `SPEC`/`PAL` unchanged.
  - The `w.*` materials (sand, dune, redrock, glass, mirage and the rest) are registered by `worldMats()`.
- **What each character draws.** P2's map header comments say what each character means on each map. In short:
  - `.` sand, dust, grit or ash ground.
  - `,` short wind ripples, or the place's scatter: blooms, gravel, cinders or glass grit.
  - `"` scrub or reeds.
  - `T` palms, cacti, dead trees, glass spires, charred trees, columns or pit props.
  - `t` barrel cactus, crates, carts, stumps or urns.
  - `o` layered rock, ore, glass, rubble or blocks.
  - `#` ashlar, rough, timber, burnt or vault walls.
  - `H` tile roofs with awnings, striped tents, thatch, burnt beams or slabs.
  - `^` faceted red rock. In the dunes it is a pale dune back with a shaded slip face on its south edge.
  - `m` cracked clay, wet mud, slurry or ash drifts.
  - `f` glass glints, sunstone veins, crystals, embers or wisps (two frames).
  - `r` mine-cart rails, with six pieces including curves.
  - `R` cave walls: rock, crystal or masonry.
  - `k` cave floor. It is one seamless field, so a whole cave floor never shows the tile grid.
  - `Y` sandstone pillars or glass blocks.
  - `:` pavers. `_` glazed tiles in the town and oasis, planks elsewhere.
  - `*` lanterns, lamps, braziers or crystal lamps.
  - `+` arched, adit or vault doors.
- **Speed.** A cold atlas bake takes 35 to 70 ms for each new biome (the budget is 150 ms).

### Locks and gate (`map-sprites.js`)
- `dune-glass`, 16×24: an amber glass wall with a crack, a shine and heat lines.
- `mirage`: a shimmer in two frames.
- `quicksand`: a periodic swirl in two frames.
- `vault-seal`, 16×24: a sigil ring in two frames.
- The `vault-door` gate. Each lock and the gate has an open state.
- The `glass-spire` prop.
- The sign looks `monolith`, `spire`, `cradle` and `cradle-full`.
- Hearth looks for all seven Sunscorch Hearthfires: sand ring, sun brazier, cairn, brazier, lamp and watchfire.

### Walkers (`walkers.js`, additive)
- Head looks: `wrap` (turbans and veils), `fez` and `cap`.
- Goggles, a `jar` offhand, a `pick`, and trinkets (key, ledger, gourd, pouch).
- `glintAt` relic glints, and glowing eyes for helms.

### NPCs
`NPC_LOOKS` has entries for zara, qasim, idris, spire-guard, water-seller, luma, ode, miner, sabah, pilgrim-mw and cinder. It also has one for `ashen-warden`, for P3's dialogue bust.

### Map foes
- **Roamers:** sand-skink, scavenger, dune-raider, glass-scorpion, mirage-wisp and ash-wight. The humanoids have four gear tiers.
- **Holders:** Rasa, Gnash, the Glass Matriarch, the Wisp-Queen, the Ash-Captain, Foreman Brask, the quartermaster and Vell Saltglass. They are resolved from `FOES` variants (`SUN_VARIANT`), and their relics glint.
- **Lair sheets:** the Sand Wyrm, Gnash, the Wisp-Queen, Kharzul (Cinderfang glints in his tail) and the Ashen Warden (with the Aegis and the Cinder Crown).

### Fixed after looking at every map (`map-draft --art`, the gallery and in-game shots)
- The dunes read as flat sand, so you could not see what was blocked. Now the dune backs are pale with rippled crests, and each has a dark slip face and foot.
- Wall-to-wall ripples looked like planks, as in the Sand Wyrm's basin. They are now short, staggered ripples.
- The cave floors showed a checker grid. The Vault's wall tops looked striped like shelves.

## Size and speed
- My three files, whitespace-minified, are 201.8 KB, against 123.4 KB at M3. That adds **78.4 KB**.
- The private bundle is 1,777,620 bytes (1736 KB), under the 2.2 MB limit.
- `e2e-world --scenario=11` passed:
  - Phone: p95 1.80 ms, with 17 drawImage calls a frame.
  - Laptop: p95 1.80 ms.
- I also walked six Sunscorch maps at 4× throttle on a laptop, using a private script. The p95 frame time was 1.6 to 2.2 ms, and the worst single frame was 24.6 ms (a chunk bake in Miragewell).
- **M3 is byte-identical:** 300 hashed looks (every M3 atlas, M3 map render, NPC, walker, map foe and object sheet) are unchanged. The only difference is `keep-gallery`, whose rows P2 edited; the keep atlas itself is unchanged.

## Tests
- `npm test`: 267 tests, **266 pass, 1 fails**. The failure is `test/art-keys.test.mjs` "no backdrop sun-road". Battle backdrops are painted in `src/art/scenes.js`, which is P6's in-progress file, not mine.
- `npm run lint`: clean.
- `e2e-world --scenario=11`: passed.

## Screenshots
All of these are private folders:
- Gallery sections: `/tmp/aeth-p5-gallery/sec-world-{tiles,npcs,foes,objects,perf}.png`.
- Map drafts: `/tmp/aeth-p5-draft/<map>-art.png`, one for each of the 10 Sunscorch maps.
- In-game shots: `/tmp/aeth-p5-ingame/laptop-01…31-*.png`.

## Left undone
- The stretch looks: the Miragewell lanterns at night, and a sandstorm overlay.
- The map lair sheets are not shown in game. `ui/world/actors.js` `lairFor` paints lairs with `renderFoe`, which is P6's battle art.

## Needs (from others; I did not touch their files)
- **Lead (`ui/world/view.js`):** done already. `LOCK_KIND` and `GATE_KIND` now map `dune-glass`, `mirage`, `quicksand`, `vault-seal` and `vault-door` to my sprites.
- **Lead (`ui/world/actors.js`, optional):** for map-style lairs, `mapFoeSheet('sand-wyrm' | 'gnash' | 'wisp-queen' | 'kharzul' | 'ashen-warden')` returns 32×32 sheets (Kharzul's is 48×32), each with its relic glint.
- **P4:** keep `FOES[id].art === id` for the six Sunscorch families. Keep the variant ids `rider`, `raider-king`, `matriarch`, `queen`, `captain`, `foreman`, `quartermaster` and `sharpshooter`, because `SUN_VARIANT` keys off them.
- **P2:** in Scorchgate, an `m` inside a `:` floor shows as a square of ash ground, which reads as a missing flagstone. If you do not want that, keep the drifts on `.`.
- **P6:** if you want matching colours, the `w.*` materials are available once `worldMats()` has run (`tiles.js`).
