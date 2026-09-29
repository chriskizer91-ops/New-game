# Aethermoor: Hearth & Heirloom — Architecture

The game is a browser JRPG built from ES modules in `game/src/` into one self-contained
HTML file. Design intent lives in `docs/DESIGN-BRIEF.md`; this file is the technical contract.

## Build and run

```
cd game
npm install          # esbuild only
npm run build        # -> dist/aethermoor.html (full document, open directly on a laptop)
                     # -> dist/aethermoor.artifact.html (fragment for publishing as a claude.ai page)
npm test             # node --test test/*.test.mjs (rules and data only; no DOM)
npm run lint         # eslint (no-undef is an error)
```

`tools/build.mjs` bundles `src/main.js` with esbuild (IIFE, whitespace-minified; identifiers kept), collects CSS imported
from JS, and inlines both into `src/index.html`. No other runtime dependencies, no network
requests except Google Fonts. Everything (art, music, data) is generated or embedded.

## Layers (dependency direction: ui -> art/rules -> data/core)

| Folder | What lives there | May import | Runs in node? |
|---|---|---|---|
| `src/core/` | seeded RNG, dice, save/load, input, audio, tiny event emitter | nothing game-specific | rng, dice: yes |
| `src/data/` | pure data tables: heroes, foes, items, affixes, rarity, aspects, skills, statuses, encounters | core | yes |
| `src/rules/` | pure deterministic game logic: stats, battle engine, AI, loot, progression, party/equip | core, data | yes |
| `src/art/` | pixel renderer (`forge.js`), item recipes, hero/foe sprites, backdrops, icons | core, data (art keys only) | no (ImageData) |
| `src/ui/` | screens, DOM, canvas drawing, animation of battle events | everything | no |
| `src/main.js` | boot and screen router | everything | no |

Rules must never touch the DOM, `Math.random`, or `Date`. All randomness goes through a seeded
RNG passed in, so any battle can be replayed and tested.

## Core APIs

```js
// core/rng.js
createRng(seed:number|string) -> { next():float[0,1), int(lo,hi), pick(arr), chance(p), fork(label), getState(), setState(s) }

// core/dice.js
rollDice(rng, n, sides) -> { sides, rolls:number[], total }
rollD20(rng, { adv=false, dis=false }) -> { rolls:number[], kept:number, nat:number }
parseDice('2d8+6') -> { terms:[{n,sides}], flat }
```

## Game state (plain JSON, saved as-is)

Version 5 (M6; version 2 was M3's, 3 M4's and Milestone 4.5's, 4 M5's). Any earlier save is migrated on load by
`rules/migrate.js` (see Saves).

```js
{
  version: 5, migratedFrom?: 1,
  seed, rngState,
  party: { active: ['warden','pip','bryn','alondra'], roster: { [heroId]: HeroState } },
  inventory: [ItemInstance], bag: { [consumableId]: count }, gold,
  materials: { scrap, silver, embers }, gems: { [gemId]: count },   // M4: the forge's purse and the gem pouch
  codex: { [relicId]: { sighted, claimed, awakened } },
  progress: {
    waking: 0, brands: [],            // brands only ever grows; count them with new Set(brands).size
    lastHearthfire: hearthfireId,     // where a wipe wakes you
    pos: { map, x, y, face },         // where the party stands (tiles)
    act: 1,
    node?: nodeId,                    // M2 saves only: kept verbatim, never read
    flags: {
      cleared, done, grudges, day, runs,               // as in M2
      story: { [flag]: true | day },                   // story.starter, intro-done, bell-rung, act1-complete, letter:<brand>...
      unlocked: { [entityId]: true },                  // opened locks, the Bramble Toll chain, the kicked-down rope
      opened: { [chestId]: true }, kindled: { [hearthfireId]: true }, visits: { [mapId]: n },
      quests: { [questId | 'bounty:<id>']: 'claimed' }, scouted: { [encId]: true },
      seen: { [triggerId | 'arrive:<map>']: true }, worn: { [heroId]: gearSignature }, beaten: { [encId]: n },
      pages: { [regionId]: day }, settled: { [grudgeKey]: { day, name } },   // M4: finished Codex pages, settled Grudges
    },
  },
  settings: { sound, battleSpeed, reducedMotion, touchControls, alwaysRun, mapZoom }
}

HeroState = { id, name, level, xp, hp, mp, surge, hpRolls:[number], base:{STR,DEX,CON,INT,WIS,CHA},
              gear:{ weapon, offhand, head, body, hands, feet, amulet, ring }, // ItemInstance ids or null
              skills:[skillId], domains:{ [domainId]: { level, path, opt7, opt13 } } }

ItemInstance = { uid, base:itemBaseId | relicId, kind, slot, rarity, ilvl, name, aspect|null,
                 affixes:[{id, value}], gems:[], temper:0, seed,          // seed drives procedural art
                 provenance:{ from, where, day }, chronicle:{ kills:0 },
                 // optional: shattered, unidentified, lore, power (storied), stamp:'grudge-settled'
               }
// Rules never store recipe params. src/art derives the look: RELIC_ART[relicId] for named relics,
// otherwise itemArt(item) builds params from kind + rarity + aspect + seed (deterministic).
```

