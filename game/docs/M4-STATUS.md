# M4 status: The Sunscorch Wastes

M4 opens the second region, finishes the Codex as a binder with page rewards, and gives Hilda her full
forge. The contract is `docs/M4-SPEC.md`; Part A overrides Part B. This page records what shipped, the
gate results with their numbers, the known issues, and the commands that reproduce every number.

- **Delivered as:** `dist/aethermoor-m4.html`, one self-contained file (download), alongside the frozen
  `dist/aethermoor-m3.html` and `dist/aethermoor-m2.html`. M4 writes only its own save
  (`aethermoor.save.m4`); it reads the M3 and M2 saves and offers them as carry-overs, newest first.
- **Branch:** `claude/cool-ptolemy-uc93gg`.

## 1. What shipped, against Part B §1

**In scope: all shipped.**

| Item | Shipped |
|---|---|
| 10 Sunscorch maps + the Sunscorch Gallery | The Sunward Road, Sandspire, the Dust Trail, Dusthaven, the Deep Shaft (two levels, the Glass Heart below), the Glass Flats, Miragewell, Scorchgate and its Vaults; the Gallery holds Codex Page II's 14 pedestals. Reachability- and walk-tested on their real tiles. |
| The way in | The Keep's south-east gate opens once Act I is done (both Verdant Brands), and only then. |
| 7 Hearthfires (3 cold) | Yes; 17 in all. |
| 4 new lock types, new keys for 4 M3 locks | Dune-glass, mirage, quicksand and the vault seal, each with a relic key and a Domain key. |
| 9 foe families, 2 Champions, 19 encounters | Yes, with every holder and Tallyman variant. Kharzul and the Ashen Warden each have three phases and two breakable pieces whose loss shuts their moves down. |
| The second Tamsin duel | Yes (losing is a yield). |
| 14 relics (Codex Nos. 25-38) | Yes, each with card art, a Legend Surge and a map power. Cinderfang is item No. 031. |
| 5 quests, 4 bounties, 8 Ladder posters, 2 letters, 2 shops | Yes; Idris sells gems. |
| The second council | Yes: Qasim takes Sandspire's chair, and it ends on the end-of-Act-II card. |
| The Codex binder | Pages I-IV (III and IV sealed), progress, rewards (+5% max HP; +1 hit and 10% ember resist), the Awakened stamp, the Chronicle on each card's back. |
| Hilda's full forge | Temper to +10 (silver from +4, embers from +7), Reroll, Salvage, Gems in sockets, Awakening (three deeds, then the rite; the Hand or the Heart by the bearer's path). |
| Grudges, fully | Grudge packs hunt you (farther sight, never flee, no leash); settling one stamps its loot; a Journal tab lists them. |
| Save v3 | `aethermoor.save.m4` (+ `.bak`), `AETH3.` codes; `AETH1.` and `AETH2.` codes and the M2 and M3 local saves carry over. |

**Out of scope, as planned:** Ironspire and Gloomfen (sealed), companions (Luma hints she will travel
with you one day), the Signature Masterpiece, Table Mode, card PNG export, the Hearthteller.

**Stretch, not done:** the Miragewell night variant, the Glass Flats sandstorm, and Hilda's lines naming
the gem you set.

## 2. Gates

| Gate | Result |
|---|---|
| Units | **276/276** node tests pass (`npm test`), lint clean. |
| e2e-world | **241** checks, 0 failed, 0 blocked, at 360×740 and 1280×800: scenarios 1-19, including the south-east gate, Sandspire, dune-glass and the mirage, Kharzul's pre-fight card, the Deep Shaft's dark, the Glass Flats performance, the Codex binder, Grudges and the second council. |
| e2e-flow | Passes at both sizes (**240** checks): the M3 flow plus the forge (temper to +4 with silver, a reroll, salvage, a gem, an awakening), Idris's shop, the card's Chronicle side, a finished page's banner and the Party screen's page bonus; the M2 and M3 carry-over profiles. |
| e2e-battle | **18/18** scenarios, including Kharzul through three phases with Cinderfang and the Carapace pried loose, and the Ashen Warden with the Aegis and the Crown snapped off. |
| e2e-codes | **42/42**: every real M2 code and three M3 (`AETH2.`) codes, at both sizes. |
| Balance | All targets met; see §2.1. |
| Performance | p95 frame JS 1.6-2.1 ms at 4× CPU throttle (target ≤ 16 ms), 10-17 `drawImage` per frame (≤ 40), the Glass Flats included. |
| Size | **1773 KB** (warns above 1.8 MB, fails above 2.2 MB). |

### 2.1 Balance (`node tools/sim.mjs --seeds 200`, starters rotated)

| Target | Reached |
|---|---|
| Kharzul first-try wipe 30-40% | 36% (party level 14.5) |
| The Ashen Warden first-try wipe 30-40% | 35% (party level 19.5) |
| Tamsin at Scorchgate, party win 55-70% | 65% (the rest are yields) |
| Forged party (weapons +4, a gem each): each Champion ≤ 20% | Kharzul 18%, the Warden 13% |
| Each lead's lair taken first, 15-25% | the caravan 20%, the Sand Wyrm 19%, Gnash 16%, the Wisp-Queen 18%, the Aqueduct 19% |
| Stuck runs | 0 in all nine modes |
| Every M3 mode on its M3 target | yes (table in `docs/RULES.md`) |

