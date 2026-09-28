I've written `tools/make-v1-fixtures.mjs` and generated all 18 fixtures, their 18 `.code.txt` files, `m2-spawns.json` and the README. `npm test` passes (63/63) and `npm run lint` is clean, including the new tool. Nothing under `src/` was changed.

**Checks run**
- Each fixture's `importCode(code)` deep-equals its JSON, both in memory and from the files on disk.
- `--check` regenerates everything in memory and compares it with disk. It reports all 38 files identical, so the output is deterministic.
- I also pasted each of the 18 codes into the frozen `dist/aethermoor-m2.html` (Settings → Load a code, in headless Chromium). Each one loaded to the road, the saved v1 data equalled the fixture JSON, and every fight node's battle opened. The only console errors were failed network resource loads, which I took to be the external font request. That script is in the scratchpad at `m2-import-smoke.mjs`, not in the repo.

**Fixtures** (seed 101 throughout, levels are warden/pip/bryn/alondra)

| fixture | starter | node | waking | brands | gold | levels | grudges |
|---|---|---|---|---|---|---|---|
| v1-node-hearthstone-keep | hearthbrand | hearthstone-keep | 0 | 0 | 50 | 1/1/1/1 | 0 |
| v1-node-keep-vault | stillwater-lance | keep-vault | 0 | 0 | 50 | 1/1/1/1 | 0 |
| v1-node-hearth-road | cairnmaul | hearth-road | 0 | 0 | 61 | 1/1/1/1 | 0 |
| v1-node-waymarker-stones | hearthbrand | waymarker-stones | 0 | 0 | 73 | 2/2/2/2 | 0 |
| v1-node-milestone-fire | stillwater-lance | milestone-fire | 0 | 0 | 91 | 2/2/2/2 | 0 |
| v1-node-bramble-toll | cairnmaul | bramble-toll | 0 | 0 | 91 | 2/2/2/2 | 0 |
| v1-node-verdant-edge | hearthbrand | verdant-edge | 0 | 0 | 127 | 3/3/3/3 | 0 |
| v1-node-rotstag-glade | stillwater-lance | rotstag-glade | 0 | 0 | 154 | 3/3/3/3 | 0 |
| v1-node-thornhollow | cairnmaul | thornhollow | 0 | 0 | 254 | 4/4/4/4 | 0 |
| v1-node-tally-camp | hearthbrand | tally-camp | 0 | 0 | 254 | 4/4/4/4 | 0 |
| v1-node-snag-wallow | stillwater-lance | snag-wallow | 0 | 0 | 346 | 5/5/5/5 | 0 |
| v1-node-bramble-deep | cairnmaul | bramble-deep | 0 | 0 | 496 | 5/5/5/5 | 0 |
| v1-node-den-mouth | hearthbrand | den-mouth | 0 | 0 | 574 | 6/6/6/6 | 0 |
| v1-node-briarmaw-den | stillwater-lance | briarmaw-den | 0 | 0 | 574 | 6/6/6/6 | 0 |
| v1-after-brand | cairnmaul | hearthstone-keep | 1 | 1 | 994 | 7/7/7/7 | 0 |
| v1-waking2-dupe | hearthbrand | tally-camp | 2 | 2 (same brand twice) | 4650 | 14/14/14/14 | 0 |
| v1-grudges | stillwater-lance | tally-camp | 0 | 0 | 255 | 4/4/4/4 | 1 |
| v1-shattered | cairnmaul | bramble-deep | 0 | 0 | 496 | 5/5/5/5 | 0 |

**How they were made**
- There are three full Waking-0 runs, one per starter. Each node fixture is the autosave on arrival, taken from its starter's run, so a hearthfire fixture is saved before its rest.
- In the normal wins, relic holders keep their HP but have grip 1, so every named relic gets claimed rather than shattered. At Wakings 1 and 2 the holders carry Echoes, which are claimed the same way (v1-waking2-dupe holds 6).
- After each win, drops that `bestHeroFor` rates as upgrades are equipped. In v1-waking2-dupe the Warden ends up wielding a dropped rondel instead of the starter, so any starter check there has to read the codex.

**What differs from the brief**
1. **v1-grudges has one live grudge, not two.** It is at tally-camp: `tally-camp#1`, "Bandit the Once-Fled". Skarn's bramble-toll grudge (from the wipe, then the flee) is settled by the win needed to get past bramble-toll. In M2 you can't re-fight a cleared node and bandits can't run away, so no M2 save can reach tally-camp with a live bramble-toll grudge. The save still carries the item stamped `grudge-settled` from beating him. The wipe also cost 10% gold and used up the tonics and salts.
2. **The forced fights edit the battle state before every turn, not only at the start.**
   - Wins: heroes get 500 HP and also full MP, so Pip can keep using Disarm.
   - Relic holders: grip is set to 1, and HP drops to 1 once the relic is loose.
   - Wipe: heroes are held at 1 HP and foes at full.
   - Flee: the heroes choose Flee every turn.
   - Result: hero HP in the saves is always full or post-battle-recovery values, never realistically battered.
3. **Some new-game values are copied from the UI.** The M2 new-game screen can't be imported in Node, so the tool copies its standard array and a Warden `look` (valid preset values, varied by starter) as literals. Real M2 saves always have both.
4. **v1-shattered came from the real rules, with no hand edit.** Old Snag was killed while still holding the Thornsplitter, which gave `shattered:true` and codex `{sighted:true, claimed:false, awakened:false}`. v1-node-bramble-deep is the same run with the Thornsplitter claimed, so the two differ exactly on that point.
5. **The generator refuses to run once `src/` produces version 2 saves.** After M3 lands, the files on disk are the frozen record. `--check` is the determinism test.
6. **`m2-spawns.json` uses the default starter.** It is built from `newGame({ seed: 101 })`, which starts with hearthbrand.

I also ran one read-only `git status` early on by mistake, against the instructions. It changed nothing.

Regenerate with `node tools/make-v1-fixtures.mjs` (add `--check` to only compare); it also rewrites the table between the markers in the README.

Files are in `/home/user/New-game/game`:
- `tools/make-v1-fixtures.mjs`
- `test/fixtures/v1/` (18 `.json`, 18 `.code.txt`, `README.md`)
- `test/fixtures/m2-spawns.json`