## Rarity tiers (from the brief)

`worn` (grey) · `wrought` (white) · `tempered` (green) · `runed` (blue) · `storied` (violet) ·
`heirloom` (gold) · `regalia` (teal, set pieces) · `primal` (white flame). Colors and card frame
materials live in `data/rarity.js` and are shared by art and ui.

## The battle engine contract (`rules/battle.js`)

```js
createBattle({ heroes:[HeroState...], foes:[FoeSpawn...], seed, waking, ctx }) -> BattleState
timeline(state, n=8) -> [combatantId...]          // the Initiative Ribbon: next n turns
current(state) -> combatantId                      // whose turn it is
commands(state, heroId) -> [Command...]            // attack, skills, items, defend, surge, flee
targets(state, command) -> [combatantId...]
act(state, command) -> { state, events:[Event...] }          // resolves a hero command
foeTurn(state) -> { state, events:[Event...] }               // resolves the current foe's intent
outcome(state) -> null | { result:'victory'|'defeat'|'fled', xp, gold, drops:[ItemInstance], claimed:[ItemInstance],
                          consumables, party, bag, beaten, kills, rounds, turns }
inspect(state, id)                                 // Analyze panel: weaknesses, resists, grip, queued intents
```

- `state.openingEvents` holds the events from battle creation (first intents, first `turn`).
- `commands()` entries carry `enabled`, `reason` (when disabled) and `targeting`; pass one back to
  `act()` with `target` (and optionally `relic` to aim grip damage at one breakable piece).
- `createBattle` takes spawns already escalated for the Waking (`rules/gauntlet.js` does that);
  its `waking` only raises loot luck. ctx keys: `inventory`, `bag`, `nodeId`, `where`, `day`,
  `gentle`, `noFlee`, `backdrop`, `patrol`, `ambush`.
- ctx (M3) also carries `firstStrike` (every foe's first turn comes 40 later), `warded` (a dice
  expression: every hero starts Warded; the Forewarned Rotwarden fight), `dark` (a fight in a dark
  map: draw the backdrop dark) and `duel` (losing is a yield).
- Game flow lives in `rules/gauntlet.js` (see Flow below).
- Full rules, formulas and the balance sim live in `docs/RULES.md`.

`act`/`foeTurn` never mutate their input; they return a new state plus an ordered event list.
The UI animates events one by one and then renders the returned state.

### Event types (the UI must handle all; unknown types are ignored)