Decisions behind the numbers: Sunscorch veterans and up climb 4 levels a Waking (not 6); the deeds of
relics Nos. 1-12 are late ones, so the early relics do not Kindle in their first fight and change M3's
curve; glass scorpions wear no armour type. Details in `notes/P4-foes.md` and `docs/RULES.md`.

### 2.2 Saves

- M4 writes only `aethermoor.save.m4`, its `.bak` and `aethermoor.m4.started`; it never writes the M2
  (`v1`) or M3 (`v2`) keys. `test/frozen.test.mjs` pins the bytes of `dist/aethermoor-m2.html` and
  `dist/aethermoor-m3.html`.
- `rules/migrate.js`: `toV2` (M3's exact step), then `toV3`, which adds the forge purse, the gem pouch,
  finished pages and settled Grudges, and fills only what is missing. Every M2 fixture migrates, and an
  M3 save and the M2 save it came from give the same game.
- Pasted codes are scrubbed and checked (`saveProblems`), now including the purse, the pouch, the pages,
  the settled Grudges and each item's sockets.

### 2.3 Review

An independent review read the whole M4 source diff (about 11k lines) with proof scripts: every M2
fixture as `AETH1`, `AETH2` and `AETH3`; a 20,000-operation forge fuzz (no duplicated or lost gems or
materials, nothing salvaged that should not be, no change on a refusal); the Chronicle and deeds through
`resolveBattle`; every new `innerHTML` sink; the new screens at 360 and 320 px with touch. It found:

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Blocker | A relic reforged from shattered was never Claimed, so its Codex page could never finish (and its holder carried only Echoes). Likely in M4: a Champion's pieces shatter when it dies first. | `reforge` Claims the relic and records a page it finishes; the rite Claims; `toV3` Claims a whole relic in the bag that M2 or M3 left unclaimed. |
| 2 | Should-fix | Ten awakening branches (Hearthbrand's Keepflame, Cinderfang's Glassline among them) were closed to every party: only heroes who cannot carry those relics walk those paths, and the forge sent the player to them. | A branch that no hero able to carry the relic walks opens for its bearer; the advice names only heroes who can carry it. `canUse` moves to a leaf module, `rules/gear.js`. |
| 3 | Minor | Malformed M4 item fields in a pasted code (temper, rerolls, the Chronicle) passed the check, then threw or corrupted the save. | `saveProblems` checks them; the forge and the Chronicle guard their reads. |
| 4 | Minor | The world HUD ignored the pages' bonus ("105 of 100 HP"). | `heroStats` in `ui/world/hud.js`. |
| 5 | Minor | Two Grudges settled in one fight were reported and stamped under the last name only. | Both are recorded; each foe's own drops carry its own name. |
| 6 | Minor | A Twinned foe's twin paid forge spoils. | Foes that drop nothing pay nothing. |

Earlier integration fixes: the pre-fight card names a Champion's Brand; a Champion's armour reads "Worn
by"; hero sprites show forged gear (the hero art's cache ignored temper, gems and stage); foes carry an
uncapped look tier (Tamsin's kindled kit, beasts re-gearing with the Waking); a Grudge never Twins a
named holder. Each fix has a test that fails without it; the suite is **276/276**.

## 3. Known issues, most important first

1. **Approximated moves.** No status exists yet for burrowing, being swallowed or charmed, or "+4 Guard
   until the next phase", so Kharzul's burrow, the Wyrm's swallow, the wisps' charm and the Carapace
   Brace use the nearest statuses (a charging strike, Staggered + Rooted, Rooted, Guarding + Warded).
2. **Tamsin's Scorchgate kit** reuses her M3 per-starter moves (only her level, gear and look are new),
   because `$rival` resolves only to a starter id.
3. **The autoplay policy** never swaps weapons for a matchup, so some sim seeds fight a stone or ember
   Champion at half damage; they make up most of the Sunscorch's retry losses. It only affects Auto.
4. **Named holders can still be Twinned by the Waking** (as in M3; a Grudge no longer does it). The twin
   carries no relic and drops nothing.
5. **Relics Nos. 1-12 wake late.** Their deeds are Act II ones (Untouched, Fifty Felled, Grudge Settled,
   Rout) so they do not Kindle in their first fight and change M3's curve; Hearthbrand's are Untouched,
   Grudge Settled and Fifty Felled.
6. **One unreproduced e2e failure.** The e2e-flow check "after a reload the title continues this
   milestone's save" (laptop, Milestone 3 profile) failed once in four laptop runs and never at phone
   size; it did not reproduce. The check now prints what the title showed and which saves were present.
7. The stretch items above.

## 4. Reproduce

```bash
cd game
npm test && npm run lint && npm run build
export NODE_PATH=$(npm root -g)
node tools/e2e-world.mjs          # 19 scenarios, both sizes (~25 min)
node tools/e2e-flow.mjs           # the shell, the forge, the Codex, carry-overs (~15 min)
node tools/e2e-battle.mjs         # 18 scenarios (~5 min)
node tools/e2e-codes.mjs          # 18 M2 + 3 M3 codes, both sizes (~10 min)
node tools/sim.mjs --seeds 200    # balance, all nine modes (~7 min)
```
