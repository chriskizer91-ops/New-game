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

`tools/build.mjs` bundles `src/main.js` with esbuild (IIFE, not minified), collects CSS imported
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

```js
{
  version: 1,
  seed, rngState,
  party: { active: ['warden','pip','bryn','alondra'], roster: { [heroId]: HeroState } },
  inventory: [ItemInstance], gold, codex: { [relicId]: { sighted, claimed, awakened } },
  progress: { waking: 0, brands: [], lastHearthfire: nodeId, node: nodeId, flags: {} },
  settings: { sound, battleSpeed, reducedMotion }
}

HeroState = { id, name, level, xp, hp, mp, surge, base:{STR,DEX,CON,INT,WIS,CHA},
              gear:{ weapon, offhand, head, body, hands, feet, amulet, ring }, // ItemInstance ids or null
              skills:[skillId], domains:{ [domainId]: { level, path, opt7, opt13 } } }

ItemInstance = { uid, base:itemBaseId | relicId, kind, slot, rarity, ilvl, name, aspect|null,
                 affixes:[{id, value}], gems:[], temper:0, seed,          // seed drives procedural art
                 provenance:{ from, where, day }, chronicle:{ kills:0 } }
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
outcome(state) -> null | { result:'victory'|'defeat'|'fled', xp, gold, drops:[ItemInstance], claimed:[ItemInstance] }
```

`act`/`foeTurn` never mutate their input; they return a new state plus an ordered event list.
The UI animates events one by one and then renders the returned state.

### Event types (the UI must handle all; unknown types are ignored)

| `t` | Fields | Meaning |
|---|---|---|
| `turn` | `actor` | a combatant's turn begins |
| `intent` | `foe, die, face, move, text` | foe rolled its intent die (d6/d8/d12/d20) and shows its next move |
| `roll` | `actor, target, purpose, die, rolls, kept, bonus, total, vs, result, adv, dis` | a visible d20 roll; `result` is `crit`/`hit`/`graze`/`miss`/`fumble`/`save`/`fail` |
| `damage` | `target, amount, dice:[{sides,value}], flat, aspect, kind, eff, crit` | `eff` is `weak`/`resist`/`immune`/`normal`; `kind` is `slash`/`pierce`/`crush`/aspect |
| `heal` | `target, amount` | |
| `status` | `target, status, op, stacks, turns` | `op` is `add`/`remove`/`tick`/`trigger` |
| `grip` | `target, relic, from, to, max` | the holder's grip on its relic changed |
| `disarm` | `target, relic` | relic clatters loose; the holder loses its Art |
| `surge` | `actor, from, to` | Legend Surge gauge changed (0-100) |
| `legend` | `actor, item, power` | a Legend Surge fires: the UI slams the item card across the screen |
| `ko` / `revive` | `target` | |
| `phase` | `foe, phase, text` | boss changes phase |
| `move` | `actor, name, text` | a named skill or Art is used |
| `text` | `text` | narration line |
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

**Foe art keys** (Verdant Wilds slice): `cutpurse` `briarling` `thornhound` `bandit` `tallyman`
`rotstag` `oldsnag` (Relic-Bearer boar) `briarmaw` (Champion boss, 3 phases).
Humanoid foes (`cutpurse`, `bandit`, `tallyman`) show gear tiers 0-3 on the sprite.

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

## Conventions

- Plain modern JS (ES2023), no frameworks, no TypeScript. Small pure functions in rules.
- Every data table exports a frozen object keyed by id; ids are lowercase kebab or camel, stable
  forever (saves reference them).
- Phone first: portrait 360-430px wide, 44px tap targets, no horizontal scroll. Laptop gets
  keyboard: arrows/WASD move, Enter/Z confirm, Esc/X back, 1-6 pick commands.
- Respect `prefers-reduced-motion`. Audio starts only after a user gesture.
- Storage: wrap every `localStorage` access in try/catch; the game must run without it.