| `t` | Fields | Meaning |
|---|---|---|
| `turn` | `actor` | a combatant's turn begins |
| `intent` | `foe, die, face, move, text` | foe rolled its intent die (d6/d8/d12/d20) and shows its next move; a move's `then` forces the next intent (`forced`, M5) |
| `roll` | `actor, target, purpose, die, rolls, kept, bonus, total, vs, result, adv, dis` | a visible d20 roll; `result` is `crit`/`hit`/`graze`/`miss`/`fumble`/`save`/`fail` |
| `damage` | `target, amount, dice:[{sides,value}], flat, aspect, kind, eff, crit` | `eff` is `weak`/`resist`/`immune`/`normal`; `kind` is `slash`/`pierce`/`crush`/aspect |
| `heal` | `target, amount` | |
| `status` | `target, status, op, stacks, turns, source?, label?` | `op` is `add`/`remove`/`tick`/`trigger`/`release` (a hold let go early, M5); an `add` names its `source` and a hold's `label` ("Held under") |
| `grip` | `target, relic, from, to, max` | the holder's grip on its relic changed |
| `disarm` | `target, relic` | relic clatters loose; the holder loses its Art |
| `surge` | `actor, from, to` | Legend Surge gauge changed (0-100) |
| `legend` | `actor, item, power` | a Legend Surge fires: the UI slams the item card across the screen |
| `ko` / `revive` | `target` | |
| `phase` | `foe, phase, text` | boss changes phase |
| `move` | `actor, name, text` | a named skill or Art is used; `charm: true, target` is a charmed hero's turn played for it (M5) |
| `text` | `text` | narration line |
| `spawn` | `foe, family, from, name, text` | a summon or a Twinned split joins the fight |
| `escape` | `foe, text` | a foe bolts, or summons wither when their Champion dies |
| `victory` / `defeat` / `fled` | outcome fields | battle end |

### Core rules (tunable in data)

- **Attack**: d20 + attack bonus vs target Guard. Natural 20 = Legend Strike (damage dice doubled,
  +surge). Natural 1 = fumble. **Graze**: missing by 3 or less still deals half damage.
- **Advantage/disadvantage**: roll 2d20, keep higher/lower; both dice are shown.
- **Initiative Ribbon**: conditional turn-based. Each action has a delay from the actor's speed
  (DEX) and the weapon's weight (dagger fast, maul slow). The ribbon previews the next 8 turns.
- **Aspects**: an elemental wheel where each aspect is strong against two and weak to two;
  physical kinds `slash/pierce/crush` interact with armor types `hide/mail/plate/chitin`.
  Weapons carry the attack aspect; armor carries resistances.
- **Intent die**: tier sets the die (rabble d6, veteran d8, relic-bearer d12, champion d20);
  the face picks a move from the foe's move table and is shown before the foe acts.
- **Grip & Claim**: a foe holding a relic shows a grip meter. Crush damage and disarm skills
  wear it down. At 0 the relic drops (`disarm`), the holder loses that relic's Art, and the relic
  is claimed at victory. Killing the holder first shatters the relic (reforgeable later).
- **Legend Surge**: per-hero gauge filled by dealing/taking damage and crits; when full, the
  hero's best relic power fires.
- **Party wipe**: wake at the last Hearthfire, keep all gear, lose 10% of gold.

### M5 statuses (`data/statuses.js`; M5 spec §4.2)

- `targetable(u)` (`rules/ai.js`) is the one test for "can be aimed at": alive, not gone, not `burrowed`
  and not `swallowed`. `targets()`, area moves, the foes' own aim and Auto all go through it.
- **burrowed**: under the floor until the unit's own next turn starts; nothing can target it and area
  moves pass over it.
- **swallowed** (`held`): the unit leaves the line for 2 of its own turns; each one is lost to a tick of
  the swallower's aspect (1d6). It comes back when the turns run out, when the swallower is KO'd or
  escapes, or when one hit takes at least `TUNING.swallow.releasePct` of the swallower's max HP (op
  `release`). The last unit standing on a side is never swallowed ("spat straight back out").
- **charmed**: no turn count; the unit's next turn plays itself as a plain attack on a random friend,
  then the charm clears. A friend's hit wakes it; with no friend to turn on it shakes the charm off.
