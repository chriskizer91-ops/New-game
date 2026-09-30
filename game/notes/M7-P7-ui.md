# M7 P7: the UI of Act III and the browser tests

Package P7 of `docs/M7-SPEC.md` (§5, §8's e2e-world, e2e-battle and e2e-flow lists, A11-A15). I built it against P1's
rules and the scaffold's stand-ins, then checked it against P2's, P3's, P5's and P6's content as each landed (see
"Checked on the landed packages"). No git is run.

- Private copy: `scratchpad/m7-p7`.
- Private build: `scratchpad/m7-p7/build`.
- A scratch merge, for checking only and not a deliverable: `scratchpad/p7work/merged`, which is my copy with P2's,
  P3's, P5's and P6's files laid over it. Its build is in `scratchpad/m7-p7/build/merged`.

**Status: done.** Everything the UI owns is built and tested, including every hook the lead passed on from P2, P3, P5
and P6.

- Only P4 (the Act III families) is still out.
- The checks that need its families report BLOCKED, and under the standing policy a BLOCKED check fails the e2e run.
- Each blocked check runs as soon as the data has what it needs; none of them needs changing.

## Files

**Changed** (all mine under the brief):
- `src/ui/battle/{hud,log,menu,model,party,player,sprites}.js`;
- `src/ui/screens/{atlas,battle,codex,journal,world}.js`;
- `src/ui/world/{actors,dialogue,sheets,story-fx,view}.js`;
- `src/ui/lib/{atlas-geo,carry-facts}.js`;
- `src/ui/{battle,card,forge,screens,world}.css`. In `card.css`, only the two primal Legend Surge slam rules the lead
  asked for were added; the frozen reveal's rules are untouched.
- `tools/e2e-world.mjs`, `tools/e2e-battle.mjs`, `tools/e2e-flow.mjs`;
- `test/shell.test.mjs`, `test/ui-m6.test.mjs` (pins replaced one for one, below).

**New:**
- `src/ui/lib/act3.js`: the pure view models of the pre-fight card and the Masterpiece tab. They live here because
  `ui/world/sheets.js` imports `forge.css`, so node cannot load it.
- `test/ui-m7.test.mjs`: 21 tests.

**Unchanged:** `core/audio.js`. The Act III maps already name their tracks (`dungeon`, and the Worldforge `boss`), and
`test/ui-m7.test.mjs` pins that.

## What I built

### The battle (`ui/battle/*`, `ui/screens/battle.js`, `battle.css`)

