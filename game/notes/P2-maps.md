# P2 maps (M4): the Sunscorch Wastes and the Sunscorch Gallery

Package P2 of `docs/M4-SPEC.md` (§2). I replaced the scaffold's stub maps with real layouts. No git
was run. I edited only P2 files:
- `src/data/maps/{sun-road,sandspire,dust-trail,dusthaven,deep-shaft-1,deep-shaft-2,glass-flats,miragewell,scorchgate,scorchgate-vaults,keep-gallery}.js`
- `src/data/world.js`: the HEARTHS stands and comments.
- `test/maps.test.mjs`, `test/walk.test.mjs`, `tools/map-draft.mjs`.

I did not change these files:
- `keep.js`: the scaffold's `keep-se` exit and its `from-sun-road` anchor already match spec §2.4.
- `locks.js`: already matches §2.7.
- `tiles.js`: no new tile character was needed.
- `index.js`: already registers every map.

Each map's header comment describes its layout and says which tile character means what in its biome.

## The maps

| Map | What is there |
|---|---|
| `sun-road` 26×64 | A causeway crosses the Keep's lake to a signpost ("Sandspire, three days by caravan."). The caravan road runs through green scrub and cacti. The Waystone Fire (16,20) sits in a ring of old paving by a standing stone. A hollow in an outcrop is sealed by a dune-glass wall (7,30) with `sr-glass-cache` inside. At the rocky neck, Rasa's chain crosses the road (12-14,41) and her two-tile toll block stands beside it (15-16,41). Past the neck are dunes, the skinks' ground and a picked-over wreck with a chest, then two milestones up to Sandspire. |
| `sandspire` 30×26 | A mesa city with a north ramp and west and east gates. Zara stands in her caravanserai with the crate cradle (plus a `crate-cradle-full` sign after `crate-returned`). Qasim stands at his palace door. The cistern is the barred gate `ss-cistern` (19,7) with a chest inside. In the market square are the Spire Hearth (15,12), `ss-board`, stalls, palms, the fountain and the Water-Seller. The Spire Guard stands at the gate. South are Idris under his awning, the red Spire, and `ss-lookout` on the mesa edge (15,23). |
| `dust-trail` 46×24 | A red canyon with the trail and a single mine-cart rail beside it. Sandspire's aqueduct runs along the north wall, choked at `dt-aqueduct` (29,4) and dry from there to the city. The cold Dust Cairn stands on a paved rise (22,8). The skinks nest in the rail cutting and the glass scorpions roam mid-canyon. The Sand Wyrm (33,18) lies in a sinkhole whose only way in is quicksand (32-33,13-14). A boulder (5,16) seals a ledge with a chest. |
| `dusthaven` 24×22 | A mining camp in a canyon bowl. The shaft head is a timber frame over the stair down (5-6,2), with rails running out of it along the main street. The Pithead Fire (9,5) sits in its yard. Luma stands at her assay shed, Ode at the Pithead store, and two miners (`miner-1`, `miner-2`) nearby. |
| `deep-shaft-1` 24×24 | The map is dark, and light entities keep the upper half lit. From the stair a lit landing opens, with Brask's crew and a lantern light (until beaten) in the east dig gallery (19,9). A dune-glass seam (4,7) seals a pocket with a chest. Rails run down the main shaft to the cold Shaft Lamp (8,11); kindling it lights the chamber. The dark lower half has the scorpions' cave, a plank bridge over a chasm, and rails to the stair down (18-19,23). |
| `deep-shaft-2` 18×18 | An oval glass cavern with glass columns, glowing shards and a pool. Four `glass-spire` props (P5's "pedestal of living glass") stand round the floor. Kharzul's champion lair is on a dais at the far end: at (8,13), footprint 3×2 (7-9,12-13), with 8 clear rows in front. A hidden cache (1 embers) sits behind the dais. |
| `glass-flats` 52×30 | A dune sea. The track runs from Sandspire to a junction, then on east to Miragewell. The south road bends round the Glass Mesa, and the `gf-mirage` strip (25-26,17-24) is the short cut straight through it, with `gf-mirage-cache` in a niche off it. The Tallyman caravan is circled in a hollow (25,5); Gnash sits on a glassed throne in a ring of crests (42,4). Two dune-glass hollows (5,8) and (45,11) each hold a chest; the quicksand hollow (38-40,20-24) has a chest behind it. There is no Hearthfire. |
| `miragewell` 22×20 | A palm oasis. The well-court has the well (8-9,9-10) with the Wisp-Queen over its north rim, the Well Fire (10,12) and Sabah. The pool has reeds and a pilgrim. A palm grove's only gap is the mirage (17,17), with the grove's chest behind it. |
| `scorchgate` 32×32 | A burned fortress. Past the broken north gate is the lower town, where the ash-wights roam. Brother Cinder keeps the shrine; the burned armory is choked by rubble (a boulder lock) with an Ash Garnet chest behind it. The last wall has its gate fallen, and the cold Last Watchfire stands against it (20,14; stand (20,13) facing south). On the parade ground Tamsin (16,23) appears once the Ash-Captain is beaten. The captain (15,29) bars one leaf of the Vault door `sg-vault-door` (15-16,30), and the stair down lies beyond it. |
| `scorchgate-vaults` 24×24 | The map is dark. Light falls down the stair into the antechamber. The pillared Hall of the Watch has a gallery each side; the reliquary alcove chest (2,2) has `lock: 'darkness'`. The three-wight guard stands beside the inner door (11-12,11), which opens for good once beaten. The Vault of Ash is deep: the Warden is at (11,21), footprint (10-12,20-21), with 9 rows in front, and the Crown's glow lights it while armed. |
| `keep-gallery` 18×8 | A torch-lit gallery with a runner from the Hall door to a plaque. The 14 pedestals are unchanged: rows 2 and 5, in codex order. |

### Design rules I followed
- **Re-armed fights never trap the player.** Each Sunscorch Brand re-arms every non-`once` encounter of the region, and the Deep Shaft and the Vaults are underground (no travel), so no re-armable block may close a way on or out.
  - Rasa's toll and the Vaults' inner door use M3's Bramble Toll pattern: a gate with `guard` and `open: { beaten }`. Walking into the gate calls out the guard; once beaten, the gate stays open, and the Echo stands beside it.
  - Brask's crew stands off the main shaft. The Ash-Captain stands before one door leaf only.
  - A test checks all of this from each Brand's lair.
- **No hard lock stands on SUN_PATH except the Vault door** (spec §2.2), and the path's own Scorchgate Key opens it.
  - Knowledge 7 also opens it: at the worst-case L8, Bryn has Knowledge 8.
  - The Deep Shaft's darkness is only soft.
  - The roads east and south on the Glass Flats are open.
- **Tamsin** has `if: { beaten: 'sg-captain' }`, so she comes after the captain, as SUN_PATH orders. A yield leaves her standing on the open parade ground, where she blocks nothing (P3's note is covered).
- **Chests** use the lead's M4 loot keys:
  - 13 Sunscorch chests; 12 of them hold 1-2 silver.
  - Embers are in only two well-hidden chests: the Glass Heart's hidden cache and the Vaults' darkness-locked reliquary.
  - Ash Garnets are only in Scorchgate and the Vaults.
- **Tile characters follow P5's desert art**, checked with `--art`:
  - `,` is sand ripples (`m` paints cracked earth, so I use it only for the dry aqueduct bed and ash drifts).
  - `r` is a one-tile mine-cart rail with curves.
  - Signs use P5's looks: `monolith` (the standing stone), `spire`, `cradle`, `cradle-full`.
- **World data.** HEARTHS stands match the maps. Every map's `lore` line passes the Atlas projection test; Glass Flats is a T, ordered W, junction, S, junction, E. The spec's lore points are kept.

## Tests (mine)
**`test/maps.test.mjs`** went from 21 to 28 tests. I extended two helpers:
- `beat()` now re-arms the region of the Brand being won, as `gauntlet.earnBrand` does. For M3 Brands this is identical to before.
- `flood()` can start anywhere.

The new tests:
- The Keep's `keep-se` gate opens the Sunscorch once Act I is done, and not before, even with every key. It is the only way in.
- SUN_PATH reachability, for each starter. The party has finished Act I (the M3 path beaten, both Verdant Brands), is at level 8, and holds only its starter relic.
- No hard lock stands on SUN_PATH except the Vault door. The Scorchgate Key alone opens it, and the Ash-Captain holds it.
- After each Sunscorch Brand, every Sunscorch Hearthfire and the Keep are still reachable from the Brand's lair.
- SUN_PATH and SUN_LEADS equal spec §2.2. Every Sunscorch encounter sits on a Sunscorch map, and every lead is reachable.
- Spec §2.3 per map: biome, Hearthfires with their cold flags, fights and their modes, lock counts by type, NPCs, and the named ids. The stair down lies behind the Vault door. Kharzul's footprint is 3×2. The dark maps are right.
- Sunscorch chest loot: real gem and material ids, embers well hidden, Ash Garnets only in Scorchgate.

**`test/walk.test.mjs`** went from 3 to 6 tests. For each starter, the bot starts from an Act-I-complete save in the Keep courtyard. It walks SUN_PATH through `keep-se` with forced wins and earns both Brands. Then it walks home through the underground Vaults to the Great Hall, where `council-2` plays (`council-2-done`); this takes 726 steps. Bot fixes:
- `nextExit` treats a gated exit as open once its gate holds, as `move()` does.
- `settled()` reads the duel's own `yields` flag.
- A Champion counts as settled once its Brand is held, so the bot no longer rematches it.

**Mutation checks.** I made each change temporarily, ran the tests, and restored the file byte for byte:

| Mutation | Tests failing |
|---|---|
| Toll across the road | 6 |
| Gate open before Act I | 6 |
| Dune-glass on the Flats' south exit | 6 |
| Mirage on the shaft bridge | 1 (the no-hard-lock test only) |
| Brask's crew on the bridge | 1 (the way-home test only) |
| Vault guard in the inner door | 1 (the way-home test only) |
| Bridge made a chasm | the walk test (all 3 starters) |

## Results (exact, at the end)
- `node --test test/maps.test.mjs`: **28/28 pass**.
- `node --test test/walk.test.mjs`: **6/6 pass** (about 1 s).
- `npm test`: **262/265 pass**. The 3 failures are all in `test/art-keys.test.mjs` (P6, being written now): "brask still draws a stand-in", "no backdrop sun-road" and the champion pieces. Earlier in my session, P4's `battle.test.mjs` also failed mid-edit (a Kharzul phases test).
- `npm run lint`: **clean**, exit 0.
- `node tools/map-draft.mjs --lint`: no unreachable tiles except three decorative doors, as in M3: the palace door (24,6), and Luma's and Ode's doors in Dusthaven. The 1-wide corridors it lists are harmless.
- Private build `/tmp/aeth-p2/aethermoor.html` (1691 KB):
  - I loaded all 11 maps in the real game at 360 px (Act-I party, teleported). There were no console errors, and I checked the screenshots.
  - `e2e-world --scenario=12..17` "passed", but ran nothing: the tool lists those scenarios, and its code stops at 11.
- Drafts are in `/tmp/aeth-p2-draft/*.png` (plain with `--reach=all`, and `*-art.png`).

## Needs (from others; I did not touch their files)
- **Lead (`src/ui/world/view.js`, which no package owns):** `LOCK_KIND` has no entries for `dune-glass`, `mirage`, `quicksand` and `vault-seal`, so in game they draw as signposts; I saw four signs on the Wyrm's quicksand. P5 drew sprites under those same names, so each entry is `'x': 'x'`.
  - Also add `GATE_KIND['vault-door'] = 'vault-door'`. The Vaults' inner door uses `look: 'vault-door'` (P5's sprite) and draws as a plain gate until then.
- **Lead:** `keep.js`'s header comment still calls the south-east postern sealed. I own only its exit and anchor.
- **P7 (e2e-world 12-17)**, using `standBy(map, id)`:
  - Glass Flats: `gf-mirage` (from the north) and `gf-glass-wall-nw` / `gf-glass-wall-e`.
  - Sun road: `sr-glass-wall` and the `sr-wreck` chest.
  - Sandspire: `spire-hearth`, `idris`, `ss-board`.
  - Kharzul: `kharzul-heart` on `deep-shaft-2`.
  - The Deep Shaft: `dark: true` with light entities.
  - Performance: `glass-flats` (52×30, roam max 4, plus two packs).
- **P3:** Tamsin now appears only after the Ash-Captain, so her intro may assume he has fallen. `ss-lookout` has your LOOKOUTS entry.
- **P4:**
  - If the Scorchgate Key is not pried loose it drops shattered. The Vault seal still opens with Knowledge 7, or once Hilda reforges the Key.
  - Rasa's block is 2 tiles wide, per the spec.
  - Big lair sprites rise about 5 tiles above their foot. The maps leave room (8 or more rows in front of Kharzul and the Warden), so keep the Champions' map sprites roughly that tall.
- **P5:** nothing blocking. Your sprites fit the maps as they are. Two options:
  - A crystal or ash look for plain `o` rubble in the Vaults.
  - A distinct quicksand ground under the lock.

## Left undone
- The spec's stretch items: the Miragewell night variant (lanterns), and the sandstorm on the Glass Flats.
- The Sunscorch e2e scenarios themselves (P7's).