- **Tamsin's kits**: a spawn's `variant: '$rival:<duel>'` resolves to the rival starter's variant plus
  `kit: '<duel>'`, and `data/rivals.js` `withKit` adds that duel's moves and replaces her table
  (`$rival` alone is unchanged). Summon effects may name a `variant`. An explicit `weak` aspect beats
  the aspect wheel's halving (Mother Anvil: ember, weak to frost).

## Flow (`rules/gauntlet.js`, M3 spec §4.6)

```js
newGame({ name, starter, seed, base }) -> v2 game at START_AT (keep-hall 12,6 n), the Eternal Hearth kindled
spawnsFor(game, encId)            // Waking escalation, Grudges, Echoes; level 'party', '$rival', lend, noWaking
startBattle(game, { nodeId } | { patrol: { spawns, where, backdrop, dark } }, { ambush, firstStrike, caught }) -> { game, battle }
resolveBattle(game, battle) -> { game, report }
  // report: { result, xp, gold, drops, claimed, consumables, rounds, levelUps, goldLost, grudge, grudgeSettled,
  //           brand: { ...BRANDS[id], waking, first, count } | null, rematch, yield, wokeAt }
rest(game, hfId) -> game          // heal, day + 1, lastHearthfire, kindled
travel(game, hfId) -> game        // needs kindled[hfId]; pos = the Hearthfire's stand
partyLevel(game), uniqueBrands(game)
```

- A win on an authored encounter sets `cleared`, `beaten += 1`, `done` if `once`, `unlocked[opens]`,
  and earns its `brand`. A Brand already held is a rematch (`report.rematch`, no Waking). A new
  Brand raises the Waking and re-arms every non-`once` encounter of its region; holding both
  Verdant Brands sets `story['act1-complete']`. There is no teleport.
- A wipe loses 10% gold, teaches 25% of the fight's XP, makes a Grudge, heals everyone and moves
  `pos` to the last Hearthfire's stand (`report.wokeAt`). Losing a `duel` is a yield instead: no gold
  lost, no Grudge, a breather heal where you stand, and the encounter's `yields` flag.
- There are no Routs (Milestone 4.5, `docs/M45-SPEC.md` A4). A weak pack you run down is a full battle
  (`caught`); winning it marks the `rout` deed on the relics the heroes who fought wear.
- The Waking: rabble rise `TUNING.waking.rabbleLevels` (2) levels per Waking, everyone else 6; the
  tier comes from `familyOf(spawn)`, so a relic-bearer variant escalates as a relic-bearer.
- `rules/party.js` adds Hilda's temper (`temperCost`, `temper`: +1 enchant per step, at most +3) and
  the shops (`buy`).

## World (`rules/world.js`, `cond.js`, `story.js`, `path.js`; M3 spec §4.1-§4.5)

Maps are data (`data/maps/*.js`: `rows` of tile characters from `data/tiles.js` LEGEND, plus
`entities`, `exits`, `anchors`, `roam`). The world engine is pure and lockstep: the UI calls it once
per step and once per idle tick (400 ms), and renders the events it returns.

```js
Walk   = { map, visit, x, y, face, tick, rng, grace, gone: {}, roamers: [Roamer] }   // plain JSON
Roamer = { id, enc|null, zone|null, spawns, lead: { family, variant, art, gearTier, count }, x, y, home, leash,
           face, mood: 'wander'|'alert'|'chase'|'return'|'flee'|'stunned', wait, weak, trackless }

enterMap(game, { map, anchor } | { map, at: [x, y], face }) -> { game, walk, events }   // seeds roamers; an `at` inside
                                              // something solid moves to the nearest free tile of its own stretch of
                                              // road (M4.5); an `at` off the map enters at the map's first anchor
move(game, walk, dir, { run }) -> { game, walk, events }
interact(game, walk) -> { game, walk, events }
tick(game, walk) -> { game, walk, events }
afterBattle(game, walk, { roamerId, result }) -> walk     // grace; the roamer gone (won) or stunned (fled)
commit(game, walk) -> game                               // writes progress.pos (same object if unchanged)
present(game, mapId) -> [Entity & { solid, state, glint, grudge, name, lead }]   // memoised per game object
canWalk, findPath (A*, 4-way), threat, keys, lockStatus, openLock, openChest, sightEncounter, light, isWeak, roamMask
```