- **The guest** (`side: 'ally'`, `guest: true`: Tamsin against the Unsmith):
  - **Her card** (`party.js addGuest`) is narrower, after the party's four (`repeat(4, 1fr)` then `.8fr`). At 360 px
    the heroes' cards are 75 px and hers 60 px, with no horizontal scroll. It shows:
    - her name and HP;
    - the move she makes next, with its die;
    - a "Guest" tag over her figure.
  - **Tapping her card** (a 44 px button) opens her Analyze sheet: "Her next move", and "She fights beside you. Her
    turns play on their own: she takes no command." She never takes a command.
  - **Her figure** is her foe art facing the foes: `FoeSprite(u, reduced, { flip: true })`, i.e. P6's `renderFoe(…,
    { flip: true })`, with the flip in the sprite key and the foot mirrored.
    - Her display unit keeps her look's tier (`artTier`, uncapped), so P6's finale kit (gear tier 5) shows.
    - A foe's display unit stays as it shipped, without one.
  - **Her turn** plays like a foe's, with a move banner of her own (`data-side="guest"`, "Tamsin, beside you").
    - She lunges from her place, or casts when the move has no attack roll (`model.js moveAttacks`).
    - Her die tumbles on her card.
  - **Around the screen:**
    - the ribbon says "…, beside you";
    - `.bt-who` and `.bt-rib` are in her colours;
    - her aria-label says "fighting beside you (she takes no command)".
  - **"Not a hero means a foe"** now goes through `model.js inParty`:
    - in `battle.js`: refreshUnit, setActor, setTargets, pulseStatus, portraitOf, and the turn loop;
    - in `player.js`: isHero, intents, move, roll;
    - in the hud's ribbon, and in `menu.js` (Analyze calls a guest "guest");
    - the foes' letters leave her out.
- **The two dice** (the Unsmith):
  - both intents on his plate, one row a die (`.bt-int-two[data-slot="1"]`);
  - a move played is dimmed (`played`), and a Staggered one struck out (`cancelled`);
  - both dice tumble together;
  - the move banner says "die N of M", and the log "…, die 2 of 2";
  - Analyze shows both lines, with a note;
  - the aria-label reads "intends X, then Y".
- **A hollow foe's +4:**
  - the die shows the natural roll, and "+4 = 17" pops in beside the move;
  - the log reads "(d20 13 +4 = 17)" (`model.js dieText`);
  - the label and Analyze say the same, and Analyze adds a note on prying the gift loose.
- **The dice looks:** `INTENT_DIE` is read through `hud.js intentDie` / `model.js tierKey`. A tier's own row comes
  first (P6's smoky hollow d20 and forge-iron Unsmith d20), else the row of the tier it reads as (`tierAs`, the
  Champion's).
- **Other tier lookups:**
  - `foeLook` passes `tierAs(tier)` to the art;
  - the boss check, the summon slots and the world's boss music use `tierAs`;
  - `menu.js` names the tiers;
  - `ui/world/actors.js TIER_RANK` gains `hollow: 4, unsmith: 5`, and any other new tier ranks as `tierAs`.
- **The Stolen Arts:**
  - **The `stolen` event** (`player.js on_stolen`) shows:
    - a big banner ("He takes what you never claimed", or "Nothing left to take", with "N Stolen Arts · Guard +N");
    - a flash, a ring, sparks and a "Guard +N" float;
    - the engine's own words in the log.
  - **His plate** gets a "Stolen" row of the relics' icons. Analyze adds "Stolen Arts · N", each with its move.
  - **The art** (P6's hook): `foeLook` gives it `stolen`, his relic ids (at most six, from the display unit's list or
    an engine unit's `{ ids }`). The ids join the sprite key, so his Thief phase draws the very relics he took.
- **Grip words** (`model.js gripWord`, the lead's note from P6): Page V's pieces go by the thing: "Poker", "Wreath",
  "Chalice", "Gauntlet", "Chain", "Bargain", "Hammer", "Apron", "Heart". Before this, No. 000 read "Fenwick's" and
  all four gifts read "Hollow". The new `ofPageV` is next to `ofPageIV`.
- **The two-dice layout:** on a narrow stage his two-row bubble reaches the top edge.
  - The "click or Enter to hurry" hint gives way there (`.bt.two-dice .bt-skip`, below 560 px); a tap still hurries.
  - The bubble fades while a move banner is up (`.bt.two-dice.ban-up .bt-intent`). The shell's `ban-up` class is
    set by `moveBanner` and cleared by its timer and by `bigBanner`.
- **Found on the way:** `card.css`'s `.flash` (the card reveal's, frozen) also matched the battle caption's `flash`,
  so a white box covered the dock whenever a caption flashed. The frozen M6 build shows the same bug. The caption's
  class is now `bt-flash` (`battle.js`, `battle.css`).
- **The primal Legend Surge slam** (the lead's two rules, in `card.css` beside the other slam rules): a Primal piece's
  Surge (the Masterpiece's Kindle) flashes white-gold rays and border.
  - The slam already sets `data-r` from the item's rarity (`card.js`).
  - Reduced motion is as before (`.ov-slam.still`).

### The fight card (`ui/world/sheets.js openPrefight`, `ui/lib/act3.js prefightView`)

- **The dice:** each foe's row shows its dice.
  - The Unsmith: "2 d20s, 2 moves a turn".
  - A hollow foe: a d20 with a "+4" chip, "d20 +4 while the Hollow Wreath holds". The "while…" clause appears only
    when the family names its gift (`bonusWhile`); with none named, the +4 always holds.
- **"What he will take":** the relics this game never claimed (`rules/codex.js stolenFor`, the same list the fight
  uses).
  - It appears only for a family whose phases steal.
  - Its note names the phase that steals, and the Guard each relic gives (`TUNING.unsmith.stolen.guard`).
  - With nothing left to take, it says so.
- **"Beside you":** Tamsin's figure (facing the foes) and "Tamsin fights beside you" (`rules/gauntlet.js alliesFor`).
- **The words:** the tiers read "Hollow Council" and "The Unsmith"; the button reads "Face Hollow Miravel" / "Face
  the Unsmith".

### The Masterpiece (`sheets.js openForge`, `forge.css`, `act3.js masterpieceView`)

- **Where it is:** Hilda's forge gets a fifth tab, shown from the fifth council on, once one is forged, or when a
  scene opens it. `{ open: 'masterpiece' }` (P3's "Forge the Masterpiece.") opens the forge on it.
- **What it shows:**
  - the rules' reasons while it is not offered;
  - the ten bases (a radiogroup of 44 px buttons);
  - a name `<input>` (maxlength 24);
  - the price (gems included);
  - why the forge is shut ("Choose the weapon…", "Give it a name", "Name it with 1 to 24…", or the first reason).
- **The name:**
  - it is scrubbed by the rules (`masterpieceName`) and read back only as text: "It will read: Ember-Heart" or
    "That name will not take.";
  - it is set only through `textContent`;
  - `<img src=x onerror=alert(1)>` is refused, and `<Ember-Heart>` becomes "Ember-Heart".
- **On success:** the frozen reveal, as it is, in its primal frame.
- **One per save:** after that the tab shows the Masterpiece and nothing more to forge.

### The cards (`ui/world/story-fx.js`, `ui/screens/world.js`, `world.css`)

- **The Opening** (on `{ end: 'act3-open' }`, which P3's council-5 now ends with): "Act III" / "The Hollow Council"
  (label "Act III: The Hollow Council"), the eight coals lit, two lines, and "Go down".
- **The Hearth Below's card:** the first time down the vault stair, once a save (`card:below`). It shows the still
  `CUTS['hearth-below']` if present, else the drawn scene from the `hollow-hall` backdrop (P6's), with
  `scorchgate-vaults` as a fallback.
- **The fourth council's card:** "Act III begins.", with its one chip, Act III, open.
- **The Pages stat** on every chapter card counts every page, Page V (`nos`) among them.
- **The endings** (on `{ end: 'act3' }` after `{ ending }`; P3's scenes end so):
  - **The ending's card:** its still (`CUTS['ending-<id>']`), or else its own drawn scene (the hearth lit, gone out,
    or fed the Masterpiece). Kindle Anew names the Masterpiece, as text.
  - **The credits** (`creditsOf`):
    - the Warden and the party;
    - the cast from `NPCS`, and the Unsmith by his NPCS name (P3's new speaker, "Harrow Ironvein");
    - "Your journey": days, relics x of 75, Brands, pages x of 5, the Masterpiece and the ending.
  - **The last card:** "The post-game opens in the next chapter".
  - **Then** the party walks back to the Great Hall (`START_AT`), with the ending remembered.
- **The heart's choice** (`dialogue.js`): a choice with `reasons` is disabled and shows them under it, side by side
  where they fit, after a small "Needs": "Needs ✗ Fenwick's Poker ✗ your Masterpiece ✗ every page of the Codex".
  - At 360 px all four choices stay on screen.
  - Its label reads "Kindle Anew: a legend of your own: not yet. Needs Fenwick's Poker, your Masterpiece, every page
    of the Codex."
- **The soot lines** (`view.js`): `GATE_KIND['hollow-gate'] = 'hollow-gate'` (P5's sprite). A build without that
  sprite draws the plain gate (`FALLBACK_KIND`).
- **The big props** (P5's note): the view bakes the whole map, every object sprite with it, while the screen is black
  between the two fades (`transition` → `enterVisuals` → `setMap` → `bakeAll`). e2e-world 47 checks this on every
  Act III map:
  - the view counts the object sprites it builds (`view.js objBuilds`), and the world seam's `state()` reports it
    with `fade`;
  - walking in, every object sprite is built while the screen is black, and none once the map shows;
  - measured on the merged build, the First Sleeper's first build is one frame of 200 to 217 ms at full black, and the
    Worldforge's 100 ms;
  - once the map shows (the fade in, then the first second), no frame is over 17 ms.

### Codex, Journal, Atlas

- **Codex:**
  - Page V's nine riddles, No. 000 first, labelled "No. 000/074";
  - the tabs lay out by the page count and stay in one row;
  - `ROAD_NOTE.below` reads "…once the Council has sat a fifth time: the stair under the vault.";
  - the reliquary line counts the 66 relics that stand in the galleries ("12 of 66 relics home"). From the fourth
    council on, or once one of them is carried, it adds Page V's nine ("· Page V: 1 carried, 8 below").
- **Journal:**
  - the road below is listed only from the fourth council (sealed, "…a fifth time"), then open;
  - the Ladder has the five Act III posters;
  - a found rumour shows a "Found" kick and a "Found: the Unsmith" button, which scrolls to his poster and flashes it
    (`rumourFound`). It takes the rules' word when `ladder()` gives one (the `found` field the lead adds at the merge).
    Until then it checks P3's `found: { if, poster }` itself.
- **Atlas:**
  - a "Below the Keep" marker (a stair) stands on the Keep once the road below is open;
  - it opens the Below view: its four maps listed (here, walked, not yet), and from below the Atlas opens there,
    marking where you are;
  - the Realm keeps its 33 fires;
  - Act III's region has no padlock: it has no place of its own on the painting.
- **Relic counts:** the title line and the carry-over card count relics out of 75 (the number of relics). The Codex
  label keeps the highest number, 074.

## Tests

`npm test`: **562 of 562 pass** (the base's 541, P1's, and my 21). `npm run lint` is clean.

### New: `test/ui-m7.test.mjs` (21 tests)

- **Battle:**
  - the guest (`inParty`, `isGuest`, `makeDisp` from the Unsmith's real fight: named like a hero, never lettered,
    her intent said as hers, her art tier kept);
  - the dice looks (`intentDie`, `tierKey`, P6's rows or the Champion's);
  - `foeLook` (the Champion's tier to the art; the stolen ids, at most six);
  - Page V's grip words (`gripWord`, `ofPageV`);
  - `dieText` against the rules' hollow rolls;
  - two dice and the Stolen Arts on the display units;
  - the log (the +4, "die N of 2", `stolen`; M6's lines unchanged);
  - `moveAttacks`.
- **The fight card:** `prefightView` against the data and the rules. It holds for the stand-ins and for P4's families.
- **The Masterpiece:** `masterpieceView` and `masterpieceTabShown` (reasons, bases, names, hostile names, scrubbing,
  one per save).
- **The cards:** `openingCard`; the ending cards; `creditsOf` (a hostile Warden's name kept as a plain string);
  `LAST_CARD`; the Pages stat.
- **Codex, Journal, Atlas:**
  - `reliquaryLine`;
  - Page V in the binder;
  - `roadShown`;
  - `rumourFound` (the rules' word, or the data's; it takes a ladder for the test);
  - `belowMaps`.
- **Music:** the Act III tracks.

On the merged copy (P2's maps, P3's story, P5's and P6's art), `test/ui-m7`, `ui-m6` and `shell` pass: 47 of 47.

### Pins replaced, one for one

**`test/shell.test.mjs`:**

| Pin | Old | New |
| --- | --- | --- |
| Test title | "…the relics out of 74 (M7: the highest Codex number)…" | "…the relics out of 75 (M7: every relic, No. 000 among them)…" |
| `RELIC_TOTAL` | `74` | `75` |
| `F.total` | `74` | `75` |
| Save lines | `/…1\/74 relics$/` and `/…\d+\/74 relics$/` | `/…1\/75 relics$/` and `/…\d+\/75 relics$/` |
| Pages stat | `` `0/${PAGES.filter(p => p.from != null).length}` `` | `` `0/${PAGES.filter(p => p.from != null \|\| p.nos?.length).length}` `` |

**`test/ui-m6.test.mjs`:**
- **The fourth council's card** (its title gains `(M7: "Act III begins.", its chip open)`):
  - the same Pages filter change as in `shell.test.mjs`;
  - the chips pin:
    - old: `assert.ok(V.chips.every(c => !c.open) && V.chips.some(c => /Act III/.test(c.name)), 'Act III is named,
      and nothing opens')`;
    - new: `assert.ok(V.chips.length === 1 && V.chips.every(c => c.open) && V.chips.some(c => /Act III/.test(c.name)),
      'Act III is named, and its chip is open')`;
  - a new pin: `assert.equal(V.lines[V.lines.length - 1], 'Act III begins.')`.
- **The region cards** (its title gains "(M7: the Hearth Below has its card too)"):
  - a new pin: `hasRegionCard('below') === true`;
  - the no-card loop's filter: `id !== 'gloomfen'` becomes `id !== 'gloomfen' && id !== 'below'`.
- **The grip words** (its title gains "(M7: Page V's by the thing too)"):
  - old: every relic below Codex No. 53 kept its first word, so No. 000 read "Fenwick's" and the four gifts
    "Hollow";
  - new: a Page V relic (the page's `nos`) goes by its last word ("Poker", "Wreath"…), and "older" means below No. 53
    and not on Page V;
  - every other assertion in the loop is unchanged.

### e2e checks changed (`tools/e2e-world.mjs`)

- **18:**
  - old: the tabs were `'verdant:true sunscorch:false ironspire:false gloomfen:false'`;
  - new: `'… gloomfen:false below:false'`;
  - added: the tabs stand in one row, and Page V is checked (9 pockets, "0 of 9 claimed", its reward, No. 000 first
    as "No. 000/074", the road note).
- **21** (a scaffold leftover: it failed on the base too):
  - old: the padlocks still to come were `Object.keys(REGIONS).filter(r => !regionOpen(gNow, r))`;
  - new: the same filter, with `REGIONS[r].act < 3 &&` added (the Atlas gives Act III no padlock).
- **27** (a scaffold leftover):
  - old: the regions ahead were `r.act >= 2 && …`;
  - new: `r.act === 2 && …` (the chapter card names only Act II's regions ahead; the fourth council's card names Act
    III).
- **38:**
  - old: `opens === 0 && !/stands open|opens in the next chapter/.test(card)`;
  - new: exactly one open chip, "Act III", "Act III begins." on the card, and no road that stands open or opens in the
    next chapter.
- **39:** its walk is now `perfWalk(tag, …)`, which 47 shares. Its assertions are unchanged.
- **Written for the stubs, fixed once P2's and P3's content landed:**
  - every place is found from the map data. The Keep's yard spot comes from the Great Hall door's exit, where it had
    been the fixed tile (15,5);
  - the long Act III scenes play to their end (`playDialogue(/./, 150)`);
  - 46 counts only the rumours shown (the man on the barge shows only after the fen), and checks that "Found: the
    Unsmith" goes to his poster.

`tools/e2e-battle.mjs`:
- `open()` and `harnessFight()` share new helpers, `newPage()` and `levelled()`;
- `blocked()` appends, so a scenario can block only some of its parts;
- no assertion changed.

`tools/e2e-flow.mjs`: section O gains the Page V check.

## The browser runs

Every suite runs in Chromium, at the phone's 360x740 and the laptop's 1280x800.

**On my private build** (`AETH_HTML=scratchpad/m7-p7/build/aethermoor.html`, still the scaffold's stand-ins for P3's
and P4's content):

| Suite | Result |
| --- | --- |
| e2e-world, scenarios 1-47 | 723 checks pass and none fail; 10 are BLOCKED |
| e2e-battle | 28 of 30 scenarios pass; `hollow` and `unsmith` are BLOCKED |
| e2e-flow | passes (368 checks), Page V in section O included |

- The e2e-world run exits 1, because a BLOCKED check fails the run under the standing policy.
- **e2e-world BLOCKED, per viewport:**
  - P4: 41's +4, and 42's two dice and what he will take;
  - P3: 43's heart choice and 46's found rumours. P3 has landed, but not in this copy; both pass on the merge.
- **e2e-battle BLOCKED:** only their P4 parts. Every other check in `hollow` and `unsmith` passes.

**On the scratch merge** (P2, P3, P5 and P6 laid over my copy; `build/merged`):

| Suite | Result |
| --- | --- |
| e2e-world, 1-47 | 733 checks pass and none fail; 6 are BLOCKED, all P4 (41's +4, 42's two dice, 42's list, on each viewport) |
| e2e-flow | passes (368 checks) |
| e2e-battle `hollow` and `unsmith` | every check passes; only their P4 parts are BLOCKED |

**e2e-world 47, the Act III maps at 4x CPU throttle:**

| Measure | Result |
| --- | --- |
| Walking each map | p95 frame JS 1.9-3.7 ms (under 16 ms); at most 12 `drawImage` a frame (under 40) |
| Walking in (P5's art) | 2-3 object sprites built while black, 0 after |
| The longest frame while black | the Chained Deep 200-217 ms (the First Sleeper's first build), the Worldforge 100 ms |
| The longest frame once the map shows | 17 ms |

The earlier scenarios' numbers are as in M6: 11, 17, 26 and 39 are all within their gates.

**Along the way:**
- The first full run on my build had two failures, 21 and 27. They were M6 checks that counted every region, which
  now includes Act III; they are fixed above.
- Its laptop entry into the Worldforge had one 67 ms frame, the only one over 17 ms in all the runs. That first
  version of 47's entry check timed single frames against 50 ms. It now checks what the lead asked for, deterministically:
  every sprite is built before the map shows. It keeps a 150 ms sanity bound on single frames.

### What the M7 scenarios check

**e2e-world 40-47** (phone 360x740 and laptop 1280x800):
- **40, the Opening:**
  - the vault stair is sealed before the fifth council, and says why;
  - the council's scene is walked in from the Keep's yard, and ends on the Act III card (through P3's scene where it
    ends so, else through the story seam);
  - the stair shows after it;
  - the Hearth Below's card appears, then the dungeon track; the second time down there is no card.
- **41, the Hollow Hall's stair:**
  - it is open before the first fight;
  - the first Council member's card shows the d20 +4 (P4's family);
  - after a forced win, the stair (the whole flight, `hh-up`) is sealed ("filled with ash");
  - it opens again after the fourth.
- **42, Tamsin below:**
  - she waits before the forge door, speaks, joins and leaves the map;
  - the Worldforge plays the boss track;
  - the Unsmith's card names him and his pieces, has her "fights beside you" and her figure, his two dice, and what
    he will take (P4's family).
- **43, the heart's choice:** only words before the Unsmith falls. After it, Kindle Anew is shown shut with exactly its
  reasons; Rekindle and Release can be chosen; every choice is 44 px.
- **44, an ending:**
  - Rekindle is chosen at the heart (P3's scenes), or played through the seam;
  - the ending's card; the credits (a hostile Warden's name shows as text: 0 images, 0 alerts); the last card;
  - back in the Great Hall, with the ending remembered.
- **45, the Masterpiece:**
  - its reasons, the ten bases (44 px each) and the price;
  - a hostile name is refused and never runs; `<Ember-Heart>` is scrubbed;
  - "Wren's Answer" is forged, and the reveal shows it in its primal frame;
  - one per save.
- **46, the Journal and the Atlas:**
  - the road below: not named, then sealed, then open;
  - the five Act III posters, and "Found: the Unsmith" going to his poster;
  - "Below the Keep" (44x44) opens the Below view: four maps and their fires. From below, the Atlas opens there.
- **47, performance below** (new):
  - each Act III map is walked for 10 s at 4x CPU throttle (p95 frame JS ≤ 16 ms, ≤ 40 `drawImage`);
  - each is walked into: every object sprite is built while the screen is black and none after, with a sanity bound
    of 150 ms on any frame once it shows (a big prop's first build is 100 to 300 ms).

**e2e-battle `hollow` and `unsmith`** (360x740, in the built game):
- **How they run:** the rules make the battle, and the test seam starts it (`setGame`, `go('battle')`), with the
  harness's pause hooks. The rules find the fight first, and the page plays the same one.
- **Stand-ins:** while a family is a stand-in, the state is patched to its real tier (the hollow +4; the Unsmith's two
  dice and the relics he takes, held from the start).
- **hollow:**
  - "+4 = N" beside the move, and her label reads "(d20 n +4 = N)";
  - the log names the natural roll;
  - beaten, she is freed in her own words (her `koText` in the log);
  - no horizontal scroll;
  - BLOCKED until P4: her gift snapped and the +4 gone.
- **unsmith:**
  - his two intents; the Stolen row on his plate and in Analyze;
  - Tamsin's card with the party's four, all on screen at 360 px, 44 px, saying who she is; tapping it opens her
    details;
  - her own banner, with no command menu on her turn;
  - "die 2 of 2", with both dice dimmed;
  - phases 2 and 3; the log's dice lines and her moves; a win;
  - BLOCKED until P4: the stolen event.

**e2e-flow**, section O: Page V in the carried Milestone 6 journey:
- it is open, No. 000 first ("No. 000/074"), with 9 pockets, "0 of 9 claimed" and its reward;
- the road note is right;
- there is no horizontal scroll.

## Checked on the landed packages (the scratch merge)

With P2's maps, P3's story, and P5's and P6's art laid over my copy:
- **The Opening:** P3's real council-5 ends on the Act III card.
- **The heart:** the choice shows Kindle Anew shut with P3's three reasons; Rekindle is chosen, and the ending's card,
  the credits and the last card follow.
- **The Journal:** the rumours settle into "Found: the Unsmith".
- **The maps:** the stair's flight is sealed and opened; Tamsin joins.
- **The art:** P6's dice looks are in the battle, and the guest is drawn in P6's art.
- **Performance:** it holds on P5's art.

M7 world scenarios on that build: every check passes, and 6 are BLOCKED (P4's families: 41's +4, 42's two dice and
what he will take, on each viewport). The battle scenarios: every check passes, with 2 BLOCKED parts (P4). The full
world and flow suites on it are in "The browser runs".

## Stand-ins and blocked checks

- No `STUB (M7 P7)` is left in my files, and the scaffold's STUB marks in `codex.js` and `atlas.js` are gone.
- P3's content has landed, so its checks run as soon as it is merged: the story seam in 40 and 44 is used only
  without it.
- Left for P4:

| Check | Waits for | Where |
| --- | --- | --- |
| The Council's card: d20 +4 | P4: the hollow families on `tier: 'hollow'` | e2e-world 41 |
| The Unsmith's card: two dice, what he will take | P4: `tier: 'unsmith'`, a phase with `steals` | e2e-world 42 |
| The gift snapped, the +4 gone | P4: `bonusWhile` on each hollow family | e2e-battle hollow |
| The stolen event | P4: a phase with `steals` | e2e-battle unsmith |

## Requests to other packages

- **P4 (foes):**
  - the four hollow families on `tier: 'hollow'`, each with `bonusWhile: '<its gift>'` (a piece it holds, so the gift
    can be snapped) and its `koText`;
  - `unsmith` on `tier: 'unsmith'`, with a phase that has `steals: true`;
  - `stub` removed;
  - `ENCOUNTERS.unsmith.allies` kept;
  - per P6: Tamsin's finale kit at `gearTier: 5`, holding `tamsins-bargain` or nothing (the UI now passes a guest's art
    tier through).
  - Nothing in the UI changes when these land.
- **P6 (art), or the lead:**
  - when he took nothing (every relic claimed), the UI passes no ids, and `renderFoe` then draws six generic stolen
    things in his Thief phase;
  - drawing none for an empty `stolen: []` would need the renderer to tell `[]` from "not given", and the UI to pass
    `[]`;
  - this is one line each; it is the lead's call.
- **The lead, at the merge:**
  - `rules/story.js ladder()`'s `found` field: the Journal already takes it;
  - the stills `CUTS['hearth-below']` and `CUTS['ending-*']`: the cards use them when present.

## For the lead to decide

1. **The Pages stat** counts all five pages on every chapter card, so M4's and M5's cards read x/5 in an M7 build. It
   is one condition in `chapterEnd` if it should count only on Act III's cards.
2. **Relic counts:** 75 on the title line and the carry-over card; the Codex label keeps "No. 000/074".
3. **The Masterpiece tab** shows from the fifth council, once forged, or when a scene opens it.
4. **The reliquary line:** "12 of 66 relics home · Page V: 1 carried, 8 below". The Page V part shows from the fourth
   council, or once one of them is carried.
5. **After an ending** the party walks to `START_AT`.
6. **The credits' content**, as listed above.
7. **"Face Hollow Miravel" / "Face the Unsmith"** on the pre-fight button.
8. **The +4 clause** on the fight card ("while the <gift> holds") appears only with `bonusWhile`.
9. **Blocked checks fail the runs** until P4 lands (the tools' standing policy).
10. **Grip words:** Page V goes by the thing now (the lead's request). Pages I-IV are as they shipped.
11. **The two-dice layout:** on narrow screens the hurry hint is hidden in his fight, and his bubble fades under move
    banners.
12. **The `.flash` fix** (the battle caption's class is now `bt-flash`): it changes only M7's build. The frozen M6
    build keeps the bug.
13. **The Sleeper's first build** costs about 0.2 s at full black between the fades, once a session. Nothing hitches
    once the map shows.
14. **A guest's display unit** keeps its art tier, so her finale look is drawn. A foe's display unit still draws at its
    stat tier, as in every earlier fight.