**Events** (the UI stops at the first one that starts a battle: `encounter`, `contact`):
`turn`, `step`, `bump`, `exit {id, to, anchor, unlock?}`, `sealed {id, region, text, nextChapter}`,
`encounter {id}`, `gate {id, text, guard}`, `lock {id, lock, status}`, `trigger {id, dialogue}`,
`sighted {relic, enc}`, `hazard {pct, hurt, lock}` (ichor, and M5's snowdrift: `lock` names which), `talk {npc, dialogue, enc?}`, `sign {text}`,
`use {kind, id}`, `chest {id, lock?}`, `hearthfire {id}`, `enter {map}`, `alert {id}`,
`roam {moves: [[id, x, y, face]]}`, `contact {id, enc, by, firstStrike, ambush, weak?}` (a weak pack you ran down is
`weak: true`, a full battle with `caught`; M4.5 has no Routs).

- **Roamers** come from their own RNG stream (`roam:<seed>:<map>:<visit>`), never `game.rngState`.
  They wander within their leash, notice you within 5 tiles with line of sight (2 in the dark),
  pause (the "!" beat), chase on 2 of every 3 ticks, and give up past leash + 6 from home. Weak
  packs (all rabble, no relics, top level at least 3 below the party) flee on 4 of every 5 ticks;
  catching one is a full battle (`contact` with `weak: true`). Walking into a pack's back is a First
  Strike; a pack walking into
  yours is an ambush. They never enter exits, doors, stairs, lock or gate areas, Hearthfire stands,
  entity tiles or 1-wide corridors (`roamMask`).
- **Locks** (`data/locks.js`) each open with a relic map power (owned, not shattered) OR a Domain
  level of the best active hero. Darkness and ichor are soft: without a key you see 2 tiles, and
  ichor burns 4% of max HP a step (never below 1).
- **Conditions** (`rules/cond.js`): one evaluator, `check(game, cond)`, drives entity presence,
  gates, NPC talk, dialogue choices, quests and bounties.
- **Story** (`rules/story.js`): `talkTo`, `dialogueView`, `enterDialogue`, `choose` (Domain checks and
  contests roll from `game.rngState`; `odds.pct` is exact), `questLog`, `nextObjective`,
  `claimQuest`, `bounties`, `ladder`, `afterDialogue`, `restDialogue`, `pendingLetter`, `readLetter`.

Import direction inside `rules/`: `world -> story -> cond -> gauntlet`; `gauntlet` never imports
the other three, and `migrate` imports data only.

## Saves (`core/save.js`, `rules/migrate.js`; M3 spec §4.8, M4 spec §4.1, M5 spec §4.1, M6 spec §4.1)

Every milestone keeps its own save and its own file (the player's rule): this one writes only its own
keys and reads the earlier ones, newest first, without ever writing or removing them.

| Key | Use |
|---|---|
| `aethermoor.save.m6` | the live save (version 5) |
| `aethermoor.save.m6.bak` | the previous live save (before a New Game, an import or a restore) |
| `aethermoor.m6.started` | `'1'` once this milestone has a journey of its own: the older saves are then no longer offered |
| `aethermoor.save.m5` | the Milestone 5 save (version 4): read only; the M5 file still plays from it |
| `aethermoor.save.m4.5` | the Milestone 4.5 save (version 3): read only; the M4.5 file still plays from it |
| `aethermoor.save.m4` | the Milestone 4 save (version 3): read only |
| `aethermoor.save.v2` | the Milestone 3 save (version 2): read only |
| `aethermoor.save.v1` | the M2 save: read only, never written or removed (the M2 page still plays from it) |

- `loadGame(migrate) -> { game, from: 'live'|'m5'|'m45'|'m4'|'v2'|'v1' } | null`: the live save if present;
  else, until the started marker, the newest earlier save migrated in memory (nothing is written until
  the world's first step: `ctx.commitAdopted()`).
- `saveGame` writes the live key (and the marker); `clearGame` removes the live key only.
- Codes: `exportCode` gives `AETH<version>.` + base64 JSON (`AETH5.` now); `importCode(code, migrate)`
  takes AETH1 to AETH5, names a newer code as newer, scrubs every string (`scrub`), then migrates.
  `exportV1Code`, `exportV2Code`, `exportM4Code`, `exportM45Code`, `exportM5Code` give the earlier saves byte for byte.
- `migrate(save)` = `toV5(toV4(toV3(toV2(save))))`, pure and idempotent: `toV2` keeps every M2 field verbatim
  and places the party on the map anchor `v1:<node>`; `toV3` adds M4's purse, pouch, pages and settled
  Grudges and counts every won fight as beaten (M4.5's road gates); `toV4` only marks the save as M5's, and
  `toV5` as M6's.

## Painted maps and stills (`ui/world/view.js`, `ui/assets/paint/`, `ui/assets/cuts/`; M5 spec A10)

- A map listed in `ui/assets/paint/index.js` (`PAINTINGS[mapId] = { w, h, src }`, a WebP at 32 px per
  tile) draws its painting as its ground, at `PAINT_DENSITY` (2) canvas px per art px, so its detail
  shows; the objects draw on top as usual, and the overhead layer takes the painting's pixels wherever
  the tiles' own overhead layer would draw (canopies, roofs, grass tops), and over a map's `overhang`
  rects. A painting decodes when its map is first baked (at most `PAINT_KEEP` decoded at once); until
  then, and on every other map, the tiles draw.
- A map traced from its painting (the East Road, M5 spec A11) sets `overTiles: false`: its tiles only
  say what is solid, and nothing but the painting draws its ground and canopies. A thing the painting
  shows is an entity with `look: 'painted'` (a `sign` with a `name`: no sprite, A reads "A · <name>");
  a Hearthfire in a painted ring uses the hearth look `painted` (the flame alone, a tile above its foot).
- `ui/assets/cuts/index.js` (`CUTS[name]`) holds cut-scene stills; the prologue shows `hearth-gold`
  then `hearth-blue`, and draws its own scene without them.
- Tools: `tools/paint-refs.mjs` renders a batch's layout references (long roads as overlapping panels,
  `refs.json`); `tools/paint-prompts.mjs` writes its prompt sheet; `tools/paint-import.mjs` fits the
  returned paintings to their maps (joining panels) and writes the asset modules; `test/paint.test.mjs`
  checks them. The build counts the paintings apart from the game (M5 spec A6).

## Art contract (`src/art/`)

- `forge.js` — `Forge`, `Xf`, `compose`, `MAT` materials; see the prototype for the pipeline.
- `recipes.js` — item recipes keyed by `RECIPE[r]`; `renderItem({r,p}, size)` -> raster.
- `heroes.js` — layered hero sprites from `{build, skin, hair, ...}` plus gear looks.
- `foes.js` — `FOE_ART[key]` and `renderFoe(key, { tier, gearTier, relic, phase, pose })` -> ImageData.
  A foe's relic is drawn from the same item art params as the card, so the glinting weapon on the
  enemy is visibly the item you will claim.
- Art keys are the shared vocabulary: data files reference art by key string only.

## Shared vocabulary (ids used across data, rules and art — do not rename)

**Aspects:** `ember` `frost` `storm` `stone` `verdant` `tide` `radiant` `blight`
(physical kinds `slash` `pierce` `crush`; armor types `hide` `mail` `plate` `chitin`).

**Item kinds by slot** (each has an art recipe):
- weapon: `sword` `dagger` `axe` `hammer` `mace` `spear` `bow` `staff`
- offhand: `shield` `focus`
- head: `hood` `coif` `kettle` `helm` `circlet` `crown`
- body: `robe` `leather` `mail` `plate` · hands: `gloves` `gauntlets` · feet: `boots`
- `amulet` · `ring`

**Heroes** (art key = hero id): `warden` (the player's Hearthwarden), `pip` (Pip, Thornhollow
scout), `bryn` (Bryn the Bark-Reader of Eldergrove), `alondra` (Sister Alondra, the blind
priestess of Fawnrest).

**Foe tiers:** `rabble` `veteran` `relic-bearer` `champion`.

**Foe art keys** (Verdant Wilds slice): `cutpurse` `briarling` `thornhound` `bandit` `tallyman`
`rotstag` `oldsnag` (Relic-Bearer boar) `briarmaw` (Champion boss, 3 phases).
M3 adds `smuggler` `boglurcher` `glowcap` `rotgrub` (rabble), `feral-druid` `hollowed-ranger`
`sapwight` (veterans), `gloamwing` `mirelord` (Relic-Bearers), `rotwarden` (Champion, 3 phases, a
breakable mask and seed), the named holders `mags` `haskett` `hollis` `dun` `vesper` `oda` `corra`,
and the rival `tamsin`.
Humanoid foes (`cutpurse`, `bandit`, `tallyman`, `smuggler`, `feral-druid`, `hollowed-ranger`,
the named holders and `tamsin`) show gear tiers 0-3 on the sprite.

**Named relics** (rules own stats/powers; art owns looks via `RELIC_ART[id]`):

| id | kind | aspect | where it comes from |
|---|---|---|---|
| `hearthbrand` | sword | ember | starter choice |
| `stillwater-lance` | spear | frost | starter choice |
| `cairnmaul` | hammer | stone | starter choice |
| `wardens-seal` | amulet | radiant | on the Tallyman thief's belt (first fight) |
| `tallyknife` | dagger | blight | Tallyman veterans |
| `thornsplitter` | axe | verdant | buried in Old Snag's hide |
| `rotwood-circlet` | circlet | blight | tangled in the Rot-Stag's antlers |
| `thornwatch-hood` | hood | verdant | Thornwatch Regalia 1/3, worn by bandit veterans |
| `thornwatch-jerkin` | leather | verdant | Thornwatch Regalia 2/3 |
| `thornwatch-boots` | boots | verdant | Thornwatch Regalia 3/3 |
| `thornwreath` | crown | verdant | Briarmaw's breakable thorn-crown |
| `briarfang` | dagger | verdant | Briarmaw's breakable fang |
| `lightfingers` | gloves | frost | Mags Kestrel (M3) |
| `hartshorn` | bow | storm | Haskett the Poacher |
| `mosswatch-lantern` | focus | ember | Hollis Fairweight |
| `watchkeepers-kettle` | kettle | storm | Old Garret (contest or quest) |
| `mire-pearl` | ring | tide | Gorrow the Mire-King |
| `dawnbell` | mace | radiant | the Gloamwing |
| `rootsong` | staff | tide | Oda the Thornmother |
| `oathshield` | shield | stone | Sgt Corra Thistle |
| `isoldes-oath` | sword | frost | Dun the Counter |
| `ichor-mask` | helm | blight | the Rotwarden (breakable) |
| `first-seed` | amulet | verdant | the Rotwarden (breakable) |
| `vale-gauntlets` | gauntlets | storm | worn by Tamsin; drops when you win |

Every relic has a map power (`RELICS[id].mapPower.id`) that opens a lock type in the world.

## Conventions

- Plain modern JS (ES2023), no frameworks, no TypeScript. Small pure functions in rules.
- Every data table exports a frozen object keyed by id; ids are lowercase kebab or camel, stable
  forever (saves reference them).
- Phone first: portrait 360-430px wide, 44px tap targets, no horizontal scroll. Laptop gets
  keyboard: arrows/WASD move, Enter/Z confirm, Esc/X back, 1-6 pick commands.
- Respect `prefers-reduced-motion`. Audio starts only after a user gesture.
- Storage: wrap every `localStorage` access in try/catch; the game must run without it.